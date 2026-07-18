import type { EmailCode, EmailPurpose } from "../../domain/email/index.js";
import type { UserId } from "../../domain/user/index.js";

export type CreateEmailCodeInput = {
  email: string;
  userId: UserId | null;
  purpose: EmailPurpose;
  codeHash: string;
  expiresAt: Date;
};

export interface EmailCodeRepository {
  create(input: CreateEmailCodeInput): Promise<EmailCode>;
  findValidByCodeHash(
    purpose: EmailPurpose,
    codeHash: string,
    now?: Date,
  ): Promise<EmailCode | null>;
  findLatestByEmailAndPurpose(
    email: string,
    purpose: EmailPurpose,
  ): Promise<EmailCode | null>;
  markUsed(id: string, usedAt?: Date): Promise<EmailCode | null>;
  incrementAttemptCount(id: string): Promise<EmailCode | null>;
  invalidateActiveForEmail(
    email: string,
    purpose: EmailPurpose,
  ): Promise<number>;
}
