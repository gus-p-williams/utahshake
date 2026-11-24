// Layout and geometry for the record section (Quake Explorer, investigation A).
// Pure functions, tested in tests/record-section-layout.test.js.
//
// A record section puts every station's trace at its distance from the quake:
// time runs across, distance runs down. Arrivals of one wave then line up, and
// the slope of that line is the wave's speed (km travelled ÷ seconds taken).

/**
 * Reduced time: t − d / v. Subtracting the time a v-km/s wave needs to reach
 * distance d makes that wave's arrivals line up straight down the page, so a
 * wave a little faster or slower than v shows up as a clear tilt. With v = 8,
 * the Pn wave (about 7.8 km/s) runs almost straight down while Pg (6 km/s)
 * leans right: the bend between them is easy to see.
 * @param {number} tSec seconds after the origin time
 * @param {number} distKm
 * @param {number} vKmS reduction speed; 0 (or less) = no reduction
 */
export function reducedTime(tSec, distKm, vKmS) {
  return vKmS > 0 ? tSec - distKm / vKmS : tSec;
}

/** Back from reduced time to seconds after the origin time (the inverse of reducedTime). */
export function trueTime(tauSec, distKm, vKmS) {
  return vKmS > 0 ? tauSec + distKm / vKmS : tauSec;
}

/**
 * Which stretch of (reduced) time to show. Every trace covers tMin..tMax
 * seconds after the origin, but in reduced time each one is shifted left by
 * d / v, so the traces no longer start and end together.
 *   limit: as far as anyone may zoom out (some trace has data there)
 *   home:  the start view, where every trace has data, if that window is a
 *          useful size; otherwise the same as limit
 * @returns {{home:{from:number, to:number}, limit:{from:number, to:number}}}
 */
export function timeWindows(tMin, tMax, dNear, dFar, vKmS) {
  if (!(vKmS > 0)) return { home: { from: tMin, to: tMax }, limit: { from: tMin, to: tMax } };
  const limit = { from: tMin - dFar / vKmS, to: tMax - dNear / vKmS };
  const shared = { from: tMin - dNear / vKmS, to: tMax - dFar / vKmS };
  const useful = shared.to - shared.from >= 0.25 * (tMax - tMin);
  return { home: useful ? shared : { ...limit }, limit };
}

/**
 * Where each trace sits on the page and how much room it may use.
 *
 * Each trace's middle line (y) is at its distance. Stations are not evenly
 * spaced, so the size of a full-scale wiggle is set by the typical spacing
 * ("gap": the average distance between neighbouring traces, in px). A trace
 * may reach as far as its neighbour's middle line but no further (room.up /
 * room.down), so a big wiggle cannot paint over the next trace's wiggles.
 * Two stations at almost the same distance still get half a gap each way.
 *
 * @param {number[]} dists distances in km, nearest first
 * @param {{dMin:number, dMax:number, top:number, height:number, minGap?:number}} box
 *   dMin..dMax is drawn from top to top + height (px)
 * @returns {{ys:number[], gap:number, room:Array<{up:number, down:number}>}}
 */
export function traceLayout(dists, { dMin, dMax, top, height, minGap = 6 }) {
  const span = dMax - dMin || 1;
  const ys = dists.map((d) => top + ((d - dMin) / span) * height);
  const n = ys.length;
  let gap = n > 1 ? (ys[n - 1] - ys[0]) / (n - 1) : height / 4;
  gap = Math.max(minGap, Math.min(gap, height / 3));
  const room = ys.map((y, k) => ({
    up: Math.max(gap / 2, k > 0 ? y - ys[k - 1] : gap),
    down: Math.max(gap / 2, k < n - 1 ? ys[k + 1] - y : gap),
  }));
  return { ys, gap, room };
}

/**
 * Which screen columns of one trace have data. With reduced time a trace may
 * start after the left edge of the plot or end before the right edge; columns
 * outside the record must stay empty rather than repeat its first sample.
 * @param {number} i0 sample index (may be fractional or negative) at the left edge
 * @param {number} perCol samples per column
 * @param {number} nCols columns across the plot
 * @param {number} length samples in the record
 * @returns {{c0:number, c1:number, from:number, to:number}} columns c0..c1-1 have
 *   data; they cover samples from..to
 */
export function dataColumns(i0, perCol, nCols, length) {
  const clamp = (c) => Math.max(0, Math.min(nCols, c));
  const c0 = clamp(Math.ceil(-i0 / perCol));
  const c1 = Math.max(c0, clamp(Math.floor((length - i0) / perCol)));
  return { c0, c1, from: i0 + c0 * perCol, to: i0 + c1 * perCol };
}

/** Largest 1, 2 or 5 × 10^k that is not above x (a round number for a scale bar). */
export function niceFloor(x) {
  if (!(x > 0) || !Number.isFinite(x)) return NaN;
  const p = 10 ** Math.floor(Math.log10(x));
  const f = x / p;
  return (f >= 5 ? 5 : f >= 2 ? 2 : 1) * p;
}

/** Distance in px from point (px, py) to the segment from (ax, ay) to (bx, by). */
export function distToSegment(px, py, ax, ay, bx, by) {
  const dx = bx - ax;
  const dy = by - ay;
  const len2 = dx * dx + dy * dy;
  const u = len2 > 0 ? Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / len2)) : 0;
  return Math.hypot(px - (ax + u * dx), py - (ay + u * dy));
}

/**
 * A ruler's speed as text. A ruler with both ends at the same time would mean
 * the wave reached every station at once: infinitely fast ("∞ km/s"). One
 * that slopes the other way gives a negative speed, which is shown as it is:
 * students can work out why.
 */
export function speedText(speedKms, digits = 1) {
  if (!Number.isFinite(speedKms)) return Number.isNaN(speedKms) ? '– km/s' : '∞ km/s';
  if (Math.abs(speedKms) >= 1000) return `${speedKms > 0 ? '' : '−'}1000+ km/s`;
  return `${speedKms.toFixed(digits).replace('-', '−')} km/s`;
}

/**
 * Slide a ruler: both ends move dtSec later in time and dKm farther in distance.
 * @param {{a:{distKm:number, tSec:number}, b:{distKm:number, tSec:number}}} r
 */
export function shiftRuler(r, dtSec, dKm = 0) {
  const move = (p) => ({ distKm: p.distKm + dKm, tSec: p.tSec + dtSec });
  return { a: move(r.a), b: move(r.b) };
}

/**
 * Tilt a ruler about its middle: the far end (larger distance) moves dtSec
 * earlier and the near end dtSec later, so the time between the ends shrinks
 * by 2 · dtSec. Less time for the same distance is a faster wave, which on the
 * page is a steeper line. A negative dtSec makes it flatter (slower).
 */
export function tiltRuler(r, dtSec) {
  const aFar = r.a.distKm > r.b.distKm;
  const far = aFar ? r.a : r.b;
  const near = aFar ? r.b : r.a;
  const f = { distKm: far.distKm, tSec: far.tSec - dtSec };
  const n = { distKm: near.distKm, tSec: near.tSec + dtSec };
  return aFar ? { a: f, b: n } : { a: n, b: f };
}

/**
 * Choose which labels to draw so none are closer than minGap px, most
 * important first (higher priority), then top to bottom.
 * @param {Array<{y:number, priority?:number}>} items
 * @returns {boolean[]} show[i] for items[i]
 */
export function spreadLabels(items, minGap) {
  const order = items.map((_, i) => i)
    .sort((i, j) => (items[j].priority ?? 0) - (items[i].priority ?? 0) || items[i].y - items[j].y);
  const kept = [];
  const show = items.map(() => false);
  for (const i of order) {
    if (kept.every((y) => Math.abs(y - items[i].y) >= minGap)) {
      kept.push(items[i].y);
      show[i] = true;
    }
  }
  return show;
}
