// Mobiel rustig (< 768px): Vandaag past in ± 1,3 scherm, weinig knoppen, hoogstens één gevulde groene knop,
// rijen tikbaar met ›, "Als je tijd hebt" ingeklapt, evenementscherm met Organisator en Kans dicht. Desktop ongemoeid.
import { chromium } from 'playwright';
const url = process.env.URL || new URL('../index.html', import.meta.url).href;
const b = await chromium.launch();
let ok = 0, fout = 0; const t = (naam, c, info = '') => { if (c) ok++; else { fout++; console.log('FAAL:', naam, info); } };
const fouten = [];
const pagina = async (w, h, hash) => {
  const p = await b.newPage({ viewport: { width: w, height: h }, isMobile: w < 768, hasTouch: w < 768 });
  await p.route(/unpkg\.com|pdok\.nl/, (r) => r.abort()); p.on('pageerror', (e) => fouten.push(e.message));
  await p.goto(url + '#' + hash); await p.reload(); await p.waitForTimeout(150); return p;
};
// Wat echt in beeld is: elementen in een dichte <details> tellen niet mee.
const meet = (p) => p.evaluate(() => {
  const zicht = (e) => { const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0 && !e.closest('details:not([open]) > :not(summary)'); };
  const knoppen = [...document.querySelectorAll('#main .btn')].filter(zicht);
  const groen = knoppen.filter((e) => { const c = getComputedStyle(e).backgroundColor.match(/\d+/g).map(Number); return (c.length < 4 || c[3] > 0) && c[1] > c[0] + 30 && c[1] > c[2] + 20; });
  const pad = parseFloat(getComputedStyle(document.querySelector('.inhoud')).paddingBottom);
  return { schermen: (document.scrollingElement.scrollHeight - pad) / innerHeight, knoppen: knoppen.length, groen: groen.length };
});

let p = await pagina(390, 844, 'vandaag');
const m = await meet(p);
t('vandaag: ± 1,3 scherm hoog', m.schermen <= 1.4, m.schermen.toFixed(2));
t('vandaag: hoogstens 8 knoppen', m.knoppen <= 8, m.knoppen);
t('vandaag: hoogstens één gevulde groene knop', m.groen <= 1, m.groen);
t('vandaag: "Als je tijd hebt" ingeklapt', await p.evaluate(() => [...document.querySelectorAll('.klapregel')].length >= 2 && [...document.querySelectorAll('.klapregel')].every((d) => !d.open)));
t('vandaag: klapregel met aantal', /^\d+ nieuwe klanten mailen$/.test(await p.$eval('.klapregel[data-klap="mails"] > summary', (e) => e.textContent.trim())));
await p.click('.klapregel[data-klap="mails"] > summary'); await p.waitForTimeout(80);
t('vandaag: tikken klapt uit', await p.evaluate(() => document.querySelector('.klapregel[data-klap="mails"]').open && document.querySelectorAll('.klapregel[data-klap="mails"] .tr.r').length > 0));
t('rij: twee regels, geen knop behalve Antwoorden', await p.evaluate(() => [...document.querySelectorAll('#main .tr.r')].filter((r) => r.offsetParent).every((r) => {
  const knop = [...r.querySelectorAll('.btn')].filter((b) => b.offsetParent); const m2 = r.querySelector('.m2');
  return m2 && getComputedStyle(m2).display === 'block' && knop.every((b) => b.dataset.a === 'outlook');
})));
t('rij: tekst niet afgekapt', await p.evaluate(() => [...document.querySelectorAll('#main .tr.r .c-naam b, #main .tr.r .m2')].filter((e) => e.offsetParent).every((e) => e.scrollWidth <= e.clientWidth + 1)));
t('rij: hoogte minstens 56px', await p.evaluate(() => [...document.querySelectorAll('#main .tr.r')].filter((r) => r.offsetParent).every((r) => r.getBoundingClientRect().height >= 56)));
t('blokkop: getal zonder gekleurd vakje', await p.evaluate(() => [...document.querySelectorAll('.tb-n')].every((e) => getComputedStyle(e).backgroundColor === 'rgba(0, 0, 0, 0)')));
t('menubalk: badge alleen bij Vandaag', await p.evaluate(() => [...document.querySelectorAll('#onder em')].filter((e) => getComputedStyle(e).display !== 'none').every((e) => e.closest('[data-v="vandaag"]'))));
t('demo-melding op één regel', await p.evaluate(() => document.querySelector('.demo').getBoundingClientRect().height < 34));
t('zijmarge 16px', await p.evaluate(() => parseFloat(getComputedStyle(document.querySelector('.inhoud')).paddingLeft) === 16));
await p.close();

p = await pagina(390, 844, 'evenementen');
await p.click('.t-ev .tr.r'); await p.waitForTimeout(200);
t('evenement: Organisator en Waarom deze kans dicht', await p.evaluate(() => ['organisator', 'kans'].every((k) => { const d = document.querySelector(`#paneel details[data-klap="${k}"]`); return d && !d.open; })));
await p.click('#paneel details[data-klap="organisator"] > summary'); await p.waitForTimeout(80);
t('evenement: Organisator klapt open', await p.evaluate(() => document.querySelector('#paneel details[data-klap="organisator"]').open));
await p.close();

// Desktop: geen klapregels, geen tweede regel, alles open
p = await pagina(1440, 900, 'vandaag');
t('desktop: geen klapregels en geen tweede regel', await p.evaluate(() => !document.querySelector('.klapregel') && [...document.querySelectorAll('.m2')].every((e) => getComputedStyle(e).display === 'none')));
await p.evaluate(() => ga('evenementen')); await p.waitForTimeout(80); await p.click('.t-ev .tr.r'); await p.waitForTimeout(150);
t('desktop: Organisator gewoon open', await p.evaluate(() => !document.querySelector('#paneel details.klap') && [...document.querySelectorAll('#paneel .sectie > h2')].some((h) => h.textContent.startsWith('Organisator'))));
await p.close();

if (fouten.length) { fout += fouten.length; console.log('JS-fouten:', fouten); }
console.log(`mobiel: ${ok} geslaagd, ${fout} mislukt`);
await b.close(); process.exit(fout ? 1 : 0);
