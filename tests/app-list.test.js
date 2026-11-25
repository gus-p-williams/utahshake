// Every app page must be on the one list of apps, docs/apps/index.md (decision D17), so
// nothing students can open is missing from the menus. An app page is a folder
// docs/app/<name>/ with an index.html, except the shared folders (vendor, js, css, data)
// and redirect stubs: old addresses kept so links keep working, marked in their <head> with
//   <meta name="uhsn-redirect" content="<new address>">
// "On the list" means a Markdown link whose address contains ../app/<name>/
// (for example [Open Quake Locator](../app/wave-race/index.html)).
//
// Prototypes (docs/developers/adding-an-app.md#in-development) are the apps listed in the
// page's "## In development: please test" section (parser: tests/helpers/prototypes.js).
// A prototype app shows the Prototype badge, <span class="badge prototype">, in its top bar,
// and its hub is in mkdocs.yml under Apps › In development. Other apps have neither, so an
// app that graduates must drop the badge and move its menu entry.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { APP_LIST as APP_LIST_URL, lf, markdownLinks, prototypes, sitePrototypes } from './helpers/prototypes.js';

const APP_DIR = fileURLToPath(new URL('../docs/app/', import.meta.url));
const APP_LIST = fileURLToPath(APP_LIST_URL);
const MKDOCS = fileURLToPath(new URL('../mkdocs.yml', import.meta.url));
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

// markdownLinks(md), from tests/helpers/prototypes.js: the addresses of the Markdown links in
// `md` ([text](address) and [ref]: address), ignoring comments and code.

/** Folders in `folders` that no link in `links` points to. */
const unlisted = (folders, links) => folders.filter((name) => !links.some((l) => l.includes(`../app/${name}/`)));

/** Does `html` show the Prototype badge (an element with classes "badge" and "prototype")?
 *  With `topbarOnly`, only inside <header class="topbar">…</header>. HTML comments don't count. */
function hasPrototypeBadge(html, { topbarOnly = false } = {}) {
  let text = html.replace(/<!--[\s\S]*?-->/g, '');
  if (topbarOnly) {
    text = /<header\b[^>]*\bclass\s*=\s*["'][^"']*\btopbar\b[^"']*["'][^>]*>([\s\S]*?)<\/header>/i.exec(text)?.[1] ?? '';
  }
  return [...text.matchAll(/\bclass\s*=\s*(["'])(.*?)\1/g)]
    .some((m) => { const cls = m[2].split(/\s+/); return cls.includes('badge') && cls.includes('prototype'); });
}

/** Hub slugs in mkdocs.yml's nav under Apps › In development (null if there is no such group). */
function navInDevelopment(yml) {
  const indent = (l) => /^ */.exec(l)[0].length;
  /** The lines nested under the first line matching `re` (blank lines and comments dropped). */
  const nested = (lines, re) => {
    const i = lines?.findIndex((l) => re.test(l)) ?? -1;
    if (i < 0) return null;
    const out = [];
    for (const l of lines.slice(i + 1)) {
      if (!l.trim() || /^\s*#/.test(l)) continue;
      if (indent(l) <= indent(lines[i])) break;
      out.push(l);
    }
    return out;
  };
  const group = nested(nested(nested(lf(yml).split('\n'), /^nav:\s*$/), /^\s*- Apps:\s*$/), /^\s*- In development:\s*$/);
  return group && [...new Set(group.map((l) => /\bapps\/([a-z0-9-]+)\.md\b/.exec(l)?.[1]).filter(Boolean))].sort();
}

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
    '[Open Quake Locator](../app/wave-race/index.html){ .md-button }',
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

test('prototype check: links in the In development section are prototypes; the top grid and Animations are not', () => {
  const md = [
    '# All apps', '',
    'See [In development](#in-development).', '',
    '<div class="grid cards" markdown>', '',
    '- **Top app**', '',
    '    [Open Top app](../app/top-app/index.html){ .md-button .md-button--primary }', '',
    '    [Top app guide](top-app.md)', '',
    '</div>', '',
    '## In development: please test { #in-development }', '',
    'Send what you find to Gus.', '',
    '<div class="grid cards" markdown>', '',
    '- **Proto app**', '',
    '    *Prototype, for adult testers.*', '',
    '    [Open Proto app](../app/proto-app/index.html){ .md-button .md-button--primary }', '',
    '    [Proto app guide](proto-app.md) · [Its science](../theory/waves.md#two-body-waves)', '',
    '<!-- [Hidden](../app/hidden-proto/index.html) [Hidden guide](hidden-proto.md) -->',
    '```', '## Not a heading in code', '[In code](../app/in-code/)', '```', '',
    '### A subheading stays in the section', '',
    '[Proto two](../app/proto-two/index.html)', '',
    '</div>', '',
    '## Animations', '',
    '[Open the animation](../app/cartoon/index.html){ .md-button }', '',
    '[Cartoon notes](cartoon.md)',
  ];
  // Windows checkouts have CRLF line endings; both must parse the same.
  for (const md2 of [md.join('\n'), md.join('\r\n')]) {
    assert.deepEqual(prototypes(md2), { apps: ['proto-app', 'proto-two'], hubs: ['proto-app'] });
    // Prototypes still count as listed for the app-list check, like every other card.
    assert.deepEqual(unlisted(['top-app', 'proto-app', 'proto-two', 'cartoon', 'hidden-proto', 'in-code'], markdownLinks(md2)),
      ['hidden-proto', 'in-code']);
  }
  // No section, no prototypes.
  assert.deepEqual(prototypes(md.slice(0, md.indexOf('</div>')).join('\n')), { apps: [], hubs: [] });
});

test('badge check: the Prototype badge counts in the top bar, not in comments or elsewhere when topbarOnly', () => {
  const bar = (h1) => `<header class="topbar">\n  <div class="brand"><h1>${h1}</h1></div>\n</header>\n<main></main>`;
  assert.equal(hasPrototypeBadge(bar('X <span class="badge prototype" title="t">Prototype</span>'), { topbarOnly: true }), true);
  assert.equal(hasPrototypeBadge(bar("X <span class='prototype badge'>Prototype</span>"), { topbarOnly: true }), true);
  assert.equal(hasPrototypeBadge(bar('X <!-- <span class="badge prototype">Prototype</span> -->')), false);
  assert.equal(hasPrototypeBadge(bar('X <span class="badge live">Live data</span>')), false);
  assert.equal(hasPrototypeBadge(bar('X <span class="badge-prototype">P</span>')), false);
  const outside = bar('X') + '\n<p><span class="badge prototype">Prototype</span></p>';
  assert.equal(hasPrototypeBadge(outside, { topbarOnly: true }), false);
  assert.equal(hasPrototypeBadge(outside), true);
});

test('nav check: hubs nested under nav › Apps › In development', () => {
  const yml = [
    'validation:', '  nav:', '    omitted_files: warn', '  - In development:', '      - X: apps/not-nav.md',
    'nav:', '  - Home: index.md', '  - Apps:', '      - apps/index.md', '      - Top: apps/top-app.md',
    '      - In development:', '          # a comment', '          - Proto: apps/proto-app.md', '',
    '          - Two: apps/proto-two.md', '  - Teachers:', '      - In development:', '          - T: apps/teachers-only.md',
  ].join('\r\n');
  assert.deepEqual(navInDevelopment(yml), ['proto-app', 'proto-two']);
  assert.equal(navInDevelopment('nav:\n  - Apps:\n      - Top: apps/top-app.md\n'), null);
});

// --- The real site ------------------------------------------------------------------------------
test('every app page in docs/app/ is linked from docs/apps/index.md', (t) => {
  const folders = appFolders(APP_DIR);
  t.diagnostic(`app pages: ${folders.join(', ')}`);
  assert.ok(folders.includes('wave-race'), 'the folder scan found no wave-race folder: is APP_DIR right?');
  const missing = unlisted(folders, markdownLinks(fs.readFileSync(APP_LIST, 'utf8')));
  assert.deepEqual(missing, [], missing.map((name) => `docs/app/${name}/ is not on docs/apps/index.md: add a card ` +
    `with a link to ../app/${name}/index.html (or, if the folder only forwards to a new address, mark its page ` +
    'with <meta name="uhsn-redirect" content="…">)').join('\n'));
});

test('prototype apps (In development on All apps) show the Prototype badge in their top bar; no other app does', (t) => {
  const folders = appFolders(APP_DIR);
  const { apps } = sitePrototypes();
  t.diagnostic(`prototype apps: ${apps.join(', ') || 'none'}`);
  for (const name of apps) {
    assert.ok(folders.includes(name), `the In development section of docs/apps/index.md links ../app/${name}/, ` +
      `which is not an app page in docs/app/`);
  }
  for (const name of folders) {
    const html = fs.readFileSync(path.join(APP_DIR, name, 'index.html'), 'utf8');
    if (apps.includes(name)) {
      assert.ok(hasPrototypeBadge(html, { topbarOnly: true }), `docs/app/${name}/index.html is a prototype (In development ` +
        'on docs/apps/index.md): put <span class="badge prototype">Prototype</span> in the h1 of its <header class="topbar">');
    } else {
      assert.ok(!hasPrototypeBadge(html), `docs/app/${name}/index.html shows the Prototype badge but is not in the ` +
        'In development section of docs/apps/index.md: drop the badge (it graduated) or move its card there');
    }
  }
});

test('prototype hubs are in mkdocs.yml under Apps › In development, and no other hub is', (t) => {
  const { hubs } = sitePrototypes();
  const nav = navInDevelopment(fs.readFileSync(MKDOCS, 'utf8'));
  t.diagnostic(`prototype hubs: ${hubs.join(', ') || 'none'}; nav Apps › In development: ${nav?.join(', ') ?? 'no group'}`);
  if (hubs.length) assert.ok(nav, 'mkdocs.yml: add a group "- In development:" under nav › Apps for the prototype hubs');
  for (const slug of hubs) {
    assert.ok(nav.includes(slug), `apps/${slug}.md is linked from the In development section of docs/apps/index.md: ` +
      `list it in mkdocs.yml under Apps › In development (link only a prototype's own guide in that section)`);
  }
  for (const slug of nav ?? []) {
    assert.ok(hubs.includes(slug), `mkdocs.yml lists apps/${slug}.md under Apps › In development, but the In development ` +
      `section of docs/apps/index.md does not link ${slug}.md: if the app graduated, move its menu entry up into Apps`);
  }
});
