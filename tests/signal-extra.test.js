// Quake Explorer additions to signal.js: detrend, RMS, SNR, low-pass, decimate, clipping.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  detrend, rms, snr, lowpassKernel, lowpassFIR, decimate, clipInfo, flatTopInfo, isClipped,
} from '../docs/app/js/lib/signal.js';

const sine = (n, sr, f, amp = 1) =>
  Float32Array.from({ length: n }, (_, i) => amp * Math.sin(2 * Math.PI * f * (i / sr)));
const close = (a, b, tol, msg) => assert.ok(Math.abs(a - b) <= tol, `${msg ?? ''} ${a} vs ${b}`);

test('detrend removes a straight line and keeps gaps', () => {
  const line = Float64Array.from({ length: 100 }, (_, i) => 3 + 0.5 * i);
  detrend(line);
  for (const v of line) close(v, 0, 1e-9);
  const y = Float64Array.from({ length: 1000 }, (_, i) => 10 - 0.02 * i + Math.sin(i / 5));
  y[400] = NaN;
  detrend(y);
  assert.ok(Number.isNaN(y[400]));
  close(y[100], Math.sin(100 / 5), 0.05, 'the wiggle stays');
  const allNaN = Float32Array.from([NaN, NaN]);
  assert.equal(detrend(allNaN), allNaN);
});

test('rms ignores NaN', () => {
  close(rms(Float32Array.from([3, -3, NaN, 3, -3])), 3, 1e-9);
  close(rms(sine(1000, 100, 5, 2)), 2 / Math.SQRT2, 1e-3);
  assert.ok(Number.isNaN(rms(Float32Array.from([NaN]))));
  close(rms(Float32Array.from([0, 0, 4, 4]), 2, 4), 4, 1e-9);
});

test('snr: 10x bigger signal than noise reads 10, whatever the offset', () => {
  const sr = 100;
  const x = new Float32Array(2000);
  for (let i = 0; i < 2000; i++) x[i] = 5000 + (i < 1000 ? 1 : 10) * Math.sin(2 * Math.PI * 3 * (i / sr));
  close(snr(x, sr, [10, 20], [0, 10]), 10, 0.01);
  assert.ok(Number.isNaN(snr(x, sr, [10, 20], [30, 40])), 'noise window off the end');
});

test('lowpassKernel: symmetric, sums to 1, longer for sharper filters', () => {
  const h = lowpassKernel(100, 8, 4);
  assert.equal(h.length % 2, 1);
  close(h.reduce((s, v) => s + v, 0), 1, 1e-12);
  for (let i = 0; i < h.length; i++) close(h[i], h[h.length - 1 - i], 1e-15);
  assert.ok(lowpassKernel(100, 8, 1).length > 3 * h.length);
});

test('lowpassFIR keeps a steady level to the very ends, removes high notes, keeps gaps', () => {
  const flat = new Float32Array(300).fill(7);
  for (const v of lowpassFIR(flat, 100, 5)) close(v, 7, 1e-4);
  const sr = 100;
  const x = sine(3000, sr, 1).map((v, i) => v + Math.sin(2 * Math.PI * 30 * (i / sr)));
  x[1500] = NaN;
  const y = lowpassFIR(x, sr, 5);
  assert.ok(Number.isNaN(y[1500]));
  // away from the edges, what is left is the 1 Hz sine (zero phase: no delay)
  for (const i of [500, 777, 2500]) close(y[i], Math.sin(2 * Math.PI * (i / sr)), 0.01, `i=${i}`);
});

test('decimate keeps a 2 Hz sine (100 -> 20 samples/s)', () => {
  const sr = 100;
  const x = sine(6000, sr, 2, 1);
  const d = decimate(x, sr, 5);
  assert.equal(d.sampleRate, 20);
  assert.equal(d.data.length, 1200);
  for (let j = 50; j < 1150; j++) close(d.data[j], Math.sin(2 * Math.PI * 2 * (j / 20)), 0.01, `j=${j}`);
});

test('decimate removes notes above the new Nyquist instead of aliasing them', () => {
  const sr = 100;
  for (const f of [13, 30]) { // 13 Hz would fold to 7 Hz, 30 Hz to 10 Hz
    const x = sine(6000, sr, f, 1);
    const naive = Float32Array.from({ length: 1200 }, (_, j) => x[j * 5]); // no filter
    const d = decimate(x, sr, 5);
    const r = rms(d.data, 50, 1150);
    assert.ok(rms(naive) > 0.3 || f === 30, `naive keeps a false note at ${f} Hz`);
    assert.ok(r < 1e-3, `${f} Hz left with RMS ${r}`);
  }
  // 13 Hz without the filter really does come out as 7 Hz
  const naive13 = Float32Array.from({ length: 1200 }, (_, j) => Math.sin(2 * Math.PI * 13 * (j / 20)));
  for (let j = 0; j < 20; j++) close(naive13[j], -Math.sin(2 * Math.PI * 7 * (j / 20)), 1e-6);
});

test('decimate keeps gaps as gaps and rejects odd factors', () => {
  const x = sine(1000, 100, 1);
  x.fill(NaN, 400, 450);
  const d = decimate(x, 100, 4);
  assert.ok(Number.isNaN(d.data[100]) && Number.isNaN(d.data[110]));
  assert.ok(Number.isFinite(d.data[99]) && Number.isFinite(d.data[113]));
  assert.throws(() => decimate(x, 100, 2.5), /whole number/);
  assert.deepEqual([...decimate(Float32Array.from([1, 2]), 100, 1).data], [1, 2]);
});

test('clipInfo finds samples at the 24-bit limit', () => {
  const x = Float32Array.from([0, 100, -8388000, NaN, 8388607, 5]);
  assert.deepEqual(clipInfo(x), { clipped: true, count: 2, firstIndex: 2 });
  assert.deepEqual(clipInfo(Float32Array.from([1, -2, NaN])), { clipped: false, count: 0, firstIndex: -1 });
  assert.deepEqual(clipInfo(Float32Array.from([0, 900, -1000]), { limit: 1000, frac: 0.9 }),
    { clipped: true, count: 2, firstIndex: 1 });
});

test('flatTopInfo finds 16-bit clipping that the 24-bit test misses', () => {
  // A sine that a 16-bit digitizer cut flat at ±32 767.
  const x = Float32Array.from({ length: 400 }, (_, i) =>
    Math.max(-32768, Math.min(32767, 60000 * Math.sin((2 * Math.PI * i) / 100))));
  assert.equal(clipInfo(x).clipped, false);
  const f = flatTopInfo(x);
  assert.equal(f.clipped, true);
  assert.ok(f.level === 32767 || f.level === -32768);
  assert.ok(f.longestRun > 10);
  assert.ok(isClipped(x));
  // A clean sine and a quiet record of small whole numbers are not clipped.
  assert.equal(flatTopInfo(Float32Array.from({ length: 400 }, (_, i) => Math.round(30000 * Math.sin(i / 7)))).clipped, false);
  assert.equal(flatTopInfo(Float32Array.from([3, 3, 3, -2, 1, 3])).clipped, false);
  assert.equal(isClipped(Float32Array.from([1, 2, NaN, -3])), false);
});
