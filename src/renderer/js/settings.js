'use strict';
/* ============================================================
   settings.js  -  the Settings page, CSV export and the daily reminder.
   Styles: styles/pages.css (section 2). Accent colours: the [data-accent] blocks at the bottom of styles/tokens.css.
   ============================================================ */

/** Accent choices. `c` is only the swatch colour, the real colours live in tokens.css. */
const ACCENTS = [['violet', 'Violet', '#7c66ff'], ['blue', 'Blue', '#3f74ff'], ['magenta', 'Magenta', '#d4338f'], ['emerald', 'Emerald', '#0e9f6e']];

const SHORTCUTS = [
  [[MOD, 'K'], 'Search, jump to a page or add a task'],
  [[MOD, 'N'], 'New task (full form)'],
  [['N'], 'Focus the quick add box'],
  [['/'], 'Filter the tasks on this page'],
  [['1', '2', '3', '4'], 'List, Cards, Board, Calendar'],
  [['Esc'], 'Close a dialog'],
  [['Tab'], 'In notes: indent a line'],
  [['*', 'Space'], 'In notes: start a bullet list (or type 1.)']
];

function renderSettings() {
  const s = settings(), r = s.remind || {};
  const page = $('#page');
  page.className = 'page';
  page.innerHTML = `<div class="settings">
    <div class="panel"><h3>Appearance</h3>
      <div class="row"><div class="text"><b>Theme</b><small>Dark, light, or follow your computer.</small></div>
        <select id="s-theme"><option value="dark">Dark</option><option value="light">Light</option><option value="system">Match system</option></select></div>
      <div class="row"><div class="text"><b>Accent colour</b><small>Used for buttons, focus and selected items.</small></div>
        <div class="swatches">${ACCENTS.map(([k, l, c]) => `<button class="sw ${(s.accent || 'violet') === k ? 'on' : ''}" style="--c:${c}" data-accent="${k}" title="${l}" aria-label="${l}"></button>`).join('')}</div></div>
    </div>
    <div class="panel"><h3>Reminders</h3>
      <div class="row"><div class="text"><b>Daily reminder</b><small>A desktop notification listing what is due today or overdue.</small></div>
        <button class="switch" id="s-remind" role="switch" aria-checked="${!!r.on}" aria-label="Daily reminder"></button></div>
      <div class="row"><div class="text"><b>Remind me at</b><small>Task Master has to be running (minimised is fine).</small></div>
        <input type="time" id="s-time" value="${r.time || '09:00'}"></div>
    </div>
    <div class="panel"><h3>Your data</h3>
      <div class="row"><div class="text"><b>Data folder</b><small>Tasks are in data.json, attachments are normal files. Copy the folder to back up.</small></div><button class="btn" id="s-open">${I.folder} Show folder</button></div>
      <div class="row"><div class="text"><b>Export task list</b><small>A spreadsheet-friendly CSV of every task.</small></div><button class="btn" id="s-csv">${I.down} Export CSV</button></div>
      <div class="note">Everything is stored in the <b>TaskMasterVault</b> folder in your Documents. Each task can hold up to 1 GB of files.</div>
    </div>
    <div class="panel"><h3>Keyboard shortcuts</h3>
      <dl class="keys">${SHORTCUTS.map(([k, d]) => `<dt>${k.map(x => `<span class="kbd">${x}</span>`).join('')}</dt><dd>${d}</dd>`).join('')}</dl></div>
  </div>`;

  $('#s-theme').value = s.theme || 'dark';
  $('#s-theme').onchange = e => { s.theme = e.target.value; applyTheme(); save(); };
  $$('[data-accent]', page).forEach(b => b.onclick = () => {
    s.accent = b.dataset.accent; applyTheme(); save();
    $$('[data-accent]', page).forEach(x => x.classList.toggle('on', x === b));
  });
  $('#s-remind').onclick = async e => {
    const on = e.currentTarget.getAttribute('aria-checked') !== 'true';
    if (on && 'Notification' in window && Notification.permission === 'default') await Notification.requestPermission().catch(() => {});
    s.remind = { time: '09:00', ...s.remind, on };
    e.currentTarget.setAttribute('aria-checked', String(on));
    save();
    if (on) toast('Daily reminder is on');
  };
  $('#s-time').onchange = e => { s.remind = { ...s.remind, time: e.target.value || '09:00' }; save(); };
  $('#s-open').onclick = () => window.api.revealData().catch(e => toast(e.message, true));
  $('#s-csv').onclick = exportCsv;
}

async function exportCsv() {
  const q = v => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const rows = [['Title', 'Status', 'Priority', 'Created', 'Due', 'Completed', 'Repeat', 'Labels', 'Starred', 'Description', 'Subtasks (done/total)', 'Subtask list'].map(q).join(',')];
  data.tasks.forEach(t => rows.push([t.title, STATUS[t.status], PRIORITY[t.priority], t.createdAt, t.dueDate, t.completedAt, REPEATS[t.repeat || ''],
    (t.labels || []).join('; '), t.starred ? 'Yes' : '', t.description,
    `${(t.subtasks || []).filter(x => x.done).length}/${(t.subtasks || []).length}`,
    (t.subtasks || []).map(x => `[${x.done ? 'x' : ' '}] ${x.title}${x.description ? ' - ' + x.description : ''}`).join('\n')].map(q).join(',')));
  try { const p = await window.api.exportText('tasks.csv', '﻿' + rows.join('\r\n')); if (p) toast('Exported to ' + p); } catch (e) { toast(e.message, true); }
}

/* ============ Daily reminder ============
   Checked every 30 seconds. Fires once per day, at or after the chosen time. */
function checkReminder() {
  const r = data?.settings?.remind;
  if (!r || !r.on || !('Notification' in window) || Notification.permission !== 'granted') return;
  const now = new Date(), hhmm = String(now.getHours()).padStart(2, '0') + ':' + String(now.getMinutes()).padStart(2, '0');
  if (hhmm < (r.time || '09:00') || data.settings.lastRemind === todayStr()) return;
  const t = todayStr(), due = data.tasks.filter(x => x.status !== 'done' && x.dueDate && x.dueDate <= t);
  data.settings.lastRemind = t; save();
  if (!due.length) return;
  const over = due.filter(x => x.dueDate < t).length;
  new Notification('Task Master', {
    body: `${due.length} ${due.length === 1 ? 'task is' : 'tasks are'} due today${over ? `, ${over} overdue` : ''}.\n` + due.slice(0, 3).map(x => '• ' + x.title).join('\n'),
    icon: 'logo.png'
  });
}
setInterval(checkReminder, 30000);
