import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type {
  CreateEmailTokenInput,
  EmailPurpose,
  EmailToken,
} from "../../domain/email/index.js";
import type { User } from "../../domain/user/index.js";
import type { EmailTokenRepository } from "../../repositories/email-token/types.js";
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

  constructor(private latest: EmailToken | null = null) {}

  async create(input: CreateEmailTokenInput): Promise<EmailToken> {
    this.created.push(input);
    return createToken({
      email: input.email,
      userId: input.userId,
      purpose: input.purpose,
      tokenHash: input.tokenHash,
      expiresAt: input.expiresAt,
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
