// Cartoon P and S waves for the "Watch the waves" animation.
//
// A quake at the surface sends out a P wave and an S wave at the same moment.
// Each travels at a constant speed through one kind of rock, so a station at
// distance d feels P at d/Vp and S at d/Vs. The seismograms are made up
// (a small, fast P wiggle and a bigger, slower S wiggle, each fading away),
// but the arrival times are exact, so S - P times give back the true distance.
//
// Pure functions: no browser APIs, so they run in node tests too.

/** Arrival times (s after the quake) at a station distKm away. */
export function arrivals(distKm, vp, vs) {
  return { p: distKm / vp, s: distKm / vs };
}

/** Small seeded random-number generator (mulberry32): the same seed gives the same noise. */
export function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * One wave arrival: zero before it arrives, then a quick rise and a slow fade.
 * @param {number} dt seconds since the arrival
 * @param {number} freqHz how fast it wiggles
 * @param {number} decaySec how slowly it fades (the coda)
 */
export function wavelet(dt, freqHz, decaySec) {
  if (dt < 0) return 0;
  const rise = 1 - Math.exp(-dt / 0.12);
  const wobble = 0.7 + 0.3 * Math.sin(2 * Math.PI * freqHz * 0.31 * dt + 1);
  return rise * Math.exp(-dt / decaySec) * wobble * Math.sin(2 * Math.PI * freqHz * dt);
}

/**
 * A cartoon seismogram: background noise, then P, then a bigger S.
 * Waves are smaller at far stations (they spread out and lose energy).
 * @param {object} o
 * @param {number} o.distKm station distance from the quake
 * @param {number} o.vp P speed (km/s)
 * @param {number} o.vs S speed (km/s)
 * @param {number} o.durationSec length of the record
 * @param {number} [o.rate=50] samples per second
 * @param {number} [o.seed=1] noise seed
 * @returns {Float32Array} samples from t = 0 (the quake) onward
 */
export function synthTrace({ distKm, vp, vs, durationSec, rate = 50, seed = 1 }) {
  const n = Math.ceil(durationSec * rate) + 1;
  const out = new Float32Array(n);
  const { p, s } = arrivals(distKm, vp, vs);
  const amp = Math.min(1.6, (30 / Math.max(distKm, 5)) ** 0.8);
  const rand = mulberry32(seed);
  let noise = 0;
  for (let i = 0; i < n; i++) {
    const t = i / rate;
    noise = 0.55 * noise + 0.45 * (rand() * 2 - 1);
    out[i] = 0.04 * noise
      + amp * 0.35 * wavelet(t - p, 2.2, 1.4)
      + amp * 1.0 * wavelet(t - s, 1.2, 3.2);
  }
  return out;
}

/** Record length that shows every S arrival plus a fading tail, rounded up. */
export function durationFor(distancesKm, vs, tailSec = 8, roundSec = 5) {
  const lastS = Math.max(0, ...distancesKm) / vs;
  return Math.max(roundSec, Math.ceil((lastS + tailSec) / roundSec) * roundSec);
}
