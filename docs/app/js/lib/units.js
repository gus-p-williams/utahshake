// From digitizer counts to real ground motion. Pure functions.
//
// A seismometer turns ground motion into a voltage, and the digitizer turns the
// voltage into whole numbers ("counts"). The station metadata gives the overall
// sensitivity: how many counts one unit of ground motion makes, at one
// reference frequency. Dividing by it gives physical units.
//
// That single number is exact only inside the sensor's flat band (for a
// broadband sensor, roughly 0.01–40 Hz; for a 1 Hz geophone, about 1–40 Hz),
// which covers local quakes. Outside it, the full instrument response would be
// needed, which these apps don't use.

/** Canonical units string: "M/S", "M", "M/S**2" (or the input upper-cased). */
function canon(units) {
  return String(units || '').toUpperCase().replace(/\s+/g, '').replace('M/S^2', 'M/S**2')
    .replace('M/S/S', 'M/S**2');
}

/**
 * What a channel's sensitivity describes.
 * @param {{sensitivity?:number, sensitivityFreq?:number, units?:string}} ch
 * @returns {{kind:'velocity'|'displacement'|'acceleration'|null, countsPerUnit:number|null,
 *   freqHz:number|null, units:string}}
 */
export function sensitivityInfo(ch) {
  const u = canon(ch?.units);
  const s = Math.abs(Number(ch?.sensitivity));
  const kind = u === 'M/S' ? 'velocity' : u === 'M' ? 'displacement'
    : u === 'M/S**2' ? 'acceleration' : null;
  return {
    kind: kind && Number.isFinite(s) && s > 0 ? kind : null,
    countsPerUnit: Number.isFinite(s) && s > 0 ? s : null,
    freqHz: Number.isFinite(Number(ch?.sensitivityFreq)) ? Number(ch.sensitivityFreq) : null,
    units: u,
  };
}

/**
 * Counts per (m/s) of ground velocity, or null if the channel can't give velocity.
 *
 * Some short-period stations describe their sensitivity in counts per metre of
 * displacement at a reference frequency f, although the sensor itself measures
 * velocity. A wave with displacement amplitude D has velocity amplitude
 * 2πf·D, so the velocity sensitivity is the displacement one divided by 2πf.
 * That conversion is right at f and close to it within the flat band; it is
 * flagged as approximate.
 *
 * Accelerometers (m/s²) return null: their counts need integrating, not just
 * dividing, to become velocity.
 * @returns {{countsPerMps:number, approx:boolean}|null}
 */
export function velocitySensitivity(ch) {
  const info = sensitivityInfo(ch);
  if (info.kind === 'velocity') return { countsPerMps: info.countsPerUnit, approx: false };
  if (info.kind === 'displacement' && info.freqHz > 0) {
    return { countsPerMps: info.countsPerUnit / (2 * Math.PI * info.freqHz), approx: true };
  }
  return null;
}

/**
 * A trace's data (counts) converted to ground velocity in m/s, or null when the
 * channel's metadata can't give velocity. NaN gaps stay NaN.
 * @param {ArrayLike<number>} data counts
 * @param {object} ch channel metadata (see fdsn.js Channel)
 * @returns {{data:Float32Array, approx:boolean}|null}
 */
export function toVelocity(data, ch) {
  const v = velocitySensitivity(ch);
  if (!v) return null;
  const out = new Float32Array(data.length);
  for (let i = 0; i < data.length; i++) out[i] = data[i] / v.countsPerMps;
  return { data: out, approx: v.approx };
}

/**
 * A ground speed in m/s written with a sensible unit, e.g. 3.2e-6 -> "3.2 µm/s".
 * Small quakes far away move the ground by nanometres per second.
 */
export function formatVelocity(mps, digits = 2) {
  const a = Math.abs(mps);
  if (!Number.isFinite(a)) return '–';
  const units = [[1, 'm/s'], [1e-3, 'mm/s'], [1e-6, 'µm/s'], [1e-9, 'nm/s']];
  const [scale, label] = units.find(([s]) => a >= s) || units[units.length - 1];
  return `${Number((mps / scale).toPrecision(digits))} ${label}`;
}
