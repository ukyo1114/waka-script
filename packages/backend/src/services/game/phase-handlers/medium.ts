import {
  buildMediumLog,
  detectPlayerTeam,
  ensureGameExists,
  extractTargetFromLog,
  GameLogType,
} from "../../../domain/game/index.js";
import type { PhaseHandlerDeps, PhaseHandlerWithGameId } from "./types.js";

/**
 * 霊能結果をログに反映する。当日の処刑ログから対象を取り、陣営を判定して MEDIUM ログを追加する。
 */
export const runMedium: PhaseHandlerWithGameId = async (
  gameId: string,
  deps: PhaseHandlerDeps,
): Promise<boolean> => {
  const game = ensureGameExists(await deps.games.findById(gameId));
  const players = await deps.players.listActiveByGameId(gameId);
  const target = extractTargetFromLog(game, players, GameLogType.EXECUTION);
  if (!target) return false;

  const result = detectPlayerTeam(target);
  await deps.games.addLogs(gameId, buildMediumLog(game, target.id, result));
  return true;
};
