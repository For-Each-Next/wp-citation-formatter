/**
 * @file src/features/source-manager/styles.ts
 * Purpose: Installs Citation Formatter styles bundled with the gadget.
 *
 * Table of contents:
 * 1. Imports
 * 2. Constants and state
 * 3. installCitationFormatterStyles
 * 4. getBundledStyles
 * 5. isNonEmpty
 */

import { SOURCE_MANAGER_DIALOG_STYLES } from "./dialogs.ts";

let installed = false;

/** Adds the gadget stylesheet to the page once. */
export function installCitationFormatterStyles(): void {
    if (installed) {
        return;
    }
    const css = getBundledStyles();
    if (css !== "") {
        mw.util.addCSS(css);
    }
    installed = true;
}

/**
 * Returns the stylesheet injected by the gadget build.
 *
 * @returns The stylesheet injected by the gadget build.
 */
function getBundledStyles(): string {
    const sharedStyles =
        typeof __CITATION_FORMATTER_STYLES__ === "undefined"
            ? ""
            : __CITATION_FORMATTER_STYLES__;
    return [sharedStyles, SOURCE_MANAGER_DIALOG_STYLES]
        .filter(isNonEmpty)
        .join("\n");
}

function isNonEmpty(value: string): boolean {
    return value !== "";
}
