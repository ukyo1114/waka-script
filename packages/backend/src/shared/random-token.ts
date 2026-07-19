import { randomBytes } from "node:crypto";

/** 高エントロピーな opaque トークン（URL-safe）を生成する */
export function createRandomToken(bytes = 32): string {
  return randomBytes(bytes).toString("base64url");
}

/**
 * クライアントへ返す形式: `{id}.{secret}`
 * id で DB 検索し、secret を bcrypt 照合する。
 */
export function formatOpaqueToken(id: string, secret: string): string {
  return `${id}.${secret}`;
}

export type ParsedOpaqueToken = {
  id: string;
  secret: string;
};

/** `{id}.{secret}` を分解する。不正なら null */
export function parseOpaqueToken(token: string): ParsedOpaqueToken | null {
  const separator = token.indexOf(".");
  if (separator <= 0 || separator === token.length - 1) return null;
  const id = token.slice(0, separator);
  const secret = token.slice(separator + 1);
  if (!id || !secret) return null;
  return { id, secret };
}

/** @deprecated formatOpaqueToken を使う */
export const formatEmailToken = formatOpaqueToken;
/** @deprecated parseOpaqueToken を使う */
export const parseEmailToken = parseOpaqueToken;
export type ParsedEmailToken = ParsedOpaqueToken;
