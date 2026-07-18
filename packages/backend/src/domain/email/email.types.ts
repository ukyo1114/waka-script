import type { User, UserId } from "../user/index.js";

export const EMAIL_PURPOSES = [
  "register",
  "email-change",
  "password-reset",
  "unlock",
] as const;

export type EmailPurpose = (typeof EMAIL_PURPOSES)[number];

export type IsEmailPurpose = (value: string) => value is EmailPurpose;

export type EmailCodeId = string;

/** メール認証コード（JWT などのセッショントークンとは別） */
export type EmailCode = {
  id: EmailCodeId;
  email: string;
  userId: UserId | null;
  purpose: EmailPurpose;
  codeHash: string;
  expiresAt: Date;
  usedAt: Date | null;
  attemptCount: number;
  createdAt: Date;
};

export type AssertEmailEligibility = (
  purpose: EmailPurpose,
  email: string,
  user: User | null,
) => User | null;

export type AssertEmailCodeSendable = (
  latestCreatedAt: Date | null | undefined,
  now: Date,
  cooldownSeconds?: number,
) => void;

export type AssertVerificationAttemptAllowed = (
  attemptCount: number,
  maxAttempts?: number,
) => void;

/** 認証コードの有効期限（分） */
export const EMAIL_CODE_TTL_MINUTES = 10;

/** 同一 email+purpose での再送クールダウン（秒） */
export const EMAIL_CODE_RESEND_COOLDOWN_SECONDS = 60;

/** 認証コード検証の最大試行回数 */
export const EMAIL_CODE_MAX_ATTEMPTS = 5;
