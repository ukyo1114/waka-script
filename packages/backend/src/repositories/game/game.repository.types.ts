import type { ChannelId, GameSettings } from "../../domain/channel/index.js";
import type {
  Game,
  GameId,
  GameLogEntry,
  GamePhaseInfo,
} from "../../domain/game/index.js";

export type { Game, GameId };

export type CreateGameInput = {
  id: GameId;
  channelId: ChannelId;
  description: string;
  gameSettings: GameSettings;
};

export interface GameRepository {
  create(input: CreateGameInput): Promise<Game>;
  findById(id: GameId): Promise<Game | null>;
  findActiveByChannelId(channelId: ChannelId): Promise<Game | null>;
  setProcessing(id: GameId, processing: boolean): Promise<Game | null>;
  updatePhaseInfo(id: GameId, phaseInfo: GamePhaseInfo): Promise<Game | null>;
  /** 既存ログへ追記して永続化する */
  addLogs(id: GameId, logs: GameLogEntry[]): Promise<Game | null>;
  /** ログ配列全体を置き換える（占い結果の payload 付与など） */
  replaceLogs(id: GameId, logs: GameLogEntry[]): Promise<Game | null>;
  markEnded(id: GameId, endedAt: Date): Promise<Game | null>;
}
