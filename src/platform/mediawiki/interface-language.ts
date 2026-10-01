/** Reads the interface language selected by the current MediaWiki user. */
export function getMediaWikiInterfaceLanguage(): string {
    if (typeof mw === "undefined") {
        return "en";
    }
    return String(mw.config.get("wgUserLanguage") || "en");
}
