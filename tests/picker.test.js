import { test } from 'node:test';
import assert from 'node:assert/strict';
import { aicPick, searchWindow } from '../docs/app/js/lib/picker.js';
import { mulberry32 } from '../docs/app/js/lib/wave-sim.js';

/** Noise, then a louder wave train starting at onsetSec (100 samples/s). */
function synthetic(onsetSec, { seconds = 30, noise = 1, signal = 20, seed = 3 } = {}) {
  const r = mulberry32(seed);
  const sr = 100;
  const y = new Float32Array(seconds * sr);
  for (let i = 0; i < y.length; i++) {
    const t = i / sr;
    y[i] = noise * (r() - 0.5) * 2 + (t >= onsetSec ? signal * Math.sin(2 * Math.PI * 5 * (t - onsetSec)) * Math.exp(-(t - onsetSec) / 4) : 0);
  }
  return y;
}

test('AIC finds the onset to within a few samples', () => {
  const y = synthetic(12.34);
  const p = aicPick(y, 100, -5, 4, 20); // data start 5 s before origin
  assert.ok(Math.abs(p.tSec - (12.34 - 5)) < 0.05, `got ${p.tSec}`);
  assert.ok(p.snr > 5);
});

test('weak arrival gives a low SNR; gaps and short windows give null', () => {
  const p = aicPick(synthetic(15, { signal: 0.6 }), 100, 0, 5, 25);
  assert.ok(p.snr < 2, `snr ${p.snr}`);
  const y = synthetic(10);
  y[1200] = NaN;
  assert.equal(aicPick(y, 100, 0, 5, 20), null);
  assert.equal(aicPick(synthetic(10), 100, 0, 5, 5.5), null);
});

test('search windows bracket P and S at regional distances', () => {
  for (const d of [30, 100, 250]) {
    const [p0, p1] = searchWindow('P', d);
    assert.ok(p0 < d / 8 && p1 > d / 6.2);
    const [s0, s1] = searchWindow('S', d, d / 6.1);
    assert.ok(s0 > d / 6.1 && s0 < d / 3.6 && s1 > d / 3.3);
  }
});
