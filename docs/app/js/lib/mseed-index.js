// Finding your way around a miniSEED day file without decoding it.
//
// A seismometer's data are stored as miniSEED: a row of fixed-size blocks called records
// (512 bytes on a Raspberry Shake and on University of Utah stations). Each record starts
// with a 48-byte header that says which station and channel it belongs to, when its first
// sample was taken, how many samples it holds and how fast they were taken. The samples
// themselves follow, compressed.
//
// A whole day of one channel is 6 to 15 MB, far too much to download just to look at two
// minutes around a quake. But the headers alone tell us where every record sits in time, so
// a small description of the day (the "sidecar", a JSON file beside the day file) can list
// the gaps and give a table of "the data for 14:10 start at byte 4,345,856". A reader then
// asks the web server for only those bytes.
//
// This module reads headers (never samples) and builds or uses that description, following
// the UHSN data specification, draft 0.2 (planning/spec-uhsn-data.md, sections 5.2, 7.1,
// 7.3 and 7.7). Both sides use it: the script that makes a day's sidecar
// (tools/uhsn-test/make-tree.mjs, a first reference for DRI's publish step) and the reader
// in the browser (js/data/uhsn.js). Pure functions, no imports; works in node and browsers.
//
// Times are milliseconds since 1970 (UTC). They may carry a fraction: miniSEED keeps time to
// 0.0001 s, or to a microsecond when blockette 1001 is present.
//
// Choices made where the specification leaves room (each is also noted at its function):
//   - a record "ends" at the end of its last sample: start + samples / rate (7.7);
//   - a record is inside a cutoff when that end is at or before the cutoff (<=), because the
//     record then fills the half-open interval [start, end) and nothing of it is later;
//   - an overlap is listed when a record starts more than half a sample interval before the
//     data so far end (clocks jitter by microseconds; that is not an overlap);
//   - gaps are listed between records only. Time missing before the day's first record or
//     after its last shows in `coverage`, not in `gaps`.

const DAY_MS = 86400000;
const MARK_MS = 600000; // the seek table has one entry per 10 minutes
const HEADER_BYTES = 48;
const DEFAULT_RECORD_LENGTH = 512;

const ENCODINGS = {
  0: 'ASCII', 1: 'INT16', 2: 'INT24', 3: 'INT32', 4: 'FLOAT32', 5: 'FLOAT64',
  10: 'STEIM1', 11: 'STEIM2', 19: 'STEIM3',
};

/**
 * @typedef {Object} RecordHeader
 * @property {number} offset        byte position of the record in the buffer it was read from
 * @property {string} net
 * @property {string} sta
 * @property {string} loc           '' when the header has blanks
 * @property {string} cha
 * @property {number} startMs       time of the first sample
 * @property {number} nSamples
 * @property {number} sampleRate    samples per second
 * @property {number} recordLength  bytes
 * @property {number} encoding      SEED code, e.g. 11
 * @property {string} encodingName  e.g. 'STEIM2'
 * @property {number} endMs         end of the last sample = startMs + nSamples / sampleRate
 * @property {boolean} littleEndian byte order of the header
 */

/** "NET.STA.LOC.CHA" for a record or request. */
export function nslc({ net, sta, loc, cha }) {
  return `${net}.${sta}.${loc ?? ''}.${cha}`;
}

/** ISO 8601 with milliseconds and Z, e.g. "2026-11-25T14:00:00.000Z" (spec 6.3). */
export function isoMs(ms) {
  return new Date(Math.round(ms)).toISOString();
}

/** 00:00 UTC of the day that holds this time. */
export function utcDayStart(ms) {
  return Math.floor(ms / DAY_MS) * DAY_MS;
}

/** Day of the year in UTC, 1 for January 1. */
export function dayOfYear(ms) {
  const year = new Date(ms).getUTCFullYear();
  return Math.floor((utcDayStart(ms) - Date.UTC(year, 0, 1)) / DAY_MS) + 1;
}

/** "YYYY-MM-DD" of the UTC day that holds this time. */
export function isoDay(ms) {
  return new Date(utcDayStart(ms)).toISOString().slice(0, 10);
}

/**
 * Where a channel's day file lives in the public tree (spec 7.1), relative to its base:
 * sds/<YYYY>/<NET>/<STA>/<CHA>.D/<NET>.<STA>.<LOC>.<CHA>.D.<YYYY>.<DDD>
 * The sidecar is the same path plus ".json".
 */
export function sdsPath({ net, sta, loc, cha }, dayMs) {
  const year = new Date(dayMs).getUTCFullYear();
  const ddd = String(dayOfYear(dayMs)).padStart(3, '0');
  return `sds/${year}/${net}/${sta}/${cha}.D/${net}.${sta}.${loc ?? ''}.${cha}.D.${year}.${ddd}`;
}

function ascii(bytes, from, to) {
  let s = '';
  for (let i = from; i < to; i++) s += String.fromCharCode(bytes[i]);
  return s.trim();
}

/** Does a miniSEED v2 data record start here? Six digits (or blanks), then D, R, Q or M. */
function looksLikeRecord(bytes, offset) {
  if (offset + HEADER_BYTES > bytes.length) return false;
  for (let i = 0; i < 6; i++) {
    const c = bytes[offset + i];
    if (!((c >= 48 && c <= 57) || c === 32 || c === 0)) return false;
  }
  return 'DRQM'.includes(String.fromCharCode(bytes[offset + 6]));
}

/**
 * Read one record's header. Nothing is decoded: this only looks at the fixed 48 bytes and
 * the short "blockettes" after them.
 *
 * What it takes care of:
 *   - byte order: old files are big-endian, some writers use little-endian. The year tells
 *     them apart (2026 read the wrong way round is 59911);
 *   - the start time: year, day of year, h, m, s and a count of 0.0001 s, plus microseconds
 *     from blockette 1001 when present;
 *   - a time correction (field 16, in 0.0001 s) that the writer recorded but did not apply
 *     (activity flag bit 1 clear): added here;
 *   - the sample rate from its factor and multiplier (negative values mean "divide"), or the
 *     exact rate from blockette 100 when present;
 *   - blockette 1000: how the samples are packed and the record's length (a power of two).
 *     Without it the record is taken to be 512 bytes.
 *
 * @param {Uint8Array} bytes
 * @param {number} [offset]
 * @returns {RecordHeader}
 */
export function readRecordHeader(bytes, offset = 0) {
  if (!looksLikeRecord(bytes, offset)) {
    throw new Error(`no miniSEED record at byte ${offset}`);
  }
  const view = new DataView(bytes.buffer, bytes.byteOffset + offset,
    Math.min(bytes.length - offset, 4096));
  const yearBE = view.getUint16(20, false);
  const dayBE = view.getUint16(22, false);
  const le = !(yearBE >= 1900 && yearBE <= 2100 && dayBE >= 1 && dayBE <= 366);

  const year = view.getUint16(20, le);
  const doy = view.getUint16(22, le);
  const ticks = view.getUint16(28, le); // 0.0001 s
  let startMs = Date.UTC(year, 0, 1) + (doy - 1) * DAY_MS
    + view.getUint8(24) * 3600000 + view.getUint8(25) * 60000 + view.getUint8(26) * 1000
    + ticks / 10;

  const nSamples = view.getUint16(30, le);
  const factor = view.getInt16(32, le);
  const mult = view.getInt16(34, le);
  let sampleRate = 0;
  if (factor !== 0 && mult !== 0) {
    const f = factor > 0 ? factor : -1 / factor;
    const m = mult > 0 ? mult : -1 / mult;
    sampleRate = f * m;
  }

  const correctionApplied = (view.getUint8(36) & 0x02) !== 0;
  const correction = view.getInt32(40, le); // 0.0001 s
  if (!correctionApplied && correction !== 0) startMs += correction / 10;

  let encoding = 11;
  let recordLength = DEFAULT_RECORD_LENGTH;
  let hasB1000 = false;
  let next = view.getUint16(46, le);
  for (let guard = view.getUint8(39) || 8; guard > 0 && next >= HEADER_BYTES && next + 4 <= view.byteLength; guard--) {
    const type = view.getUint16(next, le);
    const following = view.getUint16(next + 2, le);
    if (type === 1000 && next + 8 <= view.byteLength) {
      encoding = view.getUint8(next + 4);
      const exp = view.getUint8(next + 6);
      if (exp >= 8 && exp <= 20) recordLength = 2 ** exp;
      hasB1000 = true;
    } else if (type === 1001 && next + 8 <= view.byteLength) {
      startMs += view.getInt8(next + 5) / 1000; // microseconds
    } else if (type === 100 && next + 8 <= view.byteLength) {
      const actual = view.getFloat32(next + 4, le);
      if (actual > 0 && Number.isFinite(actual)) sampleRate = actual;
    }
    if (following <= next) break;
    next = following;
  }

  return {
    offset,
    net: ascii(bytes, offset + 18, offset + 20),
    sta: ascii(bytes, offset + 8, offset + 13),
    loc: ascii(bytes, offset + 13, offset + 15),
    cha: ascii(bytes, offset + 15, offset + 18),
    startMs,
    nSamples,
    sampleRate,
    recordLength,
    encoding,
    encodingName: hasB1000 ? (ENCODINGS[encoding] ?? `ENCODING${encoding}`) : 'UNKNOWN',
    endMs: sampleRate > 0 ? startMs + (nSamples / sampleRate) * 1000 : startMs,
    littleEndian: le,
  };
}

/**
 * The headers of every record in a buffer, in file order. Each record says how long it is,
 * so the scan steps from one to the next. It stops at the first place that is not a whole
 * record (the end, a cut-off last record, or bytes that are not miniSEED).
 * @param {Uint8Array} bytes
 * @returns {RecordHeader[]}
 */
export function scanRecords(bytes) {
  const out = [];
  let offset = 0;
  while (looksLikeRecord(bytes, offset)) {
    const h = readRecordHeader(bytes, offset);
    if (offset + h.recordLength > bytes.length) break;
    out.push(h);
    offset += h.recordLength;
  }
  return out;
}

const tick = (ms) => Math.round(ms * 10); // 0.0001 s: the header's own time step

/**
 * Put records in time order and drop duplicates: a second record with the same NSLC and
 * start time (spec 5.2, step 3). Duplicates appear when hourly pieces or a backfill bring
 * the same record twice; the first copy is kept. Returns a new array of the same objects, so
 * anything a caller attached to a record (its bytes, say) comes along.
 */
export function sortDedupe(records) {
  const sorted = records.map((r, i) => [r, i])
    .sort((a, b) => a[0].startMs - b[0].startMs || a[1] - b[1]).map(([r]) => r);
  const seen = new Set();
  return sorted.filter((r) => {
    const key = `${nslc(r)}|${tick(r.startMs)}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/**
 * The publish step's cutoff (spec 5.2, step 2): keep only whole records whose last sample
 * ends at or before the cutoff. "At or before" (<=), not "before": a record covers the
 * half-open interval [startMs, endMs), so one with endMs equal to the cutoff holds nothing
 * at or after it. This also matches 7.5 (lastSample <= publicUntil) and the acceptance test
 * in 5.4 ("no record ends after publicUntil").
 */
export function cutAtCutoff(records, cutoffMs) {
  return records.filter((r) => r.endMs <= cutoffMs);
}

/** The records whose header times overlap the half-open window [t0, t1). */
export function overlapping(records, t0Ms, t1Ms) {
  return records.filter((r) => r.startMs < t1Ms && r.endMs > t0Ms);
}

/**
 * Describe one channel's day file from its record headers: the data fields of the sidecar
 * (spec 7.7), by the rules of 7.3. The caller adds version, id, day and updated.
 *
 * @param {RecordHeader[]} records  the day file's records in file order (time order, no
 *   duplicates: run sortDedupe first)
 * @param {object} o
 * @param {number} o.dayStartMs      00:00 UTC of the day
 * @param {number} [o.publicUntilMs] the cutoff, when it falls inside the day: coverage is
 *   then counted over [day start, cutoff) only, so a day still filling can read 1.0
 * @returns {{records:number, recordLength:number|null, encoding:string|null,
 *   sampleRate:number|null, firstSample:string|null, lastSampleEnd:string|null,
 *   coverage:number, gaps:[string,string][], overlaps:[string,string][],
 *   seek:[string,number][]}}
 *
 * - gaps: more than 1.5 sample intervals between the end of the data so far and the next
 *   record's first sample, as [gapStart, gapEnd).
 * - overlaps: the next record starts more than half an interval before the data so far end,
 *   as [start of that record, end of the doubled stretch).
 * - coverage: samples present (each instant counted once) ÷ samples expected in
 *   [day start, min(day end, publicUntil)), 0 to 1, 4 decimals.
 * - seek: for each 10-minute mark of the day, [mark, byte offset of the first record that
 *   starts at or after the mark]. Marks later than the last record's start have no such
 *   record and are left out.
 */
export function describeDay(records, { dayStartMs, publicUntilMs }) {
  const dayEndMs = dayStartMs + DAY_MS;
  const spanEnd = Math.min(dayEndMs, publicUntilMs ?? Infinity);
  if (!records.length) {
    return { records: 0, recordLength: null, encoding: null, sampleRate: null,
      firstSample: null, lastSampleEnd: null, coverage: 0, gaps: [], overlaps: [], seek: [] };
  }
  const sampleRate = records[0].sampleRate;
  const dt = 1000 / sampleRate;
  const gaps = [];
  const overlaps = [];
  const seek = [];
  let covered = -Infinity; // end of the data so far
  let present = 0;
  let offset = 0;
  let mark = dayStartMs;

  for (const r of records) {
    // The seek table: this record is the first to start at or after every mark up to its start.
    while (mark < dayEndMs && mark <= r.startMs) {
      seek.push([isoMs(mark), offset]);
      mark += MARK_MS;
    }
    offset += r.recordLength;

    if (covered !== -Infinity) {
      if (r.startMs - covered > 1.5 * dt) gaps.push([isoMs(covered), isoMs(r.startMs)]);
      else if (covered - r.startMs > 0.5 * dt) {
        overlaps.push([isoMs(r.startMs), isoMs(Math.min(r.endMs, covered))]);
      }
    }

    // Samples of this record inside [day start, span end) and not already counted. Sample i
    // is at startMs + i * dt. One within half an interval of the data so far is the same
    // instant recorded twice.
    const fromCovered = covered === -Infinity ? 0 : Math.ceil((covered - r.startMs) / dt - 0.5);
    const fromDay = Math.ceil((dayStartMs - r.startMs) / dt - 1e-6);
    const i0 = Math.max(0, fromCovered, fromDay);
    const i1 = Math.min(r.nSamples, Math.ceil((spanEnd - r.startMs) / dt - 1e-6));
    if (i1 > i0) present += i1 - i0;

    if (r.endMs > covered) covered = r.endMs;
  }

  const expected = Math.max(0, (spanEnd - dayStartMs) / dt);
  const coverage = expected > 0 ? Math.min(1, present / expected) : 0;
  return {
    records: records.length,
    recordLength: records[0].recordLength,
    encoding: records[0].encodingName,
    sampleRate,
    firstSample: isoMs(Math.min(...records.slice(0, 50).map((r) => r.startMs))),
    lastSampleEnd: isoMs(covered),
    coverage: Math.round(coverage * 10000) / 10000,
    gaps,
    overlaps,
    seek,
  };
}

/** Number of gaps and their total length in seconds, for the availability file (spec 7.6). */
export function gapTotals(gaps) {
  let ms = 0;
  for (const [a, b] of gaps) ms += Date.parse(b) - Date.parse(a);
  return { gapCount: gaps.length, gapSeconds: Math.round(ms) / 1000 };
}

/**
 * Which bytes of a day file to ask for to read the window [t0, t1): the reader's rule in
 * spec 7.7.
 *
 *   start: take the seek entry for the last 10-minute mark at or before t0 and step back
 *          one record, because a record that starts just before the mark can hold samples
 *          after it;
 *   end:   read up to the offset of the first mark after t1, or to the end of the file.
 *
 * Two cases the rule does not spell out:
 *   - t0 is before the day's first mark (the window began the day before): start at byte 0;
 *   - the mark at or before t0 was left out of the table, because no record starts at or
 *     after it. Then only the file's last record can reach t0, so start there.
 *
 * The file's size is records × recordLength unless given. The range always starts on a
 * record boundary. It may hold records outside the window: keep only overlapping() ones.
 *
 * @param {object} sidecar  spec 7.7
 * @param {number} t0Ms
 * @param {number} t1Ms
 * @param {number} [fileSize] bytes, if known
 * @returns {{start:number, end:number}|null} inclusive byte positions for an HTTP Range
 *   header ("bytes=start-end"), or null when the window is outside the day's data
 */
export function byteRange(sidecar, t0Ms, t1Ms, fileSize) {
  if (!sidecar || !sidecar.records || !sidecar.seek?.length) return null;
  const first = Date.parse(sidecar.firstSample);
  const last = Date.parse(sidecar.lastSampleEnd);
  if (!(t1Ms > t0Ms) || t1Ms <= first || t0Ms >= last) return null;
  const recLen = sidecar.recordLength || DEFAULT_RECORD_LENGTH;
  const size = fileSize ?? sidecar.records * recLen;
  const marks = sidecar.seek.map(([t, off]) => [Date.parse(t), off]);

  let start;
  const firstMark = marks[0][0];
  const lastMark = marks[marks.length - 1][0];
  if (t0Ms < firstMark) start = 0;
  else if (t0Ms >= lastMark + MARK_MS) start = Math.max(0, size - recLen);
  else {
    let k = 0;
    while (k + 1 < marks.length && marks[k + 1][0] <= t0Ms) k++;
    start = Math.max(0, marks[k][1] - recLen);
  }

  let end = size;
  for (const [t, off] of marks) {
    if (t > t1Ms) { end = off; break; }
  }
  end = Math.min(end, size);
  if (end <= start) return null;
  return { start, end: end - 1 };
}
