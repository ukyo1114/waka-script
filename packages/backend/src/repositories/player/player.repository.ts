import type { AvatarId } from "../../domain/avatar/index.js";
import type { GameId } from "../../domain/game/index.js";
import type { UserId } from "../../domain/user/index.js";
import type {
  CreatePlayerInput,
  Player,
  PlayerId,
  PlayerRepository,
  UpdatePlayerInput,
} from "./player.repository.types.js";

function notImplemented(): never {
  throw new Error("PlayerRepository is not implemented yet");
}

/** Postgres 実装用の骨格。接続後に中身を埋める。 */
export class PlayerRepositoryImpl implements PlayerRepository {
  create(_input: CreatePlayerInput): Promise<Player> {
    return notImplemented();
  }

  createMany(_inputs: CreatePlayerInput[]): Promise<Player[]> {
    return notImplemented();
  }

  findActiveById(_id: PlayerId): Promise<Player | null> {
    return notImplemented();
  }

  findActiveByIdAndGameId(_id: PlayerId, _gameId: GameId): Promise<Player | null> {
    return notImplemented();
  }

  listActiveByGameId(_gameId: GameId): Promise<Player[]> {
    return notImplemented();
  }

  update(_id: PlayerId, _input: UpdatePlayerInput): Promise<Player | null> {
    return notImplemented();
  }

  findActiveByAvatarIdAndGameId(
    _avatarId: AvatarId,
    _gameId: GameId,
  ): Promise<Player | null> {
    return notImplemented();
  }

  findActiveByUserIdAndGameId(
    _userId: UserId,
    _gameId: GameId,
  ): Promise<Player | null> {
    return notImplemented();
  }
}
