// Spectra and spectrograms on synthetic signals with known answers.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  nextPow2, hann, fft, toDb, amplitudeSpectrum, stft, dbRange, suggestStft, STFT_PRESETS,
} from '../docs/app/js/lib/spectral.js';

const sine = (n, sr, f, amp = 1, phase = 0) =>
  Float64Array.from({ length: n }, (_, i) => amp * Math.sin(2 * Math.PI * f * (i / sr) + phase));

// Repeatable pseudo-random numbers (so a failure can be reproduced).
function rng(seed = 1) {
  let s = seed >>> 0;
  return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 2 ** 32 - 0.5; };
}

/** The slow, obvious DFT: the sum written out, n*n steps. */
function naiveDft(x) {
  const n = x.length;
  const re = new Float64Array(n);
  const im = new Float64Array(n);
  for (let k = 0; k < n; k++) {
    for (let t = 0; t < n; t++) {
      const a = (-2 * Math.PI * k * t) / n;
      re[k] += x[t] * Math.cos(a);
      im[k] += x[t] * Math.sin(a);
    }
  }
  return { re, im };
}

const argmax = (a) => a.reduce((best, v, i) => (v > a[best] ? i : best), 0);

test('nextPow2 and hann', () => {
  assert.deepEqual([1, 2, 3, 255, 256, 257].map(nextPow2), [1, 2, 4, 256, 256, 512]);
  const w = hann(5);
  assert.deepEqual([...w].map((v) => +v.toFixed(6)), [0, 0.5, 1, 0.5, 0]);
  assert.deepEqual([...hann(1)], [1]);
});

test('fft matches the slow DFT on random data, and keeps energy (Parseval)', () => {
  const r = rng(42);
  for (const n of [1, 2, 8, 64, 256]) {
    const x = Float64Array.from({ length: n }, r);
    const re = Float64Array.from(x);
    const im = new Float64Array(n);
    fft(re, im);
    const slow = naiveDft(x);
    for (let k = 0; k < n; k++) {
      assert.ok(Math.abs(re[k] - slow.re[k]) < 1e-9 && Math.abs(im[k] - slow.im[k]) < 1e-9, `n=${n} k=${k}`);
    }
    // Parseval: sum |x|^2 = (1/n) * sum |X|^2
    const eTime = x.reduce((s, v) => s + v * v, 0);
    const eFreq = re.reduce((s, v, k) => s + v * v + im[k] * im[k], 0) / n;
    assert.ok(Math.abs(eTime - eFreq) < 1e-9 * Math.max(1, eTime));
  }
});

test('fft refuses lengths that are not a power of 2', () => {
  assert.throws(() => fft(new Float64Array(6), new Float64Array(6)), /power of 2/);
  assert.throws(() => fft(new Float64Array(8), new Float64Array(4)), /same length/);
});

test('toDb: 10x the power is +10 dB', () => {
  assert.ok(Math.abs(toDb(1) - 0) < 1e-9);
  assert.ok(Math.abs(toDb(1000) - 30) < 1e-9);
  assert.ok(Number.isFinite(toDb(0)));
});

test('a 5 Hz sine peaks at 5 Hz with about its own amplitude', () => {
  const sr = 100;
  const { freqs, amp, df } = amplitudeSpectrum(sine(2000, sr, 5, 3), sr);
  const k = argmax(amp);
  assert.ok(Math.abs(freqs[k] - 5) <= df, `peak at ${freqs[k]} Hz`);
  assert.ok(amp[k] > 3 * 0.8 && amp[k] < 3 * 1.05, `peak amplitude ${amp[k]}`);
  assert.equal(freqs[freqs.length - 1], sr / 2); // up to Nyquist
  // two sines: both peaks show, the bigger one is bigger
  const two = sine(4096, sr, 2, 1).map((v, i) => v + 0.5 * Math.sin(2 * Math.PI * 12 * (i / sr)));
  const s2 = amplitudeSpectrum(two, sr);
  const at = (f) => s2.amp[Math.round(f / s2.df)];
  assert.ok(at(2) > 0.85 && at(12) > 0.4 && at(12) < 0.55 && at(7) < 0.01);
});

test('amplitudeSpectrum: a few missing samples are fine, a lot is refused', () => {
  const sr = 100;
  const x = sine(2000, sr, 5, 1).map((v) => v + 1000); // with an offset
  for (let i = 500; i < 560; i++) x[i] = NaN; // 3% missing
  const { freqs, amp, gapFraction } = amplitudeSpectrum(x, sr);
  assert.ok(Math.abs(gapFraction - 0.03) < 1e-9);
  assert.ok(Math.abs(freqs[argmax(amp)] - 5) < 0.1);
  for (let i = 0; i < 300; i++) x[i] = NaN; // now 18% missing
  assert.throws(() => amplitudeSpectrum(x, sr), /missing/);
});

test('stft shows a switch from 2 Hz to 10 Hz at the right time', () => {
  const sr = 100;
  const n = 6000; // 60 s: 2 Hz for 30 s, then 10 Hz
  const x = Float64Array.from({ length: n }, (_, i) => Math.sin(2 * Math.PI * (i < 3000 ? 2 : 10) * (i / sr)));
  const s = stft(x, sr); // defaults: 2.56 s windows, 75% overlap
  assert.equal(s.nwin, 256);
  assert.equal(s.hop, 64);
  assert.equal(s.nT, Math.floor((n - 256) / 64) + 1);
  assert.equal(s.power.length, s.nT * s.nF);
  assert.ok(Math.abs(s.times[0] - 255 / 2 / sr) < 1e-9); // centre of the first window
  let switchedAt = null;
  for (let t = 0; t < s.nT; t++) {
    const row = s.power.subarray(t * s.nF, (t + 1) * s.nF);
    const f = s.freqs[argmax(row)];
    if (s.times[t] < 28) assert.ok(Math.abs(f - 2) <= s.df, `t=${s.times[t]}: ${f} Hz`);
    if (s.times[t] > 32) assert.ok(Math.abs(f - 10) <= s.df, `t=${s.times[t]}: ${f} Hz`);
    if (switchedAt == null && Math.abs(f - 10) <= s.df) switchedAt = s.times[t];
  }
  assert.ok(Math.abs(switchedAt - 30) < 1.5, `switch seen at ${switchedAt} s`);
  assert.ok(s.dbMax > s.dbMin);
});

test('stft power is per Hz: white noise reads 2*variance/sampleRate', () => {
  const sr = 50;
  const r = rng(7);
  const x = Float64Array.from({ length: 50000 }, () => r() * Math.sqrt(12)); // variance 1
  const s = stft(x, sr, { nfft: 128, overlap: 0.5 });
  let sum = 0;
  let count = 0;
  for (let t = 0; t < s.nT; t++) {
    for (let f = 5; f < s.nF - 5; f++) { sum += 10 ** (s.power[t * s.nF + f] / 10); count++; }
  }
  const expected = 2 / sr;
  assert.ok(Math.abs(sum / count / expected - 1) < 0.05, `mean PSD ${sum / count} vs ${expected}`);
});

test('stft: gappy windows are NaN, fMin/fMax trim the band', () => {
  const sr = 100;
  const x = Float32Array.from(sine(3000, sr, 5));
  x[1500] = NaN;
  const s = stft(x, sr, { fMin: 1, fMax: 20 });
  assert.ok(Math.abs(s.freqs[0] - 1) < s.df && s.freqs[0] >= 1);
  assert.ok(s.freqs[s.nF - 1] <= 20 && s.freqs[s.nF - 1] > 20 - s.df);
  for (let t = 0; t < s.nT; t++) {
    const start = t * s.hop;
    const gappy = start <= 1500 && 1500 < start + s.nwin;
    const v = s.power[t * s.nF];
    assert.equal(Number.isNaN(v), gappy, `column ${t}`);
  }
  assert.ok(Number.isFinite(s.dbMin) && Number.isFinite(s.dbMax));
  // too short for one window: an empty picture, not an error
  const empty = stft(new Float32Array(100), sr);
  assert.equal(empty.nT, 0);
  assert.ok(Number.isNaN(empty.dbMax));
});

test('stft window from windowSec, zero-padded to a power of 2', () => {
  const s = stft(new Float64Array(2000).map((_, i) => Math.sin(i)), 20, { windowSec: 5 });
  assert.equal(s.nwin, 100);
  assert.equal(s.nfft, 128);
  assert.equal(s.hop, 25);
});

test('presets and dbRange', () => {
  assert.deepEqual(suggestStft(100, 90), { ...STFT_PRESETS.local });
  assert.equal(suggestStft(20, 3600).windowSec, 51.2);
  assert.equal(suggestStft(40, 60).fMax, 20); // never above Nyquist
  const r = dbRange(Float32Array.from([NaN, -200, -50, -40, -30, -20, -10, 0]));
  assert.equal(r.hi, 0);
  assert.equal(r.lo, -80); // -200 is an outlier: capped at 80 dB below the top
  assert.deepEqual(dbRange([NaN]), { lo: NaN, hi: NaN });
});
