# SteamProfiler Companion

SteamProfiler information where a Steam shopper can use it: directly on each
game's store page. It compares the latest and lifetime reviews, shows official game
activity, suggests who the game may suit and keeps the complete analysis one
click away. An opt-in panel can also show the viewer's hours and achievement
progress for that game.

On a Steam profile it draws the card that profile asked for. A tag in the
About Me or the info box, `[!stpf=url=https://steamprofiler.org/bars.svg?...]`,
names one of the site's own embeds, and the extension puts that picture on the
page. Steam itself cannot render it, so it appears only for readers who have
the extension. The tag may name no address other than steamprofiler.org, and
the card is always drawn for the profile it sits on.

The page for it on the site is <https://steamprofiler.org/extension>, which is
where a reader who is not going to clone a repository is sent.

The extension is deliberately small:

- Chrome and Firefox use the same Manifest V3 source tree.
- No framework, bundler, runtime dependency or remotely hosted code.
- It runs only on `https://store.steampowered.com/app/*` and on Steam
  profile pages, `https://steamcommunity.com/id/*` and `/profiles/*`.
- It asks only for `storage`, `activeTab` and access to the public
  `steamprofiler.org/api/*` endpoint.
- It never reads Steam cookies, credentials or browsing history. Personal
  progress is disabled by default and uses only a public SteamID after consent.

## Try it locally

Requires Node.js 22 or newer for checks; the extension itself has no Node
runtime.

```sh
npm run build
```

That produces both an unpacked directory and
`dist/steamprofiler-companion-0.2.3.zip`.

In Chrome, open `chrome://extensions`, enable Developer mode, choose **Load
unpacked**, and select the unpacked directory inside `dist/`. In Firefox, open
`about:debugging#/runtime/this-firefox`, choose **Load Temporary Add-on**, and
select its `manifest.json`.

Then visit a game such as
<https://store.steampowered.com/app/620/Portal_2/>. A SteamProfiler panel appears
below the purchase area. The toolbar popup can disable the panel or trailer;
the full options page also controls public metrics, catalogue language and the
optional personal game panel.

## Architecture

```text
Steam store page
  └─ content script: draws the isolated `spc-` panel
       └─ extension service worker: validates and caches requests
            └─ GET https://steamprofiler.org/api/companion?appid=…&l=…
            └─ optional GET /api/companion/profile?appid=…&id=…
```

The background boundary is intentional. Store-page JavaScript never receives
host permissions, and every API payload is validated before it reaches the
DOM. Outbound links are rebuilt from the numeric appid instead of trusted from
the response.

`GET /api/companion` is a versioned contract maintained by
[SteamProfiler.Api](https://github.com/GustavoHSCruz/SteamProfiler.Api). A cold
game may answer `pending`; the content script waits for the advertised cache
window and retries once. `absent` is distinct from a temporary network error.
The personal contract returns only this game's hours and compact achievement
progress. Its request always uses `credentials: omit`.

## Development

```sh
npm run check
npm test
npm run build
```

`npm run check` parses the manifest and locale files, checks every JavaScript
file, verifies every manifest asset exists and rejects remote scripts or
dynamic code. `npm test` exercises appid, URL, response validation and the
credential-free request contract, and runs the popup and the options page
against a stub `chrome` and DOM, so a preference that is stored and then drawn
in the wrong position fails here rather than in somebody's browser.

Source responsibilities:

- `src/content.js` and `src/content.css`: Steam page integration and trailer
  overlay.
- `src/identity.js`: who is reading the page, and why only the site header is
  trusted for anybody's id. Loaded before the content script, and a plain
  script rather than a module because a content script cannot import one.
- `src/background.js`: cross-origin requests, language choice and short cache.
- `src/api.js`: the testable versioned API adapter and trust boundary.
- `pages/`: toolbar popup and preferences.
- `_locales/`: English, Brazilian Portuguese and Russian copy.

## Privacy

The extension sends the Steam appid already present in the open page URL and a
catalogue language to `steamprofiler.org`. When personal progress is explicitly
enabled, it also sends a public SteamID. It has no analytics. See
[PRIVACY.md](PRIVACY.md) for the store-facing disclosure.

## License and names

MIT. See [LICENSE](LICENSE).

The extension does not copy the separately licensed SteamProfiler Player; its
trailer is a browser-native `<video>` element. SteamProfiler is independent and
is not affiliated with Valve Corporation. Steam and the Steam logo are
trademarks of Valve Corporation.
