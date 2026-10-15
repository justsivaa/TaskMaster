'use strict';
/* ---------- helpers ---------- */
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const uid = () => (crypto.randomUUID ? crypto.randomUUID() : String(Date.now()) + Math.random().toString(16).slice(2));

const I = {
  lock: '<svg viewBox="0 0 24 24"><rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg>',
  list: '<svg viewBox="0 0 24 24"><path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/></svg>',
  grid: '<svg viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></svg>',
  home: '<svg viewBox="0 0 24 24"><path d="M3 11l9-8 9 8v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/></svg>',
  check: '<svg viewBox="0 0 24 24"><path d="M5 13l4 4L19 7"/></svg>',
  circleCheck: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M8 12l3 3 5-6"/></svg>',
  all: '<svg viewBox="0 0 24 24"><path d="M4 6h16M4 12h16M4 18h10"/></svg>',
  folder: '<svg viewBox="0 0 24 24"><path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></svg>',
  gear: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/></svg>',
  plus: '<svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>',
  search: '<svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/></svg>',
  x: '<svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18"/></svg>',
  trash: '<svg viewBox="0 0 24 24"><path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14"/></svg>',
  chev: '<svg viewBox="0 0 24 24"><path d="M9 6l6 6-6 6"/></svg>',
  clock: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>',
  clip: '<svg viewBox="0 0 24 24"><path d="M21 12l-8.5 8.5a5 5 0 0 1-7-7L14 5a3.5 3.5 0 0 1 5 5l-8.5 8.5a2 2 0 0 1-3-3L15 7"/></svg>',
  sub: '<svg viewBox="0 0 24 24"><path d="M5 4v8a3 3 0 0 0 3 3h11M15 11l4 4-4 4"/></svg>',
  down: '<svg viewBox="0 0 24 24"><path d="M12 4v11M7 11l5 5 5-5M5 20h14"/></svg>',
  up: '<svg viewBox="0 0 24 24"><path d="M12 16V5M7 9l5-5 5 5M5 20h14"/></svg>',
  open: '<svg viewBox="0 0 24 24"><path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"/></svg>',
  move: '<svg viewBox="0 0 24 24"><path d="M5 9l-3 3 3 3M9 5l3-3 3 3M15 19l-3 3-3-3M19 9l3 3-3 3M2 12h20M12 2v20"/></svg>',
  edit: '<svg viewBox="0 0 24 24"><path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/></svg>',
  shield: '<svg viewBox="0 0 24 24"><path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z"/><path d="M9 12l2 2 4-4"/></svg>',
  cal: '<svg viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/></svg>'
};

const STATUS = { todo: 'To Do', progress: 'In Progress', hold: 'On Hold', done: 'Done' };
const PRIORITY = { high: 'High', medium: 'Medium', low: 'Low' };
let TASK_LIMIT = 1024 ** 3; // 1 GB of attachments per task (the app reads the real value from the backend at startup)
const PRIO_RANK = { high: 0, medium: 1, low: 2 };

const todayStr = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
const dayDiff = s => Math.round((new Date(s + 'T00:00:00') - new Date(todayStr() + 'T00:00:00')) / 864e5);
const fmtDate = s => s ? new Date(s.length === 10 ? s + 'T00:00:00' : s).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }) : '';
const fmtDateTime = s => new Date(s).toLocaleString(undefined, { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' });
const fmtSize = n => n < 1024 ? n + ' B' : n < 1048576 ? (n / 1024).toFixed(1) + ' KB' : n < 1073741824 ? (n / 1048576).toFixed(1) + ' MB' : (n / 1073741824).toFixed(2) + ' GB';
const extOf = n => (n.includes('.') ? n.split('.').pop() : 'file').slice(0, 4);
const EXT_COLOR = { pdf: '#ff5d6c', doc: '#4da3ff', docx: '#4da3ff', xls: '#2fbf71', xlsx: '#2fbf71', csv: '#2fbf71', ppt: '#f5a524', pptx: '#f5a524', png: '#b06cff', jpg: '#b06cff', jpeg: '#b06cff', gif: '#b06cff', zip: '#8b92a5', rar: '#8b92a5', txt: '#8b92a5', mp4: '#ff7ac6' };
const extColor = n => EXT_COLOR[extOf(n).toLowerCase()] || 'var(--accent)';

function dueInfo(t) {
  if (!t.dueDate) return null;
  const d = dayDiff(t.dueDate);
  if (t.status === 'done') return { cls: '', text: fmtDate(t.dueDate) };
  if (d < 0) return { cls: 'over', text: `Overdue ${-d}d` };
  if (d === 0) return { cls: 'today', text: 'Due today' };
  if (d === 1) return { cls: '', text: 'Due tomorrow' };
  return { cls: '', text: 'Due ' + fmtDate(t.dueDate) };
}

/* ---------- state ---------- */
let data = null;
const ui = { view: 'home', status: 'all', prio: 'all', sort: 'due', q: '', fcwd: '' };
let saveTimer = null;

const settings = () => (data.settings ||= {});
const layout = () => settings().layout || 'grid';

function save(now) {
  clearTimeout(saveTimer);
  const run = () => window.api.saveData(data).catch(e => toast('Save failed: ' + e.message, true));
  if (now) return run();
  saveTimer = setTimeout(run, 350);
}

function toast(msg, isErr) {
  const el = document.createElement('div');
  el.className = 'toast' + (isErr ? ' err' : '');
  el.textContent = msg;
  const box = $('#toasts');
  while (box.children.length >= 3) box.firstChild.remove();
  box.appendChild(el);
  setTimeout(() => el.remove(), isErr ? 5000 : 2800);
}

function applyTheme() {
  const t = data?.settings?.theme || 'dark';
  const eff = t === 'system' ? (matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark') : t;
  document.documentElement.dataset.theme = eff;
}

/* ---------- generic dialogs ---------- */
function openModal(html, cls = '') {
  const root = $('#modal-root');
  const ov = document.createElement('div');
  ov.className = 'overlay';
  ov.innerHTML = `<div class="modal ${cls}" role="dialog">${html}</div>`;
  root.appendChild(ov);
  const close = () => { ov.remove(); ov.dispatchEvent(new Event('closed')); };
  ov.addEventListener('mousedown', e => { if (e.target === ov) close(); });
  ov._close = close;
  return { ov, m: $('.modal', ov), close };
}
const topOverlay = () => { const a = $$('.overlay'); return a[a.length - 1]; };

function confirmBox(msg, okLabel = 'Delete') {
  return new Promise(res => {
    const { m, close, ov } = openModal(`<div class="modal-head"><h3>Are you sure?</h3></div><div class="modal-body"><div>${esc(msg)}</div></div>
      <div class="modal-foot"><span class="sp"></span><button class="btn" data-n>Cancel</button><button class="btn primary" data-y>${esc(okLabel)}</button></div>`, 'sm');
    let done = false; const fin = v => { if (!done) { done = true; res(v); } };
    $('[data-n]', m).onclick = () => { fin(false); close(); };
    $('[data-y]', m).onclick = () => { fin(true); close(); };
    ov.addEventListener('closed', () => fin(false));
    $('[data-y]', m).focus();
  });
}

function askText(title, value = '', ph = '') {
  return new Promise(res => {
    const { m, close, ov } = openModal(`<div class="modal-head"><h3>${esc(title)}</h3></div><div class="modal-body"><input type="text" id="ask" value="${esc(value)}" placeholder="${esc(ph)}"></div>
      <div class="modal-foot"><span class="sp"></span><button class="btn" data-n>Cancel</button><button class="btn primary" data-y>Save</button></div>`, 'sm');
    let done = false; const fin = v => { if (!done) { done = true; res(v); } };
    const inp = $('#ask', m); inp.focus(); inp.select();
    const ok = () => { const v = inp.value.trim(); if (v) { fin(v); close(); } };
    $('[data-n]', m).onclick = () => { fin(null); close(); };
    $('[data-y]', m).onclick = ok;
    inp.onkeydown = e => { if (e.key === 'Enter') ok(); };
    ov.addEventListener('closed', () => fin(null));
  });
}

/* ---------- file statistics (from disk) ---------- */
let fileStats = { tasks: {}, general: { files: 0, bytes: 0 } };
const taskFiles = id => fileStats.tasks[id]?.files || 0;
const totalFiles = () => fileStats.general.files + Object.values(fileStats.tasks).reduce((a, x) => a + x.files, 0);
async function refreshStats() { try { fileStats = await window.api.stats(); } catch { /* keep old numbers */ } }

/* ---------- startup ---------- */
function showCard(inner) {
  $('#app').classList.add('hidden');
  const lock = $('#lock');
  lock.classList.remove('hidden');
  document.documentElement.dataset.theme = matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
  lock.innerHTML = `<div class="lock-card"><div class="logo"><img src="logo.png" alt=""></div>${inner}</div>`;
  return lock;
}

async function boot() {
  let r;
  try { r = await window.api.init(); }
  catch (e) { showCard(`<h1>Task Master</h1><p>Could not open your data folder.</p><div class="err">${esc(e.message)}</div>`); return; }
  if (r.limit) TASK_LIMIT = r.limit;
  if (r.status === 'ready') return begin(r);
  showUpgrade(r.status);
}

async function begin(r) {
  data = r.data || { tasks: [], settings: {} };
  data.tasks ||= []; data.settings ||= {};
  delete data.files; delete data.folders; // attachments now live on disk, not in the task data
  const lock = $('#lock'); lock.classList.add('hidden'); lock.innerHTML = '';
  await refreshStats();
  startApp();
  if (r.upgraded) {
    toast(r.upgraded.failed
      ? `Converted ${r.upgraded.migrated} files. ${r.upgraded.failed} could not be converted and were left untouched.`
      : `Upgrade complete: ${r.upgraded.migrated} file${r.upgraded.migrated === 1 ? '' : 's'} converted.`, !!r.upgraded.failed);
  }
}

/** Only shown once, for data created by an older encrypted version that needs the old password or key file. */
function showUpgrade(status) {
  const lock = showCard(`<h1>One-time upgrade</h1>
    <p>Task Master no longer uses encryption. Your older attachments are still encrypted, so they need to be converted once.</p>
    ${status === 'password'
      ? `<form id="uf" class="stack"><input type="password" id="upw" placeholder="Your old master password"><button class="btn primary" style="justify-content:center" type="submit">Convert my data</button></form>`
      : `<div class="stack"><div class="hint">Your old key could not be read on this computer. Choose the key backup file you saved earlier (TaskMaster-encryption-key.json).</div><button class="btn primary" id="ukey" style="justify-content:center">Choose key backup file…</button></div>`}
    <div class="err" id="uerr"></div>
    <button class="linkbtn" id="uskip">Skip and start without my old data</button>`);
  const err = $('#uerr', lock);
  const run = async fn => { err.textContent = ''; try { const r = await fn(); if (r) begin(r); } catch (e) { err.textContent = e.message; } };
  if (status === 'password') {
    $('#upw', lock).focus();
    $('#uf', lock).onsubmit = e => { e.preventDefault(); run(() => window.api.upgradePassword($('#upw', lock).value)); };
  } else $('#ukey', lock).onclick = () => run(() => window.api.upgradeKeyfile());
  $('#uskip', lock).onclick = () => begin({ data: { tasks: [], settings: {} } });
}

/* ---------- app shell ---------- */
function startApp() {
  applyTheme();
  const app = $('#app');
  app.classList.remove('hidden');
  app.innerHTML = `
  <aside class="side">
    <div class="brand"><div class="logo"><img src="logo.png" alt=""></div><span>Task Master</span></div>
    <div id="nav"></div><div class="sp"></div>
    <div class="vault-note">${I.folder}<span>Your tasks and files are stored on this PC.</span></div>
  </aside>
  <section class="main">
    <div class="top" id="top"></div>
    <div class="content" id="content"></div>
  </section>`;
  ui.view = 'home';
  render();
}


const pending = () => data.tasks.filter(t => t.status !== 'done');

function renderNav() {
  const items = [
    ['home', I.home, 'Pending', pending().length],
    ['completed', I.circleCheck, 'Completed', data.tasks.length - pending().length],
    ['all', I.all, 'All tasks', data.tasks.length],
    ['files', I.folder, 'Files', totalFiles()],
    ['settings', I.gear, 'Settings', '']
  ];
  $('#nav').innerHTML = items.map(([k, ic, l, c]) =>
    `<button class="nav ${ui.view === k ? 'active' : ''}" data-v="${k}">${ic}<span class="lbl">${l}</span>${c !== '' ? `<span class="count">${c}</span>` : ''}</button>`).join('');
  $$('#nav .nav').forEach(b => b.onclick = () => { ui.view = b.dataset.v; ui.status = 'all'; render(); });
}

function render() {
  if (!data) return;
  renderNav();
  $('#content').innerHTML = '';
  const titles = { home: 'Pending tasks', completed: 'Completed', all: 'All tasks', files: 'Files', settings: 'Settings' };
  const isTasks = ['home', 'completed', 'all'].includes(ui.view);
  $('#top').innerHTML = `<h2>${titles[ui.view]}</h2><span class="subhead" id="sub"></span>
    ${isTasks ? `<div class="search">${I.search}<input type="text" id="q" placeholder="Search tasks…  ( / )" value="${esc(ui.q)}"></div>
    <div class="seg"><button data-l="grid" class="${layout() === 'grid' ? 'on' : ''}" title="Grid">${I.grid}</button><button data-l="list" class="${layout() === 'list' ? 'on' : ''}" title="List">${I.list}</button></div>` : ''}
    ${ui.view !== 'settings' && ui.view !== 'files' ? `<button class="btn primary" id="newtask" style="${isTasks ? '' : 'margin-left:auto'}">${I.plus} New task</button>` : ''}`;
  if (isTasks) {
    $('#q').oninput = e => { ui.q = e.target.value; renderTasks(); };
    $$('.seg button').forEach(b => b.onclick = () => { settings().layout = b.dataset.l; save(); render(); });
  }
  const nt = $('#newtask'); if (nt) nt.onclick = openNewTask;
  if (isTasks) renderTasks();
  else if (ui.view === 'files') renderFiles();
  else renderSettings();
}

/* ---------- tasks view ---------- */
function filteredTasks() {
  let list = data.tasks.filter(t => ui.view === 'home' ? t.status !== 'done' : ui.view === 'completed' ? t.status === 'done' : true);
  if (ui.status !== 'all') list = list.filter(t => t.status === ui.status);
  if (ui.prio !== 'all') list = list.filter(t => t.priority === ui.prio);
  const q = ui.q.trim().toLowerCase();
  if (q) list = list.filter(t => (t.title + ' ' + (t.description || '') + ' ' + (t.subtasks || []).map(s => s.title + ' ' + (s.description || '')).join(' ')).toLowerCase().includes(q));
  const cmp = {
    due: (a, b) => (a.dueDate || '9999').localeCompare(b.dueDate || '9999') || PRIO_RANK[a.priority] - PRIO_RANK[b.priority],
    created: (a, b) => b.createdAt.localeCompare(a.createdAt),
    priority: (a, b) => PRIO_RANK[a.priority] - PRIO_RANK[b.priority] || (a.dueDate || '9999').localeCompare(b.dueDate || '9999'),
    title: (a, b) => a.title.localeCompare(b.title)
  }[ui.sort];
  return list.sort(cmp);
}

function cardHtml(t) {
  const subs = t.subtasks || [], done = subs.filter(s => s.done).length;
  const di = dueInfo(t), nf = taskFiles(t.id);
  const pct = subs.length ? Math.round(done / subs.length * 100) : 0;
  return `<div class="card p-${t.priority} ${t.status === 'done' ? 'done' : ''}" data-id="${t.id}">
    <div class="row1"><button class="check ${t.status === 'done' ? 'on' : ''}" data-chk title="Mark ${t.status === 'done' ? 'as not done' : 'done'}">${t.status === 'done' ? I.check : ''}</button><h3>${esc(t.title)}</h3></div>
    ${t.description ? `<p>${esc(t.description)}</p>` : ''}
    ${subs.length ? `<div class="prog" title="${done}/${subs.length} subtasks"><i style="width:${pct}%"></i></div>` : layout() === 'list' ? '<div class="prog" style="opacity:0"></div>' : ''}
    <div class="meta"><span class="pill s-${t.status}">${STATUS[t.status]}</span>
      ${di ? `<span class="due ${di.cls}">${I.clock}${di.text}</span>` : ''}</div>
    <div class="foot">
      ${subs.length ? `<span>${I.sub}${done}/${subs.length}</span>` : ''}
      ${nf ? `<span>${I.clip}${nf}</span>` : ''}
      <span class="r" title="Created automatically">${I.cal}${fmtDate(t.createdAt)}</span>
    </div></div>`;
}

function renderTasks() {
  const all = data.tasks, p = pending();
  const today = todayStr();
  const stats = ui.view === 'home' ? `<div class="stats">
    <div class="stat"><b>${p.length}</b><span>Pending</span></div>
    <div class="stat"><b>${p.filter(t => t.dueDate === today).length}</b><span>Due today</span></div>
    <div class="stat ${p.some(t => t.dueDate && t.dueDate < today) ? 'warn' : ''}"><b>${p.filter(t => t.dueDate && t.dueDate < today).length}</b><span>Overdue</span></div>
    <div class="stat"><b>${all.length - p.length}</b><span>Completed</span></div></div>` : '';
  const stOpts = ui.view === 'home' ? ['all', 'todo', 'progress', 'hold'] : ui.view === 'completed' ? [] : ['all', 'todo', 'progress', 'hold', 'done'];
  const content = $('#content');
  // keep toolbar stable while typing in search: only rebuild list area when toolbar exists
  if (!$('#tlist')) {
    content.innerHTML = `${stats}<div class="toolbar">${stOpts.map(s => `<button class="chip ${ui.status === s ? 'on' : ''}" data-s="${s}">${s === 'all' ? 'All' : STATUS[s]}</button>`).join('')}
      <span class="grow"></span>
      <select id="fprio" title="Priority"><option value="all">Any priority</option>${Object.entries(PRIORITY).map(([k, v]) => `<option value="${k}" ${ui.prio === k ? 'selected' : ''}>${v}</option>`).join('')}</select>
      <select id="fsort" title="Sort"><option value="due">Sort: Due date</option><option value="priority">Sort: Priority</option><option value="created">Sort: Newest</option><option value="title">Sort: A–Z</option></select></div>
      <div id="tlist"></div>`;
    $('#fsort').value = ui.sort;
    $$('.chip', content).forEach(c => c.onclick = () => { ui.status = c.dataset.s; $('#tlist') && (content.innerHTML = ''); renderTasks(); });
    $('#fprio').onchange = e => { ui.prio = e.target.value; renderTasks(); };
    $('#fsort').onchange = e => { ui.sort = e.target.value; renderTasks(); };
  }
  const list = filteredTasks();
  $('#sub').textContent = `${list.length} task${list.length === 1 ? '' : 's'}`;
  const box = $('#tlist');
  if (!list.length) {
    box.innerHTML = `<div class="empty">${I.circleCheck}<h3>${ui.q || ui.status !== 'all' || ui.prio !== 'all' ? 'No matching tasks' : ui.view === 'home' ? "You're all caught up" : 'Nothing here yet'}</h3>
      <div>${ui.view === 'home' && !ui.q ? 'Press <b>New task</b> (or Ctrl+N) to add your first one.' : 'Try changing the filters.'}</div></div>`;
    return;
  }
  box.className = layout();
  box.innerHTML = list.map(cardHtml).join('');
  $$('.card', box).forEach(c => {
    c.onclick = () => openTask(c.dataset.id);
    $('[data-chk]', c).onclick = e => {
      e.stopPropagation();
      const t = data.tasks.find(x => x.id === c.dataset.id);
      t.status = t.status === 'done' ? 'todo' : 'done';
      t.completedAt = t.status === 'done' ? new Date().toISOString() : null;
      save(); render();
    };
  });
}

/* ---------- new task ---------- */
function selectOpts(map, cur) { return Object.entries(map).map(([k, v]) => `<option value="${k}" ${k === cur ? 'selected' : ''}>${v}</option>`).join(''); }

function openNewTask() {
  const now = new Date().toISOString();
  const { m, close } = openModal(`<div class="modal-head"><h3>New task</h3><button class="icon-btn" data-x>${I.x}</button></div>
    <div class="modal-body">
      <div><label class="f">TASK HEADING</label><input type="text" id="nt-title" placeholder="What needs to be done?" maxlength="200"></div>
      <div class="meta-grid" style="padding:0;border:0">
        <div><label class="f">CREATED (AUTO)</label><input type="text" value="${esc(fmtDateTime(now))}" disabled></div>
        <div><label class="f">STATUS</label><select id="nt-status">${selectOpts(STATUS, 'todo')}</select></div>
        <div><label class="f">DUE DATE</label><input type="date" id="nt-due"></div>
        <div><label class="f">PRIORITY</label><select id="nt-prio">${selectOpts(PRIORITY, 'medium')}</select></div>
      </div>
      <div class="hint">After creating, click the task to add a description, subtasks and files.</div>
    </div>
    <div class="modal-foot"><span class="sp"></span><button class="btn" data-x>Cancel</button><button class="btn primary" id="nt-ok">Create task</button></div>`, '');
  $$('[data-x]', m).forEach(b => b.onclick = close);
  const title = $('#nt-title', m); title.focus();
  const create = () => {
    const v = title.value.trim();
    if (!v) { title.focus(); title.style.borderColor = 'var(--danger)'; return; }
    const t = {
      id: uid(), title: v, description: '', status: $('#nt-status', m).value, priority: $('#nt-prio', m).value,
      createdAt: now, dueDate: $('#nt-due', m).value || null, completedAt: null, subtasks: []
    };
    if (t.status === 'done') t.completedAt = now;
    data.tasks.push(t); save(); close(); render(); toast('Task created');
  };
  $('#nt-ok', m).onclick = create;
  m.onkeydown = e => { if (e.key === 'Enter' && e.target.tagName !== 'TEXTAREA') create(); };
}


/* ---------- extra icons ---------- */
Object.assign(I, {
  back: '<svg viewBox="0 0 24 24"><path d="M19 12H5M11 6l-6 6 6 6"/></svg>',
  folderUp: '<svg viewBox="0 0 24 24"><path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><path d="M12 16v-5M9.5 13.5L12 11l2.5 2.5"/></svg>',
  folderPlus: '<svg viewBox="0 0 24 24"><path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><path d="M12 10.5v5M9.5 13h5"/></svg>',
  note: '<svg viewBox="0 0 24 24"><path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><path d="M14 3v6h6M8 13h8M8 17h5"/></svg>'
});

/* ---------- notepad-style textarea ----------
   No toolbar. Keyboard only:
   Tab / Shift+Tab   indent / outdent (the line, or every selected line)
   "* " at line start becomes a bullet; Enter on a "• ", "- ", "* " or "1." line carries the list on;
   Enter on an empty item ends the list (or steps out one level); Backspace right after a marker removes it. */
function attachNotepad(ta, { min = 120, max = 320 } = {}) {
  const IND = '  ';
  const LIST = /^(\s*)([•*+-]|\d+[.)])([ \t]+)/;
  const bounds = (v, pos) => {
    const s = pos === 0 ? 0 : v.lastIndexOf('\n', pos - 1) + 1;
    let e = v.indexOf('\n', pos); if (e < 0) e = v.length;
    return [s, e];
  };
  const fit = () => { ta.style.height = 'auto'; ta.style.height = Math.min(Math.max(ta.scrollHeight + 2, min), max) + 'px'; };
  // execCommand keeps the browser's own undo/redo working
  const put = (a, b, text) => {
    ta.setSelectionRange(a, b);
    if (text) document.execCommand('insertText', false, text);
    else if (a !== b) document.execCommand('delete');
  };
  const numberFor = (v, ls, indent) => {
    const lines = v.slice(0, ls).split('\n'); lines.pop();
    for (let i = lines.length - 1; i >= 0; i--) {
      const m = LIST.exec(lines[i]);
      if (!m) return 1;
      if (m[1].length > indent) continue;
      if (m[1].length < indent) return 1;
      const n = /^\d+/.exec(m[2]);
      return n ? parseInt(n[0], 10) + 1 : 1;
    }
    return 1;
  };
  const fixNumber = pos => {
    const v = ta.value, [ls, le] = bounds(v, pos);
    const m = /^(\s*)(\d+)([.)])([ \t]+)/.exec(v.slice(ls, le));
    if (!m) return;
    const n = String(numberFor(v, ls, m[1].length));
    if (n === m[2]) return;
    const caret = ta.selectionStart, a = ls + m[1].length;
    put(a, a + m[2].length, n);
    const c = caret + n.length - m[2].length;
    ta.setSelectionRange(c, c);
  };

  ta.addEventListener('keydown', e => {
    if (e.isComposing || e.ctrlKey || e.altKey || e.metaKey) return;
    const v = ta.value, a = ta.selectionStart, b = ta.selectionEnd;

    if (e.key === 'Tab') {
      e.preventDefault();
      const [ls] = bounds(v, a);
      const [, le] = bounds(v, (b > a && v[b - 1] === '\n') ? b - 1 : b);
      const block = v.slice(ls, le), multi = block.includes('\n');
      if (e.shiftKey) {
        let removedFirst = 0;
        const out = block.split('\n').map((l, i) => { const mm = /^( {1,2}|\t)/.exec(l); const r = mm ? mm[0].length : 0; if (i === 0) removedFirst = r; return l.slice(r); }).join('\n');
        if (out === block) return;
        put(ls, le, out);
        if (multi) ta.setSelectionRange(ls, ls + out.length);
        else { const c = Math.max(ls, a - removedFirst); ta.setSelectionRange(c, c); fixNumber(c); }
      } else if (multi || a !== b || LIST.test(v.slice(ls, bounds(v, a)[1]))) {
        const out = block.split('\n').map(l => IND + l).join('\n');
        put(ls, le, out);
        if (multi) ta.setSelectionRange(ls, ls + out.length);
        else { ta.setSelectionRange(a + IND.length, b + IND.length); fixNumber(a + IND.length); }
      } else put(a, b, IND);
      return;
    }

    if (e.key === 'Enter' && !e.shiftKey && a === b) {
      const [ls, le] = bounds(v, a);
      const line = v.slice(ls, le), m = LIST.exec(line);
      if (!m || a < ls + m[0].length) return;
      e.preventDefault();
      if (!line.slice(m[0].length).trim()) {            // empty item: step out of the list
        if (m[1].length >= IND.length) {
          put(ls, le, line.slice(IND.length)); fixNumber(ls);
          const end = bounds(ta.value, ls)[1]; ta.setSelectionRange(end, end);
        } else put(ls, le, '');
      } else {
        const num = /^\d+/.exec(m[2]);
        const marker = num ? (parseInt(num[0], 10) + 1) + m[2].slice(num[0].length) : m[2];
        document.execCommand('insertText', false, '\n' + m[1] + marker + m[3]);
      }
      return;
    }

    if (e.key === 'Backspace' && a === b) {
      const [ls, le] = bounds(v, a);
      const m = LIST.exec(v.slice(ls, le));
      if (m && a === ls + m[0].length) {
        e.preventDefault();
        if (m[1].length >= IND.length) {
          put(ls, ls + IND.length, '');
          const c = a - IND.length; ta.setSelectionRange(c, c); fixNumber(c);
        } else put(ls + m[1].length, ls + m[0].length, '');
      }
    }
  });

  ta.addEventListener('input', e => {
    if (e.inputType === 'insertText' && e.data === ' ') {
      const a = ta.selectionStart, [ls] = bounds(ta.value, a);
      if (/^\s*\*\s$/.test(ta.value.slice(ls, a))) put(a - 2, a, '• ');
    }
    fit();
  });
  fit();
  return fit;
}

/* ---------- file browser window (used in the task popup and on the Files page) ---------- */
function mountBrowser(el, o) {
  // o: { root: 'tasks/<id>' | null (null = browse everything), title, limit?, start?, onNav?, onChange? }
  const virtual = !o.root;
  const api = window.api;
  let cwd = o.start ?? (o.root || '');
  let entries = [];

  const taskTitle = id => (data.tasks.find(t => t.id === id) || {}).title || 'Deleted task';
  const parentOf = rel => {
    if (virtual) { if (!rel || rel === 'general' || /^tasks\/[^/]+$/.test(rel)) return ''; }
    else if (rel === o.root) return o.root;
    return rel.slice(0, rel.lastIndexOf('/'));
  };
  const crumbList = () => {
    const out = [];
    if (virtual) {
      out.push({ label: 'All files', rel: '' });
      const parts = cwd ? cwd.split('/') : [];
      let acc = '';
      parts.forEach((p, i) => {
        acc = acc ? acc + '/' + p : p;
        if (i === 0 && p === 'tasks') return;
        out.push({ label: i === 0 ? 'General' : (i === 1 && parts[0] === 'tasks') ? taskTitle(p) : p, rel: acc });
      });
    } else {
      out.push({ label: o.title, rel: o.root });
      let acc = o.root;
      cwd.slice(o.root.length).split('/').filter(Boolean).forEach(p => { acc += '/' + p; out.push({ label: p, rel: acc }); });
    }
    return out;
  };

  async function load() {
    try {
      if (virtual && cwd === '') {
        entries = [{ name: 'General', rel: 'general', isDir: true, items: fileStats.general.files, synth: true }];
        for (const t of data.tasks) if (fileStats.tasks[t.id]) entries.push({ name: t.title, rel: 'tasks/' + t.id, isDir: true, items: fileStats.tasks[t.id].files, synth: true });
      } else entries = await api.list(cwd);
    } catch (e) { toast(e.message, true); entries = []; }
    if (o.onNav) o.onNav(cwd);
    paint();
  }

  async function changed() { await refreshStats(); renderNav(); if (o.onChange) o.onChange(); await load(); }

  async function upload(destRel, paths) {
    paths = (paths || []).filter(Boolean);
    if (!destRel || !paths.length) return;
    try {
      toast('Uploading…');
      const r = await api.add(destRel, paths);
      toast(`${r.files} file${r.files === 1 ? '' : 's'} added (${fmtSize(r.bytes)})`);
      await changed();
    } catch (e) { toast(e.message, true); }
  }

  const rowHtml = e => `<div class="frow ${e.isDir ? 'dir' : ''}" data-rel="${esc(e.rel)}" data-dir="${e.isDir ? 1 : 0}" ${e.synth ? '' : 'draggable="true"'}>
      <div class="ficon">${e.isDir ? I.folder : `<span class="ext" style="--c:${extColor(e.name)}">${esc(extOf(e.name))}</span>`}</div>
      <div class="nm"><b title="${esc(e.name)}">${esc(e.name)}</b><small>${e.isDir ? `${e.items} ${e.synth ? 'file' : 'item'}${e.items === 1 ? '' : 's'}` : `${fmtSize(e.size)} · ${fmtDate(e.mtime)}`}</small></div>
      ${e.synth ? `<span class="chevr">${I.chev}</span>` : `<div class="acts"><button class="icon-btn" data-act="dl" title="Save a copy…">${I.down}</button><button class="icon-btn" data-act="rn" title="Rename">${I.edit}</button><button class="icon-btn danger" data-act="rm" title="Delete">${I.trash}</button></div>`}
    </div>`;

  async function rowAction(act, rel, isDir) {
    const name = rel.slice(rel.lastIndexOf('/') + 1);
    try {
      if (act === 'dl') { const p = await api.download(rel, isDir); if (p) toast('Saved to ' + p); }
      else if (act === 'rn') {
        const n = await askText(isDir ? 'Rename folder' : 'Rename file', name);
        if (n && n !== name) { await api.rename(rel, n); await changed(); }
      } else if (act === 'rm') {
        if (!(await confirmBox(isDir ? `Delete the folder "${name}" and everything inside it? This cannot be undone.` : `Delete "${name}"? This cannot be undone.`))) return;
        await api.remove(rel); await changed();
      }
    } catch (e) { toast(e.message, true); }
  }

  function paint() {
    const crumbs = crumbList();
    const canWrite = !(virtual && cwd === '');
    const atRoot = cwd === (o.root || '');
    const nFiles = entries.filter(e => !e.isDir).length, nDirs = entries.length - nFiles;
    el.innerHTML = `
      <div class="fwin-bar"><span class="dots"><i></i><i></i><i></i></span><span class="fwin-title">${I.folder}<b>${esc(o.title)}</b></span></div>
      <div class="fwin-tools">
        <button class="icon-btn" data-up title="Go back one level" ${atRoot ? 'disabled' : ''}>${I.back}</button>
        <div class="crumbs">${crumbs.map((c, i) => `<button class="crumb" data-go="${esc(c.rel)}">${esc(c.label)}</button>${i < crumbs.length - 1 ? '<span class="sep">/</span>' : ''}`).join('')}</div>
      </div>
      <div class="fwin-actions">
        <button class="btn sm" data-add="files" ${canWrite ? '' : 'disabled'} title="${canWrite ? 'Upload one or more files' : 'Open General or a task folder first'}">${I.up} Upload files</button>
        <button class="btn sm" data-add="folder" ${canWrite ? '' : 'disabled'} title="${canWrite ? 'Upload a whole folder with everything inside' : 'Open General or a task folder first'}">${I.folderUp} Upload folder</button>
        <button class="btn sm" data-newfolder ${canWrite ? '' : 'disabled'} title="Create a new folder here">${I.folderPlus} New folder</button>
        <span class="grow"></span>
        <button class="icon-btn" data-reveal ${canWrite ? '' : 'disabled'} title="Show this folder in your file explorer">${I.open}</button>
      </div>
      <div class="fwin-list" data-list>${entries.length ? entries.map(rowHtml).join('') :
        `<div class="fempty">${I.folder}<b>This folder is empty</b><span>Drag files or whole folders here, or use the buttons above.</span></div>`}</div>
      <div class="fwin-foot" data-foot></div>`;

    $('[data-up]', el).onclick = () => { cwd = parentOf(cwd); load(); };
    $$('[data-go]', el).forEach(b => b.onclick = () => { cwd = b.dataset.go; load(); });
    $$('[data-add]', el).forEach(b => b.onclick = async () => { try { await upload(cwd, await api.pick(b.dataset.add)); } catch (e) { toast(e.message, true); } });
    $('[data-newfolder]', el).onclick = async () => {
      const name = await askText('New folder', '', 'Folder name');
      if (!name) return;
      try { await api.mkdir(cwd, name); await changed(); } catch (e) { toast(e.message, true); }
    };
    $('[data-reveal]', el).onclick = () => api.open(cwd).catch(e => toast(e.message, true));
    $('[data-list]', el).onclick = e => {
      const row = e.target.closest('.frow'); if (!row) return;
      const rel = row.dataset.rel, isDir = row.dataset.dir === '1';
      const act = e.target.closest('[data-act]');
      if (act) return rowAction(act.dataset.act, rel, isDir);
      if (isDir) { cwd = rel; load(); } else api.open(rel).catch(err => toast(err.message, true));
    };

    const foot = $('[data-foot]', el);
    if (o.limit) {
      api.usage(o.root).then(u => {
        foot.innerHTML = `<div class="prog"><i style="width:${Math.min(100, u.bytes / o.limit * 100)}%"></i></div><span>${fmtSize(u.bytes)} of ${fmtSize(o.limit)} used · ${u.files} file${u.files === 1 ? '' : 's'} in total</span>`;
      }).catch(() => { });
    } else foot.innerHTML = `<span>${nDirs} folder${nDirs === 1 ? '' : 's'}, ${nFiles} file${nFiles === 1 ? '' : 's'} here</span>`;
  }

  /* drag and drop: drop files/folders from your PC to upload; drag rows onto a folder or a path segment to move */
  const clearDrop = () => $$('.dropt', el).forEach(n => n.classList.remove('dropt'));
  const targetOf = e => {
    const row = e.target.closest('.frow.dir'); if (row) return { node: row, rel: row.dataset.rel };
    const cr = e.target.closest('[data-go]'); if (cr) return { node: cr, rel: cr.dataset.go };
    return { node: $('[data-list]', el), rel: cwd };
  };
  el.addEventListener('dragstart', e => {
    const row = e.target.closest && e.target.closest('.frow[draggable="true"]'); if (!row) return;
    e.dataTransfer.setData('text/x-tm-rel', row.dataset.rel); e.dataTransfer.effectAllowed = 'move';
    row.classList.add('dragging');
  });
  el.addEventListener('dragend', () => { clearDrop(); $$('.dragging', el).forEach(n => n.classList.remove('dragging')); });
  el.addEventListener('dragover', e => {
    const types = [...e.dataTransfer.types];
    const move = types.includes('text/x-tm-rel');
    if (!move && !types.includes('Files')) return;
    e.preventDefault(); e.dataTransfer.dropEffect = move ? 'move' : 'copy';
    clearDrop(); targetOf(e).node?.classList.add('dropt');
  });
  el.addEventListener('dragleave', e => { if (!el.contains(e.relatedTarget)) clearDrop(); });
  el.addEventListener('drop', async e => {
    e.preventDefault(); clearDrop();
    const t = targetOf(e), mv = e.dataTransfer.getData('text/x-tm-rel');
    if (mv) {
      if (!t.rel || t.rel === mv) return;
      try { await api.move(mv, t.rel); await changed(); } catch (err) { toast(err.message, true); }
    } else await upload(t.rel, [...e.dataTransfer.files].map(f => api.pathForFile(f)));
  });

  load();
  return { refresh: load };
}

/* ---------- task detail popup ---------- */
function openTask(id) {
  const t = data.tasks.find(x => x.id === id);
  if (!t) return;
  t.subtasks ||= [];
  const root = 'tasks/' + t.id;
  const openDetails = new Set();
  const { m, close, ov } = openModal(`
    <div class="modal-head"><input type="text" class="title-input" id="d-title" maxlength="200" value="${esc(t.title)}"><button class="icon-btn" data-x title="Close">${I.x}</button></div>
    <div class="meta-grid">
      <div><label class="f">STATUS</label><select id="d-status">${selectOpts(STATUS, t.status)}</select></div>
      <div><label class="f">PRIORITY</label><select id="d-prio">${selectOpts(PRIORITY, t.priority)}</select></div>
      <div><label class="f">DUE DATE</label><input type="date" id="d-due" value="${t.dueDate || ''}"></div>
      <div><label class="f">CREATED</label><input type="text" value="${esc(fmtDateTime(t.createdAt))}" disabled></div>
    </div>
    <div class="pop-body">
      <div class="pop-left">
        <div class="sec"><h4>Description</h4><textarea id="d-desc" class="notepad" placeholder="Write a description…  (Tab to indent · start a line with * or 1. for a list)">${esc(t.description || '')}</textarea></div>
        <div class="sec"><h4>Subtasks <span class="badge" id="sub-count"></span></h4><div id="d-subs"></div>
          <div class="add-row"><input type="text" id="new-sub" placeholder="Add a subtask and press Enter…"><button class="btn" id="add-sub">${I.plus} Add</button></div></div>
      </div>
      <div class="fwin" id="d-files"></div>
    </div>
    <div class="modal-foot"><button class="btn danger" id="d-del">${I.trash} Delete task</button><span class="sp"></span><span class="hint" id="saved">Changes save automatically</span><button class="btn primary" data-x>Done</button></div>`, 'wide');
  const touch = () => { save(); const s = $('#saved', m); if (s) s.textContent = 'Saved'; };
  $$('[data-x]', m).forEach(b => b.onclick = close);
  ov.addEventListener('closed', () => { if (!t.title.trim()) t.title = 'Untitled task'; save(); render(); });

  $('#d-title', m).oninput = e => { t.title = e.target.value; touch(); };
  $('#d-title', m).onblur = e => { if (!e.target.value.trim()) { e.target.value = t.title = 'Untitled task'; touch(); } };
  $('#d-status', m).onchange = e => { t.status = e.target.value; t.completedAt = t.status === 'done' ? new Date().toISOString() : null; touch(); };
  $('#d-prio', m).onchange = e => { t.priority = e.target.value; touch(); };
  $('#d-due', m).onchange = e => { t.dueDate = e.target.value || null; touch(); };
  const desc = $('#d-desc', m);
  attachNotepad(desc, { min: 150, max: 340 });
  desc.addEventListener('input', () => { t.description = desc.value; touch(); });

  const renderSubs = () => {
    const box = $('#d-subs', m);
    $('#sub-count', m).textContent = t.subtasks.length ? `${t.subtasks.filter(s => s.done).length}/${t.subtasks.length}` : '0';
    box.innerHTML = t.subtasks.map(s => `<div class="sub ${s.done ? 'done' : ''}" data-sid="${s.id}">
      <div class="r"><button class="check ${s.done ? 'on' : ''}" data-ck title="Mark done">${s.done ? I.check : ''}</button>
        <input type="text" data-st value="${esc(s.title)}" placeholder="Subtask title">
        <button class="btn sm detailsbtn ${openDetails.has(s.id) ? 'on' : ''}" data-dt title="Add or edit details">${I.note} Details${s.description && s.description.trim() && !openDetails.has(s.id) ? '<span class="dot"></span>' : ''}</button>
        <button class="icon-btn danger" data-rm title="Delete subtask">${I.trash}</button></div>
      ${openDetails.has(s.id) ? `<textarea data-sd class="notepad" placeholder="Write details…  (Tab to indent · start a line with * or 1. for a list)">${esc(s.description || '')}</textarea>` : ''}</div>`).join('');
    $$('.sub', box).forEach(el => {
      const s = t.subtasks.find(x => x.id === el.dataset.sid);
      $('[data-ck]', el).onclick = () => { s.done = !s.done; touch(); renderSubs(); };
      $('[data-st]', el).oninput = e => { s.title = e.target.value; touch(); };
      $('[data-rm]', el).onclick = () => { t.subtasks = t.subtasks.filter(x => x.id !== s.id); openDetails.delete(s.id); touch(); renderSubs(); };
      $('[data-dt]', el).onclick = () => { openDetails.has(s.id) ? openDetails.delete(s.id) : openDetails.add(s.id); renderSubs(); const ta = $(`[data-sid="${s.id}"] [data-sd]`, m); if (ta) { ta.focus(); ta.setSelectionRange(ta.value.length, ta.value.length); } };
      const sd = $('[data-sd]', el);
      if (sd) { attachNotepad(sd, { min: 110, max: 300 }); sd.addEventListener('input', () => { s.description = sd.value; touch(); }); }
    });
  };
  const addSub = () => {
    const inp = $('#new-sub', m), v = inp.value.trim();
    if (!v) return;
    t.subtasks.push({ id: uid(), title: v, description: '', done: false });
    inp.value = ''; touch(); renderSubs(); inp.focus();
  };
  $('#add-sub', m).onclick = addSub;
  $('#new-sub', m).onkeydown = e => { if (e.key === 'Enter') { e.preventDefault(); addSub(); } };

  mountBrowser($('#d-files', m), { root, title: 'Files', limit: TASK_LIMIT });

  $('#d-del', m).onclick = async () => {
    const n = taskFiles(t.id);
    if (!(await confirmBox(`Delete "${t.title}"${n ? ` and its ${n} attached file${n === 1 ? '' : 's'}` : ''}? This cannot be undone.`))) return;
    try { await window.api.remove(root); } catch (e) { return toast(e.message, true); }
    data.tasks = data.tasks.filter(x => x.id !== t.id);
    save(); await refreshStats(); close(); toast('Task deleted');
  };
  renderSubs();
}

/* ---------- files page ---------- */
function renderFiles() {
  $('#content').innerHTML = `<div class="files-page"><div class="fwin" id="fp"></div></div>`;
  mountBrowser($('#fp'), { root: null, title: 'All files', start: ui.fcwd || '', onNav: c => { ui.fcwd = c; } });
}

/* ---------- settings ---------- */
function renderSettings() {
  const s = settings();
  $('#content').innerHTML = `<div class="settings">
    <div class="panel"><h3>Appearance</h3><div class="line"><span class="grow">Theme</span>
      <select id="s-theme" style="width:160px"><option value="dark">Dark</option><option value="light">Light</option><option value="system">Match system</option></select></div></div>
    <div class="panel"><h3>Your data</h3>
      <div class="line"><span class="grow">Open the data folder in your file explorer</span><button class="btn" id="s-open">${I.folder} Show folder</button></div>
      <div class="line"><span class="grow">Export task list (CSV)</span><button class="btn" id="s-csv">${I.down} Export CSV</button></div>
      <div class="hint">Everything is stored in the <b>TaskMasterVault</b> folder inside your Documents. Tasks are in <b>data.json</b> and your attachments are normal files under <b>files</b>. To back up, copy the whole folder. Each task can hold up to 1 GB of files.</div></div>
    <div class="panel"><h3>Shortcuts</h3><div class="hint">Ctrl+N new task · / search · Esc close popup · In notes: Tab indents, <b>*</b> or <b>1.</b> starts a list and Enter continues it</div></div></div>`;
  $('#s-theme').value = s.theme || 'dark';
  $('#s-theme').onchange = e => { s.theme = e.target.value; applyTheme(); save(); };
  $('#s-open').onclick = () => window.api.revealData().catch(e => toast(e.message, true));
  $('#s-csv').onclick = async () => {
    const q = v => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const rows = [['Title', 'Status', 'Priority', 'Created', 'Due', 'Completed', 'Description', 'Subtasks (done/total)', 'Subtask list'].map(q).join(',')];
    data.tasks.forEach(t => rows.push([t.title, STATUS[t.status], PRIORITY[t.priority], t.createdAt, t.dueDate, t.completedAt, t.description,
    `${(t.subtasks || []).filter(x => x.done).length}/${(t.subtasks || []).length}`,
    (t.subtasks || []).map(x => `[${x.done ? 'x' : ' '}] ${x.title}${x.description ? ' – ' + x.description : ''}`).join('\n')].map(q).join(',')));
    try { const p = await window.api.exportText('tasks.csv', '﻿' + rows.join('\r\n')); if (p) toast('Exported to ' + p); } catch (e) { toast(e.message, true); }
  };
}

/* ---------- global keys ---------- */
document.addEventListener('keydown', e => {
  if (!data) return;
  if (e.key === 'Escape') { const o = topOverlay(); if (o) o._close(); return; }
  const typing = ['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName);
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'n' && !$('.overlay')) { e.preventDefault(); if (['home', 'completed', 'all'].includes(ui.view)) openNewTask(); }
  if (e.key === '/' && !typing && $('#q') && !$('.overlay')) { e.preventDefault(); $('#q').focus(); }
});

boot();
