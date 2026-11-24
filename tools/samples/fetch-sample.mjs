// Bundle one quake's data for offline use (docs/app/data/samples/<eventId>/).
//
//   node tools/samples/fetch-sample.mjs uu80162166
//
// Picks stations the same way the app does (school stand-ins + helpers around
// the quake, preferring stations with UUSS analyst picks), saves the raw
// miniSEED, the station list, the event and the analyst picks, then checks
// that the analyst S-minus-P times locate the quake near the official spot.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// The seisplotjs bundle registers a web component when loaded; give node a stub.
globalThis.HTMLElement ??= class {};
globalThis.customElements ??= { define() {}, get() {} };

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const app = (p) => import(new URL(`file:///${path.join(root, 'docs/app/js', p).replace(/\\/g, '/')}`));
const { SCHOOLS, WAVE_RACE: W, ATTRIBUTION } = await app('config.js');
const { EarthScopeUSGSSource } = await app('data/earthscope-usgs.js');
const { selectStations } = await app('lib/stations.js');
const { dataselectPostBody, picksByStation, pickRanks } = await app('lib/fdsn.js');
const { parseMiniseed } = await app('data/mseed.js');
const { isFlat } = await app('lib/signal.js');
const { spToDistanceKm, locateGrid } = await app('lib/locate.js');
const { distanceKm } = await app('lib/geo.js');

const id = process.argv[2];
if (!id) { console.error('usage: node tools/samples/fetch-sample.mjs <ComCat event id>'); process.exit(1); }

const src = new EarthScopeUSGSSource();
const event = await src.getEvent(id);
console.log(`${event.id} M${event.mag} ${new Date(event.timeMs).toISOString()} ${event.place}`);

const picks = await src.getAnalystPicks(id);
const byStation = picksByStation(picks);
const prefer = pickRanks(byStation); // P+S picked first, then P only
console.log(`analyst picks: ${picks.length}; stations with P and S: ${[...prefer.values()].filter((r) => r === 0).length}`);

const all = await src.getStations({ lat: event.lat, lon: event.lon,
  maxKm: Math.max(W.maxStandInKm, W.maxHelperKm), atMs: event.timeMs });
const { stations, schoolsTooFar } = selectStations(event, all, SCHOOLS,
  { maxStandInKm: W.maxStandInKm, maxHelperKm: W.maxHelperKm, maxStations: W.maxStations, prefer });
console.log('stations:', stations.map((s) => `${s.sta}(${s.distKm.toFixed(0)} km${s.schools.length ? ', ' + s.schools.join('/') : ''})`).join(' '));
if (schoolsTooFar.length) console.log('schools too far:', schoolsTooFar.join(', '));

const startMs = event.timeMs - W.preOriginSec * 1000;
const endMs = event.timeMs + W.postOriginSec * 1000;
const reqs = stations.flatMap((s) => s.channels.map((cha) => ({ net: s.net, sta: s.sta, loc: s.loc, cha })));
const res = await fetch('https://service.earthscope.org/fdsnws/dataselect/1/query', {
  method: 'POST', body: dataselectPostBody(reqs, startMs, endMs), headers: { 'Content-Type': 'text/plain' } });
if (!res.ok) throw new Error(`dataselect ${res.status}`);
const bytes = Buffer.from(await res.arrayBuffer());
const traces = parseMiniseed(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.length),
  { fromMs: startMs, toMs: endMs });
const withData = new Set(traces.filter((t) => !isFlat(t.data)).map((t) => `${t.net}.${t.sta}`));
console.log(`waveforms: ${(bytes.length / 1024).toFixed(0)} KB, ${traces.length} channels from ${withData.size} stations`);

// Real-data check: locate from the analysts' own S-minus-P times.
const obs = stations.filter((s) => byStation[`${s.net}.${s.sta}`]?.P && byStation[`${s.net}.${s.sta}`]?.S)
  .map((s) => {
    const p = byStation[`${s.net}.${s.sta}`];
    return { lat: s.lat, lon: s.lon, distKm: spToDistanceKm((p.S - p.P) / 1000, W.vp, W.vs) };
  });
if (obs.length >= 3) {
  const fit = locateGrid(obs, { depthKm: W.depthKm, sigmaKm: W.pickUncertaintySec * 7.7 });
  const err = distanceKm(fit.lat, fit.lon, event.lat, event.lon);
  console.log(`analyst S-P from ${obs.length} stations -> error ${err.toFixed(1)} km, ` +
    `misfit ${fit.rmsKm.toFixed(1)} km, uncertainty ~${fit.uncertaintyKm.toFixed(0)} km`);
}

// Write the sample.
const dir = path.join(root, 'docs/app/data/samples', id);
fs.mkdirSync(dir, { recursive: true });
const keep = stations.filter((s) => withData.has(`${s.net}.${s.sta}`));
const stationJson = keep.map((s) => ({ net: s.net, sta: s.sta, lat: s.lat, lon: s.lon, elevM: s.elevM,
  channels: s.channels.map((cha) => ({ loc: s.loc, cha, sampleRate: traces.find((t) => t.sta === s.sta && t.cha === cha)?.sampleRate ?? 100 })) }));
fs.writeFileSync(path.join(dir, 'event.json'), JSON.stringify(event, null, 1) + '\n');
fs.writeFileSync(path.join(dir, 'stations.json'), JSON.stringify(stationJson, null, 1) + '\n');
fs.writeFileSync(path.join(dir, 'picks.json'), JSON.stringify(
  picks.filter((p) => withData.has(`${p.net}.${p.sta}`)), null, 1) + '\n');
fs.writeFileSync(path.join(dir, 'waveforms.mseed'), bytes);
fs.writeFileSync(path.join(dir, 'ABOUT.txt'), `Offline sample: ${event.place}, M${event.mag}

- Event: ${event.id}, ${new Date(event.timeMs).toISOString()} (UTC), ${event.url}
- Window: ${W.preOriginSec} s before to ${W.postOriginSec} s after the origin time
- Stations: ${keep.map((s) => s.sta).join(', ')}
- Made with \`node tools/samples/fetch-sample.mjs ${id}\` on ${new Date().toISOString().slice(0, 10)}

${ATTRIBUTION.waveforms}
${ATTRIBUTION.events}
`);
const indexFile = path.join(root, 'docs/app/data/samples/index.json');
const index = fs.existsSync(indexFile) ? JSON.parse(fs.readFileSync(indexFile, 'utf8')) : { samples: [] };
if (!index.samples.includes(id)) index.samples.push(id);
fs.writeFileSync(indexFile, JSON.stringify(index, null, 1) + '\n');
console.log('wrote', dir);
