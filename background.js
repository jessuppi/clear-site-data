// get the active http or https tab and its parsed url
async function getActiveTab() {
  // find the active tab in the current window
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab || !tab.url || !Number.isInteger(tab.id)) return null;

  try {
    // parse the tab url and ensure it uses http or https
    const url = new URL(tab.url);
    if (url.protocol === "http:" || url.protocol === "https:") {
      return { tab, url };
    }
  } catch {
    // ignore invalid or internal chrome urls
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

// clear all persistent site data for this origin
async function removeSiteData(origin) {
  await chrome.browsingData.remove(
    { origins: [origin], since: 0 },
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
      setBadgeText("", tabId).catch(() => {});
      setBadgeColor(BADGE_COLOR_DEFAULT, tabId).catch(() => {});
    }, ms);

    badgeTimers.set(key, timer);
  } catch {}
}

// prevent overlapping clears on the same tab
const runningTabs = new Set();

// track the tab and origin waiting for confirmation
let armedClear = null;
let confirmTimer = null;

// cancel the pending confirmation state
async function cancelConfirmation() {
  const tabId = armedClear?.tabId;

  if (confirmTimer) {
    clearTimeout(confirmTimer);
    confirmTimer = null;
  }

  armedClear = null;

  if (Number.isInteger(tabId)) {
    try {
      await clearBadge(tabId);
    } catch {}
  }
}

// arm confirmation for the active tab and origin
async function armConfirmation(active) {
  const tabId = active.tab.id;
  const origin = active.url.origin;

  await showBadge("OK?", tabId);
  armedClear = { tabId, origin };

  // auto-cancel after 3 seconds
  confirmTimer = setTimeout(() => {
    cancelConfirmation().catch(() => {});
  }, 3000);
}

// handle click on extension icon
chrome.action.onClicked.addListener(async () => {
  try {
    // get the active browser tab before arming or clearing
    const active = await getActiveTab();
    if (!active) {
      await cancelConfirmation();
      await flashBadge("ERR", 1200, undefined, BADGE_COLOR_ERROR);
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

    // second click on the same tab and origin: proceed
    await cancelConfirmation();

    // disable the confirmed tab to prevent duplicate clears
    runningTabs.add(tabId);

    try {
      await chrome.action.disable(tabId);

      // clear all site data for the active origin
      await removeSiteData(origin);

      // show badge feedback after clearing
      await flashBadge("OK", 1200, tabId, BADGE_COLOR_SUCCESS);
    } catch {
      // show failure if chrome could not clear site data
      await flashBadge("ERR", 1200, tabId, BADGE_COLOR_ERROR);
    } finally {
      // re-enable the confirmed tab after completion
      await chrome.action.enable(tabId).catch(() => {});
      runningTabs.delete(tabId);
    }
  } catch {
    // reset state and show failure if an unexpected click error occurs
    await cancelConfirmation();
    await flashBadge("ERR", 1200, undefined, BADGE_COLOR_ERROR);
  }
});
