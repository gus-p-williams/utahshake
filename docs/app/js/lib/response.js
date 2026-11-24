// How a station turns ground motion into counts, at every frequency (its "response").
//
// units.js divides by one number, the sensitivity, which is right only in the sensor's
// flat band. To compare noise across frequencies (a noise spectrum, the PPSD), or a cheap
// sensor with a professional one, we need the response at each frequency. The station's
// metadata (FDSN StationXML) describes it as "poles and zeros": a few complex numbers that
// fix the shape of the curve. A 1 Hz geophone, for example, has two zeros at 0 and two poles
// near 1 Hz, so below 1 Hz its output falls by 100 for every 10× lower frequency.
//
// This reads the instrument sensitivity and every PolesZeros stage, and multiplies their
// shapes. Digital (FIR) stages are left out: they are flat until close to the Nyquist
// frequency (half the sample rate), so the result is good up to about 80% of it.
// Pure functions on strings and numbers (a small regex reader, no DOMParser), so it runs in
// the browser and in node --test.

const num = (block, tag) => {
  const m = new RegExp(`<${tag}(?:\\s[^>]*)?>\\s*([^<]*?)\\s*</${tag}>`).exec(block);
  return m ? Number(m[1]) : NaN;
};
const text = (block, tag) => {
  const m = new RegExp(`<${tag}(?:\\s[^>]*)?>\\s*([^<]*?)\\s*</${tag}>`).exec(block);
  return m ? m[1] : '';
};

/**
 * Read the response of ONE channel epoch from a StationXML document (as returned by
 * fdsnws/station with level=response for a single channel and time span).
 * @param {string} xml
 * @returns {{sensitivity:number, sensitivityFreq:number, inputUnits:string,
 *   stages: {hertz:boolean, normFactor:number, zeros:number[][], poles:number[][]}[]}}
 */
export function parseResponse(xml) {
  const channels = xml.match(/<Channel[\s>]/g) || [];
  if (channels.length !== 1) throw new Error(`parseResponse: expected one channel, found ${channels.length}`);
  const sensBlock = /<InstrumentSensitivity>([\s\S]*?)<\/InstrumentSensitivity>/.exec(xml);
  if (!sensBlock) throw new Error('parseResponse: no InstrumentSensitivity');
  const s = sensBlock[1];
  const inputUnits = text(/<InputUnits>([\s\S]*?)<\/InputUnits>/.exec(s)?.[1] || '', 'Name');
  const stages = [...xml.matchAll(/<PolesZeros[\s>][\s\S]*?<\/PolesZeros>/g)].map(([b]) => {
    const complex = (tag) => [...b.matchAll(new RegExp(`<${tag}[\\s>][\\s\\S]*?</${tag}>`, 'g'))]
      .map(([z]) => [num(z, 'Real'), num(z, 'Imaginary')]);
    return {
      hertz: /LAPLACE \(HERTZ\)/i.test(text(b, 'PzTransferFunctionType')),
      normFactor: num(b, 'NormalizationFactor'),
      zeros: complex('Zero'),
      poles: complex('Pole'),
    };
  });
  return { sensitivity: num(s, 'Value'), sensitivityFreq: num(s, 'Frequency'), inputUnits, stages };
}

/** |Π(s − zero) / Π(s − pole)| for all stages at frequency f (s = iω), without gains. */
function shape(stages, f) {
  let m = 1;
  for (const st of stages) {
    const w = st.hertz ? f : 2 * Math.PI * f;
    for (const [re, im] of st.zeros) m *= Math.hypot(re, w - im);
    for (const [re, im] of st.poles) m /= Math.hypot(re, w - im);
  }
  return m;
}

/**
 * Size of the response at frequency f: counts per unit of the input (for a velocity
 * sensor, counts per m/s). Scaled so that it equals the stated sensitivity at the
 * sensitivity's frequency.
 * @param {ReturnType<typeof parseResponse>} resp
 * @param {number} freqHz
 */
export function responseAmplitude(resp, freqHz) {
  return (resp.sensitivity * shape(resp.stages, freqHz)) / shape(resp.stages, resp.sensitivityFreq);
}
