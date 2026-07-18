import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { EmailPurpose } from "../../domain/email/index.js";
import type {
  CreateEmailCodeInput,
  EmailCode,
  EmailCodeRepository,
} from "../../repositories/email-code/index.js";
import type {
  CreateEmailTokenInput,
  EmailToken,
  EmailTokenRepository,
} from "../../repositories/email-token/index.js";
import type {
  UserRecord,
  UserRepository,
} from "../../repositories/user/index.js";
import {
  EmailAlreadyRegisteredError,
  EmailNotRegisteredError,
  InvalidEmailTokenError,
  TokenSendNotAllowedError,
  UserNotLockedError,
} from "../../shared/errors.js";
import { parseEmailToken } from "../../shared/random-token.js";
import { EmailService } from "./service.js";

function createUser(overrides: Partial<UserRecord> = {}): UserRecord {
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

function createEmailCode(overrides: Partial<EmailCode> = {}): EmailCode {
  const now = new Date();
  return {
    id: "code-1",
    email: "user@example.com",
    userId: "user-1",
    purpose: "register",
    codeHash: "hash",
    expiresAt: new Date(now.getTime() + 600_000),
    usedAt: null,
    attemptCount: 0,
    createdAt: now,
    ...overrides,
  };
}

function createEmailToken(overrides: Partial<EmailToken> = {}): EmailToken {
  const now = new Date();
  return {
    id: "token-1",
    email: "user@example.com",
    userId: "user-1",
    purpose: "register",
    tokenHash: "hash",
    expiresAt: new Date(now.getTime() + 900_000),
    usedAt: null,
    createdAt: now,
    ...overrides,
  };
}

class FakeUserRepository implements UserRepository {
  clearLockCalls: string[] = [];

  constructor(private user: UserRecord | null = null) {}

  async create(): Promise<UserRecord> {
    throw new Error("unused");
  }
  async findById(): Promise<UserRecord | null> {
    return this.user;
  }
  async findByEmail(): Promise<UserRecord | null> {
    return this.user;
  }
  async markEmailVerified(): Promise<UserRecord | null> {
    return this.user;
  }
  async updatePasswordHash(): Promise<UserRecord | null> {
    return this.user;
  }
  async clearLock(id: string): Promise<UserRecord | null> {
    this.clearLockCalls.push(id);
    if (!this.user || this.user.id !== id) return null;
    this.user = { ...this.user, lockedAt: null };
    return this.user;
  }
}

class FakeEmailCodeRepository implements EmailCodeRepository {
  created: CreateEmailCodeInput[] = [];
  invalidated = 0;
  attemptIncrements = 0;

  constructor(private latest: EmailCode | null = null) {}

  get latestCode(): EmailCode | null {
    return this.latest;
  }

  async create(input: CreateEmailCodeInput): Promise<EmailCode> {
    this.created.push(input);
    return createEmailCode({
      email: input.email,
      userId: input.userId,
      purpose: input.purpose,
      codeHash: input.codeHash,
      expiresAt: input.expiresAt,
      attemptCount: 0,
    });
  }

  async findValidByCodeHash(): Promise<EmailCode | null> {
    return null;
  }

  async findLatestByEmailAndPurpose(): Promise<EmailCode | null> {
    return this.latest;
  }

  async markUsed(): Promise<EmailCode | null> {
    return null;
  }

  async incrementAttemptCount(id: string): Promise<EmailCode | null> {
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

class FakeEmailTokenRepository implements EmailTokenRepository {
  created: CreateEmailTokenInput[] = [];
  invalidated = 0;
  private byId = new Map<string, EmailToken>();
  private seq = 0;

  async create(input: CreateEmailTokenInput): Promise<EmailToken> {
    this.created.push(input);
    this.seq += 1;
    const record = createEmailToken({
      id: `token-${this.seq}`,
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
    const current = this.byId.get(id);
    if (!current) return null;
    const updated = { ...current, usedAt };
    this.byId.set(id, updated);
    return updated;
  }

  async invalidateActiveForEmail(): Promise<number> {
    this.invalidated += 1;
    return 1;
  }
}

function service(
  user: UserRecord | null,
  latest: EmailCode | null = null,
): {
  emailService: EmailService;
  codes: FakeEmailCodeRepository;
  users: FakeUserRepository;
  tokens: FakeEmailTokenRepository;
} {
  const codes = new FakeEmailCodeRepository(latest);
  const users = new FakeUserRepository(user);
  const tokens = new FakeEmailTokenRepository();
  const emailService = new EmailService({
    users,
    emailCodes: codes,
    emailTokens: tokens,
  });
  return { emailService, codes, users, tokens };
}

describe("EmailService.sendVerificationCode", () => {
  it("register: 未登録メールなら送信できる", async () => {
    const { emailService, codes } = service(null);
    await emailService.sendVerificationCode({
      purpose: "register",
      email: "new@example.com",
    });
    assert.equal(codes.created.length, 1);
    assert.equal(codes.created[0]?.email, "new@example.com");
    assert.equal(codes.created[0]?.userId, null);
    assert.equal(codes.invalidated, 1);
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
    const { emailService, codes } = service(user);
    await emailService.sendVerificationCode({
      purpose: "password-reset",
      email: "user@example.com",
    });
    assert.equal(codes.created[0]?.userId, user.id);
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
    const { emailService, codes } = service(user);
    await emailService.sendVerificationCode({
      purpose: "unlock",
      email: "user@example.com",
    });
    assert.equal(codes.created.length, 1);
  });

  it("クールダウン中は再送を拒否する", async () => {
    const latest = createEmailCode({
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
    const latest = createEmailCode({
      purpose: "register",
      createdAt: new Date(Date.now() - 61_000),
    });
    const { emailService, codes } = service(null, latest);
    await emailService.sendVerificationCode({
      purpose: "register",
      email: "new@example.com",
    });
    assert.equal(codes.created.length, 1);
  });
});

describe("EmailService.verifyCode", () => {
  it("試行回数が上限に達していると拒否する", async () => {
    const { hashSecret } = await import("../../shared/hash.js");
    const codeHash = await hashSecret("123456");
    const latest = createEmailCode({
      email: "new@example.com",
      purpose: "register",
      codeHash,
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
    const codeHash = await hashSecret("123456");
    const latest = createEmailCode({
      email: "new@example.com",
      purpose: "register",
      codeHash,
      attemptCount: 0,
    });
    const { emailService, codes } = service(null, latest);
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
    assert.equal(codes.attemptIncrements, 1);
    assert.equal(codes.latestCode?.attemptCount, 1);
  });

  it("register: 検証成功したら DB 保存用トークンを返す", async () => {
    const { hashSecret } = await import("../../shared/hash.js");
    const codeHash = await hashSecret("123456");
    const latest = createEmailCode({
      email: "new@example.com",
      purpose: "register",
      userId: null,
      codeHash,
    });
    const { emailService, tokens } = service(null, latest);
    const result = await emailService.verifyCode({
      purpose: "register",
      email: "new@example.com",
      code: "123456",
    });
    assert.ok(result.token);
    assert.equal(tokens.created.length, 1);
    assert.equal(tokens.created[0]?.email, "new@example.com");
    assert.equal(tokens.created[0]?.purpose, "register");
    assert.equal(tokens.invalidated, 1);

    const parsed = parseEmailToken(result.token);
    assert.ok(parsed);
    const resolved = await emailService.resolveActionToken({
      token: result.token,
      purpose: "register",
    });
    assert.equal(resolved.email, "new@example.com");
    assert.equal(resolved.userId, null);
  });

  it("password-reset: 検証成功したらトークンに userId を紐づける", async () => {
    const { hashSecret } = await import("../../shared/hash.js");
    const user = createUser();
    const codeHash = await hashSecret("654321");
    const latest = createEmailCode({
      email: user.email,
      purpose: "password-reset",
      userId: user.id,
      codeHash,
    });
    const { emailService, tokens } = service(user, latest);
    const result = await emailService.verifyCode({
      purpose: "password-reset",
      email: user.email,
      code: "654321",
    });
    assert.ok(result.token);
    assert.equal(tokens.created[0]?.userId, user.id);

    const resolved = await emailService.resolveActionToken({
      token: result.token,
      purpose: "password-reset",
    });
    assert.equal(resolved.userId, user.id);
  });

  it("unlock: 検証成功したらロック解除しトークンは返さない", async () => {
    const { hashSecret } = await import("../../shared/hash.js");
    const user = createUser({ lockedAt: new Date() });
    const codeHash = await hashSecret("111111");
    const latest = createEmailCode({
      email: user.email,
      purpose: "unlock",
      userId: user.id,
      codeHash,
    });
    const { emailService, users, tokens } = service(user, latest);
    const result = await emailService.verifyCode({
      purpose: "unlock",
      email: user.email,
      code: "111111",
    });
    assert.equal(result.token, null);
    assert.equal(tokens.created.length, 0);
    assert.deepEqual(users.clearLockCalls, [user.id]);
  });
});

describe("EmailService.resolveActionToken", () => {
  it("不正な形式なら拒否する", async () => {
    const { emailService } = service(null);
    await assert.rejects(
      () => emailService.resolveActionToken({ token: "invalid" }),
      InvalidEmailTokenError,
    );
  });

  it("secret が一致しないなら拒否する", async () => {
    const { hashSecret } = await import("../../shared/hash.js");
    const codeHash = await hashSecret("123456");
    const latest = createEmailCode({
      email: "new@example.com",
      purpose: "register",
      userId: null,
      codeHash,
    });
    const { emailService } = service(null, latest);
    const result = await emailService.verifyCode({
      purpose: "register",
      email: "new@example.com",
      code: "123456",
    });
    assert.ok(result.token);
    const parsed = parseEmailToken(result.token);
    assert.ok(parsed);
    await assert.rejects(
      () =>
        emailService.resolveActionToken({
          token: `${parsed.id}.wrong-secret`,
        }),
      InvalidEmailTokenError,
    );
  });
});
