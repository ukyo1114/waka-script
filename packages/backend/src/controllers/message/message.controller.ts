import type { Request, Response } from "express";
import type { MessageType } from "../../domain/message/index.js";
import { messageSentEvent, type EventBus } from "../../events/index.js";
import { getRepositories } from "../../repositories/get-repositories.js";
import { MessageService } from "../../services/message/index.js";
import {
  InvalidAccessTokenError,
  NotImplementedError,
} from "../../shared/errors.js";
import { handleControllerError } from "../../shared/http.js";
import { parseWithSchema } from "../../shared/validation.js";
import {
  createMessageBodySchema,
  listMessageRepliesQuerySchema,
  listMessagesAfterQuerySchema,
  listMessagesQuerySchema,
  messageIdParamsSchema,
  roomIdParamsSchema,
} from "./message.controller.schemas.js";

function createMessageService(req: Request): MessageService {
  try {
    const { channels, channelParticipants, games, players, messages } =
      getRepositories(req);
    return new MessageService({
      channels,
      channelParticipants,
      games,
      players,
      messages,
    });
  } catch {
    throw new NotImplementedError("message.repositories");
  }
}

function getEventBus(req: Request): EventBus | undefined {
  return req.app.locals.eventBus as EventBus | undefined;
}

function requireUserId(req: Request, res: Response): string | null {
  const userId = req.auth?.userId;
  if (!userId) {
    handleControllerError(res, new InvalidAccessTokenError());
    return null;
  }
  return userId;
}

/** GET /message/:roomId — 一覧（beforeMessageId より前を遡る） */
export async function listMessages(req: Request, res: Response) {
  const userId = requireUserId(req, res);
  if (!userId) return;

  const params = parseWithSchema(roomIdParamsSchema, req.params, res);
  if (!params.ok) return;
  const query = parseWithSchema(listMessagesQuerySchema, req.query, res);
  if (!query.ok) return;

  try {
    const messages = await createMessageService(req).list({
      roomId: params.data.roomId,
      senderId: query.data.senderId,
      userId,
      messageType: query.data.messageType as MessageType,
      beforeMessageId: query.data.beforeMessageId,
    });
    return res.status(200).json({ messages });
  } catch (error) {
    return handleControllerError(res, error);
  }
}

/** GET /message/:roomId/after — afterMessageId 以降を取得 */
export async function listMessagesAfter(req: Request, res: Response) {
  const userId = requireUserId(req, res);
  if (!userId) return;

  const params = parseWithSchema(roomIdParamsSchema, req.params, res);
  if (!params.ok) return;
  const query = parseWithSchema(listMessagesAfterQuerySchema, req.query, res);
  if (!query.ok) return;

  try {
    const messages = await createMessageService(req).listAfter({
      roomId: params.data.roomId,
      senderId: query.data.senderId,
      userId,
      messageType: query.data.messageType as MessageType,
      afterMessageId: query.data.afterMessageId,
    });
    return res.status(200).json({ messages });
  } catch (error) {
    return handleControllerError(res, error);
  }
}

/** GET /message/:roomId/:messageId/replies — 返信先・関連メッセージID一覧 */
export async function listMessageReplies(req: Request, res: Response) {
  const userId = requireUserId(req, res);
  if (!userId) return;

  const params = parseWithSchema(messageIdParamsSchema, req.params, res);
  if (!params.ok) return;
  const query = parseWithSchema(listMessageRepliesQuerySchema, req.query, res);
  if (!query.ok) return;

  try {
    const result = await createMessageService(req).listReplies({
      roomId: params.data.roomId,
      messageId: params.data.messageId,
      senderId: query.data.senderId,
      userId,
    });
    return res.status(200).json(result);
  } catch (error) {
    return handleControllerError(res, error);
  }
}

/** POST /message/:roomId — 送信し message:sent を配信 */
export async function createMessage(req: Request, res: Response) {
  const userId = requireUserId(req, res);
  if (!userId) return;

  const params = parseWithSchema(roomIdParamsSchema, req.params, res);
  if (!params.ok) return;
  const body = parseWithSchema(createMessageBodySchema, req.body, res);
  if (!body.ok) return;

  try {
    const result = await createMessageService(req).create({
      roomId: params.data.roomId,
      senderId: body.data.senderId,
      userId,
      messageType: body.data.messageType as MessageType,
      content: body.data.content,
      replyToMessageId: body.data.replyToMessageId,
    });

    getEventBus(req)?.emit(
      messageSentEvent(params.data.roomId, result.message, result.previousMessageId),
    );

    return res.status(201).json(result);
  } catch (error) {
    return handleControllerError(res, error);
  }
}
