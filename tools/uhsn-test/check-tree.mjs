// Check a UHSN public tree against the data specification, version 1.1
// (planning/spec-uhsn-data.md): a folder on disk, or the base address of a server. It is the
// acceptance test of spec 5.4 and section 12, written for DRI IT: run it before going live
// and after any change to the publish step.
//
//   node tools/uhsn-test/check-tree.mjs https://<host>/uhsn/v1/
//   node tools/uhsn-test/check-tree.mjs docs/app/data/uhsn-demo/v1
//
// It needs only Node.js 22 or later and this repository: nothing to install.
//
// Options:
//   --days N | all   check this many of each channel's latest days in full: every record, the
//                    sidecar and its seek table (default: all for a folder; 2 for an address,
//                    which downloads up to 15 MB per channel-day)
//   --now <ISO>      the time of the check (default: the clock). For a folder, giving it also
//                    judges whether the publish step is running ("data paused", 7.5)
//   --verbose        list every place a problem was found (default: the first 5)
//   --json           print the findings as JSON (for monitoring)
//
// The report has six sections:
//   1. stations.json and the StationXML files (7.4, 7.8, section 3)
//   2. index.json (7.5): fields; status against publicUntil − lastSample; publicUntil against
//      the approved delay; "data paused"
//   3. the availability files (7.6): fields; "filling" or "closed" against publicUntil
//   4. day files and sidecars (6.1, 7.1, 7.3, 7.7): whole records of one length, time order,
//      no duplicates, each in its day's file; the sidecar against the records; the seek table;
//      the availability line
//   5. the cutoff (5.2, 5.4): no public record ends after publicUntil; no day file past it;
//      nothing for an unconfirmed station
//   6. for an address, the web rules (7.2): HTTPS; CORS on every answer, errors included;
//      OPTIONS; ranges (206 and 416); HEAD; 304; content types; caching
//
// Each finding is FAIL (breaks a rule; the apps may show wrong data, or none), warn (works,
// but differs from the spec) or note (for information). Exit status: 0 when nothing failed,
// 1 when something failed, 2 when the check could not run at all.
//
// The pure checks are in check-lib.mjs (tested by tests/uhsn-check.test.js); this file reads
// the files and puts the report together (tests/uhsn-check-tree.test.js runs it on the demo
// tree, as a folder and served by tools/serve.mjs, and on broken copies of it).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { scanRecords, byteRange, overlapping, sdsPath, isoMs } from '../../docs/app/js/lib/mseed-index.js';
import {
  Report, SPEC_VERSION, DAY_MS, SIZE_LIMITS, TIME_TOL_MS, classifyPath, parseDayPath, isTime, isDate,
  checkStationsFile, checkStationXml, checkIndexFile, checkAvailabilityFile, checkDayFile,
  corsProblems, contentTypeProblems, cacheProblems, rangeProblems, header, wrap,
} from './check-lib.mjs';

/** The website's address, sent as Origin the way a browser on the site would send it. */
const ORIGIN = 'https://gus-p-williams.github.io';
const decode = (bytes) => new TextDecoder().decode(bytes);

/** A tree in a folder on disk. */
export class FolderTree {
  constructor(dir) {
    this.root = path.resolve(dir);
    this.kind = 'folder';
    this.label = dir;
  }

  async get(rel) {
    try {
      const b = fs.readFileSync(path.join(this.root, ...rel.split('/')));
      return { rel, status: 200, bytes: new Uint8Array(b.buffer, b.byteOffset, b.length) };
    } catch (err) {
      if (['ENOENT', 'ENOTDIR', 'EISDIR'].includes(err.code)) return { rel, status: 404, bytes: null };
      throw err;
    }
  }

  /** Every file, as paths relative to the root with "/". */
  list() {
    const out = [];
    const walk = (dir, base) => {
      for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
        if (e.isDirectory()) walk(path.join(dir, e.name), `${base}${e.name}/`);
        else out.push(`${base}${e.name}`);
      }
    };
    walk(this.root, '');
    return out.sort();
  }
}

/** A tree on a web server. Every answer is kept, for the CORS and header checks. */
export class WebTree {
  constructor(base, { fetch: fetchImpl = globalThis.fetch } = {}) {
    this.base = base.endsWith('/') ? base : `${base}/`;
    this.kind = 'address';
    this.label = this.base;
    this._fetch = fetchImpl;
    this.answers = [];
  }

  async get(rel, { method = 'GET', headers = {} } = {}) {
    const url = new URL(rel, this.base).href;
    let res;
    try {
      res = await this._fetch(url, { method, headers: { Origin: ORIGIN, ...headers }, signal: AbortSignal.timeout(120000) });
    } catch (err) {
      throw new Error(`could not reach ${url}: ${err.cause?.message ?? err.message}`);
    }
    const bytes = method === 'GET' && res.status !== 304 ? new Uint8Array(await res.arrayBuffer()) : null;
    const answer = { rel, method, range: headers.Range ?? null, status: res.status, headers: res.headers, bytes };
    this.answers.push(answer);
    return answer;
  }
}

/** Thrown when the tree cannot be read at all (so there is nothing to report on). */
export class CannotRun extends Error {}

/**
 * Check a tree. o.nowMs: the time of the check; o.judgePaused: say whether the publish step
 * is running (default: for an address); o.days: how many latest days per channel to check in
 * full (default all for a folder, 2 for an address). Returns a Report.
 */
export async function checkTree(tree, { nowMs = Date.now(), judgePaused, days } = {}) {
  const r = new Report();
  const web = tree.kind === 'address';
  judgePaused ??= web;
  const nDays = days ?? (web ? 2 : Infinity);
  const listing = tree.list ? tree.list() : null;

  const read = async (rel, opts) => {
    try { return await tree.get(rel, opts); } catch (err) { return { rel, status: 0, error: err.message, bytes: null }; }
  };
  const unreadable = (a) => (a.status === 404 ? 'missing (404)'
    : a.error ? `unreadable (${a.error})` : `unreadable (the server answered ${a.status})`);
  /** Read and parse a JSON file; report it if it is missing or broken. */
  const json = async (rel) => {
    const a = await read(rel);
    if (a.status !== 200) { r.fail(`${rel} is ${unreadable(a)}`, rel); return null; }
    try { return { doc: JSON.parse(decode(a.bytes)), size: a.bytes.length }; } catch (err) {
      r.fail(`${rel} is not valid JSON (${err.message})`, rel);
      return null;
    }
  };

  // 1. The station list ---------------------------------------------------------------------
  r.section('Station list: stations.json and StationXML', '7.4, 7.8 and section 3');
  const first = await read('stations.json');
  if (first.status === 0) throw new CannotRun(first.error);
  const sj = await json('stations.json');
  if (!sj) { r.fail('without stations.json the rest cannot be checked'); return r; }
  const stations = checkStationsFile(sj.doc, r);
  const xmlFor = new Map(); // one check per StationXML file, against the station's current epoch
  for (const st of stations) {
    if (typeof st.stationXml === 'string' && (!xmlFor.has(st.stationXml) || st.end === null)) xmlFor.set(st.stationXml, st);
  }
  for (const [rel, st] of xmlFor) {
    const a = await read(rel);
    if (a.status !== 200) r.fail(`the StationXML file it names is ${unreadable(a)}`, `stations.json: ${st.net}.${st.sta} names ${rel}`);
    else checkStationXml(decode(a.bytes), st, r, rel);
  }

  // 2. What is public now --------------------------------------------------------------------
  r.section('What is public now: index.json', '7.5');
  const ij = await json('index.json');
  if (!ij) { r.fail('without index.json the rest cannot be checked'); return r; }
  if (ij.size > SIZE_LIMITS.index) r.fail(`index.json is ${Math.round(ij.size / 1e3)} KB; the limit is 1 MB (7.3)`, 'index.json');
  const published = checkIndexFile(ij.doc, stations, r, { nowMs, judgePaused });

  // 3. Availability by day -------------------------------------------------------------------
  r.section('Availability by day: index/<NET>.<STA>.<YYYY>.json', '7.6');
  const daysOf = new Map(); // "NET.STA.LOC.CHA" -> [{date, dayMs, line}]
  const chanKey = (c) => `${c.net}.${c.sta}.${c.loc}.${c.cha}`;
  for (const [key, chans] of Map.groupBy(published, (c) => `${c.net}.${c.sta}`)) {
    const [net, sta] = key.split('.');
    const pu = chans[0].publicUntilMs;
    const firstDays = chans.map((c) => c.entry?.firstDay).filter(isDate).sort();
    if (!firstDays.length || Number.isNaN(pu)) continue;
    // One file per year from the first public day to the year publicUntil falls in.
    const y0 = Number(firstDays[0].slice(0, 4));
    const y1 = Math.max(y0, new Date(pu - 1).getUTCFullYear());
    for (let year = y0; year <= y1; year++) {
      const rel = `index/${key}.${year}.json`;
      const aj = await json(rel);
      if (!aj) continue;
      if (aj.size > SIZE_LIMITS.availability) r.fail(`it is ${Math.round(aj.size / 1e3)} KB; the limit is 500 KB (7.3)`, rel);
      const got = checkAvailabilityFile(aj.doc, r, { rel, net, sta, year, publicUntilMs: pu, channelKeys: chans.map((c) => c.key) });
      for (const [k, list] of Object.entries(got)) {
        const id = `${key}.${k}`;
        daysOf.set(id, [...(daysOf.get(id) ?? []), ...list]);
      }
    }
  }
  for (const c of published) {
    const live = (daysOf.get(chanKey(c)) ?? []).filter((d) => d.line.status !== 'withdrawn');
    if (!live.length) { r.fail('index.json lists this channel, but no availability file lists a day of it', c.where); continue; }
    if (isDate(c.entry?.firstDay)) {
      r.check('firstDay in index.json is the first public day in the availability files', live[0].date === c.entry.firstDay ? []
        : [`firstDay is ${c.entry.firstDay}; the first public day in the availability files is ${live[0].date}`], c.where);
    }
  }
  if (listing) {
    const keys = new Set(published.map((c) => `${c.net}.${c.sta}`));
    for (const f of listing.filter((x) => classifyPath(x) === 'availability')) {
      if (!keys.has(f.split('/')[1].split('.').slice(0, 2).join('.'))) r.warn('an availability file for a station index.json does not list', f);
    }
  }

  // 4. Day files and sidecars ---------------------------------------------------------------
  r.section('Day files and their sidecars', '6.1, 7.1, 7.3 and 7.7');
  const checked = []; // {rel, c, dayMs, bytes, sidecar, fileSize, lastSampleEndMs, records}
  const late = []; // {rel, c, records}
  for (const c of published) {
    const ch = { net: c.net, sta: c.sta, loc: c.loc, cha: c.cha };
    const all = daysOf.get(chanKey(c)) ?? [];
    const live = all.filter((d) => d.line.status !== 'withdrawn');
    const pick = Number.isFinite(nDays) ? live.slice(-nDays) : live;
    let lastOfChannel = null;
    for (const d of pick) {
      const rel = sdsPath(ch, d.dayMs);
      const fa = await read(rel);
      if (fa.status !== 200) { r.fail(`the availability file lists this day, but its day file is ${unreadable(fa)}`, rel); continue; }
      const sa = await read(`${rel}.json`);
      let sidecar = null;
      if (sa.status !== 200) r.fail(`the day file's sidecar is ${unreadable(sa)}`, `${rel}.json`);
      else {
        try { sidecar = JSON.parse(decode(sa.bytes)); } catch (err) { r.fail(`not valid JSON (${err.message})`, `${rel}.json`); }
      }
      const records = scanRecords(fa.bytes);
      const res = checkDayFile(r, {
        rel, ch, dayMs: d.dayMs, bytes: fa.bytes, records, sidecar, sidecarSize: sa.bytes?.length ?? 0,
        line: d.line, publicUntilMs: c.publicUntilMs, delayHours: c.station?.delayHours,
      });
      if (res.late.length) late.push({ rel, c, records: res.late });
      lastOfChannel = { rel, c, dayMs: d.dayMs, bytes: fa.bytes, sidecar, records, ...res };
      checked.push(lastOfChannel);
    }
    // index.json's lastSample is the end of the channel's last public record (7.5).
    if (lastOfChannel && lastOfChannel.dayMs === live.at(-1)?.dayMs && isTime(c.entry?.lastSample)
      && !Number.isNaN(lastOfChannel.lastSampleEndMs)) {
      const gotMs = Date.parse(c.entry.lastSample);
      r.check('lastSample in index.json is the end of the last public record', Math.abs(gotMs - lastOfChannel.lastSampleEndMs) <= TIME_TOL_MS ? []
        : [`lastSample is ${c.entry.lastSample}; the latest day file's last record ends at ${isoMs(lastOfChannel.lastSampleEndMs)}`], c.where);
    }
    // A withdrawn day has no day file (5.3).
    const from = Number.isFinite(nDays) ? (pick[0]?.dayMs ?? Infinity) : -Infinity;
    for (const d of all.filter((x) => x.line.status === 'withdrawn' && x.dayMs >= from)) {
      const rel = sdsPath(ch, d.dayMs);
      const a = await read(rel);
      r.check('withdrawn days have no day file', a.status === 404 ? [] : [`the day is marked withdrawn, but its day file is still there (${a.status})`], rel);
    }
  }
  if (listing) {
    // The folder's files against the layout (7.1): each day file with its sidecar, and every
    // day file announced in the availability files.
    const kinds = new Map(listing.map((f) => [f, classifyPath(f)]));
    for (const [f, k] of kinds) if (k === null) r.note('a file the layout does not have (7.1); readers never ask for it', f);
    const announced = new Set();
    for (const c of published) {
      for (const d of daysOf.get(chanKey(c)) ?? []) {
        if (d.line.status !== 'withdrawn') announced.add(sdsPath({ net: c.net, sta: c.sta, loc: c.loc, cha: c.cha }, d.dayMs));
      }
    }
    for (const [f, k] of kinds) {
      if (k === 'day') {
        r.check('every day file has its sidecar and is announced in an availability file', [
          ...(kinds.has(`${f}.json`) ? [] : ['a day file without its sidecar (7.7)']),
          ...(announced.has(f) ? [] : ['a day file no availability file announces: the index files must list every published day (7.6)']),
        ], f);
      } else if (k === 'sidecar' && !kinds.has(f.slice(0, -5))) r.fail('a sidecar without its day file', f);
    }
  }
  if (!checked.length && published.length) r.fail('no day file could be checked');
  if (Number.isFinite(nDays)) r.note(`the latest ${nDays} day${nDays === 1 ? '' : 's'} of each channel were checked in full (--days to change)`);

  // 5. The cutoff ----------------------------------------------------------------------------
  r.section('The cutoff: nothing public ends after publicUntil', '5.2 and 5.4');
  let stillLate = late;
  if (late.length && web) {
    // The publish step may have run during the check (7.3: files newer than the index). Read
    // the index again: records that end by its new publicUntil were published legitimately.
    const again = await read('index.json');
    let fresh = null;
    try { fresh = again.status === 200 ? JSON.parse(decode(again.bytes)) : null; } catch { /* reported above */ }
    stillLate = late.map((l) => {
      const pu = Date.parse(fresh?.stations?.[`${l.c.net}.${l.c.sta}`]?.publicUntil ?? '');
      return { ...l, records: Number.isNaN(pu) ? l.records : l.records.filter((x) => x.endMs > pu + 0.001) };
    }).filter((l) => l.records.length);
    if (stillLate.length < late.length) {
      r.note('some records end after the publicUntil read at the start of the check but by the one read at its end: the publish step ran during the check, which is allowed (7.3)');
    }
  }
  const nRecords = checked.reduce((n, d) => n + d.records.length, 0);
  if (!stillLate.length) {
    if (checked.length) r.ok(`all ${nRecords} records of the ${checked.length} day file${checked.length === 1 ? '' : 's'} checked end at or before their station's publicUntil`);
  } else {
    for (const l of stillLate) {
      const worst = Math.max(...l.records.map((x) => x.endMs));
      r.fail(`records end after publicUntil: a record is public only if it ends at or before the cutoff (5.2)`,
        `${l.rel}: ${l.records.length} records, the last ending ${isoMs(worst)}, after publicUntil ${isoMs(l.c.publicUntilMs)}`);
    }
  }
  for (const c of published) {
    if (isTime(c.entry?.lastSample) && Date.parse(c.entry.lastSample) > c.publicUntilMs) {
      r.fail('lastSample is after publicUntil (7.5: lastSample ≤ publicUntil)', c.where);
    }
  }
  for (const d of checked) {
    if (isTime(d.sidecar?.lastSampleEnd) && Date.parse(d.sidecar.lastSampleEnd) > d.c.publicUntilMs + TIME_TOL_MS) {
      r.fail('the sidecar\'s lastSampleEnd is after publicUntil', `${d.rel}.json`);
    }
  }
  // Nothing is served for the day after the last day that can hold public data.
  for (const c of published) {
    if (Number.isNaN(c.publicUntilMs)) continue;
    const next = Math.ceil(c.publicUntilMs / DAY_MS) * DAY_MS;
    const rel = sdsPath({ net: c.net, sta: c.sta, loc: c.loc, cha: c.cha }, next);
    const [a, b] = [await read(rel), await read(`${rel}.json`)];
    r.check('no day file or sidecar for the day after publicUntil', [a, b].filter((x) => x.status !== 404)
      .map((x) => `${x.rel} answered ${x.status === 0 ? x.error : x.status}; nothing of that day can be public yet, so it should be 404`), `${c.net}.${c.sta}.${c.loc}.${c.cha}`);
  }
  // Nothing at all for a station whose sharing is unconfirmed (section 3).
  for (const st of stations.filter((s) => s.sharing === 'unconfirmed')) {
    const key = `${st.net}.${st.sta}`;
    const files = (listing ?? []).filter((f) => f.startsWith(`sds/`) && parseDayPath(f.replace(/\.json$/, ''))?.sta === st.sta
      && parseDayPath(f.replace(/\.json$/, '')).net === st.net);
    if (ij.doc?.stations?.[key] || files.length) {
      r.fail('an unconfirmed station has public data; nothing may be published for it (section 3)', `${key}${files.length ? ` (${files.length} files under sds/)` : ''}`);
    } else r.ok(`nothing is published for ${key}, whose sharing is unconfirmed`);
  }
  r.note('products (section 10: noise levels, clear-S counts, day envelopes) are not checked yet; none are published so far');

  // 6. Web rules -----------------------------------------------------------------------------
  r.section('Web rules: HTTPS, CORS, ranges, content types, caching', '7.2');
  if (!web) {
    r.note('the web rules are checked only for an address. To try them on a folder, serve it with node tools/serve.mjs <port> <folder> and check http://127.0.0.1:<port>/<path to v1>/ (serve.mjs sends "no-store" and no ETag, so the caching checks will warn)');
    return r;
  }
  const u = new URL(tree.base);
  const local = ['localhost', '127.0.0.1', '[::1]'].includes(u.hostname);
  if (u.protocol === 'https:') r.ok('HTTPS');
  else if (local) r.note('plain http on this computer; DRI\'s server must use HTTPS with a valid certificate');
  else r.fail('the address is not HTTPS; the spec asks for HTTPS only, with a valid certificate');

  // Probes: a range steered by the seek table, an impossible range, HEAD, the browser's
  // preflight, a file that is not there, and revalidation with an ETag.
  const latest = checked.reduce((a, b) => (!a || b.dayMs > a.dayMs ? b : a), null);
  if (latest && latest.sidecar) {
    const first = Date.parse(latest.sidecar.firstSample);
    const lastEnd = Date.parse(latest.sidecar.lastSampleEnd);
    const t0 = first + Math.max(0, (lastEnd - first) / 2 - 300000);
    const range = byteRange(latest.sidecar, t0, t0 + 600000, latest.fileSize);
    if (range) {
      const a = await read(latest.rel, { headers: { Range: `bytes=${range.start}-${range.end}` } });
      const p = a.status === 0 ? [a.error] : rangeProblems({ status: a.status, headers: a.headers, body: a.bytes, start: range.start, end: range.end, whole: latest.bytes });
      if (!p.length && !overlapping(scanRecords(a.bytes), t0, t0 + 600000).length) p.push('the range the seek table gives holds no record of the 10 minutes asked for');
      r.check('a range request steered by the seek table gets 206 and exactly those bytes', p, `${latest.rel}, bytes ${range.start}-${range.end} (10 minutes from ${isoMs(t0)})`);
    }
    const past = `bytes=${latest.fileSize + 512}-${latest.fileSize + 1023}`;
    const a416 = await read(latest.rel, { headers: { Range: past } });
    r.check('an impossible range gets 416', a416.status === 416 ? [] : [`the server answered ${a416.status || a416.error}; it should be 416`], `${latest.rel}, ${past}`);
    const ah = await read(latest.rel, { method: 'HEAD' });
    const len = Number(header(ah.headers, 'Content-Length'));
    r.check('HEAD on a day file gives its size', ah.status === 200 && len === latest.fileSize ? []
      : [`HEAD answered ${ah.status || ah.error} with Content-Length ${header(ah.headers, 'Content-Length')}; expected 200 and ${latest.fileSize}`], latest.rel);
    const ao = await read(latest.rel, { method: 'OPTIONS', headers: { 'Access-Control-Request-Method': 'GET', 'Access-Control-Request-Headers': 'range' } });
    if (ao.status === 204) r.check('OPTIONS (the browser\'s preflight before a Range request) gets 204', [], latest.rel);
    else if (ao.status >= 200 && ao.status < 300) r.warn(`OPTIONS answered ${ao.status}; the spec asks for 204 (browsers accept any 2xx)`, latest.rel);
    else r.fail(`OPTIONS answered ${ao.status || ao.error}; it must be 204, or browsers will not send Range requests`, latest.rel);
  }
  const missing = 'index/XX.NOSUCHSTATION.1970.json';
  const a404 = await read(missing);
  r.check('a file that is not published gets 404', a404.status === 404 ? []
    : [`the server answered ${a404.status || a404.error}; it should be 404, so readers can tell "no data" from a server problem (7.2)`], missing);
  const sa = tree.answers.find((a) => a.rel === 'stations.json' && a.status === 200);
  const etag = header(sa?.headers, 'ETag');
  if (etag) {
    const a304 = await read('stations.json', { headers: { 'If-None-Match': etag } });
    r.check('revalidation with the ETag gets 304', a304.status === 304 ? [] : [`the server answered ${a304.status || a304.error} to If-None-Match with the file's own ETag; 304 saves the download`], 'stations.json', 'WARN');
  }

  // Headers on every answer the check got.
  const answers = tree.answers.filter((a) => a.status > 0);
  const statuses = [...new Set(answers.map((a) => a.status))].sort((x, y) => x - y);
  const where = (a) => `${a.method} ${a.rel}${a.range ? ` (Range ${a.range})` : ''}: ${a.status}`;
  const corsLabel = `CORS headers on every answer, errors included (answers seen: ${statuses.join(', ')})`;
  for (const a of answers) r.check(corsLabel, corsProblems(a.headers), where(a));
  for (const a of answers.filter((x) => parseDayPath(x.rel) && [200, 206].includes(x.status))) {
    const v = header(a.headers, 'Accept-Ranges');
    r.check('day files say Accept-Ranges: bytes', v === 'bytes' ? [] : [`Accept-Ranges is ${v === null ? 'missing' : `"${v}"`}; it must be "bytes"`], where(a));
  }
  for (const a of answers.filter((x) => x.method === 'GET' && x.status === 200)) {
    r.check('content types as in the table', contentTypeProblems(a.rel, a.headers), where(a), 'WARN');
    r.check('caching as in the table (Cache-Control, ETag, Last-Modified)', cacheProblems(a.rel, a.headers, nowMs), where(a), 'WARN');
  }
  return r;
}

// --- Command line --------------------------------------------------------------------------

const USAGE = `Check a UHSN public tree against the data specification, version ${SPEC_VERSION}.

  node tools/uhsn-test/check-tree.mjs <folder or https://address/uhsn/v1/> [options]

  --days N | all   check this many of each channel's latest days in full
                   (default: all for a folder, 2 for an address)
  --now <ISO>      the time of the check (default: the clock)
  --verbose        list every place a problem was found
  --json           print the findings as JSON`;

function parseArgs(argv) {
  const o = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--help' || a === '-h') o.help = true;
    else if (a === '--verbose') o.verbose = true;
    else if (a === '--json') o.json = true;
    else if (a === '--now') o.now = argv[++i];
    else if (a === '--days') o.days = argv[++i];
    else if (a.startsWith('--')) throw new Error(`unknown option ${a}`);
    else if (o.target) throw new Error(`one folder or address only (got "${o.target}" and "${a}")`);
    else o.target = a;
  }
  return o;
}

async function main() {
  let o;
  try { o = parseArgs(process.argv.slice(2)); } catch (err) { console.error(`${err.message}\n\n${USAGE}`); return 2; }
  if (o.help) { console.log(USAGE); return 0; }
  if (!o.target) { console.error(USAGE); return 2; }
  let days;
  if (o.days !== undefined && o.days !== 'all') {
    days = Number(o.days);
    if (!(Number.isInteger(days) && days >= 1)) { console.error('--days takes a whole number of at least 1, or "all"'); return 2; }
  }
  const nowMs = o.now === undefined ? Date.now() : Date.parse(o.now);
  if (Number.isNaN(nowMs)) { console.error(`--now: "${o.now}" is not a time (use e.g. 2026-11-25T15:00:00Z)`); return 2; }
  const web = /^https?:\/\//i.test(o.target);
  if (!web && !fs.existsSync(path.join(o.target, 'stations.json')) && !fs.existsSync(o.target)) {
    console.error(`No folder "${o.target}". Give the folder that holds stations.json and index.json, or an address.`);
    return 2;
  }
  const tree = web ? new WebTree(o.target) : new FolderTree(o.target);

  let r;
  try {
    r = await checkTree(tree, { nowMs, judgePaused: web || o.now !== undefined, days: o.days === 'all' ? Infinity : days });
  } catch (err) {
    if (err instanceof CannotRun) { console.error(`Could not read the tree: ${err.message}`); return 2; }
    throw err;
  }
  const c = r.counts();
  if (o.json) {
    console.log(JSON.stringify({ tree: tree.label, kind: tree.kind, checkedAt: isoMs(nowMs), ...r.toJSON() }, null, 1));
    return r.passed ? 0 : 1;
  }
  const n = (k, word) => `${k === 0 ? 'no' : k} ${word}${k === 1 ? '' : 's'}`;
  const out = [
    `UHSN data checker, for data specification version ${SPEC_VERSION} (planning/spec-uhsn-data.md)`,
    `  Tree:  ${tree.label} (${web ? 'a web address' : 'a folder'})`,
    `  Time:  ${isoMs(nowMs)}${o.now !== undefined ? ' (given with --now)' : ''}`,
    r.toText({ maxWhere: o.verbose ? Infinity : 5 }),
    '',
    `Result: ${r.passed ? 'PASS' : 'FAIL'}. ${n(c.FAIL, 'failure')}, ${n(c.WARN, 'warning')}, ${n(c.NOTE, 'note')}.`,
    '   FAIL  breaks a rule of the spec; the apps may show wrong data, or none. Fix it before going live.',
    '   warn  works, but differs from the spec; worth fixing.',
    '   note  for information.',
  ];
  if (!r.passed && web) {
    out.push(...wrap('Some checks compare files written at different moments. If the publish step ran during the check, run the checker again before chasing a failure.', 92, '', ''));
  }
  console.log(out.join('\n'));
  return r.passed ? 0 : 1;
}

const isMain = process.argv[1]
  && path.resolve(process.argv[1]).toLowerCase() === fileURLToPath(import.meta.url).toLowerCase();
if (isMain) {
  main().then((code) => { process.exitCode = code; }, (err) => { console.error(err.stack ?? err.message); process.exitCode = 2; });
}
