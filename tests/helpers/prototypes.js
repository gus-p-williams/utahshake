// Shared by tests/app-list.test.js and tests/teacher-cards.test.js (not a test file itself:
// `npm test` runs only tests/**/*.test.js).
//
// Prototypes are the apps in the "## In development: please test" section of the All apps
// page, docs/apps/index.md (docs/developers/adding-an-app.md#in-development). In that section,
// a link containing ../app/<slug>/ names a prototype app page, and a link to <slug>.md (a page
// next to index.md, that is, an app hub) names a prototype hub. The section runs from its
// heading to the next "# " or "## " heading. HTML comments and code are ignored.
import fs from 'node:fs';

export const APP_LIST = new URL('../../docs/apps/index.md', import.meta.url);

/** Files may have Windows line endings (CRLF) on checkout; the parsers expect \n. */
export const lf = (s) => s.replace(/\r\n/g, '\n');

/** `md` without HTML comments, fenced code blocks and inline code (fence lines become empty). */
export function stripCode(md) {
  let fence = '';
  return lf(md).replace(/<!--[\s\S]*?-->/g, '').split('\n').map((line) => {
    const f = /^[ \t>]*(`{3,}|~{3,})/.exec(line)?.[1];
    if (fence) { if (f && f[0] === fence[0] && f.length >= fence.length) fence = ''; return ''; }
    if (f) { fence = f; return ''; }
    return line.replace(/(`+).+?\1/g, '');
  }).join('\n');
}

/** Addresses of the Markdown links in `md` ([text](address) and [ref]: address), ignoring comments and code. */
export function markdownLinks(md) {
  return [...stripCode(md).matchAll(/\]\(\s*<?([^\s)>]+)|^ {0,3}\[[^\]\n]+\]:\s*<?([^\s>]+)/gm)].map((m) => m[1] ?? m[2]);
}

/** The "## In development" section of `md`, comments and code removed ('' if there is none). */
export function inDevelopmentSection(md) {
  const lines = stripCode(md).split('\n');
  const i = lines.findIndex((l) => /^##\s+In development\b/i.test(l));
  if (i < 0) return '';
  const end = lines.findIndex((l, j) => j > i && /^#{1,2}\s/.test(l));
  return lines.slice(i, end < 0 ? undefined : end).join('\n');
}

const uniqueSorted = (xs) => [...new Set(xs.filter(Boolean))].sort();

/** The prototypes listed in the All apps page `md`: { apps: app folder slugs, hubs: hub slugs }. */
export function prototypes(md) {
  const links = markdownLinks(inDevelopmentSection(md));
  return {
    apps: uniqueSorted(links.map((l) => /\.\.\/app\/([a-z0-9-]+)\//.exec(l)?.[1])),
    hubs: uniqueSorted(links.map((l) => /^(?:\.\/)?([a-z0-9-]+)\.md(?:#.*)?$/.exec(l)?.[1])
      .filter((slug) => slug !== 'index')),
  };
}

/** The prototypes on the real All apps page. */
export const sitePrototypes = () => prototypes(fs.readFileSync(APP_LIST, 'utf8'));
