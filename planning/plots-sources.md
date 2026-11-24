# Sources for the plots page and its figures

The plots session's log of where each fact comes from (Gus, 2026-11-24: keep sources, out of
the way of students and teachers). The pages carry only the short data credit; the detail is
here. Kept in `planning/`, so it is in git but not on the website. Accessed 2026-11-24 unless
noted. Add a line whenever a caption or page states a fact that came from outside our own
computation.

## Reference curves (PPSD)

- **Peterson's noise models (NLNM, NHNM).** Peterson, J. (1993), *Observations and modeling of
  seismic background noise*, USGS Open-File Report 93-322,
  [publication page](https://pubs.usgs.gov/publication/ofr93322),
  [PDF](https://pubs.usgs.gov/of/1993/0322/ofr93-322.pdf) (the older `/report.pdf` link is
  dead). Table 3 (NLNM, report p. 33) and Table 4 (NHNM, p. 34): line parameters A, B for
  power = A + B·log10(period), dB re 1 (m/s²)²/Hz, periods 0.10–100,000 s. Transcribed into
  `docs/app/js/lib/noise-models.js`; the joins between segments were checked to within 0.6 dB
  (`tests/noise.test.js`). The models stop at 0.1 s (10 Hz). NHNM's main contributors are
  stations on alluvium in noisy places, a coastal station, the South Pole and two islands
  (p. 32–34). "Seismic data from 75 stations have been used in this study" (p. 2).
- **PSD method.** McNamara, D. E., and R. P. Buland (2004), Ambient noise levels in the
  continental United States, *BSSA* 94(4), 1517–1527: one-hour segments, full-octave averages
  at 1/8-octave steps, the PPSD as a histogram of hourly spectra. Our `lib/psd.js` follows it.
  Check: our hourly spectra at TMU (HHZ, 2026-01-15, 09:30–10:30 UTC) match EarthScope MUSTANG's
  `noise-psd` for the same hour, median difference 0.8 dB over 88 frequencies (max 4 dB at
  0.026 Hz).

## Station metadata used in claims

- **SRU (UU), a geophone beside a broadband sensor.** EarthScope station service, 2026-11-24:
  `01.EHZ` Geotech S-13 (1 Hz geophone), active since 2013-04-01; `01.HHZ` and `01.BHZ`
  Trillium 120 Posthole, since 2023-09-19. The EHZ response has poles near 10 Hz (stage 2) and
  six near 12 Hz (stage 3), plus a 0.11 Hz high-pass: an analog telemetry chain, so above about
  12 Hz its deconvolved values are its own noise.
  [query](https://service.earthscope.org/fdsnws/station/1/query?net=UU&sta=SRU&loc=01&cha=EHZ&level=response&format=xml&starttime=2026-10-01&endtime=2026-11-01)
- **Upgrades from short-period to broadband** (not used, noted for activity S9): BMUT
  (S-13 → Trillium Horizon 120, 2025-10-14), BTU (2025-09-18), PCCW (L-4C → CMG-40T,
  2026-04-15).
- **Monthly availability** (EarthScope MUSTANG `percent_availability`): TMU HHZ 100% in
  January and July 2026; SRU EHZ and HHZ 100% in October 2026.

## Repeating explosions west of the Great Salt Lake (stack and cross-correlation)

- **What they are.** Stump, B., R. Burlacu, C. Hayward, J. Bonner, K. Pankow, A. Fisher and
  S. Nava (2007), Seismic and infrasound energy generation and propagation at local and
  regional distances: Phase 1, Divine Strake experiment, *29th Monitoring Research Review*,
  p. 674–676, [PDF](https://www.ldeo.columbia.edu/res/pi/Monitoring/Doc/Srr_2007/PAPERS/03-19.PDF).
  Quotes: "regular large (40,000–80,000 lb) surface explosions at the Utah Test and Training
  Range (UTTR) of the Hill AFB"; "The rocket motor explosions … occur about every week";
  "UTTR explosions are planned weekly during the summer of 2007"; NOQ "regularly records
  seismic and infrasound signals from UTTR rocket motor detonations"; Figure 1 puts UTTR on
  the west shore of the Great Salt Lake, just north-northeast of station BGU; Figure 2 shows
  a 39,000 lb rocket-motor detonation on 2007-06-04.
- **"Not at a quarry":** Stump et al. (2007) place the explosions at "the Utah Test and
  Training Range (UTTR) of the Hill AFB", a military range; the page says the site "is on a
  military range, not at a quarry".
- **The catalog's view.** USGS ComCat, events within 10 km of 41.11 N, 112.90 W, 2015 to
  2026-11-24: 133 "quarry blast", 10 "mining explosion", 6 "explosion", 3 "chemical
  explosion", 7 "earthquake"; 151 of 159 located by the USGS (net `us`), 8 by UUSS; by month
  April 2, May 5, June 31, July 54, August 47, September 18, October 2. Place names read
  "63–67 km W of Hooper, Utah".
- **Others who use these shots as ground truth.** Park, J., C. Hayward and B. Stump, AGU Fall
  Meeting 2014 (rocket-motor burn tests and demolitions in Utah, 2003–2013),
  [abstract](https://agu.confex.com/agu/fm14/webprogram/Paper10771.html); Sandia report
  SAND2024-15221 (a UTTR surface explosion for seismo-acoustic location),
  [OSTI 2480087](https://www.osti.gov/biblio/2480087).
- **Not read:** Hill AFB news on the detonation season
  ([4447515](https://www.hill.af.mil/News/Article-Display/Article/4447515/hill-afb-begins-large-detonations-at-utah-test-and-training-range/),
  [4517227](https://www.hill.af.mil/News/Article-Display/Article/4517227/detonation-season-continues-at-hill-afb/),
  [4222845](https://www.hill.af.mil/News/Article-Display/Article/4222845/large-detonations-expected-at-uttr/))
  refuses automated fetches (HTTP 403). A search summary says the range is the only permitted
  U.S. site for open detonation of large rocket motors; not used in any caption until someone
  reads the page.
- **The "earthquakes" there are probably blasts too** (scouting, 2026-11-24): the 6 ComCat
  "earthquakes" within 3 km were all on weekday afternoons and each correlates 0.94–0.98 with
  a labeled blast at BGU. The nearest likely real quake is uu50312460 (2006-04-02, 1 am
  Sunday, M1.63, 2.8 km deep, about 9 km away).

## H/V at Utah FORGE near Milford (checked 2026-11-24)

- **Shear-wave speeds.** Zhang, H., and K. L. Pankow (2021), *Geophysical Journal
  International* 225(3), 1605–1615, https://doi.org/10.1093/gji/ggab049. Data: Geothermal Data
  Repository submission 1294, "Utah FORGE: Seismic Velocity Models, February 2021",
  https://doi.org/10.15121/1776592 (https://doi.org/10.15121/1773691 resolves to the same
  page), file `Vs_profiles.tar`. Node 42, 62 m from FOR4: 392 m/s at the surface, 1,033 m/s at
  400–450 m, 2,036 m/s at 600 m; first at or above 1,500 m/s at 515 m; travel-time average
  above that, 816 m/s → f0 = 816 / (4 × 515) = 0.396 Hz (measured 0.42 Hz). Node 13, 392 m
  away, gives 0.41 Hz.
- **Depth to granite.** Jones, C. G., J. N. Moore and S. Simmons (2019), Utah Geological
  Survey Miscellaneous Publication 169-K, p. K1,
  https://ugspub.nr.utah.gov/publications/misc_pubs/mp-169/mp-169-k.pdf: well 58-32, alluvium
  0–3,176 ft (968 m), rhyolite to 3,195 ft, then plutonic rock; the contact dips about 25°
  west. Well location from GDR submission 1009: 850 m east-northeast of FOR4. Miller, J.,
  R. Allis and C. Hardwick (2019), UGS MP-169-H, Fig. 13, p. H12,
  https://ugspub.nr.utah.gov/publications/misc_pubs/mp-169/mp-169-h.pdf: about 1.3 km under
  FOR4 (the dip from the well gives 1.27–1.32 km). With the same Vs model down to 1.3 km
  (average 1,286 m/s) the granite would ring near 0.25 Hz.
- **FOR4.** EarthScope station service: Trillium 120 Posthole, site "Blundell West",
  2016-11-09 to 2021-04-08. Nights used (1–3 am local): 2018-01-17, 2018-02-14, 2020-01-15,
  2020-02-12; CTU and SGU: 2025-01-22, 02-19, 10-15, 12-10. Method and windows in
  `tools/figures/data/hv-curves.json`.
- **Method references** (standard; not opened in this session): SESAME (2004), *Guidelines
  for the implementation of the H/V spectral ratio technique on ambient vibrations*, European
  project WP12, reliability and clear-peak criteria; Konno, K., and T. Ohmachi (1998), *BSSA*
  88(1), 228–241 (smoothing, b = 40).
- **Superseded:** the 2016 basin-depth contours (https://doi.org/10.15121/1405034) put FOR4
  at about 165 m, contradicted by drilling; not used.
- **CTU:** site "Camp Tracy" in Mill Creek Canyon (Wasatch Range), 40.6925, −111.7503,
  1,731 m (EarthScope station service). Called rock in the figure because its H/V stays flat
  (0.78–1.39 from 0.1 to 20 Hz), so there is no soft layer to ring; the geologic map was not
  checked.
- **Well 58-32:** 968 m is the base of the basin fill; below it rhyolite to 974 m (3,195 ft),
  then plutonic rock. The page says the well "drilled through 968 m of basin fill before
  reaching rock".
- **Not checked:** SGU's geology and why it peaks at 2.8 Hz (the page asks it as a question).
- **Station status found while scouting:** SUU's vertical (EHZ) reads about 10× weaker than
  its horizontals and its neighbors on three nights (2025-01, 2025-10, 2026-02), so H/V there
  is meaningless; to report to UUSS/DRI. FOR4 was flat on 2019-01-16.

## Stack and cross-correlation (checked 2026-11-24)

- **Event list:** `tools/figures/data/uttr-explosions.json`, with the ComCat query, the
  retrieval date, the selection, alignment and family rules in its header. 152 events:
  133 "quarry blast", 10 "mining explosion", 6 "explosion", 3 "chemical explosion". Utah
  time: every one between 10 am and 6 pm (108 between 11 am and 2 pm); Monday 53, Tuesday
  64, Wednesday 34, Thursday 1; June 30, July 53, August 45, September 16 (144), April to
  May 6, October 2; magnitudes 1.1–2.3 (median 1.9); 6 to 33 a year, 2015–2026.
- **Alignment:** UUSS analyst P picks at BGU, refined by correlation within ±1 s; TMU's P =
  BGU's aligned P + 33.35 s (the median over 86 TMU analyst picks).
- **Stack (TMU, 1–5 Hz):** single-record signal ÷ noise median 2.58 (10–90%: 1.56–4.95);
  stacks of 4, 16, 64 and 144: noise 0.48, 0.26, 0.14, 0.083 (1/√N: 0.50, 0.25, 0.125, 0.083);
  signal ÷ noise 3, 7, 12, 22. The later waves 40–49 s after P (about 3 km/s) are not
  identified as a phase; the figure says "later, stronger waves".
- **Cross-correlation (BGU, 1–10 Hz, P − 1 s to P + 10 s, lags ±1 s):** us6000kywx
  (2023-08-09) with us6000nie6 (2024-08-06) 0.987; us6000kywx with us6000rdm3 (2025-09-29,
  another family) 0.545; each explosion with the stack of the others, median 0.71 (10–90%:
  0.51–0.78); five families (49, 48, 19, 16, 12; average-linkage clustering cut at 0.6);
  the quake uu50312460 (M1.6, 2006-04-02, 2.8 km deep, 9.3 km from the site, 31.4 km from
  BGU) with the stack of 147: 0.124; chance (the stack against noise before P): median 0.16,
  90th percentile 0.22.

## Helicorder and carpet (checked 2026-11-24)

- **Helicorder, SUU, 2026-10-26** (`plots-time.mjs` prints these): background 5.38 counts
  (median 1-minute RMS, 1–10 Hz); 9 am–5 pm 6.47 vs midnight–5 am 3.75 (1.72×); four gaps at
  10:10–10:11 am, 53 s in all. ComCat events and their peak at SUU: uu80161881 quarry blast
  M2.11, 53 km, 200× background; uu80161886 M1.33 under Mount Nebo, 19 km, 251×; uu80161896
  M0.78 near Mona, 20 km, 139×. Not labeled: uu80161846 (M2.12 SW of Dugway, 130 km), only
  16× at SUU, and a bigger burst 39 s before its origin is unrelated to it.
- **Uncataloged bursts, checked against neighbors** (peak over the 4 minutes of noise before,
  1–10 Hz): 12:51, 1:07 and 1:08 am: SUU 47–51, MPU, WMUT, NLU, LEVU (20–42 km) 3–5, i.e.
  nothing; 11:33, 11:34, 11:39, 11:41, 11:48 am: NLU 259, 78, 255, 53, 1,653 against SUU
  32–214. NLU is 25 km west-northwest of SUU, 4 km from Eureka. The fact-check found the five
  onsets reach NLU only about 0.76 s before SUU, so the source is about as far from both
  stations (not near NLU); the page says only that NLU recorded them too. No ComCat event of M3.5 or
  more explains the rumbles at about 2:20 pm and 8 pm.
- **Carpet, HEB, 2026-08-24 to 11-23** (5–20 Hz, median of 1-minute RMS per 15 minutes;
  `tools/figures/data/carpet-heb-2026.json`): quiet level (1–4 am) 1.067 counts; 10 am–4 pm
  weekdays 5.9×, Saturdays 3.7×, Sundays 2.7× (weekday ÷ Sunday 2.14). Labor Day, 8 am–6 pm:
  4.2× against 5.6× (Aug 31, before) and 4.5× (Sep 14, after); 4.0× on the Saturday before
  (the scouting estimate of 0.77× did not hold up). By two-hour blocks, Labor Day 8–10, 10–12,
  12–2, 2–4, 4–6: 4.6, 5.8, 5.0, 3.4, 3.0 against usual Mondays 5.6, 5.4, 5.7, 6.1, 4.5 (a
  workday morning, a weekend afternoon); Friday Sep 4 afternoon 6.7 and 5.6 against usual
  Fridays 5.5 and 4.8; Saturday Sep 5, 8 am–noon, 22.9× (20.1 and 26.2), the loudest stretch of
  the three months (next: Friday Aug 28, 4–6 pm, 12.4×), cause unknown. Gus's idea (holiday
  visitors from the cities) is on the page as a hypothesis to test, not a finding. Veterans Day was not quieter (1.27× the
  Wednesdays around it). Weekday morning rise (halfway, on a log scale, between the 08–11 and
  16–18 UTC levels), median of 14 weekdays each: 13:02 UTC from Oct 12 to 30, 13:48 UTC from
  Nov 2 to 20, 0.75 h later. Offline: Sep 18 (42 of 96 cells) to Sep 22 (33 of 96). None of
  the five stand-ins shows a clear human rhythm (MUSTANG noise spectra, scouting). Their
  elevations (EarthScope station service): SUU 2,024 m, SGU 2,357 m, WCU 2,673 m, TMU
  2,731 m, ELU 2,970 m; the page states the elevations, not a cause.

## Choosing the figures' examples

- **Gaps panel (Reading a seismogram, Figure 9).** EarthScope MUSTANG `num_gaps` / `max_gap`
  listed the days with gaps at SGU (Sep–Nov 2026); November 13, 2026, 9:26 am has steady
  noise on both sides of one 15 s gap. The window used before (October 26, 10:10 am) had a
  real high-frequency burst (about ±200 counts for 0.3 s) 5 s after its gap.
- **Helicorder and carpet candidates:** the Phase 0 scouting compared SUU 2026-10-26, TMU
  2025-09-18 (M7.8 Kamchatka, Vernal mine blast M3.4 at 209 km, only a faint local quake) and
  SUU 2026-02-26; Gus chose SUU 2026-10-26.
- **Explosion site:** Leamington has only 2 labeled blasts (uu60402897, uu80161881), so the
  stack uses the UTTR site, which has 152.
