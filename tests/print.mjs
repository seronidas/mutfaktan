// Yazdırma testi: Emulation.setEmulatedMedia('print') ile. Arka plan basılmayabileceği için açık renk metin ve sabit öğe olmamalı.
// Çalıştır: node --test tests/print.mjs
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { serve, open, shutdown } from './lib/cdp.mjs';

let srv;
before(async () => { srv = await serve(); });
after(async () => { await shutdown(); srv?.stop(); });

const A = { email: 'aday@example.com', role: 'applicant' };
const APP = { fullname: 'Deneme Aday', refNo: 'MY-2026-12345', status: 'preeval-open', birthdate: '1999-05-14', biztype: 'sirket', bizname: 'Deneme Gıda' };
const PAGES = [
  ['index.html'], ['sss.html'], ['hibe-sartlari.html'], ['hibe-yonergesi.html'], ['iletisim.html'], ['kayit.html'],
  ['panel.html', { currentUser: A, mutfaktan_application: APP }],
  ['on-degerlendirme-formu.html', { currentUser: A, mutfaktan_application: APP }]
];

const CHECK = `(() => {
  const vis = e => { const s = getComputedStyle(e), r = e.getBoundingClientRect(); return s.display !== 'none' && s.visibility !== 'hidden' && r.width > 0 && r.height > 0; };
  const lum = c => { const [r, g, b] = c.match(/[\\d.]+/g).map(Number).slice(0, 3).map(v => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
  const d = e => e.tagName.toLowerCase() + (e.className && typeof e.className === 'string' ? '.' + e.className.split(' ')[0] : '') + ' "' + (e.textContent || '').trim().replace(/\\s+/g, ' ').slice(0, 24) + '"';
  const fixed = [], pale = [], nav = [];
  for (const e of document.body.querySelectorAll('*')) {
    if (!vis(e)) continue;
    const s = getComputedStyle(e);
    if (s.position === 'fixed' || s.position === 'sticky') fixed.push(d(e));
    const own = [...e.childNodes].some(n => n.nodeType === 3 && n.textContent.trim());
    if (own && lum(s.color) > 0.75 && s.color !== 'rgba(0, 0, 0, 0)') pale.push(d(e) + ' ' + s.color);
  }
  for (const sel of ['.main-header', '.subnav-sticky', '.desktop-side-nav', '.content-left', '.mobile-topbar', 'body > a[href="#main"]', '.hero-buttons']) { const e = document.querySelector(sel); if (e && vis(e)) nav.push(sel); }
  return JSON.stringify({ fixed, pale, nav });
})()`;

test('baskıda sabit/yapışkan öğe, açık renk (okunmaz) metin ve gezinme yok', async () => {
  for (const [page, seed] of PAGES) {
    const p = await open(`${srv.url}/${page}`, { width: 1280, height: 900, localStorage: seed, now: '2026-10-20T12:00:00' });
    try {
      await new Promise(r => setTimeout(r, 500));
      await p.cdp('Emulation.setEmulatedMedia', { media: 'print' });
      const r = JSON.parse(await p.eval(CHECK));
      assert.deepEqual(r, { fixed: [], pale: [], nav: [] }, `${page}: ${JSON.stringify(r)}`);
    } finally { await p.close(); }
  }
});

test('baskıda SSS yanıtları açık ve süzgeçle gizlenenler basılmaz', async () => {
  const p = await open(`${srv.url}/sss.html`, { width: 1280, height: 900 });
  try {
    await new Promise(r => setTimeout(r, 400));
    await p.click('button[data-cat="hibe"]'); // süzgeç: yalnız Hibe soruları
    await p.cdp('Emulation.setEmulatedMedia', { media: 'print' });
    const r = await p.eval(`(() => { const cards = [...document.querySelectorAll('.faq-card')];
      const shown = cards.filter(c => getComputedStyle(c).display !== 'none');
      return { shown: shown.length, allAnswersOpen: shown.every(c => getComputedStyle(c.querySelector(':scope > div')).display === 'block'), onlyHibe: shown.every(c => c.dataset.cat === 'hibe') }; })()`);
    assert.ok(r.shown > 0 && r.shown < 12, `süzgeç uygulanmalı (${r.shown})`);
    assert.ok(r.onlyHibe, 'yalnız süzgeçteki kategori');
    assert.ok(r.allAnswersOpen, 'yanıtlar açık basılmalı');
  } finally { await p.close(); }
});

test('her sayfa print.css\'i media="print" ile yükler', async () => {
  for (const [page, seed] of PAGES) {
    const p = await open(`${srv.url}/${page}`, { localStorage: seed });
    try {
      assert.equal(await p.eval(`!!document.querySelector('link[rel=stylesheet][href="print.css"][media=print]')`), true, page);
    } finally { await p.close(); }
  }
});
