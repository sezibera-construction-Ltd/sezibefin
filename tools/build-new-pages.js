/* Builds thank-you.html and privacy.html.

   Both pages reuse the existing masthead, nav panel, loader and footer
   verbatim, lifted out of contact.html at build time rather than copied into
   this file. That way a future change to the nav or the footer reaches these
   two pages the same way it reaches the other six, instead of leaving them
   quietly a version behind. Re-run after editing either page's copy. */

const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');

const donor = fs.readFileSync(path.join(ROOT, 'contact.html'), 'utf8');

function slice(from, to) {
  const a = donor.indexOf(from);
  const b = donor.indexOf(to, a);
  if (a < 0 || b < 0) throw new Error('donor markup moved: ' + from);
  return donor.slice(a, b);
}

/* Header: everything from <body> down to <main>, with contact's current-page
   marker stripped — neither new page is the contact page. */
const HEADER = slice('<body>', '<main>').replace(' aria-current="page"', '');

/* Footer: the site footer through to the closing scripts, sticky call bar
   included, so these pages carry the same furniture as every other page. */
/* Neither of these pages carries an enquiry form, so the call bar's second
   button has to point at the one on the contact page rather than at an
   anchor that does not exist here. */
const FOOTER = donor.slice(donor.indexOf('<footer class="site-footer">'))
  .replace('href="#enquiry"', 'href="contact.html#enquiry"');

const ICONS = [
  '<link rel="icon" href="/favicon.ico" sizes="48x48 96x96 144x144 192x192">',
  '<link rel="icon" type="image/png" sizes="48x48" href="/assets/images/icon-48.png?v=4">',
  '<link rel="icon" type="image/png" sizes="192x192" href="/assets/images/icon-192.png?v=4">',
  '<link rel="icon" type="image/svg+xml" href="/assets/images/favicon.svg?v=4">',
  '<link rel="apple-touch-icon" sizes="180x180" href="/assets/images/apple-touch-icon.png?v=4">'
].join('\n');

const SITE = 'https://www.sezibera.com';

function head(o) {
  return [
    '<!DOCTYPE html>',
    '<html lang="en">',
    '<head>',
    '<meta charset="UTF-8">',
    '<meta name="viewport" content="width=device-width, initial-scale=1.0">',
    '<title>' + o.title + '</title>',
    '<meta name="description" content="' + o.description + '">',
    ICONS,
    '<link rel="manifest" href="/site.webmanifest">',
    '<link rel="preconnect" href="https://fonts.googleapis.com">',
    '<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>',
    '<link rel="stylesheet" href="styles.css">',
    '<script>document.documentElement.classList.add("js");window.__loadStart=Date.now();</script>',
    '<!-- SEO:START -->',
    '<link rel="canonical" href="' + SITE + '/' + o.file + '">',
    '<meta name="robots" content="' + o.robots + '">',
    '',
    '<meta property="og:type" content="website">',
    '<meta property="og:site_name" content="Sezibera Construction">',
    '<meta property="og:locale" content="en_RW">',
    '<meta property="og:title" content="' + o.title + '">',
    '<meta property="og:description" content="' + o.description + '">',
    '<meta property="og:url" content="' + SITE + '/' + o.file + '">',
    '<meta property="og:image" content="' + SITE + '/assets/images/og-image.jpg">',
    '<meta property="og:image:width" content="1200">',
    '<meta property="og:image:height" content="630">',
    '<meta property="og:image:alt" content="Sezibera Construction, building and civil works across Rwanda">',
    '',
    '<meta name="twitter:card" content="summary_large_image">',
    '<meta name="twitter:site" content="@seziberaco">',
    '<meta name="twitter:title" content="' + o.title + '">',
    '<meta name="twitter:description" content="' + o.description + '">',
    '<meta name="twitter:image" content="' + SITE + '/assets/images/og-image.jpg">',
    '',
    '<meta name="theme-color" content="#1a1a1a">',
    '<script type="application/ld+json">',
    JSON.stringify(o.schema, null, 2),
    '</script>',
    '<!-- SEO:END -->',
    '</head>'
  ].join('\n');
}

/* These pages had a visible breadcrumb trail; it was removed at the client's
   request. o.crumb survives because the BreadcrumbList markup below still
   names the page, and that markup is kept — it costs the reader nothing and
   search engines read it. */

function schema(o) {
  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'WebPage',
        '@id': SITE + '/' + o.file + '#webpage',
        url: SITE + '/' + o.file,
        name: o.h1,
        description: o.description,
        isPartOf: { '@id': SITE + '/#website' },
        publisher: { '@id': SITE + '/#organization' },
        inLanguage: 'en'
      },
      {
        '@type': 'BreadcrumbList',
        '@id': SITE + '/' + o.file + '#breadcrumb',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Home', item: SITE + '/' },
          { '@type': 'ListItem', position: 2, name: o.crumb }
        ]
      }
    ]
  };
}

function build(o) {
  o.schema = schema(o);
  const html = head(o) + '\n' + HEADER + '<main>\n' +
    o.main + '\n</main>\n\n' + FOOTER;
  fs.writeFileSync(path.join(ROOT, o.file), html);
  console.log('wrote ' + o.file + ' (' + html.length + ' bytes)');
}

/* ---------------------------------------------------------------- thank you
   Reached only once the enquiry form has actually been accepted. It is
   noindex on purpose: it is a step in a flow with nothing to rank for, and
   an indexed one would let people arrive at a confirmation for an enquiry
   they never sent — and would wreck the conversion count in analytics. */
build({
  file: 'thank-you.html',
  crumb: 'Thank you',
  h1: 'Your enquiry has been sent',
  title: 'Your Enquiry Has Been Sent',
  description: 'We have received your enquiry and will reply within one working day.',
  robots: 'noindex, follow',
  main: [
    '  <div class="shell">',
    '    <div class="page-head">',
    '      <span class="eyebrow">Enquiry received</span>',
    '      <h1 class="display">Thank you.<br>Your enquiry<br>has been sent.</h1>',
    '      <p class="lead">A member of our team has your details and will come back to you with the next steps. Nothing more is needed from you right now.</p>',
    '    </div>',
    '  </div>',
    '',
    '  <div class="shell"><hr class="hairline"></div>',
    '',
    '  <section class="section-sm">',
    '    <div class="shell split">',
    '',
    '      <div class="split-body">',
    '        <h2 class="h-section">What happens next</h2>',
    '        <ol class="steps">',
    '          <li>',
    '            <span class="label">We read your enquiry</span>',
    '            <p>Your message goes to the office at Remera&ndash;Kisimenti and is picked up by the person who handles that type of work.</p>',
    '          </li>',
    '          <li>',
    '            <span class="label">We reply within one working day</span>',
    '            <p>You will hear from us by email or phone before the end of the next working day. If your enquiry needs a site visit to answer properly, we will say so and propose a time.</p>',
    '          </li>',
    '          <li>',
    '            <span class="label">We talk through scope and budget</span>',
    '            <p>A free consultation covers what you need, how big the job really is, and what it is likely to cost &mdash; before anything is priced or committed.</p>',
    '          </li>',
    '          <li>',
    '            <span class="label">You get a written proposal</span>',
    '            <p>Scope, programme and price in writing, so you can weigh it against anything else on your desk.</p>',
    '          </li>',
    '        </ol>',
    '      </div>',
    '',
    '      <aside>',
    '        <div class="aside-block">',
    '          <span class="aside-label">&#9742; Need us sooner?</span>',
    '          <p class="aside-value">If the job is urgent, call rather than wait for the reply.<br><a href="tel:+250788303184">+250 788 303 184</a><br><a href="mailto:info@sezibera.com">info@sezibera.com</a></p>',
    '        </div>',
    '        <div class="aside-block">',
    '          <span class="aside-label">&#9656; Our office</span>',
    '          <p class="aside-value">Rembo House, KN 5 Rd, Ground Floor, Office 001<br>Remera&ndash;Kisimenti, Kigali, Rwanda</p>',
    '        </div>',
    '        <div class="aside-block">',
    '          <span class="aside-label">&#9656; Office hours</span>',
    '          <p class="aside-value">Monday to Friday, 08:00&ndash;17:00<br>Saturday, 08:00&ndash;13:00</p>',
    '        </div>',
    '      </aside>',
    '',
    '    </div>',
    '  </section>',
    '',
    '  <div class="shell"><hr class="hairline"></div>',
    '',
    '  <section class="section">',
    '    <div class="shell">',
    '      <h2 class="h-section">While you wait</h2>',
    '      <div class="next-links reveal">',
    '        <a href="projects.html">',
    '          <span class="label">See what we have built</span>',
    '          <p>Thirteen handed-over projects across Kigali, Rwamagana and Kayonza &mdash; warehouses, apartments, hotels, schools and garages.</p>',
    '        </a>',
    '        <a href="services.html">',
    '          <span class="label">The four things we do</span>',
    '          <p>Buildings, roads and pavements, maintenance and renovation, and other civil engineering works.</p>',
    '        </a>',
    '        <a href="about.html">',
    '          <span class="label">Who you will be dealing with</span>',
    '          <p>The people accountable for planning, costing and running your project, and how we work.</p>',
    '        </a>',
    '        <a href="index.html#faq">',
    '          <span class="label">Common questions</span>',
    '          <p>Cost, programme, drawings, where we build, and how a job actually starts.</p>',
    '        </a>',
    '      </div>',
    '    </div>',
    '  </section>'
  ].join('\n')
});

/* ------------------------------------------------------------------ privacy
   Indexed. Someone deciding whether to hand over a phone number should be
   able to reach this from a search as well as from the footer. */
build({
  file: 'privacy.html',
  crumb: 'Privacy policy',
  h1: 'Privacy policy',
  title: 'Privacy Policy',
  description: 'What Sezibera Construction Ltd collects when you use this website or send an enquiry, why we hold it, how long we keep it, and how to ask for it to be deleted.',
  robots: 'index, follow',
  main: [
    '  <div class="shell">',
    '    <div class="page-head">',
    '      <span class="eyebrow">Legal</span>',
    '      <h1 class="display">Privacy policy</h1>',
    '      <p class="lead">This page explains what Sezibera Construction Ltd collects through this website, why we hold it, how long we keep it, and how to have it removed.</p>',
    '      <p class="legal-date">Last updated 10 September 2026</p>',
    '    </div>',
    '  </div>',
    '',
    '  <div class="shell"><hr class="hairline"></div>',
    '',
    '  <section class="section-sm">',
    '    <div class="shell">',
    '      <div class="legal">',
    '',
    '        <h2>Who we are</h2>',
    '        <p>Sezibera Construction Ltd is a construction and contracting company registered in Rwanda, with its office at Rembo House, KN 5 Rd, Ground Floor, Office 001, Remera&ndash;Kisimenti, Kigali. We are the data controller for the information described on this page. For anything to do with your data, write to <a href="mailto:info@sezibera.com" class="link-underline">info@sezibera.com</a> or call <a href="tel:+250788303184" class="link-underline">+250 788 303 184</a>.</p>',
    '',
    '        <h2>What we collect</h2>',
    '        <p>There are only two ways this site collects anything about you.</p>',
    '        <p><strong>What you send us.</strong> The enquiry form asks for your first and last name, your email address, a phone number, and your message. The careers form additionally takes the role you are applying for and whatever you choose to tell us about your experience. Nothing on either form is collected without you typing it in and pressing submit.</p>',
    '        <p><strong>How the site is used.</strong> We use Google Analytics to count visits and see which pages get read. It records things like the pages you opened, roughly where in the world you are, the type of device and browser, and how you arrived. Your IP address is truncated before it is stored, so this tells us about traffic patterns rather than about you as an individual. We do not use it to build a profile of you, and we run no advertising trackers on this site.</p>',
    '',
    '        <h2>What we do not collect</h2>',
    '        <p>We take no payments on this website, so no card or bank details ever pass through it. We do not ask for a national ID number. We do not buy contact lists, and we do not sell, rent or trade your details to anyone.</p>',
    '',
    '        <h2>Why we hold it</h2>',
    '        <p>Enquiry details are used to answer your enquiry, price the work, and stay in touch about your project. Job applications are used to assess your application. Analytics is used to understand which parts of the site are useful and which are not. We use none of it for anything else, and we do not send marketing email to people who only sent an enquiry.</p>',
    '',
    '        <h2>Who else can see it</h2>',
    '        <p>Enquiries sent through this site are delivered to our company email by a third-party form handler, Web3Forms, which passes the message on and does not use it for its own purposes. Analytics data sits with Google. Both are service providers acting on our behalf. Beyond those two, your details stay inside the company and are seen only by the staff who need them to do the work.</p>',
    '',
    '        <h2>How long we keep it</h2>',
    '        <p>Enquiries that turn into a project are kept for the life of the project and then for as long as Rwandan tax and contract record-keeping requires. Enquiries that come to nothing are deleted within two years. Unsuccessful job applications are kept for one year in case something suitable comes up, then deleted. Analytics data expires on the retention schedule set in the Google Analytics property.</p>',
    '',
    '        <h2>Cookies</h2>',
    '        <p>This site sets no cookies of its own. Google Analytics sets its own cookies to tell a returning visitor from a new one. If you would rather it did not, most browsers let you block cookies for a single site, and Google publishes a browser add-on that switches Analytics off everywhere. Blocking either will not stop any part of this site from working.</p>',
    '',
    '        <h2>Your rights</h2>',
    '        <p>You can ask us what we hold about you, ask us to correct it, or ask us to delete it. You can ask us to stop using it. You need give no reason and there is no charge. Email <a href="mailto:info@sezibera.com" class="link-underline">info@sezibera.com</a> and we will respond within one month. If we cannot do what you have asked, we will tell you why.</p>',
    '',
    '        <h2>Security</h2>',
    '        <p>This site is served over an encrypted connection, so what you type into a form cannot be read in transit. Enquiries land in company email accounts protected by passwords and two-step verification. No system is perfect, and if anything happened that put your details at risk, we would tell the people affected rather than keep quiet about it.</p>',
    '',
    '        <h2>Children</h2>',
    '        <p>This site is aimed at people commissioning construction work and people looking for work in construction. It is not directed at children and we do not knowingly collect anything about them.</p>',
    '',
    '        <h2>Other sites</h2>',
    '        <p>Our pages link out to our own profiles on Facebook, Instagram, LinkedIn and X. Once you follow one of those links you are on their site under their privacy policy, not ours.</p>',
    '',
    '        <h2>Changes to this policy</h2>',
    '        <p>If what we do with your data changes, this page changes with it and the date at the top is updated. Where a change is a significant one we will say so here rather than leave you to spot it.</p>',
    '',
    '        <h2>Complaints</h2>',
    '        <p>If you think we have handled your data badly, tell us first at <a href="mailto:info@sezibera.com" class="link-underline">info@sezibera.com</a> so we have a chance to put it right. You also have the right to complain to the National Cyber Security Authority, which supervises data protection in Rwanda.</p>',
    '',
    '      </div>',
    '    </div>',
    '  </section>'
  ].join('\n')
});
