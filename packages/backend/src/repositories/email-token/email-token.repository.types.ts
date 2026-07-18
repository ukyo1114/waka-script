import type { EmailActionPurpose } from "../../domain/email/index.js";
import type { UserId } from "../../domain/user/index.js";

export type EmailTokenId = string;

/**
 * メール認証コード検証後に発行するアクション用トークンの永続化レコード。
 * 平文は保存せず tokenHash のみ保持する。セッションとは別物。
 */
export type EmailToken = {
  id: EmailTokenId;
  email: string;
  userId: UserId | null;
  purpose: EmailActionPurpose;
  tokenHash: string;
  expiresAt: Date;
  usedAt: Date | null;
  createdAt: Date;
};

export type CreateEmailTokenInput = {
  email: string;
  userId: UserId | null;
  purpose: EmailActionPurpose;
  tokenHash: string;
  expiresAt: Date;
};

export interface EmailTokenRepository {
  create(input: CreateEmailTokenInput): Promise<EmailToken>;
  findById(id: EmailTokenId): Promise<EmailToken | null>;
  markUsed(id: EmailTokenId, usedAt?: Date): Promise<EmailToken | null>;
  /** 同一 email+purpose の未使用トークンを無効化する */
  invalidateActiveForEmail(
    email: string,
    purpose: EmailActionPurpose,
  ): Promise<number>;
}
