import type { User, UserId } from "../../domain/user/index.js";

export type CreateUserInput = {
  email: string | null;
  passwordHash: string | null;
  displayName: string;
  isGuest: boolean;
};

/** 永続化用ユーザー（passwordHash を含む。ゲストは null） */
export type UserRecord = User & {
  passwordHash: string | null;
};

export interface UserRepository {
  create(input: CreateUserInput): Promise<UserRecord>;
  findById(id: UserId): Promise<UserRecord | null>;
  findByEmail(email: string): Promise<UserRecord | null>;
  markEmailVerified(id: UserId, verifiedAt?: Date): Promise<UserRecord | null>;
  updatePasswordHash(
    id: UserId,
    passwordHash: string,
  ): Promise<UserRecord | null>;
  updateDisplayName(
    id: UserId,
    displayName: string,
  ): Promise<UserRecord | null>;
  updateEmail(id: UserId, email: string): Promise<UserRecord | null>;
  /** アカウントロックを解除する（lockedAt / loginAttempts をリセット） */
  clearLock(id: UserId): Promise<UserRecord | null>;
  /** ログイン失敗を記録。上限到達時は lockedAt を設定して返す */
  recordFailedLogin(id: UserId): Promise<UserRecord | null>;
  /** ログイン成功時に試行回数をリセット */
  resetLoginAttempts(id: UserId): Promise<UserRecord | null>;
  /** 論理削除（deletedAt を設定） */
  softDelete(id: UserId): Promise<UserRecord | null>;
}
