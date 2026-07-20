import type { Pool } from "pg";
import {
  ChannelEntryStatus,
  type ChannelEntry,
  type ChannelEntryId,
} from "../../domain/channel-entry/index.js";
import type {
  ChannelId,
  ChannelParticipantId,
} from "../../domain/channel/index.js";
import type {
  CreateChannelEntryInput,
  ChannelEntryRepository,
} from "./channel-entry.repository.types.js";

type EntryRow = {
  id: string;
  channel_id: string;
  participant_id: string;
  user_id: string;
  avatar_id: string;
  status: ChannelEntryStatus;
  deleted_at: Date | null;
  created_at: Date;
  updated_at: Date;
};

function mapEntry(row: EntryRow): ChannelEntry {
  return {
    id: row.id,
    channelId: row.channel_id,
    participantId: row.participant_id,
    userId: row.user_id,
    avatarId: row.avatar_id,
    status: row.status,
    deletedAt: row.deleted_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

const ENTRY_SELECT = `
  e.id,
  cp.channel_id,
  e.participant_id,
  a.user_id,
  cp.avatar_id,
  e.status,
  e.deleted_at,
  e.created_at,
  e.updated_at
`;

const ENTRY_FROM = `
  FROM channel_entries e
  INNER JOIN channel_participants cp ON cp.id = e.participant_id
  INNER JOIN avatars a ON a.id = cp.avatar_id
`;

/**
 * Postgres 実装。
 * INSERT は participant_id のみ。読取は participant(+avatar) JOIN で
 * channelId / userId / avatarId を hydrate。
 */
export class ChannelEntryRepositoryImpl implements ChannelEntryRepository {
  constructor(private readonly pool: Pool) {}

  async create(input: CreateChannelEntryInput): Promise<ChannelEntry> {
    await this.pool.query(
      `INSERT INTO channel_entries (id, participant_id, status)
       VALUES ($1, $2, $3)`,
      [input.id, input.participantId, ChannelEntryStatus.ACTIVE],
    );
    const created = await this.findById(input.id);
    if (!created) {
      throw new Error(
        "ChannelEntryRepository.create: row not found after insert",
      );
    }
    return created;
  }

  async findActiveByChannelIdAndParticipantId(
    channelId: ChannelId,
    participantId: ChannelParticipantId,
  ): Promise<ChannelEntry | null> {
    const result = await this.pool.query<EntryRow>(
      `SELECT ${ENTRY_SELECT} ${ENTRY_FROM}
       WHERE cp.channel_id = $1
         AND e.participant_id = $2
         AND e.status = 'active'
         AND e.deleted_at IS NULL
       LIMIT 1`,
      [channelId, participantId],
    );
    const row = result.rows[0];
    return row ? mapEntry(row) : null;
  }

  async listActiveParticipantIdsByChannelId(
    channelId: ChannelId,
  ): Promise<ChannelParticipantId[]> {
    const result = await this.pool.query<{ participant_id: string }>(
      `SELECT e.participant_id
       FROM channel_entries e
       INNER JOIN channel_participants cp ON cp.id = e.participant_id
       WHERE cp.channel_id = $1
         AND e.status = 'active'
         AND e.deleted_at IS NULL`,
      [channelId],
    );
    return result.rows.map((r) => r.participant_id);
  }

  async softCancelByChannelIdAndParticipantId(
    channelId: ChannelId,
    participantId: ChannelParticipantId,
  ): Promise<ChannelEntry | null> {
    const result = await this.pool.query<{ id: string }>(
      `UPDATE channel_entries e
       SET status = 'cancelled',
           deleted_at = now(),
           updated_at = now()
       FROM channel_participants cp
       WHERE e.participant_id = cp.id
         AND cp.channel_id = $1
         AND e.participant_id = $2
         AND e.status = 'active'
         AND e.deleted_at IS NULL
       RETURNING e.id`,
      [channelId, participantId],
    );
    const id = result.rows[0]?.id;
    if (!id) return null;
    return this.findById(id);
  }

  async consumeAllActiveByChannelId(channelId: ChannelId): Promise<number> {
    const result = await this.pool.query(
      `UPDATE channel_entries e
       SET status = 'consumed',
           deleted_at = now(),
           updated_at = now()
       FROM channel_participants cp
       WHERE e.participant_id = cp.id
         AND cp.channel_id = $1
         AND e.status = 'active'
         AND e.deleted_at IS NULL`,
      [channelId],
    );
    return result.rowCount ?? 0;
  }

  private async findById(id: ChannelEntryId): Promise<ChannelEntry | null> {
    const result = await this.pool.query<EntryRow>(
      `SELECT ${ENTRY_SELECT} ${ENTRY_FROM} WHERE e.id = $1`,
      [id],
    );
    const row = result.rows[0];
    return row ? mapEntry(row) : null;
  }
}
