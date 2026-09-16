/* The screenshots the stores ask for, taken of the extension actually running.
 *
 * Every store wants pictures of the thing working, and a picture of the panel
 * assembled in an image editor would be a drawing of a product rather than the
 * product. So this drives a real browser with the built extension loaded and
 * photographs the panel where it lands.
 *
 * It is not headless. Chrome will not load an unpacked extension in headless
 * mode, which is the whole reason this file exists instead of a flag on the
 * build. The window it opens is governed by the caller: see store/README.md
 * for the Hyprland rule that keeps it off the focused monitor.
 *
 *     google-chrome-stable --user-data-dir=<tmp> --remote-debugging-port=9333 \
 *       --load-extension=dist/<unpacked> --disable-extensions-except=<same> &
 *     node store/shots.mjs
 *
 * The clip is taken from the panel's own bounding box rather than from
 * coordinates typed in here, because Steam's page moves and a hard-coded crop
 * silently becomes a picture of the wrong half of it.
 */
import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const out = join(root, "store");
const PORT = process.env.CDP_PORT ?? "9333";

/* The store page to photograph. Portal 2 has no age gate, is free of regional
   surprises and is old enough that its figures are stable from one week to the
   next, which matters for a picture that sits in a listing for months. */
const TARGET = process.env.TARGET
  ?? "https://store.steampowered.com/app/620/Portal_2/";

const WIDTH = 1500;

let id = 0;
const pending = new Map();
let socket;

function send(method, params = {}, sessionId) {
  const message = { id: ++id, method, params };
  if (sessionId) message.sessionId = sessionId;
  return new Promise((ok, no) => {
    pending.set(message.id, { ok, no });
    socket.send(JSON.stringify(message));
  });
}

async function connect() {
  const list = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json();
  const page = list.find((t) => t.type === "page");
  if (!page) throw new Error("no page target: is the browser running?");
  socket = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise((ok, no) => {
    socket.addEventListener("open", ok, { once: true });
    socket.addEventListener("error", no, { once: true });
  });
  socket.addEventListener("message", (event) => {
    const frame = JSON.parse(event.data);
    if (frame.id == null) return;
    const seat = pending.get(frame.id);
    if (!seat) return;
    pending.delete(frame.id);
    frame.error ? seat.no(new Error(frame.error.message)) : seat.ok(frame.result);
  });
}

const sleep = (ms) => new Promise((ok) => setTimeout(ok, ms));

async function evaluate(expression) {
  const reply = await send("Runtime.evaluate", {
    expression, returnByValue: true, awaitPromise: true,
  });
  if (reply.exceptionDetails) throw new Error(reply.exceptionDetails.text);
  return reply.result.value;
}

/* Wait for the panel to be there and to have stopped saying it is loading.
   The class it carries while it waits for the api is the honest signal, and
   catching it mid-flight is how a listing ends up showing a spinner. */
async function settled(selector, tries = 60) {
  for (let i = 0; i < tries; i += 1) {
    const state = await evaluate(`(() => {
      const el = document.querySelector(${JSON.stringify(selector)});
      if (!el) return "absent";
      if (el.classList.contains("spc-loading")) return "loading";
      return el.getBoundingClientRect().height > 40 ? "ready" : "thin";
    })()`);
    if (state === "ready") return;
    await sleep(1000);
  }
  throw new Error(`${selector} never settled`);
}

async function shoot(name, selector, pad = 24) {
  const box = await evaluate(`(() => {
    const el = document.querySelector(${JSON.stringify(selector)});
    const r = el.getBoundingClientRect();
    return { x: r.x + scrollX, y: r.y + scrollY, w: r.width, h: r.height };
  })()`);
  const clip = {
    x: Math.max(0, box.x - pad), y: Math.max(0, box.y - pad),
    width: box.w + pad * 2, height: box.h + pad * 2, scale: 1,
  };
  const shot = await send("Page.captureScreenshot", {
    format: "png", clip, captureBeyondViewport: true,
  });
  const file = join(out, `${name}.png`);
  writeFileSync(file, Buffer.from(shot.data, "base64"));
  console.log(`shot: ${name}.png ${Math.round(clip.width)}x${Math.round(clip.height)}`);
  return file;
}

/* The size every store accepts, and the one this takes straight out of the
   browser: a screenshot of the panel where it actually sits is worth more to
   somebody deciding whether to install than the same panel on a backdrop. */
const SHOT = { width: 1280, height: 800 };

mkdirSync(out, { recursive: true });
await connect();
await send("Page.enable");
await send("Runtime.enable");
/* A scrollbar down the edge of a store picture is furniture of the machine it
   was taken on, and it dates the picture the day the platform restyles it. */
await send("Emulation.setScrollbarsHidden", { hidden: true });
await send("Emulation.setDeviceMetricsOverride", {
  width: WIDTH, height: 1200, deviceScaleFactor: 1, mobile: false,
});
await send("Page.navigate", { url: TARGET });
await sleep(4000);
await settled(".spc-panel");
await sleep(1500);

/* The close-up, for the framed picture: the panel and nothing else. */
await shoot("raw-panel", ".spc-panel");

/* The panel in its page, at the store's own picture size. The viewport is set
   to the size the file has to be, the panel is put in the middle of it, and
   what comes back needs no cropping and no scaling. Scrolling is done in one
   jump with the page's smooth behaviour disabled, because a screenshot taken
   during an animated scroll is a screenshot of a blur. */
await send("Emulation.setDeviceMetricsOverride", {
  ...SHOT, deviceScaleFactor: 1, mobile: false,
});
await sleep(1200);
await evaluate(`(() => {
  document.documentElement.style.scrollBehavior = "auto";
  const el = document.querySelector(".spc-panel");
  const r = el.getBoundingClientRect();
  scrollTo(0, r.top + scrollY - Math.max(0, (${SHOT.height} - r.height) / 2));
})()`);
await sleep(2500);
const inPage = await send("Page.captureScreenshot", { format: "png" });
writeFileSync(join(out, "screenshot-in-page-1280x800.png"),
  Buffer.from(inPage.data, "base64"));
console.log(`shot: screenshot-in-page-1280x800.png ${SHOT.width}x${SHOT.height}`);

/* The settings, which is the picture a reviewer looks for and the one that
   answers "what is this going to do to my browser" before the install. It
   opens in a tab rather than a bubble, so it photographs at the store's size
   like any other page. The address comes from the running extension, because
   an unpacked id is derived from its path and changes with the directory. */
const targets = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json();
const worker = targets.find((t) => t.url.startsWith("chrome-extension://")
  && t.url.endsWith("/src/background.js"));
if (worker) {
  const id = new URL(worker.url).host;
  await send("Page.navigate", { url: `chrome-extension://${id}/pages/options.html` });
  await sleep(2500);
  const options = await send("Page.captureScreenshot", { format: "png" });
  writeFileSync(join(out, "screenshot-settings-1280x800.png"),
    Buffer.from(options.data, "base64"));
  console.log(`shot: screenshot-settings-1280x800.png ${SHOT.width}x${SHOT.height}`);
} else {
  console.log("shot: settings skipped, the extension worker was asleep");
}

console.log("shots: done");
socket.close();
