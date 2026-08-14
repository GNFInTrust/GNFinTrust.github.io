// excel_helper.js — запись строк в Excel с дедупликацией по телефону (D), затем по имени (C).
// Книга держится в памяти: не перечитываем и не перезаписываем весь xlsx на каждую строку.
'use strict';

const ExcelJS = require('exceljs');

const cache = { path: '', wb: null, dirty: false, writeTimer: null };
let queue = Promise.resolve();

function digits(v) {
  return String(v || '').replace(/\D/g, '');
}

async function flushNow() {
  if (!cache.wb || !cache.dirty || !cache.path) return;
  if (cache.writeTimer) {
    clearTimeout(cache.writeTimer);
    cache.writeTimer = null;
  }
  await cache.wb.xlsx.writeFile(cache.path);
  cache.dirty = false;
}

function scheduleFlush() {
  if (cache.writeTimer) clearTimeout(cache.writeTimer);
  cache.writeTimer = setTimeout(() => {
    flushNow().catch((e) => console.warn('Excel flush:', e.message));
  }, 350);
}

async function loadWorkbook(filePath) {
  if (cache.path === filePath && cache.wb) return cache.wb;
  await flushNow();
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(filePath);
  cache.path = filePath;
  cache.wb = wb;
  cache.dirty = false;
  return wb;
}

async function appendRowInner(filePath, rowData) {
  const wb = await loadWorkbook(filePath);
  const ws = wb.worksheets[0];
  if (!ws) throw new Error('Excel: нет листа');

  const phoneDigits = digits(rowData.D);
  const phoneRaw = String(rowData.D || '').trim();
  const nameKey = String(rowData.C || '').trim().toLowerCase();

  let targetRow = 0;
  let lastDataRow = 2;

  ws.eachRow((row, rn) => {
    if (rn < 3) return;
    const d = String(row.getCell('D').value || '').trim();
    const c = String(row.getCell('C').value || '').trim();
    if (d || c) lastDataRow = Math.max(lastDataRow, rn);
    if (!targetRow && d) {
      if (phoneDigits && digits(d) === phoneDigits) targetRow = rn;
      else if (phoneRaw && d === phoneRaw) targetRow = rn;
    }
  });

  if (!targetRow && nameKey) {
    ws.eachRow((row, rn) => {
      if (rn < 3 || targetRow) return;
      const c = String(row.getCell('C').value || '').trim().toLowerCase();
      if (c && c === nameKey) targetRow = rn;
    });
  }

  const isUpdate = targetRow > 0;
  const rn = isUpdate ? targetRow : lastDataRow + 1;
  const row = ws.getRow(rn);

  for (const [col, val] of Object.entries(rowData)) {
    if (val === undefined || val === null || String(val) === '') continue;
    if (isUpdate && col === 'B') continue;
    row.getCell(col).value = val;
  }

  if (!isUpdate) {
    const prevNum = Number(ws.getRow(rn - 1).getCell('A').value);
    if (Number.isFinite(prevNum) && prevNum > 0) row.getCell('A').value = prevNum + 1;
  }

  row.commit();
  cache.dirty = true;
  scheduleFlush();
  return { row: rn, updated: isUpdate };
}

function appendRow(filePath, rowData) {
  const run = queue.then(() => appendRowInner(filePath, rowData));
  queue = run.catch(() => {});
  return run;
}

async function closeWorkbook() {
  try { await flushNow(); } catch {}
  cache.path = '';
  cache.wb = null;
  cache.dirty = false;
}

module.exports = { appendRow, flush: flushNow, closeWorkbook };
