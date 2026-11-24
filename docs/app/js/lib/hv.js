// How deep is the soft ground? The H/V ratio of quiet-time shaking.
//
// The ground never stops trembling a little (ocean hum, wind, traffic far away). On soft
// ground (sand, gravel, clay filling a valley) sitting on much stiffer rock, some of that
// trembling gets trapped in the soft layer and rings, like a plucked string, at one
// frequency: the layer's resonance, f0. At that frequency the ground rocks side to side
// much more than it moves up and down. So we divide the horizontal shaking by the vertical
// shaking (H/V) at every frequency and look for a peak. On hard rock there is nothing to
// ring, and H/V stays near 1.
//
// The peak gives the layer's thickness H when we know how fast shear (S) waves travel in
// it (Vs): the layer rings when it holds a quarter of a wavelength, λ = 4H, and v = fλ, so
//     f0 = Vs / (4H)      and      H = Vs / (4 f0).
//
// Steps (the usual recipe, after the SESAME guidelines, 2004):
//   1. Cut a quiet record (night) into windows of about 80 s, for all three sensors.
//   2. For each window and sensor: remove the trend, fade the ends (a Tukey taper), take the
//      amplitude spectrum (FFT) and smooth it with the Konno–Ohmachi window (b = 40), which
//      is equally wide at every frequency on a log scale.
//   3. Horizontal = √((N² + E²) / 2), the two horizontal sensors combined; H/V = that ÷ Z.
//   4. Drop windows with a sudden burst (a footstep, a car) or unusually loud shaking.
//   5. Combine the windows' H/V curves with the geometric mean (the average of the logs), and
//      give the spread as a factor (one standard deviation of the logs).
// Pure functions on plain arrays; NaN marks a missing sample. The three records must be in
// the same units (divide each by its own sensitivity first) and start at the same time.
import { fft } from './spectral.js';

/** n frequencies evenly spaced on a log scale from fMin to fMax. */
export function logFreqs(fMin, fMax, n) {
  return Float64Array.from({ length: n }, (_, i) => fMin * (fMax / fMin) ** (n === 1 ? 0 : i / (n - 1)));
}

/** Tukey window: 1 in the middle, the outer `fraction` of the samples faded with a cosine. */
export function tukeyWindow(n, fraction = 0.1) {
  const m = (fraction * n) / 2;
  return Float64Array.from({ length: n }, (_, i) => {
    if (i < m) return 0.5 * (1 - Math.cos((Math.PI * i) / m));
    if (i > n - 1 - m) return 0.5 * (1 - Math.cos((Math.PI * (n - 1 - i)) / m));
    return 1;
  });
}

/**
 * Konno–Ohmachi smoothing weights: for each center frequency fc, the weight of each FFT bin
 * f is (sin x / x)⁴ with x = b·log10(f / fc), normalized to sum to 1. Bins farther than
 * 3 lobes (|x| > 3π) are left out: their weight is below 1/10,000 of the center's.
 * @param {ArrayLike<number>} binFreqs frequencies of the spectrum's bins (Hz)
 * @param {ArrayLike<number>} centers frequencies to smooth onto (Hz)
 * @param {number} [b=40] bandwidth: bigger = narrower smoothing
 * @returns {{k0:number, w:Float64Array}[]} per center, the first bin used and the weights
 */
export function konnoOhmachiWeights(binFreqs, centers, b = 40) {
  const reach = (3 * Math.PI) / b; // in log10 units
  return Array.from(centers, (fc) => {
    const lo = fc * 10 ** -reach;
    const hi = fc * 10 ** reach;
    let k0 = -1;
    const ws = [];
    for (let k = 0; k < binFreqs.length; k++) {
      const f = binFreqs[k];
      if (!(f > 0) || f < lo || f > hi) continue;
      if (k0 < 0) k0 = k;
      const x = b * Math.log10(f / fc);
      ws[k - k0] = Math.abs(x) < 1e-9 ? 1 : (Math.sin(x) / x) ** 4;
    }
    const w = Float64Array.from(ws, (v) => v ?? 0);
    const sum = w.reduce((a, v) => a + v, 0);
    for (let i = 0; i < w.length; i++) w[i] = sum ? w[i] / sum : NaN;
    return { k0: Math.max(0, k0), w };
  });
}

/** Apply konnoOhmachiWeights to an amplitude spectrum. */
export function applyWeights(weights, amps) {
  return Float64Array.from(weights, ({ k0, w }) => {
    if (!w.length) return NaN;
    let v = 0;
    for (let i = 0; i < w.length; i++) v += w[i] * amps[k0 + i];
    return v;
  });
}

/** Konno–Ohmachi smoothing of one amplitude spectrum onto `centers` (see the weights above). */
export function konnoOhmachi(binFreqs, amps, centers, b = 40) {
  return applyWeights(konnoOhmachiWeights(binFreqs, centers, b), amps);
}

/** Horizontal amplitude from the two horizontal sensors: √((N² + E²) / 2), point by point. */
export function horizontal(n, e) {
  return Float64Array.from(n, (a, i) => Math.sqrt((a * a + e[i] * e[i]) / 2));
}

function detrended(seg) {
  const n = seg.length;
  let sx = 0, sy = 0, sxx = 0, sxy = 0;
  for (let i = 0; i < n; i++) { sx += i; sy += seg[i]; sxx += i * i; sxy += i * seg[i]; }
  const slope = (n * sxy - sx * sy) / (n * sxx - sx * sx);
  const icpt = (sy - slope * sx) / n;
  return Float64Array.from(seg, (y, i) => y - icpt - slope * i);
}

const rmsOf = (a) => Math.sqrt(a.reduce((s, v) => s + v * v, 0) / a.length);

/** Largest 1-second RMS in the window ÷ the window's RMS: big when a short burst is inside. */
function burstiness(d, sampleRate) {
  const w = Math.max(1, Math.round(sampleRate));
  let mx = 0;
  for (let i = 0; i + w <= d.length; i += w) mx = Math.max(mx, rmsOf(d.subarray(i, i + w)));
  return mx / rmsOf(d);
}

/**
 * H/V for each window of three records (vertical z, horizontals n and e; same units, same
 * start). Windows are `windowSec` long (rounded up to a power of 2 samples), not overlapping;
 * a window with a missing sample in any record is skipped.
 * @returns {{start:number, hv:Float64Array, V:Float64Array, H:Float64Array,
 *   rms:number[], burst:number}[]} start = first sample; rms per record (z, n, e)
 */
export function hvWindows(z, n, e, sampleRate, { windowSec = 80, centers, b = 40, taper = 0.1 } = {}) {
  let len = 1;
  while (len < windowSec * sampleRate) len <<= 1;
  const win = tukeyWindow(len, taper);
  const binFreqs = Float64Array.from({ length: len / 2 + 1 }, (_, k) => (k * sampleRate) / len);
  const weights = konnoOhmachiWeights(binFreqs, centers, b);
  const re = new Float64Array(len);
  const im = new Float64Array(len);
  const spectrum = (d) => {
    for (let i = 0; i < len; i++) { re[i] = d[i] * win[i]; im[i] = 0; }
    fft(re, im);
    return applyWeights(weights, Float64Array.from({ length: len / 2 + 1 }, (_, k) => Math.hypot(re[k], im[k])));
  };
  const total = Math.min(z.length, n.length, e.length);
  const out = [];
  for (let s = 0; s + len <= total; s += len) {
    const segs = [z, n, e].map((a) => Float64Array.from(a.subarray ? a.subarray(s, s + len) : Array.prototype.slice.call(a, s, s + len)));
    if (segs.some((g) => g.some(Number.isNaN))) continue;
    const d = segs.map(detrended);
    const [V, N, E] = d.map(spectrum);
    const H = horizontal(N, E);
    out.push({ start: s, hv: Float64Array.from(H, (h, i) => h / V[i]), V, H, rms: d.map(rmsOf),
      burst: Math.max(...d.map((x) => burstiness(x, sampleRate))) });
  }
  return out;
}

/**
 * Keep the quiet, steady windows: drop a window if any record has a 1-second burst more than
 * `burstMax` × its RMS, or an RMS more than `rmsFactor` × that record's median over all windows.
 */
export function rejectWindows(windows, { burstMax = 4, rmsFactor = 2 } = {}) {
  if (!windows.length) return [];
  const med = [0, 1, 2].map((c) => {
    const v = windows.map((w) => w.rms[c]).sort((a, b) => a - b);
    const m = v.length >> 1;
    return v.length % 2 ? v[m] : (v[m - 1] + v[m]) / 2;
  });
  return windows.filter((w) => w.burst < burstMax && w.rms.every((r, c) => r < rmsFactor * med[c]));
}

/**
 * Combine curves (e.g. each window's H/V): geometric mean, and the spread as a factor
 * exp(standard deviation of the logs), so the band is mean ÷ spread to mean × spread.
 * @param {ArrayLike<number>[]} curves all the same length
 * @returns {{mean: Float64Array, spread: Float64Array}}
 */
export function combineCurves(curves) {
  const nF = curves[0].length;
  const m = curves.length;
  const mean = new Float64Array(nF);
  const spread = new Float64Array(nF);
  for (let i = 0; i < nF; i++) {
    let s = 0;
    for (const c of curves) s += Math.log(c[i]);
    const mu = s / m;
    let ss = 0;
    for (const c of curves) ss += (Math.log(c[i]) - mu) ** 2;
    mean[i] = Math.exp(mu);
    spread[i] = Math.exp(Math.sqrt(ss / Math.max(1, m - 1)));
  }
  return { mean, spread };
}

/** The highest point of a curve between fMin and fMax: {f0, a0, index}. */
export function findPeak(freqs, curve, { fMin = 0, fMax = Infinity } = {}) {
  let j = -1;
  for (let i = 0; i < freqs.length; i++) {
    if (freqs[i] >= fMin && freqs[i] <= fMax && Number.isFinite(curve[i]) && (j < 0 || curve[i] > curve[j])) j = i;
  }
  return j < 0 ? { f0: NaN, a0: NaN, index: -1 } : { f0: freqs[j], a0: curve[j], index: j };
}

/**
 * How steady the peak is from window to window: each window's own peak between f0/2 and
 * 2·f0, then their mean and standard deviation (Hz).
 */
export function peakSpread(freqs, curves, f0) {
  const peaks = curves.map((c) => findPeak(freqs, c, { fMin: f0 / 2, fMax: 2 * f0 }).f0);
  const mean = peaks.reduce((a, v) => a + v, 0) / peaks.length;
  const sd = Math.sqrt(peaks.reduce((a, v) => a + (v - mean) ** 2, 0) / Math.max(1, peaks.length - 1));
  return { mean, sd };
}

/** Resonance of a soft layer H meters thick with shear-wave speed Vs (m/s): f0 = Vs / (4H). */
export const f0FromThickness = (vs, h) => vs / (4 * h);

/** Thickness of the soft layer from its resonance: H = Vs / (4 f0). */
export const thicknessFromF0 = (vs, f0) => vs / (4 * f0);

/**
 * The average shear-wave speed a wave "feels" going down to `toDepth`: the depth divided by
 * the time it takes (not the plain average of the speeds, because slow layers take longer).
 * @param {number[]} tops depth of the top of each layer (m), increasing, starting at 0
 * @param {number[]} speeds Vs of each layer (m/s)
 * @param {number} toDepth
 */
export function averageVs(tops, speeds, toDepth) {
  let t = 0;
  for (let i = 0; i < tops.length && tops[i] < toDepth; i++) {
    const bottom = Math.min(toDepth, i + 1 < tops.length ? tops[i + 1] : Infinity);
    t += (bottom - tops[i]) / speeds[i];
  }
  return toDepth / t;
}
