import type { UserId } from "../../domain/user/index.js";
import type {
  CreateRefreshTokenInput,
  RefreshToken,
  RefreshTokenId,
  RefreshTokenRepository,
} from "./refresh-token.repository.types.js";

function notImplemented(): never {
  throw new Error("RefreshTokenRepository is not implemented yet");
}

/** Postgres 実装用の骨格。接続後に中身を埋める。 */
export class RefreshTokenRepositoryImpl implements RefreshTokenRepository {
  create(_input: CreateRefreshTokenInput): Promise<RefreshToken> {
    return notImplemented();
  }

  findById(_id: RefreshTokenId): Promise<RefreshToken | null> {
    return notImplemented();
  }

  revoke(
    _id: RefreshTokenId,
    _revokedAt?: Date,
    _replacedByTokenId?: RefreshTokenId | null,
  ): Promise<RefreshToken | null> {
    return notImplemented();
  }

  revokeAllForUser(_userId: UserId, _revokedAt?: Date): Promise<number> {
    return notImplemented();
  }
}
