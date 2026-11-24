# Activity card: How fast is the rock?

Students follow [investigation A in the Quake Explorer guide](../apps/quake-explorer.md#a) (what
they see, step by step) and use [Quake Explorer](../app/quake-explorer/index.html?event=uu80162166&inv=A).

!!! abstract "At a glance"
    - **Driving question:** How fast do waves travel through the rock under Utah, and how deep
      does the crust go?
    - **Time:** 15 min (whole class, on the projector) or 45–55 min (pairs).
    - **Setup:** Browser only. Live records from University of Utah stations, or the offline
      samples if the school network blocks them.
    - **Apps and tools:** [Quake Explorer](../apps/quake-explorer.md), investigation A (the record
      section)
    - **Before this:** [Quake Locator](wave-race-card.md) (this lesson answers "where did 5.8 and
      3.3 km/s come from?")
    - **Materials:** Student devices with a browser (Chromebooks are fine) and a projector.
    - **Utah standards:** PHYS.4.1 · ESS.2.2 · GEOL.3.x · CS&nbsp;11/12.DA.1
      ([crosswalk](standards.md#quake-explorer))

**Students will:** read a record section (many seismograms stacked by distance); measure the
speeds of P and S waves from the slope of their arrivals; explain why the slope is the speed;
compare their measurement with University of Utah analysts' picks; find the bend where a faster
wave along the top of the mantle overtakes the direct wave, and use it to estimate how thick
the crust is.

**Quakes to load.** Two quakes in Quake Explorer; each link opens investigation A:

| Quake | Use it for | Live data | Offline sample |
| --- | --- | --- | --- |
| 2026 Junction quake (M3.3) | Measuring P and S (the worked example) | [Open](../app/quake-explorer/index.html?event=uu80162166&inv=A) | [Open](../app/quake-explorer/index.html?event=uu80162166&inv=A&source=sample) |
| 2020 Magna earthquake (M5.7) | The bend, and the crust's thickness | [Open](../app/quake-explorer/index.html?event=uu60363602&inv=A) | [Open](../app/quake-explorer/index.html?event=uu60363602&inv=A&source=sample) |

No accounts or logins. Student names are never entered or stored.

!!! tip "Before class"
    Open both links on the school network. Each record section downloads 20 to 30 stations,
    which takes a few seconds. If they don't load, use the offline links (or **Use the offline
    samples**, top right in the app): the [answer key](#answer-key-offline-samples) below is for
    those. With live data the app may choose a slightly different set of stations, so its
    numbers can differ a little. What to ask IT to allow, and how to send the whole class to
    the same quake, are under [Before class](index.md#before-class).

## 15-minute version (whole class, on the projector)

1. **Hook (2 min).** Open the Junction quake. "Each wiggly line is one station, placed at its
   distance from the quake: the nearest at the top, 300 km at the bottom. What do you notice
   about when the shaking starts?" (Later and later down the page.)
2. **Predict (2 min).** Read out the panel's question: "A station 300 km from the quake: when
   does the first wave (P) reach it?" Take a class vote and choose the winning answer under
   **1 · Predict first**.
3. **Measure (6 min).** Press **P ruler** and drag its ends onto the first small wiggles at MTPU
   (the top line) and at a station about 100 km down. Read its speed in the panel. A volunteer
   lays the **S ruler** along the start of the big S waves. Read **P ÷ S**.
4. **Why (2 min).** Each station is a stopwatch at a known distance. A wave traveling at a
   steady speed needs the same extra time for every extra kilometer (for P, about 1 s per
   6 km), so its arrivals line up, and the slope of the line is distance ÷ time: the speed.
   The steeper the line, the faster the wave.
5. **Check (3 min).** Press **Reveal the professionals' picks**. P is about 6.1 km/s and S about
   3.7 km/s, and P reaches 300 km about 49 s after the quake. Who chose "About 50 s"? Compare
   with Quake Locator's 5.8 and 3.3 km/s.

## Full-period version (45–55 min, pairs)

| Phase | Time | What happens |
| --- | --- | --- |
| Engage | 5 min | Hook as above. "In Quake Locator the app gave us 5.8 and 3.3 km/s. How could we measure speeds like that ourselves?" Pairs choose their prediction in the panel and write one sentence saying why. |
| Explore | 15 min | Pairs lay both rulers on the Junction record section and record P, S and P ÷ S. Then they lay the P ruler on stations within 100 km only, and on stations beyond 200 km only, and record both speeds. Last, they switch **Wiggles** to **true ground speed** and describe what happens to the far stations. |
| Explain | 10 min | Press **Reveal the professionals' picks** and discuss with [Travel times and Earth's layers](../theory/travel-times.md). Why the slope is the speed: distance runs down the page and time across, like a distance–time graph. Why P is faster than S: P squeezes the rock and S shears it, and rock resists squeezing more than shearing. Why far stations looked as big as near ones: each trace was stretched to fit; on one true scale, a station 300 km away moves about 50 times less than one 30 km away. |
| Elaborate | 10–15 min | Load the 2020 Magna earthquake (stations out to 400 km). Pairs lay the P ruler on the first arrivals within about 120 km and write down its speed, then move it onto the first arrivals beyond about 180 km. Faster? Reveal: beyond about 143 km the first arrivals follow a 7.7 km/s line. That wave dived to the top of the mantle (the Moho), raced along it in faster rock and came back up: Pn. Far enough away, the longer path in faster rock wins, like a detour on the freeway beating the side streets. Where the two lines cross tells how thick the crust is: about 36 km here. Strong students can tick **Reduced time (advanced)**. |
| Evaluate | 5–10 min | Exit ticket (below). Optional: everyone presses **Download my answers (CSV)**, and the class compares its ruler speeds. |

## Exit ticket

1. A ruler runs from a station 30 km from the quake (the wave arrives 5 s after the quake) to
   one 150 km away (the wave arrives 25 s after). What speed does it show? Is the wave more
   likely P or S?
2. Why do the arrivals at many stations line up along a straight line?
3. Your P ruler says 6.6 km/s; the professionals' line says 6.1 km/s. Give a possible reason.
4. Beyond about 150 km from the Magna quake, the first waves arrive *earlier* than the P line
   predicts. How can a wave that travels a longer path arrive first?

**Answers:** (1) (150 − 30) km ÷ (25 − 5) s = 6 km/s: P (S is about 3.5 km/s). (2) Each station
is at a known distance, and a wave traveling at a steady speed needs time in proportion to the
distance, so time against distance is a straight line whose slope is the speed. (3) For example:
the ruler reaches the farthest stations, where the first wave is the faster one along the top of
the mantle; an end placed on noise or on the wrong wiggle. (4) It dips down into the mantle,
where P travels at about 7.7 km/s instead of about 6.1 km/s, so the higher speed more than makes
up for the longer path.

## Answer key: offline samples

### Junction quake (M3.3): the worked example

Magnitude 3.3 quake, 8 km NW of Junction, Utah, October 31, 2026 04:44:15.58 UTC (October 30,
10:44 pm MDT), depth 4.0 km (USGS event `uu80162166`; the same quake as the
[Quake Locator answer key](wave-race-card.md#answer-key-offline-sample-quake)). The record section
has 23 stations, from MTPU (29 km) to BGU (299 km). The school stand-ins, in orange, are WCU
(Millard, 77 km), SGU (Gunnison Valley, 114 km), TMU (Wasatch Academy, 146 km), ELU (North
Sanpete, 177 km) and SUU (Juab, 183 km).

| Measurement | Good student answers | What the reveal shows |
| --- | --- | --- |
| P speed | 5.8–6.5 km/s | **6.14 km/s**, from 6 analyst picks within 100 km |
| S speed | 3.3–3.8 km/s | **3.68 km/s**, from 16 picks out to 240 km (3 by analysts, 13 by the computer). The 3 analyst picks alone, all within 77 km, give 3.41 km/s |
| P ÷ S | 1.65–1.85 | 1.67 from the two lines; 1.80 with the analysts' S speed |
| Prediction | "About 50 s after the quake" | P would reach 300 km about **49 s** after the quake |
| The bend | Only a hint | No bend line. The panel asks students to look at the farthest stations: the computer's P picks at HLJ (269 km, 41.1 s) and BSUT (282 km, 43.8 s) arrive about 3 s before the P line |

Picks to check rulers against (University of Utah analysts; seconds after the quake):

| Station | Distance | P | S |
| --- | --- | --- | --- |
| MTPU | 29 km | 5.07 s | 9.21 s |
| TCRU | 38 km | 6.92 s | 11.99 s |
| WCU (Millard stand-in) | 77 km | 12.93 s | 23.33 s |

A P ruler from MTPU to WCU reads 6.1 km/s, and an S ruler between the same two stations reads
3.4 km/s. A P ruler from MTPU to BSUT (282 km) reads about 6.5 km/s, because the farthest first
arrivals already ride on the faster wave along the top of the mantle.

**True ground speed** works for this quake: the biggest wiggles shrink roughly as distance to
the power −1.7, so the station at 300 km moves about 50 times less than the one at 30 km.

### Magna earthquake (M5.7, 2020): the bend

Magnitude 5.7 earthquake, 5 km NNE of Magna, Utah, March 18, 2020 13:09:31.53 UTC (7:09 am
MDT), depth 11.9 km (USGS event `uu60363602`). The record section has 30 stations, from NOQ
(12 km) to VRUT (397 km).

| Measurement | What the reveal shows |
| --- | --- |
| P near the quake | **6.07 km/s**, from 8 analyst picks within 100 km |
| S | **3.64 km/s**, from 8 picks (1 by an analyst, 7 by the computer; they scatter a lot) |
| P at 300 km, from the near line | about 50 s |
| The bend | "Look past 143 km": the first arrivals leave the 6.22 km/s line (Pg) and follow a **7.67 km/s** line (Pn) |
| Crust thickness | about **36 km** |

Students' rulers: on the first arrivals within about 120 km, 6.0–6.3 km/s; beyond about 180 km,
usually 7.5–8 km/s (anything from about 7.2 to 8.4 km/s, depending on the two stations chosen,
because the computer's picks out there scatter by a second or so). For example, a ruler from
NMU (257 km, P at 38.8 s) to VRUT (397 km, P at 57.0 s) reads 7.7 km/s. The reveal's two
numbers for P near the quake (6.07 and 6.22 km/s) differ because the second comes from the
two-line fit, which also uses stations out to the bend. Both say "about 6.1–6.2 km/s". The
science page [Travel times and Earth's layers](../theory/travel-times.md) fits all 31 stations
of this quake and gets 7.78 km/s and 37 km: say "Pn about 7.7–7.8 km/s, crust about 36–37 km"
if students compare.

Ten records are **clipped** (the sensor reached its limit, so the trace has flat tops): NOQ,
HRU, GMU, MTUT, ELU, FSU, ARGU, WCU, NMU and ARUT. That is why **Wiggles** offers "true ground
speed (not for this quake)". P can still be picked on clipped records.

**SGU** (Gunnison Valley's stand-in, 178 km) has no pick. In 2020 its record is about 100 times
weaker than its neighbors'; no clear quake (Figure 3 on
[Travel times and Earth's layers](../theory/travel-times.md)).

## Common difficulties

- **Ruler ends on noise.** P is the first small change, not the biggest wiggle. Far stations
  are stretched to fit, so their noise looks as big as the quake. Zoom in (**＋** or scroll)
  to see where the wiggles change.
- **"Steeper is faster" feels backwards.** Distance runs down the page and time across. A fast
  wave covers many kilometers in a few seconds, so its line is steep; a slow wave's line leans
  over toward the time axis. It is a distance–time graph turned so that distance grows
  downward.
- **A ruler across the whole page.** On Junction, a P ruler from the top station to the bottom
  one reads 6.5 km/s or more. That is not a mistake: the farthest first arrivals belong to the
  faster mantle wave. Use it as the way into the Magna bend.
- **Two "professional" S speeds.** Junction's analysts picked S at only 3 stations (3.41 km/s);
  with the computer's picks out to 240 km the line says 3.68 km/s. Discussion prompt: *Why is
  S harder to pick than P?* (S arrives while the ground is still shaking from P, so its start
  hides in the P wave's tail; the computer's S picks scatter by about ±0.75 s around the
  analysts' line.) *Why might a line through far stations come out a little faster?* (Waves
  to far stations dive deeper, into faster rock.)
- **Squares instead of circles beyond about 180 km.** The analysts stopped picking there, so the
  bend rests on the computer's picks (squares), shown only where the arrival stands out
  clearly. Discussion prompt: *The bend appears only where the analysts stopped picking. Should
  we believe it? What would convince you?* (Many stations fall on one straight line rather than
  a scatter; the line's speed, about 7.7 km/s, is close to the roughly 8 km/s usually measured
  just below the crust; other big quakes should show the same bend.)
- **Clipped records** (Magna). The flat tops mean the sensor maxed out: the ground moved more
  than it could record. P can still be picked, but the true size is unknown, which is why true
  ground speed is off for this quake.
- **"No usable data from …"** With live data, a few stations return nothing; the note under the
  record section names them. Skip them.

## Extension ideas

- **Your speeds in Quake Locator.** Turn the measured speeds into kilometers of distance per second
  of S − P: \(k = V_P V_S/(V_P - V_S)\). With 6.14 and 3.41 km/s, \(k\) is 7.7 km per second,
  the same as Quake Locator's default 5.8 and 3.3 km/s (7.66). With 3.68 km/s for S it is 9.2.
  Enter both pairs in Quake Locator's speed settings for the Junction quake: which locates it
  better? Why can two different pairs of speeds give the same \(k\)?
- **Reduced time (advanced).** Tick it: each wiggle moves left by its distance ÷ 8 km/s. An
  8 km/s wave now runs straight down the page and slower waves lean to the right. On Magna,
  Pn is almost vertical and Pg leans. Why does taking most of the travel time away make the
  bend easier to see?
- **Crust thickness by hand** (physics and math). Extend the Pn line back to distance 0. The
  time it reaches there is the intercept time, \(t_i = t - d/V_2\) for any station on the line
  (for VRUT, 57.0 − 397/7.7 ≈ 5.4 s). For a
  quake at depth \(h\) under a crust of thickness \(H\):
  \(H = \tfrac{1}{2}\left(t_i V_1 / \sqrt{1 - (V_1/V_2)^2} + h\right)\). With \(V_1 = 6.2\) km/s,
  \(V_2 = 7.7\) km/s and \(h = 12\) km, that gives about 34–36 km. Andrija Mohorovičić found the
  base of the crust this way in 1909, from a Croatian earthquake.
- **A class model** (CS 11/12.DA.1). Collect everyone's CSV files and plot all the P ruler
  speeds. How does the class's spread compare with the professionals' line? Which is the
  better model of the data, and why?

*Data: waveforms from University of Utah Seismograph Stations (network UU,
[doi:10.7914/SN/UU](https://doi.org/10.7914/SN/UU)) via EarthScope; quake locations and analyst
picks from USGS ComCat / UUSS. See [Our stations and data](../theory/stations.md).*
