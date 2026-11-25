// A day of record for the School Shake Viewer: local time, notes on the record, hourly noise
// levels, quake arrival times and the CSV of a chosen window.
//
// Seismic data are kept in UTC, but a school runs on Mountain time: the first bell is at 8:00
// local, which is 15:00 UTC in winter and 14:00 UTC in summer. So the viewer shows a local day
// (midnight to midnight, Mountain time) when it fetches data itself, and the file's own UTC day
// when a teacher opens a day file from the Shake. Every time on screen is local.
//
// Notes ("annotations") are the class's own record of what happened: bells, buses, a game, a
// drop experiment, a quake. They are tied to one station and kept as a small JSON file that the
// teacher downloads and opens again; nothing is uploaded. No student names: a note says what
// happened, not who did it.
//
// Pure functions (no page, no network); tests in tests/day-view.test.js.
import { distanceKm } from './geo.js';
import { distanceDeg, bodyWaveTimes } from './teleseism.js';
import { stepLevels } from './carpet.js';

/** One CSV line (the same rule as csvRow in ui/page.js; lib modules don't import the UI). */
const csvRow = (values) => values.map((v) => {
  const s = v == null ? '' : String(v);
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}).join(',');

export const TIME_ZONE = 'America/Denver';
export const DAY_MS = 86400000;
export const HOUR_MS = 3600000;

// --- Time zones ----------------------------------------------------------------------------

const partsFormats = new Map();
function partsFormat(timeZone) {
  if (!partsFormats.has(timeZone)) {
    partsFormats.set(timeZone, new Intl.DateTimeFormat('en-US', {
      timeZone, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit',
    }));
  }
  return partsFormats.get(timeZone);
}

/** The local calendar fields of a moment: {year, month (1-12), day, hour, minute, second}. */
export function localParts(ms, timeZone = TIME_ZONE) {
  const p = {};
  for (const { type, value } of partsFormat(timeZone).formatToParts(new Date(ms))) p[type] = Number(value);
  return { year: p.year, month: p.month, day: p.day, hour: p.hour % 24, minute: p.minute, second: p.second };
}

/** How far a time zone is from UTC at a moment, in minutes (Mountain: -420 in winter, -360 in summer). */
export function tzOffsetMin(ms, timeZone = TIME_ZONE) {
  const p = localParts(ms, timeZone);
  const asUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
  return Math.round((asUtc - Math.floor(ms / 1000) * 1000) / 60000);
}

/** 'YYYY-MM-DD': the local date of a moment. */
export function localDate(ms, timeZone = TIME_ZONE) {
  const p = localParts(ms, timeZone);
  return `${p.year}-${String(p.month).padStart(2, '0')}-${String(p.day).padStart(2, '0')}`;
}

/**
 * The moment (UTC ms) a local clock reads `timeStr` ('HH:MM' or 'HH:MM:SS', 24-hour) on the
 * date 'YYYY-MM-DD'. NaN if either can't be read.
 */
export function localDateTime(dateStr, timeStr = '00:00', timeZone = TIME_ZONE) {
  const [y, m, d] = String(dateStr).split('-').map(Number);
  const [hh, mm = 0, ss = 0] = String(timeStr).split(':').map(Number);
  if (![y, m, d, hh, mm, ss].every(Number.isFinite)) return NaN;
  const naive = Date.UTC(y, m - 1, d, hh, mm, Math.floor(ss), Math.round((ss % 1) * 1000));
  let t = naive;
  // The offset at the answer can differ from the offset at the first guess near a clock
  // change, so settle it in a few rounds.
  for (let i = 0; i < 3; i++) t = naive - tzOffsetMin(t, timeZone) * 60000;
  return t;
}

/** The moment (UTC ms) local midnight starts the date 'YYYY-MM-DD'. */
export function localMidnight(dateStr, timeZone = TIME_ZONE) {
  return localDateTime(dateStr, '00:00', timeZone);
}

/** 'HH:MM:SS' (24-hour), the local clock time of a moment, for <input type="time">. */
export function localTimeString(ms, timeZone = TIME_ZONE) {
  const p = localParts(ms, timeZone);
  return [p.hour, p.minute, p.second].map((v) => String(v).padStart(2, '0')).join(':');
}

/** A local day as [startMs, endMs): 24 hours, or 23 / 25 on the days the clocks change. */
export function localDay(dateStr, timeZone = TIME_ZONE) {
  const [y, m, d] = dateStr.split('-').map(Number);
  const next = new Date(Date.UTC(y, m - 1, d + 1)).toISOString().slice(0, 10);
  return { startMs: localMidnight(dateStr, timeZone), endMs: localMidnight(next, timeZone) };
}

/** A UTC day as [startMs, endMs). */
export function utcDay(ms) {
  const startMs = Math.floor(ms / DAY_MS) * DAY_MS;
  return { startMs, endMs: startMs + DAY_MS };
}

/** 'YYYY-MM-DD' shifted by n days (calendar arithmetic, no time zone). */
export function addDays(dateStr, n) {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10);
}

// --- The helicorder ----------------------------------------------------------------------------

/**
 * Which line and moment of a helicorder a point on it is. Lines are `rows` (from
 * helicorderRows), each `rowMs` long, drawn `rowH` px apart from `top`, across `plotW` px from
 * `left`. Returns null outside the lines or past the end of a short last line.
 */
export function timeAtPoint(x, y, { left, top, plotW, rowH, rowMs, rows }) {
  const i = Math.floor((y - top) / rowH);
  if (i < 0 || i >= rows.length || x < left - 2 || x > left + plotW + 2) return null;
  const f = Math.min(1, Math.max(0, (x - left) / plotW));
  const ms = rows[i].startMs + f * rowMs;
  return ms < rows[i].endMs ? { row: i, ms } : null;
}

/** The line a moment falls on, and how far across it (0..1), or null. */
export function pointAtTime(ms, rows, rowMs) {
  for (let i = 0; i < rows.length; i++) {
    if (ms >= rows[i].startMs && ms < rows[i].endMs) return { row: i, f: (ms - rows[i].startMs) / rowMs };
  }
  return null;
}

/**
 * The parts of each line a note (or any span) covers: [{row, f0, f1}] with f0..f1 the
 * fractions of a full line (a point note has f0 === f1). Spans are [start, end).
 */
export function spanSegments(startMs, endMs, rows, rowMs) {
  const out = [];
  if (endMs == null || endMs <= startMs) {
    const p = pointAtTime(startMs, rows, rowMs);
    return p ? [{ row: p.row, f0: p.f, f1: p.f }] : [];
  }
  rows.forEach((r, row) => {
    const a = Math.max(startMs, r.startMs);
    const b = Math.min(endMs, r.endMs);
    if (b > a) out.push({ row, f0: (a - r.startMs) / rowMs, f1: (b - r.startMs) / rowMs });
  });
  return out;
}

/**
 * A zoom window of spanSec centered on a moment, kept inside [lo, hi) (the day shown).
 * @returns {{startMs: number, endMs: number}}
 */
export function zoomWindow(centerMs, spanSec, lo, hi) {
  const span = Math.min(spanSec * 1000, hi - lo);
  let startMs = Math.round(centerMs - span / 2);
  startMs = Math.max(lo, Math.min(startMs, hi - span));
  return { startMs, endMs: startMs + span };
}

/**
 * The background shaking of a record: the median of its 1-minute RMS values (the carpet's
 * measure, lib/carpet.js), in the record's units. NaN with less than a minute of data.
 */
export function backgroundLevel(data, sampleRate) {
  const nWin = Math.floor(data.length / (60 * sampleRate));
  if (nWin < 1) return NaN;
  return stepLevels(data, sampleRate, 60, nWin)[0];
}

/**
 * How many counts move the helicorder's pen by one line spacing. With gain 1, the usual
 * background shaking fills about a tenth of the space between lines and a burst ten times
 * louder spills onto its neighbors: the scale of the helicorder on the science page
 * ("Beyond one seismogram"). Gain 2 draws everything twice as big.
 */
export function countsPerLine(background, gain = 1) {
  const bg = Number.isFinite(background) && background > 0 ? background : 1;
  return (3.5 * bg) / 0.12 / gain;
}

/**
 * Hourly noise levels: the median of the 1-minute RMS values in each hour (lib/carpet.js,
 * stepLevels). The record must start on the hour. NaN for an hour with no good minute.
 * @param {ArrayLike<number>} filtered the record, already filtered to a band
 */
export function hourlyLevels(filtered, sampleRate) {
  return stepLevels(filtered, sampleRate, 60, 60);
}

// --- Notes ----------------------------------------------------------------------------------

/** The kinds of note, in legend order (review section 4.1). Colors live in the page's CSS. */
export const NOTE_KINDS = Object.freeze([
  Object.freeze({ id: 'school', label: 'School day and bells' }),
  Object.freeze({ id: 'traffic', label: 'Buses and traffic' }),
  Object.freeze({ id: 'event', label: 'Games and events' }),
  Object.freeze({ id: 'experiment', label: 'Class experiments' }),
  Object.freeze({ id: 'quake', label: 'Quakes' }),
  Object.freeze({ id: 'weather', label: 'Weather' }),
  Object.freeze({ id: 'station', label: 'Station work' }),
  Object.freeze({ id: 'other', label: 'Other' }),
]);
const KIND_IDS = new Set(NOTE_KINDS.map((k) => k.id));
export const NOTES_FORMAT = 'uhsn-notes';
export const MAX_NOTES = 2000;
export const MAX_LABEL = 120;
export const MAX_SOURCE = 300;

/** A note's text, made safe to keep: control characters removed, spaces tidied, cut to `max`. */
export function cleanText(s, max = MAX_LABEL) {
  // eslint-disable-next-line no-control-regex
  return String(s ?? '').replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max);
}

const isoOrNull = (ms) => (Number.isFinite(ms) ? new Date(ms).toISOString() : null);
const msOf = (v) => (v == null || v === '' ? null : Date.parse(v));

let nextId = 1;
/** A new note id, unique on this page. */
export const newNoteId = () => `n${Date.now().toString(36)}${(nextId++).toString(36)}`;

/**
 * A note from its fields, checked: {id, start, end, kind, label, source, p, s} with times in
 * ms (end, p, s null if not given). Returns null if start is not a time or end is before it.
 */
export function makeNote({ id, start, end = null, kind = 'other', label = '', source = '', p = null, s = null }) {
  const startMs = typeof start === 'number' ? start : msOf(start);
  const endMs = end == null ? null : (typeof end === 'number' ? end : msOf(end));
  if (!Number.isFinite(startMs)) return null;
  if (endMs != null && !(Number.isFinite(endMs) && endMs >= startMs)) return null;
  const pMs = p == null ? null : (typeof p === 'number' ? p : msOf(p));
  const sMs = s == null ? null : (typeof s === 'number' ? s : msOf(s));
  return {
    id: id ? cleanText(id, 40) : newNoteId(),
    start: startMs,
    end: endMs === startMs ? null : endMs,
    kind: KIND_IDS.has(kind) ? kind : 'other',
    label: cleanText(label),
    source: cleanText(source, MAX_SOURCE),
    p: Number.isFinite(pMs) ? pMs : null,
    s: Number.isFinite(sMs) ? sMs : null,
  };
}

/**
 * Read a notes file (JSON text or object):
 *   { "version": 1, "format": "uhsn-notes", "station": "UU.HEB", "title": "…",
 *     "notes": [ { "start": ISO, "end": ISO or null, "kind": "school", "label": "…",
 *                  "source": "…", "p": ISO, "s": ISO } ] }
 * Times are UTC (ISO 8601). Unknown kinds become "other"; unknown fields are ignored; notes
 * that can't be read are skipped and counted.
 * @returns {{station: string, title: string, notes: object[], skipped: number}}
 * @throws {Error} with a plain message if this is not a notes file
 */
export function parseNotesFile(input) {
  let obj = input;
  if (typeof input === 'string') {
    try { obj = JSON.parse(input); } catch { throw new Error('This file is not a notes file (it is not JSON).'); }
  }
  if (!obj || typeof obj !== 'object' || !Array.isArray(obj.notes)) {
    throw new Error('This file is not a notes file (it has no "notes" list).');
  }
  if (obj.version !== 1) throw new Error(`This notes file is version ${obj.version}; this page reads version 1.`);
  if (obj.notes.length > MAX_NOTES) throw new Error(`This notes file has ${obj.notes.length} notes; the limit is ${MAX_NOTES}.`);
  const notes = [];
  let skipped = 0;
  for (const raw of obj.notes) {
    const n = raw && typeof raw === 'object' ? makeNote(raw) : null;
    if (n) notes.push(n); else skipped++;
  }
  notes.sort((a, b) => a.start - b.start);
  return { station: cleanText(obj.station, 40), title: cleanText(obj.title, 200), notes, skipped };
}

/** The notes as a file to download (the format parseNotesFile reads). */
export function notesFile({ station = '', title = '', notes = [], generatedMs = Date.now() }) {
  return {
    version: 1,
    format: NOTES_FORMAT,
    station,
    title,
    generated: isoOrNull(generatedMs),
    timeNote: 'Times are UTC (ISO 8601). The School Shake Viewer shows them in Mountain time.',
    notes: [...notes].sort((a, b) => a.start - b.start).map((n) => {
      const out = { start: isoOrNull(n.start), end: isoOrNull(n.end), kind: n.kind, label: n.label };
      if (n.source) out.source = n.source;
      if (n.p != null) out.p = isoOrNull(n.p);
      if (n.s != null) out.s = isoOrNull(n.s);
      return out;
    }),
  };
}

/** The notes that touch [startMs, endMs) (a point note at its start; a quake also at its S). */
export function notesInWindow(notes, startMs, endMs) {
  return notes.filter((n) => {
    const a = n.start;
    const b = Math.max(n.end ?? a, n.s ?? a);
    return b >= startMs && a < endMs;
  });
}

// --- Quakes ---------------------------------------------------------------------------------

/** Within this distance the viewer uses straight-line travel at Quake Locator's speeds. */
export const LOCAL_KM = 150;

/**
 * When a quake's P and S waves should reach a station. Near quakes (within LOCAL_KM): straight
 * lines from the focus at vp and vs (Quake Locator's calibrated 5.8 and 3.3 km/s). Farther: the
 * iasp91 table (Quake Explorer's distant quakes), if given.
 * @param {{timeMs:number, lat:number, lon:number, depthKm:number}} ev
 * @param {{lat:number, lon:number}} st
 * @param {{vp:number, vs:number, table?:object}} opt
 * @returns {{distKm:number, pMs:number, sMs:number, model:string}|null} null if no model applies
 */
export function predictedArrivals(ev, st, { vp, vs, table } = {}) {
  if (![ev?.lat, ev?.lon, st?.lat, st?.lon].every(Number.isFinite)) return null;
  const distKm = distanceKm(st.lat, st.lon, ev.lat, ev.lon);
  const depth = Number.isFinite(ev.depthKm) ? Math.max(0, ev.depthKm) : 0;
  if (distKm <= LOCAL_KM && vp > 0 && vs > 0) {
    const hyp = Math.hypot(distKm, depth);
    return { distKm, pMs: ev.timeMs + (hyp / vp) * 1000, sMs: ev.timeMs + (hyp / vs) * 1000, model: 'straight' };
  }
  if (!table) return null;
  const t = bodyWaveTimes(table, distanceDeg(st.lat, st.lon, ev.lat, ev.lon), depth);
  return { distKm, pMs: ev.timeMs + t.P * 1000, sMs: ev.timeMs + t.S * 1000, model: 'iasp91' };
}

/** A quake as a note: at the origin time, with predicted P and S when the station is known. */
export function quakeNote(ev, st, opt) {
  const arr = st ? predictedArrivals(ev, st, opt) : null;
  const mag = ev.mag == null ? 'M?' : `M${ev.mag.toFixed(1)}`;
  const type = ev.eventType && ev.eventType !== 'earthquake' ? ` (${ev.eventType})` : '';
  const dist = arr ? `, ${Math.round(arr.distKm).toLocaleString('en-US')} km away` : '';
  return makeNote({
    id: `usgs-${ev.id}`,
    start: ev.timeMs,
    kind: 'quake',
    label: `${mag} ${ev.place || ev.id}${type}${dist}`,
    source: `USGS ComCat, event ${ev.id}`,
    p: arr?.pMs ?? null,
    s: arr?.sMs ?? null,
  });
}

// --- CSV of a window ------------------------------------------------------------------------

/** Most rows a CSV download holds: one hour at 100 samples a second. */
export const MAX_CSV_ROWS = 360000;

/**
 * A window of one channel as CSV lines: a header row, one row per sample (UTC time, seconds
 * from the window's start, raw counts, and the filtered counts if a filter is on), then notes
 * on lines starting with "#" (what, where, filter, credit), as Quake Locator's download does.
 * Missing samples are empty cells.
 * @param {object} a
 * @param {{net:string, sta:string, loc:string, cha:string, sampleRate:number, startMs:number, data:ArrayLike<number>}} a.trace
 * @param {ArrayLike<number>|null} a.filtered same length and start as trace.data, or null
 * @param {string} a.filterLabel e.g. "1–10 Hz band-pass"
 * @param {number} a.startMs
 * @param {number} a.endMs
 * @param {string[]} [a.notes] extra "#" lines (credit, source)
 * @returns {{lines: string[], rows: number, capped: boolean}}
 */
export function windowCsv({ trace, filtered = null, filterLabel = '', startMs, endMs, notes = [] }) {
  const sr = trace.sampleRate;
  const dec = sr > 100 ? 3 : 2;
  let i0 = Math.max(0, Math.ceil(((startMs - trace.startMs) / 1000) * sr - 1e-6));
  let i1 = Math.min(trace.data.length, Math.ceil(((endMs - trace.startMs) / 1000) * sr - 1e-6));
  const capped = i1 - i0 > MAX_CSV_ROWS;
  if (capped) i1 = i0 + MAX_CSV_ROWS;
  const id = [trace.net, trace.sta, trace.loc, trace.cha].join('.');
  const head = ['time_utc', 'seconds', 'counts'];
  if (filtered) head.push('filtered_counts');
  const lines = [csvRow(head)];
  const t0 = trace.startMs + (i0 * 1000) / sr;
  for (let i = i0; i < i1; i++) {
    const t = trace.startMs + (i * 1000) / sr;
    const v = trace.data[i];
    const row = [new Date(Math.round(t)).toISOString(), ((t - t0) / 1000).toFixed(dec), Number.isNaN(v) ? '' : String(Math.round(v))];
    if (filtered) row.push(Number.isNaN(filtered[i]) ? '' : filtered[i].toFixed(2));
    lines.push(row.join(','));
  }
  lines.push('');
  lines.push(csvRow([`# channel`, id, `samples per second`, sr]));
  lines.push(csvRow([`# window UTC`, new Date(Math.round(t0)).toISOString(), new Date(Math.round(trace.startMs + (i1 * 1000) / sr)).toISOString()]));
  lines.push(csvRow([`# counts are the sensor's raw units; empty cells are missing data`]));
  if (filtered) lines.push(csvRow([`# filtered_counts`, filterLabel]));
  if (capped) lines.push(csvRow([`# cut to the first ${MAX_CSV_ROWS} samples`]));
  for (const n of notes) lines.push(csvRow([`# ${n}`]));
  return { lines, rows: i1 - i0, capped };
}

/** A file name for a window's CSV: shake-viewer-UU.HEB.01.EHZ-20261117T150000Z.csv */
export function csvFileName(trace, startMs) {
  const id = [trace.net, trace.sta, trace.loc, trace.cha].join('.').replace(/[^A-Za-z0-9._-]/g, '');
  const t = new Date(Math.round(startMs)).toISOString().replace(/[-:]/g, '').replace(/\.\d+Z$/, 'Z');
  return `shake-viewer-${id}-${t}.csv`;
}
