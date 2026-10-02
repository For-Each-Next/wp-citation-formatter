/**
 * Source-editor command for citation formatting and source management.
 */

import * as editBox from "../../platform/edit-box/index.ts";
import type { EditorRuntime } from "../../app/contracts/editor.ts";
import { msg } from "../../i18n/index.ts";
import type * as sourceManager from "../source-manager/controller.ts";

let launcherStylesInstalled = false;

const LINK_ID = "ca-citation-formatter";
const LINK_ICON = "article";
const FLOATING_LAUNCHER_ID = "citation-formatter-quick-launch";

/**
 * Adds the unified citation command on MediaWiki edit pages.
 *
 * @param openCitationFormatterDialog - Dialog-opening callback.
 * @param runtime - Injected logging and notification ports.
 */
export function mountCitationFormatter(
    openCitationFormatterDialog: sourceManager.OpenCitationFormatterDialog,
    runtime: EditorRuntime,
): void {
    if (
        typeof mw === "undefined" ||
        mw.config.get("wgPageContentModel") !== "wikitext"
    ) {
        return;
    }
    const editor = editBox.getEditBox();
    if (editor == null) {
        return;
    }
    installLauncherStyles();
    mountCitationToolLink(openCitationFormatterDialog, runtime);
    mountFloatingCitationLauncher(openCitationFormatterDialog, runtime);
}

/**
 * Adds the Citation Formatter command to a MediaWiki portlet once.
 *
 * @param openCitationFormatterDialog - Dialog-opening callback.
 * @param runtime - Injected logging and notification ports.
 */
function mountCitationToolLink(
    openCitationFormatterDialog: sourceManager.OpenCitationFormatterDialog,
    runtime: EditorRuntime,
): void {
    if (document.getElementById(LINK_ID) != null) {
        return;
    }
    const link = addCitationLink("p-cactions") || addCitationLink("p-tb");
    addToolClickHandler(link, openCitationFormatterDialog, runtime);
}

/**
 * Adds the localized persistent citation launcher.
 *
 * @param openCitationFormatterDialog - Dialog-opening callback.
 * @param runtime - Injected logging and notification ports.
 */
function mountFloatingCitationLauncher(
    openCitationFormatterDialog: sourceManager.OpenCitationFormatterDialog,
    runtime: EditorRuntime,
): void {
    if (document.getElementById(FLOATING_LAUNCHER_ID) != null) {
        return;
    }
    const launcher = document.createElement("button");
    launcher.id = FLOATING_LAUNCHER_ID;
    launcher.className = "cf-citation-launcher";
    launcher.type = "button";
    launcher.textContent = msg("tool.quickLaunch");
    launcher.title = msg("tool.open");
    launcher.setAttribute("aria-label", msg("tool.open"));
    addToolClickHandler(launcher, openCitationFormatterDialog, runtime);
    (document.body || document.documentElement).append(launcher);
}

/**
 * Opens the formatter from an action-style portlet link.
 *
 * @param launcher - Launcher value.
 * @param openCitationFormatterDialog - Dialog-opening callback.
 * @param runtime - Injected logging and notification ports.
 */
function addToolClickHandler(
    launcher: HTMLElement | null,
    openCitationFormatterDialog: sourceManager.OpenCitationFormatterDialog,
    runtime: EditorRuntime,
): void {
    const openOnClick = function openOnClick(event: Event): void {
        event.preventDefault();
        if (event.currentTarget instanceof HTMLElement) {
            event.currentTarget.focus({ preventScroll: true });
        }
        const editor = editBox.getEditBox();
        if (editor == null) {
            runtime.notifyAction({
                key: "editor-unavailable",
                message: msg("tool.editorUnavailable"),
                type: "error",
            });
            return;
        }
        void openCitationFormatterDialog(editor).catch(function report(error) {
            notifyToolFailure(error, runtime);
        });
    };
    launcher?.addEventListener("click", openOnClick);
    if (launcher != null && !(launcher instanceof HTMLButtonElement)) {
        launcher.addEventListener("keydown", function openOnSpace(event) {
            if (event.key === " ") {
                openOnClick(event);
            }
        });
    }
}

/**
 * Reports a unified citation-tool startup failure.
 *
 * @param error - Rejected startup value.
 * @param runtime - Injected logging and notification ports.
 */
function notifyToolFailure(error: unknown, runtime: EditorRuntime): void {
    const message = error instanceof Error ? error.message : String(error);
    runtime.logger.error("dialog.open.failed", { error });
    runtime.notifyAction({
        key: "dialog-open-failed",
        message: msg("tool.startupError", { error: message }),
        type: "error",
    });
}

/**
 * Adds the command to one MediaWiki portlet.
 *
 * @param portlet - Portlet identifier.
 * @returns The actionable anchor added to the portlet.
 */
function addCitationLink(portlet: string): HTMLElement | null {
    const addPortletLink = mw.util.addPortletLink as unknown as (
        portletId: string,
        options: {
            href: string;
            icon: string;
            id: string;
            text: string;
            tooltip: string;
        },
    ) => HTMLElement | null;
    const item = addPortletLink(portlet, {
        href: "#",
        icon: LINK_ICON,
        id: LINK_ID,
        text: msg("tool.name"),
        tooltip: msg("tool.description"),
    });
    const anchor =
        item?.matches("a") === true ? item : item?.querySelector("a");
    const launcher = anchor instanceof HTMLElement ? anchor : item;
    launcher?.setAttribute("role", "button");
    return launcher;
}

/** Installs the editor command styles once, before mounting its launchers. */
function installLauncherStyles(): void {
    if (launcherStylesInstalled) {
        return;
    }
    const css =
        typeof __CITATION_FORMATTER_EDITOR_STYLES__ === "undefined"
            ? ""
            : __CITATION_FORMATTER_EDITOR_STYLES__;
    if (css !== "") {
        mw.util.addCSS(css);
    }
    launcherStylesInstalled = true;
}
