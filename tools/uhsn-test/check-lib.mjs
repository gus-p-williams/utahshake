// The pure parts of the UHSN data checker (check-tree.mjs): the data specification's field
// tables, and checks that take plain values (parsed JSON, miniSEED record headers, HTTP
// response headers) and say what is wrong. No files and no network here, so node --test
// covers them (tests/uhsn-check.test.js).
//
// The specification is planning/spec-uhsn-data.md, version 1.1. Section numbers in the
// messages are its sections, so DRI IT can look each rule up.
//
// Every message is written for the person fixing the server: what is wrong, then the rule.
import {
  describeDay, gapTotals, dayStatus, channelStatus, publishPaused, sdsPath, isoDay, nslc,
} from '../../docs/app/js/lib/mseed-index.js';

export const SPEC_VERSION = '1.1';
export const DAY_MS = 86400000;
export const HOUR_MS = 3600000;
const MARK_MS = 600000;
/** Times read back from JSON are compared to within 1 ms (they are written to the ms). */
export const TIME_TOL_MS = 1;
/** Record ends are compared with publicUntil to within 1 microsecond (float rounding). */
const CUTOFF_TOL_MS = 0.001;

export const SIZE_LIMITS = { day: 45e6, sidecar: 100e3, index: 1e6, availability: 500e3 }; // 7.3
export const SHAKE_MODELS = ['RS1D', 'RS3D', 'RS4D', 'RS&BOOM']; // 7.4

// --- The report -----------------------------------------------------------------------------

/**
 * Findings, by section. Three levels of problem:
 *   FAIL  breaks a rule of the spec; the apps may show wrong data, or none;
 *   WARN  works, but differs from the spec; worth fixing;
 *   NOTE  for information.
 * Problems with the same level and text in a section are one item with several places.
 * check() also counts what passed, so the report can say "ok ... (12 checked)".
 */
export class Report {
  constructor() {
    this.sections = [];
    this.cur = null;
  }

  section(title, ref) {
    this.cur = { title, ref, items: [] };
    this.sections.push(this.cur);
    return this;
  }

  _sec() {
    if (!this.cur) this.section('General', '');
    return this.cur;
  }

  /** A check that passed or failed: problems is a list of messages (empty = passed). */
  check(label, problems, where, level = 'FAIL') {
    const sec = this._sec();
    let ok = sec.items.find((i) => i.level === 'ok' && i.label === label);
    if (!ok) { ok = { level: 'ok', label, n: 0, bad: 0 }; sec.items.push(ok); }
    ok.n++;
    if (problems.length) ok.bad++;
    for (const p of problems) this.add(level, p, where);
    return problems.length === 0;
  }

  /** A line that says something passed, on its own. */
  ok(text) { this._sec().items.push({ level: 'ok', label: text, n: 0, bad: 0, plain: true }); }

  add(level, text, where) {
    const sec = this._sec();
    let it = sec.items.find((i) => i.level === level && i.text === text);
    if (!it) { it = { level, text, where: [] }; sec.items.push(it); }
    if (where && !it.where.includes(where)) it.where.push(where);
  }

  fail(text, where) { this.add('FAIL', text, where); }
  warn(text, where) { this.add('WARN', text, where); }
  note(text, where) { this.add('NOTE', text, where); }

  counts() {
    const c = { FAIL: 0, WARN: 0, NOTE: 0 };
    for (const s of this.sections) for (const i of s.items) if (i.level in c) c[i.level]++;
    return c;
  }

  get passed() { return this.counts().FAIL === 0; }

  /** All problem items of a level (for tests and the JSON output). */
  items(level) {
    return this.sections.flatMap((s) => s.items.filter((i) => i.level === level)
      .map((i) => ({ section: s.title, ...i })));
  }

  toJSON() {
    return {
      spec: SPEC_VERSION, result: this.passed ? 'PASS' : 'FAIL', counts: this.counts(),
      sections: this.sections.map((s) => ({
        title: s.title, ref: s.ref,
        items: s.items.filter((i) => i.level !== 'ok' || (i.bad === 0 && (i.plain || i.n > 0)))
          .map((i) => (i.level === 'ok' ? { level: 'ok', text: okText(i) }
            : { level: i.level, text: i.text, where: i.where })),
      })),
    };
  }

  /** The report as text, about 92 columns wide. maxWhere: places listed per problem. */
  toText({ maxWhere = 5 } = {}) {
    const out = [];
    const LABEL = { ok: 'ok  ', FAIL: 'FAIL', WARN: 'warn', NOTE: 'note' };
    this.sections.forEach((s, k) => {
      out.push('', `${k + 1}. ${s.title}${s.ref ? `  (spec ${s.ref})` : ''}`);
      const shown = s.items.filter((i) => i.level !== 'ok' || (i.bad === 0 && (i.plain || i.n > 0)));
      if (!shown.length) out.push('   (nothing to check)');
      for (const i of shown) {
        const text = i.level === 'ok' ? okText(i) : i.text;
        out.push(...wrap(text, 92, `   ${LABEL[i.level]}  `, '         '));
        if (i.where?.length) {
          const list = i.where.slice(0, maxWhere);
          for (const w of list) out.push(...wrap(w, 92, '           at ', '              '));
          if (i.where.length > list.length) {
            out.push(`           and ${i.where.length - list.length} more (--verbose lists them all)`);
          }
        }
      }
    });
    return out.join('\n');
  }
}

function okText(i) {
  return i.plain ? i.label : `${i.label} (${i.n} checked)`;
}

/** Wrap text into lines of at most width characters: first line after first, the rest after rest. */
export function wrap(text, width, first, rest) {
  const lines = [];
  let line = first;
  let fresh = true;
  for (const word of String(text).split(/\s+/).filter(Boolean)) {
    if (!fresh && line.length + 1 + word.length > width) {
      lines.push(line);
      line = rest + word;
    } else line += (fresh ? '' : ' ') + word;
    fresh = false;
  }
  lines.push(line);
  return lines;
}

// --- Values and the field tables (7.3 to 7.7) ------------------------------------------------

const TIME_RE = /^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/;
const DATE_RE = /^\d{4}-\d\d-\d\d$/;

/** A time as spec 6.3 writes it: ISO 8601 with milliseconds and Z, and a real instant. */
export function isTime(v) {
  return typeof v === 'string' && TIME_RE.test(v) && !Number.isNaN(Date.parse(v))
    && new Date(Date.parse(v)).toISOString() === v;
}

/** A date as spec 6.3 writes it: YYYY-MM-DD, and a real day. */
export function isDate(v) {
  return typeof v === 'string' && DATE_RE.test(v) && !Number.isNaN(Date.parse(`${v}T00:00:00Z`))
    && new Date(Date.parse(`${v}T00:00:00Z`)).toISOString().slice(0, 10) === v;
}

export const isObject = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);

const WHAT = {
  integer: 'a whole number', number: 'a number', string: 'text', boolean: 'true or false',
  time: 'a time like 2026-11-25T14:00:00.000Z', date: 'a date like 2026-11-25', array: 'a list',
  object: 'an object',
};

/** A value as a short quote for a message. */
export function show(v) {
  const s = v === undefined ? 'missing' : JSON.stringify(v);
  return s.length > 44 ? `${s.slice(0, 40)}…` : s;
}

/**
 * The field tables of spec 7.4 to 7.7. Each field is [name, type, required]:
 *   type      'integer', 'number', 'string', 'boolean', 'time', 'date', 'array', 'object',
 *             with '|null' when the table allows null; or a list of the allowed words;
 *   required  true, false, 'sharing' (required for a sharing station: the table's "if
 *             approved", which section 3 settles for sharing stations) or 'withdrawn'.
 */
export const FIELDS = {
  stationsFile: [['version', 'integer', true], ['generated', 'time', true], ['stations', 'array', true]],
  station: [
    ['net', 'string', true], ['sta', 'string', true], ['rsSta', 'string', true],
    ['school', 'string', true], ['schoolName', 'string', 'sharing'], ['primary', 'boolean', true],
    ['sharing', ['sharing', 'not-sharing', 'unconfirmed'], true], ['delayHours', 'number', true],
    ['lat', 'number', 'sharing'], ['lon', 'number', 'sharing'], ['elevM', 'number', false],
    ['model', 'string', true], ['start', 'time', true], ['end', 'time|null', true],
    ['stationXml', 'string', true], ['clockChecked', 'date|null', true], ['channels', 'array', true],
  ],
  channel: [
    ['loc', 'string', true], ['cha', 'string', true], ['sampleRate', 'number', true],
    ['azimuth', 'number', true], ['dip', 'number', true], ['units', ['M/S', 'M/S**2', 'PA', 'M'], true],
    ['sensitivity', 'number|null', true], ['sensitivityFreq', 'number|null', true],
    ['sensor', 'string', false],
  ],
  indexFile: [['version', 'integer', true], ['generated', 'time', true], ['stations', 'object', true]],
  indexStation: [['publicUntil', 'time', true], ['channels', 'object', true]],
  indexChannel: [
    ['firstDay', 'date', true], ['lastSample', 'time', true], ['updated', 'time', true],
    ['status', ['current', 'late', 'stopped'], true],
  ],
  availabilityFile: [
    ['version', 'integer', true], ['net', 'string', true], ['sta', 'string', true],
    ['year', 'integer', true], ['generated', 'time', true], ['channels', 'object', true],
  ],
  availabilityDay: [
    ['status', ['filling', 'closed', 'withdrawn'], true], ['coverage', 'number', true],
    ['gapCount', 'integer', true], ['gapSeconds', 'number', true], ['bytes', 'integer', true],
    ['updated', 'time', true], ['withdrawnReason', 'string', 'withdrawn'],
  ],
  sidecar: [
    ['version', 'integer', true], ['id', 'string', true], ['day', 'date', true],
    ['records', 'integer', true], ['recordLength', 'integer', true], ['encoding', 'string', true],
    ['sampleRate', 'number', true], ['firstSample', 'time', true], ['lastSampleEnd', 'time', true],
    ['coverage', 'number', true], ['gaps', 'array', true], ['overlaps', 'array', true],
    ['seek', 'array', true], ['updated', 'time', true],
  ],
};

/** Why v is not of the table's type, or null if it is. */
export function typeProblem(v, type) {
  if (Array.isArray(type)) {
    return type.includes(v) ? null : `is ${show(v)}; allowed: ${type.map((t) => `"${t}"`).join(', ')}`;
  }
  const [base, orNull] = type.split('|');
  if (v === null) return orNull === 'null' ? null : `is null; it must be ${WHAT[base]}`;
  const ok = {
    integer: Number.isInteger(v), number: typeof v === 'number' && Number.isFinite(v),
    string: typeof v === 'string', boolean: typeof v === 'boolean', time: isTime(v),
    date: isDate(v), array: Array.isArray(v), object: isObject(v),
  }[base];
  return ok ? null : `is ${show(v)}; it must be ${WHAT[base]}`;
}

/**
 * One JSON object against a field table. A missing optional field means "not provided" and
 * null in an optional field means "unknown" (7.3): both are fine. Fields the table does not
 * have are returned as extra: readers ignore them (7.3), and DRI may add some (section 15).
 * @returns {{problems: string[], extra: string[]}}
 */
export function checkFields(obj, table, { sharing = false, withdrawn = false } = {}) {
  if (!isObject(obj)) return { problems: [`is ${show(obj)}, not a JSON object`], extra: [] };
  const problems = [];
  for (const [name, type, req] of table) {
    const required = req === true || (req === 'sharing' && sharing) || (req === 'withdrawn' && withdrawn);
    if (!Object.hasOwn(obj, name)) {
      if (required) problems.push(`"${name}" is missing`);
      continue;
    }
    if (obj[name] === null && !required) continue;
    const why = typeProblem(obj[name], type);
    if (why) problems.push(`"${name}" ${why}`);
  }
  const known = new Set(table.map(([n]) => n));
  return { problems, extra: Object.keys(obj).filter((k) => !known.has(k)) };
}

// --- Paths (7.1) --------------------------------------------------------------------------

const DAY_PATH = /^sds\/(\d{4})\/([A-Z0-9]+)\/([A-Z0-9]+)\/([A-Z0-9]{3})\.D\/([A-Z0-9]+)\.([A-Z0-9]+)\.([A-Z0-9]*)\.([A-Z0-9]{3})\.D\.(\d{4})\.(\d{3})$/;

/** {net, sta, loc, cha, dayMs} from a day file's path, or null if it breaks the 7.1 pattern. */
export function parseDayPath(rel) {
  const m = DAY_PATH.exec(rel);
  if (!m) return null;
  const [, y, net, sta, cha, net2, sta2, loc, cha2, y2, ddd] = m;
  if (y !== y2 || net !== net2 || sta !== sta2 || cha !== cha2) return null;
  const dayMs = Date.UTC(Number(y), 0, 1) + (Number(ddd) - 1) * DAY_MS;
  if (Number(ddd) < 1 || new Date(dayMs).getUTCFullYear() !== Number(y)) return null;
  const ch = { net, sta, loc, cha };
  return sdsPath(ch, dayMs) === rel ? { ...ch, dayMs } : null;
}

/**
 * What a file of the tree is, from its path (7.1): 'stations', 'index', 'stationXml',
 * 'availability', 'day', 'sidecar', 'products', 'readme' (an ABOUT or README text a test
 * tree may carry), or null for a path the layout does not have.
 */
export function classifyPath(rel) {
  if (rel === 'stations.json') return 'stations';
  if (rel === 'index.json') return 'index';
  if (/^stations\/[A-Z0-9]+\.[A-Z0-9]+\.xml$/.test(rel)) return 'stationXml';
  if (/^index\/[A-Z0-9]+\.[A-Z0-9]+\.\d{4}\.json$/.test(rel)) return 'availability';
  if (rel.startsWith('products/')) return 'products';
  if (/^(ABOUT|README)(\.(txt|md))?$/i.test(rel)) return 'readme';
  if (rel.startsWith('sds/')) {
    if (rel.endsWith('.json')) return parseDayPath(rel.slice(0, -5)) ? 'sidecar' : null;
    return parseDayPath(rel) ? 'day' : null;
  }
  return null;
}

// --- stations.json (7.4, section 3) and StationXML (7.8) ----------------------------------

/** A test tree's station (make-tree.mjs): its model says "test". UU codes are expected there. */
export const isTestStation = (st) => typeof st?.model === 'string' && /^test\b/i.test(st.model);

const decimals3 = (x) => Math.abs(Math.round(x * 1000) / 1000 - x) < 1e-9;

/**
 * stations.json against 7.4 and the sharing rules of section 3. Returns the station entries
 * that are objects, for the later sections.
 */
export function checkStationsFile(doc, r) {
  const f = checkFields(doc, FIELDS.stationsFile);
  r.check('stations.json has version, generated and stations', f.problems, 'stations.json');
  if (doc?.version !== undefined && doc.version !== 1) r.fail(`"version" is ${show(doc.version)}; it must be 1 (7.3)`, 'stations.json');
  const list = Array.isArray(doc?.stations) ? doc.stations : [];
  const extra = new Set(f.extra);
  for (const st of list) {
    const where = `stations.json: ${st?.net}.${st?.sta}${st?.start ? `, epoch from ${st.start}` : ''}`;
    const sharing = st?.sharing === 'sharing';
    const sf = checkFields(st, FIELDS.station, { sharing });
    r.check('station entries have the fields and types of the table', sf.problems, where);
    sf.extra.forEach((k) => extra.add(k));
    if (!isObject(st)) continue;
    for (const ch of Array.isArray(st.channels) ? st.channels : []) {
      const cf = checkFields(ch, FIELDS.channel);
      const p = [...cf.problems];
      if (typeof ch?.cha === 'string' && !/^[A-Z0-9]{3}$/.test(ch.cha)) p.push(`"cha" is ${show(ch.cha)}; a channel code is 3 letters or digits, e.g. EHZ`);
      if (typeof ch?.sampleRate === 'number' && !(ch.sampleRate > 0)) p.push(`"sampleRate" is ${ch.sampleRate}; it must be above 0`);
      r.check('channels have the fields and types of the table', p, `${where}, channel ${ch?.loc}.${ch?.cha}`);
      cf.extra.forEach((k) => extra.add(k));
    }
    if (Array.isArray(st.channels) && !st.channels.length) r.fail('a station entry has no channels', where);
    checkStationRules(st, r, where);
  }
  if (!list.length && Array.isArray(doc?.stations)) r.warn('stations.json lists no stations', 'stations.json');

  // One primary station per school, among the current epochs (7.4).
  const current = list.filter((s) => isObject(s) && s.end === null);
  const bySchool = Map.groupBy(current, (s) => s.school);
  const primaries = [];
  for (const [school, sts] of bySchool) {
    const n = sts.filter((s) => s.primary === true).length;
    primaries.push(n === 1 ? [] : [`school "${school}" has ${n} primary stations; it must have exactly one (7.4)`]);
  }
  for (const p of primaries) r.check('one primary station per school', p, 'stations.json');
  if (extra.size) {
    r.note(`stations.json has fields the spec does not list: ${[...extra].join(', ')}. Readers ignore them (7.3); DRI may add fields (section 15, item 13)`, 'stations.json');
  }
  return list.filter(isObject);
}

/** The rules for one station entry beyond types: codes, sharing, delay, location precision. */
export function checkStationRules(st, r, where) {
  // Codes and model: what a school Shake has (6.2, 7.4). A test tree keeps its source's codes.
  const diffs = [];
  if (typeof st.net === 'string' && st.net !== 'AM') diffs.push(`network code "${st.net}" (school Shakes are "AM", 6.2)`);
  if (typeof st.sta === 'string' && !/^R[A-Z0-9]{4}$/.test(st.sta)) diffs.push(`station code "${st.sta}" (a Shake's is R + 4 characters, 6.2)`);
  const locs = new Set((Array.isArray(st.channels) ? st.channels : []).map((c) => c?.loc).filter((l) => typeof l === 'string' && l !== '00'));
  for (const l of locs) diffs.push(`location code "${l}" (every Shake writes "00", 6.2)`);
  if (typeof st.model === 'string' && !SHAKE_MODELS.includes(st.model)) diffs.push(`model "${st.model}" (one of ${SHAKE_MODELS.join(', ')}, 7.4)`);
  if (isTestStation(st)) {
    if (diffs.length) r.note(`a test station (its model starts with "test"), so these differ from a school Shake's, as expected in a test tree: ${diffs.join('; ')}`, where);
  } else {
    for (const d of diffs) r.warn(`${d[0].toUpperCase()}${d.slice(1)} is not what a school Shake has`, where);
  }
  if (typeof st.start === 'string' && typeof st.end === 'string' && !(Date.parse(st.end) > Date.parse(st.start))) {
    r.fail('the epoch ends before it starts', where);
  }
  if (typeof st.delayHours === 'number' && st.delayHours < 0) r.fail(`"delayHours" is ${st.delayHours}; it cannot be negative`, where);
  if (typeof st.stationXml === 'string' && st.stationXml !== `stations/${st.net}.${st.sta}.xml`) {
    r.warn(`"stationXml" is "${st.stationXml}"; the layout puts it at stations/${st.net}.${st.sta}.xml (7.1)`, where);
  }
  if (st.sharing === 'sharing') {
    const p = [];
    if (typeof st.delayHours === 'number' && st.delayHours !== 0) p.push(`a sharing station is published with no delay, but "delayHours" is ${st.delayHours} (section 3)`);
    for (const k of ['lat', 'lon']) {
      if (typeof st[k] === 'number' && !decimals3(st[k])) p.push(`"${k}" is ${st[k]}: more precise than 3 decimals (about 100 m), which is all a sharing station's position may show (7.4)`);
    }
    r.check('sharing stations: no delay, position to 3 decimals at most', p, where);
  } else if (st.sharing === 'unconfirmed') {
    const shown = ['schoolName', 'lat', 'lon'].filter((k) => st[k] !== undefined && st[k] !== null);
    if (shown.length) r.fail(`an unconfirmed station shows ${shown.join(', ')}; nothing may be published for it (section 3)`, where);
    else r.note('listed as unconfirmed: it must have no public data (checked in section 5)', where);
  } else if (st.sharing === 'not-sharing') {
    r.note(`not sharing: published only as DRI and the district approved, with a delay of ${st.delayHours} hours (section 3). The checker cannot see approvals; it checks the delay (section 5)`, where);
  }
}

/** A StationXML file for one station entry (7.8): version 1.2, every channel, a response. */
export function checkStationXml(xml, st, r, where) {
  const p = [];
  if (!/<FDSNStationXML\b/.test(xml)) {
    r.check('StationXML: FDSN StationXML with every channel and its response', ['it is not FDSN StationXML (no <FDSNStationXML> element)'], where);
    return;
  }
  const version = /<FDSNStationXML\b[^>]*\bschemaVersion="([^"]+)"/.exec(xml)?.[1];
  if (version !== '1.2') {
    r.add(isTestStation(st) ? 'NOTE' : 'WARN', `StationXML schema version is ${version ?? 'not given'}; the spec asks for 1.2 (7.8).${isTestStation(st) ? ' A test tree keeps the version its source wrote.' : ''}`, where);
  }
  if (!new RegExp(`<Station\\b[^>]*\\bcode="${st.sta}"`).test(xml)) p.push(`it has no station "${st.sta}"`);
  const blocks = [...xml.matchAll(/<Channel\b([^>]*)>([\s\S]*?)<\/Channel>/g)];
  for (const ch of Array.isArray(st.channels) ? st.channels : []) {
    const b = blocks.filter((m) => m[1].includes(`code="${ch.cha}"`) && m[1].includes(`locationCode="${ch.loc}"`));
    if (!b.length) p.push(`it has no channel ${ch.loc}.${ch.cha}`);
    else if (!b.some((m) => /<Response\b[\s\S]*<InstrumentSensitivity>/.test(m[2]))) p.push(`channel ${ch.loc}.${ch.cha} has no response (no <InstrumentSensitivity>)`);
  }
  r.check('StationXML: FDSN StationXML with every channel and its response', p, where);
}

// --- index.json (7.5) ---------------------------------------------------------------------

/**
 * The statuses a channel may have (7.5), from publicUntil − lastSample. A sharing station is
 * delivered hourly; for others the checker cannot tell hourly from daily, so either fits.
 */
export function allowedChannelStatuses(publicUntilMs, lastSampleMs, { sharing }) {
  const hourly = channelStatus(publicUntilMs, lastSampleMs);
  if (sharing) return [hourly];
  return [...new Set([hourly, channelStatus(publicUntilMs, lastSampleMs, { daily: true })])];
}

/** "4.8 s", "3.2 hours", "2.1 days": a length of time for a message. */
export function duration(ms) {
  const s = ms / 1000;
  if (Math.abs(s) < 120) return `${Math.round(s * 10) / 10} s`;
  if (Math.abs(s) < 2 * 3600) return `${Math.round(s / 6) / 10} minutes`;
  if (Math.abs(s) < 2 * 86400) return `${Math.round(s / 360) / 10} hours`;
  return `${Math.round(s / 8640) / 10} days`;
}

/**
 * index.json against 7.5 and the station list. Returns the published channels:
 * [{key, net, sta, loc, cha, publicUntilMs, entry, station}] (station: its current entry in
 * stations.json, or the latest epoch, or null).
 * o.nowMs: the time of the check; o.judgePaused: say whether the publish step is running.
 */
export function checkIndexFile(doc, stations, r, { nowMs, judgePaused }) {
  const f = checkFields(doc, FIELDS.indexFile);
  r.check('index.json has version, generated and stations', f.problems, 'index.json');
  if (doc?.version !== undefined && doc.version !== 1) r.fail(`"version" is ${show(doc.version)}; it must be 1 (7.3)`, 'index.json');
  const extra = new Set(f.extra);
  const out = [];
  const generatedMs = isTime(doc?.generated) ? Date.parse(doc.generated) : NaN;

  for (const [key, entry] of Object.entries(isObject(doc?.stations) ? doc.stations : {})) {
    const where = `index.json: ${key}`;
    if (!/^[A-Z0-9]+\.[A-Z0-9]+$/.test(key)) r.fail(`station key "${key}" is not NET.STA`, where);
    const [net, sta] = key.split('.');
    const epochs = stations.filter((s) => s.net === net && s.sta === sta);
    const station = epochs.find((s) => s.end === null) ?? epochs.at(-1) ?? null;
    if (!epochs.length) r.fail('a station in index.json is not in stations.json (7.5: published stations only)', where);
    const sf = checkFields(entry, FIELDS.indexStation);
    r.check('stations in index.json have publicUntil and channels', sf.problems, where);
    sf.extra.forEach((k) => extra.add(k));
    if (!isObject(entry)) continue;
    const publicUntilMs = isTime(entry.publicUntil) ? Date.parse(entry.publicUntil) : NaN;

    // publicUntil is the cutoff of the last run: at most generated − the approved delay (5.2).
    if (!Number.isNaN(publicUntilMs) && !Number.isNaN(generatedMs) && typeof station?.delayHours === 'number') {
      const latest = generatedMs - station.delayHours * HOUR_MS + 60000;
      r.check('publicUntil is no later than generated minus the approved delay',
        publicUntilMs > latest ? [`publicUntil ${entry.publicUntil} is later than generated (${doc.generated}) minus the approved delay of ${station.delayHours} hours: data may be public too early (5.2: cutoff = now − delay)`] : [], where);
    }

    for (const [chKey, c] of Object.entries(isObject(entry.channels) ? entry.channels : {})) {
      const cWhere = `${where}, channel ${chKey}`;
      const [loc, cha] = chKey.split('.');
      if (!/^[A-Z0-9]*\.[A-Z0-9]{3}$/.test(chKey)) r.fail(`channel key "${chKey}" is not LOC.CHA`, cWhere);
      const cf = checkFields(c, FIELDS.indexChannel);
      r.check('channels in index.json have the fields and types of the table', cf.problems, cWhere);
      cf.extra.forEach((k) => extra.add(k));
      if (epochs.length && !epochs.some((s) => (s.channels ?? []).some((x) => x?.loc === loc && x?.cha === cha))) {
        r.warn('a channel in index.json is not among the station\'s channels in stations.json', cWhere);
      }
      if (isObject(c) && isTime(c.lastSample) && !Number.isNaN(publicUntilMs)) {
        const lastMs = Date.parse(c.lastSample);
        const allowed = allowedChannelStatuses(publicUntilMs, lastMs, { sharing: station?.sharing === 'sharing' });
        if (typeof c.status === 'string') {
          r.check('channel status agrees with publicUntil − lastSample', allowed.includes(c.status) ? []
            : [`status is "${c.status}", but publicUntil − lastSample is ${duration(publicUntilMs - lastMs)}, so it should be ${allowed.map((a) => `"${a}"`).join(' or ')} (7.5: the lag is measured against publicUntil, not the clock)`], cWhere);
        }
      }
      out.push({ key: chKey, net, sta, loc, cha, publicUntilMs, entry: c, station, where: cWhere });
    }
  }

  if (!Number.isNaN(generatedMs)) {
    if (generatedMs > nowMs + 5 * 60000) r.warn(`"generated" (${doc.generated}) is in the future: check the server's clock`, 'index.json');
    if (judgePaused) {
      if (publishPaused(generatedMs, nowMs)) {
        r.warn(`Data paused: index.json was generated at ${doc.generated}, ${duration(nowMs - generatedMs)} before this check. The publish step runs every 10 minutes; after an hour readers show "data paused" (7.5)`, 'index.json');
      } else r.ok(`the publish step is running: index.json was generated ${duration(Math.max(0, nowMs - generatedMs))} before this check`);
    } else {
      r.note(`index.json was generated at ${doc.generated}. A folder is a snapshot, so the checker does not judge whether a publish step is running ("data paused", 7.5); give --now to judge it`, 'index.json');
    }
  }
  if (extra.size) r.note(`index.json has fields the spec does not list: ${[...extra].join(', ')}. Readers ignore them (7.3)`, 'index.json');
  return out;
}

// --- Availability files (7.6) -------------------------------------------------------------

const OLD_STATUS = { complete: 'closed', partial: 'filling' };

/**
 * One station-year availability file against 7.6. o: {rel, net, sta, year, publicUntilMs,
 * channelKeys (those index.json lists)}. Returns {channelKey: [{date, dayMs, line}]} in date
 * order, for lines that are objects with a valid date.
 */
export function checkAvailabilityFile(doc, r, { rel, net, sta, year, publicUntilMs, channelKeys }) {
  const f = checkFields(doc, FIELDS.availabilityFile);
  r.check('availability files have the fields and types of the table', f.problems, rel);
  if (!isObject(doc)) return {};
  const p = [];
  if (doc.version !== undefined && doc.version !== 1) p.push(`"version" is ${show(doc.version)}; it must be 1`);
  if (doc.net !== net || doc.sta !== sta || doc.year !== year) p.push(`it says ${doc.net}.${doc.sta} ${doc.year}, but its name is ${net}.${sta}.${year}`);
  r.check('availability files name their station and year', p, rel);
  const extra = new Set(f.extra);
  const out = {};
  for (const [chKey, days] of Object.entries(isObject(doc.channels) ? doc.channels : {})) {
    if (channelKeys && !channelKeys.includes(chKey)) r.warn(`lists channel ${chKey}, which index.json does not list for ${net}.${sta}`, rel);
    const list = [];
    for (const [date, line] of Object.entries(isObject(days) ? days : {})) {
      const where = `${rel}: ${chKey} ${date}`;
      if (!isDate(date) || Number(date.slice(0, 4)) !== year) { r.fail(`"${date}" is not a date of ${year}`, where); continue; }
      const dayMs = Date.parse(`${date}T00:00:00Z`);
      const withdrawn = line?.status === 'withdrawn';
      const lf = checkFields(line, FIELDS.availabilityDay, { withdrawn });
      const lp = lf.problems.map((m) => (OLD_STATUS[line?.status] && m.startsWith('"status"')
        ? `${m}. Spec 1.1 renamed "${line.status}" to "${OLD_STATUS[line.status]}": status now says whether the day can still grow, and coverage says how full it is`
        : m));
      if (typeof line?.coverage === 'number' && (line.coverage < 0 || line.coverage > 1 || Math.round(line.coverage * 1e4) / 1e4 !== line.coverage)) {
        lp.push(`"coverage" is ${line.coverage}; it is 0 to 1, to 4 decimals (7.3)`);
      }
      for (const k of ['gapCount', 'gapSeconds', 'bytes']) if (typeof line?.[k] === 'number' && line[k] < 0) lp.push(`"${k}" is negative`);
      r.check('days in the availability files have the fields and types of the table', lp, where);
      lf.extra.forEach((k) => extra.add(k));
      if (!isObject(line)) continue;
      if (!Number.isNaN(publicUntilMs) && dayMs >= publicUntilMs) {
        r.fail('lists a day that starts at or after publicUntil: nothing of it can be public yet (5.2)', where);
      }
      if (withdrawn) {
        r.check('withdrawn days: no bytes, and a reason', line.bytes === 0 ? [] : [`a withdrawn day has "bytes" ${line.bytes}; it must be 0 (7.6)`], where);
      } else if (['filling', 'closed'].includes(line.status) && !Number.isNaN(publicUntilMs)) {
        const want = dayStatus(dayMs, publicUntilMs);
        r.check('day status agrees with publicUntil (filling or closed)', line.status === want ? []
          : [`status is "${line.status}", but ${want === 'closed' ? 'the whole day ends at or before' : 'the day does not end by'} publicUntil, so it should be "${want}" (7.6)`], where);
      }
      list.push({ date, dayMs, line });
    }
    out[chKey] = list.sort((a, b) => a.dayMs - b.dayMs);
  }
  if (extra.size) r.note(`availability files have fields the spec does not list: ${[...extra].join(', ')}. Readers ignore them (7.3)`, rel);
  return out;
}

// --- Day files and sidecars (6.1, 7.3, 7.7) -----------------------------------------------

const near = (a, b, tol = TIME_TOL_MS) => Math.abs(a - b) <= tol;

/** Two lists of [start, end) time pairs, the same to within 1 ms? Returns the first difference. */
export function comparePairs(got, want) {
  if (!Array.isArray(got)) return 'it is not a list';
  if (got.length !== want.length) return `it lists ${got.length}; the records give ${want.length}`;
  for (let i = 0; i < got.length; i++) {
    const g = got[i];
    if (!Array.isArray(g) || g.length !== 2 || !isTime(g[0]) || !isTime(g[1])) return `entry ${i + 1} is ${show(g)}, not a [start, end] pair of times`;
    if (!near(Date.parse(g[0]), Date.parse(want[i][0])) || !near(Date.parse(g[1]), Date.parse(want[i][1]))) {
      return `entry ${i + 1} is [${g[0]}, ${g[1]}]; the records give [${want[i][0]}, ${want[i][1]}]`;
    }
  }
  return null;
}

/**
 * The seek table of a day file (7.7), against the file's records: one entry per 10-minute
 * mark from 00:00 UTC, in order; each the offset of the first record that starts at or after
 * the mark; marks after the last record's start left out, and no other mark. Returns problems.
 */
export function checkSeek(records, seek, { dayStartMs, recordLength, fileSize }) {
  if (!Array.isArray(seek)) return ['"seek" is not a list'];
  const p = [];
  const lastStart = records.length ? records.at(-1).startMs : -Infinity;
  const want = records.length ? Math.max(0, Math.min(144, Math.floor((lastStart - dayStartMs) / MARK_MS) + 1)) : 0;
  for (let k = 0; k < seek.length && p.length < 3; k++) {
    const e = seek[k];
    if (!Array.isArray(e) || e.length !== 2 || !isTime(e[0]) || !Number.isInteger(e[1])) { p.push(`entry ${k + 1} is ${show(e)}, not a [time, byte offset] pair`); continue; }
    const mark = dayStartMs + k * MARK_MS;
    if (Date.parse(e[0]) !== mark) { p.push(`entry ${k + 1} is for ${e[0]}; it should be the mark ${new Date(mark).toISOString()} (marks every 10 minutes from 00:00 UTC, in order)`); continue; }
    const off = e[1];
    if (off < 0 || off >= fileSize || off % recordLength !== 0) { p.push(`entry ${k + 1} (${e[0]}) gives byte ${off}, which is not the start of a record in this ${fileSize}-byte file`); continue; }
    const i = off / recordLength;
    const rec = records[i];
    if (!rec) { p.push(`entry ${k + 1} (${e[0]}) gives byte ${off}, past the last whole record`); continue; }
    if (rec.startMs < mark) p.push(`entry ${k + 1} (${e[0]}) points at a record that starts before the mark (${new Date(rec.startMs).toISOString()})`);
    else if (i > 0 && records[i - 1].startMs >= mark) p.push(`entry ${k + 1} (${e[0]}) skips earlier records that also start at or after the mark: it must give the first one`);
  }
  if (!p.length && seek.length !== want) {
    const hhmm = (k) => new Date(dayStartMs + k * MARK_MS).toISOString().slice(11, 16);
    p.push(seek.length < want
      ? `the table stops after ${seek.length} marks, but a record starts at or after the mark ${hhmm(seek.length)} UTC: every mark up to the last record's start must be listed`
      : `the table has ${seek.length} marks, but no record starts at or after the mark ${hhmm(want)} UTC: marks after the last record's start are left out`);
  }
  return p;
}

/**
 * A day file and its sidecar (6.1, 7.3, 7.7) and its line in the availability file (7.6).
 * o: {rel, ch: {net, sta, loc, cha}, dayMs, bytes (the file), records (scanRecords of it),
 *     sidecar (parsed), sidecarSize, line (its availability line or null), publicUntilMs,
 *     delayHours}
 * Returns {late: records that end after publicUntil, lastSampleEndMs, fileSize}.
 */
export function checkDayFile(r, o) {
  const { rel, ch, dayMs, bytes, records, sidecar, sidecarSize, line, publicUntilMs } = o;
  const side = `${rel}.json`;
  const fileSize = bytes.length;
  if (sidecar !== null && sidecar !== undefined) { // null: missing, already reported by the caller
    const sf = checkFields(sidecar, FIELDS.sidecar);
    const sp = [...sf.problems];
    if (isObject(sidecar)) {
      if (sidecar.version !== undefined && sidecar.version !== 1) sp.push(`"version" is ${show(sidecar.version)}; it must be 1`);
      if (typeof sidecar.id === 'string' && sidecar.id !== nslc(ch)) sp.push(`"id" is "${sidecar.id}"; the file's path says ${nslc(ch)}`);
      if (typeof sidecar.day === 'string' && sidecar.day !== isoDay(dayMs)) sp.push(`"day" is "${sidecar.day}"; the file's path says ${isoDay(dayMs)}`);
    }
    r.check('sidecars have the fields and types of the table', sp, side);
    if (sf.extra.length) r.note(`sidecars have fields the spec does not list: ${sf.extra.join(', ')}. Readers ignore them (7.3)`, side);
  }
  r.check('sizes within the limits (day file 45 MB, sidecar 100 KB)', [
    ...(fileSize > SIZE_LIMITS.day ? [`the day file is ${(fileSize / 1e6).toFixed(1)} MB; the limit is 45 MB (7.3)`] : []),
    ...(sidecarSize > SIZE_LIMITS.sidecar ? [`the sidecar is ${Math.round(sidecarSize / 1e3)} KB; the limit is 100 KB (7.3)`] : []),
  ], rel);

  // The file: whole miniSEED records of one channel, all the same length, in time order,
  // no duplicates, each in the file of the day its first sample falls in (6.1, 5.2, 7.7).
  const recLen = Number.isInteger(sidecar?.recordLength) ? sidecar.recordLength : records[0]?.recordLength;
  const fp = [];
  const scanned = records.reduce((n, x) => n + x.recordLength, 0);
  if (!records.length) fp.push('it holds no miniSEED records');
  else if (scanned !== fileSize) fp.push(`only the first ${scanned} of its ${fileSize} bytes are whole miniSEED records`);
  const wrongLen = records.filter((x) => x.recordLength !== recLen).length;
  if (wrongLen) fp.push(`${wrongLen} of ${records.length} records are not ${recLen} bytes long; every record in a day file has the sidecar's recordLength (7.7)`);
  const wrongId = records.filter((x) => nslc(x) !== nslc(ch)).length;
  if (wrongId) fp.push(`${wrongId} records are not ${nslc(ch)}: a day file holds one channel (6.1)`);
  const wrongDay = records.filter((x) => x.startMs < dayMs || x.startMs >= dayMs + DAY_MS).length;
  if (wrongDay) fp.push(`${wrongDay} records start on another UTC day: a record goes in the file of the day its first sample falls in (7.7)`);
  let unordered = 0;
  let dupes = 0;
  for (let i = 1; i < records.length; i++) {
    const a = Math.round(records[i - 1].startMs * 10);
    const b = Math.round(records[i].startMs * 10);
    if (b < a) unordered++;
    else if (b === a) dupes++;
  }
  if (unordered) fp.push(`${unordered} records start before the record ahead of them: records must be in time order (5.2)`);
  if (dupes) fp.push(`${dupes} records repeat the start time of the record ahead of them: duplicates must be removed (5.2)`);
  const encodings = [...new Set(records.map((x) => x.encodingName))];
  if (typeof sidecar?.encoding === 'string' && encodings.some((e) => e !== sidecar.encoding)) fp.push(`the records are ${encodings.join(', ')}, but the sidecar says ${sidecar.encoding}`);
  const rates = [...new Set(records.map((x) => x.sampleRate))];
  if (rates.length > 1) fp.push(`the records have several sample rates: ${rates.join(', ')}`);
  else if (typeof sidecar?.sampleRate === 'number' && rates.length && rates[0] !== sidecar.sampleRate) fp.push(`the records are ${rates[0]} samples per second, but the sidecar says ${sidecar.sampleRate}`);
  r.check('day files are whole records of one channel and one length, in time order, without duplicates', fp, rel);

  // The sidecar against the records it describes (7.7, 7.3).
  const late = records.filter((x) => x.endMs > publicUntilMs + CUTOFF_TOL_MS);
  let lastSampleEndMs = isTime(sidecar?.lastSampleEnd) ? Date.parse(sidecar.lastSampleEnd) : NaN;
  if (isObject(sidecar) && records.length) {
    const fresh = describeDay(records, { dayStartMs: dayMs, publicUntilMs });
    const dp = [];
    if (sidecar.records !== records.length) dp.push(`"records" is ${sidecar.records}; the file has ${records.length}`);
    if (Number.isInteger(sidecar.records) && Number.isInteger(sidecar.recordLength) && sidecar.records * sidecar.recordLength !== fileSize) {
      dp.push(`records × recordLength is ${sidecar.records * sidecar.recordLength} bytes; the file is ${fileSize}`);
    }
    for (const k of ['firstSample', 'lastSampleEnd']) {
      if (isTime(sidecar[k]) && !near(Date.parse(sidecar[k]), Date.parse(fresh[k]))) dp.push(`"${k}" is ${sidecar[k]}; the records give ${fresh[k]}`);
    }
    for (const k of ['gaps', 'overlaps']) {
      const why = comparePairs(sidecar[k], fresh[k]);
      if (why) dp.push(`"${k}": ${why} (7.3: a gap is more than 1.5 sample intervals; an overlap more than half of one)`);
    }
    if (typeof sidecar.coverage === 'number') {
      const fits = coverageFits(sidecar, records, { dayMs, publicUntilMs, delayHours: o.delayHours });
      if (!fits) dp.push(`"coverage" is ${sidecar.coverage}; the records give ${fresh.coverage} (7.3)`);
    }
    r.check('sidecars match their day files (counts, times, gaps, overlaps, coverage)', dp, side);
    r.check('seek tables point at the first record at or after each 10-minute mark',
      checkSeek(records, sidecar.seek, { dayStartMs: dayMs, recordLength: recLen, fileSize }), side);
    lastSampleEndMs = Date.parse(fresh.lastSampleEnd);
  }

  // Its line in the availability file (7.6).
  if (line) {
    const lp = [];
    if (line.bytes !== fileSize) lp.push(`"bytes" is ${line.bytes}; the day file is ${fileSize} bytes`);
    if (isObject(sidecar)) {
      if (line.coverage !== sidecar.coverage) lp.push(`"coverage" is ${line.coverage}; the sidecar says ${sidecar.coverage}`);
      if (Array.isArray(sidecar.gaps) && sidecar.gaps.every((g) => Array.isArray(g) && isTime(g[0]) && isTime(g[1]))) {
        const t = gapTotals(sidecar.gaps);
        if (line.gapCount !== t.gapCount) lp.push(`"gapCount" is ${line.gapCount}; the sidecar lists ${t.gapCount} gaps`);
        if (typeof line.gapSeconds !== 'number' || Math.abs(line.gapSeconds - t.gapSeconds) > 0.0015) lp.push(`"gapSeconds" is ${line.gapSeconds}; the sidecar's gaps total ${t.gapSeconds} s`);
      }
    }
    r.check('availability lines match their day files and sidecars', lp, `index/${ch.net}.${ch.sta}.${new Date(dayMs).getUTCFullYear()}.json: ${ch.loc}.${ch.cha} ${isoDay(dayMs)}`);
  }
  return { late, lastSampleEndMs, fileSize };
}

/**
 * Does the sidecar's coverage fit its records (7.3, to 4 decimals)? Coverage is counted up to
 * min(day end, publicUntil). A day still filling may have been described at an earlier run,
 * when publicUntil was earlier, if no data have come since: so for such a day the cutoff of
 * the run that wrote the sidecar (its "updated" time minus the delay) is accepted too.
 */
export function coverageFits(sidecar, records, { dayMs, publicUntilMs, delayHours = 0 }) {
  const cutoffs = [publicUntilMs];
  if (isTime(sidecar.updated)) {
    const then = Date.parse(sidecar.updated) - (delayHours || 0) * HOUR_MS;
    if (then > dayMs && then < publicUntilMs) cutoffs.push(then);
  }
  return cutoffs.some((c) => Math.abs(describeDay(records, { dayStartMs: dayMs, publicUntilMs: c }).coverage - sidecar.coverage) <= 0.00011);
}

// --- Web rules (7.2) ----------------------------------------------------------------------

/** The value of a header, from a Headers object or a plain object; null if absent. */
export function header(headers, name) {
  if (!headers) return null;
  if (typeof headers.get === 'function') return headers.get(name);
  const k = Object.keys(headers).find((x) => x.toLowerCase() === name.toLowerCase());
  return k === undefined ? null : String(headers[k]);
}

const tokens = (v) => (v ?? '').split(',').map((t) => t.trim().toLowerCase()).filter(Boolean);

/** CORS headers every response must carry, errors included (7.2). Returns problems. */
export function corsProblems(headers) {
  const p = [];
  const origin = header(headers, 'Access-Control-Allow-Origin');
  if (origin !== '*') p.push(`Access-Control-Allow-Origin is ${origin === null ? 'missing' : `"${origin}"`}; it must be "*"`);
  const need = [
    ['Access-Control-Expose-Headers', ['ETag', 'Content-Range', 'Content-Length', 'Accept-Ranges']],
    ['Access-Control-Allow-Headers', ['Range']],
    ['Access-Control-Allow-Methods', ['GET', 'HEAD', 'OPTIONS']],
  ];
  for (const [name, want] of need) {
    const v = header(headers, name);
    const have = tokens(v);
    const missing = want.filter((w) => !have.includes(w.toLowerCase()) && !have.includes('*'));
    if (missing.length) p.push(v === null ? `${name} is missing (it must list ${want.join(', ')})` : `${name} lacks ${missing.join(', ')}`);
  }
  return p;
}

/** The content type 7.2 asks for, by path. */
export function expectedType(rel) {
  if (rel.endsWith('.json')) return 'application/json';
  if (rel.endsWith('.xml')) return 'application/xml';
  if (parseDayPath(rel)) return 'application/vnd.fdsn.mseed';
  return null;
}

export function contentTypeProblems(rel, headers) {
  const want = expectedType(rel);
  if (!want) return [];
  const got = header(headers, 'Content-Type');
  const media = got?.split(';')[0].trim().toLowerCase();
  return media === want ? [] : [`Content-Type is ${got === null ? 'missing' : `"${got}"`}; the spec asks for ${want}`];
}

/**
 * The caching rule of 7.2 for a path at a time: {cacheControl, lastModified}. Day files and
 * sidecars within the last 35 days are revalidated ("no-cache", with ETag and Last-Modified),
 * because refills can change them; older ones are cached for a day. The index files are
 * revalidated; the station list and StationXML are cached for an hour. All carry an ETag.
 */
export function cacheRule(rel, nowMs) {
  const day = parseDayPath(rel.replace(/\.json$/, ''));
  if (day) {
    return nowMs - day.dayMs <= 35 * DAY_MS
      ? { cacheControl: 'no-cache', lastModified: true } : { cacheControl: 'public, max-age=86400', lastModified: false };
  }
  if (rel === 'index.json' || rel.startsWith('index/')) return { cacheControl: 'no-cache', lastModified: false };
  if (rel === 'stations.json' || rel.startsWith('stations/')) return { cacheControl: 'public, max-age=3600', lastModified: false };
  return null;
}

export function cacheProblems(rel, headers, nowMs) {
  const rule = cacheRule(rel, nowMs);
  if (!rule) return [];
  const p = [];
  const got = header(headers, 'Cache-Control');
  const have = tokens(got);
  const want = tokens(rule.cacheControl);
  if (!want.every((w) => have.includes(w)) || (rule.cacheControl === 'no-cache' && have.some((h) => h === 'no-store'))) {
    p.push(`Cache-Control is ${got === null ? 'missing' : `"${got}"`}; the spec asks for "${rule.cacheControl}"`);
  }
  if (header(headers, 'ETag') === null) p.push('there is no ETag, so browsers cannot revalidate cheaply (304)');
  if (rule.lastModified && header(headers, 'Last-Modified') === null) p.push('there is no Last-Modified');
  return p;
}

/**
 * A ranged answer (7.2): 206, Content-Range "bytes a-b/size", and exactly those bytes.
 * o: {status, headers, body, start, end, whole (the file, if read)}.
 */
export function rangeProblems({ status, headers, body, start, end, whole }) {
  if (status === 200) return ['the server answered 200 with the whole file instead of 206 with the range asked for (7.2: range requests are required on day files)'];
  if (status !== 206) return [`the server answered ${status} to a range request; it should be 206`];
  const p = [];
  const cr = header(headers, 'Content-Range');
  const m = /^bytes (\d+)-(\d+)\/(\d+|\*)$/.exec(cr ?? '');
  if (!m) p.push(`Content-Range is ${cr === null ? 'missing' : `"${cr}"`}; it should be "bytes ${start}-${end}/<size>"`);
  else if (Number(m[1]) !== start || Number(m[2]) !== end) p.push(`Content-Range is "${cr}", but bytes ${start}-${end} were asked for`);
  else if (whole && m[3] !== String(whole.length)) p.push(`Content-Range gives the size as ${m[3]}; the file is ${whole.length} bytes`);
  if (body && body.length !== end - start + 1) p.push(`the answer holds ${body.length} bytes; ${end - start + 1} were asked for`);
  else if (body && whole) {
    for (let i = 0; i < body.length; i++) {
      if (body[i] !== whole[start + i]) { p.push(`the answer's bytes differ from bytes ${start}-${end} of the whole file`); break; }
    }
  }
  return p;
}
