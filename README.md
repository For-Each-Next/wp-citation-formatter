# Citation Formatter

[English](README.md) · [繁體中文](README.zh-Hant.md) · [简体中文](README.zh-Hans.md)

Create, organize, and review citations in a MediaWiki source editor. Accepted changes stay in the editor until you publish the article.

<!-- toc:start -->

## Contents

- [Features](#features)
- [Installation](#installation)
- [How to use](#how-to-use)
- [Screenshots](#screenshots)
- [Help](#help)
- [License](#license)

<!-- toc:end -->

## Features

- Create citations from a URL, identifier, pasted text, or manual details.
- Browse, edit, and reuse sources, including shared reference details.
- Format citation templates and review citation issues with session recovery.
- Choose an English, Traditional Chinese, or Simplified Chinese interface.

![Citation Formatter using BanG Dream! article source](docs/images/sources.png)

## Installation

- **Tampermonkey:** open the [latest readable userscript](https://github.com/For-Each-Next/wp-citation-formatter/releases/latest/download/citation_formatter.user.js) and confirm installation in your userscript manager.
- **MediaWiki user script:** download the [latest gadget file](https://github.com/For-Each-Next/wp-citation-formatter/releases/latest/download/citation_formatter.min.js), copy its complete contents into your wiki's `Special:MyPage/common.js`, save, and reload.

Install one of these files. Preserve the included license notices. The userscript runs on Wikipedia language editions.

To remove the tool, disable its entry in Tampermonkey or remove its code from `common.js`, then reload Wikipedia.

## How to use

Open an article with **Edit source**, then select **Citation Formatter** in page tools or the floating launcher. Add a source, browse existing sources, or review formatting changes. Confirm each edit in the dialog and review the article before publishing.

See the [workflow guide](docs/control-panel.md) for details. Native source textareas, current MediaWiki CodeMirror, and VisualEditor source mode are supported. Enhanced editors can use the shared backing-textarea contract.

## Screenshots

The screenshots show real offline browser sessions based on the Chinese Wikipedia [BanG Dream! article, revision 94028176](https://zh.wikipedia.org/w/index.php?oldid=94028176). [Capture details](docs/screenshots.md) describe the fixtures and simulated services. Article text retains its attribution and CC BY-SA 4.0 license.

## Help

See [Contributing](CONTRIBUTING.md), [architecture](docs/architecture.md), and the [changelog](CHANGELOG.md) for maintenance information.

## License

Project-owned code is dedicated under [CC0 1.0](LICENSE). Third-party code, icons, data, and article excerpts retain their original terms; see [third-party notices](THIRD-PARTY-NOTICES.md).
