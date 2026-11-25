# Sources for the Phone Bench and "How small a shake can it see?"

The source log (constraint 5, D28) for session D10-phone-bench, 2026-11-25. It covers the
claims on these site pages:

- the Phone Bench page (`docs/app/phone-bench/`), its guide (`docs/apps/phone-bench.md`, in
  particular "Why the numbers come in steps") and the All apps card;
- Reading a seismogram (`docs/theory/seismograms.md`), section "How small a shake can it
  see?", its table and its Figure 2 (`docs/theory/img/phone-steps.svg`: made-up waves, script
  `tools/figures/phone-steps-figure.mjs`).

All accessed 2026-11-25. **[read]** marks a primary source this session read itself; other
entries rely on the phone recorder review's log, `planning/phone-sources.md` (session
P4-phone-review), which quotes them.

## The phone in a browser

| Claim on the site | Source | Value or quote |
| --- | --- | --- |
| Chrome rounds every motion reading to the nearest 0.1 m/s² | **[read]** Chromium, `services/device/generic_sensor/platform_sensor_util.h`, line 26, via the GitHub mirror https://raw.githubusercontent.com/chromium/chromium/main/services/device/generic_sensor/platform_sensor_util.h (googlesource.com answered 503) | `inline constexpr double kAccelerometerRoundingMultiple = 0.1;` |
| ... applied before a page sees it; we checked it in Chrome | **[read]** our own test, `tools/phone-bench-check.mjs`: headless Chrome 158 with DevTools sensor emulation (`Emulation.setSensorOverrideReadings`) given x 0.123, y 0.234, z 9.81 m/s² | The page's `devicemotion` events read 0.1, 0.2, 9.8 |
| Rounding is there so websites can't recognize a phone by its sensor's quirks | **[read]** the same header, lines 16–22: values "rounded to the nearest multiple of some small number" against fingerprinting; "Rounding also protects against using the gyroscope as a primitive microphone" | Why |
| About 1% of gravity | 0.1 / 9.81 = 1.0% (our arithmetic) | |
| Up to 60 readings a second (so frequencies up to 30 Hz) | **[read]** Chromium `services/device/public/cpp/generic_sensor/sensor_traits.h`, line 14 (GitHub mirror): `static constexpr double kMaxAllowedFrequency = 60.0;`. iPhones: WebKit `WebCoreMotionManager.h`, `kMotionUpdateInterval = 1.0f / 60.0f` (P4) | 60 a second; half of it, 30 Hz, is the highest frequency a record can hold |
| Whether iPhones round isn't confirmed; a change has been filed but has not shipped | WebKit bug 329553, https://bugs.webkit.org/show_bug.cgi?id=329553, "[iOS] deviceorientation and devicemotion values are not limited to the precision the spec requires", filed 2026-10-30, status NEW (P4) | Trial T1 will tell |
| (Background) every browser is now asked to round | W3C Device Orientation and Motion, Editor's Draft, https://w3c.github.io/deviceorientation/: "limit its precision to no more than 0.1 m/s2" (P4) | |
| The sensor's own noise is smaller than the step | Phone accelerometer noise 0.006 to 0.02 m/s² over 0 to 30 Hz: Bosch datasheets and Zhang et al. (2025), in `planning/phone-sources.md` and the review's Appendix A2 (P4) | Under 0.1 m/s² |
| At rest, most phones flicker by one step on at least one axis | Critique R1 of the phone review, `planning/critique-r1-claude.md`, point P4-S1: with noise of 0.006, 0.01 and 0.02 m/s² and resting values spread evenly within a step, at least one of three axes lies within 2σ of a step's edge on 56%, 78% and 99% of phones | Also the made-up Android phone's flickering y axis |
| At 10 Hz one step equals a ground speed of 1.6 mm/s, about 20,000 times the smallest shake a Shake can see (the guide: "about 20,000 times") | Our arithmetic: speed = acceleration / (2πf) = 0.1 / (2π × 10) = 1.59 mm/s; 1.59 mm/s / 0.08 µm/s = 19,900. Over 1 to 20 Hz the ratio runs from about 10,000 (20 Hz) to 200,000 (1 Hz) | |
| Phones in class need the district's policy under Utah's phone law (SB 69, 2026) | `planning/activities.md`, Appendix C; S.B. 69 School Device Revisions (2026), https://le.utah.gov/Session/2026/bills/enrolled/SB0069.pdf, amending Utah Code 53G-7-227 | The adult-testers notice |
| iPhones pause motion events while a page scrolls | WebKit bug 329556 (P4) | "Don't scroll during a take"; the page scrolls its card to the top at Start |
| A "No" to motion on an iPhone lasts until Safari quits | `planning/review-phone-recorder.md`, section 2.1, from WebKit's code (P4; not yet tested on a device) | The recovery line on the page and in the guide |

## The Raspberry Shake

**[read]** Raspberry Shake, "Raspberry Shake Technical Specifications", the Raspberry Shake 1D
section ("Last updated: 1/12/2025"), pages 5–6,
https://raspberryshake.org/media/global-technical-specifications.pdf. The site uses the values
for current units ("V7+"):

| Claim on the site | Spec sheet |
| --- | --- |
| A geophone | "Single-component 4.5 Hz 395 Ohm vertical Racotech RGI-20DX geophone with electronic extension to lower frequencies (<1 Hz)" |
| 100 readings a second | "V6+: 100 sps" |
| 0.7 to 44 Hz; its response falls off below 0.7 Hz | "Bandwidth (estimated) V7+: -3dB points at 0.7 and 44 Hz" |
| 24-bit; 16.8 million steps from the biggest negative to the biggest positive reading | "Clip Level (estimated) +/- 8,388,608 counts (24-bits)"; "24-bit ADC Sigma-Delta"; 2²⁴ = 16,777,216 (our arithmetic) |
| Each step about 2.5 nanometers per second | "Sensitivity (estimated) V7+: 3.996500E+08 counts/ meter/ second +/- 10% precision"; 1 / 3.9965 × 10⁸ = 2.50 nm/s (our arithmetic) |
| The smallest shake it can see is 0.08 micrometers per second (1 to 20 Hz) | "Minimum Detection Threshold (estimate) V7+: 0.08 µm/ s RMS from 1 to 20 Hz @ 100 sps. Note: The minimum detectable level is considered to be 10 dB above the noise RMS." |
| Its own noise rises toward slow motions | The sheet's "Sleeman Self-Noise" chart (RS4D-V6 EHZ): the self-noise rises steeply at periods above about 1 s |
| (Not on the site, for reference) clip level in ground speed | "V7+: 21 mm/s peak-to-peak from 0.1 to 10 Hz"; "Digitizer Dynamic range 144 dB (24 bits)"; effective bits "V6+: 21 bits (126 dB) from 1 to 20 Hz @ 100 sps" |
| Which model each school has isn't confirmed | CLAUDE.md, open question 2a |

## The University of Utah broadband station

| Claim on the site | Source | Value or quote |
| --- | --- | --- |
| TMU's broadband sensor and digitizer; 100 readings a second; each step about 2.1 nm/s | **[read]** EarthScope station service, https://service.earthscope.org/fdsnws/station/1/query?net=UU&sta=TMU,SRU,HEB&cha=HHZ,EHZ&level=channel&format=text&endafter=2026-11-01 | TMU 01.HHZ: "Trillium Horizon 120, 120 s, 1200 V/m/s-Centaur", Scale 4.81E8 counts per m/s at 1 Hz, 100 samples/s, since 2022-05-24; 1 / 4.81 × 10⁸ = 2.08 nm/s (our arithmetic). SRU 01.HHZ: "Trillium 120 Posthole, generation 3, 120 s"; SRU 01.EHZ: "S-13, Velocity Sensor, GEOTECH" |
| 120-second waves to 150 Hz (the sensor) | **[read]** Nanometrics, Trillium Horizon 120 data sheet (1001.14.20, 2024), https://20819274.fs1.hubspotusercontent-na1.net/hubfs/20819274/Trillium%20Horizon%20120%20Data%20Sheet.pdf, linked from https://www.nanometrics.ca/products/seismometers/trillium-horizon-120 | "Bandwidth: -3 dB points at 120 s and 150 Hz"; also "Sensitivity/all other models: (Nominal) 1200 V•s/m"; "Clip level: 16.6 mm/s up to 10 Hz and 0.12 g above 10 Hz"; "Dynamic Range: 168 dB @ 1 Hz" |
| Quieter than the quietest ground on Earth over most of its range | **[read]** the same data sheet's self-noise graph, "Seismometer self-noise plotted against NLNM (after Peterson, 1993)": the Trillium Horizon's curve lies below the NLNM over most of its band. The Trillium 120 Posthole data sheet (1001.03.18, 2026), https://20819274.fs1.hubspotusercontent-na1.net/hubfs/20819274/Trillium120PH_DataSheet_1001.03.18.pdf, shows the same (its curve is below the NLNM from about 0.01 to 10 Hz) with the same bandwidth and clip level | |
| 24-bit too | **[read]** Nanometrics, Centaur Gen5 brochure (1010.02.03), https://20819274.fs1.hubspotusercontent-na1.net/hubfs/20819274/CentaurGen5_Brochure_1001.07.03.pdf, linked from https://www.nanometrics.ca/products/digitizers/centaur: "Resolution: User-selectable 24-bit up to 32-bit"; "Dynamic Range 146 dB". TMU's records are 24-bit counts (the page's "Counts have a limit" and Instrument problems) | The brochure is for the current generation; TMU's Centaur dates from 2022 |
| A geophone and a broadband sensor side by side at SRU; Peterson's curves | Already sourced in `planning/plots-sources.md` (D2-plots); the new section links to it rather than repeating it | |
