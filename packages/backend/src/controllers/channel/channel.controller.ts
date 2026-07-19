import type { Request, Response } from "express";
import { getRepositories } from "../../repositories/get-repositories.js";
import { ChannelService } from "../../services/channel/index.js";
import {
  InvalidAccessTokenError,
  NotImplementedError,
} from "../../shared/errors.js";
import { handleControllerError } from "../../shared/http.js";
import { parseWithSchema } from "../../shared/validation.js";
import {
  blockChannelUserBodySchema,
  blockedUserParamsSchema,
  channelIdParamsSchema,
  createChannelBodySchema,
  joinChannelBodySchema,
  updateChannelBodySchema,
} from "./channel.controller.schemas.js";

function createChannelService(req: Request): ChannelService {
  try {
    const { users, avatars, channels, channelParticipants, blockedUsers } =
      getRepositories(req);
    return new ChannelService({
      users,
      avatars,
      channels,
      channelParticipants,
      blockedUsers,
    });
  } catch {
    throw new NotImplementedError("channel.repositories");
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

/** POST /channel — チャンネル作成 */
export async function createChannel(req: Request, res: Response) {
  const userId = requireUserId(req, res);
  if (!userId) return;

  const parsed = parseWithSchema(createChannelBodySchema, req.body, res);
  if (!parsed.ok) return;

  try {
    const channel = await createChannelService(req).create({
      userId,
      avatarId: parsed.data.avatarId,
      title: parsed.data.title,
      description: parsed.data.description,
      settings: parsed.data.settings,
      gameSettings: parsed.data.gameSettings,
    });
    return res.status(201).json(channel);
  } catch (error) {
    return handleControllerError(res, error);
  }
}

/** GET /channel — 一覧 */
export async function listChannels(req: Request, res: Response) {
  const userId = requireUserId(req, res);
  if (!userId) return;

  try {
    const result = await createChannelService(req).list({ userId });
    return res.status(200).json(result);
  } catch (error) {
    return handleControllerError(res, error);
  }
}

/** POST /channel/:id/join — 入室 */
export async function joinChannel(req: Request, res: Response) {
  const userId = requireUserId(req, res);
  if (!userId) return;

  const params = parseWithSchema(channelIdParamsSchema, req.params, res);
  if (!params.ok) return;

  const parsed = parseWithSchema(joinChannelBodySchema, req.body, res);
  if (!parsed.ok) return;

  try {
    const participant = await createChannelService(req).join({
      userId,
      channelId: params.data.id,
      avatarId: parsed.data.avatarId,
      password: parsed.data.password,
    });
    return res.status(201).json({
      id: participant.id,
      channelId: participant.channelId,
      avatarId: participant.avatarId,
      createdAt: participant.createdAt,
    });
  } catch (error) {
    return handleControllerError(res, error);
  }
}

/** PATCH /channel/:id — 情報変更（管理者） */
export async function updateChannel(req: Request, res: Response) {
  const userId = requireUserId(req, res);
  if (!userId) return;

  const params = parseWithSchema(channelIdParamsSchema, req.params, res);
  if (!params.ok) return;

  const parsed = parseWithSchema(updateChannelBodySchema, req.body, res);
  if (!parsed.ok) return;

  try {
    const channel = await createChannelService(req).update({
      userId,
      channelId: params.data.id,
      title: parsed.data.title,
      description: parsed.data.description,
      settings: parsed.data.settings,
      gameSettings: parsed.data.gameSettings,
    });
    return res.status(200).json(channel);
  } catch (error) {
    return handleControllerError(res, error);
  }
}

/** GET /channel/:id/blocked-users — ブロック一覧（管理者） */
export async function listBlockedUsers(req: Request, res: Response) {
  const userId = requireUserId(req, res);
  if (!userId) return;

  const params = parseWithSchema(channelIdParamsSchema, req.params, res);
  if (!params.ok) return;

  try {
    const blockedUsers = await createChannelService(req).listBlockedUsers({
      userId,
      channelId: params.data.id,
    });
    return res.status(200).json({ blockedUsers });
  } catch (error) {
    return handleControllerError(res, error);
  }
}

/** POST /channel/:id/blocked-users — ブロック（管理者） */
export async function blockChannelUser(req: Request, res: Response) {
  const userId = requireUserId(req, res);
  if (!userId) return;

  const params = parseWithSchema(channelIdParamsSchema, req.params, res);
  if (!params.ok) return;

  const parsed = parseWithSchema(blockChannelUserBodySchema, req.body, res);
  if (!parsed.ok) return;

  try {
    const blockedUser = await createChannelService(req).blockUser({
      userId,
      channelId: params.data.id,
      avatarId: parsed.data.avatarId,
    });
    return res.status(201).json(blockedUser);
  } catch (error) {
    return handleControllerError(res, error);
  }
}

/** DELETE /channel/:id/blocked-users/:blockedUserId — 解除（管理者） */
export async function unblockChannelUser(req: Request, res: Response) {
  const userId = requireUserId(req, res);
  if (!userId) return;

  const params = parseWithSchema(blockedUserParamsSchema, req.params, res);
  if (!params.ok) return;

  try {
    await createChannelService(req).unblockUser({
      userId,
      channelId: params.data.id,
      blockedUserId: params.data.blockedUserId,
    });
    return res.status(200).json({ ok: true });
  } catch (error) {
    return handleControllerError(res, error);
  }
}
