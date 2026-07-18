import type { Request, Response } from "express";
import { getRepositories } from "../../repositories/get-repositories.js";
import { UserService } from "../../services/user/index.js";
import {
  badRequest,
  handleControllerError,
  readString,
  type JsonBody,
} from "../../shared/http.js";

function createUserService(req: Request): UserService {
  try {
    const { users } = getRepositories(req);
    return new UserService({ users });
  } catch {
    return new UserService();
  }
}

/** POST /user/register */
export async function register(req: Request, res: Response) {
  const body = (req.body ?? {}) as JsonBody;
  const email = readString(body, "email");
  const password = readString(body, "password");
  const displayName = readString(body, "displayName");

  if (!email) return badRequest(res, "email is required");
  if (!password) return badRequest(res, "password is required");
  if (!displayName) return badRequest(res, "displayName is required");

  try {
    const user = await createUserService(req).register({
      email,
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
    const user = await createUserService(req).login({ email, password });
    return res.status(200).json({
      id: user.id,
      email: user.email,
      displayName: user.displayName,
    });
  } catch (error) {
    return handleControllerError(res, error);
  }
}

/** POST /user/logout */
export async function logout(req: Request, res: Response) {
  try {
    await createUserService(req).logout();
    return res.status(204).send();
  } catch (error) {
    return handleControllerError(res, error);
  }
}

/** GET /user/me */
export async function me(req: Request, res: Response) {
  try {
    const user = await createUserService(req).getMe();
    return res.status(200).json({
      id: user.id,
      email: user.email,
      displayName: user.displayName,
    });
  } catch (error) {
    return handleControllerError(res, error);
  }
}
