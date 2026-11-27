---
name: design-pass
description: Use for every change to what the user sees in the fitter app (new screen, component, styling, report or print layout, UI text). Runs the whole design routine automatically - direction, tokens, copy, screenshots, self-critique, accessibility - so the owner only reviews pictures and gives decisions.
---

# Design pass

The owner does not choose design skills or review code. He looks at screenshots and says what to change. Run every step yourself, in order.

## 1. Read the system

Read `docs/DESIGN.md`. If it does not exist, create it first (step 2). If it exists, it wins over your taste: use its tokens, components and voice.

## 2. Create the design system once (only if `docs/DESIGN.md` is missing)

1. Load `frontend-design` and pick one clear direction for a professional tool used in a fitting studio: standing at a bike, on a laptop or tablet at arm's length, often in mixed light. Large touch targets, numbers readable from a distance, calm, not decorative.
2. Build one real screen in two or three distinct directions, screenshot each, and ask the owner to pick with a single decision card showing the screenshots. This is the only time the owner is asked about overall style.
3. Write the chosen direction to `docs/DESIGN.md`: colour tokens (light and dark), type scale, spacing scale, radii, elevation, component list with states, report/print rules, and the voice for UI text. Implement the tokens as CSS custom properties in one file and reference only those.

## 3. Build with the system

- Use only tokens. If a needed value is missing, add a token to `docs/DESIGN.md` and the token file, never a one-off.
- Reuse an existing component before making a new one. A new component is added to the component list with its states: default, hover, focus, disabled, error, empty, loading.
- Every UI text goes through `design:ux-copy`: plain English, universal wording for all fitters (not one fitter's method), units always shown, no jargon the spec does not define.
- Charts and numeric visuals follow `dataviz`.
- The report must look right both on screen and printed to A4 and Letter PDF.

## 4. Look at it

Run `verify-app` and capture screenshots of each changed screen at 1366x768 (laptop), 1024x768 (tablet landscape) and 390x844 (phone), in light and dark, plus empty and error states. For report changes also save a PDF and screenshot its pages. Look at the pictures yourself before going on.

## 5. Critique and fix, without asking

1. Run `design:design-critique` on the screenshots. Fix everything it finds about hierarchy, consistency and usability.
2. Run `design:accessibility-review` (WCAG 2.1 AA): contrast, keyboard order, visible focus, labels, touch targets of at least 44 px. Fix every failure.
3. Re-take the screenshots. Repeat once if the fixes were large.

## 6. Hand over

Put before/after screenshots in the PR and in the reply to the owner, with at most three lines on what changed. Ask a question only if a choice changes what a fitter sees in a way the spec and `docs/DESIGN.md` do not settle, and then ask one question with a recommendation. When the owner asks for a change that alters a rule (a colour, a spacing, a wording rule), update `docs/DESIGN.md` in the same PR so it holds everywhere from then on.
