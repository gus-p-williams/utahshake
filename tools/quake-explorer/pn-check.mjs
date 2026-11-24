// Phase 0 science check: is the Pg -> Pn bend visible on a Utah record section?
//
//   node tools/quake-explorer/pn-check.mjs uu80162166 [--maxKm 300] [--out dir] [--bandKm 12.5]
//
// 1. Fits straight lines to the UUSS analysts' P and S picks against distance
//    (the "answer key" for investigation A): Pg and Sg speeds near the quake,
//    and a two-line fit of all first P arrivals (is there a faster Pn line
//    beyond some distance? how clear is it? what crust thickness does it give?).
// 2. Draws the record section students would see (stations chosen with
//    selectRecordSection, vertical channels, 1–10 Hz), plain and in "reduced
//    time" (t − d / 8, which makes an 8 km/s wave run straight down), with the
//    analyst picks and the fitted lines, as SVG in --out.
import fs from 'node:fs';
import path from 'node:path';
import { app, parseArgs, table, networkRequests } from './node-setup.mjs';

const { EarthScopeUSGSSource } = await app('data/earthscope-usgs.js');
const { picksByStation, pickRanks } = await app('lib/fdsn.js');
const { selectRecordSection } = await app('lib/stations.js');
const { distanceKm } = await app('lib/geo.js');
const { twoLineFit, speedFromArrivals, BEND_F_RATIO } = await app('lib/linefit.js');
const { crustFromIntercept, crossoverKm } = await app('lib/traveltime.js');
const { minMaxColumns, peakAbs, isFlat } = await app('lib/signal.js');
const { aicPick, searchWindow } = await app('lib/picker.js');
const { filteredData } = await app('data/filters.js');
const { SCHOOLS } = await app('config.js');

const args = parseArgs();
const id = args._[0];
if (!id) { console.error('usage: node tools/quake-explorer/pn-check.mjs <event id> [--maxKm 300] [--out dir]'); process.exit(1); }
const maxKm = Number(args.maxKm || 300);
const bandKm = Number(args.bandKm || 12.5);
const outDir = args.out ? path.resolve(String(args.out)) : null;

const src = new EarthScopeUSGSSource();
const event = await src.getEvent(id);
const t0 = event.timeMs;
console.log(`${event.id}  M${event.mag} ${event.magType}  ${new Date(t0).toISOString()}  depth ${event.depthKm} km  ${event.place}`);

const picks = await src.getAnalystPicks(id);
const by = picksByStation(picks);
const phaseLabels = [...new Set(picks.map((p) => p.phase))].join(', ');
const stations = await src.getStations({ lat: event.lat, lon: event.lon, maxKm, atMs: t0 });
const where = new Map(stations.map((s) => [`${s.net}.${s.sta}`, s]));

// --- 1. Analyst picks against distance --------------------------------------
const rows = [];
for (const [key, p] of Object.entries(by)) {
  const s = where.get(key);
  if (!s) continue;
  const d = distanceKm(event.lat, event.lon, s.lat, s.lon);
  rows.push({ key, sta: s.sta, distKm: d,
    P: p.P !== undefined ? (p.P - t0) / 1000 : undefined,
    S: p.S !== undefined ? (p.S - t0) / 1000 : undefined });
}
rows.sort((a, b) => a.distKm - b.distKm);
console.log(`analyst picks: ${picks.length} (phases: ${phaseLabels}); stations with P: ${rows.filter((r) => r.P !== undefined).length}, with S: ${rows.filter((r) => r.S !== undefined).length}; farthest P at ${Math.max(...rows.filter((r) => r.P !== undefined).map((r) => r.distKm)).toFixed(0)} km`);

const P = rows.filter((r) => r.P !== undefined).map((r) => ({ distKm: r.distKm, tSec: r.P, sta: r.sta }));
const S = rows.filter((r) => r.S !== undefined).map((r) => ({ distKm: r.distKm, tSec: r.S, sta: r.sta }));
const fmt = (x, d = 2) => (Number.isFinite(x) ? x.toFixed(d) : '–');
const summary = { event: { id, mag: event.mag, depthKm: event.depthKm, place: event.place } };

const nearP = P.filter((p) => p.distKm <= 100);
const nearS = S.filter((p) => p.distKm <= 100);
if (nearP.length >= 3) {
  const f = speedFromArrivals(nearP);
  summary.pg = f;
  console.log(`Pg (P picks within 100 km, n=${f.n}): ${fmt(f.speedKms)} ± ${fmt(f.speedSE)} km/s, intercept ${fmt(f.interceptSec)} s, rms ${fmt(f.rmsSec)} s`);
}
if (nearS.length >= 3) {
  const f = speedFromArrivals(nearS);
  summary.sg = f;
  console.log(`Sg (S picks within 100 km, n=${f.n}): ${fmt(f.speedKms)} ± ${fmt(f.speedSE)} km/s, intercept ${fmt(f.interceptSec)} s, rms ${fmt(f.rmsSec)} s`);
}
const allP = speedFromArrivals(P);
console.log(`one line through all P picks (n=${allP.n}): ${fmt(allP.speedKms)} km/s, rms ${fmt(allP.rmsSec)} s`);
const two = twoLineFit(P, { minPerLine: 4 });
if (two) {
  const crust = crustFromIntercept(two.far.interceptSec, two.near.speedKms, two.far.speedKms, event.depthKm);
  summary.twoLine = { ...two, crustKm: crust };
  console.log(`two lines: near ${fmt(two.near.speedKms)} ± ${fmt(two.near.speedSE)} km/s (n=${two.near.n}), ` +
    `far ${fmt(two.far.speedKms)} ± ${fmt(two.far.speedSE)} km/s (n=${two.far.n}, intercept ${fmt(two.far.interceptSec)} ± ${fmt(two.far.interceptSE)} s)`);
  console.log(`  split at ${fmt(two.splitKm, 0)} km, lines cross at ${fmt(two.crossoverKm, 0)} km, ` +
    `F ratio ${fmt(two.fRatio, 1)} (clear bend above ${BEND_F_RATIO}), rms ${fmt(two.near.rmsSec)} / ${fmt(two.far.rmsSec)} s`);
  console.log(`  crust thickness from the far line's intercept: ${fmt(crust, 1)} km ` +
    `(model crossover for that crust: ${fmt(crossoverKm(event.depthKm, crust, two.near.speedKms, two.far.speedKms), 0)} km)`);
} else {
  console.log('two lines: no split with a faster far line');
}
console.log(table(rows.map((r) => ({ sta: r.sta, 'dist km': r.distKm.toFixed(1), 'P s': fmt(r.P), 'S s': fmt(r.S),
  'P−d/8': fmt(r.P - r.distKm / 8) })), ['sta', 'dist km', 'P s', 'S s', 'P−d/8']));

// --- 2. The record section students would see -------------------------------
if (outDir) {
  fs.mkdirSync(outDir, { recursive: true });
  const prefer = pickRanks(by);
  const { stations: sec, bandsFilled, bandsTotal } = selectRecordSection(event, stations,
    { maxKm, bandKm, prefer, schools: SCHOOLS });
  console.log(`record section: ${sec.length} stations, ${bandsFilled}/${bandsTotal} distance bands filled`);
  const pre = 10;
  const post = Math.ceil(maxKm / 3.0 + 20);
  const reqs = sec.map((s) => ({ net: s.net, sta: s.sta, loc: s.loc, cha: s.channels[0] }));
  const traces = await src.getWaveforms(reqs, t0 - pre * 1000, t0 + post * 1000);
  const byKey = new Map(traces.map((t) => [`${t.net}.${t.sta}`, t]));
  const drawn = [];
  for (const s of sec) {
    const tr = byKey.get(`${s.net}.${s.sta}`);
    if (!tr || isFlat(tr.data)) { drawn.push({ s, tr: null }); continue; }
    drawn.push({ s, tr, y: filteredData(tr, { lo: 1, hi: 10 }) });
  }
  console.log(`  traces with data: ${drawn.filter((d) => d.tr).length}/${sec.length}; ` +
    `no data: ${drawn.filter((d) => !d.tr).map((d) => d.s.sta).join(', ') || 'none'}`);

  // Computer picks of the first arrival (AIC picker) where the analysts didn't
  // pick: mostly stations beyond ~180 km, which is where Pn should lead.
  const auto = [];
  const autoS = [];
  for (const d of drawn) {
    if (!d.tr) continue;
    const startSec = (d.tr.startMs - t0) / 1000;
    const analyst = by[`${d.s.net}.${d.s.sta}`];
    let pSec = analyst?.P !== undefined ? (analyst.P - t0) / 1000 : undefined;
    if (pSec === undefined) {
      const pk = aicPick(d.y, d.tr.sampleRate, startSec, ...searchWindow('P', d.s.distKm));
      if (pk) { auto.push({ sta: d.s.sta, distKm: d.s.distKm, tSec: pk.tSec, snr: pk.snr }); pSec = pk.tSec; }
    }
    if (analyst?.S === undefined && d.s.distKm <= 260) {
      const sk = aicPick(d.y, d.tr.sampleRate, startSec, ...searchWindow('S', d.s.distKm, pSec));
      if (sk) autoS.push({ sta: d.s.sta, distKm: d.s.distKm, tSec: sk.tSec, snr: sk.snr });
    }
  }
  const goodS = autoS.filter((a) => a.snr >= 2);
  const sPoints = [...S, ...goodS];
  if (sPoints.length >= 3) {
    const f = speedFromArrivals(sPoints);
    summary.sgWithAuto = { ...f, autoPicks: goodS };
    console.log(`  S: analyst (${S.length}) + computer (${goodS.length} of ${autoS.length} with SNR ≥ 2, vertical channel): ` +
      `${fmt(f.speedKms)} ± ${fmt(f.speedSE)} km/s, intercept ${fmt(f.interceptSec)} s, rms ${fmt(f.rmsSec)} s`);
    console.log(table(goodS.map((a) => ({ sta: a.sta, 'dist km': a.distKm.toFixed(1), 'S s': a.tSec.toFixed(2),
      'resid s': (a.tSec - f.interceptSec - a.distKm / f.speedKms).toFixed(2), SNR: a.snr.toFixed(1) })),
    ['sta', 'dist km', 'S s', 'resid s', 'SNR']));
  }
  const minSnr = Number(args.minSnr || 3);
  const goodAuto = auto.filter((a) => a.snr >= minSnr);
  console.log(`  computer first-arrival picks: ${auto.length} (clear, SNR ≥ ${minSnr}: ${goodAuto.length})`);
  console.log(table(auto.map((a) => ({ sta: a.sta, 'dist km': a.distKm.toFixed(1), 'P s': a.tSec.toFixed(2),
    'P−d/8': (a.tSec - a.distKm / 8).toFixed(2), SNR: a.snr.toFixed(1) })), ['sta', 'dist km', 'P s', 'P−d/8', 'SNR']));
  const combined = [...P, ...goodAuto];
  const two2 = twoLineFit(combined, { minPerLine: 4 });
  if (two2) {
    const crust = crustFromIntercept(two2.far.interceptSec, two2.near.speedKms, two2.far.speedKms, event.depthKm);
    summary.twoLineWithAuto = { ...two2, crustKm: crust, autoPicks: goodAuto };
    console.log(`  analyst + computer picks (n=${combined.length}): near ${fmt(two2.near.speedKms)} ± ${fmt(two2.near.speedSE)} km/s (n=${two2.near.n}), ` +
      `far ${fmt(two2.far.speedKms)} ± ${fmt(two2.far.speedSE)} km/s (n=${two2.far.n}, intercept ${fmt(two2.far.interceptSec)} ± ${fmt(two2.far.interceptSE)} s)`);
    console.log(`    split at ${fmt(two2.splitKm, 0)} km, lines cross at ${fmt(two2.crossoverKm, 0)} km, F ratio ${fmt(two2.fRatio, 1)}, ` +
      `crust from intercept ${fmt(crust, 1)} km; from crossover (surface formula) ${fmt(two2.crossoverKm / (2 * Math.sqrt((two2.far.speedKms + two2.near.speedKms) / (two2.far.speedKms - two2.near.speedKms))), 1)} km`);
  }
  for (const reduce of [0, 8]) {
    const svg = recordSectionSvg({ event, drawn, by, t0, pre, post, maxKm, bandKm, reduce,
      two: two2 || two, summary, autoPicks: goodAuto });
    const f = path.join(outDir, `${id}-section${reduce ? '-reduced' : ''}.svg`);
    fs.writeFileSync(f, svg);
    console.log('  wrote', f);
  }
}
if (outDir) fs.writeFileSync(path.join(outDir, `${id}-pn.json`), JSON.stringify({ ...summary, rows }, null, 1));
console.log(`(network requests this run: ${networkRequests()})`);

/** Record section as SVG: time across, distance down. reduce > 0 plots t − d / reduce. */
function recordSectionSvg({ event, drawn, by, t0, pre, post, maxKm, bandKm, reduce, two, summary, autoPicks = [] }) {
  const W = 1000;
  const H = 760;
  const m = { l: 60, r: 20, t: 40, b: 46 };
  const tShift = (d) => (reduce ? d / reduce : 0);
  const tMin = reduce ? -10 : 0;
  const tMax = reduce ? 40 : Math.min(post, maxKm / 3.1 + 15);
  const X = (t) => m.l + ((t - tMin) / (tMax - tMin)) * (W - m.l - m.r);
  const Y = (d) => m.t + (d / maxKm) * (H - m.t - m.b);
  const out = [];
  out.push(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" font-family="sans-serif" font-size="12">`);
  out.push(`<rect width="${W}" height="${H}" fill="white"/>`);
  out.push(`<text x="${m.l}" y="20" font-size="14">${event.id} M${event.mag} — ${reduce ? `reduced time t − d/${reduce} (s)` : 'time after origin (s)'}; 1–10 Hz, each trace scaled to its own peak</text>`);
  for (let t = Math.ceil(tMin / 10) * 10; t <= tMax; t += 10) {
    out.push(`<line x1="${X(t)}" x2="${X(t)}" y1="${m.t}" y2="${H - m.b}" stroke="#ddd"/>`);
    out.push(`<text x="${X(t)}" y="${H - m.b + 16}" text-anchor="middle">${t}</text>`);
  }
  for (let d = 0; d <= maxKm; d += 50) {
    out.push(`<line x1="${m.l}" x2="${W - m.r}" y1="${Y(d)}" y2="${Y(d)}" stroke="#eee"/>`);
    out.push(`<text x="${m.l - 6}" y="${Y(d) + 4}" text-anchor="end">${d}</text>`);
  }
  out.push(`<text x="${m.l - 44}" y="${(m.t + H - m.b) / 2}" transform="rotate(-90 ${m.l - 44} ${(m.t + H - m.b) / 2})" text-anchor="middle">distance (km)</text>`);
  const ampPx = ((H - m.t - m.b) / maxKm) * bandKm * 0.8;
  const cols = W - m.l - m.r;
  for (const { s, tr, y } of drawn) {
    const yy = Y(s.distKm);
    out.push(`<text x="${W - m.r - 2}" y="${yy - 2}" text-anchor="end" fill="${s.role === 'school' ? '#b35' : '#777'}" font-size="10">${s.sta}${tr ? '' : ' (no data)'}</text>`);
    if (!tr) continue;
    const startSec = (tr.startMs - t0) / 1000;
    const i0 = Math.max(0, Math.round((tMin + tShift(s.distKm) - startSec) * tr.sampleRate));
    const i1 = Math.min(y.length, Math.round((tMax + tShift(s.distKm) - startSec) * tr.sampleRate));
    if (i1 <= i0) continue;
    const peak = peakAbs(y, i0, i1) || 1;
    const nCols = Math.max(1, Math.round((cols * (i1 - i0)) / ((tMax - tMin) * tr.sampleRate)));
    const { min, max } = minMaxColumns(y, i0, i1, nCols);
    const pts = [];
    for (let c = 0; c < nCols; c++) {
      if (Number.isNaN(min[c])) continue;
      const t = startSec + (i0 + ((c + 0.5) * (i1 - i0)) / nCols) / tr.sampleRate - tShift(s.distKm);
      const x = X(t).toFixed(1);
      pts.push(`${x},${(yy - (max[c] / peak) * ampPx).toFixed(1)}`, `${x},${(yy - (min[c] / peak) * ampPx).toFixed(1)}`);
    }
    out.push(`<polyline fill="none" stroke="${s.role === 'school' ? '#b35' : '#222'}" stroke-width="0.6" points="${pts.join(' ')}"/>`);
    const p = by[`${s.net}.${s.sta}`];
    if (p?.P) out.push(`<circle cx="${X((p.P - t0) / 1000 - tShift(s.distKm))}" cy="${yy}" r="3.5" fill="none" stroke="#1565c0" stroke-width="1.5"/>`);
    if (p?.S) out.push(`<circle cx="${X((p.S - t0) / 1000 - tShift(s.distKm))}" cy="${yy}" r="3.5" fill="none" stroke="#c62828" stroke-width="1.5"/>`);
    const a = autoPicks.find((q) => q.sta === s.sta);
    if (a) out.push(`<rect x="${X(a.tSec - tShift(s.distKm)) - 3}" y="${yy - 3}" width="6" height="6" fill="none" stroke="#2e7d32" stroke-width="1.5"/>`);
  }
  const line = (v, ti, d0, d1, color, label) => {
    const a = { d: d0, t: ti + d0 / v - tShift(d0) };
    const b = { d: d1, t: ti + d1 / v - tShift(d1) };
    out.push(`<line x1="${X(a.t)}" y1="${Y(a.d)}" x2="${X(b.t)}" y2="${Y(b.d)}" stroke="${color}" stroke-width="1.5" stroke-dasharray="6 4"/>`);
    out.push(`<text x="${X(b.t) + 4}" y="${Y(b.d) - 4}" fill="${color}">${label}</text>`);
  };
  if (two) {
    line(two.near.speedKms, two.near.interceptSec, 0, Math.min(maxKm, two.crossoverKm + 40), '#1565c0', `${two.near.speedKms.toFixed(2)} km/s`);
    line(two.far.speedKms, two.far.interceptSec, Math.max(0, two.crossoverKm - 40), maxKm, '#2e7d32', `${two.far.speedKms.toFixed(2)} km/s`);
  }
  if (summary.sg) line(summary.sg.speedKms, summary.sg.interceptSec, 0, maxKm * 0.8, '#c62828', `S ${summary.sg.speedKms.toFixed(2)} km/s`);
  out.push(`<text x="${m.l}" y="${H - 8}" fill="#555">circles: UUSS analyst picks (blue P, red S); green squares: computer first-arrival picks; dashed: least-squares lines</text>`);
  out.push('</svg>');
  return out.join('\n');
}
