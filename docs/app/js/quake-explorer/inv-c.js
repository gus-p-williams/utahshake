// Investigation C: "Which way did the ground move?" (particle motion).
//
// Students watch the path the ground traced during the first half second of P, aim their
// own guess of the direction to the quake, then reveal the computer's estimate and the
// true direction. With the S − P distance from the same station, one station can then
// locate the quake. Turning to Z R T (along the path / sideways) shows P on R and S on T.
import { MotionView } from './motion-view.js';
import { MapView } from '../ui/map-view.js';
import * as L from '../../vendor/leaflet.js';
import { loadStation, trimToData } from './data.js';
import { fillStationSelect } from './station-select.js';
import { renderSteps } from './steps.js';
import { QUAKE_EXPLORER as Q, SCHOOLS } from './config.js';
import { WAVE_RACE } from '../config.js';
import { filteredData } from '../data/filters.js';
import { destination, distanceKm } from '../lib/geo.js';
import { spToDistanceKm, hypoToEpiKm } from '../lib/locate.js';
import { angleDiff } from '../lib/motion.js';
import { esc } from '../ui/page.js';

const $ = (id) => document.getElementById(id);
const COLOURS = { guess: '#15803d', computer: '#7c3aed', truth: '#d97706' };

export function createC(ctx) {
  let mv = null;
  let map = null;
  let lines = null;         // Leaflet layer for the direction lines and the one-station answer
  let st = null;            // loaded station
  let stations = [];
  let loadedFor = null;
  let stage = 0;            // 0 guessing, 1 computer shown, 2 truth shown
  let mode = 'NE';

  const isDistant = () => ctx.kind === 'distant';

  const steps = renderSteps($('c-steps'), {
    inv: 'C',
    question: 'Which way did the ground move?',
    predict: {
      prompt: 'In the first half second of the P wave, how does the ground move?',
      options: [
        { value: 'updown', label: 'Only up and down' },
        { value: 'along', label: 'Back and forth along the line to the quake' },
        { value: 'across', label: 'Side to side, across that line' },
        { value: 'circles', label: 'Round in circles' },
      ],
    },
    explore: `<p>Three sensors at right angles record up (Z), north (N) and east (E). Together they
      draw the path the ground traced. The blue band marks the first moment of P.</p>
      <p>Press <b>▶ Trace the path</b>. Then drag on <b>Seen from above</b> to aim your
      guess at where the quake is.</p>`,
    why: `<p>A P wave pushes and pulls the rock along its direction of travel. It arrives from
      below, slanting up and away from the quake, so the ground moves along the line to the
      quake: up-and-away or down-and-toward. Up always goes with away, which tells you which
      end of the line the quake is on.</p>
      <p>An S wave shakes the rock sideways, across its path.</p>
      <p><a href="../../theory/ground-motion/" target="_blank" rel="noopener">Which way the ground moves ↗</a> ·
      <a href="../../theory/waves/" target="_blank" rel="noopener">Seismic waves ↗</a></p>`,
    checkLabel: "Lock my guess and show the computer's direction",
    onCheck: showComputer,
  });

  $('c-station').addEventListener('change', () => select($('c-station').value));
  $('c-mode').addEventListener('click', toggleMode);

  function ensureViews() {
    if (mv) return;
    mv = new MotionView($('c-motion'), {
      farKm: Q.motion.goodWithinKm,
      onGuess: () => { renderLines(); renderReadout(); },
      onEstimate: () => { renderLines(); renderReadout(); },
      onWindow: () => { renderLines(); renderReadout(); },
    });
    // Jump the window to the first moment of P or of S.
    for (const ph of ['P', 'S']) {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = ph === 'P' ? 'pick-p' : 'pick-s';
      b.textContent = `${ph} window`;
      b.addEventListener('click', () => mv.selectPhase(ph));
      mv.toolbar.append(b);
    }
    map = new MapView($('c-map'));
    map.showSchools(SCHOOLS);
    lines = L.layerGroup().addTo(map.map);
  }

  async function select(key) {
    const item = stations.find((x) => x.key === key);
    if (!item) return;
    $('c-station').value = key;
    ctx.selectStation(key);
    const pre = isDistant() ? 60 : 10;
    const post = isDistant() ? 1800 : Math.min(150, item.distKm / 3.0 + 30);
    let d = await loadStation(ctx.source, ctx.event, item.station, { preSec: pre, postSec: post });
    if (!d || !d.n) { steps.readout.textContent = 'No three-component data here: try another station.'; return; }
    d = trimToData(d);
    const band = isDistant() ? { lo: 0.3, hi: 2 } : Q.motion.filter;
    const f = (a) => filteredData({ data: a, sampleRate: d.sampleRate }, band);
    const arr = await ctx.arrivalsAt(key);
    const picks = { P: arr.P?.tSec, S: arr.S?.tSec };
    // Say who made each pick: University of Utah analysts, the computer, or the Earth model.
    const who = (a) => (a?.who === 'analyst' ? 'UUSS' : a ? 'computer' : '');
    const labels = { P: who(arr.P), S: who(arr.S) };
    if (isDistant() && picks.P == null) {
      const t = await ctx.modelTimes(item.station);
      picks.P = t.P;
      picks.S = t.S;
      labels.P = 'Earth model';
      labels.S = 'Earth model';
    }
    mv.pickLabel = labels;
    st = { ...d, item, picks, band };
    mode = 'NE';
    $('c-mode').setAttribute('aria-pressed', 'false');
    $('c-mode').textContent = 'Turn to Z R T';
    const win = picks.P != null && isDistant() ? { t0: picks.P - 1, t1: picks.P + 5 } : undefined;
    mv.setData({ refMs: ctx.event.timeMs, startMs: d.startMs, sampleRate: d.sampleRate,
      z: f(d.z), n: f(d.n), e: f(d.e), picks, trueBazDeg: d.bazDeg, distKm: item.distKm,
      label: ctx.label(item.station.sta), window: win,
      view: isDistant() && picks.P != null ? { from: picks.P - 20, to: (picks.S ?? picks.P + 300) + 60 } : undefined });
    applyStage();
    map.showStations([{ key, sta: item.station.sta, lat: item.station.lat, lon: item.station.lon,
      color: ctx.isSchool(item.station.sta) ? '#fbbf24' : '#60a5fa', schools: [] }]);
    const reach = isDistant() ? 1500 : 160;
    const corners = [0, 90, 180, 270].map((az) => destination(item.station.lat, item.station.lon, az, reach));
    map.fitTo([{ lat: item.station.lat, lon: item.station.lon }, ...corners], 10);
    renderLines();
    renderReadout();
  }

  function applyStage() {
    mv.setShow({ guess: true, lockGuess: stage >= 1, computer: stage >= 1, truth: stage >= 2, picks: true, trust: true });
  }

  /** Direction lines on the map from the station: the guess, the computer's, the true one. */
  function renderLines() {
    if (!lines || !st) return;
    lines.clearLayers();
    const { lat, lon } = st.item.station;
    const len = isDistant() ? 2500 : 200;
    const ray = (az, colour, dash) => {
      if (!Number.isFinite(az)) return;
      const end = destination(lat, lon, az, len);
      L.polyline([[lat, lon], [end.lat, end.lon]], { color: colour, weight: 3, dashArray: dash, interactive: false }).addTo(lines);
    };
    ray(mv.getGuess(), COLOURS.guess);
    const est = mv.getEstimate();
    if (stage >= 1 && est) ray(est.bazDeg, COLOURS.computer, '8 6');
    if (stage >= 2) {
      ray(st.bazDeg, COLOURS.truth);
      map.setOfficial(ctx.event);
      const loc = oneStation();
      if (loc) {
        map.setCircles([{ lat, lon, radiusKm: loc.epiKm, color: '#64748b' }]);
        L.circleMarker([loc.at.lat, loc.at.lon], { radius: 7, color: '#111', weight: 1.5, fillColor: COLOURS.computer, fillOpacity: 1 })
          .bindTooltip('One-station location: computer direction + S − P distance').addTo(lines);
      }
    } else {
      map.setOfficial(null);
      map.setCircles([]);
    }
  }

  /** Locate the quake from this station alone: direction (computer) + distance (S − P). */
  function oneStation() {
    const est = mv?.getEstimate();
    if (isDistant() || !st || !est || st.picks.P == null || st.picks.S == null) return null;
    const sp = st.picks.S - st.picks.P;
    const epiKm = hypoToEpiKm(spToDistanceKm(sp, WAVE_RACE.vp, WAVE_RACE.vs), WAVE_RACE.depthKm);
    const at = destination(st.item.station.lat, st.item.station.lon, est.bazDeg, epiKm);
    return { sp, epiKm, at, missKm: distanceKm(at.lat, at.lon, ctx.event.lat, ctx.event.lon) };
  }

  function renderReadout() {
    if (!mv || !st) return;
    const g = mv.getGuess();
    const est = mv.getEstimate();
    steps.readout.innerHTML = `
      <div><span>Station</span><b>${esc(ctx.label(st.item.station.sta))}${ctx.preset?.hidePlace && stage < 2 ? '' : `, ${Math.round(st.item.distKm).toLocaleString('en-US')} km`}</b></div>
      <div><span>Your guess</span><b>${Number.isFinite(g) ? `${Math.round(g)}°` : '–'}</b></div>
      ${stage >= 1 && est ? `<div><span>Computer (from the P motion)</span><b>${Math.round(est.bazDeg)}°</b></div>` : ''}
      ${stage >= 2 ? `<div><span>True direction</span><b>${Math.round(st.bazDeg)}°</b></div>` : ''}`;
  }

  function showComputer() {
    if (!mv) return;
    stage = Math.max(stage, 1);
    applyStage();
    renderLines();
    renderReadout();
    const g = mv.getGuess();
    steps.result.innerHTML = `<div class="qe-result">
      <p>The computer finds the line the ground moved along in your window, and uses
        "up goes with away" to choose its end.</p>
      ${Number.isFinite(g) ? '' : '<p class="hint">You did not aim a guess: try it on the next station.</p>'}
      <div class="actions"><button type="button" class="primary" data-truth>Show the true direction</button></div>
    </div>`;
    steps.result.querySelector('[data-truth]').addEventListener('click', showTruth);
  }

  function showTruth() {
    stage = 2;
    applyStage();
    ctx.revealPlace();
    renderLines();
    renderReadout();
    const est = mv.getEstimate();
    const g = mv.getGuess();
    const err = est ? angleDiff(est.bazDeg, st.bazDeg) : NaN;
    const loc = oneStation();
    const pred = steps.prediction();
    steps.result.innerHTML = `<div class="qe-result">
      <p>True direction: <span class="big">${Math.round(st.bazDeg)}°</span>.
        Computer: ${Math.round(err) >= 0 ? '+' : ''}${Math.round(err)}°${Number.isFinite(g) ? `; your guess: ${Math.round(angleDiff(g, st.bazDeg)) >= 0 ? '+' : ''}${Math.round(angleDiff(g, st.bazDeg))}°` : ''}.</p>
      <p>${Math.abs(err) <= 15 ? 'Within 15°: typical for a clear P wave at a station this close.'
        : Math.abs(err) > 150 ? 'It points the wrong way: "up goes with away" was unclear in this window. That happens about 1 time in 15.'
        : 'More than 15° off. Waves bend and scatter in real rock; stations within about 100 km do best.'}</p>
      ${pred && pred !== 'along' ? `<p>You predicted: <i>${esc(steps.predictionLabel())}</i>. The path from above lines up with the direction to the quake: P pushes <b>along</b> its path.</p>` : ''}
    </div>`;
    steps.extra.innerHTML = `<div class="qe-result">
      ${loc ? `<p><b>One station can locate a quake.</b> S − P here is ${loc.sp.toFixed(1)} s, so the quake is about
        ${Math.round(loc.epiKm)} km away (the gray circle, as in Quake Locator). Going ${Math.round(loc.epiKm)} km along the
        computer's direction lands <b>${Math.round(loc.missKm)} km</b> from the official epicenter (the purple dot and the star).</p>` : ''}
      <p><b>Now S.</b> Press <b>S window</b> (above the record), then <b>Turn to Z R T</b>
        (R = along the path, T = sideways). Which one carries the S wave?</p>
    </div>`;
  }

  function toggleMode() {
    if (!mv || !st) return;
    const est = mv.getEstimate();
    const az = stage >= 2 ? st.bazDeg : stage >= 1 && est ? est.bazDeg : mv.getGuess();
    if (mode === 'NE') {
      if (!Number.isFinite(az)) { $('c-mode').title = 'Aim your guess first: Z R T turns the sensors toward a direction.'; return; }
      if (mv.setMode('RT', az)) mode = 'RT';
    } else {
      mv.setMode('NE');
      mode = 'NE';
    }
    $('c-mode').setAttribute('aria-pressed', String(mode === 'RT'));
    $('c-mode').textContent = mode === 'RT' ? 'Back to Z N E' : 'Turn to Z R T';
  }

  return {
    available() { return true; },
    reset() {
      st = null; loadedFor = null; stage = 0; mode = 'NE';
      steps.setEvent(ctx.event.id);
      if (lines) lines.clearLayers();
      if (map) { map.setOfficial(null); map.setCircles([]); }
    },
    async show() {
      ensureViews();
      mv.resize();
      map.invalidate();
      if (loadedFor === ctx.event.id) return;
      loadedFor = ctx.event.id;
      stations = await fillStationSelect($('c-station'), ctx, { threeC: true, hideKm: !!ctx.preset?.hidePlace,
        maxKm: isDistant() ? undefined : 200, farKm: isDistant() ? undefined : Q.motion.goodWithinKm, limit: 30 });
      if (!stations.length) throw new Error('No three-component stations recorded this quake');
      await select($('c-station').value);
    },
    error(err) { steps.readout.textContent = `${err.message}.`; },
    csvRows() {
      if (!st || !mv) return [];
      const rows = [];
      if (steps.prediction()) rows.push(['prediction', steps.predictionLabel(), '', '']);
      rows.push(['station', st.item.station.sta, '', `${Math.round(st.item.distKm)} km`]);
      const g = mv.getGuess();
      if (Number.isFinite(g)) rows.push(['my direction guess', Math.round(g), 'degrees', 'from north, clockwise']);
      const est = mv.getEstimate();
      if (stage >= 1 && est) rows.push(['computer direction', Math.round(est.bazDeg), 'degrees', `window ${est.t0.toFixed(2)}-${est.t1.toFixed(2)} s`]);
      if (stage >= 2) rows.push(['true direction', Math.round(st.bazDeg), 'degrees', '']);
      const loc = stage >= 2 ? oneStation() : null;
      if (loc) rows.push(['one-station location miss', Math.round(loc.missKm), 'km', `S - P ${loc.sp.toFixed(2)} s`]);
      return rows;
    },
  };
}
