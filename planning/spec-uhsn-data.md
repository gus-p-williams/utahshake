# UHSN data specification: what the website needs from DRI's server

*Draft 0.2, 2026-11-25, from the UHSN website team (Gus Williams) for DRI IT. It goes with
the brief "UHSN school seismometer data: a brief for DRI IT". It replaces draft 0.1 after
two independent critiques. Nothing here is decided until DRI IT agrees. US spelling.*

## 1. Purpose and status

This document is the contract between a DRI data server and the UHSN website
(<https://gus-p-williams.github.io/utahshake/>). **It says what the website needs. DRI IT
decides how to build and run it:** hardware, software, hosting, backups and monitoring.

- **What the server does:** it receives seismometer data from the Raspberry Shakes in five
  Utah high schools, keeps the data in a private intake area, and publishes them over HTTPS.
  The website's apps read them in students' browsers.
- **Delayed data are enough.** Live data are a possible later extra, not part of this
  version.
- **The school-to-DRI step is automatic.** No teacher handles files, and no network port is
  opened into any school.
- **No student data** pass through any part of this system.
- **Who may see what** depends on each school's choice about sharing with Raspberry Shake
  (section 3).
- **Raspberry Shake's terms:**
  - every byte comes directly from our own Shakes, through interfaces documented in the
    Raspberry Shake manual;
  - nothing comes from Raspberry Shake's servers;
  - nothing is installed on a Shake.

  DRI is asking Raspberry Shake to confirm in writing that DRI may publish its own Shakes'
  data this way. Section 14 gives a proposed default if no answer comes.
- **How to read it:** "must" marks a requirement. Field tables (section 7) are normative.
  Examples are not. Machine-readable JSON Schema files (draft 2020-12), sample files
  ("fixtures") and a checker program will ship from our side before DRI builds (section 12).

## 2. Words used here

| Word | Meaning |
| ---- | ------- |
| **miniSEED** | The standard file format for seismometer data: compressed samples in fixed-size records, each with a header giving the station, channel, start time, sample count and sample rate |
| **Record** | One block of a miniSEED file. On a Shake, 512 bytes holding a few seconds of one channel |
| **SDS** | SeisComP Data Structure: a standard folder layout with one miniSEED file per channel per UTC day |
| **NSLC** | Network, station, location, channel: the four codes that name a data stream, e.g. `AM.R1234.00.EHZ` |
| **StationXML** | The standard XML description of a station: location, channels and the instrument's response |
| **FDSN web services** | Standard web APIs for seismic data: `station` (metadata) and `dataselect` (miniSEED for a time window). Our apps already use them for University of Utah stations |
| **CORS** | Cross-Origin Resource Sharing: response headers that let a page on our site read files from DRI's server. Without them the browser blocks the data |
| **Bridge** | The small DRI-owned computer at a school that collects the Shake's data and sends them to DRI |
| **Intake** | DRI's private area where bridges deliver data. Never readable from the web |
| **Public tree** | The folder of files served over HTTPS (section 7) |
| **Delivered** | Arrived in the intake |
| **Published** | Copied into the public tree by the publish step (section 5) |
| **Cutoff** | The time before which data may be public at a station: now minus the station's approved delay |
| **Sidecar** | A small JSON file beside each published day file, describing it (section 7.7) |
| **Sharing station** | A school Shake that shares its data with Raspberry Shake's network |

## 3. Who may see what

Each station has a sharing status, confirmed in writing by DRI. **Gus's decision
(2026-11-25):**

| Sharing status | What our site publishes | Delay | Who approves |
| -------------- | ----------------------- | ----- | ------------ |
| **Sharing**: the Shake shares with Raspberry Shake's network | School name, approximate location, raw data, products | **None.** Published hourly | Already settled. The record is public and live in Raspberry Shake's viewers and archived there, so our site adds no new exposure |
| **Not sharing** | Only what DRI and the district approve, item by item: school name, location precision, raw data, products | As approved | DRI with the district, **before anything is published** |
| **Not confirmed** by DRI | Nothing | — | Treated as not sharing |

- **Default for "not sharing" and "not confirmed": nothing is published.** DRI may still
  receive the data into the intake, so history is not lost if approval comes later.
- **The restricted install inventory never enters the public tree:** exact location, room,
  contacts, passwords, notes. It stays private at DRI.
- **The public metadata allowlist is exactly the fields of `stations.json`** (section
  7.4), within what each station's status allows.
- **For a sharing station, the name and approximate location are public anyway.** Raspberry
  Shake shows the Shake within a couple hundred meters of its true position, and every
  record carries its station code.

## 4. How data arrive (summary; details in the brief)

This section is advice, not a requirement. The intake method is DRI's choice.

- **Recommended:** the bridge runs EarthScope's `slarchive` against the Shake's SeedLink
  service on the school network.
  - SeedLink is TCP port 18000 and needs no Shake login.
  - `slarchive` saves its resume point every 60 packets (`-x statefile:60`), not only on a
    clean exit. A power cut would otherwise lose it.
  - The bridge keeps its own SDS archive (weeks) on a USB SSD.
  - Every hour it pushes new data out to DRI, by rsync with append over SSH or as hourly
    piece files over HTTPS that DRI's intake merges.
- **Backfill and backup:** if the bridge misses more than SeedLink's buffer (some hours), DRI
  copies the missing days from the Shake's own archive over SFTP with an SSH key, by hand.
  This is also the backup path if Raspberry Shake removes SeedLink. Its license says: "We
  reserve the right to remove SeedLink from the Raspberry Shake microSD card image at any
  time."
- **Fallback:** the Shake's UDP datacast sent to a DRI receiver, as a monitored pilot only.
  - The receiver must keep gaps as gaps.
  - It must never fetch station metadata from Raspberry Shake's servers.
  - So don't use rsudp's file writer, which fills gaps with zeros. rsudp also fetches
    metadata from `data.raspberryshake.org` unless `inventory_url` is changed.
  - The text stream is about 70 to 120 MB a day per channel.
- **Only the bridges can write** to the intake, each with its own credential.

## 5. Delivery and publication

### 5.1 Delivery into the intake

| What | Requirement |
| ---- | ----------- |
| Daily, every station | All of UTC day D delivered by **12:00 UTC on D+1** (5 a.m. in Utah in winter) |
| Hourly, sharing stations (and approved stations that ask for it) | New data delivered within about **1 hour** |
| Late data | Accepted at any time; they flow through the publish step like any other data (5.3) |

### 5.2 The publish step

DRI runs a publish step every 10 minutes (or at least hourly). For each station:

1. **Find the cutoff:** cutoff = now − the station's approved delay. It is 0 for sharing
   stations. For an unapproved station, nothing is published.
2. **Copy whole records only.** Take only those whose last sample ends before the cutoff.
   Records are copied byte for byte, and headers are never rewritten.
3. **Sort and clean.** In the public day file, records must be in time order with no
   duplicates (same NSLC and start time). Merging hourly pieces or backfills must keep this.
4. **Replace atomically.** Write the new public day file under a temporary name, then rename
   it into place, so readers never see half a file.
5. **Update the descriptions,** in this order: the sidecar (7.7), then the station-year
   availability file (7.6), then `index.json` (7.5). `publicUntil` in the index is the
   station's cutoff at this run.
6. **Build products from the public tree only** (section 10), so they obey the same cutoff.

**What this means in practice:**

- *Sharing stations:* delay 0 and hourly delivery, so a class sees its morning drop
  experiment within about 1 to 2 hours.
- *A one-day delay:* day D becomes public at about 00:00 UTC on D+2. That does not clash
  with delivery by 12:00 UTC on D+1, because delivery is into the private intake.

### 5.3 Late data, refills and withdrawals

- **Refills** (after a bridge or network outage) change past day files. The publish step
  re-merges them, re-sorts, and updates the sidecar's and availability file's `updated`
  time.
- **Day files stay revalidated for 35 days** (section 7.2), so browsers see refills.
- **Nothing is deleted silently.** To withdraw a day (a fault, a test, a mistaken
  publication), remove the file and mark the day `withdrawn` with a reason (7.6).

### 5.4 Acceptance test for the cutoff

Our checker (section 12):

- reads `publicUntil` for each station;
- fetches the latest public day file and its sidecar;
- confirms that no record ends after `publicUntil`, and that no product holds a value for a
  time after it;
- for each not-sharing or unconfirmed station, confirms that nothing is published at all.

DRI runs it before going live and after any change to the publish step.

## 6. Format and naming

### 6.1 miniSEED

- **Version 2, exactly as the Shake writes it.** Don't convert, re-pack or rewrite headers.
  The server keeps the original bytes.
- **512-byte records,** expected with Steim2 compression. SeedLink version 3 always
  delivers 512-byte records, so the recommended bridge gets them. Raspberry Shake staff
  report Steim2. Confirm both on the first real files (6.4).
- **Each day file holds one channel and one UTC day,** in time order, without duplicates
  (5.2).

### 6.2 Codes

| Part | Value | Notes |
| ---- | ----- | ----- |
| Network | `AM` | Raspberry Shake's network code, written by the Shake |
| Station, `sta` | `R` + 4 characters, e.g. `R1234` | The code in the miniSEED headers. A Shake can't change it |
| Station in Raspberry Shake's viewers, `rsSta` | Usually the same as `sta` | After a code collision Raspberry Shake's servers use `S…`, but "data keeps using the original code at the station level". So keep both |
| Location | `00` | Same on every Shake |
| Channels | Current single-sensor RS1D: `EHZ` (100 samples/s). Older RS1D (V4, V5): `SHZ` (50/s). RS3D: `EHZ EHN EHE`. RS4D: `EHZ` + accelerometers `ENZ ENN ENE`. RS&BOOM: `EHZ` + air pressure `HDF` | Each school's model is still to be confirmed |

- **Several stations per school are allowed,** one marked `primary` (Juab has two Shakes).
- **The roaming Shake** (a second Shake DRI may bring to schools) is out of scope for v1.
  Its recordings are opened in the browser from files. DRI may later add it as a station
  of its own.
- **If UUSS hosts the data,** it chooses the codes, and our settings map each school to
  them.

### 6.3 Time

- UTC everywhere, as in the miniSEED headers. Files hold UTC days.
- JSON times are ISO 8601 with milliseconds and `Z`, e.g. `2026-11-25T14:00:00.000Z`. Dates
  are `YYYY-MM-DD` (UTC).
- A Utah school day (about 14:00 to 23:00 UTC) sits inside one UTC day. **Evening events
  cross midnight UTC** (a 19:00 MST game is 02:00 UTC the next day), and readers must join
  day files.

### 6.4 Acceptance fixtures from real files

Before building, DRI sends one full UTC-day file for each installed model and channel. The
same files become our test fixtures. For each, we record:

| Item | Expected | Recorded from the file |
| ---- | -------- | ---------------------- |
| miniSEED version | 2 | |
| Encoding | Steim2 (11) | |
| Record length | 512 bytes | |
| NSLC codes | `AM.R….00.EHZ` etc. | |
| Sample rate | 100 (50 for SHZ) | |
| Size | 6–15 MB per day at 100 samples/s | |
| SDS folder suffix `.D` and file-name pattern | As in 7.1 | |

- **If the folder or file names differ** (from the Shake or `slarchive`), the bridge renames
  into this spec's layout without touching file contents.
- **Our reader must parse every fixture.**

## 7. Design (a): plain files on an HTTPS web server

Any web server, or a storage bucket behind HTTPS, serving the public tree.

### 7.1 Layout

```
https://<host>/uhsn/v1/
  stations.json                         public station list (7.4)
  stations/AM.R1234.xml                 StationXML 1.2, one per station (7.8)
  index.json                            what is public now (7.5)
  index/AM.R1234.2026.json              availability by day, per station per year (7.6)
  sds/2026/AM/R1234/EHZ.D/AM.R1234.00.EHZ.D.2026.329          a day file
  sds/2026/AM/R1234/EHZ.D/AM.R1234.00.EHZ.D.2026.329.json     its sidecar (7.7)
  products/...                          section 10
```

- **Day file path:** `sds/<YYYY>/<NET>/<STA>/<CHA>.D/<NET>.<STA>.<LOC>.<CHA>.D.<YYYY>.<DDD>`,
  with the day of year in three digits. The sidecar is the same path plus `.json`.
- **No directory listings are needed;** the index files take their place.
- **The `v1` path** carries the version policy (7.3).

### 7.2 Web rules

**HTTPS only,** with a valid certificate. Reading needs no login, no cookies and no
tracking.

**CORS on every response, including errors.**

- Every response must carry `Access-Control-Allow-Origin: *`, including 304, 404, 416 and
  5xx. The data are public. A fixed `*` also serves local development and the site's
  planned move to a DRI address.
- Also on every response:
  - `Access-Control-Expose-Headers: ETag, Content-Range, Content-Length, Accept-Ranges`;
  - `Access-Control-Allow-Headers: Range`;
  - `Access-Control-Allow-Methods: GET, HEAD, OPTIONS`.
- `OPTIONS` requests are answered with 204 and these headers.
- *Why errors matter:* a cross-origin 404 without CORS reaches the page as a network
  error, so the reader can't tell "no data" from "blocked by the school's filter".
- *A trap in nginx:* its `add_header` is applied only "if the response code equals 200,
  201, 204, 206, 301, 302, 303, 304, 307, or 308", unless the `always` parameter is given.
  Use `add_header … always`.

**Range requests are required on day files:**

- answer `Range: bytes=a-b` with `206 Partial Content` and `Content-Range`;
- send `Accept-Ranges: bytes`;
- answer an impossible range with 416.

This lets a reader fetch a few minutes around a quake (about 50 KB) instead of a whole day.

**Content types:**

| Files | Type |
| ----- | ---- |
| Day files (no extension; set by folder or pattern) | `application/vnd.fdsn.mseed` |
| JSON | `application/json` |
| StationXML | `application/xml` |

**Status codes:**

| Code | Meaning |
| ---- | ------- |
| 200, 206, 304 | Normal |
| 404 | The file is not published (for a day file: no public data for that channel-day). Readers check the index first, so a 404 should be rare |
| 416 | Bad range |
| 5xx | Server trouble; the reader retries later |

No error body is required.

**Caching:**

| What | `Cache-Control` | Also |
| ---- | --------------- | ---- |
| Day files and sidecars for days within the last 35 days | `no-cache` | `ETag` and `Last-Modified`, so browsers revalidate cheaply (304). Refills can change these files |
| Day files and sidecars older than 35 days | `public, max-age=86400` | `ETag` |
| `index.json`, availability files | `no-cache` | `ETag` |
| `stations.json`, StationXML | `public, max-age=3600` | `ETag` |

### 7.3 Rules for every JSON file

**Times and intervals:**

- *Intervals* are half-open: `[start, end)` includes `start`, excludes `end`.
- *Times* follow 6.3.

**Gaps, overlaps and coverage:**

- *A gap* is more than 1.5 sample intervals between the end of one record's last sample
  and the next record's first sample (more than 15 ms at 100 samples/s). It is reported as
  `[gapStart, gapEnd)`.
- *Overlaps* (the next record starts before the previous one ends) are listed separately.
- *Coverage* is samples present ÷ samples expected in `[day start, min(day end,
  publicUntil))`, from 0 to 1, to 4 decimals.

**Missing values and field order:**

- `null` means "unknown". A missing optional field means "not provided".
- Readers must ignore fields they don't know.
- Arrays are in time order.

**Versions:**

- The path carries the major version (`v1`), and every file has `"version": 1`.
- Within v1, changes may only add optional fields.
- A breaking change gets a new path (`v2`) beside `v1` during a changeover.

**Write order:** day file renamed into place, then its sidecar, then the station-year
availability file, then `index.json`.

**Size limits:**

| File | Limit |
| ---- | ----- |
| Day file | ≤ 45 MB (theoretical worst case at 100 samples/s is about 43 MB; normal is 6–15 MB) |
| Sidecar | ≤ 100 KB |
| `index.json` | ≤ 1 MB |
| Station-year availability | ≤ 500 KB |

**Tools:** EarthScope's `mseedindex` or `msi` (Apache-2.0) can produce spans and gaps, so
nobody has to write a new miniSEED parser. We will also supply our own index script.

### 7.4 `stations.json`: the public station list

One entry per station epoch. A change of position, model or channels starts a new entry
with a new `start`.

| Field | Type | Required | Rules |
| ----- | ---- | -------- | ----- |
| `version` | integer | yes | 1 |
| `generated` | time | yes | When the file was written |
| `stations` | array | yes | One object per station epoch |
| `.net` | string | yes | `AM` |
| `.sta` | string | yes | Code in the miniSEED headers |
| `.rsSta` | string | yes | Code in Raspberry Shake's viewers (usually equal to `sta`) |
| `.school` | string | yes | Short id, e.g. `juab` |
| `.schoolName` | string | if approved | Always for sharing stations |
| `.primary` | boolean | yes | One primary station per school |
| `.sharing` | string | yes | `sharing`, `not-sharing` or `unconfirmed` (section 3) |
| `.delayHours` | number | yes | Approved publication delay; 0 for sharing stations |
| `.lat`, `.lon` | number | if approved | Degrees; 3 decimals (about 100 m) for sharing stations; as approved otherwise |
| `.elevM` | number | no | Meters |
| `.model` | string | yes | `RS1D`, `RS3D`, `RS4D`, `RS&BOOM` |
| `.start` | time | yes | Start of this epoch |
| `.end` | time or null | yes | `null` while current |
| `.stationXml` | string | yes | Path relative to the base, e.g. `stations/AM.R1234.xml` |
| `.clockChecked` | date or null | yes | Date of the last clock check (the brief describes the checks) |
| `.channels` | array | yes | One object per channel |
| `..loc` | string | yes | `00` |
| `..cha` | string | yes | e.g. `EHZ` |
| `..sampleRate` | number | yes | Samples per second |
| `..azimuth`, `..dip` | number | yes | Degrees; dip −90 means vertical |
| `..units` | string | yes | `M/S`, `M/S**2` or `PA` |
| `..sensitivity` | number or null | yes | Counts per unit at `sensitivityFreq`, from the StationXML; null until known |
| `..sensitivityFreq` | number or null | yes | Hz |
| `..sensor` | string | no | e.g. "4.5 Hz geophone" |

A station whose status is not sharing appears here only once approved, and only with the
approved fields.

```json
{
  "version": 1, "generated": "2026-11-25T12:00:00.000Z",
  "stations": [
    { "net": "AM", "sta": "R1234", "rsSta": "R1234", "school": "juab",
      "schoolName": "Juab High School", "primary": true, "sharing": "sharing", "delayHours": 0,
      "lat": 39.709, "lon": -111.836, "elevM": 1560, "model": "RS3D",
      "start": "2026-01-15T00:00:00.000Z", "end": null,
      "stationXml": "stations/AM.R1234.xml", "clockChecked": "2026-11-20",
      "channels": [ { "loc": "00", "cha": "EHZ", "sampleRate": 100, "azimuth": 0, "dip": -90,
                      "units": "M/S", "sensitivity": null, "sensitivityFreq": null } ] }
  ]
}
```

The values are examples. Our apps treat `null` as "not known".

### 7.5 `index.json`: what is public now

| Field | Type | Required | Rules |
| ----- | ---- | -------- | ----- |
| `version` | integer | yes | 1 |
| `generated` | time | yes | |
| `stations` | object | yes | Key: `NET.STA` (published stations only) |
| `.publicUntil` | time | yes | The cutoff at the last publish run. No public data or product is later |
| `.channels` | object | yes | Key: `LOC.CHA` |
| `..firstDay` | date | yes | First day with public data |
| `..lastSample` | time | yes | End of the last public sample (≤ `publicUntil`) |
| `..updated` | time | yes | Last time this channel's public data changed |
| `..status` | string | yes | `current` (new data within 2 hours for hourly stations, 36 hours for daily ones), `late`, or `stopped` (nothing for 7 days) |

```json
{ "version": 1, "generated": "2026-11-25T15:10:00.000Z",
  "stations": { "AM.R1234": { "publicUntil": "2026-11-25T15:10:00.000Z",
    "channels": { "00.EHZ": { "firstDay": "2026-01-15", "lastSample": "2026-11-25T14:59:58.270Z",
                              "updated": "2026-11-25T15:10:00.000Z", "status": "current" } } } } }
```

### 7.6 `index/<NET>.<STA>.<YYYY>.json`: availability by day

There is one file per station per UTC year. The publish step creates the new year's file at
its first run after 00:00 UTC on January 1.

| Field | Type | Required | Rules |
| ----- | ---- | -------- | ----- |
| `version`, `net`, `sta`, `year`, `generated` | | yes | |
| `channels` | object | yes | Key: `LOC.CHA`; value: an object keyed by date |
| `.<date>.status` | string | yes | `complete` (the day has ended and passed the cutoff), `partial` (still filling or before the cutoff), `withdrawn` |
| `.<date>.coverage` | number | yes | 7.3 |
| `.<date>.gapCount`, `.gapSeconds` | number | yes | Totals; the list is in the sidecar |
| `.<date>.bytes` | integer | yes | Size of the public day file (0 if withdrawn) |
| `.<date>.updated` | time | yes | Last change |
| `.<date>.withdrawnReason` | string | if withdrawn | Short reason |

```json
{ "version": 1, "net": "AM", "sta": "R1234", "year": 2026, "generated": "2026-11-25T15:10:00.000Z",
  "channels": { "00.EHZ": {
    "2026-11-24": { "status": "complete", "coverage": 0.9987, "gapCount": 1, "gapSeconds": 112.0,
                    "bytes": 9243648, "updated": "2026-11-25T01:10:00.000Z" },
    "2026-11-25": { "status": "partial", "coverage": 1.0, "gapCount": 0, "gapSeconds": 0,
                    "bytes": 5361664, "updated": "2026-11-25T15:10:00.000Z" } } } }
```

### 7.7 Sidecar: one per published day file

| Field | Type | Required | Rules |
| ----- | ---- | -------- | ----- |
| `version` | integer | yes | 1 |
| `id` | string | yes | NSLC, e.g. `AM.R1234.00.EHZ` |
| `day` | date | yes | |
| `records` | integer | yes | Number of records |
| `recordLength` | integer | yes | 512 |
| `encoding` | string | yes | `STEIM2` (or as found) |
| `sampleRate` | number | yes | |
| `firstSample` | time | yes | Time of the first sample |
| `lastSampleEnd` | time | yes | End of the last sample (time of the last sample + one interval) |
| `coverage` | number | yes | 7.3 |
| `gaps` | array | yes | `[start, end)` pairs |
| `overlaps` | array | yes | `[start, end)` pairs |
| `seek` | array | yes | `[time, byteOffset]` for each 10-minute mark of the day: the offset of the first record starting at or after that mark. Marks after the last record are left out |
| `updated` | time | yes | |

**How the reader uses `seek`:** to read `[t0, t1)` it takes the entry for the last mark at or
before `t0` and steps back one record (512 bytes), because a record starting before the mark
can hold samples after it. It reads up to the offset of the first mark after `t1`, or to the
end of the file. It then decodes only the records whose header times overlap `[t0, t1)`.

```json
{ "version": 1, "id": "AM.R1234.00.EHZ", "day": "2026-11-24", "records": 18054,
  "recordLength": 512, "encoding": "STEIM2", "sampleRate": 100,
  "firstSample": "2026-11-24T00:00:02.130Z", "lastSampleEnd": "2026-11-25T00:00:01.400Z",
  "coverage": 0.9987, "gaps": [["2026-11-24T03:12:40.000Z", "2026-11-24T03:14:32.000Z"]],
  "overlaps": [], "seek": [["2026-11-24T00:00:00.000Z", 0], ["2026-11-24T00:10:00.000Z", 64000]],
  "updated": "2026-11-25T01:10:00.000Z" }
```

### 7.8 StationXML

- **FDSN StationXML version 1.2,** one file per station, with full instrument response.
- **DRI builds it from the per-model metadata templates in the Raspberry Shake manual**
  (<https://manual.raspberryshake.org/metadata.html>: "replace all instances of 'STNNM'"),
  plus DRI's install records.
- **Not from Raspberry Shake's FDSN station service:** that is their server, which our
  rule against using their servers forbids.
- A template is documentation, not data. DRI's letter mentions this use in passing (gray
  area G4 in our review).
- Location precision follows section 3.

## 8. Design (b): standard FDSN web services (conditional)

These are the services our apps already use for University of Utah stations, through
EarthScope.

- **`/fdsnws/station/1/query`:** StationXML 1.2 and `format=text`; `level=channel` and
  `level=response`; the geographic search our apps use (`latitude`, `longitude`,
  `maxradius`, `startbefore`, `endafter`).
- **`/fdsnws/dataselect/1/query`:** miniSEED for any time window, by GET and by POST (our
  apps POST several channels at once).
- **Optional, `/fdsnws/availability/1/`.**

The same rules apply: section 3 (who may see what), section 5 (cutoff), and 7.2 (CORS on
every response, HTTPS).

**Conditions:**

- *Server software* is DRI's choice. For example, SeisComP's `fdsnws` module can serve an
  SDS archive with a station inventory. Design (b) can run on the same SDS tree as (a), so
  (a) can come first and (b) later, without moving data.
- *Raspberry Shake's agreement:* serving `AM` station codes from DRI's own FDSN service
  needs Raspberry Shake's explicit written agreement. Their license bans "redistribution via
  your own FDSN Web Service" for data from their servers, and an `AM` service at DRI would
  look the same. DRI's letter asks.
- *UUSS hosting* would put the data into EarthScope's FDSN services, which our apps already
  read. It comes with UUSS's codes, UUSS's rules on public access and delay, and its
  retention.

**Host acceptance tests,** for (b) at DRI or at UUSS. The checker runs these:

| Test | Passes when |
| ---- | ----------- |
| POST dataselect for several channels | One miniSEED response for all of them |
| CORS | `Access-Control-Allow-Origin: *` on 200, 204 (no data), 404 and 5xx |
| StationXML | Version 1.2, with response, for every published channel |
| Codes | Our mapping from school to NSLC matches |
| Cutoff | No sample after `publicUntil` (or the host's stated delay) |
| Retention | The oldest day promised is served |
| Rate limits | Stated, and a class of 30 devices stays inside them (EarthScope, for example, asks for no more than 5 connections per user on its real-time service) |

## 9. Comparing the designs, and our recommendation

| | (a) Plain files | (b) FDSN web services | UUSS hosts (gives b) |
| - | --------------- | --------------------- | -------------------- |
| DRI setup (staff days) | **M**: about 3–5, including intake, the publish step and checker runs | **M–L**: about 5–10 (also seismology server software and an inventory) | Small for DRI; bridges still needed |
| DRI upkeep | Web server patches; disk; monitoring | Also the server software's updates | Bridges only |
| Our side | UHSNSource for files: M (section 12) | Mostly our existing FDSN code with a new address: S | S |
| Download for a quake window | About 50 KB per channel (range requests and seek tables) | About 50 KB per channel | Same |
| Research use (Python, ObsPy) | Download files, read locally | The standard FDSN client works | Same, plus EarthScope's tools |
| Risk | Low: static files | More moving parts | UUSS's decision; its codes, public access and delay |

- **We recommend design (a) to start:** the least to build and run, and it serves
  everything planned. Move to (b) on the same files when DRI IT is comfortable running it,
  or when research use calls for it, and once Raspberry Shake agrees to `AM` codes on
  DRI's service.
- **UUSS hosting is being asked about separately** (through Dale and Cleat).

## 10. Derived products

Small summaries some apps read instead of raw data.

- **Who writes the code:** we do, in our repository. Each product carries an `algorithm`
  field (name and version), so values can be traced and reproduced.
- **Who runs it, by default:** DRI, as the last part of the publish step.
  - It reads only the public tree and writes under `products/`.
  - Products therefore obey the cutoff and live beside the data.
  - They never enter our git history, and they don't depend on GitHub's scheduler.
- **Alternative:** our GitHub Actions job reads DRI's public files and publishes the
  products inside the website's Pages build. They are never committed to git.
  - This needs a keep-alive and a staleness alarm, because GitHub disables scheduled
    workflows in public repositories after 60 days without activity.
- **Not-sharing stations** have products only if approved.

**Shared processing.** This is our apps' filter (`docs/app/js/data/filters.js`):

- mean removed, ends tapered (5% cosine);
- a 4-pole Butterworth band-pass from seisplotjs;
- causal, not zero-phase;
- the upper corner capped at 0.9 × the Nyquist frequency.

Over a whole day, gaps are bridged with a straight line before filtering and put back
afterward (`bridgeGaps` and `restoreGaps` in `lib/helicorder.js`), so they stay missing. Up to
2 hours of the neighboring days are used at each end when published, so the filter's tapered
ends fall outside the day.

### 10.1 Noise levels, for School Pulse

One file per channel per month: `products/noise/AM.R1234.00.EHZ/2026-11.json`. The method is
`stepLevels` in `docs/app/js/lib/carpet.js`, as used for the science page's carpet figure:

1. filter to the band;
2. take the RMS of each 60-second window, with its mean removed;
3. take the median of the windows in each 15-minute step.

A window with less than half its samples is null, and a step with no good window is null.
Bands for v1: 5–20 Hz (as on the science page) and 1–10 Hz. We may add bands under a new
algorithm version.

| Field | Type | Required | Rules |
| ----- | ---- | -------- | ----- |
| `version`, `id`, `month` | | yes | `month` is `YYYY-MM` |
| `start` | time | yes | 00:00 UTC on the 1st |
| `stepSec`, `windowSec` | integer | yes | 900, 60 |
| `statistic` | string | yes | "median of 60-s RMS" |
| `algorithm` | object | yes | `{ "name": "uhsn-noise", "version": "1.0" }` |
| `generated`, `publicUntil` | time | yes | No value after `publicUntil` |
| `bands` | object | yes | Key: e.g. `5-20 Hz`; value: `{ lo, hi, units, values[] }`. Units are `counts` (later `nm/s`). `values` has one number or null per step, 96 a day |

A month is about 20 KB per band.

### 10.2 Clear-S counts

How many stations show a clear S wave for a quake, so students can choose good quakes.
File: `products/clear-s/recent.json`, updated after each publish run that adds quake data.
The method is `docs/app/js/lib/clear-s.js`:

- **Filter:** 1–10 Hz.
- **The ratio:** RMS of the 2 seconds after S ÷ RMS of the P coda from max(P + 0.5 s,
  S − 3 s) to S − 0.2 s. The ratio is null if that coda window is shorter than 0.3 s.
- **The component:** the best of the station's components.
- **Clear:** ratio ≥ 3, and the S − P time plausible.
- **Plausible:** analyst S picks are trusted. A computer S pick must fall within 15% (plus
  0.5 s) of the model's S − P.
- **School Shakes have no analyst picks,** so their P and S come from our AIC picker (P on
  the vertical with signal-to-noise ≥ 3).

| Field | Type | Required | Rules |
| ----- | ---- | -------- | ----- |
| `version`, `generated`, `publicUntil` | | yes | |
| `algorithm` | object | yes | `{ "name": "uhsn-clear-s", "version": "1.0" }` |
| `ratioThreshold` | number | yes | 3 |
| `events` | object | yes | Key: USGS event id |
| `.clear`, `.total` | integer | yes | Counts over the published school stations |
| `.stations[]` | array | yes | `{ id, distKm, pSec, sSec, sWho, ratio, cha, plausible, clear }`; `sWho` is `analyst` or `computer`; null where not found |

### 10.3 Optional: the day envelope

For each second of a channel-day: the lowest and highest count.

- **Binary file:** 86,400 pairs of signed 16-bit integers, little-endian (345,600 bytes),
  at `products/envelope/2026/AM.R1234.00.EHZ.2026.329.env`.
- **Values:** count ÷ `scale`, rounded, with −32768 meaning missing.
- **A JSON file beside it** holds `version`, `id`, `day`, `start`, `scale`, `missing`,
  `algorithm` and `publicUntil`.

It cuts a whole-day view from 6–15 MB to about 0.35 MB per channel per device.

## 11. Sizes and traffic

**Measured (2026-11-25, on 2026-11-24 data):** four full UTC-day files of 100-sample-per-second
University of Utah channels from EarthScope:

| Channel | Bytes | Records | Bytes per sample |
| ------- | ----- | ------- | ---------------- |
| TMU HHZ | 9,243,648 | 18,054 | 1.07 |
| SUU EHZ | 10,420,224 | 20,352 | 1.21 |
| ELU EHZ | 6,431,232 | 12,561 | 0.74 |
| TMU ENZ | 6,187,008 | 12,084 | 0.72 |

All four are 512-byte Steim2 records.

**Units.** The Raspberry Shake manual says a daily file is "generally about 15 Mb". That
must mean megabytes:

- a 512-byte Steim2 record holds at most 721 samples (7 frames, 103 data words, 7 samples
  each);
- so a 100-sample-per-second day needs at least about 12,000 records, or about 6.1 MB;
- 15 megabits would be 1.9 MB, below that floor.

**Not yet measured:** a real Shake file (none from UHSN yet). The fixtures in 6.4 will
settle it.

**Estimates.** Plan on 6–15 MB per channel per day; about half for the older 50-sample `SHZ`.

| | Per channel | RS1D school (1 ch.) | RS&BOOM (2) | RS3D (3) | RS4D (4) | Five schools |
| - | ----------- | ------------------- | ----------- | -------- | -------- | ------------ |
| Per day | 6–15 MB | 6–15 MB | 12–30 MB | 18–45 MB | 24–60 MB | 30–300 MB |
| Per year | 2.2–5.5 GB | 2.2–5.5 GB | 4.4–11 GB | 6.6–16 GB | 8.8–22 GB | 11–110 GB |
| Average upload | 0.6–1.4 kbit/s | ≤ 1.4 kbit/s | ≤ 2.8 kbit/s | ≤ 4.2 kbit/s | ≤ 5.6 kbit/s | — |
| Hourly upload, sending only new data | ≤ 0.6 MB | ≤ 0.6 MB | ≤ 1.2 MB | ≤ 1.9 MB | ≤ 2.5 MB | — |

- **Re-sending the whole growing day file every hour** would cost up to 15 MB per channel
  per hour late in the day. Send only new data.
- **The datacast fallback** is a text stream of about 70–120 MB a day per channel, up to
  about 45 kbit/s for an RS4D.

**Downloads from DRI (estimates):**

- **A quake window by range:** about 50 KB per channel. A class of 30 looking at five
  schools × three channels uses about 25 MB.
- **A whole-day view:**
  - without the envelope, 6–15 MB per channel per device, or 180–450 MB for a class of 30;
  - with the envelope, about 10 MB for the class.
- **Five schools, a few classes a day:** under 5 GB a day, under about 50 GB a month.
- **Products:** under 1 GB a year.

## 12. What our side builds

Effort scale, shared with the phone review:

- **S:** up to 2 days.
- **M:** 3 to 7 days.
- **L:** more than 7 days.

Claude session-days count our building and testing. They include a rework allowance of
about ×1.5, which the review explains. The bridge's own scripts (about 1–2 days) are counted
in the review, not here. Teachers and school IT spend no time on the server.

| Piece | What | Size (Claude session-days) |
| ----- | ---- | -------------------------- |
| **UHSNSource** (`docs/app/js/data/uhsn.js`) | Implements the apps' DataSource interface (`docs/app/js/data/datasource.js`). Quakes, quake details and analyst picks come from USGS as now. `getStations` reads `stations.json`, filters by distance and epoch, and maps `null` to "not known". `getWaveforms` checks the index, then fetches each window by range using the sidecar's seek table, decodes only the records whose header times overlap the window, and joins days across UTC midnight. **Routing:** `AM` requests go to DRI, `UU` requests to EarthScope. **A third data label,** beside "Live data" and "Offline sample": "School Shakes, data up to 14:00". Quake Locator's answer key needs computer picks for school Shakes, as Quake Explorer already has | **M** (3–4) |
| **Checker** | Tests a server against this spec: paths, CORS on success and error responses, OPTIONS, ranges, content types, caching, JSON Schemas, sidecar against file, and the cutoff test (5.4). Ships with the JSON Schema files and fixtures | **M** (3) |
| **Index, sidecar and publish scripts** | Reference scripts DRI may run: cutoff copy, sort, sidecar with seek table, availability, `index.json` | **S–M** (2–3) |
| **Products** | Noise levels, clear-S, envelope (section 10), plus readers in School Pulse and the apps | **S–M** (2–3) |
| *Total* | | **L** (about 10–13) |

**For design (b):** UHSNSource is mostly a new base address for our existing FDSN code
(**S**).

## 13. Security and privacy

- **No student data anywhere** in this system: no accounts, names or uploads from students.
- **Public, read-only data,** with no login and no cookies. **Writing** is limited to the
  bridges, one credential per school, which DRI can revoke.
- **Nothing reaches into a school:** each bridge only connects outward.
- **The intake is private.** Only the publish step moves data to the public tree, under
  section 3 and the cutoff (section 5).
- **Occupancy:** a seismometer in a building shows when it is busy. Section 3 decides what
  is public. The 15-minute noise levels are occupancy data too, and they follow the same
  rules.
- **The restricted inventory stays private** (section 3).
- **Raspberry Shake's terms:** see section 1, and section 14 for the default if no answer
  comes.

## 14. If no answer comes

Each outside answer has a proposed default. **The first is Gus's decision.**

| Waiting on | Proposed default |
| ---------- | ---------------- |
| Raspberry Shake's written answer (DRI's letter) | **DRI decides** (Gus, 2026-11-25: not our call). One option: if no reply within 6 weeks, publish our own sharing stations' data, read directly, one school per page. Cite the license's Option B (institutions taking their own Shakes' data over SeedLink). No FDSN service with `AM` codes, no side-by-side page of several schools. Stop if Raspberry Shake objects |
| A district, for a not-sharing station | Nothing is published |
| DRI's written confirmation of a station's sharing status | Treated as not sharing: nothing is published |
| DRI IT's commitment to a server | Teachers keep using the in-browser day-file viewer, which needs no server |

## 15. Open choices for DRI IT

1. **Design:** (a) plain files, (b) FDSN web services, or (a) now and (b) later on the same
   SDS files.
2. **Hosting and domain:** a DRI web server, DRI cloud storage behind HTTPS, or another
   host; and the host name (for example `data.uhsn.<DRI domain>`).
3. **Intake from the bridges:** rsync with append over SSH, hourly piece files over HTTPS
   (PUT, WebDAV or an S3-style API), or SFTP. One credential per school, and how it is
   rotated and revoked.
4. **Delivery for each not-sharing station once approved:** daily or hourly. Sharing
   stations are hourly.
5. **Publication delay for each not-sharing station,** agreed with its district.
6. **Retention and backups:**
   - how long raw data stay on the server (we suggest the life of the program, at least 5
     years) and how they are backed up and restored;
   - how much the bridges keep;
   - how many days each Shake keeps (only after checking its storage card).
7. **Who runs the products:** DRI in the publish step (Gus's choice, 2026-11-25); our GitHub
   job only as a fallback.
8. **Who builds the index and sidecars:** our scripts run by DRI (default), or DRI's own.
9. **Monitoring and alerts:** what is watched (each channel's `lastSample` and status, each
   bridge's heartbeat, disk space), the thresholds, and who gets the alerts.
10. **Bridge hardware and management:** a DRI-owned small computer (or a cellular variant),
    and how it is updated and managed through outbound-only connections.
11. **StationXML:** who builds it from the manual's templates and DRI's records, and who
    keeps it current when a Shake changes.
12. **Coordinate precision for not-sharing stations,** as approved.
13. **Index extensions:** fields DRI wants to add (welcome, as long as existing fields keep
    their meaning).
14. **Data license, credit line and DOI.** We suggest CC BY 4.0, and the credit "Seismic
    data: Utah High School Seismic Network (DRI), Raspberry Shake seismograph AM.<sta>".
    Will DRI register a DOI?
15. **Optional extras:** the day envelope (10.3); live data later.

**What DRI needs from us:**

- a draft `stations.json`, once DRI confirms each Shake's model, both codes and sharing
  status;
- the index, sidecar and publish scripts and the products script;
- the checker, with the JSON Schema files and fixtures;
- a test page on our site that reads DRI's test server;
- a named contact on our side.
