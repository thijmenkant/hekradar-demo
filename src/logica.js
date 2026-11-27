const VANDAAG = '2026-11-26';
const PRIJS_BOK = 300, REKKEN_BOK = 50;
// Echte telling Gemeenteblad (KOOP), publicaties 12–25 nov 2026, opgehaald 26 nov
const SCAN = { publicaties: 1175, gemeenten: 243, nogTeGaan: 446, aanvraag: 397, laatsteDag: '2026-11-25', laatsteDagAantal: 156 };
const $ = (s) => document.querySelector(s);
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const euro = (n) => '€' + Number(n).toLocaleString('nl-NL');
const dag = (d) => new Date(d + 'T12:00:00');
const datumKort = (d) => d ? dag(d).toLocaleDateString('nl-NL', { weekday: 'short', day: 'numeric', month: 'short' }) : 'datum onbekend';
const datumLang = (d) => d ? dag(d).toLocaleDateString('nl-NL', { weekday: 'long', day: 'numeric', month: 'long' }) : '';
const metJaar = (d) => dag(d).toLocaleDateString('nl-NL', { day: 'numeric', month: 'long', year: 'numeric' });
const dagenTot = (d) => Math.round((dag(d) - dag(VANDAAG)) / 864e5);
const addDag = (d, n) => { const t = dag(d); t.setDate(t.getDate() + n); return t.toISOString().slice(0, 10); };
const overDagen = (d) => { if (!d) return ''; const n = dagenTot(d); return n < 0 ? `${-n} dagen geleden` : n === 0 ? 'vandaag' : n === 1 ? 'morgen' : `over ${n} dagen`; };
const bokTekst = (b) => b == 0.5 ? 'halve bok' : b == 1 ? '1 bok' : `${String(b).replace('.', ',')} bokken`;
const BIKE = (c = '#fff', a = '#5cb85f', w = 30) => `<svg viewBox="0 0 40 26" width="${w}" height="${Math.round(w * .65)}" fill="none" stroke="${c}" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="8" cy="18" r="6"/><circle cx="32" cy="18" r="6"/><path d="M8 18l7-11h11l6 11M15 7l5 11 6-11M12 4h6"/><path d="M26 23c2 2 6 2 8 0" stroke="${a}"/></svg>`;
const PAKKET = { intocht: 0.5, kerstmarkt: 0.5, loop: 1, markt: 1, carnaval: 1, dorpsfeest: 1, overig: 1, sport: 2, festival: 2 };

// Voorbeeldgegevens: verzonnen evenementen en organisaties in echte plaatsen. Mailadressen eindigen op .voorbeeld (bestaan niet).
const PLAATSEN = [
  ['Almkerk', 'Altena', 'Noord-Brabant'], ['Woudrichem', 'Altena', 'Noord-Brabant'], ['Gorinchem', 'Gorinchem', 'Zuid-Holland'], ['Leerdam', 'Vijfheerenlanden', 'Utrecht'],
  ['Breda', 'Breda', 'Noord-Brabant'], ['Oosterhout', 'Oosterhout', 'Noord-Brabant'], ['Tilburg', 'Tilburg', 'Noord-Brabant'], ['Den Bosch', "'s-Hertogenbosch", 'Noord-Brabant'],
  ['Waalwijk', 'Waalwijk', 'Noord-Brabant'], ['Eindhoven', 'Eindhoven', 'Noord-Brabant'], ['Oss', 'Oss', 'Noord-Brabant'], ['Zaltbommel', 'Zaltbommel', 'Gelderland'],
  ['Tiel', 'Tiel', 'Gelderland'], ['Culemborg', 'Culemborg', 'Gelderland'], ['Nijmegen', 'Nijmegen', 'Gelderland'], ['Arnhem', 'Arnhem', 'Gelderland'], ['Apeldoorn', 'Apeldoorn', 'Gelderland'],
  ['Dordrecht', 'Dordrecht', 'Zuid-Holland'], ['Papendrecht', 'Papendrecht', 'Zuid-Holland'], ['Rotterdam', 'Rotterdam', 'Zuid-Holland'], ['Delft', 'Delft', 'Zuid-Holland'], ['Leiden', 'Leiden', 'Zuid-Holland'],
  ['Utrecht', 'Utrecht', 'Utrecht'], ['Houten', 'Houten', 'Utrecht'], ['Amersfoort', 'Amersfoort', 'Utrecht'], ['Haarlem', 'Haarlem', 'Noord-Holland'], ['Alkmaar', 'Alkmaar', 'Noord-Holland'],
  ['Hoorn', 'Hoorn', 'Noord-Holland'], ['Zwolle', 'Zwolle', 'Overijssel'], ['Deventer', 'Deventer', 'Overijssel'], ['Enschede', 'Enschede', 'Overijssel'], ['Almere', 'Almere', 'Flevoland'],
  ['Urk', 'Urk', 'Flevoland'], ['Groningen', 'Groningen', 'Groningen'], ['Assen', 'Assen', 'Drenthe'], ['Emmen', 'Emmen', 'Drenthe'], ['Leeuwarden', 'Leeuwarden', 'Fryslân'],
  ['Sneek', 'Súdwest-Fryslân', 'Fryslân'], ['Venlo', 'Venlo', 'Limburg'], ['Roermond', 'Roermond', 'Limburg'], ['Maastricht', 'Maastricht', 'Limburg'], ['Middelburg', 'Middelburg', 'Zeeland'], ['Goes', 'Goes', 'Zeeland'],
];
// Coördinaten (WGS84, afgerond) voor de afstand vanaf de loods in Almkerk. In de echte tool komen ze uit PDOK.
const LOC = { Almkerk: [51.771, 4.958], Woudrichem: [51.815, 5.0], Gorinchem: [51.834, 4.974], Leerdam: [51.893, 5.092], Breda: [51.589, 4.776], Oosterhout: [51.645, 4.86], Tilburg: [51.56, 5.091], 'Den Bosch': [51.699, 5.304], Waalwijk: [51.683, 5.07], Eindhoven: [51.441, 5.478], Oss: [51.765, 5.518], Zaltbommel: [51.81, 5.247], Tiel: [51.887, 5.429], Culemborg: [51.955, 5.227], Nijmegen: [51.842, 5.853], Arnhem: [51.985, 5.898], Apeldoorn: [52.211, 5.969], Dordrecht: [51.813, 4.69], Papendrecht: [51.832, 4.688], Rotterdam: [51.924, 4.478], Delft: [52.012, 4.357], Leiden: [52.16, 4.497], Utrecht: [52.091, 5.122], Houten: [52.028, 5.168], Amersfoort: [52.156, 5.388], Haarlem: [52.387, 4.646], Alkmaar: [52.632, 4.748], Hoorn: [52.643, 5.06], Zwolle: [52.517, 6.083], Deventer: [52.255, 6.163], Enschede: [52.221, 6.894], Almere: [52.371, 5.222], Urk: [52.663, 5.601], Groningen: [53.219, 6.567], Assen: [52.993, 6.564], Emmen: [52.785, 6.897], Leeuwarden: [53.201, 5.799], Sneek: [53.033, 5.659], Venlo: [51.37, 6.172], Roermond: [51.194, 5.987], Maastricht: [50.851, 5.691], Middelburg: [51.499, 3.614], Goes: [51.504, 3.889], Werkendam: [51.81, 4.894] };
// Rijafstand geschat: hemelsbreed × 1,3, afgerond op 5 km. Schatting, geen routeplanner.
function km(plaats) {
  const a = LOC.Almkerk, b = LOC[plaats]; if (!b) return null;
  const r = Math.PI / 180, dLa = (b[0] - a[0]) * r, dLo = (b[1] - a[1]) * r;
  const h = Math.sin(dLa / 2) ** 2 + Math.cos(a[0] * r) * Math.cos(b[0] * r) * Math.sin(dLo / 2) ** 2;
  return Math.max(5, Math.round(6371 * 2 * Math.asin(Math.sqrt(h)) * 1.3 / 5) * 5);
}
// [soort, naam-sjabloon, organisatie-sjabloon, maanden (1-12), bokken]
const SOORTEN = [
  ['kerstmarkt', 'Kerstmarkt {p}', 'Stichting Kerstmarkt {p}', [12], 0.5],
  ['intocht', 'Sinterklaasintocht {p}', 'Sint Nicolaas Comité {p}', [11], 0.5],
  ['carnaval', 'Carnavalsoptocht {p}', 'C.V. De {x}', [2], 1],
  ['loop', '{p} Loopt', 'AV {p}', [1, 3, 4, 5, 6], 1],
  ['sport', 'Halve marathon van {p}', 'Stichting Loopevenementen {p}', [3, 4, 5, 6], 2],
  ['dorpsfeest', 'Koningsdag {p}', 'Oranjevereniging {p}', [4], 1],
  ['markt', 'Braderie {p}', 'Ondernemersvereniging {p}', [4, 5, 6], 1],
  ['festival', 'Zomerfestival {p}', 'Stichting {x} Events', [5, 6], 2],
  ['kermis', 'Kermis {p}', 'Kermiscommissie {p}', [5, 6], 2],
  ['loop', 'Nieuwjaarsloop {p}', 'Atletiekclub {p}', [1], 1],
  ['markt', 'Paasmarkt {p}', 'Winkeliersvereniging {p}', [4], 1],
  ['sport', 'Wielerronde van {p}', 'Stichting Wielerronde {p}', [5, 6], 2],
];
const BIJNAAM = ['Narrenkappen', 'Zotte Bende', 'Vrolijke Vaart', 'Dorstige Druppels', 'Keiebijters', 'Polderpret', 'Brabantse Bonte', 'Rijnlust', 'Lichtpunt', 'Zonnekracht', 'Zandhazen', 'Waterweg'];
const slug = (s) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
function rnd(seed) { let x = seed; return () => { x = (x * 1103515245 + 12345) % 2147483648; return x / 2147483648; }; }
function bouw() {
  const r = rnd(42), E = [];
  let id = 1;
  for (let i = 0; i < 130; i++) {
    const [plaats, gem, prov] = PLAATSEN[Math.floor(r() * PLAATSEN.length)];
    const [soort, ns, os, maanden, bokken] = SOORTEN[Math.floor(r() * SOORTEN.length)];
    const x = BIJNAAM[Math.floor(r() * BIJNAAM.length)];
    const m = maanden[Math.floor(r() * maanden.length)];
    const jaar = m >= 11 ? 2026 : 2027;
    let d = 1 + Math.floor(r() * 27);
    if (soort === 'dorpsfeest') d = 27;
    if (m === 11) d = 27 + Math.floor(r() * 3);
    if (m === 12) d = 1 + Math.floor(r() * 21);
    const datum = `${jaar}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const naam = ns.replace('{p}', plaats);
    if (E.some((y) => y.naam === naam)) continue;
    const orgNaam = os.replace('{p}', plaats).replace('{x}', x);
    const p = r();
    let s = p < 0.36 ? 'klaar' : p < 0.54 ? 'zoekt' : p < 0.63 ? 'zonder' : p < 0.78 ? 'verwacht' : p < 0.86 ? 'verstuurd' : p < 0.91 ? 'antwoord' : p < 0.97 ? 'geboekt' : 'geleverd';
    if (s === 'verwacht' && dagenTot(datum) < 42) s = 'klaar';
    if (dagenTot(datum) < 0) s = 'geleverd';
    if (s === 'geleverd' && dagenTot(datum) > 0) s = 'geboekt';
    const generiek = r() < 0.25;
    const org = s === 'zoekt' ? null
      : s === 'zonder' ? { naam: orgNaam, formulier: `${slug(orgNaam)}.voorbeeld/contact`, telefoon: '06 0000 0000 (voorbeeld)' }
      : { naam: orgNaam, email: `${generiek ? 'secretariaat' : 'info'}@${slug(orgNaam)}.voorbeeld`, soort: 'algemeen', bron: `${slug(orgNaam)}.voorbeeld/contact`, zek: 78 + Math.floor(r() * 20) };
    const b = soort === 'sport' && r() < 0.3 ? 4 : bokken;
    const v = { id: id++, km: km(plaats), pub: '', naam, plaats, gem, prov, datum, fase: r() < 0.45 ? 'A' : 'V', soort, bokken: b, org, s, nieuw: r() < 0.3 };
    if (s === 'zonder') v.let = 'Alleen een contactformulier en telefoonnummer gevonden.';
    if (s === 'klaar' && r() < 0.2) v.let = 'Adres staat op een evenementenkalender, niet op hun eigen site. Check even.';
    if (s === 'verwacht') v.vorig = `${2 + Math.floor(r() * 4)} eerdere edities gevonden`;
    if (['verstuurd', 'antwoord', 'geboekt', 'geleverd'].includes(s)) v.verstuurd = '2026-11-' + String(10 + Math.floor(r() * 15)).padStart(2, '0');
    if (s === 'antwoord') v.antwoord = ['Klinkt goed, kunnen het er ook meer zijn?', 'Wat kost het als jullie ook opbouwen?', 'Kunnen we dit volgende week even bellen?'][Math.floor(r() * 3)];
    if (['geboekt', 'geleverd'].includes(s)) v.boeking = { los: ['Achteringang van het plein', 'Parkeerplaats naast de kerk', 'Bij de hoofdingang, naast de containers', 'Zijstraat bij het gemeentehuis'][Math.floor(r() * 4)], contact: 'Contactpersoon ter plaatse (voorbeeld)', prijs: b * PRIJS_BOK };
    E.push(v);
  }
  // Drie afgeronde klussen uit november, zodat het tabblad Geleverd niet leeg is (verzonnen).
  [['Sinterklaasintocht Gorinchem', 'Gorinchem', 'Gorinchem', 'Zuid-Holland', '2026-11-15', 'Stichting Sint Gorinchem', 1, 'Parkeerplaats Buiten de Waterpoort'],
   ['Lichtjesavond Werkendam', 'Werkendam', 'Altena', 'Noord-Brabant', '2026-11-21', 'Ondernemersvereniging Werkendam', 0.5, 'Bij de hoofdingang, naast de containers'],
   ['Sinterklaasintocht Zaltbommel', 'Zaltbommel', 'Zaltbommel', 'Gelderland', '2026-11-22', 'Comité Sint Zaltbommel', 1, 'Achteringang van het plein']]
    .forEach(([naam, plaats, gem, prov, datum, org, b, los]) => E.push({ id: id++, km: km(plaats), pub: '', naam, plaats, gem, prov, datum, fase: 'V', soort: 'intocht', bokken: b, s: 'geleverd', nieuw: false, verstuurd: '2026-10-' + (20 + id % 8),
      org: { naam: org, email: `info@${slug(org)}.voorbeeld`, soort: 'algemeen', bron: `${slug(org)}.voorbeeld/contact`, zek: 90 }, boeking: { los, contact: 'Contactpersoon ter plaatse (voorbeeld)', prijs: b * PRIJS_BOK } }));
  // Klussen uit het vorige seizoen (verzonnen), om "Volgend jaar" te laten zien
  [['Nieuwjaarsloop Gorinchem', 'Gorinchem', 'Gorinchem', 'Zuid-Holland', '2026-01-04', 'Atletiekclub Gorinchem', 1, 'Bij de start op de Grote Markt', 'loop'],
   ['Carnavalsoptocht Woudrichem', 'Woudrichem', 'Altena', 'Noord-Brabant', '2026-02-15', 'C.V. De Keiebijters', 1, 'Parkeerplaats aan de Kerkstraat', 'carnaval'],
   ['Koningsdag Werkendam', 'Werkendam', 'Altena', 'Noord-Brabant', '2026-04-27', 'Oranjevereniging Werkendam', 1, 'Achteringang van het plein', 'dorpsfeest'],
   ['Kerstmarkt Zaltbommel', 'Zaltbommel', 'Zaltbommel', 'Gelderland', '2025-12-13', 'Stichting Kerstmarkt Zaltbommel', 0.5, 'Zijstraat bij het gemeentehuis', 'kerstmarkt']]
    .forEach(([naam, plaats, gem, prov, datum, org, b, los, soort]) => E.push({ id: id++, km: km(plaats), pub: '', naam, plaats, gem, prov, datum, fase: 'V', soort, bokken: b, s: 'geleverd', nieuw: false, verstuurd: addDag(datum, -60),
      org: { naam: org, email: `info@${slug(org)}.voorbeeld`, soort: 'algemeen', bron: `${slug(org)}.voorbeeld/contact`, zek: 92 }, boeking: { los, contact: 'Contactpersoon ter plaatse (voorbeeld)', prijs: b * PRIJS_BOK } }));
  E.forEach((v) => { if (v.boeking) v.boeking.betaling = v.id % 3 === 0 ? 'factuur' : 'ideal'; });
  // Volgend jaar: elke geleverde klus komt 120 dagen voor de volgende editie terug als vaste klant.
  // Verwachte datum = zelfde weekdag, 52 weken later. Staat het evenement al in de scan, dan koppelen we.
  E.filter((x) => x.s === 'geleverd').forEach((x) => {
    const nd = addDag(x.datum, 364); if (dagenTot(nd) < 7) return;
    const klaarOp = addDag(nd, -120);
    const vast = { id: x.id, datum: x.datum, rekken: x.bokken * REKKEN_BOK, prijs: x.boeking.prijs };
    const al = E.find((y) => y.naam === x.naam && y.id !== x.id && Math.abs(dagenTot(y.datum) - dagenTot(nd)) <= 30);
    if (al) { Object.assign(al, { vast, klaarOp, org: x.org }); if (['zoekt', 'zonder', 'verwacht'].includes(al.s)) al.s = 'klaar'; x.volgend = al.id; return; }
    E.push({ id: id, km: x.km, pub: '', naam: x.naam, plaats: x.plaats, gem: x.gem, prov: x.prov, datum: nd, fase: 'V', soort: x.soort, bokken: x.bokken, org: x.org,
      s: dagenTot(klaarOp) <= 0 ? 'klaar' : 'gepland', nieuw: false, vast, klaarOp, verwachteDatum: true });
    x.volgend = id++;
  });
  return E;
}
// Bouw en verbouw: ECHTE projecten uit het Gemeenteblad (26 nov 2025 – 26 nov 2026), met de hand nagelezen.
// [publicatie, naam, plaats, gemeente, provincie, lat, lng, soort, van, tot, aanvrager, publicaties, opmerking]
const BOUW = [
  ['gmb-2026-123696', 'Tijdelijke rekken bij renovatie stalling station', 'Deventer', 'Deventer', 'Overijssel', 52.2567, 6.1611, 'station', '2026-03-16', '2026-10-03', 'Reimert Groep B.V.', 2, 'Renovatie van de ondergrondse fietsenstalling bij het station. De aannemer deed de melding.'],
  ['gmb-2026-276174', 'Tijdelijke stalling bij herinrichting stallingen', 'Leiden', 'Leiden', 'Zuid-Holland', 52.1674, 4.4814, 'station', null, null, null, 2, 'Herinrichting van de stalling bij Leiden UMC en de Zeezijdestalling (stationsgebied). Aangevraagd november 2025, verleend juni 2026. Periode staat niet in de publicatie.'],
  ['gmb-2026-449654', 'Tijdelijke stalling Stationsplein', 'Voorburg', 'Leidschendam-Voorburg', 'Zuid-Holland', 52.0658, 4.3594, 'station', null, null, null, 2, 'Aangevraagd juni 2026, verleend september 2026. Periode staat niet in de publicatie.'],
  ['gmb-2026-80099', 'Bouwplaats als fietsenstalling, 156 m²', 'Den Haag', "'s-Gravenhage", 'Zuid-Holland', 52.08, 4.3246, 'bouw', '2026-02-24', '2026-04-19', null, 1, 'Bij de Rijnstraat, naast Den Haag Centraal. Stond er in 2025 ook: komt mogelijk terug.'],
  ['gmb-2026-45305', 'Tijdelijke stalling afgezet met bouwhekken', 'Eindhoven', 'Eindhoven', 'Noord-Brabant', 51.4399, 5.4701, 'bouw', '2026-02-02', null, null, 1, 'Vonderweg. Afgezet met bouwhekken en een container: rekken én hekken. In 2025 ook (10 tijdelijke rekken).'],
  ['gmb-2026-474428', 'Vergroten stalling busstation', 'Made', 'Drimmelen', 'Noord-Brabant', 51.6767, 4.7956, 'station', '2026-10-12', '2026-10-30', null, 1, 'Stalling bij het busstation Adelstraat dicht tijdens het vergroten. Gemeente is opdrachtgever.'],
  ['gmb-2026-463929', 'Tijdelijke stalling bij IKC Remigius', 'Duiven', 'Duiven', 'Gelderland', 51.947, 6.018, 'school', '2026-09-18', '2028-01-01', null, 2, 'Op het grasveld bij de school, ruim 15 maanden.'],
  ['gmb-2026-354975', 'Tijdelijke stalling bij opvang', 'Gouda', 'Gouda', 'Zuid-Holland', 52.011, 4.711, 'huisvesting', '2026-07-20', '2028-07-20', null, 2, 'Antwerpseweg 2, opvang van Oekraïners. Twee jaar.'],
  ['gmb-2026-491172', 'Tijdelijke stalling, 2 jaar', 'Groningen', 'Groningen', 'Groningen', 53.1967, 6.6195, 'overig', '2026-10-19', '2028-10-19', null, 2, 'Duinkerkenstraat 99a. Verleend oktober 2026.'],
  ['gmb-2025-515703', 'Tijdelijke stalling bij school', 'Waalwijk', 'Waalwijk', 'Noord-Brabant', 51.6756, 5.0444, 'school', null, null, null, 1, 'De Gaard 4: tijdelijk hek rondom het schoolgebouw én een tijdelijke stalling. Verleend november 2025.'],
  ['gmb-2026-111917', 'Tijdelijke schoolbushalte en stalling', 'Ulvenhout', 'Breda', 'Noord-Brabant', 51.553, 4.797, 'school', null, null, null, 1, 'Mgr. Van Hooijdonkstraat. Verkeersbesluit maart 2026.'],
  ['gmb-2026-290244', 'Tijdelijke stalling bij het gemeentehuis', 'Oirschot', 'Oirschot', 'Noord-Brabant', 51.505, 5.31, 'overig', null, null, null, 1, 'St. Jorisstraat 55. Verleend juni 2026.'],
  ['gmb-2026-125130', 'Tijdelijke stalling Titanialaan', 'Heerhugowaard', 'Dijk en Waard', 'Noord-Holland', 52.6723, 4.8308, 'overig', null, null, null, 3, 'Twee aanvragen in februari, verleend maart 2026.'],
  ['gmb-2026-368058', 'Tijdelijke stalling Rijksweg', 'Staphorst', 'Staphorst', 'Overijssel', 52.6431, 6.203, 'overig', null, null, null, 2, 'Aangevraagd juni, verleend augustus 2026.'],
  ['gmb-2026-399422', 'Tijdelijke stalling Kabbelaarsbank', 'Zierikzee', 'Schouwen-Duiveland', 'Zeeland', 51.6506, 3.9036, 'overig', null, null, null, 1, 'Verleend augustus 2026.'],
  ['gmb-2026-463829', 'Tijdelijke stalling De Bloemen', 'Castricum', 'Castricum', 'Noord-Holland', 52.5513, 4.6861, 'overig', '2026-10-05', '2026-10-25', null, 1, 'Drie weken in oktober.'],
  ['gmb-2026-367382', 'Tijdelijke stalling voor bakfietsen', 'Eindhoven', 'Eindhoven', 'Noord-Brabant', 51.438, 5.4806, 'overig', null, null, null, 1, 'Heuvel Galerie (winkelcentrum). Verleend juli 2026.'],
];
const kmLL = (lat, lng) => { const a = LOC.Almkerk, r = Math.PI / 180, dLa = (lat - a[0]) * r, dLo = (lng - a[1]) * r; const h = Math.sin(dLa / 2) ** 2 + Math.cos(a[0] * r) * Math.cos(lat * r) * Math.sin(dLo / 2) ** 2; return Math.max(5, Math.round(6371 * 2 * Math.asin(Math.sqrt(h)) * 1.3 / 5) * 5); };
const bstatus = (van, tot) => tot && tot < VANDAAG ? 'afgelopen' : van ? 'loopt' : 'onbekend';
let E = bouw();
BOUW.forEach(([pub, naam, plaats, gem, prov, lat, lng, soortBouw, van, tot, aanvrager, pubs, noot], i) => E.push({
  id: 900 + i, pub, naam, plaats, gem, prov, km: kmLL(lat, lng), datum: van || null, tot, soortBouw, aanvrager, pubs, noot,
  s: 'bouw', bstatus: bstatus(van, tot), fase: 'V', soort: 'bouw', bokken: 0, org: null, nieuw: false, echt: true }));

const I = (d) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;
const ICON = {
  vandaag: I('<path d="M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/>'),
  evenementen: I('<path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/>'),
  klanten: I('<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM23 21v-2a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8"/>'),
  werkwijze: I('<circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/>'),
  instellingen: I('<circle cx="12" cy="12" r="3"/><path d="M12 1v3M12 20v3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M1 12h3M20 12h3M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1"/>'),
  mail: I('<rect x="2" y="4" width="20" height="16" rx="2"/><path d="M22 6l-10 7L2 6"/>'),
  bel: I('<path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.5 2.1L8 9.9a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.7 2z"/>'),
  antwoord: I('<path d="M9 17l-5-5 5-5M4 12h11a5 5 0 0 1 5 5v2"/>'),
  herhaal: I('<path d="M17 1l4 4-4 4M3 11V9a4 4 0 0 1 4-4h14M7 23l-4-4 4-4M21 13v2a4 4 0 0 1-4 4H3"/>'),
  kalender: I('<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>'),
  pin: I('<path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>'),
};
const STATUSNAAM = { klaar: 'mail klaar', zoekt: 'contact gezocht', zonder: 'geen mailadres', verwacht: 'jaarlijks evenement', bouw: 'bouw en verbouw', gepland: 'volgend jaar gepland', verstuurd: 'aanbod verstuurd', antwoord: 'klant antwoordde', geboekt: 'geboekt', geleverd: 'geleverd', weg: 'afgehandeld' };
const KLANT = ['verstuurd', 'antwoord', 'geboekt', 'geleverd'];
const BSTATUS = { loopt: 'loopt of komt', onbekend: 'periode onbekend', afgelopen: 'afgelopen' };
const SOORTBOUW = { station: 'station', school: 'school', huisvesting: 'huisvesting', bouw: 'bouwplaats', overig: 'overig' };
const mj = (d) => dag(d).toLocaleDateString('nl-NL', { day: 'numeric', month: 'short', year: 'numeric' });
const periodeKort = (x) => x.datum && x.tot ? `${mj(x.datum)} – ${mj(x.tot)}` : x.datum ? `vanaf ${mj(x.datum)}` : 'periode onbekend';
const duurTekst = (x) => { if (!x.datum || !x.tot) return ''; const d = Math.round((dag(x.tot) - dag(x.datum)) / 864e5) + 1; return d >= 60 ? `${Math.round(d / 30)} maanden` : `${Math.round(d / 7)} weken`; };

// ---------- logica: wat moet Henk eerst doen? ----------
// Eerst doen = mail staat klaar én het evenement is over 7 tot 70 dagen (eerder is te laat, later kan nog even wachten), vroegste eerst.
const eerstDoen = (z) => sorteer(z.filter((x) => actief(x) && binnenAfstand(x) && x.s === 'klaar' && dagenTot(x.datum) >= 7 && dagenTot(x.datum) <= (x.vast ? 130 : 70)));
// Komt eraan = net aangevraagd (nog geen besluit) in de komende 3 maanden: de organisator regelt nu zijn spullen.
const komtEraan = (z) => sorteer(z.filter((x) => actief(x) && binnenAfstand(x) && x.fase === 'A' && !KLANT.includes(x.s) && !['weg', 'verwacht'].includes(x.s) && !eerstDoen(z).includes(x) && dagenTot(x.datum) >= 7 && dagenTot(x.datum) <= 90));
const teLaat = (z) => z.filter((x) => actief(x) && ['klaar', 'zoekt'].includes(x.s) && dagenTot(x.datum) >= 0 && dagenTot(x.datum) < 7);

const inRegio = (x) => (!PROV || x.prov === PROV) && (!GEM || x.gem === GEM);
const actief = (x) => !x.later || x.later <= VANDAAG;
const binnenAfstand = (x) => !AFST || (x.km || 0) <= AFST;
const dv = (x, y) => (x.datum || '9999').localeCompare(y.datum || '9999');
const sorteer = (l) => l.sort((a, b) => SORT === 'kans' ? kans(b).score - kans(a).score || dv(a, b) : SORT === 'afstand' ? (a.km || 0) - (b.km || 0) || dv(a, b) : dv(a, b));
// Kansscore 0–100. Aannames, met Henk vast te stellen; later bij te stellen op wat echt geboekt wordt.
const KANSREGELS = [
  ['Bouw: lange huur (meer dan 4 weken)', '+20'], ['Bouw: al afgelopen', '−30'], ['Bouw: aanvrager bekend', '+5'],
  ['Vaste klant (vorig jaar geleverd)', '+30'], ['Binnen 30 km van Almkerk', '+25'], ['30 tot 75 km', '+15'], ['Meer dan 150 km', '−20'],
  ['Komt elk jaar terug (vorige edities)', '+10'], ['Over 3 tot 13 weken', '+10'], ['Over minder dan 3 weken', '−5'],
  ['Groot (100 rekken of meer)', '+10'], ['Klein (25 rekken)', '−5'], ['Vergunning net aangevraagd', '+5'],
  ['Mailadres zeker (90% of meer)', '+5'], ['Mailadres checken', '−5'], ['Alleen bellen of formulier', '−10'], ['Contact nog onbekend', '−15'],
];
function kans(x) {
  const r = [], d = dagenTot(x.datum), b = (n, t) => r.push([n, t]);
  if (x.s === 'bouw') { const d = x.datum && x.tot ? (dag(x.tot) - dag(x.datum)) / 864e5 : 0; if (d > 28) b(20, `lange huur: ${duurTekst(x)}`); if (x.bstatus === 'afgelopen') b(-30, 'al afgelopen'); if (x.aanvrager) b(5, 'aanvrager bekend'); }
  if (x.vast) b(30, `vorig jaar klant (${x.vast.rekken} rekken)`);
  if (x.km != null) { if (x.km <= 30) b(25, `vlakbij, ± ${x.km} km`); else if (x.km <= 75) b(15, `in de regio, ± ${x.km} km`); else if (x.km > 150) b(-20, `ver weg, ± ${x.km} km`); }
  if (x.vorig && !x.vast) b(10, 'komt elk jaar terug');
  if (x.s !== 'bouw' && d >= 21 && d <= 91) b(10, `goed moment: over ${Math.round(d / 7)} weken`); else if (x.s !== 'bouw' && d >= 0 && d < 21) b(-5, 'kort dag');
  if (x.s !== 'bouw' && x.bokken >= 2) b(10, `groot: ${x.bokken * REKKEN_BOK} rekken`); else if (x.s !== 'bouw' && x.bokken <= 0.5) b(-5, 'klein evenement');
  if (x.fase === 'A') b(5, 'vergunning net aangevraagd');
  if (x.org && x.org.zek >= 90) b(5, 'mailadres zeker');
  if (x.let) b(-5, 'mailadres checken');
  if (x.s === 'zonder') b(-10, 'alleen bellen of formulier');
  if (x.s === 'zoekt') b(-15, 'contact nog onbekend');
  const score = Math.max(0, Math.min(100, 40 + r.reduce((s, [n]) => s + n, 0)));
  return { score, niveau: score >= 70 ? 'hoog' : score >= 45 ? 'middel' : 'laag', redenen: r.sort((a, c) => Math.abs(c[0]) - Math.abs(a[0])) };
}