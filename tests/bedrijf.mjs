// Bedrijfsregels uit de audit van 27 nov 2026: voorraad, afsluiten, afmelden, adres op naam, vastgelegde mail,
// besteltermijn, afstand, feestdagen, vaste klant en "bel me". Draait zonder internet (kaart valt terug op de schets).
import { chromium } from 'playwright';
// Deze tests draaien op de oude indeling (?oud); de indeling voor Henk heeft eigen tests in bedrijf.mjs.
const url = (process.env.URL || new URL('../index.html', import.meta.url).href) + '?oud';
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

// Indeling voor Henk (?henk): drie schermen, werkbon, oude namen verwijzen door
p = await b.newPage({ viewport: { width: 1440, height: 900 } }); await p.route(/unpkg\.com|pdok\.nl/, (r) => r.abort()); p.on('pageerror', (e) => fouten.push(e.message));
await p.goto(url.replace(/index\.html.*/, 'index.html?henk') + '#vandaag'); await p.waitForTimeout(100);
t('henk: vijf schermen in het menu', (await p.$$eval('#nav .groep .ni', (l) => l.map((e) => e.dataset.v))).join() === 'vandaag,evenementen,klanten,agenda,cijfers');
t('henk: eerst en als je tijd hebt', (await txt(p, '#main')).includes('Eerst doen') && (await txt(p, '#main')).includes('Als je tijd hebt'));
await p.evaluate(() => ga('evenementen')); await p.waitForTimeout(60);
t('henk: tabbladen Evenementen en Bouw', (await p.$$eval('#main .tabs [data-v]', (l) => l.map((e) => e.dataset.v))).join() === 'evenementen,bouw');
t('henk: geen bouwprojecten tussen de evenementen', await p.evaluate(() => !HUIDIG.some((i) => DB.vind(i).s === 'bouw')));
await p.click('#main .tabs [data-v="bouw"]'); await p.waitForTimeout(60);
t('henk: tabblad Bouw, menu blijft op Alle evenementen', (await p.evaluate(() => VIEW)) === 'bouw' && (await txt(p, '#nav .ni.on')).includes('Alle evenementen'));
await p.evaluate(() => ga('planning')); await p.waitForTimeout(60);
t('henk: planning verwijst naar agenda', await p.evaluate(() => VIEW) === 'agenda');
await p.click('#main [data-a="werkbon"]'); await p.waitForTimeout(60);
t('henk: werkbon opent', (await txt(p, '#vbody')).includes('Contact op de dag'));
t('voorraad is 100 bokken', await p.evaluate(() => VOORRAAD_BOK) === 100);
await p.keyboard.press('Escape');
// Nieuw vandaag: vanaf Vandaag naar de vergunningen van vannacht, een dag kiezen, en alles zien
await p.evaluate(() => ga('vandaag')); await p.waitForTimeout(60);
await p.click('#main .scanbalk [data-gev="vandaag"]'); await p.waitForTimeout(80);
const nieuwVandaag = await p.evaluate(() => HUIDIG.map((i) => DB.vind(i).gevonden));
t('nieuw vandaag: alleen vannacht gevonden', nieuwVandaag.length > 0 && nieuwVandaag.every((d) => d === '2026-11-26'));
t('nieuw vandaag: label in de lijst', (await p.$$('#main .chip-nieuw')).length === nieuwVandaag.length);
await p.fill('#gevdat', '2026-11-20'); await p.dispatchEvent('#gevdat', 'change'); await p.waitForTimeout(80);
t('dag kiezen: alleen die dag', await p.evaluate(() => GEVONDEN === '2026-11-20' && HUIDIG.length > 0 && HUIDIG.every((i) => DB.vind(i).gevonden === '2026-11-20')));
await p.click('#main .resultaat-kop [data-gev=""]'); await p.waitForTimeout(80);
t('alle evenementen: ook wie al klant is', await p.evaluate(() => GEVONDEN === '' && HUIDIG.some((i) => KLANT.includes(DB.vind(i).s))));
t('scan rechtsboven: radar met de gegevens van vannacht', (await txt(p, '#main .scanblok')).includes('Scan vannacht 03:15') && !!(await p.$('#main .scanblok .radar')) && !(await p.$('#top .radar')));
await p.click('#main .scanblok [data-gev="vandaag"]'); await p.waitForTimeout(80);
t('scan rechtsboven: link naar nieuw vandaag', await p.evaluate(() => GEVONDEN === 'vandaag'));
await p.close();

// Antwoord op een klant: de logica herkent de vraag en stelt een mail voor; Henk vult [stukken] in en verstuurt zelf
p = await nieuw();
t('antwoord: vragen herkend', await p.evaluate(() => [vraagSoort('Wat kost het als jullie ook opbouwen?')[0], vraagSoort('Kunnen we dit volgende week even bellen?')[0], vraagSoort('Klinkt goed, kunnen het er ook meer zijn?')[0], vraagSoort('Kan het wat goedkoper?')[0], vraagSoort('Hoi!')[0]].join()) === 'opbouw,bellen,meer,prijs,anders');
t('antwoord: opbouwen geeft twee versies', await p.evaluate(() => antwoordVoorstellen({ org: { naam: 'X' }, bokken: 1, antwoord: 'Wat kost het als jullie ook opbouwen?' }).map((v) => v.label).join()) === 'Opbouwen kost extra,Opbouwen zit erbij');
const ant = await p.evaluate(() => { const x = E.find((y) => y.s === 'antwoord' && /opbouw/i.test(y.antwoord)); return x.id; });
await open(p, ant); await p.click('#paneel [data-a="outlook"]'); await p.waitForTimeout(80);
t('antwoord: venster met herkende vraag', (await txt(p, '#vbody')).includes('Herkend: vraag over opbouwen'));
await p.click('[data-a="antw-outlook"]'); await p.waitForTimeout(40);
t('antwoord: blokkeert zolang er [ ] open staat', (await txt(p, '#antwfout')).includes('[bedrag]') && await p.evaluate((i) => DB.vind(i).s, ant) === 'antwoord');
await p.click('[data-antw="1"]'); await p.waitForTimeout(40);
t('antwoord: andere versie gekozen', (await p.inputValue('#antwtekst')).includes('zit bij de prijs inbegrepen'));
await p.click('[data-a="antw-outlook"]'); await p.waitForTimeout(80);
t('antwoord: klant wacht niet meer op Henk', await p.evaluate((i) => DB.vind(i).s === 'verstuurd' && !voorraad().antwoord.some((x) => x.id === i), ant));
await p.close();

// Datum: filteren per maand, in de kolomkop en links; meerdere maanden tegelijk
p = await nieuw();
await p.goto(url.replace(/index\.html.*/, 'index.html') + '#evenementen'); await p.reload(); await p.waitForTimeout(80);
const mnd = await p.evaluate(() => [...document.querySelectorAll('.t-ev .th [data-kf="datum"] .kolpop [data-maand]')].map((b) => b.dataset.maand).filter(Boolean));
t('datum: kolomkop heeft maanden', mnd.length >= 2 && mnd.every((m) => /^\d{4}-\d{2}$|^onbekend$/.test(m)));
await p.click('.t-ev .th [data-kf="datum"] > summary'); await p.click(`.t-ev .th [data-kf="datum"] .kolpop [data-maand="${mnd[0]}"]`); await p.waitForTimeout(40);
t('datum: filter op één maand', await p.evaluate((m) => DMAAND.join() === m && HUIDIG.length > 0 && HUIDIG.every((i) => (DB.vind(i).datum || '').startsWith(m)), mnd[0]) && !!(await p.$('.t-ev .th [data-kf="datum"].kolfilter.aan')));
t('datum: lijstje blijft open', await p.evaluate(() => document.querySelector('.t-ev .th [data-kf="datum"]').open));
await p.click(`.t-ev .th [data-kf="datum"] .kolpop [data-maand="${mnd[1]}"]`); await p.waitForTimeout(40);
t('datum: twee maanden tegelijk', await p.evaluate((ms) => DMAAND.length === 2 && ms.every((m) => HUIDIG.some((i) => (DB.vind(i).datum || '').startsWith(m))), mnd.slice(0, 2)));
t('datum: aantal klopt met de lijst', await p.evaluate(() => [...document.querySelectorAll('.t-ev .th [data-kf="datum"] .kolpop [data-maand].on span')].reduce((s, e) => s + Number(e.textContent), 0) === HUIDIG.length));
await p.click('.facet [data-maand=""]'); await p.waitForTimeout(40);
t('datum: links "Alle datums" wist de keuze', await p.evaluate(() => DMAAND.length === 0));
await p.close();

// Kolomkoppen: sorteren op elke kolom (nog eens klikken = omgekeerd) en filteren via de trechter
p = await nieuw();
await p.goto(url.replace(/index\.html.*/, 'index.html') + '#evenementen'); await p.reload(); await p.waitForTimeout(80);
await p.click('.t-ev .th [data-sort="naam"]'); await p.waitForTimeout(40);
const az = await p.evaluate(() => HUIDIG.map((i) => DB.vind(i).naam));
t('kolom: sorteren op evenement A-Z', az.length > 1 && az.every((n, i) => !i || az[i - 1].localeCompare(n, 'nl') <= 0));
await p.click('.t-ev .th [data-sort="naam"]'); await p.waitForTimeout(40);
const za = await p.evaluate(() => HUIDIG.map((i) => DB.vind(i).naam));
t('kolom: nog eens klikken draait om', za[0] === az[az.length - 1]);
await p.click('.t-ev .th .c-soort .kolfilter > summary'); await p.click('.t-ev .th .c-soort .kolpop [data-soort="kerstmarkt"]'); await p.waitForTimeout(40);
t('kolom: filter op soort', await p.evaluate(() => SOORT.join() === 'kerstmarkt' && HUIDIG.length > 0 && HUIDIG.every((i) => DB.vind(i).soort === 'kerstmarkt')) && !!(await p.$('.t-ev .th .c-soort .kolfilter.aan')));
t('kolom: provincietellingen volgen de andere filters', await p.evaluate(() => { const n = [...document.querySelectorAll('.t-ev .th .c-reg .kolpop [data-provk=""] span')][0].textContent; return Number(n) === HUIDIG.length; }));
await p.click('.t-ev .th .c-reg .kolfilter > summary'); await p.click('.t-ev .th .c-reg .kolpop [data-provk="Gelderland"]'); await p.waitForTimeout(40);
t('kolom: filter op provincie', await p.evaluate(() => PROV.join() === 'Gelderland' && HUIDIG.every((i) => DB.vind(i).prov === 'Gelderland')));
t('kolom: lijstje blijft open na een klik', await p.evaluate(() => document.querySelector('.t-ev .th .c-reg .kolfilter').open));
const tweede = await p.evaluate(() => [...document.querySelectorAll('.t-ev .th .c-reg .kolpop [data-provk]')].map((b) => b.dataset.provk).find((v) => v && v !== 'Gelderland'));
await p.click(`.t-ev .th .c-reg .kolpop [data-provk="${tweede}"]`); await p.waitForTimeout(40);
t('kolom: meerdere provincies tegelijk', await p.evaluate((tw) => PROV.length === 2 && HUIDIG.some((i) => DB.vind(i).prov === tw) && HUIDIG.some((i) => DB.vind(i).prov === 'Gelderland') && HUIDIG.every((i) => ['Gelderland', tw].includes(DB.vind(i).prov)), tweede));
await p.click(`.t-ev .th .c-reg .kolpop [data-provk="${tweede}"]`); await p.waitForTimeout(40);
t('kolom: nog eens klikken haalt vinkje weg', await p.evaluate(() => PROV.join() === 'Gelderland'));
await p.click('.t-ev .th [data-sort="kans"]'); await p.click('.t-ev .th .c-km .kolfilter > summary'); await p.click('.t-ev .th .c-km .kolpop [data-afstk="50"]'); await p.waitForTimeout(40);
await p.click('.facet [data-soort="kerstmarkt"]'); await p.waitForTimeout(40);
await p.click('.facet [data-st="klaar"]'); await p.click('.facet [data-st="verwacht"]'); await p.waitForTimeout(40);
t('links: meerdere statussen tegelijk', await p.evaluate(() => STATUS.join() === 'klaar,verwacht' && HUIDIG.length > 0 && HUIDIG.every((i) => ['klaar', 'verwacht'].includes(DB.vind(i).s)) && new Set(HUIDIG.map((i) => DB.vind(i).s)).size === 2));
t('kolom: filter op afstand', await p.evaluate(() => AFST === 50 && HUIDIG.every((i) => (DB.vind(i).km || 0) <= 50)));
await p.close();

if (fouten.length) { fout += fouten.length; console.log('JS-fouten:', fouten); }
console.log(`bedrijfsregels: ${ok} geslaagd, ${fout} mislukt`);
await b.close(); process.exit(fout ? 1 : 0);
