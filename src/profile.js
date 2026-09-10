/* The card a Steam profile asked for, drawn on the profile itself.

   Somebody writes `{!stpf=url=https://steamprofiler.org/api/bars.svg?...}` in
   their About Me or in their Info Box, and this puts the picture that URL names
   on the page. Steam cannot render it for anybody, so it appears only for readers
   who have this extension - which is the whole shape of the feature and not a
   limitation of it.

   Two decisions are worth finding here rather than in a commit message.

   The tag is read out of the page and never asked of Steam. The visitor's
   browser has already downloaded this HTML, so reading it costs nothing and
   adds no automated request against steamcommunity.com - which is a rule of the
   Subscriber Agreement and a budget this service paces deliberately elsewhere.
   Having the server fetch the profile to look for the tag would have meant one
   scrape per visitor, on a host we are guests of.

   Nothing about the reader is sent anywhere. The picture is an <img> pointing
   at steamprofiler.org, which is an ordinary image load; whose profile it is
   travels in the URL, and who is reading it does not travel at all. The reader
   is identified for exactly one purpose, locally: deciding whether they are the
   author of a tag that needs fixing. */
(() => {
  "use strict";

  const ROOT_ID = "steamprofiler-card";
  /* Only the two keys this page needs. chrome.storage fills in the rest from
     its own defaults, so this is not a third copy of the whole settings shape. */
  const DEFAULTS = { enabled: true, showProfileCards: true };
  /* The About Me and every customisation block, which is where the Info Box
     lives. Read as text: Steam turns a pasted URL into a link, and textContent
     flattens that back into the URL, which is what the tag actually said. */
  const SOURCES = ".profile_summary, .profile_customization";
  const OWNER_IN_SCRIPT = /"steamid"\s*:\s*"(7656119\d{10})"/;

  const t = (key, substitutions) => chrome.i18n.getMessage(key, substitutions) || key;
  const node = (tag, className, text) => {
    const element = document.createElement(tag);
    if (className) element.className = className;
    if (text != null) element.textContent = text;
    return element;
  };

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

  /** Whose profile this is. The subject of the page, not the reader of it.
   *
   *  `/profiles/<id>` says so in the path. `/id/<name>` says a name, which is
   *  not an id, so the id comes from `g_rgProfileData` - read as text out of an
   *  inline script, the same discipline identity.js follows: nothing here is
   *  executed and nothing is injected into the page. */
  function ownerId() {
    const path = location.pathname.match(/^\/profiles\/(7656119\d{10})(?:\/|$)/);
    if (path) return path[1];
    for (const script of document.querySelectorAll("script:not([src])")) {
      const text = String(script.textContent || "");
      if (!text.includes("g_rgProfileData")) continue;
      const found = text.match(OWNER_IN_SCRIPT);
      if (found) return found[1];
    }
    return null;
  }

  /** The text of the first block on this page that carries a tag. */
  function tagText() {
    for (const block of document.querySelectorAll(SOURCES)) {
      const text = block.textContent || "";
      if (SteamProfilerTag.find(text)) return text;
    }
    return null;
  }

  function insertionPoint() {
    return document.querySelector(".profile_customization_area")
      || document.querySelector(".profile_content_inner")
      || document.querySelector(".profile_content");
  }

  /** The panel around the picture.
   *
   *  The card is deliberately not dressed as one of Steam's showcases. What is
   *  drawn here belongs to this service, it sits on Valve's page next to Valve's
   *  own panels, and a reader has to be able to tell those apart without
   *  thinking about it - which is also what the Steam Web API terms require of
   *  anything that presents Steam data. The picture itself carries the mark,
   *  forced on by the server; this adds the name and the sentence saying who is
   *  not behind it. */
  function frame() {
    const root = node("section", "spc-card");
    root.id = ROOT_ID;
    root.setAttribute("aria-label", "SteamProfiler");

    const head = node("div", "spc-card-head");
    const identity = node("div", "spc-card-identity");
    identity.append(node("span", "spc-card-mark", "SP"),
                    node("span", "spc-card-name", "SteamProfiler"));
    const legal = node("p", "spc-card-legal", t("cardDisclaimer"));
    legal.hidden = true;
    const info = node("button", "spc-card-info", "i");
    info.type = "button";
    info.title = t("cardDisclaimer");
    info.setAttribute("aria-label", t("cardAbout"));
    info.setAttribute("aria-expanded", "false");
    info.addEventListener("click", () => {
      legal.hidden = !legal.hidden;
      info.setAttribute("aria-expanded", String(!legal.hidden));
    });
    head.append(identity, info);
    root.append(head, legal);
    return root;
  }

  /** The picture, as an image and nothing more.
   *
   *  An SVG loaded through <img> cannot run script, cannot follow a link and
   *  cannot be hovered - which is why the 'i' above is a real element out here
   *  and not a glyph drawn inside the file, where it would promise something it
   *  could not do. The full sentence rides on `alt` and `title`, so it costs no
   *  space, survives the image failing to load, and reaches a screen reader. */
  function picture(card) {
    const image = node("img", "spc-card-art");
    image.src = card.href;
    image.loading = "lazy";
    image.decoding = "async";
    image.alt = t("cardAlt");
    image.title = t("cardDisclaimer");
    return image;
  }

  /** What the author of the tag is told, which is what to do and not only that
   *  something is wrong. They are the only reader of this. */
  function notice(reason) {
    const box = node("div", "spc-card-notice");
    box.append(node("strong", "", t("cardRefused")), node("p", "", t(reason)));
    return box;
  }

  function place(root) {
    const anchor = insertionPoint();
    if (!anchor) return false;
    if (!root.isConnected) anchor.insertAdjacentElement("beforebegin", root);
    return true;
  }

  async function boot() {
    const owner = ownerId();
    const old = document.getElementById(ROOT_ID);
    const drop = () => old?.remove();
    if (!owner) return drop();

    const options = await settings();
    if (!options.enabled || !options.showProfileCards) return drop();

    const text = tagText();
    if (!text) return drop();
    const card = SteamProfilerTag.read(text, owner);
    if (!card) return drop();

    const root = old || frame();
    for (const stale of root.querySelectorAll(".spc-card-art, .spc-card-notice, .spc-card-lines")) {
      stale.remove();
    }

    if (card.refused) {
      /* Said only to the person who can act on it, which is the author of the
         tag looking at their own page. For anybody else the card is simply not
         drawn: a notice on a stranger's profile marks their page over a mistake
         they cannot fix and did not make. */
      if (SteamProfilerIdentity.detect(document) !== owner) return drop();
      root.append(notice(card.refused));
      return void place(root);
    }

    if (card.kind !== "text") {
      root.append(picture(card));
      return void place(root);
    }

    /* The Unicode chart is not an image, so it is fetched rather than pointed
       at - and it goes through the service worker, not from here. The
       Content-Security-Policy steamcommunity.com serves names a closed
       `connect-src` that does not include this service, so a fetch from the
       page's own context would be refused; the worker is not subject to the
       page's policy. */
    if (!place(root)) return;
    try {
      const response = await message({ type: "SP_GET_CARD_TEXT", href: card.href });
      if (!response?.ok) throw new Error(response?.error || "Request failed");
      if (!root.isConnected) return;
      root.append(node("pre", "spc-card-lines", response.data));
    } catch {
      drop();
    }
  }

  chrome.storage.onChanged.addListener((_changes, area) => {
    if (area === "sync") boot();
  });
  boot();
})();
