/* GET /api/doc/page?doc=<slug>&page=<n>
   Returns one page of one document as a PNG with the reader's email and the
   current time burned into it by the server. The browser never receives the
   PDF, and never receives an unwatermarked image. */

var sharp = require('sharp');
var allowlist = require('../_lib/allowlist');
var auth = require('../_lib/auth');
var pages = require('../_lib/pages');

function escapeXml(s) {
  return String(s).replace(/[&<>"']/g, function (c) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' }[c];
  });
}

/* Kigali time, written plainly so a photographed screen still dates itself. */
function stamp() {
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Africa/Kigali', dateStyle: 'medium', timeStyle: 'short'
  }).format(new Date()) + ' CAT';
}

/* A single footer strip along the bottom edge, and nothing over the text
   itself. This is what makes a leaked page traceable: it names the reader and
   the moment they opened it, and because it is composited into the image on
   the server it survives a screenshot or a photograph of the screen. */
function watermarkSvg(width, height, label) {
  var text = escapeXml(label);
  var footerSize = Math.max(12, Math.round(width / 68));
  var barHeight = footerSize * 2.6;
  return Buffer.from(
    '<svg xmlns="http://www.w3.org/2000/svg" width="' + width + '" height="' + height + '">' +
      '<rect x="0" y="' + (height - barHeight) + '" width="' + width + '" ' +
        'height="' + barHeight + '" fill="#1a1a1a" fill-opacity="0.86"/>' +
      '<text x="' + Math.round(width / 2) + '" y="' + Math.round(height - footerSize * 0.85) + '" ' +
        'text-anchor="middle" font-family="Helvetica, Arial, sans-serif" ' +
        'font-size="' + footerSize + '" fill="#ffffff">' +
        'CONFIDENTIAL &#183; ' + text + ' &#183; not for distribution' +
      '</text>' +
    '</svg>'
  );
}

module.exports = async function (req, res) {
  res.setHeader('Cache-Control', 'no-store, private');
  res.setHeader('X-Robots-Tag', 'noindex, noimageindex, nofollow');

  /* 1. Signed in? */
  var email = auth.sessionEmail(req);
  if (!email) return res.status(401).json({ error: 'Not signed in.' });

  var slug = String((req.query && req.query.doc) || '');
  var pageNumber = parseInt(String((req.query && req.query.page) || '1'), 10);
  if (!Number.isFinite(pageNumber)) pageNumber = 0;

  /* 2. Still allowed to read THIS document? Re-checked on every page, so
        removing someone from the allowlist cuts them off immediately. */
  if (!allowlist.mayRead(email, slug)) {
    console.log('[docs] blocked: ' + email + ' -> ' + slug);
    return res.status(403).json({ error: 'You do not have access to this document.' });
  }

  var original = pages.pageBuffer(slug, pageNumber);
  if (!original) return res.status(404).json({ error: 'No such page.' });

  try {
    var image = sharp(original);
    var meta = await image.metadata();
    var label = email + ' · ' + stamp();
    var out = await image
      .composite([{ input: watermarkSvg(meta.width, meta.height, label), top: 0, left: 0 }])
      .png({ compressionLevel: 9 })
      .toBuffer();

    /* 3. Access log. Visible in the Vercel dashboard under Logs. */
    console.log('[docs] read: ' + email + ' -> ' + slug + ' page ' + pageNumber);

    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Content-Length', out.length);
    return res.status(200).send(out);
  } catch (e) {
    console.error('[docs] render failed for ' + slug + ' page ' + pageNumber + ': ' + e.message);
    return res.status(500).json({ error: 'The page could not be prepared.' });
  }
};
