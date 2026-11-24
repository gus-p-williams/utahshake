// Computer picks of wave arrivals. Pure functions.
//
// The AIC picker (Maeda 1985) asks: if the record inside a search window is
// split into "before" and "after" at sample k, how different are the two
// parts? Before an arrival there is only background noise (small, steady
// wiggles); after it the wiggles are bigger. The Akaike Information Criterion
//
//   AIC(k) = k · ln(variance before k) + (N − k − 1) · ln(variance after k)
//
// is smallest where the split best separates quiet from loud: the onset.
// It needs a window that holds one arrival and some quiet before it, which is
// why the search window comes from expected speeds.

/**
 * Onset time by the AIC method inside [fromSec, toSec].
 * @param {ArrayLike<number>} data filtered record (no NaN inside the window)
 * @param {number} sampleRate samples per second
 * @param {number} startSec time of data[0] on the same clock as fromSec/toSec
 *   (for example seconds after the quake's origin time)
 * @param {number} fromSec start of the search window
 * @param {number} toSec end of the search window
 * @returns {{tSec:number, snr:number}|null} snr = rms of 2 s after the onset /
 *   rms of up to 5 s before it (inside the window); null if the window is too
 *   short or has gaps
 */
export function aicPick(data, sampleRate, startSec, fromSec, toSec) {
  const sr = sampleRate;
  const a = Math.max(0, Math.round((fromSec - startSec) * sr));
  const b = Math.min(data.length, Math.round((toSec - startSec) * sr));
  const n = b - a;
  if (n < 2 * sr) return null;
  const pre = new Float64Array(n + 1);
  const pre2 = new Float64Array(n + 1);
  for (let i = 0; i < n; i++) {
    const v = data[a + i];
    if (!Number.isFinite(v)) return null;
    pre[i + 1] = pre[i] + v;
    pre2[i + 1] = pre2[i] + v * v;
  }
  // Variance of samples [i, j) from running sums: E[x²] − E[x]².
  const variance = (i, j) => {
    const m = (pre[j] - pre[i]) / (j - i);
    return Math.max(1e-30, (pre2[j] - pre2[i]) / (j - i) - m * m);
  };
  const edge = Math.max(2, Math.round(0.25 * sr));
  let best = Infinity;
  let k0 = -1;
  for (let k = edge; k < n - edge; k++) {
    const aic = k * Math.log(variance(0, k)) + (n - k - 1) * Math.log(variance(k, n));
    if (aic < best) { best = aic; k0 = k; }
  }
  if (k0 < 0) return null;
  const after = variance(k0, Math.min(n, k0 + Math.round(2 * sr)));
  const before = variance(Math.max(0, k0 - Math.round(5 * sr)), k0);
  return { tSec: startSec + (a + k0) / sr, snr: Math.sqrt(after / before) };
}

/**
 * Search windows for a local or regional quake, seconds after origin.
 * P: from a little before an 8.5 km/s wave to just after a 6 km/s one (so
 * the first arrival, Pg or Pn, is the first big change). S: from well after
 * P to just after a 3.2 km/s wave.
 */
export function searchWindow(phase, distKm, pSec) {
  if (phase === 'P') return [Math.max(0, distKm / 8.5 - 6), distKm / 6.0 + 1.5];
  const p = pSec ?? distKm / 6.1;
  const sExpected = distKm / 3.45;
  return [p + 0.6 * (sExpected - p), distKm / 3.2 + 1.5];
}
