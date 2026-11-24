import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  angleDiff, rotateHorizontals, verticalUp, toRadialTransverse, horizontalAxis, pWaveBackAzimuth,
} from '../docs/app/js/lib/motion.js';

const RAD = Math.PI / 180;
const near = (a, b, tol, msg) => assert.ok(Math.abs(a - b) <= tol, `${msg ?? ''} ${a} vs ${b}`);

/**
 * A synthetic P wave at a station: the quake is in direction bazDeg, so the
 * ground moves along azimuth baz + 180 (away) while moving up, with a little
 * sideways noise. Velocity pulse = one cycle of a sine.
 */
function pWave(bazDeg, { n = 100, incidenceDeg = 30, noise = 0.05, polarity = 1 } = {}) {
  const away = (bazDeg + 180) * RAD;
  const z = new Float32Array(n);
  const north = new Float32Array(n);
  const east = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const p = polarity * Math.sin((2 * Math.PI * i) / n);
    const h = p * Math.sin(incidenceDeg * RAD);
    const side = noise * Math.sin(7.3 * i);
    z[i] = p * Math.cos(incidenceDeg * RAD);
    north[i] = h * Math.cos(away) - side * Math.sin(away);
    east[i] = h * Math.sin(away) + side * Math.cos(away);
  }
  return { z, n: north, e: east };
}

test('angleDiff wraps around north', () => {
  assert.equal(angleDiff(10, 350), 20);
  assert.equal(angleDiff(350, 10), -20);
  assert.equal(angleDiff(180, 0), 180);
});

test('1/2 horizontals installed off-north rotate back to north/east', () => {
  // Ground moves 1 unit north. Sensor 1 points at 30°, sensor 2 at 120°.
  const h1 = Float32Array.of(Math.cos(30 * RAD));
  const h2 = Float32Array.of(Math.cos(120 * RAD));
  const { n, e } = rotateHorizontals(h1, h2, 30, 120);
  near(n[0], 1, 1e-6);
  near(e[0], 0, 1e-6);
  assert.equal(verticalUp(Float32Array.of(2), 90)[0], -2);
  assert.equal(verticalUp(Float32Array.of(2), -90)[0], 2);
});

test('radial/transverse: P motion lands on radial, nothing on transverse', () => {
  const { n, e } = pWave(40, { noise: 0 });
  const { r, t } = toRadialTransverse(n, e, 40);
  const sum = (a) => a.reduce((s, v) => s + v * v, 0);
  assert.ok(sum(t) < 1e-8 * sum(r));
  // positive radial = away from the quake: same sign as the up motion here
  assert.ok(r[25] > 0);
});

test('horizontal axis: a line along 60° and a round blob', () => {
  const n = new Float32Array(50);
  const e = new Float32Array(50);
  for (let i = 0; i < 50; i++) { const a = Math.sin(i); n[i] = a * Math.cos(60 * RAD); e[i] = a * Math.sin(60 * RAD); }
  const ax = horizontalAxis(n, e);
  near(ax.axisDeg, 60, 1e-6);
  near(ax.linearity, 1, 1e-6);
  const cn = Float32Array.from({ length: 64 }, (_, i) => Math.cos((2 * Math.PI * i) / 64));
  const ce = Float32Array.from({ length: 64 }, (_, i) => Math.sin((2 * Math.PI * i) / 64));
  assert.ok(horizontalAxis(cn, ce).linearity < 0.01);
});

test('P-wave back-azimuth: right in every quadrant, for push and pull first motion', () => {
  for (const baz of [0, 35, 100, 179, 200, 290, 355]) {
    for (const polarity of [1, -1]) {
      const w = pWave(baz, { polarity });
      const got = pWaveBackAzimuth(w.z, w.n, w.e);
      assert.ok(Math.abs(angleDiff(got.bazDeg, baz)) < 2, `baz ${baz} pol ${polarity}: got ${got.bazDeg}`);
      assert.ok(got.upAwayCorr > 0.9);
      near(got.incidenceDeg, 30, 3);
    }
  }
});
