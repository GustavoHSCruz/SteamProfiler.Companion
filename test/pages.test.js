import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import vm from "node:vm";

/* The popup and the options page are plain scripts against `chrome` and the
   DOM, so there is nothing to import and nothing to mock a browser with - the
   extension has no dependencies and is not going to get a headless one for two
   files. What these tests do instead is run each file in a context holding the
   smallest `document` and `chrome` it actually touches, which is enough to ask
   the question that matters: does a switch stored as on come back drawn as on.

   That question shipped as "no" in 0.2.0. `Use my profile` was saved by a loop
   over every preference and restored by hand-written lines that covered two of
   the three, so it was on in storage and off on screen, and the next click on
   it turned it off. */

const root = join(import.meta.dirname, "..");

function checkbox(id) {
  return { id, type: "checkbox", checked: false, listeners: {},
           addEventListener(name, fn) { this.listeners[name] = fn; } };
}

function field(id, value = "") {
  return { id, type: "text", value, listeners: {},
           addEventListener(name, fn) { this.listeners[name] = fn; } };
}

/** Run one of the pages with the elements it expects and the stored settings
 *  it should be drawing from. Returns the elements and the writes it made. */
function run(file, elements, stored) {
  const writes = [];
  const changed = [];
  const context = {
    document: {
      documentElement: { lang: "" },
      activeElement: null,
      querySelectorAll: () => [],
      getElementById: (id) => elements[id] ?? null,
    },
    chrome: {
      i18n: { getUILanguage: () => "en-US", getMessage: (key) => key },
      runtime: { openOptionsPage() {} },
      tabs: { query: () => {} },
      storage: {
        sync: {
          get: (defaults, done) => done({ ...defaults, ...stored }),
          set: (patch, done) => { writes.push(patch); if (done) done(); },
        },
        onChanged: { addListener: (fn) => changed.push(fn) },
      },
    },
    setTimeout: () => 0,
    clearTimeout: () => {},
  };
  vm.createContext(context);
  vm.runInContext(readFileSync(join(root, file), "utf8"), context);
  return { elements, writes, context, notify: (patch, area = "sync") => {
    for (const fn of changed) fn(patch, area);
  } };
}

const popupElements = () => ({
  enabled: checkbox("enabled"),
  useProfile: checkbox("useProfile"),
  showTrailer: checkbox("showTrailer"),
  "game-link": { id: "game-link", classList: { remove() {} } },
  options: { id: "options", addEventListener() {} },
});

const optionsElements = () => ({
  enabled: checkbox("enabled"),
  showStats: checkbox("showStats"),
  useProfile: checkbox("useProfile"),
  steamId: field("steamId"),
  showTrailer: checkbox("showTrailer"),
  language: field("language", "auto"),
  saved: { id: "saved", textContent: "" },
});

test("the popup draws every stored switch, including the profile one", () => {
  const { elements } = run("pages/popup.js", popupElements(), { useProfile: true });
  assert.equal(elements.useProfile.checked, true);
  assert.equal(elements.enabled.checked, true);
});

test("the popup saves the switch it was just given", () => {
  const { elements, writes } = run("pages/popup.js", popupElements(), {});
  elements.useProfile.checked = true;
  elements.useProfile.listeners.change({ target: elements.useProfile });
  // Written inside the script's own context, so its prototype is that context's
  // Object and deepStrictEqual would fail on the prototype rather than the value.
  assert.equal(writes.length, 1);
  assert.equal(writes[0].useProfile, true);
});

test("a change made elsewhere reaches an open popup", () => {
  const { elements, notify } = run("pages/popup.js", popupElements(), {});
  notify({ useProfile: { newValue: true } });
  assert.equal(elements.useProfile.checked, true);
  notify({ useProfile: { newValue: false } }, "local");
  assert.equal(elements.useProfile.checked, true, "only the sync area counts");
});

test("the options page draws every stored preference", () => {
  const { elements } = run("pages/options.js", optionsElements(),
    { useProfile: true, steamId: "76561197960287930", language: "pt" });
  assert.equal(elements.useProfile.checked, true);
  assert.equal(elements.steamId.value, "76561197960287930");
  assert.equal(elements.language.value, "pt");
});

test("the options page does not overwrite the field being typed in", () => {
  const elements = optionsElements();
  const { notify, context } = run("pages/options.js", elements, {});
  elements.steamId.value = "7656119";
  context.document.activeElement = elements.steamId;
  notify({ steamId: { newValue: "" } });
  assert.equal(elements.steamId.value, "7656119");

  context.document.activeElement = null;
  notify({ steamId: { newValue: "76561197960287930" } });
  assert.equal(elements.steamId.value, "76561197960287930");
});
