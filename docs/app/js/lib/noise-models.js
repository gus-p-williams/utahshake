// How quiet can the Earth be? Peterson's reference curves for seismic background noise.
//
// Jon Peterson (USGS) gathered noise spectra from 75 stations around the world and drew two
// lines around them: the New Low Noise Model (NLNM), quieter than almost any station ever
// gets, and the New High Noise Model (NHNM), an average of the noisy stations. Every noise
// plot since compares a station with these two lines.
//
// Source: Peterson, J. (1993), Observations and modeling of seismic background noise,
// U.S. Geological Survey Open-File Report 93-322, Tables 3 and 4,
// https://pubs.usgs.gov/publication/ofr93322
//
// Each model is a chain of straight lines on a log-period axis: between period P[i] and
// P[i+1] (seconds), the acceleration power is A[i] + B[i] * log10(period) decibels
// relative to 1 (m/s²)²/Hz. The models are defined from 0.1 s to 100,000 s, so above 10 Hz
// there is no reference line.

/** NLNM breakpoints [period s, A, B] (OFR 93-322 Table 3); the last row only ends the range. */
export const NLNM = Object.freeze([
  [0.10, -162.36, 5.64], [0.17, -166.7, 0.00], [0.40, -170.00, -8.30], [0.80, -166.40, 28.90],
  [1.24, -168.60, 52.48], [2.40, -159.98, 29.81], [4.30, -141.10, 0.00], [5.00, -71.36, -99.77],
  [6.00, -97.26, -66.49], [10.00, -132.18, -31.57], [12.00, -205.27, 36.16], [15.60, -37.65, -104.33],
  [21.90, -114.37, -47.10], [31.60, -160.58, -16.28], [45.00, -187.50, 0.00], [70.00, -216.47, 15.70],
  [101.00, -185.00, 0.00], [154.00, -168.34, -7.61], [328.00, -217.43, 11.90], [600.00, -258.28, 26.60],
  [10000.00, -346.88, 48.75], [100000.00, NaN, NaN],
].map(Object.freeze));

/** NHNM breakpoints [period s, A, B] (OFR 93-322 Table 4); the last row only ends the range. */
export const NHNM = Object.freeze([
  [0.10, -108.73, -17.23], [0.22, -150.34, -80.50], [0.32, -122.31, -23.87], [0.80, -116.85, 32.51],
  [3.80, -108.48, 18.08], [4.60, -74.66, -32.95], [6.30, 0.66, -127.18], [7.90, -93.37, -22.42],
  [15.40, 73.54, -162.98], [20.00, -151.52, 10.01], [354.80, -206.66, 31.63], [100000.00, NaN, NaN],
].map(Object.freeze));

/**
 * A noise model's acceleration power at one period, in dB relative to 1 (m/s²)²/Hz.
 * NaN outside 0.1–100,000 s (that is, above 10 Hz or below 0.00001 Hz).
 * @param {ReadonlyArray<ReadonlyArray<number>>} model NLNM or NHNM
 * @param {number} periodSec
 */
export function modelDb(model, periodSec) {
  for (let i = 0; i < model.length - 1; i++) {
    const [p0, a, b] = model[i];
    const p1 = model[i + 1][0];
    // the last segment includes its end (100,000 s); the others hand their end to the next
    if (periodSec >= p0 && (periodSec < p1 || (i === model.length - 2 && periodSec === p1))) {
      return a + b * Math.log10(periodSec);
    }
  }
  return NaN;
}

/** The same at a frequency (Hz): period = 1 / frequency. */
export const modelDbAtFreq = (model, freqHz) => modelDb(model, 1 / freqHz);

/**
 * Acceleration power (dB re 1 (m/s²)²/Hz) to velocity power (dB re 1 (m/s)²/Hz).
 * Velocity = acceleration / (2πf), so the power drops by 20·log10(2πf) dB
 * (Peterson's NLNM_vel = NLNM_acc + 20·log10(P / 2π)).
 */
export const accelToVelocityDb = (accDb, freqHz) => accDb - 20 * Math.log10(2 * Math.PI * freqHz);
