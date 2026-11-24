// Figures for "Beyond one seismogram" (docs/theory/plots.md): how quiet is a station?
//
//   node tools/figures/plots-noise.mjs            both figures
//   node tools/figures/plots-noise.mjs ppsd       V3: a month of noise at TMU (January 2026) as a PPSD
//   node tools/figures/plots-noise.mjs compare    V4: winter vs summer at TMU; geophone vs broadband at SRU
//   ... --refetch                                  recompute the monthly histograms
//
// Waveforms and instrument responses: University of Utah (UU) stations via EarthScope FDSN.
// Reference curves: Peterson (1993), USGS Open-File Report 93-322 (lib/noise-models.js).
// Each station-month is reduced to a PPSD histogram (hours per 1 dB bin at each frequency),
// kept in tools/figures/data/ppsd-*.json, so the figures redraw without downloading a month
// of data. No credit text in the images: the page captions carry it.
import fs from 'node:fs';
import { C, r1 } from './svg-traces.mjs';
import { card, text, stack, png } from './svg-charts.mjs';
import { fetchCached, waveforms, STATION } from './fdsn-cache.mjs';

const { parseResponse, responseAmplitude } = await import('../../docs/app/js/lib/response.js');
const { accelSpectrumDb, octaveFreqs, ppsdHistogram, ppsdPercentile } = await import('../../docs/app/js/lib/psd.js');
const { NLNM, NHNM, modelDbAtFreq } = await import('../../docs/app/js/lib/noise-models.js');

const outDir = new URL('../../docs/theory/img/', import.meta.url);
const dataDir = new URL('./data/', import.meta.url);
const args = process.argv.slice(2);
const REFETCH = args.includes('--refetch');
const only = args.filter((a) => !a.startsWith('--'));
const MINUS = '−';
const minus = (v) => String(v).replace('-', MINUS);

function write(name, svg) {
  fs.writeFileSync(new URL(name, outDir), svg + '\n');
  console.log(`wrote docs/theory/img/${name} (${(svg.length / 1024).toFixed(0)} KB)`);
}

const CENTERS = octaveFreqs(0.02, 40); // 8 per octave
const HIST = { minDb: -200, maxDb: -50, stepDb: 1 };

/**
 * One month of hourly noise spectra for one channel, as a PPSD histogram. Each UTC hour is
 * one spectrum (Welch, 163.84 s pieces, half overlapping; an hour needs 30 of its 42 pieces).
 */
async function monthPpsd({ net = 'UU', sta, loc, cha, month }) {
  const name = `ppsd-${sta.toLowerCase()}-${cha.toLowerCase()}-${month}.json`;
  const file = new URL(name, dataDir);
  if (!REFETCH && fs.existsSync(file)) return JSON.parse(fs.readFileSync(file, 'utf8'));
  const t0 = Date.parse(`${month}-01T00:00:00Z`);
  const d = new Date(t0);
  const t1 = Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 1);
  const iso = (ms) => new Date(ms).toISOString().slice(0, 19);
  const respUrl = `${STATION}?net=${net}&sta=${sta}&loc=${loc}&cha=${cha}&level=response&format=xml&starttime=${iso(t0)}&endtime=${iso(t1)}`;
  const resp = parseResponse((await fetchCached(respUrl)).toString('utf8'));
  const countsPerMps = (f) => responseAmplitude(resp, f);
  const spectra = [];
  for (let day = t0; day < t1; day += 86400e3) {
    const [tr] = await waveforms({ net, sta, loc, cha, startMs: day, endMs: day + 86400e3 });
    for (let h = 0; h < 24; h++) {
      if (!tr) { spectra.push(null); continue; }
      const i0 = Math.round(((day + h * 3600e3 - tr.startMs) / 1000) * tr.sampleRate);
      const slice = tr.data.subarray(Math.max(0, i0), Math.max(0, i0 + 3600 * tr.sampleRate));
      spectra.push(accelSpectrumDb(slice, tr.sampleRate, countsPerMps, CENTERS, { nfft: 16384, minSegments: 30 }));
    }
    process.stdout.write(`\rppsd: ${sta}.${cha} ${month}: day ${(day - t0) / 86400e3 + 1}`);
  }
  process.stdout.write('\n');
  const hist = ppsdHistogram(spectra, HIST);
  const out = {
    what: `PPSD of ${net}.${sta}.${loc}.${cha}, ${month}: for each frequency, how many one-hour spectra fell in each 1 dB bin (acceleration power, dB re 1 (m/s^2)^2/Hz, full-octave averages at 1/8-octave steps; McNamara & Buland 2004).`,
    source: 'University of Utah Seismograph Stations (network UU, doi:10.7914/SN/UU) via EarthScope FDSN dataselect; response from the EarthScope station service (poles and zeros + sensitivity, lib/response.js)',
    response: respUrl,
    made: 'node tools/figures/plots-noise.mjs --refetch',
    hours: spectra.length, used: hist.total,
    freqs: CENTERS.map((f) => +f.toPrecision(6)), minDb: HIST.minDb, stepDb: HIST.stepDb,
    // counts[freq] as [first bin, count, count, ...] over the occupied bins only
    counts: hist.counts.map((bins) => {
      const a = bins.findIndex((c) => c > 0);
      if (a < 0) return [0];
      let b = bins.length - 1;
      while (bins[b] === 0) b--;
      return [a, ...bins.slice(a, b + 1)];
    }),
  };
  fs.writeFileSync(file, JSON.stringify(out) + '\n');
  console.log(`wrote tools/figures/data/${name} (${out.used} of ${out.hours} hours)`);
  return out;
}

/** Back from the kept form to a histogram that lib/psd.js understands. */
function unpack(kept) {
  const nBins = Math.round((HIST.maxDb - HIST.minDb) / HIST.stepDb);
  const counts = kept.counts.map(([a, ...c]) => {
    const bins = new Array(nBins).fill(0);
    c.forEach((n, i) => { bins[a + i] = n; });
    return bins;
  });
  return { counts, minDb: kept.minDb, stepDb: kept.stepDb, total: kept.used };
}

// ---------------------------------------------------------------------------------------------
// Drawing: a log-frequency, dB chart.
const FMIN = 0.02;
const FMAX = 40;
const DBMIN = -195;
const DBMAX = -85;

function chartFrame({ width = 760, height, title, top = 44, plotH, padL = 54, padR = 16, sub }) {
  const out = card(width, height, title);
  const w = width - padL - padR;
  const x = (f) => padL + (Math.log(f / FMIN) / Math.log(FMAX / FMIN)) * w;
  const y = (db) => top + ((DBMAX - db) / (DBMAX - DBMIN)) * plotH;
  if (sub) out.push(text(12, top - 12, sub, { size: 12.5, fill: C.muted }));
  for (let db = -190; db <= DBMAX; db += 20) {
    out.push(`<line x1="${padL}" y1="${r1(y(db))}" x2="${padL + w}" y2="${r1(y(db))}" stroke="${C.grid}"/>`);
    out.push(text(padL - 6, y(db) + 4, minus(db), { size: 12, fill: C.muted, anchor: 'end' }));
  }
  for (const f of [0.02, 0.05, 0.1, 0.2, 0.5, 1, 2, 5, 10, 20, 40]) {
    out.push(`<line x1="${r1(x(f))}" y1="${top}" x2="${r1(x(f))}" y2="${top + plotH}" stroke="${C.grid}"/>`);
    out.push(text(x(f), top + plotH + 16, String(f), { size: 12, fill: C.muted, anchor: f === 40 ? 'end' : 'middle' }));
  }
  out.push(text(padL + w, top + plotH + 32, 'frequency (Hz)', { size: 12, fill: C.muted, anchor: 'end' }));
  out.push(text(padL, top + plotH + 32, '50 s per wave', { size: 12, fill: C.muted }));
  out.push(text(14, top + plotH / 2, 'shaking power (dB)', { size: 12, fill: C.muted, anchor: 'middle' }).replace('<text ', `<text transform="rotate(-90 14 ${r1(top + plotH / 2)})" `));
  return { out, x, y, w, padL, top, plotH };
}

/** A curve over CENTERS (dB values), broken at NaN, limited to [fFrom, fTo]. */
function curvePath(x, y, values, fFrom = FMIN, fTo = FMAX) {
  let d = '';
  let pen = false;
  CENTERS.forEach((f, j) => {
    const v = values[j];
    if (!Number.isFinite(v) || f < fFrom * 0.999 || f > fTo * 1.001) { pen = false; return; }
    d += `${pen ? 'L' : 'M'}${r1(x(f))} ${r1(y(v))}`;
    pen = true;
  });
  return d;
}

/** A Peterson model as a path over [FMIN, 10 Hz]. */
function modelPath(model, x, y) {
  const pts = [];
  for (let lf = Math.log10(FMIN); lf <= 1 + 1e-9; lf += 0.01) {
    const f = 10 ** lf;
    const v = modelDbAtFreq(model, f);
    if (Number.isFinite(v)) pts.push(`${pts.length ? 'L' : 'M'}${r1(x(f))} ${r1(y(Math.max(DBMIN, Math.min(DBMAX, v))))}`);
  }
  return pts.join('');
}

/** A band between two curves (e.g. the 10th and 90th percentile hours). */
function bandPath(x, y, lo, hi, fFrom = FMIN, fTo = FMAX) {
  const idx = CENTERS.map((f, j) => j).filter((j) => CENTERS[j] >= fFrom * 0.999 && CENTERS[j] <= fTo * 1.001 && Number.isFinite(lo[j]) && Number.isFinite(hi[j]));
  if (!idx.length) return '';
  const up = idx.map((j, k) => `${k ? 'L' : 'M'}${r1(x(CENTERS[j]))} ${r1(y(hi[j]))}`).join('');
  const down = [...idx].reverse().map((j) => `L${r1(x(CENTERS[j]))} ${r1(y(lo[j]))}`).join('');
  return `${up}${down}Z`;
}

const at = (values, f) => values[CENTERS.findIndex((c) => Math.abs(Math.log(c / f)) < 0.04)];

// ---------------------------------------------------------------------------------------------
// V3. A month of noise at TMU (Wasatch Academy stand-in), January 2026, as a PPSD.
async function ppsd() {
  const kept = await monthPpsd({ sta: 'TMU', loc: '01', cha: 'HHZ', month: '2026-01' });
  const hist = unpack(kept);
  const med = ppsdPercentile(hist, 0.5);
  const p10 = ppsdPercentile(hist, 0.1);
  const p90 = ppsdPercentile(hist, 0.9);
  console.log(`ppsd: TMU HHZ 2026-01: ${kept.used} of ${kept.hours} hours`);
  for (const f of [0.05, 0.1, 0.177, 0.2, 0.5, 1, 2, 5, 10, 20, 40]) {
    console.log(`  ${f} Hz: p10 ${at(p10, f)} median ${at(med, f)} p90 ${at(p90, f)}; NLNM ${modelDbAtFreq(NLNM, f).toFixed(0)} NHNM ${modelDbAtFreq(NHNM, f).toFixed(0)}`);
  }
  const plotH = 330;
  const top = 58;
  const height = top + plotH + 44 + 64;
  const { out, x, y, w, padL } = chartFrame({ height, plotH, top, title: 'A month of noise at station TMU: every hour of January 2026 (vertical sensor)',
    sub: 'Each hour\'s spectrum adds a little ink: dark where many hours fell, pale where few did.' });
  // the cloud, as a 2× image: each frequency column, each 1 dB bin shaded by the share of
  // hours in it (25% of the hours in one bin = darkest)
  const S = 2;
  const W = Math.round(w * S);
  const Hpx = Math.round(plotH * S);
  const rgb = new Uint8Array(W * Hpx * 3).fill(255);
  const logStep = Math.log(2) / 8;
  for (let px = 0; px < W; px++) {
    const f = FMIN * Math.exp(((px + 0.5) / W) * Math.log(FMAX / FMIN));
    const bins = hist.counts[Math.round(Math.log(f / CENTERS[0]) / logStep)];
    const n = bins ? bins.reduce((p, q) => p + q, 0) : 0;
    if (!n) continue;
    for (let py = 0; py < Hpx; py++) {
      const db = DBMAX - ((py + 0.5) / Hpx) * (DBMAX - DBMIN);
      const c = bins[Math.floor((db - hist.minDb) / hist.stepDb)] || 0;
      if (!c) continue;
      const shade = Math.round(235 - 200 * Math.sqrt(Math.min(1, c / n / 0.25)));
      rgb.set([shade, Math.round(shade * 0.98 + 4), Math.min(255, shade + 30)], (py * W + px) * 3);
    }
  }
  out.push(`<image x="${padL}" y="${top}" width="${r1(w)}" height="${plotH}" preserveAspectRatio="none" href="data:image/png;base64,${png(W, Hpx, rgb).toString('base64')}"/>`);
  out.push(`<path d="${curvePath(x, y, med)}" fill="none" stroke="#ffffff" stroke-width="1.6"/>`);
  // Peterson's curves
  out.push(`<path d="${modelPath(NHNM, x, y)}" fill="none" stroke="#b45309" stroke-width="2.2"/>`);
  out.push(`<path d="${modelPath(NLNM, x, y)}" fill="none" stroke="#0f766e" stroke-width="2.2"/>`);
  out.push(text(x(0.42), y(-101), 'noisy stations (Peterson\'s high-noise model)', { size: 12.5, weight: 700, fill: '#b45309', halo: true }));
  out.push(text(x(0.024), y(modelDbAtFreq(NLNM, 0.024)) + 18, 'the quietest places on Earth (low-noise model)', { size: 12.5, weight: 700, fill: '#0f766e', halo: true }));
  out.push(text(x(10) + 4, y(modelDbAtFreq(NHNM, 10)) - 8, 'models stop at 10 Hz', { size: 12, fill: C.muted, halo: true }));
  // what the bumps are
  const note = (f, db, s, anchor = 'middle') => out.push(text(x(f), y(db), s, { size: 12.5, weight: 700, anchor, halo: true }));
  note(0.19, at(p90, 0.19) + 8, 'ocean hum');
  note(3.2, at(p10, 3.2) - 14, 'wind, people, machines');
  // legend under the chart
  const ly = top + plotH + 50;
  out.push(`<line x1="${padL}" y1="${ly}" x2="${padL + 26}" y2="${ly}" stroke="${C.trace}" stroke-width="1.6"/>`);
  out.push(`<line x1="${padL}" y1="${ly - 3}" x2="${padL + 26}" y2="${ly - 3}" stroke="#ffffff" stroke-width="1.6"/>`);
  out.push(text(padL + 32, ly + 4, 'white line: the median hour (half the hours were quieter)', { size: 12.5, fill: C.muted }));
  out.push(text(padL, ly + 24, 'Shaking power is ground acceleration in decibels: 10 dB more is 10 times the power, about 3 times', { size: 12.5, fill: C.muted }));
  out.push(text(padL, ly + 42, 'bigger shaking; 20 dB more is 10 times bigger shaking.', { size: 12.5, fill: C.muted }));
  out.push('</svg>');
  write('plots-ppsd.svg', out.join('\n'));
}

// ---------------------------------------------------------------------------------------------
// V4. Two comparisons on the same axes: winter vs summer at TMU; a geophone beside a broadband
// sensor at SRU (October 2026).
async function compare() {
  const jan = unpack(await monthPpsd({ sta: 'TMU', loc: '01', cha: 'HHZ', month: '2026-01' }));
  const jul = unpack(await monthPpsd({ sta: 'TMU', loc: '01', cha: 'HHZ', month: '2026-07' }));
  const bb = unpack(await monthPpsd({ sta: 'SRU', loc: '01', cha: 'HHZ', month: '2026-10' }));
  const sp = unpack(await monthPpsd({ sta: 'SRU', loc: '01', cha: 'EHZ', month: '2026-10' }));
  const pct = (h) => ({ med: ppsdPercentile(h, 0.5), lo: ppsdPercentile(h, 0.1), hi: ppsdPercentile(h, 0.9) });
  const J = pct(jan), U = pct(jul), B = pct(bb), S = pct(sp);
  for (const f of [0.05, 0.1, 0.149, 0.177, 0.2, 0.3, 0.5, 1, 2, 5, 10, 12, 20]) {
    console.log(`compare: ${f} Hz: TMU Jan ${at(J.med, f)} Jul ${at(U.med, f)} (${at(J.med, f) - at(U.med, f)} dB) | SRU HH ${at(B.med, f)} EH ${at(S.med, f)} (${at(S.med, f) - at(B.med, f)} dB)`);
  }
  const ocean = CENTERS.map((f, j) => [f, J.med[j] - U.med[j]]).filter(([f]) => f >= 0.1 && f <= 0.3);
  console.log(`compare: ocean hum band 0.1-0.3 Hz, Jan minus Jul median: ${ocean.map(([f, d]) => `${f.toFixed(3)}:${d}`).join(' ')}`);
  const agree = CENTERS.map((f, j) => [f, S.med[j] - B.med[j]]).filter(([f]) => f >= 0.1 && f <= 8);
  console.log(`compare: SRU EH minus HH, 0.1-8 Hz: max |diff| ${Math.max(...agree.map(([, d]) => Math.abs(d)))} dB`);

  const plotH = 250;
  const top = 58;
  const legendH = 46;
  const height = top + plotH + 44 + legendH;
  const panel = (title, sub, a, b, fromB, toB, notes, legend) => {
    const { out, x, y, padL } = chartFrame({ height, plotH, top, title, sub });
    out.push(`<path d="${modelPath(NHNM, x, y)}" fill="none" stroke="#b45309" stroke-width="1.4" stroke-dasharray="6 4"/>`);
    out.push(`<path d="${modelPath(NLNM, x, y)}" fill="none" stroke="#0f766e" stroke-width="1.4" stroke-dasharray="6 4"/>`);
    out.push(`<path d="${bandPath(x, y, a.data.lo, a.data.hi)}" fill="${a.fill}"/>`);
    out.push(`<path d="${bandPath(x, y, b.data.lo, b.data.hi, fromB, toB)}" fill="${b.fill}"/>`);
    out.push(`<path d="${curvePath(x, y, a.data.med)}" fill="none" stroke="${a.color}" stroke-width="2.4"/>`);
    out.push(`<path d="${curvePath(x, y, b.data.med, fromB, toB)}" fill="none" stroke="${b.color}" stroke-width="2.4"/>`);
    for (const n of notes) out.push(text(x(n.f), y(n.db), n.s, { size: 12.5, weight: 700, fill: n.color || C.note, anchor: n.anchor || 'middle', halo: true }));
    const ly = top + plotH + 50;
    let lx = padL;
    for (const [color, label] of legend) {
      out.push(`<line x1="${lx}" y1="${ly - 4}" x2="${lx + 24}" y2="${ly - 4}" stroke="${color}" stroke-width="2.4"/>`);
      out.push(text(lx + 30, ly, label, { size: 12.5, weight: 600 }));
      lx += 30 + label.length * 7 + 24;
    }
    out.push(text(padL, ly + 20, 'Lines: the median hour; shading: from the 10% quietest to the 10% noisiest hours. Dashed: Peterson\'s models.', { size: 12, fill: C.muted }));
    out.push('</svg>');
    return out.join('\n');
  };
  const winter = panel('Winter against summer at station TMU (broadband sensor)', 'Every hour of January 2026 and of July 2026.',
    { data: J, color: '#1d4ed8', fill: 'rgba(29,78,216,0.16)' }, { data: U, color: '#c2410c', fill: 'rgba(194,65,12,0.16)' }, FMIN, FMAX,
    [{ f: 0.19, db: at(J.hi, 0.19) + 9, s: 'ocean hum: stronger in winter' }],
    [['January 2026', '#1d4ed8'].reverse(), ['July 2026', '#c2410c'].reverse()]);
  const sensors = panel('Two sensors side by side at station SRU (October 2026)', 'A 1 Hz geophone and a broadband seismometer at the same site, every hour of the month.',
    { data: B, color: '#1f2937', fill: 'rgba(31,41,55,0.14)' }, { data: S, color: '#0891b2', fill: 'rgba(8,145,178,0.18)' }, FMIN, 8,
    [{ f: 0.032, db: at(S.med, 0.032) + 10, s: 'geophone: its own noise', color: '#0e7490', anchor: 'start' },
     { f: 1.2, db: at(B.hi, 1.2) + 12, s: 'both record the same ground' },
     { f: 8.6, db: at(S.med, 8) + 3, s: 'geophone cut off', color: '#0e7490', anchor: 'start' }],
    [['broadband (Trillium 120)', '#1f2937'].reverse(), ['geophone (Geotech S-13), up to 8 Hz', '#0891b2'].reverse()]);
  write('plots-ppsd-compare.svg', stack([winter, sensors]));
}

const ALL = { ppsd, compare };
for (const [name, fn] of Object.entries(ALL)) if (!only.length || only.includes(name)) await fn();
