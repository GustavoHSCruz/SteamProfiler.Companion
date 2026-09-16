/* The pictures each extension store asks for before it will list anything.
 *
 * They are drawn here rather than in an image editor for the same reason the
 * site draws its own embeds: the palette, the fonts and the mark are already
 * written down, and a tile made by hand drifts from them the first time one of
 * the three changes. Every colour below is a variable out of the site's
 * style.css and the mark is the same three rectangles as favicon.svg.
 *
 * The fonts are not in this repository. They belong to the front end, which is
 * where they are already served from, and a copy here would be a second set of
 * font binaries to keep current and to license. FONT_DIR points at that
 * checkout and can be overridden:
 *
 *     node store/make.mjs
 *     FONT_DIR=/somewhere/else/site/fonts node store/make.mjs
 *
 * The output is committed, so a submission does not depend on having the front
 * end checked out beside this.
 *
 * Chrome does the rasterising because the fonts are woff2 and it is the one
 * thing on the machine that is certain to read them. --force-device-scale-
 * factor=1 matters: the stores reject anything that is not exactly the size
 * they asked for, and a HiDPI screen otherwise doubles it.
 */
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const out = join(root, "store");
const work = join(out, ".work");
const FONT_DIR = process.env.FONT_DIR
  ?? resolve(root, "..", "steamprofiler-front", "site", "fonts");

const CHROME = process.env.CHROME ?? "google-chrome-stable";

/* style.css, verbatim. */
const bg = "#0b0a0e";
const panel = "#131219";
const line = "#282631";
const text = "#eeecf3";
const dim = "#8e8a9b";
const accent = "#ffb454";
const accentD = "#c97f22";
const line2 = "#4a4458";

function font(file, family, weight) {
  const data = readFileSync(join(FONT_DIR, file)).toString("base64");
  return `@font-face{font-family:'${family}';font-weight:${weight};font-style:normal;`
    + `src:url(data:font/woff2;base64,${data}) format('woff2');}`;
}

const fonts = [
  font("bricolage-grotesque-800.woff2", "Bricolage Grotesque", 800),
  font("archivo-500.woff2", "Archivo", 500),
  font("ibm-plex-mono-500.woff2", "IBM Plex Mono", 500),
].join("");

/* The mark: the library as area, one rectangle per game, the most played one
   taking the room it earned. Same proportions as favicon.svg, at any size. */
function mark(size) {
  const u = size / 48;
  const rect = (x, y, w, h, fill) =>
    `<rect x="${x * u}" y="${y * u}" width="${w * u}" height="${h * u}" fill="${fill}"/>`;
  return `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">`
    + rect(0, 0, 20, 36, accent)
    + rect(22, 0, 14, 20, accentD)
    + rect(22, 22, 14, 14, line2)
    + `</svg>`;
}

/* The same idea as a whole wall of it, for the wide pictures: a library with
   more than three games in it. Deterministic, because a tile that changes
   every time it is built is a tile nobody can review. */
function wall(width, height) {
  const boxes = [
    [0, 0, 46, 58, accent], [48, 0, 30, 34, accentD], [48, 36, 30, 22, line2],
    [80, 0, 20, 22, panel], [80, 24, 20, 34, line], [0, 60, 28, 40, accentD],
    [30, 60, 26, 26, line2], [30, 88, 26, 12, panel], [58, 60, 42, 24, line],
    [58, 86, 20, 14, line2], [80, 86, 20, 14, panel],
  ];
  const body = boxes.map(([x, y, w, h, fill]) =>
    `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="1.2" fill="${fill}"/>`).join("");
  return `<svg width="${width}" height="${height}" viewBox="0 0 100 100"`
    + ` preserveAspectRatio="none">${body}</svg>`;
}

function page(width, height, body, extra = "") {
  return `<!doctype html><meta charset="utf-8"><style>${fonts}
*{margin:0;padding:0;box-sizing:border-box}
html,body{width:${width}px;height:${height}px;background:${bg};overflow:hidden}
body{display:flex;color:${text};-webkit-font-smoothing:antialiased}
.word{font-family:'Bricolage Grotesque',sans-serif;font-weight:800;
  letter-spacing:-0.035em;line-height:0.94}
.label{font-family:'IBM Plex Mono',monospace;font-weight:500;
  letter-spacing:0.16em;text-transform:uppercase;color:${accent}}
.say{font-family:'Archivo',system-ui,sans-serif;font-weight:500;color:${dim}}
svg{display:block}
${extra}</style>${body}`;
}

function shoot(name, width, height, html) {
  const file = join(work, `${name}.html`);
  writeFileSync(file, html);
  execFileSync(CHROME, [
    "--headless", "--disable-gpu", "--no-sandbox", "--hide-scrollbars",
    "--force-device-scale-factor=1",
    `--window-size=${width},${height}`,
    `--screenshot=${join(out, `${name}.png`)}`,
    file,
  ], { stdio: ["ignore", "ignore", "pipe"] });
  console.log(`store: ${name}.png ${width}x${height}`);
}

rmSync(work, { recursive: true, force: true });
mkdirSync(work, { recursive: true });

/* Chrome Web Store, small promotional tile. It is shown at 440x280 and also
   shrunk into a row of other extensions, so the name has to survive being
   small and nothing hangs on the strapline being readable. */
shoot("chrome-tile-440x280", 440, 280, page(440, 280, `
<main style="padding:34px 36px;display:flex;flex-direction:column;
             justify-content:space-between;width:100%">
  <div style="display:flex;align-items:center;gap:16px">
    ${mark(52)}
    <div class="label" style="font-size:13px">Companion</div>
  </div>
  <div>
    <div class="word" style="font-size:52px">SteamProfiler</div>
    <div class="say" style="font-size:16px;margin-top:12px">
      The numbers, on the store page.</div>
  </div>
</main>`));

/* Chrome Web Store, marquee. Only used if the listing is ever featured, and
   the one place there is room for the wall. */
shoot("chrome-marquee-1400x560", 1400, 560, page(1400, 560, `
<main style="display:flex;width:100%;align-items:stretch">
  <div style="flex:1;padding:84px 0 84px 96px;display:flex;
              flex-direction:column;justify-content:center;gap:28px">
    <div style="display:flex;align-items:center;gap:22px">
      ${mark(72)}
      <div class="label" style="font-size:19px">Companion</div>
    </div>
    <div class="word" style="font-size:118px">SteamProfiler</div>
    <div class="say" style="font-size:30px;max-width:22ch;line-height:1.35">
      Every game on the store, read against the library you already own.</div>
  </div>
  <div style="width:520px;position:relative">
    ${wall(520, 560)}
    <div style="position:absolute;inset:0;
                background:linear-gradient(90deg,${bg} 0%,transparent 42%)"></div>
  </div>
</main>`));

/* The lead picture of the carousel: the panel on its own, close enough to read
   a figure off, with one line saying what is being looked at. The panel itself
   is a photograph taken by store/shots.mjs and not a drawing of one, so this
   step only runs when that has been run at least once. The file is committed,
   so an ordinary rebuild of the tiles keeps working without a browser. */
const closeUp = join(out, "raw-panel.png");
if (existsSync(closeUp)) {
  const photo = readFileSync(closeUp).toString("base64");
  shoot("screenshot-panel-1280x800", 1280, 800, page(1280, 800, `
<main style="width:100%;padding:52px 64px;display:flex;flex-direction:column;
             justify-content:center;gap:34px">
  <div style="display:flex;align-items:center;gap:18px">
    ${mark(40)}
    <div class="word" style="font-size:30px">SteamProfiler</div>
    <div class="label" style="font-size:12px;margin-top:4px">Companion</div>
  </div>
  <div style="display:flex;gap:44px;align-items:center">
    <img src="data:image/png;base64,${photo}" style="width:720px;
         border-radius:10px;border:1px solid ${line}">
    <div style="flex:1;display:flex;flex-direction:column;gap:18px">
      <div class="word" style="font-size:44px">One panel,<br>under the<br>buy button.</div>
      <div class="say" style="font-size:19px;line-height:1.45">
        Players in the game right now, the newest reviews beside the whole
        history, and how long ago the studio last patched it.</div>
    </div>
  </div>
</main>`, `img{display:block}`));
}

/* Microsoft Edge Add-ons, store logo. Square, and put on light and dark
   surfaces both, so the site's own background travels with it. */
shoot("edge-logo-300x300", 300, 300, page(300, 300, `
<main style="width:100%;display:flex;align-items:center;justify-content:center">
  ${mark(168)}
</main>`));

rmSync(work, { recursive: true, force: true });
