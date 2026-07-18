import { SignJWT, jwtVerify } from "jose";
import {
  EMAIL_ACTION_TOKEN_TTL_SECONDS,
  isEmailActionPurpose,
  isEmailPurpose,
  type EmailActionPurpose,
} from "../domain/email/index.js";
import type { UserId } from "../domain/user/index.js";

const EMAIL_ACTION_TOKEN_TYP = "email_action";

export type EmailActionTokenClaims = {
  email: string;
  purpose: EmailActionPurpose;
  userId: UserId | null;
};

export type SignEmailActionTokenInput = EmailActionTokenClaims & {
  /** テスト用。省略時は JWT_SECRET 環境変数 */
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

/**
 * メール認証コード検証後に発行するアクション用 JWT。
 * 本登録・メアド変更・パスワード再設定の後続 API で提示する。
 * （セッション用 JWT とは別）
 */
export async function signEmailActionToken(
  input: SignEmailActionTokenInput,
): Promise<string> {
  const expiresIn =
    input.expiresInSeconds ?? EMAIL_ACTION_TOKEN_TTL_SECONDS;

  return new SignJWT({
    email: input.email,
    purpose: input.purpose,
    userId: input.userId,
    typ: EMAIL_ACTION_TOKEN_TYP,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${expiresIn}s`)
    .sign(resolveSecret(input.secret));
}

export type VerifyEmailActionTokenInput = {
  token: string;
  secret?: string;
};

/**
 * アクション用 JWT を検証しクレームを返す。
 * 後続の register / email-change / password-reset API で利用する。
 */
export async function verifyEmailActionToken(
  input: VerifyEmailActionTokenInput,
): Promise<EmailActionTokenClaims> {
  const { payload } = await jwtVerify(input.token, resolveSecret(input.secret));

  if (payload.typ !== EMAIL_ACTION_TOKEN_TYP) {
    throw new Error("invalid email action token type");
  }

  const email = payload.email;
  const purpose = payload.purpose;
  const userId = payload.userId;

  if (typeof email !== "string" || email.length === 0) {
    throw new Error("invalid email action token: email");
  }
  if (
    typeof purpose !== "string" ||
    !isEmailPurpose(purpose) ||
    !isEmailActionPurpose(purpose)
  ) {
    throw new Error("invalid email action token: purpose");
  }
  if (userId !== null && userId !== undefined && typeof userId !== "string") {
    throw new Error("invalid email action token: userId");
  }

  return {
    email,
    purpose,
    userId: typeof userId === "string" ? userId : null,
  };
}
