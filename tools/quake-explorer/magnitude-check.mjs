// How close does a student-style local magnitude (ML) get to UUSS's own ML, on the stations
// Quake Explorer actually loads? The rerunnable check behind the magnitude review's numbers
// (decision D41; review piece M3, critique R4 L2).
//
//   node tools/quake-explorer/magnitude-check.mjs                     every quake, writes the result file
//   node tools/quake-explorer/magnitude-check.mjs --set holdout       one set only (prints, writes nothing)
//   node tools/quake-explorer/magnitude-check.mjs --only uu80162166,uu80137106
//
// The quakes: tools/quake-explorer/data/magnitude-events.json (23 training quakes incl. Magna,
// 10 holdout quakes chosen by rule from the catalog before any of their waveforms was read).
// For each quake, live, like Quake Explorer's record section (data.js loadRecordSection): the
// app's EarthScopeUSGSSource, getStations and selectRecordSection with QUAKE_EXPLORER.section
// (UU, HH?/EH?/BH?, one station per 12.5 km band out to 300 km, analyst-picked stations first,
// the school stand-ins added; 300 km for every quake, Magna included). Then all three components
// of those stations (the record section itself loads only the vertical), -10 s to +150 s around
// the origin. Counts -> m/s with lib/units.js toVelocity; isFlat and isClipped (lib/signal.js)
// on the raw counts. All the magnitude math is docs/app/js/lib/magnitude.js, the module
// students' investigation E runs: Wood-Anderson (0.8 s, damping 0.8, x 2,800), half the biggest
// peak-to-peak swing in swingWindow(), Richter's 1958 table (every row), the gates in
// STATION_RULE (10-300 km; clipped; more than 0.5% of samples missing; noise: the quake's
// biggest wiggle at least STATION_RULE.minSnr = 2 times the biggest one before P),
// stationValue (both horizontals must pass; their mean), eventML. For a quake of catalog
// magnitude 4.5 or more only HH channels count ("band", STATION_RULE.bigQuakeML; it affects
// Magna only). The missing-samples rule is checked here on the raw counts too ("gap").
//
// Prints, for training and holdout separately: each quake (stations loaded, usable horizontal
// stations, median and mean of stations minus UUSS's ML, station spread, verticals uncorrected
// and + VERTICAL_CORRECTION); the summary over quakes; gate counts; random station subsets
// (k = 1, 3, 5, 10 usable horizontal stations, 400 draws per quake, mulberry32 seeded with
// 20261125 + 100 x the quake's place in the event list + k, the group's answer = the median of
// its k stations, every quake weighted equally); the vertical correction (median vertical minus
// horizontal at the same sensor), cross-validated leave-one-cluster-out on training and applied
// to the holdout; the stand-ins SGU and TMU by source area. For comparison it also prints how
// many channels the noise gate drops and what the horizontals give with the review's scratch
// gate (peak at least 3 times the RMS before P) instead.
//
// A full run also writes tools/figures/data/magnitude-check.json (compact, deterministic: a
// rerun from the cache gives the same bytes; "made" changes only when a number does), which
// tools/figures/magnitude-check-figures.mjs draws. The numbers are used in
// planning/review-magnitude.md 3.3-3.4, the teacher notes of the science page "How big was it?",
// and figures docs/theory/img/mag-how-many.svg (G4) and mag-stations-high.svg (G7).
//
// Downloads are cached on disk (node-setup.mjs; QEXP_CACHE, default <temp>/uhsn-qexp-cache);
// the first run downloads about 40 MB (about 5 s a quake), a rerun from the cache takes a few
// seconds. Sources: USGS ComCat (events, UUSS phase-data QuakeML), EarthScope FDSN (UU stations
// and waveforms). Never Raspberry Shake servers.
import fs from 'node:fs';
import path from 'node:path';
import { app, root, parseArgs, table, networkRequests } from './node-setup.mjs';

const { EarthScopeUSGSSource } = await app('data/earthscope-usgs.js');
const { selectRecordSection } = await app('lib/stations.js');
const { picksByStation, pickRanks } = await app('lib/fdsn.js');
const { toVelocity } = await app('lib/units.js');
const { isFlat, isClipped } = await app('lib/signal.js');
const { QUAKE_EXPLORER, SCHOOLS } = await app('quake-explorer/config.js');
const MAG = await app('lib/magnitude.js');
const { WOOD_ANDERSON, STATION_RULE, VERTICAL_CORRECTION, measureChannel, stationValue, eventML, swingWindow } = MAG;

const EVENTS_FILE = path.join(root, 'tools/quake-explorer/data/magnitude-events.json');
const OUT_FILE = path.join(root, 'tools/figures/data/magnitude-check.json');
const USGS_EVENT = 'https://earthquake.usgs.gov/fdsnws/event/1/query';
const SEED = 20261125;
const DRAWS = 400;
const KS = [1, 3, 5, 10];
const LOAD = { preSec: 10, postSec: 150 };
const GAP_FRACTION = STATION_RULE.maxMissing;
const QE_POST_SEC = QUAKE_EXPLORER.section.postSec; // the record section's window (+110 s)
const STAND_INS = ['SGU', 'TMU'];
const rel = (p) => path.relative(root, p).replaceAll('\\', '/');

const args = parseArgs();
const list = JSON.parse(fs.readFileSync(EVENTS_FILE, 'utf8'));
const ALL = [
  ...list.training.map((e) => ({ ...e, set: 'training', group: e.cluster })),
  ...list.holdout.map((e) => ({ ...e, set: 'holdout', group: e.area })),
].map((e, index) => ({ ...e, index }));
const only = typeof args.only === 'string' ? args.only.split(',').map((s) => s.trim()) : null;
const setFilter = typeof args.set === 'string' ? args.set : null;
if (setFilter && !['training', 'holdout'].includes(setFilter)) throw new Error('--set must be training or holdout');
const RUN = ALL.filter((e) => (!only || only.includes(e.id)) && (!setFilter || e.set === setFilter));
const FULL = RUN.length === ALL.length;
const isBig = (e) => e.ml >= 5; // Magna: reported on its own, used only in the vertical-correction fit

// --- small statistics -------------------------------------------------------------------------
const mean = (a) => (a.length ? a.reduce((s, v) => s + v, 0) / a.length : NaN);
const median = (a) => eventML(a).median ?? NaN;
const sd = (a) => {
  if (a.length < 2) return NaN;
  const m = mean(a);
  return Math.sqrt(a.reduce((s, v) => s + (v - m) ** 2, 0) / (a.length - 1));
};
const quantile = (a, q) => {
  const s = [...a].sort((x, y) => x - y);
  if (!s.length) return NaN;
  const p = (s.length - 1) * q;
  const i = Math.floor(p);
  return s[i] + (s[Math.min(i + 1, s.length - 1)] - s[i]) * (p - i);
};
const worst = (a) => a.reduce((w, v) => (Math.abs(v) > Math.abs(w) ? v : w), 0);
function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const r3 = (x) => (Number.isFinite(x) ? Math.round(x * 1000) / 1000 + 0 : null);
const sgn = (x, d = 2) => (Number.isFinite(x) ? (x >= 0 ? '+' : '') + x.toFixed(d) : '–');
const num = (x, d = 2) => (Number.isFinite(x) ? x.toFixed(d) : '–');
const pct = (x) => (Number.isFinite(x) ? `${(100 * x).toFixed(1)}%` : '–');

// --- one channel -------------------------------------------------------------------------------
/**
 * magnitude.js measureChannel on one loaded channel, after the app's flat / clipped checks and
 * this check's own gap and big-quake gates. Returns {gate, ml?, tPeak?, rmsPass?}.
 */
function measureOne(tr, info, distKm, event, bigQuake) {
  if (!(distKm >= STATION_RULE.minKm && distKm <= STATION_RULE.maxKm)) return { gate: 'distance' };
  if (bigQuake && !STATION_RULE.broadbandBands.includes(info.cha.slice(0, 2))) return { gate: 'band' };
  if (!tr) return { gate: 'nodata' };
  const raw = tr.data;
  let nan = 0;
  for (let i = 0; i < raw.length; i++) if (Number.isNaN(raw[i])) nan++;
  if (nan === raw.length) return { gate: 'nodata' };
  if (isFlat(raw)) return { gate: 'flat' };
  const clipped = isClipped(raw);
  if (!clipped && nan > GAP_FRACTION * raw.length) return { gate: 'gap' };
  const v = toVelocity(raw, info);
  if (!v) return { gate: clipped ? 'clipped' : 'units' };
  const startSec = (tr.startMs - event.timeMs) / 1000;
  const m = measureChannel({ velocity: v.data, sampleRate: tr.sampleRate, startSec, distKm, clipped });
  const out = { gate: m.gate };
  if (m.ml != null) out.ml = m.ml;
  if (m.j != null) out.tPeak = startSec + m.j / tr.sampleRate;
  if (m.gate === 'noise' && m.wa) {
    // Would the review's scratch gate (peak against the RMS before P) have kept it?
    const sr = tr.sampleRate;
    const win = swingWindow(distKm);
    const idx = (sec) => Math.round((sec - startSec) * sr);
    const i0 = Math.max(0, idx(win.startSec));
    const i1 = Math.min(m.wa.length, idx(win.endSec));
    const n1 = Math.min(i0, idx(win.pSec - 2));
    let zp = 0;
    for (let i = i0; i < i1; i++) if (Number.isFinite(m.wa[i])) zp = Math.max(zp, Math.abs(m.wa[i]));
    let s2 = 0;
    let c = 0;
    for (let i = Math.round(1.5 * sr); i < n1; i++) if (Number.isFinite(m.wa[i])) { s2 += m.wa[i] ** 2; c++; }
    out.rmsPass = c > 0 && zp >= STATION_RULE.minSnr * Math.sqrt(s2 / c);
  }
  return out;
}

// --- one quake ---------------------------------------------------------------------------------
const src = new EarthScopeUSGSSource();
const cfg = QUAKE_EXPLORER.section;

async function uussML(id) {
  // the same request the live source makes, so it comes from the cache
  const res = await fetch(`${USGS_EVENT}?format=geojson&eventid=${encodeURIComponent(id)}`);
  const det = await res.json();
  const pd = (det.properties.products?.['phase-data'] || []).find((p) => p.source === 'uu');
  const url = pd?.contents?.['quakeml.xml']?.url;
  if (!url) return null;
  const xml = await (await fetch(url)).text();
  return MAG.parseQuakeMLMagnitudes(xml).network.find((m) => /^ml$/i.test(m.type))?.value ?? null;
}

async function measureQuake(E) {
  const event = await src.getEvent(E.id);
  const analyst = await src.getAnalystPicks(E.id).catch(() => []);
  const candidates = await src.getStations({ lat: event.lat, lon: event.lon, maxKm: cfg.maxKm,
    atMs: event.timeMs, channels: cfg.channels });
  const { stations } = selectRecordSection(event, candidates, { maxKm: cfg.maxKm, bandKm: cfg.bandKm,
    prefer: pickRanks(picksByStation(analyst)), schools: SCHOOLS });
  const t0 = event.timeMs - LOAD.preSec * 1000;
  const t1 = event.timeMs + LOAD.postSec * 1000;
  const traces = await src.getWaveforms(
    stations.flatMap((s) => s.channels.map((cha) => ({ net: s.net, sta: s.sta, loc: s.loc, cha }))), t0, t1);
  const bigQuake = (event.mag ?? 0) >= STATION_RULE.bigQuakeML;
  const rows = stations.map((s) => {
    const ch = s.channels.map((cha, i) => {
      const tr = traces.find((t) => t.net === s.net && t.sta === s.sta && t.loc === s.loc && t.cha === cha);
      return { cha, ...measureOne(tr, { ...s.chanInfo[i], cha }, s.distKm, event, bigQuake) };
    });
    const inRange = s.distKm >= STATION_RULE.minKm && s.distKm <= STATION_RULE.maxKm;
    const hs = ch.slice(1);
    const sv = hs.length ? stationValue(hs) : { gate: 'vertical only' };
    // the same with the review's scratch noise gate (peak against RMS), for comparison only
    const alt = hs.length ? stationValue(hs.map((c) => (c.gate === 'noise' && c.rmsPass ? { ...c, gate: 'ok' } : c))) : sv;
    return {
      sta: s.sta, km: s.distKm, inRange, nChan: s.channels.length, ch,
      Hrms: inRange && alt.gate === 'ok' ? alt.ml : null,
      H: inRange && sv.gate === 'ok' ? sv.ml : null,
      Z: inRange && ch[0].gate === 'ok' ? ch[0].ml : null,
      hGate: inRange ? sv.gate : 'distance', zGate: inRange ? ch[0].gate : 'distance',
    };
  });
  const listed = E.ml;
  const live = await uussML(E.id).catch(() => null);
  return { E, event, rows, liveML: live, mlChanged: live != null && Math.abs(live - listed) > 0.005 };
}

// --- run ---------------------------------------------------------------------------------------
console.log(`Magnitude check: ${RUN.length} of ${ALL.length} quakes (${rel(EVENTS_FILE)}), ` +
  `cache ${process.env.QEXP_CACHE || '<temp>/uhsn-qexp-cache'}`);
const R = [];
for (const E of RUN) {
  const q = await measureQuake(E);
  const nH = q.rows.filter((r) => r.H != null).length;
  const nZ = q.rows.filter((r) => r.Z != null).length;
  console.error(`  ${E.set.padEnd(8)} ${E.id} ${E.place} ML ${E.ml}: ${q.rows.length} stations, ${nH} horizontal, ` +
    `${nZ} vertical (web requests so far ${networkRequests()})`);
  R.push(q);
}

// per-quake numbers
for (const q of R) {
  const ml = q.E.ml;
  const H = q.rows.filter((r) => r.H != null).map((r) => r.H);
  const Z = q.rows.filter((r) => r.Z != null).map((r) => r.Z);
  const h = eventML(H);
  const z = eventML(Z);
  q.s = {
    loaded: q.rows.length, three: q.rows.filter((r) => r.nChan === 3).length,
    nH: h.n, hMed: h.n ? h.median - ml : NaN, hMean: h.n ? h.mean - ml : NaN, hSd: sd(H),
    nZ: z.n, zMed: z.n ? z.median - ml : NaN, zMean: z.n ? z.mean - ml : NaN, zSd: sd(Z),
  };
}
const sets = {
  training: R.filter((q) => q.E.set === 'training' && !isBig(q.E)),
  magna: R.filter((q) => isBig(q.E)),
  holdout: R.filter((q) => q.E.set === 'holdout'),
};
const trainAll = R.filter((q) => q.E.set === 'training');

function quakeTable(title, qs) {
  if (!qs.length) return;
  console.log(`\n=== ${title}`);
  console.log(table(qs.map((q) => ({
    quake: q.E.id, place: q.E.place.replace(/^.* of /, ''), group: q.E.group, 'UUSS ML': num(q.E.ml),
    loaded: q.s.loaded, '3-comp': q.s.three, 'n H': q.s.nH, 'H median': sgn(q.s.hMed), 'H mean': sgn(q.s.hMean),
    'H spread': num(q.s.hSd), 'n Z': q.s.nZ, 'Z median': sgn(q.s.zMed), [`Z+${VERTICAL_CORRECTION}`]: sgn(q.s.zMed + VERTICAL_CORRECTION),
    'Z mean': sgn(q.s.zMean),
  })), ['quake', 'place', 'group', 'UUSS ML', 'loaded', '3-comp', 'n H', 'H median', 'H mean', 'H spread', 'n Z',
    'Z median', `Z+${VERTICAL_CORRECTION}`, 'Z mean']));
}
console.log('\nOffsets: our value minus UUSS ML. H = stations with both horizontals usable (mean of the two); ' +
  'Z = the vertical alone. Median and mean are over the stations; spread = their standard deviation.');
quakeTable(`Training, ${sets.training.length} quakes below M5 (in-sample)`, sets.training);
quakeTable('Magna M5.7 (in-sample, on its own)', sets.magna);
quakeTable(`Holdout, ${sets.holdout.length} quakes (out-of-sample)`, sets.holdout);

function summary(qs, pick) {
  const v = qs.map(pick).filter(Number.isFinite);
  return { n: v.length, mean: mean(v), sd: sd(v), worst: worst(v), within03: v.filter((x) => Math.abs(x) <= 0.3).length };
}
{
  const rows = [];
  for (const [name, qs] of [['training', sets.training], ['holdout', sets.holdout]]) {
    if (!qs.length) continue;
    const add = (label, pick, extra = {}) => {
      const s = summary(qs, pick);
      rows.push({ set: name, value: label, quakes: s.n, mean: sgn(s.mean, 3), sd: num(s.sd, 3), worst: sgn(s.worst),
        'within 0.3': `${s.within03}/${s.n}`, ...extra });
    };
    const nH = qs.map((q) => q.s.nH);
    add('horizontals, median of stations', (q) => q.s.hMed, {
      stations: `${num(mean(nH), 1)} (${Math.min(...nH)}-${Math.max(...nH)})`, 'station spread': num(mean(qs.map((q) => q.s.hSd))) });
    add('horizontals, mean of stations', (q) => q.s.hMean);
    const nZ = qs.map((q) => q.s.nZ);
    add('verticals, no correction, median', (q) => q.s.zMed, {
      stations: `${num(mean(nZ), 1)} (${Math.min(...nZ)}-${Math.max(...nZ)})`, 'station spread': num(mean(qs.map((q) => q.s.zSd))) });
    add(`verticals + ${VERTICAL_CORRECTION}, median`, (q) => q.s.zMed + VERTICAL_CORRECTION);
    add('verticals, no correction, mean', (q) => q.s.zMean);
  }
  console.log('\n=== Summary over quakes (mean offset, quake-to-quake sd, worst quake)');
  console.log(table(rows, ['set', 'value', 'quakes', 'mean', 'sd', 'worst', 'within 0.3', 'stations', 'station spread']));
}

// gate counts
function gateCounts(qs) {
  const g = { quakes: qs.length, loaded: 0, under10km: 0, verticalOnly: 0, hStations: 0, zStations: 0, h: {}, z: {} };
  for (const q of qs) {
    for (const r of q.rows) {
      g.loaded++;
      if (!r.inRange) { g.under10km++; continue; }
      if (r.nChan === 1) g.verticalOnly++;
      if (r.H != null) g.hStations++;
      if (r.Z != null) g.zStations++;
      r.ch.forEach((c, i) => { const b = i === 0 ? g.z : g.h; b[c.gate] = (b[c.gate] || 0) + 1; });
    }
  }
  return g;
}
const GATES = ['ok', 'nodata', 'flat', 'clipped', 'gap', 'units', 'band', 'short', 'noise'];
{
  const cols = { training: gateCounts(sets.training), Magna: gateCounts(sets.magna), holdout: gateCounts(sets.holdout) };
  const names = Object.keys(cols).filter((k) => cols[k].quakes);
  const rows = [
    ['quakes', (g) => g.quakes], ['stations loaded', (g) => g.loaded], ['closer than 10 km', (g) => g.under10km],
    ['vertical only (in range)', (g) => g.verticalOnly], ['usable horizontal stations', (g) => g.hStations],
    ['usable vertical stations', (g) => g.zStations],
    ...GATES.map((k) => [`H channels: ${k}`, (g) => g.h[k] || 0]),
    ...GATES.map((k) => [`Z channels: ${k}`, (g) => g.z[k] || 0]),
  ].map(([label, f]) => Object.fromEntries([['gate', label], ...names.map((n) => [n, f(cols[n])])]));
  console.log('\n=== Gate counts (stations Quake Explorer loads; channel gates for stations within 10-300 km)');
  console.log(table(rows, ['gate', ...names]));
  const noise = R.flatMap((q) => q.rows.filter((r) => r.inRange).flatMap((r) => r.ch.map((c, i) => ({ ...c, comp: i ? 'H' : 'Z', q, r }))))
    .filter((c) => c.gate === 'noise');
  const kept = noise.filter((c) => c.rmsPass);
  console.log(`Noise gate (peak against peak before P): ${noise.length} channels dropped ` +
    `(${noise.filter((c) => c.comp === 'H').length} horizontal, ${noise.filter((c) => c.comp === 'Z').length} vertical); ` +
    `${kept.length} of them (${kept.filter((c) => c.comp === 'H').length} H, ${kept.filter((c) => c.comp === 'Z').length} Z) ` +
    'would pass the review\'s scratch gate (peak at least 3 times the RMS before P); ' +
    `median distance of the dropped channels ${Math.round(median(noise.map((c) => c.r.km)))} km.`);
  const late = R.flatMap((q) => q.rows.filter((r) => r.inRange).flatMap((r) => r.ch.filter((c) => c.gate === 'ok' && c.tPeak > QE_POST_SEC)
    .map((c) => `${q.E.id} ${r.sta} ${Math.round(r.km)} km ${c.cha} ${c.tPeak.toFixed(0)} s`)));
  const usable = R.reduce((n, q) => n + q.rows.filter((r) => r.inRange).reduce((m, r) => m + r.ch.filter((c) => c.gate === 'ok').length, 0), 0);
  console.log(`Biggest swing later than Quake Explorer's +${QE_POST_SEC} s: ${late.length} of ${usable} usable channels` +
    `${late.length ? `: ${late.join('; ')}` : ''}.`);
}

// station subsets
function subsets(qs, key, corr = 0) {
  const out = {};
  for (const k of KS) {
    const errs = [];
    const perQuake = [];
    let short = 0;
    for (const q of qs) {
      const vals = q.rows.filter((r) => r[key] != null).map((r) => r[key] + corr - q.E.ml);
      if (!vals.length) continue;
      if (vals.length < k) short++;
      const rnd = mulberry32(SEED + q.E.index * 100 + k);
      const kk = Math.min(k, vals.length);
      const mine = [];
      for (let d = 0; d < DRAWS; d++) {
        const idx = vals.map((_, i) => i);
        for (let i = 0; i < kk; i++) {
          const j = i + Math.floor(rnd() * (idx.length - i));
          [idx[i], idx[j]] = [idx[j], idx[i]];
        }
        mine.push(median(idx.slice(0, kk).map((i) => vals[i])));
      }
      errs.push(...mine);
      perQuake.push(mine.filter((x) => Math.abs(x) <= 0.3).length / mine.length);
    }
    const a = errs.map(Math.abs);
    const share = (t) => a.filter((x) => x <= t).length / a.length;
    out[k] = { within03: share(0.3), within05: share(0.5), within10: share(1.0), p90: quantile(a, 0.9),
      worstQuake03: Math.min(...perQuake), meanError: mean(errs), quakes: perQuake.length, short };
  }
  return out;
}
function subsetTable(title, sub) {
  console.log(`\n${title}`);
  console.log(table(KS.map((k) => ({ k, quakes: sub[k].quakes, 'short of k': sub[k].short, 'within 0.3': pct(sub[k].within03),
    'within 0.5': pct(sub[k].within05), 'within 1.0': pct(sub[k].within10), '90th pct |error|': num(sub[k].p90),
    'worst quake within 0.3': pct(sub[k].worstQuake03), 'mean error': sgn(sub[k].meanError) })),
  ['k', 'quakes', 'short of k', 'within 0.3', 'within 0.5', 'within 1.0', '90th pct |error|', 'worst quake within 0.3', 'mean error']));
}
const SUB = {};
console.log(`\n=== Station subsets: k stations at random, ${DRAWS} draws per quake, the group's answer = their median ` +
  `(mulberry32, seed ${SEED} + 100 x quake index + k; every quake weighted equally)`);
for (const [name, qs] of [['training', sets.training], ['holdout', sets.holdout]]) {
  if (!qs.length) continue;
  SUB[name] = subsets(qs, 'H');
  subsetTable(`Horizontals, ${name} (${qs.length} quakes)`, SUB[name]);
}
{
  // how much the noise gate matters: the same horizontals with the review's scratch gate
  const rows = [];
  for (const [name, qs] of [['training', sets.training], ['holdout', sets.holdout]]) {
    if (!qs.length) continue;
    for (const [gate, key] of [['peak/peak (magnitude.js)', 'H'], ['peak/RMS (review scratch)', 'Hrms']]) {
      const s = summary(qs, (q) => median(q.rows.filter((r) => r[key] != null).map((r) => r[key])) - q.E.ml);
      const sub = subsets(qs, key);
      rows.push({ set: name, 'noise gate': gate, stations: qs.reduce((n, q) => n + q.rows.filter((r) => r[key] != null).length, 0),
        'median offset': `${sgn(s.mean, 3)} ± ${num(s.sd, 3)}`, worst: sgn(s.worst), ...Object.fromEntries(KS.map((k) => [`k=${k} within 0.3`, pct(sub[k].within03)])) });
    }
  }
  console.log('\nNoise gate compared (horizontals; everything else the same)');
  console.log(table(rows, ['set', 'noise gate', 'stations', 'median offset', 'worst', ...KS.map((k) => `k=${k} within 0.3`)]));
}
for (const [name, qs] of [['training', sets.training], ['holdout', sets.holdout]]) {
  if (!qs.length) continue;
  subsetTable(`Verticals + ${VERTICAL_CORRECTION}, ${name}`, subsets(qs, 'Z', VERTICAL_CORRECTION));
  subsetTable(`Verticals, no correction, ${name}`, subsets(qs, 'Z'));
}

// vertical correction
const vh = (q) => q.rows.filter((r) => r.H != null && r.Z != null).map((r) => r.Z - r.H);
let VC = null;
if (trainAll.length) {
  const all = trainAll.flatMap(vh);
  const fit = -median(all);
  const clusters = [...new Set(trainAll.map((q) => q.E.cluster))];
  const loo = clusters.map((c) => ({ c, quakes: trainAll.filter((q) => q.E.cluster === c).length,
    own: -median(trainAll.filter((q) => q.E.cluster === c).flatMap(vh)),
    rest: -median(trainAll.filter((q) => q.E.cluster !== c).flatMap(vh)) }));
  const cv = sets.training.map((q) => q.s.zMed + loo.find((l) => l.c === q.E.cluster).rest);
  const holdVH = sets.holdout.flatMap(vh);
  const hold = sets.holdout.map((q) => q.s.zMed + fit);
  VC = { fit, n: all.length, loo, cv: summary(sets.training, (q, i) => cv[i]),
    holdoutOwn: holdVH.length ? -median(holdVH) : NaN, holdoutN: holdVH.length,
    holdout: sets.holdout.length ? summary(sets.holdout, (q) => q.s.zMed + fit) : null };
  console.log(`\n=== Vertical correction: minus the median of (vertical - horizontal) at the same sensor`);
  console.log(`Training, ${trainAll.length} quakes incl. Magna: ${sgn(fit, 3)} (${all.length} station values); ` +
    `magnitude.js uses VERTICAL_CORRECTION = ${VERTICAL_CORRECTION}.`);
  console.log(table(loo.map((l) => ({ 'cluster left out': l.c, quakes: l.quakes, "its own value": sgn(l.own, 3),
    'from the other clusters': sgn(l.rest, 3) })), ['cluster left out', 'quakes', 'its own value', 'from the other clusters']));
  const lr = loo.map((l) => l.rest);
  console.log(`Leave-one-cluster-out: ${sgn(Math.min(...lr), 3)} to ${sgn(Math.max(...lr), 3)}. ` +
    `Holdout's own value (not used): ${sgn(VC.holdoutOwn, 3)} (${holdVH.length} station values).`);
  console.log(`Training verticals, corrected leave-one-cluster-out: ${sgn(VC.cv.mean, 3)} ± ${num(VC.cv.sd, 3)}, worst ${sgn(VC.cv.worst)}, ` +
    `${VC.cv.within03}/${VC.cv.n} within 0.3.`);
  if (VC.holdout) {
    console.log(`Holdout verticals, corrected by the training value: ${sgn(VC.holdout.mean, 3)} ± ${num(VC.holdout.sd, 3)}, ` +
      `worst ${sgn(VC.holdout.worst)}, ${VC.holdout.within03}/${VC.holdout.n} within 0.3` +
      ` (per quake: ${sets.holdout.map((q, i) => `${q.E.place.replace(/^.* of /, '').replace(/, Utah$/, '')} ${sgn(hold[i])}`).join(', ')}).`);
  }
  if (Math.abs(fit - VERTICAL_CORRECTION) > 0.02) console.log(`NOTE: the fit differs from VERTICAL_CORRECTION by more than 0.02.`);
}

// stand-ins
const standIns = [];
for (const q of R) {
  for (const sta of STAND_INS) {
    const r = q.rows.find((x) => x.sta === sta);
    if (!r) continue;
    standIns.push({ sta, q, km: r.km, h: r.H != null ? r.H - q.E.ml : null, z: r.Z != null ? r.Z - q.E.ml : null,
      hGate: r.hGate, zGate: r.zGate });
  }
}
{
  console.log('\n=== School stand-ins SGU (Gunnison Valley) and TMU (Wasatch Academy): station ML minus UUSS ML, by source area');
  const rows = [];
  for (const sta of STAND_INS) {
    for (const g of [...new Set(R.map((q) => `${q.E.set}|${q.E.group}`))]) {
      const [set, group] = g.split('|');
      const xs = standIns.filter((s) => s.sta === sta && s.q.E.set === set && s.q.E.group === group);
      if (!xs.length) continue;
      const h = xs.map((s) => s.h).filter((v) => v != null);
      const z = xs.map((s) => s.z).filter((v) => v != null);
      const kms = xs.map((s) => s.km);
      const why = [...new Set(xs.filter((s) => s.h == null).map((s) => s.hGate))].join(', ');
      rows.push({ station: sta, set, area: group, km: `${Math.round(Math.min(...kms))}-${Math.round(Math.max(...kms))}`,
        'n H': h.length, 'H mean': sgn(mean(h)), 'n Z': z.length, 'Z mean': sgn(mean(z)), 'H not usable': why });
    }
    const all = standIns.filter((s) => s.sta === sta);
    for (const set of ['training', 'holdout']) {
      const h = all.filter((s) => s.q.E.set === set && s.h != null).map((s) => s.h);
      const z = all.filter((s) => s.q.E.set === set && s.z != null).map((s) => s.z);
      if (h.length || z.length) {
        rows.push({ station: sta, set, area: 'ALL', km: '', 'n H': h.length, 'H mean': `${sgn(mean(h))} ± ${num(sd(h))}`,
          'n Z': z.length, 'Z mean': `${sgn(mean(z))} ± ${num(sd(z))}`, 'H not usable': '' });
      }
    }
  }
  console.log(table(rows, ['station', 'set', 'area', 'km', 'n H', 'H mean', 'n Z', 'Z mean', 'H not usable']));
}

// the reference magnitudes
for (const q of R) {
  if (q.liveML == null) console.log(`NOTE: ${q.E.id}: no UUSS Ml found in ComCat's uu phase-data now (list: ${q.E.ml}).`);
  else if (q.mlChanged) console.log(`NOTE: ${q.E.id}: UUSS's Ml in ComCat is now ${q.liveML}; the event list has ${q.E.ml} (the list's value is used).`);
}

// --- the result file -------------------------------------------------------------------------
if (!FULL) {
  console.log(`\nPartial run (--only / --set): ${rel(OUT_FILE)} not written.`);
} else {
  const setBlock = (qs, sub) => {
    const s = summary(qs, (q) => q.s.hMed);
    return { quakes: qs.length, offsetMean: r3(s.mean), offsetSd: r3(s.sd), worst: r3(s.worst),
      within03: s.within03, offsetMeanOfStationsMean: r3(mean(qs.map((q) => q.s.hMean))),
      stationsMean: r3(mean(qs.map((q) => q.s.nH))), stationSpread: r3(mean(qs.map((q) => q.s.hSd))),
      subsets: Object.fromEntries(KS.map((k) => [String(k), { within03: r3(sub[k].within03), within05: r3(sub[k].within05),
        within10: r3(sub[k].within10), p90: r3(sub[k].p90) }])) };
  };
  const vcBlock = (s) => ({ offsetMean: r3(s.mean), offsetSd: r3(s.sd), worst: r3(s.worst), within03: s.within03 });
  const lr = VC.loo.map((l) => l.rest);
  const result = {
    source: 'UUSS Ml and event details from USGS ComCat (UUSS phase-data QuakeML); waveforms and station metadata of ' +
      'University of Utah Regional Seismic Network (UU, doi:10.7914/SN/UU) stations from EarthScope FDSN web services. ' +
      'Quakes: tools/quake-explorer/data/magnitude-events.json.',
    made: new Date().toISOString().slice(0, 10),
    command: 'node tools/quake-explorer/magnitude-check.mjs',
    seed: SEED,
    draws: DRAWS,
    recipe: {
      magnification: WOOD_ANDERSON.magnification, damping: WOOD_ANDERSON.damping, periodSec: WOOD_ANDERSON.periodSec,
      table: 'Richter 1958 full', amplitude: 'half the largest peak-to-peak swing',
      noiseGate: `biggest Wood-Anderson wiggle in the window at least ${STATION_RULE.minSnr} times the biggest before P (peak against peak)`,
      window: 'from 2 s before P (distance / 6.1 km/s) to 30 s or 0.3 s per km after S (distance / 3.5 km/s), whichever is later; records -10 to +150 s',
      distanceKm: [STATION_RULE.minKm, STATION_RULE.maxKm],
      stations: `Quake Explorer's record-section selection (${cfg.maxKm} km, ${cfg.bandKm} km bands, ${cfg.channels}), all three components`,
      station: 'both horizontals must pass; their mean; no station corrections', event: 'median of stations',
      otherGates: `flat, clipped (the app's isFlat, isClipped); over ${GAP_FRACTION * 100}% of samples missing; catalog M ${STATION_RULE.bigQuakeML}+: HH only`,
    },
    notes: 'Offsets are our value minus UUSS Ml. training excludes Magna (M5.6), which is in quakes and in the vertical-correction fit. ' +
      'subsets: share of groups of k usable horizontal stations within 0.3, 0.5 and 1.0 of UUSS, and the 90th percentile of |error|. ' +
      'verticalCorrection: to add to a vertical station value (minus the median vertical-minus-horizontal at the same sensor). ' +
      'quakes[].stations: [station, km, H, Z, why] with H (mean of both horizontals) and Z (vertical) station ML, null if not usable.',
    sets: { training: setBlock(sets.training, SUB.training), holdout: setBlock(sets.holdout, SUB.holdout) },
    verticalCorrection: {
      fit: r3(VC.fit), stationValues: VC.n, looRange: [r3(Math.min(...lr)), r3(Math.max(...lr))],
      holdoutOwn: r3(VC.holdoutOwn), used: VERTICAL_CORRECTION,
      trainingCrossValidated: vcBlock(VC.cv), holdoutCorrected: vcBlock(VC.holdout),
      holdoutUncorrected: vcBlock(summary(sets.holdout, (q) => q.s.zMed)),
    },
    gates: Object.fromEntries([['training', sets.training], ['magna', sets.magna], ['holdout', sets.holdout]].map(([k, qs]) => {
      const g = gateCounts(qs);
      return [k, { loaded: g.loaded, under10km: g.under10km, verticalOnly: g.verticalOnly, hStations: g.hStations, zStations: g.zStations,
        h: Object.fromEntries(GATES.filter((x) => g.h[x]).map((x) => [x, g.h[x]])),
        z: Object.fromEntries(GATES.filter((x) => g.z[x]).map((x) => [x, g.z[x]])) }];
    })),
    quakes: R.map((q) => {
      const o = { id: q.E.id, set: q.E.set, place: q.E.place };
      if (q.E.set === 'training') o.cluster = q.E.cluster; else o.area = q.E.area;
      Object.assign(o, { ml: q.E.ml, loaded: q.s.loaded, nH: q.s.nH, median: r3(q.s.hMed), mean: r3(q.s.hMean), sd: r3(q.s.hSd),
        nZ: q.s.nZ, zMedian: r3(q.s.zMed) });
      o.stations = q.rows.map((r) => {
        const why = !r.inRange ? 'under 10 km'
          : [r.nChan === 1 ? 'vertical only' : r.H == null ? `H ${r.hGate}` : '', r.Z == null ? `Z ${r.zGate}` : ''].filter(Boolean).join(', ');
        const a = [r.sta, Math.round(r.km * 10) / 10, r3(r.H), r3(r.Z)];
        if (why) a.push(why);
        return a;
      });
      return o;
    }),
    standIns: standIns.map((s) => {
      const o = { sta: s.sta, id: s.q.E.id, set: s.q.E.set };
      if (s.q.E.set === 'training') o.cluster = s.q.E.cluster; else o.area = s.q.E.area;
      return { ...o, km: Math.round(s.km), h: r3(s.h), z: r3(s.z) };
    }),
  };
  // one line per quake and stand-in, so a change shows as a short diff
  const fmt = (obj) => {
    const lines = ['{'];
    const keys = Object.keys(obj);
    keys.forEach((k, i) => {
      const end = i < keys.length - 1 ? ',' : '';
      const v = obj[k];
      if (Array.isArray(v) && v.length && typeof v[0] === 'object') {
        lines.push(` ${JSON.stringify(k)}: [`);
        v.forEach((x, j) => lines.push(`  ${JSON.stringify(x)}${j < v.length - 1 ? ',' : ''}`));
        lines.push(` ]${end}`);
      } else if (v && typeof v === 'object' && !Array.isArray(v)) {
        lines.push(` ${JSON.stringify(k)}: {`);
        const ks = Object.keys(v);
        ks.forEach((kk, j) => lines.push(`  ${JSON.stringify(kk)}: ${JSON.stringify(v[kk])}${j < ks.length - 1 ? ',' : ''}`));
        lines.push(` }${end}`);
      } else lines.push(` ${JSON.stringify(k)}: ${JSON.stringify(v)}${end}`);
    });
    lines.push('}');
    return lines.join('\n') + '\n';
  };
  // keep the old date when nothing else changed, so a rerun gives the same bytes
  if (fs.existsSync(OUT_FILE)) {
    try {
      const old = JSON.parse(fs.readFileSync(OUT_FILE, 'utf8'));
      if (fmt({ ...old, made: '' }) === fmt({ ...result, made: '' })) result.made = old.made;
    } catch { /* rewrite */ }
  }
  const text = fmt(result);
  const before = fs.existsSync(OUT_FILE) ? fs.readFileSync(OUT_FILE, 'utf8') : null;
  fs.mkdirSync(path.dirname(OUT_FILE), { recursive: true });
  fs.writeFileSync(OUT_FILE, text);
  console.log(`\n${before === text ? 'unchanged' : 'wrote'} ${rel(OUT_FILE)} ` +
    `(${(text.length / 1024).toFixed(0)} KB); web requests this run: ${networkRequests()}`);
}
