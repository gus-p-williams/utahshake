// Quake Waves: the label on the map that says the quake can be moved. The pure parts:
// its wording for mouse and touch, and where it goes so it never covers the clock.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { pointerVerb, mapHintChoices, keyHintChoices, firstThatFits, layoutMapHint } from '../docs/app/js/quake-waves/map-hint.js';

const measure = (t) => 7 * t.length; // a fake font: 7 px per character
const H = 24;
const base = {
  choices: mapHintChoices('Click'), measure, lead: 30, pad: 11, h: H,
};
// The clock in the top-left corner: "88.8 s after the quake", 150 px wide, 17 px tall.
const clockAt = (left, top = 14) => ({ left, right: left + 150, top, bottom: top + 17 });
const overlaps = (a, b) => a.x < b.right && a.x + a.w > b.left && a.y < b.bottom && a.y + a.h > b.top;

test('the verb follows the pointer: Tap for a finger, Click for a mouse or trackpad', () => {
  assert.equal(pointerVerb(true), 'Tap');
  assert.equal(pointerVerb(false), 'Click');
  assert.equal(mapHintChoices('Tap')[0], 'Tap the map to move the quake');
  assert.equal(mapHintChoices('Click')[0], 'Click the map to move the quake');
});

test('the choices go from longest to shortest and all say the quake moves', () => {
  for (const verb of ['Click', 'Tap']) {
    const c = mapHintChoices(verb);
    for (let i = 1; i < c.length; i++) assert.ok(c[i].length < c[i - 1].length, c[i]);
    for (const t of c) assert.match(t, new RegExp(`^${verb} .*move`));
  }
});

test('firstThatFits: the longest text that fits, else the shortest', () => {
  const c = ['aaaaaa', 'aaaa', 'aa'];
  assert.equal(firstThatFits(c, 100, measure), 'aaaaaa');
  assert.equal(firstThatFits(c, 30, measure), 'aaaa');
  assert.equal(firstThatFits(c, 5, measure), 'aa');
});

test('a wide map (projector, laptop): centered in the clock row, with the whole text', () => {
  const map = { left: 70, right: 870 };
  const clock = clockAt(78);
  const l = layoutMapHint({ ...base, map, clock });
  assert.equal(l.row, 1);
  assert.equal(l.text, 'Click the map to move the quake');
  assert.equal(l.w, 30 + measure(l.text) + 11);
  assert.ok(Math.abs(l.x + l.w / 2 - (map.left + map.right) / 2) < 1e-9, 'centered on the map');
  assert.ok(Math.abs(l.y + H / 2 - (clock.top + clock.bottom) / 2) < 1e-9, 'level with the clock');
  assert.ok(!overlaps(l, clock));
});

test('a mid-size map: at the right end of the clock row when centering would cover the clock', () => {
  const map = { left: 10, right: 520 };
  const clock = clockAt(18);
  const l = layoutMapHint({ ...base, map, clock });
  assert.equal(l.row, 1);
  assert.equal(l.x + l.w, map.right - 8, 'right end, 8 px from the edge');
  assert.ok(l.x >= clock.right + 14, 'clear of the clock');
  assert.equal(l.text, 'Click the map to move the quake');
});

test('a phone: in a second row under the clock, still with the whole text', () => {
  const map = { left: 18, right: 340 };
  const clock = clockAt(26);
  const l = layoutMapHint({ ...base, map, clock, choices: mapHintChoices('Tap') });
  assert.equal(l.row, 2);
  assert.equal(l.text, 'Tap the map to move the quake');
  assert.equal(l.x, clock.left, 'lined up with the clock');
  assert.ok(l.y >= clock.bottom, 'below the clock');
  assert.ok(!overlaps(l, clock));
  assert.ok(l.x + l.w <= map.right - 8, 'inside the map');
});

test('a very narrow map: a shorter text in the second row, never wider than the map', () => {
  const map = { left: 5, right: 205 };
  const clock = clockAt(13);
  const l = layoutMapHint({ ...base, map, clock });
  assert.equal(l.row, 2);
  assert.notEqual(l.text, base.choices[0]);
  assert.ok(l.x + l.w <= map.right - 8);
});

test('the label never covers the clock, at any map width from phone to projector', () => {
  for (let width = 200; width <= 1400; width += 10) {
    const map = { left: 6, right: 6 + width };
    const clock = clockAt(14);
    for (const [name, choices] of [['Click', mapHintChoices('Click')], ['Tap', mapHintChoices('Tap')], ['keys', keyHintChoices()]]) {
      const l = layoutMapHint({ ...base, map, clock, choices });
      assert.ok(!overlaps(l, clock), `width ${width} (${name})`);
      assert.ok(l.x >= map.left && l.x + l.w <= map.right, `inside the map at width ${width} (${name})`);
    }
  }
});

test('with keyboard focus, the label names the keys: arrows move the quake, Shift for bigger steps', () => {
  const c = keyHintChoices();
  assert.equal(c[0], 'Arrow keys move the quake · Shift: bigger steps');
  for (let i = 1; i < c.length; i++) assert.ok(c[i].length < c[i - 1].length, c[i]);
  for (const t of c) assert.match(t, /^Arrow keys move/);
  // A laptop-size map has room for the whole text in the clock's row.
  const l = layoutMapHint({ ...base, choices: c, map: { left: 70, right: 870 }, clock: clockAt(78) });
  assert.equal(l.row, 1);
  assert.equal(l.text, c[0]);
});
