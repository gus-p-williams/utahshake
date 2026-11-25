# Architecture

The apps are **static web pages written as plain ES modules**. There is no build step for the
app itself: what is in `docs/app/` is exactly what the browser runs, so students can read and
change the code. MkDocs builds the guides, copies `docs/app/` unchanged, and GitHub Actions
publishes both to GitHub Pages.

This page covers what all the apps share. How a single app works inside is under App notes,
for example [Quake Locator notes](wave-race.md).

```
docs/app/
  index.html               redirect stub: the old /app/ launcher, forwards to All apps (../apps/)
  wave-race/index.html     Quake Locator page
  quake-explorer/index.html  Quake Explorer page (four investigations)
  quake-waves/index.html   Quake Waves (cartoon; ?embed=1 inside Locating a quake)
  wave-animation/index.html  redirect stub: Quake Waves' old address, forwards to ../quake-waves/
  wave-motion/index.html   How P and S waves move rock (cartoon embedded in Seismic waves)
  build-a-wiggle/index.html  Build a Wiggle (made-up waves; ?embed=1 inside Frequencies, fading and sound)
  phone-bench/index.html   Phone Bench (prototype, In development: this device's motion sensor and microphone)
  shake-viewer/index.html  School Shake Viewer (prototype, In development: a day of one seismometer, notes)
  css/app.css              shared styles (light and dark, top bar, embed mode)
  css/quake-explorer.css   Quake Explorer's layout, on top of app.css
  js/
    config.js              schools, stand-in stations, defaults, presets, credits
    lib/                   pure logic, no browser APIs; tested with node --test
      geo.js               distances, azimuths, local projection
      locate.js            S-P distance, grid-search epicenter, misfit, uncertainty
      fdsn.js              parsers for USGS GeoJSON, FDSN station text, QuakeML picks
      stations.js          which stations to show for a quake
      signal.js            gaps, tapers, min/max per pixel, dead-channel and clipping checks, decimation
      wave-sim.js          cartoon arrivals and seismograms for Quake Waves
      wave-motion.js       pulse shape and rock displacement for the P/S motion cartoon
      wiggle.js            sums of sine waves for Build a Wiggle
      spectral.js          FFT, amplitude spectrum, spectrogram
      traveltime.js        direct and head-wave times, crossover, crust from the intercept
      linefit.js           speeds from arrivals, two-line (Pg/Pn) fit
      motion.js            sensor rotations, direction to the quake from P motion
      units.js             counts -> m/s from the station's sensitivity
      picker.js            AIC computer picks
      clear-s.js           how clearly S stands out over the P coda (behind the quakes' "clear S" notes; run offline)
      teleseism.js         Earth-model (iasp91) travel times for distant quakes
      audify.js, record-section.js, hodogram.js   helpers for Quake Explorer's views
      response.js          instrument response from StationXML poles and zeros (counts per m/s at any frequency)
      psd.js               Welch noise spectra, octave averages, PPSD histograms and percentiles
      noise-models.js      Peterson's (1993) low- and high-noise reference curves
      helicorder.js        a day cut into lines; gaps bridged for filtering and put back
      carpet.js            noise level per step, the day-by-time grid, morning-rise time
      stack.js             cross-correlation, scaling to the noise, stacking, noise vs N
      hv.js                H/V: Konno-Ohmachi smoothing, window rejection, peak, f0 = Vs/4H
      bench.js             Phone Bench: rate, jitter, rounding step, noise, taps; a made-up phone
      day-view.js          School Shake Viewer: local days, helicorder geometry, notes files, arrivals, CSV
      mseed-index.js       miniSEED headers only: record times, gaps, coverage, seek tables, byte ranges
    data/
      datasource.js        the DataSource interface; picks a source from the URL
      earthscope-usgs.js   live source: USGS events + EarthScope stations/waveforms
      sample-source.js     offline source: files in data/samples/
      uhsn.js              UHSNSource: files in the UHSN data layout (DRI's future server; a test folder now)
      mseed.js             miniSEED -> traces (vendored seisplotjs)
      filters.js           Butterworth band-pass (vendored seisplotjs); filteredLong for a whole day
    ui/
      page.js              shared page helpers: credits, source badge, esc, CSV, embed mode, docs theme
      trace-view.js        canvas seismogram with zoom, pan, picks
      map-view.js          Leaflet map: stations, circles, epicenters, the student's pin
    wave-race/app.js       the Quake Locator page controller
    quake-explorer/        Quake Explorer: controller, one module per investigation, its views
    quake-waves/           Quake Waves: app.js (the animation, canvas), map-hint.js (its "Click the map" label),
                           map-keys.js (moving the quake with the arrow keys)
    wave-motion/app.js     the P/S rock-motion animation (canvas)
    build-a-wiggle/app.js  the Build a Wiggle page controller (canvas)
    phone-bench/           Phone Bench: app.js (controller), sources.js (device or made-up phone),
                           mic-worklet.js (microphone meter; keeps no sound)
    shake-viewer/          School Shake Viewer: app.js (controller), helicorder-view.js, noise-view.js, config.js
  vendor/                  seisplotjs + Leaflet bundles (generated; see below)
  data/samples/<event>/    offline sample: event, stations, picks, waveforms.mseed
  data/samples/qe-*/       Quake Explorer's offline samples (the "explorer" list in index.json)
  data/traveltimes-iasp91.json  Earth-model travel times for distant quakes
  data/notes/heb-example.json   the School Shake Viewer's example notes (bell times in Heber City)
  data/uhsn-demo/v1/       a test folder in the UHSN data layout (tools/uhsn-test/make-tree.mjs --demo)
tests/                     node --test, including real-data checks on the sample
  doc-links.test.js        links in the app pages and raw HTML reach real pages of the site
  app-list.test.js         every app folder is listed on the All apps page (docs/apps/index.md); prototypes
                           (In development) show the Prototype badge and have their own menu group
  helpers/prototypes.js    reads the In development section of All apps (shared by two tests)
  bench.test.js            Phone Bench arithmetic on made-up takes
  day-view.test.js         School Shake Viewer logic; the example notes against their times
  mseed-index.test.js, uhsn-source.test.js, uhsn-demo-tree.test.js   the UHSN data layout and its reader
  site-graphics.test.js    the small site graphics: every snippet points to a file, no orphans, one line, aria-hidden;
                           every All apps card has a thumb; the home banner has its credit
  teacher-cards.test.js    activity cards and app hubs link both ways (D19); the Teachers catalog
                           and standards tables match each card's "At a glance" box
  clear-s.test.js          the "clear S at N of M stations" notes match the offline samples
  qe-notes-credits.test.js Quake Explorer's per-quake station notes and the iasp91 credit
tools/
  vendor/                  esbuild script that regenerates docs/app/vendor/
  samples/fetch-sample.mjs bundles a quake for offline use
  quake-explorer/          Quake Explorer's science checks, answer key, samples, travel-time table
  figures/                 figures for the guides and The Science (see below)
                           site-graphics.mjs: the small card, icon and banner graphics (docs/img/graphics/)
  uhsn-test/make-tree.mjs  a test folder in the UHSN data layout from University of Utah data
  serve.mjs                tiny local server for docs/ (apps only, no MkDocs build; Range and CORS)
  site-check.mjs           every page of the built site in headless Chrome at three widths
  phone-bench-check.mjs    Phone Bench in headless Chrome: made-up phone, emulated sensors, fake microphone
```

The list of apps students see is the **All apps** page, `docs/apps/index.md`, built by MkDocs
in the site's theme. Each app page has the same static top bar (back to All apps, its guide,
About the data) and imports its credits, data-source badge, CSV download and embed mode from
`ui/page.js`; see [Adding an app](adding-an-app.md#top-bar) for the bar and the helpers.

## Data access

All data goes through a **DataSource** object (`js/data/datasource.js`), never straight to a web
service. Swapping in the UHSN school Shakes later means writing a `UHSNSource` with the same
methods and changing `SCHOOLS[].standIn` in `config.js`. See [Data sources](data-sources.md).
For one app's calls in order, see [Data flow in Quake Locator](wave-race.md#data-flow-in-wave-race).

## Running locally

```bash
node tools/serve.mjs          # apps only: http://127.0.0.1:8001/app/wave-race/
mkdocs serve                  # full site with guides and All apps: http://127.0.0.1:8000/
npm test                      # unit + sample tests (Node 22+)
```

`tools/serve.mjs` serves the raw `docs/` folder without building the guides, so pages made
from Markdown do not exist there. Start at an app's own address, such as `/app/wave-race/` or
`/app/quake-waves/`. `/app/` forwards to the All apps page (`/apps/`), which only
`mkdocs serve` and the published site have, so it gives "not found" here; so do the top-bar
links (All apps, Guide, About the data).

Each app may take options in its page address; Quake Locator's are in
[Quake Locator notes](wave-race.md#page-address-options).

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

## Animations in a docs page

Three apps sit inside science pages in an `<iframe>`: `docs/theory/locating.md` embeds
Quake Waves (`app/quake-waves/?embed=1`), `docs/theory/waves.md` embeds the P/S
rock-motion cartoon (`app/wave-motion/?embed=1`) and `docs/theory/frequencies.md` embeds
Build a Wiggle (`app/build-a-wiggle/?embed=1`). All three page controllers call `setupEmbed()`
and `followDocsTheme(draw)` from `ui/page.js`:

- **Embed mode.** `setupEmbed()` adds `body.embed` when the address has `?embed` or the page
  is inside an iframe. `app.css` then hides the top bar, the credits and `.standalone-only`
  elements and shows `.embed-only` ones (an "Open full screen ↗" link); each page's own
  `body.embed` styles make it fill the frame.
- **Light and dark.** Because the docs and the app are on the same site, `followDocsTheme()`
  reads the docs' light/dark switch (`data-md-color-scheme`), sets `data-theme` on the app's
  own `<html>` and redraws when the switch changes; `app.css` honors `data-theme` before the
  device setting.

An embedded app may have a hub of its own (Quake Waves and Build a Wiggle do) or not (the P/S
cartoon, whose guide link points to Seismic waves). Either way it must be listed on the All
apps page (checked by `tests/app-list.test.js`): with the apps if it has a hub, under
Animations if not. `tests/doc-links.test.js` checks the iframe addresses. Quake Waves' old
address, `app/wave-animation/`, is a redirect stub that passes on `?embed=1`, so iframes that
still use it keep working.

## Figures in the docs

The figures in `docs/apps/img/` and `docs/theory/img/` are made by scripts in
`tools/figures/`, so they can be rebuilt when the apps or the data change. Seismogram figures
use the offline sample and the app's own parser and filter; diagrams and maps use the app's
`lib/` code (for example `locate.js`), so they match what the apps compute. Each script writes
the same bytes every time it runs.

| Script | Makes | Needs |
| --- | --- | --- |
| `trace-figures.mjs` | `apps/img/picking-*.svg` (Quake Locator guide) | Node only |
| `science-traces.mjs` | `theory/img/seismogram-anatomy.svg`, `s-minus-p-worked-example.svg` | Node only |
| `science-record-section.mjs` | `theory/img/record-section.svg` | Node only |
| `science-diagrams.mjs` | `theory/img/depth-triangle.svg`, `circles-1-2-3.svg` | Node only |
| `science-locating.mjs` | `theory/img/residuals.svg`, `misfit-map.svg`, `station-geometry.svg` | Node only |
| `science-maps.mjs` | `theory/img/schools-map.svg` | Node only |
| `seismogram-figures.mjs` | the real-data figures on Reading a seismogram (`theory/img/ocean-hum.svg`, `wind-noise.svg`, `people-week.svg`, `three-quakes.svg`, `blast-*.svg`, `instrument-problems.svg`, `hidden-quake.svg`, `mystery-records.svg`) | Node only; downloads data the first time (see below) |
| `seismogram-diagrams.mjs` | `theory/img/frequency-ruler.svg`, `seismometer-inside.svg` | Node only |
| `phone-steps-figure.mjs` | `theory/img/phone-steps.svg` (How small a shake can it see?: made-up waves rounded as Chrome does) | Node only |
| `science-travel-times.mjs` | `theory/img/tt-*.svg` (Travel times and Earth's layers) | Node only |
| `science-frequencies.mjs` | `theory/img/freq-*.svg` (Frequencies, fading and sound) | Node only |
| `science-ground-motion.mjs` | `theory/img/gm-*.svg` (Which way the ground moves) | Node only |
| `plots-time.mjs` | `theory/img/plots-helicorder.svg`, `plots-carpet.svg` (Beyond one seismogram) | Node only; downloads data the first time; the carpet's levels are kept in `tools/figures/data/carpet-heb-2026.json` |
| `plots-noise.mjs` | `theory/img/plots-ppsd.svg`, `plots-ppsd-compare.svg` | Node only; downloads four station-months the first time; the PPSD histograms are kept in `tools/figures/data/ppsd-*.json` |
| `plots-hv.mjs` | `theory/img/plots-hv.svg` | Node only; curves kept in `tools/figures/data/hv-curves.json` |
| `site-graphics.mjs` | `docs/img/graphics/` (`thumb-*.svg` for each card on All apps, `icon-*.svg` for the home page's Apps card, `home-banner.svg`) | Node only; drawn with the apps' own `lib/` code and the records stored with the site |
| `plots-repeats.mjs` | `theory/img/plots-stack.svg`, `plots-xcorr.svg` | Node only; the event list (with its provenance) is `tools/figures/data/uttr-explosions.json` |
| `screenshots.mjs` | `apps/img/wave-race-*.png` | `npm install` in `tools/figures`, Chrome, `node tools/serve.mjs` running |
| `quake-explorer-screens.mjs` | `apps/img/qe-*.png` (Quake Explorer guide) | as `screenshots.mjs` |
| `build-a-wiggle-screens.mjs` | `apps/img/bw-*.png` (Build a Wiggle guide) | as `screenshots.mjs` |
| `phone-bench-screens.mjs` | `apps/img/pb-*.png` (Phone Bench guide; the made-up phone) | as `screenshots.mjs` |
| `shake-viewer-screens.mjs` | `apps/img/sv-*.png` (School Shake Viewer guide; HEB, Nov 17, 2026) | as `screenshots.mjs` |

The site graphics are inline SVG, included in a page with pymdownx.snippets (`--8<-- "img/graphics/<name>.svg"`),
not as `<img>`, so their colors follow the light/dark switch (`.uhsn-g` in `extra.css`). Each file is one line
with **no trailing newline**: a newline ends the paragraph after the include and a small picture then drops out
of the text beside it. They are decorative, so each has `aria-hidden="true"` and no `<text>`. Add a graphic for
every new app ([Adding an app](adding-an-app.md#app-list)); `tests/site-graphics.test.js` checks all of this.

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
- Choices that belong to one app, such as Quake Locator's hidden location and velocity defaults,
  are in its [app notes](wave-race.md#choices-specific-to-wave-race).

The reasons behind these choices are in the decision log,
[planning/decisions.md](https://github.com/gus-p-williams/utahshake/blob/main/planning/decisions.md),
and the build plan in
[planning/roadmap.md](https://github.com/gus-p-williams/utahshake/blob/main/planning/roadmap.md)
(both on GitHub; the planning files are not part of this site).
