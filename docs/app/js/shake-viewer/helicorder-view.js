// The School Shake Viewer's 24-hour helicorder, on a <canvas>.
//
// A day of record cut into lines and read like a book: left to right, then the next line down
// (lib/helicorder.js explains the drum and pen). Times down the left are local (Mountain time);
// the axis under the lines counts minutes into each line.
//
// Drawn on it: the class's notes (a span is a colored band behind the trace, a moment is a
// tick; a quake also gets small P and S marks where its waves should arrive), the part of the
// day not yet published (shaded, "not published yet"), and the window open in the zoom panel
// (outlined).
//
// How to use it is shown on the plot itself (D35): a blue pill in the strip above the first
// line, which never covers the record: "Click a line to zoom in" ("Tap" on touch screens), bold
// until it has been used, then faint; "Click the line where your note goes" while a note is
// being placed; "Arrow keys move · Enter zooms in" once the keyboard is used. Keyboard: Tab to
// the plot, arrows move a cursor (left/right one minute, Shift five; up/down one line), Enter
// zooms in (or places the note), Escape stops placing a note. A hidden status line tells screen
// readers where the cursor is.
import { helicorderRows, rowColumns, penOffset } from '../lib/helicorder.js';
import { timeAtPoint, pointAtTime, spanSegments, TIME_ZONE } from '../lib/day-view.js';
import { niceStep } from '../lib/signal.js';

const TOP = 38; // px above the first line: the hint pill's strip
const BOTTOM = 24; // px under the last line: the minutes axis
const RIGHT = 8;
const KINDS = ['school', 'traffic', 'event', 'experiment', 'quake', 'weather', 'station', 'other'];

const fmtRow = new Intl.DateTimeFormat('en-US', { timeZone: TIME_ZONE, hour: 'numeric', minute: '2-digit' });
const fmtRowShort = new Intl.DateTimeFormat('en-US', { timeZone: TIME_ZONE, hour: 'numeric' });
const fmtSay = new Intl.DateTimeFormat('en-US', { timeZone: TIME_ZONE, hour: 'numeric', minute: '2-digit', timeZoneName: 'short' });

export class HelicorderView {
  /**
   * @param {{canvas: HTMLCanvasElement, cue: HTMLElement, live: HTMLElement}} el
   *   the canvas, the hint pill over its top strip, and a visually hidden status line
   * @param {object} [opt]
   * @param {(ms:number)=>void} [opt.onZoom] a line was clicked (or Enter pressed) at this moment
   * @param {(ms:number)=>void} [opt.onAddNote] same, while a note is being placed
   * @param {()=>void} [opt.onCancelAdd] Escape while a note is being placed
   * @param {(info:{ms:number}|null)=>void} [opt.onHover] the moment under the pointer or cursor
   */
  constructor({ canvas, cue, live }, opt = {}) {
    this.canvas = canvas;
    this.cue = cue;
    this.live = live;
    this.ctx = canvas.getContext('2d');
    this.onZoom = opt.onZoom || (() => {});
    this.onAddNote = opt.onAddNote || (() => {});
    this.onCancelAdd = opt.onCancelAdd || (() => {});
    this.onHover = opt.onHover || (() => {});
    this.rec = null; // {data, dataStartMs, sampleRate, startMs, endMs, rowSec, countsPerLine, publicUntilMs}
    this.rows = [];
    this.notes = [];
    this.zoom = null;
    this.hoverMs = null;
    this.cursorMs = null;
    this.addMode = false;
    this.learned = false;
    this.keyboard = false;
    this.touch = matchMedia('(pointer: coarse)').matches;
    this._image = null;
    this._frame = 0;

    canvas.tabIndex = 0;
    canvas.setAttribute('role', 'application');
    canvas.setAttribute('aria-roledescription', 'helicorder');
    this._readTheme();
    const onTheme = () => { this._readTheme(); this._image = null; this.draw(); };
    matchMedia('(prefers-color-scheme: dark)').addEventListener('change', onTheme);
    new MutationObserver(onTheme).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    new ResizeObserver(() => this.resize()).observe(canvas);
    this._wire();
    this._updateCue();
    this.resize();
  }

  /**
   * Show a record.
   * @param {object} r
   * @param {Float32Array} r.data the record to draw (already filtered), NaN where missing
   * @param {number} r.dataStartMs time of data[0]
   * @param {number} r.sampleRate
   * @param {number} r.startMs start of the first line
   * @param {number} r.endMs end of the last line
   * @param {number} r.rowSec seconds per line
   * @param {number} r.countsPerLine counts that move the pen one line spacing
   * @param {number|null} [r.publicUntilMs] data after this are not published yet (shaded)
   */
  setData(r) {
    this.rec = { publicUntilMs: null, ...r };
    this.rows = helicorderRows(r.startMs, r.endMs, r.rowSec);
    if (this.cursorMs != null && (this.cursorMs < r.startMs || this.cursorMs >= r.endMs)) this.cursorMs = null;
    this._image = null;
    this._updateCue();
    this.resize();
  }

  /** No record (before anything is loaded). */
  clear() { this.rec = null; this.rows = []; this._image = null; this._updateCue(); this.resize(); }

  /** Change the pen's scale (counts per line spacing). */
  setCountsPerLine(cpl) { if (this.rec) { this.rec.countsPerLine = cpl; this._image = null; this.draw(); } }

  /** Notes to draw ({start, end, kind, p, s} in ms; see lib/day-view.js). */
  setNotes(notes) { this.notes = notes || []; this.draw(); }

  /** The window open in the zoom panel, outlined; null for none. */
  setZoom(win) { this.zoom = win; this.draw(); }

  /** Placing a note: the next click (or Enter) gives its time. */
  setAddMode(on) { this.addMode = !!on; this.canvas.classList.toggle('adding', this.addMode); this._updateCue(); this.draw(); }

  // --- layout ----------------------------------------------------------------------------
  _layout() {
    const w = Math.max(200, this.canvas.clientWidth);
    const narrow = w < 560;
    const left = narrow ? 44 : 70;
    const many = this.rows.length > 60;
    const rowH = many ? (narrow ? 6 : 9) : (narrow ? 10 : 15);
    return { w, narrow, left, top: TOP, plotW: w - left - RIGHT, rowH, rowMs: (this.rec?.rowSec ?? 1800) * 1000, rows: this.rows };
  }

  resize() {
    const L = this._layout();
    const h = this.rows.length ? TOP + this.rows.length * L.rowH + BOTTOM : 160;
    if (this.canvas.style.height !== `${h}px`) this.canvas.style.height = `${h}px`;
    const dpr = window.devicePixelRatio || 1;
    const W = Math.round(L.w * dpr);
    const H = Math.round(h * dpr);
    if (this.canvas.width !== W || this.canvas.height !== H) {
      this.canvas.width = W;
      this.canvas.height = H;
      this._image = null;
    }
    this.draw();
  }

  _readTheme() {
    const s = getComputedStyle(this.canvas);
    const v = (name, fallback) => s.getPropertyValue(name).trim() || fallback;
    this._col = {
      bg: v('--trace-bg', '#fff'), trace: v('--trace', '#1f2937'), alt: v('--heli-alt', '#1d4ed8'),
      text: v('--muted', '#5b6472'), strong: v('--text', '#111827'), grid: v('--grid', '#e8ebef'),
      border: v('--border', '#d9dde3'), accent: v('--accent', '#1d4ed8'), p: v('--pick-p', '#1d4ed8'),
      s: v('--pick-s', '#c0262d'), shade: v('--unpublished', 'rgba(120,120,120,.28)'),
      zoom: v('--zoom-fill', 'rgba(250, 204, 21, .35)'),
    };
    this._kind = Object.fromEntries(KINDS.map((k) => [k, v(`--note-${k}`, '#7c3aed')]));
  }

  // --- drawing ---------------------------------------------------------------------------
  draw() {
    if (this._frame) return;
    this._frame = requestAnimationFrame(() => { this._frame = 0; this._draw(); });
  }

  /** The record's lines, drawn once per size, theme, record and scale (not on every hover). */
  _traceImage(L) {
    const dpr = window.devicePixelRatio || 1;
    const key = `${this.canvas.width}x${this.canvas.height}`;
    if (this._image?.key === key) return this._image.canvas;
    const off = document.createElement('canvas');
    off.width = this.canvas.width;
    off.height = this.canvas.height;
    const g = off.getContext('2d');
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    const { data, dataStartMs, sampleRate, countsPerLine } = this.rec;
    const nCols = Math.max(10, Math.round(L.plotW));
    this.rows.forEach((row, i) => {
      // a short last line is drawn at the same scale as the others
      const cols = Math.max(1, Math.round((nCols * (row.endMs - row.startMs)) / L.rowMs));
      const { min, max } = rowColumns(data, sampleRate, dataStartMs, row, cols);
      const yc = L.top + i * L.rowH + L.rowH / 2;
      g.strokeStyle = i % 2 ? this._col.alt : this._col.trace;
      g.lineWidth = 1;
      g.beginPath();
      for (let c = 0; c < cols; c++) {
        if (Number.isNaN(min[c])) continue;
        const x = L.left + c + 0.5;
        const y1 = yc - penOffset(max[c], countsPerLine) * L.rowH;
        const y2 = yc - penOffset(min[c], countsPerLine) * L.rowH;
        g.moveTo(x, y1);
        g.lineTo(x, Math.max(y2, y1 + 1));
      }
      g.stroke();
    });
    this._image = { key, canvas: off };
    return off;
  }

  _xOf(L, f) { return L.left + f * L.plotW; }

  _draw() {
    const { ctx } = this;
    const dpr = window.devicePixelRatio || 1;
    const L = this._layout();
    const H = this.canvas.clientHeight;
    const col = this._col;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = col.bg;
    ctx.fillRect(0, 0, L.w, H);
    ctx.font = '11px system-ui, sans-serif';
    if (!this.rec) {
      ctx.fillStyle = col.text;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('No record yet: choose where the data come from, above.', L.w / 2, H / 2);
      return;
    }

    // line labels (local time) and faint baselines
    const labelEvery = L.rowH >= 13 ? 1 : Math.max(1, Math.ceil(13 / L.rowH));
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    this.rows.forEach((row, i) => {
      const yc = L.top + i * L.rowH + L.rowH / 2;
      ctx.strokeStyle = col.grid;
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(L.left, Math.round(yc) + 0.5); ctx.lineTo(L.left + L.plotW, Math.round(yc) + 0.5); ctx.stroke();
      if (i % labelEvery) return;
      const d = new Date(row.startMs);
      const onHour = new Date(row.startMs).getUTCMinutes() === 0;
      if (L.narrow && !onHour) return;
      ctx.fillStyle = onHour ? col.strong : col.text;
      ctx.fillText((L.narrow ? fmtRowShort : fmtRow).format(d).replace(' ', ' '), L.left - 6, yc);
    });

    // note spans, behind the trace
    for (const n of this.notes) {
      if (n.end == null) continue;
      ctx.fillStyle = this._kind[n.kind] || this._kind.other;
      ctx.globalAlpha = 0.2;
      for (const s of spanSegments(n.start, n.end, this.rows, L.rowMs)) {
        ctx.fillRect(this._xOf(L, s.f0), L.top + s.row * L.rowH, Math.max(1, (s.f1 - s.f0) * L.plotW), L.rowH);
      }
      ctx.globalAlpha = 1;
    }

    ctx.drawImage(this._traceImage(L), 0, 0, L.w, H);

    // not published yet
    const pu = this.rec.publicUntilMs;
    if (pu != null && pu < this.rec.endMs) {
      const segs = spanSegments(Math.max(pu, this.rec.startMs), this.rec.endMs, this.rows, L.rowMs);
      ctx.fillStyle = col.shade;
      for (const s of segs) ctx.fillRect(this._xOf(L, s.f0), L.top + s.row * L.rowH, (s.f1 - s.f0) * L.plotW, L.rowH);
      const first = segs[0];
      if (first) {
        ctx.fillStyle = col.strong;
        ctx.textAlign = first.f0 > 0.75 ? 'right' : 'left';
        ctx.textBaseline = 'middle';
        const x = first.f0 > 0.75 ? this._xOf(L, first.f0) - 4 : this._xOf(L, first.f0) + 4;
        const y = L.top + first.row * L.rowH + L.rowH / 2;
        const label = `not published yet (data up to ${fmtSay.format(new Date(pu))})`;
        ctx.save();
        ctx.strokeStyle = col.bg;
        ctx.lineWidth = 3;
        ctx.strokeText(label, x, y);
        ctx.fillText(label, x, y);
        ctx.restore();
      }
    }

    // spans again, as a solid strip along the top of each line they cover (seen over a busy trace)
    for (const n of this.notes) {
      if (n.end == null) continue;
      ctx.fillStyle = this._kind[n.kind] || this._kind.other;
      for (const s of spanSegments(n.start, n.end, this.rows, L.rowMs)) {
        ctx.fillRect(this._xOf(L, s.f0), L.top + s.row * L.rowH, Math.max(2, (s.f1 - s.f0) * L.plotW), Math.max(2, L.rowH * 0.2));
      }
    }

    // note moments: a tick; quakes also get P and S marks
    for (const n of this.notes) {
      const color = this._kind[n.kind] || this._kind.other;
      const ticks = [{ ms: n.start, color, w: 3, label: null }];
      if (n.end != null) ticks.push({ ms: n.end, color, w: 1.5, label: null });
      if (n.p != null) ticks.push({ ms: n.p, color: col.p, w: 1.5, label: 'P' });
      if (n.s != null) ticks.push({ ms: n.s, color: col.s, w: 1.5, label: 'S' });
      for (const t of ticks) {
        const p = pointAtTime(t.ms, this.rows, L.rowMs);
        if (!p) continue;
        const x = Math.round(this._xOf(L, p.f)) + 0.5;
        const y0 = L.top + p.row * L.rowH;
        ctx.strokeStyle = t.color;
        ctx.lineWidth = t.w;
        ctx.beginPath(); ctx.moveTo(x, y0 - 3); ctx.lineTo(x, y0 + L.rowH + 3); ctx.stroke();
        if (!t.label && t.w > 2) { // the start of a note: a flag, outlined so it shows on any trace
          ctx.fillStyle = t.color;
          ctx.strokeStyle = col.bg;
          ctx.lineWidth = 1;
          ctx.beginPath(); ctx.moveTo(x, y0 - 5); ctx.lineTo(x + 9, y0 - 1); ctx.lineTo(x, y0 + 3); ctx.closePath(); ctx.fill(); ctx.stroke();
        }
        if (t.label && L.rowH >= 9) {
          ctx.font = 'bold 10px system-ui, sans-serif';
          ctx.fillStyle = t.color;
          ctx.textAlign = 'left';
          ctx.textBaseline = 'top';
          ctx.fillText(t.label, x + 2, y0 - 1);
          ctx.font = '11px system-ui, sans-serif';
        }
      }
    }

    // the zoom window
    if (this.zoom) {
      for (const s of spanSegments(this.zoom.startMs, this.zoom.endMs, this.rows, L.rowMs)) {
        const x = this._xOf(L, s.f0);
        const y = L.top + s.row * L.rowH - 2;
        const w = Math.max(3, (s.f1 - s.f0) * L.plotW);
        ctx.fillStyle = col.zoom;
        ctx.fillRect(x, y, w, L.rowH + 4);
        ctx.strokeStyle = col.strong;
        ctx.lineWidth = 2;
        ctx.strokeRect(x, y, w, L.rowH + 4);
      }
    }

    // pointer and keyboard cursor
    for (const [ms, dashed] of [[this.hoverMs, true], [this.cursorMs, false]]) {
      if (ms == null) continue;
      const p = pointAtTime(ms, this.rows, L.rowMs);
      if (!p) continue;
      const x = Math.round(this._xOf(L, p.f)) + 0.5;
      const y0 = L.top + p.row * L.rowH;
      ctx.strokeStyle = this.addMode ? col.accent : col.strong;
      ctx.lineWidth = dashed ? 1 : 2;
      ctx.setLineDash(dashed ? [2, 2] : []);
      ctx.beginPath(); ctx.moveTo(x, y0 - 4); ctx.lineTo(x, y0 + L.rowH + 4); ctx.stroke();
      ctx.setLineDash([]);
    }

    // minutes into each line
    const rowMin = L.rowMs / 60000;
    const step = niceStep(rowMin, L.narrow ? 4 : 7);
    const yAxis = L.top + this.rows.length * L.rowH + 4;
    ctx.fillStyle = col.text;
    ctx.strokeStyle = col.border;
    ctx.lineWidth = 1;
    ctx.textBaseline = 'top';
    for (let m = 0; m <= rowMin + 1e-9; m += step) {
      const x = Math.round(this._xOf(L, m / rowMin)) + 0.5;
      ctx.beginPath(); ctx.moveTo(x, yAxis - 4); ctx.lineTo(x, yAxis); ctx.stroke();
      ctx.textAlign = m === 0 ? 'left' : m >= rowMin - 1e-9 ? 'right' : 'center';
      ctx.fillText(m >= rowMin - 1e-9 ? `${m} min` : String(m), x, yAxis + 1);
    }
  }

  // --- the hint and the status line ------------------------------------------------------
  _updateCue() {
    const c = this.cue;
    c.hidden = !this.rec;
    const tap = this.touch ? 'Tap' : 'Click';
    let text;
    if (this.addMode) text = this.keyboard ? 'Arrow keys move · Enter places the note · Esc cancels' : `${tap} the line where your note goes`;
    else if (this.keyboard) text = 'Arrow keys move · Shift: 5 minutes · Enter zooms in';
    else text = `${tap} a line to zoom in`;
    c.textContent = text;
    c.classList.toggle('learned', this.learned && !this.addMode);
    c.classList.toggle('adding', this.addMode);
    this.canvas.setAttribute('aria-label', `24-hour helicorder, local time. ${text}.`);
  }

  _say(ms) {
    const p = pointAtTime(ms, this.rows, this._layout().rowMs);
    this.live.textContent = p ? `${fmtSay.format(new Date(ms))}, line ${p.row + 1} of ${this.rows.length}` : '';
  }

  _use(ms) {
    this.learned = true;
    if (this.addMode) this.onAddNote(ms); else this.onZoom(ms);
    this._updateCue();
  }

  // --- interaction -----------------------------------------------------------------------
  _hit(e) {
    const r = this.canvas.getBoundingClientRect();
    return timeAtPoint(e.clientX - r.left, e.clientY - r.top, this._layout());
  }

  _wire() {
    const c = this.canvas;
    let down = null;
    c.addEventListener('pointerdown', (e) => {
      if (!this.rec) return;
      this.touch = e.pointerType === 'touch';
      down = { x: e.clientX, y: e.clientY };
    });
    c.addEventListener('pointerup', (e) => {
      if (!down || !this.rec) return;
      const moved = Math.hypot(e.clientX - down.x, e.clientY - down.y) > 8;
      down = null;
      if (moved) return; // a scroll or a drag, not a click
      const hit = this._hit(e);
      if (!hit) return;
      this.keyboard = false;
      this.cursorMs = null;
      this._use(hit.ms);
    });
    c.addEventListener('pointermove', (e) => {
      if (!this.rec || e.pointerType === 'touch') return;
      const hit = this._hit(e);
      const ms = hit ? hit.ms : null;
      if (ms === this.hoverMs) return;
      this.hoverMs = ms;
      this.onHover(hit ? { ms } : null);
      this.draw();
    });
    c.addEventListener('pointerleave', () => { this.hoverMs = null; this.onHover(null); this.draw(); });
    c.addEventListener('keydown', (e) => {
      if (!this.rec) return;
      const { startMs, endMs } = this.rec;
      const rowMs = this._layout().rowMs;
      let ms = this.cursorMs ?? (this.zoom ? (this.zoom.startMs + this.zoom.endMs) / 2 : startMs);
      const k = e.key;
      if (k === 'ArrowLeft') ms -= (e.shiftKey ? 300 : 60) * 1000;
      else if (k === 'ArrowRight') ms += (e.shiftKey ? 300 : 60) * 1000;
      else if (k === 'ArrowUp') ms -= rowMs;
      else if (k === 'ArrowDown') ms += rowMs;
      else if (k === 'Home') ms = startMs;
      else if (k === 'End') ms = endMs - 1000;
      else if (k === 'Enter' || k === ' ') { e.preventDefault(); this.keyboard = true; this.cursorMs = ms; this._use(ms); return; }
      else if (k === 'Escape' && this.addMode) { e.preventDefault(); this.onCancelAdd(); return; }
      else return;
      e.preventDefault();
      this.keyboard = true;
      this.cursorMs = Math.max(startMs, Math.min(endMs - 1, ms));
      this._updateCue();
      this._say(this.cursorMs);
      this.onHover({ ms: this.cursorMs });
      this.draw();
    });
    c.addEventListener('blur', () => { if (this.cursorMs != null) { this.cursorMs = null; this.draw(); } });
  }
}
