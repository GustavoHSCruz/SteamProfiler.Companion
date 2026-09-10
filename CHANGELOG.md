# Changelog

## 0.3.0 - 2026-09-10

- Draw the card a Steam profile asks for on the profile itself. Put
  `[!stpf=url=https://steamprofiler.org/bars.svg?...]` in the About Me or the
  info box and the picture that URL names appears on the page, always current.
  Steam cannot render it for anybody, so it shows only for readers who have
  this extension.
- Read the tag out of the page the browser already loaded, never by asking
  Steam for the profile again.
- Point only at steamprofiler.org. An address anywhere else is ignored, so no
  server chosen by a profile ever hears from a reader's browser.
- Draw the card for the profile it is on: the card's `q` is set to the profile
  being viewed, whatever the tag says.
- Drop typed text before the request. A signature comes from the persona name
  Steam is already showing on the same page, and a badge carrying its own label
  is not drawn - with a message for the person who wrote the tag, and nothing at
  all for anyone else.
- Say whose card it is: the panel carries the name and the disclaimer, and the
  mark on the picture can no longer be turned off inside Steam.
- Let a card be asked for unsigned with `sign=none`. Everything else typed into
  that field is dropped, but the off switch is not writing: it draws nothing, so
  there is nothing in it to publish.

## 0.2.3 - 2026-09-10

- Size each row of figures to how many it has, instead of leaving the grid's
  own colour showing as a grey block where a figure is missing.
- Show hours in the last two weeks and the day a game was last played, both
  already in the reply and drawn nowhere - which is what a game with no
  achievement set has to say about somebody's record of it.

## 0.2.2 - 2026-09-10

- Find the signed-in reader on accounts that have a custom Steam URL, which
  never appear as `/profiles/<id>` in the page header.
- Read the account id Steam still writes into its own pages, as text, instead
  of the `g_steamID` it stopped writing.
- Keep other people's ids out: profile links and miniprofile ids are read from
  the site header only, never from the page at large.

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
