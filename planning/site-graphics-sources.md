# Sources for the site graphics

Session D15-web-design's log of what is behind the small pictures on the home page and All apps
(constraint 5, D28). The pages carry only a short credit: the home banner's caption and the data
lines already on both pages. Every picture is drawn by `tools/figures/site-graphics.mjs` into
`docs/img/graphics/`, from records stored with the site; nothing is downloaded when it runs,
and nothing comes from Raspberry Shake. The records were downloaded on 2026-11-24 (the samples)
and 2026-11-25 (the HEB test day), as each folder's ABOUT.txt says.

| Picture | Source | Where it is stored | What it supports |
| --- | --- | --- | --- |
| Home banner: the quake | USGS ComCat event uu80162166, M3.3 (ml), 8 km NW of Junction, Utah, 2026-10-31 04:44:15.58 UTC (October 30, 10:44 pm in Utah), <https://earthquake.usgs.gov/earthquakes/eventpage/uu80162166> | `docs/app/data/samples/uu80162166/event.json` | The star, "a magnitude 3.3 quake near Junction, Utah, October 2026" |
| Home banner: the seismogram | University of Utah Seismograph Stations, network UU (doi:10.7914/SN/UU), station WCU, channel EHZ, via EarthScope FDSN dataselect; UUSS analyst P and S picks via ComCat | `docs/app/data/samples/uu80162166/` (`waveforms.mseed`, `picks.json`) | The trace (1–10 Hz, the apps' filter) and its blue P and red S lines |
| Home banner: the map | The five Phase I schools and their stand-in stations from `docs/app/js/config.js` (SCHOOLS); station coordinates from UU metadata in the sample's `stations.json`; Utah's border corners as in `tools/figures/science-maps.mjs` | as listed | "The five UHSN schools", WCU as Millard High School's stand-in (21.8 km apart, by `lib/geo.js`) |
| Home banner: the circles | Quake Locator's speeds, 5.8 km/s (P) and 3.3 km/s (S), calibrated on UUSS picks (D9) | `docs/app/js/lib/wave-motion.js` (VP, VS) | "How far its P and S waves had spread 20 seconds after it began" (from the epicenter, ignoring its 4 km depth) |
| Quake Locator card | Same sample: UUSS analyst S − P at TCRU, MTPU and WCU, turned into distances with the app's own rule (`lib/locate.js`, 5.8/3.3 km/s, 8 km depth) | `docs/app/data/samples/uu80162166/` | The three circles crossing at the quake |
| Quake Explorer card | The Junction quake again, Quake Explorer's offline sample: UU vertical records within 200 km; P and S lines fitted (`lib/linefit.js`) to the UUSS analyst picks | `docs/app/data/samples/qe-junction/` | The record section and its rulers |
| School Shake Viewer card | UU station HEB (near Heber City), channel EHZ, November 17, 2026, 7 am to 5 pm Utah time; drawn with the viewer's helicorder code (`lib/helicorder.js`) | `docs/app/data/uhsn-demo/v1/` | The helicorder lines |
| School Pulse card | UU station HEB, 1–10 Hz noise, one level per 15 minutes for a week in September 2026 (made by `tools/figures/seismogram-figures.mjs` for Reading a seismogram) | `tools/figures/data/people-heb-2026-09.json` | The weekday rhythm of the noise |
| Quake Waves, Build a Wiggle, How P and S waves move rock, Phone Bench cards | No outside source: the apps' own cartoons (`lib/wave-sim.js` arrivals and the app's map, `lib/wiggle.js`, `lib/wave-motion.js`) and a made-up phone take (`lib/bench.js` makeTake) | none | — |
