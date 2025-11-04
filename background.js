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
  chrome.action.setBadgeBackgroundColor({ color: "#333" });
});

// check if cookie domain matches current host or any subdomain
function hostMatches(hostname, cookieDomain) {
  // guard against missing or invalid data
  if (!hostname || !cookieDomain) return false;

  // normalize cookie domain and remove leading dot
  const cd = cookieDomain.toLowerCase().replace(/^\./, "");

  // return true if hostname matches cookie domain or subdomain
  return hostname === cd || hostname.endsWith("." + cd);
}

// build a valid url for removing cookies
function cookieUrl(cookie) {
  // guard against invalid input
  if (!cookie || !cookie.domain) return null;

  // create a normalized url for this cookie
  const scheme = cookie.secure ? "https" : "http";
  const domain = cookie.domain.toLowerCase().replace(/^\./, "");
  const path = cookie.path || "/";

  return `${scheme}://${domain}${path}`;
}

// remove all cookies that match the current host
async function removeCookiesForHost(hostname) {
  // fetch only cookies for this domain and its subdomains
  const target = await chrome.cookies.getAll({ domain: hostname });
  if (!target || target.length === 0) return 0;

  // remove matching cookies including partitioned ones
  const removals = target.map(c => {
    const url = cookieUrl(c);
    if (!url) return null;
    return chrome.cookies.remove({
      url,
      name: c.name,
      storeId: c.storeId,
      partitionKey: c.partitionKey ? c.partitionKey : undefined
    }).catch(() => {});
  }).filter(Boolean);

  await Promise.all(removals);
  return target.length;
}

// remove origin-scoped cookies using the browsingData api
async function removeOriginCookies(origin) {
  // clear any remaining cookies tied to this origin
  try {
    await chrome.browsingData.remove({ origins: [origin], since: 0 }, { cookies: true });
  } catch {}
}

// show a short badge message on the extension icon
async function flashBadge(text, ms = 1200) {
  // display temporary badge text for quick feedback
  try {
    await chrome.action.setBadgeText({ text });
    await chrome.action.setBadgeBackgroundColor({ color: "#333" });
    setTimeout(() => chrome.action.setBadgeText({ text: "" }), ms);
  } catch {}
}

// briefly flash the icon to confirm action
async function flashIcon(ms = 800) {
  try {
    await chrome.action.setIcon({ path: "icon128_active.png" });
  } catch {}
  setTimeout(async () => {
    try {
      await chrome.action.setIcon({ path: "icon128.png" });
    } catch {}
  }, ms);
}

// prevent overlapping runs on rapid clicks
let isRunning = false;

// handle click on extension icon
chrome.action.onClicked.addListener(async () => {
  if (isRunning) {
    await flashBadge("...");
    return;
  }
  isRunning = true;

  try {
    const active = await getActiveTab();
    if (!active) {
      await flashBadge("ERR");
      return;
    }

    const { url } = active;
    const hostname = url.hostname;
    const origin = url.origin;

    const count = await removeCookiesForHost(hostname);
    await removeOriginCookies(origin);

    const label = count > 999 ? "999+" : String(count);
    await flashBadge(count > 0 ? label : "OK");
    await flashIcon();
  } finally {
    isRunning = false;
  }
});
