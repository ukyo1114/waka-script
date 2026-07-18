import { createHash } from "node:crypto";
import bcrypt from "bcrypt";

/** パスワード・認証コード・各種トークン向けの共通コスト */
export const BCRYPT_COST = 10;

/**
 * bcrypt は 72バイト超を切り詰めるため、長い秘密値は先に SHA-256 する。
 * 認証コード・パスワード・アクセストークン・リフレッシュトークンで共通利用する。
 */
function normalizeSecret(plain: string): string {
  if (Buffer.byteLength(plain, "utf8") <= 72) {
    return plain;
  }
  return createHash("sha256").update(plain).digest("hex");
}

/** 秘密値を bcrypt でハッシュ化する（一方向。復号は不可） */
export async function hashSecret(plain: string): Promise<string> {
  return bcrypt.hash(normalizeSecret(plain), BCRYPT_COST);
}

/** 平文とハッシュを照合する */
export async function verifySecret(
  plain: string,
  hashed: string,
): Promise<boolean> {
  return bcrypt.compare(normalizeSecret(plain), hashed);
}
