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

  // RSVP front-end preview. It validates and confirms the form, but does not transmit data.
  const form = document.getElementById('rsvpForm');
  if (form) {
    const guestField = document.getElementById('guestField');
    const guestCount = document.getElementById('guestCount');
    const feedback = document.getElementById('rsvpFeedback');
    const attendanceInputs = [...form.querySelectorAll('input[name="attendance"]')];
    function syncGuests() {
      const selected = form.querySelector('input[name="attendance"]:checked')?.value;
      const decline = selected === 'decline';
      guestField.hidden = decline;
      guestCount.disabled = decline;
      if (decline) guestCount.value = '1';
    }
    attendanceInputs.forEach(input => input.addEventListener('change', syncGuests));
    syncGuests();
    form.addEventListener('submit', event => {
      event.preventDefault();
      if (!form.reportValidity()) return;
      const details = new FormData(form);
      const honorific = String(details.get('title') || '');
      const fullName = String(details.get('name') || '').trim();
      const accepts = details.get('attendance') === 'accept';
      const guests = Number(details.get('guestCount') || 1);
      feedback.hidden = false;
      feedback.textContent = accepts
        ? `Thank you, ${honorific} ${fullName}. Your RSVP preview shows ${guests} ${guests === 1 ? 'guest' : 'guests'} attending. This has not been saved yet.`
        : `Thank you, ${honorific} ${fullName}. Your RSVP preview is marked as regretfully declining. This has not been saved yet.`;
      form.querySelector('.submit-rsvp').textContent = 'RSVP PREVIEW COMPLETE';
      feedback.scrollIntoView({ behavior: reducedMotion ? 'auto' : 'smooth', block: 'nearest' });
    });
  }
})();
