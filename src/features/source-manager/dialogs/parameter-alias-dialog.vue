<!--
@file src/features/source-manager/dialogs/parameter-alias-dialog.vue
Purpose: src / features / source manager / dialogs / parameter alias dialog module.

Table of contents:
1. Template
-->

<template>
    <cdx-dialog
        v-model:open="parameterAliasDialogOpen"
        class="cf-source-manager__parameter-alias-dialog"
        :title="msg('draft.alias')"
        :lang="interfaceLocale"
        :close-button-label="msg('common.cancel')"
        @update:open="onParameterAliasDialogOpenChange"
    >
        <div class="cf-source-manager__dialog-body-content">
            <div class="cf-source-manager__parameter-alias-fields">
                <cdx-field
                    class="cf-source-manager__parameter-alias-original"
                    :status="
                        getParameterAliasDialogError() ? 'error' : 'default'
                    "
                    :messages="{
                        error: getParameterAliasDialogError(),
                    }"
                >
                    <template #label>
                        {{ getParameterAliasOriginalValueLabel() }}
                    </template>
                    <template #description>
                        {{ msg("draft.originalValueDescription") }}
                    </template>
                    <cdx-text-area
                        v-model="parameterAliasDialogOriginalValue"
                        :autosize="true"
                        rows="1"
                        :status="
                            getParameterAliasDialogError() ? 'error' : 'default'
                        "
                        :aria-label="getParameterAliasOriginalValueLabel()"
                    />
                </cdx-field>
                <cdx-field>
                    <template #label>
                        {{ getParameterAliasDialogLabel() }}
                    </template>
                    <template #description>
                        {{ msg("draft.aliasDialogDescription") }}
                    </template>
                    <cdx-text-area
                        v-model="parameterAliasDialogValue"
                        :autosize="true"
                        rows="1"
                        :aria-label="getParameterAliasDialogLabel()"
                        autofocus
                    />
                </cdx-field>
                <cdx-field :is-fieldset="true">
                    <template #label>
                        {{ msg("draft.directives") }}
                    </template>
                    <template #description>
                        {{ msg("draft.directivesDescription") }}
                    </template>
                    <cdx-checkbox
                        v-model="parameterAliasDialogDirectives"
                        input-value="!no-author"
                    >
                        <code>!no-author</code>
                        — {{ msg("draft.noAuthorDirective") }}
                    </cdx-checkbox>
                    <cdx-checkbox
                        v-model="parameterAliasDialogDirectives"
                        input-value="!no-date"
                    >
                        <code>!no-date</code>
                        — {{ msg("draft.noDateDirective") }}
                    </cdx-checkbox>
                    <cdx-checkbox
                        v-model="parameterAliasDialogDirectives"
                        input-value="!no-part"
                    >
                        <code>!no-part</code>
                        — {{ msg("draft.noPartDirective") }}
                    </cdx-checkbox>
                </cdx-field>
            </div>
        </div>
        <template #footer>
            <div class="cf-source-manager__footer-actions">
                <template
                    v-for="dialogAction in getDialogActionOrder([
                        'cancel',
                        'save',
                    ])"
                    :key="dialogAction"
                >
                    <cdx-button
                        v-if="dialogAction === 'cancel'"
                        type="button"
                        :disabled="loading"
                        @click="closeParameterAliasDialog"
                    >
                        {{ msg("common.cancel") }}
                    </cdx-button>
                    <cdx-button
                        v-if="dialogAction === 'save'"
                        class="cf-source-manager__primary-action"
                        action="progressive"
                        weight="primary"
                        type="button"
                        :disabled="loading"
                        @click="applyParameterAlias"
                    >
                        {{ msg("common.save") }}
                    </cdx-button>
                </template>
            </div>
        </template>
    </cdx-dialog>
</template>
