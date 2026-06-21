
async function loadData(source) {
  document.getElementById('loading').style.display = 'flex';
  document.getElementById('dashboard').style.display = 'none';
  document.getElementById('error').style.display = 'none';
  
  // Show connect prompt in loading state for new users
  var loadMsg = document.querySelector('#loading');
  if (loadMsg) loadMsg.innerHTML = '<div class="spinner"></div> Loading dashboard...<br><small style="font-size:0.7rem;margin-top:12px;color:var(--text-muted);cursor:pointer" onclick="openLoadDataModal()">⚡ <span style="color:var(--primary-light);text-decoration:underline">Connect to gbrain</span> or upload data</small>';
  
  // Helper: fetch with timeout
  async function fetchWithTimeout(url, opts, ms) {
    var controller = new AbortController();
    var timer = setTimeout(function() { controller.abort(); }, ms || 10000);
    try {
      var resp = await fetch(url, Object.assign({}, opts || {}, { signal: controller.signal }));
      clearTimeout(timer);
      return resp;
    } catch(e) {
      clearTimeout(timer);
      throw e;
    }
  }
  
  try {
    var data = null;

    // Priority 0: MCP connection (live, always wins)
    if (MCP_CONNECTED && MCP_URL && MCP_TOKEN) {
      data = await loadFromMCP();
    }

    // Priority 1: source argument
    if (!data && source) {
      if (typeof source === 'object') {
        data = source;
        localStorage.setItem('gbrain-custom-data', JSON.stringify(data));
      } else if (typeof source === 'string') {
        var res = await fetchWithTimeout(source, null, 8000);
        if (!res.ok) throw new Error('HTTP ' + res.status);
        data = await res.json();
        localStorage.setItem('gbrain-custom-data', JSON.stringify(data));
      }
    }

    // Priority 2: localStorage
    if (!data) {
      var cached = localStorage.getItem('gbrain-custom-data');
      if (cached) {
        try { data = JSON.parse(cached); } catch(e) {}
      }
    }

    // Priority 3: URL param
    if (!data) {
      var params = new URLSearchParams(window.location.search);
      var urlSource = params.get('source');
      if (urlSource) {
        var res2 = await fetchWithTimeout(urlSource, null, 8000);
        if (!res2.ok) throw new Error('HTTP ' + res2.status);
        data = await res2.json();
        localStorage.setItem('gbrain-custom-data', JSON.stringify(data));
      }
    }

    // Priority 4: default
    if (!data) {
      var res3 = await fetchWithTimeout('gbrain-data.json', null, 8000);
      if (!res3.ok) throw new Error('HTTP ' + res3.status);
      data = await res3.json();
    }

    DATA = data;
    updateDataSource();
    renderAll();
    document.getElementById('loading').style.display = 'none';
    document.getElementById('dashboard').style.display = 'block';
  } catch(e) {
    document.getElementById('loading').style.display = 'none';
    document.getElementById('error').style.display = 'block';
    document.getElementById('errorMsg').innerHTML = 'Failed to load: ' + e.message + '<br><br><button onclick="openLoadDataModal()" style="padding:8px 20px;background:var(--primary);border:none;border-radius:999px;color:#1a1b26;font-size:0.75rem;font-weight:600;cursor:pointer;margin-top:8px">⚡ Connect to gbrain</button>';
  }
}

function updateDataSource() {
  var badge = document.getElementById('dataSource');
  if (!badge) return;
  var pages = (DATA.pages || []).length;
  if (MCP_CONNECTED && DATA._mcpSource) {
    badge.textContent = '⚡ live MCP';
    badge.title = 'Connected to gbrain MCP at ' + MCP_URL + ' — click to change';
    badge.style.color = 'var(--primary-light)';
    badge.style.cursor = 'pointer';
  } else {
    badge.style.color = '';
    badge.style.cursor = 'pointer';
    var cached = localStorage.getItem('gbrain-custom-data');
    var fromUrl = DATA._loadedFromURL;
    if (pages === 0 && MCP_URL) {
      badge.textContent = '⚡ MCP (empty)';
      badge.title = 'Connected to gbrain but no pages found — click to reconfigure';
    } else if (pages === 0) {
      badge.textContent = '⚡ Connect';
      badge.title = 'Tap to connect gbrain or upload — click to connect gbrain or upload';
    } else if (fromUrl) {
      badge.textContent = '🔗 ' + pages + ' pages';
      badge.title = 'Loaded from: ' + fromUrl + ' — click to change';
    } else if (cached && pages > 0) {
      badge.textContent = '📤 ' + pages + ' pages';
      badge.title = 'Custom data in browser — click to change';
    } else {
      badge.textContent = '📄 ' + pages + ' pages';
      badge.title = 'Loaded from gbrain-data.json — click to change';
    }
  }
}

function openLoadDataModal() {
  var html = '<div class="m-section">' +
    '<div class="m-section-title">Connect to gbrain MCP</div>' +
    '<p style="font-size:0.75rem;color:var(--text-muted);margin:4px 0 12px">For gbrain users: connect directly to your running <code>gbrain serve --http</code> server. No JSON file needed — data loads live.</p>' +
    '<div style="margin-bottom:10px">' +
      '<label style="font-size:0.7rem;font-weight:600;display:block;margin-bottom:6px">MCP URL</label>' +
      '<input type="text" id="mcpUrl" placeholder="http://localhost:8787" value="' + (MCP_URL || '') + '" style="width:100%;padding:8px 10px;background:var(--surface2);border:1px solid var(--border);border-radius:8px;color:var(--text);font-size:0.75rem;font-family:JetBrains Mono,monospace">' +
    '</div>' +
    '<div style="margin-bottom:14px">' +
      '<label style="font-size:0.7rem;font-weight:600;display:block;margin-bottom:6px">Token (optional for auto-DCR)</label>' +
      '<input type="password" id="mcpToken" placeholder="leave empty for auto-DCR" value="' + (MCP_TOKEN || '') + '" style="width:100%;padding:8px 10px;background:var(--surface2);border:1px solid var(--border);border-radius:8px;color:var(--text);font-size:0.75rem;font-family:JetBrains Mono,monospace">' +
    '</div>' +
    '<div style="margin-bottom:14px;display:flex;gap:6px">' +
      '<button onclick="connectToMCP()" style="flex:1;padding:8px 16px;background:var(--primary-light);border:none;border-radius:8px;color:#020617;font-size:0.75rem;font-weight:600;cursor:pointer">⚡ Connect to gbrain</button>' +
      (MCP_CONNECTED ? '<button onclick="disconnectMCP()" style="padding:8px 16px;background:var(--rose);border:none;border-radius:8px;color:#fff;font-size:0.75rem;font-weight:600;cursor:pointer">Disconnect</button>' : '') +
    '</div>' +
    (MCP_CONNECTED ? '<div style="font-size:0.68rem;color:var(--green);margin-bottom:12px">✓ Connected to gbrain MCP — data loads live on refresh</div>' : '') +

    '<hr style="border:none;border-top:1px solid var(--border);margin:14px 0">' +

    '<div class="m-section-title" style="margin-top:0">Or load a JSON file</div>' +
    '<p style="font-size:0.75rem;color:var(--text-muted);margin:4px 0 12px">If you don\'t run gbrain, upload a pre-built <code>gbrain-data.json</code> file.</p>' +
    '<div style="margin-bottom:10px">' +
      '<label style="font-size:0.7rem;font-weight:600;display:block;margin-bottom:6px">Upload file</label>' +
      '<input type="file" accept=".json" id="fileInput" onchange="handleFileUpload(event)" style="width:100%;padding:8px;background:var(--surface2);border:1px dashed var(--border);border-radius:8px;color:var(--text-muted);font-size:0.75rem;cursor:pointer">' +
    '</div>' +
    '<div style="margin-bottom:14px">' +
      '<label style="font-size:0.7rem;font-weight:600;display:block;margin-bottom:6px">Load from URL</label>' +
      '<div style="display:flex;gap:6px">' +
        '<input type="text" id="urlInput" placeholder="https://example.com/gbrain-data.json" style="flex:1;padding:8px 10px;background:var(--surface2);border:1px solid var(--border);border-radius:8px;color:var(--text);font-size:0.75rem;font-family:JetBrains Mono,monospace">' +
        '<button onclick="loadFromUrl()" style="padding:8px 16px;background:var(--primary);border:none;border-radius:8px;color:#fff;font-size:0.75rem;font-weight:600;cursor:pointer">Load</button>' +
      '</div>' +
    '</div>' +
    '<hr style="border:none;border-top:1px solid var(--border);margin:14px 0">' +
    '<div style="display:flex;gap:8px;flex-wrap:wrap">' +
      '<button onclick="clearAllData()" style="padding:8px 16px;background:var(--surface2);border:1px solid var(--border);border-radius:8px;color:var(--text);font-size:0.75rem;cursor:pointer">Reset everything</button>' +
      '<button onclick="closeModal()" style="padding:8px 16px;background:var(--surface2);border:1px solid var(--border);border-radius:8px;color:var(--text-muted);font-size:0.75rem;cursor:pointer">Close</button>' +
    '</div>' +
  '</div>';
  openModal('⚙️ Data Source', 'Connect to gbrain or load a JSON file', html);
}

function connectToMCP() {
  var url = document.getElementById('mcpUrl').value.trim();
  var token = document.getElementById('mcpToken').value.trim();
  if (!url) {
    document.getElementById('errorMsg').textContent = 'MCP URL is required';
    document.getElementById('error').style.display = 'block';
    return;
  }
  // Normalize URL: strip /mcp suffix, store base URL
  var baseUrl = url.replace(/\/mcp\/?$/, '').replace(/\/$/, '');
  var mcpUrl = baseUrl + '/mcp';
  
  closeModal();
  document.getElementById('loading').style.display = 'flex';
  document.getElementById('error').style.display = 'none';
  
  // If user provided a token, try it directly first
  if (token) {
    MCP_URL = mcpUrl;
    MCP_TOKEN = token;
    localStorage.setItem('gbrain-mcp-url', mcpUrl);
    localStorage.setItem('gbrain-mcp-token', token);
    loadData();
    return;
  }
  
  // No token provided — try auto-DCR
  autoDCR(baseUrl).then(function(accessToken) {
    MCP_URL = mcpUrl;
    MCP_TOKEN = accessToken;
    localStorage.setItem('gbrain-mcp-url', mcpUrl);
    localStorage.setItem('gbrain-mcp-token', accessToken);
    loadData();
  }).catch(function(err) {
    document.getElementById('loading').style.display = 'none';
    document.getElementById('errorMsg').textContent = 'Auto-connect failed: ' + err.message + '. Enter a token manually or ensure gbrain serve has --enable-dcr.';
    document.getElementById('error').style.display = 'block';
  });
}

function disconnectMCP() {
  MCP_URL = null;
  MCP_TOKEN = null;
  MCP_CONNECTED = false;
  localStorage.removeItem('gbrain-mcp-url');
  localStorage.removeItem('gbrain-mcp-token');
  loadData();
}

function handleFileUpload(event) {
  var file = event.target.files[0];
  if (!file) return;
  var reader = new FileReader();
  reader.onload = function(e) {
    try {
      var data = JSON.parse(e.target.result);
      closeModal();
      MCP_CONNECTED = false; // File upload overrides MCP
      loadData(data);
    } catch(err) {
      document.getElementById('errorMsg').textContent = 'Invalid JSON: ' + err.message;
      document.getElementById('error').style.display = 'block';
    }
  };
  reader.readAsText(file);
}

function loadFromUrl() {
  var url = document.getElementById('urlInput').value.trim();
  if (!url) return;
  DATA._loadedFromURL = url;
  closeModal();
  MCP_CONNECTED = false;
  loadData(url);
}

function clearAllData() {
  localStorage.removeItem('gbrain-custom-data');
  localStorage.removeItem('gbrain-mcp-url');
  localStorage.removeItem('gbrain-mcp-token');
  MCP_URL = null;
  MCP_TOKEN = null;
  MCP_CONNECTED = false;
  closeModal();
  loadData();
}

// Restore MCP connection from localStorage on page load
(function() {
  var savedUrl = localStorage.getItem('gbrain-mcp-url');
  var savedToken = localStorage.getItem('gbrain-mcp-token');
  if (savedUrl && savedToken) {
    MCP_URL = savedUrl;
    MCP_TOKEN = savedToken;
    // Don't connect yet — loadData() will handle it
  }
})();

function renderAll() {
  renderStats();
  renderDigest();
  renderFeed();
  // Only render Today view on load (mobile-first)
  // Graph, pages, entities, health render lazily when their views open
  showView('today');
  document.getElementById('lastUpdated').textContent = 'Updated: ' + (DATA.updated_at || 'unknown');
  document.querySelectorAll('#feedSourceTabs .feed-source-tab').forEach(t => {
    t.onclick = function(){ filterFeed(this.getAttribute('data-src')); };
  });
  // Init the unified assistant after render
  if (typeof initAssistant === 'function') initAssistant();
}
