import { buildExecutionLog, ensureGameExists, getExecutionTargetByVotes } from "../../../domain/game/index.js";
import { PlayerStatus } from "../../../domain/player/index.js";
import type { PhaseHandlerDeps, PhaseHandlerWithGameId } from "./types.js";

/**
 * 昼フェーズの処刑処理。
 * 最多得票者を死亡にし、処刑ログを追加する（勝敗判定は呼び出し側で行う）。
 */
export const execution: PhaseHandlerWithGameId = async (
  gameId: string,
  deps: PhaseHandlerDeps,
): Promise<boolean> => {
  const game = ensureGameExists(await deps.games.findById(gameId));
  const targetId = getExecutionTargetByVotes(game);
  if (!targetId) return false;

  await deps.players.update(targetId, { status: PlayerStatus.DEAD });
  await deps.games.addLogs(gameId, buildExecutionLog(game, targetId));
  return true;
};
