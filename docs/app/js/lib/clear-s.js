// How clearly the S wave stands out at a station. Pure functions.
//
// S − P is the whole task in Quake Locator and part of Quake Explorer A and C, so the
// ready-made quakes say how many of their stations show a clear S ("clear S at 7 of 10
// stations"). Those numbers come from this module, run offline by
// tools/quake-explorer/clear-s-check.mjs and checked by tests/clear-s.test.js; the apps
// themselves don't run it.
//
// The measure: how much bigger the shaking is just after S than in the P coda (the
// shaking left over from P) just before it. S counts as clear at 3 times or more.
import { aicPick, searchWindow } from './picker.js';
import { firstArrival, directTime } from './traveltime.js';

/** S counts as clear when it is at least this many times bigger than the P coda before it. */
export const CLEAR_S_RATIO = 3;

function rmsBetween(data, sampleRate, startSec, fromSec, toSec) {
  const i0 = Math.max(0, Math.round((fromSec - startSec) * sampleRate));
  const i1 = Math.min(data.length, Math.round((toSec - startSec) * sampleRate));
  let sum = 0;
  let n = 0;
  for (let i = i0; i < i1; i++) {
    const v = data[i];
    if (Number.isFinite(v)) { sum += v * v; n++; }
  }
  return n > 5 ? Math.sqrt(sum / n) : NaN;
}

/**
 * How much S stands out over the P coda: rms of the 2 s after S divided by the rms
 * of the coda just before it, from max(P + 0.5 s, S − 3 s) to S − 0.2 s.
 * @param {ArrayLike<number>} data filtered record (NaN where data are missing)
 * @param {number} sampleRate samples per second
 * @param {number} startSec time of data[0], seconds after the origin
 * @param {number} pSec P arrival, seconds after the origin
 * @param {number} sSec S arrival, seconds after the origin
 * @returns {number} the ratio; NaN if the coda window is shorter than 0.3 s (S too soon
 *   after P, as at a station right next to the quake) or either window has no data
 */
export function sOverCoda(data, sampleRate, startSec, pSec, sSec) {
  const c0 = Math.max(pSec + 0.5, sSec - 3);
  const c1 = sSec - 0.2;
  if (c1 - c0 < 0.3) return NaN;
  const coda = rmsBetween(data, sampleRate, startSec, c0, c1);
  const after = rmsBetween(data, sampleRate, startSec, sSec, sSec + 2);
  return coda > 0 ? after / coda : NaN;
}

/**
 * Is an S − P time believable for this distance? Within 15% (plus half a second) of
 * the direct S − P (Sg − first P) or the head-wave S − P (Sn − first P) of a crust model.
 * Used to throw out computer S picks that landed on the wrong wiggle.
 * @param {number} spSec measured S − P
 * @param {number} distKm epicentral distance
 * @param {number} depthKm focal depth
 * @param {{vp1:number, vp2:number, vs1:number, vs2:number, crustKm:number}} model
 */
export function spPlausible(spSec, distKm, depthKm, model) {
  const m = { ...model, depthKm: Math.max(0, depthKm) };
  const p = firstArrival(distKm, m, 'P').t;
  const expected = [directTime(distKm, m.depthKm, m.vs1) - p, firstArrival(distKm, m, 'S').t - p];
  return expected.some((e) => Math.abs(spSec - e) <= 0.15 * e + 0.5);
}

/**
 * How clear S is at one station.
 *
 * P and S come from the picks given (analyst, else computer); where one is missing, the
 * AIC picker looks for it (P on the first component, S on each component, keeping the
 * one that stands out most). Analyst S picks are trusted; any other S pick must pass
 * spPlausible. The station's ratio is the best over its components, since a student
 * can look at all of them (S is often clearest on N or E).
 *
 * @param {object} st
 * @param {Array<{cha:string, data:ArrayLike<number>, sampleRate:number, startSec:number}>} st.components
 *   filtered records, the vertical first
 * @param {number} st.distKm
 * @param {number} [st.pSec] P pick, seconds after the origin
 * @param {number} [st.sSec] S pick
 * @param {'analyst'|'computer'} [st.sWho] who made the S pick (default 'analyst')
 * @param {number} depthKm focal depth
 * @param {object} model crust model (see spPlausible)
 * @returns {{pSec:number|null, sSec:number|null, sWho:string|null, ratio:number, cha:string|null,
 *   plausible:boolean, clear:boolean}}
 */
export function stationS(st, depthKm, model) {
  const comps = st.components.filter((c) => c && c.data && c.data.length);
  const none = { pSec: st.pSec ?? null, sSec: null, sWho: null, ratio: NaN, cha: null, plausible: false, clear: false };
  if (!comps.length) return none;
  let pSec = st.pSec;
  if (pSec === undefined || pSec === null) {
    const z = comps[0];
    const p = aicPick(z.data, z.sampleRate, z.startSec, ...searchWindow('P', st.distKm));
    if (!p || p.snr < 3) return { ...none, pSec: null };
    pSec = p.tSec;
  }
  let sSec = st.sSec;
  let sWho = sSec === undefined || sSec === null ? null : (st.sWho ?? 'analyst');
  if (sWho === null) {
    let best = null;
    for (const c of comps) {
      const s = aicPick(c.data, c.sampleRate, c.startSec, ...searchWindow('S', st.distKm, pSec));
      if (s && (!best || s.snr > best.snr)) best = s;
    }
    if (!best) return { ...none, pSec };
    sSec = best.tSec;
    sWho = 'computer';
  }
  let ratio = NaN;
  let cha = null;
  for (const c of comps) {
    const r = sOverCoda(c.data, c.sampleRate, c.startSec, pSec, sSec);
    if (Number.isFinite(r) && (cha === null || r > ratio)) { ratio = r; cha = c.cha; }
  }
  const plausible = sWho === 'analyst' || spPlausible(sSec - pSec, st.distKm, depthKm, model);
  return { pSec, sSec, sWho, ratio, cha, plausible, clear: plausible && ratio >= CLEAR_S_RATIO };
}

/**
 * stationS for every station of a quake, and how many show a clear S.
 * @param {Array<object>} stations as stationS's first argument, each with a `sta` code
 * @returns {{rows:Array<object>, clear:number, total:number}}
 */
export function countClearS(stations, depthKm, model) {
  const rows = stations.map((st) => ({ sta: st.sta, distKm: st.distKm, ...stationS(st, depthKm, model) }));
  return { rows, clear: rows.filter((r) => r.clear).length, total: rows.length };
}
