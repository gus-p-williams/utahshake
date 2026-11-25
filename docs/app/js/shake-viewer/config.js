// Settings for the School Shake Viewer (a prototype: docs/apps/shake-viewer.md).

/**
 * University of Utah stations the viewer can show a day of, through EarthScope: the five
 * schools' stand-ins (config.js SCHOOLS) and HEB near Heber City, where a town's daily rhythm
 * shows clearly ("Beyond one seismogram", the seismic carpet). Vertical channel, location code
 * and position checked on 2026-11-25 with the EarthScope station service.
 */
export const STAND_INS = Object.freeze([
  { key: 'UU.HEB', net: 'UU', sta: 'HEB', loc: '01', cha: 'EHZ', lat: 40.5015, lon: -111.3358,
    label: 'HEB near Heber City: a town’s daily rhythm' },
  { key: 'UU.SUU', net: 'UU', sta: 'SUU', loc: '01', cha: 'EHZ', lat: 39.8882, lon: -111.7908,
    label: 'SUU: stand-in for Juab High School' },
  { key: 'UU.ELU', net: 'UU', sta: 'ELU', loc: '01', cha: 'EHZ', lat: 39.6402, lon: -111.2038,
    label: 'ELU: stand-in for North Sanpete High School' },
  { key: 'UU.TMU', net: 'UU', sta: 'TMU', loc: '01', cha: 'HHZ', lat: 39.2965, lon: -111.2082,
    label: 'TMU: stand-in for Wasatch Academy' },
  { key: 'UU.SGU', net: 'UU', sta: 'SGU', loc: '01', cha: 'HHZ', lat: 39.1823, lon: -111.6447,
    label: 'SGU: stand-in for Gunnison Valley High School' },
  { key: 'UU.WCU', net: 'UU', sta: 'WCU', loc: '02', cha: 'EHZ', lat: 38.9647, lon: -112.0907,
    label: 'WCU: stand-in for Millard High School' },
]);

/**
 * The example: HEB on Tuesday, November 17, 2026 (a regular school day in Wasatch County),
 * with notes of the bell times at two Heber City schools. "Try the example" opens it from the
 * test folder that comes with the site (UHSN layout, 5 am to 9 pm Mountain time that day).
 */
export const EXAMPLE = Object.freeze({
  station: 'UU.HEB',
  date: '2026-11-17',
  notesUrl: '../../data/notes/heb-example.json', // relative to this module
});

/** The test folder in the UHSN data layout, relative to the page; ?uhsn=<address> overrides it. */
export const UHSN_DEMO_BASE = '../data/uhsn-demo/v1/';

/** Filters for the helicorder. */
export const HELI_FILTERS = Object.freeze([
  { id: 'bp1-10', label: '1–10 Hz (quakes)', lo: 1, hi: 10 },
  { id: 'bp5-20', label: '5–20 Hz (people, traffic)', lo: 5, hi: 20 },
  { id: 'raw', label: 'Raw (mean removed)' },
]);

/** Bands for the hourly noise levels: the science page's carpet band first (spec section 10.1). */
export const NOISE_BANDS = Object.freeze([
  { id: 'bp5-20', label: '5–20 Hz', lo: 5, hi: 20 },
  { id: 'bp1-10', label: '1–10 Hz', lo: 1, hi: 10 },
]);

/** Lengths of the zoom window, seconds. */
export const ZOOM_SPANS = Object.freeze([60, 120, 300, 600, 1800, 3600]);
export const DEFAULT_ZOOM_SEC = 300;

/** Quakes marked from the USGS catalog: Utah region (config.js REGION) and big ones anywhere. */
export const QUAKES = Object.freeze({ regionalMinMag: 2.0, worldMinMag: 6.0 });
