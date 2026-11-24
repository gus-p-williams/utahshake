// How many stations show a clear S, counted on what each app actually shows, from any
// DataSource (the offline samples or live EarthScope/USGS). Shared by clear-s-check.mjs
// and tests/clear-s.test.js, so the numbers in the quakes' notes are checked with the
// same code that measured them. The measure itself is docs/app/js/lib/clear-s.js.
//
// The importer must stub HTMLElement / customElements first (the vendored seisplotjs
// bundle registers a web component when loaded); node-setup.mjs and the tests do.
import { WAVE_RACE as W, SCHOOLS, FILTERS } from '../../docs/app/js/config.js';
import { QUAKE_EXPLORER as Q, EXPLORER_PRESETS } from '../../docs/app/js/quake-explorer/config.js';
import { loadRecordSection, loadStation, trimToData } from '../../docs/app/js/quake-explorer/data.js';
import { filteredData } from '../../docs/app/js/data/filters.js';
import { selectStations } from '../../docs/app/js/lib/stations.js';
import { picksByStation, pickRanks, chooseChannels } from '../../docs/app/js/lib/fdsn.js';
import { distanceKm } from '../../docs/app/js/lib/geo.js';
import { isFlat, isClipped } from '../../docs/app/js/lib/signal.js';
import { countClearS } from '../../docs/app/js/lib/clear-s.js';
import { SampleSource } from '../../docs/app/js/data/sample-source.js';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

/** The offline samples ("samples": Quake Locator, "explorer": Quake Explorer), read from disk. */
export function sampleSource(list) {
  const fileFetch = async (url) => {
    try {
      return new Response(fs.readFileSync(fileURLToPath(url)));
    } catch {
      return new Response(null, { status: 404 });
    }
  };
  return new SampleSource(new URL('../../docs/app/data/samples/', import.meta.url), { list, fetch: fileFetch });
}

const secAfter = (event, ms) => (ms === undefined ? undefined : (ms - event.timeMs) / 1000);

/**
 * Quake Locator: the stations it picks for this quake (as app.js does), all their
 * components, its default 1–10 Hz filter, the analysts' picks.
 */
export async function quakeLocatorView(source, eventId) {
  const event = await source.getEvent(eventId);
  const [cands, raw] = await Promise.all([
    source.getStations({ lat: event.lat, lon: event.lon, maxKm: Math.max(W.maxStandInKm, W.maxHelperKm), atMs: event.timeMs }),
    source.getAnalystPicks(eventId).catch(() => []),
  ]);
  const analyst = picksByStation(raw);
  const { stations } = selectStations(event, cands, SCHOOLS, { ...W, prefer: pickRanks(analyst) });
  const t0 = event.timeMs - W.preOriginSec * 1000;
  const t1 = event.timeMs + W.postOriginSec * 1000;
  const traces = await source.getWaveforms(
    stations.flatMap((s) => s.channels.map((cha) => ({ net: s.net, sta: s.sta, loc: s.loc, cha }))), t0, t1);
  const filter = FILTERS.find((f) => f.id === 'bp1-10');
  const rows = [];
  const missing = [];
  for (const s of stations) {
    const trs = s.channels.map((cha) => traces.find((t) => t.net === s.net && t.sta === s.sta && t.cha === cha))
      .filter((t) => t && !isFlat(t.data));
    if (!trs.length) { missing.push(s.sta); continue; }
    const p = analyst[`${s.net}.${s.sta}`] || {};
    rows.push({
      sta: s.sta, distKm: s.distKm, clipped: trs.some((t) => isClipped(t.data)),
      components: trs.map((t) => ({ cha: t.cha, data: filteredData(t, filter), sampleRate: t.sampleRate,
        startSec: secAfter(event, t.startMs) })),
      pSec: secAfter(event, p.P), sSec: secAfter(event, p.S),
    });
  }
  return { event, stations: rows, missing };
}

/** P and S at a station from merged arrivals (analyst first, then computer). */
function arrivalsFor(arrivals, key) {
  const get = (ph) => arrivals.find((a) => a.key === key && a.phase === ph);
  const p = get('P');
  const s = get('S');
  return { pSec: p?.tSec, sSec: s?.tSec, sWho: s?.who };
}

/**
 * Quake Explorer A: the record section (one vertical trace per station, 1–10 Hz) and the
 * picks its reveal shows (analyst, else computer).
 */
export async function explorerSectionView(source, eventId) {
  const preset = EXPLORER_PRESETS.find((p) => p.id === eventId);
  const event = await source.getEvent(eventId);
  const maxKm = preset?.sectionKm ?? ((event.mag ?? 0) >= 5 ? 400 : Q.section.maxKm);
  const r = await loadRecordSection(source, eventId, { maxKm, postSec: maxKm > 300 ? 140 : Q.section.postSec });
  const stations = r.traces.map((t) => ({
    sta: t.label, distKm: t.distKm, clipped: t.clipped,
    components: [{ cha: t.chanInfo?.[0]?.cha ?? 'Z', data: t.data, sampleRate: t.sampleRate, startSec: secAfter(event, t.startMs) }],
    ...arrivalsFor(r.arrivals, t.key),
  }));
  return { event: r.event, stations, missing: r.missing };
}

/**
 * Quake Explorer C: the three-component stations its menu offers (within 200 km, as
 * inv-c.js asks), Z N E filtered like C (1–5 Hz), and the picks C uses (analyst, else
 * the saved computer pick).
 */
export async function explorerMotionView(source, eventId) {
  const preset = EXPLORER_PRESETS.find((p) => p.id === eventId);
  const event = await source.getEvent(eventId);
  const reach = preset?.sectionKm ?? ((event.mag ?? 0) >= 5 ? 400 : Q.section.maxKm);
  const cands = (await source.getStations({ lat: event.lat, lon: event.lon, maxKm: reach, atMs: event.timeMs }))
    .map((s) => ({ s, ch: chooseChannels(s), d: distanceKm(event.lat, event.lon, s.lat, s.lon) }))
    .filter((x) => x.ch && x.ch.channels.length === 3 && x.d <= 200)
    .sort((a, b) => a.d - b.d)
    .slice(0, 30);
  const analyst = picksByStation(await source.getAnalystPicks(eventId).catch(() => []));
  const computer = source.getComputerPicks ? await source.getComputerPicks(eventId).catch(() => []) : [];
  const stations = [];
  const missing = [];
  for (const { s, d } of cands) {
    let st = await loadStation(source, event, s, { preSec: 10, postSec: Math.min(150, d / 3.0 + 30) });
    if (!st || !st.n) { missing.push(s.sta); continue; }
    st = trimToData(st);
    const key = `${s.net}.${s.sta}`;
    const pick = (ph) => {
      const a = analyst[key]?.[ph];
      if (a !== undefined) return { t: secAfter(event, a), who: 'analyst' };
      const c = computer.find((x) => `${x.net}.${x.sta}` === key && x.phase === ph);
      return c ? { t: secAfter(event, c.timeMs), who: 'computer' } : null;
    };
    const P = pick('P');
    const S = pick('S');
    const f = (a) => filteredData({ data: a, sampleRate: st.sampleRate }, Q.motion.filter);
    const startSec = secAfter(event, st.startMs);
    stations.push({
      sta: s.sta, distKm: d, clipped: st.clipped,
      components: [['Z', st.z], ['N', st.n], ['E', st.e]].map(([cha, a]) => ({ cha, data: f(a), sampleRate: st.sampleRate, startSec })),
      pSec: P?.t, sSec: S?.t, sWho: S?.who,
    });
  }
  return { event, stations, missing };
}

/** countClearS on a view, with Quake Explorer's crust model. */
export function clearS(view) {
  const c = countClearS(view.stations, view.event.depthKm, Q.model);
  c.rows.forEach((r, i) => { r.clipped = view.stations[i].clipped; });
  return { ...c, missing: view.missing, clipped: view.stations.filter((s) => s.clipped).length };
}
