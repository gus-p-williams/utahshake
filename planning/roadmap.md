# Roadmap: staged build plan

Stages follow the order agreed on 2026-11-23: Wave Race + Locator first, then the
seismic carpet (School Pulse), then the multi-view explorer, then the switch to live
UHSN data. Each stage ends with working app + docs deployed to GitHub Pages. Stage 3 (Quake
Explorer) was built before Stage 2 (Gus, 2026-11-24; D22).

Until the school Shakes stream, **University of Utah (UU) stations near each Phase I
school stand in for the school sensors**, configured in one file. The apps read data through
one `DataSource` interface, so they need no rewrite for the school Shakes; the switch still
needs the DRI ingest server and a UHSN data source (Stage 4).

## Stage 0 — Repo, docs site, CI

- [x] Repo skeleton (see `CLAUDE.md` tree), `.gitignore`.
- [ ] License file: MIT or BSD (DRI to choose). **Still open**: a public repo without a
      license file is "all rights reserved" by default.
- [x] MkDocs Material site with sections: Apps, Theory, Teachers, Developers. (Planning
      moved off the site; decision D13.)
- [x] GitHub Actions workflow: tests, build MkDocs (app copied as static files), deploy to Pages.
- [x] `docs/app/` placeholder page that proves the app path is served.
- [x] Connectivity check from Gus's machine: EarthScope station/dataselect and USGS event
      queries succeed, and browser CORS allows them from a `github.io` origin.

**Done when:** the empty site is live on GitHub Pages and builds on every push.

## Stage 1 — Wave Race + Utah Quake Locator

Student flow: pick a recent Utah quake → see records from the stand-in stations →
pick P and S on each → app converts S−P to distance → circles on a map → best-fit
epicenter → compare with the official USGS/UUSS location.

- [x] `DataSource` interface (`getEvents`, `getEvent`, `getStations`, `getWaveforms`,
      `getAnalystPicks`) with `EarthScopeUSGSSource` and an offline `SampleSource`;
      school → stand-in station table in `docs/app/js/config.js`.
- [x] Vendor seisplotjs (pinned 3.3.0; miniseed + filter only) and Leaflet 1.9.4 as ESM
      bundles via `tools/vendor/build.mjs` (esbuild).
- [x] Event list: Utah region, last 90 days, M ≥ 2.0, plus presets: 2020 Magna M5.7
      (uu60363602, verified against ComCat) and the 2026 Junction M3.3 offline sample.
- [x] Waveform panel: filter presets (raw, 1–10 Hz, 2–8 Hz), zoom, pan, P/S pick markers,
      3 components where available.
- [x] Physics module: S−P → distance with editable Vp/Vs (defaults 5.8/3.3 km/s, see D9)
      and depth; grid-search epicenter; misfit and rough uncertainty. Unit tests.
- [x] Map: stations, distance circles, student solution, official epicenter, error in km.
- [x] Offline sample: uu80162166 bundled in `docs/app/data/samples/`, with real-data tests.
- [x] Docs: student guide, theory pages (waves; S−P distance; locating), teacher
      activity card (15-min and full-period versions), standards crosswalk, data
      attribution, developer architecture.

**Done when:** a student on a Chromebook can locate a recent M3 Utah quake from 4+
stations in under 15 minutes, landing within about 10 km of the official location.

Added 2026-11-24 (after Gus's review):

- [x] Student guide figures: whole record → zoom on P → zoom on S (SVG from the offline sample),
      plus screenshots of the picking panel and of the speed/depth settings (`tools/figures/`).
- [x] "Place my own epicenter": students click the map (or drag a pin) and see the RMS misfit
      live; "Find the best epicenter" still runs the grid search; the reveal reports both.
- [x] Quake Waves (first called Watch the Waves): cartoon animation of P and S fronts reaching four stations, with
      seismograms and S − P circles; embedded on the Locating a quake page.

*Status 2026-11-23:* checked in headless Chrome at Chromebook size (1366×768) by clicking
picks at the UUSS analyst times: offline sample 6.0 km (3 stations), Enterprise M3.4
(uu80164656) 3.2 km (7 stations), both live and offline. Still to do: a real student or
teacher trial for the 15-minute target.

## Stage 2 — Seismic carpet / School Pulse

- [ ] Product: hourly (or 10-min) band-limited noise level per stand-in station,
      computed by a scheduled job (GitHub Actions + Python/ObsPy) and committed as
      JSON to the site; this job is the prototype of the DRI processing service.
- [ ] Heatmap: hour of day × date; toggles for frequency band; overlays for weekends,
      holidays, school calendar, daylight-saving dates.
- [ ] "Seismic week" average view; download CSV.
- [ ] Docs: theory (noise, RMS, logs), activity card(s) (see "Teacher activity cards" below),
      standards.

**Done when:** students can find weekends, holidays and the DST shift in a stand-in
station's carpet without help.

## Stage 3 — Multi-view explorer (Quake Explorer)

Built and merged 2026-11-24 (decisions D22–D25; plan and Phase 0 results:
`planning/quake-explorer.md`). Four investigations, each Predict · Explore · Why? · Check:

- [x] A. Record section across many UU stations: P/S rulers, analyst + computer picks, fitted
      lines, the Pg → Pn bend and crust thickness (Magna), reduced time, true ground speed.
- [x] B. Waveform + spectrogram with a drag-a-band filter; audification (WebAudio, 50–400×);
      near vs far; quarry blast vs quake.
- [x] C. Particle motion (3-component stations): own guess, computer and true direction, map,
      one-station location, Z R T rotation.
- [x] D. Distant quakes: P/S picks, S − P → distance from an iasp91 table, travel-time chart.
- [x] Offline samples for all four (2.4 MB, `explorer` list).
- [x] Docs: hub/guide, three science pages, four activity cards, standards, developer notes.
- [x] Build a Wiggle: cartoon of sine waves adding up and the spectrum finding each one,
      embedded on Frequencies, fading and sound (no hub; listed under Animations).
- [ ] A person listens to B's sound on a school device (checked only in code so far).
- [ ] A classroom trial with a teacher (each investigation's 15-minute version).

**Done when:** a class on Chromebooks can run each investigation's 15-minute version, live or
offline, and reach the answer key's result.

## Across all stages: plots students learn to read

The evaluation lists 12 plots. On the site: waveform, spectrogram, record section, particle
motion, audification, amplitude against distance, spectra.

- [ ] The other six as real-data figures on a science page (plots session, branch `plots`):
      helicorder, PPSD against the Peterson noise models, seismic carpet (a static preview;
      the app is Stage 2), event stack, H/V ratio, cross-correlation.

## Stage 4 — Switch to UHSN data

- [ ] DRI ingest server API (separate repo) and `UHSNSource` implementing `DataSource`.
- [ ] Live/real-time views inside schools; delayed/aggregated public views (occupancy privacy).
- [ ] Campus apps: School Pulse (real campus), Game Night Quake, Bus Detective, Campus
      Wave Speed, Signal Detective labeling.

## Across all stages: teacher activity cards

Teachers work from activities, not apps (D19). An activity card is one lesson. Activities and
apps are many-to-many: a card may use several apps or none, and an app may appear in several
cards. Every app gets at least one card.

- [x] Wave Race activity card (uses Quake Waves as the warm-up).
- [ ] Card format and site structure (with or after navigation Phase 2):
  - One file per activity in `docs/teachers/`, named after the activity
    (`wave-race-card.md` keeps its URL).
  - An "At a glance" box on every card: Time · Setup (the tier from `planning/activities.md`:
    external data, the school's Shake, a roaming Shake, phones) · Apps and tools used ·
    Materials · Utah standards.
  - Then the sections of the Wave Race card: short version, full-period version, exit ticket,
    answer key, common difficulties, extensions.
  - The Teachers page's activities table becomes the catalog (Activity · Apps used · Setup ·
    Time · Standards). Each card gets a row in "Utah standards at a glance".
  - Each app hub's "For teachers" line lists every card that uses the app.
  - [x] Past about five cards, group them in the sidebar under Teachers › Activity cards (done
    with Quake Explorer, D25; D17: revisit the layout if the sidebar passes about 35 entries).
  - Still to do (teacher-cards session): the "At a glance" boxes, the catalog, the hub lines.
- [ ] Quake Waves: a short card of its own (proposed: a 10-minute predict-and-watch demo for a
      physics waves unit), besides its role as the Wave Race warm-up.
- [x] Quake Explorer: one card per investigation (A–D) and a full-period lesson chaining A and
      C (`planning/quake-explorer.md` §5).
- [ ] School Pulse: card(s) with Stage 2.
- [ ] Activities with no app (campus experiments, phone activities): cards for the starter set
      that Gus, Dale and Cleat choose from `planning/activities.md` (the questions document sent
  to Dale and Cleat; D27).

## Proposed, pending Dale and Cleat

From the questions document (`planning/activities.md`, "UHSN classroom activities by setup";
D28). None is scheduled until Dale and Cleat choose activities.

- Phone track, only if phone activities are chosen and after bench trials T1 to T3: the Phone
  Recorder page, then a locator for "Find the hit" (P3).
- Felt Map Locator (E13): a small add-on (USGS "Did You Feel It?" squares).
- Own-Shake file loader: a bridge before Stage 4 (day files from the school Shake's own page).
- In Stage 4: the viewer's experiment mode (S10–S18, R cards), a source log for experiments at
  each school, and a roaming kit (R cards) if DRI budgets one.
- Standards crosswalk: add ESS.2.6, PHYS.1.2, PHYS.1.3 and CS 9/10.NI.1 when activities using
  them are published.

## Later

- Python package + notebooks (ObsPy) for local analysis and the research track.
- Research-track data products (event features, labels) and JupyterHub.
