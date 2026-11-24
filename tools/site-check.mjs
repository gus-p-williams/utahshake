// Site check: open every page of the BUILT site in headless Chrome at three widths and report
// problems a reader would notice. Run it before pushing navigation or page changes.
//
//   C:/Users/williagp/anaconda3/Scripts/mkdocs build --strict -d site   (or any folder)
//   node tools/site-check.mjs [site]          (default folder: site/, which git ignores)
//
// Needs puppeteer-core (once: cd tools/figures && npm install) and Google Chrome (set CHROME=
// if it is not in the default place). Chrome runs with its own temporary profile.
//
// Widths: 1366 (desktop), 1093 (a Chromebook with display scaling, below Material's 1220 px
// sidebar breakpoint) and 390 (phone). Pages: every URL in sitemap.xml, plus every app page
// under app/<name>/ (redirect stubs skipped), opened with ?source=sample.
// Fails (exit 1) on: a same-site request that returns 400 or more, a script error, a page
// that scrolls sideways, or an image that doesn't load.
import { createRequire } from 'node:module';
import http from 'node:http';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const puppeteer = createRequire(path.join(ROOT, 'tools/figures/package.json'))('puppeteer-core');
const SITE = path.resolve(process.argv[2] || path.join(ROOT, 'site'));
const CHROME = process.env.CHROME || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const WIDTHS = [[1366, 800], [1093, 614], [390, 844]];
const TYPES = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.mjs': 'text/javascript',
  '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.xml': 'application/xml',
  '.woff2': 'font/woff2', '.mseed': 'application/octet-stream' };

if (!fs.existsSync(path.join(SITE, 'sitemap.xml'))) {
  console.error(`No built site at ${SITE} (sitemap.xml missing). Run mkdocs build first.`);
  process.exit(2);
}

// Pages: sitemap URLs relative to the shortest one (the home page), plus the app pages.
const locs = [...fs.readFileSync(path.join(SITE, 'sitemap.xml'), 'utf8').matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
const home = locs.reduce((a, b) => (a.length <= b.length ? a : b));
const pages = locs.map((l) => '/' + l.slice(home.length));
for (const name of fs.readdirSync(path.join(SITE, 'app'))) {
  const f = path.join(SITE, 'app', name, 'index.html');
  if (fs.existsSync(f) && !fs.readFileSync(f, 'utf8').includes('uhsn-redirect')) pages.push(`/app/${name}/?source=sample`);
}

const server = http.createServer((req, res) => {
  let f = path.join(SITE, decodeURIComponent(new URL(req.url, 'http://x').pathname));
  if (fs.existsSync(f) && fs.statSync(f).isDirectory()) f = path.join(f, 'index.html');
  if (!f.startsWith(SITE) || !fs.existsSync(f)) { res.writeHead(404); res.end(); return; }
  res.writeHead(200, { 'content-type': TYPES[path.extname(f)] || 'application/octet-stream' });
  fs.createReadStream(f).pipe(res);
}).listen(0, '127.0.0.1');
await new Promise((r) => server.once('listening', r));
const BASE = `http://127.0.0.1:${server.address().port}`;

const problems = [];
const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'uhsn-site-check-'));
const browser = await puppeteer.launch({ executablePath: CHROME, headless: true, userDataDir: profile });
try {
  const page = await browser.newPage();
  let current = '';
  page.on('pageerror', (e) => problems.push(`${current}: script error: ${e.message.split('\n')[0]}`));
  page.on('response', (r) => {
    if (r.status() >= 400 && r.url().startsWith(BASE)) problems.push(`${current}: ${r.status()} ${r.url().slice(BASE.length)}`);
  });
  for (const [w, h] of WIDTHS) {
    await page.setViewport({ width: w, height: h });
    for (const p of pages) {
      current = `${w}px ${p}`;
      await page.goto(BASE + p, { waitUntil: 'networkidle2', timeout: 60000 });
      const r = await page.evaluate(async () => {
        const imgs = [...document.images];
        imgs.forEach((i) => { i.loading = 'eager'; });
        await Promise.all(imgs.map((i) => (i.complete ? 0 : new Promise((ok) => { i.onload = i.onerror = ok; }))));
        return {
          sideways: document.documentElement.scrollWidth > innerWidth + 1,
          broken: imgs.filter((i) => i.naturalWidth === 0).map((i) => i.getAttribute('src')),
        };
      });
      if (r.sideways) problems.push(`${current}: page scrolls sideways`);
      for (const src of r.broken) problems.push(`${current}: image does not load: ${src}`);
    }
  }
} finally {
  await browser.close();
  server.close();
  fs.rmSync(profile, { recursive: true, force: true });
}
console.log(`Checked ${pages.length} pages at ${WIDTHS.map(([w]) => w).join(', ')} px.`);
if (problems.length) {
  console.log(`${problems.length} problem(s):\n  ` + problems.join('\n  '));
  process.exit(1);
}
console.log('No problems found.');
