# Changelog

## Unreleased

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
