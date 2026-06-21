# Clear Site Data

Clear Site Data is a small Chrome extension for quickly resetting the current site in your browser profile.

It is designed for people who need a clean local session without digging through Chrome settings, including SEO testing, web development, QA checks, forum administration, support workflows, and everyday privacy cleanup.

Click the extension icon once to show `OK?`, then click it again within 3 seconds to clear data for the active site. The extension then shows `OK` on the icon badge.

Clear Site Data is meant to remove local site data such as cookies, sessions, cache, service workers, and browser storage for the current site. This can help reset logins, clear test states, remove local tracking identifiers, and see how a site behaves as a fresh visitor.

This extension is not a VPN, anonymity tool, anti-fingerprinting system, or guarantee against all tracking. Sites may still recognize visitors through accounts, IP addresses, browser fingerprinting, server-side records, or other signals. The goal is simple local site cleanup, not identity hiding.

## Changelog

### 1.0.0

- Added Manifest V3 support for Chrome.
- Added two-click confirmation before clearing site data.
- Clears cookies, local storage, IndexedDB, WebSQL, file systems, cache, CacheStorage, and service workers for the current site origin.
- Uses minimal extension permissions with `browsingData` and `activeTab`.
- Uses one extension icon with badge-only feedback after confirmation, success, or unsupported pages.
- Supports split incognito mode.
