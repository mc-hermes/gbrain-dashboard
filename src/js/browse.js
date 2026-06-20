// ─── PAGES TABLE (lazy) ───
function renderPages(filter) {
  let pages = DATA.pages || [];
  if (filter) {
    const q = filter.toLowerCase();
    pages = pages.filter(p => (p.slug||'').toLowerCase().includes(q) || (p.title||'').toLowerCase().includes(q) || (p.type||'').toLowerCase().includes(q) || (p.body||'').toLowerCase().includes(q) || (p.tags||[]).some(t=>t.toLowerCase().includes(q)));
  }
  if (!pages.length) {
    document.getElementById('pagesTable').innerHTML = '<div class="empty"><p>No pages match</p></div>';
    return;
  }
  document.getElementById('pagesTable').innerHTML = `<table><thead><tr><th class="select-col"><input type="checkbox" class="bulk-select-all" id="bulkSelectAll" onchange="selectAllPages(this.checked)" title="Select all"></th><th>Page</th><th>Type</th><th>Links</th><th>Tier</th><th>Updated</th></tr></thead><tbody>${
    pages.map(p => {
      const lc = p.outbound_count + p.inbound_count;
      const tierHtml = p.type === 'person' ? renderTierBadge(p.tags) : '';
      return `<tr class="page-row" onclick="if(!event.target.closest('.select-col'))openPageModal('${escAttr(p.slug)}')">
        <td class="select-col" onclick="event.stopPropagation()"><input type="checkbox" class="bulk-checkbox" data-slug="${escAttr(p.slug)}" onchange="toggleBulkSelect('${escAttr(p.slug)}',this.checked)"></td>
        <td><span class="slug-link" onclick="event.stopPropagation();openPageModal('${escAttr(p.slug)}')">${esc(p.slug)}</span><br><span style="font-size:0.65rem;color:var(--text-muted)">${esc(p.title||'')}</span></td>
        <td><span class="type-tag ${p.type||'concept'}">${p.type||'concept'}</span></td>
        <td><span class="link-badge ${lc>0?'has-links':''}">${lc>0 ? '🔗 '+lc : '—'}</span></td>
        <td>${tierHtml || '—'}</td>
        <td>${p.updated||''}</td>
      </tr>`;
    }).join('')
  }</tbody></table>`;
}


// ─── ARTIFACTS (lazy) ───
let artifactFilter = 'all';

function renderArtifacts(query) {
  const artifacts = DATA.artifacts || [];
  let filtered = artifacts;
  query = query || '';
  
  // Text search
  if (query.trim()) {
    const q = query.toLowerCase();
    filtered = filtered.filter(a => 
      a.basename.toLowerCase().includes(q) || 
      a.path.toLowerCase().includes(q) ||
      (a.source_pages||[]).some(s => s.toLowerCase().includes(q))
    );
  }
  
  // Type filter
  if (artifactFilter !== 'all') {
    filtered = filtered.filter(a => a.type === artifactFilter);
  }
  
  const grid = document.getElementById('artifactGrid');
  const empty = document.getElementById('artifactEmpty');
  const filters = document.getElementById('artifactFilters');
  
  // Render type filter pills
  const types = {};
  artifacts.forEach(a => { types[a.type] = (types[a.type]||0) + 1; });
  var filterHtml = '<button class="artifact-filter-pill' + (artifactFilter==='all'?' active':'') + '" onclick="setArtifactFilter(\'all\')">All (' + artifacts.length + ')</button>';
  Object.entries(types).sort((a,b)=>b[1]-a[1]).forEach(function(e) {
    filterHtml += '<button class="artifact-filter-pill' + (artifactFilter===e[0]?' active':'') + '" onclick="setArtifactFilter(\'' + escAttr(e[0]) + '\')">' + getArtifactIcon(e[0]) + ' ' + e[0] + ' (' + e[1] + ')</button>';
  });
  filters.innerHTML = filterHtml;
  
  if (!filtered.length) {
    grid.innerHTML = '';
    empty.style.display = 'block';
    if (query) empty.innerHTML = '<p>No artifacts matching "' + esc(query) + '"</p>';
    else empty.innerHTML = '<p>No artifacts yet. Ingest screenshots, CSVs, or PDFs to populate.</p>';
    return;
  }
  empty.style.display = 'none';
  
  const slugIndex = {};
  (DATA.pages||[]).forEach(function(p) { slugIndex[p.slug] = p; });
  
  grid.innerHTML = filtered.map(function(a, idx) {
    var srcPages = a.source_pages || [];
    var pagesHtml = '';
    if (srcPages.length) {
      pagesHtml = srcPages.map(function(s) {
        var title = (slugIndex[s]||{}).title || s;
        return '<span class="art-page-link" onclick="event.stopPropagation();openPageModal(\'' + escAttr(s) + '\')">' + esc(title) + '</span>';
      }).join(' · ');
    } else {
      pagesHtml = '<span class="art-nopage">no linked page</span>';
    }
    var mtime = a.mtime ? a.mtime.split('T')[0] : '';
    var previewable = a.preview && a.preview.type !== 'error';
    var inR2 = !!a.r2_key;
    var clickAttr = previewable ? ' onclick="openArtifactPreview(' + idx + ')" style="cursor:pointer"' : ' style="cursor:default;opacity:0.6"';
    return '<div class="artifact-card"' + clickAttr + '>' +
      '<div class="art-icon">' + getArtifactIcon(a.type) + '</div>' +
      '<div class="art-name">' + esc(a.basename) + '</div>' +
      '<div class="art-meta"><span>' + esc(a.ext) + '</span><span>' + esc(a.size_human) + '</span>' + (mtime ? '<span>' + esc(mtime) + '</span>' : '') + (inR2 ? '<span style="background:rgba(34,211,238,0.12);color:var(--primary-light)">R2</span>' : '') + (previewable ? '<span style="color:var(--green)">preview</span>' : '') + '</div>' +
      '<div class="art-pages">' + pagesHtml + '</div>' +
    '</div>';
  }).join('');
}

function setArtifactFilter(type) {
  artifactFilter = type;
  renderArtifacts();
}

function getArtifactIcon(type) {
  var icons = {
    image: '',
    spreadsheet: '',
    document: '',
    text: '',
    data: '',
    video: '',
    audio: '',
    file: ''
  };
  return (icons[type] || '') + ' ';
}

function openArtifactPreview(idx) {
  var artifacts = DATA.artifacts || [];
  var a = artifacts[idx];
  if (!a || !a.preview) return;
  var p = a.preview;
  var title = a.basename;
  var subtitle = a.type + ' · ' + a.size_human;
  var html = '';
  
  // Meta bar
  html += '<div class="art-preview-meta">';
  html += '<span>' + getArtifactIcon(a.type) + ' ' + a.type + '</span>';
  html += '<span>' + esc(a.ext) + '</span>';
  html += '<span>' + esc(a.size_human) + '</span>';
  if (a.r2_key) {
    html += '<span style="color:var(--primary-light)">R2: ' + esc(a.r2_key) + '</span>';
  }
  if (a.source_pages.length) {
    var slugIndex = {};
    (DATA.pages||[]).forEach(function(pg) { slugIndex[pg.slug] = pg; });
    html += '<span>Pages: ' + a.source_pages.map(function(s) {
      return '<a href="#" onclick="event.preventDefault();closeModal();openPageModal(\'' + escAttr(s) + '\')" style="color:var(--primary)">' + esc((slugIndex[s]||{}).title || s) + '</a>';
    }).join(', ') + '</span>';
  }
  html += '</div>';
  
  // Preview content by type
  if (p.type === 'image') {
    html += '<img class="art-preview-image" src="data:' + escAttr(p.mime||'image/jpeg') + ';base64,' + (p.data||'') + '" alt="' + escAttr(a.basename) + '">';
  } else if (p.type === 'table') {
    var headers = p.headers || [];
    var rows = p.rows || [];
    html += '<div style="max-height:55vh;overflow-y:auto"><table class="art-preview-table"><thead><tr>';
    headers.forEach(function(h) { html += '<th>' + esc(h) + '</th>'; });
    html += '</tr></thead><tbody>';
    rows.forEach(function(row) {
      html += '<tr>';
      for (var i = 0; i < headers.length; i++) {
        html += '<td>' + esc(row[i]||'') + '</td>';
      }
      html += '</tr>';
    });
    html += '</tbody></table></div>';
    if (p.total_rows) {
      html += '<div style="font-size:0.6rem;color:var(--text-muted);margin-top:6px">Showing ' + rows.length + ' of ' + p.total_rows + ' rows</div>';
    }
  } else if (p.type === 'text') {
    html += '<div class="art-preview-text">' + esc(p.content||'') + '</div>';
  } else if (p.type === 'error') {
    html += '<div class="art-preview-unsupported"><div class="icon"></div><p>Preview generation failed</p><p style="font-size:0.65rem">' + esc(p.message||'') + '</p></div>';
  }
  
  openModal(title, subtitle, html);
}


// ─── ENTITIES (lazy) ───
function renderEntities() {
  const people = (DATA.entities?.people||[]).map(s => DATA.pages.find(p=>p.slug===s)).filter(Boolean);
  const companies = (DATA.entities?.companies||[]).map(s => DATA.pages.find(p=>p.slug===s)).filter(Boolean);
  const all = [
    ...people.map(p => ({...p, icon:'👤', color:'var(--violet)', entityType:'person'})),
    ...companies.map(p => ({...p, icon:'🏢', color:'var(--green)', entityType:'company'}))
  ];
  if (!all.length) {
    document.getElementById('entityGrid').innerHTML = '<div class="empty"><div class="icon">🔍</div><p>No entities indexed yet</p></div>';
    return;
  }
  document.getElementById('entityGrid').innerHTML = all.map(e => {
    const preview = (e.body||'').slice(0, 120).replace(/[#*`]/g,'').trim();
    const contact = [];
    if (e.email) contact.push('✉ ' + esc(e.email));
    if (e.phone) contact.push('📞 ' + esc(e.phone));
    var tierHtml = e.entityType === 'person' ? renderTierBadge(e.tags||[]) : '';
    var healthHtml = e.entityType === 'person' ? renderHealthIndicator(e) : '';
    var lastContact = e.entityType === 'person' ? getLastContactDate(e) : '';
    return '<div class="entity-card" onclick="openPageModal(\'' + escAttr(e.slug) + '\')">' +
      (tierHtml ? '<div style="margin-bottom:4px">' + tierHtml + '</div>' : '') +
      '<div class="name">' + esc(e.title) + '</div>' +
      '<div class="slug">' + esc(e.slug) + '</div>' +
      (contact.length ? '<div class="contact-row">' + contact.join(' · ') + '</div>' : '') +
      (healthHtml || lastContact ? '<div style="display:flex;align-items:center;gap:8px;margin-top:6px">' + healthHtml + (lastContact ? '<span class="last-contact">' + esc(lastContact) + '</span>' : '') + '</div>' : '') +
      (preview ? '<div class="preview">' + esc(preview) + '</div>' : '') +
      '<div class="meta"><span class="type-tag ' + e.entityType + '">' + e.entityType + '</span>' + (e.tags||[]).slice(0,3).map(function(t){return '<span class="tag" style="font-size:0.55rem;padding:1px 7px;border-radius:10px;background:rgba(148,163,184,0.1);color:var(--text-muted)">' + esc(t) + '</span>';}).join('') + '</div>' +
    '</div>';
  }).join('');
  setupDrawInAnimation();
}

// ─── HEALTH (lazy) ───
function renderHealth() {
  const checks = DATA.doctor?.checks || [];
  if (!checks.length) {
    document.getElementById('healthGrid').innerHTML = '<div class="empty"><p>No health data</p></div>';
    return;
  }
  document.getElementById('healthGrid').innerHTML = checks.map(c => {
    let dotCls = 'ok';
    if (c.status === 'warn' || c.status === 'warning') dotCls = 'warn';
    if (c.status === 'error' || c.status === 'fail') dotCls = 'error';
    return `<div class="health-item" onclick="openCheckModal('${escAttr(c.name)}')">
      <div class="health-dot ${dotCls}"></div>
      <div class="health-info">
        <div class="name">${esc(c.name)}</div>
        <div class="msg">${esc(c.message||'')}</div>
        <div style="font-size:0.55rem;color:var(--text-muted);margin-top:4px">${esc(c.category||'')} · ${c.status}</div>
      </div>
    </div>`;
  }).join('');
  setupDrawInAnimation();
}

// ─── BROWSE TABS ───
function showBrowseTab(tab) {
  activeTab = tab;
  document.getElementById('pagesView').style.display = tab==='pages'?'':'none';
  document.getElementById('searchWrap').style.display = (tab==='pages'||tab==='entities'||tab==='artifacts')?'':'none';
  document.getElementById('entitiesView').style.display = tab==='entities'?'':'none';
  document.getElementById('healthView').style.display = tab==='health'?'':'none';
  document.getElementById('artifactsView').style.display = tab==='artifacts'?'':'none';
  document.getElementById('searchInput').placeholder = tab==='pages' ? 'Search pages...' : tab==='entities' ? 'Search entities...' : tab==='artifacts' ? 'Search artifacts...' : '';
  if (tab === 'artifacts') { renderArtifacts(); }
}

document.getElementById('browseTabs').addEventListener('click', function(e) {
  if (!e.target.classList.contains('tab')) return;
  document.querySelectorAll('#browseTabs .tab').forEach(t => t.classList.remove('active'));
  e.target.classList.add('active');
  showBrowseTab(e.target.dataset.btab);
});

