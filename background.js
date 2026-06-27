// log non-fatal extension errors for debugging
function logWarning(message, error) {
  console.warn(`Clear Site Data: ${message}`, error);
}

// get a validated http or https tab from the clicked action tab
function getClickedTab(tab) {
  if (!tab || !tab.url || !Number.isInteger(tab.id)) return null;

  try {
    // parse the clicked tab url and ensure it uses http or https
    const url = new URL(tab.url);
    if (url.protocol === "http:" || url.protocol === "https:") {
      return { tab, url };
    }
  } catch (error) {
    // ignore invalid or internal chrome urls
    logWarning("invalid tab url", error);
  }

  return null;
}

const BADGE_COLOR_DEFAULT = "#424242";
const BADGE_COLOR_SUCCESS = "#2E7D32";
const BADGE_COLOR_ERROR = "#C62828";

// set persistent badge background once on install or update
chrome.runtime.onInstalled.addListener(() => {
  chrome.action.setBadgeBackgroundColor({ color: BADGE_COLOR_DEFAULT });
});

// check whether a hostname is safe for bare/www related-origin expansion
function canExpandRelatedOrigins(url) {
  const hostname = url.hostname.toLowerCase();

  return (
    !url.port &&
    hostname.includes(".") &&
    !hostname.includes(":") &&
    !/^\d{1,3}(\.\d{1,3}){3}$/.test(hostname) &&
    hostname !== "localhost" &&
    !hostname.endsWith(".localhost")
  );
}

// get the clicked origin plus bare/www and http/https related origins
function getRelatedOrigins(origin) {
  const url = new URL(origin);

  if (!canExpandRelatedOrigins(url)) {
    return [origin];
  }

  const hostname = url.hostname.toLowerCase();
  const hosts = new Set([hostname]);

  if (hostname.startsWith("www.")) {
    hosts.add(hostname.slice(4));
  } else {
    hosts.add(`www.${hostname}`);
  }

  const origins = new Set();

  for (const protocol of ["https:", "http:"]) {
    for (const host of hosts) {
      origins.add(`${protocol}//${host}`);
    }
  }

  return [...origins];
}

// clear all persistent site data for this origin and its bare/www sibling
async function removeSiteData(origin) {
  await chrome.browsingData.remove(
    {
      origins: getRelatedOrigins(origin),
      since: 0,
      originTypes: {
        unprotectedWeb: true
      }
    },
    {
      // cookies and storage
      cookies: true,
      localStorage: true,
      indexedDB: true,
      webSQL: true,
      fileSystems: true,

      // caches and workers
      cache: true,
      cacheStorage: true,
      serviceWorkers: true
    }
  );
}

// track temporary badge cleanup by tab
const badgeTimers = new Map();

// get the badge timer key for a tab or global fallback
function getBadgeTimerKey(tabId) {
  return Number.isInteger(tabId) ? tabId : "global";
}

// stop pending badge cleanup for this tab
function clearBadgeTimer(tabId) {
  const key = getBadgeTimerKey(tabId);
  const timer = badgeTimers.get(key);
  if (!timer) return;

  clearTimeout(timer);
  badgeTimers.delete(key);
}

// set badge background color for one tab when possible
async function setBadgeColor(color, tabId) {
  const details = { color };
  if (Number.isInteger(tabId)) details.tabId = tabId;
  await chrome.action.setBadgeBackgroundColor(details);
}

// set badge text for one tab when possible
async function setBadgeText(text, tabId) {
  const details = { text };
  if (Number.isInteger(tabId)) details.tabId = tabId;
  await chrome.action.setBadgeText(details);
}

// show badge text without letting older timers clear it
async function showBadge(text, tabId, color = BADGE_COLOR_DEFAULT) {
  clearBadgeTimer(tabId);
  await setBadgeColor(color, tabId);
  await setBadgeText(text, tabId);
}

// clear badge text and pending cleanup for one tab
async function clearBadge(tabId) {
  clearBadgeTimer(tabId);
  await setBadgeText("", tabId);
  await setBadgeColor(BADGE_COLOR_DEFAULT, tabId);
}

// show a short badge message on the extension icon
async function flashBadge(text, ms = 1200, tabId, color = BADGE_COLOR_DEFAULT) {
  // display temporary badge text for quick feedback
  try {
    await showBadge(text, tabId, color);

    const key = getBadgeTimerKey(tabId);
    const timer = setTimeout(() => {
      badgeTimers.delete(key);
      setBadgeText("", tabId).catch((error) => {
        logWarning("failed to clear badge text", error);
      });
      setBadgeColor(BADGE_COLOR_DEFAULT, tabId).catch((error) => {
        logWarning("failed to reset badge color", error);
      });
    }, ms);

    badgeTimers.set(key, timer);
  } catch (error) {
    logWarning("failed to show badge", error);
  }
}

// prevent overlapping clears on the same tab
const runningTabs = new Set();

// track the tab and origin waiting for confirmation
let armedClear = null;
let confirmTimer = null;
let confirmationId = 0;

// cancel the pending confirmation state
async function cancelConfirmation() {
  const tabId = armedClear?.tabId;
  confirmationId += 1;

  if (confirmTimer) {
    clearTimeout(confirmTimer);
    confirmTimer = null;
  }

  armedClear = null;

  if (Number.isInteger(tabId)) {
    try {
      await clearBadge(tabId);
    } catch (error) {
      logWarning("failed to clear confirmation badge", error);
    }
  }
}

// show confirmation badge only if this confirmation is still current
async function showConfirmationBadge(tabId, id) {
  clearBadgeTimer(tabId);

  if (armedClear?.id !== id) return;
  await setBadgeColor(BADGE_COLOR_DEFAULT, tabId);

  if (armedClear?.id !== id) return;
  await setBadgeText("OK?", tabId);
}

// arm confirmation for the clicked tab and origin
async function armConfirmation(active) {
  const tabId = active.tab.id;
  const origin = active.url.origin;
  const id = confirmationId + 1;

  if (confirmTimer) {
    clearTimeout(confirmTimer);
    confirmTimer = null;
  }

  confirmationId = id;
  armedClear = { tabId, origin, id };

  // auto-cancel after 3 seconds
  confirmTimer = setTimeout(() => {
    if (armedClear?.id !== id) return;

    cancelConfirmation().catch((error) => {
      logWarning("failed to cancel confirmation", error);
    });
  }, 3000);

  await showConfirmationBadge(tabId, id);
}

// handle click on extension icon
chrome.action.onClicked.addListener(async (tab) => {
  const clickedTabId = Number.isInteger(tab?.id) ? tab.id : undefined;

  try {
    // use the tab passed by chrome for this exact click
    const active = getClickedTab(tab);
    if (!active) {
      await cancelConfirmation();
      await flashBadge("ERR", 1200, clickedTabId, BADGE_COLOR_ERROR);
      return;
    }

    const tabId = active.tab.id;
    const origin = active.url.origin;

    // ignore duplicate clicks while this tab is already clearing
    if (runningTabs.has(tabId)) return;

    const isConfirmed = armedClear?.tabId === tabId && armedClear.origin === origin;

    // first click or changed tab/site: arm this exact tab and origin
    if (!isConfirmed) {
      await cancelConfirmation();
      await armConfirmation(active);
      return;
    }

    // second click on the same tab and origin: claim the tab before awaiting cleanup
    runningTabs.add(tabId);

    try {
      await cancelConfirmation();
      await showBadge("CLR", tabId);

      // disable the confirmed tab to prevent duplicate clears
      await chrome.action.disable(tabId);

      // clear all site data for the confirmed origin
      await removeSiteData(origin);

      // show badge feedback after clearing
      await flashBadge("OK", 1200, tabId, BADGE_COLOR_SUCCESS);
    } catch (error) {
      // show failure if chrome could not clear site data
      logWarning("failed to clear site data", error);
      await flashBadge("ERR", 1200, tabId, BADGE_COLOR_ERROR);
    } finally {
      // re-enable the confirmed tab after completion
      await chrome.action.enable(tabId).catch((error) => {
        logWarning("failed to re-enable action", error);
      });
      runningTabs.delete(tabId);
    }
  } catch (error) {
    // reset state and show failure if an unexpected click error occurs
    logWarning("unexpected click error", error);
    await cancelConfirmation();
    await flashBadge("ERR", 1200, clickedTabId, BADGE_COLOR_ERROR);
  }
});