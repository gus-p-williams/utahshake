// miniSEED bytes -> Trace objects, using the vendored seisplotjs parser.
import { miniseed } from '../../vendor/seisplotjs.js';
import { mergeSegments } from '../lib/signal.js';

/**
 * Parse miniSEED (any number of channels) into one Trace per channel.
 * @param {ArrayBuffer} buffer
 * @param {{fromMs?:number, toMs?:number}} [window] cut/pad every trace to this window
 * @returns {import('../lib/signal.js').Trace[]}
 */
export function parseMiniseed(buffer, window = {}) {
  if (!buffer || buffer.byteLength === 0) return [];
  const records = miniseed.parseDataRecords(buffer);
  const traces = [];
  for (const recs of miniseed.byChannel(records).values()) {
    const segs = miniseed.mergeSegments(recs);
    if (!segs.length) continue;
    const s0 = segs[0];
    const merged = mergeSegments(
      segs.map((s) => ({ startMs: s.startTime.toMillis(), sampleRate: s.sampleRate, data: s.y })),
      window.fromMs, window.toMs);
    traces.push({
      net: s0.networkCode, sta: s0.stationCode, loc: s0.locationCode || '', cha: s0.channelCode,
      ...merged,
    });
  }
  return traces;
}
