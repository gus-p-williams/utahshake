// Turning a seismogram into sound. Pure functions: they make the numbers,
// and docs/app/js/quake-explorer/audio.js plays them with the browser's WebAudio.
//
// The trick is just speed. Most of a quake's notes are 0.5-20 Hz, too low to
// hear (people hear about 20-20 000 Hz). Play the record k times faster and
// every frequency is multiplied by k: at 100x a 1 Hz wave becomes a 100 Hz hum.
// The record is not changed at all, only played back at sampleRate x k samples
// per second instead of sampleRate.

/** Lowest and highest buffer sample rates (Hz) that browsers promise to play. */
export const MIN_PLAYBACK_RATE = 3000;
export const MAX_PLAYBACK_RATE = 768000;

/** Range of human hearing, Hz (roughly; the top falls with age). */
export const HEARING_HZ = Object.freeze([20, 20000]);

/**
 * Speed-ups this record can be played at: the sound's sample rate
 * (sampleRate x speedUp) must be between 3000 and 768 000 per second.
 * @param {number} sampleRate of the record
 * @returns {{min: number, max: number}} whole-number speed-ups
 */
export function allowedSpeedUps(sampleRate) {
  return {
    min: Math.ceil(MIN_PLAYBACK_RATE / sampleRate),
    max: Math.floor(MAX_PLAYBACK_RATE / sampleRate),
  };
}

/**
 * What a speed-up does to the notes, for a "why" panel.
 * - groundLowHz / groundHighHz: the ground frequencies you can hear at this
 *   speed-up (20 Hz and 20 000 Hz divided by speedUp; the top is also limited
 *   by the record's Nyquist frequency, the highest note it can hold).
 * - oneHzHeardAs: a 1 Hz ground wave comes out as this many Hz (= speedUp).
 * - nyquistHz: the highest frequency in the record (sampleRate / 2);
 *   nyquistHeardHz: where that lands in the sound. At 400x, a 100 samples/s
 *   record's 50 Hz limit lands at 20 000 Hz, the top of hearing.
 * @param {number} sampleRate
 * @param {number} speedUp
 */
export function audibleRange(sampleRate, speedUp) {
  const nyquistHz = sampleRate / 2;
  return {
    playbackRate: sampleRate * speedUp,
    oneHzHeardAs: speedUp,
    groundLowHz: HEARING_HZ[0] / speedUp,
    groundHighHz: Math.min(nyquistHz, HEARING_HZ[1] / speedUp),
    nyquistHz,
    nyquistHeardHz: nyquistHz * speedUp,
  };
}

/**
 * Sound samples for a seismogram played speedUp times faster.
 *
 * Steps: remove the mean (a steady offset is silent but wastes loudness), set
 * missing samples to 0 (silence), scale so the biggest wiggle reaches `peak`
 * (sound samples must stay between -1 and 1), and fade in and out over
 * `fadeSec` seconds of sound so the start and end don't click.
 *
 * Throws an Error with a friendly message if browsers can't play the result
 * (sound sample rate outside 3000-768 000 per second).
 * @param {ArrayLike<number>} data the record (counts or m/s; any units)
 * @param {number} sampleRate of the record
 * @param {number} speedUp e.g. 100
 * @param {{fadeSec?: number, peak?: number}} [opt] fadeSec is in sound time
 * @returns {{samples: Float32Array, playbackRate: number, durationSec: number}}
 *   durationSec: how long the sound lasts
 */
export function audioSamples(data, sampleRate, speedUp, opt = {}) {
  const { fadeSec = 0.02, peak = 0.9 } = opt;
  const playbackRate = sampleRate * speedUp;
  if (!(speedUp > 0) || playbackRate < MIN_PLAYBACK_RATE || playbackRate > MAX_PLAYBACK_RATE) {
    const { min, max } = allowedSpeedUps(sampleRate);
    throw new Error(`A ${speedUp}x speed-up can't be played: at ${sampleRate} samples/s it makes ` +
      `${Math.round(playbackRate)} sound samples per second, and browsers play ` +
      `${MIN_PLAYBACK_RATE}-${MAX_PLAYBACK_RATE}. Choose a speed-up from ${min}x to ${max}x.`);
  }
  const n = data.length;
  const samples = new Float32Array(n);
  let sum = 0;
  let count = 0;
  for (let i = 0; i < n; i++) if (!Number.isNaN(data[i])) { sum += data[i]; count++; }
  const mean = count ? sum / count : 0;
  let big = 0;
  for (let i = 0; i < n; i++) {
    const v = Number.isNaN(data[i]) ? 0 : data[i] - mean;
    samples[i] = v;
    if (Math.abs(v) > big) big = Math.abs(v);
  }
  if (big > 0) for (let i = 0; i < n; i++) samples[i] *= peak / big;

  // Raised-cosine fade at both ends (at most half the sound each).
  const nFade = Math.min(Math.floor(n / 2), Math.round(fadeSec * playbackRate));
  for (let i = 0; i < nFade; i++) {
    const g = 0.5 * (1 - Math.cos((Math.PI * i) / nFade));
    samples[i] *= g;
    samples[n - 1 - i] *= g;
  }
  return { samples, playbackRate, durationSec: n / playbackRate };
}

/**
 * Change the sample rate of a sound by straight-line interpolation between
 * samples. Used by audio.js when a browser refuses an unusual sample rate:
 * the sound is converted to the rate the browser runs at (often 48 000/s)
 * instead. It lasts just as long, so the notes are unchanged. Going down in
 * rate, call lowpassFIR (signal.js) first so notes above the new Nyquist
 * don't fold back as false ones.
 * @param {ArrayLike<number>} samples
 * @param {number} fromRate
 * @param {number} toRate
 * @returns {Float32Array}
 */
export function resampleLinear(samples, fromRate, toRate) {
  const n = samples.length;
  if (n === 0) return new Float32Array(0);
  const m = Math.max(1, Math.round((n * toRate) / fromRate));
  const out = new Float32Array(m);
  for (let j = 0; j < m; j++) {
    const x = (j * fromRate) / toRate; // position in the input, in samples
    const i = Math.floor(x);
    if (i >= n - 1) { out[j] = samples[n - 1]; continue; }
    const f = x - i;
    out[j] = samples[i] * (1 - f) + samples[i + 1] * f;
  }
  return out;
}
