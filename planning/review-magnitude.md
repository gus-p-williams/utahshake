# Review: magnitude for UHSN students

*Session P5-magnitude-review. Version 2, 2026-11-25, for Gus and Cleat, after two
independent critiques: R3 (Claude, `planning/critique-r3-claude.md`) and R4 (Codex,
`planning/critique-r4-codex.md`). Both agreed with the recommendation. Version 2 corrects the
Wood-Anderson science and reruns every number with UUSS's constants. It reruns the accuracy
check on the stations Quake Explorer actually loads, adds about ten quakes from other parts of
Utah that were used for nothing else, and fixes the draft science page. Section 8 answers
every finding. Section 7, a plan for a science page on magnitude, was added at Gus's request
(through M1). Nothing here is a decision unless it says it is Gus's. Companion: the source log
`planning/magnitude-sources.md`. US spelling.*

Cleat asked, through Gus: **is a magnitude app, or magnitude added to an existing app, worth
building, and what would it take?**

## Summary

**Yes, it is worth building, and the data support it.** Students follow the recipe UUSS uses,
Richter's: the biggest swing on a simulated Wood-Anderson seismograph (Richter's nominal
instrument: 0.8 s, damping 0.8, magnification 2,800), corrected for distance with Richter's
1958 table. I tested it on the stations Quake Explorer actually loads, for 22 small training
quakes (M2.1–4.0, mostly central Utah) plus Magna 2020, and on **10 quakes from other parts of
Utah that were used for nothing else** (the holdout: M2.7–4.4, 2022–2026). On the holdout, a
group lands close to UUSS's official local magnitude (ML):

| A group that measures (holdout, out-of-sample) | Within 0.3 of UUSS's ML | Within 0.5 | Within 1.0 |
| ---------------------------------------------- | ----------------------- | ---------- | ---------- |
| 1 station | 62% of the time | 85% | 100% |
| 3 stations (middle value) | 78% | 98% | 100% |
| 5 stations | 88% | 99.7% | 100% |
| 10 stations | 97% | 100% | 100% |
| All the stations Quake Explorer loads (12–20 with horizontals) | 10 of 10 quakes (worst 0.26 off; average +0.05, spread 0.15) | | |

The training quakes give nearly the same percentages (89% and 98% for 5 and 10 stations; all
22 within 0.3, worst 0.14). Out of sample the bias held and the scatter between quakes doubled.

- So a class lands **within about 0.3**, not within 1. UUSS's own methods sit a few tenths
  apart: for the 2026 Kanosh quake, ML 3.63 (preferred), a duration magnitude of 3.89 and a coda
  moment magnitude of 3.84. These are separate estimates, not votes to average.
- It works with the single sensitivity number our apps already use. At damping 0.8 our
  simulation reproduces UUSS's stored amplitudes to 0.5% (3.2).
- Verticals only (as Quake Explorer loads today) read about 0.2 low. A correction of +0.21,
  fitted on the training quakes, works as well as horizontals on the holdout, with the middle
  value only (3.4).

What does not work as well:

- **Duration magnitude** (how long it shakes) scatters 2–3 times more from station to station.
  If students judge "where the shaking sinks back into the noise" by eye, the answer comes out
  about 0.5 too small on average.
- **The classroom formula** found on many websites, ML = log A + 3 log(8 Δt) − 2.92, reads
  0.26 high on Utah data.
- **Only the school stand-in stations**, as in Quake Locator: two of the five (SGU, TMU) read
  0.35–0.5 high on their horizontal sensors. Both are mountain stations, so it isn't soft
  ground; the cause is not known. SUU's vertical is faulty.
- **Magna's bundled record section:** 9 of its 26 usable stations clipped, and 3 more old
  short-period stations saturated in a way the app can't detect. Used as is, the answer is
  0.6 too small; broadband stations only, about right.

These are good lessons, but they belong in the "Why?" step, not in the main path.

**Recommendation:** build it as **a fifth Quake Explorer investigation, "E. How big was it?"**,
first as a bounded prototype and trialed with a class, not as a separate app and not inside
Quake Locator.

- **Students** see the biggest swing at each station, marked by the app, correct it for
  distance by sliding Richter's curve (shape fixed) over a log-log plot, and take the middle
  value.
- **Check** compares that with UUSS's ML and, where ComCat has UUSS's phase-data file, with
  UUSS's own station values. 55 of the last 60 M2.5+ events had one; the others were mining
  explosions. When it's missing, the Check falls back to the event magnitude and says so.
- **The opener** shows the logarithm without any formula: two nearby Kanosh quakes, 10 minutes
  apart, at one station.
- **A science page, "How big was it?"** (section 7), carries the rest: energy, intensity, why
  ML, duration magnitude and moment magnitude differ, and the traps. It can be built now,
  whatever the apps end up doing, from static real-data figures, as "Beyond one seismogram"
  was.
- **Duration magnitude** is an optional "going further".

**School Shakes:** comparing two nearby quakes at one school's Shake needs no station
calibration. Two things are **open research questions**, not promises: an absolute ML from a
school Shake (it needs about 10 well-recorded quakes from at least 4–5 source areas, so 2–4
years), and whether a Shake can measure a duration magnitude (UUSS's threshold sits at about a
Shake's own noise level in good conditions; a school is noisier).

**What it takes** (scale shared with P3 and P4: S = up to 2 days, M = 3–7, L = more than 7):

| Piece | Claude session-days, first build → with rework | Size |
| ----- | ---------------------------------------------- | ---- |
| Core: library, investigation E (with horizontals, the two-quake opener, UUSS's amplitudes and the fallback), samples and check script, guide section, activity card, tests | 6–6.5 → 10.5–12 (8 at best) | L |
| Science page "How big was it?" with real-data figures (section 7; can come first) | 2 → 3.5 | M |
| Optional: duration magnitude in E, with longer samples | 1.5 → 2.5 | S |

DRI staff time: none required (optional: half a day for Dale and Cleat to read the card and
page; about an hour of UUSS time if they confirm the constants). Teacher time: one class period
to trial, plus 30 minutes of feedback.

## 0. How this review was done

- **Read:**
  - CLAUDE.md;
  - `planning/activities.md` (E11, E13, E14; S7, S8, S10; B3);
  - `planning/evaluation.md` (topic table, appendix D, research track);
  - `planning/decisions.md` (D9, D22, D23, D31, D37, D38);
  - `planning/spec-uhsn-data.md` (7.4, 7.8, 10);
  - `docs/theory/frequencies.md` ("Why waves get weaker with distance");
  - the code: `lib/units.js`, `response.js`, `spectral.js`, `signal.js`, `fdsn.js`,
    `stations.js`, Quake Explorer's `data.js` and investigation files, Quake Locator's
    `app.js` and config.
- **Checked against sources:** UUSS's magnitude summary page (read in full by me), the UUSS
  papers, Richter's papers and table, IASPEI's formula, Raspberry Shake's specifications and
  Anthony et al. (2019). Two research helpers (subagents) found and read most papers; I
  spot-checked their quotes. Every source, and how much of it was read, is in
  `planning/magnitude-sources.md`.
- **Computed on real data** (2026-11-25, Gus's machine), in scratch scripts outside the repo
  (Appendix B):
  - 23 events from ComCat with UUSS's phase data: Magna 2020, 11 central-Utah events of
    magnitude 2.1–4.0 including one quarry blast, and 11 more from the same places (Kanosh,
    Milford, Junction). 14 of the 23 come from three clusters (R3 M2, R4 M2), so they are
    treated as the training set;
  - every channel UUSS measured: 1,699 horizontal amplitudes and 597 durations;
  - **version 2:** the same events on the stations Quake Explorer actually loads, and a holdout
    of 10 quakes from other parts of Utah (3.1, 3.4);
  - waveforms and full responses from EarthScope; the app's own modules for reading miniSEED,
    StationXML, choosing stations and the FFT;
  - the bundled Quake Explorer samples, read exactly as the app reads them.
- **Version 2's checks:** critic R3 reran the key numbers with its own code (its scripts and
  outputs are copied into this session's scratchpad). A helper (a Fable subagent) ran the
  out-of-sample check; a second helper rechecked the sources the critics raised. I checked
  both helpers' work (Appendix B; the source log says what was read).
- **Not done:**
  - nothing on a Raspberry Shake (none streams yet; constraint 1 rules out their servers);
  - no quakes below magnitude 2, and only two between 4 and 5 besides Magna (Thatcher 4.37
    and Maeser 4.13);
  - no classroom trial;
  - Pechmann et al. (2007) is paywalled, so only its abstract was read;
  - UUSS hasn't published its current Wood-Anderson constants or station corrections. Section
    3.2 establishes the constants from UUSS's own amplitudes; question 4 asks UUSS to confirm.

## 1. What students would do and learn

Five levels, from a 15-minute idea any class can use to a research question. A teacher can
stop after any of them. Standards use the crosswalk's codes. ESS.2.6 ("evaluate design
solutions that reduce the effects of natural disasters") is dropped: nothing here has students
judge solutions (R3 C4).

| Level | Students do | They learn | Time | Standards |
| ----- | ----------- | ---------- | ---- | --------- |
| **1. Magnitude is a logarithm** | Two nearby quakes near Kanosh (April 19, 2026: ML 3.63, then ML 2.52 ten minutes later and about 2 km away), at one station 100–150 km away, drawn as Richter's seismograph would draw them. First at the same scale (the small one looks flat), then the small one magnified 10 times. How many times taller is the bigger one's swing? The magnitudes predict 10^1.11 ≈ 13; the station shows it (3.7) | One step up makes the swing on Richter's seismograph 10 times taller at the same distance; two steps, 100 times. For the moment magnitude used for big quakes, each step is about 32 times the energy; for small Utah quakes measured with ML, about 15 times (2.2). A magnitude 6 is not "twice a 3" | 15 min | PHYS.2.1 |
| **2. How big was it? (local magnitude, ML)** | Each station's record is redrawn as Richter's 1935 instrument would have drawn it, and **the app marks the biggest swing** (half the largest peak-to-peak). Students check two or three marks and may move one. Then they slide Richter's distance curve (its shape fixed; it moves only up and down) over a log-log plot of all stations until it runs through the middle of them. A line at 100 km shows "M = 3 + log(swing at 100 km)", Richter's own definition. Then they compare with UUSS's ML. **Making step** (for the CS codes): from the station table (CSV), students plot log swing against log distance themselves and fit their own line for how fast the swing fades, then compare it with Richter's curve | How fading with distance (Frequencies, fading and sound, Figure 3) becomes a measurement; why one station is never enough; the middle value against outliers; why stations read high or low | 45–55 min with 5–10 preselected stations; the making step is homework or a second period | PHYS.2.1, ESS.4.1; CS 9/10.DA.3 and CS 11/12.DA.1 only with the making step |
| **3. How long did it shake? (duration magnitude, Md)** | On a plot of the 2-second average ground speed, mark where it falls below UUSS's line (0.017 µm/s) at several stations; UUSS's equation turns the duration and distance into a magnitude | A second, separate way to estimate the size; why the noise sets the answer; how magnitudes were read from paper records | ½ period, optional | PHYS.2.1; CS 11/12.DA.1 if students compute the magnitudes from the CSV |
| **4. Magnitude is not shaking (intensity)** | Beside the "Did You Feel It?" map (E13): one magnitude for the quake, a different shaking at every town. West Valley City M3.5 drew 4,122 reports; Junction M3.3 drew 5 | Magnitude describes the quake, intensity a place; report counts also depend on how many people live there | 15 min, in E13 | ESS.4.1; CS 9/10.DA.3 if students make the map or chart |
| **5. Why the official numbers differ** | See UUSS's ML, Md and Mw for one quake (2.2) as separate estimates, never averaged; see why Magna's near stations can't be used; count quakes per magnitude step (E14: about 10 times fewer for each step up; Utah's b-value is 1.06–1.07) | Each method measures something different. The catalog names one preferred value. Big quakes need moment magnitude, since ML stops growing near 6.5–7. A catalog mixes types | ½ period, or in E14 | ESS.4.1; CS 11/12.DA.1 if students fit the counts themselves |

- **Paths** (R4 C2):
  - a 15-minute opener: level 1 alone, one preselected station;
  - the 45–55-minute core: level 2 with 5–10 preselected stations and the app's marks;
  - extensions in a second period: duration (3), Magna and the method comparison (5).
- **Logarithms** are first taught in Secondary Math III, usually grade 11 (R3 C4). The card's
  "At a glance" box should say so. For a 9th-grade Earth science class, the 15-minute path is
  the science page's table method on three stations (7.2 Part 3a): look up a number, add it.

Why PHYS.2.1 and not PHYS.4.1 for level 2: magnitude is about energy carried and lost with
distance. PHYS.4.1 (frequency, wavelength, speed) fits only the side point that the
Wood-Anderson responds to some notes and not others. E11 in `activities.md` lists PHYS.4.1;
I would drop it there unless the card teaches the instrument as a filter.

**Research track** (Appendix E of the overview). Both are open research questions, not
promised results (section 5):

- **A school's station correction** (project C, how waves fade). How much higher or lower does
  each school's Shake read than UUSS's ML, and why? It needs about 10 well-recorded quakes from
  at least 4–5 source areas, so 2–4 years (section 5).
- **ML minus duration magnitude** (project A, quake or blast). UUSS research uses this
  difference to separate shallow mining-related events from deeper quakes: it averages +0.05
  for quakes and −0.39 in the coal-mining areas (Koper et al. 2016).

## 2. The science and the data

### 2.1 What UUSS reports

UUSS's catalog carries three kinds of magnitude:

| Type | ComCat label | What it measures | How UUSS computes it | Used for |
| ---- | ------------ | ---------------- | -------------------- | -------- |
| **Local magnitude, ML** | `ml` | The biggest swing a Wood-Anderson seismograph would draw (mostly S waves near 1 Hz), corrected for distance | Below | Most quakes of about 2 and up, and about half of the smaller ones; the preferred type when UUSS can determine it |
| **Coda (duration) magnitude, Mc** | `md` | How long the shaking lasts | Below | Computed for nearly every event (Koper et al. 2016); the reported value for the other half of the small quakes (below about 2) |
| **Moment magnitude, Mw** | `mw`, `mwr`, `mww` | Fault area × slip × rock stiffness (the seismic moment) | Below | The big ones: the only scale that doesn't saturate |

**How UUSS computes ML.**

- The formula is ML = log A − log A0(Δ) + S.
- A is **half the largest peak-to-peak swing** on a simulated Wood-Anderson, averaged over the
  **two horizontal** components.
  - **The simulated instrument is Richter's nominal one:** a 0.8 s pendulum, damping 0.8,
    magnification 2,800. UUSS doesn't publish these constants. They come from the data: UUSS's
    stored amplitudes are 2 × 2,800 × 1.00 times our simulated half peak-to-peak ground motion
    at damping 0.8, flat across frequency (R3 M1; my rerun, 3.2).
  - **ComCat stores the full peak-to-peak swing** (`AML`, in meters), and UUSS halves it.
- −log A0 is **Richter's 1958 distance table**, used exactly (3.2). Pechmann et al. (2000,
  2007) found it "adequate for … the UUSS regional seismic network".
- S is a **station correction**: −0.55 to +0.21 in the published 2006 table; TMU's is −0.28.
  - Pechmann et al. (2007) fitted them to "minimize differences between MLs calculated from
    paper and synthetic W-A records". So they also absorb the gap between the nominal 2,800
    and the real instruments' 2,080 (2.3).
- **The event ML is the average** (mean) of the station values that have a correction (UUSS
  summary page: "ML determinations from two or more stations are averaged"). Stations without
  one get weight 0. For all 23 events I checked, ComCat's ML equals the mean of the weighted
  channel values within 0.005 (R3 M3b; 3.3).

**How UUSS computes Mc.**

- The formula is Mc = −2.25 + 2.32 log τ + 0.0023 Δ (Utah, since 2002).
- τ is the time from the P onset until the average absolute ground velocity falls below
  **0.01724 µm/s**, on vertical short-period sensors. UUSS set that line at "the estimated
  median noise level for short-period analog-telemetry stations".
- It was calibrated to match ML for 923 quakes of ML 0.5–4.7. UUSS gives it for about
  0.5 ≤ ML ≤ 5, and says durations above ML 5 come out short because of record lengths. Coda
  magnitudes still appear above that range: Magna's Md is 5.67.
- Mc has no station correction, only a gain correction to the duration.
- UUSS says ML is preferred but "cannot be determined for most of the smaller earthquakes".
- Mc is calibrated against ML, so the two agree on average and differ quake by quake.

**How UUSS computes Mw.** Regional moment tensors from long-period waves (filtered 10–20 s
below ML 4.5 and 20–50 s above), attempted for ML ≥ 3.5 (Whidden and Pankow 2012). Newer
coda-based Mw for small quakes (Holt et al. 2021) appear in ComCat as non-preferred values
(method `LLNLCCT`).

**What ComCat shows for Utah, 2025–2026** (all of Utah, 36.5–42.5 N, 114.5–108.5 W; M ≥ 1;
4,097 events):

- preferred types: 2,336 `ml` and 1,761 `md`;
- below magnitude 2, `ml` and `md` about equally often (1,892 and 1,721);
- from 2 up, almost all `ml` (446 of 487);
- no preferred `mw` from UUSS in this period. 9 of the 53 events of M3 and up carry a
  non-preferred coda Mw (`LLNLCCT`). West Valley City also has a UUSS moment tensor (about
  Mw 3.6) and a USGS Mwr 3.5. Since 2010, six UUSS events of M3 and up have a preferred `mw`,
  three of them in the Magna 2020 sequence.

**The working is public, where UUSS's phase-data product is present.** For a reviewed event,
ComCat holds UUSS's "phase-data" QuakeML. It lists every channel's Wood-Anderson amplitude
(type `AML`), every coda duration (`END`), and each station's ML and Md with its weight. For
Junction that is 94 amplitudes, 29 durations, ML 3.3 from 30 stations and Md 3.28. I used
these to check my numbers channel by channel (3.2).

- **Not every event has it.** ComCat says product availability varies by event and
  contributing network. A very new quake, or a small one, may have only an event magnitude.
- **How often, measured** (the 60 most recent M ≥ 2.5 events in the app's region, April 21 to
  November 19, 2026): 55 had a UUSS phase-data file, and all 55 held amplitudes and ML station
  magnitudes (28–120 amplitudes each). The other 5 had only an event magnitude; all were
  USGS-located mining explosions near Vernal and Maeser. The preferred type was `ml` for all 60.
  23 of the 60 were in the trona-mining area of southwest Wyoming.
- **How soon:** the median time from the quake to the file's last update was 40 hours
  (quartiles 7 and 65 hours; six under an hour, 12 over a week). ComCat keeps only the latest
  version, so this is an upper bound on when the amplitudes first appeared. Expect "same day to
  three days".
- So the app's Check uses these files for the preselected quakes, where they were verified.
  For a live quake it uses them if present, and otherwise falls back to the event magnitude
  and says so (4.2).
- The browser can already read the file: Quake Locator gets its analyst picks from it.
  Reading the amplitudes and station magnitudes is new code (`parseQuakeMLPicks` reads only
  picks).

### 2.2 How the magnitudes compare

- **ML and Mc agree on average,** because Mc was calibrated to ML. ML − Mc averages +0.05 for
  quakes, with a spread of about 0.25 (Koper et al. 2016, 6,846 events). In the coal-mining
  areas it averages −0.39.
- **ML and Mw:** in Utah, Mw is larger than ML for small quakes and smaller for big ones.
  - From UUSS's moment tensor table (112 events, 1998–2026), Mw − ML averages +0.15 below
    ML 3.5, +0.06 at 3.5–4, −0.12 at 4–4.5 and −0.27 above 4.5.
  - Arabasz et al. (2016) give M = 0.791 ML + 0.851 from 65 pairs, equal near ML 4.1.
  - Koper et al. (2016) also find the ML–Mw slope "less than one", and Munafò et al. (2016)
    find Mw ≈ ⅔ ML + C below about Mw 4 in Italy.
- **What that means for energy.** Energy follows log E = 1.5 M + 4.8 (joules) for surface-wave
  and moment magnitude (Okal 2019; Hanks and Kanamori 1979), so one step is 10^1.5 ≈ 32 times.
  ML for small quakes grows faster than Mw. With Arabasz's slope, one ML step is about
  10^(1.5 × 0.791) ≈ 15 times the energy (derived; R3 S1). The swing on Richter's seismograph
  is what grows exactly 10 times per ML step at a fixed distance. Peak ground speed grows
  less: for the Kanosh pair the swings differ about 15 times but the vertical ground speed
  about 10 times (3.7).
- **One quake, several numbers** (UUSS, from ComCat). The preferred value is in bold. The
  others are separate estimates made other ways, not votes to average:

  | Quake | ML | Md | Mw |
  | ----- | -- | -- | -- |
  | Magna, 2020 | 5.61 (17 stations) | 5.67 | **5.7** (UUSS, hand-entered; UUSS moment tensor 5.54; USGS Mww 5.7) |
  | Kanosh, 2026-04-19 | **3.63** | 3.89 | 3.84 (coda Mw, `LLNLCCT`, not preferred) |
  | West Valley City, 2026-02-14 | **3.52** | 3.45 | 3.56 (coda Mw); UUSS moment tensor about 3.6; USGS Mwr 3.5 |
  | Torrey, 2026-03-10 | **3.96** | 4.20 | — |
  | Junction, 2026-10-31 | **3.30** | 3.28 | — |

These methods give nearby but different values for the same quake, a few tenths apart. A
class within 0.2–0.3 of UUSS's ML is about as close as that. The card should say so before
students see their answer. It should not imply that the three should be averaged: the
catalog's preferred value is the one to compare with (R4 M3).

### 2.3 What each method needs

| Step | ML | Md | Peak ground speed (E11 as written) |
| ---- | -- | -- | ---------------------------------- |
| Instrument | Counts → ground motion. On the UU channels and quakes tested, the single sensitivity the apps already use is enough: the full response changes amplitudes by 0.7% (median), at most about 5% (3.2) | The sensitivity | The sensitivity (Quake Explorer's "true ground speed") |
| Filter | A simulated Wood-Anderson with Richter's nominal constants, as UUSS uses: 0.8 s, damping 0.8, magnification 2,800 (3.2). See the note below the table | About 1 Hz high-pass | 1–10 Hz (Quake Explorer's filter) |
| Reading | Half the biggest peak-to-peak swing, on both horizontals | When the 2-s average speed falls below 0.01724 µm/s | The biggest swing |
| Distance | Epicentral, into Richter's 1958 table | Epicentral (small term) | Hypocentral |
| Calibration | Richter's table; UUSS also uses station corrections | UUSS's equation | None published; we would make one (3.7) |
| Components | Two horizontals. Quake Explorer's record section loads only the vertical (`channels[0]`) | One vertical | Any |
| New code | An FFT-based Wood-Anderson filter (about 80 lines with the existing `fft`); loading the horizontals; reading UUSS's `AML` amplitudes and station magnitudes from the QuakeML | A 2-s envelope; records of about 7 minutes | None |

**Why 2,800 and not 2,080.**

- Richter built his table (1935, extended in 1958) from real Wood-Andersons, which he took to
  magnify 2,800 times. Uhrhammer and Collins (1990) measured the real ones: 2,080 ± 60, period
  0.8 s, damping 0.69.
- So the table really belongs with a 2,080 instrument. A simulation at 2,800 read with the
  table gives magnitudes about 0.13 too high on average, "a systematic over estimation" (their
  p. 704); they recommend 2,080, 0.8 s and damping 0.7 for new work (p. 713). The IASPEI
  standard says the same: its −2.09 constant is "based on … 2080, rather than the theoretical
  magnification of 2800" (NMSOP-2 IS 3.3, p. 6), an offset that is frequency dependent and "on
  average … about 0.1" (p. 15).
- UUSS's summary page doesn't state its constants; it cites Bakun et al. (1978) and Kanamori
  and Jennings (1978), and Uhrhammer and Collins list Kanamori and Jennings among the users of
  2,800. So the documents support 2,800 only indirectly; the data (3.2) support it directly.
- UUSS simulates the nominal 2,800 anyway. Its station corrections were fitted so that MLs
  from its synthetic records match those from its paper Wood-Anderson records (Pechmann et al.
  2007), so they take the offset out. On UUSS's weighted stations the corrections average
  −0.07 (3.3).
- Students have no corrections, so with 2,800 their raw values run a little high on average
  (+0.03 for the middle value, +0.06 for the mean; 3.3). The science page still says
  "magnifying the motion about 2,000 times", the real instrument. The teacher notes say in one
  sentence why the computation uses 2,800: to line up with UUSS's own station values.
- **What we can and can't claim.** The constants are an emulation of UUSS's practice, checked
  against UUSS's published amplitudes (3.2). UUSS hasn't published them; question 4 (6.4) asks
  UUSS to confirm (R4 S1).

### 2.4 The traps

1. **Clipping.** A record cut flat at the recorder's limit hides the true peak, so the
   magnitude comes out too small. In Magna's bundled sample, clipped stations read 0.8–3.1
   too low (3.5). UUSS took Magna's ML at its two nearest stations from accelerometers, which
   don't clip. Quake Explorer already flags flat-topped records (D23). The magnitude view must
   leave those out and say why.
2. **Old short-period stations saturate without flat tops.** At Magna, TCMU, RRCU and SGU's
   2020 instrument read 0.65–2.4 too low with no flat top to detect, so `isClipped` can't catch
   them. For Magna, the lesson's station list leaves them out by hand: a manual restriction,
   not a tested rule (R4 S2). For a live quake of ML 4.5 or more, E uses broadband (HH)
   channels only and says so; with fewer than 5 broadband stations, it shows no magnitude.
3. **Stations that read high or low.** SGU and TMU, the stand-ins for two of our five schools
   (Gunnison Valley and Wasatch Academy), read about 0.5 and 0.35 high on their horizontal
   sensors (3.5).
   - Both are **mountain stations**, not valley sites. SGU ("Sterling, UT", a broadband) sits
     at 2,357 m, 15 km from Gunnison Valley High School and about 700 m above the town of
     Sterling. TMU is on Trail Mountain at 2,731 m, 35 km from Wasatch Academy (R3 M3a,
     EarthScope station metadata).
   - So soft ground is not the explanation. Topography, the rock right under the station and
     the paths from particular source areas are all possible; SGU's excess changes with source
     area (3.5). I don't name a cause.
   - Station corrections fix this, and UUSS gives SGU weight 0. What a school on valley fill
     will do is argued separately, from Olsen et al. (1995), in section 5.
4. **Noise.** A small quake far away barely rises above the background. I keep stations whose
   peak is at least 3 times the noise; the app should do the same and say so. On the channels
   UUSS had chosen this gate never fired (0 of 1,471); on the stations Quake Explorer loads it
   does (3.3).
5. **Vertical instead of horizontal.** Vertical sensors read about 0.2 lower (3.5).
6. **Different methods differ** (2.2). They are separate estimates. The honest target is
   "within about 0.3 of UUSS's ML, from the middle of 5–10 good stations".
7. **Big quakes saturate ML.** ML is a local scale read on a short-period instrument; for very
   large ruptures its amplitudes stop growing with the quake, near 6.5–7 (Hanks and Kanamori
   1979). Utah's planning scenario (6.75 or larger, E14) needs Mw. Magna (5.7) is still fine
   for ML.
8. **The classroom formula is a poor fit for Utah.** ML = log A + 3 log(8 Δt) − 2.92 is a
   straight-line stand-in for Richter's table. John Louie's UNR course page calls it "the
   equation behind this nomogram, used by Richter in Southern California". It reads 0.26 high
   on our data (3.3). Use the table.

## 3. Feasibility on real data

### 3.1 What the scripts did

**Three station sets** (version 2 adds the second and third, R3 M2 and R4 M2):

- **A. The channels UUSS measured** for 23 events (version 1's set): every channel with a
  UUSS amplitude, so already reviewed, unclipped and above noise. This set checks that we
  compute what UUSS computes (3.2), but it flatters accuracy.
- **B. The stations Quake Explorer actually loads** for the same events, run live through the
  app's own selection (`selectRecordSection`: one station per 12.5 km band out to 300 km from
  HH, EH and BH channels, analyst-picked stations first, the five school stand-ins always
  added), with all three components. This is what investigation E would see.
- **C. A holdout of 10 quakes from other parts of Utah**, chosen before any number was
  computed on them and used for nothing else: no fitting, no tuning (selection rule in 3.4).

**The recipe**, fixed before the holdout was run:

1. Read the raw counts and the channel's sensitivity (EarthScope); for set A also the full
   response.
2. Turn counts into ground motion with the one sensitivity number, as `lib/units.js` does
   (**flat**). Set A also has the **full** response, every pole and zero in the StationXML.
3. Simulate a Wood-Anderson with the app's own FFT: 0.8 s, **damping 0.8**, magnification 1,
   then × 2,800. (Version 1 used damping 0.7; R3 M1.)
4. Take half the largest peak-to-peak swing:
   - from 2 s before the predicted P to 30 s after the predicted S (or 0.3 s per km after S if
     that is longer);
   - keeping peaks at least 3 times the noise before P;
   - leaving out records the app's `isFlat` or `isClipped` flags.
5. Station ML = log10(amplitude in mm) + Richter's −log A0 at the epicentral distance,
   averaged over the two horizontals, with **no station corrections** (a student wouldn't
   have them).
6. Event ML = the median (middle value) of the station MLs within 10–300 km. The mean is
   reported too, since UUSS averages (R3 S2).

Distances come from UUSS's location; a student's own Quake Locator epicenter is usually
within 3–6 km (D9). That changes the correction by under 0.05 beyond about 30 km.

**The rule for which stations count** (R4 S2), as the app would apply it, with every dropped
station shown and its reason:

| Step | Rule |
| ---- | ---- |
| Channels | HH, then EH, then BH (Quake Explorer's order); both horizontals where the station has them, else the vertical with the stated correction |
| Response | A sensitivity and input units in the station metadata; otherwise the station is dropped |
| Distance | 10–300 km, epicentral |
| Window | From 2 s before the predicted P (distance ÷ 6.1 km/s) to 30 s or 0.3 s per km after the predicted S (distance ÷ 3.5 km/s), whichever is later |
| Quality | Dropped if `isFlat` or `isClipped`, or if the peak is under 3 times the noise before P |
| Big quakes | ML 4.5 or more (by the catalog): HH channels only; Magna's old short-period stations left out by hand |

### 3.2 Do we compute what UUSS computes?

- **Amplitudes.** On 1,699 unclipped horizontal channels, UUSS's published amplitude (`AML`,
  meters) divided by my simulated half peak-to-peak ground motion is:

  | Simulation | Ratio (median) | As a multiple of 2 × 2,800 | Scatter (robust, log10) | Trend with the peak's frequency |
  | ---------- | -------------- | -------------------------- | ----------------------- | ------------------------------- |
  | Damping 0.7, sensitivity only (version 1) | 5,205 | 0.93 | 0.017 | 0.90 at 1–1.5 Hz to 0.97 above 4 Hz |
  | Damping 0.7, full response (version 1's 5,253) | 5,253 | 0.94 | 0.019 | 0.90 to 0.99 |
  | **Damping 0.8, sensitivity only** | **5,602** | **1.000** | **0.002** | **none (1.00 in every band)** |
  | Damping 0.8, full response (R3's 5,647) | 5,647 | 1.008 | 0.005 | 1.00 to 1.02 |

  - At damping 0.8 the ratio is exactly 2 × 2,800, flat with frequency, to 0.5%. So UUSS
    simulates Richter's nominal instrument (0.8 s, damping 0.8, magnification 2,800) and
    stores the **full** peak-to-peak swing, which the formula halves.
  - The match is tightest with the sensitivity alone, so UUSS's amplitudes appear to use the
    sensitivity too, at least on these channels.
  - **Version 1's "1.88 × 2,800" is explained:** 1.88 = 2 × 0.94. The 2 is the full swing; the
    0.94 is version 1's damping of 0.7, which makes the simulated pendulum respond more strongly
    near its own frequency (1.25 Hz) and the same above it. That is also why the ratio drifted
    with frequency, toward 1 above 4 Hz (R3 M1).
  - This is established from the data, not from a UUSS document (R4 S1).
- **Distance correction.** UUSS gives some channels zero weight; those have no station
  correction. For them, UUSS's station ML − log10(`AML` in mm) − Richter's 1958 value is
  −0.300 (607 channels). Every distance band from 40 to 700 km has a median between −0.293
  and −0.303 (R3). That is log10(½): Richter's table exactly, with the stored swing halved.
  - **UUSS uses the full table.** Richter's Table 22-1 has a row every 5 or 10 km (Appendix
    A). With all its rows the scatter is 0.021; with the 16 rows version 1 used, 0.033.
    Straight lines between the 16 rows differ from the full table by up to 0.05 within 300 km.
    That doesn't change any event result here (+0.028 either way), but the app should encode
    every row (R4 L1).
  - Version 1 said "within about 0.15". That came from fitting a smooth curve to a stepped
    table (R3 M1, C5).
- **Full response against the single sensitivity:** median 0.003 in log10 (0.7%), 95% of
  channels under 0.02 (5%). On the UU channels and quakes tested, the apps' existing approach
  is enough. That claim is bounded to these channels (R4 S1).
- **Duration formula.** Applied to UUSS's own published durations, UUSS's equation reproduces
  every station Md exactly (597 values; residual 0.003). The durations start at the analyst's
  P pick (median difference 0.00 s). So UUSS's published 2026 station values follow the 2006
  equation. How UUSS's software measures τ is not visible; my threshold method (3.6) is a
  classroom proxy that matches the sampled values, not a copy of UUSS's procedure (R4 S3).

### 3.3 Results, event by event

All at damping 0.8, horizontals, sensitivity only, Richter's table, no station corrections.
Offsets are ours minus UUSS's ML; "median" and "mean" are over the stations.

**Training: the 23 version-1 quakes (in-sample).** 14 of them come from three clusters
(Kanosh 8, Milford 4, Junction 2).

| Quake | UUSS ML | A: UUSS's channels, stations | A: median offset | B: QE stations with horizontals | B: median offset | B: mean offset | B: verticals, no correction |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Magna (uu60363602) | 5.61 | 21 | +0.04 | 14 (broadband) | +0.10 | +0.15 | −0.15 |
| Torrey (uu80131546) | 3.96 | 39 | −0.01 | 18 | +0.12 | +0.06 | −0.19 |
| Kanosh (uu80137106) | 3.63 | 33 | +0.05 | 21 | −0.07 | +0.03 | −0.20 |
| West Valley City (uu80129556) | 3.52 | 41 | +0.07 | 22 | +0.09 | +0.13 | −0.13 |
| Junction (uu80162166) | 3.30 | 30 | −0.02 | 19 | +0.11 | +0.15 | −0.02 |
| Milford (uu80156586) | 3.13 | 34 | −0.04 | 21 | +0.02 | +0.01 | −0.25 |
| Panguitch (uu80138736) | 3.05 | 29 | +0.05 | 21 | −0.14 | −0.12 | −0.32 |
| Kenilworth (uu80158051) | 2.69 | 27 | +0.12 | 22 | −0.07 | +0.04 | −0.10 |
| Mount Pleasant (uu80114836) | 2.46 | 35 | +0.03 | 21 | −0.04 | −0.03 | −0.23 |
| Fayette (uu80130416) | 2.52 | 29 | −0.05 | 18 | +0.03 | −0.01 | −0.29 |
| Leamington, quake (uu80120191) | 2.11 | 16 | +0.07 | 19 | −0.08 | −0.07 | −0.19 |
| Leamington, blast (uu80161881) | 2.11 | 20 | +0.07 | 15 | −0.10 | −0.04 | −0.34 |
| Kanosh (uu80137056) | 3.26 | 42 | −0.02 | 23 | +0.09 | +0.12 | −0.21 |
| Kanosh (uu80137836) | 3.22 | 38 | +0.07 | 20 | +0.09 | +0.11 | −0.23 |
| Kanosh (uu80136966) | 3.20 | 42 | −0.01 | 22 | +0.09 | +0.14 | −0.09 |
| Kanosh (uu80136971) | 2.59 | 36 | +0.04 | 23 | +0.11 | +0.11 | −0.20 |
| Kanosh (uu80137331) | 2.58 | 37 | +0.02 | 22 | +0.10 | +0.11 | −0.07 |
| Kanosh (uu80137126) | 2.52 | 27 | +0.02 | 20 | +0.08 | +0.04 | −0.17 |
| Kanosh (uu80137201) | 2.50 | 35 | +0.04 | 24 | −0.03 | +0.01 | −0.25 |
| Milford (uu80163521) | 3.12 | 34 | +0.11 | 19 | +0.07 | +0.04 | −0.19 |
| Milford (uu80165416) | 2.78 | 26 | −0.01 | 20 | −0.06 | −0.00 | −0.19 |
| Milford (uu80163431) | 2.71 | 32 | +0.08 | 20 | +0.06 | +0.10 | −0.11 |
| Junction (uu80162171) | 2.97 | 28 | −0.10 | 19 | +0.05 | +0.07 | −0.08 |

**Holdout: ten quakes from other areas (out-of-sample).** Chosen by rule from the catalog
before any waveform was read (3.4).

| Quake | Area | UUSS ML | A: UUSS's channels, stations | A: median offset | B: QE stations with horizontals | B: median offset | B: mean offset | B: verticals + 0.21 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Thatcher, 2024-05-05 (uu80068651) | Northern Wasatch Front | 4.37 | 24 | −0.04 | 13 | −0.07 | −0.11 | −0.08 |
| Garden, 2026-01-07 (uu80127041) | Northern Wasatch Front | 2.94 | 19 | +0.21 | 15 | +0.19 | +0.15 | +0.14 |
| Maeser, 2025-09-10 (uu80117176; 68 km deep by the catalog) | Uinta Basin | 4.13 | 25 | +0.13 | 15 | +0.13 | +0.14 | +0.07 |
| Kanarraville, 2023-12-01 (uu60555582) | Southwest Utah | 3.86 | 22 | +0.04 | 14 | +0.08 | +0.09 | −0.02 |
| Kanarraville, 2026-04-19 (uu80136961) | Southwest Utah | 2.99 | 31 | +0.08 | 20 | −0.05 | −0.02 | +0.09 |
| Elmo, 2024-03-04 (uu80059666) | Coal district | 2.70 | 17 | +0.11 | 15 | −0.17 | −0.03 | −0.07 |
| Sunnyside, 2022-04-11 (uu60490147) | Coal district | 2.69 | 18 | +0.04 | 14 | −0.13 | −0.04 | +0.02 |
| Thompson Springs, 2022-05-31 (uu60500212) | Eastern Utah | 3.76 | 18 | +0.16 | 13 | +0.16 | +0.10 | +0.01 |
| Bennington, Idaho, 2026-05-15 (uu80140161) | Utah–Idaho border | 3.81 | 41 | −0.08 | 12 | +0.09 | +0.10 | −0.08 |
| Taylor, Wyoming, 2022-11-16 (uu60525337) | Utah–Wyoming border | 2.97 | 19 | +0.10 | 13 | +0.26 | +0.19 | +0.26 |

- Elmo and Sunnyside are in the coal district and may be mining-induced; ComCat types both as
  earthquakes.
- The two largest holdout offsets (Taylor +0.26, Garden +0.19) are at the network's edge, with
  stations on one side only.

**Summary over the quakes below magnitude 5** (mean offset, its spread from quake to quake,
the worst quake, and the typical spread of single stations):

| Set and recipe | Quakes | Mean offset | Quake-to-quake spread | Worst quake | Single-station spread |
| -------------- | ------ | ----------- | --------------------- | ----------- | --------------------- |
| *A, training: UUSS's own station MLs, all channels* | 22 | 0.00 | 0.05 | 0.12 | 0.27 |
| *A, training: UUSS's own, corrected (weighted) stations only* | 22 | −0.01 | 0.04 | 0.10 | 0.23 |
| A, training: ours, median of stations | 22 | +0.03 | 0.06 | 0.14 | 0.32 |
| A, training: ours, mean of stations | 22 | +0.06 | 0.04 | 0.15 | |
| A, training: ours with the full response | 22 | +0.02 | 0.06 | 0.14 | 0.32 |
| A, training: IASPEI formula (2,080, zero-to-peak, hypocentral) | 22 | −0.04 | 0.06 | 0.17 | 0.32 |
| A, training: verticals, no correction | 22 | −0.16 | 0.05 | 0.25 | 0.27 |
| A, training: QL-like set (stand-ins + 5 nearest) | 22 | −0.10 | 0.14 | 0.43 | 0.41 |
| A, training: classroom formula, 3 log(8 Δt) − 2.92 | 22 | +0.26 | 0.06 | 0.37 | 0.51 |
| **B, training: QE stations, horizontals, median** | 22 | **+0.02** | **0.08** | **0.14** | **0.34** |
| B, training: QE stations, horizontals, mean | 22 | +0.04 | 0.07 | 0.15 | |
| B, training: QE stations, verticals + 0.21 (left-out cluster) | 22 | +0.03 | 0.08 | 0.20 | 0.29 |
| A, holdout: UUSS's channels, median | 10 | +0.08 | 0.09 | 0.21 | 0.37 |
| **C, holdout: QE stations, horizontals, median** | 10 | **+0.05** | **0.15** | **0.26** | **0.32** |
| C, holdout: QE stations, horizontals, mean | 10 | +0.06 | 0.10 | 0.19 | |
| C, holdout: QE stations, verticals + 0.21 (training value) | 10 | +0.04 | 0.11 | 0.26 | 0.57 |

How to read it:

- **Every quake, in both sets, lands within 0.3 of UUSS's ML** with all the stations Quake
  Explorer loads and the middle value. That holds for the horizontals and for the corrected
  verticals.
- **Out of sample the bias stays the same; the scatter grows.** +0.05 against +0.02, but 0.15
  against 0.08 from quake to quake. The holdout has fewer usable horizontal stations (14 a
  quake against 20) and more vertical-only ones (31% against 18%).
- **The station choice matters little.** Going from UUSS's chosen channels to the stations
  Quake Explorer loads changes the training offset from +0.03 to +0.02. 27% of the training
  station values come from stations UUSS did not measure.
- **The gates now fire.** Of the training stations, 7 horizontal channels failed the noise test,
  3 were clipped and 18 returned no data; in the holdout, 1, 5 and 20, plus 2 with gaps
  (version 1's set never triggered them).
- **Version 1's "+0.06" is explained** (R3 S2). On set A, damping 0.7 → 0.8 takes off 0.03
  (+0.06 → +0.03). The mean of stations is +0.06, matching UUSS's missing station corrections
  (−0.07 on average). The median sits 0.04 below the mean because a few stations read low.
- **UUSS's own spread** on its corrected stations is 0.23 (0.11 to 0.35 from quake to quake);
  version 1's 0.27 (0.17 to 0.39) included uncorrected channels (R3 C5). The Check should show
  the corrected-station value.
- **Magna** on the stations Quake Explorer loads: every three-component short-period station
  clipped, so only 14 broadband stations remain (69–290 km), giving +0.10 (mean +0.15).
- **Sources:** set A's rows in italics and the recipe rows are my rerun on R3's measurement
  files (Appendix B); the per-quake columns and sets B and C are the helper's (`oos/`), which I
  checked by recomputing the summary from its per-quake files.

### 3.4 How many stations does a group need?

**The holdout rule** (`oos/holdout-events.md`, written before any holdout waveform was read):
ComCat, 2022-01-01 to 2026-11-25, the app's Utah region, M 2.5–4.9, UUSS's `ml` preferred,
type earthquake, with a phase-data product, and more than 30 km from every training quake (171
candidates). Six areas: northern Wasatch Front and Cache Valley, Uinta Basin, southwest Utah,
the coal district, eastern Utah, the Idaho and Nevada borders. In each, the largest quake and
the one closest to M3.0 at least 10 km away. Ten quakes, not twelve: the Uinta Basin and
eastern Utah had one each, and nothing qualified on the Nevada border. Two are M4–5 (Thatcher
4.37, Maeser 4.13).

**Station subsets.** From each quake's usable stations (as Quake Explorer loads them), draw k
at random, 400 times (seeded RNG, seed 20261125), and take the middle value. Every quake
weighs the same.

| Stations (k) | Recipe | Set | Within 0.3 | Within 0.5 | Within 1.0 | 9 in 10 groups within |
| ------------ | ------ | --- | ---------- | ---------- | ---------- | --------------------- |
| 1 | horizontals | training | 62% | 85% | 99.8% | 0.56 |
| 1 | horizontals | **holdout** | **62%** | **85%** | **100%** | **0.55** |
| 3 | horizontals | training | 80% | 95% | 100% | 0.41 |
| 3 | horizontals | **holdout** | **78%** | **98%** | **100%** | **0.37** |
| 5 | horizontals | training | 89% | 98% | 100% | 0.32 |
| 5 | horizontals | **holdout** | **88%** | **99.7%** | **100%** | **0.31** |
| 10 | horizontals | training | 98% | 100% | 100% | 0.20 |
| 10 | horizontals | **holdout** | **97%** | **100%** | **100%** | **0.24** |
| 1 | verticals + 0.21 | holdout | 61% | 86% | 96% | 0.63 |
| 5 | verticals + 0.21 | holdout | 88% | 99% | 100% | 0.31 |
| 10 | verticals + 0.21 | holdout | 98% | 100% | 100% | 0.23 |
| 5 | verticals, no correction | holdout | 71% | 94% | 99.8% | 0.42 |
| 5 | Md, UUSS threshold (version 1, UUSS's channels) | training | 66% | 85% | 95% | 0.63 |
| 10 | Md, UUSS threshold (version 1, UUSS's channels) | training | 77% | 93% | 99% | 0.43 |

- The worst single quake at k = 5 had 70% of groups within 0.3 in training and 58% in the
  holdout.
- Version 1's numbers on UUSS's own channels (63, 79, 88 and 96% within 0.3 for 1, 3, 5 and 10
  stations) were close to these, so its conclusion stands. It was in-sample, though, and now
  isn't the evidence (R4 M2).
- So **5 stations is the smallest group size worth asking for, and 10 is better.** That holds
  out of sample.

**The vertical correction, cross-validated** (R4 M2, R3 C1):

- Vertical minus horizontal at the same sensor, on the training quakes' Quake Explorer
  stations: −0.213 (459 station values). Leaving out one cluster at a time gives −0.215 to
  −0.202 (−0.202 without Kanosh). On every sensor UUSS measured: −0.205. The holdout's own
  value, not used: −0.201. So the correction is **+0.21**, and it is stable.
- With it, the holdout verticals do as well as the horizontals event by event (+0.04 ± 0.11,
  all ten within 0.3).
- **But use the median, never the mean.** Holdout vertical stations spread 0.57 (training 0.29),
  and the mean of the uncorrected verticals is −0.31: a few stations read 2–3 units low and
  pass every gate. One random vertical station is within 1.0 only 96% of the time.
- **SGU's vertical is one of them:** about −2.4 (Magna 2020), −2.92 (Thatcher, May 2024), −2.19
  (Elmo, March 2024), about −1.4 (Kanarraville, December 2023). Quake Explorer already notes
  SGU's 2020 record; the fault covered at least December 2023 to May 2024 too (question 6,
  6.4). In 2025–2026 SGU's vertical reads normally (+0.02, 3.5).
- Digital short-period (EH) verticals read 0.3–0.4 lower than broadband ones in both sets. That
  is another reason to prefer horizontals, or broadband verticals.

**What the page and the card may say** (question 3, 6.4): with 5 or more good stations the
middle value usually lands within about 0.3 of UUSS's ML, and with 10 nearly always (holdout:
88% and 97% of groups). These rest on 32 quakes below M5 (22 training, 10 held out), M2.1–4.4,
plus Magna, 2022–2026, at 10–300 km.

### 3.5 The traps, measured

All at damping 0.8, set A unless it says otherwise.

- **Vertical against horizontal:** at the same sensor the vertical reads 0.21 lower (median of
  842 stations; spread 0.19). The middle value comes out 0.16 low. Anthony et al. (2019)
  expected about 0.3 for Oklahoma. The cross-validated correction is in 3.4.
- **The school stand-ins** (station ML minus UUSS ML, no correction, across the events; R3's
  rerun at damping 0.8):

  | Stand-in (school) | Where it is | Horizontals | Vertical |
  | ----------------- | ----------- | ----------- | -------- |
  | SGU (Gunnison Valley) | Mountain site at 2,357 m, 15 km from the school; broadband | +0.51 ± 0.20 (19 quakes) | +0.02 ± 0.16 |
  | TMU (Wasatch Academy) | Trail Mountain, 2,731 m, 35 km from the school | +0.34 ± 0.25 (22); UUSS's correction is −0.28 | +0.01 ± 0.19 |
  | ELU (North Sanpete) | | no horizontals measured | −0.27 ± 0.14 (15) |
  | WCU (Millard) | | no horizontals measured | −0.32 ± 0.23 (16) |
  | SUU (Juab) | | no horizontals measured | −0.52 ± 0.34 (4)* |

  \* SUU's vertical channel is faulty: it "records about 10 times weaker than the station's
  own horizontal channels and its neighbors" (D31; question 9 to Dale and Cleat, already
  passed to UUSS). It is left out of every vertical-offset and school-correction statement
  until UUSS answers (R3 S4).

  - SGU's excess depends on where the quake is: Kanosh +0.61, Junction +0.65, Milford +0.30,
    Kenilworth +0.12 (R3). TMU, even after UUSS's correction, reads +0.30 for Kanosh and −0.28
    for Milford. So a station term measured from one source area is partly a path term
    (R3 S3).
  - Why SGU and TMU read high on their horizontals but not their verticals is not known. Both
    are mountain stations, so it is not soft valley ground (R3 M3a). An H/V check with
    `lib/hv.js` could test the site before anyone names a cause.
  - ELU and WCU sit near the usual vertical offset. This is a good "Why?" for students, and it
    is why the stand-ins alone mislead.
- **Magna's bundled sample** (`qe-magna`: verticals, flat sensitivity, as Quake Explorer loads
  it):

  | Stations used | Count | Middle value − UUSS ML |
  | ------------- | ----- | ---------------------- |
  | All usable stations, clipped included | 26 | −0.63 |
  | Not flagged as clipped | 17 | −0.21 (spread 0.77) |
  | Broadband (HH) only, not clipped | 14 | −0.11 (spread about 0.42) |
  | Flagged clipped | 9 | median −1.53 (−0.80 to −3.14) |

  - The three old short-period stations among the "not flagged" (TCMU −1.62, RRCU −0.65, SGU
    −2.40) explain most of their spread.
  - These are verticals; with the vertical correction (+0.2) the broadband-only value is about
    +0.1.
  - On UUSS's own chosen channels (set A, horizontals), Magna gives 5.58 against UUSS's 5.61.
- **Junction's bundled sample** (`qe-junction`, 24 verticals): middle value −0.09 from UUSS,
  spread 0.32; about +0.12 with the vertical correction. Junction is the right worked example,
  as it already is for "true ground speed" (D23).
- **The classroom formula:** +0.26 on average, single-station spread 0.51. Its 3 log Δ slope
  is too steep for Utah beyond about 100 km. With the analyst's own S − P it was worse still,
  but only a few stations had both picks.

### 3.6 Duration magnitude

My automatic duration ran from UUSS's P pick to the first 2-second window, after S, whose
average speed (1 Hz high-passed) fell below 0.01724 µm/s. This is a classroom proxy that
matches the sampled ComCat values, not UUSS's own procedure (R4 S3). Durations don't use the
Wood-Anderson, so version 2's damping change doesn't touch this table.

| Quake | UUSS Md | UUSS station Md spread | Ours: stations | Ours: middle value | Ours − UUSS Md | Our spread | "Back into the noise" (2× noise) − UUSS Md |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Magna | 5.67 | 0.49 | 7 | 3.97 | −1.70 | 0.07 | −1.73 |
| Torrey | 4.20 | 0.31 | 35 | 3.88 | −0.32 | 0.26 | −0.71 |
| Kanosh | 3.89 | 0.40 | 24 | 3.79 | −0.10 | 0.34 | −1.64 |
| West Valley City | 3.45 | 0.19 | 45 | 3.20 | −0.25 | 0.44 | −0.31 |
| Junction | 3.28 | 0.28 | 29 | 3.33 | +0.05 | 0.48 | +0.00 |
| Milford | 3.26 | 0.31 | 30 | 3.20 | −0.06 | 0.50 | −0.57 |
| Panguitch | 3.15 | 0.46 | 20 | 3.14 | −0.01 | 0.54 | −0.17 |
| Kenilworth | 3.08 | 0.36 | 29 | 2.89 | −0.19 | 0.69 | −0.68 |
| Mount Pleasant | 2.78 | 0.36 | 29 | 2.63 | −0.15 | 0.82 | −0.54 |
| Fayette | 2.43 | 0.21 | 22 | 2.53 | +0.10 | 0.76 | −0.29 |
| Leamington (quake) | 2.01 | 0.24 | 30 | 2.10 | +0.09 | 0.96 | −0.10 |
| Leamington (blast) | 2.14 | 0.35 | 19 | 2.14 | −0.00 | 0.99 | −0.58 |

- **With UUSS's threshold,** the middle value is within 0.32 of UUSS's Md for all 11 events
  below magnitude 5 (mean −0.08, spread 0.14).
- **But single stations scatter 0.3–1.0,** 2–3 times ML's spread. My durations match UUSS's to
  a median of 9% but scatter by a factor of about 1.9 (0.27 in log10). UUSS fits the coda's
  decay and extends it; a simple threshold crossing is at the mercy of each station's noise.
  - Fitting the decay and extending it (a nice CS 11/12.DA.1 model) did not do better here:
    durations a median 19% short (−0.09 in log10), spread 0.29.
- **By eye, "where it sinks back into the noise"** (twice the noise level) runs 41% short, and
  the answer averages 0.51 too small, varying with each station's noise.
- **Magna:** codas outlast the 7-minute windows. Duration magnitude needs long records. UUSS's
  equation was calibrated on quakes up to about ML 5, though coda magnitudes still appear
  above that (Magna's Md is 5.67; R4 S7).
- **Samples:** Quake Explorer's samples end 110 s after the origin, so a duration step needs
  new samples of about 7 minutes (R3 C3; counted in M6).

**Verdict:** worth one optional step, because it shows students that two independent methods
agree on average. It is not the main path.

### 3.7 Two simpler routes

**Peak ground speed (E11 as written).**

- Fitting all the stations gives log10 PGV = −4.19 + 0.93 ML − 1.82 log10 R (horizontals;
  PGV in m/s, 1–10 Hz; 675 values). The −1.8 matches the "distance to the power −1.7" on the
  Frequencies page.
- A classroom version is M = log10(PGV in µm/s) + 1.7 log10(R in km) + K:
  - K = −1.30 for horizontals and −1.09 for verticals;
  - fitted on the other events each time (leave one out), the 11 quakes land with a mean
    offset of 0.01 and a spread of 0.13–0.14;
  - the worst are Magna (−0.23 horizontal, −0.31 vertical) and Leamington (+0.30
    horizontal);
  - single stations spread 0.3.
- This works as well as ML, uses what Quake Explorer already shows, and is fine on verticals.
  **But the constant is ours,** fitted to UUSS's ML, not a published scale. I prefer Richter's
  recipe for the main path: it is how UUSS does it, and students can compare station by
  station with UUSS's own values. PGV stays as the bridge from the Frequencies page.

**Same-place ratios** (no station calibration). For two nearby quakes, the ratio of the
biggest swings at the same station gives the magnitude difference. The station, its
instrument, its ground and most of the path cancel, approximately. What remains is any
difference in how each quake radiated, its depth, and record quality (R4 S4).

Each difference is the bigger quake minus the smaller, so it is positive; each error is
measured minus ComCat (R3 C5). Damping 0.8, channels at stations UUSS measured:

| Pair | ComCat difference | From the swings (horizontal channels) | From peak ground speed (verticals, 1–10 Hz) |
| ---- | ----------------- | ------------------------------------- | ------------------------------------------- |
| Kanosh, the M3.63 against each of 7 others | +0.37 to +1.13 | errors −0.05 to +0.09 (50–66 channels per pair) | errors −0.24 to −0.05 |
| Milford, the M3.13 against 3 others | +0.01 to +0.42 | errors −0.14 to +0.02 | errors −0.18 to +0.06 |
| Junction, main shock and its M2.97 aftershock | +0.33 | +0.43 (error +0.10) | +0.37 (error +0.04) |

- Single channels spread 0.1–0.3.
- **The Kanosh opener pair** (uu80137106, ML 3.63, and uu80137126, ML 2.52; 10.0 minutes and
  1.9 km apart, depths 4.1 and 8.1 km): the magnitudes predict a swing ratio of
  10^1.11 ≈ 13. Over 50 channels at 25 stations the middle ratio is 10^1.16 ≈ 14.5 (R3:
  14.7). It is 10^1.06 under 100 km and 10^1.20 beyond, so the station choice matters.
  Vertical peak ground speed differs only about 10.5 times (R3 S7).
- **The opener's station:** among the stations Quake Explorer loads for both quakes at
  100–150 km, **MMU (118 km)** matches the prediction best: swings 12.1 times bigger (1.63 and
  2.24 mm against 0.149 and 0.166 mm), vertical ground speed 9.9 times. TMU, Wasatch Academy's
  stand-in (126 km), gives 16.4 and WPUT (101 km) 15.1. Avoid SUU and ELU for this pair: their
  vertical ratios are 62 and 25.
- That makes this the right opener for level 1, and the method a school Shake can use alone
  (section 5).
- Peak ground speed underestimates the difference between a big and a small quake (the
  errors are mostly negative), because small quakes put more of their shaking into high
  notes. So the opener uses the Wood-Anderson swing, and the page says "about 10 times" if it
  shows ground speed.

### 3.8 What this means for the design

1. Use UUSS's recipe: horizontals, half peak-to-peak, a Wood-Anderson at 0.8 s, damping 0.8
   and 2,800, Richter's 1958 table. Use the sensitivity only; no full response is needed.
2. The app marks each station's biggest swing; students check a few and may move one (R3 S5).
3. Ask for at least 5 stations, better 10, and use the median. Show the mean beside it with
   one line: "UUSS averages its corrected stations; with no corrections, a few odd stations
   move an average more than a middle value." Show UUSS's own station spread (0.11–0.35 on its
   corrected stations) beside the students' spread.
4. Apply the station rule in 3.1 and list every dropped station with its reason. Drop clipped
   stations; for ML 4.5 and up use broadband only.
5. If only verticals are available, add the cross-validated correction (3.4) and say so.
6. Don't rely on the school stand-ins alone, and don't use the S − P formula.
7. Make duration magnitude a short optional step that uses the threshold line, not the eye.
8. Check against UUSS's ML only. Md and Mw go in Why? (R3 S6, R4 M3).
9. Keep the check script, with its seed, station lists and outputs, in
   `tools/quake-explorer/` so the accuracy can be rerun on new quakes (R4 L2).

## 4. Where it should live

All three homes need the same new library module (piece M1 in section 6): the Wood-Anderson
filter (0.8 s, damping 0.8, 2,800), the half peak-to-peak reading, Richter's table, the
station and event magnitudes, the station rule (3.1), and the reader for UUSS's amplitudes and
station magnitudes in the QuakeML, with its fallback when the file is missing. These are pure
functions, with `node --test` tests pinned to UUSS's published amplitudes ÷ 2 for Junction
(MTPU 10.1 mm, FOR1 1.81, CTU 0.149, SGU 8.47; R3 M1), not to our own simulation.

### 4.1 Added to Quake Locator

After a student locates the quake, each station's distance is known, so a step "How big was
it?" could follow the reveal.

- **Reuses:** the loaded records (three components at about half the stations), the
  student's epicenter, the clicking, the offline sample.
- **Against:**
  - **Too few stations, and the wrong ones for this job.** About 10 stations (`maxStations:
    10`), five of them stand-ins; two stand-ins read 0.35–0.5 high and SUU's vertical is
    faulty. At damping 0.8 the QL-like set landed 0.10 low on average, with an event spread of
    0.14 and a worst event 0.43 off (3.3). The lesson would turn into site effects, not
    magnitude.
  - The offline sample would have to be rebuilt. Its `stations.json` is the older format with
    no sensitivities, and four of its ten stations are vertical short-period sensors (ELU,
    WCU, DWU, MSU).
  - Quake Locator is a one-period activity. A magnitude step makes it two, or gets rushed.
- **Effect:** a new guide section and screenshots; a new section in the Quake Locator card and
  changes to its "At a glance" box (time, standards); the crosswalk row; the rebuilt sample
  and `sample.test.js`.
- **Later, cheaply:** once the library exists, Quake Locator's reveal could add one line ("Your
  stations say about M3.4; UUSS says 3.3") with a link to investigation E. That is S
  (about 1 session-day), after E.

### 4.2 A fifth Quake Explorer investigation, "E. How big was it?" (recommended)

**It fits the pattern:**

- **Predict:** "Twice as far away, how much smaller is the biggest swing?" and "The Junction
  quake was ML 3.3 and Magna ML 5.6. How many times taller was Magna's swing on Richter's
  seismograph, at the same distance?" (About 200 times. It can't be checked station by
  station, because Magna's near stations clipped; R3 C5.)
- **Explore:**
  - **the Kanosh pair** (level 1): two nearby quakes, 10 minutes and about 2 km apart, at one
    station 100–150 km away, on the same scale (the small one looks flat), then the small one
    magnified 10 times. The predicted ratio (13) is shown beside the observed one (R3 S7,
    R4 S5);
  - **then Junction:** each station's Wood-Anderson record with its biggest swing marked by the
    app (students check a few and may move a mark); a log-log plot of swing against distance;
    Richter's curve, shape locked, to drag up or down only; a line at 100 km showing
    "M = 3 + log(swing at 100 km)" (R3 S5, R4 S5). The amplitudes and the distance correction
    are labeled apart from the ground-speed plot on the Frequencies page;
  - a station table (distance, swing, station magnitude, dropped stations with reasons); the
    median, with the mean beside it.
- **Why?** Fading (the link to the Frequencies page), the logarithm, stations that read high
  (SGU and TMU, cause unknown), clipping (Magna), and the other methods: "UUSS also reports a
  duration magnitude and, for some quakes, a moment magnitude. They are separate estimates
  that usually agree within about 0.3; the catalog names one as preferred" (R3 S6, R4 M3).
- **Check:** UUSS's ML only, with UUSS's own station values beside the students' where the
  phase-data file has them.
  - **Fallback** (R4 M1, R3 S6): if a live quake has no phase-data file, or no ML station
    values, the Check compares with the event's preferred magnitude, names its type, and says
    station values aren't available for this quake. If the preferred type isn't ML, it says
    the comparison is rough. The preselected quakes always have verified files.
- **Paths** (R4 C2): the 15-minute opener alone; the 45–55-minute core with 5–10 preselected
  stations; duration, Magna and the method comparison as a second period.

**It reuses:**

- the record section's data layer (`loadRecordSection`), which already converts counts to m/s
  with the sensitivity and flags clipped records;
- the "true ground speed" gate (D23);
- the six offline samples and the live chooser;
- the steps panel, station selector and CSV download;
- the reading of UUSS's QuakeML;
- the log-log idea of the Frequencies page's Figure 3, which already ends with "Going
  further: how big was it?".

**New** (the third is now spelled out and the last four are added: together, the five pieces
version 1 didn't count, R3 C3):

- the amplitude-against-distance chart with a draggable curve (about the size of
  `travel-time-chart.js`, 140 lines);
- the investigation file (like `inv-a.js`, about 250 lines);
- loading the two horizontals: `loadRecordSection` loads only `channels[0]` today
  (`data.js:66`);
- a two-event view and data path for the Kanosh opener (Quake Explorer loads one event per
  investigation);
- reading UUSS's `AML` amplitudes and station magnitudes (`parseQuakeMLPicks` reads picks
  only);
- the Check's fallback when the phase-data file is missing;
- for the optional duration step only, samples of about 7 minutes (samples end at 110 s).

**The catch: horizontals.** The record section loads verticals only.

- Either load the horizontals too: `qe-junction` has them at 7 of 24 stations now; adding
  them everywhere roughly doubles that sample, and all samples together would go from 2.4 MB
  to about 4–5 MB.
- Or use the verticals with a stated correction of +0.21, cross-validated (3.4). Event by
  event the verticals do about as well (R3 C1).
- Horizontals win on authenticity (they are what UUSS measures) and because students can then
  compare station by station with UUSS's own horizontal values.
- I suggest horizontals in live mode and in the Junction sample, with the vertical fallback
  labeled.

**Effect on existing material:**

- the hub page gets a section `#e` and a line in its "At a glance" box;
- one new activity card (D19 allows one card per investigation);
- standards rows and a crosswalk section;
- `developers/quake-explorer.md`;
- Quake Explorer's tests (`qe-data.test.js`, `explorer-sample.test.js`) and the
  doc-links test;
- new screenshots;
- the samples' ABOUT files, if horizontals are added.

No new app folder, so `app-list.test.js` doesn't change.

**A decision for Gus:** D23 says "magnitude is left to a possible future app (not on the
roadmap)". This recommendation changes that.

- **Build E as a bounded prototype first, and trial it** (R4 C1). Update D22, D23 and E11 after
  the trial, if it goes well. If the trial shows a fifth investigation doesn't fit, the
  fallback is a separate app (4.3), reusing the same `lib/magnitude.js`.
- Quake Explorer already has four tabs, and the tabs wrap at phone width (`.qe-tabs`
  flex-wrap), so a fifth fits. "Five is the most it should carry" is a design hunch, not a
  tested limit (R4 C1).

### 4.3 A separate app ("How Big Was It?", as E11 named it)

- **For:** room for all five levels in one place, its own guide and card, and nothing else
  changes.
- **Against:**
  - it would copy most of Quake Explorer's data layer and chooser;
  - it is another app to keep working and another entry in the Apps menu for one idea;
  - E11's own description ("plot it against distance on log-log axes … compare with the USGS
    magnitude") is exactly an Explore step in Quake Explorer.
- **Effect:**
  - a new folder, hub page, card, menu entries, All apps card, crosswalk section, README line
    and developer page;
  - `app-list.test.js` and `teacher-cards.test.js` would require all of them, as they should.
  - Roughly 2–3 session-days more than 4.2.
- **When it would be right:** if the trial of E shows the investigation is too heavy for
  Quake Explorer, or if Dale and Cleat want all five levels in one place.

**Why 4.2:**

- it has the most stations and the data layer already built;
- it fits the Predict · Explore · Why? · Check pattern without stretching it;
- Quake Locator keeps its one-period shape;
- no new app to maintain.

## 5. School Shakes later

What changes when the school Shakes stream (data spec, `planning/spec-uhsn-data.md`):

- **Response: the single sensitivity is enough here too.**
  - A Raspberry Shake RS1D is a 4.5 Hz geophone, extended electronically to about 0.7 Hz
    (V7 and later). It is flat from about 0.7 to 44 Hz, which covers the Wood-Anderson band.
  - Sensitivity is about 4.0 × 10⁸ counts per m/s, ±10% unit to unit; that is ±0.04 in
    magnitude.
  - The spec already carries the sensitivity and units in `stations.json` (7.4). StationXML
    is built by DRI from Raspberry Shake's per-model templates (7.8), never from their FDSN
    station service. Their manual page offers that service too, and we must not use it
    (constraint 1).
- **One vertical sensor.** Most school Shakes are RS1D (question for Gus: which model at each
  school?). A vertical reads about 0.2 low on average (3.5; SUU's faulty vertical left out). An
  RS3D would allow the proper horizontal recipe.
- **Site effects, unknown until measured.** On Salt Lake Valley sediments shaking can be about
  3 times that on rock (Olsen et al. 1995), which is +0.5 in magnitude. A school on valley fill
  may read high for that reason. The stand-ins say nothing about this: SGU and TMU, which read
  high, are mountain stations (2.4, R3 M3a).

**Two open research questions** (research project C; not promised results, R4 S4 and the M1
brief):

1. **Can a school's Shake be calibrated for ML, and how well?**
   - **The method:** the school's station ML minus UUSS's ML, averaged over well-recorded
     quakes. "Well-recorded" needs a definition before anyone starts: ML 2.5 or more, peak at
     least 3 times the noise, 20–150 km, not clipped, and from different directions.
   - **How many and how long:** about 10 such quakes from at least 4–5 source areas, so 2–4
     years (R3 S3). Version 1's "about 10 quakes, 1–2 years" was too optimistic, for three
     reasons:
     - **detection:** a Shake needs about ML 2.5 at 20–40 km and 2.9 at 80–100 km to see a
       quake at a signal-to-noise ratio of 2 (Anthony et al. 2019, Shakes in private homes); a
       school in class hours is likely noisier. (Those units had older firmware whose "idle
       tones" hurt small signals; the authors expect current versions to do better, so this
       may be pessimistic, but it wasn't tested);
     - **clustering:** the April 2026 Kanosh swarm gives each school 4 of its 12–16 M3+ quakes
       within 150 km, and Millard's three biggest clusters hold 30 of its 48 M2.5+ quakes
       (2021-11 to 2026-11, ComCat; R3's rerun);
     - **path terms:** station terms swing about ±0.3 with source area (3.5), so ten quakes
       from two clusters measure a path, not a site.
   - **What to publish:** the correction with its spread, its count and the areas it came from,
     compared with nearby UU stations. Ten quakes is a planning target for an exploratory
     correction, not a validated minimum: UUSS's own 2006 corrections rest on more (R4 S4).
2. **Can a Shake measure a duration magnitude?**
   - UUSS's line, 0.017 µm/s, was set at "the estimated median noise level for short-period
     analog-telemetry stations" in its network (as of 2000).
   - **What the Shake sheet says** (read on the rendered page): 0.08 µm/s RMS, 1–20 Hz, is the
     RS1D V7+'s "Minimum Detection Threshold (estimate)", with the note "the minimum detectable
     level is considered to be 10 dB above the noise RMS". The RS3D V5+'s is 0.03 µm/s.
     Self-noise is given only as a figure.
     - Version 1 called 0.08 the self-noise; R3 placed it on the digitizer line. Both were
       wrong, and it matters.
   - 10 dB below 0.08 is a noise RMS of about 0.025 µm/s, whose mean absolute value (for
     Gaussian noise) is about 0.020 µm/s: **about UUSS's line**, not 4 times above it as version
     1 said. For an RS3D it would be about 0.008, below the line.
   - That is the instrument in good conditions. A school building in class hours adds more, and
     the statistics and bands differ, so the comparison is an indication, not proof (R4 S3).
   - So **whether a Shake can measure UUSS's duration is an open question**: in a quiet
     building it might; in a noisy one the line sits inside the noise. UUSS's threshold can't
     be carried over without a test. A school-specific duration scale would need its own
     calibration against UUSS's Md. That is research only.

- **What works without calibration:**
  - **same-place ratios at one school's Shake** (3.7): the station, instrument and ground
    cancel, and most of the path, for two nearby quakes; radiation, depth and record quality
    don't;
  - "our Shake against the nearest UU station" for the same quake (S9).
- **Clipping:** about 21 mm/s each way (±8,388,608 counts ÷ the sensitivity; the sheet
  labels it peak-to-peak).
  - From the peak-speed fit in 3.7 (extrapolated, so rough): about M5 within 20–30 km would
    clip; a central-Utah M3–4 won't.
  - Anthony et al. (2019) found Shake magnitudes about as good as USGS stations' (median
    misfits against NEIC: −0.25 ± 0.42 against −0.30 ± 0.32 for ML ≥ 2.0, and −0.36 ± 0.34
    against −0.33 ± 0.30 for ML ≥ 3.0). Those were vertical-component IASPEI magnitudes,
    which the authors expected to run about 0.3 below NEIC's.
- **Data path:**
  - nothing new is needed from DRI. Investigation E needs event windows from the school's day
    files (the range reader in the viewer review's U1) and the station's sensitivity and
    position (`stations.json`);
  - no derived product is needed;
  - location precision of 3 decimals (about 100 m) is plenty for magnitude.

## 6. Effort, risks, recommendation

### 6.1 Effort

Same scale and rework rule as P3 and P4 (student-facing work ×2, scripts ×1.5).

Version 2 adds the five pieces version 1 didn't count (R3 C3) and gives a range rather than one
number (R4 S8). The low end is version 1's case. The high end allows for the added pieces and
the usual rework.

| Piece | First build → with rework (Claude session-days) | Size | Gus review | DRI and UUSS staff | Teacher time | When |
| ----- | ----------------------------------------------- | ---- | ---------- | ------------------ | ------------ | ---- |
| M1 `lib/magnitude.js`: Wood-Anderson filter (0.8 s, 0.8, 2,800), half peak-to-peak, Richter's table, station and event ML, the station rule (3.1); **reading UUSS's `AML` and station magnitudes from the QuakeML, with the missing-file fallback**; tests pinned to UUSS's Junction amplitudes | 1.5 → 2–2.5 | S | ¼ day | — | — | First |
| M2 Quake Explorer E: chart with locked-shape curve, peak marks, station table, steps, reveal with UUSS's values; **horizontals in `loadRecordSection`; a two-event view for the Kanosh opener; the Check's fallback** | 2.5–3 → 5–6 | M | ½ day | — | — | After M1 |
| M3 Samples and the check script: horizontals for `qe-junction`; a Kanosh pair sample; ABOUT files and sample tests; `tools/quake-explorer/magnitude-check.mjs` with its seed, station lists and holdout (R4 L2) | 1 → 1.5 | S | ¼ day | — | — | With M2 |
| M4 Hub section `#e`, activity card, standards rows, developer notes, screenshots, integration checklist | 1 → 2 | S | ½ day | Optional ½ day: Dale and Cleat read the card | — | With M2 |
| **Core total** | **6–6.5 → 10.5–12** (version 1 said about 8; R3 judged that realistic to generous, R4 a low case) | **L** | **about 1½ days** | **0–½** | | |
| M5 Science page "How big was it?" (section 7): five parts, 7 figures (G1–G7) from real data in `tools/figures/`, Try it questions incl. a making task, a station CSV, standards row | 2 → 3.5 (plus M1 if built first: 3.5 → 6) | M | ½ day | (same ½) | — | Any time; needs no app |
| M6 Optional duration step in E: envelope plot with UUSS's line; **new samples of about 7 minutes** | 1.5 → 2.5 | S | ¼ day | — | — | Later, if trials ask for it |
| M7 One line in Quake Locator's reveal | 0.5 → 1 | S | ¼ day | — | — | After E |
| UUSS confirmation (question 4) | — | — | — | Optional, about 1 hour of UUSS staff time, asked through Cleat or Dale | — | Any time; not blocking |
| Trial | — | — | — | — | One class period plus 30 min of feedback; 15 min of teacher preparation; a second period if the extensions are tried | After the core |

- **Not counted:** revising the investigation after a classroom trial; an accessibility and
  touch review beyond the repo's usual checks; any UUSS follow-up beyond one question. Each
  could add a day or two.
- Calendar time isn't the constraint: no outside party is needed to build. The data are
  public, and UUSS's numbers are in ComCat for the reviewed quakes.

### 6.2 Risks

1. **Students think a 0.3 difference means they failed.** Mitigation: the Check shows UUSS's
   own station spread (0.11–0.35 on its corrected stations) beside theirs, and the Why? step
   says the other methods give values a few tenths apart.
2. **The Wood-Anderson filter is a black box.** Mitigation: the Why? step shows the 1935
   instrument and its pendulum; the PGV view stays one toggle away, so students can see the
   shaking itself.
3. **Clipped or saturated stations slip through** (Magna). Mitigation: drop flat-topped
   records; for ML 4.5 and up, use broadband stations only; Magna is shown as the trap, never
   the worked example. The short-period saturation can't be detected by code yet, so Magna's
   list is curated by hand.
4. **The accuracy rests on a modest set.** Training is 23 events, 14 from three central-Utah
   clusters; the holdout adds 10 from six other areas (2022–2026, ML 2.7–4.4). Out of sample
   the bias held and the quake-to-quake scatter doubled (0.08 to 0.15); every quake stayed
   within 0.3 (3.3). Ten held-out quakes is still a modest test. Below M2 and above M5 are
   untested; Md covers the smallest quakes in UUSS's catalog anyway. Mitigation: M1's test
   pins Junction; the check script (M3) reruns the comparison on new quakes.
5. **UUSS's constants are established from the data, not published:** damping 0.8,
   magnification 2,800, the stored full swing (3.2), and the current station corrections.
   This doesn't block anything. Cleat or Dale could ask UUSS (question 4).
6. **ComCat lacks the phase-data file for some quakes** (2.1). Mitigation: the preselected
   quakes have verified files; the live Check falls back to the event magnitude and says so.
7. **Logarithms come late in Utah math** (Secondary Math III, usually grade 11). Mitigation:
   the table path for younger classes; the card's "At a glance" box says so.
8. **Quake Explorer gets heavier.** A fifth tab fits the layout; whether it fits the lessons
   is what the trial tests (R4 C1). The real risk is scope (five levels): keep E to levels 1
   and 2 and level 5's Why? (R3 C3).
9. **The classroom formula is on many websites.** Students who find it get answers about 0.26
   high. The page should say why we use Richter's table instead.

### 6.3 Recommendation

1. **Build the core (M1–M4) as Quake Explorer investigation E,** as a bounded prototype: levels
   1 and 2 and level 5's Why?, Richter's recipe on horizontals, the Kanosh opener, UUSS's ML and
   station values in the Check with the fallback. About 10.5–12 session-days (8 at best).
   **Trial it with a class** before D22, D23 and E11 are updated (R4 C1).
2. **Build the science page (M5, section 7) whatever the apps end up doing** (Gus's request).
   It can come first, with M1 written along with it so the figures and a later investigation E
   share one tested filter. It also serves E13 and E14 later.
3. **Hold duration magnitude (M6) and the Quake Locator line (M7)** until a trial shows they're
   wanted.
4. **Don't build a separate app,** unless the trial shows E doesn't fit Quake Explorer.
5. **For the school Shakes:** start with same-place comparisons and "our Shake against UU"
   (S9). Treat a school's ML correction and a Shake duration magnitude as open research
   questions (project C): 2–4 years and quakes from 4–5 areas for a correction (section 5).
6. **Fix E11 in `activities.md`** when the questions document is next revised (Gus's call,
   after the trial):
   - Apps: Quake Explorer E instead of "How Big Was It? (proposed)";
   - Students: "measure the biggest swing at 5 to 10 stations, correct it for distance with
     Richter's curve, compare with UUSS's ML; make your own plot and fit of how fast the
     swing fades";
   - Standards: PHYS.2.1, ESS.4.1, CS 9/10.DA.3 and CS 11/12.DA.1 (with the making step);
     drop ESS.2.6; PHYS.4.1 only if the instrument is taught as a filter.

### 6.4 Questions

For Gus:

1. Go ahead with E inside Quake Explorer as a prototype, trialed before D22, D23 and E11
   change? (D23 says "magnitude is left to a possible future app".)
2. Horizontals in the Junction sample (about +0.6 MB), or verticals with the cross-validated
   correction? Event by event they do about as well (3.4); horizontals are what UUSS measures
   and allow a station-by-station Check.
3. What may the science page say about accuracy? My suggestion: the holdout result in words
   ("with 5 or more good stations, usually within about 0.3"), with the numbers and their
   limits in the teacher notes (7.2 Part 4).

For Cleat and Dale:

4. Optional: would UUSS confirm its synthetic Wood-Anderson constants (0.8 s, damping 0.8,
   2,800, sensitivity only), the stored full peak-to-peak swing, and its current station
   corrections for the five stand-ins? Not needed to build; it would let the card say "UUSS's
   recipe" without "as far as we can tell".
5. Which Raspberry Shake model is at each school (already open question 2a in CLAUDE.md)? An
   RS3D allows horizontal ML.
6. SUU's vertical channel (question 9 in the questions document): has UUSS answered? Until it
   does, SUU's vertical is left out of the magnitude work. **New:** SGU's vertical also read 2–3
   units low for quakes in December 2023, March 2024 and May 2024, as well as in 2020 (3.4);
   it reads normally in 2025–2026. Worth adding to the same question, and to Quake Explorer's
   SGU note, which mentions only 2020.

## 7. A science page: "How big was it?"

Gus asked (through M1) for a science page on magnitude in The Science, whatever the apps end
up doing. This section plans it. The draft text is a starting point for the session that
builds the page, at the level the checks in section 3 support; nothing in `docs/` was changed.

### 7.1 Audience and place

- **Readers:** high school students in Earth and Space Science, Physics or Computer Science,
  and their teachers. The reading level and tone are those of the other science pages: short
  sections, one idea each, an "In a hurry?" box, a "Predict first" box, a worked example and
  "Try it" questions at the end. Logarithms are explained in words before any formula.
- **File and title:** `theory/magnitude.md`, menu entry "How big was it?", page title "How big
  was it? Magnitude".
- **Place in the menu:** **right after "Frequencies, fading and sound"** (it would become 8, and
  "Which way the ground moves" 9).
  - Reason: magnitude is the next step from that page's "Why waves get weaker with distance".
    It needs the fading, not the location.
  - "After Locating a quake" was the other candidate. Distance does come from locating, but
    the page uses the official location and needs no locating skill, while it can't be
    understood without the fading.
- **Links, not repeats:**
  - It opens from Frequencies' Figure 3 (peak ground speed against distance for Junction,
    `img/freq-distance.svg`) and its note "Going further: how big was it?". It links both
    and does not redraw or re-explain the fading.
  - The integrating session would add one link from that note to the new page (a one-line
    change to `frequencies.md`, not made here).
  - It also links: "Instrument problems" on Reading a seismogram (clipping), "Beyond one
    seismogram" (H/V: soft ground), "Distance from S minus P" and "Locating a quake" (where
    the distance comes from), and "Our stations and data" (credits).

### 7.2 Outline with draft text

The opening, under the title:

> **Used in:** (none yet; see 7.5)
>
> When the ground shakes, the first question is "where?" and the second is "how big?". This
> page explains what a magnitude is, why each step up is so much bigger than the last, how
> seismologists measure it from the wiggles on a seismogram, and why two honest measurements
> of the same quake never quite agree. It builds on
> [Why waves get weaker with distance](frequencies.md#why-waves-get-weaker-with-distance):
> if you know how fast shaking fades, you can work back to how big the quake was.

**Part 1. What magnitude measures, and what it doesn't.**

> A quake's **magnitude** is one number for the whole quake: how big it was at its source. The
> **intensity** is how hard the ground shook at one place, and it is different at every town.
> Intensity is usually written in Roman numerals (the Modified Mercalli scale). It can be
> estimated from what people felt, which the USGS "Did You Feel It?" service maps from
> people's reports, and from instruments: the USGS ShakeMap combines both.
>
> Two quakes show the difference. In 2026 a magnitude 3.5 quake under West Valley City drew
> 4,122 "Did You Feel It?" reports; a magnitude 3.3 quake near Junction, almost the same size,
> drew 5. Far fewer people live near Junction. The 2020 Magna quake (magnitude 5.7) drew
> 26,376.
>
> So a magnitude answers "how big was the quake?"; an intensity answers "how hard did it shake
> here?".

- Sources: the USGS magnitude, energy and intensity page; the USGS products page (DYFI and
  ShakeMap); report counts from `activities.md` B3 (USGS event service, 2026-11-24).
- Version 1 said "the Junction quake was not gentler"; no felt data show that, so it is gone
  (R3 C5). Intensity is no longer defined by one USGS product (R4 S6).
- Links to E13 when the Felt Map activity exists.

**Part 2. Why it is a logarithm.**

> Quakes come in an enormous range of sizes. On Richter's seismograph (Part 3), 100 km away,
> the biggest swing is a thousandth of a millimeter for a magnitude 0 and about a meter for a
> magnitude 6. To fit that range on one scale, magnitude counts **powers of ten**: each step
> up means the biggest swing on Richter's seismograph is **10 times** taller at the same
> distance.
>
> The energy grows faster. For the **moment magnitude** used for big quakes (Part 5), each
> step is about **32 times** the energy, so two steps are 32 × 32 ≈ 1,000 times. For small
> quakes measured from the swing, the energy per step is less, about 15 times in Utah.
>
> | From | To | Swing on Richter's seismograph (same distance) | Energy (moment magnitude) |
> | ---- | -- | ---------------------------------------------- | ------------------------- |
> | Magnitude 3 | 4 | 10 times | about 32 times |
> | Magnitude 3 | 5 | 100 times | about 1,000 times |
> | Junction (3.3) | Magna (5.6), both measured from the swing | about 200 times | not comparable this way |
>
> A magnitude 6 is not "twice a 3". Its swing on Richter's seismograph is 1,000 times taller,
> and in moment magnitude it releases about 32,000 times the energy.

- **Predict first:** "Two quakes near Kanosh, magnitude 3.63 and 2.52, happened ten minutes
  and about 2 km apart and were recorded at the same stations. How many times taller is the
  bigger one's swing?"
- **Answer** (from 3.7): 10 to the power 1.11 is about 13. At station MMU, 118 km away, the
  swings differ about 12 times; over 25 stations the middle ratio is about 14 to 15. If the
  figure (G1) shows plain ground speed, the page says "about 10 times" and why: small quakes
  put more of their shaking into high notes.
- **Teacher note:** why small quakes don't follow the 32× rule. Energy is tied to moment
  magnitude (log E = 1.5 M + 4.8, in joules); for small quakes ML grows faster than Mw (slope
  about 0.8 in Utah, Arabasz et al. 2016), so one ML step is about 10^(1.5 × 0.8) ≈ 15 times
  the energy.
- The Junction–Magna row compares ML with ML (3.30 and 5.61). Version 1 mixed Junction's ML
  with Magna's Mw and gave an energy ratio; both are gone (R3 S1).
- Sources: the USGS page ("a tenfold increase in measured amplitude"); Okal (2019) and Hanks
  and Kanamori (1979) for energy; Arabasz et al. (2016) for Utah's ML–Mw slope.

**Part 3. How seismologists measure it.**

*3a. From the biggest swing and the distance (local magnitude).*

> In 1935 Charles Richter, in California, needed a way to compare quakes. He used one kind of
> seismograph everywhere, the **Wood-Anderson**: a small mass hanging on a taut wire that
> twists when the ground moves, magnifying the motion about 2,000 times onto photographic
> paper. His rule: **a quake that makes this seismograph swing 1 millimeter at 100 km is
> magnitude 3.** Ten times the swing at the same distance is magnitude 4.
>
> Stations are never all at 100 km, so Richter made a table of how much a swing shrinks with
> distance. To get a magnitude from any station:
>
> 1. read the biggest swing on the Wood-Anderson record, in millimeters (half of the largest
>    peak-to-peak swing);
> 2. take its logarithm (log 10 = 1, log 1 = 0, log 0.1 = −1);
> 3. add the number from Richter's table for that distance.
>
> No seismic network uses a real Wood-Anderson any more. Berkeley ran them from 1928 until
> January 1994 and keeps one on display. Computers take each station's modern record and work
> out what a Wood-Anderson would have drawn. The University of Utah Seismograph Stations still
> use Richter's table for Utah quakes.

A **worked example**, the Junction quake (magnitude 3.3, October 31, 2026). The swings are
UUSS's own published amplitudes ÷ 2 (mean of the two horizontals), which a teacher can check on
ComCat; the table values are Richter's own rows, not interpolated (R3 C2):

> | Station | Distance | Biggest swing (mm) | log of swing | From Richter's table | Magnitude |
> | ------- | -------- | ------------------ | ------------ | -------------------- | --------- |
> | MTPU | 29 km | 10.1 | 1.00 | 2.1 (30 km) | **3.1** |
> | FOR1 | 71 km | 1.81 | 0.26 | 2.8 (70 km) | **3.1** |
> | HLJ | 269 km | 0.261 | −0.58 | 3.9 (270 km) | **3.3** |
> | SGU | 114 km | 8.47 | 0.93 | 3.1 (110 km) | **4.0** |
>
> The swing shrank about 40 times from MTPU to HLJ, yet the three stations agree within 0.2:
> the table did its job. SGU says 4.0, most of a step too big. Part 4 explains. The University
> of Utah's official value is 3.3: the average of 30 stations, each with its own correction.

- Swings: UUSS's `AML` ÷ 2 from ComCat's phase-data, which our damping-0.8 simulation
  reproduces to 1% (MTPU 10.1, FOR1 1.77, HLJ 0.260, SGU 8.44 mm). Version 1 used our
  damping-0.7 simulation, 5–9% higher.
- **HLJ replaces CTU** (R3 C2): CTU isn't in the offline `qe-junction` sample; HLJ (269 km) is.
  UUSS gave HLJ weight 0, so it has no correction, which suits a lesson about uncorrected
  stations. BGU (299 km, also in the sample) would give 3.0 but sits right at the 300 km
  edge.
- Each magnitude is the log of the mean swing plus the table row nearest the distance, as a
  student would do it. With straight-line interpolation between rows and the mean of the two
  horizontals' logs, as the app does, MTPU and FOR1 come to 3.06 and 3.07: the same when
  rounded.
- The page shows a short excerpt of Richter's table (rows at 30, 70, 110 and 270 km among them)
  with its source, so every number in the example can be looked up.
- Teacher note: the computation simulates Richter's nominal magnification, 2,800, as UUSS
  does; the real instruments magnified about 2,080, and UUSS's station corrections take out
  the difference (2.3).

*3b. From how long it shakes (duration magnitude).*

> A bigger quake doesn't only shake harder; it shakes **longer**. After the main waves pass,
> the ground keeps ringing for a minute or more as waves scattered through the crust arrive
> (the **coda**). A bigger quake starts its coda higher, and the coda dies away at about the
> same rate, so it takes longer to fall to a fixed line. So the time from the first wave until
> the shaking falls to that line also measures the size. The University of Utah works out this
> duration magnitude for nearly every quake, and for about half of the smallest ones it is the
> magnitude they report.
>
> The University of Utah's line is an average ground speed of 0.017 micrometers per second (a
> micrometer is a thousandth of a millimeter). They chose it as the typical background noise of
> their older stations. Ending the count by eye, "where it sinks back into the noise", gives
> durations that are too short at noisy stations.

- What the checks support (3.6): with the fixed line, the middle of about 20 or more stations came
  within about 0.3 of the official value for 11 quakes; single stations disagree by up to 1.
- The page says duration works "on average, with many stations" and doesn't promise more. It
  says the Utah equation was calibrated on quakes up to about magnitude 5, and that very big
  quakes ring too long for short records (Magna).
- Version 1's coda reason ("because it breaks a bigger patch of fault") was wrong: a small
  quake's rupture lasts well under a second, its coda a minute or more (Herrmann 1975; R3 M3d).
  "How most of Utah's magnitudes are made" was wrong too as a statement about reported
  magnitudes: from magnitude 2 up almost all are ML (R3 M3c). The source check adds a nuance:
  nearly all UUSS events are assigned a duration magnitude, and about 50% have an ML since 2013
  (Koper et al. 2016). The new wording covers both. The virus comparison is dropped.

**Part 4. Why stations and methods disagree.**

> Every station gives its own answer, and they never quite agree. Typical station magnitudes
> for one quake spread about 0.3 either way. The reasons:
>
> - **The station's site.** Soft sediment in a valley shakes more than rock, and some stations
>   read high or low for reasons of their own. SGU, a mountain station above the Gunnison
>   Valley, reads about half a step too big for quakes from the south and west. Seismologists
>   give such stations a correction.
> - **The path and the direction.** A quake sends out stronger waves in some directions than
>   others, and the rock along each path differs.
> - **The instrument.** A record that clipped (hit its limit) hides the real peak. In the 2020
>   Magna quake, clipped stations read up to 3 steps too small (see
>   [Instrument problems](seismograms.md#instrument-problems)).
> - **Noise.** A small, distant quake barely rises above the background.
>
> That is why seismologists use many stations. The University of Utah **averages** its
> stations after correcting each one. Without corrections, the **middle value** is safer: a
> few odd stations move an average more than a middle value. With 5 or more good stations, the
> middle value usually lands within about 0.3 of the official value; with 10, nearly always.
>
> Different **methods** also give different numbers, because each measures something slightly
> different. For the 2026 Kanosh quake the University of Utah lists 3.63 from the biggest
> swings (its preferred value), 3.89 from the duration, and 3.84 from a newer method that uses
> the coda's long-period waves. Each is a separate measurement with its own uncertainty, not a
> vote to average. Together they say the quake was about 3.6 to 3.9.

- Sources: section 3 (3.3–3.5); UUSS values from ComCat.
- **Teacher note, the numbers behind "usually" and "nearly always"** (3.4): on ten quakes held
  out from all tuning, groups of 5 stations landed within 0.3 of UUSS's ML 88% of the time, and
  groups of 10, 97%. That rests on 32 quakes below M5 (22 training, 10 held out) of M2.1–4.4,
  plus Magna, 2022–2026, in and around Utah, on the stations Quake Explorer loads. It isn't
  promised for quakes below M2, or above M5 with clipped stations. Version 1 put "about 9 times
  in 10" in the student text before any holdout existed (R3 M2, R4 M2); the student text now
  stays in words.
- Version 1 said "SGU, in the Gunnison Valley … soft sediment"; SGU is a mountain station, and
  the cause of its high readings isn't known (R3 M3a). It said UUSS takes "the middle of many
  stations"; UUSS averages (R3 M3b). "All three are right; together they say about 3.8" is
  replaced (R3 S6, R4 M3).

**Part 5. Utah's magnitudes, and what the official number means.**

> The University of Utah Seismograph Stations (UUSS) locates and measures the quakes its
> network detects in and around Utah. On a USGS event page the magnitude comes with a type:
>
> - **ml**, local magnitude (Part 3a): for almost all quakes of about 2 and up, and about half
>   of the smaller ones. UUSS prefers it whenever it can be measured;
> - **md**, duration magnitude (3b): for the other half of the smallest quakes;
> - **mw**, moment magnitude, for the big ones. It comes from the seismic moment: the size of
>   the fault patch that slipped, how far it slipped and the stiffness of the rock, measured
>   from long, slow waves. It is the scale used for large quakes worldwide. Richter's local
>   magnitude is read from short, quick waves at nearby stations, and for very big quakes those
>   swings stop growing in step with the quake, near magnitude 6.5 to 7.
>
> The first number appears within minutes and is computed automatically. For larger quakes a
> seismologist checks it within about an hour, and it can change. The local magnitude is the
> average of many stations, each corrected for its site. Other methods give values a few
> tenths apart, so treat the last digit with care.
>
> Why does this matter in Utah? Small quakes happen every week; a magnitude 5 somewhere in Utah
> about once a decade on average. Planners estimate a 43% chance of magnitude 6.75 or larger in
> the Wasatch Front region in the next 50 years. Measuring magnitudes carefully is how we know
> how often each size happens.

- Sources:
  - magnitude types and UUSS practice: the UUSS summary page, Voyles et al. (2020) (review
    within 30–60 minutes for M2.5–3.5 and up), the USGS magnitude types page;
  - saturation: Hanks and Kanamori (1979);
  - "once a decade": Arabasz et al. (2016) give M ≥ 5 background quakes about once per 11
    years in the Utah region;
  - 43%: the WGUEP fact sheet.
- Version 1 said "UUSS measures every Utah quake" and "the Wood-Anderson can't feel the long
  waves"; both are reworded (R4 S7). "The middle of many stations … good to about 0.1 to 0.2"
  became "the average … a few tenths apart" (R3 M3b).
- Links to E14 when it exists.

**Try it** (draft):

1. Using the table in Part 3a, what magnitude does a 1 mm swing at 100 km give? At 50 km?
2. A quake makes a 5 mm swing at FOR1 (71 km). What magnitude is it?
3. In moment magnitude, how many magnitude 4 quakes release as much energy as one magnitude 6?
4. SGU read 4.0 for Junction. What correction should SGU get? How would you check it with a
   second quake? Why would a quake from a different direction help?
5. Why do you think duration magnitude stops working for very big quakes? (Hint: how long
   would you have to record?)
6. Look up the latest Utah quake on the USGS map. What magnitude type is it, and why?
7. **Make it** (CS): download the Junction station table (CSV: station, distance, swing).
   Plot log swing against log distance, fit a straight line, and say how fast the swing
   fades. Where does your line differ from Richter's table? Then use the table to compute each
   station's magnitude and make a chart of station magnitude against distance with the
   official value as a line.

- The CSV is a small data file built from UUSS's published amplitudes, with its provenance
  (constraint 5). Question 7 is what ties the page to CS 9/10.DA.3 and CS 11/12.DA.1 (7.4).

### 7.3 Figure ideas

All from real UU data (doi:10.7914/SN/UU) via EarthScope, and UUSS values from ComCat. Scripts
go in `tools/figures/` like the other science figures, with any compiled lists saved as data
files with their provenance (constraint 5).

| # | Figure | Data | What it needs | Priority |
| - | ------ | ---- | ------------- | -------- |
| G1 | **Two nearby quakes, two sizes:** the Kanosh M3.63 and M2.52 quakes at one station 100–150 km away, first on the same scale, then the small one × 10; the predicted ratio (13) beside the measured one | uu80137106, uu80137126; MMU (118 km), which matches the predicted ratio best (3.7) | The Wood-Anderson filter (M1). With plain ground speed instead, the caption says "about 10 times" | 1 |
| G2 | **Richter's instrument:** Junction at FOR1, top the ground speed (what Quake Explorer shows), bottom the simulated Wood-Anderson record with the half peak-to-peak swing marked in mm; a small drawing of the instrument | uu80162166, FOR1 HHE/HHN | The filter (M1); a simple diagram | 1 |
| G3 | **Each station's estimate against distance (Junction):** left, the biggest swing (mm) against distance on log-log axes with Richter's curve for 3.3 through it; right, each station's magnitude against distance with UUSS's 3.30 as a line and a ±0.3 band; SGU and TMU labeled; the median marked | About 30 stations' horizontals: UUSS's `AML` ÷ 2, which our filter reproduces | Richter's table as data with its source; UUSS's ML; the CSV for Try it 7 comes from the same file | 1 |
| G4 | **How many stations?** The share of groups within 0.3 of UUSS against the number of stations (1, 3, 5, 10), for the **holdout** quakes on the stations Quake Explorer loads, with the in-sample line lighter | 3.4's resampling, saved as a data file with its seed and station lists | The check script (M3) | 2 |
| G5 | **How long it shakes:** Junction at one quiet station, the 2-s average ground speed on a log scale against time, with UUSS's 0.017 µm/s line, the P arrival and the duration arrow; a noisier station beside it whose noise sits near the line | uu80162166; two vertical stations; records of about 7 minutes | An envelope function; UUSS's END value for the same channel to show agreement | 2 |
| G6 | **One quake, several numbers:** ML, Md and Mw for five Utah quakes (2.2), as dots on one axis per quake, the preferred one filled | ComCat and UUSS QuakeML | Nothing new | 3 (could be a table) |
| G7 | **Stations that read high:** SGU and TMU station magnitude minus UUSS's, by source area (Kanosh, Junction, Milford, Kenilworth), horizontal against vertical | 3.5's events | The stand-in script; no cause named in the caption unless an H/V check supports one | 3 |

- Clipping is already shown on Reading a seismogram; the page links it instead of a new
  figure.
- A "Did You Feel It?" map belongs to E13's tool; Part 1 needs only the report counts.
- **The page's short credit line** (R3 C6): "Data: University of Utah Seismograph Stations
  (UU, doi:10.7914/SN/UU) via EarthScope; amplitudes and magnitudes from UUSS via USGS ComCat;
  felt reports from USGS 'Did You Feel It?'." Add US (doi:10.7914/SN/US) or C0 only if a figure
  uses those stations. Richter's table excerpt, the report counts and every compiled event or
  station list (G3, G4, G7, the CSV) go in a `planning/` source log, with data files and their
  provenance.

### 7.4 Utah standards for the page

| Code | What the page contributes |
| ---- | ------------------------- |
| PHYS.2.1 | Energy grows per magnitude step (about 32 times in moment magnitude, about 15 for small quakes in ML); shaking loses energy with distance, which the distance correction undoes |
| ESS.4.1 | How the size of a natural hazard is measured; why stations read high or low; how often each size happens and Utah's 50-year forecast |
| CS 9/10.DA.3 ("Create data visualizations …") | Try it 7: students **make** the log-log plot and the station-magnitude chart from the CSV |
| CS 11/12.DA.1 ("Refine or create computational artifacts …") | Try it 7: students **fit** their own line for how fast the swing fades and compare it with Richter's table; Try it 4, computing a correction |

Proposed standards row: **PHYS.2.1 · ESS.4.1 · CS 9/10.DA.3 · CS 11/12.DA.1**, with the CS codes
only because Try it 7 has students make something (R3 C4, R4 M4). If the building session drops
Try it 7, the CS codes come off the page.

- PHYS.4.1 only if the building session keeps the instrument-as-filter idea in G2 (the
  Wood-Anderson responds to notes above about 1 Hz).
- ESS.2.6 is dropped: it is about evaluating design solutions to reduce disaster effects, which
  the page doesn't do (R3 C4).
- Logarithms come in Secondary Math III (usually grade 11); the page explains them in words
  first, and its table path needs only addition.

### 7.5 What the page can say now, and what depends on an app

**Now, with no app:**

- all five parts;
- the worked example, which students can do by hand from the table, on UUSS's published
  amplitudes;
- figures G1–G7 as static real-data figures, like "Beyond one seismogram" (D31);
- Try it questions 1–7, question 6 using the public USGS event pages and question 7 a CSV
  file;
- accuracy in words from the holdout (Part 4), with numbers and limits in the teacher notes;
- the source log and credit line.

**Needs M1 first** (the tested Wood-Anderson module, 2–2.5 session-days): G1, G2 and G7. G3
and the CSV can use UUSS's published amplitudes without M1. Writing the filter once in `lib/`
keeps the figures and any later app on the same code. Without M1, G1 can use plain ground
speed, but the ratio is then about 10, not 13–15 (3.7), and the caption must say so. G4 needs
the check script (M3).

**Depends on a magnitude app (investigation E or other):**

- "Try it on any quake": choosing a quake, dragging Richter's curve, seeing UUSS's own station
  values beside one's own;
- the interactive duration step;
- the "Used in" line at the top. Until then it says nothing, or "Used in: Quake Explorer
  (coming soon)" once Gus approves E;
- school Shake data (section 5).

The page should not promise an app before Gus decides. Its "Going further" box can point to
the USGS event pages, where every Utah quake's magnitude type and value are public.

## 8. Response to the critiques

Every finding from R3 (`critique-r3-claude.md`, IDs as there) and R4 (`critique-r4-codex.md`,
which has no IDs, so they are numbered here in its order). The body cites R4 by severity and
order: M1–M4 are rows 1–4, S1–S8 rows 5–12, C1–C2 rows 13–14, and L1–L2 (the source log)
rows 15–16.

**Response codes:**

- **Accepted:** done as the critic suggested.
- **Changed:** done another way, with the reason.
- **Declined:** not done, with the reason.

### 8.1 R3 (Claude)

| ID | Finding | Response | What changed, and why |
| -- | ------- | -------- | --------------------- |
| M1 | Wood-Anderson: 2,800 with Richter's table reads high; UUSS's damping is 0.8 | Accepted | Every number rerun at damping 0.8 (3.1–3.5). The 2,080 against 2,800 history and the source of UUSS's station corrections are in 2.3 and 2.1. "1.88 × 2,800" is explained in 3.2: 2 × 0.94, the 0.94 from damping 0.7. My rerun found one more thing: UUSS's amplitudes match a sensitivity-only simulation at damping 0.8 to 0.5% (5,602 = 2 × 2,800 × 1.000, robust scatter 0.002), even tighter than R3's full-response 1.008. `lib/magnitude.js` uses 0.8 and 2,800, and its test is pinned to UUSS's amplitudes ÷ 2 (section 4, opening). The page keeps "about 2,000 times", with a teacher note on why the computation uses 2,800 (7.2 Part 3a) |
| M2 | The accuracy table describes UUSS's chosen channels, not the app | Accepted | Set B (the stations Quake Explorer loads, all three components) and set C (a holdout of 10 quakes from other areas, chosen before running) in 3.1, 3.3 and 3.4. The Summary and the page quote the holdout. The noise and clipping gates now fire, and their counts are given. The check script is kept as M3 |
| M3a | SGU and TMU are mountain stations, not valley sediment | Accepted | 2.4 item 3, 3.5, section 5 and Part 4. No cause is named; an H/V check could test one. The valley-fill risk is argued from Olsen et al. (1995) alone |
| M3b | UUSS averages; it doesn't take the middle value | Accepted | 2.1, 3.8, Part 4 and Part 5. The Check shows the students' mean beside their median (S2) |
| M3c | Duration is not how most of Utah's magnitudes are made | Accepted | Part 3b now says "for about half of the smallest quakes"; the 2.1 table says the same |
| M3d | The coda's length is not from a bigger patch of fault | Accepted | Part 3b uses R3's wording, after Herrmann (1975) |
| M3e | Stand-in labels: ELU stands in for North Sanpete | Accepted | 2.4 and the 3.5 table: SGU and TMU serve two schools, not three |
| S1 | "32 times the energy" and "shakes 1,000 times harder" overstate ML | Accepted | 2.2 explains energy per step (32 times for Mw, about 15 for small Utah ML). Level 1, Part 2 and 4.2's Predict speak of the swing on Richter's seismograph. The Junction–Magna row compares ML with ML (about 200 times), with no energy cell. Teacher note on why |
| S2 | Compare like with like: mean against median | Accepted | The median stays for students. The Check shows the mean too, with R3's one line (3.8, 4.2). 3.3 gives the decomposition: damping +0.03, median against mean −0.04, missing corrections +0.07 |
| S3 | A school's calibration takes longer than "10 quakes, 1–2 years" | Accepted | Section 5: about 10 well-recorded quakes from at least 4–5 source areas, 2–4 years; the correction published with its spread and areas |
| S4 | SUU's low vertical is its faulty channel | Accepted | Footnoted in 3.5 and left out of every vertical-offset and school statement; question 6 in 6.4 |
| S5 | Say who reads the peaks; make "the curve's height" concrete | Accepted | The app marks the half peak-to-peak swing and students check a few (level 2, 4.2). A line at 100 km shows "M = 3 + log(swing at 100 km)". The 15-minute table path is for classes that haven't met logarithms |
| S6 | Keep Check to one target; Md and Mw to Why? | Accepted | 4.2's Check is UUSS's ML with its station values, plus the fallback. Md and Mw are in Why? as "other methods". Part 4 says "about 3.6 to 3.9" |
| S7 | The Kanosh opener's details | Accepted | "52 stations" is now 50 channels at 25 stations. The opener uses a station at 100–150 km (MMU, 118 km: ratio 12.1 against the predicted 12.9), the same scale first, then × 10. G1 with ground speed says "about 10 times" |
| C1 | The vertical option is a little better than reported | Accepted | The dropped verticals are back (Appendix A). With them, the vertical event spread is 0.05, not 0.10 (3.3). The correction is cross-validated (3.4). Question 2 says verticals do about as well event by event, and why horizontals still win |
| C2 | The worked example: UUSS's amplitudes and the table's own rows | Accepted | Part 3a uses UUSS's `AML` ÷ 2 and Richter's rows at 30, 70, 110 and 270 km. CTU, not in the offline sample, is replaced by HLJ (269 km), which is. "Most of a step too big" |
| C3 | Effort: agree with E, but count five more pieces | Accepted | All five are in 4.2's "New" list and in M1, M2 and M6 (6.1). The core is now 10.5–12 days with 8 as the low case. Scope is kept to levels 1, 2 and level 5's Why? (6.2 risk 8) |
| C4 | Standards: drop ESS.2.6; give the CS codes something students make | Accepted | ESS.2.6 dropped from section 1 and 7.4. The CS codes hang on a making step: level 2's own fit from the CSV, and the page's Try it 7. The logarithm prerequisite goes in the card's "At a glance" box |
| C5 | Smaller accuracy and source-log fixes | Accepted | 3.2: "exactly", −0.300 at every distance band (±0.021 with the full table, ±0.033 with 16 rows). 2.1: "no preferred `mw`", the 9 coda Mw, the whole-Utah box, West Valley City's moment tensor and Mwr. 3.3: UUSS's weighted-only spread (0.23; range 0.11–0.35) is now beside the all-channel one, and 3.8 and 6.2 use it. 3.7: signs defined. Source log: Whidden and Pankow's two bands; Anthony et al.'s subsets; Richter 1935 not mixed with 1958; Louie's page as the formula's source; the ObsPy note softened; Raspberry Shake's noise line. Page: "no network uses one now", the meter at 100 km for M6, "far fewer people live near Junction", and 4.2's Predict uses ML 5.61 against 3.30 |
| C6 | Constraints: no problems; finish the credit line | Accepted | The credit line is in 7.3. Anthony et al. are cited by DOI as the primary source |

### 8.2 R4 (Codex)

| # | Finding | Response | What changed, and why |
| - | ------- | -------- | --------------------- |
| 1 | MUST: don't promise ComCat phase data for every event | Accepted | 2.1 says "where UUSS's phase-data product is present", with a count (55 of the 60 most recent M ≥ 2.5 events had one; the other 5 were mining explosions with only an event magnitude; files appear within hours to a few days). The preselected quakes have verified files. The live Check falls back to the preferred event magnitude, names its type and says the station values are missing (4.2). Station values are not a required step for an arbitrary quake |
| 2 | MUST: treat the success rates as in-sample | Accepted | Version 1's percentages are labeled in-sample on UUSS's channels. The new holdout (set C) is whole areas, not resampled stations, and nothing was fitted on it. The vertical correction is fitted on training events only, leaving out one cluster at a time (3.4). The Summary and the page quote the holdout |
| 3 | MUST: separate ML, coda magnitude and the specific Mw product | Accepted | 2.2's table marks the preferred value and names each method (coda Mw `LLNLCCT`, moment tensor, Mwr, Mww). "All three are right; together they say about 3.8" is gone. The Check uses ML only, and Why? calls the others separate estimates (4.2, Part 4) |
| 4 | MUST: the page doesn't meet the CS standards by showing plots | Changed | R4 suggested removing the CS codes from the page unless students make something. M1's brief and R3 C4 chose to give them something to make, so the page has Try it 7 (plot and fit from a CSV), and 7.4 ties the codes to it. If Try it 7 is dropped, the codes come off |
| 5 | SHOULD: call the Wood-Anderson calculation an emulation, not UUSS's exact recipe | Accepted | Damping 0.7 is gone; the constants are now the nominal ones, which R3 and my rerun establish from UUSS's amplitudes (3.2). The text says they are established from the data, not published, and "full response changes little" is bounded to the tested UU channels (2.3, 3.2). Question 4 asks UUSS to confirm |
| 6 | SHOULD: make the live station rule reproducible | Accepted | The rule is a table in 3.1: channels, response, distance, window, quality, big quakes. Sets B and C use it. Dropped stations are shown with reasons. Magna's short-period exclusions are labeled a manual lesson restriction, and HH-only for ML ≥ 4.5 a rule of thumb (2.4) |
| 7 | SHOULD: bound the duration claim to the tested proxy | Accepted | 3.2 and 3.6 call the threshold a classroom proxy matching the sampled values. Section 5 calls the Shake noise comparison evidence, not proof, since the statistics and bands differ. `md` against Mc names are given in 2.1 |
| 8 | SHOULD: qualify school-calibration counts and same-station ratios | Accepted | Section 5: ten quakes is a planning target for an exploratory correction, with a definition of "well-recorded" and the spread and areas to report. Same-place ratios cancel the station, instrument, ground and most of the path, approximately; radiation, depth and record quality remain (3.7, 5) |
| 9 | SHOULD: tighten the opener and chart instructions | Accepted | "Two nearby quakes" (10 minutes, 1.9 km apart), predicted ratio beside the observed one, one station, component, filter, window and scale; the curve's shape is locked and only shifts; amplitudes and distance correction labeled apart from the ground-speed plot (4.2, 7.2) |
| 10 | SHOULD: don't equate intensity with DYFI reports | Accepted | Part 1: MMI is usually written in Roman numerals; DYFI maps reports; ShakeMap combines reports and instruments |
| 11 | SHOULD: duration range and ML saturation wording | Accepted | The Utah coda equation was calibrated through about ML 5, and Magna's Md 5.67 shows values above it (2.1, 3.6, Part 3b). Saturation is a limit of a local short-period amplitude scale (2.4, Part 5). "UUSS measures every Utah quake" became "the quakes its network detects" |
| 12 | SHOULD: treat 8 days as a low case | Accepted | 6.1 gives 10.5–12 days with 8 as the low case, lists what is not counted, says seven figures (G1–G7), and shows UUSS's confirmation as optional human time |
| 13 | CONSIDER: make the fifth investigation conditional on a trial | Accepted | 4.2 and 6.3: build E as a bounded prototype, trial it, then update D22, D23 and E11. A separate app is the fallback. "Five tabs is the limit" is now a design hunch |
| 14 | CONSIDER: split the 15-minute opener from the full investigation | Accepted | Section 1 and 4.2: a 15-minute opener, a 45–55-minute core with 5–10 preselected stations, and extensions in a second period |
| 15 | SHOULD (source log): verify the 1958 table against the named source | Accepted in part | Two independent reproductions of Table 22-1 (Uhrhammer et al. 1996 Table 4; NMSOP-2 DS 3.1 Table 1) agree at all 36 shared distances, and all 16 of our rows are right. No scan of Richter (1958) itself was read, hence "in part". The full table is now in Appendix A for M1; with it UUSS's channels fit more tightly (scatter 0.021 against 0.033). The transcription, its source and the interpolation rule are recorded in Appendix A and the source log. The check against UUSS's own channels is kept as a separate claim |
| 16 | SHOULD (source log): keep an auditable path for the resampling | Accepted | M3 now includes `tools/quake-explorer/magnitude-check.mjs` with its seed, station lists, holdout and compact outputs (6.1, Appendix B). The scratch work stays out of the app |
| 17 | Shared: the plan and the E11 card differ | Accepted | E11 changes only after Gus approves E and the trial (6.3 item 6) |
| 18 | Shared: no constraint violation; later Shake data only through DRI's server | Noted | No change needed; section 5 already rules out Raspberry Shake's servers |
| 19 | Shared: a `lib/` module and a Quake Explorer investigation are more economical | Noted | Agrees with the recommendation |

### 8.3 Where the critics differ (for M1 to flag to Gus)

1. **CS codes on the page.** R4: remove them unless the page has students make something.
   R3: give the page a making task. I followed R3 and M1's brief (Try it 7). If Gus would rather
   keep the page a reading page, R4's option is the simpler one: drop the codes there.
2. **How firmly to state UUSS's constants.** R3 says the data establish UUSS's practice
   (nominal instrument, full swing stored). R4 says call it an emulation until UUSS confirms.
   Both are done: the review uses the constants and says they come from the data, and
   question 4 asks UUSS.
3. **The effort.** R3 judged 8 days "realistic to generous" by this repo's record; R4 called
   it a low case. The table now gives 10.5–12 days with 8 as the low case.
4. **Trial first.** R4 asks for a prototype and a trial before D22 and D23 change; R3 agrees
   with E without that condition. The recommendation now includes the trial; whether to
   change D23 before or after it is Gus's call.

## Appendix A. Method details

- **Wood-Anderson:**
  - ground displacement = counts ÷ response ÷ (iω)ᵏ, with k = 1 for velocity sensors and 2 for
    accelerometers;
  - multiplied by s² / (s² + 2hω₀s + ω₀²) with ω₀ = 2π/0.8 s and h = 0.8 (version 1: 0.7),
    in the frequency domain (app's `fft`, zero-padded to twice the length);
  - tapers: 5% cosine in time; in frequency, 0.1–0.2 Hz for broadband channels and 0.3–0.6 Hz
    for short-period ones, and 0.85–0.95 × Nyquist at the top.
- **Peak reading:** half the largest difference between neighboring turning points.
  Zero-to-peak was also kept; UUSS's amplitudes match half peak-to-peak more tightly.
- **Distance:** Richter's table, epicentral, linear between these rows (km: −log A0): 0: 1.4,
  10: 1.5, 20: 1.7, 30: 2.1, 40: 2.4, 50: 2.6, 60: 2.8, 80: 2.9, 100: 3.0, 150: 3.3, 200: 3.5,
  250: 3.8, 300: 4.0, 400: 4.5, 500: 4.7, 600: 4.9.
  - Transcribed from Richter (1958) Table 22-1 as reproduced by Uhrhammer et al. (1996),
    Table 4 (p. 1322). A second, independent reproduction (Bormann 2012, NMSOP-2 DS 3.1,
    Table 1) agrees at all 36 distances the two share, and all 16 rows above are right (source
    helper, spot-checked by me).
  - **The full table, for M1** (the same sources): 0 1.4, 5 1.4, 10 1.5, 15 1.6, 20 1.7,
    25 1.9, 30 2.1, 35 2.3, 40 2.4, 45 2.5, 50 2.6, 55 2.7, 60 2.8, 65 2.8, 70 2.8, 80 2.9,
    85 2.9, 90 3.0, 95 3.0, 100 3.0, 110 3.1, 120 3.1, 130 3.2, 140 3.2, 150 3.3, 160 3.3,
    170 3.4, 180 3.4, 190 3.5, 200 3.5, 210 3.6, 220 3.65, 230 3.7, 240 3.7, 250 3.8, 260 3.8,
    270 3.9, 280 3.9, 290 4.0, 300 4.0, then every 10 km to 600 km (4.9). There is no 75 km
    row. M1 should store it as a data file with this provenance and interpolate linearly.
  - Against UUSS's weight-0 channels the full table gives −0.300 ± 0.021 and the 16 rows
    −0.299 ± 0.033 (3.2). That is a separate check from the transcription (R4 L1).
- **Selection:** set A: 10–300 km (hypocentral, as in version 1); the channels UUSS measured,
  and every vertical at those stations (version 1 wrongly dropped verticals that also had a
  UUSS duration; R3 C1). Sets B and C: the rule in 3.1. All sets: peak ≥ 3 × the RMS of the
  record before P; not flagged by `isFlat` or `isClipped`.
- **Details fixed for sets B and C before the holdout ran** (the helper's, recorded in
  `oos/RESULTS.md`): a 0.1–0.2 Hz cosine high-pass and 1.5 s end taper before the simulation;
  noise from −8 s to 2 s before P; a station gives a horizontal value only if both horizontals
  pass every gate; a channel with more than 0.5% missing samples is dropped; analog
  short-period channels with displacement metadata are converted as `units.js` does; 300 km for
  every quake, Magna included; records loaded −10 to +150 s, so beyond 256 km the window is cut
  at +150 s (7 of 1,989 usable channels peaked after Quake Explorer's +110 s, all beyond
  218 km); epicentral distance for both the window and the table.
- **Durations:**
  - 1 Hz high-passed velocity (sensitivity only); mean absolute value in 2-s windows;
  - end = first window after S below 0.01724 µm/s (or 1.5, 2 or 3 × the pre-event level for
    the "by eye" versions);
  - start = UUSS's P pick;
  - records from 60 s before to 420 s after the origin.
- **Peak ground speed:** 1–10 Hz band (cosine tapers 0.7–1 Hz and 10–13 Hz), largest absolute
  value in the same window as ML.

## Appendix B. The scripts

Written for this review only, not committed (as asked). They sit in this session's scratchpad,
which may be cleared:

- `mag-lib.mjs` (helpers; imports the app's `mseed.js`, `response.js`, `spectral.js`,
  `signal.js`, `fdsn.js`, `geo.js`);
- `run-events.mjs` (fetch, measure, save per channel);
- `analyze.mjs`, `analyze2.mjs` (sections 3.2–3.7);
- `standins-and-samples.mjs` (3.5);
- `subsets.mjs` (3.4);
- `tables.mjs` (the tables);
- `richter-table.json`.

Downloads were cached; a rerun of all 23 events from the cache takes about 10 minutes.

Version 2 adds, in the same scratchpad:

- `v2/insample-h08.mjs`: set A's rows at damping 0.8, the amplitude ratio by frequency and the
  same-place ratios, from R3's measurement files (copied to `r3rerun/` because R3's folder may
  be cleared);
- `v2/samples-h08.mjs`: the bundled samples at damping 0.8;
- `oos/`: sets B and C, the subsets, the cross-validated vertical correction, the Kanosh
  station and the phase-data availability count, written by a helper (a subagent) and checked
  by me (I recomputed its headline offsets from its per-quake files and got the same numbers,
  and checked from the file times that the holdout list was written before any holdout
  waveform was read). `oos/holdout-events.md` records the holdout and its selection rule,
  written before any number was computed on it; `oos/RESULTS.md` has the tables.

The scratchpad may be cleared, so the check should be kept in the repo as M3:
`tools/quake-explorer/magnitude-check.mjs`, like the existing `clear-s-check.mjs`, with its
seed, the station lists for sets B and C, and compact outputs (R4 L2). Then a new quake can be
compared with UUSS at any time, and a reviewer can reproduce the numbers.
