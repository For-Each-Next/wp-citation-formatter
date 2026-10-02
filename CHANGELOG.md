# Changelog

## [0.2.1] - 2026-10-02

- Group editor commands and source-manager state, dialogs, and styles by feature
  ownership, with explicit module names and co-located templates.
- Keep visual and keyboard action order aligned when dialogs change between
  horizontal and stacked layouts. Dispose the viewport listener with the manager.
- Align cancellation, stacked reference-detail actions, warning messages, and
  action spacing with the Codex button hierarchy.
- Refresh every documentation screenshot at a 1024 × 768 viewport and provide
  `npm run screenshots` with offline fixtures.
- Shorten the README and document installation, architecture, and Codex
  interaction rules in focused contributor guides.

## 0.2.0 - 2026-10-02

- Preserve native Cite sub-reference details while formatting and organizing
  main references, including template-valued details and grouped names.
- Show author/year source rows with native sub-references underneath. Merge
  identical details into one child row with its use count; reuse copies details
  into a fresh call, and edit updates all uses in that row. Ctrl/Command-click
  on Use opens a details draft with a wikitext preview.
- Keep a source's main row visible while scrolling its sub-references, show
  sub-reference counts below author/year, and use dotted dividers within each
  source group.
- Prevent empty citation fields from displacing populated authors or creating
  false repeated-parameter warnings.

## 0.1.0 - 2026-10-01

- Introduce Citation Formatter as a standalone MediaWiki gadget with its own
  build, minified installation artifact, documentation, and offline verification.
- Provide citation lookup, manual drafting, source browsing and reuse,
  template formatting, reference naming, and selective CS1 review.
- Redesign the dialogs using Wikimedia Codex controls, responsive field
  layouts, clear action labels, and consistent button hierarchy.
- Support English, Simplified Chinese, and Traditional Chinese interfaces.
- Select the interface language after MediaWiki is ready so browser userscripts
  retain Chinese labels and diagnostics when the host runtime loads later.
- Keep the source-manager tabs visible while scrolling and use compact icon
  actions in the source list to leave more room for citation titles.
- Use compact icon actions for individual citation items with translated
  tooltips and accessible labels, and text buttons for list controls and footers.
- Use borderless parameter rows with visually hidden field labels and place
  external-link icons in the action cell after each parameter value.
- Show reference-name previews as compact text with only populated components.
- Generate a readable, unminified browser userscript alongside the MediaWiki
  gadget with the same interface and bundled attribution.
- Leave a space before closing braces in inline citation templates.
- Cache parameter order from English TemplateData first, then append parameters
  found only in Chinese TemplateData.
- Render embedded HTML and CSS across readable lines in the browser userscript.
- Refresh desktop and mobile screenshots using an offline Eternal Sonata example.
