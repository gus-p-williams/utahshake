# Adding an activity card

Teachers work from activities, not apps. An **activity card** is one lesson. Cards and apps
are many-to-many: a card may use several apps, or none (a campus experiment), and an app may
appear on several cards. Every app with a hub needs at least one card, except a prototype
that adults are still testing ([In development](adding-an-app.md#in-development)). Below,
`<activity>` is the card's file name in lowercase with hyphens (for example
`how-fast-is-the-rock`).

Use [How fast is the rock?](../teachers/how-fast-is-the-rock.md) as the model for a card with
one app, and [One quake, two waves](../teachers/one-quake-two-waves.md) for a short demo.

## The template

Create `docs/teachers/<activity>.md`:

````markdown
# Activity card: <Title>

Students follow [<the guide or its section>](../apps/<app>.md#<section>) (what they see, step
by step) and use [<App>](../app/<app>/index.html?<preset>).

!!! abstract "At a glance"
    - **Driving question:** <one question students can answer by the end>
    - **Time:** 15 min (whole class, on the projector) or 45–55 min (pairs).
    - **Setup:** Browser only. <live data, offline sample, or "cartoons, no data">
    - **Apps and tools:** [<App>](../apps/<app>.md), <which part> · [<Animation>](../app/<animation>/index.html) (the warm-up animation) · <other tools: a spreadsheet>
    - **Before this:** [<Earlier lesson>](<earlier-card>.md) (<what it gives this one>), or "Nothing."
    - **Materials:** <devices, projector, speakers, paper>
    - **Utah standards:** PHYS.4.1 · ESS.2.2 · CS&nbsp;9/10.DA.3 ([crosswalk](standards.md#<app>))

**Students will:** <verbs: read, measure, explain, compare, judge>.

**Quakes to load.** <a table of preset links, live and offline, if the app takes them>

No accounts or logins. Student names are never entered or stored.

!!! tip "Before class"
    <what to open and test on the school network; the offline fallback; a link to
    [Before class](index.md#before-class)>

## 15-minute version (whole class, on the projector)

1. **Hook (2 min).** …
2. **Predict (1 min).** …

## Full-period version (45–55 min, pairs)

| Phase | Time | What happens |
| --- | --- | --- |
| Engage | 5 min | … |
| Explore | 15 min | … |
| Explain | 10 min | … |
| Elaborate | 10–15 min | … |
| Evaluate | 5–10 min | … |

## Exit ticket

1. …

**Answers:** …

## Answer key: offline sample(s)

<the numbers students should get, with their source: analysts, a computer picker, a model>

## Common difficulties

- **…** …

## Extension ideas

- …
````

### The "At a glance" box

Every card has the same seven lines, in this order. `tests/teacher-cards.test.js` checks them.

| Line | What goes there |
| --- | --- |
| Driving question | The question the lesson answers, in students' words |
| Time | The whole-class version, then the full period. A short demo has one time |
| Setup | Written first: **Browser only** (records from University of Utah stations, or cartoons; no Shake needed), or **School Shake** for a card that uses the school's own Shake (which stays where it is: [D26](https://github.com/gus-p-williams/utahshake/blob/main/planning/decisions.md)). Then what that means for this card (live data, offline sample) |
| Apps and tools | The apps the lesson **uses**, each linked to its hub (`../apps/<app>.md`); an animation without a hub, to its page (`../app/<animation>/index.html`); then other tools. A card with no app says "no app" |
| Before this | An earlier lesson the card builds on, linked to its card, or "Nothing." An app named here is not one the card uses ([D25](https://github.com/gus-p-williams/utahshake/blob/main/planning/decisions.md): Quake Locator on the Quake Explorer cards) |
| Materials | What the room needs: devices, a projector, speakers, paper |
| Utah standards | The codes, separated by " · ", in the order PHYS, ESS, GEOL, CS (write `CS&nbsp;9/10.DA.3` so the code doesn't break across lines), then a link to the app's section of the crosswalk |

Write in US spelling. Keep student names and other personal information out of every task: the
apps have no accounts, and cards must not ask students to enter or hand in anything that
identifies them (Utah R277-487).

## Checklist

1. **The card.** Write `docs/teachers/<activity>.md` from the template. Say which numbers in the
   answer key come from analysts, which from a computer or a model, and which picks are the
   students' own judgment.
2. **Menu.** Add it to `nav:` in `mkdocs.yml` under **Teachers › Activity cards**, in teaching
   order.
3. **Catalog.** Add one row to the catalog on the [Teachers](../teachers/index.md#activities)
   page, under the heading for its setup (add `### School Shake` and the like when the first
   card of a new setup arrives): Activity · Apps and tools · Setup · Time · Standards. The apps
   and standards must match the card's box.
4. **Standards.** Add a row to
   [Utah standards at a glance](../teachers/index.md#utah-standards) with the same codes as the
   box. In the [standards crosswalk](../teachers/standards.md), name the card in its app's
   section and say where each standard shows up in the lesson. A code that is new to the site
   also gets a line in the code list under "Utah standards at a glance".
5. **Hubs.** In every hub the card names under "Apps and tools", add the card to the hub's
   "For teachers" line ("At a glance" box). If the hub mentions its cards elsewhere (Quake
   Waves: "Where else it appears"), add it there too.
6. **Science pages.** If the card is the main lesson for a science page, the page can link to it.
7. **Checks.** From the repository root:

    ```bash
    npm test                                   # includes tests/teacher-cards.test.js
    mkdocs build --strict -d site              # fails on a page missing from nav or a broken #anchor
    node tools/site-check.mjs site             # every page at 1366, 1093 and 390 px
    ```

## What `tests/teacher-cards.test.js` checks

- Every page in `docs/teachers/` except `index.md` and `standards.md` is a card, with the box
  above: the seven lines in order, a known setup, at least one standard and a link to an
  existing crosswalk section. A new teacher page that is not a card goes in the test's
  `NOT_CARDS` list.
- Every app hub (`docs/apps/*.md` except `index.md`) is named by at least one card.
- Both directions of D19: each hub a card names lists that card in its "For teachers" line, and
  each card a hub lists names that hub. A card links an app's hub, not only the app itself.
- Every app on the [All apps](../apps/index.md) page, animations included, is used by at least
  one card.
- Prototypes are exempt from needing a card: the apps and hubs linked from the
  [In development](../apps/index.md#in-development) section of All apps
  ([Prototypes](adding-an-app.md#in-development)). They get one when they graduate. Their
  hubs still need the "At a glance" box and a "For teachers" line, which can say "none yet".
- The Teachers catalog has exactly one row per card, under the card's setup heading, with the
  same apps and standards as the box; "Utah standards at a glance" has the same codes.
- Every card is in `mkdocs.yml` under **Activity cards**.
