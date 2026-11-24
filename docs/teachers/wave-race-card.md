# Activity card: Wave Race

**Driving question:** How far away was that earthquake, and where did it happen?

**Students will:** read real seismograms; identify P and S arrivals; calculate distance from the
S-minus-P time; locate an epicenter from several stations; judge how good their answer is.

**Standards:** PHYS.4.1, ESS.2.2, ESS.2.3, ESS.4.1, CS 9/10.DA.3 (see the
[standards crosswalk](standards.md)).

**You need:** student devices with a browser (Chromebooks are fine), a projector, and the
[Wave Race app](../app/wave-race/index.html). No accounts or logins. Student names are never
entered or stored.

!!! tip "Before class"
    Open the app on the school network. If the quake list doesn't load, the network is
    blocking EarthScope or the USGS: use **Use the offline sample** (top right), or ask IT to
    allow `service.earthscope.org` and `earthquake.usgs.gov`. To send everyone to the same
    quake, load it and share the page address: it includes the quake's ID, for example
    `…/app/wave-race/?event=uu80162166`. For the offline sample, add `&source=sample`.

## 15-minute version (whole class, on the projector)

1. **Hook (2 min).** Show the seismogram of one station. "Something happened. When did the
   shaking start? Why are there two bursts?"
2. **Model (5 min).** Play the [Watch the Waves animation](../theory/locating.md#watch-it-happen)
   once (about a minute at 4× speed). Then pick P and S together on one station (zoom in first).
   Read off S − P and the distance. Explain the race: P is fast, S is slow, the gap grows with
   distance.
3. **Class picks (5 min).** Volunteers pick two more stations. Watch the circles appear on
   the map. Have the class vote where the circles cross and place that point with
   **Place my own epicenter**, then press **Find the best epicenter**.
4. **Reveal (3 min).** Reveal the official answer. How far off were we? Which station's circle
   missed the most? Why?

## Full-period version (45–55 min, pairs)

| Phase | Time | What happens |
| --- | --- | --- |
| Engage | 5 min | Hook as above, then the [Watch the Waves animation](../theory/locating.md#watch-it-happen). Pairs predict: how could you find the quake from these wiggles? |
| Explore | 15 min | Pairs load the assigned quake, pick P and S on at least 4 stations, and record S − P and distance in a table. |
| Explain | 10 min | Class discussion with the [S-minus-P page](../theory/s-minus-p.md): derive \(d = \Delta t \cdot V_P V_S/(V_P - V_S)\) from \(t = d/v\). |
| Elaborate | 10 min | Pairs first place their own epicenter by eye (**Place my own epicenter**; the app shows how well it fits as they drag the pin), then press **Find the best epicenter** and compare. Then experiment: textbook speeds (6.0 and 3.5), depth 2 km versus 15 km, and dropping stations so all are on one side. Record what changes. |
| Evaluate | 5–10 min | Reveal the answer. Exit ticket (below). Optional: download the CSV and plot S − P against true distance. |

## Exit ticket

1. Station A records S − P = 4.0 s. Using 7.66 km per second of S − P, how far away is the quake?
2. Why does one station not tell you where the quake was?
3. Your circles miss the best point by 12 km on average. Give two possible reasons.
4. Why are stations spread *around* a quake better than stations all on one side?

**Answers:** (1) about 30.6 km. (2) It gives a distance only: the quake could be anywhere on a
circle. (3) For example: an S pick on the wrong wiggle; a station too far away; wrong speeds;
the depth guess. (4) The circles cross at steep angles, so only one small area fits.

## Answer key: offline sample quake

Magnitude 3.3 quake, 8 km NW of Junction, Utah, Oct 31, 2026 04:44:15.58 UTC
(Oct 30, 10:44 PM MDT). Official: 38.290° N, 112.290° W, depth 4.0 km (USGS event
`uu80162166`). Times are seconds after the origin time, picked by University of Utah analysts.

| Station | P (s) | S (s) | S − P (s) | Distance at 7.66 km/s | True distance from epicenter |
| --- | --- | --- | --- | --- | --- |
| MTPU | 5.07 | 9.21 | 4.14 | 31.7 km | 29.1 km |
| TCRU | 6.92 | 11.99 | 5.07 | 38.8 km | 38.1 km |
| WCU (Millard stand-in) | 12.93 | 23.33 | 10.40 | 79.6 km | 77.0 km |
| MSU | 4.80 | – | – | – | 26.6 km |
| FOR6 | 8.77 | – | – | – | 48.8 km |
| DWU | 11.19 | – | – | – | 65.3 km |

With these three stations and the app's default settings, the best epicenter is about
**5.5 km** from the official one. Student answers within about 10 km are good; within 5 km
are excellent. Analysts did not pick S at every station, but students often can, especially
on the N and E traces. After revealing the answer, students can show the analysts' picks
as dashed lines.

## Common difficulties

- **Picking S too early.** The P coda (shaking after P) can look busy. S is usually a clear
  *increase* in size, best seen on N or E. Try the 2–8 Hz filter.
- **Not zooming in.** On the whole 90 s record, one pixel can be 0.1 s or more.
- **Far stations.** School stand-ins more than ~120 km away give weaker, less reliable picks.
  It is fine to skip them.
- **Clipped records** (flat tops) on big quakes: P can still be picked.

## Extension ideas

- Repeat for a quake near the schools (★ in the list) and compare how well the school
  stand-ins alone do.
- Plot S − P against true distance for many stations (from the CSVs). The slope is the km per
  second of S − P. Is it constant? (It bends upward for far stations: see the theory page.)
- Connect to [ESS.2.2](standards.md): the same S-wave behaviour revealed that Earth's outer
  core is liquid.
