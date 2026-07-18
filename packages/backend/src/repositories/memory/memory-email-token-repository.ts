import { randomUUID } from "node:crypto";
import type {
  CreateEmailTokenInput,
  EmailToken,
  EmailTokenPurpose,
} from "../../domain/email-token.js";
import type { UserId } from "../../domain/user.js";
import type { EmailTokenRepository } from "../email-token-repository.js";

export class MemoryEmailTokenRepository implements EmailTokenRepository {
  private readonly tokens = new Map<string, EmailToken>();

  async create(input: CreateEmailTokenInput): Promise<EmailToken> {
    const token: EmailToken = {
      id: randomUUID(),
      userId: input.userId,
      purpose: input.purpose,
      tokenHash: input.tokenHash,
      expiresAt: input.expiresAt,
      usedAt: null,
      createdAt: new Date(),
    };

    this.tokens.set(token.id, token);
    return { ...token };
  }

  async findValidByTokenHash(
    purpose: EmailTokenPurpose,
    tokenHash: string,
    now: Date = new Date(),
  ): Promise<EmailToken | null> {
    for (const token of this.tokens.values()) {
      if (token.purpose !== purpose) continue;
      if (token.tokenHash !== tokenHash) continue;
      if (token.usedAt) continue;
      if (token.expiresAt <= now) continue;
      return { ...token };
    }
    return null;
  }

  async markUsed(
    id: string,
    usedAt: Date = new Date(),
  ): Promise<EmailToken | null> {
    const token = this.tokens.get(id);
    if (!token) return null;

    token.usedAt = usedAt;
    return { ...token };
  }

  async invalidateActiveForUser(
    userId: UserId,
    purpose: EmailTokenPurpose,
  ): Promise<number> {
    const now = new Date();
    let count = 0;

    for (const token of this.tokens.values()) {
      if (token.userId !== userId) continue;
      if (token.purpose !== purpose) continue;
      if (token.usedAt) continue;

      token.usedAt = now;
      count += 1;
    }

    return count;
  }
}
