// Make the seismogram figures for the Wave Race student guide (docs/apps/img/).
//
//   node tools/figures/trace-figures.mjs
//
// Uses the offline sample (docs/app/data/samples/uu80162166) and the app's own
// miniSEED parser and filter, so the figures look like what students see in the
// app. Picks are the University of Utah analysts' picks for station TCRU.
// Output: plain SVG with a white background (readable in light and dark docs themes).
import fs from 'node:fs';

// The seisplotjs bundle registers a web component when loaded; stub it for node.
globalThis.HTMLElement ??= class {};
globalThis.customElements ??= { define() {}, get() {} };

const { parseMiniseed } = await import('../../docs/app/js/data/mseed.js');
const { filteredData } = await import('../../docs/app/js/data/filters.js');
const { WAVE_RACE, FILTERS } = await import('../../docs/app/js/config.js');
const { picksByStation } = await import('../../docs/app/js/lib/fdsn.js');
const { minMaxColumns, peakAbs, niceStep } = await import('../../docs/app/js/lib/signal.js');

const ID = 'uu80162166';
const STA = 'TCRU';
const sampleDir = new URL(`../../docs/app/data/samples/${ID}/`, import.meta.url);
const outDir = new URL('../../docs/apps/img/', import.meta.url);
fs.mkdirSync(outDir, { recursive: true });

const event = JSON.parse(fs.readFileSync(new URL('event.json', sampleDir)));
const picks = picksByStation(JSON.parse(fs.readFileSync(new URL('picks.json', sampleDir))));
const buf = fs.readFileSync(new URL('waveforms.mseed', sampleDir));
const fromMs = event.timeMs - WAVE_RACE.preOriginSec * 1000;
const toMs = event.timeMs + WAVE_RACE.postOriginSec * 1000;
const all = parseMiniseed(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.length), { fromMs, toMs });
const preset = FILTERS.find((f) => f.id === 'bp1-10');
const order = { Z: 0, N: 1, E: 2 };
const traces = all.filter((t) => t.sta === STA)
  .sort((a, b) => order[a.cha.at(-1)] - order[b.cha.at(-1)])
  .map((t) => ({ label: t.cha, startMs: t.startMs, sampleRate: t.sampleRate, data: filteredData(t, preset) }));
const pick = picks[`UU.${STA}`];
const pSec = (pick.P - event.timeMs) / 1000;
const sSec = (pick.S - event.timeMs) / 1000;

// Colours: the app's light theme.
const C = { bg: '#ffffff', trace: '#1f2937', grid: '#e8ebef', muted: '#5b6472', border: '#d9dde3',
  p: '#1d4ed8', s: '#c0262d', pFill: 'rgba(29,78,216,0.10)', sFill: 'rgba(192,38,45,0.10)', note: '#111827' };
const FONT = 'font-family="system-ui, -apple-system, Segoe UI, Roboto, sans-serif"';
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => `&#${c.charCodeAt(0)};`);
const r1 = (v) => Math.round(v * 10) / 10;

/**
 * One figure: the three components on a shared time axis, like the app's picker.
 * marks: [{sec, color, label}] solid pick lines
 * bands: [{from, to, fill, stroke, label, labelColor}] shaded time ranges, label above the plot
 * notes: [{sec, track, dy, text, color, anchor}] arrow + text pointing at a trace
 */
function figure({ fromSec, toSec, title, marks = [], bands = [], notes = [], width = 760 }) {
  const padL = 10;
  const padR = 10;
  const top = 58;             // title + band labels
  const trackH = 78;
  const axisH = 26;
  const w = width - padL - padR;
  const plotH = trackH * traces.length;
  const height = top + plotH + axisH + 8;
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
    if (b.label) {
      // where: 'before' (ends at the band's left edge), 'after' (starts at its right edge), or centred
      const anchor = b.where === 'before' ? 'end' : b.where === 'after' ? 'start' : 'middle';
      const lx = b.where === 'before' ? xa - 4 : b.where === 'after' ? xb + 4 : (xa + xb) / 2;
      out.push(`<text x="${r1(lx)}" y="${top - 8}" font-size="13" font-weight="600" text-anchor="${anchor}" fill="${b.labelColor || C.note}">${esc(b.label)}</text>`);
    }
  }

  // grid + axis
  const step = niceStep(toSec - fromSec, 8);
  for (let t = Math.ceil(fromSec / step) * step; t <= toSec + 1e-9; t += step) {
    const gx = r1(x(t));
    out.push(`<line x1="${gx}" y1="${top}" x2="${gx}" y2="${top + plotH}" stroke="${C.grid}"/>`);
    const label = step < 1 ? t.toFixed(step < 0.1 ? 2 : 1) : String(Math.round(t));
    if (gx > padL + 8 && gx < width - padR - 110) {
      out.push(`<text x="${gx}" y="${top + plotH + 17}" font-size="12" text-anchor="middle" fill="${C.muted}">${label}</text>`);
    }
  }
  out.push(`<text x="${width - padR - 2}" y="${top + plotH + 17}" font-size="12" text-anchor="end" fill="${C.muted}">seconds after the quake</text>`);
  out.push(`<rect x="${padL}" y="${top}" width="${w}" height="${plotH}" fill="none" stroke="${C.border}"/>`);

  // traces
  traces.forEach((tr, k) => {
    const y0 = top + k * trackH + trackH / 2;
    const sr = tr.sampleRate;
    const i0 = Math.max(0, Math.floor(((event.timeMs + fromSec * 1000) - tr.startMs) / 1000 * sr));
    const i1 = Math.min(tr.data.length, Math.ceil(((event.timeMs + toSec * 1000) - tr.startMs) / 1000 * sr) + 1);
    const amp = peakAbs(tr.data, i0, i1) || 1;
    const scale = (trackH / 2 - 4) / amp;
    let d = '';
    if ((i1 - i0) / w > 2) {
      const cols = Math.floor(w);
      const { min, max } = minMaxColumns(tr.data, i0, i1, cols);
      for (let c = 0; c < cols; c++) {
        if (Number.isNaN(min[c])) continue;
        const cx = r1(padL + c + 0.5);
        d += `${c ? 'L' : 'M'}${cx} ${r1(y0 - max[c] * scale)}L${cx} ${r1(y0 - min[c] * scale)}`;
      }
    } else {
      for (let i = i0; i < i1; i++) {
        const sec = (tr.startMs + (i * 1000) / sr - event.timeMs) / 1000;
        d += `${i === i0 ? 'M' : 'L'}${r1(x(sec))} ${r1(y0 - tr.data[i] * scale)}`;
      }
    }
    out.push(`<path d="${d}" fill="none" stroke="${C.trace}" stroke-width="1" stroke-linejoin="round"/>`);
    out.push(`<text x="${padL + 5}" y="${top + k * trackH + 15}" font-size="12" font-weight="600" fill="${C.muted}">${tr.label}</text>`);
    if (k > 0) out.push(`<line x1="${padL}" y1="${top + k * trackH}" x2="${padL + w}" y2="${top + k * trackH}" stroke="${C.grid}"/>`);
  });

  // pick lines
  for (const m of marks) {
    const mx = r1(x(m.sec));
    out.push(`<line x1="${mx}" y1="${top}" x2="${mx}" y2="${top + plotH}" stroke="${m.color}" stroke-width="2"/>`);
    out.push(`<text x="${mx + 4}" y="${top + 15}" font-size="13" font-weight="700" fill="${m.color}">${esc(m.label)}</text>`);
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
      out.push(`<text x="${r1(tx + gap)}" y="${r1(ty + 4 + (i - (lines.length - 1) / 2) * 16)}" font-size="13" font-weight="600" text-anchor="${anchor}" fill="${color}" stroke="${C.bg}" stroke-width="4" paint-order="stroke">${esc(line)}</text>`);
    });
  }
  const colors = [...new Set(notes.map((n) => n.color || C.note))];
  out.splice(1, 0, `<defs>${colors.map((c) => `<marker id="arrow-${c.slice(1)}" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill="${c}"/></marker>`).join('')}</defs>`);
  out.push('</svg>');
  return out.join('\n');
}

const pWin = { from: pSec - 2, to: pSec + 2 };
const sWin = { from: sSec - 2.5, to: sSec + 2.5 };

const fig1 = figure({
  fromSec: -WAVE_RACE.preOriginSec,
  toSec: WAVE_RACE.postOriginSec,
  title: `The whole record (90 s): station ${STA}, filter 1–10 Hz`,
  bands: [
    { ...pWin, fill: C.pFill, stroke: C.p, label: 'P likely here', labelColor: C.p, where: 'before' },
    { ...sWin, fill: C.sFill, stroke: C.s, label: 'S likely here', labelColor: C.s, where: 'after' },
  ],
  notes: [
    { sec: -3, track: 1, dx: -28, dy: 28, text: 'quiet: noise', color: C.muted, anchor: 'start' },
    { sec: pSec + 0.4, track: 0, dx: 120, dy: -30, text: 'first change: P', color: C.p },
    { sec: sSec + 1.2, track: 2, dx: 60, dy: 22, text: 'bigger waves: S', color: C.s },
    { sec: 40, track: 1, dx: 30, dy: -24, text: 'coda: shaking slowly dies away', color: C.muted },
  ],
});

const fig2 = figure({
  fromSec: pWin.from,
  toSec: pWin.to,
  title: 'Zoomed in on P (4 seconds shown)',
  marks: [{ sec: pSec, color: C.p, label: 'P pick' }],
  notes: [
    { sec: pSec - 1.1, track: 0, dx: -10, dy: -24, text: 'quiet before P', color: C.muted, anchor: 'end' },
    { sec: pSec + 0.06, track: 0, dx: 70, dy: 26, text: 'pick the very first\nclear change', color: C.p },
  ],
});

const fig3 = figure({
  fromSec: sWin.from,
  toSec: sWin.to,
  title: 'Zoomed in on S (5 seconds shown)',
  marks: [{ sec: sSec, color: C.s, label: 'S pick' }],
  notes: [
    { sec: sSec - 1.2, track: 2, dx: -12, dy: -26, text: 'P waves still shaking', color: C.muted, anchor: 'end' },
    { sec: sSec + 0.1, track: 2, dx: 70, dy: -24, text: 'S starts: bigger, slower\nwaves on N and E', color: C.s },
  ],
});

const files = { 'picking-1-whole.svg': fig1, 'picking-2-p.svg': fig2, 'picking-3-s.svg': fig3 };
for (const [name, svg] of Object.entries(files)) {
  fs.writeFileSync(new URL(name, outDir), svg + '\n');
  console.log(`wrote docs/apps/img/${name} (${(svg.length / 1024).toFixed(0)} KB)`);
}
console.log(`P ${pSec.toFixed(2)} s, S ${sSec.toFixed(2)} s, S-P ${(sSec - pSec).toFixed(2)} s`);
