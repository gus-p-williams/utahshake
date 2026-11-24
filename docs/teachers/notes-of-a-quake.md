# Activity card: What notes is the ground playing?

Students follow [investigation B in the Quake Explorer guide](../apps/quake-explorer.md#b) (what
they see, step by step) and use [Quake Explorer](../app/quake-explorer/index.html?event=uu80162166&inv=B).

!!! abstract "At a glance"
    - **Driving question:** What notes (frequencies) does a quake play, and why does a faraway
      quake sound like a low rumble?
    - **Time:** 15 min (whole class, on the projector) or 45–55 min (pairs).
    - **Setup:** Browser only. Live records from University of Utah stations, or the offline
      samples if the school network blocks them.
    - **Apps and tools:** [Quake Explorer](../apps/quake-explorer.md), investigation B
      (spectrogram, filter and sound) · [Build a Wiggle](../app/build-a-wiggle/index.html) (the
      warm-up animation, also on [Frequencies, fading and sound](../theory/frequencies.md))
    - **Before this:** Nothing required. Students who have done [Quake Locator](wave-race-card.md)
      already know P and S.
    - **Materials:** Student devices with a browser (Chromebooks are fine), a projector with
      speakers, and headphones or earbuds for pairs if you can.
    - **Utah standards:** PHYS.4.1 · PHYS.2.1 · ESS.4.1 · CS&nbsp;9/10.DA.3
      ([crosswalk](standards.md#quake-explorer))

**Students will:** read a spectrogram (time across, frequency up, color for strength); choose a
band of frequencies as a filter and find where the quake stands out from the noise; turn
shaking into sound by speeding it up, and explain why that raises every note; compare the high
notes at a near and a far station and explain why high notes fade first; weigh the evidence in
"quarry blast or earthquake?".

**Quakes to load.** Each link opens investigation B:

| Quake | Use it for | Live data | Offline sample |
| --- | --- | --- | --- |
| 2026 Junction quake (M3.3) | Notes, sound, near and far (opens at MTPU, 29 km away) | [Open](../app/quake-explorer/index.html?event=uu80162166&inv=B) | [Open](../app/quake-explorer/index.html?event=uu80162166&inv=B&source=sample) |
| 2026 quarry blast near Leamington (M2.1) | Quake or blast? (opens at SUU, Juab's stand-in) | [Open](../app/quake-explorer/index.html?event=uu80161881&inv=B) | [Open](../app/quake-explorer/index.html?event=uu80161881&inv=B&source=sample) |
| 2025 earthquake near Leamington (M2.1) | The quake to compare with the blast | [Open](../app/quake-explorer/index.html?event=uu80120191&inv=B) | [Open](../app/quake-explorer/index.html?event=uu80120191&inv=B&source=sample) |
| 2025 Sand Point, Alaska earthquake (M7.3), optional | The notes of a quake 4,000 km away | [Open](../app/quake-explorer/index.html?event=us7000qd1y&inv=B) | [Open](../app/quake-explorer/index.html?event=us7000qd1y&inv=B&source=sample) |

No accounts or logins. Student names are never entered or stored.

!!! tip "Before class"
    Test the sound on the classroom speakers: open the Junction link and press **▶ Listen**
    (**Speed-up** 100×). Browsers play sound only after a click, so nothing plays by itself.
    If the data don't load, use the offline links (or **Use the offline samples**, top right in
    the app): the [answer key](#answer-key-offline-samples) below is for those. What to ask IT
    to allow, and how to send the whole class to the same quake, are under
    [Before class](index.md#before-class).

## 15-minute version (whole class, on the projector)

1. **Hook (2 min).** Open the Junction quake: station MTPU, 29 km from the quake. Press
   **▶ Listen**. "That was a minute of ground shaking, squeezed into less than a second. Why
   can't we hear the ground shake by itself?" (Most of its notes are below 20 Hz, the lowest
   note people can hear.)
2. **Read the spectrogram (3 min).** Time runs across, frequency (pitch) up, and color shows how
   strong each note is. The quake is the bright patch from P (5 s) onward, from about 1 Hz to
   well above 10 Hz. Drag up or down on the spectrogram to choose a band: the record above
   keeps only those notes. Watch **Quake ÷ noise in this band** in the panel.
3. **Predict (1 min).** "Which station hears more high notes (above 10 Hz) from this quake?"
   Take a vote and choose the answer under **1 · Predict first**.
4. **Near and far (5 min).** Press **Farthest** (BGU, 299 km) and listen; press **Nearest** and
   listen again. Compare the two spectrograms. Press **Compare the nearest and farthest
   stations**: high notes ÷ low notes is 0.22 at MTPU and 0.08 at BGU.
5. **Why (4 min).** Each time the rock squeezes back and forth, a little of the wave's energy
   turns into heat. On the same trip a 10 Hz wave goes back and forth ten times as often as a
   1 Hz wave, so it loses far more: the high notes fade first. And speeding the record up by
   100 makes every note 100 times higher, so a 1 Hz ground wave becomes a 100 Hz hum.

## Full-period version (45–55 min, pairs)

| Phase | Time | What happens |
| --- | --- | --- |
| Engage | 5 min | [Build a Wiggle](../app/build-a-wiggle/index.html): add two or three waves with the **Frequency** and **Size** sliders. The bold sum looks messy, but the spectrum below finds each wave again. "A seismogram is a mix of notes too. Which notes does a quake play?" Then play the Junction quake at MTPU once. |
| Explore | 15 min | Pairs, with headphones, on the Junction quake. (1) At a far station such as TMU (Wasatch Academy) or BGU, drag bands on the spectrogram and find the one where **Quake ÷ noise in this band** is largest. (2) Listen at each **Speed-up** (50×, 100×, 200×, 400×) and record the two sound readouts: what 1 Hz sounds like, and what the sensor's top note becomes. (3) Choose the prediction, then use **Nearest**, **Farthest** and **Compare the nearest and farthest stations**. |
| Explain | 10 min | Discuss with [Frequencies, fading and sound](../theory/frequencies.md). Speeding a record up by k multiplies every frequency by k. At 400× the sensor's top note (50 Hz, half its 100 samples per second) becomes 20,000 Hz, the top of human hearing: a sensor cannot record notes higher than half its sampling rate. High notes fade first because each back-and-forth turns a little energy into heat, and high notes make more of them on the same trip (PHYS.2.1). All notes also weaken as the wave's energy spreads over a bigger and bigger area. |
| Elaborate | 10–15 min | **Quake or blast?** Open the Leamington quarry blast (station SUU). Choose a prediction and press **Compare the nearest and farthest stations**. Under the result, a "Quake or blast?" box compares the blast with an earthquake of the same size 13 km away, at the same station: high ÷ low notes, and P ÷ S. Press **Open the earthquake in B** and listen to both. Add the clues the catalog gives: the time (blast 5:33 pm on a Monday; quake 8:30 pm on a Friday) and the depth (blast at the surface; quake 2.6 km down). Is it proof? Pairs switch **Station** and press the button again to compare at another station. |
| Evaluate | 5 min | Exit ticket (below). Optional: **Download my answers (CSV)**. |

## Exit ticket

1. A seismogram is played 200 times faster than real time. What does a 2 Hz ground wave sound
   like?
2. The same quake is recorded 30 km and 300 km away. Which record has more high notes, and why?
3. On a spectrogram, what do the across direction, the up direction and the color show?
4. A small event at a quarry, at 2 pm on a Tuesday, has few high notes and a strong P. Was it a
   blast?

**Answers:** (1) 400 Hz. (2) The one 30 km away. Each back-and-forth turns a little of the
wave's energy into heat; high notes make many more back-and-forths over the same distance, so
they fade first, and by 300 km mostly low notes are left. (3) Time; frequency (pitch); how
strong the shaking is at that time and frequency. (4) Probably, but that is evidence, not
proof: each clue can be wrong on its own, and small quakes happen at any hour. Seismologists
combine the place, the time, the depth and the shape of the waves.

## Answer key: offline samples

### Junction quake (M3.3): near and far

The quake is described in the [How fast is the rock? answer key](how-fast-is-the-rock.md#answer-key-offline-samples).
The **Station** menu lists 24 stations, from MTPU (29 km, the **Nearest**) to BGU (299 km, the
**Farthest**). **Compare the nearest and farthest stations** measures high notes ÷ low notes
(8–20 Hz ÷ 1–5 Hz) over the whole quake, from P to just after S:

| Station | Distance | High ÷ low notes |
| --- | --- | --- |
| MTPU (Nearest) | 29 km | **0.22** |
| SGU (Gunnison Valley stand-in) | 114 km | 0.13 |
| LIUT | 212 km | 0.055 |
| BGU (Farthest) | 299 km | **0.08** |

The button compares only MTPU and BGU; the panel says "The nearer station kept more high
notes." SGU and LIUT, measured the same way, show the steady fall in between.

**Quake ÷ noise in this band** (rough values; they depend on the exact band dragged):

- MTPU, 29 km: over 1,000 in any band from 1 to 25 Hz. This close, the quake is huge next to
  the noise.
- TMU (Wasatch Academy), 146 km: about 190 at 1–5 Hz, 30 at 8–20 Hz, 12 at 15–40 Hz.
- BGU, 299 km: about 19 at 1–8 Hz, 7 at 8–20 Hz, and barely more than 1 at 15–40 Hz.

So at a far station the quake stands out best in the low notes, roughly 1–8 Hz.

**Sound.** The readouts for a 100 samples per second record:

| Speed-up | 1 Hz sounds like | The sensor's top note (50 Hz) becomes |
| --- | --- | --- |
| 50× | 50 Hz | 2,500 Hz |
| 100× | 100 Hz | 5,000 Hz |
| 200× | 200 Hz | 10,000 Hz |
| 400× | 400 Hz | 20,000 Hz |

### Leamington: quarry blast or earthquake?

| | Quarry blast | Earthquake |
| --- | --- | --- |
| USGS event | `uu80161881` | `uu80120191` |
| Magnitude | 2.1 | 2.1 |
| Where | 4 km ENE of Leamington, Utah (the quarry) | 17 km E of Leamington, 13 km from the blast |
| When | Monday, October 26, 2026, 5:33 pm MDT (23:33 UTC) | Friday, October 24, 2025, 8:30 pm MDT (02:30 UTC on October 25) |
| Catalog depth | −2 km: at the surface (depths are measured from sea level) | 2.6 km |

The "Quake or blast?" box at each station (high ÷ low notes · P ÷ S). The app opens at SUU;
the others appear when students switch **Station** and press the button again:

| Station | Quarry blast | Earthquake | Fewer high notes in the blast? | Stronger P (compared with S) in the blast? |
| --- | --- | --- | --- | --- |
| FLU | 0.38 · 0.66 | 1.27 · 1.38 | yes | no |
| LEVU | 0.31 · 2.38 | 0.61 · 2.55 | yes | about the same |
| NLU | 0.27 · 0.55 | 0.76 · 0.22 | yes | yes |
| SUU (Juab stand-in) | **1.89 · 2.44** | **3.04 · 0.66** | yes | yes |
| WCU (Millard stand-in) | 0.31 · 0.57 | 0.86 · 0.52 | yes | about the same |

The blast has fewer high notes at all five stations, but a clearly stronger P at only two. A
check with 13 stations found the same pattern: fewer high notes in the blast at all 13, a
stronger P at 9 of them. That is why the app calls it "evidence, not proof". Seismologists add
the place (a known quarry), the time (almost all of Utah's blasts happen between 8 am and 6 pm
on weekdays: see [Blasts and mines](../theory/seismograms.md#blasts-and-mines)) and the depth.

Why might a blast differ? An explosion pushes outward in every direction, which makes P; it
does little shearing, so its S is weak. A quake is rock sliding along a fault, a shearing
motion, so it sends out strong S. A quarry blast is also set off in rows of holes, a few
thousandths of a second apart, in broken rock near the surface: spreading the blast out in
time and starting it in loose rock both take away high notes.

The button's first result, near and far, for the pair: for the blast, FLU (19 km) 0.38 and WCU
(66 km) 0.31; for the earthquake, FLU (19 km) 1.27 and WCU (64 km) 0.86. Both times the nearer
station kept more high notes. From the blast the box offers **Open the earthquake in B**; from
the earthquake, **Open the quarry blast in B**.

### Sand Point, Alaska (M7.3), optional

At SGU (Gunnison Valley's stand-in, 3,985 km away) the check reports the strongest notes near
**0.051 Hz: one wave every 20 s**. After about 4,000 km almost all the high notes are gone. For a
distant quake the **Nearest** and **Farthest** buttons are hidden, and the speed-ups are 100×,
200× and 400×.

## Common difficulties

- **Reading the spectrogram.** Up is pitch, not loudness; color is strength. The bright patch
  says *when* (across) and *at which notes* (up) the shaking was strong.
- **"Same quake, same notes."** A common prediction. The quake sends out the same notes in every
  direction; the rock along the way takes the high ones away. It is like music from a car down
  the street: you hear the bass, not the singer.
- **Hearing nothing.** Check that the browser tab isn't muted. Sound starts only on **▶ Listen**,
  and only the part of the record on screen plays, so zooming in makes it shorter. Laptop
  speakers play very low notes badly: use 100× or more, or headphones. Sand Point's strongest
  notes (0.05 Hz) become only 20 Hz even at 400×, the very bottom of hearing.
- **A station that breaks the rule.** Some stations always have more high notes than their
  distance suggests. For the Junction quake, SUU (Juab, 183 km) has more high notes than MTPU
  at 29 km (1.99 against 0.22, measured the app's way). The ground under a station and its
  local noise matter too; when a far station keeps as many high notes, the app says so. That is
  why the blast and the quake are compared at the *same* station: a fair test changes one thing
  at a time.
- **Computer picks and missing picks.** Discussion prompt: *At BGU the app's P time is a computer
  pick, and nobody picked S there, so the app estimates where S should be. Would a P pick one
  second off change high ÷ low much?* (Hardly: the measurement uses the whole quake, about 50 s
  of record from P to just after S.)
  *The catalog already labels the Leamington event a quarry blast. Our two numbers only hint at
  it. Why do the professionals still look at the place, time and depth?* (Each clue can be
  wrong on its own; together they are much stronger.)

## Extension ideas

- **Where the quake disappears.** Find a band where the quake almost vanishes, below about
  0.5 Hz. What is left? On the broadband stations, such as TMU or SGU, it is often the
  [ocean hum](../theory/seismograms.md#ocean-hum-microseism): smooth waves about 5 s apart.
- **Other blasts.** The **Utah quakes and blasts** list marks quarry and mine blasts in orange.
  Load one, and a quake of about the same size, and compare their spectrograms at stations at
  similar distances by eye and by ear.
- **The sampling limit.** Why can't a sensor that takes 100 samples per second record a 60 Hz
  wave? (It needs at least two samples per back-and-forth, so 50 Hz is its top note.) At 400×
  that top note lands at 20,000 Hz: the limit made audible.
- **Class data** (CS 9/10.DA.3). From everyone's CSV files, plot the band each pair chose against
  its **Quake ÷ noise** at the same station. Which band works best for a far station, and why?

*Data: waveforms from University of Utah Seismograph Stations (network UU,
[doi:10.7914/SN/UU](https://doi.org/10.7914/SN/UU)) via EarthScope; quake locations, event types
and analyst picks from USGS ComCat / UUSS. See [Our stations and data](../theory/stations.md).*
