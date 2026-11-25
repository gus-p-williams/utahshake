# Critique R3 (Claude): the magnitude review

*Session R3-magnitude-critique, 2026-11-25. An independent critique of
`planning/review-magnitude.md` (version 1, session P5) with its source log
`planning/magnitude-sources.md`. I have not seen the other critique (R4). US spelling. Nothing
here is a decision.*

## How this critique was done

- **Read:** the review and source log in full; CLAUDE.md; `planning/activities.md` (E11, E13,
  E14, B3, question 9); `planning/decisions.md` (D9, D22, D23, D31, D37);
  `docs/theory/frequencies.md` ("Why waves get weaker with distance"); `docs/teachers/`
  (cards' timing, `standards.md`); `mkdocs.yml` (The Science menu); `docs/app/js/config.js`
  (schools and stand-ins); Quake Explorer's `data.js`, `config.js` and tab markup; the
  `qe-junction` sample's ABOUT file.
- **Primary sources:** checked by me and two research helpers (subagents) whose quotes I
  checked. They read Richter (1935), Richter's 1958 table (as reproduced by Uhrhammer et al.
  1996), Uhrhammer and Collins (1990), NMSOP-2 IS 3.3 (the IASPEI standard), the Pechmann et
  al. (2007) abstract, the UUSS magnitude summary page, Voyles et al. (2020), Koper et al.
  (2016), Arabasz et al. (2016), Whidden and Pankow (2012), Hanks and Kanamori (1979), Okal
  (2019), Munafò et al. (2016), Herrmann (1975), the USGS magnitude pages, Anthony et al.
  (2019), Raspberry Shake's specification sheet (documentation only), the USBE SEEd and CS
  standards, and John Louie's UNR course page.
- **Re-run:** a third helper (Fable) audited P5's scripts, which are still in P5's
  scratchpad. It then recomputed the key numbers with its own code. It used P5's cached raw
  downloads plus ComCat and EarthScope, and the app's own `lib/` modules. Its scripts and
  outputs are in this session's scratchpad (`…\scratchpad\rerun\`, which may be cleared). I
  spot-checked its outputs, and I took station elevations from EarthScope station metadata and
  the USGS elevation service.
- **Not done:** no classroom trial, no Raspberry Shake data (constraint 1), and Pechmann et al.
  (2007) beyond its abstract (paywalled).

## Top five

1. **MUST. The 2,080-versus-2,800 science is backwards, and the review used the wrong
   damping.** Uhrhammer and Collins (1990) say a 2,800 simulation used with Richter's table
   overestimates ML by about 0.13. UUSS uses the nominal Wood-Anderson (2,800, damping 0.8),
   and its station corrections, fitted to paper records, absorb that offset. "1.88 × 2,800" is
   exactly 2 × 2,800 once the damping is 0.8 (M1).
2. **MUST. The headline accuracy table does not yet describe the app.** It was measured on
   channels a UUSS analyst had already chosen; the noise and clipping gates never fired; and
   14 of the 23 events come from three clusters. The draft page states its result to students
   as fact (M2).
3. **MUST. The draft science page has factual errors.**
   - SGU is a mountain station, 800 m above Gunnison Valley High School, not on valley
     sediment. TMU is on Trail Mountain, 35 km from Mt. Pleasant.
   - UUSS averages station values; it does not take the middle value.
   - Duration is not "how most of Utah's magnitudes are made".
   - The coda does not last longer "because it breaks a bigger patch of fault".
   - The stand-ins are mislabeled: ELU, not TMU, stands in for North Sanpete (M3).
4. **SHOULD. "32 times the energy" and "shakes 1,000 times harder" are overstated for local
   magnitude.** The 32× rule is for Ms or Mw. In Utah one ML step is about 15× in energy for
   small quakes. For the Kanosh pair, the Wood-Anderson swings differ ×14.7 but the vertical
   ground speed only ×10.5 (S1).
5. **SHOULD. A school Shake's calibration will take longer than "about 10 quakes, 1–2
   years".** A Shake needs ML 2.9 at 80–100 km (Anthony et al. 2019); the quakes come from a
   few clusters; and station terms swing ±0.3 with source area. A fairer estimate is 2–4 years,
   with quakes from at least 4–5 areas. SUU's −0.5 vertical is its known faulty channel, not
   ground (S3, S4).

## The seven questions, briefly

| Asked | Short answer | Findings |
| ----- | ------------ | -------- |
| 1. Science against primary sources | Mostly right. The ML and Mc formulas, Richter's table, Uhrhammer and Collins's 2,080, the UUSS station corrections, Koper's and Arabasz's numbers, b-values, the 43% and Hanks and Kanamori all check out. Wrong or overstated: the 2,800 framing, energy per ML step, "shaking" per step, duration physics, mean versus median, SGU's ground | M1, M3, S1, S2, C5 |
| 2. Feasibility numbers | They reproduce (offset +0.060 against P5's +0.06; vertical −0.209; Kanosh ratio; DYFI counts; school counts). But the sample is UUSS-curated and clustered, and the +0.06 is explained right only by luck (two errors cancel) | M2, S2, C1 |
| 3. Teaching | The curve slide is right for Physics and CS classes if the app marks the peaks. The Kanosh pair is a good opener (10 minutes apart, 1.9 km apart). Put only UUSS's ML in Check, and Md and Mw in Why? | S5, S6, C4 |
| 4. Where it lives | Agree: investigation E in Quake Explorer, not a new app and not Quake Locator. 8 session-days is realistic to generous, but a few pieces are not counted | C3 |
| 5. School Shakes | The duration claim holds. The calibration time is optimistic, and SGU and TMU don't show what valley-fill schools will do | S3, S4, M3 |
| 6. Science page | Good plan and placement (after Frequencies; it becomes 8th). Fix the facts in M3 and S1. The worked example should use UUSS's own published amplitudes. ESS.2.6 should be dropped, not "confirmed"; the CS codes need a student-made product | M3, S1, C2, C4 |
| 7. Constraints | No problem found. Only Raspberry Shake documentation was used. The page's credit line needs a little more | C6 |

## Findings

### MUST

#### M1. Wood-Anderson constants: 2,800 with Richter's table reads high; UUSS's damping is 0.8

- **Where:**
  - 2.3, row "Filter": "Its true magnification was 2,080 …; Richter's table assumes the
    nominal 2,800, and UUSS's numbers fit that";
  - 3.2 "Amplitudes" ("about 1.88 × 2,800 … UUSS stores roughly the full peak-to-peak") and
    "Distance correction" ("Richter's table within about 0.15");
  - 3.3: "The +0.06 makes sense" (corrections average −0.07);
  - Appendix A (h = 0.7);
  - the source log's ObsPy entry ("above about 2 Hz the choice does not change the
    amplitude");
  - 7.2 Part 3a ("magnifying the motion about 2,000 times") against its worked example (a
    2,800 simulation).
- **Problem:**
  - Richter's table was built from real instruments that magnified about 2,080, not 2,800. So
    "assumes the nominal 2,800" gets the relation backwards: simulating at 2,800 and using the
    table reads high.
  - UUSS's numbers "fit" 2,800 because its station corrections were fitted to MLs from its own
    paper Wood-Anderson records, which absorbs the gain offset.
  - The unexplained factor 1.88 comes from P5's damping of 0.7. UUSS uses 0.8.
  - The "+0.06 makes sense" explanation is right only by luck: the damping adds +0.03 and
    using the median instead of UUSS's mean removes about 0.04 (S2).
  - On the draft page, "about 2,000 times" disagrees with the 2,800 used in the worked
    example: a teacher who checks it gets 0.13 lower.
- **Evidence:**
  - Uhrhammer and Collins (1990), p. 704: "assuming a static magnification of 2800 … will lead
    to a systematic over estimation of ML by an average of 0.13 ML units". Their measured
    instruments: 2,080 ± 60, 0.800 s, damping 0.69. They recommend 2,080, 0.8 s, 0.7
    (p. 714). <https://ncedc.org/ftp/outgoing/peggy/ML/Uhrhammer_Collins_1990.pdf>
  - IASPEI standard (NMSOP-2 IS 3.3, p. 6): the −2.09 constant "is based on an experimentally
    determined static magnification of the Wood-Anderson of 2080, rather than the theoretical
    magnification of 2800". On p. 14 the offset is frequency dependent, "on average … about
    0.1". <https://gfzpublic.gfz-potsdam.de/pubman/item/item_65142_6/component/file_292577/IS_3.3_rev1.pdf>
  - Pechmann et al. (2007), abstract: station corrections "that minimize differences between
    MLs calculated from paper and synthetic W-A records".
    <https://pubs.usgs.gov/publication/70029992>
  - Re-run on all 1,699 unclipped horizontal channels. UUSS's AML divided by the simulated
    half peak-to-peak:
    - at damping 0.7 it is 5,253 (P5's number), trending with frequency (0.90 of 2 × 2,800
      at 1–1.5 Hz, 0.99 above 4 Hz);
    - at damping 0.8 it is 5,647 = 2 × 2,800 × 1.008, flat with frequency (1.00–1.02), with
      a robust scatter of 0.005 in log10.
    - Gain 2,080 would need a factor of 2.7.
  - Re-run, the distance correction on UUSS's weight-0 channels: station ML − log10(AML in
    mm) − Richter (1958) = −0.301 ± 0.025. Every distance bin from 40 to 700 km has a median of
    −0.293 to −0.303. That is Richter's table exactly, with the stored swing halved. "Within
    about 0.15" came from fitting a smooth curve to a stepped table.
  - Re-run: student recipe at damping 0.7 gives +0.060; at 0.8, +0.028. The implied UUSS
    station corrections average −0.069 (TMU −0.25; the 2006 table says −0.28).
- **Change:**
  - Rewrite the 2.3 row and 3.2: "UUSS simulates Richter's nominal instrument (0.8 s, damping
    0.8, magnification 2,800), stores the full peak-to-peak swing in ComCat (`AML`, meters)
    and halves it. It uses Richter's 1958 table exactly. Real Wood-Andersons magnified about
    2,080, so a 2,800 simulation reads about 0.1 high (Uhrhammer and Collins 1990). UUSS's
    station corrections, fitted to its paper records, take that out."
  - Make M1's `lib/magnitude.js` use damping 0.8 and 2,800, so students' station values line
    up with UUSS's own in the Check. Pin its test to UUSS's AML ÷ 2 for Junction (MTPU
    10.1 mm, FOR1 1.81, CTU 0.149, SGU 8.47), not to our simulation.
  - On the page, keep "about 2,000 times", and give the teacher notes one sentence on why the
    computation uses 2,800.

#### M2. The headline accuracy numbers describe UUSS's chosen channels, not the app

- **Where:** the Summary table ("A group that measures … 1 station 63% … 10 stations 96%");
  3.3; 3.4; 3.8 item 2; 7.2 Part 4 ("With 5 stations, a group lands within 0.3 … about 9 times
  in 10; with 10 stations, nearly always"); 6.2 risk 4.
- **Problem:**
  - Every channel in 3.3–3.4 is one UUSS's analysts had already measured: reviewed,
    unclipped and above noise. The app will load its own stations.
    - Quake Explorer's record section takes one station per distance band, from HH, EH and BH
      channels.
    - It loads verticals only (`docs/app/js/quake-explorer/data.js:55–90`, `config.js:13–18`).
    - Its stations include some that UUSS did not measure for that quake.
  - P5's 3 × noise gate never removed a channel, and `isClipped` flagged none. So trap 4
    (noise) and the clipping gate were never tested on small quakes.
  - The 23 events are not independent. Kanosh (8 events in 3 days), Milford (4) and Junction
    or Leamington (2 each) make up 14. All are central Utah, 2025–2026, M2.1–4.0 plus Magna.
  - The closest test of what the app will see is the bundled Junction sample (24 verticals,
    middle value 0.07 low, spread 0.32). It is one event.
- **Evidence:**
  - Re-run audit: `analyze.mjs:71` (gate: 0 of 1,471 channels fail);
    `run-events.mjs`/`analyze.mjs` select only channels with a UUSS `AML`. The clustering is
    from the event list in the source log.
  - The draft page's sentence is the 3.4 result restated as a general fact.
- **Change:**
  - Before the card or page quotes percentages, re-run 3.4 on the stations Quake Explorer
    actually loads, live, for these events. Add a holdout of about 10 quakes from other areas
    that is used for nothing else:
    - the northern Wasatch Front;
    - the Uinta Basin;
    - southwest Utah;
    - one in the M4–5 range.
  - Until then, the Summary and Part 4 should say "on the stations UUSS uses", or state the
    rule loosely ("with 5 or more good stations, usually within about 0.3").
  - Keep the check script (the review's Appendix B suggestion) so this can be rerun.

#### M3. Factual errors in the draft page and the review text (each cheap to fix)

- **(a) SGU is not on valley sediment, and neither is TMU.**
  - Where: 7.2 Part 4 ("SGU, in the Gunnison Valley … Soft sediment in a valley"); 3.5 ("That
    is the soft-ground effect the H/V figure … shows"); 2.4 trap 3; 5 ("SGU and TMU read
    0.4–0.5 high … A school on valley fill may well do the same").
  - Evidence: EarthScope station metadata, from
    <https://service.earthscope.org/fdsnws/station/1/query?net=UU&sta=SGU,TMU&level=station&format=text>,
    with ground elevations from the USGS elevation point service:
    - **SGU** is "Sterling, UT" at 39.182 N, 111.645 W, elevation 2,357 m: 15 km from
      Gunnison Valley High School (1,563 m) and about 700 m above the town of Sterling
      (1,679 m). It is a broadband station (Trillium Horizon 120).
    - **TMU** is "Trail Mountain (BB)" at 2,731 m, 35 km from Wasatch Academy (1,807 m).
  - Evidence, re-run: SGU's excess varies by source area: Kanosh +0.61, Junction +0.65,
    Milford +0.30, Kenilworth +0.12. UUSS always gives SGU weight 0.
  - Problem: both "high-reading" stand-ins are mountain stations, so soft ground is an
    unsupported explanation. Topography, the rock right under the station or the paths from
    particular source areas are all possible. And they say nothing about schools on valley
    fill.
  - Change: Part 4 should say "SGU reads about half a step high for quakes from the south and
    west; seismologists give such stations a correction". Leave out the cause, or check it
    (H/V with `lib/hv.js`) before naming one. Section 5 should argue the valley-fill risk
    from Olsen et al. (1995) alone, not from SGU and TMU.
- **(b) UUSS averages; it does not take the middle value.**
  - Where: 7.2 Part 5 ("It is the middle of many stations").
  - Evidence:
    - UUSS summary page: "ML determinations from two or more stations are averaged"
      (<https://quake.utah.edu/resources/magnitude-summary/>).
    - Re-run: UUSS's event ML equals the mean of its weighted channel MLs within 0.005 for
      all 23 events; its "station count" is channels ÷ 2.
  - Change: "the average of many stations".
- **(c) Duration is not "how most of Utah's magnitudes are made".**
  - Where: 7.2 Part 3b.
  - Evidence: the review's own 2.1 says below M2, `ml` 1,892 and `md` 1,721; from M2 up,
    446 of 487 are `ml`. Re-run: in that box the preferred types are 2,336 `ml` and 1,761
    `md`.
  - Change: "for about half of the smallest quakes".
- **(d) The coda's length is not "because it breaks a bigger patch of fault".**
  - Where: 7.2 Part 3b.
  - Evidence: Herrmann (1975): "The observed relationship between magnitude and duration is
    shown to be a result of the particular shape of the signal coda as a function of time"
    (<https://doi.org/10.1785/BSSA0650040899>). A small quake's rupture lasts well under a
    second; its coda lasts a minute or more.
  - Change: "A bigger quake starts its coda higher, and the coda dies away at about the same
    rate, so it takes longer to fall to the line."
- **(e) Stand-in labels.**
  - Where: 3.5 table ("TMU (North Sanpete, Wasatch Academy)"; "ELU, WCU, SUU (Juab,
    Millard)"); 2.4 trap 3 ("SGU and TMU, the stand-ins for three of our five schools").
  - Evidence: `docs/app/js/config.js:22–31` (Juab SUU, North Sanpete ELU, Wasatch Academy
    TMU, Gunnison Valley SGU, Millard WCU).
  - Change: TMU is Wasatch Academy's stand-in only; ELU is North Sanpete's. So SGU and TMU
    serve two schools, not three.

### SHOULD

#### S1. Energy and "shaking" per magnitude step are overstated for local magnitude

- **Where:**
  - level 1 ("One step up is 10 times the shaking and about 32 times the energy");
  - 7.2 Part 2 (the table row "Junction, 3.3 → Magna, 5.7: about 250 times … about 4,000
    times", and "A magnitude 6 … shakes 1,000 times harder");
  - 4.2 Predict ("How many times bigger was Magna's shaking?");
  - the source log's Okal entry.
- **Problem:**
  - log E = 1.5 M + 4.8 holds for Ms (Okal) and Mw. It does not hold for ML of small quakes,
    whose ML grows faster than Mw. The page applies "32×" to ML pairs (Kanosh 3.63 and 2.52;
    Junction ML 3.3).
  - It also mixes Junction's ML with Magna's Mw.
  - Only the Wood-Anderson swing at a fixed distance is 10× per ML step. Peak ground speed
    grows less, and for big steps much less.
- **Evidence:**
  - Okal (2019), abstract: "log10 E = 1.5Ms + 11.8"
    (<https://www.earth.northwestern.edu/people/emile/PDF/EAO247.pdf>).
  - Arabasz et al. (2016), Table E-10: M = 0.791 ML + 0.851 for Utah. Energy per ML step is
    then about 10^(1.5 × 0.791) ≈ 15× (derived).
  - Koper et al. (2016): the ML–Mw slope "is less than one".
  - Munafò et al. (2016): below Mw about 4, Mw ≈ (2/3) ML + C
    (<https://www.earth-prints.org/handle/2122/10842>).
  - USGS: "a tenfold increase in measured amplitude as measured on a seismogram"
    (<https://www.usgs.gov/programs/earthquake-hazards/earthquake-magnitude-energy-release-and-shaking-intensity>).
  - Re-run, Kanosh pair at common channels: UUSS Wood-Anderson swings ×14.7; vertical peak
    ground speed (1–10 Hz) ×10.5. The review's own 3.7 fit has a slope of 0.93 per unit, and
    Hanks and Kanamori (1979) put ML's upper limit near 7.
- **Change:**
  - Say "each step makes the swing on Richter's seismograph 10 times taller at the same
    distance", and "about 32 times the energy, for the moment magnitude used for big quakes".
  - Replace "shakes 1,000 times harder" with "its seismograph swing is 1,000 times taller".
  - In the table, use one scale: Magna ML 5.61 against Junction ML 3.30 gives about 200×
    the swing. Give energy as "roughly 2,000–4,000 times", or drop the energy cell.
  - A teacher note can explain why small quakes don't follow the 32× rule.

#### S2. Compare like with like: UUSS takes the mean; the students take the median

- **Where:** 3.1 step 6; 3.3 ("The +0.06 makes sense …"); the Check (4.2, 6.2 risk 1).
- **Problem:** the students' median and UUSS's mean differ for some quakes by as much as the
  "honest target".
  - For Kanosh, the median of UUSS's own weighted channel MLs is 3.73; the official mean is
    3.63.
  - The +0.06 offset breaks down as about +0.03 from the damping (M1) and −0.04 from median
    versus mean, plus the missing corrections (about +0.07).
- **Evidence:** re-run, `t3.out` (per-event mean and median of UUSS's channel MLs); audit
  note 5 (with the mean, P5's offset is +0.096).
- **Change:**
  - Keep the median for students: it is robust and teachable.
  - Have the Check also show the mean of the students' stations, with one line: "UUSS
    averages; a few odd stations move an average more than a middle value."
  - State the decomposition in 3.3.

#### S3. School Shakes: the calibration estimate is optimistic

- **Where:** section 5 ("about 10 quakes (1–2 years)"); Summary; 6.3 item 5.
- **Problem:** the 22–48 counts (M2.5+ within 100 km in five years) treat every quake as
  usable. They are also heavily clustered.
  - Anthony et al. (2019) found that, at a signal-to-noise ratio of 2, a Shake needs ML 2.5
    at 20–40 km and ML 2.9 at 80–100 km. A school building in class hours is likely noisier
    than their test sites (private homes).
  - The re-run confirms the counts: 22–48 and 12–16.
  - The quakes cluster. The April 2026 Kanosh swarm gives each school 4 of its 12–16 M3+
    quakes within 150 km. Millard's three biggest clusters hold 30 of its 48 M2.5+ quakes.
  - Station terms swing by about ±0.3 with source area. TMU, after UUSS's correction, reads
    +0.30 for Kanosh and −0.28 for Milford. So ten quakes from two clusters give a path term,
    not a site term.
- **Evidence:**
  - Anthony et al. (2019), Results; the abstract's "require events of magnitude 0.3 larger"
    is for ML 2–4 at 20–100 km (<https://doi.org/10.1785/0220180251>).
  - Re-run `t7.out` (counts, clusters) and `t46.out` (residuals by source area).
- **Change:** say "10 well-recorded quakes from at least 4–5 source areas; expect 2–4 years".
  Publish the correction with its spread and the areas it came from. The same-place ratio
  (3.7) is the no-calibration path, as the review says.

#### S4. SUU's vertical reads low because of a known channel problem, not the ground

- **Where:** 3.5 table ("SUU … −0.49 (4 quakes)"); section 5's reading of stand-in verticals.
- **Problem:** the review sets SUU's −0.49 beside ELU's and WCU's −0.23 and −0.31 as the usual
  vertical offset.
- **Evidence:** `planning/activities.md` question 9 and D31: SUU's vertical channel "records
  about 10 times weaker than the station's own horizontal channels and its neighbors". The
  re-run gives −0.52.
- **Change:** footnote SUU's vertical as faulty (already reported to UUSS through Dale and
  Cleat). Leave it out of any vertical-offset or school-correction statement until UUSS
  answers.

#### S5. Teaching: say who reads the peaks, and make the curve's "height" concrete

- **Where:** level 2 ("Students read the biggest swing, then slide Richter's distance
  curve"); 4.2 Explore; 6.2 risk 2.
- **Problem:** the review doesn't say whether students click each peak. A full period (the
  cards all budget 45–55 min) can't hold:
  - the opener;
  - 5–10 stations with two horizontals each, picked by hand;
  - the curve;
  - the Check.

  Also, "the curve's height is the magnitude" needs a reading point students can see.
- **Evidence:** the existing Quake Explorer cards (`docs/teachers/how-fast-is-the-rock.md`
  and others: "15 min … or 45–55 min"). Richter's definition is the swing at 100 km
  (Richter 1935, p. 7).
- **Change:**
  - The app finds and marks the half peak-to-peak swing on each simulated Wood-Anderson
    trace. Students check two or three, and may move a mark.
  - Draw a vertical line at 100 km and show "M = 3 + log(swing at 100 km)" as the curve
    moves. That is Richter's own definition, so the slide is the definition, not a trick.
  - Sliding Richter's curve on log-log axes then suits Physics and CS students. For a
    9th-grade Earth science class, who haven't met logarithms (C4), offer the science page's
    table method as the 15-minute path.

#### S6. Teaching: keep Check to one target; move Md and Mw to Why?

- **Where:** level 2 ("Then they check against UUSS"); 4.2 Check ("UUSS's ML, Md and Mw");
  7.2 Part 4 ("All three are right; together they say about 3.8").
- **Problem:**
  - Three official numbers in the Check invite "which one did we get wrong?".
  - "Together they say about 3.8" averages across scales and doesn't match ComCat's headline
    (ML 3.63) for Kanosh.
  - Most small quakes have no Mw. For the Kanosh and West Valley City quakes it is a
    non-preferred coda Mw (method LLNLCCT).
  - New quakes may not have UUSS's phase-data file yet.
- **Evidence:** re-run `t5.out` (all magnitudes on the two events; 9 of 53 M3+ events carry a
  non-preferred LLNLCCT Mw).
- **Change:**
  - Check against UUSS's ML, and UUSS's own station values beside the students'. Show Md and
    Mw in Why? as "other methods, which agree within about 0.3".
  - Replace "All three are right; together they say about 3.8" with "Each is a measurement
    with its own uncertainty; together they say the quake was about 3.6 to 3.9".
  - When phase-data is missing, the Check falls back to the event magnitude and says so.

#### S7. The Kanosh opener: get the details right

- **Where:** level 1; 3.7; 7.2 Part 2 Predict ("measured middle value over 52 stations"); 7.3
  G1 and 7.5 ("Without M1, G1 can use plain ground speed (the Kanosh ratio is nearly the
  same)").
- **Problem and evidence (re-run):**
  - The pair is a good choice: the M2.52 came 10.0 minutes after the M3.63, 1.9 km away (depth
    8.1 against 4.1 km), just past the big one's coda.
  - The 52 are channels at 26 stations, not 52 stations.
  - The swing ratio is ×14.7 (sd 0.11 in log10). It is 1.06 in log10 under 100 km and 1.20
    beyond, so the station choice matters.
  - With plain vertical ground speed the ratio is ×10.5, not 13–15.
- **Change:**
  - Correct "52 stations".
  - For G1, choose a station at 100–150 km. If it is drawn in ground speed, say "about 10
    times".
  - In the app, show both traces at the same scale first (the small one looks flat), then
    magnify the small one ×10, so the ratio is seen, not computed.

### CONSIDER

#### C1. The vertical option is a little better than reported

- **Where:** 3.3 and its summary row "Ours, verticals only: … spread 0.10, worst 0.28"; 4.2
  "The catch: horizontals"; question 2 for Gus.
- **Evidence:**
  - Re-run audit, note 2: P5's scripts dropped every vertical channel that also had a UUSS
    coda duration, 330 of 861 (`run-events.mjs:49–53`, `analyze.mjs:73`, `subsets.mjs:15`).
    With all of them, the event-to-event spread of the vertical recipe is 0.053, not 0.105;
    the mean is unchanged (−0.13).
  - The +0.21 vertical correction is not circular in practice: leave-one-event-out gives
    0.206–0.213. Per-event medians run 0.12–0.28.
- **Change:**
  - Correct the row.
  - For question 2, say that verticals + 0.2 do about as well event by event. Horizontals win
    on authenticity, and on station-by-station comparison with UUSS's horizontal values.
  - Note the cost of horizontals: `loadRecordSection` loads only `channels[0]`.

#### C2. The worked example: use UUSS's published amplitudes and the table's own rows

- **Where:** 7.2 Part 3a table.
- **Problem:**
  - The four swings are our simulation at damping 0.7, 5–9% above UUSS's own. Re-run: MTPU
    11.0 against UUSS's 10.1 mm; FOR1 1.89 against 1.81; CTU 0.162 against 0.149; SGU 8.90
    against 8.47.
  - The "From Richter's table" values (2.06, 2.85, 3.88, 3.08) are interpolated to two
    decimals, but the page shows only a 6–8-row excerpt.
  - CTU is not in the offline `qe-junction` sample (its ABOUT file), so E can't reproduce
    that row offline.
  - "+0.7" is called "almost a whole step".
- **Change:**
  - Use UUSS's AML ÷ 2 values, which teachers can check on ComCat.
  - Use the 1958 rows: 30 km 2.1, 70 km 2.8, 110 km 3.1, 270 km 3.9
    (<https://ncedc.org/ftp/outgoing/peggy/ML/Uhrhammer_1996.pdf>, Table 4). The rounded
    answers don't change (3.1, 3.1, 3.1, 4.0).
  - Pick a far station that is in the sample, or say that CTU isn't.
  - Write "most of a step too big".

#### C3. Effort and home: agree with E, but add the pieces that aren't counted

- **Where:** 4.2, 6.1.
- **Assessment:** E in Quake Explorer is the right home. It has the record section, the
  samples and the Predict · Explore · Why? · Check frame; the tabs wrap (`.qe-tabs`
  flex-wrap), so a fifth tab fits at phone width. The core estimate of about 8 days is
  realistic to generous by this repo's record: D2-plots built a whole real-data science page,
  seven library modules and figures in about a day (D31).
- **Not counted, or counted only implicitly:**
  - a two-event view and data path for the opener (Quake Explorer loads one event per
    investigation);
  - horizontals in `loadRecordSection`, which today loads `channels[0]` only (`data.js:66`);
  - reading `AML` and station magnitudes (today `parseQuakeMLPicks` reads picks only,
    `lib/fdsn.js:167`);
  - the fallback when phase-data is missing (S6);
  - for the optional M6 duration step, new samples of about 7 minutes, since samples end
    110 s after the origin.
- **Change:** list these in M1–M3. The real risk is scope (five levels), not code: keep E to
  levels 1, 2 and the Why? of level 5.

#### C4. Standards: drop ESS.2.6; give the CS codes something students make

- **Where:** section 1 (levels 3–5); 6.3 item 6; 7.4.
- **Evidence:** USBE SEEd (June 2023 edition),
  <https://www.schools.utah.gov/curr/science/_science_/UtahSEEdStandards.pdf>; Utah CS 6–12,
  <https://schools.utah.gov/cte/_cte/computer/612ComputerScienceStandards.pdf>.
  - ESS.2.6 is "Evaluate design solutions that reduce the effects of natural disasters on
    humans". It doesn't fit magnitude, and for E14 only if students judge solutions.
  - ESS.4.1 ("… the occurrence of natural hazards … affect human activity") and PHYS.2.1
    ("track and calculate the transfer of energy within a system") fit as proposed.
  - CS 9/10.DA.3 is "Create data visualizations …"; 11/12.DA.1 is "Refine or create
    computational artifacts …". Both are about making something. Reading a page or dragging a
    given curve doesn't meet them.
  - Logarithms are first taught in Secondary Math III (MVP Module 2, F.LE.4), usually grade
    11.
- **Change:**
  - Drop ESS.2.6 from E11 rather than "confirm" it.
  - Keep a making step for the CS codes. E11's original "fit how fast it fades", or computing
    SGU's correction from several quakes from the CSV, would do. On the page, tie the CS codes
    to a Try it question that does this.
  - Note the logarithm prerequisite in the card's "At a glance" box.

#### C5. Smaller accuracy and source-log fixes

- 3.2: "within about 0.15" → "exactly (offset −0.301 ± 0.025 at every distance)" (M1).
- 2.1: "no `mw` from UUSS in this period" → "no preferred `mw`". 9 of the 53 M3+ events carry
  a non-preferred coda Mw (LLNLCCT), like the Kanosh and West Valley City values in 2.2. The
  box (36.5–42.5 N, 114.5–108.5 W) is all of Utah, not "central Utah". West Valley City also
  has a UUSS moment tensor (about Mw 3.6) and a US Mwr 3.5.
- 3.3 summary row "UUSS's own station MLs (with its corrections)": it includes weight-0
  channels, which have no correction. Weighted only, the spread is 0.23, not 0.27. That
  affects the "0.17–0.39" range students would be shown.
- 3.7 same-place table: say which way the differences are signed. Kanosh is given as positive
  and Junction as negative, so the "errors" read in opposite senses.
- Source log:
  - Whidden and Pankow filter 10–20 s for ML < 4.5 and 20–50 s for ML ≥ 4.5 (not "10–50 s").
  - Anthony et al.'s two pairs belong to different subsets: ML ≥ 2.0 gives −0.25 ± 0.42
    against −0.30 ± 0.32; ML ≥ 3.0 gives −0.36 ± 0.34 against −0.33 ± 0.30. Both are median
    misfits.
  - Richter's 1935 Table I starts at 25 km, at 1.65 against the 1958 table's 1.9. Don't mix
    them.
  - The classroom formula has a readable source: Louie's UNR page calls it "the equation
    behind this nomogram, used by Richter in Southern California"
    (<https://sites.google.com/view/louie-class-geol100/richter-magnitude>).
  - The ObsPy note's "above about 2 Hz" is too strong: between 2 and 4 Hz the two dampings
    differ by 5–7%.
- Raspberry Shake noise:
  - The specification's "0.08 µm/s RMS from 1 to 20 Hz" is printed on the digitizer
    dynamic-range line (RS1D V7+). Self-noise is given only as a figure, and the RS3D's line
    is 0.03 µm/s.
  - The conclusion still holds: Gaussian noise of 0.08 µm/s RMS has a mean absolute value
    of about 0.064 µm/s, about 4 times UUSS's 0.017 line.
  - A good fact for the page: UUSS set that line at "the estimated median noise level for
    short-period analog-telemetry stations" (UUSS summary page).
- Draft page wording:
  - "Today no one owns a Wood-Anderson": Berkeley ran them until 1994 and keeps one on display
    (<https://earthquakes.berkeley.edu/history>). Say "no network uses one now".
  - "A meter for a great one": a magnitude 6 at 100 km would swing about 1 m. Bigger quakes
    stop growing on this scale (Part 5).
  - "The Junction quake was not gentler": no felt data show that. Say "far fewer people live
    near Junction".
  - 4.2's Predict "Magna was M5.7, Junction M3.3" compares Mw with ML, and Magna's near
    stations clipped. Use ML 5.61 against 3.30 (about 200×), or say why it can't be checked
    station by station.

#### C6. Constraints: no problems; finish the page's credit line

- **No Raspberry Shake data:** only documentation was used (the specification sheet, and
  Anthony et al. hosted on the manual site; cite its DOI as the primary source). Section 5
  rightly rules out their FDSN station service (constraint 1).
- **Privacy:** nothing new. Predictions stay in `localStorage` (D22), and DYFI counts are
  aggregates.
- **Attribution (constraint 5):**
  - The page's short credit should name UU (doi:10.7914/SN/UU), and US
    (doi:10.7914/SN/US) or C0 if any figure uses those channels.
  - It should name UUSS's amplitudes and magnitudes via USGS ComCat, and USGS "Did You Feel
    It?" for the counts.
  - Richter's table excerpt, the DYFI counts and any compiled event list (G4, G7) go in a
    source log, with data files and their provenance.

## What the review gets right

- **Reproduced:**
  - the main numbers (offset +0.060, single-station spread 0.33, vertical −0.209);
  - the sensitivity-only result (median 0.003 in log10);
  - the DYFI counts, Magna's magnitudes and the school seismicity counts.
- **Checked against UUSS's own data:** reproducing UUSS's station Md values exactly, and
  showing that UUSS still uses the 2006 equations. Both are real findings.
- **Right calls:**
  - rejecting the classroom formula;
  - the clipping and short-period traps at Magna;
  - same-place ratios as the no-calibration path;
  - duration as an optional step;
  - the science page first, with the filter written once in `lib/`;
  - no separate app.
- **The source log** is unusually honest about what was read in full and what wasn't.

## Verdict

The recommendation stands. Build investigation E in Quake Explorer and the science page
first, keep duration optional, and build no separate app. The data support teaching ML to
within about 0.3 from 5–10 good stations.

Before the page or the card is written:
- correct the Wood-Anderson science and use UUSS's constants (M1);
- re-run the accuracy check on the stations the app will really load, with a holdout of
  other quakes, before quoting percentages to students (M2);
- fix the draft page's facts, above all SGU's "soft ground" (M3), and the energy and shaking
  wording (S1).

None of these changes the decision; all of them change what students would read.
