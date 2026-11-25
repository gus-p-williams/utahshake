# Sources for the Phone Recorder review

The source log for [review-phone-recorder.md](review-phone-recorder.md) (session
P4-phone-review, 2026-11-25), kept as the project asks (D28, constraint 5): citation, link,
access date, a short quote or the value taken, and what it supports. Kept in `planning/`, so it
is in git but not on the website.

**Accessed 2026-11-25 unless noted.** Research helpers (subagents of this session) read most of
these sources and kept notes with quotes: three in the first round, a fourth in the revision
after critiques R1 and R2 (lab sensors, iPhone test paths, ChromeOS microphone). Entries marked
**[checked]** were fetched by this session itself, because the recommendation rests on them;
section 0 (Utah law and rules) was read entirely by this session for the revision. Short forms:

- CR/ = `https://chromium.googlesource.com/chromium/src/+/refs/heads/main/` (add `?format=TEXT`
  for the raw file, base64)
- WK/ = `https://github.com/WebKit/WebKit/blob/main/` (read through cdn.jsdelivr.net/gh/WebKit/WebKit@main
  when raw.githubusercontent.com rate-limited)
- FF/ = `https://searchfox.org/firefox-main/source/`
- BCD = MDN browser-compat-data 8.1.10 (built 2026-11-19), `https://unpkg.com/@mdn/browser-compat-data/data.json`

## 0. Utah law and State Board rules (re-read for the revision) [checked]

- **Utah Code 53G-7-227, "Device prohibition"**, effective 2026-07-01, "Amended by Chapter 100,
  2026 General Session",
  https://le.utah.gov/xcode/Title53G/Chapter7/C53G-7-S227_2026050620260701.html. (1)(a) defines
  "AI glasses"; (1)(b)(i) "'Cellphone' means a handheld, portable electronic device that is
  designed to be operated using one or both hands and is capable of transmitting and receiving
  voice, data, or text communication by means of: (A) a cellular network; (B) a satellite
  network; or (C) any other wireless technology."; (1)(c)(ii) "'Emerging technology' does not
  include school provided or required devices."; (1)(d) "School hours" bell to bell "including
  all instructional time, lunch periods, recess, and transition times between classes"; (2)
  "Except as provided in Subsection (3), a student may not use a cellphone, smart watch, AI
  glasses, or emerging technology at a school during school hours."; (3)(a)(ii)(A) "an LEA ...
  may establish a policy that provides for other circumstances when a student may use a
  cellphone, smart watch, AI glasses, or emerging technology during the school day"; (3)(b)(i)
  an LEA may extend restrictions to "non-school hours, including school-supervised activities".
  Supports: section 4.1 and 4.4 of the review.
- **S.B. 69 (2026), School Device Revisions, enrolled copy**,
  https://le.utah.gov/Session/2026/bills/enrolled/SB0069.pdf. Amends 53G-7-227 ("Cellular device
  prohibition"): bell-to-bell "school hours", the LEA exception "during the school day"; "This
  bill takes effect on July 1, 2026." It contains no "AI glasses"; the published code adds them
  (R1 attributes them to H.B. 42 through a coordination clause; not checked here). Supports: the
  history in 4.1.
- **Utah Code 53G-7-228, "Classroom technology requirements -- Model policy on balanced
  technology"**, effective 2026-07-01, "Enacted by Chapter 120, 2026 General Session" (H.B. 273,
  "Classroom Technology Amendments", per R2 and the Legislature's bill page title),
  https://le.utah.gov/xcode/Title53G/Chapter7/C53G-7-S228_2026050620260701.html. (1)(a)
  "'Instructional technology' means technology an LEA issues to a student in connection with the
  student's public education, including: (i) an electronic device; (ii) a digital tool; or (iii)
  a digital application."; (2)(a) "Before an LEA allows a public school to use an instructional
  technology in the classroom, the LEA shall ensure that instructional technology is: ... (viii)
  compliant with state standards and law, including: ... Title 53E, Chapter 9, Student Privacy and
  Data Protection."; (3)(e) adopt a policy "before July 1, 2027", including "(C) a requirement of
  transparency with parents regarding instructional technology use"; (5)(c) the Board posts the
  model policy "before December 1, 2026". Supports: section 4.3.
- **Utah Code 53E-1-102(9)**, https://le.utah.gov/xcode/Title53E/Chapter1/C53E-1-S102_2026050620260506.html.
  "'Local education agency' or 'LEA' means: (a) a school district; (b) a charter school; or (c)
  the Utah Schools for the Deaf and the Blind." Supports: Wasatch Academy (private) is not an LEA.
- **Utah State Board of Education, R277-495, "Electronic Devices in Public Schools"**,
  https://schools.utah.gov/adminrules/R277-495.php. "Effective October 8, 2025"; "Date of Last
  Change: October 8, 2025". R277-495-1(2): policies "governing the possession and use of electronic
  devices including: (a) both LEA-owned and privately-owned, while on public school premises";
  2(3) "'Electronic device' means a device that is used for audio, video, or text communication
  or any other type of computer or computer-like instrument"; 2(10) "Public school" means a school
  "that is part of the Utah public school system"; 4(2)(g) "prohibition on requiring the use of a
  privately-owned electronic device to complete course work"; 4(5)(a) "prohibitions or
  restrictions on unauthorized use that would cause invasions of reasonable expectations of
  student and employee privacy"; 5(2)(b) "require that each educator who allows the use of a
  personal electronic device in the classroom clearly communicates to parents and students the
  conditions under which the use of a personal electronic device is allowed." Supports: 4.2, 4.4.
- **Utah State Board of Education, R277-487, "Public School Data Confidentiality and
  Disclosure"**, https://schools.utah.gov/adminrules/R277-487.php: "Effective July 8, 2025".
  Supports: 4.5.
- **Utah State Board of Education, rules in process**,
  https://schools.utah.gov/adminrules/administrativerules/rulesinprocess.php: no amendment to
  R277-487 or R277-495 listed (the November 2026 bulletin lists other rules, e.g. R277-922).
  Supports: "no amendment in process"; corrects the review's first draft and the overview's
  "being amended in fall 2026".

## 1. Motion sensors in browsers

### Rates

- **Chromium, `services/device/public/cpp/generic_sensor/sensor_traits.h`**, CR/ path.
  `static constexpr double kMaxAllowedFrequency = 60.0;` (10.0 for ambient light and
  magnetometer). Supports: Chrome's 60 Hz cap for accelerometer types. **[checked]**
- **Chromium, `services/device/generic_sensor/README.md`**, CR/ path. "The maximum sampling
  frequency is capped at 60Hz for most sensor types."; "At the moment, users are never prompted
  to grant access to a device's sensors"; "instead of exposing an accelerometer reading of
  12.34567m/s^2, we expose a value of 12.3m/s^2 instead." Supports: 60 Hz cap, no prompt,
  rounding. (The questions document cites this file for the cap; correct.)
- **Chromium, `third_party/blink/renderer/modules/device_orientation/device_sensor_event_pump.h`**
  and **`device_sensor_entry.cc`**, CR/ paths. `static constexpr int kDefaultPumpFrequencyHz = 60;`
  and `config->frequency = std::min(... kDefaultPumpFrequencyHz, params->maximum_frequency);`.
  Supports: devicemotion fired by a 60 Hz timer; sensors requested at up to 60 Hz.
- **Chromium, `.../device_orientation/device_motion_event_pump.cc`**, CR/ path.
  `kDefaultPumpDelayMilliseconds = ...kDefaultPumpDelayMicroseconds / 1000` passed as the
  interval; `accelerometer_->GetReading(...)`. Supports: constant `interval` of 16; devicemotion
  reads the same (rounded) buffer as the Generic Sensor API.
- **Chromium, `third_party/blink/renderer/modules/sensor/sensor.cc`**, CR/ path. Frequency clamp
  with "Maximum allowed frequency value for this sensor type is {:.0f} Hz."; `timestamp` from
  `MonotonicTimeToDOMHighResTimeStamp(... GetReading().timestamp())`. Supports: Generic Sensor
  clamp; true reading time stamp.
- **Chromium, Android sensor code**: `services/device/generic_sensor/android/java/src/org/chromium/device/sensors/PlatformSensor.java`
  (`sensorType = Sensor.TYPE_ACCELEROMETER;` / `TYPE_LINEAR_ACCELERATION`; period from the
  capped frequency) and `platform_sensor_provider_android.cc` ("If not we use a fusion algorithm
  to remove the contribution of gravity from the raw ACCELEROMETER"). Supports: which sensors
  back `accelerationIncludingGravity` and `acceleration`.
- **Android Developers, "Sensors overview"**,
  https://developer.android.com/develop/sensors-and-location/sensors/sensors_overview. "the
  sensor sampling rate is limited to 200 Hz" without HIGH_SAMPLING_RATE_SENSORS. Supports: the
  limit exists but is above Chrome's 60 Hz.
- **WebKit, `Source/WebCore/platform/ios/WebCoreMotionManager.h`**, WK/ path.
  `constexpr float kMotionUpdateInterval = 1.0f / 60.0f;`. Supports: 60 Hz on iPhones and iPads.
  **[checked]**
- **WebKit, `.../WebCoreMotionManager.mm`**, WK/ path. `setDeviceMotionUpdateInterval:kMotionUpdateInterval`;
  an NSTimer at the same interval; `static const double kGravity = 9.80665;`;
  `totalAccel.x = userAccel.x + gravity.x;`; no rounding call. Supports: timer-polled 60 Hz;
  values from Core Motion's fusion; no rounding today (the helper's reading of the files
  `WebCoreMotionManager.mm`, `DeviceMotionClientIOS.mm`, `DeviceMotionEvent.cpp`,
  `DeviceMotionController.cpp`). Without a gyroscope, `sendAccelerometerData` calls
  `client->motionChanged(0, 0, 0, accel.x * kGravity, ...)`: `acceleration` is zero and
  `accelerationIncludingGravity` comes from the raw accelerometer. **[checked]** (the
  no-gyroscope path)
- **WebKit bug 145814**, https://bugs.webkit.org/show_bug.cgi?id=145814 (2015, fixed). "In iOS,
  Safari emits DeviceOrientation events at 20 Hz."; reviewer: "The framerate is intentionally
  capped to 60 Hz on iOS." Supports: history of the cap.
- **Firefox, `mobile/android/geckoview/.../GeckoSensor.java`**, FF/ path.
  `private static final int MOTION_SENSOR_DELAY = 16666; // 60Hz`. And `dom/system/nsDeviceSensors.cpp`:
  `#define DEFAULT_SENSOR_POLL 100` passed as `interval`; values passed unrounded; events blocked
  when the window is in the background. Supports: Firefox rate, `interval`, no rounding,
  visibility.

### Rounding to 0.1 m/s²

- **Chromium, `services/device/generic_sensor/platform_sensor_util.h`**, CR/ path.
  `inline constexpr double kAccelerometerRoundingMultiple = 0.1;` with comments citing
  crbug.com/1018180 (fingerprinting) and crbug.com/1031190 ("using the gyroscope as a primitive
  microphone"). Also `kGyroscopeRoundingMultiple = 0.00174532925199432963` with the comment "This
  value corresponds to 0.1 deg./sec.". Supports: the step and why; the gyroscope's step.
  **[checked]**
- **Chromium, `services/device/generic_sensor/platform_sensor.cc`**, CR/ path.
  "// Round the reading to guard user privacy. See https://crbug.com/1018180." then
  `RoundSensorReading(&rounded_reading, type_);` before `WriteToSharedBuffer`. Supports: pages
  see only rounded values. **[checked]** (The "report only if changed" lines in the same function
  apply only to sensors in on-change mode, not to accelerometers.)
- **Chromium, `platform_sensor_util.cc`**, CR/ path. Rounding applied to `ACCELEROMETER`,
  `GRAVITY`, `LINEAR_ACCELERATION`. Supports: all three accelerometer types.
- **Chromium tag 83.0.4103.0**,
  https://chromium.googlesource.com/chromium/src/+/refs/tags/83.0.4103.0/services/device/generic_sensor/platform_sensor_util.h:
  `constexpr double kAccelerometerRoundingMultiple = 0.1;`; the file does not exist at tag
  81.0.4044.0. Supports: rounding since Chrome 83 (2020; Chrome 82 was never released).
  **[checked]** for tag 83. The commit log (sign-in required) and the crbug pages: not read.
- **W3C, Device Orientation and Motion**, Editor's Draft, https://w3c.github.io/deviceorientation/,
  and Candidate Recommendation Draft of 18 November 2026, https://www.w3.org/TR/orientation-event/.
  "If acceleration's x axis acceleration is not null, limit its precision to no more than
  0.1 m/s2." (same for y, z and with gravity); events only when the document's visibility state
  is "visible"; "Further implementation experience is being gathered to inform the limit for the
  maximum sampling frequency cap." Supports: the draft standard's precision limit. Its status is
  a Candidate Recommendation Draft: normative text that browsers implement by choice, not proof
  that any engine rounds today (R1, R2). **[checked]** (Editor's Draft wording)
- **W3C, Accelerometer**, Editor's Draft, https://w3c.github.io/accelerometer/, §8.2. "set
  quantizedReading["x"] to the nearest 0.1 m/s2." Supports: same for the Generic Sensor API.
- **WebKit bug 329553**, https://bugs.webkit.org/show_bug.cgi?id=329553. "[iOS] deviceorientation
  and devicemotion values are not limited to the precision the spec requires", filed 2026-10-30,
  status NEW, keyword `InRadar` (tracked in Apple's internal bug system). The reporter's employer
  is not shown, so the review no longer says "an Apple engineer" (R1). Supports: iPhones don't
  round yet, and the gap is known; not when or whether it will close. **[checked]** (Bugzilla
  REST API: `summary`, `status`, `creation_time`, `keywords`; 329554 and 329556 carry the same
  keyword)
- **J. Jensen, message to the W3C public-privacy list**, 2020,
  https://lists.w3.org/Archives/Public/public-privacy/2020JanMar/0023.html. "I propose rounding
  accelerometer values to the nearest 0.1 m/s^2."; "my testing indicated accelerometer accuracy
  at this level was noise when holding a phone in hand." Supports: where the step came from.
- **Mozilla bug 1642862**, https://bugzilla.mozilla.org/show_bug.cgi?id=1642862: proposes reduced
  precision; open. Search summary only, not opened.
- **web-platform-tests, `/orientation-event/motion/rounding.https.html`** (wpt.fyi API): only
  Edge 158 desktop reported a result. Supports: no automated evidence for Safari either way.

### Permission

- **WebKit, `Source/WebCore/dom/DeviceMotionEvent.cpp`**, WK/ path. "Requesting device motion
  access requires a user gesture to prompt". And `Source/WebCore/page/LocalDOMWindow.cpp`:
  `if (!isSecureContext()) { message = "Browsing context is not secure"_s; return false; }`.
  Supports: a tap and HTTPS are needed on iPhones.
- **WebKit, `Source/WebKit/UIProcess/WebsiteData/WebDeviceOrientationAndMotionAccessController.cpp` and `.h`**,
  WK/ paths. `m_deviceOrientationPermissionDecisions.set(requestOriginData, granted);` in a
  `HashMap<WebCore::SecurityOriginData, bool>`, held in memory. Supports: a grant or a denial is
  kept per site until Safari's process ends (the helper's reading; not device-tested).
- **WebKit blog, "New WebKit Features in Safari 13"**, https://webkit.org/blog/9674/new-webkit-features-in-safari-13/.
  "Developers will now need to call DeviceMotionEvent.requestPermission()". Supports: iOS 13
  (BCD says 14.5; the blog is the better source).
- **MDN, `DeviceMotionEvent.requestPermission()`**,
  https://developer.mozilla.org/en-US/docs/Web/API/DeviceMotionEvent/requestPermission_static.
  "This method requires transient activation". Supports: tap required.
- **Chromium, `components/content_settings/core/browser/content_settings_registry.cc`** and
  **`services/device/public/cpp/device_features.cc`**, CR/ paths.
  `ContentSetting sensors_initial_default = CONTENT_SETTING_ALLOW;` unless
  `kSensorsAllowAskBlockPermissionModel` and `kSensorsAskByDefault` are on; both
  `FEATURE_DISABLED_BY_DEFAULT`. Supports: no prompt today; an "ask" mode is built but off.
- **Chromium, `third_party/blink/renderer/platform/runtime_enabled_features.json5`**, CR/ path.
  `name: "DeviceOrientationRequestPermission", status: "stable",`; BCD lists
  `requestPermission()` in Chrome 152 (stable 2026-08-25 per
  https://chromiumdash.appspot.com/fetch_milestone_schedule?mstone=152). Chromestatus
  (https://chromestatus.com/feature/5051845089689600) still says "In developer trial". Settled by
  D10: "Chrome has the function too (it answers at once)" (`docs/developers/phone-bench.md`,
  Chrome 158). So the function has shipped and answers without a prompt; only the option to
  prompt by default is off.
- **Chromium, `.../device_orientation/device_motion_controller.cc`**, CR/ path.
  `if (!GetWindow().IsSecureContext()) return;` and the `kAccelerometer`/`kGyroscope` policy check.
  Chromestatus: insecure use removed in Chrome 76 (https://chromestatus.com/feature/5688035094036480);
  Feature Policy in 66 (https://chromestatus.com/feature/5758486868656128). Supports: HTTPS;
  iframe policy.

### Hidden page, screen lock, wake lock

- **W3C, Generic Sensor**, https://w3c.github.io/sensors/ §5.5: readings only if the document's
  visibility state is "visible" and the "focus and origin check" passes. Supports: no
  background readings.
- **Chromium, `third_party/blink/renderer/modules/sensor/sensor_proxy.cc`**, CR/ path.
  `if (!GetPage()->IsPageVisible()) return true;` in `ShouldSuspendUpdates()`. **WebKit,
  `Source/WebCore/page/Page.cpp`**: `document.suspendDeviceMotionAndOrientationUpdates();` when
  hidden. **Firefox, `nsDeviceSensors.cpp`**: `if (windowOuter->IsBackground() || ...)`.
  Supports: all three engines stop events when hidden.
- **BCD, `api.WakeLock`**: Chrome and Chrome Android 84, Firefox 126, Safari and Safari iOS 16.4
  (iOS partial until 18.4: "Does not work in standalone Home Screen Web Apps"). **WebKit bug
  254545**, https://bugs.webkit.org/show_bug.cgi?id=254545: "now works in Home Screen Web Apps on
  iOS and iPadOS 18.4"; one later user report of a regression on iOS 26.1 (unverified).
- **MDN, Screen Wake Lock API**, https://developer.mozilla.org/en-US/docs/Web/API/Screen_Wake_Lock_API.
  "A request may be rejected for a number of reasons, including system settings (such as power
  save mode or low battery level) or if the document is not active or visible." Supports:
  re-request on visibility change.
- **WebKit bug 329556**, https://bugs.webkit.org/show_bug.cgi?id=329556. "[iOS] deviceorientation
  and devicemotion events stop arriving while the page scrolls", filed 2026-10-30, NEW.
  Supports: no scrolling while recording. **[checked]**
- iOS Low Power Mode and motion events: no source found.

### Timing

- **WebKit, `Source/WebCore/platform/ios/DeviceMotionClientIOS.mm`**, WK/ path. `DeviceMotionData::create(..., kMotionUpdateInterval)`
  with the interval in seconds. **WebKit bug 329554**, https://bugs.webkit.org/show_bug.cgi?id=329554:
  "[iOS] DeviceMotionEvent.interval is in seconds, but the spec says milliseconds" (filed
  2026-10-30, NEW; "event.interval was 0.01666666753590107"). Supports: `interval` units on
  iPhones. **[checked]** (bug title and status)
- **Chromium, `third_party/blink/renderer/core/timing/time_clamper.h`**, CR/ path.
  `kCoarseResolutionMicroseconds = 100; kFineResolutionMicroseconds = 5;`. **WebKit,
  `Source/WebCore/page/Performance.cpp`**: `static Seconds timePrecision { 1_ms };`. **MDN,
  `Event.timeStamp`**: "In Safari, it is 1 ms ... In Firefox ... 1 ms". Supports: clock
  resolution without cross-origin isolation (GitHub Pages can't send the headers for it).
- **Chromium, ChromeOS sensor backend**, `services/device/generic_sensor/platform_sensor_provider_chromeos.cc`,
  CR/ path: maps accelerometers with locations "base", "lid", "camera". Supports: Chromebooks
  with sensors can report motion; which school models have them is unknown.

### Support matrix

- **BCD 8.1.10**: `DeviceMotionEvent` Chrome 31, Firefox 6, Safari iOS 4.2;
  `requestPermission` Chrome 152, Safari iOS 14.5; `Accelerometer` etc. Chrome 67, not Safari
  or Firefox; `GravitySensor` Chrome 91. Supports: the Generic Sensor API is Chromium-only;
  devicemotion is the only cross-browser choice.

### Sign of the readings on iPhones

- **MDN, `DeviceMotionEvent.accelerationIncludingGravity`**: a phone face up reads z = 9.8.
  WebKit passes Core Motion values with no sign change (helper's reading of
  `WebCoreMotionManager.mm`). Apple's statement of Core Motion's sign convention: not found.
  Unverified; T1 checks.

## 2. Microphone

- **BCD, `api.MediaStreamTrack.applyConstraints.*_constraint`**: echoCancellation Chrome Android
  59, Safari iOS 11; noiseSuppression and autoGainControl Chrome Android 67, Safari iOS "no".
  Supports: Safari honors only echo cancellation.
- **WebKit, `Source/WebCore/platform/mediastream/cocoa/CoreAudioCaptureUnit.cpp`**,
  https://github.com/WebKit/WebKit/blob/main/Source/WebCore/platform/mediastream/cocoa/CoreAudioCaptureUnit.cpp.
  `OSType unitSubType = kAudioUnitSubType_VoiceProcessingIO; if (!shouldUseVPIO) { ... unitSubType = kAudioUnitSubType_RemoteIO;`
  and `m_shouldUseVPIO = enableEchoCancellation();`. Supports: echo cancellation off means no
  voice processing at all on iPhones.
- **Apple, `kAudioUnitSubType_VoiceProcessingIO`**,
  https://developer.apple.com/documentation/audiotoolbox/kaudiounitsubtype_voiceprocessingio.
  "provides voice processing features". Supports: what the unit does.
- **WebKit bugs**: 204444 (autoGainControl not implemented, open since 2019); 179411
  ("getUserMedia with echoCancellation false should work on both MacOs and iOS", WebKit
  engineer); 326286 (iOS 26.2 to 27: with echo cancellation off, output "moves to the receiver
  (earpiece) at much lower volume"); 218012 (opening the microphone changes the audio
  category); 325916 ("a `MediaRecorder` that enters the recording state outside that tap's event
  handler stops microphone capture"); 311451 (user report: echo cancellation is the only
  constraint Safari uses). All at https://bugs.webkit.org/show_bug.cgi?id=NNNNNN.
- **MDN, `getUserMedia()`**, https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getUserMedia.
  "can only be used in secure contexts". Supports: HTTPS.
- **MDN, `AudioContext()`**, https://developer.mozilla.org/en-US/docs/Web/API/AudioContext/AudioContext.
  Default rate is "the new context's output device's preferred sample rate". **BCD**:
  `AudioContext` sampleRate option Chrome Android 74, Safari iOS 14.5; `AudioWorklet` Chrome
  Android 66, Safari iOS 14.5; `MediaRecorder` Chrome Android 47, Safari iOS 14.
- **WebKit bug 326286, comments 7 and 8**: "All AudioContexts and the mic report 48000 Hz."
  (reporters on iPhone 16, iOS 27). Supports: 48 kHz on recent iPhones (not an Apple statement).
- **WebKit blog, "MediaRecorder API"** (2020), https://webkit.org/blog/11353/mediarecorder-api/.
  "Safari currently supports the MP4 file format with H.264 as video codec and AAC as audio
  codec." Supports: lossy recordings on Safari.
- **WebKit bugs 215884 and 280394**: "In iOS Safari, users can persistently grant camera/microphone
  access from Safari UI."; "If capture is not ongoing, prompt should happen again after 1 minute
  of inactivity." (WebKit engineer, 215884); "after refreshing the page the permission is reset
  and I will be asked once again" (280394, open). Supports: the microphone re-prompts on iPhones.
- **Google Chrome Help, camera and microphone (Android)**, https://support.google.com/chrome/answer/2693767?co=GENIE.Platform%3DAndroid:
  "Allow while visiting the site," "Allow this time," or "Never allow." And **Chrome for
  Developers, "One-time permissions in Chrome"**, https://developer.chrome.com/blog/one-time-permissions.
- Microphone and motion together on iPhones: no source found (WebKit Bugzilla searches); T1.

## 3. School-managed Chromebooks (Chrome Enterprise policies)

All from Chromium's policy definitions, CR/`components/policy/resources/templates/policy_definitions/`:

- `Miscellaneous/AudioCaptureAllowed.yaml`: "leaving it unset means that, with the exception of
  URLs set in the AudioCaptureAllowedUrls list, users get prompted". `AudioCaptureAllowedUrls.yaml`:
  "A match grants access to audio capture devices without prompt"; "*" not supported.
- `ContentSettings/DefaultSensorsSetting.yaml`: "Leaving it unset means AllowSensors applies, but
  users can change this setting." `SensorsAllowedForUrls.yaml` / `SensorsBlockedForUrls.yaml`:
  the blocked list wins.
- `Miscellaneous/DownloadRestrictions.yaml` ("3: Blocks all downloads"),
  `AllowFileSelectionDialogs.yaml`, `ContentSettings/DefaultFileSystemWriteGuardSetting.yaml`.
- `Miscellaneous/ClearBrowsingDataOnExitList.yaml`; `Signin/DeviceEphemeralUsersEnabled.yaml`
  ("all data from the user session will be discarded after logout").
- `Miscellaneous/NearbyShareAllowed.yaml`: "If this policy is left not set, the default is not
  allowed for enterprise-managed users". `WebRtc/WebRtcIPHandling.yaml`;
  `ContentSettings/DefaultWebBluetoothGuardSetting.yaml`.
- Chrome Enterprise policy site (chromeenterprise.google/policies): not read; the source files
  above were used instead.

## 4. Saving, sharing, storing and loading files

- **BCD, `html.elements.a.download`**: Safari iOS 13, Chrome Android 18. **MDN, `<a>`**,
  https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/a: "`download` only works
  for same-origin URLs, same-origin `blob:`, and `data:` schemes."
- **Apple Support, "Where to find downloads on your iPhone or iPad"** (2025-12-17),
  https://support.apple.com/en-us/102440: "you can find it in your Downloads folder in the Files
  app."
- **BCD, `api.Window.showSaveFilePicker`**: Chrome 86, Chrome Android 132, not Safari.
- **BCD, `api.Navigator.share` (files)**: Chrome Android 76, Safari iOS 14, Chrome desktop 89
  (ChromeOS and Windows) then 128 (all). **W3C, Web Share API** (Recommendation, 2023),
  https://www.w3.org/TR/web-share/: rejected without "transient activation"; default allowlist
  'self'; `[SecureContext]`.
- **Chromium, `third_party/blink/renderer/modules/webshare/FILE_TYPES.md`**, CR/ path: "csv" -
  text/csv, "txt" - text/plain, "wav" - audio/wav; no json. **[checked]** Also
  `chrome/browser/webshare/share_service_impl.h` (`kMaxSharedFileCount = 10`,
  `kMaxSharedFileBytes = 50 * 1024 * 1024`) and the Android `ShareServiceImpl.java` list.
  Safari's shareable types: not found.
- **MDN, "Storage quotas and eviction criteria"**,
  https://developer.mozilla.org/en-US/docs/Web/API/Storage_API/Storage_quotas_and_eviction_criteria:
  "up to 5 MiB of local storage"; "If an origin has no user interaction, such as click or tap,
  in the last seven days of browser use, its data created from script will be deleted."
- **WebKit blog, "Updates to Storage Policy"** (2023), https://webkit.org/blog/14403/updates-to-storage-policy/
  (quotas; persist() "based on heuristics like whether the website is opened as a Home Screen Web
  App"), and **"Full Third-Party Cookie Blocking and More"** (2020),
  https://webkit.org/blog/10218/full-third-party-cookie-blocking-and-more/ ("deleting all of a
  website's script-writable storage after seven days"; home-screen web apps "have their own
  counter of days of use").
- **web.dev, "Storage for the web"** (2024), https://web.dev/articles/storage-for-the-web: a
  home-screen web app on iOS "creates a new storage container, and nothing is shared". **web.dev,
  "Persistent storage"**, https://web.dev/articles/persistent-storage. **WebKit blog, "Private
  Browsing 2.0"** (2024), https://webkit.org/blog/15697/private-browsing-2-0/.
- **MDN, `<input type="file">`** and **`Blob.text()`**; BCD `Blob.text` Chrome Android 76,
  Safari iOS 14.5. Supports: reading a picked file with no upload.

## 5. QR codes

- **DENSO WAVE, "Information capacity and versions of the QR Code"**,
  https://www.qrcode.com/en/about/version.html (tables in versionPage1_10.html etc.): Version 40
  holds 2,953 bytes at level L; Version 10 holds 271 (L) or 213 (M) bytes.
- **BCD, `api.BarcodeDetector`**: Chrome Android 83; Chrome 88 on ChromeOS and macOS only; Safari
  iOS behind a flag. Supports: iPhones need a library to scan.
- **Licenses** (npm registry and GitHub API): jsQR 1.4.0 Apache-2.0; qrcode-generator 2.0.4 MIT;
  Nayuki QR-Code-generator MIT (README); @zxing/library Apache-2.0, "maintenance mode";
  qr-scanner MIT; barcode-detector MIT.
- **Apple Support, "Scan a QR code with your iPhone or iPad"**, https://support.apple.com/en-us/102680:
  "tap the link to open the content." Android camera behavior: not read.
- **RFC 3986 §3.5**, https://www.rfc-editor.org/rfc/rfc3986.txt, and **MDN, "URI fragment"**:
  "The fragment is not sent to the server". Supports: results after `#` stay in the browser.

## 6. Phone to phone in the same room

- **Measured by a research helper**: a WebRTC data-channel offer from headless Chrome 158 with no
  ICE servers was 587 characters (answer 585), with one mDNS host candidate (`….local`). Script
  in the session's scratchpad, not in the repo.
- **RFC 8828**, https://www.rfc-editor.org/rfc/rfc8828.txt (browsers hide local addresses
  without consent); **draft-ietf-mmusic-mdns-ice-candidates-03** (mDNS names).
- **Cisco Meraki, "Wireless Client Isolation"**,
  https://documentation.meraki.com/Wireless/Operate_and_Maintain/How_Tos/Firewall_and_Traffic_Shaping/Wireless_Client_Isolation:
  "prevents wireless clients from communicating with one another"; "Basic Client Isolation is
  enabled by default when the SSID is configured for NAT mode and cannot be disabled."
- **Web Bluetooth**, https://webbluetoothcg.github.io/web-bluetooth/: pages run "in the Central
  role". **BCD**: `Bluetooth` Chrome Android 56, not Safari iOS; `NDEFReader` Chrome Android 89
  only. **Web NFC**, https://w3c-cg.github.io/web-nfc/: "peer-to-peer is not supported".
- **ggwave**, https://github.com/ggerganov/ggwave (MIT): "The bandwidth rate is between 8-16
  bytes/sec".
- **Google Chromebook Help, "Share files with nearby devices"**,
  https://support.google.com/chromebook/answer/10751738: "If you use your Chromebook at work or
  school, you may not be able to use these features with your phone."

## 7. Old phones

- **Google, Chrome browser system requirements**, https://support.google.com/chrome/a/answer/7100626:
  Android "Android 10 or later". Supports: current Chrome needs Android 10. **[checked]**
  (Background, search results only: Chrome 138 was the last for Android 8 and 9; Chromium-dev
  PSA https://groups.google.com/a/chromium.org/g/chromium-dev/c/vEZz0721rUY.)
- **Apple Support, "How to download iOS 26"**, https://support.apple.com/en-us/123705: "iOS 26 is
  compatible with iPhone models" from the iPhone 17 back to the iPhone 11 and iPhone SE (2nd
  generation). **Apple Support, "iPhone models compatible with iOS 27"**,
  https://support.apple.com/guide/iphone/iphone-models-compatible-with-ios-27-iphe3fa5df43/ios:
  the list starts at "iPhone 11", "iPhone 11 Pro", "iPhone 11 Pro Max", "iPhone SE (2nd
  generation)". Supports: older iPhones stay on older iOS and Safari. **[checked]**

## 8. Existing apps and browser recorders

- **phyphox**: home https://phyphox.org/ ("Download for free"); export formats
  https://phyphox.org/export-formats/ (CSV, tab-separated, Excel); remote control
  https://phyphox.org/remote-control/ ("Many more professional WIFI setups do not allow for
  devices to communicate to each other"); privacy https://phyphox.org/privacy/ ("Any measured
  data is only stored on the device running the app"); sensor database
  https://phyphox.org/sensordb/stats.php (about 5,600 devices; accelerometer rates cluster near
  100, 200, 400 and 500 Hz; resting noise mostly 0.005 to 0.05 m/s², read from plots; "We can not
  guarantee that this information is accurate."); experiments https://phyphox.org/experiment/
  ("(In)elastic collision"); wiki "Acoustic Stopwatch"
  https://phyphox.org/wiki/index.php/Experiment:_Acoustic_Stopwatch ("1ms resolution should be no
  problem" in theory). GitHub API for phyphox/phyphox-android: GPL-3.0, v1.2.1 2026-09-04;
  F-Droid https://f-droid.org/en/packages/de.rwth_aachen.phyphox/. Staacks et al. (2018),
  Physics Education 53, 045009, https://arxiv.org/abs/1804.06239.
- **Physics Toolbox Sensor Suite**: https://www.vieyrasoftware.net/ ("Free, with optional Pro
  features"; CSV); Google Play listing updated 2026-11-22.
- **Arduino Science Journal**: App Store https://apps.apple.com/us/app/arduino-science-journal/id1518014927
  (6.8.0, 2026-09-28; "When signed in, you can now both share recordings and save them to
  Files"); Google Play updated 2026-09-24.
- **MyShake**: Zhang, Kong, Ruan, Lv and Allen (2024), arXiv:2407.03570,
  https://arxiv.org/pdf/2407.03570 ("designed to sample accelerometer data at 25 Hz"; 31.1% of
  waveforms undersampled). FAQ https://myshake.berkeley.edu/faq.html: search summary only.
- **FizziQ**, https://www.fizziq.org/en/ ("Free · No advertising · No personal data
  collection"); ball-drop activity https://www.fizziq.org/en/activities/fall-of-a-meteorite/
  (expected 0.05 to 2 m/s² on a table; vendor's expected values, not measurements).
- **Nishioka and Tanaka (2026)**, "A Rotation-Compensated Smartphone Accelerometer Application
  for Undergraduate Mechanics Experiments", arXiv:2603.04721, https://arxiv.org/pdf/2603.04721:
  "installation-free and can be accessed directly through a smartphone browser"; "Download data
  as CSV". Code at github.com/natieck/phys_apps has no license file (GitHub API license 404).

## 9. Phone sensor noise and measured browser rates

- **Bosch Sensortec datasheets**: BMI270 rev 1.6 (0.16 mg/√Hz; 0.75 mg rms at 50 Hz output rate),
  https://www.bosch-sensortec.com/media/boschsensortec/downloads/datasheets/bst-bmi270-ds000.pdf;
  BMA456 rev 3.6 (120 µg/√Hz); BMI160 (180 µg/√Hz typical). Supports: noise 0.006 to 0.010 m/s²
  over 0 to 30 Hz (our calculation).
- **Zhang, Mokus, Casoli, Eddi and Perrard**, "Distributed network of smartphone sensors",
  arXiv:2501.04886 (v5, 2026-01-02), https://arxiv.org/pdf/2501.04886: "The typical sampling
  frequency of the accelerometer is 400 Hz"; "The typical acceleration error is a = 0.02 m s-2
  in the direction perpendicular to gravity and a = 0.07 m s-2 along the direction of gravity."
  Supports: the questions document's phone noise is from a native app at 400 Hz, not a browser.
- **Vezio, Mingozzi, Passarella and Poli (2024)**, Scientific Reports 14:23017,
  doi:10.1038/s41598-024-72929-4: native resolution 0.0048 m/s², noise 0.016 m/s²; signals near
  1e-4 m/s² seen in spectra by averaging; time-base errors depend on the app.
- **Mehrnezhad et al. (2016)**, arXiv:1602.04115 (browsers 3 to 5 times slower than native;
  iOS 8.2 at 20 Hz) and **Das et al. (2016)**, arXiv:1605.08763 (rates varying with load). Old
  measurements, before today's fixed 60 Hz code.

## 10. Signal sizes (anchors for our estimate)

- **Caltrans (2020), Transportation and Construction Vibration Guidance Manual**,
  https://dot.ca.gov/-/media/dot-media/programs/environmental-analysis/documents/env/tcvgm-apr2020-a11y.pdf:
  Table 18 "Jackhammer 0.035" in/sec at 25 ft (citing FTA 2018); distance law with "n = 1.1",
  "FTA recommends a value of "n" of 1.5"; Table 6 (Wiss 1974) 0.035 in/s "Barely perceptible",
  0.24 "Distinctly perceptible". Supports: the jackhammer anchor, the fall-off law, the
  "if you can feel it" rule.
- **FTA (2018), Transit Noise and Vibration Impact Assessment Manual**: not read (HTTP 403); its
  value taken from Caltrans.
- **Raspberry Shake community forum, "Let's get jumping"** (2019),
  https://community.raspberryshake.org/t/lets-get-jumping/719: "placing the RS within 2 feet of
  where the jumper is located, we "max out" the geophone sensor". Forum post; Shake model and floor
  not stated.
- **Wijayaraja et al. (2024)**, IEEE Access, arXiv:2406.05140, https://arxiv.org/pdf/2406.05140:
  elephant stomps 48.7 µm/s peak to peak at 3 to 12 m and 17.0 µm/s at 40 m (citing
  O'Connell-Rodwell, Arnason and Hart 2000, JASA 108:3066); people jumping saturated their
  amplified geophone.
- **Ekimov and Sabatier (2006)**, ASA lay-language paper,
  https://acoustics.org/pressroom/httpdocs/151st/Ekimov.html: footsteps −86 dB re 1 g at 17 Hz
  (about 5e-4 m/s²). Supports: walking is invisible to phones.
- **Keiswetter, Miller and Steeples (1992)**, Kansas Geological Survey OFR 92-38,
  https://www.kgs.ku.edu/Publications/OFR/1992/KGSOFR1992-38.pdf: relative sledgehammer
  amplitudes only, no absolute ground motion. Supports: the gap in published data.
- **Salaree, Stein, Saloor and Elling (2017)**, AGU poster ED21B-0278,
  https://agu.confex.com/agu/fm17/mediafile/Handout/Paper245182/agu_2017_smartphones.pdf: a 3 m
  array of phones on a table; their table speed of 3,500 m/s implies 0.9 ms across it, less than
  one phone sample (our note). Supports: P3's "why not arrival times".

## 11. Classroom precedents (P4, P5, P6)

- **Castro-Palacio et al. (2013)**, Am. J. Phys. 81, 472, arXiv:1212.4403: phone on a spring
  at 50 Hz; "discrepancies are less than 1 % in most of cases".
- **Riley (2023)**, ASEE, https://peer.asee.org/mobile-phone-based-contact-and-non-contact-vibration-sensing-for-structural-dynamics-teaching-laboratories.pdf:
  at 60 Hz one 2.4 Hz period to ±4%, ten cycles to ±0.4%.
- **Feng, Fukuda, Mizuta and Ozer (2015)**, Sensors 15:2980, https://pmc.ncbi.nlm.nih.gov/articles/PMC4367344/:
  iPhones on a shake table at 100 Hz, frequency error under 1%.
- **Aguiar and Laudares (2003)**, Am. J. Phys. 71, 499, arXiv:physics/0210092: bounce timing by
  sound at 22,050 Hz, "g = 982 ± 3 cm/s2".
- **Kuhn and Vogt (2012)**, The Physics Teacher 50, 504, and **Schwarz, Vogt and Kuhn (2013)**,
  The Physics Teacher 51, 312: search summaries only, full text not read.

## 12. From this repository

- `planning/activities.md` (2026-11-24): the P cards; Appendix B1 (Shake 0.08 µm/s, clipping about
  21 mm/s; phone column), B3 (locating by strength, ±11 ms between two phones, the fall-off on
  soil), B6, Appendix C (district policies found online; Wasatch Academy "sets its own policy"),
  Appendix D (trials), Appendix E (tools), and its source list (including Peng et al. 2007,
  BeepBeep). Since the revision, section 4 of the review rests on the statutes and rules in
  section 0 above, not on Appendix C.
- `planning/critique-r1-claude.md` and `planning/critique-r2-codex.md` (2026-11-25): the findings
  answered in the review's section 7. R1's flicker table (its finding P4-S1) is reproduced in the
  review's Appendix A2 after checking the arithmetic.
- `planning/review-shake-viewer.md` (P3): the V1 day viewer and its file reader, which the phone
  CSV adapter builds on.
- **Phone Bench** (D10-phone-bench, merged; D36): guide `docs/apps/phone-bench.md` (a T1 take; the
  results table, including "Flicker at rest"; "Why the numbers come in steps"; "Extra checks"),
  developer notes `docs/developers/phone-bench.md` (permission inside the tap; "After trial T1":
  the 40 Hz test, a spectrum, Generic Sensor time stamps and an event list deferred), library
  `docs/app/js/lib/bench.js` (`timing`, `stepReport`, `flicker`, `detectTaps`, ...). D10's own
  source log is `planning/bench-sources.md` (its Chrome 158 rounding check with DevTools sensor
  emulation: 0.123, 0.234, 9.81 read as 0.1, 0.2, 9.8).
- **Reading a seismogram, "How small a shake can it see?"**, `docs/theory/seismograms.md#how-small-a-shake`:
  "at rest, most phones flicker by one step in at least one direction"; "At 10 Hz, one step
  equals a ground speed of 1.6 mm/s, about 20,000 times the smallest shake a Raspberry Shake can
  see." **Decision D36** (`planning/decisions.md`) and the phone-card rule in
  `docs/developers/adding-a-card.md` (remind teachers of the rounding; link to that section).
- Git history (`git log` on `docs/app/js/wave-race`, `docs/app/js/quake-explorer` and their
  pages): Quake Locator, one commit on 2026-11-23 and 12 on 2026-11-24; Quake Explorer, a first
  build on 2026-11-24 and follow-ups to 2026-11-25. Supports: the 2 to 3 times calibration in
  section 5.

## 13. Lab sensors (revision, after R1)

- **Vernier, Go Direct Acceleration Sensor (GDX-ACC)**, https://www.vernier.com/product/go-direct-acceleration-sensor/:
  "Low acceleration: ±157 m/s2 (±16 g)"; "High acceleration: ±1,960 m/s2 (±200 g)"; Chromebook,
  "Graphical Analysis (Web App)", "Full support". **Manual**, https://www.vernier.com/manuals/gdx-acc/:
  "Maximum data‑collection rate 1000 sample/second (gyro and accelerometer)"; USB 2.0 and
  "Bluetooth v4.2". No resolution or noise figure is published (manual, product page, FAQ
  https://www.vernier.com/til/4083).
- **Vernier, Graphical Analysis**, https://www.vernier.com/product/graphical-analysis/: "Chromebook
  running ChromeOS™ 132 or newer"; Basic "$0". TIL 12770, https://www.vernier.com/til/12770: "Export
  data as csv or ambl" in Basic and Pro. TIL 19256, https://www.vernier.com/til/19256: apps "have no
  user logins", "run locally". **godirect-js**, https://github.com/VernierST/godirect-js: "currently
  only implemented using WebBluetooth and WebHID"; BSD 3-Clause.
- **PASCO, PS-3223**, https://www.pasco.com/products/sensors/wireless/ps-3223: "Range: ±16 g";
  "0.002 g at 20 Hz"; maximum rate "5 kHz"; "Bluetooth 5.2". **[checked]** **SPARKvue**,
  https://www.pasco.com/products/software/sparkvue: "Progressive Web App (PWA) for Desktop, Laptop,
  and Chromebook™ Devices"; "completely FREE for all users"; export "to a .csv file". Knowledge base
  6, https://pasco.com/support/knowledge-base/6: connect sensors "through the Sparkvue PWA".
- **micro:bit V2**: dev-docs, https://tech.microbit.org/hardware/2-2-revision/ (LSM303AGR; "2/4/8/16g
  ranges"; Bluetooth 5.1 LE); CODAL core `LSM303Accelerometer.cpp`, https://github.com/lancaster-university/codal-core
  ("Place the device into normal (10 bit) mode"; "Scale into millig (approx)") and
  `Accelerometer.cpp` ("Set a default rate of 50Hz and a +/-2g range"); MakeCode `libs/core/input.cpp`,
  https://github.com/microsoft/pxt-microbit ("z=-1024" lying flat, so 1024 units per g). Step at
  ±2 g about 3.9 mg = 0.038 m/s² (the helper's arithmetic, matching an independent driver's 4 mg per
  step). Bluetooth profile, https://lancaster-university.github.io/microbit-docs/resources/bluetooth/bluetooth_profile.html;
  serial "Baud rate = 115200", https://support.microbit.org/en/support/solutions/articles/19000022103.
- **No Web Serial, WebUSB or Web Bluetooth in Safari**: MDN browser-compat-data (Serial, USB,
  Bluetooth: Safari `false`); WebKit, https://webkit.org/tracking-prevention/, lists "Web
  Bluetooth", "Serial API", "Web USB" among features it has "decided to not yet implement".
  **Chrome for Developers, Web Serial**, https://developer.chrome.com/docs/capabilities/serial:
  ChromeOS from Chrome 89.

## 14. Testing on an iPhone before `main` (revision, after R1)

- **mkcert README**, https://github.com/FiloSottile/mkcert: "On iOS, you can either use AirDrop,
  email the CA to yourself, or serve it from an HTTP server. After opening it, you need to install
  the profile in Settings > Profile Downloaded and then enable full trust in it."; the
  `rootCA-key.pem` file "gives complete power to intercept secure requests from your machine. Do
  not share it." **Apple**, https://support.apple.com/en-us/102390: "Settings > General > About >
  Certificate Trust Settings".
- **Cloudflare, Quick Tunnels**, https://developers.cloudflare.com/tunnel/get-started/quick-tunnels/:
  "You do not need a Cloudflare account or domain."; "Quick Tunnels are for testing and
  development."; "Anyone with the URL can access your local service."; "no uptime guarantee";
  "up to 200 in-flight requests"; "The hostname changes each time".
- **GitHub Docs, Pages and HTTPS**, https://docs.github.com/en/pages/getting-started-with-github-pages/securing-your-github-pages-site-with-https:
  github.io sites "are served over HTTPS automatically".
- **Apple Developer, "Inspecting iOS and iPadOS"**, https://developer.apple.com/documentation/safari-developer-tools/inspecting-ios:
  "Web content on iOS and iPadOS is inspectable when you connect the device to your Mac."
  **google/ios-webkit-debug-proxy**, https://github.com/google/ios-webkit-debug-proxy ("works on
  Linux, MacOS & Windows"); **ios-safari-remote-debug-kit**, https://github.com/HimbeersaftLP/ios-safari-remote-debug-kit
  (GPL-3.0; "debug your websites ... running in iOS Safari from a PC running Windows or Linux").
- **MDN, Secure contexts**, https://developer.mozilla.org/en-US/docs/Web/Security/Defenses/Secure_Contexts:
  `http://localhost` is secure, a plain `http://` address on the network is not. Supports: why a
  LAN test needs HTTPS.

## 15. ChromeOS microphone processing (revision, after R1)

- **Google Chromebook Help**, https://support.google.com/chromebook/answer/10045949: "Only some
  devices support noise cancellation."; "Under "Input," turn Noise cancellation on or off."; and
  https://support.google.com/chromebook/answer/10264237: Studio-style mic "Combines noise
  cancellation (removing sound that isn't speech) and AI-based audio enhancement".
- **Chromium, `media/base/media_switches.cc`**: `BASE_FEATURE(kCrOSSystemVoiceIsolationOption,
  base::FEATURE_DISABLED_BY_DEFAULT);` **[checked]** **`media/audio/cras/cras_input.cc`**: Chrome
  asks the ChromeOS audio server for echo cancellation, noise suppression and gain control per
  stream; voice isolation is client-controlled only when that feature is on. **Blink,
  `media_stream_audio_processor_options.h`**: "Voice isolation behavior selected by the system is
  used." Supports: the three constraints turn off Chrome's processing but not the system switch.
- **CRAS (ChromeOS audio server), `cras/server/s2/src/global.rs`**,
  https://chromium.googlesource.com/chromiumos/third_party/adhd/: the stream follows
  `state().input.voice_isolation_ui_enabled` unless client-controlled; "Krisp NC enablement is
  controlled by Admin Console policy, disregarding `enabled` from system UI." Supports: a school
  admin policy may turn noise cancellation on. Behavior on a real school Chromebook: not tested.

## Not read

- Chromium commit log and crbug.com/1018180, 1031190, 947112 (sign-in or not fetched).
- H.B. 42 (2026), the source R1 gives for "AI glasses" in 53G-7-227: not read; the review cites
  the code as published. The Legislature's bill pages render in the browser, so chapter numbers
  could not be matched to bills with a plain fetch.
- https://sensorid.cl.cam.ac.uk/ (a claim that iOS 12.2 added noise to motion data): fetch failed.
- Apple documents on Core Motion's sign convention and on Low Power Mode: not found.
- Apple's own Safari website-settings page (no article body); Apple's AirDrop restriction page.
- The Chrome Enterprise policy site; the blink-dev "Intent to Ship" for the motion permission
  (search results only).
- ST LSM6DSO and LSM6DSV16X datasheets (timeouts); the FTA 2018 manual (403); Hons (2008) MSc
  thesis (SSL error); DTIC AD1131695 and a UNL Army paper (403); ResearchGate "Turn your
  smartphone into a geophysics lab" (403); "The Sound of G" (DOAJ, 403); the phyphox wiki page for
  "(In)elastic collision" (no text).
- Practical QR size to scan from a screen; Android camera handling of QR links; Safari's
  shareable file types; Android microphone sample rates: no source found (T1 checks).
- Revision: the ST LSM303AGR datasheet (timed out); Vernier's old "Go Direct 3-Axis Accelerometer"
  page (404; GDX-ACC appears to be its successor); localhost.run's docs (TLS refused); the Chromium
  file that turns audio constraints into stream flags (not located); a Google Admin Console page on
  Krisp noise cancellation.
