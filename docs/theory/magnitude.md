# How big was it? Magnitude

**Used in:** Quake Explorer, investigation E (coming soon)

When the ground shakes, the first question is "where?" and the second is "how big?". This
page explains what a magnitude is, why each step up is so much bigger than the last, how
seismologists measure it from the wiggles on a seismogram, and why two honest measurements of
the same quake never quite agree. It builds on
[Why waves get weaker with distance](frequencies.md#why-waves-get-weaker-with-distance): if you
know how fast shaking fades, you can work back to how big the quake was.

!!! tip "In a hurry?"
    Read [Magnitude is not shaking](#magnitude-is-not-shaking),
    [Why magnitude is a logarithm](#why-magnitude-is-a-logarithm) and
    [From the biggest swing and the distance](#from-the-biggest-swing-and-the-distance), with
    its worked example. You need logarithms only to the level of "log 10 = 1, log 100 = 2".

## Magnitude is not shaking

A quake's **magnitude** is one number for the whole quake: how big it was at its source. The
**intensity** is how hard the ground shook at one place, and it is different at every town.
Intensity is usually written in Roman numerals (the Modified Mercalli scale: I is not felt, and
each higher number means stronger shaking and more damage). It can be estimated from what
people felt, which the USGS
"Did You Feel It?" service maps from people's reports, and from instruments: the USGS
ShakeMap combines both.

Two quakes show the difference. In 2026 a magnitude 3.5 quake under West Valley City drew 4,122
"Did You Feel It?" reports; a magnitude 3.3 quake near Junction, almost the same size, drew 5.
Far fewer people live near Junction. The 2020 Magna quake (magnitude 5.7) drew 26,376.

So a magnitude answers "how big was the quake?"; an intensity answers "how hard did it shake
here?".

## Why magnitude is a logarithm

Quakes come in an enormous range of sizes. On Richter's seismograph (next section), 100 km
away, the biggest swing is a thousandth of a millimeter for a magnitude 0 and about a meter for
a magnitude 6. To fit that range on one scale, magnitude counts **powers of ten**: each step up
means the biggest swing on Richter's seismograph is **10 times** taller at the same distance.

The energy grows faster. For the **moment magnitude** used for big quakes
([below](#utahs-magnitudes-and-what-the-official-number-means)), each step is about
**32 times** the energy, so two steps are 32 × 32 ≈ 1,000 times. For small quakes measured from
the swing, the energy per step is less, about 15 times in Utah.

| From | To | Swing on Richter's seismograph (same distance) | Energy (moment magnitude) |
| ---- | -- | ---------------------------------------------- | ------------------------- |
| Magnitude 3 | Magnitude 4 | 10 times | about 32 times |
| Magnitude 3 | Magnitude 5 | 100 times | about 1,000 times |
| Junction 2026 (3.3) | Magna 2020 (5.6), both measured from the swing | about 200 times | not comparable this way |

A magnitude 6 is not "twice a 3". Its swing on Richter's seismograph is 1,000 times taller, and
in moment magnitude it releases about 32,000 times the energy.

!!! question "Predict first"
    Two quakes near Kanosh, magnitude 3.63 and 2.52, happened ten minutes and about 2 km apart
    on April 19, 2026, and were recorded at the same stations. How many times taller is the
    bigger one's swing? Write down your guess, then look at Figure 1.

<figure markdown="span">
  ![Two quakes near Kanosh at station MMU, 118 km away, on its east–west sensor, drawn as Richter's seismograph would, from 10 to 75 seconds after each quake. Top: the magnitude 3.63 quake, with a tall burst of wiggles; under it, on the same scale, the magnitude 2.52 quake ten minutes later, almost a flat line. Each biggest swing is marked with a bracket: half of it is 2.24 mm for the bigger quake and 0.166 mm for the smaller. Bottom: the small quake drawn 10 times taller, now about as busy as the big one but with swings of only about 0.2 mm. Under the plot: measured, 2.24 mm divided by 0.166 mm is 13.5 times taller; predicted from the magnitudes, 1.11 steps, 10 to the power 1.11, about 13.](img/mag-two-sizes.svg){ loading=lazy }
  <figcaption>Figure 1. The two Kanosh quakes of April 19, 2026 (8:43 and 8:53 am), at station
  MMU, drawn as Richter's seismograph would have drawn them. On the same scale the smaller one
  hardly shows; magnified 10 times it looks like the big one. Data: University of Utah
  Seismograph Stations (network UU, doi:10.7914/SN/UU) via EarthScope; magnitudes from USGS
  ComCat.</figcaption>
</figure>

??? success "Answer"
    The magnitudes differ by 3.63 − 2.52 = 1.11 steps, so the swing should be 10 to the power
    1.11, about **13 times** taller. At MMU it is 13.5 times on the east–west sensor (and about
    11 times on the north–south one); over 25 stations the middle value is about 14 to 15. No
    single station gives exactly 13: each path and site is a little different, so
    seismologists use many stations. If you compare plain ground speed instead of Richter's
    seismograph, the ratio is only about 10. Small quakes put more of their shaking into high
    notes, and Richter's seismograph, which follows how far the ground moves rather than how
    fast, counts high notes less.

## How seismologists measure it

### From the biggest swing and the distance

In 1935 Charles Richter, in California, needed a way to compare quakes. He used one kind of
seismograph everywhere, the **Wood-Anderson**: a small mass hanging on a taut wire that twists
when the ground moves, magnifying the motion about 2,000 times onto photographic paper. His
rule: **a quake that makes this seismograph swing 1 millimeter at 100 km is magnitude 3.** Ten
times the swing at the same distance is magnitude 4.

<figure markdown="span">
  ![Three parts. Top: how fast the ground moved at station FOR1, 71 km from the Junction quake, east–west sensor, filtered 1 to 10 Hz as Quake Explorer shows it, from 6 to 40 seconds after the quake; a blue line marks P at 12 seconds, and the wiggles reach about 18 micrometers per second. Middle: the same record as Richter's seismograph would have drawn it, in millimeters; the biggest swing, at 21 seconds, runs from +2.7 to −2.1 mm and is marked with a bracket labeled half of this = 2.39 mm, the biggest swing is the number the magnitude uses. Bottom: a schematic of a Wood-Anderson seismograph: a small mass with a mirror hangs on a taut vertical wire held by two clamps; a lamp shines a beam onto the mirror, and the beam goes on to photographic paper on a turning drum. A note says the mass lags behind and twists the wire, and the spot of light swings about 2,000 times farther than the ground moved.](img/mag-wood-anderson.svg){ loading=lazy }
  <figcaption>Figure 2. Richter's seismograph, and what it would have drawn for the Junction
  quake at FOR1. The 2.39 mm is what the University of Utah measured too (2.39 mm). Data:
  University of Utah Seismograph Stations (network UU, doi:10.7914/SN/UU) via EarthScope;
  their amplitude via USGS ComCat.</figcaption>
</figure>

No seismic network uses a real Wood-Anderson any more. Berkeley ran them from 1928 until
January 1994 and keeps one on display. Computers take each station's modern record and work
out what a Wood-Anderson would have drawn. The University of Utah Seismograph Stations (UUSS)
still use Richter's table for Utah quakes.

Stations are never all at 100 km, so Richter made a table of how much a swing shrinks with
distance. To get a magnitude from any station:

1. read the biggest swing on the Wood-Anderson record, in millimeters (half of the largest
   peak-to-peak swing);
2. take its logarithm (log 10 = 1, log 1 = 0, log 0.1 = −1);
3. add the number from Richter's table for that distance.

| Distance | Add | Distance | Add |
| -------- | --- | -------- | --- |
| 10 km | 1.5 | 110 km | 3.1 |
| 20 km | 1.7 | 150 km | 3.3 |
| 30 km | 2.1 | 200 km | 3.5 |
| 50 km | 2.6 | 270 km | 3.9 |
| 70 km | 2.8 | 300 km | 4.0 |
| 100 km | 3.0 | | |

*Part of Richter's distance table (Richter 1958, Table 22-1). Between rows, go part of the way:
at 75 km, add about 2.85.*

**Worked example: the Junction quake (October 31, 2026, UTC).** The swings below are the ones
UUSS measured and published (the mean of each station's two sideways sensors). Each magnitude
is log(swing) plus the number from the nearest row of Richter's table (30, 70, 270 and 110 km).
The official magnitude is 3.3.

| Station | Distance | Swing (mm) | log + table = magnitude |
| ------- | -------- | ---------- | ----------------------- |
| MTPU | 29 km | 10.1 | 1.00 + 2.1 = **3.1** |
| FOR1 | 71 km | 1.81 | 0.26 + 2.8 = **3.1** |
| HLJ | 269 km | 0.261 | −0.58 + 3.9 = **3.3** |
| SGU | 114 km | 8.47 | 0.93 + 3.1 = **4.0** |

The swing shrank about 40 times from MTPU to HLJ, yet the three stations agree within 0.2: the
table did its job. SGU says 4.0, most of a step too big;
[Why stations disagree](#why-stations-and-methods-disagree) explains. The University of Utah's
official value is 3.3: the average of 30 stations, each with its own correction.

<figure markdown="span">
  ![Two charts sharing a distance axis from 20 to 400 km on a log scale, for the Junction quake at 30 stations. Top: the biggest swing at each station, in millimeters on a log scale, from about 22 mm down to about 0.1 mm; the dots fall from upper left to lower right, and a red stepped line, Richter's table for magnitude 3.3, runs through the middle of them. MTPU (29 km, 10 mm), FOR1, SGU, TMU, WPUT and HLJ (269 km, 0.26 mm) are labeled; WPUT, SGU and TMU sit well above the line. Bottom: the magnitude each station gives, from 2.6 to 4.6, with a red line at the University of Utah's 3.30 and a pink band from 3.0 to 3.6. Most dots sit in or near the band at every distance; WPUT (4.45), SGU (4.03) and TMU (3.81) are above it. A blue triangle at the right edge marks the middle value of the 30 stations, 3.29. A note says 19 of the 30 stations land within 0.3 of 3.30, with no station corrections.](img/mag-junction-stations.svg){ loading=lazy }
  <figcaption>Figure 3. The Junction quake at every station the University of Utah measured
  10–300 km away. Top: the swings fade with distance, and Richter's table follows them. Bottom:
  after the table, distance no longer matters; the middle value, 3.29, matches the official
  3.30. These numbers are in [junction-swings.csv](data/junction-swings.csv) for the
  [Make it](#make-it-fit-your-own-fading-curve) task. Swings: the University of Utah's
  published amplitudes via USGS ComCat; stations: network UU (doi:10.7914/SN/UU).</figcaption>
</figure>

### From how long it shakes

A bigger quake doesn't only shake harder; it shakes **longer**. After the main waves pass, the
ground keeps ringing for a minute or more as waves scattered through the crust arrive (the
**coda**). A bigger quake starts its coda higher, and the coda dies away at about the same rate,
so it takes longer to fall to a fixed line. So the time from the first wave until the shaking
falls to that line also measures the size: the **duration magnitude**. The University of Utah
works it out for nearly every quake, and for about half of the smallest ones it is the
magnitude they report.

The University of Utah's line is an average ground speed of 0.017 micrometers per second (a
micrometer is a thousandth of a millimeter). They chose it as the typical background noise of
their older stations. A station's own noise matters either way. At a station whose noise sits
close to the line, the shaking takes much longer to sink below it, so the count runs long
(Figure 4). Ending the count by eye instead, "where it sinks back into the noise", gives
durations that are too short at noisy stations.

<figure markdown="span">
  ![Two charts of the Junction quake from 60 seconds before to 420 seconds after it: the average ground speed in 2-second pieces, on a log scale from 0.001 to 10 micrometers per second, with a red dashed line at the University of Utah's 0.017 micrometers per second and a blue line at the P arrival. Top: CCUT, 125 km away, a quiet station with noise of 0.004 micrometers per second before the quake; the shaking jumps at P to about 1, then slowly sinks and crosses the line 139 seconds after P. An arrow marks the duration, 139 s, the same as the University of Utah's; magnitude from this duration 3.0. Bottom: EKU, 136 km away, a noisier station with noise of 0.014, close to the line; the shaking sinks much more slowly to the line, crossing it 326 seconds after P (the University of Utah: 326 s); magnitude from this duration 3.9. A note says both are the same quake, whose duration magnitude from 29 stations is 3.28.](img/mag-duration.svg){ loading=lazy }
  <figcaption>Figure 4. How long the Junction quake shook at two stations. Our count matches the
  University of Utah's at both, yet the noisy station gives 3.9 and the quiet one 3.0: a
  duration magnitude needs many stations. Data: University of Utah Seismograph Stations
  (network UU, doi:10.7914/SN/UU) via EarthScope; their durations via USGS ComCat.</figcaption>
</figure>

Duration works on average, with many stations; single stations can disagree by a whole step.
The Utah formula was calibrated on quakes up to about magnitude 5, and very big quakes ring
for longer than short records last.

## Why stations and methods disagree

Every station gives its own answer, and they never quite agree. Typical station magnitudes for
one quake spread about 0.3 either way. The reasons:

- **The station's site.** Soft sediment in a valley shakes more than rock, and some stations
  read high or low for reasons of their own. SGU, a mountain station above the Gunnison Valley,
  reads about half a step too big for most quakes, though much less for some source areas
  (Figure 5). Seismologists give such stations a correction.
- **The path and the direction.** A quake sends out stronger waves in some directions than
  others, and the rock along each path differs.
- **The instrument.** A record that clipped (hit its limit) hides the real peak. In the 2020
  Magna quake, clipped stations read up to 3 steps too small (see
  [Instrument problems](seismograms.md#instrument-problems)).
- **Noise.** A small, distant quake barely rises above the background.

<figure markdown="span">
  ![Two panels, SGU (the stand-in for Gunnison Valley) and TMU (the stand-in for Wasatch Academy). Each has one row per area the quakes came from, with the number of quakes, and an axis of the station's magnitude minus the University of Utah's, from −0.4 to +0.8, with a dark line at zero. Orange circles are the two sideways sensors; blue squares the up-down sensor. At SGU the orange circles sit far right of zero for Kanosh (+0.61, 8 quakes), Junction (+0.65), Mount Pleasant (+0.66), Leamington (+0.44) and Panguitch (+0.41), less for Milford (+0.30) and hardly at all for Kenilworth (+0.07); Torrey, West Valley City and Fayette have no usable record. At TMU they sit at +0.4 to +0.55 for Kanosh, Junction, Kenilworth and Leamington but near zero for Milford, Panguitch and West Valley City. The blue squares stay near zero, between about −0.25 and +0.3. Bottom row, all these quakes: SGU +0.50 sideways and +0.01 up-down (19 quakes), TMU +0.34 and +0.01 (22 quakes).](img/mag-stations-high.svg){ loading=lazy }
  <figcaption>Figure 5. Two stations that read high, SGU and TMU, the stand-ins for two of our
  schools. Both are mountain stations, not valley ones; why they read high on their sideways
  sensors, and by how much from each direction, is not known. Data: University of Utah
  Seismograph Stations (network UU, doi:10.7914/SN/UU) via EarthScope; magnitudes from USGS
  ComCat.</figcaption>
</figure>

That is why seismologists use many stations. The University of Utah **averages** its stations
after correcting each one. Without corrections, the **middle value** is safer: a few odd
stations move an average more than a middle value. With 5 or more good stations, the middle
value usually lands within about 0.3 of the official value; with 10, nearly always.

??? note "How sure is \"usually\"? The numbers, for teachers and the curious"
    <figure markdown="span">
      ![A line chart: the share of groups whose middle value lands within 0.3 of the University of Utah's magnitude, from 0 to 100%, against the number of stations in the group: 1, 3, 5 and 10. The dark blue line, 10 quakes held out from all tuning, rises from 62% with 1 station to 79% with 3, 86% with 5 and 97% with 10. A lighter line for the 22 training quakes runs almost on top of it.](img/mag-how-many.svg){ loading=lazy }
      <figcaption>Figure 6. How often a group of students lands within 0.3 of the official
      value, by the number of stations it uses. Each group takes its stations at random from
      those Quake Explorer loads and gives their middle value (400 groups per quake).</figcaption>
    </figure>

    - **Where the numbers come from:** 32 Utah-region quakes of magnitude 2.1 to 4.4 (2022–2026),
      plus Magna 2020. Ten of them, from six areas, were chosen by a fixed rule and held out
      from all tuning: nothing was adjusted after seeing them. The recipe is the one on this
      page: Richter's simulated seismograph, both sideways sensors, Richter's table, the middle
      value, no station corrections.
    - **What they show:** with 5 stations, 86% of groups on the held-out quakes (89% on the
      others) land within 0.3; with 10 stations, 97%. Using every station Quake Explorer loads
      (11 to 23), all 32 quakes land within 0.3; on average the answer is 0.03 to 0.05 above
      the official value, because the stations have no corrections.
    - **What they don't promise:** quakes below magnitude 2, quakes above 5 whose nearby
      stations clipped, or regions outside Utah. Groups that use up-down sensors only should
      add 0.2 and use the middle value.
    - The check can be rerun on new quakes: `tools/quake-explorer/magnitude-check.mjs` in the
      site's code.

Different **methods** also give different numbers, because each measures something slightly
different. For the 2026 Kanosh quake the University of Utah lists 3.63 from the biggest swings
(its preferred value), 3.89 from the duration, and 3.84 from a newer method that uses the
coda's long-period waves. Each is a separate measurement with its own uncertainty, not a vote
to average. Together they say the quake was about 3.6 to 3.9.

<figure markdown="span">
  ![Five rows, one per quake, each with its own magnitude axis one step wide. Circles are ML (from the biggest swing), squares Md (from the duration), triangles Mw (moment magnitude); the filled one with a bold label is the one the catalog reports. Magna, March 2020: ML 5.61, Md 5.67, Mw 5.70 filled. West Valley City, February 2026: Md 3.45, ML 3.52 filled, Mw 3.56 (worked out from coda waves). Torrey, March 2026: ML 3.96 filled, Md 4.20. Kanosh, April 2026: ML 3.63 filled, Mw 3.84 (from coda waves), Md 3.89. Junction, October 2026: Md 3.28, ML 3.30 filled. A note says that for the same quake the methods land up to a few tenths apart.](img/mag-several-numbers.svg){ loading=lazy }
  <figcaption>Figure 7. One quake, several numbers. Each method gives its own value; the
  catalog reports one (filled), and the others are not averaged in. Magnitudes: University of
  Utah Seismograph Stations via USGS ComCat.</figcaption>
</figure>

## Utah's magnitudes, and what the official number means

The University of Utah Seismograph Stations locate and measure the quakes their network detects
in and around Utah. On a USGS event page the magnitude comes with a type:

- **ml**, local magnitude ([from the biggest swing](#from-the-biggest-swing-and-the-distance)):
  for almost all quakes of about 2 and up, and about half of the smaller ones. UUSS prefers it
  whenever it can be measured;
- **md**, duration magnitude ([from how long it shakes](#from-how-long-it-shakes)): for the
  other half of the smallest quakes;
- **mw**, moment magnitude, for the big ones. It comes from the seismic moment: the size of the
  fault patch that slipped, how far it slipped and the stiffness of the rock, measured from
  long, slow waves. It is the scale used for large quakes worldwide. Richter's local magnitude
  is read from short, quick waves at nearby stations, and for very big quakes those swings stop
  growing in step with the quake, near magnitude 6.5 to 7.

The first number appears within minutes and is computed automatically. For larger quakes a
seismologist checks it within about an hour, and it can change. The local magnitude is the
average of many stations, each corrected for its site. Other methods give values a few tenths
apart, so treat the last digit with care.

Why does this matter in Utah? Small quakes happen every week; a magnitude 5 somewhere in Utah
about once a decade on average. Planners estimate a 43% chance of a magnitude 6.75 or larger
quake in the Wasatch Front region in the next 50 years. Measuring magnitudes carefully is how
we know how often each size happens.

## Make it: fit your own fading curve

Richter's table is a model built from data. Build your own from the Junction quake.

1. Download the station table:
   [junction-swings.csv](data/junction-swings.csv) (30 stations: name, distance in km,
   and the biggest swing in mm, measured by UUSS). Open it in a spreadsheet (Google Sheets
   works on a Chromebook).
2. Add two columns: log10 of the distance and log10 of the swing (in Google Sheets,
   `=LOG10(C2)`).
3. Make a scatter chart of log swing against log distance, and add a straight trend line
   (`=SLOPE(…)` and `=INTERCEPT(…)` give its numbers). The slope says how fast the swing
   fades: a slope of −2 means twice as far, a quarter of the swing.
4. Now use Richter's table: for each station, magnitude = log10(swing) + the table's number
   for its distance. Make a second chart: station magnitude against distance, with a
   horizontal line at the official 3.3. Which stations read high or low? Does distance
   matter after the correction?

??? success "What you should find"
    - **The fit:** a slope of about −1.9 (log swing = 4.1 − 1.86 × log distance). Twice as
      far, a little more than a quarter of the swing (2 to the power −1.86 ≈ 0.28). The
      stations scatter about the line by a factor of about 2.7 either way (0.43 in log10).
    - **Richter's table** falls by 1.9 in log from 30 to 300 km, the same slope on average,
      but it isn't a straight line: it falls more slowly between 50 and 100 km (about −1.3)
      and faster beyond (about −1.7 from 100 to 200 km). Your straight line can't follow that
      bend, which is one reason seismologists use the table.
    - **The magnitudes:** most stations land between 3.0 and 3.6, at every distance; the middle
      value is about 3.3. WPUT, SGU and TMU read high (Figure 3). After the correction,
      distance no longer matters: that is what the table is for.
    - Compare: [Why waves get weaker with distance](frequencies.md#why-waves-get-weaker-with-distance)
      found ground speed fading as distance to the power −1.7 for the same quake.

## Try it

1. Using the table above, what magnitude does a 1 mm swing at 100 km give? At 50 km?
2. A quake makes a 5 mm swing at FOR1 (71 km). What magnitude is it?
3. In moment magnitude, how many magnitude 4 quakes release as much energy as one magnitude 6?
4. SGU read 4.0 for Junction. What correction should SGU get? How would you check it with a
   second quake? Why would a quake from a different direction help?
5. Why do you think duration magnitude stops working for very big quakes? (Hint: how long would
   you have to record?)
6. Look up the latest Utah quake on the [USGS map](https://earthquake.usgs.gov/earthquakes/map/).
   What magnitude type is it, and why?

??? success "Answers"
    1. log 1 = 0, so 0 + 3.0 = **3.0** at 100 km (Richter's definition), and 0 + 2.6 = **2.6**
       at 50 km: the same swing closer by means a smaller quake.
    2. log 5 ≈ 0.70, and the table gives about 2.8 at 71 km: **about 3.5**.
    3. Two steps, each about 32 times the energy: 32 × 32 ≈ **1,000 magnitude 4 quakes**.
    4. 3.3 − 4.0 = **−0.7**. With a second quake, compute SGU's magnitude and subtract the
       official value; if it reads high by the same amount again, the correction is real. A
       quake from another direction helps because some of SGU's excess comes from the path:
       for the Kanosh and Junction quakes it reads about 0.6 high, for the Kenilworth quake,
       to its northeast, hardly at all (Figure 5). (UUSS gives SGU no correction and leaves it out of its
       average.)
    5. A big quake's coda lasts many minutes, longer than the records the method was built on,
       and the Utah formula was calibrated only up to about magnitude 5.
    6. It depends on the quake. Most Utah quakes of magnitude 2 and up show **ml**; many
       smaller ones show **md**; a big one may show **mw**.

Using these records in your own work? [Credit the data](stations.md#how-to-credit-the-data).
Data on this page: University of Utah Seismograph Stations (network UU, doi:10.7914/SN/UU) via
EarthScope; amplitudes and magnitudes from UUSS via USGS ComCat; felt reports from USGS
"Did You Feel It?".
