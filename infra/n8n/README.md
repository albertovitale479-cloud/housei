# Automazione lead Housei con n8n

Questa cartella prepara una singola installazione n8n con PostgreSQL e HTTPS automatico tramite Caddy. È adatta al prototipo Housei e può diventare un modello da replicare su una VPS separata per ogni cliente.

## Architettura

```text
Modulo Housei
    -> Vercel Function /api/contact
        -> webhook n8n protetto da un segreto
            -> email interna all'azienda
            -> email di conferma al potenziale cliente
            -> storico esecuzioni n8n
```

Il browser non conosce la password della casella email né il segreto del webhook. Le credenziali SMTP vengono salvate nel gestore credenziali cifrato di n8n.

## Dati necessari

- Una VPS Ubuntu con almeno 2 GB di RAM e accesso SSH.
- Un sottodominio, per esempio `automazioni.tuodominio.it`, con record DNS `A` verso l'IP della VPS.
- Una casella email con accesso SMTP. Per il prototipo può essere una Gmail dedicata; per un cliente conviene usare una casella del suo dominio.
- L'indirizzo che deve ricevere i nuovi lead.

## Avvio sulla VPS

Installa Docker Engine e il plugin Docker Compose seguendo la documentazione ufficiale del provider o di Docker. Poi copia questa cartella sulla VPS ed esegui:

```bash
cp .env.example .env
openssl rand -hex 32
openssl rand -hex 32
```

Inserisci i due valori generati in `POSTGRES_PASSWORD` e `N8N_ENCRYPTION_KEY`, imposta `N8N_HOST`, quindi avvia i servizi:

```bash
docker compose pull
docker compose up -d
docker compose ps
```

Caddy richiede che le porte 80 e 443 siano aperte e che il DNS sia già propagato. Dopo l'avvio visita `https://<N8N_HOST>` e crea l'account proprietario n8n.

## Workflow da costruire in n8n

Crea un workflow chiamato **Housei — Nuovo lead visita privata** e collega i nodi in quest'ordine:

```text
Webhook
  -> Lead normalizzato
  -> Email all'azienda
  -> Conferma al cliente
  -> Risposta al sito
```

### 1. Nodo Webhook

- Nome: `Webhook Housei`
- HTTP Method: `POST`
- Path: `housei-lead`
- Authentication: `Header Auth`
- Respond: `Using Respond to Webhook Node`

Crea una credenziale **Header Auth** con:

- Name: `X-Housei-Webhook-Secret`
- Value: un segreto generato con `openssl rand -hex 32`

Conserva il valore: andrà inserito anche in Vercel come `N8N_WEBHOOK_SECRET`.

### 2. Nodo Edit Fields

Nome: `Lead normalizzato`. Disattiva **Include Other Input Fields** e aggiungi questi campi di tipo String, salvo dove indicato:

| Campo | Espressione |
| --- | --- |
| `name` | `{{ $json.body.name }}` |
| `email` | `{{ $json.body.email }}` |
| `tel` | `{{ $json.body.tel || 'Non indicato' }}` |
| `message` | `{{ $json.body.message }}` |
| `interest` | `{{ $json.body.interest }}` |
| `source` | `{{ $json.body.source }}` |
| `submittedAt` | `{{ $json.body.submittedAt }}` |
| `requestId` | `{{ $json.body.requestId }}` |
| `consentAccepted` (Boolean) | `{{ $json.body.consentAccepted === true }}` |

### 3. Credenziale SMTP

Nel primo nodo **Send Email**, scegli **Create new credential**. Per una Gmail dedicata usa:

- User: indirizzo Gmail completo
- Password: password per applicazioni Google, non la password normale
- Host: `smtp.gmail.com`
- Port: `465`
- SSL/TLS: attivo

Salva la credenziale con il nome `SMTP Housei`. Per una casella aziendale sostituisci questi valori con quelli forniti dal suo gestore email.

### 4. Nodo Send Email per l'azienda

- Nome: `Email all'azienda`
- Credential: `SMTP Housei`
- Operation: `Send`
- From Email: `Housei <INDIRIZZO_MITTENTE>`
- To Email: indirizzo fisso dell'azienda
- Reply To: `{{ $('Lead normalizzato').item.json.email }}`
- Subject: `Nuova richiesta Housei — {{ $('Lead normalizzato').item.json.interest }}`
- Email Format: `Text`
- Append n8n Attribution: disattivo

Testo:

```text
Nuova richiesta dal sito Housei

Nome: {{ $('Lead normalizzato').item.json.name }}
Email: {{ $('Lead normalizzato').item.json.email }}
Telefono: {{ $('Lead normalizzato').item.json.tel }}
Interesse: {{ $('Lead normalizzato').item.json.interest }}

Messaggio:
{{ $('Lead normalizzato').item.json.message }}

Consenso al ricontatto: {{ $('Lead normalizzato').item.json.consentAccepted ? 'Sì' : 'No' }}
Data: {{ $('Lead normalizzato').item.json.submittedAt }}
ID richiesta: {{ $('Lead normalizzato').item.json.requestId }}
```

### 5. Nodo Send Email per il cliente

- Nome: `Conferma al cliente`
- Credential: `SMTP Housei`
- Operation: `Send`
- From Email: `Housei <INDIRIZZO_MITTENTE>`
- To Email: `{{ $('Lead normalizzato').item.json.email }}`
- Reply To: indirizzo fisso dell'azienda
- Subject: `Abbiamo ricevuto la tua richiesta — Housei`
- Email Format: `Text`
- Append n8n Attribution: disattivo

Testo:

```text
Ciao {{ $('Lead normalizzato').item.json.name }},

abbiamo ricevuto la tua richiesta per {{ $('Lead normalizzato').item.json.interest }}.
Un advisor Housei ti ricontatterà a breve.

Puoi rispondere direttamente a questa email per aggiungere informazioni.

Housei
Private real estate
```

### 6. Nodo Respond to Webhook

- Nome: `Risposta al sito`
- Respond With: `JSON`
- Response Body: `{"ok": true}`
- Response Code: `200`

Salva il workflow, premi **Listen for test event** nel Webhook e invia una richiesta di prova. Quando entrambi i nodi email funzionano, attiva il workflow e usa il **Production URL**, non il Test URL.

## Collegamento a Vercel

Dopo aver attivato il workflow, copia il suo URL di produzione. In **Vercel → Project Settings → Environment Variables** aggiungi:

- `N8N_WEBHOOK_URL`: URL di produzione del Webhook;
- `N8N_WEBHOOK_SECRET`: lo stesso valore configurato nella credenziale Header Auth di n8n.

Applica le variabili a Production e Preview e crea un nuovo deploy. Da quel momento `/api/contact` userà n8n. Se `N8N_WEBHOOK_URL` non è configurato, il modulo restituisce un messaggio di servizio non disponibile e non finge di aver inviato il lead.

## Primo collaudo

1. Invia il modulo con un indirizzo email controllato da te.
2. Verifica la conferma nel browser.
3. Controlla che l'azienda riceva tutti i dati e che il cliente riceva una sola conferma.
4. In n8n apri **Executions** e verifica che non siano presenti errori.
5. Prova un indirizzo non valido e un invio senza consenso: devono essere bloccati prima del webhook.

Non inserire password email nei nodi come testo normale, nel repository o nel file `.env.example`: salvale nel gestore credenziali di n8n. In Vercel vanno salvati soltanto l'URL e il segreto del webhook.
