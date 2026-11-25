# Build a Wiggle

Add sine waves with sliders and watch their sum: the kind of wiggle a seismometer records.
Below it, the spectrum finds every wave again.

[Open Build a Wiggle](../app/build-a-wiggle/index.html){ .md-button .md-button--primary }

!!! abstract "At a glance"
    - **You will:** build a wiggle from up to three sine waves, watch its spectrum pick out
      each wave again, add noise, filter notes out, and see why a far quake sounds lower than
      a near one.
    - **Time:** 5 minutes as a warm-up; 15–20 minutes with all the examples below.
    - **Works on:** any browser, including Chromebooks. No install, no accounts.
    - **The science:** [Frequencies, fading and sound](../theory/frequencies.md) · [Filters and spectrograms](../theory/seismograms.md#filters-and-spectrograms)
    - **For teachers:** [What notes is the ground playing?](../teachers/notes-of-a-quake.md) (as the warm-up) · [Standards](../teachers/standards.md#build-a-wiggle)
    - **Data:** none. You make the waves. The spectrum is worked out with the same code (an
      FFT) that Quake Explorer uses on real seismograms.

## What you see

<figure markdown="span">
  ![Build a Wiggle as it opens. Top panel: wave 1, a blue sine wave labeled 2 Hz, size 0.80; wave 2, a smaller, quicker orange wave labeled 8 Hz, size 0.30; wave 3, a dotted gray line labeled 15 Hz, off. Under them, in bold black, the sum of the waves, the wiggle a seismometer records: a slow wave with small fast bumps riding on it, biggest swing 1.05, over 4 seconds. Lower panel: the spectrum of the sum, size against frequency from 0 to 25 Hz, with a tall blue bar at 2 Hz (0.8) and a short orange bar at 8 Hz (0.3). Below the panels, one card per wave with a Frequency and a Size slider, the Add noise and Filter checkboxes, and example buttons: Two notes, Ocean hum + quake, Near quake, Far quake, Beats, Square-ish.](img/bw-two-notes.png){ loading=lazy }
  <figcaption>Figure 1. Build a Wiggle as it opens, with the <b>Two notes</b> example. The
  spectrum is worked out from the bold line alone, yet it finds both waves.</figcaption>
</figure>

- **The waves** (top): each wave is drawn thin, in its own color, with its frequency and size.
  A wave of size 0 is off (a dotted gray line).
- **The sum** (bold black line): the waves added together at every moment. This is the
  wiggle a seismometer would record.
- **The spectrum** (lower panel): one bar at each wave's frequency, as tall as that wave's
  size.
- **The line at the bottom** explains the example you chose, or describes what is on the
  screen.

| To do this | Do this |
| --- | --- |
| Change a wave's note | Drag its **Frequency** slider (0.5 to 20 Hz) |
| Make a wave bigger or smaller | Drag its **Size** slider; size 0 turns the wave off |
| Add noise | Tick **Add noise** |
| Keep only the notes from 1 to 10 Hz | Tick **Filter: keep only 1–10 Hz** |
| Load an example | Press one of the buttons after **Try:** |

The sliders also move with the arrow keys.

## What to try

Predict before each step, then check.

1. **Two notes.** The app opens with this example: a slow 2 Hz wave with a smaller 8 Hz wave
   riding on it. *Predict:* if you set wave 2's **Size** to 0, what happens to the bold line?
   To the spectrum? *Notice:* each bar is one wave, as tall as that wave's size.
2. **Beats.** Press **Beats**: two waves of the same size, at 5 and 5.5 Hz. The bold line
   swells and fades. *Predict:* how many bars will the spectrum show, and where? *Notice:* a
   wiggle that comes and goes can be made of notes that never stop. Now move wave 2 to 6 Hz.
   Do the loud parts come closer together or farther apart?
3. **Noise.** Tick **Add noise**. *Notice:* the sum turns ragged, and hundreds of tiny gray bars
   appear along the bottom of the spectrum. Noise is a tiny bit of every note.
4. **Filter.** Press **Ocean hum + quake**: a big, slow 0.5 Hz wave, like the ocean hum (the
   real hum is even slower), with a small quake on top. *Predict:* which waves will a filter
   that keeps only 1 to 10 Hz remove? Tick it and see (Figure 2). *Notice:* the slow wave is
   removed and the quake's notes stay. Quake Locator and Quake Explorer filter real
   seismograms the same way.
5. **Near and far.** Press **Near quake**: notes at 2, 6 and 14 Hz, all of size 0.60. Then press
   **Far quake**: the same three notes after 60 seconds of travel (about 200 km) through
   Utah's crust. *Notice:* every note gets smaller, but not by the same amount. The 2 Hz note
   keeps a third of its size (0.20); the 14 Hz note keeps only a twelfth (0.05). That is why a
   far quake sounds like a low rumble: [the high notes fade first](../theory/frequencies.md#why-high-notes-fade-first).
6. **Square-ish.** Press **Square-ish**: notes at 1, 3 and 5 Hz, each smaller than the last.
   The sum starts to look like a square wave. More odd notes (7, 9, 11 Hz and so on) would
   make it squarer still: with enough sine waves you can build any shape.

<figure markdown="span">
  ![Build a Wiggle with the Ocean hum + quake example, Add noise ticked and the filter ticked. Top panel: wave 1, 0.5 Hz, size 1.00, drawn faint and labeled removed by the filter; wave 2, an orange 4 Hz wave of size 0.30; wave 3, a green 8 Hz wave of size 0.20; a gray lane labeled noise, 1 to 10 Hz part. The bold sum is a fairly even band of quick waves with no slow swell, biggest swing 0.62. Lower panel: the spectrum, with the band from 1 to 10 Hz shaded and outlined, an orange bar at 4 Hz, a green bar at 8 Hz, tiny gray noise bars along the bottom of the shaded band, and a pointer labeled noise: a tiny bit of every note. The line at the bottom reads: the sum of 4 Hz (size 0.30), 8 Hz (size 0.20), plus noise. The filter removed 0.5 Hz (size 1.00). Biggest swing 0.62.](img/bw-filter.png){ loading=lazy }
  <figcaption>Figure 2. <b>Ocean hum + quake</b> with <b>Add noise</b> and the filter ticked.
  The filter keeps the shaded band, 1 to 10 Hz: the slow 0.5 Hz wave is gone, and so is the
  noise outside the band.</figcaption>
</figure>

## Made-up waves, not real data

To keep the idea clear, each wave here is a single steady note that never changes. Real
seismograms are messier. They hold many notes at once, the notes change from moment to moment
(P and S sound different), and the noise never repeats. To follow notes that change,
seismologists cut a record into short pieces and find the spectrum of each piece:
a [spectrogram](../theory/frequencies.md#how-a-spectrogram-is-made). To find the notes in
real quakes, and listen to them, try [Quake Explorer](quake-explorer.md#b), investigation B.

## Where else it appears

On [Frequencies, fading and sound](../theory/frequencies.md#any-wiggle-is-a-sum-of-sine-waves),
next to the science (the page's [Try it](../theory/frequencies.md#try-it) questions use it
too), and as the warm-up in the activity card
[What notes is the ground playing?](../teachers/notes-of-a-quake.md).
