# Clear Site Data

Clear Site Data is a small Chrome extension that clears data for the current site after a two-click confirmation.

Click the extension icon once to show `OK?`, then click it again within 3 seconds to clear data for the active site. The extension then shows `OK` on the icon badge.

## Changelog

### 1.0.0

- Added Manifest V3 support for Chrome.
- Added two-click confirmation before clearing site data.
- Clears cookies, local storage, IndexedDB, WebSQL, file systems, cache, CacheStorage, and service workers for the current site origin.
- Uses minimal extension permissions with `browsingData` and `activeTab`.
- Uses one extension icon with badge-only feedback after confirmation, success, or unsupported pages.
- Supports split incognito mode.
