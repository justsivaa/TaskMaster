'use strict';
const { contextBridge, ipcRenderer, webUtils } = require('electron');

const call = (ch, ...a) => ipcRenderer.invoke(ch, ...a).then(r => {
  if (!r.ok) throw new Error(r.error);
  return r.data;
});

contextBridge.exposeInMainWorld('api', {
  init: () => call('app:init'),
  upgradePassword: pw => call('app:upgradePassword', pw),
  upgradeKeyfile: () => call('app:upgradeKeyfile'),
  saveData: d => call('data:save', d),
  revealData: () => call('app:revealData'),
  list: rel => call('fs:list', rel),
  stats: () => call('fs:stats'),
  usage: rel => call('fs:usage', rel),
  mkdir: (rel, name) => call('fs:mkdir', rel, name),
  rename: (rel, name) => call('fs:rename', rel, name),
  move: (rel, dest) => call('fs:move', rel, dest),
  remove: rel => call('fs:delete', rel),
  add: (destRel, paths) => call('fs:add', destRel, paths),
  pick: kind => call('fs:pick', kind),
  pathForFile: f => webUtils.getPathForFile(f),
  open: rel => call('fs:open', rel),
  download: (rel, isDir) => call('fs:download', rel, isDir),
  exportText: (name, text) => call('export:text', name, text)
});
