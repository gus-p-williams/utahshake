# Quake Explorer: development plan

*2026-11-24. Status: approved for building with the working answers in section 8; Phase 0
and the logic modules are under way on the `quake-explorer` branch. Update `roadmap.md`
(Stage 3) and `decisions.md` when the branch merges.*

Quake Explorer is Stage 3 in [roadmap.md](roadmap.md): the multi-view app the name is
reserved for (D18). It combines a spectrogram, a record section, particle motion and sound.
This plan is based on a survey of the app code, the docs template, and live EarthScope/USGS
queries made on 2026-11-24 (section 3).

## 1. The teaching idea

Wave Race *gives* students two numbers: P travels 5.8 km/s and S 3.3 km/s. Quake Explorer
starts from the next question: **"A seismogram is a message from inside the Earth. What else
can you measure from it?"** In each investigation students measure something about the rock
or the quake themselves, then check it against the professionals' answer.

Every investigation follows the same five steps, shown in a side panel in the app (nothing
leaves the browser):

1. **Question:** one driving question, starting from something visible in the data.
2. **Predict:** students commit before looking (choose an option or sketch a line). A wrong
   prediction is what makes them ask "why?".
3. **Explore:** work with real data.
4. **Explain why:** a short "Why?" panel linked to a theory page. Every number on screen has
   a "where does this come from?" link.
5. **Check:** reveal the professional answer (UUSS picks, model curves, official epicenter)
   and discuss how far off they were.

Kept from Wave Race:

- a labelled cartoon before real data;
- the answer stays hidden until students choose to reveal it;
- students make their own guess before the computer fits one;
- one worked example used everywhere (the Junction M3.3 quake, uu80162166);
- an honest "how professionals do it" section.

## 2. The four investigations

### A. "How fast is the rock?" (record section)

- **See:** about 24 stations from 0 to 300 km, each station's trace stacked by its distance
  from the quake.
- **Predict:** "Sketch where P will arrive at 300 km." Many students draw all arrivals at
  the same time.
- **Do:** drag a ruler along the P arrivals and another along the S arrivals. The app reports
  each slope in km/s; students compare with Wave Race's 5.8 and 3.3.
- **Why:** each station is a stopwatch at a known distance. Distance ÷ time is speed, so the
  arrivals line up and the slope of the line is the speed. Near the quake the line curves,
  because the waves started about 8 km deep (distance = √(d² + h²)).
- **Elaborate (the strongest idea in the app):** beyond about 150 km the first arrivals jump
  onto a faster line. That wave is Pn: it dives to the mantle, runs along its top at about
  7.9 km/s and comes back up. Where the two lines cross tells you how thick the crust is.
  Mohorovičić used the same reasoning in 1909, and it matches the campus refraction
  experiment in the evaluation. Answers ESS.2.2 ("model Earth's interior from evidence")
  directly. *Phase 0 must confirm the bend is visible in UU data.*
- **Toggle:** "each trace stretched to fit" vs "true ground speed (m/s)". Far stations look
  as big as near ones only because they were stretched; the true view shows the fading.
- **Check:** UUSS analyst picks and model travel-time lines. A student's own Wave Race picks
  also appear if the browser still has them (`uhsn.waveRace.picks.<eventId>`).

### B. "What notes is the ground playing?" (waveform, spectrogram, filter and sound)

- **Warm-up:** a "Build a wiggle" cartoon. Students add two or three sine waves with sliders
  and watch the waveform and its spectrum change. Embeddable on the theory page, like
  Quake Waves.
- **Do:** one station, waveform above its spectrogram on a shared time axis. Students drag a
  band on the spectrogram's frequency axis, and that band *is* the filter. The waveform
  updates live; a signal-to-noise readout shows when the quake stands out from the noise.
  Filtering becomes "keep these notes" instead of a menu choice.
- **Predict:** "Which station keeps more high notes, one 25 km from the quake or one 250 km
  away?"
- **Why:** every wave cycle loses a small fraction of its energy as heat in the rock. Over the
  same trip a 10 Hz wave goes through ten times as many cycles as a 1 Hz wave, so it loses
  far more. High notes fade first, which is why a distant quake arrives as a low rumble. In
  A ∝ e^(−πft/Q), f·t is just the number of cycles.
- **Listen:** play the record 50 to 400 times faster, with a cursor moving across both plots.
  - Speeding up by k multiplies every frequency by k. A 1 Hz quake signal is below the 20 Hz
    limit of hearing; at 100× it becomes 100 Hz.
  - At 400× the highest frequency a 100 sample/s sensor can record (50 Hz) lands at 20 kHz,
    the top of human hearing: the Nyquist limit made audible.
- **Elaborate: quake or blast?** Compare the Junction M3.3 quake with the M3.4 mining
  explosion near Vernal (us7000s0lb), or the quarry blast at Leamington near Juab and
  Millard (uu80161881, clear at SUU). What is different, and does it prove anything? Framed
  as evidence, not proof; leads into Signal Detective and research Project A.

### C. "Which way did the ground move?" (particle motion)

- **See:** a 3-component station (TMU or SGU, both broadband). Students select a short window
  and the ground's path is traced from above (north vs east) and from the side (toward the
  quake vs vertical).
- **Predict:** "P waves push and pull; S waves shake sideways. What path should the ground
  trace during each?"
- **Do:**
  - Select the first half second of P. The motion lines up along one direction, which the
    app extends as a line on the map from the station.
  - Rotate the components to "toward the quake" and "sideways". P energy lands on the first
    and S energy on the second, so students show from real data that P is longitudinal and
    S is transverse.
- **Why:** P pushes the ground along its direction of travel, so the motion points back toward
  the quake. Whether the first motion is up or down settles which end of the line the quake
  is on: a compression pushes the ground up and away from the source.
- **Challenge:** locate a quake with one station, using the direction from particle motion
  and the distance from S − P (as in Wave Race). The epicenter stays hidden until the
  reveal. Errors of 10° to 30° are normal; the class discusses why (layers bend the waves,
  noise, scattering).

### D. "A message from the far side of the world" (distant quakes)

- Large distant quakes recorded at TMU and SGU, the broadband stand-ins for Wasatch Academy
  and Gunnison Valley (candidates in the appendix).
- All three views work on a 60-minute record showing P, S and then very large surface waves.
- **Why surface waves are biggest far away:** body-wave energy spreads over a growing sphere,
  so amplitude falls as 1/r; surface waves spread over a growing ring, so they fall only
  as 1/√r.
- **Why the pitch rises when you listen:** longer waves reach deeper, faster rock, so the low
  notes arrive first.
- **Why Tonga's surface waves are weak:** surface waves travel near the surface, and a quake
  234 km deep hardly sets them off. Students predict this before comparing with the
  shallower Japan quake.
- **Class travel-time chart:** S − P against distance for several quakes gives a curve, not a
  straight line, because the rock gets faster with depth (ESS.2.2).

Amplitude vs distance and magnitude: proposed to stay in the separate "How Big Was It?" app,
as the evaluation planned (open decision 5). Quake Explorer builds the counts-to-m/s
conversion that app will need.

## 3. What the data allows (live checks, 2026-11-24)

- **Plenty of stations.** 81 to 89 UU velocity stations within 300 km of each preset quake
  (Magna: 89, 36 of them 3-component; Junction: 81, 51 of them 3-component).
  - A 24-station record section of vertical channels is about 0.7 MB; with all 3 components
    about 2 to 2.5 MB, loading in 3 to 5 seconds. Average 7.5 to 12.5 KB per
    channel-minute.
- **Stations must be spread out by distance.** The 30 stations nearest Junction only reach
  114 km, because the FORGE cluster puts about 15 stations at 49 to 74 km.
- **Large nearby quakes overload some sensors.** Magna M5.7 clipped NOQ (12 km, 24-bit limit)
  and nearly CTU (28 km). Flag clipped traces (a teaching moment) and use accelerometers
  (EN?/HN?) within about 30 km for M5+ quakes.
- **Counts to m/s needs no extra request.** The station text the app already fetches has
  sensitivity, units, azimuth and dip, but `parseStationText` discards them
  ([fdsn.js:56-71](../docs/app/js/lib/fdsn.js#L56-L71)).
  - Units differ: 36 UU short-period channels, including the ELU and WCU stand-ins, are in m
    rather than m/s. Some RE (Bureau of Reclamation) metadata looks unreliable; keep true
    amplitude to UU.
  - Stations with 1/2 horizontal channels (FORGE FSB\*, RE, US.DUG) need rotating to
    north/east by azimuth; `chooseChannels` currently treats 1/2 as N/E.
- **Some stations return nothing.** EarthScope's availability service is retired (404), so
  about 5 to 8% of listed stations come back empty. Show "no data", not an error.
- **School stand-ins:** TMU and SGU broadband, 3-component (Trillium Horizon 120 s);
  SUU 3-component short period; ELU and WCU vertical only. All 100 samples/s.
- **Distant quakes:** Sand Point at SGU, 3 channels × 60 min = 1.2 MB, P at minute 7,
  surface waves peaking at minutes 15 to 20. Aomori at TMU, vertical, 60 min = 0.38 MB.
- **Blasts in the catalog (Utah box, 2 years):** 68 quarry blasts, 26 mining explosions
  (mostly near Vernal), 1 explosion.

## 4. Technical design

**Page:** `docs/app/quake-explorer/`.

- Quake picker (Utah quakes, plus presets for distant quakes and blasts), three view tabs
  (Record section · Frequencies and sound · Ground motion), the investigation panel, a map.
- Views are linked: clicking a trace in the record section opens that station in the other
  views; a selected time window drives the particle-motion plot and the sound.
- A `?event=&view=&sta=` address lets a teacher put the whole class on the same screen.

**Reused as is:**

- the DataSource interface and both sources, the miniSEED parser and the band-pass filter;
- station and channel selection, analyst picks, the geography helpers;
- `TraceView` (single-station waveform), `MapView`, the theme, the credits footer, the
  iframe embed pattern.

**New logic modules** (pure functions in `docs/app/js/lib/`, each with `node --test` tests):

| Module | Contents |
|---|---|
| `spectral.js` | Small radix-2 FFT, Hann window, short-time FFT, dB scaling, written by us. Students can read it, and it tests in Node without the browser stub. The new spectrogram in seisplotjs 3.3.0 uses only the real part as power and pulls in d3 (+250 KB). |
| `traveltime.js` | Direct P and S times with depth; Pn head wave and crossover for a one-layer crust; a small precomputed travel-time table for distant quakes (iasp91, made by a `tools/` script with ObsPy). No remote service. |
| `linefit.js` | Least-squares line: speed and intercept with uncertainty. |
| `motion.js` | 1/2 → N/E rotation by azimuth; N/E → toward-the-quake / sideways; main direction of motion with the first-motion sign. |
| `units.js` | Counts → m/s from sensitivity, with a units check. |
| additions to `signal.js` | Downsampling with anti-alias filter, linear detrend, RMS and signal-to-noise, clip detection. |

**New drawing views:**

- `RecordSectionView`: distance axis, stretched or true amplitude, draggable rulers, model
  curves.
- `SpectrogramView`: colour-blind-safe colour map with a dB colour bar.
- `HodogramView`: the particle-motion plot.
- `audio.js`: sped-up playback (AudioBuffer at sample rate × speed-up) with a moving cursor
  and fade in/out; starts only on a click (Chromebook autoplay rules).

**Data layer changes:**

- Keep the extra station columns (sensitivity, units, azimuth, dip).
- Add `selectRecordSection()`: one station per distance band (e.g. 12.5 km bands to 300 km),
  preferring 3-component and analyst-picked stations, sorted by distance.
- Option to use accelerometers.
- For distant quakes, choose stations near the schools rather than near the quake.
- Vertical channels only by default, all 3 components on request; size cap about 3 to 5 MB
  per view.

**Shared page parts:** move the top bar, credits, source badge, `esc` and CSV helper into
`js/ui/` during the navigation work D18 left for later (renaming the animation folder,
standard app top bar), so Quake Explorer is not a third hand-copied version.

**Offline samples:**

- A new kind of sample (`"kind": "explorer"` in `samples/index.json`), so
  `tests/sample.test.js` keeps checking Wave Race's 10-station sample without breaking.
- Contents: the Junction record section (24 stations, 3 minutes); one distant quake at TMU
  and SGU (60 minutes); the Leamington blast at SUU. About 4 to 5 MB in git.

## 5. Docs and teacher materials (same template as Wave Race)

- **Hub page** `docs/apps/quake-explorer.md`: "At a glance" box, one step section per
  investigation, generated figures (D16), offline fallback, Going further.
- **New theory pages** (primer ideas 4 and 6 are partly or entirely missing from the site):
  - *Frequencies and spectrograms:* Fourier's idea, Nyquist and aliasing, listening to
    quakes, with "Build a wiggle" embedded.
  - *Why waves fade:* spreading, energy lost as heat, why high notes go first.
  - *Travel-time graphs and the layers under Utah:* why slope = speed, Pn and the Moho, the
    curved chart for distant quakes.
  - *Which way the ground moves:* P vs S motion, direction to the quake, rolling surface
    waves.
  - Add counts → m/s to the instrument section of `docs/theory/waves.md`.
  - Sidebar grows from about 18 to about 25 entries (D17 revisit point is about 35).
- **Teacher card in modules:** each investigation as a 15-minute projector demo; a
  full-period 5E lesson chaining A and C (wave speed plus direction → locate from one
  station); answer key on the offline sample, common difficulties, exit tickets.
- **Standards:** PHYS.4.1, ESS.2.2, PHYS.2.1, GEOL.3.1, CS 9/10.DA.3 and 11/12.DA.1.
- **Developer notes** (`docs/developers/quake-explorer.md`), decision-log entries (D19 on),
  roadmap Stage 3 updated.

## 6. Build phases

Each phase ships a working app plus docs to the website, as Stage 1 did.

| Phase | Contents | Done when |
|---|---|---|
| 0. Science check (scripts only) | Plot record sections for Junction and Magna to see whether the Pn bend shows. Test the particle-motion direction at TMU and SGU against the true direction. Choose presets; build the offline samples. | We know which investigations the data supports, and have the numbers for the answer keys. |
| 1. App shell + A | Page, picker, data-layer changes, `linefit`, `traveltime`, `units`, record-section view, travel-time theory page, card module A | A student measures P and S speeds within about 10% and can say why the slope is the speed. |
| 2. B | `spectral`, spectrogram view, drag-a-band filter, sound, "Build a wiggle", near/far and quake/blast presets, two theory pages | A student finds the band where the quake stands out and explains why the far station sounds lower. |
| 3. C | `motion`, particle-motion view, direction line on the map, one-station location challenge | A student finds the direction to the quake within about 30°. |
| 4. D | Distant-quake presets and sample, downsampling, class travel-time chart, CSV export | A class chart from 4 or more quakes shows the curve, and students can explain it. |

**Why this order:** A is the direct sequel to Wave Race ("where did 5.8 and 3.3 come
from?"), reuses the most code and fits the standards best. B adds frequency, which C and D
need. D needs all three views.

**Testing in every phase:** `node --test` with synthetic signals of known answer (a 5 Hz sine
peaks at 5 Hz; a wave sent from 30° is found at 30°); checks against the real-data samples;
headless Chrome at 1366×768 and phone width; `mkdocs build --strict`; a teacher trial.

## 7. Risks

- **Pn bend hard to see.** Phase 0 settles this before teaching material is written. If it
  fails, keep the direct-wave speeds and teach the Moho through distant quakes or the
  campus refraction experiment.
- **Particle motion for local quakes is messy.** Use broadband stations, a low-pass filter
  and the first half second of P; tell students honestly how large the errors are.
- **Too much on screen.** One investigation at a time, with an "Explore freely" mode for
  strong students.
- **Sound in class.** Headphones or teacher-led on the projector; nothing plays without a
  click.
- **School networks.** Offline sample for every investigation; download size caps.
- **License and privacy unchanged.** UU/EarthScope and USGS data only, no Raspberry Shake
  servers; predictions and picks stay in the browser.

## 8. Decisions (working answers, 2026-11-24)

Gus agreed to the suggested options for now. These answers are provisional: they go into
`decisions.md` as D20 onward only when the `quake-explorer` branch is merged (D19 is reserved
for navigation Phase 2).

1. **Stage order:** Quake Explorer is built now; School Pulse (Stage 2) comes after.
2. **Investigation order:** A (record section) → B → C → D.
3. **Distant quakes:** D stays in Stage 3 as the last phase; it can be deferred if time runs
   short.
4. **Repo size:** about 4 to 5 MB of offline samples in git is acceptable. Keep them as small
   as practical and report the final size.
5. **Magnitude:** stays in the separate "How Big Was It?" app. Quake Explorer builds only the
   counts → m/s conversion.

**How it is being built.** Work happens on the `quake-explorer` branch in its own git
worktree, while navigation Phase 2 and a figures session work on `main`. Phase 0, the logic
modules and the drawing views come first. The app page and all docs wait until navigation
Phase 2 has landed on `main` (shared top bar and credits module in `docs/app/js/ui/`,
`docs/app/index.html` redirecting to `../apps/`, D19 in `decisions.md`, top bar described in
`adding-an-app.md`). Teaching material that depends on Phase 0 results (the Moho/Pn idea,
particle-motion accuracy) waits for Gus's OK on those results.

## 9. Phase 0 results (2026-11-24)

Science checks with real UU data and the app's own modules (`tools/quake-explorer/`:
`pn-check.mjs`, `motion-check.mjs`, `blast-check.mjs`, `answer-key.mjs`). The answer-key numbers
are recomputed from the bundled samples by `tests/explorer-sample.test.js`. **Teaching material
that depends on these results waits for Gus's OK.**

**A. Record section: supported. The Moho/Pn idea works with Magna; Junction only hints at it.**

| | Junction M3.3 (2026) | Magna M5.7 (2020) |
|---|---|---|
| P speed near the quake (analyst picks within 100 km) | 6.13 ± 0.12 km/s | 6.07 ± 0.09 km/s |
| S speed | 3.41 km/s from the 3 analyst S picks (within 77 km); 3.67 km/s with computer picks to 240 km (scatter 0.75 s) | 3.6 ± 0.2 km/s (few, noisy picks) |
| Analyst P picks reach | 178 km | 182 km |
| Pg -> Pn bend (analyst + clear computer picks) | hint only: beyond ~200 km, far line 8.4 ± 1.0 km/s from 4–6 stations | clear: 6.17 -> 7.78 ± 0.10 km/s, F = 60 (clear above 12), lines cross ~150 km |
| Crust thickness (intercept method) | 40–47 km, unreliable | ~37 km |

- In reduced time (t − d/8), Pn arrivals run straight down: the bend is obvious. In plain time
  it shows with two rulers. Suggest reduced time as an optional "advanced" toggle.
- The Pn evidence beyond ~180 km rests on computer (AIC) picks, because the analysts stopped
  there. Those picks are labelled as computer picks in the samples.
- **True ground speed:** Junction is clean. Its peaks fall as distance^−1.7, with about ×2
  scatter. Magna (2020) is messy:
  - 10 of 31 stations clipped: 9 older 16-bit short-period stations at ±32 768 counts, plus NOQ
    at the 24-bit limit.
  - Others are off by up to ×100; SGU's 2020 short-period channel is one of them.
  - So use Junction for the true-amplitude toggle. Show Magna stretched, with clipped traces
    labelled as a teaching moment.
- Crust thickness of 37 km (Magna) and 40+ km (Junction, paths to the east) look plausible for
  central and northern Utah. Check them against a published crustal-thickness map before the
  theory page is written.

**B. Frequencies: supported.**

- **Near vs far.** High/low ratio (8–20 Hz / 1–5 Hz) for Junction: MTPU (29 km) 0.22, SGU
  (114 km) 0.14, LIUT (212 km) 0.14.
- **Blast vs quake of the same size.** Leamington quarry blast uu80161881 (M2.11, 17:33 MDT)
  against earthquake uu80120191 (M2.11, 13 km away, 20:30 MDT):
  - At 13 stations, the blast has fewer high notes at all 13 (median 0.27 vs 0.61) and a larger
    P/S amplitude ratio at 9 of 13 (median 0.67 vs 0.34).
  - At SUU (Juab stand-in): high/low 2.05 vs 3.25; P/S 2.44 vs 0.66.
  - A second quake (uu80160971) agrees: 0.35 vs 0.97, with P/S larger at 6 of 8 stations.
  - This supports "evidence, not proof".

**C. Particle motion: supported for stations within about 100 km.**

- 271 station-quake pairs from 14 quakes. With 1–5 Hz filtering and a 0.3–0.5 s window from
  the P pick:
  - median error 12–14°, about 70% within 30°, 6–7% pointing to the wrong end;
  - with clear motion only (linearity > 0.8, up/away > 0.5): median 10°, 85% within 30°.
- At 130–150 km it becomes unreliable, which is where SGU and TMU sit for most recent quakes
  near FORGE.
- Sample answers (0.5 s window):

| Sample | Stations and errors |
|---|---|
| Kenilworth M2.7 | TMU (Wasatch Academy stand-in, 68 km) −3°; MPU 3°; CVRU −2°; BSUT 14° |
| Junction | MTPU 16°; TCRU 14°; FOR1 2° |
| Magna | SPU −5°; BGU 1° |

**D. Distant quakes: supported (groundwork done the same day).**

- Travel times come from a table, not a web service: EarthScope's travel-time service has been
  retired. `tools/quake-explorer/traveltime_table.py` (ObsPy TauP, iasp91) writes
  `docs/app/data/traveltimes-iasp91.json` (37 KB).
- Sand Point M7.3 at SGU (35.8°, 3 985 km):

| Wave | iasp91 | Picked at SGU |
|---|---|---|
| P | 6:56 | 6:59 |
| S | 12:32 | about 12:45 on the horizontal channels (on the vertical it is hardly visible) |
| Surface waves (10–33 s period) | expected 15:49–22:08 | peak at 19:39 |

- In Utah, P arrives about 3 s and S about 14 s later than the global average model predicts.
  That makes a short discussion point; check any explanation (slow upper mantle under the Basin
  and Range) before it goes into the docs.
- S shows on the horizontal channels: far away it arrives from almost straight below and shakes
  sideways. This is the same physics as investigation C.
- Sample `qe-sand-point`: 860 KB, 30 minutes (SGU with 3 components, TMU vertical).

**Offline samples** (`docs/app/data/samples/`, `"explorer"` list), 2.4 MB in total
(qe-sand-point, listed under D above, is 860 KB of that):

| Sample | Contents | Size |
|---|---|---|
| qe-junction | 24 stations, 300 km | 650 KB |
| qe-magna | 31 stations, 400 km | 700 KB |
| qe-leamington-blast | 5 stations | 72 KB |
| qe-leamington-quake | 5 stations | 82 KB |
| qe-kenilworth | 4 stations | 85 KB |

**Discussion material (Gus: differences from analyst picks are fine, and make good short
discussions):**
- Computer S picks scatter by ±0.75 s around the analysts' S line. Why is S harder to pick
  than P?
- The Pn bend is only visible beyond where the analysts stopped picking.
- Clipped Magna records: the instrument maxed out. Why does a dead or clipped station look
  quiet in "true" mode?
- Particle-motion directions are off by 10–15° on average. Rocks are not uniform, and waves
  bend.

**Approved by Gus (2026-11-24), so teaching material can build on them:**
1. Pn/Moho taught with Magna as the main example and Junction as a hint.
2. Particle motion framed as "usually within about 15°, for stations within about 100 km".
   The one-station location challenge uses Kenilworth/TMU and Junction's near stations.
3. Reduced time as an optional advanced toggle.
4. The true-amplitude toggle only for Junction.

## Appendix: candidate presets (checked 2026-11-24)

| Use | Event | USGS id | Notes |
|---|---|---|---|
| Worked example, record section | Junction M3.3, 2026-10-31 | uu80162166 | 81 UU velocity stations within 300 km; already the Wave Race offline sample |
| Big local quake | Magna M5.7, 2020-03-18 | uu60363602 | 89 stations; nearest broadband clipped |
| Blast vs quake | Mining explosion M3.4 near Vernal, 2026-02-26 | us7000s0lb | Same size as Junction; us7000qx4d (M3.4) is another |
| Blast near the schools | Quarry blast M2.1 near Leamington, 2026-10-26 | uu80161881 | Clear at SUU on 3 channels (37.9 KB for 90 s) |
| Distant, ~36° | Sand Point, Alaska M7.3, 2025-07-16 | us7000qd1y | Full 60 min at SGU confirmed |
| Distant, ~75° | Aomori, Japan M7.6, 2025-12-08 | us6000rtdt | Full 60 min at TMU (vertical) confirmed |
| Distant, deep | Tonga M7.5, 234 km deep, 2026-03-24 | us7000s789 | Weak surface waves expected; not yet fetched |
| Other options | Hubbard Glacier M7.0 (27°), Panama M7.7 (42°), Kamchatka M8.8 (59°) | us6000rsy1, us6000u18k, us6000qw60 | |

Station query used for coverage: EarthScope `fdsnws/station/1/query` (`level=channel`,
`format=text`, `net=UU`, `cha=HH?,EH?,BH?,HN?`). Payload tests were single POSTs to
`fdsnws/dataselect/1/query` with a −20 s to +160 s window.
