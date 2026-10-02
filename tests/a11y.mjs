// Erişilebilirlik testi: gerçek Chrome (CDP) + gerçek klavye olayları. Çalıştır: node --test tests/a11y.mjs
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { serve, open, shutdown } from './lib/cdp.mjs';

let srv;
before(async () => { srv = await serve(); });
after(async () => { await shutdown(); srv?.stop(); });

const U = path => `${srv.url}/${path}`;
const sleep = ms => new Promise(r => setTimeout(r, ms));
const S = JSON.stringify;
const APPLICANT = { email: 'aday@example.com', role: 'applicant' };
const APP = { fullname: 'Deneme Aday', refNo: 'MY-2026-12345', status: 'submitted', submittedAt: '2026-10-20T09:00:00.000Z' };

async function withPage(path, opts, fn) {
  const p = await open(U(path), { now: '2026-10-20T12:00:00', ...opts });
  try { await fn(p); } finally { await p.close(); }
}
const inside = (p, sel) => p.eval(`document.querySelector(${S(sel)}).contains(document.activeElement)`);
const activeId = p => p.eval(`document.activeElement?.id || document.activeElement?.tagName`);
const shown = (p, sel) => p.visible(sel);

// Tab/Shift+Tab'ı n kez basar; odak her basışta modal içinde kalmalı. Dönen: dışarı çıkan basış sayısı.
async function tabEscapes(p, modalSel, n, shift = false) {
  let out = 0;
  for (let i = 0; i < n; i++) {
    await p.key('Tab', { shift });
    if (!await inside(p, modalSel)) out++;
  }
  return out;
}

// Ortak modal sözleşmesi: açınca odak içeride, Tab/Shift+Tab kaçmaz, Esc kapatır, odak tetikleyene döner, kaydırma kilidi kalkar.
async function modalContract(p, { trigger, modal, label }) {
  await p.eval(`document.querySelector(${S(trigger)}).focus()`);
  await p.key('Enter'); // klavyeyle açılış
  await p.waitFor(sel => { const m = document.querySelector(sel); return getComputedStyle(m).visibility !== 'hidden' && m.getClientRects().length > 0; }, 3000, modal);
  await sleep(150);
  assert.ok(await inside(p, modal), `${label}: açılınca odak modal içinde olmalı (activeElement: ${await activeId(p)})`);
  assert.equal(await p.eval(`document.body.classList.contains('no-scroll')`), true, `${label}: arka plan kaydırma kilidi`);
  assert.equal(await tabEscapes(p, modal, 12), 0, `${label}: Tab modaldan kaçmamalı`);
  assert.equal(await tabEscapes(p, modal, 12, true), 0, `${label}: Shift+Tab modaldan kaçmamalı`);
  await p.key('Escape');
  await sleep(100);
  assert.equal(await p.eval(`document.querySelector(${S(modal)}).hasAttribute('hidden')`), true, `${label}: Esc kapatmalı`);
  assert.equal(await p.eval(`document.body.classList.contains('no-scroll')`), false, `${label}: kaydırma kilidi kalkmalı`);
  assert.equal(await p.eval(`document.activeElement === document.querySelector(${S(trigger)})`), true, `${label}: odak tetikleyene dönmeli (activeElement: ${await activeId(p)})`);
}

test('kayit: Aydınlatma Metni modalı klavye sözleşmesi', () => withPage('kayit.html', {}, p =>
  modalContract(p, { trigger: '#open-kvkk', modal: '#modal-kvkk', label: 'KVKK' })));

test('kayit: Açık Rıza modalı klavye sözleşmesi', () => withPage('kayit.html', {}, p =>
  modalContract(p, { trigger: '#open-consent', modal: '#modal-consent', label: 'Açık Rıza' })));

test('panel: düzenleme onayı modalı (visibility geçişi) odak alır ve tuzaklar', () =>
  withPage('panel.html', { localStorage: { currentUser: APPLICANT, mutfaktan_application: APP } }, p =>
    modalContract(p, { trigger: '.btn-panel-edit', modal: '#modal-edit-confirm', label: 'Panel' })));

test('editor-davet: etik modalı klavyeyle açılır, Esc kapatır, odak geri döner', () =>
  withPage('editor-davet.html', {}, p =>
    modalContract(p, { trigger: '#openEthicsModal', modal: '#ethicsModal', label: 'Etik' })));

test('modal: iki modal üst üste — Esc yalnız en üsttekini kapatır, kilit son kapanışta kalkar', () =>
  withPage('kayit.html', {}, async p => {
    await p.eval(`MYUI.openModal(document.getElementById('modal-kvkk')); MYUI.openModal(document.getElementById('modal-consent'));`);
    await sleep(100);
    await p.key('Escape');
    assert.equal(await p.eval(`document.getElementById('modal-consent').hasAttribute('hidden')`), true);
    assert.equal(await p.eval(`document.getElementById('modal-kvkk').hasAttribute('hidden')`), false, 'alttaki modal açık kalmalı');
    assert.equal(await p.eval(`document.body.classList.contains('no-scroll')`), true, 'kilit hâlâ sürmeli');
    await p.key('Escape');
    assert.equal(await p.eval(`document.body.classList.contains('no-scroll')`), false);
  }));

test('modal: arka plana tıklama kapatır, içeriden başlayan sürükleme kapatmaz', () =>
  withPage('kayit.html', {}, async p => {
    await p.click('#open-kvkk');
    await sleep(150);
    // içeriden bas, arka planda bırak → click hedefi ortak ata (arka plan) olur; kapanmamalı
    await p.eval(`(() => { const m = document.getElementById('modal-kvkk'); m.firstElementChild.dispatchEvent(new MouseEvent('mousedown', { bubbles: true })); m.dispatchEvent(new MouseEvent('click', { bubbles: true })); })()`);
    assert.equal(await p.eval(`document.getElementById('modal-kvkk').hasAttribute('hidden')`), false, 'içeriden sürükleme kapatmamalı');
    await p.eval(`(() => { const m = document.getElementById('modal-kvkk'); m.dispatchEvent(new MouseEvent('mousedown', { bubbles: true })); m.dispatchEvent(new MouseEvent('click', { bubbles: true })); })()`);
    assert.equal(await p.eval(`document.getElementById('modal-kvkk').hasAttribute('hidden')`), true, 'arka plan tıklaması kapatmalı');
  }));

test('tüm modallar: role="dialog", aria-modal ve çözülen aria-labelledby', async () => {
  for (const page of ['kayit.html', 'panel.html', 'editor-davet.html', 'editor-degerlendirme.html']) {
    await withPage(page, {}, async p => {
      const bad = await p.eval(`[...document.querySelectorAll('.modal, .modal-backdrop')].map(m => {
        const d = m.getAttribute('role') === 'dialog' ? m : m.querySelector('[role="dialog"]');
        if (!d) return m.id + ': role=dialog yok';
        if (d.getAttribute('aria-modal') !== 'true') return m.id + ': aria-modal yok';
        const l = d.getAttribute('aria-labelledby');
        return l && document.getElementById(l)?.textContent.trim() ? '' : m.id + ': aria-labelledby çözülmüyor';
      }).filter(Boolean)`);
      assert.deepEqual(bad, [], page);
    });
  }
});

// ---- Tüm sayfalar: giriş gerektirenler için oturum tohumu ----
const EDITOR = { email: 'editor@example.com', name: 'Deneme Editör', role: 'editor' };
const PAGES = [
  ['index.html'], ['sss.html'], ['hibe-sartlari.html'], ['hibe-yonergesi.html'], ['kayit.html'], ['giris.html'], ['iletisim.html'],
  ['sifre-sifirla.html'], ['sifre-yenile.html?email=a%40b.com'], ['editor-davet.html'],
  ['basvuru.html', { currentUser: APPLICANT }],
  ['panel.html', { currentUser: APPLICANT, mutfaktan_application: APP }],
  ['on-degerlendirme-formu.html', { currentUser: APPLICANT, mutfaktan_application: { ...APP, status: 'preeval-open' } }],
  ['editor-panel.html', { currentUser: EDITOR, editorUser: EDITOR }],
  ['editor-degerlendirme.html?ref=MY26-0089', { currentUser: EDITOR, editorUser: EDITOR }]
];

test('her sayfada ilk Tab "İçeriğe geç"; Enter <main id="main">e atlar', async () => {
  for (const [page, seed] of PAGES) {
    await withPage(page, { localStorage: seed }, async p => {
      await p.key('Tab');
      const link = await p.eval(`(() => { const a = document.activeElement, r = a.getBoundingClientRect();
        return { skip: a.matches('body > a[href="#main"]'), text: a.textContent.trim(), onScreen: r.top >= 0 && r.bottom > 0 && r.left >= 0 }; })()`);
      assert.ok(link.skip, `${page}: ilk Tab atlama bağlantısına gitmeli`);
      assert.equal(link.text, 'İçeriğe geç', page);
      assert.ok(link.onScreen, `${page}: odaklanınca ekranda görünmeli`);
      await p.key('Enter');
      await sleep(50);
      assert.equal(await p.eval(`location.hash`), '#main', page);
      assert.equal(await p.eval(`document.querySelectorAll('main#main').length`), 1, `${page}: tek <main id="main">`);
    });
  }
});

// Ön değerlendirme henüz açılmamış aday: JS'in ürettiği bildirim başlığı da sırayı bozmamalı
const CLOSED = ['on-degerlendirme-formu.html', { currentUser: APPLICANT, mutfaktan_application: APP }];

test('başlık sırası: sayfada tek h1, ilk başlık h1, seviye atlamaz (görünür, diyalog dışı)', async () => {
  for (const [page, seed] of [...PAGES, CLOSED]) {
    await withPage(page, { localStorage: seed }, async p => {
      await sleep(400);
      const hs = await p.eval(`[...document.querySelectorAll('h1,h2,h3,h4,h5,h6')]
        .filter(h => h.getClientRects().length && getComputedStyle(h).visibility !== 'hidden' && !h.closest('[role="dialog"]'))
        .map(h => [+h.tagName[1], h.textContent.trim().replace(/\\s+/g, ' ').slice(0, 40)])`);
      assert.equal(hs.filter(h => h[0] === 1).length, 1, `${page}: tek h1 olmalı`);
      assert.equal(hs[0][0], 1, `${page}: ilk başlık h1 olmalı (bulunan h${hs[0][0]} "${hs[0][1]}")`);
      let prev = 0;
      for (const [l, t] of hs) { assert.ok(!prev || l <= prev + 1, `${page}: h${prev} → h${l} "${t}"`); prev = l; }
    });
  }
});

test('filtre düğmeleri aria-pressed taşır ve tıklamayla güncellenir (sss, editor-panel)', async () => {
  await withPage('sss.html', {}, async p => {
    const state = () => p.eval(`[...document.querySelectorAll('.filter-pills > button')].map(b => b.getAttribute('aria-pressed')).join()`);
    assert.equal(await state(), 'true,false,false,false,false');
    await p.click('button[data-cat="msa"]');
    assert.equal(await state(), 'false,false,true,false,false');
  });
  await withPage('editor-panel.html', { localStorage: { currentUser: EDITOR, editorUser: EDITOR } }, async p => {
    const state = () => p.eval(`[...document.querySelectorAll('.filter-tab')].map(b => b.getAttribute('aria-pressed')).join()`);
    assert.equal(await state(), 'true,false,false,false,false');
    await p.click('.filter-tab[data-filter="scored"]');
    assert.equal(await state(), 'false,false,false,true,false');
  });
});

test('SSS soruları <h2><button> yapısında: başlık düğmeyi sarar, düğme başlık içermez', () =>
  withPage('sss.html', {}, async p => {
    const r = await p.eval(`({
      n: document.querySelectorAll('.faq-card > h2 > button.faq-question').length,
      nested: document.querySelectorAll('button h1, button h2, button h3, button h4').length
    })`);
    assert.equal(r.n, 16);
    assert.equal(r.nested, 0, 'düğme içinde başlık olmamalı');
  }));

test('seçim işareti: onay kutusu kare, radyo daire (kapsayıcı sınıfından bağımsız)', async () => {
  for (const [page, seed, sel, want] of [
    ['kayit.html', undefined, '#chk-kvkk', 'kare'],
    ['basvuru.html', { currentUser: APPLICANT }, '#chk-el-1', 'kare'],
    ['editor-degerlendirme.html?ref=MY26-0089', { currentUser: EDITOR, editorUser: EDITOR }, 'input[name="rubric_q1"]', 'daire']
  ]) {
    await withPage(page, { localStorage: seed }, async p => {
      await sleep(300);
      const r = await p.eval(`(() => { const l = document.querySelector(${S(sel)}).closest('label'), s = getComputedStyle(l, '::before');
        return { radius: s.borderTopLeftRadius, w: s.width }; })()`);
      if (want === 'kare') assert.ok(parseFloat(r.radius) <= 6, `${page}: onay kutusu kare olmalı (radius ${r.radius})`);
      else assert.ok(parseFloat(r.radius) >= parseFloat(r.w) / 2 - 1, `${page}: radyo daire olmalı (radius ${r.radius}, w ${r.w})`);
    });
  }
});

test('dokunmatik tablet (820 px, pointer: coarse): etkileşimli öğeler ≥ 44 px', async () => {
  const AUDIT = `(() => {
    const vis = e => { const s = getComputedStyle(e), r = e.getBoundingClientRect(); return s.display !== 'none' && s.visibility !== 'hidden' && r.width > 0 && r.height > 0; };
    const bad = [];
    for (const e of document.querySelectorAll('a[href], button, select, textarea, input:not([type=hidden]):not([type=checkbox]):not([type=radio]):not([type=file]), summary')) {
      if (!vis(e)) continue;
      const inText = e.tagName === 'A' && e.parentElement && /^(P|LI|SPAN|STRONG|SMALL|H[1-6])$/.test(e.parentElement.tagName) && getComputedStyle(e).display === 'inline';
      const r = e.getBoundingClientRect();
      if (!inText && Math.min(r.width, r.height) < 44) bad.push(e.tagName.toLowerCase() + (e.id ? '#' + e.id : '') + ' "' + (e.innerText || e.getAttribute('aria-label') || '').trim().slice(0, 20) + '" ' + Math.round(r.width) + 'x' + Math.round(r.height));
    }
    return JSON.stringify(bad);
  })()`;
  for (const [page, seed] of PAGES) {
    const p = await open(U(page), { width: 820, height: 1000, localStorage: seed, now: '2026-10-20T12:00:00' });
    try {
      await p.cdp('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 });
      await sleep(500);
      assert.deepEqual(JSON.parse(await p.eval(AUDIT)), [], `${page}: 44 px altı dokunma hedefi`);
    } finally { await p.close(); }
  }
});

test('on-degerlendirme: puanlama açıklaması kapalı gelir, klavyeyle açılır/kapanır', () =>
  withPage('on-degerlendirme-formu.html', { localStorage: { currentUser: APPLICANT, mutfaktan_application: { ...APP, status: 'preeval-open' } } }, async p => {
    const open = () => p.eval(`document.querySelector('.preeval-card details').open`);
    assert.equal(await open(), false, 'varsayılan kapalı');
    await p.eval(`document.querySelector('.preeval-card summary').focus()`);
    await p.key('Enter');
    assert.equal(await open(), true, 'Enter açmalı');
    assert.ok(await p.visible('.preeval-card details p'), 'açıklama görünmeli');
    await p.key('Enter');
    assert.equal(await open(), false, 'Enter tekrar kapatmalı');
    // ok işareti: ::after boş içerikle çizilir
    assert.equal(await p.eval(`getComputedStyle(document.querySelector('.preeval-card summary'), '::after').content !== 'none'`), true);
  }));
