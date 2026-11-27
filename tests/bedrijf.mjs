// Bedrijfsregels uit de audit van 27 nov 2026: voorraad, afsluiten, afmelden, adres op naam, vastgelegde mail,
// besteltermijn, afstand, feestdagen, vaste klant en "bel me". Draait zonder internet (kaart valt terug op de schets).
import { chromium } from 'playwright';
const url = process.env.URL || new URL('../index.html', import.meta.url).href;
const b = await chromium.launch();
let ok = 0, fout = 0; const t = (naam, c) => { if (c) ok++; else { fout++; console.log('FAAL:', naam); } };
const fouten = [];
const nieuw = async () => {
  const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
  await p.route(/unpkg\.com|pdok\.nl/, (r) => r.abort()); p.on('pageerror', (e) => fouten.push(e.message));
  await p.goto(url + '#werklijst'); await p.waitForTimeout(80); return p;
};
const txt = (p, s) => p.$eval(s, (e) => e.textContent).catch(() => '');
const open = (p, id) => p.evaluate((i) => ga('detail', i), id).then(() => p.waitForTimeout(60));
const vind = (p, f, a) => p.evaluate(f, a);

let p = await nieuw();
// Afstand: geen klif meer bij 150 km; feestdagen; geen koude lead voor een klant die al geleverd is
t('75–150 km kost punten', await vind(p, () => kans(E.find((x) => x.naam === 'Nieuwjaarsloop Maastricht')).redenen.some(([n, r]) => n === -10 && r.startsWith('ver,'))));
t('carnaval volgend jaar op carnavalszondag', await vind(p, () => E.find((x) => x.naam === 'Carnavalsoptocht Woudrichem' && x.vast).datum) === '2027-02-07');
t('Koningsdag volgend jaar op 27 april', await vind(p, () => E.find((x) => x.naam === 'Koningsdag Werkendam' && x.vast).datum) === '2027-04-27');
t('geen dubbele lead voor geleverde klant', await vind(p, () => E.filter((x) => x.naam === 'Sinterklaasintocht Gorinchem' && x.datum < '2027-01-01').length) === 1);
// Besteltermijn per soort: de werklijst ziet meer dan de oude 10 weken
t('werklijst volgt besteltermijn', await vind(p, () => voorraad().klaar.some((x) => dagenTot(x.datum) > 70)));

// Voorraad: dag volboeken, dan geen aanbod meer en het formulier weigert
const vol = await vind(p, () => { const x = voorraad().klaar.find((y) => !y.vast); VOORRAAD_BOK = x.bokken; const z = E.find((y) => y.s === 'geboekt'); z.datum = x.datum; return x.id; });
await open(p, vol);
t('paneel: geen rekken vrij', (await txt(p, '#paneel')).includes('Geen rekken vrij'));
t('kans −30 bij vol', await vind(p, () => kans(DB.vind(DETAIL)).redenen.some(([n]) => n === -30)));
await p.click('#paneel [data-a="probeer"]'); await p.waitForTimeout(150);
t('formulier: alle rekken verhuurd', (await txt(p, '#fbok')).includes('alle rekken verhuurd'));
await p.click('#kaartje', { position: { x: 80, y: 60 } }); await p.check('#fbelme'); await p.fill('#fnaam', 'Test'); await p.fill('#ftel', '0612345678'); await p.check('#fok'); await p.click('#fknop');
t('boeken geweigerd bij vol', (await txt(p, '#ffout')).includes('niet genoeg rekken'));
await p.close();

// Afmelden via de link in de mail
p = await nieuw();
const am = await vind(p, () => voorraad().klaar[0].id); const voor = await vind(p, () => voorraad().klaar.length);
await open(p, am); await p.click('#paneel .mail [data-a="afmeld"]'); await p.waitForTimeout(60);
t('afgemeld: niet meer versturen', !(await p.$('#paneel [data-a="stuur"]')) && (await txt(p, '#paneel')).includes('Afgemeld.'));
t('afgemeld: uit de werklijst', await vind(p, () => voorraad().klaar.length) === voor - 1);
// Adres op naam: bellen, niet mailen
const pn = await vind(p, () => { const x = voorraad().klaar[0]; x.org = Object.assign({}, x.org, { email: 'jan.devries@club.voorbeeld' }); return x.id; });
await open(p, pn);
t('adres op naam: geen verstuurknop', !(await p.$('#paneel [data-a="stuur"]')) && (await txt(p, '#paneel')).includes('Adres op naam'));
await p.close();

// Afsluiten: verloren met reden, telefonisch geboekt, factuur betaald
p = await nieuw();
const vl = await vind(p, () => E.find((x) => x.s === 'verstuurd').id);
await open(p, vl); await p.selectOption('#paneel [data-verloren]', 'Te duur'); await p.waitForTimeout(60);
t('verloren met reden', await vind(p, () => E.find((x) => x.s === 'verloren').reden) === 'Te duur');
await p.click('#tundo'); await p.waitForTimeout(60);
t('verloren ongedaan maken', await vind(p, (i) => DB.vind(i).s, vl) === 'verstuurd');
const tg = await vind(p, () => E.find((x) => x.s === 'antwoord').id);
await open(p, tg); await p.click('#paneel [data-a="telgeboekt"]'); await p.waitForTimeout(60);
t('telefonisch geboekt staat in planning', await vind(p, (i) => voorraad().leveren.some((x) => x.id === i), tg));
const fv = await vind(p, () => voorraad().facturen.length);
t('factuur pas open na levering', await vind(p, () => voorraad().facturen.every((x) => x.s === 'geleverd')));
const fb = await vind(p, () => voorraad().facturen[0].id);
await open(p, fb); await p.click('#paneel [data-a="betaald"]'); await p.waitForTimeout(60);
t('factuur betaald telt niet meer als open', await vind(p, () => voorraad().facturen.length) === fv - 1);
// Verstuurde mail blijft zoals verstuurd
const ms = await vind(p, () => { const x = E.find((y) => y.s === 'verstuurd' && y.mail); const was = x.mail.bokken * 50; x.bokken = 6; return [x.id, was]; });
await open(p, ms[0]);
t('verstuurde mail ongewijzigd', (await txt(p, '#paneel .mail .pr')).includes(`${ms[1]} fietsenrekken`));
await p.close();

// Vaste klant: losplek van vorig jaar, en "bel me" in plaats van tekenen
p = await nieuw();
const vk = await vind(p, () => E.find((x) => x.naam === 'Nieuwjaarsloop Gorinchem' && x.vast).id);
await open(p, vk); await p.click('#paneel [data-a="probeer"]'); await p.waitForTimeout(150);
await p.check('#fvorig'); await p.check('#fbelme'); await p.fill('#fnaam', 'Test'); await p.fill('#ftel', '0612345678'); await p.check('#fok');
t('btw zichtbaar', (await txt(p, '#fbtw')).includes('inclusief 21% btw') && (await txt(p, '#fknop')).includes('€363'));
await p.click('#fknop'); await p.waitForTimeout(60);
t('vaste klant geboekt zonder kaart of tekening', await vind(p, (i) => DB.vind(i).s, vk) === 'geboekt');
await open(p, vk);
const pt = await txt(p, '#paneel');
t('Henk ziet losplek van vorig jaar en bel-verzoek', pt.includes('zoals vorig jaar') && pt.includes('Klant wil even bellen'));
await p.close();

if (fouten.length) { fout += fouten.length; console.log('JS-fouten:', fouten); }
console.log(`bedrijfsregels: ${ok} geslaagd, ${fout} mislukt`);
await b.close(); process.exit(fout ? 1 : 0);
