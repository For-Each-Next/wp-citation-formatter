/**
 * @file src/i18n/index.ts
 * Purpose: Citation Formatter locale registry and domain-message adapters.
 *
 * Table of contents:
 * 1. Imports
 * 2. Constants and state
 * 3. MessageId
 * 4. CitationFormatterI18n
 * 5. createCitationFormatterI18n
 * 6. initializeCitationFormatterI18n
 * 7. msg
 */

import * as i18n from "../shared/i18n/index.ts";
import { getMediaWikiInterfaceLanguage } from "../platform/mediawiki/interface-language.ts";
import englishCatalog from "./en.json" with { type: "json" };
import zhHansCatalog from "./zh-Hans.json" with { type: "json" };
import zhHantCatalog from "./zh-Hant.json" with { type: "json" };

export const english = englishCatalog;
export const simplifiedChinese: i18n.LocaleCatalog<typeof english> =
    zhHansCatalog;
export const traditionalChinese: i18n.LocaleCatalog<typeof english> =
    zhHantCatalog;

const catalogs = {
    en: english,
    "zh-Hans": simplifiedChinese,
    "zh-Hant": traditionalChinese,
};

export type MessageId = Extract<keyof typeof english, string>;

export interface CitationFormatterI18n {
    interfaceLocale: string;
    msg(id: MessageId, values?: i18n.MessageValues): string;
}

/**
 * Creates a formatter translator for an explicit or detected UI locale.
 *
 * @param locale - Requested interface locale.
 * @returns Locale-resolved formatter messages.
 */
export function createCitationFormatterI18n(
    locale: string = getMediaWikiInterfaceLanguage(),
): CitationFormatterI18n {
    const translator = i18n.createTranslator(catalogs, locale);
    return {
        interfaceLocale: translator.locale,
        msg(id, values) {
            return translator.text(id, values);
        },
    };
}

let messages = createCitationFormatterI18n("en");

export let interfaceLocale = messages.interfaceLocale;

/** Selects the runtime locale after MediaWiki has become ready. */
export function initializeCitationFormatterI18n(): void {
    messages = createCitationFormatterI18n();
    interfaceLocale = messages.interfaceLocale;
}

/** Translates a message using the initialized runtime locale. */
export function msg(id: MessageId, values?: i18n.MessageValues): string {
    return messages.msg(id, values);
}
