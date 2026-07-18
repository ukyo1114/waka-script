import type {
  CreateEmailTokenInput,
  EmailToken,
  EmailTokenPurpose,
} from "../domain/email-token.js";
import type { UserId } from "../domain/user.js";

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
