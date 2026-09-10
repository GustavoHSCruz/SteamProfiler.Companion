import {
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

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (!message || !["SP_GET_GAME", "SP_GET_PROFILE_GAME"].includes(message.type)) return false;
  const request = message.type === "SP_GET_PROFILE_GAME" ? profileGameFor : gameFor;
  request(message)
    .then((data) => sendResponse({ ok: true, data }))
    .catch((error) => sendResponse({
      ok: false,
      error: error instanceof Error ? error.message : "Unknown error",
    }));
  return true;
});
