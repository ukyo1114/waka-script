import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { User } from "../user/index.js";
import {
  assertEmailCodeSendable,
  assertEmailEligibility,
  assertVerificationAttemptAllowed,
  isEmailPurpose,
} from "./email.domain.js";
import { EMAIL_CODE_RESEND_COOLDOWN_SECONDS } from "./email.types.js";
import {
  EmailAlreadyRegisteredError,
  EmailNotRegisteredError,
  TokenSendNotAllowedError,
  UserNotLockedError,
  VerificationAttemptsExceededError,
} from "../../shared/errors.js";

const createUser = (overrides: Partial<User> = {}): User => {
  const now = new Date();
  return {
    id: "user-1",
    email: "user@example.com",
    passwordHash: "hash",
    displayName: "User",
    emailVerifiedAt: null,
    lockedAt: null,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
};

describe("isEmailPurpose", () => {
  it("定義済みの purpose なら true を返す", () => {
    assert.equal(isEmailPurpose("register"), true);
    assert.equal(isEmailPurpose("email-change"), true);
    assert.equal(isEmailPurpose("password-reset"), true);
    assert.equal(isEmailPurpose("unlock"), true);
  });

  it("未定義の purpose なら false を返す", () => {
    assert.equal(isEmailPurpose("unknown"), false);
    assert.equal(isEmailPurpose(""), false);
  });
});

describe("assertEmailEligibility", () => {
  it("register: 未登録なら null を返す", () => {
    assert.equal(
      assertEmailEligibility("register", "new@example.com", null),
      null,
    );
  });

  it("register: 登録済みなら拒否する", () => {
    assert.throws(
      () =>
        assertEmailEligibility(
          "register",
          "user@example.com",
          createUser(),
        ),
      EmailAlreadyRegisteredError,
    );
  });

  it("email-change: 未登録なら null を返す", () => {
    assert.equal(
      assertEmailEligibility("email-change", "new@example.com", null),
      null,
    );
  });

  it("email-change: 登録済みなら拒否する", () => {
    assert.throws(
      () =>
        assertEmailEligibility(
          "email-change",
          "taken@example.com",
          createUser({ email: "taken@example.com" }),
        ),
      EmailAlreadyRegisteredError,
    );
  });

  it("password-reset: 登録済みならユーザーを返す", () => {
    const user = createUser();
    assert.equal(
      assertEmailEligibility("password-reset", user.email, user),
      user,
    );
  });

  it("password-reset: 未登録なら拒否する", () => {
    assert.throws(
      () =>
        assertEmailEligibility(
          "password-reset",
          "missing@example.com",
          null,
        ),
      EmailNotRegisteredError,
    );
  });

  it("unlock: ロック中ならユーザーを返す", () => {
    const user = createUser({ lockedAt: new Date() });
    assert.equal(assertEmailEligibility("unlock", user.email, user), user);
  });

  it("unlock: 未登録なら拒否する", () => {
    assert.throws(
      () => assertEmailEligibility("unlock", "missing@example.com", null),
      EmailNotRegisteredError,
    );
  });

  it("unlock: ロックされていなければ拒否する", () => {
    assert.throws(
      () =>
        assertEmailEligibility(
          "unlock",
          "user@example.com",
          createUser({ lockedAt: null }),
        ),
      UserNotLockedError,
    );
  });
});

describe("assertEmailCodeSendable", () => {
  const now = new Date("2026-01-01T00:01:00.000Z");

  it("発行履歴がなければ通す", () => {
    assert.doesNotThrow(() => assertEmailCodeSendable(null, now));
    assert.doesNotThrow(() => assertEmailCodeSendable(undefined, now));
  });

  it("クールダウン経過後なら通す", () => {
    const createdAt = new Date(
      now.getTime() - EMAIL_CODE_RESEND_COOLDOWN_SECONDS * 1000,
    );
    assert.doesNotThrow(() => assertEmailCodeSendable(createdAt, now));
  });

  it("クールダウン中なら拒否する", () => {
    const createdAt = new Date(now.getTime() - 30_000);
    assert.throws(
      () => assertEmailCodeSendable(createdAt, now),
      TokenSendNotAllowedError,
    );
  });

  it("カスタムのクールダウン秒数を使える", () => {
    const createdAt = new Date(now.getTime() - 5_000);
    assert.doesNotThrow(() => assertEmailCodeSendable(createdAt, now, 5));
    assert.throws(
      () => assertEmailCodeSendable(createdAt, now, 10),
      TokenSendNotAllowedError,
    );
  });
});

describe("assertVerificationAttemptAllowed", () => {
  it("試行回数が上限未満なら通す", () => {
    assert.doesNotThrow(() => assertVerificationAttemptAllowed(0));
    assert.doesNotThrow(() => assertVerificationAttemptAllowed(4));
  });

  it("試行回数が上限以上なら拒否する", () => {
    assert.throws(
      () => assertVerificationAttemptAllowed(5),
      VerificationAttemptsExceededError,
    );
    assert.throws(
      () => assertVerificationAttemptAllowed(6),
      VerificationAttemptsExceededError,
    );
  });
});
