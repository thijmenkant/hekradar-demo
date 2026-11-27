import { chromium } from 'playwright';
// Opmaaktest: zoekt op elk scherm en elke breedte naar tekst over tekst, uitstekende of weggevallen kolommen,
// horizontale scroll en JS-fouten. Afkapping met … is bedoeld en telt niet.
const url = process.env.URL || new URL('../index.html', import.meta.url).href;
let fout = 0, getest = 0;
const b = await chromium.launch();
const views = ['overzicht','werklijst','evenementen','bouw','klanten','planning','markt','resultaten','werkwijze','instellingen'];
const detect = () => {
  const out = [], vis = (e) => { const s = getComputedStyle(e); return s.visibility !== 'hidden' && s.display !== 'none' && s.opacity !== '0'; };
  const leaf = [...document.querySelectorAll('body *')].filter((e) => vis(e) && [...e.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim()) && e.getClientRects().length);
  const clipOf = (e) => { let c = { left: -1e9, right: 1e9, top: -1e9, bottom: 1e9 }, p = e; while (p) { const s = getComputedStyle(p); if (/(hidden|auto|scroll|clip)/.test(s.overflowX + s.overflowY)) { const r = p.getBoundingClientRect(); c = { left: Math.max(c.left, r.left), right: Math.min(c.right, r.right), top: Math.max(c.top, r.top), bottom: Math.min(c.bottom, r.bottom) }; } p = p.parentElement; } return c; };
  const rng = (e) => { const r = document.createRange(); r.selectNodeContents(e); const c = clipOf(e); return [...r.getClientRects()].map((q) => ({ left: Math.max(q.left, c.left), right: Math.min(q.right, c.right), top: Math.max(q.top, c.top), bottom: Math.min(q.bottom, c.bottom) })).filter((q) => q.right - q.left > 2 && q.bottom - q.top > 2 && q.bottom > 0 && q.top < innerHeight); };
  const zichtbaarBeide = (a, c, p, q) => { const x = (Math.max(p.left, q.left) + Math.min(p.right, q.right)) / 2, y = (Math.max(p.top, q.top) + Math.min(p.bottom, q.bottom)) / 2; const top = document.elementFromPoint(x, y); if (!top) return false; const eig = a.contains(top) || top.contains(a) ? a : c.contains(top) || top.contains(c) ? c : null; if (!eig) return false; const ander = eig === a ? c : a; for (let n = top; n && !n.contains(ander); n = n.parentElement) { const bg = getComputedStyle(n).backgroundColor; if (bg && bg !== 'rgba(0, 0, 0, 0)' && bg !== 'transparent') return false; } return true; };
  const nm = (e) => e.tagName.toLowerCase() + (e.id ? '#' + e.id : '') + (e.className && typeof e.className === 'string' ? '.' + e.className.trim().split(/\s+/).join('.') : '') + ' "' + e.textContent.trim().slice(0, 30) + '"';
  // 1) overlappende tekst
  const R = leaf.map((e) => [e, rng(e)]).filter(([, r]) => r.length);
  for (let i = 0; i < R.length; i++) for (let j = i + 1; j < R.length; j++) {
    const [a, ra] = R[i], [c, rc] = R[j]; if (a.contains(c) || c.contains(a)) continue;
    if (ra.some((p) => rc.some((q) => Math.min(p.right, q.right) - Math.max(p.left, q.left) > 3 && Math.min(p.bottom, q.bottom) - Math.max(p.top, q.top) > 3 && zichtbaarBeide(a, c, p, q)))) {
      // alleen als beide echt zichtbaar zijn (niet achter een ander vlak)
      out.push('OVERLAP ' + nm(a) + ' <> ' + nm(c));
    }
  }
  // 2) tekst buiten zijn clip-container of buiten beeld
  for (const [e, rs] of R) {
    let p = e.parentElement, clip = null;
    while (p) { const s = getComputedStyle(p); if (/(hidden|auto|scroll|clip)/.test(s.overflowX + s.overflowY)) { clip = p; break; } p = p.parentElement; }
    const cr = clip ? clip.getBoundingClientRect() : { left: 0, right: innerWidth, top: -1e9, bottom: 1e9 };
    const st = clip ? getComputedStyle(clip) : null;
    for (const q of rs) {
      if (q.right > innerWidth + 1 || q.left < -1) { out.push('BUITENBEELD ' + nm(e)); break; }
      if (clip && st.overflowX !== 'auto' && st.overflowX !== 'scroll' && (q.right > cr.right + 1 || q.left < cr.left - 1) && q.bottom > cr.top && q.top < cr.bottom) { out.push('AFGEKNIPT ' + nm(e) + ' in ' + nm(clip).slice(0, 60)); break; }
    }
  }
  // 3) knoppen/kopjes die hun vak verlaten
  for (const e of document.querySelectorAll('button, .btn, h1, h2, h3, td, th, .cel')) { if (!vis(e) || !e.getClientRects().length) continue; if (e.scrollWidth > e.clientWidth + 2 && getComputedStyle(e).overflow === 'visible' && e.clientWidth > 0) out.push('UITSTEEK ' + nm(e) + ` ${e.scrollWidth}>${e.clientWidth}`); }
  // 4) ellipsis
  for (const e of document.querySelectorAll('*')) { const s = getComputedStyle(e); if (s.textOverflow === 'ellipsis' && e.scrollWidth > e.clientWidth + 1 && vis(e) && e.getClientRects().length) out.push('ELLIPS ' + nm(e)); }
  for (const [e] of R) { const r = e.getBoundingClientRect(); if (r.width < 28 && e.textContent.trim().length > 4 && getComputedStyle(e).whiteSpace !== 'nowrap' ) out.push('SMAL ' + nm(e) + ' ' + Math.round(r.width) + 'px'); }
  for (const e of document.querySelectorAll('.cel, td, th, .th > div')) { const r = e.getBoundingClientRect(); if (vis(e) && e.getClientRects().length && r.width < 20 && e.textContent.trim()) out.push('KOLOM-WEG ' + nm(e) + ' ' + Math.round(r.width) + 'px'); }
  if (document.documentElement.scrollWidth > innerWidth) out.push('HSCROLL ' + (document.documentElement.scrollWidth - innerWidth));
  return [...new Set(out)];
};
const W = (process.env.W || '1440,1280,1024,900,768,390').split(',').map(Number);
for (const w of W) {
  const p = await b.newPage({ viewport: { width: w, height: 900 } });
  await p.route(/unpkg\.com|pdok\.nl/, (r) => r.abort());
  const errs = []; p.on('pageerror', (e) => errs.push(e.message)); p.on('console', (m) => m.type() === 'error' && !/ERR_FAILED|net::/.test(m.text()) && errs.push(m.text()));
  const rap = async (naam) => { getest++; const r = (await p.evaluate(detect)).filter((x) => !x.startsWith('ELLIPS')); if (r.length) { fout++; console.log(`FAAL: [${w}] ${naam}\n  ` + r.slice(0, 20).join('\n  ')); } };
  for (const v of views) {
    await p.goto(url + '#' + v); await p.reload(); await p.waitForTimeout(150); await rap(v);
    const rij = await p.$('#main [data-open]');
    if (rij && v !== 'werkwijze') { await rij.click().catch(() => {}); await p.waitForTimeout(150); await rap(v + '+paneel'); await p.keyboard.press('Escape'); }
  }
  // klantpagina / boekformulier
  await p.goto(url + '#werklijst'); await p.reload(); await p.waitForTimeout(100);
  await p.click('#main .t-wl .r').catch(() => {}); await p.waitForTimeout(100);
  await p.click('#paneel [data-a="probeer"]').catch(() => {}); await p.waitForTimeout(400); await rap('boekformulier');
  if (errs.length) { fout++; console.log(`FAAL: [${w}] JS-fouten:`, errs); }
  await p.close();
}
await b.close();
console.log(`opmaak: ${getest - fout} van ${getest} schermen zonder glitch`); if (fout) process.exit(1);
