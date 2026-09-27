import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const S = require('../scoring.js');

const base = { biztype: 'sahis', q11: 2, q12: 2, q13: 2, q14: 'none', q15: 'yes', q21: 'yes', q22: ['mutfak', 'istihdam'] };

// Md senaryoları
const scenarios = [
  { name: 'Ayşe', a: base, part1: 32.5, part2: 20, total: 52.5 },
  { name: 'Fatma', a: { biztype: 'sirket', q11: 12, q12: 3, q13: 11, q14: 'less_half', q15: 'yes', q21: 'no', q22: ['masa', 'dekorasyon'] }, part1: 23, part2: 9, total: 32 },
  { name: 'Zeynep', a: { biztype: 'sahis', q11: 3, q12: 3, q13: 2, q14: 'all', q15: 'no', q21: 'yes', q22: ['mutfak', 'istihdam'] }, part1: 38, part2: 20, total: 58 },
  { name: 'Hatice', a: { biztype: 'sirket', q11: 20, q12: 15, q13: 17, q14: 'all', q15: 'yes', q21: 'no', q22: ['mutfak', 'tanitim'] }, part1: 45, part2: 9, total: 54 },
  { name: 'Emine', a: { biztype: 'sahis', q11: 8, q12: 2, q13: 9, q14: 'zero', q15: 'yes', q21: 'yes', q22: ['borc', 'dekorasyon'] }, part1: 10, part2: 14, total: 24 },
  { name: 'Gül Koop.', a: { biztype: 'kooperatif', q11: 6, q12: 6, q13: 4, q14: 'all', q15: 'yes', q21: 'no', q22: ['mutfak', 'masa'] }, part1: 46, part2: 20, total: 66 }
];

for (const s of scenarios) {
  test('systemScore senaryosu: ' + s.name, () => {
    const r = S.systemScore(s.a);
    assert.equal(r.part1, s.part1);
    assert.equal(r.part2, s.part2);
    assert.equal(r.total, s.total);
    assert.deepEqual(Object.keys(r.items).sort(), ['q12', 'q13', 'q14', 'q15', 'q21', 'q22']);
  });
}

test('q12 bir ondalığa yuvarlanır (1/3 -> 6.7)', () => {
  assert.equal(S.systemScore({ ...base, q11: 3, q12: 1, q13: 3 }).items.q12, 6.7);
});

test('q12 toplam 0 ise 0', () => {
  assert.equal(S.systemScore({ ...base, q11: 0, q12: 0, q13: 0 }).items.q12, 0);
});

test('q13 Δ = q11 - q13 basamakları', () => {
  const q13 = (delta) => S.systemScore({ ...base, q11: 10, q13: 10 - delta }).items.q13;
  assert.equal(q13(-1), 0);
  assert.equal(q13(0), 4);
  assert.equal(q13(1), 8);
  assert.equal(q13(2), 11);
  assert.equal(q13(3), 15);
  assert.equal(q13(5), 15);
});

test('q14 tüm değerler', () => {
  const q14 = (v) => S.systemScore({ ...base, q14: v }).items.q14;
  assert.equal(q14('none'), 3.5);
  assert.equal(q14('zero'), 0);
  assert.equal(q14('less_half'), 5);
  assert.equal(q14('half_more'), 7);
  assert.equal(q14('all'), 10);
});

test('q21: kooperatif her zaman 8', () => {
  assert.equal(S.systemScore({ ...base, biztype: 'kooperatif', q21: 'no' }).items.q21, 8);
  assert.equal(S.systemScore({ ...base, biztype: 'sirket', q21: 'no' }).items.q21, 0);
  assert.equal(S.systemScore({ ...base, biztype: 'sirket', q21: 'yes' }).items.q21, 8);
});

test('q22: 1 ya da 3 seçim hata', () => {
  assert.throws(() => S.systemScore({ ...base, q22: ['mutfak'] }));
  assert.throws(() => S.systemScore({ ...base, q22: ['mutfak', 'masa', 'istihdam'] }));
  assert.throws(() => S.systemScore({ ...base, q22: [] }));
  assert.throws(() => S.systemScore({ ...base, q22: undefined }));
});

test('q22: bilinmeyen ya da tekrarlı seçim hata; en yüksek toplam 12', () => {
  assert.throws(() => S.systemScore({ ...base, q22: ['mutfak', 'yok'] }));
  assert.throws(() => S.systemScore({ ...base, q22: ['mutfak', 'mutfak'] }));
  assert.equal(S.systemScore({ ...base, q22: ['istihdam', 'masa'] }).items.q22, 12);
});

test('bilinmeyen q14 hata (sessiz 0 yok)', () => {
  assert.throws(() => S.systemScore({ ...base, q14: 'bilinmeyen' }));
  assert.throws(() => S.systemScore({ ...base, q14: undefined }));
});

test('bilinmeyen q15, q21 ve biztype hata', () => {
  assert.throws(() => S.systemScore({ ...base, q15: 'belki' }));
  assert.throws(() => S.systemScore({ ...base, q21: 'belki' }));
  assert.throws(() => S.systemScore({ ...base, biztype: 'anonim' }));
});

test('isAgeEligible (bugün 2026-10-12)', () => {
  const today = '2026-10-12';
  assert.equal(S.isAgeEligible('2008-10-12', today), true);
  assert.equal(S.isAgeEligible('2008-10-13', today), false);
  assert.equal(S.isAgeEligible('1996-12-31', today), false);
  assert.equal(S.isAgeEligible('1997-01-01', today), true);
  assert.equal(S.isAgeEligible('abc', today), false);
});

test('isAgeEligible: geçersiz takvim günü, gelecek tarih, boş değer', () => {
  const today = '2026-10-12';
  assert.equal(S.isAgeEligible('2000-02-30', today), false);
  assert.equal(S.isAgeEligible('2030-01-01', today), false);
  assert.equal(S.isAgeEligible('', today), false);
  assert.equal(S.isAgeEligible(undefined, today), false);
  assert.equal(S.isAgeEligible(null, today), false);
});

test('isAgeEligible: todayISO verilmezse bugünü kullanır', () => {
  assert.equal(S.isAgeEligible('1990-01-01'), false);
  const year = new Date().getFullYear();
  assert.equal(S.isAgeEligible(`${year - 19}-01-01`), true);   // 19 yaşında
  assert.equal(S.isAgeEligible(`${year - 10}-01-01`), false);  // 10 yaşında
});

test('preTotal ve totalPre', () => {
  assert.equal(S.preTotal([5, 5, 5, 5, 5, 5]), 30);
  assert.equal(S.preTotal([0, 0, 0, 0, 0, 0]), 0);
  assert.equal(S.preTotal([5, 3, 0, 3, 5, 1]), 17);
  assert.throws(() => S.preTotal([5, 5, 5, 5, 5]));
  assert.throws(() => S.preTotal([6, 0, 0, 0, 0, 0]));
  assert.throws(() => S.preTotal([-1, 0, 0, 0, 0, 0]));
  assert.equal(S.totalPre(52.5, 30), 82.5);
  assert.equal(S.totalPre(70, 30), 100);
  assert.equal(S.totalPre(0, 0), 0);
  assert.throws(() => S.totalPre(71, 0));
  assert.throws(() => S.totalPre(50, 31));
});

function makeApps(scores) {
  return scores.map((totalScore, i) => ({ ref: 'A' + (i + 1), totalScore }));
}

test('juryCandidates: 25. ve 26. aynı puan -> 26 döner', () => {
  // 30 kayıt: 24 farklı üst puan, 25.-26. eşit, kalanı düşük
  const scores = [];
  for (let i = 0; i < 24; i++) scores.push(99 - i);
  scores.push(70, 70, 60, 59, 58, 57);
  const out = S.juryCandidates(makeApps(scores));
  assert.equal(scores.length, 30);
  assert.equal(out.length, 26);
  assert.ok(out.every((a) => a.totalScore >= 70));
});

test('juryCandidates: 25. ile 26. farklı -> tam 25', () => {
  const scores = [];
  for (let i = 0; i < 25; i++) scores.push(99 - i);
  scores.push(50, 49, 48, 47, 46);
  const out = S.juryCandidates(makeApps(scores));
  assert.equal(out.length, 25);
  assert.equal(out[24].totalScore, 75);
});

test('juryCandidates: azalan sıralı; null puanlılar dışarıda', () => {
  const apps = [
    { ref: 'x', totalScore: 40 },
    { ref: 'y', totalScore: null },
    { ref: 'z', totalScore: 90 },
    { ref: 'w' },
    { ref: 'v', totalScore: 65.5 }
  ];
  const out = S.juryCandidates(apps);
  assert.deepEqual(out.map((a) => a.ref), ['z', 'v', 'x']);
});

test('juryCandidates: null puanlılar 25 kontenjanına sayılmaz', () => {
  const apps = makeApps(Array.from({ length: 25 }, (_, i) => 80 - i));
  for (let i = 0; i < 5; i++) apps.push({ ref: 'N' + i, totalScore: null });
  const out = S.juryCandidates(apps);
  assert.equal(out.length, 25);
  assert.ok(out.every((a) => a.totalScore !== null));
});

test('juryCandidates: 25 ve altı kayıt hepsi döner; boş girdi', () => {
  assert.equal(S.juryCandidates(makeApps([10, 20, 30])).length, 3);
  assert.deepEqual(S.juryCandidates([]), []);
});

test('juryCandidates: 25. sıradaki puanla eşit olan çok sayıda aday hepsi dahil', () => {
  const scores = [];
  for (let i = 0; i < 20; i++) scores.push(90 - i);
  for (let i = 0; i < 8; i++) scores.push(60);
  scores.push(10, 5);
  const out = S.juryCandidates(makeApps(scores));
  assert.equal(out.length, 28);
});

test('modül API imzaları', () => {
  for (const fn of ['systemScore', 'isAgeEligible', 'preTotal', 'totalPre', 'juryCandidates']) {
    assert.equal(typeof S[fn], 'function', fn);
  }
});
