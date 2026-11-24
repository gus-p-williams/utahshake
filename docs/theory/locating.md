# Locating a quake

One station tells you **how far** away a quake was, but not **in which direction**. The quake
could be anywhere on a circle around the station. More stations narrow it down:

- **One station:** a circle.
- **Two stations:** two circles cross at two points. Either could be the quake.
- **Three stations:** three circles meet near one point: the **epicenter**.
- **More stations:** an even better answer, and a check on bad picks.

This is called **trilateration** (locating by distances). GPS receivers find themselves the
same way, using distances to satellites.

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

The best epicenter is the point with the smallest RMS.

## How Wave Race searches: a grid

Wave Race does it by brute force. It lays a grid of points 2 km apart over a 600 km by
600 km square, computes the misfit at every point (about 90,000 of them), and keeps the best
one. Then it repeats the search on finer grids (0.25 km, then 0.05 km) around that point.
A computer does this in a fraction of a second. You can do a coarse version by hand on a map
with a ruler and a compass.

Its **rough uncertainty** is the size of the region where the misfit is no more than about
1.5 km worse than the best point. That is how much the distances can move if each pick is
off by 0.2 s.

## Why the stations' positions matter

If all the stations are on one side of the quake, the circles cross at a shallow angle and
many points fit almost equally well. The location then smears out along a line. Stations
**all around** the quake make the circles cross at steep angles and pin the point down.

That is why Wave Race adds **helper** stations around each quake. The five UHSN schools sit
in a north–south line in central Utah. For a quake far to the south or north, the schools
alone cannot surround it.

!!! example "The offline sample quake"
    The magnitude 3.3 quake near Junction, Utah (Oct 31, 2026, UTC) is south of every UHSN
    school. Using the University of Utah analysts' picks at three helper stations around it
    (MTPU, TCRU and WCU), Wave Race lands **5.5 km** from the official location.

## How professionals do it

The University of Utah Seismograph Stations locate Utah quakes with their regional network
of stations across the state. Their method goes beyond S − P:

- They use **every P and S arrival time**, and solve for the origin time as well as the place.
- They solve for **depth** instead of assuming it.
- They use a **layered velocity model** of Utah's crust instead of one pair of speeds.
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
3. In the Utah region, quakes cluster along the **Intermountain Seismic Belt**, which runs
   north–south through the middle of the state. Locate several quakes and mark them on a map.
   Where are they?
