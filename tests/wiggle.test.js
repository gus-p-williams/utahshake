// "Build a wiggle": sums of sine waves, their spectrum (the app's own FFT), noise and fading.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  RECORD, wiggleAt, sampleWiggle, randomNumbers, noiseWaves, inBand, utahQ, fadeAfter,
} from '../docs/app/js/lib/wiggle.js';
import { amplitudeSpectrum } from '../docs/app/js/lib/spectral.js';

const spectrum = (waves) => amplitudeSpectrum(sampleWiggle(waves), RECORD.sampleRate, { taper: 'none' });
const near = (a, b, tol) => Math.abs(a - b) <= tol;

test('a wiggle is the sum of its waves', () => {
  const waves = [{ freq: 2, size: 0.8 }, { freq: 6.5, size: 0.3, phase: 1 }];
  for (const t of [0, 0.1, 0.37, 2.5]) {
    const sum = 0.8 * Math.sin(2 * Math.PI * 2 * t) + 0.3 * Math.sin(2 * Math.PI * 6.5 * t + 1);
    assert.ok(near(wiggleAt(t, waves), sum, 1e-12));
  }
  assert.equal(wiggleAt(1.3, []), 0);
  const y = sampleWiggle(waves, 10, 100);
  assert.equal(y.length, 10);
  assert.ok(near(y[3], wiggleAt(0.03, waves), 1e-12));
});

test('the record has frequency steps of 0.0625 Hz, so every 0.5 Hz slider step is a whole bin', () => {
  assert.equal(RECORD.sampleRate / RECORD.n, 0.0625);
  assert.equal(RECORD.n & (RECORD.n - 1), 0, 'a power of 2: no zero padding in the FFT');
});

test('the FFT finds each wave as one bar, exactly as tall as its size', () => {
  const waves = [{ freq: 2, size: 0.8 }, { freq: 8, size: 0.3 }, { freq: 14.5, size: 0.55 }];
  const sp = spectrum(waves);
  for (const w of waves) {
    const k = w.freq / sp.df;
    assert.ok(Number.isInteger(k));
    assert.ok(near(sp.amp[k], w.size, 1e-9), `${w.freq} Hz: ${sp.amp[k]}`);
  }
  // everywhere else (almost) nothing
  const others = [...sp.amp].filter((_, k) => !waves.some((w) => w.freq / sp.df === k));
  assert.ok(Math.max(...others) < 1e-9);
});

test('two waves at the same frequency make one bar: their sizes add (same phase)', () => {
  const sp = spectrum([{ freq: 5, size: 0.4 }, { freq: 5, size: 0.35 }]);
  assert.ok(near(sp.amp[5 / sp.df], 0.75, 1e-9));
});

test('beats: two close notes make a wiggle that grows and shrinks, but the spectrum has two steady bars', () => {
  const waves = [{ freq: 5, size: 0.5 }, { freq: 5.5, size: 0.5 }];
  // the notes cancel every 1 / (5.5 - 5) = 2 s, at t = 1 s, 3 s, ...
  let quiet = 0;
  let loud = 0;
  for (let t = 0.9; t <= 1.1; t += 0.001) quiet = Math.max(quiet, Math.abs(wiggleAt(t, waves)));
  for (let t = 1.9; t <= 2.1; t += 0.001) loud = Math.max(loud, Math.abs(wiggleAt(t, waves)));
  assert.ok(quiet < 0.2 && loud > 0.95, `quiet ${quiet}, loud ${loud}`);
  const sp = spectrum(waves);
  assert.ok(near(sp.amp[5 / sp.df], 0.5, 1e-9) && near(sp.amp[5.5 / sp.df], 0.5, 1e-9));
});

test('noise: many tiny waves on the frequency grid, the same every time', () => {
  const a = noiseWaves();
  const b = noiseWaves();
  assert.deepEqual(a, b);
  assert.equal(a[0].freq, 0.5);
  assert.equal(a.at(-1).freq, 25);
  assert.equal(a.length, (25 - 0.5) / 0.0625 + 1);
  assert.ok(a.every((w) => w.size >= 0 && w.size <= 0.03 && Number.isInteger(w.freq / 0.0625)));
  assert.notDeepEqual(noiseWaves({ seed: 8 }), a);
  // tiny at each note, but together a ragged wiggle about the size of a small wave
  const y = sampleWiggle(a);
  const rms = Math.sqrt(y.reduce((s, v) => s + v * v, 0) / y.length);
  assert.ok(rms > 0.15 && rms < 0.35, `noise rms ${rms}`);
  const sp = spectrum(a);
  assert.ok(Math.max(...sp.amp) <= 0.03 + 1e-9);
  const r = randomNumbers(3);
  for (let i = 0; i < 100; i++) { const v = r(); assert.ok(v >= 0 && v < 1); }
});

test('a filter keeps the notes inside its band', () => {
  assert.equal(inBand(0.5, [1, 10]), false);
  assert.equal(inBand(1, [1, 10]), true);
  assert.equal(inBand(10, [1, 10]), true);
  assert.equal(inBand(14, [1, 10]), false);
  assert.equal(inBand(14, null), true);
});

test('fading: the worked example on the Frequencies page (30 s of travel through Utah crust)', () => {
  assert.equal(utahQ(1), 235);
  assert.ok(near(utahQ(5), 579, 1));
  // 1 Hz: 30 cycles, keeps 67%; 5 Hz: 150 cycles, keeps 44%
  assert.ok(near(fadeAfter(1, 30), 0.67, 0.005), String(fadeAfter(1, 30)));
  assert.ok(near(fadeAfter(5, 30), 0.44, 0.005), String(fadeAfter(5, 30)));
  // with one Q for every note, 10 times the cycles is 10 times the exponent
  assert.ok(near(Math.log(fadeAfter(10, 30, 300)), 10 * Math.log(fadeAfter(1, 30, 300)), 1e-12));
  // the higher note always fades more, even though its Q is higher
  for (const t of [5, 30, 60]) assert.ok(fadeAfter(14, t) < fadeAfter(6, t) && fadeAfter(6, t) < fadeAfter(2, t));
});
