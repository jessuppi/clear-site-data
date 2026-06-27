# Clear Site Data

Clear cookies, cache, and storage for the current site with a two-click confirmation.

## What it clears

- Cookies
- Local storage
- IndexedDB
- Cache storage
- Service workers
- Site cache
- WebSQL and file system data where supported

## How it works

Click the extension icon once to arm clearing for the current site, then click it again on the same site to confirm.

The extension is scoped to the current confirmed site and does not request broad host permissions.

## Changelog

### 1.1.0

- Explicitly clear both normal website origin data and protected web origin data for the clicked site.
- Keep clearing scoped to the confirmed origin; this does not add broader cookie or host permissions.

### 1.0.0

- Initial release.
- Clear cookies, local storage, IndexedDB, cache storage, service workers, site cache, WebSQL, and file system data for the current site.
- Require two clicks on the same site before clearing.
- Show badge feedback for confirmation, clearing, success, and errors.
