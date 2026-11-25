# Sources for the School Shake Viewer (prototype)

Session D11-viewer-proto's log of where each outside fact on the viewer's pages comes from
(D28: the pages carry only the short credit; the detail is here). Kept in `planning/`, so it is
in git but not on the website. Accessed 2026-11-25. Add a line whenever a page or a bundled
file states a fact that came from outside our own computation.

## The example notes (`docs/app/data/notes/heb-example.json`)

Read from the official Wasatch County School District pages by a research helper of this
session; the schedules are images and the calendar a PDF graphic, read by eye.

- **Wasatch High School, Tuesday–Friday schedule.** "Wasatch High School Bell Schedules",
  <https://wasatch.edu/whs/bell-schedule/>; the schedule is an image,
  <https://wasatch.edu/whs/wp-content/uploads/sites/5/2026/08/Screenshot-2026-08-03-at-9.18.15-AM.png>,
  titled "Tuesday - Friday": 1st period 8:00–9:14, Excel Time 9:19–9:44, 2nd period 9:49–11:13,
  lunch 11:13–11:53, 3rd period 11:58–1:12, 4th period 1:17–2:31. No year on the image; uploaded
  in July–August 2026, so taken as 2026–27. No AM/PM printed (3rd and 4th period are clearly
  afternoon). The page says Mondays are shortened and "Tuesday – Friday includes a flexible class
  period called Excel Time". Used: 8:00 (1st period starts), 11:13–11:53 (lunch), 2:31 (4th
  period ends).
- **Rocky Mountain Middle School, Tuesday–Friday schedule.** Image headed "Rocky Mountain Middle
  School Bell Schedule 2026-2027", <https://wasatch.edu/rmms/wp-content/uploads/sites/34/2026/08/1-1.jpg>,
  linked from <https://wasatch.edu/rmms/>: warning bell 7:40, 1st period 7:45, last (5th)
  period ends 2:24; Mondays are early-out. Used: 7:40 (warning bell), 2:24 (last period ends).
- **Tuesday, November 17, 2026 was a regular school day.** "Wasatch County School District
  2026-2027 Calendar", <https://wasatch.edu/wp-content/uploads/2026/07/2026-27-Final-Calendar.pdf>:
  a plain (white) cell, not no-school, professional development or early release; Mondays in
  November are early release; Thanksgiving break November 25–27.
- **Not used, for the record:** a KPCW news item (2026-08-19, not opened) says a second high
  school, Deer Creek High, opened in Heber this fall. The example notes name only the two
  schools above and claim nothing about which one, if either, shows at HEB.
- **Times in the file** are the schedules' Mountain Standard Time (UTC−7 on November 17) written
  in UTC; `tests/day-view.test.js` checks that each label's clock time matches its stored time.

## Station facts

- **Stand-in stations' channels and positions** (`docs/app/js/shake-viewer/config.js`): EarthScope
  FDSN station service, text format, level=channel, network UU, stations HEB, SUU, ELU, TMU, SGU,
  WCU, channels HHZ and EHZ, open after 2026-11-20.
- **The midday burst in the guide's Figure 2** (HEB, 2026-11-17 19:16:27 UTC, 12:16:27 pm MST):
  the largest sample of 19:00–19:30 UTC in the raw record, mean removed (222 counts);
  the USGS catalog (FDSN event service) lists nothing within 300 km of HEB, and nothing in the
  Utah region, at any magnitude and of any event type, 19:05–19:20 UTC (worldwide from magnitude
  1, 19:00–19:30 UTC: only small quakes in Alaska and Hawaii). Hence the caption's "not in the
  USGS quake catalog: something near the station".

## The test folder (`docs/app/data/uhsn-demo/v1/`)

- University of Utah Seismograph Stations, network UU (doi:10.7914/SN/UU), station HEB, channel
  01.EHZ, 2026-11-17 12:00 to 2026-11-18 04:00 UTC, via EarthScope dataselect; StationXML from the
  EarthScope station service. Made by `node tools/uhsn-test/make-tree.mjs --demo`; provenance in
  the folder's `ABOUT.txt`.
- EarthScope's dataselect answers trim the first and last record to the window asked for (seen
  in the Junction sample, whose first record holds 11 samples), so the script asks for 5 extra
  minutes at each end and drops the edge records: only whole original records are copied.
