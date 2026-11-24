# Decision log

Newest first. Each entry: date, decision, why, consequences.

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
