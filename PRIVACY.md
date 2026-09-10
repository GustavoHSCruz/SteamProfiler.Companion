# Privacy

SteamProfiler Companion does not collect, sell or share personal data and does
not contain analytics or advertising.

When a supported Steam game page is opened, the extension sends two values to
`https://steamprofiler.org/api/companion`: the public numeric appid already in
that page's URL and the catalogue language selected in the extension. The
service returns public game metadata. No Steam cookies, account identifiers,
profile information or browsing history are read or transmitted.

Preferences (`enabled`, public metrics, trailer and language) are stored with
the browser extension storage API. Depending on the browser and the person's
sync settings, the browser vendor may synchronize those preferences between
their own devices. SteamProfiler cannot access that browser account.

Trailer media is requested from Steam's public content-delivery network only
after the viewer presses the trailer button. Opening the complete analysis
link navigates to `steamprofiler.org` in a new tab.

The companion endpoint is subject to the website privacy policy at
<https://steamprofiler.org/privacy>. Questions may be opened as an issue in
this repository.

Last updated: 2026-09-10.
