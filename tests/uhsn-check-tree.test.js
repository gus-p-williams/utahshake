// The UHSN data checker as a whole (tools/uhsn-test/check-tree.mjs): it passes the demo folder
// as a folder and as a web address (tools/serve.mjs), and it fails trees and servers that break
// the spec (version 1.1) in the ways DRI's could. The pure checks have their own tests in
// uhsn-check.test.js. No network beyond this computer.
import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { checkTree, FolderTree, WebTree } from '../tools/uhsn-test/check-tree.mjs';

const repo = fileURLToPath(new URL('..', import.meta.url));
const demo = path.join(repo, 'docs/app/data/uhsn-demo/v1');
const skip = fs.existsSync(path.join(demo, 'index.json')) ? false : 'no demo tree';
const GENERATED = Date.parse('2026-11-18T04:10:00.000Z'); // the demo's publish run
const SOON = GENERATED + 10 * 60000;

const texts = (r, level) => r.items(level).map((i) => i.text);
const has = (r, level, re) => texts(r, level).some((t) => re.test(t));

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'uhsn-check-'));
after(() => fs.rmSync(tmp, { recursive: true, force: true }));

/** A copy of the demo folder, changed by mutate(dir). */
function brokenCopy(name, mutate) {
  const dir = path.join(tmp, name);
  fs.cpSync(demo, dir, { recursive: true });
  mutate(dir);
  return dir;
}
const readJson = (dir, rel) => JSON.parse(fs.readFileSync(path.join(dir, rel), 'utf8'));
const writeJson = (dir, rel, obj) => fs.writeFileSync(path.join(dir, rel), JSON.stringify(obj, null, 1));
const DAY321 = 'sds/2026/UU/HEB/EHZ.D/UU.HEB.01.EHZ.D.2026.321';
const DAY322 = 'sds/2026/UU/HEB/EHZ.D/UU.HEB.01.EHZ.D.2026.322';
const AVAIL = 'index/UU.HEB.2026.json';

test('the demo folder passes, with notes only', { skip }, async () => {
  const r = await checkTree(new FolderTree(demo));
  assert.ok(r.passed, JSON.stringify(r.items('FAIL')));
  assert.deepEqual(texts(r, 'WARN'), []);
  assert.ok(has(r, 'NOTE', /a test station/), 'the UU codes are noted, not warned about');
  assert.ok(has(r, 'NOTE', /A folder is a snapshot/));
  const out = r.toText();
  for (const line of ['all 8046 records of the 2 day files checked end at or before', 'seek tables point at the first record']) {
    assert.ok(out.includes(line), line);
  }
  // Judged at a time just after its publish run, the publish step is running.
  const r2 = await checkTree(new FolderTree(demo), { nowMs: SOON, judgePaused: true });
  assert.ok(r2.toText().includes('the publish step is running'));
  const r3 = await checkTree(new FolderTree(demo), { nowMs: GENERATED + 2 * 3600000, judgePaused: true });
  assert.ok(has(r3, 'WARN', /^Data paused/));
});

test('the command line: exit 0 on the demo, 1 on a broken tree, 2 when it cannot run', { skip }, () => {
  const run = (...args) => spawnSync(process.execPath, ['tools/uhsn-test/check-tree.mjs', ...args], { cwd: repo, encoding: 'utf8' });
  const ok = run('docs/app/data/uhsn-demo/v1');
  assert.equal(ok.status, 0, ok.stderr);
  assert.match(ok.stdout, /Result: PASS\. no failures, no warnings/);
  const json = JSON.parse(run('docs/app/data/uhsn-demo/v1', '--json').stdout);
  assert.equal(json.result, 'PASS');
  assert.equal(json.spec, '1.1');
  const broken = brokenCopy('cli', (d) => fs.rmSync(path.join(d, `${DAY322}.json`)));
  const bad = run(broken);
  assert.equal(bad.status, 1);
  assert.match(bad.stdout, /FAIL {2}the day file's sidecar is missing \(404\)/);
  assert.equal(run(path.join(tmp, 'no-such-folder')).status, 2);
  assert.equal(run('docs/app/data/uhsn-demo/v1', '--days', '0').status, 2);
});

test('old status words, and statuses that disagree with publicUntil, fail', { skip }, async () => {
  const dir = brokenCopy('status', (d) => {
    const a = readJson(d, AVAIL);
    a.channels['01.EHZ']['2026-11-17'].status = 'complete';
    a.channels['01.EHZ']['2026-11-18'].status = 'closed'; // ends after publicUntil: still filling
    writeJson(d, AVAIL, a);
    const i = readJson(d, 'index.json');
    i.stations['UU.HEB'].channels['01.EHZ'].status = 'late'; // a 4.8 s lag is current
    writeJson(d, 'index.json', i);
  });
  const r = await checkTree(new FolderTree(dir));
  assert.ok(!r.passed);
  assert.ok(has(r, 'FAIL', /Spec 1\.1 renamed "complete" to "closed"/));
  assert.ok(has(r, 'FAIL', /status is "closed", but the day does not end by publicUntil, so it should be "filling"/));
  assert.ok(has(r, 'FAIL', /status is "late", but publicUntil − lastSample is 4\.8 s, so it should be "current"/));
});

test('a cut-off day file fails, and so do the sidecar and availability line that describe it', { skip }, async () => {
  const dir = brokenCopy('cut', (d) => {
    const f = path.join(d, DAY322);
    fs.truncateSync(f, fs.statSync(f).size - 100);
  });
  const r = await checkTree(new FolderTree(dir));
  assert.ok(has(r, 'FAIL', /only the first \d+ of its \d+ bytes are whole miniSEED records/));
  assert.ok(has(r, 'FAIL', /"records" is 2000; the file has 1999/));
  assert.ok(has(r, 'FAIL', /"bytes" is 1024000; the day file is 1023900 bytes/));
});

test('records past publicUntil, and a day file past it, break the cutoff', { skip }, async () => {
  const dir = brokenCopy('cutoff', (d) => {
    const i = readJson(d, 'index.json');
    i.stations['UU.HEB'].publicUntil = '2026-11-18T03:59:00.000Z'; // a minute before the last records end
    writeJson(d, 'index.json', i);
    // A day file nobody announced, for the day after publicUntil.
    fs.copyFileSync(path.join(d, DAY322), path.join(d, DAY322.replace(/322$/, '323')));
  });
  const r = await checkTree(new FolderTree(dir));
  const cutoff = r.sections.find((s) => s.title.startsWith('The cutoff'));
  assert.ok(cutoff.items.some((i) => i.level === 'FAIL' && /^records end after publicUntil/.test(i.text)));
  assert.ok(has(r, 'FAIL', /lastSample is after publicUntil/));
  assert.ok(has(r, 'FAIL', /answered 200; nothing of that day can be public yet/));
  assert.ok(has(r, 'FAIL', /a day file no availability file announces/));
  assert.ok(has(r, 'FAIL', /a day file without its sidecar/));
});

test('an unconfirmed station must publish nothing; a sharing station shows no more than 3 decimals', { skip }, async () => {
  const dir = brokenCopy('privacy', (d) => {
    const s = readJson(d, 'stations.json');
    s.stations.push({ ...s.stations[0], sta: 'R0001', rsSta: 'R0001', school: 'other', sharing: 'unconfirmed',
      stationXml: 'stations/UU.HEB.xml' });
    s.stations[0].lat = 40.51234;
    writeJson(d, 'stations.json', s);
    const i = readJson(d, 'index.json');
    i.stations['UU.R0001'] = i.stations['UU.HEB'];
    writeJson(d, 'index.json', i);
  });
  const r = await checkTree(new FolderTree(dir));
  assert.ok(has(r, 'FAIL', /an unconfirmed station shows schoolName, lat, lon/));
  assert.ok(has(r, 'FAIL', /an unconfirmed station has public data/));
  assert.ok(has(r, 'FAIL', /"lat" is 40\.51234: more precise than 3 decimals/));
});

// --- As a web address, served by tools/serve.mjs -------------------------------------------

/** Start tools/serve.mjs on a free port, serving docs/app/data. Returns {base, stop}. */
async function serve() {
  const child = spawn(process.execPath, ['tools/serve.mjs', '0', 'docs/app/data'], { cwd: repo });
  const port = await new Promise((resolve, reject) => {
    let out = '';
    child.stdout.on('data', (b) => {
      out += b;
      const m = /127\.0\.0\.1:(\d+)\//.exec(out);
      if (m) resolve(Number(m[1]));
    });
    child.on('exit', (code) => reject(new Error(`serve.mjs exited (${code})`)));
  });
  return { base: `http://127.0.0.1:${port}/uhsn-demo/v1/`, stop: () => child.kill() };
}

test('served by tools/serve.mjs, the demo passes the web rules; only caching warns', { skip }, async () => {
  const server = await serve();
  try {
    const tree = new WebTree(server.base);
    const r = await checkTree(tree, { nowMs: SOON });
    assert.ok(r.passed, JSON.stringify(r.items('FAIL')));
    // serve.mjs sends "no-store" and no ETag on purpose (development); the spec asks for more.
    for (const t of texts(r, 'WARN')) assert.match(t, /Cache-Control|ETag|Last-Modified/);
    const statuses = new Set(tree.answers.map((a) => a.status));
    for (const s of [200, 204, 206, 404, 416]) assert.ok(statuses.has(s), `an answer with ${s}`);
    const passedChecks = r.toJSON().sections.flatMap((s) => s.items).filter((i) => i.level === 'ok').map((i) => i.text);
    for (const want of ['CORS headers on every answer, errors included (answers seen: 200, 204, 206, 404, 416)',
      'a range request steered by the seek table gets 206 and exactly those bytes', 'an impossible range gets 416',
      'OPTIONS (the browser\'s preflight before a Range request) gets 204', 'content types as in the table']) {
      assert.ok(passedChecks.some((t) => t.startsWith(want)), want);
    }

    // A server that forgets CORS on errors and ignores Range: both fail.
    const careless = new WebTree(server.base, {
      fetch: async (url, opts) => {
        const { Range: _r, ...rest } = opts.headers;
        const res = await fetch(url, { ...opts, headers: rest });
        if (res.status === 404) return new Response(null, { status: 404 });
        return res;
      },
    });
    const r2 = await checkTree(careless, { nowMs: SOON });
    assert.ok(!r2.passed);
    assert.ok(r2.items('FAIL').some((i) => /^Access-Control-Allow-Origin is missing/.test(i.text)
      && i.where.some((w) => w.endsWith(': 404'))), 'no CORS on the 404');
    assert.ok(has(r2, 'FAIL', /answered 200 with the whole file instead of 206/));
    assert.ok(has(r2, 'FAIL', /the server answered 200; it should be 416/));
  } finally {
    server.stop();
  }
});
