# SteamProfiler Companion

SteamProfiler information where a Steam shopper can use it: directly on each
game's store page. The first release adds a compact panel with current players,
review totals, release date, a complete-analysis link and an on-demand trailer.

The extension is deliberately small:

- Chrome and Firefox use the same Manifest V3 source tree.
- No framework, bundler, runtime dependency or remotely hosted code.
- It runs only on `https://store.steampowered.com/app/*`.
- It asks only for `storage`, `activeTab` and access to the public
  `steamprofiler.org/api/*` endpoint.
- It never reads Steam cookies, account details, browsing history or profile
  data.

## Try it locally

Requires Node.js 22 or newer for checks; the extension itself has no Node
runtime.

```sh
npm run build
```

That produces both an unpacked directory and
`dist/steamprofiler-companion-0.1.0.zip`.

In Chrome, open `chrome://extensions`, enable Developer mode, choose **Load
unpacked**, and select the unpacked directory inside `dist/`. In Firefox, open
`about:debugging#/runtime/this-firefox`, choose **Load Temporary Add-on**, and
select its `manifest.json`.

Then visit a game such as
<https://store.steampowered.com/app/620/Portal_2/>. A SteamProfiler panel appears
below the purchase area. The toolbar popup can disable the panel or trailer;
the full options page also controls public metrics and catalogue language.

## Architecture

```text
Steam store page
  └─ content script: draws the isolated `spc-` panel
       └─ extension service worker: validates and caches requests
            └─ GET https://steamprofiler.org/api/companion?appid=…&l=…
```

The background boundary is intentional. Store-page JavaScript never receives
host permissions, and every API payload is validated before it reaches the
DOM. Outbound links are rebuilt from the numeric appid instead of trusted from
the response.

`GET /api/companion` is a versioned contract maintained by
[SteamProfiler.Api](https://github.com/GustavoHSCruz/SteamProfiler.Api). A cold
game may answer `pending`; the content script waits for the advertised cache
window and retries once. `absent` is distinct from a temporary network error.

## Development

```sh
npm run check
npm test
npm run build
```

`npm run check` parses the manifest and locale files, checks every JavaScript
file, verifies every manifest asset exists and rejects remote scripts or
dynamic code. `npm test` exercises appid, URL, response validation and the
credential-free request contract.

Source responsibilities:

- `src/content.js` and `src/content.css`: Steam page integration and trailer
  overlay.
- `src/background.js`: cross-origin requests, language choice and short cache.
- `src/api.js`: the testable versioned API adapter and trust boundary.
- `pages/`: toolbar popup and preferences.
- `_locales/`: English, Brazilian Portuguese and Russian copy.

## Privacy

The extension sends the Steam appid already present in the open page URL and a
catalogue language to `steamprofiler.org`. It does not collect personal data or
analytics. See [PRIVACY.md](PRIVACY.md) for the store-facing disclosure.

## License and names

MIT. See [LICENSE](LICENSE).

The extension does not copy the separately licensed SteamProfiler Player; its
trailer is a browser-native `<video>` element. SteamProfiler is independent and
is not affiliated with Valve Corporation. Steam and the Steam logo are
trademarks of Valve Corporation.
