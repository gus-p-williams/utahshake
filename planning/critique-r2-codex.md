# Independent critique: Shake viewer, DRI data path, and phone recorder

*R2-app-critique, 2026-11-25. Independent review of the four requested documents and their
source logs. I read `CLAUDE.md` first. I did not read any other critique file. External claims
were checked against primary sources linked below. This is a review, not a legal opinion or
implementation plan.*

## 1. `review-shake-viewer.md` and `viewer-sources.md`

### MUST — The publication delay is not enforced

**Where:** §§2.0.4, 2.2–2.3, 2.7; §4.2 and connection steps 6.3–6.5. Related: the data spec,
§§4.2, 5.1, 5.3, 8 and 11.

**Problem:** `publicUntil` is only a claim in JSON. A public SDS day file that contains samples
after the cutoff remains fetchable. An hourly growing file can expose the latest samples, and
the GitHub Actions product job can publish summaries newer than the allowed release time.
`Cache-Control` and an index timestamp do not enforce an embargo. Exact timestamps, school
names and coordinates can also make delayed records useful for inferring occupancy. The
Raspberry Shake Data Sharing License makes data immediately public when sharing is enabled;
the separate DRI feed still needs its own school and district publication decision.

**Evidence:** The [Raspberry Shake license](https://raspberryshake.org/license/) says shared
data immediately become freely available and waives privacy rights in those data. Utah's
[R277-487](https://schools.utah.gov/adminrules/R277-487) sets LEA privacy and security
governance requirements; it does not settle this particular occupancy decision.

**Suggested change:** Default to private data. Require recorded DRI/LEA approval covering
station identity, location, raw waveforms, derived products and release delay. Separate private
ingest from public publication, promote only eligible objects after an exact UTC cutoff, and
make all products obey the same cutoff. Add an acceptance test that attempts to fetch post-cutoff
data. Do not publish a school-to-station map or raw files before the approval.

### MUST — The draft connection steps need a technical gate and a teacher-facing rewrite

**Where:** §6.1 steps 1–10; §§6.3, 6.6–6.7.

**Problem:** The draft asks a teacher to find hardware, read or change Shake settings, and
assess network state before DRI and school IT approve the feed. It says a live StationView trace
is a quick clock check; that is not evidence of clock accuracy. Increasing retention from seven
days to 30 without checking model, channel count and free card capacity could fill the Shake's
storage. The firewall list mixes Shake cloud viewing, updates, sharing, bridge upload and
student-browser access. Several steps are labelled `[works today]` although the document says
they have not been tried at UHSN schools.

**Evidence:** The [Raspberry Shake download manual](https://manual.raspberryshake.org/download.html)
confirms SFTP archive access and seven-day default retention, and warns that increasing
retention risks filling the disk. The [local monitoring guide](https://manual.raspberryshake.org/shakemon.html)
describes direct checks; a live trace appearing online is not a clock-accuracy measurement.

**Suggested change:** Put DRI inventory, ownership/model confirmation, license review and
district publication approval first; then school IT network/security approval; then a DRI bench
test of SFTP, time sync and storage capacity; then a one-school bridge pilot and release. Keep
teacher instructions read-only (locate, verify, report). Put separate, path-specific firewall
lists in an IT appendix. Mark steps untested until checked against an installed UHSN device.

### SHOULD — F2 is plausible, but operations and alternatives are underdeveloped

**Where:** Summary; §§2.2, 2.7, 5, 6.3 and 7.1; companion source log.

**Problem:** A bridge that pulls documented SFTP files and uploads outward is a sound default.
But an unattended Linux device holding each Shake password and upload credential requires a
lifecycle: hardening, patching, credential rotation, scoped write access, monitoring, recovery
and local support. The UDP fallback has neither retransmission nor authentication; it is not
equivalent to the bridge. The options also omit reuse of an already managed DRI/UETN gateway or
school IT-managed host if one exists. The review separates Claude session-days from DRI staff
time in places, but five endpoint installs, security review, school coordination and recurring
support need explicit owner-hours.

**Evidence:** The [Raspberry Shake UDP manual](https://manual.raspberryshake.org/udp.html)
describes a one-way, unacknowledged stream. [rsudp](https://github.com/raspishake/rsudp)
documents its datacast receiver/writer and one-Shake-per-port behavior.

**Suggested change:** Keep bridge pull as the recommended path, conditional on IT security
review and a one-school pilot. Add the managed-gateway option to discovery questions. Mark UDP
as a limited, monitored pilot with gaps and source-validation limitations. Estimate DRI IT,
UHSN and school IT labor and ongoing operating ownership separately from Claude session-days.

### CONSIDER — Teacher-only station-code entry does not make a shared Shake private

**Where:** §§2.0.4 and 3.1–3.3; §6.1 steps 6–8.

**Problem:** L2 avoids publishing a station-to-school table on this site, but a shared Shake is
already visible in Raspberry Shake's public services. A teacher-only code entry does not resolve
the school's occupancy or naming decision.

**Evidence:** The [Data Sharing License](https://raspberryshake.org/license/) makes shared data
freely available immediately.

**Suggested change:** State that the link is only for a station whose sharing and public
identification have been approved. Keep links out of student-facing materials until that
decision is documented.

**Verdict:** The file-first viewer and bridge direction fit the browser-only and no-inbound-port
constraints, and the review recognizes license gray areas. Do not treat the public feed or
connection steps as deployable until authorization, occupancy privacy, storage capacity and a
real-device pilot are settled.

## 2. `brief-dri-it.md`

### MUST — Make publication authorization a first decision

**Where:** “What this is about,” “Security and privacy,” and questions 8–9.

**Problem:** The brief frames this mainly as storing “records of ground motion” and says no
student data are involved. That understates the occupancy signal and the association between a
waveform, named school and location. Question 8 asks about delay, but not who approves named
publication or which metadata and products that approval covers. Question 9 asks about
agreements “given that no student data are involved,” which risks treating that fact as a reason
to skip LEA privacy/security review.

**Evidence:** The [Raspberry Shake Data Sharing License](https://raspberryshake.org/license/)
makes shared data public immediately. [R277-487](https://schools.utah.gov/adminrules/R277-487)
sets school privacy and security governance requirements. Neither resolves the local decision
about publishing school activity data.

**Suggested change:** Add a first decision: who owns each instrument and data stream, and which
DRI/LEA authority approves public station identity, location, timing, raw data, products and
retention. State that nothing goes public until that approval and Raspberry Shake authorization
are documented.

### SHOULD — Correct capacity units and separate measured Shake sizes from estimates

**Where:** “Rough sizes” table and question 4.

**Problem:** The manual says a daily file is generally “about 15 Mb,” while the brief treats
this as up to 15 MB. The 6–10 MB measurements are EarthScope professional channels, not the
installed Raspberry Shake models. There is an eightfold unit ambiguity and no measured ceiling
for each school model/channel.

**Evidence:** The [manual's download page](https://manual.raspberryshake.org/download.html)
uses “15 Mb” and says actual size varies with recorded amplitudes and compression.

**Suggested change:** Label these values provisional, use explicit bytes, and ask DRI to
measure full UTC-day files for each installed model/channel before sizing storage, bandwidth and
backups. Recalculate totals with a safety margin.

### SHOULD — Include operating ownership and staff effort

**Where:** “Who maintains what” and questions 1–12.

**Problem:** The brief asks for a contact, staff time and a test-server date, but not for
ongoing service ownership, incident response, credential rotation, recovery targets, audit
logs, or responsibility for bridges at five schools. Outbound-only connections do not remove
the need to manage device credentials and patches.

**Evidence:** SFTP access uses a Shake account ([manual](https://manual.raspberryshake.org/download.html));
the [Raspberry Shake license](https://raspberryshake.org/license/) reserves the right to
change the OS and remove SeedLink, supporting the need for feed monitoring and updates.

**Suggested change:** Ask for named service and bridge owners, update and credential-rotation
process, alert escalation, restore testing, and annual DRI/school IT effort. Keep staff time
separate from Claude development estimates.

**Verdict:** Clear enough to open a technical discussion and explicit that DRI IT chooses the
implementation. Add the publication-approval gate and correct capacity assumptions before
using it to scope cost or schedule.

## 3. `spec-uhsn-data.md`

### MUST — Enforce the cutoff in every object available to browsers

**Where:** §§4.2, 5.1, 5.3, 8 and 11.

**Problem:** `publicUntil` does not prevent clients from downloading a public SDS file that has
newer samples. Hourly updates to a growing public file expose those samples even if the index
claims an earlier cutoff. The GitHub Actions product job can also publish derived products
ahead of raw-data eligibility. “Nothing after it is published” is not implemented by this
layout.

**Evidence:** The spec itself serves raw SDS files and products publicly over HTTPS (§§5, 8).
The [Raspberry Shake license](https://raspberryshake.org/license/) illustrates why publication
status must be explicit: shared data become public immediately. LEA privacy and security
governance is covered by [R277-487](https://schools.utah.gov/adminrules/R277-487).

**Suggested change:** Define the cutoff as an exact UTC boundary and require every public
waveform and product to contain no data newer than it. Keep incoming data private; promote
eligible immutable day files or serve clipped data. Define correction behavior, cache behavior
and product lag. Add a test that attempts to fetch post-cutoff samples.

### MUST — Complete the machine-readable interface before calling it a build contract

**Where:** §§2, 4.1–4.4, 5.1–5.3, 6, 8 and 12.

**Problem:** Examples do not fully define JSON schemas, version rules, null/missing semantics,
`coverage` denominator, timestamp interval inclusivity, gap representation/limits, response
size, error behavior, atomic index updates, or station/channel changes. Upload authentication
and per-school authorization remain open. CORS and caching requirements are directionally
useful, but browser expectations—including Range behavior—need a concrete host test. The
StationXML schema version is not named.

**Evidence:** The [FDSN service specifications](https://www.fdsn.org/webservices/) and
[StationXML reference](https://docs.fdsn.org/projects/stationxml/en/latest/reference.html)
define service and metadata structures; the current StationXML reference identifies schema
version 1.2. The draft presents FDSN as a future implementation, so version and compatibility
choices affect the client.

**Suggested change:** Add JSON Schemas and fixtures; define required and optional fields,
timestamp bounds, gap/coverage rules, statuses, object-size limits and version policy. Select
the supported StationXML version. Add a browser acceptance checker for real responses. Choose a
school-scoped upload profile before treating ingestion as build-ready.

### SHOULD — Verify format assumptions with actual Shake files

**Where:** Definitions in §2; §§4.1, 5 and 9.

**Problem:** The definition says miniSEED uses fixed 512-byte records, and §4 requires v2. The
512-byte record length is not a generic property of miniSEED. The repo reader needs to be checked
against actual files from each installed model. Channel/model mapping is still open, and MIME
type alone does not ensure parser compatibility.

**Evidence:** [FDSN miniSEED documentation](https://docs.fdsn.org/projects/miniseed3/en/latest/background.html)
describes multiple versions and encodings. The [Raspberry Shake manual](https://manual.raspberryshake.org/download.html)
confirms daily miniSEED files but does not establish the proposed per-device record-size
contract.

**Suggested change:** Obtain real files from each installed model and make them acceptance
fixtures. Record miniSEED version, encoding, record length, NSLC identifiers and sample rate.
Specify whether the server preserves the original bytes and verify that the current browser
reader accepts them.

### SHOULD — Control public metadata and make products reproducible

**Where:** §§4.4, 5.2 and 8.

**Problem:** The `stations.json` example publishes school name, station code, model and
coordinates, while §4.4 says DRI may round coordinates further. This is not a default privacy
boundary. Product descriptions omit parameters needed to reproduce values (filter type/order,
detrending/response correction, partial-window treatment and exact clear-S ratio definition).

**Evidence:** The example itself includes named school metadata. The [StationXML reference](https://docs.fdsn.org/projects/stationxml/en/latest/reference.html)
defines station/channel response fields but does not determine which school fields are suitable
for public release.

**Suggested change:** Define a restricted install inventory separately from an approved public
metadata allowlist. Document product algorithms and parameter versions, especially for values
used by School Pulse or quake selection.

### CONSIDER — Treat UUSS/FDSN as contingent on host capabilities

**Where:** §§6–7 and §12.

**Problem:** The text implies the same SDS tree can become an FDSN service with little extra
work and UUSS hosting supplies the FDSN design. The standard defines interfaces; it does not
guarantee UUSS acceptance, codes, public access, response metadata, CORS, delay or retention.

**Evidence:** [FDSN](https://www.fdsn.org/webservices/) defines station and dataselect
interfaces. [StationXML](https://docs.fdsn.org/projects/stationxml/en/latest/reference.html)
requires valid station metadata. Neither source specifies a particular host's deployment.

**Suggested change:** Present these as conditional options and list host-specific acceptance
tests, including POST, CORS, metadata completeness, code mapping, retention and embargo.

**Verdict:** The spec is a strong proposal and a useful basis for a test server. It is not yet a
precise build contract: cutoff enforcement, metadata publication, schemas, format fixtures and
ingest security still need decisions.

## 4. `review-phone-recorder.md` and `phone-sources.md`

### MUST — Qualify browser-wide claims and the forecast about iPhones

**Where:** §§2.1–2.2, §5.2 Gate A and §6.2; source log §§1–2.

**Problem:** Chromium's 0.1 m/s² rounding and 60 Hz ceiling have implementation evidence. The
review generalizes that every browser rounds and that 60 readings/s is the ceiling “everywhere.”
The current W3C Device Orientation and Motion text is a Candidate Recommendation Draft, not a
final Recommendation; it specifies limiting precision to no finer than 0.1, not proof that every
engine currently rounds to nearest 0.1. WebKit's implementation and the open WebKit bug do not
prove when iPhones will change. Those generalizations drive P2/P3 signal conclusions.

**Evidence:** The [W3C document](https://www.w3.org/TR/orientation-event/) contains the
precision limit and identifies its status as a Candidate Recommendation Draft. Chromium source
defines [`kAccelerometerRoundingMultiple = 0.1`](https://chromium.googlesource.com/chromium/src/%2B/120.0.6099.216/services/device/generic_sensor/platform_sensor_util.h)
and a [60 Hz maximum sensor frequency](https://chromium.googlesource.com/chromium/src/%2B/057d5553e4524a7726b2e7d5ecfef85289379000/services/device/public/interfaces/sensor.mojom).
WebKit's [motion update interval](https://github.com/WebKit/WebKit/blob/main/Source/WebCore/platform/ios/WebCoreMotionManager.h)
is implementation evidence for iOS, not every browser.

**Suggested change:** State behavior by engine and version. Treat non-Chromium rounding/rates
and future iPhone behavior as T1 hypotheses, not premises. Use trial results to set platform-specific
limits and card expectations.

### MUST — Update the Utah device-policy analysis, especially the Chromebook statement

**Where:** §4, especially §§4.1–4.2; P6 claims in §§1, 2.4 and 6.5; source log §12.

**Problem:** The review says Chromebook microphone activities can run “under any policy” and
are outside Utah's phone law. SB 69 does not itself prohibit Chromebook use, but R277-495
requires LEA policies governing school and privately owned electronic devices, including
computer-like instruments, and local microphone controls still apply. It also requires teachers
to communicate conditions when they allow personal-device use. Utah's 2026 §53G-7-228 adds
classroom instructional-technology requirements; applicability depends on whether the school
issues the device/tool. The review relies on an earlier activities appendix and does not cite
the current enactment.

**Evidence:** Enrolled [SB 69](https://le.utah.gov/Session/2026/bills/enrolled/SB0069.pdf)
establishes the school-hours student device restriction and LEA policy exception, effective
July 1, 2026. Current [R277-495](https://schools.utah.gov/adminrules/R277-495) covers LEA-owned
and privately owned devices and forbids requiring a private device for coursework. Enrolled
[HB 273](https://le.utah.gov/Session/2026/bills/enrolled/HB0273.pdf) enacts §53G-7-228 on
classroom technology requirements.

**Suggested change:** Replace “under any policy” with “not prohibited by SB 69 itself; school
acceptable-use, device-management, microphone and instructional-technology requirements still
apply.” Have the district classify and approve the Chromebook and recorder. Distinguish student
personal phones, teacher demonstrations and school/DRI loaners.

### SHOULD — Do not infer that no upload means no privacy review is needed

**Where:** §§3.2, 4 (“outside the third-party-contractor rules”) and 6.4.

**Problem:** “Nothing is uploaded” is a useful technical design statement, but it does not by
itself prove a school privacy review or data agreement is unnecessary. The page host receives
ordinary request metadata, and local sensor/audio readings can become student-linked if labels,
files or classroom procedures add identifying information. The document acknowledges future
uncertainty but states the present conclusion too categorically.

**Evidence:** [R277-487](https://schools.utah.gov/adminrules/R277-487) assigns LEAs data privacy
and security obligations. [MDN's `getUserMedia()` documentation](https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getUserMedia)
describes local microphone access in secure contexts; the API does not determine district
policy obligations.

**Suggested change:** State the data flow precisely: readings/audio are processed in page
memory; the app does not send or store a recording; normal hosting logs may exist. Make LEA
privacy/security review a pre-student-use check without asserting a particular agreement is
legally required unless the district confirms it.

### SHOULD — Define a comparable strength measurement before using it for location

**Where:** §§1, 2.2, 2.5, 5.2 T2/T3 and Appendix A.

**Problem:** Event energy is proposed as a cross-phone hit-strength measure, but orientation,
sensor axis, coupling, gravity/baseline removal, event window, clipping and device filtering
affect the result. T3 will test agreement, but the data definition and classroom procedure
needed to interpret that agreement are not set. The 0.2 m/s² gate comes from a quantization
calculation plus assumed coupling; it is not yet a demonstrated cross-device threshold.

**Evidence:** The review labels real signal levels as estimates with about factor-three
uncertainty (§2.2, Appendix A2). The [W3C motion specification](https://www.w3.org/TR/orientation-event/)
defines device-coordinate acceleration, not calibrated ground motion.

**Suggested change:** Before T3, specify phone orientation/contact, baseline and gravity
removal, event window, RMS/energy units, clipping and CSV schema. Report repeatability and
detection probability by device model instead of treating one strength threshold as universal.

### SHOULD — Include DRI, teacher and school IT effort in the estimate

**Where:** §§5.1–5.5 and 6.5.

**Problem:** Estimates count Claude sessions, while T1a needs ten or more devices and an
afternoon, T1b needs a class and district approval, and T3 needs a Shake, field setup,
plate/sledgehammer and two hours. No DRI, teacher or school IT hours are estimated for device
sourcing, permissions, safety, supervision, data review or device management. These are likely
schedule constraints even if coding fits the estimate.

**Evidence:** Trial staffing and durations appear in §5.2. The review itself says device testing
is the bottleneck and browser facts remain untested on actual devices (§§2, 5.2).

**Suggested change:** Add separate estimates for DRI setup/lead, teacher/class time, district
policy/privacy review, school IT and device sourcing. Keep Claude session-days separate and name
the owner of the bench page after T1.

### CONSIDER — Describe browser audio as delivered samples, not guaranteed raw audio

**Where:** §2.4 and §5.1.

**Problem:** Requesting `echoCancellation`, `noiseSuppression` and `autoGainControl` as false
does not guarantee those settings are granted. `getSettings()` reports the result, but does not
guarantee no other platform processing. “Raw samples” overstates what the browser API promises.

**Evidence:** [MDN's echo-cancellation constraint page](https://developer.mozilla.org/en-US/docs/Web/API/MediaTrackConstraints/echoCancellation)
describes a constraint that may be unsupported or not granted. The [Media Capture and Streams
specification](https://www.w3.org/TR/mediacapture-streams/) defines constraint negotiation.

**Suggested change:** Say “audio samples delivered by the browser,” display requested and actual
settings, and validate onset timing/gain behavior on each supported browser during T1.

### CONSIDER — Qualify QR privacy claims

**Where:** §3 option 4.

**Problem:** A URL fragment is not sent in the HTTP request, but a result encoded in a QR URL
can remain in browser history or be visible to someone using the same device. Calling the
option's privacy cost “None” is too strong if labels/results are encoded.

**Evidence:** [MDN's URI fragment documentation](https://developer.mozilla.org/en-US/docs/Web/URI/Reference/Fragment)
explains fragment handling; it does not say the fragment cannot persist locally.

**Suggested change:** Label QR privacy as local-device exposure, prohibit names, and include a
clear-history/delete instruction if trials show QR transfer is needed.

**Verdict:** A no-login, local-only recorder is a valid proof-of-concept target, and the T1-first
gate is sound. State browser limits by engine, update the Utah policy analysis, and define a
repeatable measurement protocol before promising P3 location results.

## Shared issues

1. **Occupancy privacy needs its own release decision.** “No student accounts” does not resolve
   whether public time-series data, school identity and coordinates disclose when a building is
   active. Define DRI/LEA approval for raw data, metadata, products and delay before public
   release.
2. **Separate development estimates from operating effort.** Claude session-days are clearer
   than DRI, teacher and school IT hours. Add operating owners and effort for bridges, phone
   trials, device management, privacy/security review and support.
3. **Make source logs reflect current primary evidence.** The phone source log notes search-only
   and unread claims and says statutes were not re-read. Replace these with current primary links
   before relying on legal or cross-browser conclusions. The Shake source log is useful, but
   live behavior, exact port allowlists and steps on installed UHSN units remain untested.
4. **Verify formats and sizes on installed instruments.** Models/channels remain open; the file
   size estimate has a bit/byte ambiguity; parser and StationXML assumptions need real Shake
   fixtures before procurement or classroom use.
5. **Do not equate direct instrument access with unlimited redistribution rights.** The
   Raspberry Shake license distinguishes direct access, community-server data and web-platform
   integration. Written authorization is a sound gate for DRI's delayed public feed and several
   school stations together.

