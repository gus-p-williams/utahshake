# School Shake Viewer notes

How the [School Shake Viewer](../apps/shake-viewer.md) works inside. It is a prototype under
[In development](adding-an-app.md#in-development) (session D11-viewer-proto, 2026-11-25), built
from the "file-first viewer" in the feasibility review of a school Shake viewer
(`planning/review-shake-viewer.md` on GitHub, steps V1 and V2). Size M: no experiment mode yet.

## Files

```
docs/app/shake-viewer/index.html     the page (top bar with the Prototype badge, five cards, note colors)
docs/app/js/shake-viewer/
  app.js                             controller: the three data paths, the day, zoom, notes, CSV
  helicorder-view.js                 the 24-hour helicorder (canvas): notes, shading, click and keys
  noise-view.js                      hourly noise bars (canvas)
  config.js                          stand-in stations (channel, position), the example, filters
docs/app/js/lib/day-view.js          pure logic: local days, geometry, notes files, arrivals, CSV
docs/app/js/lib/mseed-index.js       miniSEED headers: record times, gaps, coverage, seek, ranges
docs/app/js/data/uhsn.js             UHSNSource: the UHSN data layout (see Data sources)
docs/app/data/notes/heb-example.json the example notes (bell times in Heber City)
docs/app/data/uhsn-demo/v1/          the test folder in the UHSN layout (made by a script)
tools/uhsn-test/make-tree.mjs        makes a test folder from University of Utah data
tools/figures/shake-viewer-screens.mjs  the guide's screenshots (apps/img/sv-*.png)
tests/day-view.test.js, mseed-index.test.js, uhsn-source.test.js, uhsn-demo-tree.test.js
```

It reuses: `lib/helicorder.js` (lines, pen, gaps), `lib/carpet.js` (`stepLevels`, the noise
measure), Quake Explorer's `SpectrogramView` and `lib/spectral.js` (`stft`), `ui/trace-view.js`,
`data/mseed.js` (seisplotjs's miniSEED parser) and the new `filteredLong` in `data/filters.js`
(a day filtered at once: gaps bridged, filtered, put back; the spec's shared processing).
`TraceView` and `SpectrogramView` gained an `axisUnit` option ("s after 12:15:00 PM" instead of
"s after origin"); the default is unchanged.

## Data paths

| Choice | Where from | How |
| --- | --- | --- |
| A day file from the Shake | The teacher's device | `File.arrayBuffer()` → `parseMiniseed`; several files are merged per channel; nothing leaves the browser |
| A Utah station | EarthScope | `EarthScopeUSGSSource.getWaveforms` for the local day (two UTC days, one request) |
| School Shakes | The test folder, or `?uhsn=<base>` | `UHSNSource.getWaveforms` ([Data sources](data-sources.md#uhsn)); with `?uhsn=`, the panel adds "Data paused" when the server's `index.json` is more than an hour old (`publishState`, spec 7.5). The bundled folder is a fixed snapshot, so not there |

None reads Raspberry Shake's servers (CLAUDE.md, constraint 1). Quakes come from the USGS
catalog; travel times from Quake Locator's speeds (within 150 km) or the iasp91 table.

**Which 24 hours.** A day chosen by date is a local day, midnight to midnight Mountain time
(`localDay`; 23 or 25 hours when the clocks change). A file shows its UTC day first, as the
Shake keeps it, and offers the local days its data touch. The record is cut to the window, so
sample 0 is the window's start, which is always on the hour (the hourly levels line up).

**Nothing loads until a button is pressed** (Gus, 2026-11-25). **Try the example** opens HEB on
November 17, 2026 from the test folder that comes with the site, so it downloads nothing from
EarthScope (if `?uhsn=` points at a server without HEB, it falls back to EarthScope).

**Address options.** `?source=file|uu|uhsn`, `&station=UU.HEB`, `&date=2026-11-17` fill in the
choices and wait for a click; `&uhsn=` a base address ending in `/` reads another server in the
UHSN layout. The page rewrites the address after each load, so a tester can send a link to what
they see.

## The helicorder

`HelicorderView` draws the lines once per size, theme, record and scale into an off-screen
canvas, then on each frame: note spans behind, the record, the "not published yet" shading,
note ticks and P/S marks, the zoom window (yellow), the pointer. The pen scale is
`countsPerLine(background, gain)`: the background is the median of the day's one-minute RMS
values, so the usual shaking fills about a tenth of the line spacing, as on the science page's
helicorder; **Size − +** changes `gain` by 1.5×.

On-plot labels (D35): the helicorder's label sits in a 38 px strip above the first line, the
noise chart's likewise, the zoom trace's just above it, and the spectrogram keeps its own.
Keyboard: arrows move a cursor (one minute, Shift five; up and down a line), Enter zooms or
places a note, Escape cancels placing; a hidden status line reads the time.

## Notes

A note is `{id, start, end, kind, label, source, p, s}`, times in ms (UTC). Kinds, in legend
order: school, traffic, event, experiment, quake, weather, station, other (the review's section
4.1); colors are CSS variables `--note-<kind>` in the page. The file (`notesFile`,
`parseNotesFile`):

```json
{ "version": 1, "format": "uhsn-notes", "station": "UU.HEB", "title": "…",
  "notes": [ { "start": "2026-11-17T15:00:00.000Z", "end": null, "kind": "school",
               "label": "Wasatch High School: 1st period starts (8:00)", "source": "…" } ] }
```

Notes are kept per station in `localStorage` (`uhsn.shakeViewer.notes.<NET.STA>`) and in the
file the teacher downloads; opening a file merges by `id`. Labels are cut to 120 characters
with control characters removed and are always escaped. No student data: the page says so where
notes are written. The example's bell times are sourced in each note and in
`planning/shake-viewer-sources.md`.

## The test folder

`node tools/uhsn-test/make-tree.mjs --demo` writes `docs/app/data/uhsn-demo/v1/` (about 4 MB):
UU.HEB.01.EHZ from 12:00 UTC on November 17, 2026 to 04:00 UTC on November 18, published up
to 04:00 (9 pm Mountain time), so it crosses UTC midnight and ends partway through a day. Its
records are copied byte for byte from EarthScope (whose answers trim the first and last record
to the window, so the script drops those). It keeps UU codes (`net` "UU", `loc` "01") and
`model` "test: UU station", where a real tree has `AM` codes and a Raspberry Shake model; see
its `ABOUT.txt`. Without `--demo` it writes any stations and span to
`tools/uhsn-test/out/` (git-ignored); `tools/uhsn-test/README.md` has the options.

## Checks

`npm test` runs `day-view.test.js` (time zones, geometry, levels, notes files including the
example's labels against their times, arrivals, CSV), `mseed-index.test.js` (against
seisplotjs on a real sample), `uhsn-source.test.js` (a made-up folder across midnight, with
and without `Range`), `uhsn-demo-tree.test.js` (the test folder against the spec) and
`uhsn-check-tree.test.js` (the checker for DRI's server on the test folder). After
regenerating the test folder, run `node tools/uhsn-test/check-tree.mjs docs/app/data/uhsn-demo/v1`.
Try the page with `node tools/serve.mjs` and open `/app/shake-viewer/`.
