// How P and S waves move rock (figure W1 on the Seismic waves page). A cartoon: one P pulse
// and one S pulse leave a quake at the left edge together and cross a block of rock drawn
// as a grid of particles. P moves each particle back and forth along the travel direction,
// so the grid bunches up and spreads out; S moves it up and down across the travel
// direction, so the grid shears into a traveling bump. S is slower and falls behind.
// One colored particle in each block shows the key idea: the wave travels on, the rock
// only moves and comes back. Everything is a function of the time t, so the slider can
// step back and forth. The pulse itself is in js/lib/wave-motion.js.
import { VP, VS, displacement, peakKm, endTime } from '../lib/wave-motion.js';

const $ = (id) => document.getElementById(id);
const LENGTH = 60;                 // km of rock shown
const COLS = 50;
const ROWS = 5;
const DX = LENGTH / COLS;          // 1.2 km between particles
const EXTRA = 3;                   // columns drawn beyond each end, so rock can slide in from outside
const WIDTH = 3.5;                 // pulse width, km
const AMP_P = 1.1;                 // km a P particle swings: hugely exaggerated (real rock moves a fraction of a mm)
const POSTER_T = 5;                // the still frame shown before Play: both pulses in the block
const DURATION = endTime(LENGTH, VS, WIDTH);
const colX = (i) => (i + 0.5) * DX;
// The colored particle: the column the P peak is passing in the still frame, middle row.
const TRACK = Math.round(peakKm(POSTER_T, VP) / DX - 0.5);
const TRACK_X = colX(TRACK);
const TRACK_ROW = Math.floor(ROWS / 2);
// Reduced motion: never autoplay (true for everyone), and play at half speed.
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)');

const sim = { t: POSTER_T, playing: false, poster: true, lastLog: '' };
const canvas = $('strips');

function css(name, fallback) {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fallback;
}
function colors() {
  return {
    land: css('--land', '#f3efe4'), text: css('--text', '#111827'), muted: css('--muted', '#5b6472'),
    bg: css('--trace-bg', '#fff'), trace: css('--trace', '#1f2937'),
    p: css('--pick-p', '#1d4ed8'), s: css('--pick-s', '#c0262d'),
  };
}
/** '#rrggbb' (or '#rgb') -> 'rgba(r, g, b, a)'. */
function rgba(hex, a) {
  let h = hex.replace('#', '');
  if (h.length === 3) h = [...h].map((c) => c + c).join('');
  const n = parseInt(h.slice(0, 6), 16);
  if (Number.isNaN(n)) return `rgba(128, 128, 128, ${a})`;
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${a})`;
}

// ---------------------------------------------------------------------------
// Drawing

function fitCanvas(c) {
  const dpr = window.devicePixelRatio || 1;
  const w = Math.max(50, c.clientWidth);
  const h = Math.max(50, c.clientHeight);
  if (c.width !== Math.round(w * dpr) || c.height !== Math.round(h * dpr)) {
    c.width = Math.round(w * dpr);
    c.height = Math.round(h * dpr);
  }
  const ctx = c.getContext('2d');
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  return { ctx, w, h };
}

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

/**
 * Where everything goes, top to bottom: header; P label, P block, "squeezed/stretched";
 * S label, S block with room above and below for the bump; distance axis.
 */
function layout(w, h) {
  const narrow = w < 560;
  const padL = 14;
  const padR = narrow ? 14 : 18;
  const headH = 22;
  const labelH = 21;
  const pUnder = 18;                   // under the P block: "squeezed" and "stretched"
  const axisH = 34;
  const fixed = headH + 2 * labelH + pUnder + axisH;
  const room = 0.36;                   // S: room above and below the block, as a fraction of its height
  // Block height: fill the room, but keep the grid cells from getting much taller than wide.
  const cell = (DX / LENGTH) * (w - padL - padR);
  const bh = clamp((h - fixed - 10) / (2 + 2 * room), 30, clamp(6.5 * cell, 36, 64));
  const m = bh * room;
  const gap = Math.max(0, h - fixed - bh * (2 + 2 * room)) / 4;
  const L = { narrow, padL, padR, headTop: 2, bh, m, x: (km) => padL + (km / LENGTH) * (w - padL - padR) };
  let y = L.headTop + headH + gap;
  L.pLabel = y; y += labelH;
  L.pTop = y; y += bh + pUnder + gap;
  L.sLabel = y; y += labelH;
  L.sTop = y + m; y += bh + 2 * m + gap;
  L.axis = y;
  L.sAmp = m - (narrow ? 3 : 5);       // px an S particle swings
  L.dot = narrow ? 1.7 : 2.3;
  return L;
}

function haloText(ctx, text, x, y, color, bg) {
  ctx.lineWidth = 4;
  ctx.strokeStyle = bg;
  ctx.lineJoin = 'round';
  ctx.strokeText(text, x, y);
  ctx.fillStyle = color;
  ctx.fillText(text, x, y);
}

/** First of `options` that fits in `room` px (trying 13px, then 12px type), or ''. */
function fit(ctx, options, room) {
  for (const size of [13, 12]) {
    ctx.font = `${size}px system-ui, sans-serif`;
    for (const s of options) if (ctx.measureText(s).width <= room) return s;
  }
  return '';
}

const LABELS = {
  P: ['rock moves back and forth, along the travel direction (like a Slinky)',
    'back and forth, along the travel direction (like a Slinky)', 'back and forth (like a Slinky)', 'back and forth'],
  S: ['rock moves up and down, across the travel direction (like a rope)',
    'up and down, across the travel direction (like a rope)', 'up and down (like a rope)', 'up and down'],
};

function drawLabel(ctx, L, w, kind, col) {
  const y = (kind === 'P' ? L.pLabel : L.sLabel) + 2;
  const color = kind === 'P' ? col.p : col.s;
  const speed = `${kind}: ${(kind === 'P' ? VP : VS).toFixed(1)} km/s`;
  ctx.textBaseline = 'top';
  ctx.font = 'bold 14px system-ui, sans-serif';
  ctx.textAlign = 'left';
  const name = `${kind} wave`;
  haloText(ctx, name, L.padL, y - 1, color, col.bg);
  const nameW = ctx.measureText(name).width;
  ctx.font = 'bold 13px system-ui, sans-serif';
  ctx.textAlign = 'right';
  haloText(ctx, speed, w - L.padR, y, color, col.bg);
  const speedW = ctx.measureText(speed).width;
  const room = w - L.padL - L.padR - nameW - speedW - 22;
  const text = fit(ctx, LABELS[kind], room);
  if (text) {
    ctx.textAlign = 'left';
    ctx.fillStyle = col.muted;
    ctx.fillText(text, L.padL + nameW + 8, y + 1);
  }
}

/** One block of rock with its particles. kind 'P': along the travel direction; 'S': across. */
function drawStrip(ctx, L, kind, col, t) {
  const isP = kind === 'P';
  const v = isP ? VP : VS;
  const u = (km) => displacement(km, t, v, WIDTH);
  const X = L.x;
  const top = isP ? L.pTop : L.sTop;
  const bot = top + L.bh;
  const rowY = (r) => top + ((r + 0.5) * L.bh) / ROWS;
  // particle position: P moves x (km), S moves y (px, up)
  const pos = (i, r) => {
    const x = colX(i);
    return isP ? [X(x + AMP_P * u(x)), rowY(r)] : [X(x), rowY(r) - L.sAmp * u(x)];
  };

  // Everything stays within the block's ends (a cut-away of a longer stretch of rock).
  ctx.save();
  ctx.beginPath();
  ctx.rect(X(0), 0, X(LENGTH) - X(0), ctx.canvas.height);
  ctx.clip();

  // The block of rock. S: its top and bottom edges ride up and down with the rock.
  ctx.fillStyle = col.land;
  if (isP) {
    ctx.fillRect(X(0), top, X(LENGTH) - X(0), L.bh);
    // Squeezed rock is shaded darker, by how close neighboring bits of rock have come
    // together. Thin slices, their edges snapped to device pixels so no seams show.
    const dpr = window.devicePixelRatio || 1;
    const snap = (px) => Math.round(px * dpr) / dpr;
    const step = 0.25;
    let prev = -EXTRA * DX + AMP_P * u(-EXTRA * DX);
    for (let m = step - EXTRA * DX; m <= LENGTH + 1e-9; m += step) {
      const p = m + AMP_P * u(m);
      const squeeze = 1 - (p - prev) / step;      // > 0 where the rock is squeezed
      if (squeeze > 0.05) {
        const x0 = snap(X(clamp(prev, 0, LENGTH)));
        const x1 = snap(X(clamp(p, 0, LENGTH)));
        ctx.fillStyle = rgba(col.text, Math.min(0.42, 1.1 * squeeze * squeeze));
        if (x1 > x0) ctx.fillRect(x0, top, x1 - x0, L.bh);
      }
      prev = p;
    }
  } else {
    ctx.beginPath();
    for (let km = 0; km <= LENGTH + 1e-9; km += 0.25) ctx.lineTo(X(km), top - L.sAmp * u(km));
    for (let km = LENGTH; km >= -1e-9; km -= 0.25) ctx.lineTo(X(km), bot - L.sAmp * u(km));
    ctx.closePath();
    ctx.fill();
  }

  // Faint lines joining neighbors, so the grid's shape shows.
  ctx.strokeStyle = rgba(col.muted, 0.45);
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let r = 0; r < ROWS; r++) {
    for (let i = -EXTRA; i < COLS + EXTRA; i++) {
      const [x, y] = pos(i, r);
      if (i > -EXTRA) ctx.lineTo(x, y); else ctx.moveTo(x, y);
    }
  }
  for (let i = -EXTRA; i < COLS + EXTRA; i++) {
    const [x0, y0] = pos(i, 0);
    const [x1, y1] = pos(i, ROWS - 1);
    ctx.moveTo(x0, y0);
    ctx.lineTo(x1, y1);
  }
  ctx.stroke();

  // The particles.
  ctx.fillStyle = rgba(col.trace, 0.85);
  ctx.beginPath();
  for (let r = 0; r < ROWS; r++) {
    for (let i = -EXTRA; i < COLS + EXTRA; i++) {
      if (i === TRACK && r === TRACK_ROW) continue;
      const [x, y] = pos(i, r);
      ctx.moveTo(x + L.dot, y);
      ctx.arc(x, y, L.dot, 0, 2 * Math.PI);
    }
  }
  ctx.fill();
  ctx.restore();

  // The colored particle: a ring at its rest spot, a thin line to where it is now.
  const color = isP ? col.p : col.s;
  const rx = X(TRACK_X);
  const ry = rowY(TRACK_ROW);
  const [cx, cy] = pos(TRACK, TRACK_ROW);
  const rad = L.narrow ? 4 : 5;
  ctx.strokeStyle = color;
  ctx.lineWidth = 1.5;
  ctx.setLineDash([2, 2]);
  ctx.beginPath(); ctx.arc(rx, ry, rad + 1.5, 0, 2 * Math.PI); ctx.stroke();
  ctx.setLineDash([]);
  if (Math.hypot(cx - rx, cy - ry) > rad) {
    ctx.beginPath(); ctx.moveTo(rx, ry); ctx.lineTo(cx, cy); ctx.stroke();
  }
  ctx.beginPath(); ctx.arc(cx, cy, rad, 0, 2 * Math.PI);
  ctx.fillStyle = color;
  ctx.fill();
  ctx.lineWidth = 1.5;
  ctx.strokeStyle = col.bg;
  ctx.stroke();

  // P: name the squeezed and stretched parts of the pulse, under the block.
  if (isP) {
    const at = (s) => { const m = peakKm(t, VP) + s * WIDTH; return m + AMP_P * u(m); };
    const sq = at(0.62);   // most squeezed (just ahead of the peak)
    const st = at(-0.62);  // most stretched (just behind it)
    ctx.font = '11px system-ui, sans-serif';
    ctx.textBaseline = 'top';
    ctx.fillStyle = col.muted;
    const y = bot + 3;
    const wSq = ctx.measureText('squeezed').width;
    const wSt = ctx.measureText('stretched').width;
    if (X(sq) + wSq < X(LENGTH) + 4 && sq > 0.5) { ctx.textAlign = 'left'; ctx.fillText('squeezed', X(sq) - 2, y); }
    if (X(st) - wSt > X(0) - 4 && st < LENGTH - 0.5) { ctx.textAlign = 'right'; ctx.fillText('stretched', X(st) + 2, y); }
  }
}

function drawAxis(ctx, L, w, col, t) {
  const X = L.x;
  const y = L.axis + 2;
  ctx.strokeStyle = col.muted;
  ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(X(0), y + 0.5); ctx.lineTo(X(LENGTH), y + 0.5);
  for (let km = 0; km <= LENGTH; km += 10) {
    const gx = Math.round(X(km)) + 0.5;
    ctx.moveTo(gx, y); ctx.lineTo(gx, y + 5);
  }
  ctx.stroke();
  ctx.font = '11px system-ui, sans-serif';
  ctx.textBaseline = 'top';
  ctx.textAlign = 'center';
  ctx.fillStyle = col.muted;
  for (let km = 0; km <= LENGTH; km += 10) ctx.fillText(String(km), X(km), y + 7);
  ctx.textAlign = 'left';
  ctx.fillText(L.narrow ? 'distance (km)' : 'distance from the quake (km)', X(0), y + 20);
  ctx.textAlign = 'right';
  ctx.font = 'italic 11px system-ui, sans-serif';
  ctx.fillText('motion exaggerated', X(LENGTH), y + 20);
  // Where each pulse's peak is now: small triangles on the axis.
  for (const [v, c] of [[VS, col.s], [VP, col.p]]) {
    const km = peakKm(t, v);
    if (t <= 0 || km > LENGTH) continue;
    ctx.fillStyle = c;
    ctx.beginPath();
    ctx.moveTo(X(km), y + 1); ctx.lineTo(X(km) - 5, y - 6); ctx.lineTo(X(km) + 5, y - 6);
    ctx.closePath();
    ctx.fill();
  }
}

function draw() {
  const { ctx, w, h } = fitCanvas(canvas);
  const col = colors();
  const L = layout(w, h);
  const t = sim.t;
  ctx.fillStyle = col.bg;
  ctx.fillRect(0, 0, w, h);

  // header: the clock, and which way the waves go
  ctx.textBaseline = 'top';
  ctx.textAlign = 'left';
  ctx.font = 'bold 14px system-ui, sans-serif';
  ctx.fillStyle = col.text;
  ctx.fillText(`${t.toFixed(1)} s after the quake`, L.padL, L.headTop + 3);
  ctx.textAlign = 'right';
  ctx.font = '600 13px system-ui, sans-serif';
  ctx.fillStyle = col.muted;
  ctx.fillText('travel direction →', w - L.padR, L.headTop + 4);

  drawLabel(ctx, L, w, 'P', col);
  drawStrip(ctx, L, 'P', col, t);
  drawLabel(ctx, L, w, 'S', col);
  drawStrip(ctx, L, 'S', col, t);
  drawAxis(ctx, L, w, col, t);

  $('scrub').value = String(t);
  const text = logText(t);
  if (text !== sim.lastLog) {
    $('log').textContent = text;
    sim.lastLog = text;
  }
}

/** One line on what to watch (read out by screen readers when it changes). */
function logText(t) {
  if (sim.poster) return 'Press Play. Watch the colored dots: the wave moves on, but each bit of rock only moves and comes back.';
  const near = 2 * WIDTH; // the pulse is moving the dot while it is this close
  if (t >= DURATION) return 'Both waves have passed. Every bit of rock is back at its rest spot.';
  if (t >= (TRACK_X + near) / VS) return 'The red dot is back at its rest spot too. The wave travels; the rock stays.';
  if (t >= (TRACK_X - near) / VS) return 'S reaches the red dot, later than P: it moves up and down, across the travel direction.';
  if (t >= (TRACK_X + near) / VP) return 'The blue dot is back at its rest spot. The P wave moved on; the rock did not.';
  if (t >= (TRACK_X - near) / VP) return 'P reaches the blue dot: it moves back and forth, along the travel direction.';
  return 'P and S leave the quake together. P is faster, so it pulls ahead.';
}

// ---------------------------------------------------------------------------
// Playing

let lastFrame = 0;
function frame(now) {
  if (!sim.playing) return;
  const dt = lastFrame ? Math.min(0.1, (now - lastFrame) / 1000) : 0;
  lastFrame = now;
  sim.t = Math.min(DURATION, sim.t + dt * (reduceMotion.matches ? 0.5 : 1));
  draw();
  if (sim.t >= DURATION) { setPlaying(false); return; }
  requestAnimationFrame(frame);
}

function setPlaying(on) {
  sim.playing = on;
  $('play').textContent = on ? '❚❚ Pause' : sim.t >= DURATION ? '▶ Play again' : '▶ Play';
  if (on) {
    // The still frame is only a preview: the first Play starts at the quake.
    if (sim.poster || sim.t >= DURATION) sim.t = 0;
    sim.poster = false;
    lastFrame = 0;
    draw();
    requestAnimationFrame(frame);
  }
}

/** In a docs page (same site), follow the docs' light/dark switch instead of the device. */
function followDocsTheme() {
  try {
    if (window.parent === window) return;
    const body = window.parent.document.body;
    const apply = () => {
      const scheme = body.getAttribute('data-md-color-scheme');
      if (!scheme) return;
      document.documentElement.dataset.theme = scheme === 'slate' ? 'dark' : 'light';
      draw();
    };
    apply();
    new MutationObserver(apply).observe(body, { attributes: true, attributeFilter: ['data-md-color-scheme'] });
  } catch { /* another site: keep following the device */ }
}

function init() {
  const params = new URLSearchParams(location.search);
  if (params.has('embed') || window.parent !== window) document.body.classList.add('embed');
  $('scrub').max = String(DURATION);

  $('play').addEventListener('click', () => setPlaying(!sim.playing));
  $('restart').addEventListener('click', () => { sim.t = 0; sim.poster = false; setPlaying(true); });
  $('scrub').addEventListener('input', (e) => {
    sim.t = Number(e.target.value);
    sim.poster = false;
    setPlaying(false);
    draw();
  });
  new ResizeObserver(() => draw()).observe(canvas);
  matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => draw());
  followDocsTheme();
  draw();
}

init();
