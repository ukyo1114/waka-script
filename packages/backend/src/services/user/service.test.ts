import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type {
  CreateEmailTokenInput,
  EmailToken,
  EmailTokenRepository,
} from "../../repositories/email-token/index.js";
import type {
  CreateRefreshTokenInput,
  RefreshToken,
  RefreshTokenRepository,
} from "../../repositories/refresh-token/index.js";
import type {
  CreateUserInput,
  UserRecord,
  UserRepository,
} from "../../repositories/user/index.js";
import { verifyAccessToken } from "../../shared/access-token.js";
import {
  EmailAlreadyRegisteredError,
  InvalidCredentialsError,
  InvalidEmailTokenError,
  InvalidRefreshTokenError,
  UserAccountLockedError,
} from "../../shared/errors.js";
import { hashSecret } from "../../shared/hash.js";
import { formatOpaqueToken, parseOpaqueToken } from "../../shared/random-token.js";
import { UserService } from "./service.js";

const JWT_SECRET = "test-access-jwt-secret";

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

function createRefreshTokenRecord(
  overrides: Partial<RefreshToken> = {},
): RefreshToken {
  const now = new Date();
  return {
    id: "refresh-1",
    userId: "user-1",
    tokenHash: "hash",
    expiresAt: new Date(now.getTime() + 86_400_000),
    revokedAt: null,
    replacedByTokenId: null,
    createdAt: now,
    ...overrides,
  };
}

class FakeUserRepository implements UserRepository {
  created: CreateUserInput[] = [];
  users = new Map<string, UserRecord>();
  private seq = 0;

  seed(user: UserRecord) {
    this.users.set(user.id, user);
    this.users.set(`email:${user.email}`, user);
  }

  async create(input: CreateUserInput): Promise<UserRecord> {
    this.created.push(input);
    this.seq += 1;
    const user = createUserRecord({
      id: `user-${this.seq}`,
      email: input.email,
      passwordHash: input.passwordHash,
      displayName: input.displayName,
    });
    this.seed(user);
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
    this.seed(updated);
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

class FakeRefreshTokenRepository implements RefreshTokenRepository {
  created: CreateRefreshTokenInput[] = [];
  revoked: { id: string; replacedByTokenId: string | null }[] = [];
  private byId = new Map<string, RefreshToken>();
  private seq = 0;

  async create(input: CreateRefreshTokenInput): Promise<RefreshToken> {
    this.created.push(input);
    this.seq += 1;
    const record = createRefreshTokenRecord({
      id: `refresh-${this.seq}`,
      userId: input.userId,
      tokenHash: input.tokenHash,
      expiresAt: input.expiresAt,
    });
    this.byId.set(record.id, record);
    return record;
  }

  async findById(id: string): Promise<RefreshToken | null> {
    return this.byId.get(id) ?? null;
  }

  async revoke(
    id: string,
    revokedAt = new Date(),
    replacedByTokenId: string | null = null,
  ): Promise<RefreshToken | null> {
    this.revoked.push({ id, replacedByTokenId });
    const current = this.byId.get(id);
    if (!current) return null;
    const updated = { ...current, revokedAt, replacedByTokenId };
    this.byId.set(id, updated);
    return updated;
  }

  async revokeAllForUser(): Promise<number> {
    return 0;
  }
}

function service(deps?: {
  users?: FakeUserRepository;
  emailTokens?: FakeEmailTokenRepository;
  refreshTokens?: FakeRefreshTokenRepository;
}) {
  const users = deps?.users ?? new FakeUserRepository();
  const emailTokens = deps?.emailTokens ?? new FakeEmailTokenRepository();
  const refreshTokens = deps?.refreshTokens ?? new FakeRefreshTokenRepository();
  return {
    users,
    emailTokens,
    refreshTokens,
    userService: new UserService({
      users,
      emailTokens,
      refreshTokens,
      jwtSecret: JWT_SECRET,
    }),
  };
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
  return formatOpaqueToken(record.id, secret);
}

describe("UserService.register", () => {
  it("有効なトークンならユーザーを作成する", async () => {
    const { userService, users, emailTokens } = service();
    const token = await seedRegisterToken(emailTokens);

    const user = await userService.register({
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
    const { userService } = service();
    await assert.rejects(
      () =>
        userService.register({
          token: "invalid",
          password: "password123",
          displayName: "太郎",
        }),
      InvalidEmailTokenError,
    );
  });

  it("既に登録済みのメールなら拒否する", async () => {
    const { userService, users, emailTokens } = service();
    const token = await seedRegisterToken(emailTokens);
    await users.create({
      email: "new@example.com",
      passwordHash: "x",
      displayName: "既存",
    });

    await assert.rejects(
      () =>
        userService.register({
          token,
          password: "password123",
          displayName: "太郎",
        }),
      EmailAlreadyRegisteredError,
    );
  });

  it("register 以外の purpose トークンは拒否する", async () => {
    const { userService, emailTokens } = service();
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

    await assert.rejects(
      () =>
        userService.register({
          token: formatOpaqueToken("token-reset-1", secret),
          password: "password123",
          displayName: "太郎",
        }),
      InvalidEmailTokenError,
    );
  });
});

describe("UserService.login", () => {
  it("正しい認証情報なら access / refresh を返す", async () => {
    const passwordHash = await hashSecret("password123");
    const users = new FakeUserRepository();
    users.seed(
      createUserRecord({
        id: "user-1",
        email: "user@example.com",
        passwordHash,
        displayName: "花子",
      }),
    );
    const { userService, refreshTokens } = service({ users });

    const result = await userService.login({
      email: "user@example.com",
      password: "password123",
    });

    assert.equal(result.user.id, "user-1");
    assert.ok(result.accessToken);
    assert.ok(result.refreshToken);
    assert.equal(refreshTokens.created.length, 1);

    const claims = await verifyAccessToken({
      token: result.accessToken,
      secret: JWT_SECRET,
    });
    assert.equal(claims.userId, "user-1");
  });

  it("パスワード不一致なら拒否する", async () => {
    const passwordHash = await hashSecret("password123");
    const users = new FakeUserRepository();
    users.seed(
      createUserRecord({
        email: "user@example.com",
        passwordHash,
      }),
    );
    const { userService } = service({ users });

    await assert.rejects(
      () =>
        userService.login({
          email: "user@example.com",
          password: "wrong",
        }),
      InvalidCredentialsError,
    );
  });

  it("ロック中ユーザーは拒否する", async () => {
    const passwordHash = await hashSecret("password123");
    const users = new FakeUserRepository();
    users.seed(
      createUserRecord({
        email: "user@example.com",
        passwordHash,
        lockedAt: new Date(),
      }),
    );
    const { userService } = service({ users });

    await assert.rejects(
      () =>
        userService.login({
          email: "user@example.com",
          password: "password123",
        }),
      UserAccountLockedError,
    );
  });
});

describe("UserService.refreshTokens", () => {
  it("有効な refresh ならトークンをローテーションする", async () => {
    const passwordHash = await hashSecret("password123");
    const users = new FakeUserRepository();
    users.seed(
      createUserRecord({
        id: "user-1",
        email: "user@example.com",
        passwordHash,
      }),
    );
    const { userService, refreshTokens } = service({ users });
    const loggedIn = await userService.login({
      email: "user@example.com",
      password: "password123",
    });

    const refreshed = await userService.refreshTokens({
      refreshToken: loggedIn.refreshToken,
    });

    assert.ok(refreshed.accessToken);
    assert.ok(refreshed.refreshToken);
    assert.notEqual(refreshed.refreshToken, loggedIn.refreshToken);
    assert.equal(refreshTokens.revoked.length, 1);

    const oldParsed = parseOpaqueToken(loggedIn.refreshToken);
    assert.ok(oldParsed);
    assert.equal(refreshTokens.revoked[0]?.id, oldParsed.id);

    await assert.rejects(
      () =>
        userService.refreshTokens({
          refreshToken: loggedIn.refreshToken,
        }),
      InvalidRefreshTokenError,
    );
  });
});

describe("UserService.logout", () => {
  it("refresh を失効させる", async () => {
    const passwordHash = await hashSecret("password123");
    const users = new FakeUserRepository();
    users.seed(
      createUserRecord({
        id: "user-1",
        email: "user@example.com",
        passwordHash,
      }),
    );
    const { userService, refreshTokens } = service({ users });
    const loggedIn = await userService.login({
      email: "user@example.com",
      password: "password123",
    });

    await userService.logout({ refreshToken: loggedIn.refreshToken });
    assert.equal(refreshTokens.revoked.length, 1);

    await assert.rejects(
      () =>
        userService.refreshTokens({
          refreshToken: loggedIn.refreshToken,
        }),
      InvalidRefreshTokenError,
    );
  });
});
