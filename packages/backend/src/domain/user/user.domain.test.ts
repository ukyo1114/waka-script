import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  EmailAlreadyRegisteredError,
  GuestActionNotAllowedError,
  InvalidCredentialsError,
  UserAccountLockedError,
  UserNotFoundError,
} from "../../shared/errors.js";
import {
  assertEmailAvailableForChange,
  assertEmailNotRegistered,
  assertGuestActionAllowed,
  ensureActiveUser,
  ensureLoginCredentialsUser,
  ensurePasswordResetUser,
  ensureUserAllowedToRefresh,
  ensureUserExists,
  normalizeDisplayName,
  normalizeEmail,
  throwAfterFailedLogin,
  toPublicUser,
  type UserWithCredentials,
} from "./user.domain.js";

function user(
  overrides: Partial<UserWithCredentials> = {},
): UserWithCredentials {
  const now = new Date();
  return {
    id: "user-1",
    email: "a@example.com",
    passwordHash: "hash",
    displayName: "User",
    isGuest: false,
    emailVerifiedAt: null,
    lockedAt: null,
    loginAttempts: 0,
    deletedAt: null,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

describe("normalizeEmail / normalizeDisplayName", () => {
  it("email を trim + lower", () => {
    assert.equal(normalizeEmail("  A@Example.COM "), "a@example.com");
  });

  it("displayName のフォールバック", () => {
    assert.equal(normalizeDisplayName(undefined), "Guest");
    assert.equal(normalizeDisplayName("  "), "Guest");
    assert.equal(normalizeDisplayName("太郎"), "太郎");
  });
});

describe("toPublicUser", () => {
  it("passwordHash を除く", () => {
    const publicUser = toPublicUser(user());
    assert.equal("passwordHash" in publicUser, false);
    assert.equal(publicUser.email, "a@example.com");
  });
});

describe("ensureUserExists / ensureActiveUser", () => {
  it("存在するユーザーを返す", () => {
    assert.equal(ensureUserExists(user()).id, "user-1");
  });

  it("null / deleted は NotFound", () => {
    assert.throws(() => ensureUserExists(null), UserNotFoundError);
    assert.throws(
      () => ensureUserExists(user({ deletedAt: new Date() })),
      UserNotFoundError,
    );
  });

  it("locked は Active で拒否", () => {
    assert.throws(
      () => ensureActiveUser(user({ lockedAt: new Date() })),
      UserAccountLockedError,
    );
  });
});

describe("ensureLoginCredentialsUser", () => {
  it("登録ユーザーなら通す", () => {
    const u = ensureLoginCredentialsUser(user());
    assert.equal(u.passwordHash, "hash");
  });

  it("guest / deleted / null hash は InvalidCredentials", () => {
    assert.throws(() => ensureLoginCredentialsUser(null), InvalidCredentialsError);
    assert.throws(
      () => ensureLoginCredentialsUser(user({ isGuest: true, passwordHash: null })),
      InvalidCredentialsError,
    );
  });

  it("locked は Locked", () => {
    assert.throws(
      () => ensureLoginCredentialsUser(user({ lockedAt: new Date() })),
      UserAccountLockedError,
    );
  });
});

describe("ensurePasswordResetUser / assertGuestActionAllowed", () => {
  it("reset 対象を返す", () => {
    assert.equal(ensurePasswordResetUser(user()).id, "user-1");
  });

  it("guest 操作を拒否", () => {
    assert.throws(
      () => assertGuestActionAllowed(user({ isGuest: true }), "emailChange"),
      GuestActionNotAllowedError,
    );
  });
});

describe("ensureUserAllowedToRefresh / throwAfterFailedLogin", () => {
  it("refresh で null は Locked", () => {
    assert.throws(() => ensureUserAllowedToRefresh(null), UserAccountLockedError);
  });

  it("失敗後ロックなら Locked", () => {
    assert.throws(
      () => throwAfterFailedLogin(user({ lockedAt: new Date() })),
      UserAccountLockedError,
    );
  });

  it("失敗後未ロックなら InvalidCredentials", () => {
    assert.throws(() => throwAfterFailedLogin(user()), InvalidCredentialsError);
  });
});

describe("email availability", () => {
  it("登録済みメールを拒否", () => {
    assert.throws(
      () => assertEmailNotRegistered(user(), "a@example.com"),
      EmailAlreadyRegisteredError,
    );
  });

  it("自分以外が使っているメールを拒否", () => {
    assert.throws(
      () =>
        assertEmailAvailableForChange(user({ id: "other" }), "user-1", "x@y.z"),
      EmailAlreadyRegisteredError,
    );
  });

  it("自分のメールなら通す", () => {
    assert.doesNotThrow(() =>
      assertEmailAvailableForChange(user(), "user-1", "a@example.com"),
    );
  });
});
