const propertyTour = document.querySelector('.property-tour');
const tourImage = document.querySelector('.property-hero-image');
const tourTitle = document.querySelector('.property-camera-title');
const tourDescription = document.querySelector('.property-camera-description');
const statusNumber = document.querySelector('.property-status-number');
const statusWord = document.querySelector('.property-status-word');
const tourProgress = document.querySelector('.property-tour-progress span');
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

let activeStep = -1;
let scrollFrame = 0;

const clamp = (value, min = 0, max = 1) => Math.min(Math.max(value, min), max);

function setTourFrame() {
  const rect = propertyTour.getBoundingClientRect();
  const travel = Math.max(propertyTour.offsetHeight - window.innerHeight, 1);
  const progress = clamp(-rect.top / travel);

  tourProgress.style.transform = `scaleX(${progress})`;
  if (!reduceMotion.matches) {
    tourImage.style.transform = `scale(${1.02 + progress * .08})`;
    tourImage.style.backgroundPosition = `${68 - progress * 18}% ${50 - progress * 4}%`;
  }

  const step = progress < .34 ? 0 : progress < .7 ? 1 : 2;
  if (step === activeStep) return;

  activeStep = step;
  const copy = [
    ['Domina<br /><em>Milano.</em>', 'Un attico che non guarda la città: la contiene.', '01', 'Avvicinati'],
    ['Attraversa<br /><em>la soglia.</em>', 'Il living si apre, piano dopo piano.', '02', 'Entra'],
    ['Il cielo,<br /><em>tutto tuo.</em>', 'La città resta sotto. La serata comincia qui.', '03', 'Abita'],
  ][step];

  tourTitle.innerHTML = copy[0];
  tourDescription.textContent = copy[1];
  statusNumber.textContent = copy[2];
  statusWord.textContent = copy[3];
}

function requestTourFrame() {
  if (scrollFrame) return;
  scrollFrame = window.requestAnimationFrame(() => {
    scrollFrame = 0;
    setTourFrame();
  });
}

window.addEventListener('scroll', requestTourFrame, { passive: true });
window.addEventListener('resize', requestTourFrame, { passive: true });
setTourFrame();

const menuButton = document.querySelector('.property-menu-button');
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
