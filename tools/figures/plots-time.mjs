// Figures for "Beyond one seismogram" (docs/theory/plots.md): records over time.
//
//   node tools/figures/plots-time.mjs              both figures
//   node tools/figures/plots-time.mjs helicorder   V1: a day at SUU (Juab stand-in), October 26, 2026
//   node tools/figures/plots-time.mjs carpet       V2: three months at HEB near Heber City
//   ... --refetch                                   recompute the carpet's noise levels
//
// Waveforms: University of Utah (UU) stations via EarthScope FDSN; events: USGS ComCat.
// Downloads are cached in tools/figures/.cache/ (git-ignored). The carpet's levels (one per
// 15 minutes for three months) are kept in tools/figures/data/carpet-heb-2026.json, so it
// redraws without downloading. No credit text in the images: the page captions carry it.
// Every number printed here is the one the page uses. Output: docs/theory/img/plots-*.svg
import fs from 'node:fs';
import { C, r1, esc } from './svg-traces.mjs';
import { card, text, png, localParts, viridis, viridisHex } from './svg-charts.mjs';
import { event, events, stationCoords, waveforms } from './fdsn-cache.mjs';

const { filteredData } = await import('../../docs/app/js/data/filters.js');
const { distanceKm } = await import('../../docs/app/js/lib/geo.js');
const { bridgeGaps, restoreGaps, helicorderRows, rowColumns, penOffset } = await import('../../docs/app/js/lib/helicorder.js');
const { stepLevels, medianOf, carpetGrid, crossingHour } = await import('../../docs/app/js/lib/carpet.js');

const outDir = new URL('../../docs/theory/img/', import.meta.url);
const dataDir = new URL('./data/', import.meta.url);
const args = process.argv.slice(2);
const REFETCH = args.includes('--refetch');
const only = args.filter((a) => !a.startsWith('--'));
const MINUS = '−';

function write(name, svg) {
  fs.writeFileSync(new URL(name, outDir), svg + '\n');
  console.log(`wrote docs/theory/img/${name} (${(svg.length / 1024).toFixed(0)} KB)`);
}
const hhmm = (ms) => {
  const p = localParts(ms);
  return `${p.h % 12 || 12}:${String(p.mi).padStart(2, '0')} ${p.h >= 12 ? 'pm' : 'am'}`;
};
const hourLabel = (h) => (h === 0 ? '12 am' : h === 12 ? 'noon' : h < 12 ? `${h} am` : `${h - 12} pm`);

/**
 * A long record filtered in one go: gaps bridged so the filter runs across them, then put
 * back as gaps (see lib/helicorder.js). `pad` ms of extra record on each side keep the
 * filter's tapered ends outside [startMs, endMs).
 */
async function longFiltered({ net = 'UU', sta, loc, cha, startMs, endMs, preset, pad = 2 * 3600e3 }) {
  const [tr] = await waveforms({ net, sta, loc, cha, startMs: startMs - pad, endMs: endMs + pad });
  if (!tr) return null;
  const { filled, gaps } = bridgeGaps(tr.data);
  const f = restoreGaps(filteredData({ ...tr, data: filled }, preset), gaps);
  const i0 = Math.round(((startMs - tr.startMs) / 1000) * tr.sampleRate);
  const n = Math.round(((endMs - startMs) / 1000) * tr.sampleRate);
  const data = f.slice(i0, i0 + n);
  return { data, sampleRate: tr.sampleRate, startMs, gaps: gaps.map(([a, b]) => [(a - i0) / tr.sampleRate, (b - i0) / tr.sampleRate]).filter(([a, b]) => b > 0 && a < n / tr.sampleRate) };
}

/** Time (ms) and size of the biggest swing of `rec` between two times. */
function peakBetween(rec, fromMs, toMs) {
  const a = Math.max(0, Math.round(((fromMs - rec.startMs) / 1000) * rec.sampleRate));
  const b = Math.min(rec.data.length, Math.round(((toMs - rec.startMs) / 1000) * rec.sampleRate));
  let best = -1;
  let at = a;
  for (let i = a; i < b; i++) if (Math.abs(rec.data[i]) > best) { best = Math.abs(rec.data[i]); at = i; }
  return { ms: rec.startMs + (at / rec.sampleRate) * 1000, size: best };
}

// ---------------------------------------------------------------------------------------------
// V1. Helicorder: SUU (stands in for Juab High School, Nephi), Monday, October 26, 2026.
async function helicorder() {
  const sta = 'SUU';
  const startMs = Date.parse('2026-10-26T06:00:00Z'); // midnight MDT
  const endMs = startMs + 86400e3;
  const rec = await longFiltered({ sta, loc: '01', cha: 'EHZ', startMs, endMs, preset: { lo: 1, hi: 10 } });
  const sr = rec.sampleRate;
  // background: the median of the day's 1-minute RMS values
  const minutes = [];
  for (let m = 0; m < 1440; m++) {
    let ss = 0, n = 0;
    for (let i = m * 60 * sr; i < (m + 1) * 60 * sr; i++) if (!Number.isNaN(rec.data[i])) { ss += rec.data[i] ** 2; n++; }
    minutes.push(n > 30 * sr ? Math.sqrt(ss / n) : NaN);
  }
  const bg = medianOf(minutes);
  const night = medianOf(minutes.slice(0, 5 * 60));
  const dayLvl = medianOf(minutes.slice(9 * 60, 17 * 60));
  console.log(`helicorder: ${sta} background ${bg.toFixed(2)} counts (1-minute RMS); 9 am-5 pm ${dayLvl.toFixed(2)} vs midnight-5 am ${night.toFixed(2)}: ${(dayLvl / night).toFixed(2)}x`);
  for (const [a, b] of rec.gaps) console.log(`helicorder: gap at ${hhmm(startMs + a * 1000)}, ${(b - a).toFixed(1)} s`);
  console.log(`helicorder: gaps total ${rec.gaps.reduce((s, [a, b]) => s + b - a, 0).toFixed(1)} s`);

  // what to point at: catalog events (time of the biggest swing at SUU within 2 minutes)
  const c = await stationCoords('UU', sta);
  const marks = [];
  for (const [id, label] of [
    ['uu80161881', 'quarry blast near Leamington'],
    ['uu80161886', 'quake under Mount Nebo'],
    ['uu80161896', 'small quake near Mona'],
  ]) {
    const ev = await event(id);
    const pk = peakBetween(rec, ev.timeMs, ev.timeMs + 120e3);
    const d = distanceKm(ev.lat, ev.lon, c.lat, c.lon);
    console.log(`helicorder: ${id} ${ev.type} M${ev.mag.toFixed(2)} ${ev.place}, ${d.toFixed(0)} km, origin ${hhmm(ev.timeMs)}, peak at SUU ${hhmm(pk.ms)} = ${(pk.size / bg).toFixed(0)}x background`);
    marks.push({ ms: pk.ms, label: `${hhmm(ev.timeMs)}: ${label}, magnitude ${ev.mag.toFixed(1)}, ${Math.round(d)} km away` });
  }
  // Not in the catalog. Checked against stations 20–42 km away (MPU, WMUT, NLU, LEVU): the
  // night bursts show only at SUU; the five late-morning bursts (11:33, 11:34, 11:39, 11:41,
  // 11:48) show at NLU (25 km west) too, reaching it only about 0.8 s before SUU.
  const noon = peakBetween(rec, Date.parse('2026-10-26T17:45:00Z'), Date.parse('2026-10-26T17:52:00Z'));
  const noonFirst = peakBetween(rec, Date.parse('2026-10-26T17:33:00Z'), Date.parse('2026-10-26T17:34:00Z'));
  const night1 = peakBetween(rec, Date.parse('2026-10-26T06:45:00Z'), Date.parse('2026-10-26T07:10:00Z'));
  console.log(`helicorder: uncataloged ${hhmm(noonFirst.ms)} ${(noonFirst.size / bg).toFixed(0)}x to ${hhmm(noon.ms)} ${(noon.size / bg).toFixed(0)}x; night bursts biggest ${hhmm(night1.ms)} ${(night1.size / bg).toFixed(0)}x`);
  const nightFirst = Date.parse('2026-10-26T06:47:50Z'); // the first burst of the group
  marks.push({ ms: nightFirst, label: `${hhmm(nightFirst)} to ${hhmm(Date.parse('2026-10-26T07:09:00Z'))}: bursts that only this station felt` });
  const gapMs = startMs + rec.gaps[0][0] * 1000;
  const gapTotal = rec.gaps.reduce((s, [a, b]) => s + b - a, 0);
  marks.push({ ms: gapMs, label: `${hhmm(gapMs)}: gaps, no data for ${Math.round(gapTotal)} seconds` });
  marks.push({ ms: noonFirst.ms, label: `${hhmm(noonFirst.ms)} to ${hhmm(noon.ms)}: five bursts not in the catalog. What were they?` });
  marks.sort((a, b) => a.ms - b.ms);

  // layout
  const width = 760;
  const rowSec = 1800;
  const rows = helicorderRows(startMs, endMs, rowSec);
  const padL = 58;
  const padR = 12;
  const top = 92;
  const rowH = 14;
  const w = width - padL - padR;
  const plotH = rows.length * rowH;
  const footH = 44 + 7 * 19;
  const height = top + plotH + 10 + footH;
  // pen scale: the typical noise (about 3.5× the RMS) reaches an eighth of the line spacing
  const countsPerRow = (3.5 * bg) / 0.12;
  const clipRows = 1.5;
  console.log(`helicorder: ${rows.length} lines of ${rowSec / 60} min; ${countsPerRow.toFixed(0)} counts per line spacing; clipped at ${clipRows} lines`);

  // traces as a 2× image: each column a vertical bar from its min to its max
  const S = 2;
  const W = w * S;
  const Hpx = (plotH + 2 * clipRows * rowH) * S;
  const y0px = clipRows * rowH * S; // image starts clipRows lines above the first line
  const rgb = new Uint8Array(W * Hpx * 3).fill(255);
  const inks = [[31, 41, 55], [29, 78, 216]]; // dark gray, blue (alternate lines)
  rows.forEach((row, k) => {
    const { min, max } = rowColumns(rec.data, sr, startMs, row, W);
    const yc = y0px + (k + 0.5) * rowH * S;
    const ink = inks[k % 2];
    let prevLo = NaN, prevHi = NaN;
    for (let x = 0; x < W; x++) {
      if (Number.isNaN(min[x])) { prevLo = prevHi = NaN; continue; }
      // join to the previous column so the line has no breaks
      let lo = yc - penOffset(max[x], countsPerRow, clipRows) * rowH * S;
      let hi = yc - penOffset(min[x], countsPerRow, clipRows) * rowH * S;
      if (!Number.isNaN(prevLo)) { lo = Math.min(lo, prevHi); hi = Math.max(hi, prevLo); }
      prevLo = lo; prevHi = hi;
      for (let y = Math.max(0, Math.floor(lo)); y <= Math.min(Hpx - 1, Math.ceil(hi)); y++) rgb.set(ink, (y * W + x) * 3);
    }
  });
  const img = png(W, Hpx, rgb).toString('base64');

  const out = card(width, height, `A day at station SUU near Nephi: Monday, October 26, 2026 (filtered 1${'–'}10 Hz)`);
  out.push(`<image x="${padL}" y="${r1(top - clipRows * rowH)}" width="${w}" height="${r1(Hpx / S)}" preserveAspectRatio="none" href="data:image/png;base64,${img}"/>`);
  // minutes along the top
  for (let m = 0; m <= 30; m += 5) {
    const x = padL + (m / 30) * w;
    out.push(`<line x1="${r1(x)}" y1="${top - 28}" x2="${r1(x)}" y2="${top - 23}" stroke="${C.muted}"/>`);
    out.push(text(x, top - 32, String(m), { size: 12, fill: C.muted, anchor: m === 0 ? 'start' : m === 30 ? 'end' : 'middle' }));
  }
  out.push(text(padL, top - 50, 'Each line is 30 minutes: read across, then down. Minutes into the line:', { size: 12.5, fill: C.muted }));
  // hours down the side (Utah time)
  rows.forEach((row, k) => {
    const p = localParts(row.startMs);
    if (p.mi !== 0) return;
    out.push(text(padL - 6, top + (k + 0.5) * rowH + 4, hourLabel(p.h), { size: 12, fill: C.muted, anchor: 'end' }));
  });
  // marks
  const at = (ms) => {
    const k = Math.floor((ms - startMs) / (rowSec * 1000));
    return { x: padL + (((ms - startMs) / 1000 - k * rowSec) / rowSec) * w, y: top + (k + 0.5) * rowH };
  };
  // numbered markers just left of each event, explained under the plot
  marks.forEach((m, i) => {
    const p = at(m.ms);
    const cx = Math.max(padL + 9, p.x - 13);
    out.push(`<circle cx="${r1(cx)}" cy="${r1(p.y)}" r="9" fill="${C.note}" stroke="${C.bg}" stroke-width="2"/>`);
    out.push(text(cx, p.y + 4.5, String(i + 1), { size: 12.5, weight: 700, fill: '#ffffff', anchor: 'middle' }));
  });
  let fy = top + plotH + 30;
  marks.forEach((m, i) => {
    out.push(`<circle cx="${padL + 9}" cy="${r1(fy - 4.5)}" r="9" fill="${C.note}"/>`);
    out.push(text(padL + 9, fy, String(i + 1), { size: 12.5, weight: 700, fill: '#ffffff', anchor: 'middle' }));
    out.push(text(padL + 26, fy, m.label, { size: 13, weight: 600 }));
    fy += 19;
  });
  fy += 8;
  out.push(text(padL, fy, 'Utah time (MDT). Lines alternate dark and blue. Big swings are cut off at a line and a half', { size: 12.5, fill: C.muted }));
  out.push(text(padL, fy + 18, 'above or below their own line, like ink running off a paper drum.', { size: 12.5, fill: C.muted }));
  out.push('</svg>');
  write('plots-helicorder.svg', out.join('\n'));
}

// ---------------------------------------------------------------------------------------------
// V2. Seismic carpet: HEB near Heber City, 5–20 Hz noise every 15 minutes, August 24 to
// November 23, 2026. Rows start at 06:00 UTC (midnight MDT, 11 pm MST); the axis is UTC, as
// the data are stored, so the clock change on November 1 shows as a one-hour step.
const CARPET = { sta: 'HEB', loc: '01', cha: 'EHZ', preset: { lo: 5, hi: 20 }, stepSec: 900,
  startMs: Date.parse('2026-08-24T06:00:00Z'), days: 92 };

/** The carpet's levels, computed one day at a time (kept in tools/figures/data/). */
async function carpetLevels() {
  const file = new URL('carpet-heb-2026.json', dataDir);
  if (!REFETCH && fs.existsSync(file)) return JSON.parse(fs.readFileSync(file, 'utf8'));
  const { sta, loc, cha, preset, stepSec, startMs, days } = CARPET;
  const values = [];
  for (let d = 0; d < days; d++) {
    const t0 = startMs + d * 86400e3;
    // 2 hours of extra record each side: the filter's taper (5% of the record) stays outside the day
    const rec = await longFiltered({ sta, loc, cha, startMs: t0, endMs: t0 + 86400e3, preset });
    const lv = rec ? stepLevels(rec.data, rec.sampleRate, 60, stepSec / 60) : new Float64Array(86400 / stepSec).fill(NaN);
    for (const v of lv) values.push(Number.isFinite(v) ? +v.toPrecision(4) : null);
    process.stdout.write(`\rcarpet: day ${d + 1} of ${days}`);
  }
  process.stdout.write('\n');
  const out = {
    what: 'Ground noise at UU.HEB.01.EHZ: the median of the 1-minute RMS values (counts) in each 15 minutes, after a 5-20 Hz band-pass (the app\'s filter, run over each day with gaps bridged and put back).',
    source: 'University of Utah Seismograph Stations (network UU, doi:10.7914/SN/UU) via EarthScope FDSN dataselect',
    made: 'node tools/figures/plots-time.mjs carpet --refetch',
    startUtc: new Date(startMs).toISOString(), stepSec, days, values,
  };
  fs.writeFileSync(file, JSON.stringify(out) + '\n');
  console.log(`wrote tools/figures/data/carpet-heb-2026.json`);
  return out;
}

async function carpet() {
  const kept = await carpetLevels();
  const { stepSec, days } = kept;
  const startMs = Date.parse(kept.startUtc);
  const points = kept.values.map((v, k) => ({ t: startMs + k * stepSec * 1000, v: v ?? NaN }));
  const grid = carpetGrid(points, { startMs, days, stepSec });
  const cols = grid[0].length;
  const tOf = (d, c) => startMs + d * 86400e3 + c * stepSec * 1000;
  // the quiet level: the median of all values between 1 and 4 am Utah time
  const quiet = medianOf(points.filter((p) => { const h = localParts(p.t).h; return h >= 1 && h < 4; }).map((p) => p.v));
  // weekday daytime vs weekends (10 am to 4 pm Utah time)
  const daytime = (pred) => medianOf(points.filter((p) => { const lp = localParts(p.t); return lp.h >= 10 && lp.h < 16 && pred(lp); }).map((p) => p.v));
  const isHoliday = (lp) => (lp.mo === 'Sep' && lp.d === 7) || (lp.mo === 'Oct' && lp.d === 12) || (lp.mo === 'Nov' && lp.d === 11);
  const wk = daytime((lp) => !['Sat', 'Sun'].includes(lp.wd) && !isHoliday(lp));
  const sat = daytime((lp) => lp.wd === 'Sat');
  const sun = daytime((lp) => lp.wd === 'Sun');
  const dayOf = (mo, d) => daytime((lp) => lp.mo === mo && lp.d === d);
  console.log(`carpet: quiet level (1-4 am) ${quiet.toFixed(3)} counts; daytime weekdays ${(wk / quiet).toFixed(1)}x, Saturdays ${(sat / quiet).toFixed(1)}x, Sundays ${(sun / quiet).toFixed(1)}x; weekday/Sunday ${(wk / sun).toFixed(2)}, weekday/Saturday ${(wk / sat).toFixed(2)}`);
  const labor = dayOf('Sep', 7);
  const mondays = medianOf([dayOf('Aug', 31), dayOf('Sep', 14)]);
  const workday = (mo, d) => medianOf(points.filter((p) => { const lp = localParts(p.t); return lp.h >= 8 && lp.h < 18 && lp.mo === mo && lp.d === d; }).map((p) => p.v));
  console.log(`carpet: 8 am-6 pm: Labor Day ${(workday('Sep', 7) / quiet).toFixed(1)}x; Mondays Aug 31 ${(workday('Aug', 31) / quiet).toFixed(1)}x, Sep 14 ${(workday('Sep', 14) / quiet).toFixed(1)}x; Sat Sep 5 ${(workday('Sep', 5) / quiet).toFixed(1)}x, Sun Sep 6 ${(workday('Sep', 6) / quiet).toFixed(1)}x`);
  console.log(`carpet: Labor Day (Mon Sep 7) ${(labor / quiet).toFixed(1)}x, ${(labor / mondays).toFixed(2)} of the Mondays before and after; Columbus Day ${(dayOf('Oct', 12) / medianOf([dayOf('Oct', 5), dayOf('Oct', 19)])).toFixed(2)}; Veterans Day ${(dayOf('Nov', 11) / medianOf([dayOf('Nov', 4), dayOf('Nov', 18)])).toFixed(2)} of the Wednesdays around`);
  // missing days
  const missing = grid.map((row, d) => [d, row.filter(Number.isNaN).length]).filter(([, n]) => n > 8);
  for (const [d, n] of missing) console.log(`carpet: ${new Date(tOf(d, 0)).toISOString().slice(0, 10)} row: ${n} of ${cols} cells missing`);
  // the clock change: when the weekday morning rise crosses halfway (on a log scale) between
  // the pre-dawn level (08-11 UTC) and the late-morning level (16-18 UTC)
  const colOf = (utcH) => Math.round(((utcH - 6 + 24) % 24) * 3600 / stepSec);
  const rise = (d) => {
    const row = grid[d];
    const pre = medianOf(row.slice(colOf(8), colOf(11)));
    const mid = medianOf(row.slice(colOf(16), colOf(18)));
    return 6 + crossingHour(row, Math.sqrt(pre * mid), stepSec, colOf(9)); // hours UTC
  };
  const risesIn = (fromIso, toIso) => {
    const out = [];
    for (let d = 0; d < days; d++) {
      const t = tOf(d, 36); // 15:00 UTC, morning in Utah
      const lp = localParts(t);
      if (t < Date.parse(fromIso) || t >= Date.parse(toIso) || ['Sat', 'Sun'].includes(lp.wd) || isHoliday(lp)) continue;
      const r = rise(d);
      if (Number.isFinite(r)) out.push(r);
    }
    return out;
  };
  const before = risesIn('2026-10-12', '2026-10-31');
  const after = risesIn('2026-11-02', '2026-11-21');
  const fmtH = (h) => `${Math.floor(h)}:${String(Math.round((h % 1) * 60)).padStart(2, '0')}`;
  console.log(`carpet: weekday morning rise, UTC: before Nov 1 median ${fmtH(medianOf(before))} (${before.length} days), after ${fmtH(medianOf(after))} (${after.length} days): ${(medianOf(after) - medianOf(before)).toFixed(2)} h later`);

  // layout
  const width = 760;
  const padL = 70;
  const padR = 118;
  const top = 84;
  const cell = 6;
  const plotW = cols * cell;
  const plotH = days * cell;
  const legendH = 72;
  const height = top + plotH + 28 + legendH;
  const lo = 0.7; // color scale, × the quiet level, log
  const hi = 10;
  const colorOf = (v) => viridis(Math.log(v / quiet / lo) / Math.log(hi / lo));
  // the carpet as a 2× image, flat cells
  const S = 2;
  const W = plotW * S;
  const Hpx = plotH * S;
  const rgb = new Uint8Array(W * Hpx * 3);
  for (let d = 0; d < days; d++) for (let c = 0; c < cols; c++) {
    const v = grid[d][c];
    const col = Number.isNaN(v) ? [238, 240, 243] : colorOf(v);
    for (let yy = d * cell * S; yy < (d + 1) * cell * S; yy++) for (let xx = c * cell * S; xx < (c + 1) * cell * S; xx++) rgb.set(col, (yy * W + xx) * 3);
  }
  const img = png(W, Hpx, rgb).toString('base64');
  const out = card(width, height, 'Three months of ground noise at station HEB, near Heber City (5–20 Hz)');
  out.push(`<image x="${padL}" y="${top}" width="${plotW}" height="${plotH}" preserveAspectRatio="none" href="data:image/png;base64,${img}"/>`);
  out.push(`<rect x="${padL}" y="${top}" width="${plotW}" height="${plotH}" fill="none" stroke="${C.border}"/>`);
  // top axis: UTC hours
  out.push(text(padL, top - 40, 'Each row is one day; across: the time of day in UTC, the clock seismic data use.', { size: 12.5, fill: C.muted }));
  for (let c = 0; c <= cols; c += 12) {
    const x = padL + c * cell;
    const h = (6 + (c * stepSec) / 3600) % 24;
    out.push(`<line x1="${x}" y1="${top - 5}" x2="${x}" y2="${top}" stroke="${C.muted}"/>`);
    out.push(text(x, top - 9, `${String(h).padStart(2, '0')}:00`, { size: 12, fill: C.muted, anchor: c === 0 ? 'start' : c === cols ? 'end' : 'middle' }));
  }
  // left: a date label on each Monday; weekend rows marked with a small block
  for (let d = 0; d < days; d++) {
    const lp = localParts(tOf(d, 12)); // 09:00 UTC = early morning in Utah: that row's date
    const y = top + d * cell;
    if (lp.wd === 'Mon') out.push(text(padL - 14, y + cell, `${lp.mo} ${lp.d}`, { size: 12, fill: C.muted, anchor: 'end' }));
    if (lp.wd === 'Sat' || lp.wd === 'Sun') out.push(`<rect x="${padL - 9}" y="${y + 0.5}" width="6" height="${cell - 1}" fill="#b45309"/>`);
  }
  // right: notes pointing at rows
  const rowOfDate = (iso) => Math.round((Date.parse(iso + 'T06:00:00Z') - startMs) / 86400e3);
  const note = (d0, d1, lines) => {
    const ya = top + d0 * cell;
    const yb = top + (d1 + 1) * cell;
    const x = padL + plotW + 6;
    out.push(`<path d="M${x} ${r1(ya + 0.5)}h4V${r1(yb - 0.5)}h-4" fill="none" stroke="${C.note}" stroke-width="1.4"/>`);
    lines.forEach((l, i) => out.push(text(x + 9, (ya + yb) / 2 + 4 + (i - (lines.length - 1) / 2) * 15, l, { size: 12.5, weight: 600 })));
  };
  note(rowOfDate('2026-09-07'), rowOfDate('2026-09-07'), ['Labor Day']);
  const off0 = missing.length ? missing[0][0] : null;
  if (off0 != null) note(off0, missing.filter(([d]) => d < off0 + 6).at(-1)[0], ['station', 'offline']);
  note(rowOfDate('2026-10-31'), rowOfDate('2026-11-01'), ['clocks fall', 'back Nov 1']);
  note(rowOfDate('2026-10-17'), rowOfDate('2026-10-18'), ['a weekend']);
  // the median weekday morning rise, before and after the clocks changed
  const riseLine = (h, d0, d1, label) => {
    const x = padL + ((h - 6) * 3600 / stepSec) * cell;
    out.push(`<line x1="${r1(x)}" y1="${top + d0 * cell}" x2="${r1(x)}" y2="${top + (d1 + 1) * cell}" stroke="#ffffff" stroke-width="2" stroke-dasharray="5 3"/>`);
    if (label) out.push(text(x - 6, top + d0 * cell + 14, label, { size: 12.5, weight: 700, anchor: 'end', fill: '#ffffff' }));
  };
  riseLine(medianOf(before), rowOfDate('2026-10-12'), rowOfDate('2026-10-30'), 'morning rise');
  riseLine(medianOf(after), rowOfDate('2026-11-02'), rowOfDate('2026-11-20'), '');
  // legend: the color scale
  const ly = top + plotH + 24;
  out.push(text(padL, ly + 11, 'Quieter', { size: 12.5, fill: C.muted }));
  const bx = padL + 58;
  const n = 60;
  for (let i = 0; i < n; i++) out.push(`<rect x="${r1(bx + i * 4)}" y="${ly}" width="4.2" height="13" fill="${viridisHex(i / (n - 1))}"/>`);
  out.push(text(bx + n * 4 + 8, ly + 11, 'Busier', { size: 12.5, fill: C.muted }));
  for (const v of [1, 2, 5, 10]) {
    const x = bx + (Math.log(v / lo) / Math.log(hi / lo)) * n * 4;
    out.push(`<line x1="${r1(x)}" y1="${ly + 13}" x2="${r1(x)}" y2="${ly + 18}" stroke="${C.muted}"/>`);
    out.push(text(x, ly + 31, `${v}×`, { size: 12, fill: C.muted, anchor: 'middle' }));
  }
  out.push(text(bx + n * 4 + 64, ly + 11, '× the quiet level (1 to 4 am)', { size: 12.5, fill: C.muted }));
  out.push(`<rect x="${padL}" y="${ly + 38}" width="6" height="${cell - 1}" fill="#b45309"/>`);
  out.push(text(padL + 12, ly + 44, 'Saturday or Sunday', { size: 12.5, fill: C.muted }));
  out.push(`<rect x="${padL + 150}" y="${ly + 37}" width="12" height="${cell + 1}" fill="#eef0f3" stroke="${C.border}"/>`);
  out.push(text(padL + 168, ly + 44, 'no data', { size: 12.5, fill: C.muted }));
  out.push(`<line x1="${padL + 250}" y1="${ly + 40}" x2="${padL + 270}" y2="${ly + 40}" stroke="${C.trace}" stroke-width="2" stroke-dasharray="5 3"/>`);
  out.push(text(padL + 276, ly + 44, 'weekday morning rise (median)', { size: 12.5, fill: C.muted }));
  out.push(text(padL, ly + 64, '06:00 UTC is midnight in Utah until November 1 (MDT) and 11 pm after it (MST).', { size: 12.5, fill: C.muted }));
  out.push('</svg>');
  write('plots-carpet.svg', out.join('\n'));
}

const ALL = { helicorder, carpet };
for (const [name, fn] of Object.entries(ALL)) if (!only.length || only.includes(name)) await fn();
