import type { User } from "../../domain/user/index.js";
import type { EmailTokenRepository } from "../../repositories/email-token/index.js";
import type { RefreshTokenRepository } from "../../repositories/refresh-token/index.js";
import type {
  UserRecord,
  UserRepository,
} from "../../repositories/user/index.js";
import { signAccessToken } from "../../shared/access-token.js";
import {
  EmailAlreadyRegisteredError,
  InvalidCredentialsError,
  NotImplementedError,
  UserAccountLockedError,
} from "../../shared/errors.js";
import { hashSecret, verifySecret } from "../../shared/hash.js";
import {
  createRefreshTokenForUser,
  resolveRefreshToken,
} from "../auth/refresh-token.js";
import { resolveActionToken } from "../email/resolve-action-token.js";

export type RegisterUserInput = {
  /** メール認証コード検証後に発行されたアクション用トークン */
  token: string;
  password: string;
  displayName: string;
};

export type LoginUserInput = {
  email: string;
  password: string;
};

export type AuthTokens = {
  accessToken: string;
  refreshToken: string;
};

export type LoginResult = {
  user: User;
} & AuthTokens;

export type RefreshTokensInput = {
  refreshToken: string;
};

export type LogoutInput = {
  refreshToken: string;
};

export type UserServiceDeps = {
  users: UserRepository;
  emailTokens: EmailTokenRepository;
  refreshTokens: RefreshTokenRepository;
  /** テスト用。省略時は JWT_SECRET */
  jwtSecret?: string;
};

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function toPublicUser(record: UserRecord): User {
  const { passwordHash: _passwordHash, ...user } = record;
  return user;
}

/**
 * ユーザー登録・ログイン・トークン関連を担う。
 */
export class UserService {
  constructor(private readonly deps?: UserServiceDeps) {}

  private requireDeps(): UserServiceDeps {
    if (!this.deps) throw new NotImplementedError("user.repositories");
    return this.deps;
  }

  private async issueTokens(userId: string): Promise<AuthTokens> {
    const deps = this.requireDeps();
    const accessToken = await signAccessToken({
      userId,
      secret: deps.jwtSecret,
    });
    const refresh = await createRefreshTokenForUser(
      deps.refreshTokens,
      userId,
    );
    return { accessToken, refreshToken: refresh.token };
  }

  /**
   * メール認証トークンを使った本登録。
   * 流れ: send/verify(register) → 本 API
   */
  async register(input: RegisterUserInput): Promise<User> {
    const deps = this.requireDeps();

    const displayName = input.displayName.trim();
    const actionToken = await resolveActionToken(deps.emailTokens, {
      token: input.token,
      purpose: "register",
    });

    const email = normalizeEmail(actionToken.email);
    const existing = await deps.users.findByEmail(email);
    if (existing) throw new EmailAlreadyRegisteredError(email);

    const passwordHash = await hashSecret(input.password);
    const created = await deps.users.create({
      email,
      passwordHash,
      displayName,
    });

    const verified =
      (await deps.users.markEmailVerified(created.id)) ?? created;

    await deps.emailTokens.markUsed(actionToken.id);

    return toPublicUser(verified);
  }

  async login(input: LoginUserInput): Promise<LoginResult> {
    const deps = this.requireDeps();
    const email = normalizeEmail(input.email);
    const user = await deps.users.findByEmail(email);

    if (!user) throw new InvalidCredentialsError();
    if (user.lockedAt) throw new UserAccountLockedError();

    const matched = await verifySecret(input.password, user.passwordHash);
    if (!matched) throw new InvalidCredentialsError();

    const tokens = await this.issueTokens(user.id);
    return { user: toPublicUser(user), ...tokens };
  }

  async refreshTokens(input: RefreshTokensInput): Promise<AuthTokens> {
    const deps = this.requireDeps();
    const current = await resolveRefreshToken(
      deps.refreshTokens,
      input.refreshToken,
    );

    const user = await deps.users.findById(current.userId);
    if (!user || user.lockedAt) throw new UserAccountLockedError();

    const next = await createRefreshTokenForUser(
      deps.refreshTokens,
      current.userId,
    );
    await deps.refreshTokens.revoke(current.id, new Date(), next.record.id);

    const accessToken = await signAccessToken({
      userId: current.userId,
      secret: deps.jwtSecret,
    });

    return { accessToken, refreshToken: next.token };
  }

  async logout(input: LogoutInput): Promise<void> {
    const deps = this.requireDeps();
    const current = await resolveRefreshToken(
      deps.refreshTokens,
      input.refreshToken,
    );
    await deps.refreshTokens.revoke(current.id);
  }
}
