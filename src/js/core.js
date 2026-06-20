let DATA = null;
let activeTab = 'pages';
let activeView = 'today';
let graphRendered = false;
let pagesRendered = false;
let entitiesRendered = false;
let healthRendered = false;
let artifactsRendered = false;
// ─── VIEW SWAPPING ───
function showView(name) {
  activeView = name;
  // Hide all view panels
  document.querySelectorAll('.view-panel').forEach(v => v.classList.remove('active'));
  // Show requested
  const target = document.getElementById('view-' + name);
  if (target) target.classList.add('active');

  // Update mobile nav
  document.querySelectorAll('.mobile-nav-btn').forEach(b => b.classList.remove('active'));
  const navBtn = document.querySelector('.mobile-nav-btn[data-view="' + name + '"]');
  if (navBtn) navBtn.classList.add('active');

  // Update desktop view tabs
  document.querySelectorAll('#desktopViewTabs .tab').forEach(t => t.classList.remove('active'));
  const dt = document.querySelector('#desktopViewTabs .tab[data-dview="' + name + '"]');
  if (dt) dt.classList.add('active');

  // Close more menu
  document.getElementById('moreMenu').classList.remove('active');

  // Lazy render
  if (name === 'graph' && !graphRendered) { drawGraph(); graphRendered = true; }
  if (name === 'logs') {
    if (!logsRendered) { renderLogs(); logsRendered = true; }
    startLogsPoll();
  } else {
    stopLogsPoll();
  }
  if (name === 'browse') {
    if (!pagesRendered) { renderPages(); pagesRendered = true; }
    if (!entitiesRendered) { renderEntities(); entitiesRendered = true; }
    if (!healthRendered) { renderHealth(); healthRendered = true; }
    if (!artifactsRendered) { renderArtifacts(); artifactsRendered = true; }
    // Show correct sub-view
    showBrowseTab(activeTab);
  }

  // Resize canvas if graph view opened
  if (name === 'graph') setTimeout(resizeCanvas, 50);
}
// ─── STATS ───
// Stat icon SVGs (replaces emoji)
var statIconSvgs = {
  pages: '<svg viewBox="0 0 16 16"><rect x="2" y="2" width="12" height="12" rx="2" stroke="currentColor" fill="none"/><path d="M5 7h6M5 10h6" stroke="currentColor"/></svg>',
  brain: '<svg viewBox="0 0 16 16"><circle cx="8" cy="8" r="6" stroke="currentColor" fill="none"/><path d="M5 8c0-2 1-3 3-3s3 1 3 3-1 3-3 3-3-1-3-3z" stroke="currentColor"/><path d="M7 6v2M9 7v1" stroke="currentColor"/></svg>',
  links: '<svg viewBox="0 0 16 16"><path d="M6 3l7 5-7 5V3z" stroke="currentColor" fill="none"/><path d="M3 5v6" stroke="currentColor"/></svg>',
  graph: '<svg viewBox="0 0 16 16"><circle cx="5" cy="5" r="2" stroke="currentColor" fill="none"/><circle cx="11" cy="4" r="1.5" stroke="currentColor" fill="none"/><circle cx="8" cy="11" r="2.5" stroke="currentColor" fill="none"/><path d="M6 6l2 4M10 5l-1 4" stroke="currentColor"/></svg>',
  embed: '<svg viewBox="0 0 16 16"><circle cx="8" cy="8" r="3" stroke="currentColor" fill="none"/><circle cx="8" cy="8" r="5" stroke="currentColor" fill="none" opacity="0.5"/><circle cx="8" cy="8" r="7" stroke="currentColor" fill="none" opacity="0.3"/></svg>'
};

function renderStats() {
  const s = DATA.summary || {};
  const pages = DATA.pages || [];
  // Render compact chips into statChips (Today view) + fallback statGrid if present
  var chips = [
    {svg: statIconSvgs.pages, value: s.page_count, label: 'Pages'},
    {svg: statIconSvgs.brain, value: s.score || '—', label: 'Score' + (s.score_label || ''), click: 'showBrainScoreModal'},
    {svg: statIconSvgs.links, value: s.total_links, label: 'Links'},
    {svg: statIconSvgs.graph, value: (s.graph_coverage||'').match(/[\\d.]+%/) ? (s.graph_coverage.match(/[\\d.]+%/)[0]) : '—', label: 'Graph'},
    {svg: statIconSvgs.embed, value: (s.embed_coverage||'').match(/[\\d.]+%/) ? (s.embed_coverage.match(/[\\d.]+%/)[0]) : '—', label: 'Embed'}
  ];
  var html = chips.map(function(c) {
    return '<div class="stat-chip"' + (c.click ? ' onclick="' + c.click + '()"' : '') + '>' +
      '<span class="sc-icon">' + c.svg + '</span>' +
      '<span class="sc-value">' + esc(String(c.value)) + '</span>' +
      '<span class="sc-label">' + esc(c.label) + '</span>' +
    '</div>';
  }).join('');
  var chipsEl = document.getElementById('statChips');
  if (chipsEl) chipsEl.innerHTML = html;
  // Also render into statGrid if it exists (for desktop)
  var gridEl = document.getElementById('statGrid');
  if (gridEl) {
    var gridHtml = [
      {icon: statIconSvgs.pages, value: s.page_count, label: 'Total Pages', detail: (s.concept_count||0) + ' concepts, ' + (s.meeting_count||0) + ' meetings, ' + (s.person_count||0) + ' people', cls: '', click: 'showStatBreakdown'},
      {icon: statIconSvgs.brain, value: s.score || '—', label: 'Brain Score /100', detail: s.score_breakdown || '', cls: '', click: 'showBrainScoreModal'},
      {icon: statIconSvgs.links, value: s.total_links, label: 'Total Links', detail: sumLinks('outbound') + ' outbound, ' + sumLinks('inbound') + ' inbound', cls: '', click: null},
      {icon: statIconSvgs.graph, value: (s.graph_coverage||'').match(/[\\d.]+%/) ? (s.graph_coverage.match(/[\\d.]+%/)[0]) : '—', label: 'Graph Coverage', detail: s.graph_coverage||'', cls: '', click: null},
      {icon: statIconSvgs.embed, value: (s.embed_coverage||'').match(/[\\d.]+%/) ? (s.embed_coverage.match(/[\\d.]+%/)[0]) : '—', label: 'Embeddings', detail: s.embed_coverage||'', cls: '', click: null}
    ].map(function(c) {
      return '<div class="stat-card"' + (c.click ? ' onclick="' + c.click + '()"' : '') + '>' +
        '<div class="icon">' + c.icon + '</div><div class="value">' + esc(String(c.value)) + '</div><div class="label">' + esc(c.label) + '</div><div class="detail">' + esc(c.detail||'') + '</div>' +
        (c.click ? '<div class="hint">click for details →</div>' : '') +
      '</div>';
    }).join('');
    gridEl.innerHTML = gridHtml;
  }
}

function showBrainScoreModal() {
  var s = DATA.summary || {};
  var comps = s.score_components || {};
  var breakdown = s.score_breakdown || '';
  var html = '<div class="m-section"><div class="m-section-title">Brain Score Breakdown</div>';
  html += '<div style="font-family:Syne,sans-serif;font-size:3rem;font-weight:800;text-align:center;margin:16px 0;color:var(--primary-light)">' + esc(s.score||'—') + '<span style="font-size:1rem;color:var(--text-muted)">/100</span></div>';
  var keys = ['embed', 'links', 'timeline', 'orphans', 'dead-links'];
  keys.forEach(function(k) {
    var val = comps[k] || '—/—';
    var parts = val.split('/');
    var numer = parseInt(parts[0]) || 0;
    var denom = parseInt(parts[1]) || 0;
    var pct = denom > 0 ? Math.round(numer/denom*100) : 0;
    var color = pct >= 80 ? 'var(--green)' : pct >= 50 ? 'var(--primary)' : 'var(--rose)';
    html += '<div style="margin:8px 0"><div style="display:flex;justify-content:space-between;font-size:0.7rem;margin-bottom:2px"><span>' + k + '</span><span style="font-family:JetBrains Mono,monospace">' + val + '</span></div>';
    html += '<div style="height:6px;background:var(--surface2);border-radius:3px;overflow:hidden"><div style="height:100%;width:' + pct + '%;background:' + color + ';border-radius:3px"></div></div></div>';
  });
  if (breakdown) {
    html += '<div style="font-size:0.65rem;color:var(--text-muted);margin-top:12px;font-family:JetBrains Mono,monospace">' + esc(breakdown) + '</div>';
  }
  html += '</div>';
  openModal('Brain Score', 'brain-score', html);
}

function sumLinks(dir) {
  return (DATA.pages||[]).reduce((s,p) => s + (dir==='outbound'?p.outbound_count:p.inbound_count), 0);
}

function showStatBreakdown() {
  const types = {};
  (DATA.pages||[]).forEach(p => { types[p.type] = (types[p.type]||0)+1; });
  let html = '<div class="m-section"><div class="m-section-title">Page Type Breakdown</div>';
  html += '<table style="width:100%"><thead><tr><th>Type</th><th>Count</th><th>%</th></tr></thead><tbody>';
  const total = DATA.pages.length;
  Object.entries(types).sort((a,b)=>b[1]-a[1]).forEach(([t,c]) => {
    html += `<tr><td><span class="type-tag ${t}">${t}</span></td><td>${c}</td><td>${((c/total)*100).toFixed(0)}%</td></tr>`;
  });
  html += '</tbody></table></div>';
  openModal('Page Type Breakdown', 'stat-breakdown', html);
}

function switchToHealth() {
  showView('browse');
  showBrowseTab('health');
  document.querySelectorAll('#browseTabs .tab').forEach(t => t.classList.remove('active'));
  document.querySelector('[data-btab="health"]').classList.add('active');
}
// ─── FILTERS ───
function filterCurrent() {
  const q = document.getElementById('searchInput').value;
  if (activeTab === 'pages') { renderPages(q); }
  if (activeTab === 'artifacts') { renderArtifacts(q); }
  if (activeTab === 'entities') { renderEntities(q); }
}

  if (!confirm('Delete ' + _bulkSelected.length + ' pages? This cannot be undone.')) return;
  _bulkSelected.forEach(function(slug) {
    if (MCP_CONNECTED && MCP_URL) {
      try { mcpCall('delete_page', { slug: slug }); } catch(e) {}
    }
    DATA.pages = (DATA.pages||[]).filter(function(p) { return p.slug !== slug; });
  });
  DATA.summary.page_count = DATA.pages.length;
  clearBulkSelect();
  reRenderAll();
  showView('browse');
  showBrowseTab('pages');
}

function reRenderAll() {
  renderStats();
  renderDigest();
  renderFeed();
  pagesRendered = false;
  entitiesRendered = false;
  healthRendered = false;
  graphRendered = false;
  artifactsRendered = false;
  if (activeView === 'browse') {
    if (activeTab === 'pages') { renderPages(); pagesRendered = true; }
    if (activeTab === 'entities') { renderEntities(); entitiesRendered = true; }
  }
  if (activeView === 'today') { renderFeed(); }
  if (activeView === 'graph') { initGraph(); drawGraph(); graphRendered = true; }
}

