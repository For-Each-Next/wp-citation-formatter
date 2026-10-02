# Installation

> **Required interaction guidance:** Follow the [Codex types and order of buttons](https://doc.wikimedia.org/codex/latest/style-guide/using-links-and-buttons.html#types-and-order-of-buttons)
> when changing UI. Use neutral cancellation, at most one primary progressive action
> per group, normal secondary actions, and quiet tertiary actions. Put the primary
> at the reading end of horizontal flow groups (right in LTR, left in RTL), and at
> the top of stacked groups. Use `spacing-75` (12px) between grouped actions.

## Build and install

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
[Meta-Wiki global.js](https://meta.wikimedia.org/wiki/Special:MyPage/global.js) for your Wikimedia account.

Alternatively, install the `.user.js` file in Tampermonkey or Violentmonkey.
It runs on all Wikipedia language editions by default. To use it on another
MediaWiki site, add that site's URL pattern to the script's `@match` entries.
See [userscript metadata](https://www.tampermonkey.net/documentation.php) for the matching and execution settings.

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

See [Contributing](../CONTRIBUTING.md) for development and verification.
