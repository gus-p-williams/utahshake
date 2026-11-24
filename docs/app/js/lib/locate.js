// Locating a quake from S-minus-P times.
//
// P and S waves leave the quake together; S is slower, so the gap between the
// two arrivals grows with distance:
//
//     distance = (tS - tP) * Vp * Vs / (Vp - Vs)
//
// That distance runs from the quake (at depth) to the station: the hypocentral
// distance. With an assumed depth z, the distance along the surface from the
// epicenter is sqrt(d^2 - z^2). The best epicenter is the point whose predicted
// distances match the observed ones best (smallest root-mean-square misfit),
// found here by trying every point on a grid.
//
// Pure functions: no browser APIs, so they run in node tests too.

import { distanceKm, centroid, localProjection } from './geo.js';

/** km of distance per second of S-minus-P time. */
export function kmPerSecond(vp, vs) {
  if (!(vp > 0) || !(vs > 0)) throw new Error('Speeds must be positive');
  if (vs >= vp) throw new Error('S speed must be less than P speed');
  return (vp * vs) / (vp - vs);
}

/** Hypocentral distance (km) from an S-minus-P time (s). */
export function spToDistanceKm(spSec, vp, vs) {
  return spSec * kmPerSecond(vp, vs);
}

/** Surface (epicentral) distance from a hypocentral distance and a depth. */
export function hypoToEpiKm(hypoKm, depthKm) {
  const d2 = hypoKm * hypoKm - depthKm * depthKm;
  return d2 > 0 ? Math.sqrt(d2) : 0;
}

/**
 * Misfit of a trial epicenter.
 * @param {number} lat trial latitude
 * @param {number} lon trial longitude
 * @param {Array<{lat:number, lon:number, distKm:number}>} obs observed hypocentral distances
 * @param {number} depthKm assumed depth
 * @returns {{rmsKm:number, residualsKm:number[]}} residual = observed - predicted
 */
export function misfitAt(lat, lon, obs, depthKm = 0) {
  const residualsKm = obs.map((o) => {
    const epi = distanceKm(lat, lon, o.lat, o.lon);
    return o.distKm - Math.sqrt(epi * epi + depthKm * depthKm);
  });
  const ss = residualsKm.reduce((s, r) => s + r * r, 0);
  return { rmsKm: Math.sqrt(ss / Math.max(1, obs.length)), residualsKm };
}

function searchSquare(obs, depthKm, proj, cx, cy, halfKm, stepKm) {
  let best = { rmsKm: Infinity, x: cx, y: cy };
  const n = Math.round(halfKm / stepKm);
  for (let i = -n; i <= n; i++) {
    for (let j = -n; j <= n; j++) {
      const x = cx + i * stepKm;
      const y = cy + j * stepKm;
      const { lat, lon } = proj.toLatLon(x, y);
      const { rmsKm } = misfitAt(lat, lon, obs, depthKm);
      if (rmsKm < best.rmsKm) best = { rmsKm, x, y };
    }
  }
  return best;
}

/**
 * Grid-search epicenter from S-minus-P distances.
 * @param {Array<{lat:number, lon:number, distKm:number}>} obs at least 3 stations
 * @param {object} [opt]
 * @param {number} [opt.depthKm=8] assumed depth
 * @param {number} [opt.radiusKm=300] search half-width around the station centroid
 * @param {number} [opt.sigmaKm=2] how much extra misfit still counts as "fits";
 *   sets the rough uncertainty (use pick uncertainty in s × km per s)
 * @returns {{lat:number, lon:number, rmsKm:number, residualsKm:number[],
 *   uncertaintyKm:number, unbounded:boolean, warnings:string[]}}
 */
export function locateGrid(obs, opt = {}) {
  const { depthKm = 8, radiusKm = 300, sigmaKm = 2 } = opt;
  const warnings = [];
  if (obs.length < 3) {
    throw new Error('Need S-minus-P distances from at least 3 stations');
  }
  const c = centroid(obs);
  const proj = localProjection(c.lat, c.lon);

  // Coarse, then finer, then finest grid around the best point so far.
  let best = searchSquare(obs, depthKm, proj, 0, 0, radiusKm, 2);
  best = searchSquare(obs, depthKm, proj, best.x, best.y, 4, 0.25);
  best = searchSquare(obs, depthKm, proj, best.x, best.y, 0.5, 0.05);
  const { lat, lon } = proj.toLatLon(best.x, best.y);
  const { rmsKm, residualsKm } = misfitAt(lat, lon, obs, depthKm);

  // Rough uncertainty: the farthest point (within 80 km) whose misfit is no
  // more than sigmaKm worse than the best.
  const limit = rmsKm + sigmaKm;
  const reachKm = 80;
  const step = 0.5;
  let farKm = 0;
  let unbounded = false;
  const n = Math.round(reachKm / step);
  for (let i = -n; i <= n; i++) {
    for (let j = -n; j <= n; j++) {
      const r = Math.hypot(i, j) * step;
      if (r > reachKm || r <= farKm) continue;
      const p = proj.toLatLon(best.x + i * step, best.y + j * step);
      if (misfitAt(p.lat, p.lon, obs, depthKm).rmsKm <= limit) {
        farKm = r;
        if (r > reachKm - step) unbounded = true;
      }
    }
  }
  if (unbounded) {
    warnings.push('The stations do not pin the quake down: many places fit. ' +
      'Add a station on another side of the quake.');
  }
  if (rmsKm > 10) {
    warnings.push('The circles do not meet well (misfit over 10 km). ' +
      'Check the picks, especially S.');
  }
  return { lat, lon, rmsKm, residualsKm, uncertaintyKm: Math.max(farKm, step),
    unbounded, warnings };
}
