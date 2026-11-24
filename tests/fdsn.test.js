import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  fdsnTime, parseUsgsGeoJson, parseStationText, chooseChannels, dataselectPostBody,
  parseQuakeMLPicks, picksByStation,
} from '../docs/app/js/lib/fdsn.js';

const HEADER = '#Network | Station | Location | Channel | Latitude | Longitude | Elevation | Depth | Azimuth | Dip | SensorDescription | Scale | ScaleFreq | ScaleUnits | SampleRate | StartTime | EndTime';
const row = (sta, loc, cha, sr = 100) =>
  `UU|${sta}|${loc}|${cha}|39.18233|-111.64467|2357.0|1.0|0|-90|Sensor|1e9|1|M/S|${sr}|2024-05-29T00:00:00|`;

test('fdsnTime drops the Z', () => {
  assert.equal(fdsnTime(Date.UTC(2026, 9, 31, 4, 44, 15, 580)), '2026-10-31T04:44:15.580');
});

test('station text is grouped by station', () => {
  const txt = [HEADER, row('SGU', '01', 'HHZ'), row('SGU', '01', 'HHN'), row('SGU', '01', 'ENZ'),
    row('ELU', '01', 'EHZ'), ''].join('\n');
  const st = parseStationText(txt);
  assert.equal(st.length, 2);
  const sgu = st.find((s) => s.sta === 'SGU');
  assert.equal(sgu.channels.length, 3);
  assert.equal(sgu.lat, 39.18233);
  assert.equal(sgu.channels[0].sampleRate, 100);
});

test('chooseChannels prefers a 3-component broadband, Z first', () => {
  const st = parseStationText([HEADER, row('A', '01', 'EHZ'), row('A', '01', 'HHE'),
    row('A', '01', 'HHZ'), row('A', '01', 'HHN')].join('\n'))[0];
  assert.deepEqual(chooseChannels(st), { loc: '01', band: 'HH', channels: ['HHZ', 'HHN', 'HHE'] });
});

test('chooseChannels accepts 1/2 horizontals and single verticals; rejects accelerometers', () => {
  const a = parseStationText([HEADER, row('B', '02', 'EHZ'), row('B', '02', 'EH1'), row('B', '02', 'EH2')].join('\n'))[0];
  assert.deepEqual(chooseChannels(a).channels, ['EHZ', 'EH1', 'EH2']);
  const b = parseStationText([HEADER, row('C', '01', 'EHZ')].join('\n'))[0];
  assert.deepEqual(chooseChannels(b).channels, ['EHZ']);
  const c = parseStationText([HEADER, row('D', '01', 'ENZ')].join('\n'))[0];
  assert.equal(chooseChannels(c), null);
});

test('dataselect POST body: one line per channel, -- for empty location', () => {
  const body = dataselectPostBody([{ net: 'UU', sta: 'SGU', loc: '01', cha: 'HHZ' },
    { net: 'UU', sta: 'X', loc: '', cha: 'EHZ' }], Date.UTC(2026, 0, 1), Date.UTC(2026, 0, 1, 0, 1, 30));
  assert.equal(body, 'UU SGU 01 HHZ 2026-01-01T00:00:00.000 2026-01-01T00:01:30.000\n' +
    'UU X -- EHZ 2026-01-01T00:00:00.000 2026-01-01T00:01:30.000\n');
});

test('USGS GeoJSON event list and single event', () => {
  const feature = {
    type: 'Feature', id: 'uu80162166',
    properties: { time: 1793508255580, mag: 3.3, magType: 'ml', place: '8 km NW of Junction, Utah',
      url: 'https://earthquake.usgs.gov/earthquakes/eventpage/uu80162166', types: ',origin,phase-data,' },
    geometry: { type: 'Point', coordinates: [-112.29, 38.29, 3.96] },
  };
  const [e] = parseUsgsGeoJson({ type: 'FeatureCollection', features: [feature] });
  assert.equal(e.id, 'uu80162166');
  assert.equal(e.lat, 38.29);
  assert.equal(e.lon, -112.29);
  assert.equal(e.depthKm, 3.96);
  assert.equal(e.hasPhaseData, true);
  assert.equal(parseUsgsGeoJson(feature)[0].place, '8 km NW of Junction, Utah');
});

const QUAKEML = `<q:quakeml><eventParameters><event>
   <pick publicID="quakeml:uu.anss.org/Arrival/UU/1">
    <time>
     <value>2026-10-31T04:44:20.38</value>
     <uncertainty>0.06</uncertainty>
    </time>
    <waveformID networkCode="UU" stationCode="MSU" channelCode="EHZ" locationCode="01" />
   </pick>
   <pick publicID="quakeml:uu.anss.org/Arrival/UU/2">
    <time><value>2026-10-31T04:44:23.10</value></time>
    <waveformID networkCode="UU" stationCode="MSU" channelCode="EHZ" locationCode="01" />
   </pick>
   <origin><arrival publicID="a1"><pickID>quakeml:uu.anss.org/Arrival/UU/1</pickID><phase>P</phase></arrival>
   <arrival publicID="a2"><pickID>quakeml:uu.anss.org/Arrival/UU/2</pickID><phase>S</phase></arrival></origin>
</event></eventParameters></q:quakeml>`;

test('QuakeML picks with phases from arrivals; times are UTC', () => {
  const picks = parseQuakeMLPicks(QUAKEML);
  assert.equal(picks.length, 2);
  assert.deepEqual(picks[0], { net: 'UU', sta: 'MSU', loc: '01', cha: 'EHZ', phase: 'P',
    timeMs: Date.UTC(2026, 9, 31, 4, 44, 20, 380), uncertaintySec: 0.06 });
  assert.equal(picks[1].phase, 'S');
  assert.equal(picks[1].uncertaintySec, null);
  const by = picksByStation(picks);
  assert.ok(Math.abs(by['UU.MSU'].S - by['UU.MSU'].P - 2720) < 1e-6);
});
