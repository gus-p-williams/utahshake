// Travel times for a simple Earth: one uniform crust over a faster mantle.
// Pure functions.
//
// Two ways for a wave to reach a station:
//
//   direct (Pg, Sg)  straight through the crust from the quake (depth h) to the
//                    station at distance d:   t = √(d² + h²) / v1
//   head   (Pn, Sn)  down to the top of the mantle (the Moho) at the critical
//                    angle, along the Moho at the mantle speed v2, and back up:
//                    t = d / v2 + (2H − h) · cos(ic) / v1,   sin(ic) = v1 / v2
//
// The head wave takes a longer path but spends most of it in faster rock, so
// beyond the "crossover distance" it arrives first. Where that happens depends
// on how thick the crust (H) is, which is how Andrija Mohorovičić found the
// crust's base in 1909 from a Croatian earthquake.
//
// A real crust has more layers and speeds that change from place to place, so
// these are models to compare with data, not the answer.

/**
 * @typedef {Object} CrustModel
 * @property {number} vp1      P speed in the crust, km/s
 * @property {number} vp2      P speed at the top of the mantle, km/s
 * @property {number} vs1      S speed in the crust, km/s
 * @property {number} vs2      S speed at the top of the mantle, km/s
 * @property {number} crustKm  crust thickness H, km
 * @property {number} depthKm  quake depth h, km (must be less than crustKm)
 */

/** Direct wave: straight line from depth h to distance d. Seconds after origin. */
export function directTime(distKm, depthKm, v) {
  return Math.hypot(distKm, depthKm) / v;
}

/** cos of the critical angle, where the refracted wave runs along the Moho. */
function cosCritical(v1, v2) {
  if (!(v2 > v1)) throw new Error('the mantle must be faster than the crust for a head wave');
  return Math.sqrt(1 - (v1 / v2) ** 2);
}

/** Nearest distance at which a head wave exists (the critical distance), km. */
export function headMinDistance(depthKm, crustKm, v1, v2) {
  const c = cosCritical(v1, v2);
  return (2 * crustKm - depthKm) * (v1 / v2) / c; // (2H − h)·tan(ic)
}

/**
 * Head wave (Pn with P speeds, Sn with S speeds). NaN closer than the critical
 * distance, where no head wave exists.
 */
export function headTime(distKm, depthKm, crustKm, v1, v2) {
  if (distKm < headMinDistance(depthKm, crustKm, v1, v2)) return NaN;
  return distKm / v2 + headIntercept(depthKm, crustKm, v1, v2);
}

/**
 * The head-wave line t = d / v2 + ti meets d = 0 at the "intercept time" ti.
 * Thicker crust means a later intercept.
 */
export function headIntercept(depthKm, crustKm, v1, v2) {
  return ((2 * crustKm - depthKm) * cosCritical(v1, v2)) / v1;
}

/**
 * Crust thickness from a measured head-wave intercept time: the inverse of
 * headIntercept. This is what students get from their two fitted lines.
 */
export function crustFromIntercept(interceptSec, v1, v2, depthKm = 0) {
  return ((interceptSec * v1) / cosCritical(v1, v2) + depthKm) / 2;
}

/**
 * Distance beyond which the head wave arrives first, km. For a quake at the
 * surface this is 2H·√((v2 + v1) / (v2 − v1)); with depth it is found by
 * bisection.
 */
export function crossoverKm(depthKm, crustKm, v1, v2) {
  const gap = (d) => directTime(d, depthKm, v1) - headTime(d, depthKm, crustKm, v1, v2);
  let lo = headMinDistance(depthKm, crustKm, v1, v2);
  let hi = 5000;
  if (gap(hi) < 0) return Infinity;
  if (gap(lo) >= 0) return lo;
  for (let i = 0; i < 60; i++) {
    const mid = (lo + hi) / 2;
    if (gap(mid) < 0) lo = mid; else hi = mid;
  }
  return (lo + hi) / 2;
}

/** First P (or S) arrival at a distance: {phase: 'Pg'|'Pn', t} for P. */
export function firstArrival(distKm, m, wave = 'P') {
  const [v1, v2] = wave === 'P' ? [m.vp1, m.vp2] : [m.vs1, m.vs2];
  const direct = directTime(distKm, m.depthKm, v1);
  const head = headTime(distKm, m.depthKm, m.crustKm, v1, v2);
  return head < direct ? { phase: `${wave}n`, t: head } : { phase: `${wave}g`, t: direct };
}

/**
 * Travel-time curves for drawing on a record section.
 * @param {CrustModel} m
 * @returns {{distKm:number[], Pg:number[], Pn:number[], Sg:number[], Sn:number[]}}
 *   seconds after origin; NaN where a head wave doesn't exist
 */
export function curves(m, maxKm = 300, stepKm = 2) {
  const out = { distKm: [], Pg: [], Pn: [], Sg: [], Sn: [] };
  for (let d = 0; d <= maxKm + 1e-9; d += stepKm) {
    out.distKm.push(d);
    out.Pg.push(directTime(d, m.depthKm, m.vp1));
    out.Pn.push(headTime(d, m.depthKm, m.crustKm, m.vp1, m.vp2));
    out.Sg.push(directTime(d, m.depthKm, m.vs1));
    out.Sn.push(headTime(d, m.depthKm, m.crustKm, m.vs1, m.vs2));
  }
  return out;
}
