const advisorForm = document.querySelector('#advisor-form');
const interestSelect = advisorForm.querySelector('#interest');
const advisorContext = document.querySelector('#advisor-context');
const formStatus = advisorForm.querySelector('.property-form-status');
const submitButton = advisorForm.querySelector('[type="submit"]');
const submitLabel = submitButton.querySelector('span');
const interestParam = new URLSearchParams(window.location.search).get('interesse');
const requestedInterest = interestParam === 'Consulenza' ? 'Consulenza Housei' : interestParam;
const optionValues = Array.from(interestSelect.options).map((option) => option.value);

if (requestedInterest) {
  interestSelect.value = optionValues.includes(requestedInterest) ? requestedInterest : "Un'altra dimora";
  advisorContext.hidden = false;
  advisorContext.textContent = `Richiesta per: ${requestedInterest}.`;
}

if (window.location.hash === '#advisor-form') {
  window.requestAnimationFrame(() => {
    advisorForm.scrollIntoView({ block: 'start' });
  });
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
      signal: AbortSignal.timeout(15000),
    });
    const result = await response.json().catch(() => ({}));

    if (!response.ok || !result.message) throw new Error(result.message || 'La richiesta non può essere inviata in questo momento.');

    advisorForm.reset();
    interestSelect.value = requestedInterest && optionValues.includes(requestedInterest) ? requestedInterest : 'Consulenza Housei';
    formStatus.textContent = result.message || 'Richiesta inviata. Un advisor Housei ti ricontatterà a breve.';
    formStatus.dataset.state = 'success';
  } catch (error) {
    formStatus.textContent = error.name === 'TimeoutError' ? 'Il servizio non risponde. I dati sono ancora qui: riprova tra poco.' : error.name === 'TypeError' ? 'Connessione non disponibile. I dati sono ancora qui: riprova tra poco.' : error.message || 'Non siamo riusciti a inviare la richiesta. Riprova tra poco.';
    formStatus.dataset.state = 'error';
  } finally {
    submitButton.disabled = false;
    submitLabel.textContent = 'Invia la richiesta';
  }
});
