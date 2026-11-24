# Science figures

Plan and status (a shared doc other sessions can read; IDs such as W2 or S3 refer to it):
https://claude.ai/artifact/Q314GDdZvGNXHTznCLaWKQ

## On the pages (2026-11-24)

| Page | Figures |
| --- | --- |
| `theory/waves.md` | W1 P/S rock-motion animation (iframe, `app/wave-motion/`) |
| `theory/seismograms.md` | W4 inside a seismometer, W2 anatomy (moved here), R1 ocean hum, R2 wind, R3 a week at HEB, R4 three quakes, R5 blast hours, R6 blast vs quake, R7 instrument problems, W3 frequency ruler, W6 + R8 hidden quake and spectrogram, R9 mystery records (D20) |
| `theory/plots.md` | V1 helicorder (SUU, 2026-10-26), V2 seismic carpet (HEB, Aug 24 – Nov 23, 2026), V3 PPSD (TMU, January 2026), V4 PPSD comparisons (TMU January vs July; SRU geophone vs broadband), V5 H/V (FOR4 vs CTU, SGU try-it), V6 stack and V7 cross-correlation of the UTTR rocket-motor explosions (D2-plots, branch `plots`) |
| `theory/s-minus-p.md` | S1 record section, S2 worked example (TCRU), S3 hidden triangle |
| `theory/locating.md` | L1 one-two-three circles, L2 residuals, L3 misfit map, L4 station geometry (simulated) |
| `theory/stations.md` | D1 schools and stand-in stations map |
| `apps/wave-race.md` | O2 step 1 screenshot (guide figures renumbered 1–6) |

"Picking S is hard" text (analysts picked P at 9 stations, S at only 3) is in the Wave Race
guide tip, Reading a seismogram (moved there from Seismic waves), the S2 caption and the
teacher card's Common difficulties.

Beyond one seismogram's figures come from `plots-time.mjs` (V1, V2), `plots-noise.mjs` (V3, V4),
`plots-hv.mjs` (V5) and `plots-repeats.mjs` (V6, V7), with the computed products kept in
`tools/figures/data/` (`carpet-heb-2026.json`, `ppsd-*.json`, `hv-curves.json`, and
`uttr-explosions.json`, the event list with its provenance). Sources behind their captions:
`planning/plots-sources.md`.

Reading a seismogram's figures come from `tools/figures/seismogram-figures.mjs` (real data;
downloads cached in `tools/figures/.cache/`, week-long noise levels kept in
`tools/figures/data/`) and `seismogram-diagrams.mjs`. Its wind figure also uses airport wind
from the Iowa Environmental Mesonet, credited in the caption.

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

## Follow-ups from the review (2026-11-24): done

Text fixes are done (wind "4×, up to 10× in gusts", Hz defined at first use, hum clearest on
broadband stations, Nevada picks by eye, credits). The figure fixes were done by D2-plots on
branch `plots` (commit "Reading a seismogram: the three figure fixes from the review"):
hidden-quake.svg has 2.56 s windows from 1 Hz up and its label in the 1–10 Hz box; the gaps
panel moved to SGU, November 13, 2026, 9:26 am (the October 26 burst was real, about ±200
counts, so not labeled an artifact); the axis reads "seconds after the event"; the clipping
label reads "+32,767 and −32,768". Original list:

- `hidden-quake.svg`: move the "the quake" label into the 1–10 Hz box (it sits above 20 Hz,
  where the plot is dark); shorter windows above 1 Hz so the quake's colour doesn't start
  before P.
- `instrument-problems.svg`, gaps panel: the burst right after the 35 s gap could be taken for
  a quake; label it as a likely gap-edge artifact or choose a cleaner window.
- `blast-vs-quake.svg`: axis "seconds after the quake" also under the blast; use "seconds
  after the event". Also "±32,767" → "+32,767 / −32,768" in `instrument-problems.svg`.
