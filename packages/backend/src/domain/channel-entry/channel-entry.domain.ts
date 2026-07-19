import { EntryProcessingError } from "../../shared/errors.js";
import type { Channel } from "../channel/index.js";

/** ロック未取得なら ENTRY_PROCESSING */
export const ensureEntryProcessingLockAcquired = (
  lockedChannel: Channel | null,
): Channel => {
  if (!lockedChannel) {
    throw new EntryProcessingError();
  }
  return lockedChannel;
};
