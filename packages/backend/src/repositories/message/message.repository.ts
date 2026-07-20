import type { Pool } from "pg";
import type {
  Message,
  MessageId,
  MessageType,
  RoomId,
} from "../../domain/message/index.js";
import type {
  CreateMessageInput,
  MessageRepository,
} from "./message.repository.types.js";

type MessageRow = {
  id: string;
  room_id: string;
  sender_id: string;
  content: string;
  message_type: MessageType;
  reply_to_message_id: string | null;
  deleted_at: Date | null;
  created_at: Date;
  updated_at: Date;
};

function mapMessage(row: MessageRow): Message {
  return {
    id: row.id,
    roomId: row.room_id,
    senderId: row.sender_id,
    content: row.content,
    messageType: row.message_type,
    replyToMessageId: row.reply_to_message_id,
    deletedAt: row.deleted_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

const MESSAGE_COLUMNS = `
  id, room_id, sender_id, content, message_type,
  reply_to_message_id, deleted_at, created_at, updated_at
`;

/** Postgres 実装 */
export class MessageRepositoryImpl implements MessageRepository {
  constructor(private readonly pool: Pool) {}

  async create(input: CreateMessageInput): Promise<Message> {
    const result = await this.pool.query<MessageRow>(
      `INSERT INTO messages (
         id, room_id, sender_id, content, message_type, reply_to_message_id
       ) VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING ${MESSAGE_COLUMNS}`,
      [
        input.id,
        input.roomId,
        input.senderId,
        input.content,
        input.messageType,
        input.replyToMessageId ?? null,
      ],
    );
    return mapMessage(result.rows[0]!);
  }

  async findById(id: MessageId): Promise<Message | null> {
    const result = await this.pool.query<MessageRow>(
      `SELECT ${MESSAGE_COLUMNS} FROM messages WHERE id = $1`,
      [id],
    );
    const row = result.rows[0];
    return row ? mapMessage(row) : null;
  }

  async findLatestByRoomAndType(
    roomId: RoomId,
    messageType: MessageType,
  ): Promise<Message | null> {
    const result = await this.pool.query<MessageRow>(
      `SELECT ${MESSAGE_COLUMNS} FROM messages
       WHERE room_id = $1
         AND message_type = $2
         AND deleted_at IS NULL
       ORDER BY created_at DESC, id DESC
       LIMIT 1`,
      [roomId, messageType],
    );
    const row = result.rows[0];
    return row ? mapMessage(row) : null;
  }

  async listByRoomAndTypeBefore(
    roomId: RoomId,
    messageType: MessageType,
    beforeMessageId: MessageId | undefined,
    limit: number,
  ): Promise<Message[]> {
    if (beforeMessageId) {
      const before = await this.findById(beforeMessageId);
      if (!before) return [];

      const result = await this.pool.query<MessageRow>(
        `SELECT ${MESSAGE_COLUMNS} FROM messages
         WHERE room_id = $1
           AND message_type = $2
           AND deleted_at IS NULL
           AND (
             created_at < $3
             OR (created_at = $3 AND id < $4)
           )
         ORDER BY created_at DESC, id DESC
         LIMIT $5`,
        [roomId, messageType, before.createdAt, before.id, limit],
      );
      return result.rows.map(mapMessage);
    }

    const result = await this.pool.query<MessageRow>(
      `SELECT ${MESSAGE_COLUMNS} FROM messages
       WHERE room_id = $1
         AND message_type = $2
         AND deleted_at IS NULL
       ORDER BY created_at DESC, id DESC
       LIMIT $3`,
      [roomId, messageType, limit],
    );
    return result.rows.map(mapMessage);
  }

  async listByRoomAndTypeAfter(
    roomId: RoomId,
    messageType: MessageType,
    afterMessageId: MessageId,
    limit: number,
  ): Promise<Message[]> {
    const after = await this.findById(afterMessageId);
    if (!after) return [];

    const result = await this.pool.query<MessageRow>(
      `SELECT ${MESSAGE_COLUMNS} FROM messages
       WHERE room_id = $1
         AND message_type = $2
         AND deleted_at IS NULL
         AND (
           created_at > $3
           OR (created_at = $3 AND id > $4)
         )
       ORDER BY created_at ASC, id ASC
       LIMIT $5`,
      [roomId, messageType, after.createdAt, after.id, limit],
    );
    return result.rows.map(mapMessage);
  }

  async listByReplyToMessageId(
    roomId: RoomId,
    replyToMessageId: MessageId,
    excludeMessageId?: MessageId,
  ): Promise<Message[]> {
    const result = await this.pool.query<MessageRow>(
      `SELECT ${MESSAGE_COLUMNS} FROM messages
       WHERE room_id = $1
         AND deleted_at IS NULL
         AND (
           reply_to_message_id = $2
           OR id = $2
         )
         AND ($3::uuid IS NULL OR id <> $3)
       ORDER BY created_at ASC, id ASC`,
      [roomId, replyToMessageId, excludeMessageId ?? null],
    );
    return result.rows.map(mapMessage);
  }
}
