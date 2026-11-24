// The helicorder (a day in lines) and the seismic carpet (months in a grid), on small
// made-up records with known answers.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { bridgeGaps, restoreGaps, helicorderRows, rowColumns, penOffset } from '../docs/app/js/lib/helicorder.js';
import { stepLevels, medianOf, carpetGrid, crossingHour } from '../docs/app/js/lib/carpet.js';

test('bridgeGaps draws a straight line across each gap and remembers where it was', () => {
  const { filled, gaps } = bridgeGaps([0, 2, NaN, NaN, NaN, 10, 10, NaN, 4]);
  assert.deepEqual(gaps, [[2, 5], [7, 8]]);
  assert.deepEqual(Array.from(filled), [0, 2, 4, 6, 8, 10, 10, 7, 4]);
  const back = restoreGaps(Float32Array.from(filled), gaps);
  assert.ok(Number.isNaN(back[2]) && Number.isNaN(back[4]) && Number.isNaN(back[7]));
  assert.equal(back[5], 10);
});

test('bridgeGaps holds the nearest value at the ends', () => {
  const { filled, gaps } = bridgeGaps([NaN, NaN, 5, 6, NaN]);
  assert.deepEqual(gaps, [[0, 2], [4, 5]]);
  assert.deepEqual(Array.from(filled), [5, 5, 5, 6, 6]);
  assert.deepEqual(Array.from(bridgeGaps([NaN, NaN]).filled), [0, 0]);
});

test('helicorderRows: a day in 30-minute lines', () => {
  const t0 = Date.UTC(2026, 9, 26, 6);
  const rows = helicorderRows(t0, t0 + 86400e3, 1800);
  assert.equal(rows.length, 48);
  assert.equal(rows[1].startMs - rows[0].startMs, 1800e3);
  assert.equal(rows.at(-1).endMs, t0 + 86400e3);
});

test('rowColumns: min and max per column, NaN outside the record', () => {
  // 1 sample per second, 20 s of data starting 5 s after the row starts
  const data = Float32Array.from({ length: 20 }, (_, i) => i);
  const row = { startMs: 0, endMs: 40e3 };
  const { min, max } = rowColumns(data, 1, 5e3, row, 8); // 5 s per column
  assert.ok(Number.isNaN(min[0]) && Number.isNaN(max[0]), 'before the record');
  assert.equal(min[1], 0);
  assert.equal(max[1], 4);
  assert.equal(min[4], 15);
  assert.equal(max[4], 19);
  assert.ok(Number.isNaN(min[5]) && Number.isNaN(min[7]), 'after the record');
});

test('penOffset clips big swings to a few lines', () => {
  assert.equal(penOffset(50, 100), 0.5);
  assert.equal(penOffset(-1e6, 100), -1.5);
  assert.equal(penOffset(1e6, 100, 2), 2);
});

test('stepLevels: RMS per minute, then the median per step', () => {
  const sr = 10;
  // 4 minutes: steady ±1, then ±3, then a loud minute ±100, then ±3
  const minute = (a) => Array.from({ length: 60 * sr }, (_, i) => (i % 2 ? a : -a));
  const data = Float32Array.from([...minute(1), ...minute(3), ...minute(100), ...minute(3)]);
  assert.deepEqual(Array.from(stepLevels(data, sr, 60, 1)), [1, 3, 100, 3]);
  // two steps of two minutes: the median of [1, 3] is 2, of [100, 3] is 51.5
  assert.deepEqual(Array.from(stepLevels(data, sr, 60, 2)), [2, 51.5]);
  // a step of four ignores the loud minute: median of 1, 3, 100, 3 = 3
  assert.deepEqual(Array.from(stepLevels(data, sr, 60, 4)), [3]);
});

test('stepLevels: windows that are mostly missing are NaN', () => {
  const data = new Float32Array(120).fill(1);
  for (let i = 0; i < 40; i++) data[i] = NaN; // 40 of the first 60 missing
  const lv = stepLevels(data, 1, 60, 1);
  assert.ok(Number.isNaN(lv[0]));
  assert.equal(lv[1], 0); // constant: RMS after removing the mean is 0
  assert.ok(Number.isNaN(medianOf([NaN])));
  assert.equal(medianOf([3, 1, NaN, 2]), 2);
});

test('carpetGrid puts each value in its day and time-of-day cell', () => {
  const startMs = Date.UTC(2026, 7, 24);
  const step = 900; // 15 minutes: 96 columns
  const pts = [
    { t: startMs, v: 1 },
    { t: startMs + 13 * 3600e3, v: 2 }, // day 0, 13:00 → column 52
    { t: startMs + 86400e3 + 900e3, v: 3 }, // day 1, column 1
    { t: startMs + 5 * 86400e3, v: 9 }, // outside 5 days
    { t: startMs - 900e3, v: 9 }, // before
  ];
  const g = carpetGrid(pts, { startMs, days: 5, stepSec: step });
  assert.equal(g.length, 5);
  assert.equal(g[0].length, 96);
  assert.equal(g[0][0], 1);
  assert.equal(g[0][52], 2);
  assert.equal(g[1][1], 3);
  assert.ok(Number.isNaN(g[4][95]));
});

test('crossingHour: when the morning rise passes a level', () => {
  // 1-hour steps; quiet 1 until 12:00, then 3, 5
  const row = Float64Array.from({ length: 24 }, (_, h) => (h < 12 ? 1 : h === 12 ? 3 : 5));
  // crosses 2 halfway between column 11 (time 11.5 h) and column 12 (12.5 h)
  assert.equal(crossingHour(row, 2, 3600), 12);
  assert.equal(crossingHour(row, 4, 3600), 13);
  assert.ok(Number.isNaN(crossingHour(row, 6, 3600)));
  // one hour later (a clock change seen in UTC)
  const later = Float64Array.from({ length: 24 }, (_, h) => (h < 13 ? 1 : h === 13 ? 3 : 5));
  assert.equal(crossingHour(later, 2, 3600) - crossingHour(row, 2, 3600), 1);
  // a missing hour before the rise is skipped
  const gap = Float64Array.from(row); gap[5] = NaN;
  assert.equal(crossingHour(gap, 2, 3600), 12);
});
