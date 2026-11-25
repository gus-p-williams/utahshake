// Quake Waves: moving the quake with the keyboard. Pure (no DOM), so node --test can check it
// (tests/quake-waves-keys.test.js); app.js wires it to the map.
//
// The map takes focus with Tab. The arrow keys move the quake 5 km, Shift + an arrow key
// 20 km, and it never leaves the map. After each move, screen readers hear where the quake
// is and how far it is from the nearest station (the text below).

export const STEP_KM = 5;
export const BIG_STEP_KM = 20;

const DIRECTIONS = {
  ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1],
};

/**
 * How far a key moves the quake, km (x to the right, y down the map), or null for any
 * other key (Tab, Enter and the rest keep working as usual).
 * @param {string} key KeyboardEvent.key
 * @param {boolean} shift Shift held: a bigger step
 */
export function keyStep(key, shift) {
  const d = DIRECTIONS[key];
  if (!d) return null;
  const km = shift ? BIG_STEP_KM : STEP_KM;
  return { dx: d[0] * km, dy: d[1] * km };
}

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

/**
 * The quake after a key press, kept on the map (0 to world.w km across, 0 to world.h km down).
 * @param {{x:number, y:number}} quake km from the map's top-left corner
 * @param {string} key
 * @param {boolean} shift
 * @param {{w:number, h:number}} world the map's size, km
 * @returns {{quake:{x:number, y:number}, atEdge:boolean} | null} null if the key doesn't
 *   move the quake; atEdge when the edge of the map stopped it (part or all of the step)
 */
export function moveQuake(quake, key, shift, world) {
  const s = keyStep(key, shift);
  if (!s) return null;
  const want = { x: quake.x + s.dx, y: quake.y + s.dy };
  const moved = { x: clamp(want.x, 0, world.w), y: clamp(want.y, 0, world.h) };
  return { quake: moved, atEdge: moved.x !== want.x || moved.y !== want.y };
}

/** The station nearest the quake, and its distance (km). */
export function nearestStation(quake, stations) {
  let best = null;
  for (const st of stations) {
    const km = Math.hypot(st.x - quake.x, st.y - quake.y);
    if (!best || km < best.km) best = { name: st.name, km };
  }
  return best;
}

/**
 * What screen readers hear about the quake's place, e.g. "Quake 90 km from the left and
 * 60 km from the top. Nearest station: A, 25 km away." It starts with "Edge of the map."
 * when the edge stopped the last step.
 * @param {{x:number, y:number}} quake
 * @param {{name:string, x:number, y:number}[]} stations
 * @param {boolean} [atEdge]
 */
export function describeQuake(quake, stations, atEdge = false) {
  const near = nearestStation(quake, stations);
  const where = `Quake ${Math.round(quake.x)} km from the left and ${Math.round(quake.y)} km from the top.`;
  const station = near ? ` Nearest station: ${near.name}, ${Math.round(near.km)} km away.` : '';
  return `${atEdge ? 'Edge of the map. ' : ''}${where}${station}`;
}
