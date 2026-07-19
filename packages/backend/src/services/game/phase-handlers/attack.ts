import { buildVictimLog, doesAttackSucceed, ensureGameExists } from "../../../domain/game/index.js";
import { PlayerStatus } from "../../../domain/player/index.js";
import type { PhaseHandlerDeps, PhaseHandlerWithGameId } from "./types.js";

/**
 * 襲撃を適用する。当日の ATTACK ログに基づき、成功時のみ犠牲者ログの追加と対象の死亡更新を行う。
 */
export const runAttack: PhaseHandlerWithGameId = async (
  gameId: string,
  deps: PhaseHandlerDeps,
): Promise<boolean> => {
  const game = ensureGameExists(await deps.games.findById(gameId));
  const players = await deps.players.listActiveByGameId(gameId);

  const victimId = doesAttackSucceed(game, players);
  if (victimId == null) return false;

  await deps.games.addLogs(gameId, buildVictimLog(game, victimId));
  const updated = await deps.players.update(victimId, { status: PlayerStatus.DEAD });
  return updated != null;
};
