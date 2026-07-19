import {
  AlreadyBlockedError,
  BlockedUserNotFoundError,
  CannotBlockChannelAdminError,
  ChannelUserBlockedError,
} from "../../shared/errors.js";
import type { UserId } from "../user/index.js";
import type { BlockedUser } from "./blocked-user.types.js";

/** チャンネル管理者はブロックできない */
export const assertCannotBlockChannelAdmin = (
  adminUserId: UserId,
  targetUserId: UserId,
): void => {
  if (adminUserId === targetUserId) {
    throw new CannotBlockChannelAdminError();
  }
};

/** 既に有効なブロックがある場合は拒否 */
export const assertNotAlreadyBlocked = (
  existing: BlockedUser | null,
): void => {
  if (existing && !existing.deletedAt) {
    throw new AlreadyBlockedError();
  }
};

/** join 時: ブロックされていれば拒否 */
export const assertNotBlockedFromChannel = (
  existing: BlockedUser | null,
): void => {
  if (existing && !existing.deletedAt) {
    throw new ChannelUserBlockedError();
  }
};

export const ensureBlockedUserExists = (
  blocked: BlockedUser | null,
): BlockedUser => {
  if (!blocked || blocked.deletedAt) {
    throw new BlockedUserNotFoundError();
  }
  return blocked;
};
