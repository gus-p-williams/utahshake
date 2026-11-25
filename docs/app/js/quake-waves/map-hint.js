// Quake Waves: the label on the map that tells students they can move the quake.
// Pure layout and wording (no DOM), so node --test can check it
// (tests/quake-waves-hint.test.js); app.js draws it on the canvas.
//
// The label is a pill with the quake's star and "Click the map to move the quake"
// ("Tap …" when the main pointer is a finger). It is bold (accent color) until the
// student first moves the quake, then faint. It sits in the empty band at the top
// of the map, clear of the clock in the top-left corner: centered on the map if it
// clears the clock, else at the right end of the clock's row, else in a second row
// under the clock.
//
// While the map has keyboard focus (Tab, not a click), the label names the keys instead
// ("Arrow keys move the quake · Shift: bigger steps"; map-keys.js moves the quake).

/** The verb for the device: 'Tap' when the main pointer is coarse (a finger), else 'Click'. */
export function pointerVerb(coarse) {
  return coarse ? 'Tap' : 'Click';
}

/** What the label can say, longest first. */
export function mapHintChoices(verb) {
  return [`${verb} the map to move the quake`, `${verb} to move the quake`, `${verb} to move it`];
}

/** What the label says while the map has keyboard focus, longest first. */
export function keyHintChoices() {
  return ['Arrow keys move the quake · Shift: bigger steps', 'Arrow keys move the quake', 'Arrow keys move it'];
}

/** The first text whose width (measure(text), px) is at most maxW; the last one if none fits. */
export function firstThatFits(choices, maxW, measure) {
  return choices.find((t) => measure(t) <= maxW) ?? choices[choices.length - 1];
}

/**
 * Where the label goes, and what it says.
 * @param {object} o
 * @param {{left:number, right:number}} o.map  the map's left and right edges on the canvas, px
 * @param {{left:number, right:number, top:number, bottom:number}} o.clock  the clock text's box, px
 * @param {string[]} o.choices  texts, longest first (mapHintChoices)
 * @param {(text:string) => number} o.measure  text width, px
 * @param {number} o.lead  width taken by the star and padding, px (pill width = lead + text + pad)
 * @param {number} o.pad  padding after the text, px
 * @param {number} o.h  pill height, px
 * @param {number} [o.margin]  gap to the map's edges, px
 * @param {number} [o.gap]  smallest gap between the clock and the pill, px
 * @returns {{text:string, x:number, y:number, w:number, h:number, row:1|2}}
 */
export function layoutMapHint({ map, clock, choices, measure, lead, pad, h, margin = 8, gap = 14 }) {
  const widthOf = (text) => lead + measure(text) + pad;
  const text = choices[0];
  const w = widthOf(text);
  const y1 = (clock.top + clock.bottom) / 2 - h / 2;
  const centered = (map.left + map.right) / 2 - w / 2;
  if (centered >= clock.right + gap && centered + w <= map.right - margin) {
    return { text, x: centered, y: y1, w, h, row: 1 };
  }
  const right = map.right - margin - w;
  if (right >= clock.right + gap) return { text, x: right, y: y1, w, h, row: 1 };
  // Second row, under the clock: the whole width of the map is free.
  const room = map.right - margin - clock.left;
  const fit = firstThatFits(choices, room, widthOf);
  return { text: fit, x: clock.left, y: clock.bottom + 6, w: Math.min(widthOf(fit), room), h, row: 2 };
}
