import {
  applyResultToLogs,
  buildFoxCurseLog,
  detectPlayerTeam,
  ensureGameExists,
  extractTargetFromLog,
  GameLogType,
} from "../../../domain/game/index.js";
import { PlayerRole, PlayerStatus } from "../../../domain/player/index.js";
import type { PhaseHandlerDeps } from "./types.js";

/**
 * 占い結果をログに反映する。当日の DIVINATION ログの対象から陣営を判定し payload を書き込む。
 * `enabledFoxCurse` が真かつ対象が生存の妖狐なら、呪殺ログの追加と死亡更新も行う。
 */
export const runDivination = async (
  gameId: string,
  deps: PhaseHandlerDeps,
  enabledFoxCurse = false,
): Promise<boolean> => {
  const game = ensureGameExists(await deps.games.findById(gameId));
  const players = await deps.players.listActiveByGameId(gameId);
  const target = extractTargetFromLog(game, players, GameLogType.DIVINATION);
  if (!target) return false;

  const result = detectPlayerTeam(target);
  let logs = applyResultToLogs(game, GameLogType.DIVINATION, result);

  const shouldCurse =
    enabledFoxCurse && target.role === PlayerRole.FOX && target.status === PlayerStatus.ALIVE;
  if (shouldCurse) {
    await deps.players.update(target.id, { status: PlayerStatus.DEAD });
    logs = [...logs, ...buildFoxCurseLog(game, target.id)];
  }

  await deps.games.replaceLogs(gameId, logs);
  return true;
};
