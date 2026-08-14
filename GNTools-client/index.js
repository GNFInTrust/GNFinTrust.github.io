// index.js – GN Tools v4.2: WhatsApp/Instagram/Telegram → Excel + Documents + Конвертер (xlsx/xls/csv)
// Token pricing: per-model WhatsApp, no unlimited subscription

const wweb = require('whatsapp-web.js');
const { Client, LocalAuth } = wweb;
const fs = require('fs');
const path = require('path');
const os = require('os');
const http = require('http');
const { exec, spawn } = require('child_process');
const ExcelJS = require('exceljs');
const { parseMessage, setModel } = require('./parser.js');
const { appendRow, flush: flushExcel, closeWorkbook, listRows, ensureWorkbook } = require('./excel_helper.js');
const converter = require('./converter.js');
const license = require('./license.js');
const crypto = require('crypto');
const { openSource } = require('./web_scrape.js');

const PORT = 3390;

// Token pricing — per-model for WhatsApp, flat for others
const TOKEN_COST = {
  // WhatsApp: depends on model selected
  waDefault: 2,       // default / other models
  waOpus46: 1,        // Opus 4.6 = 1 token
  waOpus48: 3,        // Opus 4.8 = 3 tokens
  // Other sources
  instagram: 2,
  telegram: 1,
  // Documents
  dokBasic: 1,
  dokHaiku: 2,
  dokOpus: 3
};

function waCostForModel(model) {
  if (!model) return TOKEN_COST.waDefault;
  const m = String(model).toLowerCase();
  if (m.includes('opus-4-8') || m.includes('opus-4.8')) return TOKEN_COST.waOpus48;
  if (m.includes('opus-4-6') || m.includes('opus-4.6')) return TOKEN_COST.waOpus46;
  if (m.includes('opus-4-5') || m.includes('opus-4.5') || m.includes('opus-4-7')) return TOKEN_COST.waOpus46;
  return TOKEN_COST.waDefault;
}

const BASE_DIR = process.pkg ? path.dirname(process.execPath) : process.cwd();

// Excel paths
const EXCEL_CANDIDATES = [
  process.env.EXCEL_PATH || '',
  path.join(process.cwd(), 'база ватсап ии.xlsx'),
  path.join(BASE_DIR, 'база ватсап ии.xlsx'),
  path.join(os.homedir(), 'Desktop', 'база ватсап ии.xlsx'),
  path.join(os.homedir(), 'Downloads', 'база ватсап ии.xlsx')
];
let EXCEL_PATH = '';
function findExcel() {
  for (const c of EXCEL_CANDIDATES) {
    try { if (c && fs.existsSync(c)) return c; } catch {}
  }
  return '';
}

// Languages
const MESSAGES = {
  ru: {
    qrScan: 'Отсканируйте QR-код в WhatsApp на телефоне',
    ready: '✅ WhatsApp подключён',
    scanning: '📥 Читаю чаты…',
    knownContacts: (n) => `📖 В Excel уже есть ${n} контактов — пропущены`,
    excelReadFail: '⚠️ Не удалось прочитать Excel:',
    foundChats: (n) => `💬 Найдено чатов: ${n}`,
    chatOf: (i, n, name) => `💬 Чат ${i}/${n}: ${name}`,
    skipped: '  ⏭️ Пропущен',
    processedChat: (name, cost) => `  ✅ Обработан: ${name} (-${cost} ток.)`,
    errorChat: (name) => `  ❌ Ошибка в чате ${name}:`,
    doneScan: (total) => `📥 Готово! Добавлено ${total} строк.`,
    chatTimeout: 'таймаут (90 сек)',
    newMessage: (name) => `  📩 Новое от ${name}`,
    errorScan: 'Ошибка сканирования:',
    errorMsg: 'Ошибка:',
    stopping: 'Остановка...',
    rewinding: 'Пересканирование...',
    waitSync: '⏳ Жду синхронизацию WhatsApp...',
    retryScan: (i, n) => `🔁 Повтор через 20 сек (${i}/${n})...`,
    scanFailed: '⚠️ Сканирование не удалось',
    refreshStart: '🔄 Поиск пустых полей...',
    refreshFound: (n) => `🔄 Контактов для перечитывания: ${n}`,
    refreshDone: (n) => `✅ Обновлено: ${n}`,
    usingBrowser: (p) => `🌐 Браузер: ${p}`,
    usingExcel: (x) => `📊 Excel: ${x}`,
    notRunning: 'Бот не запущен',
    noAccess: '⛔ Нет токенов. Пополните на сайте.',
    licTokens: (n) => `🎟 Токенов: ${n}`,
    tgReady: '✅ Telegram открыт в Chrome — войдите, если нужно',
    instaReady: '✅ Instagram открыт в Chrome — войдите, если нужно',
    webDone: (n, src) => `Готово: ${n} диалогов из ${src} записаны в базу`,
    waCost: (model, cost) => `Модель: ${model} · ${cost} ток. за чат`
  }
};
let T = MESSAGES.ru;

// Current model for WhatsApp (set when starting)
let WA_MODEL = 'claude-opus-4-6';
let DOK_MODE = 'basic';

// License — tokens only, no subscription
let LIC = null;
let lastTokenLog = -1;

function canSpend(cost) {
  if (!license.configured()) return true;
  return !!(LIC && (LIC.admin || LIC.tokens >= cost));
}

async function licenseGate(costOverride) {
  const cost = costOverride || TOKEN_COST.waDefault;
  if (!license.configured()) return true;
  if (!LIC) return false;
  if (LIC.admin) return true;
  if (LIC.tokens >= cost) {
    try { await license.consumeTokens(cost); } catch (e) { log('License:', e.message); return false; }
    LIC.tokens -= cost;
    broadcast({ type: 'license', lic: LIC });
    if (LIC.tokens % 10 === 0 && LIC.tokens !== lastTokenLog) { lastTokenLog = LIC.tokens; log(T.licTokens(LIC.tokens)); }
    return true;
  }
  LIC.active = false;
  broadcast({ type: 'license', lic: LIC });
  return false;
}

// Browsers
const CHROME_PATHS = [
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
  (process.env.LOCALAPPDATA || '') + '\\Google\\Chrome\\Application\\chrome.exe'
];
const BRAVE_PATHS = [
  'C:\\Program Files\\BraveSoftware\\Brave-Browser\\Application\\brave.exe',
  'C:\\Program Files (x86)\\BraveSoftware\\Brave-Browser\\Application\\brave.exe',
  (process.env.LOCALAPPDATA || '') + '\\BraveSoftware\\Brave-Browser\\Application\\brave.exe'
];
function findBrowser(paths) {
  for (const p of paths) {
    try { if (p && fs.existsSync(p)) return p; } catch {}
  }
  return '';
}

// SSE + logging
const sseClients = new Set();
let STATUS = 'idle';
function broadcast(obj) {
  const data = 'data: ' + JSON.stringify(obj) + '\n\n';
  for (const res of sseClients) { try { res.write(data); } catch {} }
}
function log(...args) {
  const line = args.map(a => typeof a === 'string' ? a : (a && a.message) || String(a)).join(' ');
  console.log(line);
  broadcast({ type: 'log', line });
}
function setStatus(st) { STATUS = st; broadcast({ type: 'status', status: st }); }

// Chat cache
const CACHE_PATH = path.join(BASE_DIR, 'processed_cache.json');
let cache = {};
let cacheTimer = null;
try { cache = JSON.parse(fs.readFileSync(CACHE_PATH, 'utf8')); } catch {}
function saveCache() {
  if (cacheTimer) return;
  cacheTimer = setTimeout(() => {
    cacheTimer = null;
    try { fs.writeFileSync(CACHE_PATH, JSON.stringify(cache)); } catch {}
  }, 400);
}
function flushCache() {
  if (cacheTimer) { clearTimeout(cacheTimer); cacheTimer = null; }
  try { fs.writeFileSync(CACHE_PATH, JSON.stringify(cache)); } catch {}
}

const KNOWN_PHONES = new Set();
async function loadKnownPhones() {
  try {
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.readFile(EXCEL_PATH);
    const ws = wb.worksheets[0];
    ws.eachRow((row, rn) => {
      if (rn < 3) return;
      const raw = String(row.getCell(4).value || '').trim();
      if (!raw) return;
      const d = raw.replace(/\D/g, '');
      if (d) KNOWN_PHONES.add(d);
      if (raw.startsWith('скрыт')) KNOWN_PHONES.add(raw);
    });
    log(T.knownContacts(KNOWN_PHONES.size));
  } catch (e) { log(T.excelReadFail, e.message); }
}

async function processChat(chat, force = false, source = 'whatsapp') {
  if (chat.isGroup) return false;
  const chatKey = chat.id._serialized;
  if (!force && cache[chatKey]) {
    const recent = await chat.fetchMessages({ limit: 1 });
    if (!recent.length || cache[chatKey] >= recent[recent.length - 1].timestamp) return 'skip';
  }
  const messages = await chat.fetchMessages({ limit: 80 });
  if (messages.length === 0) return false;

  const lastTs = messages[messages.length - 1].timestamp;
  if (cache[chatKey] && cache[chatKey] >= lastTs) return 'skip';

  const firstMsg = messages[0];
  const firstMsgDate = new Date(firstMsg.timestamp * 1000);
  const colB_date = `${String(firstMsgDate.getDate()).padStart(2, '0')}/${String(firstMsgDate.getMonth() + 1).padStart(2, '0')}/${firstMsgDate.getFullYear()}`;

  const contact = await chat.getContact();
  const contactName = contact.name || contact.pushname || '';
  const phone = contact.number || chat.id.user || '';

  let formattedPhone = '';
  if (chat.name && chat.name.startsWith('+')) {
    formattedPhone = chat.name;
  } else if (phone) {
    const digitsOnly = String(phone).replace(/\D/g, '');
    if (digitsOnly.length >= 14) {
      formattedPhone = 'скрыт-' + digitsOnly.slice(-6);
    } else {
      formattedPhone = phone.startsWith('996') ? '+996 ' + phone.slice(3) : '+' + phone;
    }
  }

  const phoneDigits = formattedPhone.replace(/\D/g, '');
  if (!force && !cache[chatKey] && (KNOWN_PHONES.has(phoneDigits) || KNOWN_PHONES.has(formattedPhone))) {
    cache[chatKey] = lastTs;
    saveCache();
    return 'skip';
  }

  const cost = waCostForModel(WA_MODEL);
  if (!canSpend(cost)) { log(T.noAccess); return 'blocked'; }
  const transcript = `WhatsApp Profile: ${contactName}\n\n` + messages.slice(-40).map(m => `[${new Date(m.timestamp * 1000).toLocaleString()}] ${m.fromMe ? 'Manager' : 'Client'}: ${m.body}`).join('\n');
  const parsed = await parseMessage(transcript);
  if (!(await licenseGate(cost))) { log(T.noAccess); return 'blocked'; }

  const isCompany = contactName && (contactName.toLowerCase().includes('осоо') || contactName.toLowerCase().includes('llc') || contactName.toLowerCase().includes('ип '));
  const finalCompany = parsed.company || (isCompany ? contactName : '');

  const rowData = {
    B: colB_date, C: parsed.name, D: formattedPhone,
    E: finalCompany, F: parsed.activity,
    G: source === 'telegram' ? 'телеграм' : source === 'instagram' ? 'инстаграм' : 'ватсап',
    H: parsed.language, I: parsed.interest, J: parsed.status, M: parsed.unanswered
  };

  await appendRow(EXCEL_PATH, rowData);
  cache[chatKey] = lastTs;
  saveCache();
  return true;
}

const sleep = ms => new Promise(r => setTimeout(r, ms));
const CHAT_TIMEOUT_MS = 90 * 1000;
function withTimeout(p, ms, msg) {
  let t;
  const timeout = new Promise((_, rej) => { t = setTimeout(() => rej(new Error(msg)), ms); });
  return Promise.race([p, timeout]).finally(() => clearTimeout(t));
}

// WhatsApp client
let client = null;
let webBrowser = null;
let webScanTimer = null;
let RUNNING = false;
let SCAN_ON_START = true;
let ACTIVE_SOURCE = 'whatsapp';
const pendingChats = new Map();

async function stopAllBots() {
  if (webScanTimer) { clearTimeout(webScanTimer); webScanTimer = null; }
  try { if (client) await client.destroy(); } catch {}
  client = null;
  try { if (webBrowser) await webBrowser.close(); } catch {}
  webBrowser = null;
}

async function saveWebChat(chat, source) {
  const id = String(chat.id || chat.name || '').toLowerCase();
  const digest = crypto.createHash('sha256').update(chat.transcript || '').digest('hex');
  const key = source + ':' + id;
  if (cache[key] === digest) return 'skip';
  const cost = source === 'instagram' ? TOKEN_COST.instagram : TOKEN_COST.telegram;
  if (!canSpend(cost)) { log(T.noAccess); return 'blocked'; }
  const parsed = await parseMessage(chat.transcript || '');
  if (!(await licenseGate(cost))) { log(T.noAccess); return 'blocked'; }
  const now = new Date();
  const colB = `${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()}`;
  await appendRow(EXCEL_PATH, {
    B: colB,
    C: parsed.name || chat.name || '',
    D: chat.phone || '',
    E: parsed.company || '',
    F: parsed.activity || '',
    G: source === 'instagram' ? 'инстаграм' : 'телеграм',
    H: parsed.language || '',
    I: parsed.interest || '',
    J: parsed.status || '',
    M: parsed.unanswered || ''
  });
  cache[key] = digest;
  saveCache();
  return true;
}

async function startWebMessenger(source, execPath) {
  ACTIVE_SOURCE = source;
  setStatus('starting');
  const dir = path.join(BASE_DIR, '.web_' + source);
  const session = await openSource({ source, execPath, userDataDir: dir, log });
  webBrowser = session.browser;

  async function scanOnce() {
    if (!RUNNING || ACTIVE_SOURCE !== source || !webBrowser) return;
    setStatus('scanning');
    const chats = await session.scan();
    let total = 0;
    for (const chat of chats) {
      const r = await saveWebChat(chat, source);
      if (r === 'blocked') break;
      if (r && r !== 'skip') {
        total++;
        log(T.processedChat(chat.name, source === 'instagram' ? TOKEN_COST.instagram : TOKEN_COST.telegram));
      }
    }
    await flushExcel().catch(() => {});
    flushCache();
    log(T.webDone(total, source === 'instagram' ? 'Instagram' : 'Telegram'));
    setStatus('listening');
    broadcast({ type: 'base-refresh' });
    if (RUNNING && ACTIVE_SOURCE === source && webBrowser) {
      webScanTimer = setTimeout(() => scanOnce().catch(handleWebScanError), 60000);
    }
  }

  function handleWebScanError(e) {
    log(T.errorMsg, e);
    setStatus('error');
    RUNNING = false;
  }

  await scanOnce();
}

async function scanChats() {
  const chats = await client.getChats();
  log(T.foundChats(chats.length));
  let total = 0, idx = 0;
  for (const chat of chats) {
    idx++;
    try {
      if (!chat.isGroup) log(T.chatOf(idx, chats.length, chat.name || chat.id.user || ''));
      const r = await withTimeout(processChat(chat, false, 'whatsapp'), CHAT_TIMEOUT_MS, T.chatTimeout);
      if (r === 'blocked') break;
      if (r === 'skip') { log(T.skipped); }
      else if (r) { total++; log(T.processedChat(chat.name || chat.id._serialized, waCostForModel(WA_MODEL))); await sleep(180); }
    } catch (err) { log(T.errorChat(chat.name || chat.id._serialized), err.message); }
  }
    log(T.doneScan(total));
    try { await flushExcel(); } catch {}
    flushCache();
  }

async function scanChatsWithRetry(tries = 5) {
  for (let i = 1; i <= tries; i++) {
    try { await scanChats(); return; }
    catch (err) { log(T.errorScan, err.message); if (i < tries) { log(T.retryScan(i, tries)); await sleep(20000); } }
  }
  log(T.scanFailed);
}

async function refreshSparse() {
  log(T.refreshStart);
  const targets = [];
  try {
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.readFile(EXCEL_PATH);
    const ws = wb.worksheets[0];
    ws.eachRow((row, rn) => {
      if (rn < 3) return;
      const raw = String(row.getCell(4).value || '').trim();
      if (!raw || raw.startsWith('скрыт')) return;
      const a = String(row.getCell(6).value || '').trim();
      const i = String(row.getCell(9).value || '').trim();
      const s = String(row.getCell(10).value || '').trim();
      if ([a, i, s].filter(v => !v).length >= 2) targets.push(raw.replace(/\D/g, ''));
    });
  } catch (e) { log(T.excelReadFail, e.message); return; }
  log(T.refreshFound(targets.length));
  let done = 0;
  for (const d of targets) {
    try {
      const chat = await client.getChatById(d + '@c.us');
      if (!chat || chat.isGroup) continue;
      delete cache[chat.id._serialized];
      const r = await withTimeout(processChat(chat, true, 'whatsapp'), CHAT_TIMEOUT_MS, T.chatTimeout);
      if (r === 'blocked') break;
      if (r && r !== 'skip') { done++; log(T.processedChat(chat.name || d)); }
      await sleep(180);
    } catch (e) { log(T.errorChat(d), e.message); }
  }
  log(T.refreshDone(done));
  try { await flushExcel(); } catch {}
  flushCache();
}

function startWhatsApp(execPath) {
  ACTIVE_SOURCE = 'whatsapp';
  client = new Client({
    authStrategy: new LocalAuth(),
    authTimeoutMs: 300000,
    webVersionCache: { type: 'none' },
    puppeteer: {
      executablePath: execPath, headless: false, protocolTimeout: 300000,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
    }
  });

  client.on('qr', qr => {
    setStatus('qr'); broadcast({ type: 'qr', qr });
    log(T.qrScan);
  });

  client.on('ready', async () => {
    setStatus('connected'); log(T.ready);
    await loadKnownPhones();
    if (SCAN_ON_START) {
      log(T.waitSync); await sleep(8000);
      setStatus('scanning'); log(T.scanning);
      await scanChatsWithRetry();
      setStatus('listening');
    } else { setStatus('listening'); }
  });

  client.on('message', async msg => {
    if (msg.fromMe) return;
    try {
      const chat = await msg.getChat();
      const key = chat.id._serialized;
      if (pendingChats.has(key)) clearTimeout(pendingChats.get(key));
      pendingChats.set(key, setTimeout(async () => {
        pendingChats.delete(key);
        try {
          const r = await withTimeout(processChat(chat, true, 'whatsapp'), CHAT_TIMEOUT_MS, T.chatTimeout);
          if (r && r !== 'skip' && r !== 'blocked') log(T.newMessage(chat.name || chat.id._serialized));
        } catch (err) { log(T.errorMsg, err); }
      }, 12000));
    } catch (err) { log(T.errorMsg, err); }
  });

  client.initialize().catch(e => { log(T.errorMsg, e); setStatus('error'); RUNNING = false; });
}

// HTTP Server
function readBody(req, maxBytes) {
  const limit = maxBytes || 2 * 1024 * 1024;
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    req.on('data', (c) => {
      size += c.length;
      if (size > limit) {
        req.destroy();
        reject(new Error('body_too_large'));
        return;
      }
      chunks.push(c);
    });
    req.on('end', () => {
      try { resolve(JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}')); }
      catch { resolve({}); }
    });
    req.on('error', () => resolve({}));
  });
}

function sendJson(res, code, obj) {
  res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(obj));
}

function contentType(filename) {
  if (filename.endsWith('.html')) return 'text/html; charset=utf-8';
  if (filename.endsWith('.ico')) return 'image/x-icon';
  if (filename.endsWith('.png')) return 'image/png';
  if (filename.endsWith('.svg')) return 'image/svg+xml';
  if (filename.endsWith('.js')) return 'text/javascript; charset=utf-8';
  if (filename.endsWith('.css')) return 'text/css; charset=utf-8';
  return 'application/octet-stream';
}

function serveFile(res, filename, code = 200) {
  const binary = /\.(ico|png|jpg|jpeg|gif|woff2?)$/i.test(filename);
  for (const dir of [__dirname, BASE_DIR]) {
    try {
      const p = path.join(dir, filename);
      if (fs.existsSync(p)) {
        res.writeHead(code, { 'Content-Type': contentType(filename), 'Cache-Control': 'no-store' });
        res.end(fs.readFileSync(p, binary ? null : 'utf8'));
        return true;
      }
    } catch {}
  }
  return false;
}

const server = http.createServer(async (req, res) => {
  try {
  const rawUrl = req.url || '/';
  const url = rawUrl.split('?')[0];
  const qs = rawUrl.includes('?') ? rawUrl.slice(rawUrl.indexOf('?') + 1) : '';
  const params = new URLSearchParams(qs);

  if (req.method === 'GET' && (url === '/' || url === '/index.html')) {
    if (serveFile(res, 'ui.html')) return;
    res.writeHead(500); res.end('ui.html not found');
  } else if (req.method === 'GET' && (url === '/favicon.ico' || url === '/favicon.png')) {
    if (serveFile(res, url.slice(1))) return;
    res.writeHead(404); res.end();
  } else if (req.method === 'GET' && url === '/dokumenty') {
    if (license.configured() && (!LIC || !LIC.active)) { sendJson(res, 403, { error: 'no_license' }); return; }
    const mode = params.get('mode') || DOK_MODE;
    if (mode === 'opus' || mode === 'haiku' || mode === 'basic') DOK_MODE = mode;
    const cost = DOK_MODE === 'opus' ? TOKEN_COST.dokOpus : DOK_MODE === 'haiku' ? TOKEN_COST.dokHaiku : TOKEN_COST.dokBasic;
    if (!(await licenseGate(cost))) { sendJson(res, 403, { error: 'no_tokens' }); return; }
    if (serveFile(res, 'dokumenty.html')) return;
    res.writeHead(500); res.end('dokumenty.html not found');
  } else if (req.method === 'GET' && url === '/config') {
    sendJson(res, 200, {
      chrome: findBrowser(CHROME_PATHS), brave: findBrowser(BRAVE_PATHS),
      excel: EXCEL_PATH || findExcel(), status: STATUS, running: RUNNING,
      source: ACTIVE_SOURCE, tokenCosts: TOKEN_COST
    });
  } else if (req.method === 'GET' && url === '/base') {
    const q = params.get('q') || '';
    const file = EXCEL_PATH || findExcel();
    if (!file || !fs.existsSync(file)) {
      sendJson(res, 200, { ok: true, path: file || '', total: 0, rows: [], sources: {}, missing: true });
    } else {
      try {
        const data = await listRows(file, q, 80);
        sendJson(res, 200, Object.assign({ ok: true, missing: false }, data));
      } catch (e) {
        sendJson(res, 400, { error: (e && e.message) || 'excel_read_failed' });
      }
    }
  } else if (req.method === 'POST' && url === '/base/create') {
    const b = await readBody(req);
    const suggested = String(b.path || '').trim() || path.join(BASE_DIR, 'база ватсап ии.xlsx');
    try {
      const created = await ensureWorkbook(suggested);
      EXCEL_PATH = created;
      sendJson(res, 200, { ok: true, path: created });
    } catch (e) {
      sendJson(res, 400, { error: (e && e.message) || 'create_failed' });
    }
  } else if (req.method === 'POST' && url === '/base/open') {
    const file = EXCEL_PATH || findExcel();
    if (!file || !fs.existsSync(file)) { sendJson(res, 400, { error: 'excel_not_found' }); return; }
    try { await flushExcel(); } catch {}
    try {
      if (process.platform === 'win32') exec('start "" "' + file.replace(/"/g, '') + '"');
      else exec('xdg-open "' + file.replace(/"/g, '') + '"');
      sendJson(res, 200, { ok: true, path: file });
    } catch (e) {
      sendJson(res, 400, { error: (e && e.message) || 'open_failed' });
    }
  } else if (req.method === 'GET' && url === '/events') {
    res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', Connection: 'keep-alive' });
    res.write('data: ' + JSON.stringify({ type: 'status', status: STATUS }) + '\n\n');
    sseClients.add(res);
    req.on('close', () => sseClients.delete(res));

  } else if (req.method === 'POST' && url === '/auth/login') {
    const b = await readBody(req);
    try {
      await license.signIn(String(b.email || '').trim(), String(b.password || ''));
      LIC = await license.getLicense();
      if (LIC && LIC.noProfile && license.trialTokens() > 0) {
        try { await license.createProfile(); LIC = await license.getLicense(); } catch {}
      }
      sendJson(res, 200, { ok: true, lic: LIC, trialTokens: license.trialTokens(), tokenCosts: TOKEN_COST });
    } catch (e) { sendJson(res, 400, { error: e.message }); }
  } else if (req.method === 'POST' && url === '/auth/register') {
    const b = await readBody(req);
    try {
      await license.signUp(String(b.email || '').trim(), String(b.password || ''));
      LIC = await license.getLicense();
      if (LIC && LIC.noProfile && license.trialTokens() > 0) {
        try { await license.createProfile(); LIC = await license.getLicense(); } catch {}
      }
      sendJson(res, 200, { ok: true, lic: LIC, trialTokens: license.trialTokens(), tokenCosts: TOKEN_COST });
    } catch (e) { sendJson(res, 400, { error: e.message }); }
  } else if (req.method === 'GET' && url === '/auth/session') {
    sendJson(res, 200, { configured: license.configured(), loggedIn: !!LIC, lic: LIC, trialTokens: license.trialTokens(), tokenCosts: TOKEN_COST });
  } else if (req.method === 'POST' && url === '/auth/logout') {
    license.signOut(); LIC = null;
    sendJson(res, 200, { ok: true });

  } else if (req.method === 'POST' && url === '/start') {
    if (RUNNING) { sendJson(res, 400, { error: 'already_running' }); return; }
    if (license.configured() && (!LIC || !LIC.active)) { sendJson(res, 400, { error: 'no_license' }); return; }
    const b = await readBody(req);
    const ALLOWED_MODELS = ['claude-haiku-4-5', 'claude-opus-4-5', 'claude-opus-4-6', 'claude-opus-4-7', 'claude-opus-4-8', 'claude-sonnet-4-5', 'claude-sonnet-4-6', 'gpt-5.3', 'gpt-5.4', 'gpt-5.5'];
    if (b.model && ALLOWED_MODELS.includes(String(b.model))) {
      setModel(String(b.model));
      WA_MODEL = String(b.model);
    }
    if (b.dokMode === 'opus' || b.dokMode === 'haiku' || b.dokMode === 'basic') DOK_MODE = b.dokMode;
    SCAN_ON_START = b.mode !== 'new';
    const excel = String(b.excel || '').trim().replace(/^"|"$/g, '').replace(/\\/g, '/');
    if (!excel || !fs.existsSync(excel)) { sendJson(res, 400, { error: 'excel_not_found' }); return; }
    EXCEL_PATH = excel;

    const source = b.source || 'whatsapp';
    let execPath = '';
    if (b.browser === 'brave') execPath = findBrowser(BRAVE_PATHS);
    else if (b.browser === 'custom') execPath = String(b.customPath || '').trim().replace(/^"|"$/g, '');
    else execPath = findBrowser(CHROME_PATHS);
    if (!execPath || !fs.existsSync(execPath)) { sendJson(res, 400, { error: 'browser_not_found' }); return; }
    RUNNING = true; setStatus('starting');
    log(T.usingBrowser(execPath)); log(T.usingExcel(EXCEL_PATH));
    log(T.waCost(WA_MODEL, waCostForModel(WA_MODEL)));
    if (source === 'instagram' || source === 'telegram') {
      sendJson(res, 200, { ok: true, source, model: WA_MODEL, waCost: waCostForModel(WA_MODEL) });
      startWebMessenger(source, execPath).catch((e) => {
        log(T.errorMsg, e);
        setStatus('error');
        RUNNING = false;
      });
      return;
    }
    startWhatsApp(execPath);
    sendJson(res, 200, { ok: true, source: 'whatsapp', model: WA_MODEL, waCost: waCostForModel(WA_MODEL) });

  } else if (req.method === 'POST' && url === '/cmd') {
    const b = await readBody(req);
    const cmd = String(b.cmd || '');
    if (cmd === 'stop') {
      sendJson(res, 200, { ok: true });
      log(T.stopping); setStatus('stopped');
      await stopAllBots();
      try { await flushExcel(); await closeWorkbook(); } catch {}
      flushCache();
      RUNNING = false;
    } else if (cmd === 'rewind') {
      sendJson(res, 200, { ok: true });
      if (!RUNNING) { log(T.notRunning); return; }
      log(T.rewinding); cache = {}; saveCache();
      setStatus('scanning'); await scanChatsWithRetry(); setStatus('listening');
    } else if (cmd === 'refresh') {
      sendJson(res, 200, { ok: true });
      if (!RUNNING) { log(T.notRunning); return; }
      if (ACTIVE_SOURCE === 'whatsapp') await refreshSparse();
      else log('Дочитать пустые доступно только для WhatsApp');
    } else { sendJson(res, 400, { error: 'unknown_cmd' }); }

  } else if (req.method === 'POST' && url === '/convert') {
 // Конвертер: xlsx ↔ xls ↔ csv. Тело: { name, data(base64), to }
 let b;
 try { b = await readBody(req, converter.MAX_FILE_BYTES * 1.5); }
 catch (e) { sendJson(res, 413, { error: 'file_too_large', max: converter.MAX_FILE_BYTES }); return; }
 const name = String(b.name || '').trim();
 const data = String(b.data || '');
 const to = String(b.to || '').toLowerCase();

 if (!name || !data) { sendJson(res,400, { error: 'empty_file' }); return; }
 if (data.length > converter.MAX_FILE_BYTES *1.4) { sendJson(res,400, { error: 'file_too_large', max: converter.MAX_FILE_BYTES }); return; }

 const from = converter.detectFormat(name);
 if (!from) { sendJson(res,400, { error: 'unsupported_format', supported: Object.keys(converter.FORMATS) }); return; }
 if (!converter.FORMATS[to]) { sendJson(res,400, { error: 'unsupported_target', supported: Object.keys(converter.FORMATS) }); return; }
 if (from === to) { sendJson(res,400, { error: 'same_format' }); return; }

 let buf;
 try { buf = Buffer.from(data, 'base64'); } catch { sendJson(res,400, { error: 'bad_data' }); return; }

 try {
 const out = converter.convertBuffer(buf, from, to);
 const outName = converter.outputName(name, to);
 log(`🔄 Конвертер: ${name} → ${outName} (${(out.length /1024).toFixed(1)} КБ)`);
 sendJson(res,200, {
 ok: true, from, to, name: outName, size: out.length,
 data: out.toString('base64')
 });
 } catch (e) {
 sendJson(res,400, { error: 'convert_failed', message: (e && e.message) || String(e) });
 }

  } else {
    res.writeHead(404); res.end('Not found');
  }
  } catch (e) {
    if (!res.headersSent) sendJson(res, 500, { error: (e && e.message) || 'server_error' });
  }
});

(async () => {
  if (license.configured()) {
    try { if (await license.restoreSession()) LIC = await license.getLicense(); } catch {}
  }
})();

function openDesktopWindow(url) {
  if (process.platform !== 'win32') {
    exec('xdg-open "' + url.replace(/"/g, '') + '"');
    return;
  }
  const browser = findBrowser(CHROME_PATHS) || findBrowser(BRAVE_PATHS);
  if (!browser) { exec('start "" "' + url.replace(/"/g, '') + '"'); return; }
  const profile = path.join(BASE_DIR, '.gn-tools-window');
  const child = spawn(browser, [
    '--app=' + url,
    '--new-window',
    '--no-first-run',
    '--no-default-browser-check',
    '--user-data-dir=' + profile
  ], { detached: true, stdio: 'ignore', windowsHide: true });
  child.unref();
}

server.listen(PORT, '127.0.0.1', () => {
  const url = 'http://127.0.0.1:' + PORT;
  console.log('\n  ▶ Open GN Tools: ' + url + '\n');
  openDesktopWindow(url);
});
