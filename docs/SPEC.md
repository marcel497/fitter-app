# Sedimi Fitter – formats and architecture (stage 1)

Source of truth for behaviour and file formats. Exported on 27 Nov 2026 from the design document _Fitter app – formats and architecture (stage 1)_; edit this file from now on, by pull request. Decisions are logged in [`DECISIONS.md`](DECISIONS.md); the contract with the Sedimi site is in [`interop/`](interop/README.md).

## At a glance

Sedimi Fitter (fitter.sedimi.bike) is a static web page that works offline after the first visit: no install, no server, no AI needed. Everything that differs between fitters lives in one **profile** file, and each fit is one **fit.json v2** file that carries the measurement definitions it was made with.

- **Profile** = what the fitter measures (label, unit, range, method, in which set-up), dictation order, branding, report texts, language. Marcel's current way of measuring is profile #1.
- **fit.json v2** = a list of set-ups instead of fixed old/new, cleat and saddle-tilt direction as a sign, a profile revision instead of the 2 Nov 2026 date in code.
- **Dictation** is handled by a fixed grammar built from Marcel's rules (angles, positions, continuation, joining digits by range), no AI.
- **Report** renders in the browser from the same templates and is saved as PDF through print.
- **AI** later only proposes changes; the fitter confirms them.

Marcel's four design decisions of 27 Nov 2026 are built in (table near the end), and the document was reviewed on Fable the same day (_Review notes_, last section).

## Goals and constraints of stage 1

Stage 1 fixes two file formats (the fitter profile and fit.json v2) and the shape of a browser app that turns a fit into a PDF report with no install and no AI. Everything later (paid AI bridge, recorder) plugs into these two formats, so they must be right first.

- **No install.** The fitter opens a URL in Chrome or Edge. It keeps working offline after the first visit.
- **No AI required.** Capture, panel and report work with typed or dictated numbers only. AI is a slot that proposes changes; it never writes directly.
- **No server holds client data.** Fit data stays on the fitter's computer. This keeps health data out of our hands and keeps GDPR simple for the fitter.
- **Fitter adapts it alone.** Everything studio-specific (fields, units, methods, dictation order, branding, texts, language) lives in the profile, edited in the app. No code changes, no paid set-up.
- **Marcel's current way of measuring is profile #1.** The app must reproduce today's report from today's fit.json.
- **English first.** UI, report and default texts are in English; the profile carries the language so translations can follow.

Out of scope for stage 1: recording and transcription, BikeCAD export, invoicing, email, the long client summary.

## What exists today

Today's pipeline works, but the fitter's choices are spread over four Python files and two templates. The new formats pull those choices into data.

| Piece                                                | What it does                                                                                                  | Fitter-specific knowledge baked into code                                                                                                       |
| ---------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| `fit.json` (schema 1)                                | `meta`, `old`, `new`, `links`, `summary`, `drawing`, `log`; each value `{v, s, src, note}`                    | key names only make sense with the code; units implied (mm, °)                                                                                  |
| `panel.py`                                           | localhost:8765, re-reads newest fit.json every 2 s, colours ok/missing/unclear, link search, recording status | `FIELDS` per bike type, `OPTIONAL`, `PLATFORM_HIDE`, `LABELS`, row order                                                                        |
| `render.py`                                          | fit.json → Jinja2 → HTML → Chrome PDF; merges the BikeCAD PDF into a marked page                              | measurement descriptions (`NOTE`), compare rows, angle lists, key outputs, the 2 Nov 2026 method switch as a date constant, Czech value aliases |
| `variant_a.html.j2`, `macros.j2`, `illustrations.j2` | 8-page report: cover, summary, set-up, components, shoes, drawing, adaptation, links, how to measure          | name, studio, website, colours, adaptation and measuring texts, which fields feed which illustration                                            |
| `bike_side.py`                                       | side view of the bike from frame geometry + fit (port of the sedimi.cz core, with test vectors)               | lever families, default constants                                                                                                               |

Problems the formats must solve:

1. **Field list lives in three places** (panel, render, templates) and must be kept in step by hand.
2. **Method changes are a date in code.** `MEASURE_V2_FROM = 2026-11-02` decides whether drop/reach mean bar centre or bar top edge. A fit cannot say which method it used.
3. **old/new is fixed at two.** A pre-purchase fit with several bikes already needs `drawing.extra` and `target_report` as special cases.
4. **Direction is a separate text field** (`cleat_r_dir`, `seat_tilt_dir`) with mixed languages (`dolů`, `down`, `za`, `behind`). The cleat illustration reads old cleats with the direction but new cleats as a raw signed number, so the two can disagree.
5. **Text values hide numbers.** `heel_wedges: "right shoe 1, left shoe 0"` is parsed back by a template macro.
6. **Units are implied.** A fitter working in inches has no place to say so.

## Fitter profile format

The profile is one JSON file (`profile.json`) that says what this fitter measures and how the report looks. The app ships with Marcel's profile as the starting template; a fitter copies it and edits it in a settings screen, never by hand.

### Top level

| Key                        | Holds                                                                                                                                                                                                                                                         |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `format`, `format_version` | `"fitter-profile"`, `1`. Lets the app migrate old profiles.                                                                                                                                                                                                   |
| `id`, `rev`                | stable id of this fitter's profile; `rev` is the measurement revision and goes up only when fields, definitions or bike types change. A fit stores the `rev` it was made with.                                                                                |
| `language`                 | BCP 47 tag, e.g. `en-GB`. Sets report wording, number format (decimal point or comma), date format.                                                                                                                                                           |
| `units`                    | display units: `length` = `mm` or `in`, `angle` = `deg`. Values are always stored in mm and degrees.                                                                                                                                                          |
| `studio`                   | branding: fitter name, studio, town, website, email, phone, logo (embedded image), colours (`primary`, `accent`, `accent2`), font, report design (`A`).                                                                                                       |
| `definitions`              | named reference points used in methods, e.g. _saddle centre = the point on the saddle's centre line where it is 80 mm wide_. Printed as the footnote.                                                                                                         |
| `fields`                   | the field catalogue of this fitter (below).                                                                                                                                                                                                                   |
| `bike_types`               | per type (`road`, `gravel`, `mtb`, own types): templates (which fields are recorded in each kind of set-up, in what order, required or optional), the four key outputs on the set-up page, which illustrations to show. `gravel` can say `"extends": "road"`. |
| `dictation`                | keywords, sequences and aliases (see _Dictation grammar_).                                                                                                                                                                                                    |
| `texts`                    | report texts the fitter owns: adaptation page, how-to-measure intro, sign-off. Each has an English default.                                                                                                                                                   |
| `pages`                    | which report pages appear and in what order.                                                                                                                                                                                                                  |
| `links`                    | not in the profile: the link library (name, description, category, URL) is its own file, `links.json`, next to the profile. It changes often and has nothing to do with measuring.                                                                            |

### One field

```json
{
  "key": "drop",
  "label": "drop to top edge of bar",
  "group": "position",
  "type": "number",
  "unit": "mm",
  "decimals": 0,
  "range": [-150, 250],
  "geometry": { "from": "saddle_ref", "to": "bar_top_at_stem", "measure": "vertical" },
  "method": "spirit level from the saddle reference point, ruler down to the top edge of the bar by the stem"
}
```

A field says **what a value means**. Which fields are recorded in which set-up is not part of the field; it lives in `bike_types` (next heading).

- `key`: the fitter's own short name, unique in the profile.
- `label`, `group`, `type`, `unit`, `decimals`: how it is shown. Groups are `position`, `angle`, `component`, `shoes`, `other` and decide the report page. Types are `number`, `text`, `choice` (with `options`), `bool`.
- `range`: plausible range. Outside it the value is kept but marked `unclear`; the dictation parser also uses it to join digits.
- `sign`: for signed numbers, what plus and minus mean, e.g. `{"+": "nose down", "-": "nose up"}`. Replaces today's separate `_dir` fields.
- `method`: how it is measured, one line, printed under the row label and on the how-to-measure page.
- `show_if`: a simple condition on another field of the same set-up, e.g. cleat fields hidden when `pedals` is `platform` (today's `PLATFORM_HIDE`): `{"key": "pedals", "op": "ne", "value": "platform"}`. `op` is `eq`, `ne`, `in`, `not_in` (with a list), `set` or `unset` (no value). A missing value counts as unset.
- `default`: value filled with `src: "default"`, e.g. pedals `SPD` on MTB.
- `geometry` (position fields) or `std` (everything else): the meaning the app can compute with.

**Position fields are defined by geometry, not by name.** A position field names two landmarks and how the distance between them is taken: `from`, `to`, and `measure` (`straight`, `horizontal` or `vertical`). The app ships a fixed list of landmarks: bottom bracket, saddle reference point, saddle tip, rail centre, bar centre at the stem, bar top at the stem, bar front edge at the stem, Sedimi's bar point, end of hood grip, grip middle. The ids and exact definitions are in [`interop/README.md`](interop/README.md#landmarks); more can be added later. This is what lets the app:

- draw the bike side view and the measuring guide for any fitter's set of measurements, not only Marcel's;
- convert fit bike X/Y into height, setback, reach and drop;
- build the sedimi.bike link;
- know that two fits are comparable, or warn that they are not (drop to bar centre and drop to bar top are different fields, even if both are called _drop_).

Marcel's switch on 2 Nov 2026 is then simply `to: bar_centre_at_stem` becoming `to: bar_top_at_stem`.

Any pair of landmarks works with any of the three ways of measuring, so a fitter can record the direct (straight-line) distance from the saddle reference point to the bar centre, the horizontal part only, the vertical part only, or all three. Marcel's _reach to hoods_ is such a direct distance. When two of the three are recorded the app works out the third (direct² = horizontal² + vertical²) and can show it, marked `src: "derived"`. A single direct distance alone does not fix a position, so the bike drawing and the sedimi.bike link need it together with a horizontal or vertical value to the same landmark.

**Other standard fields** (angles, components, shoes) carry a `std` id from a short built-in list, e.g. `saddle.tilt`, `stem.length`, `shoe.mtp1_vs_axle.right`. Illustrations read these.

**Own fields** have neither `geometry` nor `std`. They are recorded, shown in the panel and printed in a plain table, but drive no drawing. _Decided by Marcel, 27 Nov 2026._

When a fitter changes how something is measured, they edit the field's `geometry` and `method`. The profile's measurement revision `rev` goes up; new fits carry the new definition and old fits keep theirs (see _fit.json v2_). `rev` changes only when fields, definitions or bike types change. A new logo or a reworded text does not touch it.

### What to record in each set-up

Each fitter decides which fields they record in the before set-up and which in the after set-up. In the profile this is one place only: `bike_types.<type>.templates`, a named list of field keys per kind of set-up (`before`, `after`, `fitbike`, or the fitter's own, e.g. `quick check`), in display order, each marked required or optional. In the profile editor it is a grid of fields against set-up kinds with tick boxes. Profile #1 is just Marcel's own choice: few fields before, the full set after. Nothing in the app assumes that.

- Per bike type the fitter can tick different fields, e.g. grips on MTB, hoods on road.
- For one fit the fitter can still add a field that is not ticked, or skip a ticked one. Skipped fields are shown grey, not red.
- The before/after comparison in the report shows only the rows that have a value on both sides. A field recorded only after shows in the after column alone.
- The dictation sequences follow the same choice. A sequence lists its fields per set-up, so a short before sequence and a long after one are normal.

### Saddle reference point

The saddle reference point is a profile setting, not a fixed rule. All saddle and position fields measured "from the saddle" use it, and the report prints its definition as the footnote and on the how-to-measure page.

| Preset               | Definition                                                                           | Typical use                                               |
| -------------------- | ------------------------------------------------------------------------------------ | --------------------------------------------------------- |
| Width point (Marcel) | point on the centre line where the saddle is _W_ mm wide, _W_ set by the fitter (80) | tape measure, works across saddle shapes                  |
| Saddle midpoint      | halfway between nose and tail on the centre line                                     | traditional tape method                                   |
| Rail centre          | centre of the rails at the clamp, measured on the rail line                          | fit bikes, motion-capture systems, most fit bike software |
| Nose offset          | _N_ mm back from the saddle nose                                                     | some fitting schools                                      |
| Custom               | text the fitter writes, plus an optional sketch image                                | anything else                                             |

The chosen point is stored in the profile's `definitions` and therefore in every fit's snapshot. A fit made with one reference point never gets compared row by row with a fit made with another; the panel warns instead.

Values cannot be converted between reference points in general, because the distance between them depends on the saddle. For one saddle the fitter can enter the offset between rail centre and width point once, as the same two numbers Sedimi uses: h, the saddle's height from rails to top, and d, how far the rail centre sits behind the width point. Without them the app uses Sedimi's defaults (h 42 mm, d 0) and marks the result approximate. The app then converts that fit's saddle values and marks them `src: "derived"`.

### Fit bikes

Many fitters set the position on a fit bike, not on the rider's own bike. The app handles this as a set-up of kind `fitbike`, recorded as coordinates from the bottom bracket instead of tape measurements.

- Standard fields: `saddle_x`, `saddle_y` (to the saddle reference point, usually rail centre), `bar_x`, `bar_y` (bar centre at the stem clamp), optional `hoods_x`, `hoods_y`, `crank_length`, saddle tilt and bar angle. X positive = forward of the BB, Y positive = up.
- The profile sets the fit bike's own conventions: which way X runs (some fit bikes give saddle X as setback, positive backwards), what the bar point is (clamp centre, top of bar), and the reference point.
- From the coordinates the app derives saddle height, setback and the saddle-to-bar reach and drop, so a fit bike set-up can be compared with the rider's own bike in the usual table. Derived values are marked `src: "derived"`.
- A fit bike set-up has no frame geometry, so the report shows a position diagram (saddle, bar, BB, cranks) instead of the full bike side view. When a target bike with geometry is in the fit, the bike side view shows that bike set up to the fit bike position.
- The dictation grammar gets a fit bike sequence, e.g. `fit bike 172.5 -188 735 470 640` for cranks, saddle X, saddle Y, bar X, bar Y, in the order the fitter chooses.

**Fit bike presets.** The app ships a small library of fit bike presets, one per model (axis directions, bar point, saddle reference point, adjustment ranges, field order for dictation). The fitter picks their fit bike once in the profile and can switch per fit when a studio has two. Presets are plain JSON, so a fitter with a model not in the list can make one, and good ones can be added to the library in an update. Each preset must be checked against the maker's documentation before it ships.

**Link to sedimi.bike.** From any set-up with a saddle and bar or hood position (fit bike or measured bike), the panel and the report can offer _Find bikes that fit this position_. It opens sedimi.bike with only the position numbers in the link (saddle and bar position, bike type), never the client's name. Sedimi then lists frames and sizes that reach that position with a normal stem and spacers. Sedimi confirmed on 27 Nov 2026 (fitter-app issue 1) that its existing search link already accepts a position, so the basic link needs nothing new there: x and y are Sedimi's bar point (bar clamp centre plus bar reach and rise), sh is the straight distance from the bottom bracket to the saddle reference point, sed is the setback. Crank length is not used. Limits: road and gravel only; the saddle is sent at the 80 mm width point, and a rail centre position from a fit bike is converted with the saddle's h and d (Sedimi's link already carries both); with only a hood point the app offers no link instead of guessing a lever. Sedimi also supplies the test vectors for the bike side view and reissues them whenever its geometry code changes.

## fit.json v2 format

A v2 fit is self-contained: it carries the field definitions it was recorded with, so it renders the same report years later, on another computer, or after the fitter changed their profile.

```json
{
  "format": "fit", "format_version": 2,
  "id": "6f1c…", "created": "2026-11-02T10:02:00+01:00", "updated": "…",
  "profile": { "id": "bikefit-space", "rev": 2,
               "snapshot": { "definitions": {…}, "fields": […], "bike_type": {…}, "units": {…}, "language": "en-GB" } },
  "client": { "name": "Sample Rider", "salutation": "formal" },
  "visit": { "date": "2026-11-02", "kind": "first", "bike_type": "road" },
  "bikes": [ { "id": "b1", "model": "…", "year": 2023, "size": "M", "url": "…", "geometry": { "stack": 560, "reach": 393, "hta": 73.3 } } ],
  "setups": [
    { "id": "s1", "template": "before", "label": "Before", "bike": "b1",
      "values": { "seat_height": { "v": 862, "s": "ok", "src": "dictated", "t": "2026-11-02T10:21:00+01:00" } } },
    { "id": "s2", "template": "after", "label": "After", "bike": "b1",
      "values": { "cleat_r": { "v": 8, "s": "ok", "src": "dictated" } } }
  ],
  "compare": ["s1", "s2"],
  "links": [ { "label": "…", "url": "…", "cat": "exercise", "src": "library", "s": "ok" } ],
  "summary": { "intro": "…", "changes": ["…"], "recommendations": [ { "title": "…", "text": "…" } ] },
  "extra_pages": [ { "file": "pressure_map.pdf", "title": "Saddle pressure mapping", "after": "components" } ],
  "proposals": [],
  "log": [ { "t": "2026-11-02T10:21:00+01:00", "src": "dictated", "text": "old positions 862 205 838 118" } ]
}
```

A set-up has its own `id`, a `template` (which list of fields from the profile it follows: `before`, `after`, `fitbike` or the fitter's own), a `label` the fitter can change (_Bike 2 – gravel_), and the bike it belongs to. A fit bike set-up has no `bike`.

### What changes against v1

| v1                                              | v2                                                                                                                                         | Why                                                                                                                     |
| ----------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------- |
| `schema: 1`                                     | `format: "fit"`, `format_version: 2`                                                                                                       | the app can tell formats apart and migrate                                                                              |
| `old`, `new`                                    | `setups[]` with `id`, `bike`, `values`; `compare` names the two shown side by side                                                         | several bikes on a pre-purchase fit, a third set-up on a follow-up, no special cases. _Decided by Marcel, 27 Nov 2026._ |
| `meta.bike`                                     | `bikes[]`; a set-up points at its bike                                                                                                     | one fit, several frames                                                                                                 |
| `drawing` + `drawing.extra`                     | `extra_pages[]: the fitter's own PDFs and images (pressure mapping, scans, a BikeCAD export), each with a title and a place in the report` | same reason                                                                                                             |
| `measure_method` date, `MEASURE_V2_FROM`        | `profile.rev` + `profile.snapshot`                                                                                                         | the fit knows its own methods                                                                                           |
| `cleat_r` + `cleat_r_dir`, `seat_tilt_dir`      | one signed number; meaning of the sign in the field's `sign`                                                                               | no mixed-language direction words, no old/new disagreement                                                              |
| `heel_wedges: "right shoe 1, left shoe 0"`      | `heel_wedge_r: 1`, `heel_wedge_l: 0`                                                                                                       | numbers stay numbers                                                                                                    |
| `meta.client`, `meta.gender`, `meta.salutation` | `client{}`                                                                                                                                 | client data in one place, easy to strip for sharing or support                                                          |
| `meta.type`, `meta.visit`, `meta.bike_kind`     | `visit{bike_type, kind}`                                                                                                                   | one bike type list, from the profile                                                                                    |
| (none)                                          | `proposals[]`                                                                                                                              | suggestions from transcript or AI waiting for the fitter's yes                                                          |

### One value

`{"v": 851, "s": "ok", "src": "dictated", "note": "", "t": "10:48"}` stays as in v1, plus an optional timestamp `t`.

- `v`: number in mm or degrees, text, choice option, or `null`.
- `s`: `ok`, `unclear`, `missing`. An absent value counts as missing.
- `src`, in order of priority: `fitter` (corrected after the fit) > `dictated` / `typed` > `transcript` / `ai` / `photo` (read from a photo the fitter took) > `library` / `db` > `default`. A lower source never overwrites a higher one; it goes to `proposals` instead. Values the app computes (from fit bike coordinates or a reference-point offset) carry `src: "derived"` and are recalculated, never edited.
- `note`: free text shown in the panel, e.g. _78 on the recording_.

### Format rules

- **Unknown keys survive.** The app keeps anything it does not understand when it saves a file, so a newer app version, an AI tool or Marcel's own Claude flow can add data without it being lost.
- **`legacy`** holds data from an older format that v2 has no field for (for example v1 `meta` keys such as Drive folder ids). The app never reads it for the report; _Export without client_ empties it together with `client`, because it may name the client.
- **Versions.** A file with a higher `format_version` than the app knows opens read-only with a message to update. Lower versions are migrated on open and the original is kept as `fit.v1.json`.
- **One writer at a time.** Every save checks the file's `updated` stamp; if something else changed the file in between, the app reloads and re-applies the one change instead of overwriting.

### Files of one fit

A fit is a folder named by the fitter's pattern (default `YYYY-MM-DD Client name`): `fit.json` plus attachments for the extra pages (PDFs, images). The report PDF is saved by the fitter through the print dialog, wherever they choose; the app suggests the fit folder and the file name. A fit exports as one `.fitpack` zip for backup or for moving to another computer. The client's name appears only inside `client` and in the folder name. _Export without client_ writes a copy with `client` emptied, for support or for sharing a sample.

## Dictation grammar without AI

The fitter's fixed dictation order becomes data in the profile, and a small deterministic parser in the app turns a line like `old angles 1.5 9 7 862 205 838 118` into values. No AI is involved, so it is instant, free and works offline.

Input is a text box in the panel. The fitter types, or uses any voice typing they already have (Windows voice typing, Wispr Flow, macOS dictation); the app only sees text. The browser's own speech recognition can be an option later, but in Chrome it sends audio to Google, so it stays off by default.

```json
"dictation": {
  "setup_words": { "before": ["old", "before"], "after": ["new", "after"] },
  "sequences": {
    "angles":    { "words": ["angles"], "road": ["seat_tilt", "bar_angle", "hood_angle"], "mtb": ["seat_tilt", "brake_angle"] },
    "positions": { "words": ["positions", "measurements"],
                    "road": { "before": ["seat_height", "setback", "reach_hoods", "drop"],
                               "after":  ["seat_height", "setback", "setback_tip", "reach", "reach_hoods", "drop", "drop_hoods"] } }
  },
  "chain": { "angles": "positions" },
  "fields": { "drop to hoods": "drop_hoods", "tip": "setback_tip", "cranks": "crank_length" },
  "pairs":  { "cleats": ["cleat_r", "cleat_l"], "heel": ["heel_wedge_r", "heel_wedge_l"] },
  "choices": { "spd sl": ["pedals", "Shimano SPD-SL"], "spd": ["pedals", "SPD"] },
  "skip_words": ["skip", "none", "x"],
  "copy_words": { "same saddle": ["saddle", "before", "after"] }
}
```

Parser rules, taken from how Marcel dictates today:

1. **Set-up word** (`old` / `new`) switches the set-up until the other word comes. With none yet: before, until its sequences are full, then after.
2. **Sequence word** fills fields by position. A message with only numbers **continues** the last sequence from its next empty position, because long pauses split one sequence over several messages.
3. **Chain:** after the angles are full, further numbers in the same line start the positions sequence (`old angles 1.5 9 7 862 205 838 118`).
4. **Numbers:** digits, with a decimal point or a decimal comma between digits (1.5 or 1,5). A comma or full stop followed by a space is a separator, not a decimal. The word minus or a leading hyphen makes the next number negative. Number words (eight hundred fifty-one) are not parsed in stage 1; voice typing tools already write digits.
5. **Too many tokens:** join single digits (`8 5 1` → 851) so that every value lands in its `range`. If exactly one grouping fits, use it and show it; if several fit, show the candidates as buttons.
6. **Too few tokens:** fill from the first position and show which remain empty.
7. **Skip word** leaves a position empty and moves on.
8. **Out of range:** written as dictated, marked `unclear`. Values inside the range are never questioned.
9. **Single fields, pairs, choices, copies** work anywhere: `drop to hoods 90`, `cleats 8 -6`, `spd sl`, `same saddle`.
10. **Free text fields** (saddle, shoes, bar model) take the rest of the line after their word: `saddle Specialized Power Expert Mirror 143`.

Three more rules keep the parser predictable:

- **Longest match first.** `spd sl` is tried before `spd`, `drop to hoods` before `drop`.
- **More than two set-ups.** `old` and `new` point at the fit's two compared set-ups. Any other set-up (a second bike, a fit bike) is chosen by clicking it in the panel or by saying its label; dictation then goes there until another is chosen.
- **Nothing is guessed silently.** A line the parser cannot fully place is left in the box with the unplaced part highlighted; nothing from it is saved until the fitter fixes or confirms it. Every applied line can be undone with one click.

Every parsed line is echoed once in the panel as one compact line (`after positions: height 851 · setback 214 · tip 62 …`) and logged in `log[]`. The profile editor has a test box: type a line, see what it would fill.

## Browser architecture

The app is a static web app (HTML, CSS, TypeScript, built with Vite) served from one URL and cached by a service worker, so after the first visit it opens offline. There is no backend: profile, fits and link library are read and written on the fitter's own computer.

### Modules

| Module           | Job                                                                                                                                                                                                                                       | Replaces                                      |
| ---------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------- |
| `core/schema`    | JSON Schema for profile and fit, validation on every load and save                                                                                                                                                                        | implicit structure                            |
| `core/migrate`   | profile and fit migrations; v1 fit.json → v2                                                                                                                                                                                              | —                                             |
| `core/model`     | apply a patch, source priority, deltas between set-ups, unit display, `show_if`                                                                                                                                                           | logic spread over panel.py, render.py, macros |
| `dictation`      | pure function `(line, state, profile) → patch + echo`; fully unit-tested with Marcel's real phrasing                                                                                                                                      | Claude reading dictation                      |
| `storage`        | one interface, two back ends: **folder** (File System Access API, a folder the fitter picks; Chrome and Edge on desktop) and **browser** (IndexedDB/OPFS, every browser). Export and import `.fitpack`. _Decided by Marcel, 27 Nov 2026._ | `fits\` on disk                               |
| `capture`        | the fit screen: set-up table from the profile, colours ok / missing / unclear, dictation box, link search, notes                                                                                                                          | panel.py                                      |
| `side panel`     | compact read-only view in a second window, kept in step through `BroadcastChannel` (no 2 s polling, no localhost server)                                                                                                                  | panel.py in a browser tab                     |
| `report`         | Nunjucks templates (Jinja-compatible, so today's templates move with small edits) → HTML in a print frame → PDF                                                                                                                           | render.py, templates                          |
| `bike-side`      | side view of the bike from geometry and fit, ported back to TypeScript (it is already a port of the sedimi.cz JavaScript); the existing test vectors guard the port                                                                       | bike\_side.py                                 |
| `profile editor` | forms for fields, bike types, dictation, branding, texts; live preview of a sample report; dictation test box                                                                                                                             | editing Python                                |
| `ai-slot`        | optional, see next section                                                                                                                                                                                                                | Claude writing fit.json                       |

Two details of the folder back end matter:

- **Permission.** The browser asks for access to the folder; in the installed app the fitter can allow it permanently. Otherwise it is one click when the app starts.
- **Other programs may write the fit.** The app re-reads the open `fit.json` when the file changes on disk (checked every 2 s). So Marcel's current flow, where Claude writes the file during the fit, keeps working with the new panel, and any other tool can feed the app by writing the same file. This is also the simplest AI bridge.

### Report to PDF

The report is rendered as HTML with print CSS and saved through the browser's print dialog (_Save as PDF_). It is the same Chromium engine that renders today's PDF through Playwright, so the look stays the same, with no PDF library to maintain.

- The print CSS fixes A4, zero margins and background colours, so the fitter does not have to change any print setting; the app sets the suggested file name.
- Mixed portrait and landscape pages (a wide extra page) work in Chrome and Edge. PDF export is supported in those two browsers only; Safari and Firefox print differently and are not promised.
- The browser cannot save the PDF by itself without the dialog. One extra click per report is the price of having no installer. The stage 4 desktop wrapper can remove it.

**Summary page without AI.** Today Claude writes the summary (intro, three main changes, three recommendations). Without AI the page still works:

- _Main changes_ are drafted by the app from the numbers, e.g. _Saddle 11 mm lower and 9 mm further back_, _Hoods 26 mm closer and 22 mm higher_, _New saddle: …_. The fitter edits or reorders them.
- _Recommendations_ come from the fitter's own snippet library (title + text, kept next to the link library), added with one click and edited per client.
- _Intro_ is typed by the fitter, or left empty. An empty summary leaves the page out, as today.
- When an AI provider is on, it proposes all three from the transcript instead; the fitter accepts or edits.

**Extra pages (decided by Marcel, 27 Nov 2026).** BikeCAD is left out of the app: few fitters use it, and the bike side view generated from geometry covers the cover and set-up pages. Instead, a fitter can add any of their own PDFs or images as extra report pages, e.g. saddle pressure mapping, foot scans or motion-capture exports from other software. Each page gets a title and a place in the page order. In stage 1 a PDF page is drawn by pdf.js at 300 dpi; a vector merge can come later. A BikeCAD drawing is then simply one more extra page, and a BikeCAD skill can be offered later as an add-on.

### Distribution

The app is hosted on Cloudflare Pages as static files, at fitter.sedimi.bike. The app is called Sedimi Fitter (name and address decided by Marcel, 27 Nov 2026). The address must not change after the first fitter installs the app, because the installed app and browser storage are tied to it. The fitter opens the link in Chrome or Edge and clicks _Install_; it then has a desktop icon, opens in its own window and works offline, like a downloaded app. Updates arrive on the next start. Hosting costs nothing at this size, and client data never touches Cloudflare, because the page only reads and writes the fitter's own folder.

- **Paid features (stage 3):** a licence key entered in the app. A small Cloudflare Worker checks it once and the app remembers it; no accounts, no fit data sent.
- **Downloadable installer:** only for the recorder in stage 4, which needs things a browser can't do well (global pedal shortcut, background transcription, the screen-edge strip). It can wrap the same web app.

### Privacy and data

- Nothing about a client leaves the computer unless the fitter turns on an AI provider or exports a file.
- The app has no accounts and no analytics on fit data. Updates are just a new version of the static files.
- Backup is the fitter's job: the folder back end lets them pick a folder inside Dropbox, Google Drive or OneDrive, which then syncs it.

## AI as an optional slot

AI plugs in through one narrow door: it receives the profile snapshot, the fit and a task, and it returns **proposals**, never direct edits. Stage 1 only defines the door; the bridge itself is stage 3.

```ts
interface AiProvider {
  id: string; // "clipboard", "claude-api", …
  run(task: AiTask): Promise<AiResult>;
}
type AiTask =
  | { kind: 'transcript_part'; fit: Fit; profile: ProfileSnapshot; text: string }
  | { kind: 'short_summary'; fit: Fit; profile: ProfileSnapshot; transcript?: string }
  | { kind: 'free_dictation'; fit: Fit; profile: ProfileSnapshot; line: string };
type AiResult = { proposals: Proposal[]; summary?: Summary };
type Proposal = { setup: string; key: string; v: unknown; src: 'ai'; note: string };
```

- **Proposals** land in `fit.proposals[]` and show in the panel as orange rows with _accept_ / _reject_. Accepted ones become values with `src: "ai"`. A dictated or fitter value is never overwritten.
- **Validation:** every result is checked against the schema and the field ranges before it is shown. A malformed answer is dropped with a message.
- **Providers planned:** `none` (default), `clipboard` (the app copies a ready prompt, the fitter pastes it into whatever AI they use and pastes the JSON answer back), `api` (the fitter's own key, stored only on their computer and called straight from the browser, for providers that allow browser calls), and folder (any outside tool, such as Claude with folder access, writes proposals into the fit file).
- **Prompts** are built from the profile (field labels, methods, dictation words), so they fit each fitter without editing.
- **Consent:** sending a transcript to any provider is the fitter's choice per fit; the panel shows when a fit has been sent.

## Migration from v1 and Marcel's profile as profile #1

Profile #1 is written from today's code, so the app's first test is simple: Marcel's v1 fit.json, migrated, must give the same numbers on the same pages as `render.py`. Three differences are intended: the BikeCAD pages become extra pages, cleat wording becomes the universal wording below, and the summary page may be empty.

### Profile #1, road positions and angles

| key           | label                      | set-ups       | range          | method                                                           |
| ------------- | -------------------------- | ------------- | -------------- | ---------------------------------------------------------------- |
| `seat_tilt`   | saddle tilt (+ nose down)  | before, after | −5 to 15°      | —                                                                |
| `bar_angle`   | bar angle                  | before, after | −10 to 45°     | at the end of the drop, with bar tape                            |
| `hood_angle`  | hood angle                 | before, after | 0 to 40°       | —                                                                |
| `seat_height` | saddle height              | before, after | 600 to 1000 mm | BB axle to saddle centre\*                                       |
| `setback`     | saddle setback             | before, after | 100 to 320 mm  | horizontally, BB axle to saddle centre\*                         |
| `setback_tip` | saddle tip setback         | after         | −50 to 150 mm  | horizontally, BB axle to saddle tip                              |
| `reach`       | reach to front edge of bar | after         | 400 to 800 mm  | saddle centre\* to front edge of bar by the stem                 |
| `reach_hoods` | reach to hoods             | before, after | 700 to 900 mm  | tape, saddle centre\* to end of hood grip                        |
| `hood_width`  | hood width                 | after         | —              | between ends of left and right hood grips                        |
| `drop`        | drop to top edge of bar    | before, after | −150 to 250 mm | spirit level from saddle centre\* to top edge of bar by the stem |
| `drop_hoods`  | drop to hoods              | before, after | −100 to 200 mm | saddle centre\* to end of hood grip                              |

Components and shoes (after, some before): saddle, cockpit type, bar model, width, reach, drop, diameter, lever model, stem length and angle, spacers under, top cover, Future Shock, seatpost offset, cranks and recommended cranks, shoes, insoles, pedals, cleats R/L, heel wedges R/L, cleat wedges, shims. MTB swaps hoods for grips (`reach_grips`, `drop_grips`, `grip_width`), `bar_angle`/`hood_angle` for `brake_angle`, and adds rise, backsweep, upsweep, grips, dropper.

Dictation sequences are exactly the ones in _Dictation grammar_, with Slovak and Czech words (`staré`, `nové`, `uhly`, `miery`, `míry`, `kufre`, `pata`) as extra aliases next to the English ones. Saddle centre\* = where the saddle is 80 mm wide.

### Profile revisions for Marcel's history

- **rev 1**, fits before 2 Nov 2026: drop and reach measured to the bar centre.
- **rev 2**, from 2 Nov 2026: drop and reach to the top and front edge of the bar.

### v1 → v2 migration rules

1. `old` → a set-up with template `before`, `new` → template `after`, `compare` names the two; `meta.no_old` → only the after set-up.
2. `old.setback` stays `setback`; `new.setback_center` becomes `setback` (one meaning, one key).
3. `seat_tilt_dir` folds into the sign: `up`, `nahoru` → minus. Cleats: see the cleat rule below.
4. `heel_wedges` text is parsed into `heel_wedge_r` and `heel_wedge_l`; if it can't be parsed, the text is kept in `note` and the value marked `unclear`.
5. `meta.date` picks profile rev 1 or 2.
6. `meta.bike` → `bikes[0]`; `drawing.pdf` and `drawing.extra` → `extra_pages[]` titled _Position drawing_; `drawing.crop` is dropped; `target_report` is kept as `target`.
7. Czech component words (`klasický`, `integrovaný`, `neštandardný`) map to choice options.
8. Anything the migration is not sure about is marked `unclear` with a note, never silently changed. The v1 file is kept beside the new one.

**Cleat fore-aft (settled with Marcel, 27 Nov 2026).** The standard field `std: shoe.mtp1_vs_axle` (one per foot) records where the first metatarsal head sits relative to the pedal axle, in mm. Plus means the joint is ahead of the axle, so the cleat is behind it, which is the target position. Minus means the joint is behind the axle, so the cleat is too far forward; this happens in before set-ups. The field is optional: fitters who don't measure it leave it off. The report states it in plain words that don't depend on how anyone measures cleats, e.g. _First metatarsal head 8 mm ahead of the pedal axle (cleat behind the joint)_, and _0_ as _directly over the pedal axle_.

Migration rule 3 for cleats follows today's template, which is correct: a v1 `new.cleat_*` value is already the signed distance (the `_dir` word is ignored), and a v1 `old.cleat_*` takes its sign from `_dir` (`ahead` = plus, `behind`/`za` = minus).

One safety net: if a v1 `new.cleat_*` is positive but its `_dir` says `behind` or `za`, the value is migrated as plus (what the client's report showed) and marked `unclear` with the note _direction word said behind_, so Marcel sees it once in the panel.

**Details settled while building the migration (27 Nov 2026).** None of these change a value's meaning; they say where v1 data lands.

- `meta.client`, `meta.salutation`, `meta.gender`, `meta.email` and `meta.folder_name` go to `client` (`name`, `salutation`, `gender`, `email`, `folder_name`); salutation `vy` becomes `formal`, `ty` becomes `informal`.
- `meta.date` → `visit.date` and `created`, written as YYYY-MM-DD (`2.11.2026` and `2026-11-2` are read too); `meta.visit` → `visit.kind`; `meta.bike_kind` (or else `meta.type`) → `visit.bike_type`, reading `silnice` and `cestný` as `road` and `horské` as `mtb`. A fit without a readable date gets revision 2 (the unreadable text goes to `legacy`), one without a known type gets `road`, and the migration says so. Empty client fields are left out.
- The profile snapshot is taken for the fit's own bike type, with `extends` resolved (a gravel fit gets the road templates unless gravel sets its own).
- A v1 bike field stored as a value object (`{v, s, src}`) is unwrapped to its plain value in `bikes[0]`.
- v1 source `marcel` becomes `fitter`; an unknown source becomes `typed` and the value is marked `unclear`. A bare value without `{v, s, src}` is kept and marked `unclear`.
- Cockpit words map to option ids `classic`, `integrated` and `non_standard`; `platformové` pedals and `meta.pedals_platform` become pedals `platform`. Other text values are kept as they are.
- `heel_wedges` written as _no wedges_ (`bez klínků`) becomes 0 and 0.
- v1 drawing pages become extra pages placed after the shoes page. Other v1 `meta` and `drawing` keys go to `legacy.v1_meta` and `legacy.v1_drawing`; v1 before values of a fit marked `no_old` go to `legacy.v1_old`. Every other top-level section (`transcript`, `db_inbox` and so on) is kept as it is.
- `compare` names one set-up when there is no before set-up.
- A v1 before cleat with no direction word keeps its number and is marked `unclear`, so the fitter confirms the sign once.
- The migration appends one line to `log` with what it assumed, and the app shows the same list to the fitter.

Marcel's live flow (Claude writing v1 during the fit) keeps working unchanged. The app imports v1 through this migration; the Claude skill can switch to writing v2 later, in its own thread.

## Decisions and work plan

Marcel decided all four on 27 Nov 2026.

| #   | Question                                                   | Decision                                                                                                                                                                                                 | Not chosen              |
| --- | ---------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------- |
| 1   | Can fitters invent fields, or only pick from a fixed list? | Built-in standard meanings **plus** the fitter's own fields, which print in a plain table                                                                                                                | only the built-in list  |
| 2   | Fixed before/after, or a list of set-ups?                  | A list of set-ups; the report compares two                                                                                                                                                               | fixed old/new           |
| 3   | Where do fits live?                                        | A folder the fitter picks (Chrome/Edge); browser storage as fallback for Safari and iPad                                                                                                                 | browser storage only    |
| 4   | BikeCAD drawing in the report?                             | BikeCAD is left out of the app. The bike illustration from geometry stays, and fitters add their own PDFs and images as extra pages (e.g. pressure mapping). A BikeCAD skill may come later as an add-on | a built-in BikeCAD page |

Also from Marcel on 27 Nov: each fitter chooses what to record before and after; the saddle reference point is a setting; fit bikes with presets; a link to sedimi.bike; the cleat rule; the app is named Sedimi Fitter and lives on Cloudflare Pages at fitter.sedimi.bike.

Already settled by the design, no card needed: values stored in mm and degrees with display units in the profile; profile snapshot inside each fit; Nunjucks for templates; print dialog for PDF; AI only through proposals.

### Next threads

Each is its own thread, in this order. Mechanical work runs on Opus, texts and the end-of-stage review on Fable.

1. **Repo skeleton, schemas, migration** (Opus): Vite + TypeScript, JSON Schemas for both formats, the landmark list, `core/model`, v1 → v2 migration with the sample fit as the first test. Needs the GitHub repo.
2. **Profile #1** (Opus, Fable reviews methods and labels): `profile.json` for Marcel, road and MTB, with geometry for every position field. Needs 1.
3. **Dictation parser** (Opus): the rules above, tests from Marcel's dictation lines (numbers and keywords only, no client names). Needs 1 and 2.
4. **Report in the browser** (Opus): port templates to Nunjucks, port `bike_side` to TypeScript with its test vectors, print CSS, extra pages, summary drafts from numbers; done when the sample report matches today's PDF page by page. Needs 1 and 2, and `test_vektory.json` from the sedimi repo.
5. **Capture screen and side panel** (Opus), including the folder back end and file watching. Needs 3 and 4.
6. **Profile editor** (Opus), including the saddle reference point and the before/after grid. Needs 2.
7. **Fit bikes** (Fable for the model and the first presets checked against makers' documentation, Opus for the code). Needs 2. Can ship after the first release.
8. **Default English texts** for UI and report (Fable).
9. **Stage 1 review** (Fable): a new fitter makes a profile and a report without help.

Separate, not blocking: the name and domain thread, and the sedimi.bike position link.

## Review notes

Fable reviewed the whole document against the code on 27 Nov 2026 and changed seven things; the rest held up.

| #   | Found                                                                                                                                                                                    | Changed to                                                                                                                          |
| --- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Position fields were identified by a name from a list of about 50 meanings. That cannot describe another fitter's method, and would repeat today's problem of _drop_ meaning two things. | Position fields are defined by two landmarks and a direction. The app can then draw, convert and compare any fitter's measurements. |
| 2   | Which fields belong to before and after was stored in two places (on the field and on the bike type).                                                                                    | One place: templates per bike type. Fields only say what a value means.                                                             |
| 3   | Set-ups were identified by the words before and after, which breaks with a second bike or a fit bike.                                                                                    | Set-ups have their own id, a template and a label.                                                                                  |
| 4   | The summary page had no plan without AI.                                                                                                                                                 | Main changes are drafted from the numbers, recommendations come from the fitter's snippet library, intro is optional.               |
| 5   | The folder storage ignored that other programs may write the fit.                                                                                                                        | The app watches the file, so Claude or any tool can feed it. This also keeps Marcel's current flow working.                         |
| 6   | Dictation promised number words in any language and could misread commas.                                                                                                                | Digits only in stage 1, a clear comma rule, longest match first, nothing saved from a line the parser cannot fully place.           |
| 7   | The link library sat inside the profile, so every new link would have changed the profile revision stored in fits.                                                                       | Links are their own file; the revision counts only measurement changes.                                                             |

Risks that remain, in order of weight:

1. **Fit bike conventions are not verified.** The model (X/Y from the bottom bracket, rail centre) is common, but each maker's axes and reference points must be read from their documentation before a preset ships.
2. **PDF through the print dialog** depends on Chrome and Edge behaving as they do now. It is one extra click and cannot save the file by itself.
3. **Folder access** works only in Chrome and Edge on desktop. Safari and iPad users get browser storage, where clearing site data deletes fits that were not exported. The app must remind them to export.
4. **The landmark list must be right early.** Adding a landmark later is easy; changing the meaning of one is a format change.
5. **Reference points cannot be converted** without a per-saddle offset. Fit bike numbers and tape numbers will often not be comparable, and the app has to say so plainly instead of showing a wrong difference.
