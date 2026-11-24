# UHSN Student Seismology Apps

Browser apps and documentation for students in the **Utah High School Seismic Network
(UHSN)**, a Desert Research Institute program placing Raspberry Shake seismometers in
rural Utah high schools.

- **Apps** (no install, any browser): **Wave Race** (pick P and S on real Utah
  seismograms and locate the quake, by eye or by grid search), **Quake Explorer** (four
  investigations: record section and the crust's thickness, spectrogram and sound, particle
  motion, distant quakes) and **Quake Waves** (a cartoon of P and S waves reaching four
  stations) are live; the campus-noise app (School Pulse) follows (see the roadmap). All of
  them are listed on the site's All apps page.
- **Docs**: student guides, theory written for advanced high-school students, teacher
  activity cards mapped to Utah SEEd standards, and developer notes.

Until the school Shakes stream, the apps use open data from University of Utah
Seismograph Stations (via EarthScope) and the USGS earthquake catalog.

## Quick start (docs + app preview)

```bash
conda create -n uhsn python=3.12 -y
conda activate uhsn
pip install -r requirements-docs.txt
mkdocs serve          # http://127.0.0.1:8000  (All apps at /apps/)
```

Apps only, and tests (Node 22+; no npm install needed):

```bash
node tools/serve.mjs  # http://127.0.0.1:8001/app/wave-race/
npm test              # unit tests, link and app-list checks, real-data checks on the offline sample
```

`tools/serve.mjs` serves the raw `docs/` folder without building the guides, so start at an
app's own address; the All apps page and the guides need `mkdocs serve`.

See `docs/developers/architecture.md` for the code layout.

## Where to look

- Live site: https://gus-p-williams.github.io/utahshake/ (All apps page at `/apps/`; each
  app at `/app/<name>/`, for example `/app/wave-race/`)
- `CLAUDE.md` — project context, constraints, status (read first)
- `planning/roadmap.md` — staged plan
- `planning/decisions.md` — decision log
- `planning/evaluation.md` — planning study (snapshot; Word copy alongside)

Planning files live outside `docs/` on purpose: they discuss ideas that may not
happen, so they are kept in git but not published on the site.

## Data credits

Waveforms: University of Utah Seismograph Stations (network UU), via EarthScope.
Events: U.S. Geological Survey ComCat. Travel times for distant quakes: the iasp91 Earth model
(Kennett and Engdahl, 1991), via ObsPy TauP. Raspberry Shake network data is not
redistributed by these apps; see their own tools at raspberryshake.org.
