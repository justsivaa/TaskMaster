'use strict';
/* ============================================================
   palette.js  -  the Ctrl+K command palette and the global keyboard shortcuts.

   The palette is one input that does three jobs:
     type a task title   ->  jump to that task
     type a command      ->  go to a page, switch view or theme
     type anything else  ->  "Add task: ..." (dates and tags are understood, like quick add)

   To add a command, add a line to commands() below.
   Styles: styles/overlays.css (section 1).
   ============================================================ */

function commands() {
  const c = [];
  for (const n of NAV) if (n !== 'sep') c.push({ g: 'Go to', icon: I[n.icon], text: n.label, run: () => go(n.id) });
  c.push({ g: 'Go to', icon: I.gear, text: 'Settings', run: () => go('settings') });
  for (const l of allLabels()) c.push({ g: 'Labels', icon: I.tag, text: '#' + l.name, run: () => go('label', l.name) });
  for (const [k, label, ic] of VIEWS) c.push({ g: 'View', icon: I[ic], text: `${label} view`, run: () => { if (!isTaskNav()) go('open'); settings().view = k; save(); render(); } });
  c.push({ g: 'Actions', icon: I.plus, text: 'New task (full form)', run: () => openNewTask() });
  for (const [k, l] of [['dark', 'Dark'], ['light', 'Light'], ['system', 'Match system']])
    c.push({ g: 'Theme', icon: I.gear, text: `${l} theme`, run: () => { settings().theme = k; applyTheme(); save(); render(); } });
  return c;
}

/** Highlight the typed letters inside a result */
function mark(text, q) {
  const i = q ? text.toLowerCase().indexOf(q.toLowerCase()) : -1;
  return i < 0 ? esc(text) : esc(text.slice(0, i)) + '<em>' + esc(text.slice(i, i + q.length)) + '</em>' + esc(text.slice(i + q.length));
}

function openPalette() {
  if ($('.pal-wrap')) return;
  const wrap = document.createElement('div');
  wrap.className = 'pal-wrap overlay-pal';
  wrap.innerHTML = `<div class="pal" role="dialog"><div class="pal-in">${I.search}<input type="text" placeholder="Search tasks, jump to a page, or type a new task" autocomplete="off" spellcheck="false"></div>
    <div class="pal-list"></div>
    <div class="pal-foot"><span><span class="kbd">↑</span><span class="kbd">↓</span> to move</span><span><span class="kbd">Enter</span> to choose</span><span><span class="kbd">Esc</span> to close</span></div></div>`;
  $('#modal-root').appendChild(wrap);
  const inp = $('input', wrap), listEl = $('.pal-list', wrap);
  let items = [], sel = 0;
  const close = () => wrap.remove();
  wrap.addEventListener('mousedown', e => { if (e.target === wrap) close(); });

  const build = () => {
    const q = inp.value.trim(), ql = q.toLowerCase();
    items = [];
    const tasks = data.tasks.filter(t => !ql || (t.title + ' ' + (t.labels || []).join(' ')).toLowerCase().includes(ql))
      .sort((a, b) => (a.status === 'done') - (b.status === 'done') || (a.dueDate || '9999').localeCompare(b.dueDate || '9999')).slice(0, ql ? 7 : 5);
    items.push(...commands().filter(c => !ql || c.text.toLowerCase().includes(ql)).slice(0, ql ? 6 : 8));
    items.push(...tasks.map(t => ({ g: ql ? 'Tasks' : 'Recent tasks', icon: I.circleCheck, text: t.title, hl: true, run: () => openTask(t.id) })));
    if (q) {                      // "Add task" is always last, so Enter on a matching task or page never adds by accident (it is first only when nothing else matches)
      const p = TMParse.parseQuickAdd(q);
      const add = { g: 'Create', icon: I.plus, text: `Add task: ${p.title}`, extra: previewHtml(p), run: () => withUndo(t => `Added “${shortTitle(t.title)}”`, () => createFromText(q)) };
      if (p.title) items.push(add);
    }
    // group headings: keep the order above but show each heading once
    sel = Math.min(sel, Math.max(0, items.length - 1));
    let last = '';
    listEl.innerHTML = items.length ? items.map((it, i) => {
      const head = it.g !== last ? `<div class="pal-group">${it.g}</div>` : '';
      last = it.g;
      return `${head}<div class="pal-item ${i === sel ? 'sel' : ''}" data-i="${i}">${it.icon}<span class="t">${it.hl ? mark(it.text, q) : esc(it.text)}</span>${it.extra || ''}</div>`;
    }).join('') : '<div class="pal-empty">Nothing found</div>';
    $('.sel', listEl)?.scrollIntoView({ block: 'nearest' });
  };
  const choose = i => { const it = items[i]; if (!it) return; close(); it.run(); };

  inp.oninput = () => { sel = 0; build(); };
  inp.onkeydown = e => {
    if (e.key === 'ArrowDown') { e.preventDefault(); sel = (sel + 1) % Math.max(1, items.length); build(); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); sel = (sel - 1 + items.length) % Math.max(1, items.length); build(); }
    else if (e.key === 'Enter') { e.preventDefault(); choose(sel); }
    else if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); close(); }
  };
  listEl.onmousemove = e => { const el = e.target.closest('.pal-item'); if (el && +el.dataset.i !== sel) { sel = +el.dataset.i; $$('.pal-item', listEl).forEach(n => n.classList.toggle('sel', n === el)); } };
  listEl.onclick = e => { const el = e.target.closest('.pal-item'); if (el) choose(+el.dataset.i); };
  build(); inp.focus();
}

/* ============ Global keys ============ */
document.addEventListener('keydown', e => {
  if (!data || !$('#app') || $('#app').classList.contains('hidden')) return;
  const pal = $('.pal-wrap');
  if (e.key === 'Escape') { if (pal) return pal.remove(); const o = topOverlay(); if (o) o._close(); return; }
  const mod = e.ctrlKey || e.metaKey, k = e.key.toLowerCase();
  if (mod && k === 'k') { e.preventDefault(); pal ? pal.remove() : openPalette(); return; }
  if (pal || $('.overlay')) return;
  if (mod && k === 'n') { e.preventDefault(); openNewTask(); return; }
  const typing = ['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName);
  if (typing || mod || e.altKey) return;
  if (e.key === '/' && $('#q')) { e.preventDefault(); $('#q').focus(); }
  else if (e.key === 'n' || e.key === 'q') { if ($('#qa-in')) { e.preventDefault(); $('#qa-in').focus(); } }
  else if (isTaskNav() && '1234'.includes(e.key) && e.key) { settings().view = VIEWS[+e.key - 1][0]; save(); render(); }
});
