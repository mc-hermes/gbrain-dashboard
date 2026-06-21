// ─── Live Query ───
function runLiveQuery() {
  var input = document.getElementById('lqInput');
  var btn = document.getElementById('lqBtn');
  var results = document.getElementById('lqResults');
  var loading = document.getElementById('lqLoading');
  var error = document.getElementById('lqError');
  var empty = document.getElementById('lqEmpty');
  var q = input.value.trim();
  if (!q) return;
  btn.disabled = true;
  results.innerHTML = '';
  error.style.display = 'none';
  empty.style.display = 'none';
  loading.style.display = 'block';

  // Use MCP if connected
  if (MCP_CONNECTED && MCP_URL) {
    mcpCall('query', { q: q })
      .then(function(data) {
        loading.style.display = 'none';
        var hits = data.results || data || [];
        if (!hits.length) { empty.style.display = 'block'; return; }
        var html = '';
        hits.forEach(function(r) {
          var scorePct = Math.round((r.score || 0.5) * 100);
          var scoreClass = scorePct >= 70 ? 'high' : scorePct >= 50 ? 'med' : 'low';
          html += '<div class="lq-card" onclick="openPageModal(\'' + escAttr(r.slug || '') + '\')">' +
            '<div class="lq-header"><span class="lq-score ' + scoreClass + '">' + scorePct + '%</span>' +
            '<span class="lq-path">' + esc(r.slug || '') + '</span></div>' +
            '<div class="lq-snippet">' + esc((r.snippet || r.body || r.text || '').substring(0, 200)) + '</div></div>';
        });
        results.innerHTML = html;
      })
      .catch(function(err) {
        loading.style.display = 'none';
        error.textContent = 'Query failed — ' + err.message;
        error.style.display = 'block';
      })
      .finally(function() { btn.disabled = false; });
    return;
  }

  // Fallback: local page search
  loading.style.display = 'none';
  var ql = q.toLowerCase();
  var matches = (DATA.pages || []).filter(function(p) {
    return (p.title || '').toLowerCase().indexOf(ql) >= 0 ||
           (p.body || '').toLowerCase().indexOf(ql) >= 0 ||
           (p.slug || '').toLowerCase().indexOf(ql) >= 0;
  }).slice(0, 20);
  if (!matches.length) { empty.style.display = 'block'; btn.disabled = false; return; }
  var html = '';
  matches.forEach(function(p) {
    var body = (p.body || '').substring(0, 200);
    html += '<div class="lq-card" onclick="openPageModal(\'' + escAttr(p.slug) + '\')">' +
      '<div class="lq-header"><span class="lq-score med">match</span>' +
      '<span class="lq-path">' + esc(p.slug) + '</span></div>' +
      '<div class="lq-snippet">' + esc(body || '(no content)') + '</div></div>';
  });
  results.innerHTML = html;
  btn.disabled = false;
}

loadData();

