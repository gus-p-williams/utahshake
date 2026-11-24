# Reading a seismogram

**Used in:** [Quake Locator](../apps/wave-race.md) · [Quake Explorer](../apps/quake-explorer.md) · School Pulse (coming soon)

A seismometer never stops recording. Most of what it records is not a nearby quake: it is the
ocean, the wind, traffic, mines, and quakes on the other side of the world. This page shows
real records of each, so you can tell a quake from everything else.

!!! tip "In a hurry?"
    For [Quake Locator](../apps/wave-race.md) you need the first two sections: what the
    instrument records and the anatomy of a quake record. The rest helps you tell a quake from
    everything else.

## What the instrument records

A seismometer is a heavy **mass** hanging on a **spring** inside a **frame** that is bolted to
the ground. When the ground shakes, the frame shakes with it, but the mass tends to stay put.
So the mass and the frame move past each other.

In a **geophone**, the kind of seismometer in a Raspberry Shake, a coil of wire moves past a
magnet. A moving magnet makes a voltage in a coil (Faraday's law), and the faster the motion,
the bigger the voltage. So the voltage follows the ground's **speed** (its velocity).

<figure markdown="span">
  ![Diagram. On the left, a frame bolted to the ground holds a spring with a mass hanging from it; a coil hangs under the mass around a magnet fixed to the bottom of the frame, and an arrow shows the ground shaking up and down. A wire from the coil leads right to three boxes joined by arrows: voltage (the coil moving past the magnet makes a tiny voltage), digitizer (measures the voltage 100 times every second) and counts (a list of whole numbers such as 812, 790, 1,204). Below the boxes, a sketched wiggly line is labelled as a seismogram made by plotting the counts against time.](img/seismometer-inside.svg){ loading=lazy }
  <figcaption>Figure 1. Inside a seismometer (a geophone; simplified). The digitizer turns the
  voltage into whole numbers called counts. Plotted against time, the counts are the
  seismogram.</figcaption>
</figure>

A **digitizer** measures the voltage **100 times every second** and writes each measurement as
a whole number, called a **count**. A seismogram is these counts plotted against time.

- **Counts are tiny.** Each station's records say how many counts one metre per second of
  ground speed makes. At station TMU, it is 481 million counts, so one count is about
  2 nanometres per second: two millionths of a millimetre each second.
- **Counts have a limit.** A 24-bit digitizer counts from −8,388,608 to +8,388,607; an older
  16-bit one only from −32,768 to +32,767. Shaking that goes past the limit is cut off
  ([clipped](#instrument-problems)).
- **Quake Locator shows counts,** each trace stretched to fit its panel. Picking arrival *times*
  doesn't need the true ground speed.

The University of Utah's best stations use **broadband** seismometers, which use electronics to
hold the mass still and measure the force that takes. They feel much smaller and slower motions
than a geophone, but the result is the same: counts that follow the ground's speed.

## Anatomy of a quake record

A seismogram is a graph of ground motion (up the page) against time (across). On a quiet
day it shows a wiggly **background noise**: the [ocean](#ocean-hum-microseism),
[wind](#wind-and-weather), [people and machines](#people-and-machines). A quake shows up as:

1. **the P arrival**: the first clear change from the background, often small and sharp;
2. **the S arrival**: a second, usually larger change a few seconds later;
3. **the coda**: shaking that slowly dies away as scattered waves keep arriving.

<figure markdown="span">
  ![Three-component seismogram from station MTPU (traces HHZ, HHN, HHE). The traces are flat until a blue line at 5 seconds marked 1 P arrival, where small sharp waves begin. Much bigger waves start at a red line at 9 seconds marked 2 S arrival; an arrow between the lines reads S minus P = 4.14 s. After about 20 seconds the shaking slowly dies away, marked 3 coda.](img/seismogram-anatomy.svg){ loading=lazy }
  <figcaption>Figure 2. A real seismogram from station MTPU, 29 km from the magnitude 3.3
  quake near Junction, Utah, with the three parts listed above. Filtered 1–10 Hz (it keeps
  vibrations of 1 to 10 waves per second; see [Filters and spectrograms](#filters-and-spectrograms)); picks by
  University of Utah analysts. Data: University of Utah Seismograph Stations (network UU,
  doi:10.7914/SN/UU) via EarthScope; picks via USGS ComCat.</figcaption>
</figure>

The time between P and S is the **S-minus-P time**. It is the key to distance:
see [Distance from S minus P](s-minus-p.md).

Picking S is hard, even for professionals: S arrives while the ground is still shaking from P.
For the offline sample quake, University of Utah analysts picked P at 9 stations but S at
only 3.

## Ocean hum (microseism)

Seismometers everywhere, even in the middle of Utah, can feel a steady hum from the oceans. It
is clearest on broadband stations like TMU, especially in winter; a geophone (like the one in a
Raspberry Shake) feels it only weakly.
Storms far out at sea whip up big waves. Where waves running in opposite directions meet, the
water pushes up and down on the sea floor, and waves crashing on coasts push on it too. Those
pushes shake the Earth's crust, and the shaking travels across the continent.

Seismologists call this hum the **microseism**. Its strongest part has waves 3 to 10 seconds
apart (0.1–0.3 Hz; Hz, or hertz, means waves per second); a weaker part has waves 10 to 20 seconds apart
([more about the microseism](https://en.wikipedia.org/wiki/Microseism)).

<figure markdown="span">
  ![Three traces of two minutes each from station TMU, all on the same scale. Top: a winter night, with smooth waves about 5 seconds apart filling most of the track; an arrow over five of them reads 5 waves in 26 seconds. Middle: a summer night, with the same kind of waves but about a third as tall. Bottom: the winter night again, filtered 1 to 10 Hz, which is an almost flat line.](img/ocean-hum.svg){ loading=lazy }
  <figcaption>Figure 3. Ocean hum at station TMU (the stand-in for Wasatch Academy), 2 am on a
  winter night and 3 am on a summer night, all three on the same scale. The biggest winter
  waves are about 500 counts, about one micrometre per second. Data: University of Utah
  Seismograph Stations (network UU, doi:10.7914/SN/UU) via EarthScope.</figcaption>
</figure>

- **It never stops.** The waves come about every 5 seconds (0.2 Hz), day and night.
- **It is stronger in winter,** when ocean storms are stronger: at TMU, 2 to 4 times bigger on
  winter nights than on a July night.
- **A 1–10 Hz filter removes it** (bottom trace), because 0.2 Hz is far below 1 Hz. That is
  one reason Quake Locator filters 1–10 Hz by default.

## Wind and weather

Wind pushes on trees, bushes, fences, power poles, buildings and the seismometer's own
shelter. They rock back and forth and shake the ground around them. Gusts come and go, so the
noise comes and goes too, at many frequencies at once, right where small quakes are.
Seismologists bury their sensors, in vaults or in holes, to get away from the wind.

Figure 4 comes from the windy desert near Milford, in southwest Utah, because a weather station
there measures the wind only 13 km from a seismometer.

<figure markdown="span">
  ![Top: two line graphs over four days, February 16 to 19, 2026, with nights shaded grey. The upper graph is wind speed at Milford airport, mostly 10 to 38 miles per hour for the first two and a half days, then mostly 5 to 15 for the rest. The lower graph is ground noise at station FOR8; it rises and falls with the wind, reaching 40 to 58 counts on the windy days and staying near 3 to 10 counts on the calm last day. A point marked B sits at about 32 counts on the windy night of February 18 and a point marked A at about 3 counts on the calm night of February 19. Bottom: one minute of each of those nights on the same scale, filtered 1 to 10 Hz: A is a thin, nearly flat line; B is a ragged band of wiggles about ten times taller, with bigger bursts.](img/wind-noise.svg){ loading=lazy }
  <figcaption>Figure 4. Wind and ground noise near Milford, Utah. Noise at station FOR8 is the
  typical size of the 1–10 Hz shaking in each 15 minutes. Through the windy nights the ground
  was typically about 4 times noisier than on the calm night, and in the strongest gusts about
  10 times: point B (wind 29 mph) against point A (wind 6 mph). Data:
  University of Utah Seismograph Stations (network UU, doi:10.7914/SN/UU) via EarthScope;
  wind: Milford Municipal Airport weather station (MLF) via the Iowa Environmental
  Mesonet.</figcaption>
</figure>

Weather far away matters too: the ocean storms that make the [ocean hum](#ocean-hum-microseism)
are weather.

## People and machines

Cars and trucks, trains, factories, construction, pumps and generators, even people walking
around a building: all of them shake the ground a little. Much of this shaking is between 1 and
10 Hz, so a 1–10 Hz filter keeps it. A seismometer in or near a town hears people's daily
routine.

<figure markdown="span">
  ![Line graph of ground noise at station HEB over one week, Monday September 28 to Sunday October 4, 2026, with nights shaded grey and the weekend shaded pale orange. Every night the line sits near 1, the night level. On each weekday it climbs in the morning to about 6 to 12 times the night level and falls in the evening; a label reads weekday afternoons: about 8 times. On Saturday it rises to about 4 to 8 times, and on Sunday only to about 2 times.](img/people-week.svg){ loading=lazy }
  <figcaption>Figure 5. One week of ground noise at station HEB, about 7 km east of Heber City,
  filtered 1–10 Hz and compared with the quietest night hours. Weekday afternoons are about
  8 times louder than the night; Sunday only about 2 times. Data: University of Utah
  Seismograph Stations (network UU, doi:10.7914/SN/UU) via EarthScope.</figcaption>
</figure>

You can read the work week in the ground: quiet nights, busy weekdays, a slower Saturday and a
quiet Sunday. We don't know exactly which roads or machines HEB hears, but the pattern gives
people away: wind and the ocean don't take weekends off. Three months of HEB in one picture,
the [seismic carpet](plots.md#months-at-a-glance-the-seismic-carpet), even show the day the
clocks changed.

!!! note "Coming soon: School Pulse"
    School Pulse will draw this kind of picture for each school's stand-in station, and later
    for the school's own Raspberry Shake. What rhythms will your school's seismometer hear?

## Other quakes

A seismometer records quakes from all over the world, not just nearby. The farther away a quake
is, the longer and **lower-pitched** its record. Along the way the rock soaks up the fast
vibrations (the high notes) sooner than the slow ones, so only the low notes travel far. (Big
quakes also make more low notes to begin with, and the far quakes below are big ones.)

<figure markdown="span">
  ![Three panels, each showing station TMU's vertical sensor raw (upper trace) and filtered 1 to 10 Hz (lower trace). First, a small quake 29 km away, magnitude 2.3, over 50 seconds: both traces show the same burst starting at 5 seconds and fading by 30 seconds. Second, a quake in western Nevada 670 km away, magnitude 5.7, over 6 minutes: a blue line marks P at 93 seconds and a red line S at 194 seconds; the raw trace shows large slow surface waves after 215 seconds, while the filtered trace shows bursts at P and S. Third, a quake off Kamchatka, Russia, 6,600 km away, magnitude 8.8, over one hour: P at 10 minutes, S at 18 minutes, and big slow surface waves from 25 minutes to the end in the raw trace; the filtered trace shows only a short burst after P.](img/three-quakes.svg){ loading=lazy }
  <figcaption>Figure 6. Three quakes at station TMU: near, regional and distant. Each trace is
  stretched to fit. The Nevada P and S lines were picked by eye on this record (the burst
  between them is later P energy travelling through the crust, not S); the Kamchatka ones are
  the times predicted by a standard Earth model (iasp91). Data: University of Utah Seismograph
  Stations (network UU, doi:10.7914/SN/UU) via EarthScope; quakes from USGS ComCat.</figcaption>
</figure>

- **A small quake nearby** (tens of km) is over in less than a minute: sharp P, bigger S a few
  seconds later, then the coda. It is high-pitched; here it is also much bigger than the
  background, so it looks much the same raw or filtered. (A smaller one can hide in the ocean
  hum: see Figure 11.)
- **A regional quake** (hundreds of km) lasts minutes. P and S are far apart (here about
  100 seconds), and slow **surface waves**, which travel along the surface, come last. At
  these distances the simple S − P rule no longer works well (see
  [Limits](s-minus-p.md#limits)).
- **A big distant quake** (thousands of km) lasts an hour or more. For the magnitude 8.8 quake off
  Kamchatka, Russia, on July 29, 2025, P took about 10 minutes to reach Utah through Earth's
  mantle, S about 18 minutes, and the surface waves rolled on for half an hour. Filtered
  1–10 Hz, almost all of it disappears.

## Blasts and mines

Mines and quarries break rock with explosives. Workers drill rows of holes, fill them with
explosives and set them off one after another, during the work day. A big blast shakes the
ground like a small quake. In Utah, the Bingham Canyon copper mine southwest of Salt Lake City
blasts rock in its huge open pit, and the cement plant near Leamington, about 40 km west of
Nephi, blasts limestone in its quarry
[several times a year](https://geology.utah.gov/map-pub/survey-notes/leamington-cement-plant).

University of Utah and USGS seismologists check events, and the earthquake catalog (ComCat)
marks the ones they find to be blasts: "quarry blast", "mining explosion" or "explosion". The
time of day gives blasts away.

<figure markdown="span">
  ![Two bar charts of the share of events in each hour of the day, Utah time. Top: 301 events marked as blasts or explosions; almost all fall between 10 am and 4 pm, with bars of 12 to 18 percent for each hour from 11 am to 3 pm, and none between 10 pm and 7 am. Bottom: 8,734 earthquakes of magnitude 1.5 and up, spread almost evenly over all 24 hours at 3 to 5 percent each.](img/blast-hours.svg){ loading=lazy }
  <figcaption>Figure 7. When Utah's blasts and earthquakes happen, 2015 to November 2026, in
  the University of Utah monitoring region. 97% of the blasts were between 8 am and 6 pm, and
  only 16 of 301 on a weekend. Earthquakes happen at any hour. Data: USGS ComCat.</figcaption>
</figure>

From the wiggles alone, a small blast can look a lot like a small quake:

<figure markdown="span">
  ![Two raw records from station FLU, each 27 seconds long. Top: a quarry blast of magnitude 2.1, 19 km away, on Monday October 26, 2026 at 5:33 pm; shaking starts at about 4 seconds, with a few bigger, slower swings near 11 seconds, and fades by 20 seconds. Bottom: an earthquake of magnitude 2.1, 19 km away, on Friday October 24, 2025 at 8:30 pm; shaking starts at about 4 seconds, is dense and fast, and fades by 20 seconds. The two look much alike.](img/blast-vs-quake.svg){ loading=lazy }
  <figcaption>Figure 8. A quarry blast near Leamington and an earthquake 13 km from it, the same
  size and the same distance from station FLU. Data: University of Utah Seismograph Stations
  (network UU, doi:10.7914/SN/UU) via EarthScope; events from USGS ComCat.</figcaption>
</figure>

So seismologists use more clues than the wiggles:

- **Time:** blasts happen in working hours on weekdays (Figure 7).
- **Place:** at a known mine or quarry.
- **Depth:** at the surface. Quakes usually start kilometres down (the quake in Figure 8,
  2.6 km). Catalog depths are measured from sea level, so a blast on a mountain can even be
  listed a little above it.
- **Shape:** a blast often makes a weaker S and more slow surface waves than a quake of the
  same size, like the slow swings in the blast record above. Often the difference is too
  small to see.

## Instrument problems

Sometimes the seismogram shows the instrument, not the ground. Learn these, so you don't pick
them as a quake:

<figure markdown="span">
  ![Three panels. Clipped: the Magna magnitude 5.7 quake of 2020 recorded 14.5 km away on two recorders at site SAIU over 5 seconds; the 16-bit recorder's trace has flat tops at +32,767 and flat bottoms at −32,768 counts, while the 24-bit recorder's trace has normal rounded waves with a peak of 6.6 million counts. Dead: the same quake at stations NLU and SUU, about 90 km away and 25 km apart, over 90 seconds; NLU shows strong shaking peaking at 1.1 million counts, while SUU is a flat line, minus 3 to plus 1 counts the whole time. Gaps: two minutes from station SGU on November 13, 2026 at 9:26 am, filtered 1 to 10 Hz: steady background shaking on both sides of a 15-second stretch of missing data, shaded in red.](img/instrument-problems.svg){ loading=lazy }
  <figcaption>Figure 9. Three instrument problems: clipping and a dead channel during the
  magnitude 5.7 Magna quake (March 18, 2020), and a gap at station SGU (the stand-in for
  Gunnison Valley). Data: University of Utah Seismograph Stations (network UU,
  doi:10.7914/SN/UU) via EarthScope; quake from USGS ComCat.</figcaption>
</figure>

- **Clipping:** shaking bigger than the digitizer's largest number. The trace has flat tops at
  the same level. At site SAIU, an old 16-bit recorder hit its limits (+32,767 and −32,768
  counts) more than 4,000 times
  during the Magna quake, while a 24-bit recorder at the same site kept the whole wave. You can
  still pick P on a clipped record, but don't trust its size.
- **A dead channel:** a flat line while everything around it shakes. During the Magna quake,
  SUU recorded only −3 to +1 counts; NLU, 25 km away, recorded over a million. A flat line
  means the station wasn't working, not that the ground was still. SUU got a new sensor in
  July 2021 and is the stand-in for Juab High School today.
- **Gaps:** stretches of missing data, when the connection from the station drops or the
  recorder restarts. Don't pick an arrival at the edge of a gap.
- **Spikes:** a single sample far off the line, made by an electrical glitch. Real ground
  motion can't jump that far and back in a hundredth of a second. EarthScope checks every
  station every day for gaps and spikes; in September and October 2026 it found gaps at many
  University of Utah stations but no spikes on their vertical sensors.

## Filters and spectrograms

Every wave obeys

$$
v = f\lambda
$$

where \(v\) is speed, \(f\) is frequency (vibrations per second, Hz) and \(\lambda\) is
wavelength. A 5 Hz P wave travelling 6 km/s has a wavelength of 1.2 km.

Different sources shake the ground at different frequencies, like low and high notes in music.

<figure markdown="span">
  ![A frequency ruler from 0.02 to 100 Hz on a log scale, with low notes on the left and high notes on the right. Coloured bars show rough ranges: ocean hum 0.05 to 0.3 Hz; distant big quakes 0.02 to 2 Hz; nearby small quakes 1 to 20 Hz; wind 0.5 to 50 Hz; people and machines 1 to 50 Hz. A dashed blue box from 1 to 10 Hz is labelled kept by a 1 to 10 Hz filter. A thick line at 50 Hz is labelled the limit for 100 samples per second, with the area beyond it hatched. Under the axis, two more rows give the time for one wave (20 s at 0.05 Hz to 0.02 s at 50 Hz) and the length of one P wave at 6 km/s (120 km at 0.05 Hz to 120 m at 50 Hz).](img/frequency-ruler.svg){ loading=lazy }
  <figcaption>Figure 10. What shakes the ground at which frequency. The ranges are rough: each
  source is strongest in part of its range. The ocean hum range was checked on station TMU's
  records (University of Utah Seismograph Stations, network UU, doi:10.7914/SN/UU).</figcaption>
</figure>

A **band-pass filter** keeps only a chosen range of frequencies, for example 1–10 Hz, so a
quake stands out from the noise. That is what the Filter menu in
[Quake Locator](../apps/wave-race.md#2-pick-the-p-and-s-waves) does.

The instruments sample the ground 100 times per second, so nothing faster than 50 Hz (half
the sampling rate, the **Nyquist frequency**) can be recorded.

A **spectrogram** shows all the frequencies at once: time goes across, frequency goes up, and
colour shows how strong the shaking is at each frequency and moment. A filter keeps one
horizontal strip of the spectrogram.

<figure markdown="span">
  ![Top: three minutes of station TMU's vertical sensor around a magnitude 2.1 quake 36 km away, on February 22, 2026 at 9:41 pm. The raw trace shows smooth ocean-hum waves all the way through, with small fast wiggles riding on them from the P line at 7 seconds to about 40 seconds. The trace filtered 1 to 10 Hz is flat before P, then shows a clear burst that fades by 50 seconds. Bottom: the same three minutes as a spectrogram, with frequency from 0.1 to 50 Hz going up on a log scale and colour from dark purple (weak) to yellow (strong). A bright yellow band near 0.2 Hz, labelled ocean hum: always there, runs the whole way across. A dashed white box marks the band from 1 to 10 Hz that the filter keeps. At the P line, 7 seconds, green colors start suddenly, reaching from about 1 Hz up to 20 Hz, above the box, and fade by about 50 seconds; inside the box, an arrow labeled the quake points to them.](img/hidden-quake.svg){ loading=lazy }
  <figcaption>Figure 11. A small quake on a winter night at station TMU. In the raw record it
  rides on the ocean hum; the 1–10 Hz filter removes the hum and the quake stands out. The
  spectrogram shows why: the hum and the quake are at different frequencies. P pick by
  University of Utah analysts. Data: University of Utah Seismograph Stations (network UU,
  doi:10.7914/SN/UU) via EarthScope; quake and pick from USGS ComCat.</figcaption>
</figure>

## Can you tell?

Each record below shows one thing from this page. What is it? Use the clues: how long the
record is (look at the time axis), how fast the wiggles are, whether it has a start, P and S,
and the time of day.

<figure markdown="span">
  ![Four unlabelled records. Record A, raw, 40 minutes long: small fast wiggles at first, a slower wave near 8 minutes, then from 14 minutes big slow waves that last to the end. Record B, raw, at 2 am, 90 seconds long: smooth waves about 5 seconds apart, with no start or end. Record C, raw, 45 seconds long: a quiet line, then at 7 seconds the trace suddenly jumps between flat tops and flat bottoms at the same two levels until the end. Record D, filtered 1 to 10 Hz, at 1:20 am, 90 seconds long: a ragged band of wiggles that grows and shrinks, with a few bigger bursts, but no clear start.](img/mystery-records.svg){ loading=lazy }
  <figcaption>Figure 12. Four mystery records. Data: University of Utah Seismograph Stations
  (network UU, doi:10.7914/SN/UU) via EarthScope; quakes from USGS ComCat.</figcaption>
</figure>

??? success "Answers"
    - **A: a distant quake.** The magnitude 7.7 quake in Panama on October 9, 2026, 4,700 km
      from station SGU. The clues: the axis is in minutes, and big, slow surface waves arrive
      long after the first small wiggles (P near the start, S about 6 minutes later).
    - **B: ocean hum.** Station SGU at 2 am on a winter night. Smooth waves about every
      5 seconds, with no start and no end.
    - **C: a big nearby quake, clipped.** The magnitude 5.7 Magna quake of 2020 at station WTU,
      35 km away, on a 16-bit recorder. A sudden start, then flat tops and bottoms at the same
      two levels.
    - **D: wind.** Station FOR8 near Milford at 1:20 am on the windy night in Figure 4.
      Ragged shaking that grows and shrinks with the gusts, with no P or S. At 1:20 am it is
      not likely to be people.

## Try it

- In [Quake Locator](../apps/wave-race.md), switch the Filter menu to **Raw**. On broadband (HH)
  stations, especially in winter, you will see the ocean hum. Which filter makes the quake
  clearest?
- Look at the noise *before* P in Quake Locator. Is it bigger at some stations than others? Which
  of the sources on this page could it be? Check the time of day of the quake.
- Next: [Beyond one seismogram](plots.md) puts a whole day, months of noise, or a hundred
  explosions into one picture.
- Using these records in your own work? [Credit the data](stations.md#how-to-credit-the-data).
