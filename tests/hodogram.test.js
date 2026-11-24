import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  norm360, compassPoint, azimuthOf, alongAzimuth, windowIndices, clampWindow, motionScale,
  TRUST, trustReport, parseColour, mixColour,
} from '../docs/app/js/lib/hodogram.js';

const near = (a, b, tol, msg) => assert.ok(Math.abs(a - b) <= tol, `${msg ?? ''} ${a} vs ${b}`);

test('norm360 and compass points', () => {
  assert.equal(norm360(-10), 350);
  assert.equal(norm360(720), 0);
  assert.equal(norm360(-1e-15), 0);
  assert.equal(compassPoint(0), 'N');
  assert.equal(compassPoint(47), 'NE');
  assert.equal(compassPoint(200), 'S');
  assert.equal(compassPoint(330), 'NW');
  assert.equal(compassPoint(-20), 'N');
});

test('azimuthOf: right is east, up is north', () => {
  assert.equal(azimuthOf(0, 1), 0);
  assert.equal(azimuthOf(1, 0), 90);
  assert.equal(azimuthOf(0, -1), 180);
  assert.equal(azimuthOf(-1, 0), 270);
  near(azimuthOf(1, 1), 45, 1e-9);
});

test('alongAzimuth: motion toward 45° shows fully along 45°, none across it', () => {
  const s = Math.SQRT1_2;
  const n = Float32Array.of(s, NaN);
  const e = Float32Array.of(s, 0);
  near(alongAzimuth(n, e, 45)[0], 1, 1e-6);
  near(alongAzimuth(n, e, 135)[0], 0, 1e-6);
  near(alongAzimuth(n, e, 225)[0], -1, 1e-6);
  assert.ok(Number.isNaN(alongAzimuth(n, e, 45)[1]));
});

test('windowIndices: seconds after origin -> sample numbers, clamped to the record', () => {
  // record starts 30 s before the origin, 100 samples/s, 60 s long
  const rec = { startMs: 1000, refMs: 31000, sampleRate: 100, length: 6000 };
  assert.deepEqual(windowIndices(rec, 0, 0.5), { i0: 3000, i1: 3050 });
  assert.deepEqual(windowIndices(rec, -40, 40), { i0: 0, i1: 6000 });
});

test('clampWindow keeps the length when sliding back inside, and enforces min/max', () => {
  const full = { from: 0, to: 10 };
  assert.deepEqual(clampWindow(9.8, 10.3, full), { t0: 9.5, t1: 10 });
  assert.deepEqual(clampWindow(-1, -0.5, full), { t0: 0, t1: 0.5 });
  const w = clampWindow(2, 2.01, full, 0.1);
  near(w.t1 - w.t0, 0.1, 1e-9);
  assert.deepEqual(clampWindow(3, 1, full), { t0: 1, t1: 3 });
  assert.deepEqual(clampWindow(1, 9, full, 0.1, 4), { t0: 1, t1: 5 });
});

test('motionScale: largest of |up| and horizontal distance, gaps skipped', () => {
  const z = Float32Array.of(0.5, -2, NaN, 0);
  const n = Float32Array.of(3, 0, NaN, 0);
  const e = Float32Array.of(4, 0, 9, 0);
  assert.equal(motionScale(z, n, e), 5);
  assert.equal(motionScale(z, n, e, 1, 4), 2);
  assert.equal(motionScale(z, n, e, 2, 3), 0);
  assert.equal(motionScale(null, n, e, 1, 4), 0); // horizontal only: none in samples 1–3
  assert.equal(motionScale(null, n, e), 5);
});

test('trustReport: plain words from linearity and up/away', () => {
  const good = trustReport(0.95, 0.75);
  assert.equal(good.line.words, 'clear line');
  assert.equal(good.upAway.words, 'clear up = away');
  assert.equal(good.overall.level, 'good');
  const messy = trustReport(0.48, 0.63); // SGU for the Junction quake: 130° off
  assert.equal(messy.line.words, 'messy');
  assert.equal(messy.overall.level, 'poor');
  const flip = trustReport(0.99, 0.1);
  assert.equal(flip.upAway.words, 'unclear');
  assert.match(flip.overall.words, /180/);
  assert.equal(trustReport(0.7, 0.6).overall.level, 'fair');
  assert.equal(trustReport(NaN, NaN).overall.level, 'poor');
  assert.equal(trustReport(TRUST.lineClear, TRUST.upAwayClear).overall.level, 'good');
});

test('parseColour and mixColour', () => {
  assert.deepEqual(parseColour('#1d4ed8'), [29, 78, 216]);
  assert.deepEqual(parseColour('#fff'), [255, 255, 255]);
  assert.deepEqual(parseColour('rgb(1, 2, 3)'), [1, 2, 3]);
  assert.deepEqual(parseColour('rgba(10,20,30,0.5)'), [10, 20, 30]);
  assert.equal(parseColour('red'), null);
  assert.equal(mixColour([0, 0, 0], [255, 255, 255], 0.5), 'rgb(128, 128, 128)');
  assert.equal(mixColour([0, 0, 0], [200, 100, 50], 1), 'rgb(200, 100, 50)');
});
