# Science figures

Plan and status (a shared doc other sessions can read; IDs such as W2 or S3 refer to it):
https://claude.ai/artifact/Q314GDdZvGNXHTznCLaWKQ

## On the pages (2026-11-24)

| Page | Figures |
| --- | --- |
| `theory/waves.md` | W1 P/S rock-motion animation (iframe, `app/wave-motion/`), W2 anatomy of a seismogram |
| `theory/s-minus-p.md` | S1 record section, S2 worked example (TCRU), S3 hidden triangle |
| `theory/locating.md` | L1 one-two-three circles, L2 residuals, L3 misfit map, L4 station geometry (simulated) |
| `theory/stations.md` | D1 schools and stand-in stations map |
| `apps/wave-race.md` | O2 step 1 screenshot (guide figures renumbered 1–6) |

"Picking S is hard" text (analysts picked P at 9 stations, S at only 3) is in the Wave Race
guide tip, Seismic waves, the S2 caption and the teacher card's Common difficulties.

The "Reading a seismogram" page (signals and noise) is built in its own session and owns
W3, W4 and W6; it moves sections, and W2, from `waves.md` to the new page.

## Adding a figure

1. Write or extend a script in `tools/figures/` (see the table in
   `docs/developers/architecture.md#figures-in-the-docs`). Use the apps' own code (parser,
   filter, `lib/`) so the figure matches what the apps compute, and `svg-traces.mjs` for the
   house style. Output must be the same bytes on every run.
2. Every element's attributes must be unique: Chrome accepts a repeated attribute inside a
   web page but refuses the whole file as an `<img>` (this broke the record section once).
   Check figures in the built site, not only rendered inline.
3. Place it with `<figure markdown="span">`, an image with alt text describing what is
   visible, `{ loading=lazy }`, and a `<figcaption>` that starts "Figure N." (numbered per
   page; embedded animations are not numbered). Real data → the credit in the caption:
   "Data: University of Utah Seismograph Stations (network UU, doi:10.7914/SN/UU) via
   EarthScope; picks via USGS ComCat."
4. Run `mkdocs build --strict` and `npm test`, look at the page at desktop and phone width,
   and set the figure's Status to "On a page" in the plan doc.
