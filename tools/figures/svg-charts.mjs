// Chart pieces for the figure scripts, in the house style of svg-traces.mjs (white card,
// system font, muted grid): stacking figures into one SVG, panels of values over local time,
// a 24-hour bar chart, and a spectrogram image. Plain SVG; the spectrogram is a small PNG
// inside the SVG (written here, no libraries).
import zlib from 'node:zlib';
import { C, FONT, esc, r1 } from './svg-traces.mjs';
import { niceStep } from '../../docs/app/js/lib/signal.js';

export const TZ = 'America/Denver';
const HALO = `stroke="${C.bg}" stroke-width="4" paint-order="stroke"`;

/** <text> with the house font size/weight; content is escaped. */
export function text(x, y, s, { size = 13, weight = 400, fill = C.note, anchor = 'start', halo = false } = {}) {
  return `<text x="${r1(x)}" y="${r1(y)}" font-size="${size}"${weight !== 400 ? ` font-weight="${weight}"` : ''}` +
    `${anchor !== 'start' ? ` text-anchor="${anchor}"` : ''} fill="${fill}"${halo ? ' ' + HALO : ''}>${esc(s)}</text>`;
}

/** Open a card: <svg> + white rounded background + title. Returns the array to push into. */
export function card(width, height, title) {
  return [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}" role="img" ${FONT}>`,
    `<rect x="0.5" y="0.5" width="${width - 1}" height="${height - 1}" rx="8" fill="${C.bg}" stroke="${C.border}"/>`,
    title ? text(12, 22, title, { size: 15, weight: 600 }) : '',
  ];
}

const sizeOf = (svg) => {
  const m = /viewBox="0 0 ([\d.]+) ([\d.]+)"/.exec(svg);
  return { w: +m[1], h: +m[2] };
};

/** Stack whole SVG figures (each a card) top to bottom, `gap` px apart, in one SVG. */
export function stack(svgs, gap = 12) {
  const sizes = svgs.map(sizeOf);
  const width = Math.max(...sizes.map((s) => s.w));
  const height = sizes.reduce((h, s) => h + s.h, 0) + gap * (svgs.length - 1);
  let y = 0;
  const parts = svgs.map((svg, i) => {
    const { w, h } = sizes[i];
    const inner = svg.replace(/^<svg [^>]*>/, `<svg x="0" y="${y}" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">`);
    y += h + gap;
    return inner;
  });
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}" role="img" ${FONT}>\n${parts.join('\n')}\n</svg>`;
}

/** Local (Utah) calendar parts of a time: {y, mo, d, h, mi, wd}. */
const partsFmt = new Intl.DateTimeFormat('en-US', { timeZone: TZ, year: 'numeric', month: 'short', day: 'numeric',
  hour: 'numeric', minute: 'numeric', hourCycle: 'h23', weekday: 'short' });
export function localParts(ms) {
  const p = Object.fromEntries(partsFmt.formatToParts(new Date(ms)).map((x) => [x.type, x.value]));
  return { y: +p.year, mo: p.month, d: +p.day, h: +p.hour, mi: +p.minute, wd: p.weekday };
}

/** Times (ms) of local midnights from t0 to t1. */
export function localMidnights(t0, t1) {
  const out = [];
  for (let t = t0 - 86400e3; t <= t1 + 86400e3; t += 3600e3) {
    const p = localParts(t);
    if (p.h === 0 && p.mi === 0 && t >= t0 && t <= t1) out.push(t);
  }
  return out;
}

/**
 * Panels of values over local time, one above the other, sharing a time axis labelled with
 * local days. Each panel: {label, unit, values: [{t, v}], max, color, area, notes}
 * nights: true shades 8 pm - 6 am local; dayLabel(ms) -> text under each day.
 * notes: [{t, v, text, dx, dy, anchor}] arrow from text to the point (t, v).
 */
export function timePanels({ title, t0, t1, panels, width = 760, panelH = 120, nights = true, shade = [],
  dayLabel = (ms) => { const p = localParts(ms); return `${p.wd} ${p.mo} ${p.d}`; }, footer = [] }) {
  const padL = 46;
  const padR = 14;
  const top = 34;
  const gap = 30;
  const axisH = 34;
  const footH = footer.length * 18;
  const w = width - padL - padR;
  const height = top + panels.length * (panelH + gap) - gap + axisH + footH + 10;
  const x = (t) => padL + ((t - t0) / (t1 - t0)) * w;
  const out = card(width, height, title);
  const plotTop = (k) => top + 18 + k * (panelH + gap);
  const mids = localMidnights(t0, t1);

  panels.forEach((pan, k) => {
    const y0 = plotTop(k);
    const yb = y0 + panelH - 18;
    const step = niceStep(pan.max, 4);
    const y = (v) => yb - (Math.min(v, pan.max) / pan.max) * (panelH - 18);
    out.push(text(padL, y0 - 6, pan.label, { size: 13, weight: 600 }));
    // extra shaded spans (e.g. the weekend), then night shading (8 pm to 6 am local) over them
    for (const s of shade) {
      out.push(`<rect x="${r1(x(s.from))}" y="${r1(y(pan.max))}" width="${r1(x(s.to) - x(s.from))}" height="${r1(yb - y(pan.max))}" fill="${s.fill}"/>`);
      if (s.label && k === 0) out.push(text((x(s.from) + x(s.to)) / 2, y(pan.max) + 14, s.label, { size: 12, weight: 600, fill: s.labelColor || C.muted, anchor: 'middle', halo: true }));
    }
    if (nights) {
      for (let t = t0; t < t1; t += 3600e3) {
        const h = localParts(t).h;
        if (h >= 20 || h < 6) {
          out.push(`<rect x="${r1(x(t))}" y="${r1(y(pan.max))}" width="${r1(x(t + 3600e3) - x(t) + 0.3)}" height="${r1(yb - y(pan.max))}" fill="rgba(91,100,114,0.10)"/>`);
        }
      }
    }
    for (let v = 0; v <= pan.max + 1e-9; v += step) {
      out.push(`<line x1="${padL}" y1="${r1(y(v))}" x2="${padL + w}" y2="${r1(y(v))}" stroke="${C.grid}"/>`);
      out.push(text(padL - 6, y(v) + 4, String(+v.toFixed(2)), { size: 12, fill: C.muted, anchor: 'end' }));
    }
    for (const m of mids) out.push(`<line x1="${r1(x(m))}" y1="${r1(y(pan.max))}" x2="${r1(x(m))}" y2="${yb}" stroke="${C.border}"/>`);
    if (pan.unit) out.push(text(padL + w, y0 - 6, pan.unit, { size: 12, fill: C.muted, anchor: 'end' }));
    // the series: a 2 px line (breaks at missing values), optional light area under it
    const pts = pan.values.filter((p) => p.t >= t0 && p.t <= t1);
    let d = '';
    let pen = false;
    for (const p of pts) {
      if (!Number.isFinite(p.v)) { pen = false; continue; }
      d += `${pen ? 'L' : 'M'}${r1(x(p.t))} ${r1(y(p.v))}`;
      pen = true;
    }
    if (pan.area) {
      const fin = pts.filter((p) => Number.isFinite(p.v));
      out.push(`<path d="M${r1(x(fin[0].t))} ${yb}${fin.map((p) => `L${r1(x(p.t))} ${r1(y(p.v))}`).join('')}L${r1(x(fin.at(-1).t))} ${yb}Z" fill="${pan.area}"/>`);
    }
    out.push(`<path d="${d}" fill="none" stroke="${pan.color || C.trace}" stroke-width="2" stroke-linejoin="round"/>`);
    out.push(`<line x1="${padL}" y1="${yb}" x2="${padL + w}" y2="${yb}" stroke="${C.muted}"/>`);
    for (const n of pan.notes || []) {
      const px = x(n.t);
      const py = y(n.v);
      const tx = px + (n.dx ?? 30);
      const ty = py + (n.dy ?? -20);
      out.push(`<line x1="${r1(tx)}" y1="${r1(ty)}" x2="${r1(px)}" y2="${r1(py)}" stroke="${C.note}" stroke-width="1.4"/>`);
      out.push(`<circle cx="${r1(px)}" cy="${r1(py)}" r="3" fill="${C.note}"/>`);
      n.text.split('\n').forEach((line, i) => out.push(text(tx + ((n.dx ?? 30) >= 0 ? 4 : -4), ty + 4 + i * 15, line,
        { size: 12.5, weight: 600, anchor: n.anchor || ((n.dx ?? 30) >= 0 ? 'start' : 'end'), halo: true })));
    }
  });

  // shared day labels under the last panel
  const yAxis = plotTop(panels.length - 1) + panelH - 18;
  const starts = [t0, ...mids].filter((t, i, a) => i === 0 || t > a[i - 1]);
  starts.forEach((t, i) => {
    const end = starts[i + 1] ?? t1;
    if (x(end) - x(t) < 40) return;
    out.push(text((x(t) + x(end)) / 2, yAxis + 18, dayLabel(t + 3600e3), { size: 12, fill: C.muted, anchor: 'middle' }));
  });
  footer.forEach((f, i) => out.push(text(padL, yAxis + 36 + i * 18, f.text, { size: 12.5, fill: f.color || C.muted, weight: f.weight || 400 })));
  out.push('</svg>');
  return out.join('\n');
}

/**
 * Bar chart of a share per hour of the day (24 bars), one panel per series, stacked.
 * series: [{label, counts: number[24], color}]; values shown as % of that series' total.
 */
export function hourBars({ title, series, width = 760, panelH = 110, xLabel = 'hour of the day (Utah time)', footer = [] }) {
  const padL = 46;
  const padR = 14;
  const top = 36;
  const gap = 34;
  const w = width - padL - padR;
  const height = top + series.length * (panelH + gap) - gap + 40 + footer.length * 18 + 8;
  const out = card(width, height, title);
  const bw = w / 24;
  const max = Math.max(...series.map((s) => Math.max(...s.counts) / s.counts.reduce((a, b) => a + b, 0))) * 100;
  const yMax = Math.ceil(max / 5) * 5;
  series.forEach((s, k) => {
    const total = s.counts.reduce((a, b) => a + b, 0);
    const y0 = top + 18 + k * (panelH + gap);
    const yb = y0 + panelH - 14;
    const y = (pct) => yb - (pct / yMax) * (panelH - 14);
    out.push(text(padL, y0 - 4, s.label, { weight: 600 }));
    for (let v = 0; v <= yMax; v += yMax > 20 ? 10 : 5) {
      out.push(`<line x1="${padL}" y1="${r1(y(v))}" x2="${padL + w}" y2="${r1(y(v))}" stroke="${C.grid}"/>`);
      out.push(text(padL - 6, y(v) + 4, `${v}%`, { size: 12, fill: C.muted, anchor: 'end' }));
    }
    s.counts.forEach((c, h) => {
      const pct = (100 * c) / total;
      if (!c) return;
      const bx = padL + h * bw + 1;
      const by = y(pct);
      const bh = yb - by;
      const rr = Math.min(3, bh / 2, (bw - 2) / 2);
      // rounded data end at the top, square at the baseline
      out.push(`<path d="M${r1(bx)} ${r1(yb)}V${r1(by + rr)}Q${r1(bx)} ${r1(by)} ${r1(bx + rr)} ${r1(by)}H${r1(bx + bw - 2 - rr)}Q${r1(bx + bw - 2)} ${r1(by)} ${r1(bx + bw - 2)} ${r1(by + rr)}V${r1(yb)}Z" fill="${s.color}"/>`);
    });
    out.push(`<line x1="${padL}" y1="${yb}" x2="${padL + w}" y2="${yb}" stroke="${C.muted}"/>`);
    if (k === series.length - 1) {
      for (let h = 0; h <= 24; h += 3) {
        const lab = h === 0 || h === 24 ? 'midnight' : h === 12 ? 'noon' : h < 12 ? `${h} am` : `${h - 12} pm`;
        out.push(text(padL + h * bw, yb + 16, lab, { size: 12, fill: C.muted, anchor: h === 0 ? 'start' : h === 24 ? 'end' : 'middle' }));
      }
      out.push(text(padL + w / 2, yb + 34, xLabel, { size: 12, fill: C.muted, anchor: 'middle' }));
    }
  });
  const fy = top + series.length * (panelH + gap) - gap + 40;
  footer.forEach((f, i) => out.push(text(padL, fy + 10 + i * 18, f.text, { size: 12.5, fill: f.color || C.muted })));
  out.push('</svg>');
  return out.join('\n');
}

// --- PNG (for the spectrogram image) -------------------------------------------------------

const CRC_TABLE = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
function crc32(buf) {
  let c = 0xffffffff;
  for (const b of buf) c = CRC_TABLE[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
}
/** RGB pixels (Uint8Array, width*height*3, rows top to bottom) -> PNG Buffer. */
export function png(width, height, rgb) {
  const raw = Buffer.alloc((width * 3 + 1) * height);
  for (let yy = 0; yy < height; yy++) {
    raw[yy * (width * 3 + 1)] = 0;
    Buffer.from(rgb.buffer, rgb.byteOffset + yy * width * 3, width * 3).copy(raw, yy * (width * 3 + 1) + 1);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; ihdr[9] = 2; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(raw, { level: 9 })), chunk('IEND', Buffer.alloc(0))]);
}

// Viridis (perceptually even, colour-blind safe), dark = weak, yellow = strong.
const VIRIDIS = ['#440154', '#482475', '#414487', '#355f8d', '#2a788e', '#21918c', '#22a884', '#44bf70',
  '#7ad151', '#bddf26', '#fde725'].map((h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16)));
export function viridis(f) {
  const u = Math.min(1, Math.max(0, f)) * (VIRIDIS.length - 1);
  const i = Math.min(VIRIDIS.length - 2, Math.floor(u));
  const a = u - i;
  return VIRIDIS[i].map((c, k) => Math.round(c + a * (VIRIDIS[i + 1][k] - c)));
}
export const viridisHex = (f) => '#' + viridis(f).map((c) => c.toString(16).padStart(2, '0')).join('');
