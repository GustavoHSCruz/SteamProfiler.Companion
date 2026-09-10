(() => {
  "use strict";

  const ROOT_ID = "steamprofiler-companion";
  const DEFAULTS = { enabled: true, showStats: true, showTrailer: true, language: "auto" };
  let pendingRetry = null;

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
