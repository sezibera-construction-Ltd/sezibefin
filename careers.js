/* ==========================================================================
   SEZIBERA CONSTRUCTION — CAREERS
   --------------------------------------------------------------------------
   Renders the opportunities register from careers-data.js, runs the search
   and filter controls, and swaps between the register view and a single
   opportunity's detail view.

   Routing: the site is a set of flat HTML pages with no router and no build
   step, so a detail view is a real, shareable address on this page —
   careers.html?role=site-engineer — pushed with the History API. The back
   button, a refresh and a pasted link all land on the same view.
   ========================================================================== */

(function () {
  'use strict';

  var DATA = window.SEZIBERA_CAREERS;
  var root = document.querySelector('.page-careers');
  if (!DATA || !root) return;

  /* ------------------------------------------------------------------------
     SUBMISSION CONFIG — the one place the backend is wired.
     ------------------------------------------------------------------------
     Applications post to the same form handler the contact page already uses,
     so a submitted application genuinely arrives at info@sezibera.com. Only
     the fields below travel; nothing is confirmed to the applicant unless the
     handler has actually accepted the post.

     CV_ATTACHMENTS: the current handler plan does not carry file attachments.
     The upload control is built, validated and ready; while this flag is
     false the file itself is not transmitted and the form says so plainly
     rather than implying a CV was received. Flip it to true once an endpoint
     that accepts multipart file uploads is connected — the upload UI, the
     validation and the success state need no other change.
     ---------------------------------------------------------------------- */
  var SUBMIT = {
    ENDPOINT: 'https://api.web3forms.com/submit',
    ACCESS_KEY: 'c56553d9-ef86-4931-9a65-24b624c1e361',
    SUBJECT: 'New career application — Sezibera Construction',
    CV_ATTACHMENTS: false,
    CV_EMAIL: 'info@sezibera.com',
    MAX_FILE_MB: 5,
    ACCEPT: ['pdf', 'doc', 'docx']
  };

  var OPEN_STATES = ['Open', 'Closing Soon'];
  var isOpen = function (o) { return OPEN_STATES.indexOf(o.status) > -1; };

  /* Elements ------------------------------------------------------------- */
  var indexView   = document.getElementById('careers-index');
  var detailView  = document.getElementById('careers-detail');
  var listEl      = document.getElementById('co-list');
  var emptyEl     = document.getElementById('co-empty');
  var countEl     = document.getElementById('co-count');
  var archiveWrap = document.getElementById('co-archive');
  var archiveList = document.getElementById('co-archive-list');
  var form        = document.getElementById('co-filter-form');
  var searchEl    = document.getElementById('co-search');
  var toggleEl    = document.getElementById('co-filter-toggle');
  var panelEl     = document.getElementById('co-filter-panel');
  var clearEls    = Array.prototype.slice.call(document.querySelectorAll('.co-clear'));

  var selects = {
    expertise: document.getElementById('co-expertise'),
    location:  document.getElementById('co-location'),
    type:      document.getElementById('co-type'),
    level:     document.getElementById('co-level'),
    status:    document.getElementById('co-status')
  };

  var BASE_TITLE = document.title;

  /* Helpers -------------------------------------------------------------- */

  function esc(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  function fill(select, values, allLabel) {
    if (!select) return;
    var html = '<option value="">' + esc(allLabel) + '</option>';
    values.forEach(function (v) {
      html += '<option value="' + esc(v) + '">' + esc(v) + '</option>';
    });
    select.innerHTML = html;
  }

  function statusClass(status) {
    if (status === 'Closed') return 'is-closed';
    if (status === 'Closing Soon') return 'is-closing';
    return 'is-open';
  }

  function byId(id) {
    for (var i = 0; i < DATA.opportunities.length; i++) {
      if (DATA.opportunities[i].id === id) return DATA.opportunities[i];
    }
    return null;
  }

  /* Search runs across everything a candidate might reasonably type: the
     title, the department, both filter vocabularies, the location, and the
     listed skills and requirements. */
  function haystack(o) {
    return [
      o.title, o.department, o.location, o.type, o.level, o.experience,
      (o.expertise || []).join(' '),
      (o.locationTags || []).join(' '),
      (o.skills || []).join(' '),
      (o.requirements || []).join(' '),
      (o.responsibilities || []).join(' ')
    ].join(' ').toLowerCase();
  }

  /* Filtering ------------------------------------------------------------ */

  function currentFilters() {
    return {
      q: (searchEl && searchEl.value ? searchEl.value : '').trim().toLowerCase(),
      expertise: selects.expertise ? selects.expertise.value : '',
      location:  selects.location  ? selects.location.value  : '',
      type:      selects.type      ? selects.type.value      : '',
      level:     selects.level     ? selects.level.value     : '',
      status:    selects.status    ? selects.status.value    : ''
    };
  }

  function hasActiveFilters(f) {
    return !!(f.q || f.expertise || f.location || f.type || f.level || f.status);
  }

  function matches(o, f) {
    /* Only live opportunities appear in the register by default. A visitor
       has to ask for Closed explicitly through the Status filter. */
    if (f.status) { if (o.status !== f.status) return false; }
    else if (!isOpen(o)) return false;

    if (f.expertise && (o.expertise || []).indexOf(f.expertise) === -1) return false;
    if (f.location && (o.locationTags || []).indexOf(f.location) === -1) return false;
    if (f.type && o.type !== f.type) return false;
    if (f.level && o.level !== f.level) return false;
    if (f.q && haystack(o).indexOf(f.q) === -1) return false;
    return true;
  }

  /* Rendering — register ------------------------------------------------- */

  function rowHTML(o, index) {
    var num = String(index + 1);
    if (num.length < 2) num = '0' + num;

    return '' +
      '<article class="co-row">' +
        '<span class="co-row-index" aria-hidden="true">' + num + '</span>' +
        '<div class="co-row-head">' +
          '<h3 class="co-row-title">' +
            '<a href="careers.html?role=' + encodeURIComponent(o.id) + '" data-role="' + esc(o.id) + '">' +
              esc(o.title) +
            '</a>' +
          '</h3>' +
          '<p class="co-row-dept">' + esc(o.department) + '</p>' +
        '</div>' +
        '<dl class="co-row-meta">' +
          '<div><dt>Location</dt><dd>' + esc(o.location) + '</dd></div>' +
          '<div><dt>Engagement</dt><dd>' + esc(o.type) +
            (o.experience ? ' &middot; ' + esc(o.experience) : '') + '</dd></div>' +
        '</dl>' +
        '<div class="co-row-end">' +
          '<span class="co-status ' + statusClass(o.status) + '">' + esc(o.status) + '</span>' +
          '<a class="link-accent co-row-link" href="careers.html?role=' + encodeURIComponent(o.id) + '" data-role="' + esc(o.id) + '">' +
            'View opportunity<span class="co-sr"> — ' + esc(o.title) + '</span>' +
          '</a>' +
        '</div>' +
      '</article>';
  }

  function renderRegister() {
    var f = currentFilters();
    var results = DATA.opportunities.filter(function (o) { return matches(o, f); });

    listEl.innerHTML = results.map(rowHTML).join('');
    listEl.hidden = results.length === 0;
    emptyEl.hidden = results.length !== 0;

    countEl.textContent = results.length === 1
      ? 'Showing 1 opportunity'
      : 'Showing ' + results.length + ' opportunities';

    clearEls.forEach(function (el) { el.hidden = !hasActiveFilters(f); });

    /* The archive is only ever shown when there is genuinely something in it,
       and never when a filter is already narrowing the register. */
    var closed = DATA.opportunities.filter(function (o) { return o.status === 'Closed'; });
    if (archiveWrap) {
      var show = closed.length > 0 && !hasActiveFilters(f);
      archiveWrap.hidden = !show;
      if (show) archiveList.innerHTML = closed.map(rowHTML).join('');
    }
  }

  /* Rendering — detail --------------------------------------------------- */

  function listSection(heading, items) {
    if (!items || !items.length) return '';
    return '<section class="co-detail-block">' +
      '<h2 class="h-block">' + esc(heading) + '</h2>' +
      '<ul class="co-bullets">' +
        items.map(function (i) { return '<li>' + esc(i) + '</li>'; }).join('') +
      '</ul></section>';
  }

  function detailHTML(o) {
    var live = isOpen(o);

    var html = '' +
      '<div class="shell">' +
        '<p class="co-back-wrap">' +
          '<a class="co-back" href="careers.html" data-back>' +
            '<span aria-hidden="true">&#9666;</span> All opportunities' +
          '</a>' +
        '</p>' +
        '<div class="page-head co-detail-head">' +
          '<span class="eyebrow">Opportunity</span>' +
          '<h1 class="display-sm">' + esc(o.title) + '</h1>' +
          '<p class="lead">' + esc(o.department) + '</p>' +
        '</div>' +
      '</div>' +

      '<div class="shell"><hr class="hairline"></div>' +

      '<section class="section-sm"><div class="shell">' +
        '<dl class="co-detail-meta">' +
          '<div><dt>Department</dt><dd>' + esc(o.department) + '</dd></div>' +
          '<div><dt>Location</dt><dd>' + esc(o.location) + '</dd></div>' +
          '<div><dt>Employment type</dt><dd>' + esc(o.type) + '</dd></div>' +
          '<div><dt>Experience</dt><dd>' + esc(o.experience || '—') + '</dd></div>' +
          '<div><dt>Status</dt><dd><span class="co-status ' + statusClass(o.status) + '">' +
            esc(o.status) + '</span></dd></div>' +
          (o.closes ? '<div><dt>Closes</dt><dd>' + esc(o.closes) + '</dd></div>' : '') +
        '</dl>' +
      '</div></section>' +

      '<div class="shell"><hr class="hairline"></div>' +

      '<section class="section"><div class="shell"><div class="co-detail-body">';

    if (o.description && o.description.length) {
      html += '<section class="co-detail-block"><h2 class="h-block">About the role</h2>' +
        o.description.map(function (p) {
          return '<p class="body-copy">' + esc(p) + '</p>';
        }).join('') + '</section>';
    }

    html += listSection('Responsibilities', o.responsibilities);
    html += listSection('Requirements', o.requirements);

    if (o.skills && o.skills.length) {
      html += '<section class="co-detail-block"><h2 class="h-block">Skills</h2>' +
        '<ul class="sectors co-skills">' +
        o.skills.map(function (s) { return '<li>' + esc(s) + '</li>'; }).join('') +
        '</ul></section>';
    }

    /* "What we offer" renders only when the company has supplied terms. An
       empty list is left out rather than filled with invented benefits. */
    html += listSection('What we offer', o.offer);

    html += '</div></div></section>';

    html += live ? applyHTML(o) : closedHTML();

    return html;
  }

  function closedHTML() {
    return '' +
      '<div class="shell"><hr class="hairline"></div>' +
      '<section class="section"><div class="shell">' +
        '<div class="co-closed-note">' +
          '<span class="co-status is-closed">Closed</span>' +
          '<p class="body-copy">This opportunity is no longer accepting applications. ' +
          '<a class="link-underline" href="careers.html" data-back>See current opportunities</a>.</p>' +
        '</div>' +
      '</div></section>';
  }

  /* Application form ----------------------------------------------------- */

  function applyHTML(o) {
    var accept = SUBMIT.ACCEPT.map(function (e) { return '.' + e; }).join(',');
    var cvHint = SUBMIT.CV_ATTACHMENTS
      ? 'PDF, DOC or DOCX. Maximum ' + SUBMIT.MAX_FILE_MB + ' MB.'
      : 'PDF, DOC or DOCX, maximum ' + SUBMIT.MAX_FILE_MB + ' MB. This form cannot yet carry the file itself — ' +
        'we record the file name with your application and ask you to email the document to ' +
        '<a class="link-underline" href="mailto:' + esc(SUBMIT.CV_EMAIL) + '">' + esc(SUBMIT.CV_EMAIL) + '</a>, ' +
        'quoting the role.';

    return '' +
      '<div class="shell"><hr class="hairline"></div>' +
      '<section class="section" id="apply"><div class="shell">' +
        '<div class="co-apply">' +
          '<span class="eyebrow">Apply</span>' +
          '<h2 class="h-section co-apply-title">Apply for this role</h2>' +
          '<p class="body-copy measure co-apply-intro">Complete the form below. Fields marked as required must be filled in before the application can be sent.</p>' +

          '<form class="co-form" id="co-apply-form" novalidate>' +
            '<input type="hidden" name="Position applied for" value="' + esc(o.title) + '">' +
            '<input type="hidden" name="Opportunity reference" value="' + esc(o.id) + '">' +
            '<label class="hp" aria-hidden="true">Leave this field empty' +
              '<input type="checkbox" name="botcheck" tabindex="-1" autocomplete="off">' +
            '</label>' +

            '<fieldset class="co-fieldset">' +
              '<legend class="form-legend">Personal information</legend>' +
              '<div class="form-2">' +
                field('co-name', 'Full name', 'text', 'Full name', true, 'name') +
                field('co-email', 'Email address', 'email', 'Email address', true, 'email') +
              '</div>' +
              '<div class="form-2">' +
                field('co-phone', 'Phone number', 'tel', 'Phone number', true, 'tel') +
                field('co-city', 'Current location', 'text', 'Current location', true, 'address-level2') +
              '</div>' +
            '</fieldset>' +

            '<fieldset class="co-fieldset">' +
              '<legend class="form-legend">Professional information</legend>' +
              '<div class="form-2">' +
                '<div class="field">' +
                  '<label for="co-area">Area of expertise <span class="req">(required)</span></label>' +
                  '<select id="co-area" name="Area of expertise" required>' +
                    '<option value="">Select an area</option>' +
                    DATA.expertise.map(function (e) {
                      return '<option value="' + esc(e) + '">' + esc(e) + '</option>';
                    }).join('') +
                    '<option value="Other">Other</option>' +
                  '</select>' +
                  '<p class="co-error" data-error-for="co-area" hidden></p>' +
                '</div>' +
                field('co-years', 'Years of experience', 'text', 'Years of experience', true, 'off') +
              '</div>' +
              '<div class="form-2">' +
                field('co-qual', 'Highest qualification', 'text', 'Highest qualification', true, 'off') +
                '<div class="field">' +
                  '<label for="co-role">Position applied for</label>' +
                  '<input type="text" id="co-role" value="' + esc(o.title) + '" readonly>' +
                '</div>' +
              '</div>' +
            '</fieldset>' +

            '<fieldset class="co-fieldset">' +
              '<legend class="form-legend">Your application</legend>' +
              '<div class="field">' +
                '<label for="co-letter">Cover letter <span class="req">(required)</span></label>' +
                '<span class="hint">Tell us about your experience and why this role suits you. Please do not include confidential or sensitive personal information.</span>' +
                '<textarea id="co-letter" name="Cover letter" required></textarea>' +
                '<p class="co-error" data-error-for="co-letter" hidden></p>' +
              '</div>' +

              '<div class="field co-file-field">' +
                '<span class="co-file-label" id="co-cv-label">CV <span class="req">(required)</span></span>' +
                '<span class="hint">' + cvHint + '</span>' +
                '<div class="co-file">' +
                  '<input class="co-file-input" type="file" id="co-cv" name="cv" accept="' + accept + '" aria-describedby="co-cv-state">' +
                  '<label class="co-file-btn" for="co-cv">Upload CV</label>' +
                  '<span class="co-file-state" id="co-cv-state" role="status" aria-live="polite">No file selected</span>' +
                  '<button type="button" class="co-file-clear" id="co-cv-clear" hidden>Remove</button>' +
                '</div>' +
                '<p class="co-error" data-error-for="co-cv" hidden></p>' +
              '</div>' +

              '<div class="field co-file-field">' +
                '<span class="co-file-label">Portfolio or supporting document <span class="req">(optional)</span></span>' +
                '<span class="hint">PDF, DOC or DOCX, maximum ' + SUBMIT.MAX_FILE_MB + ' MB.</span>' +
                '<div class="co-file">' +
                  '<input class="co-file-input" type="file" id="co-extra" name="portfolio" accept="' + accept + '" aria-describedby="co-extra-state">' +
                  '<label class="co-file-btn" for="co-extra">Upload document</label>' +
                  '<span class="co-file-state" id="co-extra-state" role="status" aria-live="polite">No file selected</span>' +
                  '<button type="button" class="co-file-clear" id="co-extra-clear" hidden>Remove</button>' +
                '</div>' +
                '<p class="co-error" data-error-for="co-extra" hidden></p>' +
              '</div>' +
            '</fieldset>' +

            '<div class="co-consent">' +
              '<input type="checkbox" id="co-consent" name="Consent" value="Given" required>' +
              '<label for="co-consent">I consent to Sezibera Construction using the information provided for the purpose of assessing my application.</label>' +
            '</div>' +
            '<p class="co-error" data-error-for="co-consent" hidden></p>' +

            '<button type="submit" class="btn co-submit">Apply for this role</button>' +
            '<p class="co-note" id="co-note" role="status" aria-live="polite">' +
              'Your application goes to <a href="mailto:info@sezibera.com">info@sezibera.com</a>.' +
            '</p>' +
          '</form>' +

          '<div class="co-success" id="co-success" hidden tabindex="-1">' +
            '<h2 class="h-section">Application received.</h2>' +
            '<p class="body-copy">Thank you for your interest in Sezibera Construction. Our team will review your application and contact you where appropriate.</p>' +
            '<p class="co-success-extra" hidden></p>' +
            '<p><a class="link-accent" href="careers.html" data-back>Back to opportunities</a></p>' +
          '</div>' +
        '</div>' +
      '</div></section>';
  }

  function field(id, label, type, name, required, autocomplete) {
    return '<div class="field">' +
      '<label for="' + id + '">' + esc(label) +
        (required ? ' <span class="req">(required)</span>' : '') + '</label>' +
      '<input type="' + type + '" id="' + id + '" name="' + esc(name) + '"' +
        (required ? ' required' : '') +
        (autocomplete ? ' autocomplete="' + autocomplete + '"' : '') + '>' +
      '<p class="co-error" data-error-for="' + id + '" hidden></p>' +
    '</div>';
  }

  /* File input wiring ---------------------------------------------------- */

  function wireFile(inputId, required) {
    var input = document.getElementById(inputId);
    if (!input) return;
    var state = document.getElementById(inputId + '-state');
    var clear = document.getElementById(inputId + '-clear');
    var label = input.parentNode.querySelector('.co-file-btn');

    function reset() {
      input.value = '';
      state.textContent = 'No file selected';
      state.classList.remove('has-file');
      clear.hidden = true;
      if (label) label.textContent = label.getAttribute('data-rest') || label.textContent;
      setError(inputId, '');
    }

    if (label) label.setAttribute('data-rest', label.textContent);

    input.addEventListener('change', function () {
      var file = input.files && input.files[0];
      if (!file) { reset(); return; }

      var ext = (file.name.split('.').pop() || '').toLowerCase();
      if (SUBMIT.ACCEPT.indexOf(ext) === -1) {
        reset();
        setError(inputId, 'That file type is not accepted. Please upload a ' +
          SUBMIT.ACCEPT.join(', ').toUpperCase() + ' file.');
        return;
      }
      if (file.size > SUBMIT.MAX_FILE_MB * 1024 * 1024) {
        reset();
        setError(inputId, 'That file is larger than ' + SUBMIT.MAX_FILE_MB +
          ' MB. Please upload a smaller file.');
        return;
      }

      setError(inputId, '');
      state.textContent = file.name + ' (' + Math.max(1, Math.round(file.size / 1024)) + ' KB)';
      state.classList.add('has-file');
      clear.hidden = false;
      if (label) label.textContent = 'Replace file';
    });

    clear.addEventListener('click', function () {
      reset();
      input.focus();
    });

    input.setAttribute('data-required', required ? 'true' : 'false');
  }

  /* Validation ----------------------------------------------------------- */

  function setError(id, message) {
    var el = document.querySelector('[data-error-for="' + id + '"]');
    var input = document.getElementById(id);
    if (el) {
      el.textContent = message;
      el.hidden = !message;
    }
    if (input) {
      if (message) {
        input.setAttribute('aria-invalid', 'true');
        input.setAttribute('aria-describedby', 'err-' + id);
        if (el) el.id = 'err-' + id;
      } else {
        input.removeAttribute('aria-invalid');
      }
    }
  }

  function validate(formEl) {
    var firstBad = null;

    var required = Array.prototype.slice.call(
      formEl.querySelectorAll('input[required], select[required], textarea[required]')
    );

    required.forEach(function (el) {
      var ok;
      if (el.type === 'checkbox') ok = el.checked;
      else ok = el.value.trim() !== '';

      if (ok && el.type === 'email') {
        ok = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(el.value.trim());
      }

      if (!ok) {
        var msg = el.type === 'checkbox'
          ? 'Please confirm your consent before submitting.'
          : (el.type === 'email' && el.value.trim() !== ''
              ? 'Please enter a valid email address.'
              : 'This field is required.');
        setError(el.id, msg);
        if (!firstBad) firstBad = el;
      } else {
        setError(el.id, '');
      }
    });

    /* The CV is required, but its input is deliberately outside the native
       required set so the file control can carry its own messaging. */
    var cv = document.getElementById('co-cv');
    if (cv && (!cv.files || !cv.files.length)) {
      setError('co-cv', 'Please attach your CV.');
      if (!firstBad) firstBad = cv;
    }

    return firstBad;
  }

  /* Submission ----------------------------------------------------------- */

  function wireApplyForm() {
    var formEl = document.getElementById('co-apply-form');
    if (!formEl) return;

    wireFile('co-cv', true);
    wireFile('co-extra', false);

    var note = document.getElementById('co-note');
    var success = document.getElementById('co-success');
    var button = formEl.querySelector('.co-submit');
    var resting = note ? note.innerHTML : '';
    var sending = false;

    function setNote(html, state) {
      if (!note) return;
      note.innerHTML = html;
      note.classList.toggle('is-ok', state === 'ok');
      note.classList.toggle('is-error', state === 'error');
    }

    formEl.addEventListener('submit', function (e) {
      e.preventDefault();
      if (sending) return;

      var bad = validate(formEl);
      if (bad) {
        setNote('Please correct the highlighted fields and try again.', 'error');
        bad.focus();
        return;
      }

      sending = true;
      var label = button.textContent;
      button.disabled = true;
      button.textContent = 'Sending…';
      setNote('Sending your application…', null);

      var payload = new FormData(formEl);
      payload.append('access_key', SUBMIT.ACCESS_KEY);
      payload.append('subject', SUBMIT.SUBJECT);
      payload.append('from_name', 'Sezibera Construction careers');

      var cv = document.getElementById('co-cv');
      var extra = document.getElementById('co-extra');

      if (!SUBMIT.CV_ATTACHMENTS) {
        /* The handler does not carry files. The document itself is dropped
           rather than silently half-sent, and its name travels as text so the
           team can match the emailed CV to the application. */
        payload.delete('cv');
        payload.delete('portfolio');
        if (cv && cv.files[0]) payload.append('CV file name', cv.files[0].name);
        if (extra && extra.files[0]) payload.append('Portfolio file name', extra.files[0].name);
      }

      fetch(SUBMIT.ENDPOINT, {
        method: 'POST',
        headers: { Accept: 'application/json' },
        body: payload
      })
        .then(function (response) {
          return response.json().catch(function () { return {}; })
            .then(function (result) {
              if (!response.ok || result.success === false) {
                throw new Error(result.message || 'Request failed: ' + response.status);
              }
              return result;
            });
        })
        .then(function () {
          formEl.hidden = true;
          success.hidden = false;

          var extraLine = success.querySelector('.co-success-extra');
          if (!SUBMIT.CV_ATTACHMENTS && cv && cv.files[0]) {
            extraLine.innerHTML = 'Please email your CV (' + esc(cv.files[0].name) +
              ') to <a class="link-underline" href="mailto:' + esc(SUBMIT.CV_EMAIL) + '">' +
              esc(SUBMIT.CV_EMAIL) + '</a> so it can be filed with this application.';
            extraLine.hidden = false;
          }
          success.focus();
        })
        .catch(function () {
          setNote(
            'Sorry, your application could not be sent. Please email ' +
            '<a href="mailto:info@sezibera.com">info@sezibera.com</a> or call ' +
            '<a href="tel:+250788303184">+250 788 303 184</a>.',
            'error'
          );
        })
        .then(function () {
          sending = false;
          button.disabled = false;
          button.textContent = label;
        });
    });

    formEl.addEventListener('input', function (e) {
      if (e.target && e.target.id) setError(e.target.id, '');
      if (note && note.classList.contains('is-error')) setNote(resting, null);
    });
  }

  /* View switching ------------------------------------------------------- */

  function showRegister(push, focusList) {
    detailView.hidden = true;
    detailView.innerHTML = '';
    indexView.hidden = false;
    document.title = BASE_TITLE;
    if (push) history.pushState({ view: 'index' }, '', 'careers.html');
    if (focusList) {
      var heading = document.getElementById('opportunities');
      if (heading) heading.scrollIntoView();
    }
  }

  function showDetail(id, push) {
    var o = byId(id);
    if (!o) { showRegister(true); return; }

    indexView.hidden = true;
    detailView.innerHTML = detailHTML(o);
    detailView.hidden = false;
    document.title = o.title + ' | Careers | Sezibera Construction';

    if (push) {
      history.pushState({ view: 'detail', id: o.id }, '', 'careers.html?role=' + encodeURIComponent(o.id));
    }

    wireApplyForm();
    window.scrollTo(0, 0);

    var h1 = detailView.querySelector('h1');
    if (h1) { h1.setAttribute('tabindex', '-1'); h1.focus({ preventScroll: true }); }
  }

  function routeFromURL(push) {
    var params = new URLSearchParams(window.location.search);
    var role = params.get('role');
    if (role && byId(role)) showDetail(role, false);
    else showRegister(false);
  }

  /* Wiring --------------------------------------------------------------- */

  fill(selects.expertise, DATA.expertise, 'All expertise');
  fill(selects.location, DATA.locations, 'All locations');
  fill(selects.type, DATA.types, 'All types');
  fill(selects.level, DATA.levels, 'All levels');
  fill(selects.status, DATA.statuses, 'Open opportunities');

  if (form) {
    form.addEventListener('submit', function (e) { e.preventDefault(); renderRegister(); });
    form.addEventListener('change', renderRegister);
  }
  if (searchEl) {
    searchEl.addEventListener('input', renderRegister);
    searchEl.addEventListener('search', renderRegister);
  }

  clearEls.forEach(function (el) {
    el.addEventListener('click', function () {
      if (searchEl) searchEl.value = '';
      Object.keys(selects).forEach(function (k) { if (selects[k]) selects[k].value = ''; });
      renderRegister();
      if (searchEl) searchEl.focus();
    });
  });

  /* Mobile: the filter set collapses behind a single control. The panel is
     only ever hidden at the narrow breakpoint — the CSS reopens it above it,
     and this keeps aria-expanded honest for whichever state applies. */
  if (toggleEl && panelEl) {
    var mq = window.matchMedia('(min-width: 62rem)');
    var sync = function () {
      if (mq.matches) {
        panelEl.removeAttribute('hidden');
        toggleEl.setAttribute('aria-expanded', 'true');
      } else {
        /* Crossing back down collapses the set again, so the narrow layout
           always starts from the same state the toggle claims. */
        panelEl.setAttribute('hidden', '');
        toggleEl.setAttribute('aria-expanded', 'false');
      }
    };
    toggleEl.addEventListener('click', function () {
      var open = toggleEl.getAttribute('aria-expanded') === 'true';
      toggleEl.setAttribute('aria-expanded', open ? 'false' : 'true');
      if (open) panelEl.setAttribute('hidden', '');
      else panelEl.removeAttribute('hidden');
    });
    if (mq.addEventListener) mq.addEventListener('change', sync);
    else if (mq.addListener) mq.addListener(sync);
    sync();
  }

  /* Detail links are real anchors, so they work without JS and on middle
     click. Plain left clicks are intercepted for an in-page transition. */
  document.addEventListener('click', function (e) {
    var link = e.target.closest ? e.target.closest('a[data-role], a[data-back]') : null;
    if (!link) return;
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;

    e.preventDefault();
    if (link.hasAttribute('data-back')) showRegister(true, true);
    else showDetail(link.getAttribute('data-role'), true);
  });

  window.addEventListener('popstate', function () { routeFromURL(false); });

  renderRegister();
  routeFromURL(false);

})();
