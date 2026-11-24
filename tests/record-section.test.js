// Station metadata kept for Quake Explorer, and choosing record-section stations.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseStationText, chooseChannels, channelInfo, ACCEL_BANDS } from '../docs/app/js/lib/fdsn.js';
import { selectRecordSection } from '../docs/app/js/lib/stations.js';
import { destination } from '../docs/app/js/lib/geo.js';

const HEADER = '#Network | Station | Location | Channel | Latitude | Longitude | Elevation | Depth | Azimuth | Dip | SensorDescription | Scale | ScaleFreq | ScaleUnits | SampleRate | StartTime | EndTime';

test('station text keeps direction, sensitivity and units', () => {
  const txt = [HEADER,
    'UU|SGU|01|HHZ|39.18|-111.64|2357.0|1.0|0|-90|Nanometrics Trillium Horizon 120|4.81E8|1.0|M/S|100.0|2024-05-29T00:00:00|',
    'UU|SGU|01|HHN|39.18|-111.64|2357.0|1.0|0|0|Nanometrics Trillium Horizon 120|4.81E8|1.0|M/S|100.0|2024-05-29T00:00:00|',
    'UU|ELU|01|EHZ|39.55|-111.46|1700.0|0.0|0|-90|L-4C|5.54E9|5.0|m|100.0|2010-01-01T00:00:00|',
    'RE|EACA|00|HH1|40.0|-111.0|1500|0|6|0|STS|1E9|1|M/S|100|2020-01-01T00:00:00|',
  ].join('\n');
  const st = parseStationText(txt);
  const sgu = st.find((s) => s.sta === 'SGU');
  assert.deepEqual(sgu.channels[0], { loc: '01', cha: 'HHZ', sampleRate: 100, azimuth: 0, dip: -90,
    sensor: 'Nanometrics Trillium Horizon 120', sensitivity: 4.81e8, sensitivityFreq: 1, units: 'M/S' });
  const elu = st.find((s) => s.sta === 'ELU');
  assert.equal(elu.channels[0].units, 'M'); // upper-cased
  assert.equal(st.find((s) => s.sta === 'EACA').channels[0].azimuth, 6);
});

test('channelInfo returns metadata in chooseChannels order; accelerometers on request', () => {
  const row = (cha, az, dip) => `UU|A|01|${cha}|39|-111|1500|0|${az}|${dip}|S|1e9|1|M/S|100|2020-01-01T00:00:00|`;
  const [st] = parseStationText([HEADER, row('HHE', 90, 0), row('HHZ', 0, -90), row('HHN', 0, 0),
    row('HNZ', 0, -90), row('HNN', 0, 0), row('HNE', 90, 0)].join('\n'));
  const ch = chooseChannels(st);
  assert.deepEqual(ch.channels, ['HHZ', 'HHN', 'HHE']);
  assert.deepEqual(channelInfo(st, ch).map((c) => [c.cha, c.azimuth]), [['HHZ', 0], ['HHN', 0], ['HHE', 90]]);
  assert.deepEqual(chooseChannels(st, { bands: ACCEL_BANDS }).channels, ['HNZ', 'HNN', 'HNE']);
});

const ev = { lat: 39, lon: -112 };
const mk = (sta, az, dist, chans = ['HHZ', 'HHN', 'HHE']) => {
  const p = destination(ev.lat, ev.lon, az, dist);
  return { net: 'UU', sta, lat: p.lat, lon: p.lon, elevM: 1500,
    channels: chans.map((cha) => ({ loc: '01', cha, sampleRate: 100 })) };
};

test('record section: one station per distance band, sorted by distance', () => {
  // A cluster of 6 stations at 50-60 km (like FORGE) must not crowd out the far ones.
  const cluster = [0, 1, 2, 3, 4, 5].map((i) => mk(`C${i}`, 40 * i, 50 + 2 * i));
  const spread = [10, 30, 90, 140, 190, 240, 290].map((d, i) => mk(`S${d}`, 70 * i, d));
  const { stations, bandsFilled, bandsTotal } = selectRecordSection(ev, [...cluster, ...spread],
    { maxKm: 300, bandKm: 25 });
  assert.equal(bandsTotal, 12);
  const d = stations.map((s) => s.distKm);
  assert.deepEqual(d, [...d].sort((a, b) => a - b));
  assert.equal(stations.filter((s) => s.sta.startsWith('C')).length, 1); // 50-60 km: one band
  assert.equal(stations.length, 8);
  assert.equal(bandsFilled, 8);
  assert.ok(stations.every((s) => s.role === 'section' && s.chanInfo.length === s.channels.length));
});

test('record section: analyst-picked, then 3-component, wins in a band; schools always in', () => {
  const stations = [
    mk('Z1', 0, 101, ['EHZ']), mk('THREE', 90, 110), mk('PICKED', 180, 120, ['EHZ']),
    mk('SCHOOL', 270, 105, ['EHZ']), mk('TOOFAR', 0, 400),
  ];
  const schools = [{ name: 'Our School', standIn: { net: 'UU', sta: 'SCHOOL' } }];
  const a = selectRecordSection(ev, stations, { maxKm: 300, bandKm: 50, schools });
  assert.deepEqual(a.stations.map((s) => s.sta).sort(), ['SCHOOL', 'THREE']);
  const b = selectRecordSection(ev, stations, { maxKm: 300, bandKm: 50,
    prefer: new Map([['UU.PICKED', 0]]) });
  assert.deepEqual(b.stations.map((s) => s.sta), ['PICKED']);
  const sc = a.stations.find((s) => s.sta === 'SCHOOL');
  assert.equal(sc.role, 'school');
  assert.deepEqual(sc.schools, ['Our School']);
  // back-azimuth points from the station back to the quake (station is due west -> 90°)
  assert.ok(Math.abs(sc.bazDeg - 90) < 1, `baz ${sc.bazDeg}`);
});
