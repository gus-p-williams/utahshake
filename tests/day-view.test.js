// The School Shake Viewer's logic (docs/app/js/lib/day-view.js): local days and clock changes,
// helicorder geometry, noise levels, notes files (including the HEB example), quake arrivals and
// the CSV of a window.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as DV from '../docs/app/js/lib/day-view.js';

const H = 3600000;
const utc = (s) => Date.parse(s);

test('local days in Mountain time, including the days the clocks change', () => {
  assert.equal(DV.tzOffsetMin(utc('2026-11-17T12:00:00Z')), -420); // MST
  assert.equal(DV.tzOffsetMin(utc('2026-07-01T12:00:00Z')), -360); // MDT
  assert.equal(DV.localMidnight('2026-11-17'), utc('2026-11-17T07:00:00Z'));
  assert.equal(DV.localMidnight('2026-07-01'), utc('2026-07-01T06:00:00Z'));
  const spring = DV.localDay('2026-03-08'); // clocks go forward: 23 hours
  assert.equal((spring.endMs - spring.startMs) / H, 23);
  const fall = DV.localDay('2026-11-01'); // clocks go back: 25 hours
  assert.equal((fall.endMs - fall.startMs) / H, 25);
  assert.equal(DV.localDate(utc('2026-11-18T03:59:00Z')), '2026-11-17'); // 8:59 pm the day before
  assert.equal(DV.localDateTime('2026-11-17', '08:00'), utc('2026-11-17T15:00:00Z'));
  assert.equal(DV.localDateTime('2026-11-17', '14:31:05'), utc('2026-11-17T21:31:05Z'));
  assert.ok(Number.isNaN(DV.localDateTime('2026-11-17', 'noon')));
  assert.equal(DV.localTimeString(utc('2026-11-17T21:31:05Z')), '14:31:05');
  assert.deepEqual(DV.utcDay(utc('2026-11-17T23:59:59Z')), { startMs: utc('2026-11-17T00:00:00Z'), endMs: utc('2026-11-18T00:00:00Z') });
  assert.equal(DV.addDays('2026-12-31', 1), '2027-01-01');
});

test('helicorder geometry: a point to a moment and back, spans across lines', () => {
  const rowMs = 1800000;
  const rows = [0, 1, 2].map((i) => ({ startMs: i * rowMs, endMs: (i + 1) * rowMs }));
  rows[2].endMs = 2 * rowMs + rowMs / 2; // a short last line
  const L = { left: 70, top: 38, plotW: 1000, rowH: 15, rowMs, rows };
  assert.deepEqual(DV.timeAtPoint(70 + 250, 38 + 15 + 3, L), { row: 1, ms: rowMs + rowMs / 4 });
  assert.equal(DV.timeAtPoint(70 + 900, 38 + 2 * 15 + 3, L), null); // past the end of the short line
  assert.equal(DV.timeAtPoint(70, 20, L), null); // the hint's strip above the lines
  assert.deepEqual(DV.pointAtTime(rowMs * 1.5, rows, rowMs), { row: 1, f: 0.5 });
  assert.equal(DV.pointAtTime(3 * rowMs, rows, rowMs), null);
  // a span from the middle of line 0 to a quarter into line 1
  assert.deepEqual(DV.spanSegments(rowMs / 2, rowMs * 1.25, rows, rowMs), [{ row: 0, f0: 0.5, f1: 1 }, { row: 1, f0: 0, f1: 0.25 }]);
  // a moment: f0 === f1
  assert.deepEqual(DV.spanSegments(rowMs / 4, null, rows, rowMs), [{ row: 0, f0: 0.25, f1: 0.25 }]);
});

test('zoom window: centered, kept inside the day', () => {
  assert.deepEqual(DV.zoomWindow(1000000, 300, 0, 86400000), { startMs: 850000, endMs: 1150000 });
  assert.deepEqual(DV.zoomWindow(10000, 300, 0, 86400000), { startMs: 0, endMs: 300000 });
  assert.deepEqual(DV.zoomWindow(86399000, 300, 0, 86400000), { startMs: 86100000, endMs: 86400000 });
  assert.deepEqual(DV.zoomWindow(500, 3600, 0, 1000), { startMs: 0, endMs: 1000 }); // longer than the day
});

test('background and hourly levels (the carpet measure), and the pen scale', () => {
  const sr = 10;
  const data = new Float32Array(2 * 3600 * sr);
  // hour 1 is three times as loud as hour 0; a square wave of ±a has RMS a
  for (let i = 0; i < data.length; i++) data[i] = (i % 2 ? 1 : -1) * (i < 3600 * sr ? 1 : 3);
  const lv = DV.hourlyLevels(data, sr);
  assert.equal(lv.length, 2);
  assert.ok(Math.abs(lv[0] - 1) < 1e-6 && Math.abs(lv[1] - 3) < 1e-6, String(lv));
  // half of the minutes at 1, half at 3: the median falls between
  const bg = DV.backgroundLevel(data, sr);
  assert.ok(bg >= 1 && bg <= 3, String(bg));
  assert.ok(Number.isNaN(DV.backgroundLevel(new Float32Array(30 * sr), sr)), 'less than a minute');
  // a missing hour is NaN
  data.fill(NaN, 0, 3600 * sr);
  assert.ok(Number.isNaN(DV.hourlyLevels(data, sr)[0]));
  assert.ok(Math.abs(DV.countsPerLine(2, 1) - (3.5 * 2) / 0.12) < 1e-9);
  assert.equal(DV.countsPerLine(2, 2), DV.countsPerLine(2, 1) / 2);
  assert.equal(DV.countsPerLine(NaN), DV.countsPerLine(1)); // no level: a safe default
});

test('notes: checked when made, read and written as a file, no control characters', () => {
  const n = DV.makeNote({ start: '2026-11-17T15:00:00Z', end: '2026-11-17T15:30:00Z', kind: 'school', label: '  First\nbell\u0007 ' });
  assert.equal(n.start, utc('2026-11-17T15:00:00Z'));
  assert.equal(n.label, 'First bell');
  assert.equal(DV.makeNote({ start: 'not a time' }), null);
  assert.equal(DV.makeNote({ start: 2000, end: 1000 }), null, 'end before start');
  assert.equal(DV.makeNote({ start: 1000, end: 1000 }).end, null, 'zero length is a moment');
  assert.equal(DV.makeNote({ start: 1000, kind: 'party' }).kind, 'other');
  assert.equal(DV.makeNote({ start: 1000, label: 'x'.repeat(500) }).label.length, DV.MAX_LABEL);

  const file = DV.notesFile({ station: 'UU.HEB', title: 't', notes: [n, DV.makeNote({ start: 0, kind: 'quake', label: 'q', p: 5000, s: 9000 })], generatedMs: 0 });
  assert.equal(file.version, 1);
  assert.equal(file.format, 'uhsn-notes');
  assert.equal(file.notes[0].start, '1970-01-01T00:00:00.000Z', 'sorted by time');
  assert.equal(file.notes[0].p, '1970-01-01T00:00:05.000Z');
  const back = DV.parseNotesFile(JSON.stringify(file));
  assert.equal(back.station, 'UU.HEB');
  assert.equal(back.notes.length, 2);
  assert.equal(back.notes[1].label, 'First bell');
  assert.equal(back.notes[0].s, 9000);

  assert.throws(() => DV.parseNotesFile('{nope'), /not JSON/);
  assert.throws(() => DV.parseNotesFile({ version: 1 }), /no "notes"/);
  assert.throws(() => DV.parseNotesFile({ version: 2, notes: [] }), /version 2/);
  const some = DV.parseNotesFile({ version: 1, notes: [{ start: 'x' }, null, { start: '2026-01-01T00:00:00Z' }] });
  assert.equal(some.notes.length, 1);
  assert.equal(some.skipped, 2);
});

test('notes in a window: spans that overlap, moments inside, quakes up to their S', () => {
  const notes = [
    DV.makeNote({ start: 0, end: 100 }),
    DV.makeNote({ start: 500 }),
    DV.makeNote({ start: 900, kind: 'quake', p: 1050, s: 1200 }),
  ];
  assert.equal(DV.notesInWindow(notes, 50, 600).length, 2);
  assert.equal(DV.notesInWindow(notes, 1100, 2000).length, 1, 'a quake whose S arrives in the window');
  assert.equal(DV.notesInWindow(notes, 2000, 3000).length, 0);
});

test('the HEB example notes: school bell times on Tuesday, November 17, 2026, each with its source', () => {
  const f = DV.parseNotesFile(fs.readFileSync(new URL('../docs/app/data/notes/heb-example.json', import.meta.url), 'utf8'));
  assert.equal(f.station, 'UU.HEB');
  assert.equal(f.skipped, 0);
  assert.ok(f.notes.length >= 4);
  for (const n of f.notes) {
    assert.equal(DV.localDate(n.start), '2026-11-17', n.label);
    assert.match(n.source, /wasatch\.edu/, `${n.label}: cites the district's page`);
    // the clock time in the label matches the stored time (12-hour, as the schedules print it)
    const [, hh, mm] = /\((\d{1,2}):(\d{2})/.exec(n.label) ?? [];
    assert.ok(hh, `${n.label}: shows its time`);
    const [h24, m] = DV.localTimeString(n.start).split(':').map(Number);
    assert.equal(`${((h24 + 11) % 12) + 1}:${String(m).padStart(2, '0')}`, `${Number(hh)}:${mm}`, n.label);
  }
});

test('expected P and S: straight lines near the station, the iasp91 table far away', () => {
  const st = { lat: 40.5015, lon: -111.3358 };
  const near = { timeMs: 0, lat: 40.5015 + 0.5, lon: -111.3358, depthKm: 8 }; // about 56 km north
  const a = DV.predictedArrivals(near, st, { vp: 5.8, vs: 3.3 });
  assert.equal(a.model, 'straight');
  const hyp = Math.hypot(a.distKm, 8);
  assert.ok(Math.abs(a.pMs - (hyp / 5.8) * 1000) < 1e-6 && Math.abs(a.sMs - (hyp / 3.3) * 1000) < 1e-6);
  const table = JSON.parse(fs.readFileSync(new URL('../docs/app/data/traveltimes-iasp91.json', import.meta.url), 'utf8'));
  const far = { timeMs: 0, lat: 35.7, lon: 139.7, depthKm: 30 }; // Tokyo, about 78°
  const b = DV.predictedArrivals(far, st, { vp: 5.8, vs: 3.3, table });
  assert.equal(b.model, 'iasp91');
  assert.ok(b.pMs > 10 * 60000 && b.pMs < 13 * 60000, `P after ${b.pMs / 60000} min`);
  assert.ok(b.sMs > b.pMs);
  assert.equal(DV.predictedArrivals(far, st, { vp: 5.8, vs: 3.3 }), null, 'far, and no table');
  assert.equal(DV.predictedArrivals(near, { lat: undefined, lon: undefined }, { vp: 5.8, vs: 3.3 }), null, 'station position unknown');
  const q = DV.quakeNote({ id: 'uu1', timeMs: 0, lat: near.lat, lon: near.lon, depthKm: 8, mag: 2.34, place: '5 km N of X, Utah', eventType: 'earthquake' }, st, { vp: 5.8, vs: 3.3 });
  assert.equal(q.kind, 'quake');
  assert.equal(q.id, 'usgs-uu1');
  assert.match(q.label, /^M2\.3 5 km N of X, Utah, 56 km away$/);
  assert.ok(q.p > 0 && q.s > q.p);
  const blast = DV.quakeNote({ id: 'uu2', timeMs: 0, lat: 1, lon: 1, mag: null, place: 'Y', eventType: 'quarry blast' }, null, {});
  assert.match(blast.label, /^M\? Y \(quarry blast\)$/);
  assert.equal(blast.p, null);
});

test('CSV of a window: one row per sample, missing samples empty, notes after the table', () => {
  const trace = { net: 'UU', sta: 'HEB', loc: '01', cha: 'EHZ', sampleRate: 100, startMs: utc('2026-11-17T15:00:00Z'), data: Float32Array.from({ length: 1000 }, (_, i) => i) };
  trace.data[3] = NaN;
  const filtered = Float32Array.from(trace.data, (v) => v / 2);
  const { lines, rows, capped } = DV.windowCsv({ trace, filtered, filterLabel: '1–10 Hz', startMs: trace.startMs + 10, endMs: trace.startMs + 60, notes: ['credit, with a comma'] });
  assert.equal(rows, 5);
  assert.equal(capped, false);
  assert.equal(lines[0], 'time_utc,seconds,counts,filtered_counts');
  assert.equal(lines[1], '2026-11-17T15:00:00.010Z,0.00,1,0.50');
  assert.equal(lines[3], '2026-11-17T15:00:00.030Z,0.02,,', 'a missing sample');
  assert.equal(lines[6], '');
  assert.ok(lines.some((l) => l === '"# credit, with a comma"'));
  assert.ok(lines.some((l) => l.startsWith('# channel,UU.HEB.01.EHZ')));
  const raw = DV.windowCsv({ trace, startMs: trace.startMs, endMs: trace.startMs + 20 });
  assert.equal(raw.lines[0], 'time_utc,seconds,counts');
  assert.equal(raw.rows, 2);
  assert.equal(DV.csvFileName(trace, trace.startMs), 'shake-viewer-UU.HEB.01.EHZ-20261117T150000Z.csv');
});
