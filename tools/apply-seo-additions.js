/* One-shot injector for the site-wide additions: the search-result favicon
   block, the analytics tag and the sticky mobile call bar. Every page must carry these identically, so they are
   generated from one source here rather than pasted six times by hand.

   Idempotent. Each block is fenced by its own marker comment and is skipped
   if that marker is already in the file, so re-running changes nothing. */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');

/* --- The favicon block ---------------------------------------------------
   Google will only use a favicon in a search result if it is square and its
   side is a multiple of 48px. The old .ico was 256x256, which is not, so the
   result fell back to the generic globe. The .ico now carries 48/96/144/192
   and keeps its stable /favicon.ico URL — Google re-crawls that path on its
   own schedule and a changing URL resets that clock, so it stays put. The
   PNGs are versioned only so browsers drop their cached copy. */
const ICONS = `<link rel="icon" href="/favicon.ico" sizes="48x48 96x96 144x144 192x192">
<link rel="icon" type="image/png" sizes="48x48" href="/assets/images/icon-48.png?v=4">
<link rel="icon" type="image/png" sizes="192x192" href="/assets/images/icon-192.png?v=4">
<link rel="icon" type="image/svg+xml" href="/assets/images/favicon.svg?v=4">
<link rel="apple-touch-icon" sizes="180x180" href="/assets/images/apple-touch-icon.png?v=4">`;

const ICONS_OLD = `<link rel="icon" href="/favicon.ico" sizes="any">
<link rel="icon" type="image/png" sizes="96x96" href="/assets/images/icon-96.png?v=3">
<link rel="icon" type="image/svg+xml" href="/assets/images/favicon.svg?v=3">
<link rel="apple-touch-icon" sizes="180x180" href="/assets/images/apple-touch-icon.png?v=3">`;

/* --- Analytics -----------------------------------------------------------
   GA4, property G-7YZJ98CMZZ. The measurement ID lives in exactly one place
   per page: the MEASUREMENT_ID constant below. If it is ever reset to a
   G-X... placeholder the guard leaves the tag inert rather than reporting
   into the wrong property, which is why the ID is a variable and not
   inlined into the script URL. */
const ANALYTICS = `<!-- ANALYTICS:START -->
<script>
/* GA4 for the Sezibera Construction property. The ID comes from
   Admin, Data streams, Web in Google Analytics. It is the only place on
   the page the ID appears, and the guard below means a page left with a
   G-X... placeholder loads and sends nothing rather than reporting into
   the wrong property. */
var MEASUREMENT_ID = 'G-7YZJ98CMZZ';

if (MEASUREMENT_ID.indexOf('G-X') !== 0) {
  window.dataLayer = window.dataLayer || [];
  window.gtag = function () { window.dataLayer.push(arguments); };
  gtag('js', new Date());
  /* anonymize_ip keeps the privacy policy honest about what we collect. */
  gtag('config', MEASUREMENT_ID, { anonymize_ip: true });

  var ga = document.createElement('script');
  ga.async = true;
  ga.src = 'https://www.googletagmanager.com/gtag/js?id=' + MEASUREMENT_ID;
  document.head.appendChild(ga);
}
</script>
<!-- ANALYTICS:END -->`;

/* There was a visible breadcrumb trail here too. It was removed at the
   client's request: the pages are one level deep, so a trail that only ever
   read "Home — About" told a visitor nothing they could not already see in
   the nav. The BreadcrumbList markup in each page's head is untouched, since
   search engines still use it and nobody has to look at it. */

const PAGES = [
  'index.html',
  'about.html',
  'services.html',
  'projects.html',
  'careers.html',
  'contact.html',
  'thank-you.html',
  'privacy.html'
];

let touched = 0;

for (const file of PAGES) {
  const full = path.join(ROOT, file);
  if (!fs.existsSync(full)) { console.log('skip (absent) ' + file); continue; }

  let html = fs.readFileSync(full, 'utf8');
  const before = html;

  /* Favicon block */
  if (html.includes(ICONS_OLD)) html = html.replace(ICONS_OLD, ICONS);

  /* Analytics — last thing in the head, so it never delays the stylesheet */
  if (!html.includes('<!-- ANALYTICS:START -->')) {
    html = html.replace('</head>', ANALYTICS + '\n</head>');
  }

  if (html !== before) {
    fs.writeFileSync(full, html);
    touched++;
    console.log('updated ' + file);
  } else {
    console.log('no change ' + file);
  }
}

console.log('\n' + touched + ' file(s) changed.');
