(() => {
  'use strict';
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Always begin at the invitation cover on a full refresh.
  if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
  if (performance.getEntriesByType('navigation')[0]?.type === 'reload' && location.hash) {
    history.replaceState(null, '', location.pathname + location.search);
  }
  window.scrollTo(0, 0);

  // Mobile navigation stays in this page, so music does not restart between events.
  const menuToggle = document.getElementById('menuToggle');
  const siteNav = document.getElementById('siteNav');
  menuToggle?.addEventListener('click', () => {
    const opened = siteNav.classList.toggle('open');
    menuToggle.setAttribute('aria-expanded', String(opened));
    menuToggle.setAttribute('aria-label', opened ? 'Close navigation' : 'Open navigation');
  });
  siteNav?.querySelectorAll('a').forEach(link => link.addEventListener('click', () => {
    siteNav.classList.remove('open');
    menuToggle?.setAttribute('aria-expanded', 'false');
  }));

  // Keep the white monogram over the cover, then crossfade to the primary logo on scroll.
  const siteHeader = document.getElementById('siteHeader');
  const syncHeaderLogo = () => {
    if (!siteHeader) return;
    siteHeader.classList.toggle('is-scrolled', window.scrollY > 72);
  };
  syncHeaderLogo();
  window.addEventListener('scroll', syncHeaderLogo, { passive: true });


  // Accessible day tabs for the horizontal celebration timelines.
  const dayTabs = [...document.querySelectorAll('.day-tab')];
  const dayPanels = [...document.querySelectorAll('.day-panel')];
  function activateDayTab(index, moveFocus = false) {
    dayTabs.forEach((tab, i) => {
      const active = i === index;
      tab.classList.toggle('is-active', active);
      tab.setAttribute('aria-selected', String(active));
      tab.tabIndex = active ? 0 : -1;
    });
    dayPanels.forEach((panel, i) => {
      const active = i === index;
      panel.classList.toggle('is-active', active);
      panel.hidden = !active;
    });
    if (moveFocus) dayTabs[index]?.focus();
  }
  dayTabs.forEach((tab, index) => {
    tab.addEventListener('click', () => activateDayTab(index));
    tab.addEventListener('keydown', event => {
      if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
      event.preventDefault();
      const next = event.key === 'ArrowRight' ? (index + 1) % dayTabs.length :
        event.key === 'ArrowLeft' ? (index - 1 + dayTabs.length) % dayTabs.length :
        event.key === 'Home' ? 0 : dayTabs.length - 1;
      activateDayTab(next, true);
    });
  });

  // Countdown to the first celebration.
  const countdown = document.getElementById('countdownClock');
  const startAt = new Date('2027-02-02T14:00:00+05:30').getTime();
  function updateCountdown() {
    if (!countdown) return;
    const remaining = Math.max(0, startAt - Date.now());
    const values = {
      days: Math.floor(remaining / 86400000),
      hours: Math.floor((remaining % 86400000) / 3600000),
      minutes: Math.floor((remaining % 3600000) / 60000),
      seconds: Math.floor((remaining % 60000) / 1000)
    };
    Object.entries(values).forEach(([unit, value]) => {
      const node = countdown.querySelector(`[data-unit="${unit}"]`);
      if (node) node.textContent = String(value).padStart(2, '0');
    });
  }
  updateCountdown();
  if (countdown) window.setInterval(updateCountdown, 1000);

  // Self-hosted wedding soundtrack. Attempt autoplay, then use the first
  // trusted touch/pointer/click/key interaction to unmute or start playback.
  // Keep the gesture listeners until playback succeeds: on mobile, a pointerdown
  // attempt can be rejected before the later touchend/click event is dispatched.
  const soundButton = document.getElementById('soundToggle');
  const soundLabel = document.getElementById('soundLabel');
  const weddingAudio = document.getElementById('weddingAudio');
  let soundOn = false;
  let intentionallyPaused = false;
  let gestureAttemptInFlight = false;

  function updateSound(on, label) {
    soundOn = on;
    soundButton?.setAttribute('aria-pressed', String(on));
    soundButton?.setAttribute('aria-label', on ? 'Pause wedding music' : 'Play wedding music');
    if (soundLabel) soundLabel.textContent = label || (on ? (weddingAudio?.muted ? 'MUSIC PLAYING · MUTED' : 'MUSIC ON') : 'MUSIC OFF');
  }

  if (weddingAudio) {
    weddingAudio.volume = 0.58;
    weddingAudio.addEventListener('play', () => {
      updateSound(true, weddingAudio.muted ? 'MUSIC PLAYING · MUTED' : 'MUSIC ON');
    });
    weddingAudio.addEventListener('volumechange', () => {
      if (!weddingAudio.paused) updateSound(true, weddingAudio.muted ? 'MUSIC PLAYING · MUTED' : 'MUSIC ON');
    });
    weddingAudio.addEventListener('pause', () => {
      if (intentionallyPaused) updateSound(false, 'MUSIC OFF');
    });
    weddingAudio.addEventListener('error', () => updateSound(false, 'MUSIC UNAVAILABLE'));
  }

  async function playWeddingMusic({ userGesture = false } = {}) {
    if (!weddingAudio) return false;
    intentionallyPaused = false;
    if (userGesture) weddingAudio.muted = false;

    try {
      // Call play() synchronously inside the trusted input event's call stack.
      const playRequest = weddingAudio.play();
      await playRequest;
      updateSound(true, weddingAudio.muted ? 'MUSIC PLAYING · MUTED' : 'MUSIC ON');
      return true;
    } catch (error) {
      if (!userGesture && error?.name === 'NotAllowedError') {
        // If audible autoplay is denied, still start the track muted where
        // supported. A later trusted mobile gesture will unmute it.
        weddingAudio.muted = true;
        try {
          await weddingAudio.play();
          updateSound(true, 'MUSIC PLAYING · MUTED');
          return true;
        } catch (_) {
          updateSound(false, 'TAP FOR MUSIC');
          return false;
        }
      }
      updateSound(false, error?.name === 'NotAllowedError' ? 'TAP FOR MUSIC' : 'MUSIC LOADING');
      return false;
    }
  }

  function removeMusicGestureListeners() {
    ['pointerdown', 'touchstart', 'touchend', 'click', 'keydown'].forEach(type => {
      document.removeEventListener(type, enableMusicOnFirstInteraction, true);
    });
  }

  function enableMusicOnFirstInteraction(event) {
    if (!event.isTrusted || !weddingAudio) return;
    // The music control owns its own click handler, so do not toggle it twice.
    if (soundButton?.contains(event.target)) return;
    if (!weddingAudio.paused && !weddingAudio.muted) {
      removeMusicGestureListeners();
      return;
    }
    if (gestureAttemptInFlight) return;

    gestureAttemptInFlight = true;
    // This is deliberately called directly from touchstart/touchend/pointerdown/
    // click, without timers, so mobile browsers can recognise the user gesture.
    playWeddingMusic({ userGesture: true }).then(success => {
      gestureAttemptInFlight = false;
      if (success && !weddingAudio.muted && !weddingAudio.paused) {
        removeMusicGestureListeners();
      }
    });
  }

  function toggleMusic() {
    if (!weddingAudio) return;
    if (weddingAudio.paused || weddingAudio.muted) {
      playWeddingMusic({ userGesture: true });
    } else {
      intentionallyPaused = true;
      weddingAudio.pause();
      updateSound(false, 'MUSIC OFF');
    }
  }

  soundButton?.addEventListener('click', toggleMusic);

  // Start loading/playing immediately; the MP3 is also preloaded in the HTML.
  playWeddingMusic();

  // Mobile browsers dispatch touch events in addition to pointer/click events.
  // Keep all fallbacks active until one gesture successfully starts audible audio.
  ['pointerdown', 'touchstart', 'touchend', 'click', 'keydown'].forEach(type => {
    document.addEventListener(type, enableMusicOnFirstInteraction, true);
  });

  updateSound(false, 'LOADING MUSIC');


  // Reveal event and venue bands gently as guests scroll through the invitation.
  const revealItems = [...document.querySelectorAll('.reveal-section')];
  if ('IntersectionObserver' in window && !reducedMotion) {
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.14, rootMargin: '0px 0px -40px 0px' });
    revealItems.forEach(item => observer.observe(item));
  } else {
    revealItems.forEach(item => item.classList.add('is-visible'));
  }

  // Submit RSVP to the Google Apps Script endpoint through a hidden iframe.
  const form = document.getElementById('rsvpForm');
  if (form) {
    const guestField = document.getElementById('guestField');
    const guestCount = document.getElementById('guestCount');
    const feedback = document.getElementById('rsvpFeedback');
    const submitButton = form.querySelector('.submit-rsvp');
    const submitFrame = document.getElementById('rsvpSubmitFrame');
    // Keep a reference to the target iframe; its load event is useful for diagnostics.
    const submissionIdField = document.getElementById('rsvpSubmissionId');
    const attendanceInputs = [...form.querySelectorAll('input[name="attendance"]')];
    let pendingSubmissionId = null;
    let submissionTimeout = null;
    const submissionTimeoutMs = 20000;
    function syncGuests() {
      const decline = form.querySelector('input[name="attendance"]:checked')?.value === 'decline';
      guestField.hidden = decline;
      guestCount.disabled = decline;
      if (decline) guestCount.value = '1';
    }
    let feedbackTimeout = null;
    function showFeedback(message, isError = false, autoDismissMs = 0) {
      window.clearTimeout(feedbackTimeout);
      feedback.hidden = false;
      feedback.textContent = message;
      feedback.classList.toggle('is-error', isError);
      feedback.scrollIntoView({ behavior: reducedMotion ? 'auto' : 'smooth', block: 'nearest' });
      if (autoDismissMs > 0) {
        feedbackTimeout = window.setTimeout(() => {
          feedback.hidden = true;
          feedback.textContent = '';
          feedback.classList.remove('is-error');
        }, autoDismissMs);
      }
    }
    function makeSubmissionId() {
      return window.crypto?.randomUUID
        ? window.crypto.randomUUID()
        : 'rsvp-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2);
    }
    const nameInput = form.querySelector('[name="name"]');
    // Strip digits and other non-letter characters as the guest types or pastes.
    nameInput?.addEventListener('input', () => {
      nameInput.value = nameInput.value.replace(/[^\p{L}\s'-]/gu, '');
    });
    attendanceInputs.forEach(input => input.addEventListener('change', syncGuests));
    syncGuests();
    form.addEventListener('submit', event => {
      event.preventDefault();
      if (!form.reportValidity()) return;
      const endpoint = String(window.RSVP_CONFIG?.endpoint || '').trim();
      if (!/^https:\/\/script\.google\.com\/macros\/s\/[A-Za-z0-9_-]+\/exec$/.test(endpoint)) {
        showFeedback('RSVP submissions are not connected yet. Please check back soon.', true);
        return;
      }
      const attendance = form.querySelector('input[name="attendance"]:checked')?.value;
      if (!form.querySelector('[name="name"]').value.trim() ||
          !form.querySelector('[name="title"]').value ||
          !['accept', 'decline'].includes(attendance)) {
        showFeedback('Please complete the required RSVP details.', true);
        return;
      }
      // Keep the same ID when retrying after a timeout so a late Apps Script
      // response cannot create a second row for the same form submission.
      if (!pendingSubmissionId) pendingSubmissionId = makeSubmissionId();
      submissionIdField.value = pendingSubmissionId;
      form.action = endpoint;
      submitButton.disabled = true;
      submitButton.textContent = 'SUBMITTING RSVP…';
      feedback.hidden = true;
      window.clearTimeout(feedbackTimeout);
      window.clearTimeout(submissionTimeout);
      submissionTimeout = window.setTimeout(() => {
        if (!pendingSubmissionId) return;
        submitButton.disabled = false;
        submitButton.innerHTML = 'SUBMIT RSVP <span>↗</span>';
        showFeedback('We could not confirm the response from Google Sheets. Please try again; your submission will keep the same reference to prevent duplicate entries.', true);
      }, submissionTimeoutMs);
      HTMLFormElement.prototype.submit.call(form);
    });
    window.addEventListener('message', event => {
      // Apps Script may deliver its HTMLService response from a sandboxed
      // googleusercontent frame whose origin is opaque ("null"). Authenticate
      // the response with the unpredictable per-submission ID instead.
      let result = event.data;
      if (typeof result === 'string') {
        try { result = JSON.parse(result); } catch (_) { return; }
      }
      if (!result || result.type !== 'wedding-rsvp-result' ||
          !pendingSubmissionId || result.submissionId !== pendingSubmissionId) return;

      window.clearTimeout(submissionTimeout);
      submitButton.disabled = false;
      submitButton.innerHTML = 'SUBMIT RSVP <span>↗</span>';
      if (result.ok) {
        const name = form.querySelector('[name="title"]').value + ' ' +
          form.querySelector('[name="name"]').value.trim();
        showFeedback('Thank you, ' + name + '. Your RSVP has been received successfully.', false, 6000);
        form.reset();
        syncGuests();
        pendingSubmissionId = null;
        submissionIdField.value = '';
      } else {
        // Keep the submission ID so a retry is idempotent if the write succeeded
        // but the response was interrupted.
        showFeedback(result.message || 'We could not save your RSVP. Please try again.', true);
      }
    });
  }
})();
