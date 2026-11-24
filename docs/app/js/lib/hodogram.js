// Helpers for the particle-motion view (quake-explorer/motion-view.js).
// Pure functions: no browser needed, so they are tested in node.
//
// A "hodogram" is the path the ground traces, drawn as a line: east across
// and north up for the view from above, or "along a direction" across and up
// for the view from the side. Directions are azimuths: degrees clockwise from
// north (east = 90), as in motion.js.

const RAD = Math.PI / 180;

/** Any angle -> the same direction in [0, 360). */
export function norm360(deg) {
  const d = ((deg % 360) + 360) % 360;
  return d === 360 ? 0 : d; // (-1e-15 % 360) + 360 rounds to 360
}

const COMPASS = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];

/** Nearest of the 8 compass points: 47 -> 'NE', 200 -> 'S'. */
export function compassPoint(azDeg) {
  return COMPASS[Math.round(norm360(azDeg) / 45) % 8];
}

/**
 * Azimuth of a point seen from the centre of a map-style plot.
 * @param {number} east distance to the right of the centre
 * @param {number} north distance above the centre (screen y grows DOWN, so
 *   pass centreY − y)
 */
export function azimuthOf(east, north) {
  return norm360(Math.atan2(east, north) / RAD);
}

/**
 * Horizontal motion along azimuth az: how far the ground moved toward az.
 * Unit vector at az is (north = cos az, east = sin az), so this is the dot
 * product n·cos az + e·sin az. NaN stays NaN.
 * @returns {Float32Array}
 */
export function alongAzimuth(n, e, azDeg) {
  const c = Math.cos(azDeg * RAD);
  const s = Math.sin(azDeg * RAD);
  const len = Math.min(n.length, e.length);
  const out = new Float32Array(len);
  for (let i = 0; i < len; i++) out[i] = n[i] * c + e[i] * s;
  return out;
}

/**
 * Samples [i0, i1) of a record that fall in the time window t0..t1.
 * @param {{startMs:number, refMs:number, sampleRate:number, length:number}} rec
 *   startMs = time of sample 0; refMs = time 0 on the axis (the origin time)
 * @param {number} t0 window start, seconds after refMs
 * @param {number} t1 window end
 */
export function windowIndices({ startMs, refMs, sampleRate, length }, t0, t1) {
  const idx = (t) => Math.round(((refMs - startMs) / 1000 + t) * sampleRate);
  const clamp = (i) => Math.max(0, Math.min(length, i));
  return { i0: clamp(idx(t0)), i1: clamp(idx(t1)) };
}

/**
 * Keep a time window inside the record and between minLen and maxLen long.
 * Moving it past an end slides it back in, keeping its length.
 * @param {{from:number, to:number}} full the whole record, seconds
 * @returns {{t0:number, t1:number}}
 */
export function clampWindow(t0, t1, full, minLen = 0.1, maxLen = Infinity) {
  if (t1 < t0) [t0, t1] = [t1, t0];
  const span = full.to - full.from;
  const len = Math.min(span, maxLen, Math.max(minLen, t1 - t0));
  if (t1 - t0 !== len) t1 = t0 + len;
  if (t0 < full.from) { t0 = full.from; t1 = t0 + len; }
  if (t1 > full.to) { t1 = full.to; t0 = t1 - len; }
  return { t0, t1 };
}

/**
 * Size of the motion in samples [i0, i1): the largest of |up| and the
 * horizontal distance sqrt(n² + e²). A plot scaled by it fits the whole
 * path, with the same scale across and up (a circle stays a circle).
 * Pass z = null for the horizontal motion only (the view from above).
 * NaN samples are skipped; 0 if none.
 */
export function motionScale(z, n, e, i0 = 0, i1 = n.length) {
  let m = 0;
  const end = Math.min(n.length, e.length, z ? z.length : Infinity, i1);
  for (let i = Math.max(0, i0); i < end; i++) {
    const h = Math.hypot(n[i], e[i]);
    if (h > m) m = h; // NaN > m is false, so gaps are skipped
    if (z) {
      const v = Math.abs(z[i]);
      if (v > m) m = v;
    }
  }
  return m;
}

/**
 * When to trust the direction from P-wave motion. From the Phase 0 check
 * (271 station-quake pairs): with linearity above 0.8 and up/away above 0.5
 * the median error was 10°, and 85% were within 30°.
 */
export const TRUST = Object.freeze({ lineClear: 0.8, lineFair: 0.6, upAwayClear: 0.5, upAwayWeak: 0.3 });

/**
 * Plain words for the two "how much to trust this" numbers of
 * pWaveBackAzimuth (motion.js).
 * - linearity: does the ground move back and forth along ONE line? That line
 *   points to the quake (or straight away from it).
 * - upAwayCorr: does "up" go clearly with one end of the line? That end is
 *   "away", so it decides which end the quake is on.
 * @returns {{line:{level:string, words:string}, upAway:{level:string, words:string},
 *   overall:{level:string, words:string}}} level is 'good', 'fair' or 'poor'
 */
export function trustReport(linearity, upAwayCorr) {
  const level = (x, good, fair) => (x >= good ? 'good' : x >= fair ? 'fair' : 'poor');
  const lineLevel = Number.isFinite(linearity) ? level(linearity, TRUST.lineClear, TRUST.lineFair) : 'poor';
  const upLevel = Number.isFinite(upAwayCorr) ? level(upAwayCorr, TRUST.upAwayClear, TRUST.upAwayWeak) : 'poor';
  const line = { level: lineLevel, words: { good: 'clear line', fair: 'rough line', poor: 'messy' }[lineLevel] };
  const upAway = { level: upLevel, words: { good: 'clear up = away', fair: 'weak', poor: 'unclear' }[upLevel] };
  let overall;
  if (lineLevel === 'poor') {
    overall = { level: 'poor', words: 'Messy motion: the direction could be far off. Try another window or station.' };
  } else if (upLevel === 'poor') {
    overall = { level: 'poor', words: 'The line is there, but which end is the quake is a coin toss (could be 180° off).' };
  } else if (lineLevel === 'good' && upLevel === 'good') {
    overall = { level: 'good', words: 'Clear motion: usually within about 15° of the true direction.' };
  } else {
    overall = { level: 'fair', words: 'Some clues are weak: use this direction with care.' };
  }
  return { line, upAway, overall };
}

/**
 * A colour as [r, g, b] (0–255) from '#rgb', '#rrggbb' or 'rgb(r, g, b)' /
 * 'rgba(...)'. Returns null for anything else (e.g. a colour name).
 */
export function parseColour(s) {
  const t = String(s).trim();
  let m = /^#([0-9a-f]{3})$/i.exec(t);
  if (m) return [...m[1]].map((h) => parseInt(h + h, 16));
  m = /^#([0-9a-f]{6})([0-9a-f]{2})?$/i.exec(t);
  if (m) return [0, 2, 4].map((k) => parseInt(m[1].slice(k, k + 2), 16));
  m = /^rgba?\(\s*([\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)/i.exec(t);
  if (m) return [m[1], m[2], m[3]].map((v) => Math.round(Number(v)));
  return null;
}

/**
 * Blend two [r, g, b] colours: f = 0 gives a, f = 1 gives b.
 * @returns {string} 'rgb(r, g, b)'
 */
export function mixColour(a, b, f) {
  const c = a.map((v, k) => Math.round(v + (b[k] - v) * f));
  return `rgb(${c[0]}, ${c[1]}, ${c[2]})`;
}
