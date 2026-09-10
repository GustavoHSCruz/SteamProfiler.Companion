import assert from "node:assert/strict";
import test from "node:test";

import { companionUrl, fetchCompanion, normalizeAppid, normalizeCompanion } from "../src/api.js";

const READY = {
  version: 1,
  appid: 620,
  state: "ready",
  game: { name: "Portal 2", released: "19 Apr, 2011", year: 2011, free: false },
  reviews: { total: 1000, positive: 980, positive_pct: 98, description: "Positive" },
  players: 1234,
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

test("normalizes a response and owns its outbound analysis link", () => {
  const result = normalizeCompanion({ ...READY, links: { analysis: "javascript:alert(1)" } }, 620);
  assert.equal(result.game.name, "Portal 2");
  assert.equal(result.analysisUrl, "https://steamprofiler.org/g/620");
  assert.equal(result.trailer.media.mp4[0], "https://cdn.example/movie.mp4");
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
