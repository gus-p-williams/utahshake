# Wave Race: locate a Utah quake

**[Open Wave Race](../app/wave-race/index.html)** · works in any browser, including Chromebooks.
No install, no account.

When an earthquake happens, two kinds of waves race outward: the fast **P wave** and the
slower **S wave**. The farther a station is from the quake, the bigger the gap between them.
In Wave Race you measure that gap on real seismograms from University of Utah stations,
turn it into a distance, and use several stations to find where the quake was. Then you
compare your answer with the official one.

!!! info "Whose stations?"
    Until the Raspberry Shakes at the UHSN schools stream their data, a University of Utah
    station near each school **stands in** for it. The app marks these as "stands in for …".
    Other "helper" stations are added around the quake so you can surround it.

## The steps

### 1. Choose a quake

The list shows Utah quakes of magnitude 2 and up from the last 90 days. A ★ marks quakes
near the UHSN schools. **The location is hidden**: finding it is your job. Magnitude 3 and up
is easiest; small quakes are harder to see above the background noise.

You can also pick a **classic quake**, such as the 2020 Magna earthquake (M5.7).

### 2. Pick the P and S waves

The big panel shows the selected station. A three-part station has three traces:
**Z** (up–down), **N** (north–south) and **E** (east–west). The time axis is in seconds
after the quake started.

1. **Pick P** is on when you open a station. Click where the **first wave** arrives: the first
   clear change from the quiet background. P is usually clearest on the **Z** trace.
2. The app then switches to **Pick S**. Click where the **second, usually bigger** wave
   arrives. S is usually clearest on the **N** and **E** traces.
3. The panel shows **S − P** in seconds and the **distance** in km.
4. Go to the next station with **▶**, or click any station in the list or on the map.

Zoom in before you pick: precise picks give a precise location.

| To do this | Do this |
| --- | --- |
| Zoom in or out | Scroll over the seismogram, or use ＋ and － |
| Move left or right | Drag the seismogram, or use the ← → keys |
| See the whole record | **Whole record**, the 0 key, or double-click |
| Pick at the mouse position | Hover and press **P** or **S** |
| Move a pick | Press **Pick P** (or **Pick S**) and click again |
| Turn picking off | Esc |

The **Filter** menu changes which vibrations you see. **1–10 Hz** (the default) hides slow
drifts and fast hum, so quake waves stand out. **2–8 Hz** is even cleaner for small quakes.
**Raw** shows everything.

!!! tip "You don't have to pick every station"
    Pick the stations where you can see P and S clearly. **Three stations** give a location;
    **four or more around the quake** give a much better one. A station with no clear S is
    better skipped than guessed.

### 3. Locate the quake

Each station with both picks draws a **circle** on the map: the quake is somewhere on that
circle. Where the circles cross is the epicenter.

Press **Find the best epicenter**. The app tries every point on a grid and keeps the one whose
distances fit your circles best (purple star). It also tells you:

- how far, on average, your circles miss that point (smaller is better);
- a rough uncertainty (dashed circle).

You can change the **P speed**, **S speed** and **depth** and see how the circles change.
The theory page [Distance from S minus P](../theory/s-minus-p.md) explains these numbers.

### 4. Reveal the answer

**Reveal the official answer** shows the University of Utah / USGS location (orange star) and
how many km you were off. For many quakes you can also show the **picks made by University of
Utah analysts** as dashed lines, to compare with yours.

**Download my picks (CSV)** saves your picks, distances and result as a spreadsheet file on
your device. Nothing is sent anywhere.

## If the school network blocks the data

The app downloads data from EarthScope and the USGS. If your network blocks them, use
**Use the offline sample** (top right). It loads a magnitude 3.3 quake from October 2026 that
is stored with the site.

## Going further

- Locate the same quake with only the school stand-in stations. Why is it harder?
  (Hint: where are the schools compared with the quake?)
- Pick the same station twice, once with Raw and once with 2–8 Hz. How much do your picks move?
- Try P speed 6.0 and S speed 3.5, the textbook values. Is your answer better or worse?
- Read [Locating a quake](../theory/locating.md) to see how professionals do it.

---

*Data: waveforms from University of Utah Seismograph Stations (network UU,
[doi:10.7914/SN/UU](https://doi.org/10.7914/SN/UU)) via EarthScope; quake locations and
analyst picks from USGS ComCat / UUSS. See [Data sources](../developers/data-sources.md).*
