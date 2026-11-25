// The pure parts of the UHSN data checker (tools/uhsn-test/check-lib.mjs) and the status words
// in lib/mseed-index.js, against data specification 1.1 (sections 7.2 to 7.7). Pure inputs only.
import { test } from 'node:test';
import assert from 'node:assert/strict';

const L = await import('../tools/uhsn-test/check-lib.mjs');
const {
  isTime, isDate, typeProblem, checkFields, FIELDS, parseDayPath, classifyPath, checkSeek,
  allowedChannelStatuses, duration, corsProblems, contentTypeProblems, cacheRule, cacheProblems,
  rangeProblems, checkAvailabilityFile, checkIndexFile, checkStationsFile, checkStationXml,
  checkDayFile, coverageFits, Report, wrap,
} = L;
const { describeDay, dayStatus, channelStatus, publishPaused } =
  await import('../docs/app/js/lib/mseed-index.js');

const HOUR = 3600000;
const DAY = 86400000;
const DAY0 = Date.UTC(2026, 10, 24); // 2026-11-24, day 328
const T = (h, m = 0, s = 0) => DAY0 + h * HOUR + m * 60000 + s * 1000;
const iso = (ms) => new Date(ms).toISOString();

function rec(startMs, nSamples = 500, extra = {}) {
  const sampleRate = extra.sampleRate ?? 100;
  return { net: 'AM', sta: 'R1234', loc: '00', cha: 'EHZ', startMs, nSamples, sampleRate,
    recordLength: 512, encoding: 11, encodingName: 'STEIM2',
    endMs: startMs + (nSamples / sampleRate) * 1000, ...extra };
}
/** Back-to-back records: count records of 5 minutes (30000 samples at 100 Hz). */
function run(startMs, count, nSamples = 30000) {
  return Array.from({ length: count }, (_, i) => rec(startMs + i * nSamples * 10, nSamples));
}
const hasText = (items, s) => items.some((i) => i.text.includes(s));

// --- mseed-index status words ---------------------------------------------------------------

test('dayStatus: closed exactly when the day end equals publicUntil', () => {
  assert.equal(dayStatus(DAY0, DAY0 + DAY), 'closed');
  assert.equal(dayStatus(DAY0, DAY0 + DAY - 1), 'filling');
  assert.equal(dayStatus(DAY0, DAY0 + DAY + 5), 'closed');
  assert.equal(dayStatus(DAY0, DAY0 + HOUR), 'filling');
});

test('channelStatus: thresholds at 2 h (hourly), 36 h (daily) and 7 days', () => {
  const pu = T(12);
  assert.equal(channelStatus(pu, pu - 2 * HOUR), 'current');
  assert.equal(channelStatus(pu, pu - 2 * HOUR - 1), 'late');
  assert.equal(channelStatus(pu, pu - 36 * HOUR, { daily: true }), 'current');
  assert.equal(channelStatus(pu, pu - 36 * HOUR - 1, { daily: true }), 'late');
  assert.equal(channelStatus(pu, pu - 7 * DAY + 1), 'late');
  assert.equal(channelStatus(pu, pu - 7 * DAY), 'stopped');
  assert.equal(channelStatus(pu, pu - 7 * DAY, { daily: true }), 'stopped');
});

test('publishPaused: not paused at exactly 1 hour, paused at 1 hour + 1 ms', () => {
  assert.equal(publishPaused(T(0), T(1)), false);
  assert.equal(publishPaused(T(0), T(1) + 1), true);
  assert.equal(publishPaused(T(0), T(0)), false);
});

test('allowedChannelStatuses: sharing is hourly only; others accept hourly or daily', () => {
  const pu = T(12);
  assert.deepEqual(allowedChannelStatuses(pu, pu - 10 * HOUR, { sharing: true }), ['late']);
  assert.deepEqual(allowedChannelStatuses(pu, pu - 10 * HOUR, { sharing: false }).sort(), ['current', 'late']);
  assert.deepEqual(allowedChannelStatuses(pu, pu - HOUR, { sharing: false }), ['current']);
});

// --- values, field tables --------------------------------------------------------------------

test('isTime and isDate accept good values and refuse bad ones', () => {
  assert.ok(isTime('2026-11-25T14:00:00.000Z'));
  assert.ok(!isTime('2026-11-25T14:00:00Z'), 'missing ms');
  assert.ok(!isTime('2026-11-25T14:00:00.000'), 'no Z');
  assert.ok(!isTime('2026-02-30T00:00:00.000Z'), 'impossible date');
  assert.ok(!isTime(12345));
  assert.ok(isDate('2026-11-25'));
  assert.ok(!isDate('2026-02-30'));
  assert.ok(!isDate('2026-13-01'));
  assert.ok(!isDate('2026-1-5'));
  assert.ok(!isDate('2026-11-25T00:00:00.000Z'));
});

test('typeProblem: null only where the type says |null; enums list the allowed words', () => {
  assert.equal(typeProblem(null, 'time|null'), null);
  assert.match(typeProblem(null, 'time'), /null/);
  assert.equal(typeProblem(3, 'integer'), null);
  assert.ok(typeProblem(3.5, 'integer'));
  assert.ok(typeProblem('3', 'number'));
  assert.ok(typeProblem(NaN, 'number'));
  assert.equal(typeProblem('closed', ['filling', 'closed']), null);
  assert.match(typeProblem('complete', ['filling', 'closed']), /"filling", "closed"/);
});

test('checkFields: missing required, optional null/missing, extra fields', () => {
  const table = [['a', 'integer', true], ['b', 'string', false], ['c', 'time|null', true]];
  assert.deepEqual(checkFields({ a: 1, c: null }, table), { problems: [], extra: [] });
  assert.ok(checkFields({ c: null }, table).problems.some((m) => m.includes('"a" is missing')));
  assert.ok(checkFields({ a: null, c: null }, table).problems.some((m) => m.includes('"a"')), 'null in required non-null field');
  assert.deepEqual(checkFields({ a: 1, b: null, c: null }, table).problems, [], 'null in optional field');
  assert.deepEqual(checkFields({ a: 1, c: null, zzz: 1 }, table).extra, ['zzz']);
  assert.ok(checkFields([], table).problems.length);
});

test('checkFields: sharing-required and withdrawn-required fields', () => {
  const t = FIELDS.station;
  const base = { net: 'AM', sta: 'R1234', rsSta: 'R1234', school: 'juab', primary: true,
    sharing: 'sharing', delayHours: 0, model: 'RS4D', start: '2026-01-01T00:00:00.000Z', end: null,
    stationXml: 'x', clockChecked: null, channels: [] };
  const miss = (o) => checkFields(base, t, o).problems.join('|');
  assert.doesNotMatch(miss({}), /schoolName|"lat"|"lon"/);
  for (const k of ['schoolName', 'lat', 'lon']) assert.match(miss({ sharing: true }), new RegExp(`"${k}" is missing`));
  const day = { status: 'withdrawn', coverage: 0, gapCount: 0, gapSeconds: 0, bytes: 0, updated: '2026-01-01T00:00:00.000Z' };
  assert.deepEqual(checkFields(day, FIELDS.availabilityDay).problems, []);
  assert.match(checkFields(day, FIELDS.availabilityDay, { withdrawn: true }).problems.join(), /withdrawnReason/);
});

// --- paths -----------------------------------------------------------------------------------

const DAYFILE = 'sds/2026/AM/R1234/EHZ.D/AM.R1234.00.EHZ.D.2026.328';

test('parseDayPath and classifyPath: good paths', () => {
  const p = parseDayPath(DAYFILE);
  assert.deepEqual(p, { net: 'AM', sta: 'R1234', loc: '00', cha: 'EHZ', dayMs: DAY0 });
  assert.equal(classifyPath(DAYFILE), 'day');
  assert.equal(classifyPath(`${DAYFILE}.json`), 'sidecar');
  assert.equal(classifyPath('stations.json'), 'stations');
  assert.equal(classifyPath('index.json'), 'index');
  assert.equal(classifyPath('stations/AM.R1234.xml'), 'stationXml');
  assert.equal(classifyPath('index/AM.R1234.2026.json'), 'availability');
  assert.equal(classifyPath('products/hourly/x.json'), 'products');
  assert.equal(classifyPath('ABOUT.txt'), 'readme');
  assert.equal(classifyPath('something/else.bin'), null);
});

test('parseDayPath: mismatched parts and impossible day numbers give null', () => {
  assert.equal(parseDayPath(DAYFILE.replace('D.2026.328', 'D.2025.328')), null, 'year');
  assert.equal(parseDayPath(DAYFILE.replace('AM.R1234.00', 'UU.R1234.00')), null, 'net');
  assert.equal(parseDayPath(DAYFILE.replace('AM.R1234.00', 'AM.R9999.00')), null, 'sta');
  assert.equal(parseDayPath(DAYFILE.replace('AM.R1234.00.EHZ', 'AM.R1234.00.EHN')), null, 'cha');
  assert.equal(parseDayPath(DAYFILE.replace('.328', '.000')), null);
  assert.equal(parseDayPath(DAYFILE.replace('.328', '.367')), null);
  assert.equal(classifyPath(`${DAYFILE.replace('.328', '.367')}.json`), null);
  assert.equal(classifyPath(DAYFILE.replace('.328', '.000')), null);
});

// --- checkSeek -------------------------------------------------------------------------------

const seekRecs = run(DAY0, 5); // five 5-minute records, starts 0, 5, 10, 15, 20 min
const seekOpts = { dayStartMs: DAY0, recordLength: 512, fileSize: 5 * 512 };
const goodSeek = () => [[iso(T(0)), 0], [iso(T(0, 10)), 1024], [iso(T(0, 20)), 2048]];

test('checkSeek: a correct table passes, by hand and from describeDay', () => {
  assert.deepEqual(checkSeek(seekRecs, goodSeek(), seekOpts), []);
  const d = describeDay(seekRecs, { dayStartMs: DAY0, publicUntilMs: DAY0 + DAY });
  assert.deepEqual(d.seek, goodSeek());
  assert.deepEqual(checkSeek(seekRecs, d.seek, seekOpts), []);
});

test('checkSeek: wrong mark time, off-boundary offset, wrong record, short and long tables', () => {
  let s = goodSeek(); s[1][0] = iso(T(0, 11));
  assert.ok(checkSeek(seekRecs, s, seekOpts).length, 'wrong mark time');
  s = goodSeek(); s[1][1] = 1025;
  assert.match(checkSeek(seekRecs, s, seekOpts)[0], /not the start of a record/);
  s = goodSeek(); s[0][1] = 512; // record 0 also starts at/after the 00:00 mark
  assert.match(checkSeek(seekRecs, s, seekOpts)[0], /first one/);
  s = goodSeek(); s[1][1] = 512; // record 1 starts at 5 min, before the 10 min mark
  assert.match(checkSeek(seekRecs, s, seekOpts)[0], /before the mark/);
  assert.match(checkSeek(seekRecs, goodSeek().slice(0, 2), seekOpts)[0], /stops after 2 marks/);
  s = [...goodSeek(), [iso(T(0, 30)), 2048]];
  assert.ok(checkSeek(seekRecs, s, seekOpts).length, 'extra mark after the last start');
  assert.deepEqual(checkSeek(seekRecs, 'x', seekOpts), ['"seek" is not a list']);
});

test('checkSeek: four records (starts 0 to 15 min) need exactly the marks 00:00 and 00:10', () => {
  const recs = run(DAY0, 4);
  const opts = { dayStartMs: DAY0, recordLength: 512, fileSize: 4 * 512 };
  assert.deepEqual(checkSeek(recs, goodSeek().slice(0, 2), opts), []);
  assert.ok(checkSeek(recs, goodSeek(), opts).length, 'a mark after the last record start');
});

// --- duration --------------------------------------------------------------------------------

test('duration: seconds, minutes, hours and days', () => {
  assert.equal(duration(4800), '4.8 s');
  assert.equal(duration(30 * 60000), '30 minutes');
  assert.equal(duration(3.2 * HOUR), '3.2 hours');
  assert.equal(duration(2.1 * DAY), '2.1 days');
});

// --- web rules (7.2) -------------------------------------------------------------------------

const goodHeaders = () => ({
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Expose-Headers': 'ETag, Content-Range, Content-Length, Accept-Ranges',
  'Access-Control-Allow-Headers': 'Range',
  'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
});

test('corsProblems: good headers (Headers and plain object) pass', () => {
  assert.deepEqual(corsProblems(goodHeaders()), []);
  assert.deepEqual(corsProblems(new Headers(goodHeaders())), []);
  assert.deepEqual(corsProblems(new Headers({ ...goodHeaders(), 'Access-Control-Allow-Methods': '*' })), []);
});

test('corsProblems: missing or wrong origin, exposed headers and methods', () => {
  const h = goodHeaders(); delete h['Access-Control-Allow-Origin'];
  assert.match(corsProblems(new Headers(h))[0], /Allow-Origin is missing/);
  assert.match(corsProblems({ ...goodHeaders(), 'Access-Control-Allow-Origin': 'https://x.org' })[0], /"https:\/\/x.org"/);
  const e = corsProblems(new Headers({ ...goodHeaders(), 'Access-Control-Expose-Headers': 'ETag' }));
  assert.ok(e.some((m) => m.includes('Expose-Headers lacks') && m.includes('Content-Range')));
  const m = corsProblems({ ...goodHeaders(), 'Access-Control-Allow-Methods': 'GET, HEAD' });
  assert.ok(m.some((x) => x.includes('Allow-Methods lacks OPTIONS')));
  const none = goodHeaders(); delete none['Access-Control-Allow-Headers'];
  assert.ok(corsProblems(none).some((x) => x.includes('Allow-Headers is missing')));
});

test('contentTypeProblems: json with charset passes, a day file as octet-stream does not', () => {
  assert.deepEqual(contentTypeProblems('index.json', { 'Content-Type': 'application/json; charset=utf-8' }), []);
  assert.deepEqual(contentTypeProblems(DAYFILE, { 'Content-Type': 'application/vnd.fdsn.mseed' }), []);
  assert.equal(contentTypeProblems(DAYFILE, { 'Content-Type': 'application/octet-stream' }).length, 1);
  assert.match(contentTypeProblems('index.json', {})[0], /missing/);
  assert.deepEqual(contentTypeProblems('ABOUT.txt', {}), []);
  assert.deepEqual(contentTypeProblems('stations/AM.R1234.xml', { 'Content-Type': 'application/xml' }), []);
});

test('cacheRule and cacheProblems: recent and old day files, index and station files', () => {
  const now10 = DAY0 + 10 * DAY;
  const now40 = DAY0 + 40 * DAY;
  assert.deepEqual(cacheRule(DAYFILE, now10), { cacheControl: 'no-cache', lastModified: true });
  assert.deepEqual(cacheRule(`${DAYFILE}.json`, now10), { cacheControl: 'no-cache', lastModified: true });
  assert.deepEqual(cacheRule(DAYFILE, now40), { cacheControl: 'public, max-age=86400', lastModified: false });
  assert.equal(cacheRule('index.json', now10).cacheControl, 'no-cache');
  assert.equal(cacheRule('index/AM.R1234.2026.json', now10).cacheControl, 'no-cache');
  assert.equal(cacheRule('stations.json', now10).cacheControl, 'public, max-age=3600');
  assert.equal(cacheRule('ABOUT.txt', now10), null);

  const ok10 = { 'Cache-Control': 'no-cache', ETag: '"a"', 'Last-Modified': 'x' };
  assert.deepEqual(cacheProblems(DAYFILE, ok10, now10), []);
  assert.deepEqual(cacheProblems(DAYFILE, { 'Cache-Control': 'public, max-age=86400', ETag: '"a"' }, now40), []);
  assert.deepEqual(cacheProblems('stations.json', { 'Cache-Control': 'public, max-age=3600', ETag: '"a"' }, now10), []);
  assert.deepEqual(cacheProblems('index.json', new Headers({ 'Cache-Control': 'no-cache', ETag: '"a"' }), now10), []);
  assert.match(cacheProblems(DAYFILE, { ETag: '"a"', 'Last-Modified': 'x', 'Cache-Control': 'public, max-age=86400' }, now10)[0], /no-cache/);
  assert.ok(cacheProblems('index.json', { 'Cache-Control': 'no-store, no-cache', ETag: '"a"' }, now10).length, 'no-store fails a no-cache rule');
  assert.ok(cacheProblems('index.json', { 'Cache-Control': 'no-cache' }, now10).some((m) => m.includes('no ETag')));
  assert.ok(cacheProblems(DAYFILE, { 'Cache-Control': 'no-cache', ETag: '"a"' }, now10).some((m) => m.includes('Last-Modified')));
});

test('rangeProblems: 200, good 206, wrong Content-Range, differing bytes', () => {
  const whole = Uint8Array.from({ length: 100 }, (_, i) => i);
  const ok = { status: 206, headers: { 'Content-Range': 'bytes 10-19/100' }, body: whole.slice(10, 20), start: 10, end: 19, whole };
  assert.deepEqual(rangeProblems(ok), []);
  assert.match(rangeProblems({ ...ok, status: 200 })[0], /200/);
  assert.match(rangeProblems({ ...ok, status: 404 })[0], /404/);
  assert.match(rangeProblems({ ...ok, headers: { 'Content-Range': 'bytes 10-20/100' } })[0], /Content-Range/);
  assert.match(rangeProblems({ ...ok, headers: {} })[0], /missing/);
  assert.match(rangeProblems({ ...ok, headers: { 'Content-Range': 'bytes 10-19/99' } })[0], /size/);
  const bad = whole.slice(10, 20); bad[3] = 255;
  assert.match(rangeProblems({ ...ok, body: bad })[0], /differ/);
  assert.match(rangeProblems({ ...ok, body: whole.slice(10, 15) })[0], /holds 5 bytes/);
});

// --- availability file (7.6) -----------------------------------------------------------------

const PU = Date.UTC(2026, 10, 25, 14); // publicUntil for these tests
const availOpts = { rel: 'index/AM.R1234.2026.json', net: 'AM', sta: 'R1234', year: 2026, publicUntilMs: PU, channelKeys: ['00.EHZ'] };
const dayLine = (o = {}) => ({ status: 'closed', coverage: 1, gapCount: 0, gapSeconds: 0, bytes: 1000, updated: '2026-11-25T14:00:00.000Z', ...o });
const availDoc = (days, o = {}) => ({ version: 1, net: 'AM', sta: 'R1234', year: 2026, generated: '2026-11-25T14:00:00.000Z', channels: { '00.EHZ': days }, ...o });

test('checkAvailabilityFile: a clean file has no FAIL and returns its days in order', () => {
  const r = new Report();
  const out = checkAvailabilityFile(availDoc({ '2026-11-24': dayLine(), '2026-11-23': dayLine(), '2026-11-25': dayLine({ status: 'filling', coverage: 0.5 }) }), r, availOpts);
  assert.deepEqual(r.items('FAIL'), []);
  assert.deepEqual(out['00.EHZ'].map((d) => d.date), ['2026-11-23', '2026-11-24', '2026-11-25']);
});

test('checkAvailabilityFile: the old status names fail and mention the 1.1 rename', () => {
  for (const [old, now] of [['complete', 'closed'], ['partial', 'filling']]) {
    const r = new Report();
    checkAvailabilityFile(availDoc({ '2026-11-24': dayLine({ status: old }) }), r, availOpts);
    const f = r.items('FAIL');
    assert.ok(f.length >= 1, old);
    assert.ok(f.some((i) => i.text.includes('1.1') && i.text.includes(`"${now}"`)), old);
  }
});

test('checkAvailabilityFile: status filling for a day that ended before publicUntil fails', () => {
  const r = new Report();
  checkAvailabilityFile(availDoc({ '2026-11-24': dayLine({ status: 'filling' }) }), r, availOpts);
  assert.ok(hasText(r.items('FAIL'), 'should be "closed"'));
});

test('checkAvailabilityFile: withdrawn day with bytes, or without a reason, fails', () => {
  const w = dayLine({ status: 'withdrawn', bytes: 0, coverage: 0, withdrawnReason: 'privacy' });
  let r = new Report();
  checkAvailabilityFile(availDoc({ '2026-11-24': w }), r, availOpts);
  assert.deepEqual(r.items('FAIL'), []);
  r = new Report();
  checkAvailabilityFile(availDoc({ '2026-11-24': { ...w, bytes: 500 } }), r, availOpts);
  assert.ok(hasText(r.items('FAIL'), '"bytes" 500'));
  r = new Report();
  const { withdrawnReason, ...noReason } = w;
  checkAvailabilityFile(availDoc({ '2026-11-24': noReason }), r, availOpts);
  assert.ok(hasText(r.items('FAIL'), 'withdrawnReason'));
});

test('checkAvailabilityFile: a day at or after publicUntil, and a name mismatch, fail', () => {
  let r = new Report();
  checkAvailabilityFile(availDoc({ '2026-11-26': dayLine({ status: 'filling' }) }), r, availOpts);
  assert.ok(hasText(r.items('FAIL'), 'at or after publicUntil'));
  for (const bad of [{ sta: 'R9999' }, { year: 2025 }, { net: 'UU' }]) {
    r = new Report();
    checkAvailabilityFile(availDoc({}, bad), r, availOpts);
    assert.ok(hasText(r.items('FAIL'), 'but its name is'), JSON.stringify(bad));
  }
});

// --- index.json (7.5) ------------------------------------------------------------------------

const G = Date.UTC(2026, 10, 25, 14);
const stn = (o = {}) => ({ net: 'AM', sta: 'R1234', rsSta: 'R1234', school: 'juab', schoolName: 'Juab HS', primary: true,
  sharing: 'sharing', delayHours: 0, lat: 39.123, lon: -111.456, model: 'RS4D', start: '2026-01-01T00:00:00.000Z',
  end: null, stationXml: 'stations/AM.R1234.xml', clockChecked: null,
  channels: [{ loc: '00', cha: 'EHZ', sampleRate: 100, azimuth: 0, dip: -90, units: 'M/S', sensitivity: null, sensitivityFreq: null }], ...o });
const idxDoc = ({ generated = G, publicUntil = G, lastSample = G - 5000, status = 'current', key = 'AM.R1234' } = {}) => ({
  version: 1, generated: iso(generated),
  stations: { [key]: { publicUntil: iso(publicUntil), channels: { '00.EHZ': { firstDay: '2026-01-01', lastSample: iso(lastSample), updated: iso(generated), status } } } },
});

test('checkIndexFile: a clean index has no FAIL', () => {
  const r = new Report();
  const out = checkIndexFile(idxDoc(), [stn()], r, { nowMs: G + 60000, judgePaused: true });
  assert.deepEqual(r.items('FAIL'), []);
  assert.equal(out.length, 1);
  assert.equal(out[0].key, '00.EHZ');
});

test('checkIndexFile: status late with a 5 s lag fails', () => {
  const r = new Report();
  checkIndexFile(idxDoc({ status: 'late' }), [stn()], r, { nowMs: G, judgePaused: false });
  assert.ok(hasText(r.items('FAIL'), 'should be "current"'));
});

test('checkIndexFile: a not-sharing station with a 10 hour lag may be late (or current)', () => {
  const pu = G - 10 * HOUR;
  const st = stn({ sharing: 'not-sharing', delayHours: 10 });
  for (const status of ['late', 'current']) {
    const r = new Report();
    checkIndexFile(idxDoc({ publicUntil: pu, lastSample: pu - 10 * HOUR, status }), [st], r, { nowMs: G, judgePaused: false });
    assert.deepEqual(r.items('FAIL'), [], status);
  }
});

test('checkIndexFile: publicUntil later than generated minus the delay fails', () => {
  const r = new Report();
  checkIndexFile(idxDoc({ publicUntil: G + 2 * HOUR, lastSample: G + 2 * HOUR - 1000 }), [stn()], r, { nowMs: G, judgePaused: false });
  assert.ok(hasText(r.items('FAIL'), 'data may be public too early'));
});

test('checkIndexFile: paused is a WARN, running is ok, not judging is a NOTE', () => {
  let r = new Report();
  checkIndexFile(idxDoc(), [stn()], r, { nowMs: G + 2 * HOUR, judgePaused: true });
  assert.ok(hasText(r.items('WARN'), 'Data paused'));
  r = new Report();
  checkIndexFile(idxDoc(), [stn()], r, { nowMs: G + 2 * HOUR, judgePaused: false });
  assert.equal(r.items('WARN').length, 0);
  assert.ok(hasText(r.items('NOTE'), 'does not judge'));
  r = new Report();
  checkIndexFile(idxDoc(), [stn()], r, { nowMs: G + 60000, judgePaused: true });
  assert.equal(r.items('WARN').length, 0);
  assert.ok(r.items('ok').some((i) => i.label.includes('publish step is running')));
});

test('checkIndexFile: a station not in stations.json fails', () => {
  const r = new Report();
  checkIndexFile(idxDoc({ key: 'AM.R9999' }), [stn()], r, { nowMs: G, judgePaused: false });
  assert.ok(hasText(r.items('FAIL'), 'not in stations.json'));
});

// --- stations.json (7.4) ---------------------------------------------------------------------

const stationsDoc = (list) => ({ version: 1, generated: '2026-11-25T14:00:00.000Z', stations: list });

test('checkStationsFile: a clean file has no FAIL or WARN', () => {
  const r = new Report();
  const out = checkStationsFile(stationsDoc([stn()]), r);
  assert.equal(out.length, 1);
  assert.deepEqual(r.items('FAIL'), []);
  assert.deepEqual(r.items('WARN'), []);
});

test('checkStationsFile: two primaries in one school fail', () => {
  const r = new Report();
  checkStationsFile(stationsDoc([stn(), stn({ sta: 'R5678', rsSta: 'R5678', stationXml: 'stations/AM.R5678.xml' })]), r);
  assert.ok(hasText(r.items('FAIL'), '2 primary stations'));
});

test('checkStationsFile: sharing delay, location precision, unconfirmed with a name', () => {
  let r = new Report();
  checkStationsFile(stationsDoc([stn({ delayHours: 24 })]), r);
  assert.ok(hasText(r.items('FAIL'), 'no delay'));
  r = new Report();
  checkStationsFile(stationsDoc([stn({ lat: 39.1234 })]), r);
  assert.ok(hasText(r.items('FAIL'), '3 decimals'));
  r = new Report();
  checkStationsFile(stationsDoc([stn({ sharing: 'unconfirmed', delayHours: 24 })]), r);
  assert.ok(hasText(r.items('FAIL'), 'unconfirmed station shows schoolName'));
  r = new Report();
  const { schoolName, lat, lon, ...bare } = stn({ sharing: 'unconfirmed', delayHours: 24 });
  checkStationsFile(stationsDoc([bare]), r);
  assert.deepEqual(r.items('FAIL'), []);
});

test('checkStationsFile: a test station gets one NOTE and no WARN; the same with model RS1D gets WARNs', () => {
  const uu = { net: 'UU', sta: 'HEB', rsSta: 'R0000', stationXml: 'stations/UU.HEB.xml', sharing: 'not-sharing', delayHours: 10 };
  let r = new Report();
  checkStationsFile(stationsDoc([stn({ ...uu, model: 'test RS4D' })]), r);
  assert.equal(r.items('WARN').length, 0);
  assert.equal(r.items('NOTE').filter((i) => i.text.includes('a test station')).length, 1);
  r = new Report();
  checkStationsFile(stationsDoc([stn({ ...uu, model: 'RS1D' })]), r);
  assert.ok(r.items('WARN').length >= 2);
  assert.ok(hasText(r.items('WARN'), 'Network code "UU"'));
});

// --- StationXML ------------------------------------------------------------------------------

const XML = `<?xml version="1.0"?><FDSNStationXML xmlns="http://www.fdsn.org/xml/station/1" schemaVersion="1.2">
<Network code="AM"><Station code="R1234">
<Channel code="EHZ" locationCode="00"><Response><InstrumentSensitivity><Value>1</Value></InstrumentSensitivity></Response></Channel>
</Station></Network></FDSNStationXML>`;

test('checkStationXml: a small good file passes', () => {
  const r = new Report();
  checkStationXml(XML, stn(), r, 'stations/AM.R1234.xml');
  assert.deepEqual(r.items('FAIL'), []);
  assert.deepEqual(r.items('WARN'), []);
});

test('checkStationXml: a missing channel, a channel without a response, and non-XML fail', () => {
  let r = new Report();
  const two = stn(); two.channels.push({ loc: '00', cha: 'ENZ', sampleRate: 100, azimuth: 0, dip: -90, units: 'M/S**2', sensitivity: null, sensitivityFreq: null });
  checkStationXml(XML, two, r, 'x');
  assert.ok(hasText(r.items('FAIL'), 'no channel 00.ENZ'));
  r = new Report();
  checkStationXml(XML.replace(/<Response>[\s\S]*<\/Response>/, ''), stn(), r, 'x');
  assert.ok(hasText(r.items('FAIL'), 'has no response'));
  r = new Report();
  checkStationXml('<html/>', stn(), r, 'x');
  assert.ok(hasText(r.items('FAIL'), 'not FDSN StationXML'));
  r = new Report();
  checkStationXml(XML.replace('schemaVersion="1.2"', 'schemaVersion="1.1"'), stn(), r, 'x');
  assert.ok(hasText(r.items('WARN'), '1.1'));
});

// --- day files and sidecars ------------------------------------------------------------------

const dayOpts = (records, o = {}) => {
  const publicUntilMs = o.publicUntilMs ?? DAY0 + 6 * HOUR;
  const sidecar = o.sidecar === undefined ? {
    version: 1, id: 'AM.R1234.00.EHZ', day: '2026-11-24', updated: iso(publicUntilMs),
    ...describeDay(records, { dayStartMs: DAY0, publicUntilMs }),
  } : o.sidecar;
  const bytes = new Uint8Array(records.length * 512);
  return { rel: DAYFILE, ch: { net: 'AM', sta: 'R1234', loc: '00', cha: 'EHZ' }, dayMs: DAY0, bytes, records,
    sidecar, sidecarSize: 2000, line: null, publicUntilMs, delayHours: 0, ...o };
};

test('checkDayFile: a good day has no FAIL and nothing late', () => {
  const recs = run(DAY0, 5);
  const r = new Report();
  const out = checkDayFile(r, dayOpts(recs));
  assert.deepEqual(r.items('FAIL'), []);
  assert.deepEqual(out.late, []);
  assert.equal(out.fileSize, 2560);
  assert.equal(out.lastSampleEndMs, T(0, 25));
});

test('checkDayFile: a record longer than 512 bytes fails', () => {
  const recs = run(DAY0, 5);
  recs[2] = { ...recs[2], recordLength: 4096 };
  const r = new Report();
  checkDayFile(r, dayOpts(recs, { sidecar: undefined }));
  assert.ok(hasText(r.items('FAIL'), 'are not 512 bytes long'));
});

test('checkDayFile: a record ending after publicUntil is returned in late', () => {
  const recs = run(DAY0, 5); // last record 20:00 to 25:00
  const r = new Report();
  const out = checkDayFile(r, dayOpts(recs, { publicUntilMs: T(0, 22) }));
  assert.equal(out.late.length, 1);
  assert.equal(out.late[0], recs[4]);
});

test('checkDayFile: a record starting on the next UTC day fails', () => {
  const recs = [...run(DAY0, 2), rec(DAY0 + DAY + 1000)];
  const r = new Report();
  checkDayFile(r, dayOpts(recs, { publicUntilMs: DAY0 + 2 * DAY }));
  assert.ok(hasText(r.items('FAIL'), 'start on another UTC day'));
});

test('checkDayFile: a duplicate start time fails', () => {
  const recs = run(DAY0, 3);
  recs.splice(1, 0, { ...recs[0] });
  const r = new Report();
  checkDayFile(r, dayOpts(recs));
  assert.ok(hasText(r.items('FAIL'), 'repeat the start time'));
});

test('checkDayFile: sidecar coverage off by 0.01 fails', () => {
  const recs = run(DAY0, 5);
  const o = dayOpts(recs);
  o.sidecar.coverage = Math.round((o.sidecar.coverage + 0.01) * 1e4) / 1e4;
  const r = new Report();
  checkDayFile(r, o);
  assert.ok(hasText(r.items('FAIL'), '"coverage"'));
});

test('checkDayFile: availability line bytes wrong fails, right passes', () => {
  const recs = run(DAY0, 5);
  const o = dayOpts(recs);
  const line = { status: 'filling', coverage: o.sidecar.coverage, gapCount: 0, gapSeconds: 0, bytes: 2560 };
  let r = new Report();
  checkDayFile(r, { ...o, line });
  assert.deepEqual(r.items('FAIL'), []);
  r = new Report();
  checkDayFile(r, { ...o, line: { ...line, bytes: 2000 } });
  assert.ok(hasText(r.items('FAIL'), '"bytes" is 2000'));
});

test('coverageFits: a filling day accepts the coverage from the earlier run (updated minus delay)', () => {
  const recs = run(DAY0, 5);
  const earlier = T(0, 10); // an earlier run cut at 00:10
  const sidecar = { updated: iso(earlier + 2 * HOUR), coverage: describeDay(recs, { dayStartMs: DAY0, publicUntilMs: earlier }).coverage };
  const pu = DAY0 + 6 * HOUR;
  assert.notEqual(describeDay(recs, { dayStartMs: DAY0, publicUntilMs: pu }).coverage, sidecar.coverage);
  assert.ok(coverageFits(sidecar, recs, { dayMs: DAY0, publicUntilMs: pu, delayHours: 2 }));
  assert.ok(!coverageFits(sidecar, recs, { dayMs: DAY0, publicUntilMs: pu, delayHours: 0 }));
  assert.ok(!coverageFits({ ...sidecar, coverage: 0.9 }, recs, { dayMs: DAY0, publicUntilMs: pu, delayHours: 2 }));
});

// --- Report ----------------------------------------------------------------------------------

test('Report.check counts passes; the ok line shows only when nothing failed', () => {
  const r = new Report().section('S', '7.3');
  assert.equal(r.check('things are fine', [], 'a'), true);
  assert.equal(r.check('things are fine', [], 'b'), true);
  assert.match(r.toText(), /ok {4}things are fine \(2 checked\)/);
  assert.equal(r.passed, true);
  assert.equal(r.check('things are fine', ['broken'], 'c'), false);
  assert.doesNotMatch(r.toText(), /things are fine/);
  assert.equal(r.passed, false);
  assert.deepEqual(r.counts(), { FAIL: 1, WARN: 0, NOTE: 0 });
});

test('Report: the same problem in one section groups places; sections stay apart', () => {
  const r = new Report().section('A', '');
  r.fail('same', 'x'); r.fail('same', 'y'); r.fail('same', 'x');
  r.section('B', ''); r.fail('same', 'z');
  assert.equal(r.items('FAIL').length, 2);
  assert.deepEqual(r.items('FAIL')[0].where, ['x', 'y']);
  assert.deepEqual(r.counts(), { FAIL: 2, WARN: 0, NOTE: 0 });
});

test('Report.toText lists at most maxWhere places, then "and N more"', () => {
  const r = new Report().section('A', '');
  for (let i = 0; i < 8; i++) r.warn('problem', `place${i}`);
  const t = r.toText({ maxWhere: 3 });
  assert.match(t, /place2/);
  assert.doesNotMatch(t, /place3/);
  assert.match(t, /and 5 more/);
  assert.match(r.toText(), /and 3 more/); // default 5
});

test('Report: JSON output, empty section text, and passed with only WARN and NOTE', () => {
  const r = new Report().section('A', '7.1');
  r.warn('w', 'p'); r.note('n');
  assert.equal(r.passed, true);
  const j = r.toJSON();
  assert.equal(j.result, 'PASS');
  assert.equal(j.spec, '1.1');
  r.section('Empty', '');
  assert.match(r.toText(), /nothing to check/);
});

test('wrap keeps lines within the width', () => {
  const text = 'word '.repeat(60);
  const lines = wrap(text, 40, '  first ', '        ');
  assert.ok(lines.length > 1);
  for (const l of lines) assert.ok(l.length <= 40, l);
  assert.ok(lines[0].startsWith('  first '));
  assert.ok(lines[1].startsWith('        '));
  assert.deepEqual(wrap('', 40, '> ', '  '), ['> ']);
});
