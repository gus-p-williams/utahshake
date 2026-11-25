// miniSEED header reading and the day-file description (lib/mseed-index.js), against the
// rules of the UHSN data specification, version 1.1 (sections 5.2, 7.1, 7.3, 7.5 to 7.7).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

// The seisplotjs bundle registers a web component when loaded; stub it for node.
globalThis.HTMLElement ??= class {};
globalThis.customElements ??= { define() {}, get() {} };
const { miniseed } = await import('../docs/app/vendor/seisplotjs.js');
const {
  readRecordHeader, scanRecords, sortDedupe, cutAtCutoff, describeDay, gapTotals, byteRange,
  overlapping, sdsPath, utcDayStart, dayOfYear, isoMs, isoDay, nslc,
} = await import('../docs/app/js/lib/mseed-index.js');

const sample = fs.readFileSync(new URL('../docs/app/data/samples/qe-junction/waveforms.mseed', import.meta.url));
const sampleBytes = new Uint8Array(sample.buffer, sample.byteOffset, sample.length);

const DAY0 = Date.UTC(2026, 10, 24); // 2026-11-24, day 328
const T = (h, m = 0, s = 0, ms = 0) => DAY0 + h * 3600000 + m * 60000 + s * 1000 + ms;

/** A made-up record header: n samples at 100 per second starting at startMs. */
function rec(startMs, nSamples = 500, extra = {}) {
  const sampleRate = extra.sampleRate ?? 100;
  return { net: 'AM', sta: 'R1234', loc: '00', cha: 'EHZ', startMs, nSamples, sampleRate,
    recordLength: 512, encoding: 11, encodingName: 'STEIM2',
    endMs: startMs + (nSamples / sampleRate) * 1000, ...extra };
}
/** Back-to-back records from startMs. */
function run(startMs, count, nSamples = 500) {
  return Array.from({ length: count }, (_, i) => rec(startMs + i * nSamples * 10, nSamples));
}

/** A 512-byte miniSEED v2 record header written by hand (no samples). */
function makeRecord({ le = false, year = 2026, doy = 328, h = 14, m = 5, s = 9, ticks = 1234,
  nSamples = 400, factor = 100, mult = 1, activity = 0, correction = 0, micro = null,
  encoding = 11, exp = 9, b1000 = true } = {}) {
  const bytes = new Uint8Array(512);
  const v = new DataView(bytes.buffer);
  const put = (text, at) => { for (let i = 0; i < text.length; i++) bytes[at + i] = text.charCodeAt(i); };
  put('000001D ', 0);
  put('R1234', 8); put('00', 13); put('EHZ', 15); put('AM', 18);
  v.setUint16(20, year, le); v.setUint16(22, doy, le);
  bytes[24] = h; bytes[25] = m; bytes[26] = s;
  v.setUint16(28, ticks, le);
  v.setUint16(30, nSamples, le);
  v.setInt16(32, factor, le); v.setInt16(34, mult, le);
  bytes[36] = activity;
  bytes[39] = (b1000 ? 1 : 0) + (micro === null ? 0 : 1);
  v.setInt32(40, correction, le);
  v.setUint16(44, 64, le);
  v.setUint16(46, b1000 ? 48 : 0, le);
  if (b1000) {
    v.setUint16(48, 1000, le); v.setUint16(50, micro === null ? 0 : 56, le);
    bytes[52] = encoding; bytes[53] = le ? 0 : 1; bytes[54] = exp;
    if (micro !== null) { v.setUint16(56, 1001, le); v.setUint16(58, 0, le); v.setInt8(61, micro); }
  }
  return bytes;
}

test('headers agree with seisplotjs on the Junction sample (real UU records)', () => {
  const ours = scanRecords(sampleBytes);
  const theirs = miniseed.parseDataRecords(sample.buffer.slice(sample.byteOffset, sample.byteOffset + sample.length));
  assert.equal(ours.length, theirs.length);
  assert.equal(ours.length, sample.length / 512);
  ours.forEach((r, i) => {
    const h = theirs[i].header;
    assert.equal(r.offset, i * 512);
    assert.equal(nslc(r), `${h.netCode}.${h.staCode}.${h.locCode}.${h.chanCode}`.replace(/ /g, ''));
    assert.ok(Math.abs(r.startMs - h.startTime.toMillis()) < 1, `start of record ${i}`);
    assert.equal(r.nSamples, h.numSamples);
    assert.ok(Math.abs(r.sampleRate - h.sampleRate) < 1e-9);
    assert.equal(r.recordLength, 512);
    assert.equal(r.encodingName, 'STEIM2');
    assert.equal(r.littleEndian, false);
    assert.ok(Math.abs(r.endMs - (r.startMs + r.nSamples / r.sampleRate * 1000)) < 1e-6);
  });
});

test('readRecordHeader: start time with 0.0001 s ticks, blockette 1000, end of the last sample', () => {
  const r = readRecordHeader(makeRecord());
  assert.equal(nslc(r), 'AM.R1234.00.EHZ');
  assert.ok(Math.abs(r.startMs - (T(14, 5, 9) + 123.4)) < 1e-6);
  assert.equal(r.nSamples, 400);
  assert.equal(r.sampleRate, 100);
  assert.equal(r.encoding, 11);
  assert.equal(r.encodingName, 'STEIM2');
  assert.ok(Math.abs(r.endMs - (r.startMs + 4000)) < 1e-6);
  assert.equal(readRecordHeader(makeRecord({ exp: 12 })).recordLength, 4096);
  assert.equal(readRecordHeader(makeRecord({ encoding: 10 })).encodingName, 'STEIM1');
});

test('readRecordHeader: little-endian headers read the same', () => {
  const be = readRecordHeader(makeRecord({ micro: 50 }));
  const le = readRecordHeader(makeRecord({ le: true, micro: 50 }));
  assert.equal(le.littleEndian, true);
  for (const k of ['startMs', 'nSamples', 'sampleRate', 'recordLength', 'encoding', 'endMs']) {
    assert.equal(le[k], be[k], k);
  }
});

test('readRecordHeader: sample rate from factor and multiplier of either sign', () => {
  const rate = (factor, mult) => readRecordHeader(makeRecord({ factor, mult })).sampleRate;
  assert.equal(rate(100, 1), 100);
  assert.equal(rate(50, 2), 100);
  assert.equal(rate(100, -2), 50);      // divide by 2
  assert.equal(rate(-10, 1), 0.1);      // one sample every 10 s
  assert.ok(Math.abs(rate(-10, -2) - 0.05) < 1e-12);
});

test('readRecordHeader: microseconds (blockette 1001) and an unapplied time correction', () => {
  const base = readRecordHeader(makeRecord()).startMs;
  assert.ok(Math.abs(readRecordHeader(makeRecord({ micro: 50 })).startMs - (base + 0.05)) < 1e-6);
  assert.ok(Math.abs(readRecordHeader(makeRecord({ micro: -30 })).startMs - (base - 0.03)) < 1e-6);
  // 250 ticks = 25 ms, added only when the "time correction applied" flag (bit 1) is clear.
  assert.ok(Math.abs(readRecordHeader(makeRecord({ correction: 250 })).startMs - (base + 25)) < 1e-6);
  assert.ok(Math.abs(readRecordHeader(makeRecord({ correction: -250 })).startMs - (base - 25)) < 1e-6);
  assert.equal(readRecordHeader(makeRecord({ correction: 250, activity: 0x02 })).startMs, base);
});

test('readRecordHeader: no blockette 1000 means 512 bytes; not a record throws', () => {
  const r = readRecordHeader(makeRecord({ b1000: false }));
  assert.equal(r.recordLength, 512);
  assert.equal(r.encodingName, 'UNKNOWN');
  assert.throws(() => readRecordHeader(new Uint8Array(512)), /no miniSEED record/);
});

test('scanRecords: steps by each record\'s own length and stops at a cut-off record', () => {
  const big = new Uint8Array(4096);
  big.set(makeRecord({ exp: 12 }));
  const buf = new Uint8Array(512 + 4096 + 512 + 300);
  buf.set(makeRecord({ s: 1 }), 0);
  buf.set(big, 512);
  buf.set(makeRecord({ s: 3 }), 4608);
  buf.set(makeRecord({ s: 4 }).subarray(0, 300), 5120); // a download that ended mid-record
  const recs = scanRecords(buf);
  assert.deepEqual(recs.map((r) => r.offset), [0, 512, 4608]);
  assert.deepEqual(recs.map((r) => r.recordLength), [512, 4096, 512]);
  // A view into a larger buffer (as after a Range request) works too.
  assert.equal(scanRecords(buf.subarray(4608)).length, 1);
  assert.deepEqual(scanRecords(new Uint8Array(0)), []);
});

test('sortDedupe: time order, the first of two records with the same NSLC and start kept', () => {
  const a = rec(T(1), 500, { tag: 'a' });
  const b = rec(T(1, 0, 5), 500, { tag: 'b' });
  const b2 = rec(T(1, 0, 5), 300, { tag: 'b again' });
  const c = rec(T(1, 0, 10), 500, { tag: 'c' });
  const other = rec(T(1, 0, 5), 500, { cha: 'EHN', tag: 'other channel' });
  assert.deepEqual(sortDedupe([c, b, a, b2, other]).map((r) => r.tag), ['a', 'b', 'other channel', 'c']);
  assert.equal(sortDedupe([b, a])[0], a, 'the same objects, so attached bytes come along');
});

test('cutAtCutoff: a record is kept when its last sample ends at or before the cutoff', () => {
  const recs = run(T(13, 59, 50), 3); // end at 13:59:55, 14:00:00, 14:00:05
  assert.equal(cutAtCutoff(recs, T(14)).length, 2, 'ending exactly at the cutoff is inside');
  assert.equal(cutAtCutoff(recs, T(14) - 1).length, 1);
  assert.equal(cutAtCutoff(recs, T(15)).length, 3);
  assert.equal(cutAtCutoff(recs, T(13)).length, 0);
});

test('overlapping: the half-open window [t0, t1)', () => {
  const recs = run(T(1), 4); // 01:00:00, :05, :10, :15, each 5 s
  const starts = (t0, t1) => overlapping(recs, t0, t1).map((r) => (r.startMs - T(1)) / 1000);
  assert.deepEqual(starts(T(1, 0, 5), T(1, 0, 10)), [5]);
  assert.deepEqual(starts(T(1, 0, 4, 999), T(1, 0, 10, 1)), [0, 5, 10]);
  assert.deepEqual(starts(T(1, 0, 20), T(1, 0, 30)), []);
  assert.deepEqual(starts(T(0), T(1)), []);
});

test('describeDay: a gap is more than 1.5 sample intervals (15 ms at 100 per second)', () => {
  const day = (shift) => describeDay([rec(T(1)), rec(T(1, 0, 5) + shift), rec(T(1, 0, 10) + shift)],
    { dayStartMs: DAY0 });
  assert.deepEqual(day(0).gaps, []);
  assert.deepEqual(day(10).gaps, [], 'one sample late is not a gap');
  assert.deepEqual(day(15).gaps, [], 'exactly 1.5 intervals is not "more than"');
  assert.deepEqual(day(16).gaps, [[isoMs(T(1, 0, 5)), isoMs(T(1, 0, 5, 16))]]);
  assert.deepEqual(day(16).overlaps, []);
  const d = day(112000);
  assert.deepEqual(d.gaps, [['2026-11-24T01:00:05.000Z', '2026-11-24T01:01:57.000Z']]);
  assert.deepEqual(gapTotals(d.gaps), { gapCount: 1, gapSeconds: 112 });
});

test('describeDay: overlaps are listed apart from gaps; clock jitter is neither', () => {
  const jitter = describeDay([rec(T(1)), rec(T(1, 0, 5) - 0.3)], { dayStartMs: DAY0 });
  assert.deepEqual(jitter.overlaps, []);
  assert.deepEqual(jitter.gaps, []);
  const d = describeDay([rec(T(1)), rec(T(1, 0, 3)), rec(T(1, 0, 8))], { dayStartMs: DAY0 });
  assert.deepEqual(d.overlaps, [['2026-11-24T01:00:03.000Z', '2026-11-24T01:00:05.000Z']]);
  assert.deepEqual(d.gaps, []);
  // 13 s of ground covered once, out of a whole day
  assert.equal(d.coverage, Math.round((13 / 86400) * 10000) / 10000);
  assert.equal(d.lastSampleEnd, '2026-11-24T01:00:13.000Z');
});

test('describeDay: coverage over [day start, min(day end, publicUntil))', () => {
  const half = run(T(12), 8640); // 12:00 to 24:00
  const d = describeDay(half, { dayStartMs: DAY0 });
  assert.equal(d.coverage, 0.5);
  assert.equal(d.records, 8640);
  assert.equal(d.recordLength, 512);
  assert.equal(d.encoding, 'STEIM2');
  assert.equal(d.sampleRate, 100);
  assert.equal(d.firstSample, '2026-11-24T12:00:00.000Z');
  assert.equal(d.lastSampleEnd, '2026-11-25T00:00:00.000Z');

  // A day still filling: 00:00 to 04:00 present, cutoff at 04:00 -> complete so far.
  const morning = run(T(0), 2880);
  assert.equal(describeDay(morning, { dayStartMs: DAY0, publicUntilMs: T(4) }).coverage, 1);
  assert.equal(describeDay(morning, { dayStartMs: DAY0, publicUntilMs: T(8) }).coverage, 0.5);
  assert.equal(describeDay(morning, { dayStartMs: DAY0 }).coverage, Math.round((4 / 24) * 10000) / 10000);
  // A cutoff after the day ends changes nothing.
  assert.equal(describeDay(half, { dayStartMs: DAY0, publicUntilMs: T(30) }).coverage, 0.5);

  // Samples outside the day do not count: the last record runs 3 s past midnight.
  const late = [...run(T(23, 59, 50), 2), rec(T(24), 300)];
  assert.equal(describeDay(late.slice(0, 2), { dayStartMs: DAY0 }).coverage,
    describeDay([rec(T(23, 59, 50)), rec(T(23, 59, 55), 800)], { dayStartMs: DAY0 }).coverage);
  // ... and a record that started the day before counts only from 00:00.
  const early = describeDay([rec(DAY0 - 2000, 500)], { dayStartMs: DAY0, publicUntilMs: T(0, 0, 6) });
  assert.equal(early.coverage, 0.5);
  assert.equal(describeDay([], { dayStartMs: DAY0 }).coverage, 0);
});

test('describeDay: the seek table gives the first record starting at or after each mark', () => {
  // Records of 7 s from 00:00:03 to about 00:25, then a gap until 01:00:00 exactly.
  const recs = [...run(T(0, 0, 3), 215, 700), ...run(T(1), 3, 700)];
  const { seek } = describeDay(recs, { dayStartMs: DAY0 });
  assert.equal(seek.length, 7, 'marks 00:00 to 01:00; later marks have no record and are left out');
  assert.deepEqual(seek[0], ['2026-11-24T00:00:00.000Z', 0]);
  for (const [iso, off] of seek) {
    const mark = Date.parse(iso);
    assert.equal(off % 512, 0);
    const k = off / 512;
    assert.ok(recs[k].startMs >= mark, `${iso}: the record starts at or after the mark`);
    if (k > 0) assert.ok(recs[k - 1].startMs < mark, `${iso}: and it is the first to do so`);
  }
  // 00:30, 00:40, 00:50 fall in the gap: all point at the record that starts at 01:00:00,
  // and so does the 01:00 mark (a record starting exactly on a mark belongs to it).
  assert.deepEqual(seek.slice(3).map(([, off]) => off), [215 * 512, 215 * 512, 215 * 512, 215 * 512]);
  assert.equal(seek[6][0], '2026-11-24T01:00:00.000Z');
});

test('byteRange: one record back from the mark at or before t0, up to the first mark after t1', () => {
  const recs = run(T(0, 0, 3), 1000, 700); // 7 s records, 00:00:03 to 01:56:43
  const sidecar = describeDay(recs, { dayStartMs: DAY0 });
  const size = recs.length * 512;
  const mark = (h, m) => sidecar.seek.find(([t]) => Date.parse(t) === T(h, m))[1];

  // 00:25:10 to 00:27:00: the 00:20 mark, one record back; ends where the 00:30 mark starts.
  const r = byteRange(sidecar, T(0, 25, 10), T(0, 27));
  assert.deepEqual(r, { start: mark(0, 20) - 512, end: mark(0, 30) - 1 });
  assert.equal(r.start % 512, 0);
  // Every record that overlaps the window lies inside the range.
  for (const [i, x] of recs.entries()) {
    if (x.startMs < T(0, 27) && x.endMs > T(0, 25, 10)) {
      assert.ok(i * 512 >= r.start && i * 512 + 511 <= r.end);
    }
  }
  // t0 exactly on a mark still steps back: the record before holds samples after the mark.
  assert.equal(byteRange(sidecar, T(0, 20), T(0, 21)).start, mark(0, 20) - 512);
  assert.ok(recs[(mark(0, 10) - 512) / 512].endMs > T(0, 10));
  // t1 exactly on a mark: "the first mark after t1" is the next one.
  assert.equal(byteRange(sidecar, T(0, 21), T(0, 30)).end, mark(0, 40) - 1);
  // At the start of the file there is no record to step back to.
  assert.equal(byteRange(sidecar, T(0, 1), T(0, 2)).start, 0);
  // A window that began the day before starts at byte 0.
  assert.deepEqual(byteRange(sidecar, DAY0 - 60000, T(0, 5)), { start: 0, end: mark(0, 10) - 1 });
  // No mark after t1 (the last entry is 01:50): read to the end of the file.
  assert.equal(byteRange(sidecar, T(1, 45), T(1, 55)).end, size - 1);
  assert.equal(byteRange(sidecar, T(1, 45), T(1, 55), 600000).end, 599999, 'a given file size wins');
  // Outside the day's data.
  assert.equal(byteRange(sidecar, T(1, 56, 43), T(2)), null);
  assert.equal(byteRange(sidecar, T(5), T(6)), null);
  assert.equal(byteRange(sidecar, DAY0 - 60000, T(0, 0, 3)), null);
  assert.equal(byteRange({ records: 0, seek: [] }, T(0), T(1)), null);
  assert.equal(byteRange(null, T(0), T(1)), null);
});

test('byteRange: when the mark at or before t0 was left out, the last record is read', () => {
  // The last record starts at 00:19:55 and runs to 00:20:05, so the table ends at the
  // 00:10 mark, yet the first 5 s after 00:20 are in the file.
  const recs = [...run(T(0), 239), rec(T(0, 19, 55), 1000)];
  const sidecar = describeDay(recs, { dayStartMs: DAY0 });
  assert.equal(sidecar.seek.at(-1)[0], '2026-11-24T00:10:00.000Z');
  assert.deepEqual(byteRange(sidecar, T(0, 20, 1), T(0, 21)), { start: 239 * 512, end: 240 * 512 - 1 });
  assert.equal(byteRange(sidecar, T(0, 20, 5), T(0, 21)), null);
});

test('sdsPath, utcDayStart, dayOfYear, isoDay, isoMs', () => {
  const ch = { net: 'AM', sta: 'R1234', loc: '00', cha: 'EHZ' };
  assert.equal(sdsPath(ch, Date.UTC(2026, 10, 25, 14)), 'sds/2026/AM/R1234/EHZ.D/AM.R1234.00.EHZ.D.2026.329');
  assert.equal(sdsPath(ch, Date.UTC(2026, 0, 1)), 'sds/2026/AM/R1234/EHZ.D/AM.R1234.00.EHZ.D.2026.001');
  assert.equal(sdsPath({ ...ch, loc: '' }, Date.UTC(2028, 11, 31, 23, 59)),
    'sds/2028/AM/R1234/EHZ.D/AM.R1234..EHZ.D.2028.366');
  assert.equal(utcDayStart(Date.UTC(2026, 10, 25, 23, 59, 59, 999)), Date.UTC(2026, 10, 25));
  assert.equal(dayOfYear(Date.UTC(2026, 10, 25)), 329);
  assert.equal(dayOfYear(Date.UTC(2026, 11, 31, 23)), 365);
  assert.equal(isoDay(Date.UTC(2026, 10, 25, 23, 59)), '2026-11-25');
  assert.equal(isoMs(Date.UTC(2026, 10, 25, 14) + 0.4), '2026-11-25T14:00:00.000Z');
});
