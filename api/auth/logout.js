/* POST /api/auth/logout */

var auth = require('../_lib/auth');

module.exports = async function (req, res) {
  auth.endSession(res);
  return res.status(200).json({ ok: true });
};
