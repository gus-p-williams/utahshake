# Quake Explorer

Measure the Earth with one quake: how fast its rocks carry waves, what notes it plays, which
way it shakes the ground, and what a quake on the far side of the world can tell you.

[Open Quake Explorer](../app/quake-explorer/index.html){ .md-button .md-button--primary }

!!! abstract "At a glance"
    - **You will:** measure the speed of P and S waves from many stations at once, find the
      notes in the shaking and listen to them, work out which way the ground moved and where
      the quake was from a single station, and read the waves of a big quake thousands of
      kilometres away.
    - **Time:** each of the four investigations takes about 15 minutes as a class demo, or a
      full class period (45–55 minutes) in pairs.
    - **Works on:** any browser, including Chromebooks. No install, no accounts.
    - **The science:** [Travel times and Earth's layers](../theory/travel-times.md) · [Frequencies, fading and sound](../theory/frequencies.md) · [Which way the ground moves](../theory/ground-motion.md) · [Reading a seismogram](../theory/seismograms.md) · [Seismic waves](../theory/waves.md)
    - **For teachers:** [How fast is the rock?](../teachers/how-fast-is-the-rock.md) · [What notes is the ground playing?](../teachers/notes-of-a-quake.md) · [Which way did the ground move?](../teachers/which-way-did-it-move.md) · [A message from far away](../teachers/far-side-of-the-world.md) · [Standards](../teachers/standards.md#quake-explorer)
    - **Data:** [Our stations and data](../theory/stations.md)
    - **For developers:** [Quake Explorer notes](../developers/quake-explorer.md)

In [Wave Race](wave-race.md) you were *given* two numbers: P waves travel 5.8 km/s and S waves
3.3 km/s. Where do numbers like that come from? In Quake Explorer you measure them yourself,
and more: how thick the crust under Utah is, why far-away quakes sound like a low rumble,
which way the ground moved, and how long a wave takes to cross the planet. Every answer
comes from real seismograms, and you can check it against the professionals'.

!!! info "Whose stations?"
    Until the Raspberry Shakes at the UHSN schools stream their data, a University of Utah
    station near each school **stands in** for it. Their names carry the school, for example
    "TMU (Wasatch Academy)", and they are drawn in orange in the record section.
    [Our stations and data](../theory/stations.md) lists the stand-in for each school.

!!! tip "Do Wave Race first"
    Quake Explorer builds on [Wave Race](wave-race.md): picking P and S, and turning the time
    between them into a distance. If P and S waves are new to you, start there.

## How every investigation works

Each investigation has a panel beside it (below it on a phone) with the same four steps:

1. **Predict first.** Choose an answer *before* you look. The **Check** button stays off until
   you do. A wrong prediction is not a failure: it is what makes the "why" interesting.
2. **Explore.** Do the measurement. Your numbers appear under the instructions as you go.
3. **Why?** The science in a few sentences, with a link to the full science page.
4. **Check.** Reveal the professionals' answer and see how close you got.

Your predictions stay in the browser on your own device; nothing is sent anywhere.

## Choose a quake

Start with one of the quakes under **Start here**, or choose from the two lists:

- **Utah quakes and blasts** (magnitude 2.5 and up, last 12 months) work in investigations
  A, B and C. Quarry and mine blasts are marked in orange.
- **Big quakes far away** (magnitude 6.5 and up, last 2 years) work in B, C and D.

<figure markdown="span">
  ![The Quake Explorer chooser. Under Start here, six buttons: 2026 Junction quake (M3.3), the worked example; 2020 Magna earthquake (M5.7), look for the bend at 150 km; a 2026 quarry blast near Leamington and a 2025 earthquake near Leamington, each to compare with the other; a 2026 quake recorded at Wasatch Academy, which way did it come from; and the 2025 Sand Point, Alaska earthquake (M7.3). Below, two tables: Utah quakes and blasts, with date, time, magnitude and what it was, and Big quakes far away, with date, magnitude, where and distance in degrees.](img/qe-choose.png){ loading=lazy }
  <figcaption>Figure 1. Choosing a quake (here with the offline samples). The Start here
  quakes each suit one investigation best; their notes say which.</figcaption>
</figure>

After you load a quake, the four investigation tabs appear. A tab is greyed out when the
quake doesn't suit it: a record section (A) needs a quake near Utah, and D needs one far away.

## A. How fast is the rock? { #a }

The **record section** shows one station per line, each placed at its distance from the
quake: the nearest at the top, the farthest at the bottom. Time runs across, in seconds after
the quake. Every station is a stopwatch at a known distance, so a wave that travels at a
steady speed makes its arrivals line up. The steeper the line, the faster the wave.

<figure markdown="span">
  ![The record section for the 2020 Magna earthquake after Reveal: about 30 seismograms stacked from 12 km at the top to 397 km at the bottom, time from minus 10 to 90 seconds across. Blue circles (analyst P picks) and blue squares (computer picks) line up along a blue line labelled Pg that slopes down to the right, then, beyond about 150 km, along a steeper green line labelled Pn. Red circles and squares follow a less steep red S line. School stand-in stations are drawn in orange; clipped stations are marked clipped. The panel on the right shows the four steps and the answer: P 6.07 km/s, S 3.64 km/s, and, past 143 km, a faster 7.67 km/s line giving a crust about 36 km thick.](img/qe-a-record-section.png){ loading=lazy }
  <figcaption>Figure 2. The record section for the 2020 Magna earthquake after <b>Reveal the
  professionals' picks</b>. Past about 150 km the first arrivals follow a faster line (Pn):
  waves that raced along the top of the mantle.</figcaption>
</figure>

1. Press **P ruler**. A blue ruler appears. Drag its ends onto the first small wiggles (P) at a
   near and a far station. The ruler shows its speed in km/s.
2. Press **S ruler** and lay it along the start of the big S waves.
3. Read your speeds, and P ÷ S, in the panel.
4. Press **Reveal the professionals' picks**. Circles are picks by University of Utah analysts;
   squares are picks the computer made where the analysts made none. Lines through them give
   the professionals' speeds. How close were your rulers?

| To do this | Do this |
| --- | --- |
| Move a ruler | Drag one of its ends, or the middle to move the whole ruler |
| Zoom in time | Scroll, or **＋** and **－**; **Whole record** zooms back out |
| Move along in time | Drag an empty part of the record section |
| Use a station in B and C | Click its record |
| See how much the ground really moved | **Wiggles: true ground speed** (only for quakes whose records are all on scale) |
| Make an 8 km/s wave run straight down | Tick **Reduced time (advanced)** |

**The bend.** For the Magna quake, look past about 150 km. The first arrivals leave the P line
and follow a faster one, about 7.7 km/s. Those waves went down to the top of the mantle (the
**Moho**), raced along it in faster rock and came back up. Where the two lines cross tells you
how thick the crust is: about 36 km here. [Travel times and Earth's layers](../theory/travel-times.md)
explains how.

**Each trace stretched to fit, or true ground speed?** Normally every trace is stretched to the
same height, so far, weak stations are easy to see. With **true ground speed**, every trace is
drawn on one scale in metres per second, and you see how fast the waves fade with distance.
Some quakes overloaded a few sensors ("clipped"); their true size is unknown, so the true view
is turned off for them.

## B. What notes is the ground playing? { #b }

One station's record (top) sits above its **spectrogram** (bottom): time across, frequency
(pitch) up, colour for how strong the shaking is. [Reading a seismogram](../theory/seismograms.md#filters-and-spectrograms)
introduces spectrograms.

<figure markdown="span">
  ![Investigation B for the Junction quake at station MTPU, 29 km away. Top: the seismogram filtered 1 to 10 Hz, flat until P at 5 seconds, then a burst that fades by 40 seconds. Below: the spectrogram, dark before 5 seconds, then green and yellow from about 1 to 20 Hz. A bright band from 1 to 10 Hz is marked by two lines; outside it the picture is dimmed. The panel lists Band 1.0 to 10 Hz, how many times the quake is stronger than the noise in that band, and what a 1 Hz wave sounds like at 100 times speed.](img/qe-b-spectrogram.png){ loading=lazy }
  <figcaption>Figure 3. The Junction quake at station MTPU, 29 km away. The band marked on the
  spectrogram is the filter: the record above keeps only those notes.</figcaption>
</figure>

- **Choose the notes.** Drag up or down on the spectrogram to mark a band. The record above
  keeps only those frequencies, and the panel says how many times stronger the quake is than
  the background noise in that band. Find the band where it stands out most.
- **Listen.** Choose a **Speed-up** and press **▶ Listen**. The part of the record on screen
  plays sped up, so its notes become high enough to hear; a cursor moves across the
  spectrogram. Headphones help in class.
- **Near and far.** Press **Nearest** and **Farthest** to switch stations. Where are the high
  notes?
- **Check.** **Compare the nearest and farthest stations** measures "high notes ÷ low notes" at
  both.

**Quake or blast?** Load the 2026 quarry blast near Leamington, or the 2025 earthquake 13 km
from it. They are the same size. After the check, the panel compares both at the same station
(SUU, the stand-in for Juab High School): how many high notes, and how strong P is compared
with S. **Open the … in B** switches to the other one.

## C. Which way did the ground move? { #c }

A three-part station has three sensors at right angles: up (Z), north (N) and east (E).
Together they record the path the ground traced. Investigation C draws that path **seen from
above** (like a map) and **seen from the side**.

<figure markdown="span">
  ![Investigation C for the quake recorded at Wasatch Academy's stand-in TMU, 68 km away, after both reveals. Top: three traces, Z, N and E, with a blue band marking the first half second of P. Middle: the path seen from above, a straight line from north-east to south-west, with a purple dashed arrow (computer, 44 degrees) and an orange arrow (true direction, 47 degrees) pointing north-east; the path seen from the side; and a panel giving the directions, the errors and two trust bars, both green. Bottom: a map of central Utah with the station, the direction lines, a grey circle for the S minus P distance and the official epicenter on it.](img/qe-c-motion.png){ loading=lazy }
  <figcaption>Figure 4. The quake recorded at TMU (the stand-in for Wasatch Academy). In the
  first half second of P the ground moved back and forth along one line, pointing at the
  quake: the computer's direction (purple) is 3° from the true one (orange).</figcaption>
</figure>

1. The blue band on the record marks the first moment of the P wave. Press **▶ Trace the
   path** to watch the ground's path being drawn.
2. **Aim your guess:** drag on **Seen from above** toward where you think the quake is.
3. Press **Lock my guess and show the computer's direction**. The computer finds the line the
   ground moved along and uses "up goes with away" to pick its end.
4. Press **Show the true direction**. The map then shows the epicenter, and the panel shows
   how one station alone can locate the quake: its direction from the P motion, its distance
   from S − P, as in Wave Race.
5. Press **S window**, then **Turn to Z R T**: R is along the path to the quake, T is sideways.
   Which one carries the S wave?

The **trust bars** say how clear the motion is in your window: a clean line, and a clear "up
goes with away". Stations within about 100 km of the quake work best. Expect the computer to
be within about 15° for a clear P wave; sometimes it points the wrong way.

## D. A message from far away { #d }

Choose a big quake from **Big quakes far away**, or the 2025 Sand Point, Alaska earthquake
(M7.3) under **Start here**. You see half an hour of shaking at a station near the schools:
three sensors, the spectrogram, and a **travel-time chart** from a model of the whole Earth.

<figure markdown="span">
  ![Investigation D for the 2025 Sand Point, Alaska earthquake at station SGU, Gunnison Valley's stand-in, 3,985 km away. Top: half an hour of three traces; small fast wiggles start near 7 minutes, a second change near 12 minutes, and big slow waves from about 16 to 22 minutes. Middle: the spectrogram on a log frequency scale, strongest near 0.05 Hz. Bottom: the travel-time chart, minutes after the quake against distance in degrees, with a blue P curve and a red S curve from the Earth model, the core shadow shaded beyond 103 degrees, the student's P and S picks as diamonds and a dashed line at the real distance of 35.8 degrees.](img/qe-d-distant.png){ loading=lazy }
  <figcaption>Figure 5. The 2025 Sand Point, Alaska earthquake at station SGU (the stand-in for
  Gunnison Valley), after picking P and S and the reveal.</figcaption>
</figure>

1. Press **Pick P** and click where the first small wiggles start. Zoom in with the scroll wheel.
2. Press **Pick S** and click the start of the second, bigger change. It is easiest to see on
   the north and east sensors: far away, S arrives from almost straight below, so it shakes
   the ground sideways.
3. The panel turns your S − P time into a distance, using the Earth model.
4. Press **Reveal the real distance and the model times**.
5. Find the biggest, slowest waves (choose **Notes: surface waves**). Then press **▶ Listen**.

## Your answers

**Download my answers (CSV)**, under the investigations, saves your predictions, rulers, bands,
directions and picks for the loaded quake as a spreadsheet file on your device. Nothing is
sent anywhere.

## If the school network blocks the data

If the quake lists don't load, press **Use the offline samples** (top right). Six quakes are
stored with the site, enough for all four investigations. Tell your teacher, too.

Teachers: see [Before class](../teachers/index.md#before-class).

## Going further

- In A, cover the far stations with your hand and measure P with only the near ones. Then
  only the far ones. Why do the answers differ?
- In B, find a band where the quake almost disappears. What is left in the record?
- In C, try every station in the menu. Which ones point closest to the quake, and why?
- In D, ask each group to pick a different big quake, then put everyone's S − P on one chart
  against the real distance.

---

*Data: waveforms from University of Utah Seismograph Stations (network UU,
[doi:10.7914/SN/UU](https://doi.org/10.7914/SN/UU)) via EarthScope; quake locations and
analyst picks from USGS ComCat / UUSS; travel times from the iasp91 Earth model. See
[Our stations and data](../theory/stations.md).*
