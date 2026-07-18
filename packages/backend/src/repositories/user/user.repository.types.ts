import type { User, UserId } from "../../domain/user/index.js";

export type CreateUserInput = {
  email: string;
  passwordHash: string;
  displayName: string;
};

/** 永続化用ユーザー（passwordHash を含む） */
export type UserRecord = User & {
  passwordHash: string;
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
  /** アカウントロックを解除する（lockedAt を null にする） */
  clearLock(id: UserId): Promise<UserRecord | null>;
}
