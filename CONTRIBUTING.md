# Contributing

Use Node.js 24.14.1 or newer. Install the locked dependency tree with `npm ci`.
Install the browser fixture with `npx playwright install chromium` if it is
not already available.

## Development loop

| Command           | Purpose                                           |
| ----------------- | ------------------------------------------------- |
| `npm run format`  | Apply source and documentation formatting.        |
| `npm run check`   | Check formatting, lint, and TypeScript/Vue types. |
| `npm test`        | Run offline domain and service tests.             |
| `npm run build`   | Generate the gadget and browser userscript files. |
| `npm run test:ui` | Exercise Codex dialogs in Chromium.               |
| `npm run verify`  | Run all required checks and tests.                |

Run `npm run verify` before handing off a material change. Automated tests
must not write to live wikis. Use fixtures for Citoid, archive, TemplateData,
and CS1 responses. Keep editor changes scoped, reviewable, and recoverable.

Refresh the documentation screenshots with
`CITATION_UI_SCREENSHOTS=1 npm run test:ui -- --grep 'captures the source'`.
The screenshot scenario uses the offline Eternal Sonata excerpt under
`tests/fixtures/` and a Chinese interface; it never edits the source article.

Read [architecture](docs/architecture.md) before changing module boundaries.
Keep Vue templates, state, and styles in co-located files under
`src/features/dialogs/`. Production Vue and Codex are provided by MediaWiki;
their npm packages provide local types and browser fixtures. Avoid embedding
a second runtime in the gadget.

Update the three message catalogs together and render translated or remote
content as text. Keep notable changes in `CHANGELOG.md`, user workflows in
`docs/control-panel.md`, and maintenance instructions in focused guides.
Generated files are rebuilt, never edited by hand.

## Releases

Update the package version and lockfile together. Move completed Unreleased
notes into a dated version section when preparing a release. Run verification
and inspect both artifact headers before publishing. Release tags and
live installation are deliberate maintainer actions.
