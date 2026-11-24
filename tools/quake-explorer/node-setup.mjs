// Shared setup for the Quake Explorer tools (run with node, not in the browser).
//
// - Loads the app's own modules, so the numbers the tools report come from the
//   same code students use.
// - Caches every web request on disk (default: <system temp>/uhsn-qexp-cache,
//   or set QEXP_CACHE), so re-runs are fast and polite to EarthScope and USGS.
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';
import { fileURLToPath, pathToFileURL } from 'node:url';

// The seisplotjs bundle registers a web component when loaded; give node a stub.
globalThis.HTMLElement ??= class {};
globalThis.customElements ??= { define() {}, get() {} };

export const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
/** Import a module from docs/app/js/, e.g. app('lib/geo.js'). */
export const app = (p) => import(pathToFileURL(path.join(root, 'docs/app/js', p)).href);

const cacheDir = process.env.QEXP_CACHE || path.join(os.tmpdir(), 'uhsn-qexp-cache');
const realFetch = globalThis.fetch;
let requests = 0;

globalThis.fetch = async (url, opts = {}) => {
  const key = crypto.createHash('sha1').update(`${url}|${opts.method || 'GET'}|${opts.body || ''}`)
    .digest('hex');
  const file = path.join(cacheDir, key);
  if (fs.existsSync(file) && fs.existsSync(`${file}.status`)) {
    const status = Number(fs.readFileSync(`${file}.status`, 'utf8'));
    return new Response(status === 204 ? null : fs.readFileSync(file), { status });
  }
  requests++;
  const res = await realFetch(url, opts);
  const buf = Buffer.from(await res.arrayBuffer());
  if (res.ok || res.status === 204) {
    fs.mkdirSync(cacheDir, { recursive: true });
    fs.writeFileSync(file, buf);
    fs.writeFileSync(`${file}.status`, String(res.status));
  }
  return new Response(res.status === 204 ? null : buf, { status: res.status, statusText: res.statusText });
};

/** How many requests actually went to the network (not the cache). */
export const networkRequests = () => requests;

/** Command-line options: positional args and --key value pairs. */
export function parseArgs(argv = process.argv.slice(2)) {
  const out = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i].startsWith('--')) {
      const k = argv[i].slice(2);
      const v = argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[++i] : true;
      out[k] = v;
    } else out._.push(argv[i]);
  }
  return out;
}

/** Plain-text table for the console. */
export function table(rows, cols) {
  const w = cols.map((c) => Math.max(c.length, ...rows.map((r) => String(r[c] ?? '').length)));
  const line = (vals) => vals.map((v, i) => String(v ?? '').padStart(w[i])).join('  ');
  return [line(cols), line(w.map((n) => '-'.repeat(n))), ...rows.map((r) => line(cols.map((c) => r[c])))]
    .join('\n');
}
