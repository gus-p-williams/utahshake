// Make the seismogram figures for the Quake Locator student guide (docs/apps/img/).
//
//   node tools/figures/trace-figures.mjs
//
// Uses the offline sample (docs/app/data/samples/uu80162166) and the app's own
// miniSEED parser and filter (via svg-traces.mjs), so the figures look like what
// students see in the app. Picks are the University of Utah analysts' picks for
// station TCRU. Output: plain SVG with a white background.
import fs from 'node:fs';
import { C, WAVE_RACE, figure as drawFigure, loadSample, pickSecs, stationTraces } from './svg-traces.mjs';

const STA = 'TCRU';
const outDir = new URL('../../docs/apps/img/', import.meta.url);
fs.mkdirSync(outDir, { recursive: true });

const sample = loadSample('uu80162166');
const traces = stationTraces(sample, STA, { filter: 'bp1-10' });
const { pSec, sSec } = pickSecs(sample, STA);
const figure = (opts) => drawFigure({ traces, originMs: sample.event.timeMs, ...opts });

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
