// Arama motoru ve paylaşım meta verisi (statik; tarayıcı gerekmez). Çalıştır: node --test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, existsSync, statSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const pages = readdirSync(ROOT).filter(f => f.endsWith('.html'));
const html = f => readFileSync(resolve(ROOT, f), 'utf8');

// Oturum gerektiren ya da tek kullanımlık akış sayfaları dizine girmez; herkese açık olanlar girer
const PRIVATE = ['panel', 'on-degerlendirme-formu', 'editor-panel', 'editor-degerlendirme', 'editor-davet', 'sifre-sifirla', 'sifre-yenile', 'giris', 'basvuru'];
const PUBLIC = ['index', 'sss', 'hibe-sartlari', 'hibe-yonergesi', 'iletisim', 'kayit'];

test('sayfa listesi bu testte eksiksiz sınıflandırılmış', () => {
  assert.deepEqual(pages.map(f => f.replace('.html', '')).sort(), [...PRIVATE, ...PUBLIC].sort());
});

test('özel sayfalar noindex taşır, herkese açık sayfalar taşımaz', () => {
  for (const n of PRIVATE) assert.match(html(`${n}.html`), /<meta name="robots" content="noindex">/, `${n}: noindex olmalı`);
  for (const n of PUBLIC) assert.doesNotMatch(html(`${n}.html`), /name="robots"/, `${n}: noindex olmamalı`);
});

test('robots.txt var ve taramayı engellemiyor (noindex\'in görülebilmesi için)', () => {
  const t = readFileSync(resolve(ROOT, 'robots.txt'), 'utf8');
  assert.match(t, /^User-agent: \*/m);
  assert.doesNotMatch(t, /^Disallow:\s*\/\s*$/m);
});

test('og:image dosyası var ve 1200x630 önerisine uygun boyda (≤ 300 KB)', () => {
  const m = html('index.html').match(/og:image" content="https:\/\/[^/]+\/(assets\/[^"]+)"/);
  assert.ok(m, 'og:image mutlak URL olmalı');
  const file = resolve(ROOT, m[1]);
  assert.ok(existsSync(file), `${m[1]} yok`);
  assert.ok(statSync(file).size <= 300 * 1024, `${m[1]} çok büyük`);
  assert.match(html('index.html'), /og:image:width" content="1200"/);
  assert.match(html('index.html'), /og:image:height" content="630"/);
});
