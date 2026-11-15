'use strict';
const path = require('node:path');
const { Worker, isMainThread, parentPort, workerData } = require('node:worker_threads');
const MAX_FILE_BYTES = 10 * 1024 * 1024;
const FORMATS = Object.freeze({ xlsx: 'Excel', xls: 'Excel 97–2003', csv: 'CSV' });

function detectFormat(name) {
  const extension = path.extname(String(name)).slice(1).toLowerCase();
  return Object.hasOwn(FORMATS, extension) ? extension : null;
}

function outputName(name, to) {
  if (!Object.hasOwn(FORMATS, to)) throw new Error('unsupported_target');
  const base = path.win32.basename(String(name));
  return path.basename(base, path.extname(base)).replace(/[\x00-\x1f]/g, '') + '.' + to;
}

function sanitizeCsvSheet(sheet) {
  for (const [address, cell] of Object.entries(sheet)) {
    if (address.startsWith('!') || !cell || typeof cell.v !== 'string') continue;
    if (/^[\s\uFEFF]*[=+\-@]/.test(cell.v) || /^[\t\r\n]/.test(cell.v)) {
      cell.v = "'" + cell.v;
      delete cell.w;
    }
  }
}

function convertBuffer(buffer, from, to) {
  if (!Object.hasOwn(FORMATS, from) || !Object.hasOwn(FORMATS, to) || from === to) throw new Error('unsupported_format');
  if (!Buffer.isBuffer(buffer) || !buffer.length || buffer.length > MAX_FILE_BYTES) throw new Error('file_too_large');
  const XLSX = require('xlsx');
  const workbook = XLSX.read(buffer, {
    type: 'buffer', cellFormula: false, cellHTML: false, cellStyles: false,
    bookVBA: false, sheetRows: 100001,
  });
  if (!workbook.SheetNames.length) throw new Error('empty_workbook');
  if (workbook.SheetNames.length > 64) throw new Error('too_many_sheets');
  for (const name of workbook.SheetNames) {
    const range = workbook.Sheets[name]['!ref'];
    if (range) {
      const end = XLSX.utils.decode_range(range).e;
      if (end.r >= 100000 || end.c >= 2048) throw new Error('sheet_too_large');
    }
  }
  if (to === 'csv') {
    // Escape formula-like text before it is opened in a spreadsheet program.
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    sanitizeCsvSheet(sheet);
    const csv = XLSX.utils.sheet_to_csv(sheet, { forceQuotes: true });
    return Buffer.from('\uFEFF' + csv, 'utf8');
  }
  return XLSX.write(workbook, { type: 'buffer', bookType: to === 'xls' ? 'biff8' : 'xlsx', compression: true });
}

let busy = false;
async function convert(buffer, from, to) {
  if (busy) throw new Error('converter_busy');
  busy = true;
  try {
    return await new Promise((resolve, reject) => {
      const worker = new Worker(__filename, {
        workerData: { buffer, from, to },
        resourceLimits: { maxOldGenerationSizeMb: 128, maxYoungGenerationSizeMb: 32 },
      });
      let result;
      let error;
      const timer = setTimeout(() => {
        error = new Error('conversion_timeout');
        worker.terminate();
      }, 20000);
      worker.once('message', value => { result = value; });
      worker.once('error', value => { error = value; });
      worker.once('exit', code => {
        clearTimeout(timer);
        if (error || code || !result || result.error) reject(error || new Error(result?.error || 'conversion_failed'));
        else resolve(Buffer.from(result.buffer));
      });
    });
  } finally { busy = false; }
}

if (!isMainThread) {
  try { parentPort.postMessage({ buffer: convertBuffer(Buffer.from(workerData.buffer), workerData.from, workerData.to) }); }
  catch (error) { parentPort.postMessage({ error: error.message }); }
}

module.exports = { MAX_FILE_BYTES, FORMATS, detectFormat, outputName, sanitizeCsvSheet, convertBuffer, convert };
