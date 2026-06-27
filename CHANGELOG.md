# Changelog

## 1.1.0

- Explicitly clear both normal website origin data and protected web origin data for the clicked site.
- Keep clearing scoped to the confirmed origin; this does not add broader cookie or host permissions.

## 1.0.0

- Initial release.
- Clear cookies, local storage, IndexedDB, cache storage, service workers, site cache, WebSQL, and file system data for the current site.
- Require two clicks on the same site before clearing.
- Show badge feedback for confirmation, clearing, success, and errors.
