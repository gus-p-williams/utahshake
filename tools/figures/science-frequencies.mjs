// Make the real-data figures for the "Frequencies, fading and sound" page
// (docs/theory/frequencies.md), from the Quake Explorer offline samples.
//
//   node tools/figures/science-frequencies.mjs            all figures
//   node tools/figures/science-frequencies.mjs steps far  only some (names below)
//
//   freq-spectrogram-steps.svg  How a spectrogram is made: three 2.56 s windows of station MTPU's
//                               record (Junction M3.3), each window's spectrum turned on its side,
//                               and the spectrogram those columns build.
//   freq-near-far.svg           High notes fade first: spectra at the nearest (MTPU, 29 km) and the
//                               farthest station (BGU, 299 km), each scaled to the same low notes; then the
//                               high/low ratio at all 24 stations.
//   freq-distance.svg           Peak ground speed against distance (log-log) for the Junction
//                               quake, with the fitted line and the slopes spreading alone gives.
//   freq-blast-quake.svg        Quarry blast and earthquake near Leamington at station SUU: P/S
//                               peaks and high/low ratios.
//
// Node only, no network: reads docs/app/data/samples/qe-* (event.json, stations.json with
// sensitivity, picks.json, computer-picks.json, waveforms.mseed) and uses the app's own
// modules (miniSEED parser, 1–20 Hz filter, lib/spectral.js, lib/units.js), so the numbers
// match what students see in Quake Explorer. Output is deterministic (same bytes every run).
// No credit text in the images: the page captions carry it. Prints every number the page uses.
import fs from 'node:fs';
import { C, r1, figure } from './svg-traces.mjs';
import { card, png, stack, text, viridis, viridisHex } from './svg-charts.mjs';

const { parseMiniseed } = await import('../../docs/app/js/data/mseed.js');
const { filteredData } = await import('../../docs/app/js/data/filters.js');
const { picksByStation } = await import('../../docs/app/js/lib/fdsn.js');
const { amplitudeSpectrum, stft, dbRange, STFT_PRESETS } = await import('../../docs/app/js/lib/spectral.js');
const { peakAbs } = await import('../../docs/app/js/lib/signal.js');
const { toVelocity } = await import('../../docs/app/js/lib/units.js');

const outDir = new URL('../../docs/theory/img/', import.meta.url);
fs.mkdirSync(outDir, { recursive: true });
const only = process.argv.slice(2);
const MINUS = '−';
const EN = '–';
const W = 760;
// Series colours: the first slots of the dataviz reference palette (checked for colour-blind
// readers); every line is also labelled.
const SERIES = ['#2a78d6', '#eb6834'];
const HIGH = [8, 20]; // "high notes" band, Hz (as in tools/quake-explorer/answer-key.mjs)
const LOW = [1, 5];   // "low notes" band, Hz

function write(name, svg) {
  fs.writeFileSync(new URL(name, outDir), svg + '\n');
  console.log(`wrote docs/theory/img/${name} (${(svg.length / 1024).toFixed(0)} KB)`);
}
const line = (x1, y1, x2, y2, stroke, width = 1, extra = '') =>
  `<line x1="${r1(x1)}" y1="${r1(y1)}" x2="${r1(x2)}" y2="${r1(y2)}" stroke="${stroke}" stroke-width="${width}"${extra ? ' ' + extra : ''}/>`;
const fmt = (v, d = 2) => v.toFixed(d);

// ---------------------------------------------------------------------------------------------
// Samples

/** An offline sample: event, stations, picks (analyst, by NET.STA), computer picks, traces. */
function loadSample(dir) {
  const base = new URL(`../../docs/app/data/samples/${dir}/`, import.meta.url);
  const j = (f) => JSON.parse(fs.readFileSync(new URL(f, base), 'utf8'));
  const sample = j('sample.json');
  const event = j('event.json');
  const buf = fs.readFileSync(new URL('waveforms.mseed', base));
  const fromMs = event.timeMs - sample.window.preSec * 1000;
  const toMs = event.timeMs + sample.window.postSec * 1000;
  return {
    dir, sample, event, stations: j('stations.json'), picks: picksByStation(j('picks.json')), computer: j('computer-picks.json'),
    traces: parseMiniseed(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.length), { fromMs, toMs }),
  };
}

/**
 * One station's vertical record and its arrival times (seconds after the origin): analyst
 * picks first, else computer picks; S, if neither, from S − P at 6.1 and 3.45 km/s
 * (the same rule as tools/quake-explorer/answer-key.mjs).
 */
function station(s, sta) {
  const st = s.stations.find((x) => x.sta === sta);
  const ch = st.channels[0];
  const tr = s.traces.find((t) => t.sta === sta && t.cha === ch.cha);
  const sec = (ms) => (ms == null ? null : (ms - s.event.timeMs) / 1000);
  const a = s.picks[`${st.net}.${sta}`] || {};
  const comp = (ph) => s.computer.find((p) => p.sta === sta && p.phase === ph)?.timeMs;
  const p = sec(a.P ?? comp('P'));
  const sPick = sec(a.S ?? comp('S'));
  const S = sPick ?? p + st.distKm / 3.45 - st.distKm / 6.1;
  return { st, ch, tr, km: st.distKm, p, s: S, pWho: a.P != null ? 'analyst' : 'computer', sWho: a.S != null ? 'analyst' : sPick != null ? 'computer' : 'estimate' };
}
/** Sample index of a time (seconds after the origin) in a trace. */
const idx = (s, tr, sec) => Math.round(((s.event.timeMs + sec * 1000 - tr.startMs) / 1000) * tr.sampleRate);

const median = (a) => { const s = [...a].sort((x, y) => x - y); const m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };

/** Mean of amp over freqs in [a, b]. */
function bandMean(sp, [a, b]) {
  let sum = 0;
  let n = 0;
  sp.freqs.forEach((f, k) => { if (f >= a && f <= b) { sum += sp.amp[k]; n++; } });
  return sum / n;
}

/**
 * Notes in a quake record, measured as Quake Explorer's check does (notesAt in
 * docs/app/js/quake-explorer/inv-b.js, and tools/quake-explorer/answer-key.mjs): amplitude
 * spectrum of the 1–20 Hz filtered vertical record over the whole quake, from 0.5 s before P
 * to 15 s after S (as tools/quake-explorer/blast-check.mjs), and high/low = mean 8–20 Hz /
 * mean 1–5 Hz. For comparison, ratioToP25 stops 25 s after P, which cuts off S at far stations.
 */
function notes(s, sta) {
  const r = station(s, sta);
  const y = filteredData(r.tr, { lo: 1, hi: 20 });
  const sp = amplitudeSpectrum(y.subarray(idx(s, r.tr, r.p - 0.5), idx(s, r.tr, r.s + 15)), r.tr.sampleRate);
  const sp2 = amplitudeSpectrum(y.subarray(idx(s, r.tr, r.p - 0.5), idx(s, r.tr, r.p + 25)), r.tr.sampleRate);
  return { ...r, y, sp, ratio: bandMean(sp, HIGH) / bandMean(sp, LOW), ratioToP25: bandMean(sp2, HIGH) / bandMean(sp2, LOW) };
}

// ---------------------------------------------------------------------------------------------
// Spectrogram image: a PNG drawn at display size (blocky: one box per window and frequency step)

/**
 * spec: stft() result; times are relative to t0Sec (seconds after the origin of data[0]).
 * Returns an <image> element covering [x0, x0 + w] × [y0, y0 + h] for times fromSec..toSec and
 * frequencies 0..fMax (linear, up). Columns are drawn hop wide, centred on their window's centre.
 */
function spectrogramImage(spec, t0Sec, { x0, y0, w, h, fromSec, toSec, fMax, lo, hi }) {
  const W2 = Math.round(w);
  const H2 = Math.round(h);
  const rgb = new Uint8Array(W2 * H2 * 3);
  const hopSec = spec.hop / spec.sampleRate;
  for (let px = 0; px < W2; px++) {
    const t = fromSec + ((px + 0.5) / W2) * (toSec - fromSec);
    const c = Math.round((t - t0Sec - spec.times[0]) / hopSec);
    for (let py = 0; py < H2; py++) {
      const f = fMax * (1 - (py + 0.5) / H2);
      const k = Math.round(f / spec.df - spec.freqs[0] / spec.df);
      const o = (py * W2 + px) * 3;
      const v = c >= 0 && c < spec.nT && k >= 0 && k < spec.nF ? spec.power[c * spec.nF + k] : NaN;
      if (!Number.isFinite(v)) { rgb.set([230, 232, 236], o); continue; }
      rgb.set(viridis((v - lo) / (hi - lo)), o);
    }
  }
  return `<image x="${r1(x0)}" y="${r1(y0)}" width="${W2}" height="${H2}" preserveAspectRatio="none" href="data:image/png;base64,${png(W2, H2, rgb).toString('base64')}"/>`;
}

/** Colour bar row: "weak [■■■■] strong" with a lead text. */
function colourBar(out, x, y, lead) {
  out.push(text(x, y + 11, lead, { size: 12.5 }));
  const bx = x + 8 + lead.length * 6.6;
  out.push(text(bx - 6, y + 11, 'weak', { size: 12, fill: C.muted, anchor: 'end' }));
  for (let i = 0; i < 60; i++) out.push(`<rect x="${r1(bx + i * 3)}" y="${y}" width="3.2" height="12" fill="${viridisHex(i / 59)}"/>`);
  out.push(text(bx + 188, y + 11, 'strong', { size: 12, fill: C.muted }));
}

// ---------------------------------------------------------------------------------------------
// 1. How a spectrogram is made (MTPU, Junction)
function steps() {
  const s = loadSample('qe-junction');
  const r = station(s, 'MTPU');
  const tr = r.tr;
  const sr = tr.sampleRate;
  const preset = STFT_PRESETS.local;
  // The record from the origin onwards (10 s of it before the plot starts), mean removed by stft.
  const i0 = idx(s, tr, -8);
  const data = tr.data.subarray(i0, idx(s, tr, 40));
  const t0 = -8;
  const spec = stft(data, sr, preset);
  const fromSec = -4;
  const toSec = 30;
  const visible = [];
  for (let c = 0; c < spec.nT; c++) {
    const t = t0 + spec.times[c];
    if (t >= fromSec && t <= toSec) for (let k = 0; k < spec.nF; k++) visible.push(spec.power[c * spec.nF + k]);
  }
  const { lo, hi } = dbRange(visible);
  const winSec = spec.nwin / sr;
  const hopSec = spec.hop / sr;
  // Three example windows (columns): before P, on P, on S. Pick the columns whose centres are
  // nearest the times below.
  const col = (t) => Math.round((t - t0 - spec.times[0]) / hopSec);
  const ex = [
    { c: col(-2), label: '1', what: 'before P: noise' },
    { c: col(r.p + 1.4), label: '2', what: 'P' },
    { c: col(r.s + 1.4), label: '3', what: 'S' },
  ].map((e) => ({ ...e, t: t0 + spec.times[e.c] }));
  // First column with clearly more than the noise, near P (for the "starts before P" note).
  const noiseDb = (c) => { let m = -Infinity; for (let k = 0; k < spec.nF; k++) m = Math.max(m, spec.power[c * spec.nF + k]); return m; };
  const quiet = noiseDb(ex[0].c);
  const firstAbove = (db) => { let c = col(r.p - 3); while (noiseDb(c) < quiet + db) c++; return t0 + spec.times[c]; };
  const firstT = firstAbove(10);
  console.log(`steps: first column above the noise by 3/6/10/20 dB centred ${[3, 6, 10, 20].map((d) => (r.p - firstAbove(d)).toFixed(2)).join('/')} s before P`);
  for (const e of ex) {
    let kMax = 0;
    for (let k = 1; k < spec.nF; k++) if (spec.power[e.c * spec.nF + k] > spec.power[e.c * spec.nF + kMax]) kMax = k;
    console.log(`steps: window ${e.label} (${e.what}, ${(e.t - winSec / 2).toFixed(2)} to ${(e.t + winSec / 2).toFixed(2)} s): strongest note ${spec.freqs[kMax].toFixed(1)} Hz`);
  }
  console.log(`steps: MTPU ${r.km.toFixed(1)} km, P ${r.p.toFixed(2)} s (${r.pWho}), S ${r.s.toFixed(2)} s (${r.sWho}); ` +
    `window ${winSec} s (${spec.nwin} samples), step ${hopSec.toFixed(2)} s, ${spec.df.toFixed(3)} Hz per row, up to ${preset.fMax} Hz; ` +
    `columns at ${ex.map((e) => e.t.toFixed(2)).join(', ')} s; dB range ${lo.toFixed(0)} to ${hi.toFixed(0)}; ` +
    `first column 10 dB above the noise centred at ${firstT.toFixed(2)} s (${(r.p - firstT).toFixed(2)} s before the P pick)`);

  // Card 1: the record, with the three windows
  const raw = { label: '', startMs: tr.startMs, sampleRate: sr, data: filteredData(tr, {}) };
  const traceCard = figure({
    traces: [raw], originMs: s.event.timeMs, fromSec, toSec, width: W, trackH: 110, top: 58,
    title: `Step 1: cut the record into short windows (${winSec} s each, a new one every ${hopSec.toFixed(2)} s)`,
    bands: ex.map((e, n) => ({ from: e.t - winSec / 2, to: e.t + winSec / 2, fill: 'rgba(91,100,114,0.12)', stroke: C.muted,
      label: `${e.label}: ${e.what}`, where: n === 0 ? 'after' : undefined })),
    marks: [{ sec: r.p, color: C.p, label: 'P', side: 'left' }, { sec: r.s, color: C.s, label: 'S' }],
  });

  // Card 2: each window's spectrum, turned on its side (frequency up, strength across)
  const padL = 10;
  const gap = 14;
  const pw = (W - 2 * padL - 2 * gap) / 3;
  const top = 34;
  const ph = 150;
  const fMax = preset.fMax;
  const c2 = card(W, top + ph + 52, 'Step 2: find the notes in each window (its spectrum, turned on its side)');
  ex.forEach((e, n) => {
    const x0 = padL + n * (pw + gap);
    const axL = x0 + 40;
    const axR = x0 + pw - 6;
    const y = (f) => top + 8 + (1 - f / fMax) * ph;
    c2.push(`<rect x="${r1(axL)}" y="${r1(y(fMax))}" width="${r1(axR - axL)}" height="${ph}" fill="none" stroke="${C.border}"/>`);
    for (const f of [0, 5, 10, 15, 20, 25]) {
      c2.push(line(axL - 4, y(f), axL, y(f), C.muted));
      c2.push(text(axL - 6, y(f) + 4, `${f}`, { size: 12, fill: C.muted, anchor: 'end' }));
    }
    c2.push(text(x0 + 2, y(fMax) - 1, 'Hz', { size: 12, fill: C.muted }));
    // bars: length and colour both show strength (dB above the bottom of the colour scale)
    const rowH = (ph * spec.df) / fMax;
    for (let k = 0; k < spec.nF; k++) {
      const v = spec.power[e.c * spec.nF + k];
      const u = Math.max(0, Math.min(1, (v - lo) / (hi - lo)));
      const bw = u * (axR - axL - 2);
      if (bw < 0.5) continue;
      c2.push(`<rect x="${r1(axL + 1)}" y="${r1(y(spec.freqs[k]) - rowH / 2)}" width="${r1(bw)}" height="${r1(rowH)}" fill="${viridisHex(u)}"/>`);
    }
    c2.push(text(axL + 6, y(fMax) + 16, `${e.label}: ${e.what}`, { size: 13, weight: 700, halo: true }));
    c2.push(text((axL + axR) / 2, top + ph + 26, 'weak → strong', { size: 12, fill: C.muted, anchor: 'middle' }));
  });
  c2.push(text(padL + 2, top + ph + 46, 'Each bar is one frequency: its length and its colour both show how strong that note is in the window.', { size: 12.5 }));
  c2.push('</svg>');

  // Card 3: the spectrogram, with the three columns outlined
  const sTop = 50;
  const sh = 190;
  const sx0 = padL;
  const sw = W - 2 * padL;
  const xs = (t) => sx0 + ((t - fromSec) / (toSec - fromSec)) * sw;
  const ys = (f) => sTop + (1 - f / fMax) * sh;
  const c3 = card(W, sTop + sh + 76, 'Step 3: colour each spectrum in and stand them side by side');
  c3.push(spectrogramImage(spec, t0, { x0: sx0, y0: sTop, w: sw, h: sh, fromSec, toSec, fMax, lo, hi }));
  c3.push(`<rect x="${sx0}" y="${sTop}" width="${sw}" height="${sh}" fill="none" stroke="${C.border}"/>`);
  for (const f of [5, 10, 15, 20]) {
    c3.push(line(sx0 + sw - 6, ys(f), sx0 + sw, ys(f), '#ffffff'));
    c3.push(text(sx0 + sw - 9, ys(f) + 4, `${f} Hz`, { size: 12, weight: 600, fill: '#ffffff', anchor: 'end' }));
  }
  // P and S picks: dashed lines over the image
  for (const [t, color, label, anchor] of [[r.p, C.p, 'P pick', 'end'], [r.s, C.s, 'S pick', 'start']]) {
    c3.push(line(xs(t), sTop - 12, xs(t), sTop, color, 2));
    c3.push(line(xs(t), sTop, xs(t), sTop + sh, '#ffffff', 1.6, 'stroke-dasharray="5 4"'));
    c3.push(text(xs(t) + (anchor === 'end' ? -4 : 4), sTop - 3, label, { size: 12.5, weight: 700, fill: color, anchor }));
  }
  for (const e of ex) {
    const xa = xs(e.t - hopSec / 2);
    const xb = xs(e.t + hopSec / 2);
    c3.push(`<rect x="${r1(xa)}" y="${sTop + 1}" width="${r1(xb - xa)}" height="${sh - 2}" fill="none" stroke="#ffffff" stroke-width="2"/>`);
    c3.push(text((xa + xb) / 2, sTop + 16, e.label, { size: 13, weight: 700, fill: '#ffffff', anchor: 'middle' }));
  }
  // the colour starts a little before the P pick
  const ny = ys(13);
  c3.push(`<path d="M${r1(xs(firstT) - 40)} ${r1(ny)}L${r1(xs(firstT) - 2)} ${r1(ny)}" stroke="#ffffff" stroke-width="1.6" marker-end="url(#tip)"/>`);
  c3.push(text(xs(firstT) - 46, ny - 3, 'colour starts', { size: 12.5, weight: 700, fill: '#ffffff', anchor: 'end' }));
  c3.push(text(xs(firstT) - 46, ny + 13, 'before the P pick', { size: 12.5, weight: 700, fill: '#ffffff', anchor: 'end' }));
  c3.splice(1, 0, `<defs><marker id="tip" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill="#ffffff"/></marker></defs>`);
  for (let t = 0; t <= toSec; t += 5) {
    c3.push(text(xs(t), sTop + sh + 16, String(t), { size: 12, fill: C.muted, anchor: 'middle' }));
  }
  c3.push(text(W - padL - 2, sTop + sh + 32, 'seconds after the quake', { size: 12, fill: C.muted, anchor: 'end' }));
  colourBar(c3, padL + 2, sTop + sh + 46, 'Colour: how strong each note is.');
  c3.push('</svg>');
  write('freq-spectrogram-steps.svg', stack([traceCard, c2.join('\n'), c3.join('\n')]));
}

// ---------------------------------------------------------------------------------------------
// 2. Near and far: high notes fade first (Junction)
function far() {
  const s = loadSample('qe-junction');
  const all = s.stations.map((st) => notes(s, st.sta)).sort((a, b) => a.km - b.km);
  // the nearest and the farthest station, as Quake Explorer's check compares (both broadband)
  const pair = [all[0], all.at(-1)];
  const sgu = all.find((n) => n.st.sta === 'SGU');
  console.log('far: high/low (8–20 Hz / 1–5 Hz, 1–20 Hz filter) from P − 0.5 s to S + 15 s [and to P + 25 s]:');
  for (const n of all) {
    console.log(`  ${n.st.sta.padEnd(5)} ${n.km.toFixed(0).padStart(4)} km  ${n.ch.cha}  ${fmt(n.ratio, 3)}  [${fmt(n.ratioToP25, 3)}]  ` +
      `(P ${n.p.toFixed(1)} s ${n.pWho}, S ${n.s.toFixed(1)} s ${n.sWho})`);
  }
  const lr = (rows, f) => {
    const xs = rows.map((n) => n.km);
    const ys = rows.map((n) => Math.log10(f(n)));
    const mx = xs.reduce((a, b) => a + b) / xs.length;
    const my = ys.reduce((a, b) => a + b) / ys.length;
    return xs.reduce((acc, x, i) => acc + (x - mx) * (ys[i] - my), 0) / xs.reduce((acc, x) => acc + (x - mx) ** 2, 0);
  };
  const slope = lr(all, (n) => n.ratio);
  const below = all.filter((n) => n.km > 200);
  console.log(`  trend (least squares, log10 ratio vs km, all ${all.length}): ×${(10 ** (100 * slope)).toFixed(2)} per 100 km; ` +
    `median within 50 km ${fmt(median(all.filter((n) => n.km <= 50).map((n) => n.ratio)), 2)}, beyond 200 km ${fmt(median(below.map((n) => n.ratio)), 2)} (${below.length} stations)`);

  // Card 1: the two spectra, each divided by its own 1–5 Hz mean, smoothed over ±1/20 decade
  const padL = 58;
  const padR = 190;
  const top = 40;
  const h = 250;
  const w = W - padL - padR;
  const f0 = 1;
  const f1 = 20;
  const a0 = 0.01;
  const a1 = 3;
  const x = (f) => padL + (Math.log10(f / f0) / Math.log10(f1 / f0)) * w;
  const y = (a) => top + (Math.log10(a1 / a) / Math.log10(a1 / a0)) * h;
  const c1 = card(W, top + h + 44, 'The nearest and the farthest station, the same quake: the notes each one recorded');
  for (const [band, label] of [[LOW, 'low notes'], [HIGH, 'high notes']]) {
    c1.push(`<rect x="${r1(x(band[0]))}" y="${top}" width="${r1(x(band[1]) - x(band[0]))}" height="${h}" fill="rgba(91,100,114,0.08)"/>`);
    c1.push(text((x(band[0]) + x(band[1])) / 2, top + 16, `${label}: ${band[0]}${EN}${band[1]} Hz`, { size: 12.5, weight: 600, fill: C.muted, anchor: 'middle' }));
  }
  for (const f of [1, 2, 3, 5, 10, 20]) {
    c1.push(line(x(f), top, x(f), top + h, C.grid));
    c1.push(text(x(f), top + h + 17, String(f), { size: 12, fill: C.muted, anchor: 'middle' }));
  }
  for (const a of [0.01, 0.1, 1]) {
    c1.push(line(padL, y(a), padL + w, y(a), C.grid));
    c1.push(text(padL - 6, y(a) + 4, String(a), { size: 12, fill: C.muted, anchor: 'end' }));
  }
  c1.push(`<rect x="${padL}" y="${top}" width="${w}" height="${h}" fill="none" stroke="${C.border}"/>`);
  c1.push(text(padL + w, top + h + 34, 'frequency (Hz)', { size: 12, fill: C.muted, anchor: 'end' }));
  c1.push(`<text transform="translate(16 ${r1(top + h / 2)}) rotate(-90)" font-size="12" text-anchor="middle" fill="${C.muted}">strength (low notes = 1)</text>`);
  const ends = [];
  pair.forEach((n, i) => {
    const low = bandMean(n.sp, LOW);
    const pts = [];
    for (let k = 0; k < n.sp.freqs.length; k++) {
      const f = n.sp.freqs[k];
      if (f < f0 || f > f1) continue;
      // smoothed: mean over f / 10^0.05 .. f * 10^0.05
      let sum = 0;
      let m = 0;
      for (let j = 0; j < n.sp.freqs.length; j++) {
        const g = n.sp.freqs[j];
        if (g >= f / 10 ** 0.05 && g <= f * 10 ** 0.05) { sum += n.sp.amp[j]; m++; }
      }
      pts.push([x(f), y(Math.max(a0, sum / m / low))]);
    }
    c1.push(`<path d="M${pts.map(([px, py]) => `${r1(px)} ${r1(py)}`).join('L')}" fill="none" stroke="${SERIES[i]}" stroke-width="2.2" stroke-linejoin="round"/>`);
    ends.push({ y: pts.at(-1)[1], n, i });
  });
  // direct labels at the right end, nudged apart and kept inside the card
  ends.sort((a, b) => a.y - b.y);
  for (let k = 1; k < ends.length; k++) ends[k].y = Math.max(ends[k].y, ends[k - 1].y + 40);
  const shift = Math.max(0, ends.at(-1).y - (top + h - 14));
  for (const e of ends) {
    const lx = padL + w + 10;
    const ly = e.y - shift;
    c1.push(`<rect x="${lx}" y="${r1(ly - 9)}" width="14" height="4" rx="2" fill="${SERIES[e.i]}"/>`);
    c1.push(text(lx + 20, ly - 3, `${e.n.st.sta}, ${Math.round(e.n.km)} km away`, { size: 13, weight: 700 }));
    c1.push(text(lx + 20, ly + 13, `high/low = ${fmt(e.n.ratio)}`, { size: 12.5, fill: C.muted }));
  }
  c1.push(text(padL + w + 10, top + 30, 'Each curve is divided', { size: 12, fill: C.muted }));
  c1.push(text(padL + w + 10, top + 45, 'by its own low notes,', { size: 12, fill: C.muted }));
  c1.push(text(padL + w + 10, top + 60, 'so both start near 1.', { size: 12, fill: C.muted }));
  c1.push('</svg>');

  // Card 2: the high/low ratio at every station
  const top2 = 40;
  const h2 = 210;
  const pl = 58;
  const pr = 24;
  const w2 = W - pl - pr;
  const k1 = 300;
  const b0 = 0.01;
  const b1 = 3;
  const x2 = (km) => pl + (km / k1) * w2;
  const y2 = (v) => top2 + (Math.log10(b1 / v) / Math.log10(b1 / b0)) * h2;
  const c2 = card(W, top2 + h2 + 50, `High/low ratio at all ${all.length} stations`);
  for (const km of [0, 50, 100, 150, 200, 250, 300]) {
    c2.push(line(x2(km), top2, x2(km), top2 + h2, C.grid));
    c2.push(text(x2(km), top2 + h2 + 17, String(km), { size: 12, fill: C.muted, anchor: 'middle' }));
  }
  for (const v of [0.01, 0.1, 1]) {
    c2.push(line(pl, y2(v), pl + w2, y2(v), C.grid));
    c2.push(text(pl - 6, y2(v) + 4, String(v), { size: 12, fill: C.muted, anchor: 'end' }));
  }
  c2.push(`<rect x="${pl}" y="${top2}" width="${w2}" height="${h2}" fill="none" stroke="${C.border}"/>`);
  c2.push(text(pl + w2, top2 + h2 + 34, 'distance from the quake (km)', { size: 12, fill: C.muted, anchor: 'end' }));
  c2.push(`<text transform="translate(16 ${r1(top2 + h2 / 2)}) rotate(-90)" font-size="12" text-anchor="middle" fill="${C.muted}">high/low ratio</text>`);
  for (const n of all) {
    const i = pair.indexOf(n);
    if (i >= 0) continue;
    c2.push(`<circle cx="${r1(x2(n.km))}" cy="${r1(y2(n.ratio))}" r="4.5" fill="#9aa1ac" stroke="${C.bg}" stroke-width="1.5"/>`);
  }
  for (const [i, n] of pair.entries()) {
    c2.push(`<circle cx="${r1(x2(n.km))}" cy="${r1(y2(n.ratio))}" r="6" fill="${SERIES[i]}" stroke="${C.bg}" stroke-width="2"/>`);
    const right = x2(n.km) > pl + w2 - 60;
    c2.push(text(x2(n.km) + (right ? -9 : 9), y2(n.ratio) + 16, n.st.sta, { size: 12.5, weight: 700, anchor: right ? 'end' : 'start', halo: true }));
  }
  c2.push(text(x2(sgu.km) + 8, y2(sgu.ratio) + 4, 'SGU', { size: 12, weight: 600, fill: C.muted, halo: true }));
  // the stations far above the rest: the rock under them lets high notes through
  for (const sta of ['FOR1', 'SZCU', 'SUU']) {
    const n = all.find((m) => m.st.sta === sta);
    c2.push(text(x2(n.km) + 8, y2(n.ratio) + 4, sta, { size: 12, fill: C.muted, halo: true }));
  }
  c2.push('</svg>');
  write('freq-near-far.svg', stack([c1.join('\n'), c2.join('\n')]));
}

// ---------------------------------------------------------------------------------------------
// 3. Peak ground speed against distance (Junction)
function distance() {
  const s = loadSample('qe-junction');
  // As tools/quake-explorer/answer-key.mjs: vertical channel, 1–10 Hz, counts -> m/s, peak.
  const rows = [];
  for (const st of s.stations) {
    const ch = st.channels[0];
    const tr = s.traces.find((t) => t.sta === st.sta && t.cha === ch.cha);
    const v = toVelocity(filteredData(tr, { lo: 1, hi: 10 }), ch);
    if (v && !ch.clipped) rows.push({ sta: st.sta, km: st.distKm, pgv: peakAbs(v.data), approx: v.approx, schools: st.schools || [] });
  }
  const xs = rows.map((r) => Math.log10(r.km));
  const ys = rows.map((r) => Math.log10(r.pgv));
  const mx = xs.reduce((a, b) => a + b) / xs.length;
  const my = ys.reduce((a, b) => a + b) / ys.length;
  const b = xs.reduce((acc, x, i) => acc + (x - mx) * (ys[i] - my), 0) / xs.reduce((acc, x) => acc + (x - mx) ** 2, 0);
  const a = my - b * mx;
  const spread = Math.sqrt(rows.reduce((acc, r, i) => acc + (ys[i] - a - b * xs[i]) ** 2, 0) / rows.length);
  const fit = (km) => 10 ** (a + b * Math.log10(km));
  const um = (mps) => mps * 1e6;
  console.log(`distance: ${rows.length} stations; peak ground speed falls as distance^${b.toFixed(2)}, scatter ×${(10 ** spread).toFixed(1)}; ` +
    `line at 30 km ${um(fit(30)).toFixed(1)} µm/s, at 300 km ${um(fit(300)).toFixed(2)} µm/s (×${(fit(30) / fit(300)).toFixed(0)}); ` +
    `doubling the distance: ×${(2 ** b).toFixed(2)}`);
  for (const r of rows) console.log(`  ${r.sta.padEnd(5)} ${r.km.toFixed(0).padStart(4)} km  ${um(r.pgv).toFixed(2).padStart(7)} µm/s${r.approx ? ' (approx: metadata in m)' : ''}${r.schools.length ? '  stand-in: ' + r.schools.join(', ') : ''}`);

  const padL = 64;
  const padR = 24;
  const top = 84;
  const h = 330;
  const w = W - padL - padR;
  const k0 = 20;
  const k1 = 400;
  const v0 = 0.3;
  const v1 = 300;
  const x = (km) => padL + (Math.log10(km / k0) / Math.log10(k1 / k0)) * w;
  const y = (v) => top + (Math.log10(v1 / v) / Math.log10(v1 / v0)) * h;
  const out = card(W, top + h + 92, 'How fast the ground moved at each station (Junction quake, magnitude 3.3)');
  for (const km of [20, 30, 50, 100, 200, 300, 400]) {
    out.push(line(x(km), top, x(km), top + h, C.grid));
    out.push(text(x(km), top + h + 17, String(km), { size: 12, fill: C.muted, anchor: 'middle' }));
  }
  for (const v of [0.3, 1, 3, 10, 30, 100, 300]) {
    out.push(line(padL, y(v), padL + w, y(v), C.grid));
    out.push(text(padL - 6, y(v) + 4, String(v), { size: 12, fill: C.muted, anchor: 'end' }));
  }
  out.push(`<rect x="${padL}" y="${top}" width="${w}" height="${h}" fill="none" stroke="${C.border}"/>`);
  out.push(text(padL + w, top + h + 34, 'distance from the quake (km, log scale)', { size: 12, fill: C.muted, anchor: 'end' }));
  out.push(`<text transform="translate(18 ${r1(top + h / 2)}) rotate(-90)" font-size="12" text-anchor="middle" fill="${C.muted}">peak ground speed (µm/s, log scale)</text>`);
  // spreading-only slopes, from the fitted line's value at 30 km
  const at = 30;
  const ref = um(fit(at));
  const DASH = { '-1': '7 5', '-0.5': '2 4' };
  const refLine = (p, label) => {
    out.push(line(x(at), y(ref), x(k1), y(ref * (k1 / at) ** p), C.muted, 1.6, `stroke-dasharray="${DASH[p]}"`));
    out.push(text(x(k1) - 4, y(ref * (k1 / at) ** p) - 7, label, { size: 12.5, weight: 700, fill: C.muted, anchor: 'end', halo: true }));
  };
  refLine(-0.5, '1/√r');
  refLine(-1, '1/r');
  // fitted line
  out.push(line(x(k0 + 5), y(um(fit(k0 + 5))), x(k1), y(um(fit(k1))), C.s, 2.4));
  // the stations
  for (const r of rows) {
    const cx = x(r.km);
    const cy = y(um(r.pgv));
    out.push(r.approx
      ? `<circle cx="${r1(cx)}" cy="${r1(cy)}" r="4.5" fill="${C.bg}" stroke="${C.trace}" stroke-width="1.8"/>`
      : `<circle cx="${r1(cx)}" cy="${r1(cy)}" r="5" fill="${C.trace}" stroke="${C.bg}" stroke-width="1.5"/>`);
  }
  // labels: the two nearest stations and the school stand-ins (code only; the schools are in the footer)
  const LABEL = { MTPU: [8, 4, 'start'], TCRU: [8, 4, 'start'], WCU: [-8, 4, 'end'], SGU: [0, -10, 'middle'],
    TMU: [0, 18, 'middle'], ELU: [8, 4, 'start'], SUU: [8, 4, 'start'] };
  for (const r of rows) {
    const L = LABEL[r.sta];
    if (L) out.push(text(x(r.km) + L[0], y(um(r.pgv)) + L[1], r.sta, { size: 12.5, weight: 700, anchor: L[2], halo: true }));
  }
  // legend (top): markers, then lines
  const ly = 46;
  out.push(`<circle cx="${padL + 6}" cy="${ly - 4}" r="5" fill="${C.trace}"/>`);
  out.push(text(padL + 16, ly, 'a station (sensor gives m/s)', { size: 12, fill: C.muted }));
  out.push(`<circle cx="${padL + 206}" cy="${ly - 4}" r="4.5" fill="${C.bg}" stroke="${C.trace}" stroke-width="1.8"/>`);
  out.push(text(padL + 216, ly, 'older sensor (its numbers are in m: converted, roughly)', { size: 12, fill: C.muted }));
  const ly2 = 66;
  out.push(line(padL, ly2 - 4, padL + 22, ly2 - 4, C.s, 2.4));
  out.push(`<text x="${padL + 28}" y="${ly2}" font-size="12" fill="${C.muted}">this quake: falls as distance<tspan dy="-5" font-size="10">${MINUS}${Math.abs(b).toFixed(1)}</tspan></text>`);
  out.push(line(padL + 270, ly2 - 4, padL + 292, ly2 - 4, C.muted, 1.6, `stroke-dasharray="${DASH['-1']}"`));
  out.push(text(padL + 298, ly2, 'spreading alone: 1/r', { size: 12, fill: C.muted }));
  out.push(line(padL + 440, ly2 - 4, padL + 462, ly2 - 4, C.muted, 1.6, `stroke-dasharray="${DASH['-0.5']}"`));
  out.push(text(padL + 468, ly2, 'spreading alone: 1/√r', { size: 12, fill: C.muted }));
  const stand = rows.filter((r) => r.schools.length).sort((p, q) => p.km - q.km)
    .map((r) => `${r.sta} ${r.schools[0].replace(/ High School$/, '')}`).join(', ');
  out.push(text(padL, top + h + 56, `Vertical sensors, filtered 1${EN}10 Hz. 1 µm/s is a thousandth of a millimetre per second.`, { size: 12.5 }));
  out.push(text(padL, top + h + 76, `School stand-ins: ${stand}.`, { size: 12.5 }));
  out.push('</svg>');
  write('freq-distance.svg', out.join('\n'));
}

// ---------------------------------------------------------------------------------------------
// 4. Quarry blast and earthquake near Leamington, at SUU (the Juab stand-in)
function blast() {
  const cards = [];
  const res = [];
  for (const [dir, what] of [['qe-leamington-blast', 'Quarry blast'], ['qe-leamington-quake', 'Earthquake']]) {
    const s = loadSample(dir);
    const n = notes(s, 'SUU');
    // P/S as in answer-key.mjs: peak in the 2 s after P / peak in the 4 s after S, 1–20 Hz
    const pAmp = peakAbs(n.y, idx(s, n.tr, n.p), idx(s, n.tr, n.p + 2));
    const sAmp = peakAbs(n.y, idx(s, n.tr, n.s), idx(s, n.tr, n.s + 4));
    const local = new Date(s.event.timeMs).toLocaleString('en-US', { timeZone: 'America/Denver', weekday: 'long', hour: 'numeric', minute: '2-digit' })
      .replace(' AM', ' am').replace(' PM', ' pm');
    res.push({ what, n, ps: pAmp / sAmp, local, s });
    console.log(`blast: ${dir} ${s.event.id} M${s.event.mag} depth ${s.event.depthKm} km, ${local}; SUU ${n.km.toFixed(1)} km: ` +
      `P ${n.p.toFixed(2)} s (${n.pWho}), S ${n.s.toFixed(2)} s (${n.sWho}); P/S ${fmt(pAmp / sAmp)}; high/low ${fmt(n.ratio)}`);
  }
  for (const r of res) {
    const tr = { label: 'SUU EHZ, 1–20 Hz', startMs: r.n.tr.startMs, sampleRate: r.n.tr.sampleRate, data: r.n.y,
      rightLabel: `P/S ${fmt(r.ps)} · high/low ${fmt(r.n.ratio)}` };
    cards.push(figure({
      traces: [tr], originMs: r.s.event.timeMs, fromSec: -2, toSec: 40, width: W, trackH: 120, top: 58,
      axisLabel: `seconds after the ${r.what === 'Quarry blast' ? 'blast' : 'quake'}`,
      title: `${r.what}, magnitude ${r.s.event.mag.toFixed(1)}, ${Math.round(r.n.km)} km from SUU (${r.local})`,
      bands: [
        { from: r.n.p, to: r.n.p + 2, fill: 'rgba(29,78,216,0.12)', label: 'P: 2 s', labelColor: C.p, where: 'before' },
        { from: r.n.s, to: r.n.s + 4, fill: 'rgba(192,38,45,0.12)', label: 'S: 4 s', labelColor: C.s, where: 'after' },
      ],
      marks: [{ sec: r.n.p, color: C.p, label: 'P', side: 'left' }, { sec: r.n.s, color: C.s, label: r.n.sWho === 'estimate' ? 'S (expected)' : 'S' }],
    }));
  }
  write('freq-blast-quake.svg', stack(cards));
}

const ALL = { steps, far, distance, blast };
for (const [name, fn] of Object.entries(ALL)) if (!only.length || only.includes(name)) fn();
