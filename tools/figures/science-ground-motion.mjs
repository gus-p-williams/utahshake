// Make the figures for the "Which way the ground moves" page (docs/theory/ground-motion.md).
//
//   node tools/figures/science-ground-motion.mjs              all figures (offline)
//   node tools/figures/science-ground-motion.mjs sensors rt   only some (names below)
//   node tools/figures/science-ground-motion.mjs --refetch    first redo the direction check
//
//   gm-three-sensors.svg     three sensors at right angles; the path the ground traces (TMU)
//   gm-radial-transverse.svg P pushes along the path, S shakes across it (MTPU, Junction M3.3)
//   gm-up-away.svg           why "up goes with away" (diagram)
//   gm-pointing.svg          pointing to the quake from P-wave motion (TMU, Kenilworth M2.7)
//   gm-direction-errors.svg  how good is it: 271 station-quake pairs
//   gm-one-station.svg       locating a quake with one station (TMU, Kenilworth M2.7)
//   gm-far-quake.svg         a distant quake at SGU on Z, R and T (Sand Point M7.3)
//   gm-rayleigh-roll.svg     Rayleigh waves roll the ground backwards (SGU, Sand Point M7.3)
//
// Waveforms come from the Quake Explorer offline samples (docs/app/data/samples/qe-*),
// read and processed with the app's own modules (miniSEED parser, causal band-pass filter,
// motion.js, hodogram.js, geo.js, locate.js), so the numbers match what students see in
// the app. The direction check (gm-direction-errors) reads tools/figures/data/
// motion-directions-1-5hz.json; --refetch remakes that file the way
// tools/quake-explorer/motion-check.mjs does (same quakes, 1–5 Hz, P window from
// P − 0.05 s to P + 0.5 s; web requests cached by tools/quake-explorer/node-setup.mjs).
// Sign conventions: up positive; R (radial) positive AWAY from the quake; T positive 90°
// clockwise from R (motion.js toRadialTransverse, same as ObsPy). Views from the side put
// "toward the quake" on the right, as the app does.
// No credit text in the images: the page captions carry it. Output is deterministic (same
// bytes every run) and has a white background (readable in light and dark docs themes).
import fs from 'node:fs';
import { C, FONT, esc, r1 } from './svg-traces.mjs';

const { parseMiniseed } = await import('../../docs/app/js/data/mseed.js');
const { filteredData } = await import('../../docs/app/js/data/filters.js');
const { picksByStation, chooseChannels, channelInfo } = await import('../../docs/app/js/lib/fdsn.js');
const { rotateHorizontals, verticalUp, toRadialTransverse, pWaveBackAzimuth, angleDiff } =
  await import('../../docs/app/js/lib/motion.js');
const { alongAzimuth, norm360, compassPoint, trustReport } = await import('../../docs/app/js/lib/hodogram.js');
const { peakAbs, rms, decimate, niceStep } = await import('../../docs/app/js/lib/signal.js');
const { distanceKm, azimuthDeg, destination, localProjection } = await import('../../docs/app/js/lib/geo.js');
const { spToDistanceKm, hypoToEpiKm, kmPerSecond } = await import('../../docs/app/js/lib/locate.js');
const { WAVE_RACE } = await import('../../docs/app/js/config.js');

const outDir = new URL('../../docs/theory/img/', import.meta.url);
const dataFile = new URL('./data/motion-directions-1-5hz.json', import.meta.url);
fs.mkdirSync(outDir, { recursive: true });
const args = process.argv.slice(2);
const only = args.filter((a) => !a.startsWith('--'));
const want = (name) => !only.length || only.includes(name);

// ---------------------------------------------------------------------------
// House style (svg-traces.mjs colours; the app's colours for the direction arrows)
// ---------------------------------------------------------------------------

const K = { ...C, text: C.note, true: '#b45309', computer: '#7c3aed', clear: '#1d4ed8', unclear: '#a9b4c4',
  rock: '#f3efe4', rockEdge: '#c9bfa6', station: '#374151', quake: '#f59e0b', quakeEdge: '#b45309',
  push: '#0f766e', pull: '#c0262d' };
const MINUS = '−';
const DEG = '°';
const HALO = `stroke="${C.bg}" stroke-width="4" stroke-linejoin="round" paint-order="stroke"`;
const RAD = Math.PI / 180;
/** Signed whole degrees with a true minus: −3°, +12°. */
const sdeg = (d) => `${d < -0.5 ? MINUS : d > 0.5 ? '+' : ''}${Math.abs(Math.round(d))}${DEG}`;

/** <text>; content is markup (escape plain strings with esc). */
function text(x, y, content, { size = 13, weight = 400, fill = K.text, anchor = 'start', halo = false,
  style = '', rotate = 0 } = {}) {
  const a = [`x="${r1(x)}"`, `y="${r1(y)}"`, `font-size="${size}"`];
  if (weight !== 400) a.push(`font-weight="${weight}"`);
  if (style) a.push(`font-style="${style}"`);
  if (anchor !== 'start') a.push(`text-anchor="${anchor}"`);
  a.push(`fill="${fill}"`);
  if (halo) a.push(HALO);
  if (rotate) a.push(`transform="rotate(${r1(rotate)} ${r1(x)} ${r1(y)})"`);
  return `<text ${a.join(' ')}>${content}</text>`;
}
const line = (x1, y1, x2, y2, stroke, width = 1.5, extra = '') =>
  `<line x1="${r1(x1)}" y1="${r1(y1)}" x2="${r1(x2)}" y2="${r1(y2)}" stroke="${stroke}" stroke-width="${width}"${extra ? ' ' + extra : ''}/>`;
const dot = (x, y, r, fill, stroke = 'none', width = 0) =>
  `<circle cx="${r1(x)}" cy="${r1(y)}" r="${r}" fill="${fill}"${stroke !== 'none' ? ` stroke="${stroke}" stroke-width="${width}"` : ''}/>`;

/** Arrowhead at (x, y) pointing along angle a (radians, screen coordinates). */
function head(x, y, a, color, len = 10, half = 5) {
  const ux = Math.cos(a);
  const uy = Math.sin(a);
  const bx = x - ux * len;
  const by = y - uy * len;
  return `<polygon points="${r1(x)},${r1(y)} ${r1(bx - uy * half)},${r1(by + ux * half)} ${r1(bx + uy * half)},${r1(by - ux * half)}" fill="${color}"/>`;
}
/** Straight arrow from (x1, y1) to (x2, y2). */
function arrow(x1, y1, x2, y2, color, width = 2, { dash = '', len = 10, half = 5, both = false } = {}) {
  const a = Math.atan2(y2 - y1, x2 - x1);
  const sx = both ? x1 + Math.cos(a) * len * 0.8 : x1;
  const sy = both ? y1 + Math.sin(a) * len * 0.8 : y1;
  const out = [line(sx, sy, x2 - Math.cos(a) * len * 0.8, y2 - Math.sin(a) * len * 0.8, color, width,
    `stroke-linecap="round"${dash ? ` stroke-dasharray="${dash}"` : ''}`), head(x2, y2, a, color, len, half)];
  if (both) out.push(head(x1, y1, a + Math.PI, color, len, half));
  return out.join('');
}

/** Open a card: <svg>, <title>, <desc>, white rounded background and a title line. */
function card(width, height, title, desc) {
  return [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}" role="img" ${FONT}>`,
    `<title>${esc(title)}</title>`,
    `<desc>${esc(desc)}</desc>`,
    `<rect x="0.5" y="0.5" width="${width - 1}" height="${height - 1}" rx="8" fill="${C.bg}" stroke="${C.border}"/>`,
    text(12, 22, esc(title), { size: 15, weight: 600 }),
  ];
}
function save(name, out) {
  out.push('</svg>');
  fs.writeFileSync(new URL(name, outDir), out.join('\n') + '\n');
  console.log(`wrote docs/theory/img/${name}`);
}

/** Station triangle centred on (x, y). */
function triangle(x, y, size = 8, color = K.station) {
  const h = size * 1.6;
  return `<polygon points="${r1(x)},${r1(y - h * 0.62)} ${r1(x - size)},${r1(y + h * 0.38)} ${r1(x + size)},${r1(y + h * 0.38)}" fill="${color}" stroke="#ffffff" stroke-width="1.2" stroke-linejoin="round"/>`;
}
/** Star centred on (cx, cy). */
function star(cx, cy, ro = 11, ri = 4.6, fill = K.quake, edge = K.quakeEdge) {
  const pts = [];
  for (let i = 0; i < 10; i++) {
    const r = i % 2 ? ri : ro;
    const a = (-90 + i * 36) * RAD;
    pts.push(`${r1(cx + r * Math.cos(a))},${r1(cy + r * Math.sin(a))}`);
  }
  return `<polygon points="${pts.join(' ')}" fill="${fill}" stroke="${edge}" stroke-width="1.2" stroke-linejoin="round"/>`;
}

// ---------------------------------------------------------------------------
// Samples and traces
// ---------------------------------------------------------------------------

const samplesDir = new URL('../../docs/app/data/samples/', import.meta.url);
const cache = new Map();
/** A Quake Explorer offline sample: event, stations, analyst and computer picks, traces. */
function loadSample(dir) {
  if (cache.has(dir)) return cache.get(dir);
  const j = (f) => JSON.parse(fs.readFileSync(new URL(`${dir}/${f}`, samplesDir), 'utf8'));
  const sample = j('sample.json');
  const event = j('event.json');
  const buf = fs.readFileSync(new URL(`${dir}/waveforms.mseed`, samplesDir));
  const fromMs = event.timeMs - sample.window.preSec * 1000;
  const toMs = event.timeMs + sample.window.postSec * 1000;
  const s = { dir, sample, event, stations: j('stations.json'), picks: picksByStation(j('picks.json')),
    computer: j('computer-picks.json'),
    traces: parseMiniseed(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.length), { fromMs, toMs }) };
  cache.set(dir, s);
  return s;
}

/**
 * One station's three components as up, north and east (filtered lo–hi Hz), with the
 * true direction to the quake (bazDeg) and distance from the official epicentre.
 * decim: downsample first (whole-number factors, e.g. [5, 5]) for long, slow records.
 * t(i) = seconds after the origin of sample i; i(sec) = the sample at that time.
 */
function station(dir, sta, { lo, hi, decim = [] }) {
  const s = loadSample(dir);
  const st = s.stations.find((x) => x.sta === sta);
  const ch = chooseChannels(st);
  const info = channelInfo(st, ch);
  const tr = ch.channels.map((c) => {
    let t = s.traces.find((x) => x.sta === sta && x.cha === c);
    for (const f of decim) {
      const d = decimate(t.data, t.sampleRate, f);
      t = { ...t, data: d.data, sampleRate: d.sampleRate };
    }
    return t;
  });
  const [z, h1, h2] = tr.map((t) => filteredData(t, { lo, hi }));
  const { n, e } = rotateHorizontals(h1, h2, info[1].azimuth ?? 0, info[2].azimuth ?? 90);
  const sr = tr[0].sampleRate;
  const t0 = (tr[0].startMs - s.event.timeMs) / 1000;
  const bazDeg = azimuthDeg(st.lat, st.lon, s.event.lat, s.event.lon);
  const pk = s.picks[`${st.net}.${sta}`] ?? {};
  const comp = (ph) => s.computer.find((p) => p.sta === sta && p.phase === ph)?.timeMs;
  const sec = (ms) => (ms == null ? null : (ms - s.event.timeMs) / 1000);
  return {
    s, st, sta, sr, t0, z: verticalUp(z, info[0].dip ?? -90), n, e, bazDeg,
    km: distanceKm(s.event.lat, s.event.lon, st.lat, st.lon),
    P: sec(pk.P ?? comp('P')), S: sec(pk.S ?? comp('S')), pWho: pk.P ? 'analyst' : 'computer',
    sWho: pk.S ? 'analyst' : 'computer',
    t: (i) => t0 + i / sr,
    i: (secs) => Math.round((secs - t0) * sr),
  };
}

// ---------------------------------------------------------------------------
// Drawing pieces: traces in a box, and a particle-motion (hodogram) plot
// ---------------------------------------------------------------------------

/**
 * Traces stacked in a box from x0 to x1, top to top + rows·rowH, for fromSec..toSec.
 * rows: [{data, label, color, amp}] with amp = value drawn at half the row height (a shared
 * amp gives the rows one scale). Returns the SVG parts and an x(sec) mapping.
 */
function traceBox({ sta, rows, x0, x1, top, rowH, fromSec, toSec, axis = true, axisLabel = 's after the quake',
  tickStep, unit = 1 }) {
  const out = [];
  const x = (sec) => x0 + ((sec - fromSec) / (toSec - fromSec)) * (x1 - x0);
  const h = rows.length * rowH;
  const step = tickStep ?? niceStep((toSec - fromSec) / unit, 6);
  for (let t = Math.ceil(fromSec / unit / step) * step; t <= toSec / unit + 1e-9; t += step) {
    const gx = x(t * unit);
    out.push(line(gx, top, gx, top + h, C.grid, 1));
    if (axis) out.push(text(gx, top + h + 15, String(Math.round(t * 100) / 100), { size: 11, fill: C.muted, anchor: 'middle' }));
  }
  if (axis && axisLabel) out.push(text(x1, top + h + 30, esc(axisLabel), { size: 11, fill: C.muted, anchor: 'end' }));
  out.push(`<rect x="${r1(x0)}" y="${r1(top)}" width="${r1(x1 - x0)}" height="${r1(h)}" fill="none" stroke="${C.border}"/>`);
  rows.forEach((row, k) => {
    const y0 = top + k * rowH + rowH / 2;
    if (k > 0) out.push(line(x0, top + k * rowH, x1, top + k * rowH, C.grid, 1));
    const scale = (rowH / 2 - 3) / (row.amp || 1);
    const i0 = Math.max(0, sta.i(fromSec));
    const i1 = Math.min(row.data.length, sta.i(toSec) + 1);
    let d = '';
    const cols = Math.floor(x1 - x0);
    if ((i1 - i0) / cols > 2) {
      // many samples per pixel: draw each pixel column's min and max
      for (let c = 0; c < cols; c++) {
        const a = i0 + Math.floor(((i1 - i0) * c) / cols);
        const b = i0 + Math.floor(((i1 - i0) * (c + 1)) / cols);
        let mn = Infinity;
        let mx = -Infinity;
        for (let i = a; i < b; i++) { const v = row.data[i]; if (v < mn) mn = v; if (v > mx) mx = v; }
        if (!Number.isFinite(mn)) continue;
        const cx = r1(x0 + c + 0.5);
        d += `${c ? 'L' : 'M'}${cx} ${r1(y0 - mx * scale)}L${cx} ${r1(y0 - mn * scale)}`;
      }
    } else {
      for (let i = i0; i < i1; i++) d += `${i > i0 ? 'L' : 'M'}${r1(x(sta.t(i)))} ${r1(y0 - row.data[i] * scale)}`;
    }
    out.push(`<path d="${d}" fill="none" stroke="${row.color || C.trace}" stroke-width="1.1" stroke-linejoin="round"/>`);
    out.push(text(x0 + 5, top + k * rowH + 14, esc(row.label), { size: 12, weight: 600, fill: row.labelColor || C.muted, halo: true }));
    if (row.right) out.push(text(x1 - 5, top + k * rowH + 14, esc(row.right), { size: 11, fill: C.muted, anchor: 'end', halo: true }));
  });
  return { out, x, h };
}

/** Colour between a (f = 0) and b (f = 1), both '#rrggbb'. */
function mix(a, b, f) {
  const p = (h) => [1, 3, 5].map((k) => parseInt(h.slice(k, k + 2), 16));
  const [ca, cb] = [p(a), p(b)];
  return '#' + ca.map((v, k) => Math.round(v + (cb[k] - v) * f).toString(16).padStart(2, '0')).join('');
}

/**
 * The path (xs[i], ys[i]) for i0 <= i < i1, centred on (cx, cy), scaled by k px per unit,
 * y up. Pale at the start, dark at the end (like the app); open circle at the start,
 * dot at the end. colour: the path's darkest colour.
 */
function path(xs, ys, i0, i1, cx, cy, k, colour = C.trace, steps = 24) {
  const out = [];
  const n = i1 - i0;
  for (let s = 0; s < steps; s++) {
    const a = i0 + Math.floor((n - 1) * s / steps);
    const b = i0 + Math.floor((n - 1) * (s + 1) / steps);
    let d = '';
    for (let i = a; i <= b; i++) d += `${i === a ? 'M' : 'L'}${r1(cx + xs[i] * k)} ${r1(cy - ys[i] * k)}`;
    out.push(`<path d="${d}" fill="none" stroke="${mix('#ffffff', colour, 0.2 + 0.8 * (s / (steps - 1)))}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>`);
  }
  out.push(dot(cx + xs[i0] * k, cy - ys[i0] * k, 4, C.bg, C.trace, 1.5));
  out.push(dot(cx + xs[i1 - 1] * k, cy - ys[i1 - 1] * k, 3.5, colour, C.bg, 1));
  return out;
}

/** Round plot frame: circle, cross-hairs, labels at the four sides (null = none). */
function frame(cx, cy, R, { top, right, bottom, left, bold = true } = {}) {
  const out = [dot(cx, cy, R, '#fbfcfd', C.border, 1),
    line(cx - R, cy, cx + R, cy, C.grid, 1), line(cx, cy - R, cx, cy + R, C.grid, 1)];
  const o = { size: 12, weight: bold ? 700 : 400, anchor: 'middle' };
  if (top) out.push(text(cx, cy - R - 6, esc(top), o));
  if (bottom) out.push(text(cx, cy + R + 15, esc(bottom), o));
  if (right) out.push(text(cx + R + 6, cy + 4, esc(right), { ...o, anchor: 'start' }));
  if (left) out.push(text(cx - R - 6, cy + 4, esc(left), { ...o, anchor: 'end' }));
  return out;
}

/** Arrow from the centre of a "seen from above" plot toward azimuth az. */
function azArrow(cx, cy, len, az, color, width = 2.5, dash = '') {
  return arrow(cx, cy, cx + Math.sin(az * RAD) * len, cy - Math.cos(az * RAD) * len, color, width, { dash, len: 11, half: 5.5 });
}

// ---------------------------------------------------------------------------
// Data for the direction check (gm-direction-errors)
// ---------------------------------------------------------------------------

// The quakes of the Phase 0 check (planning/quake-explorer.md section 9C): Junction and
// Magna, plus the 12 most recent M2.5+ quakes with analyst picks within 150 km of the
// central-Utah schools on 2026-11-24 (Junction was one of them, so 13 in all). This is
// `motion-check.mjs uu80162166 uu60363602 --recent 12 --band 1-5` with the list fixed.
const CHECK_EVENTS = ['uu80162166', 'uu60363602', 'uu80165416', 'uu80164981', 'uu80163631', 'uu80163566',
  'uu80163521', 'uu80163431', 'uu80162776', 'uu80162486', 'uu80162171', 'uu80161711', 'uu80158051'];

/** Redo the direction check (as motion-check.mjs does) and keep the results in dataFile. */
async function refetch() {
  const { app } = await import('../quake-explorer/node-setup.mjs');
  const { EarthScopeUSGSSource } = await app('data/earthscope-usgs.js');
  const src = new EarthScopeUSGSSource();
  const pairs = [];
  const events = [];
  for (const id of CHECK_EVENTS) {
    const ev = await src.getEvent(id);
    events.push({ id, place: ev.place, mag: ev.mag, time: new Date(ev.timeMs).toISOString() });
    const by = picksByStation(await src.getAnalystPicks(id));
    const stations = await src.getStations({ lat: ev.lat, lon: ev.lon, maxKm: 200, atMs: ev.timeMs });
    const cands = [];
    for (const s of stations) {
      const p = by[`${s.net}.${s.sta}`]?.P;
      const ch = chooseChannels(s);
      if (!p || !ch || ch.channels.length < 3) continue;
      cands.push({ s, ch, info: channelInfo(s, ch), pMs: p });
    }
    if (!cands.length) continue;
    const reqs = cands.flatMap((c) => c.ch.channels.map((cha) => ({ net: c.s.net, sta: c.s.sta, loc: c.ch.loc, cha })));
    const tMin = Math.min(...cands.map((c) => c.pMs)) - 6000;
    const tMax = Math.max(...cands.map((c) => c.pMs)) + 6000;
    const traces = await src.getWaveforms(reqs, tMin, tMax);
    for (const c of cands) {
      const tr = c.ch.channels.map((cha) => traces.find((t) => t.sta === c.s.sta && t.cha === cha));
      if (tr.some((t) => !t) || new Set(tr.map((t) => t.sampleRate)).size > 1) continue;
      const [z, h1, h2] = tr.map((t) => filteredData(t, { lo: 1, hi: 5 }));
      const [iz, i1, i2] = c.info;
      const { n, e } = rotateHorizontals(h1, h2, i1.azimuth ?? 0, i2.azimuth ?? 90);
      const sr = tr[0].sampleRate;
      const iP = Math.round(((c.pMs - tr[0].startMs) / 1000) * sr);
      const trueBaz = azimuthDeg(c.s.lat, c.s.lon, ev.lat, ev.lon);
      const r = pWaveBackAzimuth(verticalUp(z, iz.dip ?? -90), n, e, iP - Math.round(0.05 * sr), iP + Math.round(0.5 * sr));
      pairs.push([id, c.s.sta, c.ch.band, +distanceKm(ev.lat, ev.lon, c.s.lat, c.s.lon).toFixed(1), +trueBaz.toFixed(1),
        +angleDiff(r.bazDeg, trueBaz).toFixed(2), +r.linearity.toFixed(4), +r.upAwayCorr.toFixed(4)]);
    }
  }
  const about = 'P-wave particle-motion direction vs the true direction to the quake, one row per station-quake ' +
    'pair. Made by tools/figures/science-ground-motion.mjs --refetch, the same check as ' +
    'tools/quake-explorer/motion-check.mjs (window 0.5 s). Waveforms: University of Utah Seismograph Stations ' +
    '(network UU, doi:10.7914/SN/UU) via EarthScope; events and analyst P picks: USGS ComCat.';
  const columns = ['event', 'station', 'band', 'distKm', 'trueBazDeg', 'errorDeg', 'linearity', 'upAway'];
  const body = ['{', ` "about": ${JSON.stringify(about)},`, ' "band": "1-5 Hz",',
    ' "window": "P - 0.05 s to P + 0.5 s (analyst P pick)",', ' "maxKm": 200,', ` "columns": ${JSON.stringify(columns)},`,
    ' "events": [', events.map((e) => `  ${JSON.stringify(e)}`).join(',\n'), ' ],',
    ' "pairs": [', pairs.map((p) => `  ${JSON.stringify(p)}`).join(',\n'), ' ]', '}'];
  fs.writeFileSync(dataFile, body.join('\n') + '\n');
  console.log(`wrote tools/figures/data/motion-directions-1-5hz.json (${pairs.length} pairs)`);
}
if (args.includes('--refetch')) await refetch();

/** Summary of |errors|: n, median, % within 15° and 30°, % pointing the wrong way (> 150°). */
function errStats(rows) {
  const e = rows.map((r) => Math.abs(r.err)).sort((a, b) => a - b);
  const pct = (f) => Math.round((100 * e.filter(f).length) / e.length);
  return { n: e.length, median: e[Math.floor(e.length / 2)], w15: pct((v) => v <= 15), w30: pct((v) => v <= 30),
    flipped: pct((v) => v > 150), n30: e.filter((v) => v <= 30).length };
}
const isClear = (r) => r.lin > 0.8 && r.upAway > 0.5;

// ===========================================================================
// gm-direction-errors.svg: how good is it?
// ===========================================================================

if (want('errors')) {
  const data = JSON.parse(fs.readFileSync(dataFile, 'utf8'));
  const rows = data.pairs.map(([event, sta, band, km, baz, err, lin, upAway]) => ({ event, sta, band, km, baz, err, lin, upAway }));
  const all = errStats(rows);
  const clear = errStats(rows.filter(isClear));
  const fmt = (s) => `n ${s.n}, median ${s.median.toFixed(1)}°, within 15°: ${s.w15}%, within 30°: ${s.w30}% (${s.n30}), wrong end: ${s.flipped}%`;
  console.log(`direction check: ${data.events.length} quakes`);
  console.log(`  all:   ${fmt(all)}`);
  console.log(`  clear: ${fmt(clear)}`);
  for (const [a, b] of [[0, 10], [10, 50], [50, 100], [100, 150], [150, 200], [10, 100], [0, 100], [100, 200]]) {
    const r = rows.filter((x) => x.km >= a && x.km < b);
    console.log(`  ${a}–${b} km: ${fmt(errStats(r))}; clear ${r.filter(isClear).length}`);
  }
  const tmuSgu = rows.filter((r) => (r.sta === 'TMU' || r.sta === 'SGU') && r.km > 125);
  console.log(`  TMU/SGU beyond 125 km: ${fmt(errStats(tmuSgu))}`);

  const W = 760;
  const H = 330;
  const out = card(W, H, 'How close is the direction from P-wave motion?',
    'Left: histogram of direction errors for 271 station-quake pairs. Right: error against distance.');
  // --- left: histogram -----------------------------------------------------
  const L = { x0: 56, x1: 410, top: 64, bottom: 270 };
  const bins = 18;
  const counts = Array.from({ length: bins }, () => ({ clear: 0, other: 0 }));
  for (const r of rows) {
    const b = Math.min(bins - 1, Math.floor(Math.abs(r.err) / 10));
    counts[b][isClear(r) ? 'clear' : 'other']++;
  }
  const yMax = 120;
  const bx = (deg) => L.x0 + (deg / 180) * (L.x1 - L.x0);
  const by = (n) => L.bottom - (n / yMax) * (L.bottom - L.top);
  for (let v = 0; v <= yMax; v += 30) {
    out.push(line(L.x0, by(v), L.x1, by(v), C.grid, 1));
    out.push(text(L.x0 - 6, by(v) + 4, String(v), { size: 11, fill: C.muted, anchor: 'end' }));
  }
  out.push(text(L.x0 - 40, (L.top + L.bottom) / 2, 'station-quake pairs', { size: 11, fill: C.muted, anchor: 'middle', rotate: -90 }));
  // shaded "wrong end" zone
  out.push(`<rect x="${r1(bx(150))}" y="${L.top}" width="${r1(bx(180) - bx(150))}" height="${L.bottom - L.top}" fill="rgba(192,38,45,0.07)"/>`);
  counts.forEach((c, k) => {
    const xa = bx(k * 10) + 1.5;
    const w = bx(10) - bx(0) - 3;
    const yc = by(c.clear);
    out.push(`<rect x="${r1(xa)}" y="${r1(yc)}" width="${r1(w)}" height="${r1(L.bottom - yc)}" fill="${K.clear}"/>`);
    const yo = by(c.clear + c.other);
    if (c.other) out.push(`<rect x="${r1(xa)}" y="${r1(yo)}" width="${r1(w)}" height="${r1(yc - yo)}" fill="${K.unclear}"/>`);
  });
  for (let d = 0; d <= 180; d += 30) {
    out.push(text(bx(d), L.bottom + 15, `${d}°`, { size: 11, fill: C.muted, anchor: 'middle' }));
  }
  out.push(line(L.x0, L.bottom, L.x1, L.bottom, C.muted, 1));
  out.push(text((L.x0 + L.x1) / 2, L.bottom + 32, 'how far off the direction was', { size: 12, fill: C.muted, anchor: 'middle' }));
  // 30° line
  out.push(line(bx(30), L.top - 6, bx(30), L.bottom, K.text, 1.2, 'stroke-dasharray="4 3"'));
  out.push(text(bx(30) + 6, L.top + 6, esc(`within 30°: ${all.w30}% of all pairs,`), { size: 12, weight: 600, halo: true }));
  out.push(text(bx(30) + 6, L.top + 22, esc(`${clear.w30}% of the clear ones`), { size: 12, weight: 600, fill: K.clear, halo: true }));
  out.push(text(bx(165), L.top + 50, 'wrong end', { size: 12, weight: 600, fill: K.pull, anchor: 'middle', halo: true }));
  out.push(text(bx(165), L.top + 65, `(${all.flipped}%)`, { size: 12, weight: 600, fill: K.pull, anchor: 'middle', halo: true }));
  // legend
  const lgY = 44;
  out.push(`<rect x="${L.x0}" y="${lgY - 10}" width="12" height="12" fill="${K.clear}"/>`);
  out.push(text(L.x0 + 17, lgY, esc(`clear motion (${clear.n})`), { size: 12 }));
  out.push(`<rect x="${L.x0 + 150}" y="${lgY - 10}" width="12" height="12" fill="${K.unclear}"/>`);
  out.push(text(L.x0 + 167, lgY, esc(`less clear (${all.n - clear.n})`), { size: 12 }));

  // --- right: error against distance ----------------------------------------
  const Rt = { x0: 478, x1: 740, top: 64, bottom: 270 };
  const sx = (km) => Rt.x0 + (km / 200) * (Rt.x1 - Rt.x0);
  const sy = (deg) => Rt.bottom - (deg / 180) * (Rt.bottom - Rt.top);
  out.push(`<rect x="${r1(sx(50))}" y="${Rt.top}" width="${r1(sx(100) - sx(50))}" height="${Rt.bottom - Rt.top}" fill="rgba(29,78,216,0.06)"/>`);
  for (let d = 0; d <= 180; d += 30) {
    out.push(line(Rt.x0, sy(d), Rt.x1, sy(d), C.grid, 1));
    out.push(text(Rt.x0 - 5, sy(d) + 4, `${d}°`, { size: 11, fill: C.muted, anchor: 'end' }));
  }
  for (let km = 0; km <= 200; km += 50) out.push(text(sx(km), Rt.bottom + 15, String(km), { size: 11, fill: C.muted, anchor: 'middle' }));
  out.push(line(Rt.x0, Rt.bottom, Rt.x1, Rt.bottom, C.muted, 1));
  out.push(text((Rt.x0 + Rt.x1) / 2, Rt.bottom + 32, 'distance from the quake (km)', { size: 12, fill: C.muted, anchor: 'middle' }));
  out.push(text(Rt.x0, 44, 'Each dot is one station and one quake', { size: 12 }));
  const sorted = [...rows].sort((a, b) => Number(isClear(a)) - Number(isClear(b))); // clear on top
  for (const r of sorted) {
    out.push(dot(sx(r.km), sy(Math.abs(r.err)), 2.6, isClear(r) ? K.clear : K.unclear, C.bg, 0.6));
  }
  const best = errStats(rows.filter((x) => x.km >= 50 && x.km < 100));
  out.push(text((sx(50) + sx(100)) / 2, sy(112), esc('50–100 km:'), { size: 11, weight: 600, fill: K.clear, anchor: 'middle', halo: true }));
  out.push(text((sx(50) + sx(100)) / 2, sy(112) + 14, esc(`${best.n30} of ${best.n}`), { size: 11, weight: 600, fill: K.clear, anchor: 'middle', halo: true }));
  out.push(text((sx(50) + sx(100)) / 2, sy(112) + 28, 'within 30°', { size: 11, weight: 600, fill: K.clear, anchor: 'middle', halo: true }));
  out.push(text(12, H - 12, esc(`${data.events.length} Utah quakes (M2.5 to M5.7), 1–5 Hz, first half second of P. ` +
    'Clear motion: linearity above 0.8 and up/away above 0.5.'), { size: 11, fill: C.muted }));
  save('gm-direction-errors.svg', out);
}

// ===========================================================================
// gm-three-sensors.svg: three sensors at right angles; from numbers to a path
// ===========================================================================

/** A numbered marker (white circle with a number). */
const marker = (x, y, k) => dot(x, y, 8, C.bg, K.text, 1.4) +
  text(x, y + 4, String(k), { size: 11, weight: 700, anchor: 'middle' });

if (want('sensors')) {
  const m = station('qe-kenilworth', 'TMU', { lo: 1, hi: 5 });
  const a = m.i(m.P - 0.05);
  const b = m.i(m.P + 0.5);
  const est = pWaveBackAzimuth(m.z, m.n, m.e, a, b);
  const along = alongAzimuth(m.n, m.e, est.axisDeg);
  let iMax = a;
  let iMin = a;
  for (let i = a; i < b; i++) {
    if (along[i] > along[iMax]) iMax = i;
    if (along[i] < along[iMin]) iMin = i;
  }
  const moments = [a, Math.min(iMax, iMin), b - 1]; // start, the first big swing, the end
  console.log(`sensors: TMU moments at ${moments.map((i) => m.t(i).toFixed(2)).join(', ')} s; ` +
    moments.map((i) => `N ${m.n[i].toFixed(0)} E ${m.e[i].toFixed(0)}`).join('; '));

  const W = 760;
  const H = 300;
  const out = card(W, H, 'From three sensors to one path: station TMU, the first half second of P',
    'A sketch of three sensors at right angles, then the north and east records turned into a path seen from above.');

  // --- left: the three sensors (oblique sketch) -------------------------------
  const O = { x: 124, y: 200 };
  const pr = (e, n, u) => [O.x + e + 0.55 * n, O.y - 0.42 * n - u];
  const ground = [[-80, -50], [78, -50], [78, 58], [-80, 58]].map(([e, n]) => pr(e, n, 0));
  out.push(`<polygon points="${ground.map(([x, y]) => `${r1(x)},${r1(y)}`).join(' ')}" fill="${K.rock}" stroke="${K.rockEdge}"/>`);
  out.push(text(...pr(-72, -50, 0).map((v, k) => v + [0, -7][k]), 'the ground', { size: 11, fill: C.muted }));
  // the sensor case: a small box
  const box = (e0, n0, u0, s) => {
    const f = (e, n, u) => pr(e0 + e, n0 + n, u0 + u).map(r1).join(',');
    return `<polygon points="${f(-s, -s, 0)} ${f(s, -s, 0)} ${f(s, -s, 2 * s)} ${f(-s, -s, 2 * s)}" fill="#e5e7eb" stroke="${C.muted}"/>` +
      `<polygon points="${f(s, -s, 0)} ${f(s, s, 0)} ${f(s, s, 2 * s)} ${f(s, -s, 2 * s)}" fill="#d1d5db" stroke="${C.muted}"/>` +
      `<polygon points="${f(-s, -s, 2 * s)} ${f(s, -s, 2 * s)} ${f(s, s, 2 * s)} ${f(-s, s, 2 * s)}" fill="#f3f4f6" stroke="${C.muted}"/>`;
  };
  out.push(box(0, 0, 0, 13));
  const tipU = pr(0, 0, 112);
  const tipN = pr(0, 112, 26);
  const tipE = pr(108, 0, 26);
  const base = pr(0, 0, 26);
  out.push(arrow(base[0], base[1], ...tipU, C.trace, 2.4));
  out.push(arrow(base[0], base[1], ...tipN, C.trace, 2.4));
  out.push(arrow(base[0], base[1], ...tipE, C.trace, 2.4));
  out.push(text(tipU[0] + 8, tipU[1] + 6, 'up (Z)', { size: 13, weight: 700 }));
  out.push(text(tipN[0] + 6, tipN[1] - 4, 'north (N)', { size: 13, weight: 700 }));
  out.push(text(tipE[0] - 4, tipE[1] + 20, 'east (E)', { size: 13, weight: 700, anchor: 'middle' }));
  out.push(text(20, H - 30, 'Three sensors at right angles.', { size: 12 }));
  out.push(text(20, H - 14, 'Each feels only the motion along its arrow.', { size: 12 }));

  // --- middle: the north and east records ------------------------------------
  const amp = Math.max(peakAbs(m.n, a, b), peakAbs(m.e, a, b));
  const tb = traceBox({ sta: m, rows: [{ data: m.n, label: 'N (north +)', amp }, { data: m.e, label: 'E (east +)', amp }],
    x0: 262, x1: 492, top: 64, rowH: 78, fromSec: m.t(a), toSec: m.t(b - 1), tickStep: 0.1,
    axisLabel: 's after the quake' });
  out.push(...tb.out);
  out.push(text(262, 52, 'What the two sensors recorded', { size: 13, weight: 600 }));
  const scale = (78 / 2 - 3) / amp;
  moments.forEach((i, k) => {
    const x = tb.x(m.t(i));
    out.push(line(x, 64, x, 64 + 156, C.muted, 1, 'stroke-dasharray="2 3"'));
    out.push(marker(x, 64 + 39 - m.n[i] * scale, k + 1));
    out.push(marker(x, 64 + 78 + 39 - m.e[i] * scale, k + 1));
  });
  out.push(text(262, H - 30, 'At each moment, the north and east readings', { size: 12 }));
  out.push(text(262, H - 14, 'give one point: how the ground was moving.', { size: 12 }));

  // --- right: the path seen from above ----------------------------------------
  const cx = 640;
  const cy = 154;
  const R = 84;
  out.push(text(cx, 44, 'The path, seen from above', { size: 13, weight: 600, anchor: 'middle' }));
  out.push(...frame(cx, cy, R, { top: 'N', right: 'E', bottom: 'S', left: 'W' }));
  let hm = 0;
  for (let i = a; i < b; i++) hm = Math.max(hm, Math.hypot(m.n[i], m.e[i]));
  const k = (R * 0.92) / hm;
  out.push(...path(m.e, m.n, a, b, cx, cy, k));
  moments.forEach((i, j) => {
    // put each number just off the path, on the side away from the centre
    const x = cx + m.e[i] * k;
    const y = cy - m.n[i] * k;
    const d = Math.hypot(x - cx, y - cy) || 1;
    const off = j === 0 ? [15, 15] : [((x - cx) / d) * 15, ((y - cy) / d) * 15];
    out.push(line(x, y, x + off[0] * 0.55, y + off[1] * 0.55, C.muted, 1));
    out.push(marker(x + off[0], y + off[1], j + 1));
  });
  out.push(text(cx - 112, H - 30, 'Joining the points draws the path: here,', { size: 12 }));
  out.push(text(cx - 112, H - 14, 'back and forth along one line (NE–SW).', { size: 12 }));
  save('gm-three-sensors.svg', out);
}

// ===========================================================================
// gm-radial-transverse.svg: P pushes along the path, S shakes across it
// ===========================================================================

if (want('rt')) {
  const m = station('qe-junction', 'MTPU', { lo: 1, hi: 10 });
  const { r, t } = toRadialTransverse(m.n, m.e, m.bazDeg);
  const { P, S } = m;
  const ratio = (s0, s1) => rms(t, m.i(s0), m.i(s1)) / rms(r, m.i(s0), m.i(s1));
  const pRatio = ratio(P - 0.05, P + 1.0);
  const sRatio = ratio(S, S + 2.0);
  const pw = [P - 0.3, P + 1.2];
  const sw = [S - 0.3, S + 2.2];
  const ampOf = ([s0, s1]) => Math.max(...[m.z, r, t].map((d) => peakAbs(d, m.i(s0), m.i(s1))));
  const ampP = ampOf(pw);
  const ampS = ampOf(sw);
  console.log(`rt: MTPU ${m.km.toFixed(1)} km, baz ${m.bazDeg.toFixed(1)}°, P ${P.toFixed(2)} s (${m.pWho}), S ${S.toFixed(2)} s (${m.sWho}); ` +
    `rms T/R first 1 s of P ${pRatio.toFixed(2)}, first 2 s of S ${sRatio.toFixed(2)}; ` +
    `rms T in S / T in P ${(rms(t, m.i(S), m.i(S + 2)) / rms(t, m.i(P - 0.05), m.i(P + 1))).toFixed(1)}; S column drawn ${(ampS / ampP).toFixed(1)}x smaller`);

  const W = 760;
  const H = 336;
  const out = card(W, H, `P pushes along the path, S shakes across it: station MTPU, ${m.km.toFixed(0)} km from the quake`,
    'A map-style sketch of the radial and transverse directions at MTPU, then the up, radial and transverse records during P and during S.');

  // --- left: the directions, seen from above -----------------------------------
  const cx = 122;
  const cy = 178;
  const Rr = 80;
  out.push(text(cx, 52, 'Seen from above', { size: 13, weight: 600, anchor: 'middle' }));
  out.push(dot(cx, cy, Rr, '#fbfcfd', C.border, 1));
  const tip = (az, len) => [cx + Math.sin(az * RAD) * len, cy - Math.cos(az * RAD) * len];
  // the sensors as installed
  out.push(arrow(cx, cy, ...tip(0, 52), C.muted, 1.4, { len: 8, half: 4 }));
  out.push(arrow(cx, cy, ...tip(90, 52), C.muted, 1.4, { len: 8, half: 4 }));
  out.push(text(...tip(0, 52).map((v, k) => v + [8, 6][k]), 'N', { size: 12, fill: C.muted, weight: 600 }));
  out.push(text(...tip(90, 52).map((v, k) => v + [-4, 16][k]), 'E', { size: 12, fill: C.muted, weight: 600 }));
  // the path to the quake, R and T
  const az = m.bazDeg;
  out.push(line(...tip(az, Rr - 2), cx, cy, K.true, 2, 'stroke-dasharray="5 4"'));
  out.push(star(...tip(az, Rr + 4), 9, 3.8));
  out.push(text(...tip(az, Rr + 4).map((v, k) => v + [14, -2][k]), esc(`quake ${Math.round(az)}°`), { size: 12, weight: 600, fill: K.true, halo: true }));
  out.push(arrow(cx, cy, ...tip(az + 180, Rr - 6), C.trace, 2.6));
  out.push(arrow(cx, cy, ...tip(az + 270, Rr - 6), C.trace, 2.6));
  out.push(text(...tip(az + 180, Rr - 6).map((v, k) => v + [10, 4][k]), 'R +', { size: 13, weight: 700, halo: true }));
  out.push(text(...tip(az + 180, Rr - 6).map((v, k) => v + [10, 19][k]), 'away', { size: 12, halo: true }));
  out.push(text(...tip(az + 270, Rr - 6).map((v, k) => v + [-4, 20][k]), 'T + sideways', { size: 12, weight: 600, anchor: 'middle', halo: true }));
  out.push(triangle(cx, cy, 7));
  out.push(text(14, H - 30, 'R: along the path (+ away from the quake)', { size: 12 }));
  out.push(text(14, H - 14, 'T: sideways, across the path', { size: 12 }));

  // --- right: Z, R and T during P and during S ---------------------------------
  const rows = (amp) => [
    { data: m.z, label: 'Z', amp },
    { data: r, label: 'R', amp },
    { data: t, label: 'T', amp },
  ];
  const top = 72;
  const rowH = 56;
  const colP = traceBox({ sta: m, rows: rows(ampP), x0: 262, x1: 492, top, rowH, fromSec: pw[0], toSec: pw[1], tickStep: 0.5, axisLabel: '' });
  const colS = traceBox({ sta: m, rows: rows(ampS), x0: 510, x1: 740, top, rowH, fromSec: sw[0], toSec: sw[1], tickStep: 0.5, axisLabel: 's after the quake' });
  out.push(...colP.out, ...colS.out);
  out.push(line(colP.x(P), top - 6, colP.x(P), top + 3 * rowH, C.p, 2));
  out.push(line(colS.x(S), top - 6, colS.x(S), top + 3 * rowH, C.s, 2));
  out.push(text(262, 58, 'During P', { size: 13, weight: 700, fill: C.p }));
  out.push(text(510, 58, 'During S', { size: 13, weight: 700, fill: C.s }));
  out.push(text(492, 58, 'one scale for all three', { size: 11, fill: C.muted, anchor: 'end' }));
  out.push(text(740, 58, esc(`one scale, squeezed ${Math.round(ampS / ampP)}×`), { size: 11, fill: C.muted, anchor: 'end' }));
  const yNote = top + 3 * rowH + 44;
  out.push(text(262, yNote, esc(`T is only ${Math.round(pRatio * 100)}% of R: P hardly`), { size: 12, weight: 600, fill: C.p }));
  out.push(text(262, yNote + 16, 'moves the ground sideways.', { size: 12, weight: 600, fill: C.p }));
  out.push(text(510, yNote, esc(`T is ${sRatio.toFixed(1)}× R: S shakes the ground`), { size: 12, weight: 600, fill: C.s }));
  out.push(text(510, yNote + 16, 'across the path.', { size: 12, weight: 600, fill: C.s }));
  save('gm-radial-transverse.svg', out);
}

// ===========================================================================
// gm-up-away.svg: why "up goes with away" (diagram)
// ===========================================================================

if (want('upaway')) {
  const W = 760;
  const H = 400;
  const out = card(W, H, 'Why "up" goes with "away"',
    'Cross-section: a P wave travels from a quake, bends upward and reaches a station from below. ' +
    'A push moves the ground up and away from the quake; a pull moves it down and toward the quake.');
  const ySurf = 226;
  out.push(`<path d="M1 ${ySurf}H${W - 1}V${H - 9}Q${W - 1} ${H - 1} ${W - 9} ${H - 1}H9Q1 ${H - 1} 1 ${H - 9}Z" fill="${K.rock}"/>`);
  out.push(line(1, ySurf, W - 1, ySurf, K.rockEdge, 2));
  const st = { x: 150, y: ySurf };
  const q = { x: 640, y: 358 };
  const ctrl = { x: 222, y: 392 };
  // the ray: a quadratic curve from the quake to the station (a cartoon)
  out.push(`<path d="M${q.x} ${q.y}Q${ctrl.x} ${ctrl.y} ${st.x} ${st.y + 2}" fill="none" stroke="${C.p}" stroke-width="2.5"/>`);
  const bez = (f) => [(1 - f) ** 2 * q.x + 2 * (1 - f) * f * ctrl.x + f * f * st.x, (1 - f) ** 2 * q.y + 2 * (1 - f) * f * ctrl.y + f * f * st.y];
  for (const f of [0.35, 0.7]) {
    const [x1, y1] = bez(f);
    const [x2, y2] = bez(f + 0.02);
    out.push(head(x2, y2, Math.atan2(y2 - y1, x2 - x1), C.p, 12, 6));
  }
  out.push(star(q.x, q.y, 12, 5));
  out.push(text(q.x + 16, q.y + 5, 'quake', { size: 13, weight: 700, fill: K.quakeEdge }));
  out.push(text(420, 326, 'the P wave’s path: it bends upward,', { size: 12, fill: C.p, weight: 600 }));
  out.push(text(420, 342, 'because deeper rock is faster', { size: 12, fill: C.p, weight: 600 }));
  out.push(triangle(st.x, st.y - 5, 9));
  out.push(text(st.x, st.y - 22, 'station', { size: 13, weight: 700, anchor: 'middle' }));
  out.push(text(14, ySurf + 22, '← away from the quake', { size: 12, fill: C.muted }));
  out.push(text(W - 14, ySurf + 22, 'toward the quake →', { size: 12, fill: C.muted, anchor: 'end' }));
  // the arrival direction at the station (unit vector of travel)
  const [ax, ay] = bez(0.97);
  const ang = Math.atan2(st.y - ay, st.x - ax);
  const ux = Math.cos(ang);
  const uy = Math.sin(ang);
  // two zoomed-in circles
  const zr = 56;
  const zoom = (zx, zy, sign, title, sub, colour, link) => {
    const o = link ? [line(st.x + 8, st.y - 12, zx - zr * 0.8, zy + zr * 0.6, C.muted, 1, 'stroke-dasharray="3 3"')] : [];
    o.push(dot(zx, zy, zr, C.bg));
    o.push(`<path d="M${zx - zr} ${zy}A${zr} ${zr} 0 0 0 ${zx + zr} ${zy}Z" fill="${K.rock}"/>`);
    o.push(line(zx - zr, zy, zx + zr, zy, K.rockEdge, 1.5));
    o.push(dot(zx, zy, zr, 'none', C.muted, 1.2));
    o.push(line(zx - ux * (zr - 6), zy - uy * (zr - 6), zx + ux * (zr - 6), zy + uy * (zr - 6), C.p, 1.2, 'stroke-dasharray="4 3"'));
    o.push(arrow(zx, zy, zx + sign * ux * 44, zy + sign * uy * 44, colour, 4, { len: 13, half: 7 }));
    o.push(dot(zx, zy, 4.5, C.trace, C.bg, 1));
    o.push(text(zx, zy + zr + 18, esc(title), { size: 13, weight: 700, fill: colour, anchor: 'middle' }));
    o.push(text(zx, zy + zr + 34, esc(sub), { size: 13, weight: 700, fill: colour, anchor: 'middle' }));
    return o;
  };
  out.push(...zoom(340, 104, 1, 'A push (compression):', 'up and away', K.push, true));
  out.push(...zoom(590, 104, -1, 'A pull (dilatation):', 'down and toward', K.pull, false));
  out.push(text(465, 110, 'or', { size: 14, weight: 700, fill: C.muted, anchor: 'middle' }));
  out.push(text(14, 52, 'The ground at the station,', { size: 12, fill: C.muted }));
  out.push(text(14, 68, 'zoomed in →', { size: 12, fill: C.muted }));
  out.push(text(14, 96, 'dashed blue line:', { size: 12, fill: C.p }));
  out.push(text(14, 112, 'the direction the', { size: 12, fill: C.p }));
  out.push(text(14, 128, 'wave travels', { size: 12, fill: C.p }));
  out.push(text(W / 2, H - 12, 'Either way the ground moves along the wave’s path, and up goes with away.', { size: 13, weight: 600, anchor: 'middle' }));
  save('gm-up-away.svg', out);
}

// ===========================================================================
// gm-pointing.svg: pointing to the quake from P-wave motion (TMU, Kenilworth)
// ===========================================================================

if (want('pointing')) {
  const m = station('qe-kenilworth', 'TMU', { lo: 1, hi: 5 });
  const a = m.i(m.P - 0.05);
  const b = m.i(m.P + 0.5);
  const est = pWaveBackAzimuth(m.z, m.n, m.e, a, b);
  const err = angleDiff(est.bazDeg, m.bazDeg);
  const trust = trustReport(est.linearity, est.upAwayCorr);
  console.log(`pointing: TMU ${m.km.toFixed(1)} km; estimate ${est.bazDeg.toFixed(1)}°, true ${m.bazDeg.toFixed(1)}°, error ${err.toFixed(1)}°; ` +
    `linearity ${est.linearity.toFixed(3)}, up/away ${est.upAwayCorr.toFixed(2)}, apparent angle from vertical ${est.incidenceDeg.toFixed(0)}°; ${trust.overall.words}`);
  // first motion: the first clear swing of the vertical after the pick
  const z0 = peakAbs(m.z, a, b);
  let iFirst = a;
  while (iFirst < b && Math.abs(m.z[iFirst]) < 0.1 * z0) iFirst++;
  console.log(`pointing: first motion ${m.z[iFirst] > 0 ? 'up' : 'down'} at ${m.t(iFirst).toFixed(2)} s, toward-quake ${alongAzimuth(m.n, m.e, m.bazDeg)[iFirst].toFixed(0)}`);

  const W = 760;
  const H = 496;
  const out = card(W, H, `Pointing to the quake: station TMU, ${m.km.toFixed(0)} km from the Kenilworth quake`,
    'Three records around the P arrival with the first half second shaded, then the path the ground traced, seen from above and from the side.');
  const amp = Math.max(...[m.z, m.n, m.e].map((d) => peakAbs(d, m.i(10.6), m.i(14))));
  const tb = traceBox({ sta: m, rows: [{ data: m.z, label: 'Z  up', amp }, { data: m.n, label: 'N  north', amp }, { data: m.e, label: 'E  east', amp }],
    x0: 12, x1: 748, top: 50, rowH: 44, fromSec: 10.6, toSec: 14, tickStep: 0.5 });
  out.push(`<rect x="${r1(tb.x(m.t(a)))}" y="50" width="${r1(tb.x(m.t(b)) - tb.x(m.t(a)))}" height="132" fill="${C.pFill}" stroke="${C.p}" stroke-dasharray="4 3"/>`);
  out.push(...tb.out);
  out.push(line(tb.x(m.P), 44, tb.x(m.P), 182, C.p, 2));
  out.push(text(tb.x(m.P) - 5, 42, 'P', { size: 13, weight: 700, fill: C.p, anchor: 'end' }));
  out.push(text(tb.x(m.t(b)) + 6, 64, 'first half second of P', { size: 12, weight: 600, fill: C.p, halo: true }));

  // --- seen from above ---------------------------------------------------------
  const cy = 356;
  const R = 92;
  const ax = 125;
  out.push(text(ax, 240, 'Seen from above', { size: 13, weight: 600, anchor: 'middle' }));
  out.push(...frame(ax, cy, R, { top: 'N', right: 'E', bottom: 'S', left: 'W' }));
  let hm = 0;
  for (let i = a; i < b; i++) hm = Math.max(hm, Math.hypot(m.n[i], m.e[i]));
  out.push(...path(m.e, m.n, a, b, ax, cy, (R * 0.92) / hm));
  out.push(azArrow(ax, cy, R * 0.95, m.bazDeg, K.true, 3));
  out.push(azArrow(ax, cy, R * 0.95, est.bazDeg, K.computer, 2.2, '6 4'));
  const lab = (az, dx, dy, s, colour, anchor) => text(ax + Math.sin(az * RAD) * R * 0.95 + dx, cy - Math.cos(az * RAD) * R * 0.95 + dy,
    esc(s), { size: 12, weight: 700, fill: colour, anchor, halo: true });
  out.push(lab(m.bazDeg, 8, 14, `true ${Math.round(m.bazDeg)}°`, K.true, 'start'));
  out.push(lab(est.bazDeg, -8, -2, `computer ${Math.round(est.bazDeg)}°`, K.computer, 'end'));

  // --- seen from the side --------------------------------------------------------
  const sx = 375;
  out.push(text(sx, 240, 'Seen from the side', { size: 13, weight: 600, anchor: 'middle' }));
  out.push(...frame(sx, cy, R, { top: 'up' }));
  out.push(text(sx - R - 4, cy + R + 16, '← away', { size: 12, weight: 600 }));
  out.push(text(sx + R + 4, cy + R + 16, esc(`toward the quake (${Math.round(m.bazDeg)}°) →`), { size: 12, weight: 600, anchor: 'end' }));
  const tow = alongAzimuth(m.n, m.e, m.bazDeg);
  let sm = 0;
  for (let i = a; i < b; i++) sm = Math.max(sm, Math.abs(tow[i]), Math.abs(m.z[i]));
  const ks = (R * 0.92) / sm;
  out.push(...path(tow, m.z, a, b, sx, cy, ks));
  // label the highest point (up and away) and the first dip (down and toward)
  let iUp = a;
  for (let i = a; i < b; i++) if (m.z[i] > m.z[iUp]) iUp = i;
  let iDown = a;
  for (let i = a; i < iUp; i++) if (m.z[i] < m.z[iDown]) iDown = i;
  console.log(`pointing: highest at ${m.t(iUp).toFixed(2)} s (toward ${tow[iUp].toFixed(0)}), first dip at ${m.t(iDown).toFixed(2)} s (toward ${tow[iDown].toFixed(0)})`);
  const at = (i) => [sx + tow[i] * ks, cy - m.z[i] * ks];
  out.push(dot(...at(iUp), 3, K.push));
  out.push(dot(...at(iDown), 3, K.pull));
  out.push(text(at(iUp)[0] - 10, at(iUp)[1] + 4, 'up and away', { size: 12, weight: 700, fill: K.push, anchor: 'end', halo: true }));
  out.push(text(at(iDown)[0] - 8, at(iDown)[1] + 20, 'first: down and toward', { size: 12, weight: 700, fill: K.pull, anchor: 'end', halo: true }));

  // --- what the computer concludes ---------------------------------------------
  const ix = 512;
  let iy = 276;
  const say = (s, o = {}) => { out.push(text(ix, iy, esc(s), { size: 12.5, ...o })); iy += o.gap ?? 18; };
  say('1. The ground moves along one line:', { weight: 700 });
  say(`${Math.round(est.axisDeg)}° to ${Math.round(norm360(est.axisDeg + 180))}° (${compassPoint(est.axisDeg)} to ${compassPoint(est.axisDeg + 180)}).`, { gap: 26 });
  say('2. Up goes with away: the ground', { weight: 700 });
  say(`goes up as it moves ${compassPoint(est.bazDeg + 180)}, so the`);
  say(`quake is the other way: ${Math.round(est.bazDeg)}° (${compassPoint(est.bazDeg)}).`, { gap: 26 });
  say(`3. True direction: ${Math.round(m.bazDeg)}°. Off by ${sdeg(err)}.`, { weight: 700, gap: 26 });
  say(`Clear line: linearity ${est.linearity.toFixed(2)}`, { fill: C.muted });
  say(`Clear up/away: ${est.upAwayCorr.toFixed(2)}`, { fill: C.muted });
  out.push(text(12, H - 12, '○ start, ● end of the half second: the path darkens as time goes on. Filtered 1–5 Hz.', { size: 11, fill: C.muted }));
  save('gm-pointing.svg', out);
}

// ===========================================================================
// gm-one-station.svg: locating a quake with one station (TMU, Kenilworth)
// ===========================================================================

if (want('one')) {
  const m = station('qe-kenilworth', 'TMU', { lo: 1, hi: 5 });
  const est = pWaveBackAzimuth(m.z, m.n, m.e, m.i(m.P - 0.05), m.i(m.P + 0.5));
  const { vp, vs, depthKm } = WAVE_RACE;
  const sp = m.S - m.P;
  const hypo = spToDistanceKm(sp, vp, vs);
  const epi = hypoToEpiKm(hypo, depthKm);
  const guess = destination(m.st.lat, m.st.lon, est.bazDeg, epi);
  const ev = m.s.event;
  const miss = distanceKm(guess.lat, guess.lon, ev.lat, ev.lon);
  console.log(`one: S − P = ${m.S.toFixed(2)} (${m.sWho}) − ${m.P.toFixed(2)} (${m.pWho}) = ${sp.toFixed(2)} s; k = ${kmPerSecond(vp, vs).toFixed(3)} km/s; ` +
    `distance ${hypo.toFixed(1)} km (slanted), ${epi.toFixed(1)} km on the map with depth ${depthKm} km; true ${m.km.toFixed(1)} km; ` +
    `direction ${est.bazDeg.toFixed(1)}° vs ${m.bazDeg.toFixed(1)}°; estimate ${guess.lat.toFixed(3)}, ${guess.lon.toFixed(3)}; miss ${miss.toFixed(1)} km`);

  const W = 760;
  const H = 440;
  const out = card(W, H, 'One station, one quake: TMU and the Kenilworth quake',
    'Map: from station TMU a line points toward the direction found from P-wave motion; a circle at the distance from S minus P crosses it at the estimate, near the true epicentre.');
  const centre = { lat: (m.st.lat + ev.lat) / 2 + 0.02, lon: (m.st.lon + ev.lon) / 2 };
  const proj = localProjection(centre.lat, centre.lon);
  const S = 3.6; // px per km
  const mx0 = 14;
  const mx1 = 470;
  const my0 = 34;
  const my1 = H - 14;
  const X = (p) => (mx0 + mx1) / 2 + proj.toXY(p.lat, p.lon).x * S;
  const Y = (p) => (my0 + my1) / 2 - proj.toXY(p.lat, p.lon).y * S;
  out.push(`<defs><clipPath id="gm-map"><rect x="${mx0}" y="${my0}" width="${mx1 - mx0}" height="${my1 - my0}" rx="4"/></clipPath></defs>`);
  out.push(`<rect x="${mx0}" y="${my0}" width="${mx1 - mx0}" height="${my1 - my0}" rx="4" fill="${K.rock}" stroke="${C.border}"/>`);
  out.push('<g clip-path="url(#gm-map)">');
  const sx = X(m.st);
  const sy = Y(m.st);
  // the wedge: the direction ± 15°
  const far = 140;
  const wedge = [-15, 15].map((d) => destination(m.st.lat, m.st.lon, est.bazDeg + d, far));
  out.push(`<polygon points="${r1(sx)},${r1(sy)} ${r1(X(wedge[0]))},${r1(Y(wedge[0]))} ${r1(X(wedge[1]))},${r1(Y(wedge[1]))}" fill="rgba(124,58,237,0.10)"/>`);
  // the S − P circle (dashed), as in Quake Locator
  out.push(`<circle cx="${r1(sx)}" cy="${r1(sy)}" r="${r1(epi * S)}" fill="none" stroke="${C.muted}" stroke-width="1.5" stroke-dasharray="6 5"/>`);
  const end = destination(m.st.lat, m.st.lon, est.bazDeg, far);
  out.push(line(sx, sy, X(end), Y(end), K.computer, 2.4, 'stroke-dasharray="8 5"'));
  out.push('</g>');
  // labels on the map
  const lab = destination(m.st.lat, m.st.lon, est.bazDeg - 15, 40);
  out.push(text(X(lab) - 6, Y(lab), esc(`direction from P motion: ${Math.round(est.bazDeg)}°`), { size: 12, weight: 700, fill: K.computer, anchor: 'end', halo: true }));
  out.push(text(X(lab) - 6, Y(lab) + 15, esc('(shaded: ± 15°)'), { size: 11, fill: K.computer, anchor: 'end', halo: true }));
  const arcLab = destination(m.st.lat, m.st.lon, 105, epi);
  out.push(text(X(arcLab) - 4, Y(arcLab) + 18, esc(`${epi.toFixed(0)} km from S ${MINUS} P`), { size: 12, weight: 700, fill: C.muted, anchor: 'end', halo: true }));
  // true and estimated epicentres
  out.push(line(X(guess), Y(guess), X(ev), Y(ev), K.text, 1.4, 'stroke-dasharray="3 3"'));
  out.push(star(X(ev), Y(ev), 12, 5));
  out.push(star(X(guess), Y(guess), 12, 5, K.computer, '#3b0f80'));
  out.push(text(X(ev) + 14, Y(ev) + 18, 'true epicentre', { size: 12, weight: 700, fill: K.quakeEdge, halo: true }));
  out.push(text(X(guess) - 14, Y(guess) - 8, 'one-station estimate', { size: 12, weight: 700, fill: K.computer, anchor: 'end', halo: true }));
  const mid = { lat: (guess.lat + ev.lat) / 2, lon: (guess.lon + ev.lon) / 2 };
  out.push(text(X(mid) + 10, Y(mid) + 2, esc(`${miss.toFixed(0)} km off`), { size: 12, weight: 700, halo: true }));
  out.push(triangle(sx, sy, 9));
  out.push(text(sx + 12, sy + 18, 'TMU', { size: 13, weight: 700, halo: true }));
  // north arrow and scale bar
  out.push(`<path d="M${mx1 - 26} ${my0 + 24}L${mx1 - 20.5} ${my0 + 38}L${mx1 - 26} ${my0 + 34.5}L${mx1 - 31.5} ${my0 + 38}Z" fill="${K.text}"/>`);
  out.push(text(mx1 - 26, my0 + 20, 'N', { size: 12, weight: 700, anchor: 'middle' }));
  out.push(`<path d="M${mx0 + 14} ${my1 - 20}V${my1 - 14}H${r1(mx0 + 14 + 20 * S)}V${my1 - 20}" fill="none" stroke="${K.text}" stroke-width="1.5"/>`);
  out.push(text(mx0 + 20 + 20 * S, my1 - 13, '20 km', { size: 12 }));

  // --- the recipe ------------------------------------------------------------------
  const ix = 492;
  let iy = 62;
  const say = (s, o = {}) => { out.push(text(ix, iy, s, { size: 12.5, ...o })); iy += o.gap ?? 18; };
  say('1. Direction (P-wave motion)', { weight: 700 });
  say(esc(`${Math.round(est.bazDeg)}° (true: ${Math.round(m.bazDeg)}°)`), { gap: 28 });
  say(esc(`2. Distance (S ${MINUS} P)`), { weight: 700 });
  say(esc(`S ${MINUS} P = ${m.S.toFixed(2)} ${MINUS} ${m.P.toFixed(2)} = ${sp.toFixed(2)} s`));
  say(esc(`${sp.toFixed(2)} s × ${kmPerSecond(vp, vs).toFixed(2)} km/s = ${hypo.toFixed(1)} km`));
  say(esc(`(true: ${m.km.toFixed(0)} km)`), { gap: 28 });
  say('3. Go that far that way from TMU', { weight: 700 });
  say(esc(`Miss: ${miss.toFixed(0)} km from the true epicentre.`), { gap: 28 });
  say('P: analyst pick. S: computer pick', { fill: C.muted, size: 11.5 });
  say('(the analysts did not pick S at TMU).', { fill: C.muted, size: 11.5 });
  save('gm-one-station.svg', out);
}

// ===========================================================================
// gm-far-quake.svg and gm-rayleigh-roll.svg: a distant quake at SGU (Sand Point)
// ===========================================================================

if (want('far') || want('rayleigh')) {
  const { aicPick } = await import('../../docs/app/js/lib/picker.js');
  const { distanceDeg, bodyWaveTimes } = await import('../../docs/app/js/lib/teleseism.js');
  const table = JSON.parse(fs.readFileSync(new URL('../../docs/app/data/traveltimes-iasp91.json', import.meta.url), 'utf8'));
  const s = loadSample('qe-sand-point');
  const st = s.stations.find((x) => x.sta === 'SGU');
  const deg = distanceDeg(s.event.lat, s.event.lon, st.lat, st.lon);
  const pred = bodyWaveTimes(table, deg, s.event.depthKm);
  // Picks as in tools/quake-explorer/answer-key.mjs (20 samples/s): P on Z, S on N.
  const at20 = (c) => {
    const raw = s.traces.find((t) => t.sta === 'SGU' && t.cha.endsWith(c));
    const d = decimate(raw.data, raw.sampleRate, 5);
    return { ...raw, data: d.data, sampleRate: d.sampleRate };
  };
  const z20 = at20('Z');
  const n20 = at20('N');
  const start20 = (z20.startMs - s.event.timeMs) / 1000;
  const pPick = aicPick(filteredData(z20, { lo: 0.5, hi: 2 }), 20, start20, pred.P - 60, pred.P + 30);
  const sPick = aicPick(filteredData(n20, { lo: 0.05, hi: 0.5 }), 20, (n20.startMs - s.event.timeMs) / 1000, pred.S - 60, pred.S + 30);
  const mmss = (sec) => `${Math.floor(sec / 60)}:${String(Math.round(sec % 60)).padStart(2, '0')}`;
  console.log(`far: SGU ${deg.toFixed(1)}° (${(deg * 111.19).toFixed(0)} km); P ${mmss(pPick.tSec)} (iasp91 ${mmss(pred.P)}), S ${mmss(sPick.tSec)} (iasp91 ${mmss(pred.S)})`);
  // How steeply P and S come up (for the page text): slowness from the iasp91 table,
  // sin(angle from vertical) = slowness × speed at the surface (iasp91: 5.8 and 3.36 km/s).
  const before = bodyWaveTimes(table, deg - 1, s.event.depthKm);
  const after = bodyWaveTimes(table, deg + 1, s.event.depthKm);
  const steep = (ph, v) => Math.asin(((after[ph] - before[ph]) / 2 / 111.19) * v) / RAD;
  console.log(`far: iasp91 angle from vertical at the surface: P ${steep('P', 5.8).toFixed(1)}°, S ${steep('S', 3.36).toFixed(1)}°`);

  if (want('far')) {
    const m = station('qe-sand-point', 'SGU', { lo: 0.05, hi: 0.5, decim: [5, 5] });
    const { r, t } = toRadialTransverse(m.n, m.e, m.bazDeg);
    const from = 6 * 60;
    const to = 25 * 60;
    const amp = Math.max(...[m.z, r, t].map((d) => peakAbs(d, m.i(from), m.i(to))));
    const win = (d, s0, s1) => rms(d, m.i(s0), m.i(s1));
    const show = (name, s0, s1) => console.log(`far: ${name} ${mmss(s0)}–${mmss(s1)} rms Z ${win(m.z, s0, s1).toFixed(0)}, R ${win(r, s0, s1).toFixed(0)}, T ${win(t, s0, s1).toFixed(0)}`);
    show('P', pPick.tSec, pPick.tSec + 60);
    show('S', sPick.tSec, sPick.tSec + 60);
    // where the T (Love) and Z (Rayleigh) shaking peaks
    const peakAt = (d, s0, s1) => { let k = m.i(s0); for (let i = m.i(s0); i < m.i(s1); i++) if (Math.abs(d[i]) > Math.abs(d[k])) k = i; return m.t(k); };
    const tLove = peakAt(t, 14 * 60, 22 * 60);
    const tRay = peakAt(m.z, 14 * 60, 22 * 60);
    console.log(`far: biggest T (Love) at ${mmss(tLove)}, biggest Z (Rayleigh) at ${mmss(tRay)}`);

    const W = 760;
    const H = 346;
    const out = card(W, H, 'A quake 4,000 km away: station SGU, Sand Point, Alaska, magnitude 7.3',
      'Up, radial and transverse records at SGU for 19 minutes on one scale: P, then S on the horizontal channels, then Love waves on T and Rayleigh waves on Z and R.');
    const top = 94;
    const rowH = 66;
    const tb = traceBox({ sta: m, rows: [
      { data: m.z, label: 'Z  up', amp },
      { data: r, label: 'R  along the path (+ away from the quake)', amp },
      { data: t, label: 'T  sideways', amp },
    ], x0: 12, x1: 748, top, rowH, fromSec: from, toSec: to, unit: 60, tickStep: 2, axisLabel: 'minutes after the quake' });
    out.push(...tb.out);
    const mark = (sec, label, colour, y = top - 8) => {
      out.push(line(tb.x(sec), top - 4, tb.x(sec), top + 3 * rowH, colour, 1.6, 'stroke-dasharray="5 3"'));
      out.push(text(tb.x(sec) + 4, y, esc(label), { size: 13, weight: 700, fill: colour, halo: true }));
    };
    mark(pPick.tSec, 'P', C.p);
    mark(sPick.tSec, 'S', C.s);
    out.push(text(tb.x(tLove) - 8, top + 2 * rowH + 15, 'Love waves', { size: 12, weight: 700, anchor: 'end', halo: true }));
    out.push(text(tb.x(tRay) + 8, top - 8, 'Rayleigh waves', { size: 12, weight: 700, halo: true }));
    out.push(text(12, 44, 'One scale for all three records. Filtered 0.05–0.5 Hz (waves 2 to 20 seconds long).', { size: 12, fill: C.muted }));
    out.push(text(12, 60, esc('P shakes mostly Z; S shakes mostly R and T; Love waves shake T; Rayleigh waves roll Z and R.'), { size: 12, weight: 600 }));
    save('gm-far-quake.svg', out);
  }

  if (want('rayleigh')) {
    const m = station('qe-sand-point', 'SGU', { lo: 0.03, hi: 0.1, decim: [5, 5] });
    const { r, t } = toRadialTransverse(m.n, m.e, m.bazDeg);
    // Ground displacement: add up the velocity over time, then remove any slow drift.
    const detrended = (d) => {
      const n = d.length;
      let si = 0; let sy = 0; let sii = 0; let siy = 0;
      for (let i = 0; i < n; i++) { si += i; sy += d[i]; sii += i * i; siy += i * d[i]; }
      const bb = (n * siy - si * sy) / (n * sii - si * si);
      const aa = (sy - bb * si) / n;
      return d.map((v, i) => v - aa - bb * i);
    };
    const integrate = (v, i0, i1) => {
      const d = new Float64Array(i1 - i0);
      for (let i = i0 + 1; i < i1; i++) d[i - i0] = d[i - i0 - 1] + (v[i - 1] + v[i]) / (2 * m.sr);
      return detrended(d);
    };
    let kPeak = m.i(17 * 60);
    for (let i = m.i(17 * 60); i < m.i(22 * 60); i++) if (Math.abs(m.z[i]) > Math.abs(m.z[kPeak])) kPeak = i;
    const tPeak = m.t(kPeak);
    const w0 = tPeak - 45;
    const w1 = tPeak + 45;
    const i0 = m.i(w0);
    const i1 = m.i(w1);
    const dr = integrate(r, i0, i1);
    const dz = integrate(m.z, i0, i1);
    // rotation sense in (R away = x, up = y): signed area > 0 means counterclockwise = retrograde
    let area = 0;
    for (let i = 1; i < dr.length; i++) area += 0.5 * (dr[i - 1] * dz[i] - dz[i - 1] * dr[i]);
    // lag of Z behind R (cross-correlation, within ±12 s)
    const maxLag = Math.round(12 * m.sr);
    let best = -Infinity;
    let lag = 0;
    for (let L = -maxLag; L <= maxLag; L++) {
      let sxy = 0;
      for (let i = maxLag; i < dr.length - maxLag; i++) sxy += dr[i] * dz[i + L];
      if (sxy > best) { best = sxy; lag = L; }
    }
    // the period: mean spacing of upward zero crossings of Z in the window
    const ups = [];
    for (let i = 1; i < dz.length; i++) if (dz[i - 1] < 0 && dz[i] >= 0) ups.push(i);
    const period = (ups.at(-1) - ups[0]) / (ups.length - 1) / m.sr;
    const retro = area > 0;
    console.log(`rayleigh: biggest Z at ${mmss(tPeak)}; period ${period.toFixed(1)} s; Z lags R by ${(lag / m.sr).toFixed(2)} s; ` +
      `rotation ${retro ? 'counterclockwise with R away to the right: RETROGRADE' : 'clockwise with R away to the right: PROGRADE'}; ` +
      `rms T/Z ${(rms(t, i0, i1) / rms(m.z, i0, i1)).toFixed(2)}, R/Z ${(rms(r, i0, i1) / rms(m.z, i0, i1)).toFixed(2)}`);
    if (!retro) throw new Error('The data show prograde motion, but the figure says retrograde. Check before publishing.');

    const W = 760;
    const H = 384;
    const out = card(W, H, 'Rayleigh waves roll the ground backwards: station SGU, Sand Point quake',
      'Left: how far the ground moved along the path and up during 90 seconds of Rayleigh waves. Right: the same motion seen from the side, going round in loops.');
    // --- left: displacement R and Z ---------------------------------------------
    const amp = Math.max(...[dr, dz].map((d) => d.reduce((mx, v) => Math.max(mx, Math.abs(v)), 0)));
    const win = { i: (sec) => Math.round((sec - w0) * m.sr), t: (i) => w0 + i / m.sr };
    const top = 60;
    const rowH = 96;
    const tb = traceBox({ sta: win, rows: [
      { data: dr, label: 'R  along the path (+ away)', amp },
      { data: dz, label: 'Z  up', amp },
    ], x0: 12, x1: 430, top, rowH, fromSec: w0, toSec: w1, tickStep: 0.5, unit: 60,
    axisLabel: 'minutes after the quake' });
    out.push(...tb.out);
    // one R peak, and the Z peak a quarter of a wave later
    let kr = win.i(tPeak - period);
    for (let i = win.i(tPeak - period); i < win.i(tPeak); i++) if (dr[i] > dr[kr]) kr = i;
    let kz = kr;
    for (let i = kr; i < kr + Math.round(period * m.sr * 0.5); i++) if (dz[i] > dz[kz]) kz = i;
    const sc = (rowH / 2 - 3) / amp;
    out.push(line(tb.x(win.t(kr)), top, tb.x(win.t(kr)), top + 2 * rowH, K.push, 1.5, 'stroke-dasharray="4 3"'));
    out.push(line(tb.x(win.t(kz)), top, tb.x(win.t(kz)), top + 2 * rowH, K.true, 1.5, 'stroke-dasharray="4 3"'));
    out.push(dot(tb.x(win.t(kr)), top + rowH / 2 - dr[kr] * sc, 4, K.push));
    out.push(dot(tb.x(win.t(kz)), top + rowH + rowH / 2 - dz[kz] * sc, 4, K.true));
    out.push(dot(18, top + 2 * rowH + 52, 4, K.push), text(27, top + 2 * rowH + 56, 'farthest from the quake (R biggest)', { size: 12, weight: 700, fill: K.push }));
    out.push(dot(248, top + 2 * rowH + 52, 4, K.true), text(257, top + 2 * rowH + 56, 'highest (Z biggest)', { size: 12, weight: 700, fill: K.true }));
    out.push(text(12, H - 30, 'The ground is farthest from the quake, then, a quarter of a wave', { size: 12 }));
    out.push(text(12, H - 14, esc(`later (${(win.t(kz) - win.t(kr)).toFixed(1)} s; one wave takes about ${Math.round(period)} s), at its highest.`), { size: 12 }));
    out.push(text(12, 46, 'How far the ground moved (filtered 0.03–0.1 Hz)', { size: 13, weight: 600 }));

    // --- right: seen from the side ------------------------------------------------
    const cx = 598;
    const cy = 184;
    const R = 104;
    out.push(text(cx, 46, 'Seen from the side', { size: 13, weight: 600, anchor: 'middle' }));
    out.push(...frame(cx, cy, R, { top: 'up' }));
    out.push(text(cx - R - 4, cy + R + 16, '← away', { size: 12, weight: 600 }));
    out.push(text(cx + R + 4, cy + R + 16, 'toward the quake →', { size: 12, weight: 600, anchor: 'end' }));
    const tow = dr.map((v) => -v); // toward the quake is to the right, as in the app
    // two waves around the peak
    const j0 = Math.max(0, win.i(tPeak - 0.75 * period));
    const j1 = Math.min(dr.length, win.i(tPeak + 1.0 * period));
    let mm = 0;
    for (let i = j0; i < j1; i++) mm = Math.max(mm, Math.abs(tow[i]), Math.abs(dz[i]));
    const k = (R * 0.9) / mm;
    out.push(...path(tow, dz, j0, j1, cx, cy, k));
    // arrowheads along the loops show which way the ground goes round
    for (let f = 0.12; f < 0.95; f += 0.22) {
      const i = j0 + Math.round((j1 - j0) * f);
      const xa = cx + tow[i] * k;
      const ya = cy - dz[i] * k;
      const xb = cx + tow[i + 2] * k;
      const yb = cy - dz[i + 2] * k;
      out.push(head(xb, yb, Math.atan2(yb - ya, xb - xa), C.trace, 11, 5.5));
    }
    out.push(text(cx, cy + R + 38, '← the wave travels this way', { size: 12, weight: 700, fill: C.p, anchor: 'middle' }));
    out.push(text(cx, H - 30, 'At the top of each loop the ground moves', { size: 12, anchor: 'middle' }));
    out.push(text(cx, H - 14, 'toward the quake: backwards (retrograde).', { size: 12, anchor: 'middle', weight: 600 }));
    save('gm-rayleigh-roll.svg', out);
  }
}
