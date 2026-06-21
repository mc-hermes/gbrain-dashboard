// ─── TODAY FEED ───
let feedSourceFilter = 'all';

function renderFeed() {
  const pages = DATA.pages || [];
  let filtered = pages;
  if (feedSourceFilter !== 'all') {
    filtered = pages.filter(p => p.type === feedSourceFilter);
  }
  filtered = filtered.sort((a,b) => (b.updated||'').localeCompare(a.updated||''));

  const container = document.getElementById('feedCards');
  const empty = document.getElementById('feedEmpty');
  document.getElementById('feedCount').textContent = filtered.length + ' items';

  if (!filtered.length) {
    container.innerHTML = '';
    empty.style.display = 'block';
    // Tab-specific empty state messages
    var emptyMsgs = {
      'all': {title: 'No pages yet', desc: 'Click the ⚙️ gear icon above to connect your gbrain brain or upload a data file.'},
      'newsletter': {title: 'No newsletters', desc: 'Forward newsletter emails to your brain inbox.'},
      'video': {title: 'No videos', desc: 'Ingest YouTube videos or video notes to populate this section.'},
      'bookmark': {title: 'No saved items', desc: 'Save bookmarks from your reading to see them here.'},
      'quote': {title: 'No quotes', desc: 'Capture quotes from meetings and articles.'},
      'dataset': {title: 'No datasets', desc: 'Upload spreadsheets or CSVs to analyze here.'},
      'meeting': {title: 'No meetings', desc: 'Ingest meeting transcripts to populate this section.'}
    };
    var m = emptyMsgs[feedSourceFilter] || emptyMsgs['all'];
    empty.innerHTML = '<div class="empty-title">' + esc(m.title) + '</div><div class="empty-desc">' + esc(m.desc) + '</div>';
    return;
  }
  empty.style.display = 'none';

  const slugIndex = {};
  pages.forEach(p => { slugIndex[p.slug] = p; });

  container.innerHTML = filtered.map(p => {
    const type = p.type || 'concept';
    const timeDisplay = p.updated ? timeAgo(p.updated) : '';
    const linksOut = p.links_out || [];
    // Deduplicate links by target slug
    var seenLinks = {};
    var uniqueLinks = [];
    linksOut.forEach(function(l) {
      if (!seenLinks[l.to]) { seenLinks[l.to] = true; uniqueLinks.push(l); }
    });
    const linkNames = [];
    uniqueLinks.forEach(function(l) {
      const target = slugIndex[l.to];
      if (target) {
        linkNames.push('<span class="fc-link" onclick="event.stopPropagation();openPageModal(\'' + escAttr(l.to) + '\')">' + esc(target.title || l.to) + '</span>');
      }
    });
    const secondDegree = computeSecondDegreeLinks(p, slugIndex, uniqueLinks);
    secondDegree.forEach(function(sd) {
      linkNames.push('<span class="fc-second-degree" onclick="event.stopPropagation();openPageModal(\'' + escAttr(sd.slug) + '\')">' + esc(sd.title) + ' (via ' + esc(sd.via) + ')</span>');
    });
    // Strip markdown from snippet: remove headings, bold/italic, blockquotes, links, wikilinks
    const snippet = p.body ? p.body.replace(/^#{1,6}\s+.*$/gm, '').replace(/\*\*([^*]+)\*\*/g, '$1').replace(/\*([^*]+)\*/g, '$1').replace(/^>\s?/gm, '').replace(/\[([^\]]+)\]\([^)]+\)/g, '$1').replace(/\[\[([^\]]+)\]\]/g, '$1').replace(/`{1,3}[^`]+`{1,3}/g, '').trim().slice(0, 120) : '';
    var tierBadge = p.type === 'person' ? renderTierBadge(p.tags||[]) : '';
    var healthIndicator = p.type === 'person' ? renderHealthIndicator(p) : '';
    return '<div class="feed-card" data-slug="' + escAttr(p.slug) + '" onclick="openPageModal(\'' + escAttr(p.slug) + '\')">\n      <div class="fc-link-line"></div>\n      <div class="fc-header">\n        <span class="fc-type-badge ' + type + '">' + getTypeSvg(type) + ' ' + type + '</span>\n        ' + (tierBadge ? tierBadge : '') + '\n        ' + (healthIndicator ? '<span style="margin-left:4px">' + healthIndicator + '</span>' : '') + '\n        <span class="fc-time">' + timeDisplay + '</span>\n      </div>\n      <div class="fc-title">' + esc(p.title || p.slug) + '</div>\n      ' + (linkNames.length ? '<div class="fc-links">' + linkNames.join(' · ') + '</div>' : '') + '\n      ' + (snippet ? '<div class="fc-summary">' + esc(snippet) + '</div>' : '') + '\n      ' + (p.type === 'dataset' ? '<div class="fc-meta">' + (p.row_count ? p.row_count + ' rows' : '') + (p.columns ? ' · ' + (p.columns||[]).slice(0,5).join(', ') : '') + (p.format ? ' · ' + p.format : '') + '</div>' : '') + '\n    </div>';
  }).join('');
  setupDrawInAnimation();
}

function computeSecondDegreeLinks(page, slugIndex, linksOut) {
  const directSlugs = new Set();
  linksOut.forEach(l => { if (slugIndex[l.to]) directSlugs.add(l.to); });
  const results = []; const seen = new Set();
  directSlugs.forEach(directSlug => {
    const directPage = slugIndex[directSlug];
    if (!directPage) return;
    (directPage.links_out || []).forEach(l => {
      if (l.to === page.slug) return;
      if (directSlugs.has(l.to)) return;
      if (seen.has(l.to)) return;
      seen.add(l.to);
      const target = slugIndex[l.to];
      if (target && target.type !== 'person' && target.type !== 'company') {
        results.push({ slug: l.to, title: target.title || l.to, via: directPage.title || directSlug });
      }
    });
  });
  return results.slice(0, 3);
}

function filterFeed(src) {
  feedSourceFilter = src;
  document.querySelectorAll('#feedSourceTabs .feed-source-tab').forEach(t => {
    t.classList.toggle('active', t.getAttribute('data-src') === src);
  });
  renderFeed();
}

function getTypeIcon(type) {
  var icons = { newsletter: '✉', meeting: '◈', video: '▶', article: '☰', bookmark: '⟐', quote: '❝', dataset: '⊞', digest: '☰', person: '●', company: '■', concept: '○', daily: '☷' };
  return icons[type] || '○';
}

/* SVG icon system — single-stroke, currentColor */
function getTypeSvg(type) {
  var svgs = {
    newsletter: '<svg viewBox="0 0 16 16"><rect x="2" y="3" width="12" height="10" rx="1" stroke="currentColor"/><path d="M2 5l6 4 6-4" stroke="currentColor" fill="none"/></svg>',
    meeting: '<svg viewBox="0 0 16 16"><circle cx="5" cy="5" r="2.5" stroke="currentColor" fill="none"/><circle cx="11" cy="5" r="2.5" stroke="currentColor" fill="none"/><path d="M2 14c0-3 1.5-4.5 3-4.5s3 1.5 3 4.5" stroke="currentColor" fill="none"/><path d="M8 14c0-3 1.5-4.5 3-4.5s3 1.5 3 4.5" stroke="currentColor" fill="none"/></svg>',
    video: '<svg viewBox="0 0 16 16"><rect x="1" y="3" width="10" height="10" rx="1" stroke="currentColor" fill="none"/><polygon points="12,5 16,8 12,11" stroke="currentColor" fill="none"/></svg>',
    article: '<svg viewBox="0 0 16 16"><rect x="2" y="1" width="12" height="14" rx="1" stroke="currentColor" fill="none"/><path d="M4 5h8M4 8h8M4 11h8" stroke="currentColor"/></svg>',
    bookmark: '<svg viewBox="0 0 16 16"><path d="M3 1h10v14l-5-4-5 4V1z" stroke="currentColor" fill="none"/></svg>',
    quote: '<svg viewBox="0 0 16 16"><path d="M4 3h3v5l-2 4M9 3h3v5l-2 4" stroke="currentColor" fill="none"/></svg>',
    dataset: '<svg viewBox="0 0 16 16"><rect x="2" y="2" width="12" height="5" rx="1" stroke="currentColor" fill="none"/><rect x="2" y="9" width="12" height="5" rx="1" stroke="currentColor" fill="none"/></svg>',
    digest: '<svg viewBox="0 0 16 16"><rect x="2" y="2" width="12" height="12" rx="1" stroke="currentColor" fill="none"/><path d="M5 5h6M5 8h6M5 11h4" stroke="currentColor"/></svg>',
    person: '<svg viewBox="0 0 16 16"><circle cx="8" cy="5" r="3" stroke="currentColor" fill="none"/><path d="M2 15c0-4 2.5-6 6-6s6 2 6 6" stroke="currentColor" fill="none"/></svg>',
    company: '<svg viewBox="0 0 16 16"><rect x="2" y="4" width="12" height="11" rx="1" stroke="currentColor" fill="none"/><path d="M5 1h6v3H5V1z" stroke="currentColor" fill="none"/><path d="M6 8h4M6 11h4" stroke="currentColor"/></svg>',
    concept: '<svg viewBox="0 0 16 16"><circle cx="8" cy="8" r="6" stroke="currentColor" fill="none"/><path d="M8 4v8M4 8h8" stroke="currentColor"/></svg>',
    daily: '<svg viewBox="0 0 16 16"><rect x="2" y="1" width="12" height="14" rx="1" stroke="currentColor" fill="none"/><path d="M5 1v3M11 1v3M2 5h12" stroke="currentColor"/></svg>'
  };
  return svgs[type] || '<svg viewBox="0 0 16 16"><rect x="2" y="2" width="12" height="12" rx="1" stroke="currentColor" fill="none"/></svg>';
}

/* Draw-in animation Intersection Observer */
var _drawInObserver = null;
function setupDrawInAnimation() {
  var cards = document.querySelectorAll('#feedCards .feed-card:not(.draw-in)');
  if (!cards.length) return;
  if (!_drawInObserver && 'IntersectionObserver' in window) {
    _drawInObserver = new IntersectionObserver(function(entries) {
      entries.forEach(function(entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('draw-in');
          _drawInObserver.unobserve(entry.target);
        }
      });
    }, { threshold: 0.2 });
  }
  cards.forEach(function(c) { if (_drawInObserver) _drawInObserver.observe(c); });
}

function timeAgo(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr); if (isNaN(d)) return '';
  const now = new Date(), diff = Math.floor((now - d) / 1000);
  if (diff < 60) return 'just now';
  if (diff < 3600) return Math.floor(diff/60) + 'm ago';
  if (diff < 86400) return Math.floor(diff/3600) + 'h ago';
  if (diff < 604800) return Math.floor(diff/86400) + 'd ago';
  return dateStr;
}

function esc(s) { const d=document.createElement('div'); d.textContent=(s||''); return d.innerHTML; }
function escAttr(s) { return (s||'').replace(/'/g,'&#39;').replace(/"/g,'&quot;').replace(/</g,'&lt;'); }

// ─── DIGEST ───
function renderDigest() {
  const slot = document.getElementById('digestSlot');
  const digests = (DATA.pages||[]).filter(p => p.type === 'digest');
  if (!digests.length) { slot.innerHTML = ''; return; }
  const d = digests.sort((a,b) => (b.updated||'').localeCompare(a.updated||''))[0];
  const body = d.body || '';
  const sections = body.split(/\n## /);
  let html = `<div class="digest-card" onclick="openPageModal('${escAttr(d.slug)}')">
    <div class="dc-badge">Weekly Digest</div>
    <div class="dc-title">${esc(d.title || 'Business Brain Digest')}</div>
    <div class="dc-date">${d.updated || ''}</div>`;
  sections.forEach(s => {
    if (!s.trim()) return;
    const lines = s.split('\n').filter(l => l.trim());
    const heading = lines[0].replace(/^##?\s*/, '').trim();
    if (heading) {
      const content = lines.slice(1).join('\n').replace(/\[\[([^\]]+)\]\]/g, '<span class="dc-link" onclick="event.stopPropagation();openPageModal(\'$1\')">$1</span>').slice(0, 200);
      html += `<div class="dc-section"><strong>${esc(heading)}</strong><br>${content}</div>`;
    }
  });
  html += '</div>';
  slot.innerHTML = html;
}

