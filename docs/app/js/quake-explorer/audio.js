// Listening to a seismogram: plays a record speedUp times faster with the
// browser's Web Audio, and reports which moment of the record is being heard
// so the page can move a cursor across the waveform and spectrogram.
// The numbers come from lib/audify.js (tested in node); this file only plays them.
//
// Classroom notes:
// - Nothing plays without a click. Browsers (Chromebooks included) block
//   sound that a page starts on its own, so the AudioContext is made the
//   first time play() is called, which must be inside a click handler.
// - Most browsers accept a sound buffer at any sample rate from 3000 to
//   768 000 per second, so the record is simply labelled sampleRate x speedUp
//   and played as is. Some (e.g. Firefox: 8000-192 000) refuse unusual rates;
//   then the sound is converted to the browser's own rate (often 48 000/s)
//   first: low-pass filtered if going down, then interpolated. It lasts just
//   as long and the notes are the same.
import { audioSamples, resampleLinear } from '../lib/audify.js';
import { lowpassFIR } from '../lib/signal.js';

export class QuakeAudio {
  constructor() {
    /** @type {AudioContext|null} made on the first play() */
    this.ctx = null;
    this._now = null; // the sound playing now
    this._raf = 0;
  }

  get isPlaying() { return this._now != null; }

  /**
   * Play part of a record, speedUp times faster. Call it from a click handler.
   * Times (dataStartSec, fromSec, toSec, onTime) all use the page's own time
   * base, e.g. seconds after the quake's origin, so onTime can drive the same
   * cursor as the plots.
   * @param {ArrayLike<number>} data the record (filtered or not; any units)
   * @param {number} sampleRate of the record
   * @param {number} speedUp e.g. 100 (see allowedSpeedUps in audify.js)
   * @param {object} [opt]
   * @param {number} [opt.dataStartSec=0] time of data[0]
   * @param {number} [opt.fromSec] start of the part to play (default: start of data)
   * @param {number} [opt.toSec] end (default: end of data)
   * @param {(sec:number)=>void} [opt.onTime] every screen frame: the moment of the
   *   record being heard now (record time, not sound time)
   * @param {(info:{stopped:boolean})=>void} [opt.onEnd] once, when the sound ends
   *   or stop() is called
   * @returns {{durationSec:number, playbackRate:number, bufferRate:number, resampled:boolean}}
   * @throws {Error} with a message for students if the speed-up can't be played
   */
  play(data, sampleRate, speedUp, opt = {}) {
    this.stop();
    const { dataStartSec = 0, onTime = () => {}, onEnd = () => {} } = opt;
    const n = data.length;
    const index = (sec) => Math.max(0, Math.min(n, Math.round((sec - dataStartSec) * sampleRate)));
    const i0 = opt.fromSec == null ? 0 : index(opt.fromSec);
    const i1 = opt.toSec == null ? n : index(opt.toSec);
    if (i1 - i0 < 2) throw new Error('Choose a longer part of the record to play.');
    const fromSec = dataStartSec + i0 / sampleRate;
    const toSec = dataStartSec + i1 / sampleRate;
    // Checks the speed-up before any sound is set up.
    const { samples, playbackRate, durationSec } = audioSamples(data.slice(i0, i1), sampleRate, speedUp);

    if (!this.ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) throw new Error('This browser cannot play sound (no Web Audio).');
      this.ctx = new AC();
    }
    const ctx = this.ctx;
    if (ctx.state === 'suspended') ctx.resume(); // allowed: we are inside a click

    let buffer;
    let resampled = false;
    try {
      buffer = ctx.createBuffer(1, samples.length, playbackRate);
    } catch {
      buffer = this._bufferAtContextRate(samples, playbackRate);
      resampled = true;
    }
    if (!resampled) buffer.copyToChannel(samples, 0);

    const source = ctx.createBufferSource();
    source.buffer = buffer;
    const gain = ctx.createGain(); // lets stop() fade out instead of clicking
    source.connect(gain).connect(ctx.destination);
    const startAt = ctx.currentTime + 0.05; // a moment to get going
    source.start(startAt);

    const now = { source, gain, startAt, fromSec, toSec, speedUp, onTime, onEnd, done: false };
    this._now = now;
    source.onended = () => this._finish(now, false);
    const tick = () => {
      if (this._now !== now) return;
      const heard = Math.max(0, this._heardTime() - startAt); // seconds of sound so far
      onTime(Math.min(toSec, fromSec + heard * speedUp)); // 1 s of sound = speedUp s of record
      this._raf = requestAnimationFrame(tick);
    };
    this._raf = requestAnimationFrame(tick);
    return { durationSec, playbackRate, bufferRate: buffer.sampleRate, resampled };
  }

  /** Stop playing (with a very short fade so it doesn't click). */
  stop() {
    const now = this._now;
    if (!now) return;
    const t = this.ctx.currentTime;
    now.gain.gain.setTargetAtTime(0, t, 0.01);
    try { now.source.stop(t + 0.05); } catch { /* already stopped */ }
    this._finish(now, true);
  }

  /** Release the sound device (e.g. when leaving the page). */
  close() {
    this.stop();
    this.ctx?.close();
    this.ctx = null;
  }

  _finish(now, stopped) {
    if (now.done) return;
    now.done = true;
    now.source.onended = null;
    if (this._now === now) {
      this._now = null;
      cancelAnimationFrame(this._raf);
    }
    if (!stopped) now.onTime(now.toSec);
    now.onEnd({ stopped });
  }

  /**
   * The audio clock time of the sound coming out of the speakers right now.
   * ctx.currentTime runs ahead of what you hear by the output delay; at 100x,
   * a 50 ms delay would put the cursor 5 s of record ahead, so allow for it.
   */
  _heardTime() {
    const ctx = this.ctx;
    if (ctx.state === 'running' && ctx.getOutputTimestamp) {
      const ts = ctx.getOutputTimestamp();
      if (ts.performanceTime > 0) return ts.contextTime + (performance.now() - ts.performanceTime) / 1000;
    }
    return ctx.currentTime - (ctx.outputLatency || ctx.baseLatency || 0);
  }

  /** Fallback for browsers that refuse the rate: convert to the context's own rate. */
  _bufferAtContextRate(samples, fromRate) {
    const toRate = this.ctx.sampleRate;
    // Going down in rate: remove notes above the new Nyquist first, or they fold back.
    const clean = fromRate > toRate
      ? lowpassFIR(samples, fromRate, 0.45 * toRate, { transitionHz: 0.1 * toRate })
      : samples;
    const out = resampleLinear(clean, fromRate, toRate);
    const buffer = this.ctx.createBuffer(1, out.length, toRate);
    buffer.copyToChannel(out, 0);
    return buffer;
  }
}
