export type {
  CreateMessageInput,
  Message,
  MessageId,
  MessageSendContext,
  MessageUserRole,
  RoomId,
} from "./message.types.js";
export {
  MESSAGE_CONTENT_MAX_LENGTH,
  MESSAGE_LIST_LIMIT,
  MessageType,
  SYSTEM_SENDER_ID,
} from "./message.types.js";
export {
  CHANNEL_MESSAGE_CONTEXT,
  RECEIVE_ALLOWED,
  SEND_ALLOWED,
  assertCanAccessMessageType,
  buildGameMessageContext,
  canReceiveMessageType,
  canSendMessageType,
  ensureMessageBelongsToRoom,
  ensureMessageBelongsToType,
  ensureMessageCountWithinLimit,
  ensureMessageExists,
  getMessageSenderRoleFromPlayer,
  validateReplyToMessage,
} from "./message.domain.js";
