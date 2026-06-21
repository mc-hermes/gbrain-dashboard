// ─── Unified Assistant v2 ─────────────────────────────────────────────────
// Replaces chat.js + live-query.js. Single assistant on Today view.
// Always uses /api/assistant for synthesized answers.

let conversationHistory = [];
const MAX_HISTORY = 6;
let assistantReady = false;

function initAssistant() {
  if (assistantReady) return;
  assistantReady = true;

  // Wire up the input
  const input = document.getElementById('lqInput');
  if (!input) return;
  input.placeholder = 'Ask anything — e.g. "what should I know before meeting Zaim?"';
  input.onkeydown = function(e) { if (e.key === 'Enter') sendAssistantQuery(); };

  const btn = document.getElementById('lqBtn');
  if (btn) { btn.textContent = 'Ask'; btn.onclick = sendAssistantQuery; }

  // Hide old search result displays, show chat
  var lqResults = document.getElementById('lqResults');
  var lqLoading = document.getElementById('lqLoading');
  var lqError = document.getElementById('lqError');
  var lqEmpty = document.getElementById('lqEmpty');

  // Create chat messages container if not exists
  if (!document.getElementById('assistantMessages')) {
    var msgs = document.createElement('div');
    msgs.id = 'assistantMessages';
    msgs.className = 'assistant-messages';
    msgs.innerHTML = '<div class="assistant-welcome" id="assistantWelcome">' +
      '👋 <strong>Ask me anything</strong> about your knowledge base.<br><br>' +
      '<div class="starter-grid">' +
        '<button class="starter-pill" onclick="askStarter(\'what should i know before my next meeting?\')">Prep for meetings</button>' +
        '<button class="starter-pill" onclick="askStarter(\'what are my open action items?\')">Action items</button>' +
        '<button class="starter-pill" onclick="askStarter(\'what happened in my last meeting with Zaim?\')">Last meeting with Zaim</button>' +
        '<button class="starter-pill" onclick="askStarter(\'show me all people\')">People directory</button>' +
      '</div>' +
    '</div>';

    // Insert after the live-query-bar
    var bar = document.querySelector('.live-query-bar');
    if (bar && bar.parentNode) {
      bar.parentNode.insertBefore(msgs, bar.nextSibling);
    }
  }

  // Repurpose loading/error/empty for assistant
  if (lqLoading) lqLoading.id = 'assistantLoading';
  if (lqError) lqError.id = 'assistantError';
  if (lqEmpty) lqEmpty.id = 'assistantEmpty';
  if (lqResults) { lqResults.style.display = 'none'; lqResults.id = 'assistantResults'; }

  // Hide old mobile query elements
  var mqInput = document.getElementById('mqInput');
  var mqThread = document.getElementById('mqThread');
  if (mqInput) mqInput.style.display = 'none';
  if (mqThread) mqThread.style.display = 'none';
}

// Called after data loads
if (typeof DATA !== 'undefined' || typeof MCP_CONNECTED !== 'undefined') {
  initAssistant();
} else {
  // Wait for data
  var _origLoadData = loadData;
  loadData = function() {
    _origLoadData.apply(this, arguments);
    setTimeout(initAssistant, 500);
  };
}

function sendAssistantQuery() {
  var input = document.getElementById('lqInput');
  var btn = document.getElementById('lqBtn');
  var q = input.value.trim();
  if (!q) return;
  input.value = '';
  if (btn) btn.disabled = true;

  var welcome = document.getElementById('assistantWelcome');
  if (welcome) welcome.style.display = 'none';

  var msgs = document.getElementById('assistantMessages');
  var loading = document.getElementById('assistantLoading');
  var error = document.getElementById('assistantError');

  // Add user message
  addAssistantBubble(esc(q), 'user');
  conversationHistory.push({ role: 'user', text: q });
  if (conversationHistory.length > MAX_HISTORY) conversationHistory.shift();

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
      conversationHistory.push({ role: 'assistant', text: (data.response || '').substring(0, 200) });
      if (conversationHistory.length > MAX_HISTORY) conversationHistory.shift();
    })
    .catch(function(err) {
      if (loading) loading.style.display = 'none';
      if (error) { error.textContent = 'Failed to reach the assistant — ' + err.message; error.style.display = 'block'; }

      // Still show the error in chat
      var d = document.createElement('div');
      d.className = 'assistant-msg assistant';
      d.innerHTML = '<div class="assistant-body"><div class="assistant-text">Sorry, I couldn\'t reach the knowledge base. Is the API server running?</div></div>';
      if (msgs) msgs.appendChild(d);
    })
    .finally(function() { if (btn) btn.disabled = false; });
}

function addAssistantBubble(html, role) {
  var msgs = document.getElementById('assistantMessages');
  if (!msgs) return;
  var d = document.createElement('div');
  d.className = 'assistant-msg ' + role;
  d.innerHTML = '<div class="assistant-body"><div class="assistant-text">' + html + '</div></div>';
  msgs.appendChild(d);
  msgs.scrollTop = msgs.scrollHeight;
}

function formatAssistantText(text) {
  var html = esc(text);
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/(?:^|\n)> (.+)/g, '<blockquote>$1</blockquote>');
  html = html.replace(/\n\n/g, '<br><br>');
  html = html.replace(/\n/g, '<br>');
  return html.replace(/^(<br>)+/, '');
}

function addAssistantResponse(data) {
  var msgs = document.getElementById('assistantMessages');
  if (!msgs) return;

  var d = document.createElement('div');
  d.className = 'assistant-msg assistant';

  // Response text
  var html = '<div class="assistant-body"><div class="assistant-text">' + formatAssistantText(data.response || 'No response') + '</div></div>';

  // Refined badge
  if (data.refined) {
    html += '<div class="assistant-refined">✨ Synthesized with AI</div>';
  }

  // Sources
  if (data.sources && data.sources.length > 0) {
    var srcCount = data.sources.length;
    html += '<button class="assistant-sources-toggle" onclick="toggleAssistantSources(this)">' + srcCount + ' source' + (srcCount !== 1 ? 's' : '') + ' <span class="arrow">▸</span></button>';
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

function clearAssistantChat() {
  var msgs = document.getElementById('assistantMessages');
  var welcome = document.getElementById('assistantWelcome');
  if (msgs) msgs.innerHTML = '';
  if (welcome) { msgs.appendChild(welcome); welcome.style.display = ''; }
  conversationHistory = [];
}

// ─── Escaping helpers (shared) ───
function esc(s) {
  if (!s) return '';
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
function escAttr(s) {
  if (!s) return '';
  return String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/'/g, '&#39;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
