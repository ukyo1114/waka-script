export type MessageId = string;

/** ルームID（チャンネルID または ゲームID） */
export type RoomId = string;

export const MessageType = {
  /** 通常メッセージ */
  NORMAL: "NORMAL",
  /** 人狼メッセージ */
  WEREWOLF: "WEREWOLF",
  /** システムメッセージ */
  SYSTEM: "SYSTEM",
  /** 観戦メッセージ */
  SPECTATOR: "SPECTATOR",
  /** 共有メッセージ（共有者と相手専用） */
  SHARED: "SHARED",
} as const;

export type MessageType = (typeof MessageType)[keyof typeof MessageType];

export const SYSTEM_SENDER_ID = "system";

export type Message = {
  id: MessageId;
  roomId: RoomId;
  senderId: string;
  content: string;
  messageType: MessageType;
  replyToMessageId: MessageId | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
};

export type CreateMessageInput = {
  id: MessageId;
  roomId: RoomId;
  senderId: string;
  content: string;
  messageType: MessageType;
  replyToMessageId?: MessageId | null;
};

/** 送信者／受け手の役職カテゴリ（ゲーム内メッセージ用） */
export type MessageUserRole = "SPECTATOR" | "WEREWOLF" | "SHARER" | "NORMAL";

/** メッセージ送受信時のコンテキスト（ゲーム用） */
export type MessageSendContext = {
  messageUserRole: MessageUserRole;
  isGameEnded: boolean;
  isProcessing: boolean;
};

export const MESSAGE_CONTENT_MAX_LENGTH = 1000;
export const MESSAGE_LIST_LIMIT = 50;
