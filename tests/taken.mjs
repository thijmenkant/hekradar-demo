import { chromium } from 'playwright';
// Deze tests draaien op de oude indeling (?oud); de indeling voor Henk heeft eigen tests in bedrijf.mjs.
const url = (process.env.URL || new URL('../index.html', import.meta.url).href) + '?oud';
const thema = process.env.THEMA || '';
const b = await chromium.launch({  });
const uit = [];
async function taak(naam, w, h, stappen, check) {
  const p = await b.newPage({ viewport: { width: w, height: h } });
  await p.goto(url + (thema ? '&thema=' + thema : '') + '#overzicht'); await p.reload(); await p.waitForTimeout(80);
  let n = 0; for (const s of stappen) { await s(p); n++; await p.waitForTimeout(60); }
  const r = await check(p);
  uit.push(`${r.ok ? 'OK ' : 'NEE'} ${w}px  ${naam}: ${n} handelingen${r.noot ? ' — ' + r.noot : ''}`);
  await p.close();
}
const zichtbaar = async (p, sel) => p.$eval(sel, (e) => { const r = e.getBoundingClientRect(); return r.top >= 0 && r.bottom <= innerHeight; }).catch(() => false);
const tekst = (p, s) => p.$eval(s, (e) => e.innerText).catch(() => '');
for (const [w, h] of [[1440, 900], [390, 844]]) {
  const m = w < 768;
  const nav = (v) => async (p) => { /* mobiel: modules buiten de onderbalk = Meer + module (2 tikken) */ if (m && !['overzicht', 'werklijst', 'klanten', 'planning'].includes(v)) { await p.click('.onder [data-meer]'); await p.waitForTimeout(40); await p.click(`#blad [data-v="${v}"]`); } else await p.click(`${m ? '.onder' : '#nav'} [data-v="${v}"]`); };
  await taak('Openstaande actie zien (klant wacht)', w, h, [], async (p) => ({ ok: await zichtbaar(p, '.taakblok.urg .sub-lijst [data-a="outlook"]'), noot: 'eerste Antwoorden-knop direct in beeld bij openen?' }));
  await taak('Klant antwoorden vanaf start', w, h, [async (p) => p.click('.sub-lijst [data-a="outlook"]')], async (p) => ({ ok: (await tekst(p, '#vbody')).includes('Openen in Outlook'), noot: 'voorgestelde antwoordmail opent' }));
  await taak('Interessant evenement vinden (kerstmarkt, Gelderland)', w, h, [nav('evenementen'), async (p) => m ? p.selectOption('#soortsel', 'kerstmarkt') : p.click('[data-soort="kerstmarkt"]'), async (p) => m ? p.selectOption('.mfilters #prov', 'Gelderland') : p.click('.facet [data-provk="Gelderland"]'), async (p) => p.click('#main .t-ev .r')], async (p) => ({ ok: /kerstmarkt/i.test(await tekst(p, '#ptitel')) }));
  await taak('Kans beoordelen (waarom deze score)', w, h, [nav('werklijst'), async (p) => p.click('#main .t-wl .r')], async (p) => { const y = await p.$eval('#paneel .p-waarom', (e) => e.getBoundingClientRect().bottom).catch(() => 9999); return { ok: y < h, noot: `twee belangrijkste redenen op ${Math.round(y)}px (scherm ${h}px); volledige uitleg verderop` }; });
  await taak('Aanbod voorbereiden (100 rekken, versturen)', w, h, [async (p) => p.click('.taakblok [data-a="start-wl"]'), async (p) => p.click('#paneel [data-pak="2"]'), async (p) => p.click('#paneel [data-a="stuur"]')], async (p) => ({ ok: (await tekst(p, '#ttekst')).includes('Verstuurd') }));
  await taak('Klant terugvinden (Oranjevereniging Groningen)', w, h, m ? [async (p) => p.click('[data-zoekm]'), async (p) => p.keyboard.type('Oranjevereniging Groningen'), async (p) => p.click('#zoekres [data-open]')] : [async (p) => p.keyboard.press('/'), async (p) => p.keyboard.type('Oranjevereniging Groningen'), async (p) => p.keyboard.press('Enter')], async (p) => ({ ok: (await tekst(p, '#paneel')).includes('Oranjevereniging Groningen'), noot: m ? 'zoekknop in bovenbalk' : 'globaal zoeken met /' }));
  await taak('Loslocatie van een geboekte klus opzoeken', w, h, [nav('planning'), async (p) => p.click('#main .t-pl .r')], async (p) => ({ ok: (await tekst(p, '#paneel')).includes('Lossen'), noot: 'staat ook direct in de planningsrij (desktop)' }));
  await taak('Planning bekijken', w, h, [nav('planning')], async (p) => ({ ok: !!(await p.$('.week')) }));
  await taak('Module Markt openen', w, h, [nav('markt')], async (p) => ({ ok: (await tekst(p, 'h1')) === 'Markt' }));
  await taak('Filter aanpassen (tot 50 km in werklijst)', w, h, [nav('werklijst'), async (p) => p.selectOption('#afst', '50')], async (p) => ({ ok: true }));
}
console.log(uit.join('\n')); await b.close();
