# Architecture

> **Required interaction guidance:** Follow the [Codex types and order of buttons](https://doc.wikimedia.org/codex/latest/style-guide/using-links-and-buttons.html#types-and-order-of-buttons)
> when changing UI. Use neutral cancellation, at most one primary progressive action
> per group, normal secondary actions, and quiet tertiary actions. Put the primary
> at the reading end of horizontal flow groups (right in LTR, left in RTL), and at
> the top of stacked groups. Use `spacing-75` (12px) between grouped actions.

<!-- toc:start -->

## Contents

- [Scope](#scope)
- [Folder names and ownership](#folder-names-and-ownership)
- [Dependencies and startup](#dependencies-and-startup)
- [UI ownership](#ui-ownership)
- [Editor changes](#editor-changes)
- [Build boundary](#build-boundary)

<!-- toc:end -->

## Scope

Citation Formatter separates deterministic citation rules from editor
integration, external services, and UI state. Ordinary functions and typed
contracts connect these responsibilities.

## Folder names and ownership

| Path                           | Responsibility                                                 |
| ------------------------------ | -------------------------------------------------------------- |
| `src/app/`                     | Browser startup, composition, contracts, and review workflows. |
| `src/domain/`                  | Citation parsing, validation, naming, and wikitext rules.      |
| `src/platform/`                | MediaWiki, editor, browser, and remote service adapters.       |
| `src/features/editor/`         | Editor command, launchers, and their styles.                   |
| `src/features/source-manager/` | Source-manager state, presentation, and Codex dialogs.         |
| `src/config/`                  | Generated citation TemplateData with English-first ordering.   |
| `src/shared/`                  | Host-independent logging and translation capabilities.         |
| `src/i18n/`                    | English and Chinese message catalogs.                          |
| `src/types/`                   | Host and build declarations.                                   |
| `tests/`                       | Offline behavior tests and browser scenarios.                  |
| `scripts/`                     | Build and data-maintenance tools.                              |

Use lowercase kebab-case for folders, TypeScript, and CSS modules. Name each
module for its responsibility: `controller.ts`, `state.ts`, `list-presentation.ts`,
and `metadata-draft.ts` belong to the source-manager feature. Reserve `index.ts`
for deliberate public capabilities, including `src/index.ts`; dialog assembly
uses the named `dialogs.ts` module. Unit tests use `*.test.ts`, browser scenarios
use `*.spec.ts`, and authored developer guides live in `docs/`.

## Dependencies and startup

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
flows under `features/source-manager/`. Its controller and state modules own
session behavior; `dialogs.ts` assembles its dialog surfaces. Each dialog has
a co-located template-only `.vue` file, a TypeScript context and build bundle,
and a scoped stylesheet. Runtime assets are injected by the build, keeping
installation files self-contained. Codex tokens follow the host wiki's theme.

The editor command owns its launcher stylesheet in `features/editor/command.css`.
The source manager installs its base and co-located dialog styles when mounted.
Use Codex fields for field validation, Codex messages for status and warnings,
and the same neutral cancellation and responsive footer pattern across dialogs.
The mounted source manager tracks its narrow-screen media query and renders
keyed actions in visual and keyboard order. Horizontal flow groups finish with
the primary action; stacked groups begin with it. Disposal releases the media
query listener with the editor listener and mounted UI.
Recoverable session operations remain neutral; destructive styling is reserved
for changes that cannot be undone.

Article content, translated messages, and service responses are untrusted.
Display them as text. Formatting protects literal tags and comments, retains
unknown parameters, and preserves unsupported syntax. Asynchronous work
checks session and source revisions before applying results.

## Editor changes

The application owns the editor contract; source-manager features receive the
position-preserving write operation from the composition root. MediaWiki editor
adapters live in `src/platform/mediawiki/edit-box/`. The editor abstraction
supports reading current source, replacing a selection,
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
