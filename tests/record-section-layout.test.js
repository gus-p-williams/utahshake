// Layout and geometry helpers for the record-section view (lib/record-section.js).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  reducedTime, trueTime, timeWindows, traceLayout, dataColumns, niceFloor, distToSegment,
  speedText, shiftRuler, tiltRuler, spreadLabels,
} from '../docs/app/js/lib/record-section.js';
import { speedFromRuler } from '../docs/app/js/lib/linefit.js';

const near = (a, b, tol = 1e-9) => assert.ok(Math.abs(a - b) <= tol, `${a} vs ${b}`);

test('reduced time: an 8 km/s wave runs straight down, and trueTime undoes it', () => {
  // Arrivals of an 8 km/s wave that left at t = 2 s all have the same reduced time.
  for (const d of [0, 50, 160, 400]) near(reducedTime(2 + d / 8, d, 8), 2);
  near(trueTime(reducedTime(37.5, 120, 6), 120, 6), 37.5);
  assert.equal(reducedTime(10, 100, 0), 10); // no reduction
  assert.equal(trueTime(10, 100, 0), 10);
});

test('time windows: plain time unchanged; reduced time starts where every trace has data', () => {
  assert.deepEqual(timeWindows(-10, 90, 11, 397, 0),
    { home: { from: -10, to: 90 }, limit: { from: -10, to: 90 } });
  // Magna sample: -10..90 s, stations 11.5 to 396.6 km, v = 8
  const w = timeWindows(-10, 90, 11.5, 396.6, 8);
  near(w.home.from, -10 - 11.5 / 8);
  near(w.home.to, 90 - 396.6 / 8);
  near(w.limit.from, -10 - 396.6 / 8);
  near(w.limit.to, 90 - 11.5 / 8);
  // Too short a window: show everything instead.
  const short = timeWindows(0, 20, 0, 300, 6);
  assert.deepEqual(short.home, short.limit);
});

test('trace layout: distance maps down the page; room stops at the neighbours', () => {
  const { ys, gap, room } = traceLayout([0, 50, 100, 102, 300], { dMin: 0, dMax: 300, top: 10, height: 600 });
  [10, 110, 210, 214, 610].forEach((y, k) => near(ys[k], y, 1e-9));
  near(gap, 150); // (610 - 10) / 4
  const sameRoom = (r, up, down) => { near(r.up, up, 1e-9); near(r.down, down, 1e-9); };
  sameRoom(room[1], 100, 100);
  // 100 and 102 km are 4 px apart: each still gets half a gap of room
  sameRoom(room[2], 100, 75);
  sameRoom(room[3], 75, 396);
  sameRoom(room[0], 150, 100); // the first trace: one gap above
  // one trace: a quarter of the height; never smaller than minGap
  near(traceLayout([10], { dMin: 0, dMax: 100, top: 0, height: 400 }).gap, 100);
  near(traceLayout([10, 10.1], { dMin: 0, dMax: 100, top: 0, height: 400, minGap: 6 }).gap, 6);
});

test('data columns: nothing drawn before the record starts or after it ends', () => {
  // 10 samples per column, record of 1000 samples starting 250 samples right of the left edge
  const r = dataColumns(-250, 10, 200, 1000);
  assert.equal(r.c0, 25);
  assert.equal(r.c1, 125);
  near(r.from, 0);
  near(r.to, 1000);
  // whole record inside the window, starting at the left edge
  assert.deepEqual(dataColumns(0, 5, 100, 10000), { c0: 0, c1: 100, from: 0, to: 500 });
  // record entirely to the right of the window: no columns
  const none = dataColumns(-5000, 10, 100, 1000);
  assert.equal(none.c1 - none.c0, 0);
});

test('niceFloor gives round scale-bar values', () => {
  assert.equal(niceFloor(7.3), 5);
  assert.equal(niceFloor(2), 2);
  assert.equal(niceFloor(1.99), 1);
  near(niceFloor(3.4e-6), 2e-6, 1e-18);
  assert.ok(Number.isNaN(niceFloor(0)));
});

test('distance from a point to a ruler segment', () => {
  near(distToSegment(5, 5, 0, 0, 10, 0), 5); // above the middle
  near(distToSegment(-3, 4, 0, 0, 10, 0), 5); // beyond the end: distance to the end
  near(distToSegment(2, 2, 1, 1, 1, 1), Math.SQRT2); // zero-length segment
});

test('ruler speed text: ∞ for "all at once", negative shown as it is', () => {
  assert.equal(speedText(6.134), '6.1 km/s');
  assert.equal(speedText(6.134, 2), '6.13 km/s');
  assert.equal(speedText(speedFromRuler({ distKm: 0, tSec: 5 }, { distKm: 100, tSec: 5 })), '∞ km/s');
  assert.equal(speedText(-4.25), '−4.3 km/s');
  assert.equal(speedText(NaN), '– km/s');
  assert.equal(speedText(25000), '1000+ km/s');
});

test('shifting keeps the speed; tilting about the middle makes the line faster or slower', () => {
  const r = { a: { distKm: 20, tSec: 5 }, b: { distKm: 140, tSec: 25 } }; // 6 km/s
  const s = shiftRuler(r, 1.5, 10);
  assert.deepEqual(s, { a: { distKm: 30, tSec: 6.5 }, b: { distKm: 150, tSec: 26.5 } });
  near(speedFromRuler(s.a, s.b), 6);
  const steeper = tiltRuler(r, 1); // 18 s instead of 20 s for 120 km
  near(speedFromRuler(steeper.a, steeper.b), 120 / 18);
  near((steeper.a.tSec + steeper.b.tSec) / 2, 15); // middle stays put
  // the same when the ends are given far end first
  const flipped = tiltRuler({ a: r.b, b: r.a }, 1);
  assert.deepEqual(flipped, { a: steeper.b, b: steeper.a });
  near(speedFromRuler(tiltRuler(r, -2).a, tiltRuler(r, -2).b), 5); // flatter: 24 s
});

test('labels: important ones first, none closer than the minimum gap', () => {
  const items = [{ y: 10 }, { y: 15, priority: 2 }, { y: 30 }, { y: 50 }, { y: 58 }];
  assert.deepEqual(spreadLabels(items, 12), [false, true, true, true, false]);
  assert.deepEqual(spreadLabels([], 12), []);
});
