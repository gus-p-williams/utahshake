# Frequencies, fading and sound

**Used in:** [Quake Explorer](../apps/quake-explorer.md)

A seismogram is a mix of notes, like a chord on a piano. Some notes are low (slow wiggles,
a few per second), some are high (fast wiggles, tens per second). This page explains how to
pull the notes apart, why the high notes die away first as waves travel, why all waves get
weaker with distance, and how to turn a quake into sound you can hear.

It builds on [Filters and spectrograms](seismograms.md#filters-and-spectrograms), which
introduces frequency (in hertz, Hz: wiggles per second), \(v = f\lambda\), band-pass filters,
the 50 Hz limit of a 100 samples/s record and the spectrogram itself.

!!! tip "In a hurry?"
    For investigation B in [Quake Explorer](../apps/quake-explorer.md) you need the first
    three sections (notes, spectrograms, why high notes fade) and
    [Listening to a quake](#listening-to-a-quake).

## Any wiggle is a sum of sine waves

A **sine wave** is the simplest wiggle there is: smooth, and repeating forever. Two numbers
describe it: its **frequency** (how many cycles each second) and its **size** (how far it
swings). In 1807 the French mathematician Joseph Fourier claimed something surprising: *any*
wiggle can be built by adding up sine waves of different frequencies and sizes
([MacTutor](https://mathshistory.st-andrews.ac.uk/Biographies/Fourier/)). A seismogram is
no exception.

Each sine wave in the mix is one **note**. The list of notes and how big each one is is
called the **spectrum**. Going from a wiggle to its spectrum is what a computer recipe called
the **FFT** (fast Fourier transform) does. Quake Explorer uses its own small FFT, the same one
that runs the animation below.

<iframe src="../../app/build-a-wiggle/?embed=1" title="Build a Wiggle animation: three sine waves set with sliders for frequency and size are drawn as thin colored lines, their sum as a bold line, and below it the spectrum of the sum shows one bar at each wave's frequency, as tall as its size. Options add noise or keep only 1 to 10 Hz." loading="lazy" style="width:100%;height:660px;border:1px solid var(--md-default-fg-color--lightest);border-radius:8px"></iframe>

*A cartoon; the waves are made up.* Move the sliders and watch the bold line and the bars.
[Open the animation full screen](../app/build-a-wiggle/index.html).

!!! question "Predict first"
    1. Press **Two notes**. If you set wave 2's size to 0, what will happen to the bold
       line? To the spectrum?
    2. Press **Beats**: two notes of the same size, at 5 and 5.5 Hz. The bold line grows and
       shrinks. How many bars will the spectrum show, and where?

    Then try it. Were you right?

Things to notice:

- **The spectrum finds every wave again**, at its own frequency, and each bar is as tall as
  that wave's size. That is how a spectrum "hears" the notes in a mix.
- **A wiggle that comes and goes can be made of steady notes.** Two close notes drift in and
  out of step: where their peaks line up they add, where a peak meets a trough they cancel.
  The spectrum shows that nothing really starts or stops.
- **Noise is a tiny bit of every note.** Tick **Add noise**: hundreds of very small bars
  appear along the bottom. Each one is small, but together they make a ragged wiggle.
- **A filter keeps some notes and throws the rest away.** Press **Ocean hum + quake**, then
  tick the filter. The big slow wave is gone and the quake's notes stay. A band-pass filter
  does exactly this to a seismogram.

**Why does it work?** To find how much of, say, 8 Hz is in a wiggle, the FFT multiplies the
wiggle by a test sine wave of 8 Hz and adds up the results. If the wiggle has an 8 Hz note,
it rises and falls in step with the test wave, so the products are mostly positive and the sum
grows. Notes at other frequencies drift in and out of step with the test wave, so their
products cancel out. The FFT does this for every frequency at once, in a clever, fast way.

## How a spectrogram is made

A spectrum of a whole record tells you **which** notes are in it, but not **when**. In a quake
record the notes change: the P wave and the S wave sound different. A **spectrogram** keeps the
time by cutting the record into short pieces:

1. Cut the record into short, overlapping **windows**. Quake Explorer uses windows of
   2.56 s (256 samples), with a new one every 0.64 s.
2. Find the **spectrum** of each window. Each window's ends are faded to zero first, so the
   sudden cut does not sound like extra notes.
3. **Color each spectrum in** and stand them side by side, one column per window. Time runs
   across and frequency runs up.

<figure markdown="span">
  ![Three panels about one seismogram. Step 1: the record of station MTPU from 4 seconds before to 30 seconds after the quake, flat until a blue P line at 5 seconds, then bigger waves after a red S line at 9 seconds. Three gray shaded windows, each 2.56 seconds wide, are labeled 1 before P: noise, 2 P, and 3 S. Step 2: each window's spectrum drawn as horizontal bars with frequency going up from 0 to 25 Hz; window 1 has only tiny dark bars near the bottom; window 2 has long bars at all frequencies, longest and yellow near 10 to 13 Hz; window 3 has long bars, longest and yellow near 2 to 5 Hz. Step 3: the spectrogram, time across and frequency up to 25 Hz, dark purple before P, then green and yellow after P; the three windows are outlined as narrow white columns labeled 1, 2 and 3. An arrow notes that the color starts before the P pick. A color bar runs from weak (dark purple) to strong (yellow).](img/freq-spectrogram-steps.svg){ loading=lazy }
  <figcaption>Figure 1. How a spectrogram is made, with the vertical record of station MTPU,
  29 km from the magnitude 3.3 quake near Junction (2026). The strongest note in the P
  window is about 12 Hz; in the S window, about 2 Hz: here P is higher-pitched than S. P and
  S picks by University of Utah analysts. Data: University of Utah Seismograph Stations
  (network UU, doi:10.7914/SN/UU) via EarthScope; quake and picks from USGS
  ComCat.</figcaption>
</figure>

**The trade-off: sharp in time or sharp in pitch.** To tell two notes apart, you have to
listen long enough for one of them to get a whole cycle ahead of the other. In a window of
length \(T\), that takes notes at least

$$
\Delta f = \frac{1}{T}
$$

apart. With 2.56 s windows, the frequency steps are 1/2.56 = 0.39 Hz. Longer windows give
finer steps but blur the time; shorter windows sharpen the time but blur the pitch. You can't
have both.

Each column is drawn at the center of its window, but it contains everything from 1.28 s
before that moment to 1.28 s after it. So a column centered up to 1.3 s **before** P already
holds a little of P, and the color starts a moment before the wave really arrives (Figure 1).
Pick arrival times on the record, not on the spectrogram.

For a distant quake, Quake Explorer uses much longer windows (51.2 s): its surface waves are
so slow (20 s or more per cycle) that a 2.56 s window would hold only a small part of one
cycle.

## Why high notes fade first

When a wave passes, the rock squeezes and shears back and forth. Grains rub against each
other and the water in tiny cracks is pushed around, so in every cycle a small part of the
wave's energy turns into heat. Seismologists describe this with a number called \(Q\) (the
"quality factor"): in each cycle a wave loses a fraction \(2\pi / Q\) of its energy. Big \(Q\)
means little loss.

The key idea: **the loss happens per cycle, not per kilometer.** On the same trip, a 10 Hz
wave goes through 10 times as many cycles as a 1 Hz wave, so it pays the toll 10 times more
often. After a travel time \(t\), a wave of frequency \(f\) is left with

$$
A = A_0 \, e^{-\pi f t / Q}
$$

of its starting size \(A_0\). The product \(f \cdot t\) is just the number of cycles on the
way.

Under the Basin and Range, which covers western Utah, USGS seismologists measured \(Q \approx 235\) for
1 Hz waves and \(Q \approx 235 \, f^{0.56}\) for 1–5 Hz waves. Under the central United
States, \(Q\) is about 1,300 ([Benz, Frankel and Boore,
1997](https://www.usgs.gov/publications/regional-lg-attenuation-continental-united-states)).
Old, cold rock loses much less, which is why quakes in the East are
[felt over much larger areas](https://www.usgs.gov/news/east-vs-west-coast-earthquakes) than
quakes of the same size in the West. With \(Q = 235\), each cycle loses about 2.7% of its
energy: tiny, but a wave goes through hundreds of cycles on its way.

!!! example "Worked example: 30 seconds through Utah's crust"
    S waves travel about 3.5 km/s, so 30 s of travel is about 105 km.

    - **1 Hz:** 1 × 30 = 30 cycles. \(Q = 235\).
      \(A / A_0 = e^{-\pi \times 30 / 235} = e^{-0.40} \approx\) **0.67**: it keeps 67% of its
      size.
    - **5 Hz:** 5 × 30 = 150 cycles. \(Q = 235 \times 5^{0.56} \approx 580\).
      \(A / A_0 = e^{-\pi \times 150 / 580} = e^{-0.81} \approx\) **0.44**: it keeps 44%.
    - The higher note has a higher \(Q\), but \(Q\) grows more slowly than the number of
      cycles, so the high note still loses more. (With the same \(Q = 235\) for both, the
      5 Hz wave would keep only 13%.)

    The **Far quake** example in Build a Wiggle uses this rule: 2, 6 and 14 Hz notes after
    60 s of travel keep about 34%, 17% and 8% of their size.

Real data shows it. Figure 2 compares the spectra recorded by the nearest and the farthest
station from the Junction quake, each divided by its own low notes so that both start at the
same height. Quake Explorer measures **high/low**: the average strength of the high notes
(8–20 Hz) divided by that of the low notes (1–5 Hz), over the whole quake: from just before P
to 15 seconds after S.

<figure markdown="span">
  ![Top: two spectra on log scales, frequency from 1 to 20 Hz across and strength down to 0.01, each scaled so its low notes (1 to 5 Hz, shaded) average 1. The blue curve, MTPU 29 km away, stays near 0.2 to 0.4 through the high notes (8 to 20 Hz, shaded) and falls to about 0.06 at 20 Hz; high/low = 0.22. The orange curve, BGU 299 km away, follows it up to about 8 Hz and then falls much faster, to about 0.01 at 20 Hz; high/low = 0.08. Bottom: the high/low ratio, on a log scale from 0.01 to 3, against distance from 0 to 300 km for all 24 stations. Near the quake the ratios are about 0.15 to 0.3; beyond 200 km they are about 0.02 to 0.08. MTPU (blue) and BGU (orange) are highlighted; FOR1, SZCU and SUU stand well above the others, SUU at about 2.](img/freq-near-far.svg){ loading=lazy }
  <figcaption>Figure 2. High notes fade first: the Junction quake (magnitude 3.3, 2026) at its
  nearest and farthest stations (top) and at all 24 (bottom). Vertical sensors, filtered
  1–20 Hz, from 0.5 s before P to 15 s after S. P and S times: University of Utah analysts'
  picks where they made one, otherwise Quake Explorer's computer picks (or, for S, the time
  expected at 3.45 km/s). Data: University of Utah
  Seismograph Stations (network UU, doi:10.7914/SN/UU) via EarthScope; quake and picks from
  USGS ComCat.</figcaption>
</figure>

- Near the quake (MTPU, 29 km) the high notes are about a fifth as strong as the low ones
  (0.22). At 299 km (BGU) they are less than a tenth (0.08).
- Over all 24 stations the ratio falls by more than half every 100 km: the two stations
  within 50 km have a median of 0.25, the eight beyond 200 km a median of 0.04.
- Some stations (FOR1, SZCU, SUU) keep far more high notes than their neighbors. The ground
  right under a station changes the notes too: hard rock passes high notes better than soft
  sediment. So compare stations with care, or better, compare the same station for two
  quakes, as in [Quake or blast](#quake-or-blast-a-closer-look) below.

This is why the distant quakes in [Other quakes](seismograms.md#other-quakes) almost vanish
when they are filtered 1–10 Hz: by the time they reach Utah, their high notes are gone.

## Why waves get weaker with distance

Two things weaken a wave as it travels.

**1. Spreading.** The wave's energy is shared over a bigger and bigger front.

- A **body wave** (P or S) spreads over a growing sphere. A sphere's area grows as \(r^2\),
  so the energy on each square meter falls as \(1/r^2\). A wave's energy goes as its size
  squared, so its size falls as \(1/r\).
- A **surface wave** stays near the surface and spreads over a growing ring. A ring's length
  grows only as \(r\), so the size falls as \(1/\sqrt{r}\). That is why far from a big quake,
  the surface waves are the biggest waves.

**2. Loss.** The energy turned into heat, from the section above, plus waves scattered
sideways by cracks and layers (they arrive later, in the coda).

Figure 3 shows how fast the ground moved at each station during the Junction quake. To get
real speeds, each station's counts are divided by its sensitivity: how many counts one meter
per second of ground speed makes (see
[What the instrument records](seismograms.md#what-the-instrument-records)).

<figure markdown="span">
  ![Log-log graph of peak ground speed, from 0.3 to 300 micrometers per second, against distance from 20 to 400 km, for 24 stations. The dots fall from about 40 to 130 micrometers per second at 29 to 38 km (MTPU, TCRU) to about 0.5 to 2.5 at 250 to 300 km. A red line through them falls as distance to the power minus 1.7. Two gray dashed lines start from the red line at 30 km and fall much more gently: spreading alone for body waves (1 over r) and for surface waves (1 over the square root of r). Open circles mark older sensors whose numbers are given in meters and converted roughly. The school stand-ins are labeled: WCU, SGU, TMU, ELU and SUU.](img/freq-distance.svg){ loading=lazy }
  <figcaption>Figure 3. Peak ground speed at 24 stations for the Junction quake (magnitude
  3.3, 2026): vertical sensors, filtered 1–10 Hz, converted from counts to meters per second
  with each station's sensitivity. Data: University of Utah Seismograph Stations (network UU,
  doi:10.7914/SN/UU) via EarthScope, including the station sensitivities; quake from USGS
  ComCat.</figcaption>
</figure>

- The peaks fall as **distance\(^{-1.7}\)**: twice as far, about 0.3 times the shaking. From
  30 km to 300 km the shaking drops about 50 times.
- Spreading alone would give \(1/r\) or gentler. The real fall is steeper because of the loss.
- Stations at the same distance still differ by about 2 times either way. A quake shakes
  harder in some directions than others, and the ground under each station matters (TCRU,
  38 km away, moved 3 times faster than MTPU at 29 km).

**Messy data: the 2020 Magna quake.** Magna's magnitude 5.7 quake shook the ground so hard
that 10 of 31 stations in Quake Explorer's sample clipped: 9 older 16-bit stations hit their
limit (about ±32,768 counts), and NOQ hit the limit of its 24-bit recorder. Others are off by up to
100 times. A clipped station looks too quiet, so its "true" size is wrong (see
[Instrument problems](seismograms.md#instrument-problems)). That is why Quake Explorer uses
the Junction quake for true ground speed.

!!! note "Going further: how big was it?"
    If you know how fast shaking fades with distance, you can correct each station's peak for
    its distance and compare one quake with another. That is the idea behind **magnitude**.
    Seismologists do exactly this to work out a quake's magnitude.

## Listening to a quake

Young people hear sounds from about 20 Hz to about 20,000 Hz (20 kHz); the top falls with
age, to about 15–17 kHz for many adults
([Purves et al., *Neuroscience*](https://www.ncbi.nlm.nih.gov/books/NBK10924/)). A nearby
quake's notes are 1–20 Hz, and a distant quake's are far lower: almost all of them are below
the bottom of hearing.

The trick is speed. Play the record \(k\) times faster and every wiggle takes \(1/k\) of the
time, so **every frequency is multiplied by \(k\)**. Nothing else changes: the record is the
same, it is just played back at \(100 \times k\) samples per second instead of 100.

| Speed-up | A 1 Hz ground wave sounds at | Ground notes you can hear | The 50 Hz limit sounds at | 2 minutes of record last |
| --- | --- | --- | --- | --- |
| 50× | 50 Hz | 0.4–50 Hz | 2,500 Hz | 2.4 s |
| 100× | 100 Hz | 0.2–50 Hz | 5,000 Hz | 1.2 s |
| 200× | 200 Hz | 0.1–50 Hz | 10,000 Hz | 0.6 s |
| 400× | 400 Hz | 0.05–50 Hz | 20,000 Hz | 0.3 s |

At 400×, the highest note a 100 samples/s record can hold (50 Hz, its
[Nyquist frequency](seismograms.md#filters-and-spectrograms)) lands at 20,000 Hz, the top of
human hearing. Faster than that, the record's top notes would be too high to hear.

- **A distant quake sounds like a low rumble.** Its high notes faded on the long trip, and
  big quakes make more low notes to start with. A 20-second surface wave (0.05 Hz) needs a
  400× speed-up just to reach 20 Hz, the bottom of hearing.
- **The surface waves of a distant quake rise in pitch.** How deep a surface wave shakes the
  rock grows with its wavelength. Long waves reach deeper into the Earth, where the rock
  is faster, so they travel faster and arrive first. Shorter waves follow. At the station the
  notes arrive low first, then higher: a rising "whoop".
- **A near quake sounds short and sharp.** It lasts only a minute or so, and it still has its
  high notes: at 100×, two minutes of the Junction quake at MTPU are over in 1.2 s.

## Quake or blast: a closer look

[Blasts and mines](seismograms.md#blasts-and-mines) lists the clues seismologists use: time
of day, place, depth and the shape of the record. The notes give two more clues. Here are the
same two events as there: a quarry blast near Leamington (magnitude 2.1, a Monday at
5:33 pm) and an earthquake 13 km away (magnitude 2.1, a Friday at 8:30 pm).

Why might they differ?

- **P against S.** An explosion pushes outward in every direction: mostly squeezing, which
  makes P waves. A quake is a sudden slip along a fault: mostly shearing, which makes S waves.
  So a blast tends to have a strong P and a weak S.
- **High notes.** A quarry blast is set off at the surface, where the rock is broken and loses
  high notes quickly, and it is a row of charges fired one after another, which spreads the
  blast out in time. Both can take away high notes.

<figure markdown="span">
  ![Two records from station SUU, filtered 1 to 20 Hz, each about 40 seconds long. Top: the quarry blast, 53 km away; P at 10 seconds is followed by strong shaking that peaks within about 3 seconds, and the shaking is already weaker in the shaded S window, which starts at the time S is expected (17 seconds); P/S 2.44, high/low 1.89. Bottom: the earthquake, 46 km away; small waves after P at 8 seconds, then the biggest waves in the shaded S window from 14 seconds; P/S 0.66, high/low 3.04.](img/freq-blast-quake.svg){ loading=lazy }
  <figcaption>Figure 4. The Leamington quarry blast (2026) and an earthquake of the same
  size 13 km from it (2025), at station SUU (the stand-in for Juab High School). P/S: the
  biggest wiggle in the 2 s after P divided by the biggest in the 4 s after S; S is shaded
  where it is expected (P at 6.1 km/s, S at 3.45 km/s), because the analysts picked no S
  here. P picks by University of Utah analysts. Data: University of Utah Seismograph Stations
  (network UU, doi:10.7914/SN/UU) via EarthScope; events from USGS ComCat.</figcaption>
</figure>

At SUU the blast's P is 2.44 times its S; the quake's P is only 0.66 times its S. The blast
also has fewer high notes: high/low 1.89 against 3.04. (SUU hears more high notes than low
ones from both events, and from the Junction quake too: that is probably the station's own
ground. What counts is the comparison.)

When we checked 13 stations that recorded both events, the blast had fewer high notes at all
13 (median high/low 0.27 against 0.61), and a larger P/S at 9 of the 13. A second quake in the
area (magnitude 1.9, about 15 km from the blast) agreed.

That is **evidence, not proof.** It is one blast and two quakes, and some quakes look like
blasts and the other way round. Seismologists put several clues together before they call an
event a blast.

## Try it

1. In Build a Wiggle, press **Beats**. How many seconds are there between the loud parts? Now
   move wave 2 from 5.5 Hz to 6 Hz. What happens to the time between the loud parts? Can you
   find the rule?
2. Set waves 1 and 2 to the same frequency, 3 Hz, each with size 0.5, and wave 3's size to 0.
   What does the spectrum show? Why?
3. In the worked example, how much of a 10 Hz wave is left after the same 30 s, if the rule
   \(Q = 235 \, f^{0.56}\) still holds at 10 Hz?
4. The Junction quake's peaks fall as distance\(^{-1.7}\). How many times weaker is the
   shaking at 200 km than at 50 km?
5. In [Quake Explorer](../apps/quake-explorer.md), load the Junction quake and play the
   nearest and the farthest station at 100×. Which one sounds lower? Explain why, using this
   page.
6. At what speed-up does a 0.5 Hz wave sound at 200 Hz? At 50×, could you hear the 0.2 Hz
   ocean hum?
7. The blast was 53 km from SUU and the quake 46 km. Could the extra 7 km explain why the
   blast has fewer high notes? Use Figure 2: the high/low ratio falls by a little more than
   half every 100 km.
8. FOR1, SZCU and SUU have more high notes than other stations at the same distance. How
   could you test whether that is caused by the ground under the station rather than by the
   quake?

Using these records in your own work? [Credit the data](stations.md#how-to-credit-the-data).
