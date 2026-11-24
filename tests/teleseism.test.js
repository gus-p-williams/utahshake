import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  distanceDeg, bodyWaveTimes, surfaceWaveWindow, inPShadow, recordMinutes,
} from '../docs/app/js/lib/teleseism.js';

const table = JSON.parse(fs.readFileSync(new URL('../docs/app/data/traveltimes-iasp91.json', import.meta.url), 'utf8'));
const near = (a, b, tol, msg) => assert.ok(Math.abs(a - b) <= tol, `${msg ?? ''} ${a} vs ${b}`);

test('a quarter of the way round the Earth is 90 degrees', () => {
  near(distanceDeg(0, 0, 0, 90), 90, 1e-9);
  near(distanceDeg(0, 0, 90, 0), 90, 1e-9);
});

test('table rows and columns are complete and times grow with distance', () => {
  assert.equal(table.P.length, table.depthsKm.length);
  for (const rows of [table.P, table.S]) {
    for (const row of rows) {
      assert.equal(row.length, table.distDeg.length);
      for (let i = 2; i < row.length; i++) assert.ok(row[i] >= row[i - 1], `times rise at ${i}°`);
    }
  }
});

test('textbook values: P about 6 min at 30°, 13 min at 90°; S − P grows with distance', () => {
  const a = bodyWaveTimes(table, 30, 33);
  near(a.P, 365, 5, 'P 30°');
  const b = bodyWaveTimes(table, 90, 33);
  near(b.P, 780, 10, 'P 90°');
  assert.ok(b.S - b.P > a.S - a.P);
  // Interpolation sits between the table's neighbours.
  const c = bodyWaveTimes(table, 35.5, 20);
  const lo = bodyWaveTimes(table, 35, 10).P;
  const hi = bodyWaveTimes(table, 36, 33).P;
  assert.ok(c.P > Math.min(lo, hi) - 5 && c.P < Math.max(lo, hi) + 5);
});

test('the core shadow: beyond ~100° the first P is bent round or through the core', () => {
  assert.equal(bodyWaveTimes(table, 60, 33).Pphase, 'P');
  assert.ok(['Pdiff', 'PKP', 'PKIKP', 'PKiKP'].includes(bodyWaveTimes(table, 120, 33).Pphase));
  assert.ok(inPShadow(120) && !inPShadow(60));
});

test('Sand Point, Alaska (36°): P at about minute 7, surface waves around minutes 15–20', () => {
  // Observed at SGU on 2025-07-16 (planning/quake-explorer.md, section 3).
  const t = bodyWaveTimes(table, 35.7, 20);
  assert.ok(t.P > 6 * 60 && t.P < 8 * 60, `P ${t.P}`);
  const sw = surfaceWaveWindow(35.7);
  assert.ok(sw.peakSec > 15 * 60 && sw.peakSec < 20 * 60, `peak ${sw.peakSec}`);
  assert.ok(recordMinutes(35.7) >= 27 && recordMinutes(35.7) <= 30);
});
