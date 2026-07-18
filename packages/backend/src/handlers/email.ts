import type { Request, Response } from "express";
import {
  badRequest,
  notImplemented,
  readString,
  type JsonBody,
} from "./http.js";
import { isEmailPurpose } from "./email-purpose.js";

function readPurpose(req: Request, res: Response) {
  const purpose = req.params.purpose;
  if (typeof purpose !== "string" || !isEmailPurpose(purpose)) {
    badRequest(
      res,
      "purpose must be one of: register, email-change, password-reset, unlock",
    );
    return null;
  }
  return purpose;
}

/**
 * POST /email/send/:purpose
 * メールアドレスへ認証コードを送信する
 * purpose: register | email-change | password-reset | unlock
 */
export function sendCode(req: Request, res: Response) {
  const purpose = readPurpose(req, res);
  if (!purpose) return;

  const body = (req.body ?? {}) as JsonBody;
  const email = readString(body, "email");

  if (!email) return badRequest(res, "email is required");

  return notImplemented(res, `POST /email/send/${purpose}`);
}

/**
 * POST /email/verify/:purpose
 * 認証コードを検証する
 * purpose: register | email-change | password-reset | unlock
 */
export function verifyCode(req: Request, res: Response) {
  const purpose = readPurpose(req, res);
  if (!purpose) return;

  const body = (req.body ?? {}) as JsonBody;
  const email = readString(body, "email");
  const code = readString(body, "code");

  if (!email) return badRequest(res, "email is required");
  if (!code) return badRequest(res, "code is required");

  return notImplemented(res, `POST /email/verify/${purpose}`);
}
