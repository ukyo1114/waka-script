import type { Request, Response } from "express";
import { getRepositories } from "../../repositories/get-repositories.js";
import { UserService } from "../../services/user/index.js";
import {
  InvalidAccessTokenError,
  NotImplementedError,
} from "../../shared/errors.js";
import { handleControllerError } from "../../shared/http.js";
import { parseWithSchema } from "../../shared/validation.js";
import {
  changePasswordBodySchema,
  completeEmailChangeBodySchema,
  completePasswordResetBodySchema,
  guestLoginBodySchema,
  loginBodySchema,
  refreshTokenBodySchema,
  registerBodySchema,
  updateDisplayNameBodySchema,
} from "./user.controller.schemas.js";

function createUserService(req: Request): UserService {
  try {
    const { users, emailTokens, refreshTokens, avatars } = getRepositories(req);
    return new UserService({ users, emailTokens, refreshTokens, avatars });
  } catch {
    throw new NotImplementedError("user.repositories");
  }
}

/** POST /user/register — メール認証トークン付き本登録 */
export async function register(req: Request, res: Response) {
  const parsed = parseWithSchema(registerBodySchema, req.body, res);
  if (!parsed.ok) return;

  try {
    const user = await createUserService(req).register(parsed.data);
    return res.status(201).json({
      id: user.id,
      email: user.email,
      displayName: user.displayName,
      isGuest: user.isGuest,
    });
  } catch (error) {
    return handleControllerError(res, error);
  }
}

/** POST /user/login */
export async function login(req: Request, res: Response) {
  const parsed = parseWithSchema(loginBodySchema, req.body, res);
  if (!parsed.ok) return;

  try {
    const result = await createUserService(req).login(parsed.data);
    return res.status(200).json({
      id: result.user.id,
      email: result.user.email,
      displayName: result.user.displayName,
      isGuest: result.user.isGuest,
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
    });
  } catch (error) {
    return handleControllerError(res, error);
  }
}

/** POST /user/guest — ゲストとして作成しトークンを発行 */
export async function loginAsGuest(req: Request, res: Response) {
  const parsed = parseWithSchema(guestLoginBodySchema, req.body ?? {}, res);
  if (!parsed.ok) return;

  try {
    const result = await createUserService(req).loginAsGuest(parsed.data);
    return res.status(201).json({
      id: result.user.id,
      email: result.user.email,
      displayName: result.user.displayName,
      isGuest: result.user.isGuest,
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
    });
  } catch (error) {
    return handleControllerError(res, error);
  }
}

/** POST /user/token/refresh */
export async function refresh(req: Request, res: Response) {
  const parsed = parseWithSchema(refreshTokenBodySchema, req.body, res);
  if (!parsed.ok) return;

  try {
    const tokens = await createUserService(req).refreshTokens(parsed.data);
    return res.status(200).json({
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
    });
  } catch (error) {
    return handleControllerError(res, error);
  }
}

/** POST /user/logout */
export async function logout(req: Request, res: Response) {
  const parsed = parseWithSchema(refreshTokenBodySchema, req.body, res);
  if (!parsed.ok) return;

  try {
    await createUserService(req).logout(parsed.data);
    return res.status(204).send();
  } catch (error) {
    return handleControllerError(res, error);
  }
}

/** PATCH /user/display-name — 表示名変更（要 access token） */
export async function updateDisplayName(req: Request, res: Response) {
  const userId = req.auth?.userId;
  if (!userId) {
    return handleControllerError(res, new InvalidAccessTokenError());
  }

  const parsed = parseWithSchema(updateDisplayNameBodySchema, req.body, res);
  if (!parsed.ok) return;

  try {
    const user = await createUserService(req).updateDisplayName({
      userId,
      displayName: parsed.data.displayName,
    });
    return res.status(200).json({
      id: user.id,
      email: user.email,
      displayName: user.displayName,
      isGuest: user.isGuest,
    });
  } catch (error) {
    return handleControllerError(res, error);
  }
}

/** PATCH /user/password — パスワード変更（要 access token） */
export async function changePassword(req: Request, res: Response) {
  const userId = req.auth?.userId;
  if (!userId) {
    return handleControllerError(res, new InvalidAccessTokenError());
  }

  const parsed = parseWithSchema(changePasswordBodySchema, req.body, res);
  if (!parsed.ok) return;

  try {
    await createUserService(req).changePassword({
      userId,
      currentPassword: parsed.data.currentPassword,
      newPassword: parsed.data.newPassword,
    });
    return res.status(204).send();
  } catch (error) {
    return handleControllerError(res, error);
  }
}

/** GET /user/me — 自分の公開プロフィール（要 access token） */
export async function getMe(req: Request, res: Response) {
  const userId = req.auth?.userId;
  if (!userId) {
    return handleControllerError(res, new InvalidAccessTokenError());
  }

  try {
    const user = await createUserService(req).getMe(userId);
    return res.status(200).json({
      id: user.id,
      email: user.email,
      displayName: user.displayName,
      isGuest: user.isGuest,
      emailVerifiedAt: user.emailVerifiedAt,
      lockedAt: user.lockedAt,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    });
  } catch (error) {
    return handleControllerError(res, error);
  }
}

/** PATCH /user/email — メール変更確定（要 access token + email-change token） */
export async function completeEmailChange(req: Request, res: Response) {
  const userId = req.auth?.userId;
  if (!userId) {
    return handleControllerError(res, new InvalidAccessTokenError());
  }

  const parsed = parseWithSchema(completeEmailChangeBodySchema, req.body, res);
  if (!parsed.ok) return;

  try {
    const user = await createUserService(req).completeEmailChange({
      userId,
      token: parsed.data.token,
    });
    return res.status(200).json({
      id: user.id,
      email: user.email,
      displayName: user.displayName,
      isGuest: user.isGuest,
    });
  } catch (error) {
    return handleControllerError(res, error);
  }
}

/** POST /user/password-reset — パスワードリセット確定（未ログイン可） */
export async function completePasswordReset(req: Request, res: Response) {
  const parsed = parseWithSchema(
    completePasswordResetBodySchema,
    req.body,
    res,
  );
  if (!parsed.ok) return;

  try {
    await createUserService(req).completePasswordReset(parsed.data);
    return res.status(204).send();
  } catch (error) {
    return handleControllerError(res, error);
  }
}

/** DELETE /user/account — アカウント論理削除（要 access token） */
export async function deleteAccount(req: Request, res: Response) {
  const userId = req.auth?.userId;
  if (!userId) {
    return handleControllerError(res, new InvalidAccessTokenError());
  }

  try {
    await createUserService(req).deleteAccount({ userId });
    return res.status(204).send();
  } catch (error) {
    return handleControllerError(res, error);
  }
}
