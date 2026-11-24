// The DataSource interface: the only way the apps get data.
//
// Today: EarthScopeUSGSSource (University of Utah stations via EarthScope,
// quakes from USGS) and SampleSource (data bundled with the site, for flaky
// school networks). Later: a UHSNSource that reads the school Raspberry Shakes
// from DRI's server. Any object with these methods works:
//
//   name: string                 shown to the user ("Live: ..." / "Offline sample")
//   live: boolean
//   getEvents({startMs, endMs, minMag, region}) -> Promise<QuakeEvent[]>  newest first
//   getEvent(id)                 -> Promise<QuakeEvent>
//   getStations({lat, lon, maxKm, atMs}) -> Promise<Station[]>  (velocity sensors)
//   getWaveforms(requests, startMs, endMs) -> Promise<Trace[]>
//       requests: [{net, sta, loc, cha}]
//   getAnalystPicks(eventId)    -> Promise<Pick[]>   ([] if none)
//
// Types are documented in lib/fdsn.js (QuakeEvent, Station, Pick) and
// lib/signal.js (Trace). See docs/developers/data-sources.md.

import { EarthScopeUSGSSource } from './earthscope-usgs.js';
import { SampleSource } from './sample-source.js';

export { EarthScopeUSGSSource, SampleSource };

/** "?source=sample" in the page address forces the offline sample. */
export function sourceFromUrl(search = globalThis.location?.search ?? '') {
  const p = new URLSearchParams(search);
  return p.get('source') === 'sample' ? new SampleSource() : new EarthScopeUSGSSource();
}
