/* ==========================================================================
   THE PAGE IMAGES
   --------------------------------------------------------------------------
   Each document was rendered from its PDF into one PNG per page and stored
   here as base64 inside api/, which Vercel never serves as static files. The
   original PDFs are not deployed at all, so there is no URL anywhere on the
   site that returns the real document.

   The requires below are written out one by one on purpose: Vercel's bundler
   follows literal require() paths, and a computed path such as
   require('./docs/' + slug) would leave these files out of the deployment.
   They are wrapped in functions so a cold start only loads the document that
   was actually asked for.
   ========================================================================== */

var LOADERS = {
  'project-manager':      function () { return require('./docs/project-manager'); },
  'quantity-surveyor':    function () { return require('./docs/quantity-surveyor'); },
  'procurement-officer':  function () { return require('./docs/procurement-officer'); },
  'office-administrator': function () { return require('./docs/office-administrator'); }
};

/* Returns the page as a Buffer, or null if the document or page is unknown.
   Pages are numbered from 1. */
function pageBuffer(slug, pageNumber) {
  var loader = Object.prototype.hasOwnProperty.call(LOADERS, slug) ? LOADERS[slug] : null;
  if (!loader) return null;
  var pages = loader();
  var index = pageNumber - 1;
  if (!(index >= 0 && index < pages.length)) return null;
  return Buffer.from(pages[index], 'base64');
}

module.exports = { pageBuffer: pageBuffer };
