import type { User } from "../../domain/user/index.js";
import type { UserRepository } from "../../repositories/user/types.js";
import { NotImplementedError } from "../../shared/errors.js";

export type RegisterUserInput = {
  email: string;
  password: string;
  displayName: string;
};

export type LoginUserInput = {
  email: string;
  password: string;
};

export type UserServiceDeps = {
  users: UserRepository;
};

/**
 * ユーザー登録・ログイン・セッション関連を担う。
 */
export class UserService {
  constructor(private readonly deps?: UserServiceDeps) {}

  async register(input: RegisterUserInput): Promise<User> {
    void this.deps;
    void input;
    // TODO: パスワードハッシュ化・ユーザー作成
    throw new NotImplementedError("user.register");
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

  async getMe(): Promise<User> {
    void this.deps;
    // TODO: 認証済みユーザー取得
    throw new NotImplementedError("user.me");
  }
}
