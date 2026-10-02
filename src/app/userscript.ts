/**
 * @file src/app/userscript.ts
 * Purpose: Browser userscript entry point that waits for the page's MediaWiki runtime.
 *
 * Table of contents:
 * 1. Imports
 * 2. Constants and state
 * 3. stopWaiting
 * 4. startWhenMediaWikiIsReady
 * 5. Initialization and execution
 */

import { start } from "./main.ts";

let readinessTimer: number | undefined;
let attempts = 0;

function stopWaiting(): void {
    if (readinessTimer !== undefined) {
        window.clearTimeout(readinessTimer);
        readinessTimer = undefined;
    }
    window.removeEventListener("pagehide", stopWaiting);
}

function startWhenMediaWikiIsReady(): void {
    readinessTimer = undefined;
    if (
        typeof mw !== "undefined" &&
        typeof mw.config?.get === "function" &&
        typeof mw.loader?.using === "function" &&
        typeof mw.hook === "function"
    ) {
        stopWaiting();
        start();
        return;
    }
    attempts += 1;
    if (attempts >= 200) {
        stopWaiting();
        return;
    }
    readinessTimer = window.setTimeout(startWhenMediaWikiIsReady, 50);
}

window.addEventListener("pagehide", stopWaiting, { once: true });
startWhenMediaWikiIsReady();
