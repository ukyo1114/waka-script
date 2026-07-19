import type { Request, Response } from "express";
import { getRepositories } from "../../repositories/get-repositories.js";
import { EmailService } from "../../services/email/index.js";
import { NotImplementedError } from "../../shared/errors.js";
import { handleControllerError } from "../../shared/http.js";
import { parseWithSchema } from "../../shared/validation.js";
import {
  emailPurposeParamSchema,
  sendCodeBodySchema,
  verifyCodeBodySchema,
} from "./schemas.js";

function createEmailService(req: Request): EmailService {
  try {
    return new EmailService(getRepositories(req));
  } catch {
    throw new NotImplementedError("email.repositories");
  }
}

/** POST /email/send/:purpose */
export async function sendCode(req: Request, res: Response) {
  const params = parseWithSchema(emailPurposeParamSchema, req.params, res);
  if (!params.ok) return;

  const body = parseWithSchema(sendCodeBodySchema, req.body, res);
  if (!body.ok) return;

  try {
    await createEmailService(req).sendVerificationCode({
      purpose: params.data.purpose,
      email: body.data.email,
    });
    return res.status(202).json({ ok: true });
  } catch (error) {
    return handleControllerError(res, error);
  }
}

/** POST /email/verify/:purpose */
export async function verifyCode(req: Request, res: Response) {
  const params = parseWithSchema(emailPurposeParamSchema, req.params, res);
  if (!params.ok) return;

  const body = parseWithSchema(verifyCodeBodySchema, req.body, res);
  if (!body.ok) return;

  try {
    const result = await createEmailService(req).verifyCode({
      purpose: params.data.purpose,
      email: body.data.email,
      code: body.data.code,
    });
    return res.status(200).json({
      ok: true,
      token: result.token,
    });
  } catch (error) {
    return handleControllerError(res, error);
  }
}
