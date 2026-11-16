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

  // The YouTube iframe is placed in the initial HTML so its muted stream can
  // begin loading immediately, without waiting for the IFrame API JavaScript.
  // Audible autoplay is still subject to each browser's user-gesture policy.
  const soundButton = document.getElementById('soundToggle');
  const soundLabel = document.getElementById('soundLabel');
  const playerFrame = document.getElementById('youtubePlayer');
  let soundOn = false;
  let userHasInteracted = false;

  function updateSound(on, label = on ? 'SOUND ON' : 'TAP FOR MUSIC') {
    soundOn = on;
    soundButton?.setAttribute('aria-pressed', String(on));
    soundButton?.setAttribute('aria-label', on ? 'Turn wedding music off' : 'Turn wedding music on');
    if (soundLabel) soundLabel.textContent = label;
  }

  function sendPlayerCommand(func, args = []) {
    if (!playerFrame?.contentWindow) return;
    const message = JSON.stringify({ event: 'command', func, args });
    try { playerFrame.contentWindow.postMessage(message, 'https://www.youtube.com'); } catch (_) {}
  }

  function sendPlayerCommands(commands) {
    // Retry briefly because the iframe's document load can precede the player
    // API becoming ready to receive commands.
    [0, 250, 700, 1400].forEach(delay => {
      window.setTimeout(() => {
        commands.forEach(([func, args = []]) => sendPlayerCommand(func, args));
      }, delay);
    });
  }

  function startMusicFromGesture() {
    userHasInteracted = true;
    sendPlayerCommands([
      ['setVolume', [58]],
      ['unMute'],
      ['playVideo']
    ]);
    updateSound(true, 'SOUND ON');
  }

  function stopMusic() {
    sendPlayerCommands([['mute']]);
    updateSound(false, 'MUSIC OFF');
  }

  function toggleMusic() {
    if (soundOn) stopMusic();
    else startMusicFromGesture();
  }

  soundButton?.addEventListener('click', toggleMusic);

  // The iframe URL itself requests muted autoplay as soon as HTML is parsed.
  // On load, reinforce playback; if the guest already interacted, start audibly.
  playerFrame?.addEventListener('load', () => {
    if (userHasInteracted) {
      startMusicFromGesture();
    } else {
      sendPlayerCommands([['mute'], ['playVideo']]);
      updateSound(false, 'TAP FOR MUSIC');
    }
  });

  // Remember the first tap anywhere on the invitation, even if the YouTube
  // iframe is still warming up. The first tap on the music button is handled
  // by its own click handler, so it won't immediately toggle back off.
  function enableOnFirstInteraction(event) {
    if (soundOn || soundButton?.contains(event.target)) return;
    userHasInteracted = true;
    startMusicFromGesture();
    document.removeEventListener('pointerdown', enableOnFirstInteraction, true);
    document.removeEventListener('keydown', enableOnFirstInteraction, true);
  }
  document.addEventListener('pointerdown', enableOnFirstInteraction, true);
  document.addEventListener('keydown', enableOnFirstInteraction, true);

  updateSound(false, 'TAP FOR MUSIC');


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
