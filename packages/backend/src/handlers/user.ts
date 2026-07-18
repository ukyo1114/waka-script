import type { Request, Response } from "express";
import {
  badRequest,
  notImplemented,
  readString,
  type JsonBody,
} from "./http.js";

/** POST /user/register — ユーザー登録 */
export function register(req: Request, res: Response) {
  const body = (req.body ?? {}) as JsonBody;
  const email = readString(body, "email");
  const password = readString(body, "password");
  const displayName = readString(body, "displayName");

  if (!email) return badRequest(res, "email is required");
  if (!password) return badRequest(res, "password is required");
  if (!displayName) return badRequest(res, "displayName is required");

  return notImplemented(res, "POST /user/register");
}

/** POST /user/login — ログイン */
export function login(req: Request, res: Response) {
  const body = (req.body ?? {}) as JsonBody;
  const email = readString(body, "email");
  const password = readString(body, "password");

  if (!email) return badRequest(res, "email is required");
  if (!password) return badRequest(res, "password is required");

  return notImplemented(res, "POST /user/login");
}

/** POST /user/logout — ログアウト */
export function logout(_req: Request, res: Response) {
  return notImplemented(res, "POST /user/logout");
}

/** GET /user/me — ログイン中ユーザー取得 */
export function me(_req: Request, res: Response) {
  return notImplemented(res, "GET /user/me");
}
