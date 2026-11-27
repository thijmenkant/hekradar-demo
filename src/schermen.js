
// =====================================================================
// DATALAAG. Alle modules lezen en schrijven via DB. In productie: Supabase
// (tabellen evenementen, aanbiedingen, boekingen). De schermen blijven gelijk.
// =====================================================================
let vorige = null;
const DB = {
  alle: () => E,
  vind: (id) => E.find((y) => y.id === id),
  wijzig(id, patch) { const x = DB.vind(id); vorige = { id, oud: JSON.parse(JSON.stringify(x)), view: VIEW, detail: DETAIL }; Object.assign(x, patch); },
  herstel() { if (!vorige) return null; const i = E.findIndex((y) => y.id === vorige.id); E[i] = vorige.oud; const v = vorige; vorige = null; return v; },
};

// ---------- staat ----------
let SORTOM = false, GEVONDEN = '', AFST = 0, SORT = 'kans', STAPEL = [], HUIDIG = [], KTAB = 'antwoord', HTAB = 'klaar', VIEW = 'overzicht', DETAIL = null, STATUS = [], SOORT = [], ZOEK = '', PROV = [], GEM = '', KWEERGAVE = 'bord';
Object.assign(ICON, {
  overzicht: I('<rect x="3" y="3" width="7" height="9"/><rect x="14" y="3" width="7" height="5"/><rect x="14" y="12" width="7" height="9"/><rect x="3" y="16" width="7" height="5"/>'),
  werklijst: I('<path d="M9 6h12M9 12h12M9 18h12"/><path d="M3.5 6l1.5 1.5L7.5 5M3.5 12l1.5 1.5 2.5-2.5M3.5 18l1.5 1.5 2.5-2.5"/>'),
  bouw: I('<path d="M2 20h20M4 20V10l8-6 8 6v10M9 20v-6h6v6"/>'),
  planning: I('<rect x="3" y="5" width="18" height="16"/><path d="M3 10h18M8 3v4M16 3v4M7 14h3M7 17h3M14 14h3"/>'),
  markt: I('<path d="M3 3v18h18"/><path d="M7 15l4-5 3 3 5-7"/>'),
  resultaten: I('<path d="M12 2v20M17 6H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>'),
  meer: I('<path d="M4 6h16M4 12h16M4 18h16"/>'),
  x: I('<path d="M18 6L6 18M6 6l12 12"/>'), op: I('<path d="M18 15l-6-6-6 6"/>'), neer: I('<path d="M6 9l6 6 6-6"/>'),
  zoek: I('<circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/>'),
  filter: I('<path d="M3 5h18l-7 8v6l-4 2v-8z"/>'),
});
ICON.agenda = ICON.planning; ICON.cijfers = ICON.resultaten;
const WM = `<div class="wm">${BIKE('currentColor', '#5cb85f', 28).replace('stroke="#5cb85f"', 'style="stroke:var(--x-wm-acc)"')}<span>fietsenrek<em>huren</em>.com</span></div>`;
// Kleurconcept kiezen voor de vergelijking: ?thema=a … e (zonder = standaard)
const THEMA = new URLSearchParams(location.search).get('thema'); if (THEMA) document.documentElement.dataset.thema = THEMA;
// Navigatie: gegroepeerd op wat Henk komt doen.
// Indeling voor Henk is de standaard. De oude indeling (Werklijst, Planning, ...) blijft bereikbaar met ?oud in de link.
const HENK = !new URLSearchParams(location.search).has('oud');
const GROEPEN_STANDAARD = [
  ['Vandaag', [['overzicht', 'Overzicht']]],
  ['Nieuwe klanten vinden', [['werklijst', 'Werklijst'], ['evenementen', 'Evenementen'], ['bouw', 'Bouw en verbouw']]],
  ['Klanten en uitvoering', [['klanten', 'Klanten'], ['planning', 'Planning']]],
  ['Inzicht', [['markt', 'Markt'], ['resultaten', 'Resultaten']]],
];
const GROEPEN = HENK ? [['Henk', [['vandaag', 'Vandaag'], ['evenementen', 'Alle evenementen'], ['klanten', 'Klanten'], ['agenda', 'Agenda'], ['cijfers', 'Cijfers']]]] : GROEPEN_STANDAARD;
const SECUNDAIR = HENK ? [['markt', 'Markt'], ['werkwijze', 'Zo werkt het'], ['instellingen', 'Instellingen']] : [['werkwijze', 'Zo werkt het'], ['instellingen', 'Instellingen']];
// In de indeling voor Henk verwijzen de oude schermen naar de drie nieuwe.
const HENKNAAR = HENK ? { overzicht: 'vandaag', planning: 'agenda', resultaten: 'cijfers' } : {};
if (HENK) VIEW = 'vandaag';
const MODULES_LIJST = [['vandaag', { naam: 'Vandaag', groep: 'Henk' }], ['agenda', { naam: 'Agenda', groep: 'Henk' }], ['cijfers', { naam: 'Cijfers', groep: 'Henk' }], ...GROEPEN_STANDAARD.flatMap(([g, l]) => l.map(([k, n]) => [k, { naam: n, groep: g }])), ['werkwijze', { naam: 'Zo werkt het', groep: 'Hulp' }], ['instellingen', { naam: 'Instellingen', groep: 'Beheer' }]];
const MODULES = Object.fromEntries(MODULES_LIJST);
if (HENK) { MODULES.klanten = { naam: 'Klanten', groep: 'Henk' }; MODULES.evenementen = { naam: 'Alle evenementen', groep: 'Henk' }; MODULES.bouw = { naam: 'Alle evenementen', groep: 'Henk' }; }
const NAAST = ['werklijst', 'evenementen']; // detail naast de lijst; elders als lade
const bedrag = (x) => x.boeking ? x.boeking.prijs : prijsVan(x);
const overTekst = (d) => { if (!d) return ''; const n = dagenTot(d); return n < 0 ? 'geweest' : n === 0 ? 'vandaag' : n === 1 ? 'morgen' : n < 14 ? `over ${n} dagen` : `over ${Math.round(n / 7)} weken`; };
const sindsTekst = (d) => { const n = -dagenTot(d); return n <= 0 ? 'vandaag' : n === 1 ? 'gisteren' : `${n} dagen geleden`; };
const kmTekst = (x) => x.km == null ? '' : `± ${x.km} km`;
const zichtbaar = () => DB.alle().filter(inRegio);
const regioTekst = () => GEM ? `gemeente ${GEM}` : PROV.length ? PROV.join(', ') : 'heel Nederland';
const zoekt = (t) => !ZOEK || t.toLowerCase().includes(ZOEK.toLowerCase());
const hoofdletter = (s) => s ? s[0].toUpperCase() + s.slice(1) : '';
const weekNr = (d) => { const t = dag(d); t.setDate(t.getDate() + 3 - ((t.getDay() + 6) % 7)); const w1 = new Date(t.getFullYear(), 0, 4); return 1 + Math.round(((t - w1) / 864e5 - 3 + ((w1.getDay() + 6) % 7)) / 7); };
const maandag = (d) => { const t = dag(d); t.setDate(t.getDate() - ((t.getDay() + 6) % 7)); return t.toISOString().slice(0, 10); };

// ---------- werkvoorraden: één definitie voor alle modules ----------
function voorraad() {
  const z = DB.alle();
  const bouwAlle = z.filter((x) => x.s === 'bouw' && binnenAfstand(x));
  return {
    klaar: eerstDoen(z), aanvraag: komtEraan(z), laat: teLaat(z),
    jaarlijks: sorteer(z.filter((x) => actief(x) && binnenAfstand(x) && x.s === 'verwacht')),
    zonder: sorteer(z.filter((x) => actief(x) && binnenAfstand(x) && x.s === 'zonder' && dagenTot(x.datum) >= 7)),
    nieuw: sorteer(z.filter((x) => actief(x) && binnenAfstand(x) && x.nieuw && ['klaar', 'zoekt', 'zonder'].includes(x.s) && dagenTot(x.datum) >= 7)),
    antwoord: z.filter((x) => x.s === 'antwoord').sort((a, b) => (a.verstuurd || '').localeCompare(b.verstuurd || '')),
    herinner: z.filter((x) => x.s === 'verstuurd' && !afgemeld(x.org) && !x.herinnerd && x.verstuurd && -dagenTot(x.verstuurd) >= 7 && dagenTot(x.datum) >= 7).sort((a, b) => a.verstuurd.localeCompare(b.verstuurd)),
    bouwBellen: sorteer(bouwAlle.filter((x) => x.bstatus !== 'afgelopen' && actief(x) && !x.gebeld)),
    bouwGebeld: bouwAlle.filter((x) => x.bstatus !== 'afgelopen' && (x.gebeld || !actief(x))),
    bouwAf: bouwAlle.filter((x) => x.bstatus === 'afgelopen'),
    leveren: z.filter((x) => x.s === 'geboekt').sort(dv),
    // Een factuur is pas open als de klus geleverd is en nog niet betaald.
    facturen: z.filter((x) => x.boeking && x.boeking.betaling === 'factuur' && x.s === 'geleverd' && !x.boeking.betaald),
    verloren: z.filter((x) => x.s === 'verloren'),
  };
}

// ---------- bouwstenen ----------
const kansCel = (x) => { if (KLANT.includes(x.s)) return '<span class="mu">–</span>'; const k = kans(x); return `<span class="kans ${k.niveau}" title="Kans ${k.score} van 100: ${esc(k.redenen.map(([, t]) => t).join(', '))}" aria-label="Kans ${k.score} van 100">${k.score}</span>`; };
function statusCel(x) {
  if (!actief(x)) return `<span class="st later">Later, tot ${datumKort(x.later)}</span>`;
  if (x.s === 'bouw') return x.bstatus === 'afgelopen' ? '<span class="st afgelopen">Afgelopen</span>' : x.gebeld ? `<span class="st geboekt">Gebeld <small>${datumKort(x.gebeld)}</small></span>` : `<span class="st bouw">${hoofdletter(SOORTBOUW[x.soortBouw])}</span>`;
  if (!KLANT.includes(x.s) && x.s !== 'verloren' && afgemeld(x.org)) return '<span class="st weg">Afgemeld</span>';
  if (x.s === 'verloren') return `<span class="st weg">Verloren <small>${esc(x.reden || '')}</small></span>`;
  if (['klaar', 'verwacht'].includes(x.s) && persoonlijkAdres(x.org)) return '<span class="st zonder">Bellen <small>adres op naam</small></span>';
  if (x.vast && x.s === 'klaar') return '<span class="st vast">Vaste klant <small>mail klaar</small></span>';
  return `<span class="st ${x.s}">${hoofdletter(STATUSNAAM[x.s])}</span>`;
}
const KNOP = { bouw: 'Bellen', klaar: 'Mail bekijken', verwacht: 'Mail bekijken', zonder: 'Bellen', zoekt: 'Bekijken', gepland: 'Bekijken' };
const rijAttr = (x, cls = 'tr r') => `class="${cls}${DETAIL === x.id ? ' sel' : ''}" role="row" tabindex="0" data-open="${x.id}" aria-selected="${DETAIL === x.id}"`;
const subRegel = (x) => [x.plaats + (x.gem !== x.plaats ? ' · ' + x.gem : ''), x.s === 'bouw' ? (x.aanvrager || 'aanvrager onbekend') : x.org && x.org.naam, x.fase === 'A' && x.s !== 'bouw' ? 'vergunning in aanvraag' : ''].filter(Boolean).map(esc).join(' · ');
const datumCel = (x) => x.s === 'bouw'
  ? `<b>${x.tot ? `tot ${mj(x.tot)}` : x.datum ? `vanaf ${mj(x.datum)}` : 'periode onbekend'}</b><span>${duurTekst(x) || 'zie publicatie'}</span>`
  : `<b>${x.verwachteDatum ? '± ' : ''}${datumKort(x.datum)}</b><span>${overTekst(x.datum)}</span>`;
function wlRij(x) {
  HUIDIG.push(x.id);
  return `<div ${rijAttr(x)}><div class="cel c-kans" role="cell">${kansCel(x)}</div>
<div class="cel h c-naam" role="cell"><b>${esc(x.naam)}</b><span>${subRegel(x)}</span></div>
<div class="cel t c-dat" role="cell">${datumCel(x)}</div>
<div class="cel c-km num ${x.km > 100 ? 'ver' : ''}" role="cell">${kmTekst(x)}</div>
<div class="cel c-st" role="cell">${statusCel(x)}</div>
<div class="cel act c-act" role="cell"><button class="btn sm rij-knop" data-open="${x.id}" tabindex="-1">${KNOP[x.s] || 'Bekijken'}</button></div></div>`;
}
const sortKop = (k, n) => { const af = (k === 'kans') !== SORTOM; return `<button data-sort="${k}" title="Sorteer op ${n.toLowerCase()}" ${SORT === k ? `aria-sort="${af ? 'descending' : 'ascending'}"` : ''}>${n}${SORT === k ? ` ${af ? '▼' : '▲'}` : ''}</button>`; };
// Filterknopje in een kolomkop: lijstje met waarden en aantallen, zoals in een spreadsheet.
// Meerkeuze: vinkjes (Soort, Plaats, Status). Eén keuze: rondje (Afstand). Het lijstje blijft open tijdens het aanklikken.
const kolFilter = (label, actief, opties, rechts, een) => `<details class="kolfilter ${actief ? 'aan' : ''}" data-kf="${label}"><summary aria-label="Filter op ${label}" title="Filter op ${label}${actief ? ': ' + esc(actief) : ''}">${ICON.filter}</summary><div class="kolpop ${rechts ? 'rechts' : ''}" role="menu">${opties.map(([attr, v, n, c, on]) => `<button ${attr}="${esc(v)}" class="fopt ${een ? '' : 'vink'} ${on ? 'on' : ''}" role="${een ? 'menuitemradio' : 'menuitemcheckbox'}" aria-checked="${on}"><i></i>${esc(n)}<span>${c}</span></button>`).join('')}</div></details>`;
// Waarde aan/uit in een meerkeuzefilter; '' = alles (lijst leeg).
const wissel = (l, v) => !v ? [] : l.includes(v) ? l.filter((w) => w !== v) : [...l, v];
// Opnieuw tekenen en een open kolomlijstje open houden, zodat je meerdere dingen achter elkaar kunt aanvinken.
function tekenOpen(el) { const d = el.closest('details.kolfilter'), k = d && d.dataset.kf, top = d && el.closest('.kolpop').scrollTop; teken(); if (k) { const n = document.querySelector(`details.kolfilter[data-kf="${k}"]`); if (n) { n.open = true; n.querySelector('.kolpop').scrollTop = top; } } }
function evRij(x) {
  HUIDIG.push(x.id);
  return `<div ${rijAttr(x)}><div class="cel c-kans" role="cell">${kansCel(x)}</div>
<div class="cel h c-naam" role="cell"><b>${esc(x.naam)}${x.gevonden === VANDAAG ? ' <span class="chip-nieuw">nieuw</span>' : ''}</b><span>${esc(x.s === 'bouw' ? (x.aanvrager || 'aanvrager onbekend') : x.org ? x.org.naam : 'organisator nog onbekend')}${x.fase === 'A' && x.s !== 'bouw' ? ' · vergunning in aanvraag' : ''}</span></div>
<div class="cel t c-dat" role="cell">${datumCel(x)}</div>
<div class="cel c-soort" role="cell">${esc(x.s === 'bouw' ? 'bouw: ' + SOORTBOUW[x.soortBouw] : x.soort)}</div>
<div class="cel h c-reg" role="cell"><b style="font-weight:500">${esc(x.plaats)}</b><span>${esc(x.prov)}</span></div>
<div class="cel c-km num ${x.km > 100 ? 'ver' : ''}" role="cell">${kmTekst(x)}</div>
<div class="cel c-st" role="cell">${statusCel(x)}</div></div>`;
}
function antRij(x) {
  HUIDIG.push(x.id);
  return `<div ${rijAttr(x)}><div class="cel h c-naam" role="cell"><b>${esc(x.org.naam)}</b><span>${esc(x.naam)} · ${euro(bedrag(x))}</span></div>
<div class="cel c-q" role="cell">${x.antwoord ? `<q>${esc(x.antwoord)}</q>` : '<span class="mu">Antwoord staat in je Outlook</span>'}</div>
<div class="cel t c-dat" role="cell"><b>${sindsTekst(x.verstuurd)}</b><span>aanbod verstuurd</span></div>
<div class="cel act c-act" role="cell"><button class="btn sm p" data-a="outlook" data-id="${x.id}" tabindex="-1">${ICON.antwoord} Antwoorden in Outlook</button></div></div>`;
}
const betTekst = (x) => !x.boeking ? '<span class="mu">–</span>' : x.boeking.betaling !== 'factuur' ? 'iDEAL, betaald' : x.boeking.betaald ? 'Factuur betaald' : x.s === 'geleverd' ? '<span class="open">Factuur open</span>' : 'Op factuur, na levering';
const FASEN = ['Aanbod', 'Antwoord', 'Geboekt', 'Geleverd'];
const faseIdx = (x) => ({ verstuurd: 0, antwoord: 1, geboekt: 2, geleverd: 3 }[x.s]);
const faseCel = (x) => { const i = faseIdx(x); return `<span class="fase" aria-label="Fase: ${FASEN[i]}">${FASEN.map((_, j) => `<i class="${j < i || (j === i && x.s !== 'antwoord') ? 'ok' : j === i ? 'nu' : ''}"></i>`).join('')}<span>${FASEN[i]}</span></span>`; };
function klantActie(x, sm = 'sm') {
  const sinds = x.verstuurd ? -dagenTot(x.verstuurd) : 0;
  if (x.s === 'antwoord') return `<button class="btn ${sm} p" data-a="outlook" data-id="${x.id}" tabindex="-1">${ICON.antwoord} Antwoorden</button>`;
  if (x.s === 'verstuurd') return dagenTot(x.datum) < 7 ? '<span class="mu klein">Te kort dag: bellen</span>' : x.herinnerd ? '<span class="mu klein">Herinnerd</span>' : sinds >= 7 ? `<button class="btn ${sm}" data-a="herinner" data-id="${x.id}" tabindex="-1">${ICON.herhaal} Herinnering</button>` : `<span class="mu klein">Herinnering over ${7 - sinds} d</span>`;
  if (x.volgend) { const v = DB.vind(x.volgend); return `<span class="mu klein">${v.s === 'gepland' ? `Mail volgend jaar: ${datumKort(v.klaarOp)}` : 'Volgend jaar: mail klaar'}</span>`; }
  return '';
}
function klRij(x) {
  HUIDIG.push(x.id);
  const wanneer = x.s === 'verstuurd' || x.s === 'antwoord' ? 'aanbod ' + sindsTekst(x.verstuurd) : x.s === 'geboekt' ? 'leveren ' + overTekst(x.datum) : 'geleverd ' + sindsTekst(x.datum);
  const bet = betTekst(x);
  return `<div ${rijAttr(x)}><div class="cel h c-naam" role="cell"><b>${esc(x.org.naam)}</b><span>${esc(x.naam)} · ${esc(x.plaats)}</span></div>
<div class="cel c-fase" role="cell">${faseCel(x)}</div>
<div class="cel t c-dat" role="cell"><b>${datumKort(x.datum)}</b><span>${wanneer}</span></div>
<div class="cel c-rek num re" role="cell">${x.bokken * REKKEN_BOK}</div>
<div class="cel c-bed num re" role="cell"><b>${euro(bedrag(x))}</b></div>
<div class="cel c-bet" role="cell">${bet}</div>
<div class="cel act c-act" role="cell">${klantActie(x)}</div></div>`;
}
function regioFilter(zonderProv) {
  const provs = [...new Set(DB.alle().map((x) => x.prov))].sort();
  const gems = [...new Set(DB.alle().filter((x) => !PROV.length || PROV.includes(x.prov)).map((x) => x.gem))].sort();
  return `${zonderProv ? '' : `<select id="prov" class="sel" aria-label="Provincie"><option value="">Alle provincies</option>${PROV.length > 1 ? `<option value="${esc(PROV.join('|'))}" selected>${PROV.length} provincies</option>` : ''}${provs.map((p) => `<option ${PROV.length === 1 && p === PROV[0] ? 'selected' : ''}>${esc(p)}</option>`).join('')}</select>`}
<select id="gem" class="sel" aria-label="Gemeente"><option value="">Alle gemeenten</option>${gems.map((g) => `<option ${g === GEM ? 'selected' : ''}>${esc(g)}</option>`).join('')}</select>${PROV.length || GEM ? '<button class="link klein" data-wis>Wis regio</button>' : ''}`;
}
const afstandFilter = () => `<select id="afst" class="sel" aria-label="Afstand vanaf Almkerk">${[[0, 'Elke afstand'], [50, 'Tot 50 km'], [100, 'Tot 100 km'], [150, 'Tot 150 km']].map(([v, n]) => `<option value="${v}" ${v === AFST ? 'selected' : ''}>${n}</option>`).join('')}</select>`;
const sorteerFilter = (cls = '') => `<select id="sort" class="sel ${cls}" aria-label="Sorteren"><option value="kans" ${SORT === 'kans' ? 'selected' : ''}>Hoogste kans eerst</option><option value="datum" ${SORT === 'datum' ? 'selected' : ''}>Eerstvolgende eerst</option><option value="afstand" ${SORT === 'afstand' ? 'selected' : ''}>Dichtstbij eerst</option></select>`;
const zoekVeld = (ph) => `<div class="zoekveld">${ICON.zoek}<input class="in" id="zoek" type="search" placeholder="${ph}" value="${esc(ZOEK)}" aria-label="Zoeken in deze lijst"></div>`;
const tab = (attr, k, aan, naam, n, urg) => `<button class="tab ${aan ? 'on' : ''}" role="tab" aria-selected="${aan}" ${attr}="${k}">${naam}<span class="c ${urg && n ? 'urg' : n ? '' : 'nul'}">${n}</span></button>`;
const GROEPCODE = { 'Henk': 'vandaag', 'Vandaag': 'vandaag', 'Nieuwe klanten vinden': 'vinden', 'Klanten en uitvoering': 'klanten', 'Inzicht': 'inzicht' };
const paginakop = (key, { doel = '', acties = '', tabs = '', extra = '' } = {}) => `<header class="pk ${tabs ? 'met-tabs' : ''}" data-groep="${GROEPCODE[MODULES[key].groep] || 'overig'}"><div class="pk-rij"><div><div class="kruim">${esc(MODULES[key].groep)}</div><h1>${esc(MODULES[key].naam)}</h1>${doel ? `<p class="doel" style="margin-bottom:0">${doel}</p>` : ''}</div>${extra}${acties ? `<div class="pk-acties">${acties}</div>` : ''}</div>${tabs ? `<div class="tabs" role="tablist">${tabs}</div>` : ''}</header>`;
// Telefoonnummer in een (al ge-escapete) tekst aantikbaar maken: op de telefoon direct bellen.
const belbaar = (t) => t.replace(/(\+?\d[\d -]{7,}\d)/g, (m) => `<a href="tel:${m.replace(/[^\d+]/g, '')}">${m}</a>`);
const leeg = (t, u = '') => `<div class="leeg"><b>${t}</b>${u}</div>`;

// =====================================================================
// OVERZICHT: commandocentrum. Links: wat nu moet (op volgorde van belang). Rechts: wat eraan komt en ter info.
// =====================================================================
function overzichtScherm() {
  const V = voorraad();
  const lev14 = V.leveren.filter((x) => dagenTot(x.datum) <= 14);
  const fOpen = V.facturen.reduce((s, x) => s + bedrag(x), 0);
  const sub = (l, fn) => `<div class="sub-lijst">${l.map(fn).join('')}</div>`;
  const subRij = (x, rechts, knop) => { HUIDIG.push(x.id); return `<div ${rijAttr(x)}><div class="cel h c-naam" role="cell"><b>${esc(x.org ? x.org.naam : x.naam)}</b><span>${esc(x.org ? x.naam : x.plaats)}${rechts ? ' · ' + rechts : ''}</span></div><div class="cel c-dat t" role="cell"><b>${datumKort(x.datum)}</b></div><div class="cel act" role="cell">${knop}</div></div>`; };
  const blok = (cls, n, titel, uitleg, knop, inhoud) => `<section class="blok taakblok ${cls}" aria-label="${esc(titel)}"><div class="tb-kop"><span class="tb-n">${n}</span><h2>${titel}</h2><span class="tb-uitleg">${uitleg}</span><div class="rechts">${knop}</div></div>${n ? inhoud : '<div class="tb-leeg">Niets te doen.</div>'}</section>`;
  const ookRij = (n, titel, uitleg, knop) => `<div class="ook-rij ${n ? '' : 'nul'}"><span class="ook-n">${n}</span><div class="cel h"><b>${titel}</b><span>${uitleg}</span></div>${knop}</div>`;
  const top = V.klaar.slice(0, 4);
  return `${paginakop('overzicht', { doel: `${hoofdletter(dag(VANDAAG).toLocaleDateString('nl-NL', { weekday: 'long', day: 'numeric', month: 'long' }))} · wat vandaag aandacht vraagt` })}
<div class="inhoud">
<div class="cc"><div class="cc-kol">
<div class="cc-label"><b>Nu doen</b> op volgorde van belang</div>
${blok('urg', V.antwoord.length, 'Klanten wachten op je antwoord', 'Reactie staat in je Outlook', `<button class="btn sm" data-v="klanten" data-kt="antwoord">Alle</button>`, sub(V.antwoord, (x) => subRij(x, x.antwoord ? `<q>${esc(x.antwoord)}</q>` : '', `<button class="btn sm p" data-a="outlook" data-id="${x.id}" tabindex="-1">${ICON.antwoord} Antwoorden</button>`)))}
${blok('p', V.klaar.length, 'Mails klaar om te versturen', 'Hoogste kans eerst', `<button class="btn sm wit" data-a="start-wl">${ICON.mail} Doorwerken</button>`, sub(top, (x) => subRij(x, `kans ${kans(x).score}`, `<button class="btn sm" data-open="${x.id}" tabindex="-1">${ICON.mail} Mail bekijken</button>`)) + (V.klaar.length > top.length ? `<div class="blok-voet"><button class="link" data-v="werklijst" data-ht="klaar">Nog ${V.klaar.length - top.length} in de werklijst</button></div>` : ''))}
${blok('', V.herinner.length, 'Herinnering sturen', 'Aanbod langer dan een week zonder reactie', `<button class="btn sm" data-v="klanten" data-kt="verstuurd">Alle</button>`, sub(V.herinner.slice(0, 3), (x) => subRij(x, 'aanbod ' + sindsTekst(x.verstuurd), `<button class="btn sm" data-a="herinner" data-id="${x.id}" tabindex="-1">${ICON.herhaal} Herinnering</button>`)) + (V.herinner.length > 3 ? `<div class="blok-voet"><button class="link" data-v="klanten" data-kt="verstuurd">Nog ${V.herinner.length - 3} bij Klanten</button></div>` : ''))}
<section class="blok taakblok" aria-label="Ook te doen"><div class="tb-kop"><h2>Ook te doen</h2><span class="tb-uitleg">bellen en opvolgen</span></div>
${ookRij(V.bouwBellen.length, 'Bouwprojecten om te bellen', 'Tijdelijke stallingen bij stations, scholen en bouwplaatsen', `<button class="btn sm" data-v="bouw">${ICON.bel} Bellijst</button>`)}
${ookRij(V.zonder.length, 'Organisator zonder mailadres', 'Bellen of contactformulier', `<button class="btn sm" data-v="werklijst" data-ht="zonder">Openen</button>`)}
${ookRij(V.facturen.length, `Facturen open · ${euro(fOpen)}`, 'Geleverd op factuur, nog niet betaald', `<button class="btn sm" data-v="resultaten">Bekijken</button>`)}
</section></div>
<div class="cc-kol">
<div class="cc-label"><b>Ter info</b> geen actie nodig</div>
<section class="blok"><div class="blok-kop"><h2>Leveringen</h2><span class="tel">${lev14.length ? `${lev14.length} in de komende 14 dagen` : V.leveren.length ? `geen tot ${datumKort(V.leveren[0].datum)}` : 'niets geboekt'} · ${V.leveren.length} geboekt</span><div class="rechts"><button class="link klein" data-v="planning">Planning</button></div></div>
<div class="agenda">${V.leveren.slice(0, 5).map((x) => { HUIDIG.push(x.id); return `<div ${rijAttr(x, 'ad r')}><div class="dagblok"><small>${dag(x.datum).toLocaleDateString('nl-NL', { month: 'short' })}</small><b>${dag(x.datum).getDate()}</b></div><div class="cel h"><b>${esc(x.naam)}</b><span>${x.bokken * REKKEN_BOK} rekken · ${esc(x.plaats)} · ${overTekst(x.datum)}</span></div><span class="num klein mu">${kmTekst(x)}</span></div>`; }).join('') || leeg('Geen leveringen gepland.')}</div></section>
<section class="blok info"><div class="blok-kop"><h2>Uit de scan</h2><span class="tel">vannacht en dit seizoen</span></div>
<ul class="infolijst">
<li><b>${SCAN.laatsteDagAantal}</b><span>publicaties gelezen in de scan van vannacht (${datumKort(SCAN.laatsteDag)})</span></li>
<li><b>${V.nieuw.length}</b><span>nieuwe evenementen gevonden, nog niet eerder gezien <button class="link" data-v="werklijst" data-ht="nieuw">bekijk</button></span></li>
<li><b>${V.aanvraag.length}</b><span>net aangevraagd, evenement binnen 3 maanden: organisator regelt nu zijn materiaal</span></li>
<li><b>${V.jaarlijks.length}</b><span>jaarlijkse evenementen zonder vergunning voor dit jaar</span></li>
<li><b>apr</b><span>piekmaand voor vergunningen. Vanaf januari in beeld zijn. <button class="link" data-v="markt">Markt</button></span></li>
</ul></section></div></div></div>`;
}

// =====================================================================
// WERKLIJST: geprioriteerde werkvoorraad, één handeling per tabblad.
// =====================================================================
const HTABS = [
  ['klaar', 'Mail klaar', 'De mail staat klaar en het evenement valt binnen de besteltermijn van zijn soort (kerstmarkt 10 weken, loop en markt 4 maanden, festival 6 maanden). Zie Instellingen.'],
  ['aanvraag', 'Net aangevraagd', 'De gemeente beslist nog. De organisator regelt nu zijn materiaal: goed moment om te benaderen.'],
  ['jaarlijks', 'Jaarlijks', 'Vorige edities gevonden, dit jaar nog geen vergunning. Klanten bestellen maanden vooraf.'],
  ['zonder', 'Geen mailadres', 'Organisator bekend, geen bruikbaar mailadres. Bellen of contactformulier.'],
  ['nieuw', 'Nieuw', 'Gevonden in de scan van vannacht, nog niet eerder gezien.'],
];
function werklijstScherm() {
  const V = voorraad(), t = HTABS.find(([k]) => k === HTAB) || HTABS[0], l = V[t[0]];
  const door = ['klaar', 'jaarlijks'].includes(t[0]) && l.length;
  return `${paginakop('werklijst', { doel: 'Evenementen waar je nu iets mee moet, hoogste kans bovenaan.', acties: door ? `<button class="btn p" data-a="start" data-id="${l[0].id}">${ICON.mail} Doorwerken (${l.length})</button>` : '', tabs: HTABS.map(([k, n]) => tab('data-htab', k, k === t[0], n, V[k].length)).join('') })}
<div class="inhoud"><section class="blok">
<div class="werkbalk"><p class="uitleg">${t[2]}</p><div class="rechts">${afstandFilter()}${sorteerFilter('alleen-m')}</div></div>
<div class="t-wl" role="table" aria-label="${t[1]}"><div class="tr th" role="row"><div>${sortKop('kans', 'Kans')}</div><div>Evenement</div><div>${sortKop('datum', 'Datum')}</div><div class="c-km">${sortKop('afstand', 'Afstand')}</div><div>Status</div><div class="c-act"></div></div>
${l.length ? l.map(wlRij).join('') : leeg('Niets in deze lijst.', AFST ? ' Probeer een grotere afstand.' : '')}</div>
${t[0] === 'klaar' && V.laat.length ? `<div class="blok-voet">${V.laat.length} overgeslagen: evenement binnen een week, meestal te laat.</div>` : ''}</section></div>`;
}

// =====================================================================
// EVENEMENTEN: zoeken en selecteren met filters links.
// =====================================================================
const STATUSF = [['alle', 'Alle'], ['klant', 'Al aanbod of geboekt'], ['klaar', 'Mailadres bekend'], ['aanvraag', 'Vergunning in aanvraag'], ['verwacht', 'Jaarlijks'], ['zonder', 'Geen mailadres'], ['zoekt', 'Contact gezocht'], ['bouw', 'Bouw en verbouw'], ['later', 'Weggezet (later)']];
// Radar met de gegevens van de laatste scan, rechtsboven op Alle evenementen.
const radarHtml = (cls = '') => `<span class="radar ${cls}" aria-hidden="true"><i class="radar-veeg"></i><b class="radar-stip s1"></b><b class="radar-stip s2"></b><b class="radar-stip s3"></b></span>`;
const scanBlok = () => { const n = DB.alle().filter((x) => x.gevonden === VANDAAG && x.s !== 'weg').length; return `<div class="scanblok" role="status" aria-label="Scan vannacht 03:15: ${SCAN.laatsteDagAantal} publicaties gelezen, ${n} nieuw">${radarHtml('groot')}<div><b>Scan vannacht 03:15</b><span><b>${SCAN.laatsteDagAantal}</b> publicaties gelezen${n ? ` · <button class="link" data-gev="vandaag">${n} nieuw vandaag</button>` : ''}</span></div></div>`; };
// Indeling voor Henk: Evenementen en Bouw en verbouw als twee tabbladen van Alle evenementen.
const evTabs = () => HENK ? [tab('data-v', 'evenementen', VIEW === 'evenementen', 'Evenementen', zichtbaar().filter((x) => !['weg', 'gepland', 'bouw', 'verloren'].includes(x.s) && x.datum && dagenTot(x.datum) >= 0 && actief(x) && binnenAfstand(x)).length), tab('data-v', 'bouw', VIEW === 'bouw', 'Bouw en verbouw', voorraad().bouwBellen.length)].join('') : '';
// Gevonden door de scan: vandaag, gisteren, deze week of een gekozen dag.
const GEVF = [['', 'Altijd'], ['vandaag', 'Nieuw vandaag'], ['gisteren', 'Gisteren'], ['week', 'Afgelopen 7 dagen']];
const gevondenOp = (x, g) => !g || (!!x.gevonden && (g === 'vandaag' ? x.gevonden === VANDAAG : g === 'gisteren' ? x.gevonden === addDag(VANDAAG, -1) : g === 'week' ? dagenTot(x.gevonden) >= -6 : x.gevonden === g));
const gevTekst = (g) => g === 'vandaag' ? 'nieuw vandaag' : g === 'gisteren' ? 'gevonden gisteren' : g === 'week' ? 'gevonden in de afgelopen 7 dagen' : g ? 'gevonden op ' + datumLang(g) : '';
function evenementenScherm() {
  const bf = (x) => !['weg', 'gepland', 'verloren'].includes(x.s) && !(HENK && x.s === 'bouw') && (x.s === 'bouw' ? x.bstatus !== 'afgelopen' : dagenTot(x.datum) >= 0) && binnenAfstand(x) && zoekt(x.naam + x.plaats + x.gem + (x.org ? x.org.naam : '') + (x.aanvrager || ''));
  const alleBasis = zichtbaar().filter(bf);
  // Meerkeuze: STATUS, SOORT en PROV zijn lijsten; leeg = alles. Binnen een filter telt "of", tussen filters "en".
  const inK = (x, k) => k === 'later' ? !actief(x) : actief(x) && (k === 'alle' ? true : k === 'klant' ? KLANT.includes(x.s) : k === 'aanvraag' ? x.fase === 'A' && !KLANT.includes(x.s) : x.s === k);
  const inStatus = (x) => STATUS.length ? STATUS.some((k) => inK(x, k)) : actief(x);
  const soortVan = (x) => x.s === 'bouw' ? 'bouw' : x.soort;
  const inSoort = (x) => !SOORT.length || SOORT.includes(soortVan(x));
  // Tellingen per provincie: alle andere filters wel, de provincie zelf niet.
  const provBron = DB.alle().filter((x) => bf(x) && gevondenOp(x, GEVONDEN) && inStatus(x) && inSoort(x));
  const provs = [...new Set(provBron.map((x) => x.prov).concat(PROV))].sort();
  const basis = alleBasis.filter((x) => gevondenOp(x, GEVONDEN));
  const weg = basis.filter((x) => !actief(x));
  if (!weg.length) STATUS = STATUS.filter((k) => k !== 'later');
  const filt = (k) => basis.filter((x) => inK(x, k));
  const metStatus = basis.filter(inStatus);
  const soorten = [...new Set(metStatus.map(soortVan))].sort();
  SOORT = SOORT.filter((s) => soorten.includes(s));
  const l = sorteer(metStatus.filter(inSoort));
  const statusOpties = STATUSF.filter(([k]) => (k !== 'later' || weg.length) && !(HENK && k === 'bouw')).map(([k, n]) => ['data-st', k, n, filt(k).length, k === 'alle' ? !STATUS.length : STATUS.includes(k)]);
  const soortOpties = [['data-soort', '', 'Alle soorten', metStatus.length, !SOORT.length], ...soorten.map((s) => ['data-soort', s, hoofdletter(s), metStatus.filter((x) => soortVan(x) === s).length, SOORT.includes(s)])];
  const provOpties = [['data-provk', '', 'Alle provincies', provBron.length, !PROV.length], ...provs.map((pv) => ['data-provk', pv, pv, provBron.filter((x) => x.prov === pv).length, PROV.includes(pv)])];
  const namen = (o) => o.filter((x) => x[4] && x[1]).map((x) => x[2]).join(', ');
  const opt = (attr, k, aan, n, c, vink) => `<button class="fopt ${vink ? 'vink' : ''} ${aan ? 'on' : ''}" ${attr}="${esc(k)}" aria-pressed="${aan}"><i></i>${esc(n)}<span>${c}</span></button>`;
  const lijst = (o) => o.map(([attr, k, n, c, on]) => opt(attr, k, on, n, c, true)).join('');
  return `${paginakop('evenementen', { doel: `Alle evenementen uit de vergunningen in ${esc(regioTekst())}. Filter links, open rechts.`, tabs: evTabs(), extra: scanBlok() })}
<div class="inhoud"><div class="zoekscherm">
<aside class="facet" aria-label="Filters">
<fieldset class="gevset"><legend>Gevonden door de scan</legend>${GEVF.map(([k, n]) => opt('data-gev', k, GEVONDEN === k, n, alleBasis.filter((x) => gevondenOp(x, k)).length)).join('')}<label class="gevdag">Of kies een dag<input type="date" class="in" id="gevdat" max="${VANDAAG}" value="${/^\d{4}-/.test(GEVONDEN) ? GEVONDEN : ''}"></label></fieldset>
<fieldset class="statusset"><legend>Status</legend>${lijst(statusOpties)}</fieldset>
<fieldset class="niet-m"><legend>Soort</legend>${lijst(soortOpties)}</fieldset>
<fieldset class="niet-m"><legend>Provincie</legend>${lijst(provOpties)}</fieldset>
<fieldset class="niet-m"><legend>Waar</legend>${regioFilter(true)}${afstandFilter()}</fieldset>
<fieldset class="alleen-m mfilters"><select class="sel" id="soortsel" aria-label="Soort"><option value="">Alle soorten</option>${SOORT.length > 1 ? `<option value="${esc(SOORT.join('|'))}" selected>${SOORT.length} soorten</option>` : ''}${soorten.map((s) => `<option value="${esc(s)}" ${SOORT.length === 1 && SOORT[0] === s ? 'selected' : ''}>${hoofdletter(s)}</option>`).join('')}</select>${afstandFilter()}${regioFilter()}</fieldset>
</aside>
<section class="blok"><div class="resultaat-kop"><b class="num">${l.length} resultaten${GEVONDEN ? ` · ${gevTekst(GEVONDEN)} <button class="link klein" data-gev="">wis</button>` : ''}</b>${zoekVeld('Zoek op naam, plaats of organisatie')}${sorteerFilter('alleen-m')}</div>
<div class="t-ev" role="table" aria-label="Evenementen"><div class="tr th" role="row"><div>${sortKop('kans', 'Kans')}</div><div>${sortKop('naam', 'Evenement')}</div><div>${sortKop('datum', 'Datum')}</div>
<div class="c-soort">${sortKop('soort', 'Soort')}${kolFilter('soort', namen(soortOpties), soortOpties)}</div>
<div class="c-reg">${sortKop('plaats', 'Plaats')}${kolFilter('provincie', namen(provOpties), provOpties)}</div>
<div class="c-km">${sortKop('afstand', 'Afstand')}${(() => { const bron = DB.alle().filter((x) => { const a = AFST; AFST = 0; const ok = bf(x); AFST = a; return ok && inRegio(x) && gevondenOp(x, GEVONDEN) && inStatus(x) && inSoort(x); }); return kolFilter('afstand', AFST ? `tot ${AFST} km` : '', [[0, 'Elke afstand'], [50, 'Tot 50 km'], [100, 'Tot 100 km'], [150, 'Tot 150 km']].map(([v, n]) => ['data-afstk', v, n, bron.filter((x) => !v || (x.km || 0) <= v).length, AFST === v]), false, true); })()}</div>
<div>${sortKop('status', 'Status')}${kolFilter('status', namen(statusOpties.filter((o) => o[1] !== 'alle')), statusOpties, true)}</div></div>
${l.length ? l.map(evRij).join('') : leeg('Niets gevonden.', ' Pas de filters of de zoekterm aan.')}</div>
<div class="blok-voet">Demo met ${E.length} verzonnen evenementen. De echte scan vond sinds 12 november ${SCAN.publicaties.toLocaleString('nl-NL')} publicaties uit ${SCAN.gemeenten} gemeenten.</div></section>
</div></div>`;
}

// =====================================================================
// BOUW EN VERBOUW: bellijst met tijdlijn van de huurperiode.
// =====================================================================
const TL_VAN = '2026-01-01', TL_TOT = '2028-12-31';
const tlPos = (d) => Math.max(0, Math.min(100, (dag(d) - dag(TL_VAN)) / (dag(TL_TOT) - dag(TL_VAN)) * 100));
const tlAs = (inhoud) => `<div class="tl-as">${['2026', '2027', '2028'].map((j) => `<span class="jr" style="left:${tlPos(j + '-01-01')}%"><span>${j}</span></span>`).join('')}${inhoud}</div>`;
function bouwRij(x) {
  HUIDIG.push(x.id);
  const balk = x.datum ? `<span class="tl-balk ${x.bstatus === 'afgelopen' ? 'af' : ''}${x.tot ? '' : ' open'}" style="left:${tlPos(x.datum)}%;width:${Math.max(1.2, tlPos(x.tot || TL_TOT) - tlPos(x.datum))}%" title="${esc(periodeKort(x))}"></span>` : '<span class="tl-onb"><span>periode onbekend · zie publicatie</span></span>';
  return `<div ${rijAttr(x)}><div class="cel h c-naam" role="cell"><b>${esc(x.naam)}</b><span>${esc(x.plaats)} · ${esc(x.prov)}</span></div>
<div class="cel h c-wie" role="cell"><b style="font-weight:500">${esc(x.aanvrager || 'Gemeente ' + x.gem)}</b><span>${x.aanvrager ? 'aanvrager' : 'aanvrager onbekend'}</span></div>
<div class="cel c-km num" role="cell">${kmTekst(x)}</div>
<div class="cel c-tl" role="cell">${tlAs(balk)}</div>
<div class="cel c-st" role="cell">${statusCel(x)}</div></div>`;
}
function bouwScherm() {
  const V = voorraad(), metPeriode = [...V.bouwBellen, ...V.bouwGebeld].filter((x) => x.datum).length;
  const kop = `<div class="tr th tl-kop" role="row"><div>Project</div><div class="c-wie">Wie bellen</div><div>Afstand</div><div class="c-tl">${tlAs('')}</div><div class="c-st">Status</div></div>`;
  const groep = (t, u, l) => l.length ? `<div class="groepsrij">${t} <span>${l.length} · ${u}</span></div>${l.map(bouwRij).join('')}` : '';
  return `${paginakop('bouw', { tabs: evTabs(), doel: 'Echte projecten uit het Gemeenteblad (12 maanden) met een tijdelijke fietsenstalling. Lange huur; Henk belt, RekRadar mailt hier niet.', extra: `<div class="kern"><div><span>Te bellen</span><b>${V.bouwBellen.length}</b></div><div><span>Met bekende periode</span><b>${metPeriode}</b></div><div><span>Bron</span><b style="font-size:13px;padding-top:4px"><span class="bron echt">echt</span></b></div></div>` })}
<div class="inhoud"><section class="blok"><div class="werkbalk"><p class="uitleg">Balk = huurperiode volgens de publicatie.</p><div class="rechts">${afstandFilter()}</div></div>
<div class="tl" role="table" aria-label="Bouwprojecten">${kop}
${groep('Te bellen', 'nog geen contact', V.bouwBellen)}${groep('Gebeld of later', 'opvolgen', V.bouwGebeld)}${groep('Afgelopen', 'goed om te weten wie dit doet', V.bouwAf)}
${!V.bouwBellen.length && !V.bouwGebeld.length && !V.bouwAf.length ? leeg('Geen projecten binnen deze afstand.') : ''}</div></section></div>`;
}

// =====================================================================
// KLANTEN: pijplijn (bord) of lijst.
// =====================================================================
const KTABS = [
  ['verstuurd', 'Aanbod verstuurd', (x) => x.s === 'verstuurd', 'Nog geen reactie. Na een week kun je één herinnering sturen.', 'var(--neutraal)'],
  ['antwoord', 'Te beantwoorden', (x) => x.s === 'antwoord', 'Klant heeft gereageerd. Antwoord staat in je Outlook.', 'var(--let)'],
  ['geboekt', 'Geboekt', (x) => x.s === 'geboekt', 'Nog te leveren, eerstvolgende bovenaan.', 'var(--g500)'],
  ['geleverd', 'Geleverd', (x) => x.s === 'geleverd', 'Klus is gedaan. Volgend jaar staat de mail 120 dagen vooraf weer klaar.', 'var(--g800)'],
];
const ksort = (k) => (a, b) => k === 'verstuurd' ? (a.verstuurd || '').localeCompare(b.verstuurd || '') : k === 'geleverd' ? b.datum.localeCompare(a.datum) : a.datum.localeCompare(b.datum);
function deal(x) {
  HUIDIG.push(x.id);
  return `<div ${rijAttr(x, 'deal r')}><b>${esc(x.org.naam)}</b><span class="ev">${esc(x.naam)} · ${esc(x.plaats)}</span>
<div class="dr"><span class="mu">${datumKort(x.datum)}</span><b>${euro(bedrag(x))}</b></div>${x.s === 'antwoord' && x.antwoord ? `<q>${esc(x.antwoord)}</q>` : ''}${x.boeking && x.boeking.betaling === 'factuur' ? `<div class="dr"><span class="mu">${betTekst(x)}</span></div>` : ''}
${['verstuurd', 'antwoord'].includes(x.s) || x.volgend ? `<div class="dact">${klantActie(x)}</div>` : ''}</div>`;
}
function klantenScherm() {
  const alle = zichtbaar().filter((x) => KLANT.includes(x.s));
  const gez = alle.filter((x) => zoekt(x.org.naam + x.naam + x.plaats + x.gem));
  const som = (f) => alle.filter(f).reduce((s, x) => s + bedrag(x), 0);
  const fOpen = voorraad().facturen.filter((x) => alle.includes(x)).reduce((s, x) => s + bedrag(x), 0);
  const t = KTABS.find(([k]) => k === KTAB) || KTABS[1];
  const kern = `<div class="kern"><div><span>Geboekt</span><b>${euro(som((x) => ['geboekt', 'geleverd'].includes(x.s)))}</b></div><div><span>Open in aanbod</span><b>${euro(som((x) => ['verstuurd', 'antwoord'].includes(x.s)))}</b></div><div><span>Factuur open</span><b class="${fOpen ? 'let' : ''}">${euro(fOpen)}</b></div></div>`;
  const balk = `<div class="werkbalk">${zoekVeld('Zoek op klant, evenement of plaats')}${regioFilter()}<div class="rechts"><div class="weergave" role="group" aria-label="Weergave"><button data-kw="bord" aria-pressed="${KWEERGAVE === 'bord'}">Pijplijn</button><button data-kw="lijst" aria-pressed="${KWEERGAVE === 'lijst'}">Lijst</button></div></div></div>`;
  let inh;
  if (KWEERGAVE === 'bord') {
    inh = `<div class="tabs bord-tabs" role="tablist" style="display:none;margin:0 -12px 8px;background:var(--vlak);border-bottom:1px solid var(--lijn)">${KTABS.map(([k, n, f]) => tab('data-ktab', k, k === t[0], n, gez.filter(f).length, k === 'antwoord')).join('')}</div>
<div class="bord">${KTABS.map(([k, n, f, u, kc]) => { const l = gez.filter(f).sort(ksort(k)); return `<section class="kolom ${k === t[0] ? 'mob-on' : ''}" style="--kc:${kc}" aria-label="${n}"><div class="kolom-kop"><b>${n}</b><span class="tel">${l.length}</span><small>${euro(l.reduce((s, x) => s + bedrag(x), 0))}</small></div><div class="kolom-lijst">${l.length ? l.map(deal).join('') : '<div class="leeg" style="padding:16px 4px">Leeg</div>'}</div></section>`; }).join('')}</div>`;
  } else {
    const l = gez.filter(t[2]).sort(ksort(t[0]));
    inh = `<section class="blok"><div class="tabs" role="tablist" style="padding:0 10px;border-bottom:1px solid var(--lijn)">${KTABS.map(([k, n, f]) => tab('data-ktab', k, k === t[0], n, gez.filter(f).length, k === 'antwoord')).join('')}</div>
<div class="t-kl" role="table" aria-label="Klanten"><div class="tr th" role="row"><div>Klant</div><div>Fase</div><div>Datum</div><div class="c-rek" style="text-align:right">Rekken</div><div style="text-align:right">Bedrag</div><div class="c-bet">Betaling</div><div class="c-act"></div></div>
${l.length ? l.map(klRij).join('') : leeg('Niets in deze fase.')}</div><div class="blok-voet">${t[3]}</div></section>`;
  }
  return `${paginakop('klanten', { doel: `Iedereen die via RekRadar een aanbod kreeg, ${esc(regioTekst())}.`, extra: kern })}
<div class="inhoud"><section class="blok" style="margin-bottom:12px">${balk}</section>${inh}</div>`;
}

// =====================================================================
// PLANNING: geboekte leveringen per week (alleen overzicht; plannen doet Henk zoals nu).
// =====================================================================
function planningScherm(sleutel = 'planning') {
  const V = voorraad(), weken = {};
  V.leveren.forEach((x) => { (weken[maandag(x.datum)] ||= []).push(x); });
  const keys = Object.keys(weken).sort();
  const piek = (l) => Math.max(...l.map((x) => bezetOp(x.datum)));
  const totRek = V.leveren.reduce((s, x) => s + x.bokken * REKKEN_BOK, 0);
  const rij = (x) => { HUIDIG.push(x.id); return `<div ${rijAttr(x)}><div class="dagblok"><small>${dag(x.datum).toLocaleDateString('nl-NL', { weekday: 'short' })}</small><b>${dag(x.datum).getDate()}</b></div>
<div class="cel h c-naam" role="cell"><b>${esc(x.naam)}</b><span>${esc(x.org.naam)} · ${esc(x.plaats)} · <button class="link" data-a="werkbon" data-id="${x.id}">werkbon</button></span></div>
<div class="cel h c-los" role="cell"><b style="font-weight:400">${esc(x.boeking ? x.boeking.los : '')}</b><span>${belbaar(esc(x.boeking ? x.boeking.contact : ''))}</span></div>
<div class="cel num re" role="cell"><b>${x.bokken * REKKEN_BOK}</b> <span class="mu klein">rekken</span></div>
<div class="cel c-km num" role="cell">${kmTekst(x)}</div>
<div class="cel c-bet" role="cell">${x.boeking && x.boeking.betaling === 'factuur' ? (x.boeking.betaald ? 'Betaald' : 'Op factuur') : 'Betaald'}</div></div>`; };
  return `${paginakop(sleutel, { doel: sleutel === 'agenda' ? 'Wat er geleverd moet worden, per week, met de voorraad. Geef de werkbon aan wie rijdt.' : 'Geboekte klussen per week, met loslocatie en contact. Plannen en leveren doe je zoals nu.', extra: `<div class="kern"><div><span>Klussen te leveren</span><b>${V.leveren.length}</b></div><div><span>Rekken in totaal</span><b>${totRek}</b></div><div><span>Komende 14 dagen</span><b>${V.leveren.filter((x) => dagenTot(x.datum) <= 14).length}</b></div><div><span>Voorraad</span><b>${VOORRAAD_BOK * REKKEN_BOK}</b></div></div>` })}
<div class="inhoud">${keys.length ? keys.map((k) => { const l = weken[k], rek = l.reduce((s, x) => s + x.bokken * REKKEN_BOK, 0), eind = addDag(k, 6);
  return `<section class="week"><div class="week-kop"><div><b>Week ${weekNr(k)}</b> <span>${dag(k).toLocaleDateString('nl-NL', { day: 'numeric', month: 'short' })} – ${dag(eind).toLocaleDateString('nl-NL', { day: 'numeric', month: 'short', year: 'numeric' })} · ${overTekst(k) === 'geweest' ? 'deze week' : overTekst(k)}</span></div><div class="last"><b>${rek}</b>rekken · ${l.length} ${l.length === 1 ? 'klus' : 'klussen'}<div class="capbalk ${piek(l) >= VOORRAAD_BOK ? 'vol' : ''}" title="Drukste dag: ${piek(l) * REKKEN_BOK} van ${VOORRAAD_BOK * REKKEN_BOK} rekken in gebruik"><i style="width:${Math.min(100, Math.round(piek(l) / VOORRAAD_BOK * 100))}%"></i></div><small class="mu">drukste dag ${piek(l) * REKKEN_BOK} van ${VOORRAAD_BOK * REKKEN_BOK}</small></div></div>
<div class="blok t-pl" role="table">${l.map(rij).join('')}</div></section>`; }).join('') : `<section class="blok">${leeg('Geen geboekte leveringen.')}</section>`}
<p class="mu klein">Geleverde klussen staan bij <button class="link" data-v="klanten" data-kt="geleverd">Klanten › Geleverd</button>. De balk per week toont hoeveel van de voorraad op de drukste dag in gebruik is (rekken zijn weg van de dag vóór tot de dag na het evenement).</p></div>`;
}

// =====================================================================
// MARKT: analytische omgeving met alleen echte cijfers.
// =====================================================================
const MAAND = [['jan', 2234], ['feb', 3257], ['mrt', 3796], ['apr', 4725], ['mei', 3917], ['jun', 3709], ['jul', 3503], ['aug', 2562], ['sep', 2482], ['okt', 2322], ['nov', 1920], ['dec', 1922]];
function staafGrafiek(data, { max, stap, fmt, label, nu = -1, id = 'g' }) {
  const W = 640, H = 210, L = 40, B = 24, T = 20, bw = (W - L) / data.length;
  const y = (n) => T + (H - T - B) * (1 - n / max);
  const pad = (x, yy, w, h, r = 2) => h <= 0 ? '' : `M${x},${yy + h}V${yy + r}Q${x},${yy} ${x + r},${yy}H${x + w - r}Q${x + w},${yy} ${x + w},${yy + r}V${yy + h}Z`;
  const piek = Math.max(...data.map(([, n]) => n));
  const grid = Array.from({ length: Math.floor(max / stap) + 1 }, (_, i) => i * stap).map((n) => `<line x1="${L}" x2="${W}" y1="${y(n)}" y2="${y(n)}" stroke="${n ? '#e6eae3' : '#c2c9bf'}"/><text x="${L - 6}" y="${y(n) + 4}" text-anchor="end" font-size="11" fill="#5f6b63">${fmt(n)}</text>`).join('');
  const bars = data.map(([m, n], i) => { const x = L + i * bw + bw * .18, w = bw * .64, toon = n === piek || i === nu;
    return `<path d="${pad(x, y(n), w, H - B - y(n))}" fill="${i === nu ? '#0f2716' : '#2b6a33'}"/>${toon && n ? `<text x="${x + w / 2}" y="${Math.min(...[i - 1, i, i + 1].filter((j) => data[j]).map((j) => y(data[j][1]))) - 6}" text-anchor="middle" font-size="11" font-weight="700" fill="#142019">${label(n)}${i === nu ? ' · nu' : ''}</text>` : ''}<text x="${x + w / 2}" y="${H - 7}" text-anchor="middle" font-size="11" fill="#5f6b63">${m}</text><rect x="${L + i * bw}" y="${T}" width="${bw}" height="${H - T - B}" fill="transparent" data-tip="${esc(m)}: ${esc(label(n))}"/>`; }).join('');
  return `<div class="grafiek"><svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(data.map(([m, n]) => m + ' ' + label(n)).join(', '))}">${grid}${bars}</svg><div class="tip"></div></div>`;
}
function marktScherm() {
  const telBouw = (k) => Object.entries(BOUW.reduce((o, r) => (o[r[k]] = (o[r[k]] || 0) + 1, o), {})).sort((a, b) => b[1] - a[1]);
  const hb = (l, naamFn = (s) => s) => { const m = Math.max(...l.map(([, n]) => n)); return `<div class="hbars">${l.map(([s, n]) => `<span>${esc(naamFn(s))}</span><span class="bar"><i style="width:${n / m * 100}%"></i></span><span class="v">${n}</span>`).join('')}</div>`; };
  return `${paginakop('markt', { doel: 'Wat er in Nederland speelt. Alle cijfers op deze pagina zijn echt: eigen telling uit het Gemeenteblad.', extra: '<div class="kern"><div><span>Bron</span><b style="font-size:13px;padding-top:4px"><span class="bron echt">echt · Gemeenteblad</span></b></div></div>' })}
<div class="inhoud"><div class="raster">
<div class="s12 cijferband">
<div><span>Publicaties sinds 12 nov</span><b>${SCAN.publicaties.toLocaleString('nl-NL')}</b><small>${SCAN.gemeenten} gemeenten</small></div>
<div><span>Evenementen die nog komen</span><b>${SCAN.nogTeGaan}</b><small>uit dezelfde publicaties</small></div>
<div><span>Vergunning nog in aanvraag</span><b>${SCAN.aanvraag}</b><small>beslissing volgt nog</small></div>
<div><span>Laatste scan</span><b>${SCAN.laatsteDagAantal}</b><small>${datumKort(SCAN.laatsteDag)}, elke nacht 03:15</small></div>
<div><span>Bouw en verbouw</span><b>${BOUW.length}</b><small>projecten, 12 maanden</small></div></div>
<section class="blok s8"><div class="blok-kop"><h2>Evenementvergunningen per maand</h2><span class="tel">heel Nederland, 2025</span></div><div class="blok-in">${staafGrafiek(MAAND, { max: 5000, stap: 1000, fmt: (n) => n ? n / 1000 + 'k' : '0', label: (n) => n.toLocaleString('nl-NL'), nu: 10 })}
<details class="klein" style="margin-top:6px"><summary class="mu" style="cursor:pointer">Als tabel</summary><table class="mini" style="margin-top:6px"><tr><th>Maand</th><th class="num">Vergunningen</th></tr>${MAAND.map(([m, n]) => `<tr><td>${m}</td><td class="num">${n.toLocaleString('nl-NL')}</td></tr>`).join('')}</table></details></div></section>
<section class="blok s4"><div class="blok-kop"><h2>Wat dit betekent</h2></div><div class="blok-in"><ul class="inzicht">
<li>April is de piek: ${(4725).toLocaleString('nl-NL')} vergunningen. Klanten bestellen maanden vooraf, dus vanaf januari moet je in beeld zijn.</li>
<li>November en december zijn de rustigste maanden: tijd om vaste klanten van vorig jaar voor te bereiden.</li>
<li>${SCAN.aanvraag} vergunningen zijn nog in aanvraag: daar is de organisator nu zijn materiaal aan het regelen.</li>
<li>Bouw en verbouw is klein (${BOUW.length} per jaar), maar gaat om weken tot jaren huur.</li></ul></div></section>
<section class="blok s6"><div class="blok-kop"><h2>Bouw en verbouw per soort</h2><span class="tel">${BOUW.length} projecten</span></div><div class="blok-in">${hb(telBouw(7), (s) => hoofdletter(SOORTBOUW[s] || s))}</div></section>
<section class="blok s6"><div class="blok-kop"><h2>Bouw en verbouw per provincie</h2></div><div class="blok-in">${hb(telBouw(4))}</div></section>
</div></div>`;
}

// =====================================================================
// RESULTATEN: managementoverzicht (demo-gegevens).
// =====================================================================
function resultatenScherm() {
  const z = DB.alle(), aanbod = z.filter((x) => KLANT.includes(x.s) || x.s === 'verloren'), reageerde = z.filter((x) => ['antwoord', 'geboekt', 'geleverd'].includes(x.s)), geboekt = z.filter((x) => ['geboekt', 'geleverd'].includes(x.s));
  const omzet = geboekt.reduce((s, x) => s + bedrag(x), 0), V = voorraad(), fOpen = V.facturen.reduce((s, x) => s + bedrag(x), 0);
  const pct = (a, b) => b ? Math.round(a / b * 100) + '%' : '–';
  const maanden = {}; geboekt.forEach((x) => { const k = x.datum.slice(0, 7); maanden[k] = (maanden[k] || 0) + bedrag(x); });
  const reeks = Object.keys(maanden).sort().map((k) => [dag(k + '-01').toLocaleDateString('nl-NL', { month: 'short' }) + " '" + k.slice(2, 4), maanden[k]]);
  const piekO = Math.max(...reeks.map(([, n]) => n), 1), stapO = piekO <= 2000 ? 500 : 1000, maxO = Math.ceil(piekO / stapO) * stapO;
  const bw = (w) => geboekt.filter((x) => x.boeking && x.boeking.betaling === w);
  const hb = (l) => { const m = Math.max(...l.map(([, n]) => n), 1); return `<div class="hbars">${l.map(([s, n]) => `<span>${s}</span><span class="bar"><i style="width:${n / m * 100}%"></i></span><span class="v">${n}</span>`).join('')}</div>`; };
  return `${paginakop('resultaten', { doel: 'Wat RekRadar oplevert. Deze cijfers zijn demo-gegevens; de echte komen na een paar weken versturen.', extra: '<div class="kern"><div><span>Bron</span><b style="font-size:13px;padding-top:4px"><span class="bron demo">demo</span></b></div></div>' })}
<div class="inhoud"><div class="raster">
<div class="s12 cijferband">
<div><span>Omzet via RekRadar</span><b>${euro(omzet)}</b><small>${geboekt.length} boekingen</small></div>
<div><span>Gemiddelde boeking</span><b>${euro(geboekt.length ? Math.round(omzet / geboekt.length) : 0)}</b><small>excl. btw</small></div>
<div><span>Reactie op aanbod</span><b>${pct(reageerde.length, aanbod.length)}</b><small>${reageerde.length} van ${aanbod.length}</small></div>
<div><span>Aanbod naar boeking</span><b>${pct(geboekt.length, aanbod.length)}</b><small>${geboekt.length} van ${aanbod.length}</small></div>
<div><span>Factuur open</span><b style="color:var(--let-tekst)">${euro(fOpen)}</b><small>${V.facturen.length} facturen</small></div></div>
<section class="blok s5"><div class="blok-kop"><h2>Van aanbod naar boeking</h2></div><div class="blok-in">${hb([['Aanbod verstuurd', aanbod.length], ['Klant reageerde', reageerde.length], ['Geboekt', geboekt.length]])}
${V.verloren.length ? `<p class="kort">Verloren: ${V.verloren.length} (${Object.entries(V.verloren.reduce((o, x) => (o[x.reden] = (o[x.reden] || 0) + 1, o), {})).map(([r, n]) => `${esc(r)} ${n}×`).join(', ')}).</p>` : ''}<p class="kort">Betaalwijze: ${bw('ideal').length}× iDEAL (${euro(bw('ideal').reduce((s, x) => s + bedrag(x), 0))}), ${bw('factuur').length}× factuur (${euro(bw('factuur').reduce((s, x) => s + bedrag(x), 0))}).</p></div></section>
<section class="blok s7"><div class="blok-kop"><h2>Geboekte omzet per evenementmaand</h2><span class="tel">naar maand van het evenement</span></div><div class="blok-in">${staafGrafiek(reeks, { max: maxO, stap: stapO, fmt: (n) => n ? '€' + (n >= 1000 ? (n / 1000).toLocaleString('nl-NL') + 'k' : n) : '0', label: euro })}</div></section>
<section class="blok s12"><div class="blok-kop"><h2>Openstaande facturen</h2><span class="tel">${V.facturen.length}</span></div>
${V.facturen.length ? `<div class="scrollx"><table class="mini" style="min-width:560px"><tr><th>Klant</th><th>Evenement</th><th>Datum</th><th>Status klus</th><th class="num">Bedrag</th></tr>${V.facturen.sort(dv).map((x) => `<tr class="r" data-open="${x.id}" tabindex="0" style="cursor:pointer"><td><b>${esc(x.org.naam)}</b></td><td>${esc(x.naam)}</td><td>${datumKort(x.datum)}</td><td>${x.s === 'geleverd' ? 'Geleverd' : 'Nog te leveren'}</td><td class="num"><b>${euro(bedrag(x))}</b></td></tr>`).join('')}</table></div>` : leeg('Geen openstaande facturen.')}</section>
</div></div>`;
}

// =====================================================================
// ZO WERKT HET
// =====================================================================
function werkwijzeScherm() {
  // Uitleg voor Henk: kort, groot, zonder vakjargon. Techniek staat ingeklapt onderaan.
  const ga = (k, label) => `<button class="link" data-v="${k}">${label}</button>`;
  const KOSTEN = 41, klein = 0.5 * PRIJS_BOK, groot = 4 * PRIJS_BOK, perDag = Math.round(SCAN.publicaties / 14);
  const maanden = Math.floor(PRIJS_BOK / KOSTEN);
  const MAAN = I('<path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/>');
  const stappen = [
    [MAAN, '\'s Nachts', 'RekRadar zoekt', `Hij leest alle nieuwe evenementvergunningen van Nederland (zo'n ${perDag} per dag) en zoekt bij elk evenement wie het organiseert en hoe je die mailt.`],
    [ICON.mail, '\'s Ochtends', 'Jij kijkt en klikt', 'De mails staan klaar, beste kans bovenaan. Je leest ze na en verstuurt met één klik uit je eigen Outlook, met jouw naam.'],
    [ICON.kalender, 'Daarna', 'De klant boekt', 'De klant antwoordt in je Outlook, of boekt zelf: aantal rekken, losplek op de kaart en betalen. De klus staat in je planning.']];
  const verschil = [
    ['Nieuwe klanten', 'Komen via je netwerk. Wie jou niet kent, belt je niet.', 'RekRadar vindt evenementen in heel Nederland, ook bij organisatoren die jou nog niet kennen.'],
    ['Aanbod sturen', 'Zelf een mail schrijven met prijs en voorstel.', 'De mail staat klaar. Nalezen en op versturen klikken.'],
    ['Afspraken maken', 'Mails heen en weer over aantal en losplek.', 'De klant vult het zelf in en wijst de losplek aan op de kaart.'],
    ['Vaste klanten', 'Zelf onthouden wie je volgend jaar weer moet mailen.', '120 dagen voor het evenement staat de mail vanzelf weer klaar.']];
  const nacht = [
    ['De overheid publiceert', 'Elke gemeente zet vergunningen voor evenementen openbaar in het Gemeenteblad.'],
    ['RekRadar leest alles', 'Elke nacht om 03:15. Vannacht waren het er ' + SCAN.laatsteDagAantal + '.'],
    ['Zoekt de organisator', 'In de vergunning, vorige jaren, Google en de website van de organisator. Daar staat het mailadres.'],
    ['Rekent de kans uit', 'Dichtbij, groot of vaste klant: hoger. Ver weg of geen contact: lager.']];
  const beloftes = [
    ['Niets gaat vanzelf de deur uit', 'Elke mail en herinnering verstuur jij met één klik.'],
    ['Er wordt niets verzonnen', 'Een mailadres telt alleen als het echt op een website staat. De link staat erbij. Twijfel? Dan staat er "bellen" of "checken".'],
    ['Je mail blijft van jou', 'RekRadar ziet alleen wie antwoordde en wanneer, nooit wat erin staat.'],
    ['Geen klantenlijst nodig', 'Alles komt uit openbare bronnen. Privé-adressen van mensen worden nooit gemaild.']];
  const kosten = [['Database en nachtwerk', 'Supabase, servers in Frankfurt (EU)', '$25 per maand'],
    ['AI die vergunningen en websites leest', 'Claude, van Anthropic', 'enkele euro\'s, grens op €20'],
    ['Zoeken op internet', 'Serper (Google) en Brave', '$50 voor 50.000 zoekopdrachten, Brave gratis'],
    ['Bevestigingen en weekmail', 'Resend', 'gratis tot 3.000 per maand'],
    ['Aanbodmails', 'Je eigen Outlook', 'zit al in je Microsoft 365'],
    ['iDEAL-betalingen', 'Mollie', '€0,32 per betaling']];
  const dag = HENK
    ? [['vandaag', 'Vandaag', 'Kijk wat er moet. Begin altijd hier.'], ['evenementen', 'Alle evenementen', 'Alles wat RekRadar vond, ook wat nog geen mail kreeg.'], ['agenda', 'Agenda', 'Wat er geleverd moet worden.']]
    : [['overzicht', 'Overzicht', 'Kijk wat er moet. Begin altijd hier.'], ['werklijst', 'Werklijst', 'Lees de klaarstaande mails na en verstuur ze.'], ['klanten', 'Klanten', 'Zie wie antwoordde en wie boekte.']];
  return `${paginakop('werkwijze', { doel: 'Wat RekRadar voor je doet, wat het oplevert en wat het kost.' })}
<div class="inhoud zw">
<section class="zw-held"><p class="zw-groot">RekRadar zoekt elke nacht evenementen die fietsenrekken nodig hebben, en zet een mail voor je klaar.</p><p>Jij klikt op versturen. De rest blijft zoals je gewend bent.</p></section>

<div class="zw-geld">
<div class="zw-tegel"><span>Wat het kost</span><b>± ${euro(KOSTEN)}</b><small>per maand, alles samen</small></div>
<div class="zw-tegel"><span>Wat één boeking oplevert</span><b>${euro(klein)} – ${euro(groot)}</b><small>${euro(PRIJS_BOK)} per ${REKKEN_BOK} rekken, excl. btw</small></div>
<div class="zw-som"><b>De som:</b> één boeking van ${REKKEN_BOK} rekken (${euro(PRIJS_BOK)}) betaalt ruim ${maanden} maanden RekRadar.<small>Hoeveel boekingen het echt oplevert, weten we pas na een paar weken versturen. Daarom hier geen belofte.</small></div>
</div>

<h2 class="zw-kop">Hoe het werkt</h2>
<ol class="zw-stappen">${stappen.map(([ic, wanneer, wat, uitleg], i) => `<li><span class="zw-ic">${ic}</span><span class="zw-wanneer">${i + 1} · ${wanneer}</span><b>${wat}</b><p>${uitleg}</p></li>`).join('')}</ol>

<h2 class="zw-kop">Wat het je oplevert</h2>
<div class="zw-vgl" role="table" aria-label="Zonder en met RekRadar">
<div class="zw-vgl-kop" role="row"><span role="columnheader"></span><span role="columnheader">Nu</span><span role="columnheader">Met RekRadar</span></div>
${verschil.map(([w, nu, met]) => `<div class="zw-vgl-rij" role="row"><b role="rowheader">${w}</b><span role="cell" class="nu">${nu}</span><span role="cell" class="met">${met}</span></div>`).join('')}
</div>

<h2 class="zw-kop">Wat gebeurt er 's nachts?</h2>
<ol class="zw-nacht">${nacht.map(([t, u]) => `<li><b>${t}</b><p>${u}</p></li>`).join('')}</ol>
<p class="zw-klein">De AI die meeleest heet Claude (van Anthropic). Die leest de vergunning en de gevonden webpagina's en wijst het mailadres aan. Hij leest nooit je mail en verstuurt niets.</p>

<h2 class="zw-kop">Waar je op kunt rekenen</h2>
<ul class="zw-belofte">${beloftes.map(([t, u]) => `<li><b>${t}</b><span>${u}</span></li>`).join('')}</ul>

<h2 class="zw-kop">Je dag in drie stappen</h2>
<ol class="zw-dag">${dag.map(([k, m, u]) => `<li>${ga(k, m)}<span>${u}</span></li>`).join('')}</ol>

<details class="zw-meer"><summary>Waar gaat de ${euro(KOSTEN)} per maand heen?</summary>
<table class="mini">${kosten.map(([wat, wie, p]) => `<tr><td><b>${wat}</b><br><span class="mu">${wie}</span></td><td class="num">${p}</td></tr>`).join('')}</table>
<p class="zw-klein">Alle accounts komen op naam van Fietsenrekhuren.com, zodat jij eigenaar bent. De iDEAL-kosten betaal je alleen per boeking.</p></details>
<details class="zw-meer"><summary>Overige afspraken</summary><ul class="inzicht">
<li>Onder elke mail staat een afmeldlink. Wie zich afmeldt, krijgt nooit meer een aanbod.</li>
<li>Bouwprojecten krijgen geen mail: jij belt. De prijs voor lange huur is nog niet afgesproken.</li>
<li>Facturen maak je zoals nu in je eigen boekhouding.</li>
<li>Alleen Nederland. Duitsland en België nog niet.</li>
<li>Bron van de vergunningen: <a href="https://zoek.officielebekendmakingen.nl" target="_blank" rel="noopener">officielebekendmakingen.nl ↗</a></li></ul></details>
</div>`;
}

// =====================================================================
// INSTELLINGEN: secties links, geavanceerd ingeklapt.
// =====================================================================
function instellingenScherm() {
  const veld = (id, label, waarde, hint, sel) => `<div class="veld"><label for="${id}">${label}</label>${sel ? `<select class="sel" id="${id}">${sel.map((o) => `<option>${o}</option>`).join('')}</select>` : `<input class="in" id="${id}" value="${esc(waarde)}">`}${hint ? `<div class="hint">${hint}</div>` : ''}</div>`;
  const blok = (id, t, inh) => `<section class="blok" id="${id}"><div class="blok-kop"><h2>${t}</h2></div>${inh}</section>`;
  const pak = [['Sint-intocht, kerstmarkt', 0.5], ['Loop, markt, carnaval, dorpsfeest', 1], ['Sportevenement, festival', 2], ['Groot (5.000+ bezoekers)', 4]];
  const secs = [['s-prijs', 'Prijs en pakket'], ['s-versturen', 'Versturen'], ['s-planning', 'Planning'], ['s-betalen', 'Betalen'], ['s-kans', 'Kansscore']];
  return `${paginakop('instellingen', { doel: 'Prijzen en regels die RekRadar gebruikt. Aannames staan erbij: samen met Henk vaststellen.', acties: '<span class="mu klein" id="opstatus">Geen wijzigingen</span><button class="btn p" data-a="opslaan" id="opknop" disabled>Opslaan</button>' })}
<div class="inhoud"><div class="inst"><nav class="inst-nav" aria-label="Secties">${secs.map(([id, n], i) => `<a href="#${id}" data-sec="${id}" class="${i === 0 ? 'on' : ''}">${n}</a>`).join('')}</nav><div>
${blok('s-prijs', 'Prijs en pakket', veld('i1', 'Prijs per bok (50 rekken)', '€300 excl. btw', 'Aanname. Standaard zitten transport, leveren en ophalen in de prijs; per evenement kun je transportkosten apart rekenen.') + `<table class="mini" style="border-top:1px solid var(--lijn)"><tr><th>Soort evenement</th><th>Voorstel</th><th class="num">Rekken</th><th class="num">Prijs</th></tr>${pak.map(([n, b]) => `<tr><td>${n}</td><td>${bokTekst(b)}</td><td class="num">${b * REKKEN_BOK}</td><td class="num">${euro(b * PRIJS_BOK)}</td></tr>`).join('')}</table>`)}
${blok('s-versturen', 'Versturen', veld('i5', 'Afzender', 'Henk van der Zouwen · Outlook') + veld('i2', 'Versturen', '', 'RekRadar verstuurt nooit zelf.', ['Altijd via mij, één klik per mail']) + veld('i4', 'Herinnering', '', 'Eén keer, alleen als je zelf drukt.', ['Na een week, als ik op Herinnering druk']))}
${blok('s-planning', 'Planning', veld('i10', 'Voorraad (bokken van 50 rekken)', String(VOORRAAD_BOK), 'Aanname, invullen met Henk. Rekken zijn bezet van de dag vóór tot de dag na het evenement. Het boekformulier biedt nooit meer aan dan er vrij is.') + veld('i8', 'Vaste klanten', '120 dagen voor de volgende editie de mail klaarzetten') + `<table class="mini" style="border-top:1px solid var(--lijn)"><tr><th>Werklijst: zo vroeg komt een evenement erin</th><th class="num">Dagen vooraf</th></tr>${Object.entries(BESTEL).map(([k, d]) => `<tr><td>${hoofdletter(k)}</td><td class="num">${d}</td></tr>`).join('')}</table><div class="blok-in klein mu">Besteltermijnen zijn aannames; bijstellen op echte boekingen.</div>`)}
${blok('s-betalen', 'Betalen', veld('i9', 'Betaalwijze', 'iDEAL of op factuur (klant kiest)') + veld('i7', 'Annuleringsregel', 'Annuleer je na betaling, dan krijg je het bedrag niet terug.', 'Aanname: nog met Henk afstemmen, ook voor boekingen op factuur.'))}
${blok('s-kans', 'Kansscore', `<div class="blok-in klein mu" style="padding-bottom:10px">Iedereen begint op 40. Regels zijn aannames; bijstellen zodra er genoeg aanbiedingen zijn.</div><details class="meer-inst"><summary>Toon de ${KANSREGELS.length} regels</summary><table class="mini"><tr><th>Regel</th><th class="num">Punten</th></tr>${KANSREGELS.map(([t, n]) => `<tr><td>${t}</td><td class="num ${n.startsWith('+') ? 'plus' : 'min'}">${n}</td></tr>`).join('')}</table></details>`)}
</div></div></div>`;
}

// =====================================================================
// DETAILPANEEL
// =====================================================================
// De prijsregel in de mail: één zin als transport erbij zit, twee bedragen en een totaal als het apart is.
const voorstelZin = (x) => { const r = Math.round(x.bokken * REKKEN_BOK), t = transportVan(x);
  return `<p class="pr">Ons voorstel: <b>${r} fietsenrekken</b> voor <b>${euro(rekPrijs(x.bokken))}</b>${t ? `, plus <b>${euro(t)}</b> transportkosten. Samen <b>${euro(prijsVan(x))}</b> excl. btw.<br>Daarvoor brengen we de rekken en halen we ze na afloop weer op.` : ` excl. btw.<br>Transport, leveren en ophalen zitten in de prijs.`}</p>`; };
function mailHtml(x) {
  const o = x.org, m = x.mail || { bokken: x.bokken, datum: x.datum, transport: x.transport };
  x = Object.assign({}, x, { bokken: m.bokken, datum: m.datum, transport: m.transport });
  return `<div class="mail"><div class="mk"><div class="mk-label">${ICON.mail}E-mail</div><span>Aan</span><b style="font-weight:500">${esc(o.email)}</b><span>Onderwerp</span><b style="font-weight:500">Fietsenrekken bij ${esc(x.naam)}?</b></div><div class="mb"><p>Beste ${esc(o.naam)},</p>
<p>We zagen dat ${esc(x.naam)} ${x.vast || x.s === 'verwacht' ? 'er weer aankomt' : 'eraan komt'}. Daar denken we graag in mee.</p>
<p>Komen er bezoekers op de fiets? Dan plaatsen wij fietsenrekken voor jullie. Zo staan alle fietsen netjes en hebben jullie er geen omkijken naar.</p>
${voorstelZin(x)}
<p>Interesse? Via de knop hieronder zie je het voorstel en geef je door waar we kunnen lossen. Betalen kan via iDEAL of op factuur.</p><p><button class="mknop" data-a="probeer" data-id="${x.id}" title="Toon wat de klant ziet">Bekijk en boek</button></p>
<p>Liever eerst even bellen? 0183 851 700.</p><p style="margin:0">Groet,<br>Henk van der Zouwen<br>Fietsenrekhuren.com, Almkerk</p>
<small>Je krijgt deze mail omdat dit adres openbaar staat${o.bron ? ' op ' + esc(o.bron.split('/')[0]) : ''}. Geen mail meer van ons? <button class="link" data-a="afmeld" data-id="${x.id}" title="Demo: zo werkt de afmeldlink voor de klant">Afmelden</button>.</small></div></div>`;
}
// =====================================================================
// ANTWOORD OP EEN KLANT: logica herkent de vraag en stelt een mail voor.
// Regels in volgorde: de eerste die past wint. Henk ziet welke regel herkend is,
// kiest waar nodig tussen twee versies en vult [stukken tussen haken] zelf in.
// Er wordt niets verstuurd: Henk opent het concept in Outlook en verstuurt zelf.
// =====================================================================
const VRAAGSOORTEN = [
  ['opbouw', 'vraag over opbouwen', /opbouw|opzetten|neerzetten|plaatsen van de rekken/i],
  ['bellen', 'wil even bellen', /\bbel(len)?\b|telefo|afspraak/i],
  ['meer', 'wil meer rekken', /\bmeer\b|extra rekken|groter|ander aantal/i],
  ['prijs', 'vraag over de prijs', /prijs|kost|korting|goedkoper|\bduur\b/i],
  ['datum', 'andere datum', /datum|dag eerder|dag later|verzet|verplaats/i],
];
const vraagSoort = (t) => VRAAGSOORTEN.find(([, , re]) => re.test(t || '')) || ['anders', 'andere vraag'];
const LADDER = [0.5, 1, 2, 4, 6];
function antwoordVoorstellen(x) {
  const o = x.org || {}, rekken = Math.round(x.bokken * REKKEN_BOK), t = transportVan(x), prijs = euro(rekPrijs(x.bokken)) + (t ? ` + ${euro(t)} transport` : ''), incl = t ? `plus ${euro(t)} transportkosten voor leveren en ophalen` : 'inclusief transport, leveren en ophalen';
  const aan = `Beste ${o.naam || ''},\n\nBedankt voor je reactie.`, boek = 'Boeken kan direct via de link in mijn vorige mail.';
  const slot = '\n\nMet vriendelijke groet,\nHenk van der Zouwen\nFietsenrekhuren.com\n0183 851 700';
  const m = (label, kern) => ({ label, tekst: `${aan} ${kern}${slot}` });
  const [soort] = vraagSoort(x.antwoord);
  if (soort === 'opbouw') return [
    m('Opbouwen kost extra', `Opbouwen kan zeker: dan zetten wij de ${rekken} fietsenrekken op de plek die jullie willen. Dat kost €[bedrag] extra, bovenop de ${prijs} (excl. btw) voor de rekken. ${t ? '' : 'Transport, leveren en ophalen blijven inbegrepen.'}\n\nZal ik het zo voor jullie vastleggen? Dan hoor ik het graag. ${boek}`),
    m('Opbouwen zit erbij', `Goed nieuws: het opbouwen zit bij de prijs inbegrepen. Voor ${prijs} (excl. btw) leveren we ${rekken} fietsenrekken, zetten we ze op en halen we ze na afloop weer op.\n\n${boek} Laat gerust weten als je nog vragen hebt.`)];
  if (soort === 'bellen') return [
    m('Momenten voorstellen', `Bellen is prima. Ik kan volgende week op [dag] of [dag], tussen [tijd] en [tijd]. Welk moment past jullie het best?\n\nJe mag mij ook altijd zelf bellen op 0183 851 700.`),
    m('Henk belt zelf', `Bellen is prima. Ik bel je volgende week op [dag] rond [tijd]. Op welk nummer kan ik je het best bereiken?`)];
  if (soort === 'meer') { const vrij = x.datum ? vrijOp(x.datum, x.id) : VOORRAAD_BOK, n = LADDER.find((b) => b > x.bokken && b <= vrij) || x.bokken;
    return [m('Meer kan', `Meer rekken kan zeker. Per ${REKKEN_BOK} fietsenrekken is de prijs ${euro(PRIJS_BOK)} (excl. btw), ${incl}. Voor ${n * REKKEN_BOK} rekken is dat bijvoorbeeld ${euro(rekPrijs(n))}${t ? ` + ${euro(t)} transport` : ''}.\n\nHoeveel fietsenrekken hebben jullie nodig? Dan pas ik het aan. ${boek}`)]; }
  if (soort === 'prijs') return [
    m('Prijs uitleggen', `De prijs is ${prijs} (excl. btw) voor ${rekken} fietsenrekken. ${t ? `Dat is ${euro(rekPrijs(x.bokken))} voor de rekken en ${euro(t)} transportkosten: samen ${euro(prijsVan(x))}. Daarmee is alles geregeld, leveren en na afloop weer ophalen.` : 'Daar zit alles in: transport, leveren en na afloop weer ophalen, zonder bijkomende kosten.'}\n\n${boek}`),
    m('Korting voorstellen', `De gewone prijs is ${prijs} (excl. btw) voor ${rekken} fietsenrekken. Omdat [reden], kan ik het voor jullie doen voor €[bedrag] (excl. btw), ${t ? 'transport inbegrepen' : 'inclusief transport, leveren en ophalen'}.\n\nZal ik het zo vastleggen?`)];
  if (soort === 'datum') return [m('Andere datum', `Een andere datum is geen probleem. Op welke dag hebben jullie de rekken nodig? Dan kijk ik of er genoeg vrij zijn en pas ik het aan.`)];
  return [m('Antwoord', `[antwoord op de vraag]\n\n${boek}`)];
}
function antwoordHtml(x, keus = 0) {
  const v = antwoordVoorstellen(x), [, herkend] = vraagSoort(x.antwoord), k = Math.min(keus, v.length - 1);
  return `<div class="antw" data-id="${x.id}">
<div class="antw-vraag"><span class="mu">Klant vroeg</span><q>${esc(x.antwoord || 'Antwoord staat in je Outlook')}</q><span class="antw-herkend">Herkend: ${herkend}</span></div>
${v.length > 1 ? `<div class="seg antw-keus" role="group" aria-label="Kies een antwoord">${v.map((a, i) => `<button type="button" data-antw="${i}" aria-pressed="${i === k}"><b>${esc(a.label)}</b></button>`).join('')}</div>` : ''}
<div class="mail"><div class="mk"><div class="mk-label">${ICON.mail}E-mail · concept</div><span>Aan</span><b style="font-weight:500">${esc(x.org.email)}</b><span>Onderwerp</span><b style="font-weight:500">Re: Fietsenrekken voor ${esc(x.naam)}</b></div>
<div class="mb"><textarea id="antwtekst" class="in" rows="14" aria-label="Tekst van het antwoord">${esc(v[k].tekst)}</textarea></div></div>
<p class="kort">Vul de stukken tussen [ ] in en pas aan wat je wilt. RekRadar verstuurt niets: je verstuurt zelf vanuit Outlook.</p>
<div class="antw-voet"><button class="btn p" data-a="antw-outlook" data-id="${x.id}">${ICON.mail} Openen in Outlook</button><span class="ffout" id="antwfout" role="alert"></span></div></div>`;
}
// HERINNERING: Henk ziet eerst de mail en kan hem aanpassen. Pas na "Versturen uit Outlook" gaat hij weg.
function herinneringTekst(x) {
  const o = x.org || {}, m = x.mail || { bokken: x.bokken, transport: x.transport }, t = transportVan(m), r = Math.round(m.bokken * REKKEN_BOK);
  return `Beste ${o.naam || ''},\n\nEen tijdje geleden stuurde ik je een voorstel voor fietsenrekken bij ${x.naam}. Ik ben benieuwd of het jullie wat lijkt.\n\nHet voorstel staat nog: ${r} fietsenrekken voor ${euro(rekPrijs(m.bokken))}${t ? `, plus ${euro(t)} transportkosten` : ''} (excl. btw)${t ? '' : ', inclusief leveren en ophalen'}. Boeken kan via de knop hieronder; daar geef je ook door waar we kunnen lossen.\n\nAl iets anders geregeld? Laat het even weten, dan hoor je verder niets meer van ons. Liever eerst bellen kan ook: 0183 851 700.\n\nMet vriendelijke groet,\nHenk van der Zouwen\nFietsenrekhuren.com, Almkerk`;
}
function herinneringHtml(x) {
  const o = x.org || {};
  return `<div class="antw" data-id="${x.id}">
<div class="mail"><div class="mk"><div class="mk-label">${ICON.mail}E-mail · herinnering</div><span>Aan</span><b style="font-weight:500">${esc(o.email)}</b><span>Onderwerp</span><b style="font-weight:500">Re: Fietsenrekken bij ${esc(x.naam)}?</b></div>
<div class="mb"><textarea id="hertekst" class="in" rows="14" aria-label="Tekst van de herinnering">${esc(herinneringTekst(x))}</textarea>
<div class="her-onder"><span class="mknop" aria-hidden="true">Bekijk en boek</span><small>Je krijgt deze mail omdat dit adres openbaar staat${o.bron ? ' op ' + esc(o.bron.split('/')[0]) : ''}. Geen mail meer van ons? Afmelden.</small></div></div></div>
<p class="kort">Aanbod verstuurd ${sindsTekst(x.verstuurd)}. Pas de tekst aan als je wilt. Er gaat niets weg tot je op versturen klikt; daarna kan er geen tweede herinnering meer.</p>
<div class="antw-voet"><button class="btn p" data-a="herinner-stuur" data-id="${x.id}">${ICON.mail} Versturen uit Outlook</button><button class="btn" id="hernee" onclick="dicht()">Annuleren</button><span class="ffout" id="herfout" role="alert"></span></div></div>`;
}
const kansSectie = (x) => { if (KLANT.includes(x.s)) return ''; const k = kans(x);
  return `<section class="sectie"><h2>Waarom deze kans<span class="rechts">${k.score} van 100</span></h2><ul class="redenen"><li class="basis"><span class="w">40</span><span>startwaarde</span></li>${k.redenen.map(([n, t]) => `<li class="${n > 0 ? 'plus' : 'min'}"><span class="w">${n > 0 ? '+' : '−'}${Math.abs(n)}</span><span>${esc(t)}</span></li>`).join('')}</ul></section>`; };
const pubLink = (x, t) => x.pub ? `<a href="https://zoek.officielebekendmakingen.nl/${esc(x.pub)}.html" target="_blank" rel="noopener">${t} ↗</a>` : '';
function paneelKop(x) {
  const pos = STAPEL.indexOf(x.id), vorig = pos > 0 ? STAPEL[pos - 1] : null, volg = pos >= 0 && pos < STAPEL.length - 1 ? STAPEL[pos + 1] : null;
  const terug = (MODULES[VIEW] && MODULES[VIEW].naam) || 'lijst';
  return `<div class="p-kop"><button class="btn sm gh p-terug" data-sluit aria-label="Terug naar ${esc(terug)} (Esc)" title="Terug (Esc)">${I('<path d="M19 12H5M12 19l-7-7 7-7"/>')} Terug naar ${esc(terug)}</button>${pos >= 0 && STAPEL.length > 1 ? `<button class="btn sm ic gh" ${vorig ? `data-open="${vorig}"` : 'disabled'} aria-label="Vorige (k)" title="Vorige (k)">${ICON.op}</button><button class="btn sm ic gh" ${volg ? `data-open="${volg}"` : 'disabled'} aria-label="Volgende (j)" title="Volgende (j)">${ICON.neer}</button><span class="pos">${pos + 1} van ${STAPEL.length}</span>` : '<span class="pos"></span>'}</div>`;
}
const waarom = (x) => { if (KLANT.includes(x.s)) return ''; const r = kans(x).redenen.slice().sort((a, b) => Math.abs(b[0]) - Math.abs(a[0])).slice(0, 2); return `<div class="p-waarom"><span class="mu">Kans</span>${kansCel(x)}<span>${r.length ? r.map(([n, t]) => `<b>${n > 0 ? '+' : '−'}${Math.abs(n)}</b> ${esc(t)}`).join(' · ') : 'geen bijzonderheden'}</span></div>`; };
const titelVlak = (soort, x, sub, staat) => `<div class="p-titelvlak"><div class="p-soort">${soort}</div><div class="p-titel" id="ptitel">${esc(x.naam)}</div><div class="p-sub">${sub}</div><div class="p-staat">${staat}</div>${waarom(x)}</div>`;
const hulp = '<div class="hulp"><span><span class="kbd">j</span> <span class="kbd">k</span> volgende / vorige</span><span><span class="kbd">Esc</span> sluiten</span></div>';
// AANTAL EN PRIJS: vier vaste aantallen, zelf een aantal typen, transport erbij of apart.
// Typen werkt meteen door in de bon en in de mail, zonder het paneel opnieuw te tekenen (focus blijft staan).
const maxRekken = (vrij) => (vrij != null ? vrij : VOORRAAD_BOK) * REKKEN_BOK;
function bonHtml(x, vrij) {
  const r = Math.round(x.bokken * REKKEN_BOK), t = transportVan(x), tot = prijsVan(x), teVeel = vrij != null && x.bokken > vrij;
  return `<div class="bon-r"><span>${r} fietsenrekken <i>${euro(PRIJS_BOK / REKKEN_BOK)} per rek</i></span><b>${euro(rekPrijs(x.bokken))}</b></div>
<div class="bon-r ${t ? '' : 'mu'}"><span>Transport, leveren en ophalen</span><b>${t ? euro(t) : 'in de prijs'}</b></div>
<div class="bon-tot"><span>Totaal <i>excl. btw</i></span><b data-bedrag>${euro(tot)}</b></div>
<div class="bon-r mu"><span>Inclusief 21% btw</span><span>${euro(Math.round(tot * (1 + BTW)))}</span></div>
${teVeel ? `<div class="bon-let">Rond die dag zijn er maar ${maxRekken(vrij)} rekken vrij.</div>` : ''}`;
}
function aantalSectie(x, vrij) {
  const r = Math.round(x.bokken * REKKEN_BOK), eigen = !PRESETS.includes(x.bokken), t = transportVan(x);
  return `<section class="sectie prijsblok" data-prijs="${x.id}"><h2>Aantal en prijs<span class="rechts">voorstel voor een ${esc(x.soort)}</span></h2>
<div class="seg seg5" role="group" aria-label="Aantal fietsenrekken">${PRESETS.map((n) => `<button data-pak="${n}" data-id="${x.id}" aria-pressed="${n === x.bokken}" ${vrij != null && n > vrij ? 'disabled title="Niet genoeg rekken vrij op die dag"' : ''}><b>${n * REKKEN_BOK} rekken</b><span>${euro(rekPrijs(n))}</span></button>`).join('')}<label class="seg-zelf" aria-pressed="${eigen}"><b>Zelf</b><span><input id="pzelf" data-id="${x.id}" type="number" inputmode="numeric" min="1" max="${maxRekken(vrij)}" step="1" value="${eigen ? r : ''}" placeholder="aantal" aria-label="Zelf een aantal rekken invullen"> rekken</span></label></div>
<div class="trans"><span class="trans-l">Transport</span><div class="seg seg2" role="group" aria-label="Transportkosten"><button data-trans="in" data-id="${x.id}" aria-pressed="${!t}"><b>Zit in de prijs</b></button><label class="seg-zelf" aria-pressed="${!!t}"><b>Apart rekenen</b><span>€ <input id="ptrans" data-id="${x.id}" type="number" inputmode="numeric" min="0" step="5" value="${t || ''}" placeholder="bedrag" aria-label="Transportkosten in euro, excl. btw"></span></label></div></div>
<div class="bon" id="pbon" aria-live="polite">${bonHtml(x, vrij)}</div>
<p class="kort">De mail hieronder past zich aan terwijl je typt.${vrij != null ? ` Rond die dag zijn ${vrij * REKKEN_BOK} van de ${VOORRAAD_BOK * REKKEN_BOK} rekken vrij.` : ''}</p></section>`;
}
// Na typen: bon, knoppen en mail bijwerken, en kort laten oplichten wat veranderde.
function prijsLive(x) {
  const vrij = x.datum && dagenTot(x.datum) >= 0 ? vrijOp(x.datum, x.id) : null, bon = $('#pbon'); if (!bon) return;
  const oud = bon.querySelector('[data-bedrag]').textContent; bon.innerHTML = bonHtml(x, vrij);
  if (bon.querySelector('[data-bedrag]').textContent !== oud) flits(bon.querySelector('.bon-tot'));
  document.querySelectorAll('.prijsblok [data-pak]').forEach((b) => b.setAttribute('aria-pressed', Number(b.dataset.pak) === x.bokken));
  const zelf = $('#pzelf'); zelf.closest('.seg-zelf').setAttribute('aria-pressed', !PRESETS.includes(x.bokken));
  const t = transportVan(x); $('.prijsblok [data-trans]').setAttribute('aria-pressed', !t); $('#ptrans').closest('.seg-zelf').setAttribute('aria-pressed', !!t);
  const pr = document.querySelector('#paneel .mail .pr'); if (pr && !x.mail) { const n = document.createElement('div'); n.innerHTML = voorstelZin(x); const nieuw = n.firstElementChild; if (nieuw.innerHTML !== pr.innerHTML) { pr.replaceWith(nieuw); flits(nieuw); } }
}
const flits = (el) => { if (!el) return; el.classList.remove('flits'); void el.offsetWidth; el.classList.add('flits'); };
function eventPaneel(x) {
  const o = x.org || {}, isKlant = KLANT.includes(x.s);
  const kanSturen = ['klaar', 'verwacht'].includes(x.s) && magMailen(x), open = ['klaar', 'verwacht', 'zoekt', 'zonder'].includes(x.s);
  const vrij = !isKlant && x.datum && dagenTot(x.datum) >= 0 ? vrijOp(x.datum, x.id) : null;
  const notes = [
    x.vast ? `<div class="noot vast"><b>Vaste klant.</b> Vorig jaar op ${metJaar(x.vast.datum)}: ${x.vast.rekken} fietsenrekken, ${euro(x.vast.prijs)}. <button class="link" data-open="${x.vast.id}">Vorige klus</button>${x.s === 'gepland' ? `<br>De mail wordt klaargezet op ${metJaar(x.klaarOp)}, 120 dagen vooraf.` : ''}</div>` : '',
    x.let ? `<div class="noot let"><b>Let op:</b> ${esc(x.let)}</div>` : '',
    !isKlant && x.km > 100 ? `<div class="noot let"><b>Ver weg.</b> ± ${x.km} km enkele reis: leveren en ophalen is samen ± ${x.km * 4} km rijden voor ${euro(rekPrijs(x.bokken))}${transportVan(x) ? ` + ${euro(transportVan(x))} transport` : ''}. ${transportVan(x) ? 'Combineer met een andere klus in de buurt.' : 'Reken transportkosten hieronder, combineer met een andere klus in de buurt, of laat hem liggen.'}</div>` : '',
    !actief(x) ? `<div class="noot">Weggezet tot ${datumLang(x.later)}. Daarna komt hij vanzelf terug.</div>` : '',
    afgemeld(o) ? `<div class="noot let"><b>Afgemeld.</b> ${esc(o.email)} heeft zich afgemeld en krijgt nooit meer een aanbod, ook niet volgend jaar.</div>` : '',
    !afgemeld(o) && ['klaar', 'verwacht'].includes(x.s) && persoonlijkAdres(o) ? `<div class="noot let"><b>Adres op naam.</b> ${esc(o.email)} is van een persoon, niet van de organisatie. Daar mag geen ongevraagd aanbod heen: bellen of een algemeen adres zoeken.</div>` : '',
    vrij != null && vrij < x.bokken ? `<div class="noot let"><b>${vrij ? `Nog maar ${vrij * REKKEN_BOK} rekken vrij` : 'Geen rekken vrij'}</b> rond ${datumLang(x.datum)}. ${vrij ? 'Kies een kleiner aantal of laat hem liggen.' : 'Laat hem liggen of verplaats een andere klus.'}</div>` : '',
    x.s === 'verloren' ? `<div class="noot">Verloren: ${esc(x.reden || '')}.</div>` : '',
    x.antwoord ? `<div class="noot let"><b>Klant antwoordde:</b> “${esc(x.antwoord)}”</div>` : '',
  ].join('');
  const gegevens = `<section class="sectie"><h2>Evenement</h2><dl class="eig">
<dt>Datum</dt><dd>${x.verwachteDatum ? 'verwacht rond ' : ''}${datumLang(x.datum)} <span class="mu">· ${overDagen(x.datum)}</span></dd>
<dt>Plaats</dt><dd>${esc(x.plaats)}, gemeente ${esc(x.gem)} (${esc(x.prov)})</dd>
${x.km != null ? `<dt>Afstand</dt><dd>${kmTekst(x)} vanaf Almkerk <span class="mu">· schatting</span></dd>` : ''}
<dt>Soort</dt><dd>${esc(x.soort)}</dd>
${x.fase === 'A' ? '<dt>Vergunning</dt><dd>aangevraagd, gemeente beslist nog</dd>' : ''}
${x.gevonden ? `<dt>Gevonden</dt><dd>${x.gevonden === VANDAAG ? 'vannacht, door de scan' : datumLang(x.gevonden)}</dd>` : ''}
${x.vorig ? `<dt>Eerdere edities</dt><dd>${esc(x.vorig.replace(' eerdere edities gevonden', ''))} gevonden</dd>` : ''}
${x.pub ? `<dt>Bron</dt><dd>${pubLink(x, 'vergunning bekijken')}</dd>` : ''}</dl></section>`;
  const org = `<section class="sectie"><h2>Organisator</h2>${!x.org ? '<p class="mu" style="margin:0;font-size:13px">Nog niet gevonden. De contactzoeker kijkt in lokaal nieuws, kalenders, sportbonden en vorige jaren.</p>'
    : `<dl class="eig"><dt>Naam</dt><dd>${esc(o.naam)}</dd>${o.email ? `<dt>Mail</dt><dd>${esc(o.email)} <span class="mu">· ${esc(o.soort)}</span></dd>` : '<dt>Mail</dt><dd class="mu">geen mailadres gevonden</dd>'}${o.bron ? `<dt>Gevonden op</dt><dd>${esc(o.bron)}</dd>` : ''}${o.zek ? `<dt>Zekerheid</dt><dd>${o.zek}%</dd>` : ''}${o.formulier ? `<dt>Formulier</dt><dd>${esc(o.formulier)}</dd>` : ''}${o.telefoon ? `<dt>Telefoon</dt><dd>${belbaar(esc(o.telefoon))}</dd>` : ''}</dl>`}</section>`;
  const voortgang = isKlant ? `<section class="sectie"><h2>Voortgang</h2><div class="stappen">${FASEN.map((s, j) => { const i = faseIdx(x); return `<div class="${j < i || (j === i && x.s !== 'antwoord') ? 'ok' : j === i ? 'nu' : ''}">${s}</div>`; }).join('')}</div>
<dl class="eig" style="margin-top:12px">${x.verstuurd ? `<dt>Aanbod</dt><dd>verstuurd ${sindsTekst(x.verstuurd)}${x.herinnerd ? ', herinnering ' + sindsTekst(x.herinnerd) : ''}</dd>` : ''}
${x.boeking ? `<dt>Geboekt</dt><dd>${euro(x.boeking.prijs)} · ${x.bokken * REKKEN_BOK} rekken</dd><dt>Betaling</dt><dd>${x.boeking.betaling === 'factuur' ? `${betTekst(x)}${x.boeking.betaald ? ' op ' + datumKort(x.boeking.betaald) : ''}${x.boeking.factuurMail ? ' · ' + esc(x.boeking.factuurMail) : ''}${x.boeking.inkoop ? ' · kenmerk ' + esc(x.boeking.inkoop) : ''}` : 'iDEAL, betaald'}</dd><dt>Lossen</dt><dd>${esc(x.boeking.los)}${x.boeking.punt && x.boeking.punt.lat != null ? ` · <a href="https://www.google.com/maps/dir/?api=1&destination=${x.boeking.punt.lat},${x.boeking.punt.lng}" target="_blank" rel="noopener">route ↗</a>` : ''}</dd>${x.boeking.bouw && x.boeking.bouw.belMe ? '<dt>Bouwen</dt><dd><span class="open">Klant wil even bellen</span> over waar de rekken komen</dd>' : ''}${x.boeking.bouw && x.boeking.bouw.lijnen && x.boeking.bouw.lijnen.length ? `<dt>Bouwen</dt><dd>${x.boeking.bouw.lijnen.length} ${x.boeking.bouw.lijnen.length === 1 ? 'rij' : 'rijen'} getekend${x.boeking.bouw.meter ? `, samen ± ${x.boeking.bouw.meter} m` : ''}${x.boeking.bouw.adres ? ' · ' + esc(x.boeking.bouw.adres) : ''}<div class="bouwkaart" id="pbouw" data-id="${x.id}">${bouwSvg(x.boeking)}<span class="bk-leg"><i class="l"></i>rekken <i class="p"></i>lossen</span></div></dd>` : ''}<dt>Op de dag</dt><dd>${belbaar(esc(x.boeking.contact))}</dd>` : ''}
${x.volgend ? (() => { const v = DB.vind(x.volgend); return `<dt>Volgend jaar</dt><dd>${v.s === 'gepland' ? `mail wordt klaargezet op ${metJaar(v.klaarOp)}` : 'mail staat klaar'} · <button class="link" data-open="${x.volgend}">bekijk</button></dd>`; })() : ''}</dl></section>` : '';
  const aantal = isKlant ? '' : aantalSectie(x, vrij);
  const mail = o.email && x.s !== 'geleverd' ? `<section class="sectie"><h2>${isKlant ? 'Verstuurde mail' : 'Mail die de klant krijgt'}</h2>${mailHtml(x)}${!isKlant ? `<div class="klantzicht"><div><b>Wat ziet de klant na “Bekijk en boek”?</b><span>Een boekpagina: aantal, losplek, waar de rekken komen, contact en betalen.</span></div><button class="btn" data-a="probeer" data-id="${x.id}">Bekijk wat de klant ziet →</button></div>` : ''}</section>` : '';
  const hoofdKnop = kanSturen ? `<button class="btn p" data-a="stuur" data-id="${x.id}">${ICON.mail} Versturen uit Outlook</button>`
    : x.s === 'zonder' ? `<button class="btn p" data-a="bel" data-id="${x.id}">${ICON.bel} Bellen of formulier</button>`
    : x.s === 'verstuurd' ? (x.herinnerd ? '<span class="mu klein">Herinnering is verstuurd</span>' : `<button class="btn" data-a="herinner" data-id="${x.id}">${ICON.herhaal} Herinnering sturen</button>`)
    : x.s === 'antwoord' ? `<button class="btn p" data-a="outlook" data-id="${x.id}">${ICON.antwoord} Antwoorden in Outlook</button>`
    : x.boeking && x.boeking.betaling === 'factuur' && !x.boeking.betaald && x.s === 'geleverd' ? `<button class="btn p" data-a="betaald" data-id="${x.id}">Factuur betaald</button>`
    : x.s === 'geboekt' ? `<button class="btn" data-a="werkbon" data-id="${x.id}">Werkbon</button>` : '';
  // Afsluiten: telefonisch geboekt of verloren (met reden, zodat de kansscore er later van leert).
  const afsluit = ['verstuurd', 'antwoord', 'zonder'].includes(x.s) ? `<div class="meer"><button class="btn" data-a="telgeboekt" data-id="${x.id}">Telefonisch geboekt</button>${['verstuurd', 'antwoord'].includes(x.s) ? `<select class="sel" data-verloren="${x.id}" aria-label="Verloren, met reden"><option value="">Verloren…</option>${['Te duur', 'Al geregeld', 'Geen interesse', 'Geen reactie'].map((r) => `<option>${r}</option>`).join('')}</select>` : ''}</div>` : '';
  const meer = open ? `<div class="meer">${actief(x) ? `<button class="btn" data-a="later" data-id="${x.id}">Later</button>` : `<button class="btn" data-a="terughalen" data-id="${x.id}">Terughalen</button>`}<button class="btn" data-a="geregeld" data-id="${x.id}">Al geregeld</button><button class="btn" data-a="weg" data-id="${x.id}">Niet relevant</button></div>` : '';
  return `${paneelKop(x)}<div class="p-body">${titelVlak(isKlant ? 'Klant · ' + esc(o.naam || '') : 'Evenement', x, `${esc(x.plaats)} · ${datumKort(x.datum)}`, `${statusCel(x)}${isKlant ? `<b class="num">${euro(bedrag(x))}</b>` : ''}${x.km != null ? `<span class="mu">${kmTekst(x)}</span>` : ''}`)}
<div class="p-inhoud">${notes}${voortgang}${schetsenHtml(x) ? `<section class="sectie"><h2>Lossen en opbouwen</h2>${schetsenHtml(x)}</section>` : ''}${aantal}${mail}${org}${gegevens}${kansSectie(x)}${hulp}</div></div>
${hoofdKnop || meer || afsluit ? `<div class="p-voet">${hoofdKnop}${afsluit}${meer}</div>` : ''}`;
}
function bouwPaneel(x) {
  const open = x.s !== 'weg';
  return `${paneelKop(x)}<div class="p-body">${titelVlak('Bouwproject · echt, uit het Gemeenteblad', x, `${esc(x.plaats)} · gemeente ${esc(x.gem)}, ${esc(x.prov)}`, `${statusCel(x)}<span class="mu">${BSTATUS[x.bstatus]}</span>${x.km != null ? `<span class="mu">${kmTekst(x)}</span>` : ''}`)}
<div class="p-inhoud">${x.gebeld ? `<div class="noot vast">Gebeld op ${datumLang(x.gebeld)}.</div>` : ''}${!actief(x) ? `<div class="noot">Weggezet tot ${datumLang(x.later)}.</div>` : ''}
<p class="p-lead">${esc(x.noot)}</p>
<section class="sectie"><h2>Wie bellen</h2><div class="belkaart">${ICON.bel}<div>${x.aanvrager ? `<b>${esc(x.aanvrager)}</b><span>Aanvrager uit de publicatie, waarschijnlijk de aannemer: zij regelen de bouwplaats.</span>` : `<b>Gemeente ${esc(x.gem)}, afdeling vergunningen</b><span>De aanvrager staat niet in de publicatie. Vraag de gemeente wie het project uitvoert.</span>`}</div></div></section>
<section class="sectie"><h2>Aanpak</h2><ol class="stappenlijst"><li>Bellen: ${x.aanvrager ? esc(x.aanvrager) : 'de gemeente ' + esc(x.gem)}.</li><li>Vragen: hoeveel fietsen, hoe lang, en wie betaalt (aannemer, gemeente of school).</li>${/bouwhek/i.test(x.noot) ? '<li>Bouwhekken eromheen aanbieden: rekken en hekken in één prijs.</li>' : ''}<li>Prijs voor langere huur zelf afspreken.</li></ol></section>
<section class="sectie"><h2>Project</h2><dl class="eig"><dt>Periode</dt><dd>${periodeKort(x)}</dd>${duurTekst(x) ? `<dt>Duur</dt><dd>${duurTekst(x)}</dd>` : ''}<dt>Soort</dt><dd>${SOORTBOUW[x.soortBouw]}</dd>${x.km != null ? `<dt>Afstand</dt><dd>${kmTekst(x)} vanaf Almkerk <span class="mu">· schatting</span></dd>` : ''}${x.pubs > 1 ? `<dt>Publicaties</dt><dd>${x.pubs} samengevoegd</dd>` : ''}<dt>Bron</dt><dd>${pubLink(x, 'publicatie bekijken')}</dd></dl></section>
${kansSectie(x)}<p class="kort">RekRadar maakt bij bouwprojecten geen offerte en stuurt geen mail; de prijs voor langere huur is nog niet afgesproken.</p>${hulp}</div></div>
${open ? `<div class="p-voet"><button class="btn p" data-a="gebeld" data-id="${x.id}">${ICON.bel} ${x.gebeld ? 'Opnieuw gebeld' : 'Gebeld'}</button><div class="meer">${actief(x) ? `<button class="btn" data-a="later" data-id="${x.id}">Later</button>` : `<button class="btn" data-a="terughalen" data-id="${x.id}">Terughalen</button>`}<button class="btn" data-a="geregeld" data-id="${x.id}">Al geregeld</button><button class="btn" data-a="weg" data-id="${x.id}">Niet relevant</button></div></div>` : ''}`;
}
function paneelHtml() {
  const x = DETAIL != null && DB.vind(DETAIL); if (!x) return '';
  return `<div class="scrim" data-sluit></div><aside class="paneel" id="paneel" tabindex="-1" role="dialog" aria-labelledby="ptitel">${x.s === 'bouw' || x.echt ? bouwPaneel(x) : eventPaneel(x)}</aside>`;
}

// =====================================================================
// KLANTFORMULIER (wat de klant ziet na "Bekijk en boek")
// =====================================================================
let pin = null;
// ---------- losplek + bouwplek: PDOK (overheid, open data, geen sleutel) voor adres zoeken, luchtfoto en kaart; Leaflet voor de kaart ----------
const PDOK = { suggest: 'https://api.pdok.nl/bzk/locatieserver/search/v3_1/suggest', lookup: 'https://api.pdok.nl/bzk/locatieserver/search/v3_1/lookup',
  foto: 'https://service.pdok.nl/hwh/luchtfotorgb/wmts/v1_0/Actueel_orthoHR/EPSG:3857/{z}/{x}/{y}.jpeg',
  kaart: 'https://service.pdok.nl/brt/achtergrondkaart/wmts/v2_0/standaard/EPSG:3857/{z}/{x}/{y}.png' };
const GEEN_KAART = 'Tik op de schets waar de vrachtwagen kan stoppen.';
const DEMO_MELDING = '<b>Kaart geblokkeerd in dit venster.</b> Daarom zie je een schets. De versie met adres zoeken en luchtfoto staat op <a href="https://thijmenkant.github.io/hekradar-demo/" target="_blank" rel="noopener">thijmenkant.github.io/hekradar-demo</a>.';
let losPunt = null, losAdres = '', bouwAdres = '', bouwLijnen = [[]], bouwKlaar = false, bouwSchets = false, leafletBelofte = null, zoekTimer = null, pKaart = null;
const K = {}; // K.los / K.bouw: { map, lagen, pin, lijnen, losRef }
function laadLeaflet() {
  if (window.L) return Promise.resolve(true);
  return leafletBelofte ||= new Promise((res) => { const s = document.createElement('script'); s.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js'; s.integrity = 'sha256-20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV1lvTlZBo='; s.crossOrigin = ''; s.onload = () => res(!!window.L); s.onerror = () => res(false); document.head.appendChild(s); setTimeout(() => res(!!window.L), 8000); });
}
const tegels = () => ({ foto: L.tileLayer(PDOK.foto, { maxZoom: 21, maxNativeZoom: 19, attribution: 'Luchtfoto Beeldmateriaal.nl / PDOK' }), kaart: L.tileLayer(PDOK.kaart, { maxZoom: 21, maxNativeZoom: 19, attribution: 'Kaart Kadaster / PDOK' }) });
const pinIcoon = (klein) => L.divIcon({ className: 'lospin' + (klein ? ' klein' : ''), html: '<span></span>', iconSize: klein ? [20, 28] : [28, 40], iconAnchor: klein ? [10, 28] : [14, 40] });
function kaartenWeg() { ['los', 'bouw'].forEach((k) => { if (K[k]) { K[k].map.remove(); delete K[k]; } }); }
function schetsHtml(id, label, extra) { return `<div class="plattegrond" id="${id}" role="img" aria-label="${label}"><div style="position:absolute;left:0;right:0;top:78px;height:22px;background:#fff"></div><div style="position:absolute;top:0;bottom:0;left:46%;width:18px;background:#fff"></div><div style="position:absolute;left:6%;top:16px;width:30%;height:48px;background:#dcd7cc"></div><div style="position:absolute;left:54%;top:112px;width:38%;height:58px;background:#dcd7cc"></div>${extra || ''}</div>`; }
function naarSchets() {
  kaartenWeg(); bouwSchets = true; bouwLijnen = [[]]; bouwKlaar = false;
  document.querySelectorAll('.demomelding').forEach((m) => { m.innerHTML = DEMO_MELDING; m.hidden = false; });
  document.querySelectorAll('#fadres, #fbadres').forEach((i) => { i.closest('label').hidden = true; });
  const v = $('#kaartvak'); if (v) { v.outerHTML = schetsHtml('kaartje', 'Schets: tik om de losplek te kiezen'); $('#kaartnoot').textContent = GEEN_KAART; }
  const b = $('#bkaartvak'); if (b) { b.outerHTML = schetsHtml('bschets', 'Schets: tik punten aan waar de rekken moeten komen', '<svg aria-hidden="true"></svg>'); $('#bkaartnoot').textContent = 'Tik op de schets punt voor punt aan waar de rij rekken moet komen.'; }
  tekenBouw();
}
function zetLosPunt(lat, lng) {
  losPunt = { lat: +lat.toFixed(6), lng: +lng.toFixed(6) };
  const s = $('#loscoord'); if (s) s.textContent = `Losplek gekozen${losAdres ? ' bij ' + losAdres : ''}.`; const f = $('#ffout'); if (f) f.textContent = '';
  if (K.bouw) { if (!K.bouw.losRef) K.bouw.losRef = L.marker([lat, lng], { icon: pinIcoon(true), interactive: false, keyboard: false }).addTo(K.bouw.map); else K.bouw.losRef.setLatLng([lat, lng]); if (!bouwPunten()) K.bouw.map.setView([lat, lng], Math.max(K.bouw.map.getZoom(), 18)); }
}
async function startKaarten(x) {
  const c = LOC[x.plaats] || LOC[x.gem] || LOC.Almkerk;
  const ok = await laadLeaflet();
  if (!$('#kaart')) return;
  if (!ok) return naarSchets();
  kaartenWeg();
  K.los = { map: L.map('kaart').setView(c, 15), lagen: tegels() };
  K.bouw = { map: L.map('bkaart').setView(c, 15), lagen: tegels() };
  let geladen = 0, fouten = 0; K.los.lagen.foto.on('tileload', () => geladen++).on('tileerror', () => fouten++);
  K.los.lagen.foto.addTo(K.los.map); K.bouw.lagen.foto.addTo(K.bouw.map);
  K.los.pin = L.marker(c, { draggable: true, keyboard: true, title: 'Sleep naar de losplek', icon: pinIcoon() }).addTo(K.los.map);
  K.los.pin.on('dragend', () => { const p = K.los.pin.getLatLng(); zetLosPunt(p.lat, p.lng); });
  K.los.map.on('click', (ev) => { K.los.pin.setLatLng(ev.latlng); zetLosPunt(ev.latlng.lat, ev.latlng.lng); });
  K.bouw.lijnen = L.layerGroup().addTo(K.bouw.map);
  K.bouw.map.on('click', (ev) => { if (!bouwKlaar) voegPunt([+ev.latlng.lat.toFixed(6), +ev.latlng.lng.toFixed(6)]); });
  setTimeout(() => { if (K.los && !geladen && fouten) naarSchets(); }, 3500);
}
// ---------- tekenen: punten aantikken, lijn per rij rekken ----------
const bouwPunten = () => bouwLijnen.reduce((s, l) => s + l.length, 0);
const echteLijnen = () => bouwLijnen.filter((l) => l.length > 1);
function meterTussen(a, b) { const r = Math.PI / 180, dLa = (b[0] - a[0]) * r, dLo = (b[1] - a[1]) * r, h = Math.sin(dLa / 2) ** 2 + Math.cos(a[0] * r) * Math.cos(b[0] * r) * Math.sin(dLo / 2) ** 2; return 6371000 * 2 * Math.asin(Math.sqrt(h)); }
function lijnMeter(l) { let m = 0; for (let i = 1; i < l.length; i++) m += meterTussen(l[i - 1], l[i]); return m; }
function voegPunt(p) { bouwLijnen[bouwLijnen.length - 1].push(p); const f = $('#ffout'); if (f) f.textContent = ''; tekenBouw(); }
function tekenActie(a) {
  const laatste = bouwLijnen[bouwLijnen.length - 1];
  if (a === 'ongedaan') { if (laatste.length) laatste.pop(); else if (bouwLijnen.length > 1) { bouwLijnen.pop(); bouwLijnen[bouwLijnen.length - 1].pop(); } }
  else if (a === 'nieuw') { if (laatste.length > 1) bouwLijnen.push([]); }
  else if (a === 'wis') { bouwLijnen = [[]]; bouwKlaar = false; }
  else if (a === 'klaar') { if (!bouwKlaar && !echteLijnen().length) { $('#bstatus').textContent = 'Tik eerst minstens twee punten aan.'; return; } bouwKlaar = !bouwKlaar; if (bouwKlaar) bouwLijnen = echteLijnen(); if (!bouwKlaar) bouwLijnen.push([]); }
  tekenBouw();
}
function tekenBouw() {
  if (K.bouw) {
    K.bouw.lijnen.clearLayers();
    bouwLijnen.forEach((l) => { if (l.length > 1) { L.polyline(l, { color: '#1b1e20', weight: 9, opacity: .55, interactive: false }).addTo(K.bouw.lijnen); L.polyline(l, { color: '#ffd400', weight: 5, interactive: false }).addTo(K.bouw.lijnen); } if (!bouwKlaar) l.forEach((p) => L.circleMarker(p, { radius: 5, color: '#1b1e20', weight: 2, fillColor: '#ffd400', fillOpacity: 1, interactive: false }).addTo(K.bouw.lijnen)); });
  } else {
    const vak = $('#bschets'), svg = vak && vak.querySelector('svg');
    if (svg) { const r = vak.getBoundingClientRect(), xy = ([x, y]) => `${(x * r.width / 100).toFixed(1)},${(y * r.height / 100).toFixed(1)}`; svg.innerHTML = bouwLijnen.map((l) => (l.length > 1 ? `<polyline points="${l.map(xy).join(' ')}" fill="none" stroke="#1b1e20" stroke-opacity=".55" stroke-width="9" stroke-linecap="round" stroke-linejoin="round"/><polyline points="${l.map(xy).join(' ')}" fill="none" stroke="#ffd400" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>` : '') + (bouwKlaar ? '' : l.map((p) => { const [a, b] = xy(p).split(','); return `<circle cx="${a}" cy="${b}" r="5" fill="#ffd400" stroke="#1b1e20" stroke-width="2"/>`; }).join(''))).join(''); }
  }
  const st = $('#bstatus'); if (!st) return;
  const n = echteLijnen().length, m = bouwSchets ? 0 : echteLijnen().reduce((s, l) => s + lijnMeter(l), 0);
  const wat = n ? `${n} ${n === 1 ? 'lijn' : 'lijnen'}${m ? `, samen ± ${Math.round(m)} m` : ''}` : '';
  st.textContent = bouwKlaar ? `Tekening klaar: ${wat}. Henk krijgt dit bij je boeking.` : n ? `${wat} getekend. Nog een rij? Tik op “Nieuwe lijn”.` : bouwPunten() ? 'Tik het volgende punt aan.' : '';
  const kl = $('[data-teken="klaar"]'); if (kl) { kl.textContent = bouwKlaar ? 'Wijzigen' : 'Tekening klaar'; kl.classList.toggle('p', !bouwKlaar); }
  document.querySelectorAll('[data-teken]:not([data-teken="klaar"])').forEach((b) => { b.disabled = bouwKlaar; });
  const vak = $('#bkaartvak, #bschets'); if (vak) vak.classList.toggle('vast', bouwKlaar);
}
// ---------- adres zoeken (PDOK) of plek uit een Google Maps-link ----------
function leesCoord(q) {
  const m = /!3d(-?\d{1,2}\.\d+)!4d(-?\d{1,3}\.\d+)/.exec(q) || /@(-?\d{1,2}\.\d+),\s*(-?\d{1,3}\.\d+)/.exec(q) || /[?&](?:q|ll|query|destination)=(-?\d{1,2}\.\d+)(?:,|%2C)\s*(-?\d{1,3}\.\d+)/i.exec(q) || /^\s*(-?\d{1,2}\.\d+)\s*,\s*(-?\d{1,3}\.\d+)\s*$/.exec(q);
  return m && Math.abs(+m[1]) <= 90 ? [+m[1], +m[2]] : null;
}
async function zoekAdres(q, doel) {
  const lijst = $(doel === 'bouw' ? '#badreslijst' : '#adreslijst'); if (!lijst) return;
  if (q.trim().length < 3) { lijst.innerHTML = ''; return; }
  const c = leesCoord(q);
  if (c) { lijst.innerHTML = `<button type="button" data-coord="${c.join(',')}" data-doel="${doel}">Plek uit de Google Maps-link gebruiken</button>`; return; }
  if (/goo\.gl|maps\.app/i.test(q)) { lijst.innerHTML = '<div class="niets">Een korte Google Maps-link kunnen we niet lezen. Typ het adres of de postcode, of tik op de kaart.</div>'; return; }
  try {
    const r = await fetch(`${PDOK.suggest}?q=${encodeURIComponent(q)}&fq=${encodeURIComponent('type:(adres OR postcode OR weg)')}&rows=6`).then((x) => x.json());
    const d = r.response.docs;
    lijst.innerHTML = d.length ? d.map((a) => `<button type="button" data-pdok="${esc(a.id)}" data-doel="${doel}">${esc(a.weergavenaam)}</button>`).join('') : '<div class="niets">Geen adres gevonden. Probeer straat + plaats of een postcode.</div>';
  } catch (err) { lijst.innerHTML = '<div class="niets">Adres zoeken werkt niet in dit demovenster; op de website wel. Tik op de kaart.</div>'; }
}
function kiesPlek(doel, lat, lng, naam) {
  $(doel === 'bouw' ? '#badreslijst' : '#adreslijst').innerHTML = '';
  if (doel === 'bouw') { bouwAdres = naam; $('#fbadres').value = naam; if (K.bouw) K.bouw.map.setView([lat, lng], 19); $('#bkaartnoot').textContent = 'Tik nu punt voor punt aan waar de rij rekken moet komen.'; return; }
  losAdres = naam; $('#fadres').value = naam;
  if (K.los) { K.los.map.setView([lat, lng], 19); K.los.pin.setLatLng([lat, lng]); }
  zetLosPunt(lat, lng); $('#kaartnoot').textContent = 'Klopt de pin? Sleep hem precies naar de plek waar de vrachtwagen kan stoppen.';
}
async function kiesAdres(id, naam, doel) {
  try {
    const r = await fetch(`${PDOK.lookup}?id=${encodeURIComponent(id)}&fl=centroide_ll,weergavenaam`).then((x) => x.json());
    const m = /POINT\(([-\d.]+) ([-\d.]+)\)/.exec(r.response.docs[0].centroide_ll); if (!m) return;
    kiesPlek(doel, +m[2], +m[1], naam);
  } catch (err) { $(doel === 'bouw' ? '#bkaartnoot' : '#kaartnoot').textContent = 'Adres kon niet worden opgehaald. Tik op de kaart.'; }
}
// ---------- bij Henk: losplek + getekende rijen in het detailpaneel ----------
function bouwSvg(b) {
  const lijnen = b.bouw ? b.bouw.lijnen : [], punt = b.punt;
  if (!lijnen.length && !punt) return '';
  const schets = b.bouw && b.bouw.schets;
  const pts = lijnen.flat().concat(punt && !schets ? [[punt.lat, punt.lng]] : schets && punt && punt.x != null ? [[punt.x, punt.y]] : []);
  const proj = schets ? ([x, y]) => [x, y] : (() => { const k = Math.cos((pts[0][0] * Math.PI) / 180); return ([la, ln]) => [ln * k, -la]; })();
  const P = pts.map(proj), xs = P.map((p) => p[0]), ys = P.map((p) => p[1]);
  const W = 320, H = 170, pad = 22, bx = Math.max(...xs) - Math.min(...xs) || 1e-6, by = Math.max(...ys) - Math.min(...ys) || 1e-6, s = Math.min((W - 2 * pad) / bx, (H - 2 * pad) / by);
  const ox = (W - bx * s) / 2, oy = (H - by * s) / 2, xy = (p) => { const [a, c] = proj(p); return `${(ox + (a - Math.min(...xs)) * s).toFixed(1)},${(oy + (c - Math.min(...ys)) * s).toFixed(1)}`; };
  const pinPt = punt ? (schets ? (punt.x != null ? [punt.x, punt.y] : null) : [punt.lat, punt.lng]) : null;
  return `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Schets van losplek en bouwplek">${lijnen.map((l) => `<polyline points="${l.map(xy).join(' ')}" fill="none" stroke="#1b1e20" stroke-opacity=".5" stroke-width="8" stroke-linecap="round" stroke-linejoin="round"/><polyline points="${l.map(xy).join(' ')}" fill="none" stroke="#e8b800" stroke-width="4.5" stroke-linecap="round" stroke-linejoin="round"/>`).join('')}${pinPt ? (() => { const [a, c] = xy(pinPt).split(',').map(Number); return `<circle cx="${a}" cy="${c}" r="7" fill="#b3261e" stroke="#fff" stroke-width="2.5"/><text x="${a + 11}" y="${c + 4}" font-size="11" font-weight="600" fill="#1b1e20">lossen</text>`; })() : ''}</svg>`;
}
// ---------- voorbeeldschets lossen + opbouwen (verzonnen boekingen zonder getekende kaart) ----------
// Vier plattegronden die passen bij de losplek-omschrijving. Coördinaten in een vlak van 320 × 190.
// Rijen rekken: 1 rij per halve bok, hoogstens 4. Het is een voorbeeld van wat de klant bij het boeken intekent.
const PLATTEGROND = {
  plein: { wegen: [[0, 152, 320, 26], [262, 0, 26, 152]], gebouwen: [[10, 8, 70, 38], [90, 8, 60, 38], [160, 8, 90, 38], [10, 56, 40, 86]], vlak: [62, 58, 190, 84, 'plein'], wl: [[275, 140, 'achteringang']],
    los: [275, 92, 90], pin: [256, 92], rij: (i) => [150, 70 + i * 16, 238, 70 + i * 16] },
  kerk: { wegen: [[0, 12, 320, 26], [0, 38, 22, 152]], gebouwen: [[40, 62, 88, 96, 'kerk'], [68, 46, 30, 18], [252, 156, 58, 30]], vlak: [150, 56, 156, 92, 'parkeerplaats', 1], wl: [],
    los: [196, 25, 0], pin: [196, 64], rij: (i) => [168, 140 - i * 12, 288, 140 - i * 12] },
  ingang: { wegen: [[0, 152, 320, 26]], gebouwen: [[196, 134, 16, 13], [214, 134, 16, 13]], vlak: [20, 12, 280, 120, 'evenemententerrein'], wl: [[138, 147, 'hoofdingang', 'end'], [222, 128, 'containers']],
    los: [150, 165, 0], pin: [150, 140], rij: (i) => [36, 118 - i * 13, 128, 118 - i * 13], poort: [142, 178] },
  gemeentehuis: { wegen: [[0, 122, 320, 26], [204, 0, 24, 122]], gebouwen: [[22, 22, 116, 84, 'gemeentehuis'], [240, 16, 70, 42], [240, 66, 70, 44], [20, 158, 120, 28], [170, 158, 140, 28]], vlak: [144, 22, 54, 92, 'pleintje'], wl: [],
    los: [216, 60, 90], pin: [199, 60], rij: (i) => [156 + i * 11, 46, 156 + i * 11, 108] },
};
const plattegrondVan = (los) => /plein|markt/i.test(los) ? 'plein' : /kerk|parkeer/i.test(los) ? 'kerk' : /ingang|container|start/i.test(los) ? 'ingang' : /gemeentehuis|zijstraat/i.test(los) ? 'gemeentehuis' : 'plein';
const rijenVan = (b) => b <= 0.5 ? 1 : b <= 1 ? 2 : b <= 2 ? 3 : 4;
function schetsSvg(x, nadruk) {
  const b = x.boeking, t = PLATTEGROND[plattegrondVan(b.los)], n = rijenVan(x.bokken), los = nadruk === 'los';
  const [vx, vy, vw, vh, vl, park] = t.vlak, [lx, ly, lr] = t.los, [px, py] = t.pin;
  const rijen = Array.from({ length: n }, (_, i) => t.rij(i));
  const lijn = ([a, c, d, e]) => `<line x1="${a}" y1="${c}" x2="${d}" y2="${e}" stroke="#1b1e20" stroke-opacity=".55" stroke-width="8" stroke-linecap="round"/><line x1="${a}" y1="${c}" x2="${d}" y2="${e}" stroke="#e8b800" stroke-width="4.5" stroke-linecap="round"/>`;
  const truck = `<g transform="translate(${lx} ${ly}) rotate(${lr})"><rect x="-20" y="-8" width="28" height="16" rx="2" fill="#fff" stroke="#1b1e20" stroke-width="1.5"/><rect x="9" y="-7" width="10" height="14" rx="2" fill="#5b6066"/></g>`;
  const tekst = (a, c, w, kl = '#5b6066', anker = 'middle') => `<text x="${a}" y="${c}" font-size="10" fill="${kl}" text-anchor="${anker}" font-family="inherit">${w}</text>`;
  return `<svg viewBox="0 0 320 190" role="img" aria-label="${los ? 'Schets: waar de vrachtwagen lost' : 'Schets: waar de rekken komen'}">
<rect width="320" height="190" fill="#eceee6"/>
${t.wegen.map(([a, c, w, h]) => `<rect x="${a}" y="${c}" width="${w}" height="${h}" fill="#cfd1cb"/>`).join('')}
<rect x="${vx}" y="${vy}" width="${vw}" height="${vh}" fill="#f8f7f2" stroke="#a9aca6" stroke-dasharray="4 3"/>
${park ? Array.from({ length: 9 }, (_, i) => `<line x1="${vx + 12 + i * 16}" y1="${vy + 4}" x2="${vx + 12 + i * 16}" y2="${vy + 18}" stroke="#c9cbc5"/>`).join('') : ''}
${tekst(vx + 6, vy + (park ? 32 : 14), vl, '#8a8f94', 'start')}
${t.gebouwen.map(([a, c, w, h, nm]) => `<rect x="${a}" y="${c}" width="${w}" height="${h}" fill="#b8bbb6"/>${nm ? tekst(a + w / 2, c + h / 2 + 3, nm, '#3a3f44') : ''}`).join('')}
${t.wl.map(([a, c, w, anker]) => tekst(a, c, w, '#5b6066', anker)).join('')}
<g opacity="${los ? 0.28 : 1}">${rijen.map(lijn).join('')}</g>
<g opacity="${los ? 1 : 0.35}">${truck}${los ? `<circle cx="${px}" cy="${py}" r="14" fill="#b3261e" fill-opacity=".14"/>` : ''}<circle cx="${px}" cy="${py}" r="6.5" fill="#b3261e" stroke="#fff" stroke-width="2.5"/></g>
</svg>`;
}
// Sectie in het paneel en op de werkbon: twee schetsen naast elkaar, lossen en opbouwen.
function schetsenHtml(x) {
  const b = x.boeking; if (!b || b.telefonisch || (b.punt) || (b.bouw && (b.bouw.lijnen || []).length)) return '';
  const n = rijenVan(x.bokken), r = x.bokken * REKKEN_BOK;
  return `<div class="schetsen"><figure class="schets">${schetsSvg(x, 'los')}<figcaption><b><i class="sl-pin"></i>Lossen</b><span>${esc(b.los)}</span></figcaption></figure>
<figure class="schets">${schetsSvg(x, 'bouw')}<figcaption><b><i class="sl-rij"></i>Opbouwen</b><span>${r} rekken in ${n} ${n === 1 ? 'rij' : 'rijen'}</span></figcaption></figure></div>
<p class="kort">Voorbeeldschets bij een verzonnen boeking. Bij een echte boeking tekent de klant dit zelf op de luchtfoto: de losplek met een pin en de rijen met lijnen.</p>`;
}
async function naPaneel() {
  if (pKaart) { pKaart.remove(); pKaart = null; }
  const vak = $('#pbouw'); if (!vak) return; const x = DB.vind(Number(vak.dataset.id)); if (!x || !x.boeking || !x.boeking.punt || x.boeking.punt.lat == null || (x.boeking.bouw && x.boeking.bouw.schets)) return;
  if (!(await laadLeaflet()) || $('#pbouw') !== vak) return;
  const el = document.createElement('div'); el.className = 'pkaart'; vak.appendChild(el);
  const b = x.boeking; pKaart = L.map(el, { zoomControl: true, attributionControl: true });
  const laag = tegels().foto; laag.once('tileload', () => vak.classList.add('echt')); laag.addTo(pKaart);
  L.marker([b.punt.lat, b.punt.lng], { icon: pinIcoon(), interactive: false, keyboard: false }).addTo(pKaart);
  (b.bouw ? b.bouw.lijnen : []).forEach((l) => { L.polyline(l, { color: '#1b1e20', weight: 9, opacity: .55, interactive: false }).addTo(pKaart); L.polyline(l, { color: '#ffd400', weight: 5, interactive: false }).addTo(pKaart); });
  const alle = [[b.punt.lat, b.punt.lng]].concat(b.bouw ? b.bouw.lijnen.flat() : []);
  pKaart.fitBounds(alle, { padding: [30, 30], maxZoom: 19 });
}
const metBtw = (n) => euro(Math.round(n * (1 + BTW)));
const aantalOpties = (x, d, kies) => { const vrij = vrijOp(d, x.id), l = [...new Set([0.5, 1, 2, 3, 4, 6, kies])].filter((n) => n > 0 && n <= vrij).sort((a, b) => a - b); return l.length ? l.map((n) => `<option value="${n}" ${n === Math.min(kies, l[l.length - 1]) ? 'selected' : ''}>${Math.round(n * REKKEN_BOK)} fietsenrekken · ${euro(rekPrijs(n))}</option>`).join('') : '<option value="0">Op deze dag zijn alle rekken verhuurd</option>'; };
// De boeking van vorig jaar (vaste klant), om losplek en aantal vooraf in te vullen.
const vorigeBoeking = (x) => x.vast && DB.vind(x.vast.id) && DB.vind(x.vast.id).boeking;
function formInteractief(x) {
  const opties = aantalOpties(x, x.datum, x.bokken), vb = vorigeBoeking(x);
  const slug = x.naam.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  return `<div class="adresbalk"><span class="slot">🔒</span>fietsenrekhuren.com/boek/${esc(slug)}-${(x.id * 7919 + 104729).toString(36)}<span class="mu">· de link uit de mail</span></div>
<div class="klantpagina"><header class="kp-kop">${BIKE('#fff', '#8fd18f', 30)}<span>fietsenrek<em>huren</em>.com</span><a class="kp-tel">Vragen? 0183 851 700</a></header>
<div class="kp-in"><div class="kp-form">
<h2 class="klantkop">Fietsenrekken voor ${esc(x.naam)}</h2><p class="mu" style="margin:4px 0 0;font-size:14px">Beste ${esc(x.org ? x.org.naam : '')}, in vijf stappen is het geregeld.</p>
<section class="fb"><b><i class="stap-n">1</i>Datum en aantal</b><label>Datum<input type="date" id="fdat" value="${x.datum}"></label><label>Aantal<select id="fbok">${opties}</select></label></section>
<section class="fb"><b><i class="stap-n">2</i>Waar kunnen we lossen?</b>
<div class="demomelding" hidden></div>
${vb ? `<label class="vink"><input type="checkbox" id="fvorig"><span>Zelfde losplek als vorig jaar: <b>${esc(vb.los)}</b></span></label>` : ''}
<label>Adres, postcode of Google Maps-link<input id="fadres" autocomplete="off" placeholder="Bijv. Markt 1, ${esc(x.plaats)} of 4286BA" aria-describedby="kaartnoot"></label>
<div class="adreslijst" id="adreslijst" role="listbox" aria-label="Gevonden adressen"></div>
<div class="kaartvak" id="kaartvak" data-k="los"><div id="kaart" class="kaart" aria-label="Kaart met losplek"></div><div class="kaart-wissel" role="group" aria-label="Kaartweergave"><button type="button" data-laag="foto" aria-pressed="true">Luchtfoto</button><button type="button" data-laag="kaart" aria-pressed="false">Kaart</button></div></div>
<span class="mu" id="kaartnoot" style="font-size:13px">Zoek het adres en sleep de pin naar de plek waar de vrachtwagen kan stoppen.</span><span class="kort" id="loscoord"></span>
<label>Uitleg voor de chauffeur<textarea id="fuit" rows="2" placeholder="Bijv. via de achteringang"></textarea></label></section>
<section class="fb"><b><i class="stap-n">3</i>Waar moeten we bouwen?</b>
<label>Ander adres dan de losplek? (mag leeg)<input id="fbadres" autocomplete="off" placeholder="Adres, postcode of Google Maps-link" aria-describedby="bkaartnoot"></label>
<div class="adreslijst" id="badreslijst" role="listbox" aria-label="Gevonden adressen"></div>
<div class="kaartvak" id="bkaartvak" data-k="bouw"><div id="bkaart" class="kaart teken" aria-label="Kaart om de rekken op te tekenen"></div><div class="kaart-wissel" role="group" aria-label="Kaartweergave"><button type="button" data-laag="foto" aria-pressed="true">Luchtfoto</button><button type="button" data-laag="kaart" aria-pressed="false">Kaart</button></div></div>
<span class="mu" id="bkaartnoot" style="font-size:13px">Tik punt voor punt aan waar de rij rekken moet komen. Elke rij is één lijn.</span>
<div class="tekenbalk" role="group" aria-label="Tekenen"><button type="button" class="btn sm" data-teken="ongedaan">Punt terug</button><button type="button" class="btn sm" data-teken="nieuw">Nieuwe lijn</button><button type="button" class="btn sm" data-teken="wis">Wis alles</button><button type="button" class="btn sm p" data-teken="klaar">Tekening klaar</button></div>
<span class="kort" id="bstatus" aria-live="polite"></span>
<label class="vink"><input type="checkbox" id="fbelme"><span>Weet je het nog niet precies? Dan belt Henk je even over waar de rekken komen.</span></label></section>
<section class="fb"><b><i class="stap-n">4</i>Contact op de dag zelf</b><label>Naam<input id="fnaam" autocomplete="name"></label><label>Telefoon<input id="ftel" type="tel" autocomplete="tel"></label></section>
<section class="fb"><b><i class="stap-n">5</i>Betalen</b>
<label class="vink"><input type="radio" name="bw" value="ideal" checked><span>iDEAL, dan is het meteen geregeld</span></label>
<label class="vink"><input type="radio" name="bw" value="factuur"><span>Op factuur (stichting, vereniging of gemeente)</span></label>
<div id="ffact" hidden style="display:grid;gap:10px"><label>Factuur naar (e-mail)<input id="fmail" type="email" autocomplete="email"></label><label>Inkoopnummer of kenmerk (als je dat hebt)<input id="finkoop"></label></div>
<label class="vink"><input type="checkbox" id="fok"><span id="fregel">Annuleer je na betaling, dan krijg je het bedrag niet terug. Ik ga akkoord.</span></label>
<button class="btn p" id="fknop" data-a="betaal" data-id="${x.id}" style="height:46px;font-size:15px">Betalen met iDEAL · ${metBtw(prijsVan(x))}</button><div class="ffout" id="ffout" role="alert"></div></section>
</div>
<aside class="kp-sam" aria-label="Jouw bestelling"><b class="kp-samkop">Jouw bestelling</b>
<dl><dt>Evenement</dt><dd>${esc(x.naam)}</dd><dt>Plaats</dt><dd>${esc(x.plaats)}</dd><dt>Datum</dt><dd>${datumLang(x.datum)}</dd></dl>
${transportVan(x) ? `<div class="kp-regel"><span id="fsamaantal">${Math.round(x.bokken * REKKEN_BOK)} fietsenrekken</span><span id="frek">${euro(rekPrijs(x.bokken))}</span></div><div class="kp-regel"><span>Transportkosten</span><span>${euro(transportVan(x))}</span></div><div class="totaal"><span>Totaal</span><b id="ftot">${euro(prijsVan(x))}</b></div>` : `<div class="totaal"><span id="fsamaantal">${Math.round(x.bokken * REKKEN_BOK)} fietsenrekken</span><b id="ftot">${euro(prijsVan(x))}</b></div>`}<span class="mu" style="font-size:12px" id="fbtw">excl. btw · ${metBtw(prijsVan(x))} inclusief 21% btw</span>
<ul><li>${transportVan(x) ? 'Leveren en ophalen' : 'Transport, leveren en ophalen'}</li><li>Wij zetten de rekken neer</li><li>Vaste prijs, geen verrassingen</li></ul>
<p class="mu" style="font-size:12px;margin:0">Henk van der Zouwen · Fietsenrekhuren.com, Almkerk</p></aside></div></div>`;
}

// =====================================================================
// FRAME TEKENEN
// =====================================================================
function navTellers() { const V = voorraad(); return { vandaag: [V.antwoord.length, 'urg'], agenda: [V.leveren.filter((x) => dagenTot(x.datum) <= 14).length, 'let'], cijfers: [V.facturen.length, 'let'], werklijst: [V.klaar.length], bouw: [V.bouwBellen.length], klanten: [V.antwoord.length, 'urg'], planning: [V.leveren.filter((x) => dagenTot(x.datum) <= 14).length, 'let'] }; }
function navKnop([k, n], tel) { const t = tel[k], aan = VIEW === k || (HENK && k === 'evenementen' && VIEW === 'bouw'); return `<button class="ni ${aan ? 'on' : ''}" data-v="${k}" ${aan ? 'aria-current="page"' : ''} title="${n}">${ICON[k]}<span class="lbl">${n}</span>${t && t[0] ? `<span class="n ${t[1] || ''}">${t[0]}</span>` : ''}</button>`; }
function navHtml(tel) { return GROEPEN.map(([g, l]) => `<div class="groep"><div class="groep-kop">${g}</div>${l.map((i) => navKnop(i, tel)).join('')}</div>`).join(''); }
function frameTekenen() {
  const tel = navTellers();
  if (!$('#top').dataset.klaar) {
    $('#top').innerHTML = `<div class="merkvlak">${WM}</div><div class="prodvlak niet-m"><span class="prodnaam">RekRadar<em>nieuwe klanten</em></span></div>
<div class="globaal niet-m" id="globaal">${ICON.zoek}<input id="gzoek" type="search" placeholder="Zoek evenement, klant of plaats" autocomplete="off" aria-label="Zoek in RekRadar"><span class="kbd">/</span><div class="zoekres" id="zoekres" role="listbox"></div></div>
<div class="top-rechts"><span class="gebruiker"><span class="avatar">HZ</span><span class="gnaam">Henk van der Zouwen</span></span></div>
<button class="zknop" data-zoekm aria-label="Zoeken">${ICON.zoek}</button><button class="mknop" data-meer aria-label="Menu">${ICON.meer}</button>`;
    $('#top').dataset.klaar = 1;
  }
  $('#nav').innerHTML = `${navHtml(tel)}<div class="nav-voet">${SECUNDAIR.map((i) => navKnop(i, tel)).join('')}</div>`;
  $('#blad').innerHTML = navHtml(tel) + `<div class="groep"><div class="groep-kop">Overig</div>${SECUNDAIR.map((i) => navKnop(i, tel)).join('')}</div>`;
  const ond = HENK ? [['vandaag', 'Vandaag'], ['evenementen', 'Evenementen'], ['klanten', 'Klanten'], ['agenda', 'Agenda'], ['cijfers', 'Cijfers']] : [['overzicht', 'Overzicht'], ['werklijst', 'Werklijst'], ['klanten', 'Klanten'], ['planning', 'Planning']];
  $('#onder').innerHTML = ond.map(([k, n]) => `<button class="${VIEW === k || (HENK && k === 'evenementen' && VIEW === 'bouw') ? 'on' : ''}" data-v="${k}" ${VIEW === k ? 'aria-current="page"' : ''}>${ICON[k]}${n}${(k === 'klanten' || k === 'vandaag') && tel[k][0] ? `<em>${tel[k][0]}</em>` : ''}</button>`).join('') + `<button class="${ond.some(([k]) => k === VIEW) || (HENK && VIEW === 'bouw') ? '' : 'on'}" data-meer>${ICON.meer}Meer</button>`;
}
let NEGEER_HASH = false;
function hashZetten(nieuw) { try { const h = '#' + (DETAIL != null ? 'evenement-' + DETAIL : VIEW); if (nieuw) history.pushState({ detail: 1 }, '', h); else history.replaceState(DETAIL != null ? history.state : null, '', h); } catch (e) {} }
// ---------- VANDAAG (Henk): alles wat vandaag van Henk nodig is, belangrijkste eerst ----------
function vandaagScherm() {
  const V = voorraad(), vast = V.klaar.filter((x) => x.vast), mails = V.klaar.filter((x) => !x.vast);
  const bellen = [...V.zonder, ...V.bouwBellen], lev7 = V.leveren.filter((x) => dagenTot(x.datum) <= 7), fOpen = V.facturen.reduce((s, x) => s + bedrag(x), 0);
  const rij = (x, wat, knop) => { HUIDIG.push(x.id); return `<div ${rijAttr(x)}><div class="cel h c-naam" role="cell"><b>${esc(x.org ? x.org.naam : x.naam)}</b><span>${esc(x.org ? x.naam : x.plaats)}${wat ? ' · ' + wat : ''}</span></div><div class="cel c-dat t" role="cell"><b>${x.datum ? datumKort(x.datum) : ''}</b></div><div class="cel act" role="cell">${knop}</div></div>`; };
  const groep = (cls, titel, uitleg, l, fn, max, knop = '') => l.length ? `<section class="blok taakblok ${cls}" aria-label="${esc(titel)}"><div class="tb-kop"><span class="tb-n">${l.length}</span><h2>${titel}</h2><span class="tb-uitleg">${uitleg}</span><div class="rechts">${knop}</div></div><div class="sub-lijst">${l.slice(0, max).map(fn).join('')}${l.length > max ? `<details class="nog"><summary class="blok-voet link">Nog ${l.length - max} tonen</summary>${l.slice(max).map(fn).join('')}</details>` : ''}</div></section>` : '';
  const btn = (a, x, t, p = '') => `<button class="btn sm ${p}" data-a="${a}" data-id="${x.id}" tabindex="-1">${t}</button>`, opn = (x, t) => `<button class="btn sm" data-open="${x.id}" tabindex="-1">${t}</button>`;
  const eerst = V.antwoord.length + lev7.length + vast.length + V.facturen.length, later = mails.length + V.herinner.length + bellen.length, n = eerst + later;
  const kern = `<div class="kern"><div><span>Eerst doen</span><b>${eerst}</b></div><div><span>Als je tijd hebt</span><b>${later}</b></div><div><span>Facturen open</span><b class="${fOpen ? 'let' : ''}">${euro(fOpen)}</b></div></div>`;
  const kop = (t, u) => `<div class="cc-label"><b>${t}</b> ${u}</div>`;
  return `${paginakop('vandaag', { doel: `Goedemorgen Henk. ${hoofdletter(datumLang(VANDAAG))}: dit is wat er vandaag van jou nodig is, belangrijkste eerst.`, extra: kern })}
<div class="inhoud henk-vandaag">
${(() => { const n = DB.alle().filter((x) => x.gevonden === VANDAAG && x.s !== 'weg').length; return n ? `<div class="scanbalk"><span class="live"></span><span><b>${n} nieuwe vergunningen</b> gevonden in de scan van vannacht</span><button class="btn sm" data-v="evenementen" data-gev="vandaag">Bekijk de nieuwe</button></div>` : ''; })()}
${eerst ? kop('Eerst', 'klanten en klussen die op jou wachten') : ''}
${groep('urg', 'Klanten wachten op je antwoord', 'reactie staat in je Outlook', V.antwoord, (x) => rij(x, x.antwoord ? `<q>${esc(x.antwoord)}</q>` : '', btn('outlook', x, `${ICON.antwoord} Antwoorden`, 'p')), 5)}
${groep('', 'Leveringen deze week', 'werkbon voor wie rijdt', lev7, (x) => rij(x, `${x.bokken * REKKEN_BOK} rekken`, btn('werkbon', x, 'Werkbon')), 5)}
${groep('p', 'Vaste klanten: mail klaar', 'vorig jaar geleverd', vast, (x) => rij(x, `vorig jaar ${x.vast.rekken} rekken`, opn(x, `${ICON.mail} Mail bekijken`)), 5)}
${groep('', 'Facturen open', 'geleverd op factuur, nog niet betaald', V.facturen.sort(dv), (x) => rij(x, euro(bedrag(x)), btn('betaald', x, 'Betaald')), 5)}
${later ? kop('Als je tijd hebt', 'nieuwe klanten, op volgorde van kans') : ''}
${groep('p', 'Nieuwe klanten mailen', 'hoogste kans eerst', mails, (x) => rij(x, `kans ${kans(x).score}${x.km > 100 ? ` · ± ${x.km} km` : ''}`, opn(x, `${ICON.mail} Mail bekijken`)), 5, mails.length ? `<button class="btn sm wit" data-a="start-wl">${ICON.mail} Doorwerken (${V.klaar.length})</button>` : '')}
${groep('', 'Herinnering sturen', 'aanbod langer dan een week zonder reactie', V.herinner, (x) => rij(x, 'aanbod ' + sindsTekst(x.verstuurd), btn('herinner', x, `${ICON.herhaal} Herinnering`)), 3)}
${groep('', 'Bellen', 'geen mailadres, of een bouwproject', bellen, (x) => rij(x, x.s === 'bouw' ? 'bouwproject' : 'geen mailadres', opn(x, `${ICON.bel} Bekijken`)), 3)}
${n || lev7.length ? '' : `<section class="blok">${leeg('Niets te doen vandaag.')}</section>`}</div>`;
}
// ---------- AGENDA (Henk): leveringen + voorraad + werkbon ----------
const agendaScherm = () => planningScherm('agenda');
// ---------- CIJFERS (Henk): hoe het gaat; de klanten hebben een eigen scherm ----------
const zonderKop = (h) => h.slice(h.indexOf('<div class="inhoud">'));
function cijfersScherm() {
  return `${paginakop('cijfers', { doel: 'Hoe het gaat en waar het blijft hangen. Cijfers zijn demo-gegevens.', extra: '<div class="kern"><div><span>Bron</span><b style="font-size:13px;padding-top:4px"><span class="bron demo">demo</span></b></div></div>' })}
${zonderKop(resultatenScherm())}`;
}
// ---------- werkbon: één blad voor wie levert (Henk print of geeft door; RekRadar verstuurt niets) ----------
function werkbonHtml(x) {
  const b = x.boeking || {}, route = b.punt && b.punt.lat != null ? `https://www.google.com/maps/dir/?api=1&destination=${b.punt.lat},${b.punt.lng}` : '';
  return `<div class="werkbon"><div class="wb-kop"><div><b>${esc(x.naam)}</b><span>${hoofdletter(datumLang(x.datum))} · ${esc(x.plaats)}</span></div><b class="wb-n">${x.bokken * REKKEN_BOK} rekken</b></div>
<dl class="eig"><dt>Klant</dt><dd>${esc(x.org ? x.org.naam : '')}</dd><dt>Lossen</dt><dd>${esc(b.los || 'nog doorgeven')}${route ? ` · <a href="${route}" target="_blank" rel="noopener">route ↗</a>` : ''}</dd>
${b.bouw && b.bouw.belMe ? '<dt>Bouwen</dt><dd>Nog afspreken: klant wil even bellen</dd>' : ''}${b.bouw && b.bouw.lijnen && b.bouw.lijnen.length ? `<dt>Bouwen</dt><dd>${b.bouw.lijnen.length} ${b.bouw.lijnen.length === 1 ? 'rij' : 'rijen'}${b.bouw.meter ? `, samen ± ${b.bouw.meter} m` : ''}<div class="bouwkaart">${bouwSvg(b)}</div></dd>` : ''}
<dt>Contact op de dag</dt><dd>${belbaar(esc(b.contact || 'nog doorgeven'))}</dd><dt>Afstand</dt><dd>${kmTekst(x)} vanaf Almkerk</dd><dt>Betaling</dt><dd>${betTekst(x)}</dd></dl>${schetsenHtml(x)}
<div class="wb-voet noprint"><button class="btn p" onclick="print()">Printen</button><span class="mu klein">Geef dit blad aan wie levert. RekRadar verstuurt niets.</span></div></div>`;
}
const SCHERMEN = { vandaag: vandaagScherm, agenda: agendaScherm, cijfers: cijfersScherm, overzicht: overzichtScherm, werklijst: werklijstScherm, evenementen: evenementenScherm, bouw: bouwScherm, klanten: klantenScherm, planning: planningScherm, markt: marktScherm, resultaten: resultatenScherm, werkwijze: werkwijzeScherm, instellingen: instellingenScherm };
function teken() {
  const pb = $('#paneel .p-body'), pScroll = pb && Number(pb.dataset.id) === DETAIL ? pb.scrollTop : 0;
  HUIDIG = [];
  frameTekenen();
  $('#main').innerHTML = (SCHERMEN[VIEW] || overzichtScherm)();
  $('#pslot').innerHTML = paneelHtml();
  const heeft = !!$('#paneel'), naast = heeft && NAAST.includes(VIEW);
  $('#werk').classList.toggle('naast', naast); $('#werk').classList.toggle('drawer', heeft && !naast); $('#werk').classList.toggle('groot', heeft);
  const nb = $('#paneel .p-body'); if (nb) { nb.dataset.id = DETAIL; nb.scrollTop = pScroll; }
  document.querySelectorAll('.tabs').forEach((bar) => { const on = bar.querySelector('.on'); if (on && (on.offsetLeft < bar.scrollLeft || on.offsetLeft + on.offsetWidth > bar.scrollLeft + bar.clientWidth)) bar.scrollLeft = on.offsetLeft - (bar.clientWidth - on.offsetWidth) / 2; });
  const sel = $('#main .r.sel'); if (sel) sel.scrollIntoView({ block: 'nearest' });
  naPaneel(); markeerScroll();
}
// Balken die horizontaal scrollen krijgen rechts een vervaging, zolang er nog iets achter de rand zit.
function markeerScroll() { document.querySelectorAll('.tabs, .inst-nav, .statusset, .scrollx, .bord').forEach((e) => e.classList.toggle('loopt', e.scrollWidth - e.scrollLeft - e.clientWidth > 2)); }
addEventListener('resize', markeerScroll);
document.addEventListener('scroll', (e) => { if (e.target.classList && e.target.matches('.tabs, .inst-nav, .statusset, .scrollx, .bord')) markeerScroll(); }, true);
function ga(v, id, behoud) {
  if (HENKNAAR[v]) v = HENKNAAR[v];
  const nieuw = v === 'detail' && DETAIL == null;
  if (v === 'detail') DETAIL = id;
  else { if (!behoud) { STATUS = []; SOORT = []; ZOEK = ''; GEVONDEN = ''; } VIEW = v; DETAIL = null; }
  hashZetten(nieuw); teken();
  if (v === 'detail') { const p = $('#paneel'); if (p) p.focus({ preventScroll: true }); } else { $('#main').scrollTop = 0; window.scrollTo(0, 0); }
}
function sluit() { const id = DETAIL, terugStap = !!(history.state && history.state.detail); DETAIL = null; if (terugStap) { NEGEER_HASH = true; history.back(); } else hashZetten(); teken(); const r = id != null && $(`#main .r[data-open="${id}"]`); if (r) r.focus({ preventScroll: true }); }

// ---------- globaal zoeken ----------
let zoekSel = -1;
function zoekResultaten(q) {
  const box = $('#zoekres'); if (!q.trim()) { box.classList.remove('on'); return; }
  const m = (x) => (x.naam + ' ' + x.plaats + ' ' + x.gem + ' ' + (x.org ? x.org.naam : '') + ' ' + (x.aanvrager || '')).toLowerCase().includes(q.toLowerCase());
  const l = DB.alle().filter((x) => x.s !== 'weg' && m(x));
  const groepen = [['Klanten', l.filter((x) => KLANT.includes(x.s))], ['Evenementen', l.filter((x) => !KLANT.includes(x.s) && x.s !== 'bouw')], ['Bouw en verbouw', l.filter((x) => x.s === 'bouw')]];
  zoekSel = -1;
  box.innerHTML = groepen.filter(([, g]) => g.length).map(([t, g]) => `<div class="zg">${t}</div>${g.slice(0, 5).map((x) => `<button data-open="${x.id}" data-gz>${esc(KLANT.includes(x.s) ? x.org.naam : x.naam)}<span>${esc(KLANT.includes(x.s) ? x.naam : x.plaats)} · ${x.s === 'bouw' ? 'bouw' : datumKort(x.datum)}</span></button>`).join('')}`).join('') || '<div class="niets">Niets gevonden.</div>';
  box.classList.add('on');
}

// ---------- acties ----------
let tTimer;
function toast(t, undo) { $('#ttekst').textContent = t; $('#tundo').style.display = undo ? '' : 'none'; $('#toast').classList.add('on'); clearTimeout(tTimer); tTimer = setTimeout(() => $('#toast').classList.remove('on'), 4200); }
function zet(id, s, extra) { DB.wijzig(id, Object.assign({ s }, extra || {})); teken(); }
function naarVolgende(id, melding) {
  const pos = STAPEL.indexOf(id);
  const volg = pos >= 0 ? STAPEL.slice(pos + 1).find((v) => { const y = DB.vind(v); return y && ['klaar', 'verwacht', 'zoekt', 'zonder', 'bouw'].includes(y.s) && actief(y) && !y.gebeld; }) : null;
  if (DETAIL != null && volg) { ga('detail', volg); toast(`${melding} · volgende geopend`, true); }
  else if (DETAIL != null && pos >= 0) { DETAIL = null; hashZetten(); teken(); toast(`${melding} · lijst is af`, true); }
  else toast(melding, true);
}
function open(t, h, breed) { $('#vtitel').textContent = t; $('#vbody').innerHTML = h; $('.venster').classList.toggle('breed', !!breed); $('#scherm').classList.add('open'); $('#scherm').scrollTop = 0; pin = null; if (breed) $('#vdicht').focus(); else { const f = $('#vbody input, #vbody select'); if (f && innerWidth >= 768) f.focus(); } }
function dicht() { $('#scherm').classList.remove('open'); $('.venster').classList.remove('breed'); kaartenWeg(); }
const dialoogOpen = () => $('#scherm').classList.contains('open');
const meerDicht = () => $('#meerblad').classList.remove('open');

document.addEventListener('click', (e) => {
  document.querySelectorAll('details.kolfilter[open]').forEach((d) => { if (!d.contains(e.target)) d.open = false; });
  if (!e.target.closest('.globaal') && !e.target.closest('[data-zoekm]')) { $('#zoekres') && $('#zoekres').classList.remove('on'); $('#globaal') && $('#globaal').classList.remove('mopen'); }
  const kaartje = e.target.closest('#kaartje');
  if (kaartje) { const r = kaartje.getBoundingClientRect(); if (!pin || !kaartje.contains(pin)) { pin = document.createElement('div'); pin.className = 'pin'; kaartje.appendChild(pin); } pin.style.left = (e.clientX - r.left) + 'px'; pin.style.top = (e.clientY - r.top) + 'px'; losPunt = { schets: true, x: +((e.clientX - r.left) / r.width * 100).toFixed(1), y: +((e.clientY - r.top) / r.height * 100).toFixed(1) }; $('#loscoord').textContent = 'Losplek gekozen op de schets.'; $('#ffout').textContent = ''; return; }
  const bs = e.target.closest('#bschets'); if (bs) { if (!bouwKlaar) { const r = bs.getBoundingClientRect(); voegPunt([+((e.clientX - r.left) / r.width * 100).toFixed(1), +((e.clientY - r.top) / r.height * 100).toFixed(1)]); } return; }
  const ak = e.target.closest('[data-antw]'); if (ak) { const box = ak.closest('.antw'), x = DB.vind(Number(box.dataset.id)), v = antwoordVoorstellen(x)[Number(ak.dataset.antw)]; $('#antwtekst').value = v.tekst; $('#antwfout').textContent = ''; box.querySelectorAll('[data-antw]').forEach((b) => b.setAttribute('aria-pressed', b === ak)); return; }
  const tk = e.target.closest('[data-teken]'); if (tk) { tekenActie(tk.dataset.teken); return; }
  const pd = e.target.closest('[data-pdok]'); if (pd) { const d = pd.dataset.doel; $(d === 'bouw' ? '#badreslijst' : '#adreslijst').innerHTML = ''; kiesAdres(pd.dataset.pdok, pd.textContent, d); return; }
  const co = e.target.closest('[data-coord]'); if (co) { const [la, ln] = co.dataset.coord.split(',').map(Number); kiesPlek(co.dataset.doel, la, ln, 'Plek uit Google Maps-link'); return; }
  const lg = e.target.closest('[data-laag]'); if (lg) { const vak = lg.closest('.kaartvak'), k = K[vak.dataset.k]; if (k) Object.entries(k.lagen).forEach(([n, l]) => { if (n === lg.dataset.laag) l.addTo(k.map); else k.map.removeLayer(l); }); vak.querySelectorAll('[data-laag]').forEach((b) => b.setAttribute('aria-pressed', b === lg)); return; }
  if (e.target.id === 'meerblad') { meerDicht(); return; }
  if (e.target.closest('[data-meer]')) { $('#meerblad').classList.toggle('open'); return; }
  if (e.target.closest('[data-zoekm]')) { const g = $('#globaal'); g.classList.toggle('mopen'); if (g.classList.contains('mopen')) $('#gzoek').focus(); return; }
  if (e.target.closest('[data-wis]')) { PROV = []; GEM = ''; teken(); return; }
  if (e.target.closest('[data-sluit]')) { sluit(); return; }
  const sec = e.target.closest('[data-sec]'); if (sec) { e.preventDefault(); document.querySelectorAll('.inst-nav a').forEach((a) => a.classList.toggle('on', a === sec)); const d = document.getElementById(sec.dataset.sec); if (d) d.scrollIntoView({ block: 'start', behavior: 'smooth' }); return; }
  const kw = e.target.closest('[data-kw]'); if (kw) { KWEERGAVE = kw.dataset.kw; teken(); return; }
  const so = e.target.closest('[data-sort]'); if (so) { if (SORT === so.dataset.sort) SORTOM = !SORTOM; else { SORT = so.dataset.sort; SORTOM = false; } teken(); return; }
  const ak_ = e.target.closest('[data-afstk]'); if (ak_) { AFST = Number(ak_.dataset.afstk); tekenOpen(ak_); return; }
  const pk_ = e.target.closest('[data-provk]'); if (pk_) { PROV = wissel(PROV, pk_.dataset.provk); GEM = ''; tekenOpen(pk_); return; }
  const sr = e.target.closest('[data-soort]'); if (sr) { SOORT = wissel(SOORT, sr.dataset.soort); tekenOpen(sr); return; }
  const kt = e.target.closest('[data-ktab]'); if (kt) { KTAB = kt.dataset.ktab; teken(); return; }
  const ht = e.target.closest('[data-htab]'); if (ht) { HTAB = ht.dataset.htab; teken(); return; }
  const pk = e.target.closest('[data-pak]'); if (pk) { DB.vind(Number(pk.dataset.id)).bokken = Number(pk.dataset.pak); teken(); return; }
  const tr = e.target.closest('[data-trans]'); if (tr) { DB.vind(Number(tr.dataset.id)).transport = 0; teken(); return; }
  const a = e.target.closest('[data-a]');
  if (a) {
    const id = Number(a.dataset.id), x = DB.vind(id), act = a.dataset.a;
    if (act === 'start') { STAPEL = HUIDIG.slice(); ga('detail', id); }
    else if (act === 'start-wl') { if (HENK) { STAPEL = voorraad().klaar.map((y) => y.id); if (STAPEL.length) ga('detail', STAPEL[0]); } else { HTAB = 'klaar'; ga('werklijst'); STAPEL = HUIDIG.slice(); if (STAPEL.length) ga('detail', STAPEL[0]); } }
    else if (act === 'werkbon') { open(`Werkbon · ${x.naam}`, werkbonHtml(x)); }
    else if (act === 'stuur') { if (!magMailen(x)) { toast('Niet versturen: afgemeld of adres op naam'); return; } zet(id, 'verstuurd', { verstuurd: VANDAAG, mail: { bokken: x.bokken, datum: x.datum, transport: transportVan(x) } }); naarVolgende(id, `Verstuurd naar ${x.org.email}`); }
    else if (act === 'telgeboekt') {
      const b = Math.min(x.bokken, vrijOp(x.datum, id)); if (!b) { toast('Geen rekken vrij rond die dag'); return; }
      zet(id, 'geboekt', { bokken: b, verstuurd: x.verstuurd || VANDAAG, boeking: { los: 'Nog doorgeven: telefonisch geboekt', contact: 'Nog doorgeven', prijs: prijsVan(x, b), transport: transportVan(x), betaling: 'factuur', telefonisch: true } });
      toast(`Geboekt: ${b * REKKEN_BOK} rekken, op factuur. Losplek en contact nog doorgeven.`, true);
    }
    else if (act === 'betaald') { zet(id, x.s, { boeking: Object.assign({}, x.boeking, { betaald: VANDAAG }) }); toast('Factuur op betaald gezet', true); }
    else if (act === 'afmeld') { AFMELD.add(x.org.email.toLowerCase()); teken(); toast(`${x.org.email} afgemeld: krijgt nooit meer een aanbod (zo werkt de afmeldlink)`); }
    else if (act === 'geregeld') { zet(id, 'weg'); naarVolgende(id, 'Gemarkeerd als al geregeld'); }
    else if (act === 'weg') { zet(id, 'weg'); naarVolgende(id, 'Niet relevant, weggezet'); }
    else if (act === 'later') { zet(id, x.s, { later: addDag(VANDAAG, 14) }); naarVolgende(id, `Komt terug op ${datumKort(addDag(VANDAAG, 14))}`); }
    else if (act === 'gebeld') { zet(id, x.s, { gebeld: VANDAAG }); toast('Gebeld: genoteerd', true); }
    else if (act === 'terughalen') { zet(id, x.s, { later: null }); toast('Terug in de lijst', true); }
    else if (act === 'bel') toast(x.org.formulier ? `Formulier: ${x.org.formulier}` : 'Geen telefoonnummer gevonden');
    else if (act === 'herinner') { if (afgemeld(x.org)) { toast('Afgemeld: geen herinnering'); return; } open(`Herinnering aan ${x.org.naam}`, herinneringHtml(x), true); }
    else if (act === 'herinner-stuur') {
      const t = $('#hertekst').value.trim(); if (!t) { $('#herfout').textContent = 'De mail is leeg.'; $('#hertekst').focus(); return; }
      dicht(); zet(id, 'verstuurd', { herinnerd: VANDAAG, herinnerMail: t }); toast(`Herinnering verstuurd naar ${x.org.email} (demo)`, true);
    }
    else if (act === 'outlook') { if (x.org && x.org.email) open(`Antwoord aan ${x.org.naam}`, antwoordHtml(x), true); else toast('Opent de mail in Outlook (demo)'); }
    else if (act === 'antw-outlook') {
      const t = $('#antwtekst').value, open_ = [...new Set(t.match(/\[[^\]]+\]/g) || [])];
      if (open_.length) { $('#antwfout').textContent = `Vul nog in: ${open_.join(', ')}`; $('#antwtekst').focus(); return; }
      dicht(); zet(id, 'verstuurd', { verstuurd: VANDAAG, beantwoord: VANDAAG, antwoordMail: t }); toast(`Antwoord aan ${x.org.naam} staat klaar in Outlook. Jij verstuurt het.`, true);
    }
    else if (act === 'probeer') { losPunt = null; losAdres = ''; bouwAdres = ''; bouwLijnen = [[]]; bouwKlaar = false; bouwSchets = false; pin = null; open('Voorbeeld · wat de klant ziet na “Bekijk en boek”', formInteractief(x), true); startKaarten(x); }
    else if (act === 'opslaan') { toast('Opgeslagen (demo)'); $('#opknop').disabled = true; $('#opstatus').textContent = 'Opgeslagen'; }
    else if (act === 'betaal') {
      const vorig = $('#fvorig') && $('#fvorig').checked ? vorigeBoeking(x) : null, belMe = $('#fbelme').checked;
      if (!losPunt && !vorig) { $('#ffout').textContent = 'Kies eerst de losplek: zoek het adres of tik op de kaart.'; return; }
      if (!echteLijnen().length && !belMe) { $('#ffout').textContent = 'Teken bij stap 3 waar de rekken moeten komen, of vink aan dat Henk je belt.'; return; }
      if (!$('#fnaam').value.trim() || !$('#ftel').value.trim()) { $('#ffout').textContent = 'Vul naam en telefoon in.'; return; }
      const bw = (document.querySelector('input[name="bw"]:checked') || {}).value || 'ideal';
      if (bw === 'factuur' && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test($('#fmail').value.trim())) { $('#ffout').textContent = 'Vul het mailadres voor de factuur in.'; return; }
      if (!$('#fok').checked) { $('#ffout').textContent = 'Vink de annuleringsregel aan.'; return; }
      const b = Number($('#fbok').value), dt = $('#fdat').value || x.datum;
      if (!b || b > vrijOp(dt, id)) { $('#ffout').textContent = `Rond ${datumLang(dt)} zijn niet genoeg rekken vrij. Kies een ander aantal of een andere datum.`; return; }
      zet(id, 'geboekt', { bokken: b, datum: dt, verwachteDatum: false, verstuurd: x.verstuurd || VANDAAG, boeking: { los: vorig && !losPunt ? [vorig.los + ' (zoals vorig jaar)', $('#fuit').value].filter(Boolean).join(' · ') : [losAdres, $('#fuit').value].filter(Boolean).join(' · ') || 'Pin op de kaart', punt: losPunt || (vorig && vorig.punt) || null, bouw: { lijnen: echteLijnen(), schets: bouwSchets, meter: bouwSchets ? 0 : Math.round(echteLijnen().reduce((s, l) => s + lijnMeter(l), 0)), adres: bouwAdres, belMe: belMe && !echteLijnen().length }, contact: $('#fnaam').value + ', ' + $('#ftel').value, prijs: prijsVan(x, b), transport: transportVan(x), betaling: bw, factuurMail: bw === 'factuur' ? $('#fmail').value.trim() : '', inkoop: bw === 'factuur' ? $('#finkoop').value.trim() : '' } });
      $('#vbody').innerHTML = `<div class="fb" style="text-align:center;padding:40px 20px"><span class="klantkop">${bw === 'factuur' ? 'Geboekt, factuur volgt' : 'Betaald en geregeld'}</span><span class="mu" style="font-size:13px">De klant krijgt een bevestiging. Henk krijgt een melding; de klus staat bij Klanten en in Planning.</span><button class="btn p" data-v="klanten" data-kt="geboekt">Naar Klanten</button></div>`;
    }
    return;
  }
  const op = e.target.closest('[data-open]'); if (op) { const id = Number(op.dataset.open); if (op.hasAttribute('data-gz')) { $('#zoekres').classList.remove('on'); $('#globaal').classList.remove('mopen'); $('#gzoek').value = ''; $('#gzoek').blur(); } const groep = op.closest('.sub-lijst, .agenda, .kolom-lijst'); if (groep) STAPEL = [...groep.querySelectorAll('.r[data-open]')].map((r) => Number(r.dataset.open)); else if (HUIDIG.includes(id)) STAPEL = HUIDIG.slice(); dicht(); meerDicht(); ga('detail', id); return; }
  const gv = e.target.closest('[data-gev]'); if (gv && !gv.dataset.v) { GEVONDEN = gv.dataset.gev; teken(); return; }
  const v = e.target.closest('[data-v]'); if (v && v.dataset.gev) { dicht(); meerDicht(); STATUS = []; SOORT = []; ZOEK = ''; GEVONDEN = v.dataset.gev; ga(v.dataset.v, null, true); return; }
  if (v) { e.preventDefault(); dicht(); meerDicht(); if (v.dataset.kt) { KTAB = v.dataset.kt; if (v.dataset.v === 'klanten' && innerWidth >= 768 && KWEERGAVE === 'bord' && v.dataset.kt === 'verstuurd') KWEERGAVE = 'lijst'; } if (v.dataset.ht) HTAB = v.dataset.ht; ga(v.dataset.v); return; }
  const st = e.target.closest('[data-st]'); if (st) { STATUS = wissel(STATUS, st.dataset.st === 'alle' ? '' : st.dataset.st); DETAIL = null; VIEW = 'evenementen'; hashZetten(); tekenOpen(st); return; }
});
document.addEventListener('change', (e) => {
  if (e.target.dataset && e.target.dataset.verloren && e.target.value) { const id = Number(e.target.dataset.verloren), r = e.target.value; zet(id, 'verloren', { reden: r }); toast(`Verloren: ${r.toLowerCase()}`, true); }
  if (e.target.id === 'fdat' && e.target.value) { const f = $('#fbok'), x = DB.vind(Number($('#fknop').dataset.id)); f.innerHTML = aantalOpties(x, e.target.value, Number(f.value) || x.bokken); f.dispatchEvent(new Event('change', { bubbles: true })); }
  if (e.target.id === 'pzelf') { const x = DB.vind(Number(e.target.dataset.id)), max = Number(e.target.max), n = Math.min(max, Math.max(1, parseInt(e.target.value, 10) || 0)); if (!e.target.value) return; e.target.value = n; x.bokken = n / REKKEN_BOK; prijsLive(x); }
  if (e.target.id === 'fbok') { const n = Number(e.target.value), f = (document.querySelector('input[name="bw"]:checked') || {}).value === 'factuur'; const x = DB.vind(Number($('#fknop').dataset.id)), p = prijsVan(x, n); $('#ftot').textContent = euro(p); if ($('#frek')) $('#frek').textContent = euro(rekPrijs(n)); $('#fbtw').textContent = `excl. btw · ${metBtw(p)} inclusief 21% btw`; $('#fsamaantal').textContent = Math.round(n * REKKEN_BOK) + ' fietsenrekken'; $('#fknop').textContent = f ? 'Boeken, factuur volgt' : `Betalen met iDEAL · ${metBtw(p)}`; }
  if (e.target.name === 'bw') { const f = e.target.value === 'factuur'; $('#ffact').hidden = !f; $('#fknop').textContent = f ? 'Boeken, factuur volgt' : `Betalen met iDEAL · ${metBtw(prijsVan(DB.vind(Number($('#fknop').dataset.id)), Number($('#fbok').value)))}`; $('#fregel').textContent = f ? 'Annuleer je na het boeken, dan betaal je het bedrag toch. Ik ga akkoord.' : 'Annuleer je na betaling, dan krijg je het bedrag niet terug. Ik ga akkoord.'; }
  if (e.target.id === 'prov') { PROV = e.target.value ? e.target.value.split('|') : []; GEM = ''; teken(); }
  if (e.target.id === 'gem') { GEM = e.target.value; teken(); }
  if (e.target.id === 'afst') { AFST = Number(e.target.value); teken(); }
  if (e.target.id === 'sort') { SORT = e.target.value; SORTOM = false; teken(); }
  if (e.target.id === 'soortsel') { SOORT = e.target.value ? e.target.value.split('|') : []; teken(); }
  if (e.target.id === 'gevdat') { GEVONDEN = e.target.value || ''; teken(); }
  if (e.target.closest && e.target.closest('.inst')) wijzigingInst();
});
function wijzigingInst() { const k = $('#opknop'); if (k) { k.disabled = false; $('#opstatus').textContent = 'Niet opgeslagen wijzigingen'; } }
document.addEventListener('input', (e) => {
  if (e.target.id === 'zoek') { ZOEK = e.target.value; const p = e.target.selectionStart; teken(); const z = $('#zoek'); if (z) { z.focus(); z.setSelectionRange(p, p); } }
  else if (e.target.id === 'gzoek') zoekResultaten(e.target.value);
  else if (e.target.id === 'pzelf') { const x = DB.vind(Number(e.target.dataset.id)), n = parseInt(e.target.value, 10); if (n > 0) { x.bokken = n / REKKEN_BOK; prijsLive(x); } }
  else if (e.target.id === 'ptrans') { const x = DB.vind(Number(e.target.dataset.id)); x.transport = Math.max(0, Number(e.target.value) || 0); prijsLive(x); }
  else if (e.target.id === 'fadres' || e.target.id === 'fbadres') { clearTimeout(zoekTimer); const q = e.target.value, d = e.target.id === 'fbadres' ? 'bouw' : 'los'; zoekTimer = setTimeout(() => zoekAdres(q, d), 250); }
  else if (e.target.closest && e.target.closest('.inst')) wijzigingInst();
});
document.addEventListener('mouseover', (e) => { const m = e.target.closest && e.target.closest('[data-tip]'); document.querySelectorAll('.grafiek .tip.on').forEach((t) => { if (!m || !m.closest('.grafiek').contains(t)) t.classList.remove('on'); }); if (!m) return;
  const g = m.closest('.grafiek'), tip = g.querySelector('.tip'), gr = g.getBoundingClientRect(), r = m.getBoundingClientRect();
  tip.textContent = m.dataset.tip; tip.style.left = (r.left - gr.left + r.width / 2) + 'px'; tip.style.top = (r.top - gr.top + 14) + 'px'; tip.classList.add('on'); });
document.addEventListener('keydown', (e) => {
  const typt = e.target.matches && e.target.matches('input, textarea, select');
  if (e.target.id === 'gzoek') {
    const k = [...document.querySelectorAll('#zoekres [data-open]')];
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); zoekSel = Math.max(0, Math.min(k.length - 1, zoekSel + (e.key === 'ArrowDown' ? 1 : -1))); k.forEach((b, i) => b.classList.toggle('act', i === zoekSel)); return; }
    if (e.key === 'Enter' && k.length) { e.preventDefault(); (k[zoekSel] || k[0]).click(); return; }
    if (e.key === 'Escape') { e.target.value = ''; $('#zoekres').classList.remove('on'); e.target.blur(); return; }
  }
  if (e.key === 'Escape') { if (dialoogOpen()) { dicht(); return; } if ($('#meerblad').classList.contains('open')) { meerDicht(); return; } if (typt) { e.target.blur(); return; } if (DETAIL != null) { sluit(); return; } }
  if (typt || e.metaKey || e.ctrlKey || e.altKey || dialoogOpen()) return;
  const rij = e.target.closest && e.target.closest('.r[data-open]');
  if (rij && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); const id = Number(rij.dataset.open); if (HUIDIG.includes(id)) STAPEL = HUIDIG.slice(); ga('detail', id); return; }
  if (e.key === '/') { const g = $('#gzoek'); if (g) { e.preventDefault(); if (!g.offsetParent) $('#globaal').classList.add('mopen'); g.focus(); } return; }
  const neer = e.key === 'j' || e.key === 'ArrowDown', op = e.key === 'k' || e.key === 'ArrowUp';
  if (!neer && !op) return;
  if (DETAIL != null) {
    const l = STAPEL.includes(DETAIL) ? STAPEL : HUIDIG, i = l.indexOf(DETAIL), n = l[i + (neer ? 1 : -1)];
    if ((e.key === 'j' || e.key === 'k' || !e.target.closest('.p-body')) && n != null) { e.preventDefault(); ga('detail', n); }
    return;
  }
  const rijen = [...document.querySelectorAll('#main .r[data-open]')]; if (!rijen.length) return;
  if (!rij && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) return;
  e.preventDefault();
  const i = rijen.indexOf(rij), doel = rijen[i < 0 ? 0 : Math.max(0, Math.min(rijen.length - 1, i + (neer ? 1 : -1)))];
  doel.focus(); doel.scrollIntoView({ block: 'nearest' });
});
$('#vdicht').onclick = dicht;
$('#scherm').addEventListener('click', (e) => { if (e.target.id === 'scherm') dicht(); });
$('#tundo').onclick = () => { const v = DB.herstel(); if (!v) return; $('#toast').classList.remove('on'); VIEW = v.view; DETAIL = v.detail; hashZetten(); teken(); };
const ALIAS = HENK ? HENKNAAR : { vandaag: 'overzicht', cijfers: 'markt' };
function vanHash() { let h = (location.hash || '').slice(1); h = ALIAS[h] || h; const m = h.match(/^evenement-(\d+)$/); if (m && DB.vind(Number(m[1]))) DETAIL = Number(m[1]); else if (SCHERMEN[h]) { VIEW = h; DETAIL = null; } }
addEventListener('hashchange', () => {
  if (NEGEER_HASH) { NEGEER_HASH = false; return; }
  // Browser-terug vanuit een geopend evenement: terug naar dezelfde lijst, filters en zoekterm blijven staan.
  const h = (location.hash || '').slice(1);
  if (DETAIL != null && (ALIAS[h] || h) === VIEW) { const id = DETAIL; DETAIL = null; teken(); const r = $(`#main .r[data-open="${id}"]`); if (r) r.focus({ preventScroll: true }); return; }
  STATUS = []; ZOEK = ''; vanHash(); teken(); });
vanHash(); teken();
</script>
</body>
</html>
