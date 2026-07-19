import {
  canReceiveRequest,
  ensureGameExists,
  upsertActionRequest,
  type GameActionType,
} from "../../domain/game/index.js";
import { assertPlayerOwnedByUser, ensurePlayerExists } from "../../domain/player/index.js";
import type { GameRepository } from "../../repositories/game/index.js";
import type { PlayerRepository } from "../../repositories/player/index.js";
import { NotImplementedError, TargetPlayerNotFoundError } from "../../shared/errors.js";

export type GameActionServiceDeps = {
  games: GameRepository;
  players: PlayerRepository;
};

export type ReceiveGameActionInput = {
  gameId: string;
  playerId: string;
  targetId: string;
  userId: string;
  actionType: GameActionType;
};

/**
 * 投票・占い・襲撃・護衛などのプレイヤー行動を受け付け、ゲームログへ反映する。
 */
export class GameActionService {
  constructor(private readonly deps?: GameActionServiceDeps) {}

  private requireDeps(): GameActionServiceDeps {
    if (!this.deps) throw new NotImplementedError("game-action.repositories");
    return this.deps;
  }

  async receive(input: ReceiveGameActionInput): Promise<void> {
    const deps = this.requireDeps();
    const game = ensureGameExists(await deps.games.findById(input.gameId));

    const rawActionPlayer = await deps.players.findActiveByIdAndGameId(
      input.playerId,
      input.gameId,
    );
    const actionPlayer = ensurePlayerExists(rawActionPlayer);
    assertPlayerOwnedByUser(actionPlayer.userId, input.userId);

    const targetPlayer = await deps.players.findActiveByIdAndGameId(
      input.targetId,
      input.gameId,
    );
    if (!targetPlayer) throw new TargetPlayerNotFoundError();

    canReceiveRequest({
      game,
      actionPlayer,
      targetPlayer,
      actionType: input.actionType,
    });

    const newLogs = upsertActionRequest({
      game,
      actorId: actionPlayer.id,
      targetId: targetPlayer.id,
      actionType: input.actionType,
    });

    await deps.games.replaceLogs(game.id, newLogs);
  }
}
