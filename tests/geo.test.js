import { test } from 'node:test';
import assert from 'node:assert/strict';
import { distanceKm, azimuthDeg, destination, localProjection, centroid } from '../docs/app/js/lib/geo.js';

const close = (a, b, tol, msg) => assert.ok(Math.abs(a - b) <= tol, `${msg ?? ''} ${a} vs ${b}`);

test('one degree of latitude is about 111.2 km', () => {
  close(distanceKm(39, -112, 40, -112), 111.19, 0.01);
});

test('distance is symmetric and zero to itself', () => {
  close(distanceKm(39.7, -111.8, 38.9, -112.3), distanceKm(38.9, -112.3, 39.7, -111.8), 1e-9);
  assert.equal(distanceKm(39.7, -111.8, 39.7, -111.8), 0);
});

test('azimuth: due north, east, south, west', () => {
  close(azimuthDeg(39, -112, 40, -112), 0, 1e-9);
  close(azimuthDeg(39, -112, 39, -111), 90, 0.5);
  close(azimuthDeg(40, -112, 39, -112), 180, 1e-9);
  close(azimuthDeg(39, -111, 39, -112), 270, 0.5);
});

test('destination then distance/azimuth round trip', () => {
  for (const az of [0, 45, 133, 270, 359]) {
    const p = destination(39.2, -111.9, az, 87);
    close(distanceKm(39.2, -111.9, p.lat, p.lon), 87, 1e-6, `az ${az}`);
    const back = azimuthDeg(39.2, -111.9, p.lat, p.lon);
    close(Math.min(Math.abs(back - az), 360 - Math.abs(back - az)), 0, 1e-6, `az ${az}`);
  }
});

test('local projection round trip and scale', () => {
  const proj = localProjection(39, -112);
  const { x, y } = proj.toXY(39.5, -111.5);
  const back = proj.toLatLon(x, y);
  close(back.lat, 39.5, 1e-12);
  close(back.lon, -111.5, 1e-12);
  // flat distance agrees with the great circle to < 0.5% at 70 km
  close(Math.hypot(x, y), distanceKm(39, -112, 39.5, -111.5), 0.3);
});

test('centroid', () => {
  const c = centroid([{ lat: 38, lon: -112 }, { lat: 40, lon: -110 }]);
  assert.deepEqual(c, { lat: 39, lon: -111 });
  assert.throws(() => centroid([]));
});
