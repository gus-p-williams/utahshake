# Decision log

Newest first. Each entry: date, decision, why, consequences.

## 2026-11-23 (Stage 1)

**D13. Planning documents live in `planning/`, outside the website.**
They discuss plans that may change, so they are kept in git (reachable from any machine) but
not built into the student-facing site. The repo is public, so they are still readable on
GitHub. A Word copy of the evaluation is kept beside it for sharing with DRI colleagues; its
equations are fixed with `tools/planning-docx/`.

**D12. Wave Race draws seismograms on its own canvas; only seisplotjs's miniSEED and filter
modules are bundled.**
Picking needs tight control of clicks, zoom and markers, and a small canvas class is easier
for students to read than seisplotjs's d3 components. Importing only those two modules cuts
the bundle from 543 KB to about 400 KB. Consequence: Stage 3 views (spectrogram, record
section) may bundle more of seisplotjs then.

**D11. The quake's location stays hidden until "reveal"; analyst picks are the answer key.**
The quake list shows only time and magnitude, because the USGS place name gives the answer
away. Helper stations around each quake are chosen first from those where UUSS analysts picked
P and S (their arrivals are known to be clear). Those picks can be shown after the reveal.
Student picks stay in the browser (localStorage, CSV download); nothing is sent anywhere.
Flat (dead) channels are dropped.

**D10. Ten stations per quake: the school stand-ins plus helpers around the quake.**
The five schools sit in a north–south line in central Utah, so for most quakes they do not
surround the epicenter. Helpers fill empty compass quadrants first, then the nearest. With 8
stations, the five schools left too few helpers.

**D9. Default speeds Vp = 5.8 km/s and Vs = 3.3 km/s (7.66 km per second of S − P),
instead of the roadmap's 6.0 / 3.5 (8.4).**
Checked against UUSS analyst picks for three 2026 quakes (uu80162166, uu80164656,
uu80156586). Stations 20–80 km away needed mostly 7.3–8.2 km per s of S − P, and 8.4 made
distances about 10% too long. With only three stations (the offline sample), the error was
17 km at 6.0/3.5 and 5.5 km at 5.8/3.3. With 9–13 stations around a quake, every choice
landed within 2–4 km. Students can still edit the speeds; the theory page explains both values.

## 2026-11-23

**D8. Work happens in a local git repo on Gus's machine, mirrored to GitHub.**
Claude's cloud workspace cannot reach EarthScope/USGS and has no GitHub token, so
building and real-data testing happen in the connected local folder.

**D7. Stand-in data: University of Utah (UU) stations + USGS events.**
Until UHSN Shakes stream, UU stations nearest each Phase I school play the school
sensors. Configured in one table so the swap is a config change. Open data, no
Raspberry Shake license limits.

**D6. All data access behind a `DataSource` interface.**
Implementations: EarthScope/USGS now; UHSN server later. Apps never call a data
service directly.

**D5. seisplotjs + Leaflet, vendored as ESM bundles; no app build step.**
Students can read and modify the app code directly; one esbuild script regenerates
the bundles when versions change. seisplotjs pinned to 3.3.0 (MIT).

**D4. Docs with MkDocs Material; app served inside the docs site at `/app/`.**
One GitHub Pages deployment for docs and apps. Read the Docs remains possible later.
Note: mkdocs-material 9.8.2 announces end of life on 2027-05-05; its successor,
Zensical (same team, reads `mkdocs.yml`), was only at 0.1.3 in Nov 2026. Stay on
MkDocs Material now and plan a migration test before spring 2027.

**D3. Static browser app first; Python notebooks later for local analysis.**
Works on Chromebooks with no install and no server to run.

**D2. Build order: Wave Race + Locator → seismic carpet → multi-view explorer → UHSN switch.**
Agreed with Gus; all of them will be built, in stages.

**D1. No Raspberry Shake server data in our apps; no student PII.**
From the planning doc: RS license forbids back-end/app integration of network data;
Utah R277-487 governs student data. Our own Shakes read directly are fine.
