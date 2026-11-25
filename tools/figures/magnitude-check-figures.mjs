// Make the two figures on "How big was it?" (docs/theory/magnitude.md) that come from the
// magnitude check, not from one quake:
//
//   mag-how-many.svg       G4 "How many stations?": the share of student groups whose middle value
//                          lands within 0.3 of UUSS's ML, against the number of stations in the
//                          group (1, 3, 5, 10); the holdout quakes (out-of-sample) as the main line,
//                          the training quakes lighter.
//   mag-stations-high.svg  G7 "Stations that read high": SGU and TMU (the stand-ins for Gunnison
//                          Valley and Wasatch Academy), station magnitude minus UUSS's ML by source
//                          area of the training quakes, horizontals against the vertical.
//
//   node tools/figures/magnitude-check-figures.mjs            both
//   node tools/figures/magnitude-check-figures.mjs how-many   one (how-many | stations-high)
//
// Node only, no network: reads tools/figures/data/magnitude-check.json, which
// tools/quake-explorer/magnitude-check.mjs writes (rerun that first if the quakes or the recipe
// change). Deterministic: the same bytes every run. No credit text in the images: the page
// captions carry it. Prints the numbers each figure shows.
import fs from 'node:fs';
import { C, r1 } from './svg-traces.mjs';
import { card, text } from './svg-charts.mjs';

const outDir = new URL('../../docs/theory/img/', import.meta.url);
const data = JSON.parse(fs.readFileSync(new URL('./data/magnitude-check.json', import.meta.url), 'utf8'));
const only = process.argv.slice(2);
const W = 760;
const MINUS = '−';
const EN = '–';
// Series colours: the first slots of the dataviz reference palette, as science-frequencies.mjs
// and magnitude-figures.mjs (checked for color-blind readers); every series also has a legend.
const SERIES = ['#2a78d6', '#eb6834'];
const LIGHT = '#9dbfe9'; // a lighter step of SERIES[0], for the in-sample line

const write = (name, svg) => {
  fs.writeFileSync(new URL(name, outDir), svg + '\n');
  console.log(`wrote docs/theory/img/${name} (${(svg.length / 1024).toFixed(0)} KB)`);
};
const line = (x1, y1, x2, y2, stroke, width = 1, extra = '') =>
  `<line x1="${r1(x1)}" y1="${r1(y1)}" x2="${r1(x2)}" y2="${r1(y2)}" stroke="${stroke}" stroke-width="${width}"${extra ? ' ' + extra : ''}/>`;
const vtext = (x, y, s) =>
  `<text transform="translate(${r1(x)} ${r1(y)}) rotate(-90)" font-size="12.5" text-anchor="middle" fill="${C.muted}">${s}</text>`;
const signed = (v, d = 2) => (v >= 0 ? '+' : MINUS) + Math.abs(v).toFixed(d);
const mean = (a) => a.reduce((s, v) => s + v, 0) / a.length;

// ---------------------------------------------------------------------------------------------
// G4. How many stations?
function howMany() {
  const KS = [1, 3, 5, 10];
  const hold = KS.map((k) => 100 * data.sets.holdout.subsets[k].within03);
  const train = KS.map((k) => 100 * data.sets.training.subsets[k].within03);
  console.log(`G4: within 0.3 of UUSS, k = ${KS.join(', ')} stations: holdout ${hold.map((v) => v.toFixed(1) + '%').join(', ')}; ` +
    `training ${train.map((v) => v.toFixed(1) + '%').join(', ')} (${data.draws} groups per quake, seed ${data.seed})`);

  const padL = 70;
  const padR = 30;
  const top = 96;
  const h = 270;
  const w = W - padL - padR;
  const x = (k) => padL + ((k - 0) / 11) * w;
  const y = (pct) => top + ((100 - pct) / 100) * h;
  const out = card(W, top + h + 108, `How many stations? Groups that land within 0.3 of the University of Utah's magnitude`);
  // legend
  const ly = 52;
  out.push(line(padL, ly - 4, padL + 26, ly - 4, SERIES[0], 2.5));
  out.push(`<circle cx="${padL + 13}" cy="${ly - 4}" r="5" fill="${SERIES[0]}" stroke="${C.bg}" stroke-width="2"/>`);
  out.push(text(padL + 34, ly, `held out: ${data.sets.holdout.quakes} quakes from other areas (out-of-sample)`, { size: 14, fill: C.note }));
  out.push(line(padL + 390, ly - 4, padL + 416, ly - 4, LIGHT, 2));
  out.push(`<circle cx="${padL + 403}" cy="${ly - 4}" r="4" fill="${C.bg}" stroke="${LIGHT}" stroke-width="2"/>`);
  out.push(text(padL + 424, ly, `training: ${data.sets.training.quakes} quakes (in-sample)`, { size: 14, fill: C.note }));
  out.push(text(padL, ly + 23, `Each group takes its stations at random and gives their middle value (${data.draws} groups per quake).`, { size: 13, fill: C.muted }));
  // grid and axes
  for (let p = 0; p <= 100; p += 20) {
    out.push(line(padL, y(p), padL + w, y(p), C.grid));
    out.push(text(padL - 8, y(p) + 4, `${p}%`, { size: 13, fill: C.muted, anchor: 'end' }));
  }
  out.push(line(padL, y(0), padL + w, y(0), C.muted));
  for (const k of KS) {
    out.push(line(x(k), y(0), x(k), y(0) + 5, C.muted));
    out.push(text(x(k), y(0) + 22, k === 1 ? '1 station' : `${k} stations`, { size: 14, fill: C.note, anchor: 'middle' }));
  }
  out.push(vtext(20, top + h / 2, "groups within 0.3 of Utah's value"));
  out.push(text(padL + w, y(0) + 42, 'stations in the group', { size: 12.5, fill: C.muted, anchor: 'end' }));
  // training (lighter, under), then the holdout with labeled values
  const path = (vals) => vals.map((v, i) => `${i ? 'L' : 'M'}${r1(x(KS[i]))} ${r1(y(v))}`).join('');
  out.push(`<path d="${path(train)}" fill="none" stroke="${LIGHT}" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>`);
  train.forEach((v, i) => out.push(`<circle cx="${r1(x(KS[i]))}" cy="${r1(y(v))}" r="4" fill="${C.bg}" stroke="${LIGHT}" stroke-width="2"/>`));
  out.push(`<path d="${path(hold)}" fill="none" stroke="${SERIES[0]}" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"/>`);
  hold.forEach((v, i) => {
    out.push(`<circle cx="${r1(x(KS[i]))}" cy="${r1(y(v))}" r="5.5" fill="${SERIES[0]}" stroke="${C.bg}" stroke-width="2"/>`);
    // value below the point where the training line runs above it, else above
    const below = train[i] > v + 0.5;
    out.push(text(x(KS[i]), y(v) + (below ? 24 : -13), `${Math.round(v)}%`, { size: 15, weight: 700, fill: C.note, anchor: 'middle', halo: true }));
  });
  const fy = y(0) + 70;
  out.push(text(padL, fy, `${data.sets.holdout.quakes} quakes held out from all tuning (2022${EN}2026) · ${data.sets.training.quakes} training quakes`, { size: 13, fill: C.muted }));
  out.push(text(padL, fy + 20, `median of the group's stations · horizontals, no station corrections`, { size: 13, fill: C.muted }));
  out.push('</svg>');
  write('mag-how-many.svg', out.join('\n'));
}

// ---------------------------------------------------------------------------------------------
// G7. Stations that read high
function stationsHigh() {
  const AREAS = ['Kanosh', 'Junction', 'Milford', 'Kenilworth', 'Mount Pleasant', 'Leamington', 'Panguitch', 'Torrey',
    'West Valley City', 'Fayette'];
  const STA = [
    { sta: 'SGU', school: 'Gunnison Valley' },
    { sta: 'TMU', school: 'Wasatch Academy' },
  ];
  const quakesIn = (a) => data.quakes.filter((q) => q.set === 'training' && q.cluster === a).length;
  const cell = (sta, a) => {
    const xs = data.standIns.filter((s) => s.sta === sta && s.set === 'training' && s.cluster === a);
    const h = xs.map((s) => s.h).filter((v) => v != null);
    const z = xs.map((s) => s.z).filter((v) => v != null);
    return { nH: h.length, nZ: z.length, h: h.length ? mean(h) : null, z: z.length ? mean(z) : null };
  };
  const allOf = (sta) => {
    const xs = data.standIns.filter((s) => s.sta === sta && s.set === 'training' && AREAS.includes(s.cluster));
    const h = xs.map((s) => s.h).filter((v) => v != null);
    const z = xs.map((s) => s.z).filter((v) => v != null);
    return { nH: h.length, nZ: z.length, h: mean(h), z: mean(z) };
  };
  for (const s of STA) {
    const a = allOf(s.sta);
    console.log(`G7 ${s.sta}: all areas horizontals ${signed(a.h)} (${a.nH} quakes), vertical ${signed(a.z)} (${a.nZ}); ` +
      AREAS.map((ar) => { const c = cell(s.sta, ar); return `${ar} ${c.h == null ? '–' : signed(c.h)}/${c.z == null ? '–' : signed(c.z)}`; }).join(', '));
  }

  const labelW = 196;
  const gap = 46;
  const padR = 16;
  const panelW = (W - labelW - gap - padR - 12) / 2;
  const x0 = (p) => labelW + p * (panelW + gap);
  const v0 = -0.4;
  const v1 = 0.8;
  const xv = (p, v) => x0(p) + ((Math.max(v0, Math.min(v1, v)) - v0) / (v1 - v0)) * panelW;
  const top = 120;
  const rowH = 30;
  const rows = AREAS.length;
  const allY = top + rows * rowH + 14;
  const bottom = allY + rowH - 6;
  const out = card(W, bottom + 104, `Stations that read high: SGU and TMU against the University of Utah's magnitude`);
  // legend
  const ly = 50;
  const dotH = (cx, cy) => `<circle cx="${r1(cx)}" cy="${r1(cy)}" r="6" fill="${SERIES[1]}" stroke="${C.bg}" stroke-width="2"/>`;
  const dotZ = (cx, cy) => `<rect x="${r1(cx - 5.5)}" y="${r1(cy - 5.5)}" width="11" height="11" rx="1.5" fill="${SERIES[0]}" stroke="${C.bg}" stroke-width="2"/>`;
  out.push(dotH(18, ly - 4));
  out.push(text(30, ly, 'horizontal sensors (mean of the two)', { size: 14, fill: C.note }));
  out.push(dotZ(300, ly - 4));
  out.push(text(312, ly, 'up-down sensor', { size: 14, fill: C.note }));
  out.push(line(452, ly - 11, 452, ly + 3, C.trace, 2));
  out.push(text(460, ly, `0 = the University of Utah's value`, { size: 14, fill: C.note }));
  // panel heads, grid, ticks
  STA.forEach((s, p) => {
    out.push(text(x0(p), top - 36, s.sta, { size: 16, weight: 700 }));
    out.push(text(x0(p) + 46, top - 36, `stand-in for ${s.school}`, { size: 13, fill: C.muted }));
    for (let v = v0; v <= v1 + 1e-9; v += 0.2) {
      const vv = Math.round(v * 10) / 10;
      out.push(line(xv(p, vv), top - 8, xv(p, vv), bottom, vv === 0 ? C.trace : C.grid, vv === 0 ? 2 : 1));
      if (Math.round(vv * 10) % 4 === 0) {
        out.push(text(xv(p, vv), top - 14, vv === 0 ? '0' : signed(vv, 1), { size: 13, fill: C.muted, anchor: 'middle' }));
      }
    }
    out.push(text(x0(p) + panelW / 2, bottom + 21, `station's value minus Utah's`, { size: 13, fill: C.muted, anchor: 'middle' }));
  });
  // rows
  const drawRow = (yc, getCell, label, sub) => {
    out.push(text(12, yc + 5, label, { size: 14.5, weight: 600 }));
    if (sub) out.push(text(labelW - 12, yc + 5, sub, { size: 13, fill: C.muted, anchor: 'end' }));
    STA.forEach((s, p) => {
      const c = getCell(s.sta);
      if (c.h == null && c.z == null) {
        out.push(text(xv(p, 0.06), yc + 5, 'no usable record', { size: 13, fill: C.muted, halo: true }));
        return;
      }
      if (c.h != null && c.z != null) out.push(line(xv(p, c.z), yc, xv(p, c.h), yc, C.border, 3));
      if (c.z != null) out.push(dotZ(xv(p, c.z), yc));
      if (c.h != null) out.push(dotH(xv(p, c.h), yc));
    });
  };
  AREAS.forEach((a, i) => {
    const yc = top + i * rowH + rowH / 2;
    if (i % 2 === 0) out.push(`<rect x="6" y="${r1(yc - rowH / 2)}" width="${W - 12}" height="${rowH}" fill="#f6f7f9"/>`);
    const n = quakesIn(a);
    drawRow(yc, (sta) => cell(sta, a), a, `${n} ${n === 1 ? 'quake' : 'quakes'}`);
  });
  // re-draw the grid's zero lines over the row shading
  STA.forEach((s, p) => out.push(line(xv(p, 0), top - 8, xv(p, 0), bottom, C.trace, 2)));
  out.push(line(6, allY - 7, W - 6, allY - 7, C.border));
  const all = Object.fromEntries(STA.map((s) => [s.sta, allOf(s.sta)]));
  drawRow(allY + rowH / 2 - 6, (sta) => all[sta], 'All these quakes', null);
  STA.forEach((s, p) => {
    const a = all[s.sta];
    out.push(text(xv(p, -0.05), allY + rowH / 2 - 1, `${a.nH} quakes`, { size: 13, fill: C.muted, anchor: 'end', halo: true }));
  });
  // footer
  const fy = bottom + 52;
  out.push(text(12, fy, `Each mark: the station's magnitude minus the University of Utah's, averaged over the`, { size: 13, fill: C.muted }));
  out.push(text(12, fy + 20, `training quakes from that area (2025${EN}2026). No station corrections.`, { size: 13, fill: C.muted }));
  out.push('</svg>');
  write('mag-stations-high.svg', out.join('\n'));
}

const FIGS = { 'how-many': howMany, 'stations-high': stationsHigh };
for (const [name, f] of Object.entries(FIGS)) if (!only.length || only.includes(name)) f();
