import type { Request, Response } from "express";
import {
  badRequest,
  notImplemented,
  readString,
  type JsonBody,
} from "./http.js";

/** POST /email/verify — メールアドレス認証 */
export function verify(req: Request, res: Response) {
  const body = (req.body ?? {}) as JsonBody;
  const token = readString(body, "token");

  if (!token) return badRequest(res, "token is required");

  return notImplemented(res, "POST /email/verify");
}

/** POST /email/resend — 認証メール再送 */
export function resend(req: Request, res: Response) {
  const body = (req.body ?? {}) as JsonBody;
  const email = readString(body, "email");

  if (!email) return badRequest(res, "email is required");

  return notImplemented(res, "POST /email/resend");
}

/** POST /email/forgot-password — パスワードリセット要求 */
export function forgotPassword(req: Request, res: Response) {
  const body = (req.body ?? {}) as JsonBody;
  const email = readString(body, "email");

  if (!email) return badRequest(res, "email is required");

  return notImplemented(res, "POST /email/forgot-password");
}

/** POST /email/reset-password — パスワード再設定 */
export function resetPassword(req: Request, res: Response) {
  const body = (req.body ?? {}) as JsonBody;
  const token = readString(body, "token");
  const password = readString(body, "password");

  if (!token) return badRequest(res, "token is required");
  if (!password) return badRequest(res, "password is required");

  return notImplemented(res, "POST /email/reset-password");
}
