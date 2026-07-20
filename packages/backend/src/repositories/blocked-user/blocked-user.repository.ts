import type { Pool } from "pg";
import type {
  BlockedUser,
  BlockedUserId,
} from "../../domain/blocked-user/index.js";
import type { ChannelId } from "../../domain/channel/index.js";
import type { UserId } from "../../domain/user/index.js";
import type {
  CreateBlockedUserInput,
  BlockedUserRepository,
} from "./blocked-user.repository.types.js";

type BlockedUserRow = {
  id: string;
  channel_id: string;
  user_id: string;
  avatar_id: string;
  deleted_at: Date | null;
  created_at: Date;
  updated_at: Date;
};

function mapBlockedUser(row: BlockedUserRow): BlockedUser {
  return {
    id: row.id,
    channelId: row.channel_id,
    userId: row.user_id,
    avatarId: row.avatar_id,
    deletedAt: row.deleted_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

const BLOCKED_SELECT = `
  bu.id,
  bu.channel_id,
  a.user_id,
  bu.avatar_id,
  bu.deleted_at,
  bu.created_at,
  bu.updated_at
`;

const BLOCKED_FROM = `
  FROM blocked_users bu
  INNER JOIN avatars a ON a.id = bu.avatar_id
`;

/** Postgres 実装（userId は avatar_id → avatars.user_id で hydrate） */
export class BlockedUserRepositoryImpl implements BlockedUserRepository {
  constructor(private readonly pool: Pool) {}

  async create(input: CreateBlockedUserInput): Promise<BlockedUser> {
    await this.pool.query(
      `INSERT INTO blocked_users (id, channel_id, avatar_id)
       VALUES ($1, $2, $3)`,
      [input.id, input.channelId, input.avatarId],
    );
    const created = await this.findByIdIncludingDeleted(input.id);
    if (!created) {
      throw new Error("BlockedUserRepository.create: row not found after insert");
    }
    return created;
  }

  async findActiveByIdAndChannelId(
    id: BlockedUserId,
    channelId: ChannelId,
  ): Promise<BlockedUser | null> {
    const result = await this.pool.query<BlockedUserRow>(
      `SELECT ${BLOCKED_SELECT} ${BLOCKED_FROM}
       WHERE bu.id = $1
         AND bu.channel_id = $2
         AND bu.deleted_at IS NULL`,
      [id, channelId],
    );
    const row = result.rows[0];
    return row ? mapBlockedUser(row) : null;
  }

  async findActiveByChannelIdAndUserId(
    channelId: ChannelId,
    userId: UserId,
  ): Promise<BlockedUser | null> {
    const result = await this.pool.query<BlockedUserRow>(
      `SELECT ${BLOCKED_SELECT} ${BLOCKED_FROM}
       WHERE bu.channel_id = $1
         AND a.user_id = $2
         AND bu.deleted_at IS NULL
       LIMIT 1`,
      [channelId, userId],
    );
    const row = result.rows[0];
    return row ? mapBlockedUser(row) : null;
  }

  async listActiveByChannelId(channelId: ChannelId): Promise<BlockedUser[]> {
    const result = await this.pool.query<BlockedUserRow>(
      `SELECT ${BLOCKED_SELECT} ${BLOCKED_FROM}
       WHERE bu.channel_id = $1 AND bu.deleted_at IS NULL
       ORDER BY bu.created_at DESC`,
      [channelId],
    );
    return result.rows.map(mapBlockedUser);
  }

  async listActiveChannelIdsByUserId(userId: UserId): Promise<ChannelId[]> {
    const result = await this.pool.query<{ channel_id: string }>(
      `SELECT bu.channel_id
       FROM blocked_users bu
       INNER JOIN avatars a ON a.id = bu.avatar_id
       WHERE a.user_id = $1 AND bu.deleted_at IS NULL`,
      [userId],
    );
    return result.rows.map((r) => r.channel_id);
  }

  async softDeleteByIdAndChannelId(
    id: BlockedUserId,
    channelId: ChannelId,
  ): Promise<BlockedUser | null> {
    const result = await this.pool.query<{ id: string }>(
      `UPDATE blocked_users
       SET deleted_at = now(), updated_at = now()
       WHERE id = $1
         AND channel_id = $2
         AND deleted_at IS NULL
       RETURNING id`,
      [id, channelId],
    );
    if (!result.rows[0]) return null;
    return this.findByIdIncludingDeleted(id);
  }

  private async findByIdIncludingDeleted(
    id: BlockedUserId,
  ): Promise<BlockedUser | null> {
    const result = await this.pool.query<BlockedUserRow>(
      `SELECT ${BLOCKED_SELECT} ${BLOCKED_FROM} WHERE bu.id = $1`,
      [id],
    );
    const row = result.rows[0];
    return row ? mapBlockedUser(row) : null;
  }
}
