/**
 * @file scripts/build.mjs
 * Purpose: Builds the self-contained MediaWiki gadget and browser userscript files.
 *
 * Table of contents:
 * 1. Imports
 * 2. Constants and state
 * 3. Initialization and execution
 * 4. prepareAsset
 * 5. bundleSource
 * 6. minifySource
 * 7. licenseNotice
 * 8. documentationHeader
 * 9. mediaWikiArtifact
 * 10. userscriptArtifact
 */

import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { Script } from "node:vm";
import { parse } from "@vue/compiler-sfc";
import { build, transform } from "esbuild";
import { minify as minifyHtml } from "html-minifier-terser";
import { minify as minifyJavaScript } from "terser";

import { createReadableAssetLiteral } from "./build-assets.ts";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const manifest = JSON.parse(await readFile(join(root, "package.json"), "utf8"));
const outputDir = join(root, "dist");
const notice = (await readFile(join(root, "LICENSE"), "utf8")).trim();
if (notice.includes("*/")) {
    throw new Error(
        "The license notice cannot be embedded in a JavaScript comment.",
    );
}

const assetDefinitions = {
    __CITATION_FORMATTER_EDITOR_STYLES__: "src/features/editor/command.css",
    __CITATION_FORMATTER_STYLES__: "src/features/source-manager/styles.css",
    __CITATION_FORMATTER_MAIN_DIALOG_TEMPLATE__:
        "src/features/source-manager/dialogs/main-dialog.vue",
    __CITATION_FORMATTER_MAIN_DIALOG_STYLES__:
        "src/features/source-manager/dialogs/main-dialog.css",
    __CITATION_FORMATTER_DRAFT_DIALOG_TEMPLATE__:
        "src/features/source-manager/dialogs/draft-dialog.vue",
    __CITATION_FORMATTER_DRAFT_DIALOG_STYLES__:
        "src/features/source-manager/dialogs/draft-dialog.css",
    __CITATION_FORMATTER_PARAMETER_ALIAS_DIALOG_TEMPLATE__:
        "src/features/source-manager/dialogs/parameter-alias-dialog.vue",
    __CITATION_FORMATTER_PARAMETER_ALIAS_DIALOG_STYLES__:
        "src/features/source-manager/dialogs/parameter-alias-dialog.css",
    __CITATION_FORMATTER_TOOL_DIALOG_TEMPLATE__:
        "src/features/source-manager/dialogs/tool-dialog.vue",
    __CITATION_FORMATTER_TOOL_DIALOG_STYLES__:
        "src/features/source-manager/dialogs/tool-dialog.css",
    __CITATION_FORMATTER_CLOSE_DIALOG_TEMPLATE__:
        "src/features/source-manager/dialogs/close-confirmation-dialog.vue",
    __CITATION_FORMATTER_CLOSE_DIALOG_STYLES__:
        "src/features/source-manager/dialogs/close-confirmation-dialog.css",
};
async function prepareAsset(relativePath, readableAssets) {
    const filename = join(root, relativePath);
    const source = await readFile(filename, "utf8");
    if (relativePath.endsWith(".css")) {
        if (readableAssets) return source.trim();
        const result = await transform(source, { loader: "css", minify: true });
        return result.code.trim();
    }
    const { descriptor, errors } = parse(source, { filename });
    if (
        errors.length > 0 ||
        descriptor.template == null ||
        descriptor.script != null ||
        descriptor.scriptSetup != null ||
        descriptor.styles.length > 0 ||
        descriptor.customBlocks.length > 0
    ) {
        throw new Error(`${relativePath} must contain one template only.`);
    }
    const template = descriptor.template.content.trim();
    return minifyHtml(template, {
        caseSensitive: true,
        collapseInlineTagWhitespace: true,
        collapseWhitespace: true,
        customAttrCollapse: /.*/u,
        keepClosingSlash: true,
    });
}

async function bundleSource(entryPoint, readableAssets = false) {
    const assets = await Promise.all(
        Object.entries(assetDefinitions).map(async ([name, path], index) => ({
            name,
            path,
            source: await prepareAsset(path, readableAssets),
            token: `__CITATION_FORMATTER_READABLE_ASSET_${index}__`,
        })),
    );
    const result = await build({
        absWorkingDir: root,
        bundle: true,
        preserveSymlinks: true,
        define: {
            __GADGET_VERSION__: JSON.stringify(manifest.version),
            ...Object.fromEntries(
                assets.map((asset) => [
                    asset.name,
                    JSON.stringify(readableAssets ? asset.token : asset.source),
                ]),
            ),
        },
        entryPoints: [entryPoint],
        format: "iife",
        legalComments: "none",
        logLevel: "silent",
        metafile: true,
        target: "es2024",
        write: false,
    });
    const forbiddenDependencies = Object.keys(result.metafile.inputs).filter(
        (input) =>
            input.includes("node_modules/") &&
            !input.includes("node_modules/@wikimedia/codex-icons/") &&
            !input.includes("node_modules/entities/"),
    );
    if (forbiddenDependencies.length > 0) {
        throw new Error(
            "Vue, Codex, and other host dependencies must be supplied by " +
                `MediaWiki ResourceLoader: ${forbiddenDependencies.join(", ")}`,
        );
    }
    let code = result.outputFiles?.[0]?.text;
    if (code == null) {
        throw new Error("esbuild did not return the browser bundle.");
    }
    if (readableAssets) {
        for (const asset of assets) {
            const token = JSON.stringify(asset.token);
            if (!code.includes(token)) {
                throw new Error(`esbuild did not retain ${asset.name}.`);
            }
            code = code.replaceAll(token, () =>
                createReadableAssetLiteral(asset.source, {
                    compactMarkup: asset.path.endsWith(".vue"),
                }),
            );
        }
    }
    return code;
}

const [gadgetCode, userscriptCode] = await Promise.all([
    bundleSource("src/app/browser.ts").then(minifySource),
    bundleSource("src/app/userscript.ts", true),
]);
const artifacts = new Map([
    ["citation_formatter.min.js", mediaWikiArtifact(gadgetCode)],
    ["citation_formatter.user.js", userscriptArtifact(userscriptCode)],
]);

async function minifySource(program) {
    const minified = await minifyJavaScript(program, {
        ecma: 2024,
        compress: { ecma: 2024, passes: 2 },
        format: { comments: false, ecma: 2024 },
        mangle: true,
    });
    if (minified.code == null) {
        throw new Error("Terser did not return minified JavaScript.");
    }
    return minified.code;
}

// Verify complete artifacts before replacing a previous successful build.
for (const [filename, source] of artifacts) {
    new Script(source, { filename });
}
await rm(outputDir, { recursive: true, force: true });
await mkdir(outputDir, { recursive: true });
await Promise.all(
    Array.from(artifacts, ([filename, source]) =>
        writeFile(join(outputDir, filename), source),
    ),
);
for (const [filename, source] of artifacts) {
    console.log(`Built dist/${filename} (${Buffer.byteLength(source)} bytes)`);
}

function licenseNotice() {
    return [
        "/*!",
        ...notice.split(/\r?\n/u).map((line) => ` * ${line}`),
        " */",
    ].join("\n");
}

function documentationHeader() {
    return [
        "/**",
        " * Citation Formatter",
        " *",
        ` * Purpose: ${manifest.description}`,
        " *",
        ` * @name ${manifest.name}`,
        ` * @version ${manifest.version}`,
        " * @license CC0-1.0 AND MIT AND CC-BY-4.0 AND BSD-2-Clause",
        " *",
        " * Table of contents:",
        " * 1. Metadata and license notices",
        " * 2. MediaWiki bootstrap and browser program",
        " */",
    ].join("\n");
}

function mediaWikiArtifact(program) {
    return [
        documentationHeader(),
        "",
        licenseNotice(),
        "",
        "//<nowiki>",
        program,
        "//</nowiki>",
        "",
    ].join("\n");
}

function userscriptArtifact(program) {
    return [
        "// ==UserScript==",
        "// @name         Citation Formatter",
        "// @namespace    citation-formatter",
        `// @version      ${manifest.version}`,
        `// @description  ${manifest.description}`,
        "// @license      CC0-1.0 AND MIT AND CC-BY-4.0 AND BSD-2-Clause",
        "// @match        https://*.wikipedia.org/*",
        "// @homepageURL  https://github.com/For-Each-Next/wp-citation-formatter",
        "// @downloadURL  https://github.com/For-Each-Next/wp-citation-formatter/releases/latest/download/citation_formatter.user.js",
        "// @updateURL    https://github.com/For-Each-Next/wp-citation-formatter/releases/latest/download/citation_formatter.user.js",
        "// @grant        none",
        "// @run-at       document-end",
        "// ==/UserScript==",
        "",
        documentationHeader(),
        "",
        licenseNotice(),
        "",
        program,
        "",
    ].join("\n");
}
