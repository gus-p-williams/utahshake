// Screenshots of the School Shake Viewer for its guide (docs/apps/img/sv-*.png).
//
//   cd tools/figures && npm install          (once: puppeteer-core, no browser download)
//   node ../serve.mjs                        (in another terminal: serves docs/ on :8001)
//   node shake-viewer-screens.mjs            (all shots), or name some: node shake-viewer-screens.mjs zoom noise
//   BASE=http://127.0.0.1:8041 node shake-viewer-screens.mjs   for another port
//
// Shots (900 px wide, light theme, a fresh browser profile, so the HEB example notes load):
//   day     sv-day.png     the helicorder of HEB on Tue Nov 17, 2026 with the example notes,
//                          before any click (the "Click a line to zoom in" label is bold)
//   zoom    sv-zoom.png    the zoom panel: 12:15-12:17 pm, a burst at 12:16:27 that is not in
//                          the USGS catalog (something near the station), trace and spectrogram
//   noise   sv-noise.png   the hourly noise levels of the same day, 5-20 Hz
//   school  sv-school.png  the same day from the test folder in the UHSN data layout: data from
//                          5 am, "not published yet" after 9 pm
// "day", "zoom" and "noise" read HEB from EarthScope (needs the network); "school" reads the
// bundled test folder. Chrome runs headless with its own temporary profile.
import puppeteer from 'puppeteer-core';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const BASE = process.env.BASE || 'http://127.0.0.1:8001';
const CHROME = process.env.CHROME || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const SHOTS = ['day', 'zoom', 'noise', 'school'];
const wanted = process.argv.length > 2 ? process.argv.slice(2) : SHOTS;
for (const w of wanted) if (!SHOTS.includes(w)) throw new Error(`Unknown shot "${w}"; choose from ${SHOTS.join(', ')}`);
const out = (name) => fileURLToPath(new URL(`../../docs/apps/img/${name}`, import.meta.url));
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const dayShown = () => !document.getElementById('day-cards').hidden;

const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'uhsn-sv-shots-'));
const browser = await puppeteer.launch({ executablePath: CHROME, headless: true, userDataDir: profile });
try {
  const page = await browser.newPage();
  page.on('pageerror', (e) => console.error('page error:', e.message));
  await page.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: 'light' }]);
  await page.setViewport({ width: 900, height: 1000, deviceScaleFactor: 1.5 });
  const shot = async (selector, name) => {
    await wait(500);
    await (await page.$(selector)).screenshot({ path: out(name) });
    console.log(`wrote docs/apps/img/${name}`);
  };

  if (wanted.some((w) => ['day', 'zoom', 'noise'].includes(w))) {
    await page.goto(`${BASE}/app/shake-viewer/?source=uu&station=UU.HEB&date=2026-11-17`, { waitUntil: 'networkidle0', timeout: 120000 });
    await page.waitForFunction(dayShown, { timeout: 120000 });
    if (wanted.includes('day')) await shot('#day-cards > section', 'sv-day.png');
    if (wanted.includes('zoom')) {
      // a 2-minute window at 12:16 pm, chosen with the keyboard: line 25 (12:00), 16 minutes in
      await page.select('#heli-filter', 'bp1-10');
      await page.focus('#heli');
      await page.keyboard.press('Home');
      for (let i = 0; i < 24; i++) await page.keyboard.press('ArrowDown');
      for (let i = 0; i < 16; i++) await page.keyboard.press('ArrowRight');
      await page.keyboard.press('Enter');
      await page.select('#zoom-span', '120');
      await page.evaluate(() => document.activeElement.blur());
      await shot('#zoom-card', 'sv-zoom.png');
    }
    if (wanted.includes('noise')) await shot('#day-cards > section:last-child', 'sv-noise.png');
  }

  if (wanted.includes('school')) {
    await page.goto(`${BASE}/app/shake-viewer/?source=uhsn`, { waitUntil: 'networkidle0', timeout: 60000 });
    await page.waitForFunction(dayShown, { timeout: 60000 });
    await shot('#day-cards > section', 'sv-school.png');
  }
} finally {
  await browser.close();
  fs.rmSync(profile, { recursive: true, force: true });
}
