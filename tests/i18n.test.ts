/**
 * @file tests/i18n.test.ts
 * Purpose: Locale selection, placeholders, and localized domain diagnostics.
 *
 * Table of contents:
 * 1. Imports
 * 2. placeholders
 * 3. Test scenarios
 */

import assert from "node:assert/strict";
import test from "node:test";

import {
    createCitationFormatterI18n,
    english,
    initializeCitationFormatterI18n,
    interfaceLocale,
    msg,
    simplifiedChinese,
    traditionalChinese,
} from "../src/i18n/index.ts";
import {
    createSourceAnalysisMessages,
    createSourceValidationMessages,
    sourceAnalysisMessages,
    sourceValidationMessages,
} from "../src/features/source-manager/messages.ts";

function placeholders(message: string): string[] {
    return [...message.matchAll(/(?<!\{)\{([A-Za-z][A-Za-z0-9]*)\}(?!\})/gu)]
        .map((match) => match[1])
        .toSorted();
}

test("keeps translated catalogs and named placeholders aligned", () => {
    const ids = (
        Object.keys(english) as Array<keyof typeof english>
    ).toSorted();
    for (const catalog of [simplifiedChinese, traditionalChinese]) {
        assert.deepEqual(Object.keys(catalog).toSorted(), ids);
        for (const id of ids) {
            assert.deepEqual(
                placeholders(catalog[id]),
                placeholders(english[id]),
                id,
            );
        }
    }
});

test("resolves MediaWiki Chinese variants and English fallback", () => {
    for (const locale of ["zh", "zh-CN", "zh-Hans", "zh-SG"]) {
        assert.equal(
            createCitationFormatterI18n(locale).interfaceLocale,
            "zh-Hans",
        );
    }
    for (const locale of ["zh-HK", "zh-Hant", "zh-MO", "zh-TW"]) {
        assert.equal(
            createCitationFormatterI18n(locale).interfaceLocale,
            "zh-Hant",
        );
    }
    assert.equal(createCitationFormatterI18n("fr").interfaceLocale, "en");
});

test("localizes imported UI and diagnostic messages when MediaWiki becomes ready", () => {
    const previousMediaWiki = Object.getOwnPropertyDescriptor(globalThis, "mw");
    try {
        Reflect.deleteProperty(globalThis, "mw");
        initializeCitationFormatterI18n();
        assert.equal(msg("tool.name"), english["tool.name"]);

        let locale = "en";
        Object.defineProperty(globalThis, "mw", {
            configurable: true,
            value: {
                config: {
                    get(key: string) {
                        assert.equal(key, "wgUserLanguage");
                        return locale;
                    },
                },
            },
        });

        for (const selection of [
            {
                locale: "zh-cn",
                resolved: "zh-Hans",
                catalog: simplifiedChinese,
            },
            {
                locale: "zh-tw",
                resolved: "zh-Hant",
                catalog: traditionalChinese,
            },
            { locale: "fr", resolved: "en", catalog: english },
        ]) {
            locale = selection.locale;
            initializeCitationFormatterI18n();
            assert.equal(interfaceLocale, selection.resolved);
            assert.equal(msg("tool.name"), selection.catalog["tool.name"]);
            assert.equal(
                sourceAnalysisMessages.untitledSource(),
                selection.catalog["common.untitledSource"],
            );
            assert.equal(
                sourceValidationMessages.unsupportedParameter("example"),
                createCitationFormatterI18n(locale).msg(
                    "validation.unsupportedParameter",
                    { parameter: "example" },
                ),
            );
        }
    } finally {
        if (previousMediaWiki == null) {
            Reflect.deleteProperty(globalThis, "mw");
        } else {
            Object.defineProperty(globalThis, "mw", previousMediaWiki);
        }
        initializeCitationFormatterI18n();
    }
});

test("interpolates counts and domain diagnostics in the selected locale", () => {
    const translator = createCitationFormatterI18n("zh-TW");
    const validation = createSourceValidationMessages(translator);
    const analysis = createSourceAnalysisMessages(translator);
    const tabs = translator.msg("tabs.viewSources", { count: 3 });
    assert.match(tabs, /3/u);
    assert.doesNotMatch(tabs, /\{count\}/u);
    assert.equal(
        validation.unsupportedParameter("example"),
        "CS1不支援example參數。",
    );
    assert.equal(analysis.untitledSource(), "無標題來源");
    const simplified = createCitationFormatterI18n("zh-CN");
    const formatted = simplified.msg("feedback.citationsFormattedMany", {
        count: 132,
    });
    const renamed = simplified.msg("feedback.refTagsRenamedMany", {
        count: 37,
    });
    assert.equal(
        simplified.msg("feedback.formatSummaryNoSkipped", {
            formatted,
            renamed,
        }),
        "已格式化132条引文；已重命名37个<ref>标签。",
    );
});
