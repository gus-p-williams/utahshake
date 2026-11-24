// Screenshots of Wave Race for the student guide (docs/apps/img/wave-race-*.png).
//
//   cd tools/figures && npm install          (once: puppeteer-core, no browser download)
//   node ../serve.mjs                        (in another terminal: serves docs/ on :8001)
//   CHROME="C:/Program Files/Google/Chrome/Application/chrome.exe" node screenshots.mjs
//
// Uses the offline sample with the University of Utah analysts' picks pre-loaded
// (stations with both P and S), so the result is the same every time. Runs Chrome
// headless with its own temporary profile; nothing is sent anywhere except the
// OpenStreetMap tiles for the map.
import puppeteer from 'puppeteer-core';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ID = 'uu80162166';
const BASE = process.env.BASE || 'http://127.0.0.1:8001';
const CHROME = process.env.CHROME || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const out = new URL('../../docs/apps/img/', import.meta.url);
const sample = new URL(`../../docs/app/data/samples/${ID}/`, import.meta.url);
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

const picks = {};
for (const p of JSON.parse(fs.readFileSync(new URL('picks.json', sample)))) {
  (picks[`${p.net}.${p.sta}`] ??= {})[p.phase] = p.timeMs;
}
for (const k of Object.keys(picks)) if (picks[k].P == null || picks[k].S == null) delete picks[k];

const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'uhsn-shots-'));
const browser = await puppeteer.launch({ executablePath: CHROME, headless: true, userDataDir: profile });
try {
  const page = await browser.newPage();
  page.on('pageerror', (e) => console.error('page error:', e.message));
  await page.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: 'light' }]);
  await page.setViewport({ width: 1366, height: 900, deviceScaleFactor: 1 });
  await page.goto(`${BASE}/app/wave-race/?source=sample`, { waitUntil: 'networkidle2' });
  await page.evaluate((id, p) => {
    localStorage.clear();
    localStorage.setItem(`uhsn.waveRace.picks.${id}`, JSON.stringify(p));
  }, ID, picks);
  await page.goto(`${BASE}/app/wave-race/?source=sample&event=${ID}`, { waitUntil: 'networkidle2' });
  await page.waitForFunction(() => !document.getElementById('workspace').hidden, { timeout: 60000 });
  await wait(1500);

  // 1. Picking panel: station TCRU, zoomed in around P and S
  await page.click('.station-row[data-key="UU.TCRU"]');
  await wait(400);
  const box = await (await page.$('#picker')).boundingBox();
  await page.mouse.move(box.x + ((9.5 + 10) / 90) * box.width, box.y + box.height / 2);
  await page.mouse.wheel({ deltaY: -500 });
  await wait(150);
  await page.mouse.wheel({ deltaY: -350 });
  await page.focus('#picker');
  await page.keyboard.press('ArrowLeft');
  await page.mouse.move(5, 5);
  const hide = await page.addStyleTag({ content: '#station-list{display:none}.picker-card{align-self:start}' });
  await page.evaluate(() => document.activeElement?.blur());
  await wait(400);
  await (await page.$('.picker-card')).screenshot({ path: fileURLToPath(new URL('wave-race-picker.png', out)) });
  await hide.evaluate((t) => t.remove());
  await wait(300);

  // 2. Locate panel: best fit, plus a guess placed a little to the east; speeds outlined
  await page.click('#locate');
  await wait(800);
  const star = await (await page.$('.map-star.star-student')).boundingBox();
  await page.click('#place-guess');
  await page.mouse.click(star.x + star.width / 2 + 34, star.y + star.height / 2 + 4);
  await page.click('#place-guess');
  await page.addStyleTag({ content: '.locate-controls{outline:3px solid #f59e0b;outline-offset:3px;border-radius:6px}' });
  await page.mouse.move(5, 5);
  await wait(1500);
  await (await page.$('.map-card')).screenshot({ path: fileURLToPath(new URL('wave-race-locate.png', out)) });
  console.log('wrote docs/apps/img/wave-race-picker.png and wave-race-locate.png');
} finally {
  await browser.close();
  fs.rmSync(profile, { recursive: true, force: true });
}
