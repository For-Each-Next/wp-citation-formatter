<template>
    <cdx-dialog
        v-model:open="closeConfirmationOpen"
        class="cf-source-manager__confirmation-dialog"
        :title="msg('analysis.closeConfirmationTitle')"
        :lang="interfaceLocale"
        @update:open="onCloseConfirmationOpenChange"
    >
        <div class="cf-source-manager__dialog-body-content">
            <p>{{ msg("analysis.closeConfirmationBody") }}</p>
        </div>
        <template #footer>
            <div class="cf-source-manager__footer-actions">
                <cdx-button
                    weight="quiet"
                    type="button"
                    @click="undoAnalysisChangesAndClose"
                    >{{ msg("analysis.undoAndClose") }}</cdx-button
                >
                <cdx-button type="button" @click="cancelCloseConfirmation">{{
                    msg("analysis.continueEditing")
                }}</cdx-button>
                <cdx-button
                    class="cf-source-manager__primary-action"
                    action="progressive"
                    weight="primary"
                    type="button"
                    @click="keepAnalysisChangesAndClose"
                    >{{ msg("analysis.keepAndClose") }}</cdx-button
                >
            </div>
        </template>
    </cdx-dialog>
</template>
