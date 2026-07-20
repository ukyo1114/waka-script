import {
  EmailAlreadyRegisteredError,
  GuestActionNotAllowedError,
  InvalidCredentialsError,
  UserAccountLockedError,
  UserNotFoundError,
} from "../../shared/errors.js";
import type { User, UserId } from "./user.types.js";

/** 認証秘密を含むユーザー（ドメイン判定用。公開レスポンスには使わない） */
export type UserWithCredentials = User & {
  passwordHash: string | null;
};

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function normalizeDisplayName(
  displayName: string | undefined,
  fallback = "Guest",
): string {
  const trimmed = displayName?.trim();
  return trimmed || fallback;
}

export function toPublicUser<T extends UserWithCredentials>(record: T): User {
  const { passwordHash: _passwordHash, ...user } = record;
  return user;
}

export function ensureUserExists(
  user: UserWithCredentials | User | null,
): UserWithCredentials | User {
  if (!user || user.deletedAt) {
    throw new UserNotFoundError();
  }
  return user;
}

/**
 * 操作可能な登録中ユーザー。
 * null / deleted → NotFound、locked → Locked。
 */
export function ensureActiveUser(
  user: UserWithCredentials | User | null,
): UserWithCredentials | User {
  const existing = ensureUserExists(user);
  if (existing.lockedAt) {
    throw new UserAccountLockedError();
  }
  return existing;
}

/**
 * refresh 用。見つからない・ロック中はいずれも Locked（情報漏洩防止）。
 */
export function ensureUserAllowedToRefresh(
  user: UserWithCredentials | User | null,
): UserWithCredentials | User {
  if (!user || user.lockedAt) {
    throw new UserAccountLockedError();
  }
  return user;
}

/**
 * ログイン可能な登録ユーザー（パスワード保持）。
 * 不適格は InvalidCredentials、ロックは Locked。
 */
export function ensureLoginCredentialsUser(
  user: UserWithCredentials | null,
): UserWithCredentials & { passwordHash: string } {
  if (!user || user.isGuest || user.passwordHash === null || user.deletedAt) {
    throw new InvalidCredentialsError();
  }
  if (user.lockedAt) {
    throw new UserAccountLockedError();
  }
  return user as UserWithCredentials & { passwordHash: string };
}

/**
 * パスワードリセット対象。不適格は InvalidCredentials。
 */
export function ensurePasswordResetUser(
  user: UserWithCredentials | null,
): UserWithCredentials & { passwordHash: string } {
  if (!user || user.deletedAt || user.isGuest || user.passwordHash === null) {
    throw new InvalidCredentialsError();
  }
  return user as UserWithCredentials & { passwordHash: string };
}

export function assertGuestActionAllowed(
  user: User | UserWithCredentials,
  action: string,
): void {
  if (user.isGuest || ("passwordHash" in user && user.passwordHash === null)) {
    throw new GuestActionNotAllowedError(action);
  }
}

export function assertEmailAvailableForChange(
  taken: User | UserWithCredentials | null,
  requesterUserId: UserId,
  email: string,
): void {
  if (taken && taken.id !== requesterUserId) {
    throw new EmailAlreadyRegisteredError(email);
  }
}

export function assertEmailNotRegistered(
  existing: User | UserWithCredentials | null,
  email: string,
): void {
  if (existing) {
    throw new EmailAlreadyRegisteredError(email);
  }
}

/** ログイン失敗後のレコードがロック済みなら Locked、否则 InvalidCredentials */
export function throwAfterFailedLogin(
  afterFail: UserWithCredentials | User | null,
): never {
  if (afterFail?.lockedAt) {
    throw new UserAccountLockedError();
  }
  throw new InvalidCredentialsError();
}
