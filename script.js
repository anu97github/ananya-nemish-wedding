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
      if (active) {
        // Hidden tab panels can defer lazy illustrations; load and decode every
        // timeline icon as soon as its day is selected so they never appear blank.
        panel.querySelectorAll('.timeline-event-icon').forEach(img => {
          img.loading = 'eager';
          if (!img.complete) img.decode?.().catch(() => {});
        });
      }
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
  const startAt = new Date('2027-02-02T08:00:00+05:30').getTime();
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

  // Slow blurred monogram zoom, then immediate cursive type-on prompt.
  const intro = document.getElementById('invitationIntro');
  const introLogo = intro?.querySelector('.intro-logo');
  const introOpenButton = document.getElementById('introOpenButton');
  const soundButton = document.getElementById('soundToggle');
  const soundLabel = document.getElementById('soundLabel');
  const weddingAudio = document.getElementById('weddingAudio');
  let intentionallyPaused = false;
  let promptTimer = null;
  let promptStarted = false;

  function updateSound(on, label) {
    soundButton?.setAttribute('aria-pressed', String(on));
    soundButton?.setAttribute('aria-label', on ? 'Pause wedding music' : 'Play wedding music');
    if (soundLabel) soundLabel.textContent = label || (on ? 'MUSIC ON' : 'MUSIC OFF');
  }
  if (weddingAudio) {
    weddingAudio.volume = 0.58;
    weddingAudio.addEventListener('play', () => updateSound(true, 'MUSIC ON'));
    weddingAudio.addEventListener('pause', () => { if (intentionallyPaused) updateSound(false, 'MUSIC OFF'); });
    weddingAudio.addEventListener('error', () => updateSound(false, 'MUSIC UNAVAILABLE'));
  }
  function startWeddingMusic() {
    if (!weddingAudio) return;
    intentionallyPaused = false;
    weddingAudio.muted = false;
    weddingAudio.play().then(() => updateSound(true, 'MUSIC ON')).catch(() => updateSound(false, 'MUSIC OFF'));
  }

  function typePrompt() {
    if (!introOpenButton || promptStarted) return;
    promptStarted = true;
    const phrase = 'Tap to Unveil';
    introOpenButton.hidden = false;
    introOpenButton.textContent = '';
    introOpenButton.classList.add('is-visible');
    let index = 0;
    const step = reducedMotion ? 85 : 125;
    // First character appears immediately, with no delay after the logo settles.
    introOpenButton.textContent = phrase[index++];
    promptTimer = window.setInterval(() => {
      introOpenButton.textContent += phrase[index++];
      if (index >= phrase.length) {
        window.clearInterval(promptTimer);
        promptTimer = null;
      }
    }, step);
  }

  function playIntroLogoAnimation() {
    if (!introLogo) { typePrompt(); return; }
    introLogo.style.opacity = '0';
    introLogo.style.transform = 'scale(.018)';
    introLogo.style.filter = 'blur(14px)';
    const duration = reducedMotion ? 5200 : 7600;
    const frames = [
      { opacity: 0, transform: 'scale(.018)', filter: 'blur(14px)', offset: 0 },
      { opacity: .16, transform: 'scale(.06)', filter: 'blur(11px)', offset: .14 },
      { opacity: .42, transform: 'scale(.18)', filter: 'blur(8px)', offset: .34 },
      { opacity: .78, transform: 'scale(.42)', filter: 'blur(5px)', offset: .56 },
      { opacity: 1, transform: 'scale(.78)', filter: 'blur(2.5px)', offset: .76 },
      { opacity: 1, transform: 'scale(1.04)', filter: 'blur(.5px)', offset: .91 },
      { opacity: 1, transform: 'scale(1)', filter: 'blur(0px)', offset: 1 }
    ];
    if (typeof introLogo.animate === 'function') {
      try {
        const motion = introLogo.animate(frames, {
          duration, delay: 0, easing: 'cubic-bezier(.16,.7,.2,1)', fill: 'forwards'
        });
        // Start typing during the final settling phase; onfinish is a guarded fallback.
        window.setTimeout(typePrompt, Math.round(duration * 0.48));
        motion.onfinish = typePrompt;
        return;
      } catch (animationError) { /* CSS fallback below */ }
    }
    introLogo.classList.add('fallback-zoom');
    window.setTimeout(typePrompt, Math.round(duration * 0.48));
    introLogo.addEventListener('animationend', typePrompt, { once: true });
  }
  requestAnimationFrame(() => requestAnimationFrame(playIntroLogoAnimation));

  function openInvitation(event) {
    if (!intro || intro.classList.contains('intro-transitioning')) return;
    // Keep music playback in the original user gesture so browsers allow it.
    startWeddingMusic();

    const clickX = event?.clientX ?? window.innerWidth / 2;
    const clickY = event?.clientY ?? window.innerHeight / 2;
    const originX = Math.max(0, Math.min(100, (clickX / window.innerWidth) * 100));
    const originY = Math.max(0, Math.min(100, (clickY / window.innerHeight) * 100));

    // Start the website itself in a soft, blurred state and bring it into focus
    // as the invitation cover expands away.
    document.body.classList.add('website-revealing');
    intro.classList.add('intro-transitioning');
    intro.style.setProperty('--intro-origin-x', originX + '%');
    intro.style.setProperty('--intro-origin-y', originY + '%');
    intro.setAttribute('aria-hidden', 'true');

    const finishTransition = () => {
      intro.hidden = true;
      document.body.classList.remove('intro-active', 'website-revealing');
      intro.classList.remove('intro-transitioning');
    };

    if (reducedMotion) {
      finishTransition();
      return;
    }

    // A soft ivory veil expands from the exact tap point, then reveals the site.
    const transition = intro.animate([
      { clipPath: `circle(0% at ${originX}% ${originY}%)`, opacity: 1 },
      { clipPath: `circle(150% at ${originX}% ${originY}%)`, opacity: 1, offset: 0.68 },
      { clipPath: `circle(150% at ${originX}% ${originY}%)`, opacity: 0 }
    ], {
      duration: 1050,
      easing: 'cubic-bezier(.22,.72,.18,1)',
      fill: 'forwards'
    });
    transition.onfinish = finishTransition;
    transition.oncancel = finishTransition;
  }
  intro?.addEventListener('click', openInvitation);
  function toggleMusic() {
    if (!weddingAudio) return;
    if (weddingAudio.paused) startWeddingMusic();
    else { intentionallyPaused = true; weddingAudio.pause(); updateSound(false, 'MUSIC OFF'); }
  }
  soundButton?.addEventListener('click', toggleMusic);
  updateSound(false, 'MUSIC OFF');

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

  // Guestbook: open the keepsake letter and send notes to the shared Google Sheet.
  const openNoteButton = document.getElementById('openNote');
  const guestbookCard = document.getElementById('guestbookCard');
  const guestbookForm = document.getElementById('guestbookForm');
  if (openNoteButton && guestbookCard) {
    openNoteButton.addEventListener('click', () => {
      const opening = guestbookCard.hidden;
      guestbookCard.hidden = !opening;
      openNoteButton.setAttribute('aria-expanded', String(opening));
      openNoteButton.innerHTML = opening
        ? 'CLOSE YOUR NOTE <span aria-hidden="true">↗</span>'
        : 'WRITE A NOTE <span aria-hidden="true">↗</span>';
      if (opening) {
        guestbookCard.classList.remove('is-open');
        requestAnimationFrame(() => {
          guestbookCard.classList.add('is-open');
          if (!reducedMotion) guestbookCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
          document.getElementById('guestbookMessage')?.focus({ preventScroll: true });
        });
      }
    });
  }
  if (guestbookForm) {
    const feedback = document.getElementById('guestbookFeedback');
    const nameField = document.getElementById('guestbookName');
    // Names may contain letters from any language, combining marks, spaces,
    // hyphens, periods and apostrophes. Remove digits and other symbols as typed.
    nameField?.addEventListener('input', () => {
      const cleaned = nameField.value.replace(/[^\p{L}\p{M} .’'-]/gu, '');
      if (cleaned !== nameField.value) nameField.value = cleaned;
      nameField.setCustomValidity(cleaned.trim() ? '' : 'Please enter your name using letters only.');
    });
    const submitButton = guestbookForm.querySelector('.guestbook-submit');
    const submissionIdField = document.getElementById('guestbookSubmissionId');
    let pendingSubmissionId = null;
    let submissionTimeout = null;
    const showNoteFeedback = (message, isError = false) => {
      feedback.hidden = false;
      feedback.textContent = message;
      feedback.classList.toggle('is-error', isError);
    };
    const makeNoteId = () => window.crypto?.randomUUID
      ? window.crypto.randomUUID()
      : 'note-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2);
    guestbookForm.addEventListener('submit', event => {
      event.preventDefault();
      if (!guestbookForm.reportValidity()) return;
      const endpoint = String(window.GUESTBOOK_CONFIG?.endpoint || '').trim();
      if (!/^https:\/\/script\.google\.com\/macros\/s\/[A-Za-z0-9_-]+\/exec$/.test(endpoint)) {
        showNoteFeedback('Our guestbook is not connected just yet. Please try again soon.', true);
        return;
      }
      const name = guestbookForm.elements.name.value.trim();
      const message = guestbookForm.elements.message.value.trim();
      if (!name || !message) {
        showNoteFeedback('Please add your name and a little message for us.', true);
        return;
      }
      if (!pendingSubmissionId) pendingSubmissionId = makeNoteId();
      submissionIdField.value = pendingSubmissionId;
      guestbookForm.action = endpoint;
      submitButton.disabled = true;
      submitButton.innerHTML = '<span>SENDING YOUR NOTE…</span><span aria-hidden="true">✥</span>';
      feedback.hidden = true;
      window.clearTimeout(submissionTimeout);
      submissionTimeout = window.setTimeout(() => {
        if (!pendingSubmissionId) return;
        submitButton.disabled = false;
        submitButton.innerHTML = '<span>SEND YOUR NOTE</span><span aria-hidden="true">↗</span>';
        showNoteFeedback('We could not confirm your note was saved. Please try again; your note will keep the same reference.', true);
      }, 20000);
      HTMLFormElement.prototype.submit.call(guestbookForm);
    });
    window.addEventListener('message', event => {
      let result = event.data;
      if (typeof result === 'string') {
        try { result = JSON.parse(result); } catch (_) { return; }
      }
      if (!result || result.type !== 'wedding-note-result' ||
          !pendingSubmissionId || result.submissionId !== pendingSubmissionId) return;
      window.clearTimeout(submissionTimeout);
      submitButton.disabled = false;
      submitButton.innerHTML = '<span>SEND YOUR NOTE</span><span aria-hidden="true">↗</span>';
      if (result.ok) {
        pendingSubmissionId = null;
        submissionIdField.value = '';
        guestbookCard.classList.add('is-submitted');
        const thankyou = document.createElement('p');
        thankyou.className = 'guestbook-thankyou';
        thankyou.textContent = 'Your note is tucked safely into our hearts. Thank you. ♡';
        guestbookCard.querySelector('.guestbook-card-inner').replaceChildren(thankyou);
      } else {
        showNoteFeedback(result.message || 'We could not save your note. Please try again.', true);
      }
    });
  }
})();
