import {
  AvatarAccessDeniedError,
  AvatarLimitExceededError,
  AvatarMinimumRequiredError,
  AvatarNotFoundError,
  InvalidAvatarImageError,
} from "../../shared/errors.js";
import {
  AVATAR_IMAGE_MAX_BYTES,
  AVATAR_LIMIT_GUEST,
  AVATAR_LIMIT_REGISTERED,
  DEFAULT_AVATAR_IMAGE_PUBLIC_BASE_URL,
  type AssertAvatarCreatable,
  type AssertAvatarDeletable,
  type AssertAvatarOwnedByUser,
  type Avatar,
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

/** 最低1件は残す（初期アバター含む） */
export const assertAvatarDeletable: AssertAvatarDeletable = (currentCount) => {
  if (currentCount <= 1) {
    throw new AvatarMinimumRequiredError();
  }
};

export function ensureAvatarExists(avatar: Avatar | null): Avatar {
  if (!avatar) {
    throw new AvatarNotFoundError();
  }
  return avatar;
}

const ALLOWED_IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
]);

export function assertAvatarImageValid(
  body: Buffer,
  contentType: string,
): void {
  if (!ALLOWED_IMAGE_TYPES.has(contentType)) {
    throw new InvalidAvatarImageError(
      "content type must be image/jpeg, image/png, or image/webp",
    );
  }
  if (body.length === 0) {
    throw new InvalidAvatarImageError("image file is empty");
  }
  if (body.length > AVATAR_IMAGE_MAX_BYTES) {
    throw new InvalidAvatarImageError("image file must be 1MB or less");
  }
}

export function normalizeAvatarName(
  name: string,
  fallback = "Avatar",
): string {
  const trimmed = name.trim();
  return trimmed || fallback;
}

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
