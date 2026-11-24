# Beyond one seismogram

**Used in:** School Pulse (coming soon)

One seismogram shows a few minutes at one station. Seismologists also look at many records
at once: a whole day, months of background noise, a month of spectra, the same kind of event
recorded a hundred times. Each plot on this page turns a pile of records into one picture.
Every example is real data from Utah.

!!! tip "Start here"
    This page builds on [Reading a seismogram](seismograms.md): what a seismometer records,
    noise, filters and spectrograms. Each section below stands on its own.

## A day at a glance: the helicorder

Old seismographs drew with a pen on paper wrapped around a slowly turning drum. Each turn of
the drum drew one line, and the pen moved down a little for the next, so a whole day became a
stack of lines. You read it like a book: across, then down. A **helicorder** draws a digital
record the same way.

<figure markdown="span">
  ![A helicorder: 48 lines, each 30 minutes long, from midnight at the top to 11:30 pm at the bottom, alternating dark gray and blue, with the hours marked down the left side. The night lines from 2 am to 8 am are thin and even. The lines get a little thicker during the day and the evening. Six numbered markers point to events, listed under the plot: 1, bursts between 12:47 and 1:09 am; 2, a short break in the 10 am line where data are missing; 3, five tall bursts between 11:33 and 11:48 am, the last the biggest; 4, a quarry blast at 5:33 pm, a tall spike spilling over the lines above and below; 5, a quake at 6:17 pm, another tall spike; 6, a small quake at 7:17 pm. Other small bursts and a few longer rumbles, such as one at about 2:20 pm and one just before 8 pm, are not marked.](img/plots-helicorder.svg){ loading=lazy }
  <figcaption>Figure 1. One day at station SUU, the stand-in for Juab High School in Nephi:
  Monday, October 26, 2026, filtered 1–10 Hz, Utah time. Marker 4 is the quarry blast in
  Figure 8 on Reading a seismogram. Data: University of Utah Seismograph Stations (network UU,
  doi:10.7914/SN/UU) via EarthScope; events from USGS ComCat.</figcaption>
</figure>

What to look for:

- **Quiet nights, busier days.** Between 9 am and 5 pm the ground at SUU shook about 1.7 times
  as much as between midnight and 5 am.
- **Quakes and blasts are short bursts that spill over their neighbors.** This helicorder cuts off
  big swings, the way ink ran off the edge of a paper drum, so the burst's size tells you
  little. To measure it, zoom in on the seismogram.
- **Not everything is in the catalog.** The earthquake catalog lists quakes and blasts.
  The bursts at marker 1 showed up only at SUU: stations 20 to 42 km away recorded nothing, so
  something close to the station made them. The five bursts at marker 3 aren't in the catalog
  either. Station NLU, 25 km to the west, recorded them too, and they came on a Monday late
  morning. What could they be? (Look again at the times of day of blasts in
  [Blasts and mines](seismograms.md#blasts-and-mines).)

The Raspberry Shake at each school draws a helicorder too: the 24-hour view in Raspberry
Shake's [DataView](https://dataview.raspberryshake.org/).

## Months at a glance: the seismic carpet

A helicorder shows one day. To see months, shrink each day to one row of colored cells: each
cell is 15 minutes, and its color shows how much the ground shook then. Stack the days and you
get a **seismic carpet**. The 5–20 Hz band used here is mostly people and machines: traffic,
engines, footsteps (and some wind).

<figure markdown="span">
  ![A colored grid with one row per day from August 24 to November 23, 2026, and the time of day in UTC across the top from 06:00 to 06:00. Dark purple means quiet and yellow busy. In every row the left part, from 06:00 to about 13:00 UTC, is dark: night in Utah. The middle of each weekday row is green to yellow; Saturday rows, marked on the left, are less bright, and Sunday rows darker still. The rows from September 18 to 22 are blank or partly blank, labeled station offline. A white dashed line marks the weekday morning rise at about 13:00 UTC in October; after a bracket labeled clocks fall back Nov 1, a second dashed line sits about 45 minutes to the right, at about 13:50 UTC. Labor Day, September 7, is labeled. A color scale under the grid runs from 1 to 10 times the quiet level.](img/plots-carpet.svg){ loading=lazy }
  <figcaption>Figure 2. Three months of ground noise at station HEB, about 7 km east of Heber
  City: the typical 5–20 Hz shaking in each 15 minutes, compared with the quietest hours
  (1 to 4 am). Data: University of Utah Seismograph Stations (network UU, doi:10.7914/SN/UU)
  via EarthScope.</figcaption>
</figure>

What to look for:

- **The work week.** On weekdays, between 10 am and 4 pm, the ground shook about
  5.9 times as much as in the quietest hours; on Saturdays 3.7 times, on Sundays 2.7.
- **Gaps.** The station sent no data for almost four days in September.
- **The clocks.** Seismic data are kept in **UTC** (Coordinated Universal Time), so that
  stations everywhere agree. Utah is 6 hours behind UTC in summer (daylight saving time) and
  7 hours behind in winter. When Utah's clocks fell back on November 1, the weekday morning
  rise moved later in UTC, from about 13:00 to about 13:45: 45 minutes, close to the hour the
  clocks moved. People went on getting up by the clock, and the ground shows it.

School Pulse will draw a carpet like this for each school. None of the five stand-in stations
shows people's rhythms as clearly as HEB does; all five sit high on mountainsides, 2,000 to
3,000 m up, well away from the towns. A
school's own Raspberry Shake, inside the building, may hear its bells and buses.

## How quiet is a station? Spectra and the PPSD

A **spectrum** shows how strong the shaking is at each frequency (see
[Any wiggle is a sum of sine waves](frequencies.md#any-wiggle-is-a-sum-of-sine-waves)). One
hour gives one spectrum. Draw a month of hours on top of each other, darker where more hours
fall, and you get a **probabilistic power spectral density**, or **PPSD**: the station's
noise "fingerprint". Seismologists use it to check a station and to choose quiet sites.

To compare stations, the shaking is measured as ground acceleration, after taking out the
instrument (each station's records describe how its sensor and digitizer respond), and written
in **decibels (dB)**. Every 10 dB more is 10 times the power, or about 3 times bigger shaking;
20 dB is 10 times bigger shaking.

In 1993 Jon Peterson of the USGS gathered noise spectra from 75 stations around the world and
drew two lines around them: the **low-noise model**, about as quiet as the Earth ever gets, and
the **high-noise model**, typical of noisy stations
([Peterson, 1993](https://pubs.usgs.gov/publication/ofr93322)). Every PPSD plot shows those
two lines.

<figure markdown="span">
  ![A chart with frequency from 0.02 to 40 Hz across on a log scale and shaking power from minus 190 to minus 90 dB up. A gray-blue cloud, darkest along a narrow band, shows every hour of January 2026 at station TMU, with a white line through its middle for the median hour. An orange line near the top is the high-noise model and a green line near the bottom the low-noise model; both stop at 10 Hz. The cloud rises to a hump between about 0.1 and 0.3 Hz labeled ocean hum, dips near 1 Hz, and rises again above about 2 Hz, labeled wind, people, machines. Faint ink above the dark band marks the few loud hours.](img/plots-ppsd.svg){ loading=lazy }
  <figcaption>Figure 3. A month of noise at station TMU (the stand-in for Wasatch Academy):
  every hour of January 2026, vertical sensor. Reference curves: Peterson (1993), USGS
  Open-File Report 93-322; they are defined only up to 10 Hz. Data: University of Utah
  Seismograph Stations (network UU, doi:10.7914/SN/UU) via EarthScope.</figcaption>
</figure>

- **The ocean hum** is the hump between 0.1 and 0.3 Hz (waves 3 to 10 seconds apart; see
  [Ocean hum](seismograms.md#ocean-hum-microseism)).
- **Above about 1 Hz** the noise is wind, people and machines, and it changes most from hour
  to hour.
- **TMU is a quiet station.** At about 0.65 Hz, between the ocean hum and the people noise,
  its median hour is only 11 dB above the quietest places on Earth: shaking about 3.6 times
  bigger.

The same plot can compare two months, or two instruments:

<figure markdown="span">
  ![Two charts with the same axes as Figure 3. Top: station TMU in January (blue) and July (orange), each a line for the median hour with a shaded band from the quietest to the noisiest hours. Between 0.1 and 0.3 Hz, labeled ocean hum, stronger in winter, the blue line lies well above the orange one. Above about 1 Hz the orange July line lies above the blue one. Bottom: station SRU in October 2026, a broadband seismometer (dark gray) and a geophone (teal) at the same site. From about 0.1 to 8 Hz the two lines lie on top of each other, labeled both record the same ground. Below 0.1 Hz the teal geophone line rises well above the gray one, labeled geophone: its own noise. The teal line stops at 8 Hz, labeled geophone cut off.](img/plots-ppsd-compare.svg){ loading=lazy }
  <figcaption>Figure 4. Top: winter against summer at station TMU (January and July 2026).
  Bottom: a geophone (Geotech S-13) and a broadband seismometer (Trillium 120) side by side at
  station SRU, October 2026. Lines: the median hour; shading: the 10% quietest to the 10%
  noisiest hours. Data: University of Utah Seismograph Stations (network UU,
  doi:10.7914/SN/UU) via EarthScope.</figcaption>
</figure>

- **Winter against summer.** Between 0.1 and 0.2 Hz the ocean hum is 6 to 9 dB stronger in
  January than in July: 2 to 2.8 times bigger shaking, the winter storms of
  [Ocean hum](seismograms.md#ocean-hum-microseism). Above 1 Hz, July is the noisier month.
  Can you think why?
- **Two sensors, one site.** Where both work, from about 0.1 to 8 Hz, a geophone and a
  broadband seismometer record the same ground: their median lines differ by 1 dB at most.
  Below 0.1 Hz the geophone can no longer feel the ground's slow motions, and what it records
  is its own electronic noise (20 dB above the broadband's line at 0.05 Hz). This older
  station's geophone signal also passes through filters that cut off the signal above about
  10 Hz.

A Raspberry Shake is a geophone too. Putting a school's Shake on this plot next to a
professional station nearby is a way to answer "how good is our seismometer?".

## The ground under the station: H/V

On a quiet night the ground still trembles, a little, in every direction. Where soft ground (a
layer of sand, clay and gravel) lies on stiffer ground, the soft layer **rings** at one
frequency, like a guitar string, and at that frequency the ground rocks side to side much more
than it moves up and down. Dividing the side-to-side shaking by the up-and-down shaking at each
frequency gives the **H/V ratio** (horizontal over vertical). Its peak is the ringing
frequency, \(f_0\).

The soft layer rings when its thickness \(H\) is a quarter of a wavelength of the S waves in
it, so one whole wave is \(\lambda = 4H\). With \(v = f\lambda\):

$$
f_0 = \frac{V_S}{4H}
\qquad\text{so}\qquad
H = \frac{V_S}{4 f_0}
$$

where \(V_S\) is the speed of S waves in the soft layer.

<figure markdown="span">
  ![Top: a line chart of H/V against frequency from 0.1 to 20 Hz on a log scale, with a dashed line at 1. The orange curve for FOR4, on deep basin fill near Milford, rises to a sharp peak of 3.1 at 0.42 Hz, labeled f0 = 0.42 Hz, and falls back near 1 by 0.6 Hz, inside a pale orange band. The gray curve for CTU, on rock in Mill Creek Canyon, stays near 1 at every frequency. A dashed purple curve for SGU, the Gunnison Valley stand-in, peaks at 3.5 at 2.8 Hz. Bottom: a column drawn to scale of the ground under FOR4: softer basin fill down to 515 m, with S-wave speeds from 390 to 1,030 meters per second and a quarter wave drawn in it; stiffer basin fill at about 2,000 meters per second down to about 1.3 km; then granite. Beside it the worked example: lambda = 4 times 515 m = 2,060 m; f0 = 816 m/s divided by 2,060 m = 0.40 Hz; measured at FOR4, 0.42 Hz. The granite, about 1.3 km down, would ring near 0.25 Hz, so the peak marks the first big jump in stiffness, not the bedrock.](img/plots-hv.svg){ loading=lazy }
  <figcaption>Figure 5. H/V on quiet nights (1 to 3 am) at three broadband stations. FOR4 sat on
  deep basin fill at the Utah FORGE geothermal site near Milford; it closed in 2021, and its
  curve comes from four winter nights in 2018 and 2020. CTU is on rock in Mill Creek Canyon,
  near Salt Lake City. Below: why the peak is where it is (S-wave speeds from Zhang and
  Pankow, 2021; depth to granite from the Utah Geological Survey, 2019). Data: University of
  Utah Seismograph Stations (network UU, doi:10.7914/SN/UU) via EarthScope.</figcaption>
</figure>

- **Without a soft layer, H/V stays near 1:** at CTU, between 0.8 and 1.4 at every frequency
  above 0.5 Hz.
- **On basin fill, a clear peak:** at FOR4, at 0.42 Hz, the ground rocks side to side
  3.1 times as much as up and down.
- **The worked example.** A survey of S-wave speeds near FOR4 found that the fill gets much
  stiffer at 515 m depth, and that S waves cross the fill above it at an average 816 m/s. So
  \(f_0 = 816 / (4 \times 515) \approx 0.40\) Hz, close to the 0.42 Hz measured.
- **A twist.** The granite (the bedrock) is deeper: a well 850 m away drilled through 968 m
  of basin fill before reaching rock, and the Utah Geological Survey puts the granite about
  1.3 km down under FOR4. The peak marks the
  first big jump in stiffness, inside the basin fill, not the bedrock. H/V
  tells you where the ground gets much stiffer; it doesn't tell you what the rock is.

Soft ground matters for safety: in a quake it shakes harder than rock, most of all near its own
ringing frequency. Mapping \(f_0\) is one way engineers find such ground.

??? question "Try it: the Gunnison Valley stand-in"
    Station SGU, the stand-in for Gunnison Valley High School, also has an H/V peak: 3.5 times,
    at 2.8 Hz (Figure 5). We haven't found a measurement of the S-wave speed there. If the soft ground
    carries S waves at about 400 m/s, how thick is it? What if it is 300 or 500 m/s?

    *Answer:* \(H = V_S / (4 f_0) = 400 / (4 \times 2.8) \approx 36\) m; for 300 and 500 m/s,
    about 27 and 45 m. A Raspberry Shake with three components (up-down, north-south and
    east-west) can measure a school's own peak the same way.

## Repeats: stacking and cross-correlation

!!! example "Rocket motors in the desert"
    Every summer the Air Force destroys rocket motors by blowing them up at the **Utah Test
    and Training Range**, on the west side of the Great Salt Lake. These are huge explosions
    on the surface: when seismologists studied them in 2007, they were typically 40,000 to
    80,000 pounds of explosive. Seismometers hundreds of kilometers away record them.

    The earthquake catalog lists 152 explosions at one spot there since 2015. It files most of
    them (133) as "quarry blast", although the site is on a military range, not at a quarry.
    They are most likely the Air Force's detonations, because of the **place** (where
    seismologists who recorded the detonations put them; Stump and others, 2007), the
    **season** (144 of the 152 in June to September) and the **schedule**: every one between
    10 am and 6 pm, and 151 of them on a Monday, Tuesday or Wednesday.

    For seismologists they are a gift: the same place, again and again, at a known time.

### Stacking

A single explosion recorded far away can hide in the noise. But the noise is different every
time, while the explosion's waves are much the same. Line up many records on the P arrival and
**average** them (a **stack**): the waves add up, and the noise averages away. Averaging
\(N\) records shrinks random noise to \(1/\sqrt{N}\) of one record's: 4 records halve it, 100
records cut it to a tenth.

<figure markdown="span">
  ![Seven traces from station TMU, 90 seconds each, filtered 1 to 5 Hz, on one scale, with a blue line at P and a pale red band from 40 to 49 seconds labeled later, stronger waves. The top three are single explosions from July 7 and July 13, 2015: ragged noise with spikes and no clear start at P; labels give signal ÷ noise 1.4, 1.8 and 3.0. Below them are stacks of the first 4, 16 and 64 explosions and of all 144: row by row, the noise before P shrinks until the line is flat, while the waves after P and a burst near 44 seconds stay the same size; signal ÷ noise rises to 3, 7, 12 and 22. A second chart, on log scales, plots size against the number of explosions stacked: the noise dots fall from 1 to 0.08 along a dashed 1 ÷ √N line, while the waves level off near 1.8.](img/plots-stack.svg){ loading=lazy }
  <figcaption>Figure 6. Stacking. At station TMU (the stand-in for Wasatch Academy), 248 km
  from the Utah Test and Training Range, one explosion is barely above the noise (half of them
  have a signal ÷ noise below 2.6). Lined up on P and averaged, 144 explosions from 2015 to
  2026 give a clear record: the noise falls as 1/√N, to 0.08 of one record's, the
  waves stay, and signal ÷ noise reaches 22. Data: University of Utah Seismograph Stations
  (network UU, doi:10.7914/SN/UU) via EarthScope; events from USGS ComCat; P picks by
  University of Utah analysts via USGS ComCat.</figcaption>
</figure>

Stacking is how seismologists see what one record can't show: here, waves from 248 km away
that are barely above the background noise in most single records.

### Cross-correlation

How alike are two records? Slide one along the other, and at each shift multiply them sample
by sample and add up the products (scaled so the answer runs from −1 to +1). That is the
**cross-correlation**. +1 means the two match exactly, 0 means no match, and −1 means one is
the other upside down. The shift with the best match tells you how much later one record is
than the other.

<figure markdown="span">
  ![Three panels from station BGU, 25 km from the explosion site. Each overlays two records, 11 seconds from just before P, with a small graph beside it of how well they match at shifts from −1 to +1 second, and a gray band for chance. Top: explosions on August 9, 2023 and August 6, 2024 lie almost exactly on top of each other; the match graph has one sharp peak of 0.99 at zero shift. Middle: explosions from two different families, August 9, 2023 and September 29, 2025, start alike but drift apart; the peak is 0.55. Bottom: a small earthquake from April 2, 2006 against the average of all 147 explosions looks different throughout; its match graph stays inside the chance band, at most 0.12.](img/plots-xcorr.svg){ loading=lazy }
  <figcaption>Figure 7. Cross-correlation at station BGU, 25 km from the explosions (1–10 Hz,
  from 1 s before P to 10 s after). Gray band: the scores that noise alone reaches (90% of
  noise windows score below 0.22). Data: University of Utah Seismograph Stations (network UU,
  doi:10.7914/SN/UU) via EarthScope; events from USGS ComCat; P picks by University of Utah
  analysts via USGS ComCat.</figcaption>
</figure>

- **Two explosions a year apart match almost perfectly** (0.99): the same place and the same
  path through the rock to the station.
- **The explosions come in five "families"** of look-alikes. Each explosion matches the stack
  of all the others at about 0.71 (the median); explosions from different families match less
  well (0.55 in the middle panel).
- **A small earthquake 9 km from the site** (magnitude 1.6, 2006) scores at most 0.12 at any
  shift up to 1 second, no better than noise. It was also deeper (2.8 km) and in a different place, so this shows that it looks
  different, not why.

Cross-correlation is how a computer finds repeats in months of data (a new explosion from the
same site, the same bus passing every school day), and how it measures the time between two
stations' records of the same wave, which gives the wave's speed.

## Try it

- In Figure 1, find all six numbered events, then two more that the list doesn't mention.
  At what time of day are most of the small bursts?
- In Figure 2, read the morning rise in UTC before and after November 1, and turn both into
  Utah time. Did people change when they got up?
- In Figure 2, was Labor Day (Monday, September 7) quieter than the Mondays before and after
  it? Look at its morning and its afternoon.
- In Figure 3, at which frequency does TMU come closest to the quietest places on Earth? How
  much bigger is its shaking there?
- In Figure 6, how many explosions would you need to stack to halve the noise of the stack of
  144?

??? success "Answers"
    - **Labor Day:** not as much as you might expect. Between 8 am and 6 pm the ground shook
      4.2 times the quiet level, against 5.6 and 4.5 times on the Mondays before and after it.
      Its morning was as busy as a usual Monday morning; only its afternoon was quiet, like a
      weekend. The Friday afternoon before it was busier than usual, and the Saturday morning
      before it was the loudest of the three months. One idea: Heber Valley is a place people
      from the cities go for the holiday weekend, so visitors' traffic may make up for the
      closed workplaces. How could you test that? (Traffic counts on the highways would help.)
    - **TMU and the quietest places:** closest at about 0.65 Hz, between the ocean hum and the
      people noise: 11 dB above the low-noise model, about 3.6 times bigger shaking.
    - **Halving the noise again:** 4 times as many, 576 explosions: more than 40 years' worth
      at the average since 2015, about 13 a year.
    - **The morning rise:** at about 7:00 am Utah time before November 1 (13:02 UTC, MDT) and
      about 6:50 am after it (13:48 UTC, MST): people kept their clock time, within a quarter
      of an hour.

Using these records in your own work? [Credit the data](stations.md#how-to-credit-the-data).
