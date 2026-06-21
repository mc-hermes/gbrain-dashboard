// ─── MCP CLIENT ─────────────────────────────────────────────────────────
var MCP_URL = null;
var MCP_TOKEN = null;
var MCP_CONNECTED = false;

function mcpCall(method, args) {
  return fetch(MCP_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json, text/event-stream',
      'Authorization': 'Bearer ' + MCP_TOKEN
    },
    body: JSON.stringify({
      jsonrpc: '2.0',
      method: 'tools/call',
      params: { name: method, arguments: args || {} },
      id: Date.now()
    })
  }).then(function(r) {
    if (!r.ok) throw new Error('MCP HTTP ' + r.status);
    return r.text();
  }).then(function(text) {
    // Parse SSE or JSON response
    var d;
    try { d = JSON.parse(text); } catch(e) {
      var lines = text.split('\n');
      for (var i = 0; i < lines.length; i++) {
        if (lines[i].indexOf('data: ') === 0) {
          try { d = JSON.parse(lines[i].substring(6)); break; } catch(e2) {}
        }
      }
    }
    if (!d) throw new Error('Failed to parse MCP response');
    if (d.error) throw new Error(d.error.message || 'MCP error');
    var content = d.result && d.result.content;
    if (content && content[0] && content[0].text) {
      try { return JSON.parse(content[0].text); }
      catch(e) { return content[0].text; }
    }
    return d.result;
  });
}

async function mcpInit(url, token) {
  MCP_URL = url;
  MCP_TOKEN = token;
  // Initialize MCP session
  var r = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Accept': 'application/json, text/event-stream', 'Authorization': 'Bearer ' + token },
    body: JSON.stringify({
      jsonrpc: '2.0',
      method: 'initialize',
      params: {
        protocolVersion: '2024-11-05',
        capabilities: {},
        clientInfo: { name: 'gbrain-dashboard', version: '1.0.0' }
      },
      id: 1
    })
  });
  var text = await r.text();
  var d;
  try { d = JSON.parse(text); } catch(e) {
    var lines = text.split('\n');
    for (var i = 0; i < lines.length; i++) {
      if (lines[i].indexOf('data: ') === 0) {
        try { d = JSON.parse(lines[i].substring(6)); break; } catch(e2) {}
      }
    }
  }
  if (!d) throw new Error('Failed to parse init response');
  if (d.error) throw new Error('Init failed: ' + (d.error.message || JSON.stringify(d.error)));
  // Send initialized notification
  await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Accept': 'application/json, text/event-stream', 'Authorization': 'Bearer ' + token },
    body: JSON.stringify({ jsonrpc: '2.0', method: 'notifications/initialized' })
  });
  MCP_CONNECTED = true;
  return d.result;
}

async function loadFromMCP() {
  if (!MCP_URL || !MCP_TOKEN) throw new Error('MCP not configured');

  // Initialize MCP session if not yet connected this page load
  if (!MCP_CONNECTED) {
    try { await mcpInit(MCP_URL, MCP_TOKEN); } catch(e) {
      // Init failed — maybe the session is still alive, try anyway
    }
  }

  // 1. Get all pages
  var pagesResult = await mcpCall('list_pages', { limit: 500 });
  var rawPages = pagesResult.pages || pagesResult || [];
  var pages = rawPages.map(function(p) {
    return {
      slug: p.slug || '',
      title: p.title || '',
      type: p.type || 'concept',
      body: p.body || '',
      tags: p.tags || [],
      links_out: (p.links_out || []).map(function(l) {
        return { to: l.to_slug || l.to || '', type: l.link_type || 'link', text: l.context || '' };
      }),
      backlinks: [],
      outbound_count: (p.links_out || []).length,
      inbound_count: p.backlink_count || 0
    };
  });

  // 2. Get stats
  var stats = await mcpCall('get_stats', {});

  // 3. Get doctor report
  var doctor;
  try { doctor = await mcpCall('run_doctor', {}); } catch(e) { doctor = null; }

  // 4. Build graph_links from per-page get_links (batched in groups of 10)
  var graphLinks = [];
  var seenLinks = {};
  for (var i = 0; i < pages.length; i += 10) {
    var batch = pages.slice(i, i + 10);
    var results = await Promise.all(batch.map(function(p) {
      return mcpCall('get_links', { slug: p.slug }).catch(function() { return { links: [] }; });
    }));
    results.forEach(function(r) {
      (r.links || []).forEach(function(l) {
        var key = (l.from_slug || '') + '→' + (l.to_slug || '');
        if (!seenLinks[key]) {
          seenLinks[key] = true;
          graphLinks.push({
            source: l.from_slug || '',
            target: l.to_slug || '',
            type: l.link_type || 'link'
          });
        }
      });
    });
  }

  // 5. Build entities
  var people = [], companies = [];
  pages.forEach(function(p) {
    if (p.type === 'person') people.push(p.slug);
    if (p.type === 'company') companies.push(p.slug);
  });

  // 6. Build doctor checks
  var checks = [];
  if (doctor && doctor.checks) {
    checks = doctor.checks.map(function(c) {
      return {
        name: c.name || c.check || '',
        status: c.status || c.result || 'unknown',
        category: c.category || '',
        message: c.message || c.detail || ''
      };
    });
  }

  // 7. Assemble
  return {
    updated_at: new Date().toISOString(),
    summary: {
      page_count: pages.length,
      concept_count: 0,
      person_count: people.length,
      company_count: companies.length,
      meeting_count: 0,
      newsletter_count: 0,
      article_count: 0,
      bookmark_count: 0,
      digest_count: 0,
      dataset_count: 0,
      total_links: graphLinks.length,
      inbound_count: 0,
      outbound_count: graphLinks.length,
      graph_coverage: graphLinks.length ? Math.round(graphLinks.length / pages.length * 100) + '% of pages have graph links' : '0%',
      embed_coverage: (stats && stats.embed_coverage) || '—',
      entity_links: '—',
      score: (stats && stats.brain_score) ? String(stats.brain_score) : '—',
      score_label: '/100',
      score_breakdown: (stats && stats.score_breakdown) || 'Live MCP data',
      artifact_count: 0,
      checks_passed: checks.filter(function(c) { return c.status === 'pass'; }).length,
      checks_warned: checks.filter(function(c) { return c.status === 'warn'; }).length,
      checks_failed: checks.filter(function(c) { return c.status === 'fail'; }).length
    },
    pages: pages,
    graph_links: graphLinks,
    entities: { people: people, companies: companies },
    doctor: { summary: (doctor && doctor.summary) || 'MCP health report', checks: checks },
    artifacts: [],
    _mcpSource: true
  };
}
// Auto-DCR: Register OAuth client and get access token
async function autoDCR(baseUrl) {
  // Step 1: Register client via DCR
  var regResp = await fetch(baseUrl + '/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_name: 'gbrain-dashboard',
      grant_types: ['client_credentials'],
      redirect_uris: [window.location.origin + '/callback'],
      scope: 'admin',
      token_endpoint_auth_method: 'client_secret_post'
    })
  });
  if (!regResp.ok) {
    var errText = await regResp.text();
    throw new Error('DCR register failed (HTTP ' + regResp.status + '): ' + errText.substring(0, 100));
  }
  var regData = await regResp.json();
  if (!regData.client_id || !regData.client_secret) {
    throw new Error('DCR response missing client credentials');
  }
  
  // Step 2: Exchange for access token
  var tokResp = await fetch(baseUrl + '/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: 'grant_type=client_credentials&client_id=' + encodeURIComponent(regData.client_id) +
          '&client_secret=' + encodeURIComponent(regData.client_secret) +
          '&scope=admin'
  });
  if (!tokResp.ok) {
    var tokErr = await tokResp.text();
    throw new Error('Token exchange failed (HTTP ' + tokResp.status + '): ' + tokErr.substring(0, 100));
  }
  var tokData = await tokResp.json();
  if (!tokData.access_token) {
    throw new Error('Token response missing access_token');
  }
  
  return tokData.access_token;
}

