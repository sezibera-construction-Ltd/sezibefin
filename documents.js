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

  var el = {
    who: $('who'),
    signOut: $('signOut'),

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

    stepView: $('stepView'),
    viewTitle: $('viewTitle'),
    viewPages: $('viewPages'),
    viewBack: $('viewBack')
  };

  var documents = [];

  /* ---- small helpers ----------------------------------------------------- */

  function show(step) {
    [el.stepEmail, el.stepCode, el.stepPick, el.stepView].forEach(function (s) {
      s.hidden = (s !== step);
    });
    window.scrollTo(0, 0);
  }

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
      throw new Error((data && data.error) ||
        'Something went wrong. Please try again in a moment.');
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

  function signedOut() {
    documents = [];
    el.who.textContent = '';
    el.signOut.hidden = true;
    el.viewPages.textContent = '';
    show(el.stepEmail);
    el.email.focus();
  }

  /* ---- picker ------------------------------------------------------------ */

  function renderPicker() {
    el.pickList.textContent = '';

    documents.forEach(function (doc) {
      var li = document.createElement('li');
      var button = document.createElement('button');
      button.type = 'button';

      var name = document.createElement('span');
      name.className = 'doc-pick__name';
      name.textContent = doc.title;

      var meta = document.createElement('span');
      meta.className = 'doc-pick__meta';
      meta.textContent = doc.pages + (doc.pages === 1 ? ' page' : ' pages');

      button.appendChild(name);
      button.appendChild(meta);
      button.addEventListener('click', function () { openDocument(doc); });

      li.appendChild(button);
      el.pickList.appendChild(li);
    });

    show(el.stepPick);
  }

  /* ---- viewer ------------------------------------------------------------ */

  function openDocument(doc) {
    el.viewTitle.textContent = doc.title;
    el.viewBack.hidden = (documents.length < 2);
    el.viewPages.textContent = '';

    for (var n = 1; n <= doc.pages; n++) {
      el.viewPages.appendChild(buildPage(doc, n));
    }

    show(el.stepView);
  }

  function buildPage(doc, number) {
    var wrap = document.createElement('div');
    wrap.className = 'doc-page';

    var pending = document.createElement('p');
    pending.className = 'doc-page__pending';
    pending.textContent = 'Page ' + number;
    wrap.appendChild(pending);

    var img = document.createElement('img');
    img.alt = doc.title + ', page ' + number;
    img.draggable = false;
    img.decoding = 'async';
    /* The first page eagerly, the rest as the reader scrolls — each one is a
       fresh authorised request, so nothing is fetched that is not read. */
    img.loading = number === 1 ? 'eager' : 'lazy';

    img.addEventListener('load', function () { pending.remove(); });
    img.addEventListener('error', function () {
      pending.textContent = 'Page ' + number + ' could not be loaded';
    });

    img.src = '/api/doc/page?doc=' + encodeURIComponent(doc.slug) +
              '&page=' + number;

    wrap.appendChild(img);
    return wrap;
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
