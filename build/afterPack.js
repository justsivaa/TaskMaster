'use strict';
// Embeds build/icon.ico into the Windows .exe (pure JS, works on any OS, no Wine needed)
const fs = require('fs');
const path = require('path');

exports.default = async function (ctx) {
  if (ctx.electronPlatformName !== 'win32') return;
  const ResEdit = await import('resedit');
  const exe = path.join(ctx.appOutDir, ctx.packager.appInfo.productFilename + '.exe');
  const nt = ResEdit.NtExecutable.from(fs.readFileSync(exe));
  const res = ResEdit.NtExecutableResource.from(nt);
  const ico = ResEdit.Data.IconFile.from(fs.readFileSync(path.join(__dirname, 'icon.ico')));
  const existing = ResEdit.Resource.IconGroupEntry.fromEntries(res.entries)[0];
  ResEdit.Resource.IconGroupEntry.replaceIconsForResource(
    res.entries, existing ? existing.id : 1, existing ? existing.lang : 1033, ico.icons.map(i => i.data));
  res.outputResource(nt);
  fs.writeFileSync(exe, Buffer.from(nt.generate()));
};
