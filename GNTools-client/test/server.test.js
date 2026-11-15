'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { PassThrough } = require('node:stream');
const { EventEmitter } = require('node:events');

function harness(configured = true) {
  let handler;
  let balance = 5;
  const launches = [];
  const workbook = '/private/$(touch SHOULD_NOT_EXIST).xlsx';
  const server = { listen() {}, on() {} };
  const license = {
    configured: () => configured, restoreSession: async () => false,
    trialTokens: () => 5, signIn: async () => {},
    getLicense: async () => ({ email: 'user@example.test', tokens: balance, active: true, admin: false }),
    consumeTokens: async cost => {
      await new Promise(resolve => setTimeout(resolve, 5));
      if (balance < cost) throw new Error('no_tokens');
      balance -= cost;
      return { email: 'user@example.test', tokens: balance, active: balance > 0, admin: false };
    },
  };
  const stubFs = {
    existsSync: file => file === workbook || file.endsWith('.html'),
    readFileSync: file => {
      if (file.endsWith('.html')) return '<!doctype html><title>Documents</title>';
      throw new Error('missing');
    },
  };
  const overrides = {
    'whatsapp-web.js': {}, fs: stubFs,
    http: { createServer: callback => { handler = callback; return server; } },
    child_process: { spawn: (...args) => {
      launches.push(args);
      const child = new EventEmitter(); child.unref = () => {};
      queueMicrotask(() => child.emit('spawn'));
      return child;
    } },
    exceljs: {}, './parser.js': {}, './web_scrape.js': {}, './license.js': license,
    './excel_helper.js': { flush: async () => {} },
  };
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../index.js'), 'utf8'), {
    __dirname: '/virtual-client', Buffer, URLSearchParams, setTimeout, clearTimeout,
    console: { log() {}, error() {} },
    process: { cwd: () => '/virtual-client', env: { EXCEL_PATH: workbook }, platform: 'linux' },
    require: name => Object.hasOwn(overrides, name) ? overrides[name] : name.startsWith('./') ? require('../' + name.slice(2)) : require(name),
  });
  return {
    launches, workbook, get balance() { return balance; },
    async invoke(url, { method = 'GET', headers = {}, body = '{}' } = {}) {
      const req = new PassThrough();
      req.method = method; req.url = url;
      req.headers = { host: '127.0.0.1:3390', ...(method === 'POST' ? { 'content-type': 'application/json' } : {}), ...headers };
      const res = {
        status: 200, headers: {}, body: '', headersSent: false, writableEnded: false,
        setHeader(name, value) { this.headers[name] = value; },
        writeHead(code, extra) { this.status = code; this.headersSent = true; Object.assign(this.headers, extra); },
        end(value) { this.body += value || ''; this.writableEnded = true; },
      };
      const pending = handler(req, res);
      req.end(body);
      await pending;
      return res;
    },
  };
}

test('real route handler rejects hostile requests before running local actions', async () => {
  const h = harness();
  for (const url of ['/base/open', '/base/create', '/start', '/auth/login']) {
    const res = await h.invoke(url, { method: 'POST', headers: { origin: 'https://attacker.example' } });
    assert.equal(res.status, 403);
  }
  assert.equal(h.launches.length, 0);
  assert.equal((await h.invoke('/auth/session', { headers: { host: 'attacker.example:3390' } })).status, 403);
});

test('paid routes deny missing authorization even if configuration reports disabled', async () => {
  const h = harness(false);
  assert.equal((await h.invoke('/start', { method: 'POST' })).status, 400);
  assert.equal((await h.invoke('/dokumenty', { method: 'POST' })).status, 403);
  assert.equal(h.balance, 5);
});

test('opening a workbook passes metacharacters as one argument without a shell', async () => {
  const h = harness();
  const res = await h.invoke('/base/open', { method: 'POST' });
  assert.equal(res.status, 200);
  assert.equal(h.launches[0][0], 'xdg-open');
  assert.equal(h.launches[0][1][0], h.workbook);
  assert.equal(h.launches[0][2].shell, false);
});

test('documents cannot charge tokens on GET, and concurrent POSTs keep correct balances', async () => {
  const h = harness();
  await h.invoke('/auth/login', { method: 'POST', body: '{"email":"user@example.test","password":"pass"}' });
  assert.equal((await h.invoke('/dokumenty')).status, 404);
  assert.equal(h.balance, 5);
  const responses = await Promise.all([
    h.invoke('/dokumenty', { method: 'POST', body: '{"mode":"basic"}' }),
    h.invoke('/dokumenty', { method: 'POST', body: '{"mode":"basic"}' }),
  ]);
  responses.forEach(res => assert.equal(res.status, 200));
  assert.equal(h.balance, 3);
});

test('invalid JSON receives a 400 response from the real route handler', async () => {
  const h = harness();
  const res = await h.invoke('/auth/login', { method: 'POST', body: '{' });
  assert.equal(res.status, 400);
  assert.match(res.body, /invalid_json/);
});
