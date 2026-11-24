// Make the H/V figure (V5) for the "Beyond one seismogram" page (docs/theory/plots.md):
// side-to-side ÷ up-and-down shaking on quiet nights at a station on deep basin fill (FOR4,
// Utah FORGE near Milford, closed in 2021), one on rock (CTU, Mill Creek Canyon), and SGU
// (the Gunnison Valley stand-in) for a try-it question; then the worked example f0 = Vs/(4H).
//
//   node tools/figures/plots-hv.mjs            draw from tools/figures/data/hv-curves.json
//   node tools/figures/plots-hv.mjs --refetch  recompute the curves from the waveforms
//
// Waveforms: University of Utah (UU) broadband stations via EarthScope FDSN (cached in
// tools/figures/.cache/). The H/V method is the apps' own (docs/app/js/lib/hv.js). The worked
// example's numbers come from the Vs profile 62 m from FOR4 in Zhang & Pankow (2021) and the
// depth to granite from the Utah Geological Survey (planning/plots-sources.md); they are
// written below as constants with their sources. No credit text in the image: the page
// caption carries it. Output: docs/theory/img/plots-hv.svg (same bytes on every run).
import fs from 'node:fs';
import { C, r1, esc } from './svg-traces.mjs';
import { card, stack, text } from './svg-charts.mjs';
import { fetchCached, waveforms, STATION } from './fdsn-cache.mjs';

const { logFreqs, hvWindows, rejectWindows, combineCurves, findPeak, peakSpread, f0FromThickness } =
  await import('../../docs/app/js/lib/hv.js');

const outDir = new URL('../../docs/theory/img/', import.meta.url);
const dataFile = new URL('./data/hv-curves.json', import.meta.url);
const REFETCH = process.argv.includes('--refetch');
const MINUS = '−';

// Quiet nights: two hours from 1 am local time (UTC start given). FOR4 nights from 2018 and
// 2020, two winters before it closed; CTU and SGU from four nights in 2025, in all seasons.
const STATIONS = [
  { key: 'FOR4', net: 'UU', sta: 'FOR4', loc: '01', band: 'HH',
    nights: ['2018-01-17T08:00Z', '2018-02-14T08:00Z', '2020-01-15T08:00Z', '2020-02-12T08:00Z'] },
  { key: 'CTU', net: 'UU', sta: 'CTU', loc: '01', band: 'HH',
    nights: ['2025-01-22T08:00Z', '2025-02-19T08:00Z', '2025-10-15T07:00Z', '2025-12-10T08:00Z'] },
  { key: 'SGU', net: 'UU', sta: 'SGU', loc: '01', band: 'HH',
    nights: ['2025-01-22T08:00Z', '2025-02-19T08:00Z', '2025-10-15T07:00Z', '2025-12-10T08:00Z'] },
];
const HOURS = 2;
const WINDOW_SEC = 80; // rounded up to 8192 samples (81.92 s) at 100 samples/s
const KO_B = 40;
const REJECT = { burstMax: 4, rmsFactor: 2 };
const FREQS = { fMin: 0.1, fMax: 20, n: 160 };
const sig4 = (v) => +v.toPrecision(4);

/** Counts per m/s of each channel at time ms, from the station service (text, level=channel). */
async function scales(net, sta, ms) {
  const buf = await fetchCached(`${STATION}?net=${net}&sta=${sta}&level=channel&format=text`);
  const iso = new Date(ms).toISOString().slice(0, 19);
  const out = {};
  for (const line of buf.toString('utf8').split('\n')) {
    if (!line || line.startsWith('#')) continue;
    const f = line.split('|');
    const [start, end] = [f[15].slice(0, 19), (f[16] || '').trim().slice(0, 19)];
    if (start <= iso && (!end || end > iso)) out[`${f[2]}.${f[3]}`] = { scale: +f[11], units: f[13], sensor: f[10] };
  }
  return out;
}

async function stationCurve(s, freqs) {
  let all = [];
  const channels = new Set();
  const gains = new Set();
  for (const night of s.nights) {
    const t0 = Date.parse(night);
    const tr = await waveforms({ net: s.net, sta: s.sta, loc: s.loc, cha: `${s.band}?`, startMs: t0, endMs: t0 + HOURS * 3600e3 });
    const sc = await scales(s.net, s.sta, t0);
    const by = Object.fromEntries(tr.map((t) => [t.cha.at(-1), t]));
    const [z, n, e] = [by.Z, by.N ?? by['1'], by.E ?? by['2']];
    if (!z || !n || !e) throw new Error(`${s.key} ${night}: missing a component`);
    const inMps = [z, n, e].map((t) => {
      const m = sc[`${t.loc}.${t.cha}`];
      if (!m || m.units.toUpperCase() !== 'M/S') throw new Error(`${s.key} ${t.cha}: no velocity sensitivity`);
      channels.add(`${t.net}.${t.sta}.${t.loc}.${t.cha}`);
      gains.add(`${t.cha} ${m.scale}`);
      return Float64Array.from(t.data, (v) => v / m.scale);
    });
    const ws = hvWindows(inMps[0], inMps[1], inMps[2], z.sampleRate, { windowSec: WINDOW_SEC, centers: freqs, b: KO_B });
    all = all.concat(ws.map((w) => ({ ...w, night })));
  }
  const kept = rejectWindows(all, REJECT);
  const { mean, spread } = combineCurves(kept.map((w) => w.hv));
  const peak = findPeak(freqs, mean, { fMin: FREQS.fMin, fMax: FREQS.fMax });
  const steady = peakSpread(freqs, kept.map((w) => w.hv), peak.f0);
  const perNight = Object.fromEntries(s.nights.map((nt) => [nt, kept.filter((w) => w.night === nt).length]));
  console.log(`${s.key}: ${kept.length}/${all.length} windows; peak ${peak.f0.toFixed(3)} Hz, ${peak.a0.toFixed(2)}x ` +
    `(spread x${spread[peak.index].toFixed(2)}); windows' own peaks ${steady.mean.toFixed(3)} ± ${steady.sd.toFixed(3)} Hz`);
  return {
    channels: [...channels], gains: [...gains], nights: s.nights, windowsKept: kept.length, windowsTotal: all.length,
    perNight, mean: Array.from(mean, sig4), spread: Array.from(spread, sig4),
  };
}

/** The curves: kept in tools/figures/data/hv-curves.json, recomputed with --refetch. */
async function curves() {
  if (!REFETCH && fs.existsSync(dataFile)) return JSON.parse(fs.readFileSync(dataFile, 'utf8'));
  const freqs = logFreqs(FREQS.fMin, FREQS.fMax, FREQS.n);
  const value = {
    about: 'H/V spectral ratios of quiet night-time noise for the H/V figure (V5) on docs/theory/plots.md. ' +
      'Made by tools/figures/plots-hv.mjs --refetch from University of Utah (UU) broadband waveforms via ' +
      'EarthScope FDSN (doi:10.7914/SN/UU), with docs/app/js/lib/hv.js.',
    method: {
      nights: `${HOURS} hours from 1 am local time on each night listed (UTC start times)`,
      units: 'each channel divided by its own sensitivity (counts per m/s) from the EarthScope station service',
      windows: `non-overlapping, ${WINDOW_SEC} s rounded up to 8192 samples (81.92 s at 100 samples/s); linear trend removed; 10% Tukey taper`,
      spectrum: `FFT amplitude, Konno-Ohmachi smoothing b = ${KO_B} onto ${FREQS.n} log-spaced frequencies ${FREQS.fMin}-${FREQS.fMax} Hz`,
      horizontal: 'sqrt((N^2 + E^2) / 2)',
      rejection: `drop a window if any channel's largest 1-s RMS > ${REJECT.burstMax} x its window RMS, or its RMS > ${REJECT.rmsFactor} x that channel's median over all windows`,
      combine: 'geometric mean over windows; spread = exp(standard deviation of ln H/V)',
      rounding: '4 significant digits',
    },
    freqs: Array.from(freqs, sig4),
    stations: {},
  };
  for (const s of STATIONS) value.stations[s.key] = await stationCurve(s, freqs);
  fs.writeFileSync(dataFile, JSON.stringify(value, null, 1) + '\n');
  console.log('wrote tools/figures/data/hv-curves.json');
  return JSON.parse(fs.readFileSync(dataFile, 'utf8'));
}

const data = await curves();
const freqs = data.freqs;
const peaks = {};
for (const [k, s] of Object.entries(data.stations)) {
  const p = findPeak(freqs, s.mean);
  peaks[k] = p;
  const lo = Math.min(...s.mean.filter((_, i) => freqs[i] >= 0.5));
  const hi = Math.max(...s.mean.filter((_, i) => freqs[i] >= 0.5));
  console.log(`${k}: peak ${p.f0} Hz, ${p.a0}x; above 0.5 Hz the curve stays ${lo}-${hi}; spread at peak x${s.spread[p.index]}`);
}

// --- The worked example (planning/plots-sources.md has the sources) -------------------------
// Zhang & Pankow (2021) Vs model (GDR 1294, doi:10.15121/1776592), node 42, 62 m from FOR4:
// Vs 392 m/s at the surface, about 1,030 m/s at 400-450 m, then a jump to about 2,040 m/s by
// 600 m; it first passes 1,500 m/s at 515 m; the travel-time average above 515 m is 816 m/s.
const WORKED = { H: 515, vs: 816, vsTop: 390, vsUpper: 1030, vsBelow: 2000, graniteKm: 1.3, granitePeakHz: 0.25 };
// Granite: well 58-32 (0.85 km east-northeast of FOR4) left the basin fill at 3,176 ft (968 m)
// (UGS MP-169-K, p. K1); the contact dips about 25° west, and the bedrock contours (UGS
// MP-169-H, Fig. 13) put it about 1.3 km under FOR4. With the same Vs model down to 1.3 km
// (average 1,286 m/s), the granite would ring at about 0.25 Hz.
const f0Worked = f0FromThickness(WORKED.vs, WORKED.H);
console.log(`worked example: 4H = ${4 * WORKED.H} m, f0 = ${WORKED.vs}/${4 * WORKED.H} = ${f0Worked.toFixed(3)} Hz; measured ${peaks.FOR4.f0} Hz`);

// --- Drawing ---------------------------------------------------------------------------------
const W = 760;
const COL = {
  FOR4: { line: '#b45309', band: 'rgba(180,83,9,0.16)' },
  CTU: { line: '#475569', band: 'rgba(71,85,105,0.16)' },
  SGU: { line: '#7c3aed' },
};
const fmt2 = (v) => v.toFixed(2).replace(/0$/, '');
const fmtInt = (v) => Math.round(v).toLocaleString('en-US');

function chart() {
  const padL = 46;
  const padR = 18;
  const top = 92;
  const plotH = 250;
  const w = W - padL - padR;
  const height = top + plotH + 44 + 3 * 18 + 10;
  const fLo = 0.1;
  const fHi = 20;
  const yMax = 4.5;
  const x = (f) => padL + (Math.log10(f / fLo) / Math.log10(fHi / fLo)) * w;
  const y = (v) => top + (1 - Math.min(v, yMax) / yMax) * plotH;
  const out = card(W, height, 'H/V on quiet nights: side-to-side shaking ÷ up-and-down shaking');

  // legend, two rows: swatch + words
  const legend = [
    { key: 'FOR4', label: 'FOR4: deep basin fill near Milford (closed 2021)', x: 12, y: 46 },
    { key: 'CTU', label: 'CTU: rock in Mill Creek Canyon', x: 440, y: 46 },
    { key: 'SGU', label: 'SGU: the Gunnison Valley stand-in (try it below)', x: 12, y: 68 },
  ];
  for (const l of legend) {
    const dash = l.key === 'SGU' ? ' stroke-dasharray="6 4"' : '';
    out.push(`<line x1="${l.x}" y1="${l.y - 5}" x2="${l.x + 26}" y2="${l.y - 5}" stroke="${COL[l.key].line}" stroke-width="3"${dash}/>`);
    out.push(text(l.x + 32, l.y, l.label, { size: 14, weight: 600, fill: C.note }));
  }

  // grid: H/V 0..4 and the frequency decades
  for (let v = 0; v <= 4; v++) {
    out.push(`<line x1="${padL}" y1="${r1(y(v))}" x2="${padL + w}" y2="${r1(y(v))}" stroke="${C.grid}"/>`);
    out.push(text(padL - 7, y(v) + 4, String(v), { size: 12, fill: C.muted, anchor: 'end' }));
  }
  out.push(text(padL - 7, top - 8, 'H/V', { size: 12, weight: 600, fill: C.muted, anchor: 'end' }));
  const ticks = [0.1, 0.2, 0.5, 1, 2, 5, 10, 20];
  for (const f of ticks) {
    out.push(`<line x1="${r1(x(f))}" y1="${top}" x2="${r1(x(f))}" y2="${top + plotH}" stroke="${C.grid}"/>`);
    out.push(text(x(f), top + plotH + 17, String(f), { size: 12, fill: C.muted, anchor: f === fHi ? 'end' : f === fLo ? 'start' : 'middle' }));
  }
  out.push(text(padL + w / 2, top + plotH + 36, 'frequency (Hz): waves per second, on a log scale', { size: 12, fill: C.muted, anchor: 'middle' }));

  // spread bands (FOR4 and CTU), then H/V = 1, then the curves
  const path = (vals) => vals.map((v, i) => `${i ? 'L' : 'M'}${r1(x(freqs[i]))} ${r1(y(v))}`).join('');
  for (const k of ['CTU', 'FOR4']) {
    const s = data.stations[k];
    const upper = s.mean.map((m, i) => m * s.spread[i]);
    const lower = s.mean.map((m, i) => m / s.spread[i]);
    const back = lower.map((v, i) => `L${r1(x(freqs[i]))} ${r1(y(v))}`).reverse().join('');
    out.push(`<path d="${path(upper)}${back}Z" fill="${COL[k].band}"/>`);
  }
  out.push(`<line x1="${padL}" y1="${r1(y(1))}" x2="${padL + w}" y2="${r1(y(1))}" stroke="${C.note}" stroke-width="1.2" stroke-dasharray="3 4"/>`);
  for (const k of ['CTU', 'SGU', 'FOR4']) {
    const dash = k === 'SGU' ? ' stroke-dasharray="6 4"' : '';
    out.push(`<path d="${path(data.stations[k].mean)}" fill="none" stroke="${COL[k].line}" stroke-width="${k === 'SGU' ? 2 : 2.5}" stroke-linejoin="round"${dash}/>`);
  }
  out.push(`<rect x="${padL}" y="${top}" width="${w}" height="${plotH}" fill="none" stroke="${C.border}"/>`);

  // the peaks
  const mark = (k, labelLines, dx, anchor) => {
    const p = peaks[k];
    const px = x(p.f0);
    const py = y(p.a0);
    out.push(`<line x1="${r1(px)}" y1="${r1(py)}" x2="${r1(px)}" y2="${top + plotH}" stroke="${COL[k].line}" stroke-width="1.2" stroke-dasharray="2 3"/>`);
    out.push(`<circle cx="${r1(px)}" cy="${r1(py)}" r="4" fill="${COL[k].line}"/>`);
    labelLines.forEach((line, i) => out.push(text(px + dx, py - 8 - (labelLines.length - 1 - i) * 18, line,
      { size: 16, weight: 700, fill: COL[k].line, anchor, halo: true })));
  };
  mark('FOR4', [`f0 = ${fmt2(peaks.FOR4.f0)} Hz`, `${peaks.FOR4.a0.toFixed(1)} times`], 8, 'start');
  mark('SGU', [`${fmt2(peaks.SGU.f0)} Hz`, `${peaks.SGU.a0.toFixed(1)} times`], 8, 'start');

  const fy = top + plotH + 62;
  const kept = Object.values(data.stations).map((s) => s.windowsKept);
  out.push(text(12, fy, `Each curve: the typical H/V of ${Math.min(...kept)} to ${Math.max(...kept)} quiet 82-second windows from four nights (1 to 3 am).`, { size: 12.5, fill: C.muted }));
  out.push(text(12, fy + 18, 'Shaded: how much the windows varied (one standard deviation).', { size: 12.5, fill: C.muted }));
  out.push(text(12, fy + 36, 'Dashed line: H/V = 1, as much shaking side to side as up and down.', { size: 12.5, fill: C.muted }));
  out.push('</svg>');
  return out.join('\n');
}

function worked() {
  const height = 272;
  const out = card(W, height, 'Why a peak? The soft layer rings when it holds a quarter of a wave');
  // the ground under FOR4, to scale: 0 to 1.6 km in 190 px
  const x0 = 24;
  const colW = 236;
  const top = 50;
  const kmPx = 190 / 1.6;
  const yd = (m) => top + (m / 1000) * kmPx;
  const layers = [
    { from: 0, to: WORKED.H, fill: '#f8ecd2', lines: ['softer basin fill', `Vs ${WORKED.vsTop} → ${fmtInt(WORKED.vsUpper)} m/s`] },
    { from: WORKED.H, to: WORKED.graniteKm * 1000, fill: '#e8d2a8', lines: ['stiffer basin fill', `Vs about ${fmtInt(WORKED.vsBelow)} m/s`] },
    { from: WORKED.graniteKm * 1000, to: 1600, fill: '#d8cfd6', lines: ['granite'] },
  ];
  for (const l of layers) {
    out.push(`<rect x="${x0}" y="${r1(yd(l.from))}" width="${colW}" height="${r1(yd(l.to) - yd(l.from))}" fill="${l.fill}" stroke="${C.border}"/>`);
    const mid = (yd(l.from) + yd(l.to)) / 2 - (l.lines.length - 1) * 8 + 5;
    l.lines.forEach((s, i) => out.push(text(x0 + colW - 10, mid + i * 17, s, { size: 14, weight: i ? 400 : 600, anchor: 'end' })));
  }
  out.push(`<line x1="${x0 - 6}" y1="${top}" x2="${x0 + colW + 6}" y2="${top}" stroke="${C.note}" stroke-width="2"/>`);
  // a quarter wave in the top layer: biggest at the surface, zero at the jump
  const amp = 46;
  const qx = x0 + 18;
  let d = '';
  for (let i = 0; i <= 40; i++) {
    const zz = (WORKED.H * i) / 40;
    d += `${i ? 'L' : 'M'}${r1(qx + amp * Math.cos((Math.PI / 2) * (zz / WORKED.H)))} ${r1(yd(zz))}`;
  }
  out.push(`<line x1="${qx}" y1="${top}" x2="${qx}" y2="${r1(yd(WORKED.H))}" stroke="${COL.FOR4.line}" stroke-width="1" stroke-dasharray="2 3"/>`);
  out.push(`<path d="${d}" fill="none" stroke="${COL.FOR4.line}" stroke-width="2.5"/>`);
  out.push(text(qx + amp + 6, top + 22, '¼ wave', { size: 14, weight: 700, fill: COL.FOR4.line }));
  // depths
  const dx = x0 + colW + 10;
  for (const [m, label] of [[0, '0'], [WORKED.H, `${WORKED.H} m`], [WORKED.graniteKm * 1000, `about ${WORKED.graniteKm} km`]]) {
    out.push(`<line x1="${x0 + colW}" y1="${r1(yd(m))}" x2="${dx - 2}" y2="${r1(yd(m))}" stroke="${C.muted}"/>`);
    out.push(text(dx, yd(m) + 4, label, { size: 13, fill: C.muted }));
  }
  out.push(text(x0, yd(1600) + 16, 'Under FOR4, to scale (depth)', { size: 12, fill: C.muted }));

  // the arithmetic
  const tx = 360;
  const lines = [
    { s: 'A layer rings when its thickness H is', w: 400, gap: 20 },
    { s: 'a quarter of a wavelength: one wave is λ = 4H.', w: 400, gap: 28 },
    { s: `λ = 4 × ${WORKED.H} m = ${fmtInt(4 * WORKED.H)} m`, w: 700, gap: 20 },
    { s: `f0 = Vs ÷ λ = ${WORKED.vs} m/s ÷ ${fmtInt(4 * WORKED.H)} m = ${f0Worked.toFixed(2)} Hz`, w: 700, gap: 20 },
    { s: `(${WORKED.vs} m/s: the average speed through the layer)`, w: 400, color: C.muted, gap: 28 },
    { s: `Measured at FOR4: ${fmt2(peaks.FOR4.f0)} Hz. A close match.`, w: 700, color: COL.FOR4.line, gap: 28 },
    { s: `The granite, about ${WORKED.graniteKm} km down, would ring`, w: 400, gap: 20 },
    { s: `near ${WORKED.granitePeakHz} Hz. So the peak marks the first big`, w: 400, gap: 20 },
    { s: 'jump in stiffness, not the bedrock.', w: 400 },
  ];
  let ty = top + 8;
  for (const l of lines) {
    out.push(text(tx, ty, l.s, { size: 15, weight: l.w, fill: l.color || C.note }));
    ty += l.gap || 19;
  }
  out.push('</svg>');
  return out.join('\n');
}

const svg = stack([chart(), worked()]);
fs.writeFileSync(new URL('plots-hv.svg', outDir), svg + '\n');
console.log(`wrote docs/theory/img/plots-hv.svg (${(svg.length / 1024).toFixed(0)} KB)`);
void esc; void MINUS;
