// Quake Explorer B: choosing a band on the spectrogram. The pure parts of the view:
// which edge a pointer grabs, how close a finger must be, and what the label on the plot says.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  edgeGrabPx, bandEdgeAt, fmtBandHz, bandLabel, firstThatFits, clampBandTo, bandOnPlot,
} from '../docs/app/js/quake-explorer/spectrogram-view.js';
import { stft, suggestStft, fMinReaching } from '../docs/app/js/lib/spectral.js';

// B's distant-quake spectrogram: an hour at 20 samples/s, as inv-b.js computes it.
function distantSpec(reachLow) {
  const sr = 20;
  const dur = 1860;
  const opt = suggestStft(sr, dur);
  if (reachLow) opt.fMin = fMinReaching(0.02, sr, opt);
  const s = stft(new Float64Array(sr * dur).map((_, i) => Math.sin(i / 7)), sr, opt);
  return { range: { lo: s.freqs[0], hi: s.freqs[s.nF - 1] }, df: s.df }; // the log axis's range
}
const DISTANT = { lo: 0.02, hi: 1 };
const LOCAL = { lo: 1, hi: 10 };

test('a finger gets a wider grab zone than a mouse; unknown pointers count as a mouse', () => {
  assert.ok(edgeGrabPx('touch') > edgeGrabPx('pen'));
  assert.ok(edgeGrabPx('pen') > edgeGrabPx('mouse'));
  assert.ok(edgeGrabPx('touch') >= 14, 'about half a fingertip');
  assert.equal(edgeGrabPx(''), edgeGrabPx('mouse'));
  assert.equal(edgeGrabPx(undefined), edgeGrabPx('mouse'));
});

test('bandEdgeAt: on or near an edge grabs it, elsewhere nothing', () => {
  // top edge at 100 px, bottom edge at 200 px (y grows downward)
  assert.equal(bandEdgeAt(100, 100, 200, 7), 'hi');
  assert.equal(bandEdgeAt(106, 100, 200, 7), 'hi');
  assert.equal(bandEdgeAt(93, 100, 200, 7), 'hi');
  assert.equal(bandEdgeAt(200, 100, 200, 7), 'lo');
  assert.equal(bandEdgeAt(207, 100, 200, 7), 'lo');
  assert.equal(bandEdgeAt(150, 100, 200, 7), null, 'the middle of the band starts a new band');
  assert.equal(bandEdgeAt(108, 100, 200, 7), null, 'just out of reach of a mouse');
  assert.equal(bandEdgeAt(30, 100, 200, 7), null);
  assert.equal(bandEdgeAt(NaN, 100, 200, 7), null);
});

test('bandEdgeAt: 12 px off the line grabs it by touch but not by mouse', () => {
  assert.equal(bandEdgeAt(112, 100, 200, edgeGrabPx('mouse')), null);
  assert.equal(bandEdgeAt(112, 100, 200, edgeGrabPx('touch')), 'hi');
  assert.equal(bandEdgeAt(188, 100, 200, edgeGrabPx('touch')), 'lo');
});

test('bandEdgeAt: on a thin band the nearer edge wins; a tie goes by side', () => {
  assert.equal(bandEdgeAt(101, 100, 106, 7), 'hi');
  assert.equal(bandEdgeAt(105, 100, 106, 7), 'lo');
  assert.equal(bandEdgeAt(103, 100, 106, 7), 'hi', 'halfway: the top edge');
  // edges on top of each other
  assert.equal(bandEdgeAt(95, 100, 100, 7), 'hi', 'above: the top edge');
  assert.equal(bandEdgeAt(105, 100, 100, 7), 'lo', 'below: the bottom edge');
});

test('fmtBandHz matches the readouts in the panel', () => {
  assert.equal(fmtBandHz(1), '1.0');
  assert.equal(fmtBandHz(2.5), '2.5');
  assert.equal(fmtBandHz(9.62), '9.6');
  assert.equal(fmtBandHz(10), '10');
  assert.equal(fmtBandHz(18.4), '18');
  assert.equal(fmtBandHz(0.02), '0.020');
  assert.equal(fmtBandHz(0.5), '0.50');
});

test('bandLabel: the hint until the student first changes the band', () => {
  const first = bandLabel({ lo: 1, hi: 10 }, false);
  assert.equal(first.hint, true);
  assert.equal(first.choices[0], '↕ Drag up or down to choose a band of notes');
  for (const t of first.choices) assert.match(t, /^↕ Drag/);
});

test('bandLabel: with no band (all notes kept) the hint comes back, even after a drag', () => {
  for (const learned of [false, true]) {
    const l = bandLabel(null, learned);
    assert.equal(l.hint, true);
    assert.match(l.choices[0], /Drag up or down/);
  }
});

test('bandLabel: after a change, the band and how to change it, longest first', () => {
  const l = bandLabel({ lo: 1, hi: 10 }, true);
  assert.equal(l.hint, false);
  assert.equal(l.choices[0], '1.0–10 Hz · drag an edge to change it · double-click for all notes');
  assert.ok(l.choices.includes('1.0–10 Hz · drag an edge to change it'));
  assert.equal(l.choices.at(-1), '1.0–10 Hz', 'the shortest is the band alone');
  for (const t of l.choices) assert.ok(t.startsWith('1.0–10 Hz'));
  for (let i = 1; i < l.choices.length; i++) assert.ok(l.choices[i].length < l.choices[i - 1].length);
});

test('firstThatFits: the longest text that fits, or the shortest when none does', () => {
  const measure = (t) => t.length * 6; // 6 px per character
  const choices = ['a long label here', 'shorter one', 'tiny'];
  assert.equal(firstThatFits(choices, 1000, measure), 'a long label here');
  assert.equal(firstThatFits(choices, 70, measure), 'shorter one');
  assert.equal(firstThatFits(choices, 30, measure), 'tiny');
  assert.equal(firstThatFits(choices, 5, measure), 'tiny');
});

test('B, distant quake: the band\'s bottom edge on the plot reads 0.020 Hz, as in the panel', () => {
  const { range, df } = distantSpec(true);
  const b = bandOnPlot({ ...DISTANT }, range, df, DISTANT);
  assert.deepEqual(b, DISTANT, 'the filter keeps 0.02-1 Hz');
  assert.equal(`${fmtBandHz(b.lo)}–${fmtBandHz(b.hi)} Hz`, '0.020–1.0 Hz');
  // The old plot started at its first step at or above 0.02 Hz, so the edge read 0.039 Hz.
  const old = distantSpec(false);
  assert.equal(fmtBandHz(clampBandTo(0.02, 1, old.range, old.df).lo), '0.039');
});

test('B: the band is kept on the plot, edges rounded to 3 figures', () => {
  const range = { lo: 0, hi: 25 };
  const df = 100 / 256;
  assert.deepEqual(bandOnPlot({ ...LOCAL }, range, df, LOCAL), LOCAL, 'a local quake keeps 1-10 Hz');
  assert.deepEqual(bandOnPlot({ lo: 0.1, hi: 30 }, range, df, LOCAL), { lo: 0.391, hi: 25 }, 'above 0 Hz, under the top');
  assert.deepEqual(clampBandTo(2.34567, 8.7654, range, df), { lo: 2.35, hi: 8.77 });
});

test('B: a band the plot squashes to nothing goes back to the starting band', () => {
  // 21-25 Hz chosen at a 100 samples/s station, then a 40 samples/s one (plot to 20 Hz).
  const b = bandOnPlot({ lo: 21, hi: 25 }, { lo: 0, hi: 20 }, 40 / 128, LOCAL);
  assert.deepEqual(b, LOCAL);
  assert.ok(b.hi > b.lo);
});

test('B: "all notes" (no band) stays as it is', () => {
  const none = { lo: null, hi: null };
  assert.equal(bandOnPlot(none, { lo: 0, hi: 25 }, 0.39, LOCAL), none);
  assert.equal(bandOnPlot(null, { lo: 0, hi: 25 }, 0.39, LOCAL), null);
});
