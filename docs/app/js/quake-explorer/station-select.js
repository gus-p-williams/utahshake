// The "Station" menu that B, C and D share: stations sorted by distance from the quake,
// school stand-ins named after their school, and a sensible first choice.
import { chooseChannels } from '../lib/fdsn.js';
import { distanceKm } from '../lib/geo.js';
import { esc } from '../ui/page.js';

/**
 * Fill a <select> with stations for this quake.
 * @param {HTMLSelectElement} select
 * @param {object} ctx the page context (app.js)
 * @param {{threeC?:boolean, maxKm?:number, farKm?:number, limit?:number}} [opt]
 *   threeC: only stations with three components; farKm: mark farther ones "(far)"
 * @returns {Promise<Array<{key:string, station:object, distKm:number}>>} in menu order
 */
export async function fillStationSelect(select, ctx, opt = {}) {
  const e = ctx.event;
  const list = [];
  for (const s of await ctx.stations()) {
    const ch = chooseChannels(s);
    if (!ch || (opt.threeC && ch.channels.length < 3)) continue;
    const d = distanceKm(e.lat, e.lon, s.lat, s.lon);
    if (opt.maxKm && d > opt.maxKm) continue;
    list.push({ key: `${s.net}.${s.sta}`, station: s, distKm: d });
  }
  list.sort((a, b) => a.distKm - b.distKm);
  const shown = opt.limit ? list.slice(0, opt.limit) : list;
  const far = (d) => (opt.farKm && d > opt.farKm ? ' (far: less reliable)' : '');
  const km = (d) => (d >= 1000 ? `${Math.round(d).toLocaleString('en-US')} km` : `${Math.round(d)} km`);
  select.innerHTML = shown.map((x) =>
    `<option value="${esc(x.key)}">${esc(ctx.label(x.station.sta))}, ${km(x.distKm)}${far(x.distKm)}</option>`).join('');
  const want = [ctx.preset?.station && `UU.${ctx.preset.station}`, ctx.selectedKey].filter(Boolean);
  const first = want.find((k) => shown.some((x) => x.key === k)) ?? shown[0]?.key;
  if (first) select.value = first;
  return shown;
}
