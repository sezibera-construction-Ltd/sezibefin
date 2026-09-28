const fs = require('fs');
const {
  Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType,
  Table, TableRow, TableCell, WidthType, ShadingType, BorderStyle,
  LevelFormat, PageBreak, TableOfContents,
} = require('docx');

/* ---------------------------------------------------------------- tokens */
const INK = '151515';
const GREY = '6E6E6E';
const LIGHT = 'F2F2F2';
const FILLBG = 'FBFBEF';
const RED = 'B00020';
const RULE = 'CCCCCC';

const CONTENT_W = 9746;                       // A4 minus 1080 dxa margins
const COLS = [1750, 2900, 1096, 4000];        // = 9746

/* --------------------------------------------------------------- helpers */
const p = (text, o = {}) => new Paragraph({
  spacing: { before: o.before ?? 0, after: o.after ?? 120 },
  alignment: o.align,
  indent: o.indent,
  border: o.rule ? { bottom: { style: BorderStyle.SINGLE, size: 6, color: RULE } } : undefined,
  children: [new TextRun({
    text,
    bold: o.bold,
    italics: o.italic,
    size: o.size ?? 20,
    color: o.color ?? INK,
    font: o.font,
    allCaps: o.caps,
  })],
});

const rich = (runs, o = {}) => new Paragraph({
  spacing: { before: o.before ?? 0, after: o.after ?? 120 },
  alignment: o.align,
  children: runs.map((r) => new TextRun({
    text: r.t, bold: r.b, italics: r.i, size: r.size ?? 20,
    color: r.c ?? INK, allCaps: r.caps,
  })),
});

const h1 = (text) => new Paragraph({
  heading: HeadingLevel.HEADING_1,
  spacing: { before: 360, after: 200 },
  children: [new TextRun({ text, bold: true, size: 32, color: INK })],
});

const h2 = (text) => new Paragraph({
  heading: HeadingLevel.HEADING_2,
  spacing: { before: 280, after: 140 },
  children: [new TextRun({ text, bold: true, size: 24, color: INK })],
});

const h3 = (text) => new Paragraph({
  heading: HeadingLevel.HEADING_3,
  spacing: { before: 200, after: 100 },
  children: [new TextRun({ text, bold: true, size: 21, color: INK })],
});

const bullet = (text, level = 0) => new Paragraph({
  numbering: { reference: 'bullets', level },
  spacing: { after: 60 },
  children: [new TextRun({ text, size: 20, color: INK })],
});

const check = (text) => new Paragraph({
  spacing: { after: 70 },
  indent: { left: 200 },
  children: [
    new TextRun({ text: '☐   ', size: 20, color: GREY }),
    new TextRun({ text, size: 20, color: INK }),
  ],
});

const gap = (n = 120) => new Paragraph({ spacing: { after: n }, children: [new TextRun('')] });

const cell = (children, { w, bg, span } = {}) => new TableCell({
  width: { size: w, type: WidthType.DXA },
  columnSpan: span,
  shading: bg ? { type: ShadingType.CLEAR, fill: bg, color: 'auto' } : undefined,
  margins: { top: 80, bottom: 80, left: 110, right: 110 },
  children,
});

const th = (text, w) => cell([p(text, { bold: true, size: 17, color: 'FFFFFF', caps: true })],
  { w, bg: INK });

/* Slot table: Slot | Reference example | Limit | Your content */
const slotTable = (rows) => new Table({
  columnWidths: COLS,
  width: { size: CONTENT_W, type: WidthType.DXA },
  rows: [
    new TableRow({
      tableHeader: true,
      children: [
        th('Slot', COLS[0]), th('Reference example', COLS[1]),
        th('Limit', COLS[2]), th('Your content', COLS[3]),
      ],
    }),
    ...rows.map((r) => new TableRow({
      children: [
        cell([p(r[0], { bold: true, size: 19 })], { w: COLS[0], bg: LIGHT }),
        cell([p(r[1], { size: 18, italic: true, color: GREY })], { w: COLS[1] }),
        cell([p(r[2], { size: 18 })], { w: COLS[2] }),
        cell([p('', { size: 19 })], { w: COLS[3], bg: FILLBG }),
      ],
    })),
  ],
});

/* Two-column confirm table */
const CONFIRM_COLS = [2600, 4400, 2746];
const confirmTable = (rows) => new Table({
  columnWidths: CONFIRM_COLS,
  width: { size: CONTENT_W, type: WidthType.DXA },
  rows: [
    new TableRow({
      tableHeader: true,
      children: [
        th('Item', CONFIRM_COLS[0]), th('Currently on the site', CONFIRM_COLS[1]),
        th('Correct? If not, write the right version', CONFIRM_COLS[2]),
      ],
    }),
    ...rows.map((r) => new TableRow({
      children: [
        cell([p(r[0], { bold: true, size: 19 })], { w: CONFIRM_COLS[0], bg: LIGHT }),
        cell([p(r[1], { size: 18, color: GREY })], { w: CONFIRM_COLS[1] }),
        cell([p('', { size: 19 })], { w: CONFIRM_COLS[2], bg: FILLBG }),
      ],
    })),
  ],
});

/* Callout box */
const callout = (title, lines, tone = RED) => new Table({
  columnWidths: [CONTENT_W],
  width: { size: CONTENT_W, type: WidthType.DXA },
  rows: [new TableRow({
    children: [cell([
      p(title, { bold: true, size: 20, color: tone, after: 80 }),
      ...lines.map((l) => p(l, { size: 19, after: 60 })),
    ], { w: CONTENT_W, bg: 'FAF3F3' })],
  })],
});

const note = (text) => new Table({
  columnWidths: [CONTENT_W],
  width: { size: CONTENT_W, type: WidthType.DXA },
  rows: [new TableRow({
    children: [cell([p(text, { size: 19, italic: true })], { w: CONTENT_W, bg: LIGHT })],
  })],
});

const pageBreak = () => new Paragraph({ children: [new PageBreak()] });

/* ------------------------------------------------------------------ body */
const kids = [];
const add = (...x) => kids.push(...x);

/* ============================== COVER ============================== */
add(
  gap(600),
  new Paragraph({
    spacing: { after: 100 },
    children: [new TextRun({ text: 'SEZIBERA CONSTRUCTION', bold: true, size: 44, color: INK })],
  }),
  new Paragraph({
    spacing: { after: 300 },
    border: { bottom: { style: BorderStyle.SINGLE, size: 12, color: INK } },
    children: [new TextRun({ text: 'Website Copy Deck & Content Request', size: 30, color: GREY })],
  }),
  gap(200),
  p('This document lists every piece of text, every photograph and every business detail needed to complete the website — mapped slot by slot onto the design being built.', { size: 22, after: 200 }),
  p('Anything left blank will appear on the live site as a visible placeholder note. Nothing will be invented.', { size: 22, bold: true, after: 400 }),
  gap(200),
  p('Prepared 11 August 2026', { size: 19, color: GREY, after: 60 }),
  p('Design reference: Mace Consult (mace.com) — layout and structure only, rendered in the Sezibera monochrome palette', { size: 19, color: GREY }),
  pageBreak(),
);

/* ============================== HOW TO USE ============================== */
add(
  h1('How to use this document'),
  p('The site is built from a fixed set of layout components taken from the reference design. Each component has a slot for text, and each slot has a length the design can carry. Write over the length and the layout breaks; write under it and the page looks thin.', { after: 160 }),
  p('Every table below has four columns:', { after: 100 }),
  bullet('Slot — the component on the page'),
  bullet('Reference example — the equivalent text on the reference site, so you can see the tone and length intended'),
  bullet('Limit — the number of characters the design can carry, including spaces'),
  bullet('Your content — write here'),
  gap(140),

  h3('Priority key'),
  rich([{ t: 'BLOCKER', b: true, c: RED }, { t: '  —  the site should not go live without this.' }], { after: 60 }),
  rich([{ t: 'IMPORTANT', b: true }, { t: '  —  the page looks generic or thin without it.' }], { after: 60 }),
  rich([{ t: 'OPTIONAL', b: true, c: GREY }, { t: '  —  improves credibility; can follow later.' }], { after: 160 }),

  h3('A note on tone'),
  p('The reference site uses short, declarative sentences and avoids marketing inflation. "We deliver certainty" rather than "We are passionate about delivering world-class excellence." Concrete beats grand: a real square-metre figure is worth more than any adjective. Write plainly and I will tighten it to fit.', { after: 160 }),

  note('If a question does not apply to your business, write "N/A" rather than leaving it blank — that way I know it was considered and not overlooked.'),
  pageBreak(),
);

/* ============================== PART 0 ============================== */
add(
  h1('Part 0 — Confirm or correct'),
  p('Read this part first. Everything here is already live on the site, taken either from your old website or assumed by me. Each item needs a yes or a correction.', { after: 200 }),

  h2('0.1 Taken from your old site'),
  confirmTable([
    ['Phone number', '+250 788 303 184'],
    ['Tagline', "Building Africa's future"],
    ['Value 1', 'Client Peace of Mind'],
    ['Value 2', 'Hands-On Quality'],
    ['Value 3', 'End-to-End Responsibility'],
    ['Value 4', 'No-Excuse Delivery'],
    ['Legal name', 'Sezibera Construction Ltd'],
    ['Country', 'Rwanda'],
  ]),
  gap(200),

  h2('0.2 Things I assumed — these need correcting most urgently'),
  callout('These are my inventions, not your information.', [
    '1.  Your service list. I wrote six capabilities: building construction; structural & civil works; site preparation & groundworks; finishing & fit-out; renovation & remodelling; site & project management. I made this list up based on what a general building contractor typically does. It is very likely wrong in places.',
    '2.  "Reinforced concrete frame" on the Glads Apartment description — inferred from looking at the photographs.',
    '3.  "Four storeys" for Glads Apartment — counted from the photographs.',
    '4.  Mission and vision. Your old versions referenced material supply and car rental, which we have dropped, so I rewrote both. My drafts are below for approval or replacement.',
    '5.  Social media links point at bare linkedin.com, instagram.com and facebook.com. They are dead placeholders.',
    '6.  The old site was branded "MSIGI5S Group" and described a holding company. I discarded all of that content and its logo files.',
  ]),
  gap(200),

  h3('My draft mission — approve, or replace'),
  note('"To deliver complete construction solutions — from groundworks and structure through to final finishes — with quality and reliability at every stage of the build."'),
  gap(100),
  check('Approved as written'),
  check('Replace with the text I have written in section 3.3'),
  gap(140),

  h3('My draft vision — approve, or replace'),
  note('"To be Africa\'s most trusted building contractor — the company clients call when the project has to be right."'),
  gap(100),
  check('Approved as written'),
  check('Replace with the text I have written in section 3.3'),
  pageBreak(),
);

/* ============================== PART 1 — GLOBAL ============================== */
add(
  h1('Part 1 — Global elements'),
  p('These appear on every page, so they only need answering once.', { after: 200 }),

  h2('1.1 Utility bar'),
  p('The thin strip above the main navigation. On the reference site it carries Corporate, Careers, News, Contact us, a region selector and a language selector.', { after: 140 }),
  slotTable([
    ['Utility link 1', 'Corporate', '14 chars', ''],
    ['Utility link 2', 'Careers', '14 chars', ''],
    ['Utility link 3', 'News', '14 chars', ''],
    ['Utility link 4', 'Contact us', '14 chars', ''],
    ['Region label', 'Middle East and Africa', '24 chars', ''],
    ['Language', 'EN-GB', 'Do you need Kinyarwanda or French?', ''],
  ]),
  gap(180),

  h2('1.2 Main navigation'),
  p('Five top-level items is the maximum the bar carries comfortably before it wraps.', { after: 140 }),
  slotTable([
    ['Nav item 1', 'What we do', '18 chars', ''],
    ['Nav item 2', 'Who we are', '18 chars', ''],
    ['Nav item 3', 'What we care about', '18 chars', ''],
    ['Nav item 4', 'Where we’re located', '18 chars', ''],
    ['Nav item 5', 'Projects', '18 chars', ''],
  ]),
  gap(120),
  check('Do you want a News / Insights section? It needs at least 3 articles to not look abandoned.'),
  check('Do you want a Careers section?'),
  check('Do you want a "What we care about" section covering health & safety and sustainability?'),
  gap(180),

  h2('1.3 Mega menu panel'),
  p('Opens beneath the navigation. A short positioning line sits on the left, with the section’s sub-pages listed to the right.', { after: 140 }),
  slotTable([
    ['Panel intro line', 'We bring certainty to the world’s most impactful infrastructure and capital programmes.', '95 chars', ''],
  ]),
  gap(180),

  h2('1.4 Footer'),
  slotTable([
    ['Column 1 heading', 'Corporate', '20 chars', ''],
    ['Column 2 heading', 'What we do', '20 chars', ''],
    ['Tagline', 'CERTAINTY AT EVERY STEP', '30 chars, sits beside a vertical rule', ''],
    ['Social — LinkedIn', 'Full profile URL', 'URL', ''],
    ['Social — Instagram', 'Full profile URL', 'URL', ''],
    ['Social — Facebook', 'Full profile URL', 'URL', ''],
    ['Social — YouTube', 'Full profile URL', 'URL, optional', ''],
  ]),
  gap(120),
  note('The reference tagline "CERTAINTY AT EVERY STEP" is three short words on two lines. "Building Africa’s future" fits the same slot. Confirm or replace.'),
  gap(180),

  h2('1.5 Legal bar'),
  p('The reference site lists Privacy, Cookies, Terms of Use, Accessibility Statement and a Modern Slavery statement. Tell me which of these you need; I can draft them, but anything legally binding should be reviewed by a lawyer.', { after: 140 }),
  check('Privacy policy  —  required if the contact form collects personal data'),
  check('Cookie notice  —  required if analytics is added'),
  check('Terms of use'),
  check('Accessibility statement'),
  check('Health & safety policy statement'),
  gap(140),
  slotTable([
    ['Copyright line', 'Mace Consult Limited 2026', '45 chars', ''],
    ['Company reg. no.', 'Shown in footer', 'As registered', ''],
  ]),
  pageBreak(),
);

/* ============================== PART 2 — HOMEPAGE ============================== */
add(
  h1('Part 2 — Homepage'),

  h2('2.1 Hero banner'),
  p('A full-width photograph with a solid colour plate offset over it. The title is large, light-weight and widely letter-spaced; the subtitle sits beneath it in bold.', { after: 140 }),
  slotTable([
    ['Banner title', 'MACE CONSULT', '2 lines, max 16 chars per line', ''],
    ['Banner subtitle', 'Delivering certainty to the world’s most impactful infrastructure and capital development programmes', '110 chars', ''],
    ['Button label', 'Find out how Mace Consult is setting the standard', '55 chars', ''],
    ['Button destination', 'Links to a page', 'Page name', ''],
    ['Background photo', 'Wide cityscape', 'See Part 7 for specs', ''],
  ]),
  gap(180),

  h2('2.2 Statement line'),
  p('Large centred uppercase text below the banner. Two or three very short phrases, each ending in a full stop. This is the single most quoted line on the site — it is worth taking time over.', { after: 140 }),
  slotTable([
    ['Statement', 'BOUNDLESS AMBITION. EXCEPTIONAL OUTCOMES.', '55 chars total, 2–3 phrases', ''],
  ]),
  gap(100),
  note('Other reference examples: "SUSTAINABLE. INCLUSIVE. RESILIENT. CONNECTED." — currently on your site: "BUILT WITH CERTAINTY. DELIVERED WITHOUT EXCUSES."'),
  gap(180),

  h2('2.3 Featured news band'),
  p('A single highlighted announcement strip. Optional — leave blank if you have no news to carry.', { after: 140 }),
  slotTable([
    ['Label', 'FEATURED NEWS', '18 chars', ''],
    ['Headline', 'Mace Consult launches as a standalone company to set new standards', '110 chars', ''],
    ['Link destination', 'Article page', 'URL or page', ''],
  ]),
  gap(180),

  h2('2.4 Latest insights grid'),
  p('A mixed grid of article cards, each tagged PERSPECTIVE, REPORT or NEWS. This section needs a minimum of five items to look right. Skip it entirely if you do not intend to publish articles — an empty or stale news section damages credibility more than having none.', { after: 140 }),
  check('Include an insights/news section'),
  check('Skip it for now'),
  gap(100),
  p('If including, for each article:', { bold: true, after: 80 }),
  slotTable([
    ['Category tag', 'PERSPECTIVE / REPORT / NEWS', '12 chars', ''],
    ['Headline', 'The three keys to accelerating infrastructure delivery', '75 chars', ''],
    ['Thumbnail', 'Landscape photo', 'See Part 7', ''],
    ['Body', 'Full article text', '400–900 words', ''],
    ['Author & date', 'Name, role, publication date', '—', ''],
  ]),
  gap(180),

  h2('2.5 Featured projects carousel'),
  p('A large image carousel with arrows and dot indicators, already built. Each slide carries a label, a project name and a headline. Three to six slides works best.', { after: 140 }),
  slotTable([
    ['Slide label', 'PROJECT', '20 chars', ''],
    ['Project name', 'Metrolinx GO and Subways expansion programs', '55 chars', ''],
    ['Headline', 'The largest transit infrastructure investments in Canadian history', '85 chars', ''],
    ['Slide photo', 'Wide project photo', 'See Part 7', ''],
  ]),
  gap(100),
  note('Repeat these four fields for each slide. Currently the carousel shows one project — Glads Apartment — across three photographs of the same building.'),
  gap(180),

  h2('2.6 Capability card grid'),
  p('A grid of four to six cards. Each is a short title over one or two lines of description, with an optional photograph.', { after: 140 }),
  slotTable([
    ['Card title', 'Cities and places', '28 chars', ''],
    ['Card description', 'One or two lines', '95 chars', ''],
    ['Card photo', 'Square-ish landscape', 'Optional, see Part 7', ''],
  ]),
  gap(180),

  h2('2.7 Dual call-to-action band'),
  slotTable([
    ['Left heading', 'How can we help?', '26 chars', ''],
    ['Left sub-line', 'Send us a message', '45 chars', ''],
    ['Left button', 'Contact us', '18 chars', ''],
    ['Right heading', 'Careers at Mace', '26 chars', ''],
    ['Right sub-line', 'Explore our current vacancies', '45 chars', ''],
    ['Right button', 'Visit careers', '18 chars', ''],
  ]),
  pageBreak(),
);

/* ============================== PART 3 — WHO WE ARE ============================== */
add(
  h1('Part 3 — Who we are'),

  h2('3.1 Page banner'),
  slotTable([
    ['Page kicker', 'WHO WE ARE', '30 chars, sits above the banner', ''],
    ['Banner title', 'PURPOSE AND PRIORITIES', '2 lines, max 16 chars per line', ''],
    ['Banner subtitle', 'Our purpose: to redefine the boundaries of ambition.', '85 chars', ''],
    ['Banner photo', 'Architectural detail', 'See Part 7', ''],
  ]),
  gap(180),

  h2('3.2 Opening statement and intro'),
  slotTable([
    ['Bold opening line', 'We have a greater responsibility than ever to lead with purpose.', '110 chars, displayed larger and bolder', ''],
    ['Body paragraph 1', 'Whether we’re building new communities around the world…', '280–450 chars', ''],
    ['Body paragraph 2', 'We’re living our purpose through three strategic priorities…', '280–450 chars', ''],
    ['Body paragraph 3', 'For us, redefining the boundaries of ambition means…', '280–450 chars, optional', ''],
    ['Closing line', 'A world where our legacy endures, and our ambition has no boundaries.', '90 chars, optional', ''],
  ]),
  gap(120),
  p('To write these paragraphs, answer in your own words — I will shape them to fit:', { bold: true, after: 80 }),
  check('How and why was the company founded?'),
  check('What do you do differently from other contractors in Rwanda?'),
  check('What kind of client is the best fit for you?'),
  check('What is the hardest project you have delivered, and what did it prove?'),
  gap(180),

  h2('3.3 Accordion rows'),
  p('Expandable rows with a plus icon. Three to four works best. On your site these currently hold Mission, Vision and Values.', { after: 140 }),
  slotTable([
    ['Row 1 title', 'Pursue a sustainable world', '55 chars', ''],
    ['Row 1 body', 'Hidden until expanded', '300–700 chars', ''],
    ['Row 2 title', 'Grow together', '55 chars', ''],
    ['Row 2 body', '—', '300–700 chars', ''],
    ['Row 3 title', 'Deliver distinctive value', '55 chars', ''],
    ['Row 3 body', '—', '300–700 chars', ''],
  ]),
  gap(120),
  note('If you keep Mission / Vision / Values here, each value ideally gets one explanatory sentence rather than sitting as a bare phrase.'),
  gap(180),

  h2('3.4 Leadership'),
  p('The reference site shows an executive committee as a grid of photo cards, each with a name, a role and a "Read more" button opening a full biography.', { after: 140 }),
  callout('I found Martin SEZIBERA, General Manager, on your staff ID badge files. He is not on the site because I have nothing else about him.', [
    'Who should appear — the General Manager alone, or the full management team?',
  ], INK),
  gap(140),
  p('For each person:', { bold: true, after: 80 }),
  slotTable([
    ['Full name', 'Davendra Dabasia', '35 chars', ''],
    ['Job title', 'Chief Executive Officer', '45 chars, wraps to 2 lines', ''],
    ['Headshot', 'Professional portrait', 'See Part 7.3', ''],
    ['Biography', 'Opens on "Read more"', '400–900 chars', ''],
    ['Qualifications', 'Years in construction, memberships', '—', ''],
    ['LinkedIn', 'Profile URL', 'Optional', ''],
  ]),
  gap(180),

  h2('3.5 Company facts'),
  p('Real numbers build trust far faster than adjectives. Every figure below that you can supply makes the site measurably more convincing.', { after: 140 }),
  check('Year founded'),
  check('Projects completed to date'),
  check('Total square metres built'),
  check('Number of permanent employees'),
  check('Typical site headcount'),
  check('Safety record — e.g. days without a lost-time incident'),
  check('Districts or provinces you work in'),
  check('Do you work outside Rwanda? Where?'),
  check('Smallest and largest project you will take on'),
  pageBreak(),
);

/* ============================== PART 4 — WHAT WE DO ============================== */
add(
  h1('Part 4 — What we do'),

  h2('4.1 Section landing page'),
  slotTable([
    ['Page kicker', 'CONSULTANCY', '30 chars', ''],
    ['Banner title', 'PROGRAMME AND PROJECT MANAGEMENT', '3 lines, max 16 chars per line', ''],
    ['Banner subtitle', 'Agile partners for global clients, building flexibility into planning and delivery.', '95 chars', ''],
    ['Bold opening', 'Our programme management expertise helps clients improve performance…', '200–320 chars', ''],
    ['Body paragraphs', '4–5 paragraphs follow', '280–450 chars each', ''],
  ]),
  gap(180),

  h2('4.2 One page per service'),
  callout('The six services currently on your site are my invention. Correct this list before anything else.', [
    'Currently listed: building construction; structural & civil works; site preparation & groundworks; finishing & fit-out; renovation & remodelling; site & project management.',
    'Cross out what you do not do. Add what is missing. Reorder by what earns you the most work — the first item gets the most attention.',
  ]),
  gap(160),
  p('For each service you confirm, I need the full set below.', { bold: true, after: 100 }),
  slotTable([
    ['Service name', 'Cost and commercial management', '40 chars', ''],
    ['One-line summary', 'Used on cards and in the menu', '95 chars', ''],
    ['Bold opening', 'Lead paragraph', '200–320 chars', ''],
    ['Body paragraphs', '2–4 paragraphs', '280–450 chars each', ''],
    ['Accordion 1 title', 'Client focus', '55 chars', ''],
    ['Accordion 1 body', '—', '300–700 chars', ''],
    ['Accordion 2 title', 'Project management', '55 chars', ''],
    ['Accordion 2 body', '—', '300–700 chars', ''],
    ['Accordion 3 title', 'Integration with client teams', '55 chars', ''],
    ['Accordion 3 body', '—', '300–700 chars', ''],
    ['Photos', 'Your team doing this work', '2–3, see Part 7', ''],
    ['Example project', 'Links to a project page', 'Project name', ''],
  ]),
  gap(180),

  h2('4.3 Scope questions'),
  p('These determine what the service pages can honestly claim.', { after: 140 }),
  check('Do you produce architectural or structural drawings in-house, or build to the client’s drawings?'),
  check('Do you handle permits and authority approvals?'),
  check('Do you self-perform MEP — plumbing, electrical, HVAC — or subcontract it?'),
  check('Do you offer design-build, or construction only?'),
  check('Do you take on civil or infrastructure work — roads, drainage — as standalone jobs?'),
  check('Do you supply materials, or does the client?'),
  check('Do you offer a defects liability or warranty period? How long?'),
  check('Do you work as main contractor, subcontractor, or both?'),
  check('What is your typical project duration?'),
  pageBreak(),
);

/* ============================== PART 5 — PROJECTS ============================== */
add(
  h1('Part 5 — Projects'),
  callout('This is the highest-value section you can fill, and currently the thinnest.', [
    'The site has one project — Glads Apartment — represented by three exterior photographs of the same building.',
    'For a construction company the portfolio is the sales pitch. Aim for six to ten projects. In-progress and older work both count.',
  ]),
  gap(180),

  h2('5.1 Listing page'),
  p('The reference listing page has filter dropdowns, a result count, a sort control and a paginated card grid.', { after: 140 }),
  slotTable([
    ['Banner title', 'PROJECTS', '2 lines, max 16 chars per line', ''],
    ['Banner subtitle', 'Shaping skylines and creating vital infrastructure.', '140 chars', ''],
    ['Filter 1', 'Location', 'List your districts', ''],
    ['Filter 2', 'Sector', 'List your project types', ''],
  ]),
  gap(120),
  p('Sector list to confirm — cross out any you do not build:', { bold: true, after: 80 }),
  p('Residential   ·   Apartments   ·   Commercial   ·   Retail   ·   Offices   ·   Hospitality   ·   Education   ·   Healthcare   ·   Industrial   ·   Institutional   ·   Mixed-use   ·   Civil / infrastructure', { after: 160 }),

  h2('5.2 Project card'),
  slotTable([
    ['Label', 'PROJECT', '20 chars', ''],
    ['Client or project', 'Canberra Theatre Redevelopment', '45 chars', ''],
    ['Headline', 'Putting Canberra on the map for world-class productions', '70 chars', ''],
    ['Thumbnail', 'Landscape photo', 'See Part 7', ''],
  ]),
  gap(180),

  h2('5.3 Per-project data — copy this set for every project'),
  slotTable([
    ['Project name', '—', '45 chars', ''],
    ['Location', 'District / sector', '—', ''],
    ['Client name', 'Or mark confidential', 'Needs written permission', ''],
    ['Sector', 'From the list above', '—', ''],
    ['Your scope', 'What exactly did you do?', '—', ''],
    ['Size', 'm², storeys, number of units', '—', ''],
    ['Start date', '—', 'Month/year', ''],
    ['Completion date', '—', 'Month/year', ''],
    ['Status', 'Completed / in progress / on hold', '—', ''],
    ['Contract value', 'Optional', 'Say if private', ''],
    ['Main or sub?', 'Were you main contractor?', '—', ''],
    ['Headline', 'One line for the card', '70 chars', ''],
    ['Description', 'Full project write-up', '600–1,200 chars', ''],
    ['Challenge', 'Anything difficult or unusual', '300–600 chars, optional', ''],
    ['Photos', '5–10 per project', 'See Part 7', ''],
  ]),
  gap(180),

  h2('5.4 Glads Apartment — specific gaps'),
  check('Confirm the correct project name and spelling'),
  check('Location — district and sector'),
  check('Confirm the storey count (I counted four from the photos)'),
  check('Number of apartments'),
  check('Confirm the structural system (I assumed reinforced concrete frame)'),
  check('Completion date'),
  check('Client name, and whether it may be published'),
  check('Were you the main contractor or a subcontractor?'),
  check('Interior photographs — I have exterior shots only'),
  check('Construction-in-progress photographs'),
  pageBreak(),
);

/* ============================== PART 6 — CONTACT ============================== */
add(
  h1('Part 6 — Contact'),

  h2('6.1 Page banner'),
  slotTable([
    ['Banner title', 'CONTACT US', '2 lines, max 16 chars per line', ''],
    ['Banner subtitle', 'Short supporting line', '85 chars', ''],
  ]),
  gap(180),

  h2('6.2 Named contact cards'),
  p('The reference site puts a photograph, a name, a role and a "Get in touch" button in the contact section. Naming a real person converts far better than a generic form.', { after: 140 }),
  slotTable([
    ['Name', 'Louise Sunderland', '35 chars', ''],
    ['Role', 'Head of Cities & Places', '50 chars', ''],
    ['Photo', 'Professional portrait', 'See Part 7.3', ''],
    ['Direct email', 'Behind the button', 'Email', ''],
    ['Direct phone', 'Optional', 'Phone', ''],
  ]),
  gap(180),

  h2('6.3 Contact details'),
  callout('The contact form currently sends nothing.', [
    'It shows a confirmation message and discards the submission. To make it work I need an email address to route enquiries to, plus permission to connect a form service such as Formspree or Web3Forms.',
  ]),
  gap(140),
  check('Full physical office address'),
  check('General enquiries email address  —  BLOCKER'),
  check('Separate tenders / quotes email, if used'),
  check('Main phone — confirm +250 788 303 184'),
  check('Second phone or WhatsApp number'),
  check('Office opening hours'),
  check('Google Maps link or coordinates for the office'),
  check('Should enquiries also trigger a WhatsApp message?'),
  gap(180),

  h2('6.4 Form fields'),
  p('Currently: name, phone, project type, site location, message. Confirm or amend.', { after: 140 }),
  check('Add an email field'),
  check('Add a budget range field'),
  check('Add a "how did you hear about us" field'),
  check('Add a file upload for drawings or tender documents'),
  pageBreak(),
);

/* ============================== PART 7 — ASSETS ============================== */
add(
  h1('Part 7 — Photography and video'),

  h2('7.1 Technical specifications'),
  bullet('Format: JPG or PNG, straight from the camera'),
  bullet('Resolution: at least 2000 pixels on the long edge — more is better'),
  bullet('Do not send WhatsApp copies. WhatsApp compresses images heavily and they look soft and blocky on a large screen'),
  bullet('Orientation: mostly landscape, with a few portrait shots for variety'),
  bullet('Delivery: Google Drive, WeTransfer or Dropbox link, or a folder on this machine'),
  bullet('Naming: projectname-01.jpg, projectname-02.jpg, and so on'),
  gap(180),

  h2('7.2 Project photography — BLOCKER'),
  p('Per project:', { bold: true, after: 80 }),
  check('Wide exterior, straight on'),
  check('Exterior at an angle, showing depth'),
  check('Detail shots — brickwork, finishes, joinery, balconies'),
  check('Interiors — living spaces, circulation, stairwells'),
  check('Before and after, for renovations'),
  gap(140),
  p('Work in progress — this is what separates a real contractor’s site from a template:', { bold: true, after: 80 }),
  check('Groundworks and excavation'),
  check('Steel fixing and formwork'),
  check('Concrete pours'),
  check('Masonry going up'),
  check('Finishing trades at work'),
  check('Site meetings, setting out, surveying'),
  gap(180),

  h2('7.3 People'),
  check('Crew on site in PPE'),
  check('Leadership headshots — plain background, consistent lighting, shot at the same time if possible'),
  check('Team group photograph'),
  check('Site supervisors working with drawings'),
  gap(180),

  h2('7.4 Equipment and premises'),
  check('Plant and machinery you own'),
  check('Branded vehicles'),
  check('Office or yard exterior'),
  gap(180),

  h2('7.5 Video'),
  p('The reference site uses a looping video in one banner. If you supply video I will host it on YouTube or Vimeo and embed it, so it does not slow the site down.', { after: 140 }),
  check('Site walkthrough or drone footage — MP4, 1080p or 4K'),
  check('Company introduction from the General Manager — 30 to 60 seconds'),
  check('Time-lapse of a build'),
  check('Client testimonial clips'),
  gap(180),

  h2('7.6 Permissions — BLOCKER'),
  check('Do you own the rights to every photograph supplied? If a photographer shot them, confirm you may publish them'),
  check('Do you have permission to show client buildings and to name clients?'),
  check('Have staff consented to appearing on the website?'),
  pageBreak(),
);

/* ============================== PART 8 — CREDIBILITY ============================== */
add(
  h1('Part 8 — Credentials and proof'),

  h2('8.1 Certifications and registrations'),
  check('RDB registration number'),
  check('Contractor licence or classification grade'),
  check('Professional body memberships'),
  check('ISO or quality certifications'),
  check('Health and safety accreditations'),
  check('Insurance held — public liability, works, workers’ compensation'),
  check('Logo files for any of the above'),
  gap(180),

  h2('8.2 Clients and testimonials'),
  p('For each testimonial I need the quote, the person’s name, their title and their company — an unattributed quote reads as invented.', { after: 140 }),
  slotTable([
    ['Quote', '—', '150–300 chars', ''],
    ['Name', '—', '35 chars', ''],
    ['Title & company', '—', '55 chars', ''],
    ['Permission granted', '—', 'Yes / no', ''],
  ]),
  gap(140),
  check('Client logos you may display, with permission'),
  check('Awards or recognition received'),
  gap(180),

  h2('8.3 Careers'),
  check('Do you want a careers page?'),
  check('Are you currently hiring? For what roles?'),
  check('Email address for job applications'),
  check('Why should someone want to work at Sezibera?'),
  pageBreak(),
);

/* ============================== PART 9 — TECHNICAL ============================== */
add(
  h1('Part 9 — Technical setup'),

  h2('9.1 Domain and hosting'),
  check('Do you own a domain? Which one?'),
  check('Who is it registered with, and do you have login access?'),
  check('Where should the site be hosted? The old site appears to have been on Vercel'),
  check('Do you need business email on the domain, e.g. info@yourdomain.rw?'),
  gap(180),

  h2('9.2 Analytics and listings'),
  check('Google Analytics?'),
  check('Google Business Profile — should it be linked?'),
  check('Facebook Pixel or similar?'),
  gap(180),

  h2('9.3 Language'),
  check('English only'),
  check('English and Kinyarwanda'),
  check('English, Kinyarwanda and French'),
  gap(180),

  h2('9.4 Design confirmations'),
  slotTable([
    ['Palette', 'Black, white, grey, matte black', 'Confirm strictly monochrome, or allow one accent colour for buttons and links', ''],
    ['Photo treatment', 'Full colour', 'Confirm, or switch to black and white', ''],
    ['Typeface', 'Helvetica Neue, Inter fallback', 'Approve or name a preference', ''],
    ['Logo vector', 'Extracted from your PDF', 'Do you have the original .ai, .svg or .eps?', ''],
    ['Brand guidelines', 'Not supplied', 'Do these exist?', ''],
  ]),
  pageBreak(),
);

/* ============================== PART 10 — PRIORITY ============================== */
add(
  h1('Part 10 — If you only do five things'),
  p('These five turn the site from a well-built template into something that wins work.', { after: 220 }),
  gap(60),

  rich([{ t: '1.   Project photographs', b: true, size: 24 }], { after: 60 }),
  p('As many completed projects as you can, with the details listed in section 5.3. This matters more than everything else combined.', { after: 200, indent: { left: 300 } }),

  rich([{ t: '2.   Work-in-progress photographs', b: true, size: 24 }], { after: 60 }),
  p('Your crew actually building. Steel fixing, concrete pours, masonry going up. No competitor can copy these.', { after: 200, indent: { left: 300 } }),

  rich([{ t: '3.   A real email address', b: true, size: 24 }], { after: 60 }),
  p('The contact form currently discards every enquiry. This is the single most damaging gap on the site.', { after: 200, indent: { left: 300 } }),

  rich([{ t: '4.   Correct the service list', b: true, size: 24 }], { after: 60 }),
  p('Section 0.2, item 1. Six services are currently described that I invented on your behalf.', { after: 200, indent: { left: 300 } }),

  rich([{ t: '5.   Office address and real social links', b: true, size: 24 }], { after: 60 }),
  p('The social icons currently link to the homepages of LinkedIn, Instagram and Facebook.', { after: 260, indent: { left: 300 } }),

  gap(200),
  note('Partial answers are welcome — send whatever you have and I will keep building. Anywhere information is still missing, the site will carry a visible placeholder note rather than invented content.'),
);

/* ---------------------------------------------------------------- assemble */
const doc = new Document({
  creator: 'Sezibera Construction website project',
  title: 'Sezibera Construction — Website Copy Deck & Content Request',
  description: 'Content request mapped to the website design components',
  numbering: {
    config: [{
      reference: 'bullets',
      levels: [
        { level: 0, format: LevelFormat.BULLET, text: '•', alignment: AlignmentType.LEFT,
          style: { paragraph: { indent: { left: 400, hanging: 200 } } } },
        { level: 1, format: LevelFormat.BULLET, text: '◦', alignment: AlignmentType.LEFT,
          style: { paragraph: { indent: { left: 760, hanging: 200 } } } },
      ],
    }],
  },
  styles: {
    default: { document: { run: { font: 'Calibri', size: 20, color: INK } } },
  },
  sections: [{
    properties: { page: { margin: { top: 1080, right: 1080, bottom: 1080, left: 1080 } } },
    children: kids,
  }],
});

Packer.toBuffer(doc).then((buf) => {
  fs.writeFileSync('Sezibera-Construction-Content-Request.docx', buf);
  console.log('written', buf.length, 'bytes');
});
