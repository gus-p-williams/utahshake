# UHSN school seismometer data: a brief for DRI IT

*Draft 3, 2026-11-25. From the UHSN website team (Gus Williams), for Cleat to open the
conversation with DRI IT. Attached: "UHSN data specification" (`spec-uhsn-data.md`), which
says what the website needs. **DRI IT chooses how to build and run it.***

## At a glance

| | |
| - | - |
| **What** | Receive data from the Raspberry Shake seismometers in five Utah high schools, store them, and publish them on the web for students' browsers |
| **Sponsor** | The UHSN project at DRI (funding line: *Cleat to fill in*) |
| **When** | A test server: *Cleat to fill in*. First school: about 2–4 months after DRI IT agrees |
| **Scale** | 5 schools (Phase I); more may follow |
| **Data** | Public ground-motion records. No student or personal data; not safety-critical |
| **Asks of DRI IT** | A small public HTTPS file service with a private intake; five small DRI-owned "bridge" computers at schools |

```
 SCHOOL                     DRI                        ANYONE
 Raspberry Shake
    | SeedLink (inside the school)
    v
 Bridge === HTTPS, outbound ===> private intake
 (DRI-owned)                          | publish step (applies
                                      v any approved delay)
                                 public files --HTTPS--> browsers
                                                        (our website)
```

## The recommended path, and one fallback

**Recommended: a bridge at each school.** A small DRI-owned Linux computer (for example a
Raspberry Pi with a USB disk) sits on the school's wired network beside the Shake.

- **It reads the Shake** through the Shake's standard data stream (SeedLink), using
  EarthScope's open-source `slarchive`. **This needs no Shake password.**
- **It keeps its own archive** of several weeks, and every hour sends the new data out to
  DRI over HTTPS (or rsync over SSH).
- **All connections start inside the school.** Outages of the internet or of DRI's server
  are absorbed by the bridge's disk and caught up afterward.
- **Variant:** if a district won't allow the bridge's outbound traffic, the bridge can use
  its own cellular modem.

**Fallback: the Shake's built-in UDP stream ("datacast")** sent straight to a DRI receiver,
with no device at the school. It is for a monitored pilot only: lost packets are gone for
good, the stream is neither encrypted nor authenticated, and Raspberry Shake calls it "not
intended for production".

*(Dale and Cleat are also asking whether University of Utah Seismograph Stations would host
the data instead of DRI. The bridges would still be needed.)*

## What goes public, and when

- **A school whose Shake already shares with Raspberry Shake's network:** its record is
  already public and live in Raspberry Shake's viewers. Our site adds no new exposure. Its
  data are published hourly, with no added delay, under the school's name, so a class sees
  its own experiments the same day.
- **A school that does not share:** nothing is published until DRI and the district approve
  what goes public (the school's name, its location, the data, the summaries) and with what
  delay. Until then, nothing from that school is public.
- **The server enforces any delay.** Incoming data stay private, and a publish step copies
  out only data older than the cutoff, summaries included.
- **Review still applies.** No student data are involved, but each district's normal IT
  security and privacy review still applies to a DRI device on its network.
- **For DRI's awareness: Utah Code 53G-7-228 (2026).** Each district (LEA) must approve
  instructional technology, privacy compliance included, before classroom use. It may cover
  the UHSN website and its apps as well as any device. DRI and the schools handle these
  approvals; the website team only flags it.
- **Raspberry Shake's license questions** (publishing our own sharing Shakes' data on our
  site; what to do if Raspberry Shake doesn't answer DRI's letter) are DRI's decision.

## Rough sizes (estimates)

| | Estimate |
| - | -------- |
| Data per sensor channel per day | 6–15 MB. Measured: 6.2–10.4 MB for similar professional channels. The Shake manual's "about 15 Mb" must mean megabytes, because a day file can't be smaller than about 6 MB |
| Channels per school | 1 to 4, by Shake model (to be confirmed) |
| All five schools | about 30–300 MB a day; about 11–110 GB a year |
| Upload from each school | new data only, hourly: under 6 kbit/s on average |
| Classroom downloads | under about 5 GB a day in all; a quake window is about 50 KB per channel per student, using range requests |

**Before sizing storage,** DRI should measure one real day file per installed model.

## What each school's IT must allow

- **The bridge:** wired, with a reserved address, on the Shake's network segment. It may
  reach the Shake on TCP 18000 (SeedLink), inside the school.
- **Outbound HTTPS from the bridge to DRI's server only.** The bridge checks DRI's
  certificate, which a district's TLS-inspection proxy would break, so exempt that one host.
  The traffic stays encrypted; nothing is opened for students.
- **No inbound ports, ever.**
- **The Shake's existing needs** (time, updates, and sharing if on) are unchanged.
- **Nobody unplugs the Shake:** shut it down from its web page.
- **The full port lists** are in the review's IT appendix.

## Who maintains what (proposed; time is a rough estimate)

| Who | What | Time |
| --- | ---- | ---- |
| DRI IT | Server, intake, publish step, backups, certificate | Setup 3–5 days; then about half a day a month |
| DRI IT | Bridges: image, mail pre-imaged, updates, one upload credential per school (rotated yearly) | Setup 3–5 days; about 1 day per school; then about 2 hours a month |
| DRI IT and the UHSN instrument contact | Monitoring: last data, clock drift, disk, publish step; alerts and follow-up | Setup 1 day; about 2 hours a month |
| DRI UHSN team | The Shakes, sharing status, district approvals, letters to Raspberry Shake | About 2–4 hours per school, then about 1 hour per school a term |
| School IT | Network rules, reserved addresses, power, restarts on request | About 2–4 hours per school at setup, then about 1 hour a term |
| Website team | The website's data reader, the scripts (index, publish, summaries), a checker that tests the server against the spec | Our time, not DRI's |
| Teachers | Nothing in the data path | — |

## Questions for DRI IT (★ = please answer first)

1. ★ Does DRI already run remote sensor stations, cellular telemetry, managed field devices
   or a public data portal that we should reuse?
2. ★ Can DRI host a small public HTTPS file service with a private intake and a publish
   step, as the spec describes? On which domain?
3. ★ Which intake method suits you (rsync over SSH, or HTTPS uploads)? How would you issue,
   limit to one school's folder, and revoke one credential per school?
4. ★ Can DRI own and manage five bridges: updates and monitoring over outbound connections
   only, mailed pre-imaged so school IT only plugs them in? Does DRI have staff in Utah for
   visits?
5. Who would own the service day to day: named server and bridge owners, alert escalation,
   credential rotation and restore tests?
6. Is the storage acceptable (about 11–110 GB a year, for the life of the program, with
   backups), once real files are measured?
7. Can the server meet the spec's web rules: CORS on every response including errors, range
   requests, and the caching rules?
8. Any preference between plain files now and standard seismology web services (FDSN)
   later? Is there existing seismology software at DRI?
9. What security review does DRI need for a public data server, and for DRI devices on
   school networks?
10. Under what license and credit line will DRI publish the data (we suggest CC BY 4.0)?
    Will DRI register a DOI?
11. Could DRI accept the datacast fallback (one UDP port per school) for a pilot?
12. ★ Roughly how much staff time and hosting cost? Who is our contact, and when could a test
    server exist?

*If DRI IT can't take this on, the website keeps its stopgap: a teacher downloads a day file
from the Shake's own page and our page opens it in the browser. Note also that the website
now lives on a personal GitHub account and is planned to move to DRI, which is one reason
the spec asks for CORS open to all sites (`*`).*
