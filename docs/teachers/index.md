# Teachers

Classroom activities for the UHSN apps: timings, answer keys and the Utah standards each one
covers. Every app runs in a browser, so students need no install and no accounts.

## Activities

| App | Activity | Time | What students do |
| --- | --- | --- | --- |
| [Wave Race](../apps/wave-race.md) | [Wave Race activity card](wave-race-card.md) | 15 min (whole class) or a full period (pairs) | Pick P and S on real Utah seismograms, turn S − P into distances, and locate the quake |
| [Quake Waves](../theory/locating.md#watch-it-happen) (animation) | The warm-up in the [Wave Race card](wave-race-card.md) ("Model" in the 15-minute version, "Engage" in the full period) | About 1 minute | Watch P and S waves race out from a quake and turn into circles that cross at it |

Students follow the [Wave Race guide](../apps/wave-race.md): it walks them through the app
step by step. The [Locating a quake](../theory/locating.md) page holds Quake Waves and the
science behind it.

**Coming soon:** School Pulse, which looks at the daily rhythm of campus noise.
**Planned:** Quake Explorer. Activity cards for them will be added here when they are released.

## Standards

The [standards crosswalk](standards.md) maps each app to Utah SEEd and computer science
standards: [Wave Race](standards.md#wave-race) · [Quake Waves](standards.md#quake-waves).

## Before class { #before-class }

Setup that every app needs. Check it before your first lesson.

### Try the app on the school network

Open the app from a student device on the school network. The apps download data from the
University of Utah's stations (through EarthScope) and from the USGS. If the quake list
doesn't load, the network is blocking them. You have two options:

- **Use the offline sample.** Press **Use the offline sample** (top right in Wave Race). It
  loads a magnitude 3.3 quake from October 2026 that is stored with the site, so it works
  without those services. The [Wave Race card](wave-race-card.md#answer-key-offline-sample-quake)
  has its answer key.
- **Ask IT to allow the data services.** The apps need:

    | Address | What it is for |
    | --- | --- |
    | `service.earthscope.org` | Station lists and seismograms |
    | `earthquake.usgs.gov` | Quake list, official locations and analyst picks |
    | `tile.openstreetmap.org` | The background map |
    | `gus-p-williams.github.io` | This site and the apps themselves |

### Send everyone to the same quake

Load the quake you want, then share the page address (for example in your class page or on
the board). It includes the quake's ID, for example `…/app/wave-race/?event=uu80162166`.
For the offline sample, add `&source=sample`.

### Devices

Any browser works, including Chromebooks and managed laptops. There is nothing to install and
no login. For the whole-class version you also need a projector.

### Privacy

The apps have no student accounts, and students never enter their names or any other
personal information. Picks stay in the browser on the student's own device; nothing is sent
to a server. Students can download their picks as a CSV file to hand in. This keeps the apps
in line with Utah's student data privacy rules (R277-487).
