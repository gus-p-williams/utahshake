// Guard rail for links that `mkdocs build --strict` never sees. MkDocs checks Markdown links
// between pages, but these reach the browser untouched:
//  1. href/src in the apps' own HTML (docs/app/**/*.html, not vendor/);
//  2. links the apps' JavaScript writes into the page. They resolve against the URL of the
//     PAGE that loads the script (found via <script src> + static imports), not the .js file;
//  3. raw HTML attributes in Markdown (e.g. the <iframe src> in theory/locating.md), and
//     Markdown links with no file extension, which MkDocs leaves as is. Both resolve
//     against the built page URL (docs/theory/locating.md is served at /theory/locating/).
// Site model (use_directory_urls): /a/b/ <- docs/a/b.md, a/b/index.md or a/b/index.html; /a/f.ext <- docs/a/f.ext.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const DOCS = fileURLToPath(new URL('../docs/', import.meta.url));
const BASE = 'https://site.invalid/_root_'; // sentinel prefix: leaving it = climbing above the site
// Not checked: other sites, mailto:, data:, javascript:, blob:, #same-page, ${template} links.
const SKIP = /^(?:[a-z][\w+.-]*:|\/\/|#|$)|\$\{/i;
const ATTR = /(?<![\w-])(?:href|src)\s*=\s*\\?(["'`])(.*?)\\?\1/g; // href="…", a.href = '…'
const JS_CALL = new RegExp('(?:(?<![\\w-])location\\s*=|location\\.(?:assign|replace)\\(|window\\.open\\(|' +
  'setAttribute\\(\\s*["\'](?:href|src)["\']\\s*,)\\s*(["\'`])(.*?)\\1', 'g');
const MD_LINK = /\]\(\s*<?([^\s)>]+)|^ {0,3}\[[^\]\n]+\]:\s*<?([^\s>]+)/gm;
const IMPORT = /^\s*(?:import|export)\b[^'";]*?\bfrom\s*(['"])(.+?)\1|^\s*import\s*(['"])(.+?)\3/gm;
const SCRIPT = /<script\b[^>]*?\bsrc\s*=\s*(["'])(.+?)\1/g;
const isVendor = (f) => /(^|\/)vendor\//.test(f);
const decode = (s) => { try { return decodeURIComponent(s); } catch { return s; } };
const lineAt = (text, i) => text.slice(0, i).split('\n').length;

/** URL a source file is served at: theory/locating.md -> /theory/locating/. */
function pageUrl(rel) {
  if (!rel.endsWith('.md')) return '/' + rel.replace(/(^|\/)index\.html$/, '$1');
  const p = rel.slice(0, -3).replace(/(^|\/)(index|README)$/, '$1');
  return '/' + p + (p && !p.endsWith('/') ? '/' : '');
}

/** Python-Markdown toc's default slugify. */
const slugify = (s) => s.normalize('NFKD').replace(/[^\x00-\x7f]/g, '')
  .replace(/[^\w\s-]/g, '').trim().toLowerCase().replace(/[-\s]+/g, '-');
const blankComments = (s) => s.replace(/<!--[\s\S]*?-->/g, (c) => c.replace(/[^\n]/g, ''));

/** Blank out comments, fenced code and inline code (keeps line numbers). */
function stripCode(md) {
  let fence = '';
  return blankComments(md).split('\n').map((line) => {
    const f = /^[ \t>]*(`{3,}|~{3,})/.exec(line)?.[1];
    if (fence) { if (f && f[0] === fence[0] && f.length >= fence.length) fence = ''; return ''; }
    if (f) { fence = f; return ''; }
    return line.replace(/(`+).+?\1/g, '');
  }).join('\n');
}

/** Ids a #fragment may target. unsure: some heading (math, HTML, escapes) is too tricky to slug. */
function anchors(text, isMd) {
  const ids = new Set([...text.matchAll(/(?<![\w-])(?:id|name)\s*=\s*["']([^"']+)["']/g)].map((m) => m[1]));
  if (!isMd) return { ids, unsure: false };
  text = stripCode(text);
  for (const m of text.matchAll(/\{[^}\n]*?#([\w-]+)[^}\n]*\}/g)) ids.add(m[1]); // attr_list { #id }
  let unsure = false;
  for (const m of text.matchAll(/^[ \t]*#{1,6}[ \t]+(.+?)(?:[ \t]+#+)?[ \t]*$|^(\S.*)\n(?:=+|-+)[ \t]*$/gm)) {
    const raw = m[1] ?? m[2];
    if (/\{[^}]*#[\w-]+[^}]*\}\s*$/.test(raw)) continue; // explicit id, collected above
    unsure ||= /[$\\<&]/.test(raw);
    let id = slugify(raw.replace(/\s*\{[^}]*\}\s*$/, '').replace(/!\[[^\]]*\]\([^)]*\)/g, '')
      .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1').replace(/[`*]|(?<!\w)_+|_+(?!\w)/g, ''));
    // toc's unique(): repeated headings become intro, intro_1, intro_2, ...
    while (!id || ids.has(id)) { const d = /^(.*)_(\d+)$/.exec(id); id = d ? `${d[1]}_${+d[2] + 1}` : `${id}_1`; }
    ids.add(id);
  }
  return { ids, unsure };
}

/** Resolve `link` as written on the page served at `from` (e.g. '/theory/locating/'). */
function resolveLink(link, from, site) {
  const u = new URL(link, BASE + from);
  if (!u.pathname.startsWith('/_root_/')) {
    return { url: '(outside the site)', error: link.startsWith('/')
      ? 'root-absolute path (the site lives under /utahshake/)' : 'climbs above the site root' };
  }
  const url = decode(u.pathname.slice('/_root_'.length));
  const rel = url.slice(1);
  const dir = url.endsWith('/') ? rel : url.endsWith('/index.html') ? rel.slice(0, -'index.html'.length) : null;
  if (dir === null && rel.endsWith('.md')) return { url, error: 'Markdown source is not published: link to …/name/' };
  const tries = dir === null ? [rel]
    : dir ? [dir.slice(0, -1) + '.md', dir + 'index.md', dir + 'index.html'] : ['index.md', 'index.html'];
  const target = tries.find((f) => site.has(f));
  if (!target) {
    const folder = dir === null && [`${rel}.md`, `${rel}/index.md`, `${rel}/index.html`].some((f) => site.has(f));
    return { url, error: folder ? 'is a page folder: add a trailing slash' : `not found (no docs/${tries.join(', docs/')})` };
  }
  const frag = decode(u.hash.slice(1));
  if (frag && /\.(md|html?)$/.test(target)) {
    const { ids, unsure } = anchors(site.read(target), target.endsWith('.md'));
    if (!ids.has(frag) && !unsure) return { url, target, error: `no id "${frag}" in docs/${target}` };
  }
  return { url, target };
}

/** Links (with line numbers) matched by `re`, minus external/placeholder ones. */
const findLinks = (text, re, pick = (m) => m[2]) => [...text.matchAll(re)]
  .map((m) => ({ line: lineAt(text, m.index), link: pick(m) })).filter(({ link }) => !SKIP.test(link));
const jsLinks = (src) => [...findLinks(src, ATTR), ...findLinks(src, JS_CALL)];
const hasExt = (link) => /[^/.]\.\w+$/.test(link.split(/[?#]/)[0]);

// --- Resolver unit tests on a synthetic site ---------------------------------------------
const fake = (files) => ({ has: (f) => f in files, read: (f) => files[f] ?? '' });
const tree = fake({
  'index.md': '# Home', 'theory/index.md': '# The Science', 'app/css/app.css': '',
  'theory/locating.md': '# Locating a quake\n\n## S − P circles\n\n## Try it { #try }\n\n## S − P circles\n',
  'app/wave-race/index.html': '<div id="map"></div>',
});
const on = (from, link) => resolveLink(link, from, tree);

test('resolver: folder URLs map to page.md, folder/index.md or a static index.html', () => {
  assert.equal(on('/theory/waves/', '../locating/').target, 'theory/locating.md');
  assert.equal(on('/theory/locating/', '../').target, 'theory/index.md');
  assert.equal(on('/app/', '../').target, 'index.md');
  assert.equal(on('/theory/locating/', '../../app/wave-race/').target, 'app/wave-race/index.html');
  assert.equal(on('/app/wave-race/', '../css/app.css').target, 'app/css/app.css');
});

test('resolver: missing targets, .md sources, missing slashes and climbing above the root fail', () => {
  assert.match(on('/theory/', '../nope/').error, /not found \(no docs\/nope\.md/);
  assert.match(on('/theory/locating/', '../../../x/').error, /above the site root/);
  assert.match(on('/theory/', '/app/').error, /root-absolute/);
  assert.match(on('/theory/', 'locating.md').error, /Markdown source/);
  assert.match(on('/theory/', '../app/wave-race').error, /trailing slash/);
});

test('resolver: query and fragment are stripped; fragments must match a heading or id', () => {
  const r = on('/theory/locating/', '../../app/wave-race/?embed=1#map');
  assert.deepEqual([r.url, r.target, r.error], ['/app/wave-race/', 'app/wave-race/index.html', undefined]);
  for (const ok of ['#s-p-circles', '#s-p-circles_1', '#try']) assert.equal(on('/theory/', `locating/${ok}`).error, undefined);
  assert.match(on('/theory/', 'locating/#nope').error, /no id "nope"/);
  assert.match(on('/', 'app/wave-race/#nope').error, /no id "nope"/);
});

test('JS scan: written hrefs are found; module imports and computed hrefs are ignored', () => {
  const src = "import { a } from '../lib/geo.js';\nel.innerHTML = `<a href=\"../../x/\">x</a> <a href=\"${u}\">`;\n" +
    "a.href = '../y/';\nb.href = URL.createObjectURL(blob);\nwindow.open('https://usgs.gov/');\nwindow.open('../z/');";
  assert.deepEqual(jsLinks(src).map((l) => [l.line, l.link]), [[2, '../../x/'], [3, '../y/'], [6, '../z/']]);
});

// --- The real tree -------------------------------------------------------------------------
test('every link the browser follows on the built site resolves', (t) => {
  const all = new Set(fs.readdirSync(DOCS, { recursive: true }).map((f) => f.split(path.sep).join('/'))
    .filter((f) => fs.statSync(path.join(DOCS, f), { throwIfNoEntry: false })?.isFile()));
  const site = { has: (f) => all.has(f), read: (f) => fs.readFileSync(path.join(DOCS, f), 'utf8') };
  const ours = [...all].filter((f) => !isVendor(f)).sort();
  const failures = new Set();
  const counts = { 'app HTML': 0, 'app JS': 0, 'Markdown raw HTML': 0, 'Markdown extensionless': 0 };
  const check = (kind, file, links, pages) => {
    for (const { line, link } of links) {
      counts[kind] += 1;
      for (const from of pages) {
        const r = resolveLink(link, from, site);
        if (r.error) failures.add(`docs/${file}:${line} "${link}" (on page ${from}) -> ${r.url}: ${r.error}`);
      }
    }
  };
  // Which pages load each script: <script src> from every HTML page, then static imports.
  const loaders = new Map();
  for (const page of ours.filter((f) => f.endsWith('.html'))) {
    const from = pageUrl(page), seen = new Set();
    const visit = (js) => {
      if (seen.has(js) || isVendor(js)) return;
      seen.add(js);
      (loaders.get(js) ?? loaders.set(js, new Set()).get(js)).add(from);
      const text = site.read(js);
      for (const m of text.matchAll(IMPORT)) {
        const spec = m[2] ?? m[4]; // bare specifiers would be import-map names; none here
        if (!spec.startsWith('.')) continue;
        const dep = path.posix.normalize(path.posix.join(path.posix.dirname(js), spec));
        if (site.has(dep)) visit(dep);
        else failures.add(`docs/${js}:${lineAt(text, m.index)} import "${spec}" -> docs/${dep}: file not found`);
      }
    };
    const html = blankComments(site.read(page));
    for (const m of html.matchAll(SCRIPT)) {
      const { target } = resolveLink(m[2], from, site);
      if (target?.endsWith('.js')) visit(target);
    }
    check('app HTML', page, findLinks(html, ATTR), [from]);
  }
  for (const [js, pages] of loaders) check('app JS', js, jsLinks(site.read(js)), [...pages]);
  for (const md of ours.filter((f) => f.endsWith('.md'))) {
    const text = stripCode(site.read(md));
    check('Markdown raw HTML', md, findLinks(text, ATTR), [pageUrl(md)]);
    const bare = findLinks(text, MD_LINK, (m) => m[1] ?? m[2]).filter((l) => !hasExt(l.link));
    check('Markdown extensionless', md, bare, [pageUrl(md)]);
  }

  t.diagnostic(`links checked: ${Object.entries(counts).map(([k, n]) => `${k} ${n}`).join(', ')}; scripts: ${loaders.size}`);
  // Each scanner must find what exists today, so a regex slip cannot quietly check nothing.
  assert.ok(counts['app HTML'] >= 10, `only ${counts['app HTML']} app HTML links found`);
  assert.ok(counts['app JS'] >= 1, 'no links found in app JS (wave-race writes "About the data")');
  assert.ok(counts['Markdown raw HTML'] >= 1, 'no raw HTML links in Markdown (theory/locating.md has an iframe)');
  assert.ok(failures.size === 0, `${failures.size} broken link(s):\n  ${[...failures].join('\n  ')}`);
});
