// Wave Race: pick P and S on real seismograms, turn S-minus-P times into
// distances, and locate a Utah quake. See docs/apps/wave-race.md.
import { REGION, SCHOOLS, WAVE_RACE as W, FILTERS, PRESET_EVENTS, ATTRIBUTION } from '../config.js';
import { sourceFromUrl } from '../data/datasource.js';
import { filteredData } from '../data/filters.js';
import { isFlat } from '../lib/signal.js';
import { selectStations } from '../lib/stations.js';
import { picksByStation, pickRanks } from '../lib/fdsn.js';
import { distanceKm } from '../lib/geo.js';
import { kmPerSecond, spToDistanceKm, hypoToEpiKm, locateGrid, misfitAt } from '../lib/locate.js';
import { TraceView } from '../ui/trace-view.js';
import { MapView } from '../ui/map-view.js';
import { esc, showCredits, showSourceBadge, csvRow, downloadCsv } from '../ui/page.js';

const $ = (id) => document.getElementById(id);
const PALETTE = ['#e6194b', '#3cb44b', '#4363d8', '#f58231', '#911eb4',
  '#0ea5b7', '#f032e6', '#9a6324', '#469990', '#808000'];
const DAY_MS = 86400000;

const fmtDate = new Intl.DateTimeFormat('en-US', { timeZone: 'America/Denver',
  weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' });
const fmtTime = new Intl.DateTimeFormat('en-US', { timeZone: 'America/Denver',
  hour: 'numeric', minute: '2-digit', second: '2-digit', timeZoneName: 'short' });

const source = sourceFromUrl();
const params = new URLSearchParams(location.search);

const state = {
  event: null,
  stations: [],      // chosen stations that have data (see loadEvent)
  selected: null,    // station key
  picks: {},         // key -> {P: ms, S: ms}
  analyst: {},       // key -> {P, S} from UUSS analysts
  showAnalyst: false,
  filterId: 'bp1-10',
  vp: W.vp, vs: W.vs, depthKm: W.depthKm,
  solution: null,    // best fit from the picks (grid search)
  fitObs: [],        // the stations that best fit used
  fitNote: '',       // shown in place of the best fit (errors, "press again")
  guess: null,       // {lat, lon} the student placed on the map
  placing: false,    // map clicks place the guess
  revealed: false,
  busy: false,
};

let picker;
let map;
const minis = new Map();

// ---------------------------------------------------------------------------
// Small helpers

function status(msg, isError = false) {
  const el = $('event-status');
  el.innerHTML = msg;
  el.classList.toggle('error', isError);
}

function storageKey(id) { return `uhsn.waveRace.picks.${id}`; }
function savePicks() {
  try { localStorage.setItem(storageKey(state.event.id), JSON.stringify(state.picks)); } catch { /* private mode */ }
}
function loadPicks(id) {
  try { return JSON.parse(localStorage.getItem(storageKey(id)) || '{}') || {}; } catch { return {}; }
}
function guessKey(id) { return `uhsn.waveRace.guess.${id}`; }
function saveGuess() {
  try {
    if (state.guess) localStorage.setItem(guessKey(state.event.id), JSON.stringify(state.guess));
    else localStorage.removeItem(guessKey(state.event.id));
  } catch { /* private mode */ }
}
function loadGuess(id) {
  try {
    const g = JSON.parse(localStorage.getItem(guessKey(id)) || 'null');
    return g && Number.isFinite(g.lat) && Number.isFinite(g.lon) ? { lat: g.lat, lon: g.lon } : null;
  } catch { return null; }
}

function fmtLatLon(p) { return `${p.lat.toFixed(3)}° N, ${Math.abs(p.lon).toFixed(3)}° W`; }

function station(key) { return state.stations.find((s) => s.key === key); }

function speedsOk() { return state.vp > 0 && state.vs > 0 && state.vs < state.vp; }

/** S-minus-P (s) and distance (km) for a station, or null. */
function measure(key) {
  const p = state.picks[key];
  if (!p || p.P == null || p.S == null) return null;
  const sp = (p.S - p.P) / 1000;
  if (sp <= 0) return { sp, bad: 'S must come after P' };
  if (!speedsOk()) return { sp, bad: 'check the speeds' };
  const distKm = spToDistanceKm(sp, state.vp, state.vs);
  return { sp, distKm, epiKm: hypoToEpiKm(distKm, state.depthKm) };
}

function secAfterOrigin(ms) { return ((ms - state.event.timeMs) / 1000).toFixed(2); }

function filtered(st, tr) {
  const k = `${tr.cha}|${state.filterId}`;
  if (!st.cache.has(k)) {
    const preset = FILTERS.find((f) => f.id === state.filterId) || FILTERS[0];
    st.cache.set(k, filteredData(tr, preset));
  }
  return st.cache.get(k);
}

function displayTraces(st, onlyFirst = false) {
  const trs = onlyFirst ? st.traces.slice(0, 1) : st.traces;
  return trs.map((tr) => ({ label: onlyFirst ? '' : tr.cha, data: filtered(st, tr),
    startMs: tr.startMs, sampleRate: tr.sampleRate }));
}

// ---------------------------------------------------------------------------
// Step 1: quakes

function nearSchools(e) {
  return SCHOOLS.some((s) => distanceKm(e.lat, e.lon, s.lat, s.lon) <= W.nearSchoolKm);
}

function renderPresets(available) {
  const box = $('presets');
  box.innerHTML = '<span class="hint">Classic quakes:</span>';
  for (const p of PRESET_EVENTS) {
    if (available && !available.has(p.id)) continue;
    const b = document.createElement('button');
    b.type = 'button';
    b.textContent = p.label;
    b.addEventListener('click', () => loadEvent(p.id));
    box.append(b);
  }
}

async function loadEventList() {
  status(source.live ? `Loading Utah quakes of magnitude ${W.minMagnitude}+ from the last ${W.recentDays} days…`
    : 'Loading the offline sample…');
  let events;
  try {
    const now = Date.now();
    events = await source.getEvents({ startMs: now - W.recentDays * DAY_MS, endMs: now,
      minMag: W.minMagnitude, region: REGION });
  } catch (err) {
    status(`${esc(err.message)}. You can still use the <a href="${switchUrl(true)}">offline sample</a>.`, true);
    return;
  }
  if (!source.live) renderPresets(new Set(events.map((e) => e.id)));
  const tbody = $('event-table').querySelector('tbody');
  tbody.innerHTML = '';
  for (const e of events) {
    const tr = document.createElement('tr');
    const near = nearSchools(e);
    tr.innerHTML = `<td>${fmtDate.format(e.timeMs)}</td><td>${fmtTime.format(e.timeMs)}</td>
      <td>M${e.mag == null ? '?' : e.mag.toFixed(1)}</td>
      <td class="near" title="${near ? 'Near the UHSN schools' : ''}">${near ? '★' : ''}</td>
      <td><button type="button">Load</button></td>`;
    tr.querySelector('button').addEventListener('click', () => loadEvent(e.id));
    tbody.append(tr);
  }
  status(events.length
    ? `${events.length} ${events.length === 1 ? 'quake' : 'quakes'}. Pick one, or a classic quake above.${source.live ? ' Quakes of magnitude 3 and up are easiest.' : ''}`
    : 'No quakes found.');
}

function switchUrl(toSample) {
  const p = new URLSearchParams(location.search);
  if (toSample) p.set('source', 'sample'); else p.delete('source');
  p.delete('event');
  const q = p.toString();
  return `${location.pathname}${q ? `?${q}` : ''}`;
}

function renderSummary() {
  const e = state.event;
  const where = state.revealed ? esc(e.place) : '<i>hidden until you reveal the answer</i>';
  $('quake-summary').innerHTML = `
    <span><b>${fmtDate.format(e.timeMs)}, ${fmtTime.format(e.timeMs)}</b></span>
    <span>Magnitude <b>${e.mag == null ? '?' : e.mag.toFixed(1)}</b></span>
    <span>${state.stations.length} stations</span>
    <span>Where: ${where}</span>`;
}

function showChooser(show) {
  $('quake-chooser').hidden = !show;
  $('quake-summary').hidden = show || !state.event;
  $('change-quake').hidden = show || !state.event;
}

// ---------------------------------------------------------------------------
// Loading a quake

async function loadEvent(id) {
  if (state.busy) return;
  state.busy = true;
  document.querySelectorAll('#event-table button, #presets button').forEach((b) => { b.disabled = true; });
  showChooser(true);
  try {
    status('Loading the quake…');
    const ev = await source.getEvent(id);
    status('Finding seismic stations near the quake…');
    const [cands, rawPicks] = await Promise.all([
      source.getStations({ lat: ev.lat, lon: ev.lon, maxKm: Math.max(W.maxStandInKm, W.maxHelperKm), atMs: ev.timeMs }),
      source.getAnalystPicks(id).catch(() => []),
    ]);
    const analyst = picksByStation(rawPicks);
    const { stations: chosen, schoolsTooFar } = selectStations(ev, cands, SCHOOLS,
      { ...W, prefer: pickRanks(analyst) });
    if (!chosen.length) throw new Error('No University of Utah stations are close enough to this quake');

    status(`Downloading seismograms from ${chosen.length} stations…`);
    const t0 = ev.timeMs - W.preOriginSec * 1000;
    const t1 = ev.timeMs + W.postOriginSec * 1000;
    const reqs = chosen.flatMap((s) => s.channels.map((cha) => ({ net: s.net, sta: s.sta, loc: s.loc, cha })));
    const traces = await source.getWaveforms(reqs, t0, t1);

    const withData = [];
    const missing = [];
    for (const s of chosen) {
      const trs = s.channels.map((cha) => traces.find((t) => t.net === s.net && t.sta === s.sta && t.cha === cha))
        .filter((t) => t && !isFlat(t.data));
      if (trs.length) withData.push({ ...s, key: `${s.net}.${s.sta}`, traces: trs, cache: new Map() });
      else missing.push(s.sta);
    }
    if (withData.length < 3) throw new Error('Fewer than 3 stations have data for this quake; try another one');
    withData.forEach((s, i) => { s.color = PALETTE[i % PALETTE.length]; });

    Object.assign(state, { event: ev, stations: withData, analyst, picks: loadPicks(id),
      solution: null, fitObs: [], fitNote: '', guess: loadGuess(id), revealed: false, showAnalyst: false });
    const p = new URLSearchParams(location.search);
    p.set('event', id);
    history.replaceState(null, '', `${location.pathname}?${p}`);

    const notes = [];
    if (missing.length) notes.push(`No usable data from ${missing.join(', ')}.`);
    if (schoolsTooFar.length) notes.push(`Too far for: ${schoolsTooFar.join(', ')}.`);
    status(notes.join(' '));
    showWorkspace();
  } catch (err) {
    status(`${esc(err.message)}.${source.live ? ` If the school network blocks the data services, use the <a href="${switchUrl(true)}">offline sample</a>.` : ''}`, true);
  } finally {
    state.busy = false;
    document.querySelectorAll('#event-table button, #presets button').forEach((b) => { b.disabled = false; });
  }
}

function showWorkspace() {
  $('workspace').hidden = false;
  renderSummary();
  showChooser(false);
  if (!map) {
    map = new MapView($('map'), { onStationClick: (key) => { select(key); revealPicker(); }, onGuess });
    map.showSchools(SCHOOLS);
  }
  map.invalidate();
  map.showStations(state.stations);
  map.setSolution(null);
  map.setOfficial(null);
  map.setGuess(state.guess);
  setPlacing(false);
  map.fitTo([...state.stations, ...SCHOOLS]);
  $('answer').hidden = true;
  renderFit();
  renderStationList();
  select(state.stations[0].key);
  updateDistances();
}

// ---------------------------------------------------------------------------
// Step 2: picking

function renderStationList() {
  const list = $('station-list');
  list.innerHTML = '';
  minis.clear();
  for (const st of state.stations) {
    const row = document.createElement('div');
    row.className = 'station-row';
    row.dataset.key = st.key;
    row.tabIndex = 0;
    const role = st.schools.length ? `stands in for ${st.schools.join(' & ')}` : 'helper station';
    row.innerHTML = `
      <div class="name"><span class="swatch" style="background:${st.color}"></span>
        <div>${esc(st.sta)}<small>${esc(role)}</small></div></div>
      <canvas class="trace-canvas mini" aria-hidden="true"></canvas>
      <div class="numbers"></div>`;
    row.addEventListener('click', () => { select(st.key); revealPicker(); });
    row.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); select(st.key); revealPicker(); }
    });
    list.append(row);
    const view = new TraceView(row.querySelector('canvas'), { axis: false });
    minis.set(st.key, view);
    view.setData(displayTraces(st, true), state.event.timeMs, -W.preOriginSec, W.postOriginSec);
    view.setPicks(state.picks[st.key]);
    updateRowNumbers(st.key);
  }
}

function updateRowNumbers(key) {
  const row = document.querySelector(`.station-row[data-key="${CSS.escape(key)}"]`);
  if (!row) return;
  const m = measure(key);
  const p = state.picks[key] || {};
  let html;
  if (m && m.bad) html = `<span class="warn">${m.bad}</span>`;
  else if (m) html = `S−P <b>${m.sp.toFixed(2)} s</b><br>→ <b>${m.distKm.toFixed(1)} km</b>`;
  else if (p.P != null) html = 'P ✓ · now pick S';
  else html = 'pick P and S';
  row.querySelector('.numbers').innerHTML = html;
}

/** Scroll the page so the big seismogram is on screen (small laptop screens). */
function revealPicker() {
  const c = $('picker');
  const r = c.getBoundingClientRect();
  if (r.top < 0 || r.bottom > window.innerHeight) {
    $('picker-title').scrollIntoView({ block: 'start', behavior: 'smooth' });
  }
}

/** Scroll the station list (not the page) so the selected row is visible. */
function revealRow(row) {
  const list = $('station-list');
  const top = row.offsetTop;
  if (top < list.scrollTop || top + row.offsetHeight > list.scrollTop + list.clientHeight) {
    list.scrollTop = top - (list.clientHeight - row.offsetHeight) / 2;
  }
}

function select(key) {
  const st = station(key);
  if (!st) return;
  state.selected = key;
  document.querySelectorAll('.station-row').forEach((r) => {
    r.classList.toggle('selected', r.dataset.key === key);
    if (r.dataset.key === key) revealRow(r);
  });
  picker.setData(displayTraces(st), state.event.timeMs, -W.preOriginSec, W.postOriginSec);
  picker.setPicks(state.picks[key]);
  picker.setAnalyst(state.showAnalyst ? state.analyst[key] || null : null);
  const p = state.picks[key] || {};
  picker.arm(p.P == null ? 'P' : p.S == null ? 'S' : null);
  updateTitle();
}

function updateTitle() {
  const st = station(state.selected);
  if (!st) return;
  const p = state.picks[st.key] || {};
  const m = measure(st.key);
  const role = st.schools.length ? `stand-in for ${st.schools.join(' & ')}` : 'helper station';
  const parts = [`<b>${esc(st.net)}.${esc(st.sta)}</b> <span class="muted">${esc(role)} · ${st.traces.map((t) => t.cha).join(', ')}</span>`];
  if (p.P != null) parts.push(`<span class="pick-p">P ${secAfterOrigin(p.P)} s</span>`);
  if (p.S != null) parts.push(`<span class="pick-s">S ${secAfterOrigin(p.S)} s</span>`);
  if (m && !m.bad) parts.push(`S−P = <b>${m.sp.toFixed(2)} s</b> → distance <b>${m.distKm.toFixed(1)} km</b>`);
  if (m && m.bad) parts.push(`<span class="warn">${m.bad}</span>`);
  $('picker-title').innerHTML = parts.join(' ');
}

function onArm(phase) {
  $('arm-p').setAttribute('aria-pressed', String(phase === 'P'));
  $('arm-s').setAttribute('aria-pressed', String(phase === 'S'));
  const hint = $('pick-hint');
  if (phase === 'P') hint.textContent = 'Click where the first wave (P) arrives: the first clear change from the quiet background. Tip: zoom in first (scroll or ＋).';
  else if (phase === 'S') hint.textContent = 'Now click where the S wave arrives: a second, usually bigger change, often clearest on the N or E trace.';
  else {
    const p = state.picks[state.selected] || {};
    hint.textContent = p.P != null && p.S != null
      ? 'Both picks set. To move one, press Pick P or Pick S and click again. Then go to the next station ▶.'
      : 'Press Pick P or Pick S, then click on the seismogram. Drag to move, scroll to zoom.';
  }
}

function onPick(phase, ms) {
  const key = state.selected;
  state.picks[key] = { ...(state.picks[key] || {}), [phase]: Math.round(ms) };
  savePicks();
  picker.setPicks(state.picks[key]);
  minis.get(key)?.setPicks(state.picks[key]);
  clearFit('Your picks changed: press “Find the best epicenter” again.');
  updateRowNumbers(key);
  updateTitle();
  updateDistances();
  const p = state.picks[key];
  picker.arm(phase === 'P' && p.S == null ? 'S' : null);
}

function step(dir) {
  const i = state.stations.findIndex((s) => s.key === state.selected);
  const n = state.stations.length;
  select(state.stations[(i + dir + n) % n].key);
}

// ---------------------------------------------------------------------------
// Step 3: locating

function updateDistances() {
  $('kps').textContent = speedsOk()
    ? `→ ${kmPerSecond(state.vp, state.vs).toFixed(2)} km of distance per second of S−P`
    : 'S speed must be less than P speed';
  const circles = [];
  for (const st of state.stations) {
    const m = measure(st.key);
    if (m && !m.bad) circles.push({ lat: st.lat, lon: st.lon, radiusKm: Math.max(0.3, m.epiKm), color: st.color });
  }
  map?.setCircles(circles);
  state.stations.forEach((s) => updateRowNumbers(s.key));
  updateTitle();
  renderGuess();
}

/** Stations with both picks, as distances for locating. */
function observations() {
  const obs = [];
  for (const st of state.stations) {
    const m = measure(st.key);
    if (m && !m.bad) obs.push({ key: st.key, sta: st.sta, lat: st.lat, lon: st.lon, distKm: m.distKm });
  }
  return obs;
}

// --- the student's own epicenter (placed on the map) -------------------------

function setPlacing(on) {
  state.placing = on;
  map?.setPlacing(on);
  const b = $('place-guess');
  b.setAttribute('aria-pressed', String(on));
  b.textContent = on ? 'Done placing' : state.guess ? 'Move my epicenter' : 'Place my own epicenter';
  $('place-hint').hidden = !on;
}

function onGuess(lat, lon, final) {
  state.guess = { lat, lon };
  renderGuess();
  if (final) {
    saveGuess();
    setPlacing(state.placing);
    if (state.revealed) showAnswer();
  }
}

function clearGuess() {
  state.guess = null;
  saveGuess();
  map?.setGuess(null);
  renderGuess();
  setPlacing(false);
  if (state.revealed) showAnswer();
}

/** How well the student's circles fit their own epicenter; updates live while they drag it. */
function renderGuess() {
  const box = $('guess-result');
  const g = state.guess;
  if (!g || !state.event) { box.innerHTML = ''; return; }
  const obs = observations();
  let fit = '';
  if (!obs.length) fit = 'Pick P and S at some stations to see how well your circles fit it.';
  else if (speedsOk()) {
    const { rmsKm } = misfitAt(g.lat, g.lon, obs, state.depthKm);
    fit = `Your circles miss it by <b>${rmsKm.toFixed(1)} km</b> on average
      (RMS, ${obs.length} station${obs.length === 1 ? '' : 's'}). Smaller is better: drag the pin to try.`;
  }
  box.innerHTML = `<div><b>Your guess</b> (green pin): ${fmtLatLon(g)}. ${fit}
    <button type="button" class="link" id="clear-guess">Remove it</button></div>`;
  $('clear-guess').addEventListener('click', clearGuess);
}

// --- the best fit from the picks (grid search) -------------------------------

function clearFit(note) {
  if (!state.solution) return;
  state.solution = null;
  state.fitObs = [];
  state.fitNote = `<span class="hint">${note}</span>`;
  map?.setSolution(null);
  if (state.revealed) showAnswer();
  renderFit();
}

function renderFit() {
  const box = $('fit-result');
  const fit = state.solution;
  if (!fit) { box.innerHTML = state.fitNote; return; }
  const obs = state.fitObs;
  const rows = obs.map((o, i) => `<li>${esc(o.sta)}: your circle misses by ${Math.abs(fit.residualsKm[i]).toFixed(1)} km</li>`).join('');
  box.innerHTML = `
    <div><b>Best fit from your picks</b> (purple star): ${fmtLatLon(fit)},
      from ${obs.length} stations, assuming a depth of ${state.depthKm} km.</div>
    <div>The circles miss this point by <b>${fit.rmsKm.toFixed(1)} km</b> on average (RMS).
      Rough uncertainty: <b>±${fit.uncertaintyKm.toFixed(0)} km</b>${fit.unbounded ? ' or more' : ''} (dashed circle).</div>
    ${fit.warnings.map((w) => `<div class="warn">${esc(w)}</div>`).join('')}
    <details><summary>Station by station</summary><ul>${rows}</ul></details>`;
}

function locate() {
  const obs = observations();
  if (obs.length < 3) {
    state.fitNote = `<span class="error">Pick P and S on at least 3 stations first (4 or more is better). You have ${obs.length}.</span>`;
  } else if (!speedsOk()) {
    state.fitNote = '<span class="error">The S speed must be less than the P speed.</span>';
  } else {
    const sigmaKm = W.pickUncertaintySec * kmPerSecond(state.vp, state.vs);
    state.solution = locateGrid(obs, { depthKm: state.depthKm, sigmaKm });
    state.fitObs = obs;
    state.fitNote = '';
    map.setSolution(state.solution);
    if (state.revealed) showAnswer();
  }
  renderFit();
}

function showAnswer() {
  const e = state.event;
  state.revealed = true;
  map.setOfficial(e, [state.solution, state.guess]);
  renderSummary();
  const off = (p) => distanceKm(p.lat, p.lon, e.lat, e.lon).toFixed(1);
  const hasAnalyst = state.stations.some((s) => state.analyst[s.key]);
  const box = $('answer');
  box.hidden = false;
  box.innerHTML = `
    ${state.guess ? `<div class="big">Your guess (green pin) was ${off(state.guess)} km from the official epicenter.</div>` : ''}
    ${state.solution ? `<div class="big">The best fit from your picks (purple star) was ${off(state.solution)} km from the official epicenter.</div>` : ''}
    <div>Official location (University of Utah / USGS): <b>${esc(e.place)}</b>,
      ${e.lat.toFixed(3)}° N, ${Math.abs(e.lon).toFixed(3)}° W, depth ${e.depthKm.toFixed(1)} km,
      magnitude ${e.mag == null ? '?' : e.mag.toFixed(1)} (orange star).
      <a href="${esc(e.url)}" target="_blank" rel="noopener">USGS event page</a></div>
    ${hasAnalyst ? `<label><input type="checkbox" id="show-analyst" ${state.showAnalyst ? 'checked' : ''}>
      Show the University of Utah analysts' picks (dashed lines) on the seismograms</label>` : ''}`;
  $('show-analyst')?.addEventListener('change', (ev) => {
    state.showAnalyst = ev.target.checked;
    picker.setAnalyst(state.showAnalyst ? state.analyst[state.selected] || null : null);
    for (const [key, view] of minis) view.setAnalyst(state.showAnalyst ? state.analyst[key] || null : null);
  });
}

function downloadPicks() {
  const e = state.event;
  const iso = (ms) => (ms == null ? '' : new Date(ms).toISOString());
  const lines = ['station,role,latitude,longitude,P_time_utc,S_time_utc,S_minus_P_s,distance_km'];
  for (const st of state.stations) {
    const p = state.picks[st.key] || {};
    const m = measure(st.key);
    lines.push(csvRow([st.key, st.schools.length ? `stand-in for ${st.schools.join(' & ')}` : 'helper',
      st.lat.toFixed(4), st.lon.toFixed(4), iso(p.P), iso(p.S),
      m ? m.sp.toFixed(2) : '', m && !m.bad ? m.distKm.toFixed(1) : '']));
  }
  lines.push('');
  lines.push(`# quake,${e.id},${iso(e.timeMs)},M${e.mag}`);
  lines.push(`# P speed km/s,${state.vp},S speed km/s,${state.vs},depth km,${state.depthKm}`);
  const obs = observations();
  if (state.guess) {
    const g = state.guess;
    const rms = obs.length && speedsOk() ? misfitAt(g.lat, g.lon, obs, state.depthKm).rmsKm.toFixed(2) : '';
    lines.push(`# your guess,${g.lat.toFixed(4)},${g.lon.toFixed(4)},rms km,${rms}`);
  }
  if (state.solution) lines.push(`# best fit from your picks,${state.solution.lat.toFixed(4)},${state.solution.lon.toFixed(4)},rms km,${state.solution.rmsKm.toFixed(2)}`);
  lines.push(`# ${ATTRIBUTION.waveforms}`);
  downloadCsv(`wave-race-${e.id}.csv`, lines);
}

// ---------------------------------------------------------------------------
// Start

function init() {
  showCredits($('credits'), ['waveforms', 'events', 'map']);
  showSourceBadge($('source-badge'), source);
  const sw = $('source-switch');
  sw.href = switchUrl(source.live);
  sw.textContent = source.live ? 'Use the offline sample' : 'Use live data';

  const sel = $('filter-select');
  for (const f of FILTERS) sel.add(new Option(f.label, f.id, false, f.id === state.filterId));
  sel.addEventListener('change', () => {
    state.filterId = sel.value;
    if (!state.event) return;
    const st = station(state.selected);
    picker.setData(displayTraces(st), state.event.timeMs, -W.preOriginSec, W.postOriginSec, true);
    for (const s of state.stations) {
      minis.get(s.key)?.setData(displayTraces(s, true), state.event.timeMs, -W.preOriginSec, W.postOriginSec);
    }
  });

  for (const [id, prop] of [['vp', 'vp'], ['vs', 'vs'], ['depth', 'depthKm']]) {
    const input = $(id);
    input.value = state[prop];
    input.addEventListener('input', () => {
      state[prop] = Number(input.value);
      clearFit('Settings changed: press “Find the best epicenter” again.');
      updateDistances();
    });
  }

  picker = new TraceView($('picker'), { interactive: true, onPick, onArm });
  $('arm-p').addEventListener('click', () => picker.arm(picker.armed === 'P' ? null : 'P'));
  $('arm-s').addEventListener('click', () => picker.arm(picker.armed === 'S' ? null : 'S'));
  $('clear-picks').addEventListener('click', () => {
    delete state.picks[state.selected];
    savePicks();
    picker.setPicks({});
    minis.get(state.selected)?.setPicks({});
    picker.arm('P');
    clearFit('Your picks changed: press “Find the best epicenter” again.');
    updateDistances();
  });
  $('zoom-in').addEventListener('click', () => picker.zoom(1 / 1.5));
  $('zoom-out').addEventListener('click', () => picker.zoom(1.5));
  $('zoom-reset').addEventListener('click', () => picker.resetZoom());
  $('prev-station').addEventListener('click', () => step(-1));
  $('next-station').addEventListener('click', () => step(1));
  $('place-guess').addEventListener('click', () => setPlacing(!state.placing));
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && state.placing) setPlacing(false);
  });
  $('locate').addEventListener('click', locate);
  $('reveal').addEventListener('click', showAnswer);
  $('download').addEventListener('click', downloadPicks);
  $('change-quake').addEventListener('click', () => showChooser(true));

  if (source.live) renderPresets();
  loadEventList();
  const wanted = params.get('event');
  if (wanted) loadEvent(wanted);
}

init();
