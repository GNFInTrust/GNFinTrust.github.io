'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const vm = require('node:vm');
const { temporaryPath } = require('../atomic-file');

function harness() {
  let fail = false;
  let writeCount = 0;
  class Workbook {
    constructor() {
      this.rows = {};
      const getRow = n => {
        this.rows[n] ||= {};
        return { getCell: col => {
          const key = typeof col === 'number' ? String.fromCharCode(64 + col) : col;
          return { get value() { return this.row[key]; }, set value(value) { this.row[key] = value; }, row: this.rows[n] };
        }, commit() {} };
      };
      this.worksheets = [{ getRow, eachRow: action => Object.keys(this.rows).map(Number).sort((a, b) => a - b).forEach(n => action(getRow(n), n)) }];
      this.xlsx = {
        readFile: async file => { this.rows = JSON.parse(await fs.promises.readFile(file, 'utf8')); },
        writeFile: async file => {
          writeCount++;
          await fs.promises.writeFile(file, 'partial');
          await new Promise(resolve => setTimeout(resolve, 5));
          if (fail) throw new Error('disk_failure');
          await fs.promises.writeFile(file, JSON.stringify(this.rows));
        },
      };
    }
  }
  const module = { exports: {} };
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../excel_helper.js'), 'utf8'), {
    module, setTimeout, clearTimeout, console,
    require: name => name === 'exceljs' ? { Workbook } : name === './atomic-file' ? { temporaryPath } : require(name),
  });
  return { helper: module.exports, set fail(value) { fail = value; }, get writeCount() { return writeCount; } };
}

test('failed workbook saves preserve the original file and retain dirty data for retry', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'gn-excel-'));
  const file = path.join(dir, 'base.xlsx');
  fs.writeFileSync(file, '{}');
  const h = harness();
  try {
    await h.helper.appendRow(file, { C: 'Alice', D: '+996 123' });
    h.fail = true;
    await assert.rejects(h.helper.closeWorkbook(), /disk_failure/);
    assert.equal(fs.readFileSync(file, 'utf8'), '{}');
    assert.deepEqual(fs.readdirSync(dir), ['base.xlsx']);
    h.fail = false;
    await h.helper.closeWorkbook();
    assert.equal(JSON.parse(fs.readFileSync(file, 'utf8'))['3'].C, 'Alice');
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

test('appends during an active save are serialized and both survive the next save', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'gn-excel-'));
  const file = path.join(dir, 'base.xlsx');
  fs.writeFileSync(file, '{}');
  const h = harness();
  try {
    await h.helper.appendRow(file, { C: 'Alice', D: '111' });
    const flushing = h.helper.flush();
    const appended = h.helper.appendRow(file, { C: 'Bob', D: '222' });
    await Promise.all([flushing, appended]);
    await h.helper.closeWorkbook();
    const rows = JSON.parse(fs.readFileSync(file, 'utf8'));
    assert.equal(rows['3'].C, 'Alice');
    assert.equal(rows['4'].C, 'Bob');
    assert.equal(h.writeCount, 2);
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});
