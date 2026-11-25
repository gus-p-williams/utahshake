# All apps

Every classroom app runs in any browser, including Chromebooks. No install, no accounts. Each
card says whether the app uses real data (records from seismic stations in Utah) or made-up
waves that show one idea clearly. Apps that are still being tested are further down, under
[In development](#in-development).

<div class="grid cards" markdown>

- **Quake Locator**

    *Real data: seismograms from Utah stations.*

    Pick the P and S waves of a real Utah earthquake at several stations, turn the time
    between them into distances, and find where the quake happened. Then compare with the
    University of Utah's answer. New to P and S waves? Watch [Quake Waves](quake-waves.md)
    first.

    [Open Quake Locator](../app/wave-race/index.html){ .md-button .md-button--primary }

    [Quake Locator guide](wave-race.md)

- **Quake Explorer**

    *Real data: seismograms from Utah stations.*

    Four investigations with real seismograms: measure how fast the rock is, find the notes
    in the shaking and hear them, see which way the ground moved, and read the message from
    a big quake on the far side of the world.

    [Open Quake Explorer](../app/quake-explorer/index.html){ .md-button .md-button--primary }

    [Quake Explorer guide](quake-explorer.md)

- **Quake Waves**

    *No real data: a cartoon.*

    P and S waves race out from a quake to four stations. See the seismograms appear, and
    watch the S − P distances cross at the quake. A good warm-up for Quake Locator.

    [Open Quake Waves](../app/quake-waves/index.html){ .md-button .md-button--primary }

    [Quake Waves guide](quake-waves.md) ·
    [Watch it on Locating a quake](../theory/locating.md#watch-it-happen)

- **Build a Wiggle**

    *No real data: you make the waves.*

    Add up to three sine waves with sliders and watch their sum, the wiggle a seismometer
    would record, and its spectrum, which finds every wave again. Add noise, filter out notes,
    and see why a far quake sounds lower than a near one. A good warm-up for the notes in
    Quake Explorer.

    [Open Build a Wiggle](../app/build-a-wiggle/index.html){ .md-button .md-button--primary }

    [Build a Wiggle guide](build-a-wiggle.md) ·
    [Use it on Frequencies, fading and sound](../theory/frequencies.md#any-wiggle-is-a-sum-of-sine-waves)

- **School Pulse** (coming soon)

    *Real data: noise records from stations near the schools.*

    See the daily rhythm of a school in its seismic noise: class changes, weekends, holidays.

</div>

## In development: please test { #in-development }

These apps are prototypes. They are here for Gus, Dale and Cleat to try before they are ready
for classrooms. Each card says what to test. Send what you find to Gus by email. The site
collects nothing: your results stay on your device until you send them.

<div class="grid cards" markdown>

- **Phone Bench**

    *Prototype, for adult testers. No station data: it reads this device's own sensors.*

    A one-page test for trial T1 of the phone activities. It measures how a phone's browser
    reads the motion sensor: readings per second and their timing jitter, the rounding step
    of the readings, the noise at rest, and taps on the table. It also shows how the
    permission prompt behaves. An optional part checks the microphone's sample rate, also on
    a Chromebook or laptop. Not a classroom activity: phones in class need the district's
    policy (Utah's phone law, SB 69, 2026).

    **Test:** on an iPhone or iPad (Safari) and an Android phone (Chrome). Lay the phone
    flat on a table and press Start. Hands off for 30 s, then tap the table 5 times. Did the
    permission prompt appear (iPhones need a tap on Allow)? Do the results look sensible?

    **Send:** press Copy results and paste them into an email to Gus, with the phone's make
    and model. Download CSV saves every reading, if he asks for it.

    [Open Phone Bench](../app/phone-bench/index.html){ .md-button .md-button--primary }

    [Phone Bench guide](phone-bench.md)

- **School Shake Viewer**

    *Prototype, for adult testers. Real data: University of Utah stations, a Shake's day file,
    or a test folder in the UHSN data layout.*

    A day of one seismometer on one page: a 24-hour helicorder, a zoom with its spectrogram,
    the noise in each hour, the class's own notes drawn on the record (bells, buses, quakes),
    and a CSV of any window. Its example, HEB near Heber City with the bell times of two
    schools as notes, comes with the site. For choosing what the school version should do.

    **Test:** on a laptop or Chromebook (and a phone, if you like). Press Try the example, then
    a day at your school's stand-in; zoom in, drag on the spectrogram, add a note, mark the
    quakes, download a CSV. If you can, open a day file from a Shake.

    **Send:** an email to Gus: what was useful, what was confusing, what a class would need.

    [Open the School Shake Viewer](../app/shake-viewer/index.html){ .md-button .md-button--primary }

    [School Shake Viewer guide](shake-viewer.md)

</div>

## Animations

A short cartoon of one idea, shown on the science page it belongs to. It has no guide of its
own and uses no real data.

<div class="grid cards" markdown>

- **How P and S waves move rock**

    A P wave and an S wave cross a block of rock. P squeezes and stretches the rock along its
    path; the slower S shakes it up and down. The wave travels on, but the rock comes back to
    where it started.

    [Open the animation](../app/wave-motion/index.html){ .md-button .md-button--primary }

    [Watch it on Seismic waves](../theory/waves.md#two-body-waves)

</div>

*Data: University of Utah seismic stations and the USGS earthquake catalog. See
[Our stations and data](../theory/stations.md).*
