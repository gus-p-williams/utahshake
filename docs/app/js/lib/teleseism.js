// Distant quakes ("teleseisms"): distances in degrees and arrival times from
// a precomputed Earth-model table. Pure functions.
//
// Far away, Earth's curve matters and the waves dive deep: rock gets faster
// with depth, so the rays bend back up, and a wave reaching a station 90°
// away has travelled through the lower mantle. That's why the arrival times
// don't grow in a straight line with distance: plotted against distance they
// curve, and the curve is evidence that Earth is faster inside. Beyond about
// 100° the direct P wave is blocked by the core (the "shadow zone"): first
// comes a weak wave bent around the core (Pdiff), then waves through it (PKP).
//
// The table (docs/app/data/traveltimes-iasp91.json) comes from the iasp91
// Earth model, made by tools/quake-explorer/traveltime_table.py with ObsPy.

import { distanceKm, EARTH_RADIUS_KM } from './geo.js';

const KM_PER_DEG = (Math.PI * EARTH_RADIUS_KM) / 180; // 111.19 km

/** Distance along Earth's surface in degrees (1° ≈ 111 km). */
export function distanceDeg(lat1, lon1, lat2, lon2) {
  return distanceKm(lat1, lon1, lat2, lon2) / KM_PER_DEG;
}

/** Linear interpolation of y at x in sorted xs (clamped at the ends). */
function interp(xs, ys, x) {
  if (x <= xs[0]) return [0, 0, 0];
  for (let i = 1; i < xs.length; i++) {
    if (x <= xs[i]) return [i - 1, i, (x - xs[i - 1]) / (xs[i] - xs[i - 1])];
  }
  return [xs.length - 1, xs.length - 1, 0];
}

/**
 * First P-type and S-type arrival times, seconds after the origin, for a quake
 * at depthKm and a station distDeg away: read from the table and interpolated
 * between its rows (depth) and columns (distance).
 * @param {object} table parsed traveltimes-iasp91.json
 * @returns {{P:number, S:number, Pphase:string, Sphase:string}} phase names
 *   from the nearest table entry, e.g. "P", "Pdiff", "PKIKP", "SKS"
 */
export function bodyWaveTimes(table, distDeg, depthKm) {
  const [d0, d1, fd] = interp(table.depthsKm, table.depthsKm, depthKm);
  const [x0, x1, fx] = interp(table.distDeg, table.distDeg, distDeg);
  const at = (rows, d, x) => rows[d][x];
  const bilinear = (rows) => {
    const a = at(rows, d0, x0) * (1 - fx) + at(rows, d0, x1) * fx;
    const b = at(rows, d1, x0) * (1 - fx) + at(rows, d1, x1) * fx;
    return a * (1 - fd) + b * fd;
  };
  const near = (rows) => rows[fd < 0.5 ? d0 : d1][fx < 0.5 ? x0 : x1];
  return { P: bilinear(table.P), S: bilinear(table.S), Pphase: near(table.Pphase), Sphase: near(table.Sphase) };
}

/**
 * When the surface waves pass: they travel along the surface (not through
 * Earth), at about 3–4.2 km/s depending on their period. Longer waves reach
 * deeper, faster rock, so they arrive first (dispersion).
 * @returns {{startSec:number, peakSec:number, endSec:number}} after the origin
 */
export function surfaceWaveWindow(distDeg) {
  const km = distDeg * KM_PER_DEG;
  return { startSec: km / 4.2, peakSec: km / 3.7, endSec: km / 3.0 };
}

/** True where the core blocks the direct P wave (about 103° to 142°). */
export function inPShadow(distDeg) {
  return distDeg >= 103 && distDeg <= 142;
}

/**
 * Record length that shows P, S and the surface waves at distDeg, rounded up
 * to whole minutes, with a margin after the surface waves.
 */
export function recordMinutes(distDeg) {
  return Math.ceil((surfaceWaveWindow(distDeg).endSec + 300) / 60);
}
