// Phase 0 science check: how well does P-wave particle motion point to the quake?
//
//   node tools/quake-explorer/motion-check.mjs uu80162166 uu60363602 [--recent 12]
//        [--maxKm 200] [--band 1-8] [--focus TMU,SGU]
//
// For each quake and each 3-component station with a UUSS analyst P pick:
// band-pass the three components, take a short window starting at the P pick,
// estimate the direction to the quake (motion.js pWaveBackAzimuth) and compare
// it with the true direction from the official epicenter. Window lengths 0.3,
// 0.5 and 1.0 s are compared. --recent N adds the N most recent M2.5+ quakes
// with analyst picks within 150 km of the central-Utah schools.
import { app, parseArgs, table, networkRequests } from './node-setup.mjs';

const { EarthScopeUSGSSource } = await app('data/earthscope-usgs.js');
const { picksByStation, chooseChannels, channelInfo } = await app('lib/fdsn.js');
const { distanceKm, azimuthDeg } = await app('lib/geo.js');
const { rotateHorizontals, verticalUp, pWaveBackAzimuth, angleDiff } = await app('lib/motion.js');
const { filteredData } = await app('data/filters.js');
const { REGION, SCHOOLS } = await app('config.js');

const args = parseArgs();
const maxKm = Number(args.maxKm || 200);
const [lo, hi] = String(args.band || '1-8').split('-').map(Number);
const focus = String(args.focus || 'TMU,SGU').split(',');
const WINDOWS = [0.3, 0.5, 1.0];
const src = new EarthScopeUSGSSource();

const ids = [...args._];
if (args.recent) {
  const now = Date.now();
  const list = await src.getEvents({ startMs: now - 2 * 365 * 86400e3, endMs: now, minMag: 2.5, region: REGION });
  const centre = { lat: 39.35, lon: -111.65 };
  const near = list.filter((e) => e.hasPhaseData && distanceKm(centre.lat, centre.lon, e.lat, e.lon) < 150)
    .slice(0, Number(args.recent));
  for (const e of near) if (!ids.includes(e.id)) ids.push(e.id);
}

const results = [];
for (const id of ids) {
  const ev = await src.getEvent(id);
  const by = picksByStation(await src.getAnalystPicks(id));
  const stations = await src.getStations({ lat: ev.lat, lon: ev.lon, maxKm, atMs: ev.timeMs });
  const cands = [];
  for (const s of stations) {
    const p = by[`${s.net}.${s.sta}`]?.P;
    const ch = chooseChannels(s);
    if (!p || !ch || ch.channels.length < 3) continue;
    cands.push({ s, ch, info: channelInfo(s, ch), pMs: p });
  }
  if (!cands.length) continue;
  const reqs = cands.flatMap((c) => c.ch.channels.map((cha) => ({ net: c.s.net, sta: c.s.sta, loc: c.ch.loc, cha })));
  const tMin = Math.min(...cands.map((c) => c.pMs)) - 6000;
  const tMax = Math.max(...cands.map((c) => c.pMs)) + 6000;
  const traces = await src.getWaveforms(reqs, tMin, tMax);
  for (const c of cands) {
    const tr = c.ch.channels.map((cha) => traces.find((t) => t.sta === c.s.sta && t.cha === cha));
    if (tr.some((t) => !t) || new Set(tr.map((t) => t.sampleRate)).size > 1) continue;
    const [z, h1, h2] = tr.map((t) => filteredData(t, { lo, hi }));
    const [iz, i1, i2] = c.info;
    const up = verticalUp(z, iz.dip ?? -90);
    const { n, e } = rotateHorizontals(h1, h2, i1.azimuth ?? 0, i2.azimuth ?? 90);
    const sr = tr[0].sampleRate;
    const iP = Math.round(((c.pMs - tr[0].startMs) / 1000) * sr);
    const trueBaz = azimuthDeg(c.s.lat, c.s.lon, ev.lat, ev.lon);
    const row = { event: id, mag: ev.mag, sta: c.s.sta, band: c.ch.band, distKm: distanceKm(ev.lat, ev.lon, c.s.lat, c.s.lon),
      trueBaz, orient: `${c.ch.channels[1].slice(-1)}${c.ch.channels[2].slice(-1)} ${i1.azimuth ?? '?'}/${i2.azimuth ?? '?'}` };
    for (const w of WINDOWS) {
      const r = pWaveBackAzimuth(up, n, e, iP - Math.round(0.05 * sr), iP + Math.round(w * sr));
      row[`err${w}`] = angleDiff(r.bazDeg, trueBaz);
      row[`lin${w}`] = r.linearity;
      row[`corr${w}`] = r.upAwayCorr;
    }
    results.push(row);
  }
}

const f0 = (x) => (Number.isFinite(x) ? x.toFixed(0) : '–');
const f2 = (x) => (Number.isFinite(x) ? x.toFixed(2) : '–');
console.log(`band ${lo}–${hi} Hz; quakes: ${ids.join(', ')}`);
console.log(table(results.map((r) => ({
  event: r.event, M: r.mag, sta: r.sta, band: r.band, 'km': r.distKm.toFixed(0), 'true baz': f0(r.trueBaz),
  'err 0.3': f0(r['err0.3']), 'err 0.5': f0(r['err0.5']), 'err 1.0': f0(r['err1'] ?? r['err1.0']),
  'lin 0.5': f2(r['lin0.5']), 'up/away 0.5': f2(r['corr0.5']), orient: r.orient,
})), ['event', 'M', 'sta', 'band', 'km', 'true baz', 'err 0.3', 'err 0.5', 'err 1.0', 'lin 0.5', 'up/away 0.5', 'orient']));

const stats = (rows, w) => {
  const e = rows.map((r) => Math.abs(r[`err${w}`] ?? r[`err${String(w).replace('.0', '')}`])).filter(Number.isFinite).sort((a, b) => a - b);
  if (!e.length) return '–';
  const med = e[Math.floor(e.length / 2)];
  const within = (x) => Math.round((100 * e.filter((v) => v <= x).length) / e.length);
  return `n=${e.length}, median |error| ${med.toFixed(0)}°, within 15°: ${within(15)}%, within 30°: ${within(30)}%, flipped (>150°): ${Math.round((100 * e.filter((v) => v > 150).length) / e.length)}%`;
};
for (const w of WINDOWS) {
  console.log(`window ${w} s — all stations: ${stats(results, w)}`);
  console.log(`              HH (broadband): ${stats(results.filter((r) => r.band === 'HH'), w)}`);
  console.log(`              ${focus.join('+')}: ${stats(results.filter((r) => focus.includes(r.sta)), w)}`);
}
const good = results.filter((r) => r['corr0.5'] > 0.5 && r['lin0.5'] > 0.8);
console.log(`window 0.5 s, only clear motion (up/away > 0.5, linearity > 0.8): ${stats(good, 0.5)}`);
console.log(`(network requests this run: ${networkRequests()}; schools: ${SCHOOLS.map((s) => s.standIn.sta).join(', ')})`);
