// Straight lines through arrival times. Pure functions.
//
// On a record section each station is a stopwatch at a known distance. If a
// wave travels at a steady speed v, its arrival time t at distance d is
//
//   t = t0 + d / v
//
// a straight line whose slope (seconds per km) is 1 / v. So fitting a line to
// the arrivals measures the wave speed. Time is the uncertain quantity (picks
// are off by a few hundredths of a second), distance is known, so the fit
// minimises the misfit in time.

/**
 * Least-squares line y = intercept + slope · x.
 * @param {number[]} xs
 * @param {number[]} ys
 * @returns {{slope:number, intercept:number, slopeSE:number, interceptSE:number,
 *   rms:number, sse:number, n:number, r2:number}} SE = standard error (NaN with < 3 points)
 */
export function fitLine(xs, ys) {
  const n = xs.length;
  if (n < 2 || ys.length !== n) throw new Error('need at least two points to fit a line');
  let mx = 0;
  let my = 0;
  for (let i = 0; i < n; i++) { mx += xs[i]; my += ys[i]; }
  mx /= n; my /= n;
  let sxx = 0;
  let sxy = 0;
  let syy = 0;
  for (let i = 0; i < n; i++) {
    sxx += (xs[i] - mx) ** 2;
    sxy += (xs[i] - mx) * (ys[i] - my);
    syy += (ys[i] - my) ** 2;
  }
  if (sxx === 0) throw new Error('all points are at the same distance');
  const slope = sxy / sxx;
  const intercept = my - slope * mx;
  let sse = 0;
  for (let i = 0; i < n; i++) sse += (ys[i] - intercept - slope * xs[i]) ** 2;
  const s2 = n > 2 ? sse / (n - 2) : NaN;
  return {
    slope, intercept,
    slopeSE: Math.sqrt(s2 / sxx),
    interceptSE: Math.sqrt(s2 * (1 / n + (mx * mx) / sxx)),
    rms: Math.sqrt(sse / n), sse, n,
    r2: syy > 0 ? 1 - sse / syy : 1,
  };
}

/**
 * Wave speed from arrivals: fits t = t0 + d / v.
 * @param {Array<{distKm:number, tSec:number}>} points tSec = seconds after origin
 * @returns {{speedKms:number, speedSE:number, interceptSec:number, interceptSE:number,
 *   rmsSec:number, n:number}}
 */
export function speedFromArrivals(points) {
  const f = fitLine(points.map((p) => p.distKm), points.map((p) => p.tSec));
  return {
    speedKms: 1 / f.slope,
    speedSE: f.slopeSE / (f.slope * f.slope), // error of 1/b is SE(b) / b²
    interceptSec: f.intercept,
    interceptSE: f.interceptSE,
    rmsSec: f.rms,
    n: f.n,
  };
}

/** twoLineFit fRatio above this: the bend is clear, not noise (see twoLineFit). */
export const BEND_F_RATIO = 12;

/** Speed from a hand-drawn ruler through two points, km/s. */
export function speedFromRuler(a, b) {
  return (b.distKm - a.distKm) / (b.tSec - a.tSec);
}

/**
 * Two straight lines through first arrivals: near stations on the direct
 * wave, far stations on a faster head wave. Tries every split by distance and
 * keeps the one with the smallest total misfit in which the far line is
 * faster. Also says whether two lines explain the data clearly better than one
 * (an F-test ratio). With 12–30 stations and random pick errors, points that
 * really lie on one straight line give a ratio above 12 only about 1 time in
 * 100 (checked by simulation), so BEND_F_RATIO = 12 marks a clear bend; a real
 * 6.1 -> 7.9 km/s bend with 0.1 s pick errors gives 100 or more.
 *
 * @param {Array<{distKm:number, tSec:number}>} points
 * @param {{minPerLine?:number}} [opt]
 * @returns {null|{near:object, far:object, splitKm:number, crossoverKm:number,
 *   single:object, fRatio:number}} near/far as speedFromArrivals; splitKm = the
 *   first far station's distance; crossoverKm = where the two lines meet
 */
export function twoLineFit(points, { minPerLine = 3 } = {}) {
  const pts = [...points].sort((a, b) => a.distKm - b.distKm);
  const n = pts.length;
  if (n < 2 * minPerLine) return null;
  const line = (ps) => fitLine(ps.map((p) => p.distKm), ps.map((p) => p.tSec));
  let best = null;
  for (let k = minPerLine; k <= n - minPerLine; k++) {
    const a = line(pts.slice(0, k));
    const b = line(pts.slice(k));
    if (!(b.slope > 0 && b.slope < a.slope)) continue; // far line must be faster
    const sse = a.sse + b.sse;
    if (!best || sse < best.sse) best = { k, a, b, sse };
  }
  if (!best) return null;
  const single = line(pts);
  const dof = n - 4;
  const fRatio = dof > 0 && best.sse > 0
    ? ((single.sse - best.sse) / 2) / (best.sse / dof) : Infinity;
  const asSpeed = (f) => ({ speedKms: 1 / f.slope, speedSE: f.slopeSE / (f.slope * f.slope),
    interceptSec: f.intercept, interceptSE: f.interceptSE, rmsSec: f.rms, n: f.n });
  return {
    near: asSpeed(best.a),
    far: asSpeed(best.b),
    splitKm: pts[best.k].distKm,
    crossoverKm: (best.b.intercept - best.a.intercept) / (best.a.slope - best.b.slope),
    single: asSpeed(single),
    fRatio,
  };
}
