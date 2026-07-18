import type { UserId } from "../../domain/user/index.js";
import type {
  CreateUserInput,
  UserRecord,
  UserRepository,
} from "./user.repository.types.js";

function notImplemented(): never {
  throw new Error("UserRepository is not implemented yet");
}

/** Postgres 実装用の骨格。接続後に中身を埋める。 */
export class UserRepositoryImpl implements UserRepository {
  create(_input: CreateUserInput): Promise<UserRecord> {
    return notImplemented();
  }

  findById(_id: UserId): Promise<UserRecord | null> {
    return notImplemented();
  }

  findByEmail(_email: string): Promise<UserRecord | null> {
    return notImplemented();
  }

  markEmailVerified(
    _id: UserId,
    _verifiedAt?: Date,
  ): Promise<UserRecord | null> {
    return notImplemented();
  }

  updatePasswordHash(
    _id: UserId,
    _passwordHash: string,
  ): Promise<UserRecord | null> {
    return notImplemented();
  }
}
