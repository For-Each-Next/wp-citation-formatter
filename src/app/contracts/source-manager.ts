/**
 * @file src/app/contracts/source-manager.ts
 * Purpose: Public configuration and injected ports for the source-manager UI.
 *
 * Table of contents:
 * 1. Imports
 * 2. ReferenceStyle
 * 3. SourceManagerOptions
 * 4. SourceArchiveMetadata
 * 5. ResolvedSourceMetadata
 * 6. SourceManagerDependencies
 * 7. OpenCitationFormatterDialog
 */

import type { Cs1ReviewWorkflow } from "./cs1-review.ts";
import type {
    CitationLayout,
    CitationTemplateDataMap,
} from "../../domain/types.ts";
import type { TemplateNameContext } from "../../domain/templates.ts";
import type { EditBox } from "./editor.ts";
import type { Logger } from "../../shared/logging/index.ts";
import type { ActionNotifier } from "../../platform/mediawiki/notifications/index.ts";

export type ReferenceStyle = "r" | "ref";

export interface SourceManagerOptions {
    citationLayout?: CitationLayout;
    referenceStyle?: ReferenceStyle;
}

export interface SourceArchiveMetadata {
    archiveDate: string;
    archiveUrl: string;
}

export interface ResolvedSourceMetadata extends SourceArchiveMetadata {
    archiveError: string;
    citeTemplate: string;
    metadataError: string;
    originalUrl: string;
}

export interface SourceManagerDependencies {
    writePreservingPosition(editor: EditBox, text: string): void;
    cs1Review: Cs1ReviewWorkflow;
    fetchAvailableArchive: (
        originalUrl: string,
    ) => Promise<SourceArchiveMetadata | null>;
    resolveSourceMetadata: (
        sourceInput: string,
        archiveSeed: SourceArchiveMetadata | null,
    ) => Promise<ResolvedSourceMetadata>;
    loadCitationTemplateData: (
        names: string[],
    ) => Promise<CitationTemplateDataMap>;
    loadTemplateNameContext: () => Promise<TemplateNameContext>;
    logger: Logger;
    notifyAction: ActionNotifier;
    resolveWikiLink: (value: string) => Promise<string>;
}

export type OpenCitationFormatterDialog = (
    editor: EditBox,
    options?: SourceManagerOptions,
) => Promise<void>;
