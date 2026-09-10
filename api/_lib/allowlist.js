/* ==========================================================================
   SEZIBERA CONSTRUCTION — DOCUMENT ACCESS ALLOWLIST
   --------------------------------------------------------------------------
   THIS FILE IS THE ONLY PLACE YOU CONTROL WHO CAN READ THE ROLE DOCUMENTS.

   To GIVE someone access:  add their email below with the documents they may
                            open, then commit and push. Vercel redeploys and
                            the access is live in about a minute.
   To REMOVE someone:       delete their line (or the whole entry), commit and
                            push. Their access is cut off on their very next
                            page request, even if they are already signed in.

   Emails are matched case-insensitively and are trimmed of spaces, so
   "  PM@Sezibera.com " and "pm@sezibera.com" are the same person.

   Document keys you may use (see DOCUMENTS below):
     project-manager        quantity-surveyor
     procurement-officer    office-administrator

   Use '*' instead of a list to grant every document — intended for directors.
   ========================================================================== */

/* The documents themselves. Adding a new one means dropping a generated file
   into api/_lib/docs/ and adding a line here — nothing else changes. */
var DOCUMENTS = {
  'project-manager':      { title: 'Project Manager — SOP-PM-01',      pages: 6 },
  'quantity-surveyor':    { title: 'Quantity Surveyor — SOP-QS-01',    pages: 7 },
  'procurement-officer':  { title: 'Procurement Officer — SOP-PR-01',  pages: 6 },
  'office-administrator': { title: 'Office Administrator — SOP-OA-01', pages: 6 }
};

/* ---------------------------------------------------------------------------
   THE ALLOWLIST. Replace these examples with your real people.
   --------------------------------------------------------------------------- */
var ALLOWLIST = [

  /* Directors and the company mailbox — every document. */
  { email: 'info@sezibera.com',     name: 'Sezibera Construction', docs: '*' },
  { email: 'wisecrepin4@gmail.com', name: 'Administrator',         docs: '*' }

  /* Staff go below, one line each. Copy a line, change the three values, then
     commit and push — access is live in about a minute. A person's personal
     address (Gmail, Yahoo, anything) works exactly as well as a company one;
     only what is written here matters.

  , { email: 'jean@example.com',  name: 'Jean',  docs: ['project-manager'] }
  , { email: 'alice@example.com', name: 'Alice', docs: ['quantity-surveyor', 'procurement-officer'] }
  */

];

/* --------------------------------------------------------------------------
   Nothing below this line needs editing.
   -------------------------------------------------------------------------- */

function normalise(email) {
  return String(email == null ? '' : email).trim().toLowerCase();
}

/* Returns the allowlist entry for an email, or null if they are not on it. */
function find(email) {
  var wanted = normalise(email);
  if (!wanted) return null;
  for (var i = 0; i < ALLOWLIST.length; i++) {
    if (normalise(ALLOWLIST[i].email) === wanted) return ALLOWLIST[i];
  }
  return null;
}

/* The documents an email may open, as [{ slug, title, pages }]. Empty if none. */
function documentsFor(email) {
  var entry = find(email);
  if (!entry) return [];
  var slugs = entry.docs === '*' ? Object.keys(DOCUMENTS) : (entry.docs || []);
  var out = [];
  for (var i = 0; i < slugs.length; i++) {
    var meta = DOCUMENTS[slugs[i]];
    if (meta) out.push({ slug: slugs[i], title: meta.title, pages: meta.pages });
  }
  return out;
}

/* True only if this email may open this exact document, right now. */
function mayRead(email, slug) {
  return documentsFor(email).some(function (d) { return d.slug === slug; });
}

module.exports = { DOCUMENTS: DOCUMENTS, find: find, normalise: normalise,
                   documentsFor: documentsFor, mayRead: mayRead };
