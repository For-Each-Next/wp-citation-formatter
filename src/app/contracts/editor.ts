/**
 * @file src/app/contracts/editor.ts
 * Purpose: Runtime ports used by the MediaWiki editor integration.
 *
 * Table of contents:
 * 1. Imports
 * 2. EditBox
 * 3. EditorRuntime
 */

import type { Logger } from "../../shared/logging/index.ts";
import type { ActionNotifier } from "../../platform/mediawiki/notifications/index.ts";

/** Editor operations consumed by application features. */
export interface EditBox {
    readonly element: HTMLTextAreaElement | null;
    focus(): void;
    read(): string;
    replaceSelection(text: string): void;
    write(text: string): void;
}

export interface EditorRuntime {
    getEditor(): EditBox | null;
    logger: Logger;
    notifyAction: ActionNotifier;
}
