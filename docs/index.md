# UHSN Student Seismology

Apps and documentation for students and teachers in the **Utah High School Seismic
Network (UHSN)**, run by the Desert Research Institute. Use real seismograms from Utah to
find earthquakes yourself. Everything runs in a browser, including Chromebooks: no install,
no accounts.

--8<-- "img/graphics/home-banner.svg"

A magnitude 3.3 quake near Junction, Utah (star), October 2026, and the five UHSN schools
(yellow dots). The circles show how far its P and S waves (blue, red) had spread 20 seconds after
it began. Right: the seismogram it made at station WCU, the stand-in for Millard High School.
Data: University of Utah Seismograph Stations and the USGS earthquake catalog.
{: .uhsn-caption }

New here? Watch [Quake Waves](apps/quake-waves.md) first, then try
[Quake Locator](apps/wave-race.md), then [Quake Explorer](apps/quake-explorer.md).

<div class="grid cards" markdown>

- **[Apps](apps/index.md)**

    --8<-- "img/graphics/icon-quake-locator.svg"
    [Quake Locator](apps/wave-race.md): pick P and S waves on real Utah seismograms, turn them
    into distances, and locate the quake.

    --8<-- "img/graphics/icon-quake-explorer.svg"
    [Quake Explorer](apps/quake-explorer.md): measure how fast the rock is, hear the notes of
    a quake, find which way the ground moved, and read a quake from the far side of the world.

    --8<-- "img/graphics/icon-quake-waves.svg"
    [Quake Waves](apps/quake-waves.md): watch P and S waves race out from a
    quake to four stations. A good warm-up for Quake Locator.

    --8<-- "img/graphics/icon-build-a-wiggle.svg"
    [Build a Wiggle](apps/build-a-wiggle.md): add sine waves with sliders and watch their sum
    and its spectrum. A good warm-up for the notes in Quake Explorer.

    More are coming: see [All apps](apps/index.md).

- **[The Science](theory/index.md)**

    [Seismic waves](theory/waves.md) · [Reading a seismogram](theory/seismograms.md) ·
    [Distance from S minus P](theory/s-minus-p.md) · [Locating a quake](theory/locating.md) ·
    [Travel times and Earth's layers](theory/travel-times.md) ·
    [Frequencies, fading and sound](theory/frequencies.md) ·
    [Which way the ground moves](theory/ground-motion.md) ·
    [Our stations and data](theory/stations.md)

- **[Teachers](teachers/index.md)**

    Activity cards: [One quake, two waves](teachers/one-quake-two-waves.md) ·
    [Quake Locator](teachers/wave-race-card.md) ·
    [How fast is the rock?](teachers/how-fast-is-the-rock.md) ·
    [What notes is the ground playing?](teachers/notes-of-a-quake.md) ·
    [Which way did the ground move?](teachers/which-way-did-it-move.md) ·
    [A message from far away](teachers/far-side-of-the-world.md) ·
    [Utah standards at a glance](teachers/index.md#utah-standards) ·
    [Standards crosswalk](teachers/standards.md)

</div>

**For developers:** how the apps are built, where the data come from, and how to add an app.
See [Developers](developers/index.md).

!!! info "Data"
    Until the school Raspberry Shakes stream to UHSN, the apps use open data from
    University of Utah Seismograph Stations (network UU, via EarthScope) and the
    USGS earthquake catalog. See [Our stations and data](theory/stations.md).
