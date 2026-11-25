// Phone Bench: the microphone meter, run on the browser's audio thread (AudioWorklet).
// It keeps no sound: each 128-sample block is folded into three numbers (sample count, sum of
// squares, loudest sample), and every `every` samples (about 0.1 s) it posts
// {frames, rms, peak} to the page and starts again. Loaded by sources.js (deviceMic).
class BenchMeter extends AudioWorkletProcessor {
  constructor(options) {
    super();
    this.every = options?.processorOptions?.every || 4800;
    this.reset();
  }

  reset() {
    this.frames = 0;
    this.sumSq = 0;
    this.peak = 0;
  }

  process(inputs) {
    const ch = inputs[0]?.[0];
    if (ch) {
      for (let i = 0; i < ch.length; i++) {
        const v = ch[i];
        this.sumSq += v * v;
        const a = v < 0 ? -v : v;
        if (a > this.peak) this.peak = a;
      }
      this.frames += ch.length;
      if (this.frames >= this.every) {
        this.port.postMessage({ frames: this.frames, rms: Math.sqrt(this.sumSq / this.frames), peak: this.peak });
        this.reset();
      }
    }
    return true;
  }
}

registerProcessor('bench-meter', BenchMeter);
