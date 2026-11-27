# Contract with the Sedimi site

This folder is the shared contract between Sedimi Fitter (this repo) and the Sedimi site (`marcel497/sedimi`, served at sedimi.bike and sedimi.cz). It names the landmarks both sides measure from, the fields that carry a position, and the link that opens Sedimi with a position.

- **Owner of this contract:** this repo. Changes go through pull requests here.
- **Requests between the projects:** GitHub issues labelled `interop`, opened in the repo that has to do the work.
- **Sedimi's side:** folder `interop/` in `marcel497/sedimi` (test vectors, constants table, answers). See [Test vectors](#test-vectors).
- **Client data never crosses.** No names, dates, emails or notes in a link, a vector or an issue. Fixtures on both sides are synthetic.

History: Sedimi answered the first requests in [fitter-app issue #1](https://github.com/marcel497/fitter-app/issues/1) on 27 Nov 2026. This file makes those answers binding.

## Coordinates and units

Millimetres and degrees. Origin at the bottom bracket centre, x positive forward, y positive up. Both projects use this; it never changes.

## Landmarks

A position field is measured between two of these points. Adding a landmark is a compatible change. Changing what an existing id means is a format change on both sides (new fit format version and a migration here, new vectors there).

| id                   | Point                                                                                                                         |
| -------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| `bb`                 | Bottom bracket: centre of the crank axle. The origin.                                                                         |
| `saddle_ref`         | Saddle reference point, as the fitter's profile defines it (see [Saddle reference points](#saddle-reference-points)).         |
| `saddle_tip`         | Front end of the saddle nose, on the centre line.                                                                             |
| `saddle_rail_centre` | Centre of the saddle rails at the seatpost clamp, on the rail line. Most fit bikes report this point.                         |
| `bar_centre_at_stem` | Centre of the bar cross-section next to the stem (the bar clamp centre).                                                      |
| `bar_top_at_stem`    | Top edge of the bar next to the stem.                                                                                         |
| `bar_front_at_stem`  | Front edge of the bar next to the stem.                                                                                       |
| `bar_point`          | Sedimi's bar point: `bar_centre_at_stem` plus the bar's reach horizontally and the bar's rise vertically (`P.point = 'bar'`). |
| `hood_end`           | Top of the brake hood where the hand rests (end of hood grip, hood apex).                                                     |
| `grip_mid`           | Middle of a flat-bar grip, on the grip axis.                                                                                  |

The machine-readable list is `src/core/model/landmarks.ts`, and the profile schema's `landmark` enum repeats it (a unit test keeps the two and this table in step). `saddle_rail_centre` was added on top of the nine ids named in issue #1, for fit bikes.

## Position fields

A position field in the fitter profile carries `geometry: { from, to, measure }`, two landmark ids and one of:

- `straight`: the direct distance between the two points,
- `horizontal`: the x difference,
- `vertical`: the y difference.

Examples from the owner's profile: saddle height is `bb → saddle_ref, straight`; setback is `bb → saddle_ref, horizontal`; drop is `saddle_ref → bar_top_at_stem, vertical`.

Fit bike set-ups record coordinates from the bottom bracket instead, in these standard fields: `saddle_x`, `saddle_y` (the fit bike's saddle point, often `saddle_rail_centre`), `bar_x`, `bar_y` (`bar_centre_at_stem` unless the fit bike preset says otherwise), and optional `hoods_x`, `hoods_y` (`hood_end`). The fit bike preset says which way each maker's axes run; values are stored already turned into x forward, y up.

## Saddle reference points

The profile sets `definitions.saddle_ref.preset` to one of:

| id            | Meaning                                                                                         |
| ------------- | ----------------------------------------------------------------------------------------------- |
| `width_point` | Point on the centre line where the saddle is `width_mm` wide. Default 80, the same as Sedimi's. |
| `midpoint`    | Halfway between nose and tail on the centre line.                                               |
| `rail_centre` | Centre of the rails at the clamp (most fit bikes).                                              |
| `nose_offset` | `nose_offset_mm` back from the saddle nose.                                                     |
| `custom`      | Free text written by the fitter.                                                                |

Sedimi only knows `width_point` with 80 mm. A rail centre position converts to it when the saddle's offset is known (next section). Other points are not converted, and the app offers no link for them.

## Position link

_Find bikes that fit this position_ opens Sedimi's existing home search. Nothing new is needed on Sedimi for this basic link.

```text
https://sedimi.bike/?hledam=posed&typ=<typ>&x=<x>&y=<y>&b=1&tol=10&sh=<sh>&sed=<sed>#hledat
```

| Parameter | Value                                                                                      | Sedimi's valid range         |
| --------- | ------------------------------------------------------------------------------------------ | ---------------------------- |
| `hledam`  | `posed` (show frames that fit this position)                                               |                              |
| `typ`     | `silnice` for road, `gravel` for gravel (until the `road` alias exists, see below)         |                              |
| `x`, `y`  | `bar_point`, rounded to whole mm                                                           | x 410–700, y 450–820         |
| `b`       | `1`: the numbers are a bar point, not an old hood-grip link                                |                              |
| `tol`     | `10` mm                                                                                    | 5, 10, 15, 20                |
| `sh`      | `round(hypot(X, Y))`, straight distance from `bb` to the saddle point at the 80 mm width   | 550–950                      |
| `sed`     | `round(−X)`, the setback of that point; or `b,h,d` when the saddle offset is known (below) | b 100–320, h 25–75, d −70…70 |

Here `(X, Y)` is the saddle reference point at the 80 mm width point, from the bottom bracket.

**From a rail centre.** Sedimi places the rail centre at `(−(b + d), yt − h)`, where `h` is the saddle's height from rails to top and `d` is how far the rail centre sits behind the width point. So a rail centre `(rx, ry)` from a fit bike converts as `X = rx + d`, `Y = ry + h`, and the link carries `sed=<b>,<h>,<d>` with `b = round(−X)`. When the fitter has not entered `h` and `d` for the saddle, the app uses Sedimi's defaults (`SAD.H` = 42, `SADP.d` = 0), sends `sed=<b>` only, and tells the fitter the saddle part is approximate. The fitter app's per-saddle offset is exactly these two numbers, with these names and signs.

**From measured values.** With saddle height `sh` (straight) and setback `b` (horizontal) to the width point, `X = −b` and `Y = sqrt(sh² − b²)`. The bar point needs `bar_centre_at_stem` (measured, or derived from the bar top or front edge and the bar radius) plus the bar's reach and rise.

**When there is no link.** The app shows the button switched off, with the reason, when:

- the bike type is `mtb` (Sedimi covers road and gravel only),
- only a hood point is known (the app does not guess the lever offset),
- the saddle point is not the 80 mm width point and cannot be converted to it,
- a number falls outside Sedimi's valid range above.

Crank length is not sent: Sedimi measures everything from the bottom bracket.

### Asked of Sedimi

Open requests (issue #1), all optional for the basic link:

1. `typ=road` as an English alias of `silnice`. The app switches to `road` once Sedimi confirms it.
2. `v=1` version parameter, so the link format can change later without breaking old links.
3. `src=fitter`, if cheap, so the page can say the position came from a fitting (no identity).
4. A note in issue #1 when Sedimi's `interop/` folder reaches `main`.

Not needed: a `ref=` parameter for other reference points, and a hood point input with a lever conversion.

## Test vectors

Sedimi generates the vectors for the bike side view from its live code, so the TypeScript port in this app can be checked against the same numbers.

- File: `interop/vektory/test_vektory.json` in `marcel497/sedimi`, made by `interop/vektory/gen.cjs`. Constants that the numbers depend on are listed in Sedimi's `interop/README.md`.
- Pinned to: branch `claude/project-thread-ybsvol`, commit `ae8f420e28386d8fe78f1be32b94c3535ffcc36a` (27 Nov 2026). Re-pin to a commit on `main` when Sedimi says the folder has been merged.
- When Sedimi's geometry code or `P` constants change, Sedimi regenerates the file and opens an `interop` issue here with the diff. The report thread copies the vectors into `tests/fixtures/` with the source commit in the file name, so a test failure points at a specific change.

## Change log

- 27 Nov 2026: first version, from fitter-app issue #1 (landmarks, position fields, reference points, link mapping including rail centre `h` and `d`, vector pin).
