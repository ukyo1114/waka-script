import type { Pool } from "pg";
import type { AvatarId } from "../../domain/avatar/index.js";
import type {
  ChannelId,
  ChannelParticipant,
  ChannelParticipantId,
} from "../../domain/channel/index.js";
import type { UserId } from "../../domain/user/index.js";
import type {
  CreateChannelParticipantInput,
  ChannelParticipantRepository,
} from "./channel-participant.repository.types.js";

type ParticipantRow = {
  id: string;
  channel_id: string;
  user_id: string;
  avatar_id: string;
  deleted_at: Date | null;
  created_at: Date;
  updated_at: Date;
};

function mapParticipant(row: ParticipantRow): ChannelParticipant {
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

const PARTICIPANT_SELECT = `
  cp.id,
  cp.channel_id,
  a.user_id,
  cp.avatar_id,
  cp.deleted_at,
  cp.created_at,
  cp.updated_at
`;

const PARTICIPANT_FROM = `
  FROM channel_participants cp
  INNER JOIN avatars a ON a.id = cp.avatar_id
`;

/** Postgres 実装（userId は avatar_id → avatars.user_id で hydrate） */
export class ChannelParticipantRepositoryImpl
  implements ChannelParticipantRepository
{
  constructor(private readonly pool: Pool) {}

  async create(
    input: CreateChannelParticipantInput,
  ): Promise<ChannelParticipant> {
    await this.pool.query(
      `INSERT INTO channel_participants (id, channel_id, avatar_id)
       VALUES ($1, $2, $3)`,
      [input.id, input.channelId, input.avatarId],
    );
    const created = await this.findActiveById(input.id);
    if (!created) {
      throw new Error(
        "ChannelParticipantRepository.create: row not found after insert",
      );
    }
    return created;
  }

  async findActiveById(
    id: ChannelParticipantId,
  ): Promise<ChannelParticipant | null> {
    const result = await this.pool.query<ParticipantRow>(
      `SELECT ${PARTICIPANT_SELECT} ${PARTICIPANT_FROM}
       WHERE cp.id = $1 AND cp.deleted_at IS NULL`,
      [id],
    );
    const row = result.rows[0];
    return row ? mapParticipant(row) : null;
  }

  async findActiveByChannelIdAndUserId(
    channelId: ChannelId,
    userId: UserId,
  ): Promise<ChannelParticipant | null> {
    const result = await this.pool.query<ParticipantRow>(
      `SELECT ${PARTICIPANT_SELECT} ${PARTICIPANT_FROM}
       WHERE cp.channel_id = $1
         AND a.user_id = $2
         AND cp.deleted_at IS NULL
       LIMIT 1`,
      [channelId, userId],
    );
    const row = result.rows[0];
    return row ? mapParticipant(row) : null;
  }

  async findActiveByChannelIdAndAvatarId(
    channelId: ChannelId,
    avatarId: AvatarId,
  ): Promise<ChannelParticipant | null> {
    const result = await this.pool.query<ParticipantRow>(
      `SELECT ${PARTICIPANT_SELECT} ${PARTICIPANT_FROM}
       WHERE cp.channel_id = $1
         AND cp.avatar_id = $2
         AND cp.deleted_at IS NULL
       LIMIT 1`,
      [channelId, avatarId],
    );
    const row = result.rows[0];
    return row ? mapParticipant(row) : null;
  }

  async listActiveChannelIdsByUserId(userId: UserId): Promise<ChannelId[]> {
    const result = await this.pool.query<{ channel_id: string }>(
      `SELECT cp.channel_id
       FROM channel_participants cp
       INNER JOIN avatars a ON a.id = cp.avatar_id
       WHERE a.user_id = $1 AND cp.deleted_at IS NULL`,
      [userId],
    );
    return result.rows.map((r) => r.channel_id);
  }

  async softDeleteByChannelIdAndAvatarId(
    channelId: ChannelId,
    avatarId: AvatarId,
  ): Promise<ChannelParticipant | null> {
    const result = await this.pool.query<{ id: string }>(
      `UPDATE channel_participants
       SET deleted_at = now(), updated_at = now()
       WHERE channel_id = $1
         AND avatar_id = $2
         AND deleted_at IS NULL
       RETURNING id`,
      [channelId, avatarId],
    );
    const id = result.rows[0]?.id;
    if (!id) return null;
    return this.findByIdIncludingDeleted(id);
  }

  async softDeleteByChannelIdAndUserId(
    channelId: ChannelId,
    userId: UserId,
  ): Promise<ChannelParticipant | null> {
    const result = await this.pool.query<{ id: string }>(
      `UPDATE channel_participants cp
       SET deleted_at = now(), updated_at = now()
       FROM avatars a
       WHERE cp.avatar_id = a.id
         AND cp.channel_id = $1
         AND a.user_id = $2
         AND cp.deleted_at IS NULL
       RETURNING cp.id`,
      [channelId, userId],
    );
    const id = result.rows[0]?.id;
    if (!id) return null;
    return this.findByIdIncludingDeleted(id);
  }

  private async findByIdIncludingDeleted(
    id: ChannelParticipantId,
  ): Promise<ChannelParticipant | null> {
    const result = await this.pool.query<ParticipantRow>(
      `SELECT ${PARTICIPANT_SELECT} ${PARTICIPANT_FROM} WHERE cp.id = $1`,
      [id],
    );
    const row = result.rows[0];
    return row ? mapParticipant(row) : null;
  }
}
