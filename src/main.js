'use strict';
const { app, BrowserWindow, ipcMain, dialog, shell, Menu, safeStorage } = require('electron');
const path = require('path');
const fs = require('fs');
const { Store, TASK_LIMIT } = require('./store');
const legacy = require('./legacy');

// Data folder (kept at the same location as earlier versions so existing data is found and upgraded)
const dataDir = path.join(app.getPath('documents'), 'TaskMasterVault');
const oldDir = path.join(app.getPath('documents'), 'WorkTodoVault');
try { if (!fs.existsSync(dataDir) && fs.existsSync(oldDir)) fs.renameSync(oldDir, dataDir); } catch {}
const store = new Store(dataDir);
let win;

function createWindow() {
  win = new BrowserWindow({
    width: 1280, height: 820, minWidth: 900, minHeight: 600,
    backgroundColor: '#0f1117',
    title: 'Task Master',
    icon: path.join(__dirname, 'icon.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true, nodeIntegration: false, sandbox: true
    }
  });
  Menu.setApplicationMenu(null);
  win.loadFile(path.join(__dirname, 'renderer', 'index.html'));
  win.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  win.webContents.on('will-navigate', e => e.preventDefault());
}

const wrap = fn => async (_e, ...args) => {
  try { return { ok: true, data: await fn(...args) }; }
  catch (err) { return { ok: false, error: err.message || String(err) }; }
};

// Only used to read data written by older, encrypted versions
const osProtector = {
  unprotect: b => Buffer.from(safeStorage.decryptString(b), 'base64')
};

async function ready(extra = {}) {
  return { status: 'ready', data: await store.loadData(), limit: TASK_LIMIT, dir: dataDir, ...extra };
}

ipcMain.handle('app:init', wrap(async () => {
  await store.init();
  const d = await legacy.detect(dataDir, osProtector);
  if (d.status === 'none') return ready();
  if (d.status === 'ready') return ready({ upgraded: await legacy.convert(store, d.dek) });
  return { status: d.status, limit: TASK_LIMIT }; // 'password' or 'keyfile': the user must help once
}));

ipcMain.handle('app:upgradePassword', wrap(async pw => {
  const dek = await legacy.keyFromPassword(dataDir, pw);
  return ready({ upgraded: await legacy.convert(store, dek) });
}));

ipcMain.handle('app:upgradeKeyfile', wrap(async () => {
  const r = await dialog.showOpenDialog(win, { properties: ['openFile'], filters: [{ name: 'Key backup', extensions: ['json'] }], title: 'Choose your old key backup file' });
  if (r.canceled) return null;
  const dek = legacy.keyFromBackupText(fs.readFileSync(r.filePaths[0], 'utf8'));
  return ready({ upgraded: await legacy.convert(store, dek) });
}));

ipcMain.handle('data:save', wrap(async data => store.saveData(data)));
ipcMain.handle('app:revealData', wrap(async () => { await shell.openPath(dataDir); }));

/* ---------- file browser ---------- */
ipcMain.handle('fs:list', wrap(async rel => store.list(rel)));
ipcMain.handle('fs:stats', wrap(async () => store.stats()));
ipcMain.handle('fs:usage', wrap(async rel => store.usage(rel)));
ipcMain.handle('fs:mkdir', wrap(async (rel, name) => store.mkdir(rel, name)));
ipcMain.handle('fs:rename', wrap(async (rel, name) => store.rename(rel, name)));
ipcMain.handle('fs:move', wrap(async (rel, dest) => store.move(rel, dest)));
ipcMain.handle('fs:delete', wrap(async rel => store.remove(rel)));
ipcMain.handle('fs:add', wrap(async (destRel, paths) => store.addPaths(destRel, paths)));

ipcMain.handle('fs:pick', wrap(async kind => {
  const folder = kind === 'folder';
  const r = await dialog.showOpenDialog(win, {
    properties: folder ? ['openDirectory', 'multiSelections'] : ['openFile', 'multiSelections'],
    title: folder ? 'Select a folder to upload' : 'Select files to upload'
  });
  return r.canceled ? [] : r.filePaths;
}));

ipcMain.handle('fs:open', wrap(async rel => {
  const err = await shell.openPath(store.resolve(rel));
  if (err) throw new Error(err);
}));

ipcMain.handle('fs:showInFolder', wrap(async rel => {
  const err = await shell.openPath(store.resolve(rel));
  if (err) throw new Error(err);
}));

ipcMain.handle('fs:download', wrap(async (rel, isDir) => {
  const name = path.basename(rel);
  if (isDir) {
    const r = await dialog.showOpenDialog(win, { properties: ['openDirectory', 'createDirectory'], title: 'Choose where to save this folder' });
    if (r.canceled) return false;
    return store.exportTo(rel, r.filePaths[0]);
  }
  const r = await dialog.showSaveDialog(win, { defaultPath: path.join(app.getPath('downloads'), name), title: 'Save a copy of this file' });
  if (r.canceled) return false;
  return store.exportTo(rel, r.filePath);
}));

ipcMain.handle('export:text', wrap(async (name, text) => {
  const r = await dialog.showSaveDialog(win, { defaultPath: path.join(app.getPath('downloads'), name) });
  if (r.canceled) return false;
  fs.writeFileSync(r.filePath, text, 'utf8');
  return r.filePath;
}));

app.whenReady().then(createWindow);
app.on('window-all-closed', () => app.quit());
