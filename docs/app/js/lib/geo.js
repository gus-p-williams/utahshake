// Distances and directions on the Earth (spherical model).
// Pure functions: no browser APIs, so they run in node tests too.

export const EARTH_RADIUS_KM = 6371.0;
const RAD = Math.PI / 180;

/** Great-circle distance in km between two points (haversine formula). */
export function distanceKm(lat1, lon1, lat2, lon2) {
  const dLat = (lat2 - lat1) * RAD;
  const dLon = (lon2 - lon1) * RAD;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * RAD) * Math.cos(lat2 * RAD) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.min(1, Math.sqrt(a)));
}

/** Direction from point 1 to point 2, degrees clockwise from north (0–360). */
export function azimuthDeg(lat1, lon1, lat2, lon2) {
  const p1 = lat1 * RAD;
  const p2 = lat2 * RAD;
  const dLon = (lon2 - lon1) * RAD;
  const y = Math.sin(dLon) * Math.cos(p2);
  const x = Math.cos(p1) * Math.sin(p2) - Math.sin(p1) * Math.cos(p2) * Math.cos(dLon);
  return (Math.atan2(y, x) / RAD + 360) % 360;
}

/** Point reached by going distKm from (lat, lon) in direction azDeg. */
export function destination(lat, lon, azDeg, distKm) {
  const d = distKm / EARTH_RADIUS_KM;
  const az = azDeg * RAD;
  const p1 = lat * RAD;
  const p2 = Math.asin(Math.sin(p1) * Math.cos(d) + Math.cos(p1) * Math.sin(d) * Math.cos(az));
  const l2 = lon * RAD + Math.atan2(Math.sin(az) * Math.sin(d) * Math.cos(p1),
    Math.cos(d) - Math.sin(p1) * Math.sin(p2));
  return { lat: p2 / RAD, lon: ((l2 / RAD + 540) % 360) - 180 };
}

/**
 * Flat x/y map (km) centred on (lat0, lon0). Good to well under 1% within a few
 * hundred km, which is all a regional grid search needs.
 */
export function localProjection(lat0, lon0) {
  const kx = EARTH_RADIUS_KM * RAD * Math.cos(lat0 * RAD); // km per degree of longitude
  const ky = EARTH_RADIUS_KM * RAD;                        // km per degree of latitude
  return {
    toXY: (lat, lon) => ({ x: (lon - lon0) * kx, y: (lat - lat0) * ky }),
    toLatLon: (x, y) => ({ lat: lat0 + y / ky, lon: lon0 + x / kx }),
  };
}

/** Mean position of a list of {lat, lon} points (fine for a regional cluster). */
export function centroid(points) {
  if (!points.length) throw new Error('centroid of no points');
  let lat = 0;
  let lon = 0;
  for (const p of points) { lat += p.lat; lon += p.lon; }
  return { lat: lat / points.length, lon: lon / points.length };
}
