// Phone Bench: what a device's browser really delivers from its motion sensor and microphone.
// Pure functions on arrays of time stamps (ms) and readings (m/s²), plus a made-up phone for
// tests and the page's simulate mode. Used by the Phone Bench page (docs/app/phone-bench/)
// for trial T1 (planning/review-phone-recorder.md, section 2.5).
//
// Readings are {t, x, y, z}: t in ms on any clock (only differences matter), x/y/z the
// accelerationIncludingGravity components in m/s².
//
// API:
//   quantile(sorted, p)             p-quantile of a sorted array (linear interpolation).
//   timing(times, opts?)            readings per second, gaps, jitter, dropped readings.
//   valueStep(values, opts?)        the step between values (if they sit on a grid); are they all on a 0.1 grid?
//   stepReport(readings)            valueStep on each axis, combined.
//   noise(values)                   mean, rms about the mean, min, max.
//   repeats(readings)               consecutive readings identical on all three axes.
//   flicker(values)                 share of readings off the most common value (a rounding phone at rest).
//   detectTaps(readings, rest, opts?)  bursts that stand out from the resting level.
//   tapThreshold(restRms3)          the level a burst must pass to count as a tap.
//   tapRule(restReadings)           resting value, threshold and (for rounding phones) resting range.
//   audioRate(blocks)               measured audio samples per second from {t, frames} blocks.
//   dbfs(x)                         level in dB relative to full scale (1.0).
//   makeRng(seed)                   small seeded random number generator (uniform and normal).
//   makeTake(opts?)                 a made-up take: readings from a simulated phone.
//   makeAudioBlocks(opts?)          made-up audio blocks from a simulated microphone.

/** p-quantile (0..1) of an ascending array, interpolating between neighbors. */
export function quantile(sorted, p) {
  if (!sorted.length) return NaN;
  const i = (sorted.length - 1) * p;
  const lo = Math.floor(i);
  const hi = Math.ceil(i);
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (i - lo);
}

const mean = (a) => a.reduce((s, v) => s + v, 0) / a.length;
const sd = (a, m = mean(a)) => Math.sqrt(a.reduce((s, v) => s + (v - m) ** 2, 0) / a.length);

/**
 * Timing of a series of readings.
 * - rate: readings per second, (n − 1) over the time from the first to the last.
 * - gaps between consecutive time stamps: median, min, max.
 * - dropped: gaps longer than dropFactor × the median (a reading or more went missing);
 *   missing: about how many readings those gaps lost.
 * - jitter: standard deviation of the gaps that are not drops (timer irregularity), and
 *   p01Gap–p99Gap, the range of the middle 98% of those gaps.
 * - nonPositive: gaps of zero or less (repeated or backward time stamps).
 * - wholeMs: every time stamp is a whole number of ms (a coarse clock: about 0.5 ms of jitter
 *   comes from that alone).
 */
export function timing(times, { dropFactor = 1.5 } = {}) {
  const n = times.length;
  if (n < 3) return { n, rate: NaN, seconds: n ? 0 : NaN };
  const gaps = [];
  for (let i = 1; i < n; i++) gaps.push(times[i] - times[i - 1]);
  const sorted = [...gaps].sort((a, b) => a - b);
  const medianGap = quantile(sorted, 0.5);
  const span = times[n - 1] - times[0];
  const isDrop = (g) => medianGap > 0 && g > dropFactor * medianGap;
  const normal = sorted.filter((g) => !isDrop(g));
  const drops = gaps.filter(isDrop);
  return {
    n,
    seconds: span / 1000,
    rate: span > 0 ? ((n - 1) * 1000) / span : NaN,
    medianGap,
    meanGap: span / (n - 1),
    p01Gap: quantile(normal, 0.01),
    p99Gap: quantile(normal, 0.99),
    minGap: sorted[0],
    maxGap: sorted[sorted.length - 1],
    jitter: normal.length ? sd(normal) : NaN,
    dropped: drops.length,
    missing: drops.reduce((s, g) => s + Math.max(1, Math.round(g / medianGap) - 1), 0),
    nonPositive: gaps.filter((g) => g <= 0).length,
    wholeMs: times.every((t) => Math.abs(t - Math.round(t)) < 1e-6),
  };
}

/**
 * Size of the steps between readings on one axis.
 * - distinct: how many different values there are (values closer than tol count as one).
 * - minSpacing: the smallest spacing between two distinct values (null if there is only one).
 * - step: minSpacing, if the values sit on a regular grid: at least 90% of the spacings between
 *   neighboring distinct values are whole multiples of it (within 5%). Otherwise null: values
 *   that vary smoothly have no fixed step, and their smallest spacing is just the closest pair.
 * - onTenthGrid: every value is a whole multiple of 0.1 m/s² (within tol), as Chrome's
 *   rounding makes them. Values like 9.800000000000001 count as on the grid.
 */
export function valueStep(values, { tol = 1e-6, grid = 0.1 } = {}) {
  const vals = values.filter(Number.isFinite);
  const sorted = [...vals].sort((a, b) => a - b);
  const distinct = [];
  for (const v of sorted) if (!distinct.length || v - distinct[distinct.length - 1] > tol) distinct.push(v);
  const spacings = [];
  for (let i = 1; i < distinct.length; i++) spacings.push(distinct[i] - distinct[i - 1]);
  const minSpacing = spacings.length ? spacings.reduce((a, b) => Math.min(a, b)) : null;
  const onMultiple = (d) => Math.abs(d / minSpacing - Math.round(d / minSpacing)) < 0.05;
  const regular = spacings.length > 0 && spacings.filter(onMultiple).length >= 0.9 * spacings.length;
  const onTenthGrid = vals.length > 0 && vals.every((v) => Math.abs(v / grid - Math.round(v / grid)) * grid <= tol);
  return { n: vals.length, distinct: distinct.length, minSpacing, step: regular ? minSpacing : null, onTenthGrid };
}

/**
 * valueStep on x, y and z, combined:
 * - changed: some axis took more than one value;
 * - step: the smallest regular step of the three axes (null if none has one);
 * - minSpacing: the smallest spacing on any axis;
 * - rounded: every value on every axis is a multiple of 0.1 m/s² (needs ten readings, so a
 *   handful of values can't land on the grid by chance).
 */
export function stepReport(readings) {
  const axes = {};
  for (const k of ['x', 'y', 'z']) axes[k] = valueStep(readings.map((r) => r[k]));
  const list = Object.values(axes);
  const pick = (key) => {
    const v = list.map((a) => a[key]).filter((s) => s !== null);
    return v.length ? Math.min(...v) : null;
  };
  return {
    axes,
    step: pick('step'),
    minSpacing: pick('minSpacing'),
    rounded: Math.min(...list.map((a) => a.n)) >= 10 && list.every((a) => a.onTenthGrid),
    changed: list.some((a) => a.distinct > 1),
  };
}

/** Mean, root mean square about the mean (the noise), min and max of one axis. */
export function noise(values) {
  const vals = values.filter(Number.isFinite);
  if (!vals.length) return { n: 0, mean: NaN, rms: NaN, min: NaN, max: NaN };
  const m = mean(vals);
  let min = Infinity;
  let max = -Infinity;
  for (const v of vals) { if (v < min) min = v; if (v > max) max = v; }
  return { n: vals.length, mean: m, rms: sd(vals, m), min, max };
}

/**
 * Share (0..1) of the values that differ from the most common one (values closer than tol count
 * as equal). On a phone that rounds, at rest: 0 when an axis holds one value, more when its
 * resting value sits near the edge of a step and it flickers between two.
 */
export function flicker(values, { tol = 1e-6 } = {}) {
  const vals = values.filter(Number.isFinite);
  if (!vals.length) return NaN;
  const counts = new Map();
  for (const v of vals) {
    const key = Math.round(v / tol);
    counts.set(key, (counts.get(key) || 0) + 1);
  }
  let most = 0;
  for (const c of counts.values()) if (c > most) most = c;
  return 1 - most / vals.length;
}

/** Number of readings identical to the one before on all three axes. */
export function repeats(readings) {
  let count = 0;
  for (let i = 1; i < readings.length; i++) {
    const a = readings[i - 1];
    const b = readings[i];
    if (a.x === b.x && a.y === b.y && a.z === b.z) count++;
  }
  return count;
}

/**
 * The level (m/s², distance from the resting value) a burst must pass to count as a tap:
 * 6 times the resting noise (its three axes combined), but never below 0.05 m/s², half of
 * Chrome's 0.1 m/s² step, so that a phone whose readings never change at rest still needs a
 * full step to see a tap.
 */
export const tapThreshold = (restRms3) => Math.max(6 * (Number.isFinite(restRms3) ? restRms3 : 0), 0.05);

/**
 * Taps: bursts where the reading moves away from the resting value rest = {x, y, z} by more
 * than threshold (m/s², the length of the difference on all three axes). With `range`
 * ({min: {x, y, z}, max: {x, y, z}}), what must pass the threshold is instead how far the
 * reading lies outside that resting range on each axis (combined the same way). Readings over
 * the threshold less than gapMs apart belong to one tap. Returns [{t, peak, readings}]: t is
 * the time of the first reading over the threshold, peak the largest distance from `rest` in
 * the tap.
 */
export function detectTaps(readings, rest, { threshold = 0.05, gapMs = 250, range = null } = {}) {
  const outside = (k, v) => Math.max(0, v - range.max[k], range.min[k] - v);
  const taps = [];
  let cur = null;
  for (const r of readings) {
    const d = Math.hypot(r.x - rest.x, r.y - rest.y, r.z - rest.z);
    const test = range ? Math.hypot(outside('x', r.x), outside('y', r.y), outside('z', r.z)) : d;
    if (!(test > threshold)) continue;
    if (cur && r.t - cur.last <= gapMs) {
      cur.peak = Math.max(cur.peak, d);
      cur.readings++;
      cur.last = r.t;
    } else {
      cur = { t: r.t, peak: d, readings: 1, last: r.t };
      taps.push(cur);
    }
  }
  return taps.map(({ t, peak, readings: k }) => ({ t, peak, readings: k }));
}

/**
 * How to tell a tap from the readings at rest: {mean, noise, rounded, threshold, range}.
 * - A phone that rounds to 0.1 m/s² (Chrome) reads the same value at rest, except on an axis
 *   whose resting value sits near a rounding boundary: there it flickers between two steps.
 *   So for such a phone a tap is a reading outside the resting range (min to max on each
 *   axis) by a step: range = that range, threshold 0.05 m/s².
 * - Otherwise a tap is a reading more than tapThreshold(noise) from the resting mean (range null).
 */
export function tapRule(rest) {
  const n = { x: noise(rest.map((r) => r.x)), y: noise(rest.map((r) => r.y)), z: noise(rest.map((r) => r.z)) };
  const mean = { x: n.x.mean, y: n.y.mean, z: n.z.mean };
  const rounded = stepReport(rest).rounded;
  if (rounded) {
    return { mean, noise: n, rounded, threshold: 0.05,
      range: { min: { x: n.x.min, y: n.y.min, z: n.z.min }, max: { x: n.x.max, y: n.y.max, z: n.z.max } } };
  }
  return { mean, noise: n, rounded, threshold: tapThreshold(Math.hypot(n.x.rms, n.y.rms, n.z.rms)), range: null };
}

/**
 * Measured audio rate from blocks {t (ms, when the block arrived), frames (samples since the
 * block before)}: the frames after the first block over the time from the first to the last.
 */
export function audioRate(blocks) {
  if (blocks.length < 2) return NaN;
  const span = blocks[blocks.length - 1].t - blocks[0].t;
  const frames = blocks.slice(1).reduce((s, b) => s + b.frames, 0);
  return span > 0 ? (frames * 1000) / span : NaN;
}

/** Level in dB relative to full scale: 1.0 is 0 dBFS, 0.5 is −6 dBFS. */
export const dbfs = (x) => (x > 0 ? 20 * Math.log10(x) : -Infinity);

/** A small seeded random number generator (mulberry32), with uniform() and normal(). */
export function makeRng(seed = 1) {
  let a = seed >>> 0;
  const uniform = () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const normal = () => Math.sqrt(-2 * Math.log(1 - uniform())) * Math.cos(2 * Math.PI * uniform());
  return { uniform, normal };
}

/**
 * Kinds of made-up phone for makeTake: what the sources say Chrome on Android and Safari on iOS do.
 * The Android phone's y sits near a rounding boundary (0.15), so at rest it flickers between two
 * steps on that axis, as most rounding phones do on at least one axis.
 */
export const SIM_PHONES = {
  android: { rate: 60, jitterMs: 0.35, dropEvery: 400, step: 0.1, noise: 0.008, gravity: [0.1, 0.16, 9.81], timeStep: 0 },
  iphone: { rate: 60, jitterMs: 0.5, dropEvery: 600, step: 0, noise: 0.012, gravity: [0.05, -0.12, -9.81], timeStep: 1 },
};

/**
 * A made-up take: readings {t, x, y, z} at about `rate` per second for `seconds`, starting at t0
 * (ms). The phone lies still (gravity plus normal noise of size `noise` on each axis), except
 * for taps [{t (ms from t0), peak (m/s²)}]: a 15 Hz burst that dies away in about 0.1 s, mostly
 * on z. Time stamps wobble by jitterMs; one reading in dropEvery goes missing; values are
 * rounded to `step` (0 = not rounded) and time stamps to timeStep ms (0 = not rounded).
 */
export function makeTake({ phone = 'android', seconds = 40, t0 = 0, taps = [], seed = 7, ...over } = {}) {
  const p = { ...SIM_PHONES[phone], ...over };
  const rng = makeRng(seed);
  const dt = 1000 / p.rate;
  const round = (v) => (p.step ? Math.round(v / p.step) * p.step : v);
  const out = [];
  for (let i = 0; i * dt <= seconds * 1000; i++) {
    if (p.dropEvery && i > 0 && i % p.dropEvery === 0) continue;
    let tt = i * dt + p.jitterMs * rng.normal();
    if (p.timeStep) tt = Math.round(tt / p.timeStep) * p.timeStep;
    let bump = 0;
    for (const tap of taps) {
      const s = (i * dt - tap.t) / 1000;
      if (s >= 0 && s < 0.6) bump += tap.peak * Math.exp(-s / 0.1) * Math.cos(2 * Math.PI * 15 * s);
    }
    const [gx, gy, gz] = p.gravity;
    out.push({
      t: t0 + tt,
      x: round(gx + 0.25 * bump + p.noise * rng.normal()),
      y: round(gy + 0.15 * bump + p.noise * rng.normal()),
      z: round(gz + bump + p.noise * rng.normal()),
    });
  }
  return out;
}

/**
 * Made-up microphone blocks {t (ms), frames, rms, peak} as the page's audio meter reports them:
 * `rate` samples per second, one block every blockMs (± jitterMs), quiet noise at quietRms, and a
 * clap (peak clapPeak) in the block at clapAt seconds.
 */
export function makeAudioBlocks({ rate = 48000, seconds = 5, blockMs = 100, jitterMs = 4, quietRms = 0.003,
  clapAt = 2, clapPeak = 0.6, seed = 3, t0 = 0 } = {}) {
  const rng = makeRng(seed);
  const blocks = [];
  let done = 0;
  for (let k = 1; k * blockMs <= seconds * 1000; k++) {
    const due = Math.round((k * blockMs * rate) / 1000);
    const frames = due - done;
    done = due;
    const clap = Math.abs(k * blockMs - clapAt * 1000) < blockMs / 2;
    blocks.push({
      t: t0 + k * blockMs + jitterMs * rng.normal(),
      frames,
      rms: clap ? clapPeak / 4 : quietRms * (1 + 0.2 * rng.normal()),
      peak: clap ? clapPeak : quietRms * 3,
    });
  }
  return blocks;
}
