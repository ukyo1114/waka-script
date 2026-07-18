import {
  assertEmailEligibility,
  assertTokenSendable,
  assertVerificationAttemptAllowed,
  EMAIL_CODE_TTL_MINUTES,
  type EmailPurpose,
} from "../../domain/email/index.js";
import type { EmailTokenRepository } from "../../repositories/email-token/types.js";
import type { UserRepository } from "../../repositories/user/types.js";
import {
  InvalidVerificationCodeError,
  NotImplementedError,
} from "../../shared/errors.js";
import { hashSecret, verifySecret } from "../../shared/hash.js";
import { createRandomCode } from "../../shared/random-code.js";

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

    const foundUser = await this.deps.users.findByEmail(email);
    const user = assertEmailEligibility(purpose, email, foundUser);

    const latest = await this.deps.emailTokens.findLatestByEmailAndPurpose(
      email,
      purpose,
    );
    assertTokenSendable(latest?.createdAt, now);

    const code = createRandomCode();
    const tokenHash = await hashSecret(code);
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
    const now = new Date();

    // bcrypt はソルト付きのためハッシュ値での検索はできない。
    // email+purpose の有効トークンを取り、平文コードと照合する。
    const token = await this.deps.emailTokens.findLatestByEmailAndPurpose(
      email,
      purpose,
    );

    if (!token || token.usedAt !== null || token.expiresAt <= now) {
      throw new InvalidVerificationCodeError();
    }

    assertVerificationAttemptAllowed(token.attemptCount);

    const matched = await verifySecret(input.code, token.tokenHash);
    if (!matched) {
      await this.deps.emailTokens.incrementAttemptCount(token.id);
      throw new InvalidVerificationCodeError();
    }

    await this.deps.emailTokens.markUsed(token.id, now);

    // TODO: purpose ごとの副作用
    throw new NotImplementedError(`email.verify.side_effect.${purpose}`);
  }
}
