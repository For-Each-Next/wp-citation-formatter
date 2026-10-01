/** Runtime ports used by the MediaWiki editor integration. */

import type { Logger } from "../../shared/logging/index.ts";
import type { ActionNotifier } from "../../platform/mediawiki/notifications/index.ts";

export interface EditorRuntime {
    logger: Logger;
    notifyAction: ActionNotifier;
}
