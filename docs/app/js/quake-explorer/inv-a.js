// Investigation A: "How fast is the rock?" (record section).
//
// Students lay a P ruler and an S ruler along the arrivals; the slope of each ruler is
// that wave's speed. Then they reveal the professionals' picks (and the computer's, where
// the analysts made none), the lines fitted through them, and, for a big quake, the bend
// where the head wave along the top of the mantle (Pn) overtakes the direct wave.
import { RecordSectionView } from './record-section-view.js';
import { loadRecordSection, sectionFits } from './data.js';
import { renderSteps } from './steps.js';
import { QUAKE_EXPLORER as Q } from './config.js';
import { curves } from '../lib/traveltime.js';
import { esc } from '../ui/page.js';

const $ = (id) => document.getElementById(id);
const f1 = (x) => x.toFixed(1);
const f2 = (x) => x.toFixed(2);

export function createA(ctx) {
  let data = null;          // loadRecordSection result
  let loadedFor = null;     // event id
  let revealed = false;
  const rulers = { P: null, S: null };
  let fits = null;

  const view = new RecordSectionView($('a-canvas'), {
    onRuler(id, r) {
      rulers[id] = r.speedKms > 0 && Number.isFinite(r.speedKms) ? r : null;
      renderReadout();
    },
    onSelect(key) { ctx.selectStation(key); view.setSelected(key); },
  });

  const steps = renderSteps($('a-steps'), {
    inv: 'A',
    question: 'How fast is the rock?',
    predict: {
      prompt: 'A station 300 km from the quake: when does the first wave (P) reach it?',
      options: [
        { value: 'same', label: 'At the same time as at the nearest station' },
        { value: '25', label: 'About 25 s after the quake' },
        { value: '50', label: 'About 50 s after the quake' },
        { value: '100', label: 'About 100 s after the quake' },
      ],
    },
    explore: `<p>Each wiggly line is one station, placed at its distance from the quake.
      Press <b>P ruler</b> and drag its ends onto the first wiggles (P) at a near and a far
      station. Do the same with the <b>S ruler</b> on the start of the big S waves.</p>
      <p>The ruler shows its speed: kilometres travelled ÷ seconds taken.</p>`,
    why: `<p>Each station is a stopwatch at a known distance. A wave that travels at a steady
      speed reaches farther stations later, so its arrivals line up along a straight line.
      Distance runs down the page and time across, so the slope of the line is the speed:
      the steeper the line, the faster the wave.</p>
      <p>P is faster than S because rock resists being squeezed more than being sheared.</p>
      <p><a href="../../theory/travel-times/" target="_blank" rel="noopener">Travel times and Earth's layers ↗</a></p>`,
    checkLabel: "Reveal the professionals' picks",
    onCheck: reveal,
  });

  $('a-ruler-p').addEventListener('click', () => { view.placeRuler('P'); rulers.P = view.getRuler('P'); renderReadout(); });
  $('a-ruler-s').addEventListener('click', () => { view.placeRuler('S'); rulers.S = view.getRuler('S'); renderReadout(); });
  $('a-clear').addEventListener('click', () => {
    view.clearRuler('P'); view.clearRuler('S');
    rulers.P = null; rulers.S = null;
    renderReadout();
  });
  $('a-amp').addEventListener('change', () => view.setAmplitude($('a-amp').value));
  $('a-reduce').addEventListener('change', () => view.setReduce($('a-reduce').checked ? Q.section.reduceKmS : 0));
  $('a-zoom-in').addEventListener('click', () => view.zoom(1 / 1.6));
  $('a-zoom-out').addEventListener('click', () => view.zoom(1.6));
  $('a-zoom-reset').addEventListener('click', () => view.resetZoom());

  function speedOf(id) {
    const r = rulers[id] ?? view.getRuler(id);
    return r && r.speedKms > 0 && Number.isFinite(r.speedKms) ? r.speedKms : null;
  }

  function renderReadout() {
    const p = speedOf('P');
    const s = speedOf('S');
    steps.readout.innerHTML = `
      <div><span>Your P ruler</span><b>${p ? `${f1(p)} km/s` : '–'}</b></div>
      <div><span>Your S ruler</span><b>${s ? `${f1(s)} km/s` : '–'}</b></div>
      <div><span>P ÷ S</span><b>${p && s ? f2(p / s) : '–'}</b></div>`;
  }

  const fitPicks = () => sectionFits(data, ctx.event.depthKm);

  function reveal() {
    if (!data) return;
    revealed = true;
    fits = fitPicks();
    view.setPicks(data.arrivals.map((a) => ({ key: a.key, phase: a.phase, tSec: a.tSec, who: a.who })));
    const lines = [];
    const maxD = Math.max(...data.traces.map((t) => t.distKm));
    if (fits.bend) {
      lines.push({ label: 'Pg', speedKms: fits.bend.near.speedKms,
        interceptSec: fits.bend.near.interceptSec, d0: 0, d1: Math.min(maxD, fits.bend.crossoverKm + 40), color: '--pick-p' });
      lines.push({ label: 'Pn', speedKms: fits.bend.far.speedKms,
        interceptSec: fits.bend.far.interceptSec, d0: Math.max(0, fits.bend.crossoverKm - 40), d1: maxD, color: '--ok' });
    } else if (fits.pg) {
      lines.push({ label: 'P', speedKms: fits.pg.speedKms, interceptSec: fits.pg.interceptSec,
        d0: 0, d1: Math.min(maxD, 200), color: '--pick-p' });
    }
    if (fits.sg) {
      lines.push({ label: 'S', speedKms: fits.sg.speedKms, interceptSec: fits.sg.interceptSec,
        d0: 0, d1: Math.min(maxD, 240), color: '--pick-s' });
    }
    view.setFits(lines);

    const p = speedOf('P');
    const s = speedOf('S');
    const pro = fits.pg ?? fits.bend?.near;
    const cmp = (mine, theirs) => (mine && theirs
      ? `you ${f1(mine)} km/s, ${Math.abs(mine - theirs) / theirs <= 0.1 ? 'within 10%: well measured' : `${Math.round((100 * (mine - theirs)) / theirs)}% off`}`
      : 'place your ruler to compare');
    const pred = steps.prediction();
    const tAt300 = pro ? pro.interceptSec + 300 / pro.speedKms : null;
    steps.result.innerHTML = `<div class="qe-result">
      ${pro ? `<p><span class="big">P: ${f2(pro.speedKms)} km/s</span> from ${pro.n} analyst picks within 100 km (${cmp(p, pro.speedKms)}).</p>` : ''}
      ${fits.sg ? `<p><span class="big">S: ${f2(fits.sg.speedKms)} km/s</span> from ${fits.sg.n} picks (${cmp(s, fits.sg.speedKms)}).</p>` : ''}
      ${tAt300 ? `<p>At that speed, P would reach 300 km about <b>${Math.round(tAt300)} s</b> after the quake.
        You predicted: <i>${esc(steps.predictionLabel())}</i>.${pred === 'same' ? ' Waves take time to travel, so farther stations always wait longer.' : ''}</p>` : ''}
      <p class="hint">○ analyst picks · □ computer picks, where the analysts made none (they can
        differ from what an analyst would pick).</p>
    </div>`;
    steps.extra.innerHTML = fits.bend ? `<div class="qe-result">
      <p><b>Look past ${Math.round(fits.bend.crossoverKm)} km.</b> The first arrivals leave the
        ${f2(fits.bend.near.speedKms)} km/s line and follow a faster one: <b>${f2(fits.bend.far.speedKms)} km/s</b>.
        That wave went down to the top of the mantle (the Moho), raced along it in faster rock and
        came back up: Pn.</p>
      <p>Where the two lines cross tells how thick the crust is: about <b>${Math.round(fits.bend.crustKm)} km</b>
        here. Tick <b>Reduced time</b> to make an 8 km/s wave run straight down the page.</p>
      <p><a href="../../theory/travel-times/" target="_blank" rel="noopener">How the crust's thickness comes from the bend ↗</a></p>
    </div>` : `<div class="qe-result">
      <p><b>Look at the farthest stations.</b> Do their first wiggles still sit on your P ruler, or a
        little before it? For a bigger quake (try the 2020 Magna earthquake) the first arrivals
        beyond about 150 km follow a faster line: a wave that raced along the top of the mantle.</p>
    </div>`;
    if (fits.bend || fits.pg) {
      const v1 = (fits.bend ? fits.bend.near : fits.pg).speedKms;
      const m = { ...Q.model, vp1: v1, depthKm: Math.min(ctx.event.depthKm, Q.model.crustKm - 1) };
      if (fits.bend) { m.vp2 = fits.bend.far.speedKms; m.crustKm = fits.bend.crustKm; }
      if (fits.sg) m.vs1 = fits.sg.speedKms;
      view.setModel(curves(m, Math.ceil(maxD), 2), { phases: fits.bend ? ['Pg', 'Pn', 'Sg'] : ['Pg', 'Sg'] });
    }
  }

  return {
    available() {
      return ctx.kind === 'local' ? true : 'A record section needs a quake within a few hundred kilometres of the schools';
    },
    reset() {
      data = null; loadedFor = null; revealed = false; fits = null;
      rulers.P = null; rulers.S = null;
      view.clearRuler('P'); view.clearRuler('S');
      view.setPicks([]); view.setFits([]); view.setModel(null);
      $('a-reduce').checked = false; view.setReduce(0);
      $('a-amp').value = 'trace'; view.setAmplitude('trace');
      steps.setEvent(ctx.event.id);
      renderReadout();
    },
    async show() {
      view.resize();
      if (loadedFor === ctx.event.id) return;
      $('a-note').textContent = 'Downloading seismograms from stations spread out to ' +
        `${ctx.sectionKm()} km…`;
      data = await loadRecordSection(ctx.source, ctx.event.id, { maxKm: ctx.sectionKm(),
        postSec: ctx.sectionKm() > 300 ? 140 : Q.section.postSec });
      loadedFor = ctx.event.id;
      if (data.traces.length < 4) throw new Error('Fewer than 4 stations have data for this quake');
      // Trim the window to where the records actually reach (offline samples can be shorter).
      let last = 0;
      for (const t of data.traces) {
        let i = t.data.length - 1;
        while (i > 0 && Number.isNaN(t.data[i])) i--;
        last = Math.max(last, (t.startMs - ctx.event.timeMs) / 1000 + i / t.sampleRate);
      }
      view.setData({
        refMs: ctx.event.timeMs,
        traces: data.traces.map((t) => ({ ...t, label: ctx.label(t.label), short: t.label })),
        tMin: -Q.section.preSec, tMax: Math.ceil(last),
        dMin: 0,
      });
      const clipped = data.traces.filter((t) => t.clipped).map((t) => t.label);
      const noV = data.traces.filter((t) => !t.velocity).length;
      // True ground speed only when the records are clean (Phase 0: Junction yes, Magna 2020 no).
      const trueOk = clipped.length === 0 && noV <= data.traces.length * 0.2;
      const opt = $('a-amp').querySelector('option[value=true]');
      opt.disabled = !trueOk;
      opt.textContent = trueOk ? 'true ground speed' : 'true ground speed (not for this quake)';
      const notes = [`${data.traces.length} stations from ${Math.round(data.traces[0].distKm)} to ` +
        `${Math.round(data.traces[data.traces.length - 1].distKm)} km. Orange: the school stand-ins. ` +
        'Click a station to use it in B and C.'];
      if (clipped.length) {
        notes.push(`Clipped (the sensor maxed out, so its true size is unknown): ${clipped.join(', ')}.` +
          ' That is why "true ground speed" is off for this quake.');
      }
      if (data.missing.length) notes.push(`No usable data from ${data.missing.join(', ')}.`);
      $('a-note').textContent = notes.join(' ');
      if (revealed) reveal();
    },
    error(err) { $('a-note').textContent = `${err.message}.`; },
    csvRows() {
      const rows = [];
      const pred = steps.prediction();
      if (pred) rows.push(['prediction', steps.predictionLabel(), '', '']);
      for (const id of ['P', 'S']) {
        const v = speedOf(id);
        if (v) rows.push([`${id} ruler speed`, v.toFixed(2), 'km/s', '']);
      }
      if (fits?.pg) rows.push(['P speed from analyst picks (within 100 km)', fits.pg.speedKms.toFixed(2), 'km/s', '']);
      if (fits?.sg) rows.push(['S speed from picks', fits.sg.speedKms.toFixed(2), 'km/s', 'analyst and computer picks']);
      if (fits?.bend) {
        rows.push(['Pn speed', fits.bend.far.speedKms.toFixed(2), 'km/s', 'beyond the bend']);
        rows.push(['crust thickness', fits.bend.crustKm.toFixed(1), 'km', 'from the Pn line']);
      }
      return rows;
    },
  };
}
