import { mkdir, readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { expect, test, type Page } from "@playwright/test";
import { build } from "esbuild";
import zhHansCatalog from "../../src/i18n/zh-Hans.json" with { type: "json" };
import zhHantCatalog from "../../src/i18n/zh-Hant.json" with { type: "json" };

const root = fileURLToPath(new URL("../..", import.meta.url));
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

test("cancels and safely inserts grouped reference details without duplicating the source", async ({
    page,
}) => {
    const source = [
        'Lead.<ref name="Book" group="note" details="p. 23" />',
        '<references group="note"><ref name="Book">{{Cite book|last=Smith|year=2020|title=Example book}}</ref></references>',
    ].join("\n");
    const errors = await mountGadget(page, { source });
    const main = page.getByRole("dialog", {
        name: "Citation formatter",
        exact: true,
    });
    await main.getByRole("tab", { name: "Tools", exact: true }).click();
    await main
        .getByRole("checkbox", {
            name: "Use {{r}} instead of <ref> when possible",
            exact: true,
        })
        .check();
    await main
        .getByRole("tab", { name: "View sources (1)", exact: true })
        .click();
    await expect(main.getByRole("row")).toHaveCount(3);
    const openDetails = main.getByRole("button", {
        name: "Use source",
        exact: true,
    });
    // macOS reserves Control-click for the context menu; dispatch the Windows gesture.
    await openDetails.dispatchEvent("click", { ctrlKey: true });
    const reuse = page.getByRole("dialog", {
        name: "Use with details",
        exact: true,
    });
    const field = reuse.getByRole("textbox", {
        name: "Reference details (page, quote, …)",
        exact: true,
    });
    await expect(field).toHaveValue("");
    const details =
        'p. "23" & <img src=x onerror="window.injected=true"> {{lang|en|chapter 2}}';
    const reference =
        '<ref name="Book" group="note" details="p. &quot;23&quot; &amp; &lt;img src=x onerror=&quot;window.injected=true&quot;&gt; {{lang|en|chapter 2}}" />';
    await field.fill(details);
    await expect(reuse.locator("code")).toHaveText(reference);
    await expect(reuse.locator("img")).toHaveCount(0);
    const cancel = reuse
        .locator(".cf-source-manager__reference-reuse-actions")
        .getByRole("button", { name: "Cancel", exact: true });
    const use = reuse.getByRole("button", { name: "Use source", exact: true });
    expect((await cancel.boundingBox())!.x).toBeLessThan(
        (await use.boundingBox())!.x,
    );
    await cancel.click();
    await expect(reuse).not.toBeVisible();
    await expect(page.locator("#wpTextbox1")).toHaveValue(source);

    await openDetails.click({ modifiers: ["Meta"] });
    await expect(field).toHaveValue("");
    await field.fill(details);
    await use.click();
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await expect(page.locator("#wpTextbox1")).toHaveValue(source + reference);
    expect(await page.evaluate(() => (window as any).injected)).toBeUndefined();
    expect(errors).toEqual([]);
});

test("starts new inline sub-reference details blank and uses the parent when cleared", async ({
    page,
}) => {
    const source =
        'Lead.<ref name="Book" details="{{lang|en|p. 23}}">{{Cite book|last=Smith|year=2020|title=Example book}}</ref>';
    const errors = await mountGadget(page, { source });
    const main = page.getByRole("dialog", {
        name: "Citation formatter",
        exact: true,
    });
    await main.getByRole("tab", { name: "Tools", exact: true }).click();
    await main
        .getByRole("checkbox", {
            name: "Use {{r}} instead of <ref> when possible",
            exact: true,
        })
        .check();
    await main
        .getByRole("tab", { name: "View sources (1)", exact: true })
        .click();
    await main
        .getByRole("button", { name: "Use source", exact: true })
        .dispatchEvent("click", { ctrlKey: true });
    const reuse = page.getByRole("dialog", {
        name: "Use with details",
        exact: true,
    });
    const field = reuse.getByRole("textbox", {
        name: "Reference details (page, quote, …)",
        exact: true,
    });
    await expect(field).toHaveValue("");
    await field.fill("{{lang|en|p. 24}}");
    await expect(reuse.locator("code")).toHaveText(
        '<ref name="Book" details="{{lang|en|p. 24}}" />',
    );
    await field.fill("");
    await expect(reuse.locator("code")).toHaveText("{{r|Book}}");
    await reuse
        .getByRole("button", { name: "Use source", exact: true })
        .click();
    await expect(page.locator("#wpTextbox1")).toHaveValue(
        source + "{{r|Book}}",
    );
    expect(errors).toEqual([]);
});

test("offers reference details only for named native sources and refuses removed parents", async ({
    page,
}) => {
    const source =
        '<ref>{{Cite web|title=Anonymous}}</ref><ref name="Book">{{Cite book|title=Example book}}</ref>';
    const errors = await mountGadget(page, { source });
    const main = page.getByRole("dialog", {
        name: "Citation formatter",
        exact: true,
    });
    await main
        .getByRole("tab", { name: "View sources (2)", exact: true })
        .click();
    const anonymous = main
        .getByRole("row")
        .filter({ hasText: "Anonymous" })
        .getByRole("button", { name: "Use source", exact: true });
    await expect(anonymous).toHaveAttribute("title", "Use source");
    const action = main
        .getByRole("row")
        .filter({ hasText: "Example book" })
        .getByRole("button", {
            name: "Use source",
            exact: true,
        });
    await expect(action).toHaveAttribute(
        "title",
        /Ctrl.*Command|Command.*Ctrl/,
    );
    await action.dispatchEvent("click", { ctrlKey: true });
    const reuse = page.getByRole("dialog", {
        name: "Use with details",
        exact: true,
    });
    await reuse
        .getByRole("textbox", {
            name: "Reference details (page, quote, …)",
            exact: true,
        })
        .fill("p. 23");
    await page.locator("#wpTextbox1").evaluate((element) => {
        (element as HTMLTextAreaElement).value = "Parent removed.";
    });
    await reuse
        .getByRole("button", { name: "Use source", exact: true })
        .click();
    await expect(reuse).toContainText("The selected citation is unavailable.");
    await expect(page.locator("#wpTextbox1")).toHaveValue("Parent removed.");
    expect(errors).toEqual([]);
});

test("merges identical sub-reference details beneath a source and edits or reuses the group", async ({
    page,
}) => {
    const safeDetails =
        '<img src=x onerror="window.injected=true"> {{lang|en|p. 24}}';
    const source = [
        'Lead.<ref name="Book" details="p. 23" dir="ltr" />',
        "Repeat.<ref details='p.&#32;23' name='Book' data-note='keep' />",
        'Safety.<ref name="Book" details="&lt;img src=x onerror=&quot;window.injected=true&quot;&gt; {{lang|en|p. 24}}" />',
        '<ref name="Book">{{Cite book|last=Smith|year=2020|title=Example book}}</ref>',
        '<ref name="Second">{{Cite book|last=Jones|year=2021|title=Second book}}</ref>',
    ].join("\n");
    const errors = await mountGadget(page, { source });
    const main = page.getByRole("dialog", {
        name: "Citation formatter",
        exact: true,
    });
    await main
        .getByRole("tab", { name: "View sources (2)", exact: true })
        .click();
    const rows = main.getByRole("row");
    await expect(rows).toHaveCount(5);
    await expect(rows.nth(1).getByRole("rowheader")).toContainText("Smith");
    await expect(rows.nth(1).getByRole("rowheader")).toContainText("2020");
    await expect(rows.nth(1).getByRole("rowheader")).toContainText(
        "4× (with 3 sub-refs)",
    );
    await expect(rows.nth(1).getByRole("cell").first()).toHaveText(
        "Example book",
    );
    await expect(rows.nth(2).getByRole("cell").first()).toContainText("p. 23");
    await expect(rows.nth(2).getByRole("rowheader")).toContainText("2×");
    await expect(rows.nth(3).getByRole("cell").first()).toContainText(
        safeDetails,
    );
    await expect(rows.nth(3).getByRole("rowheader")).toContainText("1×");
    await expect(rows.nth(4).getByRole("cell").first()).toHaveText(
        "Second book",
    );
    await expect(main.locator("img")).toHaveCount(0);
    await expect(
        main.getByRole("button", { name: "Use source", exact: true }),
    ).toHaveCount(2);
    await expect(
        main.getByRole("button", { name: "Reuse sub-reference", exact: true }),
    ).toHaveCount(2);
    await expect(
        main.getByRole("button", { name: "Edit sub-reference", exact: true }),
    ).toHaveCount(2);

    const editGroupedDetails = rows.nth(2).getByRole("button", {
        name: "Edit sub-reference",
        exact: true,
    });
    await editGroupedDetails.click();
    const edit = page.getByRole("dialog", {
        name: "Edit sub-reference",
        exact: true,
    });
    await expect(edit).toContainText(
        "Changes apply to all 2 uses of these details.",
    );
    const field = edit.getByRole("textbox", {
        name: "Reference details (page, quote, …)",
        exact: true,
    });
    await expect(field).toHaveValue("p. 23");
    await field.fill("p. 99");
    await edit
        .locator(".cf-source-manager__reference-reuse-actions")
        .getByRole("button", { name: "Cancel", exact: true })
        .click();
    await expect(edit).not.toBeVisible();
    await expect(main).toBeVisible();
    await expect(page.locator("#wpTextbox1")).toHaveValue(source);

    await editGroupedDetails.click();
    await expect(field).toHaveValue("p. 23");
    await field.fill("p. 99");
    await edit
        .getByRole("button", { name: "Save changes", exact: true })
        .click();
    const updated = source
        .replace('details="p. 23"', 'details="p. 99"')
        .replace("details='p.&#32;23'", 'details="p. 99"');
    await expect(edit).not.toBeVisible();
    await expect(main).toBeVisible();
    await expect(page.locator("#wpTextbox1")).toHaveValue(updated);
    await expect(rows.nth(2).getByRole("cell").first()).toContainText("p. 99");
    await expect(rows.nth(2).getByRole("rowheader")).toContainText("2×");
    await expect(rows.nth(3).getByRole("cell").first()).toContainText(
        safeDetails,
    );

    await page.setViewportSize({ width: 390, height: 844 });
    for (const name of ["Reuse sub-reference", "Edit sub-reference"]) {
        const action = rows.nth(2).getByRole("button", { name, exact: true });
        await expect(action).toBeVisible();
        const bounds = (await action.boundingBox())!;
        expect(bounds.x).toBeGreaterThanOrEqual(0);
        expect(bounds.x + bounds.width).toBeLessThanOrEqual(390);
    }
    expect(
        await page.evaluate(() => document.documentElement.scrollWidth),
    ).toBeLessThanOrEqual(390);
    await rows
        .nth(2)
        .getByRole("button", { name: "Reuse sub-reference", exact: true })
        .click();
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await expect(page.locator("#wpTextbox1")).toHaveValue(
        updated + '<ref name="Book" details="p. 99" />',
    );

    await page.locator("#citation-formatter-quick-launch").click();
    await main
        .getByRole("tab", { name: "View sources (2)", exact: true })
        .click();
    await expect(main.getByRole("row")).toHaveCount(5);
    await expect(
        main.getByRole("row").nth(2).getByRole("rowheader"),
    ).toContainText("3×");
    await expect(
        main.getByRole("row").nth(1).getByRole("rowheader"),
    ).toContainText("5× (with 4 sub-refs)");
    await expect(
        main.getByRole("button", { name: "Reuse sub-reference", exact: true }),
    ).toHaveCount(2);
    await expect(main.locator("img")).toHaveCount(0);
    expect(await page.evaluate(() => (window as any).injected)).toBeUndefined();
    expect(errors).toEqual([]);
});

for (const viewport of [
    { width: 1280, height: 720 },
    { width: 390, height: 844 },
]) {
    test(`keeps a source frozen above its dotted sub-reference rows until the next source (${viewport.width}px)`, async ({
        page,
    }) => {
        const source = [
            '<ref name="Book">{{Cite book|last=Smith|year=2020|title=Example book}}</ref>',
            ...Array.from(
                { length: 24 },
                (_, index) =>
                    `Detail.<ref name="Book" details="p. ${index + 1}" />`,
            ),
            '<ref name="Second">{{Cite book|last=Jones|year=2021|title=Second book}}</ref>',
            ...Array.from(
                { length: 20 },
                (_, index) =>
                    `Next detail.<ref name="Second" details="p. ${index + 1}" />`,
            ),
            '<ref name="Last">{{Cite book|last=Nguyen|year=2022|title=Last book}}</ref>',
        ].join("\n");
        await page.setViewportSize(viewport);
        const errors = await mountGadget(page, { source });
        const main = page.getByRole("dialog");
        await main
            .getByRole("tab", { name: "View sources (3)", exact: true })
            .click();
        const groups = main.locator(".cf-source-manager__source-group");
        await expect(groups).toHaveCount(3);
        const firstParent = groups
            .nth(0)
            .locator(".cf-source-manager__source-group-main");
        const secondParent = groups
            .nth(1)
            .locator(".cf-source-manager__source-group-main");
        const firstChildren = groups
            .nth(0)
            .locator(".cf-source-manager__sub-reference-row");
        await expect(firstChildren).toHaveCount(24);
        await expect(
            firstChildren.nth(0).getByRole("cell").first(),
        ).toContainText("p. 1");
        await expect(
            firstChildren.nth(23).getByRole("cell").first(),
        ).toContainText("p. 24");
        await expect(firstParent.getByRole("rowheader")).toContainText(
            "25× (with 24 sub-refs)",
        );
        const separatorStyles = await groups.nth(0).evaluate((group) => {
            const child = group.querySelector(
                ".cf-source-manager__sub-reference-row [role=cell]",
            )!;
            return {
                source: getComputedStyle(group).borderTopStyle,
                details: getComputedStyle(child).borderTopStyle,
            };
        });
        expect(separatorStyles).toEqual({ source: "solid", details: "dotted" });

        const body = main.locator(".cdx-dialog__body");
        const tabs = main.getByRole("tablist");
        await body.evaluate((element) => {
            const group = element.querySelector(
                ".cf-source-manager__source-group",
            )!;
            const header = element.querySelector(".cdx-tabs__header")!;
            element.scrollTop +=
                group.getBoundingClientRect().top -
                header.getBoundingClientRect().bottom +
                180;
        });
        await expect(firstParent).toBeInViewport();
        const pinnedBefore = (await firstParent.boundingBox())!;
        const childBefore = (await firstChildren.nth(12).boundingBox())!;
        const tabsBefore = (await tabs.boundingBox())!;
        expect(pinnedBefore.y).toBeCloseTo(tabsBefore.y + tabsBefore.height, 0);
        await body.evaluate((element) => {
            element.scrollTop += 160;
        });
        const pinnedAfter = (await firstParent.boundingBox())!;
        const childAfter = (await firstChildren.nth(12).boundingBox())!;
        expect(pinnedAfter.y).toBeCloseTo(pinnedBefore.y, 0);
        expect(childBefore.y - childAfter.y).toBeCloseTo(160, 0);
        const background = await firstParent.evaluate(
            (element) => getComputedStyle(element).backgroundColor,
        );
        expect(background).not.toBe("rgba(0, 0, 0, 0)");
        for (const name of ["Use source", "Edit source"]) {
            const action = firstParent.getByRole("button", {
                name,
                exact: true,
            });
            await expect(action).toBeInViewport();
            const bounds = (await action.boundingBox())!;
            expect(bounds.x).toBeGreaterThanOrEqual(0);
            expect(bounds.x + bounds.width).toBeLessThanOrEqual(viewport.width);
        }

        await body.evaluate((element) => {
            const nextGroup = element.querySelectorAll(
                ".cf-source-manager__source-group",
            )[1]!;
            const header = element.querySelector(".cdx-tabs__header")!;
            element.scrollTop +=
                nextGroup.getBoundingClientRect().top -
                header.getBoundingClientRect().bottom +
                180;
        });
        await expect(secondParent).toBeInViewport();
        const nextPinned = (await secondParent.boundingBox())!;
        const released = (await firstParent.boundingBox())!;
        const tabsAfter = (await tabs.boundingBox())!;
        expect(nextPinned.y).toBeCloseTo(tabsAfter.y + tabsAfter.height, 0);
        expect(released.y + released.height).toBeLessThanOrEqual(nextPinned.y);
        await expect(secondParent.getByRole("rowheader")).toContainText(
            "21× (with 20 sub-refs)",
        );
        expect(
            await page.evaluate(() => document.documentElement.scrollWidth),
        ).toBeLessThanOrEqual(viewport.width);
        await expect(page.locator("#wpTextbox1")).toHaveValue(source);
        expect(errors).toEqual([]);
    });
}

test("reuses inline sub-reference details as a fresh call without repeating the source", async ({
    page,
}) => {
    const source =
        'Lead.<ref name="Book" details="{{lang|en|p. 23}}">{{Cite book|last=Smith|year=2020|title=Example book}}</ref>';
    const errors = await mountGadget(page, { source });
    const main = page.getByRole("dialog");
    await main
        .getByRole("tab", { name: "View sources (1)", exact: true })
        .click();
    await expect(main.getByRole("row")).toHaveCount(3);
    await main
        .getByRole("button", { name: "Reuse sub-reference", exact: true })
        .click();
    await expect(page.locator("#wpTextbox1")).toHaveValue(
        source + '<ref name="Book" details="{{lang|en|p. 23}}" />',
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
            await expect(action).toHaveAttribute(
                "title",
                name === "Use source" ? /Ctrl.*Command|Command.*Ctrl/ : name,
            );
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
        expect(positions.map((action) => action.name)).toEqual(
            sorted.map((action) => action.name),
        );
        await primary.focus();
        await page.keyboard.press("Tab");
        await expect(buttons.nth(1)).toBeFocused();
        await page.keyboard.press("Tab");
        await expect(buttons.nth(2)).toBeFocused();
        for (const position of positions) {
            expect(position.left).toBeGreaterThanOrEqual(0);
            expect(position.right).toBeLessThanOrEqual(width);
        }
        expect(
            await page.evaluate(() => document.documentElement.scrollWidth),
        ).toBeLessThanOrEqual(width);
        await dialog
            .getByRole("tab", { name: "View sources (2)", exact: true })
            .click();
        await dialog
            .getByRole("button", { name: "Use source", exact: true })
            .first()
            .dispatchEvent("click", { ctrlKey: true });
        const details = page.getByRole("dialog", {
            name: "Use with details",
            exact: true,
        });
        const detailsPrimary = details.getByRole("button", {
            name: "Use source",
            exact: true,
        });
        const cancel = details
            .locator(".cf-source-manager__footer-actions")
            .getByRole("button", { name: "Cancel", exact: true });
        await expect(detailsPrimary).toBeVisible();
        await expect(cancel).toHaveClass(/cdx-button--action-default/);
        expect((await detailsPrimary.boundingBox())!.y).toBeLessThan(
            (await cancel.boundingBox())!.y,
        );
        expect(
            await page.evaluate(() => document.documentElement.scrollWidth),
        ).toBeLessThanOrEqual(width);
        await detailsPrimary.focus();
        await page.keyboard.press("Tab");
        await expect(cancel).toBeFocused();
        await page.setViewportSize({ width: 1024, height: 768 });
        await expect(
            details
                .locator(".cf-source-manager__footer-actions > button")
                .first(),
        ).toHaveText("Cancel");
        await expect(cancel).toBeFocused();
        await cancel.focus();
        await page.keyboard.press("Tab");
        await expect(detailsPrimary).toBeFocused();
        const cancelBox = (await cancel.boundingBox())!;
        const primaryBox = (await detailsPrimary.boundingBox())!;
        if (direction === "ltr") expect(cancelBox.x).toBeLessThan(primaryBox.x);
        else expect(cancelBox.x).toBeGreaterThan(primaryBox.x);
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
            const source = [
                initialSource,
                '<ref name="sample" details="p. 23" />',
                '<ref name="sample" details="p. 23" />',
                '<ref name="sample" details="p. 24" />',
            ].join("\n");
            const errors = await mountGadget(page, {
                artifact,
                delayMediaWiki,
                locale,
                open: false,
                source,
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
                catalog["lookup.authorYear"],
                catalog["lookup.sourceColumn"],
                catalog["lookup.actions"],
            ]);
            await expect(dialog.getByRole("rowheader").first()).toContainText(
                catalog["lookup.sourceUsageWithSubReferences"]
                    .replace("{count}", "4")
                    .replace("{subCount}", "3"),
            );
            const subReferences = dialog.locator(
                ".cf-source-manager__sub-reference-row",
            );
            await expect(subReferences).toHaveCount(2);
            await expect(
                subReferences.nth(0).getByRole("rowheader"),
            ).toContainText("2×");
            await expect(
                subReferences.nth(0).getByRole("cell").first(),
            ).toContainText("p. 23");
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
            await expect(page.locator("#wpTextbox1")).toHaveValue(source);
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
    const captureScreenshots =
        process.env.DOCUMENTATION_SCREENSHOTS === "1" ||
        process.env.CITATION_UI_SCREENSHOTS === "1";
    await page.setViewportSize({ width: 1024, height: 768 });
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
    expect(await page.evaluate(() => window.devicePixelRatio)).toBe(1);
    const dialog = page.getByRole("dialog");
    const sourcesTab = dialog.getByRole("tab", {
        name: zhHansCatalog["tabs.viewSources"].split("{count}")[0],
    });
    await expect(
        page.locator(
            ".cdx-dialog-fade-enter-active, .cdx-dialog-fade-leave-active",
        ),
    ).toHaveCount(0);
    await page.screenshot({
        path: `${root}docs/images/add-source.png`,
        animations: "disabled",
    });
    await sourcesTab.click();
    await expect(
        page.locator(
            ".cdx-dialog-fade-enter-active, .cdx-dialog-fade-leave-active",
        ),
    ).toHaveCount(0);
    await page.screenshot({
        path: `${root}docs/images/sources.png`,
        animations: "disabled",
    });
    await dialog
        .getByRole("tab", { name: zhHansCatalog["tabs.tools"], exact: true })
        .click();
    await expect(
        page.locator(
            ".cdx-dialog-fade-enter-active, .cdx-dialog-fade-leave-active",
        ),
    ).toHaveCount(0);
    await page.screenshot({
        path: `${root}docs/images/tools.png`,
        animations: "disabled",
    });

    await dialog
        .getByRole("button", {
            name: zhHansCatalog["tools.analyze"],
            exact: true,
        })
        .click();
    const reviewDialog = page.getByRole("dialog", {
        name: zhHansCatalog["analysis.title"],
        exact: true,
    });
    await expect(reviewDialog).toBeVisible();
    await expect(
        page.locator(
            ".cdx-dialog-fade-enter-active, .cdx-dialog-fade-leave-active",
        ),
    ).toHaveCount(0);
    await page.screenshot({
        path: `${root}docs/images/tools-review.png`,
        animations: "disabled",
    });
    await reviewDialog
        .locator(".cdx-dialog__footer")
        .getByRole("button", {
            name: zhHansCatalog["common.close"],
            exact: true,
        })
        .click();
    await page.setViewportSize({ width: 1024, height: 768 });
    await sourcesTab.click();
    await dialog
        .getByRole("button", {
            name: zhHansCatalog["lookup.editSource"],
            exact: true,
        })
        .first()
        .click();
    await expect(
        page.locator(
            ".cdx-dialog-fade-enter-active, .cdx-dialog-fade-leave-active",
        ),
    ).toHaveCount(0);
    await page.screenshot({
        path: `${root}docs/images/edit-source.png`,
        animations: "disabled",
    });

    await page
        .getByRole("dialog", {
            name: zhHansCatalog["draft.editSourceTitle"],
            exact: true,
        })
        .locator(".cdx-dialog__body")
        .evaluate((body) => {
            body.scrollTop = body.scrollHeight;
        });
    await expect(
        page.locator(
            ".cdx-dialog-fade-enter-active, .cdx-dialog-fade-leave-active",
        ),
    ).toHaveCount(0);
    await page.screenshot({
        path: `${root}docs/images/edit-source-fields.png`,
        animations: "disabled",
    });
    expect(errors).toEqual([]);

    const detailsPage = await page.context().newPage();
    try {
        await detailsPage.setViewportSize({ width: 1024, height: 768 });
        const detailsErrors = await mountGadget(detailsPage, {
            source: await readFile(
                `${root}tests/fixtures/mother3-sub-references.wikitext`,
                "utf8",
            ),
            locale: "zh",
            direction: "ltr",
            wikiId: "zhwiki",
            pageName: "地球冒险3",
        });
        const detailsMain = detailsPage.getByRole("dialog");
        await detailsMain
            .getByRole("tab", {
                name: zhHansCatalog["tabs.viewSources"].split("{count}")[0],
            })
            .click();
        async function showSourceTable(): Promise<void> {
            await detailsMain.locator(".cdx-dialog__body").evaluate((body) => {
                const table = body.querySelector(
                    ".cf-source-manager__source-table",
                )!;
                const tabs = body.querySelector(".cdx-tabs__header")!;
                body.scrollTop +=
                    table.getBoundingClientRect().top -
                    tabs.getBoundingClientRect().bottom;
            });
        }
        await showSourceTable();
        await expect(
            detailsPage.locator(
                ".cdx-dialog-fade-enter-active, .cdx-dialog-fade-leave-active",
            ),
        ).toHaveCount(0);
        await detailsPage.screenshot({
            path: `${root}docs/images/sub-reference-sources.png`,
            animations: "disabled",
        });

        const detailsFilter = detailsMain.getByPlaceholder(
            zhHansCatalog["lookup.filterKeywordPlaceholder"],
        );
        await detailsFilter.fill("Hobonichi2006");
        await showSourceTable();
        await expect(
            detailsPage.locator(
                ".cdx-dialog-fade-enter-active, .cdx-dialog-fade-leave-active",
            ),
        ).toHaveCount(0);
        await detailsPage.screenshot({
            path: `${root}docs/images/sub-reference-filtered.png`,
            animations: "disabled",
        });
        await detailsPage.setViewportSize({ width: 1024, height: 768 });
        await detailsFilter.fill("");
        await detailsMain
            .getByRole("button", {
                name: zhHansCatalog["lookup.useSource"],
                exact: true,
            })
            .nth(1)
            .click({ modifiers: ["ControlOrMeta"] });
        const detailsDialog = detailsPage.getByRole("dialog", {
            name: zhHansCatalog["lookup.useWithDetails"],
            exact: true,
        });
        await expect(detailsDialog).toBeVisible();
        await expect(
            detailsPage.locator(
                ".cdx-dialog-fade-enter-active, .cdx-dialog-fade-leave-active",
            ),
        ).toHaveCount(0);
        await detailsPage.screenshot({
            path: `${root}docs/images/reference-details.png`,
            animations: "disabled",
        });

        await detailsDialog
            .getByRole("textbox", {
                name: zhHansCatalog["lookup.referenceDetails"],
                exact: true,
            })
            .fill("p. 23 {{lang|en|Chapter 2}}");
        await expect(
            detailsPage.locator(
                ".cdx-dialog-fade-enter-active, .cdx-dialog-fade-leave-active",
            ),
        ).toHaveCount(0);
        await detailsPage.screenshot({
            path: `${root}docs/images/reference-details-filled.png`,
            animations: "disabled",
        });
        expect(detailsErrors).toEqual([]);
    } finally {
        await detailsPage.close();
    }
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
