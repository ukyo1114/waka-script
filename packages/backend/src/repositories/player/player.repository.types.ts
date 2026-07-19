import type { AvatarId } from "../../domain/avatar/index.js";
import type { GameId } from "../../domain/game/index.js";
import type {
  CreatePlayerInput,
  Player,
  PlayerId,
  PlayerRole,
  PlayerStatus,
} from "../../domain/player/index.js";
import type { UserId } from "../../domain/user/index.js";

export type { CreatePlayerInput, Player, PlayerId };

export type UpdatePlayerInput = {
  status?: PlayerStatus;
  role?: PlayerRole;
};

export interface PlayerRepository {
  create(input: CreatePlayerInput): Promise<Player>;
  createMany(inputs: CreatePlayerInput[]): Promise<Player[]>;
  findActiveById(id: PlayerId): Promise<Player | null>;
  findActiveByIdAndGameId(id: PlayerId, gameId: GameId): Promise<Player | null>;
  listActiveByGameId(gameId: GameId): Promise<Player[]>;
  update(id: PlayerId, input: UpdatePlayerInput): Promise<Player | null>;
  findActiveByAvatarIdAndGameId(
    avatarId: AvatarId,
    gameId: GameId,
  ): Promise<Player | null>;
  findActiveByUserIdAndGameId(userId: UserId, gameId: GameId): Promise<Player | null>;
}
