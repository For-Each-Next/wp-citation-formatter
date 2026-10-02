# Chinese Wikipedia CS1 Maintenance

> **Required interaction guidance:** Follow the [Codex types and order of buttons](https://doc.wikimedia.org/codex/latest/style-guide/using-links-and-buttons.html#types-and-order-of-buttons)
> when changing UI. Use neutral cancellation, at most one primary progressive action
> per group, normal secondary actions, and quiet tertiary actions. Put the primary
> at the reading end of horizontal flow groups (right in LTR, left in RTL), and at
> the top of stacked groups. Use `spacing-75` (12px) between grouped actions.

Use the shared [CS1 data maintenance guide][1] for TemplateData comparison
requests, Lua review, and diff checks. This file records the Chinese Wikipedia
sources and interpretation rules.

Last live HTTPS review: 2026-07-26.

<!-- toc:start -->

## Contents

- [Authoritative sources](#authoritative-sources)
- [TemplateData destination](#templatedata-destination)
- [Whitelist and date semantics](#whitelist-and-date-semantics)

<!-- toc:end -->

## Authoritative sources

- [TemplateData API help][2]
- [CS1 implementation][3]
- [Parameter whitelist][4]
- [Date rules][5]

Use `CS1_LANGUAGE=zh` with the shared download commands.

## TemplateData destination

Citation Formatter uses English TemplateData first and appends Chinese-only
parameters to the committed order through the shared updater. Chinese
TemplateData supplies the full metadata when an English template is missing.
Zhwiki-specific validation remains in `src/domain/validation/zhwiki.ts`.

When a zhwiki alias or accepted parameter is intentionally absent from English
TemplateData, add it to `additionalParameters` in
`src/domain/validation/zhwiki.ts`; do not hand-edit generated metadata.
Numbered aliases belong in that file's `numberedParameters`, with `#` replacing
each digit sequence.

## Whitelist and date semantics

Compare the downloaded Lua sources with `src/domain/validation/zhwiki.ts` and
`src/domain/source-validation.ts`.

- `true` and `false` whitelist entries are both recognized parameters; `false`
  marks deprecated forms. `nil` is unsupported.
- The CS1 module checks exact basic names, then replaces every digit sequence
  with `#` and checks its numbered table.
- Zhwiki retains local and legacy forms absent from English TemplateData,
  including compact archive, display, DOI, transliteration, and tracking
  aliases.
- Accepted Chinese date forms include `YYYY年`, `YYYY年M月`, and
  `YYYY年M月D日`, alongside common ISO and English forms. `n.d.` and `nd` are
  accepted only by the general `date` parameter.

The local validator is conservative UI feedback, not a complete Lua port. The
live zhwiki CS1 modules remain authoritative for complex ranges, deprecated
combinations, and parameter interactions.

Zhwiki's live validation also runs its installed Error, Language, Links, and
People child modules, and returns localized error and maintenance messages
through the shared **Check CS1 issues** workflow.

[1]: cs1-maintenance.md
[2]: https://zh.wikipedia.org/w/api.php?action=help&modules=templatedata
[3]: https://zh.wikipedia.org/wiki/Module:Citation/CS1
[4]: https://zh.wikipedia.org/wiki/Module:Citation/CS1/Whitelist
[5]: https://zh.wikipedia.org/wiki/Module:Citation/CS1/Date_validation
