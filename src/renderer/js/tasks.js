'use strict';
/* ============================================================
   tasks.js  -  the app shell and the task pages.

   What is in here (search for the section banners):
     1. Task operations     addTask, setStatus (repeating tasks), toggleDone, duplicateTask
     2. App shell           startApp, sidebar (renderNav), page header (renderHead), render()
     3. Lists and filters   which tasks a page shows, sorting, grouping
     4. Small HTML pieces   ring, star, priority bars, due chip, labels  (used by every view)
     5. Quick add bar       the "Add a task" box with live preview
     6. Runway              the 15-day strip
     7. Task page           toolbar + results for the List and Grid views (Board and Calendar are in views.js)

   Styles: styles/layout.css (shell), styles/tasks.css (everything on this page).
   ============================================================ */

/* ============ 1. Task operations ============ */

/** Create a task and add it to the list. Returns it. */
function addTask(f) {
  const now = new Date().toISOString();
  const t = {
    id: uid(), title: f.title, description: f.description || '', status: f.status || 'todo', priority: f.priority || 'medium',
    createdAt: now, dueDate: f.dueDate || null, completedAt: f.status === 'done' ? now : null,
    subtasks: [], labels: f.labels || [], repeat: f.repeat || null, starred: !!f.starred
  };
  data.tasks.push(t);
  return t;
}

/**
 * Change a task's status. Finishing a repeating task creates the next one (same title, subtasks reset,
 * due date moved on) and returns it, so the caller can say "next one is due ...".
 * The repeat rule moves to the new task, so finishing the old one twice can never create two copies.
 */
function setStatus(t, status) {
  if (t.status === status) return null;
  t.status = status;
  t.completedAt = status === 'done' ? new Date().toISOString() : null;
  if (status === 'done' && t.repeat) {
    const next = JSON.parse(JSON.stringify(t));
    Object.assign(next, {
      id: uid(), status: 'todo', completedAt: null, createdAt: new Date().toISOString(),
      dueDate: TMParse.nextDue(t.dueDate, t.repeat, todayStr()),
      subtasks: (t.subtasks || []).map(s => ({ ...s, id: uid(), done: false }))
    });
    t.repeat = null;
    data.tasks.push(next);
    return next;
  }
  return null;
}

/** The ring on a task: done <-> to do, with an Undo toast. */
function toggleDone(t) {
  const reopen = t.status === 'done';
  withUndo(next => reopen ? 'Moved back to To Do' : next ? `Done. The next one is due ${fmtShort(next.dueDate)}` : 'Marked as done',
    () => setStatus(t, reopen ? 'todo' : 'done'));
}

function duplicateTask(t) {
  const c = JSON.parse(JSON.stringify(t));
  Object.assign(c, {
    id: uid(), title: t.title + ' (copy)', status: 'todo', completedAt: null, createdAt: new Date().toISOString(),
    subtasks: (t.subtasks || []).map(s => ({ ...s, id: uid(), done: false }))
  });
  data.tasks.push(c);
  return c;
}

/** All labels in use: [{ name, count }], busiest first. count = open tasks with that label. */
function allLabels() {
  const m = new Map();
  for (const t of data.tasks) for (const l of t.labels || []) m.set(l, (m.get(l) || 0) + (t.status === 'done' ? 0 : 1));
  return [...m].map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
}

/** Make a task from text like "Send report friday !high #finance" (used by quick add, the palette and the board). */
function createFromText(text, extra = {}) {
  const p = TMParse.parseQuickAdd(text);
  if (!p.title) return null;
  const ctx = pageContext();
  return addTask({
    title: p.title, status: extra.status || 'todo', priority: p.priority || 'medium', repeat: p.repeat,
    dueDate: extra.dueDate ?? p.dueDate ?? ctx.dueDate ?? null,
    labels: [...new Set([...(ctx.labels || []), ...p.labels])], starred: !!ctx.starred
  });
}
/** New tasks inherit where you are: added on Today they are due today, added in a label they get that label. */
function pageContext() {
  const c = {};
  if (ui.nav === 'today') c.dueDate = todayStr();
  if (ui.nav === 'label') c.labels = [ui.label];
  if (ui.nav === 'starred') c.starred = true;
  if (ui.day) c.dueDate = ui.day;
  return c;
}
const shortTitle = s => s.length > 38 ? s.slice(0, 36) + '…' : s;

/* ============ 2. App shell ============ */

const NAV = [
  { id: 'today', label: 'Today', icon: 'today' },
  { id: 'upcoming', label: 'Upcoming', icon: 'upcoming' },
  { id: 'open', label: 'Pending', icon: 'home' },
  { id: 'starred', label: 'Starred', icon: 'star' },
  'sep',
  { id: 'completed', label: 'Completed', icon: 'circleCheck' },
  { id: 'all', label: 'All tasks', icon: 'all' },
  'sep',
  { id: 'files', label: 'Files', icon: 'folder' }
];
const TITLES = { today: 'Today', upcoming: 'Upcoming', open: 'Pending', starred: 'Starred', completed: 'Completed', all: 'All tasks', files: 'Files', settings: 'Settings' };
const TASK_NAVS = ['today', 'upcoming', 'open', 'starred', 'completed', 'all', 'label'];
const isTaskNav = () => TASK_NAVS.includes(ui.nav);

function startApp() {
  applyTheme();
  const app = $('#app');
  app.classList.remove('hidden');
  app.innerHTML = `
  <aside class="side">
    <div class="brand"><div class="logo"><img src="logo.png" alt=""></div><span>Task Master</span></div>
    <button class="side-jump" id="jump">${I.search}<span>Jump to…</span><span class="kbd">${MOD} K</span></button>
    <button class="btn primary side-new" id="side-new">${I.plus}<span>New task</span><span class="kbd">${MOD} N</span></button>
    <div class="nav-group" id="nav"></div>
    <div class="nav-labels nav-group" id="nav-labels"></div>
    <div class="grow"></div>
    <div id="nav-bottom"></div>
    <datalist id="dl-labels"></datalist>
  </aside>
  <section class="main">
    <header class="head" id="head"></header>
    <div class="page" id="page"></div>
  </section>`;
  $('#jump').onclick = () => openPalette();
  $('#side-new').onclick = () => openNewTask();
  $('.side', app).onclick = e => {
    const b = e.target.closest('[data-nav],[data-label]');
    if (!b) return;
    b.dataset.label ? go('label', b.dataset.label) : go(b.dataset.nav);
  };
  go(data.tasks.some(t => t.status !== 'done' && t.dueDate && t.dueDate <= todayStr()) ? 'today' : 'open');
}

/** Switch page. Resets filters so every page starts clean. */
function go(nav, label = null) {
  Object.assign(ui, { nav, label, status: 'all', prio: 'all', day: null, q: '', group: nav === 'upcoming' ? 'due' : 'none' });
  render();
}

function navCounts() {
  const t = todayStr(), open = data.tasks.filter(x => x.status !== 'done');
  return {
    today: open.filter(x => x.dueDate && x.dueDate <= t).length,
    upcoming: open.filter(x => x.dueDate && x.dueDate > t).length,
    open: open.length, starred: open.filter(x => x.starred).length,
    completed: data.tasks.length - open.length, all: data.tasks.length, files: totalFiles()
  };
}

function renderNav() {
  if (!$('#nav')) return;
  const c = navCounts();
  $('#nav').innerHTML = NAV.map(n => n === 'sep' ? '<div class="nav-sep"></div>' :
    `<button class="nav ${ui.nav === n.id ? 'active' : ''}" data-nav="${n.id}">${I[n.icon]}<span class="nt">${n.label}</span><span class="count ${n.id === 'today' && c.today ? 'hot' : ''}">${c[n.id] || ''}</span></button>`).join('');
  const labels = allLabels();
  $('#nav-labels').innerHTML = labels.length ? '<div class="nav-title">Labels</div>' + labels.slice(0, 8).map(l =>
    `<button class="nav ${ui.nav === 'label' && ui.label === l.name ? 'active' : ''}" data-label="${esc(l.name)}"><span class="dot ${labelClass(l.name)}"></span><span class="nt">${esc(l.name)}</span><span class="count">${l.count || ''}</span></button>`).join('') : '';
  $('#nav-bottom').innerHTML = `<button class="setbtn ${ui.nav === 'settings' ? 'active' : ''}" data-nav="settings" title="Settings">
    <span class="gear">${I.gear}</span><span><b>Settings</b><small>Theme, accent, reminders</small></span></button>`;
  $('#dl-labels').innerHTML = labels.map(l => `<option value="${esc(l.name)}">`).join('');
}

const VIEWS = [['list', 'List', 'list'], ['grid', 'Cards', 'grid'], ['board', 'Board', 'board'], ['calendar', 'Calendar', 'calView']];

function renderHead() {
  const title = ui.nav === 'label' ? '#' + ui.label : TITLES[ui.nav];
  const sub = { files: 'Everything attached to your tasks, in one place.', settings: 'Make Task Master yours.' }[ui.nav] || '';
  const v = currentView();
  $('#head').innerHTML = `<div><h1>${esc(title)}</h1><div class="sum" id="sum">${sub}</div></div>` + (isTaskNav() ?
    `<div class="tools"><div class="seg" role="tablist">${VIEWS.map(([k, l, ic], i) =>
      `<button data-view="${k}" class="${v === k ? 'on' : ''}" title="${l} (${i + 1})">${I[ic]}<span>${l}</span></button>`).join('')}</div></div>` : '');
  $$('[data-view]', $('#head')).forEach(b => b.onclick = () => { settings().view = b.dataset.view; save(); render(); });
}

function render() {
  if (!data || !$('#page')) return;
  renderNav();
  renderHead();
  if (isTaskNav()) renderTaskPage();
  else if (ui.nav === 'files') renderFiles();
  else renderSettings();
}

/* ============ 3. Lists and filters ============ */

/** The tasks that belong to the current page, before filters. */
function baseList() {
  const t = todayStr(), open = x => x.status !== 'done';
  switch (ui.nav) {
    case 'today': return data.tasks.filter(x => open(x) && x.dueDate && x.dueDate <= t);   // due today, plus anything overdue
    case 'upcoming': return data.tasks.filter(x => open(x) && x.dueDate && x.dueDate > t);
    case 'open': return data.tasks.filter(open);
    case 'starred': return data.tasks.filter(x => x.starred);
    case 'completed': return data.tasks.filter(x => !open(x));
    case 'label': return data.tasks.filter(x => (x.labels || []).includes(ui.label));
    default: return data.tasks.slice();
  }
}

/** Status chips offered on this page ("done" only where done tasks can appear). */
function statusChoices() {
  if (ui.nav === 'completed') return [];
  return ['today', 'upcoming', 'open'].includes(ui.nav) ? ['all', 'todo', 'progress', 'hold'] : ['all', 'todo', 'progress', 'hold', 'done'];
}

const SORTS = { due: 'Due date', priority: 'Priority', created: 'Newest', title: 'A to Z' };
function sortTasks(list) {
  const due = t => t.dueDate || '9999-12-31';
  const cmp = {
    due: (a, b) => due(a).localeCompare(due(b)) || PRIO_RANK[a.priority] - PRIO_RANK[b.priority],
    priority: (a, b) => PRIO_RANK[a.priority] - PRIO_RANK[b.priority] || due(a).localeCompare(due(b)),
    created: (a, b) => b.createdAt.localeCompare(a.createdAt),
    title: (a, b) => a.title.localeCompare(b.title)
  }[ui.sort];
  return list.sort(cmp);
}

function filteredTasks() {
  let list = baseList();
  if (ui.status !== 'all' && currentView() !== 'board') list = list.filter(t => t.status === ui.status);
  if (ui.prio !== 'all') list = list.filter(t => t.priority === ui.prio);
  if (ui.day) list = list.filter(t => t.dueDate === ui.day);
  const q = ui.q.trim().toLowerCase();
  if (q) list = list.filter(t => (t.title + ' ' + (t.description || '') + ' ' + (t.labels || []).join(' ') + ' ' +
    (t.subtasks || []).map(s => s.title + ' ' + (s.description || '')).join(' ')).toLowerCase().includes(q));
  return sortTasks(list);
}

/** Split a sorted list into titled groups: [{ label, color, tasks }] */
function groupTasks(list, by) {
  if (by === 'none') return [{ label: '', tasks: list }];
  const groups = new Map();
  const put = (key, label, color, rank, t) => {
    if (!groups.has(key)) groups.set(key, { label, color, rank, tasks: [] });
    groups.get(key).tasks.push(t);
  };
  for (const t of list) {
    if (by === 'due') {
      const d = t.dueDate ? dayDiff(t.dueDate) : null;
      if (t.status === 'done') put('done', 'Done', 'var(--st-done)', 6, t);
      else if (d === null) put('none', 'No date', 'var(--u-none)', 5, t);
      else if (d < 0) put('over', 'Overdue', 'var(--u-over)', 0, t);
      else if (d === 0) put('today', 'Today', 'var(--u-today)', 1, t);
      else if (d === 1) put('tom', 'Tomorrow', 'var(--u-soon)', 2, t);
      else if (d <= 7) put('week', 'Next 7 days', 'var(--u-week)', 3, t);
      else put('later', 'Later', 'var(--u-later)', 4, t);
    } else if (by === 'status') {
      put(t.status, STATUS[t.status], `var(--st-${t.status})`, Object.keys(STATUS).indexOf(t.status), t);
    } else if (by === 'priority') {
      put(t.priority, PRIORITY[t.priority], { high: 'var(--u-today)', medium: 'var(--st-hold)', low: 'var(--text-3)' }[t.priority], PRIO_RANK[t.priority], t);
    } else if (by === 'label') {
      const ls = (t.labels || []).length ? t.labels : [null];
      for (const l of ls) put(l || '\u0000', l || 'No label', l ? `var(--${labelClass(l)})` : 'var(--u-none)', l ? 0 : 1, t);
    }
  }
  return [...groups.values()].sort((a, b) => a.rank - b.rank || a.label.localeCompare(b.label));
}

/* ============ 4. Small HTML pieces (shared by List, Cards, Board, Calendar) ============ */

const ringHtml = t => `<button class="ring" data-status="${t.status}" data-chk title="${STATUS[t.status]}. Click to ${t.status === 'done' ? 'reopen' : 'mark done'}">${I.check}</button>`;
const starHtml = t => `<button class="icon-btn star ${t.starred ? 'on' : ''}" data-star title="${t.starred ? 'Remove star' : 'Star this task'}">${I.star}</button>`;
const prioHtml = t => `<span class="prio" data-p="${t.priority}" title="${PRIORITY[t.priority]} priority"><i></i><i></i><i></i></span>`;
const dueChip = t => t.dueDate ? `<span class="due">${t.repeat ? I.repeat : I.clock}${dueText(t)}</span>` : '';
const subsHtml = t => { const s = t.subtasks || []; return s.length ? `<span class="meta-n" title="Subtasks done">${I.sub}${s.filter(x => x.done).length}/${s.length}</span>` : '<span></span>'; };
const filesHtml = t => { const n = taskFiles(t.id); return n ? `<span class="meta-n" title="Attached files">${I.clip}${n}</span>` : '<span></span>'; };
const labelsHtml = (labels = [], max = 3) => labels.slice(0, max).map(l => `<span class="lbl ${labelClass(l)}">${esc(l)}</span>`).join('') +
  (labels.length > max ? `<span class="lbl">+${labels.length - max}</span>` : '');

/** List view: one row. Eight cells in a fixed order so every row lines up (columns are set in styles/tasks.css). */
const rowHtml = t => `<div class="trow ${urgency(t)} ${t.status === 'done' ? 'is-done' : ''}" data-id="${t.id}">
  ${ringHtml(t)}<div class="t-title" title="${esc(t.title)}">${esc(t.title)}</div>
  <div class="t-labels">${labelsHtml(t.labels)}</div><div>${dueChip(t)}</div>${subsHtml(t)}${filesHtml(t)}${prioHtml(t)}${starHtml(t)}</div>`;

/** Cards view: every card is the same height (--card-h). */
const cardHtml = t => `<div class="tcard ${urgency(t)} ${t.status === 'done' ? 'is-done' : ''}" data-id="${t.id}">
  <div class="tc-head">${ringHtml(t)}<h3 class="tc-title" title="${esc(t.title)}">${esc(t.title)}</h3>${starHtml(t)}</div>
  ${t.description ? `<p class="tc-desc">${esc(t.description)}</p>` : ''}
  ${(t.labels || []).length ? `<div class="tc-labels">${labelsHtml(t.labels, 4)}</div>` : ''}
  <div class="tc-foot">${t.status !== 'todo' && t.status !== 'done' ? `<span class="st-chip" data-status="${t.status}">${STATUS[t.status]}</span>` : ''}${dueChip(t)}<span class="grow"></span>
    ${(t.subtasks || []).length ? subsHtml(t) : ''}${taskFiles(t.id) ? filesHtml(t) : ''}${prioHtml(t)}</div></div>`;

/** Board card (used by views.js) */
const bcardHtml = t => `<div class="bcard ${urgency(t)} ${t.status === 'done' ? 'is-done' : ''}" draggable="true" data-id="${t.id}">
  <div class="bc-top">${ringHtml(t)}<p class="bc-title" title="${esc(t.title)}">${esc(t.title)}</p>${starHtml(t)}</div>
  ${(t.labels || []).length ? `<div class="tc-labels">${labelsHtml(t.labels, 3)}</div>` : ''}
  <div class="bc-foot">${dueChip(t)}${(t.subtasks || []).length ? subsHtml(t) : ''}${taskFiles(t.id) ? filesHtml(t) : ''}<span class="grow"></span>${prioHtml(t)}</div></div>`;

/** Clicks inside a results area: ring = done, star = star, anywhere else on a task = open it. */
function bindTaskClicks(box) {
  box.onclick = e => {
    const el = e.target.closest('[data-id]');
    if (!el) return;
    const t = findTask(el.dataset.id);
    if (!t) return;
    if (e.target.closest('[data-chk]')) { e.stopPropagation(); return toggleDone(t); }
    if (e.target.closest('[data-star]')) { e.stopPropagation(); t.starred = !t.starred; save(); render(); return; }
    openTask(t.id);
  };
}

/* ============ 5. Quick add bar ============ */

const qaHtml = () => `<div class="qa"><div class="qa-box">${I.plus}
  <input type="text" id="qa-in" autocomplete="off" placeholder="Add a task. Try: Send report friday !high #finance">
  <span class="hint"><span class="kbd">Enter</span> to add</span></div><div class="qa-preview" id="qa-pv"></div></div>`;

/** The chips under the quick add box that show what the words were understood as. */
function previewHtml(p) {
  if (!p.hits.length) return '';
  const bits = [];
  if (p.dueDate) bits.push(`<span class="tag">${I.cal}${fmtShort(p.dueDate)}</span>`);
  if (p.repeat) bits.push(`<span class="tag">${I.repeat}${REPEATS[p.repeat]}</span>`);
  if (p.priority) bits.push(`<span class="tag"><span class="prio" data-p="${p.priority}"><i></i><i></i><i></i></span>${PRIORITY[p.priority]}</span>`);
  p.labels.forEach(l => bits.push(`<span class="lbl ${labelClass(l)}">${esc(l)}</span>`));
  return bits.join('');
}

function bindQuickAdd() {
  const inp = $('#qa-in');
  if (!inp) return;
  inp.oninput = () => { $('#qa-pv').innerHTML = previewHtml(TMParse.parseQuickAdd(inp.value)); };
  inp.onkeydown = e => {
    if (e.key !== 'Enter' || e.isComposing) return;
    e.preventDefault();
    if (!inp.value.trim() || !TMParse.parseQuickAdd(inp.value).title) return;
    withUndo(t => `Added “${shortTitle(t.title)}”`, () => createFromText(inp.value));
    $('#qa-in')?.focus();
  };
}

/* ============ 6. Runway: the next 15 days at a glance ============ */

function runwayHtml() {
  const t0 = todayStr(), counts = new Map();
  for (const t of data.tasks) if (t.status !== 'done' && t.dueDate) counts.set(t.dueDate, (counts.get(t.dueDate) || 0) + 1);
  const cols = Array.from({ length: 15 }, (_, i) => {
    const date = addDays(t0, i), n = counts.get(date) || 0, dow = fromYmd(date).getDay();
    const label = i === 0 ? 'Today' : fromYmd(date).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric' });
    return `<button class="rw-col ${urgForDays(i)} ${n ? '' : 'no-tasks'} ${ui.day === date ? 'on' : ''} ${i === 0 ? 'is-today' : ''} ${dow === 0 || dow === 6 ? 'is-weekend' : ''}"
      style="--i:${i};--h:${Math.min(46, 8 + n * 10)}px" data-day="${date}" title="${n} due ${fmtShort(date)}">
      <span class="rw-n">${n || ''}</span><span class="rw-bar"></span><span class="rw-lab">${label}</span></button>`;
  }).join('');
  const enter = ui.runwayShown ? '' : ' enter';
  ui.runwayShown = true;
  return `<div class="runway${enter}">${cols}</div>`;
}

/* ============ 7. The task page: toolbar and results ============ */

function emptyHtml() {
  const filtered = ui.q || ui.status !== 'all' || ui.prio !== 'all' || ui.day;
  const [icon, h, p] = filtered ? [I.search, 'No matching tasks', 'Try changing the filters.'] : {
    today: [I.today, 'Nothing due today', 'Add a task above and it will be due today.'],
    upcoming: [I.upcoming, 'Nothing coming up', 'Tasks with a future due date show up here.'],
    open: [I.circleCheck, 'You are all caught up', 'Type a task in the box above to add one.'],
    starred: [I.star, 'No starred tasks', 'Click the star on a task to keep it here.'],
    completed: [I.circleCheck, 'Nothing completed yet', 'Finished tasks appear here.'],
    all: [I.all, 'No tasks yet', 'Type a task in the box above to add one.'],
    label: [I.tag, 'No tasks with this label', 'Add the label to a task from its popup.']
  }[ui.nav];
  return `<div class="empty"><div class="orb">${icon}</div><h3>${h}</h3><p>${p}</p></div>`;
}

function summaryHtml(list) {
  const t = todayStr(), open = list.filter(x => x.status !== 'done');
  const over = open.filter(x => x.dueDate && x.dueDate < t).length;
  const parts = [`<b>${list.length}</b> ${list.length === 1 ? 'task' : 'tasks'}`];
  if (over) parts.push(`<b>${over}</b> overdue`);
  if (ui.nav === 'today') {
    const done = data.tasks.filter(x => x.completedAt && ymd(new Date(x.completedAt)) === t).length;
    if (done) parts.push(`<b>${done}</b> done today`);
  }
  return parts.join(', ');
}

function renderTaskPage() {
  const page = $('#page'), scroll = page.scrollTop, v = currentView();
  page.className = 'page';
  const showRunway = ['open', 'upcoming'].includes(ui.nav) && v !== 'calendar';
  const chips = v === 'board' ? [] : statusChoices();
  page.innerHTML = `
    ${ui.nav !== 'completed' ? qaHtml() : ''}
    ${showRunway ? runwayHtml() : ''}
    <div class="toolbar">
      ${chips.map(s => `<button class="chip ${ui.status === s ? 'on' : ''}" data-s="${s}">${s === 'all' ? 'All' : STATUS[s]}</button>`).join('')}
      ${ui.day ? `<button class="chip on" id="clear-day" title="Show all days">${fmtShort(ui.day)}${iconX}</button>` : ''}
      <span class="grow"></span>
      <div class="search">${I.search}<input type="text" id="q" placeholder="Filter tasks  ( / )" value="${esc(ui.q)}"></div>
      <select id="f-prio" title="Priority"><option value="all">Any priority</option>${selectOpts(PRIORITY, ui.prio)}</select>
      <select id="f-sort" title="Sort">${selectOpts(SORTS, ui.sort)}</select>
      ${v === 'list' || v === 'grid' ? `<select id="f-group" title="Group by">${selectOpts({ none: 'No grouping', due: 'Group by due date', status: 'Group by status', priority: 'Group by priority', label: 'Group by label' }, ui.group)}</select>` : ''}
    </div>
    <div id="results"></div>`;
  bindQuickAdd();
  $$('.chip[data-s]', page).forEach(c => c.onclick = () => { ui.status = c.dataset.s; renderTaskPage(); });
  $$('.rw-col', page).forEach(c => c.onclick = () => { ui.day = ui.day === c.dataset.day ? null : c.dataset.day; renderTaskPage(); });
  const cd = $('#clear-day'); if (cd) cd.onclick = () => { ui.day = null; renderTaskPage(); };
  $('#q').oninput = e => { ui.q = e.target.value; renderResults(); };
  $('#f-prio').onchange = e => { ui.prio = e.target.value; renderResults(); };
  $('#f-sort').onchange = e => { ui.sort = e.target.value; renderResults(); };
  const g = $('#f-group'); if (g) g.onchange = e => { ui.group = e.target.value; renderResults(); };
  renderResults();
  page.scrollTop = scroll;
}

function renderResults() {
  const box = $('#results'), list = filteredTasks(), v = currentView();
  $('#sum').innerHTML = summaryHtml(list);
  if (v === 'board') return renderBoard(box, list);
  if (v === 'calendar') return renderCalendar(box, list);
  if (!list.length) { box.innerHTML = emptyHtml(); box.onclick = null; return; }
  const kind = v === 'grid' ? 't-grid' : 't-list', one = v === 'grid' ? cardHtml : rowHtml;
  const groups = groupTasks(list, ui.group);
  box.innerHTML = groups.map(g => g.label ?
    `<section class="grp"><h3 class="grp-head" style="--g:${g.color}">${esc(g.label)}<span class="n">${g.tasks.length}</span></h3><div class="${kind}">${g.tasks.map(one).join('')}</div></section>` :
    `<div class="${kind}">${g.tasks.map(one).join('')}</div>`).join('');
  bindTaskClicks(box);
}
