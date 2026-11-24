// Quake Explorer's data loading, run on the offline samples (no network).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

// The seisplotjs bundle registers a web component when loaded; stub it for node.
globalThis.HTMLElement ??= class {};
globalThis.customElements ??= { define() {}, get() {} };

const { SampleSource } = await import('../docs/app/js/data/sample-source.js');
const { loadRecordSection, loadStation, mergeArrivals } = await import('../docs/app/js/quake-explorer/data.js');
const { EXPLORER_PRESETS } = await import('../docs/app/js/quake-explorer/config.js');

// Node's fetch can't read files, so give SampleSource one that can.
const fileFetch = async (url) => {
  try {
    return new Response(fs.readFileSync(fileURLToPath(url)));
  } catch {
    return new Response(null, { status: 404 });
  }
};
const base = new URL('../docs/app/data/samples/', import.meta.url);
const explorer = () => new SampleSource(base, { list: 'explorer', fetch: fileFetch });

test('every preset has an explorer sample', async () => {
  const src = explorer();
  for (const p of EXPLORER_PRESETS) {
    const ev = await src.getEvent(p.id);
    assert.equal(ev.id, p.id);
  }
  // Wave Race's list is unchanged.
  const wr = await new SampleSource(base, { fetch: fileFetch }).getEvents();
  assert.deepEqual(wr.map((e) => e.id), ['uu80162166']);
});

test('Junction record section: traces by distance, in m/s, with analyst and computer picks', async () => {
  const r = await loadRecordSection(explorer(), 'uu80162166');
  assert.ok(r.traces.length >= 20, `${r.traces.length} traces`);
  const d = r.traces.map((t) => t.distKm);
  assert.deepEqual(d, [...d].sort((a, b) => a - b));
  assert.ok(Math.max(...d) > 280);
  assert.ok(r.traces.every((t) => t.velocity && t.velocity.length === t.data.length));
  assert.ok(r.traces.some((t) => t.role === 'school'));
  // No stations from other samples (Magna, Kenilworth...) leak in.
  assert.ok(!r.traces.some((t) => ['NOQ', 'SPU', 'HRU'].includes(t.label)));
  const who = new Set(r.arrivals.map((a) => a.who));
  assert.ok(who.has('analyst') && who.has('computer'));
  for (const a of r.arrivals) assert.ok(a.tSec > 0 && a.tSec < 110);
});

test('Magna record section flags clipped stations', async () => {
  const r = await loadRecordSection(explorer(), 'uu60363602', { maxKm: 400 });
  const clipped = r.traces.filter((t) => t.clipped).map((t) => t.label);
  assert.ok(clipped.includes('NOQ') && clipped.includes('GMU'), clipped.join(','));
});

test('loadStation gives up/north/east for TMU (Kenilworth sample)', async () => {
  const src = explorer();
  const ev = await src.getEvent('uu80158051');
  const [tmu] = (await src.getStations({ lat: ev.lat, lon: ev.lon, maxKm: 200, atMs: ev.timeMs }))
    .filter((s) => s.sta === 'TMU');
  const st = await loadStation(src, ev, tmu, { preSec: 10, postSec: 50 });
  assert.equal(st.z.length, st.n.length);
  assert.equal(st.e.length, st.z.length);
  assert.ok(Math.abs(st.bazDeg - 47) < 2, `baz ${st.bazDeg}`);
});

test('mergeArrivals keeps analyst picks and adds only clear computer picks', () => {
  const ev = { timeMs: 1000000 };
  const analyst = [{ net: 'UU', sta: 'A', phase: 'P', timeMs: 1005000 }];
  const computer = [
    { net: 'UU', sta: 'A', phase: 'P', timeMs: 1005200, snr: 50 }, // analyst wins
    { net: 'UU', sta: 'B', phase: 'P', timeMs: 1010000, snr: 20 },
    { net: 'UU', sta: 'C', phase: 'P', timeMs: 1012000, snr: 2 },  // too unclear
  ];
  const a = mergeArrivals(ev, analyst, computer, { P: 8, S: 2 });
  assert.deepEqual(a.map((x) => [x.key, x.who, x.tSec]), [['UU.A', 'analyst', 5], ['UU.B', 'computer', 10]]);
});
