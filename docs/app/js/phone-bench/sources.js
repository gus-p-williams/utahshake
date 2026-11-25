// Phone Bench: where readings come from. A source is the real device (devicemotion events,
// the microphone through Web Audio) or a made-up phone (lib/bench.js) for testing the page on
// a computer and for the site check, which runs in headless Chrome with no motion sensor.
//
// Motion source:
//   kind                 'device' | 'android' | 'iphone'
//   hasPrompt            the browser has DeviceMotionEvent.requestPermission (iPhones, iPads)
//   requestPermission()  -> Promise<{asked, state, ms, error?}>. Call it straight from the click
//                        handler, before any await: iOS shows its prompt only during a tap.
//   start(onReading)     calls onReading({t, th, x, y, z}) for each reading; t = the event's own
//                        time stamp (ms), th = page time when it arrived (ms, performance.now()).
//                        Events without readings are counted in stats.empty.
//   stop()
//   now()                page time (ms) on the source's clock (made-up phones run faster)
//   stats                {events, empty, interval, hasAcceleration, hasRotation}
//
// Microphone source:
//   open()               -> Promise<{ms, settings, contextRate, worklet, state}>; call from the click handler
//   listen(onBlock)      onBlock({t, frames, rms, peak}) about 10 times a second
//   speed                1 for the device; a made-up microphone runs faster (Infinity: at once)
//   close()
// Audio is summed into those four numbers as it arrives (mic-worklet.js) and never kept.
import { makeTake, makeAudioBlocks } from '../lib/bench.js';

/** The real device: devicemotion events. */
export function deviceMotion() {
  const DME = window.DeviceMotionEvent;
  const stats = { events: 0, empty: 0, interval: null, hasAcceleration: false, hasRotation: false };
  let handler = null;
  return {
    kind: 'device',
    available: typeof DME === 'function',
    hasPrompt: typeof DME?.requestPermission === 'function',
    stats,
    now: () => performance.now(),
    requestPermission() {
      if (typeof DME?.requestPermission !== 'function') {
        return Promise.resolve({ asked: false, state: DME ? 'not needed' : 'no motion events in this browser', ms: 0 });
      }
      const t0 = performance.now();
      return DME.requestPermission().then(
        (state) => ({ asked: true, state, ms: performance.now() - t0 }),
        (e) => ({ asked: true, state: 'error', error: `${e.name}: ${e.message}`, ms: performance.now() - t0 }),
      );
    },
    start(onReading) {
      handler = (e) => {
        const th = performance.now();
        stats.events++;
        if (stats.interval === null && e.interval != null) stats.interval = e.interval;
        const a = e.accelerationIncludingGravity;
        if (e.acceleration && Number.isFinite(e.acceleration.x)) stats.hasAcceleration = true;
        if (e.rotationRate && Number.isFinite(e.rotationRate.alpha)) stats.hasRotation = true;
        if (!a || !Number.isFinite(a.x) || !Number.isFinite(a.y) || !Number.isFinite(a.z)) { stats.empty++; return; }
        onReading({ t: e.timeStamp, th, x: a.x, y: a.y, z: a.z });
      };
      window.addEventListener('devicemotion', handler);
    },
    stop() {
      if (handler) window.removeEventListener('devicemotion', handler);
      handler = null;
    },
  };
}

/**
 * A made-up phone ('android' or 'iphone', see SIM_PHONES in lib/bench.js) whose clock runs
 * `speed` times faster than real time (Infinity: the whole take at once). taps: [{t, peak}]
 * in ms from the start of the take. pauseAt (s): its clock stops that far into the take (for
 * screenshots of a given moment).
 */
export function simulatedMotion(phone, { speed = 10, seconds = 45, taps = [], pauseAt = Infinity } = {}) {
  const stats = { events: 0, empty: 0, interval: phone === 'iphone' ? 0.0166 : 16, hasAcceleration: true, hasRotation: true };
  const real0 = performance.now();
  let virtualEnd = 0;
  let t0 = 0;
  const now = () => (speed === Infinity ? virtualEnd : Math.min((performance.now() - real0) * speed, t0 + pauseAt * 1000));
  let timer = null;
  return {
    kind: phone,
    available: true,
    hasPrompt: phone === 'iphone',
    stats,
    now,
    requestPermission() {
      if (phone !== 'iphone') return Promise.resolve({ asked: false, state: 'not needed', ms: 0 });
      // An iPhone asks once; the made-up tester answers Allow after 1.5 s.
      const ms = 1500;
      return new Promise((ok) => setTimeout(() => ok({ asked: true, state: 'granted', ms }), speed === Infinity ? 0 : ms / speed));
    },
    start(onReading) {
      t0 = now();
      const take = makeTake({ phone, seconds, t0, taps });
      let i = 0;
      const deliver = () => {
        const t = now();
        while (i < take.length && take[i].t <= t) {
          stats.events++;
          onReading({ ...take[i], th: take[i].t });
          i++;
        }
      };
      if (speed === Infinity) {
        virtualEnd = t0 + seconds * 1000;
        deliver();
      } else {
        timer = setInterval(deliver, 25);
      }
    },
    stop() { clearInterval(timer); timer = null; },
  };
}

/** The real microphone, with the browser's voice processing turned off. */
export function deviceMic() {
  let ctx = null;
  let stream = null;
  let nodes = [];
  return {
    kind: 'device',
    speed: 1,
    available: !!navigator.mediaDevices?.getUserMedia && !!(window.AudioContext || window.webkitAudioContext),
    async open() {
      // Make the AudioContext inside the tap (iOS starts audio only then), then ask for the microphone.
      const AC = window.AudioContext || window.webkitAudioContext;
      ctx = new AC();
      ctx.resume?.();
      const t0 = performance.now();
      stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false }, video: false,
      });
      const ms = performance.now() - t0;
      const track = stream.getAudioTracks()[0];
      const s = track?.getSettings?.() ?? {};
      // Only these settings: no device ids or labels go into the results.
      const settings = {};
      for (const k of ['sampleRate', 'channelCount', 'echoCancellation', 'noiseSuppression', 'autoGainControl', 'latency']) {
        if (s[k] !== undefined) settings[k] = s[k];
      }
      // Safari can leave the context 'suspended' or 'interrupted' after the prompt: try once more
      // (without waiting forever), and report the state it ends in.
      if (ctx.state !== 'running') {
        await Promise.race([ctx.resume().catch(() => {}), new Promise((ok) => setTimeout(ok, 1000))]);
      }
      return { ms, settings, contextRate: ctx.sampleRate, worklet: !!ctx.audioWorklet, state: ctx.state };
    },
    async listen(onBlock) {
      const src = ctx.createMediaStreamSource(stream);
      const mute = ctx.createGain();
      mute.gain.value = 0; // nothing is played back
      const every = Math.round(ctx.sampleRate / 10);
      let meter;
      if (ctx.audioWorklet) {
        await ctx.audioWorklet.addModule(new URL('./mic-worklet.js', import.meta.url));
        meter = new AudioWorkletNode(ctx, 'bench-meter', { processorOptions: { every } });
        meter.port.onmessage = (e) => onBlock({ t: performance.now(), ...e.data });
      } else {
        // Older browsers (iOS before 14.5): the deprecated ScriptProcessorNode, same sums.
        meter = ctx.createScriptProcessor(4096, 1, 1);
        meter.onaudioprocess = (e) => {
          const ch = e.inputBuffer.getChannelData(0);
          let sumSq = 0;
          let peak = 0;
          for (const v of ch) { sumSq += v * v; peak = Math.max(peak, Math.abs(v)); }
          onBlock({ t: performance.now(), frames: ch.length, rms: Math.sqrt(sumSq / ch.length), peak });
        };
      }
      src.connect(meter);
      meter.connect(mute);
      mute.connect(ctx.destination);
      nodes = [src, meter, mute];
    },
    async close() {
      for (const n of nodes) { try { n.disconnect(); } catch { /* already gone */ } }
      nodes = [];
      stream?.getTracks().forEach((t) => t.stop());
      stream = null;
      if (ctx && ctx.state !== 'closed') await ctx.close();
      ctx = null;
    },
  };
}

/** A made-up microphone: 48,000 samples a second, a clap 2 s in; `speed` as simulatedMotion. */
export function simulatedMic(phone, { speed = 10 } = {}) {
  let timer = null;
  return {
    kind: phone,
    speed,
    available: true,
    async open() {
      const settings = phone === 'iphone'
        ? { sampleRate: 48000, channelCount: 1, echoCancellation: false }
        : { sampleRate: 48000, channelCount: 1, echoCancellation: false, noiseSuppression: false, autoGainControl: false };
      if (speed !== Infinity) await new Promise((ok) => setTimeout(ok, 1200 / speed));
      return { ms: 1200, settings, contextRate: 48000, worklet: true, state: 'running' };
    },
    async listen(onBlock) {
      const blocks = makeAudioBlocks({ rate: 48000, seconds: 5.2 });
      if (speed === Infinity) { blocks.forEach(onBlock); return; }
      const real0 = performance.now();
      let i = 0;
      timer = setInterval(() => {
        const t = (performance.now() - real0) * speed;
        while (i < blocks.length && blocks[i].t <= t) onBlock(blocks[i++]);
      }, 20);
    },
    async close() { clearInterval(timer); timer = null; },
  };
}

