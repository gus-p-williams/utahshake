// Screenshots of the Phone Bench for its guide (docs/apps/img/pb-*.png), with the made-up
// Android phone (the page's simulate mode), at a phone's width.
//
//   cd tools/figures && npm install          (once: puppeteer-core, no browser download)
//   node ../serve.mjs                        (in another terminal: serves docs/ on :8001)
//   node phone-bench-screens.mjs             (both shots), or name one: node phone-bench-screens.mjs take
//   BASE=http://127.0.0.1:8041 node phone-bench-screens.mjs   for another port
//
// Shots:
//   take     pb-take.png     the motion card during the taps (after the second), label on the plot
//   results  pb-results.png  the motion results after a whole take (?source=sample), 760 px wide
// The made-up phone is seeded, so the numbers come out the same every time; the "Taken" time
// and the browser line change, so they are blanked in the shot. Chrome runs headless with its
// own temporary profile.
import puppeteer from 'puppeteer-core';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const BASE = process.env.BASE || 'http://127.0.0.1:8001';
const CHROME = process.env.CHROME || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const SHOTS = ['take', 'results'];
const wanted = process.argv.length > 2 ? process.argv.slice(2) : SHOTS;
for (const w of wanted) if (!SHOTS.includes(w)) throw new Error(`Unknown shot "${w}"; choose from ${SHOTS.join(', ')}`);
const out = (name) => fileURLToPath(new URL(`../../docs/apps/img/${name}`, import.meta.url));
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'uhsn-pb-shots-'));
const browser = await puppeteer.launch({ executablePath: CHROME, headless: true, userDataDir: profile });
try {
  const page = await browser.newPage();
  page.on('pageerror', (e) => console.error('page error:', e.message));
  await page.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: 'light' }]);
  await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2 });

  if (wanted.includes('take')) {
    // 3 s hands off + 5 s at rest, then taps 1.5 and 3 s into the taps: the made-up phone's
    // clock stops at 11.6 s, after the second tap (?pause, the page's screenshot option).
    await page.goto(`${BASE}/app/phone-bench/?simulate=android&rest=5&pause=11.6`, { waitUntil: 'networkidle0' });
    await page.click('#start');
    await page.waitForFunction(() => /seen 2/.test(document.querySelector('#cue').textContent), { timeout: 10000 });
    await wait(400);
    await (await page.$('#motion-card')).screenshot({ path: out('pb-take.png') });
    console.log('wrote docs/apps/img/pb-take.png');
  }

  if (wanted.includes('results')) {
    await page.setViewport({ width: 760, height: 900, deviceScaleFactor: 1.5 }); // a docs column wide: shorter than a phone
    await page.goto(`${BASE}/app/phone-bench/?source=sample`, { waitUntil: 'networkidle0' });
    await page.waitForSelector('#motion-results:not([hidden])');
    await page.evaluate(() => {
      for (const tr of document.querySelectorAll('#motion-results tr')) {
        const th = tr.querySelector('th').textContent;
        if (th === 'Taken') tr.querySelector('td').textContent = 'Nov 25, 2026, 2:00 PM';
        if (th === 'Browser') tr.querySelector('td').textContent = '(the browser describes itself here)';
      }
    });
    await wait(300);
    await (await page.$('#motion-results')).screenshot({ path: out('pb-results.png') });
    console.log('wrote docs/apps/img/pb-results.png');
  }
} finally {
  await browser.close();
  fs.rmSync(profile, { recursive: true, force: true });
}
