import type { EmailPurpose } from "../../domain/email/index.js";
import type { User } from "../../domain/user/index.js";
import type { EmailTokenRepository } from "../../repositories/email-token/types.js";
import type { UserRepository } from "../../repositories/user/types.js";
import {
  EmailAlreadyRegisteredError,
  EmailNotRegisteredError,
  InvalidVerificationCodeError,
  NotImplementedError,
  TokenSendNotAllowedError,
  UserNotLockedError,
} from "../../shared/errors.js";
import { hashVerificationCode } from "../../shared/hash.js";
import { createRandomCode } from "../../shared/random-code.js";
import {
  EMAIL_CODE_RESEND_COOLDOWN_SECONDS,
  EMAIL_CODE_TTL_MINUTES,
} from "./constants.js";

export type SendVerificationCodeInput = {
  purpose: EmailPurpose;
  email: string;
};

export type VerifyCodeInput = {
  purpose: EmailPurpose;
  email: string;
  code: string;
};

export type EmailServiceDeps = {
  users: UserRepository;
  emailTokens: EmailTokenRepository;
};

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

/**
 * メール認証コードの送信・検証を担う。
 * purpose: register | email-change | password-reset | unlock
 */
export class EmailService {
  constructor(private readonly deps: EmailServiceDeps) {}

  async sendVerificationCode(input: SendVerificationCodeInput): Promise<void> {
    const email = normalizeEmail(input.email);
    const purpose = input.purpose;
    const now = new Date();

    const user = await this.assertEmailEligibility(purpose, email);
    await this.assertTokenSendable(email, purpose, now);

    const code = createRandomCode();
    const tokenHash = hashVerificationCode(code);
    const expiresAt = new Date(
      now.getTime() + EMAIL_CODE_TTL_MINUTES * 60_000,
    );

    await this.deps.emailTokens.invalidateActiveForEmail(email, purpose);
    await this.deps.emailTokens.create({
      email,
      userId: user?.id ?? null,
      purpose,
      tokenHash,
      expiresAt,
    });

    // TODO: メール送信（平文 code を送る）
    void code;
  }

  async verifyCode(input: VerifyCodeInput): Promise<void> {
    const email = normalizeEmail(input.email);
    const purpose = input.purpose;
    const tokenHash = hashVerificationCode(input.code);
    const now = new Date();

    const token = await this.deps.emailTokens.findValidByTokenHash(
      purpose,
      tokenHash,
      now,
    );

    if (!token || token.email !== email) {
      throw new InvalidVerificationCodeError();
    }

    await this.deps.emailTokens.markUsed(token.id, now);

    // TODO: purpose ごとの副作用
    throw new NotImplementedError(`email.verify.side_effect.${purpose}`);
  }

  /**
   * purpose に応じて「未登録必須」または「登録済み必須」などを判定する。
   */
  private async assertEmailEligibility(
    purpose: EmailPurpose,
    email: string,
  ): Promise<User | null> {
    const user = await this.deps.users.findByEmail(email);

    switch (purpose) {
      case "register":
      case "email-change":
        if (user) throw new EmailAlreadyRegisteredError(email);
        return null;

      case "password-reset":
        if (!user) throw new EmailNotRegisteredError(email);
        return user;

      case "unlock":
        if (!user) throw new EmailNotRegisteredError(email);
        if (!user.lockedAt) throw new UserNotLockedError(email);
        return user;

      default: {
        const _exhaustive: never = purpose;
        return _exhaustive;
      }
    }
  }

  /**
   * 同一 email+purpose で、クールダウン中なら送信不可。
   */
  private async assertTokenSendable(
    email: string,
    purpose: EmailPurpose,
    now: Date,
  ): Promise<void> {
    const latest = await this.deps.emailTokens.findLatestByEmailAndPurpose(
      email,
      purpose,
    );
    if (!latest) return;

    const elapsedMs = now.getTime() - latest.createdAt.getTime();
    const cooldownMs = EMAIL_CODE_RESEND_COOLDOWN_SECONDS * 1000;
    if (elapsedMs < cooldownMs) {
      const retryAfterSec = Math.ceil((cooldownMs - elapsedMs) / 1000);
      throw new TokenSendNotAllowedError(
        `resend cooldown active; retry after ${retryAfterSec}s`,
      );
    }
  }
}
