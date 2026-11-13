(() => {
  'use strict';
  const body = document.body;
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Always return to the opening frame after a full reload.
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

  // Scroll reveals. Every phrase remains selectable HTML text.
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

  // Countdown to the first celebration (2 February 2027, 2 PM IST).
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

  // Official Jashn-E-Bahaaraa (Instrumental - Flute) player.
  // We embed the official YouTube release; the recording is not copied/re-hosted.
  const soundButton = document.getElementById('soundToggle');
  const soundLabel = document.getElementById('soundLabel');
  const musicPanel = document.getElementById('musicPanel');
  const closeMusic = document.getElementById('closeMusic');
  let ytPlayer = null;
  let ytApiLoading = false;
  let ytPlayerReady = false;
  let wantsPlayback = false;
  let soundOn = false;
  function setSoundUI(on, label) {
    soundOn = on;
    soundButton?.setAttribute('aria-pressed', String(on));
    soundButton?.setAttribute('aria-expanded', String(!musicPanel?.hidden));
    soundButton?.setAttribute('aria-label', on ? 'Pause Jashn-E-Bahaaraa' : 'Play Jashn-E-Bahaaraa');
    if (soundLabel) soundLabel.textContent = label || (on ? 'SOUND ON' : 'SOUND OFF');
  }
  function initialiseYouTubePlayer() {
    if (ytPlayer || !window.YT || !window.YT.Player) return;
    const mount = document.getElementById('youtubePlayer');
    if (!mount) return;
    ytPlayer = new window.YT.Player('youtubePlayer', {
      width: '280',
      height: '200',
      videoId: '-2w18bd-ZQ4',
      playerVars: {
        autoplay: 0,
        controls: 1,
        playsinline: 1,
        rel: 0,
        modestbranding: 1,
        loop: 1,
        playlist: '-2w18bd-ZQ4',
        enablejsapi: 1
      },
      events: {
        onReady: event => {
          ytPlayerReady = true;
          event.target.setVolume(62);
          if (wantsPlayback) {
            try {
              event.target.unMute();
              event.target.playVideo();
            } catch (error) {
              setSoundUI(false, 'TAP PLAY BELOW');
            }
          }
        },
        onStateChange: event => {
          if (event.data === window.YT.PlayerState.PLAYING) {
            wantsPlayback = true;
            setSoundUI(true, 'SOUND ON');
          } else if (event.data === window.YT.PlayerState.PAUSED || event.data === window.YT.PlayerState.ENDED) {
            wantsPlayback = false;
            setSoundUI(false, 'SOUND OFF');
          }
        },
        onError: () => {
          wantsPlayback = false;
          setSoundUI(false, 'OPEN TRACK');
          const fallback = document.getElementById('musicFallback');
          if (fallback) fallback.hidden = false;
        }
      }
    });
  }
  function loadYouTubeAPI() {
    if (window.YT && window.YT.Player) {
      initialiseYouTubePlayer();
      return;
    }
    if (ytApiLoading) return;
    ytApiLoading = true;
    window.onYouTubeIframeAPIReady = initialiseYouTubePlayer;
    const existing = document.querySelector('script[src="https://www.youtube.com/iframe_api"]');
    if (!existing) {
      const tag = document.createElement('script');
      tag.src = 'https://www.youtube.com/iframe_api';
      tag.async = true;
      tag.onerror = () => {
        ytApiLoading = false;
        setSoundUI(false, 'OPEN TRACK');
        const fallback = document.getElementById('musicFallback');
        if (fallback) fallback.hidden = false;
      };
      document.head.appendChild(tag);
    }
  }
  soundButton?.addEventListener('click', () => {
    if (soundOn || wantsPlayback) {
      wantsPlayback = false;
      try { ytPlayer?.pauseVideo(); } catch (_) {}
      setSoundUI(false, 'SOUND OFF');
      return;
    }
    if (musicPanel) musicPanel.hidden = false;
    setSoundUI(false, 'LOADING');
    wantsPlayback = true;
    loadYouTubeAPI();
    if (ytPlayerReady && ytPlayer) {
      try {
        ytPlayer.unMute();
        ytPlayer.playVideo();
      } catch (error) {
        setSoundUI(false, 'TAP PLAY BELOW');
      }
    }
  });
  closeMusic?.addEventListener('click', () => {
    wantsPlayback = false;
    try { ytPlayer?.pauseVideo(); } catch (_) {}
    if (musicPanel) musicPanel.hidden = true;
    setSoundUI(false, 'SOUND OFF');
  });

  // RSVP preview: validates the minimal fields and confirms locally only.
  // No response is transmitted or stored until a database/Sheets endpoint is added.
  const rsvpForm = document.getElementById('rsvpForm');
  if (rsvpForm) {
    const guestField = document.getElementById('guestCountField');
    const guestCount = document.getElementById('guestCount');
    const responseInputs = [...rsvpForm.querySelectorAll('input[name="attendance"]')];
    const feedback = document.getElementById('rsvpFeedback');
    function syncGuestCount() {
      const selected = rsvpForm.querySelector('input[name="attendance"]:checked')?.value;
      const declined = selected === 'decline';
      if (guestField) guestField.hidden = declined;
      if (guestCount) {
        guestCount.disabled = declined;
        if (declined) guestCount.value = '0';
        else if (guestCount.value === '0') guestCount.value = '1';
      }
    }
    responseInputs.forEach(input => input.addEventListener('change', syncGuestCount));
    syncGuestCount();
    rsvpForm.addEventListener('submit', event => {
      event.preventDefault();
      if (!rsvpForm.reportValidity()) return;
      const data = new FormData(rsvpForm);
      const title = String(data.get('title') || '');
      const name = String(data.get('name') || '').trim();
      const attendance = data.get('attendance') === 'accept';
      const count = attendance ? String(data.get('guestCount') || '1') : '0';
      if (feedback) {
        feedback.hidden = false;
        feedback.textContent = attendance
          ? 'Thank you, ' + title + ' ' + name + '. Your RSVP preview shows ' + count + (count === '1' ? ' guest' : ' guests') + ' attending. This preview has not been saved yet.'
          : 'Thank you, ' + title + ' ' + name + '. Your RSVP preview is marked as unable to attend. This preview has not been saved yet.';
      }
      const submit = rsvpForm.querySelector('.rsvp-submit');
      if (submit) submit.textContent = 'RSVP preview complete';
      feedback?.scrollIntoView({behavior: reducedMotion ? 'auto' : 'smooth', block: 'nearest'});
    });
  }

  // Highlight the active page in the shared navigation.
  const currentPage = body.dataset.page;
  if (currentPage) {
    document.querySelectorAll('[data-page-link]').forEach(link => {
      if (link.dataset.pageLink === currentPage) link.classList.add('active');
    });
  }
})();