import type { Request, Response } from "express";
import { isEmailPurpose } from "../../domain/email/index.js";
import { getRepositories } from "../../repositories/get-repositories.js";
import { EmailService } from "../../services/email/index.js";
import { NotImplementedError } from "../../shared/errors.js";
import {
  badRequest,
  handleControllerError,
  readString,
  type JsonBody,
} from "../../shared/http.js";

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

function createEmailService(req: Request): EmailService {
  try {
    return new EmailService(getRepositories(req));
  } catch {
    throw new NotImplementedError("email.repositories");
  }
}

/** POST /email/send/:purpose */
export async function sendCode(req: Request, res: Response) {
  const purpose = readPurpose(req, res);
  if (!purpose) return;

  const body = (req.body ?? {}) as JsonBody;
  const email = readString(body, "email");
  if (!email) return badRequest(res, "email is required");

  try {
    await createEmailService(req).sendVerificationCode({ purpose, email });
    return res.status(202).json({ ok: true });
  } catch (error) {
    return handleControllerError(res, error);
  }
}

/** POST /email/verify/:purpose */
export async function verifyCode(req: Request, res: Response) {
  const purpose = readPurpose(req, res);
  if (!purpose) return;

  const body = (req.body ?? {}) as JsonBody;
  const email = readString(body, "email");
  const code = readString(body, "code");

  if (!email) return badRequest(res, "email is required");
  if (!code) return badRequest(res, "code is required");

  try {
    await createEmailService(req).verifyCode({ purpose, email, code });
    return res.status(200).json({ ok: true });
  } catch (error) {
    return handleControllerError(res, error);
  }
}
