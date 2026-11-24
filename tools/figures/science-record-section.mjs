// Make the record-section figure for the S-minus-P page (docs/theory/img/).
//
//   node tools/figures/science-record-section.mjs
//
//   record-section.svg   "The race in real seismograms" (figure S1): each station's
//                        vertical (Z) trace drawn at its distance from the epicenter,
//                        with the analysts' P and S picks and straight-ray P and S
//                        travel-time lines.
//
// Uses the offline sample (docs/app/data/samples/uu80162166), the app's own miniSEED
// parser and 1–10 Hz filter (via svg-traces.mjs) and the app's distance code. Picks are
// the University of Utah analysts' picks. No credit text in the image: the page caption
// carries it. Output is deterministic (same bytes every run).
//
// MSU (26.6 km) and MTPU (29.1 km) are only 7 px apart at this scale. MTPU carries the
// S − P bracket, so it is drawn nearly full size (11 px peak, others 13 px) on top; MSU
// is drawn small (5 px) in grey behind it, and their labels are nudged apart.
import fs from 'node:fs';
import { C, FONT, esc, r1, loadSample, stationTraces } from './svg-traces.mjs';
import { distanceKm } from '../../docs/app/js/lib/geo.js';
import { minMaxColumns, peakAbs } from '../../docs/app/js/lib/signal.js';

const ID = 'uu80162166';
const outDir = new URL('../../docs/theory/img/', import.meta.url);
fs.mkdirSync(outDir, { recursive: true });

const sample = loadSample(ID);
const { event } = sample;
const originMs = event.timeMs;
const stations = JSON.parse(fs.readFileSync(new URL(`../../docs/app/data/samples/${ID}/stations.json`, import.meta.url)));

const VP = 5.8; // km/s, the Wave Race defaults (decision D9)
const VS = 3.3;
const DEPTH = event.depthKm; // the official depth, 3.96 km
const MINUS = '−';
const tP = (km) => Math.hypot(km, DEPTH) / VP;
const tS = (km) => Math.hypot(km, DEPTH) / VS;

// ---- layout -----------------------------------------------------------------
const W = 760;
const plotL = 104; // left gutter: station labels
const plotR = 704; // right gutter: distance ticks
const top = 56;
const T1 = 60; // seconds shown (from 0)
const KM1 = 195; // km shown (from 0)
const plotH = 560;
const x = (sec) => plotL + (sec / T1) * (plotR - plotL);
const y = (km) => top + (km / KM1) * plotH;
const bottom = top + plotH;
const H = bottom + 50;
const AMP = 13; // half-height of a trace at its peak (px)
// Per-station drawing tweaks: amp (px), colour, label nudge (px, + = down)
const STYLE = {
  MSU: { amp: 5, color: '#9aa1ac', nudge: -6 },
  MTPU: { amp: 11, nudge: 5 },
};

const HALO = `stroke="${C.bg}" stroke-width="4" stroke-linejoin="round" paint-order="stroke"`;
function text(tx, ty, content, { size = 13, weight = 400, fill = C.note, anchor = 'start', halo = false } = {}) {
  const a = [`x="${r1(tx)}"`, `y="${r1(ty)}"`, `font-size="${size}"`];
  if (weight !== 400) a.push(`font-weight="${weight}"`);
  if (anchor !== 'start') a.push(`text-anchor="${anchor}"`);
  a.push(`fill="${fill}"`);
  if (halo) a.push(HALO);
  return `<text ${a.join(' ')}>${content}</text>`;
}
const line = (x1, y1, x2, y2, stroke, width = 1, extra = '') =>
  `<line x1="${r1(x1)}" y1="${r1(y1)}" x2="${r1(x2)}" y2="${r1(y2)}" stroke="${stroke}" stroke-width="${width}"${extra ? ' ' + extra : ''}/>`;
const dot = (cx, cy, fill) => `<circle cx="${r1(cx)}" cy="${r1(cy)}" r="4" fill="${fill}" stroke="${C.bg}" stroke-width="1.5"/>`;

// ---- data -------------------------------------------------------------------
const rows = stations.map((st) => {
  const km = distanceKm(event.lat, event.lon, st.lat, st.lon);
  const pick = sample.picks[`UU.${st.sta}`] || {};
  const sec = (ms) => (ms == null ? null : (ms - originMs) / 1000);
  const [z] = stationTraces(sample, st.sta, { filter: 'bp1-10', components: 'Z' });
  return { sta: st.sta, km, p: sec(pick.P), s: sec(pick.S), z, ...(STYLE[st.sta] || {}) };
}).sort((a, b) => a.km - b.km);
const row = (sta) => rows.find((r) => r.sta === sta);
const nP = rows.filter((r) => r.p != null).length;
const nS = rows.filter((r) => r.s != null).length;
const spText = (sta) => `${(row(sta).s - row(sta).p).toFixed(1)} s`;

// ---- drawing ----------------------------------------------------------------
const desc = `Record section of the M${event.mag} quake near Junction, Utah: the vertical-component seismogram `
  + `of each of ${rows.length} University of Utah stations, drawn at its distance from the epicenter (${Math.round(rows[0].km)} `
  + `to ${Math.round(rows.at(-1).km)} km, down) against seconds after the quake (0 to ${T1}, across). Blue dots mark the `
  + `analysts' P picks (${nP} stations), red dots their S picks (${nS} stations). Dashed lines show P at ${VP} km/s and S at `
  + `${VS} km/s; the gap between them widens with distance: S ${MINUS} P is ${spText('MTPU')} at MTPU and `
  + `${spText('WCU')} at WCU.`;
const out = [];
out.push(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" ${FONT}>`);
out.push(`<title>The race in real seismograms</title>`);
out.push(`<desc>${esc(desc)}</desc>`);
out.push(`<rect x="0.5" y="0.5" width="${W - 1}" height="${H - 1}" rx="8" fill="${C.bg}" stroke="${C.border}"/>`);
out.push(text(12, 22, 'The race in real seismograms', { size: 15, weight: 600 }));
// legend for the dots, top right: each dot sits just before its own label
{
  const sx = 706;
  const px = sx - 57;
  out.push(text(px - 10, 22, `Analysts' picks:`, { size: 12, fill: C.muted, anchor: 'end' }));
  out.push(dot(px, 18, C.p));
  out.push(text(px + 8, 22, 'P pick', { size: 12, fill: C.muted }));
  out.push(dot(sx, 18, C.s));
  out.push(text(sx + 8, 22, 'S pick', { size: 12, fill: C.muted }));
}

// grid and axes
for (let t = 0; t <= T1; t += 10) {
  out.push(line(x(t), top, x(t), bottom, C.grid));
  out.push(text(x(t), bottom + 17, String(t), { size: 12, fill: C.muted, anchor: 'middle' }));
}
for (let km = 0; km <= KM1; km += 10) {
  const major = km % 50 === 0;
  out.push(line(plotR, y(km), plotR + (major ? 5 : 3), y(km), C.muted));
  if (major) out.push(text(plotR + 8, y(km) + 4, `${km} km`, { size: 12, fill: C.muted }));
}
out.push(`<rect x="${plotL}" y="${top}" width="${plotR - plotL}" height="${plotH}" fill="none" stroke="${C.border}"/>`);
out.push(text((plotL + plotR) / 2, bottom + 37, 'seconds after the quake', { size: 12, fill: C.muted, anchor: 'middle' }));
out.push(text(plotR + 50, top - 14, 'distance from the epicenter ↓', { size: 12, fill: C.muted, anchor: 'end' }));

// traces (grey ones first, so the main traces sit on top) and station labels
const cols = plotR - plotL;
for (const r of [...rows].sort((a, b) => Boolean(b.color) - Boolean(a.color))) {
  const tr = r.z;
  const yc = y(r.km);
  const sr = tr.sampleRate;
  const i0 = Math.max(0, Math.floor((originMs - tr.startMs) / 1000 * sr));
  const i1 = Math.min(tr.data.length, Math.ceil(((originMs + T1 * 1000) - tr.startMs) / 1000 * sr) + 1);
  const scale = (r.amp ?? AMP) / (peakAbs(tr.data, i0, i1) || 1);
  const { min, max } = minMaxColumns(tr.data, i0, i1, cols);
  let d = '';
  for (let c = 0; c < cols; c++) {
    if (Number.isNaN(min[c])) continue;
    const cx = r1(plotL + c + 0.5);
    d += `${d ? 'L' : 'M'}${cx} ${r1(yc - max[c] * scale)}L${cx} ${r1(yc - min[c] * scale)}`;
  }
  out.push(`<path d="${d}" fill="none" stroke="${r.color || C.trace}" stroke-width="1" stroke-linejoin="round"/>`);
}
for (const r of rows) {
  const yc = y(r.km);
  const ly = yc + (r.nudge || 0);
  if (r.nudge) out.push(line(plotL - 6, ly, plotL, yc, C.muted));
  out.push(text(plotL - 8, ly + 4.5, `${esc(r.sta)} <tspan fill="${C.muted}" font-weight="400">${Math.round(r.km)} km</tspan>`, { weight: 600, anchor: 'end' }));
  if (r.p == null && r.s == null) out.push(text(plotL - 8, ly + 20, 'no picks', { size: 12, fill: C.muted, anchor: 'end' }));
}

// travel-time lines, labelled in the gap between SGU and TMU, just left of each line
for (const [v, color, label] of [[VP, C.p, `P at ${VP} km/s`], [VS, C.s, `S at ${VS} km/s`]]) {
  const pts = [];
  for (let km = 0; km <= KM1; km += 1) {
    const t = Math.hypot(km, DEPTH) / v;
    if (t > T1) {
      const kmEdge = Math.sqrt((T1 * v) ** 2 - DEPTH ** 2);
      pts.push(`${r1(x(T1))} ${r1(y(kmEdge))}`);
      break;
    }
    pts.push(`${r1(x(t))} ${r1(y(km))}`);
  }
  out.push(`<path d="M${pts.join('L')}" fill="none" stroke="${color}" stroke-width="1.8" stroke-dasharray="7 5"/>`);
  const ly = (y(row('SGU').km) + y(row('TMU').km)) / 2 + 5;
  const kmTop = ((ly - 10 - top) / plotH) * KM1; // the line's position level with the top of the text
  out.push(text(x(Math.hypot(kmTop, DEPTH) / v) - 8, ly, esc(label), { weight: 700, fill: color, anchor: 'end', halo: true }));
}

// S − P brackets: MTPU (above the MSU/MTPU pair, label right) and WCU (below, label left)
function bracket(sta, by, side) {
  const r = row(sta);
  const xa = x(r.p);
  const xb = x(r.s);
  const yc = y(r.km);
  const tick = by < yc ? 5 : -5; // end ticks point toward the trace
  const o = [];
  // thin dashed guides from the bracket's ends down (or up) to the pick dots
  for (const gx of [xa, xb]) o.push(line(gx, by + tick, gx, yc - Math.sign(tick) * 5, C.note, 1, 'stroke-dasharray="2 2"'));
  // the bracket: a white halo path underneath, then the dark line (one element can't carry
  // two strokes: a repeated attribute makes the SVG invalid as a standalone image)
  const bracket = `M${r1(xa)} ${r1(by + tick)}V${r1(by)}H${r1(xb)}V${r1(by + tick)}`;
  o.push(`<path d="${bracket}" fill="none" stroke="${C.bg}" stroke-width="4.5" stroke-linejoin="round"/>`);
  o.push(`<path d="${bracket}" fill="none" stroke="${C.note}" stroke-width="1.5"/>`);
  const label = `S ${MINUS} P = ${spText(sta)}`;
  o.push(side === 'right'
    ? text(xb + 7, by + 4.5, label, { weight: 700, halo: true })
    : text(xa - 7, by + 4.5, label, { weight: 700, anchor: 'end', halo: true }));
  return o.join('\n');
}
out.push(bracket('MTPU', y(row('MSU').km) - row('MSU').amp - 11, 'right'));
out.push(bracket('WCU', y(row('WCU').km) + AMP + 6, 'left'));
{
  // the message, between FOR6 and DWU, to the right of the S line
  const ny = (y(row('FOR6').km) + y(row('DWU').km)) / 2 + 5;
  const kmTop = ((ny - 11 - top) / plotH) * KM1;
  out.push(text(x(tS(kmTop)) + 18, ny, `S ${MINUS} P grows with distance`, { size: 14, weight: 700, halo: true }));
}

// picks on top
for (const r of rows) {
  for (const [t, color] of [[r.p, C.p], [r.s, C.s]]) if (t != null) out.push(dot(x(t), y(r.km), color));
}

out.push('</svg>');
const svg = out.join('\n');
fs.writeFileSync(new URL('record-section.svg', outDir), svg + '\n');
console.log(`wrote docs/theory/img/record-section.svg (${(svg.length / 1024).toFixed(0)} KB)`);
for (const r of rows) {
  const f = (v) => (v == null ? '   – ' : v.toFixed(2));
  console.log(`  ${r.sta.padEnd(5)} ${r.km.toFixed(1).padStart(6)} km   P ${f(r.p)} (line ${f(tP(r.km))})   S ${f(r.s)} (line ${f(tS(r.km))})`);
}
