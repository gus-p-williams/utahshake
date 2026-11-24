// Shared pieces for the seismogram figures (trace-figures.mjs, science-traces.mjs):
// loading the offline sample, the house colours and fonts, and the figure() helper
// that draws one or more components on a shared time axis as plain SVG.
//
// Uses the app's own miniSEED parser and filter, so the figures look like what
// students see in the app. Output has a white background (readable in light and
// dark docs themes).
import fs from 'node:fs';

// The seisplotjs bundle registers a web component when loaded; stub it for node.
globalThis.HTMLElement ??= class {};
globalThis.customElements ??= { define() {}, get() {} };

const { parseMiniseed } = await import('../../docs/app/js/data/mseed.js');
const { filteredData } = await import('../../docs/app/js/data/filters.js');
const { WAVE_RACE, FILTERS } = await import('../../docs/app/js/config.js');
const { picksByStation } = await import('../../docs/app/js/lib/fdsn.js');
const { minMaxColumns, peakAbs, niceStep } = await import('../../docs/app/js/lib/signal.js');

export { WAVE_RACE };

// Colours: the app's light theme.
export const C = { bg: '#ffffff', trace: '#1f2937', grid: '#e8ebef', muted: '#5b6472', border: '#d9dde3',
  p: '#1d4ed8', s: '#c0262d', pFill: 'rgba(29,78,216,0.10)', sFill: 'rgba(192,38,45,0.10)', note: '#111827' };
export const FONT = 'font-family="system-ui, -apple-system, Segoe UI, Roboto, sans-serif"';
export const esc = (s) => String(s).replace(/[&<>"]/g, (c) => `&#${c.charCodeAt(0)};`);
export const r1 = (v) => Math.round(v * 10) / 10;
// White outline behind text drawn over traces (keeps it legible).
const HALO = `stroke="${C.bg}" stroke-width="4" paint-order="stroke"`;

/**
 * Load an offline sample: event, analyst picks (by "NET.STA") and every trace in the
 * Wave Race window (WAVE_RACE.preOriginSec before to postOriginSec after the origin).
 */
export function loadSample(id = 'uu80162166') {
  const dir = new URL(`../../docs/app/data/samples/${id}/`, import.meta.url);
  const event = JSON.parse(fs.readFileSync(new URL('event.json', dir)));
  const picks = picksByStation(JSON.parse(fs.readFileSync(new URL('picks.json', dir))));
  const buf = fs.readFileSync(new URL('waveforms.mseed', dir));
  const fromMs = event.timeMs - WAVE_RACE.preOriginSec * 1000;
  const toMs = event.timeMs + WAVE_RACE.postOriginSec * 1000;
  const records = parseMiniseed(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.length), { fromMs, toMs });
  return { id, event, picks, records };
}

/**
 * Filtered traces for one station, in the order given by `components` (e.g. 'ZNE', 'ZE').
 * Returns [{label, startMs, sampleRate, data}] ready for figure().
 */
export function stationTraces(sample, sta, { net = 'UU', filter = 'bp1-10', components = 'ZNE' } = {}) {
  const preset = FILTERS.find((f) => f.id === filter);
  if (!preset) throw new Error(`unknown filter ${filter}`);
  const traces = sample.records
    .filter((t) => t.net === net && t.sta === sta && components.includes(t.cha.at(-1)))
    .sort((a, b) => components.indexOf(a.cha.at(-1)) - components.indexOf(b.cha.at(-1)))
    .map((t) => ({ label: t.cha, startMs: t.startMs, sampleRate: t.sampleRate, data: filteredData(t, preset) }));
  if (!traces.length) throw new Error(`no ${components} traces for ${net}.${sta} in ${sample.id}`);
  return traces;
}

/** Analyst P and S picks for one station, in seconds after the origin. */
export function pickSecs(sample, sta, net = 'UU') {
  const pick = sample.picks[`${net}.${sta}`];
  if (pick?.P == null || pick?.S == null) throw new Error(`no P and S picks for ${net}.${sta}`);
  return { pSec: (pick.P - sample.event.timeMs) / 1000, sSec: (pick.S - sample.event.timeMs) / 1000 };
}

/**
 * One figure: the components on a shared time axis, like the app's picker.
 * traces: from stationTraces(); originMs: the quake's origin time (time zero)
 * top: header height above the plot (title + band labels + anything placed above)
 * marks: [{sec, color, label, side, above}] solid pick lines; label right of the line (side 'left':
 *   left of it), at the top of the plot or, with above: true, in the header just above the plot
 * bands: [{from, to, fill, stroke, label, labelColor, where, labelY}] shaded time ranges, label above
 *   the plot; with labelY, centred inside the band instead (baseline labelY px below the plot top,
 *   '\n' for more lines)
 * notes: [{sec, track, dx, dy, text, color, anchor}] arrow + text pointing at a trace
 * intervals: [{from, to, y, label, color}] double-headed arrow between two times at height y
 *   (px below the top of the plot; negative puts it in the header), label centred above it.
 *   Thin dashed guides join the arrow ends to the plot when it sits above the plot.
 * footer: [{text, color, weight, size}] lines of text under the time axis, left-aligned
 * Options for longer or comparison records (defaults keep the figures above unchanged):
 *   trackH: height of each trace; unit: seconds per axis unit (60 = minutes, 3600 = hours);
 *   axisLabel (+ axisLabelWidth, px kept clear of tick labels at the right end of the axis);
 *   per trace: amp (counts for half the track height, to give traces one shared scale),
 *   rightLabel (text at the trace's top right), color; per mark: dash (an SVG dasharray).
 */
export function figure({ traces, originMs, fromSec, toSec, title, top = 58, marks = [], bands = [], notes = [],
  intervals = [], footer = [], width = 760, trackH = 78, unit = 1, axisLabel = 'seconds after the quake',
  axisLabelWidth = 110 }) {
  const padL = 10;
  const padR = 10;
  const axisH = 26;
  const footH = footer.length ? footer.length * 20 + 6 : 0;
  const w = width - padL - padR;
  const plotH = trackH * traces.length;
  const height = top + plotH + axisH + footH + 8;
  const x = (sec) => padL + ((sec - fromSec) / (toSec - fromSec)) * w;
  const out = [];
  out.push(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}" role="img" ${FONT}>`);
  out.push(`<rect x="0.5" y="0.5" width="${width - 1}" height="${height - 1}" rx="8" fill="${C.bg}" stroke="${C.border}"/>`);
  out.push(`<text x="${padL + 2}" y="22" font-size="15" font-weight="600" fill="${C.note}">${esc(title)}</text>`);

  // shaded bands (behind everything else)
  for (const b of bands) {
    const xa = x(Math.max(fromSec, b.from));
    const xb = x(Math.min(toSec, b.to));
    out.push(`<rect x="${r1(xa)}" y="${top}" width="${r1(xb - xa)}" height="${plotH}" fill="${b.fill}" stroke="${b.stroke || 'none'}" stroke-dasharray="5 4"/>`);
    if (b.label && b.labelY != null) {
      // inside the band, centred, first line's baseline labelY px below the top of the plot
      b.label.split('\n').forEach((line, i) => {
        out.push(`<text x="${r1((xa + xb) / 2)}" y="${r1(top + b.labelY + i * 16)}" font-size="13" font-weight="600" text-anchor="middle" fill="${b.labelColor || C.note}" ${HALO}>${esc(line)}</text>`);
      });
    } else if (b.label) {
      // where: 'before' (ends at the band's left edge), 'after' (starts at its right edge), or centred
      const anchor = b.where === 'before' ? 'end' : b.where === 'after' ? 'start' : 'middle';
      const lx = b.where === 'before' ? xa - 4 : b.where === 'after' ? xb + 4 : (xa + xb) / 2;
      out.push(`<text x="${r1(lx)}" y="${top - 8}" font-size="13" font-weight="600" text-anchor="${anchor}" fill="${b.labelColor || C.note}">${esc(b.label)}</text>`);
    }
  }

  // grid + axis
  const step = niceStep((toSec - fromSec) / unit, 8);
  for (let t = Math.ceil(fromSec / unit / step) * step; t <= toSec / unit + 1e-9; t += step) {
    const gx = r1(x(t * unit));
    out.push(`<line x1="${gx}" y1="${top}" x2="${gx}" y2="${top + plotH}" stroke="${C.grid}"/>`);
    const label = step < 1 ? t.toFixed(step < 0.1 ? 2 : 1) : String(Math.round(t));
    if (gx > padL + 8 && gx < width - padR - axisLabelWidth) {
      out.push(`<text x="${gx}" y="${top + plotH + 17}" font-size="12" text-anchor="middle" fill="${C.muted}">${label}</text>`);
    }
  }
  out.push(`<text x="${width - padR - 2}" y="${top + plotH + 17}" font-size="12" text-anchor="end" fill="${C.muted}">${esc(axisLabel)}</text>`);
  out.push(`<rect x="${padL}" y="${top}" width="${w}" height="${plotH}" fill="none" stroke="${C.border}"/>`);

  // traces
  traces.forEach((tr, k) => {
    const y0 = top + k * trackH + trackH / 2;
    const sr = tr.sampleRate;
    const i0 = Math.max(0, Math.floor(((originMs + fromSec * 1000) - tr.startMs) / 1000 * sr));
    const i1 = Math.min(tr.data.length, Math.ceil(((originMs + toSec * 1000) - tr.startMs) / 1000 * sr) + 1);
    const amp = tr.amp ?? (peakAbs(tr.data, i0, i1) || 1);
    const scale = (trackH / 2 - 4) / amp;
    // Missing data (NaN) breaks the line, so a gap shows as a gap.
    let d = '';
    let pen = false;
    if ((i1 - i0) / w > 2) {
      const cols = Math.floor(w);
      const { min, max } = minMaxColumns(tr.data, i0, i1, cols);
      for (let c = 0; c < cols; c++) {
        if (Number.isNaN(min[c])) { pen = false; continue; }
        const cx = r1(padL + c + 0.5);
        d += `${pen ? 'L' : 'M'}${cx} ${r1(y0 - max[c] * scale)}L${cx} ${r1(y0 - min[c] * scale)}`;
        pen = true;
      }
    } else {
      for (let i = i0; i < i1; i++) {
        if (Number.isNaN(tr.data[i])) { pen = false; continue; }
        const sec = (tr.startMs + (i * 1000) / sr - originMs) / 1000;
        d += `${pen ? 'L' : 'M'}${r1(x(sec))} ${r1(y0 - tr.data[i] * scale)}`;
        pen = true;
      }
    }
    out.push(`<path d="${d}" fill="none" stroke="${tr.color || C.trace}" stroke-width="1" stroke-linejoin="round"/>`);
    out.push(`<text x="${padL + 5}" y="${top + k * trackH + 15}" font-size="12" font-weight="600" fill="${C.muted}">${tr.label}</text>`);
    if (tr.rightLabel) {
      out.push(`<text x="${width - padR - 5}" y="${top + k * trackH + 15}" font-size="12" font-weight="600" text-anchor="end" fill="${C.muted}" ${HALO}>${esc(tr.rightLabel)}</text>`);
    }
    if (k > 0) out.push(`<line x1="${padL}" y1="${top + k * trackH}" x2="${padL + w}" y2="${top + k * trackH}" stroke="${C.grid}"/>`);
  });

  // pick lines
  for (const m of marks) {
    const mx = r1(x(m.sec));
    const dash = m.dash ? ` stroke-dasharray="${m.dash}"` : '';
    if (!m.side && !m.above) {
      out.push(`<line x1="${mx}" y1="${top}" x2="${mx}" y2="${top + plotH}" stroke="${m.color}" stroke-width="2"${dash}/>`);
      out.push(`<text x="${mx + 4}" y="${top + 15}" font-size="13" font-weight="700" fill="${m.color}">${esc(m.label)}</text>`);
      continue;
    }
    // above: the line rises into the header and the label sits beside it, clear of the traces
    const left = m.side === 'left';
    const ly = m.above ? top - 6 : top + 15;
    out.push(`<line x1="${mx}" y1="${m.above ? top - 18 : top}" x2="${mx}" y2="${top + plotH}" stroke="${m.color}" stroke-width="2"${dash}/>`);
    out.push(`<text x="${r1(left ? mx - 4 : mx + 4)}" y="${ly}" font-size="13" font-weight="700"${left ? ' text-anchor="end"' : ''} fill="${m.color}" ${HALO}>${esc(m.label)}</text>`);
  }

  // intervals: double-headed arrow between two times, label centred above
  for (const iv of intervals) {
    const color = iv.color || C.note;
    const xa = x(iv.from);
    const xb = x(iv.to);
    const iy = top + iv.y;
    if (iv.y < 0) {
      for (const gx of [xa, xb]) {
        out.push(`<line x1="${r1(gx)}" y1="${r1(iy - 4)}" x2="${r1(gx)}" y2="${top}" stroke="${color}" stroke-width="1" stroke-dasharray="3 3"/>`);
      }
    }
    out.push(`<line x1="${r1(xa + 1)}" y1="${r1(iy)}" x2="${r1(xb - 1)}" y2="${r1(iy)}" stroke="${color}" stroke-width="1.6" marker-start="url(#arrow-${color.slice(1)})" marker-end="url(#arrow-${color.slice(1)})"/>`);
    out.push(`<text x="${r1((xa + xb) / 2)}" y="${r1(iy - 8)}" font-size="13" font-weight="700" text-anchor="middle" fill="${color}" ${HALO}>${esc(iv.label)}</text>`);
  }

  // arrows with notes
  for (const n of notes) {
    const nx = x(n.sec);
    const ny = top + n.track * trackH + trackH / 2;
    const tx = nx + (n.dx ?? 40);
    const ty = ny + (n.dy ?? -26);
    const color = n.color || C.note;
    out.push(`<line x1="${r1(tx)}" y1="${r1(ty)}" x2="${r1(nx)}" y2="${r1(ny)}" stroke="${color}" stroke-width="1.6" marker-end="url(#arrow-${color.slice(1)})"/>`);
    const anchor = n.anchor || ((n.dx ?? 40) >= 0 ? 'start' : 'end');
    const lines = n.text.split('\n');
    const gap = anchor === 'start' ? 4 : anchor === 'end' ? -4 : 0;
    lines.forEach((line, i) => {
      out.push(`<text x="${r1(tx + gap)}" y="${r1(ty + 4 + (i - (lines.length - 1) / 2) * 16)}" font-size="13" font-weight="600" text-anchor="${anchor}" fill="${color}" ${HALO}>${esc(line)}</text>`);
    });
  }

  // footer lines under the axis
  footer.forEach((f, i) => {
    out.push(`<text x="${padL + 2}" y="${top + plotH + axisH + 18 + i * 20}" font-size="${f.size || 14}" font-weight="${f.weight || 600}" fill="${f.color || C.note}">${esc(f.text)}</text>`);
  });

  const colors = [...new Set([...notes, ...intervals].map((n) => n.color || C.note))];
  out.splice(1, 0, `<defs>${colors.map((c) => `<marker id="arrow-${c.slice(1)}" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill="${c}"/></marker>`).join('')}</defs>`);
  out.push('</svg>');
  return out.join('\n');
}
