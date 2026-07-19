import type { Request, Response } from "express";
import { getRepositories } from "../../repositories/get-repositories.js";
import { AvatarService } from "../../services/avatar/index.js";
import {
  InvalidAccessTokenError,
  InvalidAvatarImageError,
  NotImplementedError,
} from "../../shared/errors.js";
import { getObjectStorage } from "../../shared/get-object-storage.js";
import { handleControllerError } from "../../shared/http.js";
import { parseWithSchema } from "../../shared/validation.js";
import {
  avatarIdParamsSchema,
  createAvatarBodySchema,
  updateAvatarNameBodySchema,
} from "./avatar.controller.schemas.js";

function createAvatarService(req: Request): AvatarService {
  try {
    const { users, avatars } = getRepositories(req);
    let objectStorage;
    try {
      objectStorage = getObjectStorage(req);
    } catch {
      objectStorage = undefined;
    }
    return new AvatarService({ users, avatars, objectStorage });
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

/** PATCH /avatar/:id — 名前変更（要 access token） */
export async function updateAvatarName(req: Request, res: Response) {
  const userId = requireUserId(req, res);
  if (!userId) return;

  const params = parseWithSchema(avatarIdParamsSchema, req.params, res);
  if (!params.ok) return;

  const parsed = parseWithSchema(updateAvatarNameBodySchema, req.body, res);
  if (!parsed.ok) return;

  try {
    const avatar = await createAvatarService(req).updateName({
      userId,
      avatarId: params.data.id,
      name: parsed.data.name,
    });
    return res.status(200).json(toAvatarJson(avatar));
  } catch (error) {
    return handleControllerError(res, error);
  }
}

/** PUT /avatar/:id/image — 画像差し替え（multipart, 要 access token） */
export async function updateAvatarImage(req: Request, res: Response) {
  const userId = requireUserId(req, res);
  if (!userId) return;

  const params = parseWithSchema(avatarIdParamsSchema, req.params, res);
  if (!params.ok) return;

  const file = req.file;
  if (!file) {
    return handleControllerError(
      res,
      new InvalidAvatarImageError("image file is required (field: image)"),
    );
  }

  try {
    const avatar = await createAvatarService(req).updateImage({
      userId,
      avatarId: params.data.id,
      body: file.buffer,
      contentType: file.mimetype,
    });
    return res.status(200).json(toAvatarJson(avatar));
  } catch (error) {
    return handleControllerError(res, error);
  }
}
