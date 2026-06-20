// ─── LOGS VIEW (live workflow activity) ───
var _logEvents = [];
var _logFilter = 'all';
var _logPollTimer = null;
var _logLastTs = null;
var _logScrollPinned = true;
var _logHover = false;

function renderLogs() {
  var feed = document.getElementById('logFeed');
  feed.addEventListener('scroll', function() {
    _logScrollPinned = feed.scrollTop + feed.clientHeight >= feed.scrollHeight - 40;
  });
  feed.addEventListener('mouseenter', function() { _logHover = true; });
  feed.addEventListener('mouseleave', function() { _logHover = false; });
}

function setLogsFilter(f) {
  _logFilter = f;
  document.querySelectorAll('#logFilterTabs .tab').forEach(function(t) {
    t.classList.toggle('active', t.getAttribute('data-lfilter') === f);
  });
  drawLogRows();
}

function logMatchesFilter(ev) {
  if (_logFilter === 'all') return true;
  if (_logFilter === 'errors') return ev.level === 'error' || ev.level === 'warn';
  return ev.source === _logFilter;
}

function drawLogRows() {
  var feed = document.getElementById('logFeed');
  var rows = _logEvents.filter(logMatchesFilter);
  if (!rows.length) {
    feed.innerHTML = '<div class="log-offline">No activity yet — save a note or forward an email and watch it flow through.</div>';
    return;
  }
  feed.innerHTML = rows.map(function(ev) {
    var t = '';
    try {
      var d = new Date(ev.ts);
      var now = new Date();
      var sameDay = d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate();
      if (sameDay) {
        t = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      } else {
        t = d.toLocaleDateString([], { month: 'short', day: 'numeric' }) + ' ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      }
    } catch(e) { t = ev.ts || ''; }
    var lvl = ev.level === 'error' ? 'error' : (ev.level === 'warn' ? 'warn' : 'info');
    var clickable = ev.slug ? ' clickable" onclick="openPageModal(\'' + escAttr(ev.slug) + '\')' : '';
    return '<div class="log-row' + clickable + '">'
      + '<span class="log-ts">' + esc(t) + '</span>'
      + '<span class="log-src">' + esc(ev.source || '?') + '</span>'
      + '<span class="log-stage ' + lvl + '">' + esc(ev.stage || '') + '</span>'
      + '<span class="log-detail">' + esc(ev.detail || '') + '</span>'
      + '</div>';
  }).join('');
  if (_logScrollPinned && !_logHover) feed.scrollTop = feed.scrollHeight;
}

function setLogsLive(state) {
  var dot = document.getElementById('logsLiveDot');
  var label = document.getElementById('logsLiveLabel');
  if (!dot) return;
  dot.className = 'dot' + (state === 'on' ? ' on' : state === 'err' ? ' err' : '');
  label.textContent = state === 'on' ? 'live' : state === 'err' ? 'offline' : 'idle';
}

function fetchActivity(initial) {
  var API_BASE = localStorage.getItem('gbrain-activity-api') || '';
  var url = API_BASE + '/api/activity?limit=200' + (_logLastTs && !initial ? '&since=' + encodeURIComponent(_logLastTs) : '');
  fetch(url)
    .then(function(r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
    .then(function(data) {
      var evs = data.events || [];
      if (evs.length) {
        _logEvents = _logEvents.concat(evs);
        if (_logEvents.length > 500) _logEvents = _logEvents.slice(-500);
        _logLastTs = evs[evs.length - 1].ts;
        drawLogRows();
      } else if (initial) {
        drawLogRows();
      }
      setLogsLive('on');
    })
    .catch(function() {
      setLogsLive('err');
      if (initial || !_logEvents.length) {
        document.getElementById('logFeed').innerHTML = '<div class="log-offline">Log stream offline — the brain API is unreachable right now. The rest of the dashboard still works.</div>';
      }
    });
}

function startLogsPoll() {
  if (_logPollTimer) return;
  fetchActivity(_logEvents.length === 0);
  _logPollTimer = setInterval(function() { fetchActivity(false); }, 5000);
}

function stopLogsPoll() {
  if (_logPollTimer) {
    clearInterval(_logPollTimer);
    _logPollTimer = null;
    setLogsLive('idle');
  }
}

