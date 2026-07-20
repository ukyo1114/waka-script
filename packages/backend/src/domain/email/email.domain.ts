import {
  EmailAlreadyRegisteredError,
  EmailNotRegisteredError,
  InvalidEmailTokenError,
  InvalidVerificationCodeError,
  TokenSendNotAllowedError,
  UserNotLockedError,
  VerificationAttemptsExceededError,
} from "../../shared/errors.js";
import {
  EMAIL_ACTION_PURPOSES,
  EMAIL_CODE_MAX_ATTEMPTS,
  EMAIL_CODE_RESEND_COOLDOWN_SECONDS,
  EMAIL_PURPOSES,
  type AssertEmailCodeSendable,
  type AssertEmailEligibility,
  type AssertVerificationAttemptAllowed,
  type EmailActionPurpose,
  type EmailPurpose,
  type IsEmailActionPurpose,
  type IsEmailPurpose,
} from "./email.types.js";

export const isEmailPurpose: IsEmailPurpose = (
  value,
): value is EmailPurpose =>
  (EMAIL_PURPOSES as readonly string[]).includes(value);

export const isEmailActionPurpose: IsEmailActionPurpose = (
  purpose,
): purpose is (typeof EMAIL_ACTION_PURPOSES)[number] =>
  (EMAIL_ACTION_PURPOSES as readonly EmailPurpose[]).includes(purpose);

/**
 * purpose に応じて「未登録必須」または「登録済み必須」などを判定する。
 * user はリポジトリ取得済みの結果を渡す。
 */
export const assertEmailEligibility: AssertEmailEligibility = (
  purpose,
  email,
  user,
) => {
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
};

/**
 * 直近認証コードの作成時刻から、再送クールダウンを判定する。
 * レコード取得は呼び出し側（サービス）で行う。
 *
 * - latestCreatedAt が無い → 送信可
 * - クールダウン経過済み → 送信可
 * - クールダウン中 → TokenSendNotAllowedError
 */
export const assertEmailCodeSendable: AssertEmailCodeSendable = (
  latestCreatedAt,
  now,
  cooldownSeconds = EMAIL_CODE_RESEND_COOLDOWN_SECONDS,
) => {
  if (!latestCreatedAt) return;

  const elapsedMs = now.getTime() - latestCreatedAt.getTime();
  const cooldownMs = cooldownSeconds * 1000;
  if (elapsedMs < cooldownMs) {
    const retryAfterSec = Math.ceil((cooldownMs - elapsedMs) / 1000);
    throw new TokenSendNotAllowedError(
      `resend cooldown active; retry after ${retryAfterSec}s`,
    );
  }
};

/**
 * 検証試行回数が上限に達していないか判定する。
 * attemptCount はリポジトリ取得済みの値を渡す。
 */
export const assertVerificationAttemptAllowed: AssertVerificationAttemptAllowed =
  (attemptCount, maxAttempts = EMAIL_CODE_MAX_ATTEMPTS) => {
    if (attemptCount >= maxAttempts) {
      throw new VerificationAttemptsExceededError(maxAttempts);
    }
  };

/** 認証コードの生存（未使用・未期限切れ）を保証する */
export type EmailCodeLiveness = {
  usedAt: Date | null;
  expiresAt: Date;
};

export function ensureVerificationCodeLive<T extends EmailCodeLiveness>(
  emailCode: T | null,
  now: Date,
): T {
  if (!emailCode || emailCode.usedAt !== null || emailCode.expiresAt <= now) {
    throw new InvalidVerificationCodeError();
  }
  return emailCode;
}

export type VerifyCodeOutcome =
  | { kind: "unlock" }
  | { kind: "issue-action-token"; purpose: EmailActionPurpose }
  | { kind: "noop" };

/** verify 成功後にサービスが取るべき分岐（I/O はサービス側） */
export function resolveVerifyCodeOutcome(
  purpose: EmailPurpose,
): VerifyCodeOutcome {
  if (purpose === "unlock") return { kind: "unlock" };
  if (isEmailActionPurpose(purpose)) {
    return { kind: "issue-action-token", purpose };
  }
  return { kind: "noop" };
}

/** アクション用トークンレコードの生存・purpose 一致を保証する */
export type EmailTokenLiveness = {
  usedAt: Date | null;
  expiresAt: Date;
  purpose: EmailActionPurpose | EmailPurpose;
};

export function ensureActionTokenRecordValid<T extends EmailTokenLiveness>(
  record: T | null,
  now: Date,
  purpose?: EmailActionPurpose,
): T {
  if (
    !record ||
    record.usedAt !== null ||
    record.expiresAt <= now ||
    (purpose !== undefined && record.purpose !== purpose)
  ) {
    throw new InvalidEmailTokenError();
  }
  return record;
}

export function assertEmailTokenSecretMatches(matched: boolean): void {
  if (!matched) {
    throw new InvalidEmailTokenError();
  }
}

export function assertVerificationCodeMatches(matched: boolean): void {
  if (!matched) {
    throw new InvalidVerificationCodeError();
  }
}
