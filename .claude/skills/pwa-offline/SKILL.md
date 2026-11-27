---
name: pwa-offline
description: Use when touching the service worker, caching, the web app manifest, install or update behaviour, or file and folder storage in the fitter app. Rules that keep the installed app working offline and keep fitters' data safe across updates.
---

# Offline, updates and storage

Fitters install the app once and use it in studios with poor or no connection. An update must never lose data or leave the app half-loaded.

Look up the current docs for the PWA tooling and the browser file APIs before changing this code. These APIs move, and support differs by browser.

## Service worker and updates

- Precache the whole app shell (HTML, JS, CSS, fonts, icons) with content-hashed file names. No runtime request is needed to use the app. No remote fonts or CDNs.
- New versions wait: show "Update ready" and reload only when the fitter agrees and no fit is being edited. Never activate a new worker underneath an open session.
- `index.html` and the service worker file are served with no long-lived cache (`_headers` on Cloudflare Pages); hashed assets are immutable.
- The scope, the start URL and the origin never change after release. Installed data is tied to them.
- Show the running version somewhere in the app so support questions can be answered.

## Storage

- Primary: a folder the fitter picks (File System Access API, Chrome and Edge). Keep the directory handle in IndexedDB and ask for permission again after a restart, with a clear prompt.
- Fallback: browser storage plus explicit export and import. Call `navigator.storage.persist()` and tell the fitter if it was refused. Always feature-detect; never assume the folder API exists.
- Write files safely: write the full new content, then replace, so a crash cannot leave a half-written fit. Keep the previous version as a backup file.
- The app also watches files it did not write (other tools may edit `fit.json`). Re-read before writing and never overwrite a newer file silently: show the conflict.
- Every stored file carries its format version. Reading an older version migrates it in memory; writing upgrades it. See `fit-data-formats`.

## Must be tested

- First load online, then full use offline after a reload (`verify-app` step 6).
- Update from the previous release with existing data present: data still opens.
- Storage refused or folder permission revoked: the app explains and offers export, and loses nothing.
