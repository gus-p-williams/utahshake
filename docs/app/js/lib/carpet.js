// Months on one page: the "seismic carpet".
//
// Each row is one day; each small cell across it is a few minutes of that day; its color
// is how much the ground was shaking then. Weekly and daily rhythms (people, traffic,
// school bells) become stripes and blocks you can see at a glance: quiet nights, busy
// weekdays, a quiet holiday, and even the change between daylight saving time and standard
// time, because seismic data are kept in UTC, not local time.
// Pure functions; NaN marks a missing sample or an empty cell.

/**
 * Noise level per step: the RMS of each `windowSec` window (its mean removed), then the
 * median of the windows in each step of `perStep` windows. The median ignores a single
 * loud minute (a quake, a door slam), so the level shows the usual shaking.
 * A window with less than half its samples is NaN; so is a step with no good window.
 * @param {ArrayLike<number>} data (already filtered to the band you want)
 * @param {number} sampleRate
 * @param {number} windowSec e.g. 60
 * @param {number} perStep e.g. 15 (one level per 15 minutes)
 * @returns {Float64Array} one value per step
 */
export function stepLevels(data, sampleRate, windowSec, perStep) {
  const w = Math.round(windowSec * sampleRate);
  const nWin = Math.floor(data.length / w);
  const rms = new Float64Array(nWin);
  for (let k = 0; k < nWin; k++) {
    let s = 0, n = 0;
    for (let i = k * w; i < (k + 1) * w; i++) if (!Number.isNaN(data[i])) { s += data[i]; n++; }
    const mean = n ? s / n : 0;
    let ss = 0;
    for (let i = k * w; i < (k + 1) * w; i++) if (!Number.isNaN(data[i])) ss += (data[i] - mean) ** 2;
    rms[k] = n >= w / 2 ? Math.sqrt(ss / n) : NaN;
  }
  const out = new Float64Array(Math.floor(nWin / perStep));
  for (let s = 0; s < out.length; s++) out[s] = medianOf(rms.subarray(s * perStep, (s + 1) * perStep));
  return out;
}

/** Median of the finite values (NaN if none). */
export function medianOf(values) {
  const v = Array.from(values).filter(Number.isFinite).sort((a, b) => a - b);
  if (!v.length) return NaN;
  const m = v.length >> 1;
  return v.length % 2 ? v[m] : (v[m - 1] + v[m]) / 2;
}

/**
 * Lay levels out as a carpet: row d is the day starting at startMs + d days, column c the
 * c-th step of stepSec seconds in it. Times are used as given (UTC milliseconds), so a
 * routine that follows local clocks shifts by an hour when the clocks change.
 * @param {{t: number, v: number}[]} points t = the start of each step (ms)
 * @param {{startMs: number, days: number, stepSec: number}} opt
 * @returns {Float64Array[]} grid[day][column], NaN where there is no value
 */
export function carpetGrid(points, { startMs, days, stepSec }) {
  const cols = Math.round(86400 / stepSec);
  const grid = Array.from({ length: days }, () => new Float64Array(cols).fill(NaN));
  for (const { t, v } of points) {
    const k = Math.floor((t - startMs) / (stepSec * 1000) + 1e-9);
    const d = Math.floor(k / cols);
    if (d < 0 || d >= days) continue;
    grid[d][k - d * cols] = v;
  }
  return grid;
}

/**
 * When does the morning rise happen? The first time, from column `fromCol` on, that a day's
 * level reaches `level`, interpolated between the two columns around the crossing and given
 * in hours after the row's start (the column's middle counts as its time). Pairs of columns
 * with a missing value are skipped; NaN if the level is never reached.
 * @param {ArrayLike<number>} row
 * @param {number} level
 * @param {number} stepSec
 * @param {number} [fromCol=0]
 */
export function crossingHour(row, level, stepSec, fromCol = 0) {
  for (let c = Math.max(1, fromCol); c < row.length; c++) {
    const a = row[c - 1];
    const b = row[c];
    if (Number.isNaN(a) || Number.isNaN(b)) continue;
    if (a < level && b >= level) {
      const f = (level - a) / (b - a);
      return ((c - 1 + f + 0.5) * stepSec) / 3600;
    }
  }
  return NaN;
}
