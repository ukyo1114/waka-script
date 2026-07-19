import { SignJWT, jwtVerify } from "jose";
import { ACCESS_TOKEN_TTL_SECONDS } from "../domain/auth/index.js";
import type { UserId } from "../domain/user/index.js";
import { InvalidAccessTokenError } from "./errors.js";

const ACCESS_TOKEN_TYP = "access";

export type AccessTokenClaims = {
  userId: UserId;
};

export type SignAccessTokenInput = AccessTokenClaims & {
  secret?: string;
  expiresInSeconds?: number;
};

function resolveSecret(secret?: string): Uint8Array {
  const value = secret ?? process.env.JWT_SECRET;
  if (!value) {
    throw new Error("JWT_SECRET is not configured");
  }
  return new TextEncoder().encode(value);
}

/** ログイン状態確認用の短命アクセストークン（JWT。DB 非保存） */
export async function signAccessToken(
  input: SignAccessTokenInput,
): Promise<string> {
  const expiresIn = input.expiresInSeconds ?? ACCESS_TOKEN_TTL_SECONDS;

  return new SignJWT({
    typ: ACCESS_TOKEN_TYP,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(input.userId)
    .setIssuedAt()
    .setExpirationTime(`${expiresIn}s`)
    .sign(resolveSecret(input.secret));
}

export type VerifyAccessTokenInput = {
  token: string;
  secret?: string;
};

export async function verifyAccessToken(
  input: VerifyAccessTokenInput,
): Promise<AccessTokenClaims> {
  try {
    const { payload } = await jwtVerify(
      input.token,
      resolveSecret(input.secret),
    );

    if (payload.typ !== ACCESS_TOKEN_TYP) {
      throw new InvalidAccessTokenError();
    }

    const userId = payload.sub;
    if (typeof userId !== "string" || userId.length === 0) {
      throw new InvalidAccessTokenError();
    }

    return { userId };
  } catch (error) {
    if (error instanceof InvalidAccessTokenError) throw error;
    throw new InvalidAccessTokenError();
  }
}
