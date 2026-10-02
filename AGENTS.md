# Citation Formatter contributor instructions

> **Required interaction guidance:** Follow the [Codex types and order of buttons](https://doc.wikimedia.org/codex/latest/style-guide/using-links-and-buttons.html#types-and-order-of-buttons)
> when changing UI. Use neutral cancellation, at most one primary progressive action
> per group, normal secondary actions, and quiet tertiary actions. Put the primary
> at the reading end of horizontal flow groups (right in LTR, left in RTL), and at
> the top of stacked groups. Use `spacing-75` (12px) between grouped actions.

Read `CONTRIBUTING.md` and `docs/architecture.md` before changing project structure.
Citation Formatter is a standalone MediaWiki gadget.

- Keep startup and wiring in `src/app/`, deterministic rules in `src/domain/`,
  host integration in `src/platform/`, and UI ownership in `src/features/`.
- Keep `src/index.ts` side-effect free. Export deliberate public operations.
- Treat article text and API responses as untrusted input. Render text with text
  nodes or Vue text interpolation. Keep source changes in the native textarea
  synchronized with the user's accepted operation.
- Release event listeners, timers, observers, and mounted UI on disposal. Optional
  network operations must discard stale results and support cancellation.
- Use MediaWiki's Vue and Codex runtime through ResourceLoader. Production builds
  may bundle selected Codex icons but must preserve their applicable notices.
- Group editor launchers in `src/features/editor/` and source management in
  `src/features/source-manager/`; use explicit lowercase kebab-case module names.
- Use Codex fields for validation, messages for status and warnings, and neutral
  cancellation. Reserve destructive actions for operations that cannot be undone.
- Keep English, Simplified Chinese, and Traditional Chinese messages aligned.
- Use Node.js 24.14.1 or newer and the tracked lockfile (`npm ci`). Run
  `npm run verify` for material changes. Automated tests are offline and do not
  mutate live MediaWiki services.
- Generate `dist/` through the build. Keep README features short and put technical
  guidance in `docs/`. Preserve project and third-party attribution and licenses.
