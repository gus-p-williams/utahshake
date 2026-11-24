// Project-wide settings for the UHSN apps.
//
// Until the school Raspberry Shakes stream to UHSN, a nearby University of Utah
// (network UU) station stands in for each school's sensor. Swapping in the real
// school stations later is a change to SCHOOLS[].standIn only.

/** Utah region used by UUSS for its catalog (degrees). */
export const REGION = {
  name: 'Utah region',
  minLat: 36.75,
  maxLat: 42.5,
  minLon: -114.25,
  maxLon: -108.75,
};

/**
 * UHSN Phase I schools. Coordinates are approximate (town level) and are only
 * used to draw the schools on the map and to flag quakes "near our schools".
 * standIn: the UU station that plays the school's sensor (nearest active
 * velocity sensor, checked 2026-11-23 with the EarthScope station service).
 */
export const SCHOOLS = [
  { id: 'juab', name: 'Juab High School', town: 'Nephi',
    lat: 39.709, lon: -111.836, standIn: { net: 'UU', sta: 'SUU' } },
  { id: 'north-sanpete', name: 'North Sanpete High School', town: 'Mt. Pleasant',
    lat: 39.540, lon: -111.463, standIn: { net: 'UU', sta: 'ELU' } },
  { id: 'wasatch-academy', name: 'Wasatch Academy', town: 'Mt. Pleasant',
    lat: 39.547, lon: -111.455, standIn: { net: 'UU', sta: 'TMU' } },
  { id: 'gunnison-valley', name: 'Gunnison Valley High School', town: 'Gunnison',
    lat: 39.153, lon: -111.817, standIn: { net: 'UU', sta: 'SGU' } },
  { id: 'millard', name: 'Millard High School', town: 'Fillmore',
    lat: 38.969, lon: -112.343, standIn: { net: 'UU', sta: 'WCU' } },
];

/** Defaults for the Quake Locator app (WAVE_RACE: its name in code). */
export const WAVE_RACE = {
  recentDays: 90,
  minMagnitude: 2.0,
  // Waveform window around the origin time (seconds).
  preOriginSec: 10,
  postOriginSec: 80,
  // Stations: school stand-ins within maxStandInKm, plus helper stations
  // around the quake so that 4+ stations surround it.
  maxStandInKm: 220,
  maxHelperKm: 150,
  maxStations: 10,
  // Physics defaults (typical Utah crust).
  // Calibrated on UUSS analyst picks (decision D9): about 7.7 km of distance
  // per second of S-minus-P. The textbook 6.0 / 3.5 (8.4 km/s) runs ~10% long.
  vp: 5.8,            // km/s
  vs: 3.3,            // km/s
  depthKm: 8,         // assumed focal depth for the map circles and the fit
  pickUncertaintySec: 0.2,
  // A quake counts as "near our schools" within this distance of any school.
  nearSchoolKm: 150,
};

/** Bandpass presets offered in the waveform panel. */
export const FILTERS = [
  { id: 'raw', label: 'Raw (mean removed)' },
  { id: 'bp1-10', label: '1–10 Hz', lo: 1, hi: 10 },
  { id: 'bp2-8', label: '2–8 Hz', lo: 2, hi: 8 },
];

/**
 * "Classic" quakes students can always load. Times and locations verified
 * against USGS ComCat on 2026-11-23.
 */
export const PRESET_EVENTS = [
  { id: 'uu60363602', label: '2020 Magna earthquake (M5.7)' },
  { id: 'uu80162166', label: '2026 Junction quake (M3.3)' }, // also the offline sample
];

/** Data credits shown on every page that displays data. */
export const ATTRIBUTION = {
  waveforms: 'Waveforms: University of Utah Seismograph Stations, network UU ' +
    '(doi:10.7914/SN/UU), via EarthScope Data Services.',
  events: 'Earthquake locations and analyst picks: U.S. Geological Survey ' +
    'ComCat / University of Utah Seismograph Stations.',
  map: 'Map data © OpenStreetMap contributors.',
  traveltimes: 'Travel times: iasp91 Earth model, Kennett and Engdahl 1991, via ObsPy TauP.',
};
