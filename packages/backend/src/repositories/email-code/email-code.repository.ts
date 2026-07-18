import type { EmailPurpose } from "../../domain/email/index.js";
import type {
  CreateEmailCodeInput,
  EmailCode,
  EmailCodeRepository,
} from "./email-code.repository.types.js";

function notImplemented(): never {
  throw new Error("EmailCodeRepository is not implemented yet");
}

/** Postgres 実装用の骨格。接続後に中身を埋める。 */
export class EmailCodeRepositoryImpl implements EmailCodeRepository {
  create(_input: CreateEmailCodeInput): Promise<EmailCode> {
    return notImplemented();
  }

  findValidByCodeHash(
    _purpose: EmailPurpose,
    _codeHash: string,
    _now?: Date,
  ): Promise<EmailCode | null> {
    return notImplemented();
  }

  findLatestByEmailAndPurpose(
    _email: string,
    _purpose: EmailPurpose,
  ): Promise<EmailCode | null> {
    return notImplemented();
  }

  markUsed(_id: string, _usedAt?: Date): Promise<EmailCode | null> {
    return notImplemented();
  }

  incrementAttemptCount(_id: string): Promise<EmailCode | null> {
    return notImplemented();
  }

  invalidateActiveForEmail(
    _email: string,
    _purpose: EmailPurpose,
  ): Promise<number> {
    return notImplemented();
  }
}
