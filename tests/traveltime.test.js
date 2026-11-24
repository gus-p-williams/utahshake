import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  directTime, headTime, headMinDistance, headIntercept, crustFromIntercept, crossoverKm,
  firstArrival, curves,
} from '../docs/app/js/lib/traveltime.js';

const near = (a, b, tol, msg) => assert.ok(Math.abs(a - b) <= tol, `${msg ?? ''} ${a} vs ${b}`);

test('direct wave: hypotenuse over speed', () => {
  near(directTime(40, 30, 5), 10, 1e-12);
  near(directTime(0, 8, 6), 8 / 6, 1e-12);
});

test('surface quake: crossover matches the textbook formula 2H√((v2+v1)/(v2−v1))', () => {
  const H = 35;
  const v1 = 6.1;
  const v2 = 7.9;
  near(crossoverKm(0, H, v1, v2), 2 * H * Math.sqrt((v2 + v1) / (v2 - v1)), 1e-6);
});

test('head wave: no arrival before the critical distance; line with slope 1/v2', () => {
  const xmin = headMinDistance(8, 35, 6, 8);
  assert.ok(Number.isNaN(headTime(xmin - 1, 8, 35, 6, 8)));
  const t1 = headTime(200, 8, 35, 6, 8);
  const t2 = headTime(300, 8, 35, 6, 8);
  near((t2 - t1) / 100, 1 / 8, 1e-12);
  near(t1 - 200 / 8, headIntercept(8, 35, 6, 8), 1e-12);
});

test('crust thickness from the intercept time inverts headIntercept', () => {
  for (const [h, H] of [[0, 30], [8, 35], [15, 42]]) {
    near(crustFromIntercept(headIntercept(h, H, 6.0, 7.8), 6.0, 7.8, h), H, 1e-9);
  }
});

test('first arrival switches from Pg to Pn at the crossover, deeper quakes cross sooner', () => {
  const m = { vp1: 6.1, vp2: 7.9, vs1: 3.5, vs2: 4.5, crustKm: 35, depthKm: 8 };
  const xc = crossoverKm(m.depthKm, m.crustKm, m.vp1, m.vp2);
  assert.equal(firstArrival(xc - 5, m).phase, 'Pg');
  assert.equal(firstArrival(xc + 5, m).phase, 'Pn');
  assert.equal(firstArrival(xc + 5, m, 'S').phase[0], 'S');
  assert.ok(crossoverKm(15, 35, 6.1, 7.9) < crossoverKm(0, 35, 6.1, 7.9));
  const c = curves(m, 300, 10);
  assert.equal(c.distKm.length, 31);
  assert.ok(Number.isNaN(c.Pn[0]) && Number.isFinite(c.Pn[30]));
  assert.ok(c.Sg[10] > c.Pg[10]);
});
