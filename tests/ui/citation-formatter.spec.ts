import { mkdir, readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { expect, test, type Page } from "@playwright/test";
import { build } from "esbuild";
import zhHansCatalog from "../../src/i18n/zh-Hans.json" with { type: "json" };
import zhHantCatalog from "../../src/i18n/zh-Hant.json" with { type: "json" };

const root = fileURLToPath(new URL("../../", import.meta.url));
const initialSource = [
    "== Background ==",
    'Text.<ref name="sample">{{Cite web|url=https://example.test/source|title=Sample source|last=Nguyen|date=2024-05-20}}</ref>',
    "== Further reading ==",
    '<ref name="book">{{Cite book|title=Example book|year=2020}}</ref>',
].join("\n");
let runtime: string;
let styles: string;
let gadget: string;
let userscript: string;

test.beforeAll(async () => {
    const bundle = await build({
        absWorkingDir: root,
        stdin: {
            contents: [
                'import * as Vue from "vue/dist/vue.esm-bundler.js";',
                'import * as Codex from "@wikimedia/codex";',
                "export const vue = {...Vue, createMwApp: Vue.createApp};",
                "export const codex = Codex;",
            ].join("\n"),
            resolveDir: root,
        },
        bundle: true,
        format: "iife",
        globalName: "CitationTestUI",
        define: {
            "process.env.NODE_ENV": '"production"',
            __VUE_OPTIONS_API__: "true",
            __VUE_PROD_DEVTOOLS__: "false",
            __VUE_PROD_HYDRATION_MISMATCH_DETAILS__: "false",
        },
        write: false,
    });
    runtime = bundle.outputFiles[0].text;
    [styles, gadget, userscript] = await Promise.all([
        readFile(
            `${root}node_modules/@wikimedia/codex/dist/codex.style.css`,
            "utf8",
        ),
        readFile(`${root}dist/citation_formatter.min.js`, "utf8"),
        readFile(`${root}dist/citation_formatter.user.js`, "utf8"),
    ]);
});

for (const artifact of ["gadget", "userscript"] as const) {
    test(`opens an accessible Codex panel and validates empty lookup (${artifact})`, async ({
        page,
    }) => {
        const errors = await mountGadget(page, { artifact });
        const dialog = page.getByRole("dialog");
        await expect(dialog).toHaveAccessibleName("Citation formatter");
        await expect(dialog.getByRole("tab")).toHaveCount(3);
        await expect(
            dialog.getByRole("searchbox", { name: "Source", exact: true }),
        ).toBeFocused();
        await dialog
            .getByRole("button", { name: "Find source", exact: true })
            .click();
        await expect(dialog).toContainText(
            "Enter a source URL, identifier, or citation.",
        );
        await expect(page.locator("#wpTextbox1")).toHaveValue(initialSource);
        expect(errors).toEqual([]);
    });
}

test("starts the userscript after MediaWiki becomes available", async ({
    page,
}) => {
    const errors = await mountGadget(page, {
        artifact: "userscript",
        delayMediaWiki: true,
    });
    await expect(page.getByRole("dialog")).toHaveAccessibleName(
        "Citation formatter",
    );
    await expect(page.locator("#citation-formatter-quick-launch")).toHaveCount(
        1,
    );
    await expect(page.locator("#wpTextbox1")).toHaveValue(initialSource);
    expect(errors).toEqual([]);
});

test("filters sources and reuses a reference at the preserved cursor", async ({
    page,
}) => {
    const errors = await mountGadget(page);
    const dialog = page.getByRole("dialog");
    await dialog
        .getByRole("tab", { name: "View sources (2)", exact: true })
        .click();
    await dialog
        .getByRole("textbox", { name: /Filter by keyword/ })
        .fill("Sample source");
    await expect(dialog.getByRole("row")).toHaveCount(2);
    await dialog
        .getByRole("button", { name: "Use source", exact: true })
        .click();
    await expect(page.locator("#wpTextbox1")).toHaveValue(
        `${initialSource}<ref name="sample" />`,
    );
    expect(errors).toEqual([]);
});

test("keeps source tabs visible while scrolling and gives titles compact accessible actions", async ({
    page,
}) => {
    const source = Array.from(
        { length: 60 },
        (_, index) =>
            `Text.<ref name="source-${index + 1}">{{Cite web|url=https://example.test/source-${index + 1}|title=A reference title with enough detail to use the available source column ${index + 1}}}</ref>`,
    ).join("\n");

    for (const viewport of [
        { width: 1280, height: 720 },
        { width: 390, height: 844 },
    ]) {
        await page.setViewportSize(viewport);
        const errors = await mountGadget(page, { source });
        const dialog = page.getByRole("dialog");
        const tabs = dialog.getByRole("tablist");
        await dialog
            .getByRole("tab", { name: "View sources (60)", exact: true })
            .click();
        await expect(dialog.getByRole("row")).toHaveCount(61);

        const firstRow = dialog.getByRole("row").nth(1);
        for (const name of ["Use source", "Edit source"]) {
            const action = firstRow.getByRole("button", { name, exact: true });
            await expect(action).toHaveAttribute("title", name);
            await expect(action.locator("svg")).toHaveCount(1);
            expect(await action.textContent()).toMatch(/^\s*$/);
            expect((await action.boundingBox())!.width).toBeLessThanOrEqual(40);
        }
        const columnWidths = await firstRow.evaluate((row) =>
            Array.from(row.children).map(
                (cell) => cell.getBoundingClientRect().width,
            ),
        );
        expect(columnWidths[1]).toBeGreaterThan(columnWidths[2]);

        const tabsBefore = await tabs.boundingBox();
        const lastTitle = dialog
            .locator(".cf-source-manager__source-title")
            .last();
        const lastTitleBefore = await lastTitle.boundingBox();
        const body = dialog.locator(".cdx-dialog__body");
        const scrollTop = await body.evaluate((element) => {
            element.scrollTop = element.scrollHeight;
            return element.scrollTop;
        });
        expect(scrollTop).toBeGreaterThan(300);
        await expect(tabs).toBeInViewport();
        const tabsAfter = await tabs.boundingBox();
        const lastTitleAfter = await lastTitle.boundingBox();
        expect(tabsBefore).not.toBeNull();
        expect(tabsAfter).not.toBeNull();
        expect(tabsAfter!.y).toBeCloseTo(tabsBefore!.y, 0);
        expect(lastTitleBefore!.y - lastTitleAfter!.y).toBeGreaterThan(300);
        expect(
            await page.evaluate(() => document.documentElement.scrollWidth),
        ).toBeLessThanOrEqual(viewport.width);
        await dialog.getByRole("tab", { name: "Tools", exact: true }).click();
        await expect(
            dialog.getByRole("button", {
                name: "Format citations",
                exact: true,
            }),
        ).toBeVisible();
        expect(errors).toEqual([]);
    }
});

test("edits citation text safely and saves the change into the editor", async ({
    page,
}) => {
    const errors = await mountGadget(page);
    const main = page.getByRole("dialog");
    await main
        .getByRole("tab", { name: "View sources (2)", exact: true })
        .click();
    await main
        .getByRole("button", { name: "Edit source", exact: true })
        .first()
        .click();
    const draft = page.getByRole("dialog", {
        name: "Edit citation source",
        exact: true,
    });
    const title = '<img src=x onerror="window.injected=true"> A revised source';
    await draft
        .getByRole("textbox", { name: "title content", exact: true })
        .fill(title);
    await expect(draft.locator("img")).toHaveCount(0);
    await draft
        .getByRole("button", { name: "Save citation", exact: true })
        .click();
    await expect(draft).not.toBeVisible();
    await expect(page.locator("#wpTextbox1")).toHaveValue(
        new RegExp("A revised source"),
    );
    expect(await page.evaluate(() => (window as any).injected)).toBeUndefined();
    expect(errors).toEqual([]);
});

test("creates a manual source and explains empty drafts before writing", async ({
    page,
}) => {
    const errors = await mountGadget(page);
    await page
        .getByRole("dialog")
        .getByRole("button", { name: "Create source", exact: true })
        .click();
    const draft = page.getByRole("dialog", {
        name: "Create citation source",
        exact: true,
    });
    const save = draft.getByRole("button", {
        name: "Save citation",
        exact: true,
    });
    await expect(save).toBeEnabled();
    await save.click();
    await expect(draft).toContainText("Enter at least one citation field.");
    await expect(page.locator("#wpTextbox1")).toHaveValue(initialSource);
    await draft
        .getByRole("textbox", { name: "title content", exact: true })
        .fill("A manually entered source");
    await draft
        .getByRole("textbox", { name: "url content", exact: true })
        .fill("https://example.test/manual");
    await save.click();
    await expect(draft).not.toBeVisible();
    await expect(page.locator("#wpTextbox1")).toHaveValue(
        new RegExp("A manually entered source"),
    );
    expect(errors).toEqual([]);
});

test("formats article citations and restores the session edits", async ({
    page,
}) => {
    const errors = await mountGadget(page);
    const dialog = page.getByRole("dialog");
    await dialog.getByRole("tab", { name: "Tools", exact: true }).click();
    await dialog
        .getByRole("button", { name: "Format citations", exact: true })
        .click();
    await expect(page.locator("#wpTextbox1")).not.toHaveValue(initialSource);
    await dialog
        .getByRole("button", { name: "Undo session changes", exact: true })
        .click();
    await expect(page.locator("#wpTextbox1")).toHaveValue(initialSource);
    expect(errors).toEqual([]);
});

for (const { direction, width } of [
    { direction: "ltr", width: 390 },
    { direction: "rtl", width: 390 },
    { direction: "ltr", width: 320 },
    { direction: "rtl", width: 320 },
]) {
    test(`keeps mobile ${direction} ${width}px dialog actions visible with primary first`, async ({
        page,
    }) => {
        await page.setViewportSize({ width, height: 844 });
        const errors = await mountGadget(page, { direction });
        const dialog = page.getByRole("dialog");
        await dialog.getByRole("tab", { name: "Tools", exact: true }).click();
        const primary = dialog.getByRole("button", {
            name: "Format citations",
            exact: true,
        });
        await expect(primary).toBeVisible();
        const buttons = dialog.locator(
            ".cf-source-manager__footer-actions > button",
        );
        const positions = await buttons.evaluateAll((elements) =>
            elements.map((element) => ({
                name: element.textContent?.trim(),
                top: element.getBoundingClientRect().top,
                right: element.getBoundingClientRect().right,
                left: element.getBoundingClientRect().left,
            })),
        );
        const sorted = positions.toSorted(
            (left, right) => left.top - right.top,
        );
        expect(sorted[0].name).toBe("Format citations");
        for (const position of positions) {
            expect(position.left).toBeGreaterThanOrEqual(0);
            expect(position.right).toBeLessThanOrEqual(width);
        }
        expect(
            await page.evaluate(() => document.documentElement.scrollWidth),
        ).toBeLessThanOrEqual(width);
        expect(errors).toEqual([]);
    });
}

for (const { locale, resolvedLocale, catalog } of [
    { locale: "zh", resolvedLocale: "zh-Hans", catalog: zhHansCatalog },
    { locale: "zh-tw", resolvedLocale: "zh-Hant", catalog: zhHantCatalog },
]) {
    for (const { artifact, delayMediaWiki } of [
        { artifact: "gadget", delayMediaWiki: false },
        { artifact: "userscript", delayMediaWiki: false },
        { artifact: "userscript", delayMediaWiki: true },
    ] as const) {
        test(`uses Chinese interface messages for ${locale} (${artifact}, ${delayMediaWiki ? "delayed" : "ready"} MediaWiki)`, async ({
            page,
        }) => {
            const errors = await mountGadget(page, {
                artifact,
                delayMediaWiki,
                locale,
                open: false,
            });
            const launcher = page.locator("#citation-formatter-quick-launch");
            await expect(launcher).toHaveText(catalog["tool.quickLaunch"]);
            await expect(launcher).toHaveAccessibleName(catalog["tool.open"]);
            await launcher.click();
            const dialog = page.getByRole("dialog", {
                name: catalog["tool.name"],
                exact: true,
            });
            await expect(dialog).toBeVisible();
            await expect(dialog).toHaveAttribute("lang", resolvedLocale);
            await expect(
                dialog.getByRole("searchbox", {
                    name: catalog["lookup.source"],
                    exact: true,
                }),
            ).toBeVisible();

            const manualSource = dialog.locator(
                ".cf-source-manager__manual-source",
            );
            await manualSource.getByRole("combobox").first().click();
            await page
                .getByRole("option", {
                    name: catalog["lookup.basedOnExisting"],
                    exact: true,
                })
                .click();
            await expect(manualSource).toContainText(catalog["lookup.basedOn"]);
            await expect(manualSource.getByRole("combobox").nth(1)).toHaveText(
                catalog["lookup.chooseExisting"],
            );

            const viewTab = dialog.getByRole("tab", {
                name: catalog["tabs.viewSources"].replace("{count}", "2"),
                exact: true,
            });
            await viewTab.click();
            await expect(dialog.getByRole("columnheader")).toHaveText([
                catalog["lookup.reference"],
                catalog["lookup.sourceColumn"],
                catalog["lookup.actions"],
            ]);
            await dialog
                .getByRole("tab", {
                    name: catalog["tabs.tools"],
                    exact: true,
                })
                .click();
            await expect(
                dialog.getByRole("button", {
                    name: catalog["tool.formatCitations"],
                    exact: true,
                }),
            ).toBeVisible();
            await expect(
                dialog.getByRole("checkbox", {
                    name: catalog["tools.formatScriptTitles"],
                    exact: true,
                }),
            ).toBeVisible();
            await viewTab.click();
            await dialog
                .getByRole("button", {
                    name: catalog["lookup.editSource"],
                    exact: true,
                })
                .first()
                .click();
            const draft = page.getByRole("dialog", {
                name: catalog["draft.editSourceTitle"],
                exact: true,
            });
            await expect(draft).toBeVisible();
            await expect(draft).toHaveAttribute("lang", resolvedLocale);
            await expect(
                draft.getByRole("textbox", {
                    name: catalog["draft.valueLabel"].replace(
                        "{parameter}",
                        "title",
                    ),
                    exact: true,
                }),
            ).toHaveValue("Sample source");
            await expect(
                draft.getByRole("button", {
                    name: catalog["draft.saveCitation"],
                    exact: true,
                }),
            ).toBeVisible();
            await expect(page.locator("#wpTextbox1")).toHaveValue(
                initialSource,
            );
            expect(errors).toEqual([]);
        });
    }
}

test("ignores other content models", async ({ page }) => {
    await mountGadget(page, { contentModel: "javascript", open: false });
    await expect(page.locator("#citation-formatter-quick-launch")).toHaveCount(
        0,
    );
});

test("captures the source and tools panels for visual review", async ({
    page,
}) => {
    const captureScreenshots = process.env.CITATION_UI_SCREENSHOTS === "1";
    await page.setViewportSize({ width: 1280, height: 720 });
    const errors = await mountGadget(
        page,
        captureScreenshots
            ? {
                  source: await readFile(
                      `${root}tests/fixtures/eternal-sonata.wikitext`,
                      "utf8",
                  ),
                  locale: "zh",
                  direction: "ltr",
                  wikiId: "zhwiki",
                  pageName: "信賴鈴音_～蕭邦之夢～",
              }
            : {},
    );
    const manualSection = await page
        .locator(".cf-source-manager__manual-source")
        .boundingBox();
    const manualSelect = await page
        .locator(".cf-source-manager__manual-source .cdx-select-vue")
        .boundingBox();
    expect(manualSection).not.toBeNull();
    expect(manualSelect).not.toBeNull();
    expect(manualSelect!.width).toBeCloseTo(manualSection!.width, 0);
    if (!captureScreenshots) return;
    await mkdir(`${root}docs/images`, { recursive: true });
    const dialog = page.getByRole("dialog");
    const sourcesTab = dialog.getByRole("tab", {
        name: zhHansCatalog["tabs.viewSources"].split("{count}")[0],
    });
    await dialog.screenshot({
        path: `${root}docs/images/add-source.png`,
        animations: "disabled",
    });
    await sourcesTab.click();
    await dialog.screenshot({
        path: `${root}docs/images/sources.png`,
        animations: "disabled",
    });
    await dialog
        .getByRole("tab", { name: zhHansCatalog["tabs.tools"], exact: true })
        .click();
    await dialog.screenshot({
        path: `${root}docs/images/tools.png`,
        animations: "disabled",
    });
    await page.setViewportSize({ width: 390, height: 844 });
    await dialog.screenshot({
        path: `${root}docs/images/tools-mobile.png`,
        animations: "disabled",
    });
    await page.setViewportSize({ width: 1280, height: 720 });
    await sourcesTab.click();
    await dialog
        .getByRole("button", {
            name: zhHansCatalog["lookup.editSource"],
            exact: true,
        })
        .first()
        .click();
    await page
        .getByRole("dialog", {
            name: zhHansCatalog["draft.editSourceTitle"],
            exact: true,
        })
        .screenshot({
            path: `${root}docs/images/edit-source.png`,
            animations: "disabled",
        });
    await page.setViewportSize({ width: 390, height: 844 });
    await page
        .getByRole("dialog", {
            name: zhHansCatalog["draft.editSourceTitle"],
            exact: true,
        })
        .screenshot({
            path: `${root}docs/images/edit-source-mobile.png`,
            animations: "disabled",
        });
    expect(errors).toEqual([]);
});

async function mountGadget(
    page: Page,
    options: {
        artifact?: "gadget" | "userscript";
        delayMediaWiki?: boolean;
        locale?: string;
        direction?: string;
        contentModel?: string;
        wikiId?: string;
        pageName?: string;
        open?: boolean;
        source?: string;
    } = {},
): Promise<string[]> {
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.route("https://**/*", (route) => route.abort());
    await page.setContent(
        '<html><head></head><body><div id="p-cactions"></div><label for="wpTextbox1">Article source</label><textarea id="wpTextbox1"></textarea></body></html>',
    );
    await page.addStyleTag({
        content: `${styles}\nbody { margin: 24px; font-family: sans-serif; } #wpTextbox1 { width: 100%; height: 200px; }`,
    });
    await page.addScriptTag({ content: runtime });
    await page.evaluate(
        ({
            source,
            locale,
            direction,
            contentModel,
            wikiId,
            pageName,
            delayMediaWiki,
        }) => {
            document.documentElement.dir = direction;
            const textarea = document.getElementById(
                "wpTextbox1",
            ) as HTMLTextAreaElement;
            textarea.value = source;
            textarea.setSelectionRange(source.length, source.length);
            const settings: Record<string, unknown> = {
                wgPageContentModel: contentModel,
                wgUserLanguage: locale,
                wgWikiID: wikiId,
                wgPageName: pageName,
                wgAction: "edit",
            };
            const mediaWiki = {
                config: { get: (key: string) => settings[key] },
                hook: () => ({ add() {}, remove() {} }),
                loader: {
                    using: async () => (name: string) =>
                        name === "vue"
                            ? (window as any).CitationTestUI.vue
                            : (window as any).CitationTestUI.codex,
                },
                Api: class {
                    async get() {
                        return { pages: {} };
                    }
                    async post() {
                        return { parse: { text: "" } };
                    }
                },
                notify() {},
                util: {
                    addCSS(css: string) {
                        const style = document.createElement("style");
                        style.textContent = css;
                        document.head.append(style);
                    },
                    addPortletLink(
                        portlet: string,
                        item: { id: string; text: string; href: string },
                    ) {
                        const link = document.createElement("a");
                        link.id = item.id;
                        link.href = item.href;
                        link.textContent = item.text;
                        document.getElementById(portlet)?.append(link);
                        return link;
                    },
                    getUrl: (title: string) => `/wiki/${title}`,
                    wikiScript: () => "/w/api.php",
                },
            };
            if (delayMediaWiki) {
                delete (window as any).mw;
                (window as any).CitationDelayedMediaWiki = mediaWiki;
            } else {
                (window as any).mw = mediaWiki;
            }
        },
        {
            source: options.source ?? initialSource,
            locale: options.locale ?? "en",
            direction: options.direction ?? "ltr",
            contentModel: options.contentModel ?? "wikitext",
            wikiId: options.wikiId ?? "enwiki",
            pageName: options.pageName ?? "Fixture",
            delayMediaWiki: options.delayMediaWiki ?? false,
        },
    );
    await page.addScriptTag({
        content: options.artifact === "userscript" ? userscript : gadget,
    });
    if (options.delayMediaWiki) {
        await expect(
            page.locator("#citation-formatter-quick-launch"),
        ).toHaveCount(0);
        await page.evaluate(() => {
            (window as any).mw = (window as any).CitationDelayedMediaWiki;
            delete (window as any).CitationDelayedMediaWiki;
        });
    }
    if (options.open !== false) {
        await page.locator("#citation-formatter-quick-launch").click();
        await expect(page.getByRole("dialog")).toBeVisible();
    }
    return errors;
}
