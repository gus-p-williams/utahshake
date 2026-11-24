// The app once called "Wave Race" is Quake Locator (Gus, 2026-11-24). Only its name changed:
// the folder app/wave-race/, the pages apps/wave-race.md and teachers/wave-race-card.md, the
// WAVE_RACE config and the storage keys keep the old spelling, so no link breaks. This test
// keeps the old name out of everything a reader sees, so a branch started before the rename
// can't bring it back: the pages (docs/**/*.md), the figures (docs/**/*.svg), the apps
// (docs/app/**/*.html, .js, .css, comments included), the menu (mkdocs.yml) and the README.
// The one exception is the note on docs/developers/wave-race.md that explains the folder name.
// Folder and file names (wave-race) are not the name, so they don't count.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('../', import.meta.url));
const OLD_NAME = /\bwave\s+race\b/gi;   // also finds it split across two lines
const ALLOWED = { 'docs/developers/wave-race.md': 1 };   // the developer note, once
const SKIP_DIRS = new Set(['vendor', 'data', 'node_modules']);   // third-party bundles, samples
const EXTENSIONS = new Set(['.md', '.svg', '.html', '.js', '.css']);

/** Files under `dir` (relative to the repo, forward slashes) with the listed extensions. */
function files(dir) {
  const out = [];
  for (const d of fs.readdirSync(path.join(ROOT, dir), { withFileTypes: true })) {
    const rel = `${dir}/${d.name}`;
    if (d.isDirectory()) { if (!SKIP_DIRS.has(d.name)) out.push(...files(rel)); }
    else if (EXTENSIONS.has(path.extname(d.name))) out.push(rel);
  }
  return out;
}

const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');

test('the old name "Wave Race" is not on the site, in the apps or in the README', () => {
  const checked = [...files('docs'), 'mkdocs.yml', 'README.md'];
  assert.ok(checked.includes('docs/app/wave-race/index.html'), 'the file scan missed the app page: is ROOT right?');
  const found = [];
  for (const rel of checked) {
    const text = read(rel);
    const hits = [...text.matchAll(OLD_NAME)];
    if (hits.length > (ALLOWED[rel] ?? 0)) {
      for (const h of hits) found.push(`${rel}:${text.slice(0, h.index).split('\n').length}`);
    }
  }
  assert.deepEqual(found, [], 'Say "Quake Locator" instead of "Wave Race" (addresses and folder names stay wave-race)');
});

test('the app page is titled Quake Locator', () => {
  const html = read('docs/app/wave-race/index.html');
  assert.match(html, /<title>Quake Locator\b/);
  assert.match(html, /<h1>Quake Locator\b/);
});
