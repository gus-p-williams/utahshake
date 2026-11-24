// Phase 0 science check: do a blast and a quake of the same size, recorded at
// the same stations, look different? (Investigation B, "quake or blast?")
//
//   node tools/quake-explorer/blast-check.mjs uu80161881 uu80120191 [--maxKm 120]
//
// The two events should be about the same size and place. For each station
// that recorded both (with analyst P picks, vertical channel, 1–20 Hz), it
// compares, on the same instrument so the units cancel:
//   P/S   peak amplitude in the 2 s after P / peak in the 4 s after S
//         (explosions push outward in all directions: strong P, weaker S)
//   HF    average spectrum 8–20 Hz / 1–5 Hz over P to S + 15 s
//   local time of day (blasts happen in working hours)
import { app, parseArgs, table } from './node-setup.mjs';

const { EarthScopeUSGSSource } = await app('data/earthscope-usgs.js');
const { picksByStation, chooseChannels } = await app('lib/fdsn.js');
const { distanceKm } = await app('lib/geo.js');
const { filteredData } = await app('data/filters.js');
const { peakAbs } = await app('lib/signal.js');
const { amplitudeSpectrum } = await app('lib/spectral.js');
const { aicPick, searchWindow } = await app('lib/picker.js');

const args = parseArgs();
const ids = args._;
if (ids.length < 2) { console.error('usage: node tools/quake-explorer/blast-check.mjs <blast id> <quake id> [--maxKm 120]'); process.exit(1); }
const maxKm = Number(args.maxKm || 120);
const src = new EarthScopeUSGSSource();

const info = [];
for (const id of ids) {
  const ev = await src.getEvent(id);
  const json = await (await fetch(`https://earthquake.usgs.gov/fdsnws/event/1/query?format=geojson&eventid=${id}`)).json();
  const by = picksByStation(await src.getAnalystPicks(id));
  const stations = await src.getStations({ lat: ev.lat, lon: ev.lon, maxKm, atMs: ev.timeMs });
  info.push({ id, ev, type: json.properties.type, by, stations });
}
const mdt = (ms) => new Date(ms - 6 * 3600e3).toISOString().slice(11, 16);
for (const e of info) {
  console.log(`${e.id}  ${e.type}  M${e.ev.mag}  depth ${e.ev.depthKm} km  local (MDT) ${mdt(e.ev.timeMs)}  ${e.ev.place}`);
}

const common = info[0].stations.filter((s) => info.every((e) => e.by[`${s.net}.${s.sta}`]?.P &&
  e.stations.some((x) => x.sta === s.sta)));
const rows = [];
for (const s of common) {
  const ch = chooseChannels(s);
  if (!ch) continue;
  const row = { sta: s.sta };
  for (const [k, e] of info.entries()) {
    const d = distanceKm(e.ev.lat, e.ev.lon, s.lat, s.lon);
    const pMs = e.by[`${s.net}.${s.sta}`].P;
    const pSec = (pMs - e.ev.timeMs) / 1000;
    const [tr] = await src.getWaveforms([{ net: s.net, sta: s.sta, loc: ch.loc, cha: ch.channels[0] }],
      e.ev.timeMs - 10000, e.ev.timeMs + (d / 3.0 + 25) * 1000);
    if (!tr) continue;
    const y = filteredData(tr, { lo: 1, hi: 20 });
    const sr = tr.sampleRate;
    const startSec = (tr.startMs - e.ev.timeMs) / 1000;
    const idx = (t) => Math.round((t - startSec) * sr);
    let sSec = e.by[`${s.net}.${s.sta}`].S !== undefined ? (e.by[`${s.net}.${s.sta}`].S - e.ev.timeMs) / 1000 : null;
    if (sSec === null) sSec = aicPick(y, sr, startSec, ...searchWindow('S', d, pSec))?.tSec ?? d / 3.45;
    const pAmp = peakAbs(y, idx(pSec), idx(pSec + 2));
    const sAmp = peakAbs(y, idx(sSec), idx(sSec + 4));
    const spec = amplitudeSpectrum(y.subarray(idx(pSec - 0.5), idx(sSec + 15)), sr);
    const band = (f0, f1) => {
      let sum = 0; let n = 0;
      spec.freqs.forEach((f, i) => { if (f >= f0 && f <= f1) { sum += spec.amp[i]; n++; } });
      return sum / n;
    };
    row[`km${k}`] = d.toFixed(0);
    row[`PS${k}`] = (pAmp / sAmp).toFixed(2);
    row[`HF${k}`] = (band(8, 20) / band(1, 5)).toFixed(3);
  }
  if (row.PS0 && row.PS1) rows.push(row);
}
const labels = info.map((e, k) => `${k}=${e.type}`).join(', ');
console.log(`stations that recorded both (${labels}):`);
console.log(table(rows, ['sta', 'km0', 'PS0', 'HF0', 'km1', 'PS1', 'HF1']));
const median = (a) => { const s = [...a].sort((x, y) => x - y); return s[Math.floor(s.length / 2)]; };
for (const k of [0, 1]) {
  console.log(`${info[k].type}: median P/S ${median(rows.map((r) => Number(r[`PS${k}`]))).toFixed(2)}, ` +
    `median HF ${median(rows.map((r) => Number(r[`HF${k}`]))).toFixed(3)}`);
}
const higherPS = rows.filter((r) => Number(r.PS0) > Number(r.PS1)).length;
console.log(`stations where event 0 has the larger P/S: ${higherPS} of ${rows.length}`);
