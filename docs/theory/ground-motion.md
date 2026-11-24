# Which way the ground moves

**Used in:** [Quake Explorer](../apps/quake-explorer.md)

A seismogram usually shows the ground moving up and down. But the ground moves in three
dimensions, and the *direction* it moves in is a message too. [P waves push and pull along
their path; S waves shake across it](waves.md#two-body-waves). This page shows, with real
Utah records, how that lets one station tell **which way the quake is**, and how a single
station can even locate a quake.

!!! tip "In a hurry?"
    For Quake Explorer's investigation C you need the first three sections: three sensors and
    the path, P along and S across, and pointing to the quake.

## Three sensors at right angles

A **three-component** seismometer records the ground's motion in three directions at right
angles: **up and down (Z)**, **north and south (N)** and **east and west (E)**. The simplest kind
has three sensors pointing those ways. Each one feels only the part of the motion along its own
direction; together they give the ground's full motion in three dimensions. Stations TMU and SGU,
the stand-ins for Wasatch Academy and Gunnison Valley, have three-component broadband
seismometers.

At every moment (100 times per second), the three numbers make one point in space. Join the
points and you get the **path the ground traced**. Seismologists call it the **particle motion**,
and a drawing of it a **hodogram**. Seen from above, it is a little map of the ground's motion.

<figure markdown="span">
  ![Left: a sketch of a small sensor case on the ground with three arrows at right angles, labeled up (Z), north (N) and east (E). Middle: the north and east records of station TMU during the first half second of a P wave, from 11.69 to 12.23 seconds after the quake; both curves are flat at first, rise a little at a moment marked 2, then fall steeply to a moment marked 3. Right: the path seen from above, in a circle with N at the top and E at the right: the points join into a straight line from north-east (moment 2) through the middle (moment 1) to south-west (moment 3).](img/gm-three-sensors.svg){ loading=lazy }
  <figcaption>Figure 1. From three sensors to one path. At station TMU, during the first half
  second of the P wave from the Kenilworth quake (below), the north and east readings rise and
  fall together, so the ground moved back and forth along one line, from north-east to
  south-west. Filtered 1–5 Hz. Data: University of Utah Seismograph Stations (network UU,
  doi:10.7914/SN/UU) via EarthScope; quake and P pick from USGS ComCat.</figcaption>
</figure>

!!! note "Speed, not position"
    These sensors record how fast the ground moves (its velocity), not where it is. So the
    path is drawn from the ground's speed in each direction. When the ground moves back and
    forth along one line, its velocity points along that same line too, so the direction comes
    out the same either way.

**Sensors that don't point north.** Some sensors can't be lined up with north: at the bottom of
a borehole, for example, nobody can turn them by hand. Then the station's records say which
way its two horizontal sensors point (their **azimuths**, in degrees clockwise from north), and
the computer turns the readings into north and east. If sensor 1 points along \(a_1\) and reads
\(h_1\), and sensor 2 points along \(a_2\) and reads \(h_2\), then

$$
\text{north} = h_1\cos a_1 + h_2\cos a_2, \qquad \text{east} = h_1\sin a_1 + h_2\sin a_2
$$

For example, the two horizontal sensors of station FSB1, at the Utah FORGE geothermal site near
Milford, point 257° and 347°. Quake Explorer does this turn for you.

## P pushes along the path, S shakes across it

We can turn the two horizontal sensors in the computer to face any direction we like. Turn
them to face the quake, and the horizontal motion splits into two parts:

- **R (radial):** along the path, toward or away from the quake (+ means away);
- **T (transverse):** sideways, across the path.

If the direction to the quake is \(\beta\) (degrees clockwise from north), then

$$
R = -(N\cos\beta + E\sin\beta), \qquad T = N\sin\beta - E\cos\beta
$$

Now the [Seismic waves](waves.md) page makes a prediction we can test. A P wave pushes and
pulls **along** its path, so it should move Z and R, but hardly T. An S wave shakes **across**
its path, so it can move T.

<figure markdown="span">
  ![Left: a sketch seen from above of station MTPU, with its north and east sensors as thin gray arrows, a dashed orange line to the quake at 342 degrees, a thick arrow R pointing away from the quake (to the south-south-east) and a thick arrow T pointing sideways (to the west-south-west). Right: two columns of three traces, Z, R and T. During P, from 4.8 to 6.3 seconds: Z and R swing strongly, T only a little; a note reads T is only 29 percent of R, P hardly moves the ground sideways. During S, from 8.9 to 11.4 seconds, drawn 10 times smaller: T has the biggest swings, R and Z smaller ones; a note reads T is 1.3 times R, S shakes the ground across the path.](img/gm-radial-transverse.svg){ loading=lazy }
  <figcaption>Figure 2. Station MTPU, 29 km from the magnitude 3.3 quake near Junction,
  Utah, turned to face the quake. Each column has one scale for all three traces. During P the
  sideways (T) motion is small; during S it is the largest. Filtered 1–10 Hz; P and S lines
  are University of Utah analysts' picks. Data: University of Utah Seismograph Stations (network
  UU, doi:10.7914/SN/UU) via EarthScope; picks via USGS ComCat.</figcaption>
</figure>

- **During P,** the T trace stays small: its typical size is only 29% of R's. P moves the
  ground up and down (Z) and toward and away from the quake (R), because its path rises from
  below through the upright slice of ground between the quake and the station.
- **During S,** T comes alive: it is 27 times bigger than during P, and 1.3 times as big as R.
- S also moves R and Z. "Across the path" includes up and down too, not only sideways. Only S
  can shake T, though, so T is the place to look for it.
- Why is P's T not exactly zero? Real rock is not uniform, so the wave can arrive a little off
  the straight line from the quake, and scattered waves arrive from other directions too. More
  about this [below](#why-it-isnt-perfect).

This is real evidence, from one station's record, that P waves are **longitudinal** (they move
the ground along their path) and S waves **transverse** (across it).

## Pointing to the quake

During the first moment of P, the ground moves along the P wave's path, so seen from above it
moves back and forth along the line to the quake. That line has two ends, though: is the quake
to the north-east or to the south-west? The vertical sensor settles it.

### Up goes with away

Rock gets faster with depth, so a wave's path bends upward on its way, the way light bends when
it passes into glass at a slant. By the time a P wave reaches the station, it is coming **up
from below**, slanting **away from the quake**.

- If the first P wave is a **push** (compression), it shoves the ground the way the wave
  travels: **up and away** from the quake.
- If it is a **pull** (dilatation), it drags the ground the other way: **down and toward** the
  quake.

Either way, **up goes with away**. So find the line, then see which end the ground moved toward
while it moved up: that end points away from the quake, and the quake is at the other end.

<figure markdown="span">
  ![Cross-section through the ground. A quake star sits deep on the right; a curved blue path leaves it sideways, bends upward and reaches a station on the surface at the left, arriving steeply from below and slanting away from the quake. Two zoomed-in circles show the ground at the station with a dashed blue line along the wave's direction of travel: in the first, a green arrow points up and to the left, labeled a push (compression): up and away; in the second, a red arrow points down and to the right, labeled a pull (dilatation): down and toward. A line at the bottom reads: either way the ground moves along the wave's path, and up goes with away.](img/gm-up-away.svg){ loading=lazy }
  <figcaption>Figure 3. Why "up" goes with "away". The P wave arrives from below, slanting away
  from the quake. A push moves the ground up and away, a pull down and toward. A cartoon: the
  path and the angles are not to scale.</figcaption>
</figure>

### A real example: TMU and the Kenilworth quake

In September 2026 a magnitude 2.7 quake shook the ground 15 km east of Kenilworth, Utah, 68 km
from station TMU (Wasatch Academy's stand-in). Figure 4 shows the first half second of P at TMU,
filtered 1–5 Hz.

<figure markdown="span">
  ![Top: three records from station TMU, Z, N and E, from 10.6 to 14 seconds after the quake, with a blue line at the P arrival (11.74 seconds) and a shaded band from 11.69 to 12.24 seconds labeled first half second of P. Bottom left: the path seen from above, a straight line from the middle to the south-west with a short stub to the north-east; a purple dashed arrow (computer, 44 degrees) and an orange arrow (true, 47 degrees) both point north-east. Bottom middle: the path seen from the side, with up at the top, away to the left and toward the quake (47 degrees) to the right: the path dips a little down and to the right (labeled first: down and toward), then climbs high and to the left (labeled up and away). Right: 1, the ground moves along one line, 44 to 224 degrees (NE to SW); 2, up goes with away: the ground goes up as it moves SW, so the quake is the other way, 44 degrees (NE); 3, true direction 47 degrees, off by minus 3 degrees; linearity 1.00, up/away 0.68.](img/gm-pointing.svg){ loading=lazy }
  <figcaption>Figure 4. Pointing to the quake from station TMU. Seen from above, the ground moved
  along one line (north-east to south-west). Seen from the side, it went up while moving
  south-west, so south-west is "away" and the quake is to the north-east: 44°, only 3° from
  the true direction. Filtered 1–5 Hz; P pick by University of Utah analysts. Data: University
  of Utah Seismograph Stations (network UU, doi:10.7914/SN/UU) via EarthScope; quake and pick
  from USGS ComCat.</figcaption>
</figure>

1. **The line.** Seen from above, the ground moved back and forth along a line from 44° to 224°
   (north-east to south-west).
2. **Which end.** Seen from the side, the ground first dipped **down and toward** the north-east
   (a pull), then rose **up and away** to the south-west. Up went with south-west, so south-west
   is away from the quake.
3. **The answer.** The quake is toward **44°** (north-east). The official epicenter is at
   **47°**: the estimate is off by only 3°.

The path seen from the side is tall and narrow: most of the motion is up and down (on average
only about 24° from vertical), because the wave comes up steeply from below.

??? note "How the computer finds the line (for the curious)"
    The computer treats the half second of motion as a cloud of (east, north) points and finds
    the direction along which the cloud is longest. With \(c_{NN}\), \(c_{EE}\) and \(c_{NE}\)
    the averages of north × north, east × east and north × east, the long axis is at the angle
    \(\theta\) (clockwise from north) where

    $$
    \tan 2\theta = \frac{2\,c_{NE}}{c_{NN} - c_{EE}}
    $$

    It reports two "how much to trust this" numbers, shown as bars in Quake Explorer:

    - **Linearity** (0 to 1): 1 is a perfect line, 0 a round blob. At TMU it is 1.00.
    - **Up/away** (0 to 1): how closely "up" goes with one end of the line (a correlation).
      Near 0, the choice of end is a coin toss. At TMU it is 0.68.

    The long axis is the line the points lie closest to (measured at right angles to the line).
    Statisticians call this principal component analysis.

## How good is it?

One example could be lucky. So we checked the method the same way on every three-component
station with an analyst's P pick within 200 km of 13 Utah quakes (magnitude 2.5 to 5.7): 271
station-quake pairs, filtered 1–5 Hz, using the first half second of P.

<figure markdown="span">
  ![Left: a histogram of how far off the direction was, in 10-degree bars from 0 to 180 degrees, split into clear motion (blue) and less clear (gray). The 0 to 10 degree bar is tallest, about 100 pairs, then about 67 and 29; from 30 to 150 degrees the bars are short; a pink zone from 150 to 180 degrees is labeled wrong end (7 percent). A dashed line at 30 degrees is labeled within 30 degrees: 72 percent of all pairs, 85 percent of the clear ones. Right: each dot is one station and one quake, error against distance from 0 to 200 km. Most dots lie below 30 degrees; a shaded band from 50 to 100 km reads 44 of 45 within 30 degrees. Dots scattered high up are mostly within 10 km of the quake and between 100 and 150 km.](img/gm-direction-errors.svg){ loading=lazy }
  <figcaption>Figure 5. How close the direction from P-wave motion came to the true direction,
  for 271 station-quake pairs. "Clear motion": linearity above 0.8 and up/away above 0.5. Data:
  University of Utah Seismograph Stations (network UU, doi:10.7914/SN/UU) via EarthScope; quakes
  and analyst P picks from USGS ComCat.</figcaption>
</figure>

- **All 271 pairs:** typically 14° off (the median); 72% within 30°. In 7% the estimate pointed
  the wrong way, more than 150° off: the line was roughly right, but "up goes with away" picked
  the wrong end.
- **Clear motion only** (182 pairs with linearity above 0.8 and up/away above 0.5): typically
  10° off, 85% within 30°.
- **Distance matters.** For stations 10–100 km from the quake (98 pairs), the typical error was
  10°, and 95% were within 30°. Between 50 and 100 km, 44 of 45 were within 30°.
- **Right above the quake** (within 10 km), the method often failed: only 40% within 30°.
- **Beyond about 100 km**, the motion was clear less often (54 of the 99 pairs at 100–150 km).
  TMU and SGU, 133–146 km from the quakes near Milford and Junction, were within 30° only
  2 times out of 8.

So, for a clear P wave at a station within about 100 km, expect the direction to be **usually
within about 15°**. Sometimes it points the wrong way.

### Why it isn't perfect

- **Rock is not uniform.** Layers tilt, and valleys and mountains have different rock. Waves
  bend sideways as well as upward, so they can arrive from a little to one side of the straight
  line on the map.
- **Waves scatter.** Cracks and lumps in the rock scatter some of the energy, which then arrives
  from other directions. Filtering to 1–5 Hz helps: shorter waves scatter more.
- **Noise.** Wind, traffic and the [ocean hum](seismograms.md#ocean-hum-microseism) add motion
  that has nothing to do with the quake. A small quake far away is barely bigger than the noise.
- **Right above the quake**, the P wave comes up almost vertically, so the horizontal motion is
  tiny, and any small disturbance can swing the line around.
- **Sensor orientation.** If a sensor points a few degrees from where its records say, every
  direction from that station is off by the same amount. Some stations near Milford were off the
  same way for every quake: FOR5 by 18–31° each time, always to the same side, and FOR2 by
  132–179°, pointing nearly the wrong way, for all 9 quakes there. When the error repeats like
  that, the cause is at the station (how its sensor is installed, or the rock right under it),
  not bad luck.
- **Far away**, the first P wave is weaker and two P waves can arrive close together, one through
  the crust and one along the top of the mantle (see [Limits](s-minus-p.md#limits)).

## One station can locate a quake

[Quake Locator](../apps/wave-race.md) needs at least three stations, because one S − P time gives
only a distance: a circle around the station. Add a **direction** from P-wave motion, and one
station is enough: go that far, that way.

!!! example "Worked example: TMU and the Kenilworth quake"
    - **Direction:** from the P motion (Figure 4), **44°**.
    - **Distance:** P arrived 11.74 s after the quake (an analyst's pick). The analysts did not
      pick S at TMU; the computer picked it at 21.95 s.
        - S − P = 21.95 − 11.74 = **10.21 s**
        - d = 10.21 s × 7.66 km/s = **78.2 km**, using Quake Locator's speeds (5.8 and 3.3 km/s;
          see [Which speeds?](s-minus-p.md#which-speeds)). With Quake Locator's 8 km depth this is
          77.8 km along the surface ([the hidden triangle](s-minus-p.md#depth-the-hidden-triangle)).
    - **Location:** go 77.8 km from TMU toward 44°.

    <figure markdown="span">
      ![Map. Station TMU at the lower left. A purple dashed line runs from TMU toward 44 degrees, inside a pale purple wedge of plus or minus 15 degrees. A gray dashed circle around TMU, labeled 78 km from S minus P, crosses the line at a purple star, the one-station estimate. An orange star, the true epicenter, lies just south-west of it along the line; a label between them reads 10 km off. A scale bar shows 20 km. On the right: 1, direction 44 degrees (true 47); 2, S minus P = 21.95 minus 11.74 = 10.21 s, times 7.66 km/s = 78.2 km (true 68 km); 3, go that far that way from TMU: miss 10 km from the true epicenter.](img/gm-one-station.svg){ loading=lazy }
      <figcaption>Figure 6. Locating the Kenilworth quake from TMU alone. The direction is good
      (3° off, about 4 km sideways at this distance); most of the miss comes from the distance.
      Station and epicenter: University of Utah Seismograph Stations (network UU,
      doi:10.7914/SN/UU) via EarthScope and USGS ComCat; P pick by University of Utah analysts, S
      pick by Quake Explorer's computer picker.</figcaption>
    </figure>

    - The estimate lands **10 km** from the official epicenter.
    - The direction was only 3° off. The distance was too long: 78 km instead of 68 km. S is
      [hard to pick](seismograms.md#anatomy-of-a-quake-record), and this S time comes from a
      computer, not an analyst.

NASA's InSight lander, with a single seismometer on Mars, located marsquakes with the same idea:
direction from P-wave motion, distance from S − P
([Giardini and others, 2020](https://doi.org/10.1038/s41561-020-0539-8)). On Earth, seismologists use many stations
whenever they can ([How professionals do it](locating.md#how-professionals-do-it)).

## Far away: S from below, and rolling surface waves

The same physics explains what a big, distant quake does to the ground in Utah.

**P and S arrive from steeply below.** From a quake thousands of kilometers away, the waves dive
deep into Earth's mantle, where the rock is much faster, and their paths curve back up steeply.
At the 2025 Sand Point, Alaska earthquake's distance from SGU (3,985 km), a standard Earth model
(iasp91) has P and S arriving about 27° from straight up, and the slow rock near the surface
bends them steeper still. So:

- **P**, pushing along a steep path, moves the ground mostly **up and down** (Z).
- **S**, shaking across a steep path, moves the ground mostly **side to side** (R and T). That is
  why S is often hard to pick on the vertical channel of a distant quake.

<figure markdown="span">
  ![Three records from station SGU, Z, R and T, from 6 to 25 minutes after the magnitude 7.3 Sand Point, Alaska quake, all on one scale and filtered 0.05 to 0.5 Hz. A blue dashed line at about 7 minutes marks P: small fast wiggles start on Z and R, smaller on T. A red dashed line at about 12.75 minutes marks S: much bigger wiggles start on R and T, smaller on Z. From about 16 minutes the biggest waves arrive: on T they peak near 18 minutes, labeled Love waves; on Z and R they peak near 19.5 minutes, labeled Rayleigh waves.](img/gm-far-quake.svg){ loading=lazy }
  <figcaption>Figure 7. The magnitude 7.3 Sand Point, Alaska earthquake of July 16, 2025, recorded
  3,985 km away at station SGU (the stand-in for Gunnison Valley), turned to face the quake. One
  scale for all three. In the first minute after each arrival, P was 1.3 times bigger on Z than
  on R and T together, and S 3 times bigger on R and T together than on Z. P and S marks:
  computer picks (the iasp91 model predicts P 3 s and S 13 s earlier). Data: University of Utah
  Seismograph Stations (network UU, doi:10.7914/SN/UU) via EarthScope; quake from USGS
  ComCat.</figcaption>
</figure>

**Surface waves** travel along the surface instead of through the Earth, and far from a big
quake they are the biggest waves. There are two kinds:

- **Love waves** shake the ground **sideways**, across the path, like S: they show on **T**.
  They are a little faster, so they come first (biggest on T at 18:12 in Figure 7).
- **Rayleigh waves** make the ground **roll** in loops in the upright plane along the path: up
  and down and toward and away. They show on **Z** and **R** (biggest on Z at 19:39).

How does the ground roll? Figure 8 adds up the speeds in the record to get how far the ground
moved, then shows about two Rayleigh waves seen from the side.

<figure markdown="span">
  ![Left: 90 seconds of how far the ground moved at SGU, filtered 0.03 to 0.1 Hz, along the path (R, plus is away from the quake) and up (Z). Smooth waves about 20 seconds long. A green dot marks a peak of R labeled farthest away; an orange dot a quarter of a wave later marks a peak of Z labeled highest. Right: the same motion seen from the side, with up at the top, away to the left and toward the quake to the right: the path goes around in two clockwise loops, with arrowheads showing the direction; at the top of each loop it moves to the right, toward the quake. Below: the wave travels to the left.](img/gm-rayleigh-roll.svg){ loading=lazy }
  <figcaption>Figure 8. Rayleigh waves at SGU from the Sand Point quake. The ground is farthest
  from the quake, then a quarter of a wave later (4.8 s of a 20 s wave) at its highest. Seen
  from the side it goes around in loops, moving toward the quake at the top of each loop.
  Filtered 0.03–0.1 Hz. Data: University of Utah Seismograph Stations (network UU,
  doi:10.7914/SN/UU) via EarthScope; quake from USGS ComCat.</figcaption>
</figure>

At the top of each loop, the ground moves **toward the quake**: backwards, against the way the
wave travels. Seismologists call this **retrograde** motion. Ocean waves do the opposite: a cork
on the water moves forward, with the wave, at each crest.

## Try it

1. At a station, the P motion seen from above lines up along 120°–300°, and the ground moves up
   while it moves toward 300°. Which direction is the quake?
2. At another station, the first motion of P is **down**, and at the same moment the ground
   moves toward 30°. Which direction is the quake? Was the first motion a push or a pull?
3. Station MTPU, 29 km from the Junction quake: the analysts picked P at 5.07 s and S at
   9.21 s, and the computer's direction from P is 358°. Locate the quake from MTPU alone, as in
   the worked example (7.66 km/s, 8 km depth). The true epicenter is 29.1 km away toward 342°.
   How far off is your estimate? (Hint: law of cosines.)
4. In a perfectly uniform Earth, why could P never move the T sensor? Give two reasons why
   MTPU's T still moved a little during P (Figure 2).
5. Why does the method often fail at a station almost directly above the quake?
6. In Figure 7, Love waves are biggest 18 min 12 s after the quake and Rayleigh waves
   19 min 39 s after it, 3,985 km away. Estimate how fast each traveled.
7. Sketch the seen-from-the-side path of a cork on an ocean wave and of the ground in a Rayleigh
   wave, both traveling to the left. Mark which way each goes around.

In [Quake Explorer](../apps/quake-explorer.md), investigation C, try different stations for the
same quake. Which stations point best? Does a longer window help or hurt?

Using these records in your own work? [Credit the data](stations.md#how-to-credit-the-data).
