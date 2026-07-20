export type {
  AssertAvatarCreatable,
  AssertAvatarDeletable,
  AssertAvatarOwnedByUser,
  Avatar,
  AvatarId,
  GetAvatarLimit,
} from "./avatar.types.js";
export {
  AVATAR_IMAGE_MAX_BYTES,
  AVATAR_LIMIT_GUEST,
  AVATAR_LIMIT_REGISTERED,
  DEFAULT_AVATAR_IMAGE_PUBLIC_BASE_URL,
} from "./avatar.types.js";
export {
  assertAvatarCreatable,
  assertAvatarDeletable,
  assertAvatarImageValid,
  assertAvatarOwnedByUser,
  buildAvatarImageUrl,
  buildAvatarObjectKey,
  ensureAvatarExists,
  getAvatarLimit,
  normalizeAvatarName,
} from "./avatar.domain.js";
