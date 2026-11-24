// Live data: quakes from the USGS catalog (ComCat), waveforms and station
// lists for University of Utah stations from EarthScope. Both services allow
// requests from any web page (CORS), so this runs entirely in the browser.
import {
  parseUsgsGeoJson, parseStationText, dataselectPostBody, parseQuakeMLPicks, fdsnTime,
} from '../lib/fdsn.js';
import { parseMiniseed } from './mseed.js';

const USGS_EVENT = 'https://earthquake.usgs.gov/fdsnws/event/1/query';
const ES_STATION = 'https://service.earthscope.org/fdsnws/station/1/query';
const ES_DATASELECT = 'https://service.earthscope.org/fdsnws/dataselect/1/query';
const KM_PER_DEG = 111.19;

async function get(url, opts = {}, what = 'data') {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), opts.timeoutMs ?? 45000);
  try {
    const res = await fetch(url, { ...opts, signal: ctrl.signal });
    if (res.status === 204) return null; // FDSN: no data matched
    if (!res.ok) throw new Error(`${what}: server said ${res.status} ${res.statusText}`);
    return res;
  } catch (err) {
    if (err.name === 'AbortError') throw new Error(`${what}: the server took too long to answer`);
    if (err instanceof TypeError) {
      throw new Error(`${what}: could not reach the server (network blocked or offline?)`);
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

export class EarthScopeUSGSSource {
  constructor({ network = 'UU' } = {}) {
    this.name = 'Live: EarthScope + USGS';
    this.live = true;
    this.network = network;
    this._details = new Map();
  }

  async getEvents({ startMs, endMs, minMag, region }) {
    const q = new URLSearchParams({
      format: 'geojson', orderby: 'time', limit: '300',
      starttime: fdsnTime(startMs), endtime: fdsnTime(endMs),
      minmagnitude: String(minMag),
      minlatitude: region.minLat, maxlatitude: region.maxLat,
      minlongitude: region.minLon, maxlongitude: region.maxLon,
    });
    const res = await get(`${USGS_EVENT}?${q}`, {}, 'Quake list');
    return res ? parseUsgsGeoJson(await res.json()) : [];
  }

  async _detail(id) {
    if (!this._details.has(id)) {
      const p = get(`${USGS_EVENT}?format=geojson&eventid=${encodeURIComponent(id)}`, {}, 'Quake details')
        .then((r) => (r ? r.json() : null));
      this._details.set(id, p);
      p.catch(() => this._details.delete(id));
    }
    return this._details.get(id);
  }

  async getEvent(id) {
    const json = await this._detail(id);
    if (!json) throw new Error(`Quake ${id} not found`);
    return parseUsgsGeoJson(json)[0];
  }

  async getStations({ lat, lon, maxKm, atMs }) {
    const q = new URLSearchParams({
      net: this.network, cha: 'HH?,EH?,BH?', level: 'channel', format: 'text',
      latitude: lat.toFixed(4), longitude: lon.toFixed(4),
      maxradius: (maxKm / KM_PER_DEG).toFixed(3),
      startbefore: fdsnTime(atMs), endafter: fdsnTime(atMs),
    });
    const res = await get(`${ES_STATION}?${q}`, {}, 'Station list');
    return res ? parseStationText(await res.text()) : [];
  }

  async getWaveforms(requests, startMs, endMs) {
    if (!requests.length) return [];
    const res = await get(ES_DATASELECT, {
      method: 'POST',
      body: dataselectPostBody(requests, startMs, endMs),
      headers: { 'Content-Type': 'text/plain' },
      timeoutMs: 90000,
    }, 'Waveforms');
    if (!res) return [];
    return parseMiniseed(await res.arrayBuffer(), { fromMs: startMs, toMs: endMs });
  }

  async getAnalystPicks(eventId) {
    const json = await this._detail(eventId);
    const product = json?.properties?.products?.['phase-data']?.[0];
    const url = product?.contents?.['quakeml.xml']?.url;
    if (!url) return [];
    const res = await get(url, {}, 'Analyst picks');
    return res ? parseQuakeMLPicks(await res.text()) : [];
  }
}
