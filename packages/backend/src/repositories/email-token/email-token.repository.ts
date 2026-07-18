import type { EmailActionPurpose } from "../../domain/email/index.js";
import type {
  CreateEmailTokenInput,
  EmailToken,
  EmailTokenId,
  EmailTokenRepository,
} from "./email-token.repository.types.js";

function notImplemented(): never {
  throw new Error("EmailTokenRepository is not implemented yet");
}

/** Postgres 実装用の骨格。接続後に中身を埋める。 */
export class EmailTokenRepositoryImpl implements EmailTokenRepository {
  create(_input: CreateEmailTokenInput): Promise<EmailToken> {
    return notImplemented();
  }

  findById(_id: EmailTokenId): Promise<EmailToken | null> {
    return notImplemented();
  }

  markUsed(_id: EmailTokenId, _usedAt?: Date): Promise<EmailToken | null> {
    return notImplemented();
  }

  invalidateActiveForEmail(
    _email: string,
    _purpose: EmailActionPurpose,
  ): Promise<number> {
    return notImplemented();
  }
}
