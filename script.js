document.addEventListener('DOMContentLoaded', () => {

  /* Page loader ------------------------------------------------------------
     The mark's six bars animate as the waveform they already resemble, then
     the overlay clears. It also covers same-site navigation, so moving
     between pages reads as one continuous motion rather than a white flash. */
  const loader = document.getElementById('loader');
  if (loader) {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    // JS is alive, so drop the CSS failsafe and take over visibility
    loader.style.animation = 'none';

    const bars = Array.from(loader.querySelectorAll('.loader-mark line'));
    /* Every number here is a floor the visitor has to sit through, so they are
       kept to the shortest that still reads as motion rather than a flash.
       MIN_LOOP is tuned against the 0.55s bar cycle in the stylesheet: about
       two-thirds of one pass, enough to register the waveform. */
    const MIN_LOOP = reduced ? 0 : 340;   // below this the waveform reads as a flicker
    const SETTLE = 220;                   // bars ease back to the true mark
    const HOLD = 60;                      // the resolved logo registers before the reveal
    const started = window.__loadStart || Date.now();
    const wait = (ms) => new Promise((r) => setTimeout(r, ms));

    /* A bar's height is the length of dash left in its stroke, not a scale —
       that is what keeps its rounded ends at full radius while it moves, see
       .loader-mark line. So the settle pins and eases the dash. */
    const EASE = 'cubic-bezier(0.22, 0.68, 0.28, 1)';
    const dashOf = (bar) => {
      const cs = getComputedStyle(bar);
      return { array: cs.strokeDasharray, offset: cs.strokeDashoffset };
    };

    /* Pin each bar at whatever height it currently occupies, drop the loop,
       then ease every bar to full — the mark resolving into itself. Without
       the pin the browser snaps to the base value and the settle is a jump. */
    const settle = async () => {
      if (reduced || !bars.length) return;
      bars.forEach((bar) => {
        const dash = dashOf(bar);
        bar.style.animation = 'none';
        bar.style.transition = 'none';
        bar.style.strokeDasharray = dash.array;
        bar.style.strokeDashoffset = dash.offset;
      });
      void loader.offsetWidth;
      bars.forEach((bar) => {
        bar.style.transition = 'stroke-dasharray ' + SETTLE + 'ms ' + EASE +
                               ', stroke-dashoffset ' + SETTLE + 'ms ' + EASE;
        bar.style.strokeDasharray = '100 100';   // pathLength units: the whole bar
        bar.style.strokeDashoffset = '0';
      });
      await wait(SETTLE + 30);
    };

    const restartBars = () => bars.forEach((bar) => {
      bar.style.transition = '';
      bar.style.strokeDasharray = '';
      bar.style.strokeDashoffset = '';
      bar.style.animation = '';
    });

    /* Progress ------------------------------------------------------------
       Counts real work: the page's own non-deferred images, which on this
       site are the whole cost. Lazy images are excluded — they are meant to
       arrive later, so counting them would stall the number at 90%. */
    const pctEl = loader.querySelector('.loader-pct b');
    const barEl = loader.querySelector('.loader-track span');
    const tracked = Array.from(document.images)
      .filter((img) => img.getAttribute('loading') !== 'lazy');
    let arrived = tracked.filter((img) => img.complete).length;
    let forced = false;

    tracked.forEach((img) => {
      if (img.complete) return;
      const count = () => { arrived += 1; };
      img.addEventListener('load', count, { once: true });
      img.addEventListener('error', count, { once: true });
    });

    // Hold just short of full until the window has genuinely finished, so
    // 100% never appears while bytes are still arriving.
    const target = () => {
      if (forced) return 1;
      const share = tracked.length ? arrived / tracked.length : 1;
      return document.readyState === 'complete' ? 1 : Math.min(share, 0.96);
    };

    let shown = 0;
    const paint = (v) => {
      const n = Math.round(v * 100);
      if (pctEl) pctEl.textContent = String(n);
      if (barEl) barEl.style.width = n + '%';
    };
    paint(0);

    /* Driven by an interval rather than requestAnimationFrame: rAF is paused
       outright in a background tab, which would leave the counter frozen and
       the page stranded behind the overlay until the failsafe. A 30ms tick
       keeps running, and the CSS transition on the bar smooths it. */
    const atFull = new Promise((resolve) => {
      if (reduced) { paint(1); return resolve(); }
      let last = Date.now();
      const timer = setInterval(() => {
        const now = Date.now();
        const dt = Math.min(1000, now - last);
        last = now;
        // Close half the remaining gap every 100ms of real time, so the
        // counter converges at the same pace whatever the tick rate.
        const t = target();
        shown += (t - shown) * (1 - Math.pow(0.5, dt / 100));
        if (t - shown < 0.004) shown = t;
        paint(shown);
        if (shown >= 1) { clearInterval(timer); resolve(); }
      }, 30);
    });

    let revealed = false;
    const reveal = async () => {
      if (revealed) return;
      revealed = true;
      await settle();                       // finish the animation first…
      await wait(reduced ? 0 : HOLD);
      loader.classList.add('is-hidden');    // …then hand the page over
      document.body.classList.add('page-in');
    };

    const hide = () => {
      paint(1);
      loader.classList.add('is-hidden');
      document.body.classList.add('page-in');
    };

    // Reveal needs both: a full count, and enough time for the waveform to read
    Promise.all([atFull, wait(Math.max(0, MIN_LOOP - (Date.now() - started)))])
      .then(reveal);

    // If the network stalls, run the counter home rather than freeze mid-number
    setTimeout(() => { forced = true; }, 2500);
    setTimeout(hide, 5000);                 // never hold the page hostage

    // Returning via the back button restores a cached page mid-transition
    window.addEventListener('pageshow', (e) => { if (e.persisted) hide(); });

    if (!reduced) {
      document.addEventListener('click', (e) => {
        if (e.defaultPrevented || e.button !== 0) return;
        if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;

        const link = e.target.closest('a[href]');
        if (!link || link.hasAttribute('download')) return;
        if (link.target && link.target !== '_self') return;

        const href = link.getAttribute('href');
        if (!href || href.startsWith('#') || /^(mailto:|tel:)/i.test(href)) return;

        const url = new URL(link.href, location.href);
        if (url.origin !== location.origin) return;
        if (url.pathname === location.pathname) return;   // same page, incl. #anchors

        e.preventDefault();
        restartBars();
        paint(0);                                   // the next page counts from zero
        document.body.classList.remove('page-in');
        loader.classList.remove('is-hidden');
        // Let the overlay reach full opacity before the swap, so the outgoing
        // page is never visible behind a half-faded loader. Matches the 0.25s
        // loader transition with a little margin — no longer.
        setTimeout(() => { location.href = link.href; }, 280);
      });
    }
  }

  /* Nav panel ------------------------------------------------------------ */
  const burger = document.querySelector('.nav-burger');
  const panel = document.querySelector('.nav-panel');

  if (burger && panel) {
    burger.addEventListener('click', () => {
      const open = !panel.classList.contains('open');
      panel.classList.toggle('open', open);
      burger.setAttribute('aria-expanded', String(open));
      document.body.classList.toggle('nav-open', open);
    });

    panel.querySelectorAll('a').forEach((link) => {
      link.addEventListener('click', () => {
        panel.classList.remove('open');
        burger.setAttribute('aria-expanded', 'false');
        document.body.classList.remove('nav-open');
      });
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && panel.classList.contains('open')) burger.click();
    });
  }

  /* Accordions ----------------------------------------------------------- */
  document.querySelectorAll('.accordion-trigger').forEach((trigger) => {
    trigger.addEventListener('click', () => {
      const item = trigger.closest('.accordion-item');
      const open = !item.classList.contains('open');
      item.classList.toggle('open', open);
      trigger.setAttribute('aria-expanded', String(open));
    });
  });

  /* Carousels ------------------------------------------------------------ */
  document.querySelectorAll('.carousel').forEach((carousel) => {
    const track = carousel.querySelector('.carousel-track');
    const slides = Array.from(carousel.querySelectorAll('.carousel-slide'));
    const prev = carousel.querySelector('.carousel-prev');
    const next = carousel.querySelector('.carousel-next');
    const dots = Array.from(carousel.querySelectorAll('.carousel-dot'));
    if (!track || slides.length < 2) return;

    let index = 0;

    const render = () => {
      track.style.transform = `translateX(-${index * 100}%)`;
      slides.forEach((slide, i) => {
        slide.setAttribute('aria-hidden', String(i !== index));
        // Keep off-screen slides out of the tab order
        slide.querySelectorAll('a, button').forEach((el) => {
          el.tabIndex = i === index ? 0 : -1;
        });
      });
      dots.forEach((dot, i) => dot.setAttribute('aria-selected', String(i === index)));
      if (prev) prev.disabled = index === 0;
      if (next) next.disabled = index === slides.length - 1;
    };

    const goTo = (i) => {
      index = Math.max(0, Math.min(i, slides.length - 1));
      render();
    };

    if (prev) prev.addEventListener('click', () => goTo(index - 1));
    if (next) next.addEventListener('click', () => goTo(index + 1));
    dots.forEach((dot, i) => dot.addEventListener('click', () => goTo(i)));

    carousel.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowLeft') { e.preventDefault(); goTo(index - 1); }
      if (e.key === 'ArrowRight') { e.preventDefault(); goTo(index + 1); }
    });

    // Touch swipe
    let startX = null;
    track.addEventListener('touchstart', (e) => { startX = e.touches[0].clientX; }, { passive: true });
    track.addEventListener('touchend', (e) => {
      if (startX === null) return;
      const dx = e.changedTouches[0].clientX - startX;
      if (Math.abs(dx) > 45) goTo(dx < 0 ? index + 1 : index - 1);
      startX = null;
    }, { passive: true });

    render();
  });

  /* Project browser --------------------------------------------------------
     One project on screen at a time. The register below is its index, so
     there is a single mental model for moving through the work. Wraps at
     both ends — with a counter present, a dead-end button reads as broken. */
  const browser = document.querySelector('.browser');
  if (browser) {
    const items = Array.from(browser.querySelectorAll('.pv-item'));
    const rows = Array.from(document.querySelectorAll('.project-row'));
    const current = browser.querySelector('#pv-current');
    const prev = browser.querySelector('.pv-prev');
    const next = browser.querySelector('.pv-next');
    let index = 0;

    // A lazy image inside a display:none slide never fetches, so stepping to
    // it would show an empty frame while several megabytes arrive. Warm the
    // current slide and its two neighbours; the rest stay deferred.
    const warm = (i) => {
      [i - 1, i, i + 1].forEach((n) => {
        const item = items[(n + items.length) % items.length];
        item.querySelectorAll('img[loading="lazy"]').forEach((img) => img.removeAttribute('loading'));
      });
    };

    const render = (focusStage) => {
      warm(index);
      items.forEach((item, i) => item.classList.toggle('is-active', i === index));
      rows.forEach((row, i) => row.classList.toggle('is-current', i === index));
      if (current) current.textContent = String(index + 1).padStart(2, '0');
      // Shareable without polluting history or jumping the page
      history.replaceState(null, '', '#' + items[index].id);
      if (focusStage) items[index].scrollIntoView({ block: 'nearest' });
    };

    const goTo = (i, focusStage) => {
      index = (i + items.length) % items.length;
      render(focusStage);
    };

    if (prev) prev.addEventListener('click', () => goTo(index - 1));
    if (next) next.addEventListener('click', () => goTo(index + 1));

    rows.forEach((row, i) => {
      const jump = row.querySelector('.project-jump');
      if (jump) jump.addEventListener('click', () => {
        goTo(i);
        browser.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    });

    browser.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowLeft') { e.preventDefault(); goTo(index - 1); }
      if (e.key === 'ArrowRight') { e.preventDefault(); goTo(index + 1); }
    });

    let startX = null;
    browser.addEventListener('touchstart', (e) => { startX = e.touches[0].clientX; }, { passive: true });
    browser.addEventListener('touchend', (e) => {
      if (startX === null) return;
      const dx = e.changedTouches[0].clientX - startX;
      if (Math.abs(dx) > 45) goTo(dx < 0 ? index + 1 : index - 1);
      startX = null;
    }, { passive: true });

    // Honour a shared link such as projects.html#p07
    const fromHash = items.findIndex((item) => '#' + item.id === location.hash);
    index = fromHash > -1 ? fromHash : 0;
    render();
  }

  /* Reveal on scroll ----------------------------------------------------- */
  const revealEls = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window && revealEls.length) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('in');
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12 });
    revealEls.forEach((el) => io.observe(el));
  } else {
    revealEls.forEach((el) => el.classList.add('in'));
  }

  /* Client logos ----------------------------------------------------------
     The row travels only when the marks genuinely do not fit. At six logos
     that means it sits still on a desktop and scrolls on a phone, which is
     the honest answer both ways: motion where it buys space, stillness where
     a loop would just repeat a short list at the visitor. Re-measured on
     resize, so rotating a phone settles into the right state. */
  const logos = document.querySelector('.logos');
  if (logos) {
    const track = logos.querySelector('.logos-track');
    const firstSet = logos.querySelector('.logos-set');
    const noMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    let clone = null;

    /* The loop needs a second identical set to reset onto. Cloning it here
       rather than in the markup keeps one list to maintain, and the copy is
       hidden from assistive tech so each client is announced once. */
    const setScrolling = (on) => {
      logos.classList.toggle('is-scrolling', on);
      if (on && !clone) {
        clone = firstSet.cloneNode(true);
        clone.setAttribute('aria-hidden', 'true');
        clone.querySelectorAll('img').forEach((img) => { img.alt = ''; });
        track.appendChild(clone);
      } else if (!on && clone) {
        clone.remove();
        clone = null;
      }
    };

    const fit = () => {
      if (noMotion.matches) { setScrolling(false); return; }
      // Measure the original set alone — the clone is part of the track and
      // would otherwise make the row look permanently overflowing.
      setScrolling(firstSet.scrollWidth > logos.clientWidth);
    };

    fit();
    /* These are lazy — deliberately, so the page loader's progress gate does
       not wait on them — which means the row measures as zero-width until they
       actually arrive. Re-measure as each one lands. */
    firstSet.querySelectorAll('img').forEach((img) => {
      if (!img.complete) img.addEventListener('load', fit, { once: true });
    });
    window.addEventListener('load', fit);
    let resizeTimer;
    window.addEventListener('resize', () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(fit, 150);
    });
    if (noMotion.addEventListener) noMotion.addEventListener('change', fit);

    // An animation nobody can see still costs battery on a phone
    if ('IntersectionObserver' in window) {
      const pause = new IntersectionObserver((entries) => {
        entries.forEach((e) => logos.classList.toggle('is-paused', !e.isIntersecting));
      }, { threshold: 0 });
      pause.observe(logos);
    }
  }

  /* Footer year ---------------------------------------------------------- */
  const year = document.getElementById('year');
  if (year) year.textContent = new Date().getFullYear();

  /* Contact form ----------------------------------------------------------
     Posts to the form handler and only confirms once the handler has
     actually accepted it. A failure must say so and hand back a route that
     works, never a thank-you for an enquiry that went nowhere. */
  document.querySelectorAll('.form').forEach((form) => {
    const note = form.querySelector('.form-note');
    const button = form.querySelector('button[type="submit"]');
    const restingNote = note ? note.innerHTML : '';
    let sending = false;

    const setNote = (html, state) => {
      if (!note) return;
      note.innerHTML = html;
      note.classList.toggle('is-ok', state === 'ok');
      note.classList.toggle('is-error', state === 'error');
    };

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (sending) return;

      sending = true;
      const label = button ? button.textContent : '';
      if (button) { button.disabled = true; button.textContent = 'Sending…'; }
      setNote('Sending your enquiry…', null);

      try {
        const response = await fetch(form.action, {
          method: 'POST',
          headers: { Accept: 'application/json' },
          body: new FormData(form)
        });
        const result = await response.json().catch(() => ({}));

        if (!response.ok || result.success === false) {
          throw new Error(result.message || 'Request failed: ' + response.status);
        }

        form.reset();

        /* A confirmation the visitor can be sent to, bookmark and come back
           to beats a line of green text that vanishes on the next scroll —
           and it gives analytics a single URL that means "enquiry sent".
           The inline note is still set first, so the confirmation is already
           on screen if the navigation is slow or is blocked outright. A form
           that should confirm in place instead opts out with
           data-thanks="none". */
        setNote('Thank you — your enquiry has been sent. We will be in touch shortly.', 'ok');

        if (form.dataset.thanks !== 'none') {
          window.location.assign('thank-you.html');
        }
      } catch (error) {
        setNote(
          'Sorry, your enquiry could not be sent. Please call ' +
          '<a href="tel:+250788303184">+250 788 303 184</a> or email ' +
          '<a href="mailto:info@sezibera.com">info@sezibera.com</a>.',
          'error'
        );
      } finally {
        sending = false;
        if (button) { button.disabled = false; button.textContent = label; }
      }
    });

    // Restore the resting hint once the visitor starts a fresh enquiry
    form.addEventListener('input', () => {
      if (note && note.classList.contains('is-ok')) setNote(restingNote, null);
    });
  });
});
