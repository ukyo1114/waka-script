import type {
  CreateEmailTokenInput,
  EmailPurpose,
  EmailToken,
} from "../../domain/email/index.js";
import type { UserId } from "../../domain/user/id.js";

export interface EmailTokenRepository {
  create(input: CreateEmailTokenInput): Promise<EmailToken>;
  findValidByTokenHash(
    purpose: EmailPurpose,
    tokenHash: string,
    now?: Date,
  ): Promise<EmailToken | null>;
  markUsed(id: string, usedAt?: Date): Promise<EmailToken | null>;
  invalidateActiveForUser(
    userId: UserId,
    purpose: EmailPurpose,
  ): Promise<number>;
}
