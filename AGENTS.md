# Citation Formatter contributor instructions

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
- Follow Codex interaction guidance: one primary progressive action per dialog,
  clear destructive actions, and cancellation before the primary action in LTR.
- Keep English, Simplified Chinese, and Traditional Chinese messages aligned.
- Use Node.js 24.14.1 or newer and the tracked lockfile (`npm ci`). Run
  `npm run verify` for material changes. Automated tests are offline and do not
  mutate live MediaWiki services.
- Generate `dist/` through the build. Keep README features short and put technical
  guidance in `docs/`. Preserve project and third-party attribution and licenses.
