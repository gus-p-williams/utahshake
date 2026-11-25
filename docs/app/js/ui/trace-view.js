// Waveform display on a <canvas>, with zoom, pan and P/S pick markers.
//
// One TraceView draws one or more traces (e.g. the Z, N, E components of a
// station) stacked on a shared time axis, in seconds after a reference time
// (the quake's origin time). Interactive views let students zoom (wheel or
// buttons), pan (drag) and set picks (click when a phase is armed, or hover
// and press P or S).
import { minMaxColumns, peakAbs, niceStep } from '../lib/signal.js';

const AXIS_H = 22;

function cssVar(el, name, fallback) {
  const v = getComputedStyle(el).getPropertyValue(name).trim();
  return v || fallback;
}

export class TraceView {
  /**
   * @param {HTMLCanvasElement} canvas
   * @param {object} [opt]
   * @param {boolean} [opt.interactive=false]
   * @param {boolean} [opt.axis=true]
   * @param {(phase:'P'|'S', ms:number)=>void} [opt.onPick]
   * @param {(armed:'P'|'S'|null)=>void} [opt.onArm]
   * @param {string} [opt.axisUnit='s after origin'] time-axis unit on wide screens ('s' on narrow)
   */
  constructor(canvas, opt = {}) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.interactive = !!opt.interactive;
    this.axis = opt.axis ?? true;
    this.axisUnit = opt.axisUnit ?? 's after origin';
    this.onPick = opt.onPick || (() => {});
    this.onArm = opt.onArm || (() => {});
    this.traces = [];
    this.refMs = 0;
    this.full = { from: 0, to: 1 };
    this.view = { from: 0, to: 1 };
    this.picks = {};
    this.analyst = null;
    this.armed = null;
    this.hoverSec = null;
    this._frame = 0;

    new ResizeObserver(() => this.resize()).observe(canvas);
    this.resize();
    if (this.interactive) this._wire();
  }

  /**
   * @param {Array<{label:string, data:Float32Array, startMs:number, sampleRate:number}>} traces
   * @param {number} refMs time shown as 0 on the axis
   * @param {number} fromSec window start, seconds after refMs
   * @param {number} toSec window end
   */
  setData(traces, refMs, fromSec, toSec, keepView = false) {
    this.traces = traces;
    this.refMs = refMs;
    this.full = { from: fromSec, to: toSec };
    if (!keepView) this.view = { ...this.full };
    this.draw();
  }

  setPicks(picks) { this.picks = picks || {}; this.draw(); }

  setAnalyst(a) { this.analyst = a; this.draw(); }

  arm(phase) {
    this.armed = phase;
    this.canvas.classList.toggle('armed', !!phase);
    this.onArm(phase);
    this.draw();
  }

  resetZoom() { this.view = { ...this.full }; this.draw(); }

  zoom(factor, centerSec) {
    const { from, to } = this.view;
    const c = centerSec ?? (from + to) / 2;
    const minSpan = 0.5;
    const maxSpan = this.full.to - this.full.from;
    const span = Math.min(maxSpan, Math.max(minSpan, (to - from) * factor));
    const f = (c - from) / (to - from);
    this._setView(c - f * span, c - f * span + span);
  }

  pan(dSec) { this._setView(this.view.from + dSec, this.view.to + dSec); }

  _setView(from, to) {
    const span = to - from;
    if (from < this.full.from) { from = this.full.from; to = from + span; }
    if (to > this.full.to) { to = this.full.to; from = to - span; }
    this.view = { from: Math.max(from, this.full.from), to: Math.min(to, this.full.to) };
    this.draw();
  }

  resize() {
    const dpr = window.devicePixelRatio || 1;
    const w = Math.max(50, this.canvas.clientWidth);
    const h = Math.max(30, this.canvas.clientHeight);
    if (this.canvas.width !== Math.round(w * dpr) || this.canvas.height !== Math.round(h * dpr)) {
      this.canvas.width = Math.round(w * dpr);
      this.canvas.height = Math.round(h * dpr);
    }
    this.draw();
  }

  // --- coordinates -------------------------------------------------------
  get _w() { return this.canvas.clientWidth; }
  get _plotH() { return this.canvas.clientHeight - (this.axis ? AXIS_H : 0); }
  _xOf(sec) { return ((sec - this.view.from) / (this.view.to - this.view.from)) * this._w; }
  _secOf(x) { return this.view.from + (x / this._w) * (this.view.to - this.view.from); }
  _msOf(sec) { return this.refMs + sec * 1000; }
  _secOfMs(ms) { return (ms - this.refMs) / 1000; }

  // --- drawing -----------------------------------------------------------
  draw() {
    if (this._frame) return;
    this._frame = requestAnimationFrame(() => { this._frame = 0; this._draw(); });
  }

  _draw() {
    const { ctx, canvas } = this;
    const dpr = window.devicePixelRatio || 1;
    const w = this._w;
    const plotH = this._plotH;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const col = {
      bg: cssVar(canvas, '--trace-bg', '#fff'),
      trace: cssVar(canvas, '--trace', '#1f2937'),
      grid: cssVar(canvas, '--grid', '#e5e7eb'),
      text: cssVar(canvas, '--muted', '#6b7280'),
      p: cssVar(canvas, '--pick-p', '#2563eb'),
      s: cssVar(canvas, '--pick-s', '#dc2626'),
    };
    ctx.fillStyle = col.bg;
    ctx.fillRect(0, 0, w, canvas.clientHeight);
    const span = this.view.to - this.view.from;

    // vertical grid + axis labels
    const step = niceStep(span, Math.max(3, Math.floor(w / 90)));
    ctx.font = '11px system-ui, sans-serif';
    ctx.textBaseline = 'top';
    const unit = w > 480 ? this.axisUnit : 's';
    const unitLeft = w - 4 - ctx.measureText(unit).width;
    for (let t = Math.ceil(this.view.from / step) * step; t <= this.view.to; t += step) {
      const x = Math.round(this._xOf(t)) + 0.5;
      ctx.strokeStyle = col.grid;
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, plotH); ctx.stroke();
      if (this.axis) {
        const label = step < 1 ? t.toFixed(step < 0.1 ? 2 : 1) : String(Math.round(t));
        const half = ctx.measureText(label).width / 2;
        if (x - half < 0 || x + half > unitLeft - 6) continue; // keep labels apart
        ctx.fillStyle = col.text;
        ctx.textAlign = 'center';
        ctx.fillText(label, x, plotH + 4);
      }
    }
    if (this.axis) {
      ctx.fillStyle = col.text;
      ctx.textAlign = 'right';
      ctx.fillText(unit, w - 4, plotH + 4);
    }

    // traces
    const n = this.traces.length || 1;
    const trackH = plotH / n;
    this.traces.forEach((tr, k) => {
      const y0 = k * trackH + trackH / 2;
      const sr = tr.sampleRate;
      const i0 = Math.floor((this._msOf(this.view.from) - tr.startMs) / 1000 * sr);
      const i1 = Math.ceil((this._msOf(this.view.to) - tr.startMs) / 1000 * sr) + 1;
      const amp = peakAbs(tr.data, i0, i1) || 1;
      const scale = (trackH / 2 - 3) / amp;
      ctx.strokeStyle = col.trace;
      ctx.lineWidth = 1;
      ctx.beginPath();
      const samplesPerPx = (i1 - i0) / w;
      if (samplesPerPx > 2) {
        const cols = Math.floor(w);
        const { min, max } = minMaxColumns(tr.data, i0, i1, cols);
        let pen = false;
        for (let c = 0; c < cols; c++) {
          if (Number.isNaN(min[c])) { pen = false; continue; }
          const yA = y0 - max[c] * scale;
          const yB = y0 - min[c] * scale;
          if (!pen) { ctx.moveTo(c + 0.5, yA); pen = true; } else ctx.lineTo(c + 0.5, yA);
          ctx.lineTo(c + 0.5, yB);
        }
      } else {
        let pen = false;
        for (let i = Math.max(0, i0); i < Math.min(tr.data.length, i1); i++) {
          const v = tr.data[i];
          if (Number.isNaN(v)) { pen = false; continue; }
          const x = this._xOf(this._secOfMs(tr.startMs + (i * 1000) / sr));
          const y = y0 - v * scale;
          if (!pen) { ctx.moveTo(x, y); pen = true; } else ctx.lineTo(x, y);
        }
      }
      ctx.stroke();
      if (tr.label) {
        ctx.fillStyle = col.text;
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
        ctx.fillText(tr.label, 4, k * trackH + 3);
      }
      if (k > 0) {
        ctx.strokeStyle = col.grid;
        ctx.beginPath(); ctx.moveTo(0, k * trackH + 0.5); ctx.lineTo(w, k * trackH + 0.5); ctx.stroke();
      }
    });
    if (!this.traces.length) {
      ctx.fillStyle = col.text;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('No data', w / 2, plotH / 2);
    }

    // picks
    const marker = (ms, color, label, dashed, lift = 0) => {
      if (ms == null) return;
      const x = this._xOf(this._secOfMs(ms));
      if (x < -2 || x > w + 2) return;
      ctx.save();
      ctx.strokeStyle = color;
      ctx.lineWidth = dashed ? 1.5 : 2;
      if (dashed) ctx.setLineDash([5, 4]);
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, plotH); ctx.stroke();
      ctx.restore();
      if (this.axis || !dashed) {
        ctx.font = 'bold 12px system-ui, sans-serif';
        ctx.fillStyle = color;
        ctx.textAlign = 'left';
        ctx.textBaseline = dashed ? 'bottom' : 'top';
        ctx.fillText(label, x + 3, dashed ? plotH - 2 - lift : 2);
      }
    };
    if (this.analyst) {
      marker(this.analyst.P, col.p, 'P (UUSS)', true, 15);
      marker(this.analyst.S, col.s, 'S (UUSS)', true, 0);
    }
    marker(this.picks.P, col.p, 'P', false);
    marker(this.picks.S, col.s, 'S', false);

    // hover line
    if (this.interactive && this.hoverSec != null) {
      const x = this._xOf(this.hoverSec);
      ctx.strokeStyle = this.armed === 'P' ? col.p : this.armed === 'S' ? col.s : col.text;
      ctx.lineWidth = 1;
      ctx.setLineDash([2, 3]);
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, plotH); ctx.stroke();
      ctx.setLineDash([]);
      ctx.font = '11px system-ui, sans-serif';
      ctx.fillStyle = col.text;
      ctx.textAlign = x > w - 70 ? 'right' : 'left';
      ctx.textBaseline = 'bottom';
      ctx.fillText(`${this.hoverSec.toFixed(2)} s`, x + (x > w - 70 ? -4 : 4), plotH - 2);
    }
  }

  // --- interaction ---------------------------------------------------------
  _wire() {
    const c = this.canvas;
    c.tabIndex = 0;
    let down = null;
    const xOf = (e) => e.clientX - c.getBoundingClientRect().left;

    c.addEventListener('pointerdown', (e) => {
      down = { x: xOf(e), from: this.view.from, to: this.view.to, moved: false };
      c.setPointerCapture(e.pointerId);
      c.focus({ preventScroll: true });
    });
    c.addEventListener('pointermove', (e) => {
      const x = xOf(e);
      if (down) {
        const dx = x - down.x;
        if (Math.abs(dx) > 4) down.moved = true;
        if (down.moved) {
          const dSec = (-dx / this._w) * (down.to - down.from);
          this.view = { from: down.from, to: down.to };
          this._setView(down.from + dSec, down.to + dSec);
        }
      }
      this.hoverSec = this._secOf(x);
      this.draw();
    });
    c.addEventListener('pointerup', (e) => {
      if (down && !down.moved && this.armed) {
        const phase = this.armed;
        this.onPick(phase, this._msOf(this._secOf(xOf(e))));
      }
      down = null;
    });
    c.addEventListener('pointerleave', () => { this.hoverSec = null; this.draw(); });
    c.addEventListener('wheel', (e) => {
      e.preventDefault();
      const factor = Math.exp(e.deltaY * 0.002);
      this.zoom(factor, this._secOf(xOf(e)));
    }, { passive: false });
    c.addEventListener('dblclick', () => this.resetZoom());
    c.addEventListener('keydown', (e) => {
      const k = e.key.toLowerCase();
      const span = this.view.to - this.view.from;
      if ((k === 'p' || k === 's') && this.hoverSec != null) {
        this.onPick(k.toUpperCase(), this._msOf(this.hoverSec));
      } else if (k === '+' || k === '=') this.zoom(1 / 1.5, this.hoverSec ?? undefined);
      else if (k === '-' || k === '_') this.zoom(1.5, this.hoverSec ?? undefined);
      else if (k === 'arrowleft') this.pan(-span * 0.2);
      else if (k === 'arrowright') this.pan(span * 0.2);
      else if (k === '0') this.resetZoom();
      else if (k === 'escape') this.arm(null);
      else return;
      e.preventDefault();
    });
  }
}
