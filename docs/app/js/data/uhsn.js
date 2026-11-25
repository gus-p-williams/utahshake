// School Shakes: data from the UHSN public tree, a folder of plain files on a web server.
//
// This is the first UHSNSource and the reference client for the UHSN data specification,
// version 1.1 (planning/spec-uhsn-data.md in the repository on GitHub; planning files are not
// on the website). DRI's server will publish each school seismometer's data as the spec's
// section 7 describes; until then the same reader works on a test tree of University of
// Utah records (tools/uhsn-test/make-tree.mjs; a small one ships in data/uhsn-demo/v1/).
// tools/uhsn-test/check-tree.mjs checks a tree or a server against the same rules.
//
// What it reads, all under one base address (https://<host>/uhsn/v1/):
//   stations.json                  the public station list (spec 7.4)
//   index.json                     what is public now: each station's "public until" time (7.5)
//   index/<NET>.<STA>.<YYYY>.json  which days have data (7.6)
//   sds/.../<day file>             miniSEED, one channel and one UTC day per file (7.1)
//   sds/.../<day file>.json        the "sidecar" that describes the day file (7.7)
//
// Routing (spec 12): a waveform request for a station listed in stations.json is answered
// from the tree; any other station goes to the fallback source (University of Utah stations
// from EarthScope). Quakes, quake details and analyst picks always come from the fallback
// (USGS). On DRI's server the tree's stations are the AM (Raspberry Shake) ones; routing by
// membership rather than by network code lets the UU test tree work too.
//
// Reading a few minutes out of a day file (the seek rule, spec 7.7): a day file is 6-15 MB,
// so the reader never downloads it whole. The sidecar's seek table gives, for every
// 10-minute mark, the byte where the first record at or after the mark starts. For a window
// [t0, t1) the reader starts one record before the entry for the last mark at or before t0
// (the record before may hold samples after the mark) and stops at the entry for the first
// mark after t1, asking the server for just those bytes (an HTTP Range request). It then
// keeps the records whose header times overlap the window and decodes only those. A server
// that ignores Range and sends the whole file (status 200) works too, only slower.
//
// A window that crosses 00:00 UTC (an evening game in Utah) is read from both days' files
// and joined. A record belongs to the day its first sample falls in, so the last record of
// a day can run a few seconds past midnight: the day before the window is checked as well.
//
// Missing time is NaN in the returned trace, which always spans exactly the window asked
// for. Nothing after the station's "public until" time is ever returned, even from a day
// file that is newer than the index this reader read (spec 7.3, "Readers must expect files
// newer than the index"): records are found by their header times, and a 416 answer means
// the file was just replaced, so it is read whole.
//
// Is the server still publishing? publishState() says "paused" when index.json was
// generated more than an hour ago (spec 7.5); a page shows that as "data paused".
import { EarthScopeUSGSSource } from './earthscope-usgs.js';
import { parseMiniseed } from './mseed.js';
import { distanceKm } from '../lib/geo.js';
import {
  scanRecords, overlapping, byteRange, sdsPath, utcDayStart, isoDay, nslc, publishPaused,
} from '../lib/mseed-index.js';

const DAY_MS = 86400000;
const INDEX_MAX_AGE_MS = 5 * 60 * 1000;

/** A copy without the properties that are null: in the tree's JSON, null means "not known". */
function known(obj) {
  const out = {};
  for (const [k, v] of Object.entries(obj)) if (v !== null) out[k] = v;
  return out;
}

export class UHSNSource {
  /**
   * @param {object} o
   * @param {string} o.base  address of the tree, ending in "/": absolute
   *   (https://<host>/uhsn/v1/) or relative to the page ('../data/uhsn-demo/v1/')
   * @param {typeof fetch} [o.fetch]  for tests
   * @param {object} [o.fallback]  a DataSource for everything the tree does not hold
   */
  constructor({ base, fetch: fetchImpl = globalThis.fetch.bind(globalThis),
    fallback = new EarthScopeUSGSSource() }) {
    if (!base) throw new Error('UHSNSource needs the address of the data (base)');
    const withSlash = base.endsWith('/') ? base : `${base}/`;
    const page = globalThis.location?.href;
    this.base = page ? new URL(withSlash, page).href : withSlash;
    this.name = 'School Shakes';
    this.live = false;
    this.kind = 'uhsn';
    this.fallback = fallback;
    this._fetch = fetchImpl;
    this._stations = null;
    this._index = null; // {at, promise}
    this._avail = new Map(); // "NET.STA.YYYY" -> {at, promise}
  }

  /**
   * GET a file of the tree. Returns the Response, or null for 404 ("not published": no data,
   * which is not an error). A server error or an unreachable server throws; the two are kept
   * apart because the fix differs (wait and retry, or ask the school's IT to allow the
   * address). The server sends CORS headers on errors too so the browser can tell (spec 7.2).
   */
  async _get(path, { headers, what = 'School Shake data', timeoutMs = 45000 } = {}) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), timeoutMs);
    try {
      const res = await this._fetch(this.base + path, { headers, signal: ctrl.signal });
      if (res.status === 404) return null;
      if (res.status === 416) return res; // a range the file does not have: the caller decides
      if (!res.ok) throw new Error(`${what}: server said ${res.status} ${res.statusText ?? ''}`.trim());
      return res;
    } catch (err) {
      if (err.name === 'AbortError') throw new Error(`${what}: the server took too long to answer`);
      if (err instanceof TypeError) {
        throw new Error(`${what}: could not reach the server (network blocked or offline?)`);
      }
      throw err;
    } finally {
      clearTimeout(timer);
    }
  }

  async _json(path, what) {
    const res = await this._get(path, { what });
    return res ? res.json() : null;
  }

  /** Keep a promise unless it fails, so a network hiccup is not remembered. */
  _remember(promise, forget) {
    promise.catch(forget);
    return promise;
  }

  /** The station epochs of stations.json, as written (spec 7.4). Read once. */
  async stationList() {
    if (!this._stations) {
      this._stations = this._remember(
        this._json('stations.json', 'Station list').then((j) => j?.stations ?? []),
        () => { this._stations = null; });
    }
    return this._stations;
  }

  /** index.json (spec 7.5), or null if the tree has none. Read again after 5 minutes. */
  async index({ fresh = false } = {}) {
    const now = Date.now();
    if (fresh || !this._index || now - this._index.at > INDEX_MAX_AGE_MS) {
      const entry = { at: now };
      entry.promise = this._remember(this._json('index.json', 'Data index'),
        () => { if (this._index === entry) this._index = null; });
      this._index = entry;
    }
    return this._index.promise;
  }

  /** The time up to which a station's data are public, in ms, or null if it has none. */
  async publicUntil(net, sta) {
    const t = (await this.index())?.stations?.[`${net}.${sta}`]?.publicUntil;
    const ms = t ? Date.parse(t) : NaN;
    return Number.isNaN(ms) ? null : ms;
  }

  /**
   * Is the server's publish step running (spec 7.5)? It runs every 10 minutes and stamps
   * index.json's "generated". More than an hour old means "data paused", whatever each
   * channel's status says. Returns {generatedMs, paused}, or null without an index.
   */
  async publishState({ nowMs = Date.now() } = {}) {
    const generatedMs = Date.parse((await this.index())?.generated ?? '');
    if (Number.isNaN(generatedMs)) return null;
    return { generatedMs, paused: publishPaused(generatedMs, nowMs) };
  }

  /** A station's availability by day for one UTC year (spec 7.6), or null if there is none. */
  async availability(net, sta, year) {
    const key = `${net}.${sta}.${year}`;
    const now = Date.now();
    let entry = this._avail.get(key);
    if (!entry || now - entry.at > INDEX_MAX_AGE_MS) {
      entry = { at: now };
      entry.promise = this._remember(this._json(`index/${key}.json`, 'Data index'),
        () => { if (this._avail.get(key) === entry) this._avail.delete(key); });
      this._avail.set(key, entry);
    }
    return entry.promise;
  }

  /**
   * Stations of the tree in the apps' Station shape (lib/fdsn.js), with the tree's extra
   * fields (school, schoolName, primary, sharing, rsSta, model, clockChecked, stationXml,
   * delayHours). Only the epoch current at atMs. With lat and lon, only stations within
   * maxKm; a station whose position is not public is then left out.
   */
  async getStations({ lat, lon, maxKm, atMs = Date.now() } = {}) {
    const byPlace = Number.isFinite(lat) && Number.isFinite(lon);
    const out = [];
    for (const s of await this.stationList()) {
      const start = s.start ? Date.parse(s.start) : -Infinity;
      const end = s.end ? Date.parse(s.end) : Infinity;
      if (!(atMs >= start && atMs < end)) continue;
      const hasPlace = Number.isFinite(s.lat) && Number.isFinite(s.lon);
      if (byPlace) {
        if (!hasPlace) continue;
        if (Number.isFinite(maxKm) && distanceKm(lat, lon, s.lat, s.lon) > maxKm) continue;
      }
      const { start: _s, end: _e, channels, ...rest } = s;
      out.push({
        ...known(rest),
        startMs: s.start ? start : undefined,
        endMs: s.end ? end : undefined,
        channels: (channels ?? []).map(known),
      });
    }
    return out;
  }

  /**
   * Waveforms for [startMs, endMs). One Trace per channel that has any data in the window,
   * spanning exactly the window with NaN where data are missing; each tree trace also
   * carries publicUntilMs. Channels with no data at all are left out.
   */
  async getWaveforms(requests, startMs, endMs) {
    if (!requests.length) return [];
    const inTree = new Set((await this.stationList()).map((s) => `${s.net}.${s.sta}`));
    const mine = requests.filter((r) => inTree.has(`${r.net}.${r.sta}`));
    const others = requests.filter((r) => !inTree.has(`${r.net}.${r.sta}`));
    const [fromTree, fromFallback] = await Promise.all([
      Promise.all(mine.map((r) => this._channel(r, startMs, endMs))),
      others.length ? this.fallback.getWaveforms(others, startMs, endMs) : [],
    ]);
    return [...fromTree.filter(Boolean), ...fromFallback];
  }

  /** One channel from the tree: a Trace, or null if nothing is public in the window. */
  async _channel(req, startMs, endMs) {
    const loc = req.loc === '--' ? '' : (req.loc ?? '');
    const ch = { net: req.net, sta: req.sta, loc, cha: req.cha };
    const station = (await this.index())?.stations?.[`${ch.net}.${ch.sta}`];
    const entry = station?.channels?.[`${loc}.${ch.cha}`];
    if (!entry) return null;
    const publicUntilMs = Date.parse(station.publicUntil);
    const firstDayMs = Date.parse(`${entry.firstDay}T00:00:00Z`);
    const lo = Math.max(startMs, firstDayMs);
    const hi = Math.min(endMs, publicUntilMs);
    if (!(hi > lo)) return null;

    // Every UTC day the window touches, and the day before (its last record can cross midnight).
    const days = [];
    for (let d = Math.max(firstDayMs, utcDayStart(lo) - DAY_MS); d < hi; d += DAY_MS) days.push(d);
    const pieces = (await Promise.all(days.map((d) => this._dayRecords(ch, d, lo, hi, publicUntilMs))))
      .flat();
    if (!pieces.length) return null;

    const buffer = new Uint8Array(pieces.reduce((n, p) => n + p.length, 0));
    let at = 0;
    for (const p of pieces) { buffer.set(p, at); at += p.length; }
    const trace = parseMiniseed(buffer.buffer, { fromMs: startMs, toMs: endMs })
      .find((t) => nslc(t) === nslc(ch));
    if (!trace) return null;
    trace.publicUntilMs = publicUntilMs;
    return trace;
  }

  /** The records (as bytes) of one channel-day that overlap [lo, hi). [] if there are none. */
  async _dayRecords(ch, dayMs, lo, hi, publicUntilMs) {
    // The availability file says which days exist; without one, just try the day.
    const avail = await this.availability(ch.net, ch.sta, new Date(dayMs).getUTCFullYear());
    if (avail) {
      const day = avail.channels?.[`${ch.loc}.${ch.cha}`]?.[isoDay(dayMs)];
      if (!day || day.status === 'withdrawn') return [];
    }
    const path = sdsPath(ch, dayMs);
    const sidecar = await this._json(`${path}.json`, 'School Shake data');
    const range = byteRange(sidecar, lo, hi);
    if (!range) return [];

    let res = await this._get(path, { headers: { Range: `bytes=${range.start}-${range.end}` },
      what: 'School Shake data', timeoutMs: 90000 });
    // 416: the file is shorter than its sidecar says (it was replaced a moment ago). Read it whole.
    if (res?.status === 416) res = await this._get(path, { what: 'School Shake data', timeoutMs: 90000 });
    if (!res || res.status === 416) return [];
    // 206 brings the bytes asked for, 200 the whole file. Either way the bytes start on a
    // record boundary, and the header times decide which records are used.
    const bytes = new Uint8Array(await res.arrayBuffer());
    const records = overlapping(scanRecords(bytes), lo, hi)
      .filter((r) => nslc(r) === nslc(ch) && r.endMs <= publicUntilMs);
    return records.map((r) => bytes.subarray(r.offset, r.offset + r.recordLength));
  }

  getEvents(query) { return this.fallback.getEvents(query); }

  getEvent(id) { return this.fallback.getEvent(id); }

  getAnalystPicks(eventId) { return this.fallback.getAnalystPicks(eventId); }
}
