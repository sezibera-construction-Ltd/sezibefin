/* GET /api/auth/session
   Who is signed in, and what they are allowed to open right now. */

var allowlist = require('../_lib/allowlist');
var auth = require('../_lib/auth');

module.exports = async function (req, res) {
  res.setHeader('Cache-Control', 'no-store');

  var email = auth.sessionEmail(req);
  if (!email) return res.status(200).json({ signedIn: false });

  var docs = allowlist.documentsFor(email);
  if (!docs.length) {
    auth.endSession(res);
    return res.status(200).json({ signedIn: false });
  }

  return res.status(200).json({ signedIn: true, email: email, documents: docs });
};
