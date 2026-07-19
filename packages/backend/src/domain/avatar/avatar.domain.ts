import { AvatarLimitExceededError } from "../../shared/errors.js";
import {
  AVATAR_LIMIT_GUEST,
  AVATAR_LIMIT_REGISTERED,
  type AssertAvatarCreatable,
  type GetAvatarLimit,
} from "./avatar.types.js";

export const getAvatarLimit: GetAvatarLimit = (isGuest) =>
  isGuest ? AVATAR_LIMIT_GUEST : AVATAR_LIMIT_REGISTERED;

/**
 * 追加作成可能か判定する。
 * currentCount はリポジトリ取得済みの件数を渡す。
 */
export const assertAvatarCreatable: AssertAvatarCreatable = (
  isGuest,
  currentCount,
) => {
  const limit = getAvatarLimit(isGuest);
  if (currentCount >= limit) {
    throw new AvatarLimitExceededError(limit);
  }
};
