import { buildRandomTargetLogs, type Game, type GameOutcome } from "../../../domain/game/index.js";
import type { Player, RoleKey } from "../../../domain/player/index.js";
import type { PhaseHandlerDeps } from "./types.js";

/** 夜にターゲット未指定の役職へ、ランダムな行動ログを追加する */
export const runEnsureTargets = async (
  game: Game,
  aliveConfigured: RoleKey[],
  players: Player[],
  deps: PhaseHandlerDeps,
): Promise<void> => {
  const logsToAdd = buildRandomTargetLogs(game, aliveConfigured, players);
  if (logsToAdd.length > 0) {
    await deps.games.addLogs(game.id, logsToAdd);
  }
};

/** 先に未行動分のログを埋めたうえで、渡したハンドラ（通常は勝敗判定付き夜処理）を実行する */
export const withEnsureTargets = async (
  game: Game,
  players: Player[],
  aliveConfigured: RoleKey[],
  deps: PhaseHandlerDeps,
  handler: () => Promise<GameOutcome | null>,
): Promise<GameOutcome | null> => {
  await runEnsureTargets(game, aliveConfigured, players, deps);
  return handler();
};
