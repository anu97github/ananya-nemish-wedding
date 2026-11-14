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

  // Official soundtrack. Audio begins only after the visitor taps the sound control.
  // The YouTube player is kept out of the visual layout; no pop-up or player panel appears.
  const soundButton = document.getElementById('soundToggle');
  const soundLabel = document.getElementById('soundLabel');
  let player = null;
  let playerReady = false;
  let apiLoading = false;
  let wantsAudio = false;
  let soundOn = false;
  const trackId = '-2w18bd-ZQ4';
  function updateSound(on, label = on ? 'SOUND ON' : 'SOUND OFF') {
    soundOn = on;
    soundButton?.setAttribute('aria-pressed', String(on));
    soundButton?.setAttribute('aria-label', on ? 'Turn wedding music off' : 'Turn wedding music on');
    if (soundLabel) soundLabel.textContent = label;
  }
  function createPlayer() {
    if (player || !window.YT?.Player) return;
    player = new window.YT.Player('youtubePlayer', {
      width: '200', height: '200', videoId: trackId,
      playerVars: { autoplay: 0, controls: 0, playsinline: 1, rel: 0, modestbranding: 1, loop: 1, playlist: trackId },
      events: {
        onReady: event => {
          playerReady = true;
          event.target.setVolume(58);
          if (wantsAudio) {
            try { event.target.unMute(); event.target.playVideo(); }
            catch (_) { updateSound(false, 'SOUND OFF'); }
          }
        },
        onStateChange: event => {
          if (event.data === window.YT.PlayerState.PLAYING) updateSound(true);
          if (event.data === window.YT.PlayerState.PAUSED || event.data === window.YT.PlayerState.ENDED) updateSound(false);
        },
        onError: () => { wantsAudio = false; updateSound(false, 'AUDIO UNAVAILABLE'); }
      }
    });
  }
  function loadPlayer() {
    if (window.YT?.Player) { createPlayer(); return; }
    if (apiLoading) return;
    apiLoading = true;
    window.onYouTubeIframeAPIReady = createPlayer;
    const script = document.createElement('script');
    script.src = 'https://www.youtube.com/iframe_api';
    script.async = true;
    script.onerror = () => { apiLoading = false; updateSound(false, 'AUDIO UNAVAILABLE'); };
    document.head.appendChild(script);
  }
  soundButton?.addEventListener('click', () => {
    if (wantsAudio || soundOn) {
      wantsAudio = false;
      try { player?.pauseVideo(); } catch (_) {}
      updateSound(false);
      return;
    }
    wantsAudio = true;
    updateSound(false, 'LOADING');
    loadPlayer();
    if (playerReady && player) {
      try { player.unMute(); player.playVideo(); }
      catch (_) { updateSound(false, 'SOUND OFF'); }
    }
  });
  // Prepare the silent player early so a tap can start playback in the same gesture.
  loadPlayer();


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
