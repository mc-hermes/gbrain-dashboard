// ─── MOBILE ASK ───
function runMobileQuery() {
  const input = document.getElementById('mqInput');
  const results = document.getElementById('mqResults');
  const loading = document.getElementById('mqLoading');
  const error = document.getElementById('mqError');
  const empty = document.getElementById('mqEmpty');
  const thread = document.getElementById('mqThread');
  const q = input.value.trim();
  if (!q) return;
  input.value = '';
  results.innerHTML = '';
  error.style.display = 'none';
  empty.style.display = 'none';
  loading.style.display = 'block';

  // Add question to thread
  thread.innerHTML += `<div style="text-align:right;margin-bottom:8px"><span style="background:rgba(34,211,238,0.1);padding:8px 14px;border-radius:14px;font-size:0.72rem">${esc(q)}</span></div>`;

  const API_BASE = localStorage.getItem('gbrain-query-api') || '';
  fetch(API_BASE + '/api/query?q=' + encodeURIComponent(q))
    .then(r => { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
    .then(data => {
      loading.style.display = 'none';
      if (!data.results || data.results.length === 0) {
        empty.style.display = 'block'; return;
      }
      let html = '';
      data.results.slice(0, 3).forEach(r => {
        let scoreClass = 'low';
        if (r.score >= 0.7) scoreClass = 'high';
        else if (r.score >= 0.5) scoreClass = 'med';
        html += `<div class="lq-card" onclick="openPageModal('${escAttr(r.slug)}')">
          <div class="lq-header"><span class="lq-score ${scoreClass}">${Math.round(r.score * 100)}%</span>
          <span class="lq-path">${esc(r.slug)}</span></div>
          <div class="lq-snippet">${esc((r.snippet||'').trim()) || '<span style="opacity:0.4">(no preview)</span>'}</div></div>`;
      });
      thread.innerHTML += `<div style="margin-bottom:12px">${html}</div>`;
      thread.scrollIntoView({behavior:'smooth'});
    })
    .catch(err => {
      loading.style.display = 'none';
      error.textContent = 'Connection failed — ' + err.message;
      error.style.display = 'block';
    });
}

// ─── Scroll-aware chat bubble hide (mobile) ───
(function() {
  var lastY = 0;
  var SCROLL_HIDE = 60;
  window.addEventListener('scroll', function() {
    var chatBubble = document.getElementById('chatBubble');
    var chatPanel = document.getElementById('chatPanel');
    if (!chatBubble) return;
    var y = window.pageYOffset || document.documentElement.scrollTop;
    // Don't hide when chat is open
    if (chatPanel && chatPanel.classList.contains('active')) {
      chatBubble.classList.remove('chat-hidden');
      lastY = y;
      return;
    }
    if (y > SCROLL_HIDE && y > lastY + 5) {
      chatBubble.classList.add('chat-hidden');
    } else if (y < lastY - 5 || y <= SCROLL_HIDE) {
      chatBubble.classList.remove('chat-hidden');
    }
    lastY = y;
  }, { passive: true });
})();

// ─── Chat Bubble (desktop) ───
let chatOpen = false;
let conversationHistory = [];
const MAX_HISTORY = 6;

function toggleChat() {
  chatOpen = !chatOpen;
  document.getElementById('chatPanel').classList.toggle('active', chatOpen);
  document.getElementById('chatBubble').innerHTML = chatOpen ? '✕' : '<svg viewBox="0 0 16 16" width="20" height="20"><path d="M2 2h12v9H6l-4 3V2z" stroke="#1a1b26" fill="none" stroke-width="1.5"/></svg>';
  if (chatOpen) document.getElementById('chatInput').focus();
}

function addChatMessage(html, role) {
  const d = document.createElement('div');
  d.className = 'chat-msg ' + role;
  d.innerHTML = html;
  const c = document.getElementById('chatMessages');
  c.appendChild(d);
  c.scrollTop = c.scrollHeight;
}

function formatAssistantText(text) {
  let html = esc(text);
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/(?:^|\n)&gt; (.+)/g, '<blockquote>$1</blockquote>');
  html = html.replace(/\n\n/g, '<br><br>');
  html = html.replace(/\n/g, '<br>');
  return html.replace(/^(<br>)+/, '');
}

function addAssistantMessage(data) {
  const d = document.createElement('div');
  d.className = 'chat-msg assistant';
  let html = '<div class="bot-msg-body"><div class="bot-msg-text">' + formatAssistantText(data.response) + '</div></div>';
  if (data.sources && data.sources.length > 0) {
    const srcCount = data.sources.length;
    html += '<button class="bot-sources-toggle" onclick="toggleSources(this)">' + srcCount + ' source' + (srcCount !== 1 ? 's' : '') + ' <span class="arrow">▸</span></button>';
    html += '<div class="bot-sources">';
    data.sources.forEach(function(s) {
      const name = s.slug.split('/').pop().replace(/-/g, ' ').replace(/_/g, ' ');
      html += '<div class="bot-source-card" onclick="openPageModal(\'' + escAttr(s.slug) + '\')"><span class="src-score ' + s.score_class + '">' + s.score + '%</span><div class="src-info"><div class="src-title">' + esc(name) + '</div><div class="src-snippet">' + esc((s.snippet||'').substring(0,150)) + '</div></div></div>';
    });
    html += '</div>';
  }
  if (data.followups && data.followups.length > 0) {
    html += '<div class="bot-followups">';
    data.followups.forEach(function(f) {
      html += '<button class="bot-followup-pill" onclick="askFollowup(\'' + escAttr(f) + '\')">' + esc(f) + '</button>';
    });
    html += '</div>';
  }
  d.innerHTML = html;
  const c = document.getElementById('chatMessages');
  c.appendChild(d);
  c.scrollTop = c.scrollHeight;
}

function toggleSources(btn) { btn.classList.toggle('open'); btn.nextElementSibling.classList.toggle('open'); }
function askStarter(q) { document.getElementById('chatInput').value = q; sendChat(); }
function askFollowup(q) { document.getElementById('chatInput').value = q; sendChat(); }
function clearChat() {
  const msgs = document.getElementById('chatMessages');
  const welcome = document.getElementById('chatWelcome');
  msgs.innerHTML = '';
  msgs.appendChild(welcome);
  welcome.style.display = '';
  conversationHistory = [];
}
function switchModel() {
  try { localStorage.setItem('gbrain-chat-model', document.getElementById('chatModel').value); } catch(e) {}
}
(function() {
  try { const saved = localStorage.getItem('gbrain-chat-model'); if (saved === 'claude-haiku' || saved === 'deepseek') document.getElementById('chatModel').value = saved; } catch(e) {}
})();
function sendChat() {
  const input = document.getElementById('chatInput');
  const btn = document.getElementById('chatSendBtn');
  const q = input.value.trim();
  if (!q) return;
  input.value = ''; btn.disabled = true;
  document.getElementById('chatWelcome').style.display = 'none';
  addChatMessage(esc(q), 'user');
  conversationHistory.push({ role: 'user', text: q });
  if (conversationHistory.length > MAX_HISTORY) conversationHistory.shift();
  const typing = document.getElementById('chatTyping');
  typing.classList.add('active');
  let dots = 0;
  const dotInterval = setInterval(function() { dots = (dots + 1) % 4; typing.innerHTML = 'Thinking' + '.'.repeat(dots); }, 400);
  const API_BASE = localStorage.getItem('gbrain-query-api') || '';
  const model = document.getElementById('chatModel').value;
  fetch(API_BASE + '/api/assistant?q=' + encodeURIComponent(q) + '&model=' + encodeURIComponent(model))
    .then(function(r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
    .then(function(data) {
      clearInterval(dotInterval); typing.classList.remove('active');
      addAssistantMessage(data);
      conversationHistory.push({ role: 'assistant', text: data.response.substring(0, 200) });
      if (conversationHistory.length > MAX_HISTORY) conversationHistory.shift();
    })
    .catch(function(err) {
      clearInterval(dotInterval); typing.classList.remove('active');
      addAssistantMessage({ response: "Sorry, I couldn't reach the knowledge base right now.\n\n" + err.message, sources: [], followups: ['Try again', 'Check brain health', 'Browse all pages'], type: 'error' });
    })
    .finally(function() { btn.disabled = false; });
}

