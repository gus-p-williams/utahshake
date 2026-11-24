// How clear S is (lib/clear-s.js), and the "clear S" notes on the ready-made quakes:
// the counts in the notes must match what the offline samples show in each app.
import { test } from 'node:test';
import assert from 'node:assert/strict';

// The seisplotjs bundle registers a web component when loaded; stub it for node.
globalThis.HTMLElement ??= class {};
globalThis.customElements ??= { define() {}, get() {} };

const { sOverCoda, spPlausible, stationS, countClearS, CLEAR_S_RATIO } = await import('../docs/app/js/lib/clear-s.js');
const { mulberry32 } = await import('../docs/app/js/lib/wave-sim.js');
const { PRESET_EVENTS, CLEAR_S_HINT } = await import('../docs/app/js/config.js');
const { QUAKE_EXPLORER: Q, EXPLORER_PRESETS, CLEAR_S_QUAKE } = await import('../docs/app/js/quake-explorer/config.js');
const { quakeLocatorView, explorerSectionView, explorerMotionView, clearS, sampleSource } =
  await import('../tools/quake-explorer/clear-s.mjs');

const SR = 100;

/**
 * A synthetic record: noise of size 1 before P, a 5 Hz wave of size `coda` from P,
 * and of size `s` from S, starting at startSec = -10 (seconds after the origin).
 */
function record({ pSec, sSec, coda = 1, s = 4, noise = 0.05, seconds = 60, seed = 1 }) {
  const rnd = mulberry32(seed);
  const data = new Float64Array(seconds * SR);
  for (let i = 0; i < data.length; i++) {
    const t = -10 + i / SR;
    const amp = t >= sSec ? s : t >= pSec ? coda : 0;
    data[i] = amp * Math.sin(2 * Math.PI * 5 * t) + noise * (rnd() - 0.5);
  }
  return { data, sampleRate: SR, startSec: -10 };
}

test('sOverCoda: S four times the coda gives about 4', () => {
  const r = record({ pSec: 5, sSec: 12, coda: 1, s: 4, noise: 0 });
  const ratio = sOverCoda(r.data, SR, r.startSec, 5, 12);
  assert.ok(Math.abs(ratio - 4) < 0.05, `ratio ${ratio}`);
});

test('sOverCoda: NaN when S comes too soon after P to see the coda', () => {
  const r = record({ pSec: 5, sSec: 5.7 });
  assert.ok(Number.isNaN(sOverCoda(r.data, SR, r.startSec, 5, 5.7)));
});

test('sOverCoda: missing data (NaN) is skipped; a window with no data gives NaN', () => {
  const r = record({ pSec: 5, sSec: 12, noise: 0 });
  for (let i = 0; i < 50; i++) r.data[(12 - r.startSec) * SR + i] = NaN;   // first 0.5 s after S
  const ratio = sOverCoda(r.data, SR, r.startSec, 5, 12);
  assert.ok(Math.abs(ratio - 4) < 0.2, `ratio ${ratio}`);
  const empty = new Float64Array(r.data.length).fill(NaN);
  assert.ok(Number.isNaN(sOverCoda(empty, SR, r.startSec, 5, 12)));
});

test('spPlausible: real S − P times fit the crust model; wrong-wiggle picks do not', () => {
  // Junction (4 km deep): analysts' S − P at TCRU 5.1 s (38 km), computer SZCU 12.6 s (104 km).
  assert.ok(spPlausible(5.1, 38, 4, Q.model));
  assert.ok(spPlausible(12.6, 104, 4, Q.model));
  // Far stations whose S arrives as Sn are fine too (LIUT 24.4 s at 212 km).
  assert.ok(spPlausible(24.4, 212, 4, Q.model));
  // Magna (12 km deep): AIC landed in the P coda at RRCU (3.9 s at 56 km) and ELU (10.4 s at 144 km).
  assert.ok(!spPlausible(3.9, 56, 12, Q.model));
  assert.ok(!spPlausible(10.4, 144, 12, Q.model));
});

test('stationS: best component wins, and the AIC picker finds a missing S', () => {
  const dist = 80;           // S − P about 10.5 s in the crust model
  const pSec = 13;
  const sSec = 23.5;
  const z = { cha: 'HHZ', ...record({ pSec, sSec, coda: 1, s: 1.5, seed: 2 }) };
  const e = { cha: 'HHE', ...record({ pSec, sSec, coda: 1, s: 6, seed: 3 }) };
  const withPick = stationS({ components: [z, e], distKm: dist, pSec, sSec }, 5, Q.model);
  assert.equal(withPick.cha, 'HHE');
  assert.equal(withPick.sWho, 'analyst');
  assert.ok(withPick.ratio > 5 && withPick.clear);

  const found = stationS({ components: [z, e], distKm: dist, pSec }, 5, Q.model);
  assert.equal(found.sWho, 'computer');
  assert.ok(Math.abs(found.sSec - sSec) < 0.2, `S at ${found.sSec}`);
  assert.ok(found.plausible && found.clear);
});

test('stationS: a big step at the wrong time is not a clear S; a faint S is not clear', () => {
  const dist = 80;
  const pSec = 13;
  // The jump comes only 3 s after P: far too soon for S at 80 km.
  const early = { cha: 'HHZ', ...record({ pSec, sSec: 16, coda: 1, s: 6 }) };
  const r1 = stationS({ components: [early], distKm: dist, pSec, sSec: 16, sWho: 'computer' }, 5, Q.model);
  assert.ok(r1.ratio > 5 && !r1.plausible && !r1.clear);
  const faint = { cha: 'HHZ', ...record({ pSec, sSec: 23.5, coda: 1, s: 1.8 }) };
  const r2 = stationS({ components: [faint], distKm: dist, pSec, sSec: 23.5 }, 5, Q.model);
  assert.ok(r2.ratio < CLEAR_S_RATIO && !r2.clear);
});

test('countClearS: counts the clear stations', () => {
  const pSec = 13;
  const st = (sta, s) => ({ sta, distKm: 80, pSec, sSec: 23.5,
    components: [{ cha: 'HHZ', ...record({ pSec, sSec: 23.5, coda: 1, s }) }] });
  const c = countClearS([st('A', 6), st('B', 1.5), st('C', 4)], 5, Q.model);
  assert.equal(c.total, 3);
  assert.equal(c.clear, 2);
  assert.deepEqual(c.rows.map((r) => r.clear), [true, false, true]);
});

// --- The notes on the ready-made quakes (real data: the offline samples) ---

const note = (list, id) => list.find((p) => p.id === id)?.note ?? '';

test('Quake Locator: every classic quake has a note; Junction\'s count matches its offline sample', async () => {
  for (const p of PRESET_EVENTS) assert.ok(p.note, `${p.label} has a note`);
  const c = clearS(await quakeLocatorView(sampleSource('samples'), CLEAR_S_HINT.id));
  assert.equal(c.total, 10);
  assert.ok(note(PRESET_EVENTS, CLEAR_S_HINT.id).includes(`clear S at ${c.clear} of ${c.total} stations`),
    `note should say ${c.clear} of ${c.total}`);
  assert.ok(CLEAR_S_HINT.text.includes(`${c.clear} of its ${c.total} stations`), `hint should say ${c.clear} of ${c.total}`);
});

test("Quake Explorer A: Junction's record section count matches the note and A's tip", async () => {
  const c = clearS(await explorerSectionView(sampleSource('explorer'), CLEAR_S_QUAKE.id));
  assert.ok(c.total >= 20, `${c.total} traces`);
  assert.ok(note(EXPLORER_PRESETS, CLEAR_S_QUAKE.id).includes(`clear S at ${c.clear} of ${c.total} stations`),
    `note should say ${c.clear} of ${c.total}`);
  assert.ok(CLEAR_S_QUAKE.A.includes(`${c.clear} of its ${c.total} stations`), `A's tip should say ${c.clear} of ${c.total}`);
});

test("Quake Explorer C: Junction's three-component count matches C's tip", async () => {
  const c = clearS(await explorerMotionView(sampleSource('explorer'), CLEAR_S_QUAKE.id));
  const said = c.clear === c.total ? `all ${c.total} of its three-component stations`
    : `${c.clear} of its ${c.total} three-component stations`;
  assert.ok(CLEAR_S_QUAKE.C.includes(said), `C's tip should say "${said}"`);
});

test('Quake Explorer: "S is hard to see" (Magna) and "S is faint" (Kenilworth) are true', async () => {
  const src = sampleSource('explorer');
  const magna = clearS(await explorerSectionView(src, 'uu60363602'));
  assert.ok(magna.clear <= magna.total / 4, `Magna A: ${magna.clear} of ${magna.total}`);
  assert.ok(magna.clipped >= 5, `Magna A: ${magna.clipped} clipped`);
  assert.match(note(EXPLORER_PRESETS, 'uu60363602'), /S is hard to see/);
  const ken = clearS(await explorerMotionView(src, 'uu80158051'));
  assert.equal(ken.clear, 0, `Kenilworth C: ${ken.clear} of ${ken.total}`);
  assert.match(note(EXPLORER_PRESETS, 'uu80158051'), /S is faint/);
});

test('the suggested quake is a ready-made quake in both apps, with an offline sample', async () => {
  assert.ok(PRESET_EVENTS.some((p) => p.id === CLEAR_S_HINT.id));
  assert.ok(EXPLORER_PRESETS.some((p) => p.id === CLEAR_S_QUAKE.id));
  assert.equal((await sampleSource('samples').getEvent(CLEAR_S_HINT.id)).id, CLEAR_S_HINT.id);
  assert.equal((await sampleSource('explorer').getEvent(CLEAR_S_QUAKE.id)).id, CLEAR_S_QUAKE.id);
});
