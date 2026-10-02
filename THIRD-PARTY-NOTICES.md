# Third-party notices

Project-owned code is dedicated under [CC0 1.0](LICENSE). Third-party
material retains the terms described here and in the complete license.

<!-- toc:start -->

## Contents

- [Wikimedia data](#wikimedia-data)
- [Chinese Wikipedia sub-referencing fixture](#chinese-wikipedia-sub-referencing-fixture)
- [Wikimedia Codex](#wikimedia-codex)
- [HTML entity decoding](#html-entity-decoding)
- [BanG Dream! documentation fixture](#bang-dream-documentation-fixture)

<!-- toc:end -->

## Wikimedia data

The modules under `src/config/citation-template-data/generated/` contain
TemplateData from English and Chinese Wikipedia, with English parameter order
preferred and Chinese-only parameters appended. Namespace names and aliases under
`src/domain/wiki-titles/` reflect English and Chinese Wikipedia site
configuration. The generated modules identify their templates; their source
is the [English Wikipedia TemplateData API][1] and the
[Chinese Wikipedia TemplateData API][7].

Wikimedia-hosted data retains its applicable project status and terms.
The [Wikimedia Terms of Use][2] describe reuse licenses and attribution.
Generated snapshots are maintained through the documented API workflow.

## Chinese Wikipedia sub-referencing fixture

The offline fixture at `tests/fixtures/mother3-sub-references.wikitext` contains
reference and heading excerpts from the Chinese Wikipedia article
[《地球冒险3》, revision 94690392][8] (2026-10-01), written by its
[Chinese Wikipedia contributors][9]. It retains actual inline definitions,
forward references, and template-valued `details` attributes while omitting
article prose and other sources for focused offline regression tests.

The regression fixture retains the article's
[Creative Commons Attribution-ShareAlike 4.0 International][6] license and
attribution.

## Wikimedia Codex

The browser artifacts include selected icon data from
`@wikimedia/codex-icons`. The Wikimedia Foundation Design System Team and
contributors created the [Codex icons][3]. Selected icon data is bundled;
the artwork is otherwise unmodified. The artwork attribution
and CC BY 4.0 notice are preserved with the icon software's complete MIT
notice in [LICENSE](LICENSE) and in every installation artifact.

Vue and the Codex component runtime are supplied by MediaWiki in production.
Their npm packages are used for local types and browser tests. Dependency
licenses remain in their installed packages; they are not covered by the
project’s CC0 dedication.

## HTML entity decoding

The browser artifacts include the HTML entity decoder and named entity table
from [`entities` 4.5.0](https://github.com/fb55/entities/tree/v4.5.0), created by
Felix Böhm and contributors. This software is licensed under BSD-2-Clause.
Its complete copyright and license notice are preserved in [LICENSE](LICENSE)
and in every installation artifact. It is not covered by the project's CC0
dedication.

[1]: https://en.wikipedia.org/w/api.php?action=templatedata&format=json&titles=Template%3ACite_web
[2]: https://foundation.wikimedia.org/wiki/Policy:Terms_of_Use
[3]: https://doc.wikimedia.org/codex/latest/icons/overview.html
[6]: https://creativecommons.org/licenses/by-sa/4.0/
[7]: https://zh.wikipedia.org/w/api.php?action=templatedata&format=json&titles=Template%3ACite_web
[8]: https://zh.wikipedia.org/w/index.php?title=%E5%9C%B0%E7%90%83%E5%86%92%E9%99%A93&oldid=94690392
[9]: https://zh.wikipedia.org/w/index.php?title=%E5%9C%B0%E7%90%83%E5%86%92%E9%99%A93&action=history

## BanG Dream! documentation fixture

The unchanged article source in `tests/fixtures/bang-dream.wikitext` is from [revision 94028176](https://zh.wikipedia.org/w/index.php?title=BanG%20Dream!%20%E5%B0%91%E5%A5%B3%E6%A8%82%E5%9C%98%E6%B4%BE%E5%B0%8D&oldid=94028176), by [Chinese Wikipedia contributors](https://zh.wikipedia.org/w/index.php?title=BanG%20Dream!%20%E5%B0%91%E5%A5%B3%E6%A8%82%E5%9C%98%E6%B4%BE%E5%B0%8D&action=history), under [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/). The article's appearance in `docs/images/` retains this attribution and license. See [screenshot details](docs/screenshots.md) for the demonstration inputs and simulated services.
