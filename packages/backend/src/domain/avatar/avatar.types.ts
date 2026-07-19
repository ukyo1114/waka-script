import type { UserId } from "../user/index.js";

export type AvatarId = string;

export type Avatar = {
  id: AvatarId;
  userId: UserId;
  name: string;
  imageUrl: string;
  createdAt: Date;
  updatedAt: Date;
};

/** 登録済みユーザーのアバター上限 */
export const AVATAR_LIMIT_REGISTERED = 10;

/** ゲストユーザーのアバター上限 */
export const AVATAR_LIMIT_GUEST = 1;

/** 初期アバター用のデフォルト画像 URL（後で CDN 等に差し替え可能） */
export const DEFAULT_AVATAR_IMAGE_URL =
  "https://static.jinro.local/avatars/default.png";

export type AssertAvatarCreatable = (
  isGuest: boolean,
  currentCount: number,
) => void;

export type GetAvatarLimit = (isGuest: boolean) => number;
