import assert from "node:assert/strict";
import test from "node:test";

import {
  companionProfileUrl,
  companionUrl,
  fetchCompanion,
  fetchCompanionProfile,
  normalizeAppid,
  normalizeCompanion,
  normalizeCompanionProfile,
  normalizeSteamId,
} from "../src/api.js";

const READY = {
  version: 1,
  appid: 620,
  state: "ready",
  game: {
    name: "Portal 2", released: "19 Apr, 2011", year: 2011, free: false,
    categories: [2, 22], genres: [3], achievements: 51,
  },
  reviews: {
    total: 1000, positive: 980, positive_pct: 98, description: "Positive",
    recent: { total: 100, positive: 91, positive_pct: 91, description: "Very Positive" },
  },
  players: 1234,
  activity: {
    latest_news_at: 1700000000,
    latest_news_title: "Update",
    latest_news_url: "https://store.steampowered.com/news/app/620/view/1",
  },
  trailer: {
    state: "ready",
    title: "Trailer",
    poster: "https://cdn.example/poster.jpg",
    media: { mp4: ["https://cdn.example/movie.mp4"], webm: [], hls: null, dash: null },
  },
};

test("accepts only real Steam app ids", () => {
  assert.equal(normalizeAppid("620"), 620);
  for (const value of ["", "0", "-1", "12x", "123456789"])
    assert.throws(() => normalizeAppid(value), TypeError);
});

test("builds the versioned companion URL", () => {
  assert.equal(companionUrl(620, "pt"), "https://steamprofiler.org/api/companion?appid=620&l=pt");
  assert.equal(companionUrl(620, "unknown"), "https://steamprofiler.org/api/companion?appid=620&l=en");
});

test("accepts a SteamID64 and builds the opt-in profile URL", () => {
  const steamid = "76561198000000000";
  assert.equal(normalizeSteamId(steamid), steamid);
  assert.equal(companionProfileUrl(620, steamid),
    `https://steamprofiler.org/api/companion/profile?appid=620&id=${steamid}`);
  for (const value of ["", "123", "7656119800000000x"])
    assert.throws(() => normalizeSteamId(value), TypeError);
});

test("normalizes a response and owns its outbound analysis link", () => {
  const result = normalizeCompanion({ ...READY, links: { analysis: "javascript:alert(1)" } }, 620);
  assert.equal(result.game.name, "Portal 2");
  assert.equal(result.analysisUrl, "https://steamprofiler.org/g/620");
  assert.equal(result.trailer.media.mp4[0], "https://cdn.example/movie.mp4");
  assert.equal(result.reviews.recent.positive_pct, 91);
  assert.deepEqual(result.game.categories, [2, 22]);
  assert.equal(result.activity.latest_news_title, "Update");
});

test("normalizes only the compact personal game envelope", () => {
  const steamid = "76561198000000000";
  const result = normalizeCompanionProfile({
    version: 1, appid: 620, steamid, state: "ready", hours: 12.5,
    hours_2weeks: 2, last_played: "2026-09-10",
    achievements: {
      unlocked: 8, total: 10, completion: 80, missing: 2,
      easiest_missing: { name: "Next", rarity: 45 },
      hardest_missing: { name: "Wall", rarity: 1 },
      list: [{ name: "must not cross the boundary" }],
    },
  }, 620, steamid);
  assert.equal(result.hours, 12.5);
  assert.equal(result.achievements.easiest_missing.name, "Next");
  assert.equal(result.achievements.list, undefined);
});

test("rejects a response for another app or contract version", () => {
  assert.throws(() => normalizeCompanion({ ...READY, appid: 400 }, 620), TypeError);
  assert.throws(() => normalizeCompanion({ ...READY, version: 2 }, 620), TypeError);
});

test("fetch sends no credentials", async () => {
  let init;
  const result = await fetchCompanion(620, "en", async (_url, options) => {
    init = options;
    return { ok: true, json: async () => READY };
  });
  assert.equal(result.appid, 620);
  assert.equal(init.credentials, "omit");
});

test("personal fetch also sends no credentials", async () => {
  const steamid = "76561198000000000";
  let init;
  const result = await fetchCompanionProfile(620, steamid, async (_url, options) => {
    init = options;
    return { ok: true, json: async () => ({
      version: 1, appid: 620, steamid, state: "absent",
    }) };
  });
  assert.equal(result.state, "absent");
  assert.equal(init.credentials, "omit");
});
