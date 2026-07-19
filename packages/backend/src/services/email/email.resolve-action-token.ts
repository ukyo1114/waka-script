import type {
  EmailToken,
  EmailTokenRepository,
} from "../../repositories/email-token/index.js";
import { InvalidEmailTokenError } from "../../shared/errors.js";
import { verifySecret } from "../../shared/hash.js";
import { parseEmailToken } from "../../shared/random-token.js";
import type { EmailActionPurpose } from "../../domain/email/index.js";

export type ResolveActionTokenInput = {
  token: string;
  /** 指定時は purpose が一致しないと無効 */
  purpose?: EmailActionPurpose;
};

/**
 * アクション用トークンを検証してレコードを返す。
 * 使用済みマークは呼び出し側で markUsed する。
 */
export async function resolveActionToken(
  emailTokens: EmailTokenRepository,
  input: ResolveActionTokenInput,
): Promise<EmailToken> {
  const parsed = parseEmailToken(input.token);
  if (!parsed) throw new InvalidEmailTokenError();

  const record = await emailTokens.findById(parsed.id);
  const now = new Date();

  if (
    !record ||
    record.usedAt !== null ||
    record.expiresAt <= now ||
    (input.purpose !== undefined && record.purpose !== input.purpose)
  ) {
    throw new InvalidEmailTokenError();
  }

  const matched = await verifySecret(parsed.secret, record.tokenHash);
  if (!matched) throw new InvalidEmailTokenError();

  return record;
}
