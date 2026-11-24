# Locating a quake

**Used in:** [Wave Race](../apps/wave-race.md) · [Quake Waves](#watch-it-happen)

One station tells you **how far** away a quake was (from its
[S-minus-P time](s-minus-p.md)), but not **in which direction**. The quake
could be anywhere on a circle around the station. More stations narrow it down:

- **One station:** a circle.
- **Two stations:** two circles cross at two points. Either could be the quake.
- **Three stations:** three circles meet near one point: the **epicenter**.
- **More stations:** an even better answer, and a check on bad picks.

<figure markdown="span">
  ![Three map panels with stations TCRU, MTPU and WCU. First: one circle around TCRU; the quake is somewhere on it. Second: the TCRU and MTPU circles cross at two points marked with question marks; either could be the quake. Third: the WCU circle is added and all three circles meet at one point, marked with a star labelled quake.](img/circles-1-2-3.svg){ loading=lazy }
  <figcaption>Figure 1. Real distance circles for the offline sample quake (magnitude 3.3 near
  Junction, Utah), from the University of Utah analysts' P and S picks. One station gives a
  circle, two give two possible points, three meet at one point. Data: University of Utah
  Seismograph Stations (network UU, doi:10.7914/SN/UU); picks via USGS ComCat.</figcaption>
</figure>

This is called **trilateration** (locating by distances). GPS receivers find themselves the
same way, using distances to satellites.

## Watch it happen

<iframe src="../../app/wave-animation/?embed=1" title="Quake Waves animation: P and S waves spread out from a quake and reach four stations; their S minus P times become distance circles that cross at the quake" loading="lazy" style="width:100%;height:700px;border:1px solid var(--md-default-fg-color--lightest);border-radius:8px"></iframe>

**Quake Waves** is a cartoon, not real data: the quake is at the surface and all the rock is
the same. Press **Play**. The P wave (blue) and the S wave (red) leave the quake (star) at the same
moment. P pulls ahead, so the farther a station is, the longer it waits between P and S. Each
station's seismogram is drawn as the waves pass. When S arrives, the S − P time becomes a
distance, drawn as a dashed circle around the station, and the four circles cross at the quake.
Click the map to move the quake, or drag the slider to step through time.
[Open Quake Waves full screen](../app/wave-animation/index.html).

Notice the **order** in which P reaches the stations: nearest first. That order alone already
hints where the quake is. Professionals use it, as described below.

## Circles never meet perfectly

Real picks are a little off, the rock speeds are not exactly right, and the depth is a guess.
So the circles don't cross at exactly one point. Instead we look for the point that fits all
the circles **best**.

For a trial point, each station gives a **residual**: the distance you measured minus the
distance the trial point predicts. The **misfit** is the root-mean-square (RMS) of the
residuals:

$$
\text{RMS} = \sqrt{\frac{r_1^2 + r_2^2 + \dots + r_n^2}{n}}
$$

<figure markdown="span">
  ![A green pin, your guess, 8 km from where three coloured distance circles meet near a purple best-fit star. A thick line from the pin to each circle is labelled r1 = minus 7.2 km for MTPU, r2 = plus 6.8 km for TCRU and r3 = plus 3.3 km for WCU. A table lists each station's distance from S minus P and from the pin, and the RMS is worked out below as the square root of 109.0 divided by 3, which is 6.0 km.](img/residuals.svg){ loading=lazy }
  <figcaption>Figure 2. Residuals for a trial epicenter (the green pin). Their RMS, 6.0 km, is
  the number Wave Race shows as "your circles miss it by 6.0 km on average"; at the best fit
  it is 0.3 km. Data: University of Utah Seismograph Stations (network UU,
  doi:10.7914/SN/UU); picks via USGS ComCat.</figcaption>
</figure>

The best epicenter is the point with the smallest RMS.

In [Wave Race](../apps/wave-race.md#3-locate-the-quake) you can search for it yourself: **Place my own epicenter** puts a pin on the map,
and the app shows the RMS for that point as you drag it. Then **Find the best epicenter** lets
the computer search.

## How Wave Race searches: a grid

Wave Race does it by brute force. It lays a grid of points 2 km apart over a 600 km by
600 km square, computes the misfit at every point (about 90,000 of them), and keeps the best
one. Then it repeats the search on finer grids (0.25 km, then 0.05 km) around that point.
A computer does this in a fraction of a second. You can do a coarse version by hand on a map
with a ruler and a compass.

Its **rough uncertainty** is the size of the region where the misfit is no more than about
1.5 km worse than the best point. That is how much the distances can move if each pick is
off by 0.2 s.

<figure markdown="span">
  ![A blue map, light where the circles fit and dark where they miss badly, around stations WCU, TCRU and MTPU. A light oval valley holds the purple best-fit star and the orange official epicenter, inside a black outline labelled rough uncertainty. An inset zooms in on the valley: open circles mark the 2 km grid, a fine mesh marks the 0.25 km grid around the best coarse point, and a small square marks the 0.05 km grid around the best fit.](img/misfit-map.svg){ loading=lazy }
  <figcaption>Figure 3. The misfit map for the offline sample quake: the average miss (RMS) at
  every point. Wave Race keeps the lowest point; the black outline is its rough uncertainty,
  and the official epicenter falls inside it. Data: University of Utah Seismograph Stations
  (network UU, doi:10.7914/SN/UU); picks via USGS ComCat.</figcaption>
</figure>

## Why the stations' positions matter

If all the stations are on one side of the quake, the circles cross at a shallow angle and
many points fit almost equally well. The location then smears out along a line. Stations
**all around** the quake make the circles cross at steep angles and pin the point down.

<figure markdown="span">
  ![Two misfit maps of the same quake made from simulated picks. In panel a, the five school stand-in stations are all off the map to the north; the light valley is long and diagonal and the rough-uncertainty outline is about 24 km by 5 km. In panel b, five stations sit on several sides of the quake; the valley is a round bowl and the outline is about 7 km by 6 km. In both, the best fit lands within 1 km of the true epicenter.](img/station-geometry.svg){ loading=lazy }
  <figcaption>Figure 4. The same quake located twice from simulated picks (about 0.1 s of pick
  error), each time with five stations. With the five school stand-ins, all to the north, the
  location smears out into a long oval; with stations on several sides, it is pinned down.
  Station positions: University of Utah Seismograph Stations (network UU).</figcaption>
</figure>

That is why Wave Race adds **helper** stations around each quake. The
[five UHSN schools](stations.md) sit in a north–south line in central Utah. For a quake far to the south or north, the schools
alone cannot surround it.

!!! example "The offline sample quake"
    The magnitude 3.3 quake near Junction, Utah (Oct 31, 2026, UTC) is south of every UHSN
    school. Using the University of Utah analysts' picks at three helper stations around it
    (MTPU, TCRU and WCU), Wave Race lands **5.5 km** from the official location.

## How professionals do it

The University of Utah Seismograph Stations locate Utah quakes with their regional network
of stations across the state. Their method goes beyond S − P:

- They use **every P and S arrival time**, and solve for the origin time as well as the place.
  In the animation above, that means using *when* P and S reach each station, not only the gap
  between them. Even a station where S is unclear still helps.
- They solve for **depth** instead of assuming it.
- They use a **layered velocity model** of Utah's crust instead of
  [one pair of speeds](s-minus-p.md#which-speeds).
- They estimate an **error ellipse**, which is longer in the direction the stations can't
  constrain well.

For a well-recorded Utah quake, the official epicenter is usually good to a few kilometres or
better. In our tests with careful picks and stations around the quake, Wave Race landed
3–6 km from the official location. That is close enough to tell
which valley, mine or fault zone the quake came from.

## Things to try

1. Locate a quake with all stations, then again with only three on one side. What happens to
   the uncertainty?
2. Change the depth from 8 km to 2 km and to 15 km. Which circles change most, and why?
   (Hint: [the hidden triangle](s-minus-p.md#depth-the-hidden-triangle).)
3. In the Utah region, quakes cluster along the **Intermountain Seismic Belt**, which runs
   north–south through the middle of the state. Locate several quakes and mark them on a map.
   Where are they?
