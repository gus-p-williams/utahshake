// "How small a shake can it see?" on Reading a seismogram (docs/theory/img/phone-steps.svg): a smooth
// made-up shake and the same shake as a phone's browser reports it, 60 readings a second, each
// rounded to the nearest 0.1 m/s² (as Chrome does). Three panels:
//   1. a firm tap (0.3 m/s²): it comes through, in steps;
//   2. a small shake (0.04 m/s²) with the resting reading in the middle of a step: it vanishes;
//   3. the same shake resting near the edge of a step: the reading flickers between two steps,
//      a little even before the shake (sensor noise), as most phones do on at least one axis.
// Made-up waves, no data; the noise is seeded, so the figure comes out the same every time.
//
//   node tools/figures/phone-steps-figure.mjs
import fs from 'node:fs';
import { C, r1 } from './svg-traces.mjs';
import { card, text } from './svg-charts.mjs';
import { makeRng } from '../../docs/app/js/lib/bench.js';

const STEP = 0.1; // m/s², Chrome's rounding
const RATE = 60; // readings a second
const SECONDS = 2;
const W = 760;
const LEFT = 70;
const RIGHT = W - 16;
const TRUE_COLOR = '#2a78d6';
const READ_COLOR = '#c2410c';

const round = (v) => Math.round(v / STEP) * STEP;
/** The shake: starts at t0, dies away. */
const shake = (amp, f = 4, t0 = 0.45, tau = 0.4) => (t) => (t < t0 ? 0 : amp * Math.exp(-(t - t0) / tau) * Math.sin(2 * Math.PI * f * (t - t0)));

function panel({ title, rest, amp, lo, hi, h, noise = 0, seed = 1 }, y0) {
  const out = [];
  const top = y0 + 30;
  const bottom = y0 + h - 22;
  const xOf = (t) => LEFT + (t / SECONDS) * (RIGHT - LEFT);
  const yOf = (v) => bottom - ((v - lo) / (hi - lo)) * (bottom - top);
  out.push(text(LEFT, y0 + 18, title, { size: 13, weight: 600 }));
  out.push(text(LEFT - 8, y0 + 18, 'm/s²', { size: 11, fill: C.muted, anchor: 'end' }));
  const every = yOf(lo) - yOf(lo + STEP) < 15 ? 2 : 1; // label every other step when they are close
  // The steps the phone can report (solid) and the edges between them (dashed).
  for (let k = Math.ceil(lo / STEP - 1e-9); k * STEP <= hi + 1e-9; k++) {
    const v = k * STEP;
    const y = r1(yOf(v));
    out.push(`<line x1="${LEFT}" y1="${y}" x2="${RIGHT}" y2="${y}" stroke="${C.grid}" stroke-width="1.5"/>`);
    if (k % every === 0) out.push(text(LEFT - 8, y + 4, v.toFixed(1), { size: 11, fill: C.muted, anchor: 'end' }));
    const edge = v + STEP / 2;
    if (edge < hi) {
      const ye = r1(yOf(edge));
      out.push(`<line x1="${LEFT}" y1="${ye}" x2="${RIGHT}" y2="${ye}" stroke="${C.border}" stroke-width="1" stroke-dasharray="3 4"/>`);
    }
  }
  const s = shake(amp);
  const rng = makeRng(seed);
  // True motion: a smooth line.
  const pts = [];
  for (let i = 0; i <= 800; i++) {
    const t = (i / 800) * SECONDS;
    pts.push(`${r1(xOf(t))},${r1(yOf(rest + s(t)))}`);
  }
  out.push(`<polyline points="${pts.join(' ')}" fill="none" stroke="${TRUE_COLOR}" stroke-width="1.6"/>`);
  // What the browser reports: each reading held until the next, and a dot per reading.
  const reads = [];
  for (let i = 0; i <= SECONDS * RATE; i++) {
    const t = i / RATE;
    reads.push([t, round(rest + s(t) + noise * rng.normal())]);
  }
  const path = reads.map(([t, v], i) => (i === 0 ? `M${r1(xOf(t))} ${r1(yOf(v))}` : `H${r1(xOf(t))}V${r1(yOf(v))}`)).join('');
  out.push(`<path d="${path}" fill="none" stroke="${READ_COLOR}" stroke-width="1.3" opacity="0.8"/>`);
  for (const [t, v] of reads) out.push(`<circle cx="${r1(xOf(t))}" cy="${r1(yOf(v))}" r="1.7" fill="${READ_COLOR}"/>`);
  return { svg: out.join('\n'), reads };
}

const panels = [
  { title: '1. A firm tap: the shake comes through, in steps', rest: 9.81, amp: 0.3, lo: 9.45, hi: 10.15, h: 190, seed: 1 },
  { title: '2. A small shake, resting in the middle of a step: it vanishes', rest: 9.8, amp: 0.04, lo: 9.65, hi: 9.95, h: 118, seed: 2 },
  { title: '3. The same shake, resting near the edge of a step: the reading flickers, even before it', rest: 9.843, amp: 0.04, lo: 9.65, hi: 9.95, h: 118, noise: 0.005, seed: 3 },
];
const legendH = 40;
const H = legendH + 12 + panels.reduce((a, p) => a + p.h, 0) + 22;
const out = card(W, H, 'A smooth shake, and what a phone\'s browser reports (made-up waves)');
const ly = 46;
out.push(`<line x1="${LEFT}" y1="${ly - 4}" x2="${LEFT + 28}" y2="${ly - 4}" stroke="${TRUE_COLOR}" stroke-width="2"/>`);
out.push(text(LEFT + 36, ly, 'the true shaking', { size: 12 }));
out.push(`<circle cx="${LEFT + 170}" cy="${ly - 4}" r="2.5" fill="${READ_COLOR}"/>`);
out.push(text(LEFT + 180, ly, 'the readings: 60 a second, each rounded to the nearest 0.1 m/s²', { size: 12 }));
out.push(`<line x1="${LEFT + 560}" y1="${ly - 4}" x2="${LEFT + 588}" y2="${ly - 4}" stroke="${C.border}" stroke-dasharray="3 4"/>`);
out.push(text(LEFT + 594, ly, 'edge of a step', { size: 12 }));
const stats = [];
let y = legendH + 12;
panels.forEach((p) => {
  const { svg, reads } = panel(p, y);
  y += p.h;
  out.push(svg);
  stats.push(`${p.title}: values ${[...new Set(reads.map(([, v]) => v.toFixed(1)))].join(', ')}`);
});
const axisY = y - 6;
for (let t = 0; t <= SECONDS; t += 0.5) {
  const x = LEFT + (t / SECONDS) * (RIGHT - LEFT);
  out.push(text(x, axisY, `${t} s`, { size: 11, fill: C.muted, anchor: 'middle' }));
}
out.push('</svg>');
fs.writeFileSync(new URL('../../docs/theory/img/phone-steps.svg', import.meta.url), out.join('\n') + '\n');
console.log('wrote docs/theory/img/phone-steps.svg');
for (const s of stats) console.log(' ', s);
