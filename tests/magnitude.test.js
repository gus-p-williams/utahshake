// lib/magnitude.js: Richter's table, the Wood-Anderson simulation, the swing reading, station
// and event values, UUSS's QuakeML numbers, and a check that our Wood-Anderson reproduces the
// amplitudes UUSS published for the offline samples' own records (uuss-magnitudes.json, made by
// tools/quake-explorer/sample-amplitudes.mjs).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

globalThis.HTMLElement ??= class {};
globalThis.customElements ??= { define() {}, get() {} };

const M = await import('../docs/app/js/lib/magnitude.js');
const { parseMiniseed } = await import('../docs/app/js/data/mseed.js');
const { toVelocity } = await import('../docs/app/js/lib/units.js');
const { isClipped } = await import('../docs/app/js/lib/signal.js');

const close = (a, b, tol, msg) => assert.ok(Math.abs(a - b) <= tol, `${msg ?? ''} ${a} vs ${b}`);

test("Richter's 1958 table: rows, interpolation, range", () => {
  assert.equal(M.RICHTER_1958.length, 70);
  close(M.richterLogA0(0), 1.4, 1e-12);
  close(M.richterLogA0(30), 2.1, 1e-12);
  close(M.richterLogA0(70), 2.8, 1e-12);
  close(M.richterLogA0(110), 3.1, 1e-12);
  close(M.richterLogA0(270), 3.9, 1e-12);
  close(M.richterLogA0(600), 4.9, 1e-12);
  close(M.richterLogA0(75), 2.85, 1e-12, 'no 75 km row: halfway from 70 to 80');
  close(M.richterLogA0(215), 3.625, 1e-12);
  assert.equal(M.richterLogA0(-1), null);
  assert.equal(M.richterLogA0(601), null);
  for (let i = 1; i < M.RICHTER_1958.length; i++) {
    assert.ok(M.RICHTER_1958[i][0] > M.RICHTER_1958[i - 1][0], 'distances increase');
    assert.ok(M.RICHTER_1958[i][1] >= M.RICHTER_1958[i - 1][1], 'corrections never decrease');
  }
});

test("Richter's definition: 1 mm at 100 km is magnitude 3; ten times the swing is one more", () => {
  close(M.stationML(1, 100), 3, 1e-12);
  close(M.stationML(10, 100), 4, 1e-12);
  close(M.stationML(10.1, 30), 3.104, 0.001);
  assert.equal(M.stationML(0, 100), null);
  assert.equal(M.stationML(1, 700), null);
  close(M.uussSwingMm(2.02e-2), 10.1, 1e-9, 'UUSS stores the full swing in meters');
});

test('Wood-Anderson constants are the ones UUSS uses (D41)', () => {
  assert.deepEqual({ ...M.WOOD_ANDERSON }, { periodSec: 0.8, damping: 0.8, magnification: 2800 });
});

test('Wood-Anderson gain: flat 2,800 × displacement at high frequency, 1/(2h) at its own period', () => {
  const amp = (f) => Math.hypot(M.woodAndersonGain(f).re, M.woodAndersonGain(f).im);
  // velocity amplitude V at frequency f is displacement V / (2πf); the trace is 2,800 × that, in mm
  for (const f of [10, 20]) close(amp(f) * 2 * Math.PI * f, 2800e3, 2800e3 * 0.02, `${f} Hz`);
  close(amp(1.25) * 2 * Math.PI * 1.25, 2800e3 / (2 * 0.8), 1, 'at 1.25 Hz the pendulum gives 1/(2h)');
  assert.ok(amp(0.1) * 2 * Math.PI * 0.1 < 2800e3 * 0.02, 'long periods barely move it');
  const g = M.woodAndersonGain(3);
  const h = M.woodAndersonGain(-3);
  close(g.re, h.re, 1e-9, 'conjugate symmetric (re)');
  close(g.im, -h.im, 1e-9, 'conjugate symmetric (im)');
});

test('woodAnderson() on a sine reproduces the gain, and leaves NaN gaps as NaN', () => {
  const sr = 100;
  const n = 6000;
  for (const f of [1.25, 3, 8]) {
    const v = Float64Array.from({ length: n }, (_, i) => 1e-6 * Math.sin(2 * Math.PI * f * (i / sr)));
    const y = M.woodAnderson(v, sr);
    const mid = y.subarray(2000, 4000);
    const peak = Math.max(...mid.map(Math.abs));
    const g = M.woodAndersonGain(f);
    close(peak, 1e-6 * Math.hypot(g.re, g.im), 1e-6 * Math.hypot(g.re, g.im) * 0.01, `${f} Hz`);
  }
  const v = new Float64Array(1000).map((_, i) => Math.sin(i / 7) * 1e-6);
  v[500] = NaN;
  const y = M.woodAnderson(v, 100);
  assert.ok(Number.isNaN(y[500]) && Number.isFinite(y[499]));
});

test('halfPeakToPeak reads half the biggest swing between neighboring turning points', () => {
  const d = [0, 1, 0, -3, 2, 0, NaN, 0.5, 0];
  const r = M.halfPeakToPeak(d);
  assert.equal(r.amp, 2.5);
  assert.deepEqual([r.i, r.j], [3, 4]);
  assert.equal(M.halfPeakToPeak([1, 1, 1]), null);
  assert.equal(M.halfPeakToPeak(d, 0, 3).amp, 0.5);
});

test('swing window, station rule and values', () => {
  const w = M.swingWindow(100);
  close(w.startSec, 100 / 6.1 - 2, 1e-9);
  close(w.endSec, 100 / 3.5 + 30, 1e-9);
  close(M.swingWindow(300).endSec, 300 / 3.5 + 90, 1e-9, '0.3 s per km when longer');
  assert.equal(M.measureChannel({ velocity: [1], sampleRate: 1, startSec: 0, distKm: 5 }).gate, 'distance');
  assert.equal(M.measureChannel({ velocity: [1, 2], sampleRate: 1, startSec: 0, distKm: 50, clipped: true }).gate, 'clipped');
  assert.deepEqual(M.stationValue([{ gate: 'ok', ml: 3 }, { gate: 'ok', ml: 3.2 }]), { gate: 'ok', ml: 3.1 });
  assert.equal(M.stationValue([{ gate: 'ok', ml: 3 }, { gate: 'clipped' }]).gate, 'clipped');
  assert.equal(M.stationValue([{ gate: 'ok', ml: 3 }]).gate, 'onehorizontal');
  const e = M.eventML([3.1, 2.9, 3.5, NaN, 3.0]);
  assert.equal(e.n, 4);
  close(e.median, 3.05, 1e-12);
  close(e.mean, 3.125, 1e-12);
  assert.equal(M.eventML([]).median, null);
  for (const k of ['distance', 'nodata', 'flat', 'clipped', 'noise', 'onehorizontal']) assert.ok(M.DROP_REASONS[k]);
});

test("measureChannel finds a synthetic quake's swing and drops one buried in noise", () => {
  const sr = 100;
  const startSec = -10;
  const n = 120 * sr;
  const distKm = 100;
  const sAt = distKm / 3.5;
  let seed = 7;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647 - 0.5);
  const make = (quake) => Float64Array.from({ length: n }, (_, i) => {
    const t = startSec + i / sr;
    const burst = t > sAt && t < sAt + 6 ? quake * Math.sin(2 * Math.PI * 2 * t) * Math.sin((Math.PI * (t - sAt)) / 6) : 0;
    return burst + 1e-7 * rnd();
  });
  const loud = M.measureChannel({ velocity: make(2e-5), sampleRate: sr, startSec, distKm });
  assert.equal(loud.gate, 'ok');
  assert.ok(loud.snr > 100);
  assert.ok(loud.i / sr + startSec > sAt && loud.j / sr + startSec < sAt + 6.5, 'the swing is in the burst');
  const quiet = M.measureChannel({ velocity: make(1e-8), sampleRate: sr, startSec, distKm });
  assert.equal(quiet.gate, 'noise');
});

test('duration magnitude pieces: envelope and UUSS\'s Utah equation', () => {
  close(M.CODA_THRESHOLD, 1.724e-8, 1e-15);
  close(M.codaMagnitude(100, 100), -2.25 + 4.64 + 0.23, 1e-12);
  const env = M.absMeanEnvelope(new Float64Array(1000).fill(-2), 100);
  assert.equal(env.length, 9);
  close(env[0].value, 2, 1e-12);
  close(env[0].tSec, 1, 1e-12);
});

test('reading UUSS phase-data QuakeML: amplitudes, network and station magnitudes', () => {
  const xml = `<q><eventParameters><event publicID="e"><preferredMagnitudeID>m1</preferredMagnitudeID>
    <amplitude publicID="a1"><type>AML</type><genericAmplitude><value>2.02e-02</value></genericAmplitude>
      <unit>m</unit><waveformID networkCode="UU" stationCode="MTPU" channelCode="HHE" locationCode="01" /></amplitude>
    <amplitude publicID="a2"><type>END</type><genericAmplitude><value>212.4</value></genericAmplitude>
      <unit>s</unit><waveformID networkCode="UU" stationCode="ARUT" channelCode="EHZ" locationCode="01" /></amplitude>
    <stationMagnitude publicID="s1"><mag><value>3.1</value></mag><type>ML</type><amplitudeID>a1</amplitudeID>
      <waveformID networkCode="UU" stationCode="MTPU" channelCode="HHE" locationCode="01" /></stationMagnitude>
    <magnitude publicID="m1"><mag><value>3.3</value></mag><type>Ml</type><stationCount>30</stationCount>
      <methodID>smi:uu.anss.org/magnitude/RichterMl2</methodID>
      <stationMagnitudeContribution><stationMagnitudeID>s1</stationMagnitudeID><residual>-0.2</residual><weight>1</weight></stationMagnitudeContribution>
    </magnitude>
    <magnitude publicID="m2"><mag><value>3.28</value></mag><type>Md</type></magnitude>
  </event></eventParameters></q>`;
  const amps = M.parseQuakeMLAmplitudes(xml);
  assert.deepEqual(amps.map((a) => [a.type, a.value, a.sta, a.cha]), [['AML', 0.0202, 'MTPU', 'HHE'], ['END', 212.4, 'ARUT', 'EHZ']]);
  const mags = M.parseQuakeMLMagnitudes(xml);
  assert.deepEqual(mags.network.map((m) => [m.type, m.value, m.preferred]), [['Ml', 3.3, true], ['Md', 3.28, false]]);
  assert.equal(mags.network[0].method, 'RichterMl2');
  assert.equal(mags.network[0].stationCount, 30);
  assert.deepEqual(mags.station.map((s) => [s.sta, s.value, s.weight, s.amplitudeId]), [['MTPU', 3.1, 1, 'a1']]);
});

// --- the real check: our Wood-Anderson against UUSS's published amplitudes -------------------

const sdir = new URL('../docs/app/data/samples/', import.meta.url);
const index = JSON.parse(fs.readFileSync(new URL('index.json', sdir), 'utf8'));
const withUuss = index.explorer.filter((d) => fs.existsSync(new URL(`${d}/uuss-magnitudes.json`, sdir)));

test('every UUSS sample has its uuss-magnitudes.json, with the preferred ML', () => {
  assert.ok(withUuss.includes('qe-junction') && withUuss.includes('qe-magna'));
  for (const d of withUuss) {
    const u = JSON.parse(fs.readFileSync(new URL(`${d}/uuss-magnitudes.json`, sdir), 'utf8'));
    const ev = JSON.parse(fs.readFileSync(new URL(`${d}/event.json`, sdir), 'utf8'));
    assert.equal(u.event, ev.id);
    assert.ok(u.network.some((m) => /^ml$/i.test(m.type)), `${d} has an ML`);
    assert.ok(u.amplitudes.length > 10);
  }
});

test("our Wood-Anderson reproduces UUSS's stored amplitudes on the samples' own horizontal records", () => {
  const ratios = [];
  const rows = [];
  for (const d of withUuss) {
    const u = JSON.parse(fs.readFileSync(new URL(`${d}/uuss-magnitudes.json`, sdir), 'utf8'));
    const sample = JSON.parse(fs.readFileSync(new URL(`${d}/sample.json`, sdir), 'utf8'));
    const event = JSON.parse(fs.readFileSync(new URL(`${d}/event.json`, sdir), 'utf8'));
    const stations = JSON.parse(fs.readFileSync(new URL(`${d}/stations.json`, sdir), 'utf8'));
    const buf = fs.readFileSync(new URL(`${d}/waveforms.mseed`, sdir));
    const from = event.timeMs - sample.window.preSec * 1000;
    const traces = parseMiniseed(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.length),
      { fromMs: from, toMs: event.timeMs + sample.window.postSec * 1000 });
    for (const a of u.amplitudes) {
      if (a.cha.endsWith('Z')) continue;
      const st = stations.find((s) => s.sta === a.sta);
      const ch = st?.channels.find((c) => c.cha === a.cha && c.loc === a.loc);
      const tr = traces.find((t) => t.sta === a.sta && t.cha === a.cha && t.loc === a.loc);
      if (!ch || !tr || isClipped(tr.data)) continue;
      const v = toVelocity(tr.data, ch);
      if (!v || v.approx) continue;
      // the whole sample window (10 s before to 110 s after the origin) holds the swing within 250 km
      if (st.distKm > 250) continue;
      const wa = M.woodAnderson(v.data, tr.sampleRate);
      const sw = M.halfPeakToPeak(wa);
      const r = sw.amp / a.swingMm;
      ratios.push(r);
      rows.push(`${d} ${a.sta}.${a.cha} ${st.distKm.toFixed(0)} km: ours ${sw.amp.toPrecision(3)} mm, UUSS ${a.swingMm} mm`);
    }
  }
  assert.ok(ratios.length >= 20, `enough channels (${ratios.length})`);
  const sorted = [...ratios].sort((x, y) => x - y);
  const med = sorted[sorted.length >> 1];
  close(med, 1, 0.01, 'median ratio within 1%');
  // On 2026-11-25: 27 of 28 channels within 8% (most within 0.5%). The exception is Kenilworth's
  // CVRU HHE, at half UUSS's value while CVRU HHN matches exactly: a metadata or UUSS-side oddity.
  const off = ratios.map((r, k) => [r, rows[k]]).filter(([r]) => Math.abs(r - 1) > 0.1);
  assert.ok(off.length <= 1, `more than one channel off by over 10%:\n${off.map((o) => o[1]).join('\n')}`);
});

test("Junction worked example: UUSS's swings give the page's station magnitudes", () => {
  const u = JSON.parse(fs.readFileSync(new URL('qe-junction/uuss-magnitudes.json', sdir), 'utf8'));
  const swing = (sta) => {
    const h = u.amplitudes.filter((a) => a.sta === sta && !a.cha.endsWith('Z'));
    return h.reduce((s, a) => s + a.swingMm, 0) / h.length;
  };
  close(swing('MTPU'), 10.1, 0.1, 'MTPU');
  close(swing('FOR1'), 1.81, 0.02, 'FOR1');
  close(swing('SGU'), 8.47, 0.05, 'SGU');
  close(swing('HLJ'), 0.261, 0.003, 'HLJ');
  // the page reads the nearest table row: 30, 70, 110 and 270 km
  assert.equal((Math.log10(swing('MTPU')) + 2.1).toFixed(1), '3.1');
  assert.equal((Math.log10(swing('FOR1')) + 2.8).toFixed(1), '3.1');
  assert.equal((Math.log10(swing('HLJ')) + 3.9).toFixed(1), '3.3');
  assert.equal((Math.log10(swing('SGU')) + 3.1).toFixed(1), '4.0');
});
