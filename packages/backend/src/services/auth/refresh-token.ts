import { REFRESH_TOKEN_TTL_SECONDS } from "../../domain/auth/index.js";
import type { UserId } from "../../domain/user/index.js";
import type {
  RefreshToken,
  RefreshTokenRepository,
} from "../../repositories/refresh-token/index.js";
import { InvalidRefreshTokenError } from "../../shared/errors.js";
import { hashSecret, verifySecret } from "../../shared/hash.js";
import {
  createRandomToken,
  formatOpaqueToken,
  parseOpaqueToken,
} from "../../shared/random-token.js";

export async function resolveRefreshToken(
  refreshTokens: RefreshTokenRepository,
  token: string,
): Promise<RefreshToken> {
  const parsed = parseOpaqueToken(token);
  if (!parsed) throw new InvalidRefreshTokenError();

  const record = await refreshTokens.findById(parsed.id);
  const now = new Date();

  if (
    !record ||
    record.revokedAt !== null ||
    record.expiresAt <= now
  ) {
    throw new InvalidRefreshTokenError();
  }

  const matched = await verifySecret(parsed.secret, record.tokenHash);
  if (!matched) throw new InvalidRefreshTokenError();

  return record;
}

export type IssuedRefreshToken = {
  record: RefreshToken;
  token: string;
};

export async function createRefreshTokenForUser(
  refreshTokens: RefreshTokenRepository,
  userId: UserId,
  now = new Date(),
): Promise<IssuedRefreshToken> {
  const secret = createRandomToken();
  const tokenHash = await hashSecret(secret);
  const expiresAt = new Date(now.getTime() + REFRESH_TOKEN_TTL_SECONDS * 1000);
  const record = await refreshTokens.create({
    userId,
    tokenHash,
    expiresAt,
  });
  return {
    record,
    token: formatOpaqueToken(record.id, secret),
  };
}
