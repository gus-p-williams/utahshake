// Band-pass filtering for display and picking (seisplotjs Butterworth filter).
import { filter } from '../../vendor/seisplotjs.js';
import { contiguousRuns, demean, taper } from '../lib/signal.js';
import { bridgeGaps, restoreGaps } from '../lib/helicorder.js';

/**
 * Filtered copy of a long record (hours or a day): the gaps are bridged with straight lines,
 * the whole record is filtered at once (mean removed, ends tapered over `taperSec` seconds,
 * the same 4-pole causal Butterworth band-pass as filteredData), and then the gaps are put
 * back as NaN. Filtering each gap-free piece on its own, as filteredData does, would fade
 * minutes of record beside every gap of a day-long record. This is the shared processing of
 * the data spec's derived products (planning/spec-uhsn-data.md, section 10).
 * @param {import('../lib/signal.js').Trace} trace
 * @param {{lo?:number, hi?:number}} preset no lo/hi = mean removed only
 * @param {{taperSec?: number}} [opt]
 * @returns {Float32Array}
 */
export function filteredLong(trace, preset, { taperSec = 60 } = {}) {
  const { filled, gaps } = bridgeGaps(trace.data);
  if (gaps.length === 1 && gaps[0][0] === 0 && gaps[0][1] === filled.length) return filled.fill(NaN);
  demean(filled);
  if (preset.lo && preset.hi && filled.length > 10) {
    taper(filled, Math.min(0.5, (taperSec * trace.sampleRate) / filled.length));
    const hi = Math.min(preset.hi, 0.9 * trace.sampleRate / 2);
    filter.createButterworth(4, filter.BAND_PASS, preset.lo, hi, 1 / trace.sampleRate).filterInPlace(filled);
  }
  return restoreGaps(filled, gaps);
}

/**
 * Filtered copy of a trace's data. Each gap-free stretch is filtered on its
 * own: mean removed, ends tapered, then a 4-pole Butterworth band-pass.
 * The filter is causal (runs forward in time only), so it never smears
 * energy to before an arrival; that keeps first-motion picks honest.
 * @param {import('../lib/signal.js').Trace} trace
 * @param {{lo?:number, hi?:number}} preset no lo/hi = mean removed only
 * @returns {Float32Array}
 */
export function filteredData(trace, preset) {
  const out = new Float32Array(trace.data.length).fill(NaN);
  const nyquist = trace.sampleRate / 2;
  for (const [a, b] of contiguousRuns(trace.data)) {
    const seg = Float32Array.from(trace.data.subarray(a, b));
    demean(seg);
    if (preset.lo && preset.hi && seg.length > 10) {
      taper(seg, 0.05);
      const hi = Math.min(preset.hi, 0.9 * nyquist);
      const bp = filter.createButterworth(4, filter.BAND_PASS, preset.lo, hi, 1 / trace.sampleRate);
      bp.filterInPlace(seg);
    }
    out.set(seg, a);
  }
  return out;
}
