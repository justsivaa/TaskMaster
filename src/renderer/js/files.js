'use strict';
/* ============================================================
   files.js  -  the file window.
   One component (mountBrowser) is used in two places:
     - inside the task popup, locked to that task's folder
     - on the Files page, showing General plus every task's folder
   Files live on disk as ordinary files and folders (see src/store.js); this file only draws them.
   Styles: styles/popup.css section 5 (.fwin ...) and styles/pages.css.
   ============================================================ */

/* ---------- file statistics (from disk) ---------- */
let fileStats = { tasks: {}, general: { files: 0, bytes: 0 } };
const taskFiles = id => fileStats.tasks[id]?.files || 0;
const totalFiles = () => fileStats.general.files + Object.values(fileStats.tasks).reduce((a, x) => a + x.files, 0);
async function refreshStats() { try { fileStats = await window.api.stats(); } catch { /* keep old numbers */ } }

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
      }).catch(() => {});
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

/* ---------- the Files page ---------- */
function renderFiles() {
  $('#page').className = 'page fill';
  $('#page').innerHTML = `<div class="files-page"><div class="fwin" id="fp"></div></div>`;
  mountBrowser($('#fp'), { root: null, title: 'All files', start: ui.fcwd || '', onNav: c => { ui.fcwd = c; } });
}
