'use strict';
/* ============================================================
   popup.js  -  the New task dialog and the task popup.

   labelInput()   the little "type a label and press Enter" field used by both dialogs
   openNewTask()  small dialog: heading, status, priority, due date, repeat, labels
   openTask(id)   large popup: properties, description, subtasks (each with Details) and the file window

   Styles: styles/popup.css. The property fields are .props (row 1) and .props.two (row 2).
   ============================================================ */

const cleanLabel = s => s.replace(/^#+/, '').trim().slice(0, 24);

/**
 * A chip input for labels. `labels` is an array that is edited in place; onChange() runs after every edit.
 * Typing shows suggestions from the labels already in use (the #dl-labels datalist).
 */
function labelInput(el, labels, onChange) {
  const paint = () => {
    el.innerHTML = labels.map((l, i) => `<span class="lbl ${labelClass(l)}">${esc(l)}<button type="button" data-rm="${i}" title="Remove label">${I.x}</button></span>`).join('') +
      `<input type="text" list="dl-labels" placeholder="${labels.length ? '' : 'Add a label'}" maxlength="24" aria-label="Add a label">`;
    const inp = $('input', el);
    const add = () => {
      const v = cleanLabel(inp.value);
      inp.value = '';
      if (!v || labels.some(l => l.toLowerCase() === v.toLowerCase())) return false;
      labels.push(v); onChange(); paint(); $('input', el).focus();
      return true;
    };
    inp.onkeydown = e => {
      if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); e.stopPropagation(); add(); }
      else if (e.key === 'Backspace' && !inp.value && labels.length) { labels.pop(); onChange(); paint(); $('input', el).focus(); }
    };
    inp.onchange = () => { if (inp.value) add(); };   // picking a suggestion from the datalist
    $$('[data-rm]', el).forEach(b => b.onclick = e => { e.stopPropagation(); labels.splice(+b.dataset.rm, 1); onChange(); paint(); });
  };
  el.onclick = e => { if (e.target === el) $('input', el)?.focus(); };
  paint();
}

/* ============ New task ============ */

function openNewTask() {
  const now = new Date().toISOString(), ctx = pageContext(), labels = [...(ctx.labels || [])];
  const { m, close } = openModal(`<div class="modal-head"><h3>New task</h3><button class="icon-btn" data-x title="Close">${I.x}</button></div>
    <div class="modal-body">
      <input type="text" id="nt-title" class="title-input" placeholder="What needs to be done?" maxlength="200" autocomplete="off">
      <div class="hint">Dates and tags work here too: “Send report friday !high #finance”.</div>
    </div>
    <div class="props">
      <div><label class="f">Status</label><select id="nt-status">${selectOpts(STATUS, 'todo')}</select></div>
      <div><label class="f">Priority</label><select id="nt-prio">${selectOpts(PRIORITY, 'medium')}</select></div>
      <div><label class="f">Due date</label><input type="date" id="nt-due" value="${ctx.dueDate || ''}"></div>
      <div><label class="f">Created</label><input type="text" value="${esc(fmtShort(now))}" disabled></div>
    </div>
    <div class="props two">
      <div><label class="f">Repeat</label><select id="nt-repeat">${selectOpts(REPEATS, '')}</select></div>
      <div><label class="f">Labels</label><div class="lblin" id="nt-labels"></div></div>
    </div>
    <div class="modal-foot"><span class="hint">After creating, click the task to add a description, subtasks and files.</span><span class="sp"></span><button class="btn" data-x>Cancel</button><button class="btn primary" id="nt-ok">Create task</button></div>`);
  $$('[data-x]', m).forEach(b => b.onclick = close);
  labelInput($('#nt-labels', m), labels, () => {});
  const title = $('#nt-title', m); title.focus();

  const create = () => {
    const p = TMParse.parseQuickAdd(title.value);
    if (!p.title) { title.focus(); title.style.borderColor = 'var(--danger)'; return; }
    const prio = $('#nt-prio', m).value, repeat = $('#nt-repeat', m).value;
    const t = addTask({
      title: p.title, status: $('#nt-status', m).value,
      priority: p.priority && prio === 'medium' ? p.priority : prio,
      dueDate: $('#nt-due', m).value || p.dueDate || null,
      repeat: repeat || p.repeat || null,
      labels: [...new Set([...labels, ...p.labels])], starred: !!ctx.starred
    });
    save(); close(); render(); toast(`Added “${shortTitle(t.title)}”`);
  };
  $('#nt-ok', m).onclick = create;
  m.onkeydown = e => { if (e.key === 'Enter' && e.target.tagName !== 'TEXTAREA' && !e.target.closest('.lblin')) create(); };
}

/* ============ Task popup ============ */

function openTask(id) {
  const t = findTask(id);
  if (!t) return;
  t.subtasks ||= []; t.labels ||= [];
  const root = 'tasks/' + t.id;
  const openDetails = new Set();            // subtasks whose Details box is open
  const { m, close, ov } = openModal(`
    <div class="modal-head"><input type="text" class="title-input" id="d-title" maxlength="200" value="${esc(t.title)}">
      <button class="icon-btn star ${t.starred ? 'on' : ''}" id="d-star" title="Star this task" style="opacity:1">${I.star}</button>
      <button class="icon-btn" data-x title="Close">${I.x}</button></div>
    <div class="props">
      <div><label class="f">Status</label><select id="d-status">${selectOpts(STATUS, t.status)}</select></div>
      <div><label class="f">Priority</label><select id="d-prio">${selectOpts(PRIORITY, t.priority)}</select></div>
      <div><label class="f">Due date</label><input type="date" id="d-due" value="${t.dueDate || ''}"></div>
      <div><label class="f">Created</label><input type="text" value="${esc(fmtDateTime(t.createdAt))}" disabled></div>
    </div>
    <div class="props two">
      <div><label class="f">Repeat</label><select id="d-repeat">${selectOpts(REPEATS, t.repeat || '')}</select></div>
      <div><label class="f">Labels</label><div class="lblin" id="d-labels"></div></div>
    </div>
    <div class="pop-body">
      <div class="pop-left">
        <div class="sec"><h4>Description</h4><textarea id="d-desc" class="notepad" placeholder="Write a description…  (Tab to indent, start a line with * or 1. for a list)">${esc(t.description || '')}</textarea></div>
        <div class="sec"><h4>Subtasks <span class="badge" id="sub-count"></span></h4><div id="d-subs"></div>
          <div class="add-row"><input type="text" id="new-sub" placeholder="Add a subtask and press Enter"><button class="btn" id="add-sub">${I.plus} Add</button></div></div>
      </div>
      <div class="fwin" id="d-files"></div>
    </div>
    <div class="modal-foot"><button class="btn danger" id="d-del">${I.trash} Delete</button><button class="btn" id="d-dup">${I.copy} Duplicate</button>
      <span class="sp"></span><span class="hint" id="saved">Changes save automatically</span><button class="btn primary" data-x>Done</button></div>`, 'wide');

  const touch = () => { save(); const s = $('#saved', m); if (s) s.textContent = 'Saved'; };
  $$('[data-x]', m).forEach(b => b.onclick = close);
  ov.addEventListener('closed', () => { if (!t.title.trim()) t.title = 'Untitled task'; save(); render(); });

  /* properties */
  $('#d-title', m).oninput = e => { t.title = e.target.value; touch(); };
  $('#d-title', m).onblur = e => { if (!e.target.value.trim()) { e.target.value = t.title = 'Untitled task'; touch(); } };
  $('#d-star', m).onclick = e => { t.starred = !t.starred; e.currentTarget.classList.toggle('on', t.starred); touch(); };
  $('#d-status', m).onchange = e => {
    const next = setStatus(t, e.target.value);
    touch();
    if (next) toast(`Done. The next one is due ${fmtShort(next.dueDate)}`);
    $('#d-repeat', m).value = t.repeat || '';
  };
  $('#d-prio', m).onchange = e => { t.priority = e.target.value; touch(); };
  $('#d-due', m).onchange = e => { t.dueDate = e.target.value || null; touch(); };
  $('#d-repeat', m).onchange = e => {
    t.repeat = e.target.value || null;
    if (t.repeat && !t.dueDate) { t.dueDate = todayStr(); $('#d-due', m).value = t.dueDate; }   // a repeating task needs a date to repeat from
    touch();
  };
  labelInput($('#d-labels', m), t.labels, touch);

  /* description */
  const desc = $('#d-desc', m);
  attachNotepad(desc, { min: 150, max: 340 });
  desc.addEventListener('input', () => { t.description = desc.value; touch(); });

  /* subtasks */
  const renderSubs = () => {
    const box = $('#d-subs', m);
    $('#sub-count', m).textContent = t.subtasks.length ? `${t.subtasks.filter(s => s.done).length}/${t.subtasks.length}` : '0';
    box.innerHTML = t.subtasks.map(s => `<div class="sub ${s.done ? 'done' : ''}" data-sid="${s.id}">
      <div class="r"><button class="ring" data-status="${s.done ? 'done' : 'todo'}" data-ck title="Mark done">${I.check}</button>
        <input type="text" data-st value="${esc(s.title)}" placeholder="Subtask title">
        <button class="btn sm detailsbtn ${openDetails.has(s.id) ? 'on' : ''}" data-dt title="Add or edit details">${I.note} Details${s.description && s.description.trim() && !openDetails.has(s.id) ? '<span class="dot"></span>' : ''}</button>
        <button class="icon-btn danger" data-rm title="Delete subtask">${I.trash}</button></div>
      ${openDetails.has(s.id) ? `<textarea data-sd class="notepad" placeholder="Write details…  (Tab to indent, start a line with * or 1. for a list)">${esc(s.description || '')}</textarea>` : ''}</div>`).join('');
    $$('.sub', box).forEach(el => {
      const s = t.subtasks.find(x => x.id === el.dataset.sid);
      $('[data-ck]', el).onclick = () => { s.done = !s.done; touch(); renderSubs(); };
      $('[data-st]', el).oninput = e => { s.title = e.target.value; touch(); };
      $('[data-rm]', el).onclick = () => { t.subtasks = t.subtasks.filter(x => x.id !== s.id); openDetails.delete(s.id); touch(); renderSubs(); };
      $('[data-dt]', el).onclick = () => {
        openDetails.has(s.id) ? openDetails.delete(s.id) : openDetails.add(s.id);
        renderSubs();
        const ta = $(`[data-sid="${s.id}"] [data-sd]`, m);
        if (ta) { ta.focus(); ta.setSelectionRange(ta.value.length, ta.value.length); }
      };
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
  renderSubs();

  /* files */
  mountBrowser($('#d-files', m), { root, title: 'Files', limit: TASK_LIMIT });

  /* footer actions */
  $('#d-dup', m).onclick = () => { const c = duplicateTask(t); save(); close(); toast(`Duplicated as “${shortTitle(c.title)}”`); };
  $('#d-del', m).onclick = async () => {
    const n = taskFiles(t.id);
    if (!(await confirmBox(`Delete "${t.title}"${n ? ` and its ${n} attached file${n === 1 ? '' : 's'}` : ''}? This cannot be undone.`))) return;
    try { await window.api.remove(root); } catch (e) { return toast(e.message, true); }
    data.tasks = data.tasks.filter(x => x.id !== t.id);
    save(); await refreshStats(); close(); toast('Task deleted');
  };
}
