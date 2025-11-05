// get the active http or https tab and its parsed url
async function getActiveTab() {
  // find the active tab in the current window
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab || !tab.url) return null;

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
  try {
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
        cache: true, // http cache
        cacheStorage: true, // cache api
        serviceWorkers: true,

        // legacy plugin storage (kept for completeness)
        pluginData: true
      }
    );
  } catch {}
}

// show a short badge message on the extension icon
async function flashBadge(text, ms = 1200) {
  // display temporary badge text for quick feedback
  try {
    await chrome.action.setBadgeText({ text });
    setTimeout(() => chrome.action.setBadgeText({ text: "" }), ms);
  } catch {}
}

// briefly flash the extension icon to confirm action
async function flashIcon(ms = 800) {
  try {
    // switch to the "active" icon
    await chrome.action.setIcon({ path: "icon128_active.png" });

    // revert back after delay
    setTimeout(() => {
      chrome.action.setIcon({ path: "icon128.png" }).catch(() => {});
    }, ms);
  } catch {}
}

// prevent overlapping runs on rapid clicks
let isRunning = false;

// handle click on extension icon
chrome.action.onClicked.addListener(async () => {
  // skip if action is already running
  if (isRunning) return;
  isRunning = true;

  // disable icon to prevent multiple clicks
  chrome.action.disable();

  try {
    // get the active browser tab
    const active = await getActiveTab();
    if (!active) {
      await flashBadge("ERR");
      return;
    }

    // clear all site data for the active origin
    const { url } = active;
    await removeSiteData(url.origin);

    // show feedback and flash the icon
    await flashBadge("OK");
    await flashIcon();
  } finally {
    // re-enable icon after completion
    chrome.action.enable();
    isRunning = false;
  }
});

