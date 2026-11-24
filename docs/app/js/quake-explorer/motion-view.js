// Particle motion: "Which way did the ground move?" (Quake Explorer, investigation C)
//
// A 3-component station records the path the ground traces: up (Z), north (N)
// and east (E). This view shows:
//
// 1. A strip with the three seismograms on one time axis, and a shaded time
//    window the student drags (default: the first half second of P).
// 2. The path the ground traced during that window, twice:
//    - "seen from above" (a map: east across, north up), and
//    - "seen from the side" (across = motion along one direction, up = up).
//    The path starts light and gets darker as time goes on, so you can see
//    which way the ground moved. "Trace the path" draws it slowly.
// 3. Direction arrows on the view from above, each shown only when the page
//    allows it (so students commit before they look):
//    - the student's own guess (drag it, or use the arrow keys),
//    - the computer's estimate from the P wave (pWaveBackAzimuth in motion.js),
//    - the true direction to the quake (from the official epicenter).
// 4. "How much to trust this": does the ground move along one clear line, and
//    does "up" clearly go with one end of it?
//
// Why it works: a P wave pushes and pulls along its direction of travel. It
// arrives from below, slanting up and away from the quake, so in the first
// moment of P the horizontal motion lines up with the direction to the quake,
// and "up goes with away" says which end of that line the quake is on.
//
// Rotating to R (along the path) and T (sideways) shows P energy on R and
// S energy on T: proof that P waves are longitudinal and S waves transverse.
//
// The view builds its own HTML inside the container you give it (a toolbar,
// three canvases and an info panel) and adds its own small stylesheet once.
// Colours come from the theme variables in app.css, so it follows light/dark.
//
// Usage:
//   const mv = new MotionView(document.querySelector('#motion'), { onGuess, onWindow });
//   mv.setData({ refMs, startMs, sampleRate, z, n, e, picks: { P, S }, trueBazDeg, distKm });
//   mv.setShow({ computer: true });   // reveal the computer's arrow
//   mv.setShow({ truth: true });      // reveal the true direction
//   mv.setMode('RT', bazDeg);         // Z, R, T instead of Z, N, E
import { minMaxColumns, peakAbs, niceStep } from '../lib/signal.js';
import { toRadialTransverse, pWaveBackAzimuth, angleDiff } from '../lib/motion.js';
import {
  norm360, compassPoint, azimuthOf, alongAzimuth, windowIndices, clampWindow, motionScale,
  trustReport, TRUST, parseColour, mixColour,
} from '../lib/hodogram.js';

const RAD = Math.PI / 180;
const AXIS_H = 22; // time axis height, same as TraceView
const EDGE_GRAB_PX = 7; // how close (px) to a window edge counts as grabbing it
const MIN_WIN = 0.1; // shortest window, s
const MAX_WIN = 20; // longest window, s (longer just draws a scribble)
const MIN_SPAN = 0.3; // most zoomed-in view, s
const COMPASS_M = 18; // room around the "from above" circle for N, E, S, W
const RAMP_STEPS = 48; // colours from the light start to the dark end of a path

/** Signed degrees for an error: +12°, −3°, 0°. */
const fmtErr = (d) => `${d > 0.5 ? '+' : d < -0.5 ? '−' : ''}${Math.abs(Math.round(d))}°`;
/** A direction for people: "47° NE". */
const fmtAz = (az) => `${Math.round(norm360(az)) % 360}° ${compassPoint(az)}`;
const fin = Number.isFinite;

// Layout. Container queries make the view fit the space it is given (a full
// page, a card beside a side panel, or a phone), not the whole screen.
const CSS = `
.mv { container-type: inline-size; display: flex; flex-direction: column; gap: 8px; min-width: 0;
  --motion-computer: #7c3aed; --motion-true: var(--warn, #b45309); }
@media (prefers-color-scheme: dark) { :root:not([data-theme="light"]) .mv { --motion-computer: #b197fc; } }
:root[data-theme="dark"] .mv { --motion-computer: #b197fc; }
.mv-bar { display: flex; flex-wrap: wrap; gap: .35rem .5rem; align-items: center; }
.mv-bar button { padding: .3rem .6rem; }
.mv-bar .mv-play { font-weight: 600; min-width: 9.5rem; }
.mv-readout { font-size: .85rem; color: var(--muted); font-variant-numeric: tabular-nums; }
.mv-spacer { flex: 1; }
.mv canvas { display: block; width: 100%; border: 1px solid var(--border); border-radius: 6px;
  background: var(--trace-bg); }
.mv-strip { height: 190px; touch-action: pan-y; }
.mv-lower { display: grid; grid-template-columns: minmax(0, 300px) minmax(0, 300px) minmax(200px, 1fr);
  gap: 10px 14px; align-items: start; }
/* Captions are always exactly two lines, so the two plots line up and never
   move while the student drags (the info panel changing height can't push them). */
.mv-fig { margin: 0; min-width: 0; }
.mv-fig figcaption { font-size: .9rem; font-weight: 600; margin-bottom: 3px; }
.mv-fig figcaption, .mv-fig figcaption small { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.mv-fig figcaption small { display: block; font-weight: 400; color: var(--muted); font-size: .8rem; }
.mv-fig canvas { aspect-ratio: 1 / 1; height: auto; }
.mv-info { font-size: .88rem; min-width: 0; max-width: 28rem; display: flex; flex-direction: column; gap: .55rem; }
.mv-h { font-weight: 600; margin: 0 0 .2rem; font-size: .9rem; }
.mv-dir { display: grid; grid-template-columns: 1.1rem minmax(0, 1fr) auto; gap: .1rem .45rem; align-items: baseline; }
.mv-dir b { font-variant-numeric: tabular-nums; }
.mv-dir .mv-err { grid-column: 2 / -1; color: var(--muted); font-size: .82rem; }
.mv-dir .mv-err.big { color: var(--warn); }
.mv-sw { width: 1.1rem; height: 4px; border-radius: 2px; align-self: center; }
.mv-sw.guess { background: var(--guess, #15803d); }
.mv-sw.computer { background: repeating-linear-gradient(90deg, var(--motion-computer) 0 6px, transparent 6px 9px); }
.mv-sw.truth { background: var(--motion-true); height: 5px; }
.mv-muted { color: var(--muted); }
.mv-meter { margin: .3rem 0; font-size: .84rem; }
.mv-meter .mv-mword { font-weight: 600; white-space: nowrap; }
.mv-track { display: block; margin-top: 3px; position: relative; height: 8px; border-radius: 4px;
  background: var(--grid); border: 1px solid var(--border); overflow: hidden; }
.mv-fill { position: absolute; left: 0; top: 0; bottom: 0; border-radius: 4px; }
.mv-tick { position: absolute; top: -1px; bottom: -1px; width: 2px; background: var(--muted); opacity: .7; }
.good > .mv-fill, .mv-fill.good { background: var(--ok); }
.fair > .mv-fill, .mv-fill.fair { background: var(--warn); }
.poor > .mv-fill, .mv-fill.poor { background: var(--pick-s); }
.mv-mword.good, .mv-overall.good { color: var(--ok); }
.mv-mword.fair, .mv-overall.fair { color: var(--warn); }
.mv-mword.poor, .mv-overall.poor { color: var(--pick-s); }
.mv-overall { margin: .2rem 0 0; font-size: .84rem; }
.mv-note { margin: 0; font-size: .82rem; color: var(--muted); }
.mv-sr { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; }
@container (max-width: 700px) {
  .mv-lower { grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); }
  .mv-info { grid-column: 1 / -1; }
}
@container (max-width: 440px) {
  .mv-lower { grid-template-columns: minmax(0, 1fr); }
  .mv-strip { height: 210px; }
  .mv-bar { gap: .35rem; }
  .mv-bar .mv-readout { order: -1; flex-basis: 100%; }
  .mv-bar .mv-spacer { display: none; }
  .mv-bar button { padding: .3rem .5rem; }
  .mv-bar .mv-play { min-width: 0; flex: 1; }
}
`;

function injectCss() {
  if (document.getElementById('motion-view-css')) return;
  const style = document.createElement('style');
  style.id = 'motion-view-css';
  style.textContent = CSS;
  document.head.append(style);
}

export class MotionView {
  /**
   * @param {HTMLElement} container the view fills it with its own toolbar, canvases and info panel
   * @param {object} [opt]
   * @param {(t0:number, t1:number, info:{final:boolean})=>void} [opt.onWindow] the student moved or
   *   resized the window (seconds after origin); final is true when the drag ends or after a key press
   * @param {(azDeg:number|null, info:{final:boolean})=>void} [opt.onGuess] the student's guess
   *   changed (whole degrees, clockwise from north); null when cleared
   * @param {(est:object)=>void} [opt.onEstimate] the computer's estimate changed (see getEstimate),
   *   e.g. to draw the direction line on a map
   * @param {object} [opt.show] what to show at the start (see setShow)
   * @param {{before:number, after:number}} [opt.pWindow={before:0.05, after:0.5}] the default
   *   window around the P pick, s (the same as the Phase 0 answer key)
   * @param {{before:number, after:number}} [opt.sWindow={before:0.1, after:1}] the window selectPhase('S') uses
   * @param {string|{P?:string, S?:string}} [opt.pickLabel='UUSS'] who made the picks, shown as
   *   "P (UUSS)"; '' for just "P"; or one label per pick, e.g. {P: 'UUSS', S: 'computer'}
   *   (can also be set later: view.pickLabel = …, before setData)
   * @param {boolean} [opt.sharedScale=true] one amplitude scale for all three seismograms, so
   *   their sizes compare fairly (needed to see "P on R, S on T")
   * @param {number} [opt.farKm=100] beyond this distance, warn that directions get unreliable
   */
  constructor(container, opt = {}) {
    injectCss();
    this.onWindow = opt.onWindow || (() => {});
    this.onGuess = opt.onGuess || (() => {});
    this.onEstimate = opt.onEstimate || (() => {});
    this.pWindow = { before: 0.05, after: 0.5, ...opt.pWindow };
    this.sWindow = { before: 0.1, after: 1, ...opt.sWindow };
    this.pickLabel = opt.pickLabel ?? 'UUSS';
    this.sharedScale = opt.sharedScale ?? true;
    this.farKm = opt.farKm ?? 100;
    /** What is visible. Directions appear only when the page reveals them. */
    this.show = { guess: true, lockGuess: false, computer: false, truth: false, picks: true, trust: true, ...opt.show };

    this.data = null;
    this.mode = 'NE';
    this.rotBaz = NaN; // direction used for R/T
    this.rt = null; // {r, t} for the whole record
    this.full = { from: 0, to: 1 };
    this.view = { from: 0, to: 1 };
    this.win = { t0: 0, t1: 0.55 };
    this.guess = null;
    this.est = null;
    this.sideAzOverride = NaN;
    this.hoverSec = null;
    this._drag = null; // strip drag in progress
    this._progress = null; // 0..1 while tracing the path; null = whole path
    this._anim = 0;
    this._animDone = null;
    this._frame = 0;
    this._col = null; // theme colours, read once per theme

    this._build(container);

    // Theme changes: the device setting, or data-theme on <html> (docs embed).
    this._onTheme = () => { this._col = null; this.draw(); };
    this._mq = matchMedia('(prefers-color-scheme: dark)');
    this._mq.addEventListener('change', this._onTheme);
    this._mo = new MutationObserver(this._onTheme);
    this._mo.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    this._ro = new ResizeObserver(() => this.resize());
    for (const c of [this.strip, this.above, this.side]) this._ro.observe(c);

    this._wireStrip();
    this._wireAbove();
    this._updateInfo();
    this._updateAria();
    this.resize();
  }

  // --- public API ----------------------------------------------------------

  /**
   * Give the view one station's three components. All three must start at
   * the same time and have the same sample rate (true for one instrument).
   * Clears the guess (a new station needs a new guess) and selects the
   * default window on the P pick.
   * @param {object} d
   * @param {number} d.refMs time shown as 0 on the axis (the quake's origin time), ms since 1970
   * @param {number} d.startMs time of the first sample
   * @param {number} d.sampleRate samples per second
   * @param {Float32Array} d.z vertical, up positive (see verticalUp in motion.js)
   * @param {Float32Array} d.n north (see rotateHorizontals for 1/2 channels)
   * @param {Float32Array} d.e east
   * @param {{P?:number, S?:number}} [d.picks] analyst picks, seconds after origin
   * @param {number} [d.trueBazDeg] true direction from the station to the quake
   * @param {number} [d.distKm] station–quake distance (far stations get a warning)
   * @param {string} [d.label] station name, for screen readers
   * @param {{from:number, to:number}} [d.view] time range to show first (default: around P and S)
   * @param {{t0:number, t1:number}} [d.window] first window (default: the P window)
   */
  setData(d) {
    this.stopAnimation();
    const len = Math.min(d.z.length, d.n.length, d.e.length);
    this.data = {
      refMs: d.refMs, startMs: d.startMs, sampleRate: d.sampleRate, len,
      z: d.z, n: d.n, e: d.e, picks: { ...d.picks },
      trueBazDeg: fin(d.trueBazDeg) ? norm360(d.trueBazDeg) : NaN,
      distKm: d.distKm, label: d.label ?? '',
    };
    const t0 = (d.startMs - d.refMs) / 1000;
    this.full = { from: t0, to: t0 + Math.max(1, len - 1) / d.sampleRate };
    this.rt = null;
    if (this.mode === 'RT') this._rotate();
    this.guess = null;

    const { P, S } = this.data.picks;
    if (d.view) this.view = this._clampView(d.view.from, d.view.to);
    else if (fin(P)) this.view = this._clampView(P - 2, Math.max(P + 6, fin(S) ? S + 3 : -Infinity));
    else this.view = { ...this.full };

    const w = d.window ?? this._phaseWindow('P');
    if (w) this.win = clampWindow(w.t0, w.t1, this.full, MIN_WIN, MAX_WIN);
    else {
      const mid = (this.view.from + this.view.to) / 2;
      this.win = clampWindow(mid, mid + this.pWindow.before + this.pWindow.after, this.full, MIN_WIN, MAX_WIN);
    }
    this._keepWindowInView();
    this._changed();
  }

  /**
   * Components to show: 'NE' (Z, N, E) or 'RT' (Z, R, T). R is along the path
   * (+ = away from the quake), T is sideways. bazDeg = the direction from the
   * station to the quake to rotate by (default: the true direction).
   * @returns {boolean} false if RT was asked for without a direction
   */
  setMode(mode, bazDeg) {
    if (mode === 'RT') {
      const b = fin(bazDeg) ? bazDeg : this.data?.trueBazDeg;
      if (!fin(b)) return false;
      this.mode = 'RT';
      this.rotBaz = norm360(b);
      this._rotate();
    } else {
      this.mode = 'NE';
      this.rt = null;
    }
    this._updateInfo();
    this._updateAria();
    this.draw();
    return true;
  }

  /** Select the window t0..t1 (seconds after origin). Does not call onWindow. */
  setWindow(t0, t1) {
    this.stopAnimation();
    this.win = clampWindow(t0, t1, this.full, MIN_WIN, MAX_WIN);
    this._keepWindowInView();
    this._changed();
  }

  /** The selected window, seconds after origin. */
  getWindow() { return { ...this.win }; }

  /**
   * Put the window on the analyst's P or S pick (P: 0.05 s before to 0.5 s
   * after; S: 0.1 s before to 1 s after; see the constructor options).
   * Does not call onWindow.
   * @returns {boolean} false if there is no such pick
   */
  selectPhase(phase) {
    const w = this._phaseWindow(phase);
    if (!w) return false;
    this.setWindow(w.t0, w.t1);
    return true;
  }

  /** Show seconds from..to (after origin) on the strip. */
  setView(from, to) { this.view = this._clampView(from, to); this.draw(); }

  /** Zoom the strip by factor (< 1 = in) around centerSec (default: the window's middle). */
  zoom(factor, centerSec) {
    const { from, to } = this.view;
    const c = centerSec ?? (this.win.t0 + this.win.t1) / 2;
    const span = Math.max(MIN_SPAN, (to - from) * factor);
    const f = Math.max(0, Math.min(1, (c - from) / (to - from)));
    this.setView(c - f * span, c - f * span + span);
  }

  /** Move the strip's view by dSec. */
  pan(dSec) { this.setView(this.view.from + dSec, this.view.to + dSec); }

  /** Show the whole record. */
  resetZoom() { this.setView(this.full.from, this.full.to); }

  /** Set (or with null, clear) the student's guess, degrees clockwise from north. Does not call onGuess. */
  setGuess(azDeg) {
    this.guess = fin(azDeg) ? Math.round(norm360(azDeg)) % 360 : null;
    this._updateInfo();
    this._updateAria();
    this.draw();
  }

  getGuess() { return this.guess; }

  /**
   * Choose what is visible (only the keys given change):
   * - guess: the student's arrow (and dragging it); lockGuess: show it but stop changes
   * - computer: the computer's estimate arrow and its numbers
   * - truth: the true direction, and how far off each arrow is
   * - picks: the analyst's P and S marks on the strip
   * - trust: the "how much to trust this" meter
   */
  setShow(flags) {
    Object.assign(this.show, flags);
    this._updateInfo();
    this._updateAria();
    this.draw();
  }

  /**
   * Look at the side view along this direction (degrees), instead of the
   * automatic choice (RT direction, else the true direction once shown, else
   * the guess, else the computer's arrow once shown, else the main line of
   * motion). NaN goes back to automatic.
   */
  setSideAzimuth(azDeg) { this.sideAzOverride = fin(azDeg) ? norm360(azDeg) : NaN; this._updateInfo(); this.draw(); }

  /** Same amplitude scale for all three seismograms (true) or each its own (false). */
  setSharedScale(on) { this.sharedScale = !!on; this.draw(); }

  /**
   * The computer's estimate for the selected window, or null without data.
   * @returns {null|{bazDeg:number, axisDeg:number, linearity:number, upAwayCorr:number,
   *   incidenceDeg:number, t0:number, t1:number, i0:number, i1:number, errDeg:number,
   *   guessErrDeg:number, trust:ReturnType<typeof trustReport>, onP:boolean|null}}
   *   errDeg / guessErrDeg = computer / guess minus the true direction (NaN if unknown);
   *   onP = whether the window is on the first moment of P (null without a P pick)
   */
  getEstimate() {
    if (!this.est) return null;
    const tb = this.data.trueBazDeg;
    return {
      ...this.est, ...this.win,
      errDeg: fin(tb) && fin(this.est.bazDeg) ? angleDiff(this.est.bazDeg, tb) : NaN,
      guessErrDeg: fin(tb) && this.guess != null ? angleDiff(this.guess, tb) : NaN,
      trust: trustReport(this.est.linearity, this.est.upAwayCorr),
      onP: this._windowOnP(),
    };
  }

  /**
   * Draw the path slowly, from the start of the window to the end, with a
   * moving line on the strip. About 6 s of drawing per second of motion
   * (3 to 8 s in all).
   * @returns {Promise<boolean>} true when it finished, false if stopped
   */
  animate() {
    this.stopAnimation();
    if (!this.data) return Promise.resolve(false);
    const ms = 1000 * Math.min(8, Math.max(3, (this.win.t1 - this.win.t0) * 6));
    return new Promise((resolve) => {
      this._animDone = resolve;
      const start = performance.now();
      const step = (now) => {
        const f = Math.min(1, (now - start) / ms);
        this._progress = f;
        this._drawNow();
        if (f < 1) { this._anim = requestAnimationFrame(step); return; }
        this._anim = 0;
        this._finishAnimation(true);
      };
      this._progress = 0;
      this._anim = requestAnimationFrame(step);
      this._updatePlayButton();
    });
  }

  /** Stop tracing the path and show the whole path again. */
  stopAnimation() {
    if (!this._anim && this._progress == null) return;
    cancelAnimationFrame(this._anim);
    this._anim = 0;
    this._finishAnimation(false);
  }

  /** Show the path only up to fraction f (0..1) of the window; null = all of it. For still pictures. */
  setProgress(f) {
    this._progress = f == null ? null : Math.max(0, Math.min(1, f));
    this.draw();
  }

  /** Stop watching size and theme (when the view is thrown away). */
  destroy() {
    this.stopAnimation();
    this._ro.disconnect();
    this._mo.disconnect();
    this._mq.removeEventListener('change', this._onTheme);
    cancelAnimationFrame(this._frame);
    this.root.remove();
  }

  resize() {
    const dpr = window.devicePixelRatio || 1;
    for (const c of [this.strip, this.above, this.side]) {
      const w = Math.max(50, c.clientWidth);
      const h = Math.max(50, c.clientHeight);
      if (c.width !== Math.round(w * dpr) || c.height !== Math.round(h * dpr)) {
        c.width = Math.round(w * dpr);
        c.height = Math.round(h * dpr);
      }
    }
    this.draw();
  }

  /** Redraw on the next animation frame (many changes in one frame draw once). */
  draw() {
    if (this._frame) return;
    this._frame = requestAnimationFrame(() => { this._frame = 0; this._drawNow(); });
  }

  // --- building the HTML ----------------------------------------------------

  _build(container) {
    const root = document.createElement('div');
    root.className = 'mv';
    root.setAttribute('role', 'group');
    root.innerHTML = `
      <div class="mv-bar">
        <button type="button" class="mv-play">▶ Trace the path</button>
        <span class="mv-readout"></span>
        <span class="mv-spacer"></span>
        <button type="button" class="mv-zin" aria-label="Zoom in" title="Zoom in">+</button>
        <button type="button" class="mv-zout" aria-label="Zoom out" title="Zoom out">−</button>
        <button type="button" class="mv-zall" title="Show the whole record">Whole record</button>
      </div>
      <canvas class="mv-strip"></canvas>
      <div class="mv-lower">
        <figure class="mv-fig">
          <figcaption>Seen from above <small class="mv-above-hint">map: north up</small></figcaption>
          <canvas class="mv-above"></canvas>
        </figure>
        <figure class="mv-fig">
          <figcaption>Seen from the side <small class="mv-side-hint"></small></figcaption>
          <canvas class="mv-side" role="img"></canvas>
        </figure>
        <div class="mv-info"></div>
      </div>
      <div class="mv-sr" aria-live="polite"></div>`;
    container.append(root);
    const q = (s) => root.querySelector(s);
    this.root = root;
    /** The toolbar: a page may add its own buttons here (e.g. a Z/N/E – Z/R/T switch). */
    this.toolbar = q('.mv-bar');
    this.strip = q('.mv-strip');
    this.above = q('.mv-above');
    this.side = q('.mv-side');
    this._info = q('.mv-info');
    this._readout = q('.mv-readout');
    this._aboveHint = q('.mv-above-hint');
    this._sideHint = q('.mv-side-hint');
    this._live = q('.mv-sr');
    this._play = q('.mv-play');
    this._play.addEventListener('click', () => {
      if (this._anim) this.stopAnimation(); else this.animate();
    });
    q('.mv-zin').addEventListener('click', () => this.zoom(1 / 1.5));
    q('.mv-zout').addEventListener('click', () => this.zoom(1.5));
    q('.mv-zall').addEventListener('click', () => this.resetZoom());
  }

  // --- data helpers -----------------------------------------------------------

  _rotate() {
    const d = this.data;
    this.rt = d && fin(this.rotBaz) ? toRadialTransverse(d.n, d.e, this.rotBaz) : null;
  }

  /** The three traces on the strip, top to bottom. */
  _components() {
    const d = this.data;
    if (this.mode === 'RT' && this.rt) {
      return [
        { label: 'Z  up', data: d.z },
        { label: 'R  along the path (+ away from the quake)', short: 'R  along path', data: this.rt.r },
        { label: 'T  sideways', data: this.rt.t },
      ];
    }
    return [{ label: 'Z  up', data: d.z }, { label: 'N  north', data: d.n }, { label: 'E  east', data: d.e }];
  }

  /**
   * Is the window on the first moment of P, where "P motion points to the
   * quake" works? null when there is no P pick to tell.
   */
  _windowOnP() {
    const { P, S } = this.data?.picks ?? {};
    if (!fin(P)) return null;
    const { t0, t1 } = this.win;
    return t0 >= P - 0.5 && t0 <= P + 0.25 && t1 <= P + 1.5 && !(fin(S) && t1 > S);
  }

  _phaseWindow(phase) {
    const t = this.data?.picks?.[phase];
    if (!fin(t)) return null;
    const w = phase === 'S' ? this.sWindow : this.pWindow;
    return { t0: t - w.before, t1: t + w.after };
  }

  _indices() {
    const d = this.data;
    return windowIndices({ startMs: d.startMs, refMs: d.refMs, sampleRate: d.sampleRate, length: d.len },
      this.win.t0, this.win.t1);
  }

  /** The window or data changed: new estimate, numbers and pictures. */
  _changed() {
    if (this.data) {
      const { i0, i1 } = this._indices();
      const { z, n, e } = this.data;
      this.est = i1 - i0 >= 3 ? { ...pWaveBackAzimuth(z, n, e, i0, i1), i0, i1 } : null;
      if (this.est && !fin(this.est.axisDeg)) this.est = null; // only gaps in the window
    } else this.est = null;
    this._updateInfo();
    this._updateAria();
    this.draw();
    this.onEstimate(this.getEstimate());
  }

  _clampView(from, to) {
    const full = this.full;
    const span = Math.min(full.to - full.from, Math.max(MIN_SPAN, to - from));
    from = Math.max(full.from, Math.min(from, full.to - span));
    return { from, to: from + span };
  }

  /** Slide the strip's view so the whole window can be seen. */
  _keepWindowInView() {
    const { t0, t1 } = this.win;
    let { from, to } = this.view;
    const pad = 0.1 * (to - from);
    if (t1 - t0 > to - from - 2 * pad) { // window wider than the view: zoom out around it
      const span = (t1 - t0) / 0.8;
      from = (t0 + t1) / 2 - span / 2; to = from + span;
    } else if (t0 < from) { to -= from - (t0 - pad); from = t0 - pad; }
    else if (t1 > to) { from += t1 + pad - to; to = t1 + pad; }
    this.view = this._clampView(from, to);
  }

  /**
   * Which direction the side view looks along (motion toward it is drawn to
   * the right), and why.
   */
  _sideAz() {
    const d = this.data;
    if (this.mode === 'RT' && fin(this.rotBaz)) return { az: this.rotBaz, why: 'R/T direction' };
    if (fin(this.sideAzOverride)) return { az: this.sideAzOverride, why: '' };
    if (this.show.truth && fin(d?.trueBazDeg)) return { az: d.trueBazDeg, why: 'true direction' };
    if (this.show.guess && this.guess != null) return { az: this.guess, why: 'your guess' };
    if (this.show.computer && this.est) return { az: this.est.bazDeg, why: 'computer' };
    if (this.est) return { az: this.est.axisDeg, why: 'main line of motion' };
    return { az: 0, why: '' };
  }

  _finishAnimation(done) {
    this._progress = null;
    this._updatePlayButton();
    this.draw();
    const r = this._animDone;
    this._animDone = null;
    if (r) r(done);
  }

  _updatePlayButton() {
    this._play.textContent = this._anim ? '■ Stop' : '▶ Trace the path';
  }

  // --- text: info panel, readout, labels for screen readers -------------------

  _updateInfo() {
    const { t0, t1 } = this.win;
    this._readout.textContent = this.data
      ? `Window ${t0.toFixed(2)} to ${t1.toFixed(2)} s (${(t1 - t0).toFixed(2)} s long)` : '';
    const side = this._sideAz();
    this._sideHint.textContent = this.data ? `across: ${fmtAz(side.az)}${side.why ? ` (${side.why})` : ''}` : '';
    const guessing = this.show.guess && !this.show.lockGuess;
    this._aboveHint.textContent = guessing ? (this.guess == null ? 'north up · drag to aim your guess'
      : 'north up · drag to move your guess') : 'a map, north up';
    this.above.style.touchAction = guessing ? 'none' : 'pan-y';
    this.above.style.cursor = guessing ? 'crosshair' : '';

    const est = this.est;
    const tb = this.data?.trueBazDeg;
    const truthKnown = this.show.truth && fin(tb);
    const err = (az) => {
      if (!truthKnown) return '';
      const d = angleDiff(az, tb);
      return `<span class="mv-err${Math.abs(d) > 30 ? ' big' : ''}">${fmtErr(d)} from the true direction</span>`;
    };
    const rows = [];
    if (this.show.guess) {
      rows.push(this.guess == null
        ? '<div class="mv-dir"><i class="mv-sw guess"></i><span>Your guess</span><b class="mv-muted">—</b>' +
          '<span class="mv-err">Drag on the view from above toward where you think the quake is.</span></div>'
        : `<div class="mv-dir"><i class="mv-sw guess"></i><span>Your guess</span><b>${fmtAz(this.guess)}</b>${err(this.guess)}</div>`);
    }
    if (this.show.computer) {
      rows.push(est
        ? `<div class="mv-dir"><i class="mv-sw computer"></i><span>Computer (from P motion)</span><b>${fmtAz(est.bazDeg)}</b>${err(est.bazDeg)}</div>`
        : '<div class="mv-dir"><i class="mv-sw computer"></i><span>Computer</span><b class="mv-muted">—</b><span class="mv-err">No data in this window.</span></div>');
    }
    if (truthKnown) {
      rows.push(`<div class="mv-dir"><i class="mv-sw truth"></i><span>True direction</span><b>${fmtAz(tb)}</b></div>`);
    }
    let html = rows.length ? `<div><p class="mv-h">Direction to the quake</p>${rows.join('')}</div>` : '';

    if (this.show.trust && this.data) {
      if (est) {
        const tr = trustReport(est.linearity, est.upAwayCorr);
        const offP = this._windowOnP() === false;
        const meter = (label, value, mark, r) => `
          <div class="mv-meter" role="meter" aria-valuemin="0" aria-valuemax="1" aria-valuenow="${value.toFixed(2)}"
            aria-valuetext="${r.words} (${value.toFixed(2)})" aria-label="${label}">
            <span class="mv-mlabel">${label}:</span> <b class="mv-mword ${r.level}">${r.words}</b>
            <span class="mv-track ${r.level}"><span class="mv-fill" style="width:${Math.round(value * 100)}%"></span>
            <i class="mv-tick" style="left:${mark * 100}%"></i></span>
          </div>`;
        // The meters judge the P-wave method, so they only mean something on P.
        html += offP
          ? '<div><p class="mv-h">How much to trust this window?</p><p class="mv-overall poor">This window is ' +
            'not the first moment of P, so "P motion points to the quake" does not apply here.</p></div>'
          : `<div><p class="mv-h">How much to trust this window?</p>
            ${meter('Moves along one line', est.linearity, TRUST.lineClear, tr.line)}
            ${meter('Up goes with one end', est.upAwayCorr, TRUST.upAwayClear, tr.upAway)}
            <p class="mv-overall ${tr.overall.level}">${tr.overall.words}</p></div>`;
      } else {
        html += '<div><p class="mv-h">How much to trust this window?</p><p class="mv-note">No data in this window.</p></div>';
      }
      const km = this.data.distKm;
      if (fin(km) && km > this.farKm) {
        html += `<p class="mv-note">This station is ${Math.round(km)} km from the quake. Beyond about ${this.farKm} km ` +
          'the waves have bent and scattered on the way, so the direction is often unreliable.</p>';
      }
    }
    html += '<p class="mv-note">○ start, ● end: the path darkens as time goes on.' +
      (this.mode === 'RT' ? ' Dashed lines: R (along the path) and T (sideways).' : '') + '</p>';
    this._info.innerHTML = html;
  }

  _updateAria() {
    const d = this.data;
    const comps = d ? this._components().map((c) => c.label.split(/\s+/)[0]).join(', ') : 'Z, N, E';
    this.root.setAttribute('aria-label', `Ground motion${d?.label ? ` at ${d.label}` : ''}`);
    this.strip.setAttribute('aria-label', `Seismograms ${comps} on one time axis. Shaded: the selected window, ` +
      `${this.win.t0.toFixed(2)} to ${this.win.t1.toFixed(2)} seconds after the origin. Drag the window or its ` +
      'edges, or click to move it there; drag elsewhere to pan, scroll to zoom. Keys: left and right arrows ' +
      'move the window, [ and ] make it shorter or longer, + and − zoom, 0 shows the whole record, Enter traces the path.');
    this.strip.tabIndex = 0;
    this.above.tabIndex = 0;
    const guessing = this.show.guess && !this.show.lockGuess;
    let label = 'Ground motion seen from above, north up: the path the ground traced in the window.';
    if (this.show.guess && this.guess != null) label += ` Your guess: ${fmtAz(this.guess)}.`;
    if (this.show.computer && this.est) label += ` Computer: ${fmtAz(this.est.bazDeg)}.`;
    if (this.show.truth && fin(d?.trueBazDeg)) label += ` True direction: ${fmtAz(d.trueBazDeg)}.`;
    if (guessing) {
      label += ' Drag, or use the arrow keys (Shift for 10° steps), to point your guess at the quake.';
      this.above.setAttribute('role', 'slider');
      this.above.setAttribute('aria-valuemin', '0');
      this.above.setAttribute('aria-valuemax', '359');
      if (this.guess != null) {
        this.above.setAttribute('aria-valuenow', String(this.guess));
        this.above.setAttribute('aria-valuetext', `${fmtAz(this.guess)}`);
      } else {
        this.above.removeAttribute('aria-valuenow');
        this.above.setAttribute('aria-valuetext', 'no guess yet');
      }
    } else {
      this.above.setAttribute('role', 'img');
      for (const a of ['aria-valuemin', 'aria-valuemax', 'aria-valuenow', 'aria-valuetext']) this.above.removeAttribute(a);
    }
    this.above.setAttribute('aria-label', label);
    const side = this._sideAz();
    this.side.setAttribute('aria-label', `Ground motion seen from the side: across is motion toward ${fmtAz(side.az)}, ` +
      'up is up.');
  }

  _say(text) { this._live.textContent = text; }

  // --- theme -------------------------------------------------------------------

  /** Colours from app.css, read once per theme (not on every frame). */
  _theme() {
    if (this._col) return this._col;
    const s = getComputedStyle(this.root);
    const v = (name, fallback) => s.getPropertyValue(name).trim() || fallback;
    const col = {
      bg: v('--trace-bg', '#fff'),
      trace: v('--trace', '#1f2937'),
      grid: v('--grid', '#e5e7eb'),
      text: v('--muted', '#6b7280'),
      border: v('--border', '#d9dde3'),
      accent: v('--accent', '#1d4ed8'),
      p: v('--pick-p', '#2563eb'),
      s: v('--pick-s', '#dc2626'),
      guess: v('--guess', '#15803d'),
      computer: v('--motion-computer', '#7c3aed'),
      truth: v('--motion-true', '#b45309'),
    };
    // The path: from a pale version of the trace colour (start) to the full
    // colour (end). Blended with the background, so it works in both themes.
    const bg = parseColour(col.bg) ?? [255, 255, 255];
    const fg = parseColour(col.trace) ?? [31, 41, 55];
    col.ramp = Array.from({ length: RAMP_STEPS }, (_, k) => mixColour(bg, fg, 0.2 + (0.8 * k) / (RAMP_STEPS - 1)));
    if (this.root.isConnected) this._col = col; // not in the page yet: read again later
    return col;
  }

  // --- drawing -------------------------------------------------------------------

  _drawNow() {
    const col = this._theme();
    this._drawStrip(col);
    this._drawAbove(col);
    this._drawSide(col);
  }

  _prep(canvas) {
    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    return { ctx, w: canvas.clientWidth, h: canvas.clientHeight };
  }

  _xOf(sec) { return ((sec - this.view.from) / (this.view.to - this.view.from)) * this.strip.clientWidth; }
  _secOf(x) { return this.view.from + (x / this.strip.clientWidth) * (this.view.to - this.view.from); }

  /** Index just past the last sample drawn while tracing (or the window end). */
  _drawEnd(i0, i1) {
    if (this._progress == null) return i1;
    return i0 + Math.max(1, Math.round(this._progress * (i1 - i0)));
  }

  _drawStrip(col) {
    const { ctx, w, h } = this._prep(this.strip);
    const plotH = h - AXIS_H;
    ctx.fillStyle = col.bg;
    ctx.fillRect(0, 0, w, h);
    ctx.font = '11px system-ui, sans-serif';
    const d = this.data;
    if (!d) {
      ctx.fillStyle = col.text;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('No data', w / 2, plotH / 2);
      return;
    }
    // the window, shaded behind everything
    const xw0 = this._xOf(this.win.t0);
    const xw1 = this._xOf(this.win.t1);
    ctx.save();
    ctx.globalAlpha = 0.13;
    ctx.fillStyle = col.accent;
    ctx.fillRect(xw0, 0, xw1 - xw0, plotH);
    ctx.restore();

    // time grid and labels (same as TraceView)
    const span = this.view.to - this.view.from;
    const step = niceStep(span, Math.max(3, Math.floor(w / 90)));
    ctx.textBaseline = 'top';
    const unit = w > 480 ? 's after origin' : 's';
    const unitLeft = w - 4 - ctx.measureText(unit).width;
    for (let t = Math.ceil(this.view.from / step) * step; t <= this.view.to; t += step) {
      const x = Math.round(this._xOf(t)) + 0.5;
      ctx.strokeStyle = col.grid;
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, plotH); ctx.stroke();
      const label = step < 1 ? t.toFixed(step < 0.1 ? 2 : 1) : String(Math.round(t));
      const half = ctx.measureText(label).width / 2;
      if (x - half < 0 || x + half > unitLeft - 6) continue; // keep labels apart
      ctx.fillStyle = col.text;
      ctx.textAlign = 'center';
      ctx.fillText(label, x, plotH + 4);
    }
    ctx.fillStyle = col.text;
    ctx.textAlign = 'right';
    ctx.fillText(unit, w - 4, plotH + 4);

    // the three traces
    const comps = this._components();
    const trackH = plotH / comps.length;
    const sr = d.sampleRate;
    const i0 = Math.floor((this.view.from - this.full.from) * sr);
    const i1 = Math.ceil((this.view.to - this.full.from) * sr) + 1;
    const shared = this.sharedScale ? Math.max(...comps.map((c) => peakAbs(c.data, i0, i1))) : 0;
    comps.forEach((c, k) => {
      const y0 = k * trackH + trackH / 2;
      const amp = shared || peakAbs(c.data, i0, i1) || 1;
      const scale = (trackH / 2 - 3) / amp;
      ctx.save();
      ctx.beginPath();
      ctx.rect(0, k * trackH, w, trackH);
      ctx.clip();
      ctx.strokeStyle = col.trace;
      ctx.lineWidth = 1;
      ctx.beginPath();
      if ((i1 - i0) / w > 2) {
        const cols = Math.floor(w);
        const { min, max } = minMaxColumns(c.data, i0, i1, cols);
        let pen = false;
        for (let x = 0; x < cols; x++) {
          if (Number.isNaN(min[x])) { pen = false; continue; }
          const yA = y0 - max[x] * scale;
          const yB = y0 - min[x] * scale;
          if (!pen) { ctx.moveTo(x + 0.5, yA); pen = true; } else ctx.lineTo(x + 0.5, yA);
          ctx.lineTo(x + 0.5, yB);
        }
      } else {
        let pen = false;
        for (let i = Math.max(0, i0); i < Math.min(c.data.length, i1); i++) {
          const v = c.data[i];
          if (Number.isNaN(v)) { pen = false; continue; }
          const x = this._xOf(this.full.from + i / sr);
          const y = y0 - v * scale;
          if (!pen) { ctx.moveTo(x, y); pen = true; } else ctx.lineTo(x, y);
        }
      }
      ctx.stroke();
      ctx.restore();
      // label on a small backing box, so the trace never hides it
      const text = w < 420 && c.short ? c.short : c.label;
      ctx.font = '600 11px system-ui, sans-serif';
      const tw = ctx.measureText(text).width;
      ctx.save();
      ctx.globalAlpha = 0.8;
      ctx.fillStyle = col.bg;
      ctx.fillRect(2, k * trackH + 2, tw + 6, 15);
      ctx.restore();
      ctx.fillStyle = col.text;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      ctx.fillText(text, 5, k * trackH + 4);
      ctx.font = '11px system-ui, sans-serif';
      if (k > 0) {
        ctx.strokeStyle = col.grid;
        ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(0, k * trackH + 0.5); ctx.lineTo(w, k * trackH + 0.5); ctx.stroke();
      }
    });

    // window edges, with grips to show they can be dragged
    ctx.strokeStyle = col.accent;
    ctx.fillStyle = col.accent;
    ctx.lineWidth = 2;
    for (const x of [xw0, xw1]) {
      if (x < -4 || x > w + 4) continue;
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, plotH); ctx.stroke();
      ctx.beginPath();
      ctx.roundRect(x - 3.5, plotH / 2 - 12, 7, 24, 3);
      ctx.fill();
    }

    // analyst picks, dashed
    if (this.show.picks) {
      const marker = (sec, color, label, lift) => {
        if (!fin(sec)) return;
        const x = this._xOf(sec);
        if (x < -2 || x > w + 2) return;
        ctx.save();
        ctx.strokeStyle = color;
        ctx.lineWidth = 1.5;
        ctx.setLineDash([5, 4]);
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, plotH); ctx.stroke();
        ctx.restore();
        ctx.font = 'bold 12px system-ui, sans-serif';
        ctx.fillStyle = color;
        ctx.textAlign = x > w - 70 ? 'right' : 'left';
        ctx.textBaseline = 'bottom';
        ctx.fillText(label, x + (x > w - 70 ? -3 : 3), plotH - 2 - lift);
        ctx.font = '11px system-ui, sans-serif';
      };
      // pickLabel: one label for both picks ('UUSS'), or one per pick ({P: 'UUSS', S: 'computer'}).
      const who = (ph) => {
        const l = this.pickLabel && typeof this.pickLabel === 'object' ? this.pickLabel[ph] : this.pickLabel;
        return l ? ` (${l})` : '';
      };
      marker(d.picks.P, col.p, `P${who('P')}`, 0);
      marker(d.picks.S, col.s, `S${who('S')}`, 0);
    }

    // the moving line while tracing the path
    if (this._progress != null) {
      const { i0: a, i1: b } = this._indices();
      const x = this._xOf(this.full.from + (this._drawEnd(a, b) - 1) / sr);
      ctx.save();
      ctx.strokeStyle = 'rgba(0,0,0,0.6)';
      ctx.lineWidth = 3.5;
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, plotH); ctx.stroke();
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, plotH); ctx.stroke();
      ctx.restore();
    }

    // time under the pointer
    if (this.hoverSec != null && !this._drag) {
      const x = this._xOf(this.hoverSec);
      ctx.strokeStyle = col.text;
      ctx.lineWidth = 1;
      ctx.setLineDash([2, 3]);
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, plotH); ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = col.text;
      ctx.textAlign = x > w - 70 ? 'right' : 'left';
      ctx.textBaseline = 'bottom';
      ctx.fillText(`${this.hoverSec.toFixed(2)} s`, x + (x > w - 70 ? -4 : 4), plotH - 16);
    }
  }

  /**
   * Shared set-up for the two square plots: background, the centre, and the
   * radius available. Each plot then scales its own path to fill the circle
   * (equal scales across and up, so a circle stays a circle).
   */
  _plotFrame(canvas, col) {
    const { ctx, w, h } = this._prep(canvas);
    ctx.fillStyle = col.bg;
    ctx.fillRect(0, 0, w, h);
    const R = Math.min(w, h) / 2 - COMPASS_M;
    return { ctx, w, h, cx: w / 2, cy: h / 2, R };
  }

  /** Pixels per unit of motion so the biggest swing reaches 92% of the radius R. */
  _scaleFor(R, z, n, e, i0, i1) {
    const m = motionScale(z, n, e, i0, i1);
    return m > 0 ? (R * 0.92) / m : 0;
  }

  /** Light reference circle and cross through the centre (equal axes: a circle stays a circle). */
  _grid(ctx, cx, cy, R, col) {
    ctx.strokeStyle = col.border;
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.arc(cx, cy, R, 0, 2 * Math.PI); ctx.stroke();
    ctx.strokeStyle = col.grid;
    ctx.beginPath();
    ctx.moveTo(cx - R, cy); ctx.lineTo(cx + R, cy);
    ctx.moveTo(cx, cy - R); ctx.lineTo(cx, cy + R);
    ctx.stroke();
  }

  /**
   * The path from sample i0 to iEnd: x = xs[i], y = ys[i] (both scaled by k,
   * y up). Light at the start, dark at the end of the WHOLE window, so a
   * half-traced path has the same colours it will end with.
   */
  _path(ctx, xs, ys, i0, i1, iEnd, cx, cy, k, col) {
    if (!k || iEnd - i0 < 1) return;
    const ramp = col.ramp;
    const last = Math.max(1, i1 - i0 - 1);
    ctx.save();
    ctx.lineWidth = 1.8;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    let cur = -1;
    let pen = false;
    for (let i = i0; i < iEnd - 1; i++) {
      const c = Math.min(ramp.length - 1, Math.floor(((i - i0) / last) * ramp.length));
      if (c !== cur) {
        if (pen) ctx.stroke();
        ctx.strokeStyle = ramp[c];
        ctx.beginPath();
        cur = c;
        pen = false;
      }
      const xa = xs[i]; const ya = ys[i]; const xb = xs[i + 1]; const yb = ys[i + 1];
      if (Number.isNaN(xa + ya + xb + yb)) { pen = false; continue; }
      if (!pen) { ctx.moveTo(cx + xa * k, cy - ya * k); pen = true; }
      ctx.lineTo(cx + xb * k, cy - yb * k);
    }
    if (pen) ctx.stroke();
    // start: an open circle; end (or "now" while tracing): a filled dot
    let first = i0;
    while (first < iEnd && Number.isNaN(xs[first] + ys[first])) first++;
    let end = iEnd - 1;
    while (end > first && Number.isNaN(xs[end] + ys[end])) end--;
    if (first < iEnd) {
      ctx.lineWidth = 1.5;
      ctx.strokeStyle = col.text;
      ctx.fillStyle = col.bg;
      ctx.beginPath(); ctx.arc(cx + xs[first] * k, cy - ys[first] * k, 4, 0, 2 * Math.PI); ctx.fill(); ctx.stroke();
      ctx.fillStyle = ramp[ramp.length - 1];
      ctx.strokeStyle = col.bg;
      ctx.beginPath(); ctx.arc(cx + xs[end] * k, cy - ys[end] * k, this._progress != null ? 5 : 3.5, 0, 2 * Math.PI);
      ctx.fill(); ctx.stroke();
    }
    ctx.restore();
  }

  _noData(ctx, w, h, col) {
    ctx.fillStyle = col.text;
    ctx.font = '12px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(this.data ? 'No data in this window' : 'No data', w / 2, h / 2);
  }

  _drawAbove(col) {
    const { ctx, w, h, cx, cy, R } = this._plotFrame(this.above, col);
    this._grid(ctx, cx, cy, R, col);
    // compass letters
    ctx.font = 'bold 12px system-ui, sans-serif';
    ctx.fillStyle = col.text;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const L = R + COMPASS_M / 2 + 1;
    ctx.fillText('N', cx, cy - L);
    ctx.fillText('E', cx + L, cy);
    ctx.fillText('S', cx, cy + L);
    ctx.fillText('W', cx - L, cy);
    const labelBoxes = [[cx, cy - L], [cx + L, cy], [cx, cy + L], [cx - L, cy]]
      .map(([x, y]) => ({ x: x - 7, y: y - 8, w: 14, h: 16 }));

    // R/T guide lines
    if (this.mode === 'RT' && fin(this.rotBaz)) {
      ctx.save();
      ctx.setLineDash([4, 4]);
      ctx.strokeStyle = col.text;
      ctx.lineWidth = 1;
      ctx.font = 'italic 11px system-ui, sans-serif';
      ctx.fillStyle = col.text;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      for (const [az, name] of [[this.rotBaz, 'R'], [this.rotBaz + 90, 'T']]) {
        const ux = Math.sin(az * RAD);
        const uy = -Math.cos(az * RAD);
        ctx.beginPath(); ctx.moveTo(cx - ux * R, cy - uy * R); ctx.lineTo(cx + ux * R, cy + uy * R); ctx.stroke();
        // the name near the line's end, nudged off the line (clockwise side)
        ctx.fillText(name, cx + ux * (R - 10) - uy * 9, cy + uy * (R - 10) + ux * 9);
      }
      ctx.restore();
    }

    const d = this.data;
    if (this.est) {
      const { i0, i1 } = this.est;
      const k = this._scaleFor(R, null, d.n, d.e, i0, i1); // from above: horizontal motion only
      this._path(ctx, d.e, d.n, i0, i1, this._drawEnd(i0, i1), cx, cy, k, col);
    } else this._noData(ctx, w, h, col);

    // direction arrows: computer, then true, then the student's guess on top
    const A = R * 0.9;
    const tips = [];
    if (this.show.computer && this.est) {
      this._arrow(ctx, cx, cy, this.est.bazDeg, A, col.computer, { width: 2.5, dashed: true }, col);
      tips.push({ az: this.est.bazDeg, text: `computer ${Math.round(this.est.bazDeg) % 360}°`, color: col.computer });
    }
    const tb = d?.trueBazDeg;
    if (this.show.truth && fin(tb)) {
      this._arrow(ctx, cx, cy, tb, A, col.truth, { width: 3 }, col);
      tips.push({ az: tb, text: `true ${Math.round(tb) % 360}°`, color: col.truth });
    }
    if (this.show.guess && this.guess != null) {
      this._arrow(ctx, cx, cy, this.guess, A, col.guess, { width: 3, head: this.show.lockGuess, knob: !this.show.lockGuess }, col);
      tips.push({ az: this.guess, text: `guess ${this.guess}°`, color: col.guess });
    }
    this._tipLabels(ctx, cx, cy, A, tips, labelBoxes, w, h, col);
  }

  /**
   * An arrow from the centre toward azimuth az, with a thin halo in the
   * background colour so it stays visible over the path.
   */
  _arrow(ctx, cx, cy, az, len, color, { width = 2.5, dashed = false, head = true, knob = false, alpha = 1 }, col) {
    const ux = Math.sin(az * RAD);
    const uy = -Math.cos(az * RAD);
    const x1 = cx + ux * len;
    const y1 = cy + uy * len;
    const hl = 12; // arrowhead length
    const hw = 6; // arrowhead half-width
    const xs = head ? x1 - ux * hl * 0.8 : x1; // stop the shaft inside the head
    const ys = head ? y1 - uy * hl * 0.8 : y1;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.lineCap = 'round';
    ctx.strokeStyle = col.bg;
    ctx.lineWidth = width + 3;
    ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(xs, ys); ctx.stroke();
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    if (dashed) ctx.setLineDash([7, 4]);
    ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(xs, ys); ctx.stroke();
    ctx.setLineDash([]);
    if (head) {
      const bx = x1 - ux * hl;
      const by = y1 - uy * hl;
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(bx - uy * hw, by + ux * hw);
      ctx.lineTo(bx + uy * hw, by - ux * hw);
      ctx.closePath();
      ctx.lineWidth = 2;
      ctx.strokeStyle = col.bg;
      ctx.stroke();
      ctx.fillStyle = color;
      ctx.fill();
    }
    if (knob) { // the handle students drag
      ctx.beginPath(); ctx.arc(x1, y1, 7, 0, 2 * Math.PI);
      ctx.fillStyle = color;
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.strokeStyle = col.bg;
      ctx.stroke();
    }
    ctx.restore();
  }

  /**
   * Short labels ("true 47°") beside the arrows. Each tries a few spots along
   * its arrow, on either side, and takes the first that overlaps nothing
   * already placed (arrows a few degrees apart would otherwise collide).
   */
  _tipLabels(ctx, cx, cy, A, tips, placed, w, h, col) {
    ctx.font = '600 11px system-ui, sans-serif';
    const spots = [[0.72, 1], [0.72, -1], [0.5, 1], [0.5, -1], [0.9, 1], [0.9, -1], [0.3, 1], [0.3, -1]];
    const hit = (a, b) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
    for (const t of tips) {
      const ux = Math.sin(t.az * RAD);
      const uy = -Math.cos(t.az * RAD);
      const tw = ctx.measureText(t.text).width + 6;
      const th = 15;
      let box = null;
      for (const [f, side] of spots) {
        // a point along the arrow, pushed sideways so the label clears the shaft
        const px = cx + ux * A * f - uy * side * (th / 2 + 4);
        const py = cy + uy * A * f + ux * side * (th / 2 + 4);
        // anchor the box on the side away from the shaft
        const sx = -uy * side;
        const sy = ux * side;
        const b = { x: px - tw / 2 + sx * (tw / 2 - 4), y: py - th / 2 + sy * 2, w: tw, h: th };
        b.x = Math.max(1, Math.min(w - tw - 1, b.x));
        b.y = Math.max(1, Math.min(h - th - 1, b.y));
        if (!placed.some((p) => hit(p, b))) { box = b; break; }
        box ??= b;
      }
      placed.push(box);
      ctx.save();
      ctx.globalAlpha = 0.85;
      ctx.fillStyle = col.bg;
      ctx.fillRect(box.x, box.y, box.w, box.h);
      ctx.restore();
      ctx.fillStyle = t.color;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText(t.text, box.x + 3, box.y + th / 2 + 0.5);
    }
  }

  _drawSide(col) {
    const { ctx, w, h, cx, cy, R } = this._plotFrame(this.side, col);
    this._grid(ctx, cx, cy, R, col);
    const { az } = this._sideAz();
    // labels: "up" at the top; the two horizontal directions in the bottom
    // corners (like an x-axis), outside the circle, so the path never hides them
    ctx.font = 'bold 12px system-ui, sans-serif';
    ctx.fillStyle = col.text;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('up', cx, cy - R - COMPASS_M / 2 - 1);
    ctx.font = '11px system-ui, sans-serif';
    const rt = this.mode === 'RT' && fin(this.rotBaz);
    const right = rt ? `toward quake ${Math.round(az) % 360}° →` : `${fmtAz(az)} →`;
    const left = rt ? '← away' : `← ${fmtAz(az + 180)}`;
    ctx.textBaseline = 'bottom';
    ctx.textAlign = 'right';
    ctx.fillText(right, w - 4, h - 3);
    ctx.textAlign = 'left';
    ctx.fillText(left, 4, h - 3);

    if (this.est) {
      const d = this.data;
      const { i0, i1 } = this.est;
      const along = alongAzimuth(d.n.subarray(i0, i1), d.e.subarray(i0, i1), az);
      const up = d.z.subarray(i0, i1);
      const m = Math.max(peakAbs(along), peakAbs(up));
      const k = m > 0 ? (R * 0.92) / m : 0;
      this._path(ctx, along, up, 0, i1 - i0, this._drawEnd(i0, i1) - i0, cx, cy, k, col);
    } else this._noData(ctx, w, h, col);
  }

  // --- interaction ------------------------------------------------------------

  _wireStrip() {
    const c = this.strip;
    const xOf = (e) => e.clientX - c.getBoundingClientRect().left - c.clientLeft;
    const inPlot = (e) => e.clientY - c.getBoundingClientRect().top - c.clientTop <= c.clientHeight - AXIS_H;
    // What is under the pointer: a window edge, the window, or empty strip.
    const partAt = (x) => {
      const x0 = this._xOf(this.win.t0);
      const x1 = this._xOf(this.win.t1);
      if (Math.abs(x - x0) <= EDGE_GRAB_PX) return 'start';
      if (Math.abs(x - x1) <= EDGE_GRAB_PX) return 'end';
      if (x > x0 && x < x1) return 'move';
      return 'pan';
    };
    const emit = (final) => {
      this._changed();
      this.onWindow(this.win.t0, this.win.t1, { final });
      if (final) this._say(`Window ${this.win.t0.toFixed(2)} to ${this.win.t1.toFixed(2)} seconds.`);
    };

    c.addEventListener('pointerdown', (e) => {
      if (!this.data || e.button > 0) return;
      const x = xOf(e);
      this.stopAnimation();
      this._drag = { part: inPlot(e) ? partAt(x) : 'pan', x, win: { ...this.win }, view: { ...this.view }, moved: false };
      c.setPointerCapture(e.pointerId);
      c.focus({ preventScroll: true });
    });
    c.addEventListener('pointermove', (e) => {
      if (!this.data) return;
      const x = xOf(e);
      const g = this._drag;
      if (g) {
        if (Math.abs(x - g.x) > 3) g.moved = true;
        if (g.moved) {
          const dSec = ((x - g.x) / c.clientWidth) * (g.view.to - g.view.from);
          if (g.part === 'pan') {
            this.view = this._clampView(g.view.from - dSec, g.view.to - dSec);
            this.draw();
          } else {
            let { t0, t1 } = g.win;
            if (g.part === 'move') { t0 += dSec; t1 += dSec; }
            if (g.part === 'start') t0 = Math.min(t0 + dSec, t1 - MIN_WIN);
            if (g.part === 'end') t1 = Math.max(t1 + dSec, t0 + MIN_WIN);
            this.win = clampWindow(t0, t1, this.full, MIN_WIN, MAX_WIN);
            emit(false);
          }
        }
      } else {
        const part = inPlot(e) ? partAt(x) : 'pan';
        c.style.cursor = { start: 'ew-resize', end: 'ew-resize', move: 'grab', pan: 'crosshair' }[part];
      }
      this.hoverSec = this._secOf(x);
      this.draw();
    });
    const end = (e) => {
      const g = this._drag;
      this._drag = null;
      if (!g) return;
      if (g.part === 'pan' && !g.moved && e.type === 'pointerup') {
        // a click on the strip: move the window to start there
        const t = this._secOf(xOf(e));
        const len = this.win.t1 - this.win.t0;
        this.win = clampWindow(t, t + len, this.full, MIN_WIN, MAX_WIN);
        emit(true);
      } else if (g.part !== 'pan' && g.moved) emit(true);
      this.draw();
    };
    c.addEventListener('pointerup', end);
    c.addEventListener('pointercancel', end);
    c.addEventListener('pointerleave', () => { this.hoverSec = null; this.draw(); });
    c.addEventListener('wheel', (e) => {
      if (!this.data) return;
      e.preventDefault();
      this.zoom(Math.exp(e.deltaY * 0.002), this._secOf(xOf(e)));
    }, { passive: false });
    c.addEventListener('keydown', (e) => {
      if (!this.data) return;
      const { t0, t1 } = this.win;
      const k = e.key;
      const step = e.shiftKey ? 0.5 : 0.05;
      const put = (a, b) => {
        this.stopAnimation();
        this.win = clampWindow(a, b, this.full, MIN_WIN, MAX_WIN);
        this._keepWindowInView();
        emit(true);
      };
      if (k === 'ArrowLeft') put(t0 - step, t1 - step);
      else if (k === 'ArrowRight') put(t0 + step, t1 + step);
      else if (k === '[') put(t0, Math.max(t0 + MIN_WIN, t1 - 0.05));
      else if (k === ']') put(t0, t1 + 0.05);
      else if (k === '+' || k === '=') this.zoom(1 / 1.5);
      else if (k === '-' || k === '_') this.zoom(1.5);
      else if (k === '0') this.resetZoom();
      else if (k === 'Enter' || k === ' ') { if (this._anim) this.stopAnimation(); else this.animate(); }
      else return;
      e.preventDefault();
    });
  }

  _wireAbove() {
    const c = this.above;
    const canGuess = () => this.show.guess && !this.show.lockGuess;
    const azAt = (e) => {
      const r = c.getBoundingClientRect();
      const x = e.clientX - r.left - c.clientLeft - c.clientWidth / 2;
      const y = c.clientHeight / 2 - (e.clientY - r.top - c.clientTop);
      return Math.hypot(x, y) < 6 ? null : Math.round(azimuthOf(x, y)) % 360; // too near the centre: no direction
    };
    const set = (az, final) => {
      if (az == null || (az === this.guess && !final)) return;
      this.setGuess(az);
      this.onGuess(this.guess, { final });
      if (final) this._say(`Your guess: ${fmtAz(this.guess)}.`);
    };
    let dragging = false;
    c.addEventListener('pointerdown', (e) => {
      if (!canGuess() || e.button > 0) return;
      dragging = true;
      c.setPointerCapture(e.pointerId);
      c.focus({ preventScroll: true });
      set(azAt(e), false);
      e.preventDefault();
    });
    c.addEventListener('pointermove', (e) => { if (dragging) set(azAt(e), false); });
    const end = (e) => {
      if (!dragging) return;
      dragging = false;
      if (this.guess != null) set(e.type === 'pointerup' ? (azAt(e) ?? this.guess) : this.guess, true);
    };
    c.addEventListener('pointerup', end);
    c.addEventListener('pointercancel', end);
    c.addEventListener('keydown', (e) => {
      if (!canGuess()) return;
      const step = e.shiftKey ? 10 : 1;
      const g = this.guess ?? 0;
      if (e.key === 'ArrowRight' || e.key === 'ArrowUp') set(this.guess == null ? 0 : g + step, true);
      else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') set(this.guess == null ? 0 : g - step, true);
      else if (e.key === 'Delete' || e.key === 'Backspace') {
        if (this.guess == null) return;
        this.setGuess(null);
        this.onGuess(null, { final: true });
        this._say('Guess cleared.');
      } else return;
      e.preventDefault();
    });
  }
}
