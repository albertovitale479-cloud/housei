// Keep the closed navigation out of hit testing and keyboard navigation on every page.
(() => {
  const button = document.querySelector('.menu-button');
  const menu = document.querySelector('.mobile-menu');
  const label = button.querySelector('.sr-only');
  const background = [...document.querySelectorAll('main, footer, .desktop-nav, .property-nav, .property-back, header .brand')];
  const isOpen = () => button.getAttribute('aria-expanded') === 'true';

  function closeMenu(restoreFocus = true) {
    button.setAttribute('aria-expanded', 'false');
    label.textContent = 'Apri menu';
    menu.hidden = true;
    document.body.classList.remove('menu-is-open');
    document.body.style.overflow = '';
    background.forEach((element) => { element.inert = false; });
    if (restoreFocus) button.focus();
  }

  button.addEventListener('click', () => {
    if (isOpen()) return closeMenu();
    menu.hidden = false;
    button.setAttribute('aria-expanded', 'true');
    label.textContent = 'Chiudi menu';
    document.body.classList.add('menu-is-open');
    document.body.style.overflow = 'hidden';
    background.forEach((element) => { element.inert = true; });
    menu.querySelector('a')?.focus();
  });

  menu.querySelectorAll('a').forEach((link) => link.addEventListener('click', () => {
    closeMenu(false);
    const target = link.hash && document.getElementById(link.hash.slice(1));
    if (target && new URL(link.href).pathname === location.pathname) {
      target.setAttribute('tabindex', '-1');
      target.focus({ preventScroll: true });
    }
  }));

  document.addEventListener('keydown', (event) => {
    if (!isOpen()) return;
    if (event.key === 'Escape') { event.preventDefault(); closeMenu(); }
    if (event.key !== 'Tab') return;
    const items = [button, ...menu.querySelectorAll('a, button:not([disabled])')];
    const current = items.indexOf(document.activeElement);
    const next = (current + (event.shiftKey ? -1 : 1) + items.length) % items.length;
    event.preventDefault();
    items[next].focus();
  });

  window.matchMedia('(min-width: 821px)').addEventListener('change', (event) => {
    if (event.matches && isOpen()) closeMenu(false);
  });
  window.addEventListener('pageshow', () => closeMenu(false));
})();
