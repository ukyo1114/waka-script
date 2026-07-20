import type { Pool } from "pg";
import type {
  Channel,
  ChannelId,
  ChannelSettings,
  GameSettings,
} from "../../domain/channel/index.js";
import type {
  CreateChannelInput,
  UpdateChannelInput,
  ChannelRepository,
} from "./channel.repository.types.js";

type ChannelRow = {
  id: string;
  admin_id: string;
  admin_user_id: string;
  title: string;
  description: string;
  settings: ChannelSettings;
  game_settings: GameSettings;
  entry_processing: boolean;
  deleted_at: Date | null;
  created_at: Date;
  updated_at: Date;
};

function mapChannel(row: ChannelRow): Channel {
  return {
    id: row.id,
    adminId: row.admin_id,
    adminUserId: row.admin_user_id,
    title: row.title,
    description: row.description,
    settings: row.settings,
    gameSettings: row.game_settings,
    entryProcessing: row.entry_processing,
    deletedAt: row.deleted_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

const CHANNEL_SELECT = `
  c.id,
  c.admin_id,
  a.user_id AS admin_user_id,
  c.title,
  c.description,
  c.settings,
  c.game_settings,
  c.entry_processing,
  c.deleted_at,
  c.created_at,
  c.updated_at
`;

const CHANNEL_FROM = `
  FROM channels c
  INNER JOIN avatars a ON a.id = c.admin_id
`;

/** Postgres 実装（adminUserId は admin_id → avatars.user_id で hydrate） */
export class ChannelRepositoryImpl implements ChannelRepository {
  constructor(private readonly pool: Pool) {}

  async create(input: CreateChannelInput): Promise<Channel> {
    await this.pool.query(
      `INSERT INTO channels (
         id, admin_id, title, description, settings, game_settings
       ) VALUES ($1, $2, $3, $4, $5::jsonb, $6::jsonb)`,
      [
        input.id,
        input.adminId,
        input.title,
        input.description,
        JSON.stringify(input.settings),
        JSON.stringify(input.gameSettings),
      ],
    );
    const created = await this.findById(input.id);
    if (!created) {
      throw new Error("ChannelRepository.create: row not found after insert");
    }
    return created;
  }

  async findById(id: ChannelId): Promise<Channel | null> {
    const result = await this.pool.query<ChannelRow>(
      `SELECT ${CHANNEL_SELECT} ${CHANNEL_FROM} WHERE c.id = $1`,
      [id],
    );
    const row = result.rows[0];
    return row ? mapChannel(row) : null;
  }

  async listActive(): Promise<Channel[]> {
    const result = await this.pool.query<ChannelRow>(
      `SELECT ${CHANNEL_SELECT} ${CHANNEL_FROM}
       WHERE c.deleted_at IS NULL
       ORDER BY c.created_at DESC`,
    );
    return result.rows.map(mapChannel);
  }

  async update(
    id: ChannelId,
    input: UpdateChannelInput,
  ): Promise<Channel | null> {
    const sets: string[] = [];
    const values: unknown[] = [];
    let i = 1;

    if (input.title !== undefined) {
      sets.push(`title = $${i++}`);
      values.push(input.title);
    }
    if (input.description !== undefined) {
      sets.push(`description = $${i++}`);
      values.push(input.description);
    }
    if (input.settings !== undefined) {
      sets.push(`settings = $${i++}::jsonb`);
      values.push(JSON.stringify(input.settings));
    }
    if (input.gameSettings !== undefined) {
      sets.push(`game_settings = $${i++}::jsonb`);
      values.push(JSON.stringify(input.gameSettings));
    }

    if (sets.length === 0) {
      return this.findById(id);
    }

    sets.push("updated_at = now()");
    values.push(id);

    const result = await this.pool.query(
      `UPDATE channels SET ${sets.join(", ")} WHERE id = $${i} RETURNING id`,
      values,
    );
    if (!result.rows[0]) return null;
    return this.findById(id);
  }

  async acquireEntryProcessingLock(id: ChannelId): Promise<Channel | null> {
    const result = await this.pool.query<{ id: string }>(
      `UPDATE channels
       SET entry_processing = true, updated_at = now()
       WHERE id = $1
         AND entry_processing = false
         AND deleted_at IS NULL
       RETURNING id`,
      [id],
    );
    if (!result.rows[0]) return null;
    return this.findById(id);
  }

  async releaseEntryProcessingLock(id: ChannelId): Promise<void> {
    await this.pool.query(
      `UPDATE channels
       SET entry_processing = false, updated_at = now()
       WHERE id = $1`,
      [id],
    );
  }

  async softDelete(id: ChannelId): Promise<Channel | null> {
    const result = await this.pool.query(
      `UPDATE channels
       SET deleted_at = now(), updated_at = now()
       WHERE id = $1
       RETURNING id`,
      [id],
    );
    if (!result.rows[0]) return null;
    return this.findById(id);
  }
}
