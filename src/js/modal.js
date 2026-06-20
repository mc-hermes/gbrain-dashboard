// ─── MODALS ───
function openPageModal(slug) {
  const page = (DATA.pages||[]).find(p => p.slug === slug);
  if (!page) {
    // API fallback: when a page isn't in the static JSON, fetch it live from the API
    var apiBase = localStorage.getItem('gbrain-read-api') || '';
    var title = slug.split('/').pop().replace(/-/g, ' ').replace(/_/g, ' ');
    openModal('[loading…]', slug, '<div style="padding:20px;text-align:center;color:var(--muted)">Fetching page…</div>');
    fetch(apiBase + '/api/pages/' + encodeURIComponent(slug))
      .then(function(r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
      .then(function(data) {
        if (!data || !data.body) { closeModal(); return; }
        var raw = data.body;
        var fm = {}, bodyStart = 0;
        if (raw.indexOf('---') === 0) {
          var end = raw.indexOf('---', 4);
          if (end > 0) {
            raw.substring(4, end).split('\n').forEach(function(line) {
              var m = line.match(/^(\w[\w-]*):\s*(.*)/);
              if (m) fm[m[1]] = m[2].trim();
            });
            bodyStart = end + 4;
          }
        }
        var cleanBody = raw.substring(bodyStart).trim()
          .replace(/^###?\s+/gm, '◆ ')
          .replace(/^##\s+/gm, '◆◆ ')
          .replace(/^#\s+/gm, '◆◆◆ ')
          .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
          .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" style="color:var(--primary-light)">$1</a>');
        var html2 = '';
        if (fm.type) html2 += '<div class="m-section"><div class="m-section-title">Type</div><span class="type-tag ' + esc(fm.type) + '">' + esc(fm.type) + '</span></div>';
        if (cleanBody) html2 += '<div class="m-section"><div class="m-section-title">Content</div><div class="m-content">' + cleanBody + '</div></div>';
        html2 += '<div class="m-section" style="margin-top:16px;padding-top:12px;border-top:1px solid var(--border)"><span style="font-size:0.7rem;color:var(--muted)">⚡ loaded via API fallback</span></div>';
        openModal(fm.title || title, slug, html2);
      })
      .catch(function() { closeModal(); });
    return;
  }
  DATA._lastViewedSlug = slug;
  let html = '';

  // LinkedIn CRM section for person pages
  if (page.type === 'person') {
    var tierHtml = renderTierBadge(page.tags);
    var healthHtml = renderHealthIndicator(page);
    var lastContact = getLastContactDate(page);
    if (tierHtml || healthHtml || lastContact) {
      html += '<div class="m-section"><div class="m-section-title">Relationship</div><div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap">';
      if (tierHtml) html += tierHtml;
      if (healthHtml) html += healthHtml;
      if (lastContact) html += '<span class="last-contact">Last: ' + esc(lastContact) + '</span>';
      html += '</div></div>';
    }
  }

  // Tags with remove buttons
  if ((page.tags||[]).length) {
    html += '<div class="m-section"><div class="m-section-title">Tags</div><div class="m-tags" style="display:flex;flex-wrap:wrap;gap:6px;align-items:center">';
    page.tags.forEach(function(t) {
      html += '<span class="tag-pill">' + esc(t) + '<span class="tag-x" onclick="event.stopPropagation();removeTag(\'' + escAttr(slug) + '\',\'' + escAttr(t) + '\')" title="Remove tag">×</span></span>';
    });
    html += '<input type="text" class="tag-add-input" id="modalTagInput" placeholder="+ tag" onkeydown="if(event.key===\'Enter\'){addTagToPage(\'' + escAttr(slug) + '\',this.value);this.value=\'\';}" style="width:80px;margin-left:4px">';
    html += '</div></div>';
  } else {
    html += '<div class="m-section"><div class="m-section-title">Tags</div><div class="m-tags" style="display:flex;flex-wrap:wrap;gap:6px;align-items:center">';
    html += '<input type="text" class="tag-add-input" id="modalTagInput" placeholder="+ tag" onkeydown="if(event.key===\'Enter\'){addTagToPage(\'' + escAttr(slug) + '\',this.value);this.value=\'\';}" style="width:80px">';
    html += '</div></div>';
  }
  if (page.type === 'person' || page.type === 'company') {
    const fields = [];
    if (page.email) fields.push({l:'Email',v:`<a href="mailto:${escAttr(page.email)}">${esc(page.email)}</a>`});
    if (page.phone) fields.push({l:'Phone',v:esc(page.phone)});
    if (page.company_name) fields.push({l:'Company',v:esc(page.company_name)});
    if (page.website) fields.push({l:'Website',v:`<a href="https://${escAttr(page.website)}" target="_blank">${esc(page.website)}</a>`});
    if (page.location) fields.push({l:'Location',v:esc(page.location)});
    if (page.relationship) fields.push({l:'Relationship',v:esc(page.relationship)});
    if (fields.length) {
      html += `<div class="m-section"><div class="m-section-title">Details</div>
        <div class="m-entity-fields">${fields.map(f=>`<div class="m-field"><div class="f-label">${f.l}</div><div class="f-value">${f.v}</div></div>`).join('')}</div></div>`;
    }
  }
  const body = (page.body||'').trim();
  if (body) {
    const cleanBody = body
      .replace(/^###?\s+/gm, '◆ ')
      .replace(/^##\s+/gm, '◆◆ ')
      .replace(/^#\s+/gm, '◆◆◆ ')
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<span style="color:var(--primary-light);cursor:pointer" onclick="event.stopPropagation();navigateTo(\'$2\')">$1</span>');
    html += `<div class="m-section"><div class="m-section-title">Content</div>
      <div class="m-content">${cleanBody}</div></div>`;
  }
  if ((page.links_out||[]).length) {
    html += `<div class="m-section"><div class="m-section-title">Links Out (${page.links_out.length})</div><div class="m-links">${
      page.links_out.map(l => `<div class="m-link" onclick="event.stopPropagation();openPageModal('${escAttr(l.to)}')">
        <span class="dir">→</span><span>${esc(l.text || l.to)}</span><span class="ltype">${esc(l.type)}</span>
      </div>`).join('')}</div></div>`;
  }
  if ((page.backlinks||[]).length) {
    html += `<div class="m-section"><div class="m-section-title">Backlinks (${page.backlinks.length} pages link here)</div><div class="m-links">${
      page.backlinks.map(l => `<div class="m-link" onclick="event.stopPropagation();openPageModal('${escAttr(l.from)}')">
        <span class="dir">←</span><span>${esc(l.from)}</span><span class="ltype">${esc(l.type)}</span>
      </div>`).join('')}</div></div>`;
  }
  // Action buttons
  html += '<div class="modal-actions"><button class="btn-save" onclick="openEditModal(\'' + escAttr(slug) + '\')">✏ Edit</button><button class="btn-delete" onclick="deletePage(\'' + escAttr(slug) + '\')">Delete</button></div>';

  openModal(page.title, page.slug, html);
}

function openCheckModal(name) {
  const check = (DATA.doctor?.checks||[]).find(c => c.name === name);
  if (!check) return;
  let dotCls = check.status === 'warn' || check.status === 'warning' ? 'warn' : check.status === 'error' || check.status === 'fail' ? 'error' : 'ok';
  let html = `<div class="m-section">
    <div class="m-section-title">Status</div>
    <div style="display:flex;align-items:center;gap:8px">
      <div class="health-dot ${dotCls}" style="margin:0"></div>
      <span style="font-size:0.8rem;font-weight:600">${esc(check.status)}</span>
      <span class="type-tag concept">${esc(check.category||'unknown')}</span>
    </div>
  </div>
  <div class="m-section">
    <div class="m-section-title">Message</div>
    <div class="m-content">${esc(check.message||'No details available')}</div>
  </div>`;
  openModal(check.name, `health check · ${check.category||''}`, html);
}

function openModal(title, subtitle, bodyHtml) {
  document.getElementById('modal').innerHTML = `
    <div class="modal-header">
      <div>
        <div class="m-title">${esc(title)}</div>
        ${subtitle ? `<div class="m-slug">${esc(subtitle)}</div>` : ''}
      </div>
      <button class="modal-close" onclick="closeModal()">✕</button>
    </div>
    <div class="modal-body">${bodyHtml}</div>`;
  document.getElementById('modalOverlay').classList.add('active');
  document.body.classList.add('modal-open');
}
function closeModal() {
  document.getElementById('modalOverlay').classList.remove('active');
  document.body.classList.remove('modal-open');
}
function navigateTo(slug) {
  slug = slug.replace(/^(people|companies|concepts|meetings|architecture|reference|brand)\//,'');
  const page = (DATA.pages||[]).find(p => p.slug === slug || p.slug.endsWith('/'+slug));
  if (page) { closeModal(); setTimeout(() => openPageModal(page.slug), 100); }
}

