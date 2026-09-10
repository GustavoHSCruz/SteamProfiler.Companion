import {
  cardTextUrl,
  fetchCardText,
  fetchCompanion,
  fetchCompanionProfile,
  normalizeAppid,
  normalizeSteamId,
} from "./api.js";

const DEFAULTS = Object.freeze({
  enabled: true,
  showStats: true,
  showTrailer: true,
  useProfile: false,
  showProfileCards: true,
  steamId: "",
  language: "auto",
});
const cache = new Map();

chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.sync.get(DEFAULTS, (settings) => chrome.storage.sync.set(settings));
});

function languageOf(requested) {
  if (["en", "pt", "ru"].includes(requested)) return requested;
  const ui = chrome.i18n.getUILanguage().toLowerCase();
  if (ui.startsWith("pt")) return "pt";
  if (ui.startsWith("ru")) return "ru";
  return "en";
}

async function gameFor(message) {
  const appid = normalizeAppid(message.appid);
  const language = languageOf(message.language);
  const key = `${appid}:${language}`;
  const now = Date.now();
  const hit = cache.get(key);
  if (hit && hit.until > now) return hit.value;

  const value = await fetchCompanion(appid, language);
  cache.set(key, {
    value,
    until: now + (value.state === "pending" ? 20_000 : 4 * 60_000),
  });
  if (cache.size > 100) cache.delete(cache.keys().next().value);
  return value;
}

async function profileGameFor(message) {
  const appid = normalizeAppid(message.appid);
  const steamid = normalizeSteamId(message.steamid);
  const key = `profile:${appid}:${steamid}`;
  const now = Date.now();
  const hit = cache.get(key);
  if (hit && hit.until > now) return hit.value;
  const value = await fetchCompanionProfile(appid, steamid);
  cache.set(key, { value, until: now + 5 * 60_000 });
  return value;
}

/* The one profile card that is not a picture. The four that are never reach
   this file: the page loads them as <img> itself. This one is fetched here and
   not from the content script because steamcommunity.com serves a
   Content-Security-Policy whose `connect-src` is a closed list that does not
   include this service, so a request from the page's own context would be
   refused. A service worker is not subject to the page's policy. */
async function cardTextFor(message) {
  const href = cardTextUrl(message.href);
  const key = `card:${href}`;
  const now = Date.now();
  const hit = cache.get(key);
  if (hit && hit.until > now) return hit.value;
  const value = await fetchCardText(href);
  cache.set(key, { value, until: now + 5 * 60_000 });
  if (cache.size > 100) cache.delete(cache.keys().next().value);
  return value;
}

const REQUESTS = {
  SP_GET_GAME: gameFor,
  SP_GET_PROFILE_GAME: profileGameFor,
  SP_GET_CARD_TEXT: cardTextFor,
};

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  // hasOwn and not a plain lookup: `{}["constructor"]` is a function too, and a
  // message naming one would be called instead of being turned away.
  if (!message || !Object.hasOwn(REQUESTS, message.type)) return false;
  const request = REQUESTS[message.type];
  request(message)
    .then((data) => sendResponse({ ok: true, data }))
    .catch((error) => sendResponse({
      ok: false,
      error: error instanceof Error ? error.message : "Unknown error",
    }));
  return true;
});
