# Architecture

The apps are **static web pages written as plain ES modules**. There is no build step for the
app itself: what is in `docs/app/` is exactly what the browser runs, so students can read and
change the code. MkDocs builds the guides, copies `docs/app/` unchanged, and GitHub Actions
publishes both to GitHub Pages.

This page covers what all the apps share. How a single app works inside is under App notes,
for example [Wave Race notes](wave-race.md).

```
docs/app/
  index.html               app list
  wave-race/index.html     Wave Race page
  wave-animation/index.html  Quake Waves (cartoon; ?embed=1 inside a docs page; folder rename pending)
  wave-motion/index.html   How P and S move rock (cartoon embedded in Seismic waves)
  css/app.css              shared styles (light and dark)
  js/
    config.js              schools, stand-in stations, defaults, presets, credits
    lib/                   pure logic, no browser APIs; tested with node --test
      geo.js               distances, azimuths, local projection
      locate.js            S-P distance, grid-search epicenter, misfit, uncertainty
      fdsn.js              parsers for USGS GeoJSON, FDSN station text, QuakeML picks
      stations.js          which stations to show for a quake
      signal.js            gaps, tapers, min/max per pixel, dead-channel check
      wave-sim.js          cartoon arrivals and seismograms for Quake Waves
      wave-motion.js       pulse shape and rock displacement for the P/S motion cartoon
    data/
      datasource.js        the DataSource interface; picks a source from the URL
      earthscope-usgs.js   live source: USGS events + EarthScope stations/waveforms
      sample-source.js     offline source: files in data/samples/
      mseed.js             miniSEED -> traces (vendored seisplotjs)
      filters.js           Butterworth band-pass (vendored seisplotjs)
    ui/
      trace-view.js        canvas seismogram with zoom, pan, picks
      map-view.js          Leaflet map: stations, circles, epicenters, the student's pin
    wave-race/app.js       the Wave Race page controller
    wave-animation/app.js  the Quake Waves animation (canvas)
    wave-motion/app.js     the P/S rock-motion animation (canvas)
  vendor/                  seisplotjs + Leaflet bundles (generated; see below)
  data/samples/<event>/    offline sample: event, stations, picks, waveforms.mseed
tests/                     node --test, including real-data checks on the sample
tools/
  vendor/                  esbuild script that regenerates docs/app/vendor/
  samples/fetch-sample.mjs bundles a quake for offline use
  figures/                 figures for the guides and The Science (see below)
  serve.mjs                tiny local server for docs/
```

## Data access

All data goes through a **DataSource** object (`js/data/datasource.js`), never straight to a web
service. Swapping in the UHSN school Shakes later means writing a `UHSNSource` with the same
methods and changing `SCHOOLS[].standIn` in `config.js`. See [Data sources](data-sources.md).
For one app's calls in order, see [Data flow in Wave Race](wave-race.md#data-flow-in-wave-race).

## Running locally

```bash
node tools/serve.mjs          # apps only: http://127.0.0.1:8001/app/
mkdocs serve                  # full site with guides: http://127.0.0.1:8000/
npm test                      # unit + sample tests (Node 22+)
```

Each app may take options in its page address; Wave Race's are in
[Wave Race notes](wave-race.md#page-address-options).

## Vendored libraries

[seisplotjs](https://github.com/crotwell/seisplotjs) 3.3.0 (MIT) parses miniSEED and builds
the Butterworth filters. [Leaflet](https://leafletjs.com) 1.9.4 (BSD-2-Clause) draws the map.
Both are bundled as single ES modules in `docs/app/vendor/`, with their licenses in
`THIRD_PARTY_LICENSES.txt`. Only the seisplotjs `miniseed` and `filter` modules are bundled
(about 400 KB). To change versions:

```bash
cd tools/vendor
# edit versions in package.json
npm install
npm run build
```

The seisplotjs bundle registers a web component when it loads, so code that imports it in
Node must first define `globalThis.HTMLElement` and `globalThis.customElements` (see
`tests/sample.test.js`).

## The animation in a docs page

`docs/theory/locating.md` embeds Quake Waves (`app/wave-animation/?embed=1`, folder rename
pending) in an `<iframe>`. In embed mode the page hides its header and fills the frame.
Because the docs and the app are on the same site, the animation reads the docs' light/dark
switch (`data-md-color-scheme`) and sets `data-theme` on its own `<html>`; `app.css` honours
`data-theme` before the device setting. Follow the same pattern to embed other animations;
`docs/theory/waves.md` embeds the P/S rock-motion cartoon (`app/wave-motion/?embed=1`) the
same way. `tests/doc-links.test.js` checks the iframe addresses.

## Figures in the docs

The figures in `docs/apps/img/` and `docs/theory/img/` are made by scripts in
`tools/figures/`, so they can be rebuilt when the apps or the data change. Seismogram figures
use the offline sample and the app's own parser and filter; diagrams and maps use the app's
`lib/` code (for example `locate.js`), so they match what the apps compute. Each script writes
the same bytes every time it runs.

| Script | Makes | Needs |
| --- | --- | --- |
| `trace-figures.mjs` | `apps/img/picking-*.svg` (Wave Race guide) | Node only |
| `science-traces.mjs` | `theory/img/seismogram-anatomy.svg`, `s-minus-p-worked-example.svg` | Node only |
| `science-record-section.mjs` | `theory/img/record-section.svg` | Node only |
| `science-diagrams.mjs` | `theory/img/depth-triangle.svg`, `circles-1-2-3.svg` | Node only |
| `science-locating.mjs` | `theory/img/residuals.svg`, `misfit-map.svg`, `station-geometry.svg` | Node only |
| `science-maps.mjs` | `theory/img/schools-map.svg` | Node only |
| `seismogram-figures.mjs` | the real-data figures on Reading a seismogram (`theory/img/ocean-hum.svg`, `wind-noise.svg`, `people-week.svg`, `three-quakes.svg`, `blast-*.svg`, `instrument-problems.svg`, `hidden-quake.svg`, `mystery-records.svg`) | Node only; downloads data the first time (see below) |
| `seismogram-diagrams.mjs` | `theory/img/frequency-ruler.svg`, `seismometer-inside.svg` | Node only |
| `screenshots.mjs` | `apps/img/wave-race-*.png` | `npm install` in `tools/figures`, Chrome, `node tools/serve.mjs` running |

`svg-traces.mjs` holds the shared house style and seismogram drawing; `svg-charts.mjs` adds
charts over time, hour-of-day bars and the spectrogram image; `spectra.mjs` is a small FFT
(tested in `tests/spectra.test.js`). Run a script from the repository root, for example
`node tools/figures/science-traces.mjs`; screenshots run from `tools/figures`
(`node screenshots.mjs`, or name shots: `node screenshots.mjs choose`).

`seismogram-figures.mjs` fetches waveforms from EarthScope, events and picks from USGS ComCat,
and wind from the Iowa Environmental Mesonet (`fdsn-cache.mjs`), and keeps the downloads in
`tools/figures/.cache/` (git-ignored, about 0.7 GB; delete it to refetch). The week-long noise
levels it computes are kept in `tools/figures/data/*.json` (small), so those figures redraw
without the download; `--refetch` recomputes them. Build one figure by name, for example
`node tools/figures/seismogram-figures.mjs hum wind`.

## Design choices worth knowing

- **Picks never leave the device.** They are kept in the browser's `localStorage` per quake,
  for convenience only, and can be downloaded as CSV. No accounts, no server, no student data
  (Utah R277-487).
- **Causal filter.** The band-pass runs forward in time only, so it never smears energy to
  before an arrival, which would bias P picks early.
- **Dead channels** (a flat line of a few counts) are dropped, because auto-scaling would make
  digitizer noise look like a quake.
- Choices that belong to one app, such as Wave Race's hidden location and velocity defaults,
  are in its [app notes](wave-race.md#choices-specific-to-wave-race).

The reasons behind these choices are in the decision log,
[planning/decisions.md](https://github.com/gus-p-williams/utahshake/blob/main/planning/decisions.md),
and the build plan in
[planning/roadmap.md](https://github.com/gus-p-williams/utahshake/blob/main/planning/roadmap.md)
(both on GitHub; the planning files are not part of this site).
