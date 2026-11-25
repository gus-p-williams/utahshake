// Tiny static server for trying the apps locally without MkDocs:
//
//   node tools/serve.mjs            -> http://127.0.0.1:8001/app/wave-race/
//   node tools/serve.mjs 9000 site      (serve a built MkDocs site instead)
//
// Serves docs/ with correct MIME types (ES modules need text/javascript,
// which some Windows Python setups get wrong). Open an app at its own address
// (/app/wave-race/, /app/quake-waves/): pages built from Markdown are not here,
// so /app/ (which forwards to the All apps page, /apps/), the guides and the
// apps' top-bar links give "not found". For the full site, use `mkdocs serve`.
//
// It also behaves the way the UHSN data specification asks DRI's server to (spec 7.2), so
// the School Shake viewer can read a test tree (data/uhsn-demo/, or tools/uhsn-test/out/
// served as its own folder) exactly as it will read the real one:
//   - `Range: bytes=a-b` is answered with 206 and Content-Range (416 if impossible), and
//     every answer says `Accept-Ranges: bytes`;
//   - CORS headers on every response, 404 included, and OPTIONS is answered with 204;
//   - SDS day files (names ending .D.<YYYY>.<DDD>) are application/vnd.fdsn.mseed.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Optional second argument: another folder to serve, e.g. a built `site/`.
const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(process.argv[3] || path.join(here, '../docs'));
const port = Number(process.argv[2] || 8001);
const TYPES = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.json': 'application/json', '.png': 'image/png', '.svg': 'image/svg+xml',
  '.mseed': 'application/vnd.fdsn.mseed', '.txt': 'text/plain; charset=utf-8',
  '.xml': 'application/xml',
  '.md': 'text/plain; charset=utf-8',
};

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Expose-Headers': 'ETag, Content-Range, Content-Length, Accept-Ranges',
  'Access-Control-Allow-Headers': 'Range',
  'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
};
const typeOf = (file) => (/\.D\.\d{4}\.\d{3}$/.test(file) ? 'application/vnd.fdsn.mseed'
  : TYPES[path.extname(file)] || 'application/octet-stream');

/** "bytes=a-b", "bytes=a-" or "bytes=-n" -> [start, end] inclusive; null if impossible. */
function parseRange(header, size) {
  const m = /^bytes=(\d*)-(\d*)$/.exec(header.trim());
  if (!m || (m[1] === '' && m[2] === '')) return null;
  const start = m[1] === '' ? Math.max(0, size - Number(m[2])) : Number(m[1]);
  const end = m[1] === '' || m[2] === '' ? size - 1 : Math.min(Number(m[2]), size - 1);
  if (m[1] === '' && Number(m[2]) === 0) return null;
  return start <= end && start < size ? [start, end] : null;
}

const server = http.createServer((req, res) => {
  if (req.method === 'OPTIONS') { res.writeHead(204, CORS).end(); return; }
  const url = new URL(req.url, 'http://localhost');
  let file = path.normalize(path.join(root, decodeURIComponent(url.pathname)));
  if (!file.startsWith(root)) { res.writeHead(403, CORS).end(); return; }
  if (fs.existsSync(file) && fs.statSync(file).isDirectory()) file = path.join(file, 'index.html');
  fs.readFile(file, (err, body) => {
    if (err) { res.writeHead(404, { ...CORS, 'Content-Type': 'text/plain' }).end('not found'); return; }
    const head = { ...CORS, 'Content-Type': typeOf(file), 'Cache-Control': 'no-store',
      'Accept-Ranges': 'bytes' };
    let status = 200;
    if (req.headers.range) {
      const range = parseRange(req.headers.range, body.length);
      if (!range) {
        res.writeHead(416, { ...head, 'Content-Range': `bytes */${body.length}` }).end();
        return;
      }
      head['Content-Range'] = `bytes ${range[0]}-${range[1]}/${body.length}`;
      body = body.subarray(range[0], range[1] + 1);
      status = 206;
    }
    head['Content-Length'] = body.length;
    res.writeHead(status, head);
    res.end(req.method === 'HEAD' ? undefined : body);
  });
});
// Port 0 picks a free port; the first line printed says which (tests read it).
server.listen(port, '127.0.0.1', () => console.log(`Serving ${root} at http://127.0.0.1:${server.address().port}/\n` +
  '(apps only, e.g. /app/wave-race/; the All apps page /apps/ and the guides need `mkdocs serve`)'));
