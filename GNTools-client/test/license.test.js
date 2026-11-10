'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

function harness() {
  let saved;
  let balance = 5;
  let version = 1;
  let admin = false;
  let missing = false;
  let conflict = false;
  let denied = false;
  const calls = [];
  const result = (data, status = 200) => ({ ok: status < 400, status, json: async () => data });
  const doc = () => ({ fields: { email: { stringValue: 'user@example.com' }, tokens: { integerValue: String(balance) }, admin: { booleanValue: admin } }, updateTime: 'v' + version });
  const exports = { exports: {} };
  const sandbox = {
    module: exports, __dirname: '/virtual-client', process: { pkg: false }, Date,
    URLSearchParams, AbortSignal,
    require(name) {
      if (name === 'node:path') return path;
      if (name === './atomic-file') return { writeJson: (file, value) => { saved = value; } };
      if (name === 'node:fs') return {
        unlinkSync: () => { saved = undefined; },
        readFileSync: () => { if (!saved) throw Object.assign(new Error('missing'), { code: 'ENOENT' }); return JSON.stringify(saved); },
      };
      throw new Error('unexpected dependency ' + name);
    },
    async fetch(url, options) {
      calls.push({ url, options });
      if (url.includes('identitytoolkit')) return result({ localId: 'uid', idToken: 'verified-token', refreshToken: 'refresh', email: 'user@example.com' });
      if (url.includes('securetoken')) return result({ user_id: 'uid', id_token: 'fresh-token', refresh_token: 'refresh' });
      assert.match(options.headers.Authorization, /^Bearer (verified|fresh)-token$/);
      if (denied) return result({ error: { message: 'PERMISSION_DENIED' } }, 403);
      if (options.method === 'PATCH') {
        const parsed = new URL(url);
        const fields = JSON.parse(options.body).fields;
        if (parsed.searchParams.get('currentDocument.exists') === 'false') {
          if (!missing) return result({ error: { message: 'ALREADY_EXISTS' } }, 409);
          balance = Number(fields.tokens.integerValue); missing = false; version++;
          return result(doc());
        }
        if (conflict) { conflict = false; balance--; version++; }
        if (parsed.searchParams.get('currentDocument.updateTime') !== 'v' + version) return result({ error: { message: 'FAILED_PRECONDITION' } }, 409);
        assert.equal(parsed.searchParams.get('updateMask.fieldPaths'), 'tokens');
        balance = Number(fields.tokens.integerValue); version++;
      }
      return missing ? result({ error: { message: 'NOT_FOUND' } }, 404) : result(doc());
    },
  };
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../license.js'), 'utf8'), sandbox);
  return {
    license: exports.exports, calls,
    get saved() { return saved; }, get balance() { return balance; },
    set admin(value) { admin = value; }, set missing(value) { missing = value; },
    set conflict(value) { conflict = value; }, set denied(value) { denied = value; },
  };
}

test('authorization is enabled without config and signed-out spending fails closed', async () => {
  const { license } = harness();
  assert.equal(license.configured(), true);
  await assert.rejects(license.consumeTokens(1), /not_signed_in/);
});

test('sessions persist only refresh tokens and license rights come from Firestore', async () => {
  const h = harness();
  await h.license.signIn('user@example.com', 'password');
  assert.equal(JSON.stringify(h.saved), '{"refreshToken":"refresh"}');
  assert.equal((await h.license.getLicense()).admin, false);
  h.admin = true;
  assert.equal((await h.license.getLicense()).admin, true);
  h.license.signOut();
  await assert.rejects(h.license.getLicense(), /not_signed_in/);
});

test('parallel spending is serialized and cannot exceed the remote balance', async () => {
  const h = harness();
  await h.license.signIn('user@example.com', 'password');
  const result = await Promise.allSettled([h.license.consumeTokens(3), h.license.consumeTokens(3)]);
  assert.equal(result.filter(r => r.status === 'fulfilled').length, 1);
  assert.equal(h.balance, 2);
});

test('spending retries conditional conflicts and rechecks the new balance', async () => {
  const h = harness();
  await h.license.signIn('user@example.com', 'password');
  h.conflict = true;
  const lic = await h.license.consumeTokens(3);
  assert.equal(lic.tokens, 1);
  assert.equal(h.balance, 1);
});

test('network/rules rejection never grants local tokens', async () => {
  const h = harness();
  await h.license.signIn('user@example.com', 'password');
  h.denied = true;
  await assert.rejects(h.license.consumeTokens(1), /PERMISSION_DENIED/);
  assert.equal(h.balance, 5);
});

test('a trial profile can only be created once and uses a fixed allowance', async () => {
  const h = harness();
  await h.license.signUp('user@example.com', 'password');
  h.missing = true;
  assert.equal((await h.license.getLicense()).noProfile, true);
  assert.equal((await h.license.createProfile()).tokens, 5);
  await assert.rejects(h.license.createProfile(), /ALREADY_EXISTS/);
});

test('logout invalidates spending that was already queued', async () => {
  const h = harness();
  await h.license.signIn('user@example.com', 'password');
  const spend = h.license.consumeTokens(1);
  h.license.signOut();
  await assert.rejects(spend, /session_changed/);
  assert.equal(h.balance, 5);
});

test('invalid costs never reach Firebase', async () => {
  const h = harness();
  for (const cost of [0, -1, 1.5, NaN, Infinity, '1']) await assert.rejects(h.license.consumeTokens(cost), /invalid_token_cost/);
  assert.equal(h.calls.length, 0);
});
