// Small graphics for the site's index pages (session D15-web-design): a picture of each app
// for the All apps cards (and square versions for the home page), and a quiet graphic for
// the top of the home page.
//
//   node tools/figures/site-graphics.mjs
//
// Like every figure here (D16), they are drawn with the apps' own code: the miniSEED parser
// and filter, lib/locate.js, lib/linefit.js, lib/helicorder.js, lib/wave-sim.js,
// lib/wiggle.js, lib/wave-motion.js and lib/bench.js. Real records are University of Utah
// stations (network UU) stored with the site: the Junction M3.3 offline samples
// (docs/app/data/samples/) and the HEB test day (docs/app/data/uhsn-demo/). Nothing comes
// from Raspberry Shake. The pages that show a real-data graphic credit it in a caption.
//
// Output: docs/img/graphics/*.svg, one line each, with no colors of their own beyond fallbacks:
// every mark carries a short class (pa, tr, p, s, ...) that docs/stylesheets/extra.css colors
// from the apps' palette, for the light and the dark theme. The pages include them inline with
// pymdownx.snippets, so they follow the docs' light/dark switch. All are aria-hidden: the app
// pictures repeat the card's title, and the home graphic has a caption on the page. Deterministic: same bytes every run.
import fs from 'node:fs';

globalThis.HTMLElement ??= class {};
globalThis.customElements ??= { define() {}, get() {} };

const root = new URL('../../', import.meta.url);
const { parseMiniseed } = await import(new URL('docs/app/js/data/mseed.js', root));
const { filteredData, filteredLong } = await import(new URL('docs/app/js/data/filters.js', root));
const { FILTERS, WAVE_RACE, SCHOOLS } = await import(new URL('docs/app/js/config.js', root));
const { picksByStation } = await import(new URL('docs/app/js/lib/fdsn.js', root));
const { minMaxColumns, peakAbs } = await import(new URL('docs/app/js/lib/signal.js', root));
const { distanceKm, localProjection } = await import(new URL('docs/app/js/lib/geo.js', root));
const { spToDistanceKm, hypoToEpiKm } = await import(new URL('docs/app/js/lib/locate.js', root));
const { fitLine } = await import(new URL('docs/app/js/lib/linefit.js', root));
const { helicorderRows, rowColumns, penOffset } = await import(new URL('docs/app/js/lib/helicorder.js', root));
const { arrivals } = await import(new URL('docs/app/js/lib/wave-sim.js', root));
const { sampleWiggle } = await import(new URL('docs/app/js/lib/wiggle.js', root));
const { displacement, VP, VS } = await import(new URL('docs/app/js/lib/wave-motion.js', root));
const { makeTake } = await import(new URL('docs/app/js/lib/bench.js', root));
const { windowIndices, motionScale } = await import(new URL('docs/app/js/lib/hodogram.js', root));

const outDir = new URL('docs/img/graphics/', root);
fs.mkdirSync(outDir, { recursive: true });

// ---------------------------------------------------------------------------------------
// Drawing helpers. Fallback colors (the apps' light theme) are presentation attributes, so a
// file opened on its own still looks right; the classes override them on the site.
const F = { pa: '#f6f7f9', tr: '#1f2937', al: '#1d4ed8', gr: '#d9dde3', p: '#1d4ed8', s: '#c0262d',
  la: '#f3efe4', ed: '#b9b2a0', sc: '#fbbf24', tx: '#374151', mu: '#8a929d', gu: '#15803d' };
const r1 = (v) => Math.round(v * 10) / 10;
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => `&#${c.charCodeAt(0)};`);
const pts = (list) => list.map(([x, y]) => `${r1(x)} ${r1(y)}`).join(' ');

/** Stroked path; cls is a stroke class (tr, al, p, s, gr, mu, ed). */
const stroke = (d, cls, w = 1, extra = '') =>
  `<path class="${cls}" d="${d}" fill="none" stroke="${F[cls]}" stroke-width="${w}"${extra ? ' ' + extra : ''}/>`;
const line = (list, cls, w = 1, extra = '') => stroke(`M${pts(list)}`, cls, w, extra);
const circle = (x, y, r, cls, w = 1, extra = '') =>
  `<circle class="${cls}" cx="${r1(x)}" cy="${r1(y)}" r="${r1(r)}" fill="none" stroke="${F[cls]}" stroke-width="${w}"${extra ? ' ' + extra : ''}/>`;
/** Filled shape; cls is a fill class (pa, la, tf, pf, sf, sc, mf). */
const FILL = { pa: F.pa, la: F.la, tf: F.tr, pf: F.p, sf: F.s, sc: F.sc, mf: F.mu, gf: F.gu };
const rect = (x, y, w, h, cls, rx = 0) =>
  `<rect class="${cls}" x="${r1(x)}" y="${r1(y)}" width="${r1(w)}" height="${r1(h)}"${rx ? ` rx="${rx}"` : ''} fill="${FILL[cls]}"/>`;
const dot = (x, y, r, cls) => `<circle class="${cls}" cx="${r1(x)}" cy="${r1(y)}" r="${r1(r)}" fill="${FILL[cls]}"/>`;
/** Station triangle centered on (x, y), as on the apps' maps; edged in the panel color. */
function triangle(x, y, size, cls = 'tf', edge = 'pa') {
  const h = size * 1.6;
  return `<polygon class="${cls} e-${edge}" points="${pts([[x, y - h * 0.62], [x - size, y + h * 0.38], [x + size, y + h * 0.38]])}" fill="${FILL[cls]}" stroke="${FILL[edge]}" stroke-width="1" stroke-linejoin="round"/>`;
}
/** Five-pointed star (the quake), edged in the panel color. */
function star(x, y, r, cls = 'tf', edge = 'pa') {
  const p = [];
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const rr = i % 2 ? r * 0.45 : r;
    p.push([x + rr * Math.cos(a), y + rr * Math.sin(a)]);
  }
  return `<polygon class="${cls} e-${edge}" points="${pts(p)}" fill="${FILL[cls]}" stroke="${FILL[edge]}" stroke-width="1" stroke-linejoin="round"/>`;
}
/** A trace as one vertical stroke per column (min to max), as the apps draw them. */
function columns(min, max, x0, dx, yc, scale, cls, w = 1) {
  // relative moves keep the path short: m to the top of each column, v down to its bottom
  let d = '';
  let px = null;
  let py = 0;
  const n = (v) => { const s = String(r1(v)); return s.startsWith('-') ? s : ' ' + s; };
  for (let c = 0; c < min.length; c++) {
    if (Number.isNaN(min[c])) continue;
    const x = r1(x0 + (c + 0.5) * dx);
    const y1 = r1(yc - max[c] * scale);
    const y2 = r1(Math.max(yc - min[c] * scale, y1 + 0.6));
    d += px === null ? `M${r1(x)} ${y1}` : `m${n(x - px).trim()}${n(y1 - py)}`;
    d += `v${r1(y2 - y1)}`;
    px = x;
    py = y2;
  }
  return stroke(d, cls, w);
}

/** One graphic: a single-line <svg> in the uhsn-g style. label: accessible name (else hidden). */
function svg(w, h, body, { kind = 'thumb', label = null, clip = true } = {}) {
  const a11y = label ? `role="img" aria-label="${esc(label)}"` : 'aria-hidden="true" focusable="false"';
  const id = `c${kind}${w}x${h}${Math.abs(hash(body)) % 1e6}`;
  const clipDef = clip ? `<defs><clipPath id="${id}"><rect width="${w}" height="${h}" rx="6"/></clipPath></defs>` : '';
  const content = clip ? `<g clip-path="url(#${id})">${body}</g>` : body;
  return `<svg class="uhsn-g uhsn-${kind}" viewBox="0 0 ${w} ${h}" xmlns="http://www.w3.org/2000/svg" ${a11y}>${clipDef}${content}</svg>`;
}
function hash(s) { let h = 0; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0; return h; }

const written = [];
function write(name, markup) {
  if (markup.includes('\n')) throw new Error(`${name}: graphics must be one line (they are included in a paragraph)`);
  // No newline at the end: pymdownx.snippets ends the paragraph after an included file that
  // ends with one, which would push a small picture out of the text it sits beside.
  fs.writeFileSync(new URL(name, outDir), markup);
  written.push(`docs/img/graphics/${name} (${(markup.length / 1024).toFixed(1)} KB)`);
}

// ---------------------------------------------------------------------------------------
// Data: the Junction M3.3 (uu80162166), October 2026, as stored with the site.
function readSample(dirName, { fromSec, toSec }) {
  const dir = new URL(`docs/app/data/samples/${dirName}/`, root);
  const event = JSON.parse(fs.readFileSync(new URL('event.json', dir)));
  const picks = picksByStation(JSON.parse(fs.readFileSync(new URL('picks.json', dir))));
  const stations = JSON.parse(fs.readFileSync(new URL('stations.json', dir)));
  const buf = fs.readFileSync(new URL('waveforms.mseed', dir));
  const records = parseMiniseed(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.length),
    { fromMs: event.timeMs + fromSec * 1000, toMs: event.timeMs + toSec * 1000 });
  return { event, picks, stations, records };
}
const BP = FILTERS.find((f) => f.id === 'bp1-10');
const sec = (ms, event) => (ms - event.timeMs) / 1000;

// ---------------------------------------------------------------------------------------
// Quake Locator: the three S − P circles of the offline sample cross at the quake.
function quakeLocator(w, h) {
  const s = readSample('uu80162166', { fromSec: -WAVE_RACE.preOriginSec, toSec: WAVE_RACE.postOriginSec });
  const proj = localProjection(s.event.lat, s.event.lon);
  const use = ['TCRU', 'MTPU', 'WCU'];
  // the app's station colors (wave-race/app.js PALETTE), the same in both themes
  const colors = ['#e6194b', '#3cb44b', '#4363d8'];
  const obs = use.map((sta) => {
    const st = s.stations.find((x) => x.sta === sta);
    const pk = s.picks[`UU.${sta}`];
    const epiKm = hypoToEpiKm(spToDistanceKm((pk.S - pk.P) / 1000, WAVE_RACE.vp, WAVE_RACE.vs), WAVE_RACE.depthKm);
    return { sta, ...proj.toXY(st.lat, st.lon), epiKm };
  });
  // Frame: the quake a little left of center; the scale fits the two near stations in.
  const kmPerPx = Math.max(95 / h, 1.0);
  const cx = w * 0.5;
  const cy = h * 0.5 + 2;
  const X = (x) => cx + x / kmPerPx;
  const Y = (y) => cy - y / kmPerPx;
  const b = [rect(0, 0, w, h, 'la')];
  // faint graticule every 0.25 degrees
  for (let lat = 37.5; lat <= 39.5; lat += 0.25) {
    const y = Y(proj.toXY(lat, s.event.lon).y);
    if (y > 0 && y < h) b.push(line([[0, y], [w, y]], 'ed', 0.5, 'stroke-opacity="0.5"'));
  }
  for (let lon = -113.5; lon <= -111; lon += 0.25) {
    const x = X(proj.toXY(s.event.lat, lon).x);
    if (x > 0 && x < w) b.push(line([[x, 0], [x, h]], 'ed', 0.5, 'stroke-opacity="0.5"'));
  }
  obs.forEach((o, i) => b.push(`<circle cx="${r1(X(o.x))}" cy="${r1(Y(o.y))}" r="${r1(o.epiKm / kmPerPx)}" fill="none" stroke="${colors[i]}" stroke-width="1.6"/>`));
  obs.forEach((o) => b.push(triangle(X(o.x), Y(o.y), Math.max(4, h / 22), 'tf', 'la')));
  b.push(star(X(0), Y(0), Math.max(6, h / 11), 'tf', 'la'));
  return b.join('');
}

// ---------------------------------------------------------------------------------------
// Quake Explorer: a record section of the same quake, with the P and S rulers.
function quakeExplorer(w, h, { traces: nWanted = 8, maxKm = 200, toSec = 56 } = {}) {
  const s = readSample('qe-junction', { fromSec: -2, toSec });
  const byKm = [];
  for (const t of s.records) {
    if (t.cha.at(-1) !== 'Z') continue;
    const st = s.stations.find((x) => x.sta === t.sta && x.net === t.net);
    if (!st) continue;
    const km = distanceKm(s.event.lat, s.event.lon, st.lat, st.lon);
    if (km > maxKm || byKm.some((x) => x.sta === t.sta)) continue;
    byKm.push({ sta: t.sta, km, t });
  }
  byKm.sort((a, b) => a.km - b.km);
  // evenly spread in distance
  const chosen = [];
  for (let i = 0; i < nWanted; i++) {
    const want = byKm[0].km + (i * (byKm.at(-1).km - byKm[0].km)) / (nWanted - 1);
    const best = byKm.filter((x) => !chosen.includes(x)).reduce((a, b) => (Math.abs(b.km - want) < Math.abs(a.km - want) ? b : a));
    chosen.push(best);
  }
  chosen.sort((a, b) => a.km - b.km);
  const pad = 6;
  const T = (t) => pad + ((t - 0) / toSec) * (w - 2 * pad);
  const k0 = chosen[0].km;
  const k1 = chosen.at(-1).km;
  const spacing = (h - 2 * pad - 6) / (nWanted - 1);
  const D = (km) => pad + 3 + ((km - k0) / (k1 - k0)) * (h - 2 * pad - 6);
  const b = [rect(0, 0, w, h, 'pa')];
  const half = spacing * 0.9;
  for (const c of chosen) {
    const data = filteredData(c.t, BP);
    const i0 = Math.max(0, Math.round(((s.event.timeMs - c.t.startMs) / 1000) * c.t.sampleRate));
    const i1 = Math.min(data.length, i0 + Math.round(toSec * c.t.sampleRate));
    const nCols = Math.round((w - 2 * pad) / 1.4);
    const { min, max } = minMaxColumns(data, i0, i1, nCols);
    // each trace stretched to fit (as in the app), its biggest wiggles clipped at 1.3 lines
    const peak = (peakAbs(data, i0, i1) || 1) * 0.55;
    const clip = (v) => Math.max(-1.3, Math.min(1.3, v / peak));
    b.push(columns(min.map(clip), max.map(clip), pad, (w - 2 * pad) / nCols, D(c.km), half / 1.3, 'tr', 0.8));
  }
  // Rulers: straight lines fitted (lib/linefit.js) to the analysts' P and S picks within maxKm.
  for (const phase of ['P', 'S']) {
    const xs = [];
    const ys = [];
    for (const [key, pk] of Object.entries(s.picks)) {
      if (pk[phase] == null) continue;
      const st = s.stations.find((x) => `${x.net}.${x.sta}` === key);
      if (!st) continue;
      const km = distanceKm(s.event.lat, s.event.lon, st.lat, st.lon);
      if (km > maxKm) continue;
      xs.push(km);
      ys.push(sec(pk[phase], s.event));
    }
    const fit = fitLine(xs, ys);
    b.push(line([[T(fit.intercept + fit.slope * k0), D(k0) - 4], [T(fit.intercept + fit.slope * k1), D(k1) + 4]],
      phase === 'P' ? 'p' : 's', 1.5, 'stroke-linecap="round"'));
  }
  return b.join('');
}

// ---------------------------------------------------------------------------------------
// Quake Waves: the P and S fronts spreading from the quake to the four stations, as on the
// app's map (its 200 × 120 km world, stations A–D, the quake where it starts).
const QW = { world: { w: 200, h: 120 }, quake: { x: 85, y: 62 },
  stations: [{ x: 70, y: 45, c: '#7c3aed' }, { x: 175, y: 35, c: '#0d9488' }, { x: 120, y: 100, c: '#b45309' }, { x: 30, y: 100, c: '#15803d' }] };
function quakeWaves(w, h, { tSec = 12.5 } = {}) {
  const k = Math.min(w / QW.world.w, h / (QW.world.h * 0.78));
  const X = (x) => w / 2 + (x - QW.world.w / 2) * k;
  const Y = (y) => h / 2 + (y - 66) * k;
  const b = [rect(0, 0, w, h, 'la')];
  const qx = X(QW.quake.x);
  const qy = Y(QW.quake.y);
  // the fronts a few seconds earlier, faint, so the waves read as spreading
  for (const [dt, op] of [[-6, 0.25], [-3, 0.5], [0, 1]]) {
    const t = tSec + dt;
    b.push(circle(qx, qy, VP * t * k, 'p', 1.6, op < 1 ? `stroke-opacity="${op}"` : ''));
    b.push(circle(qx, qy, VS * t * k, 's', 1.6, op < 1 ? `stroke-opacity="${op}"` : ''));
  }
  for (const st of QW.stations) {
    const reached = arrivals(Math.hypot(st.x - QW.quake.x, st.y - QW.quake.y), VP, VS).p <= tSec;
    const size = Math.max(4, h / 22);
    const hh = size * 1.6;
    const x = X(st.x);
    const y = Y(st.y);
    b.push(`<polygon class="e-la" points="${pts([[x, y - hh * 0.62], [x - size, y + hh * 0.38], [x + size, y + hh * 0.38]])}" fill="${st.c}" stroke="${F.la}" stroke-width="1" stroke-linejoin="round"${reached ? '' : ' fill-opacity="0.85"'}/>`);
  }
  b.push(star(qx, qy, Math.max(6, h / 11), 'tf', 'la'));
  return b.join('');
}

// ---------------------------------------------------------------------------------------
// Build a Wiggle: the app's first example (2 Hz and 8 Hz) and their sum, with the spectrum's
// two bars at the right.
function buildAWiggle(w, h, { spectrum = true } = {}) {
  const waves = [{ freq: 2, size: 0.8 }, { freq: 8, size: 0.3 }];
  const rate = 128;
  const seconds = 1.6;
  const n = Math.round(seconds * rate);
  const pad = 6;
  const specW = spectrum ? Math.round(w * 0.24) : 0;
  const plotW = w - 2 * pad - specW - (spectrum ? 8 : 0);
  const X = (i) => pad + (i / (n - 1)) * plotW;
  const b = [rect(0, 0, w, h, 'pa')];
  const lane = (h - 2 * pad) / 3.2;
  const comp = (wv, yc, cls, width, amp) => {
    const v = sampleWiggle([wv], n, rate);
    return line([...v].map((y, i) => [X(i), yc - y * amp]), cls, width, 'stroke-linejoin="round"');
  };
  // two thin waves above, their sum (bold) below
  b.push(comp(waves[0], pad + lane * 0.55, 'p', 1, lane * 0.55));
  b.push(comp(waves[1], pad + lane * 1.35, 's', 1, lane * 0.55 * 0.8 / 0.8));
  const sum = sampleWiggle(waves, n, rate);
  const amp = lane * 1.0 / 1.1;
  b.push(line([[pad, pad + lane * 1.9], [pad + plotW, pad + lane * 1.9]], 'gr', 0.6));
  b.push(line([...sum].map((y, i) => [X(i), pad + lane * 2.45 - y * amp * 0.85]), 'tr', 1.6, 'stroke-linejoin="round"'));
  if (spectrum) {
    const x0 = w - pad - specW;
    const base = h - pad - 2;
    b.push(line([[x0, base], [w - pad, base]], 'gr', 1));
    const fx = (f) => x0 + 4 + (f / 12) * (specW - 8);
    b.push(rect(fx(2) - 3, base - waves[0].size * (h - 2 * pad - 6), 6, waves[0].size * (h - 2 * pad - 6), 'pf', 1));
    b.push(rect(fx(8) - 3, base - waves[1].size * (h - 2 * pad - 6), 6, waves[1].size * (h - 2 * pad - 6), 'sf', 1));
  }
  return b.join('');
}

// ---------------------------------------------------------------------------------------
// School Shake Viewer: the helicorder of the test day at HEB (UU), November 17, 2026: one line
// per hour, alternating colors, as the viewer draws it.
let hebCache = null;
function hebDay() {
  if (hebCache) return hebCache;
  const f = new URL('docs/app/data/uhsn-demo/v1/sds/2026/UU/HEB/EHZ.D/UU.HEB.01.EHZ.D.2026.321', root);
  const buf = fs.readFileSync(f);
  const recs = parseMiniseed(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.length));
  // one long trace (records are contiguous apart from gaps, which the viewer bridges)
  recs.sort((a, b) => a.startMs - b.startMs);
  const t0 = recs[0].startMs;
  const rate = recs[0].sampleRate;
  const end = Math.max(...recs.map((r) => r.startMs + (r.data.length / rate) * 1000));
  const data = new Float64Array(Math.round(((end - t0) / 1000) * rate)).fill(NaN);
  for (const r of recs) data.set(r.data, Math.round(((r.startMs - t0) / 1000) * rate));
  const trace = { net: 'UU', sta: 'HEB', cha: 'EHZ', startMs: t0, sampleRate: rate, data };
  hebCache = { trace, filtered: filteredLong(trace, BP) };
  return hebCache;
}
function shakeViewer(w, h, { rows: nRows = 10, firstHourUtc = 14 } = {}) {
  const { trace, filtered } = hebDay();
  const day0 = Date.UTC(2026, 10, 17);
  const startMs = day0 + firstHourUtc * 3600e3;
  const rows = helicorderRows(startMs, startMs + nRows * 3600e3, 3600);
  const pad = 6;
  const rowH = (h - 2 * pad) / nRows;
  const nCols = Math.round((w - 2 * pad) / 1.4);
  // scale: the median row's spread fills about a third of a line, as the viewer's default does
  const spans = rows.map((row) => {
    const { min, max } = rowColumns(filtered, trace.sampleRate, trace.startMs, row, nCols);
    const d = [...max].map((v, i) => v - min[i]).filter(Number.isFinite).sort((a, b) => a - b);
    return d[Math.floor(d.length / 2)];
  }).sort((a, b) => a - b);
  const countsPerRow = spans[Math.floor(spans.length / 2)] * 3;
  const b = [rect(0, 0, w, h, 'pa')];
  rows.forEach((row, i) => {
    const { min, max } = rowColumns(filtered, trace.sampleRate, trace.startMs, row, nCols);
    const pmin = Float64Array.from(min, (v) => (Number.isNaN(v) ? NaN : penOffset(v, countsPerRow)));
    const pmax = Float64Array.from(max, (v) => (Number.isNaN(v) ? NaN : penOffset(v, countsPerRow)));
    b.push(columns(pmin, pmax, pad, (w - 2 * pad) / nCols, pad + (i + 0.5) * rowH, rowH, i % 2 ? 'al' : 'tr', 0.7));
  });
  return b.join('');
}

// ---------------------------------------------------------------------------------------
// Phone Bench: a made-up take (lib/bench.js, an Android phone): readings rounded to steps of
// 0.1 m/s², then five taps on the table.
function phoneBench(w, h) {
  const taps = [0, 1, 2, 3, 4].map((i) => ({ t: 3200 + i * 900, peak: 0.9 - i * 0.08 }));
  const take = makeTake({ phone: 'android', seconds: 8, taps, seed: 11 });
  const pad = 6;
  const t1 = 8000;
  const zs = take.map((r) => r.z);
  const mid = zs.slice(0, 50).reduce((a, b) => a + b, 0) / 50;
  const X = (t) => pad + (t / t1) * (w - 2 * pad);
  const span = 0.45;
  const Y = (z) => h / 2 - ((z - mid) / span) * (h / 2 - pad);
  const b = [rect(0, 0, w, h, 'pa')];
  for (let k = -6; k <= 6; k++) {
    const y = Y(Math.round(mid * 10) / 10 + k * 0.1);
    if (y > pad && y < h - pad) b.push(line([[pad, y], [w - pad, y]], 'gr', 0.5));
  }
  // steps: hold each reading until the next one (the rounding shows as stairs)
  const p = [];
  take.forEach((r, i) => {
    const y = Y(r.z);
    if (i) p.push([X(r.t), p.at(-1)[1]]);
    p.push([X(r.t), y]);
  });
  b.push(line(p, 'tr', 1, 'stroke-linejoin="round"'));
  return b.join('');
}

// ---------------------------------------------------------------------------------------
// How P and S waves move rock (the animation): a block of rock as a grid of dots, a P pulse
// squeezing it on the left and the slower S pulse shaking it on the right.
function waveMotion(w, h) {
  const lengthKm = 60;
  const tSec = 7.2;
  const cols = w < 100 ? 16 : 34;
  const rowsN = w < 100 ? 5 : 6;
  const pad = 8;
  const X = (km) => pad + (km / lengthKm) * (w - 2 * pad);
  const gap = (h - 2 * pad) / (rowsN - 1);
  const pxPerKm = (w - 2 * pad) / lengthKm;
  const b = [rect(0, 0, w, h, 'pa')];
  for (let i = 0; i <= cols; i++) {
    const km = (i / cols) * lengthKm;
    const dxP = displacement(km, tSec, VP) * 2.2;                    // along the path
    const dyS = displacement(km, tSec, VS) * 2.2;                    // across it
    const cls = Math.abs(dxP) > 0.05 ? 'pf' : Math.abs(dyS) > 0.05 ? 'sf' : 'tf';
    for (let j = 0; j < rowsN; j++) {
      b.push(dot(X(km) + dxP * pxPerKm, pad + j * gap - dyS * pxPerKm, w < 100 ? 1.8 : 1.5, cls));
    }
  }
  return b.join('');
}

// ---------------------------------------------------------------------------------------
// School Pulse (coming soon): a week of noise at HEB near Heber City (1–10 Hz, one level per
// 15 minutes; tools/figures/data/people-heb-2026-09.json, made by seismogram-figures.mjs).
function schoolPulse(w, h) {
  const j = JSON.parse(fs.readFileSync(new URL('data/people-heb-2026-09.json', import.meta.url)));
  const pts0 = j.noise;
  const t0 = pts0[0].t;
  const t1 = pts0.at(-1).t;
  const vs = pts0.map((p) => p.v).sort((a, b) => a - b);
  const lo = vs[Math.floor(vs.length * 0.02)];
  const hi = vs[Math.floor(vs.length * 0.98)];
  const pad = 6;
  const X = (t) => pad + ((t - t0) / (t1 - t0)) * (w - 2 * pad);
  const Y = (v) => h - pad - ((Math.min(hi, Math.max(lo, v)) - lo) / (hi - lo)) * (h - 2 * pad);
  const b = [rect(0, 0, w, h, 'pa')];
  const area = [[X(t0), h - pad], ...pts0.map((p) => [X(p.t), Y(p.v)]), [X(t1), h - pad]];
  b.push(`<path class="mf" d="M${pts(area)}Z" fill="${F.mu}" fill-opacity="0.35"/>`);
  b.push(line(pts0.map((p) => [X(p.t), Y(p.v)]), 'mu', 1));
  return b.join('');
}

// ---------------------------------------------------------------------------------------
// Home page, option 1: a strip of one real seismogram (the Junction M3.3 at WCU, the
// Millard stand-in, 77 km away): P (blue) then S (red).
function homeSeismogram(w, h, { sta = 'WCU' } = {}) {
  const s = readSample('uu80162166', { fromSec: -WAVE_RACE.preOriginSec, toSec: WAVE_RACE.postOriginSec });
  const t = s.records.find((r) => r.sta === sta && r.cha.endsWith('Z'));
  const data = filteredData(t, BP);
  const from = 4;
  const to = 62;
  const i0 = Math.round(((s.event.timeMs + from * 1000 - t.startMs) / 1000) * t.sampleRate);
  const i1 = Math.round(((s.event.timeMs + to * 1000 - t.startMs) / 1000) * t.sampleRate);
  const nCols = Math.round(w);
  const { min, max } = minMaxColumns(data, i0, i1, nCols);
  const peak = peakAbs(data, i0, i1);
  const T = (sx) => ((sx - from) / (to - from)) * w;
  const pk = s.picks[`UU.${sta}`];
  const b = [];
  b.push(columns(min, max, 0, w / nCols, h / 2, (h / 2 - 3) / peak, 'tr', 1));
  const xs = {};
  for (const [ph, cls] of [['P', 'p'], ['S', 's']]) {
    const x = T(sec(pk[ph], s.event));
    xs[ph] = x;
    b.push(line([[x, 2], [x, h - 2]], cls, w < 100 ? 1.4 : 2, 'stroke-linecap="round"'));
  }
  return { body: b.join(''), sta, mag: s.event.mag, place: s.event.place, pX: xs.P, sX: xs.S };
}

// Home page, option 2: Utah with the five schools (yellow) and the Junction M3.3 (star), its P
// and S fronts twenty seconds after it began (Quake Locator's speeds, 5.8 and 3.3 km/s), and,
// joined to station WCU (Millard's stand-in), the seismogram it recorded there.
// Utah's border: the same outline as tools/figures/science-maps.mjs.
const UTAH = [[-114.05, 42.0], [-111.05, 42.0], [-111.05, 41.0], [-109.05, 41.0], [-109.05, 37.0], [-114.05, 37.0]];
function homeBanner(w, h, { tSec = 20, sta = 'WCU' } = {}) {
  const dir = new URL('docs/app/data/samples/uu80162166/', root);
  const ev = JSON.parse(fs.readFileSync(new URL('event.json', dir)));
  const st = JSON.parse(fs.readFileSync(new URL('stations.json', dir))).find((x) => x.sta === sta);
  const proj = localProjection(39.5, -111.55);
  const ut = UTAH.map(([lon, lat]) => proj.toXY(lat, lon));
  const minX = Math.min(...ut.map((p) => p.x));
  const maxX = Math.max(...ut.map((p) => p.x));
  const maxY = Math.max(...ut.map((p) => p.y));
  const minY = Math.min(...ut.map((p) => p.y));
  const pad = 4;
  const kmPerPx = (maxY - minY) / (h - 2 * pad);
  const X = (lat, lon) => pad + (proj.toXY(lat, lon).x - minX) / kmPerPx;
  const Y = (lat, lon) => pad + (maxY - proj.toXY(lat, lon).y) / kmPerPx;
  const mapRight = pad + (maxX - minX) / kmPerPx;
  const b = [];
  b.push(`<polygon class="la" points="${pts(UTAH.map(([lon, lat]) => [X(lat, lon), Y(lat, lon)]))}" fill="${F.la}" stroke="${F.ed}" stroke-width="1.2" stroke-linejoin="round"/>`);
  const qx = X(ev.lat, ev.lon);
  const qy = Y(ev.lat, ev.lon);
  for (const [dt, op] of [[-8, 0.25], [-4, 0.5], [0, 1]]) {
    const t = tSec + dt;
    b.push(circle(qx, qy, (VP * t) / kmPerPx, 'p', 1.4, op < 1 ? `stroke-opacity="${op}"` : ''));
    b.push(circle(qx, qy, (VS * t) / kmPerPx, 's', 1.4, op < 1 ? `stroke-opacity="${op}"` : ''));
  }
  for (const sc of SCHOOLS) {
    b.push(`<circle class="sc" cx="${r1(X(sc.lat, sc.lon))}" cy="${r1(Y(sc.lat, sc.lon))}" r="3.4" fill="${F.sc}" stroke="${F.tr}" stroke-width="0.9"/>`);
  }
  b.push(star(qx, qy, 6.5, 'tf', 'la'));
  // the station, joined to its seismogram
  const sx = X(st.lat, st.lon);
  const sy = Y(st.lat, st.lon);
  const x0 = mapRight + 26;
  const traceH = h * 0.62;
  b.push(line([[sx + 4, sy], [mapRight + 6, sy], [x0 - 6, h / 2]], 'mu', 1, 'stroke-dasharray="2 3"'));
  b.push(triangle(sx, sy, 4, 'tf', 'la'));
  const g = homeSeismogram(w - x0, traceH, { sta });
  b.push(`<g transform="translate(${r1(x0)} ${r1(h / 2 - traceH / 2)})">${g.body}</g>`);
  return { body: b.join(''), ev, tSec, sta };
}

// ---------------------------------------------------------------------------------------
// Icons for The Science index: one per page, each from that page's own kind of figure.

/** Reading a seismogram: the WCU record of the Junction M3.3, P then S. */
function seismogramIcon(w, h, { bracket = false } = {}) {
  const g = homeSeismogram(w - 8, h * 0.62);
  const b = [rect(0, 0, w, h, 'pa'), `<g transform="translate(4 ${r1(h * 0.16)})">${g.body}</g>`];
  if (bracket) {
    // S minus P: the gap between the two lines
    const y = h * 0.88;
    b.push(line([[4 + g.pX, y - 3], [4 + g.pX, y], [4 + g.sX, y], [4 + g.sX, y - 3]], 'mu', 1.4));
  }
  return b.join('');
}

/** Which way the ground moves: MTPU's horizontal motion (seen from above) during P and during S. */
function groundMotion(w, h) {
  const sm = readSample('qe-junction', { fromSec: -2, toSec: 40 });
  const get = (c) => sm.records.find((r) => r.sta === 'MTPU' && r.cha.endsWith(c));
  const n = get('N');
  const e = get('E');
  const nd = filteredData(n, BP);
  const ed = filteredData(e, BP);
  const pk = sm.picks['UU.MTPU'];
  const win = (tMs, from, to) => windowIndices({ startMs: n.startMs, refMs: tMs, sampleRate: n.sampleRate, length: nd.length }, from, to);
  const P = win(pk.P, 0, 0.45);
  const S = win(pk.S, 0, 0.7);
  const m = Math.max(motionScale(null, nd, ed, P.i0, P.i1), motionScale(null, nd, ed, S.i0, S.i1)) || 1;
  const r = Math.min(w, h) / 2 - 6;
  const cx = w / 2;
  const cy = h / 2;
  const path = ({ i0, i1 }, k) => { const p = []; for (let i = i0; i < i1; i++) p.push([cx + (ed[i] / m) * r * k, cy - (nd[i] / m) * r * k]); return p; };
  const b = [rect(0, 0, w, h, 'pa')];
  b.push(line([[cx - r, cy], [cx + r, cy]], 'gr', 0.8), line([[cx, cy - r], [cx, cy + r]], 'gr', 0.8));
  const pScale = m / Math.max(motionScale(null, nd, ed, P.i0, P.i1), 1e-9);  // P is weaker: show it at full size too
  b.push(line(path(S, 1), 's', 1.2, 'stroke-linejoin="round"'));
  b.push(line(path(P, pScale), 'p', 1.4, 'stroke-linejoin="round"'));
  return b.join('');
}

/** Our stations and data: Utah, the five schools (yellow) and their stand-in stations. */
function stationsMap(w, h) {
  const dir = new URL('docs/app/data/samples/uu80162166/', root);
  const stations = JSON.parse(fs.readFileSync(new URL('stations.json', dir)));
  const proj = localProjection(39.5, -111.55);
  const ut = UTAH.map(([lon, lat]) => proj.toXY(lat, lon));
  const minX = Math.min(...ut.map((p) => p.x));
  const maxX = Math.max(...ut.map((p) => p.x));
  const minY = Math.min(...ut.map((p) => p.y));
  const maxY = Math.max(...ut.map((p) => p.y));
  const kmPerPx = Math.max((maxY - minY) / (h - 8), (maxX - minX) / (w - 8));
  const ox = (w - (maxX - minX) / kmPerPx) / 2;
  const oy = (h - (maxY - minY) / kmPerPx) / 2;
  const X = (lat, lon) => ox + (proj.toXY(lat, lon).x - minX) / kmPerPx;
  const Y = (lat, lon) => oy + (maxY - proj.toXY(lat, lon).y) / kmPerPx;
  const b = [rect(0, 0, w, h, 'pa')];
  b.push(`<polygon class="la" points="${pts(UTAH.map(([lon, lat]) => [X(lat, lon), Y(lat, lon)]))}" fill="${F.la}" stroke="${F.ed}" stroke-width="1" stroke-linejoin="round"/>`);
  for (const sc of SCHOOLS) {
    const st = stations.find((x) => x.sta === sc.standIn.sta);
    if (st) b.push(triangle(X(st.lat, st.lon), Y(st.lat, st.lon), 2.6, 'tf', 'la'));
  }
  for (const sc of SCHOOLS) b.push(`<circle class="sc" cx="${r1(X(sc.lat, sc.lon))}" cy="${r1(Y(sc.lat, sc.lon))}" r="2.4" fill="${F.sc}" stroke="${F.tr}" stroke-width="0.7"/>`);
  return b.join('');
}

// ---------------------------------------------------------------------------------------
const THUMB = { w: 300, h: 96 };
const ICON = { w: 64, h: 64 };
const apps = [
  ['quake-locator', quakeLocator],
  ['quake-explorer', (w, h) => quakeExplorer(w, h, w < 100 ? { traces: 7, toSec: 50 } : {})],
  ['quake-waves', quakeWaves],
  ['build-a-wiggle', (w, h) => buildAWiggle(w, h, { spectrum: w > 100 })],
  ['school-pulse', schoolPulse],
  ['phone-bench', phoneBench],
  ['shake-viewer', (w, h) => shakeViewer(w, h, w < 100 ? { rows: 8 } : {})],
  ['wave-motion', waveMotion],
];
for (const [name, draw] of [['seismogram', seismogramIcon], ['s-minus-p', (w, h) => seismogramIcon(w, h, { bracket: true })],
  ['ground-motion', groundMotion], ['stations', stationsMap]]) {
  write(`icon-${name}.svg`, svg(ICON.w, ICON.h, draw(ICON.w, ICON.h), { kind: 'icon' }));
}
for (const [name, draw] of apps) {
  write(`thumb-${name}.svg`, svg(THUMB.w, THUMB.h, draw(THUMB.w, THUMB.h), { kind: 'thumb' }));
  write(`icon-${name}.svg`, svg(ICON.w, ICON.h, draw(ICON.w, ICON.h), { kind: 'icon' }));
}

{
  const w = 760;
  const h = 64;
  const g = homeSeismogram(w, h);
  write('home-seismogram.svg', svg(w, h, g.body, { kind: 'banner', clip: false }));
}
{
  const w = 760;
  const h = 132;
  const g = homeBanner(w, h);
  write('home-banner.svg', svg(w, h, g.body, { kind: 'banner', clip: false }));
}

console.log(written.join('\n'));
