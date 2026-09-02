import { existsSync, readFileSync } from 'node:fs';

const pages = ['index.html', 'attico-velario.html', 'visita-privata.html'];
const documents = new Map();

for (const page of pages) {
  const content = readFileSync(page, 'utf8');
  const ids = new Set([...content.matchAll(/\sid="([^"]+)"/g)].map((match) => match[1]));
  const idCount = [...content.matchAll(/\sid="([^"]+)"/g)].length;
  if (ids.size !== idCount) throw new Error(`${page}: duplicate id found`);
  documents.set(page, { content, ids });
}

for (const [page, { content }] of documents) {
  const references = [...content.matchAll(/\s(?:href|src)="([^"]+)"/g)].map((match) => match[1]);
  for (const reference of references) {
    if (/^(https?:|mailto:|data:)/.test(reference)) continue;
    const [pathWithQuery = page, anchor] = reference.split('#');
    const [file = page] = pathWithQuery.split('?');
    const target = file || page;
    if (!documents.has(target) && !existsSync(target)) throw new Error(`${page}: missing ${reference}`);
    if (anchor && documents.has(target) && !documents.get(target).ids.has(anchor)) {
      throw new Error(`${page}: missing anchor ${reference}`);
    }
  }
}

const advisorLinks = [...documents.get('index.html').content.matchAll(/<a[^>]*href="([^"]*)"[^>]*>Parla con un advisor/g)];
if (advisorLinks.length !== 2 || advisorLinks.some(([, href]) => href !== './visita-privata.html?interesse=Consulenza')) {
  throw new Error('index.html: every "Parla con un advisor" link must open the advisor form');
}

const atticoAdvisorLinks = [...documents.get('attico-velario.html').content.matchAll(/href="([^"]*visita-privata[^"]*)"/g)];
if (atticoAdvisorLinks.length !== 3 || atticoAdvisorLinks.some(([, href]) => href !== './visita-privata.html?interesse=Attico%20Velario')) {
  throw new Error('attico-velario.html: every contact CTA must carry the Attico Velario context');
}

if (!documents.get('visita-privata.html').ids.has('advisor-form')) {
  throw new Error('visita-privata.html: the advisor form is missing');
}

console.log('Static site checks passed.');
