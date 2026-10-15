'use strict';
/**
 * Plain local storage (no encryption).
 *
 *   <data dir>/
 *     data.json            tasks, subtasks and settings
 *     files/
 *       general/...        free-form files and folders
 *       tasks/<taskId>/... files and folders attached to a task
 *
 * Files are stored as ordinary files and folders, so they can be browsed in Explorer/Finder too.
 * All paths exchanged with the UI are RELATIVE to files/ (e.g. "tasks/abc/specs/a.pdf").
 */
const fs = require('fs');
const fsp = require('fs/promises');
const path = require('path');

const TASK_LIMIT = 1024 ** 3; // 1 GB of attachments per task
const EMPTY = () => ({ tasks: [], settings: {} });
const BAD_NAME = /[<>:"/\\|?*\x00-\x1f]/;

function cleanName(name) {
  const n = String(name ?? '').trim();
  if (!n || n === '.' || n === '..' || BAD_NAME.test(n) || /[. ]$/.test(n)) throw new Error('That name is not allowed. Avoid  < > : " / \\ | ? *  and trailing dots or spaces.');
  return n;
}

function uniqueName(dir, name) {
  const ext = path.extname(name), base = path.basename(name, ext);
  let n = name, i = 1;
  while (fs.existsSync(path.join(dir, n))) n = `${base} (${i++})${ext}`;
  return n;
}

class Store {
  constructor(dir) {
    this.dir = dir;
    this.filesDir = path.join(dir, 'files');
    this.dataPath = path.join(dir, 'data.json');
  }

  async init() {
    await fsp.mkdir(path.join(this.filesDir, 'general'), { recursive: true });
    await fsp.mkdir(path.join(this.filesDir, 'tasks'), { recursive: true });
  }

  /* ---------- task data ---------- */
  async loadData() {
    try { return JSON.parse(await fsp.readFile(this.dataPath, 'utf8')); }
    catch (e) { if (e.code === 'ENOENT') return EMPTY(); throw e; }
  }

  async saveData(data) {
    const tmp = this.dataPath + '.tmp';
    await fsp.writeFile(tmp, JSON.stringify(data));
    await fsp.rename(tmp, this.dataPath);
  }

  /* ---------- safe path handling ---------- */
  /** rel -> absolute path, refusing anything outside files/general or files/tasks. */
  resolve(rel) {
    const clean = String(rel ?? '').replace(/\\/g, '/').replace(/^\/+|\/+$/g, '');
    const parts = clean.split('/').filter(Boolean);
    if (!parts.length || parts.some(p => p === '.' || p === '..' || BAD_NAME.test(p))) throw new Error('Invalid location');
    if (parts[0] !== 'general' && parts[0] !== 'tasks') throw new Error('Invalid location');
    if (parts[0] === 'tasks' && parts.length < 2) throw new Error('Invalid location');
    const abs = path.join(this.filesDir, ...parts);
    if (!abs.startsWith(this.filesDir + path.sep)) throw new Error('Invalid location');
    return abs;
  }

  _rel(abs) { return path.relative(this.filesDir, abs).split(path.sep).join('/'); }

  /* ---------- browsing ---------- */
  async list(rel) {
    const abs = this.resolve(rel);
    let names;
    try { names = await fsp.readdir(abs); } catch (e) { if (e.code === 'ENOENT') return []; throw e; }
    const out = [];
    for (const name of names) {
      try {
        const p = path.join(abs, name);
        const st = await fsp.lstat(p);
        if (st.isSymbolicLink()) continue;
        const isDir = st.isDirectory();
        out.push({
          name, isDir, rel: this._rel(p), mtime: st.mtime.toISOString(),
          size: isDir ? 0 : st.size,
          items: isDir ? (await fsp.readdir(p)).length : 0
        });
      } catch { /* vanished while listing */ }
    }
    out.sort((a, b) => (b.isDir - a.isDir) || a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' }));
    return out;
  }

  /** Recursive totals for a real path. */
  async measurePath(abs) {
    let files = 0, bytes = 0;
    let st;
    try { st = await fsp.lstat(abs); } catch { return { files, bytes }; }
    if (st.isSymbolicLink()) return { files, bytes };
    if (st.isFile()) return { files: 1, bytes: st.size };
    if (st.isDirectory()) {
      for (const n of await fsp.readdir(abs)) {
        const r = await this.measurePath(path.join(abs, n));
        files += r.files; bytes += r.bytes;
      }
    }
    return { files, bytes };
  }

  async measure(srcPaths) {
    let files = 0, bytes = 0;
    for (const p of srcPaths) { const r = await this.measurePath(p); files += r.files; bytes += r.bytes; }
    return { files, bytes };
  }

  async usage(rel) { return this.measurePath(this.resolve(rel)); }

  /** { tasks: { <taskId>: {files, bytes} }, general: {files, bytes} } */
  async stats() {
    const out = { tasks: {}, general: await this.measurePath(path.join(this.filesDir, 'general')) };
    let ids = [];
    try { ids = await fsp.readdir(path.join(this.filesDir, 'tasks')); } catch {}
    for (const id of ids) out.tasks[id] = await this.measurePath(path.join(this.filesDir, 'tasks', id));
    return out;
  }

  /* ---------- changes ---------- */
  async mkdir(parentRel, name) {
    const abs = path.join(this.resolve(parentRel), cleanName(name));
    if (fs.existsSync(abs)) throw new Error('A file or folder with that name already exists');
    await fsp.mkdir(abs, { recursive: true });
    return this._rel(abs);
  }

  async rename(rel, newName) {
    const abs = this.resolve(rel);
    const parts = String(rel).replace(/\\/g, '/').split('/').filter(Boolean);
    if ((parts[0] === 'general' && parts.length < 2) || (parts[0] === 'tasks' && parts.length < 3)) throw new Error('This folder cannot be renamed');
    const dest = path.join(path.dirname(abs), cleanName(newName));
    if (dest.toLowerCase() !== abs.toLowerCase() && fs.existsSync(dest)) throw new Error('A file or folder with that name already exists');
    await fsp.rename(abs, dest);
    return this._rel(dest);
  }

  async move(rel, destDirRel) {
    const abs = this.resolve(rel), destDir = this.resolve(destDirRel);
    if (destDir === abs || destDir.startsWith(abs + path.sep)) throw new Error('A folder cannot be moved into itself');
    if (path.dirname(abs) === destDir) return rel;
    const into = /^tasks\/([^/]+)/.exec(String(destDirRel).replace(/\\/g, '/'));
    const from = /^tasks\/([^/]+)/.exec(String(rel).replace(/\\/g, '/'));
    if (into && (!from || from[1] !== into[1])) {
      const used = (await this.usage('tasks/' + into[1])).bytes, add = (await this.measurePath(abs)).bytes;
      if (used + add > TASK_LIMIT) throw new Error('Moving this would go over the 1 GB limit for that task.');
    }
    await fsp.mkdir(destDir, { recursive: true });
    const dest = path.join(destDir, uniqueName(destDir, path.basename(abs)));
    await fsp.rename(abs, dest);
    return this._rel(dest);
  }

  async remove(rel) {
    const abs = this.resolve(rel);
    await fsp.rm(abs, { recursive: true, force: true });
  }

  async _copyTree(src, dest, tally) {
    const st = await fsp.lstat(src);
    if (st.isSymbolicLink()) return;
    if (st.isDirectory()) {
      await fsp.mkdir(dest, { recursive: true });
      for (const n of await fsp.readdir(src)) await this._copyTree(path.join(src, n), path.join(dest, n), tally);
    } else if (st.isFile()) {
      await fsp.copyFile(src, dest);
      tally.files++; tally.bytes += st.size;
    }
  }

  /** Copy files and/or whole folders from anywhere on the PC into destRel. Enforces the 1 GB per-task limit. */
  async addPaths(destRel, srcPaths) {
    const destDir = this.resolve(destRel);
    const m = /^tasks\/([^/]+)/.exec(String(destRel).replace(/\\/g, '/'));
    if (m) {
      const used = (await this.usage('tasks/' + m[1])).bytes;
      const add = (await this.measure(srcPaths)).bytes;
      if (used + add > TASK_LIMIT) {
        const mb = n => (n / 1048576).toFixed(0) + ' MB';
        throw new Error(`This would go over the 1 GB limit for this task (${mb(used)} used, adding ${mb(add)}).`);
      }
    }
    await fsp.mkdir(destDir, { recursive: true });
    const tally = { files: 0, bytes: 0 };
    for (const src of srcPaths) {
      const st = await fsp.lstat(src).catch(() => null);
      if (!st || st.isSymbolicLink()) continue;
      const target = path.join(destDir, uniqueName(destDir, path.basename(src)));
      if (target === src || target.startsWith(src + path.sep)) continue; // never copy a folder into itself
      await this._copyTree(src, target, tally);
    }
    return tally;
  }

  /** Copy a stored file or folder out to destPath (file) or into destDir (folder). */
  async exportTo(rel, dest) {
    const abs = this.resolve(rel);
    const st = await fsp.stat(abs);
    const tally = { files: 0, bytes: 0 };
    if (st.isDirectory()) {
      const target = path.join(dest, uniqueName(dest, path.basename(abs)));
      await this._copyTree(abs, target, tally);
      return target;
    }
    await fsp.copyFile(abs, dest);
    return dest;
  }
}

module.exports = { Store, TASK_LIMIT, uniqueName, cleanName };
