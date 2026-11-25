# Phone Bench

A one-page test of how a phone's browser reads its motion sensor and microphone. It is a
prototype being tested: trial T1 of the phone activities.

[Open Phone Bench](../app/phone-bench/index.html){ .md-button .md-button--primary }

!!! warning "A prototype, not ready for classrooms yet"
    Built for Gus, Dale, Cleat and other adults testing their own phones. Using it with
    students is each school's decision under its own rules: classroom phone use needs the
    district's policy under Utah's phone law (SB 69, 2026), and no student should be asked to
    use a personal phone.

!!! abstract "At a glance"
    - **You will:** lay a phone flat on a table, press Start, wait 30 seconds, tap the table 5
      times, and send the numbers the page shows to Gus.
    - **Time:** about 1 minute per device, plus 10 seconds for the optional microphone test.
    - **Works on:** iPhone and iPad (Safari) and Android phones (Chrome). The microphone test
      also runs on Chromebooks and laptops, which mostly have no motion sensor. Open it from
      this site: the sensors work only on its secure (https) address.
    - **The science:** none yet. The questions it answers are trial T1 in the
      [classroom activities document](https://github.com/gus-p-williams/utahshake/blob/main/planning/activities.md#appendix-d-trials-before-committing)
      (a planning file on GitHub).
    - **For teachers:** none yet: a prototype being tested. Activity cards come if the
      phone activities go ahead.
    - **Data:** only this device's own sensors. Nothing leaves the device unless you send it.
    - **For developers:** [Phone Bench notes](../developers/phone-bench.md)

## Why this test

The phone activities planned for UHSN (a phone as a seismometer, a phone beside the school's
Shake, a shake table) depend on what a phone's browser actually delivers. What the browsers'
code and the standards say, a phone may not do. This page measures it on each device:

- **Readings per second.** Browsers give at most about 60 a second. Is it 60 on this phone?
- **Timing jitter.** How evenly spaced the readings are, and whether some go missing.
- **Rounding.** Chrome rounds every reading to the nearest 0.1 m/s², about 1% of gravity
  (see [Why the numbers come in steps](#why-the-numbers-come-in-steps)). Whether iPhones
  round isn't confirmed yet.
- **Noise at rest.** How much the readings wobble when nothing moves.
- **Taps.** Whether a finger tap on the table shows up, and how big it reads.
- **Permission.** iPhones and iPads ask before a page may read motion. How does the prompt
  behave, and what happens if you say no?
- **Microphone.** Its sample rate, and whether the browser turns off its voice processing
  (echo cancellation, noise suppression, automatic gain) when asked.

## Steps

1. **Open the page on the phone**, in Safari on an iPhone or iPad, or in Chrome on an Android
   phone: [Open Phone Bench](../app/phone-bench/index.html). Use the site's own address (it
   starts with https).
2. **Lay the phone flat on a solid table, screen up**, away from the edge. The page shows
   what to do next on the plot itself, in a blue label.
3. **Press Start.** On an iPhone or iPad, tap **Allow** when asked about motion. Then take your
   hands off the phone.
4. **Wait 30 seconds without touching the phone or the table.** The label counts down. Keep
   the screen on and the page open: readings stop while the screen is locked or another app
   is in front.
5. **When the label says "Tap the table", tap the table with a finger** about a hand's width
   from the phone, 5 times, about once a second. The label counts the taps it sees.
6. **Read the results** under the plot (next section).
7. **Optional: test the microphone.** Press **Test the microphone**, allow it, and clap once
   while the page listens for 5 seconds.
8. **Send the results** (see [What to send to Gus](#what-to-send-to-gus)).

<figure markdown="span">
  ![The Motion sensor card on a phone, 11 of 18 seconds into a shortened take. At the top of the plot, a blue label reads: Tap the table beside the phone, 5 times · seen 2 · 7 s. Below it, three flat traces labeled x 0.10, y 0.20 and z 9.80; the y trace flickers up and down by one small step now and then, and all three show two short bursts of wiggles, biggest on z, where the taps were. Under the plot: last 5 s · gray lines every 0.5 m/s², a progress bar two thirds full, the line Now tap the table beside the phone with a finger, 5 times, about once a second, and the buttons Start (grayed out) and Stop early.](img/pb-take.png){ width="358" loading=lazy }
  <figcaption>Figure 1. During the taps, with the made-up phone of the page's simulate mode (a
  shortened take). The label on the plot says what to do and counts the taps it has seen.</figcaption>
</figure>

Don't scroll the page during a take: on iPhones, motion readings pause while a page scrolls.
Press **Run again** to repeat the test.

## What the results mean

<figure markdown="span">
  ![The results table from the made-up Android phone. Simulated phone: yes, made-up readings. Readings per second: 59.9. Timing jitter: 0.49 ms. Dropped readings: 6 gaps. Rounding step: yes, every reading is a whole multiple of 0.1 m/s². Noise at rest: x 0.0000, y 0.0307, z 0.0000 m/s². Flicker at rest: x 0%, y 11%, z 0%. Resting values: x 0.10, y 0.19, z 9.80 m/s². Taps seen: 5, biggest 0.93, smallest 0.22 m/s². Motion permission: not asked. Then the screen, page-hidden, also-reports, repeated-readings and browser lines. Each value has a short note under it.](img/pb-results.png){ loading=lazy }
  <figcaption>Figure 2. The results from the made-up Android phone (<code>?source=sample</code>). On a real
  device the first line is missing and the numbers are that device's own.</figcaption>
</figure>

| Result | What it tells you | What we expect |
| --- | --- | --- |
| Readings per second | How many motion readings the browser delivered | About 60 |
| Timing jitter | How much the time between readings wobbles (standard deviation), and the range of the middle 98% of those times | Under a few ms |
| Dropped readings | Gaps of more than 1.5 times the usual spacing: readings that went missing | A few at most |
| Rounding step | Whether every reading is a whole multiple of 0.1 m/s², or else the size of the phone's own step | Yes in Chrome; not yet known for iPhones |
| Flicker at rest (rounding phones only) | On each axis, the share of readings at rest that are a step off the usual value | Above 0% on at least one axis, on most phones |
| Noise at rest | How much the readings wobble while nothing moves (root mean square, m/s²) | On a rounding phone, mostly the flicker: up to 0.05 on a flickering axis, 0 on the others. About 0.01 on a phone that doesn't round |
| Resting values | The readings with the phone at rest. Together they should make gravity, 9.81 m/s² | z near +9.8 on Android, maybe −9.8 on iPhones (the opposite sign) |
| Taps seen | How many taps stood out from the resting level, and how big | 5, if the taps were firm |
| Motion permission | Whether the browser asked, what you answered, and how long that took | iPhones ask; Android doesn't |
| Screen kept on | Whether the page could keep the screen from sleeping | Yes on current browsers |
| Page hidden during the take | Whether the screen locked or another app came in front | No |
| Sample rate (microphone) | Sound samples per second, and the rate the page measured | 44,100 or 48,000 |
| Voice processing (microphone) | Whether echo cancellation, noise suppression and automatic gain are off | All off; Safari may report only echo cancellation |

## Why the numbers come in steps

The browser rounds each motion reading before the page sees it. **Chrome rounds to the nearest
0.1 m/s²**, about 1% of gravity, so that websites can't recognize a phone by the tiny quirks of
its sensor; we checked this in Chrome. Other browsers may differ: Safari on iPhones doesn't
round yet as far as its code shows, and a change to make it round has been filed but has not
shipped. Readings arrive at up to 60 a second in every browser.

What it means:

- **A vibration smaller than one step can vanish, or flicker.** If an axis's resting value
  sits in the middle of a step, a small shake never changes the reading. If it sits near the
  edge of a step, the reading flickers between two values. At rest, most phones flicker by
  one step on at least one axis.
- **It limits how far away a phone can sense a drop or a stomp.** Shaking fades with distance.
  Once it is smaller than a step, the phone loses it, wherever the phone lies.
- **A seismometer is different.** It also measures in steps (its counts), but they are tiny,
  and its own noise is what limits it. At 10 Hz a phone's 0.1 m/s² step is about 20,000 times
  the smallest shake a Raspberry Shake can see. See
  [How small a shake can it see?](../theory/seismograms.md#how-small-a-shake) on Reading a
  seismogram, which compares a phone, a Shake and a broadband station, with a picture.

**Your phone's step** is in your results: **Rounding step** says whether the readings sit on
0.1 m/s² steps or gives the phone's own step, and **Flicker at rest** shows which axes flicker.
While the shaking is small, the gray lines on the plot are 0.1 m/s² apart (the label under
the plot says so), and rounded readings sit on them.

**An app doesn't have these limits.** phyphox, a free phone app, reads the sensor directly:
about 100 readings a second on iPhones and 100 to 500 on Android phones, with no rounding.
This page uses the browser only so that nobody has to install anything. For clubs and
research, see [Phones with an app: phyphox](../teachers/phyphox.md).

## What to send to Gus

Press **Copy results** (or **Share…** on a phone) and paste the text into an email to Gus. Add:

- the device's **make and model** (for example "Pixel 7" or "iPhone 13"), and its system
  version if you know it (Settings › About);
- whether a **permission prompt** appeared, and anything else you noticed.

**Download CSV** saves every reading as a spreadsheet file on the device (on an iPhone, in
Files › Downloads). Attach it only if Gus asks for it.

### Extra checks, if you have time

Each one answers a question the planning review could not settle from the browsers' code:

- **Say no once.** On an iPhone, press Start and tap **Don't Allow**. What does the page say?
  To recover, quit Safari (swipe it away in the app switcher), open the page again, and allow.
- **Lock the screen** halfway through a take. The results should say the page was hidden.
- **Low Power Mode** (iPhone) or **battery saver** (Android): does the rate change?
- **An old phone or a school tablet**: does the page run at all? Send its system version.
- **Run it twice** on an iPhone: does Safari ask again? Quit Safari and run it a third time.

## Privacy

- **Nothing leaves the device.** The page never sends your readings or results anywhere; the
  only things it asks the site for are its own files. The results go only where you send them.
- **No sound is recorded.** The microphone test folds each tenth of a second of sound into
  three numbers (how many samples, how loud on average, the loudest) and throws the sound away.
- **No names.** The results hold the browser's own description of itself (its "user agent"),
  never a name or account.

## If something goes wrong

| What you see | What to do |
| --- | --- |
| "No motion readings arrived" | Most laptops and Chromebooks have no motion sensor. On Android, open Chrome's site settings for this site and allow **Motion sensors**. |
| "Motion was not allowed" (iPhone, iPad) | Quit Safari (swipe it away in the app switcher), open the page again, press Start and tap **Allow**. |
| The microphone was "Not allowed" | In Safari, the **aA** button › Website Settings › Microphone › Allow. In Chrome, the icon left of the address › Permissions. Then press Test the microphone again. |
| "This page needs its https address" | Open the page from this site, not from a copy on a computer. |
| Odd numbers, or a step that doesn't finish | Open **Log (for troubleshooting)** at the bottom of the page, and copy what it says into your email. |

To see how the page works on a computer, which has no motion sensor, add `?simulate=android`
or `?simulate=iphone` to its address: a made-up phone runs the test ten times faster. Its
results are marked as simulated.
