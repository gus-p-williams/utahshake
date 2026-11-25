# Sources for "Phones with an app: phyphox"

The source log for the teacher page `docs/teachers/phyphox.md`, its ready-made experiment
`docs/teachers/files/uhsn-vibration.phyphox`, and the phyphox sentences added to the Phone Bench
guide (`docs/apps/phone-bench.md`, "Why the numbers come in steps") and to Reading a seismogram
(`docs/theory/seismograms.md#how-small-a-shake`). Session D12-phyphox, 2026-11-25, kept as the
project asks (D28, constraint 5): citation, link, access date, a short quote or the value taken,
and what it supports. In `planning/`, so in git but not on the website.

**Accessed 2026-11-25 unless noted.** Two research helpers (subagents of this session) read the
phyphox source code, documentation, store listings and sensor database, and kept notes with
quotes and line numbers. Entries marked **[checked]** were also fetched or rerun by this session
itself. **Nothing here was tested on a phone:** the link, the save prompt and the export steps
come from phyphox's documentation and source code. Testers should try them (see "Not tested").

Pinned code (both `master` branches equal their v1.2.1 tags on this date):

- **A** = github.com/phyphox/phyphox-android at tag v1.2.1, commit `45fa55a0727653ccce439b86acb69c00cf435436`
- **I** = github.com/phyphox/phyphox-ios at tag v1.2.1, commit `b7558d64b2bc7963bfe9e6c9f7ff67b6e3dfcecf`
- **X** = github.com/Staacks/phyphox-experiments at `af5c1a52a888426f0acff0284bb6a6564e113afb` (the
  built-in experiments; the submodule commit both tags pin)
- **DOCS** = github.com/phyphox/phyphox-docs at `a287d631531bbaab19d560fa737f098f0b4f0efc`, published
  as https://phyphox.org/docs/ (which replaces the old wiki; phyphox.org/wiki answers scripts with
  403 Forbidden)

## 1. Readings per second

- **phyphox sensor database**, https://phyphox.org/sensordb/ (data file
  https://phyphox.org/sensordb/devices.js, generated 2026-11-25 03:35 UTC: 5,614 devices, 56,235
  users). Each device's accelerometer rate (`arat`), resting noise (`as`), and on Android the
  maker's resolution and range. The page warns: "We can not guarantee that this information is
  accurate." **[checked]**: this session reran the helper's count on the downloaded file. Values
  taken (our binning):
    - iPhones: all 59 models (11,666 users) at 90 to 110 Hz, median 100.0 Hz. iPads: 90 of 91
      models at about 100 Hz.
    - Android, 5,452 models (42,179 users): about 100 Hz 20.8% of models; about 200 Hz 23.9%;
      about 400 Hz 26.1%; about 500 Hz 9.2%; other rates 20.1%. 74.2% of models (90.2% of users)
      at 190 Hz or more; median model 212 Hz; median user 406 Hz; highest 1,019 Hz.
  Supports: "about 100 readings a second on iPhones, 100 to 500 on Android phones"; "three in
  four models read about 200 a second or more, and about 400 is the most common"; "at most half
  its rate: about 50 Hz on iPhones, 100 Hz or more on most Android phones" (the Nyquist limit,
  half the rate; a phone's sensor may filter lower).
- **phyphox asks for the fastest rate.** A `rate` of 0 is the default: X `accelerometer.phyphox`
  line 317 sets none; A `PhyphoxFile.java` line 2306 `getDoubleAttribute("rate", 0.)`; A
  `SensorInput.java` lines 25 and 103–106 ("0 corresponds to as fast as possible") and 309–312
  (`registerListener(this, sensor, (int)(period / 1000))`); I `InputElementHandler.swift` lines
  302–310 and `MotionSession.swift` line 116 (`motionManager.accelerometerUpdateInterval =
  interval`). DOCS `spec/input.yml` lines 118–129: "A value of 0.0 means 'as fast as possible'".
  Supports: the experiment's `rate="0"` and "as fast as the phone allows".
- **Apple, "Getting raw accelerometer events"**,
  https://developer.apple.com/documentation/coremotion/getting-raw-accelerometer-events: "The
  maximum frequency at which you can request updates is hardware-dependent but is usually at least
  100 Hz." Supports: about 100 on iPhones.
- **Android, "Sensors overview"**,
  https://developer.android.com/develop/sensors-and-location/sensors/sensors_overview ("Sensor
  Rate-Limiting"): apps targeting Android 12 or higher are limited to 200 Hz unless they declare
  `HIGH_SAMPLING_RATE_SENSORS`; "If the user turns off microphone access using the device toggles,
  the motion sensors and position sensors are always rate-limited, regardless of whether you declare
  the HIGH_SAMPLING_RATE_SENSORS permission." A `AndroidManifest.xml` line 6 declares
  `android.permission.HIGH_SAMPLING_RATE_SENSORS` **[checked]** (added in commit 71602bf,
  2021-07-30). Supports: "On Android 12 and later, a phone whose microphone is switched off in the
  quick settings gets at most 200 readings a second, even in phyphox."
- **The browser side** (for the comparison table): 60 readings a second at most, Chrome rounds to
  0.1 m/s², Safari doesn't round today. From the Phone Recorder review's checked sources
  (`planning/phone-sources.md`, section 1, and `planning/bench-sources.md`), as already stated on
  the site (D36). Not re-checked here.

## 2. No rounding; steps, noise and range

- **No rounding in phyphox.** A `SensorInput.java` lines 337, 487 and 491 (`event.values[0]` appended
  as is); I `ExperimentSensorInput.swift` lines 64 and 333–335 (`let x = acceleration.x*kG`, `kG =
  -9.81`: g to m/s² and a sign flip, no rounding). Export writes 10 significant digits: A
  `DataExport.java` line 162 (`0.000000000E0`), I `ExperimentExportSet.swift` line 63. Supports: "with
  no rounding"; "the sensor's own step".
- **Steps, noise and range by phone** (sensor database, as above; our percentiles):
    - Android resolution (maker's figure): median 0.0024 m/s², 10th to 90th percentile 0.0012 to
      0.01; 93.1% of models at 0.01 or finer; 1.4% at 0.1 or coarser. The database notes that
      makers' figures "seem to be incorrect quite often, so treat them with care". Supports: "0.01
      m/s² or finer on most Android phones, by their makers' figures".
    - Android range: about ±8 g on 3,007 of 5,452 models (55%). Supports: "about ±8 g on most
      Android phones".
    - Resting noise (standard deviation of |a| over a quiet 2 s at the phone's full rate): Android
      median 0.021 m/s², 10th to 90th percentile 0.008 to 0.063; iPhones median 0.018, 0.012 to
      0.030. Supports: "about 0.01 to 0.06 m/s² at rest".
    - Apple: the database says "Apple devices have no interface to retrieve detailed information
      about the sensors"; phyphox's iOS device info shows only the app, model and iOS version (I
      `ExperimentsCollectionViewController.swift`, `buildDeviceInfoMessage`). Supports: "Apple
      doesn't publish its sensors' step."
- **"Thousands of times" above a Shake (our calculation).** At 10 Hz, an acceleration a is a
  ground speed of a / (2π × 10 Hz). The phone's resting noise of 0.008 to 0.063 m/s² (median 0.02)
  is then 0.13 to 1.0 mm/s (median 0.32 mm/s). Reading a seismogram gives the smallest shake a
  Raspberry Shake can see as 0.08 micrometers per second (1 to 20 Hz). Ratio: about 1,600 to
  12,500, median about 4,000. Like the site's "about 20,000 times" for Chrome's step, an
  order-of-magnitude comparison (the phone's noise is measured over its full band, the Shake's over
  1 to 20 Hz). Supports: "at 10 Hz it is still thousands of times bigger than the smallest shake the
  school's Raspberry Shake can see" and the matching clause on Reading a seismogram.

## 3. Installing, accounts, privacy

- **App Store listing**, https://apps.apple.com/us/app/phyphox/id1127319693, and
  https://itunes.apple.com/lookup?bundleId=de.rwth-aachen.physics.phyphox: free; no in-app purchases
  (`hasInAppPurchases:false`); privacy label "Data Not Collected"; version 1.2.1 (2026-09-07);
  "Requires iOS 12.0 or later" (iPad: iPadOS 12.0); seller RWTH Aachen University **[checked]** (the
  saved listing). Source agrees: `IPHONEOS_DEPLOYMENT_TARGET = 12.0`, `TARGETED_DEVICE_FAMILY =
  "1,2"` (I `project.pbxproj` lines 2206, 2222). Supports: the install steps, "iOS 12 or later", "free,
  with no ads and no in-app purchases", "both stores list it as collecting no data".
- **Google Play listing**, https://play.google.com/store/apps/details?id=de.rwth_aachen.phyphox, and
  data safety https://play.google.com/store/apps/datasafety?id=de.rwth_aachen.phyphox: free, no
  "Contains ads" or "In-app purchases" label; version 1.2.1, "Updated on Sep 2, 2026"; developer RWTH
  Aachen University **[checked]**; "No data collected", "No data shared with third parties".
  `minSdkVersion 21` (Android 5.0) in A `app/build.gradle` line 7. Supports: the install steps,
  "Android 5.0 or later".
- **F-Droid**, https://f-droid.org/packages/de.rwth_aachen.phyphox/: version 1.2.1, "This version
  requires Android 5.0 or newer", GPL-3.0-only. Supports: the F-Droid option.
- **phyphox privacy policy**, https://phyphox.org/privacy/: "The app 'phyphox' does not explicitly
  collect any personal data"; "Any measured data is only stored on the device running the app and
  it is not submitted to us or any third party unless the user explicitly transmits the data
  himself (export function)". Accounts are mentioned only for the forum. A `build.gradle` has no
  analytics library; I `PrivacyInfo.xcprivacy` sets `NSPrivacyTracking` false. Supports: "no
  account and no sign-in", "its recordings stay on the phone unless you export them".
- **Apple, "Get apps in the App Store on iPhone"**,
  https://support.apple.com/guide/iphone/get-apps-iphc90580097/ios: "You need an internet connection
  and an Apple Account to use the App Store." **[checked]**. **Apple, "Download apps on your iPhone or
  iPad"**, https://support.apple.com/en-us/102590: confirm with Face ID or Touch ID; "You might need
  to enter your Apple Account password to complete the download." **[checked]**. Supports: "The App
  Store needs an Apple Account" and step 2 of the iPhone install.
- **Google Play Help, "How to add & use accounts in the Google Play Store on your device"**,
  https://support.google.com/googleplay/answer/2521798: "You can add a Google Account on your device
  to start downloading and buying items on the Google Play Store app." **[checked]**. Supports: "Google
  Play [needs] a Google account on the phone".
- **Remote access warning**, A `res/values/strings.xml` line 321: "You should only do so on a trusted
  network! Also note, that direct access between devices may not be possible on many corporate or
  university networks." **[checked]**. Supports: "Leave Remote access off at school".

## 4. Opening an experiment from a web page

- **DOCS `docs/transferring-experiments.md`** (live: https://phyphox.org/docs/transferring-experiments/)
  **[checked]**:
    - "phyphox:// URL": "If your file can be accessed as 'http://myhost.com/myfancyexperiment.phyphox',
      you can create a link that is recognized by the system by replacing 'http://' or 'https://' by
      'phyphox://'. If the user opens a phyphox-link and already has phyphox installed, the system
      should hand the URL to phyphox, which downloads the experiment ... directly from the web";
      "placing the link on your own website as a `<a href="phyphox://...">`-tag". Supports: the "Open in
      phyphox" button and its address.
    - "Online QR-Codes (recommended)": a QR code "that contains a link starting with phyphox://, http://
      or https://"; "can simply be scanned from the phyphox main menu"; "Both link forms work".
      Supports: the QR route (not on the page yet; see "Left open").
    - "Direct transfer ... should only be used to transfer files for yourself ... It is not suitable for
      an audience with different devices." Supports: why the page offers the phyphox:// button rather
      than a plain download link.
    - `phyphox://asset=accelerometer.phyphox` opens the built-in experiment, "Available since phyphox
      1.2.1". Not used on the page (older installs), noted for later.
- **How each app handles the link (source).** A `AndroidManifest.xml` lines 66–71: a VIEW filter for
  `<data android:scheme="phyphox" />` **[checked]**; no http/https filter, so a plain https link to a
  .phyphox file is downloaded by the browser, not opened. A `PhyphoxFile.java` lines 257–274: `new
  URL("https", uri.getHost(), ...)`, then http on failure. I `Info.plist` lines 41–53:
  `CFBundleURLSchemes` = phyphox; no associated domains; I `ExperimentsCollectionViewController.swift`
  lines 1095–1125 set the scheme to https, then http. DOCS `test-matrix.yml` lines 321–322: opening a
  phyphox:// URL has a "confirmation dialog included on iOS". Supports: "An iPhone first asks whether
  to open phyphox"; "phyphox downloads the experiment (the phone needs the internet for this)".
- **Save to collection.** A `res/values/strings.xml` lines 74–75 and I `en.strings` lines 119–121:
  "This experiment has been opened from a remote source. Do you want to add it to your experiment
  collection?", button "Save to collection" **[checked]**. Supports: the second bullet under the
  buttons.
- **A phone without phyphox** (inferred, not in any phyphox source): Chrome on Android "doesn't
  launch an external app" when no app can take the link (https://developer.chrome.com/docs/android/intents);
  Safari shows an error for an address no app handles. Supports: "the button does nothing, or the
  browser says it can't open the address".
- **Hosting.** Both apps sniff the content, not the type (A `ExperimentListActivity.java` lines
  940–977; I `ExperimentsCollectionViewController.swift` lines 861–879); GitHub Pages serves unknown
  extensions as `application/octet-stream` (observed with `curl -I`). A phyphox forum reply (staff,
  2026-06-16, https://phyphox.org/forums/printthread.php?tid=2355): a load failed because the URL
  pointed to "a webpage with a download button". Supports: placing the file under `docs/` and linking
  the file itself.

## 5. Can a web page see whether phyphox is installed?

- **Chrome, "Is your app installed? getInstalledRelatedApps() will tell you!"**,
  https://developer.chrome.com/docs/capabilities/get-installed-related-apps: it "only lets you check if
  your apps are installed"; you "cannot get a list of all installed apps, or check if other 3rd party
  apps are installed"; the app must declare the site (Digital Asset Links). **MDN**,
  https://developer.mozilla.org/en-US/docs/Web/API/Navigator/getInstalledRelatedApps, and MDN's
  browser-compat data (`api/Navigator.json`): experimental; not in Safari or Firefox. A
  `AndroidManifest.xml` has no `asset_statements` (no website declared). Supports: the "Can this site
  tell whether phyphox is installed?" section.

## 6. Export to a spreadsheet

- **Formats** (both apps): Excel; CSV (Comma, decimal point); CSV (Tabulator, decimal point); CSV
  (Semicolon, decimal point); CSV (Tabulator, decimal comma); CSV (Semicolon, decimal comma) (A
  `DataExport.java` lines 417–424; I `ExperimentExportSet.swift` lines 25–30). Menu item "Export Data"
  (A `strings.xml` line 54; I `en.strings` line 94) **[checked]**.
- **A CSV export is a ZIP**: one `<set name>.csv` per export set plus `meta/device.csv` and
  `meta/time.csv` (A `DataExport.java` lines 171–264, which also leave the per-install random ID out
  of `device.csv` **[checked]**; I `ExperimentExport.swift` lines 71–125). DOCS
  `docs/file-format/index.md` line 286: "a CSV export results in a ZIP file containing a separate CSV
  file for each set". Excel gives one .xlsx with a sheet per set plus "Metadata Device" and "Metadata
  Time" (A `DataExport.java` lines 299–412). Supports: steps 2–5 of "From phyphox to a spreadsheet".
- **Where the file goes**: Android offers Share or Download ("File saved to Downloads") (A
  `DataExport.java` lines 482–526; `helper/DataExportUtility.java` lines 45–150); iPhones open the share
  sheet (I `ExperimentPageViewController.swift` lines 999–1028). Supports: step 3.
- **The experiment screen**: on iPhones the top-right bar holds the three-dot menu, the trash can and
  play (I `ExperimentPageViewController.swift` lines 353–358) **[checked]**; "Timed run" with "Start
  delay (s)" and "Experiment duration (s)" (A `strings.xml` lines 50–53, 90) **[checked]**. Supports: "Take
  a recording".

## 7. The experiment file (`docs/teachers/files/uhsn-vibration.phyphox`)

- **Written for this project** from phyphox's file-format documentation (DOCS `docs/file-format/`,
  `spec/input.yml`, `spec/analysis.yml`; live https://phyphox.org/docs/file-format/): our title,
  description, labels, column names and rate display. The built-in `accelerometer.phyphox` (X, title
  "Acceleration with g", category "Raw Sensors", GPL-3.0) was read as an example of the format; no text
  was copied beyond the element and attribute names the format defines.
- **Format version 1.14** (phyphox 1.1.10, 2021-12-13), the built-in file's version; the current
  format is 1.20 (phyphox 1.2.1), and an app refuses a newer version than it knows (DOCS
  `docs/reference/version-history/index.md` **[checked]**; `spec/root.yml` lines 30–37). The `keep`
  attribute came with phyphox 1.1.13 (format 1.17); the older `clear="false"` "will still be
  accepted" (DOCS `docs/reference/version-history/1.1.13.md`) **[checked]**. "An analysis input without
  keep="true" empties its buffer after reading it" (DOCS `docs/file-format/analysis/index.md`)
  **[checked]**: so every analysis input that reads the recording carries `clear="false"`, which
  `tests/phyphox.test.js` enforces.
- **Modules used**: count, first, max (`as="y"` in, `as="max"` out), subtract, divide (DOCS
  `docs/file-format/analysis/buffer-operations.md`, `basic-math.md`; `spec/analysis.yml` lines
  1575–1612) **[checked]**.
- **Validated** with phyphox's published RELAX NG grammar and Schematron rules,
  https://phyphox.org/docs/assets/validators/phyphox.rng and `phyphox.sch` (DOCS
  `docs/reference/validators.md`), using lxml: 0 errors, 0 failed rules **[checked]**. Two broken copies
  (an unknown module; a view reading an undeclared container) were rejected, so the check works.
- **License note.** The repository has no LICENSE yet (CLAUDE.md, open question 2c). The file is our
  own work, so it can take whichever license DRI chooses.

## 8. Utah law (re-read for this page) [checked]

- **Utah Code 53G-7-227, "Device prohibition"**, effective 2026-07-01,
  https://le.utah.gov/xcode/Title53G/Chapter7/C53G-7-S227_2026050620260701.html. (1)(b)(i)
  "'Cellphone' means a handheld, portable electronic device that is designed to be operated using one
  or both hands and is capable of transmitting and receiving voice, data, or text communication by
  means of: (A) a cellular network; (B) a satellite network; or (C) any other wireless technology.";
  (1)(d) "School hours" from the start to the end of the school day by the bell schedule, "including
  all instructional time, lunch periods, recess, and transition times between classes"; (2) "Except
  as provided in Subsection (3), a student may not use a cellphone, smart watch, AI glasses, or
  emerging technology at a school during school hours."; (3)(a)(ii)(A) an LEA "may establish a policy
  that provides for other circumstances when a student may use a cellphone ... during the school
  day"; (3)(b)(i) an LEA may "extend restrictions on student use of cellphones, smart watches, or
  emerging technologies to non-school hours, including school-supervised activities". Supports: the
  first two rules bullets ("even phones without a SIM card", "Clubs after the last bell are the easy
  case"). S.B. 69 (2026) made it bell to bell (`planning/phone-sources.md`, section 0).
- **Utah Code 53G-7-228, "Classroom technology requirements -- Model policy on balanced
  technology"**, effective 2026-07-01,
  https://le.utah.gov/xcode/Title53G/Chapter7/C53G-7-S228_2026050620260701.html. (1)(a)
  "'Instructional technology' means technology an LEA issues to a student in connection with the
  student's public education, including: (i) an electronic device; (ii) a digital tool; or (iii) a
  digital application."; (2)(a) "Before an LEA allows a public school to use an instructional
  technology in the classroom, the LEA shall ensure that instructional technology is: ...". Supports:
  "The district approves the app."
- **R277-495, "Electronic Devices in Public Schools"**, https://schools.utah.gov/adminrules/R277-495.php,
  4(2)(g) "prohibition on requiring the use of a privately-owned electronic device to complete course
  work" (quoted from `planning/phone-sources.md`, section 0, checked there on the same date). Supports:
  "No student has to use their own phone."
- **Wasatch Academy** "sets its own policy" (`planning/activities.md`; private, not an LEA under
  53E-1-102(9)). Supports: the last line of the rules section.

## Not tested; left open

- **Not tested on a phone:** the "Open in phyphox" button (and the iPhone's confirmation), the save
  prompt, the readings-per-second display, the export steps and file names. The link works only once
  the page and the file are on the live site (after the merge). A tester with phyphox should try it on
  an iPhone and an Android phone and send Gus what each screen says.
- **QR code:** phyphox's scanner reads a QR code holding the same phyphox:// or https address
  ("Online QR-Codes"), which would help when the page is projected. Not added: making the image needs
  a QR generator (for example the `qrcode` npm package, MIT, as a dev dependency of `tools/figures`),
  and installing it needs Gus's approval. Whether a phone's own camera app opens a phyphox:// code is
  not documented (inferred: iPhones offer to open phyphox; Android varies).
- **Android fallback link:** an `intent://...;scheme=phyphox;package=de.rwth_aachen.phyphox;
  S.browser_fallback_url=...;end` link could send phones without phyphox to Google Play (syntax from
  https://developer.chrome.com/docs/android/intents). Untested; not used.
