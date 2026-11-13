(() => {
  'use strict';
  const body = document.body;
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  // The invitation always starts at the top after a reload. No remembered "opened" state.
  if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
  window.scrollTo(0, 0);

  const openButton = document.getElementById('openInvitation');
  const openingCover = document.getElementById('openingCover');
  const siteShell = document.getElementById('siteShell');
  if (openButton && openingCover && siteShell) {
    openButton.addEventListener('click', () => {
      body.classList.add('invitation-open');
      openingCover.setAttribute('aria-hidden', 'true');
      siteShell.setAttribute('aria-hidden', 'false');
      window.scrollTo(0, 0);
      siteShell.querySelectorAll('.reveal').forEach(node => node.classList.add('visible'));
    });
  } else {
    body.classList.add('invitation-open');
    siteShell?.setAttribute('aria-hidden', 'false');
  }

  // Mobile navigation.
  const menuToggle = document.getElementById('menuToggle');
  const siteNav = document.getElementById('siteNav');
  menuToggle?.addEventListener('click', () => {
    const open = siteNav?.classList.toggle('open') ?? false;
    menuToggle.setAttribute('aria-expanded', String(open));
    menuToggle.setAttribute('aria-label', open ? 'Close navigation' : 'Open navigation');
  });
  siteNav?.querySelectorAll('a').forEach(link => link.addEventListener('click', () => {
    siteNav.classList.remove('open');
    menuToggle?.setAttribute('aria-expanded', 'false');
  }));

  // Scroll reveals. Text remains real DOM text and can be selected/copied.
  const reveals = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window && !reducedMotion) {
    const observer = new IntersectionObserver((entries, obs) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          obs.unobserve(entry.target);
        }
      });
    }, {threshold: 0.12, rootMargin: '0px 0px -35px 0px'});
    reveals.forEach(node => observer.observe(node));
  } else {
    reveals.forEach(node => node.classList.add('visible'));
  }

  // Wedding countdown (IST, using the scheduled Haldi start).
  const countdown = document.getElementById('countdownClock');
  const weddingStart = new Date('2027-02-02T14:00:00+05:30').getTime();
  function updateCountdown() {
    if (!countdown) return;
    const time = Math.max(0, weddingStart - Date.now());
    const values = {
      days: Math.floor(time / 86400000),
      hours: Math.floor((time % 86400000) / 3600000),
      minutes: Math.floor((time % 3600000) / 60000),
      seconds: Math.floor((time % 60000) / 1000)
    };
    Object.entries(values).forEach(([key, value]) => {
      const node = countdown.querySelector('[data-unit="' + key + '"]');
      if (node) node.textContent = String(value).padStart(2, '0');
    });
  }
  updateCountdown();
  if (countdown) window.setInterval(updateCountdown, 1000);

  // Original soft ambient notes generated locally using Web Audio. Sound only starts
  // after an explicit tap, and the same control is included on every page.
  const soundButton = document.getElementById('soundToggle');
  const soundText = document.getElementById('soundLabel');
  let audioContext = null;
  let master = null;
  let phraseTimer = null;
  let soundOn = false;
  let phrasePosition = 0;
  const chords = [
    [146.83, 220.00, 293.66, 369.99],
    [130.81, 196.00, 261.63, 329.63],
    [110.00, 164.81, 220.00, 293.66],
    [123.47, 185.00, 246.94, 311.13]
  ];
  function note(freq, start, duration, level) {
    const oscillator = audioContext.createOscillator();
    const envelope = audioContext.createGain();
    const filter = audioContext.createBiquadFilter();
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(freq, start);
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(1450, start);
    envelope.gain.setValueAtTime(0.0001, start);
    envelope.gain.exponentialRampToValueAtTime(level, start + 0.05);
    envelope.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    oscillator.connect(filter);
    filter.connect(envelope);
    envelope.connect(master);
    oscillator.start(start);
    oscillator.stop(start + duration + 0.05);
  }
  function playPhrase() {
    if (!audioContext || !soundOn) return;
    const chord = chords[Math.floor(phrasePosition / 4) % chords.length];
    const now = audioContext.currentTime;
    note(chord[phrasePosition % 4] * 2, now, 3.2, 0.042);
    if (phrasePosition % 4 === 0) {
      note(chord[0], now, 6.2, 0.024);
      note(chord[2], now + 0.035, 5.3, 0.018);
    }
    if (phrasePosition % 4 === 2) note(chord[1] * 2, now + 0.18, 2.6, 0.012);
    phrasePosition += 1;
    phraseTimer = window.setTimeout(playPhrase, 1450);
  }
  async function toggleSound() {
    try {
      if (!audioContext) {
        const AudioContextClass = window.AudioContext || window.webkitAudioContext;
        if (!AudioContextClass) throw new Error('Audio is not supported in this browser.');
        audioContext = new AudioContextClass();
        master = audioContext.createGain();
        master.gain.value = 0;
        master.connect(audioContext.destination);
      }
      if (soundOn) {
        soundOn = false;
        window.clearTimeout(phraseTimer);
        master.gain.setTargetAtTime(0, audioContext.currentTime, 0.25);
        soundButton?.setAttribute('aria-pressed', 'false');
        soundButton?.setAttribute('aria-label', 'Turn ambient music on');
        if (soundText) soundText.textContent = 'SOUND OFF';
      } else {
        await audioContext.resume();
        soundOn = true;
        master.gain.setTargetAtTime(0.32, audioContext.currentTime, 0.35);
        soundButton?.setAttribute('aria-pressed', 'true');
        soundButton?.setAttribute('aria-label', 'Turn ambient music off');
        if (soundText) soundText.textContent = 'SOUND ON';
        playPhrase();
      }
    } catch (error) {
      if (soundText) soundText.textContent = 'AUDIO UNAVAILABLE';
      console.warn('Could not start the ambient score:', error);
    }
  }
  soundButton?.addEventListener('click', toggleSound);

  // Mark the current event page in the shared navigation.
  const currentPage = body.dataset.page;
  if (currentPage) {
    document.querySelectorAll('[data-page-link]').forEach(link => {
      if (link.dataset.pageLink === currentPage) link.classList.add('active');
    });
  }
})();