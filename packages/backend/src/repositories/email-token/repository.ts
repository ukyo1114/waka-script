import type {
  CreateEmailTokenInput,
  EmailPurpose,
  EmailToken,
} from "../../domain/email/index.js";
import type { EmailTokenRepository } from "./types.js";

function notImplemented(): never {
  throw new Error("EmailTokenRepository is not implemented yet");
}

/** Postgres 実装用の骨格。接続後に中身を埋める。 */
export class EmailTokenRepositoryImpl implements EmailTokenRepository {
  create(_input: CreateEmailTokenInput): Promise<EmailToken> {
    return notImplemented();
  }

  findValidByTokenHash(
    _purpose: EmailPurpose,
    _tokenHash: string,
    _now?: Date,
  ): Promise<EmailToken | null> {
    return notImplemented();
  }

  findLatestByEmailAndPurpose(
    _email: string,
    _purpose: EmailPurpose,
  ): Promise<EmailToken | null> {
    return notImplemented();
  }

  markUsed(_id: string, _usedAt?: Date): Promise<EmailToken | null> {
    return notImplemented();
  }

  invalidateActiveForEmail(
    _email: string,
    _purpose: EmailPurpose,
  ): Promise<number> {
    return notImplemented();
  }
}
