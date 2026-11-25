# UHSN test trees, and the checker for DRI's server

Two tools for the UHSN data specification, version 1.1 (`planning/spec-uhsn-data.md`):

- `make-tree.mjs` writes a test copy of the public tree from University of Utah data;
- `check-tree.mjs` checks a tree, in a folder or on a server, against the spec.

## The checker: `check-tree.mjs`

The acceptance test of spec 5.4 and section 12. **DRI runs it on its server** before going
live and after any change to the publish step. It needs Node.js 22 or later and a copy of this
repository; there is nothing to install.

```
node tools/uhsn-test/check-tree.mjs https://<host>/uhsn/v1/
node tools/uhsn-test/check-tree.mjs docs/app/data/uhsn-demo/v1
```

| Option | Meaning |
| --- | --- |
| `--days N` or `--days all` | Check this many of each channel's latest days in full: every record, the sidecar and its seek table. Default: all for a folder, 2 for an address (up to 15 MB per channel-day is downloaded) |
| `--now <ISO>` | The time of the check. Default: the clock. For a folder, giving it also judges whether the publish step is running ("data paused") |
| `--verbose` | List every place a problem was found (default: the first 5) |
| `--json` | The findings as JSON, for monitoring |

The report has six sections: the station list and StationXML; `index.json`; the availability
files; day files and sidecars; the cutoff (no public record ends after `publicUntil`, no day
file past it, nothing for an unconfirmed station); and, for an address, the web rules (HTTPS,
CORS on every answer including 404 and 416, OPTIONS, Range with 206 and 416, HEAD, 304,
content types, caching). Each finding is **FAIL** (breaks a rule; the apps may show wrong data,
or none), **warn** (works, but differs from the spec) or **note** (for information). The exit
status is 0 when nothing failed, 1 when something failed, and 2 when the check could not run.

A test tree's station (its `model` starts with "test") has UU codes; the checker notes them
instead of warning. A folder is a snapshot, so "data paused" is judged only for an address or
with `--now`. Products (spec section 10) are not checked yet.

`check-lib.mjs` holds the field tables and the pure checks (`tests/uhsn-check.test.js`);
`check-tree.mjs` reads the files and writes the report (`tests/uhsn-check-tree.test.js` runs it
on the demo tree, as a folder and served by `tools/serve.mjs`, and on broken copies).

To try the web rules on a folder, serve it: `node tools/serve.mjs 8002 docs/app/data` and check
`http://127.0.0.1:8002/uhsn-demo/v1/`. `serve.mjs` sends `no-store` and no ETag on purpose
(it is for development), so the caching checks warn.

## A test tree: `make-tree.mjs`

`make-tree.mjs` writes a folder laid out exactly as the spec's section 7 describes, filled with
University of Utah (UU) records instead of school Shake data. The School Shake viewer and its
reader (`docs/app/js/data/uhsn.js`) are built and tested against it. The script does the work
of the spec's publish step (5.2) in the same order, so it is also a first reference for the
publish and index scripts DRI will run.

```
node tools/uhsn-test/make-tree.mjs --demo
node tools/uhsn-test/make-tree.mjs --station UU.HEB.01.EHZ --from 2026-11-17T12:00:00Z --until 2026-11-18T04:00:00Z
```

| Option | Meaning |
| --- | --- |
| `--out <dir>` | Where to write. Default `tools/uhsn-test/out/uhsn/v1/` (git-ignored) |
| `--station NET.STA.LOC.CHA` | A channel; repeat for more |
| `--from`, `--until` | The span the "bridge" delivered: whole records that start in it |
| `--public-until` | The cutoff: only records that end by it are published. Default `--until` |
| `--now` | The time of this "publish run" (`generated`, `updated`). Default cutoff + 10 minutes |
| `--demo` | The small tree the app ships, in `docs/app/data/uhsn-demo/v1/` (about 4 MB): UU.HEB.01.EHZ from 12:00 UTC on November 17, 2026 to 04:00 UTC on November 18, so it crosses UTC midnight like an evening game |

Status words follow spec 1.1. A day in the availability file is `filling` until the whole day
ends at or before `publicUntil`, then `closed`; how full it is, is its `coverage` (7.6). A
channel in `index.json` is `current`, `late` or `stopped` by its lag, `publicUntil` −
`lastSample`, not by the clock (7.5). Whether the publish step has stalled ("data paused") is
for readers to judge from `generated`.

After regenerating the demo tree, check it (`node tools/uhsn-test/check-tree.mjs
docs/app/data/uhsn-demo/v1`) and look at the diff: the day files should be unchanged unless
the span changed. EarthScope stamps a new `<Created>` time in the StationXML on every
download; restore the committed file if nothing else in it changed.

To look at a tree as the viewer will, serve it with `node tools/serve.mjs` (which answers
Range requests and sends CORS headers the way the spec asks of DRI's server):
`node tools/serve.mjs 8002 tools/uhsn-test/out` puts it at `http://127.0.0.1:8002/uhsn/v1/`.

### Where the data come from

University of Utah Seismograph Stations, network UU (doi:10.7914/SN/UU), through
EarthScope's FDSN web services: `dataselect` for the records and `station` for the metadata
and StationXML. **Nothing comes from Raspberry Shake's servers** (license). Downloads are
cached in `tools/figures/.cache/`, so a rerun needs no network. Each tree's `ABOUT.txt`
records the command that made it.

Records are copied byte for byte. EarthScope trims the first and last record of each answer
to the window asked for, so the script asks for 5 minutes more at each end and throws those
two records away (spec 6.4).

### How a test tree differs from the spec's example values

- `net` is `UU`, not `AM`: headers are never rewritten, so a tree of UU records keeps UU
  codes (and UU's location code `01`).
- `model` is `test: UU station`, not a Raspberry Shake model.
- `units` are what UU's metadata give. For HEB, an old analog station, that is `M`
  (displacement, counts per meter), which spec 1.1 allows.
- The StationXML is UU's own from EarthScope (schema version 1.1), not built from a Raspberry
  Shake template.
- `clockChecked` is `null`.

`tests/uhsn-demo-tree.test.js` checks the shipped demo tree against the spec on its own, apart
from the checker; `tests/uhsn-source.test.js` builds a tiny tree of its own.
