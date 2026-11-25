// Make a test copy of the UHSN public tree (data spec version 1.1, design (a): plain files)
// from University of Utah data, so the School Shake viewer and UHSNSource can be built and
// tested before any school Shake sends data. It is also a first reference for DRI's publish
// and index scripts: it does the publish step's work (spec 5.2) in the same order.
// tools/uhsn-test/check-tree.mjs checks what it writes.
//
//   node tools/uhsn-test/make-tree.mjs --demo
//   node tools/uhsn-test/make-tree.mjs --station UU.HEB.01.EHZ \
//        --from 2026-11-17T12:00:00Z --until 2026-11-18T04:00:00Z
//
// Options:
//   --out <dir>           where to write (default tools/uhsn-test/out/uhsn/v1/, git-ignored)
//   --station N.S.L.C     a channel; repeat for more channels or stations
//   --from <ISO>          the span the "bridge" delivered: whole records that start at or
//   --until <ISO>         after --from and before --until
//   --public-until <ISO>  the cutoff: only records that end by it are published (default --until)
//   --now <ISO>           the time of this "publish run": the generated and updated times
//                         (default --public-until + 10 minutes)
//   --demo                the small tree the app ships, into docs/app/data/uhsn-demo/v1/
//
// Data: University of Utah Seismograph Stations (network UU, doi:10.7914/SN/UU) through
// EarthScope's FDSN web services. NEVER Raspberry Shake's servers (license). Downloads are
// cached by tools/figures/fdsn-cache.mjs, so a rerun is offline.
//
// Records are copied byte for byte; headers are never rewritten (spec 6.1). EarthScope's
// dataselect trims the first and last record of an answer to the window asked for, so each
// download is padded by 5 minutes and its first and last record are thrown away: what is
// left are the station's original records (spec 6.4).
//
// Status words (spec 1.1): a day in the availability file is "filling" until the whole day
// ends at or before publicUntil, then "closed" (7.6); a channel in index.json is "current",
// "late" or "stopped" by its lag, publicUntil − lastSample, not by the clock (7.5). Whether
// the publish step itself has stalled ("data paused") is for readers to judge from
// index.json's "generated" (7.5); this script, like the publish step, only stamps it.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { fetchCached, DATASELECT, STATION } from '../figures/fdsn-cache.mjs';
import {
  scanRecords, sortDedupe, cutAtCutoff, describeDay, gapTotals, sdsPath, utcDayStart, isoMs,
  isoDay, nslc, dayStatus, channelStatus,
} from '../../docs/app/js/lib/mseed-index.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const repo = path.resolve(here, '../..');
const DAY = 86400000;
const PAD = 300000;

const DEMO = {
  out: path.join(repo, 'docs/app/data/uhsn-demo/v1'),
  station: ['UU.HEB.01.EHZ'],
  from: '2026-11-17T12:00:00Z', until: '2026-11-18T04:00:00Z',
  'public-until': '2026-11-18T04:00:00Z', now: '2026-11-18T04:10:00Z',
};
// Wording for a station's test "school name"; others use the station service's site name.
const PLACE = { HEB: 'near Heber City' };

function parseArgs(argv) {
  const o = { station: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--demo') Object.assign(o, DEMO, { demo: true });
    else if (a === '--station') o.station.push(argv[++i]);
    else if (['--out', '--from', '--until', '--public-until', '--now'].includes(a)) o[a.slice(2)] = argv[++i];
    else throw new Error(`unknown option ${a}`);
  }
  return o;
}

const time = (s, what) => {
  const ms = Date.parse(s);
  if (Number.isNaN(ms)) throw new Error(`${what}: "${s}" is not a time (use e.g. 2026-11-17T12:00:00Z)`);
  return ms;
};
const fdsn = (ms) => new Date(ms).toISOString().replace('Z', '');
const writeJson = (file, obj) => {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  // Indented, but with each [time, time] or [time, offset] pair on one line.
  const text = JSON.stringify(obj, null, 1)
    .replace(/\[\s*("[^"]*"),\s*("[^"]*"|\d+)\s*\]/g, '[$1, $2]');
  fs.writeFileSync(file, text + '\n');
};

/** One channel's original records that start in [fromMs, untilMs), downloaded day by day. */
async function download(ch, fromMs, untilMs) {
  const all = [];
  for (let day = utcDayStart(fromMs); day < untilMs; day += DAY) {
    const a = Math.max(fromMs, day) - PAD;
    const b = Math.min(untilMs, day + DAY) + PAD;
    const q = new URLSearchParams({ net: ch.net, sta: ch.sta, loc: ch.loc || '--', cha: ch.cha,
      start: fdsn(a), end: fdsn(b) });
    const buf = await fetchCached(`${DATASELECT}?${q}`);
    if (!buf) continue;
    const bytes = new Uint8Array(buf.buffer, buf.byteOffset, buf.length);
    const recs = scanRecords(bytes);
    // The first and last record of an answer may have been trimmed to the window: drop them.
    for (const r of recs.slice(1, -1)) {
      r.bytes = bytes.subarray(r.offset, r.offset + r.recordLength);
      all.push(r);
    }
  }
  return all.filter((r) => nslc(r) === nslc(ch) && r.startMs >= fromMs && r.startMs < untilMs);
}

/** Channel facts from EarthScope's station service (text) and the StationXML (sensitivity). */
async function stationInfo(net, sta, channels, atMs) {
  const common = { net, sta, loc: [...new Set(channels.map((c) => c.loc || '--'))].join(','),
    cha: [...new Set(channels.map((c) => c.cha))].join(','),
    startbefore: fdsn(atMs), endafter: fdsn(atMs) };
  const text = (await fetchCached(`${STATION}?${new URLSearchParams({ ...common, level: 'channel', format: 'text' })}`))
    ?.toString('utf8');
  const xml = (await fetchCached(`${STATION}?${new URLSearchParams({ ...common, level: 'response' })}`))
    ?.toString('utf8');
  if (!text || !xml) throw new Error(`EarthScope has no metadata for ${net}.${sta}`);
  const site = (await fetchCached(`${STATION}?${new URLSearchParams({ net, sta, level: 'station', format: 'text' })}`))
    ?.toString('utf8').split('\n').find((l) => l && !l.startsWith('#'))?.split('|')[5]?.trim();

  const rows = text.split(/\r?\n/).filter((l) => l.trim() && !l.startsWith('#')).map((l) => l.split('|'));
  const out = { lat: null, lon: null, elevM: null, start: null, site, xml, channels: [] };
  for (const ch of channels) {
    const f = rows.find((r) => r[2] === (ch.loc || '') && r[3] === ch.cha);
    if (!f) throw new Error(`EarthScope lists no channel ${nslc(ch)} at ${fdsn(atMs)}`);
    out.lat = Math.round(Number(f[4]) * 1000) / 1000;
    out.lon = Math.round(Number(f[5]) * 1000) / 1000;
    out.elevM = Number(f[6]);
    const start = Date.parse(f[15].trim() + 'Z');
    out.start = out.start === null ? start : Math.min(out.start, start);
    // InstrumentSensitivity of this channel's epoch, from the StationXML.
    const block = [...xml.matchAll(/<Channel\b([^>]*)>([\s\S]*?)<\/Channel>/g)]
      .find((m) => m[1].includes(`code="${ch.cha}"`) && m[1].includes(`locationCode="${ch.loc || ''}"`));
    const sens = block?.[2].match(/<InstrumentSensitivity>\s*<Value>([^<]+)<\/Value>\s*<Frequency>([^<]+)<\/Frequency>/);
    out.channels.push({
      loc: ch.loc, cha: ch.cha, sampleRate: Number(f[14]),
      azimuth: Number(f[8]), dip: Number(f[9]),
      units: f[13].trim().toUpperCase(),
      sensitivity: sens ? Number(sens[1]) : (f[11].trim() ? Number(f[11]) : null),
      sensitivityFreq: sens ? Number(sens[2]) : (f[12].trim() ? Number(f[12]) : null),
      sensor: f[10].trim(),
    });
  }
  return out;
}

async function main() {
  const o = parseArgs(process.argv.slice(2));
  if (!o.station.length || !o.from || !o.until) {
    throw new Error('need --station, --from and --until (or --demo); see the top of this file');
  }
  const out = path.resolve(o.out ?? path.join(here, 'out/uhsn/v1'));
  const fromMs = time(o.from, '--from');
  const untilMs = time(o.until, '--until');
  const publicUntilMs = o['public-until'] ? time(o['public-until'], '--public-until') : untilMs;
  const nowMs = o.now ? time(o.now, '--now') : publicUntilMs + 600000;
  const now = isoMs(nowMs);
  const channels = o.station.map((s) => {
    const [net, sta, loc, cha] = s.split('.');
    if (!cha) throw new Error(`--station ${s}: use NET.STA.LOC.CHA, e.g. UU.HEB.01.EHZ`);
    return { net, sta, loc, cha };
  });

  // Start clean, but only remove what this script makes.
  for (const d of ['sds', 'index', 'stations']) fs.rmSync(path.join(out, d), { recursive: true, force: true });
  fs.mkdirSync(out, { recursive: true });

  const byStation = new Map();
  for (const ch of channels) {
    const key = `${ch.net}.${ch.sta}`;
    if (!byStation.has(key)) byStation.set(key, []);
    byStation.get(key).push(ch);
  }

  const stationsJson = { version: 1, generated: now, stations: [] };
  const indexJson = { version: 1, generated: now, stations: {} };
  const listing = [];
  const primarySchools = new Set();

  for (const [key, chans] of byStation) {
    const [net, sta] = key.split('.');
    const info = await stationInfo(net, sta, chans, fromMs);
    const xmlPath = `stations/${key}.xml`;
    fs.mkdirSync(path.join(out, 'stations'), { recursive: true });
    fs.writeFileSync(path.join(out, xmlPath), info.xml);
    const school = `test-${sta.toLowerCase()}`;
    stationsJson.stations.push({
      net, sta, rsSta: sta, school,
      schoolName: `Test tree: UU station ${sta} ${PLACE[sta] ?? `(${info.site})`} (stand-in for a school Shake)`,
      primary: !primarySchools.has(school), sharing: 'sharing', delayHours: 0,
      lat: info.lat, lon: info.lon, elevM: info.elevM, model: 'test: UU station',
      start: isoMs(info.start), end: null, stationXml: xmlPath, clockChecked: null,
      channels: info.channels,
    });
    primarySchools.add(school);

    const avail = new Map(); // year -> availability file
    const indexChannels = {};
    for (const ch of chans) {
      // The publish step (spec 5.2): cutoff, whole records, sort and clean, one file per
      // UTC day (a record goes in the day its first sample falls in, as slarchive files it).
      const recs = cutAtCutoff(await download(ch, fromMs, untilMs), publicUntilMs);
      const days = new Map();
      for (const r of recs) {
        const d = utcDayStart(r.startMs);
        if (!days.has(d)) days.set(d, []);
        days.get(d).push(r);
      }
      let lastSample = null;
      for (const dayMs of [...days.keys()].sort((a, b) => a - b)) {
        const dayRecs = sortDedupe(days.get(dayMs));
        const rel = sdsPath(ch, dayMs);
        const file = path.join(out, rel);
        fs.mkdirSync(path.dirname(file), { recursive: true });
        // 1. the day file, written under a temporary name and renamed into place
        fs.writeFileSync(file + '.tmp', Buffer.concat(dayRecs.map((r) => r.bytes)));
        fs.renameSync(file + '.tmp', file);
        // 2. its sidecar. Offsets are those of the file just written.
        const desc = describeDay(dayRecs, { dayStartMs: dayMs, publicUntilMs });
        writeJson(file + '.json', { version: 1, id: nslc(ch), day: isoDay(dayMs), ...desc, updated: now });
        // 3. the day's line in the station-year availability file
        const year = new Date(dayMs).getUTCFullYear();
        if (!avail.has(year)) avail.set(year, { version: 1, net, sta, year, generated: now, channels: {} });
        const bytes = fs.statSync(file).size;
        ((avail.get(year).channels[`${ch.loc}.${ch.cha}`] ??= {}))[isoDay(dayMs)] = {
          status: dayStatus(dayMs, publicUntilMs),
          coverage: desc.coverage, ...gapTotals(desc.gaps), bytes, updated: now,
        };
        lastSample = desc.lastSampleEnd;
        listing.push([rel, bytes, `${desc.records} records, coverage ${desc.coverage}, ${desc.gaps.length} gaps`]);
      }
      if (!days.size) { console.warn(`no data for ${nslc(ch)}`); continue; }
      // Status (7.5) by the lag publicUntil − lastSample, for an hourly station (a test tree's
      // stations are "sharing", and sharing stations are delivered hourly).
      indexChannels[`${ch.loc}.${ch.cha}`] = {
        firstDay: isoDay(Math.min(...days.keys())), lastSample, updated: now,
        status: channelStatus(publicUntilMs, Date.parse(lastSample)),
      };
    }
    for (const [year, a] of avail) writeJson(path.join(out, `index/${key}.${year}.json`), a);
    if (Object.keys(indexChannels).length) {
      indexJson.stations[key] = { publicUntil: isoMs(publicUntilMs), channels: indexChannels };
    }
  }
  writeJson(path.join(out, 'stations.json'), stationsJson);
  // 4. last of all, the index (spec 7.3, write order)
  writeJson(path.join(out, 'index.json'), indexJson);

  const cmd = `node tools/uhsn-test/make-tree.mjs ${process.argv.slice(2).join(' ')}`;
  fs.writeFileSync(path.join(out, 'ABOUT.txt'), `UHSN public tree, version 1: a TEST tree
==========================================

This folder is laid out as the UHSN data specification describes (version 1.1, section 7:
planning/spec-uhsn-data.md in the repository), but it does not hold school data. It holds
recordings of a University of Utah station, standing in for a school's Raspberry Shake, so
the School Shake viewer and its reader (docs/app/js/data/uhsn.js) can be tried and tested.

Data: University of Utah Seismograph Stations, network UU (doi:10.7914/SN/UU), from
EarthScope's FDSN web services (service.earthscope.org): dataselect for the records,
station for the metadata. Nothing here comes from Raspberry Shake.

Channels: ${channels.map(nslc).join(', ')}
Span delivered: ${isoMs(fromMs)} to ${isoMs(untilMs)}; public until ${isoMs(publicUntilMs)}
Made by: ${cmd}
Data fetched from EarthScope: ${new Date().toISOString().slice(0, 10)} (or earlier, from the local cache)

The records are the station's own 512-byte miniSEED records, copied byte for byte.

Where this tree differs from the specification's example values:
- "net" is "UU", not "AM". Record headers are never rewritten, so a tree of UU records keeps
  UU codes (and UU's location code, e.g. "01", where a Shake has "00").
- "model" is "test: UU station", not a Raspberry Shake model.
- "units" are what UU's metadata give. For an old analog station such as HEB that is "M"
  (displacement: the sensitivity is in counts per meter), which spec 1.1 allows for it.
- The StationXML is UU's own, as EarthScope serves it, not built from a Raspberry Shake
  template; its schema version is whatever EarthScope writes.
- "clockChecked" is null: nobody checked a clock.

To check a tree against the specification:
  node tools/uhsn-test/check-tree.mjs <this folder, or its web address>
`);

  for (const f of ['ABOUT.txt', 'stations.json', 'index.json']) listing.push([f, fs.statSync(path.join(out, f)).size, '']);
  let total = 0;
  const walk = (d) => fs.readdirSync(d, { withFileTypes: true }).forEach((e) => {
    const p = path.join(d, e.name);
    if (e.isDirectory()) walk(p); else total += fs.statSync(p).size;
  });
  walk(out);
  console.log(`Wrote ${out}`);
  for (const [f, bytes, note] of listing) console.log(`  ${String(bytes).padStart(9)}  ${f}  ${note}`);
  console.log(`  total ${(total / 1e6).toFixed(2)} MB in all files`);
}

main().catch((err) => { console.error(err.message); process.exit(1); });
