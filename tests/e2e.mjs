// Akış duman testi: gerçek Chrome (CDP) + yerel http.server. Çalıştır: node --test tests/e2e.mjs
// Her senaryo yalıtılmış bir tarayıcı bağlamında (temiz localStorage) çalışır.
// "[08 bekleniyor]" ile başlayan mesajlar CSS'e (görünürlük) bağlıdır; mantık denetimleri onlardan ayrıdır.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { serve, open, shutdown } from './lib/cdp.mjs';

let srv;
before(async () => { srv = await serve(); });
after(async () => { await shutdown(); srv?.stop(); });

const U = path => `${srv.url}/${path}`;
const sleep = ms => new Promise(r => setTimeout(r, ms));
const NOW = '2026-10-20T12:00:00'; // başvuru penceresi içinde sabit "bugün" (yaş kuralı deterministik olsun)
const APPLICANT = { email: 'aday@example.com', role: 'applicant' };
const EDITOR = { email: 'editor@mutfaktanyarina.com', name: 'Dr. Elif Kaya', role: 'editor' };

const flowErrors = []; // tüm senaryoların konsol hataları; senaryo 8 toplar
let scenario = '?';
const scn = (id, title, fn) => test(`${id}. ${title}`, async t => { scenario = id; await fn(t); });

// Sayfayı açar, senaryoyu çalıştırır; alert/confirm çıkmamalı; konsol hatalarını toplar.
async function withPage(path, opts, fn) {
  const p = await open(U(path), opts);
  try {
    await fn(p);
    assert.deepEqual(p.dialogs(), [], `alert/confirm çıkmamalı (${path})`);
  } finally {
    p.consoleErrors().forEach(e => flowErrors.push(`[senaryo ${scenario}] ${path}: ${e}`));
    await p.close();
  }
}
const css = (cond, msg) => assert.ok(cond, `[08 bekleniyor] ${msg}`);
const S = JSON.stringify;
const txt = (p, s) => p.eval(`document.querySelector(${S(s)}).textContent.trim()`);
const hasCls = (p, s, c) => p.eval(`!!document.querySelector(${S(s)})?.classList.contains(${S(c)})`);
const hasAttr = (p, s, a) => p.eval(`document.querySelector(${S(s)}).hasAttribute(${S(a)})`);
const fieldInvalid = (p, s) => p.eval(`document.querySelector(${S(s)}).closest('.field').classList.contains('invalid')`);
const activeStep = p => p.eval(`document.querySelector('.step-pane.active').id`);
const next = async p => { await p.click('#btn-next'); return activeStep(p); };
const checkAll = (p, s) => p.eval(`document.querySelectorAll(${S(s)}).forEach(c => { if (!c.checked) c.click(); })`);

// ---- Başvuru sihirbazı yardımcıları ----
const PERSON = { fullname: 'Test Aday', phone: '05321234567', email: 'aday@example.com', city: 'Balıkesir', bizname: 'Test Mutfak', address: 'Test Mah. Test Sok. No:1' };
const AYSE = { biztype: 'sahis', taxno: '12345678901', bizyear: '2024', q11: 2, q12: 2, q13: 2, hired: 'no', q15: 'yes', q21: 'yes', q22: ['mutfak', 'istihdam'], score: 52.5 };
const FATMA = { biztype: 'sirket', taxno: '1234567890', bizyear: '2020', q11: 12, q12: 3, q13: 11, hired: 'yes', q14: 'less_half', q15: 'yes', q21: 'no', q22: ['masa', 'dekorasyon'], score: 32 };
const GUL = { biztype: 'kooperatif', taxno: '1234567890', bizyear: '2019', q11: 6, q12: 6, q13: 4, hired: 'yes', q14: 'all', q15: 'yes', q21: 'no', q22: ['mutfak', 'masa'], score: 66 };
const WIZARD = { localStorage: { currentUser: APPLICANT }, now: NOW };

async function fillStep2(p, birth = '1997-01-01') {
  await p.type('#inp-fullname', PERSON.fullname);
  await p.type('#inp-birthdate', birth);
  await p.type('#inp-phone', PERSON.phone);
  await p.type('#inp-email', PERSON.email);
  await p.type('#inp-city', PERSON.city);
}
async function fillStep3(p, sc) {
  await p.click(`input[name="biz-type"][value="${sc.biztype}"]`);
  await p.type('#inp-bizname', PERSON.bizname);
  await p.type('#inp-taxno', sc.taxno);
  await p.type('#inp-bizyear', sc.bizyear);
  await p.type('#inp-address', PERSON.address);
}
const pickPdf = p => p.setFile('#inp-file', { name: 'msa-sertifika.pdf', size: 2048, type: 'application/pdf' });
async function fillStep5(p, sc, { withQ22 = true } = {}) {
  await p.type('#inp-q11', sc.q11); await p.type('#inp-q12', sc.q12); await p.type('#inp-q13', sc.q13);
  await p.click(`input[name="q14_hired"][value="${sc.hired}"]`);
  if (sc.hired === 'yes') await p.type('#inp-q14', sc.q14);
  await p.click(`input[name="q15"][value="${sc.q15}"]`);
  await p.click(`input[name="q21"][value="${sc.q21}"]`);
  if (withQ22) for (const v of sc.q22) await p.click(`input[name="q22"][value="${v}"]`);
}
// Baştan sona doldurur; son adımda gönderime kadar gider (gönder tıklanmaz).
async function fillToLastStep(p, sc) {
  await checkAll(p, 'input[name=eligibility]');
  assert.equal(await next(p), 'step-2');
  await fillStep2(p); assert.equal(await next(p), 'step-3');
  await fillStep3(p, sc); assert.equal(await next(p), 'step-4');
  await pickPdf(p); assert.equal(await next(p), 'step-5');
  await fillStep5(p, sc); assert.equal(await next(p), 'step-6');
}
const submitAtLastStep = async p => { await checkAll(p, 'input[id^="chk-doc-"]'); await p.click('#btn-next'); await p.waitForPath('panel.html'); };

// 1 ------------------------------------------------------------------------------------------------
scn(1, 'Kayıt: doğrulama, başarı modalı, başvuruya geçiş', async () => {
  await withPage('kayit.html', {}, async p => {
    await p.click('#btn-submit');
    assert.equal(await p.eval(`document.querySelectorAll('.field.invalid').length`), 2, 'kullanıcı adı + şifre hatası');
    assert.ok(await hasCls(p, '#err-kvkk', 'show') && await hasCls(p, '#err-consent', 'show'), 'onay hataları');
    css(await p.visible('#err-kvkk'), '#err-kvkk görünmüyor');
    await p.type('#username', 'aday@example.com');
    await p.type('#password', 'Sifre1234!');
    await p.click('#chk-kvkk'); await p.click('#chk-consent');
    await p.click('#btn-submit');
    await p.waitFor('#modal-success.active');
    css(await p.visible('#modal-success'), 'başarı modalı görünmüyor');
    await p.click('#proceed-grant');
    await p.waitForPath('basvuru.html');
    const user = await p.ls('currentUser');
    assert.equal(user.role, 'applicant');
    assert.equal(user.email, 'aday@example.com');
  });
});

// 2 ------------------------------------------------------------------------------------------------
scn(2, 'Başvuru sihirbazı', async t => {
  await t.test('Ayşe: adım doğrulamaları, gönderim, düzenleme (aynı refNo)', async () => {
    await withPage('basvuru.html', WIZARD, async p => {
      // Adım 1
      assert.equal(await next(p), 'step-1', 'onaysız ilerlememeli');
      assert.ok(await hasCls(p, '#gate-error', 'show'));
      await p.eval(`document.querySelectorAll('input[name=eligibility]').forEach((c, i) => { if (i < 8) c.click(); })`);
      assert.equal(await next(p), 'step-1', '8/9 onayla ilerlememeli');
      await p.click('#chk-el-9');
      assert.equal(await next(p), 'step-2');
      // Adım 2: bugün 2026-10-20; 18 tam yaş ve doğum >= 1997-01-01
      await fillStep2(p, '2008-12-31');
      for (const bad of ['2008-12-31', '2008-10-21', '1996-12-31']) {
        await p.type('#inp-birthdate', bad);
        assert.equal(await next(p), 'step-2', `${bad} reddedilmeli`);
        assert.ok(await fieldInvalid(p, '#inp-birthdate'), `${bad} alanı geçersiz işaretlenmeli`);
      }
      await p.type('#inp-birthdate', '2008-10-20');
      assert.equal(await next(p), 'step-3', '2008-10-20 (tam 18 yaş) kabul edilmeli');
      await p.click('#btn-prev');
      await p.type('#inp-birthdate', '1997-01-01');
      assert.equal(await next(p), 'step-3', '1997-01-01 kabul edilmeli');
      // Adım 3: vergi no 10/11 hane, yıl <= 2024
      await fillStep3(p, AYSE);
      for (const bad of ['123456789', '123456789012', '12345abcde']) {
        await p.type('#inp-taxno', bad);
        assert.equal(await next(p), 'step-3', `vergi no ${bad} reddedilmeli`);
        assert.ok(await fieldInvalid(p, '#inp-taxno'));
      }
      await p.type('#inp-taxno', AYSE.taxno);
      await p.type('#inp-bizyear', '2025');
      assert.equal(await next(p), 'step-3', 'yıl 2025 reddedilmeli');
      assert.ok(await fieldInvalid(p, '#inp-bizyear'));
      await p.type('#inp-bizyear', '2024');
      assert.equal(await next(p), 'step-4', '11 haneli no ve yıl 2024 kabul edilmeli');
      // Adım 4: dosya
      assert.equal(await next(p), 'step-4', 'dosyasız ilerlememeli');
      assert.ok(await hasCls(p, '#file-error', 'show'));
      await p.setFile('#inp-file', { name: 'sertifika.exe', size: 1024, type: 'application/x-msdownload' });
      assert.match(await txt(p, '#file-error-text'), /PDF/, '.exe reddedilmeli');
      assert.ok(!await hasCls(p, '#file-preview', 'active'));
      await p.setFile('#inp-file', { name: 'buyuk.pdf', size: 11 * 1024 * 1024, type: 'application/pdf' });
      assert.match(await txt(p, '#file-error-text'), /10 MB/, '11 MB reddedilmeli');
      assert.equal(await next(p), 'step-4');
      await pickPdf(p);
      assert.ok(await hasCls(p, '#file-preview', 'active'), 'PDF kabul edilmeli');
      assert.equal(await next(p), 'step-5');
      // Adım 5: radyolar boş başlar, seçmeden ilerlemez, q22 tam 2
      assert.equal(await p.eval(`document.querySelectorAll('input[name=q14_hired]:checked, input[name=q15]:checked, input[name=q21]:checked, input[name=q22]:checked').length`), 0, 'radyo/kutular boş başlamalı');
      await p.type('#inp-q11', 2); await p.type('#inp-q12', 2); await p.type('#inp-q13', 2);
      assert.equal(await next(p), 'step-5', 'radyo seçmeden ilerlememeli');
      assert.ok(await hasCls(p, '#field-q14-pre', 'invalid'));
      assert.ok(await fieldInvalid(p, 'input[name="q15"]') && await fieldInvalid(p, 'input[name="q21"]'));
      await fillStep5(p, AYSE, { withQ22: false });
      await p.click('input[name="q22"][value="mutfak"]');
      assert.equal(await next(p), 'step-5', 'q22 tek seçimle ilerlememeli');
      assert.ok(await hasCls(p, '#q22-error', 'show'));
      await p.click('input[name="q22"][value="istihdam"]');
      assert.ok(await p.eval(`document.querySelector('input[name=q22][value=masa]').disabled`), '3. seçenek disabled olmalı');
      await p.click('input[name="q22"][value="masa"]');
      assert.equal(await p.eval(`document.querySelectorAll('input[name=q22]:checked').length`), 2, 'en fazla 2 seçim');
      assert.equal(await next(p), 'step-6');
      assert.equal(await txt(p, '#sum-emp-stay'), 'İşe başlayan olmadı', 'özet');
      // Adım 6: geçersiz durumda #final-error, sayfa takılmaz
      await p.click('#btn-next');
      assert.equal(await activeStep(p), 'step-6');
      assert.ok(await hasCls(p, '#final-error', 'show'));
      css(await p.visible('#final-error'), '#final-error görünmüyor');
      await checkAll(p, 'input[id^="chk-doc-"]');
      await p.eval(`window.__orig = MYScoring.systemScore; MYScoring.systemScore = () => { throw new Error('test'); }`);
      await p.click('#btn-next');
      assert.match(await p.eval('location.pathname'), /basvuru\.html$/, 'puanlama hatasında sayfa yönlenmemeli');
      assert.equal(await p.ls('mutfaktan_application'), null, 'hatada başvuru yazılmamalı');
      assert.match(await txt(p, '#final-error span'), /eksik veya hatalı/);
      css(await p.visible('#final-error'), 'puanlama hatasında #final-error görünmüyor');
      await p.eval('MYScoring.systemScore = window.__orig');
      await p.click('#btn-next');
      await p.waitForPath('panel.html');
      const app = await p.ls('mutfaktan_application');
      assert.equal(app.sistemScore, AYSE.score);
      assert.ok(app.refNo, 'refNo olmalı');
      assert.equal(app.status, 'submitted');
      assert.equal(await txt(p, '#val-refno'), app.refNo);
      // Düzenle -> tekrar gönder -> aynı refNo
      await p.click('#btn-open-edit');
      await p.waitFor('#modal-edit-confirm.active');
      await p.click('#btn-confirm-edit');
      await p.waitForPath('basvuru.html');
      assert.ok(await hasCls(p, '#edit-banner', 'active'), 'düzenleme bandı');
      for (let n = 1; n <= 5; n++) assert.equal(await next(p), `step-${n + 1}`, `düzenlemede adım ${n} kayıtlı veriyle geçmeli`);
      await submitAtLastStep(p);
      const again = await p.ls('mutfaktan_application');
      assert.equal(again.refNo, app.refNo, 'düzenleme refNo değiştirmemeli');
      assert.equal(again.submittedAt, app.submittedAt);
      assert.equal(again.sistemScore, AYSE.score);
    });
  });
  for (const sc of [{ name: 'Fatma', d: FATMA }, { name: 'Gül kooperatifi', d: GUL }]) {
    await t.test(`${sc.name}: sistemScore ${sc.d.score}`, async () => {
      await withPage('basvuru.html', WIZARD, async p => {
        await fillToLastStep(p, sc.d);
        await submitAtLastStep(p);
        assert.equal((await p.ls('mutfaktan_application')).sistemScore, sc.d.score);
      });
    });
  }
});

// 3 ------------------------------------------------------------------------------------------------
const APP = {
  status: 'submitted', refNo: 'MY-2026-11111', submittedAt: '2026-10-20T10:00:00.000Z', fullname: 'Test Aday', birthdate: '2000-05-05',
  phone: PERSON.phone, email: PERSON.email, city: 'Adana', biztype: 'sirket', bizname: 'Test Lokanta', taxno: '1234567890', bizyear: '2020',
  fileName: 'msa.pdf', q11: '10', q12: '4', q13: '8', q14_hired: 'yes', q14: 'less_half', q15: 'yes', q21: 'no', q22: ['masa', 'dekorasyon']
};
scn(3, 'Panel', async t => {
  await t.test('q14 etiketi ham kod değil; MSA satırında "(Doğrulandı)" yok', async () => {
    await withPage('panel.html', { localStorage: { currentUser: APPLICANT, mutfaktan_application: APP } }, async p => {
      const labels = { none: 'İşe başlayan olmadı', zero: 'Oldu, kimse kalmadı', less_half: 'Yarıdan azı', half_more: 'Yarısı ve fazlası', all: 'Tamamı' };
      for (const [code, label] of Object.entries(labels)) {
        await p.eval(c => { const a = JSON.parse(localStorage.mutfaktan_application); a.q14 = c; localStorage.mutfaktan_application = JSON.stringify(a); }, code);
        await p.goto(U('panel.html'));
        assert.equal(await txt(p, '#tbl-q14'), label, `q14=${code}`);
      }
      assert.equal(await txt(p, '#tbl-msa'), 'msa.pdf');
      assert.ok(!(await p.eval('document.body.textContent')).includes('(Doğrulandı)'), '"(Doğrulandı)" yazmamalı');
    });
  });
  await t.test('status:draft -> Taslak rozeti', async () => {
    await withPage('panel.html', { localStorage: { currentUser: APPLICANT, mutfaktan_application: { ...APP, status: 'draft' } } }, async p => {
      assert.match(await txt(p, '#status-text'), /Taslak/);
    });
  });
  await t.test('veri yokken sahte metin yok', async () => {
    await withPage('panel.html', { localStorage: { currentUser: APPLICANT } }, async p => {
      assert.equal(await txt(p, '#status-text'), 'Kayıtlı başvuru bulunamadı');
      assert.ok(!(await p.eval('document.body.textContent')).includes('Ayşe Yılmaz'), 'sahte "Ayşe Yılmaz" görünmemeli');
    });
  });
  await t.test('çıkışta currentUser silinir', async () => {
    await withPage('panel.html', { localStorage: { currentUser: APPLICANT, mutfaktan_application: APP } }, async p => {
      await p.click('#btn-logout');
      await p.waitForPath('giris.html');
      assert.equal(await p.ls('currentUser'), null);
    });
  });
  await t.test('role yoksa giris.html', async () => {
    for (const user of [{}, EDITOR]) {
      await withPage('panel.html', { localStorage: { currentUser: user } }, p => p.waitForPath('giris.html'));
    }
  });
});

// 4 ------------------------------------------------------------------------------------------------
const PRE_APP = {
  status: 'preeval-open', refNo: 'MY-2026-55555', submittedAt: '2026-10-20T10:00:00.000Z', fullname: 'Test Aday', bizname: 'Test Mutfak', city: 'İzmir',
  biztype: 'sahis', q11: '2', q12: '2', q13: '2', q14: 'none', q15: 'yes', q21: 'yes', q22: ['mutfak', 'istihdam'], sistemScore: 52.5
};
const preSeed = biztype => ({ currentUser: APPLICANT, mutfaktan_application: { ...PRE_APP, biztype } });
scn(4, 'Ön değerlendirme', async t => {
  await t.test('Ö2: şahısta gizli/zorunlu değil, şirkette görünür/zorunlu', async () => {
    await withPage('on-degerlendirme-formu.html', { localStorage: preSeed('sahis') }, async p => {
      assert.ok(await hasAttr(p, '#q2-field', 'hidden'));
      assert.equal(await p.eval(`document.querySelector('#ans-q2').required`), false);
      css(!await p.visible('#q2-field'), 'şahısta Ö2 alanı hâlâ görünüyor');
    });
    await withPage('on-degerlendirme-formu.html', { localStorage: preSeed('sirket') }, async p => {
      assert.ok(!await hasAttr(p, '#q2-field', 'hidden'));
      assert.equal(await p.eval(`document.querySelector('#ans-q2').required`), true);
      css(await p.visible('#ans-q2'), 'şirkette Ö2 görünmüyor');
    });
  });
  await t.test('boş gönderim satır içi mesaj verir (alert yok)', async () => {
    await withPage('on-degerlendirme-formu.html', { localStorage: preSeed('sahis') }, async p => {
      await p.click('#btn-submit-preeval');
      assert.ok(!await hasAttr(p, '#preeval-feedback', 'hidden'), 'satır içi mesaj (#preeval-feedback) gösterilmeli; form.required tarayıcı doğrulamasıyla JS mesajını engelliyor olabilir');
      assert.match(await txt(p, '#preeval-feedback'), /Eksik/);
    });
  });
  await t.test('geçerli gönderim başvuranın kendi ref\'ine yazar', async () => {
    await withPage('on-degerlendirme-formu.html', { localStorage: preSeed('sahis') }, async p => {
      for (const n of [1, 3, 4, 5, 6]) await p.type(`#ans-q${n}`, `Yanıt ${n}`);
      await p.click('#preeval-confirm');
      await p.click('#btn-submit-preeval');
      await p.waitForPath('panel.html');
      const apps = await p.ls('programApplications');
      const own = apps.find(a => a.ref === 'MY-2026-55555');
      assert.ok(own, 'kayıt kendi ref\'ine yazılmalı');
      assert.equal(own.applicantAnswers.q1, 'Yanıt 1');
      assert.equal(apps.find(a => a.ref === 'MY26-0158').applicantAnswers, undefined, 'MY26-0158 sabit kaydına yazılmamalı');
      assert.equal((await p.ls('onDegerlendirmeAnswers')).ref, 'MY-2026-55555');
      assert.equal(await txt(p, '#status-text'), 'Ön Değerlendirme Yanıtları Alındı');
    });
  });
});

// 5 ------------------------------------------------------------------------------------------------
const EDITOR_SEED = { localStorage: { currentUser: EDITOR } };
const rows = p => p.eval(`Array.from(document.querySelectorAll('#appsTableBody tr')).map(tr => ({
  rank: tr.cells[0].textContent.trim(), ref: tr.cells[1].textContent.trim(),
  status: tr.querySelector('.badge-status')?.textContent.trim(), jury: !!tr.querySelector('.status-jury') }))`);
const ORDER = ['MY26-0042', 'MY26-0089', 'MY26-0115', 'MY26-0158', 'MY26-0204', 'MY26-0241'];
scn(5, 'Editör', async t => {
  await t.test('editor-panel: sıralama, arama, filtre, Elendi, Jüri Aday Listesi', async () => {
    await withPage('editor-panel.html', EDITOR_SEED, async p => {
      let r = await rows(p);
      assert.deepEqual(r.map(x => x.ref), ORDER, '6 tohum kayıt ve sıra');
      assert.deepEqual(r.map(x => x.rank), ['1', '2', '3', '4', '5', '6']);
      await p.type('#appSearchInput', 'izmir');
      r = await rows(p);
      assert.deepEqual(r.map(x => x.ref), ['MY26-0089'], '"izmir" -> İzmir');
      assert.equal(r[0].rank, '2', 'arama sıra numarasını değiştirmemeli');
      await p.type('#appSearchInput', '');
      assert.deepEqual((await rows(p)).map(x => x.ref), ORDER);
      await p.click('.filter-tab[data-filter="pending-verify"]');
      r = await rows(p);
      assert.deepEqual(r.map(x => `${x.rank}:${x.ref}`), ['5:MY26-0204', '6:MY26-0241'], 'sekme sıra numarasını değiştirmemeli');
      // Elendi kaydı
      await p.eval(() => {
        const l = JSON.parse(localStorage.programApplications);
        const a = l.find(x => x.ref === 'MY26-0241'); a.status = 'rejected'; a.statusText = 'Belge Uyumsuzluğu / Elendi';
        localStorage.programApplications = JSON.stringify(l);
      });
      await p.goto(U('editor-panel.html'));
      const num = id => p.eval(`Number(document.getElementById(${S(id)}).textContent)`);
      const parts = await Promise.all(['statPendingDocs', 'statPendingScore', 'statCompleted', 'statRejected'].map(num));
      assert.equal(await num('statTotalApps'), 6);
      assert.equal(parts.reduce((a, b) => a + b, 0), 6, `toplam kovaların toplamı olmalı (${parts})`);
      assert.equal(parts[3], 1, 'Elendi sayacı');
      await p.click('.filter-tab[data-filter="rejected"]');
      r = await rows(p);
      assert.deepEqual(r.map(x => `${x.ref}:${x.status}`), ['MY26-0241:Elendi'], 'Elendi ayrı rozet + filtre');
      await p.click('.filter-tab[data-filter="all"]');
      assert.deepEqual((await rows(p)).filter(x => x.jury).map(x => x.ref), ['MY26-0042', 'MY26-0089'], 'Jüri Aday Listesi rozeti');
    });
  });
  await t.test('editor-degerlendirme: rubrik toplamı, kaydet, geri yükle', async () => {
    const path = 'editor-degerlendirme.html?ref=MY26-0089';
    await withPage(path, EDITOR_SEED, async p => {
      assert.equal(await txt(p, '#summaryPreScore'), '24', 'rubrik toplamı 24 (26 değil)');
      assert.match(await txt(p, '#previewPreScore'), /^24\b/);
      assert.equal(await txt(p, '#summaryTotalScore'), '82');
      for (const [q, v] of [[1, 5], [3, 5], [4, 3], [5, 3], [6, 0]]) await p.click(`input[name="rubric_q${q}"][value="${v}"]`);
      assert.equal(await txt(p, '#summaryPreScore'), '21');
      assert.equal(await txt(p, '#summaryTotalScore'), '79');
      await p.click('#btnSaveEvaluation');
      await p.waitForPath('editor-panel.html');
      const rec = (await p.ls('programApplications')).find(a => a.ref === 'MY26-0089');
      assert.deepEqual(rec.rubric, [5, 5, 5, 3, 3, 0], 'Ö2 şahısta otomatik 5');
      assert.equal(rec.totalScore, 79);
      assert.equal(rec.status, 'scored');
      await p.goto(U(path));
      const picked = await p.eval(`[1, 2, 3, 4, 5, 6].map(q => Number(document.querySelector('input[name=rubric_q' + q + ']:checked')?.value))`);
      assert.deepEqual(picked, [5, 5, 5, 3, 3, 0], 'yeniden açınca aynı seçimler');
    });
    for (const bad of ['editor-degerlendirme.html?ref=MY26-9999', 'editor-degerlendirme.html']) {
      await withPage(bad, EDITOR_SEED, async p => {
        assert.match(await txt(p, 'main'), /Başvuru bulunamadı/, bad);
      });
    }
  });
});

// 6 ------------------------------------------------------------------------------------------------
scn(6, 'Güvenlik ve giriş', async t => {
  await t.test('sifre-yenile ?email= XSS enjekte etmez', async () => {
    const payload = '<img src=x onerror=alert(1)>';
    await withPage(`sifre-yenile.html?email=${encodeURIComponent(payload)}`, {}, async p => {
      await sleep(500); // olası onerror için süre tanı
      assert.deepEqual(p.dialogs(), [], 'alert(1) çalışmamalı');
      assert.equal(await txt(p, '#target-account-desc strong'), payload, 'e-posta düz metin olmalı');
      assert.equal(await p.eval(`document.querySelectorAll('img[src="x"]').length`), 0);
    });
  });
  await t.test('giris: "editor" adıyla editör demo davranışı sürüyor', async () => {
    await withPage('giris.html', {}, async p => {
      await p.type('#username', 'editor@mutfaktanyarina.com');
      await p.type('#password', 'Deneme123');
      await p.click('#btn-submit');
      await p.waitForPath('editor-panel.html');
      assert.equal((await p.ls('currentUser')).role, 'editor');
      await p.waitFor('#appsTableBody tr');
    });
  });
});

// 7 ------------------------------------------------------------------------------------------------
scn(7, 'SSS', async () => {
  await withPage('sss.html', {}, async p => {
    assert.equal(await p.eval(`document.querySelectorAll('.faq-question:not(button)').length`), 0, 'başlıklar <button> olmalı');
    await p.type('#inp-search', 'işletmemin');
    const n = await p.eval(`document.querySelectorAll('.faq-card:not(.hidden)').length`);
    assert.ok(n >= 1, '"işletmemin" en az 1 kart bulmalı');
    assert.equal(await txt(p, '#count-total'), String(n));
    const q = '.faq-card:not(.hidden) .faq-question';
    const before = await p.eval(`document.querySelector(${S(q)}).getAttribute('aria-expanded')`);
    await p.click(q);
    const after = await p.eval(`document.querySelector(${S(q)}).getAttribute('aria-expanded')`);
    assert.notEqual(after, before, 'tıklayınca aria-expanded değişmeli');
  });
});

// 8 ------------------------------------------------------------------------------------------------
scn(8, 'Konsol: hiçbir sayfada hata yok', async () => {
  const pages = [
    ['index.html', {}], ['iletisim.html', {}], ['sss.html', {}], ['giris.html', {}], ['kayit.html', {}],
    ['sifre-sifirla.html', {}], ['sifre-yenile.html?email=a%40b.co', {}], ['editor-davet.html', {}],
    ['basvuru.html', WIZARD],
    ['panel.html', { localStorage: { currentUser: APPLICANT, mutfaktan_application: APP } }],
    ['on-degerlendirme-formu.html', { localStorage: preSeed('sirket') }],
    ['editor-panel.html', EDITOR_SEED], ['editor-degerlendirme.html?ref=MY26-0089', EDITOR_SEED]
  ];
  for (const [path, opts] of pages) {
    await withPage(path, opts, () => sleep(300)); // yükleme anı hataları için kısa bekleme
  }
  assert.deepEqual(flowErrors, [], 'konsol hataları (akışlar + sayfa yüklemeleri)');
});

// 9 ------------------------------------------------------------------------------------------------
scn(9, '[hidden] görünmez (08\'e bağlı)', async () => {
  const notHidden = p => p.eval(`Array.from(document.querySelectorAll('[hidden]'))
    .filter(e => getComputedStyle(e).display !== 'none').map(e => e.id || e.tagName)`);
  await withPage('editor-davet.html', {}, async p => {
    assert.equal(await p.eval(`getComputedStyle(document.getElementById('ethicsModal')).display`), 'none', '[08 bekleniyor] #ethicsModal açılışta görünür');
    assert.deepEqual(await notHidden(p), [], '[08 bekleniyor] editor-davet: [hidden] öğeler görünür');
  });
  await withPage('editor-degerlendirme.html?ref=MY26-0089', EDITOR_SEED, async p => {
    assert.equal(await p.eval(`getComputedStyle(document.getElementById('docPreviewModal')).display`), 'none', '[08 bekleniyor] #docPreviewModal açılışta görünür');
    assert.deepEqual(await notHidden(p), [], '[08 bekleniyor] editor-degerlendirme: [hidden] öğeler görünür');
  });
});
