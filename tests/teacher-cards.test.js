// Teacher activity cards and the app hubs stay linked both ways (decision D19), and the
// places that summarize a card agree with the card itself.
//
// A card is a page in docs/teachers/ other than NOT_CARDS (below). Each card opens with the same
// "At a glance" box (docs/developers/adding-a-card.md):
//   !!! abstract "At a glance"
//       - **Driving question:** …   **Time:** …   **Setup:** …   **Apps and tools:** …
//       - **Before this:** …   **Materials:** …   **Utah standards:** … ([crosswalk](standards.md#…))
// The apps a card uses are the links in its "Apps and tools" line: hubs (../apps/<slug>.md)
// and app folders without a hub (../app/<slug>/). "Before this" names an earlier lesson, not
// an app the card uses (D25). An app hub is a page in docs/apps/ other than index.md; its
// "At a glance" box has a "For teachers" line listing the cards.
//
// Prototypes, the apps in "In development: please test" on the All apps page
// (docs/developers/adding-an-app.md#in-development; parser in tests/helpers/prototypes.js),
// need no card yet: they get one when they move into the main list. The other checks still
// apply: a prototype hub has the box, its "For teachers" line says "none yet: …", and any
// card it lists must name it.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { sitePrototypes } from './helpers/prototypes.js';

const DOCS = new URL('../docs/', import.meta.url);
// Files may have Windows line endings (CRLF) on checkout; the parsers expect \n.
const lf = (s) => s.replace(/\r\n/g, '\n');
const read = (rel) => lf(fs.readFileSync(new URL(rel, DOCS), 'utf8'));
const mdFiles = (dir) => fs.readdirSync(new URL(dir, DOCS)).filter((f) => f.endsWith('.md')).sort();

// Teachers pages that are not activity cards: the section page, the crosswalk, and the
// phyphox page (guidance for clubs and research with an installed app, not a lesson).
const NOT_CARDS = new Set(['index.md', 'standards.md', 'phyphox.md']);
const BOX_LABELS = ['Driving question', 'Time', 'Setup', 'Apps and tools', 'Before this',
  'Materials', 'Utah standards'];
const SETUPS = ['Browser only', 'School Shake', 'Roaming Shake', 'Phones'];
const CODE = /\b(?:PHYS|ESS|GEOL|CHEM|BIO|ES)\.\d+\.(?:\d+|x)\b|\bCS(?:&nbsp;|\s)\d+\/\d+\.[A-Z]+\.\d+\b/g;

/** Items of the page's "At a glance" box as {label: text}, in order (null if no box). */
function glanceBox(md) {
  const lines = md.split('\n');
  const start = lines.findIndex((l) => /^!!! abstract "At a glance"\s*$/.test(l));
  if (start < 0) return null;
  const items = [];
  for (const line of lines.slice(start + 1)) {
    if (line.trim() && !line.startsWith('    ')) break;
    const m = /^ {4}- \*\*(.+?):\*\*\s*(.*)$/.exec(line);
    if (m) items.push({ label: m[1], text: m[2] });
    else if (line.trim() && items.length) items.at(-1).text += ` ${line.trim()}`;
  }
  return items;
}

const codes = (s) => [...new Set((s.match(CODE) || []).map((c) => c.replace('&nbsp;', ' ').replace(/\s+/, ' ')))].sort();
const hubLinks = (s) => [...new Set([...s.matchAll(/\.\.\/apps\/([a-z0-9-]+)\.md/g)].map((m) => m[1]))].sort();
const appLinks = (s) => [...new Set([...s.matchAll(/\.\.\/app\/([a-z0-9-]+)\//g)].map((m) => m[1]))].sort();
const cardLinks = (s, prefix) => [...new Set([...s.matchAll(new RegExp(`${prefix}([a-z0-9-]+)\\.md`, 'g'))]
  .map((m) => `${m[1]}.md`).filter((f) => !NOT_CARDS.has(f)))].sort();

/** The section of a page from the heading matching `re` up to the next heading of that level or higher. */
function section(md, re) {
  const lines = md.split('\n');
  const i = lines.findIndex((l) => re.test(l));
  assert.ok(i >= 0, `section ${re} not found`);
  const level = /^#+/.exec(lines[i])[0].length;
  const end = lines.findIndex((l, j) => j > i && /^#+ /.test(l) && /^#+/.exec(l)[0].length <= level);
  return lines.slice(i, end < 0 ? undefined : end);
}

/** Table rows (as cell arrays) in `lines` whose first cell links to a card, keyed by card file. */
function rowsByCard(lines) {
  const rows = {};
  let sub = null;
  for (const line of lines) {
    const h = /^###\s+(.+?)\s*(\{.*\})?\s*$/.exec(line);
    if (h) sub = h[1];
    if (!line.startsWith('|')) continue;
    const cells = line.split('|').slice(1, -1).map((c) => c.trim());
    const card = /^\[[^\]]+\]\(([a-z0-9-]+\.md)\)/.exec(cells[0])?.[1];
    if (!card || NOT_CARDS.has(card)) continue;
    (rows[card] ??= []).push({ cells, sub });
  }
  return rows;
}

const cards = mdFiles('teachers/').filter((f) => !NOT_CARDS.has(f)).map((file) => {
  const md = read(`teachers/${file}`);
  const box = glanceBox(md);
  const get = (label) => box?.find((b) => b.label === label)?.text ?? '';
  const apps = get('Apps and tools');
  return { file, md, box, setup: get('Setup'), standards: get('Utah standards'),
    hubs: hubLinks(apps), folders: appLinks(apps) };
});
const hubs = mdFiles('apps/').filter((f) => f !== 'index.md').map((file) => {
  const box = glanceBox(read(`apps/${file}`));
  const teachers = box?.find((b) => b.label === 'For teachers')?.text ?? '';
  return { slug: file.replace(/\.md$/, ''), box, teachers, cards: cardLinks(teachers, '\\.\\./teachers/') };
});
const setupOf = (c) => SETUPS.find((s) => c.setup.startsWith(s));
const proto = sitePrototypes(); // { apps, hubs } exempt from needing a card

test('there are cards and hubs to check', () => {
  assert.ok(cards.length >= 6, `${cards.length} cards`);
  assert.ok(hubs.length >= 3, `${hubs.length} hubs`);
});

test('every card opens with the same "At a glance" box', () => {
  for (const c of cards) {
    assert.ok(c.box, `${c.file}: no "At a glance" box`);
    assert.deepEqual(c.box.map((b) => b.label), BOX_LABELS, `${c.file}: box lines`);
    for (const b of c.box) assert.ok(b.text.trim(), `${c.file}: "${b.label}" is empty`);
    assert.ok(setupOf(c), `${c.file}: Setup must start with one of ${SETUPS.join(', ')}`);
    assert.ok(c.hubs.length + c.folders.length > 0 || /\bno app\b/i.test(c.box[3].text),
      `${c.file}: "Apps and tools" links no app (write "no app" if that is right)`);
    assert.ok(codes(c.standards).length > 0, `${c.file}: no Utah standards`);
    const anchor = /\(standards\.md#([a-z0-9-]+)\)/.exec(c.standards)?.[1];
    assert.ok(anchor, `${c.file}: Utah standards must link to the crosswalk (standards.md#…)`);
    assert.match(read('teachers/standards.md'), new RegExp(`\\{ #${anchor} \\}`),
      `${c.file}: the crosswalk has no section #${anchor}`);
  }
});

test('every app with a hub has at least one card (prototypes excepted)', () => {
  for (const h of hubs) {
    if (proto.hubs.includes(h.slug)) continue; // In development: a card comes when it graduates
    const users = cards.filter((c) => c.hubs.includes(h.slug)).map((c) => c.file);
    assert.ok(users.length > 0, `apps/${h.slug}.md: no card names it under "Apps and tools"`);
  }
});

test('each card links the hubs of the apps it uses, and each of those hubs lists the card', () => {
  for (const c of cards) {
    for (const slug of c.hubs) {
      const h = hubs.find((x) => x.slug === slug);
      assert.ok(h, `${c.file}: links apps/${slug}.md, which is not a hub`);
      assert.ok(h.cards.includes(c.file),
        `apps/${slug}.md: its "For teachers" line should list teachers/${c.file}`);
    }
    // An app folder that has a hub is named by its hub, so teachers find the guide.
    for (const f of c.folders) {
      assert.ok(!hubs.some((h) => h.slug === f),
        `${c.file}: link the ${f} hub (../apps/${f}.md) under "Apps and tools", not only the app`);
    }
  }
});

test('each hub\'s "For teachers" line lists only cards that name the app', () => {
  for (const h of hubs) {
    assert.ok(h.box && h.teachers, `apps/${h.slug}.md: no "For teachers" line in its box`);
    for (const file of h.cards) {
      const c = cards.find((x) => x.file === file);
      assert.ok(c, `apps/${h.slug}.md: links teachers/${file}, which is not a card`);
      assert.ok(c.hubs.includes(h.slug),
        `teachers/${file}: lists no apps/${h.slug}.md under "Apps and tools", but that hub lists the card`);
    }
  }
});

test('every app on the All apps page is used by at least one card (prototypes excepted)', () => {
  const listed = appLinks(read('apps/index.md'));
  assert.ok(listed.length >= 3);
  for (const slug of listed) {
    if (proto.apps.includes(slug)) continue; // In development: a card comes when it graduates
    const used = cards.some((c) => c.hubs.includes(slug) || c.folders.includes(slug));
    assert.ok(used, `app/${slug}/: no card names it under "Apps and tools"`);
  }
});

test('the Teachers catalog has one row per card, under its setup, matching the card', () => {
  const rows = rowsByCard(section(read('teachers/index.md'), /\{ #activities \}/));
  for (const c of cards) {
    const r = rows[c.file];
    assert.equal(r?.length, 1, `teachers/index.md catalog: ${c.file} needs exactly one row`);
    const [, apps, setup, time, standards] = r[0].cells;
    assert.equal(r[0].sub, setupOf(c), `${c.file}: catalog row should sit under "### ${setupOf(c)}"`);
    assert.ok(setup.startsWith(setupOf(c)), `${c.file}: catalog Setup "${setup}"`);
    assert.ok(time, `${c.file}: catalog Time is empty`);
    assert.deepEqual(hubLinks(apps), c.hubs, `${c.file}: catalog apps (hubs) differ from the card's box`);
    assert.deepEqual(appLinks(apps), c.folders, `${c.file}: catalog apps (app links) differ from the card's box`);
    assert.deepEqual(codes(standards), codes(c.standards), `${c.file}: catalog standards differ from the card's box`);
  }
  for (const file of Object.keys(rows)) assert.ok(cards.some((c) => c.file === file), `catalog row for unknown card ${file}`);
});

test('"Utah standards at a glance" lists every card with the standards in its box', () => {
  const rows = rowsByCard(section(read('teachers/index.md'), /\{ #utah-standards \}/));
  for (const c of cards) {
    assert.equal(rows[c.file]?.length, 1, `Utah standards at a glance: ${c.file} needs exactly one row`);
    assert.deepEqual(codes(rows[c.file][0].cells.at(-1)), codes(c.standards),
      `${c.file}: standards differ between its box and "Utah standards at a glance"`);
  }
});

test('every card is in the menu under Teachers › Activity cards', () => {
  const yml = lf(fs.readFileSync(new URL('../mkdocs.yml', import.meta.url), 'utf8'));
  const block = /- Activity cards:\n((?: {6,}- .*\n)+)/.exec(yml)?.[1] ?? '';
  for (const c of cards) assert.match(block, new RegExp(`teachers/${c.file}\\b`), `mkdocs.yml: add teachers/${c.file}`);
});
