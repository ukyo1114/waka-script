import {
  assertEmailCodeSendable,
  assertEmailEligibility,
  assertVerificationAttemptAllowed,
  EMAIL_CODE_TTL_MINUTES,
  type EmailPurpose,
} from "../../domain/email/index.js";
import type { EmailCodeRepository } from "../../repositories/email-code/index.js";
import type { UserRepository } from "../../repositories/user/index.js";
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
  emailCodes: EmailCodeRepository;
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

    const latest = await this.deps.emailCodes.findLatestByEmailAndPurpose(
      email,
      purpose,
    );
    assertEmailCodeSendable(latest?.createdAt, now);

    const code = createRandomCode();
    const codeHash = await hashSecret(code);
    const expiresAt = new Date(
      now.getTime() + EMAIL_CODE_TTL_MINUTES * 60_000,
    );

    await this.deps.emailCodes.invalidateActiveForEmail(email, purpose);
    await this.deps.emailCodes.create({
      email,
      userId: user?.id ?? null,
      purpose,
      codeHash,
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
    // email+purpose の有効な認証コードを取り、平文と照合する。
    const emailCode = await this.deps.emailCodes.findLatestByEmailAndPurpose(
      email,
      purpose,
    );

    if (
      !emailCode ||
      emailCode.usedAt !== null ||
      emailCode.expiresAt <= now
    ) {
      throw new InvalidVerificationCodeError();
    }

    assertVerificationAttemptAllowed(emailCode.attemptCount);

    const matched = await verifySecret(input.code, emailCode.codeHash);
    if (!matched) {
      await this.deps.emailCodes.incrementAttemptCount(emailCode.id);
      throw new InvalidVerificationCodeError();
    }

    await this.deps.emailCodes.markUsed(emailCode.id, now);

    // TODO: purpose ごとの副作用
    throw new NotImplementedError(`email.verify.side_effect.${purpose}`);
  }
}
