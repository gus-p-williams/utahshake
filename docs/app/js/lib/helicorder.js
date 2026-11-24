// A day on one page: the helicorder.
//
// Old seismographs drew with a pen on paper wrapped around a slowly turning drum. Each turn
// of the drum drew one line (say 30 minutes), and the pen shifted down a little for the
// next, so a whole day became a stack of lines read like a book: left to right, then the
// next line down. A quake shows as a burst that spills over its neighbors; the quiet hours
// of the night are thin lines. These functions cut a long record into those lines.
// Pure functions; NaN marks a missing sample.
import { minMaxColumns } from './signal.js';

/**
 * Bridge the gaps in a record (straight line from the last good sample to the next), so a
 * filter can run over the whole day at once. Filtering each gap-free piece on its own would
 * fade both ends of every piece (the taper), which on a day-long record means minutes of
 * fading next to every gap. After filtering, put the gaps back with restoreGaps().
 * @param {ArrayLike<number>} data
 * @returns {{filled: Float32Array, gaps: [number, number][]}} gaps as [start, end) indices
 */
export function bridgeGaps(data) {
  const filled = Float32Array.from(data);
  const gaps = [];
  const n = filled.length;
  for (let i = 0; i < n; i++) {
    if (!Number.isNaN(filled[i])) continue;
    let j = i;
    while (j < n && Number.isNaN(filled[j])) j++;
    gaps.push([i, j]);
    const a = i > 0 ? filled[i - 1] : (j < n ? filled[j] : 0);
    const b = j < n ? filled[j] : a;
    for (let k = i; k < j; k++) filled[k] = a + ((b - a) * (k - i + 1)) / (j - i + 1);
    i = j - 1;
  }
  return { filled, gaps };
}

/** Put NaN back where bridgeGaps() found gaps (changes `data` in place and returns it). */
export function restoreGaps(data, gaps) {
  for (const [a, b] of gaps) for (let i = a; i < b && i < data.length; i++) data[i] = NaN;
  return data;
}

/**
 * The lines of a helicorder: consecutive spans of rowSec seconds from startMs to endMs.
 * @returns {{startMs: number, endMs: number}[]}
 */
export function helicorderRows(startMs, endMs, rowSec) {
  const rows = [];
  for (let t = startMs; t < endMs; t += rowSec * 1000) rows.push({ startMs: t, endMs: Math.min(endMs, t + rowSec * 1000) });
  return rows;
}

/**
 * What one line looks like at nCols columns: the lowest and highest value in each column
 * (NaN where the column has no data), for a record starting at dataStartMs.
 * @param {ArrayLike<number>} data
 * @param {number} sampleRate
 * @param {number} dataStartMs
 * @param {{startMs: number, endMs: number}} row
 * @param {number} nCols
 */
export function rowColumns(data, sampleRate, dataStartMs, row, nCols) {
  const i0 = Math.round(((row.startMs - dataStartMs) / 1000) * sampleRate);
  const i1 = Math.round(((row.endMs - dataStartMs) / 1000) * sampleRate);
  const { min, max } = minMaxColumns(data, i0, i1, nCols);
  // columns that fall before the record starts or after it ends have no data
  for (let c = 0; c < nCols; c++) {
    const a = i0 + (c * (i1 - i0)) / nCols;
    const b = i0 + ((c + 1) * (i1 - i0)) / nCols;
    if (b <= 0 || a >= data.length) { min[c] = NaN; max[c] = NaN; }
  }
  return { min, max };
}

/**
 * Where a value lands on a line, in units of the line spacing, clipped so a big quake
 * spills over at most `clipRows` lines each way (as ink did on the drum).
 * @param {number} value counts
 * @param {number} countsPerRow how many counts move the pen one line spacing
 * @param {number} [clipRows=1.5]
 */
export function penOffset(value, countsPerRow, clipRows = 1.5) {
  return Math.max(-clipRows, Math.min(clipRows, value / countsPerRow));
}
