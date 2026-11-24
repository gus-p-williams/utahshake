// Quake Explorer B: choosing a band on the spectrogram. The pure parts of the view:
// which edge a pointer grabs, how close a finger must be, and what the label on the plot says.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  edgeGrabPx, bandEdgeAt, fmtBandHz, bandLabel, firstThatFits,
} from '../docs/app/js/quake-explorer/spectrogram-view.js';

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
