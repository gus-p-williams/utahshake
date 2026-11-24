// Repeats: lining up many records of the same kind of event and adding them up (a stack),
// and measuring how alike two records are (cross-correlation).
//
// Stacking: line up the records so the events start at the same moment, then average them.
// The event's waves are the same in every record, so they survive the average; the
// background noise is different every time, so it partly cancels. Averaging N records
// shrinks random noise by √N: 4 records halve it, 100 records cut it to a tenth. That is
// how a seismometer far away can still "see" a small, repeated event.
//
// Cross-correlation: slide one record past the other and, at each shift (lag), ask how well
// they match: +1 means the same wiggles (whatever their size), 0 means no relation, −1 means
// mirror images. The best lag also says how much later one arrived than the other.
// Pure functions on plain arrays; NaN marks a missing sample.
import { rms } from './signal.js';
import { mulberry32 } from './wave-sim.js';

/**
 * A window of a record around a moment: from `beforeSec` before `atMs` to `afterSec` after
 * it. Samples outside the record are NaN.
 * @param {{data: ArrayLike<number>, startMs: number, sampleRate: number}} trace
 * @param {number} atMs the moment to line up on (e.g. the P arrival)
 * @param {number} beforeSec
 * @param {number} afterSec
 * @returns {Float64Array}
 */
export function windowAround(trace, atMs, beforeSec, afterSec) {
  const sr = trace.sampleRate;
  const i0 = Math.round(((atMs - trace.startMs) / 1000 - beforeSec) * sr);
  const n = Math.round((beforeSec + afterSec) * sr);
  const out = new Float64Array(n);
  for (let k = 0; k < n; k++) {
    const i = i0 + k;
    out[k] = i >= 0 && i < trace.data.length ? trace.data[i] : NaN;
  }
  return out;
}

/**
 * Divide a window by the RMS of its own background noise (samples noiseFrom..noiseTo),
 * so every record has noise of typical size 1. Then "signal-to-noise 2" simply means the
 * waves are about twice the size of the noise.
 * @returns {{data: Float64Array, noiseRms: number}}
 */
export function scaleToNoise(data, noiseFrom, noiseTo) {
  const noiseRms = rms(data, noiseFrom, noiseTo);
  return { data: Float64Array.from(data, (v) => v / noiseRms), noiseRms };
}

/**
 * The stack: the average of equal-length windows, sample by sample. Where some windows
 * are missing a sample (NaN), the average uses the others; NaN only where all are missing.
 * @param {ArrayLike<number>[]} windows
 * @returns {Float64Array}
 */
export function stackMean(windows) {
  if (!windows.length) return new Float64Array(0);
  const n = windows[0].length;
  const out = new Float64Array(n);
  for (let k = 0; k < n; k++) {
    let s = 0;
    let c = 0;
    for (const w of windows) {
      const v = w[k];
      if (!Number.isNaN(v)) { s += v; c++; }
    }
    out[k] = c ? s / c : NaN;
  }
  return out;
}

/**
 * How the noise of a stack shrinks as more records are added: for each N, the RMS of the
 * average of N noise windows, averaged over `draws` random choices of which N (the same
 * seed gives the same answer). With independent noise of size 1 it follows 1/√N.
 * @param {ArrayLike<number>[]} noiseWindows equal length, each scaled to noise RMS 1
 * @param {number[]} counts the values of N to try (at most the number of windows)
 * @param {{draws?: number, seed?: number}} [opt]
 * @returns {{n: number, rms: number}[]}
 */
export function stackNoiseByCount(noiseWindows, counts, opt = {}) {
  const { draws = 200, seed = 42 } = opt;
  const rand = mulberry32(seed);
  const total = noiseWindows.length;
  return counts.map((n) => {
    if (n > total) throw new Error(`stackNoiseByCount: ${n} is more than the ${total} windows`);
    const tries = n === total ? 1 : draws;
    let sum = 0;
    for (let d = 0; d < tries; d++) {
      // a random choice of n windows: shuffle the first n places (Fisher–Yates)
      const idx = Array.from({ length: total }, (_, i) => i);
      for (let i = 0; i < n; i++) {
        const j = i + Math.floor(rand() * (total - i));
        [idx[i], idx[j]] = [idx[j], idx[i]];
      }
      sum += rms(stackMean(idx.slice(0, n).map((i) => noiseWindows[i])));
    }
    return { n, rms: sum / tries };
  });
}

/**
 * Normalized cross-correlation of a short `template` against a longer `record`, for every
 * lag from −maxLag to +maxLag samples. Lag L compares the template with record samples
 * start+L .. start+L+template.length; positive L means the match is later in the record.
 * Each window's mean is removed first (Pearson correlation), so the answer is between −1
 * and +1 and doesn't depend on the records' sizes. A window with a missing sample gives NaN.
 * @param {ArrayLike<number>} template
 * @param {ArrayLike<number>} record
 * @param {number} start index in `record` where the template lines up at lag 0
 * @param {number} maxLag in samples
 * @returns {{lags: Int32Array, cc: Float64Array, best: {lag: number, cc: number}}}
 *   best: the lag with the highest correlation (NaN cc if none could be computed)
 */
export function crossCorrelation(template, record, start, maxLag) {
  const n = template.length;
  let ta = 0;
  for (let k = 0; k < n; k++) ta += template[k];
  const tMean = ta / n;
  let tss = 0;
  const t = new Float64Array(n);
  for (let k = 0; k < n; k++) { t[k] = template[k] - tMean; tss += t[k] * t[k]; }
  const lags = new Int32Array(2 * maxLag + 1);
  const cc = new Float64Array(2 * maxLag + 1);
  let best = { lag: 0, cc: NaN };
  for (let j = 0; j <= 2 * maxLag; j++) {
    const lag = j - maxLag;
    lags[j] = lag;
    const i0 = start + lag;
    if (i0 < 0 || i0 + n > record.length || Number.isNaN(tMean)) { cc[j] = NaN; continue; }
    let s = 0, ss = 0, st = 0, bad = false;
    for (let k = 0; k < n; k++) {
      const v = record[i0 + k];
      if (Number.isNaN(v)) { bad = true; break; }
      s += v; ss += v * v; st += t[k] * v;
    }
    if (bad) { cc[j] = NaN; continue; }
    // Σ t·(v − mean v) = Σ t·v, because Σ t = 0
    const vss = ss - (s * s) / n;
    cc[j] = tss > 0 && vss > 0 ? st / Math.sqrt(tss * vss) : NaN;
    if (Number.isFinite(cc[j]) && !(cc[j] <= best.cc)) best = { lag, cc: cc[j] };
  }
  return { lags, cc, best };
}
