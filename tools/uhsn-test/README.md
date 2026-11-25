# A test copy of the UHSN public tree

`make-tree.mjs` writes a folder laid out exactly as the UHSN data specification describes
(draft 0.2, section 7: `planning/spec-uhsn-data.md`), filled with University of Utah (UU)
records instead of school Shake data. The School Shake viewer and its reader
(`docs/app/js/data/uhsn.js`) are built and tested against it. The script does the work of
the spec's publish step (5.2) in the same order, so it is also a first reference for the
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
| `--now` | The time of this "publish run" (`generated`, `updated`, status). Default cutoff + 10 minutes |
| `--demo` | The small tree the app ships, in `docs/app/data/uhsn-demo/v1/` (about 4 MB): UU.HEB.01.EHZ from 12:00 UTC on November 17, 2026 to 04:00 UTC on November 18, so it crosses UTC midnight like an evening game |

To look at a tree as the viewer will, serve it with `node tools/serve.mjs` (which answers
Range requests and sends CORS headers the way the spec asks of DRI's server):
`node tools/serve.mjs 8002 tools/uhsn-test/out` puts it at `http://127.0.0.1:8002/uhsn/v1/`.

## Where the data come from

University of Utah Seismograph Stations, network UU (doi:10.7914/SN/UU), through
EarthScope's FDSN web services: `dataselect` for the records and `station` for the metadata
and StationXML. **Nothing comes from Raspberry Shake's servers** (license). Downloads are
cached in `tools/figures/.cache/`, so a rerun needs no network. Each tree's `ABOUT.txt`
records the command that made it.

Records are copied byte for byte. EarthScope trims the first and last record of each answer
to the window asked for, so the script asks for 5 minutes more at each end and throws those
two records away.

## How a test tree differs from the spec's example values

- `net` is `UU`, not `AM`: headers are never rewritten, so a tree of UU records keeps UU
  codes (and UU's location code `01`).
- `model` is `test: UU station`, not a Raspberry Shake model.
- `units` are what UU's metadata give. For HEB, an old analog station, that is `M` (counts
  per meter), not one of the spec's three.
- The StationXML is UU's own from EarthScope, not built from a Raspberry Shake template.
- `clockChecked` is `null`.

`tests/uhsn-demo-tree.test.js` checks the shipped demo tree against the spec;
`tests/uhsn-source.test.js` builds a tiny tree of its own.
