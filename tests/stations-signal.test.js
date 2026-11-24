import { test } from 'node:test';
import assert from 'node:assert/strict';
import { selectStations } from '../docs/app/js/lib/stations.js';
import { destination } from '../docs/app/js/lib/geo.js';
import {
  mergeSegments, contiguousRuns, demean, taper, minMaxColumns, peakAbs, niceStep, isFlat,
} from '../docs/app/js/lib/signal.js';

const ev = { lat: 39, lon: -112 };
const mk = (sta, az, dist, chans = ['HHZ', 'HHN', 'HHE']) => {
  const p = destination(ev.lat, ev.lon, az, dist);
  return { net: 'UU', sta, lat: p.lat, lon: p.lon, elevM: 1500,
    channels: chans.map((cha) => ({ loc: '01', cha, sampleRate: 100 })) };
};

test('school stand-ins first, helpers fill empty quadrants, then nearest', () => {
  const stations = [
    mk('SCH1', 10, 50), mk('SCH2', 30, 300), // second school too far
    mk('N1', 5, 20), mk('E1', 95, 60), mk('S1', 185, 80), mk('W1', 275, 120),
    mk('E2', 100, 30), mk('FAR', 200, 400), mk('ACC', 150, 10, ['ENZ', 'ENN', 'ENE']),
  ];
  const schools = [
    { name: 'School One', standIn: { net: 'UU', sta: 'SCH1' } },
    { name: 'School Two', standIn: { net: 'UU', sta: 'SCH2' } },
  ];
  const { stations: got, schoolsTooFar } = selectStations(ev, stations, schools,
    { maxStandInKm: 220, maxHelperKm: 150, maxStations: 5 });
  assert.deepEqual(schoolsTooFar, ['School Two']);
  assert.equal(got[0].sta, 'SCH1');
  assert.deepEqual(got[0].schools, ['School One']);
  const codes = got.map((s) => s.sta);
  // quadrants NE(covered by SCH1), SE, SW, NW each get their nearest helper
  for (const c of ['E2', 'S1', 'W1']) assert.ok(codes.includes(c), `${c} in ${codes}`);
  assert.ok(!codes.includes('FAR') && !codes.includes('ACC'));
  assert.equal(got.length, 5);
});

test('preferred stations (with analyst picks) win over nearer ones', () => {
  const stations = [mk('NEAR', 100, 20), mk('PICKED', 120, 70), mk('X', 10, 30)];
  const { stations: got } = selectStations(ev, stations, [],
    { maxStandInKm: 220, maxHelperKm: 150, maxStations: 2, prefer: new Set(['UU.PICKED']) });
  assert.ok(got.map((s) => s.sta).includes('PICKED'));
  assert.ok(!got.map((s) => s.sta).includes('NEAR'));
});

test('mergeSegments fills a gap with NaN and keeps timing', () => {
  const t = mergeSegments([
    { startMs: 1000, sampleRate: 10, data: [1, 2, 3] },
    { startMs: 1500, sampleRate: 10, data: [6, 7] },
  ]);
  assert.equal(t.startMs, 1000);
  assert.equal(t.data.length, 7);
  assert.deepEqual([...t.data].map((v) => (Number.isNaN(v) ? null : v)), [1, 2, 3, null, null, 6, 7]);
  assert.deepEqual(contiguousRuns(t.data), [[0, 3], [5, 7]]);
});

test('mergeSegments can cut to a window', () => {
  const t = mergeSegments([{ startMs: 0, sampleRate: 10, data: [0, 1, 2, 3, 4, 5] }], 200, 500);
  assert.deepEqual([...t.data], [2, 3, 4]);
});

test('demean, taper, peakAbs', () => {
  const a = demean(Float32Array.from([1, 2, 3, 4, 5]));
  assert.deepEqual([...a], [-2, -1, 0, 1, 2]);
  const b = taper(new Float32Array(100).fill(1), 0.1);
  assert.equal(b[0], 0);
  assert.equal(b[50], 1);
  assert.equal(peakAbs(Float32Array.from([1, -7, NaN, 3])), 7);
});

test('isFlat spots dead channels', () => {
  assert.equal(isFlat(Float32Array.from([0, 1, 0, 1, NaN, 1])), true);
  assert.equal(isFlat(new Float32Array(5).fill(NaN)), true);
  assert.equal(isFlat(Float32Array.from([120, -340, 55])), false);
});

test('minMaxColumns keeps the peaks', () => {
  const d = Float32Array.from([0, 5, -3, 1, 2, -9, 4, 0]);
  const { min, max } = minMaxColumns(d, 0, 8, 2);
  assert.deepEqual([...max], [5, 4]);
  assert.deepEqual([...min], [-3, -9]);
});

test('niceStep picks 1-2-5 steps', () => {
  assert.equal(niceStep(90, 9), 10);
  assert.equal(niceStep(20, 8), 2);
  assert.equal(niceStep(3, 8), 0.5);
});
