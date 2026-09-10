# Contributing

Keep the extension understandable from its unpacked files. Runtime dependencies,
bundlers and remotely hosted code require a concrete benefit large enough to
justify the new review and supply-chain surface.

Before opening a pull request:

```sh
npm run build
```

New page integration must use the `spc-` class prefix, build DOM with text
properties rather than untrusted HTML, request no broader host permission than
the feature needs, and include English, Portuguese and Russian messages.

Changes to the companion JSON shape belong in SteamProfiler.Api first. Preserve
`version: 1` compatibility or publish a new version instead of silently
changing a field's meaning.
