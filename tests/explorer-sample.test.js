// Checks on Quake Explorer's offline samples (index.json "explorer" list), and
// the Phase 0 answer-key numbers, recomputed from the bundled real data.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

// The seisplotjs bundle registers a web component when loaded; stub it for node.
globalThis.HTMLElement ??= class {};
globalThis.customElements ??= { define() {}, get() {} };

const { parseMiniseed } = await import('../docs/app/js/data/mseed.js');
const { filteredData } = await import('../docs/app/js/data/filters.js');
const { picksByStation, chooseChannels, channelInfo } = await import('../docs/app/js/lib/fdsn.js');
const { speedFromArrivals, twoLineFit, BEND_F_RATIO } = await import('../docs/app/js/lib/linefit.js');
const { crustFromIntercept } = await import('../docs/app/js/lib/traveltime.js');
const { rotateHorizontals, verticalUp, pWaveBackAzimuth, angleDiff } = await import('../docs/app/js/lib/motion.js');
const { amplitudeSpectrum } = await import('../docs/app/js/lib/spectral.js');
const { velocitySensitivity } = await import('../docs/app/js/lib/units.js');

const dir = new URL('../docs/app/data/samples/', import.meta.url);
const index = JSON.parse(fs.readFileSync(new URL('index.json', dir), 'utf8'));
const read = (d, f) => fs.readFileSync(new URL(`${d}/${f}`, dir));
const json = (d, f) => JSON.parse(read(d, f));

function load(d) {
  const sample = json(d, 'sample.json');
  const event = json(d, 'event.json');
  const stations = json(d, 'stations.json');
  const buf = read(d, 'waveforms.mseed');
  const from = event.timeMs - sample.window.preSec * 1000;
  const to = event.timeMs + sample.window.postSec * 1000;
  const traces = parseMiniseed(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.length), { fromMs: from, toMs: to });
  return { sample, event, stations, traces, from, to,
    picks: json(d, 'picks.json'), computer: json(d, 'computer-picks.json') };
}

test('Wave Race and Quake Explorer samples are listed separately', () => {
  assert.ok(index.samples.includes('uu80162166'));
  assert.ok(Array.isArray(index.explorer) && index.explorer.length >= 1);
  for (const d of index.explorer) assert.ok(!index.samples.includes(d));
});

for (const d of index.explorer) {
  test(`${d}: explorer sample is complete and every channel has data and metadata`, () => {
    const s = load(d);
    assert.equal(s.sample.kind, 'explorer');
    assert.equal(s.event.id, s.sample.event);
    const expected = s.stations.reduce((n, st) => n + st.channels.length, 0);
    assert.equal(s.traces.length, expected);
    for (const t of s.traces) {
      assert.equal(t.startMs, s.from);
      const good = t.data.filter((v) => !Number.isNaN(v)).length;
      assert.ok(good > 0.9 * t.data.length, `${t.sta}.${t.cha} mostly present`);
    }
    for (const st of s.stations) {
      for (const c of st.channels) {
        assert.ok(Number.isFinite(c.azimuth) && Number.isFinite(c.dip), `${st.sta}.${c.cha} direction`);
        assert.ok(c.units, `${st.sta}.${c.cha} units`);
      }
      assert.ok(velocitySensitivity(st.channels[0]), `${st.sta} converts to m/s`);
    }
    for (const p of s.computer) assert.ok(['P', 'S'].includes(p.phase) && p.snr > 0);
  });
}

/** Arrival times (s after origin) against distance: analyst first, then computer picks. */
function arrivals(s, phase, { computer = true, minSnr = 0 } = {}) {
  const by = picksByStation(s.picks);
  const out = [];
  for (const st of s.stations) {
    const a = by[`${st.net}.${st.sta}`]?.[phase];
    const c = s.computer.find((p) => p.sta === st.sta && p.phase === phase && p.snr >= minSnr);
    const t = a ?? (computer ? c?.timeMs : undefined);
    if (t !== undefined) out.push({ distKm: st.distKm, tSec: (t - s.event.timeMs) / 1000, sta: st.sta });
  }
  return out;
}

test('qe-junction: P speed near the quake is about 6.1 km/s (answer key A)', () => {
  const s = load('qe-junction');
  const pg = speedFromArrivals(arrivals(s, 'P', { computer: false }).filter((p) => p.distKm <= 100));
  assert.ok(pg.speedKms > 5.9 && pg.speedKms < 6.4, `Pg ${pg.speedKms}`);
  const sg = speedFromArrivals(arrivals(s, 'S').filter((p) => p.distKm <= 240));
  assert.ok(sg.speedKms > 3.2 && sg.speedKms < 3.9, `Sg ${sg.speedKms}`);
});

test('qe-magna: first arrivals bend from Pg to Pn; crust about 30–42 km (answer key A, Moho)', () => {
  const s = load('qe-magna');
  const f = twoLineFit(arrivals(s, 'P', { minSnr: 3 }), { minPerLine: 4 });
  assert.ok(f.fRatio > BEND_F_RATIO, `F ${f.fRatio}`);
  assert.ok(f.near.speedKms > 5.8 && f.near.speedKms < 6.4, `Pg ${f.near.speedKms}`);
  assert.ok(f.far.speedKms > 7.3 && f.far.speedKms < 8.3, `Pn ${f.far.speedKms}`);
  const crust = crustFromIntercept(f.far.interceptSec, f.near.speedKms, f.far.speedKms, s.event.depthKm);
  assert.ok(crust > 30 && crust < 42, `crust ${crust}`);
});

/** Back-azimuth from the first `win` s of P at one station (1–5 Hz, as the app will). */
function pDirection(s, sta, win = 0.5) {
  const st = s.stations.find((x) => x.sta === sta);
  const ch = chooseChannels(st);
  const info = channelInfo(st, ch);
  const tr = ch.channels.map((cha) => s.traces.find((t) => t.sta === sta && t.cha === cha));
  const [z, h1, h2] = tr.map((t) => filteredData(t, { lo: 1, hi: 5 }));
  const { n, e } = rotateHorizontals(h1, h2, info[1].azimuth, info[2].azimuth);
  const pMs = picksByStation(s.picks)[`${st.net}.${sta}`].P;
  const sr = tr[0].sampleRate;
  const i = Math.round(((pMs - tr[0].startMs) / 1000) * sr);
  const r = pWaveBackAzimuth(verticalUp(z, info[0].dip), n, e, i - Math.round(0.05 * sr), i + Math.round(win * sr));
  return { ...r, err: angleDiff(r.bazDeg, st.bazDeg) };
}

test('qe-kenilworth: P motion at TMU (Wasatch Academy stand-in) points to the quake (answer key C)', () => {
  const r = pDirection(load('qe-kenilworth'), 'TMU');
  assert.ok(Math.abs(r.err) < 15, `error ${r.err}°`);
  assert.ok(r.linearity > 0.8);
});

test('qe-junction: P motion at nearby broadband stations points to the quake', () => {
  const s = load('qe-junction');
  for (const sta of ['MTPU', 'TCRU', 'FOR1']) {
    const r = pDirection(s, sta);
    assert.ok(Math.abs(r.err) < 30, `${sta} error ${r.err}°`);
  }
});

test('Leamington blast vs quake of the same size at SUU: the blast has fewer high notes (answer key B)', () => {
  const hf = (d) => {
    const s = load(d);
    const st = s.stations.find((x) => x.sta === 'SUU');
    const tr = s.traces.find((t) => t.sta === 'SUU' && t.cha === st.channels[0].cha);
    const y = filteredData(tr, { lo: 1, hi: 20 });
    const pMs = picksByStation(s.picks)['UU.SUU'].P;
    const i0 = Math.round(((pMs - tr.startMs) / 1000 - 0.5) * tr.sampleRate);
    const sp = amplitudeSpectrum(y.subarray(i0, i0 + 25 * tr.sampleRate), tr.sampleRate);
    const band = (a, b) => {
      let sum = 0; let n = 0;
      sp.freqs.forEach((f, k) => { if (f >= a && f <= b) { sum += sp.amp[k]; n++; } });
      return sum / n;
    };
    return band(8, 20) / band(1, 5);
  };
  const blast = hf('qe-leamington-blast');
  const quake = hf('qe-leamington-quake');
  assert.ok(blast < quake, `blast ${blast.toFixed(3)} vs quake ${quake.toFixed(3)}`);
});
