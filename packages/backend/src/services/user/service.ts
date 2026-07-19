import type { User } from "../../domain/user/index.js";
import type { EmailTokenRepository } from "../../repositories/email-token/index.js";
import type {
  UserRecord,
  UserRepository,
} from "../../repositories/user/index.js";
import {
  EmailAlreadyRegisteredError,
  NotImplementedError,
} from "../../shared/errors.js";
import { hashSecret } from "../../shared/hash.js";
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

export type UserServiceDeps = {
  users: UserRepository;
  emailTokens: EmailTokenRepository;
};

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function toPublicUser(record: UserRecord): User {
  const { passwordHash: _passwordHash, ...user } = record;
  return user;
}

/**
 * ユーザー登録・ログイン・セッション関連を担う。
 */
export class UserService {
  constructor(private readonly deps?: UserServiceDeps) {}

  /**
   * メール認証トークンを使った本登録。
   * 流れ: send/verify(register) → 本 API
   */
  async register(input: RegisterUserInput): Promise<User> {
    if (!this.deps) throw new NotImplementedError("user.repositories");

    const displayName = input.displayName.trim();
    const actionToken = await resolveActionToken(this.deps.emailTokens, {
      token: input.token,
      purpose: "register",
    });

    const email = normalizeEmail(actionToken.email);
    const existing = await this.deps.users.findByEmail(email);
    if (existing) throw new EmailAlreadyRegisteredError(email);

    const passwordHash = await hashSecret(input.password);
    const created = await this.deps.users.create({
      email,
      passwordHash,
      displayName,
    });

    const verified =
      (await this.deps.users.markEmailVerified(created.id)) ?? created;

    await this.deps.emailTokens.markUsed(actionToken.id);

    return toPublicUser(verified);
  }

  async login(input: LoginUserInput): Promise<User> {
    void this.deps;
    void input;
    // TODO: 認証・セッション発行
    throw new NotImplementedError("user.login");
  }

  async logout(): Promise<void> {
    void this.deps;
    // TODO: セッション破棄
    throw new NotImplementedError("user.logout");
  }
}
