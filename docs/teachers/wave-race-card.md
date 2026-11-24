# Activity card: Wave Race

Students follow the [Wave Race guide](../apps/wave-race.md) (what they see, step by step) and
use the [Wave Race app](../app/wave-race/index.html).

!!! abstract "At a glance"
    - **Driving question:** How far away was that earthquake, and where did it happen?
    - **Time:** 15 min (whole class, on the projector) or 45–55 min (pairs).
    - **Setup:** Browser only. Live records from University of Utah stations, or the offline
      sample if the school network blocks them.
    - **Apps and tools:** [Wave Race](../apps/wave-race.md) · [Quake Waves](../apps/quake-waves.md)
      (the warm-up animation)
    - **Before this:** Nothing. [One quake, two waves](one-quake-two-waves.md) (10 min) makes a
      good first lesson.
    - **Materials:** Student devices with a browser (Chromebooks are fine) and a projector.
    - **Utah standards:** PHYS.4.1 · ESS.2.2 · ESS.2.3 · ESS.4.1 · GEOL.3.x · CS&nbsp;9/10.DA.3 ·
      CS&nbsp;11/12.DA.1 ([crosswalk](standards.md#wave-race))

**Students will:** read real seismograms; identify P and S arrivals; calculate distance from the
S-minus-P time; locate an epicenter from several stations; judge how good their answer is.

No accounts or logins. Student names are never entered or stored.

!!! tip "Before class"
    Open the app on the school network and choose the quake you will use. If the quake list
    doesn't load, use **Use the offline sample** (top right): the
    [answer key](#answer-key-offline-sample-quake) below is for that quake. What to ask IT to
    allow, and how to send the whole class to the same quake, are under
    [Before class](index.md#before-class).

## 15-minute version (whole class, on the projector)

1. **Hook (2 min).** Show the seismogram of one station. "Something happened. When did the
   shaking start? Why are there two bursts?"
2. **Model (5 min).** Play the [Quake Waves animation](../theory/locating.md#watch-it-happen)
   once (under a minute at 4× speed; run it again with the quake moved). Then pick P and S together on one station (zoom in first).
   Read off S − P and the distance. Explain the race: P is fast, S is slow, the gap grows with
   distance.
3. **Class picks (5 min).** Volunteers pick two more stations, so the class has the three the
   app needs. Watch the circles appear on the map. Have the class vote where the circles cross
   and place that point with **Place my own epicenter**, then press **Find the best epicenter**.
   With the offline sample, use MTPU, TCRU and WCU: analysts picked both P and S at these
   three, so the reveal can show the class how close it came. WCU has only an up–down (Z)
   trace: choose the 2–8 Hz filter and look for S near 23 s.
4. **Reveal (3 min).** Reveal the official answer. How far off were we? Which station's circle
   missed the most? Why?

## Full-period version (45–55 min, pairs)

| Phase | Time | What happens |
| --- | --- | --- |
| Engage | 5 min | Hook as above, then the [Quake Waves animation](../theory/locating.md#watch-it-happen). Pairs predict: how could you find the quake from these wiggles? |
| Explore | 15 min | Pairs load the assigned quake, pick P and S on at least 3 stations (the fewest the app can locate from), and record S − P and distance in a table. With the offline sample, they start with MTPU, TCRU and WCU, the three stations where analysts picked both P and S. Pairs with time left add a fourth station of their own choosing (SGU or DWU work well). No analyst picked S there, so that pick is the pair's own judgment: the [answer key](#answer-key-offline-sample-quake) says where S shows. |
| Explain | 10 min | Class discussion with the [S-minus-P page](../theory/s-minus-p.md): derive \(d = \Delta t \cdot V_P V_S/(V_P - V_S)\) from \(t = d/v\). |
| Elaborate | 10 min | Pairs first place their own epicenter by eye (**Place my own epicenter**; the app shows how well it fits as they drag the pin), then press **Find the best epicenter** and compare. Then experiment: textbook speeds (6.0 and 3.5) and depth 2 km versus 15 km. Pairs with four or more stations also drop one and see how far the best epicenter moves. Record what changes. |
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
They picked P at 9 of the 10 stations and S at 3; the table lists every station, nearest first.

| Station | Traces in the app | P (s) | S (s) | S − P (s) | Distance at 7.66 km/s | True distance from epicenter |
| --- | --- | --- | --- | --- | --- | --- |
| MSU | Z | 4.80 | – | – | – | 26.6 km |
| MTPU | Z N E | 5.07 | 9.21 | 4.14 | 31.7 km | 29.1 km |
| TCRU | Z N E | 6.92 | 11.99 | 5.07 | 38.8 km | 38.1 km |
| FOR6 | Z N E | 8.77 | – | – | – | 48.8 km |
| DWU | Z | 11.19 | – | – | – | 65.3 km |
| WCU (Millard stand-in) | Z | 12.93 | 23.33 | 10.40 | 79.6 km | 77.0 km |
| SGU (Gunnison Valley stand-in) | Z N E | 19.23 | – | – | – | 113.9 km |
| TMU (Wasatch Academy stand-in) | Z N E | 24.02 | – | – | – | 146.0 km |
| ELU (North Sanpete stand-in) | Z | 29.30 | – | – | – | 177.1 km |
| SUU (Juab stand-in) | Z N E | – | – | – | – | 182.9 km |

With the three stations that have both picks (MTPU, TCRU, WCU) and the app's default
settings, the best epicenter is about **5.5 km** from the official one. Student answers within
about 10 km are good; within 5 km are excellent. After revealing the answer, students can show
the analysts' picks as dashed lines. The analysts picked WCU's S on a strong-motion channel the
app does not download, so students pick it on the Z trace, where it is weaker.

**Students' own S picks.** At every other station an S pick is the student's own judgment:
there is no analyst pick to check it against, and no dashed line after the reveal. To judge
those picks, here is where S starts by a computer check made for this key (rounded; not an
analyst's pick):

| Station | Where S shows | S (s) | S − P (s) | Distance at 7.66 km/s | What it does to the location |
| --- | --- | --- | --- | --- | --- |
| DWU | Z, 2–8 Hz filter | about 20.1 | about 8.9 | 68 km (true 65 km) | Added to the three: about 1 km with this pick; half a second either way gives 2 to 5 km |
| SGU | E (N about 0.5 s later) | about 34.0 | about 14.8 | 113 km (true 114 km) | Added to the three: about 1 km with this pick; half a second either way gives 2 to 5 km |
| TMU | N and E | about 41.4 | about 17.4 | 133 km (true 146 km) | Its circle is about 13 km too small. Added with SGU: about 9 km off, worse than without it |
| FOR6, MSU | no clear S | – | – | – | Skipping them is the right call |

TMU shows why far stations mislead: waves that reach a far station dive into deeper, faster
rock, so on average they travel faster than 5.8 and 3.3 km/s (at TMU, P about 6.1 and S about
3.5 km/s). S gains more time than P, so S − P is shorter than 7.66 km per second predicts and
the circle comes out too small ([Limits](../theory/s-minus-p.md#limits)). A pair whose circle
at TMU misses badly has found a real effect, not made a mistake.

## Common difficulties

- **Picking S too early.** The P coda (shaking after P) can look busy. S is usually a clear
  *increase* in size, best seen on N or E. Try the 2–8 Hz filter. Reassure students that
  skipping is fine: for the offline sample, University of Utah analysts picked P at 9 stations
  but S at only 3. Four of the sample's ten stations send the app only a vertical (Z) channel,
  where S is weakest, and the analysts picked WCU's S on a strong-motion channel the app does
  not download.
- **Not zooming in.** On the whole 90 s record, one pixel can be 0.1 s or more.
- **Far stations.** School stand-ins more than ~120 km away give weaker, less reliable picks.
  It is fine to skip them.
- **Clipped records** (flat tops) on big quakes: P can still be picked.

## Extension ideas

- Repeat for a quake near the schools (★ in the list) and compare how well the school
  stand-ins alone do.
- Plot true distance against S − P for many stations (from the CSVs). The slope is the km per
  second of S − P. Is it constant? (It bends upward for far stations: see
  [Limits](../theory/s-minus-p.md#limits) on the Distance from S minus P page.)
- Connect to [ESS.2.2](standards.md#wave-race): the same S-wave behaviour revealed that Earth's
  outer core is liquid.
