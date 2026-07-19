import {
  AvatarAccessDeniedError,
  AvatarLimitExceededError,
} from "../../shared/errors.js";
import type { UserId } from "../user/index.js";
import {
  AVATAR_LIMIT_GUEST,
  AVATAR_LIMIT_REGISTERED,
  DEFAULT_AVATAR_IMAGE_PUBLIC_BASE_URL,
  type AssertAvatarCreatable,
  type AssertAvatarOwnedByUser,
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

/** アバターが操作者の所有であることを確認する */
export const assertAvatarOwnedByUser: AssertAvatarOwnedByUser = (
  avatarUserId,
  requesterUserId,
) => {
  if (avatarUserId !== requesterUserId) {
    throw new AvatarAccessDeniedError();
  }
};

/** S3 オブジェクトキー（バケット内パス） */
export function buildAvatarObjectKey(avatarId: string): string {
  return `avatars/${avatarId}`;
}

/** 公開 URL。差し替え後も同じキー／同じ URL を使う */
export function buildAvatarImageUrl(
  avatarId: string,
  publicBaseUrl?: string,
): string {
  const base = (
    publicBaseUrl ??
    process.env.AVATAR_IMAGE_PUBLIC_BASE_URL ??
    DEFAULT_AVATAR_IMAGE_PUBLIC_BASE_URL
  ).replace(/\/$/, "");
  return `${base}/${buildAvatarObjectKey(avatarId)}`;
}
