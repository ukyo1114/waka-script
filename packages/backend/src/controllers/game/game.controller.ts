import type { Request } from "express";
import { GameLogType, type GameActionType } from "../../domain/game/index.js";
import { asyncHandler } from "../../middleware/async-handler.js";
import { getRepositories } from "../../repositories/get-repositories.js";
import { GameActionService } from "../../services/game/index.js";
import {
  InvalidAccessTokenError,
  NotImplementedError,
} from "../../shared/errors.js";
import { parseWithSchema } from "../../shared/validation.js";
import {
  gameActionBodySchema,
  gameIdParamsSchema,
} from "./game.controller.schemas.js";

function createGameActionService(req: Request): GameActionService {
  try {
    const { games, players } = getRepositories(req);
    return new GameActionService({ games, players });
  } catch {
    throw new NotImplementedError("game-action.repositories");
  }
}

function requireUserId(req: Request): string {
  const userId = req.auth?.userId;
  if (!userId) throw new InvalidAccessTokenError();
  return userId;
}

/**
 * ゲームアクション（投票・占い・襲撃・護衛）の共通ハンドラ。
 * POST /game/:id/vote | divination | attack | guard で使用。
 */
function handleActionRequest(actionType: GameActionType) {
  return asyncHandler(async (req, res) => {
    const userId = requireUserId(req);
    const params = parseWithSchema(gameIdParamsSchema, req.params, res);
    if (!params.ok) return;
    const body = parseWithSchema(gameActionBodySchema, req.body, res);
    if (!body.ok) return;

    await createGameActionService(req).receive({
      gameId: params.data.id,
      playerId: body.data.playerId,
      targetId: body.data.targetId,
      userId,
      actionType,
    });
    return res.status(200).json({ ok: true });
  });
}

/** POST /game/:id/vote */
export const postVote = handleActionRequest(GameLogType.VOTE);

/** POST /game/:id/divination */
export const postDivination = handleActionRequest(GameLogType.DIVINATION);

/** POST /game/:id/attack */
export const postAttack = handleActionRequest(GameLogType.ATTACK);

/** POST /game/:id/guard */
export const postGuard = handleActionRequest(GameLogType.GUARD);
