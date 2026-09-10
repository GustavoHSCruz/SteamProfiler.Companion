/* Who is reading the page, worked out from what Steam already printed on it.

   This lives outside content.js so it can be run without a browser, and it is a
   plain script rather than a module because a content script cannot import one:
   the manifest loads this file first and content.js uses the object it leaves
   behind in the isolated world.

   Steam used to print `g_steamID` into its pages and does not any more. What it
   still writes is `g_AccountID`, the 32-bit account id of whoever is signed in,
   and on a store page that is the one identifier which is certainly the
   reader's own. Everything else there belongs to other people: a single Portal
   2 page carries nine `data-miniprofile` ids and several
   `steamcommunity.com/profiles/` links, and they are reviewers, curators and
   friends. So those two are read only from inside the site header, where the
   only account named is the one signed in, and never from the page at large.
   Sending a stranger's id to our own API because it happened to be in the
   markup is the mistake this file exists to make impossible.

   The header link is not always usable either: an account with a custom URL is
   linked as `/id/<name>`, which is a name and not an id, and that is why the
   first release found nobody - it looked for `/profiles/<id>` and the only
   people with one of those are the accounts that never set a custom URL. */
var SteamProfilerIdentity = (() => {
  "use strict";

  const STEAMID64 = /^7656119\d{10}$/;
  const ACCOUNT_ID = /^[1-9]\d{0,9}$/;
  const IN_SCRIPT = /g_AccountID\s*=\s*(\d{1,10})/;
  const HEADER = "#global_actions, #global_header";
  const ACCOUNT_BASE = 76561197960265728n;

  /** A 32-bit account id as the 64-bit id the API takes, or null. */
  function fromAccountId(value) {
    const raw = String(value ?? "").trim();
    if (!ACCOUNT_ID.test(raw)) return null;
    const id = (ACCOUNT_BASE + BigInt(raw)).toString();
    return STEAMID64.test(id) ? id : null;
  }

  /** The signed-in account id out of one inline script, read as text. Nothing
   *  here is executed and nothing is injected into the page. */
  function accountIdInText(text) {
    const match = String(text ?? "").match(IN_SCRIPT);
    return match ? match[1] : null;
  }

  function detect(doc, manual) {
    const typed = String(manual ?? "").trim();
    if (STEAMID64.test(typed)) return typed;
    if (!doc) return null;

    for (const script of doc.querySelectorAll("script:not([src])")) {
      const own = fromAccountId(accountIdInText(script.textContent));
      if (own) return own;
    }

    for (const link of doc.querySelectorAll(
      `${HEADER.split(", ").map((scope) => `${scope} a[href*='steamcommunity.com/profiles/']`).join(", ")}`,
    )) {
      const match = String(link.href || "").match(/steamcommunity\.com\/profiles\/(7656119\d{10})/);
      if (match) return match[1];
    }

    for (const element of doc.querySelectorAll(
      HEADER.split(", ").map((scope) => `${scope} [data-miniprofile]`).join(", "),
    )) {
      const own = fromAccountId(element.getAttribute("data-miniprofile"));
      if (own) return own;
    }

    return null;
  }

  return { detect, fromAccountId, accountIdInText };
})();
