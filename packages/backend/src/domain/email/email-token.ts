import type { UserId } from "../user/id.js";
import type { EmailPurpose } from "./purpose.js";

export type EmailTokenId = string;

export type EmailToken = {
  id: EmailTokenId;
  userId: UserId;
  purpose: EmailPurpose;
  tokenHash: string;
  expiresAt: Date;
  usedAt: Date | null;
  createdAt: Date;
};

export type CreateEmailTokenInput = {
  userId: UserId;
  purpose: EmailPurpose;
  tokenHash: string;
  expiresAt: Date;
};
