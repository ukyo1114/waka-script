import type { Pool } from "pg";
import type { AvatarId } from "../../domain/avatar/index.js";
import type { GameId } from "../../domain/game/index.js";
import type {
  CreatePlayerInput,
  Player,
  PlayerId,
  PlayerRole,
  PlayerStatus,
} from "../../domain/player/index.js";
import { PlayerStatus as PlayerStatusConst } from "../../domain/player/index.js";
import type { UserId } from "../../domain/user/index.js";
import type {
  UpdatePlayerInput,
  PlayerRepository,
} from "./player.repository.types.js";

type PlayerRow = {
  id: string;
  game_id: string;
  avatar_id: string;
  user_id: string;
  name: string;
  picture_url: string;
  role: PlayerRole;
  status: PlayerStatus;
  deleted_at: Date | null;
  created_at: Date;
  updated_at: Date;
};

function mapPlayer(row: PlayerRow): Player {
  return {
    id: row.id,
    gameId: row.game_id,
    avatarId: row.avatar_id,
    userId: row.user_id,
    name: row.name,
    pictureUrl: row.picture_url,
    role: row.role,
    status: row.status,
    deletedAt: row.deleted_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

const PLAYER_SELECT = `
  p.id,
  p.game_id,
  p.avatar_id,
  a.user_id,
  p.name,
  p.picture_url,
  p.role,
  p.status,
  p.deleted_at,
  p.created_at,
  p.updated_at
`;

const PLAYER_FROM = `
  FROM players p
  INNER JOIN avatars a ON a.id = p.avatar_id
`;

/** Postgres 実装（userId は avatar JOIN。name / picture_url はスナップショット列） */
export class PlayerRepositoryImpl implements PlayerRepository {
  constructor(private readonly pool: Pool) {}

  async create(input: CreatePlayerInput): Promise<Player> {
    await this.pool.query(
      `INSERT INTO players (
         id, game_id, avatar_id, name, picture_url, role, status
       ) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        input.id,
        input.gameId,
        input.avatarId,
        input.name,
        input.pictureUrl,
        input.role,
        PlayerStatusConst.ALIVE,
      ],
    );
    const created = await this.findActiveById(input.id);
    if (!created) {
      throw new Error("PlayerRepository.create: row not found after insert");
    }
    return created;
  }

  async createMany(inputs: CreatePlayerInput[]): Promise<Player[]> {
    if (inputs.length === 0) return [];

    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      const created: Player[] = [];
      for (const input of inputs) {
        await client.query(
          `INSERT INTO players (
             id, game_id, avatar_id, name, picture_url, role, status
           ) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [
            input.id,
            input.gameId,
            input.avatarId,
            input.name,
            input.pictureUrl,
            input.role,
            PlayerStatusConst.ALIVE,
          ],
        );
      }
      await client.query("COMMIT");

      for (const input of inputs) {
        const player = await this.findActiveById(input.id);
        if (!player) {
          throw new Error(
            "PlayerRepository.createMany: row not found after insert",
          );
        }
        created.push(player);
      }
      return created;
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  }

  async findActiveById(id: PlayerId): Promise<Player | null> {
    const result = await this.pool.query<PlayerRow>(
      `SELECT ${PLAYER_SELECT} ${PLAYER_FROM}
       WHERE p.id = $1 AND p.deleted_at IS NULL`,
      [id],
    );
    const row = result.rows[0];
    return row ? mapPlayer(row) : null;
  }

  async findActiveByIdAndGameId(
    id: PlayerId,
    gameId: GameId,
  ): Promise<Player | null> {
    const result = await this.pool.query<PlayerRow>(
      `SELECT ${PLAYER_SELECT} ${PLAYER_FROM}
       WHERE p.id = $1
         AND p.game_id = $2
         AND p.deleted_at IS NULL`,
      [id, gameId],
    );
    const row = result.rows[0];
    return row ? mapPlayer(row) : null;
  }

  async listActiveByGameId(gameId: GameId): Promise<Player[]> {
    const result = await this.pool.query<PlayerRow>(
      `SELECT ${PLAYER_SELECT} ${PLAYER_FROM}
       WHERE p.game_id = $1 AND p.deleted_at IS NULL
       ORDER BY p.created_at ASC`,
      [gameId],
    );
    return result.rows.map(mapPlayer);
  }

  async update(
    id: PlayerId,
    input: UpdatePlayerInput,
  ): Promise<Player | null> {
    const sets: string[] = [];
    const values: unknown[] = [];
    let i = 1;

    if (input.status !== undefined) {
      sets.push(`status = $${i++}`);
      values.push(input.status);
    }
    if (input.role !== undefined) {
      sets.push(`role = $${i++}`);
      values.push(input.role);
    }

    if (sets.length === 0) {
      return this.findActiveById(id);
    }

    sets.push("updated_at = now()");
    values.push(id);

    const result = await this.pool.query(
      `UPDATE players SET ${sets.join(", ")} WHERE id = $${i} RETURNING id`,
      values,
    );
    if (!result.rows[0]) return null;
    return this.findActiveById(id);
  }

  async findActiveByAvatarIdAndGameId(
    avatarId: AvatarId,
    gameId: GameId,
  ): Promise<Player | null> {
    const result = await this.pool.query<PlayerRow>(
      `SELECT ${PLAYER_SELECT} ${PLAYER_FROM}
       WHERE p.avatar_id = $1
         AND p.game_id = $2
         AND p.deleted_at IS NULL
       LIMIT 1`,
      [avatarId, gameId],
    );
    const row = result.rows[0];
    return row ? mapPlayer(row) : null;
  }

  async findActiveByUserIdAndGameId(
    userId: UserId,
    gameId: GameId,
  ): Promise<Player | null> {
    const result = await this.pool.query<PlayerRow>(
      `SELECT ${PLAYER_SELECT} ${PLAYER_FROM}
       WHERE a.user_id = $1
         AND p.game_id = $2
         AND p.deleted_at IS NULL
       LIMIT 1`,
      [userId, gameId],
    );
    const row = result.rows[0];
    return row ? mapPlayer(row) : null;
  }
}
