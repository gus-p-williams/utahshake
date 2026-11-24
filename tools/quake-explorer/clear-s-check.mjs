// How clear is S at each station of the ready-made quakes? The numbers behind their
// notes ("clear S at 7 of 10 stations: best for S − P"), counted on what each app shows.
//
//   node tools/quake-explorer/clear-s-check.mjs            offline samples (no network)
//   node tools/quake-explorer/clear-s-check.mjs --live     Quake Locator's classic quakes, live
//   node tools/quake-explorer/clear-s-check.mjs --live uu80137056 uu80156586   any quakes, live
//
// S is clear when the 2 s after it are at least 3 times bigger (rms) than the P coda just
// before it, on the station's best component (docs/app/js/lib/clear-s.js). Where the
// analysts picked no S, the S time is the saved computer pick or a fresh AIC pick, kept
// only if its S − P fits the crust model. tests/clear-s.test.js checks that the notes in
// config.js and quake-explorer/config.js still match these counts.
import { app, parseArgs, table } from './node-setup.mjs';
import { quakeLocatorView, explorerSectionView, explorerMotionView, clearS, sampleSource } from './clear-s.mjs';

const { EarthScopeUSGSSource } = await app('data/earthscope-usgs.js');
const { PRESET_EVENTS } = await app('config.js');
const { EXPLORER_PRESETS } = await app('quake-explorer/config.js');
const { CLEAR_S_RATIO } = await app('lib/clear-s.js');

const args = parseArgs();
const f1 = (x) => (Number.isFinite(x) ? x.toFixed(1) : '–');

function report(title, c) {
  console.log(`\n=== ${title}`);
  console.log(table(c.rows.map((r) => ({
    sta: r.sta, km: Math.round(r.distKm), 'S-P': r.sSec != null && r.pSec != null ? f1(r.sSec - r.pSec) : '–',
    'S/coda': f1(r.ratio), on: r.cha ? r.cha.slice(-1) : '', S: r.sWho ?? 'none',
    fits: r.sWho === 'computer' ? (r.plausible ? 'yes' : 'NO') : '', clipped: r.clipped ? 'clipped' : '',
    clear: r.clear ? 'CLEAR' : '',
  })), ['sta', 'km', 'S-P', 'S/coda', 'on', 'S', 'fits', 'clipped', 'clear']));
  const analystS = c.rows.filter((r) => r.sWho === 'analyst').length;
  console.log(`-> clear S (>= ${CLEAR_S_RATIO}x the P coda) at ${c.clear} of ${c.total} stations; ` +
    `analyst S picks at ${analystS}; clipped records ${c.clipped}` +
    `${c.missing.length ? `; no usable data from ${c.missing.join(', ')}` : ''}`);
}

if (args.live) {
  const src = new EarthScopeUSGSSource();
  const ids = args._.length ? args._ : PRESET_EVENTS.map((p) => p.id);
  for (const id of ids) {
    const label = PRESET_EVENTS.find((p) => p.id === id)?.label ?? id;
    report(`Quake Locator, live: ${label} (${id})`, clearS(await quakeLocatorView(src, id)));
  }
} else {
  const ql = sampleSource('samples');
  for (const e of await ql.getEvents()) {
    report(`Quake Locator, offline sample: ${e.place} (${e.id})`, clearS(await quakeLocatorView(ql, e.id)));
  }
  const qe = sampleSource('explorer');
  for (const p of EXPLORER_PRESETS) {
    if (p.views.includes('record-section')) {
      report(`Quake Explorer A (vertical traces): ${p.label}`, clearS(await explorerSectionView(qe, p.id)));
    }
    if (p.views.includes('motion') && !p.views.includes('distant')) {
      report(`Quake Explorer C (three-component stations within 200 km): ${p.label}`, clearS(await explorerMotionView(qe, p.id)));
    }
  }
}
