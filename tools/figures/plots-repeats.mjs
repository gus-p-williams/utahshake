// Make the "repeats" figures for the Beyond one seismogram page (docs/theory/plots.md):
//   V6 plots-stack.svg  rocket-motor detonations at the Utah Test and Training Range, stacked at
//                       station TMU (the Wasatch Academy stand-in), 248 km away
//   V7 plots-xcorr.svg  cross-correlation at station BGU, 25 km away: the explosions look alike,
//                       a small earthquake nearby does not
//
//   node tools/figures/plots-repeats.mjs              both figures
//   node tools/figures/plots-repeats.mjs stack        one (stack | xcorr)
//   ... --refetch                                      rebuild tools/figures/data/uttr-explosions.json
//
// The event list (ComCat ids, analyst P picks at BGU, the alignment shifts, waveform families and
// correlations) is kept in tools/figures/data/uttr-explosions.json with its provenance, so the
// figures redraw the same way every time. Waveforms: University of Utah (UU) stations BGU and TMU
// via EarthScope FDSN; events and picks: USGS ComCat; cached in tools/figures/.cache/. Never
// Raspberry Shake servers. Why these are rocket motors, not a quarry: planning/plots-sources.md.
// No credit text in the images: the page captions carry it. Output: docs/theory/img/<name>.svg
import fs from 'node:fs';
import { C, figure, r1 } from './svg-traces.mjs';
import { analystPicks, events, event, stationCoords, waveforms, EVENT } from './fdsn-cache.mjs';
import { card, stack, text } from './svg-charts.mjs';

const { filteredData } = await import('../../docs/app/js/data/filters.js');
const { distanceKm } = await import('../../docs/app/js/lib/geo.js');
const { rms } = await import('../../docs/app/js/lib/signal.js');
const { windowAround, scaleToNoise, stackMean, stackNoiseByCount, crossCorrelation } =
  await import('../../docs/app/js/lib/stack.js');

const outDir = new URL('../../docs/theory/img/', import.meta.url);
const dataFile = new URL('./data/uttr-explosions.json', import.meta.url);
const args = process.argv.slice(2);
const REFETCH = args.includes('--refetch');
const only = args.filter((a) => !a.startsWith('--'));
const MINUS = '−';
const fmt = (v, d = 2) => v.toFixed(d).replace('-', MINUS);
const median = (a) => { const s = [...a].sort((x, y) => x - y); const m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };
const pct = (a, p) => { const s = [...a].sort((x, y) => x - y); return s[Math.round((p / 100) * (s.length - 1))]; };
const write = (name, svg) => {
  fs.writeFileSync(new URL(name, outDir), svg + '\n');
  console.log(`wrote docs/theory/img/${name} (${(svg.length / 1024).toFixed(0)} KB)`);
};

// --- the site and the event list -----------------------------------------------------------
const SITE = { lat: 41.11, lon: -112.90, radiusKm: 10 };
const QUERY = {
  latitude: String(SITE.lat), longitude: String(SITE.lon), maxradiuskm: String(SITE.radiusKm),
  starttime: '2015-01-01', endtime: '2026-11-24',
  eventtype: 'quarry blast,mining explosion,explosion,chemical explosion',
};
const BGU = { sta: 'BGU', loc: '01', cha: 'HHZ' };
const TMU = { sta: 'TMU', loc: '01', cha: 'HHZ' };
const SR = 100;
// BGU alignment: 1–10 Hz, window P − 1 s to P + 10 s (P and S), lags up to ±1 s
const ALIGN = { lo: 1, hi: 10, pre: 1, post: 10, maxLagSec: 1, pairLagSec: 0.5, familyCut: 0.6 };

const bguRecord = async (e) => (await waveforms({ net: 'UU', ...BGU, startMs: e.timeMs - 40000, endMs: e.timeMs + 60000 }))[0];
const tmuRecord = async (e) => (await waveforms({ net: 'UU', ...TMU, startMs: e.timeMs - 40000, endMs: e.timeMs + 120000 }))[0];
const unitRms = (w) => { const s = rms(w); return Float64Array.from(w, (v) => v / s); };
const hasNaN = (w) => w.some(Number.isNaN);

/** Average-linkage clustering of a similarity matrix; clusters of size ≥ 3 become families 1, 2, … by size. */
function families(M, cut) {
  const n = M.length;
  let clusters = Array.from({ length: n }, (_, i) => [i]);
  const link = clusters.map((_, i) => clusters.map((__, j) => M[i][j]));
  for (;;) {
    let best = -Infinity, bi = -1, bj = -1;
    for (let i = 0; i < clusters.length; i++) for (let j = i + 1; j < clusters.length; j++) {
      if (link[i][j] > best) { best = link[i][j]; bi = i; bj = j; }
    }
    if (best < cut) break;
    const na = clusters[bi].length, nb = clusters[bj].length;
    for (let k = 0; k < clusters.length; k++) {
      link[bi][k] = link[k][bi] = (na * link[bi][k] + nb * link[bj][k]) / (na + nb);
    }
    clusters[bi] = clusters[bi].concat(clusters[bj]);
    clusters.splice(bj, 1);
    link.splice(bj, 1);
    for (const row of link) row.splice(bj, 1);
  }
  clusters = clusters.filter((c) => c.length >= 3).sort((a, b) => b.length - a.length || Math.min(...a) - Math.min(...b));
  const fam = new Array(n).fill(null);
  clusters.forEach((c, k) => c.forEach((i) => { fam[i] = k + 1; }));
  return fam;
}

async function buildEventList() {
  const list = (await events(QUERY)).sort((a, b) => a.timeMs - b.timeMs);
  console.log(`event list: ${list.length} ComCat events (${Object.entries(list.reduce((m, e) => ({ ...m, [e.type]: (m[e.type] || 0) + 1 }), {})).map(([k, v]) => `${v} ${k}`).join(', ')})`);
  const rows = [];
  for (const e of list) {
    const picks = await analystPicks(e.id).catch(() => ({}));
    const row = { id: e.id, time: new Date(e.timeMs).toISOString(), lat: e.lat, lon: e.lon, mag: e.mag, type: e.type,
      bguP: picks['UU.BGU']?.P ?? null, tmuP: picks['UU.TMU']?.P ?? null, bguShiftSec: null, family: null, ccOthers: null,
      inStack: false, note: '' };
    rows.push(row);
    const tr = await bguRecord(e);
    if (!row.bguP) { row.note = 'no analyst P pick at BGU'; continue; }
    if (!tr) { row.note = 'no BGU data'; continue; }
    const x = filteredData(tr, ALIGN);
    const pIdx = Math.round(((row.bguP - tr.startMs) / 1000) * SR);
    // the window, its ±1 s of lags and 30 s of noise before P must be complete
    const need = x.subarray(pIdx - 31 * SR, pIdx + (ALIGN.post + ALIGN.maxLagSec + 0.5) * SR);
    if (need.length < (41.5 + ALIGN.maxLagSec) * SR - 1 || hasNaN(need)) { row.note = 'gap near P at BGU'; continue; }
    row._x = x;
    row._p = pIdx;
  }
  const use = rows.filter((r) => r._x);
  const nWin = (ALIGN.pre + ALIGN.post) * SR;
  const maxLag = ALIGN.maxLagSec * SR;
  const startOf = (r) => r._p + (r._shift ?? 0) - ALIGN.pre * SR;
  const win = (r) => r._x.slice(startOf(r), startOf(r) + nWin);
  // align on the picks, then refine by correlation with the stack (3 rounds)
  let ref = unitRms(stackMean(use.map((r) => unitRms(win(r)))));
  for (let it = 0; it < 3; it++) {
    for (const r of use) {
      const { best } = crossCorrelation(ref, r._x, r._p - ALIGN.pre * SR, maxLag);
      r._shift = best.lag;
    }
    ref = unitRms(stackMean(use.map((r) => unitRms(win(r)))));
  }
  // similarity matrix (lags ±0.5 s around the aligned positions) → waveform families
  const pair = ALIGN.pairLagSec * SR;
  const M = use.map(() => new Float64Array(use.length));
  for (let i = 0; i < use.length; i++) {
    M[i][i] = 1;
    const a = win(use[i]);
    for (let j = i + 1; j < use.length; j++) {
      M[i][j] = M[j][i] = crossCorrelation(a, use[j]._x, startOf(use[j]), pair).best.cc;
    }
  }
  const fam = families(M, ALIGN.familyCut);
  // each explosion against the stack of all the others
  const unitWins = use.map((r) => unitRms(win(r)));
  const sum = new Float64Array(nWin);
  for (const w of unitWins) for (let k = 0; k < nWin; k++) sum[k] += w[k];
  use.forEach((r, i) => {
    const others = unitRms(sum.map((v, k) => v - unitWins[i][k]));
    r.bguShiftSec = +(r._shift / SR).toFixed(2);
    r.family = fam[i];
    r.ccOthers = +crossCorrelation(others, r._x, r._p - ALIGN.pre * SR, maxLag).best.cc.toFixed(3);
  });
  // TMU: P predicted from BGU's aligned P plus one constant offset (median over TMU analyst picks)
  const alignedBgu = (r) => r.bguP + r.bguShiftSec * 1000;
  const diffs = use.filter((r) => r.tmuP).map((r) => r.tmuP - alignedBgu(r));
  const offsetSec = +(median(diffs) / 1000).toFixed(2);
  for (const r of use) {
    const e = { timeMs: Date.parse(r.time) };
    const tr = await tmuRecord(e);
    if (!tr) { r.note = 'no TMU data'; continue; }
    const w = windowAround({ ...tr, data: filteredData(tr, STACK) }, alignedBgu(r) + offsetSec * 1000, -STACK.from, STACK.to);
    if (hasNaN(w)) { r.note = 'gap at TMU'; continue; }
    r.inStack = true;
  }
  const header = {
    what: 'Explosions at one site on the west shore of the Great Salt Lake: most likely the rocket-motor detonations at the Utah Test and Training Range (UTTR); see planning/plots-sources.md',
    selection: `USGS ComCat events within ${SITE.radiusKm} km of ${SITE.lat} N, ${-SITE.lon} W, ${QUERY.starttime} to ${QUERY.endtime}, types ${QUERY.eventtype}`,
    query: `${EVENT}?${new URLSearchParams({ format: 'geojson', orderby: 'time', ...QUERY })}`,
    retrieved: '2026-11-24',
    sources: ['Stump et al. (2007), 29th Monitoring Research Review, p. 674-676, https://www.ldeo.columbia.edu/res/pi/Monitoring/Doc/Srr_2007/PAPERS/03-19.PDF'],
    stations: { BGU: 'UU.BGU.01.HHZ (25 km SSW of the site): alignment, families, correlations', TMU: 'UU.TMU.01.HHZ (248 km SE; Wasatch Academy stand-in): the stack' },
    alignment: `BGU: UUSS analyst P pick, then shifted (bguShiftSec) to best match the stack of all, ${ALIGN.lo}-${ALIGN.hi} Hz, window P-${ALIGN.pre} s to P+${ALIGN.post} s, lags up to ${ALIGN.maxLagSec} s, 3 rounds. TMU: BGU aligned P + ${offsetSec} s (median of TMU analyst P minus BGU aligned P over ${diffs.length} events).`,
    families: `average-linkage clustering of the BGU correlation matrix (lags up to ${ALIGN.pairLagSec} s), cut at ${ALIGN.familyCut}; clusters of 3 or more numbered by size; null = not in a family`,
    ccOthers: 'peak correlation at BGU (same band and window, lags up to 1 s) with the stack of all the other aligned explosions',
    tmuOffsetSec: offsetSec,
    columns: 'id, time (UTC), lat, lon, mag, type (ComCat), bguP and tmuP (UUSS analyst P picks, epoch ms, or null), bguShiftSec, family, ccOthers, inStack (used in the TMU stack), note',
  };
  const clean = rows.map(({ _x, _p, _shift, ...r }) => r);
  fs.writeFileSync(dataFile, JSON.stringify({ header, events: clean }, null, 0).replace(/\},\{/g, '},\n{').replace('"events":[', '"events":[\n') + '\n');
  console.log(`wrote tools/figures/data/uttr-explosions.json: ${use.length} aligned at BGU, ${clean.filter((r) => r.inStack).length} in the TMU stack; TMU offset ${offsetSec} s from ${diffs.length} picks`);
}

// TMU stack settings: band, window around the aligned P, noise window (all in seconds)
const STACK = { lo: 1, hi: 5, from: -30, to: 60, noiseFrom: -30, noiseTo: -3 };

let built = false;
async function eventList() {
  if (!built && (REFETCH || !fs.existsSync(dataFile))) await buildEventList();
  built = true;
  return JSON.parse(fs.readFileSync(dataFile, 'utf8'));
}

// ---------------------------------------------------------------------------------------------
// V6: the stack at TMU
async function stackFigure() {
  const { header, events: list } = await eventList();
  const use = list.filter((r) => r.inStack);
  const off = header.tmuOffsetSec * 1000;
  const recs = [];
  for (const r of use) {
    const tr = await tmuRecord({ timeMs: Date.parse(r.time) });
    const w = windowAround({ ...tr, data: filteredData(tr, STACK) }, r.bguP + r.bguShiftSec * 1000 + off, -STACK.from, STACK.to);
    const i0 = (STACK.noiseFrom - STACK.from) * SR;
    const i1 = (STACK.noiseTo - STACK.from) * SR;
    recs.push({ ...r, ...scaleToNoise(w, i0, i1) });
  }
  const at = (sec) => Math.round((sec - STACK.from) * SR);
  const sig = (w, a, b) => rms(w, at(a), at(b));
  const noiseOf = (w) => rms(w, at(STACK.noiseFrom), at(STACK.noiseTo));
  // where are the waves? the full stack's 1 s RMS, in units of its own noise
  const all = stackMean(recs.map((r) => r.data));
  const env = [];
  for (let t = STACK.from; t < STACK.to; t++) env.push({ t, v: sig(all, t, t + 1) / noiseOf(all) });
  console.log('stack envelope (s after P: × its noise): ' + env.filter((e) => e.t >= -3 && e.t <= 55).map((e) => `${e.t}:${e.v.toFixed(1)}`).join(' '));
  const single = recs.map((r) => sig(r.data, -1, 20));
  console.log(`single records: ${recs.length}; signal-to-noise (RMS P-1..P+20 s): median ${median(single).toFixed(2)}, 10-90% ${pct(single, 10).toFixed(2)}..${pct(single, 90).toFixed(2)}`);
  const late = recs.map((r) => sig(r.data, 38, 48));
  console.log(`single records, later wave (RMS P+38..P+48 s): median ${median(late).toFixed(2)}`);
  // signal-to-noise as shown on the figure: RMS from P − 1 s to P + 50 s (both waves) over the noise
  const sn = (w) => sig(w, SIGNAL.from, SIGNAL.to) / noiseOf(w);
  const rows = [];
  const whenOf = (r) => new Date(r.time).toLocaleString('en-US', { timeZone: 'America/Denver', month: 'long', day: 'numeric',
    year: 'numeric', hour: 'numeric', minute: '2-digit' }).replace(' at ', ', ').replace(/ ([AP])M$/, (m, a) => ` ${a.toLowerCase()}m`);
  recs.slice(0, 3).forEach((r, k) => {
    console.log(`single ${r.id} ${r.time} M${r.mag}: S/N ${sn(r.data).toFixed(2)}`);
    rows.push({ label: `Explosion ${k + 1} (${whenOf(r)})`, data: r.data, right: `signal ÷ noise ${sn(r.data).toFixed(1)}` });
  });
  for (const n of [4, 16, 64, recs.length]) {
    const s = stackMean(recs.slice(0, n).map((r) => r.data));
    console.log(`first ${n}: noise ${noiseOf(s).toFixed(3)} (1/√N ${(1 / Math.sqrt(n)).toFixed(3)}), S/N ${sn(s).toFixed(1)}; P-1..P+20 S/N ${(sig(s, -1, 20) / noiseOf(s)).toFixed(1)}; P+40..49 S/N ${(sig(s, 40, 49) / noiseOf(s)).toFixed(1)}`);
    rows.push({ label: n === recs.length ? `All ${n} explosions stacked` : `Explosions 1–${n} stacked`, data: s,
      right: `noise ${noiseOf(s).toFixed(2)} · signal ÷ noise ${sn(s).toFixed(0)}` });
  }
  const singleSn = recs.map((r) => sn(r.data));
  console.log(`single records, S/N (P-1..P+50): median ${median(singleSn).toFixed(2)}, 10-90% ${pct(singleSn, 10).toFixed(2)}..${pct(singleSn, 90).toFixed(2)}; above 4: ${singleSn.filter((v) => v > 4).length}`);
  const amp = Math.max(...rows.map((row) => Math.max(...Array.from(row.data, Math.abs))));
  const traces = figure({
    traces: rows.map((row, k) => ({ label: row.label, rightLabel: row.right, startMs: STACK.from * 1000, sampleRate: SR,
      data: row.data, amp, color: k < 3 ? C.muted : C.trace })),
    originMs: 0, fromSec: STACK.from, toSec: STACK.to, trackH: 58, top: 62, axisLabel: 'seconds after P', axisLabelWidth: 110,
    title: `Rocket-motor explosions recorded at station TMU, 248 km away (filtered ${STACK.lo}–${STACK.hi} Hz, one scale)`,
    marks: [{ sec: 0, color: C.p, label: 'P', above: true }],
    bands: [{ from: LATE.from, to: LATE.to, fill: 'rgba(192,38,45,0.08)', stroke: 'rgba(192,38,45,0.5)', label: 'later, stronger waves', labelColor: C.s }],
  });
  // how the stack's noise and waves change with N (200 random choices of which N for each N)
  const counts = [1, 2, 4, 8, 16, 32, 64, 128, recs.length];
  const noiseWins = recs.map((r) => r.data.slice(at(STACK.noiseFrom), at(STACK.noiseTo)));
  const sigWins = recs.map((r) => r.data.slice(at(SIGNAL.from), at(SIGNAL.to)));
  const noiseCurve = stackNoiseByCount(noiseWins, counts, { draws: 200, seed: 42 });
  const sigCurve = stackNoiseByCount(sigWins, counts, { draws: 200, seed: 42 });
  console.log('noise vs N: ' + noiseCurve.map((c) => `${c.n}:${c.rms.toFixed(3)} (×√N ${(c.rms * Math.sqrt(c.n)).toFixed(2)})`).join(' '));
  console.log('waves vs N: ' + sigCurve.map((c) => `${c.n}:${c.rms.toFixed(2)}`).join(' '));
  write('plots-stack.svg', stack([traces, nChart(noiseCurve, sigCurve)]));
}
const SIGNAL = { from: -1, to: 50 };
const LATE = { from: 40, to: 49 };

/** Log-log chart: the stack's noise and waves against the number stacked, with the 1/√N line. */
function nChart(noise, waves) {
  const width = 760;
  const height = 270;
  const padL = 58, padR = 200, top = 44, h = 170;
  const w = width - padL - padR;
  const nMax = noise.at(-1).n;
  const x = (n) => padL + (Math.log(n) / Math.log(nMax)) * w;
  const yLo = 0.05, yHi = 5;
  const y = (v) => top + (Math.log(yHi / v) / Math.log(yHi / yLo)) * h;
  const out = card(width, height, 'Adding more explosions: the noise keeps shrinking, the waves level off');
  for (const v of [0.05, 0.1, 0.2, 0.5, 1, 2, 5]) {
    out.push(`<line x1="${padL}" y1="${r1(y(v))}" x2="${padL + w}" y2="${r1(y(v))}" stroke="${C.grid}"/>`);
    out.push(text(padL - 6, y(v) + 4, String(v), { size: 12, fill: C.muted, anchor: 'end' }));
  }
  for (const c of noise) {
    out.push(`<line x1="${r1(x(c.n))}" y1="${top}" x2="${r1(x(c.n))}" y2="${top + h}" stroke="${C.grid}"/>`);
    // label powers of 2 that leave room, and the last N
    const roomy = c.n === nMax || x(nMax) - x(c.n) > 30;
    if (roomy) out.push(text(x(c.n), top + h + 16, String(c.n), { size: 12, fill: C.muted, anchor: 'middle' }));
  }
  out.push(`<rect x="${padL}" y="${top}" width="${w}" height="${h}" fill="none" stroke="${C.border}"/>`);
  out.push(text(padL + w / 2, top + h + 34, 'number of explosions stacked, N', { size: 12, fill: C.muted, anchor: 'middle' }));
  out.push(text(14, top + h / 2, 'size (RMS)', { size: 12, fill: C.muted, anchor: 'middle' }).replace('<text ', `<text transform="rotate(-90 14 ${r1(top + h / 2)})" `));
  // 1/√N through the first noise point
  out.push(`<line x1="${r1(x(1))}" y1="${r1(y(noise[0].rms))}" x2="${r1(x(nMax))}" y2="${r1(y(noise[0].rms / Math.sqrt(nMax)))}" stroke="${C.muted}" stroke-width="1.5" stroke-dasharray="6 4"/>`);
  // waves: dots joined by a line; noise: dots only, so the dashed 1/√N line shows through
  const series = [[waves, C.p, ['the waves: level off'], true], [noise, C.trace, ['the noise (dots) follows', '1 ÷ √N (dashed line)'], false]];
  for (const [pts, color, label, joined] of series) {
    if (joined) out.push(`<path d="${pts.map((c, i) => `${i ? 'L' : 'M'}${r1(x(c.n))} ${r1(y(c.rms))}`).join('')}" fill="none" stroke="${color}" stroke-width="1.5"/>`);
    for (const c of pts) out.push(`<circle cx="${r1(x(c.n))}" cy="${r1(y(c.rms))}" r="4" fill="${color}"/>`);
    const last = pts.at(-1);
    label.forEach((line, i) => out.push(text(padL + w + 10, y(last.rms) + 4 + (i - (label.length - 1) / 2) * 16, line, { size: 13, weight: 600, fill: color })));
  }
  out.push('</svg>');
  return out.join('\n');
}

// ---------------------------------------------------------------------------------------------
// V7: cross-correlation at BGU
const PAIR = ['us6000kywx', 'us6000nie6']; // two explosions of one family, a year apart
const QUAKE = 'uu50312460'; // the nearest likely real earthquake (2006, M1.6, about 9 km away)

/** BGU record of an event in the list, filtered, with its aligned P index. */
async function bguAligned(r) {
  const tr = await bguRecord({ timeMs: Date.parse(r.time) });
  const x = filteredData(tr, ALIGN);
  return { ...r, tr, x, p: Math.round(((r.bguP + r.bguShiftSec * 1000 - tr.startMs) / 1000) * SR) };
}
const windowAt = (rec, p) => rec.x.slice(p - ALIGN.pre * SR, p + ALIGN.post * SR);

async function xcorrFigure() {
  const { events: list } = await eventList();
  const aligned = list.filter((r) => r.bguShiftSec != null);
  const recs = [];
  for (const r of aligned) recs.push(await bguAligned(r));
  const byId = Object.fromEntries(recs.map((r) => [r.id, r]));
  const maxLag = ALIGN.maxLagSec * SR;
  const ccOf = (tmpl, rec, p) => crossCorrelation(tmpl, rec.x, p - ALIGN.pre * SR, maxLag);
  // (a) the pair
  const [a, b] = PAIR.map((id) => byId[id]);
  const ab = ccOf(windowAt(a, a.p), b, b.p);
  console.log(`pair ${a.id} (${a.time.slice(0, 10)}, family ${a.family}) vs ${b.id} (${b.time.slice(0, 10)}): ${ab.best.cc.toFixed(3)} at ${(ab.best.lag / SR).toFixed(2)} s`);
  // (b) an explosion of another family: the most typical member (highest ccOthers) of the biggest family
  const other = recs.filter((r) => r.family === 1).sort((x, y) => y.ccOthers - x.ccOthers || (x.id < y.id ? -1 : 1))[0];
  const ao = ccOf(windowAt(a, a.p), other, other.p);
  console.log(`other family: ${other.id} (${other.time.slice(0, 10)}, family ${other.family}) vs ${a.id}: ${ao.best.cc.toFixed(3)} at ${(ao.best.lag / SR).toFixed(2)} s`);
  // (c) the quake against the stack of all the explosions
  const all = unitRms(stackMean(recs.map((r) => unitRms(windowAt(r, r.p)))));
  const qe = await event(QUAKE);
  const qtr = (await waveforms({ net: 'UU', sta: 'BGU', loc: '*', cha: 'HHZ', startMs: qe.timeMs - 40000, endMs: qe.timeMs + 60000 }))[0];
  const qp = (await analystPicks(QUAKE))['UU.BGU']?.P;
  const bgu = await stationCoords('UU', 'BGU');
  console.log(`quake ${QUAKE}: ${qe.title}, ${new Date(qe.timeMs).toISOString()}, depth ${qe.depthKm} km, ${distanceKm(qe.lat, qe.lon, SITE.lat, SITE.lon).toFixed(1)} km from the site, ${distanceKm(qe.lat, qe.lon, bgu.lat, bgu.lon).toFixed(1)} km from BGU; record ${qtr.loc}.${qtr.cha} ${qtr.sampleRate} sps; analyst P ${qp ? ((qp - qe.timeMs) / 1000).toFixed(2) + ' s' : 'none'}`);
  const q = { x: filteredData(qtr, ALIGN), p: Math.round(((qp - qtr.startMs) / 1000) * SR) };
  const qs = crossCorrelation(all, q.x, q.p - ALIGN.pre * SR, maxLag);
  const qEach = recs.map((r) => crossCorrelation(windowAt(q, q.p), r.x, r.p - ALIGN.pre * SR, maxLag).best.cc);
  console.log(`quake vs stack of ${recs.length} explosions: ${qs.best.cc.toFixed(3)} at ${(qs.best.lag / SR).toFixed(2)} s; vs each: median ${median(qEach).toFixed(2)}, max ${Math.max(...qEach).toFixed(2)}`);
  // chance: the stack against 11 s of plain background noise before each explosion (P − 30 s on)
  const chance = recs.map((r) => crossCorrelation(all, r.x, r.p - 30 * SR, maxLag).best.cc);
  console.log(`chance (stack vs noise before P, best of ±1 s): median ${median(chance).toFixed(2)}, 90% ${pct(chance, 90).toFixed(2)}, max ${Math.max(...chance).toFixed(2)}`);
  const loo = recs.map((r) => r.ccOthers);
  console.log(`each explosion vs the stack of the others: median ${median(loo).toFixed(2)}, 10-90% ${pct(loo, 10).toFixed(2)}..${pct(loo, 90).toFixed(2)}`);
  const c90 = pct(chance, 90);
  const day = (ms) => new Date(ms).toLocaleDateString('en-US', { timeZone: 'America/Denver', month: 'long', day: 'numeric', year: 'numeric' });
  const lp = new Date(qe.timeMs).toLocaleString('en-US', { timeZone: 'America/Denver', weekday: 'long', hour: 'numeric', minute: '2-digit' });
  console.log(`quake local time: ${lp}`);
  const RED = '#c2410c';
  write('plots-xcorr.svg', stack([
    xcCard({ title: `Two explosions a year apart: correlation ${ab.best.cc.toFixed(2)}`, c90,
      traces: [{ data: windowAt(a, a.p), color: C.p, label: day(Date.parse(a.time)) }, { data: windowAt(b, b.p), color: RED, label: day(Date.parse(b.time)) }],
      cc: ab }),
    xcCard({ title: `Explosions from two different families: correlation ${ao.best.cc.toFixed(2)}`, c90,
      traces: [{ data: windowAt(a, a.p), color: C.p, label: day(Date.parse(a.time)) }, { data: windowAt(other, other.p), color: RED, label: day(Date.parse(other.time)) }],
      cc: ao }),
    xcCard({ title: `An earthquake ${Math.round(distanceKm(qe.lat, qe.lon, SITE.lat, SITE.lon))} km from the site: correlation ${qs.best.cc.toFixed(2)}`, c90,
      traces: [{ data: all, color: C.trace, label: `the average of all ${recs.length} explosions` }, { data: windowAt(q, q.p), color: RED, label: `earthquake, ${day(qe.timeMs)}` }],
      cc: qs }),
  ]));
}

/**
 * One cross-correlation card: two records on top of each other (each scaled to the same RMS,
 * lined up on P) and, beside them, how well they match at each shift from −1 to +1 s.
 */
function xcCard({ title, traces, cc, c90 }) {
  const width = 760;
  const height = 214;
  const top = 58, h = 116;
  const L = { x0: 10, w: 488 };
  const R = { x0: 560, w: 180 };
  const out = card(width, height, title);
  // legend
  let lx = L.x0 + 2;
  for (const t of traces) {
    out.push(`<line x1="${r1(lx)}" y1="44" x2="${r1(lx + 18)}" y2="44" stroke="${t.color}" stroke-width="3"/>`);
    out.push(text(lx + 24, 48, t.label, { size: 13, weight: 600, fill: t.color }));
    lx += 24 + t.label.length * 7.4 + 22;
  }
  // overlay, seconds after P
  const from = -ALIGN.pre, to = ALIGN.post;
  const x = (s) => L.x0 + ((s - from) / (to - from)) * L.w;
  const scaled = traces.map((t) => unitRms(t.data));
  const amp = Math.max(...scaled.map((d) => Math.max(...Array.from(d, Math.abs))));
  const y0 = top + h / 2;
  for (let s = 0; s <= to; s += 2) {
    out.push(`<line x1="${r1(x(s))}" y1="${top}" x2="${r1(x(s))}" y2="${top + h}" stroke="${C.grid}"/>`);
    out.push(text(x(s), top + h + 16, String(s), { size: 12, fill: C.muted, anchor: 'middle' }));
  }
  out.push(`<rect x="${L.x0}" y="${top}" width="${L.w}" height="${h}" fill="none" stroke="${C.border}"/>`);
  out.push(text(L.x0 + L.w, top + h + 32, 'seconds after P', { size: 12, fill: C.muted, anchor: 'end' }));
  scaled.forEach((d, k) => {
    const pts = Array.from(d, (v, i) => `${i ? 'L' : 'M'}${r1(x(from + i / SR))} ${r1(y0 - (v / amp) * (h / 2 - 4))}`).join('');
    out.push(`<path d="${pts}" fill="none" stroke="${traces[k].color}" stroke-width="1.2" stroke-opacity="${k ? 0.85 : 1}"/>`);
  });
  // correlation at each shift
  const lagMax = ALIGN.maxLagSec;
  const cx = (lagSamples) => R.x0 + ((lagSamples / SR + lagMax) / (2 * lagMax)) * R.w;
  const cy = (v) => top + ((1 - v) / 2) * h;
  out.push(text(R.x0 + R.w / 2, 48, 'match at each shift', { size: 13, weight: 600, fill: C.note, anchor: 'middle' }));
  out.push(`<rect x="${R.x0}" y="${r1(cy(c90))}" width="${R.w}" height="${r1(cy(-c90) - cy(c90))}" fill="rgba(91,100,114,0.14)"/>`);
  // key for the gray band, under the panel on the left
  out.push(`<rect x="${R.x0}" y="${top + h + 23}" width="12" height="11" fill="rgba(91,100,114,0.28)"/>`);
  out.push(text(R.x0 + 16, top + h + 32, 'chance', { size: 12, fill: C.muted }));
  for (const v of [-1, 0, 1]) {
    out.push(`<line x1="${R.x0}" y1="${r1(cy(v))}" x2="${R.x0 + R.w}" y2="${r1(cy(v))}" stroke="${v ? C.grid : C.border}"/>`);
    out.push(text(R.x0 - 6, cy(v) + 4, fmt(v, 0).replace(/^1$/, '+1'), { size: 12, fill: C.muted, anchor: 'end' }));
  }
  for (const s of [-1, 0, 1]) out.push(text(cx(s * SR), top + h + 16, fmt(s, 0).replace(/^1$/, '+1'), { size: 12, fill: C.muted, anchor: 'middle' }));
  out.push(`<rect x="${R.x0}" y="${top}" width="${R.w}" height="${h}" fill="none" stroke="${C.border}"/>`);
  out.push(text(R.x0 + R.w, top + h + 32, 'shift (s)', { size: 12, fill: C.muted, anchor: 'end' }));
  const curve = Array.from(cc.cc, (v, j) => `${j ? 'L' : 'M'}${r1(cx(cc.lags[j]))} ${r1(cy(v))}`).join('');
  out.push(`<path d="${curve}" fill="none" stroke="${C.trace}" stroke-width="1.5"/>`);
  const bx = cx(cc.best.lag);
  const by = cy(cc.best.cc);
  out.push(`<circle cx="${r1(bx)}" cy="${r1(by)}" r="4" fill="${C.s}"/>`);
  // the value beside the dot (on the side with more room), clear of the panel's title
  const right = bx < R.x0 + R.w * 0.75;
  out.push(text(bx + (right ? 9 : -9), Math.max(by + 5, top + 14), cc.best.cc.toFixed(2), { size: 13, weight: 700, fill: C.s, anchor: right ? 'start' : 'end', halo: true }));
  out.push('</svg>');
  return out.join('\n');
}

const ALL = { stack: stackFigure, xcorr: xcorrFigure };
for (const [name, fn] of Object.entries(ALL)) if (!only.length || only.includes(name)) await fn();
