'use strict';
/* ============================================================
   core.js  -  shared helpers, icons, constants, app state, toasts and dialogs.

   The renderer is plain browser JavaScript (no bundler). Every file is a classic <script>, so the
   functions below are global and every other file can call them directly.

   LOAD ORDER (see index.html)
     js/guard.js     shows an error on screen if a file is missing or a script crashes
     js/parse.js     dates + quick-add parser (pure, unit-tested)
     js/core.js      this file
     js/notepad.js   keyboard-only list/indent behaviour for text areas
     js/files.js     the file window (task attachments + Files page)
     js/tasks.js     sidebar, page header, quick add, runway, List and Grid views
     js/views.js     Board and Calendar views
     js/popup.js     New task dialog and the task popup
     js/palette.js   Ctrl+K command palette and global keyboard shortcuts
     js/settings.js  Settings page, CSV export, daily reminder
     app.js          start-up (loads data, then draws everything)
   ============================================================ */

/* ---------- tiny DOM helpers ---------- */
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const uid = () => (crypto.randomUUID ? crypto.randomUUID() : String(Date.now()) + Math.random().toString(16).slice(2));
const MOD = /Mac/i.test(navigator.platform) ? '⌘' : 'Ctrl';     // shown in shortcut hints

/* ---------- icons (24px, drawn with the current text colour) ---------- */
const svg = body => `<svg viewBox="0 0 24 24">${body}</svg>`;
const I = {
  lock: svg('<rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>'),
  list: svg('<path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/>'),
  grid: svg('<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>'),
  board: svg('<rect x="3" y="4" width="5" height="16" rx="1.5"/><rect x="10" y="4" width="5" height="10" rx="1.5"/><rect x="17" y="4" width="4" height="13" rx="1.5"/>'),
  calView: svg('<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4M8 14h.01M12 14h.01M16 14h.01M8 18h.01M12 18h.01"/>'),
  home: svg('<path d="M3 11l9-8 9 8v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/>'),
  today: svg('<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>'),
  upcoming: svg('<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4M8 15h5"/>'),
  check: svg('<path d="M5 13l4 4L19 7"/>'),
  circleCheck: svg('<circle cx="12" cy="12" r="9"/><path d="M8 12l3 3 5-6"/>'),
  all: svg('<path d="M4 6h16M4 12h16M4 18h10"/>'),
  folder: svg('<path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>'),
  gear: svg('<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>'),
  plus: svg('<path d="M12 5v14M5 12h14"/>'),
  search: svg('<circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/>'),
  x: svg('<path d="M6 6l12 12M18 6L6 18"/>'),
  trash: svg('<path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14"/>'),
  chev: svg('<path d="M9 6l6 6-6 6"/>'),
  left: svg('<path d="M15 6l-6 6 6 6"/>'),
  clock: svg('<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>'),
  clip: svg('<path d="M21 12l-8.5 8.5a5 5 0 0 1-7-7L14 5a3.5 3.5 0 0 1 5 5l-8.5 8.5a2 2 0 0 1-3-3L15 7"/>'),
  sub: svg('<path d="M5 4v8a3 3 0 0 0 3 3h11M15 11l4 4-4 4"/>'),
  down: svg('<path d="M12 4v11M7 11l5 5 5-5M5 20h14"/>'),
  up: svg('<path d="M12 16V5M7 9l5-5 5 5M5 20h14"/>'),
  open: svg('<path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"/>'),
  move: svg('<path d="M5 9l-3 3 3 3M9 5l3-3 3 3M15 19l-3 3-3-3M19 9l3 3-3 3M2 12h20M12 2v20"/>'),
  edit: svg('<path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/>'),
  cal: svg('<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>'),
  star: svg('<path d="M12 3.5l2.6 5.4 5.9.8-4.3 4.1 1 5.9L12 16.9l-5.2 2.8 1-5.9-4.3-4.1 5.9-.8z"/>'),
  repeat: svg('<path d="M17 2l4 4-4 4M3 11V9a3 3 0 0 1 3-3h15M7 22l-4-4 4-4M21 13v2a3 3 0 0 1-3 3H3"/>'),
  tag: svg('<path d="M20.6 13.4l-7.2 7.2a2 2 0 0 1-2.8 0L3 13V3h10l7.6 7.6a2 2 0 0 1 0 2.8z"/><path d="M7.5 7.5h.01"/>'),
  copy: svg('<rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V6a2 2 0 0 1 2-2h9"/>'),
  bell: svg('<path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9M13.7 21a2 2 0 0 1-3.4 0"/>'),
  keys: svg('<rect x="2" y="6" width="20" height="12" rx="2"/><path d="M6 10h.01M10 10h.01M14 10h.01M18 10h.01M7 14h10"/>'),
  back: svg('<path d="M19 12H5M11 6l-6 6 6 6"/>'),
  folderUp: svg('<path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><path d="M12 16v-5M9.5 13.5L12 11l2.5 2.5"/>'),
  folderPlus: svg('<path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><path d="M12 10.5v5M9.5 13h5"/>'),
  note: svg('<path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><path d="M14 3v6h6M8 13h8M8 17h5"/>')
};
const iconX = I.x.replace('<svg', '<svg class="x"');   // the small x inside removable chips

/* ---------- constants ---------- */
const STATUS = { todo: 'To Do', progress: 'In Progress', hold: 'On Hold', done: 'Done' };
const PRIORITY = { high: 'High', medium: 'Medium', low: 'Low' };
const PRIO_RANK = { high: 0, medium: 1, low: 2 };
const REPEATS = { '': 'Does not repeat', daily: 'Every day', weekdays: 'Every weekday', weekly: 'Every week', monthly: 'Every month' };
const WEEK_START = 1;                 // calendar week starts on: 0 = Sunday, 1 = Monday
let TASK_LIMIT = 1024 ** 3;           // attachments per task (the real value is read from the backend at start-up)

/* ---------- dates and formatting ---------- */
const { ymd, fromYmd, addDays } = TMParse;
const todayStr = () => ymd(new Date());
const dayDiff = s => Math.round((fromYmd(s.slice(0, 10)) - fromYmd(todayStr())) / 864e5);   // days from today (negative = past)
const fmtDate = s => s ? new Date(s.length === 10 ? s + 'T00:00:00' : s).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }) : '';
const fmtDateTime = s => new Date(s).toLocaleString(undefined, { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' });
/** "Fri 23 Oct" (the year is added only when it is not this year) */
const fmtShort = s => {
  const d = fromYmd(s.slice(0, 10)), o = { weekday: 'short', day: 'numeric', month: 'short' };
  if (d.getFullYear() !== new Date().getFullYear()) o.year = 'numeric';
  return d.toLocaleDateString(undefined, o);
};
const fmtSize = n => n < 1024 ? n + ' B' : n < 1048576 ? (n / 1024).toFixed(1) + ' KB' : n < 1073741824 ? (n / 1048576).toFixed(1) + ' MB' : (n / 1073741824).toFixed(2) + ' GB';
const extOf = n => (n.includes('.') ? n.split('.').pop() : 'file').slice(0, 4);
const EXT_COLOR = { pdf: '#ff5d6c', doc: '#4da3ff', docx: '#4da3ff', xls: '#2fbf71', xlsx: '#2fbf71', csv: '#2fbf71', ppt: '#f5a524', pptx: '#f5a524', png: '#b06cff', jpg: '#b06cff', jpeg: '#b06cff', gif: '#b06cff', zip: '#8b92a5', rar: '#8b92a5', txt: '#8b92a5', mp4: '#ff7ac6' };
const extColor = n => EXT_COLOR[extOf(n).toLowerCase()] || 'var(--accent)';

/* ---------- the deadline spectrum ----------
   Every task gets one urgency class (u-over, u-today, u-soon, u-week, u-later, u-none, u-done).
   The colours behind them are the --u-* tokens in styles/tokens.css. */
const urgForDays = d => d < 0 ? 'u-over' : d === 0 ? 'u-today' : d <= 2 ? 'u-soon' : d <= 7 ? 'u-week' : 'u-later';
const urgency = t => t.status === 'done' ? 'u-done' : !t.dueDate ? 'u-none' : urgForDays(dayDiff(t.dueDate));
/** The words shown in a due chip */
function dueText(t) {
  if (!t.dueDate) return '';
  if (t.status === 'done') return fmtShort(t.dueDate);
  const d = dayDiff(t.dueDate);
  return d < -1 ? `${-d}d overdue` : d === -1 ? 'Yesterday' : d === 0 ? 'Today' : d === 1 ? 'Tomorrow' : fmtShort(t.dueDate);
}
/** A label always gets the same colour: hash its name into lb-1 ... lb-8 (colours are --lb-* tokens). */
function labelClass(name) { let h = 0; for (const c of String(name)) h = (h * 31 + c.charCodeAt(0)) >>> 0; return 'lb-' + (h % 8 + 1); }

/* ---------- app state ---------- */
let data = null;                       // { tasks: [...], settings: {...} }  (saved to data.json)
const ui = {                           // what is on screen right now (not saved)
  nav: 'today',                        // today | upcoming | open | starred | completed | all | label | files | settings
  label: null, status: 'all', prio: 'all', sort: 'due', group: 'none', q: '', day: null,
  calMonth: null, calOpen: new Set(), fcwd: '', runwayShown: false
};
let saveTimer = null;
const settings = () => (data.settings ||= {});
const currentView = () => settings().view || 'list';             // list | grid | board | calendar
const findTask = id => data.tasks.find(t => t.id === id);

function save(now) {
  clearTimeout(saveTimer);
  const run = () => window.api.saveData(data).catch(e => toast('Save failed: ' + e.message, true));
  if (now) return run();
  saveTimer = setTimeout(run, 350);
}

/* ---------- undo ----------
   Wrap any change to the task list in withUndo(): it saves, redraws, and shows a toast with an Undo button.
   Undo puts the whole task list back as it was. (Attached files are never touched.) */
function withUndo(message, change) {
  const before = JSON.stringify(data.tasks);
  const result = change();
  save(); render();
  toast(typeof message === 'function' ? message(result) : message, false, {
    label: 'Undo', run() { data.tasks = JSON.parse(before); save(); render(); }
  });
  return result;
}

/* ---------- toasts ---------- */
function toast(msg, isErr = false, action = null) {
  const el = document.createElement('div');
  el.className = 'toast' + (isErr ? ' err' : '');
  const text = document.createElement('span'); text.textContent = msg; el.appendChild(text);
  if (action) {
    const b = document.createElement('button'); b.textContent = action.label;
    b.onclick = () => { el.remove(); action.run(); };
    el.appendChild(b);
  }
  const box = $('#toasts');
  while (box.children.length >= 3) box.firstChild.remove();
  box.appendChild(el);
  setTimeout(() => el.remove(), isErr ? 5000 : action ? 7000 : 2800);
}

/* ---------- theme ---------- */
function applyTheme() {
  const s = data?.settings || {};
  const t = s.theme || 'dark';
  const eff = t === 'system' ? (matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark') : t;
  document.documentElement.dataset.theme = eff;
  document.documentElement.dataset.accent = s.accent || 'violet';
  // tell the window to colour its minimise / maximise / close buttons to match
  const css = getComputedStyle(document.documentElement);
  window.api?.setTheme?.(css.getPropertyValue('--bg').trim(), css.getPropertyValue('--text').trim()).catch(() => {});
}

/* ---------- dialogs ---------- */
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

const selectOpts = (map, cur) => Object.entries(map).map(([k, v]) => `<option value="${k}" ${k === cur ? 'selected' : ''}>${v}</option>`).join('');
