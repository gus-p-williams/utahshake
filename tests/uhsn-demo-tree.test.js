// A small checker for the demo public tree the School Shake viewer ships
// (docs/app/data/uhsn-demo/v1/, made by tools/uhsn-test/make-tree.mjs --demo): is it laid
// out and described as the UHSN data specification says (draft 0.2, sections 5.4, 7.1 and
// 7.3 to 7.7)? The same checks are the seed of the checker DRI will run against its server.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  scanRecords, describeDay, gapTotals, sdsPath, nslc, isoDay, utcDayStart,
} from '../docs/app/js/lib/mseed-index.js';

const root = fileURLToPath(new URL('../docs/app/data/uhsn-demo/v1/', import.meta.url));
const present = fs.existsSync(path.join(root, 'index.json'));
const skip = present ? false : 'no demo tree (run: node tools/uhsn-test/make-tree.mjs --demo)';
const json = (rel) => JSON.parse(fs.readFileSync(path.join(root, rel), 'utf8'));
const DAY = 86400000;
const TIME = /^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/;
const DATE = /^\d{4}-\d\d-\d\d$/;
const isTime = (v) => typeof v === 'string' && TIME.test(v) && !Number.isNaN(Date.parse(v));
const isDate = (v) => typeof v === 'string' && DATE.test(v);

function walk(dir, base = '') {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => (
    e.isDirectory() ? walk(path.join(dir, e.name), `${base}${e.name}/`) : [`${base}${e.name}`]));
}
const files = present ? walk(root) : [];
const dayFiles = files.filter((f) => f.startsWith('sds/') && !f.endsWith('.json'));

/** {net, sta, loc, cha, dayMs} from a day file's path, or null if it breaks the 7.1 pattern. */
function parseDayPath(rel) {
  const m = /^sds\/(\d{4})\/([A-Z0-9]+)\/([A-Z0-9]+)\/([A-Z0-9]{3})\.D\/([A-Z0-9]+)\.([A-Z0-9]+)\.([A-Z0-9]*)\.([A-Z0-9]{3})\.D\.(\d{4})\.(\d{3})$/.exec(rel);
  if (!m) return null;
  const [, y, net, sta, cha, net2, sta2, loc, cha2, y2, ddd] = m;
  if (y !== y2 || net !== net2 || sta !== sta2 || cha !== cha2) return null;
  return { net, sta, loc, cha, dayMs: Date.UTC(Number(y), 0, 1) + (Number(ddd) - 1) * DAY };
}

test('demo tree: every path follows the layout (spec 7.1)', { skip }, () => {
  const allowed = [/^ABOUT\.txt$/, /^stations\.json$/, /^index\.json$/, /^stations\/[A-Z0-9]+\.[A-Z0-9]+\.xml$/,
    /^index\/[A-Z0-9]+\.[A-Z0-9]+\.\d{4}\.json$/, /^products\//];
  for (const f of files) {
    if (f.startsWith('sds/')) {
      const p = parseDayPath(f.replace(/\.json$/, ''));
      assert.ok(p, `not a day-file path: ${f}`);
      assert.equal(f.replace(/\.json$/, ''), sdsPath(p, p.dayMs));
    } else assert.ok(allowed.some((re) => re.test(f)), `unexpected file: ${f}`);
  }
  assert.ok(dayFiles.length > 0);
  for (const f of dayFiles) assert.ok(files.includes(`${f}.json`), `no sidecar for ${f}`);
  for (const f of files.filter((x) => x.startsWith('sds/') && x.endsWith('.json'))) {
    assert.ok(files.includes(f.slice(0, -5)), `a sidecar without its day file: ${f}`);
  }
});

test('demo tree: stations.json has the required fields (spec 7.4)', { skip }, () => {
  const s = json('stations.json');
  assert.equal(s.version, 1);
  assert.ok(isTime(s.generated));
  assert.ok(Array.isArray(s.stations) && s.stations.length > 0);
  const index = json('index.json');
  for (const st of s.stations) {
    for (const k of ['net', 'sta', 'rsSta', 'school', 'model', 'stationXml']) {
      assert.equal(typeof st[k], 'string', `${st.sta}.${k}`);
    }
    assert.equal(typeof st.primary, 'boolean');
    assert.ok(['sharing', 'not-sharing', 'unconfirmed'].includes(st.sharing));
    assert.equal(typeof st.delayHours, 'number');
    assert.ok(isTime(st.start));
    assert.ok(st.end === null || isTime(st.end));
    assert.ok(st.clockChecked === null || isDate(st.clockChecked));
    if (st.sharing === 'sharing') {
      assert.equal(st.delayHours, 0);
      assert.equal(typeof st.schoolName, 'string');
      for (const k of ['lat', 'lon']) {
        assert.equal(typeof st[k], 'number');
        assert.equal(st[k], Math.round(st[k] * 1000) / 1000, `${k} to 3 decimals`);
      }
    }
    assert.ok(files.includes(st.stationXml), `${st.stationXml} is in the tree`);
    assert.match(fs.readFileSync(path.join(root, st.stationXml), 'utf8'), /<FDSNStationXML[\s\S]*<Response>/);
    assert.ok(st.channels.length > 0);
    for (const ch of st.channels) {
      assert.equal(typeof ch.loc, 'string');
      assert.match(ch.cha, /^[A-Z0-9]{3}$/);
      for (const k of ['sampleRate', 'azimuth', 'dip']) assert.equal(typeof ch[k], 'number', k);
      assert.equal(typeof ch.units, 'string');
      for (const k of ['sensitivity', 'sensitivityFreq']) {
        assert.ok(ch[k] === null || typeof ch[k] === 'number', k);
      }
    }
    assert.ok(index.stations[`${st.net}.${st.sta}`], 'a listed station is in the index');
  }
  // One primary station per school.
  const schools = Map.groupBy(s.stations.filter((x) => x.end === null), (x) => x.school);
  for (const [school, list] of schools) assert.equal(list.filter((x) => x.primary).length, 1, school);
});

test('demo tree: index, availability and sidecars agree with the day files (spec 7.5-7.7)', { skip }, () => {
  const index = json('index.json');
  assert.equal(index.version, 1);
  assert.ok(isTime(index.generated));
  const seen = new Map(); // "NET.STA|LOC.CHA" -> {firstDay, lastEnd}

  for (const rel of dayFiles) {
    const p = parseDayPath(rel);
    const bytes = new Uint8Array(fs.readFileSync(path.join(root, rel)));
    const recs = scanRecords(bytes);
    const side = json(`${rel}.json`);
    const station = index.stations[`${p.net}.${p.sta}`];
    assert.ok(station, `${rel}: station in index.json`);
    const publicUntilMs = Date.parse(station.publicUntil);

    // The file itself (6.1, 5.2): whole records of one channel, in time order, no duplicates,
    // each filed under the day of its first sample.
    assert.ok(bytes.length <= 45e6);
    assert.equal(recs.reduce((n, r) => n + r.recordLength, 0), bytes.length, 'whole records only');
    const starts = new Set();
    recs.forEach((r, i) => {
      assert.equal(nslc(r), nslc(p), `${rel}: record ${i}`);
      assert.equal(utcDayStart(r.startMs), p.dayMs, `${rel}: record ${i} is in its start day's file`);
      if (i) assert.ok(r.startMs > recs[i - 1].startMs, `${rel}: time order at record ${i}`);
      starts.add(r.startMs);
      // The cutoff (5.4): no record ends after publicUntil.
      assert.ok(r.endMs <= publicUntilMs, `${rel}: record ${i} ends after publicUntil`);
    });
    assert.equal(starts.size, recs.length);

    // The sidecar (7.7).
    assert.ok(fs.statSync(path.join(root, `${rel}.json`)).size <= 100e3);
    assert.equal(side.version, 1);
    assert.equal(side.id, nslc(p));
    assert.equal(side.day, isoDay(p.dayMs));
    assert.ok(isTime(side.updated));
    const fresh = describeDay(recs, { dayStartMs: p.dayMs, publicUntilMs });
    for (const k of ['records', 'recordLength', 'encoding', 'sampleRate', 'firstSample', 'lastSampleEnd',
      'coverage', 'gaps', 'overlaps', 'seek']) {
      assert.deepEqual(side[k], fresh[k], `${rel}: ${k}`);
    }
    assert.equal(side.records, recs.length);
    assert.equal(side.records * side.recordLength, bytes.length);
    assert.ok(side.coverage >= 0 && side.coverage <= 1);
    // The seek table, checked against the bytes without help from describeDay.
    const byOffset = new Map(recs.map((r, i) => [r.offset, i]));
    assert.ok(side.seek.length > 0 && side.seek.length <= 144);
    side.seek.forEach(([iso, off], k) => {
      const mark = Date.parse(iso);
      assert.equal(mark, p.dayMs + k * 600000, `${rel}: marks are the day's 10-minute marks in order`);
      assert.ok(byOffset.has(off), `${rel}: ${iso} points at a record`);
      const i = byOffset.get(off);
      assert.ok(recs[i].startMs >= mark, `${rel}: ${iso} points at a record starting at or after it`);
      if (i) assert.ok(recs[i - 1].startMs < mark, `${rel}: ${iso} points at the first such record`);
    });
    assert.ok(Date.parse(side.seek.at(-1)[0]) + 600000 > recs.at(-1).startMs, 'no later mark has a record');

    // Its line in the availability file (7.6).
    const year = new Date(p.dayMs).getUTCFullYear();
    const avail = json(`index/${p.net}.${p.sta}.${year}.json`);
    assert.deepEqual([avail.version, avail.net, avail.sta, avail.year], [1, p.net, p.sta, year]);
    assert.ok(isTime(avail.generated));
    const line = avail.channels[`${p.loc}.${p.cha}`]?.[isoDay(p.dayMs)];
    assert.ok(line, `${rel}: listed in the availability file`);
    assert.equal(line.bytes, bytes.length);
    assert.equal(line.coverage, side.coverage);
    assert.deepEqual({ gapCount: line.gapCount, gapSeconds: line.gapSeconds }, gapTotals(side.gaps));
    assert.equal(line.status, p.dayMs + DAY <= publicUntilMs ? 'complete' : 'partial');
    assert.ok(isTime(line.updated));

    const key = `${p.net}.${p.sta}|${p.loc}.${p.cha}`;
    const s = seen.get(key) ?? { firstDay: side.day, lastEnd: side.lastSampleEnd };
    if (side.day < s.firstDay) s.firstDay = side.day;
    if (side.lastSampleEnd > s.lastEnd) s.lastEnd = side.lastSampleEnd;
    seen.set(key, s);
  }

  // index.json (7.5) against what the files hold.
  assert.ok(fs.statSync(path.join(root, 'index.json')).size <= 1e6);
  for (const [sta, entry] of Object.entries(index.stations)) {
    assert.ok(isTime(entry.publicUntil));
    for (const [cha, c] of Object.entries(entry.channels)) {
      const s = seen.get(`${sta}|${cha}`);
      assert.ok(s, `${sta} ${cha}: listed in the index, so it has day files`);
      assert.equal(c.firstDay, s.firstDay);
      assert.equal(c.lastSample, s.lastEnd);
      assert.ok(Date.parse(c.lastSample) <= Date.parse(entry.publicUntil));
      assert.ok(isTime(c.updated));
      assert.ok(['current', 'late', 'stopped'].includes(c.status));
    }
  }
  assert.equal(seen.size, Object.values(index.stations).reduce((n, e) => n + Object.keys(e.channels).length, 0),
    'every channel with day files is in the index');

  // Every day the availability files list (and do not mark withdrawn) has its file.
  for (const f of files.filter((x) => x.startsWith('index/'))) {
    const a = json(f);
    assert.ok(fs.statSync(path.join(root, f)).size <= 500e3);
    for (const [key, days] of Object.entries(a.channels)) {
      const [loc, cha] = key.split('.');
      for (const [date, line] of Object.entries(days)) {
        assert.ok(isDate(date));
        const rel = sdsPath({ net: a.net, sta: a.sta, loc, cha }, Date.parse(`${date}T00:00:00Z`));
        if (line.status === 'withdrawn') {
          assert.equal(line.bytes, 0);
          assert.equal(typeof line.withdrawnReason, 'string');
          assert.ok(!files.includes(rel));
        } else assert.ok(files.includes(rel), `${f}: ${date} has a day file`);
      }
    }
  }
});

test('demo tree: it is the evening that crosses UTC midnight, about 4 MB', { skip }, () => {
  const index = json('index.json');
  assert.deepEqual(Object.keys(index.stations), ['UU.HEB']);
  assert.equal(index.stations['UU.HEB'].publicUntil, '2026-11-18T04:00:00.000Z');
  assert.equal(index.stations['UU.HEB'].channels['01.EHZ'].firstDay, '2026-11-17');
  assert.deepEqual(dayFiles.map((f) => f.slice(-8)).sort(), ['2026.321', '2026.322']);
  const total = files.reduce((n, f) => n + fs.statSync(path.join(root, f)).size, 0);
  assert.ok(total < 6e6, `the demo tree is ${(total / 1e6).toFixed(1)} MB; keep it under 6`);
  assert.match(fs.readFileSync(path.join(root, 'ABOUT.txt'), 'utf8'), /10\.7914\/SN\/UU/);
});
