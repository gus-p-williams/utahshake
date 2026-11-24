# Data sources and licensing

The technical details of where the apps get their data and the rules that come with it.
Students and teachers: [Our stations and data](../theory/stations.md) explains the same in
plain language.

## What the apps use today

| Data | Service | Used for |
| --- | --- | --- |
| Earthquake list and details | USGS ComCat, [FDSN event service](https://earthquake.usgs.gov/fdsnws/event/1/) (GeoJSON) | Quake list, official locations |
| Analyst picks | ComCat `phase-data` product (QuakeML), from University of Utah Seismograph Stations | Choosing clear stations; answer key after "reveal" |
| Station list | EarthScope [FDSN station service](https://service.earthscope.org/fdsnws/station/1/) (text) | Stations near each quake |
| Waveforms | EarthScope [FDSN dataselect](https://service.earthscope.org/fdsnws/dataselect/1/) (miniSEED, POST) | Seismograms |
| Map tiles | [OpenStreetMap](https://www.openstreetmap.org/copyright) | Base map |
| Wind speed (figures only, not the apps) | [Iowa Environmental Mesonet](https://mesonet.agron.iastate.edu/) (ASOS, Milford airport MLF) | The wind figure on Reading a seismogram (`tools/figures/seismogram-figures.mjs`) |
| Travel times (distant quakes) | Bundled table `docs/app/data/traveltimes-iasp91.json` (iasp91, Kennett and Engdahl 1991, made with ObsPy TauP); no web service | Quake Explorer D |

All of these allow requests from any web page (CORS `Access-Control-Allow-Origin: *`,
checked 2026-11-23), so the apps need no server of our own.

The stations are the **University of Utah Regional Seismic Network, network code UU**. Only
velocity sensors (`HH?`, `EH?`, `BH?`) are used; strong-motion accelerometers (`EN?`) are
skipped because they are too noisy for small quakes.

## Credits shown in the apps

Every page that shows data cites its source in a credits footer. The texts are `ATTRIBUTION`
in `js/config.js`; `showCredits(el, keys)` in `js/ui/page.js` writes the entries a page names
(Quake Locator: waveforms, events and map; Quake Explorer adds travel times) and adds an "About the data ↗" link to
[Our stations and data](../theory/stations.md). The map also shows the OpenStreetMap credit
in its corner (`ui/map-view.js`).

- Waveforms: University of Utah Seismograph Stations, network UU
  ([doi:10.7914/SN/UU](https://doi.org/10.7914/SN/UU)), via EarthScope Data Services.
- Earthquake locations and analyst picks: U.S. Geological Survey ComCat / University of Utah
  Seismograph Stations.
- Map data © OpenStreetMap contributors.
- Travel times for distant quakes: the iasp91 Earth model (Kennett and Engdahl, 1991), via
  ObsPy TauP (Quake Explorer).

## Licenses and rules

- **UU network data** are openly available through EarthScope; cite the network DOI.
- **USGS ComCat** data are U.S. Government public domain; credit the USGS.
- **OpenStreetMap** data are ODbL; the attribution is shown on the map. Light classroom use fits
  the [tile usage policy](https://operations.osmfoundation.org/policies/tiles/). If use grows a
  lot, switch to a tile provider with an agreement.
- **Raspberry Shake network data are not used.** The Raspberry Shake license does not allow
  back-end or app integration of its network data, or a "network"-style page of other Shakes.
  UHSN's own school Shakes, read directly from the devices by DRI, are UHSN's data. For the
  wider Raspberry Shake network, link out to StationView and DataView.
- **Student data:** none is collected. Before adding anything that stores student work on a
  server, read the R277-487 notes under "Fit with Utah state requirements" in the
  [planning evaluation](https://github.com/gus-p-williams/utahshake/blob/main/planning/evaluation.md#fit-with-utah-state-requirements)
  (on GitHub; the planning files are not part of this site).

## Offline samples

`docs/app/data/samples/<event id>/` holds one quake's data for schools whose networks block
the services above:

```
event.json      the quake (same shape as the live source returns)
stations.json   stations shown for it
picks.json      UUSS analyst picks
waveforms.mseed 90 s of miniSEED per channel
ABOUT.txt       provenance and credits
```

Make a new one with `node tools/samples/fetch-sample.mjs <ComCat id>`. The script also checks
that the analysts' S − P times locate the quake within a few km. Add the ID to `PRESET_EVENTS`
in `config.js` if it should appear as a classic quake. `npm test` runs real-data checks on
every sample.

**Quake Explorer's samples** live beside them in `docs/app/data/samples/qe-*/` and are listed
under `"explorer"` in `samples/index.json` (Quake Locator reads only the `"samples"` list). They
have more stations and longer windows (a record section out to 300 or 400 km; half an hour for
a distant quake), full channel metadata (direction, sensitivity, units, clipping), and two
extra files: `computer-picks.json` (AIC picks, labeled as computer picks, where the analysts
made none) and `sample.json` (`"kind": "explorer"` and the command that made it). Make one
with `node tools/quake-explorer/make-sample.mjs`; see
[Quake Explorer notes](quake-explorer.md#rebuilding-the-samples-and-the-answer-key).
`tests/explorer-sample.test.js` checks them.

## Adding a data source (e.g. the UHSN server)

Write a class with the methods listed in `js/data/datasource.js`:

```js
export class UHSNSource {
  name = 'Live: UHSN schools';
  live = true;
  async getEvents({ startMs, endMs, minMag, region }) { /* → QuakeEvent[] */ }
  async getEvent(id) { /* → QuakeEvent */ }
  async getStations({ lat, lon, maxKm, atMs }) { /* → Station[] with channels */ }
  async getWaveforms(requests, startMs, endMs) { /* → Trace[] (NaN in gaps) */ }
  async getAnalystPicks(eventId) { /* → [] if none */ }
}
```

The shapes are documented in `js/lib/fdsn.js` (QuakeEvent, Station) and `js/lib/signal.js`
(Trace). Then:

1. Return it from `sourceFromUrl()` (for example for `?source=uhsn`).
2. Point `SCHOOLS[].standIn` in `config.js` at the school Shakes (network `AM` codes, or
   whatever the UHSN server uses).
3. Add tests for any new parsing in `tests/`.

Raspberry Shakes record at 100 samples per second on `EHZ` (and `EHN`/`EHE` on an RS3D), which
`chooseChannels()` already accepts.
