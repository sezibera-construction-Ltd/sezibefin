/* ==========================================================================
   SEZIBERA CONSTRUCTION — SECURE DOCUMENT VIEWER (client)
   --------------------------------------------------------------------------
   This file holds no secrets and grants no access. Everything it does is
   re-checked by the server: the session lives in a cookie this script cannot
   read, and every page image is authorised and watermarked server-side before
   it is sent. Reading or editing this file gets nobody into anything.

   Four states, one at a time: email -> code -> pick a document -> read it.
   ========================================================================== */

(function () {
  'use strict';

  var $ = function (id) { return document.getElementById(id); };

  /* Every page is rendered from the source PDF at 150 DPI on US Letter. Saying
     the intrinsic size up front means each placeholder is exactly the size of
     the page that replaces it, so nothing on screen jumps as pages arrive. */
  var PAGE_W = 1275;
  var PAGE_H = 1650;

  var el = {
    who: $('who'),
    signOut: $('signOut'),
    progress: $('progress'),

    stepEmail: $('stepEmail'),
    emailForm: $('emailForm'),
    email: $('email'),
    emailSubmit: $('emailSubmit'),
    emailError: $('emailError'),

    stepCode: $('stepCode'),
    codeForm: $('codeForm'),
    code: $('code'),
    codeSubmit: $('codeSubmit'),
    codeError: $('codeError'),
    codeNote: $('codeNote'),
    startOver: $('startOver'),

    stepPick: $('stepPick'),
    pickList: $('pickList'),
    pickNote: $('pickNote'),

    stepView: $('stepView'),
    viewTitle: $('viewTitle'),
    viewCode: $('viewCode'),
    viewCount: $('viewCount'),
    viewPages: $('viewPages'),
    viewBack: $('viewBack')
  };

  var documents = [];
  var current = null;

  /* ---- small helpers ----------------------------------------------------- */

  function show(step) {
    [el.stepEmail, el.stepCode, el.stepPick, el.stepView].forEach(function (s) {
      s.hidden = (s !== step);
    });
    document.body.classList.toggle('is-reading', step === el.stepView);
    if (step !== el.stepView) setProgress(0);
    window.scrollTo(0, 0);
  }

  /* Titles arrive as "Project Manager — SOP-PM-01". The role is what a reader
     scans for; the reference is what they quote in an email. Split them so
     each can be styled for its own job, and cope with a title that carries no
     reference at all. */
  function splitTitle(title) {
    var parts = String(title).split(/\s+[—–-]\s+/);
    if (parts.length < 2) return { role: String(title), code: '' };
    return {
      role: parts.slice(0, -1).join(' — '),
      code: parts[parts.length - 1]
    };
  }

  function plural(n, word) { return n + ' ' + word + (n === 1 ? '' : 's'); }

  function setError(node, message) {
    if (!message) { node.hidden = true; node.textContent = ''; return; }
    node.textContent = message;
    node.hidden = false;
  }

  function busy(button, isBusy, busyText, restText) {
    button.disabled = isBusy;
    button.textContent = isBusy ? busyText : restText;
  }

  /* Every response is JSON; a non-JSON body means something broke upstream. */
  async function api(path, options) {
    var response = await fetch(path, Object.assign({
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' }
    }, options || {}));

    var data = null;
    try { data = await response.json(); } catch (e) { data = null; }

    if (!response.ok) {
      var error = new Error((data && data.error) ||
        'Something went wrong. Please try again in a moment.');
      error.status = response.status;
      throw error;
    }
    return data || {};
  }

  /* ---- state: signed in -------------------------------------------------- */

  function signedIn(email, docs) {
    documents = docs || [];
    el.who.textContent = email;
    el.signOut.hidden = false;

    /* One document and nothing to choose from? Open it straight away —
       a picker with a single row is a step that only creates hesitation. */
    if (documents.length === 1) {
      openDocument(documents[0]);
    } else {
      renderPicker();
    }
  }

  function signedOut(message) {
    documents = [];
    current = null;
    el.who.textContent = '';
    el.signOut.hidden = true;
    el.viewPages.textContent = '';
    setError(el.emailError, message || '');
    show(el.stepEmail);
    el.email.focus();
  }

  /* ---- picker ------------------------------------------------------------ */

  function renderPicker() {
    el.pickList.textContent = '';

    el.pickNote.textContent = documents.length
      ? 'Your access covers ' + plural(documents.length, 'document') +
        '. Each one opens in the reader on this page and stays there.'
      : 'No documents are assigned to your address yet. The office can add ' +
        'them and the change takes effect within a few minutes.';

    documents.forEach(function (doc) {
      var parts = splitTitle(doc.title);

      var li = document.createElement('li');
      var button = document.createElement('button');
      button.type = 'button';

      var text = document.createElement('span');
      text.className = 'doc-pick__text';

      var name = document.createElement('span');
      name.className = 'doc-pick__name';
      name.textContent = parts.role;
      text.appendChild(name);

      if (parts.code) {
        var code = document.createElement('span');
        code.className = 'doc-pick__code';
        code.textContent = parts.code;
        text.appendChild(code);
      }

      var meta = document.createElement('span');
      meta.className = 'doc-pick__meta';
      meta.textContent = plural(doc.pages, 'page');

      button.appendChild(text);
      button.appendChild(meta);
      button.addEventListener('click', function () { openDocument(doc); });

      li.appendChild(button);
      el.pickList.appendChild(li);
    });

    show(el.stepPick);
  }

  /* ---- viewer ------------------------------------------------------------ */

  function openDocument(doc) {
    current = doc;
    var parts = splitTitle(doc.title);

    el.viewTitle.textContent = parts.role;
    el.viewCode.textContent = parts.code;
    el.viewCode.hidden = !parts.code;
    el.viewCount.textContent = 'Page 1 of ' + doc.pages;
    el.viewBack.hidden = (documents.length < 2);
    el.viewPages.textContent = '';

    for (var n = 1; n <= doc.pages; n++) {
      el.viewPages.appendChild(buildPage(doc, n));
    }

    show(el.stepView);
    watchPages();
  }

  function buildPage(doc, number) {
    var wrap = document.createElement('div');
    wrap.className = 'doc-page';
    wrap.dataset.page = String(number);
    wrap.style.aspectRatio = PAGE_W + ' / ' + PAGE_H;

    var pending = document.createElement('p');
    pending.className = 'doc-page__pending';
    pending.textContent = 'Page ' + number;
    wrap.appendChild(pending);

    var img = document.createElement('img');
    img.alt = doc.title + ', page ' + number;
    img.width = PAGE_W;
    img.height = PAGE_H;
    img.draggable = false;
    img.decoding = 'async';
    /* The first page eagerly, the rest as the reader scrolls — each one is a
       fresh authorised request, so nothing is fetched that is not read. */
    img.loading = number === 1 ? 'eager' : 'lazy';

    img.addEventListener('load', function () {
      pending.remove();
      wrap.classList.add('is-loaded');
    });
    img.addEventListener('error', function () {
      wrap.classList.add('is-failed');
      pending.textContent = 'Page ' + number + ' could not be loaded';
      /* A page that fails once the session has lapsed is the common case, and
         the reader deserves to be told rather than left with a grey box. */
      checkSession();
    });

    img.src = '/api/doc/page?doc=' + encodeURIComponent(doc.slug) +
              '&page=' + number;

    wrap.appendChild(img);
    return wrap;
  }

  /* ---- where the reader is ----------------------------------------------- */
  /* Which page is on screen, and how far through the document that is. Both
     come from one observer rather than a scroll handler that runs constantly. */

  var observer = null;

  function watchPages() {
    if (observer) observer.disconnect();
    if (!('IntersectionObserver' in window)) return;

    observer = new IntersectionObserver(function (entries) {
      var best = null;
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        if (!best || entry.intersectionRatio > best.intersectionRatio) best = entry;
      });
      if (!best || !current) return;

      var number = parseInt(best.target.dataset.page, 10);
      el.viewCount.textContent = 'Page ' + number + ' of ' + current.pages;
      setProgress(number / current.pages);
    }, { threshold: [0.1, 0.5, 0.9] });

    Array.prototype.forEach.call(
      el.viewPages.querySelectorAll('.doc-page'),
      function (page) { observer.observe(page); }
    );
  }

  function setProgress(fraction) {
    var clamped = Math.min(1, Math.max(0, fraction || 0));
    el.progress.style.transform = 'scaleX(' + clamped + ')';
  }

  /* If a page was refused because the session lapsed or access was withdrawn,
     say so once and return to the sign-in form. */
  var checking = false;
  async function checkSession() {
    if (checking) return;
    checking = true;
    try {
      var session = await api('/api/auth/session');
      if (!session.signedIn) {
        signedOut('Your session has ended. Enter your email address to sign in again.');
      }
    } catch (e) {
      /* Transient failure — leave the reader where they are. */
    } finally {
      checking = false;
    }
  }

  /* ---- deterrents -------------------------------------------------------- */
  /* None of these stop a screenshot. They remove the casual, one-click routes
     to a copy — the watermark and the access log are what actually deter. */

  document.addEventListener('contextmenu', function (event) {
    if (event.target.closest('.doc-guard')) event.preventDefault();
  });

  document.addEventListener('dragstart', function (event) {
    if (event.target.closest('.doc-guard')) event.preventDefault();
  });

  document.addEventListener('keydown', function (event) {
    var key = (event.key || '').toLowerCase();
    if ((event.ctrlKey || event.metaKey) && (key === 'p' || key === 's')) {
      event.preventDefault();
      return;
    }
    /* Escape leaves the reader, the way it closes anything else. */
    if (key === 'escape' && !el.stepView.hidden && documents.length > 1) {
      renderPicker();
    }
  });

  /* ---- events ------------------------------------------------------------ */

  el.emailForm.addEventListener('submit', async function (event) {
    event.preventDefault();
    setError(el.emailError, '');

    var address = el.email.value.trim();
    if (!address || address.indexOf('@') < 1) {
      setError(el.emailError, 'Enter the email address the office approved.');
      el.email.focus();
      return;
    }

    busy(el.emailSubmit, true, 'Sending…', 'Send me a code');
    try {
      var result = await api('/api/auth/request-code', {
        method: 'POST',
        body: JSON.stringify({ email: address })
      });
      el.codeNote.textContent =
        'We have sent a six-digit code to ' + result.email + '. It expires in ' +
        result.minutes + ' minutes and only works in this browser.';
      show(el.stepCode);
      el.code.focus();
    } catch (error) {
      setError(el.emailError, error.message);
    } finally {
      busy(el.emailSubmit, false, 'Sending…', 'Send me a code');
    }
  });

  el.codeForm.addEventListener('submit', async function (event) {
    event.preventDefault();
    setError(el.codeError, '');

    var entered = el.code.value.replace(/\D/g, '');
    if (entered.length !== 6) {
      setError(el.codeError, 'The code is six digits.');
      el.code.focus();
      return;
    }

    busy(el.codeSubmit, true, 'Checking…', 'Open my documents');
    try {
      var result = await api('/api/auth/verify-code', {
        method: 'POST',
        body: JSON.stringify({ code: entered })
      });
      signedIn(result.email, result.documents);
    } catch (error) {
      setError(el.codeError, error.message);
      el.code.value = '';
      el.code.focus();
    } finally {
      busy(el.codeSubmit, false, 'Checking…', 'Open my documents');
    }
  });

  /* Digits only, and submit itself once six are in — one less thing to get
     wrong when the code is being copied across from a phone. */
  el.code.addEventListener('input', function () {
    var cleaned = el.code.value.replace(/\D/g, '').slice(0, 6);
    if (cleaned !== el.code.value) el.code.value = cleaned;
    if (cleaned.length === 6) {
      el.codeForm.requestSubmit ? el.codeForm.requestSubmit()
                                : el.codeSubmit.click();
    }
  });

  el.startOver.addEventListener('click', function () {
    el.code.value = '';
    setError(el.codeError, '');
    setError(el.emailError, '');
    show(el.stepEmail);
    el.email.focus();
    el.email.select();
  });

  el.viewBack.addEventListener('click', renderPicker);

  el.signOut.addEventListener('click', async function () {
    try { await api('/api/auth/logout', { method: 'POST' }); } catch (e) { /* leaving anyway */ }
    signedOut();
  });

  /* ---- start ------------------------------------------------------------- */
  /* Already signed in from earlier today? Go straight to the documents. */

  (async function start() {
    try {
      var session = await api('/api/auth/session');
      if (session.signedIn) {
        signedIn(session.email, session.documents);
        return;
      }
    } catch (e) { /* fall through to the sign-in form */ }
    signedOut();
  })();

})();
