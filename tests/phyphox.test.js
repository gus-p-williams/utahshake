// The teacher page "Phones with an app: phyphox" (docs/teachers/phyphox.md) opens our ready-made
// experiment with a phyphox:// link: phyphox swaps phyphox:// for https:// and downloads the file
// (phyphox docs, "Transferring phyphox experiments"; sources in planning/phyphox-sources.md).
// The link holds the site's full address, which MkDocs can't fill in, so these checks keep the
// link, the file and mkdocs.yml's site_url in step (for example if the site moves to DRI), and
// guard the experiment file against edits that would lose the recording.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const ROOT = new URL('../', import.meta.url);
const read = (rel) => fs.readFileSync(new URL(rel, ROOT), 'utf8').replace(/\r\n/g, '\n');
const FILE = 'teachers/files/uhsn-vibration.phyphox';
const siteUrl = /^site_url:\s*(\S+)\s*$/m.exec(read('mkdocs.yml'))?.[1];
const page = read('docs/teachers/phyphox.md');
const xml = read(`docs/${FILE}`);

test('site_url is an https address ending in /', () => {
  assert.match(siteUrl ?? '', /^https:\/\/.+\/$/);
});

test('the page\'s "Open in phyphox" link is phyphox:// + site_url + the experiment file', () => {
  const links = [...page.matchAll(/\]\((phyphox:\/\/[^)\s]+)\)/g)].map((m) => m[1]);
  assert.ok(links.length >= 1, 'no phyphox:// link on the page');
  const expected = siteUrl.replace(/^https:\/\//, 'phyphox://') + FILE;
  for (const l of links) assert.equal(l, expected);
  assert.match(page, /\[Get phyphox\]\(#install\)/, 'a "Get phyphox" link sits beside it');
});

test('the experiment links back to the page at its built address', () => {
  const link = /<link label="[^"]+">([^<]+)<\/link>/.exec(xml)?.[1];
  assert.equal(link, `${siteUrl}teachers/phyphox/`);
});

test('the experiment reads the accelerometer as fast as possible and exports time, x, y, z', () => {
  assert.match(xml, /<phyphox version="1\.14"/, 'format 1.14 loads on phyphox 1.1.10 (2021) and later');
  const sensor = /<sensor type="accelerometer" rate="0">([\s\S]*?)<\/sensor>/.exec(xml)?.[1];
  assert.ok(sensor, 'accelerometer with rate="0" (as fast as possible)');
  const out = Object.fromEntries([...sensor.matchAll(/<output component="(\w+)">(\w+)<\/output>/g)].map((m) => [m[1], m[2]]));
  assert.deepEqual(Object.keys(out).sort(), ['t', 'x', 'y', 'z']);
  const set = /<set name="Acceleration">([\s\S]*?)<\/set>/.exec(xml)?.[1] ?? '';
  const cols = [...set.matchAll(/<data name="([^"]+)">(\w+)<\/data>/g)].map((m) => [m[1], m[2]]);
  assert.deepEqual(cols, [['Time (s)', out.t], ['x (m/s^2)', out.x], ['y (m/s^2)', out.y], ['z (m/s^2)', out.z]]);
  // The page tells teachers these names.
  for (const name of ['Acceleration.csv', 'Readings per second', 'UHSN']) assert.ok(page.includes(name), name);
  assert.match(xml, /<value label="Readings per second"/);
  assert.match(xml, /<category>UHSN<\/category>/);
});

test('no analysis input empties the recording (inputs read without clear="false" are emptied)', () => {
  const recorded = new Set([...xml.matchAll(/<output component="\w+">(\w+)<\/output>/g)].map((m) => m[1]));
  const analysis = /<analysis\b[^>]*>([\s\S]*?)<\/analysis>/.exec(xml)?.[1] ?? '';
  for (const m of analysis.matchAll(/<input\b([^>]*)>(\w+)<\/input>/g)) {
    if (!recorded.has(m[2])) continue;
    assert.match(m[1], /\bclear="false"|\bkeep="true"/, `analysis input ${m[2]} would empty the recording`);
  }
  // Every buffer the sensor writes is unlimited (size 0), so a long take is kept whole.
  for (const b of recorded) assert.match(xml, new RegExp(`<container size="0">${b}</container>`), b);
});
