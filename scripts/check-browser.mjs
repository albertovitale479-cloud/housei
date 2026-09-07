import assert from 'node:assert/strict';
import { chromium } from 'playwright';

const base = process.env.SITE_URL || 'http://127.0.0.1:4173';
const browser = await chromium.launch({ headless: true, ...(process.env.BROWSER_PATH ? { executablePath: process.env.BROWSER_PATH } : {}) });
const pages = ['index.html', 'attico-velario.html', 'visita-privata.html'];
const sizes = [[320,568],[375,812],[768,1024],[820,1180],[1024,768],[1180,820],[1440,900],[1920,1080],[844,390],[1280,600]];
let clicked = 0;
try {
  for (const [width,height] of sizes) {
    const page = await browser.newPage({ viewport: {width,height}, reducedMotion: 'reduce' });
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    for (const source of pages) {
      await page.goto(`${base}/${source}`);
      await page.evaluate(() => document.fonts.ready);
      assert.equal(await page.locator('.mobile-menu').isVisible(), false, 'Closed menu must not cover content');
      const overflow = await page.evaluate(() => [...document.querySelectorAll('main h1, main h2, main h3, .property-card-title, .advisor-form, input:not([name="website"]), select, textarea')].filter(e => {
        const r = e.getBoundingClientRect();
        return r.right > innerWidth+1 || r.left < -1 || e.scrollWidth > e.clientWidth+3;
      }).map(e => e.className || e.tagName));
      assert.deepEqual(overflow, [], `${source} ${width}×${height}: overflow`);
      if (source === 'index.html') {
        const cards = await page.locator('.property-card').evaluateAll(es => es.map(e => {const r=e.getBoundingClientRect();return {left:r.left,right:r.right,top:r.top,bottom:r.bottom};}));
        assert(cards[0].right <= cards[1].left+1 || cards[0].bottom <= cards[1].top+1, 'Collection cards overlap');
        await page.locator('[data-scroll-tour]').click();
        await page.waitForFunction(() => Math.abs(document.querySelector('#tour').getBoundingClientRect().top)<2);
        await page.locator('.camera-details').click();
        assert.equal(new URL(page.url()).hash, '#casa-aurea');
      }
      if (source === 'visita-privata.html') {
        await page.locator('#name').fill('Test Housei');
        await page.locator('#email').fill('test@example.com');
        await page.locator('#message').fill('Vorrei informazioni sulla dimora.');
        assert.equal(await page.locator('#name').inputValue(), 'Test Housei');
      }
      if (width <= 820) {
        await page.locator('.menu-button').click();
        assert(await page.locator('.mobile-menu').isVisible());
        await page.keyboard.press('Escape');
        assert.equal(await page.locator('.mobile-menu').isVisible(), false);
        await page.locator('.menu-button').click();
        await page.setViewportSize({width:1440,height:900});
        await page.waitForFunction(() => document.querySelector('.mobile-menu').hidden);
        assert.equal(await page.locator('body').evaluate(e=>e.style.overflow), '');
        await page.setViewportSize({width,height});
      }
    }
    assert.deepEqual(errors, [], 'Browser JavaScript errors');
    await page.close();
    console.log(`Layout and controls: ${width}×${height} OK`);
  }

  // Follow every visible link, including card titles and mobile navigation.
  for (const width of [375,1440]) {
    const page = await browser.newPage({viewport:{width,height:900},reducedMotion:'reduce'});
    for (const source of pages) {
      await page.goto(`${base}/${source}`);
      const count = await page.locator('a').count();
      for (let i=0;i<count;i++) {
        await page.goto(`${base}/${source}`);
        const link = page.locator('a').nth(i);
        if (await link.evaluate(e=>!!e.closest('.mobile-menu'))) {
          if (width>820) continue;
          await page.locator('.menu-button').click();
        }
        if (!await link.isVisible() || await link.evaluate(e=>e.classList.contains('skip-link'))) continue;
        const expected = await link.evaluate(e=>e.href);
        await link.click();
        await page.waitForURL(expected, { timeout: 10000 });
        assert.equal(page.url(), expected);
        clicked++;
      }
    }
    await page.close();
  }

  const page = await browser.newPage({viewport:{width:1440,height:900}});
  await page.goto(`${base}/attico-velario.html`);
  await page.locator('[data-enter-attico]').click();
  await page.waitForFunction(() => document.querySelector('.property-status-word').textContent === 'Entra');
  await page.waitForFunction(() => document.querySelector('.property-hero-video').currentTime > 1);
  await page.locator('.property-details-link').click();
  await page.waitForURL(url => url.hash === '#details', { timeout: 10000 });
  await page.goto(`${base}/visita-privata.html?interesse=Consulenza#advisor-form`);
  assert.equal(await page.locator('#interest').inputValue(),'Consulenza Housei');
  await page.goto(`${base}/visita-privata.html?interesse=Attico%20Velario#advisor-form`);
  assert.equal(await page.locator('#interest').inputValue(),'Attico Velario');
  await page.locator('[type=submit]').click();
  assert.equal(await page.locator('#name').evaluate(e=>e.validity.valueMissing),true);
  await page.locator('#name').fill('Test Housei');
  await page.locator('#email').fill('test@example.com');
  await page.locator('#message').fill('Richiesta di prova, nessun invio reale.');
  await page.locator('#consent').check();
  await page.route('**/api/contact', route=>route.fulfill({status:503,contentType:'application/json',body:JSON.stringify({message:'Servizio temporaneamente non disponibile.'})}));
  await page.locator('[type=submit]').click();
  await page.waitForFunction(()=>document.querySelector('.property-form-status').dataset.state==='error');
  assert.equal(await page.locator('#name').inputValue(),'Test Housei');
  await page.route('**/api/contact', async route=>{
    const body=route.request().postDataJSON();
    assert.equal(body.interest,'Attico Velario');
    await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({message:'Richiesta di prova ricevuta.'})});
  });
  await page.locator('[type=submit]').click();
  await page.waitForFunction(()=>document.querySelector('.property-form-status').dataset.state==='success');
  assert.equal(await page.locator('#name').inputValue(),'');
  await page.close();
  console.log(`${clicked} links followed; tour, form validation, simulated success/error: OK. No real emails sent.`);
} finally {
  await browser.close();
}
