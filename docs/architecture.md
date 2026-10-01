# Architecture

Citation Formatter separates deterministic citation rules from editor
integration, external services, and UI state. Ordinary functions and typed
contracts connect these responsibilities.

| Path            | Responsibility                                                 |
| --------------- | -------------------------------------------------------------- |
| `src/app/`      | Browser startup, composition, contracts, and review workflows. |
| `src/domain/`   | Citation parsing, validation, naming, and wikitext rules.      |
| `src/platform/` | MediaWiki, editor, browser, and remote service adapters.       |
| `src/features/` | Source-manager interactions and Codex dialogs.                 |
| `src/config/`   | Generated citation TemplateData with English-first ordering.   |
| `src/shared/`   | Host-independent logging and translation capabilities.         |
| `src/i18n/`     | English and Chinese message catalogs.                          |
| `src/types/`    | Host and build declarations.                                   |
| `tests/`        | Offline behavior tests and browser scenarios.                  |
| `scripts/`      | Build and data-maintenance tools.                              |

## Startup and dependencies

`app/browser.ts` invokes `start` in `app/main.ts`. The composition root checks
the page content model, waits for MediaWiki capabilities, creates platform
adapters, and mounts the editor commands. The dialog loads the host wiki's
Vue and Codex through ResourceLoader.

The browser userscript uses `app/userscript.ts` to wait for the page's
MediaWiki runtime before invoking the same `start` operation. Its bounded
startup timer and navigation listener are released when waiting ends.

Dependencies point toward contracts and pure rules. Domain modules do not
import the UI, MediaWiki globals, or network adapters. Features consume
injected services and domain operations. Platform implementations satisfy
those contracts. `src/index.ts` is a deliberate public boundary for pure
operations; importing it does not start the browser gadget.

Supported citation templates use generated TemplateData snapshots. The updater
completes the English parameter order from English canonical parameters, then
appends distinct Chinese order entries. English aliases and date types take
precedence; Chinese metadata is the fallback when English data is unavailable.
Generic Cite templates outside that set use the host wiki's runtime cache.

## UI ownership

The source manager owns the lookup, browse, draft, analysis, and recovery
flows. Each dialog has a template-only `.vue` file, a TypeScript state owner,
and a scoped stylesheet. Runtime assets are injected by the build, keeping
installation files self-contained. Codex tokens follow the host wiki's theme.

Article content, translated messages, and service responses are untrusted.
Display them as text. Formatting protects literal tags and comments, retains
unknown parameters, and preserves unsupported syntax. Asynchronous work
checks session and source revisions before applying results.

## Editor changes

The editor abstraction supports reading current source, replacing a selection,
writing an accepted transformation, and restoring focus. Operations that
promise current article content re-read it. Review fixes record enough state
to revert only their own changes; recovery does not overwrite later unrelated
editing. Tests cover these boundaries with fixture editor implementations.

## Build boundary

The build uses esbuild for ES2024 output and injects authored templates and
CSS. Vue and Codex components remain supplied by MediaWiki. Only selected
Codex icon data and the HTML entity decoder from `entities` are bundled from npm,
with their notices embedded in the generated files. The decoder keeps reference
attribute identities consistent without depending on a browser DOM. No module
depends on another local gadget checkout.
