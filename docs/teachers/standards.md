# Standards crosswalk

How the UHSN apps map to Utah's science (SEEd) and computer science standards. Standard
descriptions are **paraphrased** from UEN course pages. Check the exact wording against the
current [Utah SEEd standards](https://www.schools.utah.gov/curr/science/_science_/UtahSEEdStandards.pdf)
and [Utah 6–12 Computer Science standards](https://Schools.Utah.gov/cte/_cte/computer/612ComputerScienceStandards.pdf)
before using them in official materials.

For a one-table summary of every activity and science page, see
[Utah standards at a glance](index.md#utah-standards).

## Wave Race { #wave-race }

App: [Wave Race guide](../apps/wave-race.md) · Lesson: [Wave Race activity card](wave-race-card.md).

| Standard | Course | What it asks (paraphrased) | Where it shows up in Wave Race |
| --- | --- | --- | --- |
| [PHYS.4.1](https://www.uen.org/core/core.do?courseNum=3642) | Physics | Analyze data to relate frequency, wavelength and wave speed in different media; seismic waves are an example | P and S travel at different speeds through the same rock; \(v = f\lambda\); filters keep chosen frequencies |
| [ESS.2.2](https://www.uen.org/core/core.do?courseNum=3601) | Earth & Space Science | Develop a model of Earth's interior from evidence, including seismic waves | Body waves; why S waves not crossing the outer core revealed it is liquid; speeds depend on the rock |
| [ESS.2.3](https://www.uen.org/core/core.do?courseNum=3601) | Earth & Space Science | Explain how plate tectonics produces patterns at Earth's surface | Locating several quakes shows the Intermountain Seismic Belt through central Utah |
| [ESS.4.1](https://www.uen.org/core/core.do?courseNum=3601) | Earth & Space Science | Explain how natural hazards and resources affect human activity | Locating local quakes, including near mines and population centers; why monitoring networks exist |
| [GEOL.3.x](https://www.uen.org/core/core.do?courseNum=3608) | Geology (elective) | Earth's interior, evidence for plate tectonics, crustal stress | Same as ESS.2.2 and ESS.2.3 |
| [CS 9/10.DA.3](https://Schools.Utah.gov/cte/_cte/computer/612ComputerScienceStandards.pdf) | Computer Science | Create data visualizations that help others understand real phenomena | Reading seismograms and the map; the CSV export for students' own plots |
| [CS 11/12.DA.1](https://Schools.Utah.gov/cte/_cte/computer/612ComputerScienceStandards.pdf) | Computer Science | Refine or create computational models from data | The grid search is a computational model; students test how its settings change the answer |

## Quake Explorer { #quake-explorer }

App: [Quake Explorer guide](../apps/quake-explorer.md) · Lessons, one per investigation:
[How fast is the rock?](how-fast-is-the-rock.md) (A) ·
[What notes is the ground playing?](notes-of-a-quake.md) (B) ·
[Which way did the ground move?](which-way-did-it-move.md) (C) ·
[A message from far away](far-side-of-the-world.md) (D).

| Standard | Course | What it asks (paraphrased) | Where it shows up in Quake Explorer |
| --- | --- | --- | --- |
| [PHYS.4.1](https://www.uen.org/core/core.do?courseNum=3642) | Physics | Analyze data to relate frequency, wavelength and wave speed in different media; seismic waves are an example | A: P and S speeds measured from the slope of the arrivals; faster rock below the crust (Pn). B: notes (frequencies) in the spectrogram, the filter as a choice of notes, sound sped up. C: P moves rock along its path, S across it. D: body waves travel through the Earth, surface waves around it and more slowly; longer surface waves reach deeper, faster rock, so the low notes arrive first |
| [PHYS.2.1](https://www.uen.org/core/core.do?courseNum=3642) | Physics | Analyze data to track and calculate energy transfer within a system | B: high notes lose their energy to heat first; waves weaken as their energy spreads out with distance |
| [ESS.2.2](https://www.uen.org/core/core.do?courseNum=3601) | Earth & Space Science | Develop a model of Earth's interior from evidence, including seismic waves | A: the bend in the arrivals reveals the crust's thickness (the Moho). C: real data show P moving rock along its path and S across it, the property that tells us the outer core is liquid (S can't cross it); directions are 10–15° off because layered rock bends waves. D: travel times through the whole Earth curve because rock gets faster with depth; the core's shadow |
| [ESS.4.1](https://www.uen.org/core/core.do?courseNum=3601) | Earth & Space Science | Explain how natural hazards and resources affect human activity | B: telling a quarry blast from an earthquake, as monitoring networks must |
| [GEOL.3.x](https://www.uen.org/core/core.do?courseNum=3608) | Geology (elective) | Earth's interior, evidence for plate tectonics, crustal stress | A: crust thickness under Utah from real data |
| [CS 9/10.DA.3](https://Schools.Utah.gov/cte/_cte/computer/612ComputerScienceStandards.pdf) | Computer Science | Create data visualizations that help others understand real phenomena | Record section, spectrogram, particle-motion paths and the travel-time chart are all visualizations of the same data; the CSV for students' own charts (D: a class travel-time chart) |
| [CS 11/12.DA.1](https://Schools.Utah.gov/cte/_cte/computer/612ComputerScienceStandards.pdf) | Computer Science | Refine or create computational models from data | A: a straight line (and two lines) fitted to arrivals is a model of wave travel; students compare their ruler with the fit |

## Quake Waves (animation) { #quake-waves }

App: [Quake Waves guide](../apps/quake-waves.md) · Lessons:
[One quake, two waves](one-quake-two-waves.md) (a 10-minute demo, with the
[How P and S waves move rock](../app/wave-motion/index.html) animation) and the warm-up in the
[Wave Race activity card](wave-race-card.md). A cartoon, also shown on the
[Locating a quake](../theory/locating.md#watch-it-happen) page.

| Standard | Where it shows up |
| --- | --- |
| [PHYS.4.1](https://www.uen.org/core/core.do?courseNum=3642) | Two waves with different speeds in the same rock; the gap between them grows with distance. In the demo card, P moves rock along its path and S across it |
| [ESS.2.2](https://www.uen.org/core/core.do?courseNum=3601) | Seismic waves as the evidence used to locate quakes (and, by the same reasoning, to model Earth's interior). In the demo card, S cannot cross a liquid, which is how we know the outer core is liquid |

## Science and engineering practices

Wave Race is built around the practices that SEEd standards share:

- **Analyzing and interpreting data:** picking arrivals on noisy real data and judging quality.
- **Using mathematics and computational thinking:** deriving and using the S-minus-P formula;
  the grid search.
- **Constructing explanations:** why the location is off, and which station is to blame.
- **Crosscutting concept, scale and proportion:** seconds become kilometres; 0.1 s of pick
  error moves a circle about 0.8 km.

Quake Explorer adds **predicting before checking** (every investigation asks for a prediction
first), **comparing a measurement with professionals' and computers' answers** (and
discussing why they differ), and the crosscutting concept **cause and effect** (why high notes
fade first; why up goes with away in a P wave).

## Coming later

Future apps (such as School Pulse, which looks at the daily rhythm of campus noise) will add
rows here as they are released.
