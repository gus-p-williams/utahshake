# UHSN Student Seismology Apps

Browser apps and documentation for students in the **Utah High School Seismic Network
(UHSN)**, a Desert Research Institute program placing Raspberry Shake seismometers in
rural Utah high schools.

- **Apps** (no install, any browser): locate Utah earthquakes from S−P times, explore
  campus noise, and more, in stages (see the roadmap).
- **Docs**: student guides, theory written for advanced high-school students, teacher
  activity cards mapped to Utah SEEd standards, and developer notes.

Until the school Shakes stream, the apps use open data from University of Utah
Seismograph Stations (via EarthScope) and the USGS earthquake catalog.

## Quick start (docs + app preview)

```bash
conda create -n uhsn python=3.12 -y
conda activate uhsn
pip install -r requirements-docs.txt
mkdocs serve          # http://127.0.0.1:8000  (app at /app/)
```

## Where to look

- `CLAUDE.md` — project context, constraints, status (read first)
- `docs/planning/roadmap.md` — staged plan
- `docs/planning/decisions.md` — decision log
- `docs/planning/evaluation.md` — planning study (snapshot)

## Data credits

Waveforms: University of Utah Seismograph Stations (network UU), via EarthScope.
Events: U.S. Geological Survey ComCat. Raspberry Shake network data is not
redistributed by these apps; see their own tools at raspberryshake.org.
