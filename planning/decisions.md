# Decision log

Newest first. Each entry: date, decision, why, consequences.

## 2026-11-24 (Stage 1 additions)

**D18. The animation is renamed Quake Waves (was Watch the Waves).**
Gus's choice. "Quake Explorer" stays reserved for the Stage 3 multi-view app. The docs use the
new name now; the app folder (`app/wave-animation/`) and the page title are renamed with the
app-side navigation work (Phase 2 of the navigation plan).

**D17. Site navigation: one hub page per app, shared sections, no top tabs.**
The first layout split pages by type (Apps / Theory / Teachers / Developers tabs), so each
app's material was scattered, the Apps tab dropped students onto the unthemed launcher, the
tabs vanished below 1220 px (many Chromebooks), and switching tabs hid the pages seen before.
Now: each app has one hub page (`apps/<app>.md`: Open button, a standard "At a glance" box,
then the guide); The Science, Teachers and Developers are shared sections the hubs link
into, each opening on its own `index.md`; Developers is a separate section with per-app notes
only when needed. No `navigation.tabs`, so the whole map shows in one sidebar (revisit if it
grows past about 35 entries); breadcrumbs, prev/next footer and section index pages are on.
No page URLs moved, so no redirect plugin (MkDocs 2.0 drops plugins). A `node --test` checks
links from the apps (and raw HTML in pages) into the docs, which `mkdocs build --strict`
does not. Checklist for new apps: `docs/developers/adding-an-app.md`.

**D16. Guide figures are generated, not hand-drawn.**
The seismogram figures are SVGs made from the offline sample with the app's own parser and
filter (`tools/figures/trace-figures.mjs`), with the UUSS analysts' picks; screenshots come
from the app in headless Chrome (`tools/figures/screenshots.mjs`, puppeteer-core with the
installed Chrome). Rerun them when the app's look changes.

**D15. Watch the Waves is a labelled cartoon, embedded where locating is explained.**
Quake at the surface, uniform rock, made-up seismograms, but exact arrival times (Vp 5.8,
Vs 3.3), so the S − P circles cross exactly at the quake. It lives at `app/wave-animation/`
and is embedded with an iframe on the Locating a quake page (Gus's suggestion), following the
docs' light/dark switch. Arrival logic is in `lib/wave-sim.js` with tests.

**D14. Students can place their own epicenter as well as run the grid search.**
Placing a pin by eye and watching the RMS misfit change as they drag it makes the misfit idea
concrete before the computer searches. Both are kept: green pin (guess) and purple star (best
fit); the reveal gives the distance of each from the official epicenter. Changing picks or
settings removes the best fit (it was computed with the old numbers) but keeps the pin. The
pin is stored in the browser like the picks, and included in the CSV.

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
