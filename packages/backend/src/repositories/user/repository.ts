import type { User, UserId } from "../../domain/user/index.js";
import type { CreateUserInput, UserRepository } from "./types.js";

function notImplemented(): never {
  throw new Error("UserRepository is not implemented yet");
}

/** Postgres 実装用の骨格。接続後に中身を埋める。 */
export class UserRepositoryImpl implements UserRepository {
  create(_input: CreateUserInput): Promise<User> {
    return notImplemented();
  }

  findById(_id: UserId): Promise<User | null> {
    return notImplemented();
  }

  findByEmail(_email: string): Promise<User | null> {
    return notImplemented();
  }

  markEmailVerified(
    _id: UserId,
    _verifiedAt?: Date,
  ): Promise<User | null> {
    return notImplemented();
  }

  updatePasswordHash(
    _id: UserId,
    _passwordHash: string,
  ): Promise<User | null> {
    return notImplemented();
  }
}
