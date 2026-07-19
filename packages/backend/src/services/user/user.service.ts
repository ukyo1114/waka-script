import type { User } from "../../domain/user/index.js";
import type { AvatarRepository } from "../../repositories/avatar/index.js";
import type { EmailTokenRepository } from "../../repositories/email-token/index.js";
import type { RefreshTokenRepository } from "../../repositories/refresh-token/index.js";
import type {
  UserRecord,
  UserRepository,
} from "../../repositories/user/index.js";
import { signAccessToken } from "../../shared/access-token.js";
import {
  EmailAlreadyRegisteredError,
  GuestActionNotAllowedError,
  InvalidCredentialsError,
  NotImplementedError,
  UserAccountLockedError,
  UserNotFoundError,
} from "../../shared/errors.js";
import { hashSecret, verifySecret } from "../../shared/hash.js";
import { AvatarService } from "../avatar/index.js";
import {
  createRefreshTokenForUser,
  resolveRefreshToken,
} from "../auth/auth.refresh-token.js";
import { resolveActionToken } from "../email/email.resolve-action-token.js";

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

export type LoginAsGuestInput = {
  displayName?: string;
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

export type UpdateDisplayNameInput = {
  userId: string;
  displayName: string;
};

export type ChangePasswordInput = {
  userId: string;
  currentPassword: string;
  newPassword: string;
};

export type CompleteEmailChangeInput = {
  userId: string;
  token: string;
};

export type CompletePasswordResetInput = {
  token: string;
  newPassword: string;
};

export type DeleteAccountInput = {
  userId: string;
};

export type UserServiceDeps = {
  users: UserRepository;
  emailTokens: EmailTokenRepository;
  refreshTokens: RefreshTokenRepository;
  avatars: AvatarRepository;
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

  private avatarService(): AvatarService {
    const deps = this.requireDeps();
    return new AvatarService({ users: deps.users, avatars: deps.avatars });
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
      isGuest: false,
    });

    const verified =
      (await deps.users.markEmailVerified(created.id)) ?? created;

    await deps.emailTokens.markUsed(actionToken.id);
    await this.avatarService().createInitial({
      userId: verified.id,
      displayName: verified.displayName,
    });

    return toPublicUser(verified);
  }

  async login(input: LoginUserInput): Promise<LoginResult> {
    const deps = this.requireDeps();
    const email = normalizeEmail(input.email);
    const user = await deps.users.findByEmail(email);

    if (!user || user.isGuest || user.passwordHash === null || user.deletedAt) {
      throw new InvalidCredentialsError();
    }
    if (user.lockedAt) throw new UserAccountLockedError();

    const matched = await verifySecret(input.password, user.passwordHash);
    if (!matched) {
      const afterFail = await deps.users.recordFailedLogin(user.id);
      if (afterFail?.lockedAt) throw new UserAccountLockedError();
      throw new InvalidCredentialsError();
    }

    await deps.users.resetLoginAttempts(user.id);
    const tokens = await this.issueTokens(user.id);
    return { user: toPublicUser(user), ...tokens };
  }

  /**
   * ゲストとして新規ユーザーを作成し、access / refresh を発行する。
   * メール・パスワードは持たない。トークンを失うと同一ゲストには戻れない
   * （再呼び出しは別ゲストを作る）。保有中は refresh で継続可能。
   */
  async loginAsGuest(input: LoginAsGuestInput = {}): Promise<LoginResult> {
    const deps = this.requireDeps();
    const displayName = input.displayName?.trim() || "Guest";

    const created = await deps.users.create({
      email: null,
      passwordHash: null,
      displayName,
      isGuest: true,
    });

    await this.avatarService().createInitial({
      userId: created.id,
      displayName: created.displayName,
    });

    const tokens = await this.issueTokens(created.id);
    return { user: toPublicUser(created), ...tokens };
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

  /** ログイン中ユーザーの表示名を変更する */
  async updateDisplayName(input: UpdateDisplayNameInput): Promise<User> {
    const deps = this.requireDeps();
    const displayName = input.displayName.trim();

    const existing = await deps.users.findById(input.userId);
    if (!existing) throw new UserNotFoundError();
    if (existing.lockedAt) throw new UserAccountLockedError();

    const updated = await deps.users.updateDisplayName(
      input.userId,
      displayName,
    );
    if (!updated) throw new UserNotFoundError();

    return toPublicUser(updated);
  }

  /**
   * ログイン中ユーザーのパスワードを変更する。
   * 成功後、既存のリフレッシュトークンはすべて失効させる。
   */
  async changePassword(input: ChangePasswordInput): Promise<void> {
    const deps = this.requireDeps();

    const existing = await deps.users.findById(input.userId);
    if (!existing) throw new UserNotFoundError();
    if (existing.lockedAt) throw new UserAccountLockedError();
    if (existing.isGuest || existing.passwordHash === null) {
      throw new GuestActionNotAllowedError("changePassword");
    }

    const matched = await verifySecret(
      input.currentPassword,
      existing.passwordHash,
    );
    if (!matched) throw new InvalidCredentialsError();

    const passwordHash = await hashSecret(input.newPassword);
    const updated = await deps.users.updatePasswordHash(
      input.userId,
      passwordHash,
    );
    if (!updated) throw new UserNotFoundError();

    await deps.refreshTokens.revokeAllForUser(input.userId);
  }

  /** ログイン中ユーザーの公開情報を返す */
  async getMe(userId: string): Promise<User> {
    const deps = this.requireDeps();
    const user = await deps.users.findById(userId);
    if (!user || user.deletedAt) throw new UserNotFoundError();
    if (user.lockedAt) throw new UserAccountLockedError();
    return toPublicUser(user);
  }

  /**
   * メールアドレス変更の確定。
   * Bearer で誰が変えるかを示し、token で新メールの所有を証明する。
   */
  async completeEmailChange(input: CompleteEmailChangeInput): Promise<User> {
    const deps = this.requireDeps();
    const existing = await deps.users.findById(input.userId);
    if (!existing || existing.deletedAt) throw new UserNotFoundError();
    if (existing.lockedAt) throw new UserAccountLockedError();
    if (existing.isGuest) throw new GuestActionNotAllowedError("emailChange");

    const actionToken = await resolveActionToken(deps.emailTokens, {
      token: input.token,
      purpose: "email-change",
    });

    const newEmail = normalizeEmail(actionToken.email);
    const taken = await deps.users.findByEmail(newEmail);
    if (taken && taken.id !== input.userId) {
      throw new EmailAlreadyRegisteredError(newEmail);
    }

    const updated = await deps.users.updateEmail(input.userId, newEmail);
    if (!updated) throw new UserNotFoundError();

    await deps.users.markEmailVerified(input.userId);
    await deps.emailTokens.markUsed(actionToken.id);

    const refreshed = await deps.users.findById(input.userId);
    if (!refreshed) throw new UserNotFoundError();
    return toPublicUser(refreshed);
  }

  /**
   * パスワードリセット確定（未ログイン可）。
   * 成功後、全リフレッシュトークンを失効させる。
   */
  async completePasswordReset(
    input: CompletePasswordResetInput,
  ): Promise<void> {
    const deps = this.requireDeps();
    const actionToken = await resolveActionToken(deps.emailTokens, {
      token: input.token,
      purpose: "password-reset",
    });

    const email = normalizeEmail(actionToken.email);
    const user =
      (actionToken.userId
        ? await deps.users.findById(actionToken.userId)
        : null) ?? (await deps.users.findByEmail(email));

    if (!user || user.deletedAt || user.isGuest || user.passwordHash === null) {
      throw new InvalidCredentialsError();
    }

    const passwordHash = await hashSecret(input.newPassword);
    const updated = await deps.users.updatePasswordHash(user.id, passwordHash);
    if (!updated) throw new UserNotFoundError();

    await deps.emailTokens.markUsed(actionToken.id);
    await deps.refreshTokens.revokeAllForUser(user.id);
  }

  /** アカウント論理削除。リフレッシュトークンをすべて失効する */
  async deleteAccount(input: DeleteAccountInput): Promise<void> {
    const deps = this.requireDeps();
    const existing = await deps.users.findById(input.userId);
    if (!existing || existing.deletedAt) throw new UserNotFoundError();

    await deps.users.softDelete(input.userId);
    await deps.refreshTokens.revokeAllForUser(input.userId);
  }
}
