// Make the diagrams for the "Reading a seismogram" page (docs/theory/img/).
//
//   node tools/figures/seismogram-diagrams.mjs
//
// frequency-ruler.svg     W3: which sources shake the ground at which frequencies
// seismometer-inside.svg  W4: mass, spring, magnet and coil -> voltage -> digitizer -> counts
//
// The ruler's ranges are approximate (typical values from the page's examples; the ocean hum
// band was checked on station TMU's spectrum). The seismometer is a generic geophone, not a
// particular model. Output: plain SVG with a white background.
import fs from 'node:fs';
import { C, r1 } from './svg-traces.mjs';
import { card, text } from './svg-charts.mjs';

const outDir = new URL('../../docs/theory/img/', import.meta.url);
fs.mkdirSync(outDir, { recursive: true });
const write = (name, svg) => {
  fs.writeFileSync(new URL(name, outDir), svg + '\n');
  console.log(`wrote docs/theory/img/${name} (${(svg.length / 1024).toFixed(0)} KB)`);
};
const line = (x1, y1, x2, y2, stroke, w = 1.5, extra = '') =>
  `<line x1="${r1(x1)}" y1="${r1(y1)}" x2="${r1(x2)}" y2="${r1(y2)}" stroke="${stroke}" stroke-width="${w}"${extra ? ' ' + extra : ''}/>`;
const arrowDef = (id, color) => `<marker id="${id}" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill="${color}"/></marker>`;

// ---------------------------------------------------------------------------------------------
// W3 Frequency ruler
function ruler() {
  const width = 760;
  const padL = 16;
  const padR = 16;
  const fMin = 0.02;
  const fMax = 100;
  const w = width - padL - padR;
  const x = (f) => padL + (Math.log10(f / fMin) / Math.log10(fMax / fMin)) * w;
  const top = 44;
  const rowH = 34;
  // sources: [label, from Hz, to Hz, colour]; one row each
  const sources = [
    ['Ocean hum (storms at sea)', 0.05, 0.3, '#0e7490'],
    ['Distant big quakes', 0.02, 2, '#6d28d9'],
    ['Nearby small quakes', 1, 20, '#c0262d'],
    ['Wind', 0.5, 50, '#0f766e'],
    ['People and machines', 1, 50, '#b45309'],
  ];
  const plotH = sources.length * rowH + 10;
  const axisY = top + plotH;
  const height = axisY + 118;
  const out = card(width, height, 'What shakes the ground at which frequency?');
  out.splice(1, 0, `<defs>${arrowDef('rarrow', C.muted)}</defs>`);
  // the 1-10 Hz filter band and the wall at 50 Hz
  out.push(`<rect x="${r1(x(1))}" y="${top - 6}" width="${r1(x(10) - x(1))}" height="${plotH + 6}" fill="rgba(29,78,216,0.08)" stroke="${C.p}" stroke-dasharray="5 4"/>`);
  out.push(text((x(1) + x(10)) / 2, top - 12, 'kept by a 1–10 Hz filter', { size: 12.5, weight: 700, fill: C.p, anchor: 'middle' }));
  out.push(`<rect x="${r1(x(50))}" y="${top - 6}" width="${r1(x(fMax) - x(50))}" height="${plotH + 6}" fill="url(#hatch)"/>`);
  out.splice(2, 0, `<defs><pattern id="hatch" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="8" height="8" fill="#f3f4f6"/><line x1="0" y1="0" x2="0" y2="8" stroke="#d1d5db" stroke-width="3"/></pattern></defs>`);
  out.push(line(x(50), top - 6, x(50), axisY, C.note, 2.5));
  out.push(text(x(50) - 6, top + 12, '50 Hz: the limit for', { size: 12, weight: 600, anchor: 'end', halo: true }));
  out.push(text(x(50) - 6, top + 27, '100 samples per second', { size: 12, weight: 600, anchor: 'end', halo: true }));
  // grid
  const ticks = [0.02, 0.05, 0.1, 0.2, 0.5, 1, 2, 5, 10, 20, 50, 100];
  for (const f of ticks) out.push(line(x(f), top - 6, x(f), axisY, C.grid, 1));
  // source bars
  sources.forEach(([label, a, b, color], i) => {
    const y = top + i * rowH + 8;
    out.push(`<rect x="${r1(x(a))}" y="${r1(y)}" width="${r1(x(b) - x(a))}" height="14" rx="7" fill="${color}"/>`);
    const right = x(b) + 8;
    const fits = right + label.length * 7.2 < x(50) - 4;
    out.push(fits ? text(right, y + 12, label, { size: 13, weight: 600, halo: true })
      : text(x(a) - 8, y + 12, label, { size: 13, weight: 600, anchor: 'end', halo: true }));
  });
  // axis: frequency, then the time for one wave, then the wavelength of a 6 km/s P wave
  out.push(line(padL, axisY, padL + w, axisY, C.muted, 1));
  const fmt = (v) => (v >= 1 ? String(v) : String(v).replace(/^0/, '0'));
  const rows = [
    ['frequency (vibrations per second, Hz)', (f) => `${fmt(f)}`],
    ['time for one wave', (f) => { const T = 1 / f; return T >= 1 ? `${+T.toFixed(1)} s` : `${+T.toFixed(2)} s`; }],
    ['length of one P wave at 6 km/s', (f) => { const L = 6 / f; return L >= 1 ? `${+L.toFixed(L >= 10 ? 0 : 1)} km` : `${Math.round(L * 1000)} m`; }],
  ];
  const show = [0.05, 0.1, 0.2, 0.5, 1, 2, 5, 10, 20, 50];
  rows.forEach(([label, fn], r) => {
    const y = axisY + 18 + r * 32;
    for (const f of show) out.push(text(x(f), y, fn(f), { size: 12, fill: r ? C.muted : C.note, weight: r ? 400 : 600, anchor: 'middle' }));
    out.push(text(padL, y + 14, label, { size: 11.5, fill: C.muted }));
  });
  out.push(text(padL + w, axisY + 18 + 3 * 32 - 4, 'low notes ←   → high notes', { size: 12, fill: C.muted, anchor: 'end' }));
  out.push('</svg>');
  return out.join('\n');
}

// ---------------------------------------------------------------------------------------------
// W4 Inside a seismometer
function seismometer() {
  const width = 760;
  const height = 400;
  const out = card(width, height, 'How a seismometer turns shaking into numbers');
  out.splice(1, 0, `<defs>${arrowDef('a-note', C.note)}${arrowDef('a-p', C.p)}</defs>`);
  // ground
  const gy = 280;
  out.push(`<rect x="14" y="${gy}" width="300" height="34" fill="#e7dfcf"/>`);
  out.push(line(14, gy, 314, gy, '#a39478', 2));
  out.push(text(24, gy + 22, 'ground', { size: 12.5, weight: 600, fill: '#6b5d45' }));
  // frame bolted to the ground
  const fx = 70;
  const fw = 170;
  const fy = 64;
  out.push(`<rect x="${fx}" y="${fy}" width="${fw}" height="${gy - fy}" fill="#f8fafc" stroke="${C.trace}" stroke-width="2.5"/>`);
  out.push(text(fx + fw / 2, fy - 8, 'frame (moves with the ground)', { size: 12.5, weight: 600, anchor: 'middle' }));
  for (const bx of [fx + 14, fx + fw - 14]) out.push(`<rect x="${bx - 4}" y="${gy - 6}" width="8" height="14" fill="${C.muted}"/>`);
  // spring from the top of the frame
  const cx = fx + fw / 2;
  let d = `M${cx} ${fy}L${cx} ${fy + 12}`;
  for (let i = 0; i < 8; i++) d += `L${cx + (i % 2 ? -12 : 12)} ${fy + 18 + i * 8}`;
  d += `L${cx} ${fy + 84}L${cx} ${fy + 92}`;
  out.push(`<path d="${d}" fill="none" stroke="${C.trace}" stroke-width="2" stroke-linejoin="round"/>`);
  out.push(text(cx + 22, fy + 50, 'spring', { size: 12.5, weight: 600 }));
  // magnet fixed to the frame (bottom), coil on the mass
  const my = fy + 92;
  out.push(`<rect x="${cx - 34}" y="${my}" width="68" height="44" rx="4" fill="#cbd5e1" stroke="${C.trace}" stroke-width="1.5"/>`);
  out.push(text(cx, my + 27, 'mass', { size: 12.5, weight: 700, anchor: 'middle' }));
  for (let i = 0; i < 5; i++) out.push(`<ellipse cx="${cx}" cy="${my + 50 + i * 6}" rx="38" ry="4" fill="none" stroke="#b45309" stroke-width="2"/>`);
  out.push(text(cx + 44, my + 54, 'coil', { size: 12.5, weight: 600, fill: '#92400e' }));
  const mgy = my + 88;
  out.push(`<rect x="${cx - 16}" y="${my + 44}" width="32" height="${gy - my - 44}" fill="#c0262d" opacity="0.85"/>`);
  out.push(`<rect x="${cx - 16}" y="${mgy}" width="32" height="${gy - mgy}" fill="#1d4ed8" opacity="0.85"/>`);
  out.push(text(cx - 24, mgy + 4, 'magnet', { size: 12.5, weight: 600, anchor: 'end' }));
  // ground motion arrow and explanation
  out.push(line(fx - 26, 236, fx - 26, 176, C.note, 2, 'marker-start="url(#a-note)" marker-end="url(#a-note)"'));
  out.push(text(fx - 34, 160, 'ground', { size: 12, weight: 600, anchor: 'middle' }));
  out.push(text(fx - 34, 174, 'shakes', { size: 12, weight: 600, anchor: 'middle' }));
  // wires to the right: voltage -> digitizer -> counts -> seismogram
  const wy = my + 62;
  out.push(`<path d="M${cx + 38} ${wy}H${fx + fw + 30}" fill="none" stroke="#b45309" stroke-width="2"/>`);
  const box = (x0, title, lines, color = C.trace) => {
    out.push(`<rect x="${x0}" y="${wy - 48}" width="128" height="96" rx="8" fill="#ffffff" stroke="${color}" stroke-width="1.8"/>`);
    out.push(text(x0 + 64, wy - 26, title, { size: 13, weight: 700, anchor: 'middle' }));
    lines.forEach((l, i) => out.push(text(x0 + 64, wy - 6 + i * 16, l, { size: 12, fill: C.muted, anchor: 'middle' })));
  };
  const b1 = fx + fw + 30;
  box(b1, 'voltage', ['coil moving past', 'the magnet makes', 'a tiny voltage']);
  out.push(line(b1 + 128, wy, b1 + 150, wy, C.note, 1.8, 'marker-end="url(#a-note)"'));
  const b2 = b1 + 154;
  box(b2, 'digitizer', ['measures the', 'voltage 100 times', 'every second']);
  out.push(line(b2 + 128, wy, b2 + 150, wy, C.note, 1.8, 'marker-end="url(#a-note)"'));
  const b3 = b2 + 154;
  out.push(`<rect x="${b3}" y="${wy - 48}" width="${width - 14 - b3}" height="96" rx="8" fill="#ffffff" stroke="${C.p}" stroke-width="1.8"/>`);
  out.push(text(b3 + (width - 14 - b3) / 2, wy - 26, 'counts', { size: 13, weight: 700, fill: C.p, anchor: 'middle' }));
  ['…, 812, 790, 1,204,', '1,655, 1,302, 640,', '−215, −907, …'].forEach((l, i) => out.push(text(b3 + (width - 14 - b3) / 2, wy - 6 + i * 16, l, { size: 12, fill: C.note, anchor: 'middle' })));
  // a little seismogram drawn from those counts, under the boxes
  const sx = b1;
  const sy = wy + 118;
  const vals = [10, 30, -20, 80, -120, 300, -520, 812, 790, 1204, 1655, 1302, 640, -215, -907, -1100, -600, 200, 700, 520, 100, -300, -380, -120, 90, 160, 60, -40, -60, -10];
  const pts = vals.map((v, i) => `${r1(sx + i * ((width - 14 - sx) / (vals.length - 1)))},${r1(sy - v * 0.022)}`).join(' ');
  out.push(`<polyline points="${pts}" fill="none" stroke="${C.trace}" stroke-width="1.6" stroke-linejoin="round"/>`);
  out.push(text(sx, wy + 74, 'Plot the counts against time and you have a seismogram (sketch):', { size: 12.5 }));
  // the mass lags behind
  out.push(text(fx + fw + 30, fy + 18, 'The heavy mass on its spring tends to stay put while the', { size: 12.5, weight: 600 }));
  out.push(text(fx + fw + 30, fy + 34, 'frame shakes with the ground, so the two move past each other.', { size: 12.5, weight: 600 }));
  out.push(text(fx + fw + 30, fy + 56, 'The faster the coil moves past the magnet, the bigger the', { size: 12.5 }));
  out.push(text(fx + fw + 30, fy + 72, 'voltage. So the counts follow how fast the ground moves.', { size: 12.5 }));
  out.push('</svg>');
  return out.join('\n');
}

write('frequency-ruler.svg', ruler());
write('seismometer-inside.svg', seismometer());
