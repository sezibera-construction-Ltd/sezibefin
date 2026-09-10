/* Two metadata changes that have to land on every page at once.

   1. Opening hours and a price band on the LocalBusiness node. Google's
      local results show opening hours, and a general contractor with no
      price signal at all reads as an unknown quantity next to one that has
      any. The node is duplicated across all six pages, so it is patched in
      one place here rather than edited six times.

   2. The page titles. Google already prints the site name beside the
      favicon in a result — it takes that from the WebSite node's name — so
      spending characters on "| Sezibera" at the end of every title buys
      nothing and pushes the words people actually search for further from
      the front. The brand comes off; the specifics move up. Titles stay
      unique, which is the whole point of having one per page.

   Idempotent: each change is skipped where it has already been made. */

const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');

/* ---- 1. Opening hours and price band ---------------------------------- */

/* Anchored on the line above so the block lands inside the organization
   node and not inside one of the Service nodes further down, which repeat
   the same areaServed shape. */
const HOURS_ANCHOR = `      "geo": {
        "@type": "GeoCoordinates",
        "latitude": -1.9553,
        "longitude": 30.1103
      },`;

const HOURS = `${HOURS_ANCHOR}
      "openingHoursSpecification": [
        {
          "@type": "OpeningHoursSpecification",
          "dayOfWeek": [
            "Monday",
            "Tuesday",
            "Wednesday",
            "Thursday",
            "Friday"
          ],
          "opens": "08:00",
          "closes": "17:00"
        },
        {
          "@type": "OpeningHoursSpecification",
          "dayOfWeek": "Saturday",
          "opens": "08:00",
          "closes": "13:00"
        }
      ],
      "priceRange": "Priced per project. Free initial consultation.",
      "currenciesAccepted": "RWF",
      "paymentAccepted": "Bank transfer",
      "foundingLocation": {
        "@type": "Place",
        "name": "Kigali, Rwanda"
      },`;

/* ---- 2. Titles --------------------------------------------------------- */

/* old -> new. The old string is matched exactly, so a title that has already
   been changed simply does not match and is left alone. */
const TITLES = {
  'index.html': [
    'Construction Company in Kigali, Rwanda | Sezibera',
    'Construction Company in Kigali, Rwanda'
  ],
  'about.html': [
    'About Sezibera Construction | Contractor in Kigali',
    'About Us: A Construction Contractor in Kigali'
  ],
  'services.html': [
    'Building, Road &amp; Renovation Services in Rwanda | Sezibera',
    'Building, Road &amp; Renovation Services in Rwanda'
  ],
  'projects.html': [
    'Construction Projects in Kigali &amp; Rwanda | Sezibera',
    'Completed Construction Projects in Kigali &amp; Rwanda'
  ],
  'contact.html': [
    'Contact Sezibera Construction | Builders in Kigali',
    'Contact Us: Builders in Remera-Kisimenti, Kigali'
  ],
  'careers.html': [
    'Careers | Sezibera Construction',
    'Construction Jobs &amp; Careers in Kigali, Rwanda'
  ]
};

const PAGES = Object.keys(TITLES);
let changed = 0;

for (const file of PAGES) {
  const full = path.join(ROOT, file);
  let html = fs.readFileSync(full, 'utf8');
  const before = html;

  /* Opening hours */
  if (!html.includes('openingHoursSpecification')) {
    if (!html.includes(HOURS_ANCHOR)) throw new Error('geo node moved in ' + file);
    html = html.replace(HOURS_ANCHOR, HOURS);
  }

  /* Title, and the two social copies of it that have to agree with it.
     The og: and twitter: variants keep working with the plain-text form,
     since the entity in the title is escaped identically in all three. */
  const [oldT, newT] = TITLES[file];
  if (html.includes(oldT)) {
    const hits = html.split(oldT).length - 1;
    /* <title>, og:title, twitter:title — three, or two on a page whose
       WebPage node names the page differently. */
    if (hits < 3) throw new Error('expected 3 title copies in ' + file + ', found ' + hits);
    html = html.split(oldT).join(newT);
  }

  if (html !== before) {
    fs.writeFileSync(full, html);
    changed++;
    console.log('updated ' + file);
  } else {
    console.log('no change ' + file);
  }
}

console.log('\n' + changed + ' file(s) changed.');
