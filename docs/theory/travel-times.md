# Travel times and Earth's layers

**Used in:** [Quake Explorer](../apps/quake-explorer.md)

Every seismogram tells you *when* the waves arrived. Put the records of many stations side by
side and those times become a graph. The graph tells you how fast the rock is, how thick
Utah's crust is, and even that Earth has a liquid core. This page builds on
[Distance from S minus P](s-minus-p.md), which shows the race between P and S in real
seismograms.

!!! tip "In a hurry?"
    For investigation A in [Quake Explorer](../apps/quake-explorer.md) you need the first two
    sections. [The bend](#the-bend-pg-and-pn) explains the faster line in the Magna quake, and
    [Far away](#far-away-travel-times-through-the-whole-earth) goes with investigation D.

## A record section is a travel-time graph

Each station is a stopwatch at a known distance from the quake. The quake starts all the
stopwatches at the same moment, the **origin time**, and each one stops when the wave arrives.
A **record section** draws every station's seismogram at its distance. In Quake Explorer, and
in the figures on this page, distance runs **down** the page and time runs **across**.

If a wave travels at a steady speed \(v\), a station a distance \(d\) away feels it after

$$
t = \frac{d}{v} \qquad \text{or, turned round,} \qquad d = v\,t
$$

So the arrivals line up on a straight line. Go down the line by some distance, see how far
across it moves in time, and divide: that is the speed. A **steeper** line (more kilometres for
each second) is a **faster** wave. A line going straight down would be a wave that reached every
station at once: infinitely fast.

!!! question "Predict first"
    For the Junction quake, P reached station MTPU, 29 km away, 5.1 s after the quake. Before
    you look at Figure 1, sketch where P will arrive at stations 100, 200 and 300 km away. Will
    the arrivals make a straight line, a curve, or arrive all together? Where will S go?

<figure markdown="span">
  ![Record section of the magnitude 3.3 Junction quake: vertical seismograms from 24 Utah stations stacked by distance, from MTPU (29 km) at the top to BGU (299 km) at the bottom, against 0 to 70 seconds after the quake. Blue dots (P picks) lie along a straight blue line, solid to 100 km and dashed beyond, labelled P: 6.1 km/s, fitted within 100 km. A slope triangle on it reads 100 km down and 16.3 s across, and a note reads speed = 100 km ÷ 16.3 s = 6.1 km/s. Red dots and circles (S picks) follow a less steep red line labelled S: 3.7 km/s, all S picks to 240 km. A dotted red line through the 3 analyst S picks, labelled 3.4 km/s, falls later and later behind the far S picks. Near the bottom, the P arrivals at HLJ and BSUT (269 and 282 km) come about 3 s before the dashed blue line, with a note: far away, P arrives before the line.](img/tt-junction-speeds.svg){ loading=lazy }
  <figcaption>Figure 1. The Junction quake (magnitude 3.3, October 2026) out to 300 km,
  filtered 1–10 Hz, each trace stretched to fit. Filled dots are the University of Utah
  analysts' picks; open circles are picks made by Quake Explorer's computer picker where the
  analysts made none, shown only where the arrival stands out from the noise. The solid lines
  are fitted to the picks the way Quake Explorer's reveal fits them. Data: University of Utah
  Seismograph Stations (network UU, doi:10.7914/SN/UU) via EarthScope; analyst picks via USGS
  ComCat.</figcaption>
</figure>

### Why the line curves near the quake

A quake starts below the surface, at the hypocenter. A wave to a station a distance \(d\) away
along the surface travels the slanted side of the triangle in
[Depth: the hidden triangle](s-minus-p.md#depth-the-hidden-triangle). With the quake at depth
\(h\):

$$
t = \frac{\sqrt{d^2 + h^2}}{v}
$$

For a quake 10 km deep and P at 6.1 km/s:

| Station distance \(d\) | Path length \(\sqrt{d^2 + h^2}\) | P arrives after |
| --- | --- | --- |
| 0 km (right above the quake) | 10.0 km | 1.6 s |
| 10 km | 14.1 km | 2.3 s |
| 100 km | 100.5 km | 16.5 s |

Near the quake, moving along the surface hardly makes the path longer, so the arrival time
hardly changes: the line points almost straight down, as if the wave were very fast. Far away,
the depth hardly matters and the line straightens out at the true speed. The Junction quake was
only 4 km deep, so in Figure 1 the curve is tiny and hides above the first station.

## Measuring the speeds

In Quake Explorer you lay a **P ruler** and an **S ruler** along the arrivals; the reveal then
fits lines through the professionals' picks. For the Junction quake:

- **P:** the analysts' P picks within 100 km (6 stations) fit a line of **6.1 km/s**
  (6.13 ± 0.12 km/s). The slope triangle in Figure 1 shows it: 100 km in 16.3 s.
- **S:** the analysts picked S at only 3 stations, all within 77 km. Their line gives
  **3.4 km/s**. With the computer's S picks out to 240 km (17 picks in all), it is **3.7 km/s**.

Seismologists often quote the ratio of the two speeds, \(V_P/V_S\). Here it is 6.1 ÷ 3.4 ≈ 1.8
with the analysts' S picks, or 6.1 ÷ 3.7 ≈ 1.65 with all of them. The University of Utah used
1.74 to locate Utah quakes from 1981 to 2012 ([UUSS](https://quake.utah.edu/?p=425)).

Why are these faster than the 5.8 and 3.3 km/s that
[Wave Race uses](s-minus-p.md#which-speeds)? Look where the P line starts: not at 0 s at 0 km,
but at 0.5 s. Every trip loses about half a second somewhere, for example in the slow rock near
the surface. A ruler doesn't care: it measures how much later the wave arrives *for each extra
kilometre*. Wave Race needs speeds that turn a whole S − P time into a distance, delays
included, and it uses stations close to the quake.

!!! note "Analysts and computers disagree: good questions to discuss"
    - **Why is S harder to pick than P?** P arrives on quiet ground, so its start is easy to
      see. S arrives while the ground is still shaking from P, so its start hides in P's
      wiggles. The analysts picked P at 15 stations for this quake, but S at only 3.
    - **Different sensors.** The analysts picked S on the horizontal (sideways) sensors, where
      S is usually clearest ([Seismic waves](waves.md)). The computer picked on the vertical
      sensor only. Its S picks scatter by about 0.75 s around their line.
    - **Which S line would you trust:** three careful picks close to the quake, or seventeen
      rougher ones spread out to 240 km? At 240 km the two lines are about 4 s apart.

## The bend: Pg and Pn

In 1909 the Croatian seismologist Andrija Mohorovičić studied an earthquake near Zagreb and
found **two** sets of P and S waves. He explained them with a sharp boundary deep underground,
where the rock changes. It is now called the **Mohorovičić discontinuity**, or **Moho**: the
bottom of Earth's crust and the top of the mantle
([Wikipedia](https://en.wikipedia.org/wiki/Mohorovi%C4%8Di%C4%87_discontinuity)).

A P wave can reach a far station in two ways (Figure 2):

- **Pg**, the direct wave: straight through the crust.
- **Pn**, the **head wave**: down to the Moho, along the top of the faster mantle, and back up.

<figure markdown="span">
  ![Cross-section drawn to scale. A quake 11.9 km deep sits at the left in a 37 km thick crust, where P travels 6.2 km/s, above the mantle, where P travels 7.8 km/s. A station sits at the surface 220 km away. A teal line labelled Pg runs straight from the quake to the station. A purple line labelled Pn goes down to the Moho at 52.5 degrees from the vertical, runs along the top of the mantle and comes back up to the station. Faint dashed purple lines leave the Moho at the same angle along the way; the first reaches the surface 82 km from the quake. Below: Pg (direct), 220.3 km through the crust at 6.2 km/s, 35.7 s. Pn (head wave), 103 km in the crust at 6.2 km/s plus 138 km along the mantle at 7.8 km/s, 34.5 s. A longer path, but it arrives 1.2 s sooner.](img/tt-ray-paths.svg){ loading=lazy }
  <figcaption>Figure 2. Two ways for P to reach a station 220 km away, drawn to scale with the
  numbers measured for the Magna quake (Figure 3 and the worked example below). Times from the
  formulas on this page.</figcaption>
</figure>

Pn takes the longer path but spends most of it in faster rock. It is like a trip to a town
200 km away: you can drive straight there on a slow country road, or go a little out of your
way to the freeway, race along it, and leave it near the town. For a short trip the country
road wins. For a long trip the freeway wins, even though you drive farther. The distance where
both take the same time is the **crossover distance**.

### The critical angle

Why does Pn go down at that particular angle? A wave bends (refracts) when it crosses into rock
of a different speed. Snell's law says

$$
\frac{\sin i_1}{v_1} = \frac{\sin i_2}{v_2}
$$

where \(i_1\) and \(i_2\) are the angles from the vertical on each side. To run *along* the
Moho, the wave in the mantle must go sideways: \(i_2 = 90°\), so \(\sin i_2 = 1\). That happens
for one angle in the crust only, the **critical angle** \(i_c\):

$$
\sin i_c = \frac{v_1}{v_2}
$$

With 6.17 and 7.78 km/s, \(\sin i_c = 0.793\) and \(i_c = 52.5°\). As it runs along the Moho,
the head wave keeps sending waves back up at the same angle (the faint lines in Figure 2). The
nearest place it reaches the surface is about 82 km from the Magna quake. Closer than that,
there is no Pn at all.

### The head-wave line and the intercept time

Add up the times for the three legs and you get

$$
t_{Pn} = \frac{d}{v_2} + t_i, \qquad t_i = \frac{(2H - h)\cos i_c}{v_1}
$$

where \(H\) is the thickness of the crust and \(h\) the depth of the quake. On a record section
this is a **straight line** at the mantle's speed \(v_2\), but it doesn't start at 0 s: extended
back to 0 km, it starts at the **intercept time** \(t_i\). A thicker crust means a longer detour
through slow rock, so a later intercept. Turned round, the intercept gives the thickness:

$$
H = \frac{1}{2}\left(\frac{t_i\,v_1}{\cos i_c} + h\right)
$$

Quake Explorer uses exactly these formulas (`headIntercept` and `crustFromIntercept` in its
code file `traveltime.js`).

??? note "Where does the intercept time come from? (optional algebra)"
    Take a quake at the surface (\(h = 0\)) to keep it simple. The wave crosses the crust,
    thickness \(H\), at the critical angle, once down and once up:

    - each slanted leg is \(H / \cos i_c\) long and carries the wave \(H \tan i_c\) sideways;
    - the two legs take \(2H / (v_1 \cos i_c)\);
    - the rest of the distance, \(d - 2H \tan i_c\), is along the Moho at \(v_2\).

    So

    $$
    t = \frac{2H}{v_1 \cos i_c} + \frac{d - 2H \tan i_c}{v_2}
      = \frac{d}{v_2} + \frac{2H}{\cos i_c}\left(\frac{1}{v_1} - \frac{\sin i_c}{v_2}\right)
    $$

    Snell's law gives \(\sin i_c / v_2 = v_1 / v_2^2 = \sin^2 i_c / v_1\), so the bracket is
    \((1 - \sin^2 i_c) / v_1 = \cos^2 i_c / v_1\), and

    $$
    t = \frac{d}{v_2} + \frac{2H \cos i_c}{v_1}
    $$

    A quake at depth \(h\) starts \(h\) closer to the Moho, so its down-going leg is shorter:
    replace \(2H\) by \(2H - h\).

### Seeing the bend: the Magna quake

The Junction quake was small: beyond about 200 km only a few stations recorded it clearly. The
magnitude 5.7 Magna quake of March 2020 shook seismometers far beyond 300 km (Figure 3).

<figure markdown="span">
  ![Two record sections of the magnitude 5.7 Magna quake side by side, 31 stations from 12 to 397 km, distance down. Left, plain time from 0 to 60 seconds: blue dots and circles (first P) follow a teal line labelled Pg: 6.2 km/s down to about 150 km, then a steeper purple line labelled Pn: 7.8 km/s. A dotted line at 149 km is labelled lines cross at 149 km. The purple line, extended back as a dashed line, reaches 0 km at t i = 6.2 s. Right, the same records in reduced time, t minus d/8, from minus 2 to 14 seconds: the teal Pg line leans steeply to the right, labelled Pg leans right, and below 150 km the purple Pn line runs almost straight down, labelled Pn runs almost straight down.](img/tt-magna-bend.svg){ loading=lazy }
  <figcaption>Figure 3. The Magna quake (magnitude 5.7, March 18, 2020), filtered 1–10 Hz, each
  trace stretched to fit. Grey: SGU (178 km), which has no pick; its record from that day is
  about 100 times too small. First P: the analysts' picks (filled), which stop at 182 km, and
  computer picks (open). The two lines are Quake Explorer's two-line fit. Data: University of
  Utah Seismograph Stations (network UU, doi:10.7914/SN/UU) via EarthScope; quake and analyst
  picks via USGS ComCat.</figcaption>
</figure>

Near the quake the first arrivals follow one line; beyond about 150 km they follow a faster one.
Two straight lines fit these 30 arrivals far better than one:

- **Pg:** 6.17 ± 0.07 km/s (11 stations, out to 128 km);
- **Pn:** 7.78 ± 0.10 km/s (19 stations, from 144 km);
- the lines cross at about 150 km, and the Pn line starts at \(t_i = 6.17\) s.

The analysts stopped picking at 182 km, so the far part of the bend rests on the computer's
picks (17 of the 30). It only picked where P stands out clearly from the noise.

**Reduced time (advanced).** In plain time the two lines lean only a little differently. A
trick makes the bend jump out: from each arrival time, take away the time a wave at 8 km/s
would need to get that far:

$$
\tau = t - \frac{d}{8\ \text{km/s}}
$$

A wave at exactly 8 km/s then arrives at the same \(\tau\) everywhere: a line straight down.
Slower waves lean to the right, by \(1/v - 1/8\) seconds for every kilometre. Pg at 6.17 km/s
leans 3.7 s per 100 km; Pn at 7.78 km/s only 0.36 s per 100 km. In Quake Explorer, tick
**Reduced time (advanced)**.

!!! example "Worked example: how thick is the crust under central Utah?"
    From the two lines for the Magna quake (Figure 3):

    - Speeds: \(v_1 = 6.17\) km/s (Pg) and \(v_2 = 7.78\) km/s (Pn).
    - Critical angle: \(\sin i_c = 6.17 / 7.78 = 0.793\), so \(i_c = 52.5°\) and
      \(\cos i_c = 0.609\).
    - Intercept: the Pn line, extended back to 0 km, starts at \(t_i = 6.17\) s. (That it has
      the same digits as \(v_1\) is a coincidence.)
    - Depth of the quake: \(h = 11.9\) km (USGS ComCat).
    - Crust: \(H = \tfrac{1}{2}\,(6.17 \times 6.17 / 0.609 + 11.9) = \tfrac{1}{2}\,(62.5 + 11.9)
      = 37.2\) km.

    So the crust is about **37 km** thick along these paths. Most of the far stations are
    south and south-east of Magna, so the waves crossed the crust under central Utah.

### How sure are we?

- **The scatter of the picks.** The intercept time is uncertain by about ±0.4 s. That alone
  moves the answer between 35 and 39 km.
- **Which picks go in.** Quake Explorer's reveal uses one station for every 12.5 km of
  distance (30 of the 31 stations here), so its numbers differ a little from these: Pn
  7.67 km/s, the lines crossing at 143 km, and a crust about 36 km thick.
- **The model.** One even crust over the mantle is the simplest model there is. The Pg line in
  Figure 3 starts at 1.2 s, not 0 s. If that is a delay every P wave picks up (for example in
  slow rock near the surface), it should come off the Pn intercept too, and the crust comes
  out about 31 km.

What do professionals find? The University of Utah's model for locating quakes along the
Wasatch Front (1981–2012) speeds up to 7.5 km/s at 25 km down and reaches mantle speed
(7.9 km/s) at 42 km;
its Colorado Plateau model reaches 7.8 km/s at 40 km ([UUSS](https://quake.utah.edu/?p=425)).
Studies with many seismometers find the crust 42–50 km thick under the middle of the Colorado
Plateau, thinning to 30–35 km at its edges
([Wilson and others, 2010](https://doi.org/10.1029/2010GL044799)). Our 31–39 km fits in that
range: not bad for two straight lines through one quake.

**A hint in the Junction quake.** In Figure 1, the P arrivals beyond about 200 km come before
the 6.1 km/s line, up to 3.3 s early at HLJ (269 km). A line through the 4 farthest gives about
8.4 km/s, but with so few computer picks it could be anything from about 7.5 to 9.4 km/s. It is
a hint, not a measurement.

## Far away: travel times through the whole Earth

For a quake thousands of kilometres away, Earth's curve matters. Distance is measured as the
angle between the quake and the station, seen from Earth's centre: 1° is about 111 km along
the surface, and 180° is the far side of the world. Figure 4 shows how long P and S take to
travel any distance in **iasp91**, a standard model of the whole Earth
([Kennett and Engdahl, 1991](https://doi.org/10.1111/j.1365-246X.1991.tb06724.x)).

<figure markdown="span">
  ![Travel-time curves through the whole Earth: distance from 0 to 180 degrees runs down and minutes after the quake, 0 to 30, across. A blue P curve and a red S curve start at the top left and bend, getting steeper with distance. A grey dashed straight line, a steady 8 km/s for comparison, falls behind the P curve. A dotted line at 35.8 degrees marks station SGU, with a blue dot on the P curve near 7 minutes and a red dot on the S curve near 12.5 minutes. A note reads: Sand Point, Alaska M7.3 recorded at SGU (35.8 degrees): P model 6:56, picked 6:59; S model 12:32, picked about 12:45. The P curve stops at 98 degrees and continues only as a faint dashed line labelled Pdiff: weak, bent around the core. A grey band from 103 to 142 degrees is labelled P shadow zone: the core is in the way. Beyond it a blue curve labelled PKP: through the core reaches 180 degrees at about 20 minutes. The S curve stops near 100 degrees, labelled direct S stops near 100 degrees: it can't cross the liquid core. An inset, Inside the Earth, to scale, shows P rays curving down through the mantle and back up to the surface, a thick one to SGU, one grazing the core and a dashed one through the core, with the shadow zone marked on the surface.](img/tt-global.svg){ loading=lazy }
  <figcaption>Figure 4. Travel times in the iasp91 Earth model for a quake 38 km deep, computed
  with ObsPy TauP (Quake Explorer reads its times from a table made the same way). The SGU
  picks were made by the same computer picker Quake Explorer uses. Data: University of Utah
  Seismograph Stations (network UU, doi:10.7914/SN/UU) via EarthScope; quake from USGS
  ComCat.</figcaption>
</figure>

**The curves get steeper with distance.** If P kept a steady 8 km/s (the grey line), it would
need 8 min 18 s to reach SGU, 3,985 km from the Sand Point quake. It takes 6 min 56 s. Near SGU
the P curve's slope is about 13 km/s, faster than any rock near the surface.

**Why?** Rock gets faster with depth: deep in the mantle, P travels up to 13.7 km/s. As a wave
goes deeper into faster rock, Snell's law tips it more and more sideways, until it turns and
comes back up (the inset in Figure 4). The farther the station, the deeper the wave dives. The
P wave to SGU went down about 860 km; the one to 97° skims the core, 2,889 km down. It is the
same idea as Pn, smoothed out: a longer path through faster rock wins. A curved travel-time
graph is evidence that Earth is faster inside.

**The shadow zone.** At the core, P suddenly slows from 13.7 to 8.0 km/s. Waves that enter the
core bend sharply and come out much farther away, so direct P stops at about 98°. Between about
103° and 142° the core casts a **shadow**: only weak waves arrive, such as Pdiff, which bends
around the core. Beyond 142°, waves that crossed the core (PKP) arrive.

**No S through the core.** S waves cannot travel through liquid ([Seismic waves](waves.md)).
Direct S stops near 100°, and no S wave crosses the outer core. That is how seismologists found
that the outer core is liquid.

!!! question "A little late in Utah? (for discussion)"
    For the magnitude 7.3 Sand Point, Alaska, quake of July 16, 2025, the model says P should
    reach SGU (the stand-in for Gunnison Valley) 6:56 after the quake, and S at 12:32. A
    computer picker (the same one Quake Explorer uses) picked P at 6:59, about 3 s late. S was
    harder: on the vertical sensor it hardly shows, and on the two horizontal sensors the
    computer picked it at 12:45 and 12:47, about 13–15 s late. But there, S is barely bigger
    than the background noise.

    Why might Utah's arrivals be late? Some ideas to weigh, not an answer:

    - **The model is a world average.** Seismologists have mapped unusually slow rock at the
      top of the mantle under much of Utah, especially for S waves
      ([Buehler and Shearer, 2014](https://doi.org/10.1002/2013JB010559)). Our own Pn speed,
      7.8 km/s, is slower than the 8.04 km/s just below the Moho in iasp91.
    - **SGU is high.** The station is 2,357 m above sea level, and the model's times are for
      sea level.
    - **The picks.** A computer can pick a slowly starting wave late, and an S wave hardly
      bigger than the noise could be picked many seconds off.
    - **The quake's time and place** in the catalog have small errors too.

## Limits, and how professionals do it

- **Layers, not one crust.** The University of Utah has located quakes with layered models. Its
  Wasatch Front model has five layers, from 3.4 km/s at the surface to 7.9 km/s below 42 km
  ([UUSS](https://quake.utah.edu/?p=425)). Even there, the bottom of the crust is not one sharp
  step.
- **3-D models.** Rock speeds change from place to place: Basin and Range, Wasatch Front,
  Colorado Plateau. Sandia and Los Alamos national laboratories built a 3-D model of P speeds in
  Utah's crust from 1,724 seismic events recorded at 100 University of Utah stations
  ([Hammond and others, 2020](https://www.osti.gov/servlets/purl/1635753)).
- **Many quakes, many stations.** Professionals fit an intercept time for every station and
  every quake at once. With the EarthScope USArray, Buehler and Shearer (2014) used this idea
  to map the crust's thickness and the speed below the Moho across the western United States.
- **Other methods.** When P from a distant quake reaches the Moho under a station, part of it
  turns into S. The delay between the two gives the crust's thickness under that one station.
  Wilson and others (2010) used these "receiver functions" to measure the crust across the
  Colorado Plateau.
- **Picks have errors.** For the Junction quake, the analysts rated most of their P picks as
  good to 0.06–0.12 s. A computer pick, or an S pick, can be off by much more.

## Try it

1. In Figure 1, how long does S take to go from 50 km to 150 km along the red line? What speed
   is that?
2. A quake is 10 km deep and P travels 6.1 km/s. How long does P take to reach a station right
   above it? One 20 km away? Explain why the arrivals line points almost straight down near the
   quake.
3. Find \(V_P/V_S\) for each S speed in [Measuring the speeds](#measuring-the-speeds). With P
   at 6.1 km/s, what S speed would give the University of Utah's 1.74?
4. In reduced time with 8 km/s, how far does a wave at 6.0 km/s lean over 100 km? What would a
   wave faster than 8 km/s look like?
5. Suppose the Pn line for the Magna quake had started at \(t_i = 7.0\) s, with the same speeds
   and depth. How thick would the crust be? Would the two lines then cross nearer the quake or
   farther away?
6. Why can't a head wave reach a station 50 km from the Magna quake? Use Figure 2.
7. SGU is 2,357 m above sea level. Roughly how much later does P arrive because it has to climb
   that extra rock at about 6 km/s? Is that enough to explain why P was 3 s late?
8. Why does no direct S wave arrive more than about 100° from a quake?

Using these records in your own work? [Credit the data](stations.md#how-to-credit-the-data).
