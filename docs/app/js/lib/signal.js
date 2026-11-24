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
