# Activity card: A message from far away

Students follow [investigation D in the Quake Explorer guide](../apps/quake-explorer.md#d) (what
they see, step by step) and use [Quake Explorer](../app/quake-explorer/index.html?event=us7000qd1y&inv=D).

!!! abstract "At a glance"
    - **Driving question:** A big quake thousands of kilometers away shakes Utah's seismometers,
      though nobody here feels it. What can its waves tell us about the inside of the Earth?
    - **Time:** 15 min (whole class, on the projector) or 45–55 min (pairs).
    - **Setup:** Browser only. Live records from University of Utah stations; the class chart
      needs them, because Sand Point is the only distant quake stored offline.
    - **Apps and tools:** [Quake Explorer](../apps/quake-explorer.md), investigation D (distant
      quakes; B and C work for the same quake) · a spreadsheet for the class chart
    - **Before this:** [Wave Race](wave-race-card.md) (distance from S − P)
    - **Materials:** Student devices with a browser (Chromebooks are fine), a projector, speakers
      or headphones (optional, for **▶ Listen**), and graph paper if you don't use a spreadsheet.
    - **Utah standards:** PHYS.4.1 · ESS.2.2 · CS&nbsp;9/10.DA.3
      ([crosswalk](standards.md#quake-explorer))

**Students will:** recognise P, S and surface waves on half an hour of record from a distant
quake; pick P and S and turn S − P into a distance with a model of the whole Earth; explain why
surface waves arrive last but are the biggest; explain why S shows best on the horizontal
sensors; build a class travel-time chart from several quakes and explain why it curves.

**Quakes to load.** Each link opens investigation D:

| Quake | Use it for | Live data | Offline sample |
| --- | --- | --- | --- |
| 2025 Sand Point, Alaska earthquake (M7.3) | The worked example (opens at SGU, Gunnison Valley's stand-in) | [Open](../app/quake-explorer/index.html?event=us7000qd1y&inv=D) | [Open](../app/quake-explorer/index.html?event=us7000qd1y&inv=D&source=sample) |
| Other big quakes from **Big quakes far away** | The class travel-time chart, one quake per group (live data only; see below) | Choose in the app | none |

No accounts or logins. Student names are never entered or stored.

!!! tip "Before class"
    Open the Sand Point link on the school network: it downloads half an hour of record, so
    give it a few seconds. If it doesn't load, use the offline link (or **Use the offline
    samples**, top right in the app): the [answer key](#answer-key-offline-sample) below is for
    that quake. For the class chart you need live data, because Sand Point is the only distant
    quake stored offline. In **Big quakes far away**, choose four to six quakes at different
    distances (the **Distance** column, in degrees) between about 25° and 90°. What to ask IT to
    allow, and how to send the whole class to the same quake, are under
    [Before class](index.md#before-class).

## 15-minute version (whole class, on the projector)

1. **Hook (2 min).** Open the Sand Point quake at SGU, 3,985 km away. "This is half an hour of
   shaking in Utah from a quake in Alaska. Nobody here felt it. What do you notice?" (Small,
   fast wiggles at about 7 minutes; a second change at about 12 to 13 minutes; big, slow waves
   from about 16 minutes on.)
2. **Predict (1 min).** "Three kinds of wave travel from a big quake far away. Which reaches Utah
   last?" Take a vote and choose the answer under **1 · Predict first**.
3. **Pick (5 min).** Press **Pick P** and click where the first small wiggles start (scroll to
   zoom in first). Press **Pick S** and click the start of the second, bigger change, on the
   north and east records. The panel turns S − P into a distance.
4. **Check (4 min).** Press **Reveal the real distance and the model times**: 35.8° (3,985 km).
   The model says P at 6:56 and S at 12:32; the biggest surface waves peak at about 19:40.
5. **Why (3 min).** P and S travel *through* the Earth; surface waves travel *around* it, along
   the surface, and are the slowest, so they arrive last. Yet they are the biggest this far
   away: they spread out over a ring, not over a growing sphere, so they fade more slowly.

## Full-period version (45–55 min, pairs)

| Phase | Time | What happens |
| --- | --- | --- |
| Engage | 5 min | Hook as above. Pairs choose their prediction in the panel and write one sentence saying why. |
| Explore | 15 min | Pairs pick P and S on Sand Point at SGU (three sensors) and record P, S (minutes:seconds), S − P and the distance from S − P. They switch **Station** to TMU (Wasatch Academy, up sensor only) and try S there: why is it harder? Then they choose **Notes: surface waves (0.02–0.1 Hz)**, find the biggest, slowest waves, and press **▶ Listen**. |
| Explain | 10 min | Press **Reveal the real distance and the model times** and discuss with [Travel times and Earth's layers](../theory/travel-times.md). Rock gets faster with depth, so waves going far dive deep and come back up: twice the distance takes less than twice the time, and the travel-time curves on the chart bend. S shows on the north and east sensors because, from far away, it arrives from almost straight below and shakes across its path, which is sideways ([Which way the ground moves](../theory/ground-motion.md)). Surface waves are biggest this far away because they spread over a ring, not a sphere. |
| Elaborate | 10–15 min | **Class travel-time chart.** Each group loads a different quake from **Big quakes far away** (live data), picks P and S, presses the reveal and **Download my answers (CSV)**. On the board or in a spreadsheet, plot each group's S − P (minutes) against the real distance (degrees). Does it fall on a straight line? |
| Evaluate | 5 min | Exit ticket (below). |

## Exit ticket

1. Put P waves, S waves and surface waves in the order they reach Utah. Which are the biggest
   this far away, and why?
2. At a station, S − P is 6 minutes. Use the class chart or the table in the answer key: about
   how far away was the quake?
3. Going from 30° to 60° doubles the distance, but S − P goes only from about 5 to about
   8 minutes. Why doesn't it double?
4. Why do we look for S on the north and east sensors rather than the up sensor?

**Answers:** (1) P, then S, then surface waves. The surface waves are biggest: their energy
spreads over a ring around the surface instead of a growing sphere, so it thins out more
slowly. (2) About 40° (4,400 km). (3) Waves going farther dive deeper into the Earth, where rock
is faster, so the extra distance costs less and less extra time. (4) S shakes the ground across
its path. From far away it arrives from almost straight below, so "across" is sideways, which
the north and east sensors record.

## Answer key: offline sample

2025 Sand Point, Alaska earthquake, magnitude 7.3, July 16, 2025 20:37:41.7 UTC (2:37 pm MDT),
depth 38 km (USGS event `us7000qd1y`). The **Station** menu offers SGU (Gunnison Valley's
stand-in, 35.8° or 3,985 km away, three sensors) and TMU (Wasatch Academy's stand-in, 36.0° or
4,005 km, up sensor only).

At SGU (times after the quake, minutes:seconds):

| Wave | Earth model (iasp91) | Picked at SGU | Clock time |
| --- | --- | --- | --- |
| P | 6:56 | about 6:59, clearest on the up record | 20:44:41 UTC (2:44 pm MDT) |
| S | 12:32 | about 12:45, on the north and east records (hardly visible on the up record) | 20:50:27 UTC (2:50 pm MDT) |
| Surface waves | 15:49 to 22:08 (3.0–4.2 km/s around the surface) | biggest at **19:40** | 20:57:22 UTC (2:57 pm MDT) |

- **S − P.** Picks at 6:59 and 12:45 give 346 s (5:46), which the panel turns into 37.4°,
  about 4,160 km: 1.6° too far, and the reveal calls it "very close" (within 3°). Picking exactly
  on the model times gives 336 s and 35.9°. Near this distance, every 10 s of S − P is about 1.5°
  (about 165 km).
- **The prediction.** Surface waves arrive last. If students chose them, the panel says "You
  predicted it: surface waves arrive last."
- **The B check** (the same quake in investigation B): the strongest notes at SGU are near
  0.05 Hz, one wave every 20 s.

**For the class chart.** Earth-model S − P (iasp91, for a quake about 33 km deep). Real picks in
Utah can give an S − P about 10 s longer (Sand Point at SGU: 346 s against the model's 336 s):

| Distance | 20° | 30° | 40° | 50° | 60° | 70° | 80° |
| --- | --- | --- | --- | --- | --- | --- | --- |
| S − P (minutes) | 3.7 | 4.9 | 6.1 | 7.2 | 8.2 | 9.1 | 10.0 |

The points rise steeply at first and then flatten: a curve, not a straight line. Big quakes
that suited a chart in late 2026 (their distances from the schools are approximate; check the
**Distance** column):

| Quake | USGS event | Distance |
| --- | --- | --- |
| Hubbard Glacier, M7.0, December 6, 2025 | `us6000rsy1` | about 27° |
| Sand Point, Alaska, M7.3, July 16, 2025 | `us7000qd1y` | 36° |
| Panama, M7.7, October 9, 2026 | `us6000u18k` | about 42° |
| Kamchatka, Russia, M8.8, July 29, 2025 | `us6000qw60` | about 59° |
| Aomori, Japan, M7.6, December 8, 2025 | `us6000rtdt` | about 75° |

To open one directly, use the Sand Point link with its event ID in place of `us7000qd1y`. The
list shows the last two years only, so older quakes drop out of it over time, but their links
keep working.

## Common difficulties

- **P picked too late.** On the half-hour view the first P wiggles are tiny. Zoom in (scroll)
  around 6 to 8 minutes and use **Notes: P and S (0.05–2 Hz)**.
- **The surface waves picked as S.** The biggest waves (from about 16 minutes) are surface waves;
  S comes before them, at about 12 to 13 minutes. An S pick at 16:00 gives S − P of about
  9 minutes and a distance near 70°, about twice the real one.
- **S on the up record.** S hardly shows on the up (Z) record. Use the north and east records,
  at a three-sensor station. At TMU the app says "This station has only the vertical (up) sensor:
  S is easier to see at a three-component station."
- **Seconds and minutes.** The record's time axis counts seconds after the quake; the panel
  shows minutes:seconds (6:59 is 419 s).
- **No distance from S − P** ("–"). The panel leaves it blank when S − P does not match any
  distance between 0° and 100°, for example when S was picked before P.
- **Quakes in the core's shadow.** Beyond about 103° (shaded on the chart as "core shadow") the
  Earth's core blocks the direct P wave. Leave these quakes out of the class chart.
- **Discussion prompt: the model and the real Earth.** *The Earth model averages the whole
  planet. At SGU, P arrived about 3 s later than the model said and S about 13 s later. What
  could make waves under Utah slower than average? Why might S be delayed more than P?* (Let
  students suggest ideas and how to test them. Two things to notice: S spends almost twice as
  long as P in the same rock, so any slow patch delays it more; and the S pick is less certain
  than the P pick, so part of its delay may be the pick.)

## Extension ideas

- **A deep quake.** The Tonga quake of March 24, 2026 (M7.5, `us7000s789`) was 234 km deep.
  Before loading it, predict: will its surface waves be stronger or weaker than Sand Point's?
  (Surface waves travel near the surface, so a deep quake hardly sets them off. We have not
  checked this quake's records ourselves: let the class find out.)
- **The rising pitch.** Listen to the surface waves sped up (400×, with headphones: they are the
  lowest notes in the app, about 8–40 Hz even at that speed). Longer waves reach deeper, faster
  rock, so the lowest notes arrive first and the pitch rises.
- **Direction from far away.** Open the same quake in C (station SGU). Does the P motion point
  toward Alaska? (With the default window, the computer says 334° against the true 312°.)
- **The core** (ESS.2.2). On the app's travel-time chart, the region beyond 103° is shaded "core
  shadow". Why do the direct P waves disappear there, and what does that say about the inside of
  the Earth?

*Data: waveforms from University of Utah Seismograph Stations (network UU,
[doi:10.7914/SN/UU](https://doi.org/10.7914/SN/UU)) via EarthScope; quake locations from USGS
ComCat; travel times from the iasp91 Earth model. See [Our stations and data](../theory/stations.md).*
