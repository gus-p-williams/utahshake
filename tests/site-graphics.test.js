// The small decorative graphics (docs/img/graphics/*.svg, made by tools/figures/site-graphics.mjs)
// are included in pages with pymdownx.snippets: a line  --8<-- "img/graphics/<name>.svg"
// (path relative to docs/). Rules: docs/developers/adding-an-app.md#app-list.
//  - Every snippet line points to a file that exists.
//  - Every graphic is used, is ONE line with NO trailing newline (a newline ends the paragraph
//    after the include and knocks a small picture out of the text beside it), starts with
//    <svg class="uhsn-g uhsn-, is aria-hidden, and has no script, no outside links, no <text>.
//  - Every card on the All apps page has a thumb-*.svg right under its title.
//  - The home page has the banner and its credit line (constraint 5: attribute the data).
//  - A home-page icon sits on the line directly above its text, so it floats beside it.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { lf, stripCode } from './helpers/prototypes.js';

const DOCS = fileURLToPath(new URL('../docs/', import.meta.url));
const GRAPHICS = path.join(DOCS, 'img', 'graphics');
const SNIPPET = /^[ \t]*--8<--[ \t]+"([^"]+)"[ \t]*$/;
const HOW = 'See docs/developers/adding-an-app.md#app-list.';

function markdownFiles(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((d) => {
    const p = path.join(dir, d.name);
    return d.isDirectory() ? markdownFiles(p) : d.name.endsWith('.md') ? [p] : [];
  });
}
const rel = (p) => path.relative(DOCS, p).split(path.sep).join('/');

/** Snippet lines of every page: { page, line (1-based), name (path relative to docs/), lines (the page's lines) }. */
function snippets() {
  const out = [];
  for (const file of markdownFiles(DOCS)) {
    const lines = lf(fs.readFileSync(file, 'utf8')).split('\n');
    const live = stripCode(lines.join('\n')).split('\n'); // same line count; code and comments blanked
    live.forEach((text, i) => {
      const m = SNIPPET.exec(text);
      if (m) out.push({ page: rel(file), line: i + 1, name: m[1], lines });
    });
  }
  return out;
}
const read = (name) => lf(fs.readFileSync(path.join(DOCS, name), 'utf8'));
const graphicFiles = () => (fs.existsSync(GRAPHICS) ? fs.readdirSync(GRAPHICS).filter((f) => f.endsWith('.svg')).sort() : []);

test('every snippet line points to a file that exists', () => {
  const missing = snippets().filter((s) => !fs.existsSync(path.join(DOCS, s.name)))
    .map((s) => `${s.page}:${s.line} includes "${s.name}", which is not under docs/`);
  assert.deepEqual(missing, [], missing.join('\n') + '\nRun node tools/figures/site-graphics.mjs, or fix the path.');
});

test('every graphic is used, is one line with no trailing newline, and is safe and quiet', () => {
  const used = new Set(snippets().map((s) => s.name));
  const files = graphicFiles();
  assert.ok(files.length > 0, 'docs/img/graphics/ has no .svg files; run node tools/figures/site-graphics.mjs');
  const problems = [];
  for (const f of files) {
    const name = `img/graphics/${f}`;
    const svg = fs.readFileSync(path.join(GRAPHICS, f), 'utf8');
    const bad = (why) => problems.push(`${name}: ${why}`);
    if (!used.has(name)) bad(`no page includes it (orphan). Include it with --8<-- "${name}" or delete it`);
    if (/[\r\n]/.test(svg)) bad('must be a single line with no newline, not even at the end (a newline ends the paragraph after the include)');
    if (!svg.startsWith('<svg class="uhsn-g uhsn-')) bad('must start with <svg class="uhsn-g uhsn-<kind>"');
    if (!svg.includes('aria-hidden="true"')) bad('missing aria-hidden="true" (decorative)');
    if (/<script/i.test(svg)) bad('contains <script');
    if (/<text[\s>]/i.test(svg)) bad('contains a <text> element (text inside a Markdown paragraph is processed and unreadable when scaled down)');
    for (const m of svg.matchAll(/\b(?:xlink:)?href\s*=\s*["']([^"']*)["']/g)) {
      if (!m[1].startsWith('#')) bad(`links to "${m[1]}"; only #fragment links are allowed`);
    }
  }
  assert.deepEqual(problems, [], problems.join('\n'));
});

/** Cards of the grids on the All apps page: { title, lines } (the card's lines after its title line). */
function cards() {
  const md = stripCode(read('apps/index.md')).split('\n');
  const out = [];
  let inGrid = false;
  let card = null;
  for (const line of md) {
    if (/<div class="grid cards"/.test(line)) { inGrid = true; continue; }
    if (inGrid && /^<\/div>/.test(line)) { inGrid = false; card = null; continue; }
    if (!inGrid) continue;
    const t = /^- \*\*(.+?)\*\*/.exec(line);
    if (t) { card = { title: t[1].replace(/[[\]]|\([^)]*\)/g, ''), lines: [] }; out.push(card); }
    else if (card) card.lines.push(line);
  }
  return out;
}

test('every card on the All apps page has a thumb-*.svg under its title', () => {
  const cs = cards();
  assert.ok(cs.length >= 8, `expected the grids of docs/apps/index.md to hold at least 8 cards, found ${cs.length}`);
  const problems = [];
  const names = [];
  for (const c of cs) {
    const first = c.lines.filter((l) => l.trim() !== '').slice(0, 2);
    const hit = first.map((l) => SNIPPET.exec(l)?.[1]).find((n) => n && /^img\/graphics\/thumb-[a-z0-9-]+\.svg$/.test(n));
    if (!hit) {
      problems.push(`card "${c.title}" has no picture: add a draw function to tools/figures/site-graphics.mjs, rerun it, and put --8<-- "img/graphics/thumb-<app>.svg" on its own paragraph right under the title. ${HOW}`);
      continue;
    }
    names.push(hit);
    const i = c.lines.findIndex((l) => SNIPPET.test(l));
    if (i > 0 && c.lines[i - 1].trim() !== '') problems.push(`card "${c.title}": the picture must be its own paragraph (blank line above it)`);
    if (c.lines[i + 1] !== undefined && c.lines[i + 1].trim() !== '') problems.push(`card "${c.title}": the picture must be its own paragraph (blank line below it)`);
  }
  const dup = names.filter((n, i) => names.indexOf(n) !== i);
  if (dup.length) problems.push(`the same thumb is used on two cards: ${[...new Set(dup)].join(', ')}`);
  const unused = graphicFiles().filter((f) => f.startsWith('thumb-')).map((f) => `img/graphics/${f}`).filter((n) => !names.includes(n));
  if (unused.length) problems.push(`thumbs with no card on the All apps page: ${unused.join(', ')}`);
  assert.deepEqual(problems, [], problems.join('\n'));
});

test('the home page has the banner followed by a credit line naming UU and USGS', () => {
  const lines = read('index.md').split('\n');
  const i = lines.findIndex((l) => SNIPPET.exec(l)?.[1] === 'img/graphics/home-banner.svg');
  assert.ok(i >= 0, 'docs/index.md must include --8<-- "img/graphics/home-banner.svg"');
  // the caption paragraph: the first paragraph after the banner
  let j = i + 1;
  while (j < lines.length && lines[j].trim() === '') j++;
  const caption = [];
  while (j < lines.length && lines[j].trim() !== '') caption.push(lines[j++]);
  const text = caption.join('\n');
  assert.ok(/^\{: \.uhsn-caption \}\s*$/m.test(text), 'the paragraph after the banner must end with a line {: .uhsn-caption }');
  assert.ok(/University of Utah/.test(text), 'the banner caption must credit the University of Utah Seismograph Stations (constraint 5)');
  assert.ok(/USGS/.test(text), 'the banner caption must credit the USGS earthquake catalog (constraint 5)');
});

test('an icon is on the line directly above the text it floats beside', () => {
  const problems = [];
  for (const s of snippets().filter((x) => /^img\/graphics\/icon-/.test(x.name))) {
    const next = s.lines[s.line]; // 0-based index s.line is the line after the snippet
    if (next === undefined || next.trim() === '') {
      problems.push(`${s.page}:${s.line}: icon "${s.name}" is followed by a blank line; put the text on the very next line so they stay in one paragraph`);
    } else if (/^[ \t]*--8<--/.test(next)) {
      problems.push(`${s.page}:${s.line}: icon "${s.name}" is followed by another snippet, not text`);
    }
  }
  assert.deepEqual(problems, [], problems.join('\n'));
});
