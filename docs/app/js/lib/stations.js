// Choosing which stations to show for a quake. Pure functions.

import { distanceKm, azimuthDeg } from './geo.js';
import { chooseChannels, channelInfo } from './fdsn.js';

/**
 * Pick stations for a quake: the school stand-ins that are close enough, then
 * helper stations chosen so the set surrounds the quake (one per compass
 * quadrant first, nearest first), up to maxStations.
 *
 * @param {{lat:number, lon:number}} event
 * @param {import('./fdsn.js').Station[]} stations candidates (with channels)
 * @param {Array<{name:string, standIn:{net:string, sta:string}}>} schools
 * @param {object} opt
 * @param {number} opt.maxStandInKm
 * @param {number} opt.maxHelperKm
 * @param {number} opt.maxStations
 * @param {Map<string, number>|Set<string>} [opt.prefer] "NET.STA" keys to prefer
 *   as helpers, e.g. stations with analyst picks, where the arrivals are known
 *   to be clear. A Map gives a rank (0 = best); unlisted stations rank last.
 */
export function selectStations(event, stations, schools, opt) {
  const { maxStandInKm, maxHelperKm, maxStations } = opt;
  const prefer = opt.prefer instanceof Map ? opt.prefer
    : new Map([...(opt.prefer || [])].map((k) => [k, 0]));
  const rank = (s) => prefer.get(`${s.net}.${s.sta}`) ?? 99;
  const usable = [];
  for (const s of stations) {
    const ch = chooseChannels(s);
    if (!ch) continue;
    usable.push({
      net: s.net, sta: s.sta, lat: s.lat, lon: s.lon, elevM: s.elevM,
      loc: ch.loc, channels: ch.channels,
      distKm: distanceKm(event.lat, event.lon, s.lat, s.lon),
      azDeg: azimuthDeg(event.lat, event.lon, s.lat, s.lon),
      schools: [], role: 'helper',
    });
  }
  const byKey = new Map(usable.map((s) => [`${s.net}.${s.sta}`, s]));

  const chosen = [];
  const tooFar = [];
  for (const school of schools) {
    const s = byKey.get(`${school.standIn.net}.${school.standIn.sta}`);
    if (!s) continue;
    if (s.distKm > maxStandInKm) { tooFar.push(school.name); continue; }
    s.schools.push(school.name);
    s.role = 'school';
    if (!chosen.includes(s)) chosen.push(s);
  }

  const quadrant = (s) => Math.floor(s.azDeg / 90) % 4;
  const covered = new Set(chosen.map(quadrant));
  const pool = usable
    .filter((s) => !chosen.includes(s) && s.distKm <= maxHelperKm)
    .sort((a, b) => rank(a) - rank(b) || a.distKm - b.distKm);

  // First pass: fill empty quadrants. Second pass: nearest remaining.
  for (const s of pool) {
    if (chosen.length >= maxStations) break;
    if (!covered.has(quadrant(s))) {
      chosen.push(s);
      covered.add(quadrant(s));
    }
  }
  for (const s of pool) {
    if (chosen.length >= maxStations) break;
    if (!chosen.includes(s)) chosen.push(s);
  }

  // School stations first (in school order), then helpers by station code.
  chosen.sort((a, b) => (a.role === b.role ? 0 : a.role === 'school' ? -1 : 1) ||
    (a.role === 'helper' ? a.sta.localeCompare(b.sta) : 0));
  return { stations: chosen, schoolsTooFar: tooFar };
}

/**
 * Pick stations for a record section: traces stacked by distance, so the
 * arrivals line up and their slope is the wave speed. What matters is an even
 * spread of distances, not surrounding the quake, so the distance range is cut
 * into bands and the best station in each band is kept. (The nearest stations
 * alone would bunch up: around Junction, 15 FORGE stations sit at 49–74 km.)
 *
 * Best within a band: analyst-picked (arrivals known to be clear), then
 * three components, then the station nearest the middle of the band.
 * School stand-ins within maxKm are always added.
 *
 * @param {{lat:number, lon:number}} event
 * @param {import('./fdsn.js').Station[]} stations candidates (with channels)
 * @param {object} [opt]
 * @param {number} [opt.maxKm=300]
 * @param {number} [opt.minKm=0]
 * @param {number} [opt.bandKm=12.5] width of each distance band
 * @param {number} [opt.perBand=1]   stations kept per band
 * @param {Map<string, number>|Set<string>} [opt.prefer] "NET.STA" ranks (0 = best), e.g. pickRanks()
 * @param {Array<{name:string, standIn:{net:string, sta:string}}>} [opt.schools]
 * @param {string[]} [opt.bands] channel band codes to try, best first (see chooseChannels)
 * @returns {{stations: object[], bandsFilled: number, bandsTotal: number}}
 *   stations sorted by distance; each has net, sta, lat, lon, elevM, loc, channels,
 *   chanInfo (metadata per channel), distKm, azDeg (quake -> station),
 *   bazDeg (station -> quake), schools, role ('school' | 'section'), pickRank
 */
export function selectRecordSection(event, stations, opt = {}) {
  const { maxKm = 300, minKm = 0, bandKm = 12.5, perBand = 1, schools = [], bands } = opt;
  const prefer = opt.prefer instanceof Map ? opt.prefer
    : new Map([...(opt.prefer || [])].map((k) => [k, 0]));
  const usable = [];
  for (const s of stations) {
    const ch = chooseChannels(s, bands ? { bands } : undefined);
    if (!ch) continue;
    const distKm = distanceKm(event.lat, event.lon, s.lat, s.lon);
    if (distKm < minKm || distKm > maxKm) continue;
    usable.push({
      net: s.net, sta: s.sta, lat: s.lat, lon: s.lon, elevM: s.elevM,
      loc: ch.loc, channels: ch.channels, chanInfo: channelInfo(s, ch),
      distKm,
      azDeg: azimuthDeg(event.lat, event.lon, s.lat, s.lon),
      bazDeg: azimuthDeg(s.lat, s.lon, event.lat, event.lon),
      schools: [], role: 'section',
      pickRank: prefer.get(`${s.net}.${s.sta}`) ?? 99,
    });
  }

  const nBands = Math.max(1, Math.ceil((maxKm - minKm) / bandKm));
  const byBand = Array.from({ length: nBands }, () => []);
  for (const s of usable) {
    byBand[Math.min(nBands - 1, Math.floor((s.distKm - minKm) / bandKm))].push(s);
  }
  const chosen = new Set();
  byBand.forEach((list, i) => {
    const mid = minKm + (i + 0.5) * bandKm;
    list.sort((a, b) => a.pickRank - b.pickRank ||
      b.channels.length - a.channels.length ||
      Math.abs(a.distKm - mid) - Math.abs(b.distKm - mid));
    list.slice(0, perBand).forEach((s) => chosen.add(s));
  });

  for (const school of schools) {
    const s = usable.find((u) => u.net === school.standIn.net && u.sta === school.standIn.sta);
    if (!s) continue;
    s.schools.push(school.name);
    s.role = 'school';
    chosen.add(s);
  }

  const out = [...chosen].sort((a, b) => a.distKm - b.distKm);
  return { stations: out, bandsFilled: byBand.filter((l) => l.length).length, bandsTotal: nBands };
}
