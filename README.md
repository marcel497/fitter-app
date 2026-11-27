# Sedimi Fitter

An offline, installable web app for bike fitters: record a fit, compare set-ups, produce a client report. Runs fully in the browser, with no server and no AI required. It will live at fitter.sedimi.bike.

- What it does and the file formats: [`docs/SPEC.md`](docs/SPEC.md)
- Decisions by the owner: [`docs/DECISIONS.md`](docs/DECISIONS.md)
- Contract with the Sedimi site: [`docs/interop/`](docs/interop/README.md)
- How work is done in this repo: [`CLAUDE.md`](CLAUDE.md)

## Develop

Node 22.12 or newer.

```sh
npm ci
npm run dev        # dev server
npm test           # unit tests
npm run e2e        # end-to-end tests against the production build
npm run lint       # ESLint + Prettier check
npm run typecheck
npm run build      # type check + build to dist/
npm run preview    # serve dist/ on port 4173
```

## Layout

| Path               | Holds                                                                                |
| ------------------ | ------------------------------------------------------------------------------------ |
| `src/core/model`   | types, landmarks, source priority, comparison, units: pure functions, no DOM         |
| `src/core/schema`  | JSON Schemas for the fitter profile and fit.json v2, and validation in plain words   |
| `src/core/migrate` | loading a fit: fit.json v1 → v2 migration, version checks                            |
| `tests/`           | Vitest unit tests; `tests/fixtures/` holds synthetic files only, never a real client |
| `e2e/`             | Playwright tests against the preview build                                           |
