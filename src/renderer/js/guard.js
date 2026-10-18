'use strict';
/* guard.js - loaded first. If a script fails to load or crashes, show the reason on screen instead of a blank window. */
(function () {
  function show(msg) {
    const el = document.getElementById('lock');
    if (!el) return;
    el.classList.remove('hidden');
    el.innerHTML = '<div class="lock-card"><h1>Something went wrong</h1><p>Task Master could not start. If you copied the project by hand, check that no file is missing.</p><div class="err"></div></div>';
    el.querySelector('.err').textContent = msg;
  }
  window.addEventListener('error', function (e) {
    const t = e.target;
    show(t && (t.src || t.href) ? 'Missing file: ' + (t.src || t.href).split('/renderer/')[1] : (e.message || 'Unknown error'));
  }, true);
  window.addEventListener('unhandledrejection', function (e) { show(String(e.reason && e.reason.message || e.reason)); });
})();
