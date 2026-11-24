// Settings for Quake Explorer. Shared items (schools, region, credits) come
// from ../config.js; numbers marked "Phase 0" were checked with real data
// (planning/quake-explorer.md, section 9).

export { SCHOOLS, REGION, ATTRIBUTION } from '../config.js';

export const QUAKE_EXPLORER = {
  // Quake list.
  recentDays: 365,
  minMagnitude: 2.5,

  // A. Record section: one station per distance band out to maxKm.
  section: {
    maxKm: 300,
    bandKm: 12.5,
    preSec: 10,          // window before the origin time
    postSec: 110,        // S at 300 km arrives ~90 s after the origin
    channels: 'HH?,EH?,BH?',
    filter: { lo: 1, hi: 10 },
    reduceKmS: 8,        // "reduced time" t − d / 8 makes Pn run straight down
  },
  // Computer (AIC) picks are shown only when the arrival clearly stands out.
  computerPickSnr: { P: 8, S: 2 },
  // Simple crust model for the reveal's travel-time curves (Phase 0 fits:
  // Pg 6.1 km/s near the quake, Pn 7.8 km/s, Magna crust ~37 km; S speeds
  // from the analysts' S picks and Vp/Vs ≈ 1.75).
  model: { vp1: 6.1, vp2: 7.8, vs1: 3.5, vs2: 4.45, crustKm: 37 },

  // B. Frequencies and sound.
  frequencies: {
    filter: { lo: 1, hi: 10 },
    speedUps: [50, 100, 200, 400],
    defaultSpeedUp: 100,
  },

  // C. Particle motion (Phase 0: 1–5 Hz and a 0.3–0.5 s window from the P
  // pick gave a median error of 12–14°; trust it within ~100 km).
  motion: {
    filter: { lo: 1, hi: 5 },
    windowSec: 0.5,
    leadSec: 0.05,       // start the window just before the P pick
    goodWithinKm: 100,
    trust: { linearity: 0.8, upAway: 0.5 },
  },
};

/**
 * Quakes students can always load; each has an offline sample
 * (docs/app/data/samples/<sample>/). Labels avoid place names where the
 * investigation is to find the direction (C), since a name gives it away.
 */
// station: the one B, C and D start on (a school stand-in where it works well).
export const EXPLORER_PRESETS = [
  { id: 'uu80162166', sample: 'qe-junction', views: ['record-section', 'frequencies', 'motion'], station: 'MTPU',
    label: '2026 Junction quake (M3.3)', note: 'the worked example' },
  { id: 'uu60363602', sample: 'qe-magna', views: ['record-section', 'motion'], sectionKm: 400, station: 'SPU',
    label: '2020 Magna earthquake (M5.7)', note: 'a bigger quake: look for the bend at 150 km',
    stationNotes: {
      SGU: "in 2020 its record is about 100 times weaker than its neighbors'; no clear quake",
    } },
  { id: 'uu80161881', sample: 'qe-leamington-blast', views: ['frequencies'], pair: 'uu80120191', station: 'SUU',
    label: '2026 quarry blast near Leamington (M2.1)', note: 'compare with the quake 13 km away' },
  { id: 'uu80120191', sample: 'qe-leamington-quake', views: ['frequencies'], pair: 'uu80161881', station: 'SUU',
    label: '2025 earthquake near Leamington (M2.1)', note: 'compare with the quarry blast' },
  { id: 'uu80158051', sample: 'qe-kenilworth', views: ['motion', 'frequencies'], hidePlace: true, station: 'TMU',
    label: '2026 quake (M2.7) recorded at Wasatch Academy', note: 'which way did it come from?' },
  { id: 'us7000qd1y', sample: 'qe-sand-point', views: ['distant', 'frequencies', 'motion'], station: 'SGU',
    label: '2025 Sand Point, Alaska earthquake (M7.3)', note: 'P, S and surface waves from 4,000 km away' },
];

/**
 * Notes on particular stations' records for one quake (a preset's stationNotes),
 * for the stations that are shown, as "STA: note" lines. Investigation A lists
 * them beside the clipped stations.
 * @param {string} eventId
 * @param {string[]} stations station codes on the page
 * @returns {string[]}
 */
export function stationNotes(eventId, stations) {
  const notes = EXPLORER_PRESETS.find((p) => p.id === eventId)?.stationNotes;
  if (!notes) return [];
  return [...new Set(stations)].filter((s) => notes[s]).map((s) => `${s}: ${notes[s]}`);
}

/** Settings for distant quakes (investigation D). */
export const DISTANT = {
  minMagnitude: 6.5,
  decimateTo: 20,       // samples per second; plenty for waves slower than 2 Hz
  // Stations near the schools with broadband (HH) sensors.
  stations: ['SGU', 'TMU'],
  travelTimes: '../../data/traveltimes-iasp91.json',
};
