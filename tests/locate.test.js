import { test } from 'node:test';
import assert from 'node:assert/strict';
import { kmPerSecond, spToDistanceKm, hypoToEpiKm, misfitAt, locateGrid } from '../docs/app/js/lib/locate.js';
import { distanceKm, destination } from '../docs/app/js/lib/geo.js';

const close = (a, b, tol, msg) => assert.ok(Math.abs(a - b) <= tol, `${msg ?? ''} ${a} vs ${b}`);

test('Utah crust: about 8.4 km per second of S-minus-P', () => {
  close(kmPerSecond(6.0, 3.5), 8.4, 1e-12);
  close(spToDistanceKm(10, 6.0, 3.5), 84, 1e-9);
});

test('bad speeds are rejected', () => {
  assert.throws(() => kmPerSecond(3.5, 6.0));
  assert.throws(() => kmPerSecond(6, 0));
});

test('hypocentral to epicentral distance', () => {
  close(hypoToEpiKm(10, 6), 8, 1e-12);
  assert.equal(hypoToEpiKm(5, 8), 0); // station right above a deeper quake
});

// Synthetic quake: exact S-minus-P times at stations around it.
const quake = { lat: 39.05, lon: -111.95 };
const depthKm = 8;
const vp = 6.0;
const vs = 3.5;
function synthObs(spots) {
  return spots.map(([az, dist]) => {
    const s = destination(quake.lat, quake.lon, az, dist);
    const hypo = Math.hypot(distanceKm(quake.lat, quake.lon, s.lat, s.lon), depthKm);
    const sp = hypo / kmPerSecond(vp, vs);
    return { ...s, distKm: spToDistanceKm(sp, vp, vs) };
  });
}

test('misfit is zero at the true epicenter', () => {
  const obs = synthObs([[10, 40], [120, 70], [250, 55]]);
  close(misfitAt(quake.lat, quake.lon, obs, depthKm).rmsKm, 0, 1e-9);
});

test('grid search finds a synthetic quake from 4 stations around it', () => {
  const obs = synthObs([[20, 35], [110, 80], [200, 60], [300, 45]]);
  const r = locateGrid(obs, { depthKm });
  close(distanceKm(r.lat, r.lon, quake.lat, quake.lon), 0, 0.1, 'error km');
  close(r.rmsKm, 0, 0.1);
  assert.equal(r.unbounded, false);
  assert.ok(r.uncertaintyKm < 10, `uncertainty ${r.uncertaintyKm}`);
});

test('picks off by 0.2 s still land within a few km', () => {
  const obs = synthObs([[20, 35], [110, 80], [200, 60], [300, 45], [60, 120]]);
  const jitter = [0.2, -0.2, 0.15, -0.1, 0.2];
  obs.forEach((o, i) => { o.distKm += jitter[i] * kmPerSecond(vp, vs); });
  const r = locateGrid(obs, { depthKm });
  const err = distanceKm(r.lat, r.lon, quake.lat, quake.lon);
  assert.ok(err < 4, `error ${err} km`);
});

test('fewer than 3 stations is an error', () => {
  assert.throws(() => locateGrid(synthObs([[0, 30], [90, 40]])));
});

test('stations all on one side: warned as poorly constrained', () => {
  // three stations in a line east of the quake: mirror solutions fit too
  const obs = synthObs([[89, 40], [90, 80], [91, 120]]);
  const r = locateGrid(obs, { depthKm });
  assert.ok(r.unbounded || r.uncertaintyKm > 20, `uncertainty ${r.uncertaintyKm}`);
});
