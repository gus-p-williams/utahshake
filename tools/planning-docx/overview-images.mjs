// Two images in the project overview (planning/evaluation.md), made in headless Chrome:
//   arch  planning/img/overview-architecture.png  Figure 4, from overview-architecture.html
//   qw    planning/img/overview-quake-waves.png   Figure 3, Quake Waves 30 s after the quake
// (Figure 1, overview-wave-race.png, is the step 3 screenshot from tools/figures/screenshots.mjs,
// cropped; Figure 2 is a Quake Explorer screenshot.)
//
//   cd tools/figures && npm install       (once: puppeteer-core, uses your installed Chrome)
//   node tools/serve.mjs                  (in another terminal, for qw: serves docs/ on :8001)
//   node tools/planning-docx/overview-images.mjs          (both), or name one: ... arch
//   BASE=http://127.0.0.1:8041 CHROME=/path/to/chrome node ...   for another port or Chrome
import { createRequire } from 'node:module';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const require = createRequire(new URL('../figures/package.json', import.meta.url));
const puppeteer = require('puppeteer-core');
const BASE = process.env.BASE || 'http://127.0.0.1:8001';
const CHROME = process.env.CHROME || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const SHOTS = ['arch', 'qw'];
const wanted = process.argv.length > 2 ? process.argv.slice(2) : SHOTS;
for (const w of wanted) if (!SHOTS.includes(w)) throw new Error(`Unknown image "${w}"; choose from ${SHOTS.join(', ')}`);
const out = (name) => fileURLToPath(new URL(`../../planning/img/${name}`, import.meta.url));
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'uhsn-overview-'));
const browser = await puppeteer.launch({ executablePath: CHROME, headless: true, userDataDir: profile });
try {
  const page = await browser.newPage();
  page.on('pageerror', (e) => console.error('page error:', e.message));
  await page.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: 'light' }]);
  if (wanted.includes('arch')) {
    await page.setViewport({ width: 1320, height: 975, deviceScaleFactor: 2 });
    await page.goto(pathToFileURL(fileURLToPath(new URL('overview-architecture.html', import.meta.url))).href);
    await page.screenshot({ path: out('overview-architecture.png'), clip: { x: 0, y: 0, width: 1320, height: 975 } });
    console.log('wrote planning/img/overview-architecture.png');
  }
  if (wanted.includes('qw')) {
    // 30 s after the quake: S has passed A, C and D and just reached B; circles on, 4x.
    await page.setViewport({ width: 1100, height: 900, deviceScaleFactor: 1.5 });
    await page.goto(`${BASE}/app/quake-waves/`, { waitUntil: 'networkidle0' });
    await page.evaluate(() => {
      const s = document.getElementById('scrub');
      s.value = '30';
      s.dispatchEvent(new Event('input', { bubbles: true }));
    });
    await wait(800);
    await page.mouse.move(2, 2);
    // Cropped just below the seismograms (the page's footer is left out).
    await page.screenshot({ path: out('overview-quake-waves.png'), clip: { x: 0, y: 0, width: 1100, height: 1565 / 1.5 } });
    console.log('wrote planning/img/overview-quake-waves.png');
  }
} finally {
  await browser.close();
  fs.rmSync(profile, { recursive: true, force: true });
}
