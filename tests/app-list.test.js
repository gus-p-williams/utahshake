// Every app page must be on the one list of apps, docs/apps/index.md (decision D17), so
// nothing students can open is missing from the menus. An app page is a folder
// docs/app/<name>/ with an index.html, except the shared folders (vendor, js, css, data)
// and redirect stubs: old addresses kept so links keep working, marked in their <head> with
//   <meta name="uhsn-redirect" content="<new address>">
// "On the list" means a Markdown link whose address contains ../app/<name>/
// (for example [Open Wave Race](../app/wave-race/index.html)).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const APP_DIR = fileURLToPath(new URL('../docs/app/', import.meta.url));
const APP_LIST = fileURLToPath(new URL('../docs/apps/index.md', import.meta.url));
const SHARED = new Set(['vendor', 'js', 'css', 'data']);
const REDIRECT = /<meta\b[^>]*\bname\s*=\s*["']uhsn-redirect["']/i;

/** Names of the folders in `dir` that hold an app page (sorted). */
function appFolders(dir) {
  return fs.readdirSync(dir, { withFileTypes: true })
    .filter((d) => d.isDirectory() && !SHARED.has(d.name))
    .filter((d) => {
      const page = path.join(dir, d.name, 'index.html');
      return fs.existsSync(page) && !REDIRECT.test(fs.readFileSync(page, 'utf8'));
    })
    .map((d) => d.name)
    .sort();
}

/** Addresses of the Markdown links in `md` ([text](address) and [ref]: address), ignoring comments and code. */
function markdownLinks(md) {
  let fence = '';
  const text = md.replace(/<!--[\s\S]*?-->/g, '').split('\n').map((line) => {
    const f = /^[ \t>]*(`{3,}|~{3,})/.exec(line)?.[1];
    if (fence) { if (f && f[0] === fence[0] && f.length >= fence.length) fence = ''; return ''; }
    if (f) { fence = f; return ''; }
    return line.replace(/(`+).+?\1/g, '');
  }).join('\n');
  return [...text.matchAll(/\]\(\s*<?([^\s)>]+)|^ {0,3}\[[^\]\n]+\]:\s*<?([^\s>]+)/gm)].map((m) => m[1] ?? m[2]);
}

/** Folders in `folders` that no link in `links` points to. */
const unlisted = (folders, links) => folders.filter((name) => !links.some((l) => l.includes(`../app/${name}/`)));

// --- Unit checks on a made-up tree -----------------------------------------------------------
test('folder scan: app pages only (no shared folders, redirect stubs or folders without a page)', (t) => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'uhsn-app-list-'));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  const put = (rel, text = '<!DOCTYPE html><title>x</title>') => {
    fs.mkdirSync(path.dirname(path.join(dir, rel)), { recursive: true });
    fs.writeFileSync(path.join(dir, rel), text);
  };
  put('index.html', '<meta name="uhsn-redirect" content="../apps/">'); // the old launcher: a file, not a folder
  put('zeta-app/index.html');
  put('alpha-app/index.html');
  put('old-name/index.html', '<head><meta charset="utf-8">\n  <meta name="uhsn-redirect" content="../alpha-app/">');
  put('vendor/index.html');
  put('css/app.css', '');
  put('js/alpha-app/app.js', '');
  put('data/samples/x/event.json', '{}');
  put('notes/readme.txt', '');
  assert.deepEqual(appFolders(dir), ['alpha-app', 'zeta-app']);
});

test('list check: a Markdown link containing ../app/<name>/ counts; comments, code and look-alikes do not', () => {
  const md = [
    '[Open Wave Race](../app/wave-race/index.html){ .md-button }',
    '[ref]: ../app/ref-app/',
    '<!-- [Hidden](../app/hidden/index.html) -->',
    '```', '[In code](../app/in-code/)', '```',
    'Inline `[x](../app/inline/)` code.',
    '[Similar](../app/wave-race-2/index.html)',
    'Plain text ../app/plain/ is not a link.',
  ].join('\n');
  const links = markdownLinks(md);
  assert.deepEqual(unlisted(['wave-race', 'ref-app', 'hidden', 'in-code', 'inline', 'plain', 'wave-race-2'], links),
    ['hidden', 'in-code', 'inline', 'plain']);
  assert.deepEqual(unlisted(['wave-race'], ['../app/wave-race-2/index.html']), ['wave-race']);
});

// --- The real site ------------------------------------------------------------------------------
test('every app page in docs/app/ is linked from docs/apps/index.md', (t) => {
  const folders = appFolders(APP_DIR);
  t.diagnostic(`app pages: ${folders.join(', ')}`);
  assert.ok(folders.includes('wave-race'), 'the folder scan found no Wave Race: is APP_DIR right?');
  const missing = unlisted(folders, markdownLinks(fs.readFileSync(APP_LIST, 'utf8')));
  assert.deepEqual(missing, [], missing.map((name) => `docs/app/${name}/ is not on docs/apps/index.md: add a card ` +
    `with a link to ../app/${name}/index.html (or, if the folder only forwards to a new address, mark its page ` +
    'with <meta name="uhsn-redirect" content="…">)').join('\n'));
});
