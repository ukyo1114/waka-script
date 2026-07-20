import type { Request, Response } from "express";
import { REFRESH_TOKEN_TTL_SECONDS } from "../domain/auth/index.js";
import { getNodeEnv } from "../config/env.js";

/** HttpOnly Cookie 名（JS から読めない） */
export const REFRESH_TOKEN_COOKIE_NAME = "jinro_refresh";

function parseCookieHeader(header: string | undefined): Record<string, string> {
  if (!header) return {};
  const out: Record<string, string> = {};
  for (const part of header.split(";")) {
    const idx = part.indexOf("=");
    if (idx === -1) continue;
    const key = part.slice(0, idx).trim();
    if (!key) continue;
    const raw = part.slice(idx + 1).trim();
    try {
      out[key] = decodeURIComponent(raw);
    } catch {
      out[key] = raw;
    }
  }
  return out;
}

export function readRefreshTokenCookie(req: Request): string | null {
  const value = parseCookieHeader(req.headers.cookie)[REFRESH_TOKEN_COOKIE_NAME];
  if (!value || value.length === 0) return null;
  return value;
}

export function setRefreshTokenCookie(res: Response, token: string): void {
  res.cookie(REFRESH_TOKEN_COOKIE_NAME, token, {
    httpOnly: true,
    secure: getNodeEnv() === "production",
    sameSite: "lax",
    path: "/",
    maxAge: REFRESH_TOKEN_TTL_SECONDS * 1000,
  });
}

export function clearRefreshTokenCookie(res: Response): void {
  res.clearCookie(REFRESH_TOKEN_COOKIE_NAME, {
    httpOnly: true,
    secure: getNodeEnv() === "production",
    sameSite: "lax",
    path: "/",
  });
}
