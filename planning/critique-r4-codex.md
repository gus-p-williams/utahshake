# R4 independent critique: magnitude plan

Scope: `planning/review-magnitude.md` and `planning/magnitude-sources.md`, read with the activity, decision, science, and Quake Explorer materials. I did not read another critique file. Findings are ranked by the risk of acting on the current wording.

## Findings: `planning/review-magnitude.md`

### MUST — Do not promise ComCat phase data for every event

- **Where:** Summary, lines 52–53; §2.1, lines 182–185; §4.2, lines 523–524.
- **Problem:** The draft says ComCat publishes each quake's station magnitudes and phase-data for every quake. ComCat explicitly says product availability varies by event and contributing network. A live “any quake” workflow may have an event magnitude but no UUSS `phase-data`, `AML` amplitudes, `END` durations, or station magnitudes. This affects both the student's comparison and the proposed reader.
- **Evidence:** [USGS ComCat Data Products](https://earthquake.usgs.gov/data/products/) says availability varies and describes `phase-data` as station picks, arrivals, and amplitudes. [UUSS magnitude summary](https://quake.utah.edu/resources/magnitude-summary/) says ML is preferred but cannot be determined for most smaller events.
- **Suggested change:** Say “where the UUSS phase-data product is present.” Pre-curate events with verified products for the lesson; in live mode, show which comparison data are missing and still allow a student estimate against the preferred event magnitude when available. Do not make station-by-station values a required Check step for arbitrary events.

### MUST — Treat the reported success rates as in-sample results

- **Where:** Summary, lines 13–30; §3.3–3.4; Figure G4, §7.3.
- **Problem:** The 22/22 result and the “9 in 10 groups” percentages describe repeated station subsets from the same 22 events, not independent tests on new quakes. Fourteen of those 22 table rows are from the Kanosh, Milford, and Junction clusters. The 400 random station draws per event do not create 400 independent events. The vertical correction of +0.21 was also estimated and evaluated on these same events. These results support a central-Utah demonstration; they do not establish prospective accuracy for future events or other regions.
- **Evidence:** The event table and resampling method are in §§3.3–3.4; the review itself notes the fitted vertical correction at §3.4. ComCat describes phase-data as event/network products, not a general validation set: [USGS ComCat Data Products](https://earthquake.usgs.gov/data/products/).
- **Suggested change:** Label the percentages as descriptive performance on this sample. For a stronger accuracy claim, hold out whole sequences or time/region blocks, estimate any vertical correction only on training events, report event-level uncertainty, and rerun the held-out analysis. Keep the current results as an exploratory feasibility check until then.

### MUST — Separate ML, coda magnitude, and the specific Mw product

- **Where:** §4.2 Check, lines 522–524; §7.2 Part 4, lines 889–892; Part 5, lines 898–910.
- **Problem:** “All three are right; together they say about 3.8” can sound like the three values should be averaged. UUSS identifies ML as preferred when it can be determined; its coda magnitude is calibrated against ML. The Kanosh Mw 3.84 is specifically a coda-based Mw product, not the moment-tensor Mw described elsewhere as coming from fault area, slip, and long-period waves. Different magnitude types are estimates with different methods and availability, not three votes of equal standing.
- **Evidence:** [UUSS magnitude summary](https://quake.utah.edu/resources/magnitude-summary/) states ML is preferred and MC is calibrated to ML. [Holt et al. (2021)](https://www.osti.gov/servlets/purl/1797553) describes UUSS coda-based Mw for small events. [USGS magnitude and intensity page](https://www.usgs.gov/programs/earthquake-hazards/earthquake-magnitude-energy-release-and-shaking-intensity) describes moment magnitude from seismic moment.
- **Suggested change:** Identify each value's type and method, mark the preferred catalog magnitude, and describe the others as comparisons. Replace “together they say” with a statement that these methods give nearby but non-identical estimates for this event. Do not imply an average.

### MUST — Do not claim the planned science page meets the two CS standards by displaying plots

- **Where:** §7.3–7.4, lines 937–969.
- **Problem:** The page is planned as static figures and reading questions. CS 9/10.DA.3 requires students to create data visualizations; CS 11/12.DA.1 requires refining or creating computational artifacts. Looking at author-made figures or dragging a curve on a finished app does not, by itself, show those student outcomes for this science page.
- **Evidence:** [Utah Computer Science Standards](https://schools.utah.gov/cte/_cte/computer/612ComputerScienceStandards.pdf), pp. 21 and 25, defines the two standards as creating visualizations and refining or creating computational artifacts.
- **Suggested change:** Remove these standards from the science-page row unless the page's assignment has students create or refine a chart/model from data. The app activity may claim them separately if its student task produces that artifact.

### SHOULD — Describe the WA calculation as an empirical classroom emulation, not an exact current UUSS recipe

- **Where:** Summary, lines 15–17 and 29–30; §2.3, line 216; §3.1–3.2; Appendix A.
- **Problem:** The implementation uses 0.8 s, damping 0.7, and scale 2,800. The 1990 instrument study reports nominal parameters of 2,800, 0.8 s, and 0.8 damping, but measured physical instruments averaged 2,080 ± 60, 0.800 ± 0.018 s, and damping 0.69 ± 0.023. The plan therefore combines measured-like damping with nominal gain. That can be a deliberate scale convention, but “students follow UUSS's own published recipe” and “UUSS's numbers fit that” overstate what is published. UUSS's public summary gives the formula and distance table, not its current synthetic-response constants. The reported 5,253 amplitude multiplier was inferred from the same event sample, not an independent instrument calibration.
- **Evidence:** [Uhrhammer and Collins (1990)](https://ncedc.org/ftp/outgoing/peggy/ML/Uhrhammer_Collins_1990.pdf), pp. 702–703; [UUSS magnitude summary](https://quake.utah.edu/resources/magnitude-summary/); [Voyles et al. (2020)](https://stacks.cdc.gov/view/cdc/227941/cdc_227941_DS1.pdf) documents UUSS's AQMS-era workflow.
- **Suggested change:** State that the app applies the Richter/UUSS ML form using a 2,800-scale synthetic WA response empirically checked against these ComCat amplitude products. Call the constants and the multiplier a documented emulation unless UUSS confirms the current response settings. Keep “full response changes little” bounded to the tested UU channels and events.

### SHOULD — Make the live station eligibility rule reproducible

- **Where:** §2.4, lines 225–239; §3.1, lines 251–267; §4.2, lines 544–552; §§6.2 and 7.2 Part 4.
- **Problem:** The benchmark uses channels UUSS measured, UUSS locations and picks, an SNR gate, and `isClipped`; the planned student workflow does not yet define how it gets equivalent channels, picks, or quality flags. The review also reports three Magna short-period records that saturated without a flat top, while the app's clip detector only flags flat-topped traces. “For a big quake, use broadband only” has no exact threshold or behavior when broadband data are absent. The measured benchmark can therefore be easier than the workflow students will actually get.
- **Evidence:** The selection recipe is §3.1; the Magna cases are §2.4 and §3.5. Quake Explorer's existing quality gate is described in [D23](decisions.md#d23-what-the-data-support-in-quake-explorer-and-how-the-app-shows-it).
- **Suggested change:** Specify an app-available selection rule before comparing it with UUSS: channel family and orientation, response availability, sample rate, pick/window source, SNR threshold, and explicit clipping/saturation exclusions. Pre-curate the lesson data under that rule and show excluded stations and reasons. Label the Magna broadband-only rule as a manual lesson restriction until the code can detect the relevant failure modes.

### SHOULD — Bound the duration-magnitude claim to the tested proxy

- **Where:** §2.1 lines 162–169; §3.6; Summary lines 34–36; §5 lines 620–626; §7.2 Part 3b.
- **Problem:** The review's 2-second-window threshold is a useful classroom implementation, but it is not enough to claim the exact current UUSS duration procedure. Its statement that the 2006 equation “is what UUSS uses in 2026” is inferred from matching published station products. Also, the UUSS threshold is compared with Raspberry Shake band-limited RMS self-noise; these are different statistics and bandwidths. That ratio is evidence of a likely noise problem, not proof that duration magnitude cannot be measured on any Shake.
- **Evidence:** [UUSS magnitude summary](https://quake.utah.edu/resources/magnitude-summary/) describes the historical MC threshold and formula. [Koper et al. (2016)](https://doi.org/10.1002/2016GL070742) describes the 2-second average-amplitude calculation and calibration. [Raspberry Shake technical specifications](https://raspberryshake.org/wp-content/uploads/global-technical-specifications.pdf) reports RMS noise over 1–20 Hz; it is not the same threshold statistic.
- **Suggested change:** Call the app calculation a classroom proxy that matches the sampled ComCat values; verify current practice with UUSS before labeling it their present method. For Shakes, say the UUSS threshold is below the published RMS noise level and cannot be transferred without a test/calibration. Keep any student-facing duration comparison optional and distinguish UUSS's `M_C`/ComCat `md` names.

### SHOULD — Qualify school-calibration counts and same-station ratios

- **Where:** Summary, lines 62–65; §5, lines 610–629; §6.3, lines 697–699.
- **Problem:** The catalog count supports that events occur within the proposed distance/magnitude windows; it does not show that each school will obtain ten usable, independent calibration records in 1–2 years. Ten measurements is also only the low end of the counts in the UUSS station-correction table, not evidence that ten diverse events are enough for a school-specific correction. “Same-place ratios need no calibration at all” is too absolute: source radiation, depth, event-to-station path, and clipping can change even when the station and instrument are fixed.
- **Evidence:** The review's count is §5; UUSS station correction sample counts are shown in the [UUSS magnitude summary](https://quake.utah.edu/resources/magnitude-summary/). The Shake's per-model response and noise estimates are [Raspberry Shake specifications](https://raspberryshake.org/wp-content/uploads/global-technical-specifications.pdf).
- **Suggested change:** Call ten events a planning target for an exploratory calibration, not a validated minimum. Define “good record” and require magnitude, SNR, distance, and azimuth coverage; report uncertainty and compare against nearby UU estimates. Describe same-station ratios as canceling many fixed effects approximately, subject to source/path and quality limits.

### SHOULD — Tighten the opener and chart instructions

- **Where:** §4.2, lines 515–521; §7.2 Part 2 and Part 3a; Figures G1–G3, §7.3.
- **Problem:** The Kanosh events are a useful nearby pair recorded by common stations, but “from the same spot” implies identical source location. The magnitude difference 1.11 predicts an amplitude ratio of 10^1.11 = 12.9; the measured middle ratio of about 15 is an observation with path/source scatter, not the exact law. The draggable Richter curve also needs to mean vertical translation of a fixed calibration curve; students should not be asked to fit the attenuation slope from a small event-specific station set.
- **Evidence:** The event IDs and ratio are in §§2.2 and 3.7. The [USGS magnitude page](https://www.usgs.gov/programs/earthquake-hazards/earthquake-magnitude-energy-release-and-shaking-intensity) states the tenfold amplitude relation per magnitude unit. My ratio recheck gives 12.9 for ΔM=1.11, 251 for ΔM=2.4, and about 3,981 for the corresponding energy ratio; the draft's rounded 13–15, 250, and 4,000 values are arithmetically sound.
- **Suggested change:** Say “two nearby Kanosh-area quakes” and show the predicted ratio beside the observed pair. Fix the same station, component, filter, time window, and scale. Lock the table-derived curve shape and let students shift it vertically; label the distance correction and the measured amplitudes separately from the PGV attenuation plot on Frequencies.

### SHOULD — Do not equate intensity with DYFI reports

- **Where:** §7.2 Part 1, lines 767–784.
- **Problem:** The draft says intensity “is written in Roman numerals” and “today is mapped from people's reports to” DYFI. MMI is commonly expressed in Roman numerals, and DYFI maps crowdsourced reports, but intensity can also be estimated from instrumental ground motion and other observations. The sentence makes one USGS product sound like the definition or sole measurement path.
- **Evidence:** [USGS magnitude, energy, and intensity page](https://www.usgs.gov/programs/earthquake-hazards/earthquake-magnitude-energy-release-and-shaking-intensity) distinguishes magnitude from location-dependent intensity. [USGS ComCat products](https://earthquake.usgs.gov/data/products/) describes DYFI as crowdsourced reports and macroseismic-intensity maps; it separately describes ShakeMap as measured and interpolated ground motion/intensity.
- **Suggested change:** Say MMI expresses observed intensity, often in Roman numerals; DYFI maps people's reports, while ShakeMap can combine reports and instrumental measurements. Keep the population explanation for the West Valley/Junction contrast.

### SHOULD — Correct the duration range and local-magnitude saturation wording

- **Where:** §7.2 Part 3b, lines 863–868; Part 5, lines 898–910.
- **Problem:** “Duration magnitude is used only up to about magnitude 5” overstates the calibration range: the review's own ComCat table gives Magna an Md of 5.67. The UUSS equation's stated calibration/validity range near 0.5–5 does not mean no higher coda magnitudes are reported. “The Wood-Anderson can't feel the long waves” is also too literal an explanation for ML saturation; it is a short-period local scale whose amplitude response becomes inadequate for very large ruptures. “UUSS measures every Utah quake” is an unnecessary absolute claim about catalog coverage.
- **Evidence:** The review's §2.2 table gives Magna ML 5.61 and Md 5.67. [UUSS magnitude summary](https://quake.utah.edu/resources/magnitude-summary/) describes its published MC equation and calibration; [USGS magnitude types](https://www.usgs.gov/programs/earthquake-hazards/magnitude-types) describes the approximate ML range and Mw's role for larger events.
- **Suggested change:** Say the Utah coda equation was calibrated through about ML 5, while coda magnitudes may still appear above that range; use Magna as an example of the distinction. Explain ML saturation as a limitation of a local short-period amplitude scale and say UUSS catalogs events it detects/locates, not every quake.

### SHOULD — Treat the 8-day estimate as a low-case build estimate

- **Where:** Summary, lines 67–75; §6.1, lines 648–661.
- **Problem:** Reuse of Quake Explorer's data layer, chart patterns, and test conventions makes an 8-session-day coding estimate plausible as a low case. It is not a complete delivery estimate for a new WA filter, QuakeML products, two-horizontal loading, hand-checked sample provenance, quality gates, seven figures, and a classroom trial. The page estimate says six figures while §7.3 lists G1–G7. The table separates Gus and teacher time, but sets DRI staff time to none even though the science plan says UUSS practice may need confirmation.
- **Evidence:** Existing reusable code includes [`units.js`](../docs/app/js/lib/units.js), [`response.js`](../docs/app/js/lib/response.js), and Quake Explorer's record-section modules under [`docs/app/js/quake-explorer/`](../docs/app/js/quake-explorer/). The seven planned figures are in §7.3; the trial is listed separately in §6.1.
- **Suggested change:** Keep 8 days as the optimistic implementation case and add a range or explicit exclusions for scientific review, data-product edge cases, accessible/touch interaction, and classroom revision. Reconcile six versus seven figures and keep DRI/UUSS consultation and teacher trial as separate human time, as opposed to Claude implementation time.

### CONSIDER — Make the fifth-investigation choice conditional on a trial

- **Where:** §4.2, lines 511–570; §6.2–6.3.
- **Problem:** Quake Explorer is the best current fit because the data loader, sample system, chart interaction, and lesson structure already exist. But D22 defines four investigations and D23 explicitly leaves magnitude to a possible future app not on the roadmap. The draft correctly identifies the decision for Gus, but “five tabs is the limit” is not supported by a usability result, and a fifth tab adds substantial methods/content to an app whose existing cards target short sessions.
- **Evidence:** [D22](decisions.md#d22-quake-explorer-four-investigations-each-predict-explore-why-check) and [D23](decisions.md#d23-what-the-data-support-in-quake-explorer-and-how-the-app-shows-it); the proposal's reuse and cost comparison are §§4.1–4.3.
- **Suggested change:** Recommend a bounded prototype/trial of E, then update D22/D23 and E11 if approved. Remove the hard five-tab cap or label it as a design hypothesis. Preserve the separate science page even if the interactive activity is deferred; a separate app is the fallback only if the QE trial shows the extra investigation does not fit.

### CONSIDER — Split the 15-minute opener from the full investigation

- **Where:** §1 and §4.2, especially lines 515–524; `activities.md` E11 lists 1–2 periods.
- **Problem:** A 15-minute Kanosh comparison is plausible as a stand-alone opener. The full path adds logarithmic scaling, a curve interaction, station-quality decisions, horizontal records, a median, catalog method differences, and clipping/site effects; that is not a 15-minute lesson and may fill more than one period if students calculate rather than inspect prebuilt results.
- **Evidence:** The five levels are in §1; the activity card's planned time is in [E11](activities.md#e11-how-big-was-it).
- **Suggested change:** Provide a 15-minute entry path with one preselected clean station pair and a 45–60-minute core path with 5–10 preselected stations. Keep duration, Magna saturation, and method comparison as an extension or second period.

## Findings: `planning/magnitude-sources.md`

### SHOULD — Verify the exact 1958 table values against the named primary source

- **Where:** Lines 129–135.
- **Problem:** The log is transparent that Table 22-1 of Richter (1958) was read through Uhrhammer et al. (1996), then checked against Richter's 1935 Table I. Those are not the same table. UUSS confirms that its regional method uses Richter (1958), but that does not independently confirm every digitized node and interpolation used by the proposed app.
- **Evidence:** [UUSS magnitude summary](https://quake.utah.edu/resources/magnitude-summary/) cites Richter (1958), pp. 340–345, and says the table is adequate for its network. [Uhrhammer et al. (1996)](https://ncedc.org/ftp/outgoing/peggy/ML/Uhrhammer_1996.pdf) is the cited reproduction; [Richter (1935)](https://ncedc.org/ftp/outgoing/peggy/ML/Richter_1935.pdf) is an earlier table.
- **Suggested change:** Before encoding the nodes, check them against a copy/scan of Richter 1958 Table 22-1. Record the page, edition, transcription, and interpolation rule alongside `richter-table.json`; keep the UUSS regional validation as a separate claim.

### SHOULD — Preserve an auditable path for the resampling results

- **Where:** Lines 98–120 and 129–153, read with review Appendix B.
- **Problem:** The log records the event IDs and service endpoints, but says the analysis scripts and cache live in a scratchpad that may be cleared. It does not preserve the station-resampling seed/output or the exact distance-table file that generated the headline percentages. That makes the result hard for the next implementer or reviewer to reproduce.
- **Evidence:** The source log identifies its inputs at lines 98–120; review Appendix B, lines 1026–1044, says the scripts are uncommitted and may be cleared, while proposing a future `magnitude-check.mjs`.
- **Suggested change:** When the work moves into implementation, retain the checking script, deterministic seed, event/channel eligibility list, and compact output data under `tools/quake-explorer/` with the data provenance. Keep the current scratch work out of the public app until the chosen validation language is settled.

## Shared issues and constraints

- **Plan versus activity card:** E11 currently says students measure peak ground speed and fit fading on a log-log plot, and lists PHYS.2.1, ESS.2.6, and PHYS.4.1. The proposed activity instead transforms horizontal channels to synthetic-WA amplitude, applies a fixed Richter correction, and compares with ML; its proposed standards differ. The review notices this and recommends an E11 edit, but implementation should wait until the app location and standards are approved. See [activities.md E11](activities.md#e11-how-big-was-it), [D22](decisions.md#d22-quake-explorer-four-investigations-each-predict-explore-why-check), and [D23](decisions.md#d23-what-the-data-support-in-quake-explorer-and-how-the-app-shows-it).
- **No present Raspberry Shake/privacy violation found:** The magnitude analysis uses UU/US waveform data through EarthScope and public USGS ComCat products. It does not use Raspberry Shake server data or student data. The later school-Shake path should continue to use only DRI's approved files/server, retain attribution, and keep installed Shakes fixed; the review already says not to use Raspberry Shake's FDSN station service.
- **Reuse and placement:** A new module in `lib/` and a QE investigation is more economical than duplicating the app's data layer in Quake Locator or a separate app. The numerical method is plausible for a bounded, pre-curated Utah lesson, but phase-data availability, sample selection, and in-sample performance need to be made explicit before promising an arbitrary-event workflow.

## Verdict

Proceed with the science page and a bounded QE prototype, subject to correcting ComCat availability and magnitude-type claims. Present the measured accuracy as exploratory, verify the exact Richter table, and treat school-Shake calibration/duration magnitude as research questions. No current data-license, privacy, browser-only, or fixed-station constraint violation is identified.
