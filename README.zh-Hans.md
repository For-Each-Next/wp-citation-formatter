# Citation Formatter

[English](README.md) · [繁體中文](README.zh-Hant.md) · [简体中文](README.zh-Hans.md)

在 MediaWiki 源代码编辑器中创建、整理及检查引用来源。确认的修改会留在编辑器中，直到您发布条目。

<!-- toc:start -->

## 目录

- [主要功能](#主要功能)
- [安装](#安装)
- [使用方式](#使用方式)
- [画面示例](#画面示例)
- [说明](#说明)
- [许可](#许可)

<!-- toc:end -->

## 主要功能

- 使用网址、标识符、粘贴的文字或手动输入的资料创建引用。
- 浏览、编辑及重用来源，包括共用的引用详情。
- 格式化引用模板、检查引用问题，并还原本次操作。
- 提供英文、繁体中文及简体中文界面。

![Citation Formatter：BanG Dream!](docs/images/sources.png)

## 安装

- **Tampermonkey：**打开[最新可读版用户脚本](https://github.com/For-Each-Next/wp-citation-formatter/releases/latest/download/citation_formatter.user.js)，在脚本管理器中确认安装。
- **MediaWiki：**下载[最新小工具文件](https://github.com/For-Each-Next/wp-citation-formatter/releases/latest/download/citation_formatter.min.js)，将完整内容粘贴至 `Special:MyPage/common.js`，保存并重新加载页面。

选择其中一种安装方式，保留文件中的许可声明。

移除工具时，停用 Tampermonkey 中对应的脚本，或从 `common.js` 删除工具代码，再重新加载维基百科。

## 使用方式

打开条目的“编辑源代码”，在页面工具或浮动按钮中选择 Citation Formatter。您可新增、浏览或编辑来源，也可检查格式化修改。确认对话框中的修改后，请先检查条目再发布。

详见[操作指南](docs/control-panel.md)。支持原生源代码文本框、当前的 MediaWiki CodeMirror 及 VisualEditor 源代码模式。

## 画面示例

截图为离线浏览器中实际运行的画面，以[BanG Dream! 条目修订版本 94028176](https://zh.wikipedia.org/w/index.php?oldid=94028176)的源代码为例。[截图说明](docs/screenshots.md)列出测试资料与模拟服务。条目文字保留来源署名及 CC BY-SA 4.0 许可。

## 说明

维护信息请参阅 [Contributing](CONTRIBUTING.md)、[架构](docs/architecture.md) 及[更新记录](CHANGELOG.md)。

## 许可

项目自有代码采用[CC0 1.0](LICENSE)。第三方代码、图标、资料与条目摘录保留原许可；详见[第三方声明](THIRD-PARTY-NOTICES.md)。
