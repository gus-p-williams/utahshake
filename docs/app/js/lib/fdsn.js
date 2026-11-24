// Parsers and request builders for the FDSN web services the apps use.
// Pure functions (strings in, plain objects out) so they run in node tests.

/**
 * @typedef {Object} QuakeEvent
 * @property {string} id       ComCat event id, e.g. "uu80162166"
 * @property {number} timeMs   origin time, ms since 1970 (UTC)
 * @property {number} lat
 * @property {number} lon
 * @property {number} depthKm
 * @property {number|null} mag
 * @property {string} magType
 * @property {string} place    e.g. "8 km NW of Junction, Utah"
 * @property {string} url      ComCat event page
 * @property {boolean} hasPhaseData  analyst picks are available
 */

/**
 * @typedef {Object} Channel
 * @property {string} loc
 * @property {string} cha
 * @property {number} sampleRate
 * @property {number} [azimuth]      degrees clockwise from north that a positive count moves
 * @property {number} [dip]          degrees down from horizontal (-90 = vertical, up is positive)
 * @property {number} [sensitivity]  counts per unit of ground motion (see units), at sensitivityFreq
 * @property {number} [sensitivityFreq] Hz
 * @property {string} [units]        "M/S" (velocity), "M" (displacement) or "M/S**2" (acceleration)
 * @property {string} [sensor]       instrument description
 */

/**
 * @typedef {Object} Station
 * @property {string} net
 * @property {string} sta
 * @property {number} lat
 * @property {number} lon
 * @property {number} elevM
 * @property {Channel[]} channels
 */

/** ISO time without the trailing "Z", as FDSN services expect. */
export function fdsnTime(ms) {
  return new Date(ms).toISOString().replace('Z', '');
}

/** USGS ComCat GeoJSON (fdsnws/event, format=geojson) -> QuakeEvent[] */
export function parseUsgsGeoJson(json) {
  const features = json.type === 'Feature' ? [json] : (json.features || []);
  return features.map((f) => {
    const p = f.properties;
    const [lon, lat, depthKm] = f.geometry.coordinates;
    const types = (p.types || '').split(',');
    return {
      id: f.id,
      timeMs: p.time,
      lat,
      lon,
      depthKm,
      mag: p.mag,
      magType: p.magType || '',
      place: p.place || '',
      url: p.url || `https://earthquake.usgs.gov/earthquakes/eventpage/${f.id}`,
      hasPhaseData: types.includes('phase-data'),
    };
  });
}

/**
 * FDSN station service, format=text, level=channel -> Station[]
 *
 * Columns: Network | Station | Location | Channel | Latitude | Longitude |
 * Elevation | Depth | Azimuth | Dip | SensorDescription | Scale | ScaleFreq |
 * ScaleUnits | SampleRate | StartTime | EndTime. "Scale" is the overall
 * sensitivity: how many counts the digitizer records per m/s (or m, or m/s²)
 * of ground motion at ScaleFreq. Azimuth and Dip say which way the sensor
 * points, which particle motion needs.
 */
export function parseStationText(text) {
  const byKey = new Map();
  const num = (s) => (s === undefined || s.trim() === '' ? undefined : Number(s));
  for (const line of text.split(/\r?\n/)) {
    if (!line.trim() || line.startsWith('#')) continue;
    const f = line.split('|');
    if (f.length < 15) continue;
    const [net, sta, loc, cha, lat, lon, elev] = f;
    const key = `${net}.${sta}`;
    if (!byKey.has(key)) {
      byKey.set(key, { net, sta, lat: Number(lat), lon: Number(lon), elevM: Number(elev),
        channels: [] });
    }
    byKey.get(key).channels.push({
      loc, cha, sampleRate: Number(f[14]),
      azimuth: num(f[8]), dip: num(f[9]), sensor: f[10]?.trim() || undefined,
      sensitivity: num(f[11]), sensitivityFreq: num(f[12]),
      units: f[13]?.trim().toUpperCase() || undefined,
    });
  }
  return [...byKey.values()];
}

const BAND_PREFERENCE = ['HH', 'EH', 'BH', 'SH'];
/** Accelerometers ("strong motion"): they don't clip in big nearby quakes. */
export const ACCEL_BANDS = ['HN', 'EN'];
const COMPONENTS = { Z: ['Z'], N: ['N', '1'], E: ['E', '2'] };

/**
 * Pick the best channel set for picking arrivals: a velocity sensor (HH before
 * EH before BH...), three components if available.
 * @param {Station} station
 * @param {{bands?:string[]}} [opt] band codes to try, best first (default:
 *   velocity sensors HH, EH, BH, SH; pass ACCEL_BANDS for accelerometers)
 * @returns {{loc:string, band:string, channels:string[]}|null} channels in Z, N, E order
 *   (a "1"/"2" horizontal takes the N/E slot; see channelInfo for its real direction)
 */
export function chooseChannels(station, { bands = BAND_PREFERENCE } = {}) {
  let best = null;
  for (const band of bands) {
    const locs = new Set(station.channels.filter((c) => c.cha.startsWith(band)).map((c) => c.loc));
    for (const loc of locs) {
      const have = station.channels.filter((c) => c.loc === loc && c.cha.startsWith(band))
        .map((c) => c.cha);
      const chans = [];
      for (const comp of ['Z', 'N', 'E']) {
        const hit = COMPONENTS[comp].map((x) => band + x).find((c) => have.includes(c));
        if (hit) chans.push(hit);
      }
      if (!chans.length || !chans[0].endsWith('Z')) continue;
      const cand = { loc, band, channels: chans };
      if (!best || cand.channels.length > best.channels.length) best = cand;
      if (best.channels.length === 3) return best;
    }
    if (best) return best;
  }
  return best;
}

/**
 * Full metadata (direction, sensitivity, units) of the channels chooseChannels
 * picked, in the same order. Missing fields stay undefined (older sample files
 * keep only loc, cha and sampleRate).
 * @param {Station} station
 * @param {{loc:string, channels:string[]}} choice
 * @returns {Channel[]}
 */
export function channelInfo(station, choice) {
  return choice.channels.map((cha) =>
    station.channels.find((c) => c.loc === choice.loc && c.cha === cha) ?? { loc: choice.loc, cha });
}

/**
 * Body for an FDSN dataselect POST request (one line per channel).
 * @param {Array<{net:string, sta:string, loc:string, cha:string}>} reqs
 */
export function dataselectPostBody(reqs, startMs, endMs) {
  const t0 = fdsnTime(startMs);
  const t1 = fdsnTime(endMs);
  return reqs.map((r) => `${r.net} ${r.sta} ${r.loc || '--'} ${r.cha} ${t0} ${t1}`).join('\n') + '\n';
}

/**
 * Analyst picks from a ComCat "phase-data" QuakeML file.
 * @returns {Array<{net:string, sta:string, loc:string, cha:string, phase:string,
 *   timeMs:number, uncertaintySec:number|null}>}
 */
export function parseQuakeMLPicks(xml) {
  const phaseByPick = new Map();
  for (const m of xml.matchAll(/<arrival\b[\s\S]*?<\/arrival>/g)) {
    const pickId = /<pickID>([^<]+)<\/pickID>/.exec(m[0]);
    const phase = /<phase>([^<]+)<\/phase>/.exec(m[0]);
    if (pickId && phase && !phaseByPick.has(pickId[1].trim())) {
      phaseByPick.set(pickId[1].trim(), phase[1].trim());
    }
  }
  const picks = [];
  for (const m of xml.matchAll(/<pick\s+publicID="([^"]+)"[^>]*>([\s\S]*?)<\/pick>/g)) {
    const body = m[2];
    const time = /<time>\s*<value>([^<]+)<\/value>(?:\s*<uncertainty>([^<]+)<\/uncertainty>)?/.exec(body);
    const wf = /<waveformID\b([^>]*)\/?>/.exec(body);
    if (!time || !wf) continue;
    const attr = (name) => (new RegExp(`${name}="([^"]*)"`).exec(wf[1]) || [])[1] || '';
    const hint = /<phaseHint>([^<]+)<\/phaseHint>/.exec(body);
    const phase = phaseByPick.get(m[1]) || (hint && hint[1].trim()) || '';
    const iso = time[1].trim();
    picks.push({
      net: attr('networkCode'),
      sta: attr('stationCode'),
      loc: attr('locationCode'),
      cha: attr('channelCode'),
      phase,
      timeMs: Date.parse(/[zZ]|[+-]\d\d:?\d\d$/.test(iso) ? iso : iso + 'Z'),
      uncertaintySec: time[2] ? Number(time[2]) : null,
    });
  }
  return picks;
}

/**
 * Rank stations by how useful their analyst picks show them to be:
 * 0 = P and S picked, 1 = P only. For selectStations({prefer}).
 * @returns {Map<string, number>}
 */
export function pickRanks(byStation) {
  const m = new Map();
  for (const [k, p] of Object.entries(byStation)) {
    if (p.P && p.S) m.set(k, 0);
    else if (p.P) m.set(k, 1);
  }
  return m;
}

/** Group analyst picks by station: { "UU.MSU": {P: ms, S: ms} } (first of each). */
export function picksByStation(picks) {
  const out = {};
  for (const p of picks) {
    const ph = p.phase.toUpperCase().startsWith('S') ? 'S'
      : p.phase.toUpperCase().startsWith('P') ? 'P' : null;
    if (!ph) continue;
    const key = `${p.net}.${p.sta}`;
    out[key] ||= {};
    if (out[key][ph] === undefined) out[key][ph] = p.timeMs;
  }
  return out;
}
