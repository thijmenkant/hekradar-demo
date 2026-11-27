import { chromium } from 'playwright';
// Deze tests draaien op de oude indeling (?oud); de indeling voor Henk heeft eigen tests in bedrijf.mjs.
const url = (process.env.URL || new URL('../index.html', import.meta.url).href) + '?oud';
const b = await chromium.launch({  });
let ok = 0, fout = 0; const t = (naam, c) => { if (c) ok++; else { fout++; console.log('FAAL:', naam); } };
const fouten = [];
const txt = (p, s) => p.$eval(s, (e) => e.textContent).catch(() => '');
const n = (p, s) => p.$$eval(s, (l) => l.length);
const naar = async (p, v) => { await p.goto(url + '#' + v); await p.reload(); await p.waitForTimeout(60); };
const esc = async (p) => { if (await n(p, '#paneel')) { await p.keyboard.press('Escape'); await p.waitForTimeout(40); } };

for (const [w, h] of [[1440, 900], [1024, 768], [768, 1024], [390, 844]]) {
  const p = await b.newPage({ viewport: { width: w, height: h } }); await p.route(/unpkg\.com|pdok\.nl/, (r) => r.abort()); p.on('pageerror', (e) => fouten.push(w + ' ' + e.message));
  const W = `[${w}] `, mob = w < 768;
  await naar(p, 'overzicht');
  // Overzicht: signalen en taken
  t(W + 'geen dubbele signaalbalk', await n(p, '.sig') === 0);
  t(W + 'Nu doen-blokken', (await txt(p, '.taakblok.urg')).includes('Klanten wachten op je antwoord') && await n(p, '.taakblok') === 4);
  await p.click('.taakblok [data-kt="antwoord"]'); await p.waitForTimeout(50);
  t(W + 'signaal antwoord → Klanten', (await p.evaluate(() => location.hash)) === '#klanten');
  // Detail vanuit overzicht: bladeren blijft binnen de eigen lijst; klantpagina via de knop in de mail
  await naar(p, 'overzicht'); await p.click('.sub-lijst .r[data-open] >> nth=3'); await p.waitForTimeout(60);
  t(W + 'bladeren binnen mail-lijst (1 van 4)', (await txt(p, '.p-kop .pos')) === '1 van 4');
  await p.click('#paneel .mknop'); await p.waitForTimeout(60);
  t(W + 'Bekijk en boek opent klantpagina', await p.isVisible('.venster.breed .klantpagina') && (await txt(p, '.adresbalk')).includes('fietsenrekhuren.com/boek/'));
  await p.selectOption('#fbok', '2'); t(W + 'samenvatting volgt aantal', (await txt(p, '#fsamaantal')).startsWith('100') && (await txt(p, '#ftot')).includes('600'));
  await p.keyboard.press('Escape'); await p.waitForTimeout(40);
  t(W + 'Esc sluit klantpagina, paneel blijft', !(await p.isVisible('#scherm.open')) && await n(p, '#paneel') === 1);
  await p.click('#paneel .klantzicht .btn'); await p.waitForTimeout(40); t(W + 'knop Boekpagina bekijken', await p.isVisible('.klantpagina'));
  await p.keyboard.press('Escape');
  // Doorwerken vanaf overzicht
  await naar(p, 'overzicht'); await p.click('.taakblok [data-a="start-wl"]'); await p.waitForTimeout(80);
  t(W + 'doorwerken opent werklijst + paneel', (await p.evaluate(() => VIEW)) === 'werklijst' && (await txt(p, '.p-kop .pos')).startsWith('1 van'));
  const rijen = await n(p, '#main .t-wl .r'), titel1 = await txt(p, '#ptitel');
  await p.click('#paneel [data-a="stuur"]'); await p.waitForTimeout(80);
  t(W + 'versturen → volgende', (await txt(p, '#ptitel')) !== titel1 && (await txt(p, '#ttekst')).includes('volgende geopend'));
  t(W + 'lijst korter', await n(p, '#main .t-wl .r') === rijen - 1);
  await p.click('#tundo'); await p.waitForTimeout(80);
  t(W + 'ongedaan', await n(p, '#main .t-wl .r') === rijen && (await txt(p, '#ptitel')) === titel1);
  await p.click('#paneel [data-pak="2"]'); await p.waitForTimeout(40);
  t(W + 'aantal → mail', (await txt(p, '#paneel .mail .pr')).includes('100 fietsenrekken'));
  // Klantformulier op factuur
  await p.click('#paneel [data-a="probeer"]'); await p.waitForTimeout(60);
  await p.click('#fknop'); t(W + 'validatie losplek', (await txt(p, '#ffout')).includes('losplek'));
  await p.waitForSelector('#kaartje', { timeout: 15000 }); t(W + 'zonder internet: schets + uitleg', (await txt(p, '.demomelding')).includes('geblokkeerd') && !(await p.isVisible('#fadres')));
  await p.click('#kaartje', { position: { x: 80, y: 60 } }); t(W + 'losplek gekozen', (await txt(p, '#loscoord')).includes('gekozen'));
  await p.fill('#fnaam', 'Test'); await p.fill('#ftel', '0612345678'); await p.click('#fknop'); t(W + 'validatie bouwplek', (await txt(p, '#ffout')).includes('stap 3'));
  await p.click('#bschets', { position: { x: 40, y: 60 } }); await p.click('#bschets', { position: { x: 200, y: 70 } }); t(W + 'lijn getekend', (await n(p, '#bschets polyline')) === 2 && (await txt(p, '#bstatus')).includes('1 lijn'));
  await p.click('[data-teken="nieuw"]'); await p.click('#bschets', { position: { x: 60, y: 150 } }); await p.click('[data-teken="ongedaan"]'); await p.click('#bschets', { position: { x: 60, y: 160 } }); await p.click('#bschets', { position: { x: 220, y: 170 } });
  await p.click('[data-teken="klaar"]'); t(W + 'tekening klaar', (await txt(p, '#bstatus')).includes('Tekening klaar: 2 lijnen') && await p.isDisabled('[data-teken="wis"]'));
  await p.click('#bschets', { position: { x: 300, y: 30 } }); t(W + 'na klaar niet meer tekenen', (await n(p, '#bschets circle')) === 0); await p.fill('#fnaam', 'Test'); await p.fill('#ftel', '0612345678');
  await p.check('input[value="factuur"]'); await p.check('#fok'); await p.click('#fknop');
  t(W + 'factuurmail verplicht', (await txt(p, '#ffout')).includes('factuur'));
  await p.fill('#fmail', 'pen@club.voorbeeld'); await p.fill('#fdat', '2027-05-01'); await p.click('#fknop'); await p.waitForTimeout(50);
  t(W + 'geboekt', (await txt(p, '#vbody')).includes('Geboekt, factuur volgt'));
  t(W + 'gekozen datum komt in de boeking', (await p.evaluate((nm) => DB.alle().find((y) => y.naam === nm && y.s === 'geboekt').datum, titel1)) === '2027-05-01');
  await p.click('#vbody [data-v="klanten"]'); await p.waitForTimeout(80);
  await p.evaluate((nm) => { const x = DB.alle().find((y) => y.naam === nm && y.s === 'geboekt'); ga('detail', x.id); }, titel1); await p.waitForTimeout(60); { const pt = await txt(p, '#paneel'), pl = await n(p, '#pbouw svg polyline'); t(W + 'Henk ziet bouwplek', pt.includes('2 rijen getekend') && pl === 4); if (!pt.includes('2 rijen')) console.log(pt.slice(0, 300), pl); } await p.evaluate(() => sluit()); await p.evaluate(() => ga('klanten')); await p.waitForTimeout(40);
  t(W + 'boeking staat bij Klanten', (await txt(p, '#main')).includes(titel1));
  await p.evaluate(() => ga('planning')); await p.waitForTimeout(40); t(W + 'boeking staat in Planning', (await txt(p, '#main')).includes(titel1) && await n(p, '#main .t-pl .r') === 10);
  // Klanten: herinnering + lijstweergave
  await naar(p, 'klanten');
  if (mob) await p.click('[data-ktab="verstuurd"]');
  const her = await p.$('#main [data-a="herinner"]'); t(W + 'herinneringknop', !!her);
  if (her) { const hid = await her.getAttribute('data-id'); await her.click(); await p.waitForTimeout(40);
    t(W + 'herinnering: eerst voorbeeldmail', await p.evaluate((i) => document.querySelector('#scherm').classList.contains('open') && /Beste/.test(document.querySelector('#hertekst').value) && !DB.vind(+i).herinnerd, hid));
    await p.click('#vbody [data-a="herinner-stuur"]'); await p.waitForTimeout(40);
    t(W + 'herinnering pas na versturen', (await txt(p, '#ttekst')).includes('Herinnering') && await p.evaluate((i) => !!DB.vind(+i).herinnerd, hid)); }
  if (!mob) { await p.click('[data-kw="lijst"]'); await p.click('[data-ktab="geleverd"]'); await p.waitForTimeout(40);
  t(W + 'lijstweergave geleverd', await n(p, '#main .t-kl .r') >= 7); }
  else { await p.click('[data-ktab="geleverd"]'); await p.waitForTimeout(40); t(W + 'mobiel fase geleverd', await n(p, '.kolom.mob-on .deal') >= 7); }
  // Evenementen: later + terughalen, filters
  await naar(p, 'evenementen');
  await p.click('#main .t-ev .r'); await p.waitForTimeout(50); const lt = await txt(p, '#ptitel');
  await p.click('#paneel [data-a="later"]'); await p.waitForTimeout(50); await esc(p);
  t(W + 'filter Weggezet verschijnt', await n(p, '.facet [data-st="later"]') === 1);
  await p.click('[data-st="later"]'); await p.waitForTimeout(40); await p.click('#main .t-ev .r'); await p.waitForTimeout(40);
  t(W + 'later item', (await txt(p, '#ptitel')) === lt);
  await p.click('#paneel [data-a="terughalen"]'); await p.waitForTimeout(40); await esc(p);
  t(W + 'terughalen', await n(p, '[data-st="later"]') === 0);
  const alle = await n(p, '#main .t-ev .r');
  await p.selectOption(mob ? '.mfilters #afst' : '.facet fieldset:not(.mfilters) #afst', '50'); await p.waitForTimeout(40);
  const kms = await p.$$eval('#main .t-ev .r', (l) => l.map((r) => { const m = r.textContent.match(/± (\d+) km/); return m ? +m[1] : 0; }));
  t(W + 'afstandfilter', kms.every((k) => k <= 50) && kms.length < alle);
  await naar(p, 'evenementen');
  if (mob) await p.selectOption('#soortsel', 'kerstmarkt'); else await p.click('[data-soort="kerstmarkt"]');
  await p.waitForTimeout(40);
  const nm = await p.$$eval('#main .t-ev .c-naam b', (l) => l.map((e) => e.textContent));
  t(W + 'soortfilter', nm.length > 0 && nm.every((x) => /kerstmarkt/i.test(x)));
  await p.fill('#zoek', 'almkerk'); await p.waitForTimeout(40);
  t(W + 'zoeken in lijst', await n(p, '#main .t-ev .r') === 1 && await p.evaluate(() => document.activeElement.id === 'zoek'));
  // Bouw: gebeld verplaatst naar 'Gebeld of later'
  await naar(p, 'bouw'); const voor = await n(p, '#main .tl .r');
  await p.click('#main .tl .r'); await p.click('#paneel [data-a="gebeld"]'); await p.waitForTimeout(40);
  t(W + 'bouw gebeld', (await txt(p, '#paneel')).includes('Gebeld op')); await esc(p);
  t(W + 'groep Gebeld', (await txt(p, '#main')).includes('Gebeld of later') && await n(p, '#main .tl .r') === voor);
  // Instellingen
  await naar(p, 'instellingen'); t(W + 'opslaan uit', await p.isDisabled('#opknop'));
  await p.fill('#i1', '€320'); t(W + 'opslaan aan', !(await p.isDisabled('#opknop')));
  // Navigatie mobiel via Meer
  if (mob) { await p.click('.onder [data-meer]'); await p.waitForTimeout(40); t(W + 'meer-menu open', await p.isVisible('#meerblad.open')); await p.click('#blad [data-v="markt"]'); await p.waitForTimeout(40); t(W + 'naar markt via meer', (await p.evaluate(() => VIEW)) === 'markt'); }
  if (mob) { await naar(p, 'overzicht'); await p.click('[data-zoekm]'); await p.keyboard.type('Gorinchem'); await p.waitForTimeout(40); t(W + 'mobiel zoeken opent', await n(p, '#zoekres [data-open]') > 1); await p.click('#zoekres [data-open]'); await p.waitForTimeout(60); t(W + 'mobiel zoekresultaat opent paneel', await n(p, '#paneel') === 1); }
  // Kans-uitleg direct zichtbaar
  await naar(p, 'werklijst'); await p.click('#main .t-wl .r'); await p.waitForTimeout(60); t(W + 'kans-uitleg in beeld', await p.$eval('.p-waarom', (e) => e.getBoundingClientRect().bottom < innerHeight).catch(() => false));
  // Overloop
  for (const v of ['overzicht', 'werklijst', 'evenementen', 'bouw', 'klanten', 'planning', 'markt', 'resultaten', 'werkwijze', 'instellingen']) {
    await naar(p, v); t(W + 'geen horizontale scroll ' + v, (await p.evaluate(() => document.documentElement.scrollWidth - innerWidth)) <= 0);
  }
  await naar(p, 'evenement-3'); t(W + 'deeplink', await n(p, '#paneel') === 1);
  await p.close();
}
// Toetsenbord + globaal zoeken (desktop)
const p = await b.newPage({ viewport: { width: 1440, height: 900 } }); p.on('pageerror', (e) => fouten.push('kb ' + e.message));
await naar(p, 'werklijst');
await p.keyboard.press('j'); t('j focust rij', await p.evaluate(() => document.activeElement.classList.contains('r')));
await p.keyboard.press('j'); await p.keyboard.press('Enter'); await p.waitForTimeout(40); t('Enter opent 2e', (await txt(p, '.p-kop .pos')).startsWith('2 van'));
await p.keyboard.press('j'); await p.waitForTimeout(40); t('j volgende', (await txt(p, '.p-kop .pos')).startsWith('3 van'));
await p.keyboard.press('k'); await p.waitForTimeout(40); t('k vorige', (await txt(p, '.p-kop .pos')).startsWith('2 van'));
await p.keyboard.press('Escape'); await p.waitForTimeout(40); t('Esc focus terug', await p.evaluate(() => document.activeElement.classList.contains('r')));
await p.keyboard.press('/'); t('/ globaal zoeken', await p.evaluate(() => document.activeElement.id === 'gzoek'));
await p.keyboard.type('Gorinchem'); await p.waitForTimeout(40);
t('zoekresultaten gegroepeerd', (await txt(p, '#zoekres')).includes('Evenementen') && await n(p, '#zoekres [data-open]') > 1);
await p.keyboard.press('ArrowDown'); await p.keyboard.press('Enter'); await p.waitForTimeout(60);
t('zoekresultaat opent paneel', await n(p, '#paneel') === 1 && (await txt(p, '#ptitel')).length > 0);
await p.keyboard.press('Escape'); await naar(p, 'evenementen'); await p.click('[data-sort="datum"]'); t('sorteren kolomkop', (await txt(p, '[aria-sort]')).includes('Datum'));
console.log(`${ok} geslaagd, ${fout} mislukt`); if (fouten.length) console.log(fouten.join('\n'));
await b.close();
