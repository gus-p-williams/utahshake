// Travel-time chart for distant quakes: when P and S arrive (minutes after the quake)
// against distance (degrees around the Earth), from the iasp91 Earth model, with the
// student's own picks on top.
//
// Why the curves bend: rock gets faster with depth, so waves going far dive deep and
// travel faster on average. Twice the distance takes less than twice the time.
import { bodyWaveTimes } from '../lib/teleseism.js';

const FONT = '11px system-ui, sans-serif';
const M = { l: 44, r: 10, t: 22, b: 30 };

export class TravelTimeChart {
  /** @param {HTMLCanvasElement} canvas */
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.table = null;
    this.depthKm = 10;
    this.maxDeg = 120;
    this.marks = { picks: [], trueDeg: null, estDeg: null };
    new ResizeObserver(() => this.draw()).observe(canvas);
    const redraw = () => this.draw();
    window.matchMedia?.('(prefers-color-scheme: dark)').addEventListener?.('change', redraw);
    new MutationObserver(redraw).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
  }

  /** The Earth-model table (traveltimes-iasp91.json) and the quake's depth. */
  setTable(table, depthKm) { this.table = table; this.depthKm = Math.max(0, depthKm); this.draw(); }

  /**
   * @param {object} m
   * @param {Array<{phase:'P'|'S', tSec:number}>} [m.picks] the student's picks
   * @param {number|null} [m.estDeg] distance the student's S − P gives (picks are drawn there)
   * @param {number|null} [m.trueDeg] the real distance (after the reveal)
   */
  setMarks(m) { this.marks = { ...this.marks, ...m }; this.draw(); }

  draw() {
    const c = this.canvas;
    const dpr = window.devicePixelRatio || 1;
    const w = c.clientWidth;
    const h = c.clientHeight;
    if (!w || !h) return;
    c.width = Math.round(w * dpr);
    c.height = Math.round(h * dpr);
    const g = this.ctx;
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    const css = getComputedStyle(document.documentElement);
    const col = (v) => css.getPropertyValue(v).trim();
    const C = { bg: col('--trace-bg'), text: col('--text'), muted: col('--muted'), grid: col('--grid'),
      p: col('--pick-p'), s: col('--pick-s'), ok: col('--ok'), warn: col('--warn') };
    g.fillStyle = C.bg;
    g.fillRect(0, 0, w, h);
    if (!this.table) return;

    const maxMin = Math.ceil(bodyWaveTimes(this.table, this.maxDeg, this.depthKm).S / 60 / 5) * 5;
    const X = (deg) => M.l + (deg / this.maxDeg) * (w - M.l - M.r);
    const Y = (min) => h - M.b - (min / maxMin) * (h - M.t - M.b);

    // Grid and axes.
    g.font = FONT;
    g.lineWidth = 1;
    g.strokeStyle = C.grid;
    g.fillStyle = C.muted;
    g.textAlign = 'center';
    for (let d = 0; d <= this.maxDeg; d += 20) {
      g.beginPath(); g.moveTo(X(d), M.t); g.lineTo(X(d), h - M.b); g.stroke();
      g.fillText(`${d}°`, X(d), h - M.b + 14);
    }
    g.fillText('distance around the Earth (1° ≈ 111 km)', (M.l + w - M.r) / 2, h - 3);
    g.textAlign = 'right';
    for (let t = 0; t <= maxMin; t += 5) {
      g.beginPath(); g.moveTo(M.l, Y(t)); g.lineTo(w - M.r, Y(t)); g.stroke();
      g.fillText(`${t}`, M.l - 5, Y(t) + 4);
    }
    g.save();
    g.translate(11, (M.t + h - M.b) / 2);
    g.rotate(-Math.PI / 2);
    g.textAlign = 'center';
    g.fillText('minutes after the quake', 0, 0);
    g.restore();

    // The core's shadow for P (about 103–142°): only waves bent round or through the core arrive.
    if (this.maxDeg > 103) {
      g.fillStyle = `${C.muted}22`;
      g.fillRect(X(103), M.t, X(Math.min(142, this.maxDeg)) - X(103), h - M.t - M.b);
      g.fillStyle = C.muted;
      g.textAlign = 'center';
      g.fillText('core shadow', (X(103) + X(Math.min(142, this.maxDeg))) / 2, M.t + 12);
    }

    // Model curves.
    for (const [phase, colour] of [['P', C.p], ['S', C.s]]) {
      g.strokeStyle = colour;
      g.lineWidth = 2;
      g.beginPath();
      for (let d = 0; d <= this.maxDeg; d += 1) {
        const t = bodyWaveTimes(this.table, d, this.depthKm)[phase] / 60;
        if (d === 0) g.moveTo(X(d), Y(t)); else g.lineTo(X(d), Y(t));
      }
      g.stroke();
      const lab = bodyWaveTimes(this.table, this.maxDeg * 0.82, this.depthKm)[phase] / 60;
      g.fillStyle = colour;
      g.textAlign = 'left';
      g.fillText(`${phase} (Earth model)`, X(this.maxDeg * 0.82) + 6, Y(lab) + (phase === 'P' ? 14 : -6));
    }

    // The real distance (after the reveal).
    const { picks, estDeg, trueDeg } = this.marks;
    if (Number.isFinite(trueDeg)) {
      g.strokeStyle = C.ok;
      g.setLineDash([5, 4]);
      g.lineWidth = 1.5;
      g.beginPath(); g.moveTo(X(trueDeg), M.t); g.lineTo(X(trueDeg), h - M.b); g.stroke();
      g.setLineDash([]);
      g.fillStyle = C.ok;
      g.textAlign = 'left';
      g.fillText(`real distance ${trueDeg.toFixed(1)}°`, X(trueDeg) + 4, M.t + 26);
    }
    // The student's picks, drawn at the distance their S − P gives (or the real one if no S yet).
    const at = Number.isFinite(estDeg) ? estDeg : trueDeg;
    if (Number.isFinite(at)) {
      for (const p of picks || []) {
        const x = X(at);
        const y = Y(p.tSec / 60);
        g.fillStyle = p.phase === 'P' ? C.p : C.s;
        g.strokeStyle = C.text;
        g.lineWidth = 1;
        g.beginPath();
        g.moveTo(x, y - 6); g.lineTo(x + 6, y); g.lineTo(x, y + 6); g.lineTo(x - 6, y); g.closePath();
        g.fill(); g.stroke();
      }
      if (Number.isFinite(estDeg)) {
        g.fillStyle = C.text;
        g.textAlign = 'left';
        g.fillText(`your picks: ${estDeg.toFixed(1)}° from S − P`, X(at) + 9, Y((picks?.[0]?.tSec ?? 0) / 60) + 4);
      }
    }
  }
}
