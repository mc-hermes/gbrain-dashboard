// ─── THEME ───
const THEME_CLASSES = ['dark', 'light', 'catppuccin-mocha', 'catppuccin-latte', 'tokyo-night', 'omarchy', 'library'];
function applyTheme(name) {
  document.body.classList.remove(...THEME_CLASSES);
  if (name && name !== 'dark') document.body.classList.add(name);
  localStorage.setItem('gbrain-theme', name);
  document.getElementById('themeSelect').value = name;
  setTimeout(drawGraphFrame, 50);
}
(function() { const saved = localStorage.getItem('gbrain-theme') || 'library'; applyTheme(saved); })();
(function() { if (localStorage.getItem('gbrain-sidebar-pinned') === 'true') document.getElementById('sidebar').classList.add('pinned'); })();

// ─── SETTINGS ───
function toggleSidebarPin() {
  document.getElementById('sidebar').classList.toggle('pinned');
  localStorage.setItem('gbrain-sidebar-pinned', document.getElementById('sidebar').classList.contains('pinned'));
}
function toggleSettings() {
  document.getElementById('settingsPopover').classList.toggle('active');
}
function toggleMoreMenu() {
  document.getElementById('moreMenu').classList.toggle('active');
}
document.addEventListener('click', function(e) {
  const pop = document.getElementById('settingsPopover');
  if (pop.classList.contains('active') && !pop.contains(e.target) && !e.target.classList.contains('cog-btn'))
    pop.classList.remove('active');
  const mm = document.getElementById('moreMenu');
  if (mm.classList.contains('active') && !mm.contains(e.target) && !e.target.closest('.mobile-nav-btn[data-view="more"]'))
    mm.classList.remove('active');
});

