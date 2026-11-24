# Distance from S minus P

**Used in:** [Quake Locator](../apps/wave-race.md) · [Quake Explorer](../apps/quake-explorer.md) · [Quake Waves](../apps/quake-waves.md)

[P and S waves](waves.md) leave the quake at the same moment. P is faster, so it wins the
race; the farther the station, the bigger P's lead. Measuring that lead gives the distance.
The [Quake Waves](../apps/quake-waves.md) animation shows the race.

## The formula

If the station is a distance \(d\) from the quake, the travel times are

$$
t_P = \frac{d}{V_P}, \qquad t_S = \frac{d}{V_S}
$$

On a graph of arrival time against distance, these are two lines that start together and
spread apart. Figure 1 shows them over real seismograms from ten Utah stations.

<figure markdown="span">
  ![Record section: vertical seismograms from 10 Utah stations, stacked by distance from the epicenter (27 to 183 km, increasing downward) against seconds after the quake (0 to 60). Blue dots (P picks) lie along a blue dashed line and red dots (S picks) along a steeper red one; the gap between P and S widens from 4.1 s at station MTPU to 10.4 s at station WCU.](img/record-section.svg){ loading=lazy }
  <figcaption>Figure 1. The race in real seismograms: the magnitude 3.3 quake near Junction,
  Utah, filtered 1–10 Hz, each trace scaled to its own peak. Dashed lines show P at 5.8 km/s
  and S at 3.3 km/s. Analysts picked S at only 3 of the 9 stations where they picked P,
  although S energy shows near the red line at most of the others. Data: University of Utah
  Seismograph Stations (network UU, doi:10.7914/SN/UU) via EarthScope; picks via USGS
  ComCat.</figcaption>
</figure>

The gap between the arrivals is

$$
\Delta t = t_S - t_P = d\left(\frac{1}{V_S} - \frac{1}{V_P}\right)
= d\,\frac{V_P - V_S}{V_P V_S}
$$

Solve for \(d\):

$$
d = \Delta t \cdot \frac{V_P V_S}{V_P - V_S}
$$

The fraction \(k = V_P V_S / (V_P - V_S)\) is the number of **kilometers per second of
S-minus-P time**. You don't need the time the quake happened: the gap alone gives the
distance.

## Which speeds?

Textbooks often use \(V_P = 6.0\) km/s and \(V_S = 3.5\) km/s, which gives

$$
k = \frac{6.0 \times 3.5}{6.0 - 3.5} = 8.4 \text{ km/s}
$$

[Quake Locator](../apps/wave-race.md#changing-the-speeds-and-depth) uses \(V_P = 5.8\) km/s and
\(V_S = 3.3\) km/s instead, which gives
\(k \approx 7.66\) km/s. We chose these by checking real Utah quakes. For three quakes in
2026, we took the University of Utah analysts' P and S picks and the official locations.
Stations 20–80 km away mostly needed between 7.3 and 8.2 km per second of S − P (typically
about 7.7). The textbook value of 8.4 made most distances roughly 10% too long. The top few kilometers of Utah's crust are slower than
the rock deeper down, and short paths spend much of their time in that slow rock.

!!! example "Worked example (the offline sample quake)"
    At station TCRU, P arrived 6.92 s after the quake started and S arrived 11.99 s after it.

    <figure markdown="span">
      ![Ten seconds of the TCRU seismogram (traces HHZ, HHN, HHE). A blue line at 6.92 s marks P, where small waves begin; a red line at 11.99 s marks S, where much bigger waves begin. An arrow between them reads S minus P = 5.07 s, and below: Distance: 5.07 s times 7.66 km/s = 38.8 km.](img/s-minus-p-worked-example.svg){ loading=lazy }
      <figcaption>Figure 2. Station TCRU, filtered 1–10 Hz, with the University of Utah
      analysts' picks. They picked S here, but at only 3 of the 9 stations where they picked
      P: S is often hard to see. Data: University of Utah Seismograph Stations (network UU,
      doi:10.7914/SN/UU) via EarthScope; picks via USGS ComCat.</figcaption>
    </figure>

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

<figure markdown="span">
  ![Cross-section of the ground. An epicenter star sits on the surface with the hypocenter 8 km straight below it and a station off to the right. A dashed vertical side z (depth), a slanted side d (from S minus P) and the surface side d-surface (on the map) make a right triangle. Below, two triangles drawn to one scale: a 10 km slanted distance gives 6 km on the map, and an 80 km slanted distance gives 79.6 km.](img/depth-triangle.svg){ loading=lazy }
  <figcaption>Figure 3. S − P gives the slanted distance d from the hypocenter; the map needs
  the distance along the surface. Depth shrinks a near station's circle a lot (10 km becomes
  6 km) and a far station's hardly at all (80 km becomes 79.6 km).</figcaption>
</figure>

Utah quakes are mostly 2–15 km deep, so Quake Locator assumes 8 km (you can change it). Depth
matters for close stations and hardly at all for far ones. For a station 10 km away it
shrinks the circle to 6 km; for one 80 km away, to 79.6 km.

## Limits

- **Timing.** A pick that is off by 0.1 s moves the distance by about 0.8 km.
  [Zoom in!](../apps/wave-race.md#how-to-find-p-and-s-look-wide-then-zoom-in)
- **Far stations.** Beyond about 120 km, the first P wave often travels part of the way along
  the fast top of Earth's mantle (8 km/s), so one constant \(k\) no longer fits. Distances from
  far stations are less reliable; nearby stations are better for locating. In Figure 1, the P
  picks at the three farthest stations (114–177 km) arrive up to 1.2 s before the 5.8 km/s
  line.
- **Speeds vary.** Rock under the Wasatch Front, the Colorado Plateau and the Basin and Range
  is not the same. [Professional locations](locating.md#how-professionals-do-it) use a layered
  velocity model instead of one pair of speeds.

## Try it

1. A station records S − P = 3.0 s. How far away is the quake with k = 7.66 km/s? With 8.4?
2. Show that if \(V_S = V_P/\sqrt{3}\) (a common rule of thumb), then
   \(k = V_P / (\sqrt{3} - 1) \approx 1.37\,V_P\).
3. Why can't this method work if S waves could travel as fast as P waves?
