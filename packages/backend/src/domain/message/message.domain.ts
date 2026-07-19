import { PlayerRole, PlayerStatus, type Player } from "../player/index.js";
import {
  MessageAccessDeniedError,
  MessageCountLimitExceededError,
  MessageNotFoundError,
  MessageRoomMismatchError,
  MessageTypeMismatchError,
} from "../../shared/errors.js";
import {
  MessageType,
  type Message,
  type MessageSendContext,
  type MessageUserRole,
} from "./message.types.js";

/**
 * 送信可否マトリクス（ゲーム中）。縦軸：送信者役職 / 横軸：メッセージタイプ。
 * ゲーム終了後はすべて通常のみ、SYSTEM はサーバー専用（クライアントからは送信不可）。
 */
export const SEND_ALLOWED: Record<MessageUserRole, Record<MessageType, boolean>> = {
  SPECTATOR: {
    [MessageType.NORMAL]: false,
    [MessageType.WEREWOLF]: false,
    [MessageType.SYSTEM]: false,
    [MessageType.SPECTATOR]: true,
    [MessageType.SHARED]: false,
  },
  WEREWOLF: {
    [MessageType.NORMAL]: true,
    [MessageType.WEREWOLF]: true,
    [MessageType.SYSTEM]: false,
    [MessageType.SPECTATOR]: false,
    [MessageType.SHARED]: false,
  },
  SHARER: {
    [MessageType.NORMAL]: true,
    [MessageType.WEREWOLF]: false,
    [MessageType.SYSTEM]: false,
    [MessageType.SPECTATOR]: false,
    [MessageType.SHARED]: true,
  },
  NORMAL: {
    [MessageType.NORMAL]: true,
    [MessageType.WEREWOLF]: false,
    [MessageType.SYSTEM]: false,
    [MessageType.SPECTATOR]: false,
    [MessageType.SHARED]: false,
  },
};

/** 受信可否マトリクス（ゲーム中）。ゲーム終了後はすべて受信可。 */
export const RECEIVE_ALLOWED: Record<MessageUserRole, Record<MessageType, boolean>> = {
  SPECTATOR: {
    [MessageType.NORMAL]: true,
    [MessageType.WEREWOLF]: false,
    [MessageType.SYSTEM]: true,
    [MessageType.SPECTATOR]: false,
    [MessageType.SHARED]: false,
  },
  WEREWOLF: {
    [MessageType.NORMAL]: true,
    [MessageType.WEREWOLF]: true,
    [MessageType.SYSTEM]: true,
    [MessageType.SPECTATOR]: false,
    [MessageType.SHARED]: false,
  },
  SHARER: {
    [MessageType.NORMAL]: true,
    [MessageType.WEREWOLF]: false,
    [MessageType.SYSTEM]: true,
    [MessageType.SPECTATOR]: false,
    [MessageType.SHARED]: true,
  },
  NORMAL: {
    [MessageType.NORMAL]: true,
    [MessageType.WEREWOLF]: false,
    [MessageType.SYSTEM]: true,
    [MessageType.SPECTATOR]: false,
    [MessageType.SHARED]: false,
  },
};

/** プレイヤー状態からメッセージ送信者の役職カテゴリを算出する */
export const getMessageSenderRoleFromPlayer = (player: Player): MessageUserRole => {
  if (player.status === PlayerStatus.DEAD || player.status === PlayerStatus.NON_PLAYER) {
    return "SPECTATOR";
  }
  switch (player.role) {
    case PlayerRole.WEREWOLF:
      return "WEREWOLF";
    case PlayerRole.SHARER:
      return "SHARER";
    default:
      return "NORMAL";
  }
};

export const canSendMessageType = (
  context: MessageSendContext,
  messageType: MessageType,
): boolean => {
  const { messageUserRole, isGameEnded, isProcessing } = context;
  if (isProcessing) return false;
  if (isGameEnded) return messageType === MessageType.NORMAL;
  if (messageType === MessageType.SYSTEM) return false;
  return SEND_ALLOWED[messageUserRole][messageType] === true;
};

export const canReceiveMessageType = (
  context: MessageSendContext,
  messageType: MessageType,
): boolean => {
  const { messageUserRole, isGameEnded } = context;
  if (isGameEnded) return true;
  return RECEIVE_ALLOWED[messageUserRole][messageType] === true;
};

export const assertCanAccessMessageType = (
  context: MessageSendContext,
  messageType: MessageType,
  action: "send" | "receive",
): void => {
  const allowed =
    action === "send"
      ? canSendMessageType(context, messageType)
      : canReceiveMessageType(context, messageType);
  if (!allowed) {
    throw new MessageAccessDeniedError();
  }
};

/** チャンネル（ゲーム開始前）は NORMAL のみ送受信可能 */
export const CHANNEL_MESSAGE_CONTEXT: MessageSendContext = {
  messageUserRole: "NORMAL",
  isGameEnded: false,
  isProcessing: false,
};

export const ensureMessageExists = (message: Message | null): Message => {
  if (!message || message.deletedAt) {
    throw new MessageNotFoundError();
  }
  return message;
};

export const ensureMessageBelongsToRoom = (message: Message, roomId: string): void => {
  if (message.roomId !== roomId) {
    throw new MessageRoomMismatchError();
  }
};

export const ensureMessageBelongsToType = (
  message: Message,
  messageType: MessageType,
): void => {
  if (message.messageType !== messageType) {
    throw new MessageTypeMismatchError();
  }
};

export const validateReplyToMessage = (
  replyToMessage: Message | null,
  roomId: string,
  messageType: MessageType,
): Message => {
  const message = ensureMessageExists(replyToMessage);
  ensureMessageBelongsToRoom(message, roomId);
  ensureMessageBelongsToType(message, messageType);
  return message;
};

export const ensureMessageCountWithinLimit = (
  messageCount: number,
  limit: number,
): void => {
  if (messageCount > limit) {
    throw new MessageCountLimitExceededError(limit);
  }
};
