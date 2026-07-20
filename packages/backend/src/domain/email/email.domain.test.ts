import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { User } from "../user/index.js";
import {
  assertEmailCodeSendable,
  assertEmailEligibility,
  assertVerificationAttemptAllowed,
  ensureActionTokenRecordValid,
  ensureVerificationCodeLive,
  isEmailActionPurpose,
  isEmailPurpose,
  resolveVerifyCodeOutcome,
} from "./email.domain.js";
import { EMAIL_CODE_RESEND_COOLDOWN_SECONDS } from "./email.types.js";
import {
  EmailAlreadyRegisteredError,
  EmailNotRegisteredError,
  InvalidEmailTokenError,
  InvalidVerificationCodeError,
  TokenSendNotAllowedError,
  UserNotLockedError,
  VerificationAttemptsExceededError,
} from "../../shared/errors.js";

const createUser = (overrides: Partial<User> = {}): User => {
  const now = new Date();
  return {
    id: "user-1",
    email: "user@example.com",
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

describe("isEmailActionPurpose", () => {
  it("トークン発行対象の purpose なら true を返す", () => {
    assert.equal(isEmailActionPurpose("register"), true);
    assert.equal(isEmailActionPurpose("email-change"), true);
    assert.equal(isEmailActionPurpose("password-reset"), true);
  });

  it("unlock はトークン発行対象外", () => {
    assert.equal(isEmailActionPurpose("unlock"), false);
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
    assert.ok(user.email);
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
    assert.ok(user.email);
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

describe("ensureVerificationCodeLive", () => {
  const now = new Date("2026-01-01T00:00:00Z");

  it("有効なら返す", () => {
    const code = {
      usedAt: null,
      expiresAt: new Date(now.getTime() + 60_000),
    };
    assert.equal(ensureVerificationCodeLive(code, now), code);
  });

  it("null / used / expired は拒否", () => {
    assert.throws(
      () => ensureVerificationCodeLive(null, now),
      InvalidVerificationCodeError,
    );
    assert.throws(
      () =>
        ensureVerificationCodeLive(
          { usedAt: now, expiresAt: new Date(now.getTime() + 60_000) },
          now,
        ),
      InvalidVerificationCodeError,
    );
    assert.throws(
      () =>
        ensureVerificationCodeLive(
          { usedAt: null, expiresAt: now },
          now,
        ),
      InvalidVerificationCodeError,
    );
  });
});

describe("resolveVerifyCodeOutcome", () => {
  it("purpose に応じた分岐を返す", () => {
    assert.deepEqual(resolveVerifyCodeOutcome("unlock"), { kind: "unlock" });
    assert.deepEqual(resolveVerifyCodeOutcome("register"), {
      kind: "issue-action-token",
      purpose: "register",
    });
    assert.deepEqual(resolveVerifyCodeOutcome("email-change"), {
      kind: "issue-action-token",
      purpose: "email-change",
    });
    assert.deepEqual(resolveVerifyCodeOutcome("password-reset"), {
      kind: "issue-action-token",
      purpose: "password-reset",
    });
  });
});

describe("ensureActionTokenRecordValid", () => {
  const now = new Date("2026-01-01T00:00:00Z");
  const base = {
    usedAt: null as Date | null,
    expiresAt: new Date(now.getTime() + 60_000),
    purpose: "register" as const,
  };

  it("有効なら返す", () => {
    assert.equal(ensureActionTokenRecordValid(base, now, "register"), base);
  });

  it("purpose 不一致などは拒否", () => {
    assert.throws(
      () => ensureActionTokenRecordValid(base, now, "email-change"),
      InvalidEmailTokenError,
    );
  });
});
