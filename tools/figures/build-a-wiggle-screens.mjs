// Screenshots of Build a Wiggle for its guide (docs/apps/img/bw-*.png).
//
//   cd tools/figures && npm install          (once: puppeteer-core, no browser download)
//   node ../serve.mjs                        (in another terminal: serves docs/ on :8001)
//   node build-a-wiggle-screens.mjs          (both shots), or name one: node build-a-wiggle-screens.mjs filter
//   BASE=http://127.0.0.1:8041 node build-a-wiggle-screens.mjs   for another port
//
// Shots (the app uses no data, so they come out the same every time):
//   start   bw-two-notes.png  the app as it opens: the "Two notes" example (2 Hz and 8 Hz)
//   filter  bw-filter.png     "Ocean hum + quake" with Add noise and the 1–10 Hz filter ticked
// The page is 860 px wide, so the three wave cards sit side by side and the shot (the app's
// main area, without the top bar) is about as wide as the docs' text column.
// Chrome runs headless with its own temporary profile.
import puppeteer from 'puppeteer-core';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const BASE = process.env.BASE || 'http://127.0.0.1:8001';
const CHROME = process.env.CHROME || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const SHOTS = ['start', 'filter'];
const wanted = process.argv.length > 2 ? process.argv.slice(2) : SHOTS;
for (const w of wanted) if (!SHOTS.includes(w)) throw new Error(`Unknown shot "${w}"; choose from ${SHOTS.join(', ')}`);
const out = (name) => fileURLToPath(new URL(`../../docs/apps/img/${name}`, import.meta.url));
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'uhsn-bw-shots-'));
const browser = await puppeteer.launch({ executablePath: CHROME, headless: true, userDataDir: profile });
try {
  const page = await browser.newPage();
  page.on('pageerror', (e) => console.error('page error:', e.message));
  await page.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: 'light' }]);
  await page.setViewport({ width: 860, height: 900, deviceScaleFactor: 1 });
  const open = async () => {
    await page.goto(`${BASE}/app/build-a-wiggle/`, { waitUntil: 'networkidle0' });
    await page.waitForFunction(() => document.querySelectorAll('#presets button').length > 0);
    await page.mouse.move(5, 5);
  };
  const preset = (name) => page.$$eval('#presets button', (bs, n) => bs.find((b) => b.textContent === n).click(), name);
  // The line under the controls updates 250 ms after a change.
  const shot = async (name) => {
    await wait(800);
    await (await page.$('main.bw')).screenshot({ path: out(name) });
    console.log('wrote docs/apps/img/' + name);
  };

  if (wanted.includes('start')) {
    await open();
    await shot('bw-two-notes.png');
  }

  if (wanted.includes('filter')) {
    await open();
    await preset('Ocean hum + quake');
    await page.click('#noise');
    await page.click('#filter');
    await page.mouse.move(5, 5);
    await shot('bw-filter.png');
  }
} finally {
  await browser.close();
  fs.rmSync(profile, { recursive: true, force: true });
}
