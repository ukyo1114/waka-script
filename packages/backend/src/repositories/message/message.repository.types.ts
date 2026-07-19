import type {
  Message,
  MessageId,
  MessageType,
  RoomId,
} from "../../domain/message/index.js";

export type { Message, MessageId };

export type CreateMessageInput = {
  id: MessageId;
  roomId: RoomId;
  senderId: string;
  content: string;
  messageType: MessageType;
  replyToMessageId?: MessageId | null;
};

export interface MessageRepository {
  create(input: CreateMessageInput): Promise<Message>;
  findById(id: MessageId): Promise<Message | null>;
  /** ルーム・タイプの直近1件（previousMessageId 算出用） */
  findLatestByRoomAndType(
    roomId: RoomId,
    messageType: MessageType,
  ): Promise<Message | null>;
  /** beforeMessageId より前を作成日時の降順で最大 limit 件 */
  listByRoomAndTypeBefore(
    roomId: RoomId,
    messageType: MessageType,
    beforeMessageId: MessageId | undefined,
    limit: number,
  ): Promise<Message[]>;
  /** afterMessageId より後を作成日時の昇順で最大 limit 件 */
  listByRoomAndTypeAfter(
    roomId: RoomId,
    messageType: MessageType,
    afterMessageId: MessageId,
    limit: number,
  ): Promise<Message[]>;
  /** 指定の返信先 ID を持つメッセージ一覧（excludeMessageId は除外） */
  listByReplyToMessageId(
    roomId: RoomId,
    replyToMessageId: MessageId,
    excludeMessageId?: MessageId,
  ): Promise<Message[]>;
}
