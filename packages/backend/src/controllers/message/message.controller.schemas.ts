import { z } from "zod";
import { MESSAGE_CONTENT_MAX_LENGTH, MessageType } from "../../domain/message/index.js";
import { nonEmptyString } from "../../shared/validation.js";

const messageTypeValues = Object.values(MessageType) as [string, ...string[]];
const messageTypeSchema = z.enum(messageTypeValues);

export const roomIdParamsSchema = z.object({
  roomId: nonEmptyString,
});

export const messageIdParamsSchema = z.object({
  roomId: nonEmptyString,
  messageId: nonEmptyString,
});

export const listMessagesQuerySchema = z.object({
  senderId: nonEmptyString,
  messageType: messageTypeSchema,
  beforeMessageId: nonEmptyString.optional(),
});

export const listMessagesAfterQuerySchema = z.object({
  senderId: nonEmptyString,
  messageType: messageTypeSchema,
  afterMessageId: nonEmptyString,
});

export const listMessageRepliesQuerySchema = z.object({
  senderId: nonEmptyString,
});

export const createMessageBodySchema = z.object({
  senderId: nonEmptyString,
  messageType: messageTypeSchema,
  content: nonEmptyString.max(MESSAGE_CONTENT_MAX_LENGTH),
  replyToMessageId: nonEmptyString.optional(),
});
