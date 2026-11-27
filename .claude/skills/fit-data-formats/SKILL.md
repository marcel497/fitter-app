---
name: fit-data-formats
description: Use when adding or changing anything in the fitter profile or fit.json formats, their migrations, import/export, or the position link to the Sedimi site. Keeps stored fits readable forever and the two projects in step.
---

# Changing the data formats

Fits are client records that fitters keep for years, and other tools read and write the same files. `docs/SPEC.md` defines the formats; this skill is the procedure for changing them.

1. Read the format section of `docs/SPEC.md` first. If the change is not in the spec, update the spec in the same PR. If it changes what a field means for fitters, it is an owner decision: ask once, with a recommendation, and log the answer in `docs/DECISIONS.md`.
2. Additive changes (a new optional field) keep the format version. Anything that renames, removes, changes units, sign or meaning bumps the version and needs a migration.
3. Migrations are pure functions from version N to N+1, chained, each with a unit test that uses a stored sample file of the old version in `tests/fixtures/`. Never edit an old fixture.
4. Values are numbers in the unit the spec names, with the sign convention the spec names. Never store a formatted string or a direction word next to an unsigned number.
5. Unknown fields are preserved on read and written back untouched, so a newer app or another tool does not lose data through an older one.
6. Validate on every read from disk or import and report problems in plain words with the field name. Never crash or silently drop a set-up.
7. Fixtures are synthetic. No real client names, dates of birth or contact details anywhere in the repo.
8. If the change touches landmarks, the position link or anything in `docs/interop/`, update the contract there and open an issue labelled `interop` in the Sedimi repository describing what must change on that side. A position link carries numbers only, never client identity.
