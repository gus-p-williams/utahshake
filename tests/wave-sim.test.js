import { test } from 'node:test';
import assert from 'node:assert/strict';
import { arrivals, synthTrace, durationFor, mulberry32 } from '../docs/app/js/lib/wave-sim.js';
import { spToDistanceKm } from '../docs/app/js/lib/locate.js';

test('S - P from the animation turns back into the true distance', () => {
  for (const d of [5, 23, 52, 94, 180]) {
    const { p, s } = arrivals(d, 5.8, 3.3);
    assert.ok(s > p);
    assert.ok(Math.abs(spToDistanceKm(s - p, 5.8, 3.3) - d) < 1e-9);
  }
});

test('cartoon seismogram: quiet before P, S bigger than P, waves smaller far away', () => {
  const rate = 50;
  const peak = (a, from, to) => {
    let m = 0;
    for (let i = Math.floor(from * rate); i < Math.min(a.length, to * rate); i++) m = Math.max(m, Math.abs(a[i]));
    return m;
  };
  const near = synthTrace({ distKm: 23, vp: 5.8, vs: 3.3, durationSec: 40, rate });
  const far = synthTrace({ distKm: 94, vp: 5.8, vs: 3.3, durationSec: 40, rate });
  const { p, s } = arrivals(23, 5.8, 3.3);
  assert.equal(near.length, 40 * rate + 1);
  assert.ok(peak(near, 0, p) < 0.06, 'only noise before P');
  assert.ok(peak(near, p, s) > 0.15, 'P is visible');
  assert.ok(peak(near, s, s + 4) > 1.5 * peak(near, p, s), 'S is bigger than P');
  assert.ok(peak(far, 0, 40) < 0.5 * peak(near, 0, 40), 'far station shakes less');
});

test('same seed, same noise', () => {
  const a = mulberry32(7);
  const b = mulberry32(7);
  for (let i = 0; i < 5; i++) assert.equal(a(), b());
  const t1 = synthTrace({ distKm: 40, vp: 6, vs: 3.5, durationSec: 10, seed: 3 });
  const t2 = synthTrace({ distKm: 40, vp: 6, vs: 3.5, durationSec: 10, seed: 3 });
  assert.deepEqual(t1, t2);
});

test('record length covers the last S arrival plus a tail', () => {
  assert.equal(durationFor([23, 52, 94], 3.3), 40); // last S at 28.5 s + 8 s -> 40
  assert.equal(durationFor([], 3.3), 10);
  assert.ok(durationFor([230], 3.3) >= 230 / 3.3 + 8);
});
