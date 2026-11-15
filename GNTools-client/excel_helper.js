// excel_helper.js — запись строк в Excel с дедупликацией по телефону (D), затем по имени (C).
// Книга держится в памяти: не перечитываем и не перезаписываем весь xlsx на каждую строку.
'use strict';

const ExcelJS = require('exceljs');
const fs = require('node:fs/promises');
const { temporaryPath } = require('./atomic-file');

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
  const temp = temporaryPath(cache.path);
  try {
    await cache.wb.xlsx.writeFile(temp);
    await fs.rename(temp, cache.path);
    cache.dirty = false;
  } finally { await fs.unlink(temp).catch(() => {}); }
}

function scheduleFlush() {
  if (cache.writeTimer) clearTimeout(cache.writeTimer);
  cache.writeTimer = setTimeout(() => {
    cache.writeTimer = null;
    flush().catch((e) => console.warn('Excel flush:', e.message));
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

function enqueue(operation) {
  const run = queue.then(operation);
  queue = run.catch(() => {});
  return run;
}

function flush() { return enqueue(flushNow); }

function closeWorkbook() {
  return enqueue(async () => {
    await flushNow();
    cache.path = '';
    cache.wb = null;
    cache.dirty = false;
  });
}

function cellText(v) {
  if (v == null) return '';
  if (typeof v === 'object') {
    if (v.text) return String(v.text);
    if (v.result != null) return String(v.result);
    if (v.richText) return v.richText.map((p) => p.text || '').join('');
  }
  return String(v).trim();
}

async function ensureWorkbookInner(filePath) {
  await flushNow();
  const fsSync = require('fs');
  const path = require('path');
  if (fsSync.existsSync(filePath)) return filePath;
  const dir = path.dirname(filePath);
  if (dir && !fsSync.existsSync(dir)) fsSync.mkdirSync(dir, { recursive: true });
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('База');
  ws.getRow(1).values = ['GN Tools', 'Контакты из WhatsApp / Instagram / Telegram'];
  ws.getRow(2).values = ['№', 'Дата', 'Имя', 'Телефон', 'Компания', 'Деятельность', 'Источник', 'Язык', 'Интерес', 'Статус', '', '', 'Не отвечает'];
  ws.getRow(2).font = { bold: true };
  ws.columns = [
    { width: 6 }, { width: 14 }, { width: 22 }, { width: 18 },
    { width: 22 }, { width: 18 }, { width: 12 }, { width: 16 },
    { width: 22 }, { width: 12 }, { width: 10 }, { width: 10 }, { width: 14 }
  ];
  // Exclusive creation preserves an existing file, including one created concurrently.
  const buffer = await wb.xlsx.writeBuffer();
  try { await fs.writeFile(filePath, buffer, { flag: 'wx' }); }
  catch (error) { if (error.code !== 'EEXIST') throw error; }
  cache.path = '';
  cache.wb = null;
  return filePath;
}

async function listRowsInner(filePath, q, limit) {
  await flushNow();
  const wb = await loadWorkbook(filePath);
  const ws = wb.worksheets[0];
  if (!ws) return { path: filePath, total: 0, rows: [], sources: {} };
  const needle = String(q || '').trim().toLowerCase();
  const max = Math.min(300, Number(limit) || 80);
  const rows = [];
  const sources = {};
  let total = 0;
  ws.eachRow((row, rn) => {
    if (rn < 3) return;
    const rec = {
      n: cellText(row.getCell('A').value),
      date: cellText(row.getCell('B').value),
      name: cellText(row.getCell('C').value),
      phone: cellText(row.getCell('D').value),
      company: cellText(row.getCell('E').value),
      activity: cellText(row.getCell('F').value),
      source: cellText(row.getCell('G').value),
      language: cellText(row.getCell('H').value),
      interest: cellText(row.getCell('I').value),
      status: cellText(row.getCell('J').value),
      unanswered: cellText(row.getCell('M').value)
    };
    if (!rec.name && !rec.phone && !rec.company) return;
    total += 1;
    const src = rec.source || '—';
    sources[src] = (sources[src] || 0) + 1;
    if (needle) {
      const hay = (rec.name + ' ' + rec.phone + ' ' + rec.company + ' ' + rec.interest + ' ' + rec.source).toLowerCase();
      if (hay.indexOf(needle) === -1) return;
    }
    if (rows.length < max) rows.push(rec);
  });
  return { path: filePath, total, shown: rows.length, rows, sources };
}

function listRows(...args) { return enqueue(() => listRowsInner(...args)); }
function ensureWorkbook(filePath) { return enqueue(() => ensureWorkbookInner(filePath)); }
module.exports = { appendRow, flush, closeWorkbook, listRows, ensureWorkbook };
