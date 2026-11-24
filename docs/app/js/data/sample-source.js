// Offline data bundled with the site (docs/app/data/samples/), for school
// networks that block or throttle the live services. Same interface as the
// live source. Samples are made by tools/samples/fetch-sample.mjs (Wave Race)
// and tools/quake-explorer/make-sample.mjs (Quake Explorer).
import { distanceKm } from '../lib/geo.js';
import { parseMiniseed } from './mseed.js';

const BASE = new URL('../../data/samples/', import.meta.url);
const NEAR_MS = 600000;      // samples start at most 10 minutes before their quake...
const AFTER_MS = 2 * 3600000; // ...and end within 2 hours after it (distant quakes: ~30 min)

export class SampleSource {
  /**
   * @param {URL} [base] folder holding index.json
   * @param {{list?: string, fetch?: (url: URL) => Promise<Response>}} [opt]
   *   list: which list in index.json to use: "samples" (Wave Race, the default)
   *   or "explorer" (Quake Explorer's samples, which have more stations and
   *   longer windows; each folder's sample.json says "kind": "explorer").
   *   fetch: replacement for the browser's fetch (node tests read files).
   */
  constructor(base = BASE, { list = 'samples', fetch: fetchFn } = {}) {
    this.name = 'Offline sample';
    this.live = false;
    this.base = base;
    this.list = list;
    this._fetch = fetchFn || ((url) => fetch(url));
    this._samples = null;
  }

  async _json(url) {
    const res = await this._fetch(url);
    if (!res.ok) throw new Error(`Offline sample missing: ${url}`);
    return res.json();
  }

  /** [{dir, event, stations}] for every bundled sample. */
  async _all() {
    this._samples ||= (async () => {
      const index = await this._json(new URL('index.json', this.base));
      return Promise.all((index[this.list] || []).map(async (dir) => {
        const root = new URL(`${dir}/`, this.base);
        const [event, stations] = await Promise.all([
          this._json(new URL('event.json', root)), this._json(new URL('stations.json', root))]);
        return { dir, root, event, stations };
      }));
    })();
    return this._samples;
  }

  async _sampleFor(eventId) {
    return (await this._all()).find((x) => x.event.id === eventId);
  }

  async getEvents() {
    return (await this._all()).map((s) => s.event).sort((a, b) => b.timeMs - a.timeMs);
  }

  async getEvent(id) {
    const s = await this._sampleFor(id);
    if (!s) throw new Error(`Quake ${id} is not in the offline sample`);
    return s.event;
  }

  /**
   * Stations near (lat, lon). With atMs, only from samples of quakes within
   * 10 minutes of that time, so one quake's sample doesn't offer stations
   * that only have data for another quake.
   */
  async getStations({ lat, lon, maxKm, atMs }) {
    const seen = new Map();
    for (const s of await this._all()) {
      if (atMs !== undefined && Math.abs(s.event.timeMs - atMs) > NEAR_MS) continue;
      for (const st of s.stations) {
        if (distanceKm(lat, lon, st.lat, st.lon) <= maxKm) seen.set(`${st.net}.${st.sta}`, st);
      }
    }
    return [...seen.values()];
  }

  async getWaveforms(requests, startMs, endMs) {
    const want = new Set(requests.map((r) => `${r.net}.${r.sta}.${r.loc}.${r.cha}`));
    const out = [];
    for (const s of await this._all()) {
      const t0 = s.event.timeMs;
      if (endMs < t0 - NEAR_MS || startMs > t0 + AFTER_MS) continue;
      const res = await this._fetch(new URL('waveforms.mseed', s.root));
      if (!res.ok) continue;
      for (const tr of parseMiniseed(await res.arrayBuffer(), { fromMs: startMs, toMs: endMs })) {
        if (want.has(`${tr.net}.${tr.sta}.${tr.loc}.${tr.cha}`)) out.push(tr);
      }
    }
    return out;
  }

  async getAnalystPicks(eventId) {
    const s = await this._sampleFor(eventId);
    if (!s) return [];
    const res = await this._fetch(new URL('picks.json', s.root));
    return res.ok ? res.json() : [];
  }

  /**
   * Computer (AIC) picks saved with Quake Explorer samples, where the analysts
   * made none: [{net, sta, cha, phase, timeMs, snr}]. [] if there are none.
   */
  async getComputerPicks(eventId) {
    const s = await this._sampleFor(eventId);
    if (!s) return [];
    try {
      const res = await this._fetch(new URL('computer-picks.json', s.root));
      return res.ok ? await res.json() : [];
    } catch {
      return [];
    }
  }
}
