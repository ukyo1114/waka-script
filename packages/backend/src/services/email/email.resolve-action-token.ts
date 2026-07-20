import {
  assertEmailTokenSecretMatches,
  ensureActionTokenRecordValid,
  type EmailActionPurpose,
} from "../../domain/email/index.js";
import type {
  EmailToken,
  EmailTokenRepository,
} from "../../repositories/email-token/index.js";
import { InvalidEmailTokenError } from "../../shared/errors.js";
import { verifySecret } from "../../shared/hash.js";
import { parseEmailToken } from "../../shared/random-token.js";

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

  const record = ensureActionTokenRecordValid(
    await emailTokens.findById(parsed.id),
    new Date(),
    input.purpose,
  );

  const matched = await verifySecret(parsed.secret, record.tokenHash);
  assertEmailTokenSecretMatches(matched);

  return record;
}
