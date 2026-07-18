import type {
  CreateEmailTokenInput,
  EmailPurpose,
  EmailToken,
} from "../../domain/email/index.js";

export interface EmailTokenRepository {
  create(input: CreateEmailTokenInput): Promise<EmailToken>;
  findValidByTokenHash(
    purpose: EmailPurpose,
    tokenHash: string,
    now?: Date,
  ): Promise<EmailToken | null>;
  findLatestByEmailAndPurpose(
    email: string,
    purpose: EmailPurpose,
  ): Promise<EmailToken | null>;
  markUsed(id: string, usedAt?: Date): Promise<EmailToken | null>;
  invalidateActiveForEmail(
    email: string,
    purpose: EmailPurpose,
  ): Promise<number>;
}
