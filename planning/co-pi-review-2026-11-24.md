# Review of UHSN planning and co-PI decision materials

**Prepared for:** Gus Williams and Claude  
**Date:** 2026-11-24  
**Purpose:** Evaluate the material available for decisions about a rural Utah high-school seismic education program, and specify changes that would make a co-PI packet useful. This is a review and action brief, not an approval of the proposed program.

## Main assessment

The project has a strong foundation: real Utah records, an interactive location activity, a short animation, a teacher card with answer keys, and a large menu of questions that can connect science to a school's own instrument. The principal communication problem is that a decision maker must extract a manageable program and its dependencies from a much larger collection of ideas. The project should first seek agreement on a small classroom pilot and its operating requirements, while retaining the broader catalog as a reference.

The existing materials are useful working drafts, but the 46-activity inventory, detailed evaluation, and technical plans do not yet form a concise decision packet. A co-PI needs to know what is available, what students actually do, what must be built or supplied, who will do it, and what decision is being requested. A teacher needs an even shorter path to a workable lesson. High-school students need a visual question and an action before an extended technical explanation.

**Recommended immediate action for Claude:** produce a short co-PI decision brief and a small illustrated pilot menu from the existing files. Keep all proposed program choices explicitly provisional. Confirm the current state of the interrupted work before editing, and preserve the user's uncommitted changes. Do not treat this review as a decision by Gus, Dale, Cleat, teachers, or DRI.

## Scope and evidence

Reviewed the repository's planning documents, project instructions, site navigation and representative student, teacher and science materials. The detailed inventory and draft lesson ideas are in `planning/activities.md`; `planning/evaluation.md` is a dated snapshot of a separately identified living document; `planning/roadmap.md` and `planning/decisions.md` describe the build and prior decisions; `planning/quake-explorer.md` is a proposal. Word versions exist beside the planning files. `docs/` contains the website source; `site/` is a generated site and should not be treated as a second source of truth.

This review assesses source content and project claims; it is not a full usability, accessibility, classroom, live-data, visual layout, cost, legal, or scientific validation. Reported implementation status below is based on repository files and the project's own records, not an independent deployment or functionality test. The available science figures and animations are assets, not evidence by themselves that students can use them successfully.

### Assessment of the two Word documents

- `planning/Raspberry Shake in Utah High Schools Network Evaluation & Student App Concepts.docx` is a substantial technical and program rationale, with eight tables. Its summary combines the current network, proposed applications, research and an assumed DRI data service. It provides background for a decision, but needs a visible version/date, a concise list of decisions and a cost and staffing basis before it serves as the cover document. Its first-app sequence differs from the current roadmap. Confirm whether the Word file matches the dated Markdown snapshot and living artifact before revising or sending it.
- `planning/UHSN activities by setup.docx` provides a detailed catalog: 14 external-data, 18 installed-Shake, 8 roaming-Shake and 6 phone activities. The setup classifications, questions for Dale and Cleat, and proposed trials are useful. Asking recipients to judge 46 entries equally makes prioritization difficult; use a shortlist in the brief and retain this document as the detailed reference. Its estimates for experiment supplies, a roaming kit and phone loaners need current quotes and clear ownership. Its trial plan needs assigned people, dates and criteria. Confirm that this Word draft and the untracked Markdown version contain the same changes before either is revised.

Word content was extracted for review; page rendering and layout were not independently assessed. Neither document should be assumed to be a final distribution copy on the basis of this review.

## Current offer and gaps

| Item | Evidence in repository | Decision implication |
| --- | --- | --- |
| Wave Race | App, illustrated guide, teacher card and bundled example. The roadmap reports developer checks and says a real teacher/student trial remains. | Demonstrable pilot candidate; do not present time or learning outcomes as established. |
| Quake Waves and P/S motion | Animations and guides; Quake Waves is the Wave Race warm-up. | Useful visual entry point; a stand-alone classroom card is still on the roadmap. |
| School Pulse | Described as coming soon; Stage 2 remains unchecked. Its first version uses a stand-in station, not a school Shake. | Ask whether campus patterns are a pilot priority and determine whether the chosen station can support the proposed interpretation. |
| School Shake activities | S1 uses Raspberry Shake's own viewers; most others depend on data access, equipment, experiments or new tools. | Agree on a practical path from installed instrument to a first local observation, including a fallback. |
| Quake Explorer | Detailed Stage 3 proposal; plan explicitly says nothing built. | Treat the four investigations and build sequence as options, subject to science checks and program priorities. |
| Research cohort | Proposed mentored track with notebooks and advanced questions. | Separate staffing, audience and outputs from the core classroom commitment. |

The existing cards' distinction among external data, installed Shake, roaming Shake and phone activities is useful. Preserve it, but explicitly distinguish **available now**, **requires school data or another tool**, **proposed**, and **requires a field trial**. A science page containing an example does not make a complete student investigation available. The repository says stand-ins are professional UU stations, not the school's instrument. A future school source requires an ingest service, data agreement and implementation; `planning/activities.md` Appendix A's suggestion that the switch is simply a configuration change understates this work. A bundled sample can avoid a live data-service request after the site is available; it does not by itself establish that the whole website works without internet.

## Scope and prioritization

The 46 activities in `planning/activities.md` are a valuable idea bank, but asking co-PIs to mark all of them yes/maybe/no is a high-effort request and obscures choices about capacity. The associated evaluation combines network architecture, products, physics, hardware, research, standards and policy. Each subject matters, but the first decision should establish the purpose and capacity of the initial school experience.

Recommend an initial **pilot package for discussion**, subject to school and team agreement:

1. **A 10–15 minute visual introduction:** predict and observe P and S waves with Quake Waves.
2. **One complete earthquake investigation:** Wave Race in a guided demonstration and, if time permits, pairs using the sample or a suitable event.
3. **One local Shake experience:** meet the installed instrument and investigate a safe local signal with the existing viewer where the site and data permit. Determine the actual classroom procedure with a teacher and the station owner.
4. **One follow-on campus-pattern investigation:** School Pulse as a candidate after the team checks data, interpretation, privacy and development effort. Do not promise that class changes will be visible at every site.

This sequence offers a common experience, a real-data investigation and a clear route toward school ownership. It is a recommendation for the co-PIs to assess, not a replacement for their priorities. Keep roaming instruments, phones, network comparisons, advanced explorer views and the research cohort as separately costed options. The detailed cards can be revisited after the team has chosen the pilot and established constraints.

## Applicability to schools and students

The proposed school setting is compelling: students can connect a locally installed instrument, their community and a scientific question. The plans already account for browser use, short periods, fixed instruments, stand-in data, and differing setups. The current first complete investigation, however, uses professional stations. Make that explicit next to every example and show a credible path to a school station, without implying a real-time school network exists.

Before claiming school readiness, obtain a short inventory from each school: teacher and IT contacts; course and likely class time; device/browser and network restrictions; Shake model, site and data access; who can support a lesson; and whether common local signals are observable. Record unknowns as unknown. Evaluate site feasibility before prescribing equipment, 30 m measurements, visitor-led experiments, or phone use. Prices, staffing, availability, legal interpretations and deployment timelines in the drafts are estimates or assumptions until confirmed.

The stated student audience varies: the user asks for high-school science, while `README.md`, `CLAUDE.md` and the evaluation emphasize technically strong or advanced students. This is a program-level choice. Recommend a general high-school entry path with extensions for advanced students and a separate mentored research track. For each pilot activity identify prerequisite knowledge, one essential concept, a concrete student action and a visible result. Offer algebra and deeper physics as optional extensions unless a course requires them. Use teacher and student trials to determine reading level and timing rather than assuming that an advanced audience represents all participating schools.

## Teaching, visuals and standards

The Wave Race card provides a driving question, timings, a sample answer key and troubleshooting. Its projector version is a practical starting point; its full version asks students to pick at least four stations, while the offline key has analyst P and S picks at only three. Reconcile what students are expected to do with the sample and communicate which picks are student judgments. The explanation and derivation, changing several settings, picking, and discussion within 45–55 minutes are plausible but untested. Trial both versions and record actual completion times and student difficulties.

The student guide has figures and screenshots, and the science pages contain real-data plots and animations. `docs/theory/seismograms.md` is approximately 24 KB of source and covers many distinct topics, so it can serve as a reference but may overwhelm a first encounter. Prioritize short, visual activity paths: question, prediction, one action, what to notice, explanation, then an optional deeper link. For each visual specify what a student should look for, units, source, whether data are real or simulated, and the conclusion it supports. Avoid making a long theory page prerequisite reading. Check figures on actual school screens and in print, with accessible text alternatives and non-color cues. `planning/science-figures.md` records several figure corrections still outstanding; resolve those before relying on the affected visuals.

The standards crosswalk is a good start but currently lists broad associations as though they were equivalent to a full performance expectation. For example, the Wave Race card has students locate an epicenter; that alone does not demonstrate the full ESS.2.2 expectation to model Earth's interior and describe convection. PHYS.4.1 asks students to derive relationships among frequency, wavelength and speed in media; comparing P and S arrival speeds alone does not cover all parts. Mark each entry **directly assessed**, **contributes**, or **extension**, and specify the student work and evidence for the claim. Use exact code, course, current source and review date, with a teacher review; avoid the generic `GEOL.3.x` label in official claims. Do not claim that a single lesson satisfies an entire standard unless the student task and assessment support that claim. Compare the [Utah Education Network ESS standards](https://www.uen.org/core/core.do?courseNum=3601) and [Physics standards](https://www.uen.org/core/core.do?courseNum=3642) with the current official text; this review spot-checked those two examples, not all codes.

## Organization and communication

Use four distinct layers, each with a named audience and an owner:

| Layer | Audience | Content and proposed size |
| --- | --- | --- |
| Decision brief | Co-PIs | 2–3 pages: purpose, pilot, current state, 4–6 decisions, consequences, owners and next step. |
| Illustrated pilot menu | Co-PIs and teachers | 3–5 candidate activities, one short entry each: question, action, time, data/setup, readiness, standard contribution and open issue. |
| Classroom materials | Teachers and students | One printable teacher card and a short visual student path per approved activity; answers and troubleshooting in teacher materials. |
| Technical and idea appendix | Developers, science leads and interested co-PIs | Full 46-activity catalog, research, data architecture, citations, estimates, trials and detailed crosswalk. |

Keep the comprehensive inventory available, but ask for ranked choices among a short list, plus permission to propose another idea. The decision packet should use plain names and define UHSN, DRI, UU, P and S on first use. Move FFT, FDSN, Nyquist, grid search and architecture details to background unless needed for a decision. Provide one annotated screenshot or example record for each shortlisted experience, labelled as an existing screen or a proposed concept. Give the recipient a precise response method, deadline only if Gus sets one, and a way to provide a conditional answer. Identify whether each document is a draft, snapshot, approved decision or implemented deliverable, with date and link to its maintained source.

The planning set has multiple authorities: the evaluation points to a living Claude artifact, the repository contains a dated snapshot and Word copy, and the activity inventory has an untracked Word document. `planning/science-figures.md` also points to an external artifact. Before editing or circulating, identify which version is current and who can access it. If Claude cannot access an artifact, flag that limitation and work from the repository snapshot; do not silently call the snapshot current. `planning/decisions.md` records decisions already made with Gus. Separate these from questions proposed for co-PIs, and explain any proposed change to the agreed staged order.

Two specific examples need reconciliation: the evaluation summary names School Pulse, Game Night Quake and Wave Race as first builds, while the roadmap places Wave Race first, School Pulse second and the school-data version of Game Night Quake later. The evaluation's illustrative S–P velocities differ from the later choice in decision D9. The snapshot may retain its historical values if it is clearly labelled and linked to the current decision; current teaching and decision materials should explain which values they use and why.

The planning directory is outside the built website, but the repository is public according to README and decision D13. Treat unpublished drafts and school-specific details accordingly. The working tree already contains changes to `docs/teachers/index.md` and untracked `planning/activities.md` and Word materials; do not overwrite, reset or commit them as part of this review.

## Decisions to request from co-PIs

The following are proposed questions, with recommended starting positions. They require team input; no owner, budget or deadline is assumed to have been agreed.

| Decision | Recommendation for discussion | Consequence or dependency |
| --- | --- | --- |
| Audience and outcome | General high-school entry activity, with advanced extensions. | Determines reading level, pacing, teacher support and assessment. |
| Pilot package | Start with the visual wave introduction, Wave Race and a local instrument encounter; assess School Pulse as the next candidate. | Limit early development; requires a teacher and a feasible school site. |
| First schools and time | Ask which teachers and schools can pilot, in what courses and class periods. | Determines accessible lesson length and whether one activity can be tested more than once. |
| School data path | Confirm station ownership, direct access, school IT and data-sharing permissions; assign a technical owner to investigate ingest. | A school-data network and cross-school app require more than a configuration switch. Obtain written clarification of license and data permissions before relying on the proposed interpretation. |
| People and resources | Identify who supports teachers, manages data and instruments, builds materials, pays costs and handles failures. | Determines feasible number of schools and whether a roaming kit or ongoing service is possible. |
| Evidence of success | Agree on a small pilot evaluation: completion, time, student explanation, teacher feedback, and instrument/data reliability. | Avoids equating app availability or standard labels with learning. |

If the co-PIs want all 46 activity decisions now, supply the full catalog as an appendix. Ask them to identify their top three and any exclusions rather than imply that an include vote commits a delivery date or budget. Decisions about phones, roaming kits, live campus data and research can follow once pilot goals and capacity are known.

## Action instructions for Claude

1. Read this review, `CLAUDE.md`, `planning/decisions.md`, the current roadmap and working-tree changes. Identify the interrupted work and authoritative source for each draft. Preserve all existing user work.
2. Draft the decision brief and pilot menu in `planning/`, dated and labelled as drafts. Use the existing Word documents and activity IDs as source material, and show a traceable link from each recommendation to its source. Clearly label recommendations, estimates, unknowns and already-made decisions. Do not send anything.
3. Reduce the first decision round to the questions above, subject to Gus's priorities. For each choice show the practical implication and what is needed to act. Include a compact proposed reply format that co-PIs can complete in minutes, and a short optional cover message for Gus to edit.
4. Reconcile the inconsistent descriptions of school-data readiness, stage order, the status of Quake Explorer, the student audience, and the sample's station count. Update source documents only after confirming intent and maintaining a record of changes; do not imply that draft recommendations are approved.
5. Select or create an illustrative example of the pilot experience from existing assets. Verify that each image's labels, units, source and simulated/real status are clear. Resolve the outstanding figure corrections listed in `planning/science-figures.md` as appropriate to any material sent.
6. Produce a teacher-ready pilot card with setup, a fallback, 15-minute and class-period paths, visual prompts, student response, answer guidance and an exit ticket. Pilot timing, network conditions and accessibility remain to be checked with teachers and students. In particular, inspect map-tile behavior when external services are unavailable; the stored waveform example does not establish a fully offline map. Try trackpad, keyboard, zoom and touch workflows and record any barriers to precise waveform picks or map placement.
7. Audit the standards for shortlisted activities against current official course documents. For every code, map the actual student action and assessment, identify partial matches and seek teacher review. Keep exact quotations and sources accurate.
8. Prepare a dependency and cost table for proposed school-data ingest and ongoing operations: equipment, school permissions, technical work, support, ownership, approximate cost and uncertainty. Treat legal and vendor interpretations as questions for the responsible parties; do not present this review as a legal conclusion.
9. Propose a pilot feedback sheet and record observations from actual trials when available. Set acceptance measures with the team rather than inventing results. Maintain a visible decision log and update the roadmap only after decisions are made.

## Suggested review and pilot measures

For each trial, record school, course, student count, duration, device and network conditions, instructor support, and which data source was used. Observe how many groups reach the core task, where they stop, whether students can explain the relationship between arrival-time difference and distance using evidence, and whether the teacher would reuse the activity. Ask one open question about relevance to their school and one about unclear visuals or language. Collect no student identifiers unless the responsible school has explicitly approved the process. Record failures and deviations alongside successes. Set numerical targets jointly after discussing the baseline and resources.

## Sources and limits

Primary repository sources: `planning/activities.md`, `planning/evaluation.md`, `planning/roadmap.md`, `planning/decisions.md`, `planning/quake-explorer.md`, `planning/science-figures.md`, `docs/teachers/wave-race-card.md`, `docs/teachers/standards.md`, `docs/apps/wave-race.md`, `docs/theory/`, and `CLAUDE.md`. The Utah standards links above were checked on 2026-11-24 for the two named examples. Raspberry Shake's [license](https://raspberryshake.org/license/) should be reviewed for the actual proposed data use; obtain written clarification rather than treating a planning summary as a definitive permission. Other standards, source claims, district policies, costs and scientific claims have not been independently audited in this review.
