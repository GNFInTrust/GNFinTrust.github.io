'use strict';
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

function temporaryPath(target) {
  return path.join(path.dirname(target), `.${path.basename(target)}.${crypto.randomUUID()}.tmp`);
}

function writeJson(target, value) {
  const temp = temporaryPath(target);
  try {
    fs.writeFileSync(temp, JSON.stringify(value), { mode: 0o600, flag: 'wx' });
    fs.renameSync(temp, target);
  } finally {
    try { fs.unlinkSync(temp); } catch {}
  }
}

module.exports = { temporaryPath, writeJson };
