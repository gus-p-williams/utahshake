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

- Add the hub to `nav:` under **Apps** in `mkdocs.yml` (a prototype: under
  **Apps › In development**).
- Add a card for it on [apps/index.md](../apps/index.md), the All apps page and the one list
  of apps, with a link to the app itself (`../app/<slug>/index.html`).
- One rule sorts that page: **every app with a hub goes in the top grid, except
  prototypes**, in the same order as the Apps menu, even if it uses no real data. Under the
  card's title and its picture (next point) comes a line in italics that says whether it does (*Real data: seismograms from Utah
  stations.* or *No real data: a cartoon.*), then a short description, the **Open** button,
  and the guide link on its own line under the button. Only an animation with no hub (the
  P/S motion cartoon) goes under **Animations**.
- **Every card gets a picture**, prototypes included. Add a draw function for the app to
  `tools/figures/site-graphics.mjs` (drawn from what the app shows, with its own `lib/` code;
  real data only from records stored with the site, never from Raspberry Shake servers), run
  `node tools/figures/site-graphics.mjs`, and put `--8<-- "img/graphics/thumb-<slug>.svg"` on its
  own paragraph right under the card's bold title. A home-page `icon-<slug>.svg` is needed only
  for apps listed on the home page's Apps card. Keep each file one line with no trailing newline.
- An app that is still being tested by adults goes under **In development: please test**
  instead. See [Prototypes](#in-development) for what it needs and how it moves up.
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
  fails if the app's hub has no card. A [prototype](#in-development) needs no card until it
  graduates.
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
npm test                      # unit tests, sample checks, links from the apps into the docs, the app list, card pictures
mkdocs build --strict         # the site, including links and #anchors between pages
```

`mkdocs build --strict` does not check links inside the app pages or raw HTML; `npm test`
does.

## Prototypes: "In development" { #in-development }

Some apps need testing by adults before they are ready for classrooms. They are listed under
[In development: please test](../apps/index.md#in-development) on the All apps page, for Gus,
Dale and Cleat to try. The first is the Phone Bench (trial T1 of the phone activities). Gus
decides when an app enters, graduates or is dropped.

### Entering "In development"

An app enters when it runs end to end on the deployed site and Gus wants it tried. It needs:

- **The app page** with the standard [top bar](#top-bar), plus the Prototype badge inside
  the `h1`, after the app's name:
  `<span class="badge prototype" title="In development: please test.">Prototype</span>`.
  The style is `.badge.prototype` in `docs/app/css/app.css`. See
  `docs/app/phone-bench/index.html`.
- **A hub page** (the guide, as in step 2) with the "At a glance" box. Its "For teachers"
  line says there is no card yet, for example "none yet: a prototype for adult testers".
- **A card** in the In development section of All apps. The name in bold, then a line in
  italics that marks it a prototype and says what data it uses (*Prototype, for adult
  testers. No station data: it reads this device's own sensors.*). Then a short description,
  a **Test:** line (what to try, on which devices) and a **Send:** line (how to send results
  to Gus; the site collects nothing). Then the **Open** button, and the guide link on its own
  line under it. Link only this app and its own guide in that section: the tests read every
  `<slug>.md` link there as a prototype's hub.
- **A menu entry** under **Apps › In development** in `mkdocs.yml`.

It does not need yet: an activity card, a section in the standards crosswalk, rows on the
Teachers page, or "Used in" lines on science pages (steps 4 and 5).

### Graduating

Gus decides, after the testers' feedback and the trials the app serves. Then:

1. Move its card from In development into the top grid, in Apps-menu order. Replace the
   prototype line with the real data or no real data line, and drop the **Test:** and
   **Send:** lines.
2. Remove the Prototype badge from its top bar.
3. Move its `nav:` entry out of **Apps › In development**, up into **Apps**.
4. Do steps 4 to 6: at least one activity card (and the hub's "For teachers" line), its
   standards, its Teachers rows, and "Used in" lines on science pages.

The tests then hold it to the full rules.

### Dropping

Delete the app folder, its code, its hub, its `nav:` entry and its card. Add a redirect stub
([Renaming an app](#renaming-an-app)) only if its address was shared widely.

### What the tests check

The tests read the prototypes from the In development section of All apps (from its heading to
the next `## ` heading; the parser is `tests/helpers/prototypes.js`).

- `tests/app-list.test.js`: every prototype app shows the Prototype badge in its top bar, and
  no other app shows it; every prototype hub is in `mkdocs.yml` under **Apps › In
  development**, and no other hub is there. Like every app, a prototype must be on the All
  apps page.
- `tests/site-graphics.test.js`: every card on All apps, prototypes too, has a `thumb-*.svg`
  right under its title; every graphic in `docs/img/graphics/` is used and is one line.
- `tests/teacher-cards.test.js`: prototypes need no activity card. Their hubs still need the
  "At a glance" box with a "For teachers" line, and any card that line lists must name the
  app.

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
