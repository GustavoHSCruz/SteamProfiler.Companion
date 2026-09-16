# Store listing

Everything the three stores ask for in words, written down once so the same
extension does not describe itself three different ways. The pictures are
beside this file and are rebuilt with `node store/make.mjs`.

The wording comes from the extension's page on the site,
<https://steamprofiler.org/extension>, and should keep coming from there: that
page is the one a reader lands on, and a listing that promises something else
is a listing that has drifted.

## Name

    SteamProfiler Companion

## Short description

132 characters, which is the tightest of the three limits, so this one text
fits every store:

    The numbers on a Steam store page: players right now, the newest reviews
    against all of them, and your own hours if you ask.

## Summary, where there is room for more

    SteamProfiler Companion draws one panel under the purchase area of a Steam
    store page: how many people are in the game at this moment, the review
    split with the newest reviews beside the whole history, the release date,
    and how long ago the studio last patched it. A section about you starts
    switched off; turned on, it adds your hours and achievement progress for
    that one game. On a Steam profile it draws the card that profile asked for.

## Description

    The site, on Steam's own page.

    The panel goes under the purchase area, in the same amber SteamProfiler
    counts hours in, and it is the only thing the extension adds to that page.
    Nothing is moved, nothing is covered, and nothing the store already shows
    is replaced.

    WHAT IT DRAWS

    The figures are the public ones: how many people are in the game at this
    moment, the review split with the newest reviews beside the whole history,
    the release date, and how long ago the studio last patched it. The full
    analysis is one click away on steamprofiler.org.

    Under all of it sits one section that is about you, and it starts switched
    off. Turned on, it adds your hours in that game and how much of its
    achievement set you have, read from the profile Steam already shows as
    public. A private profile stays private.

    On a Steam profile, the extension draws the card that profile asked for. A
    tag in the About Me names one of the site's own embeds and the picture
    appears in its place. Steam cannot render it for anybody, so it shows only
    to readers who have this extension, and it is always drawn for the profile
    it sits on.

    WHAT IT MAY TOUCH

    An extension can be given every page you open, which is why what this one
    may touch is short enough to print here in full: Steam store pages under
    store.steampowered.com/app/, Steam profile pages under
    steamcommunity.com/id/ and /profiles/, and the public API at
    steamprofiler.org. Nothing else.

    It never reads Steam cookies, credentials or browsing history. There is no
    analytics and no advertising, and nothing is sold or shared.

    HOW IT IS BUILT

    Manifest V3, one source tree for Chrome and Firefox, no framework, no
    bundler, no runtime dependency and no remotely hosted code. What is in the
    package is what runs, and the source is MIT at
    github.com/GustavoHSCruz/SteamProfiler.Companion.

    SteamProfiler is an independent hobby project. It is not affiliated with,
    endorsed by, or connected to Valve Corporation. Steam and the Steam logo
    are trademarks of Valve Corporation.

## Single purpose

Chrome asks for one sentence, and rejects a listing whose extension does two
things:

    Show SteamProfiler's public figures for the Steam game or profile the
    person is currently looking at.

## Permission justifications

Each one is the reason in the source, not a reason invented for the form.

**`storage`**

    The extension's own settings: whether the panel is on, whether the trailer
    button is on, catalogue language, and whether the optional personal section
    has been consented to. Nothing about browsing is stored.

**`activeTab`**

    The toolbar popup reads the address of the tab it was opened over, and only
    to see whether it is a Steam game page. If it is, the appid already in that
    address becomes a link to the full analysis on the site. No page content is
    read and nothing is injected.

**`https://steamprofiler.org/api/*`**

    Where the figures come from. The extension sends the public appid that is
    already in the store page's address and the chosen catalogue language, and
    receives public game metadata in reply. When the optional personal section
    is enabled, it also sends a public SteamID to read the viewer's own hours
    and achievement progress for that one game.

**Remote code**

    None. There is no bundler, no minifier and no code fetched at runtime.

## Data usage

What the forms ask to be declared, and what is true here:

- Personally identifiable information: none. A public SteamID is sent only
  after the person switches the personal section on, and it is the identifier
  Steam itself publishes on the profile page.
- Health, financial, authentication, personal communications, location,
  browsing history, user activity, website content: none of it collected.
- Not sold, not transferred to third parties, not used for anything unrelated
  to the single purpose above, and not used to judge creditworthiness.

Privacy policy URL: <https://steamprofiler.org/privacy>

The extension's own policy is `PRIVACY.md` in this repository, and it is the
longer form of the same thing.

## Categories

Chrome and Edge: the listing is a tool that adds information to a page, so
Tools first, Entertainment second. Firefox takes up to three, and there the
closest are Other and Social & Communication.

## Notes for the reviewer

Worth pasting into the notes field, because it answers the two questions a
human reviewer of an extension in this shape usually has:

    The package is the repository. There is no build step that transforms
    source: `npm run build` copies the same files into a directory and zips
    them, so every line in the package can be read as it was written and
    compared against
    github.com/GustavoHSCruz/SteamProfiler.Companion.

    The API at steamprofiler.org is run by the extension's own author and
    serves public Steam data. The site's privacy policy covers it.

## After the listing goes live

Three things stop being true the moment a store accepts this, and each is in a
different repository:

1. The site says the extension is in no store yet, in `ext.get_stores`, and the
   buttons on `/extension` are waiting on it. That string lives in
   **SteamProfiler.i18n** and reaches the site through `./release.sh`, not
   through editing the front end.
2. `README.md` here sends a reader to load an unpacked directory. That stays,
   because it is still how a contributor runs it, but the store link belongs
   above it.
3. The extension's version becomes a published number. A store rejects a
   re-upload of a version it already has, so a fix is always a version bump in
   `manifest.json` and `package.json` together, which `tools/check.mjs` keeps
   in step.
