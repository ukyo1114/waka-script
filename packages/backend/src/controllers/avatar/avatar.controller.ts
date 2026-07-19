import type { Request, Response } from "express";
import { getRepositories } from "../../repositories/get-repositories.js";
import { AvatarService } from "../../services/avatar/index.js";
import {
  InvalidAccessTokenError,
  NotImplementedError,
} from "../../shared/errors.js";
import { handleControllerError } from "../../shared/http.js";
import { parseWithSchema } from "../../shared/validation.js";
import { createAvatarBodySchema } from "./avatar.controller.schemas.js";

function createAvatarService(req: Request): AvatarService {
  try {
    const { users, avatars } = getRepositories(req);
    return new AvatarService({ users, avatars });
  } catch {
    throw new NotImplementedError("avatar.repositories");
  }
}

function requireUserId(req: Request, res: Response): string | null {
  const userId = req.auth?.userId;
  if (!userId) {
    handleControllerError(res, new InvalidAccessTokenError());
    return null;
  }
  return userId;
}

function toAvatarJson(avatar: {
  id: string;
  userId: string;
  name: string;
  imageUrl: string;
}) {
  return {
    id: avatar.id,
    userId: avatar.userId,
    name: avatar.name,
    imageUrl: avatar.imageUrl,
  };
}

/** POST /avatar — アバター作成（要 access token） */
export async function createAvatar(req: Request, res: Response) {
  const userId = requireUserId(req, res);
  if (!userId) return;

  const parsed = parseWithSchema(createAvatarBodySchema, req.body, res);
  if (!parsed.ok) return;

  try {
    const avatar = await createAvatarService(req).create({
      userId,
      name: parsed.data.name,
      imageUrl: parsed.data.imageUrl,
    });
    return res.status(201).json(toAvatarJson(avatar));
  } catch (error) {
    return handleControllerError(res, error);
  }
}

/** GET /avatar — 自分のアバター一覧（要 access token） */
export async function listAvatars(req: Request, res: Response) {
  const userId = requireUserId(req, res);
  if (!userId) return;

  try {
    const avatars = await createAvatarService(req).list({ userId });
    return res.status(200).json({
      avatars: avatars.map(toAvatarJson),
    });
  } catch (error) {
    return handleControllerError(res, error);
  }
}
