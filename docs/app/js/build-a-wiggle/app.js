// Build a Wiggle: an app with its own guide (apps/build-a-wiggle.md), also embedded on the
// "Frequencies, fading and sound" page.
//
// Three sine waves, each with a frequency and a size slider. The page draws each wave
// thin, their sum bold (the wiggle a seismometer would record), and the spectrum of the
// sum, computed with the same FFT as Quake Explorer (lib/spectral.js). The spectrum
// finds the waves again: one bar per wave, as tall as its size. That is Fourier's idea,
// and it is how a spectrogram (one spectrum per short window) is made.
//
// Options: noise (hundreds of tiny waves at every frequency, so a little of every note)
// and a 1–10 Hz filter (keeps only the waves inside the band: "keep these notes").
// Examples set the sliders; "Far quake" is "Near quake" after 60 s of travel through
// Utah's crust, faded with lib/wiggle.js fadeAfter (Q from Benz et al. 1997).
// No real data and nothing moves on its own, so there is nothing to pause.
import { RECORD, wiggleAt, sampleWiggle, noiseWaves, inBand, fadeAfter } from '../lib/wiggle.js';
import { amplitudeSpectrum } from '../lib/spectral.js';
import { setupEmbed, followDocsTheme } from '../ui/page.js';

const $ = (id) => document.getElementById(id);
const BAND = [1, 10];          // the filter keeps 1–10 Hz, like Quake Locator's default
const F_SHOW = 25;             // spectrum shown up to 25 Hz (as Quake Explorer's spectrogram)
const NOISE = noiseWaves();    // ~400 tiny waves, 0.5–25 Hz; the same every time
const N = 3;

// Examples. Sizes are on the 0.05 slider steps.
const NEAR = [[2, 0.6], [6, 0.6], [14, 0.6]];
const FAR_SEC = 60;            // about 200 km at 3.5 km/s
const step05 = (v) => Math.max(0.05, Math.round(v / 0.05) * 0.05);
const PRESETS = [
  { name: 'Two notes', waves: [[2, 0.8], [8, 0.3], [15, 0]],
    say: 'Two notes: a slow 2 Hz wave with a smaller, quicker 8 Hz wave riding on it. The spectrum has two bars.' },
  { name: 'Ocean hum + quake', waves: [[0.5, 1], [4, 0.3], [8, 0.2]],
    say: 'A big slow wave, like the ocean hum (the real hum is even slower, about 0.2 Hz), with a small quake on top. Tick the filter: the hum goes, the quake stays.' },
  { name: 'Near quake', waves: NEAR,
    say: 'A quake close by: low, middle and high notes all strong. The sum is sharp and spiky.' },
  { name: 'Far quake', waves: NEAR.map(([f, a]) => [f, step05(a * fadeAfter(f, FAR_SEC))]),
    say: `The same three notes after ${FAR_SEC} s (about 200 km) of travel through Utah's crust. Every note is weaker, and the high note lost the most. The sum is smaller and smoother.` },
  { name: 'Beats', waves: [[5, 0.5], [5.5, 0.5], [12, 0]],
    say: 'Two notes only 0.5 Hz apart. The sum grows and shrinks every 2 s, yet the spectrum shows two steady notes.' },
  { name: 'Square-ish', waves: [[1, 0.8], [3, 0.25], [5, 0.15]],
    say: "Notes at 1, 3 and 5 Hz, each smaller than the last: the sum starts to look square. Adding more odd notes makes it squarer still (Fourier's idea, 1807)." },
];

const state = { waves: PRESETS[0].waves.map(([freq, size]) => ({ freq, size })), noise: false, filter: false };

function css(name, fallback) {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fallback;
}
function colors() {
  return {
    bg: css('--trace-bg', '#fff'), text: css('--text', '#111827'), muted: css('--muted', '#5b6472'),
    grid: css('--grid', '#e8ebef'), border: css('--border', '#d9dde3'), accent: css('--accent', '#1d4ed8'),
    waves: [css('--w1', '#2a78d6'), css('--w2', '#eb6834'), css('--w3', '#1baf7a')],
  };
}
/** '#rrggbb' -> 'rgba(r, g, b, a)'. */
function rgba(hex, a) {
  const n = parseInt(hex.replace('#', '').slice(0, 6), 16);
  if (Number.isNaN(n)) return `rgba(128, 128, 128, ${a})`;
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${a})`;
}

const kept = (w) => w.size > 0 && (!state.filter || inBand(w.freq, BAND));
const keptNoise = () => (state.noise ? NOISE.filter((w) => !state.filter || inBand(w.freq, BAND)) : []);
const fmtHz = (f) => `${f} Hz`;
const fmtSize = (a) => (a > 0 ? a.toFixed(2) : 'off');

// ---------------------------------------------------------------------------
// Numbers: what the FFT sees (16 s at 128 samples/s) and the sum over the window drawn

const noiseCache = new Map();
/** Noise samples for the FFT record (filtered or not), made once each. */
function noiseSamples() {
  const key = String(state.filter);
  if (!noiseCache.has(key)) noiseCache.set(key, sampleWiggle(keptNoise()));
  return noiseCache.get(key);
}

/** Spectrum of the sum (amplitudeSpectrum, no taper: every wave is a whole number of cycles). */
function spectrumOfSum() {
  const y = sampleWiggle(state.waves.filter(kept));
  if (state.noise) { const z = noiseSamples(); for (let i = 0; i < y.length; i++) y[i] += z[i]; }
  return amplitudeSpectrum(y, RECORD.sampleRate, { taper: 'none' });
}

// ---------------------------------------------------------------------------
// Drawing

function fitCanvas(c) {
  const dpr = window.devicePixelRatio || 1;
  const w = Math.max(50, c.clientWidth);
  const h = Math.max(50, c.clientHeight);
  if (c.width !== Math.round(w * dpr) || c.height !== Math.round(h * dpr)) {
    c.width = Math.round(w * dpr);
    c.height = Math.round(h * dpr);
  }
  const ctx = c.getContext('2d');
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  return { ctx, w, h };
}

function haloText(ctx, s, x, y, color, bg) {
  ctx.lineWidth = 4;
  ctx.lineJoin = 'round';
  ctx.strokeStyle = bg;
  ctx.strokeText(s, x, y);
  ctx.fillStyle = color;
  ctx.fillText(s, x, y);
}

/** One wiggle along a lane: f(t) for t in [0, T], scaled by pxPerUnit about y0. */
function plotCurve(ctx, f, X, T, y0, pxPerUnit, x0, x1) {
  const steps = Math.max(2, Math.round((x1 - x0) * 2));
  ctx.beginPath();
  for (let i = 0; i <= steps; i++) {
    const t = (i / steps) * T;
    const y = y0 - f(t) * pxPerUnit;
    if (i) ctx.lineTo(X(t), y); else ctx.moveTo(X(t), y);
  }
  ctx.stroke();
}

const noiseCurveCache = new Map();
/** The noise's values at the points plotCurve uses (cached: ~400 waves is slow-ish). */
function noiseCurve(T, x0, x1) {
  const steps = Math.max(2, Math.round((x1 - x0) * 2));
  const key = `${T}|${steps}|${state.filter}`;
  if (!noiseCurveCache.has(key)) {
    const waves = keptNoise();
    noiseCurveCache.set(key, Float64Array.from({ length: steps + 1 }, (_, i) => wiggleAt((i / steps) * T, waves)));
  }
  const v = noiseCurveCache.get(key);
  return (t) => v[Math.round((t / T) * steps)];
}

function drawWaves() {
  const { ctx, w, h } = fitCanvas($('waves'));
  const col = colors();
  ctx.fillStyle = col.bg;
  ctx.fillRect(0, 0, w, h);
  const T = w < 520 ? 3 : 4;           // seconds shown
  const padL = 8;
  const padR = 8;
  const axisH = 20;
  const x0 = padL;
  const x1 = w - padR;
  const X = (t) => x0 + (t / T) * (x1 - x0);
  const lanes = state.waves.map((wv, i) => ({ kind: 'wave', i, wv }));
  if (state.noise) lanes.push({ kind: 'noise' });
  const plotH = h - axisH - 4;
  const sumH = Math.max(70, plotH * 0.4);
  const laneH = (plotH - sumH) / lanes.length;

  // time grid
  ctx.strokeStyle = col.grid;
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let t = 0; t <= T; t++) { const gx = Math.round(X(t)) + 0.5; ctx.moveTo(gx, 2); ctx.lineTo(gx, plotH); }
  ctx.stroke();

  const noiseF = state.noise ? noiseCurve(T, x0, x1) : null;
  ctx.font = '600 12px system-ui, sans-serif';
  ctx.textBaseline = 'top';
  ctx.textAlign = 'left';
  lanes.forEach((ln, k) => {
    const top = 2 + k * laneH;
    const y0 = top + laneH / 2 + 4;
    const amp = laneH / 2 - 5;           // px for size 1
    if (ln.kind === 'noise') {
      ctx.strokeStyle = col.muted;
      ctx.lineWidth = 1;
      plotCurve(ctx, noiseF, X, T, y0, amp, x0, x1);
      haloText(ctx, state.filter ? 'Noise, 1–10 Hz part (hundreds of tiny waves)' : 'Noise (hundreds of tiny waves)', x0 + 4, top + 2, col.muted, col.bg);
      return;
    }
    const { wv, i } = ln;
    const on = wv.size > 0;
    const cut = on && !kept(wv);
    ctx.strokeStyle = on ? (cut ? rgba(col.waves[i], 0.3) : col.waves[i]) : col.muted;
    ctx.lineWidth = 1.5;
    if (!on) ctx.setLineDash([2, 4]);
    plotCurve(ctx, (t) => wiggleAt(t, [wv]), X, T, y0, amp, x0, x1);
    ctx.setLineDash([]);
    const label = `Wave ${i + 1}: ${fmtHz(wv.freq)}, ${on ? `size ${fmtSize(wv.size)}` : 'off'}${cut ? ' (removed by the filter)' : ''}`;
    haloText(ctx, label, x0 + 4, top + 2, on && !cut ? col.text : col.muted, col.bg);
  });

  // the sum, bold
  const sTop = 2 + lanes.length * laneH;
  ctx.strokeStyle = col.border;
  ctx.beginPath(); ctx.moveTo(x0, Math.round(sTop) + 0.5); ctx.lineTo(x1, Math.round(sTop) + 0.5); ctx.stroke();
  const waves = state.waves.filter(kept);
  const sumF = (t) => wiggleAt(t, waves) + (noiseF ? noiseF(t) : 0);
  let peak = 0;
  for (let i = 0; i <= 400; i++) peak = Math.max(peak, Math.abs(sumF((i / 400) * T)));
  const scale = Math.max(1, peak * 1.05);  // px scale: size 1 fills the lane, bigger sums shrink to fit
  const sAmp = (sumH / 2 - 8) / scale;
  const sy0 = sTop + sumH / 2 + 6;
  ctx.strokeStyle = col.text;
  ctx.lineWidth = 2.4;
  ctx.lineJoin = 'round';
  plotCurve(ctx, sumF, X, T, sy0, sAmp, x0, x1);
  ctx.font = 'bold 13px system-ui, sans-serif';
  const sumLabel = w < 420 ? 'Sum: the wiggle' : 'Sum of the waves: the wiggle a seismometer records';
  haloText(ctx, sumLabel, x0 + 4, sTop + 4, col.text, col.bg);
  ctx.font = '12px system-ui, sans-serif';
  ctx.textAlign = 'right';
  haloText(ctx, `biggest swing ${peak.toFixed(2)}`, x1 - 4, sTop + 5, col.muted, col.bg);

  // time axis
  ctx.textAlign = 'center';
  ctx.fillStyle = col.muted;
  for (let t = 0; t <= T; t++) ctx.fillText(String(t), Math.min(Math.max(X(t), x0 + 4), x1 - 4), plotH + 5);
  ctx.textAlign = 'right';
  ctx.fillText('seconds', x1 - 14, plotH + 5);
  return peak;
}

function drawSpectrum(sp) {
  const { ctx, w, h } = fitCanvas($('spec'));
  const col = colors();
  ctx.fillStyle = col.bg;
  ctx.fillRect(0, 0, w, h);
  const padL = 30;
  const padR = 12;
  const top = 42;
  const axisH = 22;
  const x0 = padL;
  const x1 = w - padR;
  const yb = h - axisH;
  let peak = 0;
  for (let k = 0; k < sp.amp.length && sp.freqs[k] <= F_SHOW; k++) peak = Math.max(peak, sp.amp[k]);
  const yMax = Math.max(1, Math.ceil(peak * 4) / 4);
  const X = (f) => x0 + (f / F_SHOW) * (x1 - x0);
  const Y = (a) => yb - (a / yMax) * (yb - top);

  // the filter's band
  if (state.filter) {
    ctx.fillStyle = rgba(col.accent, 0.12);
    ctx.fillRect(X(BAND[0]), top - 4, X(BAND[1]) - X(BAND[0]), yb - top + 4);
    ctx.strokeStyle = rgba(col.accent, 0.55);
    ctx.setLineDash([4, 3]);
    ctx.strokeRect(Math.round(X(BAND[0])) + 0.5, top - 4.5, Math.round(X(BAND[1]) - X(BAND[0])), yb - top + 4);
    ctx.setLineDash([]);
  }
  // grid and axes
  ctx.strokeStyle = col.grid;
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let a = 0.5; a <= yMax + 1e-9; a += 0.5) { const gy = Math.round(Y(a)) + 0.5; ctx.moveTo(x0, gy); ctx.lineTo(x1, gy); }
  for (let f = 5; f <= F_SHOW; f += 5) { const gx = Math.round(X(f)) + 0.5; ctx.moveTo(gx, top); ctx.lineTo(gx, yb); }
  ctx.stroke();
  ctx.strokeStyle = col.muted;
  ctx.beginPath(); ctx.moveTo(x0, yb + 0.5); ctx.lineTo(x1, yb + 0.5); ctx.stroke();
  ctx.font = '12px system-ui, sans-serif';
  ctx.fillStyle = col.muted;
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'right';
  for (let a = 0; a <= yMax + 1e-9; a += 0.5) ctx.fillText(a ? String(a) : '0', x0 - 5, Y(a));
  ctx.textBaseline = 'top';
  ctx.textAlign = 'center';
  for (let f = 0; f <= F_SHOW; f += 5) ctx.fillText(String(f), Math.min(X(f), x1 - 8), yb + 5);
  ctx.textAlign = 'right';
  ctx.fillText('frequency (Hz)', x1, yb - 14 < top ? yb + 5 : yb - 14);

  // bars: noise first (thin, grey), then the waves (wide, in their colours)
  const pxPerBin = (X(sp.df) - X(0));
  ctx.fillStyle = col.muted;
  const waveBins = new Map();
  state.waves.forEach((wv, i) => { const k = Math.round(wv.freq / sp.df); if (kept(wv) && !waveBins.has(k)) waveBins.set(k, i); });
  for (let k = 1; k < sp.amp.length && sp.freqs[k] <= F_SHOW; k++) {
    if (sp.amp[k] < 1e-3 || waveBins.has(k)) continue;
    ctx.fillRect(X(sp.freqs[k]) - pxPerBin / 2, Y(sp.amp[k]), Math.max(1, pxPerBin), yb - Y(sp.amp[k]));
  }
  // The noise is hundreds of bars, each tiny: point at them. The pointer goes where the label
  // clears the waves' bars and their labels (at 7.5 Hz with the filter, 18 Hz without, when
  // that is free); if every spot has a bar under the label, it is lifted above the lowest one.
  if (state.noise) {
    const text = 'noise: a tiny bit of every note';
    ctx.font = '12px system-ui, sans-serif';
    const half = ctx.measureText(text).width / 2 + 4;
    const usual = state.filter ? 7.5 : 18;
    const [lo, hi] = state.filter ? BAND : [1, F_SHOW];
    const bars = [...waveBins.keys()].map((k) => ({ x: X(sp.freqs[k]), top: Y(sp.amp[k]) - 20 })); // bar and its label
    let at = { f: usual, lx: Math.min(X(usual), x1 - half), y: yb - 25, score: -Infinity };
    for (let f = lo + 0.25; f < hi; f += 0.25) {
      if (bars.some((b) => Math.abs(b.x - X(f)) < 8)) continue;
      const lx = Math.min(Math.max(X(f), x0 + half), x1 - half);
      const y = Math.min(yb - 25, ...bars.filter((b) => Math.abs(b.x - lx) < half + 4).map((b) => b.top - 2));
      const score = y - Math.abs(f - usual) * 0.01; // the lowest spot; ties go to the usual one
      if (y - 14 >= top && score > at.score) at = { f, lx, y, score };
    }
    ctx.strokeStyle = col.muted;
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(X(at.f), at.y + 1); ctx.lineTo(X(at.f), yb - 5); ctx.stroke();
    ctx.textBaseline = 'bottom';
    ctx.textAlign = 'center';
    haloText(ctx, text, at.lx, at.y, col.muted, col.bg);
  }
  const labels = [];
  for (const [k, i] of [...waveBins].sort((a, b) => a[0] - b[0])) {
    const a = sp.amp[k];
    const bx = X(sp.freqs[k]);
    ctx.fillStyle = col.waves[i];
    const bw = 5;
    const by = Y(a);
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(bx - bw / 2, by, bw, yb - by, [2, 2, 0, 0]); else ctx.rect(bx - bw / 2, by, bw, yb - by);
    ctx.fill();
    labels.push({ x: bx, y: by, text: fmtHz(sp.freqs[k]) });
  }
  // frequency labels over the bars, lifted when two are close
  ctx.font = '600 12px system-ui, sans-serif';
  ctx.textBaseline = 'bottom';
  ctx.textAlign = 'center';
  let last = null;
  for (const lb of labels) {
    let y = lb.y - 3;
    if (last && lb.x - last.x < ctx.measureText(lb.text).width + 6 && Math.abs(y - last.y) < 14) y = last.y - 14;
    const x = Math.min(Math.max(lb.x, x0 + 18), x1 - 18);
    haloText(ctx, lb.text, x, Math.max(top - 2, y), col.text, col.bg);
    last = { x: lb.x, y: Math.max(top - 2, y) };
  }
  // title and key
  ctx.textBaseline = 'top';
  ctx.textAlign = 'left';
  ctx.font = 'bold 13px system-ui, sans-serif';
  haloText(ctx, w < 420 ? 'Spectrum of the sum' : 'Spectrum of the sum (the FFT finds the waves)', 8, 5, col.text, col.bg);
  ctx.font = '12px system-ui, sans-serif';
  ctx.textAlign = 'right';
  const key = [state.filter ? 'shaded: kept by the filter' : '', state.noise ? 'gray: noise' : ''].filter(Boolean).join(' · ');
  if (key) haloText(ctx, key, x1, 6, col.muted, col.bg);
  ctx.textAlign = 'left';
  haloText(ctx, 'size', 4, 22, col.muted, col.bg);
}

function describe(peak, sp) {
  const on = state.waves.filter((wv) => wv.size > 0);
  const k = on.filter(kept);
  const cut = on.filter((wv) => !kept(wv));
  const list = (ws) => ws.map((wv) => `${fmtHz(wv.freq)} (size ${fmtSize(wv.size)})`).join(', ');
  const parts = [k.length ? `The sum of ${list(k)}${state.noise ? ', plus noise' : ''}.` : (state.noise ? 'Noise only.' : 'All waves are off.')];
  if (cut.length) parts.push(`The filter removed ${list(cut)}.`);
  parts.push(`Biggest swing ${peak.toFixed(2)}.`);
  const bars = [...new Set(k.map((wv) => wv.freq))].sort((a, b) => a - b);
  const tall = bars.map((f) => `${fmtHz(f)}: ${sp.amp[Math.round(f / sp.df)].toFixed(2)}`).join(', ');
  $('waves').setAttribute('aria-label', `${parts[0]} Each wave is drawn thin, the sum bold.`);
  $('spec').setAttribute('aria-label', bars.length
    ? `Spectrum of the sum: bars at ${tall}${state.noise ? ', and a low carpet of noise at every frequency' : ''}.`
    : 'Spectrum of the sum: no bars.');
  return parts.join(' ');
}

// ---------------------------------------------------------------------------
// Controls

let pending = 0;
// The line under the controls: an example's explanation until the next change, then a
// description of what is on screen (read out by screen readers, a moment after a change).
let message = 'Move a slider, or try an example. Each thin line is one sine wave; the bold line is their sum.';
let logTimer = 0;
function draw() {
  pending = 0;
  const sp = spectrumOfSum();
  const peak = drawWaves();
  drawSpectrum(sp);
  const text = message ?? describe(peak, sp);
  if (message) describe(peak, sp); // keeps the canvases' descriptions current
  clearTimeout(logTimer);
  logTimer = setTimeout(() => { if ($('log').textContent !== text) $('log').textContent = text; }, 250);
}
const redraw = () => { if (!pending) pending = requestAnimationFrame(draw); };
/** A change made by the student: describe the result instead of the last message. */
const changed = () => { message = null; redraw(); };

function syncControls() {
  state.waves.forEach((wv, i) => {
    $(`f${i}`).value = String(wv.freq);
    $(`a${i}`).value = String(wv.size);
    showValues(i);
  });
  $('noise').checked = state.noise;
  $('filter').checked = state.filter;
}

function showValues(i) {
  const wv = state.waves[i];
  $(`f${i}-out`).textContent = fmtHz(wv.freq);
  $(`a${i}-out`).textContent = fmtSize(wv.size);
  $(`f${i}`).setAttribute('aria-valuetext', `${wv.freq} hertz`);
  $(`a${i}`).setAttribute('aria-valuetext', wv.size > 0 ? `size ${wv.size.toFixed(2)}` : 'off');
  const card = $(`wave-${i}`);
  const cut = wv.size > 0 && !kept(wv);
  card.classList.toggle('off', wv.size === 0);
  card.classList.toggle('cut', cut);
  card.querySelector('.note').textContent = wv.size === 0 ? ' · off' : cut ? ' · removed by the filter' : '';
}

function init() {
  setupEmbed();
  for (let i = 0; i < N; i++) {
    const note = document.createElement('span');
    note.className = 'note';
    $(`wave-${i}-name`).append(note);
    for (const [id, key] of [[`f${i}`, 'freq'], [`a${i}`, 'size']]) {
      $(id).addEventListener('input', (e) => {
        state.waves[i][key] = Number(e.target.value);
        showValues(i);
        changed();
      });
    }
  }
  $('noise').addEventListener('change', (e) => { state.noise = e.target.checked; changed(); });
  $('filter').addEventListener('change', (e) => {
    state.filter = e.target.checked;
    for (let i = 0; i < N; i++) showValues(i);
    changed();
  });
  for (const p of PRESETS) {
    const b = document.createElement('button');
    b.type = 'button';
    b.textContent = p.name;
    b.addEventListener('click', () => {
      state.waves = p.waves.map(([freq, size]) => ({ freq, size }));
      syncControls();
      message = p.say;
      redraw();
    });
    $('presets').append(b);
  }
  syncControls();
  new ResizeObserver(redraw).observe($('waves-box'));
  new ResizeObserver(redraw).observe($('spec-box'));
  matchMedia('(prefers-color-scheme: dark)').addEventListener('change', redraw);
  followDocsTheme(redraw);
  draw();
}

init();
