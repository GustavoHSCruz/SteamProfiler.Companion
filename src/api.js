export const API_ORIGIN = "https://steamprofiler.org";
const APPID = /^[1-9]\d{0,7}$/;

export function normalizeAppid(value) {
  const raw = String(value ?? "").trim();
  if (!APPID.test(raw)) throw new TypeError("Invalid Steam appid");
  return Number(raw);
}

export function companionUrl(appid, language = "en") {
  const id = normalizeAppid(appid);
  const lang = ["en", "pt", "ru"].includes(language) ? language : "en";
  return `${API_ORIGIN}/api/companion?appid=${id}&l=${lang}`;
}

export function normalizeSteamId(value) {
  const raw = String(value ?? "").trim();
  if (!/^7656119\d{10}$/.test(raw)) throw new TypeError("Invalid SteamID64");
  return raw;
}

export function companionProfileUrl(appid, steamid) {
  const id = normalizeAppid(appid);
  const who = normalizeSteamId(steamid);
  return `${API_ORIGIN}/api/companion/profile?appid=${id}&id=${who}`;
}

function safeHttps(value) {
  if (!value) return null;
  try {
    const url = new URL(value);
    return url.protocol === "https:" ? url.href : null;
  } catch {
    return null;
  }
}

function mediaOf(media) {
  if (!media || typeof media !== "object") return null;
  const list = (value) => Array.isArray(value)
    ? value.map(safeHttps).filter(Boolean).slice(0, 4)
    : [];
  return {
    hls: safeHttps(media.hls),
    dash: safeHttps(media.dash),
    mp4: list(media.mp4),
    webm: list(media.webm),
  };
}

function idList(value) {
  return Array.isArray(value)
    ? value.filter((item) => Number.isInteger(item) && item >= 0).slice(0, 100)
    : [];
}

function reviewOf(value, withRecent = false) {
  if (!value || typeof value !== "object") return null;
  const total = Number.isInteger(value.total) && value.total >= 0 ? value.total : null;
  const positive = Number.isInteger(value.positive) && value.positive >= 0 ? value.positive : null;
  const result = {
    total,
    positive,
    positive_pct: Number.isFinite(value.positive_pct)
      ? Math.max(0, Math.min(100, value.positive_pct)) : null,
    description: typeof value.description === "string"
      ? value.description.slice(0, 100) : null,
  };
  if (withRecent) result.recent = reviewOf(value.recent, false);
  return result;
}

export function normalizeCompanion(payload, expectedAppid) {
  const appid = normalizeAppid(expectedAppid);
  if (!payload || payload.version !== 1 || payload.appid !== appid) {
    throw new TypeError("Unsupported companion response");
  }
  if (!["pending", "ready", "absent"].includes(payload.state)) {
    throw new TypeError("Invalid companion state");
  }

  const game = payload.game && typeof payload.game === "object" ? payload.game : {};
  const reviews = payload.reviews && typeof payload.reviews === "object"
    ? payload.reviews : null;
  const trailer = payload.trailer && typeof payload.trailer === "object"
    ? payload.trailer : {};
  return {
    version: 1,
    appid,
    state: payload.state,
    game: {
      name: typeof game.name === "string" ? game.name.slice(0, 300) : null,
      released: typeof game.released === "string" ? game.released.slice(0, 100) : null,
      year: Number.isInteger(game.year) ? game.year : null,
      free: typeof game.free === "boolean" ? game.free : null,
      image: safeHttps(game.image),
      platforms: game.platforms && typeof game.platforms === "object"
        ? game.platforms : {},
      categories: idList(game.categories),
      genres: idList(game.genres),
      achievements: Number.isInteger(game.achievements) && game.achievements >= 0
        ? game.achievements : null,
    },
    reviews: reviewOf(reviews, true),
    players: Number.isInteger(payload.players) && payload.players >= 0
      ? payload.players : null,
    activity: payload.activity && typeof payload.activity === "object" ? {
      latest_news_at: Number.isInteger(payload.activity.latest_news_at)
        ? payload.activity.latest_news_at : null,
      latest_news_title: typeof payload.activity.latest_news_title === "string"
        ? payload.activity.latest_news_title.slice(0, 300) : null,
      latest_news_url: safeHttps(payload.activity.latest_news_url),
    } : null,
    trailer: {
      state: ["pending", "ready", "absent"].includes(trailer.state)
        ? trailer.state : "absent",
      title: typeof trailer.title === "string" ? trailer.title.slice(0, 300) : null,
      poster: safeHttps(trailer.poster),
      media: mediaOf(trailer.media),
    },
    analysisUrl: `${API_ORIGIN}/g/${appid}`,
  };
}

function achievementOf(value) {
  if (!value || typeof value !== "object") return null;
  const compact = (item) => item && typeof item === "object" ? {
    name: typeof item.name === "string" ? item.name.slice(0, 300) : null,
    rarity: Number.isFinite(item.rarity) ? Math.max(0, Math.min(100, item.rarity)) : null,
  } : null;
  return {
    unlocked: Number.isInteger(value.unlocked) ? value.unlocked : null,
    total: Number.isInteger(value.total) ? value.total : null,
    completion: Number.isFinite(value.completion)
      ? Math.max(0, Math.min(100, value.completion)) : null,
    missing: Number.isInteger(value.missing) ? value.missing : null,
    easiest_missing: compact(value.easiest_missing),
    hardest_missing: compact(value.hardest_missing),
  };
}

export function normalizeCompanionProfile(payload, expectedAppid, expectedSteamId) {
  const appid = normalizeAppid(expectedAppid);
  const steamid = normalizeSteamId(expectedSteamId);
  if (!payload || payload.version !== 1 || payload.appid !== appid
      || payload.steamid !== steamid || !["ready", "absent"].includes(payload.state)) {
    throw new TypeError("Unsupported companion profile response");
  }
  return {
    version: 1,
    appid,
    steamid,
    state: payload.state,
    hours: Number.isFinite(payload.hours) && payload.hours >= 0 ? payload.hours : null,
    hours_2weeks: Number.isFinite(payload.hours_2weeks) && payload.hours_2weeks >= 0
      ? payload.hours_2weeks : null,
    last_played: typeof payload.last_played === "string" ? payload.last_played.slice(0, 20) : null,
    achievements: achievementOf(payload.achievements),
  };
}

/* The Unicode chart a profile can ask for, which is the one card that is text
   rather than a picture. Everything else is an <img> the page loads by itself
   and never passes through here.

   The URL arrives from a content script, so it is checked again rather than
   trusted: a message is not proof of where it came from. Only this one path is
   allowed, which also means there is no second copy of the endpoint list to
   drift out of step with src/tag.js. */
export function cardTextUrl(href) {
  const url = new URL(String(href ?? ""));
  if (url.origin !== API_ORIGIN || url.pathname !== "/bars.txt") {
    throw new TypeError("Invalid card URL");
  }
  return url.href;
}

export async function fetchCardText(href, fetcher = fetch) {
  const response = await fetcher(cardTextUrl(href), {
    headers: { Accept: "text/plain" },
    credentials: "omit",
  });
  if (!response.ok) throw new Error(`SteamProfiler API returned ${response.status}`);
  // A chart is fifteen short lines at the very most. The cap is what stops an
  // unexpected answer from becoming a wall of text on somebody's profile.
  return (await response.text()).slice(0, 4000);
}

export async function fetchCompanion(appid, language, fetcher = fetch) {
  const response = await fetcher(companionUrl(appid, language), {
    headers: { Accept: "application/json" },
    credentials: "omit",
  });
  if (!response.ok) throw new Error(`SteamProfiler API returned ${response.status}`);
  return normalizeCompanion(await response.json(), appid);
}

export async function fetchCompanionProfile(appid, steamid, fetcher = fetch) {
  const response = await fetcher(companionProfileUrl(appid, steamid), {
    headers: { Accept: "application/json" },
    credentials: "omit",
  });
  if (!response.ok) throw new Error(`SteamProfiler API returned ${response.status}`);
  return normalizeCompanionProfile(await response.json(), appid, steamid);
}
