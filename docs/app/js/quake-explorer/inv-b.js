// Investigation B: "What notes is the ground playing?" (spectrogram, filter, sound).
//
// One station's vertical record above its spectrogram. Dragging a band on the spectrogram
// IS the filter: the record above keeps only those notes, and the "stands out" number says
// how much louder the quake is than the noise in that band. Listening speeds the record up
// so its notes become audible. The check compares a near and a far station (high notes fade
// first) and, for the Leamington pair, a quarry blast with an earthquake of the same size.
import { TraceView } from '../ui/trace-view.js';
import { SpectrogramView, followTraceView, fmtBandHz as fHz } from './spectrogram-view.js';
import { QuakeAudio } from './audio.js';
import { loadStation, trimToData } from './data.js';
import { fillStationSelect } from './station-select.js';
import { renderSteps } from './steps.js';
import { QUAKE_EXPLORER as Q, EXPLORER_PRESETS } from './config.js';
import { filteredData } from '../data/filters.js';
import { stft, suggestStft, amplitudeSpectrum } from '../lib/spectral.js';
import { decimate, snr, peakAbs } from '../lib/signal.js';
import { allowedSpeedUps, audibleRange } from '../lib/audify.js';
import { picksByStation, chooseChannels } from '../lib/fdsn.js';
import { distanceKm } from '../lib/geo.js';
import { esc } from '../ui/page.js';

const $ = (id) => document.getElementById(id);
/** The band as text: "1.0–10 Hz", or "all notes" when there is none (Escape or a double-click). */
const bandText = (b) => (b.lo && b.hi ? `${fHz(b.lo)}–${fHz(b.hi)} Hz` : 'all notes');

/** Mean of a spectrum's amplitudes between f0 and f1 Hz. */
function bandMean(spec, f0, f1) {
  let sum = 0;
  let n = 0;
  spec.freqs.forEach((f, i) => { if (f >= f0 && f <= f1) { sum += spec.amp[i]; n++; } });
  return n ? sum / n : NaN;
}

/**
 * "How many high notes": average strength 8–20 Hz ÷ 1–5 Hz over the whole quake (from just
 * before P to 15 s after S, so a far station's S wave is included too), and the P/S ratio
 * (peak in 2 s after P ÷ peak in 4 s after S), both on the 1–20 Hz record. The same
 * instrument gives both parts of each ratio, so units cancel.
 */
export function notesAt(st, pSec, sSec) {
  const sr = st.sampleRate;
  const start = (st.startMs - st.refMs) / 1000;
  const y = filteredData({ data: st.z, sampleRate: sr }, { lo: 1, hi: Math.min(20, 0.45 * sr) });
  const i = (t) => Math.max(0, Math.min(y.length, Math.round((t - start) * sr)));
  const s = sSec ?? pSec + (st.distKm / 3.45 - st.distKm / 6.1);
  const spec = amplitudeSpectrum(y.subarray(i(pSec - 0.5), i(s + 15)), sr);
  return {
    hf: bandMean(spec, 8, 20) / bandMean(spec, 1, 5),
    ps: peakAbs(y, i(pSec), i(pSec + 2)) / peakAbs(y, i(s), i(s + 4)),
  };
}

export function createB(ctx) {
  const tv = new TraceView($('b-trace'), { interactive: true });
  const sv = new SpectrogramView($('b-spec'), {
    onBand(lo, hi, { final }) {
      band = { lo, hi };
      if (final || !isDistant()) redraw(true);
    },
  });
  followTraceView(sv, tv);
  const audio = new QuakeAudio();
  let st = null;            // the loaded station (see load())
  let band = { ...Q.frequencies.filter };
  let stations = [];
  let loadedFor = null;
  let checked = null;       // results of the check

  const isDistant = () => ctx.kind === 'distant';

  const steps = renderSteps($('b-steps'), {
    inv: 'B',
    question: 'What notes is the ground playing?',
    predict: {
      prompt: 'Which station hears more <b>high notes</b> (above 10 Hz) from this quake?',
      options: [
        { value: 'near', label: 'The nearest station' },
        { value: 'far', label: 'The farthest station' },
        { value: 'same', label: 'Both the same: it is the same quake' },
      ],
    },
    explore: `<p><b>Drag on the spectrogram</b> (the colored picture) to choose a band of notes:
      the record above keeps only those notes. Drag the band's top or bottom edge to change it;
      double-click to keep all notes.</p>
      <p>A <b>spectrogram</b> shows time across, frequency (pitch) up, and color = how strong.</p>
      <p>Find the band where the quake stands out most. Then press <b>▶ Listen</b> and try
      <b>Nearest</b> and <b>Farthest</b>.</p>`,
    why: `<p>Every wiggle is a mix of notes (frequencies). Each time the rock squeezes back and
      forth, a little of the wave's energy turns into heat. A 10 Hz wave goes through ten
      times as many back-and-forths as a 1 Hz wave on the same trip, so it loses much more:
      the high notes fade first. That is why a far quake sounds like a low rumble.</p>
      <p>Speeding up a record by 100 makes every note 100 times higher, so a 1 Hz ground
      wave becomes a 100 Hz hum you can hear.</p>
      <p><a href="../../theory/frequencies/" target="_blank" rel="noopener">Frequencies, fading and sound ↗</a> ·
      <a href="../../theory/seismograms/" target="_blank" rel="noopener">Reading a seismogram ↗</a></p>`,
    checkLabel: 'Compare the nearest and farthest stations',
    onCheck: check,
  });

  $('b-station').addEventListener('change', () => select($('b-station').value));
  $('b-near').addEventListener('click', () => select(stations[0]?.key));
  $('b-far').addEventListener('click', () => select(stations[stations.length - 1]?.key));
  $('b-play').addEventListener('click', play);

  function fillSpeeds() {
    const sr = st?.rawRate ?? 100;
    const { min, max } = allowedSpeedUps(sr);
    const choices = (isDistant() ? [100, 200, 400] : Q.frequencies.speedUps).filter((s) => s >= min && s <= max);
    const def = isDistant() ? 200 : Q.frequencies.defaultSpeedUp;
    $('b-speed').innerHTML = choices.map((s) => `<option value="${s}"${s === def ? ' selected' : ''}>${s}×</option>`).join('');
  }

  /** Load one station's record (vertical) and its spectrogram. */
  async function load(key) {
    const item = stations.find((x) => x.key === key);
    if (!item) return null;
    const pre = isDistant() ? 60 : 10;
    const post = isDistant() ? 1800 : Math.min(150, item.distKm / 3.0 + 40);
    let data = await loadStation(ctx.source, ctx.event, item.station, { preSec: pre, postSec: post });
    if (!data) return null;
    data = trimToData(data);
    const arr = await ctx.arrivalsAt(key);
    if (isDistant() && !arr.P) {
      // No analyst picks at our stations for a quake far away: use the Earth-model time.
      const t = await ctx.modelTimes(item.station);
      if (t) arr.P = { tSec: t.P, who: 'Earth model (iasp91)' };
    }
    const out = { ...data, refMs: ctx.event.timeMs, rawZ: data.z, rawRate: data.sampleRate, distKm: item.distKm, arr };
    if (isDistant()) {
      // 20 samples per second is plenty for waves slower than 2 Hz, and 5× less to draw.
      const d = decimate(data.z, data.sampleRate, Math.max(1, Math.round(data.sampleRate / 20)));
      out.z = d.data;
      out.sampleRate = d.sampleRate;
    }
    return out;
  }

  async function select(key) {
    if (!key) return;
    audio.stop();
    $('b-station').value = key;
    ctx.selectStation(key);
    $('b-note').textContent = 'Loading the record…';
    st = await load(key);
    if (!st) { $('b-note').textContent = 'No usable data from this station: try another.'; return; }
    fillSpeeds();
    const start = (st.startMs - st.refMs) / 1000;
    const dur = st.z.length / st.sampleRate;
    const opt = suggestStft(st.sampleRate, dur);
    const spec = stft(st.z, st.sampleRate, opt);
    if (isDistant() && band.hi > 2) band = { lo: 0.02, hi: 1 };
    sv.setLogFreq(isDistant());
    sv.setData(spec, { startMs: st.startMs, refMs: st.refMs, fromSec: start, toSec: start + dur });
    sv.setBand(band.lo, band.hi);
    redraw(false);
    const school = ctx.isSchool(key.split('.')[1]) ? ' A school stand-in.' : '';
    $('b-note').textContent = `${Math.round(st.distKm).toLocaleString('en-US')} km from the quake.${school}` +
      (!st.arr.P ? '' : st.arr.P.who.startsWith('Earth')
        ? ` P expected about ${Math.round(st.arr.P.tSec)} s after the quake (Earth model iasp91).`
        : ` P picked at ${st.arr.P.tSec.toFixed(1)} s (${st.arr.P.who}).`);
  }

  /** The record filtered to the chosen band, and the readouts. */
  function redraw(keepView) {
    if (!st) return;
    const start = (st.startMs - st.refMs) / 1000;
    const dur = st.z.length / st.sampleRate;
    const y = filteredData({ data: st.z, sampleRate: st.sampleRate }, band);
    tv.setData([{ label: `${ctx.label(st.label)} · up (Z) · ${bandText(band)}`, data: y,
      startMs: st.startMs, sampleRate: st.sampleRate }], st.refMs, start, start + dur, keepView);
    const p = st.arr.P?.tSec ?? (isDistant() ? null : st.distKm / 6.1);
    let stands = null;
    if (p != null) {
      const sig = isDistant() ? [p - start, Math.min(dur, p - start + 600)] : [p - start, p - start + 10];
      // The filter fades the first 5% of the record in (a taper), so the noise is measured after that.
      const noise = [Math.max(0.06 * dur, p - start - (isDistant() ? 55 : 9)), p - start - 0.5];
      if (noise[1] - noise[0] >= 1.5) stands = snr(y, st.sampleRate, sig, noise);
    }
    const speed = Number($('b-speed').value) || Q.frequencies.defaultSpeedUp;
    const ar = audibleRange(st.rawRate, speed);
    steps.readout.innerHTML = `
      <div><span>Band</span><b>${bandText(band)}</b></div>
      <div><span>Quake ÷ noise in this band</span><b>${stands ? `×${stands >= 10 ? Math.round(stands) : stands.toFixed(1)}` : '–'}</b></div>
      <div><span>At ${speed}×, 1 Hz sounds like</span><b>${ar.oneHzHeardAs} Hz</b></div>
      <div><span>The sensor's top note (${ar.nyquistHz} Hz) becomes</span><b>${Math.round(ar.nyquistHeardHz).toLocaleString('en-US')} Hz</b></div>`;
    lastStands = stands;
  }
  let lastStands = null;

  function play() {
    if (audio.isPlaying) { audio.stop(); return; }
    if (!st) return;
    const speed = Number($('b-speed').value);
    // Play the original record (all its notes) through the chosen band.
    const y = filteredData({ data: st.rawZ, sampleRate: st.rawRate }, band);
    try {
      audio.play(y, st.rawRate, speed, {
        dataStartSec: (st.startMs - st.refMs) / 1000, fromSec: tv.view.from, toSec: tv.view.to,
        onTime: (sec) => sv.setCursor(sec),
        onEnd: () => { sv.setCursor(null); $('b-play').textContent = '▶ Listen'; },
      });
      $('b-play').textContent = '■ Stop';
    } catch (err) {
      $('b-note').textContent = err.message;
    }
  }

  async function check() {
    if (!stations.length) return;
    const near = stations[0];
    const far = stations[stations.length - 1];
    steps.result.innerHTML = '<p class="hint">Measuring…</p>';
    const rows = [];
    for (const item of [near, far]) {
      const s = await load(item.key);
      if (!s) continue;
      const p = s.arr.P?.tSec ?? item.distKm / 6.1;
      if (isDistant()) {
        const spec = amplitudeSpectrum(s.z, s.sampleRate);
        let best = 1;
        spec.amp.forEach((a, i) => { if (spec.freqs[i] > 0.01 && a > spec.amp[best]) best = i; });
        rows.push({ item, peakHz: spec.freqs[best] });
      } else {
        rows.push({ item, ...notesAt(s, p, s.arr.S?.tSec) });
      }
    }
    checked = rows;
    const pred = steps.prediction();
    if (isDistant()) {
      const r = rows[0];
      steps.result.innerHTML = `<div class="qe-result">
        <p>The strongest notes from this quake at ${esc(ctx.label(r.item.station.sta))} are near
          <span class="big">${r.peakHz.toPrecision(2)} Hz</span>: one wave every ${Math.round(1 / r.peakHz)} s.
          A nearby quake's strongest notes are 1–20 Hz.</p>
        <p>After ${Math.round(r.item.distKm).toLocaleString('en-US')} km, almost all the high notes are gone.
          ${pred === 'near' ? 'You predicted that the nearer station keeps more high notes: right for a local quake.' : ''}</p>
      </div>`;
    } else if (rows.length === 2) {
      const [a, b] = rows;
      steps.result.innerHTML = `<div class="qe-result">
        <p>High notes ÷ low notes (8–20 Hz ÷ 1–5 Hz):</p>
        <div class="qe-readout">
          <div><span>${esc(ctx.label(a.item.station.sta))}, ${Math.round(a.item.distKm)} km</span><b>${a.hf.toFixed(2)}</b></div>
          <div><span>${esc(ctx.label(b.item.station.sta))}, ${Math.round(b.item.distKm)} km</span><b>${b.hf.toFixed(2)}</b></div>
        </div>
        <p>${a.hf > b.hf ? 'The nearer station kept more high notes.' : 'Here the farther station kept as many high notes: the ground under each station matters too (try other pairs).'}
          You predicted: <i>${esc(steps.predictionLabel())}</i>.</p>
      </div>`;
    }
    await comparePair();
  }

  /** For the Leamington pair: the same measurements for the quake and the blast at one station. */
  async function comparePair() {
    const pairId = ctx.preset?.pair;
    if (!pairId || !st) { steps.extra.innerHTML = ''; return; }
    const pairPreset = EXPLORER_PRESETS.find((p) => p.id === pairId);
    const staCode = st.label;
    try {
      const other = await ctx.source.getEvent(pairId);
      const cands = await ctx.source.getStations({ lat: other.lat, lon: other.lon, maxKm: 200, atMs: other.timeMs });
      const s2 = cands.find((s) => s.sta === staCode);
      if (!s2 || !chooseChannels(s2)) throw new Error(`${staCode} did not record the other event`);
      const d2 = distanceKm(other.lat, other.lon, s2.lat, s2.lon);
      const raw = trimToData(await loadStation(ctx.source, other, s2, { preSec: 10, postSec: Math.min(150, d2 / 3 + 40) }));
      const picks2 = picksByStation(await ctx.source.getAnalystPicks(pairId));
      const p2 = picks2[`${s2.net}.${s2.sta}`];
      const m2 = notesAt({ ...raw, refMs: other.timeMs, distKm: d2 }, p2?.P ? (p2.P - other.timeMs) / 1000 : d2 / 6.1,
        p2?.S ? (p2.S - other.timeMs) / 1000 : undefined);
      const m1 = notesAt(st, st.arr.P?.tSec ?? st.distKm / 6.1, st.arr.S?.tSec);
      const me = ctx.event.eventType || 'earthquake';
      const them = other.eventType || 'earthquake';
      steps.extra.innerHTML = `<div class="qe-result">
        <p><b>Quake or blast?</b> At ${esc(ctx.label(staCode))}, the same station for both:</p>
        <div class="qe-readout">
          <div><span></span><b>high ÷ low notes · P ÷ S</b></div>
          <div><span>This ${esc(me)}</span><b>${m1.hf.toFixed(2)} · ${m1.ps.toFixed(2)}</b></div>
          <div><span>The ${esc(them)} (${esc(pairPreset?.label ?? pairId)})</span><b>${m2.hf.toFixed(2)} · ${m2.ps.toFixed(2)}</b></div>
        </div>
        <p>A quarry blast is set off in rows of holes near the surface: it often has fewer high
          notes and a stronger P compared with its S. That is evidence, not proof: check the
          time of day too.</p>
        <div class="actions"><button type="button" data-open-pair>Open the ${esc(them)} in B</button></div>
      </div>`;
      steps.extra.querySelector('[data-open-pair]').addEventListener('click', () => ctx.openEvent(pairId, 'B'));
    } catch (err) {
      steps.extra.innerHTML = `<p class="hint">${esc(err.message)}.</p>`;
    }
  }

  return {
    available() { return true; },
    reset() {
      audio.stop();
      st = null; loadedFor = null; checked = null; lastStands = null;
      band = { ...Q.frequencies.filter };
      steps.setEvent(ctx.event.id);
    },
    async show() {
      tv.resize(); sv.resize();
      if (loadedFor === ctx.event.id) return;
      loadedFor = ctx.event.id;
      if (isDistant()) band = { lo: 0.02, hi: 1 };
      stations = await fillStationSelect($('b-station'), ctx, { maxKm: isDistant() ? undefined : ctx.sectionKm(), limit: 40 });
      $('b-near').hidden = isDistant();
      $('b-far').hidden = isDistant();
      if (!stations.length) { $('b-note').textContent = 'No stations with data for this quake.'; return; }
      await select($('b-station').value);
    },
    error(err) { $('b-note').textContent = `${err.message}.`; },
    csvRows() {
      const rows = [];
      if (steps.prediction()) rows.push(['prediction', steps.predictionLabel(), '', '']);
      if (st) {
        rows.push(['station', st.label, '', `${Math.round(st.distKm)} km`]);
        rows.push(['band', band.lo && band.hi ? `${fHz(band.lo)}-${fHz(band.hi)}` : 'all notes', band.lo && band.hi ? 'Hz' : '', '']);
        if (lastStands) rows.push(['quake ÷ noise in the band', lastStands.toFixed(1), '', '']);
      }
      for (const r of checked || []) {
        if (r.hf != null) rows.push([`high ÷ low notes at ${r.item.station.sta}`, r.hf.toFixed(3), '', `${Math.round(r.item.distKm)} km`]);
        if (r.peakHz != null) rows.push([`strongest note at ${r.item.station.sta}`, r.peakHz.toPrecision(2), 'Hz', '']);
      }
      return rows;
    },
  };
}
