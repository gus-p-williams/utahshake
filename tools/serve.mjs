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
  '.md': 'text/plain; charset=utf-8',
};

http.createServer((req, res) => {
  const url = new URL(req.url, 'http://localhost');
  let file = path.normalize(path.join(root, decodeURIComponent(url.pathname)));
  if (!file.startsWith(root)) { res.writeHead(403).end(); return; }
  if (fs.existsSync(file) && fs.statSync(file).isDirectory()) file = path.join(file, 'index.html');
  fs.readFile(file, (err, body) => {
    if (err) { res.writeHead(404, { 'Content-Type': 'text/plain' }).end('not found'); return; }
    res.writeHead(200, { 'Content-Type': TYPES[path.extname(file)] || 'application/octet-stream',
      'Cache-Control': 'no-store' });
    res.end(body);
  });
}).listen(port, '127.0.0.1', () => console.log(`Serving docs/ at http://127.0.0.1:${port}/app/wave-race/\n` +
  '(apps only; the All apps page /apps/ and the guides need `mkdocs serve`)'));
