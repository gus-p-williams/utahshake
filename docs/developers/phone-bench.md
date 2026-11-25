# Phone Bench notes

The Phone Bench ([guide](../apps/phone-bench.md)) is a prototype in
[In development](adding-an-app.md#in-development): one page for trial T1 of the phone
activities. On the device it is opened on, it measures what the browser really delivers from
the motion sensor and the microphone. The questions and the browser facts behind them are in
the planning review of a phone recorder (`planning/review-phone-recorder.md`, sections 2.5 and
5.1) and in Appendices B6 and D of
[planning/activities.md](https://github.com/gus-p-williams/utahshake/blob/main/planning/activities.md)
(on GitHub; the planning files are not part of this site).

## Files

```
docs/app/phone-bench/index.html      the page and its styles
docs/app/js/phone-bench/app.js       controller: the take, the results, copy, share, CSV, the plot
docs/app/js/phone-bench/sources.js   where readings come from: the device or a made-up phone
docs/app/js/phone-bench/mic-worklet.js  the microphone meter on the audio thread (keeps no sound)
docs/app/js/lib/bench.js             the arithmetic, and the made-up phone (no browser APIs)
tests/bench.test.js                  node --test on made-up data
tools/phone-bench-check.mjs          the page in headless Chrome, including the real code paths
```

## The take

Start runs one take of 43 seconds: 3 s hands off, 30 s at rest, 10 s of taps. What to do is
shown in a label on the plot ([D35](https://github.com/gus-p-williams/utahshake/blob/main/planning/decisions.md))
and in a status line that screen readers read. The phases follow the page's clock
(`performance.now()`), so they keep time even if readings stop.

1. **Permission, inside the tap.** The click handler calls
   `DeviceMotionEvent.requestPermission()` before anything else, when the browser has it: iOS
   shows its prompt only during a tap. Chrome has the function too (it answers at once), so a
   page that always calls it keeps working if Chrome starts to ask. The time to the answer
   tells a prompt (seconds) from a remembered answer (a few ms).
2. **Readings.** `devicemotion` events, `accelerationIncludingGravity` only. Each reading
   keeps the event's own time stamp (`t`) and the page time when it arrived (`th`). The
   rate and jitter use `t`; if a browser leaves `t` flat, they fall back to `th`, and the
   results say which.
3. **Screen wake lock** during the take, asked again when the page comes back into view.
   Hiding the page (screen lock, another app) is counted and reported.
4. **Results** (`lib/bench.js`):

| Result | Function | How |
| --- | --- | --- |
| Readings per second, jitter, dropped readings | `timing` | (n − 1) over the time from first to last reading; jitter is the standard deviation of the gaps that are not drops; a drop is a gap over 1.5 times the median |
| Rounding step | `stepReport`, `valueStep` | Are all values on every axis whole multiples of 0.1 m/s² (Chrome)? If not, do they sit on some other regular grid (its step), or vary smoothly (no fixed step)? |
| Noise at rest, resting values | `noise` | Mean and root mean square about the mean of each axis, over the 30 s at rest |
| Flicker at rest (rounding phones) | `flicker` | Share of the resting readings off the most common value, on each axis. Most rounding phones flicker by one step on at least one axis, because its resting value sits near the edge of a step |
| Taps | `tapRule`, `detectTaps` | A rounding phone: a reading outside the range it had at rest by a step (so a flickering axis doesn't count as a tap). Otherwise: more than max(6 × the resting noise, 0.05 m/s²) from the resting value. Readings within 250 ms are one tap; its size is the largest distance from the resting value |
| Microphone rate | `audioRate` | Samples that arrived over the page's clock, against `AudioContext.sampleRate` |

The microphone test asks for audio with echo cancellation, noise suppression and automatic
gain all off, reads back `track.getSettings()` (sample rate, channels and those three only:
no device ids or labels), and listens for 5 seconds through an AudioWorklet that folds each
tenth of a second into three numbers (samples, rms, peak). Older browsers without AudioWorklet
use a ScriptProcessorNode that does the same. Then the tracks stop and the context closes.

## Page address options

| Option | What it does |
| --- | --- |
| `?simulate=android` or `?simulate=iphone` | A made-up phone (`SIM_PHONES` in `lib/bench.js`) instead of the sensors, ten times faster than real time; the made-up Android phone rounds and flickers on its y axis; the made-up iPhone asks for permission, doesn't round and reads −9.8 face up. Results are marked "Simulated". |
| `?source=sample` | The made-up Android phone's whole take and microphone test at once, as the page opens. `tools/site-check.mjs` opens every app with this, so the page's code runs there. |
| `?rest=30&tap=10` | Seconds at rest (5 to 600) and for the taps (3 to 120). |
| `?pause=12` | With a made-up phone: its clock stops 12 s into the take, so a screenshot shows that moment (`tools/figures/phone-bench-screens.mjs`). |

## What leaves the device

No readings or results. The only requests are for the page's own files, from this site (the
microphone meter, `mic-worklet.js`, loads when the microphone test starts). The results go
only where the tester sends them: **Copy
results** (clipboard, or a text box to copy from), **Share…** (the system share sheet, where
the browser has one) and **Download CSV**. No name is asked for; the results hold the
browser's user agent string. The CSV starts with `#` comment lines (the results), then one row
per reading: `t_event_ms,t_page_ms,x,y,z,phase`, times from the first reading, values exactly
as the browser gave them (so Chrome's `9.800000000000001` shows).

## Testing

- `npm test` runs `tests/bench.test.js`: made-up takes in, the numbers they were made with out.
- `node tools/phone-bench-check.mjs` opens the page in headless Chrome three ways: the
  made-up phone; **real `devicemotion` events** from Chrome's sensor emulation (the DevTools
  protocol's `Emulation.setSensorOverrideReadings`, the same as DevTools › Sensors), which
  Chrome rounds to 0.1 m/s² just as on a phone; and the real microphone path with Chrome's
  fake microphone. It needs puppeteer-core (`cd tools/figures && npm install`).
- **Real phones.** Motion and the microphone need a secure address. An Android phone can use a
  laptop's server through a USB cable: `adb reverse tcp:8001 tcp:8001`, then
  `node tools/serve.mjs` and `http://localhost:8001/app/phone-bench/` on the phone (localhost
  counts as secure). iPhones need the published site, which deploys from `main`. There is no
  Safari debugger on Windows, so the page keeps its own log (Log, at the bottom).

## After trial T1

Ideas the planning review lists for later, not in this prototype: a 40 Hz tone test (does a
phone filter out shaking above 30 Hz, or does it fold into a false low note?), a spectrum of
the take, the Generic Sensor API's true time stamps on Chromium, and an event list for trials
T2 and T3.
