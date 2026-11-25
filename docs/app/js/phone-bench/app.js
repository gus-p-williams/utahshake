// Phone Bench page controller (docs/app/phone-bench/): trial T1 of the phone activities
// (planning/review-phone-recorder.md, sections 2.5 and 5.1). On the device it is opened on, it
// measures what the browser really delivers from the motion sensor (readings per second,
// jitter, dropped readings, rounding step, noise at rest, taps, the permission prompt) and,
// if the tester allows it, the microphone (sample rates, voice processing, levels).
//
// Nothing leaves the device: readings live in this page's memory, audio is folded into a few
// numbers as it arrives (mic-worklet.js), and the only outputs are the results on screen, a
// text the tester copies or shares, and a CSV file saved on the device.
//
// The take: 3 s hands off (settle), REST s at rest (noise, step, resting values), TAP s of
// taps on the table. What to do is shown on the plot itself (D35) and in the status line.
//
// Page address options (docs/developers/phone-bench.md):
//   ?simulate=android | ?simulate=iphone   a made-up phone, 10 times faster than real time
//   ?source=sample                         the made-up Android phone, whole take at once, and
//                                          the made-up microphone (the site check uses this)
//   ?rest=30&tap=10                        seconds at rest and for the taps
//   ?pause=12                              (made-up phone only) its clock stops 12 s into the take
import { esc, csvRow, downloadCsv } from '../ui/page.js';
import { timing, stepReport, repeats, flicker, detectTaps, tapRule, audioRate, dbfs, quantile } from '../lib/bench.js';
import { deviceMotion, simulatedMotion, deviceMic, simulatedMic } from './sources.js';

const params = new URLSearchParams(location.search);
const SAMPLE = params.get('source') === 'sample';
const SIM = SAMPLE ? 'android' : params.has('simulate') ? (params.get('simulate') === 'iphone' ? 'iphone' : 'android') : null;
const SPEED = SAMPLE ? Infinity : 10;
const seconds = (name, dflt, lo, hi) => {
  const v = Number(params.get(name));
  return params.has(name) && Number.isFinite(v) ? Math.min(hi, Math.max(lo, v)) : dflt;
};
const SETTLE = 3;
const REST = seconds('rest', 30, 5, 600);
const TAP = seconds('tap', 10, 3, 120);
const TOTAL = SETTLE + REST + TAP;
const MIC_SECONDS = 5;
const NO_READINGS_S = 3;
const PLOT_WINDOW_MS = 5000;
// The made-up tester's taps: seconds after the taps phase starts, and how hard (m/s²).
const SIM_TAPS = [[1.5, 0.9], [3, 0.5], [4.5, 0.35], [6, 0.7], [7.5, 0.25]];

const $ = (id) => document.getElementById(id);
const el = {
  cue: $('cue'), status: $('motion-status'), clock: $('take-clock'), progress: $('progress'), plot: $('plot'),
  start: $('start'), stop: $('stop'), results: $('motion-results'),
  micStart: $('mic-start'), micStatus: $('mic-status'), meter: $('meter'), micResults: $('mic-results'),
  copy: $('copy'), share: $('share'), csv: $('csv'), sendStatus: $('send-status'), copyBox: $('copy-box'),
  log: $('log'), simBadge: $('sim-badge'), motionCard: $('motion-card'), warning: $('motion-warning'),
};

const state = {
  running: false, source: null, start: 0, readings: [], phase: 'idle', timer: null, mic: null,
  perm: null, permApi: null, wake: 'not asked', wakeLock: null, hidden: 0, takenAt: null,
  rule: null, liveTaps: 0, finish: null,
  motionRows: null, micRows: null, micRunning: false,
};

// ---- Log (no Safari debugger on Windows, so the page keeps its own) -------------------------
function log(msg) {
  const li = document.createElement('li');
  li.textContent = `${(performance.now() / 1000).toFixed(1)} s  ${msg}`;
  el.log.append(li);
}
window.addEventListener('error', (e) => log(`Error: ${e.message}`));
window.addEventListener('unhandledrejection', (e) => log(`Error: ${e.reason?.message ?? e.reason}`));

// ---- Formatting --------------------------------------------------------------------------------
const f = (v, d = 2) => (Number.isFinite(v) ? v.toFixed(d) : '—');
const int = (v) => (Number.isFinite(v) ? Math.round(v).toLocaleString('en-US') : '—');
const sec = (ms) => `${(ms / 1000).toFixed(1)} s`;
const stepText = (s) => (s >= 0.01 ? s.toFixed(3) : s >= 0.0001 ? s.toFixed(5) : s.toExponential(1));
const db = (x) => (x > 0 ? `${dbfs(x).toFixed(0)} dBFS` : 'silence');
const onOff = (v) => (v === true ? 'on' : v === false ? 'off' : 'not reported');

/** The cue on the plot (D35): `kind` 'do' (bold), 'learned' (faint) or 'problem'. */
function cue(text, kind = 'do') {
  el.cue.textContent = text;
  el.cue.className = `pb-cue${kind === 'learned' ? ' learned' : kind === 'problem' ? ' problem' : ''}${text.length < 46 ? ' big' : ''}`;
}
const say = (text) => { el.status.textContent = text; };

// ---- Sources -----------------------------------------------------------------------------------
function motionSource() {
  if (!SIM) return deviceMotion();
  const taps = SIM_TAPS.map(([s, peak]) => ({ t: (SETTLE + REST + s) * 1000, peak }));
  const pauseAt = Number(params.get('pause')) || Infinity;
  return simulatedMotion(SIM, { speed: SPEED, seconds: TOTAL, taps, pauseAt });
}
const micSource = () => (SIM ? simulatedMic(SIM, { speed: SPEED }) : deviceMic());

// ---- The take ---------------------------------------------------------------------------------
const phaseAt = (s) => (s < SETTLE ? 'settle' : s < SETTLE + REST ? 'rest' : s < TOTAL ? 'tap' : 'end');

function onReading(r) {
  const s = (r.th - state.start) / 1000;
  const phase = phaseAt(s);
  if (phase === 'end' || !state.running) return;
  state.readings.push({ ...r, phase });
}

const AUTO_LOCK = 'The screen may lock during the test, which stops the readings. Before you press Start, set '
  + 'Auto-Lock to 2 minutes or more (iPhone: Settings › Display & Brightness › Auto-Lock; Android: Settings › Display › Screen timeout).';

/** Keep the screen on during the take (Screen Wake Lock API); warn on screen if it can't. */
async function keepAwake() {
  if (!('wakeLock' in navigator)) { state.wake = 'no: this browser cannot keep the screen on'; return; }
  try {
    const lock = await navigator.wakeLock.request('screen');
    if (!state.running) { lock.release().catch(() => {}); return; }
    state.wakeLock = lock;
    state.wake = 'yes';
    log('Screen wake lock on');
    lock.addEventListener('release', () => log('Screen wake lock released'));
  } catch (e) {
    state.wake = `no: refused (${e.name})`;
    log(`Screen wake lock refused: ${e.name}`);
    if (state.running) { el.warning.textContent = AUTO_LOCK; el.warning.hidden = false; }
  }
}

document.addEventListener('visibilitychange', () => {
  if (!state.running) return;
  if (document.hidden) {
    state.hidden++;
    log(`Page hidden ${f((state.source.now() - state.start) / 1000, 1)} s into the take`);
  } else {
    log('Page visible again');
    keepAwake();
  }
});
window.addEventListener('pagehide', () => {
  if (state.running) finishTake('page closed');
  state.mic?.close().catch(() => {}); // the microphone goes off with the page
});

/** Start: ask for motion permission inside the tap (iOS needs that), then record. */
el.start.addEventListener('click', () => {
  if (state.running) return;
  const source = motionSource();
  const perm = source.requestPermission(); // no await before this line: iOS asks only during a tap
  // No scrolling during the take (iPhones pause motion events while a page scrolls), so
  // scroll now: the card's top at the top of the screen.
  if (!SAMPLE) el.motionCard.scrollIntoView({ block: 'start' });
  runTake(source, perm);
});
el.stop.addEventListener('click', () => finishTake('stopped early'));

async function runTake(source, permPromise) {
  Object.assign(state, { source, readings: [], hidden: 0, rule: null, liveTaps: 0, motionRows: null, phase: 'asking' });
  enableSend();
  el.start.disabled = true;
  el.results.hidden = true;
  if (source.hasPrompt) cue('Tap Allow to let this page read motion');
  say(source.hasPrompt ? 'Asking for permission to read motion: tap Allow.' : 'Starting…');
  log(`Start pressed (${SIM ? `simulated ${SIM}` : 'this device'}; prompt API: ${source.hasPrompt ? 'yes' : 'no'})`);

  state.perm = await permPromise;
  log(`Motion permission: ${state.perm.asked ? `asked, answered "${state.perm.state}" after ${Math.round(state.perm.ms)} ms` : state.perm.state}`);
  state.permApi = null;
  try {
    if (!SIM && navigator.permissions) state.permApi = (await navigator.permissions.query({ name: 'accelerometer' })).state;
  } catch { /* Safari and Firefox don't know this name */ }
  if (state.permApi) log(`Browser's accelerometer permission: ${state.permApi}`);

  if (state.perm.asked && state.perm.state !== 'granted') {
    cue('Motion was not allowed', 'problem');
    say(state.perm.state === 'denied'
      ? 'Motion was not allowed. On an iPhone or iPad: quit Safari (swipe it away in the app switcher), open this page again, press Start and tap Allow.'
      : `Could not ask for motion permission (${state.perm.error ?? state.perm.state}). Is this the https address of the site?`);
    el.start.disabled = false;
    state.phase = 'idle';
    state.finish?.();
    return;
  }

  if (SIM) state.wake = 'not tried: simulated phone';
  else { state.wake = 'asking…'; keepAwake(); }
  state.takenAt = new Date();
  state.start = source.now();
  state.running = true;
  state.phase = 'settle';
  el.stop.hidden = false;
  const done = new Promise((ok) => { state.finish = ok; });
  source.start(onReading);
  state.timer = setInterval(tick, 100);
  tick();
  return done;
}

function tick() {
  if (!state.running) return;
  const s = (state.source.now() - state.start) / 1000;
  el.progress.style.width = `${Math.min(100, (100 * s) / TOTAL)}%`;
  el.clock.textContent = `${Math.min(TOTAL, Math.floor(s))} of ${TOTAL} s`;

  if (!state.readings.length && s > NO_READINGS_S) {
    const { events, empty } = state.source.stats;
    log(`No readings after ${NO_READINGS_S} s (events ${events}, empty ${empty})`);
    finishTake(events && events === empty ? 'empty' : 'none');
    return;
  }
  const phase = phaseAt(s);
  if (phase !== state.phase) {
    if (phase === 'tap' || phase === 'end') restLevel();
    state.phase = phase;
    if (phase === 'rest') say(`Measuring at rest: don't touch the phone or the table for ${REST} seconds.`);
    if (phase === 'tap') say('Now tap the table beside the phone with a finger, 5 times, about once a second.');
  }
  if (phase === 'settle') cue(`Hands off · starting in ${Math.ceil(SETTLE - s)}`);
  if (phase === 'rest') cue(`Don't touch the phone or the table · ${Math.ceil(SETTLE + REST - s)} s`);
  if (phase === 'tap') {
    state.liveTaps = tapsIn(state.readings).length;
    cue(`Tap the table beside the phone, 5 times · seen ${state.liveTaps} · ${Math.ceil(TOTAL - s)} s`);
  }
  if (phase === 'end') finishTake('done');
  else draw();
}

/** Resting value, noise and the tap rule (lib/bench.js tapRule), from the readings at rest. */
function restLevel() {
  let rest = state.readings.filter((r) => r.phase === 'rest');
  if (rest.length < 30) rest = state.readings.filter((r) => r.phase !== 'tap');
  state.restSeconds = rest.length > 1 ? (rest[rest.length - 1].th - rest[0].th) / 1000 : 0;
  state.rule = tapRule(rest);
}
/** Taps in the taps phase, grouped by arrival time (always usable, unlike some event stamps). */
const tapsIn = (readings) => (state.rule
  ? detectTaps(readings.filter((r) => r.phase === 'tap').map((r) => ({ ...r, t: r.th })), state.rule.mean, state.rule) : []);

function finishTake(why) {
  if (!state.running) return;
  state.running = false;
  state.source.stop();
  clearInterval(state.timer);
  state.wakeLock?.release().catch(() => {});
  state.wakeLock = null;
  el.stop.hidden = true;
  el.start.disabled = false;
  el.start.textContent = 'Run again';
  log(`Take ended: ${why}; ${state.readings.length} readings`);

  if (why === 'none' || why === 'empty' || state.readings.length < 30) {
    state.phase = 'idle';
    cue('No motion readings', 'problem');
    say(why === 'empty'
      ? 'The browser sent motion events with no readings: this device has no motion sensor, or the browser blocks it.'
      : why === 'none'
        ? (state.permApi === 'denied'
          ? "Chrome blocks motion sensors for this site. Tap the icon left of the address, open Permissions or Site settings, allow Motion sensors, and press Run again."
          : "No motion readings arrived. Most laptops and Chromebooks have no motion sensor. On Android, check Chrome's site settings for this site: Motion sensors must be allowed.")
        : 'Too few readings to measure. Press Run again and keep the page open for the whole take.');
    draw();
    enableSend();
    state.finish?.();
    return;
  }
  if (!state.rule) restLevel();
  state.phase = 'done';
  state.motionRows = motionResults();
  showRows(el.results, state.motionRows);
  el.progress.style.width = '100%';
  cue(why === 'done' ? 'Done · the results are below' : 'Stopped · the results are below', 'learned');
  say(`Done: ${state.readings.length.toLocaleString('en-US')} readings. The results are below; step 3 sends them.`);
  enableSend();
  draw();
  if (!SAMPLE) el.results.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  state.finish?.();
}

// ---- Motion results ----------------------------------------------------------------------------
/** Rows of the motion results: {label, value, note, cls?}. */
function motionResults() {
  const rd = state.readings;
  // Time stamps: the events' own, unless the browser leaves them flat (then arrival times).
  let clock = "the events' own time stamps";
  let tm = timing(rd.map((r) => r.t));
  if (!(tm.rate > 0) || tm.nonPositive > rd.length / 2) {
    clock = 'arrival times (the events carried no usable time stamps)';
    tm = timing(rd.map((r) => r.th));
  }
  const steps = stepReport(rd);
  const n = state.rule.noise;
  const m = state.rule.mean;
  const g = Math.hypot(m.x, m.y, m.z);
  const taps = tapsIn(rd);
  const rows = [];
  if (SIM) rows.push({ label: 'Simulated phone', value: `Yes: made-up readings (${SIM})`, note: 'Not a measurement of this device.', cls: 'sim' });
  rows.push({ label: 'Taken', value: state.takenAt.toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' }) });
  rows.push({ label: 'Readings per second', value: f(tm.rate, 1),
    note: `${int(tm.n)} readings in ${f(tm.seconds, 1)} s. Expected: about 60.` });
  rows.push({ label: 'Timing jitter', value: `${f(tm.jitter, 2)} ms`,
    note: `How much the time between readings wobbles (standard deviation). Middle 98%: ${f(tm.p01Gap, 1)} to ${f(tm.p99Gap, 1)} ms; median ${f(tm.medianGap, 1)} ms. Clock: ${clock}.${tm.wholeMs
      ? ' The time stamps come in whole milliseconds, which alone makes about 0.5 ms of jitter.' : ''}` });
  rows.push({ label: 'Dropped readings', value: tm.dropped ? `${tm.dropped} gaps (about ${tm.missing} readings missing)` : 'None',
    note: `Longest gap ${f(tm.maxGap, 1)} ms.${tm.nonPositive ? ` ${tm.nonPositive} readings had the same time stamp as the one before.` : ''}` });
  let rounding;
  if (steps.rounded && steps.changed) {
    rounding = ['Yes: every reading is a whole multiple of 0.1 m/s²', `As Chrome does. Smallest change seen: ${stepText(steps.minSpacing)} m/s².`];
  } else if (steps.rounded) {
    rounding = ['Probably: every reading sits on a multiple of 0.1 m/s²', 'The readings never changed, so the step itself was not seen. Tap a little harder next time.'];
  } else if (steps.step !== null) {
    rounding = [`No: the readings move in steps of ${stepText(steps.step)} m/s²`, "Finer than Chrome's 0.1 m/s² rounding."];
  } else if (steps.changed) {
    rounding = ['No: no fixed step', `The readings vary smoothly: two differed by as little as ${stepText(steps.minSpacing)} m/s², far finer than Chrome's 0.1 m/s².`];
  } else {
    rounding = ['No (the readings never changed)', 'The values are not multiples of 0.1 m/s².'];
  }
  rows.push({ label: 'Rounding step', value: rounding[0], note: rounding[1] });
  const still = [n.x, n.y, n.z].every((a) => a.rms === 0);
  rows.push({ label: 'Noise at rest', value: `x ${f(n.x.rms, 4)} · y ${f(n.y.rms, 4)} · z ${f(n.z.rms, 4)} m/s²`,
    note: still
      ? `The readings never changed while the phone lay still (${f(state.restSeconds, 0)} s): rounding hides the phone's own noise.`
      : `Root mean square about the resting value, over ${f(state.restSeconds, 0)} s at rest.${steps.rounded
        ? " On a phone that rounds, this is mostly an axis flickering between two steps (its resting value sits near the edge of a step), not the phone's own noise." : ''}` });
  if (steps.rounded) {
    const rest = state.readings.filter((r) => r.phase === 'rest');
    const pc = (k) => `${Math.round(100 * flicker(rest.map((r) => r[k])))}%`;
    rows.push({ label: 'Flicker at rest', value: `x ${pc('x')} · y ${pc('y')} · z ${pc('z')}`,
      note: 'Share of the readings at rest that are a step off the usual value, on each axis. Most phones that round flicker on at least one axis: there, even shaking smaller than a step can show.' });
  }
  const flat = Math.abs(m.z) > 0.9 * g;
  rows.push({ label: 'Resting values', value: `x ${f(m.x)} · y ${f(m.y)} · z ${f(m.z)} m/s²`,
    note: `Together ${f(g)} m/s² (gravity is 9.81). ${flat
      ? `With the screen up, z is ${m.z > 0 ? 'positive' : 'negative'}${m.z < 0 ? ' (the opposite sign to most Android phones)' : ''}.`
      : 'The phone does not seem to lie flat: z should carry most of gravity.'}` });
  const peaks = taps.map((t) => t.peak);
  rows.push({ label: 'Taps seen', value: taps.length ? `${taps.length} (biggest ${f(Math.max(...peaks))}, smallest ${f(Math.min(...peaks))} m/s²)` : 'None',
    note: `You were asked for 5. Sizes are from the resting value. ${state.rule.range
      ? 'A tap counts if a reading leaves the range it had at rest by a step (0.1 m/s²).'
      : `A tap counts if the reading moves more than ${f(state.rule.threshold, 2)} m/s² from its resting value.`}${taps.length ? '' : ' Tap a little harder, or closer to the phone.'}` });
  rows.push({ label: 'Motion permission', ...permissionText() });
  rows.push({ label: 'Screen kept on', value: state.wake });
  rows.push({ label: 'Page hidden during the take', value: state.hidden ? `${state.hidden} time${state.hidden > 1 ? 's' : ''}` : 'No',
    note: state.hidden ? 'Readings stop while the page is hidden. Run again with the screen on.' : '' });
  const st = state.source.stats;
  rows.push({ label: 'Also reports', value: `acceleration without gravity: ${st.hasAcceleration ? 'yes' : 'no'} · rotation: ${st.hasRotation ? 'yes' : 'no'} · interval field: ${st.interval ?? 'none'}`,
    note: `The page measures the rate itself; it does not use the interval field.${st.empty ? ` ${st.empty} events carried no readings.` : ''}` });
  rows.push({ label: 'Repeated readings', value: `${int(repeats(rd))} of ${int(rd.length)}`,
    note: 'Readings identical to the one before on all three axes. On a phone that rounds, most readings at rest repeat.' });
  rows.push({ label: 'Browser', value: navigator.userAgent });
  return rows;
}

function permissionText() {
  const p = state.perm;
  if (!p) return { value: '—' };
  if (!p.asked) {
    return { value: 'Not asked', note: `This browser reads motion without a prompt.${state.permApi ? ` Its accelerometer permission: ${state.permApi}.` : ''}` };
  }
  return { value: `Asked: ${p.state}`,
    note: `Answered after ${f(p.ms / 1000, 1)} s${p.ms > 400 ? ' (a prompt was probably shown)' : ' (at once: no prompt, the browser remembered an earlier answer)'}. Tell Gus whether you saw a prompt.` };
}

function showRows(table, rows) {
  table.innerHTML = rows.map((r) => `<tr${r.cls ? ` class="${esc(r.cls)}"` : ''}><th scope="row">${esc(r.label)}</th>
    <td>${esc(r.value)}${r.note ? `<span class="note">${esc(r.note)}</span>` : ''}</td></tr>`).join('');
  table.hidden = false;
}

// ---- The live plot -----------------------------------------------------------------------------
const AXES = [['x', '--ax'], ['y', '--ay'], ['z', '--az']];

function draw() {
  const c = el.plot;
  const w = c.clientWidth;
  const h = c.clientHeight;
  if (!w || !h) return;
  const dpr = window.devicePixelRatio || 1;
  if (c.width !== Math.round(w * dpr) || c.height !== Math.round(h * dpr)) {
    c.width = Math.round(w * dpr);
    c.height = Math.round(h * dpr);
  }
  const ctx = c.getContext('2d');
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  const css = getComputedStyle(document.documentElement);
  const v = (name) => css.getPropertyValue(name).trim();
  ctx.fillStyle = v('--trace-bg');
  ctx.fillRect(0, 0, w, h);

  // Below the cue, whose height depends on its text and the screen's width.
  const top = Math.min(h / 2, el.cue.offsetTop + el.cue.offsetHeight + 6);
  const bottom = 16;
  const left = 64;
  const right = 8;
  const lane = (h - top - bottom) / 3;
  const rd = state.readings;
  const whole = state.phase === 'done';
  const tEnd = rd.length ? rd[rd.length - 1].th : 0;
  const tStart = whole && rd.length ? rd[0].th : tEnd - PLOT_WINDOW_MS;
  const shown = rd.filter((r) => r.th >= tStart);
  const center = {};
  for (const [k] of AXES) {
    if (state.rule) center[k] = state.rule.mean[k];
    else if (shown.length) center[k] = quantile(shown.map((r) => r[k]).sort((a, b) => a - b), 0.5);
    else center[k] = 0;
  }
  let dev = 0;
  for (const r of shown) for (const [k] of AXES) dev = Math.max(dev, Math.abs(r[k] - center[k]));
  const half = Math.max(0.25, dev * 1.15);
  const gridStep = half <= 0.6 ? 0.1 : half <= 3 ? 0.5 : 2;
  const xOf = (t) => left + ((t - tStart) / Math.max(1, tEnd - tStart)) * (w - left - right);

  ctx.font = '12px system-ui, sans-serif';
  ctx.textBaseline = 'middle';
  AXES.forEach(([k, color], i) => {
    const mid = top + lane * (i + 0.5);
    const yOf = (val) => mid - ((val - center[k]) / half) * (lane / 2) * 0.9;
    ctx.strokeStyle = v('--grid');
    ctx.lineWidth = 1;
    for (let g = -Math.floor(half / gridStep) * gridStep; g <= half + 1e-9; g += gridStep) {
      const y = Math.round(mid - (g / half) * (lane / 2) * 0.9) + 0.5;
      ctx.beginPath();
      ctx.moveTo(left, y);
      ctx.lineTo(w - right, y);
      ctx.stroke();
    }
    ctx.fillStyle = v(color);
    ctx.font = '600 13px system-ui, sans-serif';
    ctx.fillText(k, 6, mid);
    ctx.font = '12px system-ui, sans-serif';
    ctx.fillStyle = v('--muted');
    const last = shown[shown.length - 1];
    ctx.fillText(last ? f(last[k], 2) : '—', 20, mid);
    if (shown.length < 2) return;
    // Hold each reading until the next one: the steps are what the browser delivers.
    ctx.strokeStyle = v(color);
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    shown.forEach((r, j) => {
      const x = xOf(r.th);
      const y = yOf(r[k]);
      if (j === 0) ctx.moveTo(x, y);
      else { ctx.lineTo(x, yOf(shown[j - 1][k])); ctx.lineTo(x, y); }
    });
    ctx.stroke();
  });
  ctx.fillStyle = v('--muted');
  ctx.font = '11px system-ui, sans-serif';
  ctx.textAlign = 'right';
  ctx.fillText(`${whole ? `whole take, ${f((tEnd - tStart) / 1000, 0)} s` : 'last 5 s'} · gray lines every ${gridStep} m/s²`, w - right, h - 8);
  ctx.textAlign = 'left';
  if (!rd.length) ctx.fillText('m/s²', 6, h - 8);
}
if (window.ResizeObserver) new ResizeObserver(() => draw()).observe(el.plot);
else window.addEventListener('resize', () => draw());
matchMedia('(prefers-color-scheme: dark)').addEventListener?.('change', () => draw());

// ---- Microphone ---------------------------------------------------------------------------------
el.micStart.addEventListener('click', () => {
  if (state.micRunning) return;
  const mic = micSource();
  let opening;
  try {
    opening = mic.open(); // makes the AudioContext inside the tap, then asks for the microphone
  } catch (e) {
    opening = Promise.reject(e);
  }
  runMic(mic, opening);
});

async function runMic(mic, opening) {
  state.micRunning = true;
  state.mic = mic;
  el.micStart.disabled = true;
  el.micResults.hidden = true;
  el.micStatus.textContent = 'Asking for the microphone: tap Allow if asked.';
  log('Microphone test pressed');
  let info;
  try {
    info = await opening;
  } catch (e) {
    log(`Microphone: ${e.name}: ${e.message}`);
    await mic.close().catch(() => {});
    state.micRows = [{ label: 'Microphone', value: e.name === 'NotAllowedError' ? 'Not allowed' : e.name === 'NotFoundError' ? 'No microphone found' : `Did not start (${e.name})`,
      note: e.name === 'NotAllowedError'
        ? "To try again, allow the microphone for this site: in Safari, the aA button › Website Settings; in Chrome, the icon left of the address › Permissions."
        : e.message }];
    showRows(el.micResults, state.micRows);
    el.micStatus.textContent = 'The microphone test did not run.';
    el.micStart.disabled = false;
    state.micRunning = false;
    state.mic = null;
    enableSend();
    return;
  }
  log(`Microphone allowed after ${Math.round(info.ms)} ms; audio system ${info.contextRate} per s; settings ${JSON.stringify(info.settings)}`);
  el.micStatus.textContent = `Listening for ${MIC_SECONDS} seconds: clap once.`;
  const blocks = [];
  let failed = null;
  try {
    await mic.listen((b) => {
      blocks.push(b);
      el.meter.style.width = `${Math.max(0, Math.min(100, ((dbfs(b.peak) + 60) / 60) * 100))}%`;
    });
    if (mic.speed !== Infinity) await new Promise((ok) => setTimeout(ok, (MIC_SECONDS * 1000) / mic.speed));
  } catch (e) {
    failed = e;
    log(`Microphone meter: ${e.name}: ${e.message}`);
  } finally {
    await mic.close().catch((e) => log(`Microphone close: ${e.message}`)); // always switch the microphone off
  }
  el.meter.style.width = '0';
  log(`Microphone closed; ${blocks.length} blocks`);
  state.micRows = failed
    ? [{ label: 'Microphone', value: `Allowed, but the meter did not start (${failed.name})`, note: failed.message }]
    : micResults(info, blocks);
  showRows(el.micResults, state.micRows);
  el.micStatus.textContent = 'Done: the microphone is off again. Nothing was recorded.';
  state.mic = null;
  el.micStart.disabled = false;
  el.micStart.textContent = 'Test again';
  state.micRunning = false;
  enableSend();
}

function micResults(info, blocks) {
  const s = info.settings;
  const rate = audioRate(blocks);
  const span = blocks.length > 1 ? (blocks[blocks.length - 1].t - blocks[0].t) / 1000 : 0;
  const peak = blocks.length ? Math.max(...blocks.map((b) => b.peak)) : 0;
  const quiet = blocks.length ? quantile(blocks.map((b) => b.rms).sort((a, b) => a - b), 0.5) : 0;
  const rows = [];
  if (SIM) rows.push({ label: 'Simulated microphone', value: 'Yes: made-up sound levels', note: 'Not a measurement of this device.', cls: 'sim' });
  rows.push({ label: 'Microphone permission', value: `Allowed after ${f(info.ms / 1000, 1)} s`,
    note: info.ms > 400 ? 'A prompt was probably shown.' : 'At once: no prompt, the browser remembered an earlier answer.' });
  rows.push({ label: 'Sample rate', value: `${int(info.contextRate)} per second`,
    note: `The browser's audio system. The microphone itself says: ${s.sampleRate ? `${int(s.sampleRate)} per second` : 'not reported'}.` });
  if (!blocks.length || peak === 0) {
    rows.push({ label: 'Sound', value: 'No sound arrived', note: `${blocks.length} blocks, all silent. The audio system said "${info.state ?? 'unknown'}". On an iPhone, check that no call or other app holds the microphone, and try again.` });
  }
  rows.push({ label: 'Measured rate', value: Number.isFinite(rate) ? `${int(rate)} per second` : '—',
    note: `Samples that arrived, over ${f(span, 1)} s by the page's clock. Close to the sample rate means no audio was lost.` });
  rows.push({ label: 'Voice processing', value: `echo cancellation ${onOff(s.echoCancellation)} · noise suppression ${onOff(s.noiseSuppression)} · auto gain ${onOff(s.autoGainControl)}`,
    note: 'The page asks for all three off. "Not reported" means the browser did not say.' });
  rows.push({ label: 'Loudest sound', value: db(peak), note: `Your clap, if you clapped. 0 dBFS is the loudest the microphone can report. Quiet level: ${db(quiet)}.` });
  rows.push({ label: 'Meter', value: info.worklet ? 'AudioWorklet' : 'ScriptProcessor (an older browser)', note: `${blocks.length} blocks of sound, each folded into 3 numbers and thrown away.` });
  return rows;
}

// ---- Sending the results ------------------------------------------------------------------------
function enableSend() {
  const any = !!(state.motionRows || state.micRows);
  el.copy.disabled = !any;
  el.csv.disabled = !any;
  el.share.hidden = !navigator.share;
  el.share.disabled = !any;
}

function resultsText() {
  const lines = ['UHSN Phone Bench results (prototype, trial T1)', 'Make and model: (please add)', ''];
  const block = (title, rows) => {
    if (!rows) return;
    lines.push(title);
    for (const r of rows) lines.push(`  ${r.label}: ${r.value}${r.note ? ` (${r.note})` : ''}`);
    lines.push('');
  };
  block('Motion sensor', state.motionRows);
  block('Microphone', state.micRows);
  if (!state.micRows) lines.push('Microphone: not tested', '');
  return lines.join('\n');
}

el.copy.addEventListener('click', async () => {
  const text = resultsText();
  try {
    await navigator.clipboard.writeText(text);
    el.sendStatus.textContent = 'Copied. Paste it into an email to Gus, and add the make and model.';
    el.copyBox.hidden = true;
  } catch {
    el.copyBox.value = text;
    el.copyBox.hidden = false;
    el.copyBox.focus();
    el.copyBox.select();
    el.sendStatus.textContent = 'Copy the text below (select all, then copy) and paste it into an email to Gus.';
  }
});

el.share.addEventListener('click', async () => {
  try {
    await navigator.share({ title: 'Phone Bench results', text: resultsText() });
  } catch (e) {
    if (e.name !== 'AbortError') el.sendStatus.textContent = `Sharing did not work (${e.name}). Use Copy results instead.`;
  }
});

el.csv.addEventListener('click', () => {
  const stamp = (state.takenAt ?? new Date()).toISOString();
  const lines = ['# UHSN Phone Bench (prototype), trial T1. Made on this device; nothing was sent anywhere.',
    `# ${csvRow(['taken', stamp])}`];
  for (const [title, rows] of [['motion', state.motionRows], ['microphone', state.micRows]]) {
    for (const r of rows ?? []) lines.push(`# ${csvRow([`${title}: ${r.label}`, r.value, r.note ?? ''])}`);
  }
  if (state.motionRows) {
    lines.push(csvRow(['t_event_ms', 't_page_ms', 'x', 'y', 'z', 'phase']));
    const t0 = state.readings[0].t;
    const p0 = state.readings[0].th;
    for (const r of state.readings) lines.push(csvRow([(r.t - t0).toFixed(3), (r.th - p0).toFixed(3), r.x, r.y, r.z, r.phase]));
  }
  const d = state.takenAt ?? new Date();
  const pad = (n) => String(n).padStart(2, '0');
  downloadCsv(`phone-bench-${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}.csv`, lines);
  el.sendStatus.textContent = 'Saved as a CSV file on this device (in Downloads, or Files › Downloads on an iPhone).';
});

// ---- Start-up ------------------------------------------------------------------------------------
function init() {
  log(`Page opened: ${SIM ? `simulated ${SIM}${SAMPLE ? ', whole take at once' : `, ${SPEED}× real time`}` : 'this device'}; secure: ${window.isSecureContext}`);
  if (SIM) {
    el.simBadge.hidden = false;
    el.simBadge.textContent = `Simulated ${SIM === 'iphone' ? 'iPhone' : 'Android phone'}`;
  }
  const probe = deviceMotion();
  if (!SIM && !window.isSecureContext) {
    say('This page needs its https address (the published site) to read motion and the microphone.');
    cue('Open this page from the https site', 'problem');
  } else if (!SIM && !probe.available) {
    say('This browser has no motion events. The microphone test below may still work.');
  } else {
    say(`Lay this phone flat on a table, screen up. Then press Start. It takes ${TOTAL} seconds: hands off for ${REST} s, then tap the table 5 times.`);
    if (!SIM && !('wakeLock' in navigator)) { el.warning.textContent = AUTO_LOCK; el.warning.hidden = false; }
  }
  if (!SIM && !deviceMic().available) {
    el.micStart.disabled = true;
    el.micStatus.textContent = 'This browser cannot use the microphone here.';
  }
  draw();
  if (SAMPLE) runSample();
}

/** ?source=sample: the made-up phone's whole take and microphone test, shown at once. */
async function runSample() {
  const source = motionSource();
  await runTake(source, source.requestPermission());
  const mic = micSource();
  await runMic(mic, mic.open());
}

init();
