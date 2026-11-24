// Make the diagram figures for the theory pages (docs/theory/img/).
//
//   node tools/figures/science-diagrams.mjs
//
// depth-triangle.svg   "Depth: the hidden triangle" on the S-minus-P page
// circles-1-2-3.svg    one, two, three stations on the "Locating a quake" page
//
// The circles figure uses the offline sample (docs/app/data/samples/uu80162166),
// the University of Utah analysts' picks and the app's own locate/geo code with
// the Wave Race defaults, so the circles are the ones Wave Race draws.
// Output: plain SVG with a white background (readable in light and dark docs themes).
import fs from 'node:fs';

const { spToDistanceKm, hypoToEpiKm, locateGrid, kmPerSecond } = await import('../../docs/app/js/lib/locate.js');
const { localProjection } = await import('../../docs/app/js/lib/geo.js');
const { picksByStation } = await import('../../docs/app/js/lib/fdsn.js');
const { WAVE_RACE } = await import('../../docs/app/js/config.js');

const outDir = new URL('../../docs/theory/img/', import.meta.url);
fs.mkdirSync(outDir, { recursive: true });

// House style (same constants as trace-figures.mjs).
const C = { bg: '#ffffff', text: '#111827', muted: '#5b6472', border: '#d9dde3', grid: '#e8ebef',
  p: '#1d4ed8', s: '#c0262d', quake: '#f59e0b', quakeEdge: '#b45309',
  rock: '#f1ece2', ground: '#a39478', map: '#f3efe4', unused: '#9aa1ac', station: '#374151' };
const STA_COLOR = { MTPU: '#0d9488', TCRU: '#6b7a00', WCU: '#7c3aed' };
const FONT = 'font-family="system-ui, -apple-system, Segoe UI, Roboto, sans-serif"';
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => `&#${c.charCodeAt(0)};`);
const r1 = (v) => Math.round(v * 10) / 10;
const it = (s) => `<tspan font-style="italic">${s}</tspan>`;   // a maths variable
/** Subscript s, then the rest of the text back on the baseline. */
const sub = (s, rest, size = 12, shift = 5) =>
  `<tspan dy="${shift}" font-size="${size}">${s}</tspan><tspan dy="${-shift}">${rest}</tspan>`;

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

/** Star (n points) or burst (many points) centred on (cx, cy). */
function star(cx, cy, ro, ri, n = 5) {
  const pts = [];
  for (let i = 0; i < 2 * n; i++) {
    const r = i % 2 ? ri : ro;
    const a = (-90 + (i * 180) / n) * Math.PI / 180;
    pts.push(`${r1(cx + r * Math.cos(a))},${r1(cy + r * Math.sin(a))}`);
  }
  return `<polygon points="${pts.join(' ')}" fill="${C.quake}" stroke="${C.quakeEdge}" stroke-width="1.2" stroke-linejoin="round"/>`;
}

/** Station triangle. base: true = base sits on y (cross-section), false = centred on y (map). */
function triangle(x, y, color, size = 10, base = false) {
  const h = size * 1.6;
  const yTop = base ? y - h : y - h * 0.62;
  const yBot = base ? y : y + h * 0.38;
  return `<polygon points="${r1(x)},${r1(yTop)} ${r1(x - size)},${r1(yBot)} ${r1(x + size)},${r1(yBot)}" fill="${color}" stroke="#ffffff" stroke-width="1.2" stroke-linejoin="round"/>`;
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

// ---------------------------------------------------------------------------
// Figure 1: the hidden triangle
// ---------------------------------------------------------------------------

function depthTriangle() {
  const W = 760;
  const L = 12;
  const R = W - 12;
  const body = [];

  // --- main panel: a sketch, not to scale ---
  const gy = 90;             // ground surface
  const ex = 200;            // epicenter
  const sx = 580;            // station
  const hy = gy + 124;       // hypocenter
  const rockBottom = hy + 30;
  body.push(`<rect x="${L}" y="${gy}" width="${R - L}" height="${rockBottom - gy}" fill="${C.rock}"/>`);
  body.push(line(L, gy, R, gy, C.ground, 1.5));
  // the three sides
  body.push(line(ex, gy, ex, hy, C.muted, 2, 'stroke-dasharray="7 5"'));
  body.push(line(ex, hy, sx, gy, C.text, 2.5, 'stroke-linecap="round"'));
  body.push(line(ex, gy, sx, gy, C.text, 4, 'stroke-linecap="round"'));
  // right angle at the epicenter
  const ra = 16;
  body.push(`<path d="M${ex + ra} ${gy}V${gy + ra}H${ex}" fill="none" stroke="${C.text}" stroke-width="1.5"/>`);
  body.push(star(ex, gy, 12, 5));
  body.push(star(ex, hy, 14, 7, 10));
  body.push(triangle(sx, gy, C.station, 11, true));

  body.push(text(ex, gy - 20, 'epicenter', { size: 14, weight: 600, anchor: 'middle' }));
  body.push(text(sx, gy - 26, 'station', { size: 14, weight: 600, anchor: 'middle' }));
  body.push(text(ex - 22, hy + 5, 'hypocenter', { size: 14, weight: 600, anchor: 'end', halo: C.rock }));
  body.push(text(ex - 14, (gy + hy) / 2 + 5, `${it('z')}: depth`, { size: 14, weight: 600, anchor: 'end', fill: C.muted, halo: C.rock }));
  // d along the slanted side, just inside the triangle
  {
    const ang = Math.atan2(gy - hy, sx - ex);           // negative: rising to the right
    const ux = Math.cos(ang);
    const uy = Math.sin(ang);
    const nx = uy;                                       // normal towards the right angle
    const ny = -ux;
    const off = 9;
    const mx = (ex + sx) / 2 + 30 * ux + off * nx;
    const my = (gy + hy) / 2 + 30 * uy + off * ny;
    body.push(text(mx, my, `${it('d')}: from S − P`, { size: 14, weight: 600, anchor: 'middle',
      rotate: (ang * 180) / Math.PI, halo: C.rock }));
  }
  body.push(text((ex + sx) / 2 + 12, gy - 11, `${it('d')}${sub('surface', ': on the map')}`, { size: 14, weight: 600, anchor: 'middle', halo: C.bg }));
  body.push(text(R - 10, rockBottom - 10, 'sketch, not to scale', { size: 12, anchor: 'end', fill: C.muted, style: 'italic' }));

  // formula under the panel
  const fy = rockBottom + 32;
  body.push(text((ex + sx) / 2, fy, `${it('d')}${sub('surface', ` = √(${it('d')}² − ${it('z')}²)`, 13, 5)}`, { size: 18, weight: 600, anchor: 'middle' }));

  // --- two rows drawn to one scale ---
  const divY = fy + 22;
  body.push(line(L, divY, R, divY, C.grid, 1));
  const kmPx = 8;                       // one scale for both rows
  const x0 = 92;                        // epicenter x in both rows
  const zKm = 8;
  const rows = [
    { name: 'Near station', dKm: 10 },
    { name: 'Far station', dKm: 80 },
  ];
  let y = divY + 26;
  for (const row of rows) {
    const epi = hypoToEpiKm(row.dKm, zKm);
    const epiLabel = Number.isInteger(r1(epi)) ? String(r1(epi)) : r1(epi).toFixed(1);
    body.push(text(L + 8, y, `${row.name}: ${it('d')} = ${row.dKm} km, ${it('z')} = ${zKm} km → <tspan font-weight="700">${epiLabel} km on the map</tspan>`, { size: 13, weight: 600 }));
    const g = y + 30;
    const h = g + zKm * kmPx;
    const s = x0 + epi * kmPx;
    const bottom = h + 12;
    body.push(`<rect x="${L}" y="${g}" width="${R - L}" height="${bottom - g}" fill="${C.rock}"/>`);
    body.push(line(L, g, R, g, C.ground, 1.5));
    body.push(line(x0, g, x0, h, C.muted, 1.8, 'stroke-dasharray="5 4"'));
    body.push(line(x0, h, s, g, C.text, 2, 'stroke-linecap="round"'));
    body.push(line(x0, g, s, g, C.text, 3.5, 'stroke-linecap="round"'));
    body.push(`<path d="M${x0 + 7} ${g}V${g + 7}H${x0}" fill="none" stroke="${C.text}" stroke-width="1.2"/>`);
    body.push(star(x0, g, 8, 3.4));
    body.push(star(x0, h, 9, 4.5, 10));
    body.push(triangle(s, g, C.station, 7, true));
    body.push(text(x0 - 12, (g + h) / 2 + 4, `${it('z')} = ${zKm} km`, { size: 12, weight: 600, anchor: 'end', fill: C.muted, halo: C.rock }));
    if (epi < 20) {
      // steep and small: labels beside it
      body.push(text((x0 + s) / 2, g - 7, `${epiLabel} km`, { size: 12, weight: 600, anchor: 'middle', halo: C.bg }));
      body.push(text(x0 + (s - x0) * 0.5 + 14, (g + h) / 2 + 12, `${it('d')} = ${row.dKm} km`, { size: 12, weight: 600, halo: C.rock }));
    } else {
      body.push(text((x0 + s) / 2, g - 7, `${epiLabel} km on the map`, { size: 12, weight: 600, anchor: 'middle', halo: C.bg }));
      const ang = Math.atan2(g - h, s - x0);
      const ux = Math.cos(ang);
      const uy = Math.sin(ang);
      const off = 15;                    // below the line, outside the triangle
      const mx = (x0 + s) / 2 - off * uy;
      const my = (g + h) / 2 + off * ux;
      body.push(text(mx, my, `${it('d')} = ${row.dKm} km`, { size: 12, weight: 600, anchor: 'middle',
        rotate: (ang * 180) / Math.PI, halo: C.rock }));
    }
    y = bottom + 30;
  }
  // scale bar
  const sbY = y - 4;
  const sbKm = 20;
  body.push(`<path d="M${x0} ${sbY - 5}V${sbY}H${x0 + sbKm * kmPx}V${sbY - 5}M${x0 + (sbKm / 2) * kmPx} ${sbY}V${sbY - 4}" fill="none" stroke="${C.text}" stroke-width="1.5"/>`);
  body.push(text(x0, sbY + 15, '0', { size: 12, anchor: 'middle', fill: C.muted }));
  body.push(text(x0 + (sbKm / 2) * kmPx, sbY + 15, '10', { size: 12, anchor: 'middle', fill: C.muted }));
  body.push(text(x0 + sbKm * kmPx, sbY + 15, '20 km', { size: 12, anchor: 'middle', fill: C.muted }));
  body.push(text(x0 + sbKm * kmPx + 34, sbY + 1, 'Both rows are drawn to this one scale.', { size: 12, fill: C.muted }));

  const H = sbY + 28;
  const out = card(W, H, 'The hidden triangle',
    'S minus P gives the slanted distance d from the hypocenter to the station; the map needs the surface distance, sqrt(d^2 - z^2).');
  return [...out, ...body, '</svg>'].join('\n');
}

// ---------------------------------------------------------------------------
// Figure 2: one, two, three stations (real data)
// ---------------------------------------------------------------------------

const ID = 'uu80162166';
const sampleDir = new URL(`../../docs/app/data/samples/${ID}/`, import.meta.url);
const event = JSON.parse(fs.readFileSync(new URL('event.json', sampleDir)));
const stationList = JSON.parse(fs.readFileSync(new URL('stations.json', sampleDir)));
const picks = picksByStation(JSON.parse(fs.readFileSync(new URL('picks.json', sampleDir))));
const { vp, vs, depthKm, pickUncertaintySec } = WAVE_RACE;

const STAS = ['TCRU', 'MTPU', 'WCU'];      // the order they are added
const obs = STAS.map((sta) => {
  const st = stationList.find((s) => s.sta === sta);
  const p = picks[`UU.${sta}`];
  const pSec = (p.P - event.timeMs) / 1000;
  const sSec = (p.S - event.timeMs) / 1000;
  const distKm = spToDistanceKm((p.S - p.P) / 1000, vp, vs);
  return { sta, lat: st.lat, lon: st.lon, pSec, sSec, distKm, epiKm: hypoToEpiKm(distKm, depthKm) };
});
const fit = locateGrid(obs, { depthKm, sigmaKm: pickUncertaintySec * kmPerSecond(vp, vs) });

/** The two points where circles a and b cross (km plane), or []. */
function crossings(a, b) {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const d = Math.hypot(dx, dy);
  if (d > a.r + b.r || d < Math.abs(a.r - b.r)) return [];
  const t = (d * d + a.r * a.r - b.r * b.r) / (2 * d);
  const h = Math.sqrt(Math.max(0, a.r * a.r - t * t));
  const mx = a.x + (dx * t) / d;
  const my = a.y + (dy * t) / d;
  return [{ x: mx + (dy * h) / d, y: my - (dx * h) / d }, { x: mx - (dy * h) / d, y: my + (dx * h) / d }];
}

function circles123() {
  const W = 760;
  const pad = 12;
  const gap = 10;
  const proj = localProjection(fit.lat, fit.lon);   // best fit at (0, 0)
  const st = obs.map((o) => ({ ...o, ...proj.toXY(o.lat, o.lon), r: o.epiKm }));
  const by = Object.fromEntries(st.map((s) => [s.sta, s]));
  const cross = crossings(by.TCRU, by.MTPU);

  // Map extent (km from the best fit, north up): the whole TCRU and MTPU circles,
  // WCU's station; most of WCU's big circle is cut off.
  const ext = { x0: -51, x1: 53, y0: -61, y1: 87 };
  const pw = (W - 2 * pad - 2 * gap) / 3;
  const k = pw / (ext.x1 - ext.x0);                 // px per km
  const ph = k * (ext.y1 - ext.y0);
  const top = 56;

  const panels = [
    { title: 'One station', use: ['TCRU'] },
    { title: 'Two stations', use: ['TCRU', 'MTPU'] },
    { title: 'Three stations', use: ['TCRU', 'MTPU', 'WCU'] },
  ];
  const body = [];
  const defs = [];
  panels.forEach((panel, i) => {
    const left = pad + i * (pw + gap);
    const X = (x) => left + (x - ext.x0) * k;
    const Y = (y) => top + (ext.y1 - y) * k;
    defs.push(`<clipPath id="map-${i}"><rect x="${r1(left)}" y="${top}" width="${r1(pw)}" height="${r1(ph)}" rx="4"/></clipPath>`);
    body.push(text(left + 2, top - 10, esc(panel.title), { size: 14, weight: 600 }));
    body.push(`<g clip-path="url(#map-${i})">`);
    body.push(`<rect x="${r1(left)}" y="${top}" width="${r1(pw)}" height="${r1(ph)}" fill="${C.map}"/>`);
    for (const s of st) {
      if (!panel.use.includes(s.sta)) continue;
      body.push(`<circle cx="${r1(X(s.x))}" cy="${r1(Y(s.y))}" r="${r1(s.r * k)}" fill="none" stroke="${STA_COLOR[s.sta]}" stroke-width="2.2"/>`);
    }
    if (panel.use.length === 1) {
      const s = by.TCRU;
      body.push(text(X(s.x), Y(s.y) + 34, 'the quake is', { size: 12, weight: 600, anchor: 'middle', fill: C.text, halo: C.map }));
      body.push(text(X(s.x), Y(s.y) + 49, 'somewhere on', { size: 12, weight: 600, anchor: 'middle', fill: C.text, halo: C.map }));
      body.push(text(X(s.x), Y(s.y) + 64, 'this circle', { size: 12, weight: 600, anchor: 'middle', fill: C.text, halo: C.map }));
    }
    if (panel.use.length === 2) {
      const s = by.TCRU;
      body.push(text(X(s.x), Y(s.y) + 34, 'either ? could', { size: 12, weight: 600, anchor: 'middle', halo: C.map }));
      body.push(text(X(s.x), Y(s.y) + 49, 'be the quake', { size: 12, weight: 600, anchor: 'middle', halo: C.map }));
      // label each crossing on the side away from the other one
      const [a, b] = cross;
      for (const [p, q] of [[a, b], [b, a]]) {
        const dx = X(p.x) - X(q.x);
        const dy = Y(p.y) - Y(q.y);
        const n = Math.hypot(dx, dy);
        body.push(`<circle cx="${r1(X(p.x))}" cy="${r1(Y(p.y))}" r="4.5" fill="#ffffff" stroke="${C.text}" stroke-width="1.8"/>`);
        body.push(text(X(p.x) + (dx / n) * 15, Y(p.y) + (dy / n) * 15 + 6, '?', { size: 17, weight: 700, anchor: 'middle', halo: '#ffffff' }));
      }
    }
    if (panel.use.length === 3) {
      body.push(star(X(0), Y(0), 11, 4.6));
      body.push(text(X(0) + 8, Y(0) + 22, 'quake', { size: 13, weight: 700, halo: C.map }));
    }
    for (const s of st) {
      const used = panel.use.includes(s.sta);
      const color = used ? STA_COLOR[s.sta] : C.unused;
      body.push(triangle(X(s.x), Y(s.y), color, 7));
      body.push(text(X(s.x) + 10, Y(s.y) + 4.5, s.sta, { size: 12, weight: 700, fill: color, halo: C.map }));
    }
    // north arrow (top left) and 20 km scale bar (bottom left)
    const nx = left + 16;
    const ny = top + 12;
    body.push(`<path d="M${nx} ${ny + 14}L${nx + 5.5} ${ny + 28}L${nx} ${ny + 24.5}L${nx - 5.5} ${ny + 28}Z" fill="${C.text}"/>`);
    body.push(text(nx, ny + 10, 'N', { size: 12, weight: 700, anchor: 'middle' }));
    const sbx = left + 10;
    const sby = top + ph - 12;
    const sbw = 20 * k;
    body.push(`<path d="M${r1(sbx)} ${r1(sby - 5)}V${r1(sby)}H${r1(sbx + sbw)}V${r1(sby - 5)}" fill="none" stroke="${C.text}" stroke-width="1.5"/>`);
    body.push(text(sbx + sbw + 6, sby + 1, '20 km', { size: 12, fill: C.text }));
    body.push('</g>');
    body.push(`<rect x="${r1(left)}" y="${top}" width="${r1(pw)}" height="${r1(ph)}" rx="4" fill="none" stroke="${C.border}"/>`);
  });

  const fy = top + ph + 22;
  body.push(text(pad + 2, fy, `Real data: M${event.mag.toFixed(1)} quake ${esc(event.place.replace(/^\d+ km \w+ of /, 'near '))}, ${event.id}; University of Utah analyst picks (network UU).`, { size: 12, fill: C.muted }));
  body.push(text(pad + 2, fy + 17, `Circle radius: map distance from S − P, with P ${vp} km/s, S ${vs} km/s, depth ${depthKm} km (Wave Race defaults). Star: best fit.`, { size: 12, fill: C.muted }));
  const H = fy + 30;
  const out = card(W, H, 'Distance circles: one, two, three stations',
    'Distance circles from S minus P times at stations TCRU, MTPU and WCU: one circle, then two crossing points, then one meeting point.');
  out.splice(3, 0, `<defs>${defs.join('')}</defs>`);
  return { svg: [...out, ...body, '</svg>'].join('\n'), st, cross };
}

const fig1 = depthTriangle();
const { svg: fig2, st, cross } = circles123();
const files = { 'depth-triangle.svg': fig1, 'circles-1-2-3.svg': fig2 };
for (const [name, svg] of Object.entries(files)) {
  fs.writeFileSync(new URL(name, outDir), svg + '\n');
  console.log(`wrote docs/theory/img/${name} (${(svg.length / 1024).toFixed(0)} KB)`);
}
for (const s of st) {
  console.log(`${s.sta}: P ${s.pSec.toFixed(2)} s, S ${s.sSec.toFixed(2)} s, S-P ${(s.sSec - s.pSec).toFixed(2)} s, ` +
    `d ${s.distKm.toFixed(1)} km, circle ${s.epiKm.toFixed(1)} km, at x ${s.x.toFixed(1)} y ${s.y.toFixed(1)} km`);
}
console.log(`TCRU x MTPU crossings: ${cross.map((p) => `(${p.x.toFixed(1)}, ${p.y.toFixed(1)})`).join(' ')} km`);
console.log(`best fit ${fit.lat.toFixed(4)}, ${fit.lon.toFixed(4)}, RMS ${fit.rmsKm.toFixed(2)} km, ` +
  `residuals ${fit.residualsKm.map((r) => r.toFixed(2)).join(' ')} km, ±${fit.uncertaintyKm.toFixed(1)} km`);
