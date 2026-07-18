import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type {
  EmailPurpose,
  EmailToken,
} from "../../domain/email/index.js";
import type { User } from "../../domain/user/index.js";
import type {
  CreateEmailTokenInput,
  EmailTokenRepository,
} from "../../repositories/email-token/types.js";
import type { UserRepository } from "../../repositories/user/types.js";
import {
  EmailAlreadyRegisteredError,
  EmailNotRegisteredError,
  TokenSendNotAllowedError,
  UserNotLockedError,
} from "../../shared/errors.js";
import { EmailService } from "./service.js";

function createUser(overrides: Partial<User> = {}): User {
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
}

function createToken(overrides: Partial<EmailToken> = {}): EmailToken {
  const now = new Date();
  return {
    id: "token-1",
    email: "user@example.com",
    userId: "user-1",
    purpose: "register",
    tokenHash: "hash",
    expiresAt: new Date(now.getTime() + 600_000),
    usedAt: null,
    attemptCount: 0,
    createdAt: now,
    ...overrides,
  };
}

class FakeUserRepository implements UserRepository {
  constructor(private user: User | null = null) {}

  async create(): Promise<User> {
    throw new Error("unused");
  }
  async findById(): Promise<User | null> {
    return this.user;
  }
  async findByEmail(): Promise<User | null> {
    return this.user;
  }
  async markEmailVerified(): Promise<User | null> {
    return this.user;
  }
  async updatePasswordHash(): Promise<User | null> {
    return this.user;
  }
}

class FakeEmailTokenRepository implements EmailTokenRepository {
  created: CreateEmailTokenInput[] = [];
  invalidated = 0;
  attemptIncrements = 0;

  constructor(private latest: EmailToken | null = null) {}

  get latestToken(): EmailToken | null {
    return this.latest;
  }

  async create(input: CreateEmailTokenInput): Promise<EmailToken> {
    this.created.push(input);
    return createToken({
      email: input.email,
      userId: input.userId,
      purpose: input.purpose,
      tokenHash: input.tokenHash,
      expiresAt: input.expiresAt,
      attemptCount: 0,
    });
  }

  async findValidByTokenHash(): Promise<EmailToken | null> {
    return null;
  }

  async findLatestByEmailAndPurpose(): Promise<EmailToken | null> {
    return this.latest;
  }

  async markUsed(): Promise<EmailToken | null> {
    return null;
  }

  async incrementAttemptCount(id: string): Promise<EmailToken | null> {
    this.attemptIncrements += 1;
    if (!this.latest || this.latest.id !== id) return null;
    this.latest = {
      ...this.latest,
      attemptCount: this.latest.attemptCount + 1,
    };
    return this.latest;
  }

  async invalidateActiveForEmail(): Promise<number> {
    this.invalidated += 1;
    return 1;
  }
}

function service(
  user: User | null,
  latest: EmailToken | null = null,
): { emailService: EmailService; tokens: FakeEmailTokenRepository } {
  const tokens = new FakeEmailTokenRepository(latest);
  const emailService = new EmailService({
    users: new FakeUserRepository(user),
    emailTokens: tokens,
  });
  return { emailService, tokens };
}

describe("EmailService.sendVerificationCode", () => {
  it("register: 未登録メールなら送信できる", async () => {
    const { emailService, tokens } = service(null);
    await emailService.sendVerificationCode({
      purpose: "register",
      email: "new@example.com",
    });
    assert.equal(tokens.created.length, 1);
    assert.equal(tokens.created[0]?.email, "new@example.com");
    assert.equal(tokens.created[0]?.userId, null);
    assert.equal(tokens.invalidated, 1);
  });

  it("register: 登録済みメールなら拒否する", async () => {
    const { emailService } = service(createUser());
    await assert.rejects(
      () =>
        emailService.sendVerificationCode({
          purpose: "register",
          email: "user@example.com",
        }),
      EmailAlreadyRegisteredError,
    );
  });

  it("email-change: 登録済みメールなら拒否する", async () => {
    const { emailService } = service(createUser({ email: "taken@example.com" }));
    await assert.rejects(
      () =>
        emailService.sendVerificationCode({
          purpose: "email-change",
          email: "taken@example.com",
        }),
      EmailAlreadyRegisteredError,
    );
  });

  it("password-reset: 未登録メールなら拒否する", async () => {
    const { emailService } = service(null);
    await assert.rejects(
      () =>
        emailService.sendVerificationCode({
          purpose: "password-reset",
          email: "missing@example.com",
        }),
      EmailNotRegisteredError,
    );
  });

  it("password-reset: 登録済みメールなら送信できる", async () => {
    const user = createUser({ email: "user@example.com" });
    const { emailService, tokens } = service(user);
    await emailService.sendVerificationCode({
      purpose: "password-reset",
      email: "user@example.com",
    });
    assert.equal(tokens.created[0]?.userId, user.id);
  });

  it("unlock: ロックされていないユーザーは拒否する", async () => {
    const { emailService } = service(createUser({ lockedAt: null }));
    await assert.rejects(
      () =>
        emailService.sendVerificationCode({
          purpose: "unlock",
          email: "user@example.com",
        }),
      UserNotLockedError,
    );
  });

  it("unlock: ロック中ユーザーなら送信できる", async () => {
    const user = createUser({ lockedAt: new Date() });
    const { emailService, tokens } = service(user);
    await emailService.sendVerificationCode({
      purpose: "unlock",
      email: "user@example.com",
    });
    assert.equal(tokens.created.length, 1);
  });

  it("クールダウン中は再送を拒否する", async () => {
    const latest = createToken({
      purpose: "register" as EmailPurpose,
      createdAt: new Date(),
    });
    const { emailService } = service(null, latest);
    await assert.rejects(
      () =>
        emailService.sendVerificationCode({
          purpose: "register",
          email: "new@example.com",
        }),
      TokenSendNotAllowedError,
    );
  });

  it("クールダウン経過後は再送できる", async () => {
    const latest = createToken({
      purpose: "register",
      createdAt: new Date(Date.now() - 61_000),
    });
    const { emailService, tokens } = service(null, latest);
    await emailService.sendVerificationCode({
      purpose: "register",
      email: "new@example.com",
    });
    assert.equal(tokens.created.length, 1);
  });
});

describe("EmailService.verifyCode", () => {
  it("試行回数が上限に達していると拒否する", async () => {
    const { hashSecret } = await import("../../shared/hash.js");
    const tokenHash = await hashSecret("123456");
    const latest = createToken({
      email: "new@example.com",
      purpose: "register",
      tokenHash,
      attemptCount: 5,
    });
    const { emailService } = service(null, latest);
    const { VerificationAttemptsExceededError } = await import(
      "../../shared/errors.js"
    );
    await assert.rejects(
      () =>
        emailService.verifyCode({
          purpose: "register",
          email: "new@example.com",
          code: "123456",
        }),
      VerificationAttemptsExceededError,
    );
  });

  it("コード不一致なら試行回数を増やして拒否する", async () => {
    const { hashSecret } = await import("../../shared/hash.js");
    const tokenHash = await hashSecret("123456");
    const latest = createToken({
      email: "new@example.com",
      purpose: "register",
      tokenHash,
      attemptCount: 0,
    });
    const { emailService, tokens } = service(null, latest);
    const { InvalidVerificationCodeError } = await import(
      "../../shared/errors.js"
    );
    await assert.rejects(
      () =>
        emailService.verifyCode({
          purpose: "register",
          email: "new@example.com",
          code: "000000",
        }),
      InvalidVerificationCodeError,
    );
    assert.equal(tokens.attemptIncrements, 1);
    assert.equal(tokens.latestToken?.attemptCount, 1);
  });
});
