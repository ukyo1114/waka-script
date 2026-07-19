import type { Request, Response } from "express";
import { getRepositories } from "../../repositories/get-repositories.js";
import { UserService } from "../../services/user/index.js";
import { NotImplementedError } from "../../shared/errors.js";
import {
  badRequest,
  handleControllerError,
  readString,
  type JsonBody,
} from "../../shared/http.js";

function createUserService(req: Request): UserService {
  try {
    const { users, emailTokens, refreshTokens } = getRepositories(req);
    return new UserService({ users, emailTokens, refreshTokens });
  } catch {
    throw new NotImplementedError("user.repositories");
  }
}

/** POST /user/register — メール認証トークン付き本登録 */
export async function register(req: Request, res: Response) {
  const body = (req.body ?? {}) as JsonBody;
  const token = readString(body, "token");
  const password = readString(body, "password");
  const displayName = readString(body, "displayName");

  if (!token) return badRequest(res, "token is required");
  if (!password) return badRequest(res, "password is required");
  if (!displayName) return badRequest(res, "displayName is required");

  try {
    const user = await createUserService(req).register({
      token,
      password,
      displayName,
    });
    return res.status(201).json({
      id: user.id,
      email: user.email,
      displayName: user.displayName,
    });
  } catch (error) {
    return handleControllerError(res, error);
  }
}

/** POST /user/login */
export async function login(req: Request, res: Response) {
  const body = (req.body ?? {}) as JsonBody;
  const email = readString(body, "email");
  const password = readString(body, "password");

  if (!email) return badRequest(res, "email is required");
  if (!password) return badRequest(res, "password is required");

  try {
    const result = await createUserService(req).login({ email, password });
    return res.status(200).json({
      id: result.user.id,
      email: result.user.email,
      displayName: result.user.displayName,
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
    });
  } catch (error) {
    return handleControllerError(res, error);
  }
}

/** POST /user/token/refresh */
export async function refresh(req: Request, res: Response) {
  const body = (req.body ?? {}) as JsonBody;
  const refreshToken = readString(body, "refreshToken");

  if (!refreshToken) return badRequest(res, "refreshToken is required");

  try {
    const tokens = await createUserService(req).refreshTokens({ refreshToken });
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
  const body = (req.body ?? {}) as JsonBody;
  const refreshToken = readString(body, "refreshToken");

  if (!refreshToken) return badRequest(res, "refreshToken is required");

  try {
    await createUserService(req).logout({ refreshToken });
    return res.status(204).send();
  } catch (error) {
    return handleControllerError(res, error);
  }
}
