// Band-pass filtering for display and picking (seisplotjs Butterworth filter).
import { filter } from '../../vendor/seisplotjs.js';
import { contiguousRuns, demean, taper } from '../lib/signal.js';

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
