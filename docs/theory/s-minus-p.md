# Distance from S minus P

**Used in:** [Wave Race](../apps/wave-race.md) · [Quake Waves](locating.md#watch-it-happen)

[P and S waves](waves.md) leave the quake at the same moment. P is faster, so it wins the
race; the farther the station, the bigger P's lead. Measuring that lead gives the distance.
The [Quake Waves](locating.md#watch-it-happen) animation shows the race.

## The formula

If the station is a distance \(d\) from the quake, the travel times are

$$
t_P = \frac{d}{V_P}, \qquad t_S = \frac{d}{V_S}
$$

The gap between the arrivals is

$$
\Delta t = t_S - t_P = d\left(\frac{1}{V_S} - \frac{1}{V_P}\right)
= d\,\frac{V_P - V_S}{V_P V_S}
$$

Solve for \(d\):

$$
d = \Delta t \cdot \frac{V_P V_S}{V_P - V_S}
$$

The fraction \(k = V_P V_S / (V_P - V_S)\) is the number of **kilometres per second of
S-minus-P time**. You don't need the time the quake happened: the gap alone gives the
distance.

## Which speeds?

Textbooks often use \(V_P = 6.0\) km/s and \(V_S = 3.5\) km/s, which gives

$$
k = \frac{6.0 \times 3.5}{6.0 - 3.5} = 8.4 \text{ km/s}
$$

[Wave Race](../apps/wave-race.md#changing-the-speeds-and-depth) uses \(V_P = 5.8\) km/s and
\(V_S = 3.3\) km/s instead, which gives
\(k \approx 7.66\) km/s. We chose these by checking real Utah quakes. For three quakes in
2026, we took the University of Utah analysts' P and S picks and the official locations.
Stations 20–80 km away mostly needed between 7.3 and 8.2 km per second of S − P (typically
about 7.7). The textbook value of 8.4 made most distances roughly 10% too long. The top few kilometres of Utah's crust are slower than
the rock deeper down, and short paths spend much of their time in that slow rock.

!!! example "Worked example (the offline sample quake)"
    At station TCRU, P arrived 6.92 s after the quake started and S arrived 11.99 s after it.

    - S − P = 11.99 − 6.92 = **5.07 s**
    - d = 5.07 s × 7.66 km/s = **38.8 km**
    - The true distance from the epicenter is 38.1 km.
    - With the textbook 8.4 km/s you would get 42.6 km: 4.5 km too far.

## Depth: the hidden triangle

The quake starts at some depth below the surface, at the **hypocenter**. The point on the
surface right above it is the **epicenter**, which is what you [locate](locating.md) on the map. S − P gives the distance from the hypocenter to
the station: the slanted side of a right triangle. The map needs the distance along the
surface. With depth \(z\), Pythagoras gives

$$
d_{\text{surface}} = \sqrt{d^2 - z^2}
$$

Utah quakes are mostly 2–15 km deep, so Wave Race assumes 8 km (you can change it). Depth
matters for close stations and hardly at all for far ones. For a station 10 km away it
shrinks the circle to 6 km; for one 80 km away, to 79.6 km.

## Limits

- **Timing.** A pick that is off by 0.1 s moves the distance by about 0.8 km.
  [Zoom in!](../apps/wave-race.md#how-to-find-p-and-s-look-wide-then-zoom-in)
- **Far stations.** Beyond about 120 km, the first P wave often travels part of the way along
  the fast top of Earth's mantle (8 km/s), so one constant \(k\) no longer fits. Distances from
  far stations are less reliable; nearby stations are better for locating.
- **Speeds vary.** Rock under the Wasatch Front, the Colorado Plateau and the Basin and Range
  is not the same. [Professional locations](locating.md#how-professionals-do-it) use a layered
  velocity model instead of one pair of speeds.

## Try it

1. A station records S − P = 3.0 s. How far away is the quake with k = 7.66 km/s? With 8.4?
2. Show that if \(V_S = V_P/\sqrt{3}\) (a common rule of thumb), then
   \(k = V_P / (\sqrt{3} - 1) \approx 1.37\,V_P\).
3. Why can't this method work if S waves could travel as fast as P waves?
