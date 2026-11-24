// Make the figures for the "Travel times and Earth's layers" page (docs/theory/img/).
//
//   node tools/figures/science-travel-times.mjs
//
//   tt-junction-speeds.svg  Figure 1: the Junction M3.3 record section out to 300 km, with
//                           straight lines fitted to the picks (P and S speeds) and a slope
//                           triangle (distance ÷ time = speed).
//   tt-ray-paths.svg        Figure 2: cross-section to scale: the direct wave (Pg) and the
//                           head wave along the top of the mantle (Pn), with the Magna numbers.
//   tt-magna-bend.svg       Figure 3: the Magna M5.7 record section in plain time and in
//                           reduced time (t − d/8), with the two fitted lines (Pg, Pn), where
//                           they cross and the intercept time.
//   tt-global.svg           Figure 4: P and S travel times through the whole Earth (iasp91),
//                           the core shadow zone, the Sand Point M7.3 arrivals at SGU, and an
//                           inset of ray paths through the Earth.
//
// Uses the Quake Explorer offline samples (docs/app/data/samples/qe-junction, qe-magna,
// qe-sand-point), the UUSS analysts' picks and the samples' computer (AIC) picks, and the app's
// own modules: the miniSEED parser and 1–10 Hz filter, linefit.js (the same fits as
// tools/quake-explorer/answer-key.mjs), traveltime.js, record-section.js (reduced time),
// teleseism.js with docs/app/data/traveltimes-iasp91.json, and picker.js. Whole-Earth curves and
// ray paths come from tools/figures/data/tt-iasp91-38km.json (ObsPy TauP, iasp91; see its
// "about"). No network. No credit text in the images: the page captions carry it. Output is
// deterministic (same bytes every run). Prints the numbers the page quotes.
import fs from 'node:fs';

// The seisplotjs bundle registers a web component when loaded; stub it for node.
globalThis.HTMLElement ??= class {};
globalThis.customElements ??= { define() {}, get() {} };

const { C, FONT, esc, r1 } = await import('./svg-traces.mjs');
const { parseMiniseed } = await import('../../docs/app/js/data/mseed.js');
const { filteredData } = await import('../../docs/app/js/data/filters.js');
const { picksByStation } = await import('../../docs/app/js/lib/fdsn.js');
const { speedFromArrivals, twoLineFit } = await import('../../docs/app/js/lib/linefit.js');
const { directTime, headTime, headIntercept, headMinDistance, crustFromIntercept, crossoverKm } =
  await import('../../docs/app/js/lib/traveltime.js');
const { reducedTime } = await import('../../docs/app/js/lib/record-section.js');
const { distanceDeg, bodyWaveTimes, inPShadow } = await import('../../docs/app/js/lib/teleseism.js');
const { decimate, peakAbs } = await import('../../docs/app/js/lib/signal.js');
const { aicPick } = await import('../../docs/app/js/lib/picker.js');
const { QUAKE_EXPLORER } = await import('../../docs/app/js/quake-explorer/config.js');

const outDir = new URL('../../docs/theory/img/', import.meta.url);
fs.mkdirSync(outDir, { recursive: true });

const SEC = QUAKE_EXPLORER.section;            // filter 1–10 Hz, reduction speed 8 km/s
const SNR = QUAKE_EXPLORER.computerPickSnr;    // computer picks the app shows: P >= 8, S >= 2
const MINUS = '−';
const COL = { ...C, pg: '#0d9488', pn: '#7c3aed', quake: '#f59e0b', quakeEdge: '#b45309',
  crust: '#f1ece2', mantle: '#e2d6c3', ground: '#a39478', faint: '#9aa1ac', shade: 'rgba(91,100,114,0.10)',
  core: '#f3e3c3', inner: '#e9c98f' };
const HALO = `stroke="${C.bg}" stroke-width="4" stroke-linejoin="round" paint-order="stroke"`;
const f1 = (v) => v.toFixed(1);
const f2 = (v) => v.toFixed(2);
const mmss = (sec) => `${Math.floor(sec / 60)}:${String(Math.round(sec % 60)).padStart(2, '0')}`;
const it = (s) => `<tspan font-style="italic">${s}</tspan>`;
const sub = (s, size = 10, shift = 4) => `<tspan dy="${shift}" font-size="${size}">${s}</tspan><tspan dy="${-shift}"> </tspan>`;

// ---- drawing helpers ------------------------------------------------------------------------

/** <text>; content is markup (escape plain strings with esc). */
function text(x, y, content, { size = 13, weight = 400, fill = C.note, anchor = 'start', halo = false, style = '' } = {}) {
  const a = [`x="${r1(x)}"`, `y="${r1(y)}"`, `font-size="${size}"`];
  if (weight !== 400) a.push(`font-weight="${weight}"`);
  if (style) a.push(`font-style="${style}"`);
  if (anchor !== 'start') a.push(`text-anchor="${anchor}"`);
  a.push(`fill="${fill}"`);
  if (halo) a.push(halo === true ? HALO : `stroke="${halo}" stroke-width="4" stroke-linejoin="round" paint-order="stroke"`);
  return `<text ${a.join(' ')}>${content}</text>`;
}
const line = (x1, y1, x2, y2, stroke, width = 1, extra = '') =>
  `<line x1="${r1(x1)}" y1="${r1(y1)}" x2="${r1(x2)}" y2="${r1(y2)}" stroke="${stroke}" stroke-width="${width}"${extra ? ' ' + extra : ''}/>`;
const dot = (cx, cy, fill, r = 3.6) => `<circle cx="${r1(cx)}" cy="${r1(cy)}" r="${r}" fill="${fill}" stroke="${C.bg}" stroke-width="1.3"/>`;
const ring = (cx, cy, stroke, r = 3.4) => `<circle cx="${r1(cx)}" cy="${r1(cy)}" r="${r}" fill="${C.bg}" stroke="${stroke}" stroke-width="1.6"/>`;
const polyline = (pts, stroke, width = 2, extra = '') =>
  `<path d="M${pts.map(([x, y]) => `${r1(x)} ${r1(y)}`).join('L')}" fill="none" stroke="${stroke}" stroke-width="${width}" stroke-linejoin="round"${extra ? ' ' + extra : ''}/>`;
const marker = (id, color) => `<marker id="${id}" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill="${color}"/></marker>`;

function star(cx, cy, ro, ri, n = 5) {
  const pts = [];
  for (let i = 0; i < 2 * n; i++) {
    const r = i % 2 ? ri : ro;
    const a = (-90 + (i * 180) / n) * Math.PI / 180;
    pts.push(`${r1(cx + r * Math.cos(a))},${r1(cy + r * Math.sin(a))}`);
  }
  return `<polygon points="${pts.join(' ')}" fill="${COL.quake}" stroke="${COL.quakeEdge}" stroke-width="1.2" stroke-linejoin="round"/>`;
}
function triangle(x, y, color, size = 9) {
  return `<polygon points="${r1(x)},${r1(y - size * 1.6)} ${r1(x - size)},${r1(y)} ${r1(x + size)},${r1(y)}" fill="${color}" stroke="#ffffff" stroke-width="1.2" stroke-linejoin="round"/>`;
}
function open(W, H, title, desc, defs = '') {
  return [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" ${FONT}>`,
    `<title>${esc(title)}</title>`,
    `<desc>${esc(desc)}</desc>`,
    defs ? `<defs>${defs}</defs>` : '',
    `<rect x="0.5" y="0.5" width="${W - 1}" height="${H - 1}" rx="8" fill="${C.bg}" stroke="${C.border}"/>`,
    text(12, 22, esc(title), { size: 15, weight: 600 }),
  ].filter(Boolean);
}
function save(name, out) {
  out.push('</svg>');
  const svg = out.join('\n') + '\n';
  fs.writeFileSync(new URL(name, outDir), svg);
  console.log(`wrote docs/theory/img/${name} (${(svg.length / 1024).toFixed(0)} KB)`);
}

/** A number for a path, to 0.1 px, as short as possible ("0.5" -> ".5"). */
const num = (v) => String(Math.round(v * 10) / 10 + 0).replace(/^(-?)0\./, '$1.');
const join = (...vs) => vs.map((v, i) => (i && !v.startsWith('-') ? ' ' : '') + v).join('');

/**
 * One seismogram as a min/max envelope, one column per px. The plot's left and right edges are
 * tFrom..tTo seconds after the origin for this trace (with reduced time each trace has its own).
 * Written with relative path commands (l, v, h), and flat stretches merged, to keep files small.
 */
function tracePath(tr, originMs, tFrom, tTo, x0, cols, yc, amp) {
  const sr = tr.sampleRate;
  const perCol = ((tTo - tFrom) * sr) / cols;
  const i0 = ((originMs - tr.startMs) / 1000 + tFrom) * sr;
  const peak = peakAbs(tr.data, Math.floor(i0), Math.ceil(i0 + cols * perCol)) || 1;
  const k = amp / peak;
  const q = (v) => Math.round(v * 10) / 10;
  let d = '';
  let pen = null;   // [x, y] of the pen, in rounded px
  let run = 0;      // columns of a flat stretch not yet written
  const flush = () => { if (run) { d += `h${run}`; pen[0] += run; run = 0; } };
  for (let c = 0; c < cols; c++) {
    const a = Math.max(0, Math.floor(i0 + c * perCol));
    const b = Math.min(tr.data.length, Math.max(a + 1, Math.floor(i0 + (c + 1) * perCol)));
    let lo = Infinity;
    let hi = -Infinity;
    for (let i = a; i < b; i++) {
      const v = tr.data[i];
      if (Number.isNaN(v)) continue;
      if (v < lo) lo = v;
      if (v > hi) hi = v;
    }
    if (lo === Infinity) { if (pen) flush(); pen = null; continue; }
    const cx = q(x0 + c + 0.5);
    const yTop = q(yc - hi * k);
    const yBot = q(yc - lo * k);
    if (!pen) {
      d += `M${join(num(cx), num(yTop))}`;
      if (yBot !== yTop) d += `v${num(yBot - yTop)}`;
      pen = [cx, yBot];
      continue;
    }
    if (yTop === pen[1] && yBot === pen[1]) { run++; continue; }
    flush();
    d += `l${join(num(cx - pen[0]), num(yTop - pen[1]))}`;
    if (yBot !== yTop) d += `v${num(yBot - yTop)}`;
    pen = [cx, yBot];
  }
  if (pen) flush();
  return d;
}

// ---- data -----------------------------------------------------------------------------------

function loadSample(dir) {
  const base = new URL(`../../docs/app/data/samples/${dir}/`, import.meta.url);
  const j = (f) => JSON.parse(fs.readFileSync(new URL(f, base), 'utf8'));
  const sample = j('sample.json');
  const event = j('event.json');
  const buf = fs.readFileSync(new URL('waveforms.mseed', base));
  const fromMs = event.timeMs - sample.window.preSec * 1000;
  const toMs = event.timeMs + sample.window.postSec * 1000;
  const traces = parseMiniseed(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.length), { fromMs, toMs });
  return { dir, sample, event, stations: j('stations.json'), picks: picksByStation(j('picks.json')),
    computer: j('computer-picks.json'), traces };
}

/** Arrivals of one phase: the analysts' pick where there is one, else a computer pick with snr >= minSnr. */
function arrivals(s, phase, minSnr) {
  return s.stations.flatMap((st) => {
    const a = s.picks[`${st.net}.${st.sta}`]?.[phase];
    const c = s.computer.find((p) => p.sta === st.sta && p.phase === phase && p.snr >= minSnr);
    const t = a ?? c?.timeMs;
    return t === undefined ? [] : [{ sta: st.sta, distKm: st.distKm, tSec: (t - s.event.timeMs) / 1000, who: a ? 'analyst' : 'computer' }];
  });
}

/** Each station's vertical trace, filtered as the app's record section (1–10 Hz), nearest first. */
function verticals(s) {
  return s.stations.map((st) => {
    const raw = s.traces.find((t) => t.sta === st.sta && t.cha.endsWith('Z'));
    return { sta: st.sta, km: st.distKm, tr: { ...raw, data: filteredData(raw, SEC.filter) } };
  }).sort((a, b) => a.km - b.km);
}

// =============================================================================================
// Figure 1: measuring speeds on the Junction record section
// =============================================================================================

function figJunction() {
  const s = loadSample('qe-junction');
  const origin = s.event.timeMs;
  const P = arrivals(s, 'P', SNR.P);
  const S = arrivals(s, 'S', SNR.S);
  const pFit = speedFromArrivals(P.filter((p) => p.who === 'analyst' && p.distKm <= 100));
  const sAll = speedFromArrivals(S.filter((p) => p.distKm <= 240));
  const sAn = speedFromArrivals(S.filter((p) => p.who === 'analyst'));
  const two = twoLineFit(P, { minPerLine: 4 });
  const tP = (d) => pFit.interceptSec + d / pFit.speedKms;
  const tS = (d) => sAll.interceptSec + d / sAll.speedKms;
  const tSa = (d) => sAn.interceptSec + d / sAn.speedKms;

  const W = 760;
  const plotL = 80;
  const plotR = 700;
  const top = 72;
  const KM1 = 300;
  const T1 = 70;
  const plotH = 600;
  const x = (t) => plotL + (t / T1) * (plotR - plotL);
  const y = (km) => top + (km / KM1) * plotH;
  const bottom = top + plotH;
  const H = bottom + 48;
  const rows = verticals(s);

  const nAn = P.filter((p) => p.who === 'analyst').length;
  const desc = `Record section of the M${s.event.mag} quake near Junction, Utah: the vertical seismograms of ${rows.length} `
    + `University of Utah stations from ${Math.round(rows[0].km)} to ${Math.round(rows.at(-1).km)} km (distance down the page) `
    + `against seconds after the quake (0 to ${T1}, across). Filled dots are the analysts' picks (P at ${nAn} stations, S at `
    + `${S.filter((p) => p.who === 'analyst').length}); open circles are computer picks. A blue line fitted to the analysts' P picks `
    + `within 100 km has a speed of ${f1(pFit.speedKms)} km/s; a slope triangle on it reads 100 km in `
    + `${f1(100 / pFit.speedKms)} s. A red line fitted to all S picks out to 240 km has a speed of ${f1(sAll.speedKms)} km/s; a dotted `
    + `red line through the three analyst S picks has ${f1(sAn.speedKms)} km/s. Beyond about 250 km the P arrivals come `
    + 'before the blue line.';
  const out = open(W, H, 'Measuring speeds: the Junction quake out to 300 km', desc);

  // legend, top right: P and S, analysts (filled) and computer (open)
  {
    const yL = 46;
    const lx = 368;
    out.push(dot(lx, yL, C.p));
    out.push(dot(lx + 11, yL, C.s));
    out.push(text(lx + 20, yL + 4, 'analysts’ picks', { size: 12, fill: C.muted }));
    out.push(ring(lx + 128, yL, C.p));
    out.push(ring(lx + 139, yL, C.s));
    out.push(text(lx + 148, yL + 4, 'computer picks', { size: 12, fill: C.muted }));
    out.push(text(lx + 256, yL + 4, `(blue P, red S)`, { size: 12, fill: C.muted }));
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
  out.push(text(plotR + 52, top - 8, 'distance ↓', { size: 12, fill: C.muted, anchor: 'end' }));

  // traces and station names (skipping names that would overlap)
  const cols = plotR - plotL;
  for (const r of rows) {
    out.push(`<path d="${tracePath(r.tr, origin, 0, T1, plotL, cols, y(r.km), 7)}" fill="none" stroke="${C.trace}" stroke-width="0.8" stroke-linejoin="round"/>`);
  }
  let lastY = -Infinity;
  for (const r of rows) {
    if (y(r.km) - lastY < 11) continue;
    out.push(text(plotL - 6, y(r.km) + 4, esc(r.sta), { size: 11, weight: 600, fill: C.muted, anchor: 'end' }));
    lastY = y(r.km);
  }

  // fitted lines: P solid where it was fitted (0–100 km), dashed beyond; S to 240 km; analyst S dotted
  const seg = (tf, d0, d1, step = 2) => {
    const pts = [];
    for (let d = d0; d <= d1 + 1e-9; d += step) {
      const t = tf(d);
      if (t > T1) {
        // finish exactly at the right edge
        const lo = d - step;
        let a = lo;
        let b = d;
        for (let i = 0; i < 40; i++) { const m = (a + b) / 2; if (tf(m) > T1) b = m; else a = m; }
        pts.push([x(T1), y(a)]);
        break;
      }
      pts.push([x(t), y(d)]);
    }
    return pts;
  };
  out.push(polyline(seg(tP, 0, 100), C.p, 2.2));
  out.push(polyline(seg(tP, 100, KM1), C.p, 1.8, 'stroke-dasharray="7 5"'));
  out.push(polyline(seg(tSa, 0, KM1), C.s, 1.6, 'stroke-dasharray="2 4" stroke-linecap="round"'));
  out.push(polyline(seg(tS, 0, 240), C.s, 2.2));

  // slope triangle on the P line, 30 -> 130 km, on the quiet side (before P); its legs and
  // labels sit in the gaps between traces
  const D0 = 30;
  {
    const ax = x(tP(D0));
    const ay = y(D0);
    const by = y(D0 + 100);
    const bx = x(tP(D0 + 100));
    out.push(`<path d="M${r1(ax)} ${r1(ay)}V${r1(by)}H${r1(bx)}" fill="none" stroke="${C.bg}" stroke-width="4.5" stroke-linejoin="round"/>`);
    out.push(`<path d="M${r1(ax)} ${r1(ay)}V${r1(by)}H${r1(bx)}" fill="none" stroke="${C.note}" stroke-width="1.6" stroke-linejoin="round"/>`);
    out.push(text(ax + 7, y(D0 + 56) + 5, '100 km', { size: 13, weight: 700, halo: true }));
    out.push(text((ax + bx) / 2, by + 18, `${f1(100 / pFit.speedKms)} s`, { size: 13, weight: 700, anchor: 'middle', halo: true }));
    out.push(text(plotL + 10, y(192), `speed = 100 km ÷ ${f1(100 / pFit.speedKms)} s`, { size: 13, weight: 700, halo: true }));
    out.push(text(plotL + 10, y(192) + 17, `= ${f1(pFit.speedKms)} km/s`, { size: 13, weight: 700, halo: true }));
  }

  // line labels, each in a gap between traces
  out.push(text(x(tP(171)) - 10, y(171) + 5, `P: ${f1(pFit.speedKms)} km/s <tspan font-weight="400" font-size="12">(fitted within 100 km)</tspan>`,
    { weight: 700, fill: C.p, anchor: 'end', halo: true }));
  out.push(text(x(tS(193)) - 9, y(193), `S: ${f1(sAll.speedKms)} km/s`, { weight: 700, fill: C.s, anchor: 'end', halo: true }));
  out.push(text(x(tS(193)) - 9, y(193) + 16, '(all S picks to 240 km)', { size: 12, fill: C.s, anchor: 'end', halo: true }));
  out.push(text(x(tSa(136)) + 8, y(136) + 5, `${f1(sAn.speedKms)} km/s <tspan font-weight="400" font-size="12">(the 3 analyst S picks)</tspan>`,
    { weight: 700, fill: C.s, halo: true }));

  // the far stations come early
  {
    const tip = P.find((p) => p.distKm > 260);
    const ty = y(251);
    out.push(text(x(tip.tSec) - 60, ty + 5, 'far away, P arrives before the line', { size: 12.5, weight: 600, anchor: 'end', halo: true }));
    out.push(line(x(tip.tSec) - 56, ty + 1, x(tip.tSec) - 5, y(tip.distKm) - 4, C.note, 1.3, 'marker-end="url(#arrow-dark)"'));
  }

  // picks on top
  for (const [list, col] of [[P, C.p], [S, C.s]]) {
    for (const p of list) out.push(p.who === 'analyst' ? dot(x(p.tSec), y(p.distKm), col) : ring(x(p.tSec), y(p.distKm), col));
  }
  out.splice(4, 0, `<defs>${marker('arrow-dark', C.note)}</defs>`);
  save('tt-junction-speeds.svg', out);

  console.log(`  Junction (${s.event.id}, depth ${s.event.depthKm} km): ${rows.length} stations; analysts picked P at `
    + `${P.filter((p) => p.who === 'analyst').length}, S at ${S.filter((p) => p.who === 'analyst').length}; computer picks shown: `
    + `P ${P.filter((p) => p.who === 'computer').length} (SNR >= ${SNR.P}), S ${S.filter((p) => p.who === 'computer').length} (SNR >= ${SNR.S}), `
    + `computer S picked on ${[...new Set(s.computer.filter((p) => p.phase === 'S').map((p) => p.cha.at(-1)))].join('/')} channels`);
  console.log(`    P, analysts within 100 km: ${f2(pFit.speedKms)} ± ${f2(pFit.speedSE)} km/s, intercept ${f2(pFit.interceptSec)} s, n=${pFit.n}; 100 km takes ${f2(100 / pFit.speedKms)} s`);
  console.log(`    S, all picks within 240 km: ${f2(sAll.speedKms)} ± ${f2(sAll.speedSE)} km/s, rms ${f2(sAll.rmsSec)} s, n=${sAll.n}`);
  console.log(`    S, analysts only: ${f2(sAn.speedKms)} ± ${f2(sAn.speedSE)} km/s, n=${sAn.n}, farthest ${f1(Math.max(...S.filter((p) => p.who === 'analyst').map((p) => p.distKm)))} km`);
  console.log(`    Vp/Vs: ${f2(pFit.speedKms / sAn.speedKms)} (analyst S) to ${f2(pFit.speedKms / sAll.speedKms)} (all S)`);
  console.log(`    analyst P picks reach ${f1(Math.max(...P.filter((p) => p.who === 'analyst').map((p) => p.distKm)))} km; two lines: ${f2(two.near.speedKms)} -> ${f2(two.far.speedKms)} ± ${f2(two.far.speedSE)} km/s, F ${two.fRatio.toFixed(0)}, cross ${two.crossoverKm.toFixed(0)} km, far line from ${f1(two.splitKm)} km (${two.far.n} stations)`);
  for (const p of P.filter((q) => q.distKm > 175)) console.log(`      ${p.sta.padEnd(5)} ${f1(p.distKm)} km  P ${f2(p.tSec)} s (${p.who})  minus line ${f2(p.tSec - tP(p.distKm))} s`);
}

// =============================================================================================
// Figure 2: two ways to a far station (Pg and Pn), to scale, with the Magna numbers
// =============================================================================================

function magnaModel() {
  const s = loadSample('qe-magna');
  const P = arrivals(s, 'P', SNR.P);
  const two = twoLineFit(P, { minPerLine: 4 });
  const v1 = two.near.speedKms;
  const v2 = two.far.speedKms;
  const ti = two.far.interceptSec;
  const h = s.event.depthKm;
  const H = crustFromIntercept(ti, v1, v2, h);
  return { s, P, two, v1, v2, ti, h, H };
}

function figRayPaths(m) {
  const { v1, v2, h, H } = m;
  const D = 220; // km, the far station
  const ic = Math.asin(v1 / v2);
  const tanI = Math.tan(ic);
  const cosI = Math.cos(ic);
  const W = 760;
  const kx = 2.9; // px per km, the same both ways: drawn to scale
  const x0 = 46;
  const gy = 104;
  const X = (km) => x0 + km * kx;
  const Y = (km) => gy + km * kx;
  const bottomKm = 50;
  const downX = (H - h) * tanI;           // where the down-going ray meets the Moho
  const upX = D - H * tanI;               // where the up-going ray leaves it
  const crustDown = (H - h) / cosI;
  const crustUp = H / cosI;
  const along = upX - downX;
  const tPg = directTime(D, h, v1);
  const tPn = headTime(D, h, H, v1, v2);
  const firstUp = headMinDistance(h, H, v1, v2);

  const textY = Y(bottomKm) + 34;
  const Hpx = textY + 66;
  const desc = `Cross-section drawn to scale: crust ${Math.round(H)} km thick (P at ${f1(v1)} km/s) over the mantle (P at ${f1(v2)} km/s). `
    + `A quake ${f1(h)} km deep and a station ${D} km away. The direct wave Pg goes straight through the crust: ${f1(Math.hypot(D, h))} km `
    + `in ${f1(tPg)} s. The head wave Pn goes down to the Moho at the critical angle of ${f1(ic * 180 / Math.PI)} degrees, runs ${Math.round(along)} km `
    + `along the top of the mantle and comes back up: ${Math.round(crustDown + crustUp)} km in the crust and ${Math.round(along)} km in the mantle, `
    + `${f1(tPn)} s, so it arrives ${f1(tPg - tPn)} s sooner. Faint lines show the head wave leaving the Moho all along the way; the `
    + `nearest place it reaches the surface is ${Math.round(firstUp)} km from the epicenter.`;
  const defs = [marker('arr-pg', COL.pg), marker('arr-pn', COL.pn)].join('');
  const out = open(W, Hpx, 'Two ways to a far station: straight, or down to the faster mantle', desc, defs);

  // layers
  out.push(`<rect x="${X(-14)}" y="${gy}" width="${r1(X(D + 16) - X(-14))}" height="${r1(H * kx)}" fill="${COL.crust}"/>`);
  out.push(`<rect x="${X(-14)}" y="${r1(Y(H))}" width="${r1(X(D + 16) - X(-14))}" height="${r1((bottomKm - H) * kx)}" fill="${COL.mantle}"/>`);
  out.push(line(X(-14), gy, X(D + 16), gy, COL.ground, 1.5));
  out.push(line(X(-14), Y(H), X(D + 16), Y(H), COL.ground, 1.5, 'stroke-dasharray="6 4"'));
  out.push(text(X(118), Y(25), `crust: P travels ${f1(v1)} km/s`, { size: 13, weight: 600, anchor: 'middle', halo: COL.crust }));
  out.push(text(X(D + 13), Y(H) + 18, `mantle: P travels ${f1(v2)} km/s`, { size: 13, weight: 600, anchor: 'end', halo: COL.mantle }));
  out.push(text(X(-11), Y(H) - 6, `Moho, ${Math.round(H)} km down`, { size: 12, weight: 600, fill: C.muted, halo: COL.crust }));
  out.push(text(X(-11), Y(bottomKm) - 7, 'drawn to scale', { size: 12, style: 'italic', fill: C.muted, halo: COL.mantle }));

  // the head wave leaks back up all along the Moho: faint rays
  for (const km of [firstUp - H * tanI + 0.01, 92, 124]) {
    if (km + H * tanI > upX + H * tanI - 30) continue;
    out.push(line(X(km), Y(H), X(km + H * tanI), gy, COL.pn, 1, 'stroke-opacity="0.35" stroke-dasharray="4 3"'));
  }
  out.push(line(X(firstUp), gy, X(firstUp), gy - 8, C.muted, 1));
  out.push(text(X(firstUp), gy - 12, `head wave first reaches the surface (${Math.round(firstUp)} km)`, { size: 11.5, fill: C.muted, anchor: 'middle' }));

  // the two paths
  const qx = X(0);
  const qy = Y(h);
  // stop each path just short of the station, so the arrowheads don't hide it
  const short = ([ax, ay], [bx, by], px = 8) => {
    const len = Math.hypot(bx - ax, by - ay);
    return [bx - ((bx - ax) * px) / len, by - ((by - ay) * px) / len];
  };
  out.push(polyline([[qx, qy], short([qx, qy], [X(D), gy])], COL.pg, 2.6, 'marker-end="url(#arr-pg)"'));
  out.push(polyline([[qx, qy], [X(downX), Y(H)], [X(upX), Y(H)], short([X(upX), Y(H)], [X(D), gy])], COL.pn, 2.6, 'marker-end="url(#arr-pn)"'));
  // critical angle at the bottom of the down-going leg: between the vertical and the ray
  {
    const cx = X(downX);
    const cy = Y(H);
    const r = 30;
    const a0 = -Math.PI / 2;                  // straight up from the Moho point
    const a1 = -Math.PI / 2 - ic;             // back along the ray (up and to the left)
    out.push(line(cx, cy, cx, cy - 44, C.muted, 1, 'stroke-dasharray="3 3"'));
    out.push(`<path d="M${r1(cx + r * Math.cos(a0))} ${r1(cy + r * Math.sin(a0))}A${r} ${r} 0 0 0 ${r1(cx + r * Math.cos(a1))} ${r1(cy + r * Math.sin(a1))}" fill="none" stroke="${C.note}" stroke-width="1.3"/>`);
    out.push(text(cx - 4, cy - r - 6, `${f1(ic * 180 / Math.PI)}°`, { size: 12.5, weight: 700, anchor: 'end', halo: COL.crust }));
  }
  out.push(star(qx, qy, 11, 5, 8));
  out.push(text(qx + 12, qy + 18, `quake, ${f1(h)} km deep`, { size: 12.5, weight: 600, halo: COL.crust }));
  out.push(triangle(X(D), gy, '#374151', 9));
  out.push(text(X(D), gy - 22, `station ${D} km away`, { size: 13, weight: 600, anchor: 'middle' }));
  out.push(text(X(D * 0.5), Y(h * 0.5) - 3, 'Pg', { size: 14, weight: 700, fill: COL.pg, anchor: 'middle', halo: COL.crust }));
  out.push(text(X((downX + upX) / 2), Y(H) - 7, 'Pn: along the top of the mantle', { size: 13, weight: 700, fill: COL.pn, anchor: 'middle', halo: COL.crust }));

  // times, under the drawing
  const legend = (yy, color, label, rest) => {
    out.push(line(X(-12), yy - 4, X(-12) + 26, yy - 4, color, 3));
    out.push(text(X(-12) + 34, yy, `<tspan font-weight="700" fill="${color}">${label}</tspan> ${rest}`, { size: 13 }));
  };
  legend(textY, COL.pg, 'Pg (direct):', `${f1(Math.hypot(D, h))} km through the crust at ${f1(v1)} km/s → ${f1(tPg)} s`);
  legend(textY + 22, COL.pn, 'Pn (head wave):', `${Math.round(crustDown + crustUp)} km in the crust at ${f1(v1)} km/s + ${Math.round(along)} km along the mantle at ${f1(v2)} km/s → ${f1(tPn)} s`);
  out.push(text(X(-12) + 34, textY + 44, `A longer path, but it arrives ${f1(tPg - tPn)} s sooner.`, { size: 13, weight: 700 }));
  save('tt-ray-paths.svg', out);

  console.log(`  ray paths (Magna model): critical angle ${f1(ic * 180 / Math.PI)}°, sin = ${f2(v1 / v2)}, cos = ${f2(cosI)}; head wave from ${f1(firstUp)} km`);
  console.log(`    at ${D} km: Pg ${f2(tPg)} s (${f1(Math.hypot(D, h))} km); Pn ${f2(tPn)} s = ${f1(crustDown + crustUp)} km crust (${f2((crustDown + crustUp) / v1)} s) + ${f1(along)} km mantle (${f2(along / v2)} s)`);
}

// =============================================================================================
// Figure 3: the bend, Magna in plain time and in reduced time
// =============================================================================================

function figMagna(m) {
  const { s, P, two, v1, v2, ti, h, H } = m;
  const origin = s.event.timeMs;
  const V = SEC.reduceKmS;
  const tg = (d) => two.near.interceptSec + d / v1;
  const tn = (d) => ti + d / v2;
  const xKm = two.crossoverKm;
  const rows = verticals(s);
  const W = 760;
  const top = 92;
  const KM1 = 400;
  const plotH = 520;
  const y = (km) => top + (km / KM1) * plotH;
  const bottom = top + plotH;
  const Hpx = bottom + 52;
  const panels = [
    { key: 'plain', L: 64, R: 370, t0: 0, t1: 60, step: 10, head: 'Plain time', axis: 'seconds after the quake',
      tx: (t) => t },
    { key: 'reduced', L: 404, R: 710, t0: -2, t1: 14, step: 2, head: `Reduced time: t ${MINUS} d/${V}`, axis: `seconds after the quake ${MINUS} d/${V}`,
      tx: (t, d) => reducedTime(t, d, V) },
  ];
  const nComp = P.filter((p) => p.who === 'computer').length;
  const lastAnalyst = Math.max(...P.filter((p) => p.who === 'analyst').map((p) => p.distKm));
  const desc = `The M${s.event.mag} Magna quake of 2020 recorded by ${rows.length} University of Utah stations out to `
    + `${Math.round(rows.at(-1).km)} km, drawn twice. Left, plain time (0 to 60 s): the first P arrivals (${P.length} picks, `
    + `${nComp} of them computer picks) follow a ${f1(v1)} km/s line near the quake and a faster ${f1(v2)} km/s line farther out; `
    + `the lines cross at ${Math.round(xKm)} km. Right, the same records in reduced time, t minus d/${V}: the ${f1(v2)} km/s arrivals `
    + `run almost straight down and the ${f1(v1)} km/s ones lean to the right, so the bend is easy to see. Extended back to `
    + `0 km, the faster line starts at ${f1(ti)} s (the intercept time).`;
  const out = open(W, Hpx, 'The bend: the 2020 Magna quake (M5.7), drawn two ways', desc);
  {
    const yL = 44;
    const lx = 470;
    out.push(text(lx, yL + 4, 'First P:', { size: 12, fill: C.muted }));
    out.push(dot(lx + 58, yL, C.p));
    out.push(text(lx + 66, yL + 4, 'analysts', { size: 12, fill: C.muted }));
    out.push(ring(lx + 130, yL, C.p));
    out.push(text(lx + 138, yL + 4, 'computer', { size: 12, fill: C.muted }));
  }

  for (const pan of panels) {
    const x = (t) => pan.L + ((t - pan.t0) / (pan.t1 - pan.t0)) * (pan.R - pan.L);
    const inX = (t) => t >= pan.t0 - 1e-9 && t <= pan.t1 + 1e-9;
    out.push(text((pan.L + pan.R) / 2, top - 30, esc(pan.head), { size: 14, weight: 700, anchor: 'middle' }));
    for (let t = Math.ceil(pan.t0 / pan.step) * pan.step; t <= pan.t1; t += pan.step) {
      out.push(line(x(t), top, x(t), bottom, C.grid));
      out.push(text(x(t), bottom + 17, String(t).replace('-', MINUS), { size: 12, fill: C.muted, anchor: 'middle' }));
    }
    out.push(text((pan.L + pan.R) / 2, bottom + 36, esc(pan.axis), { size: 12, fill: C.muted, anchor: 'middle' }));
    // crossover distance
    out.push(line(pan.L, y(xKm), pan.R, y(xKm), C.muted, 1, 'stroke-dasharray="2 3"'));
    // traces
    const cols = pan.R - pan.L;
    for (const r of rows) {
      const shift = pan.key === 'reduced' ? r.km / V : 0;
      const bad = !P.some((p) => p.sta === r.sta);
      out.push(`<path d="${tracePath(r.tr, origin, pan.t0 + shift, pan.t1 + shift, pan.L, cols, y(r.km), 5.5)}" fill="none" stroke="${bad ? COL.faint : C.trace}" stroke-width="0.7" stroke-linejoin="round"/>`);
    }
    out.push(`<rect x="${pan.L}" y="${top}" width="${pan.R - pan.L}" height="${plotH}" fill="none" stroke="${C.border}"/>`);
    // fitted lines, clipped to the panel: Pg solid to the crossover then dashed; Pn dashed back to 0 km
    const linePts = (tf, d0, d1) => {
      const pts = [];
      for (let d = d0; d <= d1 + 1e-9; d += 1) {
        const t = pan.tx(tf(d), d);
        if (inX(t)) pts.push([x(t), y(d)]);
      }
      return pts;
    };
    const draw = (pts, color, width, extra = '') => { if (pts.length > 1) out.push(polyline(pts, color, width, extra)); };
    draw(linePts(tg, 0, xKm), COL.pg, 2.4);
    draw(linePts(tg, xKm, 330), COL.pg, 1.8, 'stroke-dasharray="6 5"');
    draw(linePts(tn, 0, xKm), COL.pn, 1.8, 'stroke-dasharray="6 5"');
    draw(linePts(tn, xKm, KM1), COL.pn, 2.4);
    // intercept time: where the Pn line meets 0 km (t = ti in both panels)
    out.push(line(x(ti), top - 10, x(ti), top, COL.pn, 2));
    out.push(text(x(ti), top - 14, `${it('t')}${sub('i')}= ${f1(ti)} s`, { size: 12.5, weight: 700, fill: COL.pn, anchor: 'middle', halo: true }));
    // picks
    for (const p of P) {
      const t = pan.tx(p.tSec, p.distKm);
      if (!inX(t)) continue;
      out.push(p.who === 'analyst' ? dot(x(t), y(p.distKm), C.p, 3.2) : ring(x(t), y(p.distKm), C.p, 3));
    }
    // labels
    // labels, each in a gap between traces
    if (pan.key === 'plain') {
      out.push(text(x(tg(62.7)) - 9, y(62.7) + 5, `Pg: ${f1(v1)} km/s`, { weight: 700, fill: COL.pg, anchor: 'end', halo: true }));
      out.push(text(x(tn(317)) - 9, y(317) + 5, `Pn: ${f1(v2)} km/s`, { weight: 700, fill: COL.pn, anchor: 'end', halo: true }));
      out.push(text(pan.L + 6, y(xKm) - 6, `lines cross at ${Math.round(xKm)} km`, { size: 12, weight: 600, fill: C.muted, halo: true }));
    } else {
      out.push(text(x(pan.tx(tg(121), 121)) - 9, y(121) + 5, 'Pg leans right', { size: 12.5, weight: 700, fill: COL.pg, anchor: 'end', halo: true }));
      out.push(text(x(pan.tx(tn(311), 311)) - 10, y(311) + 3, 'Pn runs almost', { size: 12.5, weight: 700, fill: COL.pn, anchor: 'end', halo: true }));
      out.push(text(x(pan.tx(tn(311), 311)) - 10, y(311) + 18, 'straight down', { size: 12.5, weight: 700, fill: COL.pn, anchor: 'end', halo: true }));
    }
  }
  // distance ticks on the outer sides
  for (let km = 0; km <= KM1; km += 50) {
    out.push(line(panels[0].L - 4, y(km), panels[0].L, y(km), C.muted));
    out.push(text(panels[0].L - 7, y(km) + 4, `${km}`, { size: 12, fill: C.muted, anchor: 'end' }));
    out.push(line(panels[1].R, y(km), panels[1].R + 4, y(km), C.muted));
    out.push(text(panels[1].R + 7, y(km) + 4, `${km}`, { size: 12, fill: C.muted }));
  }
  out.push(text(panels[0].L - 7, top - 8, 'km ↓', { size: 12, fill: C.muted, anchor: 'end' }));
  out.push(text(panels[1].R + 7, top - 8, 'km ↓', { size: 12, fill: C.muted }));
  save('tt-magna-bend.svg', out);

  const ic = Math.asin(v1 / v2);
  console.log(`  Magna (${s.event.id}, depth ${h} km): ${P.length} first-P picks (${nComp} computer, P SNR >= ${SNR.P}); analysts' last P pick ${f1(lastAnalyst)} km`);
  console.log(`    two lines: Pg ${f2(v1)} ± ${f2(two.near.speedSE)} km/s (intercept ${f2(two.near.interceptSec)} s, n=${two.near.n}), `
    + `Pn ${f2(v2)} ± ${f2(two.far.speedSE)} km/s (intercept ti ${f2(ti)} ± ${f2(two.far.interceptSE)} s, n=${two.far.n}, from ${f1(two.splitKm)} km); F ${two.fRatio.toFixed(0)}; lines cross ${f1(xKm)} km`);
  console.log(`    critical angle ${f1(ic * 180 / Math.PI)}° (sin ${f2(v1 / v2)}, cos ${f2(Math.cos(ic))}); crust from ti: ${f1(H)} km `
    + `[= (${f2(ti)} × ${f2(v1)} / ${f2(Math.cos(ic))} + ${h}) / 2]; check headIntercept(h, H) = ${f2(headIntercept(h, H, v1, v2))} s`);
  console.log(`    model crossover for that crust: ${f1(crossoverKm(h, H, v1, v2))} km (quake at depth), ${f1(crossoverKm(0, H, v1, v2))} km (at the surface)`);
  // what crust thickness would make the model cross over where the fitted lines do?
  let lo = 5;
  let hi = H;
  for (let i = 0; i < 60; i++) { const mid = (lo + hi) / 2; if (crossoverKm(h, mid, v1, v2) < xKm) lo = mid; else hi = mid; }
  console.log(`    (crust that would put the model crossover at ${f1(xKm)} km: ${f1(lo)} km)`);
  for (const dd of [7.0]) console.log(`    try-it: ti ${dd} s -> crust ${f1(crustFromIntercept(dd, v1, v2, h))} km`);
  console.log(`    ti ± its standard error (${f2(two.far.interceptSE)} s): crust ${f1(crustFromIntercept(ti - two.far.interceptSE, v1, v2, h))}–${f1(crustFromIntercept(ti + two.far.interceptSE, v1, v2, h))} km`);
  console.log(`    if the Pg line's own start (${f2(two.near.interceptSec)} s) is a delay every P shares: ti ${f2(ti - two.near.interceptSec)} s -> crust ${f1(crustFromIntercept(ti - two.near.interceptSec, v1, v2, h))} km`);
  console.log(`    model Pg from the hypocenter at 0 km: ${f2(directTime(0, h, v1))} s; at 150 km ${f2(directTime(150, h, v1))} s vs fitted Pg line ${f2(tg(150))} s`);
  console.log(`    reduced time: Pg leans ${f2(100 * (1 / v1 - 1 / V))} s per 100 km; Pn ${f2(100 * (1 / v2 - 1 / V))} s per 100 km`);
}

// =============================================================================================
// Figure 4: travel times through the whole Earth
// =============================================================================================

function figGlobal() {
  const tt = JSON.parse(fs.readFileSync(new URL('data/tt-iasp91-38km.json', import.meta.url), 'utf8'));
  const table = JSON.parse(fs.readFileSync(new URL('../../docs/app/data/traveltimes-iasp91.json', import.meta.url), 'utf8'));
  const c = tt.curves;
  const R = tt.earthRadiusKm;
  const kmPerDeg = (Math.PI * R) / 180;

  // Sand Point M7.3 at SGU, picked as in tools/quake-explorer/answer-key.mjs
  const sp = loadSample('qe-sand-point');
  const st = sp.stations.find((x) => x.sta === 'SGU');
  const deg = distanceDeg(sp.event.lat, sp.event.lon, st.lat, st.lon);
  const pred = bodyWaveTimes(table, deg, sp.event.depthKm);
  const dec = (raw) => { const d = decimate(raw.data, raw.sampleRate, 5); return { ...raw, data: d.data, sampleRate: d.sampleRate }; };
  const z = dec(sp.traces.find((t) => t.sta === 'SGU' && t.cha.endsWith('Z')));
  const startSec = (z.startMs - sp.event.timeMs) / 1000;
  const pPick = aicPick(filteredData(z, { lo: 0.5, hi: 2 }), z.sampleRate, startSec, pred.P - 60, pred.P + 30);
  const sPicks = ['N', 'E'].map((comp) => {
    const hz = dec(sp.traces.find((t) => t.sta === 'SGU' && t.cha.endsWith(comp)));
    return { cha: hz.cha, ...aicPick(filteredData(hz, { lo: 0.05, hi: 0.5 }), hz.sampleRate, startSec, pred.S - 60, pred.S + 30) };
  });

  const W = 760;
  const plotL = 64;
  const plotR = 716;
  const top = 64;
  const DEG1 = 180;
  const MIN1 = 30;
  const plotH = 540;
  const x = (sec) => plotL + (sec / 60 / MIN1) * (plotR - plotL);
  const y = (d) => top + (d / DEG1) * plotH;
  const bottom = top + plotH;
  const Hpx = bottom + 50;
  const sh0 = 103;
  const sh1 = 142;
  if (!inPShadow(sh0) || !inPShadow(sh1)) throw new Error('shadow zone limits changed in teleseism.js');
  const turn = tt.rays.find((r) => Math.abs(r.deg - 35.8) < 0.01);

  const desc = `Travel-time curves for P and S waves through the whole Earth (iasp91 model, quake ${tt.depthKm} km deep): distance `
    + `from 0 to 180 degrees runs down the page and minutes after the quake across. Both curves bend: they get steeper with `
    + `distance, because the waves that reach far stations dive deeper into faster rock. A grey dashed straight line shows a wave `
    + `that kept a steady 8 km/s. Direct P stops at about 98 degrees; a weak wave bent around the core (Pdiff) continues, and the `
    + `band from ${sh0} to ${sh1} degrees is the P shadow zone. Waves through the core (PKP) arrive beyond it. Direct S stops near `
    + `100 degrees. A line at ${f1(deg)} degrees marks station SGU for the 2025 Sand Point, Alaska M7.3 quake: P predicted at `
    + `${mmss(pred.P)} and picked at ${mmss(pPick.tSec)}; S predicted at ${mmss(pred.S)} and picked at about ${mmss(sPicks[0].tSec)}. `
    + `An inset shows the Earth to scale with P ray paths curving through the mantle, one to SGU reaching ${turn.turnDepthKm} km deep, `
    + 'and one through the core.';
  const defs = marker('arrow-dark', C.note);
  const out = open(W, Hpx, 'Far away: travel times through the whole Earth', desc, defs);

  // shadow zone band
  out.push(`<rect x="${plotL}" y="${r1(y(sh0))}" width="${plotR - plotL}" height="${r1(y(sh1) - y(sh0))}" fill="${COL.shade}"/>`);
  // grid
  for (let mn = 0; mn <= MIN1; mn += 5) {
    out.push(line(x(mn * 60), top, x(mn * 60), bottom, C.grid));
    out.push(text(x(mn * 60), bottom + 17, String(mn), { size: 12, fill: C.muted, anchor: 'middle' }));
  }
  for (let d = 0; d <= DEG1; d += 30) {
    out.push(line(plotL, y(d), plotR, y(d), C.grid));
    out.push(text(plotL - 7, y(d) + 4, `${d}°`, { size: 12, fill: C.muted, anchor: 'end' }));
  }
  out.push(`<rect x="${plotL}" y="${top}" width="${plotR - plotL}" height="${plotH}" fill="none" stroke="${C.border}"/>`);
  out.push(text((plotL + plotR) / 2, bottom + 36, 'minutes after the quake', { size: 12, fill: C.muted, anchor: 'middle' }));
  out.push(text(14, top - 12, `distance ↓ (1° ≈ ${Math.round(kmPerDeg)} km)`, { size: 12, fill: C.muted }));
  out.push(text(plotL + 10, y(sh0) + 20, `P shadow zone, ${sh0}°–${sh1}°:`, { size: 12.5, weight: 700, fill: C.muted }));
  out.push(text(plotL + 10, y(sh0) + 36, 'the core is in the way', { size: 12.5, weight: 600, fill: C.muted }));

  // steady 8 km/s, for comparison
  {
    const secAt = (d) => (d * kmPerDeg) / 8;
    const dEnd = Math.min(DEG1, (MIN1 * 60 * 8) / kmPerDeg);
    out.push(polyline([[x(0), y(0)], [x(secAt(dEnd)), y(dEnd)]], COL.faint, 1.6, 'stroke-dasharray="6 5"'));
    const lx = x(secAt(121));
    out.push(text(lx - 9, y(121) + 4, 'a steady 8 km/s,', { size: 12.5, weight: 600, fill: C.muted, anchor: 'end', halo: true }));
    out.push(text(lx - 9, y(121) + 19, 'for comparison', { size: 12.5, weight: 600, fill: C.muted, anchor: 'end', halo: true }));
  }

  // curves
  const pts = (arr, d0, d1) => {
    const o = [];
    for (let d = d0; d <= d1; d++) if (arr[d] != null && arr[d] <= MIN1 * 60) o.push([x(arr[d]), y(d)]);
    return o;
  };
  const lastOf = (arr) => { let k = -1; arr.forEach((v, i) => { if (v != null) k = i; }); return k; };
  const firstOf = (arr) => arr.findIndex((v) => v != null);
  const pEnd = lastOf(c.P);
  const sEnd = lastOf(c.S);
  const kStart = firstOf(c.PKIKP);
  out.push(polyline(pts(c.P, 0, pEnd), C.p, 2.4));
  out.push(polyline([...pts(c.P, pEnd, pEnd), ...pts(c.Pdiff, pEnd + 1, 135)], C.p, 1.3, 'stroke-dasharray="3 4"'));
  out.push(polyline(pts(c.PKIKP, kStart, sh1), C.p, 1.3, 'stroke-dasharray="3 4"'));
  out.push(polyline(pts(c.PKIKP, sh1, DEG1), C.p, 2.4));
  out.push(polyline(pts(c.S, 0, sEnd), C.s, 2.4));
  // labels
  out.push(text(x(c.P[45]) - 10, y(45) + 4, 'P', { size: 15, weight: 700, fill: C.p, anchor: 'end', halo: true }));
  out.push(text(x(c.S[80]) + 10, y(80) + 4, 'S', { size: 15, weight: 700, fill: C.s, halo: true }));
  out.push(text(x(c.S[sEnd]) - 14, y(sEnd) + 18, `direct S stops near ${Math.round(sEnd / 10) * 10}°:`, { size: 12.5, weight: 600, fill: C.s, anchor: 'end', halo: true }));
  out.push(text(x(c.S[sEnd]) - 14, y(sEnd) + 33, 'it can’t cross the liquid core', { size: 12.5, weight: 600, fill: C.s, anchor: 'end', halo: true }));
  out.push(text(x(c.Pdiff[132]) + 8, y(132) + 4, 'Pdiff: weak, bent around the core', { size: 12.5, weight: 600, fill: C.p, halo: true }));
  out.push(text(x(c.PKIKP[165]) + 10, y(165) + 4, 'PKP: through the core', { size: 12.5, weight: 700, fill: C.p, halo: true }));

  // Sand Point at SGU: model times on the curves; the numbers in the free space below the P curve
  {
    const yy = y(deg);
    out.push(line(plotL, yy, x(pred.S) + 6, yy, C.note, 1, 'stroke-dasharray="2 3"'));
    out.push(dot(x(pred.P), yy, C.p, 4));
    out.push(dot(x(pred.S), yy, C.s, 4));
    out.push(text(plotL + 6, yy - 6, `SGU, ${f1(deg)}°`, { size: 12.5, weight: 700, halo: true }));
    const bx = plotL + 10;
    const by = y(67);
    out.push(text(bx, by, 'Sand Point, Alaska M7.3', { size: 12.5, weight: 700 }));
    out.push(text(bx, by + 16, `recorded at SGU (${f1(deg)}°):`, { size: 12.5, weight: 700 }));
    out.push(text(bx, by + 34, `P: model ${mmss(pred.P)}, picked ${mmss(pPick.tSec)}`, { size: 12.5, fill: C.p, weight: 600 }));
    out.push(text(bx, by + 50, `S: model ${mmss(pred.S)}, picked about ${mmss(sPicks[0].tSec)}`, { size: 12.5, fill: C.s, weight: 600 }));
  }

  // inset: the Earth to scale with a few ray paths
  {
    const rpx = 84;
    const cx = 612;
    const cy = top + 18 + rpx;
    const P2 = (dDeg, depth) => {
      const a = (dDeg * Math.PI) / 180;
      const r = (rpx * (R - depth)) / R;
      return [cx + r * Math.sin(a), cy - r * Math.cos(a)];
    };
    out.push(`<circle cx="${cx}" cy="${r1(cy)}" r="${rpx + 26}" fill="${C.bg}" opacity="0.9"/>`);
    out.push(`<circle cx="${cx}" cy="${r1(cy)}" r="${rpx}" fill="${COL.crust}" stroke="${COL.ground}" stroke-width="1.2"/>`);
    out.push(`<circle cx="${cx}" cy="${r1(cy)}" r="${r1((rpx * (R - tt.cmbKm)) / R)}" fill="${COL.core}" stroke="${COL.ground}" stroke-width="1"/>`);
    out.push(`<circle cx="${cx}" cy="${r1(cy)}" r="${r1((rpx * (R - tt.iocbKm)) / R)}" fill="${COL.inner}" stroke="${COL.ground}" stroke-width="1"/>`);
    // shadow zone on the surface
    const [ax, ay] = P2(sh0, -7);
    const [bx2, by2] = P2(sh1, -7);
    out.push(`<path d="M${r1(ax)} ${r1(ay)}A${rpx + 7} ${rpx + 7} 0 0 1 ${r1(bx2)} ${r1(by2)}" fill="none" stroke="${C.muted}" stroke-width="5" stroke-opacity="0.45"/>`);
    for (const ray of tt.rays) {
      const main = Math.abs(ray.deg - 35.8) < 0.01;
      const core = ray.phase !== 'P';
      out.push(polyline(ray.pts.map(([dd, zz]) => P2(dd, zz)), C.p, main ? 2.2 : 1.2, core ? 'stroke-dasharray="3 3"' : ''));
    }
    out.push(star(cx, cy - rpx, 7, 3, 5));
    const [sx, sy] = P2(35.8, 0);
    out.push(triangle(sx + 2, sy + 1, '#374151', 5));
    out.push(text(sx + 9, sy - 2, 'SGU', { size: 11.5, weight: 700, halo: true }));
    out.push(text(cx, cy + 34, 'liquid core', { size: 11, weight: 600, fill: C.muted, anchor: 'middle', halo: COL.core }));
    const [lx, ly] = P2(122, -12);
    out.push(text(lx + 6, ly + 10, 'shadow', { size: 11.5, weight: 600, fill: C.muted, halo: true }));
    out.push(text(cx - rpx - 18, cy - rpx - 6, 'Inside the Earth,', { size: 12, weight: 700, anchor: 'end' }));
    out.push(text(cx - rpx - 18, cy - rpx + 9, 'to scale', { size: 12, weight: 700, anchor: 'end' }));
    out.push(text(cx - rpx - 18, cy - rpx + 26, 'P rays curve', { size: 12, fill: C.muted, anchor: 'end' }));
    out.push(text(cx - rpx - 18, cy - rpx + 41, 'back up', { size: 12, fill: C.muted, anchor: 'end' }));
  }
  save('tt-global.svg', out);

  // numbers for the page
  let maxDiff = 0;
  for (let d = 1; d <= pEnd; d++) maxDiff = Math.max(maxDiff, Math.abs(c.P[d] - bodyWaveTimes(table, d, tt.depthKm).P));
  console.log(`  whole Earth (iasp91, ${tt.depthKm} km deep): direct P to ${pEnd}°, direct S to ${sEnd}°, PKIKP from ${kStart}°; `
    + `core-mantle boundary ${tt.cmbKm} km, inner core ${tt.iocbKm} km; cache vs app table (P, 1–${pEnd}°): max ${f2(maxDiff)} s`);
  console.log(`    iasp91 speeds [P, S] km/s: Moho (${tt.mohoKm} km) ${tt.speedsKmS.aboveMoho} -> ${tt.speedsKmS.belowMoho}; core-mantle boundary ${tt.speedsKmS.aboveCmb} -> ${tt.speedsKmS.belowCmb}`);
  for (const d of [10, 20, 36, 60, 90]) {
    const slope = (c.P[d + 1] - c.P[d - 1]) / 2; // s per degree
    console.log(`    P at ${d}°: ${mmss(c.P[d])}  slope ${f2(slope)} s/° -> ${f1(kmPerDeg / slope)} km/s along the surface; steady 8 km/s would take ${mmss((d * kmPerDeg) / 8)}`);
  }
  console.log(`    steady 8 km/s to SGU (${f1(deg)}°) would take ${mmss((deg * kmPerDeg) / 8)}`);
  for (const r of tt.rays) console.log(`    ray ${r.phase} to ${r.deg}°: ${mmss(r.timeSec)}, deepest ${r.turnDepthKm} km`);
  console.log(`    Sand Point (${sp.event.id}, depth ${sp.event.depthKm} km) at SGU: ${f2(deg)}° (${Math.round(st.distKm)} km), elevation ${st.elevM} m`);
  console.log(`      P: iasp91 ${mmss(pred.P)} (${f1(pred.P)} s, ${pred.Pphase}); computer pick ${mmss(pPick.tSec)} (${f1(pPick.tSec)} s, SNR ${pPick.snr.toFixed(0)}); late by ${f1(pPick.tSec - pred.P)} s`);
  for (const sp2 of sPicks) console.log(`      S on ${sp2.cha}: iasp91 ${mmss(pred.S)} (${f1(pred.S)} s); computer pick ${mmss(sp2.tSec)} (${f1(sp2.tSec)} s, SNR ${sp2.snr.toFixed(1)}); late by ${f1(sp2.tSec - pred.S)} s`);
  console.log(`      elevation: ${st.elevM} m of rock at 6 km/s straight up = ${f2(st.elevM / 1000 / 6)} s`);
}

console.log('Travel-times figures');
figJunction();
const magna = magnaModel();
figRayPaths(magna);
figMagna(magna);
figGlobal();
