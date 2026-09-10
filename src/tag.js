/* The tag somebody puts on their own Steam profile, and the one URL it is
   allowed to turn into.

   Like src/identity.js this is a plain script rather than a module, because a
   content script cannot import one, and like identity.js it is kept out of the
   drawing code on purpose: everything here is a pure function over a string, so
   it can be tested without a browser, and the rule that matters lives in one
   place instead of being spread through the code that builds the panel.

   The tag names a URL. That URL may only ever be one of ours.

   The reason is not tidiness. If the extension fetched whatever address the
   profile named, then every visitor's browser would open a connection to a
   server the profile's owner controls, and the owner's access log would become
   a list of who read their profile: address, time, browser, on every visit. A
   picture does not have to do anything to report that - arriving is the event,
   which is what a tracking pixel in an email is. Pointing only at
   steamprofiler.org means the only machine that ever hears about the visit is
   ours, which already serves the page they were on.

   The comparison is therefore `url.origin ===` and never "contains", because
   `https://steamprofiler.org.example.com` and
   `https://example.com/?x=steamprofiler.org` both contain the name and neither
   is us.

   The other half is what the query may say. `q` decides whose figures the card
   draws, and it is overwritten here with the profile actually being looked at:
   a tag is written by the owner of the page it sits on, so a card on that page
   is that person's card, and not a way to put somebody else's name and hours
   on your own profile. `label` and `sign` are the two parameters a person can
   type free text into, and they are dropped: inside Steam the only words on a
   card should be words Steam is already printing on the same page. */
var SteamProfilerTag = (() => {
  "use strict";

  const ORIGIN = "https://steamprofiler.org";
  /* Under /api/, which is where nginx publishes them: the handler inside sees
     /bars.svg because `location /api/` strips the prefix on the way through,
     but nothing outside the server ever gets to use the short form. */
  const KINDS = Object.freeze({
    "/api/bars.svg": "bars",
    "/api/banner.svg": "banner",
    "/api/badge.svg": "badge",
    "/api/artwork.svg": "artwork",
    "/api/versus.svg": "versus",
    "/api/bars.txt": "text",
  });
  /* Braces rather than square brackets, and forgiving about whitespace.

     Steam's About Me and info box are parsed as BBCode, and BBCode owns the
     square bracket. It does not recognise `[!stpf=...]`, and what it does with
     something it does not recognise is neutralise it by padding: what somebody
     pastes as `[!stpf=url=...]` is stored and drawn as `[ !stpf=url=... ]`.
     The marker survives, which is the thing that had to be true, but it comes
     back wearing spaces it was not given.

     So the tag moved to braces, which BBCode has no claim on. The `\s*` on both
     sides is the part that matters more, though: it is what keeps this working
     if Steam decides to pad braces too, or pads them tomorrow, and it costs two
     characters. The square form is still read, because it is what the first
     people to try this pasted and there is no reason to break them. */
  const TAG = /[[{]\s*!stpf=url=([^\s\]}]+)\s*[\]}]/i;
  const STEAMID64 = /^7656119\d{10}$/;
  /* The two parameters that carry text somebody typed. */
  const TYPED = ["label", "sign"];
  /* Except for this one word. `sign=none` is an off switch and not a piece of
     writing: it draws nothing, so there is nothing in it to publish, and
     stripping it with the rest would have meant a card on a profile could never
     be unsigned. It is passed on in one spelling so that what the extension
     sends does not depend on how somebody happened to capitalise it. */
  const NO_SIGN = "none";

  /** The raw URL out of a piece of profile text, or null. */
  function find(text) {
    const match = String(text ?? "").match(TAG);
    return match ? match[1] : null;
  }

  /** One of our embed URLs as `{ kind, url }`, or null for anything else. */
  function parse(raw) {
    let url;
    try {
      url = new URL(String(raw ?? "").trim());
    } catch {
      return null;
    }
    if (url.origin !== ORIGIN) return null;
    const kind = KINDS[url.pathname];
    return kind ? { kind, url } : null;
  }

  /** What to draw for one profile, or null when there is nothing to draw.
   *
   *  `refused` is the reason this card cannot appear as written. It is returned
   *  rather than thrown because the caller has to decide who is told: the
   *  person who wrote the tag is the only one who can fix it, and printing it
   *  for every other visitor would mark somebody's profile over a mistake that
   *  is theirs to see. */
  function read(text, ownerId) {
    const owner = String(ownerId ?? "").trim();
    if (!STEAMID64.test(owner)) return null;
    const found = parse(find(text));
    if (!found) return null;

    const { kind, url } = found;
    const refused = kind === "badge" && url.searchParams.has("label")
      ? "cardLabel"
      : null;
    const unsigned = String(url.searchParams.get("sign") ?? "").trim()
      .toLowerCase() === NO_SIGN;
    for (const name of TYPED) url.searchParams.delete(name);
    if (unsigned) url.searchParams.set("sign", NO_SIGN);
    url.searchParams.set("q", owner);
    /* The server reads this and forces the mark on, takes the signature from
       the persona and refuses a custom label. The tag cannot opt out of it,
       because the extension is what writes the final string. */
    url.searchParams.set("in", "steam");
    return { kind, href: url.href, refused };
  }

  return { find, parse, read, KINDS, ORIGIN };
})();
