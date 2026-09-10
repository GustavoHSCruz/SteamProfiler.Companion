# Changelog

## 0.2.1 - 2026-09-10

- Fix "Use my profile" appearing off in the toolbar popup after being enabled,
  which turned the next click on it into switching the feature off.
- Keep the popup and the options page in step while both are open.
- Cover both pages with tests that run them against a stub browser.

## 0.2.0 - 2026-09-10

- Compare a bounded sample of the latest reviews with the all-time rating.
- Show recent official activity with a clear news-versus-update caveat.
- Suggest the kinds of player a game may suit from its public store features.
- Add an explicit opt-in personal panel with hours and achievement progress.
- Detect only a public SteamID rendered in the page, with a manual fallback;
  never request cookie access or transmit Steam credentials.

## 0.1.0 - 2026-09-10

- Add a Manifest V3 extension for Chrome and Firefox.
- Add a Steam store panel with public player count, reviews and release date.
- Add a complete SteamProfiler analysis link and on-demand Steam trailer.
- Add synchronized settings and English, Portuguese and Russian copy.
- Add strict API response validation, local checks and reproducible zip build.
