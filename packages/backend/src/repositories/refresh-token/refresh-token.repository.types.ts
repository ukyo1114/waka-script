import type { UserId } from "../../domain/user/index.js";

export type RefreshTokenId = string;

/**
 * リフレッシュトークンの永続化レコード。
 * 平文は保存せず tokenHash のみ。アクセス JWT とは別物。
 */
export type RefreshToken = {
  id: RefreshTokenId;
  userId: UserId;
  tokenHash: string;
  expiresAt: Date;
  revokedAt: Date | null;
  replacedByTokenId: RefreshTokenId | null;
  createdAt: Date;
};

export type CreateRefreshTokenInput = {
  userId: UserId;
  tokenHash: string;
  expiresAt: Date;
};

export interface RefreshTokenRepository {
  create(input: CreateRefreshTokenInput): Promise<RefreshToken>;
  findById(id: RefreshTokenId): Promise<RefreshToken | null>;
  revoke(
    id: RefreshTokenId,
    revokedAt?: Date,
    replacedByTokenId?: RefreshTokenId | null,
  ): Promise<RefreshToken | null>;
  /** ユーザーの有効なリフレッシュトークンをすべて失効させる */
  revokeAllForUser(userId: UserId, revokedAt?: Date): Promise<number>;
}
