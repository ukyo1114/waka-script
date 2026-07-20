import type { Request } from "express";
import type { EventBus } from "../../events/index.js";
import { asyncHandler } from "../../middleware/async-handler.js";
import { getRepositories } from "../../repositories/get-repositories.js";
import { ChannelService } from "../../services/channel/index.js";
import {
  InvalidAccessTokenError,
  NotImplementedError,
} from "../../shared/errors.js";
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
    const eventBus = req.app.locals.eventBus as EventBus | undefined;
    return new ChannelService({
      users,
      avatars,
      channels,
      channelParticipants,
      blockedUsers,
      eventBus,
    });
  } catch {
    throw new NotImplementedError("channel.repositories");
  }
}

function requireUserId(req: Request): string {
  const userId = req.auth?.userId;
  if (!userId) throw new InvalidAccessTokenError();
  return userId;
}

/** POST /channel — チャンネル作成 */
export const createChannel = asyncHandler(async (req, res) => {
  const userId = requireUserId(req);
  const parsed = parseWithSchema(createChannelBodySchema, req.body, res);
  if (!parsed.ok) return;

  const channel = await createChannelService(req).create({
    userId,
    avatarId: parsed.data.avatarId,
    title: parsed.data.title,
    description: parsed.data.description,
    settings: parsed.data.settings,
    gameSettings: parsed.data.gameSettings,
  });
  return res.status(201).json(channel);
});

/** GET /channel — 一覧 */
export const listChannels = asyncHandler(async (req, res) => {
  const userId = requireUserId(req);
  const result = await createChannelService(req).list({ userId });
  return res.status(200).json(result);
});

/** GET /channel/:id — 詳細 */
export const getChannel = asyncHandler(async (req, res) => {
  const userId = requireUserId(req);
  const params = parseWithSchema(channelIdParamsSchema, req.params, res);
  if (!params.ok) return;

  const channel = await createChannelService(req).get({
    userId,
    channelId: params.data.id,
  });
  return res.status(200).json(channel);
});

/** POST /channel/:id/join — 入室 */
export const joinChannel = asyncHandler(async (req, res) => {
  const userId = requireUserId(req);
  const params = parseWithSchema(channelIdParamsSchema, req.params, res);
  if (!params.ok) return;

  const parsed = parseWithSchema(joinChannelBodySchema, req.body, res);
  if (!parsed.ok) return;

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
});

/** PATCH /channel/:id — 情報変更（管理者） */
export const updateChannel = asyncHandler(async (req, res) => {
  const userId = requireUserId(req);
  const params = parseWithSchema(channelIdParamsSchema, req.params, res);
  if (!params.ok) return;

  const parsed = parseWithSchema(updateChannelBodySchema, req.body, res);
  if (!parsed.ok) return;

  const channel = await createChannelService(req).update({
    userId,
    channelId: params.data.id,
    title: parsed.data.title,
    description: parsed.data.description,
    settings: parsed.data.settings,
    gameSettings: parsed.data.gameSettings,
  });
  return res.status(200).json(channel);
});

/** GET /channel/:id/blocked-users — ブロック一覧（管理者） */
export const listBlockedUsers = asyncHandler(async (req, res) => {
  const userId = requireUserId(req);
  const params = parseWithSchema(channelIdParamsSchema, req.params, res);
  if (!params.ok) return;

  const blockedUsers = await createChannelService(req).listBlockedUsers({
    userId,
    channelId: params.data.id,
  });
  return res.status(200).json({ blockedUsers });
});

/** POST /channel/:id/blocked-users — ブロック（管理者） */
export const blockChannelUser = asyncHandler(async (req, res) => {
  const userId = requireUserId(req);
  const params = parseWithSchema(channelIdParamsSchema, req.params, res);
  if (!params.ok) return;

  const parsed = parseWithSchema(blockChannelUserBodySchema, req.body, res);
  if (!parsed.ok) return;

  const blockedUser = await createChannelService(req).blockUser({
    userId,
    channelId: params.data.id,
    avatarId: parsed.data.avatarId,
  });
  return res.status(201).json(blockedUser);
});

/** DELETE /channel/:id/blocked-users/:blockedUserId — 解除（管理者） */
export const unblockChannelUser = asyncHandler(async (req, res) => {
  const userId = requireUserId(req);
  const params = parseWithSchema(blockedUserParamsSchema, req.params, res);
  if (!params.ok) return;

  await createChannelService(req).unblockUser({
    userId,
    channelId: params.data.id,
    blockedUserId: params.data.blockedUserId,
  });
  return res.status(200).json({ ok: true });
});

/** POST /channel/:id/leave — 退出（管理者不可） */
export const leaveChannel = asyncHandler(async (req, res) => {
  const userId = requireUserId(req);
  const params = parseWithSchema(channelIdParamsSchema, req.params, res);
  if (!params.ok) return;

  await createChannelService(req).leave({
    userId,
    channelId: params.data.id,
  });
  return res.status(204).send();
});

/** DELETE /channel/:id — 論理削除（管理者） */
export const deleteChannel = asyncHandler(async (req, res) => {
  const userId = requireUserId(req);
  const params = parseWithSchema(channelIdParamsSchema, req.params, res);
  if (!params.ok) return;

  await createChannelService(req).delete({
    userId,
    channelId: params.data.id,
  });
  return res.status(204).send();
});
