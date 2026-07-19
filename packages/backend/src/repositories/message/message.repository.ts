import type { MessageId, MessageType, RoomId } from "../../domain/message/index.js";
import type {
  CreateMessageInput,
  Message,
  MessageRepository,
} from "./message.repository.types.js";

function notImplemented(): never {
  throw new Error("MessageRepository is not implemented yet");
}

/** Postgres 実装用の骨格。接続後に中身を埋める。 */
export class MessageRepositoryImpl implements MessageRepository {
  create(_input: CreateMessageInput): Promise<Message> {
    return notImplemented();
  }

  findById(_id: MessageId): Promise<Message | null> {
    return notImplemented();
  }

  findLatestByRoomAndType(
    _roomId: RoomId,
    _messageType: MessageType,
  ): Promise<Message | null> {
    return notImplemented();
  }

  listByRoomAndTypeBefore(
    _roomId: RoomId,
    _messageType: MessageType,
    _beforeMessageId: MessageId | undefined,
    _limit: number,
  ): Promise<Message[]> {
    return notImplemented();
  }

  listByRoomAndTypeAfter(
    _roomId: RoomId,
    _messageType: MessageType,
    _afterMessageId: MessageId,
    _limit: number,
  ): Promise<Message[]> {
    return notImplemented();
  }

  listByReplyToMessageId(
    _roomId: RoomId,
    _replyToMessageId: MessageId,
    _excludeMessageId?: MessageId,
  ): Promise<Message[]> {
    return notImplemented();
  }
}
