/* POST /api/auth/request-code   { email }
   Checks the allowlist and, if the address is approved, emails a one-time code
   and remembers the attempt in a signed cookie. */

var allowlist = require('../_lib/allowlist');
var auth = require('../_lib/auth');
var mail = require('../_lib/mail');

module.exports = async function (req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Use POST.' });
  }

  var body = req.body;
  if (typeof body === 'string') { try { body = JSON.parse(body); } catch (e) { body = {}; } }
  var email = allowlist.normalise(body && body.email);

  if (!email || email.indexOf('@') < 1) {
    return res.status(400).json({ error: 'Enter a valid email address.' });
  }

  var docs = allowlist.documentsFor(email);
  if (!docs.length) {
    /* Deliberately explicit: these are colleagues, and a silent failure after
       a typo costs more than the mild disclosure that an address is approved. */
    console.log('[docs] denied sign-in attempt: ' + email);
    return res.status(403).json({
      error: 'That email address has not been given access to any document. ' +
             'Check the spelling, or ask the office to add you.'
    });
  }

  var code = auth.newCode();
  try {
    await mail.sendCode(email, code, auth.PENDING_MINUTES);
  } catch (e) {
    console.error('[docs] could not send code to ' + email + ': ' + e.message);
    return res.status(500).json({
      error: 'The code could not be sent. Please tell the office — the email ' +
             'service needs attention.'
    });
  }

  auth.startPending(res, email, code);
  console.log('[docs] code sent: ' + email);
  return res.status(200).json({ ok: true, email: email, minutes: auth.PENDING_MINUTES });
};
