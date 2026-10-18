'use strict';
/* ============================================================
   app.js  -  start-up. Loaded last (see index.html).
   Asks the main process for the saved data, then draws the app (startApp lives in js/tasks.js).
   A card is shown only for the one-time upgrade from the old encrypted versions.
   ============================================================ */

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
  if (data.settings.layout && !data.settings.view) data.settings.view = data.settings.layout;   // older versions saved the List/Grid choice as `layout`
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


boot();
