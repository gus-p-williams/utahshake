// Spectra for the figure scripts: a small radix-2 FFT, Welch power spectrum, spectrogram,
// band RMS and downsampling. Pure functions on plain arrays (NaN marks missing samples).
// Tested in tests/spectra.test.js.

/** In-place radix-2 FFT of (re, im); length must be a power of 2. */
export function fft(re, im) {
  const n = re.length;
  if (n & (n - 1)) throw new Error('fft length must be a power of 2');
  for (let i = 1, j = 0; i < n; i++) { // bit-reversal permutation
    let bit = n >> 1;
    for (; j & bit; bit >>= 1) j ^= bit;
    j ^= bit;
    if (i < j) { [re[i], re[j]] = [re[j], re[i]]; [im[i], im[j]] = [im[j], im[i]]; }
  }
  for (let len = 2; len <= n; len <<= 1) {
    const ang = (-2 * Math.PI) / len;
    const wr = Math.cos(ang);
    const wi = Math.sin(ang);
    for (let i = 0; i < n; i += len) {
      let cr = 1;
      let ci = 0;
      for (let k = 0; k < len / 2; k++) {
        const a = i + k;
        const b = a + len / 2;
        const tr = re[b] * cr - im[b] * ci;
        const ti = re[b] * ci + im[b] * cr;
        re[b] = re[a] - tr; im[b] = im[a] - ti;
        re[a] += tr; im[a] += ti;
        [cr, ci] = [cr * wr - ci * wi, cr * wi + ci * wr];
      }
    }
  }
}

const hann = (n) => Float64Array.from({ length: n }, (_, i) => 0.5 * (1 - Math.cos((2 * Math.PI * i) / n)));

/**
 * One-sided power spectral density of one segment (mean and linear trend removed, Hann
 * window), in units² per Hz. Returns Float64Array of nfft/2 + 1 values; null if the
 * segment has missing samples.
 */
function segmentPsd(data, start, nfft, sampleRate, win, winPower) {
  const re = new Float64Array(nfft);
  const im = new Float64Array(nfft);
  // least-squares line through the segment
  let sx = 0, sy = 0, sxx = 0, sxy = 0;
  for (let i = 0; i < nfft; i++) {
    const y = data[start + i];
    if (Number.isNaN(y)) return null;
    sx += i; sy += y; sxx += i * i; sxy += i * y;
  }
  const slope = (nfft * sxy - sx * sy) / (nfft * sxx - sx * sx);
  const icpt = (sy - slope * sx) / nfft;
  for (let i = 0; i < nfft; i++) re[i] = (data[start + i] - icpt - slope * i) * win[i];
  fft(re, im);
  const out = new Float64Array(nfft / 2 + 1);
  const norm = 1 / (sampleRate * winPower);
  for (let k = 0; k <= nfft / 2; k++) {
    const p = (re[k] * re[k] + im[k] * im[k]) * norm;
    out[k] = k === 0 || k === nfft / 2 ? p : 2 * p;
  }
  return out;
}

/**
 * Welch power spectrum: average of Hann-windowed segments of length nfft (power of 2)
 * with 50% overlap; segments with missing samples are skipped.
 * @returns {{freqs: Float64Array, psd: Float64Array, segments: number}} psd in units²/Hz
 */
export function welch(data, sampleRate, nfft, overlap = 0.5) {
  const win = hann(nfft);
  const winPower = win.reduce((s, w) => s + w * w, 0);
  const step = Math.max(1, Math.round(nfft * (1 - overlap)));
  const psd = new Float64Array(nfft / 2 + 1);
  let segments = 0;
  for (let s = 0; s + nfft <= data.length; s += step) {
    const p = segmentPsd(data, s, nfft, sampleRate, win, winPower);
    if (!p) continue;
    for (let k = 0; k < p.length; k++) psd[k] += p[k];
    segments++;
  }
  if (segments) for (let k = 0; k < psd.length; k++) psd[k] /= segments;
  const freqs = Float64Array.from({ length: nfft / 2 + 1 }, (_, k) => (k * sampleRate) / nfft);
  return { freqs, psd, segments };
}

/**
 * Spectrogram: power spectra of Hann-windowed segments of length nfft, one every `step`
 * samples. Column c covers samples [c*step, c*step + nfft); its centre time is
 * (c*step + nfft/2) / sampleRate seconds after data[0]. Columns with missing samples are null.
 * @returns {{freqs: Float64Array, columns: (Float64Array|null)[], times: number[]}}
 */
export function spectrogram(data, sampleRate, nfft, step) {
  const win = hann(nfft);
  const winPower = win.reduce((s, w) => s + w * w, 0);
  const columns = [];
  const times = [];
  for (let s = 0; s + nfft <= data.length; s += step) {
    columns.push(segmentPsd(data, s, nfft, sampleRate, win, winPower));
    times.push((s + nfft / 2) / sampleRate);
  }
  const freqs = Float64Array.from({ length: nfft / 2 + 1 }, (_, k) => (k * sampleRate) / nfft);
  return { freqs, columns, times };
}

/** Root mean square of data[i0..i1), ignoring NaN; NaN if fewer than half the samples exist. */
export function rms(data, i0 = 0, i1 = data.length) {
  let s = 0;
  let n = 0;
  for (let i = Math.max(0, i0); i < Math.min(data.length, i1); i++) {
    const v = data[i];
    if (!Number.isNaN(v)) { s += v * v; n++; }
  }
  return n >= (i1 - i0) / 2 ? Math.sqrt(s / n) : NaN;
}

/**
 * RMS in consecutive windows of `windowSec`, after removing each window's mean.
 * @returns {Float64Array} one value per window (NaN where too much is missing)
 */
export function windowedRms(data, sampleRate, windowSec) {
  const w = Math.round(windowSec * sampleRate);
  const out = new Float64Array(Math.floor(data.length / w));
  for (let k = 0; k < out.length; k++) {
    let s = 0, n = 0;
    for (let i = k * w; i < (k + 1) * w; i++) if (!Number.isNaN(data[i])) { s += data[i]; n++; }
    const mean = n ? s / n : 0;
    let ss = 0;
    for (let i = k * w; i < (k + 1) * w; i++) if (!Number.isNaN(data[i])) ss += (data[i] - mean) ** 2;
    out[k] = n >= w / 2 ? Math.sqrt(ss / n) : NaN;
  }
  return out;
}

/** Median of the finite values in an array (NaN if none). */
export function median(values) {
  const v = Array.from(values).filter(Number.isFinite).sort((a, b) => a - b);
  if (!v.length) return NaN;
  const m = v.length >> 1;
  return v.length % 2 ? v[m] : (v[m - 1] + v[m]) / 2;
}
