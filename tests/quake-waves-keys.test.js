// Quake Waves: moving the quake with the keyboard (arrow keys, Shift for bigger steps), and
// what screen readers hear about where it is.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  STEP_KM, BIG_STEP_KM, keyStep, moveQuake, nearestStation, describeQuake,
} from '../docs/app/js/quake-waves/map-keys.js';

const WORLD = { w: 200, h: 120 };
// The app's four stations (docs/app/js/quake-waves/app.js).
const STATIONS = [
  { name: 'A', x: 70, y: 45 }, { name: 'B', x: 175, y: 35 },
  { name: 'C', x: 120, y: 100 }, { name: 'D', x: 30, y: 100 },
];

test('each arrow key moves the quake its way on the map; y grows down the map', () => {
  assert.deepEqual(keyStep('ArrowRight', false), { dx: STEP_KM, dy: 0 });
  assert.deepEqual(keyStep('ArrowLeft', false), { dx: -STEP_KM, dy: 0 });
  assert.deepEqual(keyStep('ArrowUp', false), { dx: 0, dy: -STEP_KM });
  assert.deepEqual(keyStep('ArrowDown', false), { dx: 0, dy: STEP_KM });
});

test('Shift gives a bigger step: small enough to aim, big enough to cross the map quickly', () => {
  assert.deepEqual(keyStep('ArrowRight', true), { dx: BIG_STEP_KM, dy: 0 });
  assert.ok(BIG_STEP_KM > STEP_KM);
  assert.ok(STEP_KM <= 5, 'a small step can put the quake right next to a station');
  assert.ok(WORLD.w / BIG_STEP_KM <= 10, 'ten big steps or fewer cross the map');
});

test('other keys do not move the quake (Tab, Enter, Space and the rest work as usual)', () => {
  for (const key of ['Tab', 'Enter', ' ', 'Escape', 'a', 'Home', 'PageDown', 'Shift']) {
    assert.equal(keyStep(key, false), null, key);
    assert.equal(moveQuake({ x: 50, y: 50 }, key, true, WORLD), null, key);
  }
});

test('moveQuake: one step, and the old position is left as it was', () => {
  const q = { x: 85, y: 62 };
  const m = moveQuake(q, 'ArrowLeft', false, WORLD);
  assert.deepEqual(m, { quake: { x: 80, y: 62 }, atEdge: false });
  assert.deepEqual(q, { x: 85, y: 62 });
  assert.deepEqual(moveQuake(q, 'ArrowDown', true, WORLD).quake, { x: 85, y: 82 });
});

test('moveQuake: the quake stops at the edge of the map, and says so', () => {
  assert.deepEqual(moveQuake({ x: 3, y: 50 }, 'ArrowLeft', false, WORLD), { quake: { x: 0, y: 50 }, atEdge: true });
  assert.deepEqual(moveQuake({ x: 0, y: 50 }, 'ArrowLeft', false, WORLD), { quake: { x: 0, y: 50 }, atEdge: true });
  assert.deepEqual(moveQuake({ x: 190, y: 110 }, 'ArrowRight', true, WORLD).quake, { x: 200, y: 110 });
  assert.deepEqual(moveQuake({ x: 50, y: 110 }, 'ArrowDown', true, WORLD).quake, { x: 50, y: 120 });
  assert.deepEqual(moveQuake({ x: 50, y: 4 }, 'ArrowUp', false, WORLD).quake, { x: 50, y: 0 });
});

test('holding a key down never takes the quake off the map', () => {
  for (const key of ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown']) {
    let q = { x: 85, y: 62 };
    for (let i = 0; i < 100; i++) q = moveQuake(q, key, i % 3 === 0, WORLD).quake;
    assert.ok(q.x >= 0 && q.x <= WORLD.w && q.y >= 0 && q.y <= WORLD.h, `${key}: ${q.x}, ${q.y}`);
  }
});

test('the arrow keys can reach a station from the start (the guide asks for a quake next to one)', () => {
  let q = { x: 85, y: 62 }; // where the quake starts
  // Station A is at 70, 45: three steps left, three up gets within 3 km.
  for (const key of ['ArrowLeft', 'ArrowLeft', 'ArrowLeft', 'ArrowUp', 'ArrowUp', 'ArrowUp']) {
    q = moveQuake(q, key, false, WORLD).quake;
  }
  const near = nearestStation(q, STATIONS);
  assert.equal(near.name, 'A');
  assert.ok(near.km < 3, `${near.km} km`);
});

test('nearestStation: the closest one and its distance', () => {
  const n = nearestStation({ x: 85, y: 62 }, STATIONS);
  assert.equal(n.name, 'A');
  assert.ok(Math.abs(n.km - Math.hypot(15, 17)) < 1e-9);
  assert.equal(nearestStation({ x: 175, y: 40 }, STATIONS).name, 'B');
  assert.equal(nearestStation({ x: 0, y: 0 }, []), null);
});

test('describeQuake: where the quake is, in whole km, and its nearest station', () => {
  assert.equal(describeQuake({ x: 85, y: 62 }, STATIONS),
    'Quake 85 km from the left and 62 km from the top. Nearest station: A, 23 km away.');
  assert.equal(describeQuake({ x: 119.6, y: 98.2 }, STATIONS),
    'Quake 120 km from the left and 98 km from the top. Nearest station: C, 2 km away.');
});

test('describeQuake: says when the edge of the map stopped the quake', () => {
  const t = describeQuake({ x: 0, y: 50 }, STATIONS, true);
  assert.match(t, /^Edge of the map\. Quake 0 km from the left/);
  assert.doesNotMatch(describeQuake({ x: 10, y: 50 }, STATIONS, false), /Edge/);
});
