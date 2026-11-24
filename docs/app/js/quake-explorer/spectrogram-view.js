// Spectrogram on a <canvas>: time runs across, frequency (pitch) runs up, and
// the colour says how strong each note is, in dB (dark = quiet, yellow = loud).
//
// It is drawn to line up with a TraceView above it: the plot spans the full
// canvas width and the time axis uses the same "seconds after origin" as
// TraceView (refMs, fromSec, toSec), so a moment in the waveform sits right
// above the same moment here. Keep the two in step with setView, or with
// followTraceView() below.
//
// Students drag up or down on it to choose a band of notes [lo, hi] Hz; the
// page uses that band as the filter (onBand). The plot itself says so: a hint
// at the top ("↕ Drag up or down…") until the student first changes the band,
// then the band in Hz; grips on the band's edges; a resize cursor. With no band
// (all notes, after a double-click or Escape) the hint comes back. Without
// onBand (or with selectBand: false) the view is look-only. setCursor draws the
// moving line while the sound plays.
import { niceStep } from '../lib/signal.js';
import { dbRange } from '../lib/spectral.js';

const AXIS_H = 22; // time axis height, same as TraceView
const LEGEND_H = 30; // colour bar row under the time axis
/** How close (px) to a band edge counts as grabbing it: a finger is less exact than a mouse. */
const EDGE_GRAB_PX = Object.freeze({ mouse: 7, pen: 10, touch: 16 });
const GRIP = { w: 36, h: 12 }; // the handle drawn on each band edge, px
const LABEL = { h: 21, pad: 9, top: 4, side: 30 }; // the hint / band label at the top, px

/** Grab distance (px) for a pointer type ('mouse', 'pen', 'touch'; anything else counts as a mouse). */
export function edgeGrabPx(pointerType) {
  return EDGE_GRAB_PX[pointerType] ?? EDGE_GRAB_PX.mouse;
}

/**
 * Which band edge a pointer at height y grabs: 'hi' (the top edge), 'lo' (the bottom
 * edge) or null. Heights are in px from the top of the plot, so yHi <= yLo. When both
 * edges are in reach (a thin band), the nearer one wins; on a tie, a pointer below the
 * band takes the bottom edge and any other the top.
 * @param {number} y @param {number} yHi @param {number} yLo @param {number} grabPx
 * @returns {'hi'|'lo'|null}
 */
export function bandEdgeAt(y, yHi, yLo, grabPx) {
  const dHi = Math.abs(y - yHi);
  const dLo = Math.abs(y - yLo);
  if (!(Math.min(dHi, dLo) <= grabPx)) return null;
  if (dHi === dLo) return y > yLo ? 'lo' : 'hi';
  return dHi < dLo ? 'hi' : 'lo';
}

/** A band edge in Hz as the readouts write it: 0.05, 0.50, 1.0, 2.5, 10, 19. */
export function fmtBandHz(f) {
  return f >= 1 ? f.toFixed(f >= 10 ? 0 : 1) : f.toPrecision(2);
}

/**
 * What the label at the top of the plot can say, longest first (the view shows the
 * first that fits). With no band yet changed by the student, or no band at all (all
 * notes), it is the how-to hint; otherwise the band and how to change it.
 * @param {{lo:number, hi:number}|null} band
 * @param {boolean} learned the student has changed the band at least once
 * @returns {{hint:boolean, choices:string[]}}
 */
export function bandLabel(band, learned) {
  if (!band || !learned) {
    return { hint: true, choices: ['↕ Drag up or down to choose a band of notes', '↕ Drag up or down to choose notes', '↕ Drag to choose notes'] };
  }
  const r = `${fmtBandHz(band.lo)}–${fmtBandHz(band.hi)} Hz`;
  return { hint: false, choices: [`${r} · drag an edge to change it · double-click for all notes`,
    `${r} · drag an edge to change it`, `${r} · drag an edge`, r] };
}

/** The first text whose width (measure(text), px) is at most maxW; the last one if none fits. */
export function firstThatFits(choices, maxW, measure) {
  return choices.find((t) => measure(t) <= maxW) ?? choices[choices.length - 1];
}

/**
 * Viridis (matplotlib's default colour map), 12 colours from quiet to loud.
 * It gets steadily lighter, so it still reads correctly for colour-blind
 * viewers and in greyscale, unlike a rainbow.
 */
export const VIRIDIS = Object.freeze(['#440154', '#482173', '#433e85', '#38588c', '#2d708e', '#25858e',
  '#1e9b8a', '#2ab07f', '#52c569', '#86d549', '#c2df23', '#fde725']);

/**
 * A colour look-up table: n colours blended smoothly between the anchors.
 * @param {string[]} anchors '#rrggbb' colours, quiet first
 * @param {number} [n=256]
 * @returns {Uint8ClampedArray} r, g, b for entry i at [3i, 3i+1, 3i+2]
 */
export function buildColourLut(anchors = VIRIDIS, n = 256) {
  const rgb = anchors.map((h) => [1, 3, 5].map((k) => parseInt(h.slice(k, k + 2), 16)));
  const lut = new Uint8ClampedArray(n * 3);
  for (let i = 0; i < n; i++) {
    const x = (i / (n - 1)) * (rgb.length - 1);
    const a = Math.min(rgb.length - 2, Math.floor(x));
    const f = x - a;
    for (let c = 0; c < 3; c++) lut[3 * i + c] = Math.round(rgb[a][c] * (1 - f) + rgb[a + 1][c] * f);
  }
  return lut;
}

const LUT = buildColourLut();

/** 3 significant figures: 0.0512, 1.25, 12.5, 125. */
const round3 = (f) => +f.toPrecision(3);

/** Frequency label: 0.05, 2.5, 19.5, 120. */
function fmtHz(f) {
  return String(f >= 100 ? Math.round(f) : +f.toPrecision(3));
}

export class SpectrogramView {
  /**
   * @param {HTMLCanvasElement} canvas give it the same width (and CSS class) as the TraceView above
   * @param {object} [opt]
   * @param {boolean} [opt.axis=true] draw the time axis
   * @param {boolean} [opt.legend=true] draw the dB colour bar
   * @param {boolean} [opt.logFreq=false] log frequency axis (good for distant quakes)
   * @param {number} [opt.fMin] lowest frequency shown, Hz (default: lowest in the data)
   * @param {number} [opt.fMax] highest frequency shown, Hz (default: highest in the data)
   * @param {string} [opt.dbLabel='dB'] unit shown on the colour bar
   * @param {(lo:number|null, hi:number|null, info:{final:boolean})=>void} [opt.onBand]
   *   called while a band is dragged (final false) and when it is let go (final true);
   *   null, null when the band is cleared
   * @param {boolean} [opt.selectBand] students can choose a band (default: when onBand is given);
   *   false = look only (hover readout, no band, no hint)
   */
  constructor(canvas, opt = {}) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.axis = opt.axis ?? true;
    this.legend = opt.legend ?? true;
    this.logFreq = !!opt.logFreq;
    this.fMinOpt = opt.fMin;
    this.fMaxOpt = opt.fMax;
    this.dbLabel = opt.dbLabel ?? 'dB';
    this.onBand = opt.onBand || (() => {});
    this.selectable = opt.selectBand ?? !!opt.onBand;
    this.bandLearned = false; // the student has changed the band (then the hint gives way to the band)
    this._hotEdge = null; // 'hi' | 'lo': the edge under the mouse or being dragged, its grip lit
    this.spec = null;
    this.offsetSec = 0; // time of data[0], seconds after refMs
    this.full = { from: 0, to: 1 };
    this.view = { from: 0, to: 1 };
    this.clim = null; // {lo, hi} dB; null = automatic
    this.autoClim = { lo: NaN, hi: NaN };
    this.band = null; // {lo, hi} Hz
    this.cursorSec = null;
    this.hover = null; // {sec, f}
    this._drag = null; // {y0, anchor, moved} while the pointer is down
    this._image = null; // {canvas, key}
    this._frame = 0;

    if (this.selectable) canvas.tabIndex = 0; // the arrow keys move the band's edges
    canvas.style.cursor = this.selectable ? 'ns-resize' : 'crosshair';
    canvas.setAttribute('aria-roledescription', 'spectrogram');
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

  /**
   * @param {ReturnType<import('../lib/spectral.js').stft>} spec
   * @param {object} t
   * @param {number} t.startMs time of the record's first sample (ms since 1970)
   * @param {number} t.refMs time shown as 0 on the axis (the quake's origin time)
   * @param {number} [t.fromSec] window start, seconds after refMs (default: start of the record)
   * @param {number} [t.toSec] window end (default: end of the last window)
   * @param {boolean} [t.keepView=false] keep the current zoom
   */
  setData(spec, { startMs, refMs, fromSec, toSec, keepView = false }) {
    this.spec = spec;
    this.offsetSec = (startMs - refMs) / 1000;
    const colSec = spec.hop / spec.sampleRate;
    const lastSec = spec.nT ? spec.times[spec.nT - 1] + colSec / 2 : 1;
    this.full = {
      from: fromSec ?? this.offsetSec,
      to: toSec ?? this.offsetSec + lastSec + spec.nwin / 2 / spec.sampleRate,
    };
    if (!keepView) this.view = { ...this.full };
    this.autoClim = dbRange(spec.power);
    this._image = null;
    this.draw();
  }

  /** Show seconds fromSec..toSec (after refMs), e.g. to follow a TraceView's zoom and pan. */
  setView(fromSec, toSec) {
    if (fromSec === this.view.from && toSec === this.view.to) return;
    this.view = { from: fromSec, to: toSec };
    this.draw();
  }

  /** Choose the band (Hz) without calling onBand; null clears it. */
  setBand(lo, hi) {
    this.band = lo == null || hi == null ? null : this._clampBand(Math.min(lo, hi), Math.max(lo, hi));
    this._updateAria();
    this.draw();
  }

  clearBand() { this.setBand(null, null); }

  /** Play cursor at sec (after refMs); null hides it. */
  setCursor(sec) {
    if (sec === this.cursorSec) return;
    this.cursorSec = sec;
    this.draw();
  }

  setLogFreq(on) { this.logFreq = !!on; this._image = null; this.draw(); }

  /** Frequencies shown (Hz); undefined = all the data has. */
  setFreqRange(fMin, fMax) { this.fMinOpt = fMin; this.fMaxOpt = fMax; this._image = null; this.draw(); }

  /** Colour scale limits in dB; no arguments = automatic (see dbRange in spectral.js). */
  setColourRange(lo, hi) {
    this.clim = lo == null || hi == null ? null : { lo, hi };
    this._image = null;
    this.draw();
  }

  /** Stop watching size and theme (when the view is thrown away). */
  destroy() {
    this._ro.disconnect();
    this._mo.disconnect();
    this._mq.removeEventListener('change', this._onTheme);
    cancelAnimationFrame(this._frame);
  }

  resize() {
    const dpr = window.devicePixelRatio || 1;
    const w = Math.max(50, this.canvas.clientWidth);
    const h = Math.max(60, this.canvas.clientHeight);
    if (this.canvas.width !== Math.round(w * dpr) || this.canvas.height !== Math.round(h * dpr)) {
      this.canvas.width = Math.round(w * dpr);
      this.canvas.height = Math.round(h * dpr);
    }
    this.draw();
  }

  // --- theme -------------------------------------------------------------
  /** Read the colours from app.css once per theme change (not on every frame). */
  _readTheme() {
    const s = getComputedStyle(this.canvas);
    const v = (name, fallback) => s.getPropertyValue(name).trim() || fallback;
    this._col = {
      bg: v('--trace-bg', '#fff'),
      text: v('--muted', '#6b7280'),
      strong: v('--text', '#111827'),
      grid: v('--grid', '#e5e7eb'),
      border: v('--border', '#d9dde3'),
      accent: v('--accent', '#1d4ed8'),
      accentText: v('--accent-text', '#fff'),
    };
  }

  // --- coordinates -------------------------------------------------------
  get _w() { return this.canvas.clientWidth; }
  get _plotH() {
    return this.canvas.clientHeight - (this.axis ? AXIS_H : 0) - (this.legend ? LEGEND_H : 0);
  }
  _xOf(sec) { return ((sec - this.view.from) / (this.view.to - this.view.from)) * this._w; }
  _secOf(x) { return this.view.from + (x / this._w) * (this.view.to - this.view.from); }

  /** Frequencies on the axis, bottom to top (Hz). */
  _fRange() {
    const s = this.spec;
    if (!s || !s.nF) return { lo: 0, hi: 1 };
    const dataLo = s.freqs[0];
    const dataHi = s.freqs[s.nF - 1];
    let lo = Math.max(this.fMinOpt ?? dataLo, dataLo);
    const hi = Math.min(this.fMaxOpt ?? dataHi, dataHi);
    if (this.logFreq && lo <= 0) lo = Math.min(s.df, hi / 10); // log10(0) is -infinity
    return { lo, hi: hi > lo ? hi : lo + s.df };
  }

  /** Height fraction 0 (bottom) .. 1 (top) of frequency f. */
  _fracOfF(f) {
    const { lo, hi } = this._fRange();
    if (this.logFreq) return Math.log(f / lo) / Math.log(hi / lo);
    return (f - lo) / (hi - lo);
  }

  _fOfFrac(u) {
    const { lo, hi } = this._fRange();
    return this.logFreq ? lo * (hi / lo) ** u : lo + u * (hi - lo);
  }

  _yOfF(f) { return this._plotH * (1 - this._fracOfF(f)); }
  _fOfY(y) { return this._fOfFrac(1 - y / this._plotH); }

  _clampBand(lo, hi) {
    const r = this._fRange();
    const floor = Math.max(r.lo, this.spec?.df ?? 0); // a band-pass needs lo > 0
    return { lo: round3(Math.max(floor, Math.min(lo, r.hi))), hi: round3(Math.max(floor, Math.min(hi, r.hi))) };
  }

  // --- the picture -------------------------------------------------------
  /**
   * The coloured picture, one column per time window and one row per screen
   * pixel of height. Each row looks up its frequency on the axis (linear or
   * log) and blends the two nearest frequency bins, so a log axis or a tall
   * canvas still looks smooth. Rebuilt only when the size, axis or colour
   * range changes; zooming and panning in time just stretch it.
   */
  _buildImage() {
    const s = this.spec;
    const dpr = window.devicePixelRatio || 1;
    const H = Math.max(1, Math.round(this._plotH * dpr));
    const { lo: cLo, hi: cHi } = this.clim ?? this.autoClim;
    const fr = this._fRange();
    const key = [H, this.logFreq, fr.lo, fr.hi, cLo, cHi].join('|');
    if (this._image?.key === key) return this._image.canvas;

    const { nT, nF, power, freqs, df } = s;
    // For each row: which two bins to blend, and how much of the upper one.
    const rowBin = new Int32Array(H);
    const rowFrac = new Float32Array(H);
    for (let y = 0; y < H; y++) {
      const f = this._fOfFrac(1 - (y + 0.5) / H);
      const b = (f - freqs[0]) / df;
      if (b < -0.5 || b > nF - 0.5) { rowBin[y] = -1; continue; } // no data at this pitch
      const b0 = Math.max(0, Math.min(nF - 2, Math.floor(b)));
      rowBin[y] = b0;
      rowFrac[y] = nF > 1 ? Math.max(0, Math.min(1, b - b0)) : 0;
    }
    const img = new ImageData(nT, H);
    const px = img.data;
    const span = cHi - cLo || 1;
    for (let t = 0; t < nT; t++) {
      const row = t * nF;
      for (let y = 0; y < H; y++) {
        const o = (y * nT + t) * 4;
        const b0 = rowBin[y];
        if (b0 < 0) continue; // transparent
        const v0 = power[row + b0];
        const v = nF > 1 ? v0 + (power[row + b0 + 1] - v0) * rowFrac[y] : v0;
        if (Number.isNaN(v)) continue; // a gap: transparent, the background shows
        const k = Math.max(0, Math.min(255, Math.round(((v - cLo) / span) * 255)));
        px[o] = LUT[3 * k];
        px[o + 1] = LUT[3 * k + 1];
        px[o + 2] = LUT[3 * k + 2];
        px[o + 3] = 255;
      }
    }
    const off = document.createElement('canvas');
    off.width = nT;
    off.height = H;
    off.getContext('2d').putImageData(img, 0, 0);
    this._image = { canvas: off, key };
    return off;
  }

  /** dB value at time sec and frequency f (nearest window and bin), or NaN. */
  _dbAt(sec, f) {
    const s = this.spec;
    if (!s?.nT) return NaN;
    const colSec = s.hop / s.sampleRate;
    const t = Math.round((sec - this.offsetSec - s.times[0]) / colSec);
    const k = Math.round((f - s.freqs[0]) / s.df);
    if (t < 0 || t >= s.nT || k < 0 || k >= s.nF) return NaN;
    return s.power[t * s.nF + k];
  }

  // --- drawing -----------------------------------------------------------
  draw() {
    if (this._frame) return;
    this._frame = requestAnimationFrame(() => { this._frame = 0; this._draw(); });
  }

  _draw() {
    const { ctx, canvas } = this;
    const col = this._col;
    const dpr = window.devicePixelRatio || 1;
    const w = this._w;
    const plotH = this._plotH;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = col.bg;
    ctx.fillRect(0, 0, w, canvas.clientHeight);
    ctx.font = '11px system-ui, sans-serif';
    const s = this.spec;
    const hasData = s && s.nT > 0 && s.nF > 0 && Number.isFinite(this.autoClim.hi);

    if (hasData) {
      // Column t covers its window's centre +- half a step.
      const colSec = s.hop / s.sampleRate;
      const x0 = this._xOf(this.offsetSec + s.times[0] - colSec / 2);
      const x1 = this._xOf(this.offsetSec + s.times[s.nT - 1] + colSec / 2);
      ctx.save();
      ctx.beginPath();
      ctx.rect(0, 0, w, plotH);
      ctx.clip();
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(this._buildImage(), x0, 0, x1 - x0, plotH);
      ctx.restore();
    } else {
      ctx.fillStyle = col.text;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(s ? 'Not enough data for a spectrogram' : 'No data', w / 2, plotH / 2);
    }

    if (this.axis) this._drawTimeAxis(w, plotH);
    if (hasData) {
      this._drawBand(w);
      this._drawFreqAxis();
      if (this.legend) this._drawLegend(w, plotH + (this.axis ? AXIS_H : 0));
    }
    this._drawCursor(plotH);
    if (hasData) {
      this._drawHover(w, plotH);
      this._drawBandLabel(w, plotH);
    }
  }

  /** Same ticks and labels as TraceView, so stacked views read the same. */
  _drawTimeAxis(w, plotH) {
    const { ctx } = this;
    const col = this._col;
    const span = this.view.to - this.view.from;
    const step = niceStep(span, Math.max(3, Math.floor(w / 90)));
    ctx.textBaseline = 'top';
    const unit = w > 480 ? 's after origin' : 's';
    const unitLeft = w - 4 - ctx.measureText(unit).width;
    ctx.strokeStyle = col.text;
    ctx.lineWidth = 1;
    for (let t = Math.ceil(this.view.from / step) * step; t <= this.view.to; t += step) {
      const x = Math.round(this._xOf(t)) + 0.5;
      ctx.beginPath(); ctx.moveTo(x, plotH); ctx.lineTo(x, plotH + 4); ctx.stroke();
      const label = step < 1 ? t.toFixed(step < 0.1 ? 2 : 1) : String(Math.round(t));
      const half = ctx.measureText(label).width / 2;
      if (x - half < 0 || x + half > unitLeft - 6) continue; // keep labels apart
      ctx.fillStyle = col.text;
      ctx.textAlign = 'center';
      ctx.fillText(label, x, plotH + 6);
    }
    ctx.fillStyle = col.text;
    ctx.textAlign = 'right';
    ctx.fillText(unit, w - 4, plotH + 6);
  }

  /** Frequency ticks, drawn just inside the left edge on small backing boxes. */
  _drawFreqAxis() {
    const { ctx } = this;
    const col = this._col;
    const plotH = this._plotH;
    const { lo, hi } = this._fRange();
    let ticks = [];
    if (this.logFreq) {
      for (let d = 10 ** Math.floor(Math.log10(lo)); d <= hi; d *= 10) {
        for (const m of [1, 2, 5]) {
          const f = +(d * m).toPrecision(3);
          if (f >= lo && f <= hi) ticks.push(f);
        }
      }
      // too crowded: keep the 1s (0.1, 1, 10 Hz)
      if (ticks.length * 22 > plotH) ticks = ticks.filter((f) => Math.abs(Math.log10(f) % 1) < 1e-6);
    } else {
      const step = niceStep(hi - lo, Math.max(2, Math.floor(plotH / 34)));
      for (let f = Math.ceil(lo / step) * step; f <= hi + 1e-9; f += step) ticks.push(+f.toPrecision(6));
    }
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    for (const f of ticks) {
      const y = Math.round(this._yOfF(f)) + 0.5;
      if (y < 20 || y > plotH - 6) continue; // the top is kept for the "Hz" label
      const label = fmtHz(f);
      const tw = ctx.measureText(label).width;
      ctx.fillStyle = col.text;
      ctx.fillRect(0, y - 0.5, 5, 1);
      this._labelBox(label, 7, y, tw);
    }
    this._labelBox('Hz', 7, 9, ctx.measureText('Hz').width);
  }

  _labelBox(label, x, y, tw) {
    const { ctx } = this;
    ctx.save();
    ctx.globalAlpha = 0.78;
    ctx.fillStyle = this._col.bg;
    ctx.fillRect(x - 2, y - 7, tw + 4, 14);
    ctx.restore();
    ctx.fillStyle = this._col.text;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, x, y);
  }

  /** The kept band: everything outside it is dimmed, its edges outlined, with a grip on each. */
  _drawBand(w) {
    if (!this.band) return;
    const { ctx } = this;
    const plotH = this._plotH;
    const yHi = Math.max(0, Math.min(plotH, this._yOfF(this.band.hi)));
    const yLo = Math.max(0, Math.min(plotH, this._yOfF(this.band.lo)));
    ctx.save();
    ctx.globalAlpha = 0.6;
    ctx.fillStyle = this._col.bg;
    ctx.fillRect(0, 0, w, yHi);
    ctx.fillRect(0, yLo, w, plotH - yLo);
    ctx.restore();
    for (const [y, f] of [[yHi, this.band.hi], [yLo, this.band.lo]]) {
      this._haloLine(0, y, w, y);
      const label = `${fmtBandHz(f)} Hz`; // as in the label at the top and the page's readouts
      const tw = ctx.measureText(label).width;
      const ly = y === yHi ? Math.max(9, y - 10) : Math.min(plotH - 9, y + 10);
      this._labelBox(label, w - tw - 8, ly, tw);
    }
    if (this.selectable) {
      this._drawGrip(w / 2, this._gripY(yHi), this._hotEdge === 'hi');
      this._drawGrip(w / 2, this._gripY(yLo), this._hotEdge === 'lo');
    }
  }

  /** A grip's center height for an edge at y: kept whole inside the plot. */
  _gripY(y) { return Math.max(GRIP.h / 2 + 1, Math.min(this._plotH - GRIP.h / 2 - 1, y)); }

  /** A pill-shaped handle with two ridges on a band edge; lit (accent color) while grabbed or under the mouse. */
  _drawGrip(x, y, hot) {
    const { ctx } = this;
    const col = this._col;
    ctx.save();
    this._pill(x - GRIP.w / 2, y - GRIP.h / 2, GRIP.w, GRIP.h);
    ctx.fillStyle = hot ? col.accent : '#fff';
    ctx.fill();
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = 'rgba(0,0,0,0.65)';
    ctx.stroke();
    ctx.strokeStyle = hot ? col.accentText : 'rgba(0,0,0,0.6)';
    ctx.lineWidth = 1;
    for (const dy of [-2, 2]) {
      const yy = Math.round(y + dy) + 0.5;
      ctx.beginPath(); ctx.moveTo(x - 9, yy); ctx.lineTo(x + 9, yy); ctx.stroke();
    }
    ctx.restore();
  }

  /** Path of a rectangle with fully rounded ends. */
  _pill(x, y, w, h) {
    const { ctx } = this;
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(x, y, w, h, h / 2);
    else ctx.rect(x, y, w, h);
  }

  /**
   * The label at the top of the plot: the how-to hint (accent pill) until the student
   * first changes the band, and whenever there is no band; afterwards the band in Hz.
   * It moves below the top grip when the band reaches the top of the plot.
   */
  _drawBandLabel(w, plotH) {
    if (!this.selectable) return;
    const { ctx } = this;
    const col = this._col;
    const { hint, choices } = bandLabel(this.band, this.bandLearned);
    ctx.save();
    ctx.font = `${hint ? '600 ' : ''}${w >= 600 ? 13 : 12}px system-ui, sans-serif`;
    const maxW = w - 2 * LABEL.side - 2 * LABEL.pad;
    const text = firstThatFits(choices, maxW, (t) => ctx.measureText(t).width);
    const bw = Math.min(w - 4, ctx.measureText(text).width + 2 * LABEL.pad);
    const x = Math.round((w - bw) / 2);
    let y = LABEL.top;
    if (this.band) {
      const gy = this._gripY(Math.max(0, Math.min(plotH, this._yOfF(this.band.hi))));
      if (gy - GRIP.h / 2 < y + LABEL.h + 4) y = Math.min(plotH - LABEL.h - 2, gy + GRIP.h / 2 + 6);
    }
    this._pill(x, y, bw, LABEL.h);
    if (hint) {
      ctx.fillStyle = col.accent;
      ctx.fill();
    } else {
      ctx.globalAlpha = 0.88;
      ctx.fillStyle = col.bg;
      ctx.fill();
      ctx.globalAlpha = 1;
      ctx.strokeStyle = col.border;
      ctx.lineWidth = 1;
      ctx.stroke();
    }
    ctx.fillStyle = hint ? col.accentText : col.strong;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, w / 2, y + LABEL.h / 2 + 0.5, bw - 2 * LABEL.pad);
    ctx.restore();
  }

  /** A white line with a dark edge: easy to see on every colour of the map. */
  _haloLine(x0, y0, x1, y1) {
    const { ctx } = this;
    ctx.save();
    ctx.lineCap = 'butt';
    ctx.strokeStyle = 'rgba(0,0,0,0.65)';
    ctx.lineWidth = 3.5;
    ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke();
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke();
    ctx.restore();
  }

  _drawCursor(plotH) {
    if (this.cursorSec == null) return;
    const x = this._xOf(this.cursorSec);
    if (x < -2 || x > this._w + 2) return;
    this._haloLine(x, 0, x, plotH);
  }

  /** Colour bar: quiet [gradient with dB ticks] loud. */
  _drawLegend(w, y0) {
    const { ctx } = this;
    const col = this._col;
    const { lo, hi } = this.clim ?? this.autoClim;
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'left';
    ctx.fillStyle = col.text;
    const yBar = y0 + 5;
    const barH = 9;
    let x = 4;
    ctx.fillText('quiet', x, yBar + barH / 2);
    x += ctx.measureText('quiet').width + 6;
    const unit = `loud  (color = strength, ${this.dbLabel})`;
    const barW = Math.max(60, Math.min(280, w - x - ctx.measureText(unit).width - 14));
    const grad = ctx.createLinearGradient(x, 0, x + barW, 0);
    VIRIDIS.forEach((c, i) => grad.addColorStop(i / (VIRIDIS.length - 1), c));
    ctx.fillStyle = grad;
    ctx.fillRect(x, yBar, barW, barH);
    ctx.strokeStyle = col.border;
    ctx.lineWidth = 1;
    ctx.strokeRect(x + 0.5, yBar + 0.5, barW - 1, barH - 1);
    ctx.fillStyle = col.text;
    ctx.fillText(unit, x + barW + 6, yBar + barH / 2);
    // dB ticks under the bar
    const step = niceStep(hi - lo, Math.max(2, Math.floor(barW / 45)));
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    for (let v = Math.ceil(lo / step) * step; v <= hi + 1e-9; v += step) {
      const tx = x + ((v - lo) / (hi - lo)) * barW;
      ctx.fillRect(Math.round(tx), yBar + barH, 1, 3);
      ctx.fillText(String(Math.round(v)), tx, yBar + barH + 4);
    }
  }

  /** Readout under the pointer: time, frequency, dB. */
  _drawHover(w, plotH) {
    if (!this.hover || this._drag) return;
    const { sec, f } = this.hover;
    const db = this._dbAt(sec, f);
    const label = `${sec.toFixed(1)} s · ${fmtHz(f)} Hz${Number.isFinite(db) ? ` · ${Math.round(db)} ${this.dbLabel}` : ''}`;
    const { ctx } = this;
    const tw = ctx.measureText(label).width;
    const x = Math.round(this._xOf(sec)) + 0.5;
    ctx.save();
    ctx.setLineDash([2, 3]);
    ctx.strokeStyle = 'rgba(255,255,255,0.8)';
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, plotH); ctx.stroke();
    ctx.restore();
    this._labelBox(label, Math.min(w - tw - 8, Math.max(40, x + 6)), plotH - 10, tw);
  }

  // --- interaction ---------------------------------------------------------
  _updateAria() {
    const what = 'Spectrogram: time across, frequency up, color shows how strong each note is.';
    if (!this.selectable) { this.canvas.setAttribute('aria-label', what); return; }
    const band = this.band ? ` Kept notes: ${fmtBandHz(this.band.lo)} to ${fmtBandHz(this.band.hi)} Hz.` : ' All notes kept.';
    this.canvas.setAttribute('aria-label', `${what}${band} Drag up or down to choose a band of notes; ` +
      'arrow keys move the top edge, Shift + arrow keys the bottom edge, Escape or a double-click keeps all notes.');
  }

  /** Tell the page the band changed; the student has now found out how, so the hint gives way. */
  _emit(final) {
    this.bandLearned = true;
    this._updateAria();
    if (this.band) this.onBand(this.band.lo, this.band.hi, { final });
    else this.onBand(null, null, { final });
  }

  _wire() {
    const c = this.canvas;
    const pos = (e) => {
      const r = c.getBoundingClientRect();
      return { x: e.clientX - r.left - c.clientLeft, y: e.clientY - r.top - c.clientTop };
    };
    const inPlot = (p) => p.y >= 0 && p.y <= this._plotH;
    // Which band edge (if any) a pointer of this type at height y grabs.
    const edgeAt = (y, pointerType) => (this.band
      ? bandEdgeAt(y, this._yOfF(this.band.hi), this._yOfF(this.band.lo), edgeGrabPx(pointerType))
      : null);

    c.addEventListener('pointerdown', (e) => {
      const p = pos(e);
      if (!this.selectable || !this.spec?.nF || !inPlot(p)) return;
      const edge = edgeAt(p.y, e.pointerType);
      // Dragging an edge keeps the other edge still; otherwise start a new band here.
      const anchor = edge === 'hi' ? this.band.lo : edge === 'lo' ? this.band.hi : this._fOfY(p.y);
      this._drag = { y0: p.y, anchor, edge, moved: false };
      this._hotEdge = edge;
      c.setPointerCapture(e.pointerId);
      c.focus({ preventScroll: true });
      e.preventDefault();
      this.draw();
    });
    c.addEventListener('pointermove', (e) => {
      const p = pos(e);
      const d = this._drag;
      if (d) {
        if (Math.abs(p.y - d.y0) > (d.edge ? 0 : 3)) d.moved = true; // a grabbed edge follows even a small move
        if (d.moved) {
          const f = this._fOfY(Math.max(0, Math.min(this._plotH, p.y)));
          this.band = this._clampBand(Math.min(d.anchor, f), Math.max(d.anchor, f));
          this._hotEdge = f >= d.anchor ? 'hi' : 'lo'; // the edge that follows the pointer
          this._emit(false);
        }
      } else {
        const over = inPlot(p) && this.selectable && e.pointerType === 'mouse' ? edgeAt(p.y, e.pointerType) : null;
        this._hotEdge = over;
        c.style.cursor = !inPlot(p) ? 'default' : this.selectable ? 'ns-resize' : 'crosshair';
      }
      this.hover = inPlot(p) && this.spec ? { sec: this._secOf(p.x), f: this._fOfY(p.y) } : null;
      this.draw();
    });
    const end = () => {
      const d = this._drag;
      this._drag = null;
      this._hotEdge = null;
      if (d?.moved && this.band) {
        if (this.band.hi <= this.band.lo) this.band = null; // squashed to nothing: keep all notes
        this._emit(true);
      }
      this.draw();
    };
    c.addEventListener('pointerup', end);
    c.addEventListener('pointercancel', end);
    c.addEventListener('pointerleave', () => {
      this.hover = null;
      if (!this._drag) this._hotEdge = null;
      this.draw();
    });
    c.addEventListener('dblclick', () => {
      if (!this.selectable || !this.spec?.nF) return;
      this.band = null;
      this._emit(true);
      this.draw();
    });
    c.addEventListener('keydown', (e) => {
      if (!this.selectable || !this.spec?.nF) return;
      if (e.key === 'Escape' || e.key === 'Delete' || e.key === 'Backspace') {
        if (!this.band) return;
        this.band = null;
      } else if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
        const r = this._fRange();
        const b = this.band ?? { lo: Math.max(r.lo, this.spec.df), hi: r.hi };
        const up = e.key === 'ArrowUp';
        const nudge = (f) => (this.logFreq
          ? f * 10 ** ((up ? 1 : -1) / 20) // about 12% (a whole tone and a bit)
          : f + (up ? 1 : -1) * niceStep(r.hi - r.lo, 50));
        let { lo, hi } = b;
        if (e.shiftKey) lo = Math.min(nudge(lo), hi);
        else hi = Math.max(nudge(hi), lo);
        this.band = this._clampBand(lo, hi);
        if (this.band.hi <= this.band.lo) this.band = b; // edges can't cross
      } else return;
      e.preventDefault();
      this._emit(true);
      this.draw();
    });
  }
}

/**
 * Keep a SpectrogramView's time window in step with a TraceView's zoom and pan.
 * TraceView has no "view changed" callback, so this wraps that one TraceView's
 * draw() (which runs after every zoom, pan and reset) to pass its window on.
 * Returns a function that undoes the link.
 * @param {SpectrogramView} spectrogram
 * @param {import('../ui/trace-view.js').TraceView} traceView
 */
export function followTraceView(spectrogram, traceView) {
  const ownDraw = traceView.draw;
  const wasWrapped = Object.hasOwn(traceView, 'draw'); // already linked to another view
  traceView.draw = function drawAndSync(...args) {
    const r = ownDraw.apply(this, args);
    spectrogram.setView(this.view.from, this.view.to);
    return r;
  };
  spectrogram.setView(traceView.view.from, traceView.view.to);
  return () => {
    if (wasWrapped) traceView.draw = ownDraw;
    else delete traceView.draw; // back to TraceView's own draw()
  };
}
