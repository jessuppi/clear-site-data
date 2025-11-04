// get the active http or https tab and its parsed url
async function getActiveTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab || !tab.url) return null;
  try {
    const url = new URL(tab.url);
    if (url.protocol === "http:" || url.protocol === "https:") {
      return { tab, url };
    }
  } catch {}
  return null;
}

// check if cookie domain matches current host or any subdomain
function hostMatches(hostname, cookieDomain) {
  // guard against missing data
  if (!hostname || !cookieDomain) return false;

  // normalize cookie domain and remove leading dot
  const cd = cookieDomain.toLowerCase().replace(/^\./, "");

  // compare hostname with cookie domain
  return hostname === cd || hostname.endsWith("." + cd);
}

// build a valid url for removing cookies
function cookieUrl(cookie) {
  // guard against invalid input
  if (!cookie || !cookie.domain) return null;

  // prepare scheme, domain, and path for a full url
  const scheme = cookie.secure ? "https" : "http";
  const domain = cookie.domain.toLowerCase().replace(/^\./, "");
  const path = cookie.path || "/";

  return `${scheme}://${domain}${path}`;
}

// remove all cookies that match the current host
async function removeCookiesForHost(hostname) {
  const all = await chrome.cookies.getAll({});
  const target = all.filter(c => hostMatches(hostname, c.domain));

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

// remove origin scoped cookies using browsingData api
async function removeOriginCookies(origin) {
  try {
    await chrome.browsingData.remove({ origins: [origin], since: 0 }, { cookies: true });
  } catch {}
}

// show a short badge text on the extension icon
async function flashBadge(text, ms = 1200) {
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
    setTimeout(() => chrome.action.setIcon({ path: "icon128.png" }), ms);
  } catch {}
}

// handle click on extension icon
chrome.action.onClicked.addListener(async () => {
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

  await flashBadge(count > 0 ? String(Math.min(count, 999)) : "OK");
  await flashIcon();
});
