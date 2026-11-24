import { test } from 'node:test';
import assert from 'node:assert/strict';
import { sensitivityInfo, velocitySensitivity, toVelocity, formatVelocity } from '../docs/app/js/lib/units.js';

test('velocity channels divide by the sensitivity', () => {
  const ch = { sensitivity: 4.81e8, sensitivityFreq: 1, units: 'M/S' };
  const v = toVelocity(Float32Array.from([4.81e8, -9.62e2, NaN]), ch);
  assert.equal(v.approx, false);
  assert.ok(Math.abs(v.data[0] - 1) < 1e-6);
  assert.ok(Math.abs(v.data[1] + 2e-6) < 1e-12);
  assert.ok(Number.isNaN(v.data[2]));
});

test('displacement sensitivity becomes velocity sensitivity / (2πf), flagged approximate', () => {
  const ch = { sensitivity: 5.54e9, sensitivityFreq: 5, units: 'm' };
  assert.equal(sensitivityInfo(ch).kind, 'displacement');
  const v = velocitySensitivity(ch);
  assert.equal(v.approx, true);
  assert.ok(Math.abs(v.countsPerMps - 5.54e9 / (2 * Math.PI * 5)) < 1);
});

test('accelerometers and missing metadata give no velocity', () => {
  assert.equal(velocitySensitivity({ sensitivity: 4e5, sensitivityFreq: 1, units: 'M/S**2' }), null);
  assert.equal(sensitivityInfo({ units: 'M/S**2', sensitivity: 4e5 }).kind, 'acceleration');
  assert.equal(toVelocity([1, 2], { loc: '01', cha: 'EHZ' }), null);
  assert.equal(velocitySensitivity({ units: 'M/S', sensitivity: 0 }), null);
});

test('formatVelocity picks a readable unit', () => {
  assert.equal(formatVelocity(3.2e-6), '3.2 µm/s');
  assert.equal(formatVelocity(-4.56e-9), '-4.6 nm/s');
  assert.equal(formatVelocity(0.012), '12 mm/s');
  assert.equal(formatVelocity(2e-12), '0.002 nm/s');
});
