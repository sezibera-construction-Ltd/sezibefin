/* ==========================================================================
   SEZIBERA CONSTRUCTION — OPPORTUNITIES DATA
   --------------------------------------------------------------------------
   The single source of truth for the Careers page. Adding, editing, opening
   or closing a vacancy is done here and nowhere else — the listing, the
   filters, the result count, the archive and the detail view are all
   rendered from this array.

   To ADD an opportunity, copy the template at the foot of the array,
   uncomment it and fill it in. Nothing else needs changing.

   FIELD REFERENCE
     id            URL slug. Lowercase, hyphenated, unique. This becomes the
                   shareable address: careers.html?role=<id>
     title         The role, as it should read as a heading.
     department    Full department line shown under the title.
     expertise     Array. Values must come from EXPERTISE below — this drives
                   the Expertise filter.
     location      Free text shown on the row.
     locationTags  Array. Values must come from LOCATIONS below — this drives
                   the Location filter.
     type          One of TYPES below.
     experience    Free text, e.g. "2-4 years". Shown on the row.
     level         One of LEVELS below.
     status        "Open" | "Closing Soon" | "Closed".
                   Open and Closing Soon accept applications.
                   Closed roles drop into the archive at the foot of the page
                   and cannot be applied to.
     posted        ISO date (YYYY-MM-DD), or "" if not being published.
     closes        ISO date, or "" when no deadline has been set. Leave it
                   empty rather than inventing one.
     description   Array of paragraphs.
     responsibilities / requirements / skills   Arrays of strings.
     offer         Array of strings. Leave EMPTY unless the company has
                   actually confirmed what is offered — do not invent
                   benefits. An empty array hides the section entirely.

   Anything the company has not yet confirmed should be left empty or marked
   with a square-bracket placeholder, e.g. "[Add detail]". Empty arrays and
   empty strings are handled gracefully and simply do not render.
   ========================================================================== */

window.SEZIBERA_CAREERS = (function () {

  /* Filter vocabularies. The filter controls are built from these lists at
     run time, so extending a filter means adding a string here — there is no
     matching markup to keep in step. */

  var EXPERTISE = [
    'Project Management',
    'Engineering',
    'Site Operations',
    'Quantity Surveying',
    'Commercial',
    'Procurement',
    'Administration',
    'Finance',
    'Graduate Development'
  ];

  /* Only places Sezibera actually works. The company is based in Kigali and
     has delivered projects across Gasabo, Kicukiro, Nyarugenge, Rwamagana and
     Kayonza. Add entries here as the company takes on work elsewhere. */
  var LOCATIONS = [
    'Kigali',
    'Project Site',
    'Multiple Locations'
  ];

  var TYPES = [
    'Full-time',
    'Part-time',
    'Contract',
    'Internship',
    'Graduate Programme'
  ];

  var LEVELS = [
    'Entry Level',
    'Graduate',
    'Junior',
    'Mid Level',
    'Senior',
    'Management'
  ];

  var STATUSES = ['Open', 'Closing Soon', 'Closed'];

  var OPPORTUNITIES = [

    {
      id: 'site-engineer',
      title: 'Site Engineer',
      department: 'Engineering & Site Operations',
      expertise: ['Engineering', 'Site Operations'],
      location: 'Kigali, Rwanda',
      locationTags: ['Kigali', 'Project Site'],
      type: 'Full-time',
      experience: '2–4 years',
      level: 'Mid Level',
      status: 'Open',
      posted: '',
      closes: '',
      description: [
        'The Site Engineer is responsible for the technical execution of works on site, turning drawings and specifications into built work and holding the standard of what is put in place.',
        'The role sits between the design information and the trades carrying out the work, and reports into the project management team.'
      ],
      responsibilities: [
        'Site supervision',
        'Coordination with project teams',
        'Quality control',
        'Construction documentation',
        'Progress monitoring'
      ],
      requirements: [
        'Relevant engineering qualification',
        'Relevant construction experience',
        'Knowledge of site procedures',
        'Strong communication skills'
      ],
      skills: [
        'Site Supervision',
        'Project Coordination',
        'AutoCAD',
        'Construction Management'
      ],
      offer: []
    },

    {
      id: 'graduate-internship',
      title: 'Graduate Internship',
      department: 'Graduate Development · Construction',
      expertise: ['Graduate Development'],
      location: 'Kigali / Project Sites',
      locationTags: ['Kigali', 'Project Site'],
      type: 'Internship',
      experience: 'Entry Level',
      level: 'Graduate',
      status: 'Open',
      posted: '',
      closes: '',
      description: [
        'A structured period of practical exposure for recent graduates, working alongside experienced teams on live projects.',
        'Interns are placed with a delivery team and given real responsibility under supervision, so that academic knowledge can be applied to the way work is actually planned, built and handed over.'
      ],
      responsibilities: [
        'Supporting the site and office teams on live project work',
        'Assisting with records, measurement and construction documentation',
        'Attending site and coordination meetings',
        'Carrying out tasks assigned by the supervising engineer or manager'
      ],
      requirements: [
        'A completed or near-complete qualification in a construction-related discipline',
        'Willingness to work on site',
        'Ability to work as part of a team',
        'Strong communication skills'
      ],
      skills: [
        'Construction Fundamentals',
        'Site Awareness',
        'Documentation',
        'Teamwork'
      ],
      offer: []
    }

    /* ----------------------------------------------------------------------
       TEMPLATE — copy the object below, uncomment it, fill it in.

    ,{
      id: '',
      title: '',
      department: '',
      expertise: [],
      location: '',
      locationTags: [],
      type: '',
      experience: '',
      level: '',
      status: 'Open',
      posted: '',
      closes: '',
      description: [],
      responsibilities: [],
      requirements: [],
      skills: [],
      offer: []
    }

       ---------------------------------------------------------------------- */

  ];

  return {
    opportunities: OPPORTUNITIES,
    expertise: EXPERTISE,
    locations: LOCATIONS,
    types: TYPES,
    levels: LEVELS,
    statuses: STATUSES
  };

})();
