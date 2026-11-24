# Seismic waves

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

After the body waves come **surface waves**, which travel along the surface and are the
largest waves far from a big quake.

## Reading a seismogram

A seismogram is a graph of ground motion (up the page) against time (across). On a quiet
day it shows a wiggly **background noise**: wind, traffic, people, ocean waves far away.
A quake shows up as:

1. **the P arrival**: the first clear change from the background, often small and sharp;
2. **the S arrival**: a second, usually larger change a few seconds later;
3. **the coda**: shaking that slowly dies away as scattered waves keep arriving.

The time between P and S is the **S-minus-P time**. It is the key to distance:
see [Distance from S minus P](s-minus-p.md).

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
Wave Race does.

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
