// Phone Bench measuring logic (docs/app/js/lib/bench.js), on made-up data: the page must
// recover the rate, jitter, rounding step, noise and taps that the data were made with.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  quantile, timing, valueStep, stepReport, noise, repeats, flicker, detectTaps, tapThreshold, tapRule,
  audioRate, dbfs, makeRng, makeTake, makeAudioBlocks,
} from '../docs/app/js/lib/bench.js';

const near = (a, b, tol, msg) => assert.ok(Math.abs(a - b) <= tol, `${msg ?? ''} ${a} is not within ${tol} of ${b}`);

test('quantile interpolates between neighbors', () => {
  assert.equal(quantile([1, 2, 3, 4], 0), 1);
  assert.equal(quantile([1, 2, 3, 4], 1), 4);
  assert.equal(quantile([1, 2, 3, 4], 0.5), 2.5);
  assert.ok(Number.isNaN(quantile([], 0.5)));
});

test('timing: a perfect 60-per-second timer', () => {
  const times = Array.from({ length: 601 }, (_, i) => 1000 + (i * 1000) / 60);
  const r = timing(times);
  near(r.rate, 60, 1e-9, 'rate');
  near(r.seconds, 10, 1e-9, 'seconds');
  near(r.medianGap, 16.667, 0.001, 'median gap');
  near(r.jitter, 0, 1e-9, 'jitter');
  assert.equal(r.dropped, 0);
  assert.equal(r.missing, 0);
  assert.equal(r.nonPositive, 0);
  assert.equal(r.wholeMs, false);
  assert.equal(timing(times.map(Math.round)).wholeMs, true);
});

test('timing: jitter, dropped readings and repeated time stamps are measured', () => {
  const rng = makeRng(11);
  const times = [];
  for (let i = 0; i <= 3000; i++) {
    if (i % 100 === 50) continue; // one reading in 100 goes missing
    times.push(i * 20 + 0.5 * rng.normal()); // 50 per second, jitter 0.5 ms
  }
  const r = timing(times);
  near(r.rate, 50 * (times.length - 1) / 3000, 0.05, 'rate counts the readings that arrived');
  near(r.jitter, 0.5 * Math.SQRT2, 0.06, 'jitter (gap sd = √2 × time stamp sd)'); // gaps difference two wobbles
  assert.equal(r.dropped, 30);
  assert.equal(r.missing, 30);
  near(r.maxGap, 40, 3, 'longest gap');
  assert.ok(r.p01Gap > 17 && r.p99Gap < 23, `1st–99th percentile ${r.p01Gap}–${r.p99Gap}`);

  const twice = timing([0, 16, 16, 33, 50, 66]);
  assert.equal(twice.nonPositive, 1);
});

test('timing: too few readings gives no rate', () => {
  assert.ok(Number.isNaN(timing([0, 16]).rate));
  assert.equal(timing([]).n, 0);
});

test('valueStep: Chrome-style rounding to 0.1 m/s² is recognized, float crumbs included', () => {
  const rng = makeRng(5);
  const vals = Array.from({ length: 500 }, () => Math.round((9.81 + 0.08 * rng.normal()) / 0.1) * 0.1);
  assert.ok(vals.some((v) => String(v).length > 6), 'some values carry float crumbs like 9.800000000000001');
  const r = valueStep(vals);
  assert.ok(r.onTenthGrid);
  near(r.step, 0.1, 1e-9, 'step');
  assert.ok(r.distinct >= 3);
});

test('valueStep: unrounded readings are not on the grid; the step is their own resolution', () => {
  // A 16-bit ±8 g sensor reported in m/s²: steps of 9.81 × 16 / 65536 ≈ 0.0024 m/s².
  const q = (9.81 * 16) / 65536;
  const rng = makeRng(9);
  const vals = Array.from({ length: 500 }, () => Math.round((-9.81 + 0.012 * rng.normal()) / q) * q);
  const r = valueStep(vals);
  assert.equal(r.onTenthGrid, false);
  near(r.step, q, 1e-9, 'step');
});

test('valueStep: readings that vary smoothly have no fixed step, only a closest pair', () => {
  const rng = makeRng(4);
  const r = valueStep(Array.from({ length: 1000 }, () => -9.81 + 0.012 * rng.normal()));
  assert.equal(r.step, null);
  assert.ok(r.minSpacing > 0 && r.minSpacing < 1e-4, `closest pair ${r.minSpacing}`);
  assert.equal(r.onTenthGrid, false);
});

test('valueStep: readings that never change have no step but can still sit on the grid', () => {
  const r = valueStep(Array(100).fill(9.8));
  assert.equal(r.step, null);
  assert.equal(r.distinct, 1);
  assert.ok(r.onTenthGrid);
  assert.equal(valueStep(Array(100).fill(9.81)).onTenthGrid, false);
});

test('stepReport: combines the axes; needs ten readings to call a phone rounded', () => {
  const take = makeTake({ phone: 'android', seconds: 5, taps: [{ t: 2000, peak: 0.5 }] });
  const r = stepReport(take);
  assert.ok(r.rounded);
  assert.ok(r.changed);
  near(r.step, 0.1, 1e-9, 'step');
  const few = stepReport([{ x: 0.1, y: 0.2, z: 9.8 }, { x: 0.1, y: 0.2, z: 9.9 }]);
  assert.equal(few.rounded, false);
  const still = stepReport(Array(50).fill({ x: 0.1, y: 0.2, z: 9.8 }));
  assert.equal(still.changed, false);
  assert.equal(still.step, null);
  assert.ok(still.rounded);
});

test('noise: mean and rms about the mean', () => {
  const r = noise([1, 3, 1, 3, NaN]);
  assert.equal(r.n, 4);
  assert.equal(r.mean, 2);
  assert.equal(r.rms, 1);
  assert.equal(r.min, 1);
  assert.equal(r.max, 3);
  const rng = makeRng(2);
  near(noise(Array.from({ length: 20000 }, () => 9.81 + 0.02 * rng.normal())).rms, 0.02, 0.0005, 'rms');
  assert.ok(Number.isNaN(noise([]).mean));
});

test('flicker: share of readings off the most common value', () => {
  assert.equal(flicker([9.8, 9.8, 9.8, 9.8]), 0);
  assert.equal(flicker([9.8, 9.9, 9.8, 9.8000000000001]), 0.25);
  assert.ok(Number.isNaN(flicker([])));
  // The made-up Android phone: y rests at 0.16, near the 0.15 edge, so it flickers; x and z don't.
  const rest = makeTake({ phone: 'android', seconds: 20 });
  const f = { x: flicker(rest.map((r) => r.x)), y: flicker(rest.map((r) => r.y)), z: flicker(rest.map((r) => r.z)) };
  assert.equal(f.x, 0);
  assert.equal(f.z, 0);
  assert.ok(f.y > 0.03 && f.y < 0.3, `y flickers ${f.y}`);
});

test('repeats: consecutive readings identical on all three axes', () => {
  const a = { x: 0, y: 0, z: 9.8 };
  assert.equal(repeats([a, { ...a }, { ...a, z: 9.9 }, { ...a, z: 9.9 }, a]), 2);
  assert.equal(repeats([]), 0);
});

test('tapThreshold: six times the resting noise, never below half a 0.1 step', () => {
  assert.equal(tapThreshold(0), 0.05);
  assert.equal(tapThreshold(NaN), 0.05);
  near(tapThreshold(0.02), 0.12, 1e-12);
});

test('detectTaps: finds each tap, its time and its size', () => {
  const taps = [{ t: 2000, peak: 0.8 }, { t: 3500, peak: 0.4 }, { t: 5000, peak: 0.25 }];
  for (const phone of ['android', 'iphone']) {
    const take = makeTake({ phone, seconds: 7, taps });
    const rest = take.filter((r) => r.t < 1800);
    const n = { x: noise(rest.map((r) => r.x)), y: noise(rest.map((r) => r.y)), z: noise(rest.map((r) => r.z)) };
    const rms3 = Math.hypot(n.x.rms, n.y.rms, n.z.rms);
    const found = detectTaps(take, { x: n.x.mean, y: n.y.mean, z: n.z.mean }, { threshold: tapThreshold(rms3) });
    assert.equal(found.length, 3, `${phone}: ${JSON.stringify(found)}`);
    found.forEach((f, i) => {
      near(f.t, taps[i].t, 40, `${phone} tap ${i} time`);
      // Peak of the burst plus a little sideways motion; rounding moves it by up to a step.
      near(f.peak, taps[i].peak * 1.04, 0.12, `${phone} tap ${i} size`);
    });
  }
});

test('detectTaps: on a rounded phone, a burst too small to cross a step is not seen', () => {
  // Resting z = 9.80 sits 0.05 below the boundary to 9.9: a 0.03 m/s² burst never reaches it.
  const take = makeTake({ phone: 'android', seconds: 4, gravity: [0.1, 0.2, 9.8], noise: 0.002,
    taps: [{ t: 2000, peak: 0.03 }] });
  assert.equal(detectTaps(take, { x: 0.1, y: 0.2, z: 9.8 }).length, 0);
  // Resting at 9.845, just under the boundary, the same burst flips a whole step.
  const edge = makeTake({ phone: 'android', seconds: 4, gravity: [0.1, 0.2, 9.845], noise: 0.0005,
    taps: [{ t: 2000, peak: 0.03 }] });
  const seen = detectTaps(edge, { x: 0.1, y: 0.2, z: 9.8 });
  assert.equal(seen.length, 1);
  near(seen[0].peak, 0.1, 1e-9, 'a full step');
});

test('tapRule: a rounding phone whose axes flicker between two steps at rest still sees every tap', () => {
  const taps = [{ t: 2000, peak: 0.8 }, { t: 3500, peak: 0.4 }, { t: 5000, peak: 0.25 }, { t: 6500, peak: 0.2 }, { t: 8000, peak: 0.3 }];
  // Resting values right on rounding boundaries (0.15, 0.25, 9.85): noise flips them a step.
  for (const gravity of [[0.15, 0.2, 9.81], [0.15, 0.25, 9.85]]) {
    const take = makeTake({ phone: 'android', seconds: 9.5, gravity, noise: 0.01, taps });
    const rule = tapRule(take.filter((r) => r.t < 1800));
    assert.ok(rule.rounded && rule.range, 'a rounding phone gets the range rule');
    assert.equal(rule.threshold, 0.05);
    const old = tapThreshold(Math.hypot(rule.noise.x.rms, rule.noise.y.rms, rule.noise.z.rms));
    assert.ok(old > 0.2, `the noise rule would have needed ${old.toFixed(2)} m/s²`);
    const found = detectTaps(take, rule.mean, rule);
    assert.equal(found.length, 5, `gravity ${gravity}: ${JSON.stringify(found)}`);
    found.forEach((f, i) => near(f.peak, taps[i].peak * 1.04, 0.15, `tap ${i} size, from the resting mean`));
  }
  // A phone that doesn't round keeps the noise rule.
  const iphone = makeTake({ phone: 'iphone', seconds: 3 });
  const rule = tapRule(iphone);
  assert.equal(rule.rounded, false);
  assert.equal(rule.range, null);
  near(rule.threshold, 6 * 0.012 * Math.sqrt(3), 0.02, 'threshold');
});

test('makeTake: the made-up phones behave as described, and the analysis recovers them', () => {
  const a = makeTake({ phone: 'android', seconds: 30 });
  const ta = timing(a.map((r) => r.t));
  near(ta.rate, 60 * (1 - 1 / 400), 0.1, 'android rate');
  assert.ok(ta.jitter > 0.3 && ta.jitter < 0.7, `android jitter ${ta.jitter}`);
  assert.equal(ta.dropped, 4);
  assert.ok(stepReport(a).rounded);
  near(noise(a.map((r) => r.z)).mean, 9.8, 0.06, 'android z face up');

  const i = makeTake({ phone: 'iphone', seconds: 30 });
  assert.equal(stepReport(i).rounded, false);
  assert.equal(stepReport(i).step, null);
  assert.ok(stepReport(i).changed);
  near(noise(i.map((r) => r.z)).mean, -9.81, 0.01, 'iphone z face up has the opposite sign');
  near(noise(i.map((r) => r.z)).rms, 0.012, 0.002, 'iphone noise');
  assert.ok(i.every((r) => Number.isInteger(r.t)), 'iphone time stamps in whole ms');

  // Same seed, same take.
  assert.deepEqual(makeTake({ seconds: 2 }), makeTake({ seconds: 2 }));
});

test('audioRate and dbfs: the measured microphone rate and levels', () => {
  for (const rate of [44100, 48000]) {
    const blocks = makeAudioBlocks({ rate, seconds: 5 });
    near(audioRate(blocks), rate, rate * 0.002, `rate ${rate}`);
  }
  assert.ok(Number.isNaN(audioRate([{ t: 0, frames: 128 }])));
  assert.equal(dbfs(1), 0);
  near(dbfs(0.5), -6.02, 0.01);
  assert.equal(dbfs(0), -Infinity);
  const blocks = makeAudioBlocks({ clapAt: 2, clapPeak: 0.6 });
  assert.equal(Math.max(...blocks.map((b) => b.peak)), 0.6);
});
