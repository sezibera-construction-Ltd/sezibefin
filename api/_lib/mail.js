/* ==========================================================================
   SENDING THE ONE-TIME CODE
   --------------------------------------------------------------------------
   Uses Resend (https://resend.com). Two environment variables are needed in
   the Vercel project settings:

     RESEND_API_KEY   the key from the Resend dashboard
     MAIL_FROM        the sender, e.g. "Sezibera Construction
                      <info@sezibera.com>". The domain must be verified
                      in Resend first, otherwise Resend refuses to deliver to
                      anyone but your own address.

   If either is missing the sign-in endpoint fails loudly rather than quietly
   pretending a code was sent.
   ========================================================================== */

function escapeHtml(s) {
  return String(s).replace(/[&<>"]/g, function (c) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
  });
}

async function sendCode(email, code, minutes) {
  var key = process.env.RESEND_API_KEY;
  var from = process.env.MAIL_FROM;
  if (!key || !from) {
    throw new Error(
      'Email is not configured. Set RESEND_API_KEY and MAIL_FROM in the ' +
      'Vercel project settings.');
  }

  var text =
    'Your Sezibera Construction access code is ' + code + '\n\n' +
    'Enter it in the browser tab you left open. The code expires in ' +
    minutes + ' minutes and can only be used in that same browser.\n\n' +
    'If you did not ask for this code, ignore this email — nobody can use it ' +
    'without access to your inbox.\n';

  var html =
    '<div style="font-family:Helvetica,Arial,sans-serif;font-size:15px;' +
    'line-height:1.6;color:#1a1a1a;max-width:480px">' +
    '<p style="margin:0 0 18px">Your Sezibera Construction access code is:</p>' +
    '<p style="margin:0 0 18px;font-size:34px;font-weight:700;letter-spacing:6px">' +
    escapeHtml(code) + '</p>' +
    '<p style="margin:0 0 18px">Enter it in the browser tab you left open. ' +
    'The code expires in ' + minutes + ' minutes and only works in that same browser.</p>' +
    '<p style="margin:0;color:#666;font-size:13px">If you did not ask for this code, ' +
    'ignore this email — it cannot be used without access to your inbox.</p></div>';

  var response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': 'Bearer ' + key,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      from: from,
      to: [email],
      subject: 'Your access code: ' + code,
      text: text,
      html: html
    })
  });

  if (!response.ok) {
    var detail = await response.text().catch(function () { return ''; });
    throw new Error('Resend refused the message (' + response.status + '): ' + detail);
  }
}

module.exports = { sendCode: sendCode };
