'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const converter = require('../converter');

test('converter rejects prototype keys and removes path components from downloads', () => {
  for (const value of ['bad.exe', 'bad.__proto__', 'bad.constructor', 'bad.toString']) assert.equal(converter.detectFormat(value), null);
  assert.equal(converter.detectFormat('file.XLSX'), 'xlsx');
  assert.equal(converter.outputName('C:\\private\\data.xlsx', 'csv'), 'data.csv');
  assert.throws(() => converter.outputName('file.xlsx', '__proto__'), /unsupported_target/);
});

test('formula-like CSV text is escaped, including whitespace prefixes; numeric values survive', () => {
  const values = ['=1+1', '+CMD', '-CMD', '@SUM(A1)', '   =1+1', '\t=1+1', '\rcommand', '\n=1+1'];
  const sheet = Object.fromEntries(values.map((value, index) => ['A' + (index + 1), { t: 's', v: value, w: 'cached unsafe text' }]));
  sheet.B1 = { t: 'n', v: -3 };
  sheet.B2 = { t: 's', v: 'normal text' };
  converter.sanitizeCsvSheet(sheet);
  values.forEach((value, index) => {
    assert.equal(sheet['A' + (index + 1)].v, "'" + value);
    assert.equal(sheet['A' + (index + 1)].w, undefined);
  });
  assert.equal(sheet.B1.v, -3);
  assert.equal(sheet.B2.v, 'normal text');
});

test('invalid/oversized conversion inputs are rejected before loading SheetJS', () => {
  assert.throws(() => converter.convertBuffer(Buffer.alloc(0), 'csv', 'xlsx'), /file_too_large/);
  assert.throws(() => converter.convertBuffer(Buffer.from('a'), 'csv', '__proto__'), /unsupported_format/);
});

let installed = true;
try { require.resolve('xlsx'); } catch { installed = false; }
test('real worker converts CSV to XLSX and back without executing formulas', { skip: installed ? false : 'SheetJS dependency is not installed' }, async () => {
  const xlsx = await converter.convert(Buffer.from('Name,Value\nAlice,42\nEvil,"=1+1"'), 'csv', 'xlsx');
  const csv = await converter.convert(xlsx, 'xlsx', 'csv');
  assert.match(csv.toString('utf8'), /Alice/);
  assert.match(csv.toString('utf8'), /'=1\+1/);
});
