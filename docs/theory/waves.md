# Seismic waves

**Used in:** [Wave Race](../apps/wave-race.md) · [Quake Waves](locating.md#watch-it-happen)

An earthquake is a sudden slip on a fault. The slip shakes the rock around it, and that
shaking travels outward as **seismic waves**, the same way a pebble's splash spreads across
a pond. A seismometer records the ground's motion as those waves pass.

## Two body waves

Waves that travel *through* the Earth are called **body waves**. There are two kinds.

**P waves** (primary, or pressure, waves) push and pull the rock in the direction the wave
travels, like a pulse along a stretched Slinky. Rock resists being squeezed strongly, so P
waves are the **fastest**: about 5.8–6.0 km/s in the upper crust under Utah. They arrive
first, and they are often clearest on the **vertical (Z)** sensor.

**S waves** (secondary, or shear, waves) shake the rock side to side, across the direction of
travel, like flicking a rope. Rock resists shearing less than squeezing, so S waves are
**slower**: about 3.3–3.5 km/s in the upper crust. They usually shake harder than P, and
they are often clearest on the **horizontal (N and E)** sensors. S waves cannot travel through
liquid, because a liquid does not spring back when sheared. That fact is how seismologists
discovered that Earth's outer core is liquid.

<iframe src="../../app/wave-motion/?embed=1" title="Animation: how P and S waves move rock. A P wave squeezes and stretches a grid of rock particles back and forth along its path; a slower S wave shakes them up and down into a bump that falls behind." loading="lazy" style="width:100%;height:400px;border:1px solid var(--md-default-fg-color--lightest);border-radius:8px"></iframe>

*A cartoon; the rock's motion is exaggerated.* Press **Play** and watch the coloured dots: the
wave travels on, but each bit of rock only moves and comes back to where it started. In the P
wave it moves back and forth along the wave's path; in the slower S wave, up and down across it.
[Open the animation full screen](../app/wave-motion/index.html).

After the body waves come **surface waves**, which travel along the surface and are the
largest waves far from a big quake.

## Reading a seismogram

A seismogram is a graph of ground motion (up the page) against time (across). On a quiet
day it shows a wiggly **background noise**: wind, traffic, people, ocean waves far away.
A quake shows up as:

1. **the P arrival**: the first clear change from the background, often small and sharp;
2. **the S arrival**: a second, usually larger change a few seconds later;
3. **the coda**: shaking that slowly dies away as scattered waves keep arriving.

<figure markdown="span">
  ![Three-component seismogram from station MTPU (traces HHZ, HHN, HHE). The traces are flat until a blue line at 5 seconds marked 1 P arrival, where small sharp waves begin. Much bigger waves start at a red line at 9 seconds marked 2 S arrival; an arrow between the lines reads S minus P = 4.14 s. After about 20 seconds the shaking slowly dies away, marked 3 coda.](img/seismogram-anatomy.svg){ loading=lazy }
  <figcaption>Figure 1. A real seismogram from station MTPU, 29 km from the magnitude 3.3
  quake near Junction, Utah, with the three parts listed above. Filtered 1–10 Hz; picks by
  University of Utah analysts. Data: University of Utah Seismograph Stations (network UU,
  doi:10.7914/SN/UU) via EarthScope; picks via USGS ComCat.</figcaption>
</figure>

The time between P and S is the **S-minus-P time**. It is the key to distance:
see [Distance from S minus P](s-minus-p.md).

Picking S is hard, even for professionals: S arrives while the ground is still shaking from P.
For the offline sample quake, University of Utah analysts picked P at 9 stations but S at
only 3.

## Waves, frequency and filters

Every wave obeys

$$
v = f\lambda
$$

where \(v\) is speed, \(f\) is frequency (vibrations per second, Hz) and \(\lambda\) is
wavelength. A 5 Hz P wave travelling 6 km/s has a wavelength of 1.2 km.

Different sources shake the ground at different frequencies. Nearby small quakes are rich in
1–20 Hz. Footsteps and machines are mostly above 5 Hz. Ocean waves hitting coastlines make a
constant hum near 0.2 Hz, even in Utah. A **band-pass filter** keeps only a chosen range,
for example 1–10 Hz, so a quake stands out from the noise. That is what the Filter menu in
[Wave Race](../apps/wave-race.md#2-pick-the-p-and-s-waves) does.

The instruments sample the ground 100 times per second, so nothing faster than 50 Hz (half
the sampling rate, the **Nyquist frequency**) can be recorded.

## What the instrument measures

A seismometer is a mass on a spring inside a frame bolted to the ground. When the ground
moves, the frame moves but the mass lags behind. In a **geophone**, like the one in a
Raspberry Shake, the mass is a magnet inside a coil; the motion makes a voltage proportional
to the ground's **velocity** (Faraday's law). The digitizer turns that voltage into whole
numbers called **counts**. Wave Race shows counts, scaled to fit each panel, because picking
arrival *times* does not need the true ground speed.

Very strong shaking can exceed the digitizer's largest number. The trace then has flat tops:
the record is **clipped**. You can still pick the P arrival on a clipped record.
