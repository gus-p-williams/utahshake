// Fetch data for the figure scripts, with a local cache.
//
// Waveforms: University of Utah (UU) and other open stations via EarthScope FDSN dataselect.
// Events and picks: USGS ComCat (FDSN event service). Never Raspberry Shake servers (license).
//
// Downloads are cached in tools/figures/.cache/ (git-ignored), keyed by URL, so a figure
// script can be rerun offline. Delete the folder to fetch everything again.
import fs from 'node:fs';
import crypto from 'node:crypto';

// The seisplotjs bundle registers a web component when loaded; stub it for node.
globalThis.HTMLElement ??= class {};
globalThis.customElements ??= { define() {}, get() {} };
const { parseMiniseed } = await import('../../docs/app/js/data/mseed.js');
const { parseQuakeMLPicks, picksByStation } = await import('../../docs/app/js/lib/fdsn.js');

const CACHE = new URL('./.cache/', import.meta.url);
export const DATASELECT = 'https://service.earthscope.org/fdsnws/dataselect/1/query';
export const STATION = 'https://service.earthscope.org/fdsnws/station/1/query';
export const EVENT = 'https://earthquake.usgs.gov/fdsnws/event/1/query';

const iso = (ms) => new Date(ms).toISOString().replace('Z', '');

/**
 * GET a URL, cached on disk. Returns a Buffer, or null when the service has no data
 * (HTTP 204 or 404). Other errors throw.
 */
export async function fetchCached(url) {
  fs.mkdirSync(CACHE, { recursive: true });
  const key = crypto.createHash('sha1').update(url).digest('hex').slice(0, 20);
  const file = new URL(key, CACHE);
  const empty = new URL(key + '.empty', CACHE);
  if (fs.existsSync(file)) return fs.readFileSync(file);
  if (fs.existsSync(empty)) return null;
  for (let attempt = 1; ; attempt++) {
    const res = await fetch(url);
    if (res.status === 204 || res.status === 404) { fs.writeFileSync(empty, url + '\n'); return null; }
    if (res.ok) {
      const buf = Buffer.from(await res.arrayBuffer());
      fs.writeFileSync(file, buf);
      fs.appendFileSync(new URL('index.txt', CACHE), `${key} ${url}\n`);
      return buf;
    }
    if (attempt >= 3 || res.status < 500) throw new Error(`HTTP ${res.status} for ${url}`);
    await new Promise((r) => setTimeout(r, 2000 * attempt));
  }
}

/**
 * Waveforms for one station from EarthScope, cut (and NaN-padded) to [startMs, endMs).
 * cha may use wildcards ('HH?'). Returns the app's Trace objects (one per channel), sorted Z, N, E.
 */
export async function waveforms({ net = 'UU', sta, loc = '*', cha, startMs, endMs }) {
  const q = new URLSearchParams({ net, sta, loc, cha, start: iso(startMs), end: iso(endMs) });
  const buf = await fetchCached(`${DATASELECT}?${q}`);
  if (!buf) return [];
  const traces = parseMiniseed(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.length),
    { fromMs: startMs, toMs: endMs });
  const order = (t) => 'Z12NE3'.indexOf(t.cha.at(-1));
  return traces.sort((a, b) => a.loc.localeCompare(b.loc) || a.cha.slice(0, 2).localeCompare(b.cha.slice(0, 2))
    || order(a) - order(b));
}

/** One ComCat event by id: {id, timeMs, lat, lon, depthKm, mag, magType, place, type}. */
export async function event(id) {
  const buf = await fetchCached(`${EVENT}?eventid=${id}&format=geojson`);
  const f = JSON.parse(buf.toString('utf8'));
  return featureToEvent(f);
}

/** ComCat search (FDSN event parameters, e.g. {starttime, minmagnitude, eventtype}). */
export async function events(params) {
  const q = new URLSearchParams({ format: 'geojson', orderby: 'time', ...params });
  const buf = await fetchCached(`${EVENT}?${q}`);
  return buf ? JSON.parse(buf.toString('utf8')).features.map(featureToEvent) : [];
}

/**
 * UUSS analyst picks for a ComCat event, by station: {"UU.FLU": {P: ms, S: ms}} (first of
 * each). Empty if the event has no phase data.
 */
export async function analystPicks(id) {
  const detail = JSON.parse((await fetchCached(`${EVENT}?eventid=${id}&format=geojson`)).toString('utf8'));
  const url = detail.properties.products?.['phase-data']?.[0]?.contents?.['quakeml.xml']?.url;
  if (!url) return {};
  const xml = await fetchCached(url);
  return xml ? picksByStation(parseQuakeMLPicks(xml.toString('utf8'))) : {};
}

function featureToEvent(f) {
  const [lon, lat, depthKm] = f.geometry.coordinates;
  const p = f.properties;
  return { id: f.id, timeMs: p.time, lat, lon, depthKm, mag: p.mag, magType: p.magType, place: p.place,
    type: p.type, title: p.title };
}

/** Station coordinates from EarthScope: {lat, lon, elev} for net.sta. */
export async function stationCoords(net, sta) {
  const buf = await fetchCached(`${STATION}?net=${net}&sta=${sta}&level=station&format=text`);
  const line = buf.toString('utf8').trim().split('\n').find((l) => !l.startsWith('#'));
  const [, , lat, lon, elev] = line.split('|');
  return { lat: +lat, lon: +lon, elev: +elev };
}
