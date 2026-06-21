# Clear Site Data

Clear Site Data is a small Chrome extension for quickly resetting the current site in your browser profile.

It is designed for people who need a clean local session without digging through Chrome settings, including SEO testing, web development, QA checks, forum administration, support workflows, and everyday privacy cleanup.

Click the extension icon once to show `OK?`, then click it again within 3 seconds to clear data for the active site. The extension then shows `OK` on the icon badge.

## What it clears

Clear Site Data uses Chrome's built-in `chrome.browsingData.remove()` API with the active tab's site origin.

It is designed to clear current-site data types that Chrome supports through site-specific browsing data removal:

- Cookies for the broader registrable domain where Chrome's cookie scoping applies
- Local storage (`localStorage`) for the active site origin
- IndexedDB for the active site origin
- CacheStorage for the active site origin
- Service workers for the active site origin
- Site cache for the active site origin
- WebSQL and file system storage for the active site origin where still supported by Chrome

Cookies are cleared more broadly because login and session cookies are often shared across subdomains. Other storage and cache types stay origin-scoped, meaning scheme, host, and port, so clearing one site does not intentionally wipe unrelated subdomains or schemes.

These local data types are commonly used for logins, sessions, cached files, offline app data, test states, and tracking identifiers. Clearing them can help reset logins, remove local site identifiers, clear broken test states, and show how a site behaves as a fresh visitor.

## What it does not clear

Clear Site Data does not currently clear `sessionStorage`, because Chrome's `browsingData` API does not expose it as an origin-scoped removal type. Support for clearing `sessionStorage` may be added later if it can be done cleanly without making the extension feel invasive.

It also does not clear browser-wide data such as saved passwords, browsing history, download history, autofill data, extension data, or fingerprinting/server-side identifiers.

This extension is not a VPN, anonymity tool, anti-fingerprinting system, or guarantee against all tracking. Sites may still recognize visitors through accounts, IP addresses, browser fingerprinting, server-side records, or other signals. The goal is simple local site cleanup, not identity hiding.

## Error handling

Clear Site Data shows `OK` only after Chrome reports that the clearing request completed. If the active page is unsupported or Chrome cannot complete the clearing request, the extension shows `ERR` instead.

Badge feedback is tied to the active tab when Chrome provides a valid website tab. Unsupported pages such as `chrome://` pages, extension pages, or other internal browser pages may show `ERR` because there is no normal website origin to clear.

## Click guarding

The two-click confirmation is bound to the tab and site origin from the first click. If you switch tabs or sites before confirming, the old confirmation is canceled and the new active site must be confirmed separately.

During clearing, the extension action is temporarily disabled only for the confirmed tab to prevent duplicate clears while keeping the behavior tied to that tab. Other tabs can still be confirmed and cleared separately.

## Changelog

### 1.0.0

- Added Manifest V3 support for Chrome.
- Added two-click confirmation before clearing site data.
- Binds confirmation to the original tab and site origin to avoid clearing a different site after switching tabs.
- Tracks running clears per tab to block duplicate clears without blocking unrelated tabs.
- Temporarily disables the extension action only for the confirmed tab during clearing.
- Clears cookies for the broader registrable domain where Chrome's cookie scoping applies.
- Clears local storage, IndexedDB, WebSQL, file systems, cache, CacheStorage, and service workers for the active site origin.
- Uses Chrome's built-in `chrome.browsingData.remove()` API.
- Uses minimal extension permissions with `browsingData` and `activeTab`.
- Uses one extension icon with badge-only feedback after confirmation, success, or unsupported pages.
- Shows `ERR` when clearing is unsupported or fails.
- Supports split incognito mode.
