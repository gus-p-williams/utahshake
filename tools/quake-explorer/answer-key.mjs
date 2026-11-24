// Answer-key numbers for Quake Explorer, computed from the bundled offline
// samples with the app's own modules (no network).
//
//   node tools/quake-explorer/answer-key.mjs
import fs from 'node:fs';
import path from 'node:path';
import { app, root, table } from './node-setup.mjs';

const { parseMiniseed } = await app('data/mseed.js');
const { filteredData } = await app('data/filters.js');
const { picksByStation, chooseChannels, channelInfo } = await app('lib/fdsn.js');
const { speedFromArrivals, twoLineFit } = await app('lib/linefit.js');
const { crustFromIntercept, crossoverKm } = await app('lib/traveltime.js');
const { rotateHorizontals, verticalUp, pWaveBackAzimuth, angleDiff } = await app('lib/motion.js');
const { amplitudeSpectrum } = await app('lib/spectral.js');
const { peakAbs } = await app('lib/signal.js');
const { toVelocity, formatVelocity } = await app('lib/units.js');

const base = path.join(root, 'docs/app/data/samples');
function load(d) {
  const j = (f) => JSON.parse(fs.readFileSync(path.join(base, d, f), 'utf8'));
  const sample = j('sample.json');
  const event = j('event.json');
  const buf = fs.readFileSync(path.join(base, d, 'waveforms.mseed'));
  const from = event.timeMs - sample.window.preSec * 1000;
  const to = event.timeMs + sample.window.postSec * 1000;
  return { sample, event, stations: j('stations.json'), picks: j('picks.json'), computer: j('computer-picks.json'),
    traces: parseMiniseed(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.length), { fromMs: from, toMs: to }) };
}
const f2 = (x) => x.toFixed(2);
function arrivals(s, phase, { computer = true, minSnr = 0 } = {}) {
  const by = picksByStation(s.picks);
  return s.stations.flatMap((st) => {
    const a = by[`${st.net}.${st.sta}`]?.[phase];
    const c = s.computer.find((p) => p.sta === st.sta && p.phase === phase && p.snr >= minSnr);
    const t = a ?? (computer ? c?.timeMs : undefined);
    return t === undefined ? [] : [{ sta: st.sta, distKm: st.distKm, tSec: (t - s.event.timeMs) / 1000, who: a ? 'analyst' : 'computer' }];
  });
}

console.log('== A. How fast is the rock? (record section)');
for (const d of ['qe-junction', 'qe-magna']) {
  const s = load(d);
  const P = arrivals(s, 'P', { minSnr: 8 });
  const S = arrivals(s, 'S');
  const pg = speedFromArrivals(P.filter((p) => p.distKm <= 100 && p.who === 'analyst'));
  console.log(`${d} (${s.event.id}, M${s.event.mag}, depth ${s.event.depthKm} km)`);
  console.log(`  P within 100 km (analyst, n=${pg.n}): ${f2(pg.speedKms)} ± ${f2(pg.speedSE)} km/s, intercept ${f2(pg.interceptSec)} s`);
  const Sa = S.filter((p) => p.who === 'analyst');
  if (Sa.length >= 3) { const f = speedFromArrivals(Sa); console.log(`  S (analyst only, n=${f.n}): ${f2(f.speedKms)} ± ${f2(f.speedSE)} km/s`); }
  if (S.length >= 3) { const f = speedFromArrivals(S.filter((p) => p.distKm <= 240)); console.log(`  S within 240 km (analyst + computer, n=${f.n}): ${f2(f.speedKms)} ± ${f2(f.speedSE)} km/s, rms ${f2(f.rmsSec)} s`); }
  const two = twoLineFit(P, { minPerLine: 4 });
  if (two) {
    const crust = crustFromIntercept(two.far.interceptSec, two.near.speedKms, two.far.speedKms, s.event.depthKm);
    console.log(`  two lines (n=${P.length}, ${P.filter((p) => p.who === 'computer').length} computer): ` +
      `${f2(two.near.speedKms)} -> ${f2(two.far.speedKms)} ± ${f2(two.far.speedSE)} km/s, F ${two.fRatio.toFixed(0)}, ` +
      `lines cross ${two.crossoverKm.toFixed(0)} km, crust ${crust.toFixed(1)} km ` +
      `(model crossover ${crossoverKm(s.event.depthKm, crust, two.near.speedKms, two.far.speedKms).toFixed(0)} km)`);
  }
  // True ground speed: why far stations look as big as near ones when stretched.
  // Fit log10(peak) = a + b·log10(distance) and flag stations far off the line.
  const rows = [];
  for (const st of s.stations) {
    const tr = s.traces.find((t) => t.sta === st.sta && t.cha === st.channels[0].cha);
    const v = toVelocity(filteredData(tr, { lo: 1, hi: 10 }), st.channels[0]);
    if (v) rows.push({ sta: st.sta, cha: st.channels[0].cha, km: st.distKm, pgv: peakAbs(v.data), approx: v.approx,
      units: st.channels[0].units, sens: st.channels[0].sensitivity, clipped: st.channels[0].clipped });
  }
  const fitRows = rows.filter((r) => !r.clipped);
  const xs = fitRows.map((r) => Math.log10(r.km));
  const ys = fitRows.map((r) => Math.log10(r.pgv));
  const mx = xs.reduce((a, b) => a + b) / xs.length;
  const my = ys.reduce((a, b) => a + b) / ys.length;
  const b = xs.reduce((acc, x, i) => acc + (x - mx) * (ys[i] - my), 0) / xs.reduce((acc, x) => acc + (x - mx) ** 2, 0);
  const a = my - b * mx;
  const spread = Math.sqrt(fitRows.reduce((acc, r, i) => acc + (ys[i] - a - b * xs[i]) ** 2, 0) / fitRows.length);
  console.log(`  peak ground speed (vertical, 1–10 Hz, ${fitRows.length} unclipped stations) falls as distance^${b.toFixed(2)}, ` +
    `typical scatter x${(10 ** spread).toFixed(1)}; clipped: ${rows.filter((r) => r.clipped).map((r) => r.sta).join(', ') || 'none'}; ` +
    'stations off the line by more than 5x:');
  console.log(table(rows.map((r) => ({ ...r, off: 10 ** (Math.log10(r.pgv) - a - b * Math.log10(r.km)) }))
    .map((r) => ({ sta: r.sta, cha: r.cha, km: r.km.toFixed(0), 'peak ground speed': formatVelocity(r.pgv) + (r.approx ? ' ≈' : ''),
      'x line': r.off.toFixed(2), units: r.units, sens: r.sens?.toExponential(2), clipped: r.clipped ? 'yes' : '' }))
    .filter((r) => Number(r['x line']) > 5 || Number(r['x line']) < 0.2), ['sta', 'cha', 'km', 'peak ground speed', 'x line', 'units', 'sens', 'clipped']).replace(/^/gm, '    '));
}

// What the app's reveal shows: the same calls as inv-a.js (loadRecordSection, then
// sectionFits), so the activity cards can quote exactly what students will see.
{
  const { SampleSource } = await app('data/sample-source.js');
  const { loadRecordSection, sectionFits } = await app('quake-explorer/data.js');
  const fileFetch = async (url) => {
    try { return new Response(fs.readFileSync(new URL(url))); } catch { return new Response(null, { status: 404 }); }
  };
  const src = new SampleSource(new URL(`file:///${base.replace(/\\/g, '/')}/`), { list: 'explorer', fetch: fileFetch });
  for (const [id, opt] of [['uu80162166', { maxKm: 300 }], ['uu60363602', { maxKm: 400, postSec: 140 }]]) {
    const r = await loadRecordSection(src, id, opt);
    const f = sectionFits(r, r.event.depthKm);
    console.log(`app reveal ${id} (${r.traces.length} stations to ${opt.maxKm} km): ` +
      `P ${f.pg ? `${f2(f.pg.speedKms)} km/s (n=${f.pg.n})` : '–'}, S ${f.sg ? `${f2(f.sg.speedKms)} km/s (n=${f.sg.n})` : '–'}` +
      (f.bend ? `, bend: Pg ${f2(f.bend.near.speedKms)} -> Pn ${f2(f.bend.far.speedKms)} ± ${f2(f.bend.far.speedSE)} km/s, ` +
        `lines cross ${Math.round(f.bend.crossoverKm)} km, crust ${f.bend.crustKm.toFixed(1)} km` : ', no clear bend (hint text)'));
  }
}

console.log('\n== B. What notes is the ground playing?');
const hfAt = (d, sta) => {
  const s = load(d);
  const st = s.stations.find((x) => x.sta === sta);
  const tr = s.traces.find((t) => t.sta === sta && t.cha === st.channels[0].cha);
  const y = filteredData(tr, { lo: 1, hi: 20 });
  const by = { ...picksByStation(s.picks)[`${st.net}.${sta}`] };
  by.P ??= s.computer.find((p) => p.sta === sta && p.phase === 'P')?.timeMs;
  by.S ??= s.computer.find((p) => p.sta === sta && p.phase === 'S')?.timeMs;
  const i = (ms) => Math.max(0, Math.min(y.length, Math.round(((ms - tr.startMs) / 1000) * tr.sampleRate)));
  const sMs = by.S ?? (by.P + (st.distKm / 3.45 - st.distKm / 6.1) * 1000);
  // The whole quake: from just before P to 15 s after S (as the app's notesAt in inv-b.js).
  const sp = amplitudeSpectrum(y.subarray(i(by.P - 500), i(sMs + 15000)), tr.sampleRate);
  const band = (a, b) => { let sum = 0; let n = 0; sp.freqs.forEach((f, k) => { if (f >= a && f <= b) { sum += sp.amp[k]; n++; } }); return sum / n; };
  const ps = peakAbs(y, i(by.P), i(by.P + 2000)) / peakAbs(y, i(sMs), i(sMs + 4000));
  return { d, sta, km: st.distKm.toFixed(0), 'HF 8-20/1-5 Hz': (band(8, 20) / band(1, 5)).toFixed(3), 'P/S': ps.toFixed(2), type: s.sample.eventType ?? s.event.eventType };
};
console.log(table([hfAt('qe-leamington-blast', 'SUU'), hfAt('qe-leamington-quake', 'SUU'),
  hfAt('qe-leamington-blast', 'LEVU'), hfAt('qe-leamington-quake', 'LEVU'),
  hfAt('qe-junction', 'MTPU'), hfAt('qe-junction', 'SGU'), hfAt('qe-junction', 'LIUT'), hfAt('qe-junction', 'BGU')],
['d', 'type', 'sta', 'km', 'HF 8-20/1-5 Hz', 'P/S']));

console.log('\n== C. Which way did the ground move? (1–5 Hz, P window from the analyst pick)');
const rows = [];
for (const [d, stas] of [['qe-kenilworth', ['TMU', 'MPU', 'CVRU', 'BSUT']], ['qe-junction', ['MTPU', 'TCRU', 'FOR1', 'SGU', 'TMU', 'SUU', 'LIUT']], ['qe-magna', ['SPU', 'BGU']]]) {
  const s = load(d);
  for (const sta of stas) {
    const st = s.stations.find((x) => x.sta === sta);
    const p = picksByStation(s.picks)[`${st?.net}.${sta}`]?.P;
    if (!st || st.channels.length < 3 || !p) continue;
    const ch = chooseChannels(st);
    const info = channelInfo(st, ch);
    const tr = ch.channels.map((c) => s.traces.find((t) => t.sta === sta && t.cha === c));
    const [z, h1, h2] = tr.map((t) => filteredData(t, { lo: 1, hi: 5 }));
    const { n, e } = rotateHorizontals(h1, h2, info[1].azimuth, info[2].azimuth);
    const sr = tr[0].sampleRate;
    const i = Math.round(((p - tr[0].startMs) / 1000) * sr);
    const row = { sample: d, sta, km: st.distKm.toFixed(0), 'true baz': st.bazDeg.toFixed(0) };
    for (const w of [0.3, 0.5, 1]) {
      const r = pWaveBackAzimuth(verticalUp(z, info[0].dip), n, e, i - Math.round(0.05 * sr), i + Math.round(w * sr));
      row[`est ${w}s`] = `${r.bazDeg.toFixed(0)} (${angleDiff(r.bazDeg, st.bazDeg).toFixed(0)})`;
      if (w === 0.5) { row.lin = r.linearity.toFixed(2); row['up/away'] = r.upAwayCorr.toFixed(2); }
    }
    rows.push(row);
  }
}
console.log(table(rows, ['sample', 'sta', 'km', 'true baz', 'est 0.3s', 'est 0.5s', 'est 1s', 'lin', 'up/away']));
console.log('  (estimate, with the error in degrees in brackets)');
console.log('\n== D. A message from the far side of the world (qe-sand-point, SGU vertical)');
{
  const { decimate } = await app('lib/signal.js');
  const { aicPick } = await app('lib/picker.js');
  const { distanceDeg, bodyWaveTimes, surfaceWaveWindow } = await app('lib/teleseism.js');
  const table = JSON.parse(fs.readFileSync(path.join(root, 'docs/app/data/traveltimes-iasp91.json'), 'utf8'));
  const s = load('qe-sand-point');
  const st = s.stations.find((x) => x.sta === 'SGU');
  const raw = s.traces.find((t) => t.sta === 'SGU' && t.cha.endsWith('Z'));
  const dec = decimate(raw.data, raw.sampleRate, 5);
  const tr = { ...raw, data: dec.data, sampleRate: dec.sampleRate };
  const startSec = (tr.startMs - s.event.timeMs) / 1000;
  const deg = distanceDeg(s.event.lat, s.event.lon, st.lat, st.lon);
  const pred = bodyWaveTimes(table, deg, s.event.depthKm);
  const pick = (lo, hi, t) => aicPick(filteredData(tr, { lo, hi }), tr.sampleRate, startSec, t - 60, t + 30);
  const p = pick(0.5, 2, pred.P);
  const sPick = pick(0.1, 1, pred.S);
  const long = filteredData(tr, { lo: 0.03, hi: 0.1 });
  const i0 = Math.round((pred.S + 60 - startSec) * tr.sampleRate);
  let iMax = i0;
  for (let i = i0; i < long.length; i++) if (Math.abs(long[i]) > Math.abs(long[iMax])) iMax = i;
  const mmss = (sec) => `${Math.floor(sec / 60)}:${String(Math.round(sec % 60)).padStart(2, '0')}`;
  const sw = surfaceWaveWindow(deg);
  console.log(`  ${s.event.place}, M${s.event.mag}, depth ${s.event.depthKm} km; SGU ${deg.toFixed(1)}° away (${st.distKm.toFixed(0)} km)`);
  console.log(`  P: iasp91 ${mmss(pred.P)} (${pred.Pphase}), computer pick ${mmss(p.tSec)} (SNR ${p.snr.toFixed(0)})`);
  console.log(`  S: iasp91 ${mmss(pred.S)} (${pred.Sphase}), computer pick ${mmss(sPick.tSec)} (SNR ${sPick.snr.toFixed(1)})`);
  console.log(`  surface waves (10–33 s period) peak at ${mmss(startSec + iMax / tr.sampleRate)}; ` +
    `expected ${mmss(sw.startSec)}–${mmss(sw.endSec)} (3.0–4.2 km/s)`);
  // S shakes the ground sideways, and far away it arrives from almost straight
  // below, so it shows on the horizontal channels rather than the vertical one.
  for (const comp of ['N', 'E']) {
    const h = s.traces.find((t) => t.sta === 'SGU' && t.cha.endsWith(comp));
    const hd = decimate(h.data, h.sampleRate, 5);
    const ht = { ...h, data: hd.data, sampleRate: hd.sampleRate };
    const hs = aicPick(filteredData(ht, { lo: 0.05, hi: 0.5 }), ht.sampleRate, startSec, pred.S - 60, pred.S + 30);
    console.log(`  S on ${h.cha}: computer pick ${mmss(hs.tSec)} (SNR ${hs.snr.toFixed(1)}); S − P ${(hs.tSec - p.tSec).toFixed(0)} s`);
  }
  console.log(`  S − P: iasp91 ${(pred.S - pred.P).toFixed(0)} s`);
}

const size = fs.readdirSync(base).filter((d) => d.startsWith('qe-')).reduce((n, d) =>
  n + fs.readdirSync(path.join(base, d)).reduce((m, f) => m + fs.statSync(path.join(base, d, f)).size, 0), 0);
console.log(`\nexplorer samples: ${(size / 1024).toFixed(0)} KB in total`);
