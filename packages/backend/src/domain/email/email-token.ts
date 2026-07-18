import type { UserId } from "../user/id.js";
import type { EmailPurpose } from "./purpose.js";

export type EmailTokenId = string;

export type EmailToken = {
  id: EmailTokenId;
  email: string;
  userId: UserId | null;
  purpose: EmailPurpose;
  tokenHash: string;
  expiresAt: Date;
  usedAt: Date | null;
  createdAt: Date;
};
