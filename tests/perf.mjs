// Performans testi: gerçek Chrome (CDP). Çalıştır: node --test tests/perf.mjs
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { statSync } from 'node:fs';
import { serve, open, shutdown } from './lib/cdp.mjs';

let srv;
before(async () => { srv = await serve(); });
after(async () => { await shutdown(); srv?.stop(); });

const A = { email: 'a@b.c', role: 'applicant' };
const E = { email: 'e@x.c', name: 'E', role: 'editor' };
const APP = { fullname: 'X', refNo: 'MY-1', status: 'preeval-open', birthdate: '1999-05-14', biztype: 'sirket' };
const PAGES = [
  ['index.html'], ['sss.html'], ['hibe-sartlari.html'], ['hibe-yonergesi.html'], ['kayit.html'], ['giris.html'], ['iletisim.html'],
  ['sifre-sifirla.html'], ['sifre-yenile.html?email=a%40b.com'], ['editor-davet.html'],
  ['basvuru.html', { currentUser: A }],
  ['panel.html', { currentUser: A, mutfaktan_application: APP }],
  ['on-degerlendirme-formu.html', { currentUser: A, mutfaktan_application: APP }],
  ['editor-panel.html', { currentUser: E, editorUser: E }],
  ['editor-degerlendirme.html?ref=MY26-0089', { currentUser: E, editorUser: E }]
];

// FontFace (family+weight) ↔ dosya adı
const FILE = { Headline: 'TCCC-UnityHeadline', Text: 'TCCC-UnityText' };
const WEIGHT = { 300: 'Light', 400: 'Regular', 500: 'Medium', 700: 'Bold', 900: 'Black' };

test('font preload: yalnız sayfada kullanılan yüzler; kullanılan Headline-Black daima önyüklenir', async () => {
  for (const [page, seed] of PAGES) {
    const p = await open(`${srv.url}/${page}`, { width: 1280, height: 800, localStorage: seed, now: '2026-10-20T12:00:00' });
    try {
      await new Promise(r => setTimeout(r, 800));
      const r = JSON.parse(await p.eval(`(async () => { await document.fonts.ready;
        return JSON.stringify({
          used: [...document.fonts].filter(f => f.status === 'loaded').map(f => f.family + '|' + f.weight),
          pre: [...document.querySelectorAll('link[rel=preload][as=font]')].map(l => l.getAttribute('href'))
        }); })()`));
      const used = new Set(r.used.map(u => { const [fam, w] = u.split('|'); const k = fam.replace('TCCC-Unity', ''); return `fonts/${FILE[k]}-${WEIGHT[w]}.woff2`; }));
      for (const href of r.pre) assert.ok(used.has(href), `${page}: ${href} önyükleniyor ama sayfada kullanılmıyor (boşa indirme)`);
      const black = 'fonts/TCCC-UnityHeadline-Black.woff2';
      if (used.has(black)) assert.ok(r.pre.includes(black), `${page}: kullanılan Headline-Black önyüklenmeli (h1 geç keşfediliyor)`);
    } finally { await p.close(); }
  }
});

test('hero (LCP): fetchpriority=high, eşleşen kaynak önyüklenir ve tek kez iner, aşırı büyütülmez', async () => {
  for (const w of [375, 414, 768, 1024, 1280, 1920]) {
    const p = await open(`${srv.url}/index.html`, { width: w, height: 800 });
    try {
      await new Promise(r => setTimeout(r, 1200));
      const r = JSON.parse(await p.eval(`JSON.stringify((() => {
        const i = document.querySelector('.hero-bg-layer img'), b = i.getBoundingClientRect(), cur = i.currentSrc.split('/').pop();
        const res = performance.getEntriesByType('resource').filter(e => /brand-collage/.test(e.name)).map(e => e.name.split('/').pop() + ':' + e.initiatorType);
        const pre = [...document.querySelectorAll('link[rel=preload][as=image]')].filter(l => matchMedia(l.media || 'all').matches).map(l => l.getAttribute('href').split('/').pop());
        return { cur, fp: i.getAttribute('fetchpriority'), lazy: i.loading, res, pre, scale: Math.max(b.width / i.naturalWidth, b.height / i.naturalHeight) };
      })())`));
      assert.equal(r.fp, 'high', `${w}: fetchpriority`);
      assert.notEqual(r.lazy, 'lazy', `${w}: hero tembel yüklenmemeli`);
      assert.deepEqual(r.pre, [r.cur], `${w}: yalnız <picture>ın seçtiği kaynak önyüklenmeli`);
      assert.deepEqual(r.res, [`${r.cur}:link`], `${w}: görsel tek kez ve önyükleme ile inmeli`);
      assert.ok(r.scale <= 1.3, `${w}: hero ${r.cur} ${r.scale.toFixed(2)}× büyütülüyor (≤ 1,3 beklenir)`);
    } finally { await p.close(); }
  }
});

test('logo: gösterilen boyutun ≥ 2 katı (retina) ama ≤ 4 katı çözünürlükte', async () => {
  for (const page of ['index.html', 'giris.html']) {
    const p = await open(`${srv.url}/${page}`, { width: 1280, height: 800 });
    try {
      await p.eval(`document.querySelectorAll('img[loading=lazy]').forEach(i => { i.loading = 'eager'; })`);
      await new Promise(r => setTimeout(r, 800));
      const r = JSON.parse(await p.eval(`JSON.stringify([...document.querySelectorAll('img[src*="logo-full"]')].filter(i => i.getBoundingClientRect().width > 0).map(i => [i.src.split('/').pop(), i.naturalWidth, Math.round(i.getBoundingClientRect().width)]))`));
      assert.ok(r.length > 0, `${page}: logo bulunamadı`);
      for (const [f, nat, shown] of r) assert.ok(nat >= 2 * shown && nat <= 4 * shown, `${page}: ${f} ${nat}px kaynak, ${shown}px gösterim`);
    } finally { await p.close(); }
  }
});
