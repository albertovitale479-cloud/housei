const menuButton = document.querySelector('.property-menu-button');
const mobileMenu = document.querySelector('.mobile-menu');
const menuLabel = menuButton.querySelector('.sr-only');
const advisorForm = document.querySelector('#advisor-form');
const interestSelect = advisorForm.querySelector('#interest');
const advisorContext = document.querySelector('#advisor-context');
const formStatus = advisorForm.querySelector('.property-form-status');
const submitButton = advisorForm.querySelector('[type="submit"]');
const submitLabel = submitButton.querySelector('span');
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

const requestedInterest = new URLSearchParams(window.location.search).get('interesse');
const optionValues = Array.from(interestSelect.options).map((option) => option.value);

if (requestedInterest) {
  interestSelect.value = optionValues.includes(requestedInterest) ? requestedInterest : "Un'altra dimora";
  advisorContext.hidden = false;
  advisorContext.textContent = `Richiesta per: ${requestedInterest}.`;
}

advisorForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  formStatus.textContent = '';
  formStatus.dataset.state = '';

  if (!advisorForm.checkValidity()) {
    advisorForm.reportValidity();
    return;
  }

  const request = Object.fromEntries(new FormData(advisorForm).entries());
  submitButton.disabled = true;
  submitLabel.textContent = 'Invio in corso';
  formStatus.textContent = 'Stiamo inviando la tua richiesta…';

  try {
    const response = await fetch(advisorForm.dataset.endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
    });
    const result = await response.json().catch(() => ({}));

    if (!response.ok) throw new Error(result.message || 'La richiesta non può essere inviata in questo momento.');

    advisorForm.reset();
    interestSelect.value = requestedInterest && optionValues.includes(requestedInterest) ? requestedInterest : 'Consulenza Housei';
    formStatus.textContent = result.message || 'Richiesta inviata. Un advisor Housei ti ricontatterà a breve.';
    formStatus.dataset.state = 'success';
  } catch (error) {
    formStatus.textContent = error.message || 'Non siamo riusciti a inviare la richiesta. Riprova tra poco.';
    formStatus.dataset.state = 'error';
  } finally {
    submitButton.disabled = false;
    submitLabel.textContent = 'Invia la richiesta';
  }
});
