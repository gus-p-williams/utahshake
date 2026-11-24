// Make the real-data figures for the "Reading a seismogram" page (docs/theory/seismograms.md).
//
//   node tools/figures/seismogram-figures.mjs            all figures
//   node tools/figures/seismogram-figures.mjs hum wind   only some (names below)
//   ... --refetch                                         recompute the week-long noise levels
//
// Waveforms: University of Utah (UU) stations via EarthScope FDSN; events and picks: USGS
// ComCat; wind: Milford airport (MLF) weather station via the Iowa Environmental Mesonet.
// Downloads are cached in tools/figures/.cache/ (git-ignored, about 0.5 GB for everything).
// The day-long noise levels (wind, people) are also kept in tools/figures/data/*.json, so those
// figures redraw without downloading a week of data. No credit text in the images: the page
// captions carry it. Output: docs/theory/img/<name>.svg
import fs from 'node:fs';
import { C, figure, r1 } from './svg-traces.mjs';
import { analystPicks, event, events, fetchCached, stationCoords, waveforms } from './fdsn-cache.mjs';
import { hourBars, localParts, png, stack, text, timePanels, card, viridis, viridisHex } from './svg-charts.mjs';
import { median, spectrogram, windowedRms } from './spectra.mjs';

const { filteredData } = await import('../../docs/app/js/data/filters.js');
const { distanceKm } = await import('../../docs/app/js/lib/geo.js');
const { peakAbs } = await import('../../docs/app/js/lib/signal.js');
const { REGION } = await import('../../docs/app/js/config.js');

const outDir = new URL('../../docs/theory/img/', import.meta.url);
const dataDir = new URL('./data/', import.meta.url);
fs.mkdirSync(outDir, { recursive: true });
fs.mkdirSync(dataDir, { recursive: true });
const args = process.argv.slice(2);
const REFETCH = args.includes('--refetch');
const only = args.filter((a) => !a.startsWith('--'));
const MINUS = '−';
const EN = '–';
const fmtInt = (v) => Math.round(v).toLocaleString('en-US');
/** "October 26, 2026, 5:33 pm" in Utah time. */
function when(ms) {
  const p = localParts(ms);
  const month = new Date(ms).toLocaleString('en-US', { timeZone: 'America/Denver', month: 'long' });
  return `${month} ${p.d}, ${p.y}, ${p.h % 12 || 12}:${String(p.mi).padStart(2, '0')} ${p.h >= 12 ? 'pm' : 'am'}`;
}
const MPH_PER_KNOT = 1.15078;

function write(name, svg) {
  fs.writeFileSync(new URL(name, outDir), svg + '\n');
  console.log(`wrote docs/theory/img/${name} (${(svg.length / 1024).toFixed(0)} KB)`);
}

/** A record as figure() wants it: data filtered (preset {} = mean removed only). */
function rec(trace, preset, extra = {}) {
  return { label: trace.cha, startMs: trace.startMs, sampleRate: trace.sampleRate, data: filteredData(trace, preset), ...extra };
}
const RAW = {};
const BP = { lo: 1, hi: 10 };
const peakIn = (r, fromMs, toMs) => peakAbs(r.data, Math.floor((fromMs - r.startMs) / 1000 * r.sampleRate),
  Math.ceil((toMs - r.startMs) / 1000 * r.sampleRate));

/**
 * Noise level over time: for each step (default 15 min), the median of the 1-minute RMS values
 * in the 1–10 Hz band. Filtered one hour at a time with 10 minutes of padding on each side, so the
 * filter's tapered ends never fall inside the hour. Gaps (NaN) are skipped.
 */
async function noiseLevels({ sta, loc = '*', cha, t0, t1, preset = BP, stepSec = 900 }) {
  const pad = 600e3;
  const out = [];
  for (let day = t0; day < t1; day += 86400e3) {
    const [tr] = await waveforms({ sta, loc, cha, startMs: day - pad, endMs: day + 86400e3 + pad });
    for (let h = 0; h < 24 && day + h * 3600e3 < t1; h++) {
      const a = Math.round((h * 3600e3) / 1000 * (tr?.sampleRate ?? 100));
      const n = Math.round(((3600e3 + 2 * pad) / 1000) * (tr?.sampleRate ?? 100));
      let rms1 = new Float64Array(60).fill(NaN);
      if (tr) {
        const slice = { ...tr, data: tr.data.slice(a, a + n) };
        const f = filteredData(slice, preset);
        const off = Math.round((pad / 1000) * tr.sampleRate);
        rms1 = windowedRms(f.subarray(off, off + Math.round(3600 * tr.sampleRate)), tr.sampleRate, 60);
      }
      const per = stepSec / 60;
      for (let s = 0; s < 60 / per; s++) {
        out.push({ t: day + h * 3600e3 + s * stepSec * 1000 + (stepSec * 1000) / 2, v: median(rms1.slice(s * per, (s + 1) * per)) });
      }
    }
  }
  return out;
}

/** Load a computed product from tools/figures/data/, or compute and save it. */
async function kept(name, compute) {
  const file = new URL(name, dataDir);
  if (!REFETCH && fs.existsSync(file)) return JSON.parse(fs.readFileSync(file, 'utf8'));
  const value = await compute();
  // times (t) stay exact; values (v) keep 4 significant digits
  fs.writeFileSync(file, JSON.stringify(value, (k, v) => (k === 'v' && Number.isFinite(v) ? +v.toPrecision(4) : v)) + '\n');
  console.log(`wrote tools/figures/data/${name}`);
  return value;
}

// ---------------------------------------------------------------------------------------------
// Ocean hum: TMU (stands in for Wasatch Academy), two minutes on a winter and a summer night.
async function hum() {
  const sta = 'TMU';
  const winterMs = Date.parse('2025-12-15T09:00:00Z'); // 2 am MST
  const summerMs = Date.parse('2026-07-15T09:00:00Z'); // 3 am MDT
  const len = 120e3;
  const [w] = await waveforms({ sta, cha: 'HHZ', startMs: winterMs - 60e3, endMs: winterMs + len + 60e3 });
  const [s] = await waveforms({ sta, cha: 'HHZ', startMs: summerMs - 60e3, endMs: summerMs + len + 60e3 });
  const wRaw = rec(w, RAW);
  const amp = peakIn(wRaw, winterMs, winterMs + len);
  // shift the summer record onto the winter time axis
  const sRaw = { ...rec(s, RAW), startMs: s.startMs - (summerMs - winterMs) };
  const wBp = rec(w, BP);
  // How often the hum repeats: count the waves (upward zero crossings of the winter record,
  // smoothed over 1 s so small high-frequency wiggles don't count).
  const sr = w.sampleRate;
  const i0 = Math.round((winterMs - w.startMs) / 1000 * sr);
  const smooth = (i) => { let s = 0; for (let j = i - sr / 2; j < i + sr / 2; j++) s += wRaw.data[j]; return s / sr; };
  const ups = [];
  let prev = smooth(i0);
  for (let i = i0 + 1; i < i0 + 120 * sr; i++) {
    const v = smooth(i);
    if (prev < 0 && v >= 0 && (!ups.length || (i - i0) / sr - ups.at(-1) > 1.5)) ups.push((i - i0) / sr);
    prev = v;
  }
  const period = (ups.at(-1) - ups[0]) / (ups.length - 1);
  // the arrow spans five waves starting near the middle of the record
  const k0 = ups.findIndex((t) => t > 40);
  const run = k0 >= 0 && ups.length > k0 + 5 ? [ups[k0], ups[k0 + 5]] : null;
  console.log(`hum: ${ups.length - 1} waves in ${(ups.at(-1) - ups[0]).toFixed(1)} s: one every ${period.toFixed(1)} s; peak ${fmtInt(amp)} counts`);
  const svg = figure({
    traces: [
      { ...wRaw, label: 'Winter night (December 15, 2025, 2 am)', amp, rightLabel: 'raw' },
      { ...sRaw, label: 'Summer night (July 15, 2026, 3 am)', amp, rightLabel: 'raw, same scale' },
      { ...wBp, label: 'Winter night again, filtered 1–10 Hz', amp, rightLabel: 'same scale' },
    ],
    originMs: winterMs, fromSec: 0, toSec: 120, top: 70, trackH: 84, axisLabel: 'seconds', axisLabelWidth: 60,
    title: 'Ocean hum at station TMU: two minutes of the vertical (HHZ) sensor',
    intervals: run ? [{ from: run[0], to: run[1], y: -16, label: `5 waves in ${Math.round(run[1] - run[0])} seconds` }] : [],
  });
  write('ocean-hum.svg', svg);
}

// ---------------------------------------------------------------------------------------------
// Wind: station FOR8 near Milford, four days in February 2026, with the airport's wind.
async function wind() {
  const t0 = Date.parse('2026-02-16T07:00:00Z'); // midnight MST, Monday Feb 16
  const t1 = t0 + 4 * 86400e3;
  const data = await kept('wind-for8-2026-02.json', async () => {
    const q = new URLSearchParams({ station: 'MLF', data: 'sknt', year1: '2026', month1: '2', day1: '15',
      year2: '2026', month2: '2', day2: '21', tz: 'Etc/UTC', format: 'onlycomma', latlon: 'no', missing: 'M',
      trace: 'T', direct: 'no' });
    const csv = (await fetchCached(`https://mesonet.agron.iastate.edu/cgi-bin/request/asos.py?${q}&report_type=3&report_type=4`)).toString('utf8');
    const windObs = csv.trim().split('\n').slice(1).map((l) => l.split(',')).filter((r) => r[2] !== 'M')
      .map(([, t, kn]) => ({ t: Date.parse(t.replace(' ', 'T') + ':00Z'), v: +kn * MPH_PER_KNOT }))
      .filter((p) => p.t >= t0 && p.t <= t1);
    const noise = await noiseLevels({ sta: 'FOR8', cha: 'HHZ', t0, t1 });
    return { station: 'UU.FOR8.01.HHZ', band: '1-10 Hz', windStation: 'MLF', wind: windObs, noise };
  });
  const calmMs = Date.parse('2026-02-19T08:00:00Z'); // 1 am MST
  const windyMs = Date.parse('2026-02-18T08:00:00Z');
  const windAt = (t) => data.wind.filter((p) => Math.abs(p.t - t) < 3600e3).map((p) => p.v);
  const wCalm = median(windAt(calmMs + 1800e3));
  const wWindy = median(windAt(windyMs + 1800e3));
  const nAt = (t) => data.noise.reduce((a, b) => (Math.abs(b.t - t) < Math.abs(a.t - t) ? b : a)).v;
  const chart = timePanels({
    title: 'Wind and ground noise near Milford, Utah (February 16–19, 2026)',
    t0, t1, panelH: 120,
    panels: [
      { label: 'Wind speed at Milford airport', unit: 'miles per hour', values: data.wind, max: 45, color: '#0f766e' },
      { label: 'Ground noise at station FOR8, filtered 1–10 Hz', unit: 'counts', values: data.noise, max: 60,
        color: C.trace,
        notes: [
          { t: calmMs + 1800e3, v: nAt(calmMs + 1800e3), text: 'A', dx: 0, dy: -34, anchor: 'middle' },
          { t: windyMs + 1800e3, v: nAt(windyMs + 1800e3), text: 'B', dx: 0, dy: -40, anchor: 'middle' },
        ] },
    ],
    footer: [{ text: 'Grey: night (8 pm to 6 am). Noise: the typical shaking in each 15 minutes (median of 1-minute RMS).' }],
  });
  const [calm] = await waveforms({ sta: 'FOR8', cha: 'HHZ', startMs: calmMs - 60e3, endMs: calmMs + 120e3 });
  const [windy] = await waveforms({ sta: 'FOR8', cha: 'HHZ', startMs: windyMs - 60e3, endMs: windyMs + 120e3 });
  const rC = rec(calm, BP);
  const rW = { ...rec(windy, BP), startMs: windy.startMs + (calmMs - windyMs) };
  const amp = peakIn(rW, calmMs, calmMs + 60e3);
  console.log(`wind: calm ${wCalm.toFixed(0)} mph, windy ${wWindy.toFixed(0)} mph; noise A ${nAt(calmMs + 1800e3)?.toFixed(1)}, B ${nAt(windyMs + 1800e3)?.toFixed(1)}`);
  const records = figure({
    traces: [
      { ...rC, label: `A: calm night (February 19, 1 am), wind ${Math.round(wCalm)} mph`, amp, rightLabel: 'filtered 1–10 Hz' },
      { ...rW, label: `B: windy night (February 18, 1 am), wind ${Math.round(wWindy)} mph`, amp, rightLabel: 'same scale' },
    ],
    originMs: calmMs, fromSec: 0, toSec: 60, trackH: 84, axisLabel: 'seconds', axisLabelWidth: 60,
    title: 'One minute at station FOR8 on each night',
  });
  write('wind-noise.svg', stack([chart, records]));
}

// ---------------------------------------------------------------------------------------------
// People and machines: one week at HEB, near Heber City.
async function people() {
  const t0 = Date.parse('2026-09-28T06:00:00Z'); // midnight MDT, Monday Sep 28
  const t1 = t0 + 7 * 86400e3;
  const data = await kept('people-heb-2026-09.json', async () => ({
    station: 'UU.HEB.01.EHZ', band: '1-10 Hz',
    noise: await noiseLevels({ sta: 'HEB', loc: '01', cha: 'EHZ', t0, t1 }),
  }));
  const night = median(data.noise.filter((p) => localParts(p.t).h < 4).map((p) => p.v));
  const vals = data.noise.map((p) => ({ t: p.t, v: p.v / night }));
  const dayMed = (wd) => median(vals.filter((p) => { const lp = localParts(p.t); return lp.wd === wd && lp.h >= 10 && lp.h < 16; }).map((p) => p.v));
  const wk = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'].map(dayMed);
  const sat = dayMed('Sat');
  const sun = dayMed('Sun');
  console.log(`people: night level ${night.toFixed(2)} counts; weekday 10am-4pm ${wk.map((v) => v.toFixed(1)).join(' ')}; Sat ${sat.toFixed(1)}; Sun ${sun.toFixed(1)}`);
  const sunNoon = t0 + 6 * 86400e3 + 13 * 3600e3;
  const thuNoon = t0 + 3 * 86400e3 + 13 * 3600e3;
  const near = (t) => vals.reduce((a, b) => (Math.abs(b.t - t) < Math.abs(a.t - t) ? b : a));
  const svg = timePanels({
    title: 'One week of ground noise at station HEB, near Heber City (September 28 – October 4, 2026)',
    t0, t1, panelH: 190,
    shade: [{ from: t0 + 5 * 86400e3, to: t1, fill: '#fdf1dc', label: 'weekend', labelColor: '#92400e' }],
    panels: [{
      label: 'Ground noise, filtered 1–10 Hz, compared with a quiet night', unit: '× the night level',
      values: vals, max: 12, color: C.trace,
      notes: [
        { ...near(thuNoon), text: `weekday afternoons: about ${Math.round(median(wk))}×`, dx: 40, dy: -18 },
        { ...near(sunNoon), text: `Sunday: about ${Math.round(sun * 2) / 2}×`, dx: -44, dy: -40 },
      ],
    }],
    footer: [{ text: 'Grey: night (8 pm to 6 am). 1× = the typical level between midnight and 4 am.' }],
  });
  write('people-week.svg', svg);
}

// ---------------------------------------------------------------------------------------------
// Other quakes: a local, a regional and a distant quake at the same station (TMU).
async function quakes() {
  const sta = 'TMU';
  const c = await stationCoords('UU', sta);
  const cards = [];
  const specs = [
    { id: 'uu80124816', from: -5, to: 45, unit: 1, label: 'seconds after the quake', w: 150,
      what: (ev, d) => `A small quake ${Math.round(d)} km away (magnitude ${ev.mag.toFixed(1)}): 50 seconds` },
    { id: 'nn00914068', from: -20, to: 340, unit: 1, label: 'seconds after the quake', w: 150,
      what: (ev, d) => `A regional quake in western Nevada, ${fmtInt(Math.round(d / 10) * 10)} km away (magnitude ${ev.mag.toFixed(1)}): 6 minutes`,
      // Picked on the record (0.5 s RMS of the 1–10 Hz traces): P starts at 93 s on HHZ, the S burst
      // at 194 s on all three. iasp91 (ObsPy TauP) gives Pn 90 s; its Sn (161 s) is too weak to see.
      marks: [{ sec: 93, color: C.p, label: 'P' }, { sec: 194, color: C.s, label: 'S' }],
      bands: [{ from: 215, to: 340, fill: 'rgba(91,100,114,0.08)', label: 'surface waves', labelColor: C.muted }] },
    { id: 'us6000qw60', from: -120, to: 3600, unit: 60, label: 'minutes after the quake', w: 150,
      what: (ev, d) => `A distant quake off Kamchatka, Russia, ${fmtInt(Math.round(d / 100) * 100)} km away (magnitude ${ev.mag.toFixed(1)}): 1 hour`,
      // iasp91 travel times (ObsPy TauP): P 596 s, S 1081 s
      marks: [{ sec: 596, color: C.p, label: 'P' }, { sec: 1081, color: C.s, label: 'S' }],
      bands: [{ from: 1500, to: 3600, fill: 'rgba(91,100,114,0.08)', label: 'surface waves, for half an hour', labelColor: C.muted }] },
  ];
  for (const s of specs) {
    const ev = await event(s.id);
    const d = distanceKm(ev.lat, ev.lon, c.lat, c.lon);
    const [z] = await waveforms({ sta, cha: 'HHZ', startMs: ev.timeMs + s.from * 1000 - 60e3, endMs: ev.timeMs + s.to * 1000 + 60e3 });
    console.log(`quakes: ${s.id} ${ev.title}, ${d.toFixed(0)} km`);
    cards.push(figure({
      traces: [{ ...rec(z, RAW), label: 'HHZ, raw' }, { ...rec(z, BP), label: 'HHZ, filtered 1–10 Hz' }],
      originMs: ev.timeMs, fromSec: s.from, toSec: s.to, unit: s.unit, axisLabel: s.label, axisLabelWidth: s.w,
      title: s.what(ev, d), top: s.bands ? 58 : 40, trackH: 70, marks: s.marks || [], bands: s.bands || [],
    }));
  }
  write('three-quakes.svg', stack(cards));
}

// ---------------------------------------------------------------------------------------------
// Blasts: when they happen (ComCat event types), and one blast next to a quake of the same size.
async function blastHours() {
  const common = { minlatitude: REGION.minLat, maxlatitude: REGION.maxLat, minlongitude: REGION.minLon,
    maxlongitude: REGION.maxLon, starttime: '2015-01-01', endtime: '2026-11-24' };
  const types = ['quarry blast', 'mining explosion', 'explosion', 'chemical explosion'];
  const blasts = (await Promise.all(types.map((eventtype) => events({ ...common, eventtype })))).flat();
  const quakes = await events({ ...common, eventtype: 'earthquake', minmagnitude: 1.5 });
  const hours = (evs) => { const h = new Array(24).fill(0); for (const e of evs) h[localParts(e.timeMs).h]++; return h; };
  const hb = hours(blasts);
  const hq = hours(quakes);
  const share = (h, a, b) => h.slice(a, b).reduce((x, y) => x + y, 0) / h.reduce((x, y) => x + y, 0);
  const wkend = blasts.filter((e) => ['Sat', 'Sun'].includes(localParts(e.timeMs).wd)).length;
  const byType = Object.fromEntries(types.map((t) => [t, blasts.filter((e) => e.type === t).length]));
  console.log(`blast hours: ${blasts.length} blasts ${JSON.stringify(byType)}, ${(100 * share(hb, 8, 18)).toFixed(0)}% 8am-6pm, ${wkend} on weekends; ${quakes.length} quakes, ${(100 * share(hq, 8, 18)).toFixed(0)}% 8am-6pm`);
  write('blast-hours.svg', hourBars({
    title: 'What time of day? Utah events, 2015 to November 2026',
    series: [
      { label: `Blasts: ${fmtInt(blasts.length)} events the catalog marks as blasts or explosions`, counts: hb, color: '#b45309' },
      { label: `Earthquakes of magnitude 1.5 and up: ${fmtInt(quakes.length)} events`, counts: hq, color: '#475569' },
    ],
    footer: [{ text: 'Bars: share of each group in each hour (Utah time). Area: the University of Utah monitoring region.' }],
  }));
}

async function blastRecord() {
  const sta = 'FLU';
  const ids = { blast: 'uu80161881', quake: 'uu80120191' };
  const c = await stationCoords('UU', sta);
  const traces = [];
  const info = {};
  for (const [kind, id] of Object.entries(ids)) {
    const ev = await event(id);
    const d = distanceKm(ev.lat, ev.lon, c.lat, c.lon);
    const [z] = await waveforms({ sta, loc: '02', cha: 'EHZ', startMs: ev.timeMs - 60e3, endMs: ev.timeMs + 90e3 });
    const picks = (await analystPicks(id))[`UU.${sta}`] || {};
    info[kind] = { ev, d, pSec: picks.P ? (picks.P - ev.timeMs) / 1000 : null, sSec: picks.S ? (picks.S - ev.timeMs) / 1000 : null };
    const lp = localParts(ev.timeMs);
    traces.push({ ...rec(z, RAW), startMs: z.startMs - ev.timeMs, amp: undefined,
      label: `${kind === 'blast' ? 'Quarry blast' : 'Earthquake'}, magnitude ${ev.mag.toFixed(1)}, ${Math.round(d)} km away`,
      rightLabel: `${lp.wd} ${when(ev.timeMs)}` });
    console.log(`blast record: ${kind} ${id} ${ev.title} ${ev.type} ${d.toFixed(1)} km, depth ${ev.depthKm} km, picks at ${sta}: P ${info[kind].pSec} S ${info[kind].sSec}`);
  }
  // Each trace scaled to fit, with room above for its labels.
  for (const t of traces) t.amp = 1.25 * peakAbs(t.data, Math.round(1 * t.sampleRate), Math.round(90 * t.sampleRate));
  const svg = figure({
    traces, originMs: 0, fromSec: -2, toSec: 25, trackH: 100, top: 40,
    title: `A quarry blast and an earthquake of the same size, at station ${sta} (raw records)`,
  });
  write('blast-vs-quake.svg', svg);
}

// ---------------------------------------------------------------------------------------------
// Instrument problems: clipping and a dead channel (Magna 2020), a gap (SGU, 2026).
async function problems() {
  const magna = await event('uu60363602');
  const cards = [];
  // (a) clipping: SAIU, two recorders on the same sensor type at one site, 14.5 km from Magna
  {
    const tr = await waveforms({ sta: 'SAIU', cha: 'EHZ', startMs: magna.timeMs - 60e3, endMs: magna.timeMs + 120e3 });
    const r16 = tr.find((t) => t.loc === '01');
    const r24 = tr.find((t) => t.loc === '02');
    const max16 = Math.max(...r16.data);
    const n16 = r16.data.filter((v) => v >= 32767 || v <= -32768).length;
    console.log(`problems: SAIU 01 max ${max16}, ${n16} samples at the limit; SAIU 02 peak ${fmtInt(peakAbs(r24.data))}`);
    // raw counts (no mean removal), so the flat tops sit exactly at the digitizer's limit
    const d24 = filteredData(r24, RAW);
    const t16 = { label: 'SAIU 01.EHZ: 16-bit recorder', startMs: r16.startMs, sampleRate: r16.sampleRate, data: r16.data, amp: 48000, rightLabel: 'flat tops at ±32,767 counts' };
    const t24 = { label: 'SAIU 02.EHZ: 24-bit recorder', startMs: r24.startMs, sampleRate: r24.sampleRate, data: d24, amp: 1.4 * peakAbs(d24), rightLabel: `peak ${fmtInt(peakAbs(d24))} counts` };
    cards.push(figure({ traces: [t16, t24], originMs: magna.timeMs, fromSec: 4, toSec: 9, trackH: 100,
      title: 'Clipped: the Magna quake (magnitude 5.7, 2020), 14.5 km away, on two recorders at one site' }));
  }
  // (b) dead channel: SUU (flat) next to NLU, 25 km away, during the Magna quake
  {
    const [suu] = await waveforms({ sta: 'SUU', cha: 'EHZ', startMs: magna.timeMs - 60e3, endMs: magna.timeMs + 120e3 });
    const [nlu] = await waveforms({ sta: 'NLU', cha: 'HHZ', startMs: magna.timeMs - 60e3, endMs: magna.timeMs + 120e3 });
    const lo = Math.min(...suu.data);
    const hi = Math.max(...suu.data);
    console.log(`problems: SUU range ${lo}..${hi} counts`);
    const n = rec(nlu, RAW);
    cards.push(figure({ traces: [
      { ...n, label: 'NLU.HHZ: working', rightLabel: `peak ${fmtInt(peakAbs(n.data))} counts` },
      { ...rec(suu, RAW), label: 'SUU.EHZ: dead', amp: peakAbs(n.data) / 1000, rightLabel: `${String(lo).replace('-', MINUS)} to +${hi} counts the whole time (drawn 1,000× bigger)` },
    ], originMs: magna.timeMs, fromSec: 0, toSec: 90, trackH: 70,
    title: 'Dead: the same quake at two stations about 90 km away, 25 km apart' }));
  }
  // (c) gaps: SGU (stands in for Gunnison Valley), October 26, 2026
  {
    const t0 = Date.parse('2026-10-26T16:10:00Z');
    const [sgu] = await waveforms({ sta: 'SGU', cha: 'HHZ', startMs: t0 - 60e3, endMs: t0 + 180e3 });
    const r = rec(sgu, BP);
    const runs = [];
    for (let i = 0; i < r.data.length; i++) {
      if (!Number.isNaN(r.data[i])) continue;
      const s = i;
      while (i < r.data.length && Number.isNaN(r.data[i])) i++;
      runs.push([(sgu.startMs + (s / sgu.sampleRate) * 1000 - t0) / 1000, (i - s) / sgu.sampleRate]);
    }
    console.log(`problems: SGU gaps ${runs.map(([a, b]) => `${a.toFixed(1)}s+${b.toFixed(1)}s`).join(', ')}`);
    cards.push(figure({ traces: [{ ...r, label: 'SGU.HHZ, filtered 1–10 Hz', rightLabel: 'October 26, 2026, 10:10 am' }],
      originMs: t0, fromSec: 0, toSec: 120, trackH: 70, top: 58, axisLabel: 'seconds', axisLabelWidth: 60,
      title: 'Gaps: missing data at station SGU',
      bands: runs.filter(([a]) => a > 0 && a < 120).map(([a, len], k) => ({ from: a, to: a + len, fill: 'rgba(192,38,45,0.08)',
        label: k === 0 ? `${Math.round(len)} s missing` : `${Math.round(len)} s`, labelColor: C.s })),
    }));
  }
  write('instrument-problems.svg', stack(cards));
}

// ---------------------------------------------------------------------------------------------
// Filters and spectrograms: a small quake hidden by the ocean hum at TMU (W6) and its spectrogram.
async function hidden() {
  const sta = 'TMU';
  const ev = await event('uu80130531');
  const c = await stationCoords('UU', sta);
  const d = distanceKm(ev.lat, ev.lon, c.lat, c.lon);
  const from = -60;
  const to = 120;
  const [z] = await waveforms({ sta, cha: 'HHZ', startMs: ev.timeMs + from * 1000 - 300e3, endMs: ev.timeMs + to * 1000 + 300e3 });
  const raw = rec(z, RAW);
  const bp = rec(z, BP);
  const picks = (await analystPicks(ev.id))[`UU.${sta}`] || {};
  console.log(`hidden: ${ev.title} ${d.toFixed(1)} km; picks at ${sta}: P ${picks.P ? ((picks.P - ev.timeMs) / 1000).toFixed(2) : '-'} S ${picks.S ? ((picks.S - ev.timeMs) / 1000).toFixed(2) : '-'}`);
  const width = 760;
  const traces = figure({
    traces: [
      { ...raw, label: 'HHZ, raw', rightLabel: `peak ${fmtInt(peakIn(raw, ev.timeMs + from * 1000, ev.timeMs + to * 1000))} counts` },
      { ...bp, label: 'HHZ, filtered 1–10 Hz', rightLabel: `peak ${fmtInt(peakIn(bp, ev.timeMs + from * 1000, ev.timeMs + to * 1000))} counts` },
    ],
    originMs: ev.timeMs, fromSec: from, toSec: to, trackH: 84, width,
    title: `A magnitude ${ev.mag.toFixed(1)} quake ${Math.round(d)} km from station TMU (${when(ev.timeMs)})`,
    marks: picks.P ? [{ sec: (picks.P - ev.timeMs) / 1000, color: C.p, label: 'P' }, ...(picks.S ? [{ sec: (picks.S - ev.timeMs) / 1000, color: C.s, label: 'S' }] : [])] : [],
  });
  // Spectrogram: 20.48 s windows every 0.5 s, log frequency 0.1–50 Hz, power in dB.
  const sr = z.sampleRate;
  const nfft = 2048;
  const step = Math.round(sr * 0.5);
  const a = Math.round(((ev.timeMs + from * 1000 - z.startMs) / 1000) * sr) - nfft / 2;
  const b = Math.round(((ev.timeMs + to * 1000 - z.startMs) / 1000) * sr) + nfft / 2;
  const spec = spectrogram(raw.data.slice(a, b), sr, nfft, step);
  const fLo = 0.1;
  const fHi = 50;
  const rows = 140;
  const cols = spec.columns.length;
  const db = [];
  for (let r = 0; r < rows; r++) {
    const f = fHi * (fLo / fHi) ** ((r + 0.5) / rows); // row 0 = top = highest frequency
    const k = f * nfft / sr;
    const k0 = Math.floor(k);
    const fr = k - k0;
    db.push(spec.columns.map((col) => (col ? 10 * Math.log10((1 - fr) * col[k0] + fr * col[Math.min(k0 + 1, col.length - 1)]) : NaN)));
  }
  const all = db.flat().filter(Number.isFinite).sort((x, y) => x - y);
  const lo = all[Math.floor(all.length * 0.02)];
  const hi = all[Math.floor(all.length * 0.995)];
  const rgb = new Uint8Array(cols * rows * 3);
  for (let r = 0; r < rows; r++) for (let k = 0; k < cols; k++) {
    const [R, G, B] = viridis((db[r][k] - lo) / (hi - lo));
    rgb.set([R, G, B], (r * cols + k) * 3);
  }
  const img = png(cols, rows, rgb).toString('base64');
  const padL = 10;
  const padR = 10;
  const w = width - padL - padR;
  const top = 34;
  const h = 230;
  const bar = 22;
  const height = top + h + 40 + bar + 30;
  const x = (sec) => padL + ((sec - from) / (to - from)) * w;
  const y = (f) => top + (Math.log(fHi / f) / Math.log(fHi / fLo)) * h;
  // the image's first column is centred nfft/2 samples after slice start = at `from` seconds
  const out = card(width, height, 'The same three minutes as a spectrogram (raw record)');
  const x0 = x(from + (spec.times[0] - nfft / 2 / sr) - step / sr / 2);
  const x1 = x(from + (spec.times.at(-1) - nfft / 2 / sr) + step / sr / 2);
  out.push(`<image x="${r1(x0)}" y="${top}" width="${r1(x1 - x0)}" height="${h}" preserveAspectRatio="none" href="data:image/png;base64,${img}"/>`);
  out.push(`<rect x="${padL}" y="${top}" width="${w}" height="${h}" fill="none" stroke="${C.border}"/>`);
  for (const f of [0.2, 0.5, 1, 2, 5, 10, 20]) {
    out.push(`<line x1="${padL + w - 6}" y1="${r1(y(f))}" x2="${padL + w}" y2="${r1(y(f))}" stroke="#ffffff"/>`);
    out.push(text(padL + w - 9, y(f) + 4, `${f} Hz`, { size: 12, weight: 600, fill: '#ffffff', anchor: 'end' }));
  }
  // the 1–10 Hz band the filter keeps
  out.push(`<rect x="${padL + 1}" y="${r1(y(10))}" width="${w - 2}" height="${r1(y(1) - y(10))}" fill="none" stroke="#ffffff" stroke-width="2" stroke-dasharray="7 5"/>`);
  out.push(text(padL + 8, y(10) + 16, 'the band a 1–10 Hz filter keeps', { size: 13, weight: 700, fill: '#ffffff' }));
  out.push(text(padL + 8, y(0.17) + 4, 'ocean hum: always there', { size: 13, weight: 700, fill: '#ffffff' }));
  const qx = x(picks.P ? (picks.P - ev.timeMs) / 1000 : 6);
  out.push(text(qx + 6, y(30), 'the quake', { size: 13, weight: 700, fill: '#ffffff' }));
  const step2 = 20;
  for (let t = Math.ceil(from / step2) * step2 + step2; t < to; t += step2) {
    out.push(text(x(t), top + h + 16, String(t).replace('-', MINUS), { size: 12, fill: C.muted, anchor: 'middle' }));
  }
  out.push(text(width - padR - 2, top + h + 32, 'seconds after the quake', { size: 12, fill: C.muted, anchor: 'end' }));
  // colour bar
  const by = top + h + 44;
  const n = 60;
  out.push(text(padL + 2, by + 11, 'Colour: how strong the shaking is at each frequency.', { size: 12.5, fill: C.note }));
  const bx = padL + 336;
  out.push(text(bx - 8, by + 11, 'weak', { size: 12, fill: C.muted, anchor: 'end' }));
  for (let i = 0; i < n; i++) out.push(`<rect x="${r1(bx + i * 3)}" y="${by}" width="3.2" height="12" fill="${viridisHex(i / (n - 1))}"/>`);
  out.push(text(bx + n * 3 + 8, by + 11, 'strong', { size: 12, fill: C.muted }));
  out.push('</svg>');
  console.log(`hidden: spectrogram ${cols}x${rows}, dB range ${lo.toFixed(0)} to ${hi.toFixed(0)}`);
  write('hidden-quake.svg', stack([traces, out.join('\n')]));
}

// ---------------------------------------------------------------------------------------------
// Can you tell? Four unlabelled records. Answers are on the page, in a collapsed box.
async function mystery() {
  const cards = [];
  const make = (letter, traces, originMs, fromSec, toSec, unit = 1, hint = '') => {
    if (traces.some((t) => !t.data)) throw new Error(`mystery record ${letter}: no data`);
    return figure({ traces, originMs, fromSec, toSec, unit, trackH: 90, top: 40,
      axisLabel: unit === 60 ? 'minutes' : 'seconds', axisLabelWidth: 70, title: `Record ${letter}${hint}` });
  };
  // A: a distant quake (Panama, magnitude 7.7, 2026) at SGU, raw
  {
    const ev = await event('us6000u18k');
    const [z] = await waveforms({ sta: 'SGU', cha: 'HHZ', startMs: ev.timeMs + 360e3, endMs: ev.timeMs + 2880e3 });
    cards.push(make('A', [{ ...rec(z, RAW), label: 'HHZ, raw' }], ev.timeMs + 420e3, 0, 2400, 60));
  }
  // B: ocean hum only, a quiet winter night at SGU, raw
  {
    const t0 = Date.parse('2025-12-15T09:10:00Z');
    const [z] = await waveforms({ sta: 'SGU', cha: 'HHZ', startMs: t0 - 60e3, endMs: t0 + 180e3 });
    cards.push(make('B', [{ ...rec(z, RAW), label: 'HHZ, raw' }], t0, 0, 90, 1, ': 2 am'));
  }
  // C: a local quake clipped on a 16-bit recorder (Magna 2020 at WTU, 35 km)
  {
    const ev = await event('uu60363602');
    const [z] = await waveforms({ sta: 'WTU', cha: 'EHZ', startMs: ev.timeMs - 60e3, endMs: ev.timeMs + 120e3 });
    cards.push(make('C', [{ label: 'EHZ, raw', startMs: z.startMs, sampleRate: z.sampleRate, data: z.data, amp: 36000 }], ev.timeMs, -5, 40));
  }
  // D: wind (FOR8, the windy night above), filtered 1–10 Hz
  {
    const t0 = Date.parse('2026-02-18T08:20:00Z');
    const [z] = await waveforms({ sta: 'FOR8', cha: 'HHZ', startMs: t0 - 60e3, endMs: t0 + 180e3 });
    cards.push(make('D', [{ ...rec(z, BP), label: 'HHZ, filtered 1–10 Hz' }], t0, 0, 90, 1, ': 1:20 am'));
  }
  write('mystery-records.svg', stack(cards));
}

const ALL = { hum, wind, people, quakes, blastHours, blastRecord, problems, hidden, mystery };
for (const [name, fn] of Object.entries(ALL)) if (!only.length || only.includes(name)) await fn();
