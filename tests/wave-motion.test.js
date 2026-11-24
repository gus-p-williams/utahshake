import { test } from 'node:test';
import assert from 'node:assert/strict';
import { VP, VS, REACH, displacement, peakKm, frontKm, endTime } from '../docs/app/js/lib/wave-motion.js';

const W = 3.5; // pulse width, km

/** Where the rock has moved most (forward or up), scanning 0..200 km in 10 m steps. */
function peakAt(t, v) {
  let best = -Infinity;
  let at = NaN;
  for (let i = 0; i <= 20000; i++) {
    const d = displacement(i / 100, t, v, W);
    if (d > best) { best = d; at = i / 100; }
  }
  return at;
}

test('the pulse peak sits at x = v t', () => {
  for (const v of [VP, VS]) {
    for (const t of [0.5, 3, 7.25, 12]) {
      assert.ok(Math.abs(peakAt(t, v) - v * t) <= 0.01, `v=${v} t=${t}: peak at ${peakAt(t, v)}`);
      assert.equal(peakKm(t, v), v * t);
      assert.ok(Math.abs(displacement(v * t, t, v, W) - 1) < 1e-12, 'full swing at the peak');
    }
  }
});

test('the rock ahead of the pulse is at rest, and goes back to rest after it', () => {
  for (const v of [VP, VS]) {
    for (const t of [0, 2, 9.5]) {
      const front = frontKm(t, v, W);
      assert.equal(front, v * t + REACH * W);
      for (let x = front + 0.01; x < front + 80; x += 0.37) assert.equal(displacement(x, t, v, W), 0);
      // Behind the pulse the rock is back where it started.
      if (v * t > REACH * W) assert.equal(displacement(v * t - REACH * W - 0.01, t, v, W), 0);
    }
  }
  assert.ok(Math.abs(displacement(10, 10 / VP, VP, W)) > 0.99, 'the rock does move while the pulse passes');
});

test('after the quake, the S pulse is always behind the P pulse', () => {
  for (let t = 0.1; t <= endTime(60, VS, W); t += 0.7) {
    assert.ok(peakAt(t, VS) < peakAt(t, VP), `t=${t.toFixed(1)}: S peak behind P peak`);
    assert.ok(frontKm(t, VS, W) < frontKm(t, VP, W), 'S front behind P front');
  }
  // Both start together at the quake, then S falls behind by (VP - VS) km every second.
  assert.equal(peakKm(0, VP), peakKm(0, VS));
  assert.ok(Math.abs(peakKm(10, VP) - peakKm(10, VS) - 25) < 1e-9);
  // The animation runs until the slow S pulse has crossed the 60 km strip.
  assert.ok(endTime(60, VS, W) >= 60 / VS);
});
