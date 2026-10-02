<!--
@file src/features/source-manager/dialogs/main-dialog.vue
Purpose: src / features / source manager / dialogs / main dialog module.

Table of contents:
1. Template
-->

<template>
    <cdx-dialog
        v-model:open="open"
        class="cf-source-manager"
        :title="msg('tool.name')"
        :subtitle="msg('tool.description')"
        :lang="interfaceLocale"
        :fixed-height="704"
        :close-button-label="msg('common.close')"
        use-close-button
        @update:open="onOpenChange"
    >
        <div
            :ref="setSourceManagerContent"
            class="cf-source-manager__dialog-body-content"
        >
            <cdx-message
                v-if="error"
                type="error"
                class="cf-source-manager__status"
            >
                {{ error }}
            </cdx-message>
            <cdx-message
                v-if="warning"
                type="warning"
                class="cf-source-manager__status"
            >
                {{ warning }}
            </cdx-message>
            <div>
                <cdx-tabs
                    v-model:active="activeLookupTab"
                    class="cf-source-manager__tabs"
                    :framed="true"
                >
                    <cdx-tab name="add" :label="msg('tabs.addSource')">
                        <form
                            class="cf-source-manager__source-lookup"
                            @submit.prevent="resolveEnteredSource()"
                        >
                            <h3 class="cf-source-manager__section-heading">
                                {{ msg("lookup.automaticTitle") }}
                            </h3>
                            <cdx-field
                                :status="
                                    error === msg('lookup.sourceRequired')
                                        ? 'error'
                                        : 'default'
                                "
                                :messages="{
                                    error:
                                        error === msg('lookup.sourceRequired')
                                            ? error
                                            : '',
                                }"
                            >
                                <template #label>
                                    {{ msg("lookup.source") }}
                                </template>
                                <template #description>
                                    {{ msg("lookup.sourceDescription") }}
                                </template>
                                <div
                                    class="cf-source-manager__source-lookup-controls"
                                >
                                    <cdx-text-input
                                        v-model="sourceInput"
                                        input-type="search"
                                        :disabled="loading"
                                        :placeholder="
                                            msg('lookup.sourcePlaceholder')
                                        "
                                        autofocus
                                        @paste="onSourcePaste"
                                    />
                                    <cdx-button
                                        action="progressive"
                                        weight="primary"
                                        :disabled="loading"
                                        type="submit"
                                    >
                                        {{ msg("lookup.findSource") }}
                                    </cdx-button>
                                </div>
                                <template #help-text>
                                    {{ msg("lookup.sourceHelpText") }}
                                </template>
                            </cdx-field>
                        </form>
                        <div v-if="loading" class="cf-source-manager__loading">
                            <small>{{ msg("lookup.loading") }}</small>
                            <cdx-progress-bar
                                :aria-label="msg('lookup.loading')"
                            />
                        </div>
                        <section class="cf-source-manager__manual-source">
                            <h3 class="cf-source-manager__section-heading">
                                {{ msg("lookup.manualTitle") }}
                            </h3>
                            <p class="cf-source-manager__section-description">
                                {{ msg("lookup.manualDescription") }}
                            </p>
                            <cdx-field
                                :status="
                                    error === msg('lookup.chooseCitationType')
                                        ? 'error'
                                        : 'default'
                                "
                                :messages="{
                                    error:
                                        error ===
                                        msg('lookup.chooseCitationType')
                                            ? error
                                            : '',
                                }"
                            >
                                <template #label>
                                    {{ msg("lookup.citationType") }}
                                </template>
                                <cdx-select
                                    v-model:selected="manualTemplate"
                                    :menu-items="manualTemplateOptions"
                                    :menu-config="{ visibleItemLimit: 8 }"
                                    :disabled="loading"
                                />
                            </cdx-field>
                            <cdx-field
                                v-if="manualTemplate === '__based-on__'"
                                :status="
                                    error === msg('lookup.chooseBasedOn')
                                        ? 'error'
                                        : 'default'
                                "
                                :messages="{
                                    error:
                                        error === msg('lookup.chooseBasedOn')
                                            ? error
                                            : '',
                                }"
                            >
                                <template #label>
                                    {{ msg("lookup.basedOn") }}
                                </template>
                                <cdx-select
                                    v-model:selected="basedOnSourceId"
                                    :menu-items="basedOnSourceOptions"
                                    :menu-config="{ visibleItemLimit: 6 }"
                                    :disabled="loading"
                                    :default-label="
                                        msg('lookup.chooseExisting')
                                    "
                                />
                            </cdx-field>
                            <cdx-button
                                class="cf-source-manager__create-source"
                                type="button"
                                :disabled="loading"
                                @click="createManualSource"
                            >
                                {{ msg("lookup.createSource") }}
                            </cdx-button>
                        </section>
                    </cdx-tab>
                    <cdx-tab
                        name="view"
                        :label="
                            msg('tabs.viewSources', {
                                count: existingSources.length,
                            })
                        "
                    >
                        <div
                            v-if="existingSources.length > 0"
                            class="cf-source-manager__source-filters"
                        >
                            <cdx-field class="cf-source-manager__filter-field">
                                <template #label>
                                    {{ keywordFilterLabel }}
                                </template>
                                <cdx-text-input
                                    v-model="existingSourceQuery"
                                    :placeholder="
                                        msg('lookup.filterKeywordPlaceholder')
                                    "
                                />
                            </cdx-field>
                            <div
                                v-if="sourceSectionSelectors.length > 0"
                                class="cf-source-manager__filter-field"
                                role="group"
                                aria-labelledby="cf-source-manager-section-filter-label"
                            >
                                <div
                                    id="cf-source-manager-section-filter-label"
                                    class="cf-source-manager__filter-label"
                                >
                                    {{ sectionFilterLabel }}
                                </div>
                                <div class="cf-source-manager__filter-controls">
                                    <cdx-combobox
                                        v-for="selector in sourceSectionSelectors"
                                        :key="selector.level"
                                        :selected="selector.selected"
                                        :menu-items="selector.menuItems"
                                        :menu-config="{ visibleItemLimit: 8 }"
                                        :aria-label="selector.label"
                                        @update:selected="
                                            selectSourceSection(
                                                selector,
                                                $event,
                                            )
                                        "
                                    />
                                </div>
                            </div>
                        </div>
                        <p v-if="existingSources.length === 0">
                            {{ msg("lookup.noDefinitions") }}
                        </p>
                        <p v-else-if="filteredExistingSources.length === 0">
                            {{ msg("lookup.noMatches") }}
                        </p>
                        <div
                            v-else-if="
                                sourceTableGroups.some(
                                    (group) => group.subReferences.length > 0,
                                )
                            "
                            class="cf-source-manager__source-table cf-source-manager__source-groups cdx-table"
                            role="table"
                            :aria-label="msg('lookup.tableCaption')"
                        >
                            <div
                                class="cf-source-manager__source-group-headings"
                                role="row"
                            >
                                <div
                                    v-for="column in sourceTableColumns"
                                    :key="column.id"
                                    role="columnheader"
                                >
                                    {{ column.label }}
                                </div>
                            </div>
                            <div
                                v-for="group in sourceTableGroups"
                                :key="group.source.sourceId"
                                class="cf-source-manager__source-group"
                                role="rowgroup"
                            >
                                <div
                                    class="cf-source-manager__source-group-main"
                                    :class="{
                                        'cf-source-manager__source-group-main--with-sub-references':
                                            group.subReferences.length > 0,
                                    }"
                                    role="row"
                                >
                                    <div
                                        class="cf-source-manager__source-reference"
                                        role="rowheader"
                                        :title="group.source.detailsTitle"
                                    >
                                        <span
                                            class="cf-source-manager__source-reference-name"
                                        >
                                            {{ group.source.reference }}
                                        </span>
                                        <small
                                            class="cf-source-manager__source-details"
                                            :title="group.source.usageTitle"
                                        >
                                            {{ group.source.usageSummary }}
                                        </small>
                                    </div>
                                    <div
                                        class="cf-source-manager__source-title"
                                        role="cell"
                                        :lang="
                                            group.source.titleLanguage ||
                                            undefined
                                        "
                                        :title="group.source.source"
                                    >
                                        {{ group.source.source }}
                                    </div>
                                    <div role="cell">
                                        <div
                                            class="cf-source-manager__source-actions"
                                        >
                                            <cdx-button
                                                action="progressive"
                                                weight="quiet"
                                                type="button"
                                                :disabled="loading"
                                                :aria-label="
                                                    msg('lookup.useSource')
                                                "
                                                :title="
                                                    canReuseListedSourceWithDetails(
                                                        group.source.sourceId,
                                                    )
                                                        ? msg(
                                                              'lookup.useSourceHint',
                                                          )
                                                        : msg(
                                                              'lookup.useSource',
                                                          )
                                                "
                                                @click="
                                                    insertListedSource(
                                                        group.source.sourceId,
                                                        $event,
                                                    )
                                                "
                                            >
                                                <cdx-icon
                                                    :icon="useSourceIcon"
                                                />
                                            </cdx-button>
                                            <cdx-button
                                                weight="quiet"
                                                type="button"
                                                :disabled="loading"
                                                :aria-label="
                                                    msg('lookup.editSource')
                                                "
                                                :title="
                                                    msg('lookup.editSource')
                                                "
                                                @click="
                                                    editListedSource(
                                                        group.source.sourceId,
                                                    )
                                                "
                                            >
                                                <cdx-icon
                                                    :icon="editSourceIcon"
                                                />
                                            </cdx-button>
                                        </div>
                                    </div>
                                </div>
                                <div
                                    v-for="subReference in group.subReferences"
                                    :key="subReference.subReferenceId"
                                    class="cf-source-manager__sub-reference-row"
                                    role="row"
                                >
                                    <div role="rowheader">
                                        <span
                                            class="cf-source-manager__sub-reference-count"
                                            :title="subReference.usageTitle"
                                        >
                                            {{ subReference.usageSummary }}
                                        </span>
                                        <span
                                            class="cf-source-manager__visually-hidden"
                                        >
                                            {{ subReference.reference }}
                                        </span>
                                    </div>
                                    <div
                                        class="cf-source-manager__source-title cf-source-manager__sub-reference-details"
                                        role="cell"
                                        :title="subReference.usageTitle"
                                    >
                                        {{ subReference.source }}
                                    </div>
                                    <div role="cell">
                                        <div
                                            class="cf-source-manager__source-actions"
                                        >
                                            <cdx-button
                                                action="progressive"
                                                weight="quiet"
                                                type="button"
                                                :disabled="loading"
                                                :aria-label="
                                                    msg(
                                                        'lookup.reuseSubReference',
                                                    )
                                                "
                                                :title="
                                                    msg(
                                                        'lookup.reuseSubReference',
                                                    )
                                                "
                                                @click="
                                                    reuseListedSubReference(
                                                        subReference.sourceId,
                                                        subReference.subReferenceId,
                                                    )
                                                "
                                            >
                                                <cdx-icon
                                                    :icon="useSourceIcon"
                                                />
                                            </cdx-button>
                                            <cdx-button
                                                weight="quiet"
                                                type="button"
                                                :disabled="loading"
                                                :aria-label="
                                                    msg(
                                                        'lookup.editSubReference',
                                                    )
                                                "
                                                :title="
                                                    msg(
                                                        'lookup.editSubReference',
                                                    )
                                                "
                                                @click="
                                                    editListedSubReference(
                                                        subReference.sourceId,
                                                        subReference.subReferenceId,
                                                    )
                                                "
                                            >
                                                <cdx-icon
                                                    :icon="editSourceIcon"
                                                />
                                            </cdx-button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <cdx-table
                            v-else
                            :key="sourceTablePaginationKey"
                            class="cf-source-manager__source-table"
                            :caption="msg('lookup.tableCaption')"
                            :hide-caption="true"
                            :use-row-headers="true"
                            :columns="sourceTableColumns"
                            :data="sourceTableRows"
                            :paginate="
                                sourceTableRows.length > 100 &&
                                sourceTableRows.every(
                                    (row) => row.subReferenceId === '',
                                )
                            "
                            :pagination-size-default="100"
                            :pagination-size-options="[
                                { value: 10 },
                                { value: 20 },
                                { value: 50 },
                                { value: 100 },
                            ]"
                        >
                            <template #item-reference="{ item, row }">
                                <span
                                    v-if="row.subReferenceId"
                                    class="cf-source-manager__visually-hidden"
                                >
                                    {{ item }}
                                </span>
                                <div
                                    v-else
                                    class="cf-source-manager__source-reference"
                                >
                                    <span
                                        class="cf-source-manager__source-reference-name"
                                        :title="row.detailsTitle"
                                    >
                                        {{ item }}
                                    </span>
                                    <small
                                        class="cf-source-manager__source-details"
                                        :title="row.usageTitle"
                                    >
                                        {{ row.usageSummary }}
                                    </small>
                                </div>
                            </template>
                            <template #item-source="{ item, row }">
                                <span
                                    class="cf-source-manager__source-title"
                                    :class="{
                                        'cf-source-manager__sub-reference-details':
                                            row.subReferenceId !== '',
                                    }"
                                    :lang="row.titleLanguage || undefined"
                                    :title="
                                        row.subReferenceId
                                            ? row.usageTitle
                                            : item
                                    "
                                >
                                    <template v-if="row.subReferenceId">
                                        ({{ item }})
                                    </template>
                                    <template v-else>{{ item }}</template>
                                </span>
                            </template>
                            <template #item-actions="{ row }">
                                <div class="cf-source-manager__source-actions">
                                    <cdx-button
                                        v-if="!row.subReferenceId"
                                        action="progressive"
                                        weight="quiet"
                                        type="button"
                                        :disabled="loading"
                                        :aria-label="msg('lookup.useSource')"
                                        :title="
                                            canReuseListedSourceWithDetails(
                                                row.sourceId,
                                            )
                                                ? msg('lookup.useSourceHint')
                                                : msg('lookup.useSource')
                                        "
                                        @click="
                                            insertListedSource(
                                                row.sourceId,
                                                $event,
                                            )
                                        "
                                    >
                                        <cdx-icon :icon="useSourceIcon" />
                                    </cdx-button>
                                    <cdx-button
                                        v-else
                                        action="progressive"
                                        weight="quiet"
                                        type="button"
                                        :disabled="loading"
                                        :aria-label="
                                            msg('lookup.reuseSubReference')
                                        "
                                        :title="msg('lookup.reuseSubReference')"
                                        @click="
                                            reuseListedSubReference(
                                                row.sourceId,
                                                row.subReferenceId,
                                            )
                                        "
                                    >
                                        <cdx-icon :icon="useSourceIcon" />
                                    </cdx-button>
                                    <cdx-button
                                        weight="quiet"
                                        type="button"
                                        :disabled="loading"
                                        :aria-label="
                                            row.subReferenceId
                                                ? msg('lookup.editSubReference')
                                                : msg('lookup.editSource')
                                        "
                                        :title="
                                            row.subReferenceId
                                                ? msg('lookup.editSubReference')
                                                : msg('lookup.editSource')
                                        "
                                        @click="
                                            row.subReferenceId
                                                ? editListedSubReference(
                                                      row.sourceId,
                                                      row.subReferenceId,
                                                  )
                                                : editListedSource(row.sourceId)
                                        "
                                    >
                                        <cdx-icon :icon="editSourceIcon" />
                                    </cdx-button>
                                </div>
                            </template>
                        </cdx-table>
                    </cdx-tab>
                    <cdx-tab name="tools" :label="msg('tabs.tools')">
                        <div class="cf-source-manager__tools">
                            <cdx-field
                                class="cf-source-manager__advanced-formatting"
                                :is-fieldset="true"
                            >
                                <template #label>
                                    {{ msg("tools.advanced") }}
                                </template>
                                <template #description>
                                    {{ msg("tools.advancedDescription") }}
                                </template>
                                <cdx-checkbox
                                    :model-value="referenceStyle === 'r'"
                                    @update:model-value="setCompactReferences"
                                >
                                    {{ msg("tools.compactReferences") }}
                                </cdx-checkbox>
                                <cdx-checkbox
                                    :model-value="citationLayout === 'block'"
                                    @update:model-value="setBlockCitations"
                                >
                                    {{ msg("tools.blockCitations") }}
                                </cdx-checkbox>
                                <cdx-field :is-fieldset="true">
                                    <template #label>
                                        {{ msg("tools.scriptTitle") }}
                                    </template>
                                    <cdx-checkbox
                                        :model-value="formatScriptTitles"
                                        @update:model-value="
                                            setFormatScriptTitles
                                        "
                                    >
                                        {{ msg("tools.formatScriptTitles") }}
                                    </cdx-checkbox>
                                    <cdx-radio
                                        :model-value="scriptTitleMode"
                                        :disabled="!formatScriptTitles"
                                        input-value="non-latin"
                                        name="script-title-mode"
                                        @update:model-value="setScriptTitleMode"
                                    >
                                        {{ msg("tools.scriptTitleNonLatin") }}
                                    </cdx-radio>
                                    <cdx-radio
                                        :model-value="scriptTitleMode"
                                        :disabled="!formatScriptTitles"
                                        input-value="all-foreign"
                                        name="script-title-mode"
                                        @update:model-value="setScriptTitleMode"
                                    >
                                        {{ msg("tools.scriptTitleAllForeign") }}
                                    </cdx-radio>
                                </cdx-field>
                            </cdx-field>
                            <section class="cf-source-manager__tool-section">
                                <h3>{{ msg("tools.checks") }}</h3>
                                <p>{{ msg("tools.checksDescription") }}</p>
                                <div class="cf-source-manager__tool-launchers">
                                    <cdx-button
                                        type="button"
                                        @click="openAnalysisTool"
                                    >
                                        {{ msg("tools.analyze") }}
                                    </cdx-button>
                                    <cdx-button
                                        v-if="canCheckCs1Tool"
                                        type="button"
                                        :disabled="cs1ToolStatus === 'checking'"
                                        @click="openCs1Tool"
                                    >
                                        {{ msg("tools.checkCs1") }}
                                    </cdx-button>
                                    <cdx-button
                                        type="button"
                                        @click="openNonCs1Tool"
                                    >
                                        {{ msg("tools.checkNonCs1") }}
                                    </cdx-button>
                                </div>
                            </section>
                        </div>
                    </cdx-tab>
                </cdx-tabs>
            </div>
        </div>
        <template #footer>
            <div class="cf-source-manager__footer">
                <p class="cf-source-manager__footer-note">
                    {{ msg("tool.editorScope") }}
                </p>
                <div class="cf-source-manager__footer-actions">
                    <template
                        v-for="dialogAction in getDialogActionOrder([
                            'undo',
                            'close',
                            'format',
                        ])"
                        :key="dialogAction"
                    >
                        <cdx-button
                            v-if="dialogAction === 'undo'"
                            weight="quiet"
                            type="button"
                            :disabled="loading"
                            @click="cancelAllChanges"
                        >
                            {{ msg("tool.undoSession") }}
                        </cdx-button>
                        <cdx-button
                            v-if="dialogAction === 'close'"
                            type="button"
                            @click="close"
                        >
                            {{ msg("common.close") }}
                        </cdx-button>
                        <cdx-button
                            v-if="
                                dialogAction === 'format' &&
                                activeLookupTab === 'tools'
                            "
                            class="cf-source-manager__primary-action"
                            action="progressive"
                            weight="primary"
                            type="button"
                            :disabled="loading || formatArticleDisabled"
                            @click="formatArticle"
                        >
                            {{ msg("tool.formatCitations") }}
                        </cdx-button>
                    </template>
                </div>
            </div>
        </template>
    </cdx-dialog>
    <cdx-dialog
        v-model:open="referenceReuseDialogOpen"
        class="cf-source-manager__reference-reuse-dialog"
        :title="
            referenceReuseSubReference
                ? msg('lookup.editSubReference')
                : msg('lookup.useWithDetails')
        "
        :lang="interfaceLocale"
        :close-button-label="msg('common.cancel')"
        use-close-button
        @update:open="onReferenceReuseDialogOpenChange"
    >
        <div class="cf-source-manager__dialog-body-content">
            <cdx-message v-if="referenceReuseError" type="error">
                {{ referenceReuseError }}
            </cdx-message>
            <p class="cf-source-manager__reference-reuse-name">
                {{ referenceReuseSource?.referenceName }}
                <small v-if="referenceReuseSource?.group">
                    {{
                        msg("lookup.group", {
                            group: referenceReuseSource.group,
                        })
                    }}
                </small>
            </p>
            <cdx-field>
                <template #label>
                    {{ msg("lookup.referenceDetails") }}
                </template>
                <template #description>
                    {{ msg("lookup.referenceDetailsDescription") }}
                </template>
                <cdx-text-area
                    v-model="referenceReuseDetails"
                    :autosize="true"
                    rows="2"
                    :disabled="loading"
                    :aria-label="msg('lookup.referenceDetails')"
                    autofocus
                />
            </cdx-field>
            <p v-if="referenceReuseSubReferences.length > 1">
                {{
                    msg("lookup.editSubReferenceUses", {
                        count: referenceReuseSubReferences.length,
                    })
                }}
            </p>
            <section class="cf-source-manager__reference-reuse-preview">
                <h3 class="cf-source-manager__section-heading">
                    {{ msg("lookup.referencePreview") }}
                </h3>
                <code>{{ getReferenceReusePreview() }}</code>
            </section>
        </div>
        <template #footer>
            <div
                class="cf-source-manager__reference-reuse-actions cf-source-manager__footer-actions"
            >
                <template
                    v-for="dialogAction in getDialogActionOrder([
                        'cancel',
                        'use',
                    ])"
                    :key="dialogAction"
                >
                    <cdx-button
                        v-if="dialogAction === 'cancel'"
                        type="button"
                        @click="closeReferenceReuseDialog"
                    >
                        {{ msg("common.cancel") }}
                    </cdx-button>
                    <cdx-button
                        v-if="dialogAction === 'use'"
                        class="cf-source-manager__primary-action"
                        action="progressive"
                        weight="primary"
                        type="button"
                        :disabled="loading || referenceReuseSource == null"
                        @click="insertReferenceWithDetails"
                    >
                        {{
                            referenceReuseSubReference
                                ? msg("common.saveChanges")
                                : msg("lookup.useSource")
                        }}
                    </cdx-button>
                </template>
            </div>
        </template>
    </cdx-dialog>
</template>
