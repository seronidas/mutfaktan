// Bağımlılıksız Chrome DevTools Protocol yardımcısı (Node 22 global WebSocket + google-chrome).
// Kullanım: import { serve, open, shutdown } from './lib/cdp.mjs'
// Kabuk:    node tests/lib/cdp.mjs shot <url|sayfa.html> <out.png> [genişlik] [--ls '{"currentUser":{...}}']
import { spawn } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const CHROME = process.env.CHROME_BIN || '/usr/bin/google-chrome';
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const sleep = ms => new Promise(r => setTimeout(r, ms));

// Bekçi: bu süreç SIGKILL/boru kapanması gibi nedenlerle aniden ölse bile hedefi (pid; süreç grubu için -pgid) ve geçici klasörü temizler.
function guard(target, dir = '') {
  const sh = `while kill -0 ${process.pid} 2>/dev/null; do sleep 1; done; kill -9 -- ${target} 2>/dev/null; [ -z "${dir}" ] || rm -rf "${dir}"`;
  spawn('sh', ['-c', sh], { detached: true, stdio: 'ignore' }).unref();
}

// ---- Yerel statik sunucu (python http.server; boş port, çocuk süreç) ----
export async function serve(root = process.env.E2E_ROOT || ROOT) { // E2E_ROOT: siteyi başka bir klasörden (ör. kopya) sına
  const proc = spawn('python3', ['-u', '-m', 'http.server', process.env.E2E_PORT || '0', '--bind', '127.0.0.1'],
    { cwd: root, stdio: ['ignore', 'pipe', 'ignore'] });
  const port = await new Promise((res, rej) => {
    proc.on('error', rej);
    proc.stdout.on('data', d => { const m = /port (\d+)/.exec(String(d)); if (m) res(m[1]); });
    setTimeout(() => rej(new Error('http.server başlamadı')), 5000);
  });
  process.on('exit', () => proc.kill());
  guard(proc.pid);
  return { url: `http://127.0.0.1:${port}`, stop: () => proc.kill() };
}

// ---- Tek Chrome süreci, tek tarayıcı WebSocket'i, düz oturumlar ----
let browser;
async function launch() {
  if (browser) return browser;
  const dir = mkdtempSync(join(tmpdir(), 'cdp-'));
  const args = ['--headless=new', '--remote-debugging-port=0', `--user-data-dir=${dir}`, '--no-first-run',
    '--no-default-browser-check', '--disable-extensions', '--disable-gpu', '--hide-scrollbars', 'about:blank'];
  if (process.getuid?.() === 0) args.push('--no-sandbox');
  const proc = spawn(CHROME, args, { stdio: 'ignore', detached: true }); // ayrı süreç grubu: crashpad dahil tümü birlikte kapatılır
  const killGroup = () => { try { process.kill(-proc.pid, 'SIGKILL'); } catch {} };
  guard(`-${proc.pid}`, dir);
  const file = join(dir, 'DevToolsActivePort');
  let info;
  for (let i = 0; i < 100 && !info; i++) {
    await sleep(100);
    const [port, path] = existsSync(file) ? readFileSync(file, 'utf8').trim().split('\n') : [];
    if (path) info = { port, path };
  }
  if (!info) { killGroup(); throw new Error('Chrome uzaktan hata ayıklama portu açmadı'); }
  const ws = new WebSocket(`ws://127.0.0.1:${info.port}${info.path}`);
  await new Promise((res, rej) => { ws.onopen = res; ws.onerror = () => rej(new Error('CDP bağlantısı kurulamadı')); });
  const pending = new Map(), sessions = new Map();
  let seq = 0;
  ws.onmessage = ({ data }) => {
    const m = JSON.parse(data);
    if (m.id) {
      const p = pending.get(m.id); pending.delete(m.id);
      if (p) m.error ? p.rej(new Error(`${p.method}: ${m.error.message}`)) : p.res(m.result);
    } else sessions.get(m.sessionId)?.(m.method, m.params);
  };
  const send = (method, params = {}, sessionId) => new Promise((res, rej) => {
    const id = ++seq;
    pending.set(id, { res, rej, method });
    ws.send(JSON.stringify({ id, method, params, sessionId }));
  });
  process.on('exit', () => { killGroup(); rmSync(dir, { recursive: true, force: true }); });
  for (const sig of ['SIGINT', 'SIGTERM']) process.on(sig, () => process.exit(1)); // 'exit' temizliğini tetikle
  browser = { proc, dir, send, sessions, killGroup };
  return browser;
}

export async function shutdown() {
  if (!browser) return;
  const { proc, dir, send, killGroup } = browser;
  browser = null;
  const exited = new Promise(r => proc.once('exit', r));
  await send('Browser.close').catch(() => {});
  await Promise.race([exited, sleep(3000)]);
  killGroup();
  rmSync(dir, { recursive: true, force: true });
}

// ---- Sayfa nesnesi ----
// open(url, { width, height, localStorage: {k: v}, now: '2026-10-20T12:00:00' })
// localStorage tohumu ve sahte saat, sayfa betiklerinden ÖNCE ve yalnızca ilk belgede uygulanır
// (sonraki yönlendirmelerde sayfanın kendi yazdığı veri ezilmez). Her sayfa yalıtılmış bir tarayıcı bağlamıdır.
export async function open(url, { width = 1280, height = 900, localStorage: seed, now } = {}) {
  const b = await launch();
  const { browserContextId } = await b.send('Target.createBrowserContext');
  const { targetId } = await b.send('Target.createTarget', { url: 'about:blank', browserContextId });
  const { sessionId } = await b.send('Target.attachToTarget', { targetId, flatten: true });
  const cmd = (m, p) => b.send(m, p, sessionId);
  const errors = [], dialogs = [], waiters = [];

  b.sessions.set(sessionId, (method, p) => {
    if (method === 'Runtime.exceptionThrown') errors.push(p.exceptionDetails.exception?.description || p.exceptionDetails.text);
    else if (method === 'Runtime.consoleAPICalled' && p.type === 'error') errors.push(p.args.map(a => a.value ?? a.description).join(' '));
    else if (method === 'Log.entryAdded' && p.entry.level === 'error') errors.push(`${p.entry.text} ${p.entry.url || ''}`.trim());
    else if (method === 'Page.javascriptDialogOpening') {
      dialogs.push({ type: p.type, message: p.message });
      cmd('Page.handleJavaScriptDialog', { accept: true }).catch(() => {});
    }
    waiters.filter(w => w.method === method).forEach(w => w.res());
  });
  const once = method => new Promise(res => waiters.push({ method, res }));

  await Promise.all(['Page', 'Runtime', 'Log'].map(d => cmd(`${d}.enable`)));
  await cmd('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: false });
  const init = `(() => { try {
    if (location.protocol === 'about:' || sessionStorage.getItem('__cdp')) return;
    sessionStorage.setItem('__cdp', '1'); localStorage.clear();
    const seed = ${JSON.stringify(seed || {})};
    for (const k in seed) localStorage.setItem(k, typeof seed[k] === 'string' ? seed[k] : JSON.stringify(seed[k]));
    const now = ${JSON.stringify(now || null)};
    if (now) {
      const Real = Date, off = Real.parse(now) - Real.now();
      window.Date = class extends Real {
        constructor(...a) { a.length ? super(...a) : super(Real.now() + off); }
        static now() { return Real.now() + off; }
      };
    }
  } catch (e) {} })();`;
  await cmd('Page.addScriptToEvaluateOnNewDocument', { source: init });

  const evaluate = async (expr, ...args) => {
    const expression = typeof expr === 'function' ? `(${expr})(${args.map(a => JSON.stringify(a)).join(',')})` : expr;
    const r = await cmd('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
    if (r.exceptionDetails) throw new Error(`eval hatası: ${r.exceptionDetails.exception?.description || r.exceptionDetails.text}`);
    return r.result.value;
  };
  const q = sel => `document.querySelector(${JSON.stringify(sel)})`;

  const page = {
    eval: evaluate,
    async goto(u) {
      const loaded = once('Page.loadEventFired');
      const r = await cmd('Page.navigate', { url: u });
      if (r.errorText) throw new Error(`${r.errorText}: ${u}`);
      await loaded;
    },
    // DOM .click(): gizli/özel biçimli girdilerde de çalışır; disabled öğeye tıklamak (gerçekteki gibi) etkisizdir.
    click: sel => evaluate(`(() => { const e = ${q(sel)}; if (!e) throw new Error('bulunamadı: ' + ${JSON.stringify(sel)}); e.click(); })()`),
    // Ham CDP çağrısı (ör. 'Page.printToPDF', 'Emulation.setEmulatedMedia').
    cdp: (method, params) => cmd(method, params),
    // Gerçek fare: öğeyi görünüme kaydırır, merkezine imleç taşır (:hover eşleşir). sel=null → imleci köşeye alır.
    async hover(sel) {
      const [x, y] = sel ? await evaluate(`(() => { const e = ${q(sel)}; if (!e) throw new Error('bulunamadı: ' + ${JSON.stringify(sel)});
        e.scrollIntoView({ block: 'center', inline: 'center', behavior: 'instant' }); const r = e.getClientRects()[0] || e.getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; })()`) : [0, 0]; // satıra sarılan satır içi öğede ilk parça
      await cmd('Input.dispatchMouseEvent', { type: 'mouseMoved', x, y });
    },
    // Gerçek klavye: key = 'Tab' | 'Escape' | 'Enter' | ' ' …; opts.shift Shift+Tab için. Odak halkası (:focus-visible) klavye ile açılır.
    async key(key, { shift = false } = {}) {
      const codes = { Tab: 9, Escape: 27, Enter: 13, ' ': 32, ArrowDown: 40, ArrowUp: 38 };
      const base = { key, code: key === ' ' ? 'Space' : key, windowsVirtualKeyCode: codes[key] || key.toUpperCase().charCodeAt(0), modifiers: shift ? 8 : 0 };
      await cmd('Input.dispatchKeyEvent', { type: 'keyDown', ...base, text: key === 'Enter' ? '\r' : key === ' ' ? ' ' : undefined });
      await cmd('Input.dispatchKeyEvent', { type: 'keyUp', ...base });
    },
    // input/textarea/select değerini yerleşik setter ile yazar; input + change olaylarını tetikler.
    type: (sel, text) => evaluate(`(() => { const e = ${q(sel)}; if (!e) throw new Error('bulunamadı: ' + ${JSON.stringify(sel)});
      e.focus(); Object.getOwnPropertyDescriptor(Object.getPrototypeOf(e), 'value').set.call(e, ${JSON.stringify(String(text))});
      e.dispatchEvent(new Event('input', { bubbles: true })); e.dispatchEvent(new Event('change', { bubbles: true })); })()`),
    // Sahte dosya: diske yazmadan, sayfada File nesnesi kurup input.files'a atar (size bayt).
    setFile: (sel, { name, size = 1024, type = '' }) => evaluate((s, n, z, t) => {
      const input = document.querySelector(s), dt = new DataTransfer();
      dt.items.add(new File([new Uint8Array(z)], n, { type: t }));
      input.files = dt.files;
      input.dispatchEvent(new Event('change', { bubbles: true }));
    }, sel, name, size, type),
    async waitFor(target, ms = 5000, ...args) { // target: CSS seçici (metin) ya da sayfada çalışan işlev
      const end = Date.now() + ms;
      const cond = typeof target === 'function' ? target : `!!${q(target)}`;
      let last;
      while (Date.now() < end) {
        try { if (await evaluate(cond, ...args)) return; } catch (e) { last = e; } // gezinme sırasında bağlam kaybolabilir
        await sleep(50);
      }
      const at = await evaluate('location.href').catch(() => '?');
      throw new Error(`waitFor zaman aşımı (${ms} ms): ${target} @ ${at} ${last ? '— ' + last.message : ''}${errors.length ? ' — son konsol hatası: ' + errors.at(-1).split('\n')[0] : ''}`);
    },
    waitForPath: (path, ms = 6000) => page.waitFor(p => location.pathname.endsWith(p) && document.readyState === 'complete', ms, path),
    // Gerçekten görünür mü: display/visibility ve ölçülü kutu (üst öğe gizliyse de false).
    visible: sel => evaluate(`(() => { const e = ${q(sel)}; if (!e) return false; const s = getComputedStyle(e), r = e.getBoundingClientRect();
      return s.display !== 'none' && s.visibility !== 'hidden' && r.width > 0 && r.height > 0; })()`),
    ls: key => evaluate(`JSON.parse(localStorage.getItem(${JSON.stringify(key)}))`),
    async screenshot(path, { full = true } = {}) {
      await evaluate('document.fonts ? document.fonts.ready.then(() => 1) : 1');
      const m = await cmd('Page.getLayoutMetrics');
      const { width: w, height: h } = m.cssContentSize || m.contentSize;
      const clip = full ? { x: 0, y: 0, width: w, height: Math.min(h, 16000), scale: 1 } : undefined;
      const { data } = await cmd('Page.captureScreenshot', { format: 'png', captureBeyondViewport: full, clip });
      writeFileSync(path, Buffer.from(data, 'base64'));
    },
    consoleErrors: () => [...errors],
    dialogs: () => [...dialogs],
    async close() {
      b.sessions.delete(sessionId);
      await b.send('Target.disposeBrowserContext', { browserContextId }).catch(() => {});
    }
  };
  await page.goto(url);
  return page;
}

// ---- Kabuk: node tests/lib/cdp.mjs shot <url|sayfa.html> <out.png> [genişlik] [--ls json] ----
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const argv = process.argv.slice(2);
  const i = argv.indexOf('--ls');
  const ls = i >= 0 ? JSON.parse(argv.splice(i, 2)[1]) : undefined;
  const [cmdName, target, out, width] = argv;
  if (cmdName !== 'shot' || !target || !out) {
    console.error('Kullanım: node tests/lib/cdp.mjs shot <url|sayfa.html> <out.png> [genişlik] [--ls \'{"currentUser":{"role":"applicant"}}\']');
    process.exit(2);
  }
  const srv = /^https?:\/\//.test(target) ? null : await serve();
  const page = await open(srv ? `${srv.url}/${target.replace(/^\//, '')}` : target, { width: Number(width) || 1280, localStorage: ls });
  await sleep(300);
  await page.screenshot(out);
  console.log(`${out} yazıldı`);
  await page.close();
  await shutdown();
  srv?.stop();
  process.exit(0);
}
