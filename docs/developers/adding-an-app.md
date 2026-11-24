# Adding an app

A checklist so a new app fits the site. Each app has **one hub page** (its front door, which
is also its guide). The Science, Teachers and Developers are shared sections that the hub
links into. Below, `<slug>` is the app's short name in lowercase with hyphens (for example
`wave-race`) and `<App>` is its display name (for example Quake Locator).

## 1. App files

- The page: `docs/app/<slug>/index.html`.
- Its code: `docs/app/js/<slug>/` (the page controller). Put pure logic that can be tested in
  `docs/app/js/lib/`, with `node --test` tests in `tests/`.
- Credits, the data-source badge, HTML escaping, CSV download and embed mode come from the
  shared `docs/app/js/ui/page.js` ([step 8](#page-helpers)). Import them; don't copy them into
  the new app.
- Get all data through a DataSource (see [Architecture](architecture.md#data-access) and
  [Data sources and licensing](data-sources.md)).

## 2. Hub page

Create `docs/apps/<slug>.md` with an H1, a one-line lead, a primary **Open** button and the
standard "At a glance" box. Then the guide itself: what students do, step by step.

```
!!! abstract "At a glance"
    - **You will:** …
    - **Time:** …
    - **Works on:** any browser, including Chromebooks. No install, no accounts.
    - **The science:** [Page](../theory/page.md) · …
    - **For teachers:** [<Activity> card](../teachers/<activity>.md) · … · [Standards](../teachers/standards.md#<slug>)
    - **Data:** [Our stations and data](../theory/stations.md)
    - **For developers:** [<App> notes](../developers/<slug>.md)
```

Use the [Quake Locator guide](../apps/wave-race.md) as the model. Drop the developer line if the
app has no notes page.

## 3. Navigation and the All apps page { #app-list }

- Add the hub to `nav:` under **Apps** in `mkdocs.yml`.
- Add a card for it on [apps/index.md](../apps/index.md), the All apps page and the one list
  of apps, with a link to the app itself (`../app/<slug>/index.html`).
- **Every app folder must be on that page.** Each folder in `docs/app/` that holds an
  `index.html` needs a Markdown link containing `../app/<slug>/` on `apps/index.md`. That
  includes animations embedded in a science page, which have no hub of their own (the P/S
  motion cartoon, `wave-motion`). `tests/app-list.test.js` checks this; it skips the shared
  folders (`vendor`, `js`, `css`, `data`) and redirect stubs (see
  [Renaming an app](#renaming-an-app)).

## 4. The Science

Add a "Used in" line to each theory page the app uses, linking back to the hub. A new theory
page goes under **The Science** in `nav:`.

## 5. Teachers

- Make sure at least one activity card uses the app. Cards are per activity, not per app: a
  card may use several apps (the Quake Locator card uses Quake Waves as its warm-up), and an app
  may appear in several cards (Quake Waves also has a demo card of its own). The card
  template and its checklist (menu, Teachers catalog, standards, the hub's "For teachers"
  line) are on [Adding an activity card](adding-a-card.md); `tests/teacher-cards.test.js`
  fails if the app's hub has no card.
- Add a `## <App> { #<slug> }` heading to [standards.md](../teachers/standards.md), with one
  line linking the hub and a table of the standards the app covers.
- Add rows for the app and its new science pages to
  [Utah standards at a glance](../teachers/index.md#utah-standards) (plus a line in its code
  list for any standard not listed yet).

## 6. Developer notes (only if needed)

If the app has internals worth explaining (data flow, algorithms, generated figures), write
`docs/developers/<slug>.md` and add it to `nav:` under **Developers › App notes**. See
[Quake Locator notes](wave-race.md). Otherwise skip it.

## 7. The app's top bar { #top-bar }

Every app page starts with the same top bar, written as static HTML in its `index.html`
(copy it from `docs/app/wave-race/index.html`):

```html
<header class="topbar">
  <div class="brand">
    <a href="../../apps/" class="home">UHSN · All apps</a>
    <h1><App> <span class="sub">subtitle</span></h1>
  </div>
  <nav class="topbar-right" aria-label="Guide and data">
    <!-- app-specific controls first -->
    <a href="../../apps/<slug>/" target="_blank" rel="noopener">Guide ↗<span class="visually-hidden"> (opens in a new tab)</span></a>
    <a href="../../theory/stations/" target="_blank" rel="noopener">About the data ↗<span class="visually-hidden"> (opens in a new tab)</span></a>
  </nav>
</header>
```

- **UHSN · All apps** goes back to the All apps page in the same tab.
- **Guide ↗** and **About the data ↗** open in a new tab, and say so to screen readers, so
  students don't lose their work.
- App-specific controls go first in the `nav` (Quake Locator puts its data-source badge and
  Live/Offline switch there).
- An animation with no hub points its guide link at the science page that embeds it: the P/S
  motion cartoon has "Seismic waves ↗" → `../../theory/waves/`.
- **Keep the links static.** Write them as plain `href` attributes in the page's HTML; don't
  build the bar in JavaScript. `tests/doc-links.test.js` reads the HTML and checks that every
  link reaches a page of the built site, which `mkdocs build --strict` never looks at.
- In embed mode ([step 10](#embed)) the bar is hidden.

## 8. Shared page helpers { #page-helpers }

`docs/app/js/ui/page.js` holds what every app page needs. Quake Locator, Quake Explorer, Quake Waves,
Build a Wiggle and the P/S motion cartoon all import from it; a new app should too, instead of copying the helpers.

| Export | What it does |
| --- | --- |
| `esc(s)` | HTML-escapes any value before it goes into `innerHTML` (text or attribute) |
| `setupEmbed()` | Adds `body.embed` when the address has `?embed` or the page is inside an iframe; returns `true` if so |
| `followDocsTheme(onChange)` | Inside a docs page, follows the docs' light/dark switch and calls `onChange()` to redraw |
| `showCredits(el, keys?)` | Fills the credits footer with the chosen `ATTRIBUTION` entries (`config.js`), then "About the data ↗" |
| `showSourceBadge(el, source)` | Labels a DataSource "Live data" or "Offline sample" |
| `csvRow(values)` | One CSV line; quotes fields that contain a quote, comma or newline |
| `downloadCsv(filename, lines)` | Saves the lines as a `.csv` file on the student's device (nothing is sent anywhere) |

Links that `page.js` writes assume the page is at `docs/app/<slug>/index.html`, two folders
below the site root.

## 9. Credits

Every page that shows data has a credits footer that cites the source network (for example
UU, [doi:10.7914/SN/UU](https://doi.org/10.7914/SN/UU)) and USGS ComCat for quakes. End the
page with an empty `<footer class="credits" id="credits"></footer>` and fill it with
`showCredits(el, keys)`, naming the `ATTRIBUTION` entries in `js/config.js` that the page
shows (Quake Locator: `['waveforms', 'events', 'map']`). See
[Credits shown in the apps](data-sources.md#credits-shown-in-the-apps). A cartoon that shows
no real data says so in a static footer instead (Quake Waves).

## 10. Showing the app inside a docs page (only if needed) { #embed }

An animation can sit on a docs page in an `<iframe>` with `?embed=1` added to its address
(Quake Waves on Locating a quake, the P/S motion cartoon on Seismic waves, Build a Wiggle on
Frequencies, fading and sound). In the page
controller:

- call `setupEmbed()` before the first draw; in embed mode `app.css` hides the top bar, the
  credits and anything marked `.standalone-only`, and shows `.embed-only` (for example an
  "Open full screen ↗" link);
- call `followDocsTheme(draw)` so the animation follows the docs' light/dark switch, not the
  device's, and redraws when it changes;
- give `body.embed` page styles that fill the frame.

The embedded app still needs its card on the All apps page ([step 3](#app-list)).
More in [Animations in a docs page](architecture.md#animations-in-a-docs-page).

## 11. Checks

From the repository root, both must pass:

```bash
npm test                      # unit tests, sample checks, links from the apps into the docs, the app list
mkdocs build --strict         # the site, including links and #anchors between pages
```

`mkdocs build --strict` does not check links inside the app pages or raw HTML; `npm test`
does.

## Renaming an app

Old addresses live on in bookmarks, printed activity cards and iframes, so keep them working.
Quake Waves was renamed this way (its old folder was `wave-animation`):

1. Move the page and its code with `git mv`, so their history follows:
   `git mv docs/app/<old> docs/app/<new>` and `git mv docs/app/js/<old> docs/app/js/<new>`.
   Fix the `<script src>` in the page.
2. Put a **redirect stub** at the old address, `docs/app/<old>/index.html`. Copy
   `docs/app/wave-animation/index.html` and change the addresses. A stub has:
    - the marker `<meta name="uhsn-redirect" content="../<new>/">`, which tells
      `tests/app-list.test.js` to skip the folder;
    - `location.replace('../<new>/' + location.search + location.hash)`, which passes on
      `?embed=1` and the `#hash`, so old iframes keep working;
    - a `<noscript>` meta refresh, a canonical link and a visible link, for browsers without
      JavaScript.
3. Update every link to the old address: the card on `apps/index.md`, iframes in docs pages,
   the hub's **Open** button, the hub's `nav:` entry if the hub is renamed too, and the code
   tree in [Architecture](architecture.md). The checks in step 11 find most of them.

The plain-HTML launcher that used to be at `app/` is a redirect stub too: `docs/app/index.html`
forwards to the All apps page (`../apps/`). The decision is D21 in
[planning/decisions.md](https://github.com/gus-p-williams/utahshake/blob/main/planning/decisions.md)
(on GitHub; the planning files are not part of this site).
