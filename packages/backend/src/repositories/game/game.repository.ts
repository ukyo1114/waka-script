import type { ChannelId } from "../../domain/channel/index.js";
import type { GameLogEntry, GamePhaseInfo } from "../../domain/game/index.js";
import type {
  CreateGameInput,
  Game,
  GameId,
  GameRepository,
} from "./game.repository.types.js";

function notImplemented(): never {
  throw new Error("GameRepository is not implemented yet");
}

/** Postgres 実装用の骨格。接続後に中身を埋める。 */
export class GameRepositoryImpl implements GameRepository {
  create(_input: CreateGameInput): Promise<Game> {
    return notImplemented();
  }

  findById(_id: GameId): Promise<Game | null> {
    return notImplemented();
  }

  findActiveByChannelId(_channelId: ChannelId): Promise<Game | null> {
    return notImplemented();
  }

  setProcessing(_id: GameId, _processing: boolean): Promise<Game | null> {
    return notImplemented();
  }

  updatePhaseInfo(_id: GameId, _phaseInfo: GamePhaseInfo): Promise<Game | null> {
    return notImplemented();
  }

  addLogs(_id: GameId, _logs: GameLogEntry[]): Promise<Game | null> {
    return notImplemented();
  }

  replaceLogs(_id: GameId, _logs: GameLogEntry[]): Promise<Game | null> {
    return notImplemented();
  }

  markEnded(_id: GameId, _endedAt: Date): Promise<Game | null> {
    return notImplemented();
  }
}
