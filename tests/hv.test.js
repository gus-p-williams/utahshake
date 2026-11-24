// H/V ratio: Konno–Ohmachi smoothing, windows, combining, peaks and f0 = Vs/(4H), on
// synthetic records with known answers.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  logFreqs, tukeyWindow, konnoOhmachiWeights, applyWeights, konnoOhmachi, horizontal, hvWindows,
  rejectWindows, combineCurves, findPeak, peakSpread, f0FromThickness, thicknessFromF0, averageVs,
} from '../docs/app/js/lib/hv.js';

const close = (a, b, tol, msg) => assert.ok(Math.abs(a - b) <= tol, `${msg ?? ''} ${a} vs ${b} (±${tol})`);

function rng(seed = 1) {
  let s = seed >>> 0;
  return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 2 ** 32 - 0.5; };
}
function noise(n, seed) {
  const r = rng(seed);
  return Float64Array.from({ length: n }, () => { let s = 0; for (let k = 0; k < 12; k++) s += r(); return s; });
}
/** Two-pole resonator (a ringing spring) driven by x: rings at f0 Hz, sharpness q; returns the ringing alone. */
function resonate(x, sr, f0, q = 10) {
  const w = (2 * Math.PI * f0) / sr;
  const r = 1 - w / (2 * q);
  const a1 = 2 * r * Math.cos(w);
  const a2 = -r * r;
  const y = new Float64Array(x.length);
  for (let i = 0; i < x.length; i++) y[i] = x[i] + a1 * (y[i - 1] || 0) + a2 * (y[i - 2] || 0);
  return y;
}
/** Broadband noise plus a ringing part driven by separate noise (they add in power, no interference). */
function ringingGround(len, sr, f0, seedA, seedB) {
  const a = noise(len, seedA);
  const y = resonate(noise(len, seedB), sr, f0);
  const g = 4 / Math.max(...y.map(Math.abs)) * 3; // about 3x the noise at f0
  return Float64Array.from(a, (v, i) => v + g * y[i]);
}

test('logFreqs and tukeyWindow', () => {
  const f = logFreqs(0.1, 10, 5);
  [0.1, 0.316, 1, 3.162, 10].forEach((v, i) => close(f[i], v, 0.001));
  const w = tukeyWindow(100, 0.1);
  assert.equal(w[0], 0);
  assert.equal(w[50], 1);
  assert.equal(w[99], 0);
  close(w[2], 0.5 * (1 - Math.cos((Math.PI * 2) / 5)), 1e-12, 'cosine fade over the first 5 samples');
});

test('Konno–Ohmachi: weights sum to 1, a flat spectrum stays flat', () => {
  const bins = Float64Array.from({ length: 4097 }, (_, k) => (k * 100) / 8192);
  const centers = logFreqs(0.2, 20, 30);
  const wts = konnoOhmachiWeights(bins, centers, 40);
  for (const { w } of wts) close(w.reduce((a, v) => a + v, 0), 1, 1e-12, 'sum');
  const flat = applyWeights(wts, new Float64Array(4097).fill(7));
  for (const v of flat) close(v, 7, 1e-9, 'flat');
});

test('Konno–Ohmachi: a narrow spike spreads evenly on a log scale', () => {
  // the smoothed peak of a one-bin spike is centered on it and about equally wide (in
  // log frequency) at 1 Hz and at 10 Hz
  const n = 2 ** 16;
  const bins = Float64Array.from({ length: n / 2 + 1 }, (_, k) => (k * 100) / n);
  const centers = logFreqs(0.5, 20, 400);
  const width = (fSpike) => {
    const a = new Float64Array(bins.length);
    a[Math.round((fSpike * n) / 100)] = 1;
    const s = konnoOhmachi(bins, a, centers, 40);
    const p = findPeak(centers, s);
    close(Math.log10(p.f0 / fSpike), 0, 0.01, `centered at ${fSpike} Hz`);
    const above = centers.filter((_, i) => s[i] >= p.a0 / 2);
    return Math.log10(above.at(-1) / above[0]);
  };
  close(width(1), width(10), 0.01, 'same width in log frequency');
});

test('horizontal combines N and E as √((N² + E²) / 2)', () => {
  const h = horizontal([3, 1, 0], [4, 1, 2]);
  close(h[0], Math.sqrt(12.5), 1e-12);
  close(h[1], 1, 1e-12);
  close(h[2], Math.sqrt(2), 1e-12);
});

test('hvWindows: the same record on all three sensors gives H/V = 1', () => {
  const sr = 100;
  const x = noise(8192 * 3, 5);
  const centers = logFreqs(0.2, 20, 40);
  const ws = hvWindows(x, x, x, sr, { windowSec: 80, centers });
  assert.equal(ws.length, 3); // 80 s rounds up to 8192 samples
  for (const w of ws) for (const v of w.hv) close(v, 1, 1e-9);
});

test('hvWindows: horizontals that ring at 2 Hz give a peak at 2 Hz; rock-like records do not', () => {
  const sr = 100;
  const len = 8192 * 6;
  const z = noise(len, 11);
  const n = ringingGround(len, sr, 2, 12, 14);
  const e = ringingGround(len, sr, 2, 13, 15);
  const centers = logFreqs(0.2, 20, 120);
  const ws = rejectWindows(hvWindows(z, n, e, sr, { centers }));
  assert.equal(ws.length, 6);
  const { mean, spread } = combineCurves(ws.map((w) => w.hv));
  const p = findPeak(centers, mean, { fMin: 0.3, fMax: 15 });
  close(p.f0, 2, 0.1, 'f0');
  assert.ok(p.a0 > 2, `clear peak ${p.a0}`);
  close(mean[findPeak(centers, centers.map((f) => -Math.abs(Math.log(f / 10)))).index], 1, 0.3, 'about 1 far from f0');
  assert.ok(spread.every((s) => s >= 1));
  const steady = peakSpread(centers, ws.map((w) => w.hv), p.f0);
  close(steady.mean, 2, 0.15, 'each window peaks near 2 Hz');
  // independent noise on all three: no peak to speak of
  const rock = combineCurves(rejectWindows(hvWindows(noise(len, 21), noise(len, 22), noise(len, 23), sr, { centers })).map((w) => w.hv));
  assert.ok(findPeak(centers, rock.mean).a0 < 1.5);
});

test('hvWindows: skips windows with a missing sample', () => {
  const x = noise(8192 * 2, 3);
  const y = Float64Array.from(x);
  y[100] = NaN;
  const ws = hvWindows(x, y, x, 100, { centers: logFreqs(1, 10, 5) });
  assert.equal(ws.length, 1);
  assert.equal(ws[0].start, 8192);
});

test('rejectWindows drops bursts and loud windows', () => {
  const ws = [
    { rms: [1, 1, 1], burst: 1.5 },
    { rms: [1.1, 0.9, 1], burst: 1.4 },
    { rms: [1, 1, 1], burst: 6 }, // a footstep
    { rms: [3, 1, 1], burst: 1.5 }, // loud
    { rms: [0.9, 1.1, 1.2], burst: 1.6 },
  ];
  assert.deepEqual(rejectWindows(ws).map((w) => ws.indexOf(w)), [0, 1, 4]);
  assert.deepEqual(rejectWindows([]), []);
});

test('combineCurves: geometric mean and spread factor', () => {
  const { mean, spread } = combineCurves([[1, 2], [4, 2], [16, 2]]);
  close(mean[0], 4, 1e-12, 'geometric mean of 1, 4, 16');
  close(spread[0], 4, 1e-12, 'logs 0, ln4, ln16: sd = ln 4');
  close(mean[1], 2, 1e-12);
  close(spread[1], 1, 1e-12);
});

test('findPeak respects the range', () => {
  const f = [0.1, 0.5, 1, 5, 10];
  const c = [9, 2, 3, 1, 8];
  assert.deepEqual(findPeak(f, c, { fMin: 0.2, fMax: 6 }), { f0: 1, a0: 3, index: 2 });
  assert.equal(findPeak(f, c).f0, 0.1);
  assert.ok(Number.isNaN(findPeak(f, c, { fMin: 20 }).f0));
});

test('f0 = Vs / (4H) and back; travel-time average speed', () => {
  close(f0FromThickness(816, 515), 0.396, 0.001, 'the worked example near FOR4');
  close(thicknessFromF0(800, 0.4), 500, 1e-9);
  close(thicknessFromF0(400, 2.8), 35.7, 0.05);
  // 100 m at 200 m/s (0.5 s) then 100 m at 600 m/s (1/6 s): 200 m in 2/3 s = 300 m/s,
  // not the plain average 400 m/s
  close(averageVs([0, 100], [200, 600], 200), 300, 1e-9);
  close(averageVs([0, 100], [200, 600], 50), 200, 1e-9);
});
