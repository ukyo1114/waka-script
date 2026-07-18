import type { Request, Response } from "express";

type JsonBody = Record<string, unknown>;

function readString(body: JsonBody, key: string): string | undefined {
  const value = body[key];
  return typeof value === "string" ? value.trim() : undefined;
}

function badRequest(res: Response, message: string) {
  return res.status(400).json({ error: message });
}

function notImplemented(res: Response, endpoint: string) {
  return res.status(501).json({
    error: "not_implemented",
    endpoint,
    message: "DB / auth logic will be implemented later",
  });
}

/** POST /auth/register — ユーザー登録 */
export function register(req: Request, res: Response) {
  const body = (req.body ?? {}) as JsonBody;
  const email = readString(body, "email");
  const password = readString(body, "password");
  const displayName = readString(body, "displayName");

  if (!email) return badRequest(res, "email is required");
  if (!password) return badRequest(res, "password is required");
  if (!displayName) return badRequest(res, "displayName is required");

  return notImplemented(res, "POST /auth/register");
}

/** POST /auth/login — ログイン */
export function login(req: Request, res: Response) {
  const body = (req.body ?? {}) as JsonBody;
  const email = readString(body, "email");
  const password = readString(body, "password");

  if (!email) return badRequest(res, "email is required");
  if (!password) return badRequest(res, "password is required");

  return notImplemented(res, "POST /auth/login");
}

/** POST /auth/logout — ログアウト */
export function logout(_req: Request, res: Response) {
  return notImplemented(res, "POST /auth/logout");
}

/** POST /auth/verify-email — メールアドレス認証 */
export function verifyEmail(req: Request, res: Response) {
  const body = (req.body ?? {}) as JsonBody;
  const token = readString(body, "token");

  if (!token) return badRequest(res, "token is required");

  return notImplemented(res, "POST /auth/verify-email");
}

/** POST /auth/resend-verification — 認証メール再送 */
export function resendVerification(req: Request, res: Response) {
  const body = (req.body ?? {}) as JsonBody;
  const email = readString(body, "email");

  if (!email) return badRequest(res, "email is required");

  return notImplemented(res, "POST /auth/resend-verification");
}

/** POST /auth/forgot-password — パスワードリセット要求 */
export function forgotPassword(req: Request, res: Response) {
  const body = (req.body ?? {}) as JsonBody;
  const email = readString(body, "email");

  if (!email) return badRequest(res, "email is required");

  return notImplemented(res, "POST /auth/forgot-password");
}

/** POST /auth/reset-password — パスワード再設定 */
export function resetPassword(req: Request, res: Response) {
  const body = (req.body ?? {}) as JsonBody;
  const token = readString(body, "token");
  const password = readString(body, "password");

  if (!token) return badRequest(res, "token is required");
  if (!password) return badRequest(res, "password is required");

  return notImplemented(res, "POST /auth/reset-password");
}

/** GET /auth/me — ログイン中ユーザー取得 */
export function me(_req: Request, res: Response) {
  return notImplemented(res, "GET /auth/me");
}
