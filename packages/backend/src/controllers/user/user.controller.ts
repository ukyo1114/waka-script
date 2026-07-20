import type { Request } from "express";
import { getRepositories } from "../../repositories/get-repositories.js";
import { asyncHandler } from "../../middleware/async-handler.js";
import { UserService } from "../../services/user/index.js";
import {
  InvalidAccessTokenError,
  InvalidRefreshTokenError,
  NotImplementedError,
} from "../../shared/errors.js";
import {
  clearRefreshTokenCookie,
  readRefreshTokenCookie,
  setRefreshTokenCookie,
} from "../../shared/refresh-token-cookie.js";
import { parseWithSchema } from "../../shared/validation.js";
import {
  changePasswordBodySchema,
  completeEmailChangeBodySchema,
  completePasswordResetBodySchema,
  guestLoginBodySchema,
  loginBodySchema,
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

function requireUserId(req: Request): string {
  const userId = req.auth?.userId;
  if (!userId) throw new InvalidAccessTokenError();
  return userId;
}

/** POST /user/register — メール認証トークン付き本登録 */
export const register = asyncHandler(async (req, res) => {
  const parsed = parseWithSchema(registerBodySchema, req.body, res);
  if (!parsed.ok) return;

  const user = await createUserService(req).register(parsed.data);
  return res.status(201).json({
    id: user.id,
    email: user.email,
    displayName: user.displayName,
    isGuest: user.isGuest,
  });
});

/** POST /user/login — refresh は HttpOnly Cookie、access のみ JSON */
export const login = asyncHandler(async (req, res) => {
  const parsed = parseWithSchema(loginBodySchema, req.body, res);
  if (!parsed.ok) return;

  const result = await createUserService(req).login(parsed.data);
  setRefreshTokenCookie(res, result.refreshToken);
  return res.status(200).json({
    id: result.user.id,
    email: result.user.email,
    displayName: result.user.displayName,
    isGuest: result.user.isGuest,
    accessToken: result.accessToken,
  });
});

/** POST /user/guest — ゲストとして作成しトークンを発行 */
export const loginAsGuest = asyncHandler(async (req, res) => {
  const parsed = parseWithSchema(guestLoginBodySchema, req.body ?? {}, res);
  if (!parsed.ok) return;

  const result = await createUserService(req).loginAsGuest(parsed.data);
  setRefreshTokenCookie(res, result.refreshToken);
  return res.status(201).json({
    id: result.user.id,
    email: result.user.email,
    displayName: result.user.displayName,
    isGuest: result.user.isGuest,
    accessToken: result.accessToken,
  });
});

/** POST /user/token/refresh — Cookie の refresh をローテーション */
export const refresh = asyncHandler(async (req, res) => {
  const refreshToken = readRefreshTokenCookie(req);
  if (!refreshToken) throw new InvalidRefreshTokenError();

  const tokens = await createUserService(req).refreshTokens({ refreshToken });
  setRefreshTokenCookie(res, tokens.refreshToken);
  return res.status(200).json({
    accessToken: tokens.accessToken,
  });
});

/** POST /user/logout — Cookie の refresh を失効・削除 */
export const logout = asyncHandler(async (req, res) => {
  const refreshToken = readRefreshTokenCookie(req);
  if (refreshToken) {
    try {
      await createUserService(req).logout({ refreshToken });
    } catch {
      // 既に無効でも Cookie は消す（冪等）
    }
  }
  clearRefreshTokenCookie(res);
  return res.status(204).send();
});

/** PATCH /user/display-name — 表示名変更（要 access token） */
export const updateDisplayName = asyncHandler(async (req, res) => {
  const userId = requireUserId(req);
  const parsed = parseWithSchema(updateDisplayNameBodySchema, req.body, res);
  if (!parsed.ok) return;

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
});

/** PATCH /user/password — パスワード変更（要 access token） */
export const changePassword = asyncHandler(async (req, res) => {
  const userId = requireUserId(req);
  const parsed = parseWithSchema(changePasswordBodySchema, req.body, res);
  if (!parsed.ok) return;

  await createUserService(req).changePassword({
    userId,
    currentPassword: parsed.data.currentPassword,
    newPassword: parsed.data.newPassword,
  });
  return res.status(204).send();
});

/** GET /user/me — 自分の公開プロフィール（要 access token） */
export const getMe = asyncHandler(async (req, res) => {
  const userId = requireUserId(req);
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
});

/** PATCH /user/email — メール変更確定（要 access token + email-change token） */
export const completeEmailChange = asyncHandler(async (req, res) => {
  const userId = requireUserId(req);
  const parsed = parseWithSchema(completeEmailChangeBodySchema, req.body, res);
  if (!parsed.ok) return;

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
});

/** POST /user/password-reset — パスワードリセット確定（未ログイン可） */
export const completePasswordReset = asyncHandler(async (req, res) => {
  const parsed = parseWithSchema(
    completePasswordResetBodySchema,
    req.body,
    res,
  );
  if (!parsed.ok) return;

  await createUserService(req).completePasswordReset(parsed.data);
  return res.status(204).send();
});

/** DELETE /user/account — アカウント論理削除（要 access token） */
export const deleteAccount = asyncHandler(async (req, res) => {
  const userId = requireUserId(req);
  await createUserService(req).deleteAccount({ userId });
  return res.status(204).send();
});
