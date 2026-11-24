// Checks for the spectrum helpers used by the figure scripts (tools/figures/spectra.mjs):
// the FFT against a direct DFT, Welch peaks and power (Parseval), and the RMS helpers.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fft, welch, spectrogram, rms, windowedRms, median } from '../tools/figures/spectra.mjs';

test('fft matches a direct DFT', () => {
  const n = 16;
  const x = Array.from({ length: n }, (_, i) => Math.sin(i * 0.7) + 0.3 * Math.cos(i * 2.1) + (i % 3));
  const re = Float64Array.from(x);
  const im = new Float64Array(n);
  fft(re, im);
  for (let k = 0; k < n; k++) {
    let sr = 0;
    let si = 0;
    for (let t = 0; t < n; t++) {
      sr += x[t] * Math.cos((-2 * Math.PI * k * t) / n);
      si += x[t] * Math.sin((-2 * Math.PI * k * t) / n);
    }
    assert.ok(Math.abs(re[k] - sr) < 1e-9 && Math.abs(im[k] - si) < 1e-9, `bin ${k}`);
  }
  assert.throws(() => fft(new Float64Array(12), new Float64Array(12)));
});

test('welch finds a 0.2 Hz hum and keeps its power', () => {
  const sr = 100;
  const a = 500;
  const data = Float32Array.from({ length: sr * 600 }, (_, i) => a * Math.sin(2 * Math.PI * 0.2 * (i / sr)));
  const { freqs, psd, segments } = welch(data, sr, 4096);
  assert.ok(segments > 10);
  let k = 1;
  for (let j = 1; j < psd.length; j++) if (psd[j] > psd[k]) k = j;
  assert.ok(Math.abs(freqs[k] - 0.2) <= sr / 4096, `peak at ${freqs[k]} Hz`);
  // total power = mean square of a sine = a^2 / 2
  const df = freqs[1] - freqs[0];
  const total = psd.reduce((s, p) => s + p * df, 0);
  assert.ok(Math.abs(total / (a * a / 2) - 1) < 0.02, `power ${total}`);
});

test('welch and spectrogram skip segments with missing samples', () => {
  const data = new Float32Array(4096).fill(1);
  data[100] = NaN;
  assert.equal(welch(data, 100, 1024).segments, 6); // 7 windows at 50% overlap; only the first holds sample 100
  const sg = spectrogram(data, 100, 1024, 1024);
  assert.equal(sg.columns.length, 4);
  assert.equal(sg.columns[0], null);
  assert.ok(sg.columns[1] instanceof Float64Array);
  assert.equal(sg.times[0], 5.12);
});

test('rms, windowed rms and median', () => {
  assert.equal(rms([3, -3, 3, -3]), 3);
  assert.ok(Number.isNaN(rms([1, NaN, NaN, NaN])));
  const w = windowedRms([1, 3, 1, 3, 5, 5, 5, 5], 1, 4); // mean removed per window
  assert.deepEqual(Array.from(w), [1, 0]);
  assert.equal(median([3, NaN, 1, 2]), 2);
  assert.equal(median([4, 1, 3, 2]), 2.5);
});
