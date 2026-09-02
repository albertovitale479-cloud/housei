const header = document.querySelector('.site-header');
const tour = document.querySelector('.tour');
const tourVideo = document.querySelector('.tour-video');
const cameraTitle = document.querySelector('.camera-title');
const cameraDescription = document.querySelector('.camera-description');
const statusNumber = document.querySelector('.status-number');
const statusWord = document.querySelector('.status-word');
const cameraProgress = document.querySelector('.camera-progress span');
let desiredVideoTime = 0;
let activeStep = -1;
let scrollFrame = 0;
let videoFrame = 0;
let videoIsSeeking = false;
let lastVideoTick = 0;
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

// Load one complete local movie into a Blob so its timeline can be scrubbed even
// from simple static previews that do not implement HTTP byte-range requests.
fetch(tourVideo.dataset.videoSrc)
  .then((response) => response.ok ? response.blob() : Promise.reject(response.status))
  .then((blob) => {
    tourVideo.src = URL.createObjectURL(blob);
    tourVideo.load();
  })
  .catch(() => {
    // The source element remains a useful fallback for file previews and hosts with media streaming.
  });

function scheduleVideoSeek() {
  if (videoFrame || videoIsSeeking || reduceMotion.matches || !Number.isFinite(tourVideo.duration)) return;
  videoFrame = window.requestAnimationFrame((timestamp) => {
    videoFrame = 0;
    const distance = desiredVideoTime - tourVideo.currentTime;
    if (Math.abs(distance) < .016 || videoIsSeeking) return;

    // Let the camera ease toward the scroll target instead of jumping to every
    // wheel event. The short step keeps reverse scrolling responsive as well.
    const elapsed = Math.min(timestamp - (lastVideoTick || timestamp - 16), 48);
    lastVideoTick = timestamp;
    const smoothing = 1 - Math.exp(-elapsed / 92);
    const nextTime = tourVideo.currentTime + clamp(distance * smoothing, -.14, .14);
    videoIsSeeking = true;
    tourVideo.currentTime = nextTime;
  });
}

tourVideo.addEventListener('seeked', () => {
  videoIsSeeking = false;
  scheduleVideoSeek();
});

const clamp = (value, min = 0, max = 1) => Math.min(Math.max(value, min), max);
const setCamera = () => {
  const rect = tour.getBoundingClientRect();
  const travel = Math.max(tour.offsetHeight - window.innerHeight, 1);
  const progress = clamp(-rect.top / travel);
  if (!reduceMotion.matches && Number.isFinite(tourVideo.duration)) {
    desiredVideoTime = progress * Math.max(tourVideo.duration - .08, 0);
    scheduleVideoSeek();
  }
  cameraProgress.style.width = `${progress * 100}%`;
  const step = progress < .36 ? 0 : progress < .72 ? 1 : 2;
  if (step === activeStep) return;
  activeStep = step;
  const copy = [
    ['Segui la<br /><em>luce.</em>', 'Una soglia alla volta.', '01', 'Avvicinati'],
    ['Oltre la<br /><em>soglia.</em>', 'La casa si apre davanti a te.', '02', 'Entra'],
    ['Il mare,<br /><em>solo tuo.</em>', 'Fermati. Questa vista è tua.', '03', 'Abita'],
  ][step];
  cameraTitle.innerHTML = copy[0];
  cameraDescription.textContent = copy[1];
  statusNumber.textContent = copy[2];
  statusWord.textContent = copy[3];
};

const onScroll = () => {
  if (scrollFrame) return;
  scrollFrame = window.requestAnimationFrame(() => {
    scrollFrame = 0;
    header.classList.toggle('scrolled', window.scrollY > window.innerHeight * .72);
    const section = document.elementFromPoint(window.innerWidth * .5, header.offsetHeight + 12)?.closest('[data-header-theme]');
    if (section) header.dataset.theme = section.dataset.headerTheme;
    setCamera();
  });
};
window.addEventListener('scroll', onScroll, { passive: true });
window.addEventListener('resize', onScroll, { passive: true });
tourVideo.addEventListener('loadedmetadata', setCamera, { once: true });
onScroll();

document.querySelector('[data-scroll-tour]').addEventListener('click', () => {
  // Prime the decoder after an intentional gesture, then scrub the same movie with scroll.
  tourVideo.play().then(() => {
    tourVideo.pause();
    setCamera();
  }).catch(() => {});
  document.querySelector('#tour').scrollIntoView({ behavior: 'smooth' });
});

const menuButton = document.querySelector('.menu-button');
const mobileMenu = document.querySelector('.mobile-menu');
const menuLabel = menuButton.querySelector('.sr-only');
let menuCloseTimer = 0;
let menuFocusTimer = 0;
const menuFocusables = () => Array.from(mobileMenu.querySelectorAll('a, button:not([disabled])'));
const closeMenu = (restoreFocus = true) => {
  window.clearTimeout(menuCloseTimer);
  window.clearTimeout(menuFocusTimer);
  menuButton.setAttribute('aria-expanded', 'false');
  menuLabel.textContent = 'Apri menu';
  document.body.classList.remove('menu-is-open');
  document.body.style.overflow = '';
  menuCloseTimer = window.setTimeout(() => { mobileMenu.hidden = true; }, 280);
  if (restoreFocus) menuButton.focus();
};
const openMenu = () => {
  window.clearTimeout(menuCloseTimer);
  window.clearTimeout(menuFocusTimer);
  mobileMenu.hidden = false;
  menuButton.setAttribute('aria-expanded', 'true');
  menuLabel.textContent = 'Chiudi menu';
  document.body.style.overflow = 'hidden';
  window.requestAnimationFrame(() => document.body.classList.add('menu-is-open'));
  menuFocusTimer = window.setTimeout(() => mobileMenu.querySelector('a')?.focus(), 280);
};
menuButton.addEventListener('click', () => {
  menuButton.getAttribute('aria-expanded') === 'true' ? closeMenu() : openMenu();
});
mobileMenu.querySelectorAll('a').forEach((link) => link.addEventListener('click', () => closeMenu(false)));
window.addEventListener('keydown', (event) => {
  if (menuButton.getAttribute('aria-expanded') !== 'true') return;
  if (event.key === 'Escape') {
    closeMenu();
    return;
  }
  if (event.key !== 'Tab') return;
  const items = menuFocusables();
  const currentIndex = items.indexOf(document.activeElement);
  const nextIndex = event.shiftKey ? currentIndex - 1 : currentIndex + 1;
  if (nextIndex < 0 || nextIndex >= items.length) {
    event.preventDefault();
    items[event.shiftKey ? items.length - 1 : 0]?.focus();
  }
});
