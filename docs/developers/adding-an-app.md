# Adding an app

A checklist so a new app fits the site. Each app has **one hub page** (its front door, which
is also its guide). The Science, Teachers and Developers are shared sections that the hub
links into. Below, `<slug>` is the app's short name in lowercase with hyphens (for example
`wave-race`) and `<App>` is its display name (for example Wave Race).

## 1. App files

- The page: `docs/app/<slug>/index.html`.
- Its code: `docs/app/js/<slug>/` (the page controller). Put pure logic that can be tested in
  `docs/app/js/lib/`, with `node --test` tests in `tests/`.
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
    - **For teachers:** [Activity card](../teachers/<slug>-card.md) · [Standards](../teachers/standards.md#<slug>)
    - **Data:** [Our stations and data](../theory/stations.md)
    - **For developers:** [<App> notes](../developers/<slug>.md)
```

Use the [Wave Race guide](../apps/wave-race.md) as the model. Drop the developer line if the
app has no notes page.

## 3. Navigation and the app list

- Add the hub to `nav:` under **Apps** in `mkdocs.yml`.
- Add a card for it on [apps/index.md](../apps/index.md), the one list of apps.

## 4. The Science

Add a "Used in" line to each theory page the app uses, linking back to the hub. A new theory
page goes under **The Science** in `nav:`.

## 5. Teachers

- Write an activity card, `docs/teachers/<slug>-card.md`, and add it to `nav:` under
  **Teachers**. Use the [Wave Race activity card](../teachers/wave-race-card.md) as the model.
- Add a `## <App> { #<slug> }` heading to [standards.md](../teachers/standards.md), with one
  line linking the hub and a table of the standards the app covers.
- Add a row to the activities table on the [Teachers](../teachers/index.md) page.

## 6. Developer notes (only if needed)

If the app has internals worth explaining (data flow, algorithms, generated figures), write
`docs/developers/<slug>.md` and add it to `nav:` under **Developers › App notes**. See
[Wave Race notes](wave-race.md). Otherwise skip it.

## 7. The app's top bar

Every app page links back into the docs in the same way:

- **All apps** → `../../apps/` (same tab).
- **Guide** → `../../apps/<slug>/` (new tab, labelled as such, so students don't lose their
  work).
- **About the data** → `../../theory/stations/`.

The existing apps are being moved to this convention.

## 8. Credits

Every page that shows data has a credits footer that cites the source network (for example
UU, [doi:10.7914/SN/UU](https://doi.org/10.7914/SN/UU)) and USGS ComCat for quakes. Take the
text from `ATTRIBUTION` in `js/config.js`; see
[Credits shown in the apps](data-sources.md#credits-shown-in-the-apps).

## 9. Checks

From the repository root, both must pass:

```bash
npm test                      # unit tests, sample checks, and links from the apps into the docs
mkdocs build --strict         # the site, including links and #anchors between pages
```

`mkdocs build --strict` does not check links inside the app pages or raw HTML; `npm test`
does.
