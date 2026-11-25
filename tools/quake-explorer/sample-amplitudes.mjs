// UUSS's own magnitude numbers for each Quake Explorer offline sample, saved beside it as
// uuss-magnitudes.json: the network magnitudes (ML, Md, Mw; which is preferred), every channel's
// Wood-Anderson amplitude (ComCat `AML`: the full peak-to-peak swing, meters) with its station
// ML and weight, and every coda duration (`END`) with its station Md.
//
// Used by tests/magnitude.test.js (our Wood-Anderson must reproduce UUSS's amplitudes on the
// sample's own horizontal records) and by investigation E's offline Check. Source: the event's
// UUSS "phase-data" QuakeML in USGS ComCat (never Raspberry Shake servers).
//
//   node tools/quake-explorer/sample-amplitudes.mjs            every explorer sample with a uu event
//   node tools/quake-explorer/sample-amplitudes.mjs qe-junction
import fs from 'node:fs';
import path from 'node:path';
import { app, root, parseArgs } from './node-setup.mjs';

const { parseQuakeMLAmplitudes, parseQuakeMLMagnitudes, uussSwingMm } = await app('lib/magnitude.js');

const args = parseArgs();
const dir = path.join(root, 'docs/app/data/samples');
const index = JSON.parse(fs.readFileSync(path.join(dir, 'index.json'), 'utf8'));
const which = args._.length ? args._ : index.explorer;
const EVENT = 'https://earthquake.usgs.gov/fdsnws/event/1/query';

for (const d of which) {
  const sample = JSON.parse(fs.readFileSync(path.join(dir, d, 'sample.json'), 'utf8'));
  const id = sample.event;
  if (!id.startsWith('uu')) { console.log(`${d}: ${id} is not a UUSS event; skipped`); continue; }
  const detail = await (await fetch(`${EVENT}?eventid=${id}&format=geojson`)).json();
  const products = detail.properties.products?.['phase-data'] || [];
  const pd = products.find((p) => p.source === 'uu') || products[0];
  const url = pd?.contents?.['quakeml.xml']?.url;
  if (!url) { console.log(`${d}: no phase-data product; skipped`); continue; }
  const xml = await (await fetch(url)).text();
  const amps = parseQuakeMLAmplitudes(xml);
  const mags = parseQuakeMLMagnitudes(xml);
  const byAmp = new Map(mags.station.map((s) => [s.amplitudeId, s]));
  const key = (a) => ({ net: a.net, sta: a.sta, loc: a.loc, cha: a.cha });
  const out = {
    event: id,
    source: 'USGS ComCat, UUSS phase-data QuakeML (University of Utah Seismograph Stations)',
    url,
    productUpdated: pd.updateTime ? new Date(pd.updateTime).toISOString() : null,
    made: new Date().toISOString().slice(0, 10),
    command: `node tools/quake-explorer/sample-amplitudes.mjs ${d}`,
    notes: 'amlMeters: UUSS stores the FULL peak-to-peak swing on its simulated Wood-Anderson ' +
      '(magnification 2,800, damping 0.8), in meters; swingMm is half of it, in millimeters, the ' +
      'number in the magnitude formula. weight 0: no station correction, not averaged.',
    network: mags.network.map(({ type, value, method, stationCount, preferred }) =>
      ({ type, value, method, stationCount, preferred })),
    amplitudes: amps.filter((a) => a.type === 'AML').map((a) => {
      const s = byAmp.get(a.id);
      return { ...key(a), amlMeters: a.value, swingMm: +uussSwingMm(a.value).toPrecision(5),
        stationML: s?.value ?? null, weight: s?.weight ?? null };
    }),
    durations: amps.filter((a) => a.type === 'END').map((a) => {
      const s = byAmp.get(a.id);
      return { ...key(a), endSec: a.value, stationMd: s?.value ?? null, weight: s?.weight ?? null };
    }),
  };
  fs.writeFileSync(path.join(dir, d, 'uuss-magnitudes.json'), JSON.stringify(out, null, 1) + '\n');
  const ml = out.network.find((m) => /^ml$/i.test(m.type));
  console.log(`${d}: ${id} ML ${ml?.value ?? '–'}; ${out.amplitudes.length} amplitudes, ${out.durations.length} durations`);
}
