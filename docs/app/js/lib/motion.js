// Which way the ground moved: particle motion from a 3-component station.
// Pure functions.
//
// A 3-component seismometer has three sensors at right angles: up (Z), north
// (N) and east (E). Together they record the path the ground traces.
//
// - A P wave pushes and pulls along its direction of travel. It arrives from
//   below, slanting up and away from the quake, so during P the ground moves
//   along that line: up-and-away or down-and-toward. Seen from above, the
//   motion points along the line to the quake. And because "up" always goes
//   with "away", the vertical motion tells which end of that line the quake is
//   on. That is enough to find the direction to a quake from ONE station.
// - An S wave shakes the ground sideways, across its direction of travel.
//
// Directions are azimuths: degrees clockwise from north (east = 90).

const RAD = Math.PI / 180;

/** Smallest signed difference a − b between two directions, in (−180, 180]. */
export function angleDiff(a, b) {
  const d = ((((a - b) % 360) + 540) % 360) - 180;
  return d === -180 ? 180 : d;
}

/**
 * Turn two horizontal sensors that point along az1 and az2 (for example the
 * "1" and "2" channels of a station installed off-north) into north and east
 * motion. Each sensor records the part of the motion along its own direction,
 * so motion = h1·(unit vector az1) + h2·(unit vector az2) when they are at
 * right angles. NaN gaps stay NaN.
 * @returns {{n:Float32Array, e:Float32Array}}
 */
export function rotateHorizontals(h1, h2, az1Deg, az2Deg) {
  const len = Math.min(h1.length, h2.length);
  const n = new Float32Array(len);
  const e = new Float32Array(len);
  const c1 = Math.cos(az1Deg * RAD);
  const s1 = Math.sin(az1Deg * RAD);
  const c2 = Math.cos(az2Deg * RAD);
  const s2 = Math.sin(az2Deg * RAD);
  for (let i = 0; i < len; i++) {
    n[i] = h1[i] * c1 + h2[i] * c2;
    e[i] = h1[i] * s1 + h2[i] * s2;
  }
  return { n, e };
}

/**
 * Vertical channel with "up" positive. Station metadata gives the dip: −90
 * means the sensor counts up as positive (the usual case), +90 means down.
 */
export function verticalUp(z, dipDeg = -90) {
  return dipDeg > 0 ? Float32Array.from(z, (v) => -v) : z;
}

/**
 * North/east motion -> radial (along the path, positive away from the quake)
 * and transverse (sideways, positive 90° clockwise from radial).
 * bazDeg is the back-azimuth: the direction from the station to the quake.
 * Same convention as ObsPy's rotate_ne_rt.
 * @returns {{r:Float32Array, t:Float32Array}}
 */
export function toRadialTransverse(n, e, bazDeg) {
  const c = Math.cos(bazDeg * RAD);
  const s = Math.sin(bazDeg * RAD);
  const len = Math.min(n.length, e.length);
  const r = new Float32Array(len);
  const t = new Float32Array(len);
  for (let i = 0; i < len; i++) {
    r[i] = -n[i] * c - e[i] * s;
    t[i] = n[i] * s - e[i] * c;
  }
  return { r, t };
}

/** Mean of a[i0..i1), ignoring NaN. */
function meanOf(a, i0, i1) {
  let sum = 0;
  let k = 0;
  for (let i = i0; i < i1; i++) if (!Number.isNaN(a[i])) { sum += a[i]; k++; }
  return k ? sum / k : 0;
}

/**
 * Main direction of horizontal motion in samples [i0, i1): the long axis of
 * the cloud of (east, north) points, found from their covariance (principal
 * components). A line has two ends, so the answer is in [0, 180).
 * @returns {{axisDeg:number, linearity:number, major:number, minor:number}}
 *   linearity 1 = a perfect line, 0 = a round blob; major/minor = rms along each axis
 */
export function horizontalAxis(n, e, i0 = 0, i1 = n.length) {
  const mn = meanOf(n, i0, i1);
  const me = meanOf(e, i0, i1);
  let cnn = 0;
  let cee = 0;
  let cne = 0;
  let k = 0;
  for (let i = i0; i < i1; i++) {
    const a = n[i] - mn;
    const b = e[i] - me;
    if (Number.isNaN(a) || Number.isNaN(b)) continue;
    cnn += a * a; cee += b * b; cne += a * b; k++;
  }
  if (!k) return { axisDeg: NaN, linearity: 0, major: 0, minor: 0 };
  cnn /= k; cee /= k; cne /= k;
  // Unit vector at azimuth θ is (north = cos θ, east = sin θ); the spread along
  // it is largest where tan 2θ = 2·cne / (cnn − cee).
  const axisDeg = (((0.5 * Math.atan2(2 * cne, cnn - cee)) / RAD) + 180) % 180;
  const mid = (cnn + cee) / 2;
  const rad = Math.sqrt(((cnn - cee) / 2) ** 2 + cne ** 2);
  const l1 = mid + rad;
  const l2 = Math.max(0, mid - rad);
  return { axisDeg, linearity: l1 > 0 ? 1 - l2 / l1 : 0, major: Math.sqrt(l1), minor: Math.sqrt(l2) };
}

/**
 * Direction to the quake from the first part of the P wave.
 *
 * 1. The horizontal motion lines up along the path (horizontalAxis).
 * 2. Up goes with away: if the ground moves up while moving toward azimuth θ,
 *    then θ points away from the quake and the quake is at θ + 180°.
 *
 * @param {ArrayLike<number>} z up-positive vertical
 * @param {ArrayLike<number>} n north
 * @param {ArrayLike<number>} e east
 * @param {number} i0 first sample of the P window
 * @param {number} i1 end of the window (exclusive)
 * @returns {{bazDeg:number, axisDeg:number, linearity:number, upAwayCorr:number,
 *   incidenceDeg:number}} bazDeg = estimated direction from the station to the
 *   quake; upAwayCorr = correlation of vertical with motion along the axis (its
 *   size says how clearly up goes with one end: near 0 means the 180° choice
 *   is a guess); incidenceDeg = apparent angle of the motion from vertical
 */
export function pWaveBackAzimuth(z, n, e, i0 = 0, i1 = z.length) {
  const ax = horizontalAxis(n, e, i0, i1);
  const c = Math.cos(ax.axisDeg * RAD);
  const s = Math.sin(ax.axisDeg * RAD);
  const mz = meanOf(z, i0, i1);
  const mn = meanOf(n, i0, i1);
  const me = meanOf(e, i0, i1);
  let szh = 0;
  let szz = 0;
  let shh = 0;
  for (let i = i0; i < i1; i++) {
    const zz = z[i] - mz;
    const h = (n[i] - mn) * c + (e[i] - me) * s;
    if (Number.isNaN(zz) || Number.isNaN(h)) continue;
    szh += zz * h; szz += zz * zz; shh += h * h;
  }
  const corr = szz > 0 && shh > 0 ? szh / Math.sqrt(szz * shh) : 0;
  const bazDeg = corr > 0 ? (ax.axisDeg + 180) % 360 : ax.axisDeg;
  return {
    bazDeg,
    axisDeg: ax.axisDeg,
    linearity: ax.linearity,
    upAwayCorr: Math.abs(corr),
    incidenceDeg: Math.atan2(Math.sqrt(shh), Math.sqrt(szz)) / RAD,
  };
}
