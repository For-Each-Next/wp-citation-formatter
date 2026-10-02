/** Integration tests for source-manager draft actions. */

import assert from "node:assert/strict";
import test from "node:test";

import type {
    SourceAnalysisCell,
    SourceAnalysisFindingCategory,
} from "../src/domain/source-analysis.ts";
import type {
    ExistingSource,
    ExistingSourceSubReference,
    SourceDraft,
} from "../src/domain/source-manager.ts";
import type { CitationTemplateDataMap } from "../src/domain/types.ts";
import {
    createOpenCitationFormatterDialog,
    type SourceManagerOptions,
} from "../src/features/source-manager/controller.ts";
import {
    buildCs1CheckWikitext,
    requestCs1WikitextCheck,
    splitCs1CheckHtml,
} from "../src/platform/mediawiki/cs1-check.ts";
import { createCs1ReviewWorkflow } from "../src/app/workflows/cs1-review.ts";
import type {
    CodexComponents,
    ResourceLoaderRequire,
    VueModule,
} from "../src/features/source-manager/codex.ts";
import * as editBox from "../src/platform/edit-box/index.ts";
import type { Logger } from "../src/shared/logging/index.ts";
import type { ActionNotification } from "../src/platform/mediawiki/notifications/index.ts";
import * as templateNames from "../src/domain/templates.ts";
import type {
    SourceTableGroup,
    SourceTableRow,
} from "../src/features/source-manager/list-presentation.ts";
import { cdxIconMerge, type Icon } from "@wikimedia/codex-icons";

const executionTimerFinishes: string[] = [];
const executionTimerStarts: string[] = [];
const actionNotifications: ActionNotification[] = [];
const errorMessages: string[] = [];
const infoMessages: string[] = [];
const successMessages: string[] = [];
const templateDataRequests: string[][] = [];
const warningMessages: string[] = [];
let templateDataResponse:
    CitationTemplateDataMap | Promise<CitationTemplateDataMap> = {};
const sourceManagerLogger: Logger = {
    child() {
        return sourceManagerLogger;
    },
    debug() {},
    error() {},
    info() {},
    isEnabled() {
        return true;
    },
    startTimer(label: string) {
        executionTimerStarts.push(label);
        let finished = false;
        return function finishExecutionTimer() {
            if (!finished) {
                executionTimerFinishes.push(label);
                finished = true;
            }
        };
    },
    warn() {},
};
const sourceManagerDependencies = {
    cs1Review: createCs1ReviewWorkflow({
        buildCheckWikitext: buildCs1CheckWikitext,
        requestCheck: requestCs1WikitextCheck,
        splitCheckHtml: splitCs1CheckHtml,
    }),
    async fetchAvailableArchive() {
        return null;
    },
    async loadCitationTemplateData(names: string[]) {
        templateDataRequests.push(names);
        return await templateDataResponse;
    },
    async loadTemplateNameContext() {
        return templateNames.DEFAULT_TEMPLATE_NAME_CONTEXT;
    },
    logger: sourceManagerLogger,
    notifyAction(notification: ActionNotification) {
        actionNotifications.push(notification);
        if (notification.type === "error") {
            errorMessages.push(notification.message);
        } else if (notification.type === "info") {
            infoMessages.push(notification.message);
        } else if (notification.type === "success") {
            successMessages.push(notification.message);
        } else {
            warningMessages.push(notification.message);
        }
    },
    async resolveSourceMetadata(
        sourceInput: string,
        archiveSeed: { archiveDate: string; archiveUrl: string } | null,
    ) {
        return {
            archiveDate: archiveSeed?.archiveDate ?? "",
            archiveError: "",
            archiveUrl: archiveSeed?.archiveUrl ?? "",
            citeTemplate: `{{Cite web | url = ${sourceInput}}}`,
            metadataError: "",
            originalUrl: sourceInput,
        };
    },
    async resolveWikiLink(value: string) {
        return value;
    },
};
const openCitationFormatterDialog = createOpenCitationFormatterDialog(
    sourceManagerDependencies,
);

test("loads MediaWiki API before resolving namespace siteinfo", async () => {
    const harness = installSourceManagerHarness([]);
    try {
        let loaderReady = false;
        const runtimeMw = globalThis.mw as unknown as {
            loader: { using(): Promise<ResourceLoaderRequire> };
        };
        const using = runtimeMw.loader.using.bind(runtimeMw.loader);
        runtimeMw.loader.using = async function loadModules() {
            const require = await using();
            loaderReady = true;
            return require;
        };
        const openWithSiteinfo = createOpenCitationFormatterDialog({
            ...sourceManagerDependencies,
            async loadTemplateNameContext() {
                assert.equal(loaderReady, true);
                return templateNames.DEFAULT_TEMPLATE_NAME_CONTEXT;
            },
        });

        await openWithSiteinfo(createMemoryEditor(""));
        assert.equal(loaderReady, true);
    } finally {
        harness.restore();
    }
});

interface MountedAnalysisFinding {
    category: SourceAnalysisFindingCategory;
    occurrences: Array<{ selected: boolean }>;
}

interface MountedAnalysisTab {
    appliedFindings: Array<{ finding: MountedAnalysisFinding }>;
    findings: MountedAnalysisFinding[];
    label: string;
    name: SourceAnalysisCell;
}

interface MountedManager extends Record<string, unknown> {
    activeAnalysisTab: { value: SourceAnalysisCell };
    activeLookupTab: { value: string };
    analysisTabs: { readonly value: MountedAnalysisTab[] };
    countSelectedAnalysisReplacements: () => number;
    cs1ToolSources: {
        value: Array<{
            severity: "error" | "maintenance";
            source: ExistingSource;
        }>;
    };
    cs1ToolStatus: {
        value: "checking" | "complete" | "idle" | "unavailable";
    };
    draft: { value: SourceDraft | null };
    draftCellErrors: {
        readonly value: Map<
            number,
            { alias?: string; name?: string; value?: string }
        >;
    };
    draftCs1Checking: { value: boolean };
    existingSources: { value: ExistingSource[] };
    referenceReuseDetails: { value: string };
    referenceReuseDialogOpen: { value: boolean };
    referenceReuseError: { value: string };
    referenceReuseSubReference: { value: ExistingSourceSubReference | null };
    referenceReuseSubReferences: { value: ExistingSourceSubReference[] };
    sourceTableGroups: { readonly value: SourceTableGroup[] };
    sourceTableRows: { readonly value: SourceTableRow[] };
    setSourceManagerContent: (element: unknown) => void;
    formatArticleDisabled: { readonly value: boolean };
    formatScriptTitles: { value: boolean };
    getOpenableDraftUrl: (value: string) => string | null | undefined;
    isUrlDraftParameter: (name: string) => boolean;
    joinAuthorIcon: Icon;
    manualTemplate: { value: string | null };
    nonCs1Sources: { readonly value: ExistingSource[] };
    parameterAliasDialogDirectives: { value: string[] };
    parameterAliasDialogOpen: { value: boolean };
    parameterAliasDialogOriginalValue: { value: string };
    parameterAliasDialogValue: { value: string };
    canApplyParameterAlias: () => boolean;
    getParameterAliasDialogError: () => string;
    splitAuthorIcon: Icon;
    sourceAnalysis: {
        value: {
            findings: MountedAnalysisFinding[];
        };
    };
    templateOptions: {
        readonly value: Array<{ label: string; value: string }>;
    };
    toolPopup: { value: string | null };
}

const CS1_ERROR_HTML = [
    '<div id="citation-formatter-cs1-check-0">',
    '<span class="cs1-visible-error citation-comment">',
    "Unknown parameter <code>&#124;bad=</code> ignored",
    "</span></div>",
].join("");
const CS1_COLLISION_ERROR_HTML = [
    '<div id="citation-formatter-cs1-check-0">',
    '<span class="cs1-visible-error citation-comment">',
    "Unknown parameter <code>&#124;magazine-a=</code> ignored",
    "</span></div>",
].join("");
const CS1_COLLISION_VALUE_ERROR_HTML = [
    CS1_COLLISION_ERROR_HTML,
    '<span class="cs1-visible-error citation-comment">',
    "Invalid value for parameter <code>&#124;magazine-a=</code>",
    "</span>",
].join("");
const CS1_UNSUPPORTED_PARAMETER_CATEGORIES = [
    { category: "CS1 errors: unsupported parameter" },
];
const CS1_OK_HTML = '<div id="citation-formatter-cs1-check-0">No issues</div>';
const CONSISTENCY_TEXT = [
    '<ref name="A">{{cite web|author=Jane Doe',
    "<!-- # Doe, Jane -->|title=A|url=https://example.test/a|",
    "website=Example}}</ref>",
    '<ref name="B">{{cite web|author=[[Jane Doe]]',
    "<!-- # Jane Doe -->|title=B|url=https://example.test/b|",
    "website=[[Example]]}}</ref>",
].join("\n");
const ALIAS_ONLY_CONSISTENCY_TEXT = [
    '<ref name="A">{{cite web|author=Jane Doe',
    "<!-- # Doe, Jane -->|title=A|url=https://one.test/a}}</ref>",
    '<ref name="B">{{cite web|author=Jane Doe',
    "<!-- # Jane Doe -->|title=B|url=https://two.test/b}}</ref>",
].join("\n");

const SUB_REFERENCE_TEXT = [
    '<ref name="Book">{{Cite book|last=Doe|first=Jane|year=2020|title=A book}}</ref>',
    'First.<ref name="Book" details="p. 23" />',
    'Second.<ref name="Book" details="p. 23" />',
    '<ref name="Other">Plain bibliography.</ref>',
].join("\n");

test("projects author/year sources and matching details as one counted child row", async () => {
    const harness = installSourceManagerHarness([]);
    try {
        await openCitationFormatterDialog(
            createMemoryEditor(SUB_REFERENCE_TEXT),
        );
        const manager = harness.getManager();
        const rows = manager.sourceTableRows.value;
        assert.equal(manager.existingSources.value.length, 2);
        assert.equal(rows.length, 3);
        assert.equal(rows[0]?.reference, "Doe, 2020");
        assert.equal(rows[0]?.source, "A book");
        assert.ok(rows[0]?.detailsTitle.includes("Book"));
        assert.deepEqual(
            rows.map((row) => row.source),
            ["A book", "p. 23", "Plain bibliography."],
        );
        assert.equal(new Set(rows.map((row) => row.id)).size, rows.length);
        assert.equal(rows[1]?.sourceId, rows[0]?.sourceId);
        const occurrences = manager.existingSources.value[0]!.subReferences!;
        assert.equal(occurrences.length, 2);
        assert.equal(rows[1]?.subReferenceId, occurrences[0]?.id);
        assert.deepEqual(
            rows[1]?.subReferenceIds,
            occurrences.map((occurrence) => occurrence.id),
        );
        assert.equal(rows[1]?.usageCount, 2);
        assert.equal(rows[1]?.usageSummary, "2×");
        assert.deepEqual(rows[0]?.subReferenceIds, []);
        assert.equal(rows[2]?.reference, "Other");
        const groups = manager.sourceTableGroups.value;
        assert.equal(groups.length, 2);
        assert.deepEqual(groups[0]?.source, rows[0]);
        assert.equal(groups[0]?.source.usageCount, 3);
        assert.equal(groups[0]?.source.subReferenceCount, 2);
        assert.equal(groups[0]?.source.usageSummary, "3× (with 2 sub-refs)");
        assert.deepEqual(groups[0]?.subReferences, rows.slice(1, 2));
        assert.deepEqual(groups[1]?.source, rows[2]);
        assert.equal(groups[1]?.source.usageCount, 1);
        assert.equal(groups[1]?.source.subReferenceCount, 0);
        assert.equal(groups[1]?.source.usageSummary, "1×");
        assert.deepEqual(groups[1]?.subReferences, []);
    } finally {
        harness.restore();
    }
});

test("groups exact decoded details within a source and combines usage sections", async () => {
    const harness = installSourceManagerHarness([]);
    const text = [
        '<ref name="Book">{{Cite book|title=A book}}</ref>',
        '<ref name="Book" details="p. 23" />',
        '<ref name="Book" details="p. 24" />',
        "== Later ==",
        '<ref name="Book" details="p&#46; 23" />',
        '<ref name="Book" details="P. 23" />',
        '<ref name="Other">{{Cite book|title=Other book}}</ref>',
        '<ref name="Other" details="p. 23" />',
        '<ref name="Book" group="notes">{{Cite book|title=Notes book}}</ref>',
        '<ref name="Book" group="notes" details="p. 23" />',
    ].join("\n");
    try {
        const editor = createMemoryEditor(text);
        await openCitationFormatterDialog(editor);
        const manager = harness.getManager();
        const groups = manager.sourceTableGroups.value;
        assert.equal(groups.length, 3);
        const first = groups[0]!;
        assert.deepEqual(
            first.subReferences.map((row) => [row.source, row.usageSummary]),
            [
                ["p. 23", "2×"],
                ["p. 24", "1×"],
                ["P. 23", "1×"],
            ],
        );
        assert.equal(first.source.subReferenceCount, 4);
        assert.equal(first.source.usageCount, 5);
        assert.ok(first.subReferences[0]?.usageTitle.includes("§0 Lead"));
        assert.ok(first.subReferences[0]?.usageTitle.includes("§1 Later"));
        assert.equal(first.subReferences[0]?.subReferenceIds.length, 2);
        for (const group of groups.slice(1)) {
            assert.equal(group.subReferences.length, 1);
            assert.equal(group.subReferences[0]?.source, "p. 23");
            assert.equal(group.subReferences[0]?.usageCount, 1);
        }
        assert.equal(
            manager.existingSources.value[0]?.subReferences?.length,
            4,
        );
        assert.equal(editor.read(), text);
    } finally {
        harness.restore();
    }
});

test("updates the frozen source offset when tabs resize and releases its observer on disposal", async () => {
    const harness = installSourceManagerHarness([]);
    const globals = globalThis as unknown as Record<string, unknown>;
    const originalObserver = globals.ResizeObserver;
    const updates: Array<[string, string]> = [];
    const observed: unknown[] = [];
    const callbacks: Array<() => void> = [];
    let disconnectCount = 0;
    let tabHeight = 48;
    const tabs = { getBoundingClientRect: () => ({ height: tabHeight }) };
    const content = {
        querySelector(selector: string) {
            assert.equal(selector, ".cdx-tabs__header");
            return tabs;
        },
        style: {
            setProperty(name: string, value: string) {
                updates.push([name, value]);
            },
        },
    };
    globals.ResizeObserver = class {
        constructor(callback: () => void) {
            callbacks.push(callback);
        }

        disconnect() {
            disconnectCount += 1;
        }

        observe(element: unknown) {
            observed.push(element);
        }
    };
    try {
        await openCitationFormatterDialog(
            createMemoryEditor(SUB_REFERENCE_TEXT),
        );
        const manager = harness.getManager();
        manager.setSourceManagerContent(content);
        assert.deepEqual(observed, [tabs]);
        assert.deepEqual(updates, [
            ["--cf-source-manager-tabs-height", "48px"],
        ]);
        tabHeight = 72;
        callbacks[0]!();
        assert.deepEqual(updates.at(-1), [
            "--cf-source-manager-tabs-height",
            "72px",
        ]);
        manager.setSourceManagerContent(null);
        assert.equal(disconnectCount, 1);
        tabHeight = 96;
        callbacks[0]!();
        assert.equal(updates.length, 2);
    } finally {
        if (originalObserver === undefined) {
            delete globals.ResizeObserver;
        } else {
            globals.ResizeObserver = originalObserver;
        }
        harness.restore();
    }
});

test("edits every occurrence in a grouped details row and supports session undo", async () => {
    const harness = installSourceManagerHarness([]);
    try {
        const editor = createMemoryEditor(SUB_REFERENCE_TEXT);
        await openCitationFormatterDialog(editor);
        const manager = harness.getManager();
        const source = manager.existingSources.value[0]!;
        const occurrence = source.subReferences![0]!;
        callAction(manager, "editListedSubReference", source.id, occurrence.id);
        assert.equal(manager.referenceReuseDetails.value, "p. 23");
        assert.equal(manager.referenceReuseSubReferences.value.length, 2);
        manager.referenceReuseDetails.value = "p. 24";
        callAction(manager, "insertReferenceWithDetails");
        assert.equal(
            editor.read(),
            SUB_REFERENCE_TEXT.replaceAll('details="p. 23"', 'details="p. 24"'),
        );
        assert.equal(manager.referenceReuseDialogOpen.value, false);
        assert.deepEqual(
            manager.existingSources.value[0]?.subReferences?.map(
                (item) => item.details,
            ),
            ["p. 24", "p. 24"],
        );
        assert.equal(manager.referenceReuseSubReference.value, null);
        assert.deepEqual(manager.referenceReuseSubReferences.value, []);
        const grouped = manager.sourceTableGroups.value[0]!.subReferences;
        assert.equal(grouped.length, 1);
        assert.equal(grouped[0]?.source, "p. 24");
        assert.equal(grouped[0]?.usageSummary, "2×");
        callAction(manager, "cancelAllChanges");
        assert.equal(editor.read(), SUB_REFERENCE_TEXT);
    } finally {
        harness.restore();
    }
});

test("merges edited details with an existing row and clears all merged occurrences", async () => {
    const harness = installSourceManagerHarness([]);
    const text = SUB_REFERENCE_TEXT.replace(
        '<ref name="Other">',
        'Third.<ref name="Book" details="p. 24" />\n<ref name="Other">',
    );
    try {
        const editor = createMemoryEditor(text);
        await openCitationFormatterDialog(editor);
        const manager = harness.getManager();
        const initial = manager.sourceTableGroups.value[0]!;
        assert.equal(initial.subReferences.length, 2);
        callAction(
            manager,
            "editListedSubReference",
            initial.source.id,
            initial.subReferences[0]!.subReferenceId,
        );
        manager.referenceReuseDetails.value = "p. 24";
        callAction(manager, "insertReferenceWithDetails");
        assert.equal(
            editor.read(),
            text.replaceAll('details="p. 23"', 'details="p. 24"'),
        );
        const merged = manager.sourceTableGroups.value[0]!;
        assert.equal(merged.subReferences.length, 1);
        assert.equal(merged.subReferences[0]?.usageSummary, "3×");
        callAction(
            manager,
            "editListedSubReference",
            merged.source.id,
            merged.subReferences[0]!.subReferenceId,
        );
        assert.equal(manager.referenceReuseSubReferences.value.length, 3);
        manager.referenceReuseDetails.value = "";
        callAction(manager, "insertReferenceWithDetails");
        assert.equal(
            editor.read(),
            text
                .replaceAll(' details="p. 23"', "")
                .replaceAll(' details="p. 24"', ""),
        );
        const cleared = manager.sourceTableGroups.value[0]!;
        assert.deepEqual(cleared.subReferences, []);
        assert.equal(cleared.source.subReferenceCount, 0);
        assert.equal(cleared.source.usageCount, 4);
        assert.equal(cleared.source.usageSummary, "4×");
        assert.deepEqual(manager.referenceReuseSubReferences.value, []);
        callAction(manager, "cancelAllChanges");
        assert.equal(editor.read(), text);
    } finally {
        harness.restore();
    }
});

test("refuses stale sub-reference edits and leaves the dialog open for recovery", async () => {
    const harness = installSourceManagerHarness([]);
    try {
        const editor = createMemoryEditor(SUB_REFERENCE_TEXT);
        await openCitationFormatterDialog(editor);
        const manager = harness.getManager();
        const source = manager.existingSources.value[0]!;
        callAction(
            manager,
            "editListedSubReference",
            source.id,
            source.subReferences![0]!.id,
        );
        assert.equal(manager.referenceReuseSubReferences.value.length, 2);
        manager.referenceReuseDetails.value = "p. 24";
        const laterText = SUB_REFERENCE_TEXT.replace(
            "Second.",
            "Later change.",
        );
        editor.write(laterText);
        callAction(manager, "insertReferenceWithDetails");
        assert.equal(editor.read(), laterText);
        assert.equal(manager.referenceReuseDialogOpen.value, true);
        assert.equal(
            manager.referenceReuseError.value,
            "The selected citation is unavailable.",
        );
        callAction(manager, "closeReferenceReuseDialog");
        assert.equal(manager.referenceReuseSubReference.value, null);
        assert.deepEqual(manager.referenceReuseSubReferences.value, []);
    } finally {
        harness.restore();
    }
});

test("sub-reference reuse copies details into a new native call in compact mode", async () => {
    const harness = installSourceManagerHarness([]);
    try {
        const editor = createMemoryEditor(SUB_REFERENCE_TEXT);
        await openCitationFormatterDialog(editor, { referenceStyle: "r" });
        const manager = harness.getManager();
        const source = manager.existingSources.value[0]!;
        callAction(
            manager,
            "reuseListedSubReference",
            source.id,
            source.subReferences![0]!.id,
        );
        assert.equal(
            editor.read(),
            SUB_REFERENCE_TEXT + '<ref name="Book" details="p. 23" />',
        );
    } finally {
        harness.restore();
    }
});

test("Ctrl and Command use open an empty details draft without writing the editor", async () => {
    const harness = installSourceManagerHarness([]);
    try {
        const editor = createMemoryEditor(SUB_REFERENCE_TEXT);
        await openCitationFormatterDialog(editor);
        const manager = harness.getManager();
        const source = manager.existingSources.value[0]!;
        for (const modifier of [{ ctrlKey: true }, { metaKey: true }]) {
            callAction(manager, "insertListedSource", source.id, modifier);
            assert.equal(manager.referenceReuseDialogOpen.value, true);
            assert.equal(manager.referenceReuseDetails.value, "");
            assert.equal(manager.referenceReuseSubReference.value, null);
            assert.deepEqual(manager.referenceReuseSubReferences.value, []);
            assert.equal(editor.read(), SUB_REFERENCE_TEXT);
            callAction(manager, "closeReferenceReuseDialog");
        }
        callAction(manager, "insertListedSource", source.id);
        assert.equal(editor.read(), SUB_REFERENCE_TEXT + '<ref name="Book" />');
    } finally {
        harness.restore();
    }
});

test("notifies when duplicating a source draft", async () => {
    const harness = installSourceManagerHarness([]);
    try {
        const initialText =
            '<ref name="Example">{{cite web|title=Example|bad=value}}</ref>';
        const editor = createMemoryEditor(initialText);
        await openCitationFormatterDialog(editor, {} as SourceManagerOptions);
        const manager = harness.getManager();
        const sourceId = manager.existingSources.value[0]?.id;
        assert.ok(sourceId);

        callAction(manager, "editListedSource", sourceId);
        callAction(manager, "duplicateDraft");
        assert.ok(
            harness.successMessages.includes("Citation source duplicated."),
        );
        callAction(manager, "closeDraftPopup");
        callAction(manager, "cancelAllChanges");
        assert.equal(editor.read(), initialText);
        await Promise.resolve();
    } finally {
        harness.restore();
    }
});

test("rechecks only CS1 Apply", async () => {
    const recheck = createDeferred<unknown>();
    const harness = installSourceManagerHarness([
        { parse: { categories: [], text: CS1_ERROR_HTML } },
        recheck.promise,
    ]);
    try {
        const initialText =
            '<ref name="Example">{{cite web|title=Example|bad=value}}</ref>';
        const editor = createMemoryEditor(initialText);
        await openCitationFormatterDialog(editor, {} as SourceManagerOptions);
        const manager = harness.getManager();
        const sourceId = manager.existingSources.value[0]?.id;
        assert.ok(sourceId);

        const draft = await prepareDraftForCs1Apply(manager, sourceId);
        const applyPromise = callAsyncAction(manager, "applyDraft");
        assert.equal(manager.draftCs1Checking.value, true);
        recheck.resolve({ parse: { categories: [], text: CS1_OK_HTML } });
        await applyPromise;
        assert.equal(manager.draftCs1Checking.value, false);
        assertSuccessfulCs1Apply(draft, harness);

        callAction(manager, "saveDraft");
        assert.equal(harness.apiCallCount(), 2);
        callAction(manager, "cancelAllChanges");
        assert.equal(editor.read(), initialText);
        await Promise.resolve();
    } finally {
        harness.restore();
    }
});

async function prepareDraftForCs1Apply(
    manager: MountedManager,
    sourceId: string,
): Promise<SourceDraft> {
    await callAsyncAction(manager, "openCs1Tool");
    callAction(manager, "reviewCs1Source", sourceId);
    const draft = manager.draft.value;
    assert.ok(draft);
    const badRowIndex = draft.rows.findIndex((row) => row.name === "bad");
    assert.notEqual(badRowIndex, -1);
    draft.rows.splice(badRowIndex, 1);
    const titleRow = draft.rows.find((row) => row.name === "title");
    assert.ok(titleRow);
    draft.rows.splice(draft.rows.indexOf(titleRow), 1);
    draft.rows.push(titleRow);
    return draft;
}

function assertSuccessfulCs1Apply(
    draft: SourceDraft,
    harness: ReturnType<typeof installSourceManagerHarness>,
): void {
    assert.ok(
        draft.rows.findIndex((row) => row.name === "title") <
            draft.rows.findIndex((row) => row.name === "url"),
    );
    assert.equal(harness.apiCallCount(), 2);
    assert.ok(harness.successMessages.includes("No CS1 issues found."));
    assert.ok(
        harness.successMessages.includes(
            "Citation changes applied: removed bad.",
        ),
    );
}

test("rechecks the current article with checking progress", async () => {
    const recheck = createDeferred<unknown>();
    const harness = installSourceManagerHarness([
        { parse: { categories: [], text: CS1_ERROR_HTML } },
        recheck.promise,
    ]);
    try {
        const editor = createMemoryEditor(
            "<ref>{{cite web|title=Before|bad=value}}</ref>",
        );
        await openCitationFormatterDialog(editor);
        const manager = harness.getManager();
        await callAsyncAction(manager, "openCs1Tool");
        assert.equal(manager.cs1ToolSources.value[0]?.source.title, "Before");

        editor.write("<ref>{{cite web|title=After}}</ref>");
        const recheckPromise = callAsyncAction(manager, "recheckCs1Tool");
        assert.equal(manager.cs1ToolStatus.value, "checking");
        assert.equal(manager.existingSources.value[0]?.title, "After");
        assert.equal(harness.apiCallCount(), 2);
        await callAsyncAction(manager, "recheckCs1Tool");
        assert.equal(harness.apiCallCount(), 2);

        recheck.resolve({ parse: { categories: [], text: CS1_OK_HTML } });
        await recheckPromise;
        assert.equal(manager.cs1ToolStatus.value, "complete");
        assert.deepEqual(manager.cs1ToolSources.value, []);

        callAction(manager, "close");
        await Promise.resolve();
    } finally {
        harness.restore();
    }
});

test(
    "keeps CS1 errors before maintenance after apply and review sync",
    testCs1SeverityOrder,
);
async function testCs1SeverityOrder(): Promise<void> {
    const maintenanceA = '<span class="citation-comment">Maintenance A</span>';
    const errorB =
        '<span class="cs1-visible-error citation-comment">Error B</span>';
    const maintenanceC = '<span class="citation-comment">Maintenance C</span>';
    const batchHtml = [maintenanceA, errorB, maintenanceC]
        .map(
            (html, index) =>
                `<div id="citation-formatter-cs1-check-${index}">` +
                `${html}</div>`,
        )
        .join("");
    const recheckedA =
        '<div id="citation-formatter-cs1-check-0">' + `${maintenanceA}</div>`;
    const harness = installSourceManagerHarness([
        { parse: { categories: [], text: batchHtml } },
        { parse: { categories: [], text: recheckedA } },
    ]);
    try {
        const editor = createMemoryEditor(
            [
                "<ref>{{cite web|title=Maintenance A}}</ref>",
                "<ref>{{cite web|title=Error B}}</ref>",
                "<ref>{{cite web|title=Maintenance C}}</ref>",
            ].join("\n"),
        );
        await openCitationFormatterDialog(editor);
        const manager = harness.getManager();
        await callAsyncAction(manager, "openCs1Tool");
        assertCs1SourceOrder(manager, [
            ["Error B", "error"],
            ["Maintenance A", "maintenance"],
            ["Maintenance C", "maintenance"],
        ]);

        const maintenanceSource = manager.cs1ToolSources.value.find(
            (result) => result.source.title === "Maintenance A",
        )?.source;
        assert.ok(maintenanceSource);
        callAction(manager, "reviewCs1Source", maintenanceSource.id);
        await callAsyncAction(manager, "applyDraft");
        assertCs1SourceOrder(manager, [
            ["Error B", "error"],
            ["Maintenance A", "maintenance"],
            ["Maintenance C", "maintenance"],
        ]);

        await callAsyncAction(manager, "saveDraft");
        assertCs1SourceOrder(manager, [
            ["Error B", "error"],
            ["Maintenance C", "maintenance"],
        ]);
    } finally {
        harness.restore();
    }
}

test("edits Cite comic without sending it through live CS1", async () => {
    const harness = installSourceManagerHarness([]);
    try {
        const editor = createMemoryEditor(
            "<ref>{{cite comic|writer=Example|title=Issue}}</ref>",
        );
        await openCitationFormatterDialog(editor);
        const manager = harness.getManager();
        const source = manager.existingSources.value[0];
        assert.equal(source?.status, "metadata-free");
        assert.ok(source);
        assert.deepEqual(manager.nonCs1Sources.value, []);

        callAction(manager, "editListedSource", source.id);
        assert.equal(manager.draft.value?.template, "Cite comic");
        assert.equal(manager.templateOptions.value[0]?.value, "Cite comic");

        await callAsyncAction(manager, "openCs1Tool");
        assert.equal(harness.apiCallCount(), 0);
        assert.equal(manager.cs1ToolStatus.value, "complete");
    } finally {
        harness.restore();
    }
});

test("preserves position while formatting citations", async () => {
    const harness = installSourceManagerHarness([]);
    try {
        const beforeText = [
            "Lead.",
            "<ref>{{cite web|url=https://example.test|title=Example}}</ref>",
            "Tail.",
        ].join("\n");
        const textarea = createNativeTextarea(beforeText);
        const cursor = beforeText.indexOf("Tail.");
        textarea.selectionStart = cursor;
        textarea.selectionEnd = cursor;
        textarea.scrollLeft = 6;
        textarea.scrollTop = 240;
        const editor = editBox.createEditBox(textarea);

        await openCitationFormatterDialog(editor);
        const manager = harness.getManager();
        callAction(manager, "formatArticle");

        assert.notEqual(textarea.value, beforeText);
        assert.equal(textarea.selectionStart, cursor);
        assert.equal(textarea.selectionEnd, cursor);
        assert.equal(textarea.scrollLeft, 6);
        assert.equal(textarea.scrollTop, 240);
        assert.equal(manager.formatArticleDisabled.value, true);

        textarea.value += "\nChanged.";
        textarea.dispatchEvent(new Event("input"));
        assert.equal(manager.formatArticleDisabled.value, false);

        callAction(manager, "close");
        await Promise.resolve();
    } finally {
        harness.restore();
    }
});

test("summarizes one formatting attempt without switching tabs", async () => {
    const harness = installSourceManagerHarness([]);
    try {
        const beforeText =
            "<ref>{{cite web|url=https://example.test|title=Example}}</ref>";
        let writeCount = 0;
        const editor = createMemoryEditor(beforeText, () => {
            writeCount += 1;
        });

        await openCitationFormatterDialog(editor);
        const manager = harness.getManager();
        assert.equal(manager.activeLookupTab.value, "add");
        callAction(manager, "formatArticle");

        const formattedText = editor.read();
        assert.notEqual(formattedText, beforeText);
        assert.equal(writeCount, 1);
        assert.deepEqual(harness.successMessages, [
            "Formatted 1 citation; renamed 1 <ref> tag.",
        ]);
        assert.equal(manager.formatArticleDisabled.value, true);
        assert.equal(manager.activeLookupTab.value, "add");

        callAction(manager, "formatArticle");

        assert.equal(editor.read(), formattedText);
        assert.equal(writeCount, 1);
        assert.equal(harness.successMessages.length, 1);
        assert.deepEqual(harness.executionTimerStarts, ["article.format"]);
        assert.deepEqual(harness.executionTimerFinishes, ["article.format"]);

        callAction(manager, "setBlockCitations", true);
        assert.equal(manager.formatArticleDisabled.value, false);
        callAction(manager, "setBlockCitations", false);
        assert.equal(manager.formatArticleDisabled.value, true);
        callAction(manager, "close");
        await Promise.resolve();
    } finally {
        harness.restore();
    }
});

test("toggles script-title formatting between attempts", async () => {
    const harness = installSourceManagerHarness([]);
    try {
        const editor = createMemoryEditor(
            "<ref>{{cite web|script-title=en-US:TGS 2008|" +
                "language=en-US|url=https://example.test}}</ref>",
        );
        await openCitationFormatterDialog(editor);
        const manager = harness.getManager();

        assert.equal(manager.formatScriptTitles.value, true);
        callAction(manager, "setFormatScriptTitles", false);
        assert.equal(manager.formatScriptTitles.value, false);
        callAction(manager, "formatArticle");

        assert.match(editor.read(), /\| script-title = en-US:TGS 2008/u);
        assert.equal(manager.formatArticleDisabled.value, true);

        callAction(manager, "setFormatScriptTitles", true);
        assert.equal(manager.formatScriptTitles.value, true);
        assert.equal(manager.formatArticleDisabled.value, false);
        callAction(manager, "formatArticle");

        assert.match(editor.read(), /\| script-title = en:TGS 2008/u);
        assert.equal(manager.formatArticleDisabled.value, true);
        callAction(manager, "close");
        await Promise.resolve();
    } finally {
        harness.restore();
    }
});

test("summarizes skipped references once", async () => {
    const harness = installSourceManagerHarness([]);
    try {
        let writeCount = 0;
        const editor = createMemoryEditor("<ref>Plain text</ref>", () => {
            writeCount += 1;
        });

        await openCitationFormatterDialog(editor);
        const manager = harness.getManager();
        callAction(manager, "formatArticle");

        assert.equal(writeCount, 1);
        assert.deepEqual(harness.warningMessages, [
            "Formatted 0 citations; skipped 1 reference not in a supported " +
                "standard {{Cite …}} format; renamed 1 <ref> tag.",
        ]);
        assert.equal(manager.formatArticleDisabled.value, true);

        callAction(manager, "formatArticle");

        assert.equal(writeCount, 1);
        assert.equal(harness.warningMessages.length, 1);
        callAction(manager, "close");
        await Promise.resolve();
    } finally {
        harness.restore();
    }
});

test("warns while formatting deliberate repeated parameters", async () => {
    const harness = installSourceManagerHarness([]);
    try {
        const editor = createMemoryEditor(
            "<ref>{{cite journal|title=日本|language=ja|journal=J1|" +
                "journal=J2}}</ref>",
        );
        await openCitationFormatterDialog(editor);
        const manager = harness.getManager();

        callAction(manager, "formatArticle");

        assert.match(editor.read(), /\| journal = J1\s+\| journal-a = J2/u);
        assert.match(editor.read(), /\| script-title = ja:日本/u);
        assert.deepEqual(harness.warningMessages, [
            "Formatted 1 citation; renamed 1 <ref> tag. Also marked 1 " +
                "repeated parameter with an invalid suffix for CS1 review.",
        ]);
        assert.deepEqual(harness.successMessages, []);
        callAction(manager, "close");
        await Promise.resolve();
    } finally {
        harness.restore();
    }
});

const fanGuideTemplateData: CitationTemplateDataMap = {
    "Cite Fan Guide": {
        aliases: {
            issue: [],
            title: ["name"],
            writer: ["Writer"],
        },
        canonicalName: "Cite Fan Guide",
        paramOrder: ["title", "writer", "issue"],
    },
};

test(
    "formats unknown Cite templates " + "without reporting them as skipped",
    async () => {
        const harness = installSourceManagerHarness([], fanGuideTemplateData);
        try {
            const editor = createMemoryEditor(
                "Guide.<ref>{{cite Fan Guide|issue=|Writer=First|" +
                    "name=Guide}}</ref>",
            );

            await openCitationFormatterDialog(editor);
            const manager = harness.getManager();
            await callAsyncAction(manager, "formatArticle");

            assert.deepEqual(harness.warningMessages, []);
            assert.deepEqual(harness.successMessages, [
                "Formatted 1 citation; renamed 1 <ref> tag.",
            ]);
            assert.ok(
                editor
                    .read()
                    .includes(
                        "{{Cite Fan Guide | title = Guide | " +
                            "writer = First | issue = }}",
                    ),
            );
            assert.deepEqual(harness.templateDataRequests, [
                ["Cite Fan Guide"],
            ]);
            callAction(manager, "close");
            await Promise.resolve();
        } finally {
            harness.restore();
        }
    },
);

test(
    "guards repeated formatting " + "while generic TemplateData loads",
    async () => {
        const templateData = createDeferred<CitationTemplateDataMap>();
        const harness = installSourceManagerHarness([], templateData.promise);
        try {
            const editor = createMemoryEditor(
                "<ref>{{Cite fan guide|title=Example}}</ref>",
            );
            await openCitationFormatterDialog(editor);
            const manager = harness.getManager();
            const action = manager.formatArticle as () => Promise<void>;

            const first = action();
            const repeated = action();

            assert.equal(manager.formatArticleDisabled.value, true);
            assert.deepEqual(harness.templateDataRequests, [
                ["Cite fan guide"],
            ]);
            editor.replaceSelection(
                "\n<ref>{{Cite New Guide|title=New}}</ref>",
            );
            templateData.resolve({});
            await Promise.all([first, repeated]);

            assert.equal(harness.successMessages.length, 1);
            assert.ok(editor.read().includes("{{Cite New Guide"));
            assert.deepEqual(harness.templateDataRequests, [
                ["Cite fan guide"],
                ["Cite New Guide"],
            ]);
            assert.deepEqual(harness.executionTimerStarts, ["article.format"]);
            assert.deepEqual(harness.executionTimerFinishes, [
                "article.format",
            ]);
            callAction(manager, "close");
            await Promise.resolve();
        } finally {
            harness.restore();
        }
    },
);

test(
    "cancels a pending format action " + "when its dialog is replaced",
    async () => {
        const templateData = createDeferred<CitationTemplateDataMap>();
        const harness = installSourceManagerHarness([], templateData.promise);
        try {
            let firstWrites = 0;
            const firstEditor = createMemoryEditor(
                "<ref>{{Cite First Guide|title=First}}</ref>",
                () => {
                    firstWrites += 1;
                },
            );
            await openCitationFormatterDialog(firstEditor);
            const pending = callAsyncAction(
                harness.getManager(),
                "formatArticle",
            );

            const secondEditor = createMemoryEditor("Second editor.");
            await openCitationFormatterDialog(secondEditor);
            templateData.resolve({});
            await pending;

            assert.equal(firstWrites, 0);
            assert.equal(harness.successMessages.length, 0);
            callAction(harness.getManager(), "close");
            await Promise.resolve();
        } finally {
            harness.restore();
        }
    },
);

test("uses one neutral notification for preformatted input", async () => {
    const harness = installSourceManagerHarness([]);
    try {
        const editor = createMemoryEditor(
            "<ref>{{cite web|url=https://example.test|title=Example}}</ref>",
        );

        await openCitationFormatterDialog(editor);
        callAction(harness.getManager(), "formatArticle");
        callAction(harness.getManager(), "close");
        await Promise.resolve();
        harness.successMessages.length = 0;
        harness.warningMessages.length = 0;

        await openCitationFormatterDialog(editor);
        const manager = harness.getManager();
        callAction(manager, "formatArticle");

        assert.deepEqual(harness.infoMessages, [
            "No citation formatting changes were made.",
        ]);
        assert.deepEqual(harness.successMessages, []);
        assert.deepEqual(harness.warningMessages, []);
        assert.equal(manager.formatArticleDisabled.value, true);

        callAction(manager, "formatArticle");
        assert.equal(harness.infoMessages.length, 1);
        assert.deepEqual(harness.executionTimerStarts, [
            "article.format",
            "article.format",
        ]);
        assert.deepEqual(harness.executionTimerFinishes, [
            "article.format",
            "article.format",
        ]);
        callAction(manager, "close");
        await Promise.resolve();
    } finally {
        harness.restore();
    }
});

test("keeps notification keys stable across dialog instances", async () => {
    const harness = installSourceManagerHarness([]);
    try {
        const editor = createMemoryEditor(
            "<ref>{{cite web|url=https://example.test|" +
                "title=Example}}</ref>",
        );

        await openCitationFormatterDialog(editor);
        const manager = harness.getManager();
        callAction(manager, "formatArticle");

        assert.equal(harness.actionNotifications.length, 1);
        assert.equal(
            harness.actionNotifications[0]?.key,
            "article-format-result",
        );

        await openCitationFormatterDialog(editor);

        assert.equal(harness.actionNotifications.length, 1);

        const replacement = harness.getManager();
        callAction(replacement, "formatArticle");
        assert.equal(harness.actionNotifications.length, 2);
        assert.equal(
            harness.actionNotifications[1]?.key,
            "article-format-result",
        );

        callAction(replacement, "close");
        await Promise.resolve();

        assert.equal(harness.actionNotifications.length, 2);
    } finally {
        harness.restore();
    }
});

function createDeferred<T>(): {
    promise: Promise<T>;
    resolve: (value: T) => void;
} {
    let resolve: (value: T) => void = () => {};
    const promise = new Promise<T>((complete) => {
        resolve = complete;
    });
    return { promise, resolve };
}

test("edits directives without discarding unknown tags", async () => {
    const harness = installSourceManagerHarness([]);
    try {
        const editor = createMemoryEditor(
            "<ref>{{cite web|title=Example<!-- !keep !no-author # Name -->}}" +
                "</ref>",
        );
        await openCitationFormatterDialog(editor);
        const manager = harness.getManager();
        const sourceId = manager.existingSources.value[0]?.id;
        assert.ok(sourceId);
        callAction(manager, "editListedSource", sourceId);
        const draft = manager.draft.value;
        assert.ok(draft);
        const titleIndex = draft.rows.findIndex((row) => row.name === "title");

        callAction(manager, "openParameterAliasDialog", titleIndex);
        assert.deepEqual(manager.parameterAliasDialogDirectives.value, [
            "!no-author",
        ]);
        manager.parameterAliasDialogDirectives.value = ["!no-date", "!no-part"];
        callAction(manager, "applyParameterAlias");

        assert.equal(
            draft.rows[titleIndex]?.directive,
            "!no-date !no-part !keep",
        );
        callAction(manager, "close");
        await Promise.resolve();
    } finally {
        harness.restore();
    }
});

test("validates an alias on Save and keeps the action available", async () => {
    const harness = installSourceManagerHarness([]);
    try {
        const editor = createMemoryEditor(
            "<ref>{{cite web|title=Example}}</ref>",
        );
        await openCitationFormatterDialog(editor);
        const manager = harness.getManager();
        const sourceId = manager.existingSources.value[0]?.id;
        assert.ok(sourceId);
        callAction(manager, "editListedSource", sourceId);
        const draft = manager.draft.value;
        assert.ok(draft);
        const titleIndex = draft.rows.findIndex((row) => row.name === "title");
        const title = draft.rows[titleIndex];
        assert.ok(title);

        callAction(manager, "openParameterAliasDialog", titleIndex);
        manager.parameterAliasDialogOriginalValue.value = "";
        manager.parameterAliasDialogValue.value = "Example alias";
        assert.equal(manager.canApplyParameterAlias(), false);
        assert.equal(manager.getParameterAliasDialogError(), "");

        callAction(manager, "applyParameterAlias");
        assert.equal(manager.parameterAliasDialogOpen.value, true);
        assert.match(manager.getParameterAliasDialogError(), /title/u);
        assert.equal(title.alias, "");

        manager.parameterAliasDialogOriginalValue.value = "Example";
        assert.equal(manager.canApplyParameterAlias(), true);
        assert.equal(manager.getParameterAliasDialogError(), "");
        callAction(manager, "applyParameterAlias");
        assert.equal(manager.parameterAliasDialogOpen.value, false);
        assert.equal(title.alias, "Example alias");
    } finally {
        harness.restore();
    }
});

test("gates a new source with CS1 before consistency analysis", async () => {
    const harness = installSourceManagerHarness([
        { parse: { categories: [], text: CS1_ERROR_HTML } },
        { parse: { categories: [], text: CS1_OK_HTML } },
    ]);
    try {
        const editor = createMemoryEditor("Lead.");
        await openCitationFormatterDialog(editor);
        const manager = harness.getManager();
        callAction(manager, "createManualSource");
        const draft = manager.draft.value;
        assert.ok(draft);
        const title = draft.rows.find((row) => row.name === "title");
        assert.ok(title);
        title.value = "Example";

        await callAsyncAction(manager, "saveDraft");
        assert.equal(harness.apiCallCount(), 1);
        assert.equal(editor.read(), "Lead.");

        await callAsyncAction(manager, "saveDraft");
        assert.equal(harness.apiCallCount(), 2);
        assert.match(editor.read(), /<ref>\{\{Cite web/u);
        assert.equal(manager.toolPopup.value, "analysis");

        callAction(manager, "cancelAllChanges");
        assert.equal(editor.read(), "Lead.");
        await Promise.resolve();
    } finally {
        harness.restore();
    }
});

function populateRepeatedMagazine(draft: SourceDraft): void {
    const title = draft.rows.find((row) => row.name === "title");
    const magazine = draft.rows.find((row) => row.name === "magazine");
    assert.ok(title);
    assert.ok(magazine);
    title.value = "Example";
    magazine.value = "First";
    draft.rows.push({
        alias: "",
        directive: "",
        main: false,
        name: "magazine",
        value: "Repeat",
    });
}

test("does not block a deliberate repeated-parameter CS1 report", async () => {
    const harness = installSourceManagerHarness([
        {
            parse: {
                categories: CS1_UNSUPPORTED_PARAMETER_CATEGORIES,
                text: CS1_COLLISION_ERROR_HTML,
            },
        },
    ]);
    try {
        const editor = createMemoryEditor("Lead.");
        await openCitationFormatterDialog(editor);
        const manager = harness.getManager();
        manager.manualTemplate.value = "cite magazine";
        callAction(manager, "createManualSource");
        const draft = manager.draft.value;
        assert.ok(draft);
        populateRepeatedMagazine(draft);
        callAction(manager, "sortParameters");

        await callAsyncAction(manager, "saveDraft");

        assert.equal(harness.apiCallCount(), 1);
        assert.match(
            editor.read(),
            /\| magazine = First\s+\| magazine-a = Repeat/u,
        );
        assert.deepEqual(harness.warningMessages, [
            "Repeated or equivalent parameters: magazine. The first value " +
                "stays active; later values receive -a, -b, … suffixes so " +
                "CS1 flags them.",
        ]);
        assert.deepEqual(harness.successMessages, [
            "Citation parameters sorted.",
            "Citation source saved.",
        ]);
        callAction(manager, "cancelAllChanges");
        await Promise.resolve();
    } finally {
        harness.restore();
    }
});

test("keeps unrelated marker diagnostics blocking", async () => {
    const harness = installSourceManagerHarness([
        {
            parse: {
                categories: CS1_UNSUPPORTED_PARAMETER_CATEGORIES,
                text: CS1_COLLISION_VALUE_ERROR_HTML,
            },
        },
    ]);
    try {
        const editor = createMemoryEditor("Lead.");
        await openCitationFormatterDialog(editor);
        const manager = harness.getManager();
        manager.manualTemplate.value = "cite magazine";
        callAction(manager, "createManualSource");
        const draft = manager.draft.value;
        assert.ok(draft);
        populateRepeatedMagazine(draft);
        callAction(manager, "sortParameters");

        await callAsyncAction(manager, "saveDraft");

        assert.equal(harness.apiCallCount(), 1);
        assert.equal(editor.read(), "Lead.");
        const messages = [...manager.draftCellErrors.value.values()].flatMap(
            (errors) => Object.values(errors),
        );
        assert.equal(
            messages.some((message) => message?.includes("Invalid value")),
            true,
        );
        callAction(manager, "close");
        await Promise.resolve();
    } finally {
        harness.restore();
    }
});

test("selects all consistency occurrences by default", async () => {
    const harness = installSourceManagerHarness([]);
    try {
        const editor = createMemoryEditor(
            '<ref name="A">{{cite web|url=https://example.com/a|' +
                "title=A|website=Example}}</ref>\n" +
                '<ref name="B">{{cite web|url=https://example.com/b|' +
                "title=B|website=EXAMPLE}}</ref>",
        );
        await openCitationFormatterDialog(editor);
        const manager = harness.getManager();
        callAction(manager, "openAnalysisTool");
        const finding = manager.sourceAnalysis.value.findings[0];
        assert.ok(finding);
        assert.ok(
            finding.occurrences.every((occurrence) => occurrence.selected),
        );

        for (const occurrence of finding.occurrences) {
            occurrence.selected = false;
        }
        callAction(manager, "selectAllAnalysisOccurrences", finding);
        assert.ok(
            finding.occurrences.every((occurrence) => occurrence.selected),
        );
        callAction(manager, "close");
        await Promise.resolve();
    } finally {
        harness.restore();
    }
});

test(
    "groups consistency changes into scoped value and alias tabs",
    testScopedConsistencyTabs,
);

test("opens alias-only results on their populated tab", async () => {
    const harness = installSourceManagerHarness([]);
    try {
        const editor = createMemoryEditor(ALIAS_ONLY_CONSISTENCY_TEXT);
        await openCitationFormatterDialog(editor);
        const manager = harness.getManager();
        callAction(manager, "openAnalysisTool");

        assert.equal(manager.activeAnalysisTab.value, "alias");
        assert.deepEqual(manager.analysisTabs.value[0]?.findings, []);
        assert.ok((manager.analysisTabs.value[1]?.findings.length ?? 0) > 0);

        callAction(manager, "close");
        await Promise.resolve();
    } finally {
        harness.restore();
    }
});

async function testScopedConsistencyTabs(): Promise<void> {
    const harness = installSourceManagerHarness([]);
    try {
        const editor = createMemoryEditor(CONSISTENCY_TEXT);
        await openCitationFormatterDialog(editor);
        const manager = harness.getManager();
        callAction(manager, "openAnalysisTool");
        assertAnalysisTabGroups(manager);

        assert.equal(manager.countSelectedAnalysisReplacements(), 2);
        manager.activeAnalysisTab.value = "alias";
        assert.equal(manager.countSelectedAnalysisReplacements(), 1);
        callAction(manager, "applyAnalysisReplacements");
        assertScopedAliasApplication(manager, editor);

        callAction(manager, "cancelAllChanges");
        assert.equal(editor.read(), CONSISTENCY_TEXT);
        await Promise.resolve();
    } finally {
        harness.restore();
    }
}

test("exposes safe openable links for URL draft parameters", async () => {
    const harness = installSourceManagerHarness([]);
    try {
        const editor = createMemoryEditor("");
        await openCitationFormatterDialog(editor);
        const manager = harness.getManager();
        assertUrlDraftParameterRecognition(manager);
        assertOpenableDraftUrlSafety(manager);

        callAction(manager, "close");
        await Promise.resolve();
    } finally {
        harness.restore();
    }
});

test("uses the merge glyph for author join and split actions", async () => {
    const harness = installSourceManagerHarness([]);
    try {
        const editor = createMemoryEditor("");
        await openCitationFormatterDialog(editor);
        const manager = harness.getManager();

        assert.equal(manager.joinAuthorIcon, cdxIconMerge);
        assert.equal(manager.splitAuthorIcon, cdxIconMerge);

        callAction(manager, "close");
        await Promise.resolve();
    } finally {
        harness.restore();
    }
});

function assertAnalysisTabGroups(manager: MountedManager): void {
    assert.equal(manager.activeAnalysisTab.value, "value");
    const [valueTab, aliasTab] = manager.analysisTabs.value;
    assert.ok(valueTab);
    assert.ok(aliasTab);
    assert.deepEqual(
        manager.analysisTabs.value.map((tab) => tab.name),
        ["value", "alias"],
    );
    assert.ok(valueTab.label.length > 0);
    assert.ok(aliasTab.label.length > 0);
    assert.notEqual(valueTab.label, aliasTab.label);
    assert.ok(valueTab.findings.length > 0);
    assert.ok(
        valueTab.findings.every((finding) => finding.category !== "alias"),
    );
    assert.ok(aliasTab.findings.length > 0);
    assert.ok(
        aliasTab.findings.every((finding) => finding.category === "alias"),
    );
    assert.deepEqual(valueTab.appliedFindings, []);
    assert.deepEqual(aliasTab.appliedFindings, []);
}

function assertScopedAliasApplication(
    manager: MountedManager,
    editor: editBox.EditBox,
): void {
    assert.match(editor.read(), /website\s*=\s*\[\[Example\]\]/u);
    assert.match(editor.read(), /author\s*=\s*\[\[Jane Doe\]\]/u);
    assert.match(
        editor.read(),
        /author\s*=\s*\[\[Jane Doe\]\]\s*<!-- # Doe, Jane -->/u,
    );
    const refreshedTabs = manager.analysisTabs.value;
    assert.equal(refreshedTabs[0]?.appliedFindings.length, 0);
    assert.equal(refreshedTabs[1]?.appliedFindings.length, 1);
    assert.ok((refreshedTabs[0]?.findings.length ?? 0) > 0);
}

function assertUrlDraftParameterRecognition(manager: MountedManager): void {
    for (const parameter of [
        "url",
        " URL ",
        "archive-url",
        "archiveurl",
        "chapter-url",
        "conference-url",
        "conferenceurl",
        "contribution-url",
        "contributionurl",
        "eventurl",
        "layurl",
        "link",
        "mapurl",
        "section-url",
        "sectionurl",
        "transcript-url",
        "transcripturl",
    ]) {
        assert.equal(manager.isUrlDraftParameter(parameter), true);
    }
    for (const parameter of [
        "dead-url",
        "deadurl",
        "title",
        "url-access",
        "url-status",
        "urlaccess",
        "urlstatus",
        "website",
    ]) {
        assert.equal(manager.isUrlDraftParameter(parameter), false);
    }
}

function assertOpenableDraftUrlSafety(manager: MountedManager): void {
    const url = "https://example.test/path?q=value#section";
    assert.equal(manager.getOpenableDraftUrl(` ${url} `), url);
    const archiveUrl =
        "https://web.archive.org/web/20240203040506/" +
        "https://example.test/path";
    assert.equal(manager.getOpenableDraftUrl(archiveUrl), archiveUrl);
    for (const value of [
        "",
        "/relative",
        "not a URL",
        "data:text/html,unsafe",
        "javascript:alert(1)",
    ]) {
        assert.ok(!manager.getOpenableDraftUrl(value));
    }
}

function assertCs1SourceOrder(
    manager: MountedManager,
    expected: Array<[title: string, severity: "error" | "maintenance"]>,
): void {
    assert.deepEqual(
        manager.cs1ToolSources.value.map((result) => [
            result.source.title,
            result.severity,
        ]),
        expected,
    );
}

function callAction(
    manager: MountedManager,
    name: string,
    ...arguments_: unknown[]
): void {
    const action = manager[name] as
        ((...values: unknown[]) => void) | undefined;
    assert.ok(action, `Missing ${name} action`);
    action(...arguments_);
}

async function callAsyncAction(
    manager: MountedManager,
    name: string,
): Promise<void> {
    const action = manager[name] as (() => Promise<void>) | undefined;
    assert.ok(action, `Missing ${name} action`);
    await action();
}

function createMemoryEditor(
    initialText: string,
    onWrite?: () => void,
): editBox.EditBox {
    let text = initialText;
    return {
        element: null,
        focus() {},
        read() {
            return text;
        },
        replaceSelection(value) {
            text += value;
        },
        write(value) {
            onWrite?.();
            text = value;
        },
    };
}

function createNativeTextarea(value: string): HTMLTextAreaElement {
    const textarea = new EventTarget() as HTMLTextAreaElement;
    textarea.value = value;
    textarea.selectionDirection = "none";
    textarea.selectionEnd = 0;
    textarea.selectionStart = 0;
    textarea.scrollLeft = 0;
    textarea.scrollTop = 0;
    textarea.setSelectionRange = (start, end, direction) => {
        textarea.selectionStart = start ?? 0;
        textarea.selectionEnd = end ?? textarea.selectionStart;
        textarea.selectionDirection = direction ?? "none";
    };
    return textarea;
}

const BROWSER_GLOBAL_NAMES = [
    "window",
    "DOMParser",
    "document",
    "mw",
    "requestAnimationFrame",
] as const;

function installSourceManagerHarness(
    responses: unknown[],
    runtimeTemplateData:
        CitationTemplateDataMap | Promise<CitationTemplateDataMap> = {},
) {
    resetSourceManagerHarness(runtimeTemplateData);
    const globals = globalThis as unknown as Record<string, unknown>;
    const original = snapshotGlobals(globals, BROWSER_GLOBAL_NAMES);
    let manager: MountedManager | null = null;
    let apiCalls = 0;
    const Vue = createVueModule((mounted) => {
        manager = mounted;
    });
    const Codex = createCodexComponents();
    installBrowserGlobals(globals, Vue, Codex, responses, () => {
        apiCalls += 1;
        return apiCalls;
    });
    return {
        apiCallCount: () => apiCalls,
        actionNotifications,
        errorMessages,
        executionTimerFinishes,
        executionTimerStarts,
        getManager(): MountedManager {
            assert.ok(manager);
            return manager;
        },
        restore() {
            restoreGlobals(globals, original);
        },
        infoMessages,
        successMessages,
        templateDataRequests,
        warningMessages,
    };
}

function resetSourceManagerHarness(
    runtimeTemplateData:
        CitationTemplateDataMap | Promise<CitationTemplateDataMap>,
): void {
    executionTimerFinishes.length = 0;
    executionTimerStarts.length = 0;
    actionNotifications.length = 0;
    errorMessages.length = 0;
    infoMessages.length = 0;
    successMessages.length = 0;
    templateDataRequests.length = 0;
    warningMessages.length = 0;
    templateDataResponse = runtimeTemplateData;
}

function createVueModule(
    onMount: (manager: MountedManager) => void,
): VueModule {
    return {
        computed<T>(getter: () => T) {
            return {
                get value(): T {
                    return getter();
                },
            };
        },
        createMwApp(component: unknown) {
            return {
                component() {},
                mount() {
                    const definition = component as {
                        setup: () => MountedManager;
                    };
                    onMount(definition.setup());
                },
                unmount() {},
            };
        },
        defineComponent(component: unknown) {
            return component;
        },
        ref<T>(value: T) {
            return { value };
        },
    };
}

function createCodexComponents(): CodexComponents {
    return {
        CdxButton: null,
        CdxCheckbox: null,
        CdxCombobox: null,
        CdxDialog: null,
        CdxField: null,
        CdxIcon: null,
        CdxMessage: null,
        CdxProgressBar: null,
        CdxRadio: null,
        CdxSelect: null,
        CdxTab: null,
        CdxTable: null,
        CdxTabs: null,
        CdxTextArea: null,
        CdxTextInput: null,
    };
}

function installBrowserGlobals(
    globals: Record<string, unknown>,
    Vue: VueModule,
    Codex: CodexComponents,
    responses: unknown[],
    nextApiCall: () => number,
): void {
    const require = ((module: string) =>
        module === "vue" ? Vue : Codex) as ResourceLoaderRequire;
    globals.window = {
        matchMedia() {
            return {
                matches: false,
                addEventListener() {},
                removeEventListener() {},
            };
        },
    };
    globals.DOMParser = FakeDomParser;
    globals.document = createFakeDocument();
    globals.requestAnimationFrame = (callback: () => void) => {
        callback();
        return 0;
    };
    globals.mw = createMediaWikiGlobal(require, responses, nextApiCall);
}

function createMediaWikiGlobal(
    require: ResourceLoaderRequire,
    responses: unknown[],
    nextApiCall: () => number,
) {
    return {
        Api: class {
            public async post(): Promise<unknown> {
                const call = nextApiCall();
                return responses[call - 1];
            }
        },
        config: {
            get(name: string) {
                if (name === "wgDBname") {
                    return "enwiki";
                }
                if (name === "wgPageName") {
                    return "Example";
                }
                return undefined;
            },
        },
        loader: {
            async using() {
                return require;
            },
        },
        util: { addCSS() {} },
    };
}

function createFakeDocument(): Document {
    const host = { id: "", remove() {} };
    return {
        createElement: () => host,
        documentElement: { append() {} },
        querySelector: () => null,
        querySelectorAll: () => [],
    } as unknown as Document;
}

class FakeDomParser {
    public parseFromString(markup: string): Document {
        return {
            getElementById(id: string) {
                const escaped = id.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
                const match = new RegExp(
                    `<div id="${escaped}">([\\s\\S]*?)</div>`,
                    "u",
                ).exec(markup);
                return match == null ? null : { innerHTML: match[1] };
            },
        } as unknown as Document;
    }
}

function snapshotGlobals(
    globals: Record<string, unknown>,
    names: readonly string[],
): Map<string, unknown> {
    return new Map(names.map((name) => [name, globals[name]]));
}

function restoreGlobals(
    globals: Record<string, unknown>,
    original: Map<string, unknown>,
): void {
    for (const [name, value] of original) {
        if (value === undefined) {
            delete globals[name];
        } else {
            globals[name] = value;
        }
    }
}
