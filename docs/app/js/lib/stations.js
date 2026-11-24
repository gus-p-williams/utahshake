// Choosing which stations to show for a quake. Pure functions.

import { distanceKm, azimuthDeg } from './geo.js';
import { chooseChannels } from './fdsn.js';

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
