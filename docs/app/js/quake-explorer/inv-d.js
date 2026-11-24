// Investigation D: "A message from far away" (distant quakes).
//
// A big quake thousands of kilometres away, recorded at a school stand-in. Students pick
// P and S on half an hour of record; the time between them, read off a model of the whole
// Earth (iasp91), says how far away the quake was. Then they reveal the real distance and
// the model's times, and find the surface waves: slowest, but biggest this far away.
import { TraceView } from '../ui/trace-view.js';
import { SpectrogramView, followTraceView } from './spectrogram-view.js';
import { QuakeAudio } from './audio.js';
import { TravelTimeChart } from './travel-time-chart.js';
import { loadStation, trimToData } from './data.js';
import { fillStationSelect } from './station-select.js';
import { renderSteps } from './steps.js';
import { filteredData } from '../data/filters.js';
import { stft, suggestStft } from '../lib/spectral.js';
import { decimate, peakAbs } from '../lib/signal.js';
import { allowedSpeedUps } from '../lib/audify.js';
import { distanceFromSP, surfaceWaveWindow } from '../lib/teleseism.js';
import { esc } from '../ui/page.js';

const $ = (id) => document.getElementById(id);
const KM_PER_DEG = 111.19;
const BANDS = { body: { lo: 0.05, hi: 2 }, surface: { lo: 0.02, hi: 0.1 }, raw: {} };
const mmss = (sec) => {
  const s = Math.round(Math.abs(sec));
  return `${sec < 0 ? '−' : ''}${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
};

export function createD(ctx) {
  const tv = new TraceView($('d-trace'), { interactive: true, onPick, onArm });
  const sv = new SpectrogramView($('d-spec'), { logFreq: true });
  followTraceView(sv, tv);
  const chart = new TravelTimeChart($('d-chart'));
  const audio = new QuakeAudio();
  let st = null;
  let stations = [];
  let loadedFor = null;
  let picks = {};           // {P: ms, S: ms}
  let revealed = false;
  let model = null;         // Earth-model times at this station {P, S, deg}
  let table = null;

  const steps = renderSteps($('d-steps'), {
    inv: 'D',
    question: 'A message from the far side of the world',
    predict: {
      prompt: 'Three kinds of wave travel from a big quake far away. Which reaches Utah <b>last</b>?',
      options: [
        { value: 'P', label: 'P waves' },
        { value: 'S', label: 'S waves' },
        { value: 'surface', label: 'Surface waves' },
        { value: 'same', label: 'They all arrive together' },
      ],
    },
    explore: `<p>This is half an hour of shaking. Press <b>Pick P</b> and click where the first
      small wiggles start. Then <b>Pick S</b>: a second, bigger change, easiest to see on the
      north and east sensors. Zoom in with the scroll wheel.</p>
      <p>The app turns your S − P time into a distance, using a model of the whole Earth.
      Then look for the biggest, slowest waves, and press <b>▶ Listen</b>.</p>`,
    why: `<p>P and S travel through the Earth. Rock gets faster with depth, so waves going far
      dive deep and come back up: the travel times curve instead of growing in a straight
      line. Surface waves stay near the surface: they are the slowest, but they spread over
      a ring instead of a sphere, so far away they are the biggest.</p>
      <p>Far away, S arrives from almost straight below, so it shakes the ground sideways:
      look for it on the north and east sensors.</p>
      <p><a href="../../theory/travel-times/" target="_blank" rel="noopener">Travel times and Earth's layers ↗</a> ·
      <a href="../../theory/ground-motion/" target="_blank" rel="noopener">Which way the ground moves ↗</a></p>`,
    checkLabel: 'Reveal the real distance and the model times',
    onCheck: reveal,
  });

  $('d-station').addEventListener('change', () => select($('d-station').value));
  $('d-filter').addEventListener('change', () => redraw(true));
  $('d-arm-p').addEventListener('click', () => tv.arm(tv.armed === 'P' ? null : 'P'));
  $('d-arm-s').addEventListener('click', () => tv.arm(tv.armed === 'S' ? null : 'S'));
  $('d-clear').addEventListener('click', () => { picks = {}; tv.setPicks({}); update(); });
  $('d-zoom-reset').addEventListener('click', () => tv.resetZoom());
  $('d-play').addEventListener('click', play);

  function onArm(armed) {
    $('d-arm-p').setAttribute('aria-pressed', String(armed === 'P'));
    $('d-arm-s').setAttribute('aria-pressed', String(armed === 'S'));
    $('d-trace').classList.toggle('armed', !!armed);
  }

  function onPick(phase, ms) {
    picks[phase] = ms;
    tv.setPicks({ ...picks });
    tv.arm(null);
    update();
  }

  const secOf = (ms) => (ms - ctx.event.timeMs) / 1000;

  async function select(key) {
    const item = stations.find((x) => x.key === key);
    if (!item) return;
    audio.stop();
    $('d-station').value = key;
    ctx.selectStation(key);
    $('d-note').textContent = 'Loading half an hour of record…';
    table = await ctx.travelTimes();
    model = await ctx.modelTimes(item.station);
    const post = Math.min(3600, Math.ceil(surfaceWaveWindow(model.deg).endSec + 300));
    let d = await loadStation(ctx.source, ctx.event, item.station, { preSec: 60, postSec: post });
    if (!d) { $('d-note').textContent = 'No data from this station: try another.'; return; }
    d = trimToData(d);
    const f = Math.max(1, Math.round(d.sampleRate / 20));
    const dec = (a) => (a ? decimate(a, d.sampleRate, f).data : null);
    st = { ...d, item, rawZ: d.z, rawRate: d.sampleRate, zd: dec(d.z), nd: dec(d.n), ed: dec(d.e), rate: d.sampleRate / f };
    picks = {};
    tv.setPicks({});
    const { min, max } = allowedSpeedUps(st.rawRate);
    $('d-speed').innerHTML = [100, 200, 400].filter((s) => s >= min && s <= max)
      .map((s) => `<option value="${s}"${s === 200 ? ' selected' : ''}>${s}×</option>`).join('');
    const start = (st.startMs - ctx.event.timeMs) / 1000;
    const dur = st.zd.length / st.rate;
    sv.setData(stft(st.zd, st.rate, suggestStft(st.rate, dur)), { startMs: st.startMs, refMs: ctx.event.timeMs,
      fromSec: start, toSec: start + dur });
    chart.setTable(table, ctx.event.depthKm);
    redraw(false);
    update();
    $('d-title').innerHTML = `<b>${esc(ctx.label(item.station.sta))}</b> <span class="muted">· ${esc(ctx.event.place)} ·
      time in seconds after the quake</span>`;
    $('d-note').textContent = st.nd ? '' : 'This station has only the vertical (up) sensor: S is easier to see at a three-component station.';
  }

  function redraw(keepView) {
    if (!st) return;
    const band = BANDS[$('d-filter').value];
    const start = (st.startMs - ctx.event.timeMs) / 1000;
    const dur = st.zd.length / st.rate;
    const one = (data, label) => ({ label, data: filteredData({ data, sampleRate: st.rate }, band), startMs: st.startMs, sampleRate: st.rate });
    const traces = [one(st.zd, 'Z up')];
    if (st.nd) traces.push(one(st.nd, 'N north'), one(st.ed, 'E east'));
    tv.setData(traces, ctx.event.timeMs, start, start + dur, keepView);
    tv.setPicks({ ...picks });
  }

  function measured() {
    if (picks.P == null || picks.S == null) return null;
    const sp = (picks.S - picks.P) / 1000;
    const deg = distanceFromSP(table, sp, Math.max(0, ctx.event.depthKm));
    return { sp, deg };
  }

  function update() {
    const m = measured();
    steps.readout.innerHTML = `
      <div><span>Your P (min:s after the quake)</span><b>${picks.P != null ? mmss(secOf(picks.P)) : '–'}</b></div>
      <div><span>Your S (min:s)</span><b>${picks.S != null ? mmss(secOf(picks.S)) : '–'}</b></div>
      <div><span>S − P</span><b>${m ? `${Math.round(m.sp)} s` : '–'}</b></div>
      <div><span>Distance from S − P</span><b>${m && Number.isFinite(m.deg) ? `${m.deg.toFixed(1)}° ≈ ${Math.round(m.deg * KM_PER_DEG).toLocaleString('en-US')} km` : '–'}</b></div>`;
    const marks = [];
    if (picks.P != null) marks.push({ phase: 'P', tSec: secOf(picks.P) });
    if (picks.S != null) marks.push({ phase: 'S', tSec: secOf(picks.S) });
    chart.setMarks({ picks: marks, estDeg: m && Number.isFinite(m.deg) ? m.deg : null, trueDeg: revealed ? model?.deg : null });
  }

  function surfacePeak() {
    const y = filteredData({ data: st.zd, sampleRate: st.rate }, BANDS.surface);
    const start = (st.startMs - ctx.event.timeMs) / 1000;
    const i0 = Math.max(0, Math.round((model.S + 60 - start) * st.rate));
    const peak = peakAbs(y, i0);
    for (let i = i0; i < y.length; i++) if (Math.abs(y[i]) === peak) return start + i / st.rate;
    return NaN;
  }

  function reveal() {
    if (!st || !model) return;
    revealed = true;
    update();
    const m = measured();
    const sw = surfaceWaveWindow(model.deg);
    const peak = surfacePeak();
    const row = (label, mine, theirs) => `<div><span>${label}</span><b>${mine != null ? mmss(mine) : '–'} · ${mmss(theirs)}</b></div>`;
    steps.result.innerHTML = `<div class="qe-result">
      <p>Real distance: <span class="big">${model.deg.toFixed(1)}°</span>
        (${Math.round(model.deg * KM_PER_DEG).toLocaleString('en-US')} km).
        ${m && Number.isFinite(m.deg) ? `Your S − P gave ${m.deg.toFixed(1)}°: ${Math.abs(m.deg - model.deg) <= 3 ? 'very close' : `${Math.abs(m.deg - model.deg).toFixed(0)}° off`}.` : ''}</p>
      <div class="qe-readout">
        <div><span></span><b>you · Earth model</b></div>
        ${row('P', picks.P != null ? secOf(picks.P) : null, model.P)}
        ${row('S', picks.S != null ? secOf(picks.S) : null, model.S)}
      </div>
      <p>The biggest slow waves (surface waves) peak at <b>${mmss(peak)}</b>, inside the
        ${mmss(sw.startSec)}–${mmss(sw.endSec)} window of 3.0–4.2 km/s along the surface.
        ${steps.prediction() === 'surface' ? 'You predicted it: surface waves arrive last.' : 'Surface waves arrive last: they are the slowest.'}</p>
      <p class="hint">Real waves often reach Utah a few seconds later than the model, which
        averages the whole Earth. A good thing to discuss: what could make the rock under
        Utah slower than average?</p>
    </div>`;
    steps.extra.innerHTML = `<div class="qe-result">
      <p><b>Make a class travel-time chart.</b> Each group picks P and S for a different big
        quake (from &ldquo;Big quakes far away&rdquo;), then downloads its answers (CSV). Plot S − P against the
        real distance: does it fall on a straight line?</p>
    </div>`;
  }

  function play() {
    if (audio.isPlaying) { audio.stop(); return; }
    if (!st) return;
    const band = BANDS[$('d-filter').value];
    const y = filteredData({ data: st.rawZ, sampleRate: st.rawRate }, band);
    try {
      audio.play(y, st.rawRate, Number($('d-speed').value), {
        dataStartSec: (st.startMs - ctx.event.timeMs) / 1000, fromSec: tv.view.from, toSec: tv.view.to,
        onTime: (sec) => sv.setCursor(sec),
        onEnd: () => { sv.setCursor(null); $('d-play').textContent = '▶ Listen'; },
      });
      $('d-play').textContent = '■ Stop';
    } catch (err) {
      $('d-note').textContent = err.message;
    }
  }

  return {
    available() {
      return ctx.kind === 'distant' ? true : 'Investigation D needs a big quake far away: choose one from “Big quakes far away”';
    },
    reset() {
      audio.stop();
      st = null; loadedFor = null; picks = {}; revealed = false; model = null;
      steps.setEvent(ctx.event.id);
    },
    async show() {
      tv.resize(); sv.resize(); chart.draw();
      if (loadedFor === ctx.event.id) return;
      loadedFor = ctx.event.id;
      stations = await fillStationSelect($('d-station'), ctx, { limit: 12 });
      if (!stations.length) throw new Error('No stations near the schools recorded this quake');
      await select($('d-station').value);
    },
    error(err) { $('d-note').textContent = `${err.message}.`; },
    csvRows() {
      if (!st) return [];
      const rows = [];
      if (steps.prediction()) rows.push(['prediction', steps.predictionLabel(), '', '']);
      rows.push(['station', st.item.station.sta, '', '']);
      if (picks.P != null) rows.push(['my P', secOf(picks.P).toFixed(1), 's after the quake', '']);
      if (picks.S != null) rows.push(['my S', secOf(picks.S).toFixed(1), 's after the quake', '']);
      const m = measured();
      if (m) rows.push(['my S - P', m.sp.toFixed(1), 's', Number.isFinite(m.deg) ? `${m.deg.toFixed(1)} degrees` : '']);
      if (model) rows.push(['real distance', model.deg.toFixed(2), 'degrees', `${Math.round(model.deg * KM_PER_DEG)} km`]);
      if (model) rows.push(['Earth model P, S', `${model.P.toFixed(1)} / ${model.S.toFixed(1)}`, 's', 'iasp91']);
      return rows;
    },
  };
}
