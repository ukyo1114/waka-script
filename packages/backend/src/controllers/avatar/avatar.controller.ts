import type { Request } from "express";
import { asyncHandler } from "../../middleware/async-handler.js";
import { getRepositories } from "../../repositories/get-repositories.js";
import { AvatarService } from "../../services/avatar/index.js";
import {
  InvalidAccessTokenError,
  InvalidAvatarImageError,
  NotImplementedError,
} from "../../shared/errors.js";
import { getObjectStorage } from "../../shared/get-object-storage.js";
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

function requireUserId(req: Request): string {
  const userId = req.auth?.userId;
  if (!userId) throw new InvalidAccessTokenError();
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
export const createAvatar = asyncHandler(async (req, res) => {
  const userId = requireUserId(req);
  const parsed = parseWithSchema(createAvatarBodySchema, req.body, res);
  if (!parsed.ok) return;

  const avatar = await createAvatarService(req).create({
    userId,
    name: parsed.data.name,
  });
  return res.status(201).json(toAvatarJson(avatar));
});

/** GET /avatar — 自分のアバター一覧（要 access token） */
export const listAvatars = asyncHandler(async (req, res) => {
  const userId = requireUserId(req);
  const avatars = await createAvatarService(req).list({ userId });
  return res.status(200).json({
    avatars: avatars.map(toAvatarJson),
  });
});

/** PATCH /avatar/:id — 名前変更（要 access token） */
export const updateAvatarName = asyncHandler(async (req, res) => {
  const userId = requireUserId(req);
  const params = parseWithSchema(avatarIdParamsSchema, req.params, res);
  if (!params.ok) return;

  const parsed = parseWithSchema(updateAvatarNameBodySchema, req.body, res);
  if (!parsed.ok) return;

  const avatar = await createAvatarService(req).updateName({
    userId,
    avatarId: params.data.id,
    name: parsed.data.name,
  });
  return res.status(200).json(toAvatarJson(avatar));
});

/** PUT /avatar/:id/image — 画像差し替え（multipart, 要 access token） */
export const updateAvatarImage = asyncHandler(async (req, res) => {
  const userId = requireUserId(req);
  const params = parseWithSchema(avatarIdParamsSchema, req.params, res);
  if (!params.ok) return;

  const file = req.file;
  if (!file) {
    throw new InvalidAvatarImageError("image file is required (field: image)");
  }

  const avatar = await createAvatarService(req).updateImage({
    userId,
    avatarId: params.data.id,
    body: file.buffer,
    contentType: file.mimetype,
  });
  return res.status(200).json(toAvatarJson(avatar));
});

/** DELETE /avatar/:id — アバター削除（要 access token、最低1件残す） */
export const deleteAvatar = asyncHandler(async (req, res) => {
  const userId = requireUserId(req);
  const params = parseWithSchema(avatarIdParamsSchema, req.params, res);
  if (!params.ok) return;

  await createAvatarService(req).delete({
    userId,
    avatarId: params.data.id,
  });
  return res.status(204).send();
});
