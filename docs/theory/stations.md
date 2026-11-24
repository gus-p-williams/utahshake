# Our stations and data

**Used in:** [Quake Locator](../apps/wave-race.md) · [Quake Explorer](../apps/quake-explorer.md)

The apps show real data from real seismometers. This page tells you where the data come from
and how to credit them in your own work.

## Stand-in stations

Each UHSN school has a Raspberry Shake seismometer. Until those Shakes stream their data to
UHSN, the apps use stations of the **University of Utah Regional Seismic Network** (network
code **UU**) instead. These are professional stations, and their data are open to everyone.

For each school, one University of Utah station **stands in** for the school's own sensor. It
is the nearest active University of Utah station to the school. Quake Locator marks it as
"stands in for …".

| School | Town | Stand-in station |
| --- | --- | --- |
| Juab High School | Nephi | SUU |
| North Sanpete High School | Mt. Pleasant | ELU |
| Wasatch Academy | Mt. Pleasant | TMU |
| Gunnison Valley High School | Gunnison | SGU |
| Millard High School | Fillmore | WCU |

<figure markdown="span">
  ![Map of Utah with eight towns. A box in central Utah holds the five UHSN schools in a rough north–south line. The enlarged box shows each school joined by a line to its stand-in station: Juab High School to SUU, 20 km; North Sanpete High School to ELU, 25 km; Wasatch Academy to TMU, 35 km; Gunnison Valley High School to SGU, 15 km; Millard High School to WCU, 22 km.](img/schools-map.svg){ loading=lazy }
  <figcaption>Figure 1. The five UHSN schools and the University of Utah station that stands in
  for each, with the distance between them. Station locations: University of Utah Seismograph
  Stations (network UU, doi:10.7914/SN/UU) via EarthScope.</figcaption>
</figure>

The five schools sit in a north–south line in central Utah, so Quake Locator also adds **helper**
stations around each quake. That way you can surround it (see
[Why the stations' positions matter](locating.md#why-the-stations-positions-matter)).

The apps don't use data from other people's Raspberry Shakes: Raspberry Shake's license does
not allow it.

## Who runs the stations

The **University of Utah Seismograph Stations** run the network and locate Utah's earthquakes.
The seismograms reach the apps through **EarthScope Data Services**.

## Where the quakes come from

The list of quakes and their official locations come from the **USGS earthquake catalog**,
called **ComCat**. For many Utah quakes, ComCat also holds the P and S picks made by
University of Utah analysts. Quake Locator and Quake Explorer show those picks after you reveal the
answer; Quake Explorer also shows its own computer picks, marked as such, where analysts made
none.

## If the school network blocks the data

Some school networks block the data services. For that, some quakes are stored with the site.
In Quake Locator, **Use the offline sample** loads the magnitude 3.3 quake near Junction, Utah, on
October 31, 2026 (UTC). In Quake Explorer, **Use the offline samples** loads six quakes and
blasts, enough for all four investigations.

## How to credit the data

If you use these data in a report, poster or science fair project, credit them the way the
apps do:

- Waveforms: University of Utah Seismograph Stations, network UU
  ([doi:10.7914/SN/UU](https://doi.org/10.7914/SN/UU)), via EarthScope Data Services.
- Earthquake locations and analyst picks: U.S. Geological Survey ComCat / University of Utah
  Seismograph Stations.
- Map data © OpenStreetMap contributors.
- Travel times for distant quakes: the iasp91 Earth model (Kennett and Engdahl, 1991), via
  ObsPy TauP.
- Wind speeds (the wind figure on [Reading a seismogram](seismograms.md)): Milford Municipal
  Airport weather station, via the Iowa Environmental Mesonet.
- Noise reference curves (on [Beyond one seismogram](plots.md)): Peterson, J. (1993),
  *Observations and modeling of seismic background noise*, USGS Open-File Report 93-322.
- Shear-wave speeds at the Utah FORGE site (the H/V figure): Zhang, H., and K. L. Pankow
  (2021), *Geophysical Journal International* 225, 1605–1615; depth to granite: Utah
  Geological Survey Miscellaneous Publication 169 (2019).
- The rocket-motor explosions: Stump, B., and others (2007), *29th Monitoring Research
  Review*, 674–676.

Licensing and technical detail are in [Data sources and licensing](../developers/data-sources.md).
