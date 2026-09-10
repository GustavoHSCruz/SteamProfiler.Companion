import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import vm from "node:vm";

/* src/tag.js is a plain script for the same reason src/identity.js is - a
   content script cannot import a module - so it is loaded the way the browser
   loads it and the object it leaves behind is what these tests hold. */
const context = { URL };
vm.createContext(context);
vm.runInContext(readFileSync(join(import.meta.dirname, "..", "src/tag.js"), "utf8"), context);
const tag = context.SteamProfilerTag;

const OWNER = "76561198000000000";
const OTHER = "76561198999999999";
const card = (query = "") => `[!stpf=url=https://steamprofiler.org/bars.svg${query}]`;

test("a tag is read out of the text around it", () => {
  const bio = `hey\n${card("?theme=steam")}\nthanks for reading`;
  const read = tag.read(bio, OWNER);
  assert.equal(read.kind, "bars");
  assert.equal(new URL(read.href).searchParams.get("theme"), "steam");
});

test("nothing is drawn for text with no tag in it", () => {
  assert.equal(tag.read("just a normal profile", OWNER), null);
});

test("only our own origin is accepted", () => {
  for (const origin of [
    "https://example.com",
    // The two that a "contains steamprofiler.org" check would let through, and
    // both of them are somebody else's server.
    "https://steamprofiler.org.example.com",
    "https://example.com/?x=steamprofiler.org",
    // http is not https, and a downgrade is a request in the clear.
    "http://steamprofiler.org",
  ]) {
    assert.equal(tag.parse(`${origin}/bars.svg?q=x`), null, origin);
  }
  assert.equal(tag.parse("https://steamprofiler.org/bars.svg").kind, "bars");
});

test("only the endpoints that draw a card are accepted", () => {
  assert.equal(tag.parse("https://steamprofiler.org/api/companion"), null);
  assert.equal(tag.parse("https://steamprofiler.org/"), null);
  for (const [path, kind] of Object.entries(tag.KINDS)) {
    assert.equal(tag.parse(`https://steamprofiler.org${path}`).kind, kind);
  }
});

test("the card belongs to the profile it is drawn on", () => {
  // A tag naming somebody else would otherwise put their figures, and their
  // name in the signature, on the page of whoever pasted it.
  const read = tag.read(card(`?q=${OTHER}`), OWNER);
  assert.equal(new URL(read.href).searchParams.get("q"), OWNER);
});

test("typed text is dropped before the request is made", () => {
  const read = tag.read(card("?sign=cs.money&label=cs.money&theme=light"), OWNER);
  const params = new URL(read.href).searchParams;
  assert.equal(params.has("sign"), false);
  assert.equal(params.has("label"), false);
  // Everything that is not typed text is passed through untouched: the server
  // is what decides which values are valid, so a theme added there needs no
  // release here.
  assert.equal(params.get("theme"), "light");
});

test("a card can still be asked for no signature at all", () => {
  // `sign=none` is an off switch and not typed text: it draws nothing, so it is
  // the one spelling of this parameter that is passed on rather than dropped.
  for (const written of ["none", "NONE", " None "]) {
    const read = tag.read(card(`?sign=${encodeURIComponent(written)}`), OWNER);
    assert.equal(new URL(read.href).searchParams.get("sign"), "none", written);
  }
  // Anything else in the same field is still text, and still goes.
  assert.equal(
    new URL(tag.read(card("?sign=nonetheless"), OWNER).href).searchParams.has("sign"),
    false,
  );
});

test("the second profile on a versus card survives", () => {
  const read = tag.read(`[!stpf=url=https://steamprofiler.org/versus.svg?vs=gaben]`, OWNER);
  assert.equal(read.kind, "versus");
  assert.equal(new URL(read.href).searchParams.get("vs"), "gaben");
});

test("the request says it is going inside Steam", () => {
  assert.equal(new URL(tag.read(card(), OWNER).href).searchParams.get("in"), "steam");
  // And it cannot be talked out of it by the tag.
  assert.equal(new URL(tag.read(card("?in=web"), OWNER).href).searchParams.get("in"), "steam");
});

test("a badge with a custom label is reported as refused", () => {
  const read = tag.read(`[!stpf=url=https://steamprofiler.org/badge.svg?label=cs.money]`, OWNER);
  assert.equal(read.refused, "cardLabel");
  // A badge without one is an ordinary badge.
  assert.equal(tag.read(`[!stpf=url=https://steamprofiler.org/badge.svg]`, OWNER).refused, null);
  // And the same parameter on a card that has no custom label is not a refusal,
  // it is just a parameter the server will ignore.
  assert.equal(tag.read(card("?label=x"), OWNER).refused, null);
});

test("a profile with no usable id draws nothing", () => {
  for (const owner of ["", null, "gaben", "123", "7656119800000000000"]) {
    assert.equal(tag.read(card(), owner), null, String(owner));
  }
});

test("a tag that is not a URL at all is ignored", () => {
  assert.equal(tag.read("[!stpf=url=notaurl]", OWNER), null);
  assert.equal(tag.read("[!stpf=url=javascript:alert(1)]", OWNER), null);
  assert.equal(tag.read("[!stpf=url=data:text/html,x]", OWNER), null);
});
