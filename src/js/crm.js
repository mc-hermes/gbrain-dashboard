// ─── LINKEDIN CRM: TIER & HEALTH ───
function getTier(tags) {
  if (!tags) return null;
  for (var i = 0; i < tags.length; i++) {
    var m = tags[i].match(/^tier-([1-4])$/i);
    if (m) return parseInt(m[1]);
  }
  return null;
}

function getRelationshipHealth(page) {
  if (!page || page.type !== 'person') return 'unknown';
  // Check for last-contact in body
  var body = page.body || '';
  var lcMatch = body.match(/Last contact:?\s*(.+)/i);
  if (!lcMatch) {
    // Check tags for recency indicators
    var tags = page.tags || [];
    if (tags.indexOf('active') !== -1 || tags.indexOf('recent') !== -1) return 'hot';
    if (tags.indexOf('dormant') !== -1 || tags.indexOf('cold') !== -1) return 'cold';
    return 'unknown';
  }
  var lcStr = lcMatch[1].trim();
  // Parse date-like parts
  var dateMatch = lcStr.match(/(\w+ \d+,? \d{4})|(\d{4}-\d{2}-\d{2})|(\w+ \d{4})/);
  if (!dateMatch) return 'warm';
  try {
    var d = new Date(dateMatch[0]);
    if (isNaN(d.getTime())) return 'warm';
    var days = Math.floor((Date.now() - d.getTime()) / 86400000);
    if (days <= 7) return 'hot';
    if (days <= 30) return 'warm';
    return 'cold';
  } catch(e) {
    return 'warm';
  }
}

function renderTierBadge(tags) {
  var tier = getTier(tags);
  if (!tier) return '';
  return '<span class="tier-badge tier-' + tier + '"><span class="tier-dot"></span>T' + tier + '</span>';
}

function renderHealthIndicator(page) {
  if (page.type !== 'person') return '';
  var health = getRelationshipHealth(page);
  var labels = {hot:'Active', warm:'Warm', cold:'Dormant', unknown:''};
  var label = labels[health] || '';
  return '<span class="health-indicator"><span class="hi-dot ' + health + '"></span>' + (label ? esc(label) : '') + '</span>';
}

// Extract last contact date from page body
function getLastContactDate(page) {
  if (!page || page.type !== 'person') return '';
  var body = page.body || '';
  var m = body.match(/Last contact:?\s*(.+)/i);
  return m ? m[1].trim().replace(/\n.*/, '').substring(0, 20) : '';
}

