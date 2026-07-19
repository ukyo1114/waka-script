import {
  assertEmailCodeSendable,
  assertEmailEligibility,
  assertVerificationAttemptAllowed,
  EMAIL_ACTION_TOKEN_TTL_SECONDS,
  EMAIL_CODE_TTL_MINUTES,
  isEmailActionPurpose,
  type EmailPurpose,
} from "../../domain/email/index.js";
import type { EmailCodeRepository } from "../../repositories/email-code/index.js";
import type {
  EmailToken,
  EmailTokenRepository,
} from "../../repositories/email-token/index.js";
import type { UserRepository } from "../../repositories/user/index.js";
import { InvalidVerificationCodeError } from "../../shared/errors.js";
import { hashSecret, verifySecret } from "../../shared/hash.js";
import { createRandomCode } from "../../shared/random-code.js";
import {
  createRandomToken,
  formatEmailToken,
} from "../../shared/random-token.js";
import {
  resolveActionToken,
  type ResolveActionTokenInput,
} from "./resolve-action-token.js";

export type { ResolveActionTokenInput } from "./resolve-action-token.js";

export type SendVerificationCodeInput = {
  purpose: EmailPurpose;
  email: string;
};

export type VerifyCodeInput = {
  purpose: EmailPurpose;
  email: string;
  code: string;
};

export type VerifyCodeResult = {
  /** register / email-change / password-reset で発行。unlock は null */
  token: string | null;
};

export type EmailServiceDeps = {
  users: UserRepository;
  emailCodes: EmailCodeRepository;
  emailTokens: EmailTokenRepository;
};

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

/**
 * メール認証コードの送信・検証と、アクション用トークンの解決を担う。
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

  async verifyCode(input: VerifyCodeInput): Promise<VerifyCodeResult> {
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

    if (purpose === "unlock") {
      const userId =
        emailCode.userId ??
        (await this.deps.users.findByEmail(email))?.id ??
        null;
      if (userId) {
        await this.deps.users.clearLock(userId);
      }
      return { token: null };
    }

    if (!isEmailActionPurpose(purpose)) {
      return { token: null };
    }

    const secret = createRandomToken();
    const tokenHash = await hashSecret(secret);
    const expiresAt = new Date(
      now.getTime() + EMAIL_ACTION_TOKEN_TTL_SECONDS * 1000,
    );

    await this.deps.emailTokens.invalidateActiveForEmail(email, purpose);
    const record = await this.deps.emailTokens.create({
      email,
      userId: emailCode.userId,
      purpose,
      tokenHash,
      expiresAt,
    });

    return { token: formatEmailToken(record.id, secret) };
  }

  /**
   * 後続 API（本登録・メアド変更・パスワード再設定）でトークンを検証する。
   * 使用済みマークは呼び出し側で markUsed する。
   */
  async resolveActionToken(
    input: ResolveActionTokenInput,
  ): Promise<EmailToken> {
    return resolveActionToken(this.deps.emailTokens, input);
  }
}
