// ─── CRUD: EDIT MODE ───
var _editSlug = null;
var _editTags = [];

function openEditModal(slug) {
  const page = (DATA.pages||[]).find(p => p.slug === slug);
  if (!page) return;
  _editSlug = slug;
  _editTags = (page.tags||[]).slice();

  var html = '<div class="m-edit-field"><label>Title</label><input type="text" id="editTitle" value="' + escAttr(page.title || '') + '"></div>';
  html += '<div class="m-edit-field"><label>Content (Markdown)</label><textarea id="editBody">' + esc(page.body || '') + '</textarea></div>';

  if (page.type === 'person' || page.type === 'company') {
    html += '<div class="m-section-title" style="margin-top:12px">Details</div><div class="m-entity-fields">';
    var fields = [
      {id:'editEmail', label:'Email', val:page.email||''},
      {id:'editPhone', label:'Phone', val:page.phone||''},
      {id:'editCompany', label:'Company', val:page.company_name||''},
      {id:'editWebsite', label:'Website', val:page.website||''},
      {id:'editLocation', label:'Location', val:page.location||''},
      {id:'editRelationship', label:'Relationship', val:page.relationship||''}
    ];
    fields.forEach(function(f) {
      html += '<div class="m-edit-field"><label>' + esc(f.label) + '</label><input type="text" id="' + f.id + '" value="' + escAttr(f.val) + '"></div>';
    });
    html += '</div>';
  }

  html += '<div class="m-edit-field"><label>Tags</label><div class="m-edit-tags" id="editTagList">' + renderEditTags() + '</div></div>';
  html += '<div class="modal-actions"><button class="btn-save" onclick="saveEdit()">Save Changes</button><button class="btn-cancel" onclick="cancelEdit()">Cancel</button></div>';

  openModal('Edit: ' + (page.title || page.slug), page.slug, html);
  setTimeout(function() {
    var titleEl = document.getElementById('editTitle');
    if (titleEl) titleEl.focus();
  }, 200);
}

function renderEditTags() {
  var html = '';
  _editTags.forEach(function(t, i) {
    html += '<span class="tag-pill">' + esc(t) + '<span class="tag-x" onclick="removeEditTag(' + i + ')">×</span></span>';
  });
  html += '<input type="text" class="tag-add-input" id="tagAddInput" placeholder="+ tag" onkeydown="if(event.key===\'Enter\')addEditTag()" onblur="addEditTag()">';
  return html;
}

function addEditTag() {
  var input = document.getElementById('tagAddInput');
  if (!input) return;
  var tag = input.value.trim();
  if (!tag) return;
  if (_editTags.indexOf(tag) === -1) {
    _editTags.push(tag);
    var list = document.getElementById('editTagList');
    if (list) list.innerHTML = renderEditTags();
  }
  input.value = '';
  setTimeout(function() {
    var inp = document.getElementById('tagAddInput');
    if (inp) inp.focus();
  }, 50);
}

function removeEditTag(idx) {
  _editTags.splice(idx, 1);
  var list = document.getElementById('editTagList');
  if (list) list.innerHTML = renderEditTags();
}

function cancelEdit() {
  _editSlug = null;
  _editTags = [];
  if (DATA._lastViewedSlug) {
    closeModal();
    setTimeout(function() { openPageModal(DATA._lastViewedSlug); }, 100);
  } else {
    closeModal();
  }
}

async function saveEdit() {
  var title = document.getElementById('editTitle').value.trim();
  var body = document.getElementById('editBody').value.trim();
  var slug = _editSlug;
  if (!slug) return;

  var putArgs = { slug: slug, title: title || slug, body: body, tags: _editTags };

  // Collect entity fields
  if (document.getElementById('editEmail')) {
    var entityFields = {};
    var fids = ['editEmail','editPhone','editCompany','editWebsite','editLocation','editRelationship'];
    var fkeys = ['email','phone','company_name','website','location','relationship'];
    fids.forEach(function(fid, i) {
      var el = document.getElementById(fid);
      if (el && el.value.trim()) entityFields[fkeys[i]] = el.value.trim();
    });
    putArgs.entity_fields = entityFields;
  }

  // Try MCP first
  if (MCP_CONNECTED && MCP_URL) {
    try {
      await mcpCall('put_page', putArgs);
      // Refresh local DATA
      var page = (DATA.pages||[]).find(function(p) { return p.slug === slug; });
      if (page) {
        page.title = title || page.title;
        page.body = body;
        page.tags = _editTags;
        if (putArgs.entity_fields) {
          Object.keys(putArgs.entity_fields).forEach(function(k) {
            page[k] = putArgs.entity_fields[k];
          });
        }
      }
      _editSlug = null; _editTags = [];
      closeModal();
      setTimeout(function() { openPageModal(slug); }, 150);
      return;
    } catch(e) {
      console.warn('MCP save failed, trying API fallback:', e.message);
    }
  }

  // API fallback
  var API_BASE = localStorage.getItem('gbrain-write-api') || '';
  try {
    var r = await fetch(API_BASE + '/api/pages/' + encodeURIComponent(slug), {
      method: 'PUT',
      headers: {'Content-Type': 'application/json', 'Authorization': 'Bearer ' + (WRITE_TOKEN || '')},
      body: JSON.stringify(putArgs)
    });
    if (!r.ok) throw new Error('HTTP ' + r.status);
    // Update local data
    var page = (DATA.pages||[]).find(function(p) { return p.slug === slug; });
    if (page) {
      page.title = title || page.title;
      page.body = body;
      page.tags = _editTags;
      if (putArgs.entity_fields) {
        Object.keys(putArgs.entity_fields).forEach(function(k) { page[k] = putArgs.entity_fields[k]; });
      }
    }
  } catch(e) {
    // Offline edit: update local DATA and persist to localStorage
    var page2 = (DATA.pages||[]).find(function(p) { return p.slug === slug; });
    if (page2) {
      page2.title = title || page2.title;
      page2.body = body;
      page2.tags = _editTags;
      if (putArgs.entity_fields) {
        Object.keys(putArgs.entity_fields).forEach(function(k) { page2[k] = putArgs.entity_fields[k]; });
      }
    }
    // Persist modified DATA to localStorage so edits survive refresh
    try { localStorage.setItem('gbrain-custom-data', JSON.stringify(DATA)); } catch(e2) {}
  }

  _editSlug = null; _editTags = [];
  closeModal();
  setTimeout(function() { openPageModal(slug); }, 150);
  reRenderAll();
}

// ─── CRUD: DELETE ───
var _deleteSlug = null;

function deletePage(slug) {
  _deleteSlug = slug;
  document.getElementById('delSlug').textContent = slug;
  document.getElementById('deleteOverlay').classList.add('active');
}

function closeDeleteConfirm() {
  _deleteSlug = null;
  document.getElementById('deleteOverlay').classList.remove('active');
}

async function confirmDelete() {
  var slug = _deleteSlug;
  if (!slug) return;
  document.getElementById('delConfirmBtn').disabled = true;
  document.getElementById('delConfirmBtn').textContent = 'Deleting…';

  var success = false;

  // Try MCP
  if (MCP_CONNECTED && MCP_URL) {
    try {
      await mcpCall('delete_page', { slug: slug });
      success = true;
    } catch(e) {
      console.warn('MCP delete failed:', e.message);
    }
  }

  // API fallback
  if (!success) {
    var API_BASE = localStorage.getItem('gbrain-write-api') || '';
    try {
      var r = await fetch(API_BASE + '/api/pages/' + encodeURIComponent(slug), {
        method: 'DELETE',
        headers: {'Authorization': 'Bearer ' + (WRITE_TOKEN || '')}
      });
      if (r.ok) success = true;
    } catch(e) {}
  }

  // Always update local DATA (offline-friendly) and persist
  if (DATA.pages) {
    DATA.pages = DATA.pages.filter(function(p) { return p.slug !== slug; });
    DATA.summary.page_count = DATA.pages.length;
    DATA.summary.person_count = DATA.pages.filter(function(p){return p.type==='person'}).length;
    DATA.summary.company_count = DATA.pages.filter(function(p){return p.type==='company'}).length;
    DATA.summary.meeting_count = DATA.pages.filter(function(p){return p.type==='meeting'}).length;
    DATA.summary.concept_count = DATA.pages.filter(function(p){return p.type==='concept'}).length;
  }
  // Persist to localStorage so deletes survive refresh
  try { localStorage.setItem('gbrain-custom-data', JSON.stringify(DATA)); } catch(e2) {}

  closeDeleteConfirm();
  closeModal();
  reRenderAll();
}

// ─── CRUD: TAG MANAGEMENT ───
function removeTag(slug, tag) {
  var page = (DATA.pages||[]).find(function(p) { return p.slug === slug; });
  if (!page || !page.tags) return;
  page.tags = page.tags.filter(function(t) { return t !== tag; });

  if (MCP_CONNECTED && MCP_URL) {
    try { mcpCall('remove_tag', { slug: slug, tag: tag }); } catch(e) {}
  }
  // Persist tag changes to localStorage
  try { localStorage.setItem('gbrain-custom-data', JSON.stringify(DATA)); } catch(e2) {}
  reRenderAll();
  closeModal();
  setTimeout(function() { openPageModal(slug); }, 100);
}

function addTagToPage(slug, tag) {
  if (!tag) return;
  var page = (DATA.pages||[]).find(function(p) { return p.slug === slug; });
  if (!page) return;
  if (!page.tags) page.tags = [];
  if (page.tags.indexOf(tag) !== -1) return;
  page.tags.push(tag);

  if (MCP_CONNECTED && MCP_URL) {
    try { mcpCall('add_tag', { slug: slug, tag: tag }); } catch(e) {}
  }
  // Persist tag changes to localStorage
  try { localStorage.setItem('gbrain-custom-data', JSON.stringify(DATA)); } catch(e2) {}
  reRenderAll();
  closeModal();
  setTimeout(function() { openPageModal(slug); }, 100);
}

// ─── BULK OPERATIONS ───
var _bulkSelected = [];

function toggleBulkSelect(slug, checked) {
  if (checked) {
    if (_bulkSelected.indexOf(slug) === -1) _bulkSelected.push(slug);
  } else {
    _bulkSelected = _bulkSelected.filter(function(s) { return s !== slug; });
  }
  updateBulkBar();
}

function selectAllPages(checked) {
  var checkboxes = document.querySelectorAll('.bulk-checkbox');
  _bulkSelected = [];
  checkboxes.forEach(function(cb) {
    cb.checked = checked;
    if (checked) _bulkSelected.push(cb.getAttribute('data-slug'));
  });
  updateBulkBar();
}

function updateBulkBar() {
  var bar = document.getElementById('bulkBar');
  var count = document.getElementById('bulkCount');
  count.textContent = _bulkSelected.length + ' selected';
  if (_bulkSelected.length > 0) {
    bar.classList.add('active');
  } else {
    bar.classList.remove('active');
  }
}

function clearBulkSelect() {
  _bulkSelected = [];
  document.querySelectorAll('.bulk-checkbox').forEach(function(cb) { cb.checked = false; });
  var selectAll = document.getElementById('bulkSelectAll');
  if (selectAll) selectAll.checked = false;
  updateBulkBar();
}

function bulkAddTag() {
  var tag = prompt('Tag to add to ' + _bulkSelected.length + ' pages:');
  if (!tag || !tag.trim()) return;
  tag = tag.trim();
  _bulkSelected.forEach(function(slug) {
    var page = (DATA.pages||[]).find(function(p) { return p.slug === slug; });
    if (page) {
      if (!page.tags) page.tags = [];
      if (page.tags.indexOf(tag) === -1) page.tags.push(tag);
    }
  });
  if (MCP_CONNECTED && MCP_URL) {
    _bulkSelected.forEach(function(slug) {
      try { mcpCall('add_tag', { slug: slug, tag: tag }); } catch(e) {}
    });
  }
  clearBulkSelect();
  reRenderAll();
  showView('browse');
  showBrowseTab('pages');
}

