// Frequencies in a seismogram: a small FFT, the amplitude spectrum and the
// spectrogram (short-time FFT). Pure functions on plain arrays, no browser APIs,
// so they run in node --test. NaN marks a missing sample, as everywhere in lib/.
//
// The big idea (Fourier): any wiggle can be built by adding sine waves of
// different frequencies. The FFT finds how much of each frequency is in a
// record. A spectrogram does that again and again in short, overlapping
// windows, so you can see the notes change with time: P and S arrive as bright
// columns, and the far-away quake is a low rumble because its high notes faded.

/** Smallest power of 2 that is >= n (the FFT below needs a power-of-2 length). */
export function nextPow2(n) {
  let p = 1;
  while (p < n) p *= 2;
  return p;
}

/**
 * Hann window: a smooth bump, 0 at both ends and 1 in the middle. Multiplying a
 * piece of record by it fades the ends to zero, so the FFT doesn't "hear" the
 * sudden start and stop of the piece as extra high notes (spectral leakage).
 * @param {number} n length
 * @returns {Float64Array}
 */
export function hann(n) {
  const w = new Float64Array(n);
  if (n === 1) { w[0] = 1; return w; }
  for (let i = 0; i < n; i++) w[i] = 0.5 * (1 - Math.cos((2 * Math.PI * i) / (n - 1)));
  return w;
}

/**
 * Fast Fourier Transform, in place (radix-2, iterative Cooley-Tukey).
 *
 * Input: a complex signal as two arrays, real parts `re` and imaginary parts
 * `im` (all zeros for a seismogram). Output, in the same arrays: X[k] for
 * k = 0..n-1, where X[k] says how much of the frequency k / n cycles per
 * sample is in the signal:  X[k] = sum over t of x[t] * e^(-2*pi*i*k*t/n).
 *
 * Doing that sum directly takes n*n steps. The FFT gets the same answer in
 * about n*log2(n) steps by splitting the problem in half again and again
 * (even samples, odd samples), solving the halves and combining them with
 * "butterflies". For n = 1024 that is ~10 000 steps instead of ~1 000 000.
 * @param {Float64Array} re real parts (length a power of 2)
 * @param {Float64Array} im imaginary parts (same length)
 */
export function fft(re, im) {
  const n = re.length;
  if (im.length !== n) throw new Error('fft: re and im must have the same length');
  if (n === 0 || (n & (n - 1)) !== 0) throw new Error(`fft: length ${n} is not a power of 2`);

  // 1. Put the samples in "bit-reversed" order (for n = 8, index 1 = 001
  //    swaps with 4 = 100). After this, each pair of neighbours is one
  //    2-point FFT waiting to be done, and so on up the levels.
  for (let i = 1, j = 0; i < n; i++) {
    let bit = n >> 1;
    for (; j & bit; bit >>= 1) j ^= bit; // add 1 to j, counting with the bits reversed
    j ^= bit;
    if (i < j) {
      [re[i], re[j]] = [re[j], re[i]];
      [im[i], im[j]] = [im[j], im[i]];
    }
  }

  // 2. Combine small FFTs into bigger ones: size 2, 4, 8, ... n. In each block,
  //    the top half (a) and bottom half (b) become a + w*b and a - w*b, where
  //    w = e^(-2*pi*i*j/size) is a "twiddle factor" (a point on the unit circle).
  for (let size = 2; size <= n; size *= 2) {
    const half = size / 2;
    const angleStep = (-2 * Math.PI) / size;
    for (let j = 0; j < half; j++) {
      const wr = Math.cos(angleStep * j);
      const wi = Math.sin(angleStep * j);
      for (let start = 0; start < n; start += size) {
        const a = start + j;
        const b = a + half;
        const tr = wr * re[b] - wi * im[b]; // w * x[b], complex multiply
        const ti = wr * im[b] + wi * re[b];
        re[b] = re[a] - tr;
        im[b] = im[a] - ti;
        re[a] += tr;
        im[a] += ti;
      }
    }
  }
}

/**
 * Decibels: 10 * log10(power). Every 10 dB is 10 times more power, so a
 * colour scale in dB can show quiet noise and a loud quake on one picture.
 * `tiny` keeps log10(0) from being -Infinity.
 * @param {number} power
 * @param {number} [tiny=1e-20]
 */
export function toDb(power, tiny = 1e-20) {
  return 10 * Math.log10(power + tiny);
}

/** Mean of the non-NaN values in data[i0..i1), and how many there were. */
function meanOfGood(data, i0, i1) {
  let sum = 0;
  let count = 0;
  for (let i = i0; i < i1; i++) {
    const v = data[i];
    if (!Number.isNaN(v)) { sum += v; count++; }
  }
  return { mean: count ? sum / count : 0, count };
}

/**
 * Amplitude spectrum of a whole record: how big each frequency is.
 *
 * Steps: remove the mean, fade the ends with a Hann window, pad with zeros to
 * a power of 2, FFT, keep the positive frequencies (0 up to the Nyquist
 * frequency, sampleRate / 2; the negative ones are a mirror image).
 *
 * Scaled so that a steady sine wave of amplitude A shows a peak of about A
 * (up to ~15% lower when its frequency falls between two bins).
 *
 * Missing samples (NaN): if at most `maxGapFraction` (10%) of the record is
 * missing, the gaps are set to zero after the mean is removed, so they add no
 * notes of their own, only make the peaks a little smaller. If more is
 * missing, the spectrum would mostly describe the gaps, so this throws an Error
 * instead; the caller should show a message (or use stft, which skips gappy
 * windows).
 * @param {ArrayLike<number>} data
 * @param {number} sampleRate samples per second
 * @param {{taper?: 'hann'|'none', maxGapFraction?: number}} [opt]
 * @returns {{freqs: Float64Array, amp: Float64Array, df: number, nfft: number, gapFraction: number}}
 */
export function amplitudeSpectrum(data, sampleRate, opt = {}) {
  const { taper = 'hann', maxGapFraction = 0.1 } = opt;
  const n = data.length;
  if (n < 2) throw new Error('amplitudeSpectrum: need at least 2 samples');
  const { mean, count } = meanOfGood(data, 0, n);
  const gapFraction = 1 - count / n;
  if (gapFraction > maxGapFraction) {
    throw new Error(`Too much of this record is missing (${Math.round(gapFraction * 100)}%) for a spectrum`);
  }
  const nfft = nextPow2(n);
  const re = new Float64Array(nfft); // zero-padded beyond n
  const im = new Float64Array(nfft);
  const w = taper === 'hann' ? hann(n) : new Float64Array(n).fill(1);
  let wSum = 0;
  for (let i = 0; i < n; i++) {
    const v = data[i];
    re[i] = Number.isNaN(v) ? 0 : (v - mean) * w[i];
    wSum += w[i];
  }
  fft(re, im);
  const nF = nfft / 2 + 1;
  const df = sampleRate / nfft;
  const freqs = new Float64Array(nF);
  const amp = new Float64Array(nF);
  for (let k = 0; k < nF; k++) {
    freqs[k] = k * df;
    // x2 because the energy is shared with the mirror-image negative frequency;
    // 0 Hz and the Nyquist frequency have no mirror twin.
    const twoSided = k === 0 || k === nfft / 2 ? 1 : 2;
    amp[k] = (twoSided * Math.hypot(re[k], im[k])) / wSum;
  }
  return { freqs, amp, df, nfft, gapFraction };
}

/**
 * Default spectrogram settings, by kind of record.
 *
 * - `local`: a Utah quake at 100 samples/s, a minute or two long. 2.56 s
 *   windows (256 samples) give 0.39 Hz frequency steps, fine enough for the
 *   1-20 Hz notes of a small local quake, and short enough to show P and S as
 *   separate bright columns a few seconds apart. 75% overlap (a new column
 *   every 0.64 s) makes the picture smooth. Up to 25 Hz: above that a small
 *   local quake is mostly below the noise.
 * - `distant`: a 60-minute record of a far-away quake, downsampled to about
 *   20 samples/s. 51.2 s windows (1024 samples) resolve the 20-second surface
 *   waves (0.05 Hz) with steps of 0.02 Hz; a column every 12.8 s still gives
 *   ~280 columns for the hour. 0.02-2 Hz covers surface waves (20-50 s) up to
 *   the P wave's 1 Hz; best on a log frequency axis.
 */
export const STFT_PRESETS = Object.freeze({
  local: Object.freeze({ windowSec: 2.56, overlap: 0.75, fMin: 0, fMax: 25 }),
  distant: Object.freeze({ windowSec: 51.2, overlap: 0.75, fMin: 0.02, fMax: 2 }),
});

/**
 * The preset that suits a record: `distant` for records longer than 10 minutes,
 * `local` otherwise. fMax never goes above the Nyquist frequency.
 * @param {number} sampleRate
 * @param {number} durationSec
 */
export function suggestStft(sampleRate, durationSec) {
  const p = durationSec > 600 ? STFT_PRESETS.distant : STFT_PRESETS.local;
  return { ...p, fMax: Math.min(p.fMax, sampleRate / 2) };
}

/**
 * stft()'s window length, FFT length and frequency step (Hz) for these settings.
 * @param {number} sampleRate
 * @param {{nfft?: number, windowSec?: number}} [opt] as for stft()
 */
export function stftSize(sampleRate, opt = {}) {
  const { windowSec = STFT_PRESETS.local.windowSec } = opt;
  const nwin = Math.max(2, Math.round(opt.nfft ?? windowSec * sampleRate));
  const nfft = nextPow2(nwin);
  return { nwin, nfft, df: sampleRate / nfft };
}

/**
 * An fMin for stft() that makes the spectrogram reach down to f Hz: the frequency step
 * at or just below f, never 0 Hz (the record's mean). Use it when a band edge at f will be
 * drawn on the picture: stft() keeps only steps at or above fMin, so with fMin = f the
 * picture can stop a step above f (fMin 0.02 Hz with steps of 0.0195 Hz starts at 0.039 Hz).
 * @param {number} f Hz
 * @param {number} sampleRate
 * @param {{nfft?: number, windowSec?: number}} [opt] as for stft()
 */
export function fMinReaching(f, sampleRate, opt = {}) {
  const { df } = stftSize(sampleRate, opt);
  return Math.max(1, Math.floor(f / df + 1e-9)) * df;
}

/**
 * Spectrogram (short-time FFT): the record is cut into overlapping windows;
 * each window gets its own power spectrum, one column of the picture.
 *
 * Window length: `nfft` samples if given, else `windowSec` (default 2.56 s;
 * see STFT_PRESETS). If that is not a power of 2, the window is zero-padded up
 * to one. Step between windows: `hop` samples if given, else
 * window length x (1 - overlap) (overlap default 0.75).
 *
 * Each window has its own mean removed and a Hann taper. Power is a one-sided
 * power spectral density (units² per Hz, e.g. counts²/Hz), so a steady noise
 * level reads the same whatever the window length. Returned in dB (toDb).
 * A window with any missing sample gives a column of NaN ("no data").
 *
 * @param {ArrayLike<number>} data
 * @param {number} sampleRate
 * @param {{nfft?: number, windowSec?: number, hop?: number, overlap?: number,
 *   fMin?: number, fMax?: number}} [opt] fMin/fMax keep only that band (Hz)
 * @returns {{nT: number, nF: number, times: Float64Array, freqs: Float64Array,
 *   power: Float32Array, dbMin: number, dbMax: number, nwin: number, nfft: number,
 *   hop: number, df: number, sampleRate: number}}
 *   times: seconds from data[0] to each window's centre; power: dB, row t (time)
 *   holds nF values, so power[t * nF + f] is time t, frequency freqs[f].
 */
export function stft(data, sampleRate, opt = {}) {
  const { overlap = 0.75 } = opt;
  const { nwin, nfft, df } = stftSize(sampleRate, opt);
  const hop = Math.max(1, Math.round(opt.hop ?? nwin * (1 - overlap)));
  const kMin = Math.max(0, Math.ceil((opt.fMin ?? 0) / df - 1e-9));
  const kMax = Math.min(nfft / 2, Math.floor((opt.fMax ?? sampleRate / 2) / df + 1e-9));
  const nF = Math.max(0, kMax - kMin + 1);
  const nT = data.length >= nwin ? Math.floor((data.length - nwin) / hop) + 1 : 0;

  const times = new Float64Array(nT);
  const freqs = new Float64Array(nF);
  for (let f = 0; f < nF; f++) freqs[f] = (kMin + f) * df;
  const power = new Float32Array(nT * nF);

  const w = hann(nwin);
  let w2 = 0;
  for (let i = 0; i < nwin; i++) w2 += w[i] * w[i];
  const scale = 1 / (sampleRate * w2); // turns |X|^2 into power per Hz
  const re = new Float64Array(nfft);
  const im = new Float64Array(nfft);
  let dbMin = Infinity;
  let dbMax = -Infinity;

  for (let t = 0; t < nT; t++) {
    const s = t * hop;
    times[t] = (s + (nwin - 1) / 2) / sampleRate; // centre of the window
    const { mean, count } = meanOfGood(data, s, s + nwin);
    if (count < nwin) { power.fill(NaN, t * nF, (t + 1) * nF); continue; } // a gap: no data
    re.fill(0);
    im.fill(0);
    for (let i = 0; i < nwin; i++) re[i] = (data[s + i] - mean) * w[i];
    fft(re, im);
    for (let f = 0; f < nF; f++) {
      const k = kMin + f;
      const twoSided = k === 0 || k === nfft / 2 ? 1 : 2;
      const db = toDb(twoSided * scale * (re[k] * re[k] + im[k] * im[k]));
      power[t * nF + f] = db;
      if (db < dbMin) dbMin = db;
      if (db > dbMax) dbMax = db;
    }
  }
  if (dbMin === Infinity) { dbMin = NaN; dbMax = NaN; }
  return { nT, nF, times, freqs, power, dbMin, dbMax, nwin, nfft, hop, df, sampleRate };
}

/**
 * A colour range for showing a spectrogram: from a low percentile of the dB
 * values (so a few near-silent pixels don't stretch the scale) up to the
 * loudest pixel, but never more than `maxRangeDb` deep. NaN values are skipped.
 * @param {ArrayLike<number>} db e.g. stft(...).power
 * @param {{lowPercentile?: number, maxRangeDb?: number}} [opt]
 * @returns {{lo: number, hi: number}} NaN if there are no values
 */
export function dbRange(db, opt = {}) {
  const { lowPercentile = 5, maxRangeDb = 80 } = opt;
  const vals = [];
  for (let i = 0; i < db.length; i++) if (Number.isFinite(db[i])) vals.push(db[i]);
  if (!vals.length) return { lo: NaN, hi: NaN };
  vals.sort((a, b) => a - b);
  const hi = vals[vals.length - 1];
  const p = vals[Math.min(vals.length - 1, Math.floor((lowPercentile / 100) * vals.length))];
  const lo = Math.max(p, hi - maxRangeDb);
  return { lo: lo < hi ? lo : hi - 1, hi };
}
