'use strict';
/**
 * One-time upgrade for data created by earlier, encrypted versions.
 * Decrypts the old attachments into normal files/folders, then removes the old key files.
 * (Earlier versions: v1 = master-password vault, v2 = key protected by the operating system.)
 */
const fs = require('fs');
const fsp = require('fs/promises');
const path = require('path');
const crypto = require('crypto');
const { pipeline } = require('stream/promises');
const { uniqueName } = require('./store');

const MAGIC = Buffer.from('WTV1');
const SCRYPT = { N: 1 << 15, r: 8, p: 1, maxmem: 128 * 1024 * 1024 };

function openBlob(key, blob) {
  if (blob.length < 32 || !blob.subarray(0, 4).equals(MAGIC)) throw new Error('Corrupt data');
  const d = crypto.createDecipheriv('aes-256-gcm', key, blob.subarray(4, 16));
  d.setAuthTag(blob.subarray(16, 32));
  return Buffer.concat([d.update(blob.subarray(32)), d.final()]);
}

async function decryptFile(key, src, dest) {
  const h = await fsp.open(src, 'r');
  const head = Buffer.alloc(32);
  await h.read(head, 0, 32, 0);
  await h.close();
  if (!head.subarray(0, 4).equals(MAGIC)) throw new Error('Corrupt file');
  const d = crypto.createDecipheriv('aes-256-gcm', key, head.subarray(4, 16));
  d.setAuthTag(head.subarray(16, 32));
  const tmp = dest + '.part';
  try {
    await pipeline(fs.createReadStream(src, { start: 32 }), d, fs.createWriteStream(tmp));
    await fsp.rename(tmp, dest);
  } catch (e) { await fsp.rm(tmp, { force: true }); throw e; }
}

const safe = n => String(n || 'file').replace(/[<>:"/\\|?*\x00-\x1f]/g, '_').replace(/[. ]+$/, '') || 'file';

/** Is there old encrypted data, and what do we need to read it? */
async function detect(dir, protector) {
  const metaPath = path.join(dir, 'vault.json');
  if (!fs.existsSync(metaPath)) return { status: 'none' };
  let meta;
  try { meta = JSON.parse(await fsp.readFile(metaPath, 'utf8')); } catch { return { status: 'none' }; }
  if (meta.version === 1) return { status: 'password' };
  try {
    const dek = protector.unprotect(Buffer.from(meta.key, 'base64'));
    if (dek.length !== 32) throw new Error('bad key');
    return { status: 'ready', dek };
  } catch { return { status: 'keyfile' }; }
}

async function keyFromPassword(dir, password) {
  const meta = JSON.parse(await fsp.readFile(path.join(dir, 'vault.json'), 'utf8'));
  if (meta.version !== 1) throw new Error('This data does not use a password');
  const kek = crypto.scryptSync(String(password), Buffer.from(meta.salt, 'base64'), 32, SCRYPT);
  try { return openBlob(kek, Buffer.from(meta.wrappedKey, 'base64')); }
  catch { throw new Error('Wrong password'); }
}

function keyFromBackupText(text) {
  let obj;
  try { obj = JSON.parse(text); } catch { throw new Error('This is not a valid key backup file'); }
  const dek = Buffer.from(String(obj.key || ''), 'base64');
  if (dek.length !== 32) throw new Error('This is not a valid key backup file');
  return dek;
}

/** Decrypt everything with dek, rebuild data.json, delete old key files when all succeeded. */
async function convert(store, dek) {
  const dir = store.dir;
  let data;
  const plain = path.join(dir, 'data.json'), enc = path.join(dir, 'data.enc');
  if (fs.existsSync(enc)) data = JSON.parse(openBlob(dek, await fsp.readFile(enc)).toString('utf8'));
  else data = await store.loadData();

  const folders = new Map((data.folders || []).map(f => [f.id, safe(f.name)]));
  let migrated = 0, failed = 0;
  const keep = [];
  for (const f of data.files || []) {
    const src = path.join(store.filesDir, path.basename(f.id) + '.enc');
    if (!fs.existsSync(src)) continue;
    const rel = f.taskId ? path.join('tasks', path.basename(f.taskId)) : path.join('general', f.folderId && folders.get(f.folderId) ? folders.get(f.folderId) : '');
    const destDir = path.join(store.filesDir, rel);
    await fsp.mkdir(destDir, { recursive: true });
    try {
      await decryptFile(dek, src, path.join(destDir, uniqueName(destDir, safe(f.name))));
      await fsp.rm(src, { force: true });
      migrated++;
    } catch { failed++; keep.push(f); }
  }
  for (const f of data.folders || []) await fsp.mkdir(path.join(store.filesDir, 'general', safe(f.name)), { recursive: true });

  delete data.folders; delete data.files;
  if (keep.length) data.files = keep; // unreadable leftovers stay listed so nothing is silently lost
  if (data.settings) delete data.settings.autoLock;
  await store.saveData(data);

  if (!failed) {
    for (const n of ['vault.json', 'vault.legacy.json', 'data.enc', 'data.enc.old']) await fsp.rm(path.join(dir, n), { force: true });
  }
  return { migrated, failed };
}

module.exports = { detect, keyFromPassword, keyFromBackupText, convert };
