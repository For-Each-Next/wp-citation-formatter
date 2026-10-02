# Contributing

> **Required interaction guidance:** Follow the [Codex types and order of buttons](https://doc.wikimedia.org/codex/latest/style-guide/using-links-and-buttons.html#types-and-order-of-buttons)
> when changing UI. Use neutral cancellation, at most one primary progressive action
> per group, normal secondary actions, and quiet tertiary actions. Put the primary
> at the reading end of horizontal flow groups (right in LTR, left in RTL), and at
> the top of stacked groups. Use `spacing-75` (12px) between grouped actions.

Use Node.js 24.14.1 or newer. Install the locked dependency tree with `npm ci`.
Install the browser fixture with `npx playwright install chromium` if it is
not already available.

## Development loop

| Command               | Purpose                                                 |
| --------------------- | ------------------------------------------------------- |
| `npm run format`      | Apply source and documentation formatting.              |
| `npm run check`       | Check formatting, lint, and TypeScript/Vue types.       |
| `npm test`            | Run offline domain and service tests.                   |
| `npm run build`       | Generate the gadget and browser userscript files.       |
| `npm run test:ui`     | Exercise Codex dialogs in Chromium.                     |
| `npm run verify`      | Run all required checks and tests.                      |
| `npm run screenshots` | Recreate all documentation images at 1024 × 768, DPR 1. |

Run `npm run verify` before handing off a material change. Automated tests
must not write to live wikis. Use fixtures for Citoid, archive, TemplateData,
and CS1 responses. Keep editor changes scoped, reviewable, and recoverable.

Refresh every documentation screenshot with `npm run screenshots`. The
scenario uses `DOCUMENTATION_SCREENSHOTS=1`, a fixed 1024 × 768 viewport, and
device pixel ratio 1. Its Chinese interface uses the offline Eternal Sonata
and Mother 3 excerpts under `tests/fixtures/`; no requests reach a live wiki.
Images capture the whole viewport. Additional images show citation review, scrolled fields, a filtered source
list, and a filled reference-details draft. Legacy
`CITATION_UI_SCREENSHOTS=1` remains supported.

Read [architecture](docs/architecture.md) before changing module boundaries.
Keep Vue templates, state, and styles in co-located files under
`src/features/source-manager/dialogs/`. Production Vue and Codex are provided by MediaWiki;
their npm packages provide local types and browser fixtures. Avoid embedding
a second runtime in the gadget.

Update the three message catalogs together and render translated or remote
content as text. Keep notable changes in `CHANGELOG.md`, user workflows in
`docs/control-panel.md`, and maintenance instructions in focused guides.
Generated files are rebuilt, never edited by hand.

## Releases

Update the package version and lockfile together. Move completed Unreleased
notes into a dated version section when preparing a release. Run verification
and inspect both artifact headers before publishing. Create the matching `vX.Y.Z` tag and push the release commit and tag to the
project repository when preparing an authorized release.
