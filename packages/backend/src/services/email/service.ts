import type { EmailPurpose } from "../../domain/email/index.js";
import type { EmailTokenRepository } from "../../repositories/email-token/types.js";
import type { UserRepository } from "../../repositories/user/types.js";
import { NotImplementedError } from "../../shared/errors.js";

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

/**
 * メール認証コードの送信・検証を担う。
 * purpose: register | email-change | password-reset | unlock
 */
export class EmailService {
  constructor(private readonly deps?: EmailServiceDeps) {}

  async sendVerificationCode(input: SendVerificationCodeInput): Promise<void> {
    void this.deps;
    // TODO: コード生成・保存・メール送信
    throw new NotImplementedError(`email.send.${input.purpose}`);
  }

  async verifyCode(input: VerifyCodeInput): Promise<void> {
    void this.deps;
    // TODO: コード検証と purpose ごとの副作用
    throw new NotImplementedError(`email.verify.${input.purpose}`);
  }
}
