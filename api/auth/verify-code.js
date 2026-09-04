/* POST /api/auth/verify-code   { code }
   Turns a correct one-time code into a signed session cookie. */

var allowlist = require('../_lib/allowlist');
var auth = require('../_lib/auth');

module.exports = async function (req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Use POST.' });
  }

  var body = req.body;
  if (typeof body === 'string') { try { body = JSON.parse(body); } catch (e) { body = {}; } }

  var email = auth.checkPending(req, body && body.code);
  if (!email) {
    return res.status(401).json({
      error: 'That code is wrong or has expired. Request a new one.'
    });
  }

  /* Re-check the allowlist: someone may have been removed in the minutes
     between asking for the code and entering it. */
  var docs = allowlist.documentsFor(email);
  if (!docs.length) {
    auth.endSession(res);
    return res.status(403).json({ error: 'Your access has been withdrawn.' });
  }

  auth.startSession(res, email);
  console.log('[docs] signed in: ' + email);
  return res.status(200).json({ ok: true, email: email, documents: docs });
};
