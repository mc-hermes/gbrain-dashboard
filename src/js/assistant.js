// ─── Unified Assistant v3 — Session History ───────────────────────────────
// localStorage-backed session history. Two-panel layout: sidebar + chat.

const SESSIONS_KEY = 'gbrain-sessions';
const MAX_SESSIONS = 50;
let activeSessionId = null;
let assistantReady = false;

// ─── Session storage ──────────────────────────────────────────────────────

function loadSessions() {
  try { return JSON.parse(localStorage.getItem(SESSIONS_KEY) || '[]'); }
  catch(e) { return []; }
}

function saveSessions(sessions) {
  if (sessions.length > MAX_SESSIONS) sessions = sessions.slice(-MAX_SESSIONS);
  try { localStorage.setItem(SESSIONS_KEY, JSON.stringify(sessions)); }
  catch(e) { /* quota exceeded — drop oldest */ }
}

function getActiveSession() {
  if (!activeSessionId) return null;
  var sessions = loadSessions();
  for (var i = 0; i < sessions.length; i++) {
    if (sessions[i].id === activeSessionId) return sessions[i];
  }
  return null;
}

function createSession(firstQuestion) {
  var id = 'sess-' + Date.now();
  var session = {
    id: id,
    started: new Date().toISOString(),
    title: firstQuestion.substring(0, 80),
    messages: []
  };
  var sessions = loadSessions();
  sessions.push(session);
  if (sessions.length > MAX_SESSIONS) sessions = sessions.slice(-MAX_SESSIONS);
  saveSessions(sessions);
  return session;
}

function saveMessageToSession(role, text, extra) {
  var sessions = loadSessions();
  for (var i = 0; i < sessions.length; i++) {
    if (sessions[i].id === activeSessionId) {
      var msg = { role: role, text: text, time: new Date().toISOString() };
      if (extra) {
        if (extra.sources) msg.sources = extra.sources;
        if (extra.followups) msg.followups = extra.followups;
        if (extra.refined) msg.refined = extra.refined;
      }
      sessions[i].messages.push(msg);
      // Update title from first user message if not set
      if (!sessions[i].title && role === 'user') {
        sessions[i].title = text.substring(0, 80);
      }
      saveSessions(sessions);
      return;
    }
  }
}

function deleteSession(id) {
  var sessions = loadSessions().filter(function(s) { return s.id !== id; });
  saveSessions(sessions);
  if (activeSessionId === id) {
    activeSessionId = null;
    renderChatWelcome();
  }
  renderSessionList();
}

// ─── UI: Session list sidebar ──────────────────────────────────────────────

function renderSessionList() {
  var list = document.getElementById('sessionList');
  if (!list) return;
  var sessions = loadSessions();
  // Newest first
  sessions.reverse();

  if (sessions.length === 0) {
    list.innerHTML = '<div class="session-empty">No past conversations.<br><br>Ask a question to start.</div>';
    return;
  }

  var html = '';
  sessions.forEach(function(s) {
    var isActive = s.id === activeSessionId;
    var msgCount = s.messages.length;
    var time = formatSessionTime(s.started);
    var title = s.title || 'Untitled';
    html += '<div class="session-item' + (isActive ? ' active' : '') + '" onclick="loadSession(\'' + escAttr(s.id) + '\')">' +
      '<div class="session-item-title">' + esc(title) + '</div>' +
      '<div class="session-item-meta"><span>' + time + '</span><span>' + msgCount + ' msg' + (msgCount !== 1 ? 's' : '') + '</span></div>' +
      '<button class="session-item-del" onclick="event.stopPropagation();deleteSession(\'' + escAttr(s.id) + '\')" title="Delete">×</button>' +
    '</div>';
  });

  // Restore original order for storage
  sessions.reverse();
  list.innerHTML = html;
}

function formatSessionTime(iso) {
  try {
    var d = new Date(iso);
    var now = new Date();
    var diff = now - d;
    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return Math.floor(diff/60000) + 'm ago';
    if (diff < 86400000) return Math.floor(diff/3600000) + 'h ago';
    if (diff < 604800000) return Math.floor(diff/86400000) + 'd ago';
    return d.toLocaleDateString();
  } catch(e) { return ''; }
}

// ─── Load / New session ────────────────────────────────────────────────────

function loadSession(id) {
  activeSessionId = id;
  var session = getActiveSession();
  if (!session) { activeSessionId = null; renderChatWelcome(); return; }
  renderSessionList();
  renderSessionMessages(session);
  // On mobile, close sidebar
  if (window.innerWidth < 768) toggleSessionSidebar(false);
}

function newSession() {
  activeSessionId = null;
  renderSessionList();
  renderChatWelcome();
  var input = document.getElementById('lqInput');
  if (input) { input.value = ''; input.focus(); }
}

function renderChatWelcome() {
  var msgs = document.getElementById('assistantMessages');
  if (!msgs) return;
  msgs.innerHTML = '<div class="assistant-welcome" id="assistantWelcome">' +
    '👋 <strong>Ask me anything</strong> about your knowledge base.<br><br>' +
    '<div class="starter-grid">' +
      '<button class="starter-pill" onclick="askStarter(\'what should i know before my next meeting?\')">Prep for meetings</button>' +
      '<button class="starter-pill" onclick="askStarter(\'what are my open action items?\')">Action items</button>' +
      '<button class="starter-pill" onclick="askStarter(\'what happened in my last meeting with Zaim?\')">Last meeting with Zaim</button>' +
      '<button class="starter-pill" onclick="askStarter(\'show me all people\')">People directory</button>' +
    '</div>' +
  '</div>';
  document.getElementById('assistantInputWrap').style.display = '';
}

function renderSessionMessages(session) {
  var msgs = document.getElementById('assistantMessages');
  if (!msgs) return;
  msgs.innerHTML = '';
  document.getElementById('assistantWelcome') && (document.getElementById('assistantWelcome').style.display = 'none');
  document.getElementById('assistantInputWrap').style.display = '';

  session.messages.forEach(function(m) {
    if (m.role === 'user') {
      addAssistantBubble(esc(m.text), 'user', m.time);
    } else {
      addAssistantResponse({
        response: m.text,
        sources: m.sources || [],
        followups: m.followups || [],
        refined: m.refined || false
      }, m.time);
    }
  });
  msgs.scrollTop = msgs.scrollHeight;
}

// ─── Chat interface ────────────────────────────────────────────────────────

function sendAssistantQuery() {
  var input = document.getElementById('lqInput');
  var btn = document.getElementById('lqBtn');
  var q = input.value.trim();
  if (!q) return;
  input.value = '';
  if (btn) btn.disabled = true;

  var welcome = document.getElementById('assistantWelcome');
  if (welcome) welcome.style.display = 'none';

  var loading = document.getElementById('assistantLoading');
  var error = document.getElementById('assistantError');
  var msgs = document.getElementById('assistantMessages');

  // Create session if needed
  if (!activeSessionId) {
    var session = createSession(q);
    activeSessionId = session.id;
    renderSessionList();
  }

  // Add user message
  addAssistantBubble(esc(q), 'user');
  saveMessageToSession('user', q);

  // Show thinking
  if (loading) loading.style.display = 'block';
  if (error) error.style.display = 'none';

  var API_BASE = localStorage.getItem('gbrain-query-api') || '';
  var url = API_BASE + '/api/assistant?q=' + encodeURIComponent(q) + '&model=deepseek';

  fetch(url)
    .then(function(r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
    .then(function(data) {
      if (loading) loading.style.display = 'none';
      addAssistantResponse(data);
      saveMessageToSession('assistant', data.response || '', {
        sources: data.sources,
        followups: data.followups,
        refined: data.refined
      });
      // Update session list title if this was first question
      renderSessionList();
      msgs.scrollTop = msgs.scrollHeight;
    })
    .catch(function(err) {
      if (loading) loading.style.display = 'none';
      if (error) { error.textContent = 'Failed to reach the assistant — ' + err.message; error.style.display = 'block'; }
      addAssistantBubble('Sorry, I couldn\'t reach the knowledge base. Is the API server running?', 'assistant');
      saveMessageToSession('assistant', 'Error: ' + err.message);
    })
    .finally(function() { if (btn) btn.disabled = false; });
}

function addAssistantBubble(text, role, time) {
  var msgs = document.getElementById('assistantMessages');
  if (!msgs) return;
  var d = document.createElement('div');
  d.className = 'assistant-msg ' + role;
  var inner = '<div class="assistant-body"><div class="assistant-text">' + formatAssistantText(text) + '</div>';
  if (time) inner += '<div class="assistant-time">' + formatSessionTime(time) + '</div>';
  inner += '</div>';
  d.innerHTML = inner;
  msgs.appendChild(d);
  msgs.scrollTop = msgs.scrollHeight;
}

function addAssistantResponse(data, time) {
  var msgs = document.getElementById('assistantMessages');
  if (!msgs) return;

  var d = document.createElement('div');
  d.className = 'assistant-msg assistant';
  var html = '<div class="assistant-body"><div class="assistant-text">' + formatAssistantText(data.response || 'No response') + '</div>';

  // Time stamp
  if (time) html += '<div class="assistant-time">' + formatSessionTime(time) + '</div>';

  // Refined badge
  if (data.refined) {
    html += '<div class="assistant-refined">✨ Synthesized</div>';
  }

  html += '</div>';

  // Sources
  if (data.sources && data.sources.length > 0) {
    html += '<button class="assistant-sources-toggle" onclick="toggleAssistantSources(this)">' + data.sources.length + ' source' + (data.sources.length !== 1 ? 's' : '') + ' <span class="arrow">▸</span></button>';
    html += '<div class="assistant-sources">';
    data.sources.forEach(function(s) {
      var name = s.slug.split('/').pop().replace(/-/g, ' ').replace(/_/g, ' ');
      html += '<div class="assistant-source-card" onclick="openPageModal(\'' + escAttr(s.slug) + '\')"><span class="src-score ' + s.score_class + '">' + s.score + '%</span><div class="src-info"><div class="src-title">' + esc(name) + '</div><div class="src-snippet">' + esc((s.snippet || '').substring(0, 150)) + '</div></div></div>';
    });
    html += '</div>';
  }

  // Follow-ups
  if (data.followups && data.followups.length > 0) {
    html += '<div class="assistant-followups">';
    data.followups.forEach(function(f) {
      html += '<button class="assistant-followup-pill" onclick="askFollowup(\'' + escAttr(f) + '\')">' + esc(f) + '</button>';
    });
    html += '</div>';
  }

  d.innerHTML = html;
  msgs.appendChild(d);
  msgs.scrollTop = msgs.scrollHeight;
}

// ─── Sidebar toggle ────────────────────────────────────────────────────────

function toggleSessionSidebar(force) {
  var sidebar = document.getElementById('sessionSidebar');
  var overlay = document.getElementById('sessionOverlay');
  if (!sidebar) return;
  var isOpen = sidebar.classList.contains('open');
  var shouldOpen = force !== undefined ? force : !isOpen;

  if (shouldOpen) {
    sidebar.classList.add('open');
    if (overlay) overlay.style.display = 'block';
    renderSessionList();
  } else {
    sidebar.classList.remove('open');
    if (overlay) overlay.style.display = 'none';
  }
}

// ─── Helpers ───────────────────────────────────────────────────────────────

function formatAssistantText(text) {
  if (!text) return '';
  var html = esc(text);
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/(?:^|\n)> (.+)/g, '<blockquote>$1</blockquote>');
  html = html.replace(/\n\n/g, '<br><br>');
  html = html.replace(/\n/g, '<br>');
  return html.replace(/^(<br>)+/, '');
}

function toggleAssistantSources(btn) {
  btn.classList.toggle('open');
  btn.nextElementSibling.classList.toggle('open');
}

function askStarter(q) {
  var input = document.getElementById('lqInput');
  if (input) { input.value = q; sendAssistantQuery(); }
}

function askFollowup(q) {
  var input = document.getElementById('lqInput');
  if (input) { input.value = q; sendAssistantQuery(); }
}

// ─── Init ──────────────────────────────────────────────────────────────────

function initAssistant() {
  if (assistantReady) return;
  assistantReady = true;

  var input = document.getElementById('lqInput');
  if (!input) return;
  input.placeholder = 'Ask anything — e.g. "what should I know before meeting Zaim?"';
  input.onkeydown = function(e) { if (e.key === 'Enter') sendAssistantQuery(); };

  var btn = document.getElementById('lqBtn');
  if (btn) { btn.textContent = 'Ask'; btn.onclick = sendAssistantQuery; }

  // Hide old elements
  var lqResults = document.getElementById('lqResults');
  var lqLoading = document.getElementById('lqLoading');
  var lqError = document.getElementById('lqError');
  if (lqResults) lqResults.style.display = 'none';
  if (lqLoading) { lqLoading.id = 'assistantLoading'; lqLoading.style.display = 'none'; }
  if (lqError) { lqError.id = 'assistantError'; lqError.style.display = 'none'; }

  renderSessionList();
  renderChatWelcome();
}

// Wire up after data loads
(function() {
  var orig = loadData;
  loadData = function() {
    var ret = orig.apply(this, arguments);
    setTimeout(function() {
      if (typeof initAssistant === 'function') initAssistant();
    }, 300);
    return ret;
  };
})();

// Also hook renderAll
(function() {
  if (typeof renderAll !== 'undefined') {
    var origRA = renderAll;
    renderAll = function() {
      origRA.apply(this, arguments);
      setTimeout(function() {
        if (typeof initAssistant === 'function') initAssistant();
      }, 300);
    };
  }
})();

// Escaping
function esc(s) {
  if (!s) return '';
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
function escAttr(s) {
  if (!s) return '';
  return String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/'/g, '&#39;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
