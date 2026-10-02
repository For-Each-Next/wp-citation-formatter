/**
 * @file src/app/main.ts
 * Purpose: Composition root for the browser gadget.
 *
 * Table of contents:
 * 1. Imports
 * 2. Constants and state
 * 3. BrowserRuntime
 * 4. start
 * 5. mountWhenMediaWikiIsReady
 * 6. isWikitextPage
 * 7. mountCitationFormatter
 * 8. getTemplateDataStorage
 */

import {
    buildCs1CheckWikitext,
    requestCs1WikitextCheck,
    splitCs1CheckHtml,
} from "../platform/mediawiki/cs1-check.ts";
import {
    fetchAvailableArchive,
    resolveSourceMetadata,
} from "../platform/network/source-metadata.ts";
import {
    createTemplateDataObjectStorage,
    loadCitationTemplateData,
    type TemplateDataObjectStorage,
} from "../platform/mediawiki/template-data.ts";
import { resolveCitationWikiLink } from "../platform/mediawiki/wiki-link.ts";
import { createTemplateNameContextResolver } from "../platform/mediawiki/namespaces.ts";
import * as citationEditor from "../features/editor/command.ts";
import * as sourceManagerUi from "../features/source-manager/controller.ts";
import { createCs1ReviewWorkflow } from "./workflows/cs1-review.ts";
import { initializeCitationFormatterI18n, msg } from "../i18n/index.ts";
import {
    createLogger,
    type Logger,
    type StopTimer,
} from "../shared/logging/index.ts";
import {
    createActionNotifier,
    type ActionNotifier,
} from "../platform/mediawiki/notifications/index.ts";
import {
    getEditBox,
    writePreservingPosition,
} from "../platform/mediawiki/edit-box/index.ts";

const cs1Review = createCs1ReviewWorkflow({
    buildCheckWikitext: buildCs1CheckWikitext,
    requestCheck: requestCs1WikitextCheck,
    splitCheckHtml: splitCs1CheckHtml,
});

interface BrowserRuntime {
    finishLoading: StopTimer;
    logger: Logger;
    notifyAction: ActionNotifier;
}

/** Starts the composed Citation Formatter browser UI. */
export function start(): void {
    if (
        typeof mw === "undefined" ||
        typeof mw.loader?.using !== "function" ||
        !isWikitextPage()
    ) {
        return;
    }
    initializeCitationFormatterI18n();
    const logger = createLogger("citation-formatter");
    const runtime: BrowserRuntime = {
        finishLoading: logger.startTimer("startup"),
        logger,
        notifyAction: createActionNotifier("citation-formatter"),
    };
    mountWhenMediaWikiIsReady(runtime);
    mw.hook("ve.wikitextInteractive").add(function remount(): void {
        mountWhenMediaWikiIsReady(runtime);
    });
}

/** Loads the portlet API and Codex styles before mounting editor actions. */
function mountWhenMediaWikiIsReady(runtime: BrowserRuntime): void {
    if (!isWikitextPage()) {
        return;
    }
    void mw.loader
        .using(["mediawiki.util", "@wikimedia/codex"])
        .then(function mount(): void {
            mountCitationFormatter(runtime);
            runtime.finishLoading({ outcome: "ready" });
        })
        .catch(function reportStartupFailure(error: unknown): void {
            runtime.finishLoading({ outcome: "failed" });
            runtime.logger.error("startup.failed", { error });
            const message =
                error instanceof Error ? error.message : String(error);
            runtime.notifyAction({
                key: "startup-failed",
                message: msg("tool.startupError", { error: message }),
                type: "error",
            });
        });
}

function isWikitextPage(): boolean {
    return mw.config.get("wgPageContentModel") === "wikitext";
}

function mountCitationFormatter(runtime: BrowserRuntime): void {
    const wikiId = String(
        mw.config.get("wgWikiID") ?? mw.config.get("wgDBname") ?? "",
    );
    const templateNames = createTemplateNameContextResolver(wikiId);
    const openCitationFormatterDialog =
        sourceManagerUi.createOpenCitationFormatterDialog({
            writePreservingPosition,
            cs1Review,
            fetchAvailableArchive,
            loadCitationTemplateData(names) {
                return loadCitationTemplateData(names, {
                    api: new mw.Api(),
                    storage: getTemplateDataStorage(),
                    templateNameContext: templateNames.current(),
                    wikiId,
                });
            },
            loadTemplateNameContext() {
                if (wikiId === "enwiki" || wikiId === "zhwiki") {
                    return Promise.resolve(templateNames.current());
                }
                return templateNames.load(new mw.Api());
            },
            logger: runtime.logger.child("ui.source-manager"),
            notifyAction: runtime.notifyAction,
            resolveSourceMetadata,
            resolveWikiLink(value) {
                return resolveCitationWikiLink(value, new mw.Api());
            },
        });
    citationEditor.mountCitationFormatter(openCitationFormatterDialog, {
        getEditor: getEditBox,
        logger: runtime.logger.child("ui.editor"),
        notifyAction: runtime.notifyAction,
    });
}

function getTemplateDataStorage(): TemplateDataObjectStorage | undefined {
    try {
        return createTemplateDataObjectStorage(globalThis.localStorage);
    } catch {
        return undefined;
    }
}
