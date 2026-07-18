import type { UserId } from "../user/types.js";
import type {
  CreateEmailTokenInput,
  EmailToken,
  EmailTokenPurpose,
  EmailTokenRepository,
} from "./types.js";

function notImplemented(): never {
  throw new Error("EmailTokenRepository is not implemented yet");
}

/** Postgres 実装用の骨格。接続後に中身を埋める。 */
export class EmailTokenRepositoryImpl implements EmailTokenRepository {
  create(_input: CreateEmailTokenInput): Promise<EmailToken> {
    return notImplemented();
  }

  findValidByTokenHash(
    _purpose: EmailTokenPurpose,
    _tokenHash: string,
    _now?: Date,
  ): Promise<EmailToken | null> {
    return notImplemented();
  }

  markUsed(_id: string, _usedAt?: Date): Promise<EmailToken | null> {
    return notImplemented();
  }

  invalidateActiveForUser(
    _userId: UserId,
    _purpose: EmailTokenPurpose,
  ): Promise<number> {
    return notImplemented();
  }
}
