# Citation Formatter

Citation Formatter is a standalone MediaWiki gadget for creating, organizing,
and reviewing citations in the source editor. It is under active development;
review changes in the editor before publishing an article.

## Run

Use Node.js 24.14.1 or newer to install and build:

```sh
npm ci
npm run build
```

The build creates two self-contained installation files:

- `dist/citation_formatter.min.js`, a minified file for wiki user scripts and
  site gadgets.
- `dist/citation_formatter.user.js`, a readable, unminified file for browser
  userscript managers.

Paste the `.min.js` contents into `Special:MyPage/common.js` on your wiki, or into
[Meta-Wiki global.js][1] for your Wikimedia account.

Alternatively, install the `.user.js` file in Tampermonkey or Violentmonkey.
It runs on all Wikipedia language editions by default. To use it on another
MediaWiki site, add that site's URL pattern to the script's `@match` entries.
See [userscript metadata][10] for the matching and execution settings.

For a site gadget, upload the build to
`MediaWiki:Gadget-citation-formatter.js` and register it in
`MediaWiki:Gadgets-definition`:

```text
* citation-formatter[ResourceLoader]|citation-formatter.js
```

Reload the wiki and open a wikitext article in **Edit source** or VisualEditor
source mode. Select **Citation Formatter** in the page actions or toolbox, or
use the floating launcher. The gadget loads the wiki's Vue and Codex
components when opened. It supports native textareas, CodeMirror, and
VisualEditor source mode. Changes stay in the editor until you publish them.

## Features

- Create citations from a URL, DOI, ISBN, ISSN, PMID, PMCID, QID, pasted
  citation, or manually entered details.
- Browse and filter article sources, inspect their uses, edit them, and reuse
  references at the cursor with optional sub-reference details.
- Format CS1 and other `Cite` templates in inline or block style while
  preserving unsupported fields and protected wikitext.
- Normalize citation parameters, dates, and language codes; name references,
  convert `{{r}}` calls, and organize grouped references.
- Review citation issues, apply selected fixes, and restore changes safely
  during the current session. Request live CS1 review on English and Chinese
  Wikipedia; new citations are also checked there when saved.
- Use English, Simplified Chinese, or Traditional Chinese interfaces, with
  responsive layouts and Wikimedia Codex controls.

See the [control panel guide][2] for the workflow and the [reference name
guide][3] for naming conventions and exclusion directives.

## Development

```sh
npm run check
npm test
npm run build
npm run test:ui
npm run verify
```

Tests run offline with local fixtures and mocked services. Browser tests use
Chromium; install it with `npx playwright install chromium` if needed.
Production metadata lookup uses Wikimedia Citoid and archive services.
Unknown `Cite` templates can use cached TemplateData from the current wiki;
unavailable services fall back to conservative local behavior.

See [CONTRIBUTING.md][4] for the verification workflow. Refresh generated
TemplateData with `npm run update:template-data` only when intentionally
maintaining the snapshot. The [CS1 maintenance guide][5] documents data and
site-rule updates.

## Architecture

```text
src/app/browser.ts
└── app/main.ts
    ├── features/       Codex dialogs and editor interactions
    ├── app/workflows/  Review use cases and service contracts
    ├── platform/       MediaWiki, browser, and network adapters
    ├── domain/         Citation rules and wikitext scanners
    ├── config/         Generated citation TemplateData
    ├── i18n/           Typed message catalogs
    └── shared/         Logging and translation capabilities
```

The composition root supplies external capabilities to the UI. Domain rules
remain independent of MediaWiki, the DOM, and network access. `src/index.ts`
exposes pure operations without starting the gadget. All runtime modules
belong to this project. See [architecture][6] for module boundaries.

## License

Project-owned code is dedicated under [CC0 1.0 Universal][7]. Wikimedia data
and bundled Codex icons retain their applicable terms and attribution. See
[LICENSE][8] and [third-party notices][9].

[1]: https://meta.wikimedia.org/wiki/Special:MyPage/global.js
[2]: docs/control-panel.md
[3]: docs/reference-names.md
[4]: CONTRIBUTING.md
[5]: docs/cs1-maintenance.md
[6]: docs/architecture.md
[7]: https://creativecommons.org/publicdomain/zero/1.0/
[8]: LICENSE
[9]: THIRD-PARTY-NOTICES.md
[10]: https://www.tampermonkey.net/documentation.php
