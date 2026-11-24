// Quake Explorer: per-quake station notes (investigation A) and the travel-time credit.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

// The seisplotjs bundle registers a web component when loaded; stub it for node.
globalThis.HTMLElement ??= class {};
globalThis.customElements ??= { define() {}, get() {} };

const { SampleSource } = await import('../docs/app/js/data/sample-source.js');
const { loadRecordSection } = await import('../docs/app/js/quake-explorer/data.js');
const { stationNotes, ATTRIBUTION } = await import('../docs/app/js/quake-explorer/config.js');

const fileFetch = async (url) => {
  try {
    return new Response(fs.readFileSync(fileURLToPath(url)));
  } catch {
    return new Response(null, { status: 404 });
  }
};
const base = new URL('../docs/app/data/samples/', import.meta.url);
const read = (rel) => fs.readFileSync(new URL(rel, import.meta.url), 'utf8');

test('stationNotes: only the named stations of the named quake, once each', () => {
  const m = stationNotes('uu60363602', ['MTPU', 'SGU', 'SGU']);
  assert.equal(m.length, 1);
  assert.match(m[0], /^SGU: older short-period sensor in 2020; its record is about 100 times too small, no quake visible$/);
  assert.deepEqual(stationNotes('uu60363602', ['MTPU']), []);
  assert.deepEqual(stationNotes('uu80162166', ['SGU']), [], 'Junction: SGU is fine');
  assert.deepEqual(stationNotes('not-a-preset', ['SGU']), []);
});

test("Magna's record section (as inv-a.js loads it) includes SGU, so its note shows", async () => {
  const src = new SampleSource(base, { list: 'explorer', fetch: fileFetch });
  const r = await loadRecordSection(src, 'uu60363602', { maxKm: 400, postSec: 140 });
  const shown = [...r.traces.map((t) => t.label), ...r.missing];
  assert.ok(shown.includes('SGU'), `stations: ${shown.join(', ')}`);
  assert.equal(stationNotes('uu60363602', shown).length, 1);
});

test('inv-a.js lists the station notes beside the clipped stations', () => {
  const src = read('../docs/app/js/quake-explorer/inv-a.js');
  const clipped = src.indexOf('Clipped (the sensor maxed out');
  const notes = src.indexOf('stationNotes(ctx.event.id');
  assert.ok(clipped > 0 && notes > clipped && notes - clipped < 600, 'stationNotes call follows the clipped note');
});

test('the iasp91 travel-time credit exists and Quake Explorer shows it', () => {
  assert.equal(ATTRIBUTION.traveltimes,
    'Travel times: iasp91 Earth model, Kennett and Engdahl 1991, via ObsPy TauP.');
  const app = read('../docs/app/js/quake-explorer/app.js');
  const call = app.match(/showCredits\(\$\('credits'\),\s*\[([^\]]*)\]\)/);
  assert.ok(call, 'app.js calls showCredits with a key list');
  assert.match(call[1], /'traveltimes'/);
});
