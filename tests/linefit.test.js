import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  fitLine, speedFromArrivals, speedFromRuler, twoLineFit, BEND_F_RATIO,
} from '../docs/app/js/lib/linefit.js';
import { firstArrival } from '../docs/app/js/lib/traveltime.js';
import { mulberry32 } from '../docs/app/js/lib/wave-sim.js';

const near = (a, b, tol, msg) => assert.ok(Math.abs(a - b) <= tol, `${msg ?? ''} ${a} vs ${b}`);

// Seeded random pick errors (roughly Gaussian, standard deviation amp) so the
// tests give the same numbers every run.
const rand = mulberry32(7);
const jitter = (_i, amp) => {
  let s = 0;
  for (let k = 0; k < 6; k++) s += rand();
  return (amp * (s - 3)) / Math.sqrt(0.5);
};

test('fitLine recovers an exact line', () => {
  const f = fitLine([0, 1, 2, 3], [1, 3, 5, 7]);
  near(f.slope, 2, 1e-12);
  near(f.intercept, 1, 1e-12);
  near(f.rms, 0, 1e-12);
  near(f.r2, 1, 1e-12);
  assert.throws(() => fitLine([1], [1]));
  assert.throws(() => fitLine([2, 2], [1, 3]));
});

test('speed from arrivals: P at 6 km/s with 0.05 s pick noise', () => {
  const pts = [];
  for (let i = 0; i < 15; i++) {
    const d = 10 + i * 8;
    pts.push({ distKm: d, tSec: d / 6 + jitter(i, 0.05) });
  }
  const s = speedFromArrivals(pts);
  near(s.speedKms, 6, 0.05);
  near(s.interceptSec, 0, 0.06);
  assert.ok(s.speedSE > 0 && s.speedSE < 0.05);
  near(speedFromRuler({ distKm: 0, tSec: 0 }, { distKm: 33, tSec: 10 }), 3.3, 1e-12);
});

test('two lines: finds the Pg/Pn bend and both speeds in synthetic first arrivals', () => {
  const m = { vp1: 6.1, vp2: 7.9, vs1: 3.5, vs2: 4.5, crustKm: 35, depthKm: 8 };
  const pts = [];
  for (let i = 0; i < 28; i++) {
    const d = 15 + i * 10;
    pts.push({ distKm: d, tSec: firstArrival(d, m).t + jitter(i, 0.08) });
  }
  const f = twoLineFit(pts);
  near(f.near.speedKms, 6.1, 0.15);
  near(f.far.speedKms, 7.9, 0.3);
  near(f.crossoverKm, 166, 20);
  assert.ok(f.fRatio > BEND_F_RATIO, `F ${f.fRatio}`);
});

test('two lines: points on one straight line give no clear bend', () => {
  const pts = [];
  for (let i = 0; i < 20; i++) pts.push({ distKm: 10 + 10 * i, tSec: (10 + 10 * i) / 6 + jitter(i, 0.08) });
  const f = twoLineFit(pts);
  assert.ok(f === null || f.fRatio < BEND_F_RATIO, `F ${f?.fRatio}`);
});
