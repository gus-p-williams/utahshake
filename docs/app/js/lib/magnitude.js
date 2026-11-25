// Local magnitude (ML) the way the University of Utah Seismograph Stations (UUSS) compute it,
// for the science page "How big was it?" and Quake Explorer's investigation E (D41).
// Pure functions on plain arrays, no browser APIs, so they run in node --test.
//
// The recipe (Richter 1935; UUSS, planning/review-magnitude.md sections 2-3):
//   1. turn each horizontal record into what Richter's Wood-Anderson seismograph would have
//      drawn: a pendulum with a 0.8 s period, damping 0.8, magnifying the ground 2,800 times;
//   2. read half the largest peak-to-peak swing, in millimeters;
//   3. station ML = log10(swing in mm) + Richter's 1958 distance correction (-log A0);
//   4. the event's value from many stations (UUSS averages its corrected stations; with no
//      station corrections, students take the middle value).
// UUSS stores each swing in ComCat as the FULL peak-to-peak swing in meters (`AML`) and halves
// it; with damping 0.8 and magnification 2,800 our simulation reproduces those numbers to about
// 1% (review 3.2). The real instruments magnified about 2,080, so a 2,800 simulation read with
// Richter's table runs about 0.1 high; UUSS's station corrections take that out (Uhrhammer and
// Collins 1990). Students have no corrections, so their values run a few hundredths high.
import { fft, nextPow2 } from './spectral.js';

/** Richter's nominal Wood-Anderson torsion seismograph, as UUSS simulates it. */
export const WOOD_ANDERSON = Object.freeze({ periodSec: 0.8, damping: 0.8, magnification: 2800 });

/**
 * Richter (1958) Table 22-1, -log A0 against epicentral distance (km), as reproduced by
 * Uhrhammer, Loper and Romanowicz (1996, Table 4) and checked against Bormann (2012, NMSOP-2
 * DS 3.1, Table 1); the two agree at every shared distance. There is no 75 km row.
 * Sources: planning/magnitude-sources.md.
 */
export const RICHTER_1958 = Object.freeze([
  [0, 1.4], [5, 1.4], [10, 1.5], [15, 1.6], [20, 1.7], [25, 1.9], [30, 2.1], [35, 2.3], [40, 2.4],
  [45, 2.5], [50, 2.6], [55, 2.7], [60, 2.8], [65, 2.8], [70, 2.8], [80, 2.9], [85, 2.9], [90, 3.0],
  [95, 3.0], [100, 3.0], [110, 3.1], [120, 3.1], [130, 3.2], [140, 3.2], [150, 3.3], [160, 3.3],
  [170, 3.4], [180, 3.4], [190, 3.5], [200, 3.5], [210, 3.6], [220, 3.65], [230, 3.7], [240, 3.7],
  [250, 3.8], [260, 3.8], [270, 3.9], [280, 3.9], [290, 4.0], [300, 4.0], [310, 4.1], [320, 4.1],
  [330, 4.2], [340, 4.2], [350, 4.3], [360, 4.3], [370, 4.3], [380, 4.4], [390, 4.4], [400, 4.5],
  [410, 4.5], [420, 4.5], [430, 4.6], [440, 4.6], [450, 4.6], [460, 4.6], [470, 4.7], [480, 4.7],
  [490, 4.7], [500, 4.7], [510, 4.8], [520, 4.8], [530, 4.8], [540, 4.8], [550, 4.8], [560, 4.9],
  [570, 4.9], [580, 4.9], [590, 4.9], [600, 4.9],
].map((r) => Object.freeze(r)));

/**
 * Richter's distance correction, -log A0, at an epicentral distance: linear between the
 * table's rows. null outside 0-600 km.
 * @param {number} distKm
 * @returns {number|null}
 */
export function richterLogA0(distKm) {
  const T = RICHTER_1958;
  if (!Number.isFinite(distKm) || distKm < 0 || distKm > T.at(-1)[0]) return null;
  for (let i = 1; i < T.length; i++) {
    if (distKm <= T[i][0]) {
      const [x0, y0] = T[i - 1];
      const [x1, y1] = T[i];
      return y0 + ((y1 - y0) * (distKm - x0)) / (x1 - x0);
    }
  }
  return T.at(-1)[1];
}

/**
 * A station's local magnitude from one swing: log10(A in mm) + (-log A0).
 * Richter's definition: a 1 mm swing at 100 km is magnitude 3.
 * @param {number} ampMm half the largest peak-to-peak swing on the Wood-Anderson, mm
 * @param {number} distKm epicentral distance
 * @returns {number|null}
 */
export function stationML(ampMm, distKm) {
  const c = richterLogA0(distKm);
  return ampMm > 0 && c !== null ? Math.log10(ampMm) + c : null;
}

/**
 * UUSS's stored amplitude (ComCat `AML`: the full peak-to-peak swing on its simulated
 * Wood-Anderson, in meters) as the swing the formula uses: half of it, in millimeters.
 */
export const uussSwingMm = (amlMeters) => (amlMeters * 1000) / 2;

/**
 * How the Wood-Anderson responds to ground velocity at frequency f (Hz): the complex factor
 * turning ground velocity (m/s) into trace displacement on the paper (mm). Displacement is
 * velocity / (iω); the pendulum's response is s^2 / (s^2 + 2hω0 s + ω0^2) with s = iω; together
 * iω / (ω0^2 - ω^2 + 2ihω0ω), times the magnification and 1000 mm/m. Negative f gives the
 * complex conjugate, so a real record stays real.
 * @returns {{re:number, im:number}}
 */
export function woodAndersonGain(f, wa = WOOD_ANDERSON) {
  const w = 2 * Math.PI * f;
  const w0 = (2 * Math.PI) / wa.periodSec;
  const k = wa.magnification * 1000;
  // numerator i*w*k; denominator a + i*b
  const a = w0 * w0 - w * w;
  const b = 2 * wa.damping * w0 * w;
  const d = a * a + b * b;
  if (d === 0) return { re: 0, im: 0 };
  // (i w k)(a - i b) / d = (w k b + i w k a) / d
  return { re: (w * k * b) / d, im: (w * k * a) / d };
}

/** Cosine taper from 0 (at f <= f1) to 1 (at f >= f2). */
function rampUp(f, f1, f2) {
  if (f <= f1) return 0;
  if (f >= f2) return 1;
  return 0.5 * (1 - Math.cos((Math.PI * (f - f1)) / (f2 - f1)));
}

/**
 * The record Richter's Wood-Anderson would have drawn, from ground velocity.
 *
 * Done in the frequency domain with the app's own FFT: remove the mean and trend, taper the
 * ends, zero-pad, multiply each frequency by woodAndersonGain(), transform back. A gentle
 * high-pass (default 0.1-0.2 Hz) removes long-period drift the pendulum would barely feel
 * anyway; the top 5-15% below Nyquist is tapered off. Missing samples (NaN) are filled with the
 * mean before filtering and come back as NaN.
 * @param {ArrayLike<number>} velocity ground velocity, m/s
 * @param {number} sampleRate samples per second
 * @param {{highpassHz?:[number,number], taperSec?:number, wa?:object}} [opt]
 * @returns {Float64Array} trace displacement, mm
 */
export function woodAnderson(velocity, sampleRate, opt = {}) {
  const { highpassHz = [0.1, 0.2], taperSec = 1.5, wa = WOOD_ANDERSON } = opt;
  const n = velocity.length;
  const out = new Float64Array(n);
  if (n < 4) return out;
  // mean and linear trend from the finite samples
  let cnt = 0, sx = 0, sy = 0, sxx = 0, sxy = 0;
  for (let i = 0; i < n; i++) {
    const v = velocity[i];
    if (!Number.isFinite(v)) continue;
    cnt++; sx += i; sy += v; sxx += i * i; sxy += i * v;
  }
  if (cnt < 4) return out.fill(NaN);
  const den = cnt * sxx - sx * sx;
  const slope = den ? (cnt * sxy - sx * sy) / den : 0;
  const icpt = (sy - slope * sx) / cnt;
  const N = nextPow2(2 * n);
  const re = new Float64Array(N);
  const im = new Float64Array(N);
  const m = Math.min(Math.floor(n / 2), Math.max(1, Math.round(taperSec * sampleRate)));
  for (let i = 0; i < n; i++) {
    const v = velocity[i];
    let x = Number.isFinite(v) ? v - (icpt + slope * i) : 0;
    if (i < m) x *= 0.5 * (1 - Math.cos((Math.PI * i) / m));
    else if (i >= n - m) x *= 0.5 * (1 - Math.cos((Math.PI * (n - 1 - i)) / m));
    re[i] = x;
  }
  fft(re, im);
  const nyq = sampleRate / 2;
  const [h1, h2] = highpassHz;
  for (let k = 0; k < N; k++) {
    const kk = k <= N / 2 ? k : k - N;
    const f = (kk * sampleRate) / N;
    const af = Math.abs(f);
    const t = rampUp(af, h1, h2) * (1 - rampUp(af, 0.85 * nyq, 0.95 * nyq));
    const g = woodAndersonGain(f, wa);
    const gr = g.re * t;
    const gi = g.im * t;
    const r = re[k] * gr - im[k] * gi;
    const i2 = re[k] * gi + im[k] * gr;
    re[k] = r;
    im[k] = -i2; // conjugate, so a forward FFT acts as the inverse
  }
  fft(re, im);
  for (let i = 0; i < n; i++) out[i] = Number.isFinite(velocity[i]) ? re[i] / N : NaN;
  return out;
}

/**
 * Half the largest peak-to-peak swing between neighboring turning points in data[i0..i1),
 * the amplitude Richter's magnitude uses (NaN samples are skipped).
 * @returns {{amp:number, i:number, j:number}|null} amp = half the swing; i, j = the two
 *   turning points (i < j), for marking the swing on a plot
 */
export function halfPeakToPeak(data, i0 = 0, i1 = data.length) {
  i0 = Math.max(0, Math.floor(i0));
  i1 = Math.min(data.length, Math.ceil(i1));
  const turns = [];
  let prev = null;
  let dir = 0;
  for (let i = i0; i < i1; i++) {
    const v = data[i];
    if (!Number.isFinite(v)) continue;
    if (prev === null) { turns.push(i); prev = i; continue; }
    const d = Math.sign(v - data[prev]);
    if (d !== 0 && dir !== 0 && d !== dir) turns.push(prev);
    if (d !== 0) dir = d;
    prev = i;
  }
  if (prev !== null && turns.at(-1) !== prev) turns.push(prev);
  let best = null;
  for (let k = 1; k < turns.length; k++) {
    const sw = Math.abs(data[turns[k]] - data[turns[k - 1]]);
    if (!best || sw > best.swing) best = { swing: sw, i: turns[k - 1], j: turns[k] };
  }
  return best && best.swing > 0 ? { amp: best.swing / 2, i: best.i, j: best.j } : null;
}

/**
 * Where to look for the biggest swing, in seconds after the origin time: from 2 s before the
 * predicted P (distance / 6.1 km/s) to 30 s, or 0.3 s per km, after the predicted S
 * (distance / 3.5 km/s), whichever is later (review 3.1).
 */
export function swingWindow(distKm, { vp = 6.1, vs = 3.5, before = 2, after = 30, perKm = 0.3 } = {}) {
  const pSec = distKm / vp;
  const sSec = distKm / vs;
  return { pSec, sSec, startSec: pSec - before, endSec: sSec + Math.max(after, perKm * distKm) };
}

/**
 * The station rule (review 3.1): which records count. Students see every dropped station
 * with its reason.
 */
export const STATION_RULE = Object.freeze({
  minKm: 10,
  maxKm: 300,
  // The quake's biggest wiggle must be at least twice the biggest one before P (peak against
  // peak, so pure noise, whose later peaks are only about 1.1 times its earlier ones, never
  // passes). With 3 instead of 2 the gate dropped many real far-station signals, often because a
  // swarm's earlier quake was still ringing before P (tools/quake-explorer/magnitude-check.mjs).
  minSnr: 2,
  maxMissing: 0.005,    // a record missing more than 0.5% of its samples is dropped
  bigQuakeML: 4.5,      // from this size, broadband (HH) channels only
  broadbandBands: Object.freeze(['HH']),
});

/** Plain-language reasons, for the dropped-stations list. */
export const DROP_REASONS = Object.freeze({
  distance: 'closer than 10 km or farther than 300 km',
  nodata: 'no record',
  flat: 'flat record (no signal)',
  clipped: 'clipped: the record hit its limit, so the real peak is hidden',
  noise: 'the quake barely rises above the noise',
  units: 'no sensitivity in the station list',
  short: 'too short a record',
  gap: 'pieces of the record are missing',
  band: 'not a broadband sensor (big quakes saturate older sensors)',
  onehorizontal: 'only one horizontal sensor worked',
});

/**
 * Measure one channel: simulate the Wood-Anderson, read the biggest swing in the window and
 * check it stands above the noise.
 * @param {object} a
 * @param {ArrayLike<number>} a.velocity ground velocity, m/s
 * @param {number} a.sampleRate
 * @param {number} a.startSec record start, seconds after the origin time (negative before it)
 * @param {number} a.distKm epicentral distance
 * @param {boolean} [a.clipped] the app's isClipped() on the raw counts
 * @param {object} [a.rule] STATION_RULE overrides
 * @returns {{gate:string, ampMm?:number, ml?:number, snr?:number, wa?:Float64Array,
 *   i?:number, j?:number}} gate 'ok' or a DROP_REASONS key
 */
export function measureChannel({ velocity, sampleRate, startSec, distKm, clipped = false, rule = {} }) {
  const R = { ...STATION_RULE, ...rule };
  if (!(distKm >= R.minKm && distKm <= R.maxKm)) return { gate: 'distance' };
  if (!velocity || !velocity.length) return { gate: 'nodata' };
  if (clipped) return { gate: 'clipped' };
  let missing = 0;
  for (let i = 0; i < velocity.length; i++) if (!Number.isFinite(velocity[i])) missing++;
  if (missing > R.maxMissing * velocity.length) return { gate: 'gap' };
  const win = swingWindow(distKm);
  const idx = (sec) => Math.round((sec - startSec) * sampleRate);
  const i0 = Math.max(0, idx(win.startSec));
  const i1 = Math.min(velocity.length, idx(win.endSec));
  const n1 = Math.min(i0, idx(win.pSec - 2));
  if (i1 - i0 < sampleRate * 2) return { gate: 'short' };
  const wa = woodAnderson(velocity, sampleRate);
  const swing = halfPeakToPeak(wa, i0, i1);
  if (!swing) return { gate: 'flat' };
  let zp = 0;
  for (let i = i0; i < i1; i++) if (Number.isFinite(wa[i])) zp = Math.max(zp, Math.abs(wa[i]));
  // noise: the biggest wiggle of the simulated record before P (skipping the tapered first
  // 1.5 s). Peak against peak, so a record of pure noise doesn't pass: over a long window the
  // noise's own peak is about 4 times its RMS.
  let noise = 0;
  let c = 0;
  for (let i = Math.min(n1, Math.round(1.5 * sampleRate)); i < n1; i++) {
    if (Number.isFinite(wa[i])) { noise = Math.max(noise, Math.abs(wa[i])); c++; }
  }
  if (c < sampleRate) noise = 0;
  const snr = noise > 0 ? zp / noise : Infinity;
  const ml = stationML(swing.amp, distKm);
  const res = { gate: 'ok', ampMm: swing.amp, ml, snr, wa, i: swing.i, j: swing.j };
  if (snr < R.minSnr) res.gate = 'noise';
  return res;
}

/**
 * One station's value from its horizontal channels (UUSS's rule: each channel gives a
 * magnitude, and they are averaged). Both horizontals must pass; a station whose only
 * horizontal passed is dropped ('onehorizontal'). A vertical-only station can stand in with
 * `verticalCorrection` added (review 3.4: +0.21), labeled as such.
 * @param {Array<{gate:string, ml?:number}>} horizontals
 * @returns {{gate:string, ml?:number}}
 */
export function stationValue(horizontals) {
  const ok = horizontals.filter((h) => h.gate === 'ok');
  if (horizontals.length >= 2 && ok.length === horizontals.length) {
    return { gate: 'ok', ml: ok.reduce((s, h) => s + h.ml, 0) / ok.length };
  }
  if (ok.length && ok.length < horizontals.length) {
    const bad = horizontals.find((h) => h.gate !== 'ok');
    return { gate: bad.gate };
  }
  if (horizontals.length === 1 && ok.length === 1) return { gate: 'onehorizontal' };
  return { gate: horizontals[0]?.gate || 'nodata' };
}

/** The vertical-only correction, fitted on training quakes and checked out of sample (review 3.4). */
export const VERTICAL_CORRECTION = 0.21;

/** Middle value and mean of station magnitudes. */
export function eventML(values) {
  const v = values.filter(Number.isFinite).sort((a, b) => a - b);
  if (!v.length) return { n: 0, median: null, mean: null };
  const h = v.length >> 1;
  const median = v.length % 2 ? v[h] : (v[h - 1] + v[h]) / 2;
  return { n: v.length, median, mean: v.reduce((s, x) => s + x, 0) / v.length };
}

// --- Duration magnitude (UUSS's coda magnitude, Mc; ComCat `md`) ----------------------------

/** UUSS's line: the average ground speed at which the duration ends, m/s (0.01724 µm/s). */
export const CODA_THRESHOLD = 0.01724e-6;

/**
 * Average absolute value in windows of `winSec`, every `stepSec` (UUSS: 2 s windows, 1 s
 * apart), for the duration plot. Returns [{tSec, value}] with tSec the window's middle,
 * relative to the record start.
 */
export function absMeanEnvelope(data, sampleRate, { winSec = 2, stepSec = 1 } = {}) {
  const w = Math.round(winSec * sampleRate);
  const st = Math.max(1, Math.round(stepSec * sampleRate));
  const out = [];
  for (let i = 0; i + w <= data.length; i += st) {
    let s = 0;
    let c = 0;
    for (let k = i; k < i + w; k++) if (Number.isFinite(data[k])) { s += Math.abs(data[k]); c++; }
    out.push({ tSec: (i + w / 2) / sampleRate, value: c ? s / c : NaN });
  }
  return out;
}

/** UUSS's Utah coda magnitude: Mc = -2.25 + 2.32 log10(tau) + 0.0023 distance (km). */
export const codaMagnitude = (tauSec, distKm) => -2.25 + 2.32 * Math.log10(tauSec) + 0.0023 * distKm;

// --- Reading UUSS's numbers from ComCat's "phase-data" QuakeML -------------------------------

const tagValue = (body, tag) => {
  const m = new RegExp(`<${tag}>\\s*(?:<value>)?([^<]+)`).exec(body);
  return m ? m[1].trim() : null;
};
const waveform = (body) => {
  const wf = /<waveformID\b([^>]*)\/?>/.exec(body);
  const attr = (name) => (wf && (new RegExp(`${name}="([^"]*)"`).exec(wf[1]) || [])[1]) || '';
  return { net: attr('networkCode'), sta: attr('stationCode'), loc: attr('locationCode'), cha: attr('channelCode') };
};
const blocks = (xml, tag) => [...xml.matchAll(new RegExp(`<${tag}\\s+publicID="([^"]+)"[^>]*>([\\s\\S]*?)</${tag}>`, 'g'))];

/**
 * Amplitudes UUSS measured: Wood-Anderson swings (`AML`, full peak-to-peak, meters) and coda
 * durations (`END`, seconds from the P pick).
 * @returns {Array<{id:string, type:string, value:number, unit:string, net:string, sta:string,
 *   loc:string, cha:string}>}
 */
export function parseQuakeMLAmplitudes(xml) {
  return blocks(xml, 'amplitude').map(([, id, body]) => ({
    id,
    type: tagValue(body, 'type') || '',
    value: Number(tagValue(body, 'genericAmplitude')),
    unit: tagValue(body, 'unit') || '',
    ...waveform(body),
  })).filter((a) => Number.isFinite(a.value));
}

/**
 * UUSS's magnitudes for the event: the network values (ML, Md, Mw; which is preferred) and each
 * channel's station magnitude with its weight in the event's value (weight 0: no station
 * correction, not averaged).
 * @returns {{network: Array<{id, type, value, method, stationCount, preferred}>,
 *   station: Array<{id, type, value, amplitudeId, weight, residual, net, sta, loc, cha}>}}
 */
export function parseQuakeMLMagnitudes(xml) {
  const preferred = (/<preferredMagnitudeID>([^<]+)<\/preferredMagnitudeID>/.exec(xml) || [])[1]?.trim();
  const contrib = new Map();
  const network = blocks(xml, 'magnitude').map(([, id, body]) => {
    for (const c of body.matchAll(/<stationMagnitudeContribution>([\s\S]*?)<\/stationMagnitudeContribution>/g)) {
      const sid = tagValue(c[1], 'stationMagnitudeID');
      if (sid) contrib.set(sid, { weight: Number(tagValue(c[1], 'weight')), residual: Number(tagValue(c[1], 'residual')) });
    }
    const method = (tagValue(body, 'methodID') || '').split('/').at(-1);
    return {
      id,
      type: tagValue(body, 'type') || '',
      value: Number(tagValue(body, 'mag')),
      method,
      stationCount: Number(tagValue(body, 'stationCount')) || null,
      preferred: id === preferred,
    };
  });
  const station = blocks(xml, 'stationMagnitude').map(([, id, body]) => ({
    id,
    type: tagValue(body, 'type') || '',
    value: Number(tagValue(body, 'mag')),
    amplitudeId: tagValue(body, 'amplitudeID'),
    weight: contrib.get(id)?.weight ?? null,
    residual: contrib.get(id)?.residual ?? null,
    ...waveform(body),
  }));
  return { network, station };
}
