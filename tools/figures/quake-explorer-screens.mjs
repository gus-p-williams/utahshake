// Screenshots of Quake Explorer for its guide (docs/apps/img/qe-*.png).
//
//   cd tools/figures && npm install          (once: puppeteer-core, no browser download)
//   node ../serve.mjs                        (in another terminal: serves docs/ on :8001)
//   node quake-explorer-screens.mjs          (all shots), or name some: node quake-explorer-screens.mjs a c
//   BASE=http://127.0.0.1:8041 node quake-explorer-screens.mjs   for another port
//
// Shots (all from the offline samples, so they come out the same every time):
//   choose  qe-choose.png            the quake chooser
//   a       qe-a-record-section.png  Magna M5.7 record section after the reveal (the Pn bend)
//   b       qe-b-spectrogram.png     Junction M3.3 at MTPU: record above its spectrogram
//   c       qe-c-motion.png          Kenilworth M2.7 at TMU after both reveals
//   d       qe-d-distant.png         Sand Point M7.3 at SGU with P and S picked, after the reveal
// Chrome runs headless with its own temporary profile. The map in C needs OpenStreetMap tiles.
import puppeteer from 'puppeteer-core';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { surfaceWaveWindow, distanceDeg } from '../../docs/app/js/lib/teleseism.js';

const BASE = process.env.BASE || 'http://127.0.0.1:8001';
const CHROME = process.env.CHROME || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const SHOTS = ['choose', 'a', 'b', 'c', 'd'];
const wanted = process.argv.length > 2 ? process.argv.slice(2) : SHOTS;
for (const w of wanted) if (!SHOTS.includes(w)) throw new Error(`Unknown shot "${w}"; choose from ${SHOTS.join(', ')}`);
const out = (name) => fileURLToPath(new URL(`../../docs/apps/img/${name}`, import.meta.url));
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const app = (q) => `${BASE}/app/quake-explorer/?source=sample&${q}`;

const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'uhsn-qe-shots-'));
const browser = await puppeteer.launch({ executablePath: CHROME, headless: true, userDataDir: profile });
try {
  const page = await browser.newPage();
  page.on('pageerror', (e) => console.error('page error:', e.message));
  await page.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: 'light' }]);
  await page.setViewport({ width: 1366, height: 900, deviceScaleFactor: 1 });
  // Predictions are kept in localStorage; start each shot clean.
  const open = async (q) => {
    await page.goto(app(q), { waitUntil: 'networkidle0' });
    await page.evaluate(() => localStorage.clear());
    await page.goto(app(q), { waitUntil: 'networkidle0' });
    await wait(1500);
  };
  const shotOf = async (selector, name) => {
    const el = await page.$(selector);
    await el.screenshot({ path: out(name) });
    console.log('wrote', name);
  };

  if (wanted.includes('choose')) {
    await page.setViewport({ width: 1100, height: 700, deviceScaleFactor: 1 });
    await open('');
    await shotOf('#step-quake', 'qe-choose.png');
    await page.setViewport({ width: 1366, height: 900, deviceScaleFactor: 1 });
  }

  if (wanted.includes('a')) {
    await open('event=uu60363602&inv=A');
    await page.click('#a-steps input[value="50"]');
    await page.click('#a-steps [data-part=check]');
    await wait(600);
    await shotOf('#inv-A', 'qe-a-record-section.png');
  }

  if (wanted.includes('b')) {
    await open('event=uu80162166&inv=B');
    await page.mouse.move(5, 5);
    await shotOf('#inv-B', 'qe-b-spectrogram.png');
  }

  if (wanted.includes('c')) {
    await open('event=uu80158051&inv=C');
    await page.click('#c-steps input[value="along"]');
    await page.click('#c-steps [data-part=check]');
    await wait(400);
    await page.click('#c-steps [data-truth]');
    await wait(2500); // map tiles
    await shotOf('#inv-C', 'qe-c-motion.png');
  }

  if (wanted.includes('d')) {
    await open('event=us7000qd1y&inv=D');
    // The record runs from 60 s before the quake to 5 minutes after the surface waves have
    // passed (as in inv-d.js); click at P 6:59 and S 12:45, the times picked in Phase 0.
    const ev = JSON.parse(fs.readFileSync(new URL('../../docs/app/data/samples/qe-sand-point/event.json', import.meta.url)));
    const sgu = JSON.parse(fs.readFileSync(new URL('../../docs/app/data/samples/qe-sand-point/stations.json', import.meta.url)))
      .find((s) => s.sta === 'SGU');
    const end = Math.min(3600, Math.ceil(surfaceWaveWindow(distanceDeg(ev.lat, ev.lon, sgu.lat, sgu.lon)).endSec + 300));
    const box = await page.$eval('#d-trace', (c) => { const r = c.getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height }; });
    const x = (sec) => box.x + ((sec + 60) / (end + 60)) * box.w;
    await page.click('#d-steps input[value="surface"]');
    await page.click('#d-arm-p');
    await page.mouse.click(x(419), box.y + box.h * 0.2);
    await page.click('#d-arm-s');
    await page.mouse.click(x(765), box.y + box.h * 0.5);
    await page.click('#d-steps [data-part=check]');
    await wait(600);
    await page.mouse.move(5, 5);
    await shotOf('#inv-D', 'qe-d-distant.png');
  }
} finally {
  await browser.close();
  fs.rmSync(profile, { recursive: true, force: true });
}
