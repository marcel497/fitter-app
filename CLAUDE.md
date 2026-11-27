# Fitter app

An offline, installable web app (PWA) for bike fitters: record a fit, compare set-ups, produce a client report. Runs fully in the browser with no server and no AI required. English only: code, UI texts, docs, commits.

- Spec and formats: `docs/SPEC.md` (source of truth for behaviour and file formats)
- Decisions log: `docs/DECISIONS.md` (append one dated line per decision by the owner)
- Design system: `docs/DESIGN.md` (source of truth for look and feel)
- Contract with the Sedimi site: `docs/interop/`

If a document above is missing, the work that needs it creates it. Never guess past the spec: when the spec is silent on something that changes what a fitter sees or what is stored, ask the owner one question with a recommendation.

## Stack

Vite + TypeScript (strict), static build deployed to Cloudflare Pages. Unit tests with Vitest, end-to-end tests with Playwright. Keep dependencies few: every new runtime dependency needs a one-line reason in the PR.

## Commands

The scaffold must provide exactly these npm scripts, and they must stay working:

| Script | Does |
| --- | --- |
| `npm run dev` | dev server |
| `npm run build` | type check + production build to `dist/` |
| `npm run preview` | serve `dist/` on port 4173 |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint` | ESLint + Prettier check |
| `npm test` | Vitest, run once |
| `npm run e2e` | Playwright against the preview build |

## Which skill to use (automatic, never ask the owner to pick)

Pick the skill from the task. Load it before starting that kind of work.

| When the task is | Use |
| --- | --- |
| Any change to what the user sees (screen, component, style, report layout) | `design-pass` (project skill; it chains the design skills below) |
| First visual direction, or a new kind of screen | `frontend-design` |
| Any user-facing text: labels, errors, empty states, report wording | `design:ux-copy` |
| Charts or numeric visuals in the app or report | `dataviz` |
| Service worker, caching, install, app update, file or folder storage | `pwa-offline` (project skill) |
| Profile or `fit.json` schema, migrations, import/export, Sedimi link | `fit-data-formats` (project skill) |
| Showing that a change works in the real app | `verify-app` (project skill) |
| Before opening or updating any PR | `simplify`, then `code-review` on the diff |
| Anything touching licence keys, a Worker, imports of outside files, or HTML built from user data | `security-review` |
| Cloudflare Pages, Workers, Wrangler | the Cloudflare plugin's skills, when installed |
| Unfamiliar or fast-moving library API (Vite, PWA plugin, Playwright, browser file APIs) | look up current docs (Context7 when installed, otherwise the official docs) before coding from memory |

## Definition of done

A change is done when all of these hold, and the PR says so with evidence:

1. `npm run typecheck`, `npm run lint`, `npm test` pass. New logic has unit tests; a new user flow has one e2e test.
2. The change was exercised in the built app (`verify-app`), including offline when it touches loading or storage.
3. UI changes went through `design-pass` and the PR shows before/after screenshots.
4. `simplify` and `code-review` ran and their findings are fixed or answered.
5. Docs that the change makes wrong (`SPEC.md`, `DESIGN.md`, interop) are updated in the same PR.

## Rules that are easy to break

- Client data never leaves the device. No analytics, no remote fonts, no network call that carries fit or client data. Test fixtures are synthetic, never a real client.
- Stored files are versioned. Never change the meaning of an existing field: add a field or bump the format version and write a migration with a test.
- Geometry and fit maths live in pure functions with unit tests and no DOM access.
- All colours, spacing, type sizes and radii come from the tokens in `docs/DESIGN.md`. No one-off values in components.
- The app's address is permanent once fitters install it, because installed data is tied to it. Never change the origin, the service worker scope or storage keys without a migration plan approved by the owner.
- Small PRs, one concern each. Do not mix a refactor with a behaviour change.

## Working with the owner

The owner gives decisions and change requests, not implementation choices. Decide implementation details yourself and state them. Bring him one decision at a time, with a recommendation, only when it changes what a fitter sees, what is stored, or what costs money. For design, show screenshots, not descriptions.
