# Developers

For DRI staff, teachers and students who want to read, change or add to the apps. The apps
are plain web pages with no build step, so the code you read is the code the browser runs.
Students and teachers who only want to use the apps can skip this section: start at the
[apps](../apps/index.md) instead.

## In this section

| Page | What it covers |
| --- | --- |
| [Architecture](architecture.md) | The code tree, shared modules, running locally, vendored libraries, design choices |
| [Data sources and licensing](data-sources.md) | Which services the apps use, credits, licenses, offline samples, adding a data source |
| [Adding an app](adding-an-app.md) | A checklist so a new app fits the site: hub page, All apps card, top bar, shared page helpers, renaming an app |
| [Adding an activity card](adding-a-card.md) | The card template ("At a glance" box and sections) and the checklist that links a new card into the hubs, the Teachers catalog and the standards |
| App notes: [Wave Race](wave-race.md) · [Quake Explorer](quake-explorer.md) | How one app works inside, for apps with internals worth explaining |

## Preview locally

From the repository root:

```bash
node tools/serve.mjs          # apps only: http://127.0.0.1:8001/app/wave-race/
mkdocs serve                  # full site with guides and All apps: http://127.0.0.1:8000/
npm test                      # unit + sample tests (Node 22+)
```

`tools/serve.mjs` serves the raw `docs/` folder, so open an app at its own address
(`/app/wave-race/`, `/app/quake-waves/`); the All apps page (`/apps/`) and the guides need
`mkdocs serve` ([more](architecture.md#running-locally)). `mkdocs serve` needs the packages in
`requirements-docs.txt` (`pip install -r requirements-docs.txt`).

## The code

Everything is on GitHub: [gus-p-williams/utahshake](https://github.com/gus-p-williams/utahshake).
The repository is public.

## Key rules

Details and reasons are in [Data sources and licensing](data-sources.md#licenses-and-rules).

- **Raspberry Shake license:** never pull data from Raspberry Shake servers or build a
  "network"-style page of other Shakes; only UHSN's own school Shakes are ours.
- **No student personal data:** no student accounts, names or other personal information.
- **Browser only:** every classroom app runs in a browser (including Chromebooks), with no
  install.
