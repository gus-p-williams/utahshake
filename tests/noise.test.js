// Noise spectra: Peterson's reference curves, instrument response from StationXML, and the
// PSD / PPSD steps, on synthetic signals and hand-checked values.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { NLNM, NHNM, modelDb, modelDbAtFreq, accelToVelocityDb } from '../docs/app/js/lib/noise-models.js';
import { parseResponse, responseAmplitude } from '../docs/app/js/lib/response.js';
import {
  welchPsd, octaveFreqs, octaveAverage, accelSpectrumDb, ppsdHistogram, ppsdPercentile,
} from '../docs/app/js/lib/psd.js';

const close = (a, b, tol, msg) => assert.ok(Math.abs(a - b) <= tol, `${msg ?? ''} ${a} vs ${b} (±${tol})`);

function rng(seed = 1) {
  let s = seed >>> 0;
  return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 2 ** 32 - 0.5; };
}
/** Gaussian-ish white noise with unit variance (sum of 12 uniforms). */
function whiteNoise(n, seed = 3) {
  const r = rng(seed);
  return Float64Array.from({ length: n }, () => { let s = 0; for (let k = 0; k < 12; k++) s += r(); return s; });
}

test('Peterson models: table values from OFR 93-322', () => {
  assert.equal(NLNM.length, 22); // 21 segments + the end of the range
  assert.equal(NHNM.length, 12); // 11 segments
  close(modelDb(NLNM, 0.1), -162.36 - 5.64, 1e-9, 'NLNM at 0.1 s');
  close(modelDb(NLNM, 50), -187.5, 1e-9, 'NLNM flat 45–70 s');
  close(modelDb(NHNM, 1), -116.85, 1e-9, 'NHNM at 1 s (A, log 1 = 0)');
  close(modelDbAtFreq(NLNM, 0.2), -141.1, 0.01, 'NLNM at 5 s (the microseism peak)');
  assert.ok(Number.isNaN(modelDb(NLNM, 0.05)), 'no model above 10 Hz');
  assert.ok(Number.isNaN(modelDb(NHNM, 2e5)), 'no model beyond 100,000 s');
  close(modelDb(NLNM, 100000), -346.88 + 48.75 * 5, 1e-9, 'the range end is included');
});

test('Peterson models: the line segments join up, and NHNM stays above NLNM', () => {
  for (const model of [NLNM, NHNM]) {
    for (let i = 1; i < model.length - 1; i++) {
      const p = model[i][0];
      const before = model[i - 1][1] + model[i - 1][2] * Math.log10(p);
      close(modelDb(model, p), before, 0.6, `join at ${p} s`);
    }
  }
  for (let lp = -1; lp <= 5; lp += 0.05) {
    const p = 10 ** lp;
    assert.ok(modelDb(NHNM, p) > modelDb(NLNM, p), `NHNM above NLNM at ${p.toFixed(2)} s`);
  }
});

test('acceleration dB to velocity dB divides by (2πf)²', () => {
  // at f = 1/(2π) Hz the two are equal
  close(accelToVelocityDb(-150, 1 / (2 * Math.PI)), -150, 1e-9);
  close(accelToVelocityDb(-150, 10 / (2 * Math.PI)), -170, 1e-9);
});

// A 1 Hz geophone (natural frequency 1 Hz, damping 0.7) behind a flat digitizer, in the
// StationXML layout EarthScope returns (namespaces and attributes trimmed).
const geophoneXml = (type = 'LAPLACE (RADIANS/SECOND)', scale = 1) => {
  const w0 = 2 * Math.PI * 1 * scale;
  const re = -0.7 * w0;
  const im = w0 * Math.sqrt(1 - 0.49);
  return `<?xml version="1.0"?><FDSNStationXML><Network code="XX"><Station code="TEST"><Channel code="EHZ" locationCode="00">
  <Response><InstrumentSensitivity><Value>1.0E9</Value><Frequency>10.0</Frequency>
  <InputUnits><Name>m/s</Name><Description>Velocity</Description></InputUnits><OutputUnits><Name>count</Name></OutputUnits></InstrumentSensitivity>
  <Stage number="1"><PolesZeros><InputUnits><Name>m/s</Name></InputUnits><OutputUnits><Name>V</Name></OutputUnits>
  <PzTransferFunctionType>${type}</PzTransferFunctionType><NormalizationFactor>1.0</NormalizationFactor><NormalizationFrequency>10.0</NormalizationFrequency>
  <Zero number="0"><Real minusError="0">0.0</Real><Imaginary>0.0</Imaginary></Zero>
  <Zero number="1"><Real>0.0</Real><Imaginary>0.0</Imaginary></Zero>
  <Pole number="0"><Real>${re}</Real><Imaginary>${-im}</Imaginary></Pole>
  <Pole number="1"><Real>${re}</Real><Imaginary>${im}</Imaginary></Pole>
  </PolesZeros><StageGain><Value>100</Value><Frequency>10</Frequency></StageGain></Stage>
  <Stage number="2"><Coefficients><CfTransferFunctionType>DIGITAL</CfTransferFunctionType><Numerator>1</Numerator></Coefficients></Stage>
  </Response></Channel></Station></Network></FDSNStationXML>`;
};

test('response: a 1 Hz geophone is flat above 1 Hz and falls as f² below it', () => {
  const r = parseResponse(geophoneXml());
  assert.equal(r.sensitivity, 1e9);
  assert.equal(r.sensitivityFreq, 10);
  assert.equal(r.inputUnits, 'm/s');
  assert.equal(r.stages.length, 1);
  assert.equal(r.stages[0].zeros.length, 2);
  assert.equal(r.stages[0].poles.length, 2);
  close(responseAmplitude(r, 10), 1e9, 1, 'equals the sensitivity at its frequency');
  close(responseAmplitude(r, 30) / 1e9, 1, 0.01, 'flat well above 1 Hz');
  // second-order high-pass with damping 0.7: |H(f0)| = 1 / (2·0.7) of the flat level
  close(responseAmplitude(r, 1) / responseAmplitude(r, 100), 1 / 1.4, 0.002, 'at the natural frequency');
  // 10× lower frequency, 100× smaller output, far below the corner
  close(responseAmplitude(r, 0.01) / responseAmplitude(r, 0.1), 0.01, 0.0005, 'f² below the corner');
});

test('response: poles and zeros in hertz give the same curve', () => {
  const rad = parseResponse(geophoneXml());
  const hz = parseResponse(geophoneXml('LAPLACE (HERTZ)', 1 / (2 * Math.PI)));
  assert.equal(hz.stages[0].hertz, true);
  for (const f of [0.05, 0.5, 1, 3, 20]) close(responseAmplitude(hz, f) / responseAmplitude(rad, f), 1, 1e-9, `at ${f} Hz`);
});

test('response: refuses a document with several channels', () => {
  const two = geophoneXml().replace('</Station>', '<Channel code="EHN"></Channel></Station>');
  assert.throws(() => parseResponse(two), /one channel/);
});

test('welchPsd: white noise of variance 1 has a flat PSD of 2/sampleRate', () => {
  const sr = 100;
  const { freqs, psd, segments } = welchPsd(whiteNoise(2 ** 16), sr, 1024);
  assert.equal(segments, 127);
  assert.equal(freqs[1], sr / 1024);
  // average over the inner band (the ends hold the trend removal and the Nyquist bin)
  let s = 0, n = 0;
  for (let k = 20; k < 500; k++) { s += psd[k]; n++; }
  close(s / n, 2 / sr, 0.02 * (2 / sr), 'flat level');
});

test('welchPsd: a sine of amplitude A carries power A²/2', () => {
  const sr = 100, f0 = 6.25, A = 3; // f0 on a bin: 6.25 = 64 · 100/1024
  const x = Float64Array.from({ length: 8192 }, (_, i) => A * Math.sin((2 * Math.PI * f0 * i) / sr));
  const { freqs, psd } = welchPsd(x, sr, 1024);
  const df = freqs[1];
  let total = 0;
  for (let k = 0; k < psd.length; k++) total += psd[k] * df;
  close(total, (A * A) / 2, 0.01 * (A * A) / 2, 'Parseval');
  const peak = psd.indexOf(Math.max(...psd));
  close(freqs[peak], f0, 1e-9, 'peak at the sine');
});

test('welchPsd: skips pieces with missing samples', () => {
  const x = whiteNoise(4096);
  x[100] = NaN; // spoils the pieces that cover sample 100
  const { segments } = welchPsd(x, 100, 512);
  assert.equal(segments, 15 - 1); // 15 half-overlapping pieces; only samples 0–511 hold the gap
});

test('octaveFreqs: 8 per octave, lined up on 1 Hz', () => {
  const f = octaveFreqs(0.25, 4);
  assert.equal(f.length, 4 * 8 + 1);
  close(f[0], 0.25, 1e-12);
  close(f[16], 1, 1e-12);
  close(f.at(-1), 4, 1e-12);
  close(f[1] / f[0], 2 ** (1 / 8), 1e-12);
});

test('octaveAverage: averages power across one octave', () => {
  const freqs = [0.5, 0.75, 1, 1.25, 1.5, 3];
  const vals = [2, 4, 6, 8, 10, 100];
  // 1 Hz ± half an octave = 0.707–1.414 Hz: 0.75, 1, 1.25
  assert.deepEqual(octaveAverage(freqs, vals, [1]), [6]);
  assert.ok(Number.isNaN(octaveAverage(freqs, vals, [20])[0]));
});

test('accelSpectrumDb: a flat 1 count per (m/s) response turns velocity into acceleration', () => {
  const sr = 100;
  const x = whiteNoise(2 ** 17, 9); // velocity, white: (m/s)²/Hz = 2/sr
  const centers = [1, 4];
  const db = accelSpectrumDb(x, sr, () => 1, centers, { nfft: 4096 });
  // exactly: Welch, times (2πf)², averaged over the octave
  const { freqs, psd } = welchPsd(x, sr, 4096);
  const acc = Array.from(psd, (p, k) => (k ? p * (2 * Math.PI * freqs[k]) ** 2 : NaN));
  octaveAverage(freqs, acc, centers).forEach((p, j) => close(db[j], 10 * Math.log10(p), 1e-9, 'same steps'));
  // and about right: the octave average of (2/sr)·(2πf)² over f/√2..f√2 is (2/sr)(2π)² · mean of f²
  for (const [j, fc] of centers.entries()) {
    const meanF2 = (fc ** 2) * ((2 ** 1.5 - 2 ** -1.5) / 3) / (2 ** 0.5 - 2 ** -0.5);
    close(db[j], 10 * Math.log10((2 / sr) * (2 * Math.PI) ** 2 * meanF2), 0.5, `at ${fc} Hz`);
  }
  assert.equal(accelSpectrumDb(new Float64Array(5000).fill(NaN), sr, () => 1, centers), null);
});

test('ppsdHistogram and ppsdPercentile', () => {
  const spectra = [[-140, -120], [-141, -121], null, [-139.5, -100], [-150, -119]];
  const h = ppsdHistogram(spectra, { minDb: -160, maxDb: -90, stepDb: 1 });
  assert.equal(h.total, 4);
  assert.equal(h.counts.length, 2);
  assert.equal(h.counts[0].reduce((a, b) => a + b, 0), 4);
  assert.equal(h.counts[0][20], 2); // -140 and -139.5 → bin 20 (−140 to −139)
  assert.equal(h.counts[0][19], 1); // -141
  // median of column 0 (-150, -141, -140, -139.5): the 2nd of 4 is in the -141 bin
  assert.deepEqual(ppsdPercentile(h, 0.5), [-140.5, -119.5]);
  assert.deepEqual(ppsdPercentile(h, 1), [-139.5, -99.5]);
});
