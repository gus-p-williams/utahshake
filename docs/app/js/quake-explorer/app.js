// Quake Explorer page controller: choosing a quake, the four investigation tabs, the page
// address (?event=…&inv=A, plus &source=sample offline) and the CSV of the student's
// answers. Each investigation lives in its own module (inv-a.js … inv-d.js); this file
// only shares one "context" object between them.
import { QUAKE_EXPLORER as Q, EXPLORER_PRESETS, REGION, SCHOOLS } from './config.js';
import { EarthScopeUSGSSource, SampleSource } from '../data/datasource.js';
import { esc, showCredits, showSourceBadge, csvRow, downloadCsv } from '../ui/page.js';
import { distanceKm, centroid } from '../lib/geo.js';
import { picksByStation } from '../lib/fdsn.js';
import { distanceDeg, bodyWaveTimes } from '../lib/teleseism.js';
import { createA } from './inv-a.js';
import { createB } from './inv-b.js';
import { createC } from './inv-c.js';
import { createD } from './inv-d.js';

const $ = (id) => document.getElementById(id);
const DAY_MS = 86400000;
const DISTANT_KM = 1500;          // farther than this from the schools: a "distant" quake (D)
const DISTANT_MIN_MAG = 6.5;
const WORLD = { minLat: -90, maxLat: 90, minLon: -180, maxLon: 180 };
const INVS = ['A', 'B', 'C', 'D'];
const VIEW_INV = { 'record-section': 'A', frequencies: 'B', motion: 'C', distant: 'D' };
const fmtDate = new Intl.DateTimeFormat('en-US', { timeZone: 'America/Denver', year: 'numeric', month: 'short', day: 'numeric' });
const fmtTime = new Intl.DateTimeFormat('en-US', { timeZone: 'America/Denver', hour: 'numeric', minute: '2-digit' });
const fmtUtc = new Intl.DateTimeFormat('en-US', { timeZone: 'UTC', year: 'numeric', month: 'short', day: 'numeric' });

const params = new URLSearchParams(location.search);
const source = params.get('source') === 'sample'
  ? new SampleSource(undefined, { list: 'explorer' }) : new EarthScopeUSGSSource();
const SCHOOL_CENTRE = centroid(SCHOOLS);

/** What the investigation modules share. */
const ctx = {
  source,
  event: null,
  kind: null,            // 'local' (A, B, C) or 'distant' (B, C, D)
  preset: null,
  placeRevealed: false,
  selectedKey: null,     // a station chosen in one investigation, offered first in the others
  _stations: null,
  status,
  /** "TMU (Wasatch Academy)" for school stand-ins, else the station code. */
  label(sta) {
    const names = SCHOOLS.filter((s) => s.standIn.sta === sta).map((s) => s.name.replace(/ High School$/, ''));
    return names.length ? `${sta} (${names.join(', ')})` : sta;
  },
  isSchool(sta) { return SCHOOLS.some((s) => s.standIn.sta === sta); },
  /** Record-section reach for this quake, km. */
  sectionKm() {
    return ctx.preset?.sectionKm ?? ((ctx.event?.mag ?? 0) >= 5 ? 400 : Q.section.maxKm);
  },
  /** Stations to choose from: around the quake (local) or around the schools (distant). */
  async stations() {
    if (!ctx._stations) {
      const e = ctx.event;
      ctx._stations = await (ctx.kind === 'distant'
        ? source.getStations({ lat: SCHOOL_CENTRE.lat, lon: SCHOOL_CENTRE.lon, maxKm: 150, atMs: e.timeMs })
        : source.getStations({ lat: e.lat, lon: e.lon, maxKm: ctx.sectionKm(), atMs: e.timeMs }));
    }
    return ctx._stations;
  },
  selectStation(key) { ctx.selectedKey = key; },
  revealPlace() { ctx.placeRevealed = true; renderSummary(); },
  /** Analyst picks by station ({"UU.MSU": {P: ms, S: ms}}) and saved computer picks. */
  async picks() {
    if (!ctx._picks) {
      const id = ctx.event.id;
      ctx._picks = Promise.all([
        source.getAnalystPicks(id).catch(() => []),
        source.getComputerPicks ? source.getComputerPicks(id).catch(() => []) : Promise.resolve([]),
      ]).then(([a, c]) => ({ analyst: picksByStation(a), computer: c }));
    }
    return ctx._picks;
  },
  /** P and S at one station, seconds after the origin: analyst first, else computer. */
  async arrivalsAt(key) {
    const { analyst, computer } = await ctx.picks();
    const out = {};
    for (const ph of ['P', 'S']) {
      const a = analyst[key]?.[ph];
      const c = computer.find((x) => `${x.net}.${x.sta}` === key && x.phase === ph);
      if (a !== undefined) out[ph] = { tSec: (a - ctx.event.timeMs) / 1000, who: 'analyst' };
      else if (c) out[ph] = { tSec: (c.timeMs - ctx.event.timeMs) / 1000, who: 'computer' };
    }
    return out;
  },
  /** Open another quake (e.g. the blast paired with a quake) in a given investigation. */
  openEvent(id, inv) { return loadEvent(id, inv); },
  /** The iasp91 travel-time table (docs/app/data/traveltimes-iasp91.json), loaded once. */
  travelTimes() {
    ctx._tt ||= fetch(new URL('../../data/traveltimes-iasp91.json', import.meta.url))
      .then((r) => { if (!r.ok) throw new Error('Travel-time table missing'); return r.json(); });
    return ctx._tt;
  },
  /** Earth-model P and S times (s after origin) and distance (degrees) at a station. */
  async modelTimes(station) {
    const e = ctx.event;
    const deg = distanceDeg(e.lat, e.lon, station.lat, station.lon);
    return { ...bodyWaveTimes(await ctx.travelTimes(), deg, Math.max(0, e.depthKm)), deg };
  },
};

const invs = { A: createA(ctx), B: createB(ctx), C: createC(ctx), D: createD(ctx) };
let current = null;
let busy = false;

function status(msg, isError = false) {
  const el = $('event-status');
  el.innerHTML = msg;
  el.classList.toggle('error', isError);
}

function switchUrl(toSample) {
  const p = new URLSearchParams(location.search);
  if (toSample) p.set('source', 'sample'); else p.delete('source');
  p.delete('event');
  p.delete('inv');
  const q = p.toString();
  return `${location.pathname}${q ? `?${q}` : ''}`;
}

function kindOf(e) {
  return distanceKm(e.lat, e.lon, SCHOOL_CENTRE.lat, SCHOOL_CENTRE.lon) > DISTANT_KM ? 'distant' : 'local';
}

// ---------------------------------------------------------------------------
// Choosing a quake

function renderPresets(available) {
  const box = $('presets');
  box.innerHTML = '<span class="hint">Start here:</span>';
  for (const p of EXPLORER_PRESETS) {
    if (available && !available.has(p.id)) continue;
    const b = document.createElement('button');
    b.type = 'button';
    b.innerHTML = `${esc(p.label)} <span class="note">· ${esc(p.note)}</span>`;
    b.addEventListener('click', () => loadEvent(p.id));
    box.append(b);
  }
}

function eventRow(e, cells) {
  const tr = document.createElement('tr');
  tr.innerHTML = `${cells.map((c) => `<td${c.cls ? ` class="${c.cls}"` : ''}>${c.html}</td>`).join('')}
    <td><button type="button">Load</button></td>`;
  tr.querySelector('button').addEventListener('click', () => loadEvent(e.id));
  return tr;
}

async function loadEventLists() {
  status(source.live ? 'Loading Utah quakes and big quakes around the world…' : 'Loading the offline samples…');
  const now = Date.now();
  let local = [];
  let distant = [];
  try {
    if (source.live) {
      [local, distant] = await Promise.all([
        source.getEvents({ startMs: now - Q.recentDays * DAY_MS, endMs: now, minMag: Q.minMagnitude, region: REGION }),
        source.getEvents({ startMs: now - 730 * DAY_MS, endMs: now, minMag: DISTANT_MIN_MAG, region: WORLD }),
      ]);
      distant = distant.filter((e) => kindOf(e) === 'distant');
    } else {
      const all = await source.getEvents();
      local = all.filter((e) => kindOf(e) === 'local');
      distant = all.filter((e) => kindOf(e) === 'distant');
      renderPresets(new Set(all.map((e) => e.id)));
    }
  } catch (err) {
    status(`${esc(err.message)}. You can still use the <a href="${switchUrl(true)}">offline samples</a>.`, true);
    return;
  }
  const lt = $('local-table').querySelector('tbody');
  lt.innerHTML = '';
  for (const e of local) {
    const type = e.eventType || 'earthquake';
    lt.append(eventRow(e, [
      { html: fmtDate.format(e.timeMs) }, { html: fmtTime.format(e.timeMs) },
      { html: `M${e.mag == null ? '?' : e.mag.toFixed(1)}` },
      { html: esc(type), cls: type === 'earthquake' ? '' : 'blast' },
    ]));
  }
  const dt = $('distant-table').querySelector('tbody');
  dt.innerHTML = '';
  for (const e of distant) {
    const deg = distanceDeg(e.lat, e.lon, SCHOOL_CENTRE.lat, SCHOOL_CENTRE.lon);
    dt.append(eventRow(e, [
      { html: fmtUtc.format(e.timeMs) }, { html: `M${e.mag == null ? '?' : e.mag.toFixed(1)}` },
      { html: esc(e.place) }, { html: `${Math.round(deg)}°` },
    ]));
  }
  status(`${local.length} Utah ${local.length === 1 ? 'event' : 'events'}, ${distant.length} big distant ${distant.length === 1 ? 'quake' : 'quakes'}. ` +
    'Choose one, or start with one of the quakes above.');
}

function renderSummary() {
  const e = ctx.event;
  if (!e) return;
  const hide = ctx.preset?.hidePlace && !ctx.placeRevealed;
  const where = hide ? '<i>hidden until you reveal the direction in C</i>' : esc(e.place);
  const away = ctx.kind === 'distant'
    ? `${Math.round(distanceKm(e.lat, e.lon, SCHOOL_CENTRE.lat, SCHOOL_CENTRE.lon)).toLocaleString('en-US')} km
       (${Math.round(distanceDeg(e.lat, e.lon, SCHOOL_CENTRE.lat, SCHOOL_CENTRE.lon))}°) from the schools`
    : '';
  $('quake-summary').innerHTML = `
    <span><b>${ctx.kind === 'distant' ? `${fmtUtc.format(e.timeMs)} (UTC)` : `${fmtDate.format(e.timeMs)}, ${fmtTime.format(e.timeMs)}`}</b></span>
    <span>Magnitude <b>${e.mag == null ? '?' : e.mag.toFixed(1)}</b></span>
    <span>${esc(e.eventType || 'earthquake')}</span>
    <span>Where: ${where}</span>
    ${away ? `<span>${away}</span>` : ''}`;
}

function showChooser(show) {
  $('quake-chooser').hidden = !show;
  $('quake-summary').hidden = show || !ctx.event;
  $('change-quake').hidden = show || !ctx.event;
}

async function loadEvent(id, inv) {
  if (busy) return;
  busy = true;
  document.querySelectorAll('#step-quake button').forEach((b) => { b.disabled = true; });
  try {
    status('Loading the quake…');
    const e = await source.getEvent(id);
    Object.assign(ctx, { event: e, kind: kindOf(e), preset: EXPLORER_PRESETS.find((p) => p.id === id) || null,
      placeRevealed: false, selectedKey: null, _stations: null, _picks: null });
    for (const k of INVS) invs[k].reset();
    const p = new URLSearchParams(location.search);
    p.set('event', id);
    history.replaceState(null, '', `${location.pathname}?${p}`);
    renderSummary();
    status('');
    showChooser(false);
    $('workspace').hidden = false;
    for (const k of INVS) {
      const why = invs[k].available();
      const tab = $(`tab-${k}`);
      tab.disabled = why !== true;
      tab.title = why === true ? '' : why;
    }
    const wanted = inv || VIEW_INV[ctx.preset?.views?.[0]] || (ctx.kind === 'distant' ? 'D' : 'A');
    await selectInv(invs[wanted].available() === true ? wanted : INVS.find((k) => invs[k].available() === true));
  } catch (err) {
    status(`${esc(err.message)}.${source.live ? ` If the school network blocks the data services, use the <a href="${switchUrl(true)}">offline samples</a>.` : ''}`, true);
    showChooser(true);
  } finally {
    busy = false;
    document.querySelectorAll('#step-quake button').forEach((b) => { b.disabled = false; });
  }
}

async function selectInv(k) {
  if (!k) return;
  current = k;
  for (const x of INVS) {
    const on = x === k;
    $(`tab-${x}`).setAttribute('aria-selected', String(on));
    $(`tab-${x}`).tabIndex = on ? 0 : -1;
    $(`inv-${x}`).hidden = !on;
  }
  const p = new URLSearchParams(location.search);
  p.set('inv', k);
  history.replaceState(null, '', `${location.pathname}?${p}`);
  try {
    await invs[k].show();
  } catch (err) {
    invs[k].error?.(err);
    console.error(err);
  }
}

function downloadAnswers() {
  const e = ctx.event;
  if (!e) return;
  const lines = [
    `# Quake Explorer answers for ${e.id} (M${e.mag}), downloaded ${new Date().toISOString()}`,
    csvRow(['investigation', 'what', 'value', 'unit', 'note']),
  ];
  for (const k of INVS) for (const r of invs[k].csvRows()) lines.push(csvRow([k, ...r]));
  downloadCsv(`quake-explorer-${e.id}.csv`, lines);
}

// ---------------------------------------------------------------------------
// Start

function init() {
  showCredits($('credits'), ['waveforms', 'events', 'map', 'traveltimes']);
  showSourceBadge($('source-badge'), source);
  const sw = $('source-switch');
  sw.href = switchUrl(source.live);
  sw.textContent = source.live ? 'Use the offline samples' : 'Use live data';
  if (source.live) renderPresets(null);

  $('change-quake').addEventListener('click', () => showChooser(true));
  $('download').addEventListener('click', downloadAnswers);
  for (const k of INVS) {
    $(`tab-${k}`).addEventListener('click', () => selectInv(k));
    // Arrow keys move between tabs, as screen-reader users expect of a tab list.
    $(`tab-${k}`).addEventListener('keydown', (ev) => {
      if (ev.key !== 'ArrowRight' && ev.key !== 'ArrowLeft') return;
      const open = INVS.filter((x) => !$(`tab-${x}`).disabled);
      const i = open.indexOf(k) + (ev.key === 'ArrowRight' ? 1 : -1);
      const next = open[(i + open.length) % open.length];
      $(`tab-${next}`).focus();
      selectInv(next);
    });
  }

  loadEventLists();
  const id = params.get('event');
  if (id) loadEvent(id, INVS.includes(params.get('inv')) ? params.get('inv') : undefined);
}

init();
