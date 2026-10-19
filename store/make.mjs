/* The pictures each extension store asks for before it will list anything.
 *
 * They are composed here rather than in an image editor so the dimensions,
 * typography, product captures and copy stay reproducible. The atmospheric
 * plates live in store/art; the palette, fonts and mark still come from the
 * product, and the screenshots remain captures of the real extension.
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

function png(file) {
  return `data:image/png;base64,${readFileSync(file).toString("base64")}`;
}

const promoArt = png(join(out, "art", "library-data-wide.png"));
const stageArt = png(join(out, "art", "library-data-stage.png"));
const capture = (name) => join(out, "captures", name);

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
.art{position:absolute;inset:0;width:100%;height:100%;object-fit:cover}
.eyebrow{font-family:'IBM Plex Mono',monospace;font-weight:500;
  letter-spacing:.14em;text-transform:uppercase;color:${accent}}
.frame{overflow:hidden;border:1px solid rgba(255,180,84,.34);
  box-shadow:0 30px 80px rgba(0,0,0,.55),0 0 0 1px rgba(255,255,255,.035) inset}
svg{display:block}
${extra}</style>${body}`;
}

function shoot(name, width, height, html) {
  const file = join(work, `${name}.html`);
  writeFileSync(file, html);
  execFileSync(CHROME, [
    "--headless", "--disable-gpu", "--no-sandbox", "--hide-scrollbars", "--no-first-run",
    `--user-data-dir=${join(work, "chrome-profile")}`,
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
<main style="position:relative;width:100%;height:100%;overflow:hidden">
  <img class="art" src="${promoArt}" style="object-position:58% center">
  <div style="position:absolute;inset:0;background:
    linear-gradient(90deg,rgba(11,10,14,.99) 0%,rgba(11,10,14,.93) 47%,rgba(11,10,14,.2) 100%),
    linear-gradient(0deg,rgba(11,10,14,.72),transparent 48%)"></div>
  <div style="position:absolute;inset:0;padding:26px 28px;display:flex;
              flex-direction:column;justify-content:space-between">
    <div style="display:flex;align-items:center;gap:12px">
      ${mark(36)}
      <div>
        <div class="word" style="font-size:17px;letter-spacing:-.02em">SteamProfiler</div>
        <div class="eyebrow" style="font-size:7px;margin-top:3px">Companion</div>
      </div>
    </div>
    <div style="max-width:300px">
      <div class="word" style="font-size:42px">Know the game.</div>
      <div class="say" style="font-size:14px;line-height:1.4;margin-top:10px;color:#c7c2cf">
        Live players, review pulse and updates. Right on the store page.</div>
    </div>
  </div>
</main>`));

/* Chrome Web Store, marquee. Only used if the listing is ever featured, and
   the one place there is room for the wall. */
shoot("chrome-marquee-1400x560", 1400, 560, page(1400, 560, `
<main style="position:relative;width:100%;height:100%;overflow:hidden">
  <img class="art" src="${promoArt}">
  <div style="position:absolute;inset:0;background:
    linear-gradient(90deg,rgba(11,10,14,1) 0%,rgba(11,10,14,.97) 35%,rgba(11,10,14,.58) 58%,rgba(11,10,14,.06) 100%),
    linear-gradient(0deg,rgba(11,10,14,.44),transparent 52%)"></div>
  <div style="position:absolute;left:76px;top:58px;bottom:58px;width:660px;
              display:flex;flex-direction:column;justify-content:space-between">
    <div style="display:flex;align-items:center;gap:16px">
      ${mark(48)}
      <div>
        <div class="word" style="font-size:27px;letter-spacing:-.02em">SteamProfiler</div>
        <div class="eyebrow" style="font-size:10px;margin-top:5px">Companion</div>
      </div>
    </div>
    <div>
      <div class="word" style="font-size:77px;line-height:.93">Know the game<br>before you buy it.</div>
      <div class="say" style="font-size:20px;line-height:1.45;margin-top:22px;
                  max-width:540px;color:#c7c2cf">
        Live players, review momentum and update history. All on the store page.</div>
    </div>
    <div style="display:flex;gap:10px">
      <span class="eyebrow" style="font-size:9px;padding:8px 11px;border:1px solid ${line2};background:rgba(19,18,25,.72)">Live players</span>
      <span class="eyebrow" style="font-size:9px;padding:8px 11px;border:1px solid ${line2};background:rgba(19,18,25,.72)">Review pulse</span>
      <span class="eyebrow" style="font-size:9px;padding:8px 11px;border:1px solid ${line2};background:rgba(19,18,25,.72)">Last update</span>
    </div>
  </div>
</main>`));

/* The lead picture of the carousel: the panel on its own, close enough to read
   a figure off, with one line saying what is being looked at. The panel itself
   is a photograph taken by store/shots.mjs and not a drawing of one, so this
   step only runs when that has been run at least once. The file is committed,
   so an ordinary rebuild of the tiles keeps working without a browser. */
const closeUp = capture("raw-panel.png");
if (existsSync(closeUp)) {
  const photo = png(closeUp);
  shoot("screenshot-panel-1280x800", 1280, 800, page(1280, 800, `
<main style="position:relative;width:100%;height:100%;overflow:hidden">
  <img class="art" src="${stageArt}">
  <div style="position:absolute;inset:0;background:
    linear-gradient(90deg,rgba(11,10,14,.44),rgba(11,10,14,.12) 62%,rgba(11,10,14,.32)),
    linear-gradient(0deg,rgba(11,10,14,.9),transparent 43%)"></div>
  <div style="position:absolute;left:48px;top:42px;display:flex;align-items:center;gap:13px">
    ${mark(34)}
    <div class="word" style="font-size:23px">SteamProfiler</div>
    <div class="eyebrow" style="font-size:9px;margin-left:4px">Companion</div>
  </div>
  <div class="frame" style="position:absolute;left:48px;top:126px;width:690px;
       border-radius:14px;background:${panel};padding:12px">
    <img src="${photo}" style="display:block;width:100%;border-radius:7px">
  </div>
  <div style="position:absolute;left:790px;right:52px;top:168px;padding:30px 30px 32px;
              border-left:2px solid ${accent};background:rgba(11,10,14,.76);
              box-shadow:0 22px 60px rgba(0,0,0,.35);backdrop-filter:blur(10px)">
    <div class="eyebrow" style="font-size:10px">One compact panel</div>
    <div class="word" style="font-size:48px;line-height:.98;margin-top:17px">
      The signals<br>that matter.</div>
    <div class="say" style="font-size:17px;line-height:1.48;margin-top:20px;color:#c7c2cf">
      Live players, review momentum, release date and official activity, all without leaving Steam.</div>
    <div style="height:1px;background:${line2};margin:24px 0 19px"></div>
    <div class="say" style="font-size:13px;line-height:1.5;color:#a7a2b0">
      Your hours and achievements stay off until you choose to enable them.</div>
  </div>
</main>`, `img{display:block}`));
}

/* The next two slides keep the browser captures completely intact. The new
   treatment is only a frame and caption around the real product. */
const inPage = capture("screenshot-in-page-1280x800.png");
if (existsSync(inPage)) {
  shoot("screenshot-in-page-1280x800", 1280, 800, page(1280, 800, `
<main style="position:relative;width:100%;height:100%;overflow:hidden">
  <img class="art" src="${stageArt}" style="filter:brightness(.58);transform:scale(1.04)">
  <div style="position:absolute;inset:0;background:rgba(11,10,14,.42)"></div>
  <div style="position:absolute;left:72px;right:72px;top:30px;display:flex;
              align-items:end;justify-content:space-between">
    <div class="word" style="font-size:35px">Right where you already shop.</div>
    <div class="eyebrow" style="font-size:9px;margin-bottom:5px">The real Steam page</div>
  </div>
  <div class="frame" style="position:absolute;left:72px;right:72px;top:92px;
              height:690px;border-radius:12px;background:${panel};padding:8px">
    <img src="${png(inPage)}" style="display:block;width:100%;height:100%;object-fit:contain;
         background:${bg};border-radius:6px">
  </div>
</main>`, `img{display:block}`));
}

const settings = capture("screenshot-settings-1280x800.png");
if (existsSync(settings)) {
  shoot("screenshot-settings-1280x800", 1280, 800, page(1280, 800, `
<main style="position:relative;width:100%;height:100%;overflow:hidden">
  <img class="art" src="${stageArt}" style="filter:brightness(.5);transform:scale(1.04)">
  <div style="position:absolute;inset:0;background:rgba(11,10,14,.5)"></div>
  <div style="position:absolute;left:72px;right:72px;top:30px;display:flex;
              align-items:end;justify-content:space-between">
    <div class="word" style="font-size:35px">Private by default. Yours by choice.</div>
    <div class="eyebrow" style="font-size:9px;margin-bottom:5px">Clear, local settings</div>
  </div>
  <div class="frame" style="position:absolute;left:72px;right:72px;top:92px;
              height:690px;border-radius:12px;background:${panel};padding:8px">
    <img src="${png(settings)}" style="display:block;width:100%;height:100%;object-fit:contain;
         background:${bg};border-radius:6px">
  </div>
</main>`, `img{display:block}`));
}

/* Microsoft Edge Add-ons, store logo. Square, and put on light and dark
   surfaces both, so the site's own background travels with it. */
shoot("edge-logo-300x300", 300, 300, page(300, 300, `
<main style="position:relative;width:100%;height:100%;display:flex;
             align-items:center;justify-content:center;overflow:hidden">
  <img class="art" src="${promoArt}" style="object-position:72% center;filter:brightness(.48)">
  <div style="position:absolute;inset:0;background:radial-gradient(circle at 50% 46%,
              rgba(255,180,84,.16),rgba(11,10,14,.72) 58%,rgba(11,10,14,.96))"></div>
  <div style="position:relative;width:218px;height:218px;border-radius:48px;
              display:flex;align-items:center;justify-content:center;
              background:rgba(11,10,14,.9);border:1px solid rgba(255,180,84,.38);
              box-shadow:0 26px 70px rgba(0,0,0,.62),0 0 42px rgba(255,180,84,.1)">
    ${mark(126)}
  </div>
</main>`));

rmSync(work, { recursive: true, force: true });
