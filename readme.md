# Clear Site Data

Clear Site Data is a small Chrome extension for quickly resetting the current site in your browser profile.

It is designed for people who need a clean local session without digging through Chrome settings, including SEO testing, web development, QA checks, forum administration, support workflows, and everyday privacy cleanup.

Click the extension icon once to show `OK?`, then click it again within 3 seconds to clear data for the active site. The extension then shows `OK` on the icon badge.

## What it clears

Clear Site Data uses Chrome's built-in `chrome.browsingData.remove()` API with the active tab's site origin.

It is designed to clear current-site data types that Chrome supports through origin-scoped browsing data removal:

- Cookies
- Local storage (`localStorage`)
- IndexedDB
- CacheStorage
- Service workers
- Site cache
- File system storage
- WebSQL
- Other old or deprecated site storage types where Chrome still supports origin-scoped removal

These local data types are commonly used for logins, sessions, cached files, offline app data, test states, and tracking identifiers. Clearing them can help reset logins, remove local site identifiers, clear broken test states, and show how a site behaves as a fresh visitor.

Clear Site Data does not try to clear unrelated browser-wide data such as saved passwords, download history, browsing history, autofill form data, or extension data.

This extension is not a VPN, anonymity tool, anti-fingerprinting system, or guarantee against all tracking. Sites may still recognize visitors through accounts, IP addresses, browser fingerprinting, server-side records, or other signals. The goal is simple local site cleanup, not identity hiding.

## Changelog

### 1.0.0

- Added Manifest V3 support for Chrome.
- Added two-click confirmation before clearing site data.
- Clears cookies, local storage, IndexedDB, WebSQL, file systems, cache, CacheStorage, and service workers for the current site origin.
- Uses Chrome's built-in `chrome.browsingData.remove()` API.
- Uses minimal extension permissions with `browsingData` and `activeTab`.
- Uses one extension icon with badge-only feedback after confirmation, success, or unsupported pages.
- Supports split incognito mode.
