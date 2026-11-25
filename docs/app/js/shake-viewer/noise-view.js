// Hourly noise levels as bars, on a <canvas>: how hard the ground shook in each hour of the day
// (the median of the 1-minute RMS values in the hour, lib/carpet.js), in counts. Quiet nights,
// a busy school day and a loud evening stand out at a glance; the seismic carpet of the science
// page is many of these days stacked.
//
// The class's notes show as faint bands behind the bars (bells and buses next to the noise).
// How to use it is on the plot (D35): "Click a bar to look at that hour" ("Tap" on touch
// screens) in a pill above the bars, bold until used, then faint. Keyboard: Tab to the chart,
// left/right choose an hour, Enter opens it in the zoom panel.
import { niceStep } from '../lib/signal.js';
import { spanSegments, TIME_ZONE, HOUR_MS } from '../lib/day-view.js';

const TOP = 36; // the hint's strip
const BOTTOM = 22; // hour labels
const LEFT = 52;
const RIGHT = 8;
const KINDS = ['school', 'traffic', 'event', 'experiment', 'quake', 'weather', 'station', 'other'];

const fmtHour = new Intl.DateTimeFormat('en-US', { timeZone: TIME_ZONE, hour: 'numeric' });
const fmtSay = new Intl.DateTimeFormat('en-US', { timeZone: TIME_ZONE, hour: 'numeric', minute: '2-digit', timeZoneName: 'short' });

export class NoiseView {
  /**
   * @param {{canvas: HTMLCanvasElement, cue: HTMLElement, live: HTMLElement}} el
   * @param {{onPick?: (startMs:number)=>void}} [opt] an hour was clicked: its start
   */
  constructor({ canvas, cue, live }, opt = {}) {
    this.canvas = canvas;
    this.cue = cue;
    this.live = live;
    this.ctx = canvas.getContext('2d');
    this.onPick = opt.onPick || (() => {});
    this.levels = null; // Float64Array, one per hour
    this.startMs = 0;
    this.publicUntilMs = null;
    this.notes = [];
    this.unit = 'counts';
    this.hover = -1;
    this.cursor = -1;
    this.learned = false;
    this.touch = matchMedia('(pointer: coarse)').matches;
    this._frame = 0;
    canvas.tabIndex = 0;
    canvas.setAttribute('role', 'application');
    canvas.setAttribute('aria-roledescription', 'bar chart');
    this._readTheme();
    const onTheme = () => { this._readTheme(); this.draw(); };
    matchMedia('(prefers-color-scheme: dark)').addEventListener('change', onTheme);
    new MutationObserver(onTheme).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    new ResizeObserver(() => this.resize()).observe(canvas);
    this._wire();
    this._updateCue();
    this.resize();
  }

  /** @param {{levels: ArrayLike<number>, startMs: number, publicUntilMs?: number|null, unit?: string}} d */
  setData({ levels, startMs, publicUntilMs = null, unit = 'counts' }) {
    this.levels = Float64Array.from(levels);
    this.startMs = startMs;
    this.publicUntilMs = publicUntilMs;
    this.unit = unit;
    this.cursor = -1;
    this._updateCue();
    this.draw();
  }

  clear() { this.levels = null; this._updateCue(); this.draw(); }

  setNotes(notes) { this.notes = notes || []; this.draw(); }

  resize() {
    const dpr = window.devicePixelRatio || 1;
    const w = Math.max(200, this.canvas.clientWidth);
    const h = Math.max(120, this.canvas.clientHeight);
    if (this.canvas.width !== Math.round(w * dpr) || this.canvas.height !== Math.round(h * dpr)) {
      this.canvas.width = Math.round(w * dpr);
      this.canvas.height = Math.round(h * dpr);
    }
    this.draw();
  }

  _readTheme() {
    const s = getComputedStyle(this.canvas);
    const v = (name, fallback) => s.getPropertyValue(name).trim() || fallback;
    this._col = {
      bg: v('--trace-bg', '#fff'), bar: v('--accent', '#1d4ed8'), text: v('--muted', '#5b6472'),
      strong: v('--text', '#111827'), grid: v('--grid', '#e8ebef'), border: v('--border', '#d9dde3'),
      shade: v('--unpublished', 'rgba(120,120,120,.28)'),
    };
    this._kind = Object.fromEntries(KINDS.map((k) => [k, v(`--note-${k}`, '#7c3aed')]));
  }

  get _geom() {
    const w = this.canvas.clientWidth;
    const h = this.canvas.clientHeight;
    const n = this.levels?.length || 24;
    return { w, h, n, plotW: w - LEFT - RIGHT, plotH: h - TOP - BOTTOM, barW: (w - LEFT - RIGHT) / n };
  }

  draw() {
    if (this._frame) return;
    this._frame = requestAnimationFrame(() => { this._frame = 0; this._draw(); });
  }

  _draw() {
    const { ctx } = this;
    const dpr = window.devicePixelRatio || 1;
    const G = this._geom;
    const col = this._col;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = col.bg;
    ctx.fillRect(0, 0, G.w, G.h);
    ctx.font = '11px system-ui, sans-serif';
    if (!this.levels) {
      ctx.fillStyle = col.text;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('No record yet.', G.w / 2, G.h / 2);
      return;
    }
    const vals = [...this.levels].filter(Number.isFinite);
    const top = vals.length ? Math.max(...vals) * 1.1 : 1;
    const yOf = (v) => TOP + G.plotH - (v / top) * G.plotH;

    // note spans behind the bars (one "row" = the whole day)
    const day = [{ startMs: this.startMs, endMs: this.startMs + G.n * HOUR_MS }];
    for (const n of this.notes) {
      if (n.end == null) continue;
      ctx.fillStyle = this._kind[n.kind] || this._kind.other;
      ctx.globalAlpha = 0.18;
      for (const s of spanSegments(n.start, n.end, day, G.n * HOUR_MS)) {
        ctx.fillRect(LEFT + s.f0 * G.plotW, TOP, Math.max(1, (s.f1 - s.f0) * G.plotW), G.plotH);
      }
      ctx.globalAlpha = 1;
    }
    // y grid and labels
    const step = niceStep(top, 4);
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    for (let v = 0; v <= top; v += step) {
      const y = Math.round(yOf(v)) + 0.5;
      ctx.strokeStyle = col.grid;
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(LEFT, y); ctx.lineTo(G.w - RIGHT, y); ctx.stroke();
      ctx.fillStyle = col.text;
      ctx.fillText(v >= 100 ? v.toFixed(0) : v >= 10 ? v.toFixed(0) : v.toFixed(step < 1 ? 1 : 0), LEFT - 6, y);
    }
    ctx.save();
    ctx.translate(12, TOP + G.plotH / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.textAlign = 'center';
    ctx.fillText(this.unit, 0, 0);
    ctx.restore();

    // bars
    const pu = this.publicUntilMs;
    for (let i = 0; i < G.n; i++) {
      const x = LEFT + i * G.barW;
      const v = this.levels[i];
      const t0 = this.startMs + i * HOUR_MS;
      if (pu != null && t0 >= pu) { // not published yet
        ctx.fillStyle = col.shade;
        ctx.fillRect(x + 1, TOP, G.barW - 2, G.plotH);
        continue;
      }
      if (!Number.isFinite(v)) { // no data: a short gray dash
        ctx.fillStyle = col.border;
        ctx.fillRect(x + G.barW * 0.25, TOP + G.plotH - 2, G.barW * 0.5, 2);
        continue;
      }
      const sel = i === this.hover || i === this.cursor;
      ctx.fillStyle = col.bar;
      ctx.globalAlpha = sel ? 1 : 0.75;
      ctx.fillRect(x + Math.max(1, G.barW * 0.12), yOf(v), G.barW * 0.76, TOP + G.plotH - yOf(v));
      ctx.globalAlpha = 1;
      if (sel) {
        ctx.strokeStyle = col.strong;
        ctx.lineWidth = 1.5;
        ctx.strokeRect(x + 0.75, TOP + 0.75, G.barW - 1.5, G.plotH - 1.5);
      }
    }
    // hour labels every 3 hours (6 on narrow screens)
    const every = G.barW < 18 ? 6 : 3;
    ctx.fillStyle = col.text;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    for (let i = 0; i <= G.n; i += every) {
      const x = LEFT + i * G.barW;
      ctx.strokeStyle = col.border;
      ctx.beginPath(); ctx.moveTo(Math.round(x) + 0.5, TOP + G.plotH); ctx.lineTo(Math.round(x) + 0.5, TOP + G.plotH + 4); ctx.stroke();
      const label = fmtHour.format(new Date(this.startMs + i * HOUR_MS)).replace(' ', ' ');
      ctx.textAlign = i === 0 ? 'left' : i >= G.n ? 'right' : 'center';
      ctx.fillText(label, x, TOP + G.plotH + 5);
    }
    // readout of the chosen hour, right under the pill strip
    const k = this.hover >= 0 ? this.hover : this.cursor;
    if (k >= 0 && k < G.n) {
      const v = this.levels[k];
      const t = this.startMs + k * HOUR_MS;
      const text = `${fmtSay.format(new Date(t))}: ${Number.isFinite(v) ? `${v.toFixed(1)} ${this.unit}` : 'no data'}`;
      ctx.font = '600 12px system-ui, sans-serif';
      ctx.fillStyle = col.strong;
      ctx.textAlign = 'right';
      ctx.textBaseline = 'bottom';
      ctx.fillText(text, G.w - RIGHT, TOP - 4);
    }
  }

  _updateCue() {
    this.cue.hidden = !this.levels;
    this.cue.textContent = `${this.touch ? 'Tap' : 'Click'} a bar to look at that hour`;
    this.cue.classList.toggle('learned', this.learned);
    this.canvas.setAttribute('aria-label', 'Noise in each hour of the day. Left and right arrows choose an hour; Enter opens it.');
  }

  _barAt(e) {
    const r = this.canvas.getBoundingClientRect();
    const x = e.clientX - r.left;
    const y = e.clientY - r.top;
    const G = this._geom;
    if (x < LEFT || x > G.w - RIGHT || y < TOP - 4 || y > TOP + G.plotH + BOTTOM) return -1;
    return Math.min(G.n - 1, Math.floor((x - LEFT) / G.barW));
  }

  _open(i) {
    if (!this.levels || i < 0) return;
    this.learned = true;
    this._updateCue();
    this.onPick(this.startMs + i * HOUR_MS);
  }

  _wire() {
    const c = this.canvas;
    let down = null;
    c.addEventListener('pointerdown', (e) => { this.touch = e.pointerType === 'touch'; down = { x: e.clientX, y: e.clientY }; });
    c.addEventListener('pointerup', (e) => {
      if (!down) return;
      const moved = Math.hypot(e.clientX - down.x, e.clientY - down.y) > 8;
      down = null;
      if (!moved) this._open(this._barAt(e));
    });
    c.addEventListener('pointermove', (e) => {
      if (e.pointerType === 'touch') return;
      const i = this._barAt(e);
      if (i !== this.hover) { this.hover = i; this.draw(); }
    });
    c.addEventListener('pointerleave', () => { this.hover = -1; this.draw(); });
    c.addEventListener('keydown', (e) => {
      if (!this.levels) return;
      const n = this.levels.length;
      let i = this.cursor < 0 ? 0 : this.cursor;
      if (e.key === 'ArrowLeft') i = Math.max(0, i - 1);
      else if (e.key === 'ArrowRight') i = Math.min(n - 1, this.cursor < 0 ? 0 : i + 1);
      else if (e.key === 'Home') i = 0;
      else if (e.key === 'End') i = n - 1;
      else if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); this._open(i); return; }
      else return;
      e.preventDefault();
      this.cursor = i;
      const v = this.levels[i];
      this.live.textContent = `${fmtSay.format(new Date(this.startMs + i * HOUR_MS))}: ${Number.isFinite(v) ? `${v.toFixed(1)} ${this.unit}` : 'no data'}`;
      this.draw();
    });
    c.addEventListener('blur', () => { this.cursor = -1; this.draw(); });
  }
}
