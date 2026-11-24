// Quake Waves: a cartoon of P and S waves spreading from a quake and
// reaching four stations. Each station's seismogram is drawn as the waves pass;
// after S arrives, the S - P time becomes a distance circle around the station,
// and the circles cross at the quake. Everything is a function of the time t,
// so the slider can step back and forth. See docs/apps/quake-waves.md and
// docs/theory/locating.md (which embeds it with ?embed=1).
import { arrivals, synthTrace, durationFor } from '../lib/wave-sim.js';
import { kmPerSecond } from '../lib/locate.js';
import { setupEmbed, followDocsTheme } from '../ui/page.js';

const $ = (id) => document.getElementById(id);
const VP = 5.8;
const VS = 3.3;
const RATE = 50;                       // samples per second in the cartoon seismograms
const WORLD = { w: 200, h: 120 };      // map size, km
const STATIONS = [
  { name: 'A', x: 70, y: 45, color: '#7c3aed' },
  { name: 'B', x: 175, y: 35, color: '#0d9488' },
  { name: 'C', x: 120, y: 100, color: '#b45309' },
  { name: 'D', x: 30, y: 100, color: '#15803d' },
];
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

const sim = {
  quake: { x: 85, y: 62 },
  t: 0,
  playing: false,
  speed: 4,
  circles: true,
  duration: 40,
  rows: [],          // per station: {dist, p, s, data}
  lastLog: '',
};

const mapCanvas = $('map');
const traceCanvas = $('traces');

function css(name, fallback) {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fallback;
}
function colors() {
  return {
    land: css('--land', '#f3efe4'), grid: css('--grid', '#e8ebef'), text: css('--text', '#111'),
    muted: css('--muted', '#5b6472'), bg: css('--trace-bg', '#fff'), trace: css('--trace', '#1f2937'),
    p: css('--pick-p', '#1d4ed8'), s: css('--pick-s', '#c0262d'), border: css('--border', '#d9dde3'),
  };
}

// ---------------------------------------------------------------------------
// Model

function setup() {
  const k = kmPerSecond(VP, VS);
  sim.rows = STATIONS.map((st) => {
    const dist = Math.hypot(st.x - sim.quake.x, st.y - sim.quake.y);
    return { ...st, dist, k, ...arrivals(dist, VP, VS) };
  });
  sim.duration = durationFor(sim.rows.map((r) => r.dist), VS);
  for (const [i, r] of sim.rows.entries()) {
    r.data = synthTrace({ distKm: r.dist, vp: VP, vs: VS, durationSec: sim.duration, rate: RATE, seed: i + 1 });
  }
  sim.peak = Math.max(...sim.rows.map((r) => r.data.reduce((m, v) => Math.max(m, Math.abs(v)), 0)));
  $('scrub').max = String(sim.duration);
}

function valueAt(row, t) {
  const i = Math.round(t * RATE);
  return i >= 0 && i < row.data.length ? row.data[i] : 0;
}

/** Text for the most recent arrival (read out by screen readers). */
function logText(t) {
  let last = null;
  for (const r of sim.rows) {
    if (t >= r.p && (!last || r.p > last.at)) last = { at: r.p, text: `The P wave reached station ${r.name} after ${r.p.toFixed(1)} s.` };
    if (t >= r.s && (!last || r.s > last.at)) {
      last = { at: r.s, text: `The S wave reached station ${r.name} after ${r.s.toFixed(1)} s: S − P = ${(r.s - r.p).toFixed(1)} s, so the quake is ${r.dist.toFixed(0)} km away.` };
    }
  }
  if (!last) return t > 0 ? 'The quake starts: P and S waves leave it at the same moment.' : 'Press Play to start the quake.';
  const allCircles = sim.circles && sim.rows.every((r) => t >= r.s + 2.5);
  return allCircles ? 'All four circles cross at one point: the quake. That is how Wave Race locates quakes.' : last.text;
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

function mapTransform(w, h) {
  const pad = 6;
  const s = Math.min((w - 2 * pad) / WORLD.w, (h - 2 * pad) / WORLD.h);
  const ox = (w - WORLD.w * s) / 2;
  const oy = (h - WORLD.h * s) / 2;
  return { s, ox, oy, x: (km) => ox + km * s, y: (km) => oy + km * s,
    kmX: (px) => (px - ox) / s, kmY: (py) => (py - oy) / s };
}

function haloText(ctx, text, x, y, color, bg) {
  ctx.lineWidth = 4;
  ctx.strokeStyle = bg;
  ctx.lineJoin = 'round';
  ctx.strokeText(text, x, y);
  ctx.fillStyle = color;
  ctx.fillText(text, x, y);
}

function drawMap() {
  const { ctx, w, h } = fitCanvas(mapCanvas);
  const col = colors();
  const T = mapTransform(w, h);
  const t = sim.t;
  ctx.fillStyle = col.bg;
  ctx.fillRect(0, 0, w, h);
  ctx.save();
  ctx.beginPath();
  ctx.rect(T.x(0), T.y(0), WORLD.w * T.s, WORLD.h * T.s);
  ctx.clip();
  ctx.fillStyle = col.land;
  ctx.fillRect(T.x(0), T.y(0), WORLD.w * T.s, WORLD.h * T.s);
  ctx.strokeStyle = col.grid;
  ctx.lineWidth = 1;
  for (let km = 20; km < WORLD.w; km += 20) {
    ctx.beginPath(); ctx.moveTo(T.x(km), T.y(0)); ctx.lineTo(T.x(km), T.y(WORLD.h)); ctx.stroke();
  }
  for (let km = 20; km < WORLD.h; km += 20) {
    ctx.beginPath(); ctx.moveTo(T.x(0), T.y(km)); ctx.lineTo(T.x(WORLD.w), T.y(km)); ctx.stroke();
  }

  const qx = T.x(sim.quake.x);
  const qy = T.y(sim.quake.y);

  // distance circles (dashed), growing after each station's S arrival
  if (sim.circles) {
    for (const r of sim.rows) {
      if (t < r.s) continue;
      const frac = Math.min(1, (t - r.s) / 2.5);
      ctx.save();
      ctx.strokeStyle = r.color;
      ctx.lineWidth = 2;
      ctx.setLineDash([7, 5]);
      ctx.beginPath();
      ctx.arc(T.x(r.x), T.y(r.y), (r.s - r.p) * r.k * frac * T.s, 0, 2 * Math.PI);
      ctx.stroke();
      ctx.restore();
    }
  }

  // wave fronts: a bright edge with a fading band behind it
  const ring = (rKm, color, label) => {
    if (rKm <= 0) return;
    ctx.strokeStyle = color;
    for (let i = 0; i < 6; i++) {
      const r = rKm - i * 1.6;
      if (r <= 0) break;
      ctx.globalAlpha = 0.9 * (1 - i / 6);
      ctx.lineWidth = i === 0 ? 3 : 2;
      ctx.beginPath(); ctx.arc(qx, qy, r * T.s, 0, 2 * Math.PI); ctx.stroke();
    }
    ctx.globalAlpha = 1;
    // label just outside the front, at the first angle that is on the map
    ctx.font = 'bold 13px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const half = ctx.measureText(label).width / 2;
    for (const deg of [-50, -130, 50, 130, -90, 90, 0, 180]) {
      const a = (deg * Math.PI) / 180;
      const off = 6 + Math.abs(Math.cos(a)) * half + Math.abs(Math.sin(a)) * 8;
      const lx = qx + Math.cos(a) * (rKm * T.s + off);
      const ly = qy + Math.sin(a) * (rKm * T.s + off);
      if (lx > T.x(0) + half + 4 && lx < T.x(WORLD.w) - half - 4 && ly > T.y(0) + 30 && ly < T.y(WORLD.h) - 12) {
        haloText(ctx, label, lx, ly, color, col.land);
        break;
      }
    }
  };
  if (t > 0) {
    ring(VS * t, col.s, 'S wave');
    ring(VP * t, col.p, 'P wave');
  }

  // quake (star), with a flash at the start
  if (t > 0 && t < 1.2) {
    ctx.fillStyle = 'rgba(245, 158, 11, 0.35)';
    ctx.beginPath(); ctx.arc(qx, qy, 10 + 30 * t, 0, 2 * Math.PI); ctx.fill();
  }
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const rad = i % 2 ? 5 : 12;
    ctx.lineTo(qx + Math.cos(a) * rad, qy + Math.sin(a) * rad);
  }
  ctx.closePath();
  ctx.fillStyle = '#f59e0b';
  ctx.fill();
  ctx.strokeStyle = '#111';
  ctx.lineWidth = 1.2;
  ctx.stroke();

  // stations: triangles that shake when the waves arrive
  for (const r of sim.rows) {
    const shake = reduceMotion ? 0 : (valueAt(r, t) / sim.peak) * 7;
    const sx = T.x(r.x) + shake;
    const sy = T.y(r.y);
    ctx.beginPath();
    ctx.moveTo(sx, sy - 10); ctx.lineTo(sx + 9, sy + 7); ctx.lineTo(sx - 9, sy + 7); ctx.closePath();
    ctx.fillStyle = r.color;
    ctx.fill();
    ctx.strokeStyle = '#111';
    ctx.lineWidth = 1.2;
    ctx.stroke();
    ctx.font = 'bold 14px system-ui, sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    haloText(ctx, r.name, T.x(r.x) + 12, sy, col.text, col.land);
  }
  ctx.restore();

  // clock and scale bar
  ctx.font = 'bold 14px system-ui, sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  haloText(ctx, `${t.toFixed(1)} s after the quake`, T.x(0) + 8, T.y(0) + 8, col.text, col.land);
  const bar = 50 * T.s;
  const bx = T.x(0) + 10;
  const by = T.y(WORLD.h) - 12;
  ctx.strokeStyle = col.text;
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(bx, by - 4); ctx.lineTo(bx, by); ctx.lineTo(bx + bar, by); ctx.lineTo(bx + bar, by - 4); ctx.stroke();
  ctx.font = '12px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'bottom';
  haloText(ctx, '50 km', bx + bar / 2, by - 3, col.text, col.land);
}

function drawTraces() {
  const { ctx, w, h } = fitCanvas(traceCanvas);
  const col = colors();
  const t = sim.t;
  const axisH = 20;
  const rows = sim.rows.length;
  const rowH = (h - axisH) / rows;
  const padL = 8;
  const padR = 8;
  const x = (sec) => padL + (sec / sim.duration) * (w - padL - padR);
  ctx.fillStyle = col.bg;
  ctx.fillRect(0, 0, w, h);

  // time grid and axis
  const step = sim.duration > 60 ? 10 : 5;
  ctx.font = '11px system-ui, sans-serif';
  ctx.textBaseline = 'top';
  const unit = w > 420 ? 'seconds after the quake' : 's';
  const unitLeft = w - padR - ctx.measureText(unit).width;
  for (let s = 0; s <= sim.duration; s += step) {
    const gx = Math.round(x(s)) + 0.5;
    ctx.strokeStyle = col.grid;
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(gx, 0); ctx.lineTo(gx, h - axisH); ctx.stroke();
    const label = String(s);
    const half = ctx.measureText(label).width / 2;
    if (gx - half < 0 || gx + half > unitLeft - 6) continue;
    ctx.fillStyle = col.muted;
    ctx.textAlign = 'center';
    ctx.fillText(label, gx, h - axisH + 4);
  }
  ctx.fillStyle = col.muted;
  ctx.textAlign = 'right';
  ctx.fillText(unit, w - padR, h - axisH + 4);

  // Each row: a label strip on top, then the seismogram.
  const labelH = 16;
  const traceH = rowH - labelH;
  const scale = (traceH / 2 - 3) / sim.peak;
  sim.rows.forEach((r, k) => {
    const top = k * rowH;
    const tTop = top + labelH;
    const y0 = tTop + traceH / 2;
    if (k > 0) {
      ctx.strokeStyle = col.border;
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(0, top + 0.5); ctx.lineTo(w, top + 0.5); ctx.stroke();
    }
    // the seismogram so far
    const n = Math.min(r.data.length, Math.floor(t * RATE) + 1);
    ctx.strokeStyle = col.trace;
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let i = 0; i < n; i++) {
      const px = x(i / RATE);
      const py = y0 - Math.max(-traceH / 2 + 1, Math.min(traceH / 2 - 1, r.data[i] * scale));
      if (i) ctx.lineTo(px, py); else ctx.moveTo(px, py);
    }
    ctx.stroke();

    // arrivals: a line through the seismogram, its letter in the label strip
    const mark = (sec, color, label) => {
      const mx = x(sec);
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(mx, tTop); ctx.lineTo(mx, top + rowH - 2); ctx.stroke();
      ctx.font = 'bold 12px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      haloText(ctx, label, mx, top + 2, color, col.bg);
    };
    if (t >= r.p) mark(r.p, col.p, 'P');
    if (t >= r.s) {
      mark(r.s, col.s, 'S');
      // S - P bracket in the label strip, with the distance it gives
      const xa = x(r.p) + 7;
      const xb = x(r.s) - 7;
      const yb = top + 9;
      ctx.strokeStyle = col.muted;
      ctx.lineWidth = 1.2;
      if (xb > xa) {
        ctx.beginPath(); ctx.moveTo(xa, yb); ctx.lineTo(xb, yb); ctx.stroke();
      }
      ctx.font = '600 12px system-ui, sans-serif';
      ctx.textAlign = 'left';
      haloText(ctx, `S − P = ${(r.s - r.p).toFixed(1)} s → ${((r.s - r.p) * r.k).toFixed(0)} km`,
        x(r.s) + 9, top + 2, col.text, col.bg);
    }

    // station name
    ctx.font = 'bold 13px system-ui, sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillStyle = r.color;
    ctx.fillRect(4, top + 3, 10, 10);
    haloText(ctx, r.name, 18, top + 1, col.text, col.bg);
  });

  // "now" cursor
  if (t > 0 && t < sim.duration) {
    const cx = x(t);
    ctx.strokeStyle = col.muted;
    ctx.lineWidth = 1;
    ctx.setLineDash([3, 3]);
    ctx.beginPath(); ctx.moveTo(cx, 0); ctx.lineTo(cx, h - axisH); ctx.stroke();
    ctx.setLineDash([]);
  }
}

function draw() {
  drawMap();
  drawTraces();
  $('scrub').value = String(sim.t);
  const text = logText(sim.t);
  if (text !== sim.lastLog) {
    $('log').textContent = text;
    sim.lastLog = text;
  }
}

// ---------------------------------------------------------------------------
// Playing

let lastFrame = 0;
function frame(now) {
  if (!sim.playing) return;
  const dt = lastFrame ? Math.min(0.1, (now - lastFrame) / 1000) : 0;
  lastFrame = now;
  sim.t = Math.min(sim.duration, sim.t + dt * sim.speed);
  draw();
  if (sim.t >= sim.duration) { setPlaying(false); return; }
  requestAnimationFrame(frame);
}

function setPlaying(on) {
  sim.playing = on;
  $('play').textContent = on ? '❚❚ Pause' : sim.t >= sim.duration ? '▶ Play again' : '▶ Play';
  if (on) {
    if (sim.t >= sim.duration) sim.t = 0;
    lastFrame = 0;
    requestAnimationFrame(frame);
  }
}

function init() {
  setupEmbed();
  setup();

  $('play').addEventListener('click', () => setPlaying(!sim.playing));
  $('restart').addEventListener('click', () => { sim.t = 0; draw(); setPlaying(true); });
  $('speed').addEventListener('change', (e) => { sim.speed = Number(e.target.value); });
  $('circles').addEventListener('change', (e) => { sim.circles = e.target.checked; sim.lastLog = ''; draw(); });
  $('scrub').addEventListener('input', (e) => {
    sim.t = Number(e.target.value);
    setPlaying(false);
    draw();
  });
  mapCanvas.addEventListener('click', (e) => {
    const rect = mapCanvas.getBoundingClientRect();
    const T = mapTransform(rect.width, rect.height);
    const kx = T.kmX(e.clientX - rect.left);
    const ky = T.kmY(e.clientY - rect.top);
    if (kx < 0 || kx > WORLD.w || ky < 0 || ky > WORLD.h) return;
    sim.quake = { x: kx, y: ky };
    setup();
    sim.t = 0;
    draw();
    setPlaying(true);
  });
  new ResizeObserver(() => draw()).observe(mapCanvas);
  new ResizeObserver(() => draw()).observe(traceCanvas);
  matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => draw());
  followDocsTheme(draw);
  draw();
}

init();
