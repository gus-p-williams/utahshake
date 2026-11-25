# Review: a school Shake viewer, and connecting a school's Shake to the website

*Session P3-viewer-review. Version 3, 2026-11-25, after two critiques (R1,
`planning/critique-r1-claude.md`; R2, `planning/critique-r2-codex.md`) and Gus's three
decisions:*

1. *A school whose Shake already shares with Raspberry Shake is already public; a school
   that doesn't share needs DRI and district approval before anything is published.*
2. *Sharing schools publish hourly with no added delay.*
3. *One effort scale, shared with P4.*

*For Gus and DRI. Nothing here is a decision unless it says it is Gus's. Companions: the
brief for DRI IT (`planning/brief-dri-it.md`), the data spec (`planning/spec-uhsn-data.md`)
and the source log (`planning/viewer-sources.md`). Section 9 answers every critique
finding. US spelling.*

Gus asked two questions:

- **(a)** Is a "school Shake viewer" worth building, and what would it take?
- **(b)** What exactly would a school do to connect its Shake to our website?

## Summary

**(a) Build a viewer, but not a copy of Raspberry Shake's DataView.** DataView already shows
a sharing Shake live, with a 24-hour helicorder, filters and a spectrogram. Ours is worth
building for what DataView can't do:

1. **School events on the record:** bells, buses, games and the class's own drops.
2. **An experiment mode for S10 to S18:** a drop table and the shaking strength of each drop,
   as band-limited energy, with the peak shown too; a clipping warning; log-log plots; CSV.
3. **A comparison with professional stations (S9),** and a clock check.
4. **Numbers students can download.**

None of these needs live data.

**(b) Connect each school automatically, outbound only, with no Shake password on the
school's device.**

- **Recommended (F2b): a DRI-owned "bridge" at each school.** It reads the Shake's standard
  data stream (SeedLink, port 18000, inside the school) with EarthScope's `slarchive`, keeps
  its own archive for weeks, and pushes new data to DRI every hour over HTTPS.
- **DRI's server keeps incoming data private.** A publish step copies to the public tree
  only data older than the station's cutoff, and builds the summaries from the public copy.
- **Sharing schools** (Gus's decision): published hourly with no added delay, so a class
  sees its drops within about 1–2 hours.
- **Schools that don't share:** nothing is public until DRI and the district approve what
  and how late.
- **Fallback (F1):** the Shake's UDP datacast to a DRI receiver, as a monitored pilot only.
  The receiver must not be rsudp's writer, which fills gaps with zeros and fetches metadata
  from Raspberry Shake's server.
- **Stopgap, no server:** a teacher downloads a day file from the Shake's own page and our
  viewer opens it in the browser.

**What it takes,** on the shared scale (S = up to 2 days, M = 3–7, L = more than 7):

| Piece | Claude session-days (with rework) | DRI staff days | Size |
| ----- | --------------------------------- | -------------- | ---- |
| The file-first viewer | about 10–16 | 1–2 | L |
| Our side of the delayed data system (reader, publish and index scripts, checker, summaries) | about 11–15 | — | L |
| DRI's setup (server, bridges, five installs, security review) | — | about 13–19, plus travel if visits are needed | L |
| DRI's running costs | — | about 1–2 days a month | — |

Calendar time, not effort, sets the date: first school data about 2–4 months after DRI IT
agrees. The stopgap covers until then.

**Raspberry Shake links (verified):**

- the DataView address `#/AM/<code>/00/EHZ` and the StationView address
  `#/?net=AM&sta=<code>` open with the station selected;
- link only sharing schools, using the code Raspberry Shake's viewers show;
- under Gus's decision, naming a sharing school is no new exposure.

**Raspberry Shake's terms:**

- We use only our own Shakes, through documented interfaces.
- We never take data from their servers, never install software on a Shake, and never
  probe its internals.
- **Ask Raspberry Shake in writing:** whether DRI may publish its own Shakes' data
  (G1), and whether a page may show several schools side by side (G2).
- **Ask UUSS first,** then Raspberry Shake: may UUSS host the Shakes (G3)?
- **Confirm in passing:** the instrument response, the credit line, non-commercial use
  (G4–G6).
- **Drop:** embedding DataView, and probing the Shake's services (G7, G8).
- **If Raspberry Shake doesn't reply in 6 weeks: DRI decides** (Gus, 2026-11-25: not our
  call). One option for DRI: publish our own sharing Shakes' data, one school per page,
  citing the license's Option B, and stop if Raspberry Shake objects; the other: wait for a
  written answer.

## 0. How this review was done

- **Read:**
  - CLAUDE.md and the overview (`evaluation.md`);
  - the questions document (`activities.md`);
  - `roadmap.md` and `decisions.md` (D6, D12, D26, D31, D33, D35);
  - the library modules `helicorder.js`, `carpet.js`, `psd.js`, `signal.js` and
    `clear-s.js`;
  - the DataSource layer and Quake Explorer's views;
  - both critiques, in full.
- **Checked against sources:**
  - the Raspberry Shake manual and License Agreement (their only terms);
  - the StationView and DataView release notes;
  - rsudp;
  - EarthScope's ringserver, slarchive (its manual, read for this version) and SeedLink
    service;
  - seisplotjs; Chrome and MDN.
- **Tests run on 2026-11-25 from Gus's machine:**
  1. **Live stand-ins over secure WebSocket:** about 20 seconds behind real time.
  2. **Four UU day files:** 6.2–10.4 MB each, all 512-byte Steim2 records at 100 samples a
     second, 0.72–1.21 bytes per sample.
  3. **Raspberry Shake's viewer addresses,** in headless Chrome.
- **Not done:**
  - **A real Raspberry Shake day file.** No UHSN file yet. A single download of one day of
    a public Shake from Raspberry Shake's data service, to settle the size question, was
    refused by this session's permission system. I did not work around it. DRI's first
    real files will settle sizes and format instead (section 7).
  - **Nothing tried on a real Shake.**
- **Who wrote what:** the data spec was drafted by forks of this session from design
  decisions fixed here, then reviewed by this session.

## 1. What a viewer would add

### 1.1 What already exists

| Tool | What it does | Limits for us | Terms |
| ---- | ------------ | ------------- | ----- |
| **StationView** | Map of stations and quakes; a station's live record and spectrogram; links to its 24-hour plot and data | No notes of our own | Free to view; we link out (section 3) |
| **DataView** | Live stream, 24-hour helicorder, "Compare Data", filters, spectrogram, automatic quake marks, image export, embeddable kiosk view | No school events, measurements, tables, number downloads or UU stations | Free to view; we link out; embedding dropped (G7) |
| **The Shake's own web page** (school network only) | Settings, day-file download, a deprecated 12-hour helicorder (`/heli`) | Teacher's view only | Ours |
| **Swarm** (desktop) | Reads the Shake's wave server (16032) or SeedLink (18000) | A Java install: not for students | Ours |
| **rsudp** (open source) | Reads the datacast on another computer: plot, alarm, writer, forwarding | By default fetches station metadata from Raspberry Shake's server at startup (constraint 1), and its writer fills gaps with zeros (R1, from its source) | Usable only with `inventory_url` pointed at DRI's own StationXML |

### 1.2 What a viewer of ours would add

| Feature | What students see and do | Justifies building? |
| ------- | ------------------------ | ------------------- |
| **Annotations** | Bells, lunch, buses, games, drills, weather and logged drops as marks on the helicorder and trace; quake marks with predicted P and S times | **Yes** |
| **Experiment mode** | Mark each drop; enter distance, mass, height, surface; the page measures the drop's **band-limited energy** in a fixed window, with the peak shown beside it. A single peak at 100 readings a second scatters by about 10% (P4's Appendix A1 applies to the Shake too), enough to blur S10's fade line. Clipping is flagged; table, log-log plot and CSV. One strength measure is shared with P4's phone cards | **Yes** |
| **Comparison and clock check** | The Shake beside the nearest UU station; noise spectra against Peterson's curves; "Is our clock right?" from P arrivals | **Yes** |
| **Downloadable numbers** | CSV of picks, measurements and cut records | **Yes** (CS data standards) |
| Live trace, helicorder, spectrogram alone | As in DataView | **No** |
| Several schools side by side | S2, S7, S8 | Yes, once G2 is answered |

### 1.3 Mapped to activities

| Activity | Raspberry Shake's tools today (sharing on) | What the viewer adds |
| -------- | ------------------------------------------ | -------------------- |
| S1 Meet our Shake | Enough (DataView) | Bells, buses and the class's jumps marked |
| S2 Quake Locator with our schools | — | Not the viewer: Quake Locator on school data |
| S3 School Pulse | One day at a time | Not the viewer: School Pulse; the viewer opens a day from it |
| S4 Bus Detective | Buses visible, nothing scored | Bus log as truth; detector scoring; stack |
| S5 Signal Detective | — | Labeling clips; a catalog |
| S6 Weather Ears | No wind data | Wind on the time axis; thunder on the air channel |
| S7 Game Night Quake | Compare shared Shakes | Play-by-play marks; strength per quarter. **An evening game crosses UTC midnight** (19:00 MST is 02:00 UTC the next day), so it spans two day files |
| S8 ShakeOut jump | "Compare Data" may do it | One shared mark; distance to UU stations |
| S9 Our Shake vs the pros | Can't show UU stations | Side by side; noise spectra; clock check |
| S10–S14, S17 | Drops visible, not measured | Experiment mode |
| S15, S16 | Spectrogram | Beat readout; sweep marks |
| S18 Speed-bump clock | Visible | Thump-to-thump timing |
| R1–R8 | No two-Shake timing | Two records lined up; cross-correlation; H/V |
| P2 Phone vs Shake | — | The Shake side (one shared file reader with P4) |

**Counted:**

- **12 S cards need the viewer:** S4, S5, S6, S7, S9, S10, S11, S12, S13, S14, S17, S18.
- **4 are helped by it:** S1, S8, S15, S16.
- **2 are served elsewhere:** S2 (Quake Locator) and S3 (School Pulse).
- **All 8 R cards** need it.

None needs live data. A class drops weights in the morning:

- at a sharing school, it sees them within about 1–2 hours (hourly publication);
- at a school with an approved delay, it sees them after the delay;
- with the stopgap, the same day.

### 1.4 Verdict on (a)

Worth building, defined by annotations, experiment mode and comparison. Build it to read
files first, so it works with the stopgap now and with DRI's published files later. Live
data are an optional extra. Its cards follow Dale and Cleat's choices; until they answer,
the default is to build the day view and annotations (S1 is in the suggested pilot) and to
hold experiment mode.

## 2. Data paths

### 2.0 Facts that shape every path

**2.0.1 What a Shake offers on the school network** (Raspberry Shake manual):

| Output | How | Port | Notes |
| ------ | --- | ---- | ----- |
| Web page | `http://rs.local/` or its address | TCP 80 | Settings (the `myshake` login), day-file download, `/heli` |
| Day files | Download page, or SFTP as `myshake` from `/opt/data/archive` | 80 or 22 | miniSEED, one file per channel per UTC day, in folders YEAR/NETWORK/STATION/CHANNEL. **7 days by default**; more under Settings › Data, after a storage check. Shake OS v21.1 ignored this setting until v21.2 (R1, from the forum) |
| UDP datacast | Settings › Datacast | UDP, chosen port | One channel per packet, as text, 4 packets a second; "not intended for production" |
| SeedLink | Always running; **no login** | TCP 18000 | Standard real-time protocol; "a buffer with some hours of data". Raspberry Shake may remove it: "We reserve the right to remove SeedLink from the Raspberry Shake microSD card image at any time" |
| Wave server | For Swarm | TCP 16032 | Raspberry Shake's software |

- **The `myshake` login has administrator rights.** It opens the settings page, and the
  manual has it run `sudo reboot`. A device holding it can change sharing, location and
  datacast targets.
- **Codes:**
  - each Shake is `AM.R` plus four characters, location `00`;
  - channels `EHZ` (100 a second), `SHZ` on old RS1D (50 a second), plus `EHN EHE`
    (RS3D), `ENZ ENN ENE` (RS4D), `HDF` (RS&BOOM);
  - after a code collision Raspberry Shake's viewers use `S…`, but "data keeps using the
    original code at the station level". **So each school needs two codes: the one in its
    files (`sta`) and the one in Raspberry Shake's viewers (`rsSta`).**
  - Juab has two Shakes, so a school can have several stations, one marked primary.

**2.0.2 What a web page can and can't reach** (our site is HTTPS):

- Web pages have no UDP or plain TCP.
- An HTTPS page can't fetch `http://` addresses or open `ws://` connections, except under
  Chrome's Local Network Access permission, which managed-device policy controls.
  Chromestatus lists the same permission for WebSockets at milestone 147 (R1), which
  replaces this review's earlier "not WebSockets as of mid-2025".
- The Shake's page has no data API.

So a student's browser on our site can't read a Shake directly: a person moves a file (the
stopgap), or a machine moves the data to a server (everything else).

**2.0.3 Raspberry Shake's terms** (License Agreement, modified 2026-02-21).

*Allowed:*

- **Direct access to one's own Shakes:** "Shakers enjoy unlimited access to real-time
  streaming via a direct connection to their Shake(s)", for SeedLink, the wave server and
  the datacast.
- **Archiving tools:** the license's table lists `slarchive` and `scp` as free local access.
- **Institutions using their own Shakes:** "Option B: SeedLink Protocol … the DIYer is
  totally supported by these and other policies" (quoted by R1 from the license page; not
  re-checked by this session).
- **The owner keeps its rights:** the sharing grant is "non-exclusive".

*Not allowed:*

- **Their servers in a back end:** "Integration into a back end application such as a
  mobile app is not allowed." Also: "Data Centers and commercial enterprises are strictly
  prohibited from integrating real-time or legacy data into their web and mobile app
  platforms."
- **Redistribution of their data:** real-time data "obtained from Raspberry Shake's
  servers" may not be redistributed, "also … paying customers". Nor may data "obtained from
  https://data.raspberryshake.org/fdsnws/" be redistributed through "your own FDSN Web
  Service".
- **"Network"-style pages:** "Please refrain from showing a 'network'-style page with data
  from other Raspberry Shakes in your area."
- **Reverse engineering:** "With the exception of rsudp, all Raspberry Shake hardware and
  software products are closed source"; "Reverse engineering … is strictly prohibited".
- **Commercial use:** our site stays free and non-commercial.

*Our reading:* DRI publishing its own instruments' data, read directly, is not a data center
"integrating" Raspberry Shake's data. The bans name data from Raspberry Shake's servers. But
serving `AM` codes from DRI's own FDSN service would look like the banned "redistribution
via your own FDSN Web Service". The letter asks about both (2.7).

**2.0.4 Privacy: Gus's decision** (2026-11-25; replaces the "don't name the schools" idea,
which both critics showed can't work: published files carry the station code in every
record, and Raspberry Shake places each sharing Shake within a couple hundred meters).

- **A school whose installed Shake shares with Raspberry Shake's network has already
  settled its data being public.** Its record is public and live there, and Raspberry Shake
  archives it ("freely available"; privacy rights in shared data waived). For those schools
  our site adds no new exposure and needs no added delay: the school's name, its
  approximate location, its data and its summaries are published hourly.
- **A school that does not share** needs DRI and the district to approve, before anything is
  published, what goes public (the school's name, its location, the data, the summaries)
  and with what delay.
  - Default until they approve: nothing from that school is public, and the stopgap serves
    its classes.
  - DRI may still receive its data privately.
- **Sharing status is a fact DRI confirms in writing for each Shake.** Until it does, the
  school is treated as not sharing.
- M1 should record the decision in `decisions.md`.

### 2.1 Stopgap: day files in the browser (no server)

- **How it works:** a teacher on a staff computer opens the Shake's page and downloads a
  day file. Students get it through the school's own tools. Our viewer reads it in the
  browser and uploads nothing.
- **What a file covers:** class hours (about 14:00–23:00 UTC) fall in one UTC day, but an
  evening event needs the next day's file as well.
- **Terms:** fine, a documented interface of our own Shake.
- **IT:** staff computers must be allowed to reach the Shake on port 80. Schools often block
  internal traffic too.
- **Privacy:** the teacher holds the files.
- **Limits:**
  - hand work;
  - the Shake's retention;
  - whether today's partial file downloads is untested.

**Role:** until DRI's server runs, for a school whose feed is down, and for a school that
doesn't share and has no approval.

### 2.2 Automated feeds from school to DRI (no ports into the school)

**F2b. Bridge reads SeedLink with `slarchive`: recommended.**

- **How:** a DRI-owned Linux computer (a Raspberry Pi with a USB SSD, not its SD card) on
  the Shake's network segment.
  - It runs EarthScope's `slarchive` against the Shake's SeedLink (TCP 18000). This is
    Apache-2.0 software, and its manual says it writes an SDS tree directly
    (`<YEAR>/<NET>/<STA>/<CHAN.TYPE>/NET.STA.LOC.CHAN.TYPE.YEAR.DAY`).
  - It uses `-x statefile:<n>` so the resume point is saved every *n* packets, not only on
    a clean exit, which a power cut would lose.
  - Every hour it pushes the new data out (rsync appending over SSH, or hourly piece files
    over HTTPS that DRI's intake merges; DRI chooses).
  - It reports a heartbeat.
- **Credential:** none on the Shake (SeedLink needs no login). The bridge holds only its own
  upload credential, which can write only to its school's intake folder and which DRI can
  revoke.
- **License:** allowed. `slarchive` is listed in the license's table, and Option B supports
  this kind of use. Publishing is G1.
- **School IT must allow:**
  - the bridge on the Shake's segment, with a reserved address;
  - the bridge reaching the Shake on TCP 18000;
  - outbound HTTPS 443 (or 22 for rsync) to DRI's host only, exempt from TLS inspection;
  - nothing inbound.
- **How it fails, and refills:**
  - *Bridge down:* the Shake's SeedLink buffer ("some hours") covers short outages, and
    `slarchive` resumes from its state file. A longer outage needs a backfill by SFTP from
    the Shake's own archive (7 days by default), done by DRI by hand with an SSH key that
    is not stored on the bridge.
  - *Internet or DRI down:* nothing is lost; the bridge's own archive (weeks) holds the
    data until the push catches up.
  - *Shake reboots* (automatic OS updates end with a reboot): `slarchive` reconnects and
    resumes.
  - *Raspberry Shake removes SeedLink:* switch to F2a.
- **How anyone notices:** DRI's monitor flags a missing heartbeat, a stale `lastSample`, or
  clock drift (4.4), and emails the UHSN instrument contact. The website shows "data up to
  HH:MM".
- **Cost and effort:** one small computer with a USB SSD per school (roughly $150–250; check
  prices). Effort is in sections 5 and 6.

**F2a. Bridge copies the Shake's files over SFTP: backup.**

- **Why only a backup:** it needs the `myshake` login, which has administrator rights and
  opens the settings page. If used, use an SSH key (the manual recommends keys), never the
  stored password. Check `~/.ssh/authorized_keys` on each Shake at setup: some 2022 units
  shipped with a leftover key, per Raspberry Shake staff (R1).
- **When to use it:** for DRI's manual backfill, and as the plan if SeedLink is ever
  removed.

**F2c. Cellular variant.** The same bridge, with its own LTE modem, needs only power and the
Shake's network segment.

- **Data:** about 0.2 to 2 GB a month per school, depending on channels.
- **When:** for a district that refuses the outbound rule.
- **Ask:** whether DRI already has field telemetry contracts.

**F1. The Shake's UDP datacast to a DRI receiver: fallback, monitored pilot only.**

- **The receiver must keep gaps as gaps** and never fetch Raspberry Shake's inventory. So,
  not rsudp's writer: a small program of DRI's (for example ObsPy), or rsudp with
  `inventory_url` set to DRI's own StationXML and a different writer.
- **The stream is unencrypted and unauthenticated:** accept only each school's public
  address.
- **Size:** the text stream is about 4.5 to 8 times the miniSEED size, so about 70–120 MB a
  day per channel and up to about 45 kbit/s for a four-channel RS4D (R1, from the manual's
  bandwidth figures).
- **Gaps never refill.** Fill them by hand from the Shake's day files if they matter.

**F3. UUSS hosts the Shakes (G3).** UUSS would replace DRI's server, not the bridges, and
EarthScope would publish near real time. Its acceptance is conditional on its own tests:

- POST dataselect;
- CORS on all responses;
- StationXML completeness;
- code mapping (UUSS may assign its own codes);
- retention;
- how a delay is handled for schools that don't share.

Ask UUSS first, through Dale and Cleat.

| | F2b SeedLink bridge | F2a SFTP bridge | F1 Datacast | F3 UUSS |
| - | ------------------- | --------------- | ----------- | ------- |
| Credential on school device | Upload key only | Shake admin login (key) | None | As F2b |
| School IT | LAN 18000; out 443 | LAN 22; out 443 | Out UDP, one port | As F2b |
| Encrypted, authenticated | Yes | Yes | No | Depends |
| Lost data | Refilled (bridge disk; SFTP backfill) | Refilled from the Shake (its retention) | Never refilled | Depends |
| Depends on Raspberry Shake keeping | SeedLink | SFTP access | The datacast | Same as feed |
| Role | **Recommended** | Backup and backfill | Pilot fallback | Ask |

### 2.3 Where the data live: DRI's server and the publish step

The spec is the contract.

- **Delivered and published are separate.**
  - *Delivered* means data have reached DRI's private intake: day D by 12:00 UTC on D+1,
    and for hourly stations within about an hour.
  - *Published* means the publish step has copied them to the public tree.
- **How the publish step works:** it runs every few minutes, works out each station's
  cutoff (now minus its approved delay, which is zero for sharing schools), and copies only
  whole 512-byte records that end before the cutoff. It does not rewrite headers.
- **What obeys the cutoff:** summaries and indexes are built only from the public tree.
- **The test:** a checker tries to fetch data newer than the cutoff and must fail.
- **No conflict with a one-day delay:** day D is delivered by noon on D+1 and published
  about 00:00 UTC on D+2.
- **Design (a), plain files on HTTPS,** is recommended to start:
  - the Shake's own SDS layout;
  - range requests, with a seek table per channel-day, so a quake window costs about 50 KB
    per channel per device;
  - CORS `*` on every response including errors;
  - caching that tolerates late refills;
  - JSON field tables, StationXML 1.2.
- **Design (b), FDSN web services,** can follow on the same files. It needs Raspberry
  Shake's agreement if it serves `AM` codes.

**Sizes, measured and estimated:**

- **Measured:** four UU day files, 6.2–10.4 MB, all 512-byte Steim2 records.
- **Worked out:** a 512-byte Steim2 record holds at most 721 samples, so a 100-sample-per-
  second day file can't be smaller than about 6.1 MB. The manual's "about 15 Mb" must
  therefore mean megabytes; as megabits it would be 1.9 MB.
- **Planning figure (estimate):** 6–15 MB per channel per day. For five schools, about
  30–300 MB a day and 11–110 GB a year.
- **To measure:** DRI measures one real file per installed model before sizing storage.

### 2.4 Products from delayed data

- **What they are:** noise levels for School Pulse (15-minute steps, `carpet.js`); clear-S
  counts for new quakes (D33, `clear-s.js`); an optional 24-hour envelope.
- **Who writes them:** we write the code, versioned, with its parameters documented so
  values can be reproduced.
- **Default runner:** DRI, inside the publish step, reading the public tree, so products
  obey the cutoff and never enter git history.
- **Alternative runner:** our GitHub job, publishing them inside the Pages build rather than
  committing them. It needs a keep-alive and a staleness alarm, because GitHub disables
  scheduled workflows in public repositories after 60 days without activity; a summer
  break would stop them silently.
- **Privacy:** 15-minute noise levels show when a building is busy, which is the point of
  S3. They follow the same rule as raw data: public for sharing schools, only if approved
  for the others.

### 2.5 Live data: an optional later extra

Only if teachers ask after trials.

- **B1, a hallway display with rsudp:** only with `inventory_url` pointed at DRI's
  StationXML. Otherwise drop it.
- **B2, a bridge serving our viewer inside the school:** recheck under Chrome's Local
  Network Access for WebSockets (milestone 147) before ruling it out.
- **C-live, `wss://` from a ringserver at DRI:** fed by the same bridge.

EarthScope's public server lets us rehearse a live client on stand-ins (teacher's screen
only: 5 connections per user).

### 2.6 Paths side by side

| Path | Delay | Automated | Terms | Role |
| ---- | ----- | --------- | ----- | ---- |
| Stopgap: day files by hand | Same day | No | Ours | Until the server runs; backup; schools that don't share |
| **F2b SeedLink bridge → DRI** | About 1–2 h (sharing), or the approved delay | Yes | Allowed; G1 before publishing | **Recommended** |
| F2a SFTP bridge | Same | Yes | Allowed | Backup, backfill |
| F2c Cellular bridge | Same | Yes | Allowed | If outbound rules are refused |
| F1 Datacast | Minutes, with gaps | Yes | Allowed; "not for production" | Pilot fallback |
| F3 UUSS | Near live | Yes | G3 | Ask |
| Products | With the data | Yes | Ours; never from Raspberry Shake's servers | DRI's publish step |
| Live | Seconds | Yes | G1 | Optional, later |
| Data from Raspberry Shake's servers, paid or free; software on a Shake | — | — | **Not allowed** | Rejected |

### 2.7 Gray areas under Raspberry Shake's terms, and which to pursue

Gus, 2026-11-25: we abide by Raspberry Shake's terms; pursue permission where the benefit is
large or getting it is easy; drop paths that add little.

| # | Gray area | Benefit | Ease | Verdict |
| - | --------- | ------- | ---- | ------- |
| **G1** | DRI publishes its own Shakes' data, read directly, on a free education site, with summaries. The letter says DRI publishes its own instruments and is not a data center integrating Raspberry Shake's data | High: everything automated | One letter | **Pursue** |
| **G1b** | The same through DRI's own FDSN service with `AM` codes (spec design (b)) | Medium: lighter downloads, research tools | Same letter | **Pursue** (one line) |
| **G2** | Several UHSN schools side by side (S2, S7, S8) | High | Same letter | **Pursue** |
| **G3** | UUSS or EarthScope hosts the UHSN Shakes | High | Mostly UUSS's call | **Ask UUSS first** |
| G4 | Keep the manual's per-model response templates in our app | Medium (µm/s) | Easy | Ask in passing; a template is documentation |
| G5 | Credit wording for our own Shakes' data | Low | Easy | Ask in passing; DRI sets its own credit line (6) |
| G6 | A free school program is "hobbyist or teacher" use | Low | Easy | Ask in passing |
| G7 | Embedding DataView | Low | — | **Drop** |
| G8 | Probing the Shake's SeedLink for WebSocket | Low | — | **Drop** |

**If Raspberry Shake does not answer within 6 weeks of DRI's letter, DRI decides** (Gus,
2026-11-25: not our call). One option DRI may take:

- publish our own sharing schools' data, read directly, one school per page, citing the
  license's Option B;
- no FDSN service with `AM` codes (G1b), and no side-by-side page (G2), until answered;
- stop if Raspberry Shake objects.

## 3. Linking to Raspberry Shake's viewers

**Verified on 2026-11-25** in headless Chrome, with a public German Shake as the test:

- `https://dataview.raspberryshake.org/#/AM/R28DF/00/EHZ` opens DataView with that Shake
  and channel selected, on its 24-hour helicorder. Use one channel per link.
- `https://stationview.raspberryshake.org/#/?net=AM&sta=R28DF` opens StationView on the
  station with its panel open.
- A map-only StationView address loaded no stations in headless Chrome. That is
  inconclusive, so it tells us nothing yet about whether the UHSN Shakes appear.

**Per school, by sharing status** (replaces the earlier options L1 and L2):

- **Sharing school:** public links on "Our stations and data", on the S1 card and in the
  viewer's top bar. They use the code Raspberry Shake's viewers show (`rsSta`), which may
  differ from the code in the files.
- **School that doesn't share:** no links (S1 uses our viewer with its approved data, or the
  stopgap).

Links are allowed under the terms: we show no data and frame nothing.

**Before linking:**

- DRI confirms each school's sharing status and both codes;
- check the links on a normal browser and on a school Chromebook. StationView's live trace
  uses ports 8079 and 18082, which filters that allow only 80 and 443 will block, so S1 can
  fail even with sharing on. Add this check to the S1 prerequisites and to site visit T5.

## 4. Annotations and clocks

### 4.1 Kinds and sources

| Kind | Source | Who enters it |
| ---- | ------ | ------------- |
| Bell schedule, calendar | The school's published schedule and district calendar | Teacher or DRI, yearly |
| Buses (S4) | Class log | Teacher |
| Games, assemblies (S7) | Public schedules, play-by-play | Teacher |
| Class experiments (S10–S18, P2, R cards) | The session log (activities B5, Appendix E) | Teacher |
| ShakeOut (S8) | Public drill time | DRI |
| Quakes | USGS catalog with predicted P and S times | Automatic |
| Detections | A simple detector, as candidates | Automatic, then students |
| Weather (S6) | A weather station, if a free source allows browser requests | Automatic |
| Station work | DRI's log, the bridge's heartbeat, gaps from the index | DRI, automatic |

### 4.2 Storage without student data

- **Default: the class's own file.** Markers and session logs stay in the browser, with an
  export and import file the teacher keeps. Nothing passes through DRI or Gus, so it scales
  past a pilot.
- **Shared notes (public, curated):** a small JSON file per school in the site's data folder
  (bells, calendar, games, ShakeOut, and logged experiments a teacher chooses to share).
  These are public for sharing schools; for schools that don't share, only if the approval
  covers them.
- **Notes are tied to a station,** so Juab's two Shakes each keep their own; one is marked
  primary.
- **Rules:** no student names or initials; teacher-written free text, checked before
  publishing; each note records its source; times stored in UTC and shown in local time.

### 4.3 How they show

- Shaded spans and ticks, colored by kind, with a legend.
- Local time on the axis.
- Quake marks with predicted P and S times.
- In experiment mode, a row per drop, and a flag for a logged drop missing from the record.
- With delayed data, "data up to HH:MM", with the time after it greyed.
- On-plot hints (D35).

### 4.4 Clocks: a real check

The quick check in version 2 was wrong. The Shake's time-quality flag "goes from OFF to ON
exactly once (and remains ON …)". So a Shake that later loses its time server keeps
forwarding data and looks live while drifting about 2 seconds a day. The check is now:

1. **Automatic, on the bridge.** The bridge keeps its own network time. For each SeedLink
   record it notes arrival time minus the time of the record's last sample. Normally that
   is a small, steady delay; a Shake clock running fast or slow makes it drift. An alarm
   at about 1 second catches lost time sync within about a day.
2. **At install and visits:** DRI runs `ntpq -p` on the Shake ("refid = INIT" means no time
   server).
3. **Monthly, in the data:** the viewer's P-arrival comparison with a nearby UU station for
   a regional quake (V4).
4. **On record:** a `clockChecked` date per station in `stations.json`.

For drops, teachers log times from the Chromebook clock, and the page snaps each drop to the
nearest burst.

## 5. Effort

**One scale, shared with P4:**

- **S:** up to 2 days.
- **M:** 3–7 days.
- **L:** more than 7 days.

Claude session-days, Gus's review, DRI staff days, and teacher and school IT time are given
separately.

**Rework allowance.** Quake Locator's first build took about a day (2026-11-23). Gus's
review additions (D14–D16), its share of the navigation rework (D17, D21), generated figures,
the rename (D30) and the spelling pass (D32) took roughly two to three more. So the finished
result came to about 2 to 3 times the first build, a rough reading of the status log. I plan
×2 for student-facing work and ×1.5 for scripts.

| Piece | First build → with rework (Claude session-days) | Size | Gus review | DRI staff days | Teacher / school IT | Now? |
| ----- | ----------------------------------------------- | ---- | ---------- | -------------- | ------------------- | ---- |
| V1 Day viewer, file-first (shared file reader with P4) | 2–3 → 4–6 | M | ½ day | ½: send real files | — | **Yes** |
| V2 Annotations | 1 → 2 | S | ¼ day | — | Teacher: bell schedule, 1 h a year | **Yes** |
| V3 Experiment mode (band-limited energy) | 2–3 → 4–6 | M | ½ day | ½: one trial | Teacher: one class trial, 1 h + 30 min feedback | Logic yes |
| V4 Comparison, clock check | 1–2 → 2–4 | S–M | ¼ day | — | — | Yes |
| Docs: guide, chosen cards | 1–3 → 2–5 | S–M | 1 day | — | Teacher review | After Dale and Cleat |
| **Viewer total** | **5–8 → about 10–16** | **L** | **about 2–3 days** | **1–2** | | |
| U1 UHSNSource: range and seek reader, routing, third label | 2–3 → 3–4 | M | ¼ day | — | — | Yes, on a mock tree |
| U2 Bridge: `slarchive` setup, push, heartbeat, clock-drift check | 1 → 1–2 | S | ¼ day | In 6 | — | Bench test |
| U3a Checker, with JSON Schema files and fixtures | 2 → 3 | M | ¼ day | — | — | Yes |
| U3b Publish, index and sidecar scripts; draft `stations.json` | 1–2 → 2–3 | S–M | ¼ day | In 6 | — | Yes |
| U4 Products (noise levels, clear-S, envelope) and their readers | 1–2 → 2–3 | S–M | ¼ day | — | — | Yes, on stand-ins |
| **Data system total (our side; matches the spec's breakdown plus U2)** | **7–10 → about 11–15** | **L** | **about 1–2 days** | | | |
| F1 receiver (only if needed) | 1 → 1–2 | S | — | 1–2 | School IT: one UDP rule | When needed |
| Live (optional) | 3–5 → 5–8 | L | 1 day | 3–10 | — | No |

**DRI's setup** (details in section 6) is about 13–19 staff days (L): server 3–5, bridges 3–5,
five installs at about 1 each, monitoring 1, security review 1–3. Add travel if visits are
needed. DRI is based in Nevada; whether it has staff in Utah is a question in the brief.

**Elapsed calendar time** (estimates) sets the date, not effort:

| Step | Elapsed time |
| ---- | ------------ |
| Raspberry Shake's letter | 2–6 weeks (default at 6) |
| School IT approvals | 2–6 weeks each |
| District approvals (only for schools that don't share) | 1–3 months |
| DRI IT's queue | Unknown (asked) |
| Bench test | About 2 weeks |
| One-school pilot | About 4 weeks |

**So:** first school data about 2–4 months after DRI IT agrees, all five schools about 3–6
months after. The stopgap covers until then.

## 6. Operations: who owns what

| Job | Owner | What | Time (estimate) |
| --- | ----- | ---- | --------------- |
| Server, intake, publish step | DRI IT | Patches, backups, certificate; a yearly restore test | Setup 3–5 days; about ½ day a month, plus 1 day a year |
| Bridges | DRI IT | Build one image, bench test, mail pre-imaged ("zero-touch": school IT plugs it in, it reports in); automatic security updates; monthly check; replace on failure | Setup 3–5 days; about 1 day per school (remote; plus travel if on site); about 2 hours a month for all five; a failure costs about ½ day plus shipping |
| Credentials | DRI IT; the UHSN team holds Shake passwords | One upload credential per school, write-only to its intake folder, rotated yearly and on loss; no Shake login on bridges; SSH key for backfill kept by DRI | About 1 hour per rotation |
| Monitoring and alerts | DRI IT sets up; the UHSN instrument contact receives | Heartbeat, stale `lastSample`, clock drift, disk, publish step running, products fresh | Setup 1 day; about 1–2 hours a month |
| School IT support | School IT; the UHSN contact coordinates | Rules, reserved addresses, power, restarts, notice of network changes | About 2–4 hours per school at setup, then about 1 hour a term |
| Shake care | DRI UHSN team | Inventory, OS version (v21.2 or later), sharing status and codes, storage check before raising retention, clock check, "never just pull the plug" | About 2–4 hours per school at setup, then about 1 hour per school a term |
| Security review | DRI IT (and the districts' own) | Server and devices on school networks | 1–3 days (unknown) |
| Website, reader, scripts | Website team | Section 5; if products run on GitHub, the keep-alive and staleness alarm | Claude session-days; Gus's review |

**DRI's ongoing total:** about 1–2 staff days a month across all jobs.

## 7. Connecting a school's Shake: draft steps

*A draft. The polished guide comes after the pilot, tested on a real Shake.*

### 7.1 Tags

Each step has two tags:

- **Status:** *works today* (tried, or a documented one-click action), *untested* (from the
  manual, not tried on a UHSN Shake) or *to build*.
- **Depends on:** *approval*, *DRI's server*, *a bridge*, *our new page*, or nothing.

Teachers only locate, look and report; they never change the Shake's settings.

### 7.2 Phases

**A. Decisions and inventory (DRI UHSN team, before anything else)**

1. **Inventory each Shake** through DRI's records and an SSH visit: model and version, both
   codes (`sta`, `rsSta`), Shake OS version, owner, sharing status (confirmed in writing),
   card size and free space, and the oldest day file present.
   *Status: untested · Depends on: nothing*
2. **Send Raspberry Shake the letter** (G1, G1b, G2; G4–G6 in passing). Note the date: after
   6 weeks without an answer, DRI decides what to do. *Status: to build · Depends on: nothing*
3. **For each school that doesn't share:** a DRI and district approval of what goes public
   and with what delay. Default: nothing is public. *Status: to build · Depends on:
   approval*
4. **DRI IT agrees to the spec and the server** (the brief's questions).
   *Status: to build · Depends on: approval*

**B. School IT approval** (per school)

5. **School IT reviews and sets the rules:**
   - a reserved address for the Shake and the bridge;
   - the bridge may reach the Shake on TCP 18000;
   - outbound HTTPS from the bridge to DRI's host, exempt from TLS inspection;
   - the Shake's own needs (7.6);
   - who may restart the bridge;
   - the district's own security and privacy review of a DRI device.

   *Status: untested · Depends on: approval*
6. **Power:** an outlet, ideally with battery backup. **Never just pull the Shake's plug:**
   shut it down from its web page (the manual's advice). *Status: works today · Depends on:
   nothing*

**C. Bench test at DRI** (with a spare Shake, for example Juab's second if free)

7. Run `slarchive` with a state file. Then test pushing to a test server, the publish step
   and cutoff, the checker, a Shake reboot, a bridge power cut, an internet outage and
   catch-up, the clock-drift alarm, and SFTP backfill with a key.
   *Status: to build · Depends on: DRI's server, a bridge*
8. **Collect the acceptance files:** one full UTC-day file per installed model and channel.
   Record its miniSEED version, encoding, record length, codes, sample rate and bytes, and
   check that our reader opens it. *Status: to build · Depends on: nothing*
9. **Storage check before raising retention:** days that fit = free space ÷ (channels × 15
   MB) with a 50% margin. Set retention no higher than that. After a week, check that the
   oldest file matches the setting (the v21.1 bug). With F2b, the default 7 days is enough
   for backfill. *Status: untested · Depends on: nothing*

**D. One-school pilot** (a sharing school first: no approval needed beyond confirming it
shares)

10. Mail the pre-imaged bridge; school IT plugs it in; it reports in. DRI checks the index,
    the heartbeat and the clock alarm. *Status: to build · Depends on: a bridge, DRI's
    server*
11. Four weeks of monitoring. A teacher opens the viewer and looks at a class experiment the
    same day. *Status: to build · Depends on: DRI's server, our new page*

**E. The other schools,** one at a time, from steps 5, 6 and 10.

### 7.3 What a teacher does (read-only)

1. **Find the Shake** with DRI: room, floor, the lights. On the Pi board, red is steady and
   green flashes every few seconds; on the Shake board, blue is steady; at the network
   socket, green flashes and orange is steady. Don't move it (D26) and don't unplug it.
   *Status: works today*
2. **Report** anything odd to the UHSN contact (no lights, moved, unplugged).
   *Status: works today*
3. **Sharing schools, S1:** open the StationView and DataView links (section 3) on a school
   Chromebook. *Status: untested · Depends on: DRI confirming the codes*
4. **Keep the session log** (time from the Chromebook, spot, distance, mass, height).
   *Status: works today*

### 7.4 Stopgap steps (teacher, on a staff computer)

1. Open `http://<the Shake's address>/` › Actions › Downloads › Data and download the day's
   file (and the next day's for an evening event). *Status: untested · Depends on: nothing*
2. Share it through the school's own tools; open it in our viewer.
   *Status: to build · Depends on: our new page*

### 7.5 Fallback steps (F1)

1. DRI runs a receiver that keeps gaps and never fetches Raspberry Shake's inventory.
   *Status: to build · Depends on: DRI's server*
2. School IT allows outbound UDP from the Shake to that host and port.
   *Status: untested · Depends on: approval*
3. DRI adds the destination under Settings › Datacast on the Shake.
   *Status: works today · Depends on: approval*

### 7.6 IT appendix: ports, by path

| Who connects | To | Port | Needed for |
| ------------ | -- | ---- | ---------- |
| Shake | Time servers | 123 UDP/TCP, both directions | Always (clock) |
| Shake | DNS | 53 | If not provided inside |
| Shake | Update servers, including `registry.gitlab.com` and `gitlab.com` | 443, 22; no TLS inspection for these | Shake OS updates |
| Shake | `raspberryshakedata.com` | TCP 55555, 55556 | Sharing schools |
| Bridge | Shake | TCP 18000 (inside the school) | F2b |
| Bridge | Shake | TCP 22 (inside; DRI only, by arrangement) | F2a backfill |
| Bridge | DRI's host | 443 (or 22 for rsync), no TLS inspection | F2b, F2a |
| Bridge | Time servers, OS update mirrors | 123, 443 | Always |
| Shake | DRI's receiver | One UDP port | F1 only |
| Staff computer | Shake | TCP 80 (inside; schools often block internal traffic) | Stopgap |
| Student browsers | Our site, `service.earthscope.org`, `earthquake.usgs.gov`, `tile.openstreetmap.org`, DRI's data host | 443 | All apps |
| Student browsers | `*.raspberryshake.org` on 443; `stationview.raspberryshake.org` on 8079 and 18082 | | S1 links |

### 7.7 Checklist: what to ask

**DRI UHSN team:**

- [ ] For each Shake: model and version, both codes, OS version, owner.
- [ ] Sharing status, in writing.
- [ ] Card size and free space.
- [ ] Who holds the password.
- [ ] Whether there are leftover SSH keys.
- [ ] Which Shake is primary at Juab, and whether the second is free for the bench test.
- [ ] Real day files.
- [ ] The instrument contact who gets alerts.

**School IT:** the rows of 7.6 for the chosen path.

- [ ] Device policy for a DRI bridge.
- [ ] TLS inspection.
- [ ] Who manages the filter.
- [ ] Battery backup.
- [ ] Whether internal traffic to the Shake is blocked.

### 7.8 Troubleshooting (draft)

| Problem | Likely cause | Try |
| ------- | ------------ | --- |
| `rs.local` or the address doesn't open | Different segment; internal traffic blocked; Shake off | Ask IT; check the lights |
| Not in StationView | Sharing off; 55555 and 55556 blocked; just restarted | Check sharing; IT checks the ports |
| S1 live trace blank on a Chromebook | Ports 8079 and 18082 blocked by the filter | IT allows them, or use DataView |
| "Data up to" is old | Bridge off; network or credential change; TLS inspection; DRI down | DRI checks the heartbeat; once fixed, the bridge catches up from its own disk |
| A gap that never fills | Datacast (F1), or a bridge outage longer than the SeedLink buffer and the Shake's retention | DRI backfills by SFTP within the Shake's retention |
| Clock-drift alarm | Shake lost its time server | IT opens 123; DRI checks `ntpq -p` |
| Times off by 6 or 7 hours | UTC | The viewer shows local time |
| Fewer days on the Shake than set | The Shake OS v21.1 bug; full card | Update the OS; storage check |
| Flat-topped drops | Clipping | Start the distance line at 2 m |
| The Shake was unplugged or moved | — | Tell DRI; shut down from the web page next time |

## 8. Risks, outside answers, open questions, recommendation

### 8.1 Risks

- **School IT refuses a bridge.** Use F2c (cellular) if DRI has telemetry; otherwise the
  F1 pilot or the stopgap.
- **Raspberry Shake removes SeedLink or changes its OS.** Switch to F2a; monitoring catches
  the change.
- **The terms:** G1 is not yet answered; the default is Gus's call.
- **Occupancy at schools that don't share** is settled by approval; until then, nothing is
  published.
- **Calendar time:** approvals and DRI's queue take months; the stopgap covers.
- **Bridge security:** the bridge holds only an upload key, but a stolen bridge can still
  read the school's SeedLink and write to one intake folder. Revoke its key.
- **Scope creep:** rebuilding DataView, or adding live data early.
- **Teacher time:** keep the session log to minutes.

### 8.2 Outside answers we wait on, with proposed defaults

| Waiting on | From | Wait | Default if no answer |
| ---------- | ---- | ---- | -------------------- |
| G1, G1b, G2 | Raspberry Shake | 6 weeks after DRI's letter | **DRI decides** (Gus: not our call). One option: publish our sharing Shakes' data one school per page, citing Option B; no `AM` FDSN service, no side-by-side; stop if they object |
| Sharing status and codes per Shake | DRI | Before any publishing | Treated as not sharing: nothing public |
| What may go public, and the delay | DRI and district (schools that don't share) | — | Nothing public; the stopgap |
| DRI IT's commitment | DRI IT | About 8 weeks after the brief | The stopgap continues; Gus considers another host (UUSS, or a small cloud host) |
| UUSS hosting (G3) | UUSS | 6 weeks | The DRI path |
| Bridge approval | School IT | Per school | F2c, else F1 pilot, else the stopgap |
| Activity choices | Dale and Cleat | — | Build V1 and V2 (S1 is in the pilot); hold V3 |
| Real day files | DRI | — | Build on UU files; freeze nothing format-specific |

### 8.3 Open questions

- **For DRI IT:** the brief's 12 questions (★ first) and the spec's open choices.
- **For the DRI UHSN team:** the checklist in 7.7.
- **For Raspberry Shake:** G1, G1b, G2; G3 if UUSS agrees; G4–G6 in one line each.
- **For Gus:**
  1. the default in 8.2 for Raspberry Shake's silence;
  2. whether to allow a one-off download of one public Shake's day file from Raspberry
     Shake's data service, to settle sizes now (my recommendation: wait for DRI's files);
  3. whether the viewer and School Pulse stay separate apps that share parts
     (recommended);
  4. whether the file-first viewer starts before Dale and Cleat answer.

### 8.4 Recommendation

**Build, in three steps.**

1. **Now** (L, about 10–16 session-days with rework): the file-first viewer (V1–V4) on UU
   days and teacher-downloaded files. In parallel: U1, U3 and U4, against a mock tree from
   UU data.
2. **With DRI IT:**
   - the server in design (a), with a private intake and a publish step;
   - F2b bridges, piloted at one sharing school first, published hourly with no added
     delay;
   - F1 only as a monitored pilot fallback;
   - UUSS asked in parallel.
3. **Later and optional:** live data.

**Also:**

- **Don't fold the viewer into School Pulse;** they share the reader, the annotations and the
  helicorder.
- **Link** only sharing schools to Raspberry Shake's viewers, by `rsSta`.
- **Preferred data path:** F2b, a DRI bridge reading the Shake's SeedLink with `slarchive`
  (no Shake password), pushing hourly over HTTPS to DRI's private intake, with a publish
  step to the spec's public files.

## 9. Response to the critiques

Every finding on the review, the brief and the spec, from R1 (`critique-r1-claude.md`) and
R2 (`critique-r2-codex.md`). Spec rows refer to draft 0.2 of the spec. Findings on P4's
review are P4's to answer, except the shared issues that touch these documents.

**Response codes:**

- **Accepted:** done as the critic suggested.
- **Changed:** done another way, or decided by Gus.
- **Declined:** not done, with the reason given.

### 9.1 R1 on the review

| ID | Finding | Response | What we did, and why |
| -- | ------- | -------- | -------------------- |
| P3-M1 | Not naming schools (L2) can't coexist with the spec or with publishing | Changed | Gus's decision 1 replaces L1 and L2: per-school sharing status decides (2.0.4, 3) |
| P3-M2 | The quick clock check is wrong | Accepted | Removed; replaced by the bridge's drift alarm, `ntpq -p`, a monthly P-arrival check and `clockChecked` (4.4) |
| P3-M3 | rsudp fetches Raspberry Shake metadata and fills gaps with zeros | Accepted | F1's receiver must keep gaps and never fetch their inventory; B1 only with `inventory_url` to DRI's StationXML, else dropped (1.1, 2.2, 2.5). M1: the overview's §4.4 also names rsudp as a forwarder |
| P3-S1 | The SeedLink and `slarchive` feed is missing | Accepted | F2b is now recommended; F2a (SFTP) is backup and backfill (2.2) |
| P3-S2 | Same-day use versus the delay | Changed | Gus's decision 2: sharing schools hourly, no delay; requirement stated; the stopgap for the rest (1.3, 2.3) |
| P3-S3 | G1 more settled; the "Data Centers" sentence; `AM` via FDSN; no default | Accepted | Both passages quoted (2.0.3); G1b added; default proposed for Gus (2.7, 8.2) |
| P3-S4 | Travel, elapsed time, Gus's time | Accepted | Elapsed-time table, Gus-review column, zero-touch install, a Utah staff question (5, 6) |
| P3-S5 | Firewall and filter lists incomplete | Accepted | IT appendix (7.6); S1 Chromebook check in section 3 and T5 |
| P3-S6 | R vs S codes | Accepted | `sta` and `rsSta` per station (2.0.1, 3; spec) |
| P3-S7 | Products: public repo, no delay, the 60-day switch-off | Accepted | Built from the public tree only; DRI's publish step by default; GitHub alternative as a Pages artifact with keep-alive and alarm (2.4) |
| P3-S8 | Retention bug in v21.1; automatic reboots | Accepted | OS version in the inventory; storage check and oldest-file check (7.2 step 9); `slarchive` rides through reboots (2.2) |
| P3-C1 | Cellular uplink | Accepted | F2c (2.2); brief Q1 |
| P3-C2 | "13 of 18" can't be reproduced | Accepted | Listed: 12 need, 4 helped, 2 elsewhere (1.3) |
| P3-C3 | Evening events cross UTC midnight | Accepted | S7 row, stopgap (2.1, 7.4); the spec's reader spans days |
| P3-C4 | Recheck B2 (WebSockets, milestone 147) | Accepted | Text updated (2.0.2, 2.5); live stays optional |
| P3-C5 | Energy, not peak | Accepted | Experiment mode uses band-limited energy, peak shown; one measure with P4 (1.2) |
| P3-C6 | Tags mix status and dependency | Accepted | Two tags (7.1) |
| P3-C7 | "Never just pull the plug" | Accepted | 7.2 step 6, 7.3, 7.8 |
| P3-C8 | Juab has two Shakes | Accepted | Several stations per school, one primary (2.0.1, 4.2; spec) |
| P3-C9 | Routing logs through DRI or Gus won't scale | Accepted | The class's own export file is the default (4.2) |
| P3-C10 | F1's upload is larger than estimated | Accepted | 70–120 MB a day per channel, up to about 45 kbit/s (2.2) |

### 9.2 R1 on the brief

| ID | Finding | Response | What we did, and why |
| -- | ------- | -------- | -------------------- |
| B-S1 | Say that a sharing Shake is already public | Changed | Gus's decision 1, stated in "What goes public" |
| B-S2 | An "At a glance" box | Accepted | Added; sponsor and dates left for Cleat to fill in |
| B-S3 | Ask what DRI already runs | Accepted | Q1 (★), including cellular telemetry |
| B-S4 | Say what the bridge's credential can do | Accepted | F2b needs no Shake login; the upload key is limited to one folder; SFTP's admin login only as DRI's keyed backfill |
| B-S5 | Data license and credit | Accepted | Q10; spec open choice |
| B-S6 | The upload figure contradicts re-sending | Accepted | Hourly pushes send new data only; figures corrected |
| B-C1 | Explain the TLS-inspection exemption | Accepted | One sentence |
| B-C2 | A small diagram | Accepted | Added |
| B-C3 | Mark the first questions | Accepted | ★ on Q1–Q4 and Q12 |
| B-C4 | The site is on a personal GitHub, moving to DRI | Accepted | Closing note; one reason for CORS `*` |

### 9.3 R1 on the spec

| ID | Finding | Response | What we did, and why |
| -- | ------- | -------- | -------------------- |
| SP-M1 | No delay mechanism; delivery deadline conflicts | Accepted | Delivered versus published; private intake; a publish step that cuts whole records at the cutoff; products and indexes from the public tree; a checker test |
| SP-M2 | School names conflict with P3 | Changed | Gus's decision 1: names public for sharing schools, approval for the others |
| SP-M3 | 404s without CORS | Accepted | CORS `*` on every response (nginx `always`); OPTIONS answered; the reader consults the index first |
| SP-S1 | Range requests and quake windows | Accepted | Range requests required; a seek table per channel-day; the reader filters by header time before decoding |
| SP-S2 | Use `*` | Accepted | Fixed; no longer a choice |
| SP-S3 | Station codes | Accepted | `rsSta` added; the "DRI network code" choice removed; G1b in the letter |
| SP-S4 | Verify layout and record size | Accepted | Acceptance files per model; `slarchive`'s SDS layout verified from its manual; SeedLink 3 sends 512-byte records; still confirmed on real files |
| SP-S5 | Products: delay, permanence, 60 days | Accepted | As P3-S7 |
| SP-S6 | Index precise enough for two implementations | Accepted | Field tables (normative), rules for gaps, coverage, bounds and nulls, write order, size limits; JSON Schema files ship with our checker; `msi` or `mseedindex` suggested |
| SP-S7 | License and credit line | Accepted | Open choice for DRI, with a suggestion |
| SP-C1 | Late refills versus caching | Accepted | `no-cache` with ETag for days within 35 days |
| SP-C2 | Response source | Accepted | StationXML 1.2 from the manual's per-model templates, not Raspberry Shake's FDSN service |
| SP-C3 | Several Shakes per school; the roaming Shake | Changed | Several stations: accepted. The roaming Shake's field files are deferred: they need a manual upload path, and no kit is budgeted |
| SP-C4 | Small type mismatches | Accepted | Fields aligned with the apps' Station type (`sensitivity`, `sensor`) |

### 9.4 R1 shared issues touching these documents

| # | Finding | Response | What we did, and why |
| - | ------- | -------- | -------------------- |
| 1 | One privacy decision, scattered | Changed | Gus's decision 1, in one place (2.0.4), echoed in the brief and spec; M1 to record it in `decisions.md` |
| 2 | Effort scales differ | Accepted | The shared scale (5) |
| 3 | Calibration leaves out rework | Accepted | Rework allowance ×2 (×1.5 for scripts), plus Gus's review (5) |
| 4 | Gates with no dates | Accepted | Waits and defaults (8.2) |
| 5 | Peak versus energy | Accepted | Band-limited energy (1.2) |
| 6 | One shared file reader | Accepted | V1 owns it, P4's CSV loader feeds the same `Trace`, and T3 waits for V1 (5) |
| 7 | No data credit for UHSN's own data | Accepted | Brief Q10; spec open choice |

### 9.5 R2 on the review, the brief and the spec

| Finding | Response | What we did, and why |
| ------- | -------- | -------------------- |
| Review MUST: the delay is not enforced | Accepted, with one part declined | Private intake, publish step, cutoff test (2.3). **Declined for sharing schools:** no approval or delay beyond sharing, by Gus's decision, because their record is already public and archived by Raspberry Shake |
| Review MUST: connection steps need a gate and a teacher rewrite | Accepted | Phases A–E; teachers read-only; IT appendix by path; storage check; honest tags (7) |
| Review SHOULD: F2's operations and alternatives | Accepted | Operations table with owners and time (6); existing DRI devices and telemetry asked (brief Q1); UDP only as a monitored pilot; F2b |
| Review CONSIDER: teacher-only code entry doesn't make a Shake private | Accepted | L2 removed; links for sharing schools only (3) |
| Brief MUST: publication authorization first | Changed | Gus's decision 1, near the top of the brief; the approval covers name, location, data, summaries and delay for schools that don't share |
| Brief SHOULD: units; measured versus estimated | Accepted | Arithmetic floor shows "15 Mb" means MB; measured UU files labeled; DRI measures real files first |
| Brief SHOULD: operating ownership and effort | Accepted | "Who maintains what" with time; Q5 |
| Spec MUST: enforce the cutoff everywhere | Accepted | As SP-M1 |
| Spec MUST: a machine-readable interface | Changed | Field tables are normative now; JSON Schema files and fixtures ship with our checker before DRI builds; StationXML 1.2; status codes; a per-school, folder-limited upload credential |
| Spec SHOULD: verify formats with real files | Accepted | Acceptance files per model; original bytes preserved; reader checked |
| Spec SHOULD: public metadata and reproducible products | Accepted | A restricted install inventory kept apart from the public field list; product algorithms and parameters versioned |
| Spec CONSIDER: UUSS and FDSN are conditional | Accepted | Host acceptance tests listed (2.2 F3; spec) |
| Shared 1: occupancy needs a release decision | Changed | Gus's decision 1 |
| Shared 2: separate development and operating effort | Accepted | Sections 5 and 6 |
| Shared 3: source logs on primary evidence | Accepted | Source log updated: search-only items marked; `slarchive` manual read; untested items listed |
| Shared 4: verify formats and sizes on installed instruments | Accepted | 7.2 steps 8–9 |
| Shared 5: direct access isn't unlimited redistribution | Accepted | Written authorization stays the gate (G1); the default after silence is Gus's decision, not ours |
