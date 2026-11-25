// Make the real-data figures for the science page "How big was it?" (docs/theory/magnitude.md;
// plan: planning/review-magnitude.md section 7.3, figures G1, G2, G3, G5, G6).
//
//   node tools/figures/magnitude-figures.mjs            all figures
//   node tools/figures/magnitude-figures.mjs G1 G3      only some
//
//   G1  mag-two-sizes.svg         Two quakes near Kanosh (ML 3.63 and 2.52, ten minutes apart) at
//                                 station MMU, as a Wood-Anderson would draw them: same scale, then
//                                 the small one × 10; the swings and their ratio.
//   G2  mag-wood-anderson.svg     Junction (ML 3.3) at FOR1: ground speed, the simulated
//                                 Wood-Anderson record with the biggest swing marked, and a
//                                 schematic of the instrument.
//   G3  mag-junction-stations.svg Junction: each station's swing against distance with Richter's
//                                 curve for 3.3, and each station's magnitude against distance.
//                                 Also writes docs/theory/data/junction-swings.csv.
//   G5  mag-duration.svg          Junction: 2 s average ground speed (log scale) against time at a
//                                 quiet and a noisier station, with UUSS's line and the durations.
//   G6  mag-several-numbers.svg   Five Utah quakes: UUSS's ML, Md and Mw on one axis per quake.
//                                 Also writes tools/figures/data/magnitude-several-numbers.json.
//
// Data: University of Utah stations (UU, doi:10.7914/SN/UU) via EarthScope; UUSS's amplitudes,
// durations, picks and magnitudes from the events' phase-data QuakeML in USGS ComCat (never
// Raspberry Shake servers). Downloads are cached in tools/figures/.cache/ (fdsn-cache.mjs), so
// reruns are offline and give the same bytes. All magnitude math is docs/app/js/lib/magnitude.js
// (Wood-Anderson magnification 2,800, damping 0.8, as UUSS). No credit text in the images: the
// page's caption carries it. Prints every number the page uses.
import fs from 'node:fs';
import { C, r1, esc } from './svg-traces.mjs';
import { card, text } from './svg-charts.mjs';
import { fetchCached, waveforms, event, analystPicks, EVENT, STATION } from './fdsn-cache.mjs';

const M = await import('../../docs/app/js/lib/magnitude.js');
const { parseStationText } = await import('../../docs/app/js/lib/fdsn.js');
const { toVelocity } = await import('../../docs/app/js/lib/units.js');
const { distanceKm } = await import('../../docs/app/js/lib/geo.js');
const { minMaxColumns } = await import('../../docs/app/js/lib/signal.js');
const { filteredData } = await import('../../docs/app/js/data/filters.js');
const { filter } = await import('../../docs/app/vendor/seisplotjs.js');

const imgDir = new URL('../../docs/theory/img/', import.meta.url);
const dataDir = new URL('../../docs/theory/data/', import.meta.url);
const toolData = new URL('./data/', import.meta.url);
const only = process.argv.slice(2).map((s) => s.toUpperCase());
const W = 760;
const MINUS = '−';
const EN = '–';
const TIMES = '×';
const SWING = '#7c3aed';              // the marked swing (not the P blue or the S red)
const SERIES = ['#2a78d6', '#eb6834']; // as science-frequencies.mjs (checked for color-blind readers)
const ACCESSED = '2026-11-25';         // when the ComCat and EarthScope values were fetched
const JUNCTION = 'uu80162166';

function write(name, svg) {
  fs.mkdirSync(imgDir, { recursive: true });
  fs.writeFileSync(new URL(name, imgDir), svg + '\n');
  console.log(`wrote docs/theory/img/${name} (${(svg.length / 1024).toFixed(0)} KB)\n`);
}
const line = (x1, y1, x2, y2, stroke, width = 1, extra = '') =>
  `<line x1="${r1(x1)}" y1="${r1(y1)}" x2="${r1(x2)}" y2="${r1(y2)}" stroke="${stroke}" stroke-width="${width}"${extra ? ' ' + extra : ''}/>`;
const vtext = (x, y, s, { size = 12, fill = C.muted } = {}) =>
  `<text transform="translate(${r1(x)} ${r1(y)}) rotate(-90)" font-size="${size}" text-anchor="middle" fill="${fill}">${esc(s)}</text>`;
const iso = (ms) => new Date(ms).toISOString().replace('Z', '');
const sig = (v, n = 3) => String(Number(v.toPrecision(n)));
/** 3 significant digits, keeping trailing zeros (2.24, 0.166, 10.1). */
const mm = (v) => v.toPrecision(3);
const median = (a) => { const s = [...a].sort((p, q) => p - q); const h = s.length >> 1; return s.length % 2 ? s[h] : (s[h - 1] + s[h]) / 2; };

// ---------------------------------------------------------------------------------------------
// Data

/** UUSS's phase-data QuakeML for a ComCat event: {xml, url, updated}. */
async function phaseData(id) {
  const detail = JSON.parse((await fetchCached(`${EVENT}?eventid=${id}&format=geojson`)).toString('utf8'));
  const products = detail.properties.products?.['phase-data'] || [];
  const pd = products.find((p) => p.source === 'uu') || products[0];
  const url = pd?.contents?.['quakeml.xml']?.url;
  if (!url) throw new Error(`${id}: no phase-data product`);
  return { xml: (await fetchCached(url)).toString('utf8'), url, updated: new Date(pd.updateTime).toISOString() };
}

/** A station's coordinates and channel metadata (sensitivity, units) at a time, from EarthScope. */
async function stationMeta(net, sta, atMs) {
  const q = new URLSearchParams({ net, sta, cha: 'HH?,EH?,BH?', level: 'channel', format: 'text',
    startbefore: iso(atMs), endafter: iso(atMs) });
  const buf = await fetchCached(`${STATION}?${q}`);
  const st = buf && parseStationText(buf.toString('utf8'))[0];
  if (!st) throw new Error(`no metadata for ${net}.${sta}`);
  return st;
}

/** A station's coordinates only (any channel type), at a time. */
async function stationAt(net, sta, atMs) {
  const q = new URLSearchParams({ net, sta, level: 'station', format: 'text', startbefore: iso(atMs), endafter: iso(atMs) });
  const buf = await fetchCached(`${STATION}?${q}`);
  const row = buf.toString('utf8').trim().split('\n').find((l) => !l.startsWith('#'));
  const [, , lat, lon] = row.split('|');
  return { lat: +lat, lon: +lon };
}

const PRE = 60; // every record starts this many seconds before the origin

/**
 * One channel's record around a quake as ground velocity (m/s), with its distance.
 * sec(i) and idx(sec) convert between samples and seconds after the origin.
 */
async function record(ev, { net = 'UU', sta, loc, cha, postSec = 150 }) {
  const st = await stationMeta(net, sta, ev.timeMs);
  const km = distanceKm(ev.lat, ev.lon, st.lat, st.lon);
  const trs = await waveforms({ net, sta, loc, cha, startMs: ev.timeMs - PRE * 1000, endMs: ev.timeMs + postSec * 1000 });
  const tr = trs.find((t) => t.cha === cha && t.loc === loc);
  if (!tr) throw new Error(`no record for ${net}.${sta}.${loc}.${cha} (${ev.id})`);
  const ch = st.channels.find((c) => c.loc === loc && c.cha === cha);
  const v = toVelocity(tr.data, ch);
  if (!v) throw new Error(`${sta} ${cha}: no velocity sensitivity`);
  const sr = tr.sampleRate;
  return { st, km, tr, ch, sr, velocity: v.data, approx: v.approx,
    idx: (sec) => Math.round((sec + PRE) * sr), sec: (i) => i / sr - PRE };
}

/** The Wood-Anderson record (mm) and its biggest swing in lib/magnitude.js's window. */
function swingOf(rec) {
  const wa = M.woodAnderson(rec.velocity, rec.sr);
  const win = M.swingWindow(rec.km);
  const sw = M.halfPeakToPeak(wa, rec.idx(win.startSec), rec.idx(win.endSec));
  return { wa, win, ...sw, tI: rec.sec(sw.i), tJ: rec.sec(sw.j) };
}

// ---------------------------------------------------------------------------------------------
// Drawing

/** A trace as an SVG path between seconds t0 and t1 (min/max per pixel column). */
function tracePath(data, rec, t0, t1, x0, w, yOf, { color = C.trace, width = 1 } = {}) {
  const i0 = Math.max(0, rec.idx(t0));
  const i1 = Math.min(data.length, rec.idx(t1));
  const cols = Math.floor(w);
  const { min, max } = minMaxColumns(data, i0, i1, cols);
  let d = '';
  let pen = false;
  for (let c = 0; c < cols; c++) {
    if (Number.isNaN(min[c])) { pen = false; continue; }
    const cx = r1(x0 + ((c + 0.5) / cols) * w);
    d += `${pen ? 'L' : 'M'}${cx} ${r1(yOf(max[c]))}L${cx} ${r1(yOf(min[c]))}`;
    pen = true;
  }
  return `<path d="${d}" fill="none" stroke="${color}" stroke-width="${width}" stroke-linejoin="round"/>`;
}

/**
 * Mark a swing: dots on its two turning points and a bracket beside them spanning the swing,
 * with a label (at labelY, or beside the bracket's middle). side: +1 bracket to the right, -1 left.
 */
function swingMark(out, xi, yi, xj, yj, label, { side = 1, gap = 14, labelY = null } = {}) {
  const xb = side > 0 ? Math.max(xi, xj) + gap : Math.min(xi, xj) - gap;
  const top = Math.min(yi, yj);
  const bot = Math.max(yi, yj);
  for (const [px, py] of [[xi, yi], [xj, yj]]) {
    out.push(line(px, py, xb, py, SWING, 1, 'stroke-dasharray="2 2"'));
    out.push(`<circle cx="${r1(px)}" cy="${r1(py)}" r="3" fill="${SWING}" stroke="${C.bg}" stroke-width="1"/>`);
  }
  out.push(line(xb, top, xb, bot, SWING, 2));
  out.push(line(xb - 4, top, xb + 4, top, SWING, 2));
  out.push(line(xb - 4, bot, xb + 4, bot, SWING, 2));
  out.push(text(xb + side * 8, labelY ?? (top + bot) / 2 + 4, label,
    { size: 13, weight: 700, fill: SWING, anchor: side > 0 ? 'start' : 'end', halo: true }));
}

/** Time axis under a plot: ticks and labels every `step` seconds, and the axis label at the right. */
function timeAxis(out, x, t0, t1, step, yTop, yBot, label, xRight) {
  for (let t = Math.ceil(t0 / step) * step; t <= t1 + 1e-9; t += step) {
    out.push(line(x(t), yTop, x(t), yBot, C.grid));
    if (x(t) < xRight - label.length * 6.4 - 14) out.push(text(x(t), yBot + 16, String(t), { size: 12, fill: C.muted, anchor: 'middle' }));
  }
  out.push(text(xRight, yBot + 16, label, { size: 12, fill: C.muted, anchor: 'end' }));
}

// ---------------------------------------------------------------------------------------------
// G1. Two nearby quakes, two sizes

async function G1() {
  const STA = 'MMU';
  const ids = ['uu80137106', 'uu80137126'];
  const rows = [];
  for (const id of ids) {
    const ev = await event(id);
    const { xml } = await phaseData(id);
    const net = M.parseQuakeMLMagnitudes(xml).network.find((m) => m.preferred);
    const uuss = M.parseQuakeMLAmplitudes(xml).filter((a) => a.sta === STA && a.type === 'AML');
    const picks = (await analystPicks(id))[`UU.${STA}`] || {};
    const comps = {};
    for (const cha of ['HHE', 'HHN', 'HHZ']) {
      const rec = await record(ev, { sta: STA, loc: '01', cha });
      comps[cha] = { rec, ...swingOf(rec), uussMm: M.uussSwingMm(uuss.find((a) => a.cha === cha)?.value ?? NaN) };
    }
    rows.push({ ev, ml: net.value, comps, pSec: picks.P != null ? (picks.P - ev.timeMs) / 1000 : null });
  }
  const [big, small] = rows;
  const predicted = 10 ** (big.ml - small.ml);
  console.log(`G1: Kanosh pair at UU.${STA}`);
  for (const r of rows) {
    console.log(`  ${r.ev.id} ML ${r.ml} ${new Date(r.ev.timeMs).toISOString()} depth ${r.ev.depthKm.toFixed(1)} km, ${STA} ${r.comps.HHE.rec.km.toFixed(1)} km, P pick ${r.pSec?.toFixed(2)} s`);
    for (const [cha, c] of Object.entries(r.comps)) {
      console.log(`    ${cha} swing ${c.amp.toFixed(4)} mm at ${c.tI.toFixed(2)}${EN}${c.tJ.toFixed(2)} s; UUSS ${Number.isFinite(c.uussMm) ? c.uussMm.toFixed(4) : 'none'} mm`);
    }
  }
  console.log(`  apart: ${((small.ev.timeMs - big.ev.timeMs) / 60000).toFixed(1)} min, ${distanceKm(big.ev.lat, big.ev.lon, small.ev.lat, small.ev.lon).toFixed(1)} km`);
  const ratio = (cha) => big.comps[cha].amp / small.comps[cha].amp;
  console.log(`  predicted ratio 10^(${big.ml} ${MINUS} ${small.ml}) = ${predicted.toFixed(1)}; measured HHE ${ratio('HHE').toFixed(2)}, HHN ${ratio('HHN').toFixed(2)}, ` +
    `both (geometric mean) ${Math.sqrt(ratio('HHE') * ratio('HHN')).toFixed(2)}, HHZ ${ratio('HHZ').toFixed(2)}; UUSS's own HHE amplitudes ${(big.comps.HHE.uussMm / small.comps.HHE.uussMm).toFixed(2)}`);
  // The east-west sensor: its ratio (13.5) is the closer of the two to the 25-station middle
  // value (14.5, review 3.7) and to the prediction (13).
  const CHA = 'HHE';
  const b = big.comps[CHA];
  const s = small.comps[CHA];
  const meas = +mm(b.amp) / +mm(s.amp);
  console.log(`  drawn: ${CHA}; ${mm(b.amp)} mm / ${mm(s.amp)} mm = ${meas.toFixed(1)}`);

  const padL = 54;
  const padR = 14;
  const w = W - padL - padR;
  const t0 = 10;
  const t1 = 75;
  const x = (t) => padL + ((t - t0) / (t1 - t0)) * w;
  const H1 = 170;
  const H2 = 54;
  const H3 = 170;
  const top1 = 82;
  const top2 = top1 + H1;
  const top3 = top2 + H2 + 44;
  const bottom = top3 + H3;
  let peak = 0;
  for (let i = b.rec.idx(t0); i < b.rec.idx(t1); i++) peak = Math.max(peak, Math.abs(b.wa[i]));
  const pxPerMm = (H1 / 2 - 8) / peak;
  const y1 = (v) => top1 + H1 / 2 - v * pxPerMm;
  const y2 = (v) => top2 + H2 / 2 - v * pxPerMm;
  const y3 = (v) => top3 + H3 / 2 - v * pxPerMm * 10;
  const out = card(W, bottom + 82, 'Two quakes near Kanosh, one station, two sizes');
  out.push(text(12, 42, `Station MMU, 118 km away, east${EN}west sensor, drawn as Richter's seismograph would (April 19, 2026)`, { size: 12.5, fill: C.muted }));
  out.push(text(padL, top1 - 8, 'Both on the same scale', { size: 13.5, weight: 700 }));
  out.push(text(padL, top3 - 8, `The small one, drawn 10 times taller`, { size: 13.5, weight: 700 }));

  const panel = (top, h, yOf, ticks) => {
    for (const v of ticks) {
      out.push(line(padL, yOf(v), padL + w, yOf(v), C.grid));
      out.push(text(padL - 6, yOf(v) + 4, String(v).replace('-', MINUS), { size: 12, fill: C.muted, anchor: 'end' }));
    }
    for (let t = t0; t <= t1; t += 10) out.push(line(x(t), top, x(t), top + h, C.grid));
    out.push(`<rect x="${padL}" y="${top}" width="${w}" height="${h}" fill="none" stroke="${C.border}"/>`);
  };
  panel(top1, H1, y1, [-2, 0, 2]);
  panel(top2, H2, y2, [0]);
  panel(top3, H3, y3, [-0.2, 0, 0.2]);
  out.push(vtext(16, top1 + (H1 + H2) / 2, 'swing on the paper (mm)'));
  out.push(vtext(16, top3 + H3 / 2, 'swing (mm)'));
  out.push(tracePath(b.wa, b.rec, t0, t1, padL, w, y1));
  out.push(tracePath(s.wa, s.rec, t0, t1, padL, w, y2));
  out.push(tracePath(s.wa, s.rec, t0, t1, padL, w, y3));
  out.push(text(padL + 8, top1 + 18, `Magnitude ${big.ml.toFixed(2)}`, { size: 13, weight: 700, halo: true }));
  out.push(text(padL + 8, top2 + 17, `Magnitude ${small.ml.toFixed(2)}, ten minutes later`, { size: 13, weight: 700, halo: true }));
  out.push(text(padL + 8, top3 + 18, `Magnitude ${small.ml.toFixed(2)} ${TIMES} 10`, { size: 13, weight: 700, halo: true }));
  swingMark(out, x(b.tI), y1(b.wa[b.i]), x(b.tJ), y1(b.wa[b.j]), `half of this = ${mm(b.amp)} mm`, { labelY: top1 + 20 });
  swingMark(out, x(s.tI), y2(s.wa[s.i]), x(s.tJ), y2(s.wa[s.j]), `${mm(s.amp)} mm`, { labelY: top2 + H2 - 6 });
  swingMark(out, x(s.tI), y3(s.wa[s.i]), x(s.tJ), y3(s.wa[s.j]), `half of this = ${mm(s.amp)} mm`, { side: -1, labelY: top3 + H3 - 12 });
  timeAxis(out, x, t0, t1, 10, bottom, bottom, 'seconds after each quake', padL + w);
  out.push(text(padL, bottom + 44, `Measured: ${mm(b.amp)} mm ÷ ${mm(s.amp)} mm = ${meas.toFixed(1)} times taller.`, { size: 14, weight: 700 }));
  out.push(text(padL, bottom + 65, `Predicted from the magnitudes: ${big.ml.toFixed(2)} ${MINUS} ${small.ml.toFixed(2)} = ${(big.ml - small.ml).toFixed(2)} steps, and 10 to the power ${(big.ml - small.ml).toFixed(2)} is about ${predicted.toFixed(0)}.`, { size: 13 }));
  out.push('</svg>');
  write('mag-two-sizes.svg', out.join('\n'));
}

// ---------------------------------------------------------------------------------------------
// G2. Richter's instrument

/** Schematic of a Wood-Anderson torsion seismograph, in a box starting at (x0, y0). */
function woodAndersonSketch(out, x0, y0) {
  const P = (x, y) => [x0 + x, y0 + y];
  const metal = '#6b7280';
  const beam = '#d97706';
  const [wx, wTop] = P(200, 16);
  const [, wBot] = P(200, 170);
  // the two clamps holding the wire
  for (const cy of [wTop, wBot]) {
    out.push(`<rect x="${wx - 22}" y="${cy - 6}" width="44" height="12" rx="2" fill="${metal}"/>`);
  }
  out.push(line(wx, wTop + 6, wx, wBot - 6, C.trace, 1.4));
  // the mass (a small cylinder on one side of the wire) with its mirror
  const [mx, my] = P(200, 78);
  out.push(`<rect x="${mx}" y="${my}" width="20" height="32" rx="3" fill="#c2854a" stroke="#7c4a1e" stroke-width="1.2"/>`);
  out.push(`<rect x="${mx + 6}" y="${my + 7}" width="9" height="18" fill="#dbeafe" stroke="${C.p}" stroke-width="1.2"/>`);
  // a small arrow: the mass twists about the wire
  out.push(`<path d="M${wx - 16} ${my + 44}A18 7 0 0 0 ${wx + 18} ${my + 44}" fill="none" stroke="${C.muted}" stroke-width="1.4" marker-end="url(#mag-arrow)"/>`);
  out.push(text(wx + 30, my + 56, 'twists', { size: 12, fill: C.muted }));
  // lamp, light beam, drum with photographic paper
  const mirror = [mx + 11, my + 16];
  const lamp = P(404, 158);
  const spot = P(438, 52);
  out.push(line(lamp[0], lamp[1], mirror[0], mirror[1], beam, 2));
  out.push(line(mirror[0], mirror[1], spot[0], spot[1], beam, 2, 'marker-end="url(#mag-beam)"'));
  out.push(`<rect x="${lamp[0]}" y="${lamp[1] - 9}" width="26" height="18" rx="3" fill="${metal}"/>`);
  out.push(`<circle cx="${lamp[0]}" cy="${lamp[1]}" r="5" fill="#fbbf24" stroke="${beam}"/>`);
  out.push(text(lamp[0] + 32, lamp[1] + 4, 'lamp', { size: 12.5 }));
  const [dx, dy] = P(442, 22);
  const dw = 104;
  const dh = 60;
  out.push(`<rect x="${dx}" y="${dy}" width="${dw}" height="${dh}" fill="#f9fafb" stroke="${metal}" stroke-width="1.4"/>`);
  out.push(`<ellipse cx="${dx + dw}" cy="${dy + dh / 2}" rx="9" ry="${dh / 2}" fill="#e5e7eb" stroke="${metal}" stroke-width="1.4"/>`);
  out.push(line(dx + dw + 9, dy + dh / 2, dx + dw + 24, dy + dh / 2, metal, 3));
  // the line the spot has drawn on the paper (time runs up the drum's turn; a quake in the middle)
  const wig = [0, 0, 0, 1, -1, 0, 5, -9, 14, -11, 8, -6, 4, -3, 2, -1, 1, 0, 0, 0];
  out.push(`<path d="${wig.map((v, k) => `${k ? 'L' : 'M'}${r1(dx + 8 + k * 4.4)} ${r1(dy + dh / 2 + v)}`).join('')}" fill="none" stroke="${C.trace}" stroke-width="1.1"/>`);
  out.push(text(dx, dy + dh + 18, 'photographic paper', { size: 12.5, weight: 600 }));
  out.push(text(dx, dy + dh + 34, 'on a turning drum', { size: 12.5 }));
  // labels with leader lines
  out.push(text(wx - 34, my - 14, 'mirror', { size: 12.5, weight: 600, anchor: 'end' }));
  out.push(line(wx - 30, my - 16, mx + 8, my + 10, C.note, 1));
  out.push(text(wx - 34, my + 30, 'mass on a taut wire', { size: 12.5, weight: 600, anchor: 'end' }));
  out.push(line(wx - 30, my + 26, mx + 1, my + 24, C.note, 1));
  out.push(text((mirror[0] + lamp[0]) / 2 + 6, (mirror[1] + spot[1] + mirror[1] + lamp[1]) / 4 + 8, 'light beam', { size: 12.5, weight: 600, fill: '#92400e', anchor: 'middle' }));
  // how it works, in a few words
  const lines = ['The ground shakes; the mass', 'lags behind and twists the', 'wire. The mirror turns, and', 'the spot of light swings', 'across the paper: about', '2,000 times farther than', 'the ground moved.'];
  lines.forEach((l, k) => out.push(text(x0 + 584, y0 + 30 + k * 17, l, { size: 12, fill: C.note })));
}

async function G2() {
  const STA = 'FOR1';
  const CHA = 'HHE';
  const ev = await event(JUNCTION);
  const { xml } = await phaseData(JUNCTION);
  const uuss = M.parseQuakeMLAmplitudes(xml).filter((a) => a.sta === STA && a.type === 'AML');
  const picks = (await analystPicks(JUNCTION))[`UU.${STA}`] || {};
  const pSec = (picks.P - ev.timeMs) / 1000;
  console.log(`G2: Junction ${JUNCTION} at UU.${STA}`);
  let chosen;
  for (const cha of ['HHE', 'HHN']) {
    const rec = await record(ev, { sta: STA, loc: '01', cha });
    const sw = swingOf(rec);
    const u = M.uussSwingMm(uuss.find((a) => a.cha === cha).value);
    const speed = toVelocity(filteredData(rec.tr, { lo: 1, hi: 10 }), rec.ch).data;
    let pk = 0;
    for (let i = rec.idx(sw.win.startSec); i < rec.idx(sw.win.endSec); i++) pk = Math.max(pk, Math.abs(speed[i]));
    console.log(`  ${cha} ${rec.km.toFixed(1)} km: swing ${sw.amp.toFixed(4)} mm at ${sw.tI.toFixed(2)}${EN}${sw.tJ.toFixed(2)} s (turning points ${sw.wa[sw.i].toFixed(3)} and ${sw.wa[sw.j].toFixed(3)} mm); ` +
      `UUSS ${u.toFixed(4)} mm (ours ${((sw.amp / u - 1) * 100).toFixed(1)}%); peak ground speed 1${EN}10 Hz ${(pk * 1e6).toFixed(1)} µm/s; station ML ${M.stationML(sw.amp, rec.km).toFixed(2)}`);
    if (cha === CHA) chosen = { rec, sw, speed, u, pk };
  }
  const { rec, sw, speed, u } = chosen;
  console.log(`  P pick ${pSec.toFixed(2)} s; drawn: ${CHA}, bracket "half of this = ${mm(sw.amp)} mm" (UUSS ${mm(u)} mm)`);

  const padL = 54;
  const padR = 14;
  const w = W - padL - padR;
  const t0 = 6;
  const t1 = 40;
  const x = (t) => padL + ((t - t0) / (t1 - t0)) * w;
  const H = 150;
  const topA = 82;
  const topB = topA + H + 44;
  const bottom = topB + H;
  const um = Float64Array.from(speed, (v) => v * 1e6);
  const peakOf = (d) => { let p = 0; for (let i = rec.idx(t0); i < rec.idx(t1); i++) p = Math.max(p, Math.abs(d[i])); return p; };
  const sA = (H / 2 - 8) / peakOf(um);
  const sB = (H / 2 - 8) / peakOf(sw.wa);
  const yA = (v) => topA + H / 2 - v * sA;
  const yB = (v) => topB + H / 2 - v * sB;
  const sketchTop = bottom + 62;
  const out = card(W, sketchTop + 196, "Richter's seismograph: from shaking ground to a swing in millimeters");
  out.splice(1, 0, `<defs><marker id="mag-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0L10 5L0 10z" fill="${C.muted}"/></marker>` +
    `<marker id="mag-beam" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M0 0L10 5L0 10z" fill="#d97706"/></marker></defs>`);
  out.push(text(12, 42, `The Junction quake (magnitude 3.3) at station FOR1, ${Math.round(rec.km)} km away, east${EN}west sensor`, { size: 12.5, fill: C.muted }));
  out.push(text(padL, topA - 8, `How fast the ground moved (what Quake Explorer shows, 1${EN}10 Hz)`, { size: 13.5, weight: 700 }));
  out.push(text(padL, topB - 8, "What Richter's seismograph would have drawn (worked out by computer)", { size: 13.5, weight: 700 }));
  const panel = (top, yOf, ticks) => {
    for (const v of ticks) {
      out.push(line(padL, yOf(v), padL + w, yOf(v), C.grid));
      out.push(text(padL - 6, yOf(v) + 4, String(v).replace('-', MINUS), { size: 12, fill: C.muted, anchor: 'end' }));
    }
    for (let t = Math.ceil(t0 / 5) * 5; t <= t1; t += 5) out.push(line(x(t), top, x(t), top + H, C.grid));
    out.push(`<rect x="${padL}" y="${top}" width="${w}" height="${H}" fill="none" stroke="${C.border}"/>`);
  };
  panel(topA, yA, [-10, 0, 10]);
  panel(topB, yB, [-2, 0, 2]);
  out.push(vtext(16, topA + H / 2, 'ground speed (µm/s)'));
  out.push(vtext(16, topB + H / 2, 'swing on the paper (mm)'));
  out.push(tracePath(um, rec, t0, t1, padL, w, yA));
  out.push(tracePath(sw.wa, rec, t0, t1, padL, w, yB));
  for (const [top] of [[topA], [topB]]) {
    out.push(line(x(pSec), top, x(pSec), top + H, C.p, 2));
    out.push(text(x(pSec) - 5, top + 17, 'P', { size: 13, weight: 700, fill: C.p, anchor: 'end', halo: true }));
  }
  swingMark(out, x(sw.tI), yB(sw.wa[sw.i]), x(sw.tJ), yB(sw.wa[sw.j]), `half of this = ${mm(sw.amp)} mm`, { labelY: topB + 20 });
  out.push(text(padL + w - 8, topB + H - 10, 'the biggest swing is the number the magnitude uses', { size: 12.5, fill: SWING, weight: 600, anchor: 'end', halo: true }));
  timeAxis(out, x, t0, t1, 5, bottom, bottom, 'seconds after the quake', padL + w);
  out.push(text(padL, sketchTop - 14, 'The instrument (schematic): a Wood-Anderson seismograph', { size: 13.5, weight: 700 }));
  woodAndersonSketch(out, 0, sketchTop);
  out.push('</svg>');
  write('mag-wood-anderson.svg', out.join('\n'));
}

// ---------------------------------------------------------------------------------------------
// G3. Each station's estimate against distance (Junction), and the CSV for "Make it"

async function G3() {
  const ev = await event(JUNCTION);
  const { xml } = await phaseData(JUNCTION);
  const mags = M.parseQuakeMLMagnitudes(xml);
  const uussML = mags.network.find((m) => m.type.toLowerCase() === 'ml').value;
  const amps = M.parseQuakeMLAmplitudes(xml).filter((a) => a.type === 'AML' && !a.cha.endsWith('Z'));
  const weights = new Map(mags.station.map((s) => [`${s.net}.${s.sta}.${s.cha}`, s.weight]));
  const byStation = new Map();
  for (const a of amps) {
    const key = `${a.net}.${a.sta}`;
    if (!byStation.has(key)) byStation.set(key, { net: a.net, sta: a.sta, east: null, north: null });
    const slot = /[E2]$/.test(a.cha) ? 'east' : 'north';
    byStation.get(key)[slot] = M.uussSwingMm(a.value);
    byStation.get(key).weight = weights.get(`${a.net}.${a.sta}.${a.cha}`);
  }
  const rows = [];
  let outside = 0;
  for (const s of byStation.values()) {
    if (s.east == null || s.north == null) continue;
    const c = await stationAt(s.net, s.sta, ev.timeMs);
    const km = distanceKm(ev.lat, ev.lon, c.lat, c.lon);
    if (km < 10 || km > 300) { outside++; continue; }
    const swing = (s.east + s.north) / 2;
    rows.push({ ...s, km, swing, ml: M.stationML(swing, km) });
  }
  rows.sort((p, q) => p.km - q.km);
  const mls = rows.map((r) => r.ml);
  const med = median(mls);
  const mean = mls.reduce((p, q) => p + q, 0) / mls.length;
  const within = rows.filter((r) => Math.abs(r.ml - uussML) <= 0.3).length;
  console.log(`G3: Junction, UUSS amplitudes ÷ 2, horizontals: ${rows.length} stations at 10${EN}300 km (${outside} more beyond 300 km); UUSS ML ${uussML.toFixed(2)}`);
  console.log(`  station magnitudes (no corrections): middle value ${med.toFixed(2)}, mean ${mean.toFixed(2)}, lowest ${Math.min(...mls).toFixed(2)}, highest ${Math.max(...mls).toFixed(2)}; ` +
    `${within} of ${rows.length} within 0.3 of UUSS`);
  for (const r of rows) {
    console.log(`  ${(r.net + '.' + r.sta).padEnd(8)} ${r.km.toFixed(1).padStart(6)} km  E ${sig(r.east, 4).padStart(7)}  N ${sig(r.north, 4).padStart(7)}  mean ${mm(r.swing).padStart(6)} mm  ML ${r.ml.toFixed(2)}  (${r.ml - uussML >= 0 ? '+' : MINUS}${Math.abs(r.ml - uussML).toFixed(2)})${r.weight === 0 ? '  UUSS weight 0' : ''}`);
  }
  const swingAt = (km) => 10 ** (uussML - M.richterLogA0(km));
  console.log(`  Richter's curve for ${uussML.toFixed(1)}: ${[30, 70, 100, 110, 270, 300].map((k) => `${k} km ${sig(swingAt(k))} mm`).join(', ')}`);

  fs.mkdirSync(dataDir, { recursive: true });
  const csv = ['station,network,distance_km,swing_east_mm,swing_north_mm,swing_mm',
    ...rows.map((r) => [r.sta, r.net, r.km.toFixed(1), r.east.toPrecision(4), r.north.toPrecision(4), r.swing.toPrecision(3)].join(','))];
  fs.writeFileSync(new URL('junction-swings.csv', dataDir), csv.join('\n') + '\n');
  console.log(`wrote docs/theory/data/junction-swings.csv (${rows.length} rows)`);

  const padL = 64;
  const padR = 24;
  const w = W - padL - padR;
  const k0 = 20;
  const k1 = 400;
  const x = (km) => padL + (Math.log10(km / k0) / Math.log10(k1 / k0)) * w;
  const topA = 92;
  const hA = 290;
  const topB = topA + hA + 92;
  const hB = 240;
  const a0 = 0.05;
  const a1 = 50;
  const yA = (v) => topA + (Math.log10(a1 / v) / Math.log10(a1 / a0)) * hA;
  const m0 = 2.6;
  const m1 = 4.6;
  const yB = (v) => topB + ((m1 - v) / (m1 - m0)) * hB;
  const out = card(W, topB + hB + 96, `One quake, ${rows.length} stations: the Junction quake (magnitude ${uussML.toFixed(1)})`);
  const KMS = [20, 30, 50, 100, 200, 300, 400];
  const frame = (top, h) => {
    for (const km of KMS) {
      out.push(line(x(km), top, x(km), top + h, C.grid));
      out.push(text(x(km), top + h + 17, String(km), { size: 12, fill: C.muted, anchor: 'middle' }));
    }
    out.push(text(padL + w, top + h + 35, 'distance from the quake (km, log scale)', { size: 12, fill: C.muted, anchor: 'end' }));
  };
  const dot = (cx, cy) => `<circle cx="${r1(cx)}" cy="${r1(cy)}" r="5" fill="${C.trace}" stroke="${C.bg}" stroke-width="1.5"/>`;
  const label = (r, cy, L) => text(x(r.km) + L[0], cy + L[1], r.sta, { size: 12.5, weight: 700, anchor: L[2], halo: true });

  // A. swing against distance, log-log
  out.push(text(padL, topA - 34, 'The biggest swing at each station', { size: 13.5, weight: 700 }));
  out.push(`<circle cx="${padL + 6}" cy="${topA - 16}" r="5" fill="${C.trace}"/>`);
  out.push(text(padL + 16, topA - 12, 'a station (mean of its two horizontal sensors)', { size: 12, fill: C.muted }));
  out.push(line(padL + 300, topA - 16, padL + 324, topA - 16, C.s, 2.4));
  out.push(text(padL + 330, topA - 12, `Richter's table for magnitude ${uussML.toFixed(1)}`, { size: 12, fill: C.muted }));
  frame(topA, hA);
  for (const v of [0.1, 0.3, 1, 3, 10, 30]) {
    out.push(line(padL, yA(v), padL + w, yA(v), C.grid));
    out.push(text(padL - 6, yA(v) + 4, String(v), { size: 12, fill: C.muted, anchor: 'end' }));
  }
  out.push(`<rect x="${padL}" y="${topA}" width="${w}" height="${hA}" fill="none" stroke="${C.border}"/>`);
  out.push(vtext(18, topA + hA / 2, 'biggest swing (mm, log scale)'));
  const curve = [k0, ...M.RICHTER_1958.map((r) => r[0]).filter((km) => km > k0 && km < 300), 300];
  out.push(`<path d="${curve.map((km, i) => `${i ? 'L' : 'M'}${r1(x(km))} ${r1(yA(swingAt(km)))}`).join('')}" fill="none" stroke="${C.s}" stroke-width="2.4" stroke-linejoin="round"/>`);
  for (const r of rows) out.push(dot(x(r.km), yA(r.swing)));
  const LA = { MTPU: [-9, 4, 'end'], FOR1: [-8, 14, 'end'], HLJ: [-4, -11, 'middle'], SGU: [10, 5, 'start'], TMU: [9, -7, 'start'], WPUT: [10, 4, 'start'] };
  for (const r of rows) if (LA[r.sta]) out.push(label(r, yA(r.swing), LA[r.sta]));

  // B. station magnitude against distance
  out.push(text(padL, topB - 34, 'The magnitude each station gives (swing + distance, from the table)', { size: 13.5, weight: 700 }));
  out.push(line(padL, topB - 16, padL + 24, topB - 16, C.s, 2.4));
  out.push(text(padL + 30, topB - 12, `University of Utah: ${uussML.toFixed(2)}`, { size: 12, fill: C.muted }));
  out.push(`<rect x="${padL + 200}" y="${topB - 23}" width="24" height="14" fill="rgba(192,38,45,0.12)"/>`);
  out.push(text(padL + 230, topB - 12, 'within 0.3 of it', { size: 12, fill: C.muted }));
  const tri = (cx, cy) => `<path d="M${r1(cx - 9)} ${r1(cy)}L${r1(cx + 3)} ${r1(cy - 7)}L${r1(cx + 3)} ${r1(cy + 7)}Z" fill="${SERIES[0]}" stroke="${C.bg}" stroke-width="1"/>`;
  out.push(tri(padL + 366, topB - 16));
  out.push(text(padL + 376, topB - 12, `middle value of the ${rows.length} stations: ${med.toFixed(2)}`, { size: 12, fill: C.muted }));
  out.push(`<rect x="${padL}" y="${r1(yB(uussML + 0.3))}" width="${w}" height="${r1(yB(uussML - 0.3) - yB(uussML + 0.3))}" fill="rgba(192,38,45,0.10)"/>`);
  frame(topB, hB);
  for (let v = 2.6; v <= m1 + 1e-9; v += 0.4) {
    out.push(line(padL, yB(v), padL + w, yB(v), C.grid));
    out.push(text(padL - 6, yB(v) + 4, v.toFixed(1), { size: 12, fill: C.muted, anchor: 'end' }));
  }
  out.push(`<rect x="${padL}" y="${topB}" width="${w}" height="${hB}" fill="none" stroke="${C.border}"/>`);
  out.push(vtext(18, topB + hB / 2, 'station magnitude'));
  out.push(line(padL, yB(uussML), padL + w, yB(uussML), C.s, 2.4));
  for (const r of rows) out.push(dot(x(r.km), yB(r.ml)));
  out.push(tri(padL + w - 4, yB(med)));
  const LB = { MTPU: [-9, 4, 'end'], FOR1: [0, 19, 'middle'], HLJ: [0, -10, 'middle'], SGU: [10, 4, 'start'], TMU: [0, -10, 'middle'], WPUT: [10, 4, 'start'] };
  for (const r of rows) if (LB[r.sta]) out.push(label(r, yB(r.ml), LB[r.sta]));
  out.push(text(padL, topB + hB + 60, `Swings: the University of Utah's published values ÷ 2, for every station it measured 10${EN}300 km away.`, { size: 12.5 }));
  out.push(text(padL, topB + hB + 80, `No station corrections here: ${within} of the ${rows.length} stations land within 0.3 of ${uussML.toFixed(2)}.`, { size: 12.5 }));
  out.push('</svg>');
  write('mag-junction-stations.svg', out.join('\n'));
}

// ---------------------------------------------------------------------------------------------
// G5. How long it shakes (duration magnitude)

async function G5() {
  // CCUT: quiet (noise a quarter of UUSS's line). EKU: its noise sits just under the line, so
  // the coda takes far longer to sink below it. Both have a UUSS duration (END) on this channel.
  const STATIONS = [
    { sta: 'CCUT', loc: '01', cha: 'HHZ', what: 'a quiet station' },
    { sta: 'EKU', loc: '01', cha: 'HHZ', what: 'a noisier station' },
  ];
  const POST = 420;
  const ev = await event(JUNCTION);
  const { xml } = await phaseData(JUNCTION);
  const mags = M.parseQuakeMLMagnitudes(xml);
  const md = mags.network.find((m) => m.type.toLowerCase() === 'md');
  const ends = M.parseQuakeMLAmplitudes(xml).filter((a) => a.type === 'END');
  const picks = await analystPicks(JUNCTION);
  const line0 = M.CODA_THRESHOLD * 1e6;
  console.log(`G5: Junction durations; UUSS line ${line0.toFixed(5)} µm/s; UUSS Md ${md.value} (${md.stationCount} stations)`);
  const panels = [];
  for (const s of STATIONS) {
    const rec = await record(ev, { ...s, postSec: POST });
    const end = ends.find((a) => a.sta === s.sta && a.cha === s.cha && a.loc === s.loc);
    const uussMd = mags.station.find((m) => m.amplitudeId === end.id)?.value;
    const pick = picks[`UU.${s.sta}`] || {};
    const pSec = (pick.P - ev.timeMs) / 1000;
    const sSec = pick.S != null ? (pick.S - ev.timeMs) / 1000 : rec.km / 3.5;
    // ground velocity above 1 Hz (4-pole Butterworth high-pass), then UUSS's 2 s averages 1 s apart
    const v = Float64Array.from(rec.velocity, (q) => (Number.isFinite(q) ? q : 0));
    let mean = 0;
    for (const q of v) mean += q;
    mean /= v.length;
    for (let i = 0; i < v.length; i++) v[i] -= mean;
    filter.createButterworth(4, filter.HIGH_PASS, 1, 0, 1 / rec.sr).filterInPlace(v);
    const env = M.absMeanEnvelope(v, rec.sr, { winSec: 2, stepSec: 1 }).map((e) => ({ t: e.tSec - PRE, v: e.value * 1e6 }));
    const noise = median(env.filter((e) => e.t > -50 && e.t < -2).map((e) => e.v));
    const peak = Math.max(...env.map((e) => e.v));
    const cross = env.find((e) => e.t > sSec + 2 && e.v < line0);
    const tau = cross.t - pSec;
    const p = { ...s, km: rec.km, env, noise, peak, pSec, sSec, cross, tau, uussTau: end.value, uussMd,
      mdOurs: M.codaMagnitude(tau, rec.km), mdFromUuss: M.codaMagnitude(end.value, rec.km) };
    panels.push(p);
    console.log(`  ${s.sta} ${s.cha} ${rec.km.toFixed(1)} km: noise before the quake ${noise.toFixed(4)} µm/s (${(noise / line0).toFixed(2)} of the line), peak ${peak.toFixed(2)} µm/s; ` +
      `P ${pSec.toFixed(2)} s (analyst), S ${sSec.toFixed(1)} s (${pick.S != null ? 'analyst' : 'distance / 3.5 km/s'}); below the line at ${cross.t.toFixed(0)} s; ` +
      `duration ours ${tau.toFixed(1)} s, UUSS ${end.value} s; Md ours ${p.mdOurs.toFixed(2)}, from UUSS's duration ${p.mdFromUuss.toFixed(2)}, UUSS station Md ${uussMd}`);
  }

  const padL = 64;
  const padR = 16;
  const w = W - padL - padR;
  const t0 = -60;
  const t1 = POST;
  const x = (t) => padL + ((t - t0) / (t1 - t0)) * w;
  const H = 200;
  const head = 66;
  const gap = 34;
  const top = (k) => 66 + head + k * (H + head + gap);
  const v0 = 0.001;
  const v1 = 10;
  const out = card(W, top(panels.length - 1) + H + 84, 'How long does it shake? The Junction quake at two stations');
  out.splice(1, 0, `<defs><marker id="mag-dur" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill="${C.note}"/></marker></defs>`);
  out.push(text(12, 42, 'Average ground speed in 2-second pieces. The duration runs from the first wave (P)', { size: 12.5, fill: C.muted }));
  out.push(text(12, 59, 'until the shaking sinks below a fixed line.', { size: 12.5, fill: C.muted }));
  panels.forEach((p, k) => {
    const tp = top(k);
    const y = (v) => tp + (Math.log10(v1 / Math.max(v, v0)) / Math.log10(v1 / v0)) * H;
    out.push(text(padL, tp - head + 18, `${p.sta}, ${Math.round(p.km)} km away: ${p.what}`, { size: 13.5, weight: 700 }));
    out.push(text(padL + w, tp - head + 18, `magnitude from this duration: ${p.mdOurs.toFixed(1)}`, { size: 13, weight: 700, anchor: 'end' }));
    for (const v of [0.001, 0.01, 0.1, 1, 10]) {
      out.push(line(padL, y(v), padL + w, y(v), C.grid));
      out.push(text(padL - 6, y(v) + 4, String(v), { size: 12, fill: C.muted, anchor: 'end' }));
    }
    for (let t = t0; t <= t1; t += 60) out.push(line(x(t), tp, x(t), tp + H, C.grid));
    out.push(`<rect x="${padL}" y="${tp}" width="${w}" height="${H}" fill="none" stroke="${C.border}"/>`);
    out.push(vtext(16, tp + H / 2, 'ground speed (µm/s, log scale)'));
    // UUSS's line
    out.push(line(padL, y(line0), padL + w, y(line0), C.s, 1.8, 'stroke-dasharray="7 4"'));
    // the envelope
    out.push(`<path d="${p.env.map((e, i) => `${i ? 'L' : 'M'}${r1(x(e.t))} ${r1(y(e.v))}`).join('')}" fill="none" stroke="${C.trace}" stroke-width="1.6" stroke-linejoin="round"/>`);
    // P and the end of the duration, with the arrow between them above the plot
    const ay = tp - 12;
    out.push(line(x(p.pSec), ay - 6, x(p.pSec), tp + H, C.p, 2));
    out.push(text(x(p.pSec) - 5, tp + 17, 'P', { size: 13, weight: 700, fill: C.p, anchor: 'end', halo: true }));
    out.push(line(x(p.cross.t), ay - 6, x(p.cross.t), y(p.cross.v), C.note, 1, 'stroke-dasharray="3 3"'));
    out.push(`<circle cx="${r1(x(p.cross.t))}" cy="${r1(y(p.cross.v))}" r="4.5" fill="${C.bg}" stroke="${C.note}" stroke-width="2"/>`);
    out.push(line(x(p.pSec) + 2, ay, x(p.cross.t) - 1, ay, C.note, 1.6, 'marker-start="url(#mag-dur)" marker-end="url(#mag-dur)"'));
    out.push(text((x(p.pSec) + x(p.cross.t)) / 2, ay - 8, `duration ${Math.round(p.tau)} s (University of Utah: ${Math.round(p.uussTau)} s)`, { size: 13, weight: 700, anchor: 'middle' }));
    // labels inside the plot
    // labels go on the side of the line the record leaves clear
    const quiet = p.noise < line0 / 2;
    out.push(text(padL + w - 6, y(line0) + (quiet ? -8 : 27), "University of Utah's line: 0.017 µm/s", { size: 12.5, weight: 600, fill: C.s, anchor: 'end', halo: true }));
    out.push(text(x(-56), y(p.noise) + (quiet ? 20 : -14), `noise: ${p.noise.toFixed(3)} µm/s`, { size: 12, fill: C.muted, halo: true }));
    if (k === panels.length - 1) {
      for (let t = t0; t <= t1; t += 60) {
        if (x(t) < padL + w - 160) out.push(text(x(t), tp + H + 17, String(t), { size: 12, fill: C.muted, anchor: 'middle' }));
      }
      out.push(text(padL + w, tp + H + 17, 'seconds after the quake', { size: 12, fill: C.muted, anchor: 'end' }));
    }
  });
  const yF = top(panels.length - 1) + H + 46;
  const [quiet, noisy] = panels;
  out.push(text(padL, yF, `Both are the same quake. The catalog's duration magnitude, from ${md.stationCount} stations, is ${md.value.toFixed(2)}.`, { size: 12.5 }));
  out.push(text(padL, yF + 20, `${noisy.sta}'s own noise is close to the line, so its shaking takes much longer to sink below it than ${quiet.sta}'s.`, { size: 12.5 }));
  out.push('</svg>');
  write('mag-duration.svg', out.join('\n'));
}

// ---------------------------------------------------------------------------------------------
// G6. One quake, several numbers

async function G6() {
  // Chronological. Dates are given by month only: two of these fall on the evening before
  // their UTC date in Utah time.
  const QUAKES = [
    { id: 'uu60363602', name: 'Magna', when: 'March 2020' },
    { id: 'uu80129556', name: 'West Valley City', when: 'February 2026' },
    { id: 'uu80131546', name: 'Torrey', when: 'March 2026' },
    { id: 'uu80137106', name: 'Kanosh', when: 'April 2026' },
    { id: JUNCTION, name: 'Junction', when: 'October 2026' },
  ];
  const KIND = { ml: 'ML', md: 'Md', mw: 'Mw' };
  const ORDER = ['ml', 'md', 'mw'];
  console.log('G6: UUSS network magnitudes (ComCat phase-data QuakeML)');
  const compiled = [];
  for (const q of QUAKES) {
    const ev = await event(q.id);
    const pd = await phaseData(q.id);
    q.mags = M.parseQuakeMLMagnitudes(pd.xml).network
      .map((m) => ({ type: m.type.toLowerCase(), value: m.value, method: m.method, stationCount: m.stationCount, preferred: m.preferred }))
      .sort((a, b) => ORDER.indexOf(a.type) - ORDER.indexOf(b.type));
    q.coda = q.mags.some((m) => m.type === 'mw' && m.method === 'LLNLCCT');
    const vals = q.mags.map((m) => m.value);
    console.log(`  ${q.id} ${q.name} ${new Date(ev.timeMs).toISOString()}: ` +
      q.mags.map((m) => `${KIND[m.type]} ${m.value.toFixed(2)} (${m.method}${m.stationCount ? ', ' + m.stationCount + ' stations' : ''})${m.preferred ? ' PREFERRED' : ''}`).join('; ') +
      `; spread ${(Math.max(...vals) - Math.min(...vals)).toFixed(2)}`);
    compiled.push({ id: q.id, name: q.name, place: ev.place, timeUtc: new Date(ev.timeMs).toISOString(), quakeml: pd.url, productUpdated: pd.updated, magnitudes: q.mags });
  }
  fs.writeFileSync(new URL('magnitude-several-numbers.json', toolData), JSON.stringify({
    what: "UUSS's network magnitudes for five Utah quakes (figure mag-several-numbers.svg on the page How big was it?)",
    source: 'USGS ComCat, UUSS phase-data QuakeML (University of Utah Seismograph Stations), one product per event (quakeml)',
    accessed: ACCESSED,
    command: 'node tools/figures/magnitude-figures.mjs G6',
    notes: 'type: ml local magnitude (method RichterMl2), md duration (coda) magnitude (HypoinvMd), mw moment magnitude (HAND: entered by hand, for Magna 5.7, the same as the USGS W-phase moment magnitude; LLNLCCT: from coda waves). preferred: the magnitude the catalog reports.',
    events: compiled,
  }, null, 1) + '\n');
  console.log('wrote tools/figures/data/magnitude-several-numbers.json');

  const COLOR = { ml: SERIES[0], md: SERIES[1], mw: C.trace };
  /** A marker by magnitude type: ML circle, Md square, Mw triangle; filled when preferred. */
  const marker = (type, cx, cy, filled, s = 7) => {
    const attr = `fill="${filled ? COLOR[type] : C.bg}" stroke="${COLOR[type]}" stroke-width="2.4"`;
    if (type === 'ml') return `<circle cx="${r1(cx)}" cy="${r1(cy)}" r="${s}" ${attr}/>`;
    if (type === 'md') return `<rect x="${r1(cx - s + 0.5)}" y="${r1(cy - s + 0.5)}" width="${2 * s - 1}" height="${2 * s - 1}" ${attr}/>`;
    return `<path d="M${r1(cx)} ${r1(cy - s - 1)}L${r1(cx + s + 1)} ${r1(cy + s - 1)}L${r1(cx - s - 1)} ${r1(cy + s - 1)}Z" ${attr} stroke-linejoin="round"/>`;
  };
  const padL = 30;
  const padR = 30;
  const w = W - padL - padR;
  const rowH = 108;
  const top = 104;
  const out = card(W, top + QUAKES.length * rowH + 50, 'One quake, several numbers: University of Utah magnitudes for five quakes');
  // legend
  const ly = 48;
  [['ml', 'ML: from the biggest swing', 0], ['md', 'Md: from the duration', 232], ['mw', 'Mw: moment magnitude', 428]].forEach(([t, lab, dx]) => {
    out.push(marker(t, padL + 8 + dx, ly - 4, false, 6));
    out.push(text(padL + 22 + dx, ly, lab, { size: 12.5 }));
  });
  out.push(marker('ml', padL + 8, ly + 20, true, 6));
  out.push(marker('md', padL + 28, ly + 20, true, 6));
  out.push(marker('mw', padL + 48, ly + 20, true, 6));
  out.push(text(padL + 64, ly + 24, 'filled, with its number in bold: the one the catalog reports (preferred)', { size: 12.5 }));
  QUAKES.forEach((q, k) => {
    const y0 = top + k * rowH;
    const ya = y0 + 50;
    const vals = q.mags.map((m) => m.value);
    const center = Math.round(((Math.min(...vals) + Math.max(...vals)) / 2) * 10) / 10;
    const lo = center - 0.5;
    const x = (m) => padL + (m - lo) * w;
    out.push(`<text x="${padL}" y="${y0 + 14}" font-size="13.5" fill="${C.note}"><tspan font-weight="700">${esc(q.name)}</tspan><tspan fill="${C.muted}" font-size="12.5">, ${esc(q.when)}${q.coda ? ' (its Mw is worked out from coda waves)' : ''}</tspan></text>`);
    out.push(line(padL, ya, padL + w, ya, C.muted, 1.2));
    for (let i = 0; i <= 10; i++) {
      const m = lo + i / 10;
      out.push(line(x(m), ya, x(m), ya + (i % 2 ? 4 : 7), C.muted, 1.2));
      if (i % 2 === 0) out.push(text(x(m), ya + 37, m.toFixed(1), { size: 12, fill: C.muted, anchor: 'middle' }));
    }
    for (const m of q.mags.filter((v) => !v.preferred)) {
      out.push(marker(m.type, x(m.value), ya, false));
      out.push(text(x(m.value), ya + 23, m.value.toFixed(2), { size: 12.5, fill: COLOR[m.type], weight: 600, anchor: 'middle', halo: true }));
    }
    for (const m of q.mags.filter((v) => v.preferred)) {
      out.push(marker(m.type, x(m.value), ya, true));
      out.push(text(x(m.value), ya - 14, `${KIND[m.type]} ${m.value.toFixed(2)}`, { size: 13.5, weight: 700, fill: COLOR[m.type], anchor: 'middle', halo: true }));
    }
  });
  const yF = top + QUAKES.length * rowH + 14;
  out.push(text(padL, yF, 'Every row is one magnitude step wide. For the same quake, the methods land up to a few tenths apart.', { size: 12.5 }));
  out.push('</svg>');
  write('mag-several-numbers.svg', out.join('\n'));
}

const ALL = { G1, G2, G3, G5, G6 };
for (const name of only) if (!ALL[name]) throw new Error(`unknown figure ${name}; choose from ${Object.keys(ALL).join(' ')}`);
for (const [name, fn] of Object.entries(ALL)) if (!only.length || only.includes(name)) await fn();
