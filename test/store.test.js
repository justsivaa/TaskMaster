'use strict';
const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const crypto = require('crypto');
const { Store, TASK_LIMIT } = require('../src/store');
const legacy = require('../src/legacy');

const tmp = p => fs.mkdtempSync(path.join(os.tmpdir(), p));
const w = (f, c) => { fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, c); };

(async () => {
  const dir = tmp('tm-');
  const s = new Store(dir);
  await s.init();

  // tasks are plain JSON
  assert.deepStrictEqual((await s.loadData()).tasks, []);
  await s.saveData({ tasks: [{ id: 't1', title: 'Hello' }], settings: {} });
  assert(fs.readFileSync(path.join(dir, 'data.json'), 'utf8').includes('Hello'));

  // upload a whole folder tree + loose files into a task
  const src = tmp('tm-src-');
  w(path.join(src, 'Project/readme.txt'), 'hi');
  w(path.join(src, 'Project/specs/a.pdf'), 'A'.repeat(1000));
  w(path.join(src, 'Project/specs/deep/b.png'), 'B'.repeat(500));
  w(path.join(src, 'notes.txt'), 'plain notes');
  const r = await s.addPaths('tasks/t1', [path.join(src, 'Project'), path.join(src, 'notes.txt')]);
  assert.deepStrictEqual(r, { files: 4, bytes: 2 + 1000 + 500 + 11 });

  // files are stored as ordinary readable files (no encryption)
  assert.strictEqual(fs.readFileSync(path.join(dir, 'files/tasks/t1/notes.txt'), 'utf8'), 'plain notes');
  assert.strictEqual(fs.readFileSync(path.join(dir, 'files/tasks/t1/Project/specs/deep/b.png'), 'utf8'), 'B'.repeat(500));

  // browse like a file system
  let top = await s.list('tasks/t1');
  assert.deepStrictEqual(top.map(e => [e.name, e.isDir]), [['Project', true], ['notes.txt', false]]);
  assert.strictEqual(top[0].items, 2);
  const specs = await s.list('tasks/t1/Project/specs');
  assert.deepStrictEqual(specs.map(e => e.name), ['deep', 'a.pdf']);
  assert.deepStrictEqual(await s.list('tasks/nope'), []);

  // duplicate names get (1), (2)
  await s.addPaths('tasks/t1', [path.join(src, 'notes.txt')]);
  assert((await s.list('tasks/t1')).some(e => e.name === 'notes (1).txt'));

  // folders: create / rename / move / delete
  await s.mkdir('general', 'Contracts');
  await assert.rejects(() => s.mkdir('general', 'Contracts'), /already exists/);
  await assert.rejects(() => s.mkdir('general', 'bad/name'), /not allowed/);
  await s.rename('general/Contracts', 'Legal');
  await s.move('tasks/t1/notes.txt', 'general/Legal');
  assert.deepStrictEqual((await s.list('general/Legal')).map(e => e.name), ['notes.txt']);
  await assert.rejects(() => s.move('tasks/t1/Project', 'tasks/t1/Project/specs'), /into itself/);
  await assert.rejects(() => s.rename('general', 'x'), /cannot be renamed/);
  await assert.rejects(() => s.rename('tasks/t1', 'x'), /cannot be renamed/);
  await s.remove('tasks/t1/Project/specs');
  assert.deepStrictEqual((await s.list('tasks/t1/Project')).map(e => e.name), ['readme.txt']);

  // stats
  const st = await s.stats();
  assert.strictEqual(st.tasks.t1.files, 2);   // readme.txt + notes (1).txt
  assert.strictEqual(st.general.files, 1);

  // export out
  const out = tmp('tm-out-');
  await s.exportTo('tasks/t1/Project', out);
  assert.strictEqual(fs.readFileSync(path.join(out, 'Project/readme.txt'), 'utf8'), 'hi');
  await s.exportTo('general/Legal/notes.txt', path.join(out, 'copy.txt'));
  assert.strictEqual(fs.readFileSync(path.join(out, 'copy.txt'), 'utf8'), 'plain notes');

  // path safety
  for (const bad of ['../etc', 'general/../../x', '/etc/passwd', 'C:\\Windows', 'other/x', 'tasks', '']) {
    await assert.rejects(() => s.list(bad), /Invalid location/, bad);
  }
  await assert.rejects(() => s.remove('general/..'), /Invalid location/);

  // 1 GB per task limit (uses a sparse file, no real disk used)
  const big = path.join(src, 'big.bin'); fs.closeSync(fs.openSync(big, 'w')); fs.truncateSync(big, TASK_LIMIT + 1);
  await assert.rejects(() => s.addPaths('tasks/t2', [big]), /1 GB limit/);
  assert.deepStrictEqual(await s.list('tasks/t2'), []);
  fs.truncateSync(big, 600 * 1024 * 1024);
  await s.addPaths('tasks/t2', [big]);
  await assert.rejects(() => s.addPaths('tasks/t2', [big]), /1 GB limit/);
  await s.addPaths('general', [big]); // general has no limit
  await assert.rejects(() => s.move('general/big.bin', 'tasks/t2'), /1 GB limit/);

  // upgrade from the old password-protected (v1) encrypted version
  const MAGIC = Buffer.from('WTV1');
  const seal = (key, buf) => { const iv = crypto.randomBytes(12); const c = crypto.createCipheriv('aes-256-gcm', key, iv); const ct = Buffer.concat([c.update(buf), c.final()]); return Buffer.concat([MAGIC, iv, c.getAuthTag(), ct]); };
  const mkLegacy = (version) => {
    const d = tmp('tm-legacy-');
    const dek = crypto.randomBytes(32);
    fs.mkdirSync(path.join(d, 'files'));
    const tasks = [{ id: 'T9', title: 'Old task' }];
    const files = [
      { id: 'f1', name: 'report.pdf', size: 5, taskId: 'T9' },
      { id: 'f2', name: 'loose.txt', size: 5 },
      { id: 'f3', name: 'inFolder.txt', size: 5, folderId: 'F1' }
    ];
    const folders = [{ id: 'F1', name: 'Receipts' }];
    for (const f of files) fs.writeFileSync(path.join(d, 'files', f.id + '.enc'), seal(dek, Buffer.from('hello')));
    const data = { tasks, files, folders, settings: { autoLock: 5, theme: 'light' } };
    if (version === 1) {
      const salt = crypto.randomBytes(16);
      const kek = crypto.scryptSync('oldpass1', salt, 32, { N: 1 << 15, r: 8, p: 1, maxmem: 128 * 1024 * 1024 });
      fs.writeFileSync(path.join(d, 'vault.json'), JSON.stringify({ version: 1, kdf: 'scrypt', salt: salt.toString('base64'), wrappedKey: seal(kek, dek).toString('base64') }));
      fs.writeFileSync(path.join(d, 'data.enc'), seal(dek, Buffer.from(JSON.stringify(data))));
    } else {
      fs.writeFileSync(path.join(d, 'vault.json'), JSON.stringify({ version: 2, protection: 'os', key: Buffer.from(dek.toString('base64')).toString('base64') }));
      fs.writeFileSync(path.join(d, 'data.json'), JSON.stringify(data));
    }
    return { d, dek };
  };
  const check = async (d) => {
    const ns = new Store(d); await ns.init();
    assert.strictEqual(fs.readFileSync(path.join(d, 'files/tasks/T9/report.pdf'), 'utf8'), 'hello');
    assert.strictEqual(fs.readFileSync(path.join(d, 'files/general/loose.txt'), 'utf8'), 'hello');
    assert.strictEqual(fs.readFileSync(path.join(d, 'files/general/Receipts/inFolder.txt'), 'utf8'), 'hello');
    const data = await ns.loadData();
    assert.strictEqual(data.tasks[0].title, 'Old task');
    assert(!data.files && !data.folders && data.settings.theme === 'light' && data.settings.autoLock === undefined);
    for (const n of ['vault.json', 'data.enc']) assert(!fs.existsSync(path.join(d, n)), n + ' removed');
    assert(!fs.readdirSync(path.join(d, 'files')).some(n => n.endsWith('.enc')));
  };

  const v1 = mkLegacy(1);
  assert.strictEqual((await legacy.detect(v1.d, null)).status, 'password');
  await assert.rejects(() => legacy.keyFromPassword(v1.d, 'wrong'), /Wrong password/);
  const s1 = new Store(v1.d); await s1.init();
  assert.deepStrictEqual(await legacy.convert(s1, await legacy.keyFromPassword(v1.d, 'oldpass1')), { migrated: 3, failed: 0 });
  await check(v1.d);
  assert.strictEqual((await legacy.detect(v1.d, null)).status, 'none');

  const v2 = mkLegacy(2);
  const prot = { unprotect: b => Buffer.from(Buffer.from(b).toString(), 'base64') };
  const det = await legacy.detect(v2.d, prot);
  assert.strictEqual(det.status, 'ready');
  const s2 = new Store(v2.d); await s2.init();
  assert.deepStrictEqual(await legacy.convert(s2, det.dek), { migrated: 3, failed: 0 });
  await check(v2.d);

  // key unreadable on this PC -> needs key backup file
  const v3 = mkLegacy(2);
  assert.strictEqual((await legacy.detect(v3.d, { unprotect: () => { throw new Error('nope'); } })).status, 'keyfile');
  assert.throws(() => legacy.keyFromBackupText('nope'), /not a valid key backup/);
  const s3 = new Store(v3.d); await s3.init();
  const keyText = JSON.stringify({ app: 'task-master', type: 'file-encryption-key', version: 1, key: v3.dek.toString('base64') });
  assert.deepStrictEqual(await legacy.convert(s3, legacy.keyFromBackupText(keyText)), { migrated: 3, failed: 0 });
  await check(v3.d);

  // wrong key: nothing is deleted, files are kept for another attempt
  const v4 = mkLegacy(2);
  const s4 = new Store(v4.d); await s4.init();
  const r4 = await legacy.convert(s4, crypto.randomBytes(32));
  assert.strictEqual(r4.failed, 3);
  assert(fs.existsSync(path.join(v4.d, 'vault.json')) && fs.existsSync(path.join(v4.d, 'files/f1.enc')));

  console.log('store + upgrade tests passed');
})().catch(e => { console.error(e); process.exit(1); });
