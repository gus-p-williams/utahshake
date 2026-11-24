// End-to-end checks on the bundled offline sample (real UUSS data, no network).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

// The seisplotjs bundle registers a web component when loaded; stub it for node.
globalThis.HTMLElement ??= class {};
globalThis.customElements ??= { define() {}, get() {} };

const { parseMiniseed } = await import('../docs/app/js/data/mseed.js');
const { filteredData } = await import('../docs/app/js/data/filters.js');
const { WAVE_RACE, SCHOOLS, FILTERS } = await import('../docs/app/js/config.js');
const { picksByStation } = await import('../docs/app/js/lib/fdsn.js');
const { spToDistanceKm, kmPerSecond, locateGrid } = await import('../docs/app/js/lib/locate.js');
const { selectStations } = await import('../docs/app/js/lib/stations.js');
const { distanceKm } = await import('../docs/app/js/lib/geo.js');

const dir = new URL('../docs/app/data/samples/', import.meta.url);
const { samples } = JSON.parse(fs.readFileSync(new URL('index.json', dir), 'utf8'));
const read = (id, f) => fs.readFileSync(new URL(`${id}/${f}`, dir));

for (const id of samples) {
  const event = JSON.parse(read(id, 'event.json'));
  const stations = JSON.parse(read(id, 'stations.json'));
  const picks = JSON.parse(read(id, 'picks.json'));

  test(`${id}: waveforms parse into evenly timed traces for every station`, () => {
    const buf = read(id, 'waveforms.mseed');
    const from = event.timeMs - WAVE_RACE.preOriginSec * 1000;
    const to = event.timeMs + WAVE_RACE.postOriginSec * 1000;
    const traces = parseMiniseed(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.length),
      { fromMs: from, toMs: to });
    const expected = stations.reduce((n, s) => n + s.channels.length, 0);
    assert.equal(traces.length, expected);
    for (const t of traces) {
      assert.equal(t.startMs, from);
      assert.equal(t.data.length, Math.round(((to - from) / 1000) * t.sampleRate));
      const good = t.data.filter((v) => !Number.isNaN(v)).length;
      assert.ok(good > 0.9 * t.data.length, `${t.sta}.${t.cha} mostly present`);
      for (const f of FILTERS) {
        const y = filteredData(t, f);
        assert.equal(y.length, t.data.length);
        assert.ok(y.some((v) => Number.isFinite(v) && v !== 0), `${t.sta}.${t.cha} ${f.id} not flat`);
      }
    }
  });

  test(`${id}: app station choice matches the sample`, () => {
    const { stations: chosen } = selectStations(event, stations, SCHOOLS, WAVE_RACE);
    assert.deepEqual(chosen.map((s) => s.sta).sort(), stations.map((s) => s.sta).sort());
  });

  test(`${id}: analyst S-P times locate the quake within 10 km (roadmap target)`, () => {
    const by = picksByStation(picks);
    const obs = stations.filter((s) => by[`${s.net}.${s.sta}`]?.P && by[`${s.net}.${s.sta}`]?.S)
      .map((s) => {
        const p = by[`${s.net}.${s.sta}`];
        return { lat: s.lat, lon: s.lon,
          distKm: spToDistanceKm((p.S - p.P) / 1000, WAVE_RACE.vp, WAVE_RACE.vs) };
      });
    assert.ok(obs.length >= 3, `need 3 stations with P and S, have ${obs.length}`);
    const fit = locateGrid(obs, { depthKm: WAVE_RACE.depthKm,
      sigmaKm: WAVE_RACE.pickUncertaintySec * kmPerSecond(WAVE_RACE.vp, WAVE_RACE.vs) });
    const err = distanceKm(fit.lat, fit.lon, event.lat, event.lon);
    assert.ok(err < 10, `error ${err.toFixed(1)} km`);
  });
}
