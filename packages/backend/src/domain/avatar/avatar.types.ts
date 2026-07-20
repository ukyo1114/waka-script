import type { UserId } from "../user/index.js";

export type AvatarId = string;

export type Avatar = {
  id: AvatarId;
  userId: UserId;
  name: string;
  /** S3 公開 URL。キーは固定で、画像差し替え時も URL は変えない */
  imageUrl: string;
  createdAt: Date;
  updatedAt: Date;
};

/** 登録済みユーザーのアバター上限 */
export const AVATAR_LIMIT_REGISTERED = 10;

/** ゲストユーザーのアバター上限 */
export const AVATAR_LIMIT_GUEST = 1;

/** アバター画像の最大サイズ（バイト） */
export const AVATAR_IMAGE_MAX_BYTES = 1 * 1024 * 1024;

/**
 * アバター画像の公開ベース URL（末尾スラッシュなし）。
 * 例: https://cdn.example.com または CloudFront
 * 環境変数 AVATAR_IMAGE_PUBLIC_BASE_URL があればそちらを優先。
 */
export const DEFAULT_AVATAR_IMAGE_PUBLIC_BASE_URL =
  "https://static.jinro.local";

export type AssertAvatarCreatable = (
  isGuest: boolean,
  currentCount: number,
) => void;

export type GetAvatarLimit = (isGuest: boolean) => number;

export type AssertAvatarOwnedByUser = (
  avatarUserId: UserId,
  requesterUserId: UserId,
) => void;

export type AssertAvatarDeletable = (currentCount: number) => void;
