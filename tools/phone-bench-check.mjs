// Phone Bench check: run the page (docs/app/phone-bench/) in headless Chrome, through its
// made-up phone AND its real code paths, which a phone would take:
//   1. ?source=sample at phone width: the made-up phone's results appear, no script errors,
//      no sideways scroll.
//   2. Real devicemotion events, made by Chrome's own sensor emulation (the DevTools protocol's
//      Emulation.setSensorOverrideReadings, as in DevTools › Sensors). Chrome rounds them to
//      0.1 m/s² exactly as on an Android phone, so the page must report the rounding, about 60
//      readings a second and the taps made by changing the reading.
//   3. The real microphone path (getUserMedia, AudioWorklet) with Chrome's fake microphone.
// Real phones are still the testers' job (iOS Safari can't be run here).
//
//   node tools/phone-bench-check.mjs          (serves docs/ itself; no build needed)
//
// Needs puppeteer-core (once: cd tools/figures && npm install) and Google Chrome (set CHROME=
// if it is not in the default place). Chrome runs with its own temporary profile. Exit 1 on a
// problem. Takes about 30 seconds.
import { createRequire } from 'node:module';
import http from 'node:http';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const DOCS = path.join(ROOT, 'docs');
const puppeteer = createRequire(path.join(ROOT, 'tools/figures/package.json'))('puppeteer-core');
const CHROME = process.env.CHROME || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const TYPES = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.json': 'application/json' };
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

const server = http.createServer((req, res) => {
  let f = path.join(DOCS, decodeURIComponent(new URL(req.url, 'http://x').pathname));
  if (fs.existsSync(f) && fs.statSync(f).isDirectory()) f = path.join(f, 'index.html');
  if (!f.startsWith(DOCS) || !fs.existsSync(f)) { res.writeHead(404); res.end(); return; }
  res.writeHead(200, { 'content-type': TYPES[path.extname(f)] || 'application/octet-stream' });
  fs.createReadStream(f).pipe(res);
}).listen(0, '127.0.0.1');
await new Promise((r) => server.once('listening', r));
// localhost counts as a secure address, so motion and the microphone are allowed.
const BASE = `http://localhost:${server.address().port}/app/phone-bench/`;

const problems = [];
const check = (ok, what) => { console.log(`${ok ? 'ok  ' : 'FAIL'} ${what}`); if (!ok) problems.push(what); };
/** The results table as {label: "value | note"}. */
const results = (page, sel) => page.$$eval(`${sel} tr`, (trs) => Object.fromEntries(trs.map((tr) =>
  [tr.querySelector('th').textContent, tr.querySelector('td').innerText.replace(/\n/g, ' | ')])));

const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'uhsn-bench-check-'));
const browser = await puppeteer.launch({
  executablePath: CHROME, headless: true, userDataDir: profile,
  args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream'],
});
try {
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));

  // 1. The made-up phone, whole take at once.
  await page.setViewport({ width: 390, height: 844 });
  await page.goto(`${BASE}?source=sample`, { waitUntil: 'networkidle2' });
  await wait(300);
  let r = await results(page, '#motion-results');
  check(r['Simulated phone']?.startsWith('Yes'), 'sample: results marked as simulated');
  check(/^Yes/.test(r['Rounding step'] ?? ''), `sample: rounding found (${r['Rounding step']})`);
  check(/^5 /.test(r['Taps seen'] ?? ''), `sample: 5 taps (${r['Taps seen']})`);
  check(Object.keys(await results(page, '#mic-results')).length >= 5, 'sample: microphone results shown');
  check(!(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1)), 'sample: no sideways scroll at 390 px');

  // 2. Real devicemotion events from Chrome's sensor emulation.
  const cdp = await page.createCDPSession();
  const set = (z) => cdp.send('Emulation.setSensorOverrideReadings', { type: 'accelerometer', reading: { xyz: { x: 0.123, y: 0.234, z } } });
  let sensors = true;
  try {
    // devicemotion waits for all three sensors, so each needs a reading.
    for (const type of ['accelerometer', 'linear-acceleration', 'gyroscope']) {
      await cdp.send('Emulation.setSensorOverrideEnabled', { enabled: true, type });
      await cdp.send('Emulation.setSensorOverrideReadings', { type, reading: { xyz: { x: 0, y: 0, z: 0 } } });
    }
    await set(9.81);
  } catch (e) {
    sensors = false;
    console.log(`skip: this Chrome has no sensor emulation (${e.message})`);
  }
  if (sensors) {
    await page.goto(`${BASE}?rest=5&tap=4`, { waitUntil: 'networkidle2' });
    await page.click('#start');
    const t0 = Date.now();
    let taps = 0;
    while (Date.now() - t0 < 12500) {
      const s = (Date.now() - t0) / 1000;
      // Three taps, 1 s apart, in the taps phase (8 to 12 s): z jumps by 0.6 m/s² for 0.15 s.
      const tap = [8.8, 9.8, 10.8].some((x) => s >= x && s < x + 0.15);
      await set(tap ? 10.41 : 9.81 + 0.004 * Math.sin(s * 50));
      if (tap) taps++;
      await wait(25);
    }
    await page.waitForSelector('#motion-results:not([hidden])', { timeout: 5000 }).catch(() => {});
    r = await results(page, '#motion-results');
    if (!Object.keys(r).length) console.log('page status:', await page.$eval('#motion-status', (e) => e.textContent));
    const rate = Number(r['Readings per second']?.split(' ')[0]);
    check(rate > 50 && rate < 70, `device: about 60 readings a second (${r['Readings per second']})`);
    check(/^Yes/.test(r['Rounding step'] ?? ''), `device: Chrome's 0.1 m/s² rounding found (${r['Rounding step']})`);
    check(/z 9\.80/.test(r['Resting values'] ?? ''), `device: resting z 9.80 (${r['Resting values']})`);
    check(/^3 /.test(r['Taps seen'] ?? ''), `device: 3 taps (${r['Taps seen']})`);
  }

  // 3. The real microphone path, with Chrome's fake microphone (a beep).
  await page.click('#mic-start');
  await page.waitForFunction(() => !document.querySelector('#mic-results').hidden, { timeout: 15000 }).catch(() => {});
  r = await results(page, '#mic-results');
  const rate = Number((r['Sample rate'] ?? '').split(' ')[0].replace(/,/g, ''));
  const measured = Number((r['Measured rate'] ?? '').split(' ')[0].replace(/,/g, ''));
  check(rate >= 8000, `microphone: sample rate (${r['Sample rate']})`);
  check(Math.abs(measured - rate) < rate * 0.03, `microphone: measured rate close to it (${r['Measured rate']})`);
  check(/AudioWorklet/.test(r.Meter ?? ''), `microphone: AudioWorklet meter (${r.Meter})`);
  check(errors.length === 0, `no script errors${errors.length ? `: ${errors.join('; ')}` : ''}`);
} finally {
  await browser.close();
  server.close();
  fs.rmSync(profile, { recursive: true, force: true });
}
if (problems.length) { console.log(`${problems.length} problem(s).`); process.exit(1); }
console.log('No problems found.');
