(() => {
  "use strict";

  const ROOT_ID = "steamprofiler-companion";
  const DEFAULTS = {
    enabled: true,
    showStats: true,
    showTrailer: true,
    useProfile: false,
    steamId: "",
    language: "auto",
  };
  let pendingRetry = null;
  let renderSequence = 0;

  const t = (key, substitutions) => chrome.i18n.getMessage(key, substitutions) || key;
  const node = (tag, className, text) => {
    const element = document.createElement(tag);
    if (className) element.className = className;
    if (text != null) element.textContent = text;
    return element;
  };

  function appidFromLocation() {
    const match = location.pathname.match(/^\/app\/([1-9]\d{0,7})(?:\/|$)/);
    return match ? Number(match[1]) : null;
  }

  function number(value) {
    return new Intl.NumberFormat().format(value);
  }

  function decimal(value) {
    return new Intl.NumberFormat(undefined, { maximumFractionDigits: 1 }).format(value);
  }

  function daysSince(seconds) {
    if (!Number.isInteger(seconds)) return null;
    return Math.max(0, Math.floor((Date.now() - seconds * 1000) / 86_400_000));
  }

  function message(payload) {
    return new Promise((resolve, reject) => {
      chrome.runtime.sendMessage(payload, (response) => {
        if (chrome.runtime.lastError) return reject(new Error(chrome.runtime.lastError.message));
        resolve(response);
      });
    });
  }

  function settings() {
    return new Promise((resolve) => chrome.storage.sync.get(DEFAULTS, resolve));
  }

  function insertionPoint() {
    return document.querySelector("#game_area_purchase")
      || document.querySelector(".game_area_purchase")
      || document.querySelector(".page_content");
  }

  function closeTrailer(overlay) {
    const video = overlay.querySelector("video");
    if (video) {
      video.pause();
      video.removeAttribute("src");
      video.load();
    }
    overlay.remove();
    document.documentElement.classList.remove("spc-modal-open");
  }

  function openTrailer(data) {
    const media = data.trailer.media;
    const source = media?.mp4?.[0] || media?.webm?.[0] || media?.hls;
    if (!source) return;

    const overlay = node("div", "spc-overlay");
    overlay.setAttribute("role", "dialog");
    overlay.setAttribute("aria-modal", "true");
    overlay.setAttribute("aria-label", data.trailer.title || t("trailer"));
    const frame = node("div", "spc-video-frame");
    const close = node("button", "spc-close", "×");
    close.type = "button";
    close.setAttribute("aria-label", t("close"));
    const video = node("video", "spc-video");
    video.controls = true;
    video.autoplay = true;
    video.playsInline = true;
    video.preload = "metadata";
    video.poster = data.trailer.poster || "";
    video.src = source;
    const credit = node("a", "spc-video-credit", "steamprofiler.org");
    credit.href = data.analysisUrl;
    credit.target = "_blank";
    credit.rel = "noopener noreferrer";
    frame.append(close, video, credit);
    overlay.append(frame);
    document.body.append(overlay);
    document.documentElement.classList.add("spc-modal-open");
    close.focus();
    close.addEventListener("click", () => closeTrailer(overlay));
    overlay.addEventListener("click", (event) => {
      if (event.target === overlay) closeTrailer(overlay);
    });
    const escape = (event) => {
      if (event.key === "Escape" && overlay.isConnected) {
        closeTrailer(overlay);
        document.removeEventListener("keydown", escape);
      }
    };
    document.addEventListener("keydown", escape);
  }

  function metric(value, label) {
    const item = node("div", "spc-metric");
    item.append(node("strong", "", value), node("span", "", label));
    return item;
  }

  function insight(title, className = "") {
    const section = node("section", `spc-insight ${className}`.trim());
    section.append(node("h3", "spc-insight-title", title));
    return section;
  }

  function reviewInsight(reviews) {
    if (!reviews?.total || reviews.positive_pct == null) return null;
    const section = insight(t("reviewXray"), "spc-review-insight");
    const values = node("div", "spc-review-values");
    values.append(metric(`${decimal(reviews.positive_pct)}%`, t("reviewAllTime")));
    const recent = reviews.recent;
    if (recent?.total && recent.positive_pct != null) {
      values.append(metric(`${decimal(recent.positive_pct)}%`, t("reviewRecent")));
      const delta = Math.round((recent.positive_pct - reviews.positive_pct) * 10) / 10;
      const direction = delta >= 3 ? "reviewImproving" : delta <= -3 ? "reviewFalling" : "reviewStable";
      const verdict = node("p", `spc-verdict ${delta >= 3 ? "spc-good" : delta <= -3 ? "spc-warn" : ""}`,
        t(direction, decimal(Math.abs(delta))));
      section.append(values, verdict);
      section.append(node("p", "spc-evidence", t("reviewVolume", number(recent.total))));
    } else {
      section.append(values, node("p", "spc-evidence", t("reviewNoRecent")));
    }
    return section;
  }

  function activityInsight(activity) {
    const age = daysSince(activity?.latest_news_at);
    if (age == null) return null;
    const section = insight(t("activityTitle"), "spc-activity-insight");
    let status = "activityLongQuiet";
    if (age <= 45) status = "activityActive";
    else if (age <= 180) status = "activityMaintained";
    else if (age <= 365) status = "activityQuiet";
    const verdict = node("p", `spc-verdict ${age <= 180 ? "spc-good" : age > 365 ? "spc-warn" : ""}`,
      t(status));
    section.append(verdict, node("p", "spc-evidence", age === 0
      ? t("activityToday") : t("activityDays", number(age))));
    if (activity.latest_news_title) {
      const label = activity.latest_news_url
        ? node("a", "spc-news-link", activity.latest_news_title)
        : node("span", "spc-news-link", activity.latest_news_title);
      if (activity.latest_news_url) {
        label.href = activity.latest_news_url;
        label.target = "_blank";
        label.rel = "noopener noreferrer";
      }
      section.append(label);
    }
    section.append(node("p", "spc-fineprint", t("activityCaveat")));
    return section;
  }

  function audienceInsight(data) {
    const categories = new Set(data.game.categories || []);
    const labels = [];
    if (categories.has(9) || categories.has(38)) labels.push(t("audienceCoop"));
    if (categories.has(1) || categories.has(36)) labels.push(t("audienceMultiplayer"));
    if (categories.has(2)) labels.push(t("audienceSolo"));
    if (data.game.achievements >= 20) labels.push(t("audienceAchievements"));
    const activityAge = daysSince(data.activity?.latest_news_at);
    if (activityAge != null && activityAge <= 90) labels.push(t("audienceLiving"));
    if (!labels.length) return null;
    const section = insight(t("audienceTitle"), "spc-audience-insight");
    const tags = node("div", "spc-tags");
    for (const label of [...new Set(labels)].slice(0, 4)) tags.append(node("span", "spc-tag", label));
    section.append(tags);
    return section;
  }

  /* Whoever is signed in, out of what Steam already put on the page. The work
     is in src/identity.js, which the manifest loads first: it is testable
     without a browser, and it is where the reasons are written down for why
     only the header is trusted for other people's ids. */
  function detectedSteamId(manual) {
    return SteamProfilerIdentity.detect(document, manual);
  }

  function putBeforeActions(root, section) {
    const actions = root.querySelector(".spc-actions");
    if (actions) root.insertBefore(section, actions);
    else root.append(section);
  }

  function renderPersonal(root, profile) {
    const old = root.querySelector(".spc-personal");
    const section = insight(t("personalTitle"), "spc-personal");
    if (profile.state === "absent") {
      section.append(node("p", "spc-verdict", t("personalNotOwned")));
    } else {
      const values = node("div", "spc-personal-values");
      if (profile.hours != null) values.append(metric(`${decimal(profile.hours)}h`, t("personalHours")));
      if (profile.achievements?.total) {
        values.append(metric(
          `${number(profile.achievements.unlocked || 0)}/${number(profile.achievements.total)}`,
          t("personalAchievements"),
        ));
        if (profile.achievements.completion != null) {
          values.append(metric(`${decimal(profile.achievements.completion)}%`, t("personalCompletion")));
        }
      }
      section.append(values);
      const next = profile.achievements?.easiest_missing;
      if (next?.name) section.append(node("p", "spc-next", t("personalNext", next.name)));
    }
    if (old) old.replaceWith(section);
    else putBeforeActions(root, section);
  }

  async function loadPersonal(root, appid, options, sequence) {
    if (!options.useProfile) return;
    const steamid = detectedSteamId(options.steamId);
    const waiting = insight(t("personalTitle"), "spc-personal");
    if (!steamid) {
      waiting.append(node("p", "spc-verdict", t("personalNoId")),
        node("p", "spc-fineprint", t("personalNoCookies")));
      putBeforeActions(root, waiting);
      return;
    }
    waiting.append(node("p", "spc-evidence", t("personalLoading")));
    putBeforeActions(root, waiting);
    try {
      const response = await message({ type: "SP_GET_PROFILE_GAME", appid, steamid });
      if (sequence !== renderSequence || !root.isConnected) return;
      if (!response?.ok) throw new Error(response?.error || "Request failed");
      renderPersonal(root, response.data);
    } catch {
      if (sequence !== renderSequence || !root.isConnected) return;
      waiting.replaceChildren(node("h3", "spc-insight-title", t("personalTitle")),
        node("p", "spc-verdict spc-warn", t("personalUnavailable")),
        node("p", "spc-fineprint", t("personalPrivate")));
    }
  }

  function renderData(root, data, options) {
    root.replaceChildren();
    const header = node("header", "spc-head");
    const identity = node("div", "spc-identity");
    identity.append(node("span", "spc-mark", "SP"), node("div", "", null));
    identity.lastChild.append(
      node("p", "spc-kicker", t("panelKicker")),
      node("h2", "spc-title", data.game.name || t("panelTitle")),
    );
    const brand = node("a", "spc-brand", "steamprofiler.org ↗");
    brand.href = data.analysisUrl;
    brand.target = "_blank";
    brand.rel = "noopener noreferrer";
    header.append(identity, brand);
    root.append(header);

    if (data.state === "pending") {
      const pending = node("div", "spc-state");
      pending.append(node("strong", "", t("readingTitle")), node("p", "", t("readingBody")));
      root.append(pending);
      return;
    }
    if (data.state === "absent") {
      const absent = node("div", "spc-state");
      absent.append(node("strong", "", t("absentTitle")), node("p", "", t("absentBody")));
      root.append(absent);
      return;
    }

    if (options.showStats) {
      const metrics = node("div", "spc-metrics");
      if (data.players != null) metrics.append(metric(number(data.players), t("playingNow")));
      if (data.reviews?.positive_pct != null) {
        metrics.append(metric(`${number(data.reviews.positive_pct)}%`, t("positiveReviews")));
      }
      if (data.reviews?.total != null) metrics.append(metric(number(data.reviews.total), t("reviews")));
      if (data.game.released) metrics.append(metric(data.game.released, t("release")));
      if (metrics.childElementCount) root.append(metrics);

      const insights = node("div", "spc-insights");
      for (const item of [reviewInsight(data.reviews), activityInsight(data.activity), audienceInsight(data)]) {
        if (item) insights.append(item);
      }
      if (insights.childElementCount) root.append(insights);
    }

    const actions = node("div", "spc-actions");
    const analysis = node("a", "spc-button spc-primary", t("openAnalysis"));
    analysis.href = data.analysisUrl;
    analysis.target = "_blank";
    analysis.rel = "noopener noreferrer";
    actions.append(analysis);
    const hasVideo = data.trailer.state === "ready" && (
      data.trailer.media?.mp4?.length || data.trailer.media?.webm?.length || data.trailer.media?.hls
    );
    if (options.showTrailer && hasVideo) {
      const trailer = node("button", "spc-button", t("watchTrailer"));
      trailer.type = "button";
      trailer.addEventListener("click", () => openTrailer(data));
      actions.append(trailer);
    }
    root.append(actions);
  }

  function renderError(root) {
    root.replaceChildren();
    const state = node("div", "spc-state");
    state.append(node("strong", "", t("errorTitle")), node("p", "", t("errorBody")));
    const retry = node("button", "spc-button", t("retry"));
    retry.type = "button";
    retry.addEventListener("click", boot);
    state.append(retry);
    root.append(state);
  }

  async function boot() {
    const sequence = ++renderSequence;
    const appid = appidFromLocation();
    if (!appid) return;
    const options = await settings();
    const old = document.getElementById(ROOT_ID);
    if (!options.enabled) {
      old?.remove();
      return;
    }

    const anchor = insertionPoint();
    if (!anchor) return;
    const root = old || node("section", "spc-panel spc-loading");
    root.id = ROOT_ID;
    root.setAttribute("aria-label", "SteamProfiler Companion");
    if (!old) anchor.insertAdjacentElement("afterend", root);
    root.classList.add("spc-loading");
    root.replaceChildren(node("p", "spc-loading-copy", t("loading")));

    try {
      const response = await message({ type: "SP_GET_GAME", appid, language: options.language });
      if (!response?.ok) throw new Error(response?.error || "Request failed");
      root.classList.remove("spc-loading");
      renderData(root, response.data, options);
      loadPersonal(root, appid, options, sequence);
      if (response.data.state === "pending" && !pendingRetry) {
        pendingRetry = window.setTimeout(() => {
          pendingRetry = null;
          boot();
        }, 21_000);
      }
    } catch {
      root.classList.remove("spc-loading");
      renderError(root);
    }
  }

  chrome.storage.onChanged.addListener((_changes, area) => {
    if (area === "sync") boot();
  });
  boot();
})();
