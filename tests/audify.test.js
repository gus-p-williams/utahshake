// Seismogram -> sound samples (the pure part of Quake Explorer's "Listen").
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  audioSamples, allowedSpeedUps, audibleRange, resampleLinear,
} from '../docs/app/js/lib/audify.js';

test('allowed speed-ups keep the sound rate between 3000 and 768000 per second', () => {
  assert.deepEqual(allowedSpeedUps(100), { min: 30, max: 7680 });
  assert.deepEqual(allowedSpeedUps(20), { min: 150, max: 38400 });
});

test('a speed-up browsers cannot play gives a friendly error', () => {
  const x = new Float32Array(1000).fill(1);
  assert.throws(() => audioSamples(x, 100, 10), /from 30x to 7680x/);
  assert.throws(() => audioSamples(x, 100, 10000), /can't be played/);
  assert.throws(() => audioSamples(x, 100, 0), /can't be played/);
  assert.doesNotThrow(() => audioSamples(x, 100, 30));
});

test('audioSamples: demeaned, peak-normalised, NaN silent, faded, right length', () => {
  const sr = 100;
  const n = 9000; // 90 s
  const x = Float32Array.from({ length: n }, (_, i) => 1e6 + 5000 * Math.sin(2 * Math.PI * 2 * (i / sr)));
  x[4000] = NaN;
  const { samples, playbackRate, durationSec } = audioSamples(x, sr, 100);
  assert.equal(playbackRate, 10000);
  assert.equal(durationSec, 0.9); // 90 s of ground motion in 0.9 s of sound
  assert.equal(samples.length, n);
  const peak = samples.reduce((m, v) => Math.max(m, Math.abs(v)), 0);
  assert.ok(Math.abs(peak - 0.9) < 1e-6, `peak ${peak}`);
  assert.ok(samples[4000] === 0); // the gap is silence, not a click (=== also accepts -0)
  assert.ok(samples[0] === 0); // faded in ...
  assert.ok(samples[n - 1] === 0); // ... and out
  const nFade = Math.round(0.02 * playbackRate); // 200 samples
  assert.ok(Math.abs(samples[nFade + 12]) > 0.8 * 0.9); // full volume after the fade (a crest of the 2 Hz wave)
  const mean = samples.reduce((s, v) => s + v, 0) / n;
  assert.ok(Math.abs(mean) < 0.01, 'offset removed');
});

test('silence stays silence (no divide by zero)', () => {
  const { samples } = audioSamples(new Float32Array(500).fill(3), 100, 100);
  assert.ok(samples.every((v) => v === 0));
});

test('audibleRange: at 400x the 50 Hz Nyquist lands at 20 kHz', () => {
  const r = audibleRange(100, 400);
  assert.equal(r.playbackRate, 40000);
  assert.equal(r.nyquistHz, 50);
  assert.equal(r.nyquistHeardHz, 20000);
  assert.equal(r.oneHzHeardAs, 400);
  assert.equal(r.groundLowHz, 0.05);
  assert.equal(r.groundHighHz, 50);
  assert.equal(audibleRange(100, 100).groundHighHz, 50); // limited by Nyquist, not hearing
  assert.equal(audibleRange(100, 2000).groundHighHz, 10); // limited by hearing
});

test('resampleLinear keeps the duration and the tune', () => {
  const from = 96000;
  const to = 48000;
  const x = Float32Array.from({ length: 9600 }, (_, i) => Math.sin(2 * Math.PI * 440 * (i / from)));
  const y = resampleLinear(x, from, to);
  assert.equal(y.length, 4800);
  for (const j of [0, 100, 1234, 4799]) {
    assert.ok(Math.abs(y[j] - Math.sin(2 * Math.PI * 440 * (j / to))) < 1e-3, `j=${j}`);
  }
  const up = resampleLinear(Float32Array.from([0, 1]), 10, 40);
  assert.deepEqual([...up].map((v) => +v.toFixed(3)), [0, 0.25, 0.5, 0.75, 1, 1, 1, 1]);
  assert.equal(resampleLinear([], 10, 20).length, 0);
});
