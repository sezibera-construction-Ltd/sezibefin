/* ==========================================================================
   SIGNED, STATELESS SESSIONS
   --------------------------------------------------------------------------
   There is no database. Both the short-lived "we have emailed you a code"
   state and the "you are signed in" state travel as cookies that carry an
   HMAC signature made with SESSION_SECRET. The browser can read nothing and
   forge nothing: change one character of the payload and the signature stops
   matching, and the request is rejected.

   Because the pending-code state lives in a cookie, the code must be entered
   in the same browser that asked for it. That is deliberate — a code
   forwarded to someone else is useless on its own.
   ========================================================================== */

var crypto = require('crypto');

var PENDING_COOKIE = 'sez_pending';
var SESSION_COOKIE = 'sez_session';
var PENDING_MINUTES = 10;      /* how long an emailed code stays valid */
var SESSION_HOURS   = 8;       /* how long a sign-in lasts */

function secret() {
  var s = process.env.SESSION_SECRET;
  if (!s || s.length < 32) {
    throw new Error(
      'SESSION_SECRET is missing or too short. Set it in the Vercel project ' +
      'settings to a random string of at least 32 characters.');
  }
  return s;
}

function b64url(buf) {
  return Buffer.from(buf).toString('base64')
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function unb64url(str) {
  return Buffer.from(String(str).replace(/-/g, '+').replace(/_/g, '/'), 'base64');
}

/* payload object -> "<payload>.<signature>" */
function sign(payload) {
  var body = b64url(JSON.stringify(payload));
  var sig = b64url(crypto.createHmac('sha256', secret()).update(body).digest());
  return body + '.' + sig;
}

/* "<payload>.<signature>" -> payload object, or null if tampered or expired. */
function unsign(token) {
  if (!token || typeof token !== 'string') return null;
  var parts = token.split('.');
  if (parts.length !== 2) return null;
  var expected = b64url(crypto.createHmac('sha256', secret()).update(parts[0]).digest());
  var a = Buffer.from(parts[1]);
  var b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  var payload;
  try { payload = JSON.parse(unb64url(parts[0]).toString('utf8')); }
  catch (e) { return null; }
  if (!payload || typeof payload.exp !== 'number' || Date.now() > payload.exp) return null;
  return payload;
}

function parseCookies(req) {
  var out = {};
  var header = req.headers && req.headers.cookie;
  if (!header) return out;
  header.split(';').forEach(function (pair) {
    var i = pair.indexOf('=');
    if (i < 0) return;
    out[pair.slice(0, i).trim()] = decodeURIComponent(pair.slice(i + 1).trim());
  });
  return out;
}

/* httpOnly so page JavaScript cannot read it; Secure so it never travels over
   plain HTTP; SameSite=Lax so it is not sent from other people's sites. */
function setCookie(res, name, value, maxAgeSeconds) {
  var parts = [
    name + '=' + encodeURIComponent(value),
    'Path=/',
    'HttpOnly',
    'Secure',
    'SameSite=Lax',
    'Max-Age=' + maxAgeSeconds
  ];
  var existing = res.getHeader('Set-Cookie');
  var list = existing ? (Array.isArray(existing) ? existing.slice() : [existing]) : [];
  list.push(parts.join('; '));
  res.setHeader('Set-Cookie', list);
}

function clearCookie(res, name) {
  setCookie(res, name, '', 0);
}

/* ---- pending code ------------------------------------------------------- */

function newCode() {
  /* Six digits, uniformly random, leading zeros preserved. */
  return String(crypto.randomInt(0, 1000000)).padStart(6, '0');
}

function hashCode(email, code) {
  return b64url(crypto.createHmac('sha256', secret())
    .update(email + '|' + code).digest());
}

function startPending(res, email, code) {
  setCookie(res, PENDING_COOKIE, sign({
    email: email,
    hash: hashCode(email, code),
    exp: Date.now() + PENDING_MINUTES * 60 * 1000
  }), PENDING_MINUTES * 60);
}

/* Returns the email if the submitted code is right, otherwise null. */
function checkPending(req, code) {
  var pending = unsign(parseCookies(req)[PENDING_COOKIE]);
  if (!pending) return null;
  var submitted = String(code == null ? '' : code).trim();
  if (!/^\d{6}$/.test(submitted)) return null;
  var a = Buffer.from(hashCode(pending.email, submitted));
  var b = Buffer.from(String(pending.hash));
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  return pending.email;
}

/* ---- session ------------------------------------------------------------ */

function startSession(res, email) {
  clearCookie(res, PENDING_COOKIE);
  setCookie(res, SESSION_COOKIE, sign({
    email: email,
    exp: Date.now() + SESSION_HOURS * 60 * 60 * 1000
  }), SESSION_HOURS * 60 * 60);
}

/* The signed-in email, or null. Says nothing about what they may READ —
   that is re-checked against the allowlist on every single request. */
function sessionEmail(req) {
  var s = unsign(parseCookies(req)[SESSION_COOKIE]);
  return s ? s.email : null;
}

function endSession(res) {
  clearCookie(res, SESSION_COOKIE);
  clearCookie(res, PENDING_COOKIE);
}

module.exports = {
  PENDING_MINUTES: PENDING_MINUTES,
  SESSION_HOURS: SESSION_HOURS,
  newCode: newCode,
  startPending: startPending,
  checkPending: checkPending,
  startSession: startSession,
  sessionEmail: sessionEmail,
  endSession: endSession
};
