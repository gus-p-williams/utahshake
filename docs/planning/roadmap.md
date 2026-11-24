# Roadmap: staged build plan

Stages follow the order agreed on 2026-11-23: Wave Race + Locator first, then the
seismic carpet (School Pulse), then the multi-view explorer, then the switch to live
UHSN data. Each stage ends with working app + docs deployed to GitHub Pages.

Until the school Shakes stream, **University of Utah (UU) stations near each Phase I
school stand in for the school sensors**, configured in one file so the swap is a
config change.

## Stage 0 — Repo, docs site, CI

- [ ] Repo skeleton (see `CLAUDE.md` tree), MIT or BSD license (DRI to choose), `.gitignore`.
- [ ] MkDocs Material site with sections: Apps, Theory, Teachers, Developers, Planning.
- [ ] GitHub Actions workflow: build MkDocs (app copied as static files), deploy to Pages.
- [ ] `docs/app/` placeholder page that proves the app path is served.
- [ ] Connectivity check from Gus's machine: EarthScope station/dataselect and USGS event
      queries succeed, and browser CORS allows them from a `github.io` origin.

**Done when:** the empty site is live on GitHub Pages and builds on every push.

## Stage 1 — Wave Race + Utah Quake Locator

Student flow: pick a recent Utah quake → see records from the stand-in stations →
pick P and S on each → app converts S−P to distance → circles on a map → best-fit
epicenter → compare with the official USGS/UUSS location.

- [ ] `DataSource` interface (`getEvents`, `getStations`, `getWaveforms`) and an
      `EarthScopeUSGS` implementation; school → stand-in station table in `config/`.
- [ ] Vendor seisplotjs (pinned 3.3.0) and Leaflet as ESM bundles via esbuild script.
- [ ] Event list: Utah region, last 90 days, M ≥ 2.0, plus a few classic presets
      (e.g. 2020 Magna M5.7; verify times against ComCat).
- [ ] Waveform panel: filter presets (raw, 1–10 Hz, 2–8 Hz), zoom, P/S pick markers.
- [ ] Physics module: S−P → distance with editable Vp/Vs (defaults 6.0/3.5 km/s);
      grid-search epicenter; misfit and rough uncertainty. Unit tests.
- [ ] Map: stations, distance circles, student solution, official epicenter, error in km.
- [ ] Offline sample: one event's data bundled in `docs/app/data/samples/` for flaky
      school networks and for tests.
- [ ] Docs: student guide, theory pages (waves; S−P distance; locating), teacher
      activity card (15-min and full-period versions), standards crosswalk, data
      attribution.

**Done when:** a student on a Chromebook can locate a recent M3 Utah quake from 4+
stations in under 15 minutes, landing within about 10 km of the official location.

## Stage 2 — Seismic carpet / School Pulse

- [ ] Product: hourly (or 10-min) band-limited noise level per stand-in station,
      computed by a scheduled job (GitHub Actions + Python/ObsPy) and committed as
      JSON to the site; this job is the prototype of the DRI processing service.
- [ ] Heatmap: hour of day × date; toggles for frequency band; overlays for weekends,
      holidays, school calendar, daylight-saving dates.
- [ ] "Seismic week" average view; download CSV.
- [ ] Docs: theory (noise, RMS, logs), activity card, standards.

**Done when:** students can find weekends, holidays and the DST shift in a stand-in
station's carpet without help.

## Stage 3 — Multi-view explorer

- [ ] Waveform + spectrogram, with band-pass controls.
- [ ] Record section (waterfall) for a chosen quake across many UU stations.
- [ ] Particle motion (3-component stations).
- [ ] Audification (WebAudio, 100–400× speed-up).
- [ ] Docs for each view.

## Stage 4 — Switch to UHSN data

- [ ] DRI ingest server API (separate repo) and `UHSNSource` implementing `DataSource`.
- [ ] Live/real-time views inside schools; delayed/aggregated public views (occupancy privacy).
- [ ] Campus apps: School Pulse (real campus), Game Night Quake, Bus Detective, Campus
      Wave Speed, Signal Detective labeling.

## Later

- Python package + notebooks (ObsPy) for local analysis and the research track.
- Research-track data products (event features, labels) and JupyterHub.
