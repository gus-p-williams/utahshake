# Sources for the school Shake viewer review

The source log for `planning/review-shake-viewer.md`, `planning/brief-dri-it.md` and
`planning/spec-uhsn-data.md` (session P3-viewer-review), kept as the project asks
(constraint 5, D28): citation, link, access date and what each source supports. All
accessed 2026-11-25 unless noted. Quotes are short and verbatim. "Search result only" marks
a source seen in a search summary but not opened in full: check it before relying on it.

## Third round (2026-11-25, after critiques R1 and R2)

**Our own checks:**

- **slarchive's manual,** <https://raw.githubusercontent.com/EarthScope/slarchive/main/doc/slarchive.md>
  (README: Apache License 2.0). Supports:
  - `-SDS` writes "<SDSdir>/<YEAR>/<NET>/<STA>/<CHAN.TYPE>/NET.STA.LOC.CHAN.TYPE.YEAR.DAY",
    the spec's layout;
  - `-x statefile[:interval]`: the state is saved on shutdown, or "every interval packets
    that are received" if an interval is given ("Otherwise the state will be saved only on
    normal program termination");
  - resuming works "assuming the data are still available on the server".
- **Record length and encoding of the four UU day files** (read from each record's
  blockette 1000 with a scratch script): all 512-byte records, encoding 11 (Steim2), 100
  samples a second.

  | Channel | Bytes per sample | Samples per record (mean) |
  | ------- | ---------------- | ------------------------- |
  | ELU EHZ | 0.74 | 688 |
  | TMU ENZ | 0.72 | 715 |
  | TMU HHZ | 1.07 | 479 |
  | SUU EHZ | 1.21 | 425 |

- **The Steim2 floor (our arithmetic, from the Steim2 encoding).**
  - A 512-byte record with data from byte 64 holds 7 frames of 64 bytes, each with 15 data
    words (13 in the first frame, which also carries the first and last sample).
  - That makes 103 words, each holding at most 7 four-bit differences: at most 721 samples.
  - So a 100-sample-per-second day needs at least 11,983 records, about 6.1 MB.
  - ELU's 688 samples per record sits near that ceiling.
  - Therefore the manual's "about 15 Mb" can't mean 15 megabits (1.9 MB).
- **Not done:** a single download of one day of one public Shake from Raspberry Shake's
  FDSN data service, as a size check. It was refused by this session's permission system,
  and I did not work around it. The license would allow such a discrete request; whether
  to make one is in the review's questions for Gus.

**Facts taken from the critiques and not re-checked by this session** (each critic cites
the source):

- **Shake behavior:**
  - The Shake's time-quality flag "goes from OFF to ON exactly once (and remains ON …)";
    data are held back only "if NTP is OFF at system boot" (R1;
    <https://manual.raspberryshake.org/ntp.html>).
  - `myshake` runs `sudo reboot` and `sudo systemctl` in the manual (R1;
    <https://manual.raspberryshake.org/firewallIssues.html>).
  - Shake OS v21.1 ignored the retention setting until v21.2; Shakes update automatically
    and "the update sequence always ends with a system reboot" (R1; Raspberry Shake forum,
    <https://community.raspberryshake.org/t/5567>).
  - Some 2022 units shipped with a leftover SSH test key (R1; Raspberry Shake forum).
  - Raspberry Shake staff say Shakes record "STEIM2 miniSEED" (R1; forum t/1349).
- **Raspberry Shake's license** (R1; <https://raspberryshake.org/license/>):
  - "Option B: SeedLink Protocol … the DIYer is totally supported by these and other
    policies";
  - the legacy table lists `slarchive` and `scp`;
  - "We reserve the right to remove SeedLink from the Raspberry Shake microSD card image at
    any time."
- **The manual's firewall page** adds `registry.gitlab.com` and `gitlab.com` (no SSL
  inspection) for updates, `*.raspberryshake.org` on 443, and that schools often block
  internal traffic (R1).
- **The manual's per-model metadata templates** ("replace all instances of 'STNNM'") (R1;
  <https://manual.raspberryshake.org/metadata.html>).
- **rsudp:**
  - fetches the inventory from `https://data.raspberryshake.org/fdsnws/station/1/query`
    unless `inventory_url` is overridden (`rsudp/raspberryshake.py`);
  - its writer fills gaps with zeros (`t.data.filled(fill_value=0)` in `c_write.py`)
  (R1; <https://github.com/raspishake/rsudp>).
- **The datacast's size:** 4 packets a second per channel at 100 samples a second, and a
  text stream about 4.5 to 8 times the miniSEED size (R1; manual udp page and FAQ).
- **The web platform:**
  - nginx `add_header` applies only to 200, 201, 204, 206, 301, 302, 303, 304, 307 and 308
    unless `always` is given (R1;
    <https://nginx.org/en/docs/http/ngx_http_headers_module.html#add_header>);
  - GitHub disables scheduled workflows in public repositories after 60 days without
    activity (R1; GitHub Docs, "Disabling and enabling a workflow");
  - Chromestatus lists "Local network access restrictions for WebSockets" at milestone 147
    (R1; <https://chromestatus.com/feature/5197681148428288>).
- **R2's references:**
  - FDSN StationXML's current schema version is 1.2
    (<https://docs.fdsn.org/projects/stationxml/en/latest/reference.html>);
  - Utah R277-487 sets LEA privacy and security governance
    (<https://schools.utah.gov/adminrules/R277-487>).

**Effort calibration:** the rework allowance (×2 for student-facing work, ×1.5 for scripts)
is a rough reading of CLAUDE.md's status entries for 2026-11-23 to 2026-11-25 (Quake Locator
built in a day; then D14–D16, D17 and D21, the figures, D30 and D32).

## Our own checks, second round (2026-11-25)

**Raspberry Shake's viewer addresses.**

- **Method:** each address was loaded in headless Chrome (puppeteer-core from
  `tools/figures/node_modules`, system Chrome, a scratch profile), with a 12 to 30 second
  wait; then the final address, the page text and a screenshot were read. Test station:
  AM.R28DF, a public shared Shake in Germany (from the community post below), used only to
  test the address format. The Claude-in-Chrome extension was not connected, so this was
  headless only.
- **`https://dataview.raspberryshake.org/#/AM/R28DF/00/EHZ`:** the address was kept; the
  page showed "Shake: R28DF - Channel: EHZ", "100 sps", "Real Time", on a 24-hour
  helicorder in 30-minute rows, with the station picked in the station list.
- **`https://stationview.raspberryshake.org/#/?net=AM&sta=R28DF`:** the address became
  `…#/?net=AM&sta=R28DF&lat=50.51351&lon=7.28281&zoom=7.000`, and the station panel
  opened: "R28DF", "Raspberry Shake 3D", "Germany", a live trace and spectrogram, ground
  motion, and links under "More data" (Live Streaming, Last 24-hour Plot, "Last 24hr of
  data (MSeed format)", "Build your own data request", Instrument Response).
- **`https://stationview.raspberryshake.org/#/?lat=0&lon=0&zoom=3&sta=R28DF`:** kept as
  given; `sta` without `net` did not re-center the map.
- **`https://stationview.raspberryshake.org/` with no station:** opened at
  `#/?lat=0.00000&lon=145.00000&zoom=1.529` ("SHAKES ONLINE: 2961").
- **Map-only addresses over central Utah and Salt Lake City**
  (`#/?lat=39.4&lon=-111.9&zoom=7`, `#/?lat=40.7&lon=-111.9&zoom=9`): the map moved, but
  no station or quake markers loaded ("SHAKES ONLINE: 0", "EVENTS: 0") even after 30
  seconds, over Salt Lake City too. Inconclusive. It says nothing about whether the UHSN
  Shakes share; retest in a normal browser.
- **Address format sources:**
  - DataView, a Raspberry Shake community post: the "EH[Z,N,E]" form is invalid, and
    "https://dataview.raspberryshake.org/#/AM/R28DF/00/EHZ" is the working one,
    <https://community.raspberryshake.org/t/new-controlcenter-page-home-section-online-apps/5363>
    (search result only; the format itself is verified by the test above);
  - an older StationView form, `https://raspberryshake.net/stationview/#?net=AM&sta=R3308`
    (search result only; not tested).

**Day-file sizes.** FDSN dataselect at EarthScope, one full UTC day (2026-11-24T00:00 to
2026-11-25T00:00), network UU, location 01:

| Channel | Size |
| ------- | ---- |
| TMU HHZ | 9,243,648 bytes |
| SUU EHZ | 10,420,224 bytes |
| ELU EHZ | 6,431,232 bytes |
| TMU ENZ | 6,187,008 bytes |

All are 100-sample-per-second channels. The Raspberry Shake manual's "generally about 15
Mb" per daily file (download.html, below) is the planning figure; its unit is ambiguous,
and the Shake's 512-byte records add header overhead. The spec's sizes (≤ 15 MB per
channel-day; 75–300 MB a day and 27–110 GB a year for five schools; about 1.4 kbit/s
average per channel) are arithmetic from these.

**Code facts used in the spec** (read 2026-11-25):

- `docs/app/js/ui/page.js:69` shows `source.live ? 'Live data' : 'Offline sample'`, so
  delayed school data need a third label;
- `docs/app/js/config.js` lines 3–5 say swapping in school stations "is a change to
  SCHOOLS[].standIn only". That is true for station choice, but school Shakes beside UU
  helper stations need requests routed by network;
- computer picks (`aicPick`) are used by Quake Explorer and `clear-s.js`, not by Quake
  Locator.

**Bridge and feed details** are taken from the manual pages below:

- SFTP of `/opt/data/archive` as `myshake` (download.html);
- the SDS-style folders (download.html);
- datacast "not intended for production" (udp.html);
- rsudp's "one Shake per port" and its `write` module (rsudp settings page);
- the SeedLink buffer of "some hours" (udp.html).

The ideas of a temporary name then rename, and of rsync appending, are standard practice,
not from a source.

## Raspberry Shake: terms

- **Raspberry Shake, S.A., License Agreement (with the Data Sharing License).**
  <https://raspberryshake.org/license/> (page metadata: modified 2026-02-21; first
  published 2018-11-29; `shop.raspberryshake.org/license/` redirects here). There is no
  separate "terms of service": this page holds Raspberry Shake's terms (a search for one
  found none). Supports:
  - **Own Shakes, read directly:** "Shakers enjoy unlimited access to real-time streaming
    via a direct connection to their Shake(s)." Listed for local SeedLink, the OSOP Wave
    Server and the Shake UDP broadcast (rsudp); "UDP streaming must be configured by the
    end-user at http://rs.local/". Also "As a hobbyist or teacher, we make it free for you
    to access, view and download data from your Raspberry Shake".
  - **Their servers:** "Integration into a back end application such as a mobile app is
    not allowed." "It is strictly prohibited to redistribute real-time data obtained from
    Raspberry Shake's servers. This also applies to paying customers." "Visual data
    redistribution permitted; Digital data redistribution not allowed." (a footnote to
    the server-data table).
  - **Several Shakes on one page:** "Please refrain from showing a 'network'-style page
    with data from other Raspberry Shakes in your area."
  - **Commercial use:** integrating real-time data "from Raspberry Shake's instrument-
    and/or server-side services" into commercial platforms is prohibited (paraphrase
    around the quoted words).
  - **Closed software:** "With the exception of rsudp, all Raspberry Shake hardware and
    software products are closed source." "Reverse engineering of any Raspberry Shake
    software, hardware or their components is strictly prohibited." Third-party software
    on the Shake is listed, including "SeedLink 2.6". "We reserve the right to make any
    changes to the Raspberry Shake Operating System".
  - **Data sharing:** once the owner enables "the Data Sharing option", "it immediately
    becomes freely available". The owner grants "a perpetual, irrevocable, non-exclusive,
    worldwide, royalty-free license, with the right to sub-license", and waives "any rights
    of publicity and privacy with respect to the shared data". The page says nothing about
    turning sharing off later.
  - **Credit for their cloud services:** "Data powered by Raspberry Shake, S.A., a
    citizen-science project." with DOI 10.7914/SN/AM; papers use "DOI: 10.7914/SN/AM".
  - **Schools:** discrete legacy requests are "Free for hobbyists, school teachers,
    researchers and geophysical institutes" (the size limit is footnoted "To be
    determined").

## Raspberry Shake manual (manual.raspberryshake.org)

- **UDP datacast,** <https://manual.raspberryshake.org/udp.html>. Supports:
  - set up in the web page "Settings icon >> DATACAST" since version 0.15; the config file
    is `/opt/settings/user/UDP-data-streams.conf`;
  - "by default … Port 8888" on the Shake itself;
  - "Each data packet contains data for a single channel only", e.g.
    `{'SHZ', 1507760140.530, 614, 916, ...}`;
  - "there is no limit to the number of UDP ports that can be configured";
  - "UDP functionality is not intended for production purposes but for hobbyist
    applications";
  - a local SeedLink server supports "both Swarm and the local helicorder plots"; "The
    server has a buffer with some hours of data."

  How often packets are sent: not stated.
- **Visualizing waveforms,** <https://manual.raspberryshake.org/traces.html>. Supports:
  - SeedLink on port 18000 ("rs.local:18000#AM_R5DCF:00SHZ#300");
  - "The helicorder plot is deprecated but still reachable at: rs.local/heli", "12 hours
    of data", "configured to update every 2 minutes";
  - rsudp and the desktop programs run "on your desktop/laptop computer/raspberry pi and
    not on the Raspberry Shake itself".
- **Firewall ports,** <https://manual.raspberryshake.org/firewallIssues.html>. Supports the
  port list:
  - 80 for the web page; 123 for NTP;
  - 55555 to raspberryshakedata.com ("4 packets/sec over persistent socket");
  - 55556 (metadata at startup); 53 for DNS; 22 and 443 for updates;
  - raspberryshake.org on 443; stationview.raspberryshake.org on 8079 and 18082;
  - 16032 for Swarm;
  - checking time with `ntpq -p`.
- **Why data sharing needs no inbound port,** <https://manual.raspberryshake.org/hacked.html>:
  communications with the data server "are instigated by the Raspberry Shake unit itself".
  Also how to change the password from the web page.
- **Downloading data,** <https://manual.raspberryshake.org/download.html>. Supports:
  - "Open rs.local/ >> Actions icon >> DOWNLOADS >> DATA";
  - "Each daily miniSEED file is generally about 15 Mb";
  - the archive at `/opt/data/archive` ("YEAR/NETWORK/STATION/CHANNEL/…");
  - "By default 7 days of continuous data are saved", changed under "Settings icon >>
    DATA >> Waveform Data Saving", with the warning "You risk filling up the disk space";
  - SFTP as `myshake`.

  Whether today's unfinished file can be downloaded: not stated.
- **Static IP,** <https://manual.raspberryshake.org/staticip.html>: from the web page, or
  by editing `/etc/dhcpcd.conf` over SSH. Our advice to prefer a DHCP reservation by IT is
  our own, not the manual's.
- **Station naming,** <https://manual.raspberryshake.org/stationNamingConvention.html>.
  Supports:
  - codes like "AM.R5DCF.00.SHZ";
  - "generated automatically by using the last 4 digits of the Raspberry Pi computer's
    unique hardware address" (an "S" replaces the "R" on a collision);
  - channels: SHZ at 50 per second on RS1D V4/V5; EHZ at 100 per second on the
    others; EH[ZNE] on the RS3D; EHZ plus EN[ZNE] on the RS4D; HDF for the air channel;
    location code 00.

  Where the code appears on the Shake's page: not stated.
- **SSH,** <https://manual.raspberryshake.org/ssh.html>: user `myshake`, default password
  `shakeme`, "You should change this!"
- **Timing,** <https://manual.raspberryshake.org/ntp.html>. Supports:
  - "20 ppm crystal, so ~2 seconds/ day" without NTP;
  - "refid = INIT" means no contact;
  - with no time quality the Shake "will refuse to forward" data, which is the basis of
    our quick clock check (our inference);
  - 20 ms timing for RS1D V4/V5 at 50 Hz;
  - port 123 "TCP and UDP protocols open in both directions".
- **Specifications,** <https://manual.raspberryshake.org/specifications.html>. Supports:
  - "Timing quality is +/- 10 ms for all products";
  - "We do not recommend using the built-in Raspberry Pi board's Wi-Fi";
  - every model has Ethernet;
  - the lights in normal operation;
  - "5.1 V at 2.5 Amps to boot".
- **Quick start,** <https://manual.raspberryshake.org/quickstart.html>. Supports:
  - the first-boot steps;
  - "Enable data forwarding to share data with the Raspberry Shake Community";
  - "select exactly where your Raspberry Shake lives";
  - "Save and Restart";
  - "it's essential that you change the password";
  - the location is obscured "by a couple hundred meters in a random direction";
  - the first boot needs the internet for updates.

  Whether forwarding is on by default: not stated (the page tells owners to turn it on).
- **Local monitoring,** <https://manual.raspberryshake.org/shakemon.html>: command-line
  checks from another computer (ping, SeedLink port 18000, disk, recent files). It
  describes no web view, data API, CORS or WebSocket on the Shake.
- **Web and mobile apps,** <https://manual.raspberryshake.org/webServices.html>: ShakeNet,
  StationView, DataView, EQ Sound, all hosted by Raspberry Shake. DataView can show "live
  data from any Raspberry Shake connected to the network in kiosk mode" with an iframe.
  The basis of gray area G7.
- **Without a network,** <https://manual.raspberryshake.org/no-network.html>: off-line
  mode, optional GPS, "You must set the date to UTC".
- **GPS timing,** <https://manual.raspberryshake.org/gpsTiming.html>: "only tested the
  UBLOX7 GR-701 and UBLOX8 GR-801"; GPS "is not activated by default".

## Raspberry Shake: viewers and rsudp

- **StationView announcement,** <https://raspberryshake.org/the-new-stationview/> (2023-07-28).
  Supports: a map of stations and quakes; a "Real-time Data Stream and corresponding
  spectrogram"; links to DataView; download of a station's data. It describes no
  24-hour view and no user notes. A release note, not a current help page.
- **DataView release,** <https://raspberryshake.org/dataview-official-release/> (2022-12-05).
  Supports:
  - "Live Stream", "Helicorder" and "Compare Data";
  - the helicorder shows "the last 24 hours (default option)";
  - live stream default "600 seconds";
  - filters, spectrogram, spectrum;
  - automatic event marks when the Shake is near the epicenter;
  - an image export of "a composite plot";
  - "Embed Livestream".

  No user notes found. The app may have changed since.
- **rsudp documentation,** <https://raspishake.github.io/rsudp/> (version 2.2.1) and its
  pages `installing.html`, `settings.html`, `running.html`; README
  <https://github.com/raspishake/rsudp>. Supports:
  - what rsudp is and its modules (plot, alert, RSAM, alarmsound, telegram, tweets,
    write, forward, custom, printdata);
  - forwarding of datacast packets to other addresses;
  - "This library can only handle incoming data from one Shake per port";
  - plotting on a Raspberry Pi 3B+ updates "approximately once every 5 seconds";
  - install with Python 3.12 (conda route) or the installer;
  - license GPL-3.0 (GitHub). The README's disclaimer calls it "public domain"; the
    wording differs, so check it if the license matters.

  No web, WebSocket or HTTP output found.

## Real-time servers and libraries

- **ringserver (EarthScope),** README <https://github.com/EarthScope/ringserver> and
  ChangeLog. Supports:
  - "DataLink, SeedLink and HTTP/WebSocket" on one listener;
  - the `/seedlink` and `/datalink` WebSocket endpoints;
  - WebSocket support since entry 2016.352;
  - TLS protocol detection ("secure WebSocket for SeedLink or DataLink") in 4.1.0
    (2025.196);
  - `slink2dali` to pull from a SeedLink server; a built-in scanner for miniSEED files;
  - Apache License 2.0.
- **EarthScope SeedLink service,** <https://docs.earthscope.org/service/seedlink>.
  Supports:
  - host `rtserve.earthscope.org`; ports 18000, 18500 (TLS) and 443
    (`wss://rtserve.earthscope.org/seedlink`);
  - "Users should maintain no more than 5 concurrent connections to the service";
  - "Data stream history should not be expected to exceed 1 hour";
  - the service's own latency is "normally well below 1 second".

  The old name `rtserve.iris.washington.edu` no longer resolves (checked 2026-11-25).
- **seisplotjs,** <https://crotwell.github.io/seisplotjs/> (3.3.0) and its API index.
  Supports:
  - browser modules for "seedlink protocol over web socket to a Ringserver seedlink
    server", the same for SeedLink 4, and DataLink;
  - "helicorder style 24 hour plots";
  - a "real time animated seismograph".

  The real-time tutorial, <https://crotwell.github.io/seisplotjs/tutorial/7_realtime.html>,
  connects with DataLink over `wss://` (search result only).

## Browsers

- **Chrome, Local Network Access,** <https://developer.chrome.com/blog/local-network-access>
  (published 2025-06-09, updated 2025-09-29). Supports:
  - "The Local Network Access permission prompt is launching in Chrome 142";
  - permission-gated local requests "will now be exempted from mixed content checks" (for
    a private IP, a `.local` name, or `targetAddressSpace: "local"`);
  - WebSockets, WebTransport and WebRTC "are not yet gated", with this "planned soon".

  The 2026 status of WebSockets is not checked.
- **Local Network Access draft,** <https://wicg.github.io/local-network-access/> (7 August
  2026): local requests allowed only from a secure context with the user's permission.
- **Policies** (search results only):
  - `LocalNetworkAccessAllowedForUrls` and `LocalNetworkAccessBlockedForUrls`, from
    Microsoft Edge's policy page,
    <https://learn.microsoft.com/en-us/deployedge/microsoft-edge-policies/LocalNetworkAccessAllowedForUrls>,
    and Samsung's,
    <https://developer.samsung.com/browser/policy/local-network-access-allowed-for-urls.html>;
  - Chrome enforcing Local Network Access from 142, from Microsoft eCDN,
    <https://learn.microsoft.com/ecdn/how-to/configure-local-network-access-policy>.
- **MDN, mixed content,** <https://developer.mozilla.org/en-US/docs/Web/Security/Mixed_content>:
  `fetch()` and `XMLHttpRequest` to `http://` from an HTTPS page are "blockable" content.
  The page does not mention WebSockets. That browsers block `ws://` from HTTPS pages is
  standard behavior (Chrome reports it as mixed content), but no page we fetched states
  it; verify in a browser before the polished guide.
- **Chrome Direct Sockets,** <https://developer.chrome.com/docs/iwa/direct-sockets>, and
  the Chromium "Intent to Ship"
  <https://groups.google.com/a/chromium.org/g/blink-dev/c/5R0P_aYBWQI/m/rFMq-qYAEQAJ>
  (search results only, 2024-era): raw TCP and UDP sockets only for Isolated Web Apps,
  available to users on ChromeOS. Not available to ordinary websites.

## Our own check: live UU stand-ins over secure WebSocket (2026-11-25)

Run from Gus's machine (Node 24.12, built-in WebSocket), about 16:55–17:05 UTC.

- **Check 1:** `curl` with a WebSocket upgrade and `Origin: https://gus-p-williams.github.io`
  to `https://rtserve.earthscope.org/seedlink` answered "101 Switching Protocols" with
  `Access-Control-Allow-Origin: *`.
- **Check 2:** the server greeted the client with "SeedLink v4.0 (RingServer/4.5.6) ::
  SLPROTO:4.0 SLPROTO:3.1 CAP WS:13".
- **Check 3:** `https://rtserve.earthscope.org/streams?match=UU_TMU` listed TMU's ENx and
  HHx streams with about 1 h 40 min of buffered data.
- **Result:** 12 packets from TMU HHZ, SUU EHZ and ELU EHZ arrived 18.3 to 26.6 s after
  their last sample (median 19.9 s). Each 512-byte record held 4 to 7 s of data, so most
  of the delay is the record filling up at the station and the trip to EarthScope, not
  the server.

The script (scratch only, not kept in the repo):

```js
// SeedLink over secure WebSocket: send commands, then time each 520-byte packet.
const ws = new WebSocket('wss://rtserve.earthscope.org/seedlink'); ws.binaryType = 'arraybuffer';
const cmds = ['HELLO', 'STATION TMU UU', 'SELECT HHZ', 'STATION SUU UU', 'SELECT EHZ',
  'STATION ELU UU', 'SELECT ??Z', 'DATA', 'END'];
let i = 0; ws.onopen = () => { const go = () => { if (i < cmds.length) { ws.send(cmds[i++] + '\r\n'); setTimeout(go, 250); } }; go(); };
ws.onmessage = (ev) => {
  const b = new Uint8Array(ev.data); if (b[0] !== 83 || b[1] !== 76) return; // "SL" + 6-char sequence + 512-byte miniSEED
  const m = b.slice(8), dv = new DataView(m.buffer);
  const start = Date.UTC(dv.getUint16(20), 0, dv.getUint16(22), m[24], m[25], m[26]) + dv.getUint16(28) / 10;
  const n = dv.getUint16(30), f = dv.getInt16(32), mult = dv.getInt16(34);
  const sps = f > 0 ? (mult > 0 ? f * mult : -f / mult) : (mult > 0 ? -mult / f : 1 / (f * mult));
  console.log('delay', ((Date.now() - (start + (n - 1) / sps * 1000)) / 1000).toFixed(1), 's');
};
```

## Project sources used

- `planning/evaluation.md`: 4.1 to 4.4 (license summary, our viewers rule, occupancy
  privacy, the path to school data), Appendix A (models, the Alaska program's hallway
  displays), Appendix B (ports, fixed address), Appendix D (File loader, viewer).
- `planning/activities.md`: the S and R cards; B4 (about 200 days on an RS1D card and 68
  on an RS3D; 72 ms drift per hour without time); B5 (session log; space; clipping);
  Appendix E (viewer, File loader, session log); Appendix G (open questions 3, 4, 6).
- `planning/roadmap.md` (Stages 2 and 4; "Proposed, pending Dale and Cleat") and
  `planning/decisions.md` (D6, D12, D26, D31, D33, D35).
- Effort calibration: CLAUDE.md status entries for 2026-11-23 (Stage 1 built in a day) and
  2026-11-24 (Quake Explorer built and merged).
- Code read: `docs/app/js/lib/helicorder.js`, `carpet.js`, `psd.js`; `docs/app/js/data/`
  (`datasource.js`, `mseed.js`); `docs/app/js/quake-explorer/spectrogram-view.js`;
  `docs/app/js/ui/trace-view.js`; the export lists of `signal.js`, `stack.js`,
  `spectral.js` and `audify.js`.
