const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const clean = (value) => String(value || '').trim();

const resolveWebhookUrl = (value) => {
  const configuredUrl = clean(value);
  if (!configuredUrl) return '';

  const webhookUrl = new URL(configuredUrl);
  const path = webhookUrl.pathname.replace(/\/+$/, '');

  // Per la demo accettiamo anche il solo dominio generato da Cloudflare.
  // In questo modo un nuovo Quick Tunnel non richiede di ricordare il path n8n.
  if (!path) webhookUrl.pathname = '/webhook/housei-lead';

  return webhookUrl.toString();
};

const forwardToN8n = async (details, request) => {
  const { N8N_WEBHOOK_URL, N8N_WEBHOOK_SECRET } = process.env;
  const webhookUrl = resolveWebhookUrl(N8N_WEBHOOK_URL);
  if (!webhookUrl) return false;
  if (!N8N_WEBHOOK_SECRET) throw new Error('N8N_WEBHOOK_SECRET is missing');

  const automationResponse = await fetch(webhookUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Housei-Webhook-Secret': N8N_WEBHOOK_SECRET,
    },
    body: JSON.stringify({
      ...details,
      consentAccepted: true,
      source: 'housei-private-visit',
      submittedAt: new Date().toISOString(),
      requestId: clean(request.headers?.['x-vercel-id']) || `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    }),
  });

  if (!automationResponse.ok) {
    const errorBody = await automationResponse.text();
    throw new Error(`n8n delivery failed (${automationResponse.status}): ${errorBody.slice(0, 500)}`);
  }

  return true;
};

module.exports = async (request, response) => {
  if (request.method !== 'POST') {
    response.setHeader('Allow', 'POST');
    return response.status(405).json({ message: 'Metodo non consentito.' });
  }

  const { name, email, tel, message, interest, consent, website } = request.body || {};
  const details = {
    name: clean(name),
    email: clean(email),
    tel: clean(tel),
    message: clean(message),
    interest: clean(interest),
  };

  if (website) return response.status(200).json({ message: 'Richiesta inviata.' });

  if (!details.name || !emailPattern.test(details.email) || !details.message || !details.interest || !consent) {
    return response.status(400).json({ message: 'Completa tutti i campi obbligatori prima di inviare.' });
  }

  if (details.name.length > 120 || details.message.length > 3000 || details.tel.length > 60) {
    return response.status(400).json({ message: 'Alcuni campi sono troppo lunghi. Riduci il testo e riprova.' });
  }

  const { N8N_WEBHOOK_URL } = process.env;
  if (N8N_WEBHOOK_URL) {
    try {
      await forwardToN8n(details, request);
      return response.status(200).json({ message: 'Richiesta inviata. Un advisor Housei ti ricontatterà a breve.' });
    } catch (error) {
      console.error('Contact automation failed:', error);
      return response.status(502).json({ message: 'Non siamo riusciti a inoltrare la richiesta. Riprova più tardi.' });
    }
  }

  return response.status(503).json({ message: 'Il servizio di contatto non è ancora configurato. Riprova più tardi.' });
};
