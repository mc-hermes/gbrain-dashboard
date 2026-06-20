// ═══════════════════════════════════════════════
// Write — Note Composer
// ═══════════════════════════════════════════════

var WRITE_TOKEN = null;
var _writePreview = false;
var _activeTypeChip = null;
var _acIndex = -1;
var _acMatches = [];

(function() {
  try { WRITE_TOKEN = localStorage.getItem('gbrain-write-token'); } catch(e) {}
  try { restoreDraft(); } catch(e) {}
})();

function getPageTitles() {
  if (!DATA || !DATA.pages) return [];
  return DATA.pages.map(function(p) { return { title: p.title || p.slug, slug: p.slug, type: p.type || '' }; });
}

function openWrite() {
  if (!WRITE_TOKEN) {
    showTokenPrompt();
    return;
  }
  document.getElementById('writeOverlay').classList.add('active');
  document.body.classList.add('modal-open');
  document.getElementById('wcTitle').focus();
}

function closeWrite() {
  document.getElementById('writeOverlay').classList.remove('active');
  document.body.classList.remove('modal-open');
  closeAutocomplete();
}

function showTokenPrompt() {
  document.getElementById('tokenOverlay').classList.add('active');
  document.getElementById('tokenInput').focus();
}

function closeTokenPrompt() {
  document.getElementById('tokenOverlay').classList.remove('active');
  document.getElementById('tokenError').style.display = 'none';
}

function saveToken() {
  var input = document.getElementById('tokenInput');
  var token = input.value.trim();
  if (!token) return;
  WRITE_TOKEN = token;
  try { localStorage.setItem('gbrain-write-token', token); } catch(e) {}
  closeTokenPrompt();
  openWrite();
}

function saveDraft() {
  try {
    var draft = {
      title: document.getElementById('wcTitle').value,
      body: document.getElementById('wcBody').value,
      typeChip: _activeTypeChip
    };
    localStorage.setItem('gbrain-write-draft', JSON.stringify(draft));
  } catch(e) {}
}

function restoreDraft() {
  try {
    var raw = localStorage.getItem('gbrain-write-draft');
    if (!raw) return;
    var draft = JSON.parse(raw);
    if (draft.title) document.getElementById('wcTitle').value = draft.title;
    if (draft.body) document.getElementById('wcBody').value = draft.body;
    if (draft.typeChip) {
      var chips = document.querySelectorAll('.wc-type-chip');
      for (var i = 0; i < chips.length; i++) {
        if (chips[i].textContent.trim().indexOf(draft.typeChip) === 0) {
          toggleTypeChip(chips[i], draft.typeChip);
          break;
        }
      }
    }
  } catch(e) {}
}

function clearDraft() {
  document.getElementById('wcTitle').value = '';
  document.getElementById('wcBody').value = '';
  _activeTypeChip = null;
  document.querySelectorAll('.wc-type-chip').forEach(function(c) { c.classList.remove('active'); });
  try { localStorage.removeItem('gbrain-write-draft'); } catch(e) {}
}

function showFormatHint() {
  document.getElementById('wcFormatHint').classList.add('visible');
}

function hideFormatHint() {
  setTimeout(function() {
    document.getElementById('wcFormatHint').classList.remove('visible');
  }, 300);
}

function toggleTypeChip(el, type) {
  if (el.classList.contains('active')) {
    el.classList.remove('active');
    _activeTypeChip = null;
  } else {
    document.querySelectorAll('.wc-type-chip').forEach(function(c) { c.classList.remove('active'); });
    el.classList.add('active');
    _activeTypeChip = type;
  }
  saveDraft();
}

function togglePreview() {
  _writePreview = !_writePreview;
  var btn = document.getElementById('wcToggleBtn');
  var editorWrap = document.getElementById('wcEditorWrap');
  var preview = document.getElementById('wcPreview');
  var titleEl = document.getElementById('wcTitle');
  var bodyWrap = document.getElementById('wcBodyWrap');

  if (_writePreview) {
    btn.textContent = '✏ Write';
    btn.classList.add('active');
    editorWrap.style.display = 'none';
    preview.classList.add('active');
    // Simple markdown → HTML
    var md = document.getElementById('wcBody').value;
    var html = renderMarkdownPreview(md);
    preview.innerHTML = html;
  } else {
    btn.textContent = '👁 Preview';
    btn.classList.remove('active');
    editorWrap.style.display = '';
    preview.classList.remove('active');
  }
}

function renderMarkdownPreview(md) {
  var html = esc(md);
  // Headers
  html = html.replace(/^### (.+)$/gm, '<h3>$1</h3>');
  html = html.replace(/^## (.+)$/gm, '<h2>$1</h2>');
  html = html.replace(/^# (.+)$/gm, '<h1>$1</h1>');
  // Bold
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  // Italic
  html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');
  // Inline code
  html = html.replace(/`([^`]+)`/g, '<code>$1</code>');
  // Wikilinks
  html = html.replace(/\[\[(.+?)\]\]/g, '<span class="wikilink">$1</span>');
  // Blockquotes
  html = html.replace(/^&gt; (.+)$/gm, '<blockquote>$1</blockquote>');
  // Unordered lists
  html = html.replace(/^- (.+)$/gm, '<li>$1</li>');
  html = html.replace(/(<li>.*<\/li>\n?)+/g, '<ul>$&</ul>');
  // Paragraphs
  html = '<p>' + html.replace(/\n\n/g, '</p><p>').replace(/\n/g, '<br>') + '</p>';
  html = html.replace(/<p><\/p>/g, '');
  html = html.replace(/<p><h([123])>/g, '<h$1>');
  html = html.replace(/<\/h([123])><\/p>/g, '</h$1>');
  html = html.replace(/<p><ul>/g, '<ul>');
  html = html.replace(/<\/ul><\/p>/g, '</ul>');
  html = html.replace(/<p><blockquote>/g, '<blockquote>');
  html = html.replace(/<\/blockquote><\/p>/g, '</blockquote>');
  return html;
}

// ─── Wikilink Autocomplete ───

function handleWikilinkInput() {
  var ta = document.getElementById('wcBody');
  var val = ta.value;
  var pos = ta.selectionStart;
  // Find the [[ before cursor
  var openIdx = val.lastIndexOf('[[', pos);
  if (openIdx === -1) { closeAutocomplete(); return; }
  // Check no closing ]] between open and cursor
  var between = val.substring(openIdx + 2, pos);
  if (between.indexOf(']]') !== -1) { closeAutocomplete(); return; }
  var query = between.toLowerCase();
  if (query.length === 0) { closeAutocomplete(); return; }

  var titles = getPageTitles();
  _acMatches = [];
  for (var i = 0; i < titles.length; i++) {
    if (titles[i].title.toLowerCase().indexOf(query) !== -1) {
      _acMatches.push(titles[i]);
    }
  }
  if (_acMatches.length === 0) { closeAutocomplete(); return; }

  _acIndex = -1;
  renderAutocomplete();
}

function renderAutocomplete() {
  var ac = document.getElementById('wcAutocomplete');
  var html = '';
  for (var i = 0; i < _acMatches.length && i < 8; i++) {
    var m = _acMatches[i];
    html += '<div class="wc-ac-item' + (i === _acIndex ? ' active' : '') + '" data-idx="' + i + '" onmousedown="selectAutocomplete(' + i + ')">'
      + '<span class="ac-type">' + esc(m.type || 'page') + '</span> '
      + esc(m.title)
      + '</div>';
  }
  ac.innerHTML = html;
  ac.classList.add('active');
}

function closeAutocomplete() {
  document.getElementById('wcAutocomplete').classList.remove('active');
  _acMatches = [];
  _acIndex = -1;
}

function selectAutocomplete(idx) {
  var m = _acMatches[idx];
  if (!m) return;
  var ta = document.getElementById('wcBody');
  var val = ta.value;
  var pos = ta.selectionStart;
  var openIdx = val.lastIndexOf('[[', pos);
  if (openIdx === -1) return;
  var before = val.substring(0, openIdx);
  var after = val.substring(pos);
  ta.value = before + '[[' + m.title + ']]' + after;
  closeAutocomplete();
  ta.focus();
  var newPos = openIdx + m.title.length + 4;
  ta.setSelectionRange(newPos, newPos);
  saveDraft();
}

function handleAcKeydown(e) {
  if (!document.getElementById('wcAutocomplete').classList.contains('active')) return false;
  if (e.key === 'ArrowDown') {
    e.preventDefault();
    _acIndex = Math.min(_acIndex + 1, _acMatches.length - 1);
    renderAutocomplete();
    return true;
  }
  if (e.key === 'ArrowUp') {
    e.preventDefault();
    _acIndex = Math.max(_acIndex - 1, 0);
    renderAutocomplete();
    return true;
  }
  if (e.key === 'Enter' || e.key === 'Tab') {
    e.preventDefault();
    if (_acIndex >= 0 && _acIndex < _acMatches.length) {
      selectAutocomplete(_acIndex);
    } else if (_acMatches.length > 0) {
      selectAutocomplete(0);
    }
    return true;
  }
  if (e.key === 'Escape') {
    closeAutocomplete();
    return true;
  }
  return false;
}

// ─── Submit ───

function submitNote() {
  var title = document.getElementById('wcTitle').value.trim();
  var body = document.getElementById('wcBody').value.trim();
  if (!body) return;

  var submitBtn = document.getElementById('wcSubmitBtn');
  submitBtn.disabled = true;
  submitBtn.textContent = 'Saving…';

  var payload = { title: title || 'Untitled thought', body: body };
  if (_activeTypeChip) payload.type_hint = _activeTypeChip;

  var API_BASE = localStorage.getItem('gbrain-write-api') || '';
  fetch(API_BASE + '/api/note', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + WRITE_TOKEN
    },
    body: JSON.stringify(payload)
  })
  .then(function(r) {
    if (r.status === 401) {
      WRITE_TOKEN = null;
      try { localStorage.removeItem('gbrain-write-token'); } catch(e) {}
      throw new Error('token_expired');
    }
    if (!r.ok) throw new Error('HTTP ' + r.status);
    return r.json();
  })
  .then(function(data) {
    addPendingCard(title, body, payload.type_hint || 'note');
    clearDraft();
    closeWrite();
  })
  .catch(function(err) {
    if (err.message === 'token_expired') {
      closeWrite();
      showTokenPrompt();
      document.getElementById('tokenError').textContent = 'Token was rejected. Please re-enter.';
      document.getElementById('tokenError').style.display = 'block';
    } else {
      alert('Failed to save: ' + err.message);
    }
  })
  .finally(function() {
    submitBtn.disabled = false;
    submitBtn.textContent = 'Save to Brain';
  });
}

function addPendingCard(title, body, typeHint) {
  var container = document.getElementById('pendingNotes');
  var now = new Date();
  var timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  var excerpt = body.replace(/[#*\[\]`]/g, '').substring(0, 120);
  if (body.length > 120) excerpt += '…';

  var card = document.createElement('div');
  card.className = 'feed-card pending';
  card.setAttribute('data-pending', now.getTime());
  card.innerHTML =
    '<div class="fc-header">'
    + '<span class="fc-type-icon"><svg viewBox="0 0 14 14" width="12" height="12" style="vertical-align:middle"><path d="M3 13h8M3 1v12L7 9l4 4V1H3z" fill="none" stroke="currentColor" stroke-linecap="round"/></svg></span>'
    + '<span class="fc-title">' + esc(title || 'Untitled thought') + '</span>'
    + '</div>'
    + '<div class="fc-time">' + esc(timeStr) + ' · <span class="fc-pending-badge"><span class="spinner-dot"></span> Processing</span></div>'
    + '<div class="fc-summary">' + esc(excerpt) + '</div>';

  container.appendChild(card);

  // Remove pending card on next data refresh (check every 30s for up to 5 min)
  var start = now.getTime();
  var interval = setInterval(function() {
    if (Date.now() - start > 300000) { clearInterval(interval); card.style.opacity = '0.3'; return; }
    // Check if a real card with matching title appeared
    var feedCards = document.querySelectorAll('#feedCards .feed-card .fc-title');
    for (var i = 0; i < feedCards.length; i++) {
      if (feedCards[i].textContent.trim().indexOf(title.substring(0, 20)) !== -1 || feedCards[i].textContent.trim() === title) {
        card.remove();
        clearInterval(interval);
        return;
      }
    }
  }, 30000);
}

// Wire up keyboard shortcuts for composer
document.addEventListener('keydown', function(e) {
  var overlay = document.getElementById('writeOverlay');
  if (!overlay.classList.contains('active')) return;

  // Autocomplete keys take priority
  if (handleAcKeydown(e)) return;

  if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
    e.preventDefault();
    submitNote();
    return;
  }
  if (e.key === 'Escape') {
    e.preventDefault();
    closeWrite();
    return;
  }
});

