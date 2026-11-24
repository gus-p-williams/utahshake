// How strong the background shaking is at each frequency: the power spectrum, and the
// "probabilistic power spectral density" (PPSD) that piles up a month of them.
//
// Steps for one hour of record (after McNamara and Buland, 2004, the method EarthScope and
// most networks use):
//   1. Cut the hour into overlapping pieces, take each piece's power spectrum (FFT of the
//      piece faded at both ends), and average them (Welch's method). Units: counts² per Hz.
//   2. Divide by the station's response squared (response.js) to get ground velocity, then
//      multiply by (2πf)² to get acceleration, (m/s²)² per Hz: the units of Peterson's
//      reference curves (noise-models.js).
//   3. Average over one octave around each of a fixed set of frequencies (8 per octave) and
//      write it in decibels: 10·log10(power). Every 10 dB is 10× the power, about 3.2× the
//      size of the shaking; 20 dB is 10× the size.
// A PPSD counts, for each frequency, how many hours fell in each 1 dB bin: the dark band is
// the station's usual level, the faint top is the rare noisy hours (storms, quakes, work).
// Pure functions; NaN marks a missing sample.
import { fft } from './spectral.js';

/** Periodic Hann window (the usual choice for averaged spectra). */
function hannPeriodic(n) {
  const w = new Float64Array(n);
  for (let i = 0; i < n; i++) w[i] = 0.5 * (1 - Math.cos((2 * Math.PI * i) / n));
  return w;
}

/**
 * Welch power spectrum in units² per Hz (one-sided): Hann-windowed pieces of nfft samples
 * (a power of 2), `overlap` apart (0.5 = half), each with its straight-line trend removed.
 * Pieces with a missing sample are skipped.
 * @param {ArrayLike<number>} data
 * @param {number} sampleRate
 * @param {number} nfft
 * @param {number} [overlap=0.5]
 * @returns {{freqs: Float64Array, psd: Float64Array, segments: number}}
 */
export function welchPsd(data, sampleRate, nfft, overlap = 0.5) {
  if (nfft & (nfft - 1)) throw new Error('welchPsd: nfft must be a power of 2');
  const win = hannPeriodic(nfft);
  const winPower = win.reduce((s, w) => s + w * w, 0);
  const step = Math.max(1, Math.round(nfft * (1 - overlap)));
  const nF = nfft / 2 + 1;
  const psd = new Float64Array(nF);
  const re = new Float64Array(nfft);
  const im = new Float64Array(nfft);
  // least-squares line through x = 0..n-1 needs these sums of x
  const sx = (nfft * (nfft - 1)) / 2;
  const sxx = ((nfft - 1) * nfft * (2 * nfft - 1)) / 6;
  let segments = 0;
  for (let s = 0; s + nfft <= data.length; s += step) {
    let sy = 0, sxy = 0, bad = false;
    for (let i = 0; i < nfft; i++) {
      const y = data[s + i];
      if (Number.isNaN(y)) { bad = true; break; }
      sy += y; sxy += i * y;
    }
    if (bad) continue;
    const slope = (nfft * sxy - sx * sy) / (nfft * sxx - sx * sx);
    const icpt = (sy - slope * sx) / nfft;
    for (let i = 0; i < nfft; i++) { re[i] = (data[s + i] - icpt - slope * i) * win[i]; im[i] = 0; }
    fft(re, im);
    for (let k = 0; k < nF; k++) {
      const p = (re[k] * re[k] + im[k] * im[k]) / (sampleRate * winPower);
      psd[k] += k === 0 || k === nfft / 2 ? p : 2 * p;
    }
    segments++;
  }
  if (segments) for (let k = 0; k < nF; k++) psd[k] /= segments;
  const freqs = Float64Array.from({ length: nF }, (_, k) => (k * sampleRate) / nfft);
  return { freqs, psd, segments };
}

/**
 * Frequencies `perOctave` to an octave (8: each 9% above the last), lined up on 1 Hz,
 * from fMin to fMax.
 */
export function octaveFreqs(fMin, fMax, perOctave = 8) {
  const out = [];
  for (let k = Math.ceil(perOctave * Math.log2(fMin)); 2 ** (k / perOctave) <= fMax * (1 + 1e-9); k++) {
    out.push(2 ** (k / perOctave));
  }
  return out;
}

/**
 * Average of `values` (power, not dB) over `width` octaves centered on each frequency in
 * `centers` (from fc / 2^(width/2) to fc · 2^(width/2)). NaN where no value falls inside.
 * @param {ArrayLike<number>} freqs
 * @param {ArrayLike<number>} values
 * @param {number[]} centers
 * @param {number} [width=1]
 */
export function octaveAverage(freqs, values, centers, width = 1) {
  const half = 2 ** (width / 2);
  return centers.map((fc) => {
    let s = 0, n = 0;
    for (let k = 0; k < freqs.length; k++) {
      if (freqs[k] >= fc / half && freqs[k] <= fc * half && Number.isFinite(values[k])) { s += values[k]; n++; }
    }
    return n ? s / n : NaN;
  });
}

/**
 * One hour's noise spectrum, ready to compare with Peterson's curves: dB re 1 (m/s²)²/Hz
 * at each of `centers`, from a velocity sensor's record in counts.
 * @param {ArrayLike<number>} data counts
 * @param {number} sampleRate
 * @param {(f:number) => number} countsPerMps the response amplitude (response.js)
 * @param {number[]} centers frequencies (Hz), e.g. octaveFreqs(0.02, 40)
 * @param {{nfft?: number, minSegments?: number}} [opt]
 * @returns {number[]|null} null when too much of the record is missing
 */
export function accelSpectrumDb(data, sampleRate, countsPerMps, centers, opt = {}) {
  const { nfft = 16384, minSegments = 20 } = opt;
  const { freqs, psd, segments } = welchPsd(data, sampleRate, nfft);
  if (segments < minSegments) return null;
  const acc = Array.from(psd, (p, k) => (k ? (p / countsPerMps(freqs[k]) ** 2) * (2 * Math.PI * freqs[k]) ** 2 : NaN));
  return octaveAverage(freqs, acc, centers).map((p) => 10 * Math.log10(p));
}

/**
 * A PPSD: for each frequency, how many spectra fell in each dB bin.
 * @param {(number[]|null)[]} spectra dB values, one array per hour (null = skipped)
 * @param {{minDb?: number, maxDb?: number, stepDb?: number}} [opt]
 * @returns {{counts: number[][], minDb: number, stepDb: number, total: number}}
 *   counts[freqIndex][bin]; bin b covers minDb + b·stepDb up to the next bin
 */
export function ppsdHistogram(spectra, opt = {}) {
  const { minDb = -200, maxDb = -50, stepDb = 1 } = opt;
  const good = spectra.filter(Boolean);
  const nBins = Math.round((maxDb - minDb) / stepDb);
  const nF = good.length ? good[0].length : 0;
  const counts = Array.from({ length: nF }, () => new Array(nBins).fill(0));
  for (const row of good) {
    row.forEach((db, j) => {
      if (!Number.isFinite(db)) return;
      const b = Math.min(nBins - 1, Math.max(0, Math.floor((db - minDb) / stepDb)));
      counts[j][b]++;
    });
  }
  return { counts, minDb, stepDb, total: good.length };
}

/**
 * The dB level below which a fraction q (0–1) of the hours fall, at each frequency of a
 * PPSD (q = 0.5: the median hour). Returns the center of the bin where q is reached.
 */
export function ppsdPercentile(hist, q) {
  return hist.counts.map((bins) => {
    const n = bins.reduce((a, b) => a + b, 0);
    if (!n) return NaN;
    let c = 0;
    for (let b = 0; b < bins.length; b++) {
      c += bins[b];
      if (c >= q * n) return hist.minDb + (b + 0.5) * hist.stepDb;
    }
    return NaN;
  });
}
