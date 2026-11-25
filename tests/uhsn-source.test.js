// UHSNSource (js/data/uhsn.js) reading a tiny public tree laid out as the UHSN data
// specification describes (version 1.1, section 7). The tree is built in a temporary folder
// from real UU records of the Junction sample, with the same library functions the tree
// script uses. Only for this test, the copies' start times are moved so they straddle a UTC
// midnight (the real publish step never rewrites a header). No network.
import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

// The seisplotjs bundle registers a web component when loaded; stub it for node.
globalThis.HTMLElement ??= class {};
globalThis.customElements ??= { define() {}, get() {} };
const { UHSNSource } = await import('../docs/app/js/data/uhsn.js');
const { parseMiniseed } = await import('../docs/app/js/data/mseed.js');
const {
  scanRecords, sortDedupe, cutAtCutoff, describeDay, gapTotals, sdsPath, utcDayStart, isoMs,
  isoDay, nslc, dayOfYear, dayStatus,
} = await import('../docs/app/js/lib/mseed-index.js');

const BASE = 'https://data.test/uhsn/v1/';
const CH = { net: 'UU', sta: 'BCE', loc: '01', cha: 'EHZ' };
const MIDNIGHT = Date.UTC(2026, 2, 2); // records run 2026-03-01 23:59:00.58 to 03-02 00:01:00.59
const PUBLIC_UNTIL = MIDNIGHT + 40000;
const NOW = isoMs(PUBLIC_UNTIL + 600000);
const DAY = 86400000;

/** Rewrite a record's start time (big-endian BTIME). Test only. */
function setStart(bytes, ms) {
  const v = new DataView(bytes.buffer, bytes.byteOffset, bytes.length);
  const d = new Date(Math.floor(ms));
  v.setUint16(20, d.getUTCFullYear());
  v.setUint16(22, dayOfYear(ms));
  bytes[24] = d.getUTCHours(); bytes[25] = d.getUTCMinutes(); bytes[26] = d.getUTCSeconds();
  v.setUint16(28, Math.round((ms % 1000) * 10));
}

// 28 back-to-back records of UU.BCE.01.EHZ (120 s), moved so 04:45:05 becomes midnight.
const sample = fs.readFileSync(new URL('../docs/app/data/samples/qe-junction/waveforms.mseed', import.meta.url));
const moved = [];
{
  const all = new Uint8Array(sample.buffer, sample.byteOffset, sample.length);
  const delta = MIDNIGHT - Date.UTC(2026, 9, 31, 4, 45, 5);
  for (const r of scanRecords(all).filter((x) => nslc(x) === nslc(CH))) {
    const copy = all.slice(r.offset, r.offset + r.recordLength);
    setStart(copy, r.startMs + delta);
    moved.push(copy);
  }
}
const FIRST = scanRecords(moved[0])[0].startMs;
// The "bridge" lost records 5 and 6: a gap from 23:59:24.36 to 23:59:36.52.
const GAP = [scanRecords(moved[5])[0].startMs, scanRecords(moved[6])[0].endMs];
const delivered = moved.filter((_, i) => i !== 5 && i !== 6);
// What the complete, uncut record looks like, decoded directly.
const whole = (() => {
  const buf = new Uint8Array(delivered.length * 512);
  delivered.forEach((b, i) => buf.set(b, i * 512));
  return buf;
})();

/** Build the tree as the publish step would (spec 5.2). Returns the folder. */
function buildTree() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'uhsn-tree-'));
  const put = (rel, data) => {
    const f = path.join(root, rel);
    fs.mkdirSync(path.dirname(f), { recursive: true });
    fs.writeFileSync(f, typeof data === 'string' || data instanceof Uint8Array ? data : JSON.stringify(data));
  };
  const recs = delivered.map((bytes) => ({ ...scanRecords(bytes)[0], bytes }));
  const days = Map.groupBy(cutAtCutoff(recs, PUBLIC_UNTIL), (r) => utcDayStart(r.startMs));
  const avail = { version: 1, net: CH.net, sta: CH.sta, year: 2026, generated: NOW, channels: { '01.EHZ': {} } };
  let lastSample;
  for (const [dayMs, list] of days) {
    const dayRecs = sortDedupe(list.reverse()); // delivered out of order
    const file = Buffer.concat(dayRecs.map((r) => r.bytes));
    const desc = describeDay(dayRecs, { dayStartMs: dayMs, publicUntilMs: PUBLIC_UNTIL });
    put(sdsPath(CH, dayMs), file);
    put(`${sdsPath(CH, dayMs)}.json`, { version: 1, id: nslc(CH), day: isoDay(dayMs), ...desc, updated: NOW });
    avail.channels['01.EHZ'][isoDay(dayMs)] = {
      status: dayStatus(dayMs, PUBLIC_UNTIL), coverage: desc.coverage,
      ...gapTotals(desc.gaps), bytes: file.length, updated: NOW };
    lastSample = desc.lastSampleEnd;
  }
  put('index/UU.BCE.2026.json', avail);
  put('index.json', { version: 1, generated: NOW, stations: { 'UU.BCE': { publicUntil: isoMs(PUBLIC_UNTIL),
    channels: { '01.EHZ': { firstDay: '2026-03-01', lastSample, updated: NOW, status: 'current' } } } } });
  const channel = { loc: '01', cha: 'EHZ', sampleRate: 100, azimuth: 0, dip: -90, units: 'M/S',
    sensitivity: null, sensitivityFreq: null };
  const station = { net: 'UU', sta: 'BCE', rsSta: 'BCE', school: 'test-bce', schoolName: 'Test school',
    primary: true, sharing: 'sharing', delayHours: 0, lat: 37.63, lon: -112.17, elevM: 2400,
    model: 'test', stationXml: 'stations/UU.BCE.xml', clockChecked: null, channels: [channel] };
  put('stations.json', { version: 1, generated: NOW, stations: [
    { ...station, model: 'old sensor', start: '2020-01-01T00:00:00.000Z', end: '2026-01-15T00:00:00.000Z' },
    { ...station, start: '2026-01-15T00:00:00.000Z', end: null },
    // An approved station whose position is not public (no lat/lon), far in every sense.
    { net: 'AM', sta: 'R0001', rsSta: 'S0001', school: 'hidden', primary: true, sharing: 'not-sharing',
      delayHours: 24, elevM: null, model: 'RS1D', start: '2026-02-01T00:00:00.000Z', end: null,
      stationXml: 'stations/AM.R0001.xml', clockChecked: '2026-02-20',
      channels: [{ ...channel, loc: '00', sensor: null }] },
    { ...station, sta: 'FAR', rsSta: 'FAR', school: 'far', lat: 41.9, lon: -111.5,
      start: '2026-01-15T00:00:00.000Z', end: null },
  ] });
  return root;
}

const root = buildTree();
after(() => fs.rmSync(root, { recursive: true, force: true }));

/** A fetch that serves the folder. honorRange false = a server that ignores Range (200). */
function treeFetch({ honorRange = true, log = [], edit } = {}) {
  return async (url, opts = {}) => {
    assert.ok(url.startsWith(BASE), `only the tree is fetched: ${url}`);
    const rel = url.slice(BASE.length);
    const range = opts.headers?.Range;
    log.push({ rel, range });
    const file = path.join(root, rel);
    if (!fs.existsSync(file)) return new Response(null, { status: 404 });
    let body = fs.readFileSync(file);
    if (edit) body = edit(rel, body) ?? body;
    if (range && honorRange) {
      const [, a, b] = /^bytes=(\d+)-(\d+)$/.exec(range);
      if (Number(a) >= body.length) return new Response(null, { status: 416 });
      return new Response(body.subarray(Number(a), Number(b) + 1), { status: 206 });
    }
    return new Response(body, { status: 200 });
  };
}
const noFallback = {
  getWaveforms() { throw new Error('the fallback was not expected'); },
};
const source = (o = {}) => new UHSNSource({ base: BASE, fetch: treeFetch(o), fallback: o.fallback ?? noFallback });
const at = (trace, ms) => trace.data[Math.round((ms - trace.startMs) / 10)];
const hasData = (trace, fromMs, toMs) => {
  for (let t = fromMs; t < toMs; t += 10) if (Number.isNaN(at(trace, t))) return false;
  return true;
};
const allNaN = (trace, fromMs, toMs) => {
  for (let t = fromMs; t < toMs; t += 10) if (!Number.isNaN(at(trace, t))) return false;
  return true;
};

test('the test tree has two day files, a gap on the first and a record crossing midnight', () => {
  const side = (d) => JSON.parse(fs.readFileSync(path.join(root, `${sdsPath(CH, d)}.json`)));
  const d1 = side(MIDNIGHT - DAY);
  const d2 = side(MIDNIGHT);
  assert.equal(d1.gaps.length, 1);
  assert.deepEqual(d1.gaps[0], [isoMs(GAP[0]), isoMs(GAP[1])]);
  assert.ok(Date.parse(d1.lastSampleEnd) > MIDNIGHT, 'day 1 ends after midnight');
  assert.equal(d1.lastSampleEnd, d2.firstSample);
  assert.ok(Date.parse(d2.lastSampleEnd) <= PUBLIC_UNTIL);
  assert.ok(d1.records + d2.records < delivered.length, 'records after the cutoff were not published');
});

test('getWaveforms joins two days across UTC midnight, exactly spanning the window', async () => {
  const log = [];
  const startMs = MIDNIGHT - 15000;
  const endMs = MIDNIGHT + 20000;
  const traces = await source({ log }).getWaveforms([CH], startMs, endMs);
  assert.equal(traces.length, 1);
  const [t] = traces;
  assert.equal(nslc(t), nslc(CH));
  assert.equal(t.startMs, startMs);
  assert.equal(t.sampleRate, 100);
  assert.equal(t.data.length, 3500);
  assert.equal(t.publicUntilMs, PUBLIC_UNTIL);
  assert.ok(hasData(t, startMs, endMs), 'no hole at midnight');
  // Sample for sample what decoding the delivered records directly gives.
  const [direct] = parseMiniseed(whole.buffer.slice(0), { fromMs: startMs, toMs: endMs });
  assert.deepEqual(t.data, direct.data);

  // What was fetched: descriptions first, then a byte range of each day file.
  const files = log.filter((l) => l.range);
  assert.deepEqual(files.map((l) => l.rel).sort(), [sdsPath(CH, MIDNIGHT - DAY), sdsPath(CH, MIDNIGHT)]);
  for (const { range } of files) {
    const [, a, b] = /^bytes=(\d+)-(\d+)$/.exec(range);
    assert.equal(Number(a) % 512, 0, 'starts on a record boundary');
    assert.equal((Number(b) + 1) % 512, 0);
  }
  assert.ok(log.some((l) => l.rel === 'index.json'));
  assert.ok(log.some((l) => l.rel === 'index/UU.BCE.2026.json'));
});

test('a record that starts before midnight is read from the day before', async () => {
  // The window lies wholly in the second UTC day, but its first 2.1 s are in the last
  // record of the first day's file.
  const t = (await source().getWaveforms([CH], MIDNIGHT, MIDNIGHT + 10000))[0];
  assert.ok(hasData(t, MIDNIGHT, MIDNIGHT + 10000));
});

test('a gap in the day file stays missing (NaN)', async () => {
  const startMs = MIDNIGHT - 50000;
  const t = (await source().getWaveforms([CH], startMs, MIDNIGHT))[0];
  assert.ok(hasData(t, startMs, GAP[0]));
  assert.ok(allNaN(t, GAP[0], GAP[1]));
  assert.ok(hasData(t, GAP[1], MIDNIGHT));
});

test('nothing after publicUntil; time before the first record is NaN', async () => {
  const s = source();
  assert.equal(await s.publicUntil('UU', 'BCE'), PUBLIC_UNTIL);
  assert.equal(await s.publicUntil('UU', 'NOPE'), null);
  const index = await s.index();
  const lastSample = Date.parse(index.stations['UU.BCE'].channels['01.EHZ'].lastSample);
  const startMs = MIDNIGHT + 20000;
  const endMs = MIDNIGHT + 70000;
  const t = (await s.getWaveforms([CH], startMs, endMs))[0];
  assert.equal(t.data.length, 5000);
  assert.ok(hasData(t, startMs, lastSample));
  assert.ok(allNaN(t, lastSample, endMs), 'the delivered record goes on, the public one does not');
  // A window wholly after publicUntil: no trace, and no day file is touched.
  const log = [];
  assert.deepEqual(await source({ log }).getWaveforms([CH], PUBLIC_UNTIL, PUBLIC_UNTIL + 60000), []);
  assert.ok(!log.some((l) => l.rel.startsWith('sds/')));
  // Before the bridge started: the leading minute is NaN.
  const early = (await s.getWaveforms([CH], FIRST - 60000, FIRST + 5000))[0];
  assert.ok(allNaN(early, FIRST - 60000, FIRST - 10));
  assert.ok(hasData(early, FIRST + 10, FIRST + 5000));
});

test('a server that ignores Range (answers 200 with the whole file) gives the same data', async () => {
  const startMs = MIDNIGHT - 50000;
  const endMs = MIDNIGHT + 50000;
  const a = (await source().getWaveforms([CH], startMs, endMs))[0];
  const b = (await source({ honorRange: false }).getWaveforms([CH], startMs, endMs))[0];
  assert.deepEqual(b.data, a.data);
  assert.equal(b.startMs, a.startMs);
});

test('a day with no data: no trace, or NaN beside the days that have some', async () => {
  // Before firstDay, and a day with no file between firstDay and publicUntil.
  assert.deepEqual(await source().getWaveforms([CH], MIDNIGHT - 5 * DAY, MIDNIGHT - 5 * DAY + 60000), []);
  assert.deepEqual(await source().getWaveforms([CH], MIDNIGHT - DAY + 3600000, MIDNIGHT - DAY + 3660000), [],
    'a window on the first day, hours before its first record');
  // Day 2 withdrawn in the availability file: its file is not read, its time is NaN.
  const log = [];
  const withdrawn = source({ log, edit: (rel, body) => {
    if (rel !== 'index/UU.BCE.2026.json') return null;
    const j = JSON.parse(body);
    Object.assign(j.channels['01.EHZ']['2026-03-02'], { status: 'withdrawn', bytes: 0, withdrawnReason: 'test' });
    return Buffer.from(JSON.stringify(j));
  } });
  const t = (await withdrawn.getWaveforms([CH], MIDNIGHT - 10000, MIDNIGHT + 20000))[0];
  assert.ok(!log.some((l) => l.rel.startsWith(sdsPath(CH, MIDNIGHT))));
  const day1End = Date.parse(JSON.parse(fs.readFileSync(path.join(root, `${sdsPath(CH, MIDNIGHT - DAY)}.json`))).lastSampleEnd);
  assert.ok(hasData(t, MIDNIGHT - 10000, day1End));
  assert.ok(allNaN(t, day1End, MIDNIGHT + 20000));
  // A day listed but whose sidecar is gone (404): treated as no data, not as an error.
  const gone = new UHSNSource({ base: BASE, fallback: noFallback, fetch: async (url, opts) => (
    url.endsWith('.2026.061.json') ? new Response(null, { status: 404 }) : treeFetch()(url, opts)) });
  const g = (await gone.getWaveforms([CH], MIDNIGHT - 10000, MIDNIGHT + 20000))[0];
  assert.ok(allNaN(g, day1End, MIDNIGHT + 20000));
  // A channel the index does not list.
  assert.deepEqual(await source().getWaveforms([{ ...CH, cha: 'EHN' }], MIDNIGHT - 10000, MIDNIGHT), []);
});

test('stations outside the tree go to the fallback; quakes and picks always do', async () => {
  const calls = [];
  const fallback = {
    async getWaveforms(requests, startMs, endMs) {
      calls.push({ requests, startMs, endMs });
      return [{ net: 'UU', sta: 'TMU', loc: '01', cha: 'HHZ', sampleRate: 100, startMs, data: new Float32Array(3) }];
    },
    async getEvents(q) { return [{ id: 'ev', q }]; },
    async getEvent(id) { return { id }; },
    async getAnalystPicks(id) { return [{ id }]; },
  };
  const s = source({ fallback });
  const other = { net: 'UU', sta: 'TMU', loc: '01', cha: 'HHZ' };
  const traces = await s.getWaveforms([other, CH], MIDNIGHT - 10000, MIDNIGHT);
  assert.deepEqual(traces.map((t) => t.sta), ['BCE', 'TMU']);
  assert.deepEqual(calls, [{ requests: [other], startMs: MIDNIGHT - 10000, endMs: MIDNIGHT }]);
  assert.equal(traces[1].publicUntilMs, undefined);
  await s.getWaveforms([CH], MIDNIGHT - 10000, MIDNIGHT);
  assert.equal(calls.length, 1, 'no fallback call when every station is in the tree');
  assert.deepEqual(await s.getEvents({ minMag: 2 }), [{ id: 'ev', q: { minMag: 2 } }]);
  assert.deepEqual(await s.getEvent('uu1'), { id: 'uu1' });
  assert.deepEqual(await s.getAnalystPicks('uu1'), [{ id: 'uu1' }]);
  assert.equal(s.name, 'School Shakes');
  assert.equal(s.live, false);
  assert.equal(s.kind, 'uhsn');
});

test('getStations: the epoch at atMs, distance, and null meaning "not known"', async () => {
  const s = source();
  const atMs = MIDNIGHT;
  const all = await s.getStations({ atMs });
  assert.deepEqual(all.map((x) => `${x.net}.${x.sta}`), ['UU.BCE', 'AM.R0001', 'UU.FAR']);
  const bce = all[0];
  assert.equal(bce.model, 'test', 'the current epoch, not the one that ended in January');
  assert.equal((await s.getStations({ atMs: Date.UTC(2025, 5, 1) }))[0].model, 'old sensor');
  assert.equal((await s.getStations({ atMs: Date.UTC(2019, 0, 1) })).length, 0);
  // The apps' Station shape, plus the tree's own fields.
  assert.equal(bce.lat, 37.63);
  assert.equal(bce.elevM, 2400);
  assert.deepEqual([bce.school, bce.schoolName, bce.primary, bce.sharing, bce.rsSta, bce.stationXml],
    ['test-bce', 'Test school', true, 'sharing', 'BCE', 'stations/UU.BCE.xml']);
  assert.ok(!('clockChecked' in bce), 'null is left out');
  const ch = bce.channels[0];
  assert.deepEqual([ch.loc, ch.cha, ch.sampleRate, ch.azimuth, ch.dip, ch.units], ['01', 'EHZ', 100, 0, -90, 'M/S']);
  assert.equal(ch.sensitivity, undefined);
  assert.equal(ch.sensitivityFreq, undefined);
  const hidden = all[1];
  assert.equal(hidden.lat, undefined);
  assert.equal(hidden.elevM, undefined);
  assert.equal(hidden.clockChecked, '2026-02-20');
  assert.equal(hidden.rsSta, 'S0001');
  assert.equal(hidden.channels[0].sensor, undefined);

  // By distance from a quake near Junction: BCE is about 60 km away, FAR about 410 km.
  const near = await s.getStations({ lat: 38.2, lon: -112.3, maxKm: 150, atMs });
  assert.deepEqual(near.map((x) => x.sta), ['BCE'], 'a station without a public position is left out');
  const wide = await s.getStations({ lat: 38.2, lon: -112.3, maxKm: 1000, atMs });
  assert.deepEqual(wide.map((x) => x.sta), ['BCE', 'FAR']);
});

test('errors: a blocked network and a server error read differently from "no data"', async () => {
  const blocked = new UHSNSource({ base: BASE, fallback: noFallback,
    fetch: async () => { throw new TypeError('Failed to fetch'); } });
  await assert.rejects(blocked.getWaveforms([CH], MIDNIGHT - 1000, MIDNIGHT),
    /could not reach the server \(network blocked or offline\?\)/);
  await assert.rejects(blocked.getStations({}), /could not reach the server/);
  const broken = new UHSNSource({ base: BASE, fallback: noFallback,
    fetch: async () => new Response(null, { status: 503, statusText: 'Service Unavailable' }) });
  await assert.rejects(broken.index(), /server said 503/);
  // 404 on everything is an empty tree, not an error.
  const empty = new UHSNSource({ base: BASE, fallback: noFallback,
    fetch: async () => new Response(null, { status: 404 }) });
  assert.deepEqual(await empty.getStations({}), []);
  assert.equal(await empty.index(), null);
  assert.equal(await empty.publicUntil('UU', 'BCE'), null);
  assert.equal(await empty.availability('UU', 'BCE', 2026), null);
  // A failed read is not remembered: the next call tries again.
  let n = 0;
  const flaky = new UHSNSource({ base: BASE, fallback: noFallback, fetch: async (url, opts) => {
    if (n++ === 0) throw new TypeError('Failed to fetch');
    return treeFetch()(url, opts);
  } });
  await assert.rejects(flaky.stationList());
  assert.equal((await flaky.stationList()).length, 4);
});

test('index.json is kept for 5 minutes unless a fresh read is asked for', async () => {
  const log = [];
  const s = source({ log });
  await s.index(); await s.index(); await s.publicUntil('UU', 'BCE');
  assert.equal(log.filter((l) => l.rel === 'index.json').length, 1);
  await s.index({ fresh: true });
  assert.equal(log.filter((l) => l.rel === 'index.json').length, 2);
  const a = await s.availability('UU', 'BCE', 2026);
  assert.equal(a.channels['01.EHZ']['2026-03-01'].gapCount, 1);
  assert.equal(a.channels['01.EHZ']['2026-03-01'].status, 'closed');
  assert.equal(a.channels['01.EHZ']['2026-03-02'].status, 'filling');
});

test('publishState: "data paused" once index.json is more than an hour old (spec 7.5)', async () => {
  const s = source();
  const generatedMs = Date.parse(NOW);
  assert.deepEqual(await s.publishState({ nowMs: generatedMs + 3600000 }), { generatedMs, paused: false });
  assert.deepEqual(await s.publishState({ nowMs: generatedMs + 3600001 }), { generatedMs, paused: true });
  const empty = new UHSNSource({ base: BASE, fallback: noFallback,
    fetch: async () => new Response(null, { status: 404 }) });
  assert.equal(await empty.publishState(), null);
});
