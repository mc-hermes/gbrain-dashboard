// ─── DOCS ───
const DOCS = {
  overview: `<h2>gbrain Dashboard</h2><p>A live control panel for your AI-powered knowledge base. This dashboard shows everything your company knows — people, companies, meetings, concepts, infrastructure — and how it all connects.</p><h3>What You're Looking At</h3><ul><li><strong>Stats bar</strong> — page count, brain health score, link coverage, embedding status</li><li><strong>Knowledge Graph</strong> — a visual map of how your ideas, people, and companies connect</li><li><strong>Page Browser</strong> — every page in your brain, searchable and clickable</li><li><strong>Entity Cards</strong> — people and companies with contact details</li><li><strong>Health Panel</strong> — 50+ automated checks monitoring your brain's status</li></ul><div class="callout"><strong>New?</strong> Start by clicking any page name, then follow the links. It's Wikipedia-style browsing for your own company knowledge.</div>`,
  how: `<h2>How It Works</h2><p>This dashboard has two ingredients, both dead simple:</p><h3>Ingredient 1 — The Brain (gbrain)</h3><p>A knowledge base that lives on your computer or VPS. Every meeting, client detail, project note, or piece of research goes into the brain.</p><h3>Ingredient 2 — The Dashboard</h3><p>A single HTML file and a JSON data file. Combined they're about 50KB — smaller than a photo. The dashboard reads the brain data and displays it with a live knowledge graph, clickable modals, and instant search.</p><div class="callout"><strong>The magic:</strong> You keep taking notes. The dashboard shows you a living map of everything your company knows. No maintenance required.</div>`,
  features: `<h2>Features</h2><h3>Knowledge Graph</h3><p>A force-directed graph showing all your pages as connected nodes. Click a node to open its detail panel.</p><h3>Clickable Modals</h3><p>Click any page row to see its full content, tags, outgoing links, and backlinks.</p><h3>Health Monitoring</h3><p>50+ automated checks — embedding coverage, graph integrity, schema version, reranker health.</p><h3>Mobile Navigation</h3><p>On phones, a fixed bottom nav bar lets you swap between Today, Browse, Ask, Graph, and More with one tap.</p>`,
  setup: '<h2>Setup Recipe</h2><h3>Bring Your Own Data</h3><p>This dashboard reads a <code>gbrain-data.json</code> file with your knowledge base content. There are three ways to load your data:</p><ol>' +
    '<li><strong>Upload file</strong> — click the ⚙️ gear icon in the header and pick your <code>gbrain-data.json</code> file</li>' +
    '<li><strong>Load from URL</strong> — paste a URL to your <code>gbrain-data.json</code> (useful for CI/CD pipelines)</li>' +
    '<li><strong>Query parameter</strong> — add <code>?source=https://...</code> to the dashboard URL</li>' +
    '</ol>' +
    '<h3>Data Format</h3><p>Your JSON must follow this schema:</p>' +
    '<pre style="font-size:0.65rem;line-height:1.4;overflow-x:auto;padding:12px;background:var(--surface2);border-radius:8px">' + esc('{\n  "updated_at": "ISO timestamp",\n  "summary": { page_count, person_count, ... },\n  "pages": [\n    {\n      "slug": "unique-id",\n      "title": "Page Title",\n      "type": "concept|person|company|meeting|newsletter|article|bookmark|digest",\n      "body": "Markdown content",\n      "tags": ["tag1", "tag2"],\n      "links_out": [{"to": "other-slug", "type": "wikilink", "text": "display text"}],\n      "backlinks": [{"from": "other-slug", "type": "wikilink", "text": "display text"}]\n    }\n  ],\n  "graph_links": [{ "source": "slug-a", "target": "slug-b", "type": "link" }],\n  "entities": { "people": ["people/name"], "companies": ["companies/name"] },\n  "doctor": { "checks": [] },\n  "artifacts": []\n}') + '</pre>' +
    '<h3>Data Stays Local</h3><p>Your uploaded data is stored in your browser\'s <code>localStorage</code>. Nothing is sent to any server. Use "Reset to default" in the ⚙️ menu to clear it.</p>',
  clients: `<h2>For Your Clients</h2><h3>The Pitch</h3><p>"Here's what we'll do. You keep taking notes the way you normally do. We'll set up a brain that stores all of that in a way that's searchable and connected. Then we'll give you a dashboard you can open on any device."</p><h3>What They Get</h3><ul><li><strong>Company memory</strong> that doesn't walk out when someone quits</li><li><strong>Client context</strong> at their fingertips before every call</li><li><strong>Visual map</strong> of how projects, people, and ideas connect</li><li><strong>Zero maintenance</strong> — it updates itself</li></ul>`,
  scaling: `<h2>Scaling & Limits</h2><p>This dashboard — HTML, JSON, everything — is ~440 KB total. GitHub Pages allows up to 1 GB.</p><div class="callout"><strong>53 brain pages = ~30 KB JSON.</strong> At ~0.6 KB per page, you'd need roughly 1.6 million pages to hit GitHub's 1 GB site limit.</div>`,
  shortcuts: `<h2>Keyboard Shortcuts</h2><table style="width:100%;font-size:0.78rem;border-collapse:collapse"><tr><td style="padding:8px 12px;border-bottom:1px solid rgba(255,255,255,0.04)"><span class="kbd">?</span></td><td>Open this help</td></tr><tr><td style="padding:8px 12px;border-bottom:1px solid rgba(255,255,255,0.04)"><span class="kbd">Esc</span></td><td>Close modal or panel</td></tr><tr><td style="padding:8px 12px"><span class="kbd">Ctrl+K</span></td><td>Focus search</td></tr></table><h3>Graph</h3><ul><li><strong>Scroll</strong> — zoom in/out (pinch on touch)</li><li><strong>Drag background</strong> — pan</li><li><strong>Drag node</strong> — reposition</li><li><strong>Click node</strong> — open detail modal</li></ul>`
};
let activeDoc = 'overview';
function openDocs() {
  document.getElementById('docsOverlay').classList.add('active');
  document.body.classList.add('modal-open');
  switchDoc('overview');
  document.querySelectorAll('#docsSidebar .docs-tab').forEach(t => t.classList.remove('active'));
  document.querySelector('#docsSidebar .docs-tab[data-doc="overview"]').classList.add('active');
}
function closeDocs() {
  document.getElementById('docsOverlay').classList.remove('active');
  document.body.classList.remove('modal-open');
}
function switchDoc(doc) {
  activeDoc = doc;
  document.getElementById('docsContent').innerHTML = DOCS[doc] || '';
  document.querySelectorAll('#docsSidebar .docs-tab').forEach(t => t.classList.remove('active'));
  const tab = document.querySelector(`#docsSidebar .docs-tab[data-doc="${doc}"]`);
  if (tab) tab.classList.add('active');
}
document.getElementById('docsSidebar').addEventListener('click', function(e) {
  if (!e.target.classList.contains('docs-tab')) return;
  switchDoc(e.target.dataset.doc);
});

// ─── KEYBOARD ───
document.addEventListener('keydown', function(e) {
  if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
    if (e.key === 'Escape') { e.target.blur(); return; }
    return;
  }
  if (e.key === '?') { e.preventDefault(); openDocs(); return; }
  if (e.key === 'Escape') {
    if (document.getElementById('docsOverlay').classList.contains('active')) { closeDocs(); return; }
    if (document.getElementById('modalOverlay').classList.contains('active')) { closeModal(); return; }
    // Close graph fullscreen
    const gc = document.getElementById('graphContainer');
    if (gc && gc.classList.contains('graph-fullscreen')) { toggleGraphFullscreen(); return; }
  }
  if ((e.ctrlKey||e.metaKey) && e.key === 'k') {
    e.preventDefault();
    showView('browse');
    showBrowseTab('pages');
    document.querySelectorAll('#browseTabs .tab').forEach(t => t.classList.remove('active'));
    document.querySelector('[data-btab="pages"]').classList.add('active');
    document.getElementById('searchInput').focus();
  }
});

