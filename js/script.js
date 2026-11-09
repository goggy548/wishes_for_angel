(() => {
  'use strict';
  const $ = (selector, scope = document) => scope.querySelector(selector);
  const $$ = (selector, scope = document) => [...scope.querySelectorAll(selector)];
  const toast = $('#toast');
  let toastTimer;
  function notify(message) {
    if (!toast) return;
    toast.textContent = message;
    toast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove('show'), 2600);
  }
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  function scrollToId(id) {
    const target = document.getElementById(id);
    if (target) target.scrollIntoView({ behavior: reducedMotion ? 'auto' : 'smooth', block: 'start' });
  }
  function addConfetti(container, count = 55) {
    if (!container) return;
    container.innerHTML = '';
    for (let i = 0; i < count; i++) {
      const bit = document.createElement('span');
      bit.className = 'confetti-piece';
      bit.style.left = `${Math.random() * 100}%`;
      bit.style.animationDelay = `${Math.random() * .8}s`;
      bit.style.animationDuration = `${1.7 + Math.random() * 1.4}s`;
      bit.style.transform = `rotate(${Math.random() * 180}deg)`;
      container.appendChild(bit);
    }
    setTimeout(() => { container.innerHTML = ''; }, 4300);
  }

  // Mobile navigation
  const navToggle = $('.nav-toggle');
  const navLinks = $('.nav-links');
  navToggle?.addEventListener('click', () => {
    const isOpen = navLinks.classList.toggle('open');
    navToggle.setAttribute('aria-expanded', String(isOpen));
    navToggle.textContent = isOpen ? '×' : '☰';
  });
  $$('.nav-links a').forEach(link => link.addEventListener('click', () => {
    navLinks.classList.remove('open');
    navToggle?.setAttribute('aria-expanded', 'false');
    if (navToggle) navToggle.textContent = '☰';
  }));

  // Current section indicator
  const sections = $$('main section[id]');
  if ('IntersectionObserver' in window) {
    const sectionObserver = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          $$('.nav-links a').forEach(a => a.classList.toggle('active', a.getAttribute('href') === `#${entry.target.id}`));
        }
      });
    }, { rootMargin: '-35% 0px -55% 0px' });
    sections.forEach(section => sectionObserver.observe(section));
    const revealObserver = new IntersectionObserver(entries => entries.forEach(entry => {
      if (entry.isIntersecting) { entry.target.classList.add('in-view'); revealObserver.unobserve(entry.target); }
    }), { threshold: .12 });
    $$('.section-heading,.polaroid,.story-card,.reason-card,.final-photo').forEach(el => {
      el.classList.add('reveal'); revealObserver.observe(el);
    });
  } else {
    $$('.reveal').forEach(el => el.classList.add('in-view'));
  }

  // Gift opening + music starts only after visitor action
  const gift = $('#gift');
  const openGift = $('#openGift');
  const giftNote = $('#giftNote');
  const audio = $('#backgroundMusic');
  const musicControl = $('#musicControl');
  const musicToggle = $('#musicToggle');
  const musicMute = $('#musicMute');
  let musicAvailable = true;
  function updateMusicUI() {
    if (!audio || !musicControl) return;
    musicToggle.textContent = audio.paused ? '▶' : 'Ⅱ';
    musicToggle.setAttribute('aria-label', audio.paused ? 'Play background music' : 'Pause background music');
    musicMute.textContent = audio.muted ? '🔇' : '🔊';
  }
  async function startMusic() {
    if (!audio || !musicAvailable) return;
    musicControl.hidden = false;
    try {
      await audio.play();
      updateMusicUI();
    } catch (error) {
      // Browser autoplay rules or a missing audio file should never block the scrapbook.
      musicAvailable = false;
      musicControl.hidden = true;
      notify('Add music/birthday-song.mp3 for the little soundtrack ♡');
    }
  }
  function openTheGift() {
    if (gift?.classList.contains('open')) return;
    gift?.classList.add('open');
    giftNote?.classList.add('visible');
    addConfetti($('.opening'), 38);
    startMusic();
    notify('A little story, made just for you ♡');
    setTimeout(() => scrollToId('birthday'), 1250);
  }
  openGift?.addEventListener('click', openTheGift);
  gift?.addEventListener('click', openTheGift);
  gift?.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openTheGift(); } });
  musicToggle?.addEventListener('click', async () => {
    if (!audio) return;
    if (audio.paused) { try { await audio.play(); } catch (_) { notify('The music file is not available yet.'); } }
    else audio.pause();
    updateMusicUI();
  });
  musicMute?.addEventListener('click', () => { if (!audio) return; audio.muted = !audio.muted; updateMusicUI(); });
  audio?.addEventListener('error', () => { musicAvailable = false; if (musicControl) musicControl.hidden = true; });

  // Photo fallbacks preserve natural image ratio; missing files show a placeholder.
  $$('img').forEach(img => {
    const handleMissing = () => {
      const frame = img.closest('.photo-frame, .final-photo');
      if (frame) frame.classList.add('missing');
      img.style.display = 'none';
    };
    img.addEventListener('error', handleMissing);
    if (img.complete && img.naturalWidth === 0) handleMissing();
  });

  // Gallery lightbox
  const lightbox = $('#lightbox');
  const lightboxImage = $('#lightboxImage');
  const lightboxCaption = $('#lightboxCaption');
  let lastFocused = null;
  function openModal(modal) {
    lastFocused = document.activeElement;
    modal?.classList.add('open');
    modal?.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
    $('.modal-close', modal)?.focus();
  }
  function closeModal(modal) {
    modal?.classList.remove('open');
    modal?.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
    lastFocused?.focus?.();
  }
  $$('.polaroid').forEach(card => card.addEventListener('click', () => {
    const img = $('img', card);
    const src = card.dataset.src;
    if (!src || card.querySelector('.photo-frame')?.classList.contains('missing')) {
      notify(`Add ${src || 'your photo'} to the images folder first ♡`);
      return;
    }
    lightboxImage.src = src;
    lightboxImage.alt = img?.alt || 'Friendship photograph';
    lightboxCaption.textContent = card.dataset.caption || '';
    openModal(lightbox);
  }));

  // Story cards reveal the exact supplied text, unchanged.
  const storyModal = $('#storyModal');
  function unfoldStory(card) {
    const stories = Array.isArray(window.scrapbookStories) ? window.scrapbookStories : [];
    const story = stories[Number(card.dataset.story)];
    if (!story || !storyModal) {
      notify('This memory could not be opened. Please refresh the page ♡');
      return;
    }
    const title = $('#storyModalTitle');
    const message = $('#storyModalText');
    if (!title || !message) return;
    title.textContent = story.title;
    message.textContent = story.message;
    openModal(storyModal);
  }
  $$('.story-card').forEach(card => {
    card.addEventListener('click', () => unfoldStory(card));
    card.addEventListener('keydown', event => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        unfoldStory(card);
      }
    });
  });
  $$('.modal').forEach(modal => {
    $('.modal-close', modal)?.addEventListener('click', () => closeModal(modal));
    modal.addEventListener('click', e => { if (e.target === modal) closeModal(modal); });
  });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') $$('.modal.open').forEach(closeModal);
  });

  // Personal envelope
  const envelope = $('#envelope');
  const personalLetter = $('#personalLetter');
  function openEnvelope() {
    if (envelope?.classList.contains('open')) return;
    envelope?.classList.add('open');
    setTimeout(() => personalLetter?.classList.add('visible'), 650);
    notify('A letter, straight from the heart 💌');
  }
  envelope?.addEventListener('click', openEnvelope);
  envelope?.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openEnvelope(); } });

  // Five reason cards
  $$('.reason-card').forEach(card => card.addEventListener('click', () => {
    const opened = card.classList.toggle('revealed');
    if (opened) notify("A little reason why you're loved ♡");
  }));
  $('#oneMore')?.addEventListener('click', () => {
    $('#hiddenMessage')?.classList.add('visible');
    notify('Psst... one last little thing ♡');
  });

  // Cake cutting interaction.
  const cutCakeButton = $('#cutCake');
  const cakeCutNote = $('#cakeCutNote');
  let cakeCut = false;
  cutCakeButton?.addEventListener('click', () => {
    if (cakeCut) return;
    cakeCut = true;
    cake?.classList.add('cut');
    cutCakeButton.disabled = true;
    cutCakeButton.textContent = 'A slice, just for you ♡';
    cakeCutNote?.classList.add('visible');
    if (cakeCutNote) cakeCutNote.textContent = 'The sweetest slice for the sweetest birthday girl! ♡';
    notify('Cake-cutting time! A slice just for you ♡');
  });

  // Candle blowing is a button interaction; no microphone permission required.
  const blowButton = $('#blowCandles');
  const cake = $('.interactive-cake');
  let candlesBlown = false;
  blowButton?.addEventListener('click', () => {
    if (candlesBlown) return;
    candlesBlown = true;
    cake?.classList.add('blown');
    $('#wishMessage').textContent = 'Your wish is on its way! ✨🤍';
    $('#wishHint').textContent = 'A little wish, sent into the universe ♡';
    blowButton.disabled = true;
    blowButton.classList.remove('pulse');
    blowButton.textContent = 'Wish sent ♡';
    $('#celebrationMessage')?.classList.add('visible');
    addConfetti($('#confettiLayer'), 75);
    notify('You did it, birthday girl! ✨');
  });

  // Replay returns to the top of the same page.
  $('#replay')?.addEventListener('click', () => {
    scrollToId('home');
    notify('And our little story begins again ♡');
  });

  // Smooth-scroll fallback for older browsers; native CSS handles modern browsers.
  $$('a[href^="#"]').forEach(anchor => anchor.addEventListener('click', e => {
    const id = anchor.getAttribute('href')?.slice(1);
    if (!id || !document.getElementById(id)) return;
    e.preventDefault();
    scrollToId(id);
  }));

  // Optional GSAP enhancement; core interactions do not depend on GSAP.
  window.addEventListener('load', () => {
    if (!reducedMotion && window.gsap) {
      gsap.from('.opening-inner > *', { opacity: 0, y: 18, duration: .8, stagger: .12, ease: 'power2.out' });
    }
  });
})();
