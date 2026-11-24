# Our stations and data

**Used in:** [Wave Race](../apps/wave-race.md)

The apps show real data from real seismometers. This page tells you where the data come from
and how to credit them in your own work.

## Stand-in stations

Each UHSN school has a Raspberry Shake seismometer. Until those Shakes stream their data to
UHSN, the apps use stations of the **University of Utah Regional Seismic Network** (network
code **UU**) instead. These are professional stations, and their data are open to everyone.

For each school, one University of Utah station **stands in** for the school's own sensor. It
is the nearest active University of Utah station to the school. Wave Race marks it as
"stands in for …".

| School | Town | Stand-in station |
| --- | --- | --- |
| Juab High School | Nephi | SUU |
| North Sanpete High School | Mt. Pleasant | ELU |
| Wasatch Academy | Mt. Pleasant | TMU |
| Gunnison Valley High School | Gunnison | SGU |
| Millard High School | Fillmore | WCU |

The five schools sit in a north–south line in central Utah, so Wave Race also adds **helper**
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
University of Utah analysts. Wave Race shows those picks after you reveal the answer.

## If the school network blocks the data

Some school networks block the data services. For that, one quake is stored with the site:
the magnitude 3.3 quake near Junction, Utah, on October 31, 2026 (UTC). In Wave Race, press
**Use the offline sample** to load it.

## How to credit the data

If you use these data in a report, poster or science fair project, credit them the way the
apps do:

- Waveforms: University of Utah Seismograph Stations, network UU
  ([doi:10.7914/SN/UU](https://doi.org/10.7914/SN/UU)), via EarthScope Data Services.
- Earthquake locations and analyst picks: U.S. Geological Survey ComCat / University of Utah
  Seismograph Stations.
- Map data © OpenStreetMap contributors.

Licensing and technical detail are in [Data sources and licensing](../developers/data-sources.md).
