# Sources for the magnitude review

Session P5-magnitude-review's log of where each outside fact in `planning/review-magnitude.md`
comes from (Gus, D28: sources go in a log in `planning/`, not on student or teacher pages).
Accessed 2026-11-25 unless noted. **Read** says how much of each source was read:

- **full**: the full text;
- **abstract**: the abstract or catalog record only;
- **secondary**: a reproduction or a later paper quoting it;
- **index**: only a search engine's text of it (weakest; named so a critic can check it).

Two research helpers (subagents of this session) found and read most of the papers; I re-read
the UUSS summary page myself and spot-checked their quotes of Arabasz et al. 2016, Koper et
al. 2016 and Whidden and Pankow 2012 in the text they extracted. The feasibility numbers are
my own computation (review section 3).

**Version 2** (2026-11-25, after critiques R3 and R4): a third helper rechecked every source
the critics raised against the primary text (copies in this session's scratchpad, `src2/`).
I checked its four most consequential findings myself: the Raspberry Shake table row (on the
rendered page), Koper et al.'s two sentences on duration magnitudes, Uhrhammer and Collins's
recommendation (p. 713) and Richter's table rows. A fourth helper (Fable) ran the
out-of-sample check; I recomputed its headline from its per-quake files. Entries changed in
version 2 say so.

## UUSS magnitudes (Utah)

- **UUSS magnitude summary.** Pechmann, J. C., S. J. Nava, J. C. Bernier, F. M. Terra and
  R. Burlacu (2006), *Summary of UUSS Magnitude Determinations 1981–2006*, University of Utah
  Seismograph Stations web page, <https://quake.utah.edu/resources/magnitude-summary/>. Read:
  full (fetched and searched by me). Supports:
  - ML = log A − log A0 + S; A = "the mean of half the maximum peak-to-peak amplitudes …
    measured on the two horizontal-component W-A records"; station values averaged;
  - log A0 from Richter (1958, pp. 340–345), "adequate for use in the region spanned by the
    UUSS regional seismic network" (Pechmann et al. 2000, 2007);
  - synthetic Wood-Anderson records following Bakun et al. (1978) and Kanamori and Jennings
    (1978);
  - Table 1 station corrections, −0.55 (TCU) to +0.21 (KNB); TMU (and TM2) −0.28 since
    2003-07-01; MPU +0.20; SRU −0.35; CTU +0.10;
  - Mc = −2.25 + 2.32 log τ + 0.0023 Δ (Utah, since 2002); τ from the P onset until the
    average absolute ground velocity falls below 0.01724 µm/s, on short-period vertical
    sensors; ML is preferred but "cannot be determined for most of the smaller earthquakes".
  - **Added in version 2** (quotes checked by the source helper; the page is plain HTML):
    - averaging: "Currently, ML determinations from two or more stations are averaged to
      obtain the ML value for an earthquake";
    - the noise line: "The threshold of 0.01724 microns/sec in the new τ definition is the
      estimated median noise level for short-period analog-telemetry stations in the
      University of Utah regional seismic network (as of August 1, 2000)";
    - "The equations for the MC calculations are calibrated against ML in order to achieve
      consistency in the two different size estimates"; Mc calibrated on 923 quakes of ML
      0.5–4.7 (1983–2001), applicable for 0.5 ≤ ML ≤ 5; durations above ML 5 underestimated
      because of trigger record lengths;
    - station corrections (Table 1, "From Pechmann et al. (2007)") are relative to station DUG
      and "minimize differences between MLs calculated from different stations and from paper
      and synthetic W-A records"; Mc has no station term, only a gain correction;
    - the page does **not** state its synthetic Wood-Anderson constants, and it cites Richter
      (1958) pp. 340–345 without printing the table (R4 said it "gives the formula and distance
      table"; it gives the formula and the citation).
  - Caveat: the page describes practice up to 2006. UUSS has used AQMS since 2012 (Voyles et
    al. 2020). Review section 3 checks that today's published numbers still follow it.
- **Pechmann, J. C., S. J. Nava, F. M. Terra and J. C. Bernier (2007)**, Local magnitude
  determinations for Intermountain Seismic Belt earthquakes from broadband digital data,
  *BSSA* 97(2), 557–574. Read: abstract
  (<https://www.usgs.gov/publications/local-magnitude-determinations-intermountain-seismic-belt-earthquakes-broadband>);
  the paper is paywalled and no open copy was found. doi:10.1785/0120060114. Supports: "we
  determined empirical ML station corrections that minimize differences between MLs calculated
  from paper and synthetic W-A records"; Richter's (1958) corrections, "in use at UUSS since
  1962", give "ML values that do not show any significant distance dependence"; a 30-s window
  from 5 s before the predicted Sg time. Nothing on the synthetic constants. (R3 cited
  <https://pubs.usgs.gov/publication/70029992>, which truncates the abstract before the quoted
  phrase; use the usgs.gov page above.)
- **Koper, K. D., J. C. Pechmann, R. Burlacu, K. L. Pankow, J. Stein, J. M. Hale, P. Roberson
  and M. K. McCarter (2016)**, Magnitude-based discrimination of man-made seismic events from
  naturally occurring earthquakes in Utah, USA, *GRL* 43, 10,638–10,645,
  doi:10.1002/2016GL070742. Open copy: <https://stacks.cdc.gov/view/cdc/207664/cdc_207664_DS1.pdf>.
  Read: full. Supports: the Mc equation and its 2-s average-amplitude windows; Mc calibrated to
  ML by orthogonal regression (9,037 observations, 923 quakes); ML − Mc averages +0.048 outside
  the coal-mining areas and −0.388 inside them (6,846 events, 1982–2016). Added in version 2
  (checked by me in the text): the ML–MW relation's slope "is less than one [Arabasz et al.,
  2016]"; coda shapes are fit to the average absolute amplitude "in overlapping 2 s time
  windows (shifted in 1 s increments)"; "Nearly all of the events in the UUSS catalog are
  assigned a magnitude based on total signal duration", and the share with an ML has been
  "about 50%" since 2013 (pp. 10,639–10,640). These refine R3 M3c (review 7.2 Part 3b).
- **Voyles, J. R., M. M. Holt, J. M. Hale, K. D. Koper, R. Burlacu and D. J. A. Chambers
  (2020)**, A new catalog of explosion source parameters in the Utah region with application to
  ML–MC-based depth discrimination at local distances, *SRL* 91(1), 222–236. Open copy:
  <https://stacks.cdc.gov/view/cdc/227941/cdc_227941_DS1.pdf>. Read: full. Supports: ML from
  the horizontal channels of broadband stations with an emulated Wood-Anderson and calibrated
  station corrections; UUSS on AQMS since 2012-10-01; a station Mc more than 0.8 from the event
  value is discarded.
- **Holt, M. M., K. D. Koper, W. Yeck, S.-J. Chu and K. L. Pankow (2019)**, On the portability
  of ML − Mc as a depth discriminant for small seismic events recorded at local distances,
  *BSSA* 109(5), 1661–1673. Read: abstract. Supports: ML − Mc grows with depth (Yellowstone).
  Background only.
- **Holt, M. M., J. C. Pechmann and K. D. Koper (2022)**, *BSSA* 112(2), 905–920,
  doi:10.1785/0120210240. Read: abstract. Supports: a 2022 ML recalibration for
  **Yellowstone only**; no later Utah-region recalibration was found.
- **Whidden, K. M., and K. L. Pankow (2012)**, A catalog of regional moment tensors in Utah from
  1998 to 2011, *SRL* 83(5), 775–783. UUSS copy:
  <https://uuss-website-files.s3.us-east-1.amazonaws.com/momentTensorCatalogs/WhiddenPankow_2012.pdf>.
  Read: full. Supports: moment tensors attempted for ML ≥ 3.5, filtered 10–20 s for ML < 4.5
  and 20–50 s for ML ≥ 4.5 (version 1 said "10–50 s"; R3 C5); Mw against ML "shows little
  systematic bias", standard deviation 0.2 for Mw 3.2–4.6. (The review prompt gave 2016; the
  paper is 2012.)
- **UUSS moment tensor table** `MTtable_20260730`,
  <https://uuss-website-files.s3.us-east-1.amazonaws.com/momentTensorCatalogs/MTtable_20260730-web.htm>.
  Read: full. Supports: Mw − ML by ML range (112 Utah-region events, 1998–2026, isotropic part
  ≤ 10%): +0.15 below 3.5, +0.06 at 3.5–4, −0.12 at 4–4.5, −0.27 at 4.5 and up. The research
  helper computed this from the table; I did not recompute it.
- **Arabasz, W. J., J. C. Pechmann and R. Burlacu (2016)**, A uniform moment magnitude
  earthquake catalog and background seismicity rates for the Wasatch Front and surrounding Utah
  region, Appendix E in Working Group on Utah Earthquake Probabilities, Utah Geological Survey
  Miscellaneous Publication 16-3,
  <https://quake.utah.edu/wp-content/uploads/2024/10/Appendix_E_FINAL_31Mar2016.pdf>. Read:
  full (equations checked by me in the extracted text). Supports: M = 0.791 ML(UU) + 0.851
  (σ 0.139, 65 pairs); M = 0.929 MC(UU) + 0.227 (σ 0.225, 63 pairs); b = 1.06 ± 0.06 (Wasatch
  Front region) and 1.07 ± 0.04 (Utah region); M ≥ 5 background quakes about once per 25 years
  (Wasatch Front region) and once per 11 years (Utah region).
- **Holt, J., K. M. Whidden, K. D. Koper, K. L. Pankow, J. C. Pechmann, et al. (2021)**, Toward
  robust and routine determination of Mw for small
  earthquakes: application to the 2020 Mw 5.7 Magna, Utah, seismic sequence, *SRL* 92(2A),
  725–740, doi:10.1785/0220200320. Accepted manuscript: <https://www.osti.gov/servlets/purl/1797553>.
  Read: full. Supports: coda-based and direct-wave Mw agree; UUSS Mw for the sequence 3.40 to
  5.54.
- **Pankow, K. L., et al. (2021)**, Responding to the 2020 Magna, Utah, earthquake sequence
  during the COVID-19 pandemic shutdown, *SRL* 92 (issue given as 92(1) by Crossref and 92(2A)
  by UUSS). Read: abstract. No clipping details found in what was read.
- **USGS WGUEP fact sheet 2016-3019**, doi:10.3133/fs20163019,
  <https://ugspub.nr.utah.gov/publications/united_states_geological_survey/fact_sheet/USGS_fs2016-3019.pdf>.
  Read: full. Supports: 43% chance of M ≥ 6.75 in the Wasatch Front region in 50 years (57% for
  M ≥ 6.0).

## Event data used in the feasibility check (section 3)

- **USGS ComCat event service**, <https://earthquake.usgs.gov/fdsnws/event/1/query>, and each
  event's UUSS `phase-data` product (QuakeML). Read: full (machine). Supports: event locations
  and preferred magnitudes; UUSS network magnitudes (Ml, method `RichterMl2`; Md, method
  `HypoinvMd`; Mw where given); every channel's Wood-Anderson amplitude (`AML`, in m), coda
  duration (`END`, s, referenced to the P pick), station magnitudes and weights; analyst
  picks. Events: uu60363602 (Magna), uu80131546, uu80137106, uu80129556, uu80162166,
  uu80156586, uu80138736, uu80158051, uu80114836, uu80130416, uu80120191, uu80161881, and the
  same-place sets uu80137056, uu80137836, uu80136966, uu80136971, uu80137331, uu80137126,
  uu80137201 (Kanosh), uu80163521, uu80165416, uu80163431 (Milford), uu80162171 (Junction).
  Magna's numbers: UUSS phase-data QuakeML version of 2021-03-12 (Mw 5.7 "HAND", ML 5.61 from
  17 stations, Md 5.67 from 12; its moment tensor 2.316e17 N·m, Mw 5.54).
- **ComCat magnitude types, catalog=uu**, a box covering all of Utah (36.5–42.5° N,
  114.5–108.5° W; version 1 wrongly called it central Utah), M ≥ 1, 2025-01-01 to 2026-11-24
  (4,097 events) and M ≥ 3 since 2010. Read: full (machine; research helper's query, rerun by
  R3). Supports the `ml`/`md` counts in section 2.1: preferred types 2,336 `ml` and 1,761 `md`
  (R3's rerun); 9 of the 53 M ≥ 3 events carry a non-preferred coda Mw (method `LLNLCCT`) in
  their phase-data (R3's rerun, `t5.out`).
- **West Valley City's moment tensors** (ComCat `moment-tensor` products for uu80129556,
  read by R3's rerun): UUSS's, scalar moment 3.069e14 N·m, which is Mw 3.6 by Hanks and
  Kanamori (my arithmetic); USGS Mwr 3.5 (moment 2.43e14 N·m).
- **Station metadata for SGU and TMU**, EarthScope FDSN station service,
  <https://service.earthscope.org/fdsnws/station/1/query?net=UU&sta=SGU,TMU&level=station&format=text>,
  with ground elevations near the schools from the USGS elevation point query service (both
  as read by R3, 2026-11-25). Supports: SGU "Sterling, UT", 39.182 N, 111.645 W, 2,357 m, a
  broadband (Trillium Horizon 120), 15 km from Gunnison Valley High School (1,563 m) and about
  700 m above Sterling (1,679 m); TMU "Trail Mountain (BB)", 2,731 m, 35 km from Wasatch
  Academy (1,807 m).
- **R3's independent rerun** (`planning/critique-r3-claude.md`; scripts and outputs copied
  from R3's scratchpad into this session's scratchpad, `r3rerun/`). Supports the numbers the
  review credits to R3: the per-source-area residuals of SGU and TMU (`t46.out`), the school
  seismicity counts and clusters (`t7.out`), UUSS's event ML as the mean of weighted channels
  (`t3.out`), and the stand-ins at damping 0.8 (`main.out`).
- **Quake Explorer's station selection** (`docs/app/js/quake-explorer/data.js`
  `loadRecordSection`, `docs/app/js/lib/stations.js` `selectRecordSection`), run in node through
  `tools/quake-explorer/node-setup.mjs`. Supports set B (review 3.1).
- **The holdout (set C), version 2.** ComCat event service and each event's UUSS phase-data,
  chosen by `oos/select-holdout.mjs` from the catalog alone; rule and list in
  `oos/holdout-events.md` (this session's scratchpad), written at 14:17 on 2026-11-25, before
  the first holdout waveform was read (14:19). Events: uu80068651 (Thatcher), uu80127041
  (Garden), uu80117176 (Maeser), uu60555582 and uu80136961 (Kanarraville), uu80059666 (Elmo),
  uu60490147 (Sunnyside), uu60500212 (Thompson Springs), uu80140161 (Bennington, Idaho),
  uu60525337 (Taylor, Wyoming). Waveforms and metadata as above (UU via EarthScope).
- **The phase-data availability count** (review 2.1): ComCat event service, the 60 most recent
  M ≥ 2.5 events in 36.9–42.1 N, 114.1–109.0 W (2026-04-21 to 2026-11-19), and each event's
  product list and `phase-data` QuakeML (`oos/live-check.mjs`, output `oos/out/live-check.txt`).
  The "delay" is to each product's last update, so an upper bound.
- **Junction worked example and the Kanosh opener station** (review 7.2, 3.7): UUSS's `AML`
  values from the uu80162166 phase-data (MTPU, FOR1, HLJ, SGU, CTU, BGU) and our damping-0.8
  measurements of the Kanosh pair (uu80137106, uu80137126) at MMU, TMU and WPUT, in
  `oos/RESULTS.md`, tasks 5 and 6.
- **Waveforms and station metadata:** University of Utah Regional Seismic Network (network UU,
  doi:10.7914/SN/UU), and for a few channels network US (doi:10.7914/SN/US) and C0, via
  EarthScope FDSN `dataselect` and `station` (StationXML with full response),
  <https://service.earthscope.org/fdsnws/>. Supports the measured amplitudes, durations and
  peak speeds, and the instrument responses.
- **The bundled Quake Explorer samples** (`docs/app/data/samples/qe-*`), made 2026-11-24 from
  the same services (their ABOUT files).

## General magnitude science

- **Richter, C. F. (1935)**, An instrumental earthquake magnitude scale, *BSSA* 25(1), 1–32,
  <https://ncedc.org/ftp/outgoing/peggy/ML/Richter_1935.pdf>. Read: full, pp. 1–7. Supports:
  the definition (log of the maximum trace amplitude in microns at 100 km on the standard
  torsion seismometer: T0 0.8 s, magnification 2,800, damping 0.8) and Table I (the 1935
  distance corrections).
- **Richter, C. F. (1958)**, *Elementary Seismology*, W. H. Freeman, Table 22-1 (p. 342).
  Read: secondary, as reproduced in Uhrhammer, R. A., S. J. Loper and B. Romanowicz (1996),
  *BSSA* 86(5), 1314–1330, Table 4, <https://ncedc.org/ftp/outgoing/peggy/ML/Uhrhammer_1996.pdf>.
  Supports the −log A0 values used in section 3 (0 km 1.4; 10 km 1.5; 20 km 1.7; 30 km 2.1;
  40 km 2.4; 50 km 2.6; 60 km 2.8; 80 km 2.9; 100 km 3.0; 150 km 3.3; 200 km 3.5; 250 km 3.8;
  300 km 4.0; 400 km 4.5; 500 km 4.7; 600 km 4.9), linear between rows; A in mm on a
  2,800-magnification Wood-Anderson; epicentral distance. The worked example's rows (30 km
  2.1, 70 km 2.8, 110 km 3.1, 270 km 3.9) are R3's reading of the same table. Checked in version 2 against a second, independent reproduction: Bormann, P. (2012), Data sheet DS 3.1, *New Manual of Seismological Observatory Practice 2*, Table 1, "according to Richter (1958)", doi:10.2312/GFZ.NMSOP-2_DS_3.1, <https://gfzpublic.gfz.de/pubman/item/item_43489_6/component/file_56102/DS_3.1_rev1.pdf> (read: full, by the source helper; it also lists Utah as "−logA0 (Richter, 1958) + S" after Pechmann et al. 2007). The two agree at all 36 distances they share; all 16 rows above and R3's four rows are right. Uhrhammer et al. list a row every 5 km to 70 km, then 80–100 km by 5 km, then every 10 km to 600 km (no 75 km row); the full list is in review Appendix A. Straight lines between our 16 rows differ from the full table by up to 0.05 within 300 km. No scan of Richter (1958) itself was read.
  - Version 1 said the values were "checked against Richter (1935) Table I". That table is
    different (it starts at 25 km, at 1.65 against the 1958 table's 1.9; R3 C5), so the two
    are not mixed any more.
  - A separate check: with these rows, UUSS's weight-0 channels give −0.301 ± 0.025 at every
    distance band (review 3.2), so the rows and the interpolation reproduce UUSS's own
    distance correction.
- **Uhrhammer, R. A., and E. R. Collins (1990)**, Synthesis of Wood-Anderson seismograms from
  broadband digital records, *BSSA* 80(3), 702–716,
  <https://ncedc.org/ftp/outgoing/peggy/ML/Uhrhammer_Collins_1990.pdf>. Read: full, pp. 702–703
  (version 1); pp. 704 and 713 added in version 2 (source helper; p. 713 checked by me).
  Supports:
  - nominal constants (p. 702): magnification 2,800, period 0.8 s, damping 0.8;
  - measured (p. 703): "a Vs of 2080 ± 60, a Ts of 0.800 sec ± 0.018 sec, and an h of
    0.69 ± 0.023 critical" (four instruments; p. 704 rounds the damping to 0.70);
  - p. 704: "assuming a static magnification of 2800 (as has been common practice, e.g. …
    Kanamori and Jennings, 1978 …) will lead to a systematic over estimation of ML by an average
    of 0.13 ML units"; damping 0.70 instead of 0.8 gives "a maximum ML bias of +0.06";
  - p. 713 (R3 said p. 714): "we recommend that Vs = 2080, Ts = 0.8 sec, and h = 0.7 critical be
    used"; and synthetic records under 30 km not be used for routine ML.
- **Hutton, L. K., and D. M. Boore (1987)**, The ML scale in southern California, *BSSA* 77(6),
  2074–2094. Read: index only (the PDF site's certificate failed) and secondary (Luckett et al.
  2019). Supports: −log A0 = 1.110 log(r/100) + 0.00189 (r − 100) + 3.0, hypocentral r.
- **Bormann, P., and J. W. Dewey (2012)**, The new IASPEI standards for determining magnitudes
  from digital data and their relation to classical magnitudes, Information Sheet IS 3.3,
  *NMSOP-2*, doi:10.2312/GFZ.NMSOP-2_IS_3.3,
  <https://gfzpublic.gfz-potsdam.de/pubman/item/item_65142_6/component/file_292577/IS_3.3_rev1.pdf>.
  Read: full by the source helper (version 2). Supports: p. 6, "The constant term in equation
  (1), -2.09, is based on an experimentally determined static magnification of the
  Wood-Anderson of 2080, rather than the theoretical magnification of 2800"; p. 14, log(2800 /
  2080) = 0.13; p. 15 (R3 said p. 14), the real offset is "frequency-dependent and on average
  for frequencies at which ML is typically measured, about 0.1 m.u.".
- **IASPEI standard ML** (magnitude working group summary, 27 March 2013): ML = log10 A +
  1.11 log10 R + 0.00189 R − 2.09, A in nm of simulated Wood-Anderson ground displacement
  (output ÷ 2,080), R hypocentral. Read: secondary (iaspei.org failed): Anthony et al. (2019),
  section 7, and Luckett, R., L. Ottemöller, A. Butcher and B. Baptie (2019), *GJI* 216,
  1145–1156, accepted manuscript <https://nora.nerc.ac.uk/id/eprint/521972/1/luckett_ml_short_distances_v3.pdf>,
  eq. 2 (full).
- **ObsPy's Wood-Anderson** (`obspy.signal.invsim`),
  <https://docs.obspy.org/_modules/obspy/signal/invsim.html>. Read: full. Supports: poles
  −6.283 ± 4.712i (0.8 s, damping 0.8), sensitivity 2,080, citing NMSOP (Bormann 2002).
  Version 1's scripts used damping 0.7 and said "above about 2 Hz the choice does not change
  the amplitude". That was too strong: between 2 and 4 Hz the two dampings differ by 5–7%
  (R3 C5), and version 2 uses 0.8.
- **The classroom formula ML = log A + 3 log(8 Δt) − 2.92.** Source: John Louie, University of
  Nevada, Reno, GEOL 100 course page "Richter magnitude",
  <https://sites.google.com/view/louie-class-geol100/richter-magnitude>, which calls it "the
  equation behind this nomogram, used by Richter in Southern California". Read: full (version 2,
  source helper); the page says the nomogram "was hanging on the wall of the Caltech Seismo Lab
  in the 1980s" and cites no primary publication, so the formula's source is still a course
  page, not a paper. It also appears on a blog
  (<https://samjshah.com/2008/07/30/earthquakes-richter-scale-and-logarithms/>, read). The
  research helper's check against Richter's table: 3.08 at 100 km (Richter 3.0) but 4.14 at 225
  km (3.68). Section 3 measures it on Utah data (+0.26 at damping 0.8).
- **Nomogram classroom activities:** CSULB lab, <https://home.csulb.edu/~rodrigue/geog558/labs/nomogram.html>
  (full); Virtual Earthquake, <https://sciencecourseware.org/VirtualEarthquake> (full);
  IRIS/EarthScope animation "Magnitude Explained", <https://www.iris.edu/hq/inclass/animation/205>
  (full); a School of the Future lesson in which students calibrate ML for their own school
  seismometer from catalog quakes,
  <https://www.schoolofthefuture.eu/sites/default/files/how_to_estimate_the_magnitude_of_an_earthquake_english.pdf>
  (full). Models for the activity design only.
- **Duration magnitude, general.** Lee, W. H. K., R. E. Bennett and K. L. Meagher (1972), *A
  method of estimating magnitude of local earthquakes from signal duration*, USGS Open-File
  Report 72-223, doi:10.3133/ofr72223. Read: index only for the formula M = −0.87 +
  2.00 log τ + 0.0035 Δ. Background only; the review uses UUSS's own equation.
- **Energy.** Okal, E. A. (2019), Energy and magnitude: a historical perspective, *Pure Appl.
  Geophys.* 176, 3815–3849, doi:10.1007/s00024-018-1994-7,
  <https://www.earth.northwestern.edu/people/emile/PDF/EAO247.pdf>. Read: full. Supports:
  log10 E = 1.5 **Ms** + 11.8 (ergs), the "Gutenberg–Richter energy–magnitude relationship"
  (abstract), i.e. log E = 1.5 M + 4.8 (joules): 10^1.5 ≈ 32 times the energy per unit, for
  surface-wave magnitude, and for Mw by Kanamori (1977). Version 2: it is not a law for ML of
  small quakes (R3 S1).
- **USGS, *Earthquake Magnitude, Energy Release, and Shaking Intensity***,
  <https://www.usgs.gov/programs/earthquake-hazards/earthquake-magnitude-energy-release-and-shaking-intensity>
  (full). Supports: "each whole number increase in magnitude represents a tenfold increase in
  measured amplitude as measured on a seismogram"; "32 times more energy" per unit (no
  magnitude type named); "An earthquake has a single magnitude"; intensities "are expressed in
  Roman numerals"; "Instrumental data at each station location can be used to calculate an
  estimated intensity". Note: the same page also gives log E = 5.24 + 1.44 Mw, which is about
  28 times per unit, not 32 (source helper's flag); the review uses 32 from Okal and Hanks and
  Kanamori.
- **ML for small quakes against Mw** (version 2, for "about 15 times the energy per ML step"):
  Arabasz et al. (2016) slope 0.791 (above), so 10^(1.5 × 0.791) ≈ 15 (my arithmetic); Koper et
  al. (2016) "less than one" (above); Munafò, I., L. Malagnini and L. Chiaraluce (2016), On the
  relationship between Mw and ML for small earthquakes, *BSSA* 106(5), 2402–2408,
  doi:10.1785/0120160130, <https://www.earth-prints.org/handle/2122/10842>. Read: abstract.
  Supports: "below Mw ∼ 4 … Mw = (2/3) ML + C′" (Alto Tiberina, Italy, 0 ≤ ML ≤ 3.8).
- **Herrmann, R. B. (1975)**, The use of duration as a measure of seismic moment and magnitude,
  *BSSA* 65(4), 899–913, doi:10.1785/BSSA0650040899. Read: abstract (via OpenAlex; the DOI
  page refused the fetch). Supports, for the coda wording (R3 M3d): "The observed relationship
  between magnitude and duration is shown to be a result of the particular shape of the signal
  coda as a function of time."
- **Moment magnitude and saturation.** Hanks, T. C., and H. Kanamori (1979), A moment magnitude
  scale, *JGR* 84(B5), 2348–2350, doi:10.1029/JB084iB05p02348,
  <https://www.resolutionmineeis.us/sites/default/files/references/hanks-kanamori-1979.pdf>.
  Read: full. Supports: M = (2/3) log M0 − 10.7 (dyn·cm); "it seems likely that the upper limit
  to ML is also near 7, principally because mb and ML are both obtained from amplitudes at ~1-s
  period"; the scales "are said to saturate at large magnitude … these narrow-band time domain
  amplitude measurements no longer measure gross faulting characteristics" (p. 2348; the
  wording behind R4's "short-period scale" in review 2.4 and Part 5). USGS, *Magnitude Types*,
  <https://www.usgs.gov/programs/earthquake-hazards/magnitude-types> (full): ML range about
  2–6.5, "Only authoritative for smaller events, typically M<4.0"; Md about 4 or smaller,
  "Sometimes the only magnitude available for very small events"; Mww the "Authoritative USGS
  magnitude if computed"; Mw = (2/3)(log10 M0 − 9.1) in N·m.
- **Berkeley's Wood-Andersons** (page 3a's "1928 until January 1994"): Uhrhammer, Loper and
  Romanowicz (1996), above, abstract p. 1314: Berkeley "operated standard Wood-Anderson
  torsion seismographs from 8 April 1928 through 16 January 1994" (their Table 1 ends some
  stations in January 1993). "One on display": UC Berkeley Seismology Lab, *History*,
  <https://earthquakes.berkeley.edu/history> ("see the display case on the 2nd floor"); the
  page gives no end date. Read: full (source helper).
- **Gutenberg–Richter law.** Gutenberg, B., and C. F. Richter (1944), Frequency of earthquakes
  in California, *BSSA* 34(4), 185–188. Read: abstract. Utah b-values: Arabasz et al. (2016),
  above.
- **"Did You Feel It?"**, <https://earthquake.usgs.gov/data/dyfi/>. Read: full. Background for
  level 4.
- **USGS ComCat data products**, <https://earthquake.usgs.gov/data/products/>. Read: full
  (version 2). Supports: "Product availability varies by event and contributing seismic
  network" (R4); phase-data: "Station phase picks, arrival times, and amplitude measurements
  used to locate and characterize an earthquake"; ShakeMap: "Maps and grids of measured and
  interpolated ground motion and shaking intensity"; DYFI: "Macroseismic intensity maps and
  crowdsourced reports". ShakeMap background,
  <https://earthquake.usgs.gov/data/shakemap/background.php>: it uses "high-quality recorded
  ground motions–and any available macroseismic intensity data". Supports page Part 1 (R4).

## Utah standards (version 2)

- **Utah SEEd standards** (adopted June 2023),
  <https://www.schools.utah.gov/curr/science/_science_/UtahSEEdStandards.pdf>. Read: the five
  standards' text (source helper). ESS.2.6 (p. 80) "Evaluate design solutions that reduce the
  effects of natural disasters on humans …", dropped (R3 C4); ESS.4.1 (p. 83); PHYS.2.1 (p. 87)
  "… track and calculate the transfer of energy within a system"; PHYS.4.1 (p. 90); ESS.2.2
  (p. 79).
- **Utah Computer Science Standards 6–12** (November 2019),
  <https://schools.utah.gov/cte/_cte/computer/612ComputerScienceStandards.pdf>. 9/10.DA.3
  (p. 21): "Create data visualizations to help others better understand real-world phenomena or
  factual data information"; 11/12.DA.1 (p. 25): "Refine or create computational artifacts to
  better represent the relationships among different elements of data …". Both are about
  making something (R3 C4, R4).
- **Utah Core Standards for Mathematics, high school**,
  <https://schools.utah.gov/curr/mathematics/_mathematics_/_core/_utah_core_standards_tab_/CoreStandardsHighSchool.pdf>.
  Secondary Mathematics III, F.LE.4 (p. 36): "express as a logarithm the solution to
  ab^(ct) = d … evaluate the logarithm using technology"; Secondary Mathematics I, A.REI.1:
  "Students will solve exponential equations with logarithms in Secondary Mathematics III".
  "Usually grade 11" is the usual sequence, not stated by USBE.

## Site effects

- **Olsen, K. B., J. C. Pechmann and G. T. Schuster (1995)**, Simulation of 3D elastic wave
  propagation in the Salt Lake basin, *BSSA* 85(6), 1688–1710,
  <https://kbolsen.sdsu.edu/PUBL_dir/slv95.pdf>. Read: full. Supports: simulated peak velocities
  up to 2.9 times a rock site (0.2–1.2 Hz).
- **Benz, H. M., and R. B. Smith (1988)**, Elastic-wave propagation and site amplification in
  the Salt Lake Valley, Utah, from simulated normal faulting earthquakes, *BSSA* 78(6),
  1851–1874. Read: abstract. Supports: up to 10 times more amplification on Salt Lake basin
  sediments than on hard rock (Nevada test recordings).

## Raspberry Shake (section 5)

- **Raspberry Shake technical specifications** (last updated 2025-01-12),
  <https://raspberryshake.org/wp-content/uploads/global-technical-specifications.pdf>. Read:
  full (table extracted as text; label-to-value pairing checked by arithmetic). Supports: RS1D
  4.5 Hz geophone extended electronically below 1 Hz, −3 dB at 0.7 and 44 Hz (V7+); sensitivity
  about 4.0 × 10⁸ counts per m/s ± 10%; clips at ±8,388,608 counts, which is about 21 mm/s each
  way by arithmetic (the sheet prints "21 mm/s peak-to-peak"). RS3D: three geophones, 0.7–39 Hz,
  about 3.6 × 10⁸ counts per m/s, clip about 24 mm/s (printed "peak-to-peak").
  - **Noise, corrected in version 2.** Read on the rendered page (PDF p. 6, RS1D; p. 14,
    RS3D) by the source helper and by me. "V7+: 0.08 µm/s RMS from 1 to 20 Hz @ 100 sps" is in
    the row **"Minimum Detection Threshold (estimate)"**, whose note says "The minimum
    detectable level is considered to be 10 dB above the noise RMS". The "Digitizer / Dynamic
    range" row is separate ("24-bit ADC … 144 dB"). The RS3D V5+ value is 0.03 µm/s.
    Self-noise is given only as a figure.
    - Version 1 called the 0.08 "self-noise", and R3 C5 placed it on the digitizer line. Both
      misread the table.
  - **What follows** (my arithmetic, review section 5): 10 dB below 0.08 is a noise RMS of about
    0.025 µm/s; for Gaussian noise the mean absolute value is about 0.8 × RMS, so about
    0.020 µm/s, roughly UUSS's 0.017 µm/s line (version 1 said 4 times above it). For an RS3D,
    about 0.008. Bands and statistics differ, so this is an indication, not a measurement (R4).
- **Raspberry Shake manual, Metadata**, <https://manual.raspberryshake.org/metadata.html>. Read:
  full. Supports: nominal response files per model to download. The page also offers their FDSN
  station service: **not to be used** (constraint 1; data spec 7.8).
- **Anthony, R. E., A. T. Ringler, D. C. Wilson and E. Wolin (2019)**, Do low-cost seismographs
  perform well enough for your network? An overview of laboratory tests and field observations
  of the OSOP Raspberry Shake 4D, *SRL* 90(1), 219–228, doi:10.1785/0220180251,
  <https://manual.raspberryshake.org/_downloads/RS4D-ASL-SRL.pdf> (a copy hosted on Raspberry
  Shake's manual site: a documentation page, not their data servers; the DOI is the primary
  citation). Read: full. Supports, as median misfits of vertical-component ML (IASPEI formula)
  minus NEIC ML for Oklahoma aftershocks, by subset (R3 C5): ML ≥ 2.0, −0.25 ± 0.42 for the
  Shakes against −0.30 ± 0.32 for the USGS stations; ML ≥ 3.0, −0.36 ± 0.34 against −0.33 ±
  0.30. Detection at a signal-to-noise ratio of 2: ML 2.5 at 20–40 km and 2.9 at 80–100 km; the
  abstract's "require events of magnitude 0.3 larger" is for ML 2–4 at 20–100 km; test sites
  were private homes. Clip near 22 mm/s. The station MLs were vertical-component IASPEI, which
  the authors expected to run "systematically ~0.3 lower" than NEIC. Older firmware's "idle
  tones" inflated magnitudes at low signal-to-noise; the authors expect RS-1D v7, RS-3D v5 and
  RS-4D v6 to resolve it (untested), so the detection numbers may be pessimistic for current
  units. Page numbers in the copy read are early-edition numbers (misfits p. 7, detection p. 8).
- **Holmgren, J. M., and M. J. Werner (2021)**, Raspberry Shake instruments provide initial
  ground-motion assessment of the induced seismicity at the United Downs Deep Geothermal Power
  project in Cornwall, United Kingdom, *The Seismic Record* 1(1), 27–34,
  doi:10.1785/0320210010. Read: abstract. Supports: Shake MLs "similar" to the British
  Geological Survey's (no number in the abstract).

## Built for the science page and the module (session D13-magnitude, phase 1, D41)

Sources behind `docs/app/js/lib/magnitude.js`, the page `docs/theory/magnitude.md` ("How big was
it?") and its figures. Accessed 2026-11-25. The page itself carries only the short credit line;
the details are here (D28, constraint 5).

- **The module's constants and table.** Wood-Anderson magnification 2,800, period 0.8 s,
  damping 0.8 (Richter 1935; Uhrhammer and Collins 1990, p. 702; established for UUSS from its
  own amplitudes, review 3.2). Richter's 1958 table, all 70 rows, from Uhrhammer et al. (1996,
  Table 4), checked against Bormann (2012, NMSOP-2 DS 3.1, Table 1) (entries above). The
  coda equation and the 0.01724 µm/s line: the UUSS magnitude summary (above).
- **UUSS's numbers beside each offline sample** (`docs/app/data/samples/qe-*/uuss-magnitudes.json`,
  made by `tools/quake-explorer/sample-amplitudes.mjs`): each event's UUSS phase-data QuakeML in
  USGS ComCat; the file records its URL and the product's update time. Used by
  `tests/magnitude.test.js`, which checks our Wood-Anderson against UUSS's stored amplitudes on
  the samples' own horizontal records (median ratio 1.00; 27 of 28 channels within 8%; the odd
  one, Kenilworth's CVRU HHE, reads half UUSS's value while its HHN matches).
- **Figure 1 (two Kanosh quakes):** uu80137106 and uu80137126 (ComCat: 2026-04-19 14:43:47 and
  14:53:47 UTC, depths 4.1 and 8.1 km; version 2 of the review had them the wrong way round, now fixed in 3.7) at UU.MMU,
  HHE, via EarthScope; ratio 13.5 (UUSS's own HHE amplitudes give 13.6).
- **Figure 2 (Richter's instrument):** Junction uu80162166 at UU.FOR1 HHE via EarthScope; the
  swing, 2.39 mm, matches UUSS's `AML` ÷ 2 for that channel (2.390 mm) to 0.1%. The
  instrument schematic follows Richter (1935) and the Berkeley history page (entries above).
- **Figure 3 and `docs/theory/data/junction-swings.csv`:** UUSS's `AML` amplitudes for the 30
  stations it measured 10–300 km from the Junction quake (phase-data QuakeML, as in
  `qe-junction/uuss-magnitudes.json`), station coordinates from EarthScope's station service,
  the event location from ComCat.
- **Figure 4 (durations):** Junction at UU.CCUT and UU.EKU (HHZ, 60 s before to 420 s after the
  origin) via EarthScope; UUSS's END durations (139.05 s and 325.91 s) and station Md (3.01 and
  3.89) from the phase-data QuakeML; the catalog's Md 3.28 from 29 stations.
- **Figure 5 and Figure 6:** `tools/figures/data/magnitude-check.json`, written by
  `tools/quake-explorer/magnitude-check.mjs` from the event list
  `tools/quake-explorer/data/magnitude-events.json` (22 training quakes plus Magna, and the
  10-quake holdout chosen by rule before any holdout waveform was read; review 3.4).
- **Figure 7 (several numbers):** `tools/figures/data/magnitude-several-numbers.json`: UUSS's
  network magnitudes from each event's phase-data QuakeML (URLs and product update times in the
  file).
- **"Did You Feel It?" counts** on the page (West Valley City 4,122; Junction 5; Magna 26,376):
  USGS ComCat event service, `dyfi` products (`num-responses`), read 2026-11-24
  (`planning/activities.md` B3) and again 2026-11-25 by R3's rerun (`t5.out`).
- **Intensity wording** (Roman numerals; reports and instruments; ShakeMap combines both): the
  USGS magnitude, energy and intensity page and the ComCat products and ShakeMap pages (entries
  above).
- **The page's Make it answer** (slope −1.86, scatter 0.43 in log10): my fit to
  `junction-swings.csv`; Richter's table between 30 and 300 km falls 1.9 in log over one decade.
  Frequencies' −1.7 is that page's own fit to peak ground speed for the same quake.
- **Times:** the Junction quake is October 31, 2026, 04:44 UTC (October 30, 10:44 pm in Utah);
  the page gives the UTC date, as Locating a quake and Our stations and data do.
