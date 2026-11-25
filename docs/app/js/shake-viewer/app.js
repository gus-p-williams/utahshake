// School Shake Viewer (prototype): a day of one seismometer, with the class's notes on it.
//
// Three ways in, never from Raspberry Shake's servers (CLAUDE.md, constraint 1):
//   file  a miniSEED day file from the school's Shake, read in this browser (nothing uploaded);
//   uu    a day of a University of Utah stand-in station, from EarthScope (the DataSource);
//   uhsn  files laid out as the UHSN data spec describes, read by UHSNSource (data/uhsn.js):
//         the bundled test folder, or DRI's server with ?uhsn=<address>.
// Then: a 24-hour helicorder (click a line to zoom in), the zoom window's trace and
// spectrogram (drag on it to choose a band), hourly noise levels, notes (drawn on the
// helicorder, edited here, downloaded as a file) and a CSV of the zoom window.
//
// Nothing loads until the user presses a button (Gus, 2026-11-25). "Try the example" opens HEB
// on Nov 17, 2026 from the test folder that comes with the site, so it downloads nothing from
// EarthScope. Address options fill in the choices and wait for a click: ?source=file|uu|uhsn
// &station=UU.HEB &date=YYYY-MM-DD; &uhsn=<base URL> reads another server in the UHSN layout.
// Notes stay in this browser (localStorage, per station) and in the file the teacher downloads. Logic: lib/day-view.js; plots:
// helicorder-view.js, noise-view.js, ui/trace-view.js, quake-explorer/spectrogram-view.js.
import { EarthScopeUSGSSource } from '../data/datasource.js';
import { UHSNSource } from '../data/uhsn.js';
import { parseMiniseed } from '../data/mseed.js';
import { filteredData, filteredLong } from '../data/filters.js';
import { mergeSegments } from '../lib/signal.js';
import { stft } from '../lib/spectral.js';
import * as DV from '../lib/day-view.js';
import { REGION, WAVE_RACE, ATTRIBUTION } from '../config.js';
import { TraceView } from '../ui/trace-view.js';
import { SpectrogramView, followTraceView } from '../quake-explorer/spectrogram-view.js';
import { esc, showCredits, downloadCsv } from '../ui/page.js';
import { HelicorderView } from './helicorder-view.js';
import { NoiseView } from './noise-view.js';
import {
  STAND_INS, EXAMPLE, UHSN_DEMO_BASE, HELI_FILTERS, NOISE_BANDS, ZOOM_SPANS, DEFAULT_ZOOM_SEC, QUAKES,
} from './config.js';

const $ = (id) => document.getElementById(id);
const params = new URLSearchParams(location.search);
const TZ = DV.TIME_ZONE;
const fmtDay = new Intl.DateTimeFormat('en-US', { timeZone: TZ, weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
const fmtClock = new Intl.DateTimeFormat('en-US', { timeZone: TZ, hour: 'numeric', minute: '2-digit', second: '2-digit' });
const fmtClockZ = new Intl.DateTimeFormat('en-US', { timeZone: TZ, hour: 'numeric', minute: '2-digit', second: '2-digit', timeZoneName: 'short' });
const fmtShort = new Intl.DateTimeFormat('en-US', { timeZone: TZ, hour: 'numeric', minute: '2-digit', timeZoneName: 'short' });
const fmtShortDay = new Intl.DateTimeFormat('en-US', { timeZone: TZ, weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', timeZoneName: 'short' });
const zoneName = (ms) => new Intl.DateTimeFormat('en-US', { timeZone: TZ, timeZoneName: 'short' })
  .formatToParts(new Date(ms)).find((p) => p.type === 'timeZoneName')?.value ?? '';
const tick = () => new Promise((r) => setTimeout(r, 0)); // let the page repaint before heavy work

const es = new EarthScopeUSGSSource(); // UU stations and USGS quakes
const uhsnBase = new URL(params.get('uhsn') || UHSN_DEMO_BASE, location.href).href;
let uhsn = null; // UHSNSource, made when its panel opens

const state = {
  mode: 'uu',
  trace: null, // the raw record of the day shown: starts at win.startMs, NaN where missing
  win: null, // {startMs, endMs}
  station: null, // {key, net, sta, loc, cha, lat?, lon?, label}
  publicUntilMs: null,
  filtered: new Map(), // filter id -> Float32Array (day-long, aligned with trace)
  gain: 1,
  background: NaN,
  heliFilter: HELI_FILTERS[0].id,
  rowSec: 1800,
  noiseBand: NOISE_BANDS[0].id,
  zoom: null, // {startMs, endMs, slice, filt}
  zoomSpan: DEFAULT_ZOOM_SEC,
  zoomFilter: 'bp1-10',
  band: null, // {lo, hi} from the spectrogram
  notes: [],
  notesInfo: '', // where the notes came from (shown under the list)
  quakesMarked: false,
  files: null, // {name, channels: Map(id -> Trace)}
  loadId: 0,
};

// ---------------------------------------------------------------------------------------------
// Views

const heli = new HelicorderView({ canvas: $('heli'), cue: $('heli-cue'), live: $('heli-live') }, {
  onZoom: (ms) => openZoom(ms),
  onAddNote: (ms) => addNoteAt(ms),
  onCancelAdd: () => setAddMode(false),
  onHover: (info) => showReadout(info?.ms ?? null),
});
const noise = new NoiseView({ canvas: $('noise'), cue: $('noise-cue'), live: $('noise-live') }, {
  onPick: (startMs) => { state.zoomSpan = 3600; $('zoom-span').value = '3600'; openZoom(startMs + 1800000); $('zoom-card').scrollIntoView({ behavior: 'smooth', block: 'nearest' }); },
});
const traceView = new TraceView($('zoom-trace'), { interactive: true, axisUnit: 's' });
const spectro = new SpectrogramView($('zoom-spec'), {
  axisUnit: 's',
  onBand: (lo, hi) => {
    state.band = lo == null ? null : { lo, hi };
    state.zoomFilter = state.band ? 'band' : 'bp1-10';
    syncZoomFilterSelect();
    refilterZoom();
  },
});
followTraceView(spectro, traceView);

// ---------------------------------------------------------------------------------------------
// Status, badge, credits

function status(msg, isError = false) {
  const el = $('load-status');
  el.textContent = msg;
  el.classList.toggle('error', isError);
}

function setBadge() {
  const b = $('source-badge');
  if (state.mode === 'uu') { b.textContent = 'Live data'; b.className = 'badge live'; }
  else if (state.mode === 'file') { b.textContent = 'Your file'; b.className = 'badge offline'; }
  else {
    const pu = state.publicUntilMs;
    b.textContent = pu ? `School Shakes, data up to ${fmtShort.format(new Date(pu))}` : 'School Shakes';
    b.className = 'badge school';
  }
  b.hidden = !state.trace;
}

function setCredits() {
  const el = $('credits');
  const keys = [];
  if (state.mode !== 'file') keys.push('waveforms');
  keys.push('events');
  if (state.quakesMarked) keys.push('traveltimes');
  showCredits(el, keys);
  const extra = [];
  if (state.mode === 'file') extra.push('Waveforms: your own file, read in this browser; nothing was uploaded.');
  if (state.mode === 'uhsn' && !params.get('uhsn')) {
    extra.push('The test folder holds University of Utah data copied, byte for byte, into the UHSN data layout (see ABOUT.txt in the folder).');
  }
  if (state.notes.some((n) => /wasatch\.edu/.test(n.source))) {
    extra.push('Example notes: bell times from the Wasatch County School District’s web pages (sources in the notes file).');
  }
  if (extra.length) el.insertAdjacentHTML('afterbegin', `${extra.map(esc).join(' ')} `);
}

// ---------------------------------------------------------------------------------------------
// Choosing the data

function setMode(mode) {
  state.mode = mode;
  for (const m of ['file', 'uu', 'uhsn']) {
    $(`panel-${m}`).hidden = m !== mode;
    $(`src-${m}`).checked = m === mode;
  }
  if (mode === 'uhsn') initUhsn();
  status('');
}

function fillStandIns() {
  const sel = $('uu-station');
  sel.innerHTML = STAND_INS.map((s) => `<option value="${esc(s.key)}">${esc(s.label)}</option>`).join('');
  const want = params.get('station');
  sel.value = STAND_INS.some((s) => s.key === want) ? want : EXAMPLE.station;
  const yesterday = DV.addDays(DV.localDate(Date.now()), -1);
  $('uu-date').max = yesterday;
  $('uu-date').value = params.get('date') || (sel.value === EXAMPLE.station ? EXAMPLE.date : yesterday);
}

async function loadUU() {
  const st = STAND_INS.find((s) => s.key === $('uu-station').value);
  const date = $('uu-date').value;
  if (!st || !date) return;
  const id = ++state.loadId;
  const win = DV.localDay(date);
  status(`Downloading one day of ${st.net}.${st.sta}.${st.loc}.${st.cha} from EarthScope (about 6–10 MB)…`);
  try {
    const traces = await es.getWaveforms([{ net: st.net, sta: st.sta, loc: st.loc, cha: st.cha }], win.startMs, win.endMs);
    if (id !== state.loadId) return;
    if (!traces.length) { status(`EarthScope has no data for ${st.sta} on ${date}. Try another day.`, true); return; }
    await showDay({ trace: traces[0], win, station: { ...st }, publicUntilMs: null });
    setAddress({ source: 'uu', station: st.key, date });
  } catch (err) {
    if (id === state.loadId) status(`${err.message}. Check the network, or open a file instead.`, true);
  }
}

// --- files from the device ---

async function openFiles(fileList) {
  const files = [...fileList];
  if (!files.length) return;
  const id = ++state.loadId;
  status(`Reading ${files.length === 1 ? files[0].name : `${files.length} files`} in this browser…`);
  await tick();
  const pieces = new Map(); // channel id -> segments
  try {
    for (const f of files) {
      if (f.size > 60e6) throw new Error(`${f.name} is ${(f.size / 1e6).toFixed(0)} MB: too big for a day file`);
      const traces = parseMiniseed(await f.arrayBuffer());
      for (const t of traces) {
        const key = [t.net, t.sta, t.loc, t.cha].join('.');
        if (!pieces.has(key)) pieces.set(key, []);
        pieces.get(key).push(t);
      }
    }
  } catch (err) {
    status(`Could not read that file as miniSEED (${err.message}). A Shake's day file is named like AM.R1234.00.EHZ.D.2026.329.`, true);
    return;
  }
  if (id !== state.loadId) return;
  if (!pieces.size) { status('No seismic records found in that file.', true); return; }
  const channels = new Map();
  for (const [key, segs] of pieces) {
    const merged = mergeSegments(segs);
    channels.set(key, { ...segs[0], ...merged });
  }
  state.files = { name: files.map((f) => f.name).join(', '), channels };
  const chSel = $('file-channel');
  chSel.innerHTML = [...channels.keys()].map((k) => `<option>${esc(k)}</option>`).join('');
  const z = [...channels.keys()].find((k) => /Z$/.test(k));
  if (z) chSel.value = z;
  $('file-channel-row').hidden = channels.size < 2;
  fillFileDays();
  await showFileDay();
}

/** The 24-hour windows a file's record covers: its UTC days (as the Shake keeps them) and local days. */
function fillFileDays() {
  const tr = state.files.channels.get($('file-channel').value);
  const t0 = tr.startMs;
  const t1 = tr.startMs + (tr.data.length / tr.sampleRate) * 1000;
  const opts = [];
  for (let d = DV.utcDay(t0).startMs; d < t1; d += DV.DAY_MS) {
    const label = `UTC day ${new Date(d).toISOString().slice(0, 10)}, as in the Shake’s file (${fmtShortDay.format(new Date(d))} to ${fmtShort.format(new Date(d + DV.DAY_MS))})`;
    opts.push({ value: `utc:${d}`, label });
  }
  for (let date = DV.localDate(t0); DV.localMidnight(date) < t1; date = DV.addDays(date, 1)) {
    opts.push({ value: `local:${date}`, label: `${fmtDay.format(new Date(DV.localMidnight(date) + 12 * DV.HOUR_MS))}, midnight to midnight, Mountain time` });
  }
  const sel = $('file-day');
  sel.innerHTML = opts.map((o) => `<option value="${esc(o.value)}">${esc(o.label)}</option>`).join('');
  $('file-day-row').hidden = opts.length < 2;
}

async function showFileDay() {
  const key = $('file-channel').value;
  const tr = state.files.channels.get(key);
  const [kind, v] = $('file-day').value.split(':');
  const win = kind === 'utc' ? DV.utcDay(Number(v)) : DV.localDay(v);
  const cut = mergeSegments([tr], win.startMs, win.endMs);
  const known = STAND_INS.find((s) => s.key === `${tr.net}.${tr.sta}`)
    || (uhsn && (await uhsnStationPos(tr.net, tr.sta)));
  await showDay({
    trace: { net: tr.net, sta: tr.sta, loc: tr.loc, cha: tr.cha, ...cut },
    win,
    station: { key: `${tr.net}.${tr.sta}`, net: tr.net, sta: tr.sta, loc: tr.loc, cha: tr.cha,
      lat: known?.lat, lon: known?.lon, label: `${key} (your file)` },
    publicUntilMs: null,
  });
}

// --- the UHSN layout (test folder or DRI's server) ---

let uhsnReady = null; // the promise of the first initUhsn(), shared by every caller
function initUhsn() {
  uhsnReady ||= initUhsnOnce().then((ok) => { if (!ok) uhsnReady = null; return ok; });
  return uhsnReady;
}

async function initUhsnOnce() {
  uhsn = new UHSNSource({ base: uhsnBase, fallback: es });
  $('uhsn-base').textContent = uhsnBase;
  status('Reading the station list and index…');
  try {
    const [list, idx] = await Promise.all([uhsn.stationList(), uhsn.index()]);
    const published = list.filter((s) => idx.stations?.[`${s.net}.${s.sta}`]);
    if (!published.length) { status('This folder has no published stations.', true); uhsn = null; return false; }
    $('uhsn-station').innerHTML = published.map((s) => `<option value="${esc(`${s.net}.${s.sta}`)}">${esc(s.schoolName || `${s.net}.${s.sta}`)} (${esc(`${s.net}.${s.sta}`)})</option>`).join('');
    const want = params.get('station');
    if (published.some((s) => `${s.net}.${s.sta}` === want)) $('uhsn-station').value = want;
    await uhsnStationChanged();
    status('');
    return true;
  } catch (err) {
    status(`Could not read ${uhsnBase}: ${err.message}`, true);
    uhsn = null;
    return false;
  }
}

async function uhsnStation() {
  const [net, sta] = $('uhsn-station').value.split('.');
  const list = await uhsn.stationList();
  return list.find((s) => s.net === net && s.sta === sta);
}

async function uhsnStationPos(net, sta) {
  try { return (await uhsn.stationList()).find((s) => s.net === net && s.sta === sta && Number.isFinite(s.lat)); } catch { return null; }
}

async function uhsnStationChanged() {
  const st = await uhsnStation();
  const idx = await uhsn.index();
  const entry = idx.stations[`${st.net}.${st.sta}`];
  const pu = Date.parse(entry.publicUntil);
  const chans = Object.values(entry.channels);
  const first = chans.map((c) => c.firstDay).sort()[0];
  const date = $('uhsn-date');
  date.min = DV.localDate(Date.parse(`${first}T00:00:00Z`));
  date.max = DV.localDate(pu);
  date.value = params.get('date') && params.get('source') === 'uhsn' ? params.get('date') : date.max;
  // A server's publish step runs every 10 minutes; an index more than an hour old means it has
  // stalled: "data paused" (spec 7.5). The bundled test folder is a fixed snapshot, so not there.
  const ps = params.get('uhsn') ? await uhsn.publishState() : null;
  const paused = ps?.paused
    ? ` Data paused: the server last published ${fmtShortDay.format(new Date(ps.generatedMs))}, more than an hour ago.`
    : '';
  $('uhsn-info').textContent = `Published from ${first} (UTC) to ${fmtShortDay.format(new Date(pu))}. Sharing status: ${st.sharing}.${paused}`;
}

async function loadUhsn() {
  if (!(await initUhsn())) return;
  const st = await uhsnStation();
  const ch = st.channels.find((c) => /Z$/.test(c.cha)) || st.channels[0];
  const date = $('uhsn-date').value;
  const win = DV.localDay(date);
  const id = ++state.loadId;
  status(`Reading ${st.net}.${st.sta}.${ch.loc}.${ch.cha} for ${date} from the folder (only the parts of each day file needed)…`);
  try {
    const traces = await uhsn.getWaveforms([{ net: st.net, sta: st.sta, loc: ch.loc, cha: ch.cha }], win.startMs, win.endMs);
    if (id !== state.loadId) return;
    const tr = traces[0];
    if (!tr || !tr.data.some((v) => !Number.isNaN(v))) { status(`No published data for ${date}.`, true); return; }
    const publicUntilMs = tr.publicUntilMs ?? (await uhsn.publicUntil(st.net, st.sta));
    await showDay({
      trace: tr, win,
      station: { key: `${st.net}.${st.sta}`, net: st.net, sta: st.sta, loc: ch.loc, cha: ch.cha,
        lat: st.lat ?? undefined, lon: st.lon ?? undefined, label: st.schoolName || `${st.net}.${st.sta}` },
      publicUntilMs,
    });
    setAddress({ source: 'uhsn', station: `${st.net}.${st.sta}`, date });
  } catch (err) {
    if (id === state.loadId) status(err.message, true);
  }
}

function setAddress(p) {
  const q = new URLSearchParams(location.search);
  for (const k of ['source', 'station', 'date']) q.delete(k);
  for (const [k, v] of Object.entries(p)) q.set(k, v);
  history.replaceState(null, '', `?${q}`);
}

// ---------------------------------------------------------------------------------------------
// The day

async function showDay({ trace, win, station, publicUntilMs }) {
  state.trace = trace;
  state.win = win;
  state.station = station;
  state.publicUntilMs = publicUntilMs;
  state.filtered.clear();
  state.zoom = null;
  state.band = null;
  state.quakesMarked = false;
  status('Filtering the day…');
  await tick();
  const good = trace.data.reduce((n, v) => n + (Number.isNaN(v) ? 0 : 1), 0);
  const hours = good / trace.sampleRate / 3600;
  const pu = publicUntilMs ? ` Data up to ${fmtShortDay.format(new Date(publicUntilMs))}.` : '';
  $('heli-title').textContent = `${station.net}.${station.sta}.${station.loc}.${station.cha} · ${fmtDay.format(new Date(win.startMs + 12 * DV.HOUR_MS))} · times in ${zoneName(win.startMs + 12 * DV.HOUR_MS)}`;
  drawHelicorder();
  drawNoise();
  loadNotesFor(station.key);
  clearZoom();
  setBadge();
  setCredits();
  $('day-cards').hidden = false;
  status(`${station.label}: ${hours.toFixed(1)} hours of record, ${trace.sampleRate} samples a second.${pu}`);
}

/** The day filtered to a preset (cached): gaps bridged, filtered once, gaps put back. */
function dayFiltered(preset) {
  if (!state.filtered.has(preset.id)) state.filtered.set(preset.id, filteredLong(state.trace, preset));
  return state.filtered.get(preset.id);
}

function drawHelicorder() {
  const preset = HELI_FILTERS.find((f) => f.id === state.heliFilter);
  const data = dayFiltered(preset);
  state.background = DV.backgroundLevel(data, state.trace.sampleRate);
  heli.setData({
    data, dataStartMs: state.trace.startMs, sampleRate: state.trace.sampleRate,
    startMs: state.win.startMs, endMs: state.win.endMs, rowSec: state.rowSec,
    countsPerLine: DV.countsPerLine(state.background, state.gain), publicUntilMs: state.publicUntilMs,
  });
  heli.setZoom(state.zoom);
}

function drawNoise() {
  const band = NOISE_BANDS.find((b) => b.id === state.noiseBand);
  const levels = DV.hourlyLevels(dayFiltered(band), state.trace.sampleRate);
  noise.setData({ levels, startMs: state.win.startMs, publicUntilMs: state.publicUntilMs, unit: 'counts' });
}

function showReadout(ms) {
  const el = $('heli-readout');
  if (ms == null || !state.trace) { el.innerHTML = '&nbsp;'; return; }
  const near = state.notes.filter((n) => {
    const b = n.end ?? n.start;
    return (ms >= n.start - 90000 && ms <= b + 90000);
  }).map((n) => n.label || n.kind);
  el.textContent = `${fmtClockZ.format(new Date(ms))}${near.length ? ` · ${near.join(' · ')}` : ''}`;
}

// ---------------------------------------------------------------------------------------------
// Zoom panel: trace and spectrogram of a window

const ZOOM_FILTERS = [...HELI_FILTERS.filter((f) => f.id !== 'raw'), { id: 'raw', label: 'Raw (mean removed)' }];

function zoomPreset() {
  if (state.zoomFilter === 'band' && state.band) return { id: 'band', lo: state.band.lo, hi: state.band.hi, label: `${state.band.lo.toFixed(1)}–${state.band.hi.toFixed(1)} Hz (from the spectrogram)` };
  return ZOOM_FILTERS.find((f) => f.id === state.zoomFilter) || ZOOM_FILTERS[0];
}

function syncZoomFilterSelect() {
  const sel = $('zoom-filter');
  const opts = ZOOM_FILTERS.map((f) => `<option value="${f.id}">${esc(f.label)}</option>`);
  if (state.band) opts.push(`<option value="band">${esc(zoomPreset().id === 'band' ? zoomPreset().label : `${state.band.lo.toFixed(1)}–${state.band.hi.toFixed(1)} Hz (from the spectrogram)`)}</option>`);
  sel.innerHTML = opts.join('');
  sel.value = state.zoomFilter === 'band' && !state.band ? 'bp1-10' : state.zoomFilter;
}

function clearZoom() {
  state.zoom = null;
  $('zoom-empty').hidden = false;
  $('zoom-body').hidden = true;
  $('zoom-title').textContent = '';
  heli.setZoom(null);
}

function openZoom(centerOrWin) {
  if (!state.trace) return;
  const tr = state.trace;
  const sr = tr.sampleRate;
  const win = typeof centerOrWin === 'number'
    ? DV.zoomWindow(centerOrWin, state.zoomSpan, state.win.startMs, state.win.endMs)
    : centerOrWin;
  const span = win.endMs - win.startMs;
  const pad = Math.min(60000, span * 0.2); // filter warm-up, outside the window shown
  const trEnd = tr.startMs + (tr.data.length / sr) * 1000;
  const a = Math.max(tr.startMs, win.startMs - pad);
  const b = Math.min(trEnd, win.endMs + pad);
  const i0 = Math.max(0, Math.floor(((a - tr.startMs) / 1000) * sr));
  const i1 = Math.min(tr.data.length, Math.ceil(((b - tr.startMs) / 1000) * sr));
  const slice = { net: tr.net, sta: tr.sta, loc: tr.loc, cha: tr.cha, sampleRate: sr,
    startMs: tr.startMs + (i0 / sr) * 1000, data: Float32Array.from(tr.data.subarray(i0, i1)) };
  state.zoom = { startMs: win.startMs, endMs: win.endMs, slice, filt: null };
  $('zoom-empty').hidden = true;
  $('zoom-body').hidden = false;
  const unit = `s after ${fmtClock.format(new Date(win.startMs))}`;
  traceView.axisUnit = unit;
  spectro.axisUnit = unit;
  $('zoom-title').textContent = `${fmtClock.format(new Date(win.startMs))} – ${fmtClockZ.format(new Date(win.endMs))}`;
  // spectrogram of the raw slice: longer windows for longer spans, so it stays a few thousand columns
  const windowSec = span <= 600000 ? 2.56 : span <= 1800000 ? 5.12 : 10.24;
  const spec = stft(slice.data, sr, { windowSec, overlap: span <= 600000 ? 0.75 : 0.5, fMin: 0.4, fMax: Math.min(50, sr / 2) });
  spectro.setData(spec, { startMs: slice.startMs, refMs: win.startMs, fromSec: 0, toSec: span / 1000 });
  if (state.band) spectro.setBand(state.band.lo, state.band.hi);
  refilterZoom(true);
  heli.setZoom({ startMs: win.startMs, endMs: win.endMs });
  $('zoom-prev').disabled = win.startMs <= state.win.startMs;
  $('zoom-next').disabled = win.endMs >= state.win.endMs;
}

function refilterZoom(reset = false) {
  const z = state.zoom;
  if (!z) return;
  const preset = zoomPreset();
  z.filt = filteredData(z.slice, preset);
  const label = preset.id === 'raw' ? 'raw (mean removed)' : preset.label.replace(/ \(.*\)$/, '');
  traceView.setData([{ label: `${z.slice.sta}.${z.slice.cha} · ${label}`, data: z.filt, startMs: z.slice.startMs, sampleRate: z.slice.sampleRate }],
    z.startMs, 0, (z.endMs - z.startMs) / 1000, !reset);
}

function shiftZoom(dir) {
  const z = state.zoom;
  if (!z) return;
  const span = z.endMs - z.startMs;
  const start = Math.max(state.win.startMs, Math.min(state.win.endMs - span, z.startMs + dir * span));
  openZoom({ startMs: start, endMs: start + span });
}

/** The part of the zoom window on screen (the trace view can be zoomed further). */
function zoomView() {
  const z = state.zoom;
  return { startMs: z.startMs + traceView.view.from * 1000, endMs: z.startMs + traceView.view.to * 1000 };
}

function downloadWindowCsv() {
  const z = state.zoom;
  if (!z) return;
  const v = zoomView();
  const preset = zoomPreset();
  const st = state.station;
  const notes = [];
  if (state.mode === 'file') notes.push(`from the file ${state.files?.name ?? ''}, read in the browser`);
  else notes.push(ATTRIBUTION.waveforms);
  notes.push('times in UTC; the School Shake Viewer shows Mountain time');
  const { lines, rows, capped } = DV.windowCsv({
    trace: z.slice, filtered: preset.id === 'raw' ? null : z.filt,
    filterLabel: `${preset.label.replace(/ \(.*\)$/, '')} band-pass (4-pole Butterworth, causal)`,
    startMs: v.startMs, endMs: v.endMs, notes,
  });
  downloadCsv(DV.csvFileName(z.slice, v.startMs), lines);
  $('zoom-status').textContent = `Saved ${rows.toLocaleString('en-US')} rows (${st.net}.${st.sta}.${st.loc}.${st.cha}, ${fmtClock.format(new Date(v.startMs))} – ${fmtClockZ.format(new Date(v.endMs))}).${capped ? ' Cut to one hour.' : ''}`;
}

// ---------------------------------------------------------------------------------------------
// Notes

const storeKey = (station) => `uhsn.shakeViewer.notes.${station}`;

function saveNotes() {
  try {
    localStorage.setItem(storeKey(state.station.key), JSON.stringify(DV.notesFile({ station: state.station.key, notes: state.notes })));
  } catch { /* private window or storage blocked: the download still works */ }
}

async function loadNotesFor(key) {
  state.notes = [];
  state.notesInfo = '';
  let saved = null;
  try { saved = localStorage.getItem(storeKey(key)); } catch { /* storage blocked */ }
  if (saved) {
    try {
      state.notes = DV.parseNotesFile(saved).notes;
      state.notesInfo = 'Notes saved in this browser for this station.';
    } catch { state.notes = []; }
  } else if (key === EXAMPLE.station) {
    await loadExampleNotes(false);
    return;
  }
  notesChanged(false);
}

async function loadExampleNotes(save = true) {
  try {
    const res = await fetch(new URL(EXAMPLE.notesUrl, import.meta.url));
    if (!res.ok) throw new Error(`server said ${res.status}`);
    const f = DV.parseNotesFile(await res.text());
    mergeNotes(f.notes);
    state.notesInfo = `Example notes: ${f.title}.`;
  } catch (err) {
    state.notesInfo = `The example notes could not be loaded (${err.message}).`;
  }
  notesChanged(save);
}

function mergeNotes(incoming) {
  const byId = new Map(state.notes.map((n) => [n.id, n]));
  for (const n of incoming) byId.set(n.id, n);
  state.notes = [...byId.values()].sort((a, b) => a.start - b.start);
}

function notesChanged(save = true) {
  if (save && state.station) saveNotes();
  heli.setNotes(state.notes);
  noise.setNotes(state.notes);
  renderNotes();
  renderLegend();
  setCredits();
}

const KIND_OPTIONS = DV.NOTE_KINDS.map((k) => `<option value="${k.id}">${esc(k.label)}</option>`).join('');

function renderNotes() {
  const body = $('notes-body');
  const shown = state.win ? DV.notesInWindow(state.notes, state.win.startMs, state.win.endMs) : [];
  $('notes-count').textContent = state.notes.length
    ? `${shown.length} on this day${state.notes.length > shown.length ? ` (${state.notes.length} in all)` : ''}` : '';
  $('notes-table').hidden = !shown.length;
  $('notes-none').hidden = !!shown.length;
  body.innerHTML = shown.map((n) => {
    const pq = n.p != null ? ` P ${fmtClock.format(new Date(n.p))}${n.s != null ? `, S ${fmtClock.format(new Date(n.s))}` : ''}` : '';
    return `<tr data-id="${esc(n.id)}">
      <td class="t"><span class="sw sw-${esc(n.kind)}" aria-hidden="true"></span>
        <input type="time" step="1" class="n-start" value="${DV.localTimeString(n.start)}" aria-label="Start, Mountain time">
        <span class="to">to</span>
        <input type="time" step="1" class="n-end" value="${n.end != null ? DV.localTimeString(n.end) : ''}" aria-label="End (optional), Mountain time"></td>
      <td><select class="n-kind" aria-label="Kind">${KIND_OPTIONS}</select></td>
      <td class="act"><button type="button" class="n-go" title="Show in the zoom panel" aria-label="Show this note in the zoom panel">🔍</button>
        <button type="button" class="n-del" title="Delete this note" aria-label="Delete this note">×</button></td>
      <td class="lbl"><input type="text" class="n-label" maxlength="${DV.MAX_LABEL}" value="${esc(n.label)}" aria-label="What happened"${n.source ? ` title="Source: ${esc(n.source)}"` : ''}>
        ${pq ? `<small class="pq">Expected${esc(pq)}</small>` : ''}</td>
    </tr>`;
  }).join('');
  for (const tr of body.querySelectorAll('tr')) tr.querySelector('.n-kind').value = state.notes.find((n) => n.id === tr.dataset.id)?.kind ?? 'other';
  $('notes-info').textContent = state.notesInfo;
  $('notes-example').hidden = state.station?.key !== EXAMPLE.station;
}

function renderLegend() {
  const kinds = new Set((state.win ? DV.notesInWindow(state.notes, state.win.startMs, state.win.endMs) : []).map((n) => n.kind));
  const items = DV.NOTE_KINDS.filter((k) => kinds.has(k.id)).map((k) => `<span><i class="sw sw-${k.id}"></i>${esc(k.label)}</span>`);
  if (state.notes.some((n) => n.p != null)) items.push('<span><b class="pick-p">P</b> <b class="pick-s">S</b> expected arrivals</span>');
  if (state.publicUntilMs && state.publicUntilMs < state.win.endMs) items.push('<span><i class="sw sw-unpublished"></i>Not published yet</span>');
  $('legend').innerHTML = items.join('');
}

function noteFromRow(el) {
  const tr = el.closest('tr');
  return tr && state.notes.find((n) => n.id === tr.dataset.id);
}

function onNotesEdit(e) {
  const n = noteFromRow(e.target);
  if (!n) return;
  const t = e.target;
  const date = DV.localDate(n.start);
  if (t.classList.contains('n-start') && t.value) {
    const ms = DV.localDateTime(date, t.value);
    if (Number.isFinite(ms)) {
      const len = n.end != null ? n.end - n.start : null;
      n.start = ms;
      if (len != null) n.end = ms + len;
    }
  } else if (t.classList.contains('n-end')) {
    const ms = t.value ? DV.localDateTime(date, t.value) : null;
    n.end = ms != null && ms > n.start ? ms : null;
  } else if (t.classList.contains('n-kind')) n.kind = t.value;
  else if (t.classList.contains('n-label')) n.label = DV.cleanText(t.value);
  else return;
  state.notes.sort((a, b) => a.start - b.start);
  if (e.type === 'change') notesChanged(); else { heli.setNotes(state.notes); saveNotes(); }
}

function setAddMode(on) {
  heli.setAddMode(on);
  $('note-add').setAttribute('aria-pressed', String(on));
  $('note-add').textContent = on ? 'Cancel: don’t add a note' : 'Add a note on the helicorder';
  if (on) $('heli').focus({ preventScroll: true });
}

function addNote(fields) {
  const n = DV.makeNote(fields);
  if (!n) return;
  state.notes.push(n);
  state.notes.sort((a, b) => a.start - b.start);
  notesChanged();
  const input = $('notes-body').querySelector(`tr[data-id="${CSS.escape(n.id)}"] .n-label`);
  if (input) { input.focus(); input.select(); }
}

function addNoteAt(ms) {
  setAddMode(false);
  addNote({ start: Math.round(ms / 1000) * 1000, kind: 'other', label: 'New note: what happened?' });
}

async function markQuakes() {
  if (!state.trace) return;
  const btn = $('note-quakes');
  btn.disabled = true;
  status('Asking the USGS catalog for quakes on this day…');
  try {
    const { startMs, endMs } = state.win;
    const world = { minLat: -90, maxLat: 90, minLon: -180, maxLon: 180 };
    const [local, big, table] = await Promise.all([
      es.getEvents({ startMs: startMs - 30 * 60000, endMs, minMag: QUAKES.regionalMinMag, region: REGION }),
      es.getEvents({ startMs: startMs - 30 * 60000, endMs, minMag: QUAKES.worldMinMag, region: world }),
      fetch(new URL('../../data/traveltimes-iasp91.json', import.meta.url)).then((r) => (r.ok ? r.json() : null)).catch(() => null),
    ]);
    const evs = new Map([...local, ...big].map((e) => [e.id, e]));
    const st = Number.isFinite(state.station.lat) ? state.station : null;
    const notes = [...evs.values()].map((e) => DV.quakeNote(e, st, { vp: WAVE_RACE.vp, vs: WAVE_RACE.vs, table }))
      .filter((n) => n && (n.p ?? n.start) >= startMs && (n.p ?? n.start) < endMs);
    mergeNotes(notes);
    state.quakesMarked = state.quakesMarked || notes.length > 0;
    notesChanged();
    status(notes.length
      ? `Marked ${notes.length} quake${notes.length > 1 ? 's' : ''} from the USGS catalog (Utah M${QUAKES.regionalMinMag}+, anywhere M${QUAKES.worldMinMag}+).${st ? ' P and S show where their waves should arrive.' : ' The station’s position is not known, so only the origin times are marked.'}`
      : `No quakes in the USGS catalog for this day (Utah M${QUAKES.regionalMinMag}+, anywhere M${QUAKES.worldMinMag}+).`);
  } catch (err) {
    status(`Quakes: ${err.message}`, true);
  } finally {
    btn.disabled = false;
  }
}

function downloadNotes() {
  if (!state.station) return;
  const f = DV.notesFile({ station: state.station.key, title: `Notes for ${state.station.key}`, notes: state.notes });
  const blob = new Blob([JSON.stringify(f, null, 2) + '\n'], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `notes-${state.station.key}-${DV.localDate(state.win.startMs + 12 * DV.HOUR_MS)}.json`;
  a.hidden = true;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 60000);
}

async function openNotesFile(file) {
  if (!file) return;
  try {
    if (file.size > 2e6) throw new Error('the file is too big for a notes file');
    const f = DV.parseNotesFile(await file.text());
    mergeNotes(f.notes);
    const other = f.station && state.station && f.station !== state.station.key ? ` They were written for ${f.station}; you are looking at ${state.station.key}.` : '';
    state.notesInfo = `Opened ${f.notes.length} notes from ${file.name}.${f.skipped ? ` ${f.skipped} could not be read.` : ''}${other}`;
    notesChanged();
  } catch (err) {
    state.notesInfo = `Could not open ${file.name}: ${err.message}`;
    renderNotes();
  }
}

let clearArmed = 0;
function clearNotes() {
  const btn = $('notes-clear');
  if (!clearArmed) {
    btn.textContent = `Click again to delete all ${state.notes.length} notes`;
    clearArmed = setTimeout(() => { clearArmed = 0; btn.textContent = 'Delete all notes'; }, 4000);
    return;
  }
  clearTimeout(clearArmed);
  clearArmed = 0;
  btn.textContent = 'Delete all notes';
  state.notes = [];
  state.notesInfo = 'All notes deleted for this station.';
  notesChanged();
}

// ---------------------------------------------------------------------------------------------
// Wiring

function wire() {
  for (const m of ['file', 'uu', 'uhsn']) $(`src-${m}`).addEventListener('change', () => setMode(m));
  $('example').addEventListener('click', showExample);
  $('uu-load').addEventListener('click', loadUU);
  $('uu-station').addEventListener('change', () => {
    if ($('uu-station').value === EXAMPLE.station && !params.get('date')) $('uu-date').value = EXAMPLE.date;
  });
  $('uhsn-load').addEventListener('click', loadUhsn);
  $('uhsn-station').addEventListener('change', uhsnStationChanged);
  $('file').addEventListener('change', (e) => openFiles(e.target.files));
  const drop = $('drop');
  drop.addEventListener('dragover', (e) => { e.preventDefault(); drop.classList.add('over'); });
  drop.addEventListener('dragleave', () => drop.classList.remove('over'));
  drop.addEventListener('drop', (e) => { e.preventDefault(); drop.classList.remove('over'); openFiles(e.dataTransfer.files); });
  $('file-channel').addEventListener('change', () => { fillFileDays(); showFileDay(); });
  $('file-day').addEventListener('change', showFileDay);

  $('heli-filter').innerHTML = HELI_FILTERS.map((f) => `<option value="${f.id}">${esc(f.label)}</option>`).join('');
  $('heli-filter').addEventListener('change', (e) => { state.heliFilter = e.target.value; state.gain = 1; drawHelicorder(); });
  $('heli-rows').addEventListener('change', (e) => { state.rowSec = Number(e.target.value); drawHelicorder(); });
  $('gain-up').addEventListener('click', () => { state.gain *= 1.5; heli.setCountsPerLine(DV.countsPerLine(state.background, state.gain)); });
  $('gain-down').addEventListener('click', () => { state.gain /= 1.5; heli.setCountsPerLine(DV.countsPerLine(state.background, state.gain)); });

  $('zoom-span').innerHTML = ZOOM_SPANS.map((s) => `<option value="${s}">${s < 60 ? `${s} s` : `${s / 60} min`}</option>`).join('');
  $('zoom-span').value = String(state.zoomSpan);
  $('zoom-span').addEventListener('change', (e) => {
    state.zoomSpan = Number(e.target.value);
    if (state.zoom) openZoom((state.zoom.startMs + state.zoom.endMs) / 2);
  });
  syncZoomFilterSelect();
  $('zoom-filter').addEventListener('change', (e) => { state.zoomFilter = e.target.value; refilterZoom(); });
  $('zoom-in').addEventListener('click', () => { traceView.zoom(1 / 1.5); zoomLearned(); });
  $('zoom-out').addEventListener('click', () => { traceView.zoom(1.5); zoomLearned(); });
  // D35: the zoom trace's label fades once it has been dragged or zoomed
  const zc = $('zoom-trace');
  const zoomLearned = () => $('zoom-cue').classList.add('learned');
  zc.addEventListener('pointerdown', (e) => {
    if (e.pointerType === 'touch') $('zoom-cue').textContent = '↔ Drag to slide · ＋ − to zoom';
    const x0 = e.clientX;
    const up = (u) => { if (Math.abs(u.clientX - x0) > 4) zoomLearned(); zc.removeEventListener('pointerup', up); };
    zc.addEventListener('pointerup', up);
  });
  zc.addEventListener('wheel', zoomLearned, { passive: true });
  zc.addEventListener('keydown', (e) => { if (['+', '-', '=', 'ArrowLeft', 'ArrowRight'].includes(e.key)) zoomLearned(); });
  $('zoom-prev').addEventListener('click', () => shiftZoom(-1));
  $('zoom-next').addEventListener('click', () => shiftZoom(1));
  $('csv').addEventListener('click', downloadWindowCsv);
  $('note-window').addEventListener('click', () => {
    if (!state.zoom) return;
    const v = zoomView();
    addNote({ start: Math.round(v.startMs / 1000) * 1000, end: Math.round(v.endMs / 1000) * 1000, kind: 'other', label: 'Something to look at' });
  });

  $('noise-band').innerHTML = NOISE_BANDS.map((b) => `<option value="${b.id}">${esc(b.label)}</option>`).join('');
  $('noise-band').addEventListener('change', (e) => { state.noiseBand = e.target.value; drawNoise(); });

  $('note-add').addEventListener('click', () => setAddMode($('note-add').getAttribute('aria-pressed') !== 'true'));
  $('note-quakes').addEventListener('click', markQuakes);
  $('notes-download').addEventListener('click', downloadNotes);
  $('notes-file').addEventListener('change', (e) => { openNotesFile(e.target.files[0]); e.target.value = ''; });
  $('notes-example').addEventListener('click', () => loadExampleNotes(true));
  $('notes-clear').addEventListener('click', clearNotes);
  const body = $('notes-body');
  body.addEventListener('change', onNotesEdit);
  body.addEventListener('input', (e) => { if (e.target.classList.contains('n-label')) onNotesEdit(e); });
  body.addEventListener('click', (e) => {
    const n = noteFromRow(e.target);
    if (!n) return;
    if (e.target.classList.contains('n-del')) {
      state.notes = state.notes.filter((x) => x !== n);
      notesChanged();
    } else if (e.target.classList.contains('n-go')) {
      if (n.end != null && n.end - n.start <= 3600000) openZoom({ startMs: Math.max(state.win.startMs, n.start - 30000), endMs: Math.min(state.win.endMs, n.end + 30000) });
      else openZoom(n.p != null ? (n.p + (n.s ?? n.p)) / 2 : n.start);
      $('zoom-card').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  });
}

async function init() {
  fillStandIns();
  wire();
  showCredits($('credits'), ['waveforms', 'events']);
  heli.clear();
  noise.clear();
  const src = params.get('source');
  setMode(['file', 'uu', 'uhsn'].includes(src) ? src : 'uu');
  // nothing loads until a button is pressed
}

/**
 * The example: HEB on Nov 17, 2026 from the test folder that comes with the site (no download
 * from EarthScope). If ?uhsn= points at another server without HEB, it comes from EarthScope.
 */
async function showExample() {
  setMode('uhsn');
  const ok = await initUhsn();
  const sel = $('uhsn-station');
  if (ok && [...sel.options].some((o) => o.value === EXAMPLE.station)) {
    sel.value = EXAMPLE.station;
    await uhsnStationChanged();
    $('uhsn-date').value = EXAMPLE.date;
    await loadUhsn();
    return;
  }
  setMode('uu');
  $('uu-station').value = EXAMPLE.station;
  $('uu-date').value = EXAMPLE.date;
  await loadUU();
}

init();
