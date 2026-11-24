// Sums of sine waves for "Build a wiggle" (the cartoon on the Frequencies page).
//
// Fourier's idea: any wiggle can be built by adding sine waves of different
// frequencies and sizes. Here a wave is {freq (Hz), size, phase (radians)}:
//   y(t) = size · sin(2π · freq · t + phase)
// and a wiggle is the sum of a few of them. The page draws the sum and its
// spectrum, which it gets from the same FFT as Quake Explorer (spectral.js).
//
// The record the FFT sees is RECORD.n samples at RECORD.sampleRate: 16 s, so
// its frequency steps are 1/16 = 0.0625 Hz. Every multiple of 0.5 Hz (the
// slider steps) is then a whole number of cycles in the record, and the
// spectrum shows each wave as one clean bar exactly as tall as its size.
//
// Pure functions: no browser APIs, so they run in node --test.

export const RECORD = Object.freeze({ sampleRate: 128, n: 2048 }); // 16 s, steps of 0.0625 Hz

/** Value of a sum of waves at time t (seconds). */
export function wiggleAt(t, waves) {
  let y = 0;
  for (const w of waves) y += w.size * Math.sin(2 * Math.PI * w.freq * t + (w.phase || 0));
  return y;
}

/**
 * The sum of waves sampled like a seismometer: n samples, sampleRate per second.
 * @param {Array<{freq:number, size:number, phase?:number}>} waves
 * @returns {Float64Array}
 */
export function sampleWiggle(waves, n = RECORD.n, sampleRate = RECORD.sampleRate) {
  const out = new Float64Array(n);
  for (let i = 0; i < n; i++) out[i] = wiggleAt(i / sampleRate, waves);
  return out;
}

/** Repeatable pseudo-random numbers in [0, 1) (so the noise is the same every time). */
export function randomNumbers(seed = 1) {
  let s = seed >>> 0;
  return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 2 ** 32; };
}

/**
 * Noise as a jumble of many small waves: one at every frequency step from fMin
 * to fMax, each with a random size (0 to maxSize) and a random phase. Each note
 * is tiny, but there are hundreds of them, so together they make a ragged
 * wiggle. Deterministic for a given seed.
 * @returns {Array<{freq:number, size:number, phase:number}>}
 */
export function noiseWaves({ fMin = 0.5, fMax = 25, df = RECORD.sampleRate / RECORD.n, maxSize = 0.03, seed = 7 } = {}) {
  const rand = randomNumbers(seed);
  const out = [];
  for (let k = Math.ceil(fMin / df - 1e-9); k * df <= fMax + 1e-9; k++) {
    out.push({ freq: k * df, size: maxSize * rand(), phase: 2 * Math.PI * rand() });
  }
  return out;
}

/** True if a frequency is inside a band [lo, hi] (Hz); no band keeps everything. */
export const inBand = (freq, band) => !band || (freq >= band[0] && freq <= band[1]);

/**
 * Q of the crust under Utah (the Basin and Range): Q = 235 · f^0.56, fitted to
 * 1–5 Hz waves by Benz, Frankel and Boore (1997, BSSA 87, 606–619). Higher
 * notes have a higher Q, but it grows more slowly than the number of cycles.
 * @param {number} freq Hz
 */
export const utahQ = (freq) => 235 * freq ** 0.56;

/**
 * How much of a wave's size is left after tSec of travel, from the energy lost
 * as heat: e^(−π f t / Q). f·t is the number of cycles on the way.
 * @param {number} freq Hz
 * @param {number} tSec seconds of travel
 * @param {number} [q] quality factor (default: utahQ(freq))
 */
export function fadeAfter(freq, tSec, q = utahQ(freq)) {
  return Math.exp((-Math.PI * freq * tSec) / q);
}
