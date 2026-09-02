const menuButton = document.querySelector('.property-menu-button');
const mobileMenu = document.querySelector('.mobile-menu');
const menuLabel = menuButton.querySelector('.sr-only');
const privateVisitForm = document.querySelector('#private-visit-form');
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
  if (event.key === 'Escape') return closeMenu();
  if (event.key !== 'Tab') return;
  const items = menuFocusables();
  const nextIndex = items.indexOf(document.activeElement) + (event.shiftKey ? -1 : 1);
  if (nextIndex < 0 || nextIndex >= items.length) {
    event.preventDefault();
    items[event.shiftKey ? items.length - 1 : 0]?.focus();
  }
});

privateVisitForm.addEventListener('submit', (event) => {
  event.preventDefault();
  privateVisitForm.querySelector('.property-form-status').textContent = 'Ricevuto. Il private advisor Housei ti ricontatterà a breve.';
  privateVisitForm.reset();
});
