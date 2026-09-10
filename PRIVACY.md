# Privacy

SteamProfiler Companion does not sell or share personal data and contains no
analytics or advertising. It processes a public SteamID only when the optional
personal game panel is explicitly enabled, as described below.

When a supported Steam game page is opened, the extension sends two values to
`https://steamprofiler.org/api/companion`: the public numeric appid already in
that page's URL and the catalogue language selected in the extension. The
service returns public game metadata. No Steam cookies, credentials or browsing
history are read or transmitted.

The optional **Use my profile** feature is off by default. When enabled, the
extension looks only for a public SteamID in the Steam page header, or uses the
SteamID64 entered by the person in settings. It sends that identifier and the
current appid to `https://steamprofiler.org/api/companion/profile`. The reply is
limited to hours, last-played date and compact achievement progress for that
one game. Requests explicitly omit browser credentials. Private Steam profiles
remain unavailable, just as they are on the public SteamProfiler website.

**Cards on Steam profiles.** When a Steam profile page is opened, the extension
reads the text Steam already displayed on it - the About Me and the info box -
looking for a SteamProfiler tag. Nothing is requested from Steam to do this and
no profile text is sent anywhere. If a tag is found, the extension loads one
image from `https://steamprofiler.org`, the same way a page loads any image. The
address of that image carries the public SteamID of the profile being viewed and
the settings the profile owner chose, and never anything about the person
reading. Addresses in the tag that do not belong to steamprofiler.org are
ignored, so no other server is contacted. A reader's own SteamID is used only on
their own machine, to decide whether to show them a message about a tag they
wrote; it is not sent with the request.

Preferences (`enabled`, public metrics, trailer, profile cards, language, profile consent and
an optional manually entered SteamID) are stored with the browser extension
storage API. Depending on the browser and the person's sync settings, the
browser vendor may synchronize those preferences between their own devices.
SteamProfiler cannot access that browser account.

Trailer media is requested from Steam's public content-delivery network only
after the viewer presses the trailer button. Opening the complete analysis
link navigates to `steamprofiler.org` in a new tab.

The companion endpoint is subject to the website privacy policy at
<https://steamprofiler.org/privacy>. Questions may be opened as an issue in
this repository.

Last updated: 2026-09-10.
