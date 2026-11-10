'use strict';

// Public Firebase application identifiers, shared with firebase-config.js.
// Never use an Admin SDK/service account in a distributed client.
const fs = require('node:fs');
const path = require('node:path');
const { writeJson } = require('./atomic-file');
const API_KEY = 'AIzaSyDTEUSA6SJaY2zLJ7hRqjGIXdahkYPacRY';
const PROJECT = 'fintrust-af741';
const ROOT = `https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents/users/`;
const SESSION = path.join(process.pkg ? path.dirname(process.execPath) : __dirname, 'license_session.json');
let session = null;
let epoch = 0;
let queue = Promise.resolve();

async function request(url, options = {}) {
  const current = epoch;
  const response = await fetch(url, { ...options, redirect: 'error', signal: AbortSignal.timeout(15000) });
  const data = await response.json();
  if (current !== epoch) throw new Error('session_changed');
  if (!response.ok) {
    const error = new Error(data.error?.message || 'firebase_request_failed');
    error.statusCode = response.status;
    throw error;
  }
  return data;
}

function acceptSession(data) {
  const uid = data.localId || data.user_id;
  const idToken = data.idToken || data.id_token;
  const refreshToken = data.refreshToken || data.refresh_token;
  if (!uid || !idToken || !refreshToken) throw new Error('invalid_auth_response');
  session = { uid, idToken, refreshToken, email: data.email || session?.email || '', expires: Date.now() + Number(data.expiresIn || data.expires_in || 3600) * 1000 };
  writeJson(SESSION, { refreshToken });
}

async function refresh(refreshToken) {
  const data = await request(`https://securetoken.googleapis.com/v1/token?key=${API_KEY}`, {
    method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'refresh_token', refresh_token: refreshToken }),
  });
  acceptSession(data);
}

async function authorize() {
  if (!session) throw new Error('not_signed_in');
  if (session.expires < Date.now() + 60000) await refresh(session.refreshToken);
  return { Authorization: `Bearer ${session.idToken}`, 'Content-Type': 'application/json' };
}

async function profile() {
  const headers = await authorize();
  try { return await request(ROOT + encodeURIComponent(session.uid), { headers }); }
  catch (error) { if (error.statusCode === 404) return null; throw error; }
}

function licenseFrom(doc) {
  if (!doc) return { email: session.email, admin: false, tokens: 0, active: false, noProfile: true };
  const fields = doc.fields || {};
  const value = Number(fields.tokens?.integerValue || 0);
  const tokens = Number.isSafeInteger(value) && value >= 0 ? value : 0;
  const admin = fields.admin?.booleanValue === true;
  return { email: fields.email?.stringValue || session.email, admin, tokens, active: admin || tokens > 0 };
}

async function authenticate(action, email, password) {
  signOut();
  const data = await request(`https://identitytoolkit.googleapis.com/v1/accounts:${action}?key=${API_KEY}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, returnSecureToken: true }),
  });
  acceptSession(data);
}

async function createProfile() {
  const headers = await authorize();
  const doc = await request(ROOT + encodeURIComponent(session.uid) + '?currentDocument.exists=false', {
    method: 'PATCH', headers,
    body: JSON.stringify({ fields: {
      email: { stringValue: session.email }, admin: { booleanValue: false },
      tokens: { integerValue: '5' }, plan: { stringValue: 'trial' }, subUntil: { stringValue: '' },
      purchases: { arrayValue: { values: [] } }, createdAt: { stringValue: new Date().toISOString() },
    } }),
  });
  return licenseFrom(doc);
}

async function consumeTokens(cost) {
  if (!Number.isSafeInteger(cost) || cost <= 0) throw new Error('invalid_token_cost');
  for (let attempt = 0; attempt < 3; attempt++) {
    const doc = await profile();
    const lic = licenseFrom(doc);
    if (lic.admin) return lic;
    if (lic.tokens < cost || !doc?.updateTime) throw new Error('no_tokens');
    const headers = await authorize();
    const query = new URLSearchParams({ 'updateMask.fieldPaths': 'tokens', 'currentDocument.updateTime': doc.updateTime });
    try {
      const updated = await request(ROOT + encodeURIComponent(session.uid) + '?' + query, {
        method: 'PATCH', headers,
        body: JSON.stringify({ fields: { tokens: { integerValue: String(lic.tokens - cost) } } }),
      });
      return licenseFrom(updated);
    } catch (error) {
      if (attempt === 2 || ![400, 409, 412].includes(error.statusCode)) throw error;
    }
  }
}

function signOut() {
  epoch++;
  session = null;
  try { fs.unlinkSync(SESSION); } catch (error) { if (error.code !== 'ENOENT') throw error; }
}

function serialized(operation) {
  return (...args) => {
    // An operation queued before logout must not act on a later user's session.
    const current = epoch;
    const result = queue.then(() => {
      if (current !== epoch) throw new Error('session_changed');
      return operation(...args);
    });
    queue = result.catch(() => {});
    return result;
  };
}

module.exports = {
  configured: () => true, // Missing/local configuration never disables authorization.
  trialTokens: () => 5,
  signIn: serialized((email, password) => authenticate('signInWithPassword', email, password)),
  signUp: serialized((email, password) => authenticate('signUp', email, password)),
  restoreSession: serialized(async () => {
    let saved;
    try { saved = JSON.parse(fs.readFileSync(SESSION, 'utf8')); }
    catch (error) { if (error.code === 'ENOENT') return false; throw error; }
    if (typeof saved.refreshToken !== 'string' || !saved.refreshToken) throw new Error('invalid_saved_session');
    await refresh(saved.refreshToken);
    return true;
  }),
  getLicense: serialized(async () => licenseFrom(await profile())),
  createProfile: serialized(createProfile), consumeTokens: serialized(consumeTokens), signOut,
};
