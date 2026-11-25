# Mothballed

Work taken off the site but kept for later. Nothing in `planning/` is published.

## The phyphox teacher page (mothballed 2026-11-25, Gus; D40)

- `phyphox-teacher-page.md`: was `docs/teachers/phyphox.md` ("Phones with an app: phyphox",
  session D12-phyphox).
- `uhsn-vibration.phyphox`: the ready-made phyphox experiment the page opened.
- `phyphox.test.js`: its test (kept the link in step with `site_url`); it doesn't run here.
- Sources: `planning/phyphox-sources.md`.

**Why mothballed:** our site did nothing with phyphox's data, so the page only told teachers
that the app exists. It comes back when one of our apps can open a phyphox recording (its
exported CSV), for example the table-tap exercise (P3 "Find the hit" in the questions
document) or the School Shake Viewer.

**How it comes back (Gus):**

- No "Open in phyphox" button and no experiment file: the page just tells students to open
  phyphox, make a recording, save (export) it, then open the recording in our app.
- Keep the instructions for finding and installing phyphox (iPhone and Android, step by step;
  Gus), and the page's other facts that still hold (why phyphox is the better instrument, why
  our browser pages are the default, old classroom phones, the rules). Recheck them, and add
  the steps above for the app that reads the file.
- Restore links from the Teachers page, the Phone Bench guide and "How small a shake can it
  see?", the Teachers menu entry, and the `NOT_CARDS` exception in
  `tests/teacher-cards.test.js`.
