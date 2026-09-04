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
  'project-manager':      { title: 'Project Manager',      pages: 4 },
  'quantity-surveyor':    { title: 'Quantity Surveyor',    pages: 4 },
  'procurement-officer':  { title: 'Procurement Officer',  pages: 4 },
  'office-administrator': { title: 'Office Administrator', pages: 4 }
};

/* ---------------------------------------------------------------------------
   THE ALLOWLIST. Replace these examples with your real people.
   --------------------------------------------------------------------------- */
var ALLOWLIST = [

  // A director who should see everything.
  { email: 'wisecrepin4@gmail.com', name: 'Administrator', docs: '*' },

  // Examples — delete these two lines once you have added your real staff.
  { email: 'pm@sezibera.com', name: 'Project Manager', docs: ['project-manager'] },
  { email: 'qs@sezibera.com', name: 'Quantity Surveyor', docs: ['quantity-surveyor'] }

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
