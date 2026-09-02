const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const clean = (value) => String(value || '').trim();

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

  const { RESEND_API_KEY, CONTACT_FROM_EMAIL, CONTACT_TO_EMAIL } = process.env;
  if (!RESEND_API_KEY || !CONTACT_FROM_EMAIL || !CONTACT_TO_EMAIL) {
    return response.status(503).json({ message: 'Il servizio di contatto non è ancora configurato. Riprova più tardi.' });
  }

  try {
    const resendResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: CONTACT_FROM_EMAIL,
        to: [CONTACT_TO_EMAIL],
        reply_to: details.email,
        subject: `Nuova richiesta Housei — ${details.interest}`,
        text: [
          `Nome: ${details.name}`,
          `Email: ${details.email}`,
          `Telefono: ${details.tel || 'Non indicato'}`,
          `Interesse: ${details.interest}`,
          '',
          'Messaggio:',
          details.message,
        ].join('\n'),
      }),
    });

    if (!resendResponse.ok) {
      console.error('Resend delivery failed:', await resendResponse.text());
      return response.status(502).json({ message: 'Non siamo riusciti a inoltrare la richiesta. Riprova più tardi.' });
    }

    return response.status(200).json({ message: 'Richiesta inviata. Un advisor Housei ti ricontatterà a breve.' });
  } catch (error) {
    console.error('Contact delivery failed:', error);
    return response.status(502).json({ message: 'Non siamo riusciti a inoltrare la richiesta. Riprova più tardi.' });
  }
};
