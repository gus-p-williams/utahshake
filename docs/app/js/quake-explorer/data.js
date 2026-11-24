// Getting one quake's data ready for Quake Explorer's views, from any
// DataSource (live EarthScope/USGS or the offline samples). No drawing here.
import { picksByStation, pickRanks, chooseChannels, channelInfo } from '../lib/fdsn.js';
import { selectRecordSection } from '../lib/stations.js';
import { distanceKm, azimuthDeg } from '../lib/geo.js';
import { toVelocity } from '../lib/units.js';
import { isFlat, isClipped } from '../lib/signal.js';
import { aicPick, searchWindow } from '../lib/picker.js';
import { rotateHorizontals, verticalUp } from '../lib/motion.js';
import { filteredData } from '../data/filters.js';
import { QUAKE_EXPLORER, SCHOOLS } from './config.js';

/**
 * @typedef {Object} Arrival
 * @property {string} key    "NET.STA"
 * @property {'P'|'S'} phase
 * @property {number} tSec   seconds after the origin time
 * @property {'analyst'|'computer'} who
 * @property {number} [snr]  computer picks: how clearly the arrival stands out
 */

/**
 * Analyst picks first; computer picks only where the analysts made none and
 * the arrival stands out clearly (snr at least minSnr[phase]).
 * @returns {Arrival[]}
 */
export function mergeArrivals(event, analystPicks, computerPicks = [], minSnr = QUAKE_EXPLORER.computerPickSnr) {
  const out = [];
  const by = picksByStation(analystPicks);
  for (const [key, p] of Object.entries(by)) {
    for (const phase of ['P', 'S']) {
      if (p[phase] !== undefined) out.push({ key, phase, tSec: (p[phase] - event.timeMs) / 1000, who: 'analyst' });
    }
  }
  for (const c of computerPicks) {
    const key = `${c.net}.${c.sta}`;
    if (by[key]?.[c.phase] !== undefined || c.snr < (minSnr[c.phase] ?? 0)) continue;
    out.push({ key, phase: c.phase, tSec: (c.timeMs - event.timeMs) / 1000, who: 'computer', snr: c.snr });
  }
  return out;
}

/**
 * Everything the record-section view needs for one quake.
 * @param {object} source a DataSource
 * @param {string} eventId
 * @param {object} [opt] overrides for QUAKE_EXPLORER.section
 * @returns {Promise<{event:object, traces:object[], arrivals:Arrival[], missing:string[],
 *   window:{startMs:number, endMs:number}}>} traces sorted by distance, each:
 *   { key, label, distKm, azDeg, bazDeg, role, schools, chanInfo, sampleRate, startMs,
 *     raw (counts), data (filtered counts), velocity (m/s or null), velocityApprox, clipped }
 */
export async function loadRecordSection(source, eventId, opt = {}) {
  const cfg = { ...QUAKE_EXPLORER.section, ...opt };
  const event = await source.getEvent(eventId);
  const analyst = await source.getAnalystPicks(eventId);
  const candidates = await source.getStations({ lat: event.lat, lon: event.lon, maxKm: cfg.maxKm,
    atMs: event.timeMs, channels: cfg.channels });
  const { stations } = selectRecordSection(event, candidates, { maxKm: cfg.maxKm, bandKm: cfg.bandKm,
    prefer: pickRanks(picksByStation(analyst)), schools: SCHOOLS });
  const startMs = event.timeMs - cfg.preSec * 1000;
  const endMs = event.timeMs + cfg.postSec * 1000;
  const raw = await source.getWaveforms(
    stations.map((s) => ({ net: s.net, sta: s.sta, loc: s.loc, cha: s.channels[0] })), startMs, endMs);

  const traces = [];
  const missing = [];
  for (const s of stations) {
    const tr = raw.find((t) => t.net === s.net && t.sta === s.sta && t.cha === s.channels[0]);
    if (!tr || isFlat(tr.data)) { missing.push(s.sta); continue; }
    const data = filteredData(tr, cfg.filter);
    const v = toVelocity(data, s.chanInfo[0]);
    traces.push({
      key: `${s.net}.${s.sta}`, label: s.sta, distKm: s.distKm, azDeg: s.azDeg, bazDeg: s.bazDeg,
      role: s.role, schools: s.schools, chanInfo: s.chanInfo,
      sampleRate: tr.sampleRate, startMs: tr.startMs, raw: tr.data, data,
      velocity: v ? v.data : null, velocityApprox: v ? v.approx : false,
      clipped: isClipped(tr.data),
    });
  }

  let computer = source.getComputerPicks ? await source.getComputerPicks(eventId) : null;
  if (!computer) computer = computerPicks(event, traces, analyst);
  return { event, traces, arrivals: mergeArrivals(event, analyst, computer), missing, window: { startMs, endMs } };
}

/**
 * AIC picks on the record-section traces where the analysts made none (the
 * live source has no saved computer picks).
 */
export function computerPicks(event, traces, analystPicks) {
  const by = picksByStation(analystPicks);
  const out = [];
  for (const t of traces) {
    const [net, sta] = t.key.split('.');
    const startSec = (t.startMs - event.timeMs) / 1000;
    let pSec = by[t.key]?.P !== undefined ? (by[t.key].P - event.timeMs) / 1000 : undefined;
    if (pSec === undefined) {
      const p = aicPick(t.data, t.sampleRate, startSec, ...searchWindow('P', t.distKm));
      if (p) { out.push({ net, sta, phase: 'P', timeMs: event.timeMs + p.tSec * 1000, snr: p.snr }); pSec = p.tSec; }
    }
    if (by[t.key]?.S === undefined && pSec !== undefined && t.distKm <= 260) {
      const [s0, s1] = searchWindow('S', t.distKm, pSec);
      if (startSec + t.data.length / t.sampleRate > s1) {
        const s = aicPick(t.data, t.sampleRate, startSec, s0, s1);
        if (s) out.push({ net, sta, phase: 'S', timeMs: event.timeMs + s.tSec * 1000, snr: s.snr });
      }
    }
  }
  return out;
}

/**
 * One station's three components, turned to up / north / east (raw counts,
 * mean not removed: filter per view with filteredData). Horizontal sensors
 * installed off-north ("1"/"2" channels) are rotated using their azimuths.
 * @param {object} source a DataSource
 * @param {object} event
 * @param {object} station a Station (with channel metadata)
 * @param {{preSec?:number, postSec?:number}} [win]
 * @returns {Promise<null|{key:string, label:string, distKm:number, bazDeg:number,
 *   sampleRate:number, startMs:number, z:Float32Array, n:Float32Array|null,
 *   e:Float32Array|null, chanInfo:object[], clipped:boolean, traces:object[]}>}
 *   n and e are null for a vertical-only station; null if no data came back
 */
export async function loadStation(source, event, station, win = {}) {
  const ch = chooseChannels(station);
  if (!ch) return null;
  const info = channelInfo(station, ch);
  const distKm = distanceKm(event.lat, event.lon, station.lat, station.lon);
  const preSec = win.preSec ?? 10;
  const postSec = win.postSec ?? Math.max(60, distKm / 3.0 + 30);
  const traces = await source.getWaveforms(ch.channels.map((cha) => ({ net: station.net, sta: station.sta, loc: ch.loc, cha })),
    event.timeMs - preSec * 1000, event.timeMs + postSec * 1000);
  const get = (cha) => traces.find((t) => t.cha === cha && t.sta === station.sta);
  const [tz, t1, t2] = ch.channels.map(get);
  if (!tz) return null;
  const out = {
    key: `${station.net}.${station.sta}`, label: station.sta, distKm,
    bazDeg: azimuthDeg(station.lat, station.lon, event.lat, event.lon),
    sampleRate: tz.sampleRate, startMs: tz.startMs, chanInfo: info, traces,
    z: verticalUp(tz.data, info[0].dip ?? -90), n: null, e: null,
    clipped: traces.some((t) => isClipped(t.data)),
  };
  if (t1 && t2 && t1.sampleRate === tz.sampleRate && t2.sampleRate === tz.sampleRate) {
    const { n, e } = rotateHorizontals(t1.data, t2.data, info[1].azimuth ?? 0, info[2].azimuth ?? 90);
    out.n = n;
    out.e = e;
  }
  return out;
}
