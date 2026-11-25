# Phone Recorder: feasibility and effort review

*Session P4-phone-review, 2026-11-25, for Gus and DRI. Revised the same day after two
independent critiques (R1 in Claude, `critique-r1-claude.md`; R2 in Codex,
`critique-r2-codex.md`); section 7 answers every finding. A planning document: nothing here
is decided. Sources are logged in [phone-sources.md](phone-sources.md); calculations marked
"our calculation" are shown in Appendix A.*

**Status since the first draft.** The bench page of section 5.1 is live as **Phone Bench**
(session D10-phone-bench, merged; decision D36): All apps → "In development: please test" →
Phone Bench (`app/phone-bench/`, guide `apps/phone-bench.md`), for adult testers. It is the
instrument for trial T1. The rounding is explained on the site, in Phone Bench's guide ("Why the
numbers come in steps") and in "How small a shake can it see?" on Reading a seismogram
(`theory/seismograms.md#how-small-a-shake`); every future phone activity card must remind
teachers of it and link to that section (D36, `developers/adding-a-card.md`).

**Effort scale** (shared with P3): **S** up to 2 days, **M** 3 to 7 days, **L** more than 7
days. Claude session-days, DRI staff days, and teacher and school IT time are given separately
(section 5).

**The question (Gus).** Is a phone vibration recorder worth building as a proof of concept,
and what would it take? It would be a page on our site that records vibrations with the phone
it is open on, with no logins or accounts, so probably nothing saved on our site.

**Short answer.** Worth building as a small proof of concept (now live), not yet as a classroom
tool.

- **Phone Bench, the proof of concept, is live** and is the instrument for trial T1. On real
  devices it measures what this review can only estimate: readings per second, timing jitter,
  the size of the steps, flicker on each axis, and how permissions behave. T1 starts with
  adults' phones, which no school policy covers. Before trials T2 and T3 it needs a few
  additions (S, 5.1).
- **Hold the classroom-ready Phone Recorder (L)** until Dale and Cleat choose phone
  activities, a school can lawfully run them (section 4), and the trials pass.
- **The main finding, by browser engine.** Chrome (Android phones, Chromebooks) rounds every
  motion reading to 0.1 m/s² and delivers at most 60 readings a second: verified in Chromium's
  source, since Chrome 83. Safari on iPhones delivers 60 a second and does not round today
  (WebKit's source). The W3C's Device Orientation and Motion document, a Candidate
  Recommendation Draft, says browsers must limit precision to 0.1 m/s², and WebKit bug 329553,
  filed on 2026-10-30 and tracked in Apple's internal bug system, asks for the same; whether and
  when iPhones change is unknown, and the plan works either way.
- **What that means for the cards.** Strong motion (P1's calibration and stomps, P4's shake
  table, P5's spring) and the microphone card (P6, bounce timer) are fine. P2 becomes a
  short-range lesson in which how the phone lies matters. P3's 10 to 40 m ring is unlikely to
  work as written (our estimate; trial T3 decides).
- **Nothing needs to be saved on our site.** Results on the phone's screen and a CSV download
  cover every card. No server, no live links between phones.
- **Policy.** Utah's phone law covers every phone a student uses at a public school, whoever
  owns it, and only the LEA (the district or charter school) can allow other uses. Wasatch
  Academy is private, so probably outside the law and the State Board's device rule: it is the
  natural first classroom trial site, under its own policy. School Chromebooks aren't
  cellphones, but the Board's device rule, local device and microphone policies, and the new
  2026 law on classroom technology (53G-7-228) still apply. "Nothing uploaded" makes the review
  simpler but does not replace it: each LEA reviews the tool before students use it.
- **Alternatives.** phyphox, a free app, is a better instrument but must be installed. Lab
  sensors that schools may own (Vernier, PASCO, micro:bit) aren't cellphones and their data
  don't pass through the browser's rounding; worth asking which schools have them (6.1).
- **The cheapest win:** the microphone bounce timer (P6) on school Chromebooks, once the LEA
  approves it like any other classroom tool.

What this review covers:

1. What each phone activity needs from the recorder
2. The browser side: motion sensors, rounding, microphone, timing, a shared strength measure
3. Getting data out with no logins
4. Policy: the phone law, the State Board's rules, the classroom-technology law, privacy
5. Effort: Phone Bench, trials, a classroom-ready tool, gates, dates and defaults
6. Alternatives, risks, open questions and recommendation
7. Response to the critiques

Appendices: A. Calculations; B. How this review was made.

## 1. What each phone activity needs

The phone cards are P1 to P6 in the questions document (`planning/activities.md`). No S or R
card uses a phone directly; three point to one: S13 (Bouncing-ball clock) has P6 as its
microphone version, R5 (Sensor coupling test) shares P1's taped-down-or-loose comparison, and
research project D ("many cheap versus few good sensors", Appendix H) uses phones as the
cheapest sensors, as in P2.

| Card | Sensor | Readings per second needed | Timing needed | Length of a take | Where the analysis happens | What leaves the phone |
| --- | --- | --- | --- | --- | --- | --- |
| P1 Phone seismometer | Motion, 3 axes with gravity | Any, for the gravity calibration; 50 or more to show stomps | None between phones. Within the phone, each reading's time, to measure the rate and its jitter | 10 to 60 s | On the phone: mean on each face (±1 g), rate, jitter, flicker, strength of each stomp | Numbers on a worksheet |
| P2 Phone vs Shake | Motion | 50 or more | About a second: enough to match each drop with the Shake's record | 2 to 5 min of quiet; then 10 to 20 drops over 15 min | Phone: "saw it or not" and strength for each drop. Shake: P3's day viewer (V1) or DataView | Simple version: a yes/no table by distance, nothing moved. Spectrum version: the phone's file and the Shake's day file in one page |
| P3 Find the hit | Motion | 50 or more | About a second, to match the same hit across phones (by order or by clock) | One take of 5 to 10 min with 10 to 20 hits | Phone: strength of each hit, by the shared measure (2.6). One device: Hit Locator | 4 to 6 phones × a few hits = 10 to 60 numbers |
| P3 extension: clap by sound | Microphone | 44,100 or 48,000 | Within each phone only, if each phone times a reference clap and the test clap in the same recording (2.4) | A few seconds | Phone: the time between the two claps | One number per phone |
| P4 Shake Table Challenge | Motion | 20 or more (hand shaking at 0.5 to 5 Hz) | None | 30 to 60 s per run | Phone: size of the shaking at the driving rate | Two numbers per run (roof, base); files only for a full response curve |
| P5 Phone on a spring | Motion | 20 or more (springs ring at 1 to 5 Hz) | Within the phone | 10 to 30 s | Phone: the ringing frequency and how fast it dies | Numbers on a worksheet |
| P6 Bounce timer | Microphone | 44,100 or 48,000 | Within the phone, about 1 ms | 5 to 10 s | Phone (or Chromebook): time of each bounce, heights | Numbers on a worksheet |
| Research project D | Motion | As P2 | As P2 | Longer runs | Python notebooks | Files |

What the table shows:

- **Most of the work happens on the phone.** Every card can do its core analysis on the
  phone; at most, P3 then moves 10 to 60 numbers to one device. Only P2's spectrum version, a
  full P4 response curve and the research track need a file to leave the phone. So the
  recorder's core is its on-phone analysis (rate, strength of each event, spectrum, bounce
  times), not data transfer.
- **No card needs two phones' clocks to agree better than about a second.** P3 locates by
  strength, not arrival time (the questions document's Appendix B3 shows why), and the clap
  extension can time within one phone. This removes the hardest problem, clock
  synchronization.
- **Two cards need small signals; the rest have big ones.** P2 at a distance and P3 at 10 to
  40 m need the phone to see weak shaking, which is where browser limits bite (rate, and
  rounding, 2.2). P1's calibration (a full 1 g), P4 and P5 (5 to 30% of g) move the phone a
  lot, and the microphone cards are loud.
- **The microphone cards need no phone.** P6 and the clap extension work on any device with a
  microphone and a browser, including school Chromebooks, which are not cellphones under the
  phone law (other rules still apply: section 4).
- **Strength must be defined before it is compared.** At about 60 readings a second, the
  largest reading of a 15 to 25 Hz burst falls 10 to 20% short of the true peak on average and
  scatters by 9 to 13% from take to take, worst case about half. The square root of the
  burst's energy scatters by 3% or less up to 20 Hz, worst case 4% (our calculation, A1). But
  orientation, coupling, baseline, window and band matter as much, so 2.6 defines one measure
  before any card uses strength to locate anything.
- **P2's Shake side depends on P3's work.** P2, and trial T3, need the Shake's record for the
  same minutes in a page. That is P3's day viewer (V1), or Raspberry Shake's DataView if the
  school's Shake shares its data. One shared file reader serves both reviews (3, option 6).

A refinement to the questions document: its P3 extension says "a microphone takes 48,000
readings a second, so arrival times work even across a table". That is true of the samples
but not of the phones' clocks, which disagree by ±11 ms after alignment, while sound crosses
a 1.5 m table in 4.4 ms. It works only if each phone times a reference clap at a known spot
and then the test clap in one continuous recording, so the clock offsets cancel (2.4, A3).
Trial T2 tests it.

## 2. The browser side

Checked against browser source code, the W3C documents, MDN and MDN's compatibility data on
2026-11-25 (quotes in [phone-sources.md](phone-sources.md)). **What follows is what each
engine's code does, not yet what phones deliver**: nothing has been tested on a device. Trial
T1 measures it, by browser and system version, and the cards' limits will be set from T1's
results, not from this section.

### 2.1 Motion sensors: what a page gets

There are two ways for a web page to read a phone's accelerometer:

- **`devicemotion` events** (the Device Orientation and Motion document): in every current
  mobile browser, so the only choice that covers iPhones and iPads.
- **The Generic Sensor API** (`Accelerometer`, `LinearAccelerationSensor`, `GravitySensor`):
  Chromium browsers only (Chrome, Edge, Samsung Internet). Its one advantage is a real time
  stamp for each reading. Not worth a second code path in a proof of concept.

| | iPhone and iPad (Safari, and every other iOS browser, which all use Safari's engine) | Android, Chrome | Android, Firefox | Chromebook, Chrome |
| --- | --- | --- | --- | --- |
| Readings per second (code) | 60: one constant in WebKit for every device | At most 60: the smaller of 60 and the sensor's own maximum, fired by a 60 Hz timer | Sensors requested at 60; event rate not checked | As Android Chrome, if the Chromebook has a motion sensor at all (convertibles may; T1 checks) |
| Value steps (code) | Not rounded in WebKit today | **Rounded to 0.1 m/s²** (gyroscope to 0.1°/s), since Chrome 83 (2020) | Not rounded | **Rounded to 0.1 m/s²** |
| Permission | A prompt, which the page may show only after a tap; HTTPS only | No prompt today. Chrome has `DeviceMotionEvent.requestPermission()` (Chrome 152 on), but it answers at once without asking (D10, Chrome 158); the "Motion sensors" site setting defaults to Allow, and the option that would make Chrome ask is off by default. HTTPS only | No prompt | As Android; school management can block it |
| How long a "yes" lasts | Kept in memory for the site until Safari quits; a "no" too, and the page can't ask again until then (from WebKit's code; T1 checks) | Until changed in settings | | |
| Time of each reading | When WebKit's 60 Hz timer fired, not when the sensor measured | When Chrome's timer fired (the Generic Sensor API has the true time) | | |
| Without a gyroscope | `acceleration` reads 0, 0, 0; `accelerationIncludingGravity` comes straight from the accelerometer | Chrome estimates gravity with a filter and subtracts it | | |

What this means for the page:

- **60 readings a second is the ceiling in all three engines' code**, so waves above 30 Hz
  cannot be seen and, unless the phone's own sensor filters them out, show up as false lower
  frequencies (aliasing). Stomps and drops on a concrete slab put much of their energy at 10 to
  50 Hz. T1's 40 Hz test answers whether phones filter it.
- **Readings come from a timer, not from the sensor.** Chrome and Safari fire the event on a
  60 Hz timer that copies the latest sensor value, so a value can repeat or be skipped, and the
  event's time stamp is the timer's. The `interval` field is useless for timing: Chrome reports
  a constant 16, Safari reports seconds (0.0167) instead of milliseconds, and Firefox a
  constant 100. The page measures the rate itself (2.5).
- **Use `accelerationIncludingGravity`, and remove gravity ourselves.** On Android it is the
  plain accelerometer; the gravity-free `acceleration` is the phone's own estimate (sensor
  fusion), which may lag or drift for slow motion such as a phone on a spring (P5). On iPhones
  both come from Apple's sensor fusion, and on a device without a gyroscope `acceleration` is
  simply zero.
- **Ask for permission everywhere it exists.** Chrome already has the iPhone-style
  `DeviceMotionEvent.requestPermission()` (Chrome 152 in MDN's data); in Chrome 158 it answers
  at once, without a prompt (D10). *(Corrected: the previous draft could be read as saying the
  function itself was switched off.)* What is switched off is Chrome's option to make it actually
  ask by default. A page that always shows a Start button and calls `requestPermission()`
  wherever it exists, as Phone Bench does, keeps working if Chrome starts to ask; the time to
  the answer tells a real prompt (seconds) from an automatic answer (milliseconds).
- **Don't trust the sign.** iPhones are widely reported to give the opposite sign to Android
  (−9.8 rather than +9.8 for a phone lying face up); WebKit passes Apple's values through
  unchanged. Unverified from Apple's documents; the page reads the sign from the resting value,
  and P1's calibration on each face shows it to students anyway.
- **Old devices.** Asking for permission needs iOS 13; the screen wake lock (2.3) needs iOS
  16.4 or Chrome 84. Current Chrome needs Android 10 or later (Google), and iOS 26 and 27 need
  an iPhone 11 or SE (2nd generation) or later (Apple), so a donated set may run frozen,
  unpatched browsers: fine for a page that only reads sensors, but T1 logs each device's system
  and browser version.

### 2.2 Chrome rounds every reading to 0.1 m/s²; the signals are small

This is the finding that changes the plan most. In Chrome, every acceleration value is rounded
to the nearest 0.1 m/s² before a page sees it, in both APIs, with no way for a page to switch it
off (Chromium's source, since Chrome 83); the gyroscope is rounded to 0.1°/s. The reason is
privacy: a sensor's tiny calibration errors can identify a phone, and fine gyroscope data can
act as a crude microphone.

How far this reaches beyond Chrome is less certain:

- **The W3C document** (Device Orientation and Motion, a Candidate Recommendation Draft of 18
  November 2026) says browsers must "limit its precision to no more than 0.1 m/s²". It is a
  draft standard; browsers follow it by choice.
- **Safari on iPhones doesn't round today** (WebKit's source). WebKit bug 329553, "[iOS]
  deviceorientation and devicemotion values are not limited to the precision the spec
  requires", was filed on 2026-10-30 and is tracked in Apple's internal bug system. That shows
  the gap is known, not when or whether it will close.
- **Firefox doesn't round** (its source).

So the plan treats Chrome's rounding as a fact, and rounding on iPhones as a possibility with no
date: T1 records it for each iOS version, and nothing in the plan depends on iPhones staying
unrounded.

**On the site (live, D36).** Phone Bench's guide explains the rounding ("Why the numbers come in
steps"), and Reading a seismogram has "How small a shake can it see?"
(`theory/seismograms.md#how-small-a-shake`): a phone in a browser, a Raspberry Shake and a
broadband station compared by step size, self-noise and frequency range, with a figure of a
small shake vanishing or flickering. **Every future phone activity card must remind teachers of
the rounding and link to that section** (D36; the rule is in `developers/adding-a-card.md`),
for example: "In Chrome, phones report shaking in steps of 0.1 m/s², about 1% of gravity;
smaller shaking may vanish or flicker. See How small a shake can it see?"

What 0.1 m/s² means (Appendix A2 has the arithmetic):

- **It is about 1% of g.** P1's gravity calibration, P4's shake table and P5's spring move the
  phone by much more than that, so for them rounding is harmless, and P1's students see the
  steps.
- **It is 5 to 15 times the sensor's own noise.** Phone noise over the 0 to 30 Hz a browser can
  show is about 0.006 to 0.02 m/s² (A2; the questions document's 0.02 m/s² was measured with a
  native app sampling 400 times a second).
- **A resting phone usually flickers on at least one axis.** *(Corrected: the first draft said
  it shows one constant value.)* On each axis the resting value sits somewhere between two
  steps. Where it sits within about two noise widths of a step boundary, noise flips the reading
  back and forth by one step; elsewhere the reading stays still. With noise of 0.006 to
  0.02 m/s², that is 24 to 80% of axes, and 56 to 99% of phones flicker on at least one axis
  (R1's arithmetic, A2). The site says the same: "at rest, most phones flicker by one step in at
  least one direction" (Reading a seismogram; Phone Bench's guide), and Phone Bench reports
  each axis's share of flicker. On a flickering axis, shaking well below 0.05 m/s² changes how often
  the reading flips, so the phone can *detect* weak shaking there; on a still axis, shaking
  under 0.05 m/s² doesn't show at all. Which axes flicker depends on exactly how the phone lies.
- **So how the phone lies matters.** On Chrome the bench report's "noise" mostly measures how
  close each axis sits to a boundary, not the sensor; the report therefore also gives, per
  axis, the share of readings off the resting value. In P2 a phone's detection distance depends
  on how it lies: the card adds an orientation check before each take (the same phone, flat,
  same spot) and makes "move the phone a little and try again" part of the lesson.
- **Strength near the step is poor either way.** A detected flicker is a yes, not a size. A
  peak is read to ±0.05 m/s²: ±30% at 0.17 m/s², ±10% at 0.5 m/s².
- **P2 and P3 depend on it.** P2 becomes "the phone loses the drop somewhere below about
  0.05 m/s², depending on how it lies", still a fair lesson about the two instruments (at
  10 Hz one step is about 20,000 times the smallest shake a Shake can see, as the site says;
  the half step a still axis needs is about 10,000 times), but the drop distances shrink. P3 needs every
  phone in the ring to measure each hit's *size* well above the step (next).

**How big are the signals?** We found no published measurement, in m/s², of a stomp, a dropped
weight or a sledgehammer at 2 to 40 m. The estimate below is built from four published anchors
(a jackhammer's level at 7.6 m from the federal transit manual, as quoted by Caltrans; the
levels at which people feel vibration; a jump that overloads a Shake at 0.6 m; elephant stomps)
and a standard fall-off with distance. It is uncertain by about a factor of 3 (A2).

| Source | 1 m | 2 m | 4 m | 10 m | 20 m | 40 m |
| --- | --- | --- | --- | --- | --- | --- |
| Jump or stomp (m/s²) | 0.4 to 1.1 | 0.15 to 0.5 | 0.05 to 0.24 | 0.01 to 0.09 | | |
| Sledgehammer-sized hit (m/s²) | | | | 0.01 to 0.1 | 0.005 to 0.06 | 0.002 to 0.03 |

A rule of thumb from the perception levels: **if students can just feel a hit through their
feet, it is near 0.1 m/s²**; if they can't feel it, a Chrome phone will at best flicker. So:

- **P1:** stomps at 1 and 2 m clear the step; 4 m is borderline, which makes a good lesson.
- **P2:** Chrome phones should lose the dropped weight at about 2 to 5 m, varying with how each
  lies; unrounded phones somewhat farther. The Shake sees it far beyond that, which is the
  card's point.
- **P3 as written is unlikely to work on Chrome phones.** Across most of a 10 to 40 m ring the
  hits are at or below the step, and at 20 to 30 m at or below the phones' own noise even
  without rounding. From rounding alone, a ranking within ±30% needs about 0.2 m/s² at every
  phone; that is a planning number, not a tested threshold, and T3 measures the real one by
  device model (2.6). A ring of about 3 to 8 m with jumps is more plausible, but there the
  distances are about one wavelength of the ground's surface waves (5 to 14 m at 20 Hz, at 90 to
  270 m/s), and the questions document's Appendix B3 notes that shaking fades steadily only over
  many wavelengths.
- **P4, P5:** a phone on a spring or a hand-driven table moves at 0.5 to 3 m/s², 5 to 30 times
  the step, and at 1 to 5 Hz, so 60 readings a second give 12 to 60 per cycle. Published
  classroom work at 50 to 100 readings a second matched reference timers within about 1% in
  frequency. Rounding only cuts off the tail of a decay: count cycles, not spectrum peaks.

### 2.3 The page must stay in front with the screen on

Every engine stops motion events when the page is hidden: the screen locks, the phone sleeps,
or the student switches app or tab (the W3C documents require it; Chrome, WebKit and Firefox
all do it). There is no background recording on the web.

- **Keep the screen awake** with the Screen Wake Lock API (Chrome 84, Safari 16.4, Firefox
  126). The lock is dropped whenever the page is hidden, and the system can refuse it in power
  saving, so the page asks again when it becomes visible and shows "screen may sleep" if
  refused. A phone on a spring (P5) or in a tower (P4) cannot be tapped, so the page needs a
  start delay and an end time, and must keep the screen on throughout.
- **Gaps must show.** If a recording pauses, the page marks the gap (no readings for more than
  a few intervals), rather than joining the two pieces as if continuous. This matches how our
  apps already treat missing seismic data (`Trace` arrays carry NaN in gaps,
  `docs/app/js/lib/signal.js`).
- **Don't scroll while recording.** On iPhones, motion events stop for seconds at a time while
  the page scrolls (WebKit bug 329556, filed the same day as 329553 and also tracked in Apple's
  internal bug system). The recording view must fit on one screen.
- iOS Low Power Mode: no source found on whether it slows motion events. T1 checks.

### 2.4 The microphone

P6 and the clap extension need the microphone's samples with the device's voice processing
turned off as far as the browser allows, because echo cancellation, noise suppression and
automatic gain are built for speech and can swallow or reshape short loud sounds. What a page
gets is **the samples the browser delivers**, not a guaranteed raw signal.

- **Asking for processing off.** The page requests `echoCancellation`, `noiseSuppression` and
  `autoGainControl` all false. These are requests the browser may not grant, and even granted
  settings don't promise that the system adds no processing of its own. The page shows what it
  asked for and what `track.getSettings()` reports, side by side.
  - Chrome on Android supports all three settings (compatibility data).
  - Safari on iOS supports only `echoCancellation`; turning it off makes WebKit use Apple's
    plain audio input instead of its voice-processing unit, so on iPhones the three kinds of
    processing go together (WebKit's source).
  - Chromebooks: the three settings turn off Chrome's own echo cancellation, noise suppression
    and gain control (Chromium's source). They do **not** turn off ChromeOS's system "Noise
    cancellation" (or "Studio-style mic" on Chromebook Plus), which some Chromebooks apply to
    the built-in microphone: in Chrome's default build the stream follows the user's Quick
    Settings switch, because Chrome's per-stream control of it is behind a feature that is off
    by default; and a source comment says one noise canceller can be switched on by the school's
    admin policy whatever the switch says. Not yet confirmed on a device: T1 records a steady
    sound with the switch on and off. Until then, the card tells teachers to turn Noise
    cancellation and Studio-style mic off in Quick Settings.
- **Capture.** An AudioWorklet (Chrome 66, iOS 14.5) hands the page the samples the browser
  delivers, uncompressed. Not MediaRecorder, which saves lossy compressed audio (AAC on Safari,
  Opus on Chrome) with an encoder delay, and which has an open iOS bug that stalls the
  microphone when started outside the tap's handler (WebKit 325916).
- **Validate per browser in T1.** A clap at a fixed distance and loudness, repeated: is the
  onset sharp, does the level stay the same from clap to clap (no gain "pumping"), and is a
  sweep's response flat?
- **Rate.** iPhones run at 48,000 samples a second (bug reporters, not Apple). Android rates
  were not found; the page reads `AudioContext.sampleRate` and T1 logs it.
- **Permission.** HTTPS only. Safari on iOS asks again after every reload unless the student
  sets the site to Allow in Safari's website settings; in a home-screen web app it forgets even
  more often, so the recorder runs in a normal Safari tab. Chrome on Android offers "Allow while
  visiting", "Allow this time" and "Never". On managed Chromebooks the microphone prompts by
  default; a district can pre-approve our site without a prompt (`AudioCaptureAllowedUrls`) or
  block the microphone entirely (`AudioCaptureAllowed`).
- **Side effect on iPhones.** With echo cancellation off, any sound the page plays comes out of
  the quiet earpiece (WebKit 326286), so a "go" beep is a bad idea; use a visual countdown.
- **Microphone and motion at once on iPhones:** no source either way. Separate tests in Phone
  Bench; T1 tries both together by hand.
- **Privacy by design.** A few seconds in a ring buffer in memory; the page keeps only onset
  times and loudness, never audio (section 4).

**Timing a clap without shared clocks** (the P3 extension, A3): each phone counts the samples
between a reference clap at a known spot and the test clap, in one unbroken recording. The
unknown clock offsets cancel, and the error is set by how sharply the onset can be picked (our
assumption: about 0.1 ms, 5 samples) and how far the sound card's clock is off (our assumption:
20 to 100 parts per million). T2 measures both, and checks whether audio is ever dropped
between the claps, which would break the method.

### 2.5 Measuring each phone's real rate and jitter

The page measures, not assumes (questions document, Appendix B6). From a 30 to 60 s take with
the phone at rest on a solid table, it reports, using only numbers it already has:

| What | How | Why |
| --- | --- | --- |
| Readings per second | Number of events ÷ time between the first and last | The headline number; expect about 60 |
| Timing jitter | Spread of the gaps between event time stamps (median, and the 1st to 99th percentile) | Timer irregularity; a time stamp is good to 0.1 ms (Chrome) or 1 ms (Safari and Firefox) |
| Dropped readings | Gaps longer than 1.5 times the median | Busy phone, or page briefly hidden |
| Repeated readings | Consecutive identical values on all three axes | The 60 Hz timer copying a sensor that updates more slowly |
| Value step | Smallest non-zero change between consecutive readings, and whether all values sit on multiples of 0.1 m/s² | Detects rounding, so the page can say which kind of phone it is |
| Flicker, per axis | Share of readings that differ from the axis's most common value | On rounded phones: which axes can detect weak shaking (2.2) |
| Noise | Root mean square of each axis after removing the mean | Unrounded phones: the sensor's noise. Rounded phones: mostly how close the axis sits to a step |
| Sign and scale | Mean of `accelerationIncludingGravity` face up, then face down (P1) | Checks 9.8 m/s² and the sign |
| False low notes | A 40 Hz tone from a speaker under the phone: where does the peak land in the spectrum? | 40 Hz read 60 times a second folds to 20 Hz unless the phone filters it |
| Wall-clock offset | Difference between the phone's clock (`Date.now()`) and the page's own timer, at start and end | Only needed for matching hits by clock across phones (P3) |
| Device | Browser and system version as the browser reports them | The rounding and rate results are per engine and version |

Phone Bench (live) reports all of these except the 40 Hz test and the wall-clock offset
(5.1); its version of the device line is the browser's own description (user agent). The
arithmetic is in `docs/app/js/lib/bench.js`, with `node --test` tests, like the apps' other
`lib/` modules. To use the apps' existing tools (spectrum, spectrogram,
filters), the page resamples a take onto an even grid at the measured rate, with NaN in gaps,
which is the apps' `Trace` format.

### 2.6 One strength measure, defined before it is compared

P3 (and P2's strengths, and the Shake experiments S10 to S14) compare "how hard the ground
shook" across devices. That only works if every device measures it the same way. Proposed
definition, to be fixed before T3 and used unchanged through it:

| Step | Rule | Why |
| --- | --- | --- |
| Placement | Screen up, flat, case off (or the same case on all), held down by a standard weight (a 1 kg sandbag) on the same kind of surface, at marked spots | Coupling differences can be as large as the signal differences |
| Axis | Vertical = each reading projected on the gravity direction measured over the 2 s before the event; horizontal = the size of the rest | Phones lying differently become comparable; vertical is what a Shake records |
| Baseline | Subtract the mean of those 2 s | Removes gravity and offsets |
| Band | Filter to 2 to 25 Hz before measuring | Below 2 Hz: tilt and handling. Above 25 Hz: the sampling scatter of A1 and folded frequencies |
| Window | Fixed: 0.1 s before the detection to 0.9 s after | The same length for every device, so energies compare |
| Measure | Root mean square of the vertical, band-passed acceleration over the window, in m/s²; also the peak and the horizontal value for reference | The energy measure of A1, in units students know |
| Detection | Window value at least 3 times the baseline's, or readings off the resting value by 2 steps or more | Works on flickering and still axes |
| Quality flags | Steps: fewer than 4 distinct values in the window ("at the rounding limit"); Moved: the means before and after differ by more than 0.2 m/s²; Clipped: any reading at the sensor's limit; Gap: readings missing in the window | A bad reading is flagged, not averaged in |

For location, the Hit Locator uses only hits that every phone measured without a flag. T3
reports repeatability (5 hits at one spot) and detection rate against distance **by device
model**, rather than assuming one threshold for all phones.

**One module for phones and Shakes.** The same definition should serve P3's experiment mode for
the Shake (S10 to S14), so S10 and P2 compare like with like (R1's shared point). A Shake records
velocity; the shared module differentiates it to acceleration before applying the same band,
window and measure. A proposal for P3 and M1; one owner, one module.

**Event file.** Each detected event is one CSV row: event number, device label, browser and
version, time by the phone's clock, window start, vertical value, horizontal value, peak,
distinct values, baseline value, flags.

## 3. Getting data out with no logins

Section 1 showed that most cards need only a handful of numbers to leave the phone. So the
question is less "how do we move recordings" than "what is the simplest path for each card".
Eight options, from least to most machinery:

| Option | How it works | Privacy cost | Effort (Claude) | Serves |
| --- | --- | --- | --- | --- |
| **1. Read it off the screen** | The phone shows its results (rate, strength of each hit, bounce times); students write them on a worksheet or type them into a page on one device | None beyond the room | None beyond the on-phone analysis | P1, P2 (simple), P3 (10 to 60 numbers into the Hit Locator), P4, P5, P6 |
| **2. Download a CSV file** | `<a download>` of a file made in the browser (the apps already do this: `downloadCsv` in `docs/app/js/ui/page.js`). Lands in Files › Downloads on iPhones (iOS 13+), Downloads on Android | Low: the file stays on that device. Moving it on is up to the school's own tools (a school Drive account, a cable, AirDrop between Apple devices) | Very small | P2 (spectrum), P4 (response curve), research track, keeping evidence |
| **3. Share sheet** | `navigator.share({files})` from a tap, on iPhones (iOS 14+), Android Chrome and Chromebooks. Chrome shares CSV, TXT and WAV, **not JSON**; 10 files, 50 MiB at most | Low to medium: the student picks where it goes (Messages, mail, Drive), which may be a personal account; we can't control that | Small | As option 2, with an easier path to a teacher's device |
| **4. QR code with a short result** | The phone draws a QR code of its results (numbers and a device label only). Either (a) a link to our Hit Locator with the numbers after `#`, which a camera opens; or (b) the Hit Locator scans it with a camera | Local: nothing is sent to a server (the part after `#` never leaves the browser), but the link stays in the receiving browser's history and anyone using that device can see it. Never names; the card says to clear the history after the lesson | S (1 to 2 days): a vendored generator (MIT), and for (b) a decoder: built in on Chrome for Android and Chromebooks, a library on iPhones (jsQR, Apache-2.0) | P3, P4 pairs, if typing turns out too slow |
| **5. Keep it in the browser** | localStorage (5 MiB) or IndexedDB on the phone | Low, but a shared classroom phone shows the last group's data until cleared (labels only, so no names) | Small | Surviving a reload in a lesson; a phone's own history |
| **6. Load a phone's file into our other apps** | `<input type="file">` on any device reads the file with no upload. **One shared file reader**, built with P3's day viewer (V1) and owned there; P4 adds only an adapter that turns the phone's CSV into the apps' `Trace` format | None beyond options 2 and 3, which bring the file | The adapter: S (under 1 day). The reader itself is counted once, in P3's V1 | P2 (phone and Shake on one plot), P4 (roof against base), research track |
| **7. A live link between devices in the room** | WebRTC directly between phones, set up by exchanging two QR codes (a measured offer is 587 characters, about QR version 17); or Bluetooth, NFC or data over sound | None if it works | L, and fragile | P3 as a live class display |
| **8. A relay server with a room code** | Phones send results to a small DRI server; the teacher's screen collects them | High: data pass through DRI's systems, tied to a code, a school and a time | L, plus a server to run (GitHub Pages can't) | P3 live, a class data wall |

Why options 7 and 8 are out:

- **Live links (7) mostly need a server or a friendly network.** WebRTC needs the two ends to
  swap connection details somehow; doing it by QR code works on paper but takes two scans per
  phone. Browsers hide local network addresses behind generated names, which the other device
  must resolve on the same network, and school Wi-Fi often stops devices from talking to each
  other at all (Cisco Meraki's client isolation "prevents wireless clients from communicating
  with one another", and is always on in its NAT mode, a common setup for guest and
  bring-your-own-device networks). Web Bluetooth cannot connect two browsers (a page can only be
  the "central" side), and iPhones don't support it; Web NFC is Android-only with no
  phone-to-phone mode; data over sound (ggwave, MIT) moves 8 to 16 bytes a second, enough for a
  short code but slow in a room full of hammering. AirDrop and Quick Share work only within one
  family, and Quick Share is off by default on managed Chromebooks.
- **A relay server (8) is "uploading"** in the sense that matters for R277-487 (section 4), and
  would be the first server the project runs for students. Not for a proof of concept; revisit
  only if Dale and Cleat want live class displays, and then as a DRI decision after the LEAs'
  privacy review.

**Browser storage is a buffer, not a place to keep data.** Safari deletes everything a site
stored after seven days of Safari use without a visit to that site; a home-screen web app keeps
its own, separate storage; managed Chromebooks can be set to wipe site data when windows close
or at logout; private browsing keeps nothing. Students export or write down results before they
leave.

**Recommended path:** results on screen and typed numbers first (option 1), which serves every
card; a CSV download, offered through the share sheet where the browser has one (options 2
and 3); the phone-CSV adapter when P3's shared file reader exists (option 6); QR codes only if
trials T2 and T3 show typing is the bottleneck (option 4). No live links, no server.

**File format.** CSV, because students can open it in a spreadsheet (CS 9/10.DA.3) and Chrome
can share it. Comment lines starting with `#` at the top, as in Quake Locator's CSV: the label
("Phone B", never a name), start time by the phone's clock, browser and version, measured rate,
jitter, value step, flicker per axis, and the line "Recorded with the UHSN Phone Recorder" (phone
data need no network credit); then either one row per reading (time in ms from the start; x, y,
z with gravity) or one row per event (2.6). Ten minutes at 60 readings a second is 36,000 rows,
about 1.4 MB.

## 4. Policy

Re-read for this revision from the current texts (2026-11-25; quotes in phone-sources.md): Utah
Code 53G-7-227 as now in force (effective 2026-07-01), the enrolled S.B. 69, Utah Code
53G-7-228 (enacted 2026, effective 2026-07-01), the definition of an LEA in 53E-1-102(9), and
State Board rules R277-495 and R277-487. This is a planning reading, not legal advice; each LEA
interprets its own policies.

### 4.1 The phone law: Utah Code 53G-7-227

- **The rule.** "Except as provided in Subsection (3), a student may not use a cellphone, smart
  watch, AI glasses, or emerging technology at a school during school hours", bell to bell,
  lunch and passing time included. S.B. 69 made it bell to bell from 2026-07-01; the code as
  now published also adds "AI glasses" (S.B. 69 itself does not contain them; R1 traces them to
  H.B. 42) and reletters the definitions, so "cellphone" is now (1)(b).
- **What a cellphone is.** "A handheld, portable electronic device that is designed to be
  operated using one or both hands and is capable of transmitting and receiving voice, data, or
  text communication by means of ... any other wireless technology." That describes the
  device's design and capability, not who owns it or how it is used: a school-owned or DRI
  loaner phone on Wi-Fi counts, and so does a phone taped to a table. The exclusion for "school
  provided or required devices" applies only to "emerging technology", not to cellphones.
- **Only the LEA can allow other uses.** Besides the required exceptions (emergencies, SafeUT,
  IEP and 504 plans, medical need, a parent's request), "an LEA ... may establish a policy that
  provides for other circumstances when a student may use a cellphone". A school or a teacher
  cannot make that exception. An LEA is a school district, a charter school or the Utah Schools
  for the Deaf and the Blind (53E-1-102(9)).
- **Wasatch Academy is probably outside the law.** It is a private school, not an LEA, and the
  section sits in the public-education code with its duties placed on LEAs. Its own policy
  governs (the questions document: it "sets its own policy"). Confirm with the school; if it
  agrees, it is the first place students can try the phone cards (T1b, 5.2).

### 4.2 The State Board's device rule: R277-495

"Electronic Devices in Public Schools", effective 2025-10-08 and not revised since S.B. 69 (no
amendment in process on the Board's list, 2026-11-25). It covers public schools only.

- **It covers more than phones.** An "electronic device" includes "any other type of computer
  or computer-like instrument", LEA-owned or privately owned, so school Chromebooks and lab
  sensors fall under each LEA's device policy and acceptable-use policy.
- **No required personal devices.** LEA policies must include a "prohibition on requiring the
  use of a privately-owned electronic device to complete course work" (4(2)(g)). Every phone
  card needs a path with no personal phone (4.4).
- **Telling parents.** "Each educator who allows the use of a personal electronic device in the
  classroom clearly communicates to parents and students the conditions" (5(2)(b)).
- **Privacy in the room.** LEA policies must include "prohibitions or restrictions on
  unauthorized use that would cause invasions of reasonable expectations of student and employee
  privacy" (4(5)(a)): the rule a district will apply to any microphone use.

### 4.3 The new classroom-technology law: Utah Code 53G-7-228

Enacted in 2026 (H.B. 273), in force since 2026-07-01:

- "Before an LEA allows a public school to use an instructional technology in the classroom, the
  LEA shall ensure that instructional technology is" of significant educational value, free of
  distracting design features, safe, effective, "not used as a substitute for instruction", and
  "compliant with ... Title 53E, Chapter 9, Student Privacy and Data Protection". "Instructional
  technology" is "technology an LEA issues to a student", including "a digital tool" or "a
  digital application".
- The State Board posts a model policy before 2026-12-01; each LEA adopts one before
  2027-07-01, including "transparency with parents regarding instructional technology use".
- **This may reach every app on our site, not just the phone recorder,** whenever a public
  school uses it on LEA-issued Chromebooks. Whether a free website counts as technology "an LEA
  issues to a student" is the LEA's call. A project-wide question for Gus and M1 (6.4).

### 4.4 What each kind of device needs

| Device | Phone law (53G-7-227) | Other rules | Usable for |
| --- | --- | --- | --- |
| A student's own phone | Covered: needs an LEA policy allowing teacher-directed use | R277-495: can't be required; the teacher tells parents the conditions | Optional only, never required |
| A school or DRI loaner phone | Covered: needs the same LEA policy | R277-495 and the LEA's acceptable-use policy | The classroom set path |
| A school tablet (iPad) | Probably covered: handheld, wireless data. The LEA decides | As above | As loaner phones |
| A school Chromebook | Not covered: a laptop is not a handheld device (a tablet-style Chromebook is for the LEA to classify) | R277-495, the LEA's device and microphone settings, 53G-7-228 approval | Microphone cards (P6, clap extension) |
| Lab sensors (Vernier, PASCO, micro:bit) | Not cellphones (6.1) | R277-495 as computer-like instruments; 53G-7-228 if issued to students | P4, P5, research; see 6.1 |
| The teacher's own device | Outside the rule, which restricts students | The LEA's employee policies | Demonstrations of P1 and P5 |
| Any device at Wasatch Academy | Probably outside (private school) | The school's own policy | All cards, if the school agrees |
| Any device in an after-school club | Outside "school hours" if after the last bell; an LEA "may" extend restrictions to school-supervised activities | The LEA's policies | All cards, where the LEA allows |

### 4.5 Privacy: "nothing uploaded" simplifies the review but doesn't replace it

**The data flow, precisely:**

- Loading the page: GitHub Pages receives an ordinary web request (the device's network address,
  browser, time) and may keep the usual server logs, as for every page on the site.
- While recording: readings and audio stay in the page's memory on the device. The page sends
  nothing and loads nothing from other servers (libraries are vendored, D5).
- Audio: a few seconds in a ring buffer; only onset times and loudness are kept; no audio is
  ever saved or sent.
- Afterward: results on screen; a CSV only if the student saves or shares one, and then it goes
  where the student sends it (option 3); browser storage on that device (option 5).
- Labels: "Phone A", a table number or a class code; the page tells students not to type a name
  and saves no free-text field.

**What that settles and what it doesn't.** We collect nothing, so there is no data on our side
to protect or to hand over. But a recording can still become student-linked in the classroom (a
named file, a worksheet, a photo of a screen), the host still sees ordinary web requests, and
R277-487 puts data-privacy duties on the LEA, while 53G-7-228 requires the LEA to check privacy
compliance before using any instructional technology. So **an LEA privacy and security review
is a required step before students use the recorder**, with this data-flow description as our
input. Whether any agreement is needed is the LEA's decision; this review does not assert one
either way. R277-487 is in force since 2025-07-08, with no amendment in process (Board list,
2026-11-25).

**Parent notice.** Even where it is allowed, a short note before the first phone lesson: what
the page does (reads the motion sensor or the microphone while the page is open); the data flow
above; that microphone mode keeps only the times of loud sounds, not audio; that no personal
phone is required and what students without one use; and whom to ask. It serves R277-495-5(2)(b)
and 53G-7-228's parent transparency. A template goes with each phone card.

## 5. Effort

Three kinds of time, kept apart: **Claude session-days** (writing and testing code and pages,
with Gus reviewing), **DRI staff days** (devices, trials, visits), and **teacher and school IT
time** (class periods, device settings, approvals). Sizes S, M, L refer to Claude session-days.

**Calibrating against this repository.** Quake Locator's first build took a day (one commit on
2026-11-23), then most of another day of review additions, navigation, renaming and spelling
(12 commits on 2026-11-24). Quake Explorer's first build took a day (2026-11-24), then three
follow-up sessions (the band hint, clear-S notes, small fixes). So a finished tool costs about 2
to 3 times its first build, plus Gus's review time. The estimates below include that.

Device testing, not coding, sets the pace: every check needs a person holding a phone, and both
motion sensors and the microphone need HTTPS.

**Testing on phones before a change reaches `main`.** Pages deploys from `main`, so:

- Android: a USB cable with port forwarding (`adb reverse`) makes the laptop's server look like
  the phone's own localhost, which counts as secure.
- iPhones, three routes, none needing `main`:
  - **A local certificate (mkcert).** mkcert makes a certificate authority on the laptop; its
    root certificate is installed on a *dedicated test iPhone* (the README's steps: install the
    profile, then Settings › General › About › Certificate Trust Settings › full trust). The
    laptop then serves the page over HTTPS on the school or home network. Needs a small HTTPS
    variant of `tools/serve.mjs` (today plain HTTP on 127.0.0.1 only) and a firewall
    allowance. No third party; the authority's private key must never leave the laptop.
  - **A Cloudflare Quick Tunnel** (`cloudflared`): no account; gives a temporary
    `https://….trycloudflare.com` address for the laptop's local server. Cloudflare's own
    terms: "for testing and development", no uptime guarantee, 200 requests at a time, a new
    address each run, and anyone with the address can reach it while it runs. Fine for adult
    testers and no student data; a school network may block it.
  - **A second GitHub repository with its own Pages site** for previews (HTTPS automatically).
  Recommended: mkcert for routine work, a tunnel for a quick check from anyone's phone.
- Safari's own remote debugger needs a Mac; Gus's machine runs Windows. Free Windows routes
  exist (Google's open-source ios-webkit-debug-proxy, and ios-safari-remote-debug-kit, GPL-3.0),
  but the simplest is the page's own on-screen log.

### 5.1 The bench page: Phone Bench (live, the T1 instrument)

**Where:** All apps → "In development: please test" → Phone Bench (`app/phone-bench/`; guide
`apps/phone-bench.md`; developer notes `developers/phone-bench.md`). For adult testers only; the
guide says classroom use needs the district's policy.

**A T1 take** (the guide's steps): lay the phone flat on a solid table, screen up; press Start
(on an iPhone, Allow); hands off for 30 s; tap the table 5 times when the label says so; an
optional 5 s microphone test with one clap; then **Copy results** (or Share) and email them to
Gus with the make, model and system version. The guide's "Extra checks" cover saying no once,
locking the screen mid-take, Low Power Mode or battery saver, an old phone or school tablet, and
running twice on an iPhone. Nothing is uploaded; the CSV of every reading stays on the device
unless Gus asks for it.

**What it reports, against this review's specification:**

| This review asked for | In Phone Bench |
| --- | --- |
| Start button; permission asked inside the tap, wherever `requestPermission()` exists | Yes; the results give whether it asked, the answer and the time to it |
| Live 3-axis trace on one screen, no scrolling | Yes, with instructions written on the plot (D35) |
| Readings per second, jitter, dropped and repeated readings | Yes |
| Value step (rounding) and flicker per axis | Yes ("Rounding step", "Flicker at rest") |
| Noise, resting values (sign and scale), browser | Yes (face up only; the face-down check is P1's) |
| Screen wake lock; page hidden during the take | Yes |
| Microphone sample rate; requested voice processing off and what was granted | Yes |
| Copy or share results; CSV download; an on-screen log | Yes |
| Taps detected, with their size | Yes: the largest distance from rest (a peak), not the 2.6 measure |
| An event list with the 2.6 strength measure and its flags | **Not yet** (needed for T3; also useful in T2) |
| Microphone onset times at sample resolution | **Not yet**: the bench folds sound into 0.1 s blocks (needed for T2's clap test) |
| A spectrum of a take and the 40 Hz test | **Not yet** (planned for after T1) |
| Generic Sensor API time stamps on Chromium | **Not yet** (planned for after T1) |
| ChromeOS noise-cancellation comparison; microphone and motion together | **Not yet**: run by hand in T1 (5.3) |

So **T1 runs on Phone Bench as it is**; **T2 and T3 need the additions** marked "not yet",
which D10's developer notes already list for after T1.

| | Claude session-days | DRI staff days | Teacher and school IT |
| --- | --- | --- | --- |
| First build (D10, done) | S: about 1, plus integration | — | — |
| Fixes after T1a | S: about 1 | — | — |
| Additions for T2 and T3 (event list with the 2.6 measure, microphone onsets, spectrum and 40 Hz test) | S: 1 to 2 | — | — |
| Total to "T3-ready" | **S: about 2 to 3 more** | — | — |

**Owner after T1** (proposed): the code stays with the master session, which assigns D sessions
for fixes and the T2/T3 additions; a named DRI staff member leads the trials and collects the
results testers send (today they go to Gus). After the trials Phone Bench either becomes the
start of the Phone Recorder or stays as a test page. Gus decides.

### 5.2 Trials

| Trial | Where and who | Claude session-days | DRI staff days | Teacher and school IT | Decides | Pass, roughly |
| --- | --- | --- | --- | --- | --- | --- |
| **T1a Devices, adults** | **Phone Bench as it is**, by the guide's steps and its "Extra checks", results emailed to Gus. Gus and DRI colleagues' own phones, plus school iPads or Chromebooks on loan: 10 or more devices | 0.5 (reading reports) | 0.5 to 1 (gathering devices, running, sending reports) | None | Whether each engine does what its code says: rate, jitter, rounding per version, flicker, sign, permission flow (including a "Deny" and recovery), wake lock, Low Power Mode, microphone settings, microphone and motion together | Most devices give 50 or more readings a second with few gaps; the iOS permission flow can be explained in one line |
| **T1b Devices, a class** | Phone Bench, once it graduates from "In development" or with the school's agreement to use a prototype. **Wasatch Academy first**, under its own policy; a public school only after its LEA allows it (section 4) | 0.5 | 1 (visit, supervision) | One class period; teacher preparation about 1 hour; school IT 1 to 2 hours (device settings, Wi-Fi, microphone policy) | The same on the devices schools actually have, including managed iPads and Chromebooks | About 3 in 4 student-path devices work |
| **T2 Tabletop** | Phone Bench with the event list and microphone onsets added (5.1). Indoors, 4 phones, adults | 0.5 | 0.5 | None | P3's table demonstration; the clap extension | The table result is as Appendix B3 predicts (the middle shakes most); clap located within about 10 cm |
| **T3 Schoolyard** | Phone Bench with the 2.6 event list added (5.1). Outdoors beside a Shake; adults swing the sledgehammer. Needs the Shake's record for the same minutes: P3's day viewer (V1) if built, otherwise DataView (if the Shake shares data) or the Shake's own web page | 0.5 to 1 | 1 to 1.5 (equipment, 2 hours on site, safety) | Grounds access; a staff contact for about 1 hour | P2's drop distances; P3's ring (the card's 10 to 40 m and a 3 to 8 m ring with jumps); repeatability and detection by device model (2.6) | Every phone in the ring reads at least 0.2 m/s² on Chrome (planning number); phones on one spot agree within ±30%; strength falls steadily with distance |
| **Total** | | **S: about 2 to 3** | **3 to 4** | **About 1 class period, 2 to 3 hours of IT and staff** | | |

### 5.3 Device checks for T1

Phone Bench's results and "Extra checks" cover most of this list; the rest (the 40 Hz test,
the ChromeOS noise-cancellation comparison, microphone and motion together, sharing a CSV) is
done by hand in T1 or waits for the additions in 5.1. From the source review: on Chrome, values
only in steps of 0.1 m/s²; on iPhones, finer steps or not, by iOS version; flicker per axis at rest; events per second and spacing; face-up sign of
`z` on Android and iOS; iOS prompt on first tap, no prompt on reload, a prompt again after
quitting Safari, and recovery after "Deny"; wake lock on each device, and in Low Power Mode or
battery saver; locking the screen mid-take and seeing the gap marked; microphone requested and
actual settings, onset sharpness, steady level and a flat sweep; ChromeOS system microphone
effects (2.4); `AudioContext.sampleRate` on each Android; microphone and motion together on an
iPhone; whether managed Chromebooks have motion sensors at all and allow the microphone;
downloading and sharing a CSV on each device.

### 5.4 A classroom-ready tool (L, after the gates below)

| Piece | What | Claude session-days | DRI staff days | Teacher and school IT |
| --- | --- | --- | --- | --- |
| Phone Recorder app | Modes for the chosen cards: live, calibrate (P1), record with event list (P2, P3), spectrum and ringing (P4, P5), bounce timer (P6, microphone); a results panel per card; CSV and share; recovery messages for each permission state; tested on the T1 devices | M: 4 to 6 (first build 2, finished ×2 to 3) | 1 (testing on real devices) | — |
| Docs, per the site's conventions | Hub page with "At a glance", student guide with screenshots (the rounding explained), All apps and menu entries, developer page, architecture tree, README; standards crosswalk rows (PHYS.1.2, PHYS.1.3, ESS.2.6 are not in it yet) | S: 1 to 2 | — | — |
| Activity cards | One per chosen P card, each with the rounding reminder and a link to "How small a shake can it see?" (D36, `adding-a-card.md`), a parent-notice template and the no-personal-phone path | M: 3 to 4 for four or five cards | 1 (review with Dale and Cleat) | A teacher's review, about 1 hour per card |
| Strength module | 2.6, shared with P3's experiment mode; counted once, with whichever lands first | S: 1 | — | — |
| Phone-CSV adapter | Onto P3's shared file reader (V1) | S: under 1 | — | — |
| Hit Locator (P3) | Typed (or QR) strengths from 3 to 8 phones; a grid search for the spot whose distance pattern best fits, reusing Quake Locator's grid search and "place your own" pin; how well it fits | M: 3 to 5, only after T2 and T3 | 0.5 | — |
| QR transfer | Generator on the phone, scanner or link on the receiving page | S: 1 to 2, only if needed | — | — |
| LEA review material | A one-page data-flow and privacy description (4.5) for each LEA's review | S: 0.5 | 0.5 to 1 (sending it, answering questions) | The LEA's review time (calendar weeks; little effort from us) |
| **Total** | | **L: about 14 to 21** (13 to 20 without QR) | **About 3 to 4** | **Per school: 2 to 4 hours of IT (settings, allow-lists); teacher preparation about 1 hour per card the first time** |

**Running it afterward** (operating effort, per year once in classrooms): DRI, about 1 hour a
month per classroom phone set (charging, updates, clearing data) if DRI lends sets; Claude,
about 1 to 2 session-days a year to follow browser changes (permission prompts, rounding on
iPhones) and re-run the bench report; schools, the IT settings each new school year.

### 5.5 Order and gates

1. **Phone Bench** (live).
2. **T1a** with adults' phones, on Phone Bench as it is. **Gate A:** each engine behaves as its code says (2.1, 2.2), rate
   and jitter are usable, and the rounding, flicker and detection are measured on real stomps
   and drops.
3. **Dale and Cleat choose phone cards** (question 7), **and a school can run them**: Wasatch
   Academy under its own policy, or a public school whose LEA has allowed teacher-directed use
   and reviewed the tool (section 4).
4. **Phone Bench's additions for T2 and T3** (S, 5.1), then **T1b, T2, T3.** **Gate B:** some ring size passes T3 with the 2.6 measure (repeatable within
   ±30% on one spot; strength falling steadily with distance; detection by device model known).
5. **Classroom-ready recorder and the chosen cards**; the Hit Locator only after Gate B; the
   phone-CSV adapter once P3's reader exists.

### 5.6 When to stop

- **Dale and Cleat choose no phone card** (or don't answer by the default date, 5.7). Stop with
  Phone Bench as it is; keep it in "In development" for adult testers and teacher
  demonstrations, or retire it.
- **No school can run phone cards**: Wasatch Academy declines and no Phase I LEA allows
  teacher-directed use. Keep the microphone card (P6) on Chromebooks where the LEA approves it,
  and teacher demonstrations of P1 and P5; stop the rest.
- **T1 fails on the devices schools have**: fewer than about 3 in 4 give 50 readings a second
  with few gaps, or school-managed devices block motion or the microphone and IT won't change
  it. Stop the motion cards on those devices.
- **T3 fails for P3** (our estimate says it is likely to at 10 to 40 m): no workable ring size
  gives repeatable strengths on Chrome phones. Drop the outdoor ring; keep P3 as the tabletop
  demonstration and a discussion of why seismic networks use real seismometers. P2 survives as
  a lesson about detection distance.
- **The platform fights back**: if Phone Bench's fixes and additions take more than about 4 more
  Claude session-days to run reliably on both iPhones and Android, stop and reconsider (phyphox
  for clubs, lab sensors, 6.1).

### 5.7 Waiting on others: dates and defaults

Every outside answer gets a proposed date and a default that applies if no answer comes. The
dates are proposals for Gus.

| Waiting on | Question | Proposed date | Default if no answer |
| --- | --- | --- | --- |
| Dale and Cleat | Question 7: are phone activities worth pursuing; a classroom set of old phones? | 2027-01-15 | No classroom phone cards; Phone Bench stays in "In development" for adult testers and teacher demonstrations |
| Wasatch Academy | Will it host T1b to T3 with students under its own policy? | Ask by 2026-12-15; answer by 2027-01-31 | Trials stay with adults (T1a, T2, T3 run by DRI staff); no student trial |
| Each public LEA | A policy allowing teacher-directed science use of phones (53G-7-227(3)(a)(ii)(A)) | Ask with the school inventory (question 4); answer by 2027-03-01 | Students in that LEA don't use phones; teacher demonstrations only |
| Each public LEA | Privacy and instructional-technology review of the recorder (R277-487, 53G-7-228) | With the above | No student use in that LEA, Chromebooks included |
| School IT | Chromebook microphone and motion settings | Before T1b | Assume Chrome's defaults (the microphone asks; sensors allowed) and check in T1b |
| Schools | Which lab sensors does each own (6.1)? | With the inventory | Assume none; build no sensor support |
| P3 (V1 day viewer) | The Shake's record for T3 | When V1 lands | T3 uses DataView or the Shake's own web page |
| Gus | Is phyphox acceptable on school-owned phones for clubs or research (constraint 3)? | Any time | No: browser only, as now |

## 6. Alternatives, risks, open questions and recommendation

### 6.1 Is there something we could use instead?

**An app: phyphox.** If installing is acceptable, phyphox (RWTH Aachen University), a free,
open-source (GPL-3.0) app, does most of what P1, P2, P4, P5 and P6 need, and does it better:

| | A browser page on our site | phyphox |
| --- | --- | --- |
| Install | None: the phone opens our page | An app on every phone (App Store, Google Play, or F-Droid with no Google account) |
| Readings per second | 60 | As fast as the phone allows: its database of about 5,600 phone models clusters at 100, 200, 400 and 500 |
| Value steps | 0.1 m/s² on Chrome; finer on iPhones today | The sensor's own resolution |
| Ready-made experiments | We would build them | Spring, acceleration spectrum, "(In)elastic collision" (bounce height by sound), "Acoustic Stopwatch" |
| Export | CSV | CSV, tab-separated, Excel |
| Accounts and data | None; data stay on the device | None; "Any measured data is only stored on the device running the app" |
| Watching from another screen | Not planned | Over local Wi-Fi, which phyphox itself warns many "professional WIFI setups" block |
| Fit with our cards, credits and site | Built for them | General-purpose; we would write worksheets around it |
| Maintained | By us | Yes (version 1.2.1, September 2026) |
| Project constraint 3 (browser only, no install) | Meets it | Breaks it, unless Gus makes an exception for school-owned phones |

The other phone apps are less suited: Physics Toolbox Sensor Suite (free with paid extras, CSV
export), Arduino Science Journal (free; sharing from an iPhone needs a sign-in), MyShake (an
earthquake-warning app sampling at 25 readings a second, whose triggered data go to Berkeley).
A browser-only accelerometer page with a CSV download is already used in university mechanics
classes (Nishioka and Tanaka, 2026), so the browser approach is proven at a basic level; its
code has no license, so we can't reuse it.

**Lab sensors a school may already own** (R1's addition). They are not cellphones, and their data
reach the page through the sensor's own connection, not through the browser's motion API, so
Chrome's 0.1 m/s² rounding doesn't apply (their own resolution does):

| | Vernier Go Direct Acceleration (GDX-ACC) | PASCO Wireless Acceleration/Altimeter (PS-3223) | BBC micro:bit V2 |
| --- | --- | --- | --- |
| Range | ±16 g (and ±200 g) | ±16 g (and up to ±400 g) | ±2 g by default (up to ±16 g) |
| Resolution | Not published | "0.002 g at 20 Hz" (about 0.02 m/s²) | One step about 0.038 m/s² at ±2 g (the runtime's 10-bit mode); coarser at higher ranges |
| Readings per second | Up to 1,000 | Up to 5,000 | 50 by default; MakeCode can't change it |
| Link to the computer | USB or Bluetooth | Bluetooth only | USB (Web Serial or WebUSB, with a program flashed that prints readings) or Bluetooth |
| On a Chromebook, no install | Graphical Analysis web app: free Basic with CSV export, "no user logins"; or our own page through Vernier's BSD-licensed `godirect-js` | SPARKvue web app: free, CSV export, no student account | Our own page (Web Serial or Web Bluetooth in Chrome) |
| iPhones and iPads | Vendor apps (not checked) | Vendor apps (not checked) | Not from a web page: Safari supports none of Web Serial, WebUSB or Web Bluetooth |
| A "cellphone"? | No cellular radio; links only to a nearby computer | The same | The same (plus a short-range radio to other micro:bits) |

What they would add: the Vernier and PASCO sensors are far better instruments than a phone in a
browser (hundreds to thousands of readings a second, fine resolution), so a school that owns them
can run P4, P5 and research project D with them, and use them beside the phones in P1 and P2. A
micro:bit is cheap and common, but its steps are only about 2.6 times finer than Chrome's and it
reads 50 times a second: fine for P4 and P5, no help for P2's and P3's weak signals. Reading a
micro:bit or a Go Direct sensor from our own page would be about S (1 to 2 Claude session-days)
each; we build neither until the schools say what they own (default in 5.7: assume none).

**Judgment:** phyphox is the better phone instrument, and lab sensors are better instruments
than any phone. Our page's case rests on what neither offers: no install on any phone or tablet
handed out (constraint 3), the microphone cards on Chromebooks, one privacy story with the rest
of the site, and cards written around our activities and the school's Shake. P1 and P2 are
about the phone itself (what is in your pocket, and how it compares with a seismometer), so lab
sensors complement them rather than replace them. Where installing is fine, for an
after-school club or the research track, point students to phyphox; where a school owns lab
sensors, P4, P5 and research project D can use them.

### 6.2 Risks

| Risk | How likely | What it hurts | What we do |
| --- | --- | --- | --- |
| Rounding hides weak shaking | Certain on Chrome; possible on iPhones, no date | P2's distances, P3's ring | Measure in T1 and T3 by engine and version; design the cards around strong signals; the 2.6 measure and its flags |
| Strengths not comparable across phones | Likely without a protocol | P3, the Hit Locator | The 2.6 definition, fixed before T3; report by device model |
| P3's ring signals are below the step or the noise | Likely at 10 to 40 m (our estimate) | P3, the Hit Locator | T3 before building the Hit Locator; a smaller ring; or P3 as a demonstration and discussion |
| 60 readings a second: floor vibration above 30 Hz folds into false low frequencies | Possible | Spectra of stomps on concrete | T1's 40 Hz test; spectra shown only to 30 Hz; also a lesson (like the Shake's 50 Hz limit in E7 and S16) |
| No public LEA allows classroom phone use | High for 2026-27 | All motion cards in public schools | Wasatch Academy; teacher demonstrations; Chromebook microphone (P6); an after-school club |
| LEA reviews (privacy, 53G-7-228) take a long calendar time | Likely | Any student use in public schools, Chromebooks included | Send the one-page data flow early; dates and defaults (5.7) |
| Managed devices block motion, microphone, downloads or sharing | Medium | Any card on those devices | Ask each school's IT (inventory, question 4); T1b on real school devices |
| Donated phones run frozen browsers | Medium | Old classroom sets | T1 logs versions; a short "works on" list |
| Browsers change: Chrome may start asking for motion permission (it already has `requestPermission()`, which answers at once today); iPhones may round | Medium | A page that assumed otherwise | Always a Start button; `requestPermission()` wherever it exists, as Phone Bench does; no design that needs finer steps; a yearly bench-report check |
| iPhone quirks: events stop while scrolling; a "Deny" needs Safari quit; the microphone asks after each reload; page sounds go to the earpiece | Certain | Lesson flow | One-screen recording view; a recovery line on screen; visual cues, not beeps |
| Testing friction: HTTPS on phones, no Safari debugger on Windows | Certain | Development time | On-screen log; Android by USB port forwarding; iPhones as in section 5 |
| Teacher burden: charging, collecting and clearing a phone set | Medium | Adoption | Cards for groups of 4 to 6 phones, not one each; DRI-run sets |
| Voices captured by the microphone | Low, by design | Trust | Keep no audio, only onset times |
| Duplicating a free app or lab sensors | Certain in part | Effort | Keep our scope to what they can't do (6.1) |

### 6.3 What the questions document and the overview should change

For M1, if `planning/activities.md` (and its Word copy) is revised after Dale and Cleat reply:

1. **Appendix B1 and B6:** Chrome rounds motion readings to 0.1 m/s² and caps them at 60 a
   second; Safari caps at 60 and doesn't round today; the W3C Candidate Recommendation Draft
   asks for 0.1 m/s² precision. On Chrome a resting phone flickers by one step on some axes, so
   detection depends on how the phone lies. B1's phone noise of 0.02 m/s² came from a native app
   sampling 400 times a second (Zhang et al.), not from a browser. "Thousands of times noisier"
   (P2): at 10 Hz one Chrome step is about 20,000 times the smallest shake a Shake can see, as
   Reading a seismogram now says.
2. **B6, permissions:** on iPhones the motion permission lasts until Safari quits, and after a
   "Deny" the page can't ask again until then; the microphone asks again after every reload
   unless the site is set to Allow. Safari honors only the echo-cancellation switch, but turning
   it off removes Apple's voice processing.
3. **P3:** the 10 to 40 m ring is likely too large for phones in Chrome (2.2); T3 should test a
   smaller ring as well, with the 2.6 measure. The clap extension works only if each phone times
   a reference clap and the test clap in one recording (A3).
4. **B6, old phones:** current Chrome needs Android 10 or later; iOS 26 and 27 need an iPhone 11
   or SE (2nd generation) or later.
5. **Appendix C, law:** cite 53G-7-227 as now in force ("AI glasses" added, "cellphone" now
   (1)(b)); say that only the LEA can allow other circumstances; add 53G-7-228 (LEA approval of
   instructional technology, parent transparency); R277-495's title is "Electronic Devices in
   Public Schools". **Fix "School Chromebooks ... are not handheld devices"** to: not cellphones
   under the phone law, but R277-495, local device and microphone policies and 53G-7-228 still
   apply. **Add Wasatch Academy** (private, probably outside both) as the first trial site.
   Replace "nothing is uploaded" as a privacy conclusion with the data flow and an LEA review.
6. **Appendix D:** split T1 into T1a (adults' phones, no policy needed) and T1b (a class:
   Wasatch Academy first, a public school after its LEA allows it); T3 after P3's V1, or with
   DataView.
7. **The overview** (`planning/evaluation.md`, section 4.3) says "R277-487 was being amended in
   fall 2026": no amendment is in process on the Board's list (2026-11-25), and the current text
   has been in force since 2025-07-08.

### 6.4 Open questions

For Gus (each has a default in 5.7 where an outside answer is involved):

1. **53G-7-228 for the whole site.** The new law asks each LEA to approve instructional
   technology before classroom use. Does UHSN ask the five schools' LEAs about all our apps
   now, with one short description each? A project-wide decision, not only the phone recorder's.
2. **Wasatch Academy:** may DRI approach the school as the first student trial site for the
   phone cards?
3. **Who owns Phone Bench after T1**, and who at DRI leads the trials (5.1)?
4. **Students on a prototype.** D36 keeps Phone Bench for adult testers until Gus graduates it.
   May T1b at Wasatch Academy use it with students as it is (with the school's agreement), or
   must it graduate first?
5. **phyphox on school-owned phones** for clubs or research (an exception to constraint 3)?
6. **The microphone bounce timer (P6) on Chromebooks** regardless of the phone decision?
7. **The proposed dates** in 5.7.

For Dale and Cleat (already asked, question 7): are phone activities worth pursuing; a
classroom set of old phones; would DRI lend one; and (new) which lab sensors the schools own.

For each LEA and school: a policy allowing teacher-directed science use of phones; the privacy
and instructional-technology review; Chromebook settings for the microphone
(`AudioCaptureAllowedUrls` could pre-approve our site) and motion sensors; whether school iPads
count as cellphones.

For T1: real rates and jitter; rounding by engine and version; flicker; whether phones filter
out shaking above 30 Hz; the iPhone sign; Low Power Mode; microphone settings, including
ChromeOS effects; microphone and motion together; which school Chromebooks have motion sensors.

### 6.5 Recommendation

**Keep the proof of concept going; don't build the classroom tool yet.**

1. **Now: trial T1a on Phone Bench** (live) with adults' phones. It answers on real devices what
   this review can only estimate. Then Phone Bench's additions for T2 and T3 (S, 5.1).
2. **In parallel, at little cost:** ask Wasatch Academy about student trials under its own
   policy; ask Dale and Cleat question 7 and which lab sensors the schools own; put the phone
   question and the 53G-7-228 review to the public LEAs with the school inventory. Defaults
   apply if no answer comes (5.7).
3. **Fix the strength measure (2.6) before T3**, as one module shared with P3's Shake
   experiments.
4. **Then, only if phone cards are chosen and a school can run them: the classroom Phone
   Recorder** (L) for the cards with strong signals: P1, P4, P5 and P6, with P2 as a
   detection-distance lesson in which how the phone lies is part of the science. Results on
   screen and a CSV download; no QR codes, no server, no live links. Every card reminds teachers
   of the rounding and links to "How small a shake can it see?" on Reading a seismogram (D36).
5. **The Hit Locator and P3's ring only if T3 passes** at some ring size. Our estimate says the
   card's 10 to 40 m ring will not; a 3 to 8 m ring with jumps might.
6. **The microphone bounce timer (P6) on Chromebooks** is the cheapest, lowest-risk piece (S,
   plus a card), once the LEA approves it like any other classroom tool.
7. **Clubs and research:** phyphox where installing is fine; lab sensors where schools have them.

## 7. Response to the critiques

Every finding in R1 (`critique-r1-claude.md`, section 4 and the shared issues that touch this
review) and R2 (`critique-r2-codex.md`, section 4 and its shared issues), and M1's instructions
for this revision. "Accepted" means changed as suggested; "changed" means accepted in a
different form; "declined" gives the reason.

| # | From | Finding | Response | What changed, and why |
| --- | --- | --- | --- | --- |
| 1 | R2 MUST; M1 | Browser-wide claims: "every browser rounds", "60 everywhere"; the iPhone forecast | Accepted | Claims stated by engine and by what the code shows (2.1, 2.2, short answer, 6.3); 60 per second is "in all three engines' code"; the W3C text named as a Candidate Recommendation Draft that browsers follow by choice; iPhone rounding a possibility with no date, recorded per iOS version in T1; Gate A by engine (5.5). WebKit's 60 per second stays as a code fact, not a hypothesis, because it is one constant for every device; T1 still measures it |
| 2 | R2 MUST; R1 S4; M1 | Utah policy: re-read the statute; AI glasses; relettering; only an LEA can make exceptions; the Chromebook statement | Accepted | Section 4 rewritten from the current texts: 53G-7-227 as in force, S.B. 69, 53E-1-102(9), R277-495, R277-487 and the new 53G-7-228 (from R2's H.B. 273 pointer). Chromebooks: not cellphones, but R277-495, local policies and 53G-7-228 apply. A device-by-device table (4.4). "Handheld" read as design, so a taped phone still counts. One nuance: S.B. 69 itself does not contain "AI glasses"; the review cites the code as published and attributes the addition to H.B. 42 only as R1's finding |
| 3 | R1 S4 | R277-487 "being amended in fall 2026"; R277-495's title | Accepted | No amendment in process on the Board's list; R277-487 in force since 2025-07-08 (4.5). The overview carries the same claim: flagged to M1 (6.3, item 7). R277-495's title corrected |
| 4 | R2 SHOULD; M1 | "No upload" doesn't mean "no privacy review" | Accepted | 4.5 states the data flow precisely (host logs included) and makes an LEA privacy and security review a required step, without asserting that any particular agreement is or isn't needed |
| 5 | R2 CONSIDER; M1 | Qualify the QR privacy claims | Accepted | Option 4 now says "local": nothing goes to a server, but the link stays in the receiving browser's history; no names; clear the history after the lesson |
| 6 | R1 S1; M1 | "A phone at rest shows one constant value" is wrong for most phones | Accepted | Corrected in 2.2 and A2 with R1's arithmetic (checked); the bench report gives flicker per axis (2.5); P2 gets an orientation check and makes how the phone lies part of the lesson |
| 7 | R1 S5; M1 | "An Apple engineer" isn't shown by the source | Accepted | "Filed on 2026-10-30 and tracked in Apple's internal bug system" (the bugs carry the InRadar keyword, checked) |
| 8 | R1 C5 | "Requires all browsers" | Accepted | "The draft standard says browsers must ..., followed by choice" (2.2) |
| 9 | R1 S2; M1 | Wasatch Academy, a pilot site outside the phone law | Accepted | 4.1, 4.4, 5.2 (T1b there first), 5.5, 5.7, 6.4; "probably outside", to be confirmed with the school, because it is not an LEA and R277-495 covers public schools only |
| 10 | R1 S3; M1 | Lab sensors (Vernier, PASCO, micro:bit) are missing | Accepted, with one limit | Added to 6.1 with verified specifications, a question for Dale and Cleat and the schools, and a default (assume none). Declined in one respect: R1 suggests they would serve "P1's coupling comparison" better; P1 and P2 are about the phone itself, so sensors complement those cards rather than replace them |
| 11 | R2 SHOULD; M1 | Define a comparable strength measurement before using it for location | Accepted | New 2.6: placement, axis, baseline, band, window, measure, detection, quality flags, event file; T3 reports repeatability and detection by device model; 0.2 m/s² relabeled a planning number, not a tested threshold |
| 12 | R1 shared 5 | One strength measure across the S and P cards | Accepted, as a proposal | 2.6 proposes one module for phones and Shakes (P3's experiment mode); one owner, set by M1 |
| 13 | R2 SHOULD; M1 | Include DRI, teacher and school IT effort; owners | Accepted | Section 5 gives Claude session-days, DRI staff days and teacher and IT time separately, plus operating effort and a proposed owner of the bench page after T1 |
| 14 | M1; R1 shared 2 | One effort scale (S up to 2, M 3 to 7, L more than 7) | Accepted | Throughout section 5 and option table |
| 15 | R1 shared 3 | Calibrate on finished tools, not first builds | Accepted | Ratio of 2 to 3 from this repository's history (section 5), built into every estimate |
| 16 | R1 shared 4; M1 | Gates with no dates and no defaults | Accepted | 5.7: every outside answer has a proposed date and a default |
| 17 | R1 S6; R1 shared 6 | P2 and T3 depend on P3's day viewer; one file reader, one owner | Accepted | Option 6 and 5.4: one shared reader owned with P3's V1; P4 counts only the phone-CSV adapter; T3 uses V1 or DataView (5.2) |
| 18 | R2 CONSIDER; M1 | Browser audio is delivered samples, not guaranteed raw audio | Accepted | 2.4 reworded; requested and actual settings shown side by side; T1 validates onsets and gain per browser |
| 19 | R1 C2; M1 | ChromeOS system audio effects | Accepted | 2.4 and a T1 device check (5.3), with what the Chromium source and Google's help pages show |
| 20 | R1 C1; M1 | Testing iPhones before a change reaches `main` | Accepted | Section 5, "Testing on phones before a change reaches main"; removed from the risk list's "iPhones on the deployed site" |
| 21 | R1 C3 | Small facts: gyroscope rounding; no gyroscope gives zeros; rate can be below 60 | Accepted | Each checked in source and added to 2.1 |
| 22 | R1 C4; M1 | The bench page is being built (D10) | Accepted | Status note, 5.1, 6.4 updated; since then live as Phone Bench (rows 29 to 33) |
| 23 | M1 | Explain the rounding on the site; reminder on every phone card | Accepted | 2.2 ("On the site"), 5.1 (guide), 5.4 (cards), 6.5 |
| 24 | R2 shared 3 | Source log: current primary evidence | Accepted | Statutes and rules now read in their current text; old-device facts now from Apple's and Google's own pages; remaining secondary items are marked, and nothing in the recommendation rests on them |
| 25 | R2 shared 2 | Separate development from operating effort | Accepted | "Running it afterward" in 5.4 |
| 26 | R1 shared 7 | Data credit for UHSN's own data | Changed | Phone data come from the class's own devices, so no network credit applies; the CSV and screens carry "Recorded with the UHSN Phone Recorder" and the date (3, file format). The credit for school Shake data is P3's question |
| 27 | R1 shared 1; R2 shared 1 | One privacy decision per school for published data; occupancy privacy | Not applicable here | Phone recordings are never published or sent anywhere, so they add nothing to that decision. Noted for M1: the Shake data decision stays with P3 and DRI |
| 28 | R2 shared 4, 5 | Shake formats and sizes; Raspberry Shake license | Not applicable here | About the Shake data path (P3) |

**Since the critiques: points from D10-phone-bench, passed on by M1** (Phone Bench merged and
live, D36):

| # | From | Finding | Response | What changed, and why |
| --- | --- | --- | --- | --- |
| 29 | M1 (D10) | The site says at rest most phones flicker by one step on at least one axis; the review must agree | Accepted | It already did since the last revision (2.2, A2); 2.2 now quotes the site's wording and notes that Phone Bench reports each axis's flicker |
| 30 | M1 (D10) | Chrome 158 already has `DeviceMotionEvent.requestPermission()` and answers at once; the review described it as switched off | Accepted | 2.1's table and bullet corrected: the function exists (Chrome 152 on) and answers at once without a prompt; what is switched off is the option that would make Chrome ask. Risk row and source log updated |
| 31 | M1 (D10) | Phone Bench is now the T1 instrument (All apps → In development → Phone Bench) | Accepted | 5.1 rewritten around Phone Bench: where it is, a T1 take, and what it covers against this review's specification; T1a and T1b run on it as it is; T2 and T3 wait for its additions (event list with the 2.6 measure, microphone onsets, spectrum and 40 Hz test), S: 1 to 2 Claude days. 2.5, 5.2, 5.3, 5.5, 5.6, 5.7 and 6.5 point at it. New question for Gus: students on a prototype (6.4) |
| 32 | M1 (D36) | Every phone card reminds teachers of the rounding and links to "How small a shake can it see?" | Accepted | 2.2 ("On the site"), 5.4 (cards) and 6.5 |
| 33 | This revision | The site gives one step as about 20,000 times the Shake's smallest shake at 10 Hz; the review said 5,000 to 10,000 | Changed | Both are right for what they measure: 20,000 for a full step at 10 Hz (the site), 10,000 to 5,000 for the half step a still axis needs at 10 to 20 Hz. 2.2, 6.3 and A2 now give both, so the review and the site don't seem to disagree |

## Appendix A. Calculations

### A1. Peak against energy at about 60 readings a second

A decaying burst $a(t) = e^{-t/\tau}\sin(2\pi f t)$ with $\tau = 0.1$ s, sampled at 60 per
second starting at a random moment (200 trials per frequency), compared with the same burst
sampled at 10,000 per second. "Peak" is the largest absolute reading; "energy" is
$\sqrt{\sum a_i^2/f_s}$. Ratios to the true value (script `peakbias.mjs` in the session's
scratchpad, about 25 lines; easy to rewrite from this description):

| Frequency | Peak: mean | Peak: worst | Peak: spread (sd) | Energy: mean | Energy: worst | Energy: spread |
| --- | --- | --- | --- | --- | --- | --- |
| 5 Hz | 0.99 | 0.96 | 0.01 | 1.00 | 1.00 | 0.00 |
| 10 Hz | 0.95 | 0.86 | 0.04 | 1.00 | 0.99 | 0.00 |
| 15 Hz | 0.90 | 0.71 | 0.09 | 1.00 | 0.98 | 0.01 |
| 20 Hz | 0.87 | 0.74 | 0.10 | 1.00 | 0.96 | 0.03 |
| 25 Hz | 0.81 | 0.56 | 0.13 | 1.00 | 0.87 | 0.08 |
| 28 Hz | 0.70 | 0.33 | 0.22 | 0.98 | 0.65 | 0.20 |

Near half the reading rate (30 Hz) both fail, because a wave at exactly half the rate can be
sampled at its zero crossings every time. That is why 2.6 filters to 2 to 25 Hz. Energy also
counts shaking above 30 Hz that has folded down to a false lower frequency: fine for a strength
measure on one device, but devices filter differently above 30 Hz, another reason for the band.

### A2. Rounding to 0.1 m/s²

**The step and the noise.** Chrome reports $\mathrm{round}(a/q)\,q$ with $q$ = 0.1 m/s². A
phone's own noise is 0.006 to 0.02 m/s² root mean square: Bosch datasheets give 120 to
180 µg/√Hz, which over the 0 to 30 Hz that 60 readings a second can show is 0.006 to
0.010 m/s²; 0.015 to 0.02 m/s² if the phone samples faster and the browser takes snapshots
without filtering, which matches the 0.02 m/s² measured by Zhang et al. with a native app at 400
readings a second.

**Flicker at rest** *(corrected after R1)*. On each axis the resting value (gravity's share plus
offsets) sits somewhere between two steps, so the nearest boundary is anywhere from 0 to
0.05 m/s² away, depending on how the phone lies. If it is within about $2\sigma$ of a boundary,
noise of size $\sigma$ flips the reading by one step from time to time. Taking the distance as
evenly spread, the chance for one axis is about $2\sigma/0.05$, and for at least one of three
axes $1-(1-2\sigma/0.05)^3$:

| Sensor noise σ (m/s²) | One axis flickers | At least one of three axes |
| --- | --- | --- |
| 0.006 | 24% | 56% |
| 0.01 | 40% | 78% |
| 0.02 | 80% | 99% |

(R1's table; we checked the arithmetic.) So most resting phones on Chrome flicker on at least
one axis. The first draft's "a phone at rest shows one constant value" was wrong.

**Detection.** On a still axis, a burst of peak $A$ changes the reading only if it reaches the
boundary: for $A$ < 0.05 m/s², with a chance of about $A/0.05$; above 0.05 m/s², always. The A1
script's check: a 0.03 m/s² burst on a resting value of 9.80 m/s² reads 0; on 9.83 or 9.849 it
reads a full 0.1. On a flickering axis, even shaking well below 0.05 m/s² changes how often the
reading flips, so a phone can *detect* weak shaking there, but only as a yes or no.

**Strength.** Once seen, a peak is read to ±0.05 m/s²: ±30% at 0.17 m/s², ±10% at 0.5 m/s². So
from rounding alone, P3's ±30% agreement needs about 0.2 m/s² at every phone; coupling and
device differences come on top, which T3 measures (2.6).

**Against the Shake.** The Shake's smallest detectable motion is 0.08 µm/s at 1 to 20 Hz
(questions document, B1), which is $2\pi f v$ = 5 × 10⁻⁶ m/s² at 10 Hz and 1 × 10⁻⁵ m/s² at
20 Hz. A phone's own noise is about 1,000 to 4,000 times that at 10 Hz. One full Chrome step,
0.1 m/s², is a ground speed of $0.1/(2\pi \cdot 10)$ = 1.6 mm/s at 10 Hz, about 20,000 times the
Shake's smallest shake (the figure on Reading a seismogram); the half step a still axis needs is
about 10,000 times at 10 Hz and 5,000 times at 20 Hz.

**Signal sizes** (our estimate, from the research notes logged in phone-sources.md). Anchors,
converted to acceleration with $a = 2\pi f v$ at 20 to 40 Hz: a jackhammer, 0.89 mm/s at 7.6 m
(FTA 2018, quoted by Caltrans 2020), so 0.11 to 0.22 m/s²; vibration "barely perceptible" at
0.89 mm/s and "distinctly perceptible" at 6.1 mm/s (Wiss 1974, in Caltrans 2020), so 0.11 to
0.22 and 0.8 to 1.5 m/s²; a person jumping 0.6 m from a Shake overloads it (forum report, about
10 mm/s or more), so about 1 to 2 m/s². Fall-off $A \propto (1/r)^n$ with $n$ = 1.1 to 1.5
(Caltrans, FTA), ignoring absorption, which makes the far values optimistic. The questions
document's Appendix B3 uses a gentler fall-off for surface waves on soil (2.1 to 2.5 times from
5 to 20 m); with it the 20 and 40 m values roughly double, still mostly below the step.

### A3. Locating a clap by sound without synchronized clocks

Phone $i$ records a reference clap (known spot, distance $d_{r,i}$) and the test clap (unknown
spot, distance $d_{t,i}$) in one continuous recording at $f_s$ samples per second. The number
of samples between them is

$$n_i = f_s\left[(T_t - T_r) + \frac{d_{t,i} - d_{r,i}}{c}\right]$$

where $T_t - T_r$, the time between the two claps, is the same for every phone. Each phone's
clock offset and its input delay are the same for both claps in one recording, so they cancel.
With 4 phones there are 4 equations and 3 unknowns (the test clap's $x$, $y$ and $T_t - T_r$).
Errors, both our assumptions for T2 to measure: a clap onset picked to about 0.1 ms (5 samples),
about 3 cm of sound at 343 m/s; and a sound card clock 20 to 100 parts per million off (a
typical crystal tolerance), which over 2 s between claps adds 0.04 to 0.2 ms (1 to 7 cm).
Across a 1.5 m table the arrival differences are up to 4.4 ms, so the error is a few percent of
the range. This is BeepBeep's idea (each device hears its own and the other's sound; Peng et
al. 2007) in a simpler form. It fails if the device drops audio between the claps; T2 checks
whether that happens.

## Appendix B. How this review was made

- **Repo material read:** `CLAUDE.md`; `planning/activities.md` (the P cards, Appendices B6, C,
  D, E, H, I); `planning/evaluation.md` (sections 4.3 and 6); `planning/roadmap.md` ("Proposed,
  pending Dale and Cleat"); the apps' data and file handling (`docs/app/js/data/`, `downloadCsv`
  and `csvRow` in `docs/app/js/ui/page.js`, Quake Locator's CSV, Quake Explorer's sample loading
  through `SampleSource` and `parseMiniseed`, the `Trace` type in `docs/app/js/lib/signal.js`);
  `tests/app-list.test.js`; for the revision, both critiques and P3's
  `review-shake-viewer.md` (its V1 day viewer and effort table), and the git history of Quake
  Locator and Quake Explorer (for the calibration in section 5). After D10 merged: Phone Bench's
  guide (`docs/apps/phone-bench.md`), developer notes (`docs/developers/phone-bench.md`) and
  library (`docs/app/js/lib/bench.js`), "How small a shake can it see?" in
  `docs/theory/seismograms.md`, decision D36, and the phone-card rule in
  `docs/developers/adding-a-card.md`.
- **Browser facts:** in the first round, three research helpers (subagents) read primary
  sources in parallel and kept notes with quotes: motion sensors in Chromium, WebKit and
  Firefox source, the W3C documents and MDN's compatibility data; the microphone, saving,
  sharing, storage, QR codes, device-to-device links and Chromebook policies; existing apps,
  sensor noise, signal sizes and classroom precedents. A fourth helper, in the revision, read
  lab-sensor specifications, iPhone test paths and ChromeOS microphone processing. This session
  checked the facts the recommendation rests on directly: Chromium's rounding constant and where
  it is applied, its presence at the Chrome 83 tag, the gyroscope rounding, the 60 Hz cap;
  WebKit's 1/60 s interval and its no-gyroscope path; the W3C wording; WebKit bugs 329553, 329554
  and 329556 and their InRadar keyword; Chromium's shareable file types.
- **Law and rules,** re-read by this session for the revision from the Legislature's and the
  State Board's current pages: 53G-7-227, the enrolled S.B. 69, 53G-7-228, 53E-1-102(9),
  R277-495, R277-487 and the Board's list of rules in process.
- **Calculations** (A1, A3 and the rounding arithmetic in A2) are this session's own; the
  flicker table in A2 is R1's, checked here.
- **Not done:** no device was tested; no absolute measurement of stomps, drops or hammer blows
  at these distances was found, so the signal sizes remain estimates; no LEA or school was
  asked anything.
