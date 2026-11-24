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

## Utah standards at a glance { #utah-standards }

Which Utah standards each activity and science page supports. The codes are explained below
the table; the [standards crosswalk](standards.md) shows where each one comes up in the lesson.

| Activity or topic | What it is | Utah standards |
| --- | --- | --- |
| [Wave Race](wave-race-card.md) | App and activity card | PHYS.4.1 · ESS.2.2 · ESS.2.3 · ESS.4.1 · GEOL.3.x · CS&nbsp;9/10.DA.3 · CS&nbsp;11/12.DA.1 |
| [Quake Waves](../theory/locating.md#watch-it-happen) | Animation (warm-up) | PHYS.4.1 · ESS.2.2 |
| [Seismic waves](../theory/waves.md) | Science page | PHYS.4.1 · ESS.2.2 |
| [Reading a seismogram](../theory/seismograms.md) | Science page | PHYS.4.1 · ESS.4.1 · CS&nbsp;9/10.DA.3 |
| [Distance from S minus P](../theory/s-minus-p.md) | Science page | PHYS.4.1 |
| [Locating a quake](../theory/locating.md) | Science page | ESS.2.3 · CS&nbsp;11/12.DA.1 |

What the codes mean (paraphrased; check the exact wording in the
[Utah SEEd standards](https://www.schools.utah.gov/curr/science/_science_/UtahSEEdStandards.pdf)
and [Utah 6–12 Computer Science standards](https://Schools.Utah.gov/cte/_cte/computer/612ComputerScienceStandards.pdf)
before using them in official materials):

- **[PHYS.4.1](https://www.uen.org/core/core.do?courseNum=3642)** (Physics): relate frequency,
  wavelength and wave speed in different materials; seismic waves are an example.
- **[ESS.2.2](https://www.uen.org/core/core.do?courseNum=3601)** (Earth and Space Science):
  model Earth's interior from evidence, including seismic waves.
- **[ESS.2.3](https://www.uen.org/core/core.do?courseNum=3601)** (Earth and Space Science):
  explain how plate tectonics produces patterns at Earth's surface.
- **[ESS.4.1](https://www.uen.org/core/core.do?courseNum=3601)** (Earth and Space Science):
  explain how natural hazards and resources affect human activity.
- **[GEOL.3.x](https://www.uen.org/core/core.do?courseNum=3608)** (Geology elective): Earth's
  interior, evidence for plate tectonics, stress in the crust.
- **[CS&nbsp;9/10.DA.3](https://Schools.Utah.gov/cte/_cte/computer/612ComputerScienceStandards.pdf)**
  (Computer Science): create data visualizations that help others understand real phenomena.
- **[CS&nbsp;11/12.DA.1](https://Schools.Utah.gov/cte/_cte/computer/612ComputerScienceStandards.pdf)**
  (Computer Science): refine or create computational models from data.

Wave Race also builds the SEEd science and engineering practices: analyzing and interpreting
data, using mathematics and computational thinking, and constructing explanations.

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
