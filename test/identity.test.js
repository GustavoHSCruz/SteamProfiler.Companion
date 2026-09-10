import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import vm from "node:vm";

/* src/identity.js is a plain script, because a content script cannot import a
   module, so it is loaded the same way the browser loads it and the object it
   leaves behind is what these tests hold. */
const context = {};
vm.createContext(context);
vm.runInContext(readFileSync(join(import.meta.dirname, "..", "src/identity.js"), "utf8"), context);
const identity = context.SteamProfilerIdentity;

/** The smallest document that answers the three selectors detect() asks for. */
function page({ scripts = [], headerLinks = [], headerMinis = [], strangers = [] } = {}) {
  return {
    querySelectorAll(selector) {
      if (selector.includes("script")) return scripts.map((text) => ({ textContent: text }));
      if (selector.includes("profiles")) return headerLinks.map((href) => ({ href }));
      if (selector.includes("data-miniprofile")) {
        return headerMinis.map((id) => ({ getAttribute: () => id }));
      }
      // Anything the code does not ask for cannot reach it, which is the point:
      // `strangers` is here to be ignored.
      return strangers.length ? [] : [];
    },
  };
}

const OWN = "76561198000000973";
const OWN_ACCOUNT = String(BigInt(OWN) - 76561197960265728n);

test("an account id becomes the 64-bit id the API takes", () => {
  assert.equal(identity.fromAccountId("1"), "76561197960265729");
  assert.equal(identity.fromAccountId(OWN_ACCOUNT), OWN);
  assert.equal(identity.fromAccountId("0"), null);
  assert.equal(identity.fromAccountId(""), null);
  assert.equal(identity.fromAccountId("nope"), null);
});

test("the signed-in account id is read out of an inline script", () => {
  assert.equal(identity.accountIdInText(`var g_AccountID = ${OWN_ACCOUNT};`), OWN_ACCOUNT);
  assert.equal(identity.accountIdInText("g_AccountID  =  7 ;"), "7", "Steam's own spacing varies");
  assert.equal(identity.accountIdInText("g_AccountIDX = 5;"), null);
  assert.equal(identity.accountIdInText("g_steamID = false;"), null);
});

test("a typed SteamID wins over everything on the page", () => {
  const doc = page({ scripts: [`g_AccountID = ${OWN_ACCOUNT};`] });
  assert.equal(identity.detect(doc, "76561197960287930"), "76561197960287930");
  assert.equal(identity.detect(doc, " 76561197960287930 "), "76561197960287930");
  assert.equal(identity.detect(doc, "gordziilla"), OWN, "a name is not an id, so the page wins");
});

test("a page whose header only has a custom URL still finds its reader", () => {
  // The 0.2.0 failure: Steam links an account with a custom URL as /id/<name>,
  // there is no /profiles/<id> anywhere in the header, and g_steamID is gone.
  const doc = page({ scripts: ["var g_sessionID = \"x\";", `g_AccountID = ${OWN_ACCOUNT}; g_bLoggedIn = true;`] });
  assert.equal(identity.detect(doc, ""), OWN);
});

test("the header is used when the page scripts say nothing", () => {
  assert.equal(identity.detect(page({ headerLinks: [`https://steamcommunity.com/profiles/${OWN}/`] }), ""), OWN);
  assert.equal(identity.detect(page({ headerMinis: [OWN_ACCOUNT] }), ""), OWN);
});

test("nobody is found on a page with nobody signed in", () => {
  assert.equal(identity.detect(page({ scripts: ["g_AccountID = 0;", "g_steamID = false;"] }), ""), null);
  assert.equal(identity.detect(page(), ""), null);
  assert.equal(identity.detect(null, ""), null);
});

test("only the header selectors are ever asked for", () => {
  // The guarantee that matters: a store page carries other people's profile
  // links and miniprofile ids, and detect() must never reach for them. If a
  // future edit widens a selector, this fails.
  const asked = [];
  const doc = {
    querySelectorAll(selector) { asked.push(selector); return []; },
  };
  identity.detect(doc, "");
  const scoped = asked.filter((selector) => selector.includes("profiles")
    || selector.includes("data-miniprofile"));
  assert.equal(scoped.length, 2);
  for (const selector of scoped) {
    for (const part of selector.split(", ")) {
      assert.match(part, /^#global_(actions|header) /,
        `"${part}" reaches outside the site header`);
    }
  }
});
