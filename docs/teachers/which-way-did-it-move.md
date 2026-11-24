# Activity card: Which way did the ground move?

Students follow [investigation C in the Quake Explorer guide](../apps/quake-explorer.md#c) (what
they see, step by step) and use [Quake Explorer](../app/quake-explorer/index.html?event=uu80158051&inv=C).
The full-period version adds [investigation A](../apps/quake-explorer.md#a): students measure
how fast the rock carries waves, then locate a quake from a single station.

**Apps used:** [Quake Explorer](../apps/quake-explorer.md), investigation C (particle motion),
plus A in the full period · [How P and S waves move rock](../theory/waves.md#two-body-waves) (the
warm-up animation) · [Wave Race](../apps/wave-race.md) (done before: distance from S − P)

**Driving question:** Which way did the ground move when the waves arrived, and can one station
tell us where the quake was?

**Students will:** combine three sensors (up, north, east) into the path the ground traced; show
from real data that P waves push and pull along their path and S waves shake across it; find
the direction to a quake from the first half second of P; locate a quake from one station with
direction plus S − P distance, using wave speeds they measured; judge how far to trust the
answer.

**Standards:** PHYS.4.1, ESS.2.2, CS 9/10.DA.3 (see the
[standards crosswalk](standards.md#quake-explorer)).

**You need:** student devices with a browser (Chromebooks are fine), a projector, and these
quakes in Quake Explorer:

| Quake | Use it for | Live data | Offline sample |
| --- | --- | --- | --- |
| 2026 quake (M2.7) recorded at Wasatch Academy | The main example. Opens in C at TMU, Wasatch Academy's stand-in; the quake's place stays hidden until **Show the true direction** | [Open](../app/quake-explorer/index.html?event=uu80158051&inv=C) | [Open](../app/quake-explorer/index.html?event=uu80158051&inv=C&source=sample) |
| 2026 Junction quake (M3.3) | Measuring speeds in A (full period) | [Open in A](../app/quake-explorer/index.html?event=uu80162166&inv=A) | [Open in A](../app/quake-explorer/index.html?event=uu80162166&inv=A&source=sample) |
| 2026 Junction quake (M3.3) | More stations to try in C | [Open in C](../app/quake-explorer/index.html?event=uu80162166&inv=C) | [Open in C](../app/quake-explorer/index.html?event=uu80162166&inv=C&source=sample) |

No accounts or logins. Student names are never entered or stored.

!!! tip "Before class"
    Open the first link and press **▶ Trace the path** to check that it loads. The app hides
    the quake's place, but the [answer key](#answer-key-offline-samples) below names it, so keep
    this page off the projector until after the reveal. If the data don't load, use the offline
    links (or **Use the offline samples**, top right in the app): the answer key is for those.
    What to ask IT to allow, and how to send the whole class to the same quake, are under
    [Before class](index.md#before-class).

## 15-minute version (whole class, on the projector)

1. **Hook (2 min).** Open the quake "recorded at Wasatch Academy". "A small quake shook this
   station. We don't know where it was. Can one station tell us which way to look?" Point out
   the three records, up (Z), north (N) and east (E), and the blue band on the first moment of
   P.
2. **Predict (1 min).** "In the first half second of the P wave, how does the ground move?" Take
   a vote and choose the answer under **1 · Predict first**.
3. **Watch (3 min).** Press **▶ Trace the path**. **Seen from above** (a map, north up): the
   ground went back and forth along one line, from north-east to south-west. **Seen from the
   side**: up went with one end of that line. Point out the two trust bars, "Moves along one
   line" and "Up goes with one end", both green here.
4. **Aim and check (6 min).** "A P wave arrives from below, slanting up and away from the quake.
   It pushes the ground up and away, or pulls it down and toward. So which end of the line is
   the quake on?" A volunteer drags on **Seen from above** to aim the class's guess. Press
   **Lock my guess and show the computer's direction** (44°), then **Show the true direction**
   (47°). The map now shows the epicenter, and the panel shows the one-station location:
   direction from the P motion, distance from S − P, about 10 km from the official epicenter.
5. **S (3 min).** Press **S window**, then **Turn to Z R T** (R is along the path to the quake,
   T is sideways). In the P window, almost all the horizontal motion is on R; in the S window
   there is more on T than on R. "P pushes along its path; S shakes across it."

## Full-period version (45–55 min, pairs)

This version chains investigations A and C. Students measure the rock's speeds on the Junction
quake, then use them, and one school station, to locate a quake whose place is hidden. If the
class has already done [How fast is the rock?](how-fast-is-the-rock.md), use its speeds and give
the time to Explore 2.

| Phase | Time | What happens |
| --- | --- | --- |
| Engage | 5 min | Play [How P and S waves move rock](../theory/waves.md#two-body-waves). "If you stood on this rock, which way would P push you? Which way would S?" Then the challenge: "Could you find a quake with only one station?" Pairs choose their prediction in C. |
| Explore 1: speeds (A) | 10 min | Pairs open the Junction quake in A and lay the **P ruler** and the **S ruler** on stations within about 100 km. They write down both speeds and work out kilometres of distance per second of S − P: \(k = V_P V_S/(V_P - V_S)\) (about 7.7 km per second with 6.1 and 3.4 km/s). |
| Explore 2: direction (C) | 15 min | Pairs open the quake "recorded at Wasatch Academy" in C (station TMU). (1) **▶ Trace the path**, then aim a guess on **Seen from above**. (2) Measure S − P: press **S window**, then **P window**, and read each window's start in the readout above the plots ("Window … to … s"); the difference is S − P to within 0.1 s. Ending on **P window** puts the window back on P. (3) Distance = S − P × \(k\). Write the answer as "___ km toward ___°" and sketch it on the map. |
| Explain | 10 min | Press **Lock my guess and show the computer's direction**, then **Show the true direction**. Discuss with [Which way the ground moves](../theory/ground-motion.md): P pushes and pulls along its path, so the line points to the quake, and "up goes with away" picks the end. Compare each pair's location with the app's one-station point (it uses Wave Race's speeds). Which was further off, the direction or the distance? |
| Elaborate | 5–10 min | **S window** and **Turn to Z R T**: compare R and T in the P window and in the S window. Then try the other stations in the **Station** menu. Which point closest? Which are marked "(far: less reliable)", and why? |
| Evaluate | 5 min | Exit ticket (below). **Download my answers (CSV)**. |

## Exit ticket

1. In the first half second of P, the ground at a station moved back and forth along a
   north–south line, and it moved up while it moved north. Which way is the quake?
2. Why does a P wave move the ground along the direction to the quake, while an S wave moves it
   across that direction?
3. At a station, S − P is 6.0 s, \(k\) is 7.7 km per second, and the P motion points to 120°.
   Where is the quake?
4. Give two reasons a one-station location can be off.

**Answers:** (1) To the south: up goes with away, so north is away from the quake. (2) P is a
push-pull (compression) wave: it moves the rock along its direction of travel. S is a shear
wave: it moves the rock across its path. (3) About 46 km away, toward 120° (east-south-east).
(4) For example: waves bend and scatter in layered, uneven rock, so the direction is off (10° to
15° is typical); a late or early S pick, or speeds that don't suit the path, change the
distance; noise in the window; a station too far from the quake.

## Answer key: offline samples

### The quake "recorded at Wasatch Academy" (Kenilworth)

Magnitude 2.7 earthquake, 15 km E of Kenilworth, Utah, September 27, 2026 02:41:58 UTC
(Saturday, September 26, 8:41 pm MDT), depth 3.2 km (USGS event `uu80158051`). From TMU it is
68 km away, toward 47° (north-east). The **Station** menu lists four three-component stations:

| Station | Distance | True direction | Computer (P window) | Error | S − P | One-station location |
| --- | --- | --- | --- | --- | --- | --- |
| TMU (Wasatch Academy) | 68 km | 47° | 44° | −3° | 10.2 s, about 78 km | lands **10 km** from the epicenter |
| MPU | 93 km | 111° | 114° | +3° | no S pick | none |
| BSUT | 93 km | 173° | 187° | +14° | no S pick | none |
| CVRU | 100 km, "(far: less reliable)" | 28° | 26° | −2° | 15.2 s, about 116 km | 17 km |

All four show clear motion (both trust bars green). At TMU the panel says "Clear motion: usually
within about 15° of the true direction."

**Reading S − P at TMU.** **P window** shows "Window 11.69 to 12.24 s" and **S window** "Window
21.85 to 22.95 s": the starts differ by 10.16 s. The picks are P at 11.74 s (University of Utah
analysts) and S at 21.95 s (the computer; the analysts picked no S here), so S − P = 10.21 s.

**Distance from students' own speeds** (10.2 s of S − P; the true distance is 68 km):

| Speeds | \(k\) (km per second of S − P) | Distance |
| --- | --- | --- |
| 6.14 and 3.41 km/s (A, analyst picks near the quake) | 7.7 | 78 km |
| 6.14 and 3.68 km/s (A, the reveal's S line out to 240 km) | 9.2 | 94 km |
| Wave Race's 5.8 and 3.3 km/s (what the app uses) | 7.66 | 78 km |

So S − P puts this quake about 10 km too far even with good speeds, and the near-station S speed
works better than the one from far stations (why: card A's [common difficulties](how-fast-is-the-rock.md#common-difficulties)).
Most of the app's 10 km miss comes from the distance, not the direction: 3° at 68 km is only
about 4 km sideways.

**Z R T at TMU** (after **Show the true direction**). In the P window, R is roughly ten times
bigger than T. In the S window, T is about one and a half times bigger than R.

### Junction quake (M3.3): more stations

The quake is described in the [How fast is the rock? answer key](how-fast-is-the-rock.md#answer-key-offline-samples).
C opens at MTPU. The menu lists the three-component stations within 200 km:

| Station | Distance | True direction | Computer | Error | One-station location |
| --- | --- | --- | --- | --- | --- |
| MTPU | 29 km | 342° | 358° | +16° | S − P 4.1 s, about 31 km; lands about 9 km away, mostly from the direction |
| TCRU | 38 km | 159° | 173° | +14° | S − P 5.1 s, about 38 km; about 9 km away (trust: "rough line") |
| FOR1 | 71 km | 97° | 99° | +2° | no S pick |
| SGU (Gunnison Valley), far | 114 km | 210° | 79° | −130° | about 210 km away (trust: "messy") |
| TMU (Wasatch Academy), far | 146 km | 220° | 249° | +29° | about 70 km away |
| SUU (Juab), far | 183 km | 194° | 313° | +120° | about 300 km away |

Two more with clear P motion, if you load the 2020 Magna earthquake in C: SPU (69 km) −5°, with a
one-station location about 9 km off; BGU (82 km) +1°.

**What to expect in general.** In a check of 271 station–quake pairs from 14 Utah quakes, the
computer's direction was typically 12–14° off, within 30° about 70% of the time, and pointed the
wrong way about 1 time in 15. With clear motion only (both trust bars green) it was typically
10° off. Beyond about 100 km it becomes unreliable: by 130–150 km, which is how far SGU and TMU
are from many recent quakes, the waves have bent and scattered too much.

## Common difficulties

- **The guess points the wrong way.** Finding the line is easy; finding which end is harder.
  Use "up goes with away": in **Seen from the side**, find the end of the line where the ground
  moved up. That end points away from the quake, so the quake is at the other end.
- **The window moved off P.** The computer works on whatever window is selected. After dragging
  it or pressing **S window**, the trust panel says "This window is not the first moment of P".
  Press **P window** before **Lock my guess and show the computer's direction**.
- **Turn to Z R T does nothing.** It needs a direction to turn to, so aim a guess first. It
  uses the best direction known so far: the guess, then the computer's, then the true one.
- **Where are the distances?** For the quake "recorded at Wasatch Academy" the Station menu
  and the panel leave the distances out until **Show the true direction**, because finding
  the quake is the students' job. For the other quakes the menu shows them ("MTPU, 29 km"):
  in the one-station challenge, treat that as the check for the S − P distance, not as the
  answer.
- **S also shows on R.** S shakes the rock across its path, and "across" can be sideways (T)
  or partly up-and-down in the plane of the path (so it shows on R and Z too). At TMU, T wins;
  at CVRU, more of the S motion is on R. P is the cleaner test: at a good station, P is almost
  all on R.
- **Discussion prompt: computer, guess and truth.** *The computer is usually within about 15°,
  even on a clear wave, but never exact. Why?* (Rock is not the same everywhere: layers, basins
  and mountains bend waves on the way, as water bends light; noise and scattered waves mix into
  the first half second.) *At TMU, S − P gave 78 km instead of 68 km, and the S time was the
  computer's pick, not an analyst's. How could you test whether the pick or the rock is to
  blame?* (Move the window to where you think S starts and read it yourself; check another
  station: CVRU's S − P is also too long, 116 km against 100 km, so a single bad pick is not the
  whole story.)

## Extension ideas

- **Every station.** Try every station in the menu for the Junction and Magna quakes. From
  everyone's CSV files, plot the computer's error against distance. Where does it stop being
  trustworthy?
- **One station or three?** Locate the Junction quake in [Wave Race](../apps/wave-race.md) with
  three circles, and compare with the one-station answers above. When is one station good
  enough, and when is it risky?
- **A quake 4,000 km away.** Load the 2025 Sand Point, Alaska earthquake in C (station SGU). Far
  away, P arrives from almost straight below. Does the motion still point toward Alaska? (With
  the default window, the computer says 334° against the true 312°: about 20° off, but the
  right way.)
- **Why S proves the outer core is liquid** (ESS.2.2). S shears the rock, and a liquid cannot be
  sheared, so S cannot cross the liquid outer core. The sideways motion students saw on T is the
  reason.

*Data: waveforms from University of Utah Seismograph Stations (network UU,
[doi:10.7914/SN/UU](https://doi.org/10.7914/SN/UU)) via EarthScope; quake locations and analyst
picks from USGS ComCat / UUSS. See [Our stations and data](../theory/stations.md).*
