// Small signal helpers for waveform display. Pure functions.

/**
 * @typedef {Object} Trace
 * @property {string} net
 * @property {string} sta
 * @property {string} loc
 * @property {string} cha
 * @property {number} sampleRate  samples per second
 * @property {number} startMs     time of data[0], ms since 1970 (UTC)
 * @property {Float32Array} data  counts; NaN where data are missing
 */

/**
 * Join pieces of one channel's record into one evenly sampled array, filling
 * gaps with NaN so the time of sample i is always startMs + i / sampleRate.
 * @param {Array<{startMs:number, sampleRate:number, data:ArrayLike<number>}>} segments
 * @param {number} [fromMs] optional window start
 * @param {number} [toMs] optional window end
 */
export function mergeSegments(segments, fromMs, toMs) {
  if (!segments.length) throw new Error('no data segments');
  const sr = segments[0].sampleRate;
  const dt = 1000 / sr;
  const start = fromMs ?? Math.min(...segments.map((s) => s.startMs));
  const end = toMs ?? Math.max(...segments.map((s) => s.startMs + s.data.length * dt));
  const n = Math.max(0, Math.round((end - start) / dt));
  const out = new Float32Array(n).fill(NaN);
  for (const seg of segments) {
    if (Math.abs(seg.sampleRate - sr) / sr > 0.001) continue; // ignore odd segments
    const offset = Math.round((seg.startMs - start) / dt);
    for (let i = 0; i < seg.data.length; i++) {
      const k = offset + i;
      if (k >= 0 && k < n) out[k] = seg.data[i];
    }
  }
  return { startMs: start, sampleRate: sr, data: out };
}

/** [start, end) index ranges of the non-NaN parts of an array. */
export function contiguousRuns(data) {
  const runs = [];
  let i = 0;
  while (i < data.length) {
    while (i < data.length && Number.isNaN(data[i])) i++;
    const s = i;
    while (i < data.length && !Number.isNaN(data[i])) i++;
    if (i > s) runs.push([s, i]);
  }
  return runs;
}

/** Subtract the mean (in place). */
export function demean(arr) {
  let sum = 0;
  for (let i = 0; i < arr.length; i++) sum += arr[i];
  const m = arr.length ? sum / arr.length : 0;
  for (let i = 0; i < arr.length; i++) arr[i] -= m;
  return arr;
}

/** Cosine taper of the first and last `fraction` of the array (in place). */
export function taper(arr, fraction = 0.05) {
  const n = arr.length;
  const w = Math.floor(n * fraction);
  for (let i = 0; i < w; i++) {
    const f = 0.5 * (1 - Math.cos((Math.PI * i) / w));
    arr[i] *= f;
    arr[n - 1 - i] *= f;
  }
  return arr;
}

/**
 * Min and max of data in each of nCols equal slices of [i0, i1): what a
 * screen column needs to draw a dense trace without losing peaks.
 * @returns {{min:Float32Array, max:Float32Array}} NaN where a column has no data
 */
export function minMaxColumns(data, i0, i1, nCols) {
  const min = new Float32Array(nCols).fill(NaN);
  const max = new Float32Array(nCols).fill(NaN);
  const span = i1 - i0;
  if (span <= 0 || nCols <= 0) return { min, max };
  for (let c = 0; c < nCols; c++) {
    const a = Math.max(0, Math.floor(i0 + (c * span) / nCols));
    const b = Math.min(data.length, Math.max(a + 1, Math.floor(i0 + ((c + 1) * span) / nCols)));
    let lo = Infinity;
    let hi = -Infinity;
    for (let i = a; i < b; i++) {
      const v = data[i];
      if (v < lo) lo = v;
      if (v > hi) hi = v;
    }
    if (lo !== Infinity) { min[c] = lo; max[c] = hi; }
  }
  return { min, max };
}

/**
 * True if a record is (nearly) flat: no data, or a peak-to-peak range of only
 * a few counts. A dead or unplugged sensor looks like this, and auto-scaling
 * would blow its digitizer noise up to fill the screen.
 */
export function isFlat(data, minRangeCounts = 10) {
  let lo = Infinity;
  let hi = -Infinity;
  for (let i = 0; i < data.length; i++) {
    const v = data[i];
    if (v < lo) lo = v;
    if (v > hi) hi = v;
  }
  return !(hi - lo >= minRangeCounts);
}

/** Largest |value| in data[i0..i1), ignoring NaN; 0 if none. */
export function peakAbs(data, i0 = 0, i1 = data.length) {
  let p = 0;
  for (let i = Math.max(0, i0); i < Math.min(data.length, i1); i++) {
    const v = Math.abs(data[i]);
    if (v > p) p = v;
  }
  return p;
}

/** "Nice" tick spacing (1, 2, 5 × 10^k) for about `target` ticks over span. */
export function niceStep(span, target = 8) {
  const raw = span / target;
  const p = 10 ** Math.floor(Math.log10(raw));
  const f = raw / p;
  return (f < 1.5 ? 1 : f < 3.5 ? 2 : f < 7.5 ? 5 : 10) * p;
}

// --- Quake Explorer additions: trend, RMS, signal-to-noise, downsampling, clipping ---

/**
 * Remove the best-fit straight line (least squares), in place. A slow drift
 * in a record (the sensor settling, temperature) looks like a very low note;
 * removing it first keeps it out of spectra and sound. NaN samples are left
 * as NaN and ignored by the fit.
 */
export function detrend(arr) {
  // Fit y = a + b*i using sums over the good samples.
  let n = 0;
  let si = 0;
  let sy = 0;
  let sii = 0;
  let siy = 0;
  for (let i = 0; i < arr.length; i++) {
    const y = arr[i];
    if (Number.isNaN(y)) continue;
    n++; si += i; sy += y; sii += i * i; siy += i * y;
  }
  if (n === 0) return arr;
  const denom = n * sii - si * si;
  const b = denom === 0 ? 0 : (n * siy - si * sy) / denom; // slope
  const a = (sy - b * si) / n; // intercept
  for (let i = 0; i < arr.length; i++) arr[i] -= a + b * i;
  return arr;
}

/**
 * Root-mean-square of data[i0..i1), ignoring NaN: the "typical size" of a
 * wiggle, sqrt(mean of the squares). NaN if there are no good samples.
 */
export function rms(data, i0 = 0, i1 = data.length) {
  let sum = 0;
  let n = 0;
  for (let i = Math.max(0, i0); i < Math.min(data.length, i1); i++) {
    const v = data[i];
    if (!Number.isNaN(v)) { sum += v * v; n++; }
  }
  return n ? Math.sqrt(sum / n) : NaN;
}

/** RMS about the window's own mean (so a DC offset is not counted as signal). */
function rmsAboutMean(data, i0, i1) {
  let sum = 0;
  let n = 0;
  for (let i = i0; i < i1; i++) if (!Number.isNaN(data[i])) { sum += data[i]; n++; }
  if (!n) return NaN;
  const m = sum / n;
  let ss = 0;
  for (let i = i0; i < i1; i++) if (!Number.isNaN(data[i])) ss += (data[i] - m) ** 2;
  return Math.sqrt(ss / n);
}

/**
 * Signal-to-noise ratio: RMS in the signal window divided by RMS in the noise
 * window (e.g. the quiet seconds before P). 1 means the quake is no bigger than
 * the background; 10 means it stands out clearly. Each window's own mean is
 * removed first, so raw counts with an offset work too. In decibels:
 * 20 * log10(snr).
 * @param {ArrayLike<number>} data
 * @param {number} sampleRate
 * @param {[number, number]} signalWin [start, end] in seconds from data[0]
 * @param {[number, number]} noiseWin [start, end] in seconds from data[0]
 * @returns {number} NaN if a window has no data
 */
export function snr(data, sampleRate, signalWin, noiseWin) {
  const idx = ([s0, s1]) => [
    Math.max(0, Math.round(s0 * sampleRate)),
    Math.min(data.length, Math.round(s1 * sampleRate)),
  ];
  const [a0, a1] = idx(signalWin);
  const [b0, b1] = idx(noiseWin);
  return rmsAboutMean(data, a0, a1) / rmsAboutMean(data, b0, b1);
}

/**
 * Low-pass filter kernel: a "windowed sinc". The sinc function is the ideal
 * low-pass filter (keeps everything below the cutoff, nothing above) but is
 * infinitely long; a Blackman window cuts it to a finite length with very
 * little leakage (high notes are reduced about 5000 times, -74 dB).
 * The narrower the change from "kept" to "removed", the longer the kernel:
 * about 5.5 * sampleRate / transitionHz taps. The weights add up to 1.
 * @param {number} sampleRate
 * @param {number} cutoffHz the half-amplitude point
 * @param {number} transitionHz width of the change from pass to stop
 * @returns {Float64Array} odd length, symmetric
 */
export function lowpassKernel(sampleRate, cutoffHz, transitionHz) {
  const half = Math.max(1, Math.ceil((5.5 * sampleRate) / transitionHz / 2));
  const n = 2 * half + 1;
  const fc = cutoffHz / sampleRate; // cycles per sample
  const h = new Float64Array(n);
  let sum = 0;
  for (let i = 0; i < n; i++) {
    const m = i - half;
    const sinc = m === 0 ? 2 * fc : Math.sin(2 * Math.PI * fc * m) / (Math.PI * m);
    const blackman = 0.42 + 0.5 * Math.cos((Math.PI * m) / half) + 0.08 * Math.cos((2 * Math.PI * m) / half);
    h[i] = sinc * blackman;
    sum += h[i];
  }
  for (let i = 0; i < n; i++) h[i] /= sum;
  return h;
}

/**
 * Filtered value at index i: the kernel centred on i, using only samples in
 * the gap-free run [a, b). Near the ends of a run, the weights that fall
 * outside are dropped and the rest re-scaled to add up to 1, so a steady
 * offset stays steady instead of sagging toward zero.
 */
function firAt(data, h, i, a, b) {
  const half = (h.length - 1) / 2;
  const k0 = Math.max(0, a - (i - half));
  const k1 = Math.min(h.length, b - (i - half));
  let acc = 0;
  let wsum = 0;
  for (let k = k0; k < k1; k++) {
    acc += h[k] * data[i - half + k];
    wsum += h[k];
  }
  return acc / wsum;
}

/**
 * Low-pass filter (windowed sinc, see lowpassKernel). Zero-phase: the kernel
 * is centred on each sample, so nothing is delayed or shifted. Unlike the
 * causal Butterworth used for picking, a little ringing can appear just before
 * a sharp arrival (up to half the kernel length), so use this for
 * downsampling, spectra and sound, not for picking first arrivals.
 * Each gap-free run is filtered on its own; gaps stay NaN.
 * @param {ArrayLike<number>} data
 * @param {number} sampleRate
 * @param {number} cutoffHz
 * @param {{transitionHz?: number}} [opt] default cutoffHz / 2
 * @returns {Float32Array}
 */
export function lowpassFIR(data, sampleRate, cutoffHz, opt = {}) {
  const h = lowpassKernel(sampleRate, cutoffHz, opt.transitionHz ?? cutoffHz / 2);
  const out = new Float32Array(data.length).fill(NaN);
  for (const [a, b] of contiguousRuns(data)) {
    for (let i = a; i < b; i++) out[i] = firAt(data, h, i, a, b);
  }
  return out;
}

/**
 * Downsample by a whole-number factor: keep every factor-th sample, after a
 * low-pass "anti-alias" filter. Without the filter, notes above the new
 * Nyquist frequency (new rate / 2) would not vanish: they would fold back and
 * pretend to be lower notes (aliasing, like a wagon wheel that seems to turn
 * backwards on film). The cutoff is 0.8 x the new Nyquist, and everything above
 * the new Nyquist is removed (-74 dB). Example: 60 minutes at 100 samples/s
 * becomes 20 samples/s, 5 times smaller, with the notes below 6 Hz unchanged.
 * Sample 0 keeps its time. Zero-phase; gaps stay NaN.
 * @param {ArrayLike<number>} data
 * @param {number} sampleRate
 * @param {number} factor whole number >= 1
 * @returns {{data: Float32Array, sampleRate: number}}
 */
export function decimate(data, sampleRate, factor) {
  if (!Number.isInteger(factor) || factor < 1) throw new Error('decimate: factor must be a whole number >= 1');
  if (factor === 1) return { data: Float32Array.from(data), sampleRate };
  const newNyquist = sampleRate / factor / 2;
  const h = lowpassKernel(sampleRate, 0.8 * newNyquist, 0.4 * newNyquist);
  const out = new Float32Array(Math.ceil(data.length / factor)).fill(NaN);
  for (const [a, b] of contiguousRuns(data)) {
    for (let j = Math.ceil(a / factor); j * factor < b; j++) out[j] = firAt(data, h, j * factor, a, b);
  }
  return { data: out, sampleRate: sampleRate / factor };
}

/**
 * Clipping check. A digitizer can only count so high: a 24-bit one tops out at
 * 8 388 607 counts. When a big nearby quake shakes the sensor harder than that,
 * the record is cut flat at the limit and the true peak is lost. Counts the
 * samples (raw counts, not filtered) at or beyond frac x limit.
 * @param {ArrayLike<number>} data raw counts
 * @param {{limit?: number, frac?: number}} [opt]
 * @returns {{clipped: boolean, count: number, firstIndex: number}} firstIndex -1 if none
 */
export function clipInfo(data, opt = {}) {
  const { limit = 8388607, frac = 0.98 } = opt;
  const level = frac * limit;
  let count = 0;
  let firstIndex = -1;
  for (let i = 0; i < data.length; i++) {
    if (Math.abs(data[i]) >= level) { // NaN compares false, so gaps are skipped
      count++;
      if (firstIndex < 0) firstIndex = i;
    }
  }
  return { clipped: count > 0, count, firstIndex };
}

/**
 * Clipping at any digitizer size. Older stations count with 16 bits and top
 * out at 32 767, so the 24-bit test above misses them (many Utah short-period
 * stations clipped this way in the 2020 Magna quake). A clipped record has
 * flat tops: its highest (or lowest) value repeats for several samples in a
 * row, which a real wave almost never does at 100 samples per second.
 * @param {ArrayLike<number>} data raw counts
 * @param {{minRun?: number, minCounts?: number}} [opt] minRun: samples in a row
 *   at the extreme value that count as a flat top; minCounts: ignore extremes
 *   smaller than this (quiet records repeat small whole numbers by chance)
 * @returns {{clipped: boolean, level: number, longestRun: number, firstIndex: number}}
 *   level = the count value where the record is cut (NaN if not clipped)
 */
export function flatTopInfo(data, opt = {}) {
  const { minRun = 3, minCounts = 1000 } = opt;
  let max = -Infinity;
  let min = Infinity;
  for (let i = 0; i < data.length; i++) {
    const v = data[i];
    if (v > max) max = v;
    if (v < min) min = v;
  }
  let longestRun = 0;
  let level = NaN;
  let firstIndex = -1;
  for (const ext of [max, min]) {
    if (!(Math.abs(ext) >= minCounts)) continue;
    let run = 0;
    for (let i = 0; i < data.length; i++) {
      run = data[i] === ext ? run + 1 : 0;
      if (run > longestRun) { longestRun = run; level = ext; }
      if (run === minRun && (firstIndex < 0 || i - minRun + 1 < firstIndex)) firstIndex = i - minRun + 1;
    }
  }
  const clipped = longestRun >= minRun;
  return { clipped, level: clipped ? level : NaN, longestRun, firstIndex: clipped ? firstIndex : -1 };
}

/** True if a raw-count record clipped: at the 24-bit limit, or flat-topped at any size. */
export function isClipped(data) {
  return clipInfo(data).clipped || flatTopInfo(data).clipped;
}
