// Cartoon P and S pulses for "How P and S waves move rock" (figure W1 on the
// Seismic waves page).
//
// A pulse leaves the quake (x = 0) at t = 0 and travels away at a constant speed v.
// Every bit of rock feels the same swing, just later the farther away it is, so the
// displacement of the rock at distance x is pulse((x - v t) / width). The peak of the
// pulse is at x = v t. A P wave moves the rock along the travel direction, an S wave
// across it: same shape, different direction, different speed.
//
// The pulse is a Ricker wavelet ("Mexican hat"): one big swing with a smaller swing the
// other way on each side, about one and a half cycles. It is cut off at REACH widths from
// its peak (where it is below one millionth), so the rock ahead of it is exactly at rest.
//
// Pure functions: no browser APIs, so they run in node tests too.

export const VP = 5.8;   // km/s, the Quake Locator speeds (docs/theory/s-minus-p.md)
export const VS = 3.3;   // km/s
export const REACH = 4;  // the pulse is zero more than REACH widths from its peak

/**
 * Pulse shape: 1 at the peak, a dip to about -0.45 on each side, 0 far away.
 * @param {number} s distance from the peak, in pulse widths (positive = ahead of the peak)
 */
export function pulse(s) {
  if (Math.abs(s) >= REACH) return 0;
  const s2 = s * s;
  return (1 - 2 * s2) * Math.exp(-s2);
}

/**
 * How far the rock at distance xKm has moved at time tSec, as a fraction of the biggest
 * swing (-0.45 to 1). For P, positive is forward (away from the quake); for S, up.
 * @param {number} xKm distance of the rock from the quake (its rest spot)
 * @param {number} tSec seconds after the quake
 * @param {number} speed wave speed, km/s
 * @param {number} [widthKm=3.5] pulse width
 */
export function displacement(xKm, tSec, speed, widthKm = 3.5) {
  return pulse((xKm - speed * tSec) / widthKm);
}

/** Where the peak of the pulse is (km from the quake) at time tSec. */
export function peakKm(tSec, speed) {
  return speed * tSec;
}

/** The leading edge: rock farther away than this has not moved yet. */
export function frontKm(tSec, speed, widthKm = 3.5) {
  return speed * tSec + REACH * widthKm;
}

/** Whole seconds until the slower pulse has (visibly) left a strip lengthKm long. */
export function endTime(lengthKm, slowSpeed, widthKm = 3.5) {
  return Math.ceil((lengthKm + 3 * widthKm) / slowSpeed);
}
