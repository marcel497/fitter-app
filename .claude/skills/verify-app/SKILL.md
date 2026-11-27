---
name: verify-app
description: Use to launch the fitter app and see a change working in the real built app - run it, drive it in a browser, take screenshots, check it offline. Use before claiming any behaviour or UI change is done.
---

# Verify in the built app

Tests passing is not proof. Drive the production build.

1. `npm ci` if `node_modules` is missing, then `npm run build`.
2. Start `npm run preview` in the background (port 4173) and wait until `http://localhost:4173` answers.
3. Drive it with Playwright (Chromium). Write a short throwaway script outside the repo, or use the e2e suite when a test already covers the flow. Use role and label selectors, not CSS classes.
4. Exercise the flow the change touches from a clean profile and from a profile with existing data. Check the browser console: any error or unhandled rejection is a failure.
5. Screenshots: `deviceScaleFactor: 2` for pictures the owner will see. Sizes are listed in `design-pass`.
6. Offline check, whenever loading, caching or storage is touched: load once online, wait for the service worker to be active, call `context.setOffline(true)`, reload, and repeat the flow. See `pwa-offline`.
7. Folder storage cannot be picked by a script (the folder picker needs a real user gesture). Test the storage layer through its interface with the browser-storage fallback and an in-memory fake, and say in the PR that the real folder picker was not exercised.
8. Stop the preview server. Report what you ran and what you saw, with the screenshots.
