// Record section on a <canvas>: one trace per station, each drawn at its
// distance from the quake. Time runs across (seconds after the origin time)
// and distance runs DOWN the page, nearest station at the top.
//
// Why it is useful: every station is a stopwatch at a known distance. A wave
// that travels at a steady speed reaches farther stations later, so its
// arrivals line up along a straight line, and the slope of that line is the
// wave's speed: km travelled ÷ seconds taken. The steeper the line, the faster
// the wave. Students drag two rulers (P and S) along the arrivals and read the
// speeds in km/s.
//
// What the page can switch (all optional):
//   amplitude  'trace': each trace stretched to fit (default), or 'true': one
//              scale in m/s for every trace, which shows how waves fade with
//              distance
//   gain       make every wiggle bigger or smaller
//   reduce     reduced time t − d/v: a wave of speed v runs straight down
//   overlays   picks (analyst ○, computer □, student ◇), model travel-time
//              curves (lib/traveltime.js curves()) and fitted lines
//   rulers     'P' and 'S', each a line with two draggable ends
//
// Speed of drawing: the traces, axes and labels are drawn into a hidden canvas
// that is redrawn only when they change (zoom, size, amplitude mode...).
// Dragging a ruler or moving the pointer just copies that picture and draws
// the rulers and marks on top, so it stays smooth with 35 traces.
import { minMaxColumns, peakAbs, niceStep } from '../lib/signal.js';
import { speedFromRuler } from '../lib/linefit.js';
import { formatVelocity } from '../lib/units.js';
import {
  reducedTime, trueTime, timeWindows, traceLayout, dataColumns, niceFloor, distToSegment,
  speedText, shiftRuler, tiltRuler, spreadLabels,
} from '../lib/record-section.js';

const AXIS_H = 22; // time axis under the plot (same as TraceView)
const ROW_H = 20; // one legend row above the plot
const GUTTER = 40; // room for the distance labels left of the plot
const PAD_R = 8; // right margin
const PAD_Y = 14; // keeps the nearest and farthest traces off the plot edges
const AMP = 0.7; // at gain 1, a full-size wiggle reaches 0.7 × the trace spacing
const LABEL_GAP = 12; // station labels at least this many px apart
const HANDLE_R = 6; // ruler end handles, px
const STEP_SEC = 0.1; // arrow-key nudge of a ruler (Shift: 10 times more)
const NARROW = 560; // below this canvas width, station labels are shortened
const FONT = '11px system-ui, sans-serif';
const BOLD = 'bold 11px system-ui, sans-serif';
const RULER_ORDER = ['P', 'S']; // Tab order

/** How each kind of pick is marked (shape) and named in the legend. */
const WHO = {
  analyst: { shape: 'circle', text: 'analyst' },
  computer: { shape: 'square', text: 'computer' },
  student: { shape: 'diamond', text: 'you' },
};

/**
 * One station's trace.
 * @typedef {Object} SectionTrace
 * @property {string} key        e.g. "UU.SUU" (picks and onSelect use it)
 * @property {string} label      shown at the left of the trace, e.g. "SUU (Juab)"
 * @property {string} [short]    shorter label for narrow screens (default: the label's first word)
 * @property {number} distKm     distance from the quake's epicentre, km
 * @property {string} [role]     'school' (a school stand-in, drawn in an accent colour) or 'section'
 * @property {Float32Array} data filtered record (any units: it is stretched to fit)
 * @property {number} sampleRate samples per second
 * @property {number} startMs    time of data[0], ms since 1970 (UTC)
 * @property {Float32Array|null} [velocity] the same record in m/s (lib/units.js toVelocity),
 *   or null when it can't be converted
 * @property {boolean} [clipped] the sensor maxed out, so its true size is unknown
 */

/** A ruler end, or any point on the section: distance (km) and seconds after origin. */
/** @typedef {{distKm:number, tSec:number}} SectionPoint */

const clamp = (x, lo, hi) => Math.max(lo, Math.min(hi, x));
const fmtV = (v) => (Number.isInteger(v) ? String(v) : v.toFixed(1));
const fmtGain = (g) => String(+g.toPrecision(2));

/** True if the array has at least one real (not NaN) sample. */
function hasData(arr) {
  if (!arr) return false;
  for (let i = 0; i < arr.length; i++) if (!Number.isNaN(arr[i])) return true;
  return false;
}

/** A pick or legend mark: circle, square or diamond centred on (x, y). */
function markPath(ctx, shape, x, y, r) {
  ctx.beginPath();
  if (shape === 'circle') ctx.arc(x, y, r, 0, 2 * Math.PI);
  else if (shape === 'square') ctx.rect(x - r * 0.85, y - r * 0.85, r * 1.7, r * 1.7);
  else {
    ctx.moveTo(x, y - r * 1.3);
    ctx.lineTo(x + r, y);
    ctx.lineTo(x, y + r * 1.3);
    ctx.lineTo(x - r, y);
    ctx.closePath();
  }
}

export class RecordSectionView {
  /**
   * @param {HTMLCanvasElement} canvas give it a CSS width and height, and
   *   `touch-action: none` (the "trace-canvas" class in app.css does) so dragging
   *   a ruler on a touch screen doesn't scroll the page
   * @param {object} [opts]
   * @param {(key:string)=>void} [opts.onSelect] a trace was clicked, or chosen with the ↑/↓ keys
   * @param {(id:string, r:{a:SectionPoint, b:SectionPoint, speedKms:number, final:boolean})=>void} [opts.onRuler]
   *   a ruler moved: called while it is dragged (final false) and when it is let go (final true)
   * @param {(view:{from:number, to:number})=>void} [opts.onView] the time window changed (zoom or pan)
   * @param {'trace'|'true'} [opts.amplitude='trace']
   * @param {number} [opts.gain=1]
   * @param {number} [opts.reduce=0] reduction speed in km/s; 0 = plain time
   */
  constructor(canvas, opts = {}) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.onSelect = opts.onSelect || (() => {});
    this.onRuler = opts.onRuler || (() => {});
    this.onView = opts.onView || (() => {});
    this.amplitude = opts.amplitude === 'true' ? 'true' : 'trace';
    this.gain = opts.gain > 0 ? opts.gain : 1;
    this.reduce = opts.reduce > 0 ? opts.reduce : 0;

    this.refMs = 0;
    /** @type {SectionTrace[]} nearest first */
    this.traces = [];
    this.range = { tMin: 0, tMax: 1, dMin: 0, dMax: 1 };
    this.view = { from: 0, to: 1 }; // seconds (reduced seconds when reduce > 0)
    this.home = { from: 0, to: 1 }; // the start view (double-click or 0 goes back here)
    this.limit = { from: 0, to: 1 }; // farthest zoom-out
    this._homeOverride = null; // start view chosen by the page for reduced time
    this.picks = [];
    this.model = null;
    this.modelPhases = ['Pg', 'Pn', 'Sg'];
    this.fits = [];
    /** @type {Map<string, {a:SectionPoint, b:SectionPoint}>} */
    this.rulers = new Map();
    this.selected = null;
    this.focusRuler = null; // ruler chosen with Tab (arrow keys move it)
    this.hover = null; // {key, x} trace under the pointer
    this._drag = null;
    this._noData = new Set();
    this._dataVer = 0;
    this._themeVer = 0;
    this._layer = null; // {canvas, key}: the traces, axes and labels
    this._prep = []; // per trace: screen columns and scale (see _prepTraces)
    this._pxPerMps = NaN; // 'true' mode: px per (m/s)
    this._L = null;
    this._G = null;
    this._frame = 0;

    canvas.tabIndex = 0;
    canvas.setAttribute('aria-roledescription', 'record section');
    this._readTheme();
    this._updateAria();

    // Theme changes: the device setting, or data-theme on <html> (docs embed).
    this._onTheme = () => { this._readTheme(); this.draw(); };
    this._mq = matchMedia('(prefers-color-scheme: dark)');
    this._mq.addEventListener('change', this._onTheme);
    this._mo = new MutationObserver(this._onTheme);
    this._mo.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    this._ro = new ResizeObserver(() => this.resize());
    this._ro.observe(canvas);
    this.resize();
    this._wire();
  }

  // --- what to show --------------------------------------------------------

  /**
   * @param {object} d
   * @param {number} d.refMs time shown as 0 s (the quake's origin time), ms since 1970
   * @param {SectionTrace[]} d.traces any order (sorted here, nearest first)
   * @param {number} d.tMin first second to show, after refMs (e.g. -10)
   * @param {number} d.tMax last second to show
   * @param {number} [d.dMin=0] distance at the top, km
   * @param {number} [d.dMax] distance at the bottom, km (default: the farthest trace,
   *   rounded up to a multiple of 25 km)
   * @param {{keepView?:boolean}} [o] keepView: keep the current zoom
   */
  setData({ refMs, traces, tMin, tMax, dMin = 0, dMax }, { keepView = false } = {}) {
    this.refMs = refMs;
    this.traces = [...(traces || [])].sort((a, b) => a.distKm - b.distKm);
    const far = this.traces.length ? this.traces[this.traces.length - 1].distKm : 100;
    this.range = { tMin, tMax, dMin, dMax: dMax ?? Math.max(dMin + 25, Math.ceil(far / 25) * 25) };
    this._noData = new Set(this.traces.filter((t) => !hasData(t.data)).map((t) => t.key));
    if (this.selected && !this.traces.some((t) => t.key === this.selected)) this.selected = null;
    this._dataVer++;
    this._setWindows(keepView);
    this._updateAria();
    this.draw();
  }

  /** 'trace': each trace stretched to fit; 'true': one scale in m/s for all. */
  setAmplitude(mode) {
    this.amplitude = mode === 'true' ? 'true' : 'trace';
    this._updateAria();
    this.draw();
  }

  /** Make every wiggle x times bigger (1 = normal). */
  setGain(x) {
    if (x > 0 && Number.isFinite(x)) this.gain = clamp(x, 0.05, 100);
    this.draw();
  }

  /**
   * Reduced time: plot t − d/v, so a wave of speed v runs straight down the page.
   * 0 goes back to plain time. The zoom goes back to the start view.
   * @param {number} vKmS
   * @param {{from:number, to:number}} [win] start view in reduced seconds
   *   (default: where every trace has data)
   */
  setReduce(vKmS, win) {
    this.reduce = vKmS > 0 ? vKmS : 0;
    this._homeOverride = win || null;
    this._setWindows(false);
    this._updateAria();
    this.draw();
  }

  /**
   * Arrival picks to mark on the traces.
   * @param {Array<{key:string, phase:'P'|'S', tSec:number, who:'analyst'|'computer'|'student'}>|null} picks
   *   tSec = seconds after the origin time (never reduced)
   */
  setPicks(picks) { this.picks = picks || []; this.draw(); }

  /**
   * Model travel-time curves, drawn dashed and labelled.
   * @param {ReturnType<import('../lib/traveltime.js').curves>|null} curves
   * @param {{phases?:string[]}} [o] which curves to draw (default Pg, Pn, Sg)
   */
  setModel(curves, { phases } = {}) {
    this.model = curves || null;
    if (phases) this.modelPhases = phases;
    this.draw();
  }

  /**
   * Straight lines t = interceptSec + d / speedKms from d0 to d1 km, e.g. a
   * least-squares fit (lib/linefit.js). color: any CSS colour or '--var-name'.
   * @param {Array<{label:string, speedKms:number, interceptSec:number, d0:number, d1:number, color?:string}>|null} lines
   */
  setFits(lines) { this.fits = lines || []; this.draw(); }

  /** Highlight one trace (by key); null for none. Does not call onSelect. */
  setSelected(key) {
    this.selected = key ?? null;
    this._updateAria();
    this.draw();
  }

  // --- rulers ----------------------------------------------------------------

  /**
   * Put ruler id ('P' or 'S') from a to b (true time, never reduced). Does not
   * call onRuler.
   * @param {string} id
   * @param {SectionPoint} a
   * @param {SectionPoint} b
   */
  setRuler(id, a, b) {
    this.rulers.set(id, { a: { distKm: a.distKm, tSec: a.tSec }, b: { distKm: b.distKm, tSec: b.tSec } });
    this._updateAria();
    this.draw();
  }

  /** Remove a ruler. */
  clearRuler(id) {
    this.rulers.delete(id);
    if (this.focusRuler === id) this.focusRuler = null;
    this._updateAria();
    this.draw();
  }

  /** @returns {{a:SectionPoint, b:SectionPoint, speedKms:number}|null} */
  getRuler(id) {
    const r = this.rulers.get(id);
    return r ? { a: { ...r.a }, b: { ...r.b }, speedKms: speedFromRuler(r.a, r.b) } : null;
  }

  /**
   * A starting ruler in the current view, for a "ruler" button: straight down
   * the page (P a third of the way across, S two thirds). In plain time that
   * means every station at the same moment, "∞ km/s", the guess many students
   * start from; they then tilt it onto the arrivals. Does not call onRuler.
   * @returns {{a:SectionPoint, b:SectionPoint, speedKms:number}}
   */
  placeRuler(id) {
    const { dMin, dMax } = this.range;
    const tau = this.view.from + (id === 'S' ? 0.62 : 0.32) * (this.view.to - this.view.from);
    const dA = dMin + 0.12 * (dMax - dMin);
    const dB = dMin + 0.88 * (dMax - dMin);
    this.setRuler(id, { distKm: dA, tSec: trueTime(tau, dA, this.reduce) },
      { distKm: dB, tSec: trueTime(tau, dB, this.reduce) });
    return this.getRuler(id);
  }

  // --- zoom and pan (time only; the distance axis is fixed) -----------------

  resetZoom() { this._setView(this.home.from, this.home.to, true); }

  /** Zoom by factor (< 1 zooms in) about centerSec (default: the middle). */
  zoom(factor, centerSec) {
    const { from, to } = this.view;
    const c = centerSec ?? (from + to) / 2;
    const span = clamp((to - from) * factor, 0.5, this.limit.to - this.limit.from);
    const f = (c - from) / (to - from);
    this._setView(c - f * span, c - f * span + span);
  }

  pan(dSec) { this._setView(this.view.from + dSec, this.view.to + dSec); }

  /** Show fromSec..toSec (reduced seconds when reduce > 0). */
  setView(fromSec, toSec) { this._setView(fromSec, toSec); }

  /** Stop watching size and theme (when the view is thrown away). */
  destroy() {
    this._ro.disconnect();
    this._mo.disconnect();
    this._mq.removeEventListener('change', this._onTheme);
    cancelAnimationFrame(this._frame);
  }

  resize() {
    const dpr = window.devicePixelRatio || 1;
    const w = Math.max(80, this.canvas.clientWidth);
    const h = Math.max(80, this.canvas.clientHeight);
    if (this.canvas.width !== Math.round(w * dpr) || this.canvas.height !== Math.round(h * dpr)) {
      this.canvas.width = Math.round(w * dpr);
      this.canvas.height = Math.round(h * dpr);
    }
    this.draw();
  }

  _setWindows(keepView) {
    const n = this.traces.length;
    const dNear = n ? this.traces[0].distKm : this.range.dMin;
    const dFar = n ? this.traces[n - 1].distKm : this.range.dMax;
    const w = timeWindows(this.range.tMin, this.range.tMax, dNear, dFar, this.reduce);
    this.limit = w.limit;
    this.home = this._homeOverride && this.reduce ? { ...this._homeOverride } : w.home;
    if (keepView) this._setView(this.view.from, this.view.to, true);
    else this._setView(this.home.from, this.home.to, true);
  }

  _setView(from, to, force = false) {
    const span = to - from;
    const lim = this.limit;
    if (from < lim.from) { from = lim.from; to = from + span; }
    if (to > lim.to) { to = lim.to; from = to - span; }
    from = Math.max(from, lim.from);
    to = Math.min(to, lim.to);
    if (!force && from === this.view.from && to === this.view.to) return;
    this.view = { from, to };
    this.onView({ ...this.view });
    this.draw();
  }

  // --- theme -----------------------------------------------------------------

  /** Read the colours from app.css once per theme change (not on every frame). */
  _readTheme() {
    const s = getComputedStyle(this.canvas);
    const v = (name, fallback) => s.getPropertyValue(name).trim() || fallback;
    this._col = {
      bg: v('--trace-bg', '#fff'),
      trace: v('--trace', '#1f2937'),
      grid: v('--grid', '#e8ebef'),
      text: v('--muted', '#5b6472'),
      ink: v('--text', '#111827'),
      border: v('--border', '#d9dde3'),
      p: v('--pick-p', '#1d4ed8'),
      s: v('--pick-s', '#c0262d'),
      selected: v('--selected', '#eef2ff'),
      // School stand-ins: amber, like the school markers on the map.
      school: v('--school', v('--warn', '#b45309')),
      accent: v('--accent', '#1d4ed8'),
    };
    this._vars = new Map();
    this._themeVer++;
  }

  /** A colour given as '--name' or 'var(--name)' read from the CSS; anything else as is. */
  _colour(c, fallback) {
    if (!c) return fallback;
    const m = /^(?:var\(\s*)?(--[\w-]+)\s*\)?$/.exec(c);
    if (!m) return c;
    if (!this._vars.has(m[1])) {
      this._vars.set(m[1], getComputedStyle(this.canvas).getPropertyValue(m[1]).trim() || fallback);
    }
    return this._vars.get(m[1]);
  }

  _rulerColour(id) { return id === 'P' ? this._col.p : id === 'S' ? this._col.s : this._col.accent; }

  // --- coordinates -------------------------------------------------------------
  // Screen x is (reduced) time; screen y is distance. Rulers, picks and lines are
  // stored in true time and turned into reduced time only when drawn.

  /** Plot rectangle and legend layout for the current canvas size. */
  _layout() {
    const w = Math.max(80, this.canvas.clientWidth);
    const h = Math.max(80, this.canvas.clientHeight);
    const legend = this._legendSpec(w);
    const y0 = ROW_H * legend.rows;
    const x0 = GUTTER;
    const x1 = Math.max(x0 + 20, w - PAD_R);
    const y1 = Math.max(y0 + 20, h - AXIS_H);
    return { w, h, x0, x1, y0, y1, pw: x1 - x0, ph: y1 - y0, legend };
  }

  _xOf(tau, L) { return L.x0 + ((tau - this.view.from) / (this.view.to - this.view.from)) * L.pw; }
  _tauOf(x, L) { return this.view.from + ((x - L.x0) / L.pw) * (this.view.to - this.view.from); }
  _yOf(d, L) {
    const { dMin, dMax } = this.range;
    return L.y0 + PAD_Y + ((d - dMin) / (dMax - dMin || 1)) * (L.ph - 2 * PAD_Y);
  }
  _dOf(y, L) {
    const { dMin, dMax } = this.range;
    return dMin + ((y - L.y0 - PAD_Y) / (L.ph - 2 * PAD_Y)) * (dMax - dMin || 1);
  }
  /** A point in true time -> screen. */
  _toScreen(pt, L) {
    return { x: this._xOf(reducedTime(pt.tSec, pt.distKm, this.reduce), L), y: this._yOf(pt.distKm, L) };
  }
  /** Screen -> a point in true time. */
  _toPoint(x, y, L) {
    const d = this._dOf(y, L);
    return { distKm: d, tSec: trueTime(this._tauOf(x, L), d, this.reduce) };
  }

  /** Each trace's middle line and room (see traceLayout), plus key -> index. */
  _geom(L) {
    const g = traceLayout(this.traces.map((t) => t.distKm), {
      dMin: this.range.dMin, dMax: this.range.dMax, top: L.y0 + PAD_Y, height: L.ph - 2 * PAD_Y,
    });
    g.byKey = new Map(this.traces.map((t, k) => [t.key, k]));
    return g;
  }

  // --- drawing -------------------------------------------------------------------

  /** Ask for a redraw; several requests in one frame draw once. */
  draw() {
    if (this._frame) return;
    this._frame = requestAnimationFrame(() => { this._frame = 0; this._draw(); });
  }

  _draw() {
    const { ctx } = this;
    if (!this.canvas.width || !this.canvas.height) return;
    const dpr = window.devicePixelRatio || 1;
    const L = this._layout();
    const G = this._geom(L);
    this._L = L;
    this._G = G;
    const layer = this._buildLayer(L, G, dpr);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    ctx.drawImage(layer, 0, 0);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.font = FONT;
    ctx.save();
    ctx.beginPath();
    ctx.rect(L.x0, L.y0, L.pw, L.ph);
    ctx.clip();
    this._drawHover(L, G);
    this._drawModel(L);
    this._drawFits(L);
    this._drawPicks(L, G);
    this._drawRulers(L);
    ctx.restore();
    this._drawRulerLabels(L);
    this._drawReadout(L, G);
  }

  /**
   * The picture that only changes with the data, zoom, size or mode: axes,
   * traces, station labels and the legend row. Kept in a hidden canvas.
   */
  _buildLayer(L, G, dpr) {
    const key = [L.w, L.h, dpr, L.legend.sig, this.view.from, this.view.to, this.amplitude, this.gain,
      this.reduce, this.selected, this._dataVer, this._themeVer, this.range.dMin, this.range.dMax].join('|');
    if (this._layer?.key === key) return this._layer.canvas;
    const cv = this._layer?.canvas ?? document.createElement('canvas');
    const W = Math.round(L.w * dpr);
    const H = Math.round(L.h * dpr);
    if (cv.width !== W) cv.width = W;
    if (cv.height !== H) cv.height = H;
    const g = cv.getContext('2d');
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.fillStyle = this._col.bg;
    g.fillRect(0, 0, L.w, L.h);
    g.font = FONT;
    this._drawTimeAxis(g, L);
    this._drawDistanceAxis(g, L);
    this._prep = this._prepTraces(L, G);
    this._drawTraces(g, L, G);
    this._drawStationLabels(g, L, G);
    this._drawLegend(g, L);
    this._layer = { canvas: cv, key };
    return cv;
  }

  /** Time ticks and grid, as in TraceView. */
  _drawTimeAxis(g, L) {
    const col = this._col;
    const span = this.view.to - this.view.from;
    const step = niceStep(span, Math.max(3, Math.floor(L.pw / 90)));
    const v = this.reduce;
    const unit = !v ? (L.w > 480 ? 's after origin' : 's')
      : (L.w > 480 ? `reduced time t − d/${fmtV(v)} (s)` : `t − d/${fmtV(v)} (s)`);
    g.textBaseline = 'top';
    const unitLeft = L.x1 - g.measureText(unit).width;
    for (let t = Math.ceil(this.view.from / step) * step; t <= this.view.to + 1e-9; t += step) {
      const x = Math.round(this._xOf(t, L)) + 0.5;
      g.strokeStyle = col.grid;
      g.lineWidth = 1;
      g.beginPath(); g.moveTo(x, L.y0); g.lineTo(x, L.y1); g.stroke();
      g.strokeStyle = col.text;
      g.beginPath(); g.moveTo(x, L.y1); g.lineTo(x, L.y1 + 4); g.stroke();
      const label = step < 1 ? t.toFixed(step < 0.1 ? 2 : 1) : String(Math.round(t));
      const half = g.measureText(label).width / 2;
      if (x - half < L.x0 - 12 || x + half > unitLeft - 6) continue; // keep labels apart
      g.fillStyle = col.text;
      g.textAlign = 'center';
      g.fillText(label, x, L.y1 + 6);
    }
    g.fillStyle = col.text;
    g.textAlign = 'right';
    g.fillText(unit, L.x1, L.y1 + 6);
    g.strokeStyle = col.border;
    g.beginPath(); g.moveTo(L.x0, L.y1 + 0.5); g.lineTo(L.x1, L.y1 + 0.5); g.stroke();
  }

  /** Distance ticks (km) in the gutter left of the plot. */
  _drawDistanceAxis(g, L) {
    const col = this._col;
    const { dMin, dMax } = this.range;
    const step = niceStep(dMax - dMin || 1, Math.max(2, Math.floor((L.ph - 2 * PAD_Y) / 55)));
    g.textAlign = 'right';
    g.textBaseline = 'middle';
    g.lineWidth = 1;
    for (let d = Math.ceil(dMin / step) * step; d <= dMax + 1e-9; d += step) {
      const y = Math.round(this._yOf(d, L)) + 0.5;
      g.strokeStyle = col.grid;
      g.beginPath(); g.moveTo(L.x0, y); g.lineTo(L.x1, y); g.stroke();
      g.strokeStyle = col.text;
      g.beginPath(); g.moveTo(L.x0 - 4, y); g.lineTo(L.x0, y); g.stroke();
      g.fillStyle = col.text;
      g.fillText(String(+d.toPrecision(6)), L.x0 - 6, y);
    }
    g.strokeStyle = col.border;
    g.beginPath(); g.moveTo(L.x0 - 0.5, L.y0); g.lineTo(L.x0 - 0.5, L.y1); g.stroke();
    g.fillStyle = col.text;
    g.fillText('km', L.x0 - 6, L.y0 - ROW_H / 2);
  }

  /**
   * Screen columns of one trace: min and max per pixel column when there are
   * more samples than pixels (so no peak is lost), else the samples themselves.
   * Also the biggest |value| in view (the trace's "peak").
   */
  _columns(tr, data, nCols, L) {
    const sr = tr.sampleRate;
    const shift = this.reduce > 0 ? tr.distKm / this.reduce : 0; // reduced time moves each trace left
    const idx = (tau) => ((this.refMs - tr.startMs) / 1000 + tau + shift) * sr;
    const i0 = idx(this.view.from);
    const perCol = (idx(this.view.to) - i0) / nCols;
    if (perCol > 2) {
      const { c0, c1, from, to } = dataColumns(i0, perCol, nCols, data.length);
      const { min, max } = minMaxColumns(data, from, to, c1 - c0);
      let peak = 0;
      for (let c = 0; c < c1 - c0; c++) {
        const a = Math.max(-min[c], max[c]); // NaN (no data) never wins
        if (a > peak) peak = a;
      }
      return { kind: 'cols', c0, min, max, colW: L.pw / nCols, peak, shift };
    }
    const a = Math.max(0, Math.floor(i0));
    const b = Math.min(data.length, Math.ceil(i0 + perCol * nCols) + 1);
    return { kind: 'samples', a, b, peak: peakAbs(data, a, b), shift };
  }

  /** Columns and scale (px per unit) of every trace for the current view and mode. */
  _prepTraces(L, G) {
    const trueAmp = this.amplitude === 'true';
    const nCols = Math.max(1, Math.floor(L.pw));
    const prep = this.traces.map((tr) => {
      const vel = trueAmp && tr.velocity ? tr.velocity : null;
      const data = vel || tr.data;
      return {
        tr, data, ...this._columns(tr, data, nCols, L),
        common: !!vel, // drawn on the shared m/s scale
        grey: trueAmp && (!vel || !!tr.clipped), // true size unknown
      };
    });
    // 'true': the biggest unclipped trace in view fills its share of the page.
    const ampPx = AMP * G.gap * this.gain;
    let ref = 0;
    if (trueAmp) for (const p of prep) if (p.common && !p.tr.clipped && p.peak > ref) ref = p.peak;
    this._pxPerMps = ref > 0 ? ampPx / ref : NaN;
    for (const p of prep) {
      if (p.common) p.scale = ref > 0 ? ampPx / ref : 0;
      else p.scale = ((p.grey ? 0.5 : 1) * ampPx) / (p.peak || 1); // stretched to fit
    }
    return prep;
  }

  /**
   * One trace as a line, kept inside its room (see traceLayout) so it can't
   * paint over its neighbours' wiggles; anything bigger is cut off.
   */
  _strokeTrace(g, L, p, y, room, colour, width, dash) {
    g.save();
    const top = Math.max(L.y0, y - room.up);
    const bot = Math.min(L.y1, y + room.down);
    g.beginPath();
    g.rect(L.x0, top, L.pw, Math.max(0, bot - top));
    g.clip();
    g.strokeStyle = colour;
    g.lineWidth = width;
    g.lineJoin = 'round';
    if (dash) g.setLineDash(dash);
    g.beginPath();
    const s = p.scale;
    let pen = false;
    if (p.kind === 'cols') {
      for (let c = 0; c < p.min.length; c++) {
        const lo = p.min[c];
        if (Number.isNaN(lo)) { pen = false; continue; }
        const x = L.x0 + (p.c0 + c + 0.5) * p.colW;
        const yA = y - p.max[c] * s;
        if (!pen) { g.moveTo(x, yA); pen = true; } else g.lineTo(x, yA);
        g.lineTo(x, y - lo * s);
      }
    } else {
      const { tr, data } = p;
      const tau0 = (tr.startMs - this.refMs) / 1000 - p.shift; // (reduced) time of sample 0
      for (let i = p.a; i < p.b; i++) {
        const v = data[i];
        if (Number.isNaN(v)) { pen = false; continue; }
        const x = this._xOf(tau0 + i / tr.sampleRate, L);
        if (!pen) { g.moveTo(x, y - v * s); pen = true; } else g.lineTo(x, y - v * s);
      }
    }
    g.stroke();
    g.restore();
  }

  /** Colour, width and dash of trace k. */
  _traceStyle(p) {
    const col = this._col;
    const sel = p.tr.key === this.selected;
    if (p.grey) return { colour: col.text, width: sel ? 1.4 : 1, dash: [3, 2] };
    return {
      colour: p.tr.role === 'school' ? col.school : col.trace,
      width: sel ? 1.6 : p.tr.role === 'school' ? 1.25 : 1,
      dash: null,
    };
  }

  _drawTraces(g, L, G) {
    const prep = this._prep;
    const sel = G.byKey.get(this.selected);
    if (sel !== undefined) { // a tinted band behind the selected trace
      g.fillStyle = this._col.selected;
      g.fillRect(L.x0, G.ys[sel] - G.gap / 2, L.pw, G.gap);
    }
    // Ordinary traces first, then schools, then the selected one on top.
    const rank = (k) => (k === sel ? 2 : prep[k].tr.role === 'school' ? 1 : 0);
    const order = prep.map((_, k) => k).sort((a, b) => rank(a) - rank(b));
    for (const k of order) {
      const st = this._traceStyle(prep[k]);
      this._strokeTrace(g, L, prep[k], G.ys[k], G.room[k], st.colour, st.width, st.dash);
    }
    if (!prep.length) {
      g.fillStyle = this._col.text;
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.fillText('No data', L.x0 + L.pw / 2, L.y0 + L.ph / 2);
    }
  }

  /** Why a trace is special: no data, can't be shown in m/s, or clipped. */
  _tag(p) {
    if (this._noData.has(p.tr.key)) return 'no data';
    if (this.amplitude === 'true' && !p.tr.velocity) return 'no m/s';
    if (p.tr.clipped) return 'clipped';
    return '';
  }

  /** Station names at the left end of the traces, skipping any that would overlap. */
  _drawStationLabels(g, L, G) {
    const col = this._col;
    const prep = this._prep;
    const show = spreadLabels(prep.map((p, k) => ({
      y: G.ys[k],
      priority: p.tr.key === this.selected ? 3 : p.tr.role === 'school' ? 2 : 1,
    })), LABEL_GAP);
    g.textBaseline = 'middle';
    g.textAlign = 'left';
    const narrow = L.w < NARROW;
    prep.forEach((p, k) => {
      if (!show[k] || !p.tr.label) return;
      const y = G.ys[k];
      if (y < L.y0 || y > L.y1) return;
      const strong = p.tr.role === 'school' || p.tr.key === this.selected;
      const tag = this._tag(p);
      const label = narrow ? (p.tr.short ?? p.tr.label.split(' ')[0]) : p.tr.label;
      g.font = strong ? BOLD : FONT;
      const w1 = g.measureText(label).width;
      g.font = 'italic 10px system-ui, sans-serif';
      const w2 = tag ? g.measureText(tag).width + 5 : 0;
      g.save();
      g.globalAlpha = 0.82;
      g.fillStyle = col.bg;
      g.fillRect(L.x0 + 1, y - 6.5, w1 + w2 + 6, 13);
      g.restore();
      g.font = strong ? BOLD : FONT;
      g.fillStyle = p.tr.role === 'school' && !p.grey ? col.school : strong ? col.ink : col.text;
      g.fillText(label, L.x0 + 4, y);
      if (tag) {
        g.font = 'italic 10px system-ui, sans-serif';
        g.fillStyle = col.text;
        g.fillText(tag, L.x0 + 4 + w1 + 5, y);
      }
    });
    g.font = FONT;
  }

  /** What goes in the legend row(s): amplitude mode on the left, the marks on the right. */
  _legendSpec(w) {
    const ctx = this.ctx;
    ctx.font = FONT;
    const wide = w >= 640;
    const trueAmp = this.amplitude === 'true';
    const info = trueAmp ? (wide ? 'True ground speed, one scale for all:' : 'True speed:')
      : (wide ? 'Each trace stretched to fit' : 'Stretched to fit');
    const gainText = this.gain !== 1 ? `· gain ×${fmtGain(this.gain)}` : '';
    const keys = new Set(this.traces.map((t) => t.key));
    const who = new Set(this.picks.filter((p) => keys.has(p.key)).map((p) => p.who));
    const items = [];
    if (who.size || this.model) items.push({ phase: 'P' }, { phase: 'S' });
    for (const k of Object.keys(WHO)) if (who.has(k)) items.push({ who: k, text: WHO[k].text });
    if (this.model) items.push({ model: true, text: 'model' });
    let legendW = 0;
    for (const it of items) {
      if (it.phase) { ctx.font = BOLD; it.w = ctx.measureText(it.phase).width + 6; ctx.font = FONT; }
      else it.w = 16 + ctx.measureText(it.text).width + 10;
      legendW += it.w;
    }
    const infoW = ctx.measureText(info).width + (trueAmp ? 70 : 0)
      + (gainText ? ctx.measureText(gainText).width + 6 : 0);
    const rows = items.length && GUTTER + infoW + 24 + legendW > w - PAD_R ? 2 : 1;
    const sig = [rows, info, gainText, items.map((i) => i.phase || i.who || 'model').join(',')].join('/');
    return { info, gainText, items, legendW, rows, sig };
  }

  _drawLegend(g, L) {
    const col = this._col;
    const leg = L.legend;
    const yInfo = ROW_H / 2;
    const yLeg = leg.rows === 2 ? ROW_H * 1.5 : yInfo;
    g.textBaseline = 'middle';
    g.textAlign = 'left';
    g.fillStyle = col.text;
    let x = L.x0;
    g.fillText(leg.info, x, yInfo);
    x += g.measureText(leg.info).width + 6;
    if (this.amplitude === 'true') {
      // Scale bar: a vertical bar (at most 14 px) and the ground speed it stands for.
      const v = niceFloor(14 / this._pxPerMps);
      if (Number.isFinite(v)) {
        const bar = v * this._pxPerMps;
        const bx = Math.round(x + 3) + 0.5;
        g.strokeStyle = col.ink;
        g.lineWidth = 1.5;
        g.beginPath();
        g.moveTo(bx - 3, yInfo - bar / 2); g.lineTo(bx + 3, yInfo - bar / 2);
        g.moveTo(bx, yInfo - bar / 2); g.lineTo(bx, yInfo + bar / 2);
        g.moveTo(bx - 3, yInfo + bar / 2); g.lineTo(bx + 3, yInfo + bar / 2);
        g.stroke();
        g.fillStyle = col.ink;
        const txt = `= ${formatVelocity(v, 1)}`;
        g.fillText(txt, x + 11, yInfo);
        x += 11 + g.measureText(txt).width + 6;
      } else {
        g.fillText('(no trace in m/s)', x, yInfo);
        x += g.measureText('(no trace in m/s)').width + 6;
      }
    }
    if (leg.gainText) { g.fillStyle = col.text; g.fillText(leg.gainText, x, yInfo); }

    let lx = L.x1 - leg.legendW;
    for (const it of leg.items) {
      if (it.phase) {
        g.font = BOLD;
        g.fillStyle = it.phase === 'P' ? col.p : col.s;
        g.fillText(it.phase, lx, yLeg);
        g.font = FONT;
      } else if (it.who) {
        g.lineWidth = 1.5;
        markPath(g, WHO[it.who].shape, lx + 6, yLeg, 4);
        if (it.who === 'student') { g.fillStyle = col.ink; g.fill(); } else {
          g.fillStyle = col.bg; g.fill(); g.strokeStyle = col.ink; g.stroke();
        }
        g.fillStyle = col.text;
        g.fillText(it.text, lx + 16, yLeg);
      } else {
        g.save();
        g.strokeStyle = col.ink;
        g.lineWidth = 1.5;
        g.setLineDash([4, 3]);
        g.beginPath(); g.moveTo(lx, yLeg); g.lineTo(lx + 13, yLeg); g.stroke();
        g.restore();
        g.fillStyle = col.text;
        g.fillText(it.text, lx + 16, yLeg);
      }
      lx += it.w;
    }
  }

  /**
   * Text on a small backing box so it reads over the traces. With bounds (a
   * layout), the box is kept inside the plot.
   */
  _labelBox(text, x, y, { colour, align = 'left', bold = false, border = null, size = 11, bounds = null } = {}) {
    const { ctx } = this;
    ctx.font = `${bold ? 'bold ' : ''}${size}px system-ui, sans-serif`;
    const tw = ctx.measureText(text).width;
    let left = align === 'left' ? x : align === 'right' ? x - tw : x - tw / 2;
    if (bounds) left = Math.max(bounds.x0 + 4, Math.min(bounds.x1 - tw - 4, left));
    const h = size + 5;
    ctx.save();
    ctx.globalAlpha = 0.9;
    ctx.fillStyle = this._col.bg;
    ctx.fillRect(left - 3, y - h / 2, tw + 6, h);
    ctx.restore();
    if (border) {
      ctx.strokeStyle = border;
      ctx.lineWidth = 1;
      ctx.strokeRect(Math.round(left - 3) + 0.5, Math.round(y - h / 2) + 0.5, Math.round(tw + 6), Math.round(h));
    }
    ctx.fillStyle = colour ?? this._col.ink;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, left, y);
    ctx.font = FONT;
    return { left: left - 3, right: left + tw + 3, top: y - h / 2, bottom: y + h / 2 };
  }

  _inPlot(s, L) { return s.x >= L.x0 && s.x <= L.x1 && s.y >= L.y0 && s.y <= L.y1; }

  /** Model travel-time curves (dashed), each labelled where it leaves the plot. */
  _drawModel(L) {
    const m = this.model;
    if (!m?.distKm) return;
    const { ctx } = this;
    const labels = [];
    for (const ph of this.modelPhases) {
      const ts = m[ph];
      if (!ts) continue;
      const colour = ph[0] === 'S' ? this._col.s : this._col.p;
      ctx.save();
      ctx.strokeStyle = colour;
      ctx.globalAlpha = 0.85;
      ctx.lineWidth = 1.5;
      ctx.setLineDash([6, 4]);
      ctx.beginPath();
      let pen = false;
      let last = null;
      for (let i = 0; i < m.distKm.length; i++) {
        const t = ts[i];
        if (!Number.isFinite(t)) { pen = false; continue; }
        const s = this._toScreen({ distKm: m.distKm[i], tSec: t }, L);
        if (!pen) { ctx.moveTo(s.x, s.y); pen = true; } else ctx.lineTo(s.x, s.y);
        if (this._inPlot(s, L)) last = s;
      }
      ctx.stroke();
      ctx.restore();
      if (last) labels.push({ ph, colour, ...last });
    }
    for (const lb of labels) {
      const right = lb.x > L.x1 - 40;
      this._labelBox(lb.ph, lb.x + (right ? -6 : 6), Math.max(L.y0 + 9, Math.min(L.y1 - 9, lb.y - 9)),
        { colour: lb.colour, bold: true, align: right ? 'right' : 'left' });
    }
  }

  /** Fitted straight lines t = intercept + d / speed, labelled at their far end. */
  _drawFits(L) {
    const { ctx } = this;
    for (const f of this.fits) {
      if (!(f.speedKms > 0)) continue;
      const colour = this._colour(f.color, this._col.ink);
      const at = (d) => this._toScreen({ distKm: d, tSec: f.interceptSec + d / f.speedKms }, L);
      const A = at(f.d0);
      const B = at(f.d1);
      ctx.save();
      ctx.lineCap = 'round';
      ctx.strokeStyle = this._col.bg;
      ctx.globalAlpha = 0.8;
      ctx.lineWidth = 5;
      ctx.beginPath(); ctx.moveTo(A.x, A.y); ctx.lineTo(B.x, B.y); ctx.stroke();
      ctx.globalAlpha = 1;
      ctx.strokeStyle = colour;
      ctx.lineWidth = 2.25;
      ctx.beginPath(); ctx.moveTo(A.x, A.y); ctx.lineTo(B.x, B.y); ctx.stroke();
      ctx.restore();
      const far = A.y > B.y ? A : B;
      const text = `${f.label ? `${f.label} ` : ''}${speedText(f.speedKms, 2)}`;
      const right = far.x > L.x1 - 120;
      this._labelBox(text, far.x + (right ? -8 : 8), clamp(far.y - 10, L.y0 + 9, L.y1 - 9),
        { colour, bold: true, align: right ? 'right' : 'left' });
    }
  }

  /** Picks: a short tick across the trace, with the shape (who picked it) on top. */
  _drawPicks(L, G) {
    const { ctx } = this;
    const col = this._col;
    const order = { analyst: 0, computer: 1, student: 2 };
    const list = this.picks.filter((p) => G.byKey.has(p.key) && Number.isFinite(p.tSec))
      .sort((a, b) => (order[a.who] ?? 0) - (order[b.who] ?? 0));
    const tick = Math.max(4, Math.min(G.gap * 0.45, 12));
    for (const pk of list) {
      const k = G.byKey.get(pk.key);
      const x = this._xOf(reducedTime(pk.tSec, this.traces[k].distKm, this.reduce), L);
      if (x < L.x0 - 8 || x > L.x1 + 8) continue;
      const y = G.ys[k];
      const colour = String(pk.phase).toUpperCase().startsWith('S') ? col.s : col.p;
      ctx.strokeStyle = colour;
      ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(x, y - tick); ctx.lineTo(x, y + tick); ctx.stroke();
      const shape = WHO[pk.who]?.shape ?? 'circle';
      markPath(ctx, shape, x, y - tick, pk.who === 'student' ? 4.5 : 4);
      if (pk.who === 'student') {
        ctx.fillStyle = colour; ctx.fill();
        ctx.strokeStyle = col.bg; ctx.lineWidth = 1; ctx.stroke();
      } else {
        ctx.fillStyle = col.bg; ctx.fill();
        ctx.strokeStyle = colour; ctx.lineWidth = 1.75; ctx.stroke();
      }
    }
  }

  /** The trace under the pointer redrawn thicker (school colour kept), with a time tick at the pointer. */
  _drawHover(L, G) {
    if (!this.hover || this._drag) return;
    const k = G.byKey.get(this.hover.key);
    const p = this._prep[k];
    if (!p) return;
    const { ctx } = this;
    const y = G.ys[k];
    const st = this._traceStyle(p);
    this._strokeTrace(ctx, L, p, y, G.room[k], st.colour === this._col.trace ? this._col.ink : st.colour,
      st.width + 0.8, st.dash);
    ctx.save();
    ctx.strokeStyle = this._col.text;
    ctx.setLineDash([2, 3]);
    ctx.lineWidth = 1;
    const x = Math.round(this.hover.x) + 0.5;
    ctx.beginPath(); ctx.moveTo(x, G.ys[k] - G.gap / 2); ctx.lineTo(x, G.ys[k] + G.gap / 2); ctx.stroke();
    ctx.restore();
  }

  _drawRulers(L) {
    const { ctx } = this;
    for (const [id, r] of this.rulers) {
      const A = this._toScreen(r.a, L);
      const B = this._toScreen(r.b, L);
      const colour = this._rulerColour(id);
      const focused = id === this.focusRuler;
      ctx.save();
      ctx.lineCap = 'round';
      // A thin, faint edge: enough to see the ruler on busy traces, while the
      // arrivals right next to it stay visible.
      ctx.strokeStyle = this._col.bg;
      ctx.globalAlpha = 0.5;
      ctx.lineWidth = focused ? 6 : 4.5;
      ctx.beginPath(); ctx.moveTo(A.x, A.y); ctx.lineTo(B.x, B.y); ctx.stroke();
      ctx.globalAlpha = 0.9;
      ctx.strokeStyle = colour;
      ctx.lineWidth = focused ? 3 : 2.25;
      ctx.beginPath(); ctx.moveTo(A.x, A.y); ctx.lineTo(B.x, B.y); ctx.stroke();
      ctx.globalAlpha = 1;
      for (const P of [A, B]) {
        ctx.beginPath();
        ctx.arc(P.x, P.y, HANDLE_R, 0, 2 * Math.PI);
        ctx.fillStyle = colour;
        ctx.fill();
        ctx.strokeStyle = this._col.bg;
        ctx.lineWidth = 2;
        ctx.stroke();
        if (focused) { // keyboard focus: a dashed ring around each end
          ctx.beginPath();
          ctx.arc(P.x, P.y, HANDLE_R + 4, 0, 2 * Math.PI);
          ctx.strokeStyle = colour;
          ctx.lineWidth = 1.5;
          ctx.setLineDash([3, 2]);
          ctx.stroke();
          ctx.setLineDash([]);
        }
      }
      ctx.restore();
    }
  }

  /**
   * Each ruler's speed, in a box beside its middle. The box goes on the side
   * the line's normal points to (up and to the right for a line running down
   * to the right), so it doesn't sit on the line.
   */
  _drawRulerLabels(L) {
    const { ctx } = this;
    const placed = []; // boxes already drawn: a second label moves down out of their way
    for (const [id, r] of this.rulers) {
      const A = this._toScreen(r.a, L);
      const B = this._toScreen(r.b, L);
      const mx = (A.x + B.x) / 2;
      const my = (A.y + B.y) / 2;
      if (mx < L.x0 - 20 || mx > L.x1 + 20) continue;
      const len = Math.hypot(B.x - A.x, B.y - A.y) || 1;
      let nx = (B.y - A.y) / len;
      let ny = -(B.x - A.x) / len;
      if (nx < 0) { nx = -nx; ny = -ny; }
      const text = `${id}: ${speedText(speedFromRuler(r.a, r.b))}`;
      ctx.font = 'bold 12px system-ui, sans-serif';
      const tw = ctx.measureText(text).width + 6;
      const h = 17;
      let left = mx + nx * 12;
      let cy = my + ny * 12 + (ny < 0 ? -h / 2 : h / 2);
      if (left + tw > L.x1) left = mx - nx * 12 - tw; // no room on the right: other side
      left = clamp(left, L.x0 + 2, L.x1 - tw - 2);
      const hits = (y) => placed.some((b) => left < b.right && left + tw > b.left && y - h / 2 < b.bottom && y + h / 2 > b.top);
      for (let i = 0; i < 4 && hits(cy); i++) cy += h + 3;
      cy = clamp(cy, L.y0 + h / 2 + 1, L.y1 - h / 2 - 1);
      placed.push(this._labelBox(text, left + 3, cy,
        { colour: this._rulerColour(id), bold: true, border: this._rulerColour(id), size: 12 }));
    }
  }

  /** Readout: the trace under the pointer, or the ruler end being dragged. */
  _drawReadout(L, G) {
    const d = this._drag;
    if (d && d.kind === 'end') {
      const pt = this.rulers.get(d.id)?.[d.part];
      if (!pt) return;
      const s = this._toScreen(pt, L);
      this._readoutBox(`${Math.round(pt.distKm)} km · ${pt.tSec.toFixed(1)} s`, s.x, s.y + 16, L);
      return;
    }
    if (!this.hover || d) return;
    const k = G.byKey.get(this.hover.key);
    const p = this._prep[k];
    if (!p) return;
    const tr = p.tr;
    const t = trueTime(this._tauOf(this.hover.x, L), tr.distKm, this.reduce);
    let text = `${tr.label || tr.key} · ${Math.round(tr.distKm)} km · ${t.toFixed(1)} s`;
    const tag = this._tag(p);
    if (tag) text += ` · ${tag}`;
    else if (p.common) text += ` · peak ${formatVelocity(p.peak)}`;
    this._readoutBox(text, this.hover.x, G.ys[k] - G.gap / 2 - 10, L);
  }

  /** A readout box beside x: on the right if it fits, else on the left; inside the plot. */
  _readoutBox(text, x, y, L) {
    this.ctx.font = FONT;
    const tw = this.ctx.measureText(text).width;
    const right = x + 12 + tw + 4 <= L.x1;
    this._labelBox(text, x + (right ? 12 : -12), clamp(y, L.y0 + 9, L.y1 - 9),
      { align: right ? 'left' : 'right', border: this._col.border, bounds: L });
  }

  // --- interaction -----------------------------------------------------------------

  _updateAria() {
    const n = this.traces.length;
    const parts = [];
    if (n) {
      parts.push(`Record section: ${n} stations from ${Math.round(this.traces[0].distKm)} to ` +
        `${Math.round(this.traces[n - 1].distKm)} km from the quake, nearest at the top.`);
    } else parts.push('Record section: no data yet.');
    parts.push(this.reduce
      ? `Time runs across in reduced time: seconds after the origin minus distance ÷ ${fmtV(this.reduce)} km/s.`
      : 'Time runs across in seconds after the origin time.');
    parts.push(this.amplitude === 'true' ? 'True ground speed, one scale for all traces.'
      : 'Each trace stretched to fit.');
    for (const id of this.rulers.keys()) {
      const r = this.getRuler(id);
      parts.push(`${id} ruler: ${speedText(r.speedKms)}, from ${Math.round(r.a.distKm)} km at ` +
        `${r.a.tSec.toFixed(1)} s to ${Math.round(r.b.distKm)} km at ${r.b.tSec.toFixed(1)} s.`);
    }
    const sel = this.traces.find((t) => t.key === this.selected);
    if (sel) parts.push(`Selected: ${sel.label || sel.key}, ${Math.round(sel.distKm)} km.`);
    parts.push('Keys: Tab moves to the rulers; with a ruler chosen, left and right arrows slide it ' +
      'and up and down arrows tilt it (Shift for bigger steps). Otherwise left and right arrows pan, ' +
      'up and down arrows choose a station, plus and minus zoom, 0 resets.');
    this.canvas.setAttribute('aria-label', parts.join(' '));
  }

  _emitRuler(id, final) {
    const r = this.getRuler(id);
    if (!r) return;
    if (final) this._updateAria();
    this.onRuler(id, { ...r, final });
  }

  /** Ruler end or line under the pointer (ends win). tol in px. */
  _hitRuler(p, tol) {
    const L = this._L;
    if (!L) return null;
    let best = null;
    const ids = [...this.rulers.keys()].sort((a, b) => (b === this.focusRuler) - (a === this.focusRuler));
    for (const id of ids) {
      const r = this.rulers.get(id);
      for (const part of ['a', 'b']) {
        const s = this._toScreen(r[part], L);
        const d = Math.hypot(p.x - s.x, p.y - s.y);
        if (d <= tol + 2 && (!best || d < best.d)) best = { id, part, d };
      }
    }
    if (best) return best;
    for (const id of ids) {
      const r = this.rulers.get(id);
      const A = this._toScreen(r.a, L);
      const B = this._toScreen(r.b, L);
      if (distToSegment(p.x, p.y, A.x, A.y, B.x, B.y) <= tol) return { id, part: 'line' };
    }
    return null;
  }

  /** The trace nearest to screen height y, if it is close enough. */
  _traceAt(y) {
    const G = this._G;
    if (!G || !G.ys.length) return null;
    let k = -1;
    let best = Infinity;
    G.ys.forEach((ty, i) => { const d = Math.abs(ty - y); if (d < best) { best = d; k = i; } });
    return best <= Math.max(10, G.gap * 0.6) ? this.traces[k] : null;
  }

  _select(key) {
    this.selected = key;
    this._updateAria();
    this.draw();
    this.onSelect(key);
  }

  _wire() {
    const c = this.canvas;
    const pos = (e) => {
      const r = c.getBoundingClientRect();
      return { x: e.clientX - r.left - c.clientLeft, y: e.clientY - r.top - c.clientTop };
    };
    const inPlot = (p, L) => p.x >= L.x0 && p.x <= L.x1 && p.y >= L.y0 && p.y <= L.y1;

    c.addEventListener('pointerdown', (e) => {
      const L = this._L;
      if (!L || e.button > 0) return;
      const p = pos(e);
      const hit = this._hitRuler(p, e.pointerType === 'touch' ? 18 : 9);
      if (hit) {
        const r = this.rulers.get(hit.id);
        this._drag = { kind: hit.part === 'line' ? 'line' : 'end', id: hit.id, part: hit.part, start: p,
          A: this._toScreen(r.a, L), B: this._toScreen(r.b, L), moved: false };
        this.focusRuler = hit.id;
      } else if (inPlot(p, L)) {
        this._drag = { kind: 'pan', start: p, view: { ...this.view }, moved: false };
        this.focusRuler = null;
      } else return;
      c.setPointerCapture(e.pointerId);
      c.focus({ preventScroll: true });
      e.preventDefault();
      this.draw();
    });

    c.addEventListener('pointermove', (e) => {
      const L = this._L;
      if (!L) return;
      const p = pos(e);
      const d = this._drag;
      if (d) {
        if (Math.hypot(p.x - d.start.x, p.y - d.start.y) > 3) d.moved = true;
        if (!d.moved) return;
        c.style.cursor = 'grabbing';
        const yTop = this._yOf(this.range.dMin, L);
        const yBot = this._yOf(this.range.dMax, L);
        if (d.kind === 'pan') {
          const dSec = (-(p.x - d.start.x) / L.pw) * (d.view.to - d.view.from);
          this._setView(d.view.from + dSec, d.view.to + dSec);
        } else if (d.kind === 'end') {
          const r = this.rulers.get(d.id);
          r[d.part] = this._toPoint(clamp(p.x, L.x0, L.x1), clamp(p.y, yTop, yBot), L);
          this._emitRuler(d.id, false);
        } else {
          // Slide the whole ruler, keeping both ends inside the plot.
          const range = (lo, hi, a, b) => [lo - Math.min(a, b), hi - Math.max(a, b)];
          const [dxLo, dxHi] = range(L.x0, L.x1, d.A.x, d.B.x);
          const [dyLo, dyHi] = range(yTop, yBot, d.A.y, d.B.y);
          let dx = p.x - d.start.x;
          let dy = p.y - d.start.y;
          if (dxLo <= dxHi) dx = clamp(dx, dxLo, dxHi);
          if (dyLo <= dyHi) dy = clamp(dy, dyLo, dyHi);
          const r = this.rulers.get(d.id);
          r.a = this._toPoint(d.A.x + dx, d.A.y + dy, L);
          r.b = this._toPoint(d.B.x + dx, d.B.y + dy, L);
          this._emitRuler(d.id, false);
        }
        this.draw();
        return;
      }
      // Not dragging: show what is under the pointer.
      const hit = this._hitRuler(p, e.pointerType === 'touch' ? 18 : 9);
      const tr = !hit && inPlot(p, L) ? this._traceAt(p.y) : null;
      c.style.cursor = hit ? 'move' : tr ? 'pointer' : '';
      const was = this.hover;
      this.hover = tr ? { key: tr.key, x: p.x } : null;
      if (was?.key !== this.hover?.key || was?.x !== this.hover?.x) this.draw();
    });

    const end = (e, cancelled) => {
      const d = this._drag;
      if (!d) return;
      this._drag = null;
      c.style.cursor = '';
      if (d.kind === 'pan' && !d.moved && !cancelled) {
        const tr = this._traceAt(pos(e).y);
        if (tr) this._select(tr.key);
      } else if (d.kind !== 'pan' && d.moved) this._emitRuler(d.id, true);
      this.draw();
    };
    c.addEventListener('pointerup', (e) => end(e, false));
    c.addEventListener('pointercancel', (e) => end(e, true));
    c.addEventListener('pointerleave', () => {
      if (this._drag || !this.hover) return;
      this.hover = null;
      this.draw();
    });

    c.addEventListener('wheel', (e) => {
      const L = this._L;
      if (!L) return;
      e.preventDefault();
      this.zoom(Math.exp(e.deltaY * 0.002), this._tauOf(clamp(pos(e).x, L.x0, L.x1), L));
    }, { passive: false });

    c.addEventListener('dblclick', (e) => {
      if (this._hitRuler(pos(e), 9)) return;
      this.resetZoom();
    });

    c.addEventListener('blur', () => {
      if (this.focusRuler == null) return;
      this.focusRuler = null;
      this.draw();
    });

    c.addEventListener('keydown', (e) => this._key(e));
  }

  _key(e) {
    const k = e.key;
    const span = this.view.to - this.view.from;
    if (k === 'Tab') {
      // Tab steps through the rulers (P, then S) before leaving the canvas.
      const ids = [...RULER_ORDER.filter((id) => this.rulers.has(id)),
        ...[...this.rulers.keys()].filter((id) => !RULER_ORDER.includes(id))];
      const i = ids.indexOf(this.focusRuler);
      const next = e.shiftKey ? (i > 0 ? ids[i - 1] : i === 0 ? null : undefined)
        : (i < ids.length - 1 ? ids[i + 1] : undefined);
      if (next === undefined) { this.focusRuler = null; this.draw(); return; } // let the browser move on
      this.focusRuler = next;
    } else if (this.focusRuler && this.rulers.has(this.focusRuler) &&
      ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(k)) {
      // Left/right slide the ruler in time; up makes it steeper (faster), down flatter.
      const id = this.focusRuler;
      const step = STEP_SEC * (e.shiftKey ? 10 : 1);
      const r = this.rulers.get(id);
      const moved = k === 'ArrowLeft' ? shiftRuler(r, -step) : k === 'ArrowRight' ? shiftRuler(r, step)
        : tiltRuler(r, k === 'ArrowUp' ? step / 2 : -step / 2);
      this.rulers.set(id, moved);
      this._emitRuler(id, true);
    } else if (k === 'Escape' && this.focusRuler) {
      this.focusRuler = null;
    } else if (k === 'ArrowLeft') this.pan(-span * 0.2);
    else if (k === 'ArrowRight') this.pan(span * 0.2);
    else if (k === 'ArrowUp' || k === 'ArrowDown') {
      if (!this.traces.length) return;
      const i = this.traces.findIndex((t) => t.key === this.selected);
      const j = i < 0 ? (k === 'ArrowDown' ? 0 : this.traces.length - 1)
        : clamp(i + (k === 'ArrowDown' ? 1 : -1), 0, this.traces.length - 1);
      this._select(this.traces[j].key);
    } else if (k === '+' || k === '=') this.zoom(1 / 1.5);
    else if (k === '-' || k === '_') this.zoom(1.5);
    else if (k === '0') this.resetZoom();
    else return;
    e.preventDefault();
    this.draw();
  }
}
