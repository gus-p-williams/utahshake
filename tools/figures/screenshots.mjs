// Screenshots of Quake Locator for the student guide (docs/apps/img/wave-race-*.png).
//
//   cd tools/figures && npm install          (once: puppeteer-core, no browser download)
//   node ../serve.mjs                        (in another terminal: serves docs/ on :8001)
//   node screenshots.mjs                     (all shots), or name some: node screenshots.mjs choose
//   CHROME="/path/to/chrome" node screenshots.mjs   if Chrome is not in the default place
//
// Shots:
//   choose  wave-race-choose.png  step 1: the quake list (live USGS data; it changes daily)
//   picker  wave-race-picker.png  step 2: the picking panel, station TCRU, zoomed in
//   locate  wave-race-locate.png  step 3: circles, a placed guess, the best fit, speeds outlined
// picker and locate use the offline sample with the University of Utah analysts' picks
// pre-loaded (stations with both P and S), so they come out the same every time. Chrome runs
// headless with its own temporary profile; nothing is sent anywhere except the data and map
// tile requests the app itself makes.
import puppeteer from 'puppeteer-core';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ID = 'uu80162166';
const BASE = process.env.BASE || 'http://127.0.0.1:8001';
const CHROME = process.env.CHROME || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const SHOTS = ['choose', 'picker', 'locate'];
const wanted = process.argv.length > 2 ? process.argv.slice(2) : SHOTS;
for (const w of wanted) if (!SHOTS.includes(w)) throw new Error(`Unknown shot "${w}"; choose from ${SHOTS.join(', ')}`);
const out = new URL('../../docs/apps/img/', import.meta.url);
const outPath = (name) => fileURLToPath(new URL(name, out));
const sample = new URL(`../../docs/app/data/samples/${ID}/`, import.meta.url);
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const OUTLINE = 'outline:3px solid #f59e0b;outline-offset:2px;border-radius:6px';

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

  if (wanted.includes('choose')) {
    // Step 1: the live quake list, narrower so it stays readable at the docs' width.
    // The ★ column and "Use the offline sample" are outlined.
    await page.setViewport({ width: 900, height: 900, deviceScaleFactor: 1 });
    await page.goto(`${BASE}/app/wave-race/`, { waitUntil: 'networkidle2' });
    await page.waitForFunction(() => document.querySelectorAll('#event-table tbody tr').length > 0, { timeout: 60000 })
      .catch(() => { throw new Error('The live quake list did not load (USGS blocked or offline?)'); });
    await page.evaluate((outline) => {
      const star = [...document.querySelectorAll('#event-table td.near')].find((td) => td.textContent.trim());
      if (star) star.style.cssText += outline;
      document.getElementById('source-switch').style.cssText += outline;
    }, OUTLINE);
    await page.mouse.move(5, 890);
    await wait(500);
    const top = await (await page.$('.topbar')).boundingBox();
    const card = await (await page.$('#step-quake')).boundingBox();
    await page.screenshot({ path: outPath('wave-race-choose.png'),
      clip: { x: 0, y: top.y, width: 900, height: card.y + card.height + 12 - top.y } });
    console.log('wrote docs/apps/img/wave-race-choose.png');
  }

  if (wanted.includes('picker') || wanted.includes('locate')) {
    await page.setViewport({ width: 1366, height: 900, deviceScaleFactor: 1 });
    await page.goto(`${BASE}/app/wave-race/?source=sample`, { waitUntil: 'networkidle2' });
    await page.evaluate((id, p) => {
      localStorage.clear();
      localStorage.setItem(`uhsn.waveRace.picks.${id}`, JSON.stringify(p));
    }, ID, picks);
    await page.goto(`${BASE}/app/wave-race/?source=sample&event=${ID}`, { waitUntil: 'networkidle2' });
    await page.waitForFunction(() => !document.getElementById('workspace').hidden, { timeout: 60000 });
    await wait(1500);
  }

  if (wanted.includes('picker')) {
    // Step 2: picking panel, station TCRU, zoomed in around P and S
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
    await (await page.$('.picker-card')).screenshot({ path: outPath('wave-race-picker.png') });
    await hide.evaluate((t) => t.remove());
    await wait(300);
    console.log('wrote docs/apps/img/wave-race-picker.png');
  }

  if (wanted.includes('locate')) {
    // Step 3: best fit, plus a guess placed a little to the east; speeds outlined
    await page.click('#locate');
    await wait(800);
    const star = await (await page.$('.map-star.star-student')).boundingBox();
    await page.click('#place-guess');
    await page.mouse.click(star.x + star.width / 2 + 34, star.y + star.height / 2 + 4);
    await page.click('#place-guess');
    await page.addStyleTag({ content: `.locate-controls{${OUTLINE.replace('2px', '3px')}}` });
    await page.mouse.move(5, 5);
    await wait(1500);
    await (await page.$('.map-card')).screenshot({ path: outPath('wave-race-locate.png') });
    console.log('wrote docs/apps/img/wave-race-locate.png');
  }
} finally {
  await browser.close();
  fs.rmSync(profile, { recursive: true, force: true });
}
