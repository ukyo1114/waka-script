import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type {
  CreateEmailTokenInput,
  EmailToken,
  EmailTokenRepository,
} from "../../repositories/email-token/index.js";
import type {
  CreateUserInput,
  UserRecord,
  UserRepository,
} from "../../repositories/user/index.js";
import {
  EmailAlreadyRegisteredError,
  InvalidEmailTokenError,
} from "../../shared/errors.js";
import { hashSecret } from "../../shared/hash.js";
import { formatEmailToken } from "../../shared/random-token.js";
import { UserService } from "./service.js";

function createUserRecord(overrides: Partial<UserRecord> = {}): UserRecord {
  const now = new Date();
  return {
    id: "user-1",
    email: "new@example.com",
    passwordHash: "hash",
    displayName: "New User",
    emailVerifiedAt: null,
    lockedAt: null,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

function createEmailToken(overrides: Partial<EmailToken> = {}): EmailToken {
  const now = new Date();
  return {
    id: "token-1",
    email: "new@example.com",
    userId: null,
    purpose: "register",
    tokenHash: "hash",
    expiresAt: new Date(now.getTime() + 900_000),
    usedAt: null,
    createdAt: now,
    ...overrides,
  };
}

class FakeUserRepository implements UserRepository {
  created: CreateUserInput[] = [];
  users = new Map<string, UserRecord>();
  private seq = 0;

  async create(input: CreateUserInput): Promise<UserRecord> {
    this.created.push(input);
    this.seq += 1;
    const user = createUserRecord({
      id: `user-${this.seq}`,
      email: input.email,
      passwordHash: input.passwordHash,
      displayName: input.displayName,
    });
    this.users.set(user.id, user);
    this.users.set(`email:${user.email}`, user);
    return user;
  }

  async findById(id: string): Promise<UserRecord | null> {
    return this.users.get(id) ?? null;
  }

  async findByEmail(email: string): Promise<UserRecord | null> {
    return this.users.get(`email:${email}`) ?? null;
  }

  async markEmailVerified(
    id: string,
    verifiedAt = new Date(),
  ): Promise<UserRecord | null> {
    const current = this.users.get(id);
    if (!current) return null;
    const updated = { ...current, emailVerifiedAt: verifiedAt };
    this.users.set(id, updated);
    this.users.set(`email:${updated.email}`, updated);
    return updated;
  }

  async updatePasswordHash(): Promise<UserRecord | null> {
    throw new Error("unused");
  }

  async clearLock(): Promise<UserRecord | null> {
    throw new Error("unused");
  }
}

class FakeEmailTokenRepository implements EmailTokenRepository {
  markUsedIds: string[] = [];
  private byId = new Map<string, EmailToken>();

  seed(token: EmailToken) {
    this.byId.set(token.id, token);
  }

  async create(input: CreateEmailTokenInput): Promise<EmailToken> {
    const record = createEmailToken({
      email: input.email,
      userId: input.userId,
      purpose: input.purpose,
      tokenHash: input.tokenHash,
      expiresAt: input.expiresAt,
    });
    this.byId.set(record.id, record);
    return record;
  }

  async findById(id: string): Promise<EmailToken | null> {
    return this.byId.get(id) ?? null;
  }

  async markUsed(id: string, usedAt = new Date()): Promise<EmailToken | null> {
    this.markUsedIds.push(id);
    const current = this.byId.get(id);
    if (!current) return null;
    const updated = { ...current, usedAt };
    this.byId.set(id, updated);
    return updated;
  }

  async invalidateActiveForEmail(): Promise<number> {
    return 0;
  }
}

async function seedRegisterToken(
  tokens: FakeEmailTokenRepository,
  email = "new@example.com",
): Promise<string> {
  const secret = "register-secret-value";
  const tokenHash = await hashSecret(secret);
  const record = createEmailToken({
    id: "token-reg-1",
    email,
    purpose: "register",
    tokenHash,
  });
  tokens.seed(record);
  return formatEmailToken(record.id, secret);
}

describe("UserService.register", () => {
  it("有効なトークンならユーザーを作成する", async () => {
    const users = new FakeUserRepository();
    const emailTokens = new FakeEmailTokenRepository();
    const token = await seedRegisterToken(emailTokens);
    const service = new UserService({ users, emailTokens });

    const user = await service.register({
      token,
      password: "password123",
      displayName: "太郎",
    });

    assert.equal(user.email, "new@example.com");
    assert.equal(user.displayName, "太郎");
    assert.ok(user.emailVerifiedAt);
    assert.equal(users.created.length, 1);
    assert.equal(emailTokens.markUsedIds[0], "token-reg-1");
    assert.equal("passwordHash" in user, false);
  });

  it("不正なトークンなら拒否する", async () => {
    const service = new UserService({
      users: new FakeUserRepository(),
      emailTokens: new FakeEmailTokenRepository(),
    });
    await assert.rejects(
      () =>
        service.register({
          token: "invalid",
          password: "password123",
          displayName: "太郎",
        }),
      InvalidEmailTokenError,
    );
  });

  it("既に登録済みのメールなら拒否する", async () => {
    const users = new FakeUserRepository();
    const emailTokens = new FakeEmailTokenRepository();
    const token = await seedRegisterToken(emailTokens);
    await users.create({
      email: "new@example.com",
      passwordHash: "x",
      displayName: "既存",
    });
    const service = new UserService({ users, emailTokens });

    await assert.rejects(
      () =>
        service.register({
          token,
          password: "password123",
          displayName: "太郎",
        }),
      EmailAlreadyRegisteredError,
    );
  });

  it("register 以外の purpose トークンは拒否する", async () => {
    const users = new FakeUserRepository();
    const emailTokens = new FakeEmailTokenRepository();
    const secret = "reset-secret";
    const tokenHash = await hashSecret(secret);
    emailTokens.seed(
      createEmailToken({
        id: "token-reset-1",
        email: "new@example.com",
        purpose: "password-reset",
        tokenHash,
        userId: "user-1",
      }),
    );
    const service = new UserService({ users, emailTokens });

    await assert.rejects(
      () =>
        service.register({
          token: formatEmailToken("token-reset-1", secret),
          password: "password123",
          displayName: "太郎",
        }),
      InvalidEmailTokenError,
    );
  });
});
