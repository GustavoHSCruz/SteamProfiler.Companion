# Store

What Chrome, Firefox and Edge want uploaded beside the package, and how each
file here was made. `listing.md` is the words; everything else is the pictures.

## The files

| File | Where it goes |
|---|---|
| `chrome-tile-440x280.png` | Chrome Web Store, small promotional tile |
| `chrome-marquee-1400x560.png` | Chrome Web Store, marquee, only used if featured |
| `edge-logo-300x300.png` | Microsoft Edge Add-ons, store logo |
| `screenshot-panel-1280x800.png` | First in the carousel, everywhere |
| `screenshot-in-page-1280x800.png` | The panel in the Steam page it draws into |
| `screenshot-settings-1280x800.png` | The settings, which is what a reviewer looks for |
| `raw-panel.png` | The close-up the first screenshot is built around |

The store icon is `assets/icon-128.png` in the repository root, the same one
the extension already ships.

## Rebuilding the drawn pictures

    node store/make.mjs

Needs the front end checked out beside this repository for its fonts, or
`FONT_DIR` pointing at a copy of `site/fonts`. Nothing else, and no browser
window: the tiles are rasterised headless.

## Retaking the screenshots

These are photographs of the extension running, so they need a browser with it
loaded, and that turns out to be the awkward part.

**Chrome will not do it.** Stable Chrome from 152 ignores `--load-extension`
even with `DisableLoadExtensionCommandLineSwitch` turned off, and headless mode
refuses unpacked extensions outright. The profile ends up with the three
component extensions and nothing else, silently, which looks exactly like a
content script that failed to inject. Check
`<profile>/Default/Preferences` under `extensions.settings` before believing
anything else.

**Chrome for Testing does.** Any copy will do; the one used here came with
Playwright, at `~/.cache/ms-playwright/chromium-*/chrome-linux64/chrome`.

    npm run build

    CHROME=~/.cache/ms-playwright/chromium-1234/chrome-linux64/chrome
    EXT=$PWD/dist/steamprofiler-companion-$(node -p "require('./package.json').version")

    "$CHROME" --user-data-dir=/tmp/spc-shots --no-first-run \
      --lang=en-US --accept-lang=en-US,en \
      --remote-debugging-port=9333 \
      --disable-features=CalculateNativeWinOcclusion,DisableLoadExtensionCommandLineSwitch \
      --load-extension="$EXT" --disable-extensions-except="$EXT" &

    node store/shots.mjs

Then `node store/make.mjs` again, because the first screenshot is built around
the close-up that `shots.mjs` just retook.

`--lang=en-US` is not decoration. The panel speaks the browser's language, and
the listing is in English; without it the pictures come out in whatever the
machine is set to.

Afterwards, kill the browser and delete the profile directory. On this machine
`/tmp` is tmpfs with a quota, and a forgotten Chrome profile in it is enough to
fail a deploy later.

### Keeping the window out of the way

The window has to be real, but it does not have to be in front of anybody. On
Hyprland, with the class the launch line above can set:

    hyprctl eval "hl.window_rule{ name='claude-testes', match={ class='^(claude-test)\$' }, \
      workspace='2 silent', no_initial_focus=true }"

and `--class=claude-test` on the browser. The window opens on the second
workspace without taking focus. Do not add `float` to that rule: in the
floating form `no_initial_focus` does not hold.

## When the listings are live

`listing.md` ends with the three things that stop being true the moment a store
accepts the extension. The first of them lives in another repository.
