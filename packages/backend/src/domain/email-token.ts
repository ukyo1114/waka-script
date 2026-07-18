import type { UserId } from "./user.js";

export type EmailTokenId = string;

export type EmailTokenPurpose = "email_verification" | "password_reset";

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
