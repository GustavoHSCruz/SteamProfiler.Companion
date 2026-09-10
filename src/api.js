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
    },
    reviews: reviews ? {
      total: Number.isInteger(reviews.total) ? reviews.total : null,
      positive: Number.isInteger(reviews.positive) ? reviews.positive : null,
      positive_pct: Number.isFinite(reviews.positive_pct)
        ? Math.max(0, Math.min(100, reviews.positive_pct)) : null,
      description: typeof reviews.description === "string"
        ? reviews.description.slice(0, 100) : null,
    } : null,
    players: Number.isInteger(payload.players) && payload.players >= 0
      ? payload.players : null,
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

export async function fetchCompanion(appid, language, fetcher = fetch) {
  const response = await fetcher(companionUrl(appid, language), {
    headers: { Accept: "application/json" },
    credentials: "omit",
  });
  if (!response.ok) throw new Error(`SteamProfiler API returned ${response.status}`);
  return normalizeCompanion(await response.json(), appid);
}
