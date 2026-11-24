// Make the seismogram figures for the science pages (docs/theory/img/).
//
//   node tools/figures/science-traces.mjs
//
// Uses the offline sample (docs/app/data/samples/uu80162166) and the app's own
// miniSEED parser and filter (via svg-traces.mjs). Picks are the University of Utah
// analysts' picks. No credit text in the images: the page captions carry it.
//   seismogram-anatomy.svg        Seismic waves page, "Reading a seismogram" (MTPU)
//   s-minus-p-worked-example.svg  Distance from S minus P page, worked example (TCRU)
import fs from 'node:fs';
import { C, figure, loadSample, pickSecs, stationTraces } from './svg-traces.mjs';

const outDir = new URL('../../docs/theory/img/', import.meta.url);
fs.mkdirSync(outDir, { recursive: true });

const sample = loadSample('uu80162166');
const originMs = sample.event.timeMs;
const KM_PER_S = 7.66; // km of distance per second of S − P (Quake Locator default, decision D9)
const f2 = (v) => v.toFixed(2);
const MINUS = '−';
const TIMES = '×';
const EN = ' '; // en space after the list numbers (SVG collapses double spaces)

// (a) Anatomy of a seismogram: MTPU, three components, 50 s. Labels follow the page's list:
// background noise, 1 P arrival, 2 S arrival, 3 coda. The noise before P is real but
// thousands of times smaller than the S waves, so at this scale it draws as a flat line.
const anatomy = (() => {
  const STA = 'MTPU';
  const traces = stationTraces(sample, STA, { filter: 'bp1-10' });
  const { pSec, sSec } = pickSecs(sample, STA);
  const grey = 'rgba(91,100,114,0.08)';
  return figure({
    traces, originMs, fromSec: -5, toSec: 45, top: 84,
    title: `Anatomy of a seismogram: station ${STA}`,
    bands: [
      { from: -5, to: pSec, fill: grey, label: 'background noise:\ntoo small to see here', labelColor: C.muted, labelY: 135 },
      { from: 20, to: 45, fill: grey, label: `3${EN}coda: shaking slowly dies away`, labelColor: C.muted },
    ],
    marks: [
      { sec: pSec, color: C.p, label: `1${EN}P arrival`, side: 'left', above: true },
      { sec: sSec, color: C.s, label: `2${EN}S arrival`, above: true },
    ],
    intervals: [{ from: pSec, to: sSec, y: -30, label: `S ${MINUS} P = ${f2(sSec - pSec)} s` }],
    notes: [
      { sec: pSec + 0.05, track: 0, dx: -20, dy: 22, text: 'P: small and sharp,\nclearest on Z', color: C.p },
      { sec: sSec + 0.3, track: 2, dx: 120, dy: 26, text: 'S: bigger, clearest on N and E', color: C.s },
    ],
  });
})();

// (b) Worked example: TCRU, 10 s around P and S
const worked = (() => {
  const STA = 'TCRU';
  const traces = stationTraces(sample, STA, { filter: 'bp1-10' });
  const { pSec, sSec } = pickSecs(sample, STA);
  const sp = Number(f2(sSec - pSec));
  return figure({
    traces, originMs, fromSec: 4, toSec: 14, top: 84,
    title: `Worked example: station ${STA}`,
    marks: [
      { sec: pSec, color: C.p, label: `P ${f2(pSec)} s`, above: true },
      { sec: sSec, color: C.s, label: `S ${f2(sSec)} s`, above: true },
    ],
    intervals: [{ from: pSec, to: sSec, y: -30, label: `S ${MINUS} P = ${f2(sp)} s` }],
    footer: [{ text: `Distance: ${f2(sp)} s ${TIMES} ${KM_PER_S} km/s = ${(sp * KM_PER_S).toFixed(1)} km` }],
  });
})();

const files = { 'seismogram-anatomy.svg': anatomy, 's-minus-p-worked-example.svg': worked };
for (const [name, svg] of Object.entries(files)) {
  fs.writeFileSync(new URL(name, outDir), svg + '\n');
  console.log(`wrote docs/theory/img/${name} (${(svg.length / 1024).toFixed(0)} KB)`);
}
