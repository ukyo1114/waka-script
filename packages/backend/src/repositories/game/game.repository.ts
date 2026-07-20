import type { Pool } from "pg";
import type { ChannelId, GameSettings } from "../../domain/channel/index.js";
import { GamePhase } from "../../domain/channel/index.js";
import type {
  Game,
  GameId,
  GameLogEntry,
  GamePhaseInfo,
} from "../../domain/game/index.js";
import type {
  CreateGameInput,
  GameRepository,
} from "./game.repository.types.js";

type GameRow = {
  id: string;
  channel_id: string;
  description: string;
  game_settings: GameSettings;
  logs: GameLogEntry[];
  processing: boolean;
  phase_info: {
    phase: GamePhaseInfo["phase"];
    day: number;
    changedAt: string | Date;
    nextPhaseAt: string | Date | null;
  };
  started_at: Date;
  ended_at: Date | null;
  deleted_at: Date | null;
  created_at: Date;
  updated_at: Date;
};

function revivePhaseInfo(
  raw: GameRow["phase_info"],
): GamePhaseInfo {
  return {
    phase: raw.phase,
    day: raw.day,
    changedAt: new Date(raw.changedAt),
    nextPhaseAt: raw.nextPhaseAt ? new Date(raw.nextPhaseAt) : null,
  };
}

function mapGame(row: GameRow): Game {
  return {
    id: row.id,
    channelId: row.channel_id,
    description: row.description,
    gameSettings: row.game_settings,
    logs: row.logs ?? [],
    processing: row.processing,
    phaseInfo: revivePhaseInfo(row.phase_info),
    startedAt: row.started_at,
    endedAt: row.ended_at,
    deletedAt: row.deleted_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

const GAME_COLUMNS = `
  id, channel_id, description, game_settings, logs, processing,
  phase_info, started_at, ended_at, deleted_at, created_at, updated_at
`;

function buildInitialPhaseInfo(now: Date): GamePhaseInfo {
  return {
    phase: GamePhase.PRE_GAME,
    day: 0,
    changedAt: now,
    nextPhaseAt: null,
  };
}

/** Postgres 実装（jsonb: settings / logs / phase_info） */
export class GameRepositoryImpl implements GameRepository {
  constructor(private readonly pool: Pool) {}

  async create(input: CreateGameInput): Promise<Game> {
    const now = new Date();
    const phaseInfo = buildInitialPhaseInfo(now);
    const result = await this.pool.query<GameRow>(
      `INSERT INTO games (
         id, channel_id, description, game_settings,
         logs, processing, phase_info, started_at
       ) VALUES (
         $1, $2, $3, $4::jsonb,
         '[]'::jsonb, false, $5::jsonb, $6
       )
       RETURNING ${GAME_COLUMNS}`,
      [
        input.id,
        input.channelId,
        input.description,
        JSON.stringify(input.gameSettings),
        JSON.stringify(phaseInfo),
        now,
      ],
    );
    return mapGame(result.rows[0]!);
  }

  async findById(id: GameId): Promise<Game | null> {
    const result = await this.pool.query<GameRow>(
      `SELECT ${GAME_COLUMNS} FROM games WHERE id = $1`,
      [id],
    );
    const row = result.rows[0];
    return row ? mapGame(row) : null;
  }

  async findActiveByChannelId(channelId: ChannelId): Promise<Game | null> {
    const result = await this.pool.query<GameRow>(
      `SELECT ${GAME_COLUMNS} FROM games
       WHERE channel_id = $1
         AND deleted_at IS NULL
         AND ended_at IS NULL
       ORDER BY started_at DESC
       LIMIT 1`,
      [channelId],
    );
    const row = result.rows[0];
    return row ? mapGame(row) : null;
  }

  async setProcessing(
    id: GameId,
    processing: boolean,
  ): Promise<Game | null> {
    const result = await this.pool.query<GameRow>(
      `UPDATE games
       SET processing = $2, updated_at = now()
       WHERE id = $1
       RETURNING ${GAME_COLUMNS}`,
      [id, processing],
    );
    const row = result.rows[0];
    return row ? mapGame(row) : null;
  }

  async updatePhaseInfo(
    id: GameId,
    phaseInfo: GamePhaseInfo,
  ): Promise<Game | null> {
    const result = await this.pool.query<GameRow>(
      `UPDATE games
       SET phase_info = $2::jsonb, updated_at = now()
       WHERE id = $1
       RETURNING ${GAME_COLUMNS}`,
      [id, JSON.stringify(phaseInfo)],
    );
    const row = result.rows[0];
    return row ? mapGame(row) : null;
  }

  async addLogs(id: GameId, logs: GameLogEntry[]): Promise<Game | null> {
    const result = await this.pool.query<GameRow>(
      `UPDATE games
       SET logs = logs || $2::jsonb, updated_at = now()
       WHERE id = $1
       RETURNING ${GAME_COLUMNS}`,
      [id, JSON.stringify(logs)],
    );
    const row = result.rows[0];
    return row ? mapGame(row) : null;
  }

  async replaceLogs(id: GameId, logs: GameLogEntry[]): Promise<Game | null> {
    const result = await this.pool.query<GameRow>(
      `UPDATE games
       SET logs = $2::jsonb, updated_at = now()
       WHERE id = $1
       RETURNING ${GAME_COLUMNS}`,
      [id, JSON.stringify(logs)],
    );
    const row = result.rows[0];
    return row ? mapGame(row) : null;
  }

  async markEnded(id: GameId, endedAt: Date): Promise<Game | null> {
    const result = await this.pool.query<GameRow>(
      `UPDATE games
       SET ended_at = $2, updated_at = now()
       WHERE id = $1
       RETURNING ${GAME_COLUMNS}`,
      [id, endedAt],
    );
    const row = result.rows[0];
    return row ? mapGame(row) : null;
  }
}
