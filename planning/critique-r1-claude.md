# Critique R1: the school Shake viewer, the DRI brief, the data spec, and the Phone Recorder

*Session R1-app-critique (Claude), 2026-11-25. An independent critique for the authors (P3,
P4), M1 and Gus. I did not read any other critique. Facts were checked against primary
sources on 2026-11-25:*

- *I read the Raspberry Shake license and manual pages myself.*
- *Three helper agents read browser-engine source code and W3C specifications, Utah statutes
  and rules, and seismic-software documentation; I re-read their key quotes.*

*Each finding gives where it is, the problem, the evidence and a suggested change. Ranks:*

- ***MUST:*** *wrong, or will break something if built as written;*
- ***SHOULD:*** *a real gap or an under-weighted risk;*
- ***CONSIDER:*** *an improvement.*

*Section numbers refer to each document's own headings.*

Documents:

- **P3:** `review-shake-viewer.md` (+ `viewer-sources.md`)
- **Brief:** `brief-dri-it.md`
- **Spec:** `spec-uhsn-data.md`
- **P4:** `review-phone-recorder.md` (+ `phone-sources.md`)

## Summary

The four documents are careful, well sourced and mostly right. Most key facts check out:

- the license quotes;
- the manual's ports, retention and SFTP path;
- Chrome's 0.1 m/s² rounding and its 60 Hz cap;
- the W3C precision rule;
- the WebKit bugs;
- the Utah phone law.

The problems are elsewhere: in how the documents fit together, and in a few places where a
manual or the arithmetic says something different from the text.

1. **P3 and the spec disagree on naming the schools.**
   - P3 recommends that no public page tie a station code to a school (L2).
   - The spec publishes exactly that pairing in `stations.json`.
   - The published miniSEED files carry the station code in every header anyway.
   - So "sharing on, but don't name the school" cannot hold once any school data are
     published.
   - The real decision is sharing on or off, per school.
2. **The quick clock check in P3's connection steps is contradicted by the Raspberry Shake
   manual.** A Shake that once had network time keeps forwarding data after it loses it.
   - Separately, rsudp, P3's suggested receiver for the fallback, by default fetches
     metadata from Raspberry Shake's server, which breaks constraint 1.
   - It also fills lost packets with zeros.
3. **The spec has no workable mechanism for its publication delay with plain files.**
   - It does not say whether "delivery by 12:00 UTC the next day" is before or after that
     delay.
   - It relies on 404 responses that will not carry CORS headers on a default server.
   - Quake-window apps would pull whole day files to every Chromebook.
4. **P3 misses the standard way to move a Shake's data: SeedLink, read by `slarchive` on the
   bridge.**
   - It needs no Shake password.
   - It keeps its own resume state.
   - It is listed in Raspberry Shake's own license table.
5. **P4's core finding holds** (Chrome rounds to 0.1 m/s² at up to 60 readings a second; the
   W3C draft requires every browser to round). Two things in it need correcting or adding:
   - Its statement that a resting phone reads one constant value is wrong for most phones.
   - It overlooks a pilot site outside the phone law (Wasatch Academy is private) and lab
     sensors that Chromebooks can read without rounding.

## 1. `review-shake-viewer.md` (P3)

### MUST

**P3-M1. Not naming the schools (L2) is incompatible with the spec and with publishing any
school data.**

- **Where:** §3.3 (L2 "now", L1 "later"), §7.4. Against it: spec §4.4 ("The schools themselves
  are named on our site") and §5.2 (`"sta": "R1234", "schoolName": "Juab High School"`), and
  P3's own §4.2 public annotation file (`"station": "AM.R____", "school": "juab"`).
- **Problem:** P3 recommends publishing no station-to-school mapping until districts accept
  sharing and naming. The other designs publish the mapping anyway:
  - DRI's public `stations.json` does.
  - The annotation files in this public repository do.
  - Every published miniSEED record header carries `AM.Rxxxx`, and spec §4.1 forbids rewriting
    headers.
  - A Shake's codes cannot be changed on the Shake ("It is currently not possible to edit the
    NetworkCode, StationCode … manually").
  - StationView already places each sharing Shake within "a couple hundred meters" of its true
    position. In a small town that is the school.

  So for a sharing Shake, publishing its delayed data under the school's name hands anyone
  the code for its live DataView page.
- **Evidence:**
  - [Station naming](https://manual.raspberryshake.org/stationNamingConvention.html);
  - [Quick start](https://manual.raspberryshake.org/quickstart.html) ("we obscure the
    location … by a couple hundred meters");
  - spec §4.1, §4.4, §5.2.
- **Change:**
  - Replace L1/L2 with one decision per school, made by DRI and the district before
    anything is published: **is a live public record acceptable?**
    - If yes, sharing stays on, naming is harmless, and L1 applies.
    - If no, turn sharing off at that school. S1 then uses our delayed viewer (L3), and only
      delayed data are published, named.
  - Move this to the top of §7.3 and make spec §4.4 and §5.2 depend on it.

**P3-M2. The "quick check" of the clock (§6.1 step 9) is wrong.**

- **Where:** §6.1 step 9 ("if it shows live in StationView, its clock is synchronized").
- **Problem:** The manual says the time-quality flag "goes from OFF to ON exactly once (and
  remains ON, regardless connect / disconnect actions with NTP servers)". Data are held back
  only "if NTP is OFF at system boot".
  - So a Shake that later loses NTP (a firewall change) keeps forwarding.
  - It also keeps appearing live, while its clock drifts about 2 s a day.
  - A live StationView shows only that time was set once since the last restart.
- **Evidence:** [NTP and GPS timing](https://manual.raspberryshake.org/ntp.html) (the timing
  quality section, and "20 ppm crystal, so ~2 seconds/ day").
- **Change:**
  - Remove the quick check, or reword it: "proves only that the clock was set at the last
    restart".
  - Make the clock check a data check: the viewer's P-arrival comparison with a UU station
    (already in V4), run monthly.
  - DRI also checks `ntpq -p` when on site.
  - Add "clock last checked" to each school's record.

**P3-M3. F1's suggested receiver, rsudp, breaks constraint 1 by default and fills gaps with
zeros.**

- **Where:** §2.2 F1 ("rsudp, whose `write` module saves miniSEED"), §5 (F1 receiver ≤1
  session-day).
- **Problem:**
  - **Constraint 1:** at startup rsudp fetches the station's inventory from Raspberry Shake's
    server (`https://data.raspberryshake.org/fdsnws/station/1/query?...level=resp`, in
    `get_inventory`). It does this unless `inventory_url` is overridden. That is "Raspberry
    Shake's servers in our back end", which constraint 1 forbids.
  - **Gaps:** its writer fills gaps with zeros (`t.data.filled(fill_value=0)` in
    `c_write.py`). So the packets a UDP feed loses, which are F1's known weakness, would
    become flat stretches of real-looking data. The index would count them as coverage, and
    a dead-channel check would misread them.
  - It also hard-codes location `00` in file names (true for Shakes, but brittle).
- **Evidence:**
  - rsudp source, <https://github.com/raspishake/rsudp> (`rsudp/raspberryshake.py`,
    `rsudp/c_write.py`);
  - [rsudp settings](https://raspishake.github.io/rsudp/settings.html).
- **Change:**
  - If F1 is ever built, don't use rsudp's writer.
  - Write a small receiver that keeps gaps as gaps (for example ObsPy with masked traces
    split at gaps), and never fetch Raspberry Shake's inventory.
  - Or run rsudp with `inventory_url` pointed at DRI's own StationXML.
  - Note the same trap in overview §4.4, which names rsudp as a forwarder.

### SHOULD

**P3-S1. The standard feed is missing: the bridge reads the Shake's SeedLink with
`slarchive`.**

- **Where:** §2.2 (F1–F3), §2.7 ("a bridge reading the Shake's archive or SeedLink" is listed
  as allowed, then not developed).
- **Problem:** F2 has the bridge hold the Shake's `myshake` password. That is the same login as
  the web settings page, where "Save and Restart" asks for it. It also has administrator
  rights: the manual has `myshake` run `sudo reboot` and `sudo systemctl`. A stolen or
  compromised bridge can therefore change sharing, location and datacast targets. §7.1 lists
  this risk but understates it.

  SeedLink (TCP 18000, "always running") needs no login. EarthScope's `slarchive` writes an
  SDS archive directly and keeps a state file, so it resumes where it stopped. Raspberry Shake's
  license table lists `slarchive` as a free local-access method, and its Option B explicitly
  supports institutions taking their own Shakes' data over SeedLink.

  With this design:
  - the bridge keeps its own rolling archive (weeks to months on a USB SSD, not the SD card);
  - the bridge pushes that archive out;
  - internet or DRI outages are absorbed by the bridge's disk, not the Shake's 30 days;
  - SFTP is needed only to backfill a bridge-to-Shake outage longer than SeedLink's buffer
    ("some hours"), and DRI can do it by hand.

  The catch: "We reserve the right to remove SeedLink from the Raspberry Shake microSD card
  image at any time." Keep SFTP as the documented backup.

  Details:
  - `slarchive` saves its state only on a clean exit unless given an interval
    (`-x statefile:60`). Use one, or a power cut loses the resume point.
  - Wherever SFTP stays, use an SSH key instead of the stored password. The manual's
    security page recommends keys ("For Linux power users, we recommend using ssh-keys").
    With a key, the bridge never stores the password that opens the settings page.
  - Test it: staff once fell back to `sshpass` when a user's keys didn't work.
  - At setup, check `~/.ssh/authorized_keys` on each Shake. Some 2022 units shipped with a
    leftover test key, which staff said to remove.
- **Evidence:**
  - [License](https://raspberryshake.org/license/): Option B; the legacy table lists
    "slarchive" and "scp"; the SeedLink removal clause.
  - [Firewall page](https://manual.raspberryshake.org/firewallIssues.html): `sudo reboot` run
    as `myshake`.
  - [Visualizing waveforms](https://manual.raspberryshake.org/traces.html): port 18000, a
    "buffer with some hours of data".
  - slarchive: <https://github.com/EarthScope/slarchive>.
- **Change:**
  - Add F2b, "bridge pulls SeedLink with `slarchive`, keeps its own archive, pushes out; SFTP
    backfill".
  - Compare it with F2 on the credentials held, refill and dependence on Raspberry Shake
    keeping SeedLink.
  - Recommend F2b, or justify F2 over it.
  - In the brief, mention that one design needs no Shake password.

**P3-S2. Same-day classroom use and the publication delay are never reconciled.**

- **Where:** Summary ("None of these needs live data, so delayed data (hourly or daily) serve
  every planned activity"), §1.3 ("reads them later the same day (hourly delivery)"), §2.0.4,
  spec §4.2 and §12.5 (delay "none, 1 hour, 1 day or other").
- **Problem:** The experiment cards (S10–S18) and P2 need the class's own record the same day.
  If the districts choose a 1-day delay:
  - every experiment card falls back to the hand-downloaded file;
  - "daily, by 12:00 UTC on D+1" cannot be met in public.

  The review never states the longest delay the activities can tolerate, so the districts
  will decide without knowing what it costs.
- **Change:**
  - State the requirement: for experiment cards, the class's data within about 2 hours, the
    same day.
  - Give the districts the trade-off explicitly.
  - Name the fallback for a long delay:
    - the stopgap file;
    - or, later, embargoed data readable with a teacher code (not student accounts, so
      constraint 2 holds).

**P3-S3. G1 is more settled than the review says, but one unquoted sentence needs answering.**

- **Where:** §2.0.3, §2.7 (G1), §7.3.
- **Problem:** The license supports G1 more strongly than the review says:
  - It describes institutions streaming their own Shakes to their own servers ("Option B:
    SeedLink Protocol … the DIYer is totally supported by these and other policies").
  - It lists `slarchive` and `scp` as free.
  - It scopes its redistribution bans to "data obtained from Raspberry Shake's servers" and to
    data "obtained from https://data.raspberryshake.org/fdsnws/".
  - The sharing grant is "non-exclusive", so the owner keeps its own rights.

  But the review does not quote "Data Centers and commercial enterprises are strictly
  prohibited from integrating real-time or legacy data into their web and mobile app
  platforms". DRI's server could be read as a "data center".

  Separately, serving `AM.Rxxxx` codes from a non-Raspberry-Shake FDSN service (spec design
  (b), or UUSS) would look exactly like the banned "redistribution via your own FDSN Web
  Service". "Nothing goes public before the answer to G1" also has no deadline.
- **Change:**
  - Quote both passages in §2.0.3.
  - In the letter, say that DRI publishes its own instruments' data and is not a data center
    integrating Raspberry Shake's data.
  - Ask explicitly about design (b) with `AM` codes.
  - Set a default (Gus and DRI decide): for example, if there is no reply in 6 weeks, publish
    delayed data from our own Shakes, citing Option B, and stop if Raspberry Shake objects.

**P3-S4. DRI staff time leaves out travel and calendar time; Gus's time isn't counted at
all.**

- **Where:** §5 ("5–10 to set up (incl. five installs)"; "½–1 per further school"), brief Q12.
- **Problem:**
  - Half a day to a day per school assumes the installer is nearby. DRI is based in Reno and
    Las Vegas; the schools are in Juab, Sanpete and Millard counties.
  - Not counted:
    - device procurement and imaging;
    - DRI's security review (brief Q9);
    - district device agreements;
    - return visits for failed SD cards.
  - The elapsed time is not estimated at all:
    - district IT approvals;
    - Raspberry Shake's reply;
    - DRI IT's queue.

    It is probably months, and it, not effort, sets when S cards can run.
  - Gus reviews every session's output and is the real bottleneck; the Claude session-days
    leave him out.
- **Change:**
  - Add an "elapsed time" column and a "Gus review" line.
  - Consider a zero-touch install: DRI mails a pre-imaged bridge, school IT plugs it in, and
    it reports in.
  - Say whether DRI has staff in Utah.

**P3-S5. Firewall and filter lists are incomplete; StationView's extra ports put S1 at risk.**

- **Where:** §6.1 step 7, §6.6 (school IT), §3.3 ("To settle first").
- **Problem:** The manual's firewall page adds four things the review leaves out:
  - Shake OS updates need `registry.gitlab.com`, and possibly `gitlab.com` with SSL inspection
    switched off.
  - The web tools need `*.raspberryshake.org` on 443. DataView is a subdomain.
  - Schools often block internal traffic too ("It is not uncommon in schools for even
    internal communication to be restricted/blocked"). Staff computers must be allowed to
    reach the Shake on port 80 for step 3 and the stopgap.
  - StationView's waveforms and events use ports 8079 and 18082. School filters that allow
    only 80 and 443 will break the live trace on Chromebooks, so S1 may fail even with
    sharing on.
- **Evidence:** [Firewall issues](https://manual.raspberryshake.org/firewallIssues.html).
- **Change:**
  - Add the four items.
  - Add "check StationView's live trace on a school Chromebook" to the S1 prerequisites and
    to trial T5.

**P3-S6. Station codes can differ between the Shake's files and Raspberry Shake's viewers.**

- **Where:** §3.1 ("`R` plus four characters, or `S…`"), §6.6, spec §4.1.
- **Problem:** On a code collision, the manual says the change from R to S "happens at the
  Raspberry Shake server level, and the metadata is affected as well, but data keeps using the
  original code at the station level".
  - The files a bridge copies would say `R…`.
  - DataView and StationView would need `S…`.
- **Evidence:** [Station naming](https://manual.raspberryshake.org/stationNamingConvention.html).
- **Change:** Record both codes per school (the code in the files and the code in Raspberry
  Shake's viewers), in §6.6, the S1 links and `stations.json`.

**P3-S7. Products in the public repo: permanent, undelayed, and on a job GitHub switches
off.**

- **Where:** §2.4 ("by default our scheduled GitHub job runs it on DRI's public files"), spec
  §8 and §11 ("The derived noise levels are 15-minute summaries").
- **Problem:**
  - S3 exists because 15-minute noise levels show class changes, so these summaries are
    occupancy data.
  - Committed to this public repository, they become permanent git history before any
    district decision, and with no publication delay.
  - GitHub automatically disables scheduled workflows in public repositories after 60 days
    without repository activity: a summer break stops the products silently.
- **Evidence:** GitHub Docs, ["Disabling and enabling a
  workflow"](https://docs.github.com/en/actions/managing-workflow-runs-and-deployments/managing-workflow-runs/disabling-and-enabling-a-workflow)
  and the `schedule` event notes.
- **Change:**
  - Apply the publication delay to products.
  - Keep products out of git history (publish them as a Pages artifact or on DRI's server).
  - Default to DRI running the job, or add a keep-alive and a staleness alarm.

**P3-S8. The 30-day refill is assumed, not checked, and Shakes update and reboot on their
own.**

- **Where:** §2.2 F2 ("With retention raised to 30 days, the next successful run refills
  everything missed"), §6.1 step 10, §7.1.
- **Problem:**
  - Shake OS v21.1 (February 2026) ignored the retention setting and kept the 7-day default,
    until v21.2 fixed it. A school's Shake could therefore show "30" and keep 7.
  - Staff also say Shakes update automatically when online, and "the update sequence always
    ends with a system reboot". That is a routine gap the bridge must ride through, and a
    reminder that the OS changes under us.
- **Evidence:** Raspberry Shake community forum, staff reply in
  <https://community.raspberryshake.org/t/5567>; [download page](https://manual.raspberryshake.org/download.html)
  (default 7 days; "You risk filling up the disk space").
- **Change:**
  - Have the bridge compare the oldest day file on the Shake with the setting on every run,
    and alert if the Shake keeps fewer days than expected.
  - Add "check the Shake OS version" to §6.6.

### CONSIDER

- **P3-C1. A cellular uplink for the bridge.**
  - "School IT says no" is the review's top risk.
  - A bridge with an LTE modem needs only power and the Shake's network segment. Data volume
    is about 0.5 to 2 GB a month per school.
  - DRI runs remote environmental monitoring stations and may already have field-telemetry
    contracts.
  - Add it as F2's variant for a district that refuses outbound rules.
- **P3-C2. The "13 of the 18 S cards" count (§1.3) can't be reproduced from the table.** The
  table says S1 is "Enough", S2 "Not the viewer", S3 is "School Pulse's job" and S8 "DataView
  'Compare Data' may do this". List the 13.
- **P3-C3. Evening events cross UTC midnight.**
  - A game at 19:00 MST is 02:00 UTC the next day.
  - "One file covers a school day" is true for class hours only.
  - S7 (and the stopgap) need two day files; say so in §2.1 and the S7 row.
- **P3-C4. Recheck B2 (live inside the school) before dismissing it.**
  - Chromestatus lists "Local network access restrictions for WebSockets" ("WebSockets
    connections to local address will now start triggering permission prompts", milestone
    147).
  - With the Local Network Access permission, an HTTPS page may reach `ws://` on a private
    address; managed-device policy decides.
  - The review's "not WebSockets as of mid-2025" is stale; §0 already marks it unchecked.
    Low priority, since live data are optional. Evidence:
    [chromestatus 5197681148428288](https://chromestatus.com/feature/5197681148428288).
- **P3-C5. Experiment mode should measure band-limited energy, not the single biggest
  reading.**
  - P4's Appendix A1 applies to the Shake too: a 25 Hz drop at 100 readings a second is P4's
    15 Hz case at 60.
  - There the peak averages 0.90 of the true value, falls to 0.71 at worst, and scatters by
    about 9%. That is enough to blur S10's log-log fade line.
- **P3-C6. Tags in §6 mix status and dependency.**
  - "IT approves the bridge" (6.3 step 2) is tagged "[needs DRI's server or a bridge]", but it
    is an approval, not a dependency on the server.
  - Step 9 is "[untested]" inside and "[works today]" overall.
  - Use two tags: status (works today / untested / to build) and depends on (server, bridge,
    new page).
- **P3-C7. Add the manual's "Never just pull the plug" (shut down from the web page) to step 1,
  to the IT notes on power work, and to troubleshooting.** A UPS is in §6.6; this belongs
  beside it.
- **P3-C8. Juab has two Shakes** (activities Appendix G1). Let `stations.json` and the
  annotations hold several stations per school, with one marked primary.
- **P3-C9. Routing every teacher's session log through "DRI or Gus" (§4.2) won't scale past a
  pilot.** Name a fallback, such as the teacher's own export and import file, which already
  exists for class notes.
- **P3-C10. F1's upload is larger than estimated.**
  - The datacast sends 4 packets a second per channel at 100 samples a second.
  - Raspberry Shake's own figures put the text stream at roughly 4.5 to 8 times the miniSEED
    size: about 70 to 120 MB a day per channel, or up to about 45 kbit/s for an RS4D.
  - "Well under 50 kbit/s per school" (§2.2) is therefore true only for one- and
    three-channel models.
  - Evidence: [UDP datacast](https://manual.raspberryshake.org/udp.html) and the FAQ's
    bandwidth formula.

## 2. `brief-dri-it.md`

### MUST

None. The brief is clear, short and asks mostly the right questions. Its weaknesses are
omissions.

### SHOULD

**B-S1. Say that a sharing Shake is already public and live.**

- **Where:** "Security and privacy" ("Published data can be held back by a set delay").
- **Problem:** DRI IT will assume that the delay protects occupancy. For a Shake that shares
  with Raspberry Shake, the same record is already live worldwide.
- **Change:** Add one sentence: "If a Shake shares its data with Raspberry Shake, its live
  record is already public in Raspberry Shake's viewers; our delay applies only to our
  server." Point to P3-M1.

**B-S2. Answer the questions IT asks first.**

- **Problem:** The brief does not say:
  - who sponsors and pays (hardware, hosting);
  - when it is needed;
  - whether more schools follow Phase I;
  - how the data are classified: public, not sensitive, not safety-critical. IT triages on
    this.
- **Change:** Add a four-line "At a glance" box at the top.

**B-S3. Ask what DRI already runs.**

- **Problem:** DRI operates field monitoring networks. It may already have:
  - managed field devices;
  - cellular telemetry;
  - a public data portal;
  - a data-publication policy.

  Q1 asks only about a file server.
- **Change:** Add a question: "Does DRI already run remote sensor stations or a data portal
  whose devices, telemetry or hosting we should reuse?" Also mention the cellular option
  (P3-C1).

**B-S4. Say exactly what the bridge's credential can do, and that one design avoids it.**

- **Where:** "The bridge holds the Shake's login".
- **Problem:** That login opens the Shake's settings page and has `sudo`. An IT security
  reviewer needs to know this.
- **Change:**
  - State it.
  - Mention the SeedLink design (P3-S1), which needs no Shake login.
  - Where SFTP is used, use an SSH key, which the manual recommends.

**B-S5. Add the data license and citation.**

- **Problem:** Constraint 5 requires every page to cite its source network. The brief and
  spec never say:
  - under what license DRI publishes the data (for example CC BY 4.0);
  - what credit line or DOI to show.

  Gray area G5 asks Raspberry Shake about credit, but the main credit is DRI's.
- **Change:** Add a question: "Under what license and credit line will DRI publish UHSN data?
  Will DRI register a DOI?"

**B-S6. The upload figure contradicts the re-send option.**

- **Problem:** "A few MB an hour at most" is true only if hourly updates send only the new
  data. Re-sending today's file each hour reaches 15 MB per channel per hour late in the day.
- **Change:** Say "with appending uploads (rsync)" or give both numbers.

### CONSIDER

- **Explain the TLS-inspection exemption.**
  - The bridge checks DRI's certificate, and a district's inspection proxy would break that.
  - Otherwise district IT will read it as a request to bypass security.
- **Add one small diagram:** Shake → bridge → (outbound HTTPS) → DRI server → browsers.
- **Mark the four questions DRI IT should answer first:** Q1, Q2, Q3, Q12.
- **Mention that the website now sits on a personal GitHub account and is planned to move to
  DRI** (CLAUDE.md, next step 8). This affects the CORS origin (spec SP-S2) and who "us" is.

## 3. `spec-uhsn-data.md`

### MUST

**SP-M1. The publication delay has no mechanism in design (a), and the delivery deadline
conflicts with it.**

- **Where:** §4.2 (Daily "by 12:00 UTC on D+1"; Publication delay), §5.1 (`publicUntil`),
  §4.1 ("Don't convert, re-pack or rewrite headers").
- **Problem:**
  - In a static file tree, "nothing after `publicUntil` is published" means today's growing
    file must be cut before it is served. The spec says nothing about who cuts it or how.
  - With a delay of a day, day D cannot be public by 12:00 UTC on D+1.
- **Change:**
  - Define "delivered" (arrived at DRI) separately from "published".
  - Specify the cut: the public copy of a day file is the run of whole records that end
    before `publicUntil`. Fixed 512-byte records can be cut without rewriting any header, so
    §4.1 still holds.
  - Apply the same line to products and to the index's `lastSample`.

**SP-M2. School names in `stations.json` conflict with P3's recommendation.** See P3-M1. DRI
must not build §5.2 as written until the sharing and naming decision is made, per school.

**SP-M3. "A 404 means no data" fails unless error responses carry CORS headers.**

- **Where:** §4.3 ("CORS headers on every data response"), §10 ("a 404 means no data").
- **Problem:**
  - A cross-origin 404 without `Access-Control-Allow-Origin` reaches the page as a network
    error.
  - nginx's `add_header` applies only to success and redirect codes unless `always` is given.
  - So on a common default setup, the reader cannot tell "no data" from "blocked by the
    school's filter".
- **Evidence:** nginx docs,
  [`add_header`](https://nginx.org/en/docs/http/ngx_http_headers_module.html#add_header):
  added "if the response code equals 200, 201, 204, 206, 301, 302, 303, 304, 307, or 308" …
  "If the always parameter is specified, the header field will be added regardless of the
  response code".
- **Change:**
  - Require CORS headers on every response, 4xx included.
  - Add this to the checker.
  - Have the reader consult the index before requesting a file.

### SHOULD

**SP-S1. Require range requests, and size the quake-window case.**

- **Where:** §4.3 ("Optional: HTTP range requests"), §9 ("a class of 30 opening one day of one
  channel"), §10 (reader "trims to the window").
- **Problem:** Quake Locator with the schools (S2) and S9 need a few minutes around a quake.
  In design (a), each device downloads whole day files:
  - five schools × up to three channels × up to 15 MB is about 225 MB per device;
  - about 7 GB per class of 30.

  Our reader (`docs/app/js/data/mseed.js`) also decodes every record before trimming:
  - a day at 100 samples a second is 8.64 million samples, about 35 MB as Float32;
  - fifteen channel-days is about 0.5 GB in a Chromebook tab.

  Static servers support byte ranges by default. The records are a fixed 512 bytes, so a
  reader can find a time by binary search, or the index can carry a small seek table (byte
  offset every 10 minutes).
- **Change:**
  - Make ranges required (with `Access-Control-Expose-Headers: Content-Range`).
  - Add the seek table, or plan design (b) before S2.
  - Note in §10 that the reader filters records by header time before decoding.

**SP-S2. CORS origin: use `*`.**

- **Where:** §4.3, §12.6.
- **Problem:** A single allowed origin (`https://gus-p-williams.github.io`) breaks:
  - local development (`node tools/serve.mjs`) and the headless checks;
  - the planned move of the site to a DRI server (CLAUDE.md next step 8).

  A specific origin also needs `Vary: Origin` behind any cache. The data are public and are
  read without cookies or logins.
- **Change:** Recommend `*` outright; drop the choice or explain its cost.

**SP-S3. Station codes.**

- **Where:** §4.1, §12.13.
- **Problems:**
  - The files carry the Shake-level code, which can differ from Raspberry Shake's viewer code
    (P3-S6).
  - Choice 13 ("use a DRI network code") would mean rewriting headers, which §4.1 forbids.
    The Shake cannot change its codes.
  - Design (b) serving `AM` codes from DRI needs Raspberry Shake's explicit agreement
    (P3-S3).
- **Change:**
  - Add `rsSta` (the viewer code) beside `sta`.
  - Remove choice 13, or state that it requires rewriting headers.
  - Add the `AM` question to the letter.

**SP-S4. Verify the folder layout and record size on a real file before freezing them.**

- **Where:** §2 (SDS), §4.1 (512-byte records), §5 (path pattern).
- **Problem:** What the manual says:
  - the layout is "YEAR/NETWORK/STATION/CHANNEL/<DAILY MINISEED FILES>";
  - the license calls it the Shake's "SDS archive".

  The `.D` folder suffix, the file-name pattern and the 512-byte record length are assumed
  from the SDS convention, not stated.
  - Raspberry Shake support staff have said the Shakes record "STEIM2 miniSEED"
    (community forum t/1349).
  - The record length is only inferred: SeisComP's SeedLink, which writes the archive, uses
    512-byte records.
- **Change:**
  - Mark them "to confirm on DRI's first real day file" (the review's checklist already asks
    for one).
  - If the Shake differs, the bridge renames into the spec's layout without touching the
    contents.

**SP-S5. Products: delay, permanence and the 60-day switch-off.** See P3-S7. In §8 and §11,
treat 15-minute noise levels as occupancy data, not as a privacy safeguard.

**SP-S6. Define the index precisely enough to build two implementations that agree.**

- **Where:** §5.1, §5.3.
- **Missing:**
  - a JSON Schema with required and optional fields;
  - the order of writes (data file renamed into place before the index changes);
  - how `coverage` is computed for a partial day (against the whole day, or up to
    `lastSample`);
  - the gap threshold relative to the sample interval;
  - the year rollover of the per-station file;
  - who sets `partial` and `withdrawn`, and when.
- **Reuse:** EarthScope's `mseedindex` or `msi` (time spans and gaps per file; both
  Apache-2.0; `msi` now has its own repository, <https://github.com/EarthScope/msi>) rather
  than a new parser. Our own `parseMiniseed` is fine in Node.
- **Also consider:** a `clockChecked` field per station, since the miniSEED timing flag
  stays at 90 even when NTP is lost (P3-M2).

**SP-S7. Data license and credit line** (B-S5).

### CONSIDER

- **Late refills versus caching.**
  - A refill after an outage replaces files older than 2 days, which are cached for a day
    (`max-age=86400`).
  - Use `no-cache` with `ETag` for files younger than the Shake's retention (30 days).
- **Instrument response: align §4.4 with P3's G4, and name the source.**
  - §4.4 has DRI build StationXML "from Raspberry Shake's published response" now.
  - P3's G4 says to use counts until Raspberry Shake confirms.
  - The manual publishes nominal templates per model and version (SeisComP XML, RESP,
    dataless SEED; "replace all instances of 'STNNM'"):
    <https://manual.raspberryshake.org/metadata.html>.
  - Its automatic per-station metadata comes from Raspberry Shake's FDSN station service.
    That is their server, so constraint 1 rules it out.
  - Say "from the manual's templates". A template is documentation, not data, so asking in
    passing and proceeding is reasonable.
- **Several Shakes per school, and the roaming Shake.**
  - Allow several stations per school, with one marked primary (Juab).
  - Say whether the roaming Shake's field recordings (R cards) are in scope; they need a
    manual upload path.
- **Small mismatches with the apps' types:** `sensitivity: null` against the apps'
  `undefined`; the optional `sensor` field is missing. Note them so the reader maps them.

## 4. `review-phone-recorder.md` (P4)

Checked against source and confirmed:

- Chromium's `kAccelerometerRoundingMultiple = 0.1`, applied in the device service before
  the shared buffer. `devicemotion` reads the same buffer, so there is no unrounded path.
- The constant has been present since the Chrome 83 tag.
- `kMaxAllowedFrequency = 60.0`; the 60 Hz pump; `interval` fixed at 16.
- No prompt by default.
- WebKit's `kMotionUpdateInterval = 1/60` with no rounding; `interval` reported in seconds.
- The W3C Candidate Recommendation Draft of 18 November 2026: "limit its precision to no more
  than 0.1 m/s2", plus a "must" in its privacy section.
- WebKit bugs 329553, 329554 and 329556 (filed 2026-10-30, NEW).
- Firefox's 60 Hz sensor delay and its `interval` of 100.
- The law: SB 69's definitions, and that there is no exception for school-owned devices.
  R277-495-4(2)(g) and 5(2)(b).

### MUST

None. The recommendation (bench page now, classroom tool only after the gates) follows from
the evidence.

### SHOULD

**P4-S1. Most phones at rest do not show one constant value.**

- **Where:** §2.2 bullet 2 ("a phone at rest reads the same rounded value over and over …
  shaking smaller than about 0.05 m/s² vanishes completely"), Appendix A2 ("a phone at rest
  shows one constant value").
- **Problem:** By the review's own assumptions, the resting value sits evenly between 0 and
  0.05 m/s² from a rounding boundary. Sensor noise then pushes many axes across a boundary:

  | Sensor noise σ (m/s²) | One axis within 2σ of a boundary | At least one of three axes |
  | --- | --- | --- |
  | 0.006 | 24% | 56% |
  | 0.01 | 40% | 78% |
  | 0.02 | 80% | 99% |

  Most resting phones therefore flicker by one step on at least one axis. On that axis,
  shaking well below 0.05 m/s² changes the reading. The tilt idea in A2 is the normal state of
  most phones, not a trick.

  Consequences:
  - The bench report's "noise" on Chrome mostly measures how close the phone lies to a
    boundary, not the sensor.
  - P2's detection distance depends on how each phone lies.
  - Strength stays as poor as the review says: its ±0.05 m/s² reading error and the 0.2 m/s²
    rule for P3 stand.
- **Evidence:** the table above (helper agent's arithmetic from A2's assumptions; easy to
  rerun).
- **Change:**
  - Correct §2.2 and A2.
  - Have the bench report give, per axis, the fraction of readings off the resting value.
  - In P2, make "how the phone lies" part of the lesson, with an orientation check before
    each take.

**P4-S2. A pilot site outside the phone law is overlooked: Wasatch Academy.**

- **Where:** §4 ("Every motion-sensor card needs a district policy"), §5.5 gate 3, §6.4.
- **Problem:**
  - Utah Code 53G-7-227 places its duties on LEAs: districts, charter schools and the Schools
    for the Deaf and the Blind.
  - R277-495 is a State Board rule for public schools.
  - Wasatch Academy is private; activities Appendix C notes that it "sets its own policy".
  - It is probably the quickest place to run T1b, T2 and T3 with students. Confirm with the
    school.
- **Evidence:**
  - [Utah Code 53G-7-227](https://le.utah.gov/xcode/Title53G/Chapter7/C53G-7-S227_2026050620260701.html)
    (3)(a)(ii)(A) gives the power to "an LEA";
  - [R277-495](https://schools.utah.gov/adminrules/R277-495.php).
- **Change:** Add Wasatch Academy as the first classroom trial site, subject to its own policy.

**P4-S3. Lab sensors on Chromebooks are missing from the options.**

- **Where:** §6.1 compares only with phone apps (phyphox and others).
- **Problem:** Many high-school physics labs already own wireless sensors whose web apps run
  in Chrome on Chromebooks (Vernier Go Direct, PASCO). A micro:bit's accelerometer can also
  be read by our own page over Web Serial, WebUSB or Web Bluetooth.
  - These are not cellphones, so the law does not apply.
  - The browser's sensor rounding does not apply to their data.
  - They need no install on a Chromebook.

  They would serve P1's coupling comparison, P4, P5 and research project D better than phones
  can.
- **Change:**
  - Add a row to §6.1.
  - Add a question for Dale and Cleat and the schools: which lab sensors does each school own?
  - Note that our page could read a micro:bit with little code. This is still a browser page
    (constraint 3), but it needs the device flashed once.

**P4-S4. Update the legal citations (the reading itself holds).**

- **Where:** §4.
- **Problem:** The statute text checked out, but four details are out of date:
  - The current code adds "AI glasses" (from HB 42, through a coordination clause) and
    reletters the definitions: "cellphone" is now (1)(b).
  - Only an LEA may set "other circumstances"; a school or teacher cannot.
  - "Handheld" describes the device's design, so a phone taped to a table is still a
    cellphone.
  - No fall-2026 amendment to R277-487 was found (§4 says "being amended in fall 2026"). Its
    current text is effective July 8, 2025.
  - R277-495's official title is "Electronic Devices in Public Schools". It has not been
    revised since SB 69.
- **Evidence:**
  - [53G-7-227 (effective 7/1/2026)](https://le.utah.gov/xcode/Title53G/Chapter7/C53G-7-S227_2026050620260701.html);
  - [SB 69 enrolled](https://le.utah.gov/Session/2026/bills/enrolled/SB0069.pdf);
  - [R277-495](https://schools.utah.gov/adminrules/R277-495.php);
  - [USBE rules in process](https://schools.utah.gov/adminrules/administrativerules/rulesinprocess.php).
- **Change:** Update the wording and citations. Re-read the statute rather than relying on
  the questions document (the review says it did not).

**P4-S5. "An Apple engineer" is not shown by the cited source.**

- **Where:** §2.2, §2.3.
- **Problem:** Bugzilla shows the reporter as Marcos Caceres and the keyword `InRadar` (bug
  329553 is mirrored to rdar://191387015). It does not show his employer.
- **Change:** Write "filed on 2026-10-30 and tracked in Apple's internal bug system (InRadar)".
  That is the stronger and checkable point.

**P4-S6. The P2 trial depends on P3's day-file viewer; neither document says so.**

- **Problem:**
  - P2's Shake side, and T3's "a Shake recording the same time", need that day's Shake record
    in a page.
  - That page is P3's stopgap viewer (V1). P4 counts a file loader (2–3 days) that is
    "shared with" it; P3 counts V1 separately.
- **Change:** Make one plan with one owner and one estimate for the shared reader, and order
  T3 after V1.

### CONSIDER

- **Testing iPhones without deploying `main`.**
  - An HTTPS tunnel to the laptop, or a LAN server with a locally trusted certificate (mkcert
    root installed on a test iPhone), lets branches be tried on iPhones.
  - That removes "iPhones need the deployed site" from the risk list.
- **ChromeOS system audio effects.**
  - Some Chromebooks apply system-level noise cancellation to the built-in microphone.
  - Add "check whether `noiseSuppression: false` really turns it off" to T1's microphone
    checks. This is unverified, so treat it as a test item.
- **Small facts to add:**
  - Chrome also rounds `rotationRate` (to 0.1 deg/s).
  - On an iPhone without a gyroscope, WebKit reports `acceleration` as 0, 0, 0. That is
    another reason for `accelerationIncludingGravity`, which the review already recommends.
  - The rate can be below 60: Chrome takes `min(60, the sensor's maximum)`.
- **Status: §5.1's first decision has been made.** The bench page is being built (session
  D10-phone-bench, "In development: please test"); update §5.1 and §6.4.
- **"Requires all browsers".** The W3C document is a Candidate Recommendation Draft. Its text
  is normative, but browsers follow it by choice. "The draft standard now requires …" is more
  exact.

## 5. Shared issues

1. **One privacy decision, scattered across four documents.**
   - What may be public, how fresh, and under which name is decided piecemeal:
     - Raspberry Shake sharing (P3 §2.0.4);
     - naming (P3 §3);
     - the publication delay (spec §4.2);
     - 15-minute products in a public repo (spec §8);
     - public annotation files with class experiment times (P3 §4.2).
   - Make it one decision per school, taken by DRI with each district before anything is
     published. Give the activity cost of each answer (P3-S2).
   - Record it in `decisions.md`.
2. **The effort scales differ.**
   - P3: S under 1 session-day, M 1–3, L more than 3.
   - P4: S up to 1 day, M 2–4, L 5 or more.

   Use one scale.
3. **Both calibrate on "Quake Locator built in a day", which leaves out rework.**
   - After 23 November came:
     - Gus's review additions (D14–D16);
     - the navigation rework (D17, D21);
     - the generated figures;
     - the rename (D30);
     - the spelling pass (D32).

     Its total is several session-days.
   - Both reviews should give a ratio of first build to finished, from this repository's
     history, and add Gus's review time.
4. **Gates with no dates.**
   - Raspberry Shake's reply (G1, G2), UUSS, the districts and Dale and Cleat are all gates
     with no deadline and no default.
   - Give each a date and a default (P3-S3), or the S and P tracks can stall indefinitely.
5. **Peak versus energy.** P4's Appendix A1 applies to the Shake experiments as well
   (P3-C5). Use one strength measure across the S and P cards, so S10 and P2 compare like
   with like.
6. **One shared file reader.** The Shake day-file loader (P3 V1, U1) and the phone CSV
   loader (P4 option 6) should be one module with one owner. Both feed the `Trace` format.
7. **Data credit for UHSN's own data** is undefined in all four documents (B-S5); constraint
   5 needs it on every page that shows school data.

## 6. Verdicts

- **P3, the school Shake viewer:**
  - **Sound, with two corrections before it guides anyone.**
    - The naming recommendation (L2) cannot coexist with the spec or with publishing data at
      all: fix it as one sharing decision per school.
    - The quick clock check is wrong.
    - The fallback's rsudp receiver needs its Raspberry Shake metadata fetch and its zero
      filling removed.
  - The viewer case (annotations, experiment mode, comparison) is well argued, and the file
    reader first is the right start.
  - Add the SeedLink design (F2b) before DRI commits to the bridge, because it removes the
    most serious security weakness of F2.
- **The brief for DRI IT:**
  - **Ready to send after small additions:**
    - that sharing Shakes are already public;
    - sponsor and timeline;
    - what DRI already runs;
    - the bridge credential's real power;
    - a data license.
- **The data spec:**
  - **Not yet precise enough to build against.** It needs:
    - a defined publication-delay mechanism and a delivered/published distinction;
    - CORS on error responses;
    - range requests (or design (b)) for quake windows;
    - `*` as the origin;
    - a schema for the index;
    - confirmation of the layout on a real file.
  - Its structure (versioned path, SDS tree, small JSON indexes, (a) now and (b) later on the
    same files) is good and should stay.
- **P4, the Phone Recorder:**
  - **The strongest of the four.**
    - Its browser facts check out against source.
    - Its recommendation follows from them: bench page now, classroom tool after gates,
      P6 on Chromebooks.
  - Fix the "constant at rest" claim and update the legal citations.
  - Add two options it overlooks: Wasatch Academy as a pilot site, and lab sensors on
    Chromebooks.
