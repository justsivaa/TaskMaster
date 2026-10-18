'use strict';
/* ============================================================
   views.js  -  the Board (kanban) and Calendar views.
   Both are drawn into #results by renderResults() in tasks.js.
   Styles: styles/views.css.

   Board     one column per status; drag a card to another column to change its status.
   Calendar  month grid; drag a task to another day to reschedule it, or onto the "No date" tray to clear its date.
   ============================================================ */

/* ============ Board ============ */

/** Which columns to show: Pending/Today/Upcoming never contain Done tasks, Completed only has Done. */
function boardColumns() {
  if (ui.nav === 'completed') return ['done'];
  return ['today', 'upcoming', 'open'].includes(ui.nav) ? ['todo', 'progress', 'hold'] : ['todo', 'progress', 'hold', 'done'];
}

function renderBoard(box, list) {
  const cols = boardColumns();
  box.innerHTML = `<div class="board">${cols.map(s => {
    const items = list.filter(t => t.status === s);
    return `<section class="bcol" data-col="${s}">
      <header class="bcol-head"><span class="ring" data-status="${s}" style="pointer-events:none"></span><h3>${STATUS[s]}</h3><span class="n">${items.length}</span></header>
      <div class="bcol-body">${items.map(bcardHtml).join('') || '<div class="bcol-empty">Drop a task here</div>'}</div>
      ${s === 'done' ? '' : `<div class="bcol-add"><input type="text" data-add="${s}" placeholder="Add to ${STATUS[s]}" autocomplete="off"></div>`}
    </section>`;
  }).join('')}</div>`;
  bindTaskClicks(box);

  // add a task straight into a column
  $$('[data-add]', box).forEach(inp => inp.onkeydown = e => {
    if (e.key !== 'Enter' || !inp.value.trim() || !TMParse.parseQuickAdd(inp.value).title) return;
    const status = inp.dataset.add, text = inp.value;
    withUndo(t => `Added “${shortTitle(t.title)}”`, () => createFromText(text, { status }));
    $(`[data-add="${status}"]`)?.focus();
  });

  // drag a card onto a column
  const cardOf = e => e.target.closest('.bcard');
  box.ondragstart = e => {
    const c = cardOf(e); if (!c) return;
    e.dataTransfer.setData('text/x-tm-task', c.dataset.id); e.dataTransfer.effectAllowed = 'move';
    c.classList.add('dragging');
  };
  box.ondragend = () => $$('.dragging,.drop-on', box).forEach(n => n.classList.remove('dragging', 'drop-on'));
  box.ondragover = e => {
    if (![...e.dataTransfer.types].includes('text/x-tm-task')) return;
    const col = e.target.closest('.bcol'); if (!col) return;
    e.preventDefault();
    $$('.drop-on', box).forEach(n => n !== col && n.classList.remove('drop-on'));
    col.classList.add('drop-on');
  };
  box.ondrop = e => {
    const col = e.target.closest('.bcol'), id = e.dataTransfer.getData('text/x-tm-task');
    $$('.drop-on', box).forEach(n => n.classList.remove('drop-on'));
    const t = id && findTask(id);
    if (!col || !t || t.status === col.dataset.col) return;
    e.preventDefault();
    withUndo(next => next ? `Done. The next one is due ${fmtShort(next.dueDate)}` : `Moved to ${STATUS[col.dataset.col]}`, () => setStatus(t, col.dataset.col));
  };
}

/* ============ Calendar ============ */

const monthKey = d => ymd(new Date(d.getFullYear(), d.getMonth(), 1));
const calItemHtml = t => `<div class="cal-item ${urgency(t)} ${t.status === 'done' ? 'is-done' : ''}" draggable="true" data-id="${t.id}" title="${esc(t.title)}"><span>${esc(t.title)}</span></div>`;

function renderCalendar(box, list) {
  const first = fromYmd(ui.calMonth || monthKey(new Date()));
  ui.calMonth = monthKey(first);
  const monthName = first.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
  // the grid starts on the first WEEK_START day on or before the 1st and always shows 6 weeks
  const start = addDays(ui.calMonth, -((first.getDay() - WEEK_START + 7) % 7));
  const days = Array.from({ length: 42 }, (_, i) => addDays(start, i));
  const byDay = new Map();
  for (const t of list) if (t.dueDate) (byDay.get(t.dueDate) || byDay.set(t.dueDate, []).get(t.dueDate)).push(t);
  const undated = list.filter(t => !t.dueDate && t.status !== 'done');
  const dow = Array.from({ length: 7 }, (_, i) => fromYmd(addDays(days[0], i)).toLocaleDateString(undefined, { weekday: 'short' }));
  const today = todayStr(), MAX = 3;

  box.innerHTML = `<div class="cal-wrap">
    <div class="cal">
      <div class="cal-head"><h2>${monthName}</h2><span class="grow"></span>
        <button class="icon-btn" data-m="-1" title="Previous month">${I.left}</button>
        <button class="btn sm" data-m="0">Today</button>
        <button class="icon-btn" data-m="1" title="Next month">${I.chev}</button></div>
      <div class="cal-dow">${dow.map(d => `<span>${d}</span>`).join('')}</div>
      <div class="cal-grid">${days.map(d => {
        const items = byDay.get(d) || [], open = ui.calOpen.has(d), shown = open ? items : items.slice(0, MAX);
        return `<div class="cal-day ${fromYmd(d).getMonth() !== first.getMonth() ? 'is-out' : ''} ${d === today ? 'is-today' : ''}" data-day="${d}">
          <div class="cal-top"><span class="cal-num">${fromYmd(d).getDate()}</span><button class="icon-btn cal-add" data-new="${d}" title="Add a task on ${fmtShort(d)}">${I.plus}</button></div>
          ${shown.map(calItemHtml).join('')}
          ${items.length > MAX ? `<button class="cal-more" data-more="${d}">${open ? 'Show less' : `+${items.length - MAX} more`}</button>` : ''}</div>`;
      }).join('')}</div>
    </div>
    <aside class="cal-tray" data-tray><h3>No date</h3><p class="hint">Drag a task onto a day to schedule it.</p>
      ${undated.map(calItemHtml).join('') || '<p class="hint">Every open task has a date.</p>'}</aside>
  </div>`;

  $$('[data-m]', box).forEach(b => b.onclick = () => {
    const n = +b.dataset.m;
    ui.calMonth = n === 0 ? monthKey(new Date()) : monthKey(new Date(first.getFullYear(), first.getMonth() + n, 1));
    renderCalendar(box, list);
  });
  box.onclick = async e => {
    const more = e.target.closest('[data-more]');
    if (more) { const d = more.dataset.more; ui.calOpen.has(d) ? ui.calOpen.delete(d) : ui.calOpen.add(d); return renderCalendar(box, list); }
    const add = e.target.closest('[data-new]');
    if (add) {
      const text = await askText(`New task on ${fmtShort(add.dataset.new)}`, '', 'What needs to be done?');
      if (text) withUndo(t => `Added “${shortTitle(t.title)}”`, () => createFromText(text, { dueDate: add.dataset.new }));
      return;
    }
    const item = e.target.closest('.cal-item');
    if (item) openTask(item.dataset.id);
  };

  // drag a task to another day (or to the tray to clear its date)
  box.ondragstart = e => {
    const c = e.target.closest('.cal-item'); if (!c) return;
    e.dataTransfer.setData('text/x-tm-task', c.dataset.id); e.dataTransfer.effectAllowed = 'move';
    c.classList.add('dragging');
  };
  box.ondragend = () => $$('.dragging,.drop-on', box).forEach(n => n.classList.remove('dragging', 'drop-on'));
  box.ondragover = e => {
    if (![...e.dataTransfer.types].includes('text/x-tm-task')) return;
    const target = e.target.closest('.cal-day, [data-tray]'); if (!target) return;
    e.preventDefault();
    $$('.drop-on', box).forEach(n => n !== target && n.classList.remove('drop-on'));
    target.classList.add('drop-on');
  };
  box.ondrop = e => {
    const target = e.target.closest('.cal-day, [data-tray]'), t = findTask(e.dataTransfer.getData('text/x-tm-task'));
    $$('.drop-on', box).forEach(n => n.classList.remove('drop-on'));
    if (!target || !t) return;
    e.preventDefault();
    const date = target.dataset.day || null;
    if ((t.dueDate || null) === date) return;
    withUndo(date ? `Moved to ${fmtShort(date)}` : 'Date cleared', () => { t.dueDate = date; });
  };
}
