// Stacking and cross-correlation on synthetic records with known answers.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  windowAround, scaleToNoise, stackMean, stackNoiseByCount, crossCorrelation,
} from '../docs/app/js/lib/stack.js';
import { mulberry32 } from '../docs/app/js/lib/wave-sim.js';

const close = (a, b, tol, msg) => assert.ok(Math.abs(a - b) <= tol, `${msg ?? ''} ${a} vs ${b} (±${tol})`);

/** Gaussian-ish noise with unit variance (sum of 12 uniforms). */
function noise(n, seed) {
  const r = mulberry32(seed);
  return Float64Array.from({ length: n }, () => { let s = -6; for (let k = 0; k < 12; k++) s += r(); return s; });
}
/** A short wavelet: a 5 Hz sine fading over 0.5 s, at 100 samples per second. */
const wavelet = (n = 150) => Float64Array.from({ length: n }, (_, i) => Math.sin(2 * Math.PI * 5 * i / 100) * Math.exp(-i / 50));

test('windowAround: cuts around a moment, NaN outside the record', () => {
  const trace = { data: Float64Array.from({ length: 100 }, (_, i) => i), startMs: 1000, sampleRate: 10 };
  const w = windowAround(trace, 3000, 1, 2); // 2 s after start = index 20; from index 10 for 30 samples
  assert.equal(w.length, 30);
  assert.equal(w[0], 10);
  assert.equal(w[29], 39);
  const edge = windowAround(trace, 1000, 0.5, 0.5);
  assert.ok(Number.isNaN(edge[0]));
  assert.equal(edge[5], 0);
});

test('scaleToNoise: the noise part ends up with RMS 1', () => {
  const x = Float64Array.from([3, -3, 3, -3, 30, -30]);
  const { data, noiseRms } = scaleToNoise(x, 0, 4);
  assert.equal(noiseRms, 3);
  assert.deepEqual(Array.from(data), [1, -1, 1, -1, 10, -10]);
});

test('stackMean: averages sample by sample and skips missing samples', () => {
  const s = stackMean([[1, 2, NaN], [3, NaN, NaN], [5, 4, NaN]]);
  assert.deepEqual(Array.from(s.slice(0, 2)), [3, 3]);
  assert.ok(Number.isNaN(s[2]));
  assert.equal(stackMean([]).length, 0);
});

test('stacking keeps a repeated event and shrinks random noise by √N', () => {
  const n = 600;
  const ev = new Float64Array(n);
  ev.set(wavelet().map((v) => 3 * v), 300);
  const windows = Array.from({ length: 64 }, (_, k) => {
    const z = noise(n, 100 + k);
    return z.map((v, i) => v + ev[i]);
  });
  const st = stackMean(windows);
  // the event stays (correlates almost perfectly with the clean event), the noise shrinks
  const { best } = crossCorrelation(ev.subarray(300, 450), st, 300, 5);
  assert.equal(best.lag, 0);
  assert.ok(best.cc > 0.95, `event survives: ${best.cc}`);
  const noiseBefore = Math.sqrt(st.subarray(0, 250).reduce((s, v) => s + v * v, 0) / 250);
  close(noiseBefore, 1 / 8, 0.025, 'noise of 64 stacked ≈ 1/8');
});

test('stackNoiseByCount: follows 1/√N for independent noise, and repeats with the same seed', () => {
  const windows = Array.from({ length: 100 }, (_, k) => noise(1000, 7 + k));
  const counts = [1, 4, 16, 64, 100];
  const curve = stackNoiseByCount(windows, counts, { draws: 30, seed: 3 });
  for (const { n, rms } of curve) close(rms * Math.sqrt(n), 1, 0.06, `N = ${n}`);
  assert.deepEqual(stackNoiseByCount(windows, counts, { draws: 30, seed: 3 }), curve);
  assert.throws(() => stackNoiseByCount(windows, [101]), /more than/);
});

test('crossCorrelation: a shifted, scaled copy correlates 1 at the shift', () => {
  const rec = noise(1000, 5);
  const template = rec.slice(400, 500);
  // the same wiggles 7 samples later, 10× bigger, plus an offset
  const later = new Float64Array(1000);
  for (let i = 0; i < 1000; i++) later[i] = 10 * (rec[i - 7] ?? 0) + 50;
  const { best, lags, cc } = crossCorrelation(template, later, 400, 20);
  assert.equal(best.lag, 7);
  close(best.cc, 1, 1e-9);
  assert.equal(lags.length, 41);
  assert.equal(lags[0], -20);
  assert.ok(Math.abs(cc[0]) < 0.5, 'far from the match it is small');
});

test('crossCorrelation: a mirror image gives −1; unrelated noise stays small', () => {
  const a = noise(500, 11);
  const flipped = a.map((v) => -v);
  const r = crossCorrelation(a.subarray(100, 300), flipped, 100, 0);
  close(r.cc[0], -1, 1e-9);
  const other = noise(500, 12);
  const u = crossCorrelation(a.subarray(100, 300), other, 100, 0);
  assert.ok(Math.abs(u.cc[0]) < 0.25, `unrelated: ${u.cc[0]}`);
});

test('crossCorrelation: missing samples and the record edge give NaN', () => {
  const a = noise(300, 2);
  const b = a.slice();
  b[150] = NaN;
  const r = crossCorrelation(a.subarray(100, 200), b, 100, 3);
  assert.ok(r.cc.every(Number.isNaN), 'every lag sees the gap');
  assert.ok(Number.isNaN(r.best.cc));
  const edge = crossCorrelation(a.subarray(0, 100), a, 0, 2);
  assert.ok(Number.isNaN(edge.cc[0]) && Number.isNaN(edge.cc[1]), 'before the start');
  close(edge.cc[2], 1, 1e-9);
});
