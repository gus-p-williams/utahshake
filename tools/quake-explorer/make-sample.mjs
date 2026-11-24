// Bundle a quake's data for Quake Explorer's offline mode
// (docs/app/data/samples/<dir>/, listed under "explorer" in index.json).
//
//   node tools/quake-explorer/make-sample.mjs <event id> --dir qe-junction
//        [--section 300] [--bandKm 12.5] [--threeC MTPU,TCRU] [--stations SUU,LEVU]
//        [--pre 10] [--post 110] [--views record-section,frequencies,motion]
//
// --section KM   record-section stations out to KM (selectRecordSection, as the
//                app does), vertical channel only unless listed in --threeC
// --stations     extra stations with all three components (for particle
//                motion, spectrograms or a blast/quake comparison)
// Also stores computer first-arrival picks (AIC, labelled as such) for
// section stations the analysts didn't pick, so the answer key reaches as far
// as the record section does.
import fs from 'node:fs';
import path from 'node:path';
import { app, root, parseArgs, networkRequests } from './node-setup.mjs';

const { EarthScopeUSGSSource } = await app('data/earthscope-usgs.js');
const { picksByStation, pickRanks, chooseChannels, channelInfo, dataselectPostBody } = await app('lib/fdsn.js');
const { selectRecordSection } = await app('lib/stations.js');
const { distanceKm, azimuthDeg } = await app('lib/geo.js');
const { parseMiniseed } = await app('data/mseed.js');
const { filteredData } = await app('data/filters.js');
const { isFlat, isClipped } = await app('lib/signal.js');
const { aicPick, searchWindow } = await app('lib/picker.js');
const { SCHOOLS, ATTRIBUTION } = await app('config.js');

const args = parseArgs();
const id = args._[0];
const dirName = String(args.dir || `qe-${id}`);
if (!id) { console.error('usage: node tools/quake-explorer/make-sample.mjs <event id> --dir <name> [options]'); process.exit(1); }
const list = (v) => (v && v !== true ? String(v).split(',').filter(Boolean) : []);
const sectionKm = args.section ? Number(args.section) : 0;
const threeC = new Set(list(args.threeC));
const extra = list(args.stations);
const pre = Number(args.pre ?? 10);
const post = Number(args.post ?? 110);
const views = list(args.views).length ? list(args.views) : ['record-section', 'frequencies', 'motion'];

const src = new EarthScopeUSGSSource();
const event = await src.getEvent(id);
const eventJson = await (await fetch(`https://earthquake.usgs.gov/fdsnws/event/1/query?format=geojson&eventid=${id}`)).json();
event.eventType = eventJson.properties.type;
const t0 = event.timeMs;
console.log(`${id} ${event.eventType} M${event.mag} ${new Date(t0).toISOString()} ${event.place}`);
const picks = await src.getAnalystPicks(id);
const by = picksByStation(picks);
const searchKm = Math.max(sectionKm, 200);
const all = await src.getStations({ lat: event.lat, lon: event.lon, maxKm: searchKm, atMs: t0 });

// Station list: record section (+ school stand-ins), then extras.
const chosen = new Map();
if (sectionKm) {
  const { stations } = selectRecordSection(event, all,
    { maxKm: sectionKm, bandKm: Number(args.bandKm || 12.5), prefer: pickRanks(by), schools: SCHOOLS });
  for (const s of stations) {
    chosen.set(s.sta, { s: all.find((x) => x.sta === s.sta), role: s.role, schools: s.schools,
      comps: threeC.has(s.sta) ? 3 : 1 });
  }
}
for (const sta of extra) {
  const s = all.find((x) => x.sta === sta);
  if (!s) { console.warn(`  ${sta}: not found within ${searchKm} km`); continue; }
  const school = SCHOOLS.filter((x) => x.standIn.sta === sta).map((x) => x.name);
  chosen.set(sta, { s, role: chosen.get(sta)?.role || (school.length ? 'school' : 'extra'), schools: school, comps: 3 });
}

const reqs = [];
const meta = [];
for (const { s, role, schools, comps } of chosen.values()) {
  const ch = chooseChannels(s);
  if (!ch) continue;
  const use = { ...ch, channels: ch.channels.slice(0, comps) };
  meta.push({ s, role, schools, ch: use, info: channelInfo(s, use) });
  for (const cha of use.channels) reqs.push({ net: s.net, sta: s.sta, loc: ch.loc, cha });
}
const startMs = t0 - pre * 1000;
const endMs = t0 + post * 1000;
async function fetchMseed(rs) {
  const res = await fetch('https://service.earthscope.org/fdsnws/dataselect/1/query', {
    method: 'POST', body: dataselectPostBody(rs, startMs, endMs), headers: { 'Content-Type': 'text/plain' } });
  if (!res.ok) throw new Error(`dataselect ${res.status}`);
  const b = Buffer.from(await res.arrayBuffer());
  return { bytes: b, traces: parseMiniseed(b.buffer.slice(b.byteOffset, b.byteOffset + b.length), { fromMs: startMs, toMs: endMs }) };
}
let { bytes, traces } = await fetchMseed(reqs);
// A station counts only if every chosen channel came back with real data
// (dead sensors record a flat line).
const good = new Set(meta.filter((m) => m.ch.channels.every((cha) =>
  traces.some((t) => t.sta === m.s.sta && t.cha === cha && !isFlat(t.data, 50)))).map((m) => m.s.sta));
const keep = meta.filter((m) => good.has(m.s.sta));
if (keep.length < meta.length) {
  // Fetch again without the dropped stations, so the file holds only what stations.json lists.
  ({ bytes, traces } = await fetchMseed(reqs.filter((r) => good.has(r.sta))));
}
console.log(`waveforms: ${(bytes.length / 1024).toFixed(0)} KB, ${traces.length} channels; ` +
  `stations kept ${keep.length}/${meta.length}${meta.length > keep.length ? ` (no data: ${meta.filter((m) => !good.has(m.s.sta)).map((m) => m.s.sta).join(', ')})` : ''}`);

// Computer picks where the analysts have none.
const computer = [];
for (const m of keep) {
  const key = `${m.s.net}.${m.s.sta}`;
  const tr = traces.find((t) => t.sta === m.s.sta && t.cha === m.ch.channels[0]);
  if (!tr) continue;
  const y = filteredData(tr, { lo: 1, hi: 10 });
  const d = distanceKm(event.lat, event.lon, m.s.lat, m.s.lon);
  const startSec = (tr.startMs - t0) / 1000;
  let pSec = by[key]?.P !== undefined ? (by[key].P - t0) / 1000 : undefined;
  if (pSec === undefined) {
    const p = aicPick(y, tr.sampleRate, startSec, ...searchWindow('P', d));
    if (p && p.snr >= 3) {
      computer.push({ net: m.s.net, sta: m.s.sta, cha: tr.cha, phase: 'P', timeMs: Math.round(t0 + p.tSec * 1000), snr: +p.snr.toFixed(1) });
      pSec = p.tSec;
    }
  }
  if (by[key]?.S === undefined && pSec !== undefined && d <= 260 && endMs > t0 + (d / 3.2 + 2) * 1000) {
    const sp = aicPick(y, tr.sampleRate, startSec, ...searchWindow('S', d, pSec));
    if (sp && sp.snr >= 2) computer.push({ net: m.s.net, sta: m.s.sta, cha: tr.cha, phase: 'S', timeMs: Math.round(t0 + sp.tSec * 1000), snr: +sp.snr.toFixed(1) });
  }
}

const dir = path.join(root, 'docs/app/data/samples', dirName);
fs.mkdirSync(dir, { recursive: true });
const stationJson = keep.map((m) => ({
  net: m.s.net, sta: m.s.sta, lat: m.s.lat, lon: m.s.lon, elevM: m.s.elevM,
  role: m.role, schools: m.schools,
  distKm: +distanceKm(event.lat, event.lon, m.s.lat, m.s.lon).toFixed(2),
  bazDeg: +azimuthDeg(m.s.lat, m.s.lon, event.lat, event.lon).toFixed(1),
  channels: m.info.map((c) => {
    const t = traces.find((x) => x.sta === m.s.sta && x.cha === c.cha);
    return { ...c, sampleRate: t?.sampleRate ?? c.sampleRate, clipped: t ? isClipped(t.data) : undefined };
  }),
}));
const keptKeys = new Set(keep.map((m) => `${m.s.net}.${m.s.sta}`));
fs.writeFileSync(path.join(dir, 'event.json'), JSON.stringify(event, null, 1) + '\n');
fs.writeFileSync(path.join(dir, 'stations.json'), JSON.stringify(stationJson, null, 1) + '\n');
fs.writeFileSync(path.join(dir, 'picks.json'), JSON.stringify(picks.filter((p) => keptKeys.has(`${p.net}.${p.sta}`)), null, 1) + '\n');
fs.writeFileSync(path.join(dir, 'computer-picks.json'), JSON.stringify(computer, null, 1) + '\n');
fs.writeFileSync(path.join(dir, 'waveforms.mseed'), bytes);
fs.writeFileSync(path.join(dir, 'sample.json'), JSON.stringify({
  kind: 'explorer', event: id, eventType: event.eventType, views,
  window: { preSec: pre, postSec: post }, sectionKm: sectionKm || null,
  made: new Date().toISOString().slice(0, 10),
  command: `node tools/quake-explorer/make-sample.mjs ${process.argv.slice(2).join(' ')}`,
}, null, 1) + '\n');
fs.writeFileSync(path.join(dir, 'ABOUT.txt'), `Quake Explorer offline sample: ${event.place}, M${event.mag} (${event.eventType})

- Event: ${event.id}, ${new Date(t0).toISOString()} (UTC), ${event.url}
- Window: ${pre} s before to ${post} s after the origin time
- Stations: ${keep.map((m) => `${m.s.sta}${m.ch.channels.length === 3 ? ' (3 comp.)' : ''}`).join(', ')}
- picks.json: UUSS analyst picks. computer-picks.json: AIC picks made by
  tools/quake-explorer/make-sample.mjs where the analysts made none (P: SNR >= 3,
  S: SNR >= 2); they can differ from what an analyst would pick.
- Made with \`node tools/quake-explorer/make-sample.mjs ${process.argv.slice(2).join(' ')}\` on ${new Date().toISOString().slice(0, 10)}

${ATTRIBUTION.waveforms}
${ATTRIBUTION.events}
`);
const indexFile = path.join(root, 'docs/app/data/samples/index.json');
const index = JSON.parse(fs.readFileSync(indexFile, 'utf8'));
index.explorer ||= [];
if (!index.explorer.includes(dirName)) index.explorer.push(dirName);
fs.writeFileSync(indexFile, JSON.stringify(index, null, 1) + '\n');
const size = fs.readdirSync(dir).reduce((n, f) => n + fs.statSync(path.join(dir, f)).size, 0);
console.log(`wrote ${dir} (${(size / 1024).toFixed(0)} KB; computer picks: ${computer.length}; requests: ${networkRequests()})`);
