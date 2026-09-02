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
