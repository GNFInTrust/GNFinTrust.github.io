'use strict';

function httpError(statusCode, message) {
  return Object.assign(new Error(message), { statusCode });
}

// Loopback binding alone does not prevent browser requests or DNS rebinding.
function guardRequest(req, res, port) {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader('Cross-Origin-Resource-Policy', 'same-origin');
  const hosts = [`127.0.0.1:${port}`, `localhost:${port}`];
  if (!hosts.includes(req.headers.host)) throw httpError(403, 'invalid_host');
  const origin = req.headers.origin;
  if (origin && origin !== `http://${req.headers.host}`) throw httpError(403, 'invalid_origin');
  const site = req.headers['sec-fetch-site'];
  if (site && !['same-origin', 'none'].includes(site)) throw httpError(403, 'cross_site_request');
  if (!['GET', 'POST'].includes(req.method)) throw httpError(405, 'method_not_allowed');
  if (req.method === 'POST' && req.headers['content-type']?.split(';')[0].trim() !== 'application/json') {
    throw httpError(415, 'json_required');
  }
}

function readBody(req, limit = 2 * 1024 * 1024) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    let failed = false;
    function fail(error) {
      if (failed) return;
      failed = true;
      chunks.length = 0;
      reject(error);
    }
    req.on('data', chunk => {
      if (failed) return;
      size += chunk.length;
      if (size > limit) { fail(httpError(413, 'body_too_large')); return; }
      chunks.push(chunk);
    });
    req.on('end', () => {
      if (failed) return;
      try {
        const value = JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}');
        if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error();
        resolve(value);
      } catch { fail(httpError(400, 'invalid_json')); }
    });
    req.on('aborted', () => fail(httpError(400, 'request_aborted')));
    req.on('error', () => fail(httpError(400, 'request_failed')));
  });
}

module.exports = { guardRequest, readBody, httpError };
