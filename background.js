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

// set persistent badge background once on install or update
chrome.runtime.onInstalled.addListener(() => {
  chrome.action.setBadgeBackgroundColor({ color: "#424242" });
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

// set badge text for one tab when possible
async function setBadgeText(text, tabId) {
  const details = { text };
  if (Number.isInteger(tabId)) details.tabId = tabId;
  await chrome.action.setBadgeText(details);
}

// show a short badge message on the extension icon
async function flashBadge(text, ms = 1200, tabId) {
  // display temporary badge text for quick feedback
  try {
    await setBadgeText(text, tabId);
    setTimeout(() => setBadgeText("", tabId).catch(() => {}), ms);
  } catch {}
}

// prevent overlapping runs on rapid clicks
let isRunning = false;

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
      await setBadgeText("", tabId);
    } catch {}
  }
}

// arm confirmation for the active tab and origin
async function armConfirmation(active) {
  const tabId = active.tab.id;
  const origin = active.url.origin;

  armedClear = { tabId, origin };
  await setBadgeText("OK?", tabId);

  // auto-cancel after 3 seconds
  confirmTimer = setTimeout(() => {
    cancelConfirmation().catch(() => {});
  }, 3000);
}

// handle click on extension icon
chrome.action.onClicked.addListener(async () => {
  // ignore if a clear is already running
  if (isRunning) return;

  try {
    // get the active browser tab before arming or clearing
    const active = await getActiveTab();
    if (!active) {
      await cancelConfirmation();
      await flashBadge("ERR");
      return;
    }

    const tabId = active.tab.id;
    const origin = active.url.origin;
    const isConfirmed = armedClear?.tabId === tabId && armedClear.origin === origin;

    // first click or changed tab/site: arm this exact tab and origin
    if (!isConfirmed) {
      await cancelConfirmation();
      await armConfirmation(active);
      return;
    }

    // second click on the same tab and origin: proceed
    await cancelConfirmation();

    // disable icon to prevent multiple clicks during clear
    isRunning = true;
    chrome.action.disable();

    try {
      // clear all site data for the active origin
      await removeSiteData(origin);

      // show badge feedback after clearing
      await flashBadge("OK", 1200, tabId);
    } catch {
      // show failure if chrome could not clear site data
      await flashBadge("ERR", 1200, tabId);
    } finally {
      // re-enable icon after completion
      chrome.action.enable();
      isRunning = false;
    }
  } catch {
    // show failure if tab lookup or confirmation state fails
    await flashBadge("ERR");
  }
});
