// Make the map figures for the theory pages (docs/theory/img/).
//
//   node tools/figures/science-maps.mjs
//
// schools-map.svg   "UHSN schools and their stand-in stations" (figure D1) on the
//                   "Our stations and data" page: Utah, then central Utah enlarged,
//                   with each school joined to its stand-in station.
//
// Schools and their stand-ins come from docs/app/js/config.js, the station
// coordinates from the offline sample (docs/app/data/samples/uu80162166/stations.json,
// University of Utah station metadata via EarthScope) and the distances from the
// app's own geo.js, so the figure matches what Quake Locator uses.
// Projection: equirectangular, x scaled by cos(39.5°) so Utah is not stretched.
// Output: plain SVG with a white background (readable in light and dark docs themes).
import fs from 'node:fs';

const { distanceKm, EARTH_RADIUS_KM } = await import('../../docs/app/js/lib/geo.js');
const { SCHOOLS } = await import('../../docs/app/js/config.js');

const outDir = new URL('../../docs/theory/img/', import.meta.url);
fs.mkdirSync(outDir, { recursive: true });
const sampleDir = new URL('../../docs/app/data/samples/uu80162166/', import.meta.url);
const stationList = JSON.parse(fs.readFileSync(new URL('stations.json', sampleDir)));

// House style (same constants as science-diagrams.mjs).
const C = { bg: '#ffffff', text: '#111827', muted: '#5b6472', border: '#d9dde3',
  map: '#f3efe4', outline: '#374151', station: '#374151', school: '#fbbf24',
  town: '#6b7280', faint: '#9aa1ac', link: '#4b5563' };
const FONT = 'font-family="system-ui, -apple-system, Segoe UI, Roboto, sans-serif"';
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => `&#${c.charCodeAt(0)};`);
const r1 = (v) => Math.round(v * 10) / 10;
/** Rough width of a text in px; on the wide side, as the reader's system-ui font may be wider. */
const textWidth = (s, size) => size * [...s].reduce((w, c) =>
  w + (/[A-Z0-9]/.test(c) ? 0.65 : /[\s.,()'-]/.test(c) ? 0.28 : 0.48), 0);

/** <text>; content is markup (escape plain strings with esc). halo: colour of the outline. */
function text(x, y, content, { size = 13, weight = 400, fill = C.text, anchor = 'start', halo = null,
  spacing = 0 } = {}) {
  const a = [`x="${r1(x)}"`, `y="${r1(y)}"`, `font-size="${size}"`];
  if (weight !== 400) a.push(`font-weight="${weight}"`);
  if (anchor !== 'start') a.push(`text-anchor="${anchor}"`);
  if (spacing) a.push(`letter-spacing="${spacing}"`);
  a.push(`fill="${fill}"`);
  if (halo) a.push(`stroke="${halo}" stroke-width="4" stroke-linejoin="round" paint-order="stroke"`);
  return `<text ${a.join(' ')}>${content}</text>`;
}

const line = (x1, y1, x2, y2, stroke, width = 1.5, extra = '') =>
  `<line x1="${r1(x1)}" y1="${r1(y1)}" x2="${r1(x2)}" y2="${r1(y2)}" stroke="${stroke}" stroke-width="${width}"${extra ? ' ' + extra : ''}/>`;

const dot = (x, y, r, fill, stroke = 'none', width = 0) =>
  `<circle cx="${r1(x)}" cy="${r1(y)}" r="${r}" fill="${fill}"${stroke !== 'none' ? ` stroke="${stroke}" stroke-width="${width}"` : ''}/>`;

const school = (x, y, r = 6) => dot(x, y, r, C.school, C.text, 1.2);

/** Station triangle centred on (x, y), as on the other theory maps. */
function triangle(x, y, size = 8, color = C.station) {
  const h = size * 1.6;
  return `<polygon points="${r1(x)},${r1(y - h * 0.62)} ${r1(x - size)},${r1(y + h * 0.38)} ${r1(x + size)},${r1(y + h * 0.38)}" fill="${color}" stroke="#ffffff" stroke-width="1.2" stroke-linejoin="round"/>`;
}

/** North arrow with its N above, tip at (x, y). */
const northArrow = (x, y) => [
  `<path d="M${r1(x)} ${r1(y)}L${r1(x + 5.5)} ${r1(y + 14)}L${r1(x)} ${r1(y + 10.5)}L${r1(x - 5.5)} ${r1(y + 14)}Z" fill="${C.text}"/>`,
  text(x, y - 4, 'N', { size: 12, weight: 700, anchor: 'middle' }),
].join('\n');

/** Scale bar of km kilometres starting at (x, y), pxPerKm on the map. */
function scaleBar(x, y, km, pxPerKm, halo) {
  const w = km * pxPerKm;
  return [
    `<path d="M${r1(x)} ${r1(y - 5)}V${r1(y)}H${r1(x + w)}V${r1(y - 5)}" fill="none" stroke="${C.text}" stroke-width="1.5"/>`,
    text(x + w + 6, y + 1, `${km} km`, { size: 12, halo }),
  ].join('\n');
}

// ---------------------------------------------------------------------------
// Data
// ---------------------------------------------------------------------------

/** Utah's boundary (lon, lat), clockwise from the north-west corner. */
const UTAH = [[-114.05, 42.0], [-111.05, 42.0], [-111.05, 41.0], [-109.05, 41.0],
  [-109.05, 37.0], [-114.05, 37.0]];

/** Towns for orientation (approximate). side: where the label goes. */
const TOWNS = [
  { name: 'Logan', lat: 41.74, lon: -111.83, side: 'left' },
  { name: 'Salt Lake City', lat: 40.76, lon: -111.89, side: 'left' },
  { name: 'Provo', lat: 40.23, lon: -111.66, side: 'right' },
  { name: 'Price', lat: 39.60, lon: -110.81, side: 'right' },
  { name: 'Richfield', lat: 38.77, lon: -112.08, side: 'below' },
  { name: 'Moab', lat: 38.57, lon: -109.55, side: 'left' },
  { name: 'Cedar City', lat: 37.68, lon: -113.06, side: 'right' },
  { name: 'St. George', lat: 37.10, lon: -113.58, side: 'above-right' },
];

const schools = SCHOOLS.map((s) => {
  const st = stationList.find((x) => x.net === s.standIn.net && x.sta === s.standIn.sta);
  if (!st) throw new Error(`No coordinates for ${s.standIn.net}.${s.standIn.sta} in stations.json`);
  return { ...s, short: s.name.replace(/ High School$/, ' HS'), st,
    km: distanceKm(s.lat, s.lon, st.lat, st.lon) };
});

// ---------------------------------------------------------------------------
// Layout
// ---------------------------------------------------------------------------

const COS = Math.cos((39.5 * Math.PI) / 180);
const KM_PER_DEG = (EARTH_RADIUS_KM * Math.PI) / 180;   // km per degree of latitude
/** Equirectangular map: (lat, lon) -> px, with (lat0, lon0) at (x0, y0), k px per degree of latitude. */
const projection = (lat0, lon0, k, x0, y0) => (lat, lon) =>
  ({ x: x0 + (lon - lon0) * COS * k, y: y0 + (lat0 - lat) * k });

const W = 760;
const PAD = 12;
const GAP = 16;                          // between the two panels
const TOP = 56;                          // top of both panels (panel titles above)

// Enlarged map: S px per degree of latitude over this latitude range.
const S = 305;
const Z_LAT = [38.825, 40.005];
const Z_LON_WEST = -112.795;
const H = Math.round((Z_LAT[1] - Z_LAT[0]) * S);

// Utah overview: the whole state with room around it for the neighbours' names.
const OV = { ml: 26, mr: 26, mt: 24, mb: 24 };
const K = (H - OV.mt - OV.mb) / 5;       // Utah is 5 degrees tall
const W1 = Math.round(5 * COS * K + OV.ml + OV.mr);
const W2 = W - 2 * PAD - GAP - W1;
const XO = PAD;                          // overview panel left
const XZ = PAD + W1 + GAP;               // enlarged panel left
const Z_LON = [Z_LON_WEST, Z_LON_WEST + W2 / (COS * S)];

const O = projection(42.0, -114.05, K, XO + OV.ml, TOP + OV.mt);
const Z = projection(Z_LAT[1], Z_LON[0], S, XZ, TOP);

// ---------------------------------------------------------------------------
// The figure
// ---------------------------------------------------------------------------

function schoolsMap() {
  const body = [];
  const defs = [];

  // --- Utah overview ---
  body.push(text(XO + 2, TOP - 10, 'Utah', { size: 14, weight: 600 }));
  body.push(`<rect x="${XO}" y="${TOP}" width="${W1}" height="${H}" rx="4" fill="${C.bg}" stroke="${C.border}"/>`);
  const ut = UTAH.map(([lon, lat]) => O(lat, lon));
  body.push(`<polygon points="${ut.map((p) => `${r1(p.x)},${r1(p.y)}`).join(' ')}" fill="${C.map}" stroke="${C.outline}" stroke-width="1.4" stroke-linejoin="round"/>`);
  // neighbouring states, faint, outside the outline
  const nb = { size: 12, weight: 600, fill: C.faint, anchor: 'middle', spacing: 1 };
  const west = O(39.5, -114.05).x;
  const east = O(39.5, -109.05).x;
  const north = O(42.0, -112).y;
  const south = O(37.0, -112).y;
  body.push(text((XO + west) / 2, O(39.5, -114).y + 4, 'NV', nb));
  body.push(text((east + XO + W1) / 2, O(39.0, -109).y + 4, 'CO', nb));
  body.push(text(O(42, -112.55).x, (TOP + north) / 2 + 5, 'ID', nb));
  body.push(text(O(41.5, -110.05).x, O(41.5, -110.05).y + 4, 'WY', nb));
  body.push(text(O(37, -111.55).x, (south + TOP + H) / 2 + 5, 'AZ', nb));

  // the area enlarged on the right, and the lines that tie the two together
  const bx0 = O(Z_LAT[1], Z_LON[0]);
  const bx1 = O(Z_LAT[0], Z_LON[1]);
  body.push(line(bx1.x, bx0.y, XZ, TOP, C.faint, 1));
  body.push(line(bx1.x, bx1.y, XZ, TOP + H, C.faint, 1));
  body.push(`<rect x="${r1(bx0.x)}" y="${r1(bx0.y)}" width="${r1(bx1.x - bx0.x)}" height="${r1(bx1.y - bx0.y)}" fill="none" stroke="${C.text}" stroke-width="1.2"/>`);

  for (const t of TOWNS) {
    const p = O(t.lat, t.lon);
    body.push(dot(p.x, p.y, 2.6, C.town));
    const at = { left: [-5, 4, 'end'], right: [5, 4, 'start'], below: [0, 17, 'middle'],
      'above-right': [4, -4, 'start'] }[t.side];
    body.push(text(p.x + at[0], p.y + at[1], esc(t.name), { size: 12, fill: C.muted, anchor: at[2], halo: C.bg }));
  }
  for (const s of schools) {
    const p = O(s.lat, s.lon);
    body.push(dot(p.x, p.y, 3.4, C.school, C.text, 0.9));
  }
  body.push(northArrow(XO + 14, TOP + 18));
  {
    const kmPx = K / KM_PER_DEG;
    const p = O(37.0, -109.05);
    body.push(scaleBar(p.x - 124, p.y - 12, 100, kmPx, C.map));
  }

  // --- central Utah, enlarged ---
  body.push(text(XZ + 2, TOP - 10, 'Central Utah, enlarged', { size: 14, weight: 600 }));
  defs.push(`<clipPath id="schools-zoom"><rect x="${XZ}" y="${TOP}" width="${r1(W2)}" height="${H}" rx="4"/></clipPath>`);
  body.push('<g clip-path="url(#schools-zoom)">');
  body.push(`<rect x="${XZ}" y="${TOP}" width="${r1(W2)}" height="${H}" fill="${C.map}"/>`);

  // Where each school is drawn. The two Mt. Pleasant schools are 1 km apart (3 px
  // here), so their dots are pulled apart along a line that keeps the links clear.
  const pos = Object.fromEntries(schools.map((s) => [s.id, Z(s.lat, s.lon)]));
  {
    const a = pos['north-sanpete'];
    const b = pos['wasatch-academy'];
    const m = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
    const half = 6.5;
    const az = (120 * Math.PI) / 180;    // Wasatch Academy drawn to the ESE of North Sanpete
    const u = { x: Math.sin(az), y: -Math.cos(az) };
    pos['north-sanpete'] = { x: m.x - half * u.x, y: m.y - half * u.y };
    pos['wasatch-academy'] = { x: m.x + half * u.x, y: m.y + half * u.y };
  }
  const sta = Object.fromEntries(schools.map((s) => [s.id, Z(s.st.lat, s.st.lon)]));

  // Label placement per school (px). school: label anchor relative to the dot;
  // km: side of the link the distance goes on (+1 = left of the school->station direction);
  // station: label offset from the triangle.
  const LAYOUT = {
    'juab': { school: { dx: -13, dy: 4.5, anchor: 'end' }, km: { side: -1 }, station: { dx: 12, dy: 4.5 } },
    'north-sanpete': { school: { dx: -40, dy: -16, anchor: 'end', leader: true }, km: { side: 1 }, station: { dx: 12, dy: 4.5 } },
    'wasatch-academy': { school: { dx: -40, dy: 24, anchor: 'end', leader: true }, km: { side: -1 }, station: { dx: 12, dy: 4.5 } },
    'gunnison-valley': { school: { dx: -13, dy: 4.5, anchor: 'end' }, km: { side: -1, along: 0.6 }, station: { dx: 12, dy: 4.5 } },
    'millard': { school: { dx: -10, dy: 25, anchor: 'start' }, km: { side: 1 }, station: { dx: 12, dy: 4.5 } },
  };

  // links and distances
  for (const s of schools) {
    const a = pos[s.id];
    const b = sta[s.id];
    body.push(line(a.x, a.y, b.x, b.y, C.link, 1.4));
  }
  for (const s of schools) {
    const a = pos[s.id];
    const b = sta[s.id];
    const L = LAYOUT[s.id].km;
    const len = Math.hypot(b.x - a.x, b.y - a.y);
    const ux = (b.x - a.x) / len;
    const uy = (b.y - a.y) / len;
    const nx = uy * L.side;              // left of travel for side +1 (screen y is down)
    const ny = -ux * L.side;
    // Centre of the text box, placed so the box's nearest edge is `off` px from the line.
    const f = L.along ?? 0.5;
    const off = (L.off ?? 6) + Math.abs(nx) * 19 + Math.abs(ny) * 6;   // text box about 38 x 12 px
    const mx = a.x + (b.x - a.x) * f + nx * off;
    const my = a.y + (b.y - a.y) * f + ny * off;
    body.push(text(mx, my + 4.5, `${Math.round(s.km)} km`, { size: 12, weight: 600, anchor: 'middle', halo: '#ffffff' }));
  }
  // stations
  for (const s of schools) {
    const p = sta[s.id];
    const L = LAYOUT[s.id].station;
    body.push(triangle(p.x, p.y, 8));
    body.push(text(p.x + L.dx, p.y + L.dy, s.st.sta, { size: 13, weight: 700, fill: C.station,
      anchor: L.anchor ?? 'start', halo: '#ffffff' }));
  }
  // schools and their labels
  for (const s of schools) {
    const p = pos[s.id];
    const L = LAYOUT[s.id].school;
    const lx = p.x + L.dx;
    const ly = p.y + L.dy;
    if (L.leader) {
      // from the dot's edge to just short of the text
      const tx = L.anchor === 'end' ? lx + 4 : L.anchor === 'start' ? lx - 4 : lx;
      const ty = L.anchor === 'middle' ? ly - 14 : ly - 4.5;
      const d = Math.hypot(tx - p.x, ty - p.y);
      body.push(line(p.x + ((tx - p.x) / d) * 7, p.y + ((ty - p.y) / d) * 7, tx, ty, C.muted, 1));
    }
    body.push(text(lx, ly, `<tspan font-weight="600">${esc(s.short)}</tspan><tspan fill="${C.muted}">, ${esc(s.town)}</tspan>`,
      { size: 13, anchor: L.anchor, halo: '#ffffff' }));
  }
  for (const s of schools) body.push(school(pos[s.id].x, pos[s.id].y));

  body.push(northArrow(XZ + W2 - 18, TOP + 18));
  body.push(scaleBar(XZ + 14, TOP + 26, 50, S / KM_PER_DEG, C.map));
  body.push('</g>');
  body.push(`<rect x="${XZ}" y="${TOP}" width="${r1(W2)}" height="${H}" rx="4" fill="none" stroke="${C.border}"/>`);

  // --- legend and credit ---
  // One row, spread over the width from an estimate of each text's width, so the
  // items stay apart even if the reader's system-ui font is wider than expected.
  const ly = TOP + H + 26;
  const legend = [
    { label: 'UHSN school', w: 12, mark: (x, y) => school(x + 5.5, y, 5.5) },
    { label: 'stand-in station (University of Utah)', w: 16, mark: (x, y) => triangle(x + 7, y, 7) },
    { label: 'distance to the stand-in', w: 26, mark: (x, y) => line(x, y, x + 24, y, C.link, 1.4) },
    { label: 'town', w: 6, mark: (x, y) => dot(x + 2.6, y, 2.6, C.town) },
  ];
  const itemW = legend.map((item) => item.w + 6 + textWidth(item.label, 12));
  const legendGap = Math.min(48, (W - 2 * PAD - 12 - itemW.reduce((a, b) => a + b, 0)) / (legend.length - 1));
  let x = PAD + 6;
  legend.forEach((item, i) => {
    body.push(item.mark(x, ly - 4.5));
    body.push(text(x + item.w + 6, ly, esc(item.label), { size: 12 }));
    x += itemW[i] + legendGap;
  });

  const fy = ly + 22;
  body.push(text(PAD + 2, fy, 'The two Mt. Pleasant schools are 1 km apart; their dots are drawn side by side.', { size: 12, fill: C.muted }));
  body.push(text(PAD + 2, fy + 17, 'Station locations: University of Utah Seismograph Stations (network UU) via EarthScope.', { size: 12, fill: C.muted }));
  const HT = fy + 30;

  const title = 'UHSN schools and their stand-in stations';
  const desc = 'Map of Utah: the five UHSN Phase I schools sit in a north–south line in central Utah. ' +
    'Enlarged, each school is joined to its University of Utah stand-in station: ' +
    schools.map((s) => `${s.short} (${s.town}) to ${s.st.sta}, ${Math.round(s.km)} km`).join('; ') + '.';
  const out = [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${HT}" width="${W}" height="${HT}" role="img" ${FONT}>`,
    `<title>${esc(title)}</title>`,
    `<desc>${esc(desc)}</desc>`,
    `<defs>${defs.join('')}</defs>`,
    `<rect x="0.5" y="0.5" width="${W - 1}" height="${HT - 1}" rx="8" fill="${C.bg}" stroke="${C.border}"/>`,
    text(12, 22, esc(title), { size: 15, weight: 600 }),
  ];
  return [...out, ...body, '</svg>'].join('\n');
}

const svg = schoolsMap();
fs.writeFileSync(new URL('schools-map.svg', outDir), svg + '\n');
console.log(`wrote docs/theory/img/schools-map.svg (${(svg.length / 1024).toFixed(0)} KB)`);
console.log(`overview ${W1} x ${H} px (${(K / KM_PER_DEG).toFixed(2)} px/km), enlarged ${r1(W2)} x ${H} px (${(S / KM_PER_DEG).toFixed(2)} px/km), ` +
  `lon ${Z_LON.map((v) => v.toFixed(2)).join(' to ')}, lat ${Z_LAT.join(' to ')}`);
for (const s of schools) {
  console.log(`${s.short} (${s.town}) -> ${s.st.net}.${s.st.sta}: ${s.km.toFixed(1)} km`);
}
