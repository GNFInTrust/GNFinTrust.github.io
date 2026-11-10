'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { PassThrough } = require('node:stream');
const { guardRequest, readBody } = require('../local-http');

function request(headers = {}, method = 'GET') {
  return { method, headers: { host: '127.0.0.1:3390', ...headers } };
}
const response = () => ({ headers: {}, setHeader(name, value) { this.headers[name] = value; } });

test('loopback API rejects DNS rebinding, cross-origin, null origins, and cross-site requests', () => {
  for (const headers of [
    { host: 'attacker.example:3390' }, { host: '127.0.0.1:9999' },
    { origin: 'https://attacker.example' }, { origin: 'null' },
    { 'sec-fetch-site': 'cross-site' }, { 'sec-fetch-site': 'same-site' },
    { host: 'localhost:3390', origin: 'http://127.0.0.1:3390' },
  ]) {
    assert.throws(() => guardRequest(request(headers), response(), 3390), { statusCode: 403 });
  }
});

test('same-origin JSON requests pass and get private response headers', () => {
  const res = response();
  guardRequest(request({ origin: 'http://127.0.0.1:3390', 'sec-fetch-site': 'same-origin', 'content-type': 'application/json; charset=utf-8' }, 'POST'), res, 3390);
  assert.equal(res.headers['Cache-Control'], 'no-store');
  assert.equal(res.headers['X-Content-Type-Options'], 'nosniff');
  assert.equal(res.headers['Cross-Origin-Resource-Policy'], 'same-origin');
});

test('HTML forms and unsupported methods cannot mutate local state', () => {
  for (const type of [undefined, 'text/plain', 'application/x-www-form-urlencoded', 'multipart/form-data']) {
    assert.throws(() => guardRequest(request({ 'content-type': type }, 'POST'), response(), 3390), { statusCode: 415 });
  }
  assert.throws(() => guardRequest(request({}, 'OPTIONS'), response(), 3390), { statusCode: 405 });
});

test('malformed JSON and non-object bodies fail instead of running with defaults', async () => {
  for (const body of ['{', 'null', '[]', '"text"', '1']) {
    const stream = new PassThrough();
    const pending = readBody(stream);
    stream.end(body);
    await assert.rejects(pending, { statusCode: 400 });
  }
});

test('oversized and aborted bodies fail without destroying the response socket', async () => {
  const stream = new PassThrough();
  const pending = readBody(stream, 8);
  stream.write('0123456789');
  await assert.rejects(pending, { statusCode: 413 });
  assert.equal(stream.destroyed, false);
  stream.end();
  const aborted = new PassThrough();
  const failed = readBody(aborted);
  aborted.emit('aborted');
  await assert.rejects(failed, { statusCode: 400 });
  aborted.destroy();
});

test('valid split JSON bodies are parsed without changing values', async () => {
  const stream = new PassThrough();
  const pending = readBody(stream);
  stream.write('{"path":"');
  stream.end('$(echo injected).xlsx"}');
  assert.deepEqual(await pending, { path: '$(echo injected).xlsx' });
});
