// Offline data bundled with the site (docs/app/data/samples/), for school
// networks that block or throttle the live services. Same interface as the
// live source. Samples are made by tools/samples/fetch-sample.mjs.
import { distanceKm } from '../lib/geo.js';
import { parseMiniseed } from './mseed.js';

const BASE = new URL('../../data/samples/', import.meta.url);

async function getJson(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Offline sample missing: ${url}`);
  return res.json();
}

export class SampleSource {
  constructor(base = BASE) {
    this.name = 'Offline sample';
    this.live = false;
    this.base = base;
    this._samples = null;
  }

  /** [{dir, event, stations}] for every bundled sample. */
  async _all() {
    this._samples ||= (async () => {
      const index = await getJson(new URL('index.json', this.base));
      return Promise.all(index.samples.map(async (dir) => {
        const root = new URL(`${dir}/`, this.base);
        const [event, stations] = await Promise.all([
          getJson(new URL('event.json', root)), getJson(new URL('stations.json', root))]);
        return { dir, root, event, stations };
      }));
    })();
    return this._samples;
  }

  async getEvents() {
    return (await this._all()).map((s) => s.event).sort((a, b) => b.timeMs - a.timeMs);
  }

  async getEvent(id) {
    const s = (await this._all()).find((x) => x.event.id === id);
    if (!s) throw new Error(`Quake ${id} is not in the offline sample`);
    return s.event;
  }

  async getStations({ lat, lon, maxKm }) {
    const seen = new Map();
    for (const s of await this._all()) {
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
      if (endMs < t0 - 600000 || startMs > t0 + 600000) continue;
      const res = await fetch(new URL('waveforms.mseed', s.root));
      if (!res.ok) continue;
      for (const tr of parseMiniseed(await res.arrayBuffer(), { fromMs: startMs, toMs: endMs })) {
        if (want.has(`${tr.net}.${tr.sta}.${tr.loc}.${tr.cha}`)) out.push(tr);
      }
    }
    return out;
  }

  async getAnalystPicks(eventId) {
    const s = (await this._all()).find((x) => x.event.id === eventId);
    if (!s) return [];
    const res = await fetch(new URL('picks.json', s.root));
    return res.ok ? res.json() : [];
  }
}
