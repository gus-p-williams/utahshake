# Decision log

Newest first. Each entry: date, decision, why, consequences.

## 2026-11-25 (apps and on-plot hints)

**D41. Magnitude: a science page now, and investigation E as a prototype tab in Quake
Explorer.** Gus, 2026-11-25, after the review `planning/review-magnitude.md` (v2) and two
independent critiques (`critique-r3-claude.md`, `critique-r4-codex.md`), at Cleat's request.
Students estimate a local magnitude with UUSS's own recipe: a simulated Wood-Anderson record
(magnification 2,800, damping 0.8), the biggest swing on the horizontal components, Richter's
1958 distance table, the middle value of the stations. Out of sample they land "usually
within about 0.3" of UUSS's ML, the wording the student page uses (numbers in the teacher
notes). ML, duration and moment magnitude are different estimates, never averaged; the Check
compares with ML, falling back to the event magnitude when ComCat has no station data. Built
in two phases by session D13-magnitude: (1) the shared Wood-Anderson module and a science page
"How big was it?" after Frequencies, fading and sound; (2) "E. How big was it?" as a
prototype tab in Quake Explorer, listed under In development, with no activity card until it
graduates after a trial. D22, D23 (which left magnitude to a possible future app) and E11
change when E graduates. UUSS is not asked to confirm the constants. School-Shake magnitudes
stay an open research question (calibration over 2–4 years, quakes from several areas).

**D40. The phyphox page is mothballed until one of our apps reads phyphox recordings.** Gus,
2026-11-25. Our site did nothing with phyphox's data (there is no live link between a web
page and the app; recordings move only as exported files), so the page only told teachers the
app exists. It is off the site and kept in `planning/mothballed/` (with its experiment file
and test). It returns with the first app that opens a phyphox recording (its exported CSV),
for example the table-tap exercise ("Find the hit") or the School Shake Viewer, and then
without an "Open in phyphox" button: students open phyphox, record, save (export), and open
the recording in our app. D38's position stands: phyphox is for clubs and research;
classroom activities stay browser-only.

**D39. The School Shake Viewer prototype, and the first reader for DRI's files.** Gus,
2026-11-25 (session D11-viewer-proto), following D37. Under "In development":
`app/shake-viewer/` shows one station's day as a 24-hour helicorder with zoom, a spectrogram
whose dragged band filters the zoom, hourly noise, notes (edited in the page, kept in the
browser, downloaded as JSON; nothing uploaded, no student names) and the day's quakes with
their expected P and S. Data never come from Raspberry Shake's servers: a day file opened
from the device, a day of a UU stand-in through the existing DataSource, or files laid out
as the data spec says, read by the first UHSNSource (`data/uhsn.js`, byte-range requests
guided by the seek table; `?uhsn=<address>` points it at DRI's test server). The 4.1 MB test
folder (`docs/app/data/uhsn-demo/v1/`, made by `tools/uhsn-test/make-tree.mjs`) stays committed
so the "School Shakes" option and the example work on the live site with no server (Gus).
Nothing loads when the page opens; "Try the example" opens the bundled HEB day (Nov 17,
2026, with two schools' bell times) without contacting EarthScope (Gus). `tools/serve.mjs`
answers byte-range requests and sends CORS headers. Building the reader found nine gaps in
the data spec; P3 fixes them as version 1.1.

**D38. The site is public; phyphox for clubs and research.** Gus, 2026-11-25. Anyone can use
any page of the site. Using it for instruction is each school's decision under its own rules
(the phone law, R277-495, and district approval of instructional technology under Utah Code
53G-7-228, which DRI and the schools handle); "In development" marks how ready a tool is, not
who may use it, so students may use Phone Bench where a school agrees (for example a trial at
Wasatch Academy). Classroom activities stay browser-only (constraint 3), but phyphox, the
free phone app, is the recommended instrument for clubs and the research track, and for
teachers with a set of old classroom phones: it reads the sensors directly, faster and
without the browser's rounding. A teacher page explains how to install it, why it is better
and why our browser pages are the default (no install). A web page can't tell whether an
app is installed (session D12-phyphox). Built: `docs/teachers/phyphox.md` with a ready-made
experiment (`docs/teachers/files/uhsn-vibration.phyphox`) opened by a `phyphox://` link beside
"Get phyphox"; `tests/phyphox.test.js` keeps the link in step with `site_url`. Prototype
pages now say "not ready for classrooms yet" rather than "for adult testers".

**D37. School data: who decides what.** Gus, 2026-11-25, after the feasibility reviews
(`planning/review-shake-viewer.md`, `planning/review-phone-recorder.md`), two independent
critiques (`planning/critique-r1-claude.md`, `planning/critique-r2-codex.md`) and the authors'
refinements.
- **Privacy:** a school whose installed Shake already shares with Raspberry Shake's network
  has settled its data being public (its record is already public and live there). Our site
  adds no new exposure: such a school's data are published hourly, no added delay, under its
  name. A school that doesn't share publishes nothing until DRI and its district approve what
  goes public and with what delay; the server enforces any delay (private intake, publish
  step).
- **Delayed data are enough;** live is an optional later extra. Recommended feed: a DRI-owned
  bridge at each school reading the Shake's SeedLink (`slarchive`, no Shake password) and
  pushing out over HTTPS; rsudp is not used (it fetches metadata from Raspberry Shake's
  servers and fills gaps with zeros). The contract is `planning/spec-uhsn-data.md`; DRI IT
  chooses how to build it (brief: `planning/brief-dri-it.md`, for Cleat to take to DRI IT).
- **DRI decides** the Raspberry Shake license questions (publishing our own sharing Shakes'
  data; what to do if Raspberry Shake doesn't answer) and computes the summaries in its
  publish step (our GitHub job only as a fallback).
- **District approvals** (53G-7-228) are for DRI and the schools; we make Cleat and DRI aware.
- **Never** pull data from Raspberry Shake's servers, not even one test file (constraint 1);
  sizes are settled by DRI's first real files.
- The file-first School Shake viewer is built now as a prototype (session D11), separate from
  School Pulse but sharing its parts.

**D36. "In development: please test" for prototypes; phone readings are rounded, and we say
so.** Gus, 2026-11-25 (session D10-phone-bench). Prototypes for adult testers (Gus, Dale and
Cleat, the site's only users for now) get a guide, a card in an "In development: please test"
section of All apps, an Apps › In development menu group and a purple "Prototype" badge in
their top bar, but no activity card until Gus graduates them to the main list (rules in
`adding-an-app.md#in-development`; enforced by `tests/app-list.test.js` and
`tests/teacher-cards.test.js`). The site collects nothing; testers send results to Gus. The
first is Phone Bench (`app/phone-bench/`), the instrument for trial T1: it measures a phone's
real reading rate, jitter, rounding step, noise and flicker, and the permission prompt, with
results shown on screen and downloadable, nothing uploaded, and a notice that classroom phone
use needs the district's policy (SB 69). Because browsers round motion readings (0.1 m/s² in
Chrome; iPhones not confirmed), the bench guide explains it, Reading a seismogram has "How
small a shake can it see?" (phone vs Raspberry Shake vs broadband: step size, self-noise,
frequency range), and every future phone activity card must remind teachers of it
(`adding-a-card.md`). Sources: `planning/bench-sources.md`.

**D35. Show how to use a plot on the plot itself.** Sessions D5-band-hint and D8-waves-hint,
from Gus's notes that students missed "drag on the spectrogram" and "click the map": an
instruction placed under or beside a plot goes unseen. Each interactive plot carries its own
short label in a blue pill ("↕ Drag up or down to choose a band of notes", "Click the map to
move the quake", "↔ Drag to step through time"; "Tap" on touch screens), bold until the
student first uses it, then faint, never covering data or labels; the same text goes to
screen readers. Draggable edges get visible grips and a matching cursor. New apps follow
this pattern. Keyboard too (closed 2026-11-25, session D9-small-fixes): Tab reaches Quake
Waves' map, the arrow keys move the quake (Shift for bigger steps), the label then reads
"Arrow keys move the quake · Shift: bigger steps", and a hidden status line tells screen
readers where the quake is.

**D34. Build a Wiggle is a full app; All apps lists every app with a guide.** Gus,
2026-11-24 (session D7-wiggle-app). Build a Wiggle is interactive, so it has a guide
(`apps/build-a-wiggle.md`), an Apps-menu entry after Quake Waves, and a top bar whose Guide
link opens that guide; it stays embedded on Frequencies, fading and sound. The All apps page
lists every app with a guide in one grid, each card saying whether it uses real data or
made-up waves (Quake Locator, Quake Explorer, Quake Waves, Build a Wiggle, then School Pulse);
only cartoons without a guide (the P/S motion animation) stay under "Animations". Rule
written into `adding-an-app.md` step 3. Standards for Build a Wiggle: PHYS.4.1 · PHYS.2.1
(not CS 9/10.DA.3: students read the plots but don't make one). Supersedes the "no hub,
listed under Animations" notes in D21 and D22.

## 2026-11-24 (Quake Explorer; planning documents; teacher cards)

**D33. Point students to quakes with a clear S.** Gus, 2026-11-24 (session D6-clear-s). Each
ready-made quake carries a note on how clear its S wave is, counted the way each app shows
the quake ("clear" = S at least 3 times the P coda just before it, 1–10 Hz, best component):
Junction is the S − P quake (Quake Locator 7 of 10 stations; Quake Explorer A 16 of 23, C 5 of
6); Magna is "famous, but S is hard to see" (most records clipped); Kenilworth's S is faint.
Quake Locator adds a live-only Kanosh M3.3 (April 19, 2026; clear S at 10 of 10 stations, 29 km
from Millard High School). Quake Explorer A and C show "For a clear S…, try the 2026 Junction
quake" with a Load it link. The measure is `lib/clear-s.js` with tests that fail if a note's
count stops matching the offline samples. No live "S picks" count (too many USGS requests, and
picks don't track clarity); a nightly job may publish clear-S counts later (roadmap Stage 2).

**D32. US spelling everywhere readers look.** Gus, 2026-11-24 (session D4-spelling). Pages,
alt text, captions, app text and figure text use US spelling (kilometer, meter, color, gray,
labeled, center, -ize; "goes around"). Code names and code comments may stay as they are.
Titles and quotations keep their published spelling. All new writing follows this.

**D31. "Beyond one seismogram": the six missing plots on one science page, from real data.**
Gus, 2026-11-24 (session D2-plots). The evaluation's plots not yet shown (helicorder, PPSD,
seismic carpet, event stack, H/V, cross-correlation) are static real-data figures on a new
page after Reading a seismogram (`theory/plots.md`). Gus's choices: the helicorder day is SUU
(Juab's stand-in) on October 26, 2026; the repeated explosions west of the Great Salt Lake are
named as most likely the Air Force's rocket-motor detonations at the Utah Test and Training
Range, explaining ComCat's "quarry blast" label, in a callout students will enjoy; H/V uses
FOR4 (closed in 2021) because no current UU three-component station sits on deep fill.
Interactive versions belong to apps later (the carpet in School Pulse, the PPSD in "Our Shake
vs the pros"); the new library modules are written for that reuse. Standards: PHYS.4.1 ·
ESS.2.2 · ESS.4.1 · CS 9/10.DA.3 · CS 11/12.DA.1 (ESS.4.1 because soft ground amplifies
shaking). Sources are logged in `planning/plots-sources.md`. SUU's vertical channel, about
10× weaker than its horizontals, is passed to UUSS through Dale and Cleat (question 9).

**D30. Wave Race is renamed Quake Locator; names only.** Gus, 2026-11-24, so the name says
what the app does (it also matches Quake Waves and Quake Explorer). Its activity card is
"Activity card: Quake Locator"; the race between P and S stays in the lesson text as the
idea. Only names change: the addresses (`app/wave-race/`, `apps/wave-race.md`,
`teachers/wave-race-card.md`), code names (`js/wave-race/`, `WAVE_RACE`, `uhsn.waveRace.*`)
and test file names stay, and renamed headings keep their old anchors, so no link breaks. The
CSV download is `quake-locator-<id>.csv`. `tests/old-app-name.test.js` keeps the old name off
the site; one developer note says where the old name survives. Decisions above and earlier
status notes keep the old name as history.

**D29. Every activity card opens with the same "At a glance" box, and a test keeps cards and
apps linked.** Gus, 2026-11-24 (session D1-cards). The box has seven lines: driving question,
time, setup, apps and tools, before this, materials, Utah standards (linked to the
crosswalk). The Teachers page lists the cards in a catalog (Activity · Apps and tools · Setup
· Time · Standards), grouped by setup; the site names only the setups that have cards
("Browser only" so far; "School Shake" when one exists), since plans stay off the site (D13).
Standards claims carry no "assessed / contributes / extension" labels: the site is a
prototype, not yet shown to teachers (Gus). `tests/teacher-cards.test.js` checks D19 both
ways, that every hub and every All apps entry is used by a card, the box layout, and that the
catalog and "Utah standards at a glance" match each card. Template and checklist:
`docs/developers/adding-a-card.md`. New card "One quake, two waves" (Quake Waves and the P/S
motion animation, 10 minutes). The Wave Race card gained a group competition (lowest miss,
then closest to the official epicenter; the teacher names the stations). Closes D25's "boxes
still to come".

**D28. The two documents for Dale and Cleat: activities by setup, one set of status words, a
small pilot, no prices.** Gus, 2026-11-24. The questions document ("UHSN classroom activities
by setup", `planning/activities.md`) opens with the questions, then 46 activities grouped by
setup with IDs E (external data), S (the school's installed Shake), R (a roaming Shake), P
(phones), each with one readiness label (available now / needs data or a tool / proposed /
needs a trial). The overview ("Utah High School Seismic Network: Student Apps and
Activities", `planning/evaluation.md`) gives status and concepts and points to the questions
document for every ask. Both use the same words: "planned" means on the roadmap, anything
else is "proposed" (How Big Was It?, Build a Detector and Weather Ears are proposed). The
suggested pilot, worded the same in both: E2 Quake Waves → E1 Wave Race → S1 Meet our Shake
now, then S3 School Pulse once the school data and its tool are ready (Stage 4); Quake
Explorer is the next step for classes that want more. No prices anywhere in either document;
US spelling. Word copies: "UHSN overview - student apps and activities.docx" and "UHSN
questions - classroom activities by setup.docx". Outside sources behind figures go in a
source log in `planning/` (e.g. `planning/plots-sources.md`), not on student or teacher pages.

**D27. `planning/evaluation.md` is the canonical project overview; two Word documents go to
Dale and Cleat.** Gus, 2026-11-24. The repo copy replaces the living claude.ai planning doc,
which is deleted once the rewrite lands. The overview is being rewritten around current
status: what we are trying to do (teach by doing, with real, local data), what is live, how
science pages, activity cards and apps link, Utah standards, data rules. Detail moves to
appendices, and open decisions move to the questions document, `planning/activities.md`. The
Word copies ("Raspberry Shake in Utah High Schools … Concepts.docx" and "UHSN activities by
setup.docx") are built from the Markdown with `tools/planning-docx/md_to_docx.py`. An outside
review (`planning/co-pi-review-2026-11-24.md`, Codex) is input to both rewrites, not a
decision.

**D26. Installed Shakes are fixed stations (working assumption).** Gus, 2026-11-24. No
activity moves, re-levels, unplugs or re-orients a school's installed Shake: activities move
the *source* (drops, jumps, sounds at measured spots) or add a *second* sensor (a roaming
Shake, phones). Moving one would break its continuous record and its registered location.
Revisit if DRI says a school has a spare unit (Juab has two Shakes).

**D25. Teacher cards for Quake Explorer: one per investigation.** The full-period lesson that
chains A and C (speeds, then locating a quake from one station) is the full-period version of
the C card. With five cards, the Teachers sidebar groups them under "Activity cards". Wave
Race appears on these cards as "Before this", not as an app the lesson uses, so the D19 rule
(each hub lists every card that uses its app) holds. The cards' "At a glance" boxes are still
to come, with the Wave Race card's.

**D24. Quake Explorer's offline samples and travel times.** Six samples (2.4 MB) in their own
`explorer` list in `samples/index.json`, so Wave Race's sample and test are unchanged;
`SampleSource` offers only the requested quake's stations. Each sample keeps full channel
metadata, labelled computer picks and the command that made it. Distant-quake travel times
come from a precomputed iasp91 table (39 KB, ObsPy TauP), because the EarthScope/IRIS
travel-time service has been retired.

**D23. What the data support in Quake Explorer, and how the app shows it.** Approved by Gus
(Phase 0, `planning/quake-explorer.md` section 9). Pn and the Moho are taught with Magna 2020:
Pg about 6.2 → Pn about 7.7–7.8 km/s, crust about 36–37 km (the app's reveal, 30 stations:
6.22 → 7.67 km/s, 36 km; the science page, all 31: 6.17 → 7.78 km/s, 37 km). The bend is
shown only when clear (F > 12, at least 8 far stations, Pn between 7.2 and 8.6 km/s and
within 0.3 km/s), so Junction gets a hint. Computer (AIC) picks fill in where the analysts
made none (P beyond about 180 km, and most S picks), shown when P SNR ≥ 8 and labelled as
computer picks; differences from analyst picks are discussion material, not errors (Gus).
Particle motion: 1–5 Hz, window P − 0.05 s to P + 0.5 s, "usually within about 15° for
stations within about 100 km". "True ground speed" only when no station clipped (flat-top
detection) and m/s is known for at least 80% of stations. Reduced time is an optional
advanced toggle. Quake Explorer only converts counts to m/s; magnitude is left to a possible
future app (not on the roadmap).

**D22. Quake Explorer: four investigations, each Predict · Explore · Why? · Check.**
A record section (measure P and S speeds with rulers; the Pg → Pn bend and the crust's
thickness), B spectrogram and sound (drag-a-band filter; near vs far; quarry blast vs quake),
C particle motion (own guess, then the computer's and the true direction; one-station
location), D distant quakes (P and S picks; S − P → distance from an Earth model; travel-time
chart). Check stays off until a prediction is chosen; predictions stay in `localStorage`.
Built before School Pulse (Gus, 2026-11-24), which changes the stage order of 2026-11-23.
With it came three science pages (Travel times and Earth's layers; Frequencies, fading and
sound; Which way the ground moves) and the Build a Wiggle animation (`app/build-a-wiggle/`,
no hub, embedded on Frequencies and listed under Animations).

## 2026-11-24 (Stage 1 additions)

Numbering: an entry takes the next free number when it lands on `main`. Branches and parallel
sessions don't reserve numbers.

**D21. Navigation Phase 2: a hub for Quake Waves, one app list, one top bar for every app.**
The animation app moved to `app/quake-waves/` and got its hub, `apps/quake-waves.md`; a
redirect stub at the old path keeps old links and embeds working (it passes on `?embed=1` and
the `#hash`). The plain-HTML launcher `app/index.html` now forwards to the themed All apps
page, so there is one app list. Every app page has the same static top bar ("UHSN · All apps";
"Guide ↗" and "About the data ↗" open in new tabs so students don't lose work); its links stay
plain `href`s so the link test checks them. Shared page helpers (credits, source badge, `esc`,
CSV, embed mode, following the docs' theme) live in `docs/app/js/ui/page.js`, which Quake
Explorer will reuse. Animations embedded on science pages are listed on All apps; the P/S
motion animation (`app/wave-motion/`) has no hub of its own. `tests/app-list.test.js` checks
that every app folder is listed; redirect stubs carry a `uhsn-redirect` marker.

**D20. New science page "Reading a seismogram" (signals and noise), built from real records.**
`docs/theory/seismograms.md`, between Seismic waves and Distance from S minus P. Students see
what else a seismometer records, so they can tell a quake from everything else: the instrument
and counts, a quake record, ocean hum, wind, people and machines, near/regional/distant quakes,
blasts, instrument problems, filters and a spectrogram, and four mystery records. Seismic waves
keeps the wave physics; its sections on reading a seismogram, filters and the instrument moved
here. Every example is a real, dated record from UU stations (EarthScope) or ComCat, checked
before it was written up: ocean hum 0.16–0.25 Hz at TMU (2–4× stronger in winter); wind noise
typically about 4× (up to 10× in gusts) on windy nights at FOR8 near Milford, against the airport's wind; a working week
at HEB near Heber City (weekdays 8×, Sunday 2× the night level); 97% of the 301 blasts ComCat
marks in Utah since 2015 were between 8 am and 6 pm; clipping (SAIU, 16-bit vs 24-bit) and a
dead channel (SUU) in the 2020 Magna quake. Wind data come from an airport weather station via
the Iowa Environmental Mesonet, because no UU station has its own. No real spike was found
(EarthScope's daily checks found none at UU in Sep–Oct 2026), so spikes are described, not
shown. The seismometer diagram is a generic geophone; the UHSN Shake's model and hardware are
still to be confirmed. Scripts: `tools/figures/seismogram-figures.mjs` (downloads cached,
git-ignored; week-long noise levels kept as small JSON) and `seismogram-diagrams.mjs`.

**D19. Teacher materials are organized by activity; activities and apps are many-to-many.**
Gus, 2026-11-24. An activity card is one lesson: driving question, timing, setup, standards,
answer key. A card may use several apps (the Wave Race card already uses Quake Waves as its
warm-up) or none (campus experiments, phone activities), and an app may appear in several
cards (Quake Explorer: one per investigation). Every app has at least one card. Each card
states the apps or tools and the setup it needs; each app hub lists the cards that use it; the
Teachers page lists every card. Plan: roadmap.md, "Across all stages: teacher activity cards".

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
*Extended later on 2026-11-24:* the Science pages get the same treatment: real-data SVGs from
the offline sample, and diagrams and maps drawn with the apps' own `lib/` code (one script per
group in `tools/figures/`, shared style in `svg-traces.mjs`), so a figure matches what the
apps compute. Every script is deterministic (same bytes each run). Animations are small
embedded pages under `docs/app/` (Quake Waves, and the P/S rock-motion cartoon), not apps
with hubs. The figure plan and status are tracked in a shared doc (link in
`planning/science-figures.md`).

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
