# Housei

Sito statico editoriale per Housei: tour immersivo di Casa Aurea e Attico Velario.

## Anteprima locale

Non installare dipendenze globali. Dalla cartella del progetto:

```bash
source .venv/bin/activate && python -m http.server 4173 --bind 127.0.0.1
```

Apri `http://127.0.0.1:4173` e arresta il server con `Ctrl+C`.

## Controllo qualità

```bash
node scripts/check-site.mjs
node --check script.js
node --check attico.js
```

Gli stessi controlli vengono eseguiti da GitHub Actions su ogni pull request e ogni push su `main`.

## Pubblicazione su GitHub

1. Crea un repository GitHub vuoto chiamato `housei` (senza README, `.gitignore` o licenza iniziali).
2. Nel terminale, dalla root di questo progetto, esegui:

```bash
git add .
git commit -m "Initial Housei website"
git branch -M main
git remote add origin https://github.com/TUO-USERNAME/housei.git
git push -u origin main
```

## Deploy su Vercel

1. In Vercel seleziona **New Project** e importa il repository GitHub `housei`.
2. Mantieni la root del progetto su `.`. Non è necessario un comando di build: è un sito statico.
3. Clicca **Deploy**.

I push su `main` aggiornano la produzione; le pull request ricevono una preview. `vercel.json` applica URL puliti, header di sicurezza e cache per gli asset. Prima di condividere il sito, sostituisci gli URL relativi Open Graph con il dominio Vercel definitivo, se vuoi anteprime social perfette.

## Modulo “Parla con un advisor”

Il modulo usa una Vercel Function (`api/contact.js`) che inoltra i messaggi a un workflow n8n self-hosted. n8n spedisce le due notifiche attraverso il server SMTP di una casella email esistente. Prima di pubblicare la versione con il form attivo:

1. Avvia n8n seguendo le istruzioni in [`infra/n8n`](infra/n8n).
2. Crea e attiva il workflow Webhook → Send Email descritto nella guida.
3. In Vercel apri **Project Settings → Environment Variables** e aggiungi `N8N_WEBHOOK_URL` e `N8N_WEBHOOK_SECRET`.
4. Fai un nuovo deploy e invia una richiesta di prova.

Il sito non mostra più una conferma fittizia: senza questa configurazione avvisa chiaramente che l'invio non è disponibile.

### Automazione self-hosted con n8n

La configurazione pronta per una VPS si trova in [`infra/n8n`](infra/n8n). Quando sono presenti `N8N_WEBHOOK_URL` e `N8N_WEBHOOK_SECRET`, la Function inoltra il lead a n8n. Le credenziali SMTP restano cifrate dentro n8n e non arrivano mai al browser o al repository.

## Verifica delle interazioni e del responsive

Dopo aver avviato l’anteprima locale sulla porta 4173, in un altro terminale:

```bash
npm ci
npx playwright install chromium
npm test
npm run test:browser
```

Il controllo browser prova le tre pagine a 10 dimensioni (320–1920 px), i collegamenti desktop e mobile, apertura/chiusura del menu e ridimensionamento, ingresso nel tour, compilazione e validazione del modulo. Le risposte di invio sono simulate: i test non spediscono email. `SITE_URL` permette di scegliere un indirizzo di anteprima diverso; `BROWSER_PATH` permette di usare un Chromium già installato.

La navigazione condivisa è in `navigation.js`. Il menu con attributo `hidden` deve sempre avere `display: none`: uno strato trasparente ma presente bloccherebbe nuovamente link e campi.
