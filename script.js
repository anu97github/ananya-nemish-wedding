(() => {
  const body = document.body;
  const prelude = document.getElementById('prelude');
  const invitation = document.getElementById('invitation');
  const openButton = document.getElementById('openInvite');
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // A restrained drift of petals; no external image assets are needed.
  const petalField = document.getElementById('petalField');
  if (petalField && !reduceMotion) {
    for (let i = 0; i < 15; i++) {
      const petal = document.createElement('span');
      petal.className = 'petal';
      petal.style.setProperty('--left', String((i * 37 + 11) % 100) + '%');
      petal.style.setProperty('--duration', String(18 + (i % 7) * 3) + 's');
      petal.style.setProperty('--delay', String(-(i * 2.1)) + 's');
      petal.style.setProperty('--sway', String((i % 2 ? 1 : -1) * (35 + i * 5)) + 'px');
      petal.style.setProperty('--rotation', String(i * 29) + 'deg');
      petalField.appendChild(petal);
    }
  }

  function openInvitation() {
    body.classList.add('opening');
    body.classList.remove('prelude');
    invitation.setAttribute('aria-hidden', 'false');
    window.setTimeout(() => {
      invitation.classList.add('ready');
      document.querySelectorAll('#home .reveal').forEach(node => node.classList.add('visible'));
      prelude?.setAttribute('aria-hidden', 'true');
      document.getElementById('home')?.focus({preventScroll:true});
    }, reduceMotion ? 0 : 800);
  }
  openButton?.addEventListener('click', openInvitation);

  // Mobile navigation closes after selecting a section.
  const menuToggle = document.getElementById('menuToggle');
  const siteNav = document.getElementById('siteNav');
  menuToggle?.addEventListener('click', () => {
    const isOpen = siteNav.classList.toggle('open');
    menuToggle.setAttribute('aria-expanded', String(isOpen));
    menuToggle.setAttribute('aria-label', isOpen ? 'Close navigation' : 'Open navigation');
  });
  siteNav?.querySelectorAll('a').forEach(link => link.addEventListener('click', () => {
    siteNav.classList.remove('open');
    menuToggle?.setAttribute('aria-expanded', 'false');
  }));

  // Scroll reveals; graceful fallback for browsers without IntersectionObserver.
  const revealNodes = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window && !reduceMotion) {
    const observer = new IntersectionObserver((entries, obs) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          obs.unobserve(entry.target);
        }
      });
    }, {threshold: 0.14, rootMargin: '0px 0px -35px 0px'});
    revealNodes.forEach(node => observer.observe(node));
  } else {
    revealNodes.forEach(node => node.classList.add('visible'));
  }

  // Countdown to the first celebration's scheduled start, India Standard Time.
  const weddingStart = new Date('2027-02-02T14:00:00+05:30').getTime();
  const clock = document.getElementById('countdownClock');
  function updateCountdown() {
    if (!clock) return;
    const remaining = Math.max(0, weddingStart - Date.now());
    const units = {
      days: Math.floor(remaining / 86400000),
      hours: Math.floor((remaining % 86400000) / 3600000),
      minutes: Math.floor((remaining % 3600000) / 60000),
      seconds: Math.floor((remaining % 60000) / 1000)
    };
    Object.entries(units).forEach(([unit, value]) => {
      const node = clock.querySelector('[data-unit="' + unit + '"]');
      if (node) node.textContent = String(value).padStart(2, '0');
    });
  }
  updateCountdown();
  window.setInterval(updateCountdown, 1000);

  // Original ambient score synthesised in the browser; no commercial recording.
  // It starts only after a guest taps the sound control.
  const soundToggle = document.getElementById('soundToggle');
  const soundLabel = document.getElementById('soundLabel');
  let audioContext = null;
  let masterGain = null;
  let melodyTimer = null;
  let audioOn = false;
  let noteIndex = 0;
  const progression = [
    [146.83, 220.00, 293.66, 369.99],
    [123.47, 185.00, 246.94, 293.66],
    [98.00, 146.83, 196.00, 246.94],
    [110.00, 164.81, 220.00, 277.18]
  ];

  function pluck(frequency, when, duration, volume) {
    const oscillator = audioContext.createOscillator();
    const gain = audioContext.createGain();
    const filter = audioContext.createBiquadFilter();
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(frequency, when);
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(1800, when);
    gain.gain.setValueAtTime(0.0001, when);
    gain.gain.exponentialRampToValueAtTime(volume, when + 0.035);
    gain.gain.exponentialRampToValueAtTime(0.0001, when + duration);
    oscillator.connect(filter);
    filter.connect(gain);
    gain.connect(masterGain);
    oscillator.start(when);
    oscillator.stop(when + duration + 0.05);
  }

  function playPhrase() {
    if (!audioContext || !audioOn) return;
    const chord = progression[Math.floor(noteIndex / 4) % progression.length];
    const tone = chord[noteIndex % 4];
    const now = audioContext.currentTime;
    pluck(tone * 2, now, 2.8, 0.045);
    if (noteIndex % 4 === 0) {
      pluck(chord[0], now, 5.8, 0.025);
      pluck(chord[2], now + 0.03, 5.1, 0.018);
    }
    noteIndex += 1;
    melodyTimer = window.setTimeout(playPhrase, 1350);
  }

  async function toggleSound() {
    try {
      if (!audioContext) {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (!AudioCtx) throw new Error('Audio is not supported in this browser.');
        audioContext = new AudioCtx();
        masterGain = audioContext.createGain();
        masterGain.gain.value = 0.32;
        masterGain.connect(audioContext.destination);
      }
      if (audioOn) {
        audioOn = false;
        window.clearTimeout(melodyTimer);
        masterGain.gain.setTargetAtTime(0, audioContext.currentTime, 0.25);
        soundToggle?.setAttribute('aria-pressed', 'false');
        if (soundLabel) soundLabel.textContent = 'SOUND OFF';
      } else {
        await audioContext.resume();
        audioOn = true;
        masterGain.gain.setTargetAtTime(1, audioContext.currentTime, 0.3);
        soundToggle?.setAttribute('aria-pressed', 'true');
        if (soundLabel) soundLabel.textContent = 'SOUND ON';
        playPhrase();
      }
    } catch (error) {
      if (soundLabel) soundLabel.textContent = 'AUDIO UNAVAILABLE';
      console.warn('Ambient score could not start:', error);
    }
  }
  soundToggle?.addEventListener('click', toggleSound);
})();