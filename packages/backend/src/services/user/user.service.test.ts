import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildAvatarImageUrl,
  type Avatar,
} from "../../domain/avatar/index.js";
import type {
  AvatarRepository,
  CreateAvatarInput,
} from "../../repositories/avatar/index.js";
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
  GuestActionNotAllowedError,
  InvalidCredentialsError,
  InvalidEmailTokenError,
  InvalidRefreshTokenError,
  UserAccountLockedError,
  UserNotFoundError,
} from "../../shared/errors.js";
import { hashSecret, verifySecret } from "../../shared/hash.js";
import { formatOpaqueToken, parseOpaqueToken } from "../../shared/random-token.js";
import { UserService } from "./user.service.js";

const JWT_SECRET = "test-access-jwt-secret";

function createUserRecord(overrides: Partial<UserRecord> = {}): UserRecord {
  const now = new Date();
  return {
    id: "user-1",
    email: "new@example.com",
    passwordHash: "hash",
    displayName: "New User",
    isGuest: false,
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
    if (user.email) {
      this.users.set(`email:${user.email}`, user);
    }
  }

  async create(input: CreateUserInput): Promise<UserRecord> {
    this.created.push(input);
    this.seq += 1;
    const user = createUserRecord({
      id: `user-${this.seq}`,
      email: input.email,
      passwordHash: input.passwordHash,
      displayName: input.displayName,
      isGuest: input.isGuest,
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

  async updatePasswordHash(
    id: string,
    passwordHash: string,
  ): Promise<UserRecord | null> {
    const current = this.users.get(id);
    if (!current) return null;
    const updated = {
      ...current,
      passwordHash,
      updatedAt: new Date(),
    };
    this.seed(updated);
    return updated;
  }

  async updateDisplayName(
    id: string,
    displayName: string,
  ): Promise<UserRecord | null> {
    const current = this.users.get(id);
    if (!current) return null;
    const updated = {
      ...current,
      displayName,
      updatedAt: new Date(),
    };
    this.seed(updated);
    return updated;
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

  async revokeAllForUser(
    userId: string,
    revokedAt = new Date(),
  ): Promise<number> {
    let count = 0;
    for (const [id, token] of this.byId) {
      if (token.userId !== userId || token.revokedAt !== null) continue;
      this.byId.set(id, { ...token, revokedAt });
      this.revoked.push({ id, replacedByTokenId: null });
      count += 1;
    }
    return count;
  }
}

class FakeAvatarRepository implements AvatarRepository {
  items: Avatar[] = [];

  async create(input: CreateAvatarInput): Promise<Avatar> {
    const now = new Date();
    const avatar: Avatar = {
      id: input.id,
      userId: input.userId,
      name: input.name,
      imageUrl: input.imageUrl,
      createdAt: now,
      updatedAt: now,
    };
    this.items.push(avatar);
    return avatar;
  }

  async findById(id: string): Promise<Avatar | null> {
    return this.items.find((a) => a.id === id) ?? null;
  }

  async listByUserId(userId: string): Promise<Avatar[]> {
    return this.items.filter((a) => a.userId === userId);
  }

  async countByUserId(userId: string): Promise<number> {
    return this.items.filter((a) => a.userId === userId).length;
  }

  async updateName(id: string, name: string): Promise<Avatar | null> {
    const avatar = this.items.find((a) => a.id === id);
    if (!avatar) return null;
    avatar.name = name;
    avatar.updatedAt = new Date();
    return avatar;
  }
}

function service(deps?: {
  users?: FakeUserRepository;
  emailTokens?: FakeEmailTokenRepository;
  refreshTokens?: FakeRefreshTokenRepository;
  avatars?: FakeAvatarRepository;
}) {
  const users = deps?.users ?? new FakeUserRepository();
  const emailTokens = deps?.emailTokens ?? new FakeEmailTokenRepository();
  const refreshTokens = deps?.refreshTokens ?? new FakeRefreshTokenRepository();
  const avatars = deps?.avatars ?? new FakeAvatarRepository();
  return {
    users,
    emailTokens,
    refreshTokens,
    avatars,
    userService: new UserService({
      users,
      emailTokens,
      refreshTokens,
      avatars,
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
    const { userService, users, emailTokens, avatars } = service();
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
    assert.equal(avatars.items.length, 1);
    assert.equal(avatars.items[0]?.name, "太郎");
    assert.equal(
      avatars.items[0]?.imageUrl,
      buildAvatarImageUrl(avatars.items[0]!.id),
    );
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
      isGuest: false,
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

describe("UserService.updateDisplayName", () => {
  it("表示名を更新できる", async () => {
    const users = new FakeUserRepository();
    users.seed(
      createUserRecord({
        id: "user-1",
        email: "user@example.com",
        displayName: "旧名前",
      }),
    );
    const { userService } = service({ users });

    const user = await userService.updateDisplayName({
      userId: "user-1",
      displayName: "新名前",
    });

    assert.equal(user.displayName, "新名前");
    assert.equal((await users.findById("user-1"))?.displayName, "新名前");
  });

  it("存在しないユーザーは拒否する", async () => {
    const { userService } = service();
    await assert.rejects(
      () =>
        userService.updateDisplayName({
          userId: "missing",
          displayName: "新名前",
        }),
      UserNotFoundError,
    );
  });

  it("ロック中ユーザーは拒否する", async () => {
    const users = new FakeUserRepository();
    users.seed(
      createUserRecord({
        id: "user-1",
        lockedAt: new Date(),
      }),
    );
    const { userService } = service({ users });

    await assert.rejects(
      () =>
        userService.updateDisplayName({
          userId: "user-1",
          displayName: "新名前",
        }),
      UserAccountLockedError,
    );
  });
});

describe("UserService.changePassword", () => {
  it("現在のパスワードが正しければ更新する", async () => {
    const passwordHash = await hashSecret("old-password");
    const users = new FakeUserRepository();
    users.seed(
      createUserRecord({
        id: "user-1",
        email: "user@example.com",
        passwordHash,
      }),
    );
    const { userService, refreshTokens } = service({ users });
    await userService.login({
      email: "user@example.com",
      password: "old-password",
    });

    await userService.changePassword({
      userId: "user-1",
      currentPassword: "old-password",
      newPassword: "new-password",
    });

    const updated = await users.findById("user-1");
    assert.ok(updated);
    assert.equal(await verifySecret("new-password", updated.passwordHash!), true);
    assert.equal(await verifySecret("old-password", updated.passwordHash!), false);
    assert.ok(refreshTokens.revoked.length >= 1);
  });

  it("現在のパスワードが違うと拒否する", async () => {
    const passwordHash = await hashSecret("old-password");
    const users = new FakeUserRepository();
    users.seed(
      createUserRecord({
        id: "user-1",
        passwordHash,
      }),
    );
    const { userService } = service({ users });

    await assert.rejects(
      () =>
        userService.changePassword({
          userId: "user-1",
          currentPassword: "wrong",
          newPassword: "new-password",
        }),
      InvalidCredentialsError,
    );
  });

  it("ゲストはパスワード変更できない", async () => {
    const users = new FakeUserRepository();
    users.seed(
      createUserRecord({
        id: "guest-1",
        email: null,
        passwordHash: null,
        isGuest: true,
      }),
    );
    const { userService } = service({ users });

    await assert.rejects(
      () =>
        userService.changePassword({
          userId: "guest-1",
          currentPassword: "x",
          newPassword: "y",
        }),
      GuestActionNotAllowedError,
    );
  });
});

describe("UserService.getMe", () => {
  it("自分の公開情報を返す", async () => {
    const users = new FakeUserRepository();
    users.seed(
      createUserRecord({
        id: "user-1",
        email: "a@example.com",
        displayName: "太郎",
      }),
    );
    const { userService } = service({ users });
    const me = await userService.getMe("user-1");
    assert.equal(me.email, "a@example.com");
    assert.equal(me.displayName, "太郎");
    assert.equal("passwordHash" in me, false);
  });

  it("ロック中は拒否する", async () => {
    const users = new FakeUserRepository();
    users.seed(createUserRecord({ lockedAt: new Date() }));
    const { userService } = service({ users });
    await assert.rejects(() => userService.getMe("user-1"), UserAccountLockedError);
  });
});

describe("UserService.loginAsGuest", () => {
  it("ゲストを作成してトークンを返す", async () => {
    const { userService, users, refreshTokens, avatars } = service();
    const result = await userService.loginAsGuest({ displayName: "見学" });

    assert.equal(result.user.isGuest, true);
    assert.equal(result.user.email, null);
    assert.equal(result.user.displayName, "見学");
    assert.ok(result.accessToken);
    assert.ok(result.refreshToken);
    assert.equal(users.created[0]?.isGuest, true);
    assert.equal(users.created[0]?.email, null);
    assert.equal(refreshTokens.created.length, 1);
    assert.equal(avatars.items.length, 1);
    assert.equal(avatars.items[0]?.name, "見学");

    const refreshed = await userService.refreshTokens({
      refreshToken: result.refreshToken,
    });
    assert.ok(refreshed.accessToken);
  });

  it("displayName 省略時は Guest になる", async () => {
    const { userService } = service();
    const result = await userService.loginAsGuest();
    assert.equal(result.user.displayName, "Guest");
  });
});
