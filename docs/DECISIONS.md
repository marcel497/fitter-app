# Decisions

Decisions by the owner, one dated line each, newest last. The reasoning and details live in [`SPEC.md`](SPEC.md); this is the record of what was decided and when.

- 2026-11-27: Build a standalone app for fitters from the owner's own workflow; AI is an optional add-on, never required.
- 2026-11-27: Target fitters who want to use AI but are not practised with it; the entry tier (report without AI) is free; a finished product with occasional updates, no paid custom set-up work.
- 2026-11-27: English first for the app, its texts and the project; start with stage 1 (formats and the browser app).
- 2026-11-27: Fields are a built-in catalogue of standard meanings plus the fitter's own fields; own fields print in a plain table and drive no drawing.
- 2026-11-27: A fit holds a list of set-ups; the report compares two of them.
- 2026-11-27: Fits live in a folder the fitter picks (File System Access API, Chrome and Edge); browser storage plus export is the fallback.
- 2026-11-27: BikeCAD is left out of the app; the bike illustration from geometry stays; fitters add their own PDFs and images as extra report pages (for example saddle pressure mapping). A BikeCAD skill may be offered later as an add-on.
- 2026-11-27: Each fitter chooses which fields are recorded in which set-up (before, after, own kinds); the owner's few-before, full-after choice is only profile #1.
- 2026-11-27: The saddle reference point is a profile setting with presets (width point W mm, midpoint, rail centre, nose offset, custom); the owner's is the 80 mm width point.
- 2026-11-27: Fit bikes are supported as a set-up kind with saddle and bar X/Y from the bottom bracket, with a library of fit bike presets.
- 2026-11-27: A set-up can open sedimi.bike with the position numbers only (never client identity) to find bikes that fit it.
- 2026-11-27: Cleat fore-aft is one optional signed field per foot: first metatarsal head relative to the pedal axle in mm, plus = joint ahead of the axle (cleat behind, the target); report wording is universal for all fitters.
- 2026-11-27: Product name Sedimi Fitter, at fitter.sedimi.bike (app.sedimi.bike stays free; no new domain). The address is final.
- 2026-11-27: Hosting on Cloudflare Pages as an installable offline web app; a licence key checked by a small Cloudflare Worker in stage 3; a real installer only for the stage 4 recorder.
- 2026-11-27: The fitter app and the Sedimi project talk through GitHub: the contract lives in `docs/interop/`, requests are issues labelled `interop` in the repo that does the work, contract changes go through pull requests.
- 2026-11-27: A rail centre position goes to Sedimi through its existing `sed=b,h,d` inputs (saddle height rails-to-top `h`, rail centre offset `d`); no new reference point parameter on Sedimi ("inputs cover it").
