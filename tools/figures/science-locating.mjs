// Make the "Locating a quake" figures for the theory page (docs/theory/img/).
//
//   node tools/figures/science-locating.mjs
//
// residuals.svg         L2: residuals, how far each circle misses a trial point
// misfit-map.svg        L3: the misfit (RMS) map that Quake Locator's grid search explores
// station-geometry.svg  L4: stations on one side vs all around (simulated picks)
//
// L2 and L3 use the offline sample (docs/app/data/samples/uu80162166) with the
// University of Utah analysts' S - P times at MTPU, TCRU and WCU. L4 simulates
// S - P times from the official epicenter. All three use the app's own locate/geo
// code and the Quake Locator defaults, so the numbers are the ones Quake Locator reports.
// Style: same constants and helpers as science-diagrams.mjs (copied, not imported).
// Output is deterministic: no clock, no Math.random (a seeded generator for L4).
import fs from 'node:fs';

const { spToDistanceKm, hypoToEpiKm, locateGrid, kmPerSecond, misfitAt } = await import('../../docs/app/js/lib/locate.js');
const { localProjection, distanceKm, centroid } = await import('../../docs/app/js/lib/geo.js');
const { WAVE_RACE } = await import('../../docs/app/js/config.js');

const outDir = new URL('../../docs/theory/img/', import.meta.url);
fs.mkdirSync(outDir, { recursive: true });

// ---------------------------------------------------------------------------
// House style (same constants as science-diagrams.mjs)
// ---------------------------------------------------------------------------

const C = { bg: '#ffffff', text: '#111827', muted: '#5b6472', border: '#d9dde3', grid: '#e8ebef',
  quake: '#f59e0b', quakeEdge: '#b45309', map: '#f3efe4', unused: '#9aa1ac', station: '#374151',
  fit: '#7c3aed', fitEdge: '#3b0f80', pin: '#16a34a', pinEdge: '#111111' };
const STA_COLOR = { MTPU: '#0d9488', TCRU: '#6b7a00', WCU: '#7c3aed' };
const FONT = 'font-family="system-ui, -apple-system, Segoe UI, Roboto, sans-serif"';
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => `&#${c.charCodeAt(0)};`);
const r1 = (v) => Math.round(v * 10) / 10;
const it = (s) => `<tspan font-style="italic">${s}</tspan>`;   // a maths variable
const MINUS = '−';
/** Signed number with a true minus sign: −6.3, +2.6. */
const signed = (v, d = 1) => (v < 0 ? MINUS : '+') + Math.abs(v).toFixed(d);
const SUBS = ['₀', '₁', '₂', '₃', '₄', '₅'];

/** <text>; content is markup (escape plain strings with esc). halo: colour of the outline. */
function text(x, y, content, { size = 13, weight = 400, fill = C.text, anchor = 'start', halo = null,
  rotate = 0, style = '' } = {}) {
  const a = [`x="${r1(x)}"`, `y="${r1(y)}"`, `font-size="${size}"`];
  if (weight !== 400) a.push(`font-weight="${weight}"`);
  if (style) a.push(`font-style="${style}"`);
  if (anchor !== 'start') a.push(`text-anchor="${anchor}"`);
  a.push(`fill="${fill}"`);
  if (halo) a.push(`stroke="${halo}" stroke-width="4" stroke-linejoin="round" paint-order="stroke"`);
  if (rotate) a.push(`transform="rotate(${r1(rotate)} ${r1(x)} ${r1(y)})"`);
  return `<text ${a.join(' ')}>${content}</text>`;
}

const line = (x1, y1, x2, y2, stroke, width = 1.5, extra = '') =>
  `<line x1="${r1(x1)}" y1="${r1(y1)}" x2="${r1(x2)}" y2="${r1(y2)}" stroke="${stroke}" stroke-width="${width}"${extra ? ' ' + extra : ''}/>`;

/** Star (n points) centred on (cx, cy). */
function star(cx, cy, ro, ri, fill = C.quake, edge = C.quakeEdge, n = 5) {
  const pts = [];
  for (let i = 0; i < 2 * n; i++) {
    const r = i % 2 ? ri : ro;
    const a = (-90 + (i * 180) / n) * Math.PI / 180;
    pts.push(`${r1(cx + r * Math.cos(a))},${r1(cy + r * Math.sin(a))}`);
  }
  return `<polygon points="${pts.join(' ')}" fill="${fill}" stroke="${edge}" stroke-width="1.2" stroke-linejoin="round"/>`;
}
const officialStar = (x, y, s = 1) => star(x, y, 11 * s, 4.6 * s, C.quake, C.quakeEdge);
const fitStar = (x, y, s = 1) => star(x, y, 11 * s, 4.6 * s, C.fit, C.fitEdge);

/** Station triangle centred on (x, y) (map). */
function triangle(x, y, color, size = 10) {
  const h = size * 1.6;
  const yTop = y - h * 0.62;
  const yBot = y + h * 0.38;
  return `<polygon points="${r1(x)},${r1(yTop)} ${r1(x - size)},${r1(yBot)} ${r1(x + size)},${r1(yBot)}" fill="${color}" stroke="#ffffff" stroke-width="1.2" stroke-linejoin="round"/>`;
}

/** Quake Locator's "your guess" pin (docs/app/js/ui/map-view.js), tip at (x, y). */
function pin(x, y, s = 1) {
  return `<g transform="translate(${r1(x - 13 * s)} ${r1(y - 33 * s)}) scale(${s})">` +
    `<path d="M13 1C6.6 1 1.5 6 1.5 12.3 1.5 20.6 13 33 13 33s11.5-12.4 11.5-20.7C24.5 6 19.4 1 13 1z" fill="${C.pin}" stroke="${C.pinEdge}" stroke-width="1.2"/>` +
    `<circle cx="13" cy="12.5" r="4.2" fill="#fff" stroke="${C.pinEdge}" stroke-width="1"/></g>`;
}

/** Small arrowhead at (x, y) pointing along angle a (radians, screen coordinates). */
function arrowHead(x, y, a, color, len = 9, half = 5) {
  const ux = Math.cos(a);
  const uy = Math.sin(a);
  const bx = x - ux * len;
  const by = y - uy * len;
  return `<polygon points="${r1(x)},${r1(y)} ${r1(bx - uy * half)},${r1(by + ux * half)} ${r1(bx + uy * half)},${r1(by - ux * half)}" fill="${color}" stroke="#ffffff" stroke-width="1" stroke-linejoin="round"/>`;
}

function card(width, height, title, desc) {
  return [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}" role="img" ${FONT}>`,
    `<title>${esc(title)}</title>`,
    `<desc>${esc(desc)}</desc>`,
    `<rect x="0.5" y="0.5" width="${width - 1}" height="${height - 1}" rx="8" fill="${C.bg}" stroke="${C.border}"/>`,
    text(12, 22, esc(title), { size: 15, weight: 600 }),
  ];
}

/** North arrow with its N, top at (nx, ny). */
const northArrow = (nx, ny, halo = null) => [
  `<path d="M${r1(nx)} ${r1(ny + 14)}L${r1(nx + 5.5)} ${r1(ny + 28)}L${r1(nx)} ${r1(ny + 24.5)}L${r1(nx - 5.5)} ${r1(ny + 28)}Z" fill="${C.text}"${halo ? ` stroke="${halo}" stroke-width="2" paint-order="stroke"` : ''}/>`,
  text(nx, ny + 10, 'N', { size: 12, weight: 700, anchor: 'middle', halo }),
];

/** Scale bar of km kilometres (k px per km), left end at (x, y). */
function scaleBar(x, y, km, k, halo = null) {
  const w = km * k;
  const out = [];
  if (halo) out.push(`<path d="M${r1(x)} ${r1(y - 5)}V${r1(y)}H${r1(x + w)}V${r1(y - 5)}" fill="none" stroke="${halo}" stroke-width="4" stroke-linejoin="round"/>`);
  out.push(`<path d="M${r1(x)} ${r1(y - 5)}V${r1(y)}H${r1(x + w)}V${r1(y - 5)}" fill="none" stroke="${C.text}" stroke-width="1.5"/>`);
  out.push(text(x + w + 6, y + 1, `${km} km`, { size: 12, fill: C.text, halo }));
  return out;
}

// ---------------------------------------------------------------------------
// Data: the offline sample and the Quake Locator defaults
// ---------------------------------------------------------------------------

const ID = 'uu80162166';
const sampleDir = new URL(`../../docs/app/data/samples/${ID}/`, import.meta.url);
const event = JSON.parse(fs.readFileSync(new URL('event.json', sampleDir)));
const stationList = JSON.parse(fs.readFileSync(new URL('stations.json', sampleDir)));
const picksRaw = JSON.parse(fs.readFileSync(new URL('picks.json', sampleDir)));
const { vp, vs, depthKm, pickUncertaintySec } = WAVE_RACE;
const kps = kmPerSecond(vp, vs);
const sigmaKm = pickUncertaintySec * kps;          // the "rough uncertainty" margin, ~1.53 km
const stationAt = (sta) => {
  const s = stationList.find((x) => x.sta === sta);
  if (!s) throw new Error(`station ${sta} not in stations.json`);
  return s;
};

// Analyst S - P at the three stations Quake Locator uses for the sample (first P, first S).
const firstPick = (sta, ph) => Math.min(...picksRaw.filter((p) => p.sta === sta && p.phase.toUpperCase().startsWith(ph)).map((p) => p.timeMs));
const STAS = ['MTPU', 'TCRU', 'WCU'];               // r1, r2, r3
const obs = STAS.map((sta) => {
  const s = stationAt(sta);
  const spSec = (firstPick(sta, 'S') - firstPick(sta, 'P')) / 1000;
  const distKm = spToDistanceKm(spSec, vp, vs);
  return { sta, lat: s.lat, lon: s.lon, spSec, distKm, epiKm: hypoToEpiKm(distKm, depthKm) };
});
const fit = locateGrid(obs, { depthKm, sigmaKm });

// ---------------------------------------------------------------------------
// Misfit grids and contours (marching squares)
// ---------------------------------------------------------------------------

/**
 * RMS misfit on a grid (km, in projection proj) covering ext, one extra ring of
 * nodes outside, and an outermost ring set very high so every contour closes.
 */
function misfitGrid(o, proj, ext, step) {
  const pad = 2;
  const nx = Math.round((ext.x1 - ext.x0) / step) + 1 + 2 * pad;
  const ny = Math.round((ext.y1 - ext.y0) / step) + 1 + 2 * pad;
  const x0 = ext.x0 - pad * step;
  const y0 = ext.y0 - pad * step;
  const v = new Float64Array(nx * ny);
  for (let j = 0; j < ny; j++) {
    for (let i = 0; i < nx; i++) {
      if (i === 0 || j === 0 || i === nx - 1 || j === ny - 1) { v[j * nx + i] = 1e6; continue; }
      const p = proj.toLatLon(x0 + i * step, y0 + j * step);
      v[j * nx + i] = misfitAt(p.lat, p.lon, o, depthKm).rmsKm;
    }
  }
  return { nx, ny, x0, y0, step, v };
}

/** Closed rings (km coordinates) around the region where the grid value is below L. */
function isoRings(g, L) {
  const { nx, ny, v, step } = g;
  const at = (i, j) => v[j * nx + i];
  const pt = new Map();
  const nb = new Map();
  const P = (key, i0, j0, i1, j1) => {
    if (!pt.has(key)) {
      const a = at(i0, j0);
      const b = at(i1, j1);
      const t = (L - a) / (b - a);
      pt.set(key, [g.x0 + (i0 + t * (i1 - i0)) * step, g.y0 + (j0 + t * (j1 - j0)) * step]);
    }
    return key;
  };
  const link = (a, b) => {
    if (!nb.has(a)) nb.set(a, []);
    if (!nb.has(b)) nb.set(b, []);
    nb.get(a).push(b);
    nb.get(b).push(a);
  };
  for (let j = 0; j < ny - 1; j++) {
    for (let i = 0; i < nx - 1; i++) {
      const a = at(i, j) < L;            // corners: a bottom-left, b bottom-right,
      const b = at(i + 1, j) < L;        // c top-right, d top-left (y grows upward)
      const c = at(i + 1, j + 1) < L;
      const d = at(i, j + 1) < L;
      if (a === b && b === c && c === d) continue;
      const B = () => P(`h${i},${j}`, i, j, i + 1, j);
      const R = () => P(`v${i + 1},${j}`, i + 1, j, i + 1, j + 1);
      const T = () => P(`h${i},${j + 1}`, i, j + 1, i + 1, j + 1);
      const Lf = () => P(`v${i},${j}`, i, j, i, j + 1);
      const e = [];
      if (a !== b) e.push(B());
      if (b !== c) e.push(R());
      if (c !== d) e.push(T());
      if (d !== a) e.push(Lf());
      if (e.length === 2) link(e[0], e[1]);
      else {
        // saddle: decide with the cell centre
        const centre = (at(i, j) + at(i + 1, j) + at(i + 1, j + 1) + at(i, j + 1)) / 4 < L;
        if (centre === a) { link(B(), R()); link(T(), Lf()); } else { link(B(), Lf()); link(R(), T()); }
      }
    }
  }
  const rings = [];
  const seen = new Set();
  for (const start of nb.keys()) {
    if (seen.has(start)) continue;
    const ring = [];
    let prev = null;
    let cur = start;
    while (!seen.has(cur)) {
      seen.add(cur);
      ring.push(pt.get(cur));
      const [n1, n2] = nb.get(cur);
      const next = n1 !== prev ? n1 : n2;
      prev = cur;
      cur = next;
    }
    rings.push(ring);
  }
  return rings;
}

/** Douglas-Peucker on an open polyline of [x, y] (px). */
function simplify(pts, tol) {
  if (pts.length < 3) return pts;
  const keep = new Uint8Array(pts.length);
  keep[0] = 1;
  keep[pts.length - 1] = 1;
  const stack = [[0, pts.length - 1]];
  while (stack.length) {
    const [s, e] = stack.pop();
    const [ax, ay] = pts[s];
    const [bx, by] = pts[e];
    const dx = bx - ax;
    const dy = by - ay;
    const n = Math.hypot(dx, dy) || 1;
    let worst = -1;
    let wi = -1;
    for (let i = s + 1; i < e; i++) {
      const dist = Math.abs((pts[i][0] - ax) * dy - (pts[i][1] - ay) * dx) / n;
      if (dist > worst) { worst = dist; wi = i; }
    }
    if (worst > tol) {
      keep[wi] = 1;
      stack.push([s, wi], [wi, e]);
    }
  }
  return pts.filter((_, i) => keep[i]);
}

/** SVG path data for rings (km) mapped by X, Y to px. */
function ringsPath(rings, X, Y, tol = 0.2) {
  const parts = [];
  for (const ring of rings) {
    if (ring.length < 3) continue;
    const px = ring.map(([x, y]) => [X(x), Y(y)]);
    // split the closed ring at its start and the point farthest from it
    let far = 0;
    let fd = -1;
    for (let i = 1; i < px.length; i++) {
      const d = Math.hypot(px[i][0] - px[0][0], px[i][1] - px[0][1]);
      if (d > fd) { fd = d; far = i; }
    }
    const a = simplify(px.slice(0, far + 1), tol);
    const b = simplify([...px.slice(far), px[0]], tol);
    const all = [...a, ...b.slice(1, -1)];
    parts.push('M' + all.map(([x, y]) => `${r1(x)} ${r1(y)}`).join('L') + 'Z');
  }
  return parts.join('');
}

// Colour scale: one hue, light = small misfit, dark = large (ColorBrewer Blues, stepped).
// Log scale in half-doublings (1, 1.4, 2, 2.8, 4, ... 64 km): every two bands the
// misfit doubles, so the valley shows near the best point and far from it.
const BANDS = Array.from({ length: 13 }, (_, i) => 2 ** (i / 2));
const BLUES = ['#f7fbff', '#deebf7', '#c6dbef', '#9ecae1', '#6baed6', '#4292c6', '#2171b5', '#08519c'];
const BAND_COLORS = Array.from({ length: BANDS.length + 1 }, (_, i) => {
  const t = (i / BANDS.length) * (BLUES.length - 1);
  const a = Math.min(Math.floor(t), BLUES.length - 2);
  const f = t - a;
  const rgb = (h) => [1, 3, 5].map((p) => parseInt(h.slice(p, p + 2), 16));
  const c0 = rgb(BLUES[a]);
  const c1 = rgb(BLUES[a + 1]);
  return '#' + c0.map((v, j) => Math.round(v + (c1[j] - v) * f).toString(16).padStart(2, '0')).join('');
});
const BAND_LABELS = [1, 2, 4, 8, 16, 32, 64];      // labelled class edges on the colour bar

/** Rough width (px) of bold system-ui text, for placing label backgrounds. */
function textWidth(s, size = 12, bold = true) {
  let w = 0;
  for (const ch of s) {
    if ('WM'.includes(ch)) w += 0.9;
    else if (ch === 'm') w += 0.86;
    else if ('IJ'.includes(ch)) w += 0.32;
    else if ('ilj'.includes(ch)) w += 0.27;
    else if (ch === ' ') w += 0.27;
    else if (/[A-Z]/.test(ch)) w += 0.66;
    else if (/[0-9]/.test(ch)) w += 0.57;
    else if (/[a-z]/.test(ch)) w += 0.55;
    else w += 0.45;
  }
  return w * size * (bold ? 1.04 : 0.98);
}

/** Label on a white chip (for text over the coloured misfit map). */
function chip(x, y, label, { size = 12, fill = C.text, anchor = 'start', weight = 700 } = {}) {
  const w = textWidth(label, size, weight >= 600) + 8;
  const x0 = anchor === 'end' ? x - w + 4 : anchor === 'middle' ? x - w / 2 : x - 4;
  return `<rect x="${r1(x0)}" y="${r1(y - size + 0.5)}" width="${r1(w)}" height="${r1(size + 5)}" rx="3" fill="#ffffff" fill-opacity="0.9"/>` +
    text(x, y, esc(label), { size, weight, fill, anchor });
}

/** Filled bands: darkest everywhere, then each lighter class stacked on top. */
function misfitBands(g, X, Y, rect) {
  const out = [`<rect x="${r1(rect.x)}" y="${r1(rect.y)}" width="${r1(rect.w)}" height="${r1(rect.h)}" fill="${BAND_COLORS[BAND_COLORS.length - 1]}"/>`];
  for (let b = BANDS.length - 1; b >= 0; b--) {
    const d = ringsPath(isoRings(g, BANDS[b]), X, Y);
    if (d) out.push(`<path d="${d}" fill="${BAND_COLORS[b]}" fill-rule="evenodd"/>`);
  }
  return out;
}

/** The rough-uncertainty contour: a dark line on a white casing. */
function uncertaintyContour(g, level, X, Y) {
  const d = ringsPath(isoRings(g, level), X, Y);
  return [
    `<path d="${d}" fill="none" stroke="#ffffff" stroke-width="4.5" stroke-linejoin="round" fill-rule="evenodd"/>`,
    `<path d="${d}" fill="none" stroke="${C.text}" stroke-width="2" stroke-linejoin="round" fill-rule="evenodd"/>`,
  ];
}

/** Size of the region where the misfit is at most level: long and short axis (km), from the grid nodes. */
function regionSize(g, level) {
  const pts = [];
  let touches = false;
  for (let j = 1; j < g.ny - 1; j++) {
    for (let i = 1; i < g.nx - 1; i++) {
      if (g.v[j * g.nx + i] <= level) {
        pts.push([g.x0 + i * g.step, g.y0 + j * g.step]);
        if (i === 1 || j === 1 || i === g.nx - 2 || j === g.ny - 2) touches = true;
      }
    }
  }
  let mx = 0;
  let my = 0;
  for (const [x, y] of pts) { mx += x; my += y; }
  mx /= pts.length;
  my /= pts.length;
  let sxx = 0;
  let syy = 0;
  let sxy = 0;
  for (const [x, y] of pts) { sxx += (x - mx) ** 2; syy += (y - my) ** 2; sxy += (x - mx) * (y - my); }
  const th = 0.5 * Math.atan2(2 * sxy, sxx - syy);
  const ux = Math.cos(th);
  const uy = Math.sin(th);
  let a0 = Infinity; let a1 = -Infinity; let b0 = Infinity; let b1 = -Infinity;
  for (const [x, y] of pts) {
    const a = x * ux + y * uy;
    const b = -x * uy + y * ux;
    a0 = Math.min(a0, a); a1 = Math.max(a1, a); b0 = Math.min(b0, b); b1 = Math.max(b1, b);
  }
  // + one grid step: the nodes sample the region, its edge lies about half a step beyond
  return { longKm: a1 - a0 + g.step, shortKm: b1 - b0 + g.step, azLongDeg: ((90 - th * 180 / Math.PI) + 360) % 180,
    areaKm2: pts.length * g.step * g.step, touches };
}

/** Colour bar: stepped blocks with the class edges labelled. */
function colorBar(x, y, { horizontal, length, thick = 14, title = 'average miss (RMS), km' }) {
  const out = [];
  const n = BAND_COLORS.length;
  const s = length / n;
  if (horizontal) {
    out.push(text(x, y - 8, esc(title), { size: 12, weight: 600 }));
    BAND_COLORS.forEach((c, i) => out.push(`<rect x="${r1(x + i * s)}" y="${r1(y)}" width="${r1(s + 0.3)}" height="${thick}" fill="${c}"/>`));
    out.push(`<rect x="${r1(x)}" y="${r1(y)}" width="${r1(length)}" height="${thick}" fill="none" stroke="${C.muted}" stroke-width="0.8"/>`);
    BANDS.forEach((b, i) => {
      if (!BAND_LABELS.includes(b)) return;
      const bx = x + (i + 1) * s;
      out.push(line(bx, y + thick, bx, y + thick + 4, C.muted, 1));
      out.push(text(bx, y + thick + 16, String(b), { size: 12, anchor: 'middle', fill: C.text }));
    });
  } else {
    // vertical, small misfit at the top (light) like the valley floor
    out.push(text(x, y - 10, esc(title), { size: 12, weight: 600 }));
    BAND_COLORS.forEach((c, i) => out.push(`<rect x="${r1(x)}" y="${r1(y + i * s)}" width="${thick}" height="${r1(s + 0.3)}" fill="${c}"/>`));
    out.push(`<rect x="${r1(x)}" y="${r1(y)}" width="${thick}" height="${r1(length)}" fill="none" stroke="${C.muted}" stroke-width="0.8"/>`);
    BANDS.forEach((b, i) => {
      if (!BAND_LABELS.includes(b)) return;
      const by = y + (i + 1) * s;
      out.push(line(x + thick, by, x + thick + 4, by, C.muted, 1));
      out.push(text(x + thick + 8, by + 4.5, String(b), { size: 12, fill: C.text }));
    });
  }
  return out;
}

/**
 * Edge arrows for stations off the map. Stations within about 10 degrees share an
 * arrow; each arrow's label block ("STA 123 km" per line) goes on a white chip inside
 * the map, as close to its arrow as it fits without overlapping another block or a
 * leader line (every placement order is tried; the tidiest wins).
 * box: the map rectangle; avoid: rectangles to keep clear (the N arrow).
 */
function edgeArrows(stations, box, X, Y, half, { avoid = [] } = {}) {
  const groups = [];
  for (const s of [...stations].sort((a, b) => Math.atan2(a.x, a.y) - Math.atan2(b.x, b.y))) {
    const az = Math.atan2(s.x, s.y);                     // radians clockwise from north
    const gp = groups.find((q) => Math.abs(q.az - az) < 10 * Math.PI / 180);
    if (gp) { gp.items.push(s); gp.az = gp.items.reduce((a, q) => a + Math.atan2(q.x, q.y), 0) / gp.items.length; } else groups.push({ az, items: [s] });
  }
  const lh = 16;
  for (const gp of groups) {
    gp.items.sort((a, b) => a.distKm - b.distKm);
    const sx = Math.sin(gp.az);
    const sy = Math.cos(gp.az);
    const t = Math.min(half / Math.max(Math.abs(sx), 1e-9), half / Math.max(Math.abs(sy), 1e-9));
    const tipX = X(sx * t);
    const tipY = Y(sy * t);
    gp.a = Math.atan2(-sy, sx);                          // screen angle of the arrow
    const ux = Math.cos(gp.a);
    const uy = Math.sin(gp.a);
    gp.tip = { x: tipX - ux * 3, y: tipY - uy * 3 };
    gp.tail = { x: gp.tip.x - ux * 20, y: gp.tip.y - uy * 20 };
    gp.neck = { x: gp.tip.x - ux * 6, y: gp.tip.y - uy * 6 };
    gp.lines = gp.items.map((s) => `${s.sta} ${Math.round(s.distKm)} km`);
    gp.w = Math.max(...gp.lines.map((l) => textWidth(l))) + 8;
    gp.h = gp.lines.length * lh + 2;
    gp.vertical = Math.abs(tipY - box.y) < 4 || Math.abs(tipY - (box.y + box.h)) < 4;   // top or bottom edge
    gp.down = Math.abs(tipY - box.y) < 4 ? 1 : -1;
    gp.right = Math.abs(tipX - box.x) < 4;               // left edge: label to the right
  }
  /** Candidate label rectangles for a group, best first, with their cost. */
  const candidates = (gp) => {
    const out = [];
    if (gp.vertical) {
      for (let row = 0; row < 10; row++) {
        for (const shift of [0, -12, 12, -24, 24, -36, 36, -48, 48]) {
          const cx = Math.min(Math.max(gp.tail.x + shift, box.x + gp.w / 2 + 3), box.x + box.w - gp.w / 2 - 3);
          const y0 = gp.down > 0 ? gp.tail.y + 4 + row * 8 : gp.tail.y - 4 - row * 8 - gp.h;
          const r = { x0: cx - gp.w / 2, x1: cx + gp.w / 2, y0, y1: y0 + gp.h };
          if (gp.tail.x < r.x0 + 4 || gp.tail.x > r.x1 - 4) continue;   // the leader lands on its own block
          const leg = { x0: gp.tail.x, y0: Math.min(gp.tail.y, gp.down > 0 ? y0 : y0 + gp.h), y1: Math.max(gp.tail.y, gp.down > 0 ? y0 : y0 + gp.h) };
          out.push({ r, leg, cost: row + Math.abs(cx - gp.tail.x) / 24 });
        }
      }
    } else {
      for (let row = 0; row < 8; row++) {
        for (const dy of [0, 10, -10, 20, -20]) {
          const x0 = gp.right ? gp.tail.x + 6 : gp.tail.x - 6 - gp.w;
          const y0 = gp.tail.y - gp.h / 2 + dy * (1 + row);
          out.push({ r: { x0, x1: x0 + gp.w, y0, y1: y0 + gp.h }, leg: null, cost: row + Math.abs(dy) / 20 });
        }
      }
    }
    return out;
  };
  const overlaps = (r, q) => r.x0 < q.x1 + 2 && r.x1 > q.x0 - 2 && r.y0 < q.y1 + 2 && r.y1 > q.y0 - 2;
  const legOn = (l, q) => l && l.x0 >= q.x0 - 2 && l.x0 <= q.x1 + 2 && l.y1 > q.y0 && l.y0 < q.y1;
  const arrowBox = (gp) => ({ x0: Math.min(gp.tip.x, gp.tail.x) - 6, x1: Math.max(gp.tip.x, gp.tail.x) + 6,
    y0: Math.min(gp.tip.y, gp.tail.y) - 6, y1: Math.max(gp.tip.y, gp.tail.y) + 6 });
  const perms = (a) => (a.length <= 1 ? [a] : a.flatMap((x, i) => perms([...a.slice(0, i), ...a.slice(i + 1)]).map((p) => [x, ...p])));
  let bestPlan = null;
  for (const order of perms(groups.map((_, i) => i))) {
    const taken = [];                                    // {r, leg, gi}
    let cost = 0;
    let ok = true;
    for (const gi of order) {
      const gp = groups[gi];
      const others = groups.filter((_, j) => j !== gi).map(arrowBox);
      const c = candidates(gp).find(({ r, leg }) =>
        !avoid.some((q) => overlaps(r, q)) && !others.some((q) => overlaps(r, q)) &&
        !taken.some((t) => overlaps(r, t.r) || legOn(t.leg, r) || legOn(leg, t.r)));
      if (!c) { ok = false; break; }
      taken.push({ ...c, gi });
      cost += c.cost;
    }
    if (ok && (!bestPlan || cost < bestPlan.cost - 1e-9)) bestPlan = { cost, taken };
  }
  if (!bestPlan) throw new Error(`no room for the edge labels ${groups.map((g) => g.lines.join(', ')).join('; ')}`);
  const out = [];
  for (const gp of groups) {
    out.push(`<path d="M${r1(gp.tail.x)} ${r1(gp.tail.y)}L${r1(gp.neck.x)} ${r1(gp.neck.y)}" stroke="#ffffff" stroke-width="5" stroke-linecap="round"/>`);
    out.push(`<path d="M${r1(gp.tail.x)} ${r1(gp.tail.y)}L${r1(gp.neck.x)} ${r1(gp.neck.y)}" stroke="${C.station}" stroke-width="2.2" stroke-linecap="round"/>`);
    out.push(arrowHead(gp.tip.x, gp.tip.y, gp.a, C.station, 11, 6));
  }
  for (const { r, leg, gi } of [...bestPlan.taken].sort((a, b) => a.gi - b.gi)) {
    const gp = groups[gi];
    if (leg && leg.y1 - leg.y0 > 2) {
      out.push(line(leg.x0, leg.y0, leg.x0, leg.y1, '#ffffff', 3.5));
      out.push(line(leg.x0, leg.y0, leg.x0, leg.y1, C.station, 1.3));
    }
    out.push(`<rect x="${r1(r.x0)}" y="${r1(r.y0)}" width="${r1(gp.w)}" height="${r1(gp.h)}" rx="3" fill="#ffffff" fill-opacity="0.92" stroke="${C.station}" stroke-width="0.8"/>`);
    gp.lines.forEach((l, i) => out.push(text((r.x0 + r.x1) / 2, r.y0 + 13 + i * lh, esc(l), { size: 12, weight: 700, anchor: 'middle', fill: C.station })));
  }
  return out;
}

// ---------------------------------------------------------------------------
// L2: residuals
// ---------------------------------------------------------------------------

function residualsFigure() {
  const W = 760;
  const proj = localProjection(fit.lat, fit.lon);        // best fit at (0, 0)
  // The trial point: 8 km north-west of the best fit, where every circle misses by
  // a few km and the three misses fan out (all south of the pin, so the pin itself
  // hides none of them).
  const TRIAL_KM = 8;
  const trial = { x: -TRIAL_KM * Math.SQRT1_2, y: TRIAL_KM * Math.SQRT1_2 };
  const tll = proj.toLatLon(trial.x, trial.y);
  const m = misfitAt(tll.lat, tll.lon, obs, depthKm);
  const st = obs.map((o, i) => {
    const xy = proj.toXY(o.lat, o.lon);
    const epiFromPin = distanceKm(tll.lat, tll.lon, o.lat, o.lon);
    const hypoFromPin = Math.hypot(epiFromPin, depthKm);
    // Drawn segment: along the line pin-station, from the pin to the epicentral circle.
    const dx = xy.x - trial.x;
    const dy = xy.y - trial.y;
    const dmap = Math.hypot(dx, dy);                      // projected (map) distance
    const ux = dx / dmap;
    const uy = dy / dmap;
    const along = dmap - o.epiKm;                          // >0: circle between pin and station
    const end = { x: trial.x + ux * along, y: trial.y + uy * along };
    const segKm = Math.abs(along);
    if (Math.abs(segKm - Math.abs(m.residualsKm[i])) > 0.3) throw new Error(`${o.sta}: drawn gap and residual differ by more than 0.3 km`);
    return { ...o, ...xy, ux, uy, end, segKm, r: m.residualsKm[i], epiFromPin, hypoFromPin, idx: i + 1 };
  });
  const maxDiff = Math.max(...st.map((s) => Math.abs(s.segKm - Math.abs(s.r))));

  // map: 32 km x 32 km, the pin 3 km above the middle (the misses all point south)
  const half = 16;
  const cy = trial.y - 3;
  const left = 12;
  const top = 44;
  const size = 440;
  const k = size / (2 * half);
  const X = (x) => left + (x - trial.x + half) * k;
  const Y = (y) => top + (cy + half - y) * k;
  const px = X(trial.x);
  const py = Y(trial.y);
  const body = [];
  const defs = [`<clipPath id="res-map"><rect x="${left}" y="${top}" width="${size}" height="${size}" rx="4"/></clipPath>`];
  /** Where the line from the pin towards a station leaves the map. */
  const edgeHit = (s) => {
    const sx = s.ux;
    const sy = -s.uy;
    const tx = sx > 0 ? (left + size - px) / sx : (left - px) / sx;
    const ty = sy > 0 ? (top + size - py) / sy : (top - py) / sy;
    const t = Math.min(tx, ty);
    return { x: px + sx * t, y: py + sy * t, a: Math.atan2(sy, sx) };
  };
  body.push(`<g clip-path="url(#res-map)">`);
  body.push(`<rect x="${left}" y="${top}" width="${size}" height="${size}" fill="${C.map}"/>`);
  for (const s of st) {
    const e = edgeHit(s);
    body.push(line(px, py, e.x, e.y, STA_COLOR[s.sta], 1.3, 'stroke-dasharray="5 4"'));
  }
  for (const s of st) {
    body.push(`<circle cx="${r1(X(s.x))}" cy="${r1(Y(s.y))}" r="${r1(s.epiKm * k)}" fill="none" stroke="${STA_COLOR[s.sta]}" stroke-width="2.2"/>`);
  }
  for (const s of st) body.push(line(px, py, X(s.end.x), Y(s.end.y), STA_COLOR[s.sta], 4.5, 'stroke-linecap="round"'));
  for (const s of st) body.push(`<circle cx="${r1(X(s.end.x))}" cy="${r1(Y(s.end.y))}" r="3.6" fill="#ffffff" stroke="${STA_COLOR[s.sta]}" stroke-width="2"/>`);
  // best fit, for reference
  body.push(fitStar(X(0), Y(0), 0.75));
  body.push(text(X(0) + 11, Y(0) - 6, 'best fit', { size: 12, weight: 700, fill: C.fit, halo: '#ffffff' }));
  for (const s of st) {
    const e = edgeHit(s);
    body.push(arrowHead(e.x - Math.cos(e.a) * 3, e.y - Math.sin(e.a) * 3, e.a, STA_COLOR[s.sta], 11, 6));
  }
  body.push(...northArrow(left + 18, top + 10, '#ffffff'));
  body.push(...scaleBar(left + 12, top + size - 14, 10, k, '#ffffff'));
  body.push('</g>');
  body.push(`<rect x="${left}" y="${top}" width="${size}" height="${size}" rx="4" fill="none" stroke="${C.border}"/>`);

  // station names at the edge arrows: beside the arrow, to its right if that fits
  // inside the map and crosses no other arrow on the same edge, else to its left
  const hits = st.map(edgeHit);
  st.forEach((s, i) => {
    const e = hits[i];
    const lab = `to ${s.sta}`;
    const w = textWidth(lab);
    const sameEdge = hits.filter((h, j) => j !== i && Math.abs(h.y - e.y) < 2);
    const toRight = e.x + 8 + w < left + size - 4 && !sameEdge.some((h) => h.x > e.x && h.x < e.x + 12 + w);
    const atBottom = Math.sin(e.a) > 0;
    const ly = atBottom ? e.y - 12 : e.y + 18;
    body.push(text(e.x + (toRight ? 8 : atBottom ? -16 : -8), ly, esc(lab), { size: 12, weight: 700, fill: STA_COLOR[s.sta],
      anchor: toRight ? 'start' : 'end', halo: '#ffffff' }));
  });
  // residual labels at the far end of each segment
  for (const s of st) {
    const ex = X(s.end.x);
    const ey = Y(s.end.y);
    const lab = `${it('r')}${SUBS[s.idx]} = ${signed(s.r)} km`;
    if (s.sta === 'MTPU') body.push(text(ex + 20, ey + 22, lab, { size: 13, weight: 700, fill: STA_COLOR[s.sta], halo: '#ffffff' }));
    else if (s.sta === 'TCRU') body.push(text(ex - 8, ey + 20, lab, { size: 13, weight: 700, fill: STA_COLOR[s.sta], anchor: 'end', halo: '#ffffff' }));
    else body.push(text(ex - 10, ey + 2, lab, { size: 13, weight: 700, fill: STA_COLOR[s.sta], anchor: 'end', halo: '#ffffff' }));
  }
  body.push(pin(px, py, 0.9));
  body.push(text(px + 15, py - 18, 'your guess', { size: 12, weight: 700, fill: C.text, halo: '#ffffff' }));

  // right column: where each residual comes from
  const cx = left + size + 20;
  let y = top + 12;
  body.push(text(cx, y, 'residual =', { size: 13, weight: 600 }));
  body.push(text(cx + 72, y, 'distance from S − P', { size: 13, weight: 600 }));
  body.push(text(cx + 72, y + 17, 'minus distance from the pin', { size: 13, weight: 600 }));
  y += 50;
  const col = { sta: cx, sp: cx + 110, pin: cx + 170, res: cx + 184 };
  body.push(text(col.sta, y, 'station', { size: 12, fill: C.muted }));
  body.push(text(col.sp, y - 14, 'from', { size: 12, fill: C.muted, anchor: 'end' }));
  body.push(text(col.sp, y, 'S − P', { size: 12, fill: C.muted, anchor: 'end' }));
  body.push(text(col.pin, y - 14, 'from', { size: 12, fill: C.muted, anchor: 'end' }));
  body.push(text(col.pin, y, 'the pin', { size: 12, fill: C.muted, anchor: 'end' }));
  body.push(text(col.res, y, 'residual', { size: 12, fill: C.muted }));
  body.push(line(cx, y + 7, W - 14, y + 7, C.border, 1));
  y += 26;
  for (const s of st) {
    body.push(triangle(col.sta + 6, y - 4.5, STA_COLOR[s.sta], 6));
    body.push(text(col.sta + 15, y, s.sta, { size: 12, weight: 700, fill: STA_COLOR[s.sta] }));
    body.push(text(col.sp, y, `${s.distKm.toFixed(1)} km`, { size: 13, anchor: 'end' }));
    body.push(text(col.pin, y, `${s.hypoFromPin.toFixed(1)} km`, { size: 13, anchor: 'end' }));
    body.push(text(col.res, y, `${it('r')}${SUBS[s.idx]} = ${signed(s.r)} km`, { size: 13, weight: 700 }));
    y += 24;
  }
  y += 10;
  const notes = [
    [`${MINUS}  the pin is outside the circle`, true],
    ['(too far from the station)', false],
    ['+  the pin is inside the circle', true],
    ['(too close to the station)', false],
  ];
  for (const [n, strong] of notes) {
    body.push(text(cx + (strong ? 0 : 15), y, esc(n), { size: 12, fill: strong ? C.text : C.muted, weight: strong ? 600 : 400 }));
    y += strong ? 16 : 24;
  }
  y += 8;
  const more = [
    'The table, like Quake Locator, measures to',
    `the quake at ${depthKm} km depth. The circles show`,
    'distance along the ground, so a gap on the',
    `map differs from its residual by up to ${maxDiff.toFixed(1)} km.`,
  ];
  for (const n of more) { body.push(text(cx, y, esc(n), { size: 12, fill: C.muted })); y += 16; }

  // the RMS, worked out with the rounded residuals (as a student would)
  const rr = st.map((s) => Math.round(s.r * 10) / 10);
  const sumSq = rr.reduce((a, v) => a + v * v, 0);
  const rmsShown = Math.sqrt(sumSq / rr.length);
  if (rmsShown.toFixed(1) !== m.rmsKm.toFixed(1)) throw new Error(`rounded RMS ${rmsShown} differs from misfitAt ${m.rmsKm}`);
  const sq = (v) => (v < 0 ? `(${signed(v)})²` : `${v.toFixed(1)}²`);
  const fy = top + size + 34;
  body.push(text(left + 2, fy,
    `RMS = √((${it('r')}₁² + ${it('r')}₂² + ${it('r')}₃²) / 3) = √((${rr.map(sq).join(' + ')}) / 3) = √(${sumSq.toFixed(1)} / 3) = <tspan font-weight="700">${m.rmsKm.toFixed(1)} km</tspan>`,
    { size: 15, weight: 600 }));
  body.push(text(left + 2, fy + 22, `Quake Locator shows this as “Your circles miss it by ${m.rmsKm.toFixed(1)} km on average.” At the best fit (purple star) the RMS is ${fit.rmsKm.toFixed(1)} km.`,
    { size: 12, fill: C.text }));
  body.push(text(left + 2, fy + 44, `Real data: M${event.mag.toFixed(1)} quake ${esc(event.place.replace(/^\d+ km \w+ of /, 'near '))}, ${event.id}; University of Utah analyst picks (network UU).`, { size: 12, fill: C.muted }));
  body.push(text(left + 2, fy + 61, `Circle radius: map distance from S − P, with P ${vp} km/s, S ${vs} km/s, depth ${depthKm} km (Quake Locator defaults).`, { size: 12, fill: C.muted }));
  const H = fy + 75;
  const out = card(W, H, 'Residuals: how far each circle misses',
    `A trial epicenter (green pin) ${TRIAL_KM} km from the best fit. Each station's distance circle misses it; the residuals are ${st.map((s) => `${s.sta} ${signed(s.r)} km`).join(', ')}, and their RMS is ${m.rmsKm.toFixed(1)} km.`);
  out.splice(3, 0, `<defs>${defs.join('')}</defs>`);
  const svg = [...out, ...body, '</svg>'].join('\n');
  return { svg, st, m, trial };
}

// ---------------------------------------------------------------------------
// L3: the misfit map
// ---------------------------------------------------------------------------

/** Replay locateGrid's three searches (it does not expose them) to draw the inset. */
function gridSearchSteps(o) {
  const c = centroid(o);
  const proj = localProjection(c.lat, c.lon);
  const search = (cx, cy, halfKm, stepKm) => {
    let best = { rmsKm: Infinity, x: cx, y: cy };
    const n = Math.round(halfKm / stepKm);
    for (let i = -n; i <= n; i++) {
      for (let j = -n; j <= n; j++) {
        const x = cx + i * stepKm;
        const y = cy + j * stepKm;
        const { lat, lon } = proj.toLatLon(x, y);
        const { rmsKm } = misfitAt(lat, lon, o, depthKm);
        if (rmsKm < best.rmsKm) best = { rmsKm, x, y };
      }
    }
    return best;
  };
  const coarse = search(0, 0, 300, 2);
  const fine = search(coarse.x, coarse.y, 4, 0.25);
  const finest = search(fine.x, fine.y, 0.5, 0.05);
  return { proj, coarse, fine, finest };
}

function misfitMapFigure() {
  const W = 760;
  const proj = localProjection(fit.lat, fit.lon);        // best fit at (0, 0)
  const level = fit.rmsKm + sigmaKm;
  const st = obs.map((o) => ({ ...o, ...proj.toXY(o.lat, o.lon) }));
  const off = proj.toXY(event.lat, event.lon);

  // main map
  const ext = { x0: -45, x1: 55, y0: -45, y1: 88 };
  const left = 12;
  const top = 44;
  const mapH = 476;
  const k = mapH / (ext.y1 - ext.y0);
  const mapW = (ext.x1 - ext.x0) * k;
  const X = (x) => left + (x - ext.x0) * k;
  const Y = (y) => top + (ext.y1 - y) * k;
  const g = misfitGrid(obs, proj, ext, 0.5);
  const size = regionSize(g, level);
  const body = [];
  const defs = [`<clipPath id="mm-map"><rect x="${left}" y="${top}" width="${r1(mapW)}" height="${mapH}" rx="4"/></clipPath>`];
  body.push(`<g clip-path="url(#mm-map)">`);
  body.push(...misfitBands(g, X, Y, { x: left, y: top, w: mapW, h: mapH }));
  body.push(...uncertaintyContour(g, level, X, Y));
  // inset frame on the main map: it holds the whole uncertainty region
  const ic = { x: 0.75, y: 0 };                          // inset centre, km from the best fit
  const ih = 6.5;                                        // inset half-width, km
  body.push(`<rect x="${r1(X(ic.x - ih))}" y="${r1(Y(ic.y + ih))}" width="${r1(2 * ih * k)}" height="${r1(2 * ih * k)}" fill="none" stroke="${C.text}" stroke-width="1" stroke-dasharray="3 2"/>`);
  body.push(officialStar(X(off.x), Y(off.y), 0.8));
  body.push(fitStar(X(0), Y(0), 0.8));
  for (const s of st) {
    body.push(triangle(X(s.x), Y(s.y), STA_COLOR[s.sta], 7));
    body.push(chip(X(s.x) + 11, Y(s.y) + 4.5, s.sta, { fill: STA_COLOR[s.sta] }));
  }
  body.push(...northArrow(left + 18, top + 10, '#ffffff'));
  body.push(...scaleBar(left + 12, top + mapH - 14, 20, k, '#ffffff'));
  body.push('</g>');
  body.push(`<rect x="${left}" y="${top}" width="${r1(mapW)}" height="${mapH}" rx="4" fill="none" stroke="${C.border}"/>`);
  // label the contour where it crosses the map's lower-left part (placed after a look at the render)
  {
    const rings = isoRings(g, level);
    // the westmost point of the contour: label just outside it
    let wx = Infinity;
    let wy = 0;
    for (const ring of rings) for (const [x, y] of ring) if (x < wx) { wx = x; wy = y; }
    body.push(chip(X(wx) - 8, Y(wy) + 4, 'rough uncertainty', { anchor: 'end' }));
  }

  // right column: colour bar, legend, inset
  const rx = left + mapW + 26;
  body.push(...colorBar(rx, top + 22, { horizontal: false, length: 176, thick: 16 }));
  body.push(text(rx + 44, top + 22 + 11, 'fits well', { size: 12, fill: C.muted, style: 'italic' }));
  body.push(text(rx + 44, top + 22 + 176 - 4, 'fits badly', { size: 12, fill: C.muted, style: 'italic' }));
  // legend
  const lx = rx + 150;
  let ly = top + 18;
  const legend = [
    [fitStar(lx + 8, ly - 4, 0.8), 'best fit (smallest RMS)'],
    [officialStar(lx + 8, ly - 4 + 26, 0.8), 'official epicenter'],
    [`<path d="M${lx} ${ly + 48}H${lx + 18}" stroke="#ffffff" stroke-width="4.5"/><path d="M${lx} ${ly + 48}H${lx + 18}" stroke="${C.text}" stroke-width="2"/>`, 'rough uncertainty:'],
    ['', `RMS ≤ best + ${sigmaKm.toFixed(1)} km`],
    [triangle(lx + 8, ly - 4 + 96, C.station, 7), 'station'],
  ];
  legend.forEach(([mark, label], i) => {
    if (mark) body.push(mark);
    body.push(text(lx + 26, ly + i * 24 - (i === 3 ? 6 : 0), esc(label), { size: 12, fill: i === 3 ? C.muted : C.text }));
  });

  // inset: the grid search near the best point
  const steps = gridSearchSteps(obs);
  const toFig = (x, y) => { const p = steps.proj.toLatLon(x, y); return proj.toXY(p.lat, p.lon); };
  const isz = 236;
  const il = rx;
  const it0 = top + mapH - isz;
  const ik = isz / (2 * ih);
  const IX = (x) => il + (x - ic.x + ih) * ik;
  const IY = (y) => it0 + (ic.y + ih - y) * ik;
  defs.push(`<clipPath id="mm-inset"><rect x="${il}" y="${it0}" width="${isz}" height="${isz}" rx="4"/></clipPath>`);
  body.push(text(il, it0 - 10, 'Zoom: coarse grid, then finer grids', { size: 13, weight: 600 }));
  const gi = misfitGrid(obs, proj, { x0: ic.x - ih, x1: ic.x + ih, y0: ic.y - ih, y1: ic.y + ih }, 0.1);
  body.push(`<g clip-path="url(#mm-inset)">`);
  body.push(...misfitBands(gi, IX, IY, { x: il, y: it0, w: isz, h: isz }));
  // 0.25 km grid: +-4 km around the best 2 km node
  {
    const n = Math.round(4 / 0.25);
    const parts = [];
    for (let i = -n; i <= n; i++) {
      const a = toFig(steps.coarse.x + i * 0.25, steps.coarse.y - 4);
      const b = toFig(steps.coarse.x + i * 0.25, steps.coarse.y + 4);
      const c = toFig(steps.coarse.x - 4, steps.coarse.y + i * 0.25);
      const d = toFig(steps.coarse.x + 4, steps.coarse.y + i * 0.25);
      parts.push(`M${r1(IX(a.x))} ${r1(IY(a.y))}L${r1(IX(b.x))} ${r1(IY(b.y))}M${r1(IX(c.x))} ${r1(IY(c.y))}L${r1(IX(d.x))} ${r1(IY(d.y))}`);
    }
    body.push(`<path d="${parts.join('')}" fill="none" stroke="${C.station}" stroke-width="0.5" opacity="0.45"/>`);
  }
  body.push(...uncertaintyContour(gi, level, IX, IY));
  // 2 km grid nodes
  {
    const dots = [];
    for (let i = -5; i <= 5; i++) {
      for (let j = -5; j <= 5; j++) {
        const p = toFig(steps.coarse.x + i * 2, steps.coarse.y + j * 2);
        if (Math.abs(p.x - ic.x) > ih + 0.5 || Math.abs(p.y - ic.y) > ih + 0.5) continue;
        const best = i === 0 && j === 0;
        dots.push(`<circle cx="${r1(IX(p.x))}" cy="${r1(IY(p.y))}" r="${best ? 5 : 3.2}" fill="${best ? C.text : '#ffffff'}" stroke="${C.text}" stroke-width="1.3"/>`);
      }
    }
    body.push(...dots);
  }
  // 0.05 km grid: a 1 km square around the best 0.25 km node
  {
    const a = toFig(steps.fine.x - 0.5, steps.fine.y + 0.5);
    const b = toFig(steps.fine.x + 0.5, steps.fine.y - 0.5);
    body.push(`<rect x="${r1(IX(a.x))}" y="${r1(IY(a.y))}" width="${r1(IX(b.x) - IX(a.x))}" height="${r1(IY(b.y) - IY(a.y))}" fill="none" stroke="${C.text}" stroke-width="1.6"/>`);
  }
  body.push(officialStar(IX(off.x), IY(off.y), 0.8));
  body.push(fitStar(IX(0), IY(0), 0.8));
  body.push('</g>');
  body.push(`<rect x="${il}" y="${it0}" width="${isz}" height="${isz}" rx="4" fill="none" stroke="${C.text}" stroke-width="1" stroke-dasharray="3 2"/>`);
  // inset key
  {
    const kx = il + isz + 12;
    let ky = it0 + 14;
    body.push(`<circle cx="${kx + 5}" cy="${ky - 4}" r="3.2" fill="#ffffff" stroke="${C.text}" stroke-width="1.3"/>`);
    body.push(text(kx + 14, ky, '2 km grid', { size: 12 }));
    ky += 16;
    body.push(`<circle cx="${kx + 5}" cy="${ky - 4}" r="5" fill="${C.text}" stroke="${C.text}" stroke-width="1.3"/>`);
    body.push(text(kx + 14, ky, 'its best', { size: 12 }));
    ky += 24;
    body.push(`<path d="M${kx} ${ky - 8}h10M${kx} ${ky - 4}h10M${kx} ${ky}h10M${kx + 1} ${ky - 10}v12M${kx + 5} ${ky - 10}v12M${kx + 9} ${ky - 10}v12" stroke="${C.station}" stroke-width="0.6" opacity="0.7"/>`);
    body.push(text(kx + 14, ky, '0.25 km', { size: 12 }));
    body.push(text(kx + 14, ky + 15, 'grid', { size: 12 }));
    ky += 38;
    body.push(`<rect x="${kx}" y="${ky - 10}" width="10" height="10" fill="none" stroke="${C.text}" stroke-width="1.6"/>`);
    body.push(text(kx + 14, ky, '0.05 km', { size: 12 }));
    body.push(text(kx + 14, ky + 15, 'grid', { size: 12 }));
  }

  const fy = top + mapH + 22;
  body.push(text(left + 2, fy, `Real data: M${event.mag.toFixed(1)} quake ${esc(event.place.replace(/^\d+ km \w+ of /, 'near '))}, ${event.id}; University of Utah analyst picks (network UU) at MTPU, TCRU and WCU.`, { size: 12, fill: C.muted }));
  body.push(text(left + 2, fy + 17, `The RMS of the three residuals at every point, with P ${vp} km/s, S ${vs} km/s, depth ${depthKm} km (Quake Locator defaults). Best fit: RMS ${fit.rmsKm.toFixed(1)} km.`, { size: 12, fill: C.muted }));
  const H = fy + 30;
  const out = card(W, H, 'The misfit map: Quake Locator’s grid search',
    'Map of the RMS misfit for every possible epicenter, light where the circles fit well and dark where they fit badly. A long light valley holds the best fit; the rough-uncertainty contour encloses the points within 1.5 km of the best RMS.');
  out.splice(3, 0, `<defs>${defs.join('')}</defs>`);
  return { svg: [...out, ...body, '</svg>'].join('\n'), size, level, off, steps };
}

// ---------------------------------------------------------------------------
// L4: station geometry (simulated picks)
// ---------------------------------------------------------------------------

/** Seeded uniform generator (mulberry32). */
function mulberry32(a) {
  return () => {
    a |= 0;
    a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
/** FNV-1a hash of a string (the station name seeds its own pick error). */
function hash(s) {
  let h = 2166136261;
  for (const c of s) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); }
  return h >>> 0;
}
/** Standard normal number from a seed (Box-Muller). */
function gauss(seed) {
  const r = mulberry32(seed);
  const u = Math.max(r(), 1e-12);
  const v = r();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}
const SIM_SEED = 1;
const SIM_SIGMA_SEC = 0.1;

/** S - P from the official epicenter at the app's depth, plus a fixed random pick error; rounded to 0.01 s. */
function simulate(stas) {
  return stas.map((sta) => {
    const s = stationAt(sta);
    const epi = distanceKm(event.lat, event.lon, s.lat, s.lon);
    const hypo = Math.hypot(epi, depthKm);
    const err = SIM_SIGMA_SEC * gauss(hash(sta) ^ SIM_SEED);
    const spSec = Math.round((hypo / kps + err) * 100) / 100;
    return { sta, lat: s.lat, lon: s.lon, spSec, err, epiTrue: epi, distKm: spToDistanceKm(spSec, vp, vs) };
  });
}

function geometryFigure() {
  const W = 760;
  const proj = localProjection(event.lat, event.lon);    // official epicenter at (0, 0)
  const half = 60;
  const ext = { x0: -half, x1: half, y0: -half, y1: half };
  const pad = 12;
  const gap = 14;
  const pw = (W - 2 * pad - gap) / 2;
  const k = pw / (2 * half);
  const top = 110;
  const panels = [
    { id: 'a', title: '(a) Stations on one side', stas: ['SUU', 'ELU', 'TMU', 'SGU', 'WCU'] },
    { id: 'b', title: '(b) Stations all around', stas: ['MTPU', 'MSU', 'TCRU', 'FOR6', 'DWU'] },
  ];
  const body = [];
  const defs = [];
  const results = [];
  body.push(text(12, 42, 'The same quake located twice, each time with five stations. (a) the stand-ins for the five UHSN schools,', { size: 12, fill: C.muted }));
  body.push(text(12, 58, 'all north of the quake; (b) helper stations on several sides of it.', { size: 12, fill: C.muted }));
  panels.forEach((panel, pi) => {
    const left = pad + pi * (pw + gap);
    const X = (x) => left + (x - ext.x0) * k;
    const Y = (y) => top + (ext.y1 - y) * k;
    const o = simulate(panel.stas);
    const f = locateGrid(o, { depthKm, sigmaKm });
    const level = f.rmsKm + sigmaKm;
    const g = misfitGrid(o, proj, ext, 0.5);
    const size = regionSize(g, level);
    const pf = proj.toXY(f.lat, f.lon);
    results.push({ ...panel, o, f, size, pf, level });
    defs.push(`<clipPath id="geo-${panel.id}"><rect x="${r1(left)}" y="${top}" width="${r1(pw)}" height="${r1(pw)}" rx="4"/></clipPath>`);
    body.push(text(left + 2, top - 24, esc(panel.title), { size: 14, weight: 600 }));
    body.push(text(left + 2, top - 8, `rough uncertainty: about ${Math.round(size.longKm)} km by ${Math.round(size.shortKm)} km`, { size: 12, fill: C.text }));
    body.push(`<g clip-path="url(#geo-${panel.id})">`);
    body.push(...misfitBands(g, X, Y, { x: left, y: top, w: pw, h: pw }));
    body.push(...uncertaintyContour(g, level, X, Y));
    body.push(officialStar(X(0), Y(0), 0.62));
    body.push(fitStar(X(pf.x), Y(pf.y), 0.4));
    const outside = [];
    for (const s of o) {
      const p = proj.toXY(s.lat, s.lon);
      if (Math.abs(p.x) <= half - 3 && Math.abs(p.y) <= half - 3) {
        body.push(triangle(X(p.x), Y(p.y), C.station, 7));
        body.push(chip(X(p.x) + 11, Y(p.y) + 4.5, s.sta, { fill: C.station }));
      } else outside.push({ ...s, ...p, distKm: s.epiTrue });
    }
    body.push(...northArrow(left + 18, top + 10, '#ffffff'));
    body.push(...scaleBar(left + 12, top + pw - 14, 20, k, '#ffffff'));
    body.push(...edgeArrows(outside, { x: left, y: top, w: pw, h: pw }, X, Y, half,
      { avoid: [{ x0: left, x1: left + 34, y0: top, y1: top + 44 }] }));
    body.push('</g>');
    body.push(`<rect x="${r1(left)}" y="${top}" width="${r1(pw)}" height="${r1(pw)}" rx="4" fill="none" stroke="${C.border}"/>`);
  });

  // shared colour bar and legend under the panels
  const by = top + pw + 40;
  body.push(...colorBar(pad + 2, by, { horizontal: true, length: 308, thick: 14 }));
  const lx = pad + 350;
  body.push(officialStar(lx + 8, by + 3, 0.8));
  body.push(text(lx + 24, by + 8, 'true epicenter (used to make the picks)', { size: 12 }));
  body.push(fitStar(lx + 8, by + 25, 0.55));
  body.push(text(lx + 24, by + 30, 'best fit from the simulated picks', { size: 12 }));
  body.push(`<path d="M${lx} ${by + 48}H${lx + 16}" stroke="#ffffff" stroke-width="4.5"/><path d="M${lx} ${by + 48}H${lx + 16}" stroke="${C.text}" stroke-width="2"/>`);
  body.push(text(lx + 24, by + 52, `rough uncertainty (RMS ≤ best + ${sigmaKm.toFixed(1)} km)`, { size: 12 }));
  body.push(`<path d="M${lx + 2} ${by + 70}H${lx + 12}" stroke="${C.station}" stroke-width="2.2"/>` + arrowHead(lx + 18, by + 70, 0, C.station, 9, 5));
  body.push(text(lx + 24, by + 74, 'station off the map: distance from the quake', { size: 12 }));
  const fy = by + 100;
  body.push(text(pad + 2, fy, `Simulated: S − P from the true epicenter at ${depthKm} km depth (P ${vp} km/s, S ${vs} km/s), plus a random pick error`, { size: 12, fill: C.muted }));
  body.push(text(pad + 2, fy + 17, `(about ${SIM_SIGMA_SEC} s) at each station; located at the same depth. Station positions: University of Utah network (UU).`, { size: 12, fill: C.muted }));
  const H = fy + 30;
  const out = card(W, H, 'Where the stations sit matters (simulated picks)',
    'Two misfit maps of the same quake with simulated picks. Five stations all to the north give a long valley and a long uncertainty region; five stations around the quake give a small, round one.');
  out.splice(3, 0, `<defs>${defs.join('')}</defs>`);
  return { svg: [...out, ...body, '</svg>'].join('\n'), results };
}

// ---------------------------------------------------------------------------

const L2 = residualsFigure();
const L3 = misfitMapFigure();
const L4 = geometryFigure();
const files = { 'residuals.svg': L2.svg, 'misfit-map.svg': L3.svg, 'station-geometry.svg': L4.svg };
for (const [name, svg] of Object.entries(files)) {
  fs.writeFileSync(new URL(name, outDir), svg + '\n');
  console.log(`wrote docs/theory/img/${name} (${(svg.length / 1024).toFixed(0)} KB)`);
}

console.log(`best fit ${fit.lat.toFixed(4)}, ${fit.lon.toFixed(4)}, RMS ${fit.rmsKm.toFixed(2)} km, ` +
  `${distanceKm(fit.lat, fit.lon, event.lat, event.lon).toFixed(1)} km from the official epicenter; uncertainty (locateGrid) ±${fit.uncertaintyKm.toFixed(1)} km`);
console.log(`L2 trial point (${L2.trial.x.toFixed(2)}, ${L2.trial.y.toFixed(2)}) km from the best fit, RMS ${L2.m.rmsKm.toFixed(2)} km`);
for (const s of L2.st) {
  console.log(`  ${s.sta}: S-P ${s.spSec.toFixed(2)} s, d ${s.distKm.toFixed(2)} km, circle ${s.epiKm.toFixed(2)} km, ` +
    `from pin ${s.epiFromPin.toFixed(2)} km (hypo ${s.hypoFromPin.toFixed(2)}), residual ${s.r.toFixed(2)} km, ` +
    `drawn segment ${s.segKm.toFixed(2)} km, difference ${(s.segKm - Math.abs(s.r)).toFixed(2)} km`);
}
console.log(`L3 contour RMS ${L3.level.toFixed(2)} km: region ${L3.size.longKm.toFixed(1)} x ${L3.size.shortKm.toFixed(1)} km, long axis az ${L3.size.azLongDeg.toFixed(0)} deg${L3.size.touches ? ' (touches the grid edge!)' : ''}`);
{
  const s = L3.steps;
  const fin = s.proj.toLatLon(s.finest.x, s.finest.y);
  console.log(`L3 grid replay: finest ${fin.lat.toFixed(5)}, ${fin.lon.toFixed(5)} vs locateGrid ${fit.lat.toFixed(5)}, ${fit.lon.toFixed(5)}`);
}
for (const r of L4.results) {
  console.log(`L4 (${r.id}) ${r.o.map((s) => `${s.sta} ${s.spSec.toFixed(2)} s (err ${signed(s.err, 3)})`).join(', ')}`);
  console.log(`   best fit ${Math.hypot(r.pf.x, r.pf.y).toFixed(2)} km from true, RMS ${r.f.rmsKm.toFixed(2)} km, contour ${r.level.toFixed(2)} km: ` +
    `${r.size.longKm.toFixed(1)} x ${r.size.shortKm.toFixed(1)} km (long axis az ${r.size.azLongDeg.toFixed(0)} deg)` +
    `${r.size.touches ? ' (touches the map edge!)' : ''}; locateGrid ±${r.f.uncertaintyKm.toFixed(1)} km${r.f.unbounded ? ' unbounded' : ''}`);
}
