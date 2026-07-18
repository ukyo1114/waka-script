import type { UserId } from "../user/types.js";

export type EmailTokenId = string;

export type EmailTokenPurpose =
  | "register"
  | "email-change"
  | "password-reset"
  | "unlock";

export type EmailToken = {
  id: EmailTokenId;
  userId: UserId;
  purpose: EmailTokenPurpose;
  tokenHash: string;
  expiresAt: Date;
  usedAt: Date | null;
  createdAt: Date;
};

export type CreateEmailTokenInput = {
  userId: UserId;
  purpose: EmailTokenPurpose;
  tokenHash: string;
  expiresAt: Date;
};

export interface EmailTokenRepository {
  create(input: CreateEmailTokenInput): Promise<EmailToken>;
  findValidByTokenHash(
    purpose: EmailTokenPurpose,
    tokenHash: string,
    now?: Date,
  ): Promise<EmailToken | null>;
  markUsed(id: string, usedAt?: Date): Promise<EmailToken | null>;
  invalidateActiveForUser(
    userId: UserId,
    purpose: EmailTokenPurpose,
  ): Promise<number>;
}
